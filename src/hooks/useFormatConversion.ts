import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { toast } from "sonner";
import type { DocumentData, DocumentPerformanceProfile, EditorMode } from "@/types/document";
import { htmlToLatex, latexToHtml } from "@/components/editor/utils/htmlToLatex";
import { createMarkedInstance, createTurndownService } from "@/components/editor/utils/markdownRoundtrip";
import { getRenderableHtml } from "@/lib/ast/getRenderableHtml";
import { getRenderableLatex } from "@/lib/ast/getRenderableLatex";
import { getRenderableMarkdown } from "@/lib/ast/getRenderableMarkdown";
import { buildDocumentPerformanceProfile } from "@/lib/documents/documentPerformanceProfile";
import { exportDocsyToLatex } from "@/lib/latex/exportDocsyToLatex";
import { importLatexToDocsy } from "@/lib/latex/importLatexToDocsy";
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

interface SecondaryRenderableFormats {
  latex: string;
  latexDocument: string;
  markdown: string;
}

const scheduleIdleConversion = (callback: () => void, delayMs: number) => {
  const browserWindow = typeof window !== "undefined" ? window : undefined;
  if (browserWindow && "requestIdleCallback" in browserWindow) {
    const timeoutId = globalThis.setTimeout(() => {
      browserWindow.requestIdleCallback(callback, { timeout: delayMs + 800 });
    }, delayMs);

    return () => globalThis.clearTimeout(timeoutId);
  }

  const timeoutId = globalThis.setTimeout(callback, delayMs);
  return () => globalThis.clearTimeout(timeoutId);
};

const getSecondaryConversionDelay = (profile: DocumentPerformanceProfile) => {
  switch (profile.kind) {
    case "heavy":
      return 900;
    case "large":
      return 250;
    default:
      return 0;
  }
};

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
  const conversionRequestIdRef = useRef(0);

  const getDocumentHtml = useCallback((mode: EditorMode, content: string) => {
    if (!content) {
      return "";
    }

    if (mode === "markdown") {
      return markedInstance.parse(content, { async: false }) as string;
    }

    if (mode === "latex") {
      return importLatexToDocsy(content).html || latexToHtml(content, { includeMetadata: false });
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
    [activeDoc.content, activeDoc.mode, activeDoc.sourceSnapshots, getDocumentHtml, liveEditorHtml],
  );
  const currentRenderableHtml = useMemo(
    () => getRenderableHtml(currentTiptapDocument, currentEditorHtml),
    [currentEditorHtml, currentTiptapDocument],
  );
  const documentPerformanceProfile = useMemo(
    () => buildDocumentPerformanceProfile(activeDoc),
    [activeDoc],
  );

  const computeSecondaryRenderableFormats = useCallback((): SecondaryRenderableFormats => {
    const markdown = activeDoc.mode === "markdown"
      ? activeDoc.content
      : getRenderableMarkdown(
        currentTiptapDocument,
        activeDoc.sourceSnapshots?.markdown || turndownService.turndown(currentRenderableHtml),
      );
    const latex = activeDoc.mode === "latex"
      ? activeDoc.content
      : getRenderableLatex(
        currentTiptapDocument,
        activeDoc.sourceSnapshots?.latex || htmlToLatex(currentRenderableHtml, false),
        { includeMetadata: false, includeWrapper: false },
      );
    const latexDocument = activeDoc.mode === "latex"
      ? exportDocsyToLatex({
        currentLatexSource: activeDoc.content,
        html: currentRenderableHtml,
        title: activeDoc.name || "Untitled",
      })
      : getRenderableLatex(
        currentTiptapDocument,
        htmlToLatex(currentRenderableHtml, true, {
          includeMetadata: false,
        }),
        { includeWrapper: true, title: activeDoc.name || "Untitled", includeMetadata: false },
      );

    return {
      latex,
      latexDocument,
      markdown,
    };
  }, [
    activeDoc.content,
    activeDoc.mode,
    activeDoc.name,
    activeDoc.sourceSnapshots,
    currentRenderableHtml,
    currentTiptapDocument,
    turndownService,
  ]);

  const [secondaryRenderables, setSecondaryRenderables] = useState<SecondaryRenderableFormats>(() =>
    computeSecondaryRenderableFormats());
  const [secondaryConversionsPending, setSecondaryConversionsPending] = useState(false);

  useEffect(() => {
    setLiveEditorHtml(getDocumentHtml(activeDoc.mode, activeDoc.content));
  }, [activeDoc.content, activeDocId, activeDoc.mode, editorKey, getDocumentHtml]);

  useEffect(() => {
    const requestId = conversionRequestIdRef.current + 1;
    conversionRequestIdRef.current = requestId;

    if (documentPerformanceProfile.kind === "normal") {
      setSecondaryRenderables(computeSecondaryRenderableFormats());
      setSecondaryConversionsPending(false);
      return;
    }

    setSecondaryConversionsPending(true);
    const cancel = scheduleIdleConversion(() => {
      if (conversionRequestIdRef.current !== requestId) {
        return;
      }

      setSecondaryRenderables(computeSecondaryRenderableFormats());
      setSecondaryConversionsPending(false);
    }, getSecondaryConversionDelay(documentPerformanceProfile));

    return () => {
      cancel();
    };
  }, [computeSecondaryRenderableFormats, documentPerformanceProfile]);

  const flushSecondaryRenderables = useCallback(async () => {
    const requestId = conversionRequestIdRef.current + 1;
    conversionRequestIdRef.current = requestId;
    const nextRenderables = computeSecondaryRenderableFormats();
    setSecondaryRenderables(nextRenderables);
    setSecondaryConversionsPending(false);
    return nextRenderables;
  }, [computeSecondaryRenderableFormats]);

  const getFreshRenderableMarkdown = useCallback(async () => {
    if (activeDoc.mode === "markdown") {
      return activeDoc.content;
    }

    return (await flushSecondaryRenderables()).markdown;
  }, [activeDoc.content, activeDoc.mode, flushSecondaryRenderables]);

  const getFreshRenderableLatex = useCallback(async () => {
    if (activeDoc.mode === "latex") {
      return activeDoc.content;
    }

    return (await flushSecondaryRenderables()).latex;
  }, [activeDoc.content, activeDoc.mode, flushSecondaryRenderables]);

  const getFreshRenderableLatexDocument = useCallback(async () => (
    (await flushSecondaryRenderables()).latexDocument
  ), [flushSecondaryRenderables]);

  const currentRenderableMarkdown = activeDoc.mode === "markdown"
    ? activeDoc.content
    : secondaryRenderables.markdown;
  const currentRenderableLatex = activeDoc.mode === "latex"
    ? activeDoc.content
    : secondaryRenderables.latex;
  const currentRenderableLatexDocument = secondaryRenderables.latexDocument;

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

    void flushSecondaryRenderables()
      .then((nextRenderables) => {
        let convertedContent = "";

        if (newMode === "markdown") {
          convertedContent = nextRenderables.markdown;
        } else if (newMode === "latex") {
          convertedContent = nextRenderables.latex;
        } else if (newMode === "html") {
          convertedContent = currentRenderableHtml;
        }

        updateActiveDoc({ mode: newMode, content: convertedContent });
        bumpEditorKey();
        toast.success(t("toasts.modeConverted", {
          from: oldMode.toUpperCase(),
          to: newMode.toUpperCase(),
        }));
      })
      .catch((error) => {
        console.error("Mode conversion error:", error);
        toast.error("Failed to switch mode.");
      });
  }, [activeDoc.mode, bumpEditorKey, currentRenderableHtml, flushSecondaryRenderables, t, updateActiveDoc]);

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
    documentPerformanceProfile,
    flushSecondaryRenderables,
    getFreshRenderableLatex,
    getFreshRenderableLatexDocument,
    getFreshRenderableMarkdown,
    handleModeChange,
    secondaryConversionsPending,
    setLiveEditorHtml,
    textStats,
  };
};
