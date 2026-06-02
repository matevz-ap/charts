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

    const nextWidth = Math.max(360, startWidth + (event.clientX - startX) / workspace.zoom);
    const nextHeight = Math.max(300, startHeight + (event.clientY - startY) / workspace.zoom);

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
    const { getChartImageBlob } = await import("layerchart");
    const chartBody = chartExportTarget.querySelector(".chart-body");
    if (!(chartBody instanceof HTMLElement)) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const cardWidth = frameElement.clientWidth;
    const cardHeight = frameElement.clientHeight;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cardWidth * pixelRatio);
    canvas.height = Math.round(cardHeight * pixelRatio);

    const context = canvas.getContext("2d");
    if (!context) return;

    context.scale(pixelRatio, pixelRatio);
    drawCardBackground(context, cardWidth, cardHeight);
    drawCardText(context);

    const chartBlob = await getChartImageBlob(chartBody, {
      format: "png",
      pixelRatio,
      background: "transparent"
    });
    const chartImage = await loadImage(chartBlob);
    const chartOffset = getElementOffset(chartBody, frameElement);
    context.drawImage(
      chartImage,
      chartOffset.left,
      chartOffset.top,
      chartBody.clientWidth,
      chartBody.clientHeight
    );

    const cardBlob = await canvasToBlob(canvas);
    const url = URL.createObjectURL(cardBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `chart-${chart.id}-${Date.now()}.png`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function drawCardBackground(context: CanvasRenderingContext2D, width: number, height: number) {
    const radius = 8;
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#e2e8f0";
    context.lineWidth = 1;
    roundedRect(context, 0.5, 0.5, width - 1, height - 1, radius);
    context.fill();
    context.stroke();
  }

  function drawCardText(context: CanvasRenderingContext2D) {
    const left = 24;
    let top = 22;

    if (chart.title) {
      context.fillStyle = "#0f172a";
      context.font = "700 20px Inter, ui-sans-serif, system-ui, sans-serif";
      context.textBaseline = "top";
      context.fillText(chart.title, left, top, frameElement.clientWidth - 48);
      top += 32;
    }

    if (chart.description) {
      context.fillStyle = "#64748b";
      context.font = "400 14px Inter, ui-sans-serif, system-ui, sans-serif";
      context.textBaseline = "top";
      context.fillText(chart.description, left, top, frameElement.clientWidth - 48);
    }
  }

  function roundedRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function getElementOffset(element: HTMLElement, parent: HTMLElement) {
    const elementRect = element.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    return {
      left: (elementRect.left - parentRect.left) / workspace.zoom,
      top: (elementRect.top - parentRect.top) / workspace.zoom
    };
  }

  function loadImage(blob: Blob) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      };
      image.src = url;
    });
  }

  function canvasToBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to export chart card"));
        }
      }, "image/png");
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
  <div bind:this={chartExportTarget} class="chart-export-target" style={`--datum-count: ${chart.data.length}`}>
    <div class="chart-header">
      {#if chart.title}
        <div class="chart-title">{chart.title}</div>
      {/if}
      {#if chart.description}
        <div class="chart-caption">{chart.description}</div>
      {/if}
    </div>
    {#await chartRendererModule}
      <div class="chart-loading">Loading chart...</div>
    {:then module}
      <svelte:component this={module.default} {chart} />
    {/await}
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="resize-handle" role="separator" aria-label="Resize chart" onmousedown={beginResize}></div>
</div>
