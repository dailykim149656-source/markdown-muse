import type { JSONContent } from "@tiptap/core";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { PatchPreviewResult, SectionGenerationResult, TocPreviewResult } from "@/hooks/useAiAssistant";
import { buildDerivedDocumentIndex } from "@/lib/ast/documentIndex";
import { serializeTiptapToAst } from "@/lib/ast/tiptapAst";
import { captureWorkspaceScreenshot } from "@/lib/ai/captureWorkspaceScreenshot";
import { liveAgentTurn } from "@/lib/ai/liveAgentClient";
import { buildLiveAgentGraphContext } from "@/lib/ai/liveAgentGraphContext";
import { buildLiveAgentPatchSet } from "@/lib/ai/liveAgentPatchBuilder";
import type { ProcedureExtractionResult } from "@/lib/ai/procedureExtraction";
import type { SummaryDocumentDraftInput } from "@/lib/ai/summaryDocument";
import { useI18n } from "@/i18n/useI18n";
import type { SummarizeDocumentResponse } from "@/types/aiAssistant";
import type { DocumentData } from "@/types/document";
import type {
  AgentArtifact,
  AgentAvailableTargetDocument,
  AgentChatMessage,
  AgentCurrentDocumentDraft,
  AgentDeliveryMode,
  AgentDelegatedCapability,
  AgentDocumentContext,
  AgentDriveCandidate,
  AgentLocalReference,
  AgentNewDocumentDraft,
  AgentResolvedReference,
  AgentSelectedDriveReference,
  AgentStatus,
  AgentTurnRequest,
} from "@/types/liveAgent";
import type { DocumentPatchSet } from "@/types/documentPatch";

const MAX_MESSAGE_HISTORY = 12;
const MAX_DRIVE_REFERENCES = 3;
const createArtifactId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type PendingAgentConfirmation =
  | { type: "create_new_document"; draft: AgentNewDocumentDraft }
  | { type: "import_drive_document"; fileId: string; fileName: string };

type PendingImportedDelegation = {
  capability: Extract<AgentDelegatedCapability, "compare_documents" | "suggest_document_updates">;
  prompt: string;
  targetDocumentName?: string;
};

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
  getFreshRenderableMarkdown: () => Promise<string>;
  onAutoApplyPatchSet: (patchSet: DocumentPatchSet) => Promise<boolean>;
  onCreateDocumentDraft: (draft: AgentNewDocumentDraft) => void;
  onCreateSummaryDocument: (input: SummaryDocumentDraftInput) => unknown;
  onCompareWithDocument: (targetDocumentId: string) => Promise<PatchPreviewResult>;
  onExtractProcedure: () => Promise<ProcedureExtractionResult | unknown> | unknown;
  onGenerateSection: (prompt: string) => Promise<SectionGenerationResult | void>;
  onGenerateToc: () => Promise<TocPreviewResult>;
  onImportDriveDocument: (fileId: string) => Promise<void>;
  onOpenPatchReview: (patchSet: DocumentPatchSet) => void;
  onOpenWorkspaceConnection: () => void;
  onSummarizeDocument: (objective: string) => Promise<SummarizeDocumentResponse | unknown> | unknown;
  onSuggestUpdates: (targetDocumentId: string) => Promise<PatchPreviewResult>;
}

const createActiveDocumentReference = (documentName: string): AgentResolvedReference => ({
  autoInferred: true,
  kind: "active_document",
  label: documentName,
});

const createLocalDocumentReference = ({
  autoInferred = true,
  documentId,
  fileName,
}: {
  autoInferred?: boolean;
  documentId: string;
  fileName: string;
}): AgentResolvedReference => ({
  autoInferred,
  documentId,
  kind: "local_document",
  label: fileName,
});

const createDriveDocumentReference = ({
  autoInferred = true,
  fileId,
  fileName,
}: {
  autoInferred?: boolean;
  fileId: string;
  fileName: string;
}): AgentResolvedReference => ({
  autoInferred,
  fileId,
  kind: "drive_document",
  label: fileName,
});

const DRIVE_INTENT_PATTERN = /\b(?:google\s*drive|google\s*docs|drive|docs|import|search)\b|(?:\uAD6C\uAE00\s*\uB4DC\uB77C\uC774\uBE0C)|(?:\uAD6C\uAE00\s*\uBB38\uC11C)|(?:\uB4DC\uB77C\uC774\uBE0C)|(?:\uAC00\uC838\uC624)|(?:\uAC80\uC0C9)/iu;

const isDriveIntentMessage = (value: string) => DRIVE_INTENT_PATTERN.test(value.trim());

export interface LiveAgentState {
  artifacts: AgentArtifact[];
  availableLocalReferences: DocumentData[];
  availableTargetDocuments: AgentAvailableTargetDocument[];
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
  createSummaryDocumentFromArtifact: (artifactId: string) => void;
  discardPendingAction: () => void;
  openArtifactPatchReview: (artifactId: string) => void;
  queueDriveImport: (candidate: Pick<AgentDriveCandidate, "fileId" | "fileName">) => void;
  removeDriveReference: (fileId: string) => void;
  resolveArtifactDocumentTarget: (artifactId: string, documentId: string) => Promise<void>;
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
  getFreshRenderableMarkdown,
  onAutoApplyPatchSet,
  onCreateDocumentDraft,
  onCreateSummaryDocument,
  onCompareWithDocument,
  onExtractProcedure,
  onGenerateSection,
  onGenerateToc,
  onImportDriveDocument,
  onOpenPatchReview,
  onOpenWorkspaceConnection,
  onSummarizeDocument,
  onSuggestUpdates,
}: UseLiveAgentOptions): LiveAgentRuntimeState => {
  const { t, locale } = useI18n();
  const [artifacts, setArtifacts] = useState<AgentArtifact[]>([]);
  const [threadId, setThreadId] = useState(() => createThreadId());
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [composerText, setComposerText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocalReferenceIds, setSelectedLocalReferenceIds] = useState<string[]>([]);
  const [selectedDriveReferences, setSelectedDriveReferences] = useState<AgentSelectedDriveReference[]>([]);
  const [latestDriveCandidates, setLatestDriveCandidates] = useState<AgentDriveCandidate[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingAgentConfirmation | null>(null);
  const [pendingImportedDelegation, setPendingImportedDelegation] = useState<PendingImportedDelegation | null>(null);
  const [latestDraftPreview, setLatestDraftPreview] = useState<AgentCurrentDocumentDraft | AgentNewDocumentDraft | null>(null);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [latestStatus, setLatestStatus] = useState<AgentStatus | null>(null);

  const availableLocalReferences = useMemo(
    () => documents.filter((document) => document.id !== activeDoc.id && isRichTextDocument(document)),
    [activeDoc.id, documents],
  );
  const availableTargetDocuments = useMemo<AgentAvailableTargetDocument[]>(
    () => availableLocalReferences.map((document) => ({
      documentId: document.id,
      fileName: document.name,
      mode: document.mode as AgentAvailableTargetDocument["mode"],
    })),
    [availableLocalReferences],
  );
  const activeResolvedReference = useMemo(
    () => createActiveDocumentReference(activeDoc.name),
    [activeDoc.name],
  );

  const resetThread = useCallback(() => {
    setArtifacts([]);
    setComposerText("");
    setLatestDraftPreview(null);
    setLatestDriveCandidates([]);
    setLatestError(null);
    setLatestStatus(null);
    setMessages([]);
    setPendingConfirmation(null);
    setPendingImportedDelegation(null);
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
    const activeMarkdown = currentRenderableMarkdown.trim()
      ? await getFreshRenderableMarkdown()
      : currentRenderableMarkdown;
    const activeDocument = buildDocumentContext(activeDoc, activeMarkdown, activeEditor);
    const graphDocuments = documents.map((document) => {
      if (document.id !== activeDoc.id || !isRichTextDocument(document)) {
        return document;
      }

      return {
        ...document,
        content: activeMarkdown || document.content,
        sourceSnapshots: {
          ...document.sourceSnapshots,
          markdown: activeMarkdown || document.sourceSnapshots?.markdown || document.content,
        },
        updatedAt: Date.now(),
      };
    });
    const localReferenceDocuments = Array.from(new Set(selectedLocalReferenceIds))
      .filter((documentId) => documentId !== activeDoc.id)
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
          markdown: activeMarkdown,
          mode: activeDoc.mode,
        });
      } catch {
        screenshot = undefined;
      }
    }

    return {
      activeDocument,
      availableTargetDocuments,
      driveReferenceFileIds: selectedDriveReferences.map((reference) => reference.fileId),
      graphContext: buildLiveAgentGraphContext({
        activeDocumentId: activeDoc.id,
        documents: graphDocuments,
      }),
      localReferences,
      locale,
      messages: nextMessages.slice(-MAX_MESSAGE_HISTORY),
      screenshot,
      targetDefault: "active_document",
      threadId,
    };
  }, [activeDoc, activeEditor, availableTargetDocuments, currentRenderableMarkdown, documents, getFreshRenderableMarkdown, locale, selectedDriveReferences, selectedLocalReferenceIds, threadId]);

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
    if (documentId === activeDoc.id) {
      return;
    }

    setSelectedLocalReferenceIds((current) => (
      current.includes(documentId)
        ? current.filter((currentId) => currentId !== documentId)
        : [...current, documentId]
    ));
  }, [activeDoc.id]);

  const appendArtifact = useCallback((artifact: AgentArtifact) => {
    setArtifacts((current) => [...current, artifact]);
  }, []);

  const updateArtifact = useCallback((artifactId: string, updater: (artifact: AgentArtifact) => AgentArtifact) => {
    setArtifacts((current) => current.map((artifact) => (
      artifact.id === artifactId ? updater(artifact) : artifact
    )));
  }, []);

  const removeArtifact = useCallback((artifactId: string) => {
    setArtifacts((current) => current.filter((artifact) => artifact.id !== artifactId));
  }, []);

  const appendDocumentTargetArtifact = useCallback((
    capability: Extract<AgentDelegatedCapability, "compare_documents" | "suggest_document_updates">,
    prompt: string,
  ) => {
    const candidates = availableTargetDocuments;

    if (candidates.length === 0) {
      toast.info(capability === "compare_documents" ? t("aiDialog.compare.noCandidates") : t("aiDialog.update.noCandidates"));
      return;
    }

    appendArtifact({
      candidates,
      capability,
      id: createArtifactId(`target-${capability}`),
      kind: "document_target",
      prompt,
      resolvedReferences: [activeResolvedReference],
    });
  }, [activeResolvedReference, appendArtifact, availableTargetDocuments, t]);

  const executeDelegatedTargetCapability = useCallback(async ({
    capability,
    prompt,
    targetDocumentId,
  }: {
    capability: Extract<AgentDelegatedCapability, "compare_documents" | "suggest_document_updates">;
    prompt: string;
    targetDocumentId?: string;
  }) => {
    const targetDocument = targetDocumentId
      ? availableTargetDocuments.find((candidate) => candidate.documentId === targetDocumentId)
      : undefined;

    if (!targetDocument) {
      appendDocumentTargetArtifact(capability, prompt);
      return;
    }

    if (capability === "compare_documents") {
      const preview = await onCompareWithDocument(targetDocument.documentId);

      appendArtifact({
        comparisonCounts: {
          added: preview.comparison.counts.added,
          changed: preview.comparison.counts.changed,
          inconsistent: preview.comparison.counts.inconsistent,
          removed: preview.comparison.counts.removed,
        },
        id: createArtifactId("compare"),
        kind: "compare_preview",
        patchCount: preview.patchCount,
        patchSet: preview.patchSet || null,
        patchSetTitle: preview.patchSetTitle,
        resolvedReferences: [
          activeResolvedReference,
          createLocalDocumentReference({
            documentId: targetDocument.documentId,
            fileName: targetDocument.fileName,
          }),
        ],
        targetDocumentId: targetDocument.documentId,
        targetDocumentName: targetDocument.fileName,
      });
      return;
    }

    const preview = await onSuggestUpdates(targetDocument.documentId);

    appendArtifact({
      capability,
      deliveryMode: "review_first",
      directApplySucceeded: false,
      id: createArtifactId("patch"),
      kind: "patch_result",
      patchCount: preview.patchCount,
      patchSet: preview.patchSet || null,
      patchSetTitle: preview.patchSetTitle,
      resolvedReferences: [
        activeResolvedReference,
        createLocalDocumentReference({
          documentId: targetDocument.documentId,
          fileName: targetDocument.fileName,
        }),
      ],
      reviewOpened: true,
      targetDocumentId: targetDocument.documentId,
      targetDocumentName: targetDocument.fileName,
    });
  }, [activeResolvedReference, appendArtifact, appendDocumentTargetArtifact, availableTargetDocuments, onCompareWithDocument, onSuggestUpdates]);

  const handleDelegatedCapability = useCallback(async ({
    capability,
    createDocumentAfter,
    objective,
    prompt,
    targetFileId,
    targetDocumentId,
    targetDocumentName,
  }: {
    capability: AgentDelegatedCapability;
    createDocumentAfter?: boolean;
    objective?: string;
    prompt?: string;
    targetFileId?: string;
    targetDocumentId?: string;
    targetDocumentName?: string;
  }) => {
    if (capability === "summarize_document") {
      const summaryObjective = objective?.trim() || prompt?.trim();

      if (!summaryObjective) {
        throw new Error(t("hooks.ai.summarizeFailed"));
      }

      const result = await onSummarizeDocument(summaryObjective) as SummarizeDocumentResponse;

      appendArtifact({
        createDocumentAfter,
        id: createArtifactId("summary"),
        kind: "summary",
        objective: summaryObjective,
        result,
        resolvedReferences: [activeResolvedReference],
        sourceDocumentId: activeDoc.id,
        sourceDocumentName: activeDoc.name,
      });
      return;
    }

    if (capability === "generate_section") {
      const sectionPrompt = prompt?.trim() || objective?.trim();

      if (!sectionPrompt) {
        throw new Error(t("hooks.ai.generateFailed"));
      }

      const result = await onGenerateSection(sectionPrompt);

      if (!result) {
        return;
      }

      appendArtifact({
        capability,
        deliveryMode: "review_first",
        directApplySucceeded: false,
        id: createArtifactId("patch"),
        kind: "patch_result",
        patchCount: result.patchSet.patches.length,
        patchSet: result.patchSet,
        patchSetTitle: result.patchSet.title,
        resolvedReferences: [activeResolvedReference],
        reviewOpened: true,
      });
      return;
    }

    if (capability === "generate_toc") {
      const preview = await onGenerateToc();

      appendArtifact({
        entries: preview.entries,
        id: createArtifactId("toc"),
        kind: "toc_preview",
        maxDepth: preview.maxDepth,
        patchCount: preview.patchCount,
        patchSet: preview.patchSet,
        patchSetTitle: preview.patchSetTitle,
        rationale: preview.rationale,
        resolvedReferences: [activeResolvedReference],
      });
      return;
    }

    if (capability === "extract_procedure") {
      const result = await onExtractProcedure() as ProcedureExtractionResult;

      appendArtifact({
        id: createArtifactId("procedure"),
        kind: "procedure",
        result,
        resolvedReferences: [activeResolvedReference],
      });
      return;
    }

    if (capability === "compare_documents" || capability === "suggest_document_updates") {
      const comparisonPrompt = prompt?.trim() || objective?.trim() || activeDoc.name;

      if (targetFileId) {
        const importedReference = selectedDriveReferences.find((reference) => reference.fileId === targetFileId);

        await onImportDriveDocument(targetFileId);
        setPendingImportedDelegation({
          capability,
          prompt: comparisonPrompt,
          targetDocumentName: importedReference?.fileName || targetDocumentName,
        });
        return;
      }

      await executeDelegatedTargetCapability({
        capability,
        prompt: comparisonPrompt,
        targetDocumentId,
      });
    }
  }, [
    activeDoc.id,
    activeDoc.name,
    activeResolvedReference,
    appendArtifact,
    executeDelegatedTargetCapability,
    onExtractProcedure,
    onGenerateSection,
    onGenerateToc,
    onImportDriveDocument,
    onSummarizeDocument,
    selectedDriveReferences,
    t,
  ]);

  const createSummaryDocumentFromArtifact = useCallback((artifactId: string) => {
    const artifact = artifacts.find((candidate): candidate is Extract<AgentArtifact, { kind: "summary" }> =>
      candidate.id === artifactId && candidate.kind === "summary");

    if (!artifact) {
      return;
    }

    onCreateSummaryDocument({
      locale,
      objective: artifact.objective,
      sourceDocumentId: artifact.sourceDocumentId,
      sourceDocumentName: artifact.sourceDocumentName,
      summary: artifact.result,
    });
    updateArtifact(artifactId, (current) => current.kind === "summary"
      ? {
        ...current,
        documentCreated: true,
      }
      : current);
  }, [artifacts, locale, onCreateSummaryDocument, updateArtifact]);

  const openArtifactPatchReview = useCallback((artifactId: string) => {
    const artifact = artifacts.find((candidate) => candidate.id === artifactId);

    if (!artifact) {
      return;
    }

    const patchSet = artifact.kind === "compare_preview" || artifact.kind === "patch_result" || artifact.kind === "toc_preview"
      ? artifact.patchSet
      : null;

    if (!patchSet) {
      return;
    }

    onOpenPatchReview(patchSet);
  }, [artifacts, onOpenPatchReview]);

  const resolveArtifactDocumentTarget = useCallback(async (artifactId: string, documentId: string) => {
    const artifact = artifacts.find((candidate): candidate is Extract<AgentArtifact, { kind: "document_target" }> =>
      candidate.id === artifactId && candidate.kind === "document_target");

    if (!artifact) {
      return;
    }

    removeArtifact(artifactId);
    await executeDelegatedTargetCapability({
      capability: artifact.capability,
      prompt: artifact.prompt,
      targetDocumentId: documentId,
    });
  }, [artifacts, executeDelegatedTargetCapability, removeArtifact]);

  useEffect(() => {
    if (!pendingImportedDelegation || !pendingImportedDelegation.targetDocumentName) {
      return;
    }

    const importedTarget = availableTargetDocuments.find((document) =>
      document.fileName.trim().toLowerCase() === pendingImportedDelegation.targetDocumentName?.trim().toLowerCase(),
    );

    if (!importedTarget) {
      return;
    }

    setPendingImportedDelegation(null);
    void executeDelegatedTargetCapability({
      capability: pendingImportedDelegation.capability,
      prompt: pendingImportedDelegation.prompt,
      targetDocumentId: importedTarget.documentId,
    });
  }, [availableTargetDocuments, executeDelegatedTargetCapability, pendingImportedDelegation]);

  const sendMessage = useCallback(async (textOverride?: string) => {
    const nextText = (textOverride ?? composerText).trim();

    if (!nextText || isSubmitting) {
      return;
    }

    if (!isRichTextDocument(activeDoc) && !isDriveIntentMessage(nextText)) {
      const message = t("hooks.ai.richTextOnly");
      setLatestError(message);
      toast.error(message);
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
          const resolvedReferences: AgentResolvedReference[] = [activeResolvedReference];
          const shouldDirectApply = response.effect.deliveryMode === "direct_apply";

          setPendingConfirmation(null);
          if (shouldDirectApply) {
            const directApplySucceeded = await onAutoApplyPatchSet(patchSet);

            appendArtifact({
              capability: "update_current_document",
              deliveryMode: "direct_apply",
              directApplySucceeded,
              id: createArtifactId("patch"),
              kind: "patch_result",
              patchCount: patchSet.patches.length,
              patchSet,
              patchSetTitle: patchSet.title,
              resolvedReferences,
              reviewOpened: false,
            });
            break;
          }

          onOpenPatchReview(patchSet);
          appendArtifact({
            capability: "update_current_document",
            deliveryMode: "review_first",
            directApplySucceeded: false,
            id: createArtifactId("patch"),
            kind: "patch_result",
            patchCount: patchSet.patches.length,
            patchSet,
            patchSetTitle: patchSet.title,
            resolvedReferences,
            reviewOpened: true,
          });
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
          appendArtifact({
            draft: response.newDocumentDraft,
            id: createArtifactId("draft"),
            kind: "draft_preview",
            resolvedReferences: [activeResolvedReference],
          });
          break;
        case "show_drive_candidates":
          setPendingConfirmation(null);
          appendArtifact({
            candidates: response.driveCandidates || [],
            id: createArtifactId("drive"),
            kind: "drive_candidates",
            query: response.effect.query,
            resolvedReferences: [activeResolvedReference],
          });
          break;
        case "delegate_ai_capability":
          setPendingConfirmation(null);
          await handleDelegatedCapability({
            capability: response.effect.capability,
            createDocumentAfter: response.effect.createDocumentAfter,
            objective: response.effect.objective || optimisticUserMessage.text,
            prompt: response.effect.prompt || optimisticUserMessage.text,
            targetFileId: response.effect.targetFileId,
            targetDocumentId: response.effect.targetDocumentId,
            targetDocumentName: response.effect.targetDocumentName,
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
  }, [
    activeDoc,
    activeEditor,
    activeResolvedReference,
    appendArtifact,
    buildAgentRequest,
    composerText,
    handleDelegatedCapability,
    isSubmitting,
    messages,
    onAutoApplyPatchSet,
    onOpenPatchReview,
    onOpenWorkspaceConnection,
    t,
  ]);

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
    artifacts,
    availableLocalReferences,
    availableTargetDocuments,
    composerText,
    confirmPendingAction,
    createSummaryDocumentFromArtifact,
    discardPendingAction,
    isSubmitting,
    latestDraftPreview,
    latestDriveCandidates,
    latestError,
    latestStatus,
    messages,
    openArtifactPatchReview,
    pendingConfirmation,
    queueDriveImport,
    removeDriveReference,
    resolveArtifactDocumentTarget,
    resetThread,
    selectedDriveReferences,
    selectedLocalReferenceIds,
    sendMessage,
    setComposerText,
    threadId,
    toggleLocalReference,
  }), [
    addDriveReference,
    artifacts,
    availableLocalReferences,
    availableTargetDocuments,
    composerText,
    confirmPendingAction,
    createSummaryDocumentFromArtifact,
    discardPendingAction,
    isSubmitting,
    latestDraftPreview,
    latestDriveCandidates,
    latestError,
    latestStatus,
    messages,
    openArtifactPatchReview,
    pendingConfirmation,
    queueDriveImport,
    removeDriveReference,
    resolveArtifactDocumentTarget,
    resetThread,
    selectedDriveReferences,
    selectedLocalReferenceIds,
    sendMessage,
    threadId,
    toggleLocalReference,
  ]);
};
