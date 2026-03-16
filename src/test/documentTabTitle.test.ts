import { describe, expect, it } from "vitest";
import {
  getDocumentTabTitle,
  normalizeDocumentTabTitle,
  shortenGoogleWorkspaceDocumentTitle,
} from "@/lib/workspace/documentTabTitle";

describe("document tab title helpers", () => {
  it("uses the first separator segment for long Google Workspace titles when it fits", () => {
    expect(
      shortenGoogleWorkspaceDocumentTitle("Workspace launch plan: detailed milestones and owners"),
    ).toBe("Workspace launch plan");
  });

  it("falls back to ellipsis truncation when no matching separator segment exists", () => {
    expect(
      shortenGoogleWorkspaceDocumentTitle("ThisGoogleDocTitleHasNoSeparatorButIsDefinitelyLong"),
    ).toBe("ThisGoogleDocTitleHas...");
  });

  it("normalizes repeated whitespace before shortening Google Workspace titles", () => {
    expect(
      shortenGoogleWorkspaceDocumentTitle("Workspace   launch\nplan: detailed milestones and owners"),
    ).toBe("Workspace launch plan");
    expect(
      normalizeDocumentTabTitle("Workspace   launch\nplan"),
    ).toBe("Workspace launch plan");
  });

  it("passes through short and non-Google titles unchanged", () => {
    expect(shortenGoogleWorkspaceDocumentTitle("Short title")).toBe("Short title");

    expect(
      getDocumentTabTitle({
        fallbackTitle: "Untitled",
        name: "A very long local document title that should stay unchanged",
      }),
    ).toEqual({
      displayTitle: "A very long local document title that should stay unchanged",
      fullTitle: "A very long local document title that should stay unchanged",
    });
  });
});
