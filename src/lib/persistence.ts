import Dexie, { type Table } from "dexie";
import type { ChartDatum, ChartRecord, ChartType, LegacyChartRecord, WorkspaceState } from "$lib/types";

export const DEFAULT_DASHBOARD_ID = "default";

const DB_NAME = "charts_dashboard";
const LEGACY_CHARTS_KEY = "charts_data";
const LEGACY_WORKSPACE_KEY = "chartContainerPanZoom";
const MIGRATION_KEY = "charts_indexeddb_migrated";

const defaultData: ChartDatum[] = [
  { label: "Red", value: 12, color: "#2563eb" },
  { label: "Blue", value: 19, color: "#60a5fa" },
  { label: "Yellow", value: 3, color: "#93c5fd" },
  { label: "Green", value: 5, color: "#bfdbfe" },
  { label: "Purple", value: 2, color: "#1d4ed8" },
  { label: "Orange", value: 3, color: "#3b82f6" }
];

class ChartsDatabase extends Dexie {
  charts!: Table<ChartRecord, string>;
  workspaceState!: Table<WorkspaceState, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      charts: "id, dashboardId, updatedAt",
      workspaceState: "dashboardId"
    });
  }
}

let dbInstance: ChartsDatabase | null = null;

let memoryCharts: ChartRecord[] = [];
let memoryWorkspace = createDefaultWorkspaceState();

export function createChartRecord(index: number): ChartRecord {
  const now = Date.now();

  return {
    id: `chartJsCanvas_${index}`,
    dashboardId: DEFAULT_DASHBOARD_ID,
    type: "bar",
    title: "",
    description: "",
    data: defaultData.map((item) => ({ ...item })),
    gridLines: true,
    position: {
      top: 40 + index * 20,
      left: 30 + index * 20
    },
    size: {
      width: 520,
      height: 420
    },
    updatedAt: now
  };
}

export async function loadDashboard() {
  if (!hasIndexedDb()) {
    return {
      charts: memoryCharts,
      workspace: memoryWorkspace
    };
  }

  await migrateLegacyLocalStorage();

  const [charts, workspace] = await Promise.all([
    getDb().charts.where("dashboardId").equals(DEFAULT_DASHBOARD_ID).sortBy("updatedAt"),
    getDb().workspaceState.get(DEFAULT_DASHBOARD_ID)
  ]);

  return {
    charts,
    workspace: workspace ?? createDefaultWorkspaceState()
  };
}

export async function saveChartRecord(chart: ChartRecord) {
  if (!hasIndexedDb()) {
    memoryCharts = [...memoryCharts.filter((item) => item.id !== chart.id), { ...chart, updatedAt: Date.now() }];
    return;
  }

  await getDb().charts.put({ ...chart, updatedAt: Date.now() });
}

export async function deleteChartRecord(chartId: string) {
  if (!hasIndexedDb()) {
    memoryCharts = memoryCharts.filter((chart) => chart.id !== chartId);
    return;
  }

  await getDb().charts.delete(chartId);
}

export async function saveWorkspaceState(state: WorkspaceState) {
  if (!hasIndexedDb()) {
    memoryWorkspace = { ...state, updatedAt: Date.now() };
    return;
  }

  await getDb().workspaceState.put({ ...state, updatedAt: Date.now() });
}

export async function resetDatabaseForTests() {
  memoryCharts = [];
  memoryWorkspace = createDefaultWorkspaceState();
  const db = getDb();
  await db.delete();
  db.close();
  await db.open();
}

async function migrateLegacyLocalStorage() {
  if (!hasLocalStorage() || localStorage.getItem(MIGRATION_KEY) === "true") {
    return;
  }

  const legacyCharts = readJson<LegacyChartRecord[]>(LEGACY_CHARTS_KEY, []);
  const legacyWorkspace = readJson<Partial<WorkspaceState>>(LEGACY_WORKSPACE_KEY, {});

  if (legacyCharts.length > 0) {
    await getDb().charts.bulkPut(legacyCharts.map(legacyChartToRecord));
  }

  await getDb().workspaceState.put({
    ...createDefaultWorkspaceState(),
    panX: numericOrDefault(legacyWorkspace.panX, 0),
    panY: numericOrDefault(legacyWorkspace.panY, 0),
    zoom: numericOrDefault(legacyWorkspace.zoom, 1),
    updatedAt: Date.now()
  });

  localStorage.setItem(MIGRATION_KEY, "true");
}

function legacyChartToRecord(chart: LegacyChartRecord): ChartRecord {
  const labels = chart.labels ?? [];
  const values = chart.data ?? [];
  const colors = chart.colors ?? [];
  const length = Math.max(labels.length, values.length);

  return {
    id: chart.id,
    dashboardId: DEFAULT_DASHBOARD_ID,
    type: normalizeChartType(chart.type),
    title: chart.title ?? "",
    description: chart.description ?? "",
    gridLines: chart.gridLines !== false,
    data: Array.from({ length }, (_, index) => ({
      label: labels[index] ?? `Item ${index + 1}`,
      value: numericOrDefault(values[index], 0),
      color: colors[index] ?? defaultData[index % defaultData.length].color
    })),
    position: {
      top: parsePixelValue(chart.position?.top, 40),
      left: parsePixelValue(chart.position?.left, 30)
    },
    size: {
      width: numericOrDefault(chart.size?.width, 520),
      height: numericOrDefault(chart.size?.height, 320)
    },
    updatedAt: Date.now()
  };
}

function createDefaultWorkspaceState(): WorkspaceState {
  return {
    dashboardId: DEFAULT_DASHBOARD_ID,
    panX: 0,
    panY: 0,
    zoom: 1,
    updatedAt: Date.now()
  };
}

function normalizeChartType(type: ChartType | undefined): ChartType {
  if (type === "line" || type === "pie" || type === "doughnut") {
    return type;
  }

  return "bar";
}

function parsePixelValue(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function numericOrDefault(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasLocalStorage()) return fallback;

  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function hasLocalStorage() {
  return typeof localStorage !== "undefined";
}

function getDb() {
  if (!dbInstance) {
    dbInstance = new ChartsDatabase();
  }

  return dbInstance;
}
