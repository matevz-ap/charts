import type { ChartDatum } from "$lib/types";
import { colorForIndex } from "$lib/chartColors";
import ChartDataExtractorWorker from "$lib/workers/chartDataExtractor.worker?worker";

export type ExtractionProgress = {
  status: string;
  progress?: number;
  file?: string;
};

const EXTRACTION_PROMPT = `Extract JSON chart data from text. Use fields label and value.

Example:
Text: Q1 sales 100, Q2 sales 200
JSON: [{"label":"Q1","value":100},{"label":"Q2","value":200}]

Text: {{TEXT}}
JSON:`;

const LABEL_KEYS = ["label", "name", "category", "item", "month", "period", "key"];
const VALUE_KEYS = ["value", "amount", "count", "total", "revenue", "sales", "number", "val"];

let worker: Worker | null = null;
let workerReady: Promise<void> | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new ChartDataExtractorWorker();
  }
  return worker;
}

function buildPrompt(text: string): string {
  return EXTRACTION_PROMPT.replace("{{TEXT}}", text.trim());
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.,-]/g, "").replace(/,/g, "");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeLabel(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const label = String(value).trim();
  return label.length > 0 ? label : null;
}

function recordToDatum(record: Record<string, unknown>, index: number): ChartDatum | null {
  const labelKey = LABEL_KEYS.find((key) => normalizeLabel(record[key]));
  const valueKey = VALUE_KEYS.find((key) => parseNumericValue(record[key]) !== null);

  if (!labelKey || !valueKey) {
    return null;
  }

  const label = normalizeLabel(record[labelKey]);
  const value = parseNumericValue(record[valueKey]);

  if (!label || value === null) {
    return null;
  }

  return {
    label,
    value,
    color: colorForIndex(index),
  };
}

function repairJsonLike(text: string): string {
  return text
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/'/g, '"')
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
}

function parseArrayCandidate(candidate: string): ChartDatum[] | null {
  try {
    const parsed = JSON.parse(candidate) as unknown;

    if (Array.isArray(parsed)) {
      const data = parsed
        .map((item, index) => {
          if (!item || typeof item !== "object") return null;
          return recordToDatum(item as Record<string, unknown>, index);
        })
        .filter((item): item is ChartDatum => item !== null);

      return data.length > 0 ? data : null;
    }

    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const labels = record.labels ?? record.label;
      const values = record.data ?? record.values ?? record.value;

      if (Array.isArray(labels) && Array.isArray(values)) {
        const data = labels
          .map((label, index) => {
            const normalizedLabel = normalizeLabel(label);
            const value = parseNumericValue(values[index]);
            if (!normalizedLabel || value === null) return null;
            return {
              label: normalizedLabel,
              value,
              color: colorForIndex(index),
            } satisfies ChartDatum;
          })
          .filter((item): item is ChartDatum => item !== null);

        return data.length > 0 ? data : null;
      }

      const single = recordToDatum(record, 0);
      return single ? [single] : null;
    }
  } catch {
    return null;
  }

  return null;
}

function collectJsonCandidates(rawText: string): string[] {
  const trimmed = rawText.trim();
  const candidates = new Set<string>();

  if (trimmed) {
    candidates.add(trimmed);
    candidates.add(repairJsonLike(trimmed));
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const fenced = fencedMatch[1].trim();
    candidates.add(fenced);
    candidates.add(repairJsonLike(fenced));
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch?.[0]) {
    candidates.add(arrayMatch[0]);
    candidates.add(repairJsonLike(arrayMatch[0]));
  }

  const objectMatches = trimmed.matchAll(/\{[^{}]*\}/g);
  for (const match of objectMatches) {
    candidates.add(`[${match[0]}]`);
    candidates.add(repairJsonLike(`[${match[0]}]`));
  }

  return [...candidates];
}

function parseLooseObjectChunk(chunk: string, index: number): ChartDatum | null {
  const labelMatch =
    chunk.match(/"(?:label|name|category|item|month|period|key)"\s*:\s*"([^"]+)"/i) ??
    chunk.match(/(?:label|name|category|item|month|period|key)\s*:\s*"([^"]+)"/i) ??
    chunk.match(/(?:label|name|category|item|month|period|key)\s*:\s*([^,}\s]+)/i);

  const valueMatch =
    chunk.match(/"(?:value|amount|count|total|revenue|sales|number|val)"\s*:\s*"?([\d,.\s-]+)"?/i) ??
    chunk.match(/(?:value|amount|count|total|revenue|sales|number|val)\s*:\s*"?([\d,.\s-]+)"?/i);

  if (!labelMatch?.[1] || !valueMatch?.[1]) {
    return null;
  }

  const label = normalizeLabel(labelMatch[1]);
  const value = parseNumericValue(valueMatch[1]);

  if (!label || value === null) {
    return null;
  }

  return {
    label,
    value,
    color: colorForIndex(index),
  };
}

function parseLooseObjectChunks(rawText: string): ChartDatum[] | null {
  const chunks = [...rawText.matchAll(/\{[^{}]*\}/g)].map((match) => match[0]);
  const data = chunks
    .map((chunk, index) => parseLooseObjectChunk(chunk, index))
    .filter((item): item is ChartDatum => item !== null);

  return data.length > 0 ? data : null;
}

function splitSourceSegments(sourceText: string): string[] {
  return sourceText
    .split(/;|\n/)
    .flatMap((part) => part.split(/,(?=\s*[A-Za-z])/))
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function parseLabelValueSegment(segment: string): { label: string; value: number } | null {
  const cleaned = segment.trim().replace(/\.$/, "");
  if (!cleaned) {
    return null;
  }

  const patterns = [
    /^(.+?)\s+(?:revenue|sales|amount|total)\s+was\s+([\d,.\s]+)/i,
    /^(.+?)\s+was\s+([\d,.\s]+)/i,
    /^(.+?)\s+is\s+([\d,.\s]+)/i,
    /^(.+?):\s*([\d,.\s]+)/,
    /^(.+?)\s+([\d,.\s]+)\s*(?:€|\$|£|EUR|USD)?$/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (!match?.[1] || !match[2]) continue;

    const label = normalizeLabel(match[1].replace(/\b(revenue|sales|amount|total)\b/gi, "").trim());
    const value = parseNumericValue(match[2]);

    if (label && value !== null) {
      return { label, value };
    }
  }

  return null;
}

export function parseChartDataFromSourceText(sourceText: string): ChartDatum[] {
  const segments = splitSourceSegments(sourceText);

  const data = segments
    .map((segment) => parseLabelValueSegment(segment))
    .filter((item): item is { label: string; value: number } => item !== null)
    .map((item, index) => ({
      label: item.label,
      value: item.value,
      color: colorForIndex(index),
    }));

  if (data.length === 0) {
    throw new Error("Could not find label/value pairs in the pasted text.");
  }

  return data;
}

export function parseExtractedChartData(rawText: string, sourceText?: string): ChartDatum[] {
  for (const candidate of collectJsonCandidates(rawText)) {
    const parsed = parseArrayCandidate(candidate);
    if (parsed) {
      return parsed;
    }
  }

  const looseObjects = parseLooseObjectChunks(rawText);
  if (looseObjects) {
    return looseObjects;
  }

  if (sourceText?.trim()) {
    return parseChartDataFromSourceText(sourceText);
  }

  const preview = rawText.trim().slice(0, 120);
  throw new Error(
    preview
      ? `Could not parse chart data. Model returned: ${preview}${rawText.length > 120 ? "…" : ""}`
      : "Could not parse chart data from model output.",
  );
}

export async function extractChartDataFromText(
  text: string,
  onProgress?: (progress: ExtractionProgress) => void,
): Promise<ChartDatum[]> {
  const normalizedText = text.trim();
  if (!normalizedText) {
    throw new Error("Paste some text to extract chart data.");
  }

  const prompt = buildPrompt(normalizedText);
  const activeWorker = getWorker();

  return new Promise((resolve, reject) => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as
        | { type: "progress"; data: ExtractionProgress }
        | { type: "complete"; generatedText: string }
        | { type: "error"; message: string };

      if (message.type === "progress") {
        onProgress?.(message.data);
        return;
      }

      activeWorker.removeEventListener("message", handleMessage);
      activeWorker.removeEventListener("error", handleError);

      if (message.type === "error") {
        reject(new Error(message.message));
        return;
      }

      try {
        resolve(parseExtractedChartData(message.generatedText, normalizedText));
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Failed to parse extracted data."));
      }
    };

    const handleError = () => {
      activeWorker.removeEventListener("message", handleMessage);
      activeWorker.removeEventListener("error", handleError);
      reject(new Error("Chart data extraction worker failed."));
    };

    activeWorker.addEventListener("message", handleMessage);
    activeWorker.addEventListener("error", handleError);
    activeWorker.postMessage({ type: "extract", prompt });
  });
}

export function preloadChartDataExtractor(onProgress?: (progress: ExtractionProgress) => void) {
  workerReady ??= new Promise((resolve, reject) => {
    const activeWorker = getWorker();

    const handleMessage = (event: MessageEvent) => {
      const message = event.data as
        | { type: "progress"; data: ExtractionProgress }
        | { type: "ready" }
        | { type: "error"; message: string };

      if (message.type === "progress") {
        onProgress?.(message.data);
        return;
      }

      activeWorker.removeEventListener("message", handleMessage);
      activeWorker.removeEventListener("error", handleError);

      if (message.type === "error") {
        workerReady = null;
        reject(new Error(message.message));
        return;
      }

      resolve();
    };

    const handleError = () => {
      activeWorker.removeEventListener("message", handleMessage);
      activeWorker.removeEventListener("error", handleError);
      workerReady = null;
      reject(new Error("Chart data extraction worker failed to initialize."));
    };

    activeWorker.addEventListener("message", handleMessage);
    activeWorker.addEventListener("error", handleError);
    activeWorker.postMessage({ type: "preload" });
  });

  return workerReady;
}
