import { AlertTriangle, FileSearch, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/useI18n";
import type { FormatConsistencyIssue } from "@/lib/analysis/formatConsistency";

interface FormatConsistencyPanelProps {
  issues: FormatConsistencyIssue[];
  onGenerateToc?: () => void;
}

const issueLabelKey = (kind: FormatConsistencyIssue["kind"]) => {
  switch (kind) {
    case "duplicate_heading":
      return "formatConsistency.issueDuplicateHeading";
    case "heading_level_gap":
      return "formatConsistency.issueHeadingGap";
    case "json_yaml_divergence":
      return "formatConsistency.issueJsonYamlDivergence";
    case "loss_sensitive_content":
      return "formatConsistency.issueLossSensitive";
    case "missing_toc":
      return "formatConsistency.issueMissingToc";
    case "structured_parse_error":
    default:
      return "formatConsistency.issueStructuredParse";
  }
};

const FormatConsistencyPanel = ({
  issues,
  onGenerateToc,
}: FormatConsistencyPanelProps) => {
  const { t } = useI18n();

  return (
    <section className="space-y-3 rounded-lg border border-border/60 bg-background/70 p-3 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("formatConsistency.title")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("formatConsistency.description")}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-1 text-[11px] text-muted-foreground">
          <FileSearch className="h-3 w-3" />
          {issues.length}
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
          {t("formatConsistency.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue, index) => (
            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2" key={`${issue.kind}-${index}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  <AlertTriangle className={`h-3 w-3 ${issue.severity === "warning" ? "text-amber-500" : ""}`} />
                  {t(issueLabelKey(issue.kind))}
                </div>
                <Badge variant={issue.severity === "warning" ? "secondary" : "outline"}>
                  {issue.severity === "warning" ? t("formatConsistency.warning") : t("formatConsistency.info")}
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-foreground/90">{issue.message}</p>
              {issue.action === "generate_toc" && onGenerateToc && (
                <Button
                  className="mt-2 h-7 gap-1 text-xs"
                  onClick={onGenerateToc}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Sparkles className="h-3 w-3" />
                  {t("formatConsistency.generateToc")}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default FormatConsistencyPanel;
