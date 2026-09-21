import { describe, expect, it } from "vitest";
import { classifyTab, isInitiallySelected } from "../src/services/classifier";
import type { TabScanResult } from "../src/shared/types";

describe("classifyTab", () => {
  it("marks an HTTP 404 as high-confidence dead", () => {
    expect(classifyTab({ httpStatus: 404 })).toMatchObject({
      status: "dead",
      confidence: "high",
      reason: "HTTP 404 Not Found"
    });
  });

  it("keeps authentication failures out of the dead category", () => {
    expect(classifyTab({ httpStatus: 403 })).toMatchObject({
      status: "restricted",
      confidence: "medium"
    });
  });

  it("marks timeouts as temporary", () => {
    expect(classifyTab({ networkError: "timeout" })).toMatchObject({
      status: "temporary_error",
      confidence: "medium"
    });
  });

  it("prefers a confirmed removed YouTube video over a successful response", () => {
    expect(
      classifyTab({
        httpStatus: 200,
        content: { kind: "youtube_removed", confidence: "high", reason: "Video unavailable" }
      })
    ).toMatchObject({ status: "dead", confidence: "high", reason: "Video unavailable" });
  });
});

describe("isInitiallySelected", () => {
  it("selects only high-confidence dead tabs", () => {
    const result = {
      status: "dead",
      confidence: "medium"
    } as TabScanResult;

    expect(isInitiallySelected(result)).toBe(false);
    expect(isInitiallySelected({ ...result, confidence: "high" })).toBe(true);
    expect(isInitiallySelected({ ...result, status: "restricted", confidence: "high" })).toBe(false);
  });
});
