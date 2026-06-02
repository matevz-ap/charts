<script lang="ts">
  import { Plus, Trash2 } from "@lucide/svelte";
  import type { ChartDatum, ChartRecord, ChartType } from "$lib/types";
  import { dashboard } from "$lib/stores/dashboard";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Switch } from "$lib/components/ui/switch";
  import * as Tabs from "$lib/components/ui/tabs";
  import * as Sheet from "$lib/components/ui/sheet";

  export let chart: ChartRecord | null = null;

  const chartTypes: Array<{ value: ChartType; label: string }> = [
    { value: "bar", label: "Bar" },
    { value: "line", label: "Line" },
    { value: "pie", label: "Pie" },
    { value: "doughnut", label: "Doughnut" },
  ];

  function updateChart(updater: (chart: ChartRecord) => ChartRecord) {
    if (!chart) return;
    dashboard.updateChart(chart.id, updater);
  }

  function updateDatum(index: number, patch: Partial<ChartDatum>) {
    updateChart((current) => ({
      ...current,
      data: current.data.map((datum, datumIndex) =>
        datumIndex === index ? { ...datum, ...patch } : datum,
      ),
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
          color: "#2563eb",
        },
      ],
    }));
  }

  function removeRow(index: number) {
    updateChart((current) => ({
      ...current,
      data: current.data.filter((_, datumIndex) => datumIndex !== index),
    }));
  }

  function deleteCurrentChart() {
    if (!chart) return;
    dashboard.deleteChart(chart.id);
  }

  $: inspectorOpen = Boolean(chart);
</script>

<Sheet.Root
  open={inspectorOpen}
  onOpenChange={(open) => !open && dashboard.selectChart(null)}
>
  {#if chart}
    <Sheet.Content
      side="right"
      class="w-[min(430px,calc(100vw-24px))] max-w-none p-0 sm:max-w-none"
    >
      <Sheet.Header class="border-b">
        <Sheet.Title>Edit chart</Sheet.Title>
        <Sheet.Description>{chart.id}</Sheet.Description>
      </Sheet.Header>

      <div class="inspector-body">
        <section class="inspector-section">
          <Tabs.Root
            value={chart.type}
            onValueChange={(value) =>
              updateChart((current) => ({
                ...current,
                type: value as ChartType,
              }))}
          >
            <Tabs.List class="grid w-full grid-cols-4">
              {#each chartTypes as type}
                <Tabs.Trigger value={type.value} title={type.label}>
                  <span>{type.label}</span>
                </Tabs.Trigger>
              {/each}
            </Tabs.List>
          </Tabs.Root>
        </section>

        <section class="inspector-section">
          <label class="field">
            <span class="label">Chart title</span>
            <Input
              aria-label="Chart title"
              value={chart.title}
              oninput={(event) =>
                updateChart((current) => ({
                  ...current,
                  title: event.currentTarget.value,
                }))}
            />
          </label>

          <label class="field">
            <span class="label">Description</span>
            <Input
              aria-label="Chart description"
              value={chart.description}
              oninput={(event) =>
                updateChart((current) => ({
                  ...current,
                  description: event.currentTarget.value,
                }))}
            />
          </label>

          {#if chart.type === "bar" || chart.type === "line"}
            <div class="switch-row">
              <div>
                <span class="label">Grid lines</span>
                <p class="field-hint">Show horizontal reference lines.</p>
              </div>
              <Switch
                checked={chart.gridLines}
                onCheckedChange={(checked) =>
                  updateChart((current) => ({
                    ...current,
                    gridLines: checked,
                  }))}
              />
            </div>
          {/if}
        </section>

        <section class="inspector-section">
          <div class="section-heading">
            <span class="label">Chart data</span>
            <Button
              variant="secondary"
              size="icon"
              type="button"
              aria-label="Add data row"
              onclick={addRow}
            >
              <Plus size={16} />
            </Button>
          </div>
          <div class="data-editor">
            <div class="data-header" aria-hidden="true">
              <span>Label</span>
              <span>Value</span>
              <span>Color</span>
            </div>
            {#each chart.data as datum, index}
              <div class="data-row">
                <Input
                  aria-label={`Label for row ${index + 1}`}
                  value={datum.label}
                  placeholder="Label"
                  oninput={(event) =>
                    updateDatum(index, { label: event.currentTarget.value })}
                />
                <Input
                  aria-label={`Value for row ${index + 1}`}
                  type="number"
                  step="any"
                  value={datum.value}
                  placeholder="Value"
                  oninput={(event) =>
                    updateDatum(index, {
                      value: Number.parseFloat(event.currentTarget.value) || 0,
                    })}
                />
                <input
                  class="color-input"
                  type="color"
                  value={datum.color}
                  aria-label={`Color for ${datum.label || `row ${index + 1}`}`}
                  oninput={(event) =>
                    updateDatum(index, { color: event.currentTarget.value })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label="Remove data row"
                  onclick={() => removeRow(index)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            {/each}
          </div>
        </section>
      </div>

      <Sheet.Footer class="border-t sm:flex-row sm:justify-between">
        <Button
          variant="destructive"
          type="button"
          onclick={deleteCurrentChart}
        >
          <Trash2 size={16} />
          Delete chart
        </Button>
        <Sheet.Close>
          {#snippet child({ props })}
            <Button variant="secondary" type="button" {...props}>Close</Button>
          {/snippet}
        </Sheet.Close>
      </Sheet.Footer>
    </Sheet.Content>
  {/if}
</Sheet.Root>
