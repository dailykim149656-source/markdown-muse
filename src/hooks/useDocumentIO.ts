import { useCallback, useRef, type ChangeEvent } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";
import type { CreateDocumentOptions, DocumentData, EditorMode } from "@/types/document";
import { asciidocToHtml } from "@/components/editor/utils/asciidocToHtml";
import { htmlToAsciidoc } from "@/components/editor/utils/htmlToAsciidoc";
import { htmlToRst } from "@/components/editor/utils/htmlToRst";
import { htmlToTypst } from "@/components/editor/utils/htmlToTypst";
import { latexToTypst } from "@/components/editor/utils/latexToTypst";
import { rstToHtml } from "@/components/editor/utils/rstToHtml";
import { GOOGLE_FONTS_URL, PRETENDARD_STYLESHEET_URL } from "@/components/editor/fonts";
import {
  buildDocumentDataFromDocsyFile,
  buildDocsyFileFromDocumentData,
  parseDocsyFile,
  serializeDocsyFile,
} from "@/lib/docsy/fileFormat";
import { isDocumentPatchSet } from "@/lib/patches/isDocumentPatchSet";
import type { DocumentPatchSet } from "@/types/documentPatch";

interface UseDocumentIOOptions {
  activeDoc: DocumentData;
  createDocument: (options?: CreateDocumentOptions) => void;
  onPatchSetLoad?: (patchSet: DocumentPatchSet) => void;
  renderableEditorHtml: string;
  renderableLatexDocument: string;
  renderableMarkdown: string;
}

const buildFontStylesheetLinks = () => `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${GOOGLE_FONTS_URL}" rel="stylesheet">
  <link rel="stylesheet" href="${PRETENDARD_STYLESHEET_URL}">
`;

export const buildExportHtml = (title: string, content: string, lang = "ko") => `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Docsy Editor">
  <title>${title}</title>
${buildFontStylesheetLinks()}
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Pretendard', 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 16px; line-height: 1.8; color: #1a1a2e; background: #fafafa;
      max-width: 800px; margin: 0 auto; padding: 3rem 2rem;
    }
    h1 { font-size: 2.25em; font-weight: 700; margin: 2rem 0 1rem; color: #0a0a0a; letter-spacing: -0.02em; }
    h2 { font-size: 1.625em; font-weight: 600; margin: 1.75rem 0 0.75rem; color: #1a1a1a; }
    h3 { font-size: 1.25em; font-weight: 600; margin: 1.5rem 0 0.5rem; color: #2a2a2a; }
    p { margin: 0.75em 0; }
    a { color: #2563eb; text-decoration: underline; text-underline-offset: 2px; }
    a:hover { color: #1d4ed8; }
    strong { font-weight: 600; }
    em { font-style: italic; }
    ul, ol { padding-left: 1.75em; margin: 0.75em 0; }
    li { margin: 0.25em 0; }
    blockquote {
      border-left: 4px solid #e5e7eb; padding: 0.5em 1em; margin: 1.25em 0;
      color: #6b7280; background: #f9fafb; border-radius: 0 8px 8px 0;
    }
    code {
      background: #f1f5f9; padding: 0.2em 0.45em; border-radius: 4px;
      font-size: 0.875em; font-family: 'Fira Code', 'JetBrains Mono', 'D2Coding', monospace;
      color: #e11d48;
    }
    pre {
      background: #1e293b; color: #e2e8f0; padding: 1.25rem; border-radius: 8px;
      overflow-x: auto; margin: 1.25em 0; font-size: 0.875em; line-height: 1.6;
      font-family: 'Fira Code', 'JetBrains Mono', 'D2Coding', monospace;
    }
    pre code { background: none; color: inherit; padding: 0; font-size: inherit; }
    table { border-collapse: collapse; width: 100%; margin: 1.25em 0; }
    th, td { border: 1px solid #e5e7eb; padding: 10px 14px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; color: #374151; }
    tr:nth-child(even) { background: #fafafa; }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.25em 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2em 0; }
    mark { background: #fef3c7; padding: 0.1em 0.25em; border-radius: 3px; }
    sub { font-size: 0.75em; }
    sup { font-size: 0.75em; }
    div[data-type="admonition"] {
      border-left: 4px solid #3b82f6; background: rgba(59,130,246,0.06);
      border-radius: 0 8px 8px 0; padding: 0.75em 1em; margin: 1.25em 0;
    }
    div[data-admonition-color="blue"] { border-left-color: #3b82f6; background: rgba(59,130,246,0.06); }
    div[data-admonition-color="green"] { border-left-color: #22c55e; background: rgba(34,197,94,0.06); }
    div[data-admonition-color="yellow"] { border-left-color: #eab308; background: rgba(234,179,8,0.06); }
    div[data-admonition-color="red"] { border-left-color: #ef4444; background: rgba(239,68,68,0.06); }
    div[data-admonition-color="purple"] { border-left-color: #a855f7; background: rgba(168,85,247,0.06); }
    div[data-admonition-color="orange"] { border-left-color: #f97316; background: rgba(249,115,22,0.06); }
    div[data-admonition-color="teal"] { border-left-color: #14b8a6; background: rgba(20,184,166,0.06); }
    div[data-admonition-color="gray"] { border-left-color: #6b7280; background: rgba(107,114,128,0.06); }
    span[data-type="footnote-ref"] { vertical-align: super; font-size: 0.75em; font-weight: 600; color: #2563eb; cursor: pointer; }
    div[data-type="footnote-item"] { border-top: 1px solid #e5e7eb; padding: 0.5em 0; font-size: 0.9em; color: #6b7280; }
    div[data-type="footnote-item"]:first-of-type { margin-top: 2em; }
    @media (max-width: 640px) {
      body { padding: 1.5rem 1rem; font-size: 15px; }
      h1 { font-size: 1.75em; }
    }
    @media print {
      body { background: white; padding: 0; }
      pre { background: #f5f5f5; color: #1a1a1a; }
    }
  </style>
</head>
<body>
${content}
</body>
</html>`;

export const buildPrintHtml = (title: string, content: string, lang = "ko") => `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${title}</title>
${buildFontStylesheetLinks()}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<style>@media print{body{margin:0;padding:40px;background:white!important;color:black!important}*{color-adjust:exact;-webkit-print-color-adjust:exact}}body{max-width:800px;margin:0 auto;padding:40px;font-family:'Pretendard','Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic','Inter',sans-serif;font-size:14px;line-height:1.7;color:#1a1a1a;background:white}h1{font-size:2em;font-weight:700;margin:1.5em 0 .5em}h2{font-size:1.5em;font-weight:600;margin:1.2em 0 .4em}h3{font-size:1.25em;font-weight:600;margin:1em 0 .3em}p{margin:.5em 0}ul,ol{padding-left:1.5em;margin:.5em 0}blockquote{border-left:3px solid #ddd;padding-left:1em;color:#666;margin:1em 0}code{background:#f5f5f5;padding:.15em .4em;border-radius:3px;font-size:.9em;font-family:'Fira Code','JetBrains Mono','D2Coding',monospace}pre{background:#f5f5f5;padding:1em;border-radius:6px;overflow-x:auto;font-family:'Fira Code','JetBrains Mono','D2Coding',monospace}pre code{background:none;padding:0;font-family:inherit}table{border-collapse:collapse;width:100%;margin:1em 0}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f9f9f9;font-weight:600}img{max-width:100%;height:auto;margin:1em 0}hr{border:none;border-top:1px solid #ddd;margin:1.5em 0}mark{background:#fff3bf;padding:.1em .2em;border-radius:2px}a{color:#1971c2}</style></head><body>${content}</body></html>`;

const waitForPrintWindowReady = async (windowRef: Window) => {
  if (windowRef.document.readyState !== "complete") {
    await new Promise<void>((resolve) => {
      windowRef.addEventListener("load", () => resolve(), { once: true });
    });
  }

  const fontSet = windowRef.document.fonts;

  if (fontSet) {
    try {
      await Promise.race([
        fontSet.ready,
        new Promise<void>((resolve) => window.setTimeout(resolve, 2000)),
      ]);
    } catch (error) {
      void error;
    }
  }

  await new Promise<void>((resolve) => window.setTimeout(resolve, 150));
};

export const useDocumentIO = ({
  activeDoc,
  createDocument,
  onPatchSetLoad,
  renderableEditorHtml,
  renderableLatexDocument,
  renderableMarkdown,
}: UseDocumentIOOptions) => {
  const { locale, t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadFile = useCallback((content: string, ext: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeDoc.name || "Untitled"}${ext}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [activeDoc.name]);

  const handleSaveMd = useCallback(() => {
    const markdownContent = activeDoc.mode === "markdown" ? activeDoc.content : renderableMarkdown;
    downloadFile(markdownContent, ".md", "text/markdown");
  }, [activeDoc.content, activeDoc.mode, downloadFile, renderableMarkdown]);

  const handleSaveDocsy = useCallback(() => {
    downloadFile(serializeDocsyFile(buildDocsyFileFromDocumentData(activeDoc)), ".docsy", "application/json");
    toast.success(t("toasts.savedDocsy"));
  }, [activeDoc, downloadFile, t]);

  const handleSaveTex = useCallback(() => {
    downloadFile(renderableLatexDocument, ".tex", "application/x-tex");
    toast.success(t("hooks.io.latexSaved"));
  }, [downloadFile, renderableLatexDocument, t]);

  const handleSaveJson = useCallback(() => {
    downloadFile(activeDoc.content, ".json", "application/json");
  }, [activeDoc.content, downloadFile]);

  const handleSaveYaml = useCallback(() => {
    downloadFile(activeDoc.content, ".yaml", "text/yaml");
  }, [activeDoc.content, downloadFile]);

  const handleSaveTypst = useCallback(() => {
    const typstContent = activeDoc.mode === "latex"
      ? latexToTypst(activeDoc.content)
      : htmlToTypst(renderableEditorHtml);

    downloadFile(typstContent, ".typ", "text/plain");
    toast.success(t("hooks.io.typstSaved"));
  }, [activeDoc.content, activeDoc.mode, downloadFile, renderableEditorHtml, t]);

  const handleSaveAdoc = useCallback(() => {
    downloadFile(htmlToAsciidoc(renderableEditorHtml), ".adoc", "text/plain");
    toast.success(t("hooks.io.adocSaved"));
  }, [downloadFile, renderableEditorHtml, t]);

  const handleSaveRst = useCallback(() => {
    downloadFile(htmlToRst(renderableEditorHtml), ".rst", "text/x-rst");
    toast.success(t("hooks.io.rstSaved"));
  }, [downloadFile, renderableEditorHtml, t]);

  const handleSaveHtml = useCallback(() => {
    downloadFile(buildExportHtml(activeDoc.name || "Untitled", renderableEditorHtml, locale), ".html", "text/html");
    toast.success(t("hooks.io.htmlSaved"));
  }, [activeDoc.name, downloadFile, locale, renderableEditorHtml, t]);

  const getEditorHtmlForPrint = useCallback(() => {
    if (activeDoc.mode === "json" || activeDoc.mode === "yaml") {
      return "";
    }

    return renderableEditorHtml;
  }, [activeDoc.mode, renderableEditorHtml]);

  const handleSavePdf = useCallback(() => {
    const printDocument = async () => {
      const content = getEditorHtmlForPrint();

      if (!content) {
        return;
      }

      const windowRef = window.open("", "_blank");

      if (!windowRef) {
        return;
      }

      windowRef.document.write(buildPrintHtml(activeDoc.name || "Untitled", content, locale));
      windowRef.document.close();
      await waitForPrintWindowReady(windowRef);
      windowRef.focus();
      windowRef.print();
    };

    void printDocument();
  }, [activeDoc.name, getEditorHtmlForPrint, locale]);

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      const content = loadEvent.target?.result as string;
      const lowerName = file.name.toLowerCase();
      const name = file.name.replace(/\.(docsy|md|markdown|txt|tex|html|htm|json|yaml|yml|adoc|asciidoc|rst)$/i, "");
      let mode: EditorMode = "markdown";
      let finalContent = content;

      if (lowerName.endsWith(".docsy")) {
        try {
          const parsed = parseDocsyFile(content);
          createDocument(buildDocumentDataFromDocsyFile(parsed));
          toast.success(t("hooks.io.loadedDocument", { name: parsed.document.name }));
        } catch (error) {
          const message = error instanceof Error ? error.message : t("toasts.docsyReadFailed");
          toast.error(message);
        }

        event.target.value = "";
        return;
      }

      if (lowerName.endsWith(".tex")) {
        mode = "latex";
      } else if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
        mode = "html";
      } else if (lowerName.endsWith(".json")) {
        try {
          const parsed = JSON.parse(content) as unknown;

          if (onPatchSetLoad && isDocumentPatchSet(parsed)) {
            onPatchSetLoad(parsed);
            event.target.value = "";
            return;
          }
        } catch (error) {
          void error;
        }

        mode = "json";
      } else if (lowerName.endsWith(".yaml") || lowerName.endsWith(".yml")) {
        mode = "yaml";
      } else if (lowerName.endsWith(".adoc") || lowerName.endsWith(".asciidoc")) {
        mode = "html";
        finalContent = asciidocToHtml(content);
        toast.info(t("hooks.io.adocConverted"));
      } else if (lowerName.endsWith(".rst")) {
        mode = "html";
        finalContent = rstToHtml(content);
        toast.info(t("hooks.io.rstConverted"));
      }

      createDocument({ content: finalContent, mode, name });
      toast.success(t("hooks.io.loadedDocument", { name }));
    };

    reader.readAsText(file);
    event.target.value = "";
  }, [createDocument, onPatchSetLoad, t]);

  return {
    fileInputRef,
    handleFileChange,
    handleLoad,
    handlePrint: handleSavePdf,
    handleSaveAdoc,
    handleSaveDocsy,
    handleSaveHtml,
    handleSaveJson,
    handleSaveMd,
    handleSavePdf,
    handleSaveRst,
    handleSaveTex,
    handleSaveTypst,
    handleSaveYaml,
  };
};
