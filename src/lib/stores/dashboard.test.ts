import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dashboard } from "$lib/stores/dashboard";
import { loadDashboard, resetDatabaseForTests } from "$lib/persistence";

describe("dashboard store interactions", () => {
  beforeEach(async () => {
    localStorage.clear();
    await resetDatabaseForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds, updates, and deletes charts in IndexedDB", async () => {
    await dashboard.initialize();

    dashboard.addChart();
    let chart = get(dashboard).charts[0];
    await dashboard.flushPendingWrites();

    expect((await loadDashboard()).charts).toHaveLength(1);

    dashboard.updateChart(chart.id, (current) => ({
      ...current,
      title: "IndexedDB chart",
      position: { top: 144, left: 288 },
      size: { width: 512, height: 300 }
    }));
    await dashboard.flushPendingWrites();

    chart = (await loadDashboard()).charts[0];
    expect(chart).toMatchObject({
      title: "IndexedDB chart",
      position: { top: 144, left: 288 },
      size: { width: 512, height: 300 }
    });

    dashboard.deleteChart(chart.id);
    await dashboard.flushPendingWrites();

    expect((await loadDashboard()).charts).toEqual([]);
  });

  it("updates chart and workspace locally before explicit persistence", async () => {
    await dashboard.initialize();

    dashboard.addChart();
    await dashboard.flushPendingWrites();
    const chartId = get(dashboard).charts[0].id;

    dashboard.updateChartLocal(chartId, (current) => ({
      ...current,
      position: { top: 222, left: 333 }
    }));
    dashboard.updateWorkspaceLocal((current) => ({
      ...current,
      panX: 44,
      panY: -55,
      zoom: 1.25
    }));

    expect(get(dashboard).charts[0].position).toEqual({ top: 222, left: 333 });
    expect(get(dashboard).workspace).toMatchObject({ panX: 44, panY: -55, zoom: 1.25 });
    expect((await loadDashboard()).charts[0].position).toEqual({ top: 40, left: 30 });
    expect((await loadDashboard()).workspace).toMatchObject({ panX: 0, panY: 0, zoom: 1 });

    dashboard.persistChart(chartId);
    dashboard.persistWorkspace();
    await dashboard.flushPendingWrites();

    expect((await loadDashboard()).charts[0].position).toEqual({ top: 222, left: 333 });
    expect((await loadDashboard()).workspace).toMatchObject({ panX: 44, panY: -55, zoom: 1.25 });
  });

  it("adds, selects, updates, and deletes charts without browser storage", async () => {
    vi.stubGlobal("indexedDB", undefined);
    vi.stubGlobal("localStorage", undefined);

    await dashboard.initialize();

    dashboard.addChart();
    const addedState = get(dashboard);
    const chart = addedState.charts[0];

    expect(addedState.loading).toBe(false);
    expect(addedState.charts).toHaveLength(1);
    expect(addedState.selectedChartId).toBe(chart.id);

    dashboard.updateChart(chart.id, (current) => ({
      ...current,
      title: "Revenue",
      position: { top: 100, left: 140 },
      size: { width: 480, height: 260 }
    }));

    expect(get(dashboard).charts[0]).toMatchObject({
      title: "Revenue",
      position: { top: 100, left: 140 },
      size: { width: 480, height: 260 }
    });

    dashboard.deleteChart(chart.id);

    expect(get(dashboard).charts).toEqual([]);
    expect(get(dashboard).selectedChartId).toBeNull();
  });
});
