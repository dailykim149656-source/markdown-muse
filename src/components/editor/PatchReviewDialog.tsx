import { AlertTriangle, Gauge, Link2, ShieldCheck, Sparkles } from "lucide-react";
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
  workspaceSyncWarnings?: string[];
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
  workspaceSyncWarnings = [],
}: PatchReviewDialogProps) => {
  const { t } = useI18n();
  const patchCount = patchSet?.patches.length || 0;
  const attributedPatchCount = patchSet?.patches.filter((patch) => (patch.sources || []).length > 0).length || 0;
  const provenanceCoverage = patchCount === 0
    ? 100
    : Math.round((attributedPatchCount / patchCount) * 100);
  const sourceAttributionCount = patchSet?.patches.reduce((count, patch) => count + (patch.sources?.length || 0), 0) || 0;
  const confidenceLabelKey = patchSet ? getConfidenceLabelKey(patchSet) : "patchReview.confidenceUnknown";
  const dialogRowsClass = patchSet
    ? "grid-rows-[auto_auto_auto_minmax(0,1fr)]"
    : "grid-rows-[auto_auto_minmax(0,1fr)]";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={`grid h-[min(100svh-1rem,56rem)] w-[min(100vw-1rem,80rem)] max-w-[80rem] ${dialogRowsClass} overflow-hidden p-4 sm:p-6`}
        data-testid="patch-review-dialog"
      >
        <DialogHeader className="pr-8">
          <DialogTitle>{t("patchReview.title")}</DialogTitle>
          <DialogDescription>{t("patchReview.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button className="h-auto min-h-10 whitespace-normal" onClick={onLoadPatchSet} type="button" variant="outline">
              {t("patchReview.load")}
            </Button>
            <Button className="h-auto min-h-10 whitespace-normal" disabled={!patchSet} onClick={onClear} type="button" variant="ghost">
              {t("patchReview.clear")}
            </Button>
          </div>
          <Button
            className="h-auto min-h-10 w-full whitespace-normal text-center sm:w-auto"
            disabled={!patchSet || acceptedPatchCount === 0}
            onClick={onApply}
            type="button"
          >
            {t("patchReview.applyAccepted", { count: acceptedPatchCount })}
          </Button>
        </div>

        {patchSet && (
          <div
            className="grid shrink-0 gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 sm:grid-cols-2 xl:grid-cols-4"
            data-testid="patch-review-metrics"
          >
            <div className="min-w-0 rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="flex min-w-0 items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <Sparkles className="h-3 w-3 shrink-0" />
                <span className="min-w-0 break-words leading-4">{t("patchReview.metricPatches")}</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">{patchCount}</div>
            </div>
            <div className="min-w-0 rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="flex min-w-0 items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <Gauge className="h-3 w-3 shrink-0" />
                <span className="min-w-0 break-words leading-4">{t("patchReview.metricConfidence")}</span>
              </div>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{t(confidenceLabelKey)}</span>
                <Badge className="max-w-full break-words" variant="outline">
                  {t("patchReview.metricAccepted", { count: acceptedPatchCount })}
                </Badge>
              </div>
            </div>
            <div className="min-w-0 rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="flex min-w-0 items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <Link2 className="h-3 w-3 shrink-0" />
                <span className="min-w-0 break-words leading-4">{t("patchReview.metricProvenance")}</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">{provenanceCoverage}%</div>
            </div>
            <div className="min-w-0 rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="flex min-w-0 items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 shrink-0" />
                <span className="min-w-0 break-words leading-4">{t("patchReview.metricSources")}</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">{sourceAttributionCount}</div>
            </div>
            <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-[11px] leading-5 text-muted-foreground sm:col-span-2 xl:col-span-4">
              {provenanceCoverage < 100
                ? t("patchReview.provenanceHintMissing", { count: patchCount - attributedPatchCount })
                : t("patchReview.provenanceHintReady")}
            </div>
            {workspaceSyncWarnings.length > 0 && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300 sm:col-span-2 xl:col-span-4">
                <div className="flex min-w-0 items-start gap-2 font-medium text-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  {t("patchReview.workspaceSyncWarningsTitle")}
                </div>
                <p className="mt-1 leading-5">
                  {t("patchReview.workspaceSyncWarningsDescription")}
                </p>
                <ul className="mt-2 space-y-1">
                  {workspaceSyncWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {patchSet ? (
          <div className="min-h-0 overflow-hidden" data-testid="patch-review-body">
            <PatchReviewPanel onAccept={onAccept} onEdit={onEdit} onReject={onReject} patchSet={patchSet} />
          </div>
        ) : (
          <div
            className="min-h-0 overflow-auto rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground"
            data-testid="patch-review-empty"
          >
            {t("patchReview.empty")}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PatchReviewDialog;
