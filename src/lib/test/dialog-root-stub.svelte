<script lang="ts">
  import type { Snippet } from "svelte";

  let { open = false, children }: { open?: boolean; children?: Snippet } = $props();
</script>

{#if open}
  {@render children?.()}
{/if}
