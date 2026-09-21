import { closeTabs, groupTabs, moveToNewWindow, undoClose } from "./tab-actions";
import { classifyTab, isInitiallySelected } from "../services/classifier";
import { scanTabs } from "../services/scanner";
import { getBrowserStorage } from "../services/storage";
import type { ExtensionMessage } from "../shared/messages";
import type { DetectionResult, TabScanResult } from "../shared/types";

function inspectPage(): DetectionResult | undefined {
  const text = document.body.textContent ?? "";
  const hostname = location.hostname;
  if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
    if (/(Video unavailable|This video is unavailable|Video has been removed)/i.test(text)) {
      return { kind: "youtube_removed", confidence: "high", reason: "Video unavailable" };
    }
    if (/(Private video|not available in your country|not available in your region)/i.test(text)) {
      return { kind: "youtube_restricted", confidence: "medium", reason: "Video access is restricted" };
    }
  }
  const heading = document.querySelector("h1, h2, [role='heading']")?.textContent?.trim().toLowerCase();
  if (heading && ["page not found", "404 not found", "content unavailable", "this page no longer exists"].includes(heading)) {
    return { kind: "generic_unavailable", confidence: "medium", reason: heading };
  }
  return undefined;
}

async function scanOpenTabs(): Promise<TabScanResult[]> {
  const storage = getBrowserStorage();
  const results = await scanTabs(await chrome.tabs.query({}), { ignoreRules: await storage.getIgnoreRules() });

  for (const result of results) {
    try {
      const injected = await chrome.scripting.executeScript({ target: { tabId: result.tabId }, func: inspectPage });
      const content = injected[0]?.result;
      if (content) Object.assign(result, classifyTab({ httpStatus: result.httpStatus, content }));
    } catch {
      // Protected pages and unavailable frames retain their network-only result.
    }
  }

  await storage.saveLatestResults(results);
  await chrome.action.setBadgeText({ text: String(results.filter(isInitiallySelected).length || "") });
  return results;
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  const run = async () => {
    const storage = getBrowserStorage();
    switch (message.type) {
      case "scanTabs": return { results: await scanOpenTabs() };
      case "getResults": return { results: await storage.loadLatestResults() };
      case "closeTabs": await closeTabs(message.tabIds, chrome, storage.saveUndoRecord); return { results: await storage.loadLatestResults() };
      case "undoClose": { const record = await storage.loadUndoRecord(); if (record) await undoClose(record, chrome); return { results: await storage.loadLatestResults() }; }
      case "moveToWindow": await moveToNewWindow(message.tabIds, chrome); return { results: await storage.loadLatestResults() };
      case "groupTabs": await groupTabs(message.tabIds, message.title, chrome, message.existingGroupId); return { results: await storage.loadLatestResults() };
      case "addIgnoreRule": await storage.saveIgnoreRule(message.rule); return { results: await storage.loadLatestResults() };
    }
  };
  run().then(sendResponse).catch((error: unknown) => sendResponse({ error: error instanceof Error ? error.message : "Action failed" }));
  return true;
});
