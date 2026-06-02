<script lang="ts">
  import type { Snippet } from "svelte";

  let { value, title, children }: { value?: string; title?: string; children?: Snippet } = $props();
</script>

<button role="tab" type="button" aria-label={title ?? value}>
  {@render children?.()}
</button>
