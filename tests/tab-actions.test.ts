import { describe, expect, it, vi } from "vitest";
import { closeTabs, groupTabs, moveToNewWindow } from "../src/background/tab-actions";

function createChromeAdapter() {
  return {
    tabs: {
      query: vi.fn().mockResolvedValue([
        { id: 11, url: "https://a.test", windowId: 1, index: 0, pinned: false },
        { id: 12, url: "https://b.test", windowId: 1, index: 1, pinned: false },
        { id: 13, url: "https://c.test", windowId: 2, index: 0, pinned: false }
      ]),
      remove: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue(undefined),
      move: vi.fn().mockResolvedValue(undefined),
      group: vi.fn().mockResolvedValue(7)
    },
    windows: { create: vi.fn().mockResolvedValue({ id: 9 }) },
    tabGroups: { update: vi.fn().mockResolvedValue(undefined) }
  };
}

describe("tab actions", () => {
  it("records live tabs before closing them", async () => {
    const chrome = createChromeAdapter();
    const saveUndoRecord = vi.fn().mockResolvedValue(undefined);

    await closeTabs([11, 12], chrome, saveUndoRecord);

    expect(saveUndoRecord).toHaveBeenCalledWith(expect.objectContaining({ action: "close", tabs: expect.any(Array) }));
    expect(chrome.tabs.remove).toHaveBeenCalledWith([11, 12]);
  });

  it("moves the first selected tab into a new window and preserves other order", async () => {
    const chrome = createChromeAdapter();

    await moveToNewWindow([11, 12], chrome);

    expect(chrome.windows.create).toHaveBeenCalledWith({ tabId: 11 });
    expect(chrome.tabs.move).toHaveBeenCalledWith([12], { windowId: 9, index: -1 });
  });

  it("creates and labels a tab group", async () => {
    const chrome = createChromeAdapter();

    await groupTabs([11, 12], "Dead tabs", chrome);

    expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [11, 12], createProperties: { windowId: 1 } });
    expect(chrome.tabGroups.update).toHaveBeenCalledWith(7, { title: "Dead tabs", color: "grey" });
  });

  it("creates a same-named group in each selected tab window", async () => {
    const chrome = createChromeAdapter();
    chrome.tabs.group.mockResolvedValueOnce(7).mockResolvedValueOnce(8);

    await groupTabs([11, 13], "Duplicate tabs", chrome);

    expect(chrome.tabs.group).toHaveBeenNthCalledWith(1, { tabIds: [11], createProperties: { windowId: 1 } });
    expect(chrome.tabs.group).toHaveBeenNthCalledWith(2, { tabIds: [13], createProperties: { windowId: 2 } });
    expect(chrome.tabGroups.update).toHaveBeenNthCalledWith(1, 7, { title: "Duplicate tabs", color: "grey" });
    expect(chrome.tabGroups.update).toHaveBeenNthCalledWith(2, 8, { title: "Duplicate tabs", color: "grey" });
  });
});
