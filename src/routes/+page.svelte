<script lang="ts">
  import { onMount } from "svelte";
  import { BarChart3, Plus } from "@lucide/svelte";
  import ChartInspector from "$lib/components/ChartInspector.svelte";
  import Workspace from "$lib/components/Workspace.svelte";
  import { dashboard, selectedChart } from "$lib/stores/dashboard";
  import { Button } from "$lib/components/ui/button";

  onMount(() => {
    dashboard.initialize();
  });
</script>

<svelte:head>
  <title>Charts Dashboard</title>
</svelte:head>

<main class="app-shell">
  <div class="topbar">
    <div class="brand-lockup">
      <div class="brand-mark">
        <BarChart3 size={16} />
      </div>
      <div class="brand-title">
        <strong>Charts</strong>
        <span>Static dashboard editor</span>
      </div>
    </div>
    <div class="topbar-group">
      <Button type="button" onclick={dashboard.addChart}>
        <Plus size={16} />
        Add chart
      </Button>
    </div>
  </div>

  {#if $dashboard.loading}
    <div class="empty-state">
      <div class="empty-state-inner">
        <strong>Loading dashboard</strong>
        <span>Restoring saved charts.</span>
      </div>
    </div>
  {:else}
    <Workspace
      charts={$dashboard.charts}
      workspace={$dashboard.workspace}
      selectedChartId={$dashboard.selectedChartId}
    />
  {/if}

  <ChartInspector chart={$selectedChart} />
</main>
