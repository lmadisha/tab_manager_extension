import type { IgnoreRule, TabScanResult, UndoRecord } from "../shared/types";

const RESULTS_KEY = "latestResults";
const IGNORE_RULES_KEY = "ignoreRules";
const UNDO_KEY = "undoRecord";

export interface LocalStorageArea {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
}

export function createStorageService(storage: LocalStorageArea) {
  return {
    async getIgnoreRules(): Promise<IgnoreRule[]> {
      const value = (await storage.get(IGNORE_RULES_KEY))[IGNORE_RULES_KEY];
      return Array.isArray(value) ? (value as IgnoreRule[]) : [];
    },

    async saveIgnoreRule(rule: IgnoreRule): Promise<void> {
      if (rule.type !== "url" && rule.type !== "domain") {
        throw new Error("Invalid ignore rule type");
      }

      const rules = await this.getIgnoreRules();
      await storage.set({ [IGNORE_RULES_KEY]: [...rules, rule] });
    },

    async loadLatestResults(): Promise<TabScanResult[]> {
      const value = (await storage.get(RESULTS_KEY))[RESULTS_KEY];
      return Array.isArray(value) ? (value as TabScanResult[]) : [];
    },

    async saveLatestResults(results: TabScanResult[]): Promise<void> {
      await storage.set({ [RESULTS_KEY]: results });
    },

    async loadUndoRecord(): Promise<UndoRecord | undefined> {
      return (await storage.get(UNDO_KEY))[UNDO_KEY] as UndoRecord | undefined;
    },

    async saveUndoRecord(record: UndoRecord | undefined): Promise<void> {
      await storage.set({ [UNDO_KEY]: record });
    }
  };
}

export function getBrowserStorage() {
  return createStorageService(chrome.storage.local);
}
