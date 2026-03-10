import { useCallback, useMemo, useState } from "react";
import { ChevronDown, Copy, Download, Eye, WrapText, X } from "lucide-react";
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
import { useI18n } from "@/i18n/useI18n";
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
  const { t } = useI18n();
  const [format, setFormat] = useState<PreviewFormat>(() => getDefaultFormat(editorMode));
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wrapLines, setWrapLines] = useState(false);

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
    toast.success(t("previewPanel.copied"));
  }, [content, t]);

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
          <span className="text-sm font-medium">{t("previewPanel.title")}</span>
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
          <Button
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => setShowLineNumbers((value) => !value)}
            size="sm"
            type="button"
            variant={showLineNumbers ? "secondary" : "ghost"}
          >
            # {t("previewPanel.lines")}
          </Button>
          <Button
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => setWrapLines((value) => !value)}
            size="sm"
            type="button"
            variant={wrapLines ? "secondary" : "ghost"}
          >
            <WrapText className="h-3.5 w-3.5" />
            {t("previewPanel.wrap")}
          </Button>
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
        <div className="p-4 font-mono text-xs leading-6 text-foreground">
          {content.split("\n").map((line, index) => (
            <div
              key={`preview-line-${index}`}
              className={`grid gap-3 border-b border-transparent ${wrapLines ? "grid-cols-[auto_minmax(0,1fr)] items-start" : "grid-cols-[auto_1fr] items-center"}`}
            >
              {showLineNumbers && (
                <span className="select-none py-0.5 text-right text-[10px] text-muted-foreground">
                  {index + 1}
                </span>
              )}
              <span className={`${wrapLines ? "whitespace-pre-wrap break-words py-0.5" : "overflow-x-auto whitespace-pre py-0.5"}`}>
                {line || " "}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ExportPreviewPanel;
