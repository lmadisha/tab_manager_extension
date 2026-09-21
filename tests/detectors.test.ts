import { describe, expect, it } from "vitest";
import { detectUnavailablePage } from "../src/content/detector";

function documentWith(body: string, heading?: string): Document {
  document.body.innerHTML = `${heading ? `<h1>${heading}</h1>` : ""}<main>${body}</main>`;
  return document;
}

describe("detectUnavailablePage", () => {
  it("identifies an unavailable YouTube video with high confidence", () => {
    expect(detectUnavailablePage("https://www.youtube.com/watch?v=a", documentWith("Video unavailable"))).toMatchObject({
      kind: "youtube_removed",
      confidence: "high",
      reason: "Video unavailable"
    });
  });

  it("treats a private YouTube video as restricted", () => {
    expect(detectUnavailablePage("https://www.youtube.com/watch?v=a", documentWith("Private video"))).toMatchObject({
      kind: "youtube_restricted",
      confidence: "medium"
    });
  });

  it("recognises a generic unavailable page only when the heading confirms it", () => {
    expect(detectUnavailablePage("https://example.test", documentWith("Nothing here", "Page not found"))).toMatchObject({
      kind: "generic_unavailable",
      confidence: "medium"
    });
  });

  it("does not flag ordinary article text that mentions unavailable pages", () => {
    expect(
      detectUnavailablePage(
        "https://example.test",
        documentWith("This article explains how a Page not found screen should look.", "Design notes")
      )
    ).toBeUndefined();
  });
});
