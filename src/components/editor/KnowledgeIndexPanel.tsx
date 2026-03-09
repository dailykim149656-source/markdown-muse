import { AlertTriangle, Database, Images, RefreshCcw, RotateCcw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/useI18n";

interface KnowledgeIndexPanelProps {
  freshCount: number;
  imageCount: number;
  isSyncing: boolean;
  lastIndexedAt: number | null;
  onRebuild: () => void;
  onReindexActive: () => void;
  onReset: () => void;
  staleCount: number;
}

const KnowledgeIndexPanel = ({
  freshCount,
  imageCount,
  isSyncing,
  lastIndexedAt,
  onRebuild,
  onReindexActive,
  onReset,
  staleCount,
}: KnowledgeIndexPanelProps) => {
  const { t } = useI18n();
  const lastIndexedLabel = lastIndexedAt
    ? new Intl.DateTimeFormat(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(lastIndexedAt))
    : t("knowledge.neverIndexed");

  return (
    <div className="space-y-3 group-data-[collapsible=icon]:hidden">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{t("knowledge.indexTitle")}</span>
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">
          {t("knowledge.indexDescription")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border border-border/60 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            {t("knowledge.fresh")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{freshCount}</div>
        </div>
        <div className="rounded-md border border-border/60 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <AlertTriangle className="h-3 w-3" />
            {t("knowledge.stale")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{staleCount}</div>
        </div>
        <div className="rounded-md border border-border/60 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Images className="h-3 w-3" />
            {t("knowledge.images")}
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">{imageCount}</div>
        </div>
      </div>

      <div className="rounded-md border border-dashed border-border px-2 py-2 text-[11px] leading-4 text-muted-foreground">
        {t("knowledge.lastIndexed", { value: lastIndexedLabel })}
      </div>

      {staleCount > 0 && (
        <div className="rounded-md border border-amber-300/60 bg-amber-50 px-2 py-2 text-[11px] leading-4 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
          {t("knowledge.staleWarning", { count: staleCount })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Button
          className="h-7 gap-1 text-[11px]"
          disabled={isSyncing}
          onClick={onReindexActive}
          size="sm"
          variant="outline"
        >
          <RefreshCcw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
          {t("knowledge.reindexActive")}
        </Button>
        <Button
          className="h-7 gap-1 text-[11px]"
          disabled={isSyncing}
          onClick={onRebuild}
          size="sm"
          variant="outline"
        >
          <RotateCcw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
          {t("knowledge.rebuild")}
        </Button>
        <Button
          className="h-7 gap-1 text-[11px]"
          disabled={isSyncing}
          onClick={onReset}
          size="sm"
          variant="ghost"
        >
          {t("knowledge.reset")}
        </Button>
      </div>

      {isSyncing && (
        <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="secondary">
          {t("knowledge.syncingShort")}
        </Badge>
      )}
    </div>
  );
};

export default KnowledgeIndexPanel;
