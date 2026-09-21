import type { UndoRecord, UndoTab } from "../shared/types";

export interface TabActionAdapter {
  tabs: {
    query(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]>;
    remove(tabIds: number[]): Promise<void>;
    create(createProperties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab>;
    move(tabIds: number[], moveProperties: chrome.tabs.MoveProperties): Promise<chrome.tabs.Tab | chrome.tabs.Tab[]>;
    group(options: chrome.tabs.GroupOptions): Promise<number>;
  };
  windows: { create(createData: chrome.windows.CreateData): Promise<chrome.windows.Window | undefined> };
  tabGroups: { update(groupId: number, properties: chrome.tabGroups.UpdateProperties): Promise<chrome.tabGroups.TabGroup | undefined> };
}

async function getLiveTabs(tabIds: number[], chromeApi: TabActionAdapter): Promise<chrome.tabs.Tab[]> {
  const wanted = new Set(tabIds);
  return (await chromeApi.tabs.query({})).filter((tab) => tab.id !== undefined && wanted.has(tab.id));
}

export async function closeTabs(
  tabIds: number[],
  chromeApi: TabActionAdapter,
  saveUndoRecord: (record: UndoRecord) => Promise<void>
): Promise<void> {
  const tabs = await getLiveTabs(tabIds, chromeApi);
  const restorableTabs: UndoTab[] = tabs.flatMap((tab) =>
    tab.url && tab.windowId !== undefined && tab.index !== undefined
      ? [{ url: tab.url, windowId: tab.windowId, index: tab.index, pinned: Boolean(tab.pinned) }]
      : []
  );

  if (!tabs.length) return;
  await saveUndoRecord({ action: "close", tabs: restorableTabs, createdAt: Date.now() });
  await chromeApi.tabs.remove(tabs.map((tab) => tab.id!));
}

export async function undoClose(record: UndoRecord, chromeApi: TabActionAdapter): Promise<void> {
  for (const tab of record.tabs) {
    await chromeApi.tabs.create({ url: tab.url, windowId: tab.windowId, index: tab.index, pinned: tab.pinned });
  }
}

export async function moveToNewWindow(tabIds: number[], chromeApi: TabActionAdapter): Promise<void> {
  const tabs = await getLiveTabs(tabIds, chromeApi);
  if (!tabs.length) return;

  const window = await chromeApi.windows.create({ tabId: tabs[0].id! });
  const remainingIds = tabs.slice(1).map((tab) => tab.id!);
  if (remainingIds.length && window?.id !== undefined) {
    await chromeApi.tabs.move(remainingIds, { windowId: window.id, index: -1 });
  }
}

export async function groupTabs(
  tabIds: number[],
  title: string,
  chromeApi: TabActionAdapter,
  existingGroupId?: number
): Promise<void> {
  const tabs = await getLiveTabs(tabIds, chromeApi);
  if (!tabs.length) return;

  const liveTabIds = tabs.map((tab) => tab.id!) as [number, ...number[]];
  const groupId = await chromeApi.tabs.group(existingGroupId === undefined ? { tabIds: liveTabIds } : { tabIds: liveTabIds, groupId: existingGroupId });
  if (existingGroupId === undefined) {
    await chromeApi.tabGroups.update(groupId, { title, color: "grey" });
  }
}
