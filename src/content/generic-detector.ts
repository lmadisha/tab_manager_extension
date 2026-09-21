import type { DetectionResult } from "../shared/types";

const unavailableHeadings = new Set([
  "page not found",
  "404 not found",
  "content unavailable",
  "this page no longer exists"
]);

export function detectGenericUnavailable(document: Document): DetectionResult | undefined {
  const heading = document.querySelector("h1, h2, [role='heading']")?.textContent?.trim().toLowerCase();

  if (!heading || !unavailableHeadings.has(heading)) {
    return undefined;
  }

  return { kind: "generic_unavailable", confidence: "medium", reason: heading.replace(/^./, (letter) => letter.toUpperCase()) };
}
