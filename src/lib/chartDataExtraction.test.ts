import { describe, expect, it } from "vitest";
import {
  parseChartDataFromSourceText,
  parseExtractedChartData,
} from "$lib/chartDataExtraction";

describe("parseExtractedChartData", () => {
  it("parses a plain JSON array", () => {
    const result = parseExtractedChartData(`
[
  { "label": "January", "value": 12400 },
  { "label": "February", "value": 15100 }
]
    `);

    expect(result).toEqual([
      { label: "January", value: 12400, color: "#2563eb" },
      { label: "February", value: 15100, color: "#60a5fa" },
    ]);
  });

  it("parses fenced JSON output", () => {
    const result = parseExtractedChartData(`
Here is the data:
\`\`\`json
[
  { "label": "Q1", "value": "12,400" }
]
\`\`\`
    `);

    expect(result).toEqual([{ label: "Q1", value: 12400, color: "#2563eb" }]);
  });

  it("parses malformed JSON with unquoted keys", () => {
    const result = parseExtractedChartData(
      '[{label: "January", value: 12400}, {label: "February", value: 15100}]',
    );

    expect(result).toEqual([
      { label: "January", value: 12400, color: "#2563eb" },
      { label: "February", value: 15100, color: "#60a5fa" },
    ]);
  });

  it("parses chart.js style labels/data objects", () => {
    const result = parseExtractedChartData(
      '{"labels":["Alpha","Beta"],"data":[12,19]}',
    );

    expect(result).toEqual([
      { label: "Alpha", value: 12, color: "#2563eb" },
      { label: "Beta", value: 19, color: "#60a5fa" },
    ]);
  });

  it("falls back to source text parsing when model output is unusable", () => {
    const sourceText =
      "January revenue was 12,400€, February was 15,100€, March was 13,900€.";

    const result = parseExtractedChartData("not valid json at all", sourceText);

    expect(result).toEqual([
      { label: "January", value: 12400, color: "#2563eb" },
      { label: "February", value: 15100, color: "#60a5fa" },
      { label: "March", value: 13900, color: "#93c5fd" },
    ]);
  });

  it("throws when no valid rows are found", () => {
    expect(() => parseExtractedChartData("not json")).toThrow(
      "Could not parse chart data. Model returned: not json",
    );
  });
});

describe("parseChartDataFromSourceText", () => {
  it("extracts revenue sentences", () => {
    const result = parseChartDataFromSourceText(
      "January revenue was 12,400€, February was 15,100€, March was 13,900€.",
    );

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ label: "January", value: 12400 });
    expect(result[1]).toMatchObject({ label: "February", value: 15100 });
  });

  it("extracts colon separated pairs", () => {
    const result = parseChartDataFromSourceText("North: 42\nSouth: 18\nEast: 27");

    expect(result).toEqual([
      { label: "North", value: 42, color: "#2563eb" },
      { label: "South", value: 18, color: "#60a5fa" },
      { label: "East", value: 27, color: "#93c5fd" },
    ]);
  });
});
