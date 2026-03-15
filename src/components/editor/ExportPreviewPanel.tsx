import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Copy, Download, Eye, FileSearch, FileText, WrapText, X } from "lucide-react";
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
import { htmlTokenClassMap, tokenizeHtml, type HtmlTokenKind } from "@/components/editor/utils/htmlHighlight";
import { htmlToRst } from "@/components/editor/utils/htmlToRst";
import { htmlToTypst } from "@/components/editor/utils/htmlToTypst";
import { latexToTypst } from "@/components/editor/utils/latexToTypst";
import TexValidationPanel from "@/components/editor/TexValidationPanel";
import type { TexValidationPanelProps } from "@/components/editor/TexValidationPanel";
import { useI18n } from "@/i18n/useI18n";
import type { EditorMode } from "@/types/document";

export type PreviewFormat = "asciidoc" | "html" | "latex" | "markdown" | "rst" | "typst";

interface TexValidationInspectorProps extends TexValidationPanelProps {
  isExportingPdf: boolean;
  onAiFix?: () => void;
  onCompilePdf: () => void;
  onRunValidation: () => void;
}

interface ExportPreviewPanelProps {
  editorHtml: string;
  editorLatex: string;
  editorMarkdown: string;
  editorMode: EditorMode;
  fileName: string;
  onClose: () => void;
  rawContent: string;
  texValidationProps?: TexValidationInspectorProps;
}

type InspectorTab = "engine" | "preview" | "validation";

interface HighlightLineSegment {
  key: string;
  kind: HtmlTokenKind;
  text: string;
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

const splitHtmlTokensByLine = (source: string) => {
  const lines: HighlightLineSegment[][] = [[]];

  tokenizeHtml(source).forEach((token, tokenIndex) => {
    const parts = token.text.split("\n");

    parts.forEach((part, partIndex) => {
      if (part.length > 0) {
        lines[lines.length - 1].push({
          key: `${token.start}-${token.end}-${tokenIndex}-${partIndex}`,
          kind: token.kind,
          text: part,
        });
      }

      if (partIndex < parts.length - 1) {
        lines.push([]);
      }
    });
  });

  return lines;
};

const ExportPreviewPanel = ({
  editorHtml,
  editorLatex,
  editorMarkdown,
  editorMode,
  fileName,
  onClose,
  rawContent,
  texValidationProps,
}: ExportPreviewPanelProps) => {
  const { t } = useI18n();
  const [format, setFormat] = useState<PreviewFormat>(() => getDefaultFormat(editorMode));
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wrapLines, setWrapLines] = useState(false);
  const [activeTab, setActiveTab] = useState<InspectorTab>("preview");
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const validationAvailable = Boolean(texValidationProps?.validationEnabled);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!validationAvailable && (activeTab === "validation" || activeTab === "engine")) {
      setActiveTab("preview");
    }
  }, [activeTab, validationAvailable]);

  useEffect(() => {
    if (!highlightedLine || activeTab !== "preview" || format !== "latex") {
      return;
    }

    const lineNode = lineRefs.current[highlightedLine];
    if (typeof lineNode?.scrollIntoView === "function") {
      lineNode.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeTab, format, highlightedLine]);

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

  const htmlPreviewLines = useMemo(
    () => (format === "html" ? splitHtmlTokensByLine(content) : []),
    [content, format],
  );

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

  const handleJumpToLine = useCallback((line: number) => {
    setFormat("latex");
    setShowLineNumbers(true);
    setWrapLines(false);
    setHighlightedLine(line);
    setActiveTab("preview");
    texValidationProps?.onJumpToLine(line);
  }, [texValidationProps]);

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Button
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => setActiveTab("preview")}
            size="sm"
            type="button"
            variant={activeTab === "preview" ? "secondary" : "ghost"}
          >
            <Eye className="h-3.5 w-3.5" />
            {t("previewPanel.title")}
          </Button>
          {validationAvailable && (
            <Button
              className="h-7 gap-1 px-2 text-[11px]"
              onClick={() => setActiveTab("engine")}
              size="sm"
              type="button"
              variant={activeTab === "engine" ? "secondary" : "ghost"}
            >
              <FileText className="h-3.5 w-3.5" />
              {t("texValidation.previewTitle")}
            </Button>
          )}
          {validationAvailable && (
            <Button
              className="h-7 gap-1 px-2 text-[11px]"
              onClick={() => setActiveTab("validation")}
              size="sm"
              type="button"
              variant={activeTab === "validation" ? "secondary" : "ghost"}
            >
              <FileSearch className="h-3.5 w-3.5" />
              {t("texValidation.title")}
            </Button>
          )}
          {activeTab === "preview" && (
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
          )}
        </div>

        <div className="flex items-center gap-1">
          {texValidationProps?.canAiFix && texValidationProps.onAiFix && (
            <Button
              className="h-7 gap-1 px-2 text-[11px]"
              disabled={texValidationProps.isAiFixing}
              onClick={texValidationProps.onAiFix}
              size="sm"
              type="button"
              variant="outline"
            >
              <FileSearch className="h-3.5 w-3.5" />
              {texValidationProps.isAiFixing ? t("texValidation.aiFixing") : t("texValidation.aiFix")}
            </Button>
          )}
          {activeTab === "preview" ? (
            <>
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
            </>
          ) : texValidationProps ? (
            <>
              <Button
                className="h-7 gap-1 px-2 text-[11px]"
                disabled={!texValidationProps.validationEnabled || texValidationProps.status === "running"}
                onClick={texValidationProps.onRunValidation}
                size="sm"
                type="button"
                variant="ghost"
              >
                <FileText className="h-3.5 w-3.5" />
                {t("texValidation.run")}
              </Button>
              <Button
                className="h-7 gap-1 px-2 text-[11px]"
                disabled={!texValidationProps.validationEnabled || texValidationProps.isExportingPdf}
                onClick={texValidationProps.onCompilePdf}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Download className="h-3.5 w-3.5" />
                {t("texValidation.compilePdf")}
              </Button>
            </>
          ) : null}
          <Button className="h-7 px-2" onClick={onClose} size="sm" type="button" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {activeTab === "preview" ? (
        <ScrollArea className="h-full">
          <div className="p-4 font-mono text-xs leading-6 text-foreground">
            {(format === "html" ? htmlPreviewLines : content.split("\n")).map((line, index) => (
              <div
                key={`preview-line-${index}`}
                ref={(node) => {
                  lineRefs.current[index + 1] = node;
                }}
                className={`grid gap-3 border-b border-transparent ${wrapLines ? "grid-cols-[auto_minmax(0,1fr)] items-start" : "grid-cols-[auto_1fr] items-center"}`}
              >
                {showLineNumbers && (
                  <span className={`select-none py-0.5 text-right text-[10px] ${highlightedLine === index + 1 ? "text-primary" : "text-muted-foreground"}`}>
                    {index + 1}
                  </span>
                )}
                <span className={`${highlightedLine === index + 1 ? "rounded bg-primary/10 px-1" : ""} ${wrapLines ? "whitespace-pre-wrap break-words py-0.5" : "overflow-x-auto whitespace-pre py-0.5"}`}>
                  {format === "html"
                    ? ((line as HighlightLineSegment[]).length > 0
                      ? (line as HighlightLineSegment[]).map((segment) => (
                        <span
                          key={segment.key}
                          className={segment.kind === "plain" ? undefined : htmlTokenClassMap[segment.kind as Exclude<HtmlTokenKind, "plain">]}
                        >
                          {segment.text}
                        </span>
                      ))
                      : " ")
                    : ((line as string) || " ")}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : activeTab === "engine" && texValidationProps ? (
        <div className="h-full p-4">
          {texValidationProps.previewUrl ? (
            <object
              aria-label="XeLaTeX preview"
              className="h-full w-full rounded-xl border border-border bg-secondary/20"
              data={texValidationProps.previewUrl}
              type="application/pdf"
            >
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                {t("texValidation.previewUnavailable")}
              </div>
            </object>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
              {t("texValidation.previewPending")}
            </div>
          )}
        </div>
      ) : texValidationProps ? (
        <TexValidationPanel {...texValidationProps} onJumpToLine={handleJumpToLine} />
      ) : null}
    </div>
  );
};

export default ExportPreviewPanel;
