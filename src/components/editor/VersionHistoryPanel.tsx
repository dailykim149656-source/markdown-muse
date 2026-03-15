import { useState } from "react";
import { Eye, History, LoaderCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/useI18n";
import type { DocumentVersionSnapshot } from "@/types/document";

interface VersionHistoryPanelProps {
  isReady: boolean;
  isRestoring: boolean;
  isSyncing: boolean;
  onRestore: (snapshotId: string) => void;
  snapshots: DocumentVersionSnapshot[];
}

const buildPreviewText = (snapshot: DocumentVersionSnapshot) =>
  snapshot.document.content
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

const VersionHistoryPanel = ({
  isReady,
  isRestoring,
  isSyncing,
  onRestore,
  snapshots,
}: VersionHistoryPanelProps) => {
  const { locale, t } = useI18n();
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(null);

  const formatTimestamp = (timestamp: number) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(timestamp));

  const renderTriggerLabel = (snapshot: DocumentVersionSnapshot) => {
    if (snapshot.trigger === "export") {
      return t("versionHistory.triggerExport");
    }

    if (snapshot.trigger === "patch_apply") {
      return t("versionHistory.triggerPatchApply");
    }

    return t("versionHistory.triggerAutosave");
  };

  const renderSnapshotSummary = (snapshot: DocumentVersionSnapshot) => {
    if (snapshot.trigger === "autosave" && snapshot.metadata?.summary?.trim()) {
      return snapshot.metadata.summary;
    }

    if (snapshot.trigger === "export") {
      return t("versionHistory.summaryExport", {
        format: snapshot.metadata?.exportFormat || snapshot.mode.toUpperCase(),
      });
    }

    if (snapshot.trigger === "patch_apply") {
      return t("versionHistory.summaryPatchApply", {
        count: snapshot.metadata?.patchCount || 0,
      });
    }

    return t("versionHistory.summaryAutosave");
  };

  return (
    <section className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("versionHistory.title")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("versionHistory.description")}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
          <History className="h-3 w-3" />
          {snapshots.length}
        </div>
      </div>

      {!isReady ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          {t("versionHistory.loading")}
        </div>
      ) : snapshots.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
          {t("versionHistory.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {snapshots.map((snapshot) => {
            const previewText = buildPreviewText(snapshot);
            const isExpanded = expandedSnapshotId === snapshot.snapshotId;

            return (
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2" key={snapshot.snapshotId}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="outline">
                        {renderTriggerLabel(snapshot)}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatTimestamp(snapshot.createdAt)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-medium text-foreground">
                      {renderSnapshotSummary(snapshot)}
                    </div>
                    {snapshot.metadata?.patchSetTitle && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {snapshot.metadata.patchSetTitle}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      className="h-6 px-2 text-[10px]"
                      onClick={() => setExpandedSnapshotId(isExpanded ? null : snapshot.snapshotId)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      {t("versionHistory.preview")}
                    </Button>
                    <Button
                      className="h-6 px-2 text-[10px]"
                      disabled={isRestoring}
                      onClick={() => onRestore(snapshot.snapshotId)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      {t("versionHistory.restore")}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 rounded-md border border-border/60 bg-background px-3 py-3">
                    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                      <span>{t("versionHistory.mode", { mode: snapshot.mode.toUpperCase() })}</span>
                      <span>{t("versionHistory.previewChars", { count: snapshot.document.content.length })}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-foreground/90">
                      {previewText || t("versionHistory.previewEmpty")}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isSyncing && (
        <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant="secondary">
          {t("versionHistory.syncing")}
        </Badge>
      )}
    </section>
  );
};

export default VersionHistoryPanel;
