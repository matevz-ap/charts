export const CHART_COLOR_PALETTE = [
  "#2563eb",
  "#60a5fa",
  "#93c5fd",
  "#bfdbfe",
  "#1d4ed8",
  "#3b82f6",
] as const;

export function colorForIndex(index: number): string {
  return CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length];
}
