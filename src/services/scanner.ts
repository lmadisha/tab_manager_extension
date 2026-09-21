import { MAX_CONCURRENT_SCANS, REQUEST_TIMEOUT_MS, SUPPORTED_PROTOCOLS } from "../shared/constants";
import type { IgnoreRule, ScanEvidence, TabScanResult } from "../shared/types";
import { classifyTab } from "./classifier";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface ScanOptions {
  fetchImpl?: FetchLike;
  ignoreRules: IgnoreRule[];
  now?: () => number;
}

function isIgnored(url: URL, rules: IgnoreRule[]): boolean {
  return rules.some((rule) => rule.type === "url" ? rule.value === url.href : rule.value === url.hostname);
}

export function getEligibleTabs(tabs: chrome.tabs.Tab[], ignoreRules: IgnoreRule[]): chrome.tabs.Tab[] {
  return tabs.filter((tab) => {
    if (tab.id === undefined || tab.windowId === undefined || !tab.url || tab.pinned) {
      return false;
    }

    try {
      const url = new URL(tab.url);
      return SUPPORTED_PROTOCOLS.has(url.protocol) && !isIgnored(url, ignoreRules);
    } catch {
      return false;
    }
  });
}

async function requestUrl(url: string, fetchImpl: FetchLike): Promise<ScanEvidence> {
  const request = async (method: "HEAD" | "GET"): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetchImpl(url, { method, redirect: "follow", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    let response = await request("HEAD");
    if (response.status === 405 || response.status === 501) {
      response = await request("GET");
    }
    return { httpStatus: response.status };
  } catch (error) {
    return { networkError: error instanceof DOMException && error.name === "AbortError" ? "timeout" : "network" };
  }
}

async function runWithConcurrency<T>(jobs: (() => Promise<T>)[]): Promise<T[]> {
  const results = new Array<T>(jobs.length);
  let nextJob = 0;
  const worker = async () => {
    while (nextJob < jobs.length) {
      const index = nextJob++;
      results[index] = await jobs[index]();
    }
  };

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_SCANS, jobs.length) }, worker));
  return results;
}

export async function scanTabs(tabs: chrome.tabs.Tab[], options: ScanOptions): Promise<TabScanResult[]> {
  const eligibleTabs = getEligibleTabs(tabs, options.ignoreRules);
  const groups = new Map<string, chrome.tabs.Tab[]>();

  for (const tab of eligibleTabs) {
    const matchingTabs = groups.get(tab.url!) ?? [];
    matchingTabs.push(tab);
    groups.set(tab.url!, matchingTabs);
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const scannedAt = (options.now ?? Date.now)();
  const groupEntries = [...groups.entries()];
  const evidence = await runWithConcurrency(groupEntries.map(([url]) => () => requestUrl(url, fetchImpl)));

  return groupEntries.flatMap(([, matchingTabs], index) => {
    const classification = classifyTab(evidence[index]);
    return matchingTabs.map((tab) => ({
      ...classification,
      tabId: tab.id!,
      windowId: tab.windowId!,
      title: tab.title ?? tab.url!,
      url: tab.url!,
      httpStatus: evidence[index].httpStatus,
      scannedAt
    }));
  });
}
