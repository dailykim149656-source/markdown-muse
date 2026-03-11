import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import type { KnowledgeHealthIssue } from "@/lib/knowledge/workspaceInsights";

interface DocumentHealthPanelProps {
  issues: KnowledgeHealthIssue[];
}

const issueLabelKey = (kind: KnowledgeHealthIssue["kind"]) => {
  switch (kind) {
    case "conflicting_procedure":
      return "knowledge.issueConflictingProcedure";
    case "duplicate_document":
      return "knowledge.issueDuplicate";
    case "image_missing_description":
      return "knowledge.issueImage";
    case "missing_section":
      return "knowledge.issueMissingSection";
    case "outdated_source":
      return "knowledge.issueOutdatedSource";
    case "stale_index":
      return "knowledge.issueStale";
    case "unresolved_reference":
    default:
      return "knowledge.issueReference";
  }
};

const issueCauseKey = (kind: KnowledgeHealthIssue["kind"]) => {
  switch (kind) {
    case "conflicting_procedure":
      return "knowledge.healthCauseConflict";
    case "duplicate_document":
      return "knowledge.healthCauseDuplicate";
    case "image_missing_description":
      return "knowledge.healthCauseImage";
    case "missing_section":
      return "knowledge.healthCauseMissing";
    case "outdated_source":
      return "knowledge.healthCauseOutdated";
    case "stale_index":
      return "knowledge.healthCauseStale";
    case "unresolved_reference":
    default:
      return "knowledge.healthCauseReference";
  }
};

const issueNextStepKey = (kind: KnowledgeHealthIssue["kind"]) => {
  switch (kind) {
    case "conflicting_procedure":
      return "knowledge.healthNextConflict";
    case "duplicate_document":
      return "knowledge.healthNextDuplicate";
    case "image_missing_description":
      return "knowledge.healthNextImage";
    case "missing_section":
      return "knowledge.healthNextMissing";
    case "outdated_source":
      return "knowledge.healthNextOutdated";
    case "stale_index":
      return "knowledge.healthNextStale";
    case "unresolved_reference":
    default:
      return "knowledge.healthNextReference";
  }
};

const HEALTH_CARD_STYLE: Record<KnowledgeHealthIssue["kind"], string> = {
  conflicting_procedure: "border-destructive/35 bg-destructive/5",
  duplicate_document: "border-amber-500/35 bg-amber-500/5",
  image_missing_description: "border-border/60 bg-muted/30",
  missing_section: "border-amber-500/40 bg-amber-500/5",
  outdated_source: "border-amber-500/35 bg-amber-500/5",
  stale_index: "border-amber-500/35 bg-amber-500/5",
  unresolved_reference: "border-amber-500/35 bg-amber-500/5",
};

const HEALTH_PILL_STYLE: Record<KnowledgeHealthIssue["kind"], string> = {
  conflicting_procedure: "border-destructive/30 bg-destructive/10 text-destructive",
  duplicate_document: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  image_missing_description: "border-border/60 bg-background text-muted-foreground",
  missing_section: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  outdated_source: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  stale_index: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  unresolved_reference: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const DocumentHealthPanel = ({ issues }: DocumentHealthPanelProps) => {
  const { t } = useI18n();

  return (
    <section className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("knowledge.healthPanelTitle")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("knowledge.healthPanelDescription")}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
          {issues.length === 0 ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {issues.length}
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
          {t("knowledge.healthEmptyActive")}
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => {
            const relatedCount = new Set(issue.relatedDocumentIds.filter((documentId) => documentId !== issue.documentId)).size;

            return (
              <div
                className={`rounded-md border px-3 py-2 ${HEALTH_CARD_STYLE[issue.kind]}`}
                key={issue.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {issue.severity === "warning" ? (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    ) : (
                      <Info className="h-3 w-3" />
                    )}
                    {t(issueLabelKey(issue.kind))}
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${HEALTH_PILL_STYLE[issue.kind]}`}>
                      {issue.kind === "conflicting_procedure"
                        ? "Conflict"
                        : issue.kind === "missing_section"
                          ? "Gap"
                          : issue.severity === "warning"
                            ? "Watch"
                            : "Info"}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {relatedCount > 0
                      ? t("knowledge.healthRelatedDocs", { count: relatedCount })
                      : t("knowledge.healthLocalOnly")}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-foreground/90">{issue.message}</p>
                <div className="mt-2 rounded-md border border-border/60 bg-background px-2 py-2 text-[11px] text-muted-foreground">
                  <div className="font-medium text-foreground">{t(issueCauseKey(issue.kind))}</div>
                  <p className="mt-1 leading-4">
                    {relatedCount > 0
                      ? t("knowledge.healthImpactRelated", { count: relatedCount })
                      : t("knowledge.healthImpactLocal")}
                  </p>
                  <p className="mt-2 leading-4">{t(issueNextStepKey(issue.kind))}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default DocumentHealthPanel;
