import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { App } from "../src/dashboard/App";
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

it("shows and selects duplicate copies, replacing the previous dead-tab selection", async () => {
  const results: TabScanResult[] = [
    { tabId: 1, windowId: 1, title: "Original", url: "https://example.test", status: "dead", confidence: "high", reason: "404", scannedAt: 1 },
    { tabId: 2, windowId: 1, title: "Copy one", url: "https://example.test", duplicateOfTabId: 1, status: "healthy", confidence: "high", reason: "Available", scannedAt: 1 },
    { tabId: 3, windowId: 2, title: "Copy two", url: "https://example.test", duplicateOfTabId: 1, status: "healthy", confidence: "high", reason: "Available", scannedAt: 1 },
    { tabId: 4, windowId: 1, title: "Other", url: "https://other.test", status: "healthy", confidence: "high", reason: "Available", scannedAt: 1 }
  ];
  vi.stubGlobal("chrome", { runtime: { sendMessage: vi.fn().mockResolvedValue({ results }) } });

  render(<App />);
  await screen.findByRole("button", { name: "Duplicates: 2" });
  expect(screen.getByText("1 selected")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Duplicates: 2" }));

  expect(await screen.findByLabelText("Copy one")).toHaveProperty("checked", true);
  expect(screen.getByLabelText("Copy two")).toHaveProperty("checked", true);
  expect(screen.getByText("2 selected")).toBeTruthy();
  expect(screen.queryByLabelText("Original")).toBeNull();
  expect(screen.queryByLabelText("Other")).toBeNull();
});
