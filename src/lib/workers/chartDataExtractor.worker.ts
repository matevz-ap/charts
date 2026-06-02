import { pipeline, type ProgressInfo } from "@huggingface/transformers";

const TASK = "text2text-generation";
const MODEL = "Xenova/flan-t5-small";

type ExtractorPipeline = Awaited<ReturnType<typeof pipeline<typeof TASK>>>;

let extractorPromise: Promise<ExtractorPipeline> | null = null;

function postProgress(data: ProgressInfo) {
  self.postMessage({ type: "progress", data });
}

async function getExtractor(): Promise<ExtractorPipeline> {
  extractorPromise ??= pipeline(TASK, MODEL, {
    dtype: "q4",
    progress_callback: postProgress,
  });

  return extractorPromise;
}

self.addEventListener("message", async (event) => {
  const message = event.data as
    | { type: "preload" }
    | { type: "extract"; prompt: string };

  try {
    const extractor = await getExtractor();

    if (message.type === "preload") {
      self.postMessage({ type: "ready" });
      return;
    }

    const result = await extractor(message.prompt, {
      max_new_tokens: 256,
      do_sample: false,
    });

    const generatedText = Array.isArray(result)
      ? result[0]?.generated_text ?? ""
      : "";

    self.postMessage({ type: "complete", generatedText });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Extraction failed.",
    });
  }
});
