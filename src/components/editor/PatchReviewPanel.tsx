import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/useI18n";
import { canApplyEditedSuggestedText } from "@/lib/patches/reviewPatchSet";
import type { DocumentPatch, DocumentPatchSet } from "@/types/documentPatch";

interface PatchReviewPanelProps {
  onAccept?: (patch: DocumentPatch) => void;
  onEdit?: (patch: DocumentPatch, suggestedText: string) => void;
  onReject?: (patch: DocumentPatch) => void;
  patchSet: DocumentPatchSet;
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

const PatchReviewPanel = ({ onAccept, onEdit, onReject, patchSet }: PatchReviewPanelProps) => {
  const { t } = useI18n();
  const [selectedPatchId, setSelectedPatchId] = useState<string>(patchSet.patches[0]?.patchId ?? "");
  const [editedText, setEditedText] = useState("");
  const selectedPatch = useMemo(
    () => patchSet.patches.find((patch) => patch.patchId === selectedPatchId) ?? patchSet.patches[0] ?? null,
    [patchSet.patches, selectedPatchId],
  );

  useEffect(() => {
    setSelectedPatchId((currentPatchId) => {
      if (patchSet.patches.some((patch) => patch.patchId === currentPatchId)) {
        return currentPatchId;
      }

      return patchSet.patches[0]?.patchId ?? "";
    });
  }, [patchSet]);

  useEffect(() => {
    setEditedText(selectedPatch ? getPatchPreviewText(selectedPatch) : "");
  }, [selectedPatch]);

  if (!selectedPatch) {
    return null;
  }

  const selectedIndex = patchSet.patches.findIndex((patch) => patch.patchId === selectedPatch.patchId);
  const isEditable = canApplyEditedSuggestedText(selectedPatch);

  const moveSelection = (direction: "prev" | "next") => {
    if (patchSet.patches.length === 0) {
      return;
    }

    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = direction === "next"
      ? (currentIndex + 1) % patchSet.patches.length
      : (currentIndex - 1 + patchSet.patches.length) % patchSet.patches.length;

    setSelectedPatchId(patchSet.patches[nextIndex]?.patchId ?? "");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium">{t("patchReview.patchCount", { count: patchSet.patches.length })}</span>
          <div className="flex items-center gap-1">
            <Button className="h-7 w-7 p-0" onClick={() => moveSelection("prev")} size="sm" title={t("patchReview.previous")} variant="ghost">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button className="h-7 w-7 p-0" onClick={() => moveSelection("next")} size="sm" title={t("patchReview.next")} variant="ghost">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[420px]">
          <div className="space-y-1 p-2">
            {patchSet.patches.map((patch, index) => (
              <button
                key={patch.patchId}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  patch.patchId === selectedPatch.patchId ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
                onClick={() => setSelectedPatchId(patch.patchId)}
                type="button"
              >
                {index + 1}. {patch.title}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{selectedPatch.title}</h3>
          <p className="text-sm text-muted-foreground">
            {selectedPatch.summary || selectedPatch.reason || patchSet.description || t("patchReview.descriptionFallback")}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{t("patchReview.author", { author: selectedPatch.author })}</span>
            {typeof selectedPatch.confidence === "number" && (
              <span>{t("patchReview.confidence", { value: Math.round(selectedPatch.confidence * 100) })}</span>
            )}
            {selectedPatch.sources && selectedPatch.sources.length > 0 && (
              <span>{t("patchReview.sources", { count: selectedPatch.sources.length })}</span>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("patchReview.original")}</p>
            <div className="min-h-[15rem] rounded-md border border-input bg-background px-3 py-2 text-sm whitespace-pre-wrap text-muted-foreground">
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
