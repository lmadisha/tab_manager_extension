import { afterEach, expect, it, vi } from "vitest";
import type { ExtensionMessage, ScanResponse } from "../src/shared/messages";

type MessageListener = (
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ScanResponse) => void
) => boolean;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("inspects rendered pages concurrently without starting every inspection at once", async () => {
  let listener: MessageListener | undefined;
  let activeInspections = 0;
  let maximumActiveInspections = 0;
  const tabs = Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    windowId: 1,
    index,
    title: `Tab ${index + 1}`,
    url: `https://example.test/${index + 1}`,
    pinned: false
  })) as chrome.tabs.Tab[];

  const chromeMock = {
    runtime: {
      onMessage: {
        addListener: vi.fn((nextListener: MessageListener) => {
          listener = nextListener;
        })
      }
    },
    tabs: { query: vi.fn().mockResolvedValue(tabs) },
    scripting: {
      executeScript: vi.fn(async () => {
        activeInspections += 1;
        maximumActiveInspections = Math.max(maximumActiveInspections, activeInspections);
        await new Promise((resolve) => setTimeout(resolve, 1));
        activeInspections -= 1;
        return [{ result: undefined }];
      })
    },
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined)
      }
    },
    action: { setBadgeText: vi.fn().mockResolvedValue(undefined) }
  };

  vi.stubGlobal("chrome", chromeMock);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  await import("../src/background/service-worker");

  const response = new Promise<ScanResponse>((resolve) => {
    listener?.({ type: "scanTabs" }, {} as chrome.runtime.MessageSender, resolve);
  });
  await response;

  expect(maximumActiveInspections).toBeGreaterThan(1);
  expect(maximumActiveInspections).toBeLessThan(tabs.length);
});
