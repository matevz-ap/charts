import { derived, get, writable } from "svelte/store";
import type { ChartRecord, WorkspaceState } from "$lib/types";
import {
  createChartRecord,
  deleteChartRecord,
  loadDashboard,
  saveChartRecord,
  saveWorkspaceState
} from "$lib/persistence";

type DashboardState = {
  loading: boolean;
  charts: ChartRecord[];
  workspace: WorkspaceState;
  selectedChartId: string | null;
};

const initialWorkspace: WorkspaceState = {
  dashboardId: "default",
  panX: 0,
  panY: 0,
  zoom: 1,
  updatedAt: Date.now()
};

function createDashboardStore() {
  let pendingWrite = Promise.resolve();
  const store = writable<DashboardState>({
    loading: true,
    charts: [],
    workspace: initialWorkspace,
    selectedChartId: null
  });

  async function initialize() {
    try {
      const { charts, workspace } = await loadDashboard();
      store.set({
        loading: false,
        charts,
        workspace,
        selectedChartId: null
      });
    } catch (error) {
      console.error("Unable to initialize dashboard storage:", error);
      store.set({
        loading: false,
        charts: [],
        workspace: initialWorkspace,
        selectedChartId: null
      });
    }
  }

  function selectChart(chartId: string | null) {
    store.update((state) => ({ ...state, selectedChartId: chartId }));
  }

  function addChart() {
    const state = get(store);
    const nextIndex = getNextChartIndex(state.charts);
    const chart = createChartRecord(nextIndex);
    queueWrite(saveChartRecord(chart));
    store.update((current) => ({
      ...current,
      charts: [...current.charts, chart],
      selectedChartId: chart.id
    }));
  }

  function updateChart(chartId: string, updater: (chart: ChartRecord) => ChartRecord) {
    const changedChart = updateChartLocal(chartId, updater);

    if (changedChart) {
      queueWrite(saveChartRecord(changedChart));
    }
  }

  function updateChartLocal(chartId: string, updater: (chart: ChartRecord) => ChartRecord) {
    let changedChart: ChartRecord | null = null;

    store.update((state) => {
      const charts = state.charts.map((chart) => {
        if (chart.id !== chartId) return chart;
        changedChart = updater(chart);
        return changedChart;
      });

      return { ...state, charts };
    });

    return changedChart;
  }

  function deleteChart(chartId: string) {
    queueWrite(deleteChartRecord(chartId));
    store.update((state) => ({
      ...state,
      charts: state.charts.filter((chart) => chart.id !== chartId),
      selectedChartId: state.selectedChartId === chartId ? null : state.selectedChartId
    }));
  }

  function updateWorkspace(updater: (workspace: WorkspaceState) => WorkspaceState) {
    const changedWorkspace = updateWorkspaceLocal(updater);

    if (changedWorkspace) {
      queueWrite(saveWorkspaceState(changedWorkspace));
    }
  }

  function updateWorkspaceLocal(updater: (workspace: WorkspaceState) => WorkspaceState) {
    let changedWorkspace: WorkspaceState | null = null;

    store.update((state) => {
      changedWorkspace = updater(state.workspace);
      return { ...state, workspace: changedWorkspace };
    });

    return changedWorkspace;
  }

  function persistChart(chartId: string) {
    const chart = get(store).charts.find((item) => item.id === chartId);
    if (chart) {
      queueWrite(saveChartRecord(chart));
    }
  }

  function persistWorkspace() {
    queueWrite(saveWorkspaceState(get(store).workspace));
  }

  function queueWrite(write: Promise<void>) {
    pendingWrite = pendingWrite.then(() => write).catch((error) => {
      console.error("Unable to persist dashboard change:", error);
    });
  }

  function flushPendingWrites() {
    return pendingWrite;
  }

  return {
    subscribe: store.subscribe,
    initialize,
    selectChart,
    addChart,
    updateChart,
    updateChartLocal,
    persistChart,
    deleteChart,
    updateWorkspace,
    updateWorkspaceLocal,
    persistWorkspace,
    flushPendingWrites
  };
}

function getNextChartIndex(charts: ChartRecord[]) {
  const maxId = charts.reduce((max, chart) => {
    const match = chart.id.match(/chartJsCanvas_(\d+)/);
    return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
  }, -1);

  return maxId + 1;
}

export const dashboard = createDashboardStore();

export const selectedChart = derived(dashboard, ($dashboard) => {
  return $dashboard.charts.find((chart) => chart.id === $dashboard.selectedChartId) ?? null;
});
