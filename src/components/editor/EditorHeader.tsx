import { Download, Upload, Moon, Sun, FileText, Printer, FileDown, ChevronDown, Maximize, Minimize, Keyboard, PanelLeft, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import docslyLogo from "@/assets/docsly-logo.png";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";

export type EditorMode = "markdown" | "latex" | "html" | "json" | "yaml";

interface EditorHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
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
  wordCount: number;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenShortcuts: () => void;
  previewOpen?: boolean;
  onTogglePreview?: () => void;
}

const EditorHeader = ({
  isDark,
  onToggleTheme,
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
  wordCount,
  mode,
  onModeChange,
  isFullscreen,
  onToggleFullscreen,
  onOpenShortcuts,
  previewOpen,
  onTogglePreview,
}: EditorHeaderProps) => {
  const modeExt = mode === "latex" ? ".tex" : mode === "html" ? ".html" : mode === "json" ? ".json" : mode === "yaml" ? ".yaml" : ".md";
  const { toggleSidebar } = useSidebar();

  return (
    <header className="flex items-center justify-between h-12 px-2 sm:px-4 border-b border-border bg-background gap-1">
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={toggleSidebar} title="파일 탐색기">
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Link to="/" className="hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
          <img src={docslyLogo} alt="Docsy" className="h-6 w-6" />
          <span className="text-sm font-bold text-foreground mr-1">Docsy</span>
        </Link>
        <span className="text-muted-foreground hidden sm:inline">|</span>
        <input
          value={fileName}
          onChange={(e) => onFileNameChange(e.target.value)}
          className="bg-transparent border-none outline-none text-sm font-medium text-foreground w-20 sm:w-36 min-w-0 focus:ring-0"
          placeholder="Untitled"
        />
        <span className="text-xs text-muted-foreground shrink-0">{modeExt}</span>

        {/* Mode tabs - dropdown on mobile, tabs on desktop */}
        <div className="hidden md:flex items-center ml-3 bg-secondary rounded-md p-0.5">
          {(["markdown", "latex", "html", "json", "yaml"] as EditorMode[]).map((m) => (
            <button
              key={m}
              className={`px-3 py-1 text-xs rounded-sm transition-colors ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => onModeChange(m)}
            >
              {m === "markdown" ? "Markdown" : m === "latex" ? "LaTeX" : m === "html" ? "HTML" : m === "json" ? "JSON" : "YAML"}
            </button>
          ))}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="md:hidden h-7 text-xs px-2 gap-1 shrink-0">
              {mode === "markdown" ? "MD" : mode === "latex" ? "TeX" : mode.toUpperCase()}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
            {(["markdown", "latex", "html", "json", "yaml"] as EditorMode[]).map((m) => (
              <DropdownMenuItem key={m} onClick={() => onModeChange(m)} className={`text-xs ${mode === m ? "bg-accent" : ""}`}>
                {m === "markdown" ? "Markdown" : m === "latex" ? "LaTeX" : m === "html" ? "HTML" : m === "json" ? "JSON" : "YAML"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <span className="text-xs text-muted-foreground mr-1 sm:mr-3 hidden sm:inline">
          {wordCount}자
        </span>
        <Button variant="ghost" size="sm" onClick={onLoad} title="불러오기" className="h-8 w-8 p-0">
          <Upload className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" title="저장하기" className="h-8 gap-1 px-2">
              <Download className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {mode === "markdown" && (
              <DropdownMenuItem onClick={onSaveMd} className="text-sm gap-2">
                <FileDown className="h-4 w-4" />
                마크다운 (.md)
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
                <DropdownMenuItem onClick={onSaveTex} className="text-sm gap-2">
                  <FileDown className="h-4 w-4" />
                  LaTeX (.tex)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveHtml} className="text-sm gap-2">
                  <FileDown className="h-4 w-4" />
                  HTML (.html)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveTypst} className="text-sm gap-2">
                  <FileDown className="h-4 w-4" />
                  Typst (.typ)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveAdoc} className="text-sm gap-2">
                  <FileDown className="h-4 w-4" />
                  AsciiDoc (.adoc)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveRst} className="text-sm gap-2">
                  <FileDown className="h-4 w-4" />
                  RST (.rst)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSavePdf} className="text-sm gap-2">
                  <FileText className="h-4 w-4" />
                  PDF로 저장
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onPrint} className="text-sm gap-2">
                  <Printer className="h-4 w-4" />
                  인쇄
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {mode !== "json" && mode !== "yaml" && onTogglePreview && (
          <Button variant={previewOpen ? "secondary" : "ghost"} size="sm" onClick={onTogglePreview} title="내보내기 미리보기" className="h-8 w-8 p-0">
            <Eye className="h-4 w-4" />
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={onOpenShortcuts} title="단축키 안내 (Ctrl+/)" className="h-8 w-8 p-0">
          <Keyboard className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={onToggleFullscreen} title="전체화면 (F11)" className="h-8 w-8 p-0">
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="sm" onClick={onToggleTheme} title="테마 전환" className="h-8 w-8 p-0">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
};

export default EditorHeader;
