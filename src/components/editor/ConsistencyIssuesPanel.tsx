import { useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/useI18n";
import type { DocumentComparisonDelta } from "@/lib/ai/compareDocuments";
import type { KnowledgeConsistencyIssue } from "@/lib/knowledge/consistencyAnalysis";

interface ConsistencyIssuesPanelProps {
  issues: KnowledgeConsistencyIssue[];
  onOpenDocument: (documentId: string) => void;
  onSuggestUpdates: (documentId: string) => void;
  suggestableDocumentIds: string[];
}

const KIND_LABEL_KEYS: Record<KnowledgeConsistencyIssue["kind"], string> = {
  changed_section: "knowledge.consistencyKindChanged",
  conflicting_procedure: "knowledge.consistencyKindConflict",
  missing_section: "knowledge.consistencyKindMissing",
};

const DELTA_KIND_LABEL_KEYS: Record<DocumentComparisonDelta["kind"], string> = {
  added: "knowledge.consistencyDeltaAdded",
  changed: "knowledge.consistencyDeltaChanged",
  inconsistent: "knowledge.consistencyDeltaInconsistent",
  removed: "knowledge.consistencyDeltaRemoved",
};

const getDeltaTitle = (delta: DocumentComparisonDelta) =>
  delta.target?.title || delta.source?.title || "Untitled";

const ConsistencyIssuesPanel = ({
  issues,
  onOpenDocument,
  onSuggestUpdates,
  suggestableDocumentIds,
}: ConsistencyIssuesPanelProps) => {
  const { t } = useI18n();
  const suggestableSet = new Set(suggestableDocumentIds);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  return (
    <section className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("knowledge.consistencyTitle")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("knowledge.consistencyDescription")}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
          <GitCompare className="h-3 w-3" />
          {issues.length}
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
          {t("knowledge.consistencyEmpty")}
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => {
            const canSuggest = suggestableSet.has(issue.relatedDocumentId);
            const isExpanded = expandedIssueId === issue.id;
            const previewDeltas = issue.comparison.deltas.slice(0, 3);

            return (
              <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2" key={issue.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {issue.severity === "warning" ? (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    {t(KIND_LABEL_KEYS[issue.kind])}
                  </div>
                  <button
                    className="text-xs text-foreground transition-opacity hover:underline"
                    onClick={() => onOpenDocument(issue.relatedDocumentId)}
                    type="button"
                  >
                    {issue.relatedDocumentName}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-foreground/90">{issue.message}</p>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {t("knowledge.consistencyReference")} {issue.relatedDocumentName}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
                    {t("knowledge.consistencyRemoved", { count: issue.comparison.counts.removed })}
                  </span>
                  <span className="rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
                    {t("knowledge.consistencyInconsistent", { count: issue.comparison.counts.inconsistent })}
                  </span>
                  <span className="rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
                    {t("knowledge.consistencyChanged", {
                      count: issue.comparison.counts.changed + issue.comparison.counts.added,
                    })}
                  </span>
                  <Button
                    className="h-7 gap-1 text-xs"
                    onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {isExpanded ? t("knowledge.consistencyHide") : t("knowledge.consistencyInspect")}
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                  {canSuggest && (
                    <Button
                      className="ml-auto h-7 gap-1 text-xs"
                      onClick={() => onSuggestUpdates(issue.relatedDocumentId)}
                      size="sm"
                      variant="outline"
                    >
                      {t("knowledge.consistencySuggestPatch")}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {!canSuggest && (
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {t("knowledge.consistencySuggestionUnavailable")}
                  </div>
                )}
                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {t("knowledge.consistencyDeltaPreview")}
                      </div>
                      <button
                        className="text-[11px] text-foreground transition-opacity hover:underline"
                        onClick={() => onOpenDocument(issue.relatedDocumentId)}
                        type="button"
                      >
                        {t("knowledge.consistencyOpenDocument")}
                      </button>
                    </div>
                    {previewDeltas.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border/60 px-3 py-3 text-xs text-muted-foreground">
                        {t("knowledge.consistencyNoPreview")}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {previewDeltas.map((delta) => (
                          <div className="rounded-md border border-border/60 bg-background px-3 py-3" key={delta.deltaId}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-border/60 px-2 py-1 text-[10px] text-muted-foreground">
                                {t(DELTA_KIND_LABEL_KEYS[delta.kind])}
                              </span>
                              {delta.kind !== "added" && delta.kind !== "removed" && (
                                <span className="text-[10px] text-muted-foreground">
                                  {t("knowledge.consistencySimilarity", {
                                    score: delta.similarityScore.toFixed(2),
                                  })}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 text-xs font-medium text-foreground">
                              {getDeltaTitle(delta)}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {delta.summary}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {canSuggest && (
                      <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-[11px] text-muted-foreground">
                        {t("knowledge.consistencyPatchHint")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ConsistencyIssuesPanel;
