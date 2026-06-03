<script lang="ts">
  let { children, ...restProps } = $props();
</script>

<p {...restProps}>{@render children?.()}</p>
