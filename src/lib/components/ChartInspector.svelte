<script lang="ts">
  import { BarChart3, Donut, LineChart, PieChart, Plus, Trash2, X } from "@lucide/svelte";
  import type { ChartDatum, ChartRecord, ChartType } from "$lib/types";
  import { dashboard } from "$lib/stores/dashboard";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Switch } from "$lib/components/ui/switch";

  export let chart: ChartRecord | null = null;

  const chartTypes: Array<{ value: ChartType; label: string; icon: typeof BarChart3 }> = [
    { value: "bar", label: "Bar", icon: BarChart3 },
    { value: "line", label: "Line", icon: LineChart },
    { value: "pie", label: "Pie", icon: PieChart },
    { value: "doughnut", label: "Doughnut", icon: Donut }
  ];

  function updateChart(updater: (chart: ChartRecord) => ChartRecord) {
    if (!chart) return;
    dashboard.updateChart(chart.id, updater);
  }

  function updateDatum(index: number, patch: Partial<ChartDatum>) {
    updateChart((current) => ({
      ...current,
      data: current.data.map((datum, datumIndex) => (datumIndex === index ? { ...datum, ...patch } : datum))
    }));
  }

  function addRow() {
    updateChart((current) => ({
      ...current,
      data: [
        ...current.data,
        {
          label: `Item ${current.data.length + 1}`,
          value: 0,
          color: "#2563eb"
        }
      ]
    }));
  }

  function removeRow(index: number) {
    updateChart((current) => ({
      ...current,
      data: current.data.filter((_, datumIndex) => datumIndex !== index)
    }));
  }

  function deleteCurrentChart() {
    if (!chart) return;
    dashboard.deleteChart(chart.id);
  }
</script>

<aside class:open={chart} class="inspector" aria-hidden={!chart}>
  {#if chart}
    <div class="inspector-header">
      <div>
        <h2 class="inspector-title">Edit chart</h2>
        <p class="inspector-subtitle">{chart.id}</p>
      </div>
      <Button variant="ghost" size="icon" type="button" aria-label="Close inspector" onclick={() => dashboard.selectChart(null)}>
        <X size={18} />
      </Button>
    </div>

    <div class="inspector-body">
      <div class="field">
        <span class="label">Chart type</span>
        <div class="segmented">
          {#each chartTypes as type}
            <label class="segment" title={type.label}>
              <input
                type="radio"
                name="chart-type"
                value={type.value}
                checked={chart.type === type.value}
                onchange={() => updateChart((current) => ({ ...current, type: type.value }))}
              />
              <svelte:component this={type.icon} size={18} />
              <span class="sr-only">{type.label}</span>
            </label>
          {/each}
        </div>
      </div>

      <label class="field">
        <span class="label">Chart title</span>
        <Input
          aria-label="Chart title"
          value={chart.title}
          placeholder="Chart title"
          oninput={(event) => updateChart((current) => ({ ...current, title: event.currentTarget.value }))}
        />
      </label>

      {#if chart.type === "bar" || chart.type === "line"}
        <div class="field">
          <div class="switch-row">
            <span class="label">Show grid lines</span>
            <Switch checked={chart.gridLines} onCheckedChange={(checked) => updateChart((current) => ({ ...current, gridLines: checked }))} />
          </div>
        </div>
      {/if}

      <div class="field">
        <div class="switch-row">
          <span class="label">Chart data</span>
          <Button variant="secondary" size="icon" type="button" aria-label="Add data row" onclick={addRow}>
            <Plus size={16} />
          </Button>
        </div>
        <div class="data-editor">
          {#each chart.data as datum, index}
            <div class="data-row">
              <Input
                aria-label={`Label for row ${index + 1}`}
                value={datum.label}
                placeholder="Label"
                oninput={(event) => updateDatum(index, { label: event.currentTarget.value })}
              />
              <Input
                aria-label={`Value for row ${index + 1}`}
                type="number"
                step="any"
                value={datum.value}
                placeholder="Value"
                oninput={(event) => updateDatum(index, { value: Number.parseFloat(event.currentTarget.value) || 0 })}
              />
              <input
                class="color-input"
                type="color"
                value={datum.color}
                aria-label={`Color for ${datum.label || `row ${index + 1}`}`}
                oninput={(event) => updateDatum(index, { color: event.currentTarget.value })}
              />
              <Button variant="ghost" size="icon" type="button" aria-label="Remove data row" onclick={() => removeRow(index)}>
                <Trash2 size={16} />
              </Button>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="inspector-footer">
      <Button variant="destructive" type="button" onclick={deleteCurrentChart}>
        <Trash2 size={16} />
        Delete chart
      </Button>
      <Button variant="secondary" type="button" onclick={() => dashboard.selectChart(null)}>Close</Button>
    </div>
  {/if}
</aside>
