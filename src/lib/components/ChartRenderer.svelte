<script lang="ts">
  import { BarChart, LineChart, PieChart } from "layerchart";
  import { scaleBand, scaleLinear, scaleOrdinal } from "d3-scale";
  import type { ChartRecord } from "$lib/types";
  import { ChartContainer } from "$lib/components/ui/chart";

  export let chart: ChartRecord;

  $: chartData = chart.data.map((item) => ({
    ...item,
    key: item.label
  }));
  $: colorRange = chartData.map((item) => item.color);
  $: maxValue = Math.max(1, ...chartData.map((item) => item.value));
  $: commonProps = {
    data: chartData,
    x: "label",
    y: "value",
    c: "label",
    cScale: scaleOrdinal(),
    cRange: colorRange,
    padding: { top: 14, right: 16, bottom: 28, left: 34 },
    tooltipContext: false,
    grid: chart.gridLines,
    axis: true,
    rule: true
  };
</script>

<ChartContainer config={{ value: { label: chart.title || "Value", color: "var(--chart-1)" } }} class="chart-body">
  {#if chartData.length === 0}
    <div class="empty-state-inner">
      <strong>No chart data</strong>
      <span>Add a row in the editor.</span>
    </div>
  {:else if chart.type === "line"}
    <LineChart
      {...commonProps}
      yDomain={[0, maxValue]}
      yScale={scaleLinear()}
      xScale={scaleBand().padding(0.2)}
      series={[{ key: "value", label: chart.title || "Value", color: "var(--color-value)" }]}
      points
    />
  {:else if chart.type === "pie" || chart.type === "doughnut"}
    <PieChart
      data={chartData}
      key="key"
      label="label"
      value="value"
      c="label"
      cScale={scaleOrdinal()}
      cRange={colorRange}
      innerRadius={chart.type === "doughnut" ? 0.56 : 0}
      padAngle={1.6}
      cornerRadius={3}
      tooltipContext={false}
    />
  {:else}
    <BarChart
      {...commonProps}
      yDomain={[0, maxValue]}
      yScale={scaleLinear()}
      xScale={scaleBand().padding(0.24)}
      series={[{ key: "value", label: chart.title || "Value", color: "var(--color-value)" }]}
    />
  {/if}
</ChartContainer>
