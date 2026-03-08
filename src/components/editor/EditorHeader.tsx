import { Download, Upload, Moon, Sun, FileText, Printer, FileDown, ChevronDown } from "lucide-react";
import docslyLogo from "@/assets/docsly-logo.png";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export type EditorMode = "markdown" | "latex";

interface EditorHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onSaveMd: () => void;
  onSaveTex: () => void;
  onSavePdf: () => void;
  onPrint: () => void;
  onLoad: () => void;
  fileName: string;
  onFileNameChange: (name: string) => void;
  wordCount: number;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

const EditorHeader = ({
  isDark,
  onToggleTheme,
  onSaveMd,
  onSaveTex,
  onSavePdf,
  onPrint,
  onLoad,
  fileName,
  onFileNameChange,
  wordCount,
  mode,
  onModeChange,
}: EditorHeaderProps) => {
  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-background">
      <div className="flex items-center gap-2">
        <img src={docslyLogo} alt="Docsy" className="h-6 w-6" />
        <span className="text-sm font-bold text-foreground mr-1">Docsy</span>
        <span className="text-muted-foreground">|</span>
        <input
          value={fileName}
          onChange={(e) => onFileNameChange(e.target.value)}
          className="bg-transparent border-none outline-none text-sm font-medium text-foreground w-36 focus:ring-0"
          placeholder="Untitled"
        />
        <span className="text-xs text-muted-foreground">{mode === "latex" ? ".tex" : ".md"}</span>

        {/* Mode tabs */}
        <div className="flex items-center ml-3 bg-secondary rounded-md p-0.5">
          <button
            className={`px-3 py-1 text-xs rounded-sm transition-colors ${mode === "markdown" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => onModeChange("markdown")}
          >
            Markdown
          </button>
          <button
            className={`px-3 py-1 text-xs rounded-sm transition-colors ${mode === "latex" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => onModeChange("latex")}
          >
            LaTeX
          </button>
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

        <Button variant="ghost" size="sm" onClick={onToggleTheme} title="테마 전환" className="h-8 w-8 p-0">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
};

export default EditorHeader;
