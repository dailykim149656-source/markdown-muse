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

describe("patch review i18n coverage", () => {
  it("keeps patch review keys translated in Korean", () => {
    const englishKeys = flattenKeys((en as Record<string, unknown>).patchReview).map((key) => `patchReview.${key}`);
    const koreanKeys = new Set(flattenKeys((ko as Record<string, unknown>).patchReview).map((key) => `patchReview.${key}`));

    expect(englishKeys.filter((key) => !koreanKeys.has(key))).toEqual([]);
  });
});
