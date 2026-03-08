import { useState, useMemo, useCallback } from "react";
import { Copy, Download, X, Eye, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { htmlToLatex } from "./utils/htmlToLatex";
import { htmlToTypst } from "./utils/htmlToTypst";
import { htmlToAsciidoc } from "./utils/htmlToAsciidoc";
import { htmlToRst } from "./utils/htmlToRst";
import { latexToTypst } from "./utils/latexToTypst";
import type { EditorMode } from "./EditorHeader";

export type PreviewFormat = "latex" | "html" | "typst" | "asciidoc" | "rst" | "markdown";

interface ExportPreviewPanelProps {
  editorHtml: string;
  editorMode: EditorMode;
  rawContent: string;
  onClose: () => void;
  fileName: string;
}

const FORMAT_LABELS: Record<PreviewFormat, string> = {
  latex: "LaTeX",
  html: "HTML",
  typst: "Typst",
  asciidoc: "AsciiDoc",
  rst: "RST",
  markdown: "Markdown",
};

const FORMAT_EXT: Record<PreviewFormat, string> = {
  latex: ".tex",
  html: ".html",
  typst: ".typ",
  asciidoc: ".adoc",
  rst: ".rst",
  markdown: ".md",
};

const getAvailableFormats = (mode: EditorMode): PreviewFormat[] => {
  if (mode === "json" || mode === "yaml") return [];
  // Don't show current mode's own format
  const all: PreviewFormat[] = ["latex", "html", "typst", "asciidoc", "rst"];
  if (mode === "markdown") return all;
  return all.filter(f => f !== mode);
};

const ExportPreviewPanel = ({ editorHtml, editorMode, rawContent, onClose, fileName }: ExportPreviewPanelProps) => {
  const available = useMemo(() => getAvailableFormats(editorMode), [editorMode]);
  const [format, setFormat] = useState<PreviewFormat>(() => available[0] || "latex");

  const converted = useMemo(() => {
    try {
      if (editorMode === "latex" && format === "typst") {
        return latexToTypst(rawContent);
      }
      const html = editorHtml;
      switch (format) {
        case "latex": return htmlToLatex(html, true);
        case "typst": return htmlToTypst(html);
        case "asciidoc": return htmlToAsciidoc(html);
        case "rst": return htmlToRst(html);
        case "html": return html;
        default: return html;
      }
    } catch {
      return "변환 중 오류가 발생했습니다.";
    }
  }, [editorHtml, rawContent, editorMode, format]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(converted);
    toast.success("클립보드에 복사되었습니다");
  }, [converted]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([converted], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName || "Untitled"}${FORMAT_EXT[format]}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${FORMAT_LABELS[format]} 파일로 내보냈습니다`);
  }, [converted, fileName, format]);

  if (!available.length) return null;

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="h-8 flex items-center justify-between px-3 bg-secondary/50 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">미리보기</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 gap-1 px-1.5 text-xs font-semibold text-foreground">
                {FORMAT_LABELS[format]}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              {available.map(f => (
                <DropdownMenuItem
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`text-xs ${f === format ? "bg-accent" : ""}`}
                >
                  {FORMAT_LABELS[f]} ({FORMAT_EXT[f]})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy} title="복사">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleDownload} title="다운로드">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose} title="닫기">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {/* Content */}
      <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap break-words select-all">
        {converted}
      </pre>
    </div>
  );
};

export default ExportPreviewPanel;
