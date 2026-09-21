import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { TabList } from "../src/dashboard/TabList";
import type { TabScanResult } from "../src/shared/types";

it("preselects only high-confidence dead results", () => {
  render(<TabList results={[
    { tabId: 1, windowId: 1, title: "Missing", url: "https://a.test", status: "dead", confidence: "high", reason: "404", scannedAt: 1 },
    { tabId: 2, windowId: 1, title: "Protected", url: "https://b.test", status: "restricted", confidence: "medium", reason: "403", scannedAt: 1 }
  ]} selectedIds={new Set([1])} onSelectionChange={() => undefined} />);

  expect(screen.getByLabelText("Missing")).toHaveProperty("checked", true);
  expect(screen.getByLabelText("Protected")).toHaveProperty("checked", false);
});

it("renders large result sets in batches", () => {
  const results: TabScanResult[] = Array.from({ length: 1_000 }, (_, index) => ({
    tabId: index + 1,
    windowId: 1,
    title: `Tab ${index + 1}`,
    url: `https://example.test/${index + 1}`,
    status: "dead",
    confidence: "high",
    reason: "404",
    scannedAt: 1
  }));

  const { rerender } = render(<TabList results={results} selectedIds={new Set()} onSelectionChange={() => undefined} />);

  expect(screen.getAllByRole("checkbox")).toHaveLength(100);
  expect(screen.getByText("Showing 100 of 1000")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Load 100 more" }));

  expect(screen.getAllByRole("checkbox")).toHaveLength(200);
  expect(screen.getByText("Showing 200 of 1000")).toBeTruthy();

  rerender(<TabList results={[...results].reverse()} selectedIds={new Set()} onSelectionChange={() => undefined} />);

  expect(screen.getAllByRole("checkbox")).toHaveLength(100);
  expect(screen.getByText("Showing 100 of 1000")).toBeTruthy();
});
