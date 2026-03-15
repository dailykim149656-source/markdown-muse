import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/i18n/useI18n";
import type { TexDiagnostic, TexHealthResponse, TexSourceType } from "@/types/tex";

export interface TexValidationPanelProps {
  canAiFix?: boolean;
  compileMs: number | null;
  diagnostics: TexDiagnostic[];
  health: TexHealthResponse | null;
  isAiFixing?: boolean;
  lastValidatedAt: number | null;
  latexSource: string;
  logSummary: string;
  onAiFix?: () => void;
  onJumpToLine: (line: number) => void;
  previewUrl?: string | null;
  sourceType: TexSourceType;
  status: "disabled" | "error" | "idle" | "running" | "success";
  validationEnabled: boolean;
}

const formatTimestamp = (timestamp: number | null, locale: string) => {
  if (!timestamp) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
};

const getSourceTypeLabel = (sourceType: TexSourceType) => (
  sourceType === "raw-latex" ? "Raw LaTeX" : "Generated LaTeX"
);

const buildLineExcerpt = (latexSource: string, lineNumber?: number) => {
  if (!lineNumber) {
    return "";
  }

  const lines = latexSource.split("\n");
  const index = lineNumber - 1;
  if (index < 0 || index >= lines.length) {
    return "";
  }

  return lines[index] || "";
};

const getStatusTone = (status: TexValidationPanelProps["status"]) => {
  switch (status) {
    case "success":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "error":
      return "border-destructive/25 bg-destructive/10 text-destructive";
    case "running":
      return "border-primary/25 bg-primary/10 text-primary";
    case "disabled":
      return "border-border bg-secondary/40 text-muted-foreground";
    default:
      return "border-border bg-secondary/40 text-muted-foreground";
  }
};

const TexValidationPanel = ({
  canAiFix = false,
  compileMs,
  diagnostics,
  health,
  isAiFixing = false,
  lastValidatedAt,
  latexSource,
  logSummary,
  onAiFix,
  onJumpToLine,
  sourceType,
  status,
  validationEnabled,
}: TexValidationPanelProps) => {
  const { locale, t } = useI18n();
  const lastValidatedLabel = formatTimestamp(lastValidatedAt, locale);
  const unavailable = validationEnabled && health && !health.ok;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <div className={`rounded-xl border px-3 py-3 ${getStatusTone(status)}`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {status === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {t(`texValidation.status.${status}`)}
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div>{t("texValidation.engine")}: XeLaTeX</div>
            <div>{t("texValidation.sourceType")}: {getSourceTypeLabel(sourceType)}</div>
            {typeof compileMs === "number" && <div>{t("texValidation.compileMs", { value: compileMs })}</div>}
            {lastValidatedLabel && <div>{t("texValidation.lastValidated", { value: lastValidatedLabel })}</div>}
            {unavailable && <div>{t("texValidation.unavailable")}</div>}
          </div>
          {canAiFix && onAiFix && (
            <div className="mt-3">
              <button
                className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isAiFixing}
                onClick={onAiFix}
                type="button"
              >
                {isAiFixing ? t("texValidation.aiFixing") : t("texValidation.aiFix")}
              </button>
            </div>
          )}
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t("texValidation.diagnostics")}
            </h3>
            <span className="text-xs text-muted-foreground">{diagnostics.length}</span>
          </div>
          {diagnostics.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 px-3 py-3 text-sm text-muted-foreground">
              {t("texValidation.noDiagnostics")}
            </div>
          ) : (
            <div className="space-y-2">
              {diagnostics.map((diagnostic, index) => {
                const lineExcerpt = buildLineExcerpt(latexSource, diagnostic.line);
                return (
                  <button
                    key={`${diagnostic.stage}-${diagnostic.line || index}-${diagnostic.message}`}
                    className="w-full rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                    disabled={!diagnostic.line}
                    onClick={() => diagnostic.line && onJumpToLine(diagnostic.line)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-foreground">{diagnostic.message}</div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {diagnostic.severity} · {diagnostic.stage}
                          {diagnostic.line ? ` · L${diagnostic.line}` : ""}
                          {diagnostic.column ? `:${diagnostic.column}` : ""}
                        </div>
                      </div>
                    </div>
                    {lineExcerpt ? (
                      <pre className="mt-2 overflow-x-auto rounded-md bg-secondary/60 px-2 py-2 text-[11px] leading-5 text-foreground">
                        {lineExcerpt}
                      </pre>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("texValidation.logSummary")}
          </h3>
          <pre className="overflow-x-auto rounded-xl border border-border bg-secondary/40 px-3 py-3 text-xs leading-5 text-foreground">
            {logSummary || t("texValidation.noLog")}
          </pre>
        </section>
      </div>
    </ScrollArea>
  );
};

export default TexValidationPanel;
