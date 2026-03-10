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

const getMissingScopedKeys = (scope: string) => {
  const englishKeys = flattenKeys((en as Record<string, unknown>)[scope]).map((key) => `${scope}.${key}`);
  const koreanKeys = new Set(flattenKeys((ko as Record<string, unknown>)[scope]).map((key) => `${scope}.${key}`));

  return englishKeys.filter((key) => !koreanKeys.has(key));
};

describe("sidebar i18n coverage", () => {
  it("keeps version history keys translated in Korean", () => {
    expect(getMissingScopedKeys("versionHistory")).toEqual([]);
  });

  it("keeps knowledge sidebar keys translated in Korean", () => {
    expect(getMissingScopedKeys("knowledge")).toEqual([]);
  });
});
