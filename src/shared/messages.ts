import type { IgnoreRule, TabScanResult } from "./types";

export type ExtensionMessage =
  | { type: "scanTabs" }
  | { type: "getResults" }
  | { type: "closeTabs"; tabIds: number[] }
  | { type: "undoClose" }
  | { type: "moveToWindow"; tabIds: number[] }
  | { type: "groupTabs"; tabIds: number[]; title: string; existingGroupId?: number }
  | { type: "addIgnoreRule"; rule: IgnoreRule };

export interface ScanResponse {
  results: TabScanResult[];
}
