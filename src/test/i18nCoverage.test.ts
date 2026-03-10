import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en";
import ko from "@/i18n/messages/ko";

const flattenKeys = (value: unknown, prefix = "", keys: string[] = []) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    if (prefix) {
      keys.push(prefix);
    }

    return keys;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    flattenKeys(child, nextPrefix, keys);
  }

  return keys;
};

describe("i18n coverage", () => {
  it("keeps Korean message keys aligned with English", () => {
    const englishKeys = flattenKeys(en);
    const koreanKeys = new Set(flattenKeys(ko));

    expect(englishKeys.filter((key) => !koreanKeys.has(key))).toEqual([]);
  });
});
