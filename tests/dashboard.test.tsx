import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { TabList } from "../src/dashboard/TabList";

it("preselects only high-confidence dead results", () => {
  render(<TabList results={[
    { tabId: 1, windowId: 1, title: "Missing", url: "https://a.test", status: "dead", confidence: "high", reason: "404", scannedAt: 1 },
    { tabId: 2, windowId: 1, title: "Protected", url: "https://b.test", status: "restricted", confidence: "medium", reason: "403", scannedAt: 1 }
  ]} selectedIds={new Set([1])} onSelectionChange={() => undefined} />);

  expect(screen.getByLabelText("Missing")).toHaveProperty("checked", true);
  expect(screen.getByLabelText("Protected")).toHaveProperty("checked", false);
});
