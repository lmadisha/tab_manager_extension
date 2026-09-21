import { describe, expect, it, vi } from "vitest";
import { getEligibleTabs, scanTabs } from "../src/services/scanner";

const tabs = [
  { id: 1, windowId: 1, index: 0, title: "Settings", url: "chrome://settings", pinned: false },
  { id: 2, windowId: 1, index: 1, title: "Article", url: "https://example.test/a", pinned: false },
  { id: 3, windowId: 2, index: 0, title: "Duplicate", url: "https://example.test/a", pinned: false },
  { id: 4, windowId: 1, index: 2, title: "Pinned", url: "https://pinned.test", pinned: true }
] as chrome.tabs.Tab[];

describe("getEligibleTabs", () => {
  it("keeps only unpinned HTTP(S) tabs not covered by ignore rules", () => {
    expect(getEligibleTabs(tabs, [{ id: "1", type: "domain", value: "ignored.test", createdAt: 1 }]).map((tab) => tab.id)).toEqual([
      2,
      3
    ]);

    expect(
      getEligibleTabs(tabs, [{ id: "2", type: "url", value: "https://example.test/a", createdAt: 1 }])
    ).toEqual([]);
  });
});

describe("scanTabs", () => {
  it("checks duplicate URLs once and fans the result out to each tab", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));

    const results = await scanTabs(tabs, { fetchImpl, ignoreRules: [] });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.test/a",
      expect.objectContaining({ method: "HEAD" })
    );
    expect(results).toHaveLength(2);
    expect(results.every((result) => result.status === "dead" && result.httpStatus === 404)).toBe(true);
  });

  it("falls back to GET when HEAD is rejected", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const [result] = await scanTabs([tabs[1]], { fetchImpl, ignoreRules: [] });

    expect(fetchImpl.mock.calls.map((call) => (call[1] as RequestInit).method)).toEqual(["HEAD", "GET"]);
    expect(result.status).toBe("healthy");
  });

  it("returns a temporary result when a request times out", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new DOMException("Timed out", "AbortError"));

    const [result] = await scanTabs([tabs[1]], { fetchImpl, ignoreRules: [] });

    expect(result).toMatchObject({ status: "temporary_error", reason: "Network timeout" });
  });
});
