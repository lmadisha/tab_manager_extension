import { detectGenericUnavailable } from "./generic-detector";
import { detectYouTubeUnavailable } from "./youtube-detector";
import type { DetectionResult } from "../shared/types";

export function detectUnavailablePage(url: string, document: Document): DetectionResult | undefined {
  const hostname = new URL(url).hostname;

  if (hostname === "youtube.com" || hostname.endsWith(".youtube.com")) {
    return detectYouTubeUnavailable(document);
  }

  return detectGenericUnavailable(document);
}

export function detectPageHealth(): DetectionResult | undefined {
  return detectUnavailablePage(location.href, document);
}
