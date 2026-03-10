import { ClipboardList, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/useI18n";

export const RELEASE_CHECKLIST_STORAGE_KEY = "docsy-release-checklist-v1";

export const CHECKLIST_ITEM_IDS = [
  "consistency_graph",
  "chain_context",
  "suggest_patch",
  "queue_created",
  "patch_review_reopen",
  "metrics_visible",
  "operations_gate",
  "retry_attempts",
  "queue_all_fifo",
  "tests_and_build",
] as const;

export type ChecklistItemId = typeof CHECKLIST_ITEM_IDS[number];

interface ReleaseChecklistPanelProps {
  checkedItemIds: ChecklistItemId[];
  onReset: () => void;
  onToggleItem: (itemId: ChecklistItemId) => void;
}

const ReleaseChecklistPanel = ({
  checkedItemIds,
  onReset,
  onToggleItem,
}: ReleaseChecklistPanelProps) => {
  const { t } = useI18n();
  const checkedSet = new Set(checkedItemIds);
  const completedCount = checkedItemIds.length;

  return (
    <section className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("knowledge.releaseChecklistTitle")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("knowledge.releaseChecklistDescription")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {t("knowledge.releaseChecklistProgress", {
              completed: completedCount,
              total: CHECKLIST_ITEM_IDS.length,
            })}
          </Badge>
          <Button
            className="h-7 text-xs"
            disabled={completedCount === 0}
            onClick={onReset}
            size="sm"
            type="button"
            variant="ghost"
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            {t("knowledge.releaseChecklistReset")}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {CHECKLIST_ITEM_IDS.map((itemId) => {
          const messageKey = `knowledge.releaseChecklistItems.${itemId}` as const;

          return (
            <label
              className="flex items-start gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-xs text-foreground"
              key={itemId}
            >
              <input
                aria-label={t(messageKey)}
                checked={checkedSet.has(itemId)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-border"
                onChange={() => onToggleItem(itemId)}
                type="checkbox"
              />
              <span className="leading-5">{t(messageKey)}</span>
            </label>
          );
        })}
      </div>

      <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <ClipboardList className="h-3.5 w-3.5" />
          {t("knowledge.releaseChecklistHintTitle")}
        </div>
        <p className="mt-1 leading-4">
          {t("knowledge.releaseChecklistHintDescription")}
        </p>
      </div>
    </section>
  );
};

export default ReleaseChecklistPanel;
