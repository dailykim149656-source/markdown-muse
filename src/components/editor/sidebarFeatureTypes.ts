import type {
  CreateDocumentOptions,
  DocumentData,
  DocumentVersionSnapshot,
} from "@/types/document";

export type SidebarTab = "documents" | "history" | "knowledge";

export interface HistorySidebarPanelsProps {
  activeDoc: DocumentData;
  onGenerateTocSuggestion?: () => void;
  onRestoreVersionSnapshot: (snapshotId: string) => void;
  versionHistoryReady: boolean;
  versionHistoryRestoring: boolean;
  versionHistorySnapshots: DocumentVersionSnapshot[];
  versionHistorySyncing: boolean;
}

export interface KnowledgeSidebarPanelsProps {
  activeDoc: DocumentData;
  activeDocId: string;
  createDocument: (options?: CreateDocumentOptions) => DocumentData;
  documents: DocumentData[];
  onGenerateTocSuggestion?: () => void;
  onSelectDoc: (id: string) => void;
  onSuggestKnowledgeImpactUpdate: (sourceDocumentId: string, targetDocumentId: string) => void;
  onSuggestKnowledgeUpdates: (documentId: string) => void;
}
