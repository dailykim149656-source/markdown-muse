import { describe, expect, it } from "vitest";
import {
  canSwitchModeWithinDocument,
  getCrossFamilyModes,
  getEditorModeFamily,
  getSameFamilyModes,
} from "@/lib/editor/modeFamilies";

describe("modeFamilies", () => {
  it("classifies editor modes by family", () => {
    expect(getEditorModeFamily("markdown")).toBe("richText");
    expect(getEditorModeFamily("latex")).toBe("richText");
    expect(getEditorModeFamily("html")).toBe("richText");
    expect(getEditorModeFamily("json")).toBe("structured");
    expect(getEditorModeFamily("yaml")).toBe("structured");
  });

  it("returns same-family and cross-family mode groups", () => {
    expect(getSameFamilyModes("markdown")).toEqual(["markdown", "latex", "html"]);
    expect(getCrossFamilyModes("markdown")).toEqual(["json", "yaml"]);
    expect(getSameFamilyModes("json")).toEqual(["json", "yaml"]);
    expect(getCrossFamilyModes("json")).toEqual(["markdown", "latex", "html"]);
  });

  it("blocks cross-family switching within the same document", () => {
    expect(canSwitchModeWithinDocument("markdown", "latex")).toBe(true);
    expect(canSwitchModeWithinDocument("html", "markdown")).toBe(true);
    expect(canSwitchModeWithinDocument("json", "yaml")).toBe(true);
    expect(canSwitchModeWithinDocument("markdown", "json")).toBe(false);
    expect(canSwitchModeWithinDocument("yaml", "html")).toBe(false);
  });
});
