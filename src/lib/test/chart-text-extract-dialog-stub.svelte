<script lang="ts">
  import type { ChartDatum } from "$lib/types";

  export let open = false;
  export let onExtract: (data: ChartDatum[]) => void = () => {};
</script>
