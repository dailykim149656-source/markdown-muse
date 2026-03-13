import type { JSONContent } from "@tiptap/core";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { buildDerivedDocumentIndex } from "@/lib/ast/documentIndex";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { captureWorkspaceScreenshot } from "@/lib/ai/captureWorkspaceScreenshot";
import { liveAgentTurn } from "@/lib/ai/client";
import { buildLiveAgentPatchSet } from "@/lib/ai/liveAgentPatchBuilder";
import { useI18n } from "@/i18n/useI18n";
import type { DocumentData } from "@/types/document";
import type {
  AgentChatMessage,
  AgentCurrentDocumentDraft,
  AgentDocumentContext,
  AgentDriveCandidate,
  AgentLocalReference,
  AgentNewDocumentDraft,
  AgentSelectedDriveReference,
  AgentStatus,
  AgentTurnRequest,
} from "@/types/liveAgent";
import type { DocumentPatchSet } from "@/types/documentPatch";

const MAX_MESSAGE_HISTORY = 12;
const MAX_DRIVE_REFERENCES = 3;

type PendingAgentConfirmation =
  | { type: "create_new_document"; draft: AgentNewDocumentDraft }
  | { type: "import_drive_document"; fileId: string; fileName: string };

const isRichTextDocument = (
  document: Pick<DocumentData, "mode">,
): document is Pick<DocumentData, "mode"> & { mode: "html" | "latex" | "markdown" } =>
  document.mode === "markdown" || document.mode === "latex" || document.mode === "html";

const createThreadId = () => `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createUserMessage = (text: string): AgentChatMessage => ({
  createdAt: Date.now(),
  id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role: "user",
  text,
});

const getRichTextDocumentMarkdown = (document: DocumentData) =>
  document.sourceSnapshots?.markdown?.trim()
  || (document.mode === "markdown" ? document.content : "");

const getDocumentAst = (
  document: DocumentData,
  activeEditor: TiptapEditor | null,
) => {
  if (activeEditor && isRichTextDocument(document)) {
    try {
      return serializeTiptapToAst(activeEditor.getJSON(), {
        documentNodeId: `doc-${document.id}`,
        throwOnUnsupported: false,
      });
    } catch {
      // Fall through to the document snapshot.
    }
  }

  if (document.ast) {
    return document.ast;
  }

  if (document.tiptapJson) {
    try {
      return serializeTiptapToAst(document.tiptapJson as JSONContent, {
        documentNodeId: `doc-${document.id}`,
        throwOnUnsupported: false,
      });
    } catch {
      return null;
    }
  }

  return null;
};

const buildDocumentContext = (
  document: DocumentData,
  markdown: string,
  activeEditor: TiptapEditor | null,
): AgentDocumentContext | null => {
  if (!isRichTextDocument(document) || !markdown.trim()) {
    return null;
  }

  const ast = getDocumentAst(document, activeEditor);
  const headings = ast ? buildDerivedDocumentIndex(ast).headings : [];

  return {
    documentId: document.id,
    existingHeadings: headings,
    fileName: document.name,
    markdown,
    mode: document.mode,
  };
};

interface UseLiveAgentOptions {
  activeDoc: DocumentData;
  activeEditor: TiptapEditor | null;
  currentRenderableMarkdown: string;
  documents: DocumentData[];
  onCreateDocumentDraft: (draft: AgentNewDocumentDraft) => void;
  onImportDriveDocument: (fileId: string) => Promise<void>;
  onOpenPatchReview: (patchSet: DocumentPatchSet) => void;
  onOpenWorkspaceConnection: () => void;
}

export interface LiveAgentState {
  availableLocalReferences: DocumentData[];
  composerText: string;
  isSubmitting: boolean;
  latestDraftPreview: AgentCurrentDocumentDraft | AgentNewDocumentDraft | null;
  latestDriveCandidates: AgentDriveCandidate[];
  latestError: string | null;
  latestStatus: AgentStatus | null;
  messages: AgentChatMessage[];
  pendingConfirmation: PendingAgentConfirmation | null;
  selectedDriveReferences: AgentSelectedDriveReference[];
  selectedLocalReferenceIds: string[];
  threadId: string;
}

export interface LiveAgentRuntimeState extends LiveAgentState {
  addDriveReference: (candidate: AgentDriveCandidate) => void;
  confirmPendingAction: () => Promise<void>;
  discardPendingAction: () => void;
  queueDriveImport: (candidate: Pick<AgentDriveCandidate, "fileId" | "fileName">) => void;
  removeDriveReference: (fileId: string) => void;
  resetThread: () => void;
  sendMessage: (textOverride?: string) => Promise<void>;
  setComposerText: (value: string) => void;
  toggleLocalReference: (documentId: string) => void;
}

export const useLiveAgent = ({
  activeDoc,
  activeEditor,
  currentRenderableMarkdown,
  documents,
  onCreateDocumentDraft,
  onImportDriveDocument,
  onOpenPatchReview,
  onOpenWorkspaceConnection,
}: UseLiveAgentOptions): LiveAgentRuntimeState => {
  const { t, locale } = useI18n();
  const [threadId, setThreadId] = useState(() => createThreadId());
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [composerText, setComposerText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocalReferenceIds, setSelectedLocalReferenceIds] = useState<string[]>([]);
  const [selectedDriveReferences, setSelectedDriveReferences] = useState<AgentSelectedDriveReference[]>([]);
  const [latestDriveCandidates, setLatestDriveCandidates] = useState<AgentDriveCandidate[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingAgentConfirmation | null>(null);
  const [latestDraftPreview, setLatestDraftPreview] = useState<AgentCurrentDocumentDraft | AgentNewDocumentDraft | null>(null);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [latestStatus, setLatestStatus] = useState<AgentStatus | null>(null);

  const availableLocalReferences = useMemo(
    () => documents.filter((document) => document.id !== activeDoc.id && isRichTextDocument(document)),
    [activeDoc.id, documents],
  );

  const resetThread = useCallback(() => {
    setComposerText("");
    setLatestDraftPreview(null);
    setLatestDriveCandidates([]);
    setLatestError(null);
    setLatestStatus(null);
    setMessages([]);
    setPendingConfirmation(null);
    setSelectedDriveReferences([]);
    setSelectedLocalReferenceIds([]);
    setThreadId(createThreadId());
  }, []);

  useEffect(() => {
    resetThread();
  }, [activeDoc.id, resetThread]);

  const buildAgentRequest = useCallback(async (
    nextMessages: AgentChatMessage[],
  ): Promise<AgentTurnRequest> => {
    const activeDocument = buildDocumentContext(activeDoc, currentRenderableMarkdown, activeEditor);
    const localReferenceDocuments = selectedLocalReferenceIds
      .map((documentId) => documents.find((document) => document.id === documentId) || null)
      .filter((document): document is DocumentData => Boolean(document))
      .filter((document): document is DocumentData & { mode: "html" | "latex" | "markdown" } => isRichTextDocument(document));
    const localReferences: AgentLocalReference[] = localReferenceDocuments
      .map((document) => {
        const markdown = getRichTextDocumentMarkdown(document);
        const context = buildDocumentContext(document, markdown, null);

        if (!context) {
          return null;
        }

        return {
          ...context,
          source: "local" as const,
        };
      })
      .filter((reference): reference is AgentLocalReference => Boolean(reference));

    let screenshot;

    if (activeDocument) {
      try {
        screenshot = await captureWorkspaceScreenshot({
          documentName: activeDoc.name,
          markdown: currentRenderableMarkdown,
          mode: activeDoc.mode,
        });
      } catch {
        screenshot = undefined;
      }
    }

    return {
      activeDocument,
      driveReferenceFileIds: selectedDriveReferences.map((reference) => reference.fileId),
      localReferences,
      locale,
      messages: nextMessages.slice(-MAX_MESSAGE_HISTORY),
      screenshot,
      targetDefault: "active_document",
      threadId,
    };
  }, [activeDoc, activeEditor, currentRenderableMarkdown, documents, locale, selectedDriveReferences, selectedLocalReferenceIds, threadId]);

  const queueDriveImport = useCallback((candidate: Pick<AgentDriveCandidate, "fileId" | "fileName">) => {
    setPendingConfirmation({
      fileId: candidate.fileId,
      fileName: candidate.fileName,
      type: "import_drive_document",
    });
  }, []);

  const addDriveReference = useCallback((candidate: AgentDriveCandidate) => {
    setSelectedDriveReferences((current) => {
      if (current.some((reference) => reference.fileId === candidate.fileId)) {
        return current;
      }

      if (current.length >= MAX_DRIVE_REFERENCES) {
        toast.error(`Only ${MAX_DRIVE_REFERENCES} Google Drive references can be kept at once.`);
        return current;
      }

      return [...current, { fileId: candidate.fileId, fileName: candidate.fileName }];
    });
  }, []);

  const removeDriveReference = useCallback((fileId: string) => {
    setSelectedDriveReferences((current) => current.filter((reference) => reference.fileId !== fileId));
  }, []);

  const toggleLocalReference = useCallback((documentId: string) => {
    setSelectedLocalReferenceIds((current) => (
      current.includes(documentId)
        ? current.filter((currentId) => currentId !== documentId)
        : [...current, documentId]
    ));
  }, []);

  const sendMessage = useCallback(async (textOverride?: string) => {
    const nextText = (textOverride ?? composerText).trim();

    if (!nextText || isSubmitting) {
      return;
    }

    const optimisticUserMessage = createUserMessage(nextText);
    const nextMessages = [...messages, optimisticUserMessage];

    setComposerText("");
    setIsSubmitting(true);
    setLatestError(null);
    setLatestStatus(null);
    setMessages(nextMessages);

    try {
      const request = await buildAgentRequest(nextMessages);
      const response = await liveAgentTurn(request);

      setMessages((current) => [...current, response.assistantMessage]);
      setLatestStatus(response.agentStatus || null);

      if (response.agentStatus) {
        setLatestDraftPreview(null);
        setLatestDriveCandidates([]);
        setPendingConfirmation(null);
        setIsSubmitting(false);
        return;
      }

      setLatestDraftPreview(response.currentDocumentDraft || response.newDocumentDraft || null);
      setLatestDriveCandidates(response.driveCandidates || []);

      switch (response.effect.type) {
        case "draft_current_document": {
          if (!response.currentDocumentDraft) {
            throw new Error("The live agent response did not include a current-document draft.");
          }

          const ast = getDocumentAst(activeDoc, activeEditor);

          if (!ast || !isRichTextDocument(activeDoc)) {
            throw new Error(t("hooks.ai.richTextOnly"));
          }

          const patchSet = buildLiveAgentPatchSet({
            documentAst: ast,
            documentId: activeDoc.id,
            draft: response.currentDocumentDraft,
            patchSetId: `live-agent-${Date.now()}`,
            title: response.effect.changeSetTitle,
          });

          setPendingConfirmation(null);
          onOpenPatchReview(patchSet);
          break;
        }
        case "draft_new_document":
          if (!response.newDocumentDraft) {
            throw new Error("The live agent response did not include a new-document draft.");
          }

          setPendingConfirmation({
            draft: response.newDocumentDraft,
            type: "create_new_document",
          });
          break;
        case "ready_to_import_drive_file":
          setPendingConfirmation({
            fileId: response.effect.fileId,
            fileName: response.effect.fileName,
            type: "import_drive_document",
          });
          break;
        case "open_google_connect":
          setPendingConfirmation(null);
          onOpenWorkspaceConnection();
          break;
        default:
          setPendingConfirmation(null);
          break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The live agent request failed.";
      setLatestError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [activeDoc, activeEditor, buildAgentRequest, composerText, isSubmitting, messages, onOpenPatchReview, onOpenWorkspaceConnection, t]);

  const confirmPendingAction = useCallback(async () => {
    if (!pendingConfirmation) {
      return;
    }

    try {
      if (pendingConfirmation.type === "create_new_document") {
        onCreateDocumentDraft(pendingConfirmation.draft);
      } else {
        await onImportDriveDocument(pendingConfirmation.fileId);
      }

      setPendingConfirmation(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The live agent action failed.";
      setLatestError(message);
      toast.error(message);
    }
  }, [onCreateDocumentDraft, onImportDriveDocument, pendingConfirmation]);

  const discardPendingAction = useCallback(() => {
    setPendingConfirmation(null);
  }, []);

  return useMemo(() => ({
    addDriveReference,
    availableLocalReferences,
    composerText,
    confirmPendingAction,
    discardPendingAction,
    isSubmitting,
    latestDraftPreview,
    latestDriveCandidates,
    latestError,
    latestStatus,
    messages,
    pendingConfirmation,
    queueDriveImport,
    removeDriveReference,
    resetThread,
    selectedDriveReferences,
    selectedLocalReferenceIds,
    sendMessage,
    setComposerText,
    threadId,
    toggleLocalReference,
  }), [
    addDriveReference,
    availableLocalReferences,
    composerText,
    confirmPendingAction,
    discardPendingAction,
    isSubmitting,
    latestDraftPreview,
    latestDriveCandidates,
    latestError,
    latestStatus,
    messages,
    pendingConfirmation,
    queueDriveImport,
    removeDriveReference,
    resetThread,
    selectedDriveReferences,
    selectedLocalReferenceIds,
    sendMessage,
    threadId,
    toggleLocalReference,
  ]);
};
