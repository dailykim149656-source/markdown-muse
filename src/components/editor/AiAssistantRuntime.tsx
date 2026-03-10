import { useEffect } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import type { AiBusyAction, PatchPreviewResult, TocPreviewResult } from "@/hooks/useAiAssistant";
import type { ProcedureExtractionResult } from "@/lib/ai/procedureExtraction";
import type { SummarizeDocumentResponse } from "@/types/aiAssistant";
import type { DocumentData } from "@/types/document";
import type { DocumentPatchSet } from "@/types/documentPatch";

export interface AiAssistantRuntimeState {
  assistantOpen: boolean;
  busyAction: AiBusyAction;
  compareCandidates: DocumentData[];
  comparePreview: PatchPreviewResult | null;
  compareWithDocument: (targetDocumentId: string) => Promise<unknown> | unknown;
  extractProcedureFromActiveDocument: () => Promise<ProcedureExtractionResult | unknown> | unknown;
  generateSectionPatch: (prompt: string) => Promise<unknown> | unknown;
  generateTocSuggestion: () => Promise<unknown> | unknown;
  loadTocPatch: (maxDepthOverride?: 1 | 2 | 3) => Promise<unknown> | unknown;
  procedureResult: ProcedureExtractionResult | null;
  richTextAvailable: boolean;
  setAssistantOpen: (open: boolean) => void;
  suggestUpdatesFromDocument: (targetDocumentId: string) => Promise<unknown> | unknown;
  summarizeActiveDocument: (objective: string) => Promise<SummarizeDocumentResponse | unknown> | unknown;
  summaryResult: SummarizeDocumentResponse | null;
  tocPreview: TocPreviewResult | null;
  updateSuggestionPreview: PatchPreviewResult | null;
}

interface AiAssistantRuntimeProps {
  activeDoc: DocumentData;
  activeEditor: TiptapEditor | null;
  currentRenderableMarkdown: string;
  documents: DocumentData[];
  loadPatchSet: (patchSet: DocumentPatchSet) => void;
  onStateChange: (state: AiAssistantRuntimeState | null) => void;
}

const AiAssistantRuntime = ({
  activeDoc,
  activeEditor,
  currentRenderableMarkdown,
  documents,
  loadPatchSet,
  onStateChange,
}: AiAssistantRuntimeProps) => {
  const state = useAiAssistant({
    activeDoc,
    activeEditor,
    currentRenderableMarkdown,
    documents,
    loadPatchSet,
  });

  useEffect(() => {
    onStateChange({
      assistantOpen: state.assistantOpen,
      busyAction: state.busyAction,
      compareCandidates: state.compareCandidates,
      comparePreview: state.comparePreview,
      compareWithDocument: state.compareWithDocument,
      extractProcedureFromActiveDocument: state.extractProcedureFromActiveDocument,
      generateSectionPatch: state.generateSectionPatch,
      generateTocSuggestion: state.generateTocSuggestion,
      loadTocPatch: state.loadTocPatch,
      procedureResult: state.procedureResult,
      richTextAvailable: state.richTextAvailable,
      setAssistantOpen: state.setAssistantOpen,
      suggestUpdatesFromDocument: state.suggestUpdatesFromDocument,
      summarizeActiveDocument: state.summarizeActiveDocument,
      summaryResult: state.summaryResult,
      tocPreview: state.tocPreview,
      updateSuggestionPreview: state.updateSuggestionPreview,
    });
  }, [
    onStateChange,
    state.assistantOpen,
    state.busyAction,
    state.compareCandidates,
    state.comparePreview,
    state.compareWithDocument,
    state.extractProcedureFromActiveDocument,
    state.generateSectionPatch,
    state.generateTocSuggestion,
    state.loadTocPatch,
    state.procedureResult,
    state.richTextAvailable,
    state.setAssistantOpen,
    state.suggestUpdatesFromDocument,
    state.summarizeActiveDocument,
    state.summaryResult,
    state.tocPreview,
    state.updateSuggestionPreview,
  ]);

  useEffect(() => () => onStateChange(null), [onStateChange]);

  return null;
};

export default AiAssistantRuntime;
