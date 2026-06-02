<script lang="ts">
  import { Download, Settings2 } from "@lucide/svelte";
  import type { ChartRecord, WorkspaceState } from "$lib/types";
  import { dashboard } from "$lib/stores/dashboard";
  import { Button } from "$lib/components/ui/button";

  export let chart: ChartRecord;
  export let workspace: WorkspaceState;
  export let selected = false;

  const chartRendererModule = import("$lib/components/ChartRenderer.svelte");

  let frameElement: HTMLDivElement;
  let chartExportTarget: HTMLDivElement;
  let dragging = false;
  let resizing = false;
  let hasMoved = false;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let startWidth = 0;
  let startHeight = 0;

  function localPoint(event: MouseEvent) {
    const parent = frameElement.parentElement;
    const rect = parent?.getBoundingClientRect();
    return {
      x: ((event.clientX - (rect?.left ?? 0)) - workspace.panX) / workspace.zoom,
      y: ((event.clientY - (rect?.top ?? 0)) - workspace.panY) / workspace.zoom
    };
  }

  function beginDrag(event: MouseEvent) {
    if (event.button !== 0 || resizing || (event.target as HTMLElement).closest("button")) return;

    dashboard.selectChart(chart.id);
    const point = localPoint(event);
    startX = event.clientX;
    startY = event.clientY;
    offsetX = point.x - chart.position.left;
    offsetY = point.y - chart.position.top;
    hasMoved = false;

    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", endDrag);
  }

  function handleDrag(event: MouseEvent) {
    const distance = Math.hypot(event.clientX - startX, event.clientY - startY);
    if (distance > 8) {
      hasMoved = true;
      dragging = true;
      document.body.style.userSelect = "none";
    }

    if (!dragging) return;

    const point = localPoint(event);
    dashboard.updateChartLocal(chart.id, (current) => ({
      ...current,
      position: {
        left: point.x - offsetX,
        top: point.y - offsetY
      }
    }));
  }

  function endDrag() {
    window.removeEventListener("mousemove", handleDrag);
    window.removeEventListener("mouseup", endDrag);
    document.body.style.userSelect = "";

    if (!hasMoved) {
      dashboard.selectChart(chart.id);
    } else {
      dashboard.persistChart(chart.id);
    }

    dragging = false;
    hasMoved = false;
  }

  function beginResize(event: MouseEvent) {
    event.stopPropagation();
    resizing = true;
    startX = event.clientX;
    startY = event.clientY;
    startWidth = chart.size.width;
    startHeight = chart.size.height;
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleResize);
    window.addEventListener("mouseup", endResize);
  }

  function handleResize(event: MouseEvent) {
    if (!resizing) return;

    const nextWidth = Math.max(220, startWidth + (event.clientX - startX) / workspace.zoom);
    const nextHeight = Math.max(170, startHeight + (event.clientY - startY) / workspace.zoom);

    dashboard.updateChartLocal(chart.id, (current) => ({
      ...current,
      size: {
        width: nextWidth,
        height: nextHeight
      }
    }));
  }

  function endResize() {
    resizing = false;
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", handleResize);
    window.removeEventListener("mouseup", endResize);
    dashboard.persistChart(chart.id);
  }

  async function downloadChart(event: MouseEvent) {
    event.stopPropagation();
    const { downloadImage } = await import("layerchart");
    await downloadImage(chartExportTarget, {
      filename: `chart-${chart.id}-${Date.now()}`,
      background: "#ffffff",
      pixelRatio: window.devicePixelRatio || 1
    });
  }
</script>

<div
  bind:this={frameElement}
  role="button"
  tabindex="0"
  aria-label={`Chart ${chart.title || chart.id}. Click to edit, drag to move.`}
  class:active={selected}
  class:dragging
  class="chart-frame"
  style:left={`${chart.position.left}px`}
  style:top={`${chart.position.top}px`}
  style:width={`${chart.size.width}px`}
  style:height={`${chart.size.height}px`}
  data-chart-id={chart.id}
  onmousedown={beginDrag}
>
  <div class="chart-toolbar">
    <Button variant="secondary" size="icon" type="button" aria-label="Download chart" onclick={downloadChart}>
      <Download size={16} />
    </Button>
    <Button variant="secondary" size="icon" type="button" aria-label="Edit chart" onclick={() => dashboard.selectChart(chart.id)}>
      <Settings2 size={16} />
    </Button>
  </div>
  <div bind:this={chartExportTarget} class="chart-export-target">
    <div class:empty={!chart.title} class="chart-title">{chart.title || "Untitled chart"}</div>
    {#await chartRendererModule}
      <div class="chart-loading">Loading chart...</div>
    {:then module}
      <svelte:component this={module.default} {chart} />
    {/await}
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="resize-handle" role="separator" aria-label="Resize chart" onmousedown={beginResize}></div>
</div>
