<script lang="ts">
  export let checked = false;
  export let onCheckedChange: ((checked: boolean) => void) | undefined = undefined;
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  onclick={() => onCheckedChange?.(!checked)}
>
  Toggle
</button>
