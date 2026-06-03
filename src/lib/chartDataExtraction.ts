import type { ChartDatum } from "$lib/types";
import { colorForIndex } from "$lib/chartColors";

const LABEL_KEYS = ["label", "name", "category", "item", "month", "period", "key"];
const VALUE_KEYS = ["value", "amount", "count", "total", "revenue", "sales", "number", "val"];

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

const NOISE_LABELS = new Set([
  "revenue",
  "sales",
  "amount",
  "total",
  "in",
  "for",
  "during",
  "year",
  "the",
  "and",
]);

function isNoiseLabel(label: string): boolean {
  return NOISE_LABELS.has(label.toLowerCase());
}

function isYearContextRow(label: string, value: number): boolean {
  const normalized = label.toLowerCase();
  return (
    ["in", "for", "during", "year"].includes(normalized) &&
    value >= 1900 &&
    value <= 2100
  );
}

function finalizeChartData(data: ChartDatum[]): ChartDatum[] {
  return data
    .filter((item) => !isNoiseLabel(item.label) && !isYearContextRow(item.label, item.value))
    .map((item, index) => ({
      ...item,
      color: colorForIndex(index),
    }));
}

function extractPairsFromSourceText(sourceText: string): Array<{ label: string; value: number }> {
  const pairs = new Map<string, { label: string; value: number }>();

  const patterns = [
    /([A-Za-z][A-Za-z0-9]*)\s+(?:revenue|sales|amount)\s+was\s+([\d,]+)/gi,
    /\b([A-Za-z][A-Za-z0-9]{2,})\s+was\s+([\d,]+)/gi,
    /([A-Za-z][A-Za-z0-9]{2,}):\s*([\d,]+)/g,
  ];

  for (const pattern of patterns) {
    for (const match of sourceText.matchAll(pattern)) {
      const label = normalizeLabel(match[1]);
      const value = parseNumericValue(match[2]);

      if (!label || value === null || isNoiseLabel(label) || isYearContextRow(label, value)) {
        continue;
      }

      pairs.set(label.toLowerCase(), { label, value });
    }
  }

  return [...pairs.values()];
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
  const globalPairs = extractPairsFromSourceText(sourceText);

  if (globalPairs.length > 0) {
    return finalizeChartData(
      globalPairs.map((item) => ({
        label: item.label,
        value: item.value,
        color: "#2563eb",
      })),
    );
  }

  const segments = splitSourceSegments(sourceText);

  const data = segments
    .map((segment) => parseLabelValueSegment(segment))
    .filter((item): item is { label: string; value: number } => item !== null)
    .filter((item) => !isNoiseLabel(item.label) && !isYearContextRow(item.label, item.value))
    .map((item) => ({
      label: item.label,
      value: item.value,
      color: "#2563eb",
    }));

  if (data.length === 0) {
    throw new Error("Could not find label/value pairs in the pasted text.");
  }

  return finalizeChartData(data);
}

export function parseExtractedChartData(text: string): ChartDatum[] {
  const normalizedText = text.trim();
  if (!normalizedText) {
    throw new Error("Paste some text to extract chart data.");
  }

  for (const candidate of collectJsonCandidates(normalizedText)) {
    const parsed = parseArrayCandidate(candidate);
    if (parsed) {
      const cleaned = finalizeChartData(parsed);
      if (cleaned.length > 0) {
        return cleaned;
      }
    }
  }

  const looseObjects = parseLooseObjectChunks(normalizedText);
  if (looseObjects) {
    const cleaned = finalizeChartData(looseObjects);
    if (cleaned.length > 0) {
      return cleaned;
    }
  }

  return parseChartDataFromSourceText(normalizedText);
}

export function extractChartDataFromText(text: string): ChartDatum[] {
  return parseExtractedChartData(text);
}
