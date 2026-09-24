export type TabHealthStatus =
  | "healthy"
  | "dead"
  | "restricted"
  | "temporary_error"
  | "unknown";

export type ConfidenceLevel = "high" | "medium" | "low";

export type DetectionKind =
  | "youtube_removed"
  | "youtube_restricted"
  | "generic_unavailable"
  | "page_healthy";

export interface DetectionResult {
  kind: DetectionKind;
  confidence: ConfidenceLevel;
  reason: string;
}

export interface ScanEvidence {
  httpStatus?: number;
  networkError?: "timeout" | "network" | "dns";
  content?: DetectionResult;
}

export interface Classification {
  status: TabHealthStatus;
  confidence: ConfidenceLevel;
  reason: string;
}

export interface TabScanResult extends Classification {
  tabId: number;
  windowId: number;
  duplicateOfTabId?: number;
  title: string;
  url: string;
  httpStatus?: number;
  scannedAt: number;
}

export interface IgnoreRule {
  id: string;
  type: "url" | "domain";
  value: string;
  createdAt: number;
}

export interface UndoTab {
  url: string;
  windowId: number;
  index: number;
  pinned: boolean;
}

export interface UndoRecord {
  action: "close";
  tabs: UndoTab[];
  createdAt: number;
}
