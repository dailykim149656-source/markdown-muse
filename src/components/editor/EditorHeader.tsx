import {
  ChevronDown,
  Copy,
  Download,
  Ellipsis,
  Eye,
  FileDown,
  FileText,
  Keyboard,
  Languages,
  Link2,
  Maximize,
  Minimize,
  Moon,
  PanelLeft,
  Printer,
  QrCode,
  Sparkles,
  Sun,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import docslyLogo from "@/assets/docsly-logo.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DocumentImportState } from "@/hooks/useDocumentIO";
import { useI18n } from "@/i18n/useI18n";
import type { Locale } from "@/i18n/types";
import type { AutoSaveIndicatorState, EditorMode } from "@/types/document";

interface EditorHeaderProps {
  autoSaveState: AutoSaveIndicatorState;
  isDark: boolean;
  importState: DocumentImportState;
  onToggleTheme: () => void;
  onSaveDocsy: () => void;
  onOpenShare: () => void;
  onCopyMd: () => void;
  onCopyHtml: () => void;
  onCopyJson: () => void;
  onCopyYaml: () => void;
  onCopyShareLink: () => void;
  onSaveMd: () => void;
  onSaveTex: () => void;
  onSaveHtml: () => void;
  onSaveJson: () => void;
  onSaveYaml: () => void;
  onSaveTypst: () => void;
  onSaveAdoc: () => void;
  onSaveRst: () => void;
  onSavePdf: () => void;
  onPrint: () => void;
  onLoad: () => void;
  fileName: string;
  onFileNameChange: (name: string) => void;
  textStats: { charCount: number; wordCount: number; lines: number; paragraphs: number; readingTimeMin: number };
  countWithSpaces?: boolean;
  onToggleCountMode?: () => void;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenPatchReview?: () => void;
  onOpenAiAssistant?: () => void;
  onOpenShortcuts: () => void;
  patchCount?: number;
  previewOpen?: boolean;
  onTogglePreview?: () => void;
  loadFileTitle?: string;
}

const LOCALES: Locale[] = ["ko", "en"];

const EditorHeader = ({
  autoSaveState,
  isDark,
  importState,
  onToggleTheme,
  onSaveDocsy,
  onOpenShare,
  onCopyMd,
  onCopyHtml,
  onCopyJson,
  onCopyYaml,
  onCopyShareLink,
  onSaveMd,
  onSaveTex,
  onSaveHtml,
  onSaveJson,
  onSaveYaml,
  onSaveTypst,
  onSaveAdoc,
  onSaveRst,
  onSavePdf,
  onPrint,
  onLoad,
  fileName,
  onFileNameChange,
  textStats,
  countWithSpaces = true,
  onToggleCountMode,
  mode,
  onModeChange,
  isFullscreen,
  onToggleFullscreen,
  onOpenPatchReview,
  onOpenAiAssistant,
  onOpenShortcuts,
  patchCount = 0,
  previewOpen,
  onTogglePreview,
  loadFileTitle,
}: EditorHeaderProps) => {
  const { locale, setLocale, t } = useI18n();
  const { toggleSidebar } = useSidebar();
  const modeExt = mode === "latex" ? ".tex" : mode === "html" ? ".html" : mode === "json" ? ".json" : mode === "yaml" ? ".yaml" : ".md";
  const lastSavedLabel = autoSaveState.lastSavedAt
    ? new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(autoSaveState.lastSavedAt))
    : null;
  const autoSaveTone = autoSaveState.status === "error"
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : autoSaveState.status === "saving"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  const autoSaveLabel = autoSaveState.status === "error"
    ? t("header.autosave.failed")
    : autoSaveState.status === "saving"
      ? t("header.autosave.saving")
      : t("header.autosave.saved");
  const importTone = importState.status === "error"
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-primary/30 bg-primary/10 text-primary";
  const importLabel = importState.status === "reading"
    ? t("header.import.reading", { name: importState.fileName || t("common.untitled") })
    : t("header.import.failed");
  const showMobileStatusRow = importState.status !== "idle" || autoSaveState.status !== "saved";

  return (
    <header className="border-b border-border bg-background">
      <div className="flex min-h-12 items-center justify-between gap-2 px-2 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={toggleSidebar}
            title={t("header.toggleSidebar")}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <Link to="/" className="hidden shrink-0 items-center gap-2 transition-opacity hover:opacity-80 sm:flex">
            <img src={docslyLogo} alt={t("common.appName")} className="h-6 w-6" />
            <span className="mr-1 text-sm font-bold text-foreground">{t("common.appName")}</span>
          </Link>
          <img src={docslyLogo} alt={t("common.appName")} className="h-5 w-5 shrink-0 sm:hidden" />
          <span className="hidden text-muted-foreground sm:inline">|</span>
          <input
            value={fileName}
            onChange={(event) => onFileNameChange(event.target.value)}
            className="min-w-0 flex-1 w-full max-w-[11rem] border-none bg-transparent text-sm font-medium text-foreground outline-none focus:ring-0 sm:max-w-[14rem] lg:max-w-[18rem]"
            placeholder={t("common.untitled")}
          />
          <span className="shrink-0 text-xs text-muted-foreground">{modeExt}</span>

          <div className="ml-2 hidden items-center gap-2 md:flex">
            <div
              className={`rounded-full border px-2 py-1 text-[10px] font-medium ${autoSaveTone}`}
              title={autoSaveState.status === "error"
                ? autoSaveState.error || t("header.autosave.failed")
                : lastSavedLabel
                  ? t("header.autosave.lastSaved", { value: lastSavedLabel })
                  : autoSaveLabel}
            >
              {autoSaveLabel}
            </div>
            {importState.status !== "idle" && (
              <div
                className={`max-w-[220px] truncate rounded-full border px-2 py-1 text-[10px] font-medium ${importTone}`}
                title={importState.error || importLabel}
              >
                {importState.status === "reading"
                  ? `${importLabel}${typeof importState.progress === "number" ? ` · ${t("header.import.progress", { progress: importState.progress })}` : ""}`
                  : importLabel}
              </div>
            )}
          </div>

          <div className="ml-3 hidden items-center rounded-md bg-secondary p-0.5 lg:flex">
            {(["markdown", "latex", "html", "json", "yaml"] as EditorMode[]).map((editorMode) => (
              <button
                key={editorMode}
                className={`rounded-sm px-3 py-1 text-xs transition-colors ${mode === editorMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => onModeChange(editorMode)}
                type="button"
              >
                {editorMode === "markdown"
                  ? "Markdown"
                  : editorMode === "latex"
                    ? "LaTeX"
                    : editorMode === "html"
                      ? "HTML"
                      : editorMode === "json"
                        ? "JSON"
                        : "YAML"}
              </button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs lg:hidden">
                {mode === "markdown" ? "MD" : mode === "latex" ? "TeX" : mode.toUpperCase()}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              {(["markdown", "latex", "html", "json", "yaml"] as EditorMode[]).map((editorMode) => (
                <DropdownMenuItem
                  key={editorMode}
                  onClick={() => onModeChange(editorMode)}
                  className={`text-xs ${mode === editorMode ? "bg-accent" : ""}`}
                >
                  {editorMode === "markdown"
                    ? "Markdown"
                    : editorMode === "latex"
                      ? "LaTeX"
                      : editorMode === "html"
                        ? "HTML"
                        : editorMode === "json"
                          ? "JSON"
                          : "YAML"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleCountMode}
                  className="mr-1 hidden items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
                  title={t("header.stats.hint")}
                  type="button"
                >
                  <span>{textStats.charCount}{t("header.stats.chars")}</span>
                  <span className="text-muted-foreground/60">/</span>
                  <span>{textStats.wordCount}{t("header.stats.words")}</span>
                  <span className="text-muted-foreground/60">/</span>
                  <span>{textStats.lines}{t("header.stats.lines")}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="flex flex-col gap-0.5">
                  <span>
                    {t("header.stats.charCount", { count: textStats.charCount })}
                    {countWithSpaces
                      ? ` (${t("header.stats.withSpaces")})`
                      : ` (${t("header.stats.withoutSpaces")})`}
                  </span>
                  <span>{t("header.stats.wordCount", { count: textStats.wordCount })}</span>
                  <span>{t("header.stats.lineCount", { count: textStats.lines })}</span>
                  <span>{t("header.stats.paragraphCount", { count: textStats.paragraphs })}</span>
                  <span>{t("header.stats.readingTimeValue", { minutes: textStats.readingTimeMin })}</span>
                  <span className="mt-1 text-muted-foreground">{t("header.stats.hint")}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="sm"
            disabled={importState.status === "reading"}
            onClick={onLoad}
            title={loadFileTitle || t("header.loadFile")}
            className="h-8 w-8 p-0"
          >
            <Upload className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" title={t("header.export")} className="h-8 gap-1 px-2">
                <Download className="h-4 w-4" />
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onSaveDocsy} className="gap-2 text-sm">
                <FileDown className="h-4 w-4" />
                Docsy (.docsy)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenShare} className="gap-2 text-sm">
                <QrCode className="h-4 w-4" />
                {t("header.clipboard.share")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopyShareLink} className="gap-2 text-sm">
                <Link2 className="h-4 w-4" />
                {t("header.clipboard.shareLink")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {(mode === "markdown" || mode === "latex" || mode === "html") && (
                <>
                  <DropdownMenuItem onClick={onCopyMd} className="gap-2 text-sm">
                    <Copy className="h-4 w-4" />
                    {t("header.clipboard.markdown")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCopyHtml} className="gap-2 text-sm">
                    <Copy className="h-4 w-4" />
                    {t("header.clipboard.html")}
                  </DropdownMenuItem>
                </>
              )}
              {(mode === "json" || mode === "yaml") && (
                <>
                  <DropdownMenuItem onClick={onCopyJson} className="gap-2 text-sm">
                    <Copy className="h-4 w-4" />
                    {t("header.clipboard.json")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCopyYaml} className="gap-2 text-sm">
                    <Copy className="h-4 w-4" />
                    {t("header.clipboard.yaml")}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              {mode === "markdown" && (
                <DropdownMenuItem onClick={onSaveMd} className="gap-2 text-sm">
                  <FileDown className="h-4 w-4" />
                  {t("header.downloads.markdown")}
                </DropdownMenuItem>
              )}
              {(mode === "json" || mode === "yaml") && (
                <>
                  <DropdownMenuItem onClick={onSaveJson} className="gap-2 text-sm">
                    <FileDown className="h-4 w-4" />
                    JSON (.json)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSaveYaml} className="gap-2 text-sm">
                    <FileDown className="h-4 w-4" />
                    YAML (.yaml)
                  </DropdownMenuItem>
                </>
              )}
              {mode !== "json" && mode !== "yaml" && (
                <>
                  {mode !== "markdown" && (
                    <DropdownMenuItem onClick={onSaveMd} className="gap-2 text-sm">
                      <FileDown className="h-4 w-4" />
                      {t("header.downloads.markdown")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onSaveTex} className="gap-2 text-sm">
                    <FileDown className="h-4 w-4" />
                    {t("header.downloads.latex")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSaveHtml} className="gap-2 text-sm">
                    <FileDown className="h-4 w-4" />
                    {t("header.downloads.html")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSaveTypst} className="gap-2 text-sm">
                    <FileDown className="h-4 w-4" />
                    {t("header.downloads.typst")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSaveAdoc} className="gap-2 text-sm">
                    <FileDown className="h-4 w-4" />
                    {t("header.downloads.asciidoc")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSaveRst} className="gap-2 text-sm">
                    <FileDown className="h-4 w-4" />
                    {t("header.downloads.rst")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSavePdf} className="gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    {t("header.downloads.pdf")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onPrint} className="gap-2 text-sm">
                    <Printer className="h-4 w-4" />
                    {t("header.downloads.print")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {mode !== "json" && mode !== "yaml" && onTogglePreview && (
            <Button
              variant={previewOpen ? "secondary" : "ghost"}
              size="sm"
              onClick={onTogglePreview}
              title={t("header.preview")}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}

          {mode !== "json" && mode !== "yaml" && onOpenAiAssistant && (
            <Button variant="ghost" size="sm" onClick={onOpenAiAssistant} title={t("header.aiAssistant")} className="h-8 w-8 p-0">
              <Sparkles className="h-4 w-4" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" title={t("common.language.menu")} className="hidden h-8 gap-1 px-2 sm:inline-flex">
                <Languages className="h-4 w-4" />
                <span className="text-[10px] font-semibold uppercase">{locale}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              {LOCALES.map((nextLocale) => (
                <DropdownMenuItem
                  key={nextLocale}
                  className={locale === nextLocale ? "bg-accent" : ""}
                  onClick={() => setLocale(nextLocale)}
                >
                  {t(`common.language.${nextLocale}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenShortcuts}
            title={t("header.shortcuts")}
            className="hidden h-8 w-8 p-0 sm:flex"
          >
            <Keyboard className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            title={t("header.fullscreen")}
            className="hidden h-8 w-8 p-0 sm:flex"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTheme}
            title={isDark ? t("header.lightMode") : t("header.darkMode")}
            className="hidden h-8 w-8 p-0 sm:flex"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {onOpenPatchReview && (
            <Button className="hidden h-8 px-2 text-xs sm:inline-flex" onClick={onOpenPatchReview} size="sm" type="button" variant="ghost">
              {t("header.patchReview")}
              {patchCount > 0 ? ` (${patchCount})` : ""}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 sm:hidden" title={t("common.language.menu")}>
                <Ellipsis className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {onOpenPatchReview && (
                <DropdownMenuItem onClick={onOpenPatchReview}>
                  {t("header.patchReview")}
                  {patchCount > 0 ? ` (${patchCount})` : ""}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onOpenShortcuts}>{t("header.shortcuts")}</DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleFullscreen}>{t("header.fullscreen")}</DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleTheme}>
                {isDark ? t("header.lightMode") : t("header.darkMode")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {LOCALES.map((nextLocale) => (
                <DropdownMenuItem
                  key={nextLocale}
                  className={locale === nextLocale ? "bg-accent" : ""}
                  onClick={() => setLocale(nextLocale)}
                >
                  {t(`common.language.${nextLocale}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showMobileStatusRow && (
        <div className="flex items-center gap-2 overflow-x-auto px-2 pb-2 md:hidden">
          <div
            className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium ${autoSaveTone}`}
            title={autoSaveState.status === "error"
              ? autoSaveState.error || t("header.autosave.failed")
              : lastSavedLabel
                ? t("header.autosave.lastSaved", { value: lastSavedLabel })
                : autoSaveLabel}
          >
            {autoSaveLabel}
          </div>
          {importState.status !== "idle" && (
            <div
              className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium ${importTone}`}
              title={importState.error || importLabel}
            >
              {importState.status === "reading"
                ? `${importLabel}${typeof importState.progress === "number" ? ` · ${t("header.import.progress", { progress: importState.progress })}` : ""}`
                : importLabel}
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default EditorHeader;
