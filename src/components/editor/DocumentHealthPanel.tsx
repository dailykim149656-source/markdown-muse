import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { KnowledgeHealthIssue } from "@/lib/knowledge/workspaceInsights";

interface DocumentHealthPanelProps {
  issues: KnowledgeHealthIssue[];
}

const ISSUE_LABELS: Record<KnowledgeHealthIssue["kind"], string> = {
  conflicting_procedure: "Conflict",
  duplicate_document: "Duplicate",
  image_missing_description: "Image",
  missing_section: "Missing section",
  outdated_source: "Outdated source",
  stale_index: "Stale index",
  unresolved_reference: "Reference",
};

const DocumentHealthPanel = ({ issues }: DocumentHealthPanelProps) => {
  return (
    <section className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Document Health
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Active document issues and downstream update signals.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
          {issues.length === 0 ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {issues.length}
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
          No active health issues detected.
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <div
              className={`rounded-md border px-3 py-2 ${
                issue.severity === "warning"
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-border/60 bg-muted/30"
              }`}
              key={issue.id}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {issue.severity === "warning" ? (
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  ) : (
                    <Info className="h-3 w-3" />
                  )}
                  {ISSUE_LABELS[issue.kind]}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {issue.relatedDocumentIds.length} doc{issue.relatedDocumentIds.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-foreground/90">{issue.message}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default DocumentHealthPanel;
