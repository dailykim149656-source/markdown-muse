import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Link2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/useI18n";
import { canApplyEditedSuggestedText } from "@/lib/patches/reviewPatchSet";
import type { DocumentPatch, DocumentPatchSet, PatchStatus } from "@/types/documentPatch";

interface PatchReviewPanelProps {
  onAccept?: (patch: DocumentPatch) => void;
  onEdit?: (patch: DocumentPatch, suggestedText: string) => void;
  onReject?: (patch: DocumentPatch) => void;
  patchSet: DocumentPatchSet;
}

interface DiffRow {
  kind: "added" | "removed" | "unchanged";
  value: string;
}

const getPatchPreviewText = (patch: DocumentPatch) => {
  if (patch.suggestedText !== undefined) {
    return patch.suggestedText;
  }

  if (!patch.payload) {
    return "";
  }

  switch (patch.payload.kind) {
    case "replace_text":
      return patch.payload.text;
    case "update_attribute":
      return typeof patch.payload.value === "string" ? patch.payload.value : JSON.stringify(patch.payload.value, null, 2);
    case "replace_node":
      return patch.summary || "";
    case "insert_nodes":
      return patch.summary || "";
    default:
      return "";
  }
};

const splitLines = (value: string) => value.replace(/\r\n/g, "\n").split("\n");

const buildLineDiff = (original: string, suggested: string): DiffRow[] => {
  const left = splitLines(original);
  const right = splitLines(suggested);
  const lcs = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      lcs[i][j] = left[i] === right[j] ? 1 + lcs[i + 1][j + 1] : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      rows.push({ kind: "unchanged", value: left[i] });
      i += 1;
      j += 1;
      continue;
    }

    if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      rows.push({ kind: "removed", value: left[i] });
      i += 1;
      continue;
    }

    rows.push({ kind: "added", value: right[j] });
    j += 1;
  }

  while (i < left.length) {
    rows.push({ kind: "removed", value: left[i] });
    i += 1;
  }

  while (j < right.length) {
    rows.push({ kind: "added", value: right[j] });
    j += 1;
  }

  return rows;
};

const getStatusVariant = (status: PatchStatus) => {
  switch (status) {
    case "accepted":
      return "default";
    case "edited":
      return "secondary";
    case "rejected":
      return "destructive";
    default:
      return "outline";
  }
};

const PatchReviewPanel = ({ onAccept, onEdit, onReject, patchSet }: PatchReviewPanelProps) => {
  const { t } = useI18n();
  const [showProvenanceGapsOnly, setShowProvenanceGapsOnly] = useState(false);
  const [selectedPatchId, setSelectedPatchId] = useState<string>(patchSet.patches[0]?.patchId ?? "");
  const [editedText, setEditedText] = useState("");
  const filteredPatches = useMemo(
    () => showProvenanceGapsOnly
      ? patchSet.patches.filter((patch) => (patch.sources || []).length === 0)
      : patchSet.patches,
    [patchSet.patches, showProvenanceGapsOnly],
  );
  const missingProvenanceCount = useMemo(
    () => patchSet.patches.filter((patch) => (patch.sources || []).length === 0).length,
    [patchSet.patches],
  );
  const selectedPatch = useMemo(
    () => filteredPatches.find((patch) => patch.patchId === selectedPatchId) ?? filteredPatches[0] ?? null,
    [filteredPatches, selectedPatchId],
  );

  const statusCounts = useMemo(() => ({
    accepted: patchSet.patches.filter((patch) => patch.status === "accepted").length,
    edited: patchSet.patches.filter((patch) => patch.status === "edited").length,
    pending: patchSet.patches.filter((patch) => patch.status === "pending").length,
    rejected: patchSet.patches.filter((patch) => patch.status === "rejected").length,
  }), [patchSet.patches]);

  useEffect(() => {
    setSelectedPatchId((currentPatchId) => {
      if (filteredPatches.some((patch) => patch.patchId === currentPatchId)) {
        return currentPatchId;
      }

      return filteredPatches[0]?.patchId ?? "";
    });
  }, [filteredPatches]);

  useEffect(() => {
    setEditedText(selectedPatch ? getPatchPreviewText(selectedPatch) : "");
  }, [selectedPatch]);

  if (!selectedPatch) {
    return null;
  }

  const selectedIndex = filteredPatches.findIndex((patch) => patch.patchId === selectedPatch.patchId);
  const isEditable = canApplyEditedSuggestedText(selectedPatch);
  const diffRows = buildLineDiff(selectedPatch.originalText || "", editedText);
  const selectedPatchMissingProvenance = (selectedPatch.sources || []).length === 0;

  const moveSelection = (direction: "prev" | "next") => {
    if (filteredPatches.length === 0) {
      return;
    }

    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = direction === "next"
      ? (currentIndex + 1) % filteredPatches.length
      : (currentIndex - 1 + filteredPatches.length) % filteredPatches.length;

    setSelectedPatchId(filteredPatches[nextIndex]?.patchId ?? "");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="rounded-lg border border-border p-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{t("patchReview.pendingStatus", { count: statusCounts.pending })}</Badge>
            <Badge variant="default">{t("patchReview.acceptedStatus", { count: statusCounts.accepted })}</Badge>
            <Badge variant="secondary">{t("patchReview.editedStatus", { count: statusCounts.edited })}</Badge>
            <Badge variant="destructive">{t("patchReview.rejectedStatus", { count: statusCounts.rejected })}</Badge>
            <Badge variant={missingProvenanceCount > 0 ? "outline" : "secondary"}>
              {t("patchReview.provenanceGapCount", { count: missingProvenanceCount })}
            </Badge>
          </div>
          <Button
            className="mt-3 h-7 text-xs"
            disabled={missingProvenanceCount === 0}
            onClick={() => setShowProvenanceGapsOnly((current) => !current)}
            size="sm"
            type="button"
            variant={showProvenanceGapsOnly ? "secondary" : "outline"}
          >
            {t("patchReview.provenanceGapsOnly")}
          </Button>
        </div>

        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium">{t("patchReview.patchCount", { count: filteredPatches.length })}</span>
            <div className="flex items-center gap-1">
              <Button className="h-7 w-7 p-0" onClick={() => moveSelection("prev")} size="sm" title={t("patchReview.previous")} variant="ghost">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button className="h-7 w-7 p-0" onClick={() => moveSelection("next")} size="sm" title={t("patchReview.next")} variant="ghost">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[520px]">
            <div className="space-y-1 p-2">
              {filteredPatches.map((patch, index) => (
                <button
                  key={patch.patchId}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    patch.patchId === selectedPatch.patchId
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-transparent hover:bg-muted"
                  }`}
                  onClick={() => setSelectedPatchId(patch.patchId)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{index + 1}. {patch.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{patch.operation}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={getStatusVariant(patch.status)}>{t(`patchReview.status.${patch.status}`)}</Badge>
                      {(patch.sources || []).length === 0 && (
                        <Badge variant="outline">{t("patchReview.provenanceGapBadge")}</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{selectedPatch.title}</h3>
            <Badge variant={getStatusVariant(selectedPatch.status)}>{t(`patchReview.status.${selectedPatch.status}`)}</Badge>
            <Badge variant="outline">{t(`patchReview.operations.${selectedPatch.operation}`)}</Badge>
            {selectedPatchMissingProvenance && (
              <Badge variant="outline">{t("patchReview.provenanceGapBadge")}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedPatch.summary || selectedPatch.reason || patchSet.description || t("patchReview.descriptionFallback")}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{t("patchReview.author", { author: selectedPatch.author })}</span>
            {typeof selectedPatch.confidence === "number" && (
              <span>{t("patchReview.confidence", { value: Math.round(selectedPatch.confidence * 100) })}</span>
            )}
            <span>{t("patchReview.target", { target: selectedPatch.target.targetType === "node"
              ? t("patchReview.targetNode", { nodeId: selectedPatch.target.nodeId })
              : selectedPatch.target.targetType === "attribute"
                ? t("patchReview.targetAttribute", { nodeId: selectedPatch.target.nodeId, path: selectedPatch.target.attributePath })
                : selectedPatch.target.targetType === "text_range"
                  ? t("patchReview.targetTextRange", {
                    nodeId: selectedPatch.target.nodeId,
                    start: selectedPatch.target.startOffset,
                    end: selectedPatch.target.endOffset,
                  })
                  : t("patchReview.targetStructuredPath", { path: selectedPatch.target.path }) })}</span>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("patchReview.original")}</p>
            <div className="min-h-[12rem] rounded-md border border-input bg-background px-3 py-2 text-sm whitespace-pre-wrap text-muted-foreground">
              {selectedPatch.originalText || ""}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("patchReview.suggested")}</p>
            <Textarea
              disabled={!isEditable}
              onChange={(event) => setEditedText(event.target.value)}
              rows={10}
              value={editedText}
            />
            {!isEditable && (
              <p className="text-xs text-muted-foreground">{t("patchReview.nonEditable")}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("patchReview.diffPreview")}</p>
          <ScrollArea className="max-h-56 rounded-md border border-input bg-background">
            <div className="space-y-1 p-3 font-mono text-xs">
              {diffRows.map((row, index) => (
                <div
                  key={`${row.kind}-${index}`}
                  className={
                    row.kind === "added"
                      ? "rounded bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-300"
                      : row.kind === "removed"
                        ? "rounded bg-destructive/10 px-2 py-1 text-destructive"
                        : "rounded px-2 py-1 text-muted-foreground"
                  }
                >
                  <span className="mr-2 inline-block w-4">
                    {row.kind === "added" ? "+" : row.kind === "removed" ? "-" : " "}
                  </span>
                  <span>{row.value || " "}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("patchReview.sourceDetails")}</p>
          {selectedPatchMissingProvenance && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-2 font-medium">
                <TriangleAlert className="h-3.5 w-3.5" />
                {t("patchReview.provenanceGapTitle")}
              </div>
              <p className="mt-1 leading-5">
                {t("patchReview.provenanceGapDescription")}
              </p>
            </div>
          )}
          {selectedPatch.sources && selectedPatch.sources.length > 0 ? (
            <div className="grid gap-2 xl:grid-cols-2">
              {selectedPatch.sources.map((source, index) => (
                <div key={`${selectedPatch.patchId}-source-${index}`} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  <div>{t("patchReview.sourceId", { sourceId: source.sourceId })}</div>
                  {source.chunkId ? <div>{t("patchReview.chunkId", { chunkId: source.chunkId })}</div> : null}
                  {source.sectionId ? <div>{t("patchReview.sectionId", { sectionId: source.sectionId })}</div> : null}
                  {source.excerpt ? <div className="mt-1 whitespace-pre-wrap text-foreground">{source.excerpt}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              {t("patchReview.noSources")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => onReject?.(selectedPatch)} type="button" variant="outline">
            {t("patchReview.reject")}
          </Button>
          <Button disabled={!isEditable} onClick={() => onEdit?.(selectedPatch, editedText)} type="button" variant="secondary">
            {t("patchReview.saveEdit")}
          </Button>
          <Button onClick={() => onAccept?.(selectedPatch)} type="button">
            {t("patchReview.accept")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PatchReviewPanel;
