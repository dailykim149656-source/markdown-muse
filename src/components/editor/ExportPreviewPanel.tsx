import { useCallback, useMemo, useState } from "react";
import { ChevronDown, Copy, Download, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { htmlToAsciidoc } from "@/components/editor/utils/htmlToAsciidoc";
import { htmlToRst } from "@/components/editor/utils/htmlToRst";
import { htmlToTypst } from "@/components/editor/utils/htmlToTypst";
import { latexToTypst } from "@/components/editor/utils/latexToTypst";
import type { EditorMode } from "@/types/document";

export type PreviewFormat = "asciidoc" | "html" | "latex" | "markdown" | "rst" | "typst";

interface ExportPreviewPanelProps {
  editorHtml: string;
  editorLatex: string;
  editorMarkdown: string;
  editorMode: EditorMode;
  fileName: string;
  onClose: () => void;
  rawContent: string;
}

const FORMAT_LABELS: Record<PreviewFormat, string> = {
  asciidoc: "AsciiDoc",
  html: "HTML",
  latex: "LaTeX",
  markdown: "Markdown",
  rst: "RST",
  typst: "Typst",
};

const FORMAT_EXTENSIONS: Record<PreviewFormat, string> = {
  asciidoc: ".adoc",
  html: ".html",
  latex: ".tex",
  markdown: ".md",
  rst: ".rst",
  typst: ".typ",
};

const getDefaultFormat = (mode: EditorMode): PreviewFormat => {
  if (mode === "markdown") {
    return "latex";
  }

  if (mode === "latex") {
    return "markdown";
  }

  return "markdown";
};

const ExportPreviewPanel = ({
  editorHtml,
  editorLatex,
  editorMarkdown,
  editorMode,
  fileName,
  onClose,
  rawContent,
}: ExportPreviewPanelProps) => {
  const [format, setFormat] = useState<PreviewFormat>(() => getDefaultFormat(editorMode));

  const content = useMemo(() => {
    switch (format) {
      case "html":
        return editorHtml;
      case "latex":
        return editorLatex;
      case "markdown":
        return editorMarkdown;
      case "typst":
        return editorMode === "latex" ? latexToTypst(rawContent) : htmlToTypst(editorHtml);
      case "asciidoc":
        return htmlToAsciidoc(editorHtml);
      case "rst":
        return htmlToRst(editorHtml);
      default:
        return editorMarkdown;
    }
  }, [editorHtml, editorLatex, editorMarkdown, editorMode, format, rawContent]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    toast.success("미리보기 내용을 복사했습니다.");
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fileName || "Untitled"}${FORMAT_EXTENSIONS[format]}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [content, fileName, format]);

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">내보내기 미리보기</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-7 gap-1 px-2" size="sm" type="button" variant="ghost">
                {FORMAT_LABELS[format]}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(Object.keys(FORMAT_LABELS) as PreviewFormat[]).map((option) => (
                <DropdownMenuItem key={option} onClick={() => setFormat(option)}>
                  {FORMAT_LABELS[option]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1">
          <Button className="h-7 px-2" onClick={() => void handleCopy()} size="sm" type="button" variant="ghost">
            <Copy className="h-4 w-4" />
          </Button>
          <Button className="h-7 px-2" onClick={handleDownload} size="sm" type="button" variant="ghost">
            <Download className="h-4 w-4" />
          </Button>
          <Button className="h-7 px-2" onClick={onClose} size="sm" type="button" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-full">
        <pre className="whitespace-pre-wrap break-words p-4 text-xs leading-6 text-foreground">
          {content}
        </pre>
      </ScrollArea>
    </div>
  );
};

export default ExportPreviewPanel;
