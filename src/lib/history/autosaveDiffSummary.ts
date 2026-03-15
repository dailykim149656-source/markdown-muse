import { compareDocuments, type ComparisonDeltaKind } from "@/lib/ai/compareDocuments";
import { normalizeIngestionRequest } from "@/lib/ingestion/normalizeIngestionRequest";
import type {
  AutosaveDiffSummaryDelta,
  AutosaveDiffSummaryRequest,
} from "@/types/aiAssistant";
import type { DocumentVersionSnapshot } from "@/types/document";
import type { Locale } from "@/i18n/types";

const MAX_DELTA_COUNT = 3;
const MAX_EXCERPT_LENGTH = 240;

const DELTA_PRIORITY: Record<ComparisonDeltaKind, number> = {
  inconsistent: 0,
  removed: 1,
  added: 2,
  changed: 3,
};

const normalizeExcerpt = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, MAX_EXCERPT_LENGTH);
};

const getSnapshotMarkdown = (snapshot: DocumentVersionSnapshot) => {
  const markdown = snapshot.document.sourceSnapshots?.markdown;

  if (typeof markdown === "string") {
    return markdown;
  }

  if (snapshot.mode === "markdown") {
    return snapshot.document.content;
  }

  return null;
};

const buildInitialSummaryRequest = (
  currentSnapshot: DocumentVersionSnapshot,
  currentMarkdown: string,
  locale?: Locale,
): AutosaveDiffSummaryRequest | null => {
  const currentMode = currentSnapshot.mode === "html" || currentSnapshot.mode === "latex"
    ? currentSnapshot.mode
    : "markdown";
  const excerpt = normalizeExcerpt(currentMarkdown);

  if (!excerpt) {
    return null;
  }

  return {
    comparison: {
      counts: {
        added: 1,
        changed: 0,
        inconsistent: 0,
        removed: 0,
      },
      deltas: [{
        afterExcerpt: excerpt,
        kind: "added",
        summary: "Initial content was added to the document.",
        title: currentSnapshot.document.name || "Untitled",
      }],
    },
    document: {
      documentId: currentSnapshot.documentId,
      fileName: currentSnapshot.document.name,
      mode: currentMode,
    },
    locale,
  };
};

const buildNormalizedSnapshotDocument = (
  snapshot: DocumentVersionSnapshot,
  markdown: string,
) =>
  normalizeIngestionRequest({
    fileName: `${snapshot.document.name || "Untitled"}.md`,
    importedAt: snapshot.createdAt,
    ingestionId: snapshot.snapshotId,
    rawContent: markdown,
    sourceFormat: "markdown",
  });

const toSummaryDelta = (delta: ReturnType<typeof compareDocuments>["deltas"][number]): AutosaveDiffSummaryDelta => ({
  afterExcerpt: normalizeExcerpt(delta.target?.text),
  beforeExcerpt: normalizeExcerpt(delta.source?.text),
  kind: delta.kind,
  summary: delta.summary,
  title: delta.target?.title || delta.source?.title || "Untitled",
});

interface BuildAutosaveDiffSummaryRequestOptions {
  currentSnapshot: DocumentVersionSnapshot;
  locale?: Locale;
  previousSnapshot: DocumentVersionSnapshot | null;
}

export const buildAutosaveDiffSummaryRequest = ({
  currentSnapshot,
  locale,
  previousSnapshot,
}: BuildAutosaveDiffSummaryRequestOptions): AutosaveDiffSummaryRequest | null => {
  if (currentSnapshot.mode === "json" || currentSnapshot.mode === "yaml") {
    return null;
  }

  const currentMarkdown = getSnapshotMarkdown(currentSnapshot);

  if (currentMarkdown === null) {
    return null;
  }

  if (!previousSnapshot) {
    return buildInitialSummaryRequest(currentSnapshot, currentMarkdown, locale);
  }

  const previousMarkdown = getSnapshotMarkdown(previousSnapshot);

  if (previousMarkdown === null) {
    return buildInitialSummaryRequest(currentSnapshot, currentMarkdown, locale);
  }

  const comparison = compareDocuments(
    buildNormalizedSnapshotDocument(previousSnapshot, previousMarkdown),
    buildNormalizedSnapshotDocument(currentSnapshot, currentMarkdown),
  );

  if (comparison.deltas.length === 0) {
    return null;
  }

  const deltas = [...comparison.deltas]
    .sort((left, right) =>
      DELTA_PRIORITY[left.kind] - DELTA_PRIORITY[right.kind]
      || left.deltaId.localeCompare(right.deltaId))
    .slice(0, MAX_DELTA_COUNT)
    .map(toSummaryDelta);

  if (deltas.length === 0) {
    return null;
  }

  const currentMode = currentSnapshot.mode === "html" || currentSnapshot.mode === "latex"
    ? currentSnapshot.mode
    : "markdown";

  return {
    comparison: {
      counts: comparison.counts,
      deltas,
    },
    document: {
      documentId: currentSnapshot.documentId,
      fileName: currentSnapshot.document.name,
      mode: currentMode,
    },
    locale,
  };
};
