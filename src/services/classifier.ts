import type { Classification, ScanEvidence, TabScanResult } from "../shared/types";

const temporaryStatuses = new Set([429, 500, 501, 502, 503, 504]);

export function classifyTab(evidence: ScanEvidence): Classification {
  const { content, httpStatus, networkError } = evidence;

  if (content?.kind === "youtube_removed") {
    return { status: "dead", confidence: "high", reason: content.reason };
  }

  if (httpStatus === 404) {
    return { status: "dead", confidence: "high", reason: "HTTP 404 Not Found" };
  }

  if (httpStatus === 410) {
    return { status: "dead", confidence: "high", reason: "HTTP 410 Gone" };
  }

  if (content?.kind === "page_healthy") {
    return { status: "healthy", confidence: "medium", reason: content.reason };
  }

  if (content?.kind === "generic_unavailable") {
    return { status: "dead", confidence: "medium", reason: content.reason };
  }

  if (content?.kind === "youtube_restricted" || httpStatus === 401 || httpStatus === 403) {
    return { status: "restricted", confidence: "medium", reason: content?.reason ?? `HTTP ${httpStatus} Restricted` };
  }

  if (networkError) {
    return { status: "temporary_error", confidence: "medium", reason: `Network ${networkError}` };
  }

  if (httpStatus !== undefined && temporaryStatuses.has(httpStatus)) {
    return { status: "temporary_error", confidence: "medium", reason: `HTTP ${httpStatus} Temporary error` };
  }

  if (httpStatus !== undefined && httpStatus >= 200 && httpStatus < 400) {
    return { status: "healthy", confidence: "high", reason: `HTTP ${httpStatus}` };
  }

  return { status: "unknown", confidence: "low", reason: "Could not determine tab health" };
}

export function isInitiallySelected(result: Pick<TabScanResult, "status" | "confidence">): boolean {
  return result.status === "dead" && result.confidence === "high";
}
