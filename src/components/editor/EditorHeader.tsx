import { Download, Upload, Moon, Sun, FileText, Printer, FileDown, ChevronDown, Maximize, Minimize, Keyboard, PanelLeft } from "lucide-react";
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
}

const EditorHeader = ({
  isDark,
  onToggleTheme,
  onSaveMd,
  onSaveTex,
  onSaveHtml,
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
}: EditorHeaderProps) => {
  const modeExt = mode === "latex" ? ".tex" : mode === "html" ? ".html" : mode === "json" ? ".json" : mode === "yaml" ? ".yaml" : ".md";
  const { toggleSidebar } = useSidebar();

  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-background">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleSidebar} title="파일 탐색기">
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src={docslyLogo} alt="Docsy" className="h-6 w-6" />
          <span className="text-sm font-bold text-foreground mr-1">Docsy</span>
        </Link>
        <span className="text-muted-foreground">|</span>
        <input
          value={fileName}
          onChange={(e) => onFileNameChange(e.target.value)}
          className="bg-transparent border-none outline-none text-sm font-medium text-foreground w-36 focus:ring-0"
          placeholder="Untitled"
        />
        <span className="text-xs text-muted-foreground">{modeExt}</span>

        {/* Mode tabs */}
        <div className="flex items-center ml-3 bg-secondary rounded-md p-0.5">
          {(["markdown", "latex", "html"] as EditorMode[]).map((m) => (
            <button
              key={m}
              className={`px-3 py-1 text-xs rounded-sm transition-colors ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => onModeChange(m)}
            >
              {m === "markdown" ? "Markdown" : m === "latex" ? "LaTeX" : "HTML"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-3">
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
            <DropdownMenuItem onClick={onSaveTex} className="text-sm gap-2">
              <FileDown className="h-4 w-4" />
              LaTeX (.tex)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSaveHtml} className="text-sm gap-2">
              <FileDown className="h-4 w-4" />
              HTML (.html)
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
          </DropdownMenuContent>
        </DropdownMenu>

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
