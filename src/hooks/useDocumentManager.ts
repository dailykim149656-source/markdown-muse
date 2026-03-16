import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AutoSaveData,
  AutoSaveIndicatorState,
  CreateDocumentOptions,
  DocumentData,
} from "@/types/document";
import {
  clearSavedData,
  createNewDocument,
  hasRecoverableStoredData,
  hydrateSavedData,
  hasMeaningfulSavedDocuments,
  type HydratedSavedDataResult,
  isAutoSaveWriteFailure,
  loadSavedData,
  saveData,
  saveDataForUnload,
  useAutoSave,
} from "@/components/editor/useAutoSave";
import { readAutosavePointer } from "@/lib/documents/autosaveV3Store";
import {
  readLastSuccessfulAutosaveMarker,
  readRestoreSelection,
  readRuntimeBootInfo,
  recordAutosaveDebugEvent,
} from "@/lib/documents/autosaveDebug";

interface UnexpectedReloadState {
  buildChanged: boolean;
  kind: "lost" | "recovered";
  navigationType: string;
  restoreSource: string;
}

interface RecoveryFailureState {
  candidateCount: number;
  hadRecoveryHints: boolean;
  source: HydratedSavedDataResult["source"];
}

const areValuesEqual = (left: unknown, right: unknown) => {
  if (Object.is(left, right)) {
    return true;
  }

  if (typeof left !== typeof right || !left || !right || typeof left !== "object") {
    return false;
  }

  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

const isDeployedRuntime = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname !== "localhost" && hostname !== "127.0.0.1";
};

const RECOVERY_PLACEHOLDER_DOCUMENT: DocumentData = {
  id: "recovery-placeholder",
  name: "Recovery required",
  mode: "markdown",
  content: "",
  createdAt: 0,
  updatedAt: 0,
  ast: null,
  metadata: {},
  sourceSnapshots: { markdown: "" },
  storageKind: "docsy",
  tiptapJson: null,
};

export const useDocumentManager = () => {
  const initialSavedData = useMemo(() => loadSavedData(), []);
  const hasStoredRecoveryHints = useMemo(() => hasRecoverableStoredData(), []);
  const initialBootstrapData = useMemo(
    () => hasStoredRecoveryHints && !hasMeaningfulSavedDocuments(initialSavedData)
      ? null
      : initialSavedData,
    [hasStoredRecoveryHints, initialSavedData],
  );
  const initialDocuments = useMemo(
    () => initialBootstrapData?.documents?.length
      ? initialBootstrapData.documents
      : hasStoredRecoveryHints
        ? []
        : [createNewDocument()],
    [hasStoredRecoveryHints, initialBootstrapData]
  );
  const initialActiveDocId = useMemo(() => {
    if (initialBootstrapData?.activeDocId && initialDocuments.some((doc) => doc.id === initialBootstrapData.activeDocId)) {
      return initialBootstrapData.activeDocId;
    }

    return initialDocuments[0]?.id || "";
  }, [initialBootstrapData, initialDocuments]);

  const [documents, setDocuments] = useState<DocumentData[]>(() => initialDocuments);
  const [activeDocId, setActiveDocId] = useState<string>(() => initialActiveDocId);
  const [editorKey, setEditorKey] = useState(0);
  const [hasRestoredDocuments, setHasRestoredDocuments] = useState(() => hasMeaningfulSavedDocuments(initialBootstrapData));
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveIndicatorState>(() => ({
    error: null,
    lastSavedAt: initialBootstrapData?.lastSaved ?? null,
    status: initialBootstrapData ? "saved" : "saving",
  }));
  const [isRecovering, setIsRecovering] = useState(() => hasStoredRecoveryHints && !initialBootstrapData);
  const [recoveryFailure, setRecoveryFailure] = useState<RecoveryFailureState | null>(null);
  const [unexpectedReloadState, setUnexpectedReloadState] = useState<UnexpectedReloadState | null>(null);
  const documentsRef = useRef(initialDocuments);
  const activeDocIdRef = useRef(initialActiveDocId);
  const dirtyDocumentIdsRef = useRef<Set<string>>(new Set(initialDocuments.map((document) => document.id)));
  const hasUserMutatedRef = useRef(false);
  const lastSavedAtRef = useRef<number | null>(initialBootstrapData?.lastSaved ?? null);
  const lastSavedSnapshotKeyRef = useRef<string | null>(
    initialBootstrapData?.documents?.length
      ? JSON.stringify({
        activeDocId: initialActiveDocId,
        documents: initialDocuments,
        version: 2,
      })
      : null,
  );

  const activeDoc = useMemo(
    () => documents.find((doc) => doc.id === activeDocId) || documents[0] || RECOVERY_PLACEHOLDER_DOCUMENT,
    [documents, activeDocId]
  );

  const autoSaveData = useMemo<AutoSaveData | null>(() => documents.length > 0 ? ({
    version: 2,
    documents,
    activeDocId,
    lastSaved: autoSaveState.lastSavedAt ?? initialBootstrapData?.lastSaved ?? 0,
  }) : null, [activeDocId, autoSaveState.lastSavedAt, documents, initialBootstrapData?.lastSaved]);
  const shouldHydrateFromStorage = useMemo(
    () => Boolean(initialBootstrapData) || Boolean(readAutosavePointer()) || hasStoredRecoveryHints,
    [hasStoredRecoveryHints, initialBootstrapData],
  );

  const deriveUnexpectedReloadState = useCallback((restoredData: AutoSaveData | null) => {
    if (!isDeployedRuntime()) {
      return null;
    }

    const bootInfo = readRuntimeBootInfo();
    const lastSaveMarker = readLastSuccessfulAutosaveMarker();
    const restoreSelection = readRestoreSelection();

    if (!bootInfo?.hasPreviousBootInTab || !lastSaveMarker?.isMeaningful) {
      return null;
    }

    const recoveredMeaningful = hasMeaningfulSavedDocuments(restoredData)
      || Boolean(restoreSelection?.isMeaningful);

    return {
      buildChanged: Boolean(
        bootInfo.previousFrontendBuildId
        && bootInfo.previousFrontendBuildId !== bootInfo.frontendBuildId,
      ),
      kind: recoveredMeaningful ? "recovered" : "lost",
      navigationType: bootInfo.navigationType,
      restoreSource: restoreSelection?.source || "none",
    } satisfies UnexpectedReloadState;
  }, []);

  const markDocumentDirty = useCallback((documentId: string) => {
    hasUserMutatedRef.current = true;
    dirtyDocumentIdsRef.current.add(documentId);
  }, []);

  const markDocumentsDirty = useCallback((documentIds: string[]) => {
    if (documentIds.length === 0) {
      return;
    }

    hasUserMutatedRef.current = true;

    for (const documentId of documentIds) {
      dirtyDocumentIdsRef.current.add(documentId);
    }
  }, []);

  const clearDirtyDocuments = useCallback(() => {
    dirtyDocumentIdsRef.current.clear();
  }, []);

  const markAutosavePending = useCallback(() => {
    setAutoSaveState((previousState) => ({
      error: null,
      lastSavedAt: previousState.lastSavedAt,
      status: "saving",
    }));
  }, []);

  useAutoSave(autoSaveData, 3000, {
    getDirtyDocumentIds: () => Array.from(dirtyDocumentIdsRef.current),
    onError: (error) => {
      setAutoSaveState((previousState) => ({
        error,
        lastSavedAt: previousState.lastSavedAt,
        status: "error",
      }));
    },
    onSaved: (savedAt) => {
      clearDirtyDocuments();
      setAutoSaveState({
        error: null,
        lastSavedAt: savedAt,
        status: "saved",
      });
    },
    onSaving: () => {
      setAutoSaveState((previousState) => previousState.status === "saving"
        ? previousState
        : {
          error: null,
          lastSavedAt: previousState.lastSavedAt,
          status: "saving",
        });
    },
  });

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    activeDocIdRef.current = activeDocId;
  }, [activeDocId]);

  useEffect(() => {
    lastSavedAtRef.current = autoSaveState.lastSavedAt;
  }, [autoSaveState.lastSavedAt]);

  useEffect(() => {
    const bootInfo = readRuntimeBootInfo();
    recordAutosaveDebugEvent("editor_boot", {
      activeDocId: initialActiveDocId,
      buildChanged: Boolean(
        bootInfo?.previousFrontendBuildId
        && bootInfo.previousFrontendBuildId !== bootInfo.frontendBuildId,
      ),
      bootId: bootInfo?.bootId ?? null,
      docCount: initialDocuments.length,
      hasInitialSavedData: Boolean(initialBootstrapData),
      hasStoredRecoveryHints,
      hasPointer: Boolean(readAutosavePointer()),
      navigationType: bootInfo?.navigationType ?? "unknown",
      restoredDocuments: hasMeaningfulSavedDocuments(initialBootstrapData),
    });
  }, [hasStoredRecoveryHints, initialActiveDocId, initialBootstrapData, initialDocuments.length]);

  useEffect(() => {
    if (!shouldHydrateFromStorage) {
      setRecoveryFailure(null);
      setUnexpectedReloadState(deriveUnexpectedReloadState(initialBootstrapData));
      setIsRecovering(false);
      return;
    }

    let cancelled = false;

    const hydrateDocuments = async () => {
      setIsRecovering(true);
      recordAutosaveDebugEvent("hydrate_start", {
        hasInitialSavedData: Boolean(initialBootstrapData),
        hasStoredRecoveryHints,
        hasPointer: Boolean(readAutosavePointer()),
      });
      const hydratedResult = await hydrateSavedData();
      const hydratedData = hydratedResult.data;
      const treatAsRecoveryFailure = hydratedResult.hadRecoveryHints && !hydratedResult.isMeaningful;

      if (
        cancelled
        || !hydratedData
        || hasUserMutatedRef.current
        || hydratedData.documents.length === 0
        || treatAsRecoveryFailure
      ) {
        if (!cancelled) {
          setIsRecovering(false);
          setUnexpectedReloadState(deriveUnexpectedReloadState(hydratedData));
          setRecoveryFailure(
            hydratedResult.hadRecoveryHints
              ? {
                candidateCount: hydratedResult.candidateCount,
                hadRecoveryHints: hydratedResult.hadRecoveryHints,
                source: hydratedResult.source,
              }
              : null,
          );
        }
        recordAutosaveDebugEvent("hydrate_result", {
          cancelled,
          docCount: hydratedData?.documents.length ?? 0,
          outcome: cancelled
            ? "cancelled"
            : hasUserMutatedRef.current
              ? "ignored_after_mutation"
              : treatAsRecoveryFailure
                ? "meaningful_restore_missing"
              : "no_data",
        });
        return;
      }

      const nextDocuments = hydratedData.documents;
      const nextActiveDocId = nextDocuments.some((document) => document.id === hydratedData.activeDocId)
        ? hydratedData.activeDocId
        : nextDocuments[0].id;
      const nextSnapshotKey = JSON.stringify({
        activeDocId: nextActiveDocId,
        documents: nextDocuments,
        version: 2,
      });

      if (nextSnapshotKey === lastSavedSnapshotKeyRef.current) {
        recordAutosaveDebugEvent("hydrate_result", {
          docCount: nextDocuments.length,
          outcome: "snapshot_unchanged",
        });
        return;
      }

      documentsRef.current = nextDocuments;
      activeDocIdRef.current = nextActiveDocId;
      lastSavedAtRef.current = hydratedData.lastSaved;
      lastSavedSnapshotKeyRef.current = nextSnapshotKey;
      clearDirtyDocuments();
      setDocuments(nextDocuments);
      setActiveDocId(nextActiveDocId);
      setHasRestoredDocuments(hasMeaningfulSavedDocuments(hydratedData));
      setRecoveryFailure(null);
      setIsRecovering(false);
      setAutoSaveState({
        error: null,
        lastSavedAt: hydratedData.lastSaved,
        status: "saved",
      });
      setEditorKey((key) => key + 1);
      setUnexpectedReloadState(deriveUnexpectedReloadState(hydratedData));
      recordAutosaveDebugEvent("hydrate_result", {
        activeDocId: nextActiveDocId,
        docCount: nextDocuments.length,
        outcome: "applied",
      });
    };

    void hydrateDocuments();

    return () => {
      cancelled = true;
    };
  }, [clearDirtyDocuments, deriveUnexpectedReloadState, hasStoredRecoveryHints, initialBootstrapData, shouldHydrateFromStorage]);

  const persistSnapshot = useCallback((
    nextDocuments: DocumentData[],
    nextActiveDocId: string,
    lastSavedOverride?: number,
    options?: {
      reason?: "autosave" | "manual" | "reset" | "pagehide" | "beforeunload";
      useUnloadFallback?: boolean;
    },
  ) => {
    if (nextDocuments.length === 0) {
      return { ok: true, savedAt: lastSavedOverride ?? Date.now() };
    }

    const snapshot = {
      version: 2,
      documents: nextDocuments,
      activeDocId: nextActiveDocId,
      lastSaved: lastSavedOverride ?? autoSaveState.lastSavedAt ?? Date.now(),
    } satisfies AutoSaveData;
    const dirtyDocumentIds = Array.from(dirtyDocumentIdsRef.current);
    const result = options?.useUnloadFallback
      ? saveDataForUnload(snapshot, {
        dirtyDocumentIds,
        reason: options.reason,
      })
      : saveData(snapshot, {
        dirtyDocumentIds,
        reason: options?.reason,
      });

    if (isAutoSaveWriteFailure(result)) {
      const { error } = result;

      setAutoSaveState((previousState) => ({
        error,
        lastSavedAt: previousState.lastSavedAt,
        status: "error",
      }));
      return result;
    }

    clearDirtyDocuments();
    setAutoSaveState({
      error: null,
      lastSavedAt: result.savedAt,
      status: "saved",
    });
    lastSavedSnapshotKeyRef.current = JSON.stringify({
      activeDocId: nextActiveDocId,
      documents: nextDocuments,
      version: 2,
    });
    return result;
  }, [autoSaveState.lastSavedAt, clearDirtyDocuments]);

  const saveImmediate = useCallback(() => {
    if (documents.length === 0) {
      return;
    }

    persistSnapshot(documents, activeDocId, undefined, { reason: "manual" });
  }, [activeDocId, documents, persistSnapshot]);

  const resetDocuments = useCallback(() => {
    const replacementDocument = createNewDocument();
    const nextDocuments = [replacementDocument];
    const snapshotKey = JSON.stringify({
      activeDocId: replacementDocument.id,
      documents: nextDocuments,
      version: 2 as const,
    });

    clearSavedData();
    documentsRef.current = nextDocuments;
    activeDocIdRef.current = replacementDocument.id;
    dirtyDocumentIdsRef.current = new Set([replacementDocument.id]);
    hasUserMutatedRef.current = true;
    setRecoveryFailure(null);
    setIsRecovering(false);
    setUnexpectedReloadState(null);
    setDocuments(nextDocuments);
    setActiveDocId(replacementDocument.id);
    setEditorKey((key) => key + 1);

    const result = saveData({
      activeDocId: replacementDocument.id,
      documents: nextDocuments,
      lastSaved: Date.now(),
      version: 2,
    }, {
      reason: "reset",
    });

    if (isAutoSaveWriteFailure(result)) {
      const { error } = result;

      lastSavedSnapshotKeyRef.current = null;
      setAutoSaveState((previousState) => ({
        error,
        lastSavedAt: previousState.lastSavedAt,
        status: "error",
      }));
      return;
    }

    lastSavedAtRef.current = result.savedAt;
    lastSavedSnapshotKeyRef.current = snapshotKey;
    setAutoSaveState({
      error: null,
      lastSavedAt: result.savedAt,
      status: "saved",
    });
  }, []);

  const bumpEditorKey = useCallback(() => {
    setEditorKey((key) => key + 1);
  }, []);

  const resolveUniqueDocumentId = useCallback((requestedId: string, replaceDocumentId?: string) => {
    const occupiedIds = new Set(
      documents
        .filter((document) => document.id !== replaceDocumentId)
        .map((document) => document.id),
    );
    let nextId = requestedId;

    while (occupiedIds.has(nextId)) {
      nextId = crypto.randomUUID();
    }

    return nextId;
  }, [documents]);

  const updateActiveDoc = useCallback((patch: Partial<DocumentData>) => {
    if (documents.length === 0) {
      return;
    }

    const hasChanges = Object.entries(patch).some(([key, value]) => !areValuesEqual(activeDoc[key as keyof DocumentData], value));

    if (!hasChanges) {
      return;
    }

    setDocuments((previousDocuments) =>
      previousDocuments.map((doc) => {
        if (doc.id !== activeDocId) {
          return doc;
        }

        const nextWorkspaceBinding = doc.workspaceBinding && patch.content !== undefined && patch.content !== doc.content
          ? {
            ...doc.workspaceBinding,
            syncWarnings: undefined,
            syncStatus: "dirty_local" as const,
          }
          : patch.workspaceBinding ?? doc.workspaceBinding;

        return {
          ...doc,
          ...patch,
          updatedAt: patch.updatedAt ?? Date.now(),
          workspaceBinding: nextWorkspaceBinding,
        };
      })
    );
    markDocumentDirty(activeDocId);
    markAutosavePending();
  }, [activeDoc, activeDocId, documents.length, markAutosavePending, markDocumentDirty]);

  const updateDocument = useCallback((documentId: string, patch: Partial<DocumentData>) => {
    if (documents.length === 0) {
      return;
    }

    const targetDocument = documents.find((document) => document.id === documentId);

    if (!targetDocument) {
      return;
    }

    const hasChanges = Object.entries(patch)
      .some(([key, value]) => !areValuesEqual(targetDocument[key as keyof DocumentData], value));

    if (!hasChanges) {
      return;
    }

    setDocuments((previousDocuments) =>
      previousDocuments.map((document) => {
        if (document.id !== documentId) {
          return document;
        }

        return {
          ...document,
          ...patch,
          updatedAt: patch.updatedAt ?? document.updatedAt,
        };
      }),
    );
    markDocumentDirty(documentId);
    markAutosavePending();
  }, [documents, markAutosavePending, markDocumentDirty]);

  const handleContentChange = useCallback((content: string) => {
    if (documents.length === 0) {
      return;
    }

    const sourceSnapshots = {
      ...(activeDoc.sourceSnapshots || {}),
      [activeDoc.mode]: content,
    };

    if (activeDoc.content === content && areValuesEqual(activeDoc.sourceSnapshots, sourceSnapshots)) {
      return;
    }

    setDocuments((previousDocuments) =>
      previousDocuments.map((doc) => {
        if (doc.id !== activeDocId) {
          return doc;
        }

        return {
          ...doc,
          content,
          sourceSnapshots,
          storageKind: doc.storageKind ?? "docsy",
          updatedAt: Date.now(),
          workspaceBinding: doc.workspaceBinding
            ? {
              ...doc.workspaceBinding,
              syncStatus: "dirty_local",
            }
            : doc.workspaceBinding,
        };
      })
    );
    markDocumentDirty(activeDocId);
    markAutosavePending();
  }, [activeDoc, activeDocId, documents.length, markAutosavePending, markDocumentDirty]);

  const createDocument = useCallback((options: CreateDocumentOptions = {}) => {
    const {
      ast = null,
      content = "",
      createdAt,
      id,
      metadata = {},
      mode = "markdown",
      name = "Untitled",
      replaceDocumentId,
      sourceSnapshots,
      storageKind = "docsy",
      tiptapJson = null,
      workspaceBinding,
      updatedAt,
    } = options;

    const baseDocument = createNewDocument(name, mode);
    const resolvedId = resolveUniqueDocumentId(id ?? baseDocument.id, replaceDocumentId);
    const newDoc: DocumentData = {
      ...baseDocument,
      ast,
      content,
      createdAt: createdAt ?? baseDocument.createdAt,
      id: resolvedId,
      metadata,
      mode,
      name,
      sourceSnapshots: {
        ...(baseDocument.sourceSnapshots || {}),
        ...(sourceSnapshots || {}),
        [mode]: content,
      },
      storageKind,
      tiptapJson,
      updatedAt: updatedAt ?? Date.now(),
      workspaceBinding,
    };

    const nextDocuments = replaceDocumentId && documents.some((document) => document.id === replaceDocumentId)
      ? documents.map((document) => document.id === replaceDocumentId ? newDoc : document)
      : [...documents, newDoc];

    documentsRef.current = nextDocuments;
    activeDocIdRef.current = newDoc.id;
    markDocumentsDirty(nextDocuments.map((document) => document.id));
    setRecoveryFailure(null);
    setIsRecovering(false);
    setUnexpectedReloadState(null);
    setDocuments(nextDocuments);
    setActiveDocId(newDoc.id);
    setEditorKey((key) => key + 1);
    persistSnapshot(nextDocuments, newDoc.id);

    return newDoc;
  }, [documents, markDocumentsDirty, persistSnapshot, resolveUniqueDocumentId]);

  useEffect(() => {
    const flushSnapshot = (reason: "pagehide" | "beforeunload") => {
      const snapshot = {
        activeDocId: activeDocIdRef.current,
        documents: documentsRef.current,
        version: 2 as const,
      };
      const snapshotKey = JSON.stringify(snapshot);
      const pending = snapshotKey !== lastSavedSnapshotKeyRef.current;

      recordAutosaveDebugEvent(reason === "pagehide" ? "pagehide_flush" : "beforeunload_flush", {
        activeDocId: activeDocIdRef.current,
        docCount: documentsRef.current.length,
        pending,
      });

      if (!pending) {
        return;
      }

      persistSnapshot(
        documentsRef.current,
        activeDocIdRef.current,
        lastSavedAtRef.current ?? Date.now(),
        {
          reason,
          useUnloadFallback: true,
        },
      );
    };

    const handlePageHide = () => {
      flushSnapshot("pagehide");
    };

    const handleBeforeUnload = () => {
      flushSnapshot("beforeunload");
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      flushSnapshot("beforeunload");
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [persistSnapshot]);

  const selectDocument = useCallback((id: string) => {
    if (documents.length === 0) {
      return;
    }

    saveImmediate();
    hasUserMutatedRef.current = true;
    setActiveDocId(id);
    setEditorKey((key) => key + 1);
  }, [documents.length, saveImmediate]);

  const closeDocument = useCallback((id: string) => {
    if (documents.length === 0) {
      return;
    }

    setDocuments((previousDocuments) => {
      if (previousDocuments.length <= 1) {
      return previousDocuments;
    }

    const nextDocuments = previousDocuments.filter((doc) => doc.id !== id);

      if (id === activeDocId) {
        const closingIndex = previousDocuments.findIndex((doc) => doc.id === id);
        const nextActiveDoc = nextDocuments[Math.min(closingIndex, nextDocuments.length - 1)];

        if (nextActiveDoc) {
          setActiveDocId(nextActiveDoc.id);
          setEditorKey((key) => key + 1);
        }
      }

      return nextDocuments;
    });
    hasUserMutatedRef.current = true;
    markAutosavePending();
  }, [activeDocId, documents.length, markAutosavePending]);

  const deleteDocument = useCallback((id: string) => {
    if (documents.length === 0) {
      return;
    }

    let nextActiveDocumentId: string | null = null;
    let shouldResetEditor = false;

    if (documents.length <= 1) {
      const replacementDocument = createNewDocument();
      nextActiveDocumentId = replacementDocument.id;
      shouldResetEditor = true;
      dirtyDocumentIdsRef.current = new Set([replacementDocument.id]);
      hasUserMutatedRef.current = true;
      setDocuments([replacementDocument]);
    } else {
      const deleteIndex = documents.findIndex((document) => document.id === id);

      if (deleteIndex === -1) {
        return;
      }

      const nextDocuments = documents.filter((document) => document.id !== id);

      if (id === activeDocId) {
        nextActiveDocumentId = nextDocuments[Math.min(deleteIndex, nextDocuments.length - 1)]?.id || null;
        shouldResetEditor = true;
      }

      setDocuments(nextDocuments);
      hasUserMutatedRef.current = true;
    }

    if (nextActiveDocumentId) {
      setActiveDocId(nextActiveDocumentId);
    }

    if (shouldResetEditor) {
      setEditorKey((key) => key + 1);
    }

    markAutosavePending();
  }, [activeDocId, documents, markAutosavePending]);

  const renameDocument = useCallback((id: string, name: string) => {
    setDocuments((previousDocuments) =>
      previousDocuments.map((doc) => doc.id === id ? { ...doc, name, updatedAt: Date.now() } : doc)
    );
    markDocumentDirty(id);
    markAutosavePending();
  }, [markAutosavePending, markDocumentDirty]);

  return {
    activeDoc,
    activeDocId,
    autoSaveState,
    bumpEditorKey,
    closeDocument,
    createDocument,
    deleteDocument,
    documents,
    editorKey,
    handleContentChange,
    hasRestoredDocuments,
    isRecovering,
    recoveryFailure,
    renameDocument,
    resetDocuments,
    selectDocument,
    unexpectedReloadState,
    updateDocument,
    updateActiveDoc,
  };
};
