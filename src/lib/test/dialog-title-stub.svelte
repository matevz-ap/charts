<script lang="ts">
  let { children, ...restProps } = $props();
</script>

<h2 {...restProps}>{@render children?.()}</h2>
