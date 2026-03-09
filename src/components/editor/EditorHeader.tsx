import {
  ChevronDown,
  Download,
  Eye,
  FileDown,
  FileText,
  Keyboard,
  Languages,
  Maximize,
  Minimize,
  Moon,
  PanelLeft,
  Printer,
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
import { useI18n } from "@/i18n/useI18n";
import type { Locale } from "@/i18n/types";
import type { EditorMode } from "@/types/document";

interface EditorHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onSaveDocsy: () => void;
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
}

const LOCALES: Locale[] = ["ko", "en"];

const EditorHeader = ({
  isDark,
  onToggleTheme,
  onSaveDocsy,
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
}: EditorHeaderProps) => {
  const { locale, setLocale, t } = useI18n();
  const { toggleSidebar } = useSidebar();
  const modeExt = mode === "latex" ? ".tex" : mode === "html" ? ".html" : mode === "json" ? ".json" : mode === "yaml" ? ".yaml" : ".md";

  return (
    <header className="flex items-center justify-between h-12 px-2 sm:px-4 border-b border-border bg-background gap-1">
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={toggleSidebar}
          title={t("header.toggleSidebar")}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Link to="/" className="hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
          <img src={docslyLogo} alt={t("common.appName")} className="h-6 w-6" />
          <span className="text-sm font-bold text-foreground mr-1">{t("common.appName")}</span>
        </Link>
        <span className="text-muted-foreground hidden sm:inline">|</span>
        <input
          value={fileName}
          onChange={(event) => onFileNameChange(event.target.value)}
          className="bg-transparent border-none outline-none text-sm font-medium text-foreground w-20 sm:w-36 min-w-0 focus:ring-0"
          placeholder={t("common.untitled")}
        />
        <span className="text-xs text-muted-foreground shrink-0">{modeExt}</span>

        <div className="hidden lg:flex items-center ml-3 bg-secondary rounded-md p-0.5">
          {(["markdown", "latex", "html", "json", "yaml"] as EditorMode[]).map((editorMode) => (
            <button
              key={editorMode}
              className={`px-3 py-1 text-xs rounded-sm transition-colors ${mode === editorMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
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
            <Button variant="outline" size="sm" className="lg:hidden h-7 text-xs px-2 gap-1 shrink-0">
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

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCountMode}
                className="text-xs text-muted-foreground mr-1 sm:mr-3 hidden sm:inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
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
                <span className="text-muted-foreground mt-1">{t("header.stats.hint")}</span>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button variant="ghost" size="sm" onClick={onLoad} title={t("header.loadFile")} className="h-8 w-8 p-0">
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
            <DropdownMenuItem onClick={onSaveDocsy} className="text-sm gap-2">
              <FileDown className="h-4 w-4" />
              Docsy (.docsy)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {mode === "markdown" && (
              <DropdownMenuItem onClick={onSaveMd} className="text-sm gap-2">
                <FileDown className="h-4 w-4" />
                {t("header.downloads.markdown")}
              </DropdownMenuItem>
            )}
            {(mode === "json" || mode === "yaml") && (
              <>
                <DropdownMenuItem onClick={onSaveJson} className="text-sm gap-2">
                  <FileDown className="h-4 w-4" />
                  JSON (.json)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveYaml} className="text-sm gap-2">
                  <FileDown className="h-4 w-4" />
                  YAML (.yaml)
                </DropdownMenuItem>
              </>
            )}
            {mode !== "json" && mode !== "yaml" && (
              <>
                {mode !== "markdown" && (
                  <DropdownMenuItem onClick={onSaveMd} className="text-sm gap-2">
                    <FileDown className="h-4 w-4" />
                    {t("header.downloads.markdown")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onSaveTex} className="text-sm gap-2">
                  <FileDown className="h-4 w-4" />
                  {t("header.downloads.latex")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveHtml} className="text-sm gap-2">
                  <FileDown className="h-4 w-4" />
                  {t("header.downloads.html")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveTypst} className="text-sm gap-2">
                  <FileDown className="h-4 w-4" />
                  {t("header.downloads.typst")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveAdoc} className="text-sm gap-2">
                  <FileDown className="h-4 w-4" />
                  {t("header.downloads.asciidoc")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveRst} className="text-sm gap-2">
                  <FileDown className="h-4 w-4" />
                  {t("header.downloads.rst")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSavePdf} className="text-sm gap-2">
                  <FileText className="h-4 w-4" />
                  {t("header.downloads.pdf")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onPrint} className="text-sm gap-2">
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

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenShortcuts}
          title={t("header.shortcuts")}
          className="h-8 w-8 p-0 hidden sm:flex"
        >
          <Keyboard className="h-4 w-4" />
        </Button>

        {mode !== "json" && mode !== "yaml" && onOpenAiAssistant && (
          <Button variant="ghost" size="sm" onClick={onOpenAiAssistant} title={t("header.aiAssistant")} className="h-8 w-8 p-0">
            <Sparkles className="h-4 w-4" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" title={t("common.language.menu")} className="h-8 gap-1 px-2">
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
          onClick={onToggleFullscreen}
          title={t("header.fullscreen")}
          className="h-8 w-8 p-0 hidden sm:flex"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleTheme}
          title={isDark ? t("header.lightMode") : t("header.darkMode")}
          className="h-8 w-8 p-0"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {mode !== "json" && mode !== "yaml" && onOpenPatchReview && (
          <Button className="h-8 px-2 text-xs" onClick={onOpenPatchReview} size="sm" type="button" variant="ghost">
            {t("header.patchReview")}
            {patchCount > 0 ? ` (${patchCount})` : ""}
          </Button>
        )}
      </div>
    </header>
  );
};

export default EditorHeader;
