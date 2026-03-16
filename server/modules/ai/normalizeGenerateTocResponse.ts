import type { GenerateTocEntry, GenerateTocResponse } from "../../../src/types/aiAssistant";

const VALID_ANCHOR_STRATEGIES = new Set<GenerateTocEntry["anchorStrategy"]>([
  "existing_heading",
  "promote_block",
  "unmatched",
]);

const clampHeadingLevel = (value: unknown): 1 | 2 | 3 => {
  const parsed = typeof value === "number" ? value : Number(value);

  if (parsed <= 1) {
    return 1;
  }

  if (parsed >= 3) {
    return 3;
  }

  return 2;
};

const normalizeAnchorStrategy = (
  value: unknown,
  anchorText: string,
): GenerateTocEntry["anchorStrategy"] => {
  if (typeof value !== "string" || !VALID_ANCHOR_STRATEGIES.has(value as GenerateTocEntry["anchorStrategy"])) {
    return "unmatched";
  }

  if (value === "unmatched" || anchorText.length === 0) {
    return "unmatched";
  }

  return value as GenerateTocEntry["anchorStrategy"];
};

export const normalizeGenerateTocEntry = (value: unknown): GenerateTocEntry | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const rawEntry = value as Partial<GenerateTocEntry> & {
    anchorStrategy?: unknown;
    anchorText?: unknown;
    level?: unknown;
    title?: unknown;
  };
  const title = typeof rawEntry.title === "string" ? rawEntry.title.trim() : "";

  if (title.length === 0) {
    return null;
  }

  const anchorText = typeof rawEntry.anchorText === "string" ? rawEntry.anchorText.trim() : "";
  const anchorStrategy = normalizeAnchorStrategy(rawEntry.anchorStrategy, anchorText);

  return {
    anchorStrategy,
    anchorText: anchorStrategy === "unmatched" ? "" : anchorText,
    level: clampHeadingLevel(rawEntry.level),
    title,
  };
};

export const normalizeGenerateTocResponse = (value: GenerateTocResponse): GenerateTocResponse => ({
  ...value,
  attributions: Array.isArray(value.attributions) ? value.attributions : [],
  entries: Array.isArray(value.entries)
    ? value.entries
      .map((entry) => normalizeGenerateTocEntry(entry))
      .filter((entry): entry is GenerateTocEntry => Boolean(entry))
    : [],
  maxDepth: clampHeadingLevel(value.maxDepth),
  rationale: typeof value.rationale === "string" ? value.rationale.trim() : "",
});
