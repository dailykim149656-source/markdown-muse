import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { toast } from "sonner";
import type { DocumentData, EditorMode } from "@/types/document";
import { htmlToLatex, latexToHtml } from "@/components/editor/utils/htmlToLatex";
import { createMarkedInstance, createTurndownService } from "@/components/editor/utils/markdownRoundtrip";
import { getRenderableHtml } from "@/lib/ast/getRenderableHtml";
import { getRenderableLatex } from "@/lib/ast/getRenderableLatex";
import { getRenderableMarkdown } from "@/lib/ast/getRenderableMarkdown";
import {
  canSwitchModeWithinDocument,
} from "@/lib/editor/modeFamilies";
import { useI18n } from "@/i18n/useI18n";

interface UseFormatConversionOptions {
  activeEditor: TiptapEditor | null;
  activeDoc: DocumentData;
  activeDocId: string;
  bumpEditorKey: () => void;
  countWithSpaces: boolean;
  editorKey: number;
  updateActiveDoc: (patch: Partial<DocumentData>) => void;
}

export interface TextStats {
  charCount: number;
  lines: number;
  paragraphs: number;
  readingTimeMin: number;
  wordCount: number;
}

const getReadableText = (mode: EditorMode, content: string) => {
  if (mode === "latex") {
    return content
      .replace(/\\docsyfontfamily\{[^}]*\}\{/g, "")
      .replace(/\\docsyfontsize\{[^}]*\}\{[^}]*\}\{/g, "")
      .replace(/\\[a-zA-Z]+\{?[^}]*\}?/g, "")
      .replace(/[{}\\$%&]/g, "")
      .trim();
  }

  if (mode === "html") {
    const tmp = document.createElement("div");
    tmp.innerHTML = content;
    return (tmp.textContent || "").trim();
  }

  return content.replace(/[#*_~`()!|>-]/g, "").replaceAll("[", "").replaceAll("]", "").trim();
};

export const useFormatConversion = ({
  activeEditor,
  activeDoc,
  activeDocId,
  bumpEditorKey,
  countWithSpaces,
  editorKey,
  updateActiveDoc,
}: UseFormatConversionOptions) => {
  const { t } = useI18n();
  const turndownService = useMemo(() => createTurndownService(), []);
  const markedInstance = useMemo(() => createMarkedInstance(), []);
  const currentTiptapDocument = activeEditor?.getJSON() || activeDoc.tiptapJson || undefined;

  const getDocumentHtml = useCallback((mode: EditorMode, content: string) => {
    if (!content) {
      return "";
    }

    if (mode === "markdown") {
      return markedInstance.parse(content, { async: false }) as string;
    }

    if (mode === "latex") {
      return latexToHtml(content, { includeMetadata: false });
    }

    if (mode === "html") {
      return content;
    }

    return "";
  }, [markedInstance]);

  const [liveEditorHtml, setLiveEditorHtml] = useState<string>(() => getDocumentHtml(activeDoc.mode, activeDoc.content));

  const currentEditorHtml = useMemo(
    () => liveEditorHtml
      || activeDoc.sourceSnapshots?.html
      || getDocumentHtml(activeDoc.mode, activeDoc.content),
    [activeDoc.content, activeDoc.mode, activeDoc.sourceSnapshots, getDocumentHtml, liveEditorHtml]
  );
  const currentRenderableHtml = useMemo(
    () => getRenderableHtml(currentTiptapDocument, currentEditorHtml),
    [currentEditorHtml, currentTiptapDocument]
  );
  const currentRenderableMarkdown = useMemo(() => {
    if (activeDoc.mode === "markdown") {
      return activeDoc.content;
    }

    return getRenderableMarkdown(
      currentTiptapDocument,
      activeDoc.sourceSnapshots?.markdown || turndownService.turndown(currentRenderableHtml),
    );
  }, [activeDoc.content, activeDoc.mode, activeDoc.sourceSnapshots, currentRenderableHtml, currentTiptapDocument, turndownService]);
  const currentRenderableLatex = useMemo(() => getRenderableLatex(
    currentTiptapDocument,
    activeDoc.sourceSnapshots?.latex || htmlToLatex(currentRenderableHtml, false),
    { includeMetadata: false, includeWrapper: false },
  ), [activeDoc.sourceSnapshots, currentRenderableHtml, currentTiptapDocument]);
  const currentRenderableLatexDocument = useMemo(() => getRenderableLatex(
    currentTiptapDocument,
    htmlToLatex(currentRenderableHtml, true, {
      includeMetadata: false,
    }),
    { includeWrapper: true, title: activeDoc.name || "Untitled", includeMetadata: false },
  ), [activeDoc.name, currentEditorHtml, currentRenderableHtml, currentTiptapDocument]);

  useEffect(() => {
    setLiveEditorHtml(getDocumentHtml(activeDoc.mode, activeDoc.content));
  }, [activeDoc.content, activeDocId, activeDoc.mode, editorKey, getDocumentHtml]);

  const handleModeChange = useCallback((newMode: EditorMode) => {
    const oldMode = activeDoc.mode;

    if (oldMode === newMode) {
      return;
    }

    if (!canSwitchModeWithinDocument(oldMode, newMode)) {
      toast.info(t("toasts.modeFamilySwitchBlocked"));
      return;
    }

    if (oldMode === "json" || oldMode === "yaml") {
      updateActiveDoc({ mode: newMode });
      bumpEditorKey();
      toast.success(t("toasts.modeSwitched", {
        from: oldMode.toUpperCase(),
        to: newMode.toUpperCase(),
      }));
      return;
    }

    let convertedContent = "";

    try {
      if (newMode === "markdown") {
        convertedContent = currentRenderableMarkdown;
      } else if (newMode === "latex") {
        convertedContent = currentRenderableLatex;
      } else if (newMode === "html") {
        convertedContent = currentRenderableHtml;
      }
    } catch (error) {
      console.error("Mode conversion error:", error);
      convertedContent = activeDoc.content;
    }

    updateActiveDoc({ mode: newMode, content: convertedContent });
    bumpEditorKey();
    toast.success(t("toasts.modeConverted", {
      from: oldMode.toUpperCase(),
      to: newMode.toUpperCase(),
    }));
  }, [activeDoc.content, activeDoc.mode, bumpEditorKey, currentRenderableHtml, currentRenderableLatex, currentRenderableMarkdown, t, updateActiveDoc]);

  const textStats = useMemo<TextStats>(() => {
    const text = getReadableText(activeDoc.mode, activeDoc.content);
    const charCount = countWithSpaces ? text.length : text.replace(/\s/g, "").length;
    const wordCount = text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length;
    const lines = activeDoc.content.length === 0 ? 0 : activeDoc.content.split("\n").length;
    const paragraphs = activeDoc.content.length === 0 ? 0 : activeDoc.content.split(/\n\s*\n/).filter((paragraph) => paragraph.trim().length > 0).length;
    const charsNoSpace = text.replace(/\s/g, "").length;
    const readingTimeMin = charsNoSpace === 0 ? 0 : Math.max(1, Math.ceil(charsNoSpace / 500));

    return {
      charCount,
      lines,
      paragraphs,
      readingTimeMin,
      wordCount,
    };
  }, [activeDoc.content, activeDoc.mode, countWithSpaces]);

  return {
    currentEditorHtml,
    currentRenderableHtml,
    currentRenderableLatex,
    currentRenderableLatexDocument,
    currentRenderableMarkdown,
    handleModeChange,
    setLiveEditorHtml,
    textStats,
  };
};
