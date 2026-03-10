import { Gauge, Link2, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n/useI18n";
import PatchReviewPanel from "@/components/editor/PatchReviewPanel";
import type { DocumentPatch, DocumentPatchSet } from "@/types/documentPatch";

interface PatchReviewDialogProps {
  acceptedPatchCount: number;
  onAccept: (patch: DocumentPatch) => void;
  onApply: () => void;
  onClear: () => void;
  onEdit: (patch: DocumentPatch, suggestedText: string) => void;
  onLoadPatchSet: () => void;
  onOpenChange: (open: boolean) => void;
  onReject: (patch: DocumentPatch) => void;
  open: boolean;
  patchSet: DocumentPatchSet | null;
}

const getConfidenceLabelKey = (patchSet: DocumentPatchSet) => {
  const confidenceValues = patchSet.patches
    .map((patch) => patch.confidence)
    .filter((value): value is number => typeof value === "number");

  if (confidenceValues.length === 0) {
    return "patchReview.confidenceUnknown";
  }

  const averageConfidence = confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length;

  if (averageConfidence >= 0.85) {
    return "patchReview.confidenceHigh";
  }

  if (averageConfidence >= 0.6) {
    return "patchReview.confidenceMedium";
  }

  return "patchReview.confidenceLow";
};

const PatchReviewDialog = ({
  acceptedPatchCount,
  onAccept,
  onApply,
  onClear,
  onEdit,
  onLoadPatchSet,
  onOpenChange,
  onReject,
  open,
  patchSet,
}: PatchReviewDialogProps) => {
  const { t } = useI18n();
  const patchCount = patchSet?.patches.length || 0;
  const attributedPatchCount = patchSet?.patches.filter((patch) => (patch.sources || []).length > 0).length || 0;
  const provenanceCoverage = patchCount === 0
    ? 100
    : Math.round((attributedPatchCount / patchCount) * 100);
  const sourceAttributionCount = patchSet?.patches.reduce((count, patch) => count + (patch.sources?.length || 0), 0) || 0;
  const confidenceLabelKey = patchSet ? getConfidenceLabelKey(patchSet) : "patchReview.confidenceUnknown";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t("patchReview.title")}</DialogTitle>
          <DialogDescription>{t("patchReview.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button onClick={onLoadPatchSet} type="button" variant="outline">
              {t("patchReview.load")}
            </Button>
            <Button disabled={!patchSet} onClick={onClear} type="button" variant="ghost">
              {t("patchReview.clear")}
            </Button>
          </div>
          <Button disabled={!patchSet || acceptedPatchCount === 0} onClick={onApply} type="button">
            {t("patchReview.applyAccepted", { count: acceptedPatchCount })}
          </Button>
        </div>

        {patchSet && (
          <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 md:grid-cols-4">
            <div className="rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                {t("patchReview.metricPatches")}
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">{patchCount}</div>
            </div>
            <div className="rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <Gauge className="h-3 w-3" />
                {t("patchReview.metricConfidence")}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{t(confidenceLabelKey)}</span>
                <Badge variant="outline">{t("patchReview.metricAccepted", { count: acceptedPatchCount })}</Badge>
              </div>
            </div>
            <div className="rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <Link2 className="h-3 w-3" />
                {t("patchReview.metricProvenance")}
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">{provenanceCoverage}%</div>
            </div>
            <div className="rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                {t("patchReview.metricSources")}
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">{sourceAttributionCount}</div>
            </div>
            <div className="md:col-span-4 rounded-md border border-border/60 bg-background px-3 py-2 text-[11px] text-muted-foreground">
              {provenanceCoverage < 100
                ? t("patchReview.provenanceHintMissing", { count: patchCount - attributedPatchCount })
                : t("patchReview.provenanceHintReady")}
            </div>
          </div>
        )}

        {patchSet ? (
          <PatchReviewPanel onAccept={onAccept} onEdit={onEdit} onReject={onReject} patchSet={patchSet} />
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
            {t("patchReview.empty")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PatchReviewDialog;
