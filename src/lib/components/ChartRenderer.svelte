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
  $: chartConfig = chartData.reduce(
    (config, item, index) => {
      config[item.key] = {
        label: item.label,
        color: item.color || `var(--chart-${(index % 5) + 1})`
      };
      return config;
    },
    {
      value: { label: chart.title || "Value", color: "var(--chart-1)" }
    } as Record<string, { label: string; color: string }>
  );
  $: colorRange = chartData.map((item, index) => item.color || `var(--chart-${(index % 5) + 1})`);
  $: maxValue = Math.max(1, ...chartData.map((item) => item.value));
  $: pieWidth = Math.max(220, chart.size.width - 48);
  $: pieHeight = Math.max(220, chart.size.height - (chart.title || chart.description ? 104 : 48));
  $: pieRadius = Math.max(72, Math.min(pieWidth, pieHeight) / 2 - 12);
  $: commonProps = {
    data: chartData,
    x: "label",
    y: "value",
    c: "label",
    cScale: scaleOrdinal(),
    cRange: colorRange,
    padding: { top: 10, right: 12, bottom: 26, left: 34 },
    tooltipContext: false,
    grid: chart.gridLines,
    axis: true,
    rule: false
  };
</script>

<ChartContainer config={chartConfig} class="chart-body">
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
      xScale={scaleBand().padding(0.28)}
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
      width={pieWidth}
      height={pieHeight}
      outerRadius={pieRadius}
      innerRadius={chart.type === "doughnut" ? 0.56 : 0}
      padAngle={0.02}
      cornerRadius={3}
      tooltipContext={false}
    />
  {:else}
    <BarChart
      {...commonProps}
      yDomain={[0, maxValue]}
      yScale={scaleLinear()}
      xScale={scaleBand().padding(0.34)}
      series={[{ key: "value", label: chart.title || "Value", color: "var(--chart-1)" }]}
    />
  {/if}
</ChartContainer>
