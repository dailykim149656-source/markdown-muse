import { AlertTriangle, Network, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/useI18n";
import type { KnowledgeHealthIssue, KnowledgeWorkspaceSummary } from "@/lib/knowledge/workspaceInsights";

interface KnowledgeInsightsPanelProps {
  issues: KnowledgeHealthIssue[];
  summary: KnowledgeWorkspaceSummary;
}

const KnowledgeInsightsPanel = ({
  issues,
  summary,
}: KnowledgeInsightsPanelProps) => {
  const { t } = useI18n();
  const visibleIssues = issues.slice(0, 4);

  return (
    <div className="space-y-3 group-data-[collapsible=icon]:hidden">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Network className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{t("knowledge.insightsTitle")}</span>
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">
          {t("knowledge.insightsDescription")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border border-border/60 px-2 py-1.5">
          <div className="text-[10px] text-muted-foreground">{t("knowledge.graphDocuments")}</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{summary.documentNodeCount}</div>
        </div>
        <div className="rounded-md border border-border/60 px-2 py-1.5">
          <div className="text-[10px] text-muted-foreground">{t("knowledge.graphSections")}</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{summary.sectionNodeCount}</div>
        </div>
        <div className="rounded-md border border-border/60 px-2 py-1.5">
          <div className="text-[10px] text-muted-foreground">{t("knowledge.graphLinks")}</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{summary.edgeCount}</div>
        </div>
      </div>

      <div className="rounded-md border border-dashed border-border px-2 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
            <ScanSearch className="h-3 w-3 text-muted-foreground" />
            {t("knowledge.healthTitle")}
          </div>
          <Badge className="h-5 rounded-full px-1.5 text-[10px]" variant={summary.issueCount > 0 ? "secondary" : "outline"}>
            {summary.issueCount}
          </Badge>
        </div>
        {visibleIssues.length === 0 ? (
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
            {t("knowledge.healthEmpty")}
          </p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {visibleIssues.map((issue) => (
              <div className="rounded-md border border-border/60 px-2 py-1.5" key={issue.id}>
                <div className="flex items-center gap-1 text-[10px] font-medium">
                  <AlertTriangle className={`h-3 w-3 ${issue.severity === "warning" ? "text-amber-600" : "text-muted-foreground"}`} />
                  <span className="text-foreground">
                    {issue.kind === "stale_index"
                      ? t("knowledge.issueStale")
                      : issue.kind === "unresolved_reference"
                        ? t("knowledge.issueReference")
                        : issue.kind === "duplicate_document"
                          ? t("knowledge.issueDuplicate")
                          : t("knowledge.issueImage")}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  {issue.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeInsightsPanel;
