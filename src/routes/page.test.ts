import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./+page.svelte";
import { resetDatabaseForTests } from "$lib/persistence";

vi.mock("layerchart", async () => {
  const BarChart = (await import("$lib/test/chart-stub.svelte")).default;
  const LineChart = BarChart;
  const PieChart = BarChart;

  return {
    BarChart,
    LineChart,
    PieChart,
    downloadImage: vi.fn()
  };
});

vi.mock("$lib/components/ui/switch", async () => {
  return {
    Switch: (await import("$lib/test/switch-stub.svelte")).default
  };
});

describe("dashboard page", () => {
  beforeEach(async () => {
    localStorage.clear();
    await resetDatabaseForTests();
  });

  it("adds a chart and opens the shadcn-backed editor controls", async () => {
    render(Page);

    await waitFor(() => expect(screen.getByText("No charts yet")).not.toBeNull());
    await fireEvent.click(screen.getByRole("button", { name: "Add chart" }));

    expect(await screen.findByText("Edit chart")).not.toBeNull();
    expect((screen.getByRole("textbox", { name: "Chart title" }) as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("button", { name: "Add data row" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Delete chart" })).not.toBeNull();
    expect(document.querySelector(".chart-frame")).not.toBeNull();
  });
});
