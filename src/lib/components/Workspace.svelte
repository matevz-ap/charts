<script lang="ts">
  import { onDestroy } from "svelte";
  import { Crosshair, RotateCcw, ZoomIn, ZoomOut } from "@lucide/svelte";
  import DraggableChart from "$lib/components/DraggableChart.svelte";
  import type { ChartRecord, WorkspaceState } from "$lib/types";
  import { dashboard } from "$lib/stores/dashboard";
  import { Button } from "$lib/components/ui/button";

  export let charts: ChartRecord[] = [];
  export let workspace: WorkspaceState;
  export let selectedChartId: string | null = null;

  let workspaceElement: HTMLDivElement;
  let panning = false;
  let startX = 0;
  let startY = 0;
  let startPanX = 0;
  let startPanY = 0;
  let wheelPersistTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

  $: transform = `translate(${workspace.panX}px, ${workspace.panY}px) scale(${workspace.zoom})`;
  $: zoomPercent = Math.round(workspace.zoom * 100);

  function beginPan(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (event.button !== 0 && event.button !== 1) return;
    if (target.closest(".chart-frame") || target.closest("button")) return;

    event.preventDefault();
    panning = true;
    startX = event.clientX;
    startY = event.clientY;
    startPanX = workspace.panX;
    startPanY = workspace.panY;
    dashboard.selectChart(null);
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handlePan);
    window.addEventListener("mouseup", endPan);
  }

  function handlePan(event: MouseEvent) {
    if (!panning) return;

    dashboard.updateWorkspaceLocal((current) => ({
      ...current,
      panX: startPanX + event.clientX - startX,
      panY: startPanY + event.clientY - startY
    }));
  }

  function endPan() {
    panning = false;
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", handlePan);
    window.removeEventListener("mouseup", endPan);
    dashboard.persistWorkspace();
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const rect = workspaceElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const factor = event.deltaY > 0 ? 0.97 : 1.03;

    dashboard.updateWorkspaceLocal((current) => {
      const zoom = Math.max(0.1, Math.min(5, current.zoom * factor));
      const worldX = (mouseX - current.panX) / current.zoom;
      const worldY = (mouseY - current.panY) / current.zoom;

      return {
        ...current,
        zoom,
        panX: mouseX - worldX * zoom,
        panY: mouseY - worldY * zoom
      };
    });
    scheduleWorkspacePersist();
  }

  function resetView() {
    dashboard.updateWorkspace((current) => ({
      ...current,
      panX: 0,
      panY: 0,
      zoom: 1
    }));
  }

  function resetZoom() {
    dashboard.updateWorkspace((current) => ({
      ...current,
      zoom: 1
    }));
  }

  function zoomBy(factor: number) {
    const rect = workspaceElement.getBoundingClientRect();
    const originX = rect.width / 2;
    const originY = rect.height / 2;

    dashboard.updateWorkspace((current) => {
      const zoom = Math.max(0.1, Math.min(5, current.zoom * factor));
      const worldX = (originX - current.panX) / current.zoom;
      const worldY = (originY - current.panY) / current.zoom;

      return {
        ...current,
        zoom,
        panX: originX - worldX * zoom,
        panY: originY - worldY * zoom
      };
    });
  }

  function scheduleWorkspacePersist() {
    if (wheelPersistTimeout) {
      clearTimeout(wheelPersistTimeout);
    }

    wheelPersistTimeout = setTimeout(() => {
      dashboard.persistWorkspace();
      wheelPersistTimeout = undefined;
    }, 180);
  }

  onDestroy(() => {
    if (wheelPersistTimeout) {
      clearTimeout(wheelPersistTimeout);
      dashboard.persistWorkspace();
    }
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={workspaceElement}
  role="application"
  aria-label="Chart dashboard workspace"
  class:is-panning={panning}
  class="workspace"
  onmousedown={beginPan}
  onwheel={handleWheel}
>
  <div class="workspace-content" style:transform>
    {#each charts as chart (chart.id)}
      <DraggableChart {chart} {workspace} selected={selectedChartId === chart.id} />
    {/each}
  </div>
  {#if charts.length === 0}
    <div class="empty-state">
      <div class="empty-state-inner">
        <strong>No charts yet</strong>
        <span>Add a chart to start building the dashboard.</span>
      </div>
    </div>
  {/if}
  <div class="workspace-controls" aria-label="Workspace controls">
    <Button variant="ghost" size="icon" type="button" aria-label="Zoom out" title="Zoom out" onclick={() => zoomBy(0.86)}>
      <ZoomOut size={16} />
    </Button>
    <span class="zoom-readout" aria-label={`Zoom ${zoomPercent}%`}>{zoomPercent}%</span>
    <Button variant="ghost" size="icon" type="button" aria-label="Zoom in" title="Zoom in" onclick={() => zoomBy(1.16)}>
      <ZoomIn size={16} />
    </Button>
    <span class="control-divider" aria-hidden="true"></span>
    <Button variant="ghost" size="icon" type="button" aria-label="Reset zoom" title="Reset zoom" onclick={resetZoom}>
      <RotateCcw size={16} />
    </Button>
    <Button variant="ghost" size="icon" type="button" aria-label="Reset view" title="Reset view" onclick={resetView}>
      <Crosshair size={16} />
    </Button>
  </div>
</div>
