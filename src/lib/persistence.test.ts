import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DASHBOARD_ID, createChartRecord, loadDashboard, resetDatabaseForTests } from "$lib/persistence";

describe("dashboard persistence", () => {
  beforeEach(async () => {
    localStorage.clear();
    await resetDatabaseForTests();
    vi.setSystemTime(new Date("2026-06-02T12:00:00Z"));
  });

  it("migrates legacy localStorage charts into IndexedDB once", async () => {
    localStorage.setItem(
      "charts_data",
      JSON.stringify([
        {
          id: "chartJsCanvas_3",
          type: "line",
          labels: ["Alpha", "Beta"],
          data: [12, 19],
          colors: ["#2563eb", "#f97316"],
          title: "Legacy chart",
          gridLines: false,
          position: { top: "44px", left: "88px" },
          size: { width: 420, height: 240 }
        }
      ])
    );
    localStorage.setItem("chartContainerPanZoom", JSON.stringify({ panX: 10, panY: -20, zoom: 1.5 }));

    const firstLoad = await loadDashboard();
    const secondLoad = await loadDashboard();

    expect(firstLoad.charts).toHaveLength(1);
    expect(firstLoad.charts[0]).toMatchObject({
      id: "chartJsCanvas_3",
      dashboardId: DEFAULT_DASHBOARD_ID,
      type: "line",
      title: "Legacy chart",
      gridLines: false,
      data: [
        { label: "Alpha", value: 12, color: "#2563eb" },
        { label: "Beta", value: 19, color: "#f97316" }
      ],
      position: { top: 44, left: 88 },
      size: { width: 420, height: 240 }
    });
    expect(firstLoad.workspace).toMatchObject({ panX: 10, panY: -20, zoom: 1.5 });
    expect(secondLoad.charts).toHaveLength(1);
    expect(localStorage.getItem("charts_indexeddb_migrated")).toBe("true");
  });

  it("creates default charts with unique ids and dashboard ownership", () => {
    const chart = createChartRecord(2);

    expect(chart.id).toBe("chartJsCanvas_2");
    expect(chart.dashboardId).toBe(DEFAULT_DASHBOARD_ID);
    expect(chart.type).toBe("bar");
    expect(chart.position).toEqual({ top: 80, left: 70 });
    expect(chart.size).toEqual({ width: 520, height: 420 });
    expect(chart.data).toHaveLength(6);
  });

  it("falls back to an empty dashboard when browser storage is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    vi.stubGlobal("localStorage", undefined);

    const dashboard = await loadDashboard();

    expect(dashboard.charts).toEqual([]);
    expect(dashboard.workspace).toMatchObject({ panX: 0, panY: 0, zoom: 1 });

    vi.unstubAllGlobals();
  });
});
