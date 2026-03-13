import { useEffect } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type { KnowledgeSuggestionContext } from "@/components/editor/sidebarFeatureTypes";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import type { AiBusyAction, PatchPreviewResult, TocPreviewResult } from "@/hooks/useAiAssistant";
import { useLiveAgent } from "@/hooks/useLiveAgent";
import type { LiveAgentRuntimeState } from "@/hooks/useLiveAgent";
import type { ProcedureExtractionResult } from "@/lib/ai/procedureExtraction";
import type { SummarizeDocumentResponse } from "@/types/aiAssistant";
import type { DocumentData } from "@/types/document";
import type { DocumentPatchSet } from "@/types/documentPatch";
import type { AgentNewDocumentDraft } from "@/types/liveAgent";

export interface AiAssistantRuntimeState {
  assistantOpen: boolean;
  busyAction: AiBusyAction;
  compareCandidates: DocumentData[];
  comparePreview: PatchPreviewResult | null;
  compareWithDocument: (targetDocumentId: string) => Promise<PatchPreviewResult>;
  extractProcedureFromActiveDocument: () => Promise<ProcedureExtractionResult | unknown> | unknown;
  generateSectionPatch: (prompt: string) => Promise<void>;
  generateTocSuggestion: () => Promise<TocPreviewResult>;
  loadTocPatch: (maxDepthOverride?: 1 | 2 | 3) => Promise<DocumentPatchSet | null>;
  procedureResult: ProcedureExtractionResult | null;
  richTextAvailable: boolean;
  setAssistantOpen: (open: boolean) => void;
  suggestUpdatesFromDocument: (
    targetDocumentId: string,
    context?: KnowledgeSuggestionContext,
  ) => Promise<PatchPreviewResult>;
  summarizeActiveDocument: (objective: string) => Promise<SummarizeDocumentResponse>;
  summaryResult: SummarizeDocumentResponse | null;
  tocPreview: TocPreviewResult | null;
  updateSuggestionPreview: PatchPreviewResult | null;
  liveAgent: LiveAgentRuntimeState;
}

interface AiAssistantRuntimeProps {
  activeDoc: DocumentData;
  activeEditor: TiptapEditor | null;
  createDocumentDraft: (draft: AgentNewDocumentDraft) => void;
  currentRenderableMarkdown: string;
  documents: DocumentData[];
  getFreshRenderableMarkdown: () => Promise<string>;
  importWorkspaceDocument: (fileId: string) => Promise<void>;
  loadPatchSet: (patchSet: DocumentPatchSet) => void;
  openWorkspaceConnection: () => void;
  onStateChange: (state: AiAssistantRuntimeState | null) => void;
}

const AiAssistantRuntime = ({
  activeDoc,
  activeEditor,
  createDocumentDraft,
  currentRenderableMarkdown,
  documents,
  getFreshRenderableMarkdown,
  importWorkspaceDocument,
  loadPatchSet,
  openWorkspaceConnection,
  onStateChange,
}: AiAssistantRuntimeProps) => {
  const state = useAiAssistant({
    activeDoc,
    activeEditor,
    currentRenderableMarkdown,
    documents,
    getFreshRenderableMarkdown,
    loadPatchSet,
  });
  const liveAgent = useLiveAgent({
    activeDoc,
    activeEditor,
    currentRenderableMarkdown,
    documents,
    getFreshRenderableMarkdown,
    onCreateDocumentDraft: createDocumentDraft,
    onImportDriveDocument: importWorkspaceDocument,
    onOpenPatchReview: (patchSet) => {
      loadPatchSet(patchSet);
    },
    onOpenWorkspaceConnection: openWorkspaceConnection,
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
      liveAgent,
    });
  }, [
    liveAgent,
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
