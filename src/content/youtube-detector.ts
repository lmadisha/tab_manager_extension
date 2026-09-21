import type { DetectionResult } from "../shared/types";

export function detectYouTubeUnavailable(document: Document): DetectionResult | undefined {
  const text = (document.body.textContent ?? "").trim();

  if (/(Video unavailable|This video is unavailable|Video has been removed)/i.test(text)) {
    return { kind: "youtube_removed", confidence: "high", reason: "Video unavailable" };
  }

  if (/(Private video|not available in your country|not available in your region)/i.test(text)) {
    return { kind: "youtube_restricted", confidence: "medium", reason: "Video access is restricted" };
  }

  return undefined;
}
