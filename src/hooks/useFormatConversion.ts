import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { DocumentData } from "@/components/editor/useAutoSave";
import type { EditorMode } from "@/components/editor/EditorHeader";
import { htmlToLatex, latexToHtml } from "@/components/editor/utils/htmlToLatex";
import { createMarkedInstance, createTurndownService } from "@/components/editor/utils/markdownRoundtrip";

interface UseFormatConversionOptions {
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
    return content.replace(/\\[a-zA-Z]+\{?[^}]*\}?/g, "").replace(/[{}\\$%&]/g, "").trim();
  }

  if (mode === "html") {
    const tmp = document.createElement("div");
    tmp.innerHTML = content;
    return (tmp.textContent || "").trim();
  }

  return content.replace(/[#*_~`()!|>-]/g, "").replaceAll("[", "").replaceAll("]", "").trim();
};

export const useFormatConversion = ({
  activeDoc,
  activeDocId,
  bumpEditorKey,
  countWithSpaces,
  editorKey,
  updateActiveDoc,
}: UseFormatConversionOptions) => {
  const turndownService = useMemo(() => createTurndownService(), []);
  const markedInstance = useMemo(() => createMarkedInstance(), []);

  const getDocumentHtml = useCallback((mode: EditorMode, content: string) => {
    if (!content) {
      return "";
    }

    if (mode === "markdown") {
      return markedInstance.parse(content, { async: false }) as string;
    }

    if (mode === "latex") {
      return latexToHtml(content);
    }

    if (mode === "html") {
      return content;
    }

    return "";
  }, [markedInstance]);

  const [liveEditorHtml, setLiveEditorHtml] = useState<string>(() => getDocumentHtml(activeDoc.mode, activeDoc.content));

  const currentEditorHtml = useMemo(
    () => liveEditorHtml || getDocumentHtml(activeDoc.mode, activeDoc.content),
    [activeDoc.content, activeDoc.mode, getDocumentHtml, liveEditorHtml]
  );

  useEffect(() => {
    setLiveEditorHtml(getDocumentHtml(activeDoc.mode, activeDoc.content));
  }, [activeDoc.content, activeDocId, activeDoc.mode, editorKey, getDocumentHtml]);

  const handleModeChange = useCallback((newMode: EditorMode) => {
    const oldMode = activeDoc.mode;

    if (oldMode === newMode) {
      return;
    }

    if (oldMode === "json" || oldMode === "yaml" || newMode === "json" || newMode === "yaml") {
      updateActiveDoc({ mode: newMode });
      bumpEditorKey();
      return;
    }

    let convertedContent = "";

    try {
      if (newMode === "markdown") {
        convertedContent = turndownService.turndown(currentEditorHtml);
      } else if (newMode === "latex") {
        convertedContent = htmlToLatex(currentEditorHtml, false);
      } else if (newMode === "html") {
        convertedContent = currentEditorHtml;
      }
    } catch (error) {
      console.error("Mode conversion error:", error);
      convertedContent = activeDoc.content;
    }

    updateActiveDoc({ mode: newMode, content: convertedContent });
    bumpEditorKey();
    toast.success(`${oldMode.toUpperCase()} -> ${newMode.toUpperCase()} converted.`);
  }, [activeDoc.content, activeDoc.mode, bumpEditorKey, currentEditorHtml, turndownService, updateActiveDoc]);

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
    handleModeChange,
    setLiveEditorHtml,
    textStats,
  };
};
