import { Download, Upload, Moon, Sun, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onSave: () => void;
  onLoad: () => void;
  fileName: string;
  onFileNameChange: (name: string) => void;
  wordCount: number;
}

const EditorHeader = ({
  isDark,
  onToggleTheme,
  onSave,
  onLoad,
  fileName,
  onFileNameChange,
  wordCount,
}: EditorHeaderProps) => {
  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-background">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <input
          value={fileName}
          onChange={(e) => onFileNameChange(e.target.value)}
          className="bg-transparent border-none outline-none text-sm font-medium text-foreground w-48 focus:ring-0"
          placeholder="Untitled"
        />
        <span className="text-xs text-muted-foreground">.md</span>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-3">
          {wordCount}자
        </span>
        <Button variant="ghost" size="sm" onClick={onLoad} title="불러오기" className="h-8 w-8 p-0">
          <Upload className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onSave} title="저장하기" className="h-8 w-8 p-0">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onToggleTheme} title="테마 전환" className="h-8 w-8 p-0">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
};

export default EditorHeader;
