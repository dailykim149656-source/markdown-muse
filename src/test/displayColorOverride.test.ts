import { describe, expect, it } from "vitest";
import { isBlackEquivalentDisplayColor } from "@/lib/editor/displayColorOverride";

describe("display color override matcher", () => {
  it("matches strict black-equivalent colors", () => {
    expect(isBlackEquivalentDisplayColor("black")).toBe(true);
    expect(isBlackEquivalentDisplayColor("#000")).toBe(true);
    expect(isBlackEquivalentDisplayColor("#000000")).toBe(true);
    expect(isBlackEquivalentDisplayColor("rgb(0, 0, 0)")).toBe(true);
    expect(isBlackEquivalentDisplayColor("rgba(0, 0, 0, 1)")).toBe(true);
  });

  it("does not match dark grays or accent colors", () => {
    expect(isBlackEquivalentDisplayColor("#111")).toBe(false);
    expect(isBlackEquivalentDisplayColor("rgb(34, 34, 34)")).toBe(false);
    expect(isBlackEquivalentDisplayColor("rgba(0, 0, 0, 0.8)")).toBe(false);
    expect(isBlackEquivalentDisplayColor("red")).toBe(false);
    expect(isBlackEquivalentDisplayColor("rgb(0, 120, 255)")).toBe(false);
  });
});
