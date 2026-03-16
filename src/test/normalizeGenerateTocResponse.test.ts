import { describe, expect, it } from "vitest";
import {
  normalizeGenerateTocEntry,
  normalizeGenerateTocResponse,
} from "../../server/modules/ai/normalizeGenerateTocResponse";

describe("normalizeGenerateTocResponse", () => {
  it("trims TOC entry fields and keeps valid anchor metadata", () => {
    expect(normalizeGenerateTocEntry({
      anchorStrategy: "promote_block",
      anchorText: "  Project background  ",
      level: 4,
      title: "  Project Background  ",
    })).toEqual({
      anchorStrategy: "promote_block",
      anchorText: "Project background",
      level: 3,
      title: "Project Background",
    });
  });

  it("downgrades invalid or empty anchors to unmatched", () => {
    expect(normalizeGenerateTocEntry({
      anchorStrategy: "invalid",
      anchorText: "Overview",
      level: 0,
      title: "Overview",
    })).toEqual({
      anchorStrategy: "unmatched",
      anchorText: "",
      level: 1,
      title: "Overview",
    });

    expect(normalizeGenerateTocEntry({
      anchorStrategy: "existing_heading",
      anchorText: "   ",
      level: 2,
      title: "Setup",
    })).toEqual({
      anchorStrategy: "unmatched",
      anchorText: "",
      level: 2,
      title: "Setup",
    });
  });

  it("filters blank titles from the response payload", () => {
    const result = normalizeGenerateTocResponse({
      attributions: [],
      entries: [
        {
          anchorStrategy: "existing_heading",
          anchorText: "Overview",
          level: 1,
          title: " Overview ",
        },
        {
          anchorStrategy: "promote_block",
          anchorText: "Project goal",
          level: 2,
          title: "   ",
        },
      ],
      maxDepth: 9,
      rationale: "  Promote headings before inserting TOC.  ",
    });

    expect(result).toEqual({
      attributions: [],
      entries: [{
        anchorStrategy: "existing_heading",
        anchorText: "Overview",
        level: 1,
        title: "Overview",
      }],
      maxDepth: 3,
      rationale: "Promote headings before inserting TOC.",
    });
  });
});
