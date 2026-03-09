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
