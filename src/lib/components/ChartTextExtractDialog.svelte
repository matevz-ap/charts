<script lang="ts">
  import { Sparkles } from "@lucide/svelte";
  import type { ChartDatum } from "$lib/types";
  import { extractChartDataFromText } from "$lib/chartDataExtraction";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";

  export let open = false;
  export let onExtract: (data: ChartDatum[]) => void;

  let sourceText = "";
  let extractionError = "";

  function extractFromText() {
    extractionError = "";

    try {
      onExtract(extractChartDataFromText(sourceText));
      sourceText = "";
      open = false;
    } catch (error) {
      extractionError =
        error instanceof Error ? error.message : "Could not extract chart data.";
    }
  }

  $: if (!open) {
    sourceText = "";
    extractionError = "";
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Extract from text</Dialog.Title>
      <Dialog.Description>
        Paste text with labels and values to populate the chart data.
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-3">
      <Label for="extract-source">Source text</Label>
      <Textarea
        id="extract-source"
        aria-label="Source text for chart extraction"
        placeholder="Paste text with labels and values, e.g. January revenue was 12,400€, February was 15,100€…"
        bind:value={sourceText}
        rows={6}
      />
      {#if extractionError}
        <p class="text-destructive text-sm">{extractionError}</p>
      {/if}
    </div>

    <Dialog.Footer>
      <Dialog.Close>
        {#snippet child({ props })}
          <Button variant="secondary" type="button" {...props}>Cancel</Button>
        {/snippet}
      </Dialog.Close>
      <Button type="button" disabled={!sourceText.trim()} onclick={extractFromText}>
        <Sparkles size={16} />
        Extract data
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
