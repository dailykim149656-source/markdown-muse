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
  hasMeaningfulSavedDocuments,
  isAutoSaveWriteFailure,
  loadSavedData,
  saveData,
  useAutoSave,
} from "@/components/editor/useAutoSave";

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

export const useDocumentManager = () => {
  const initialSavedData = useMemo(() => loadSavedData(), []);
  const initialDocuments = useMemo(
    () => initialSavedData?.documents?.length ? initialSavedData.documents : [createNewDocument()],
    [initialSavedData]
  );
  const initialActiveDocId = useMemo(() => {
    if (initialSavedData?.activeDocId && initialDocuments.some((doc) => doc.id === initialSavedData.activeDocId)) {
      return initialSavedData.activeDocId;
    }

    return initialDocuments[0].id;
  }, [initialDocuments, initialSavedData]);

  const [documents, setDocuments] = useState<DocumentData[]>(() => initialDocuments);
  const [activeDocId, setActiveDocId] = useState<string>(() => initialActiveDocId);
  const [editorKey, setEditorKey] = useState(0);
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveIndicatorState>(() => ({
    error: null,
    lastSavedAt: initialSavedData?.lastSaved ?? null,
    status: initialSavedData ? "saved" : "saving",
  }));
  const documentsRef = useRef(initialDocuments);
  const activeDocIdRef = useRef(initialActiveDocId);
  const lastSavedAtRef = useRef<number | null>(initialSavedData?.lastSaved ?? null);
  const lastSavedSnapshotKeyRef = useRef<string | null>(
    initialSavedData?.documents?.length
      ? JSON.stringify({
        activeDocId: initialActiveDocId,
        documents: initialDocuments,
        version: 2,
      })
      : null,
  );

  const activeDoc = useMemo(
    () => documents.find((doc) => doc.id === activeDocId) || documents[0],
    [documents, activeDocId]
  );

  const autoSaveData = useMemo<AutoSaveData>(() => ({
    version: 2,
    documents,
    activeDocId,
    lastSaved: autoSaveState.lastSavedAt ?? initialSavedData?.lastSaved ?? 0,
  }), [activeDocId, autoSaveState.lastSavedAt, documents, initialSavedData?.lastSaved]);

  const markAutosavePending = useCallback(() => {
    setAutoSaveState((previousState) => ({
      error: null,
      lastSavedAt: previousState.lastSavedAt,
      status: "saving",
    }));
  }, []);

  useAutoSave(autoSaveData, 3000, {
    onError: (error) => {
      setAutoSaveState((previousState) => ({
        error,
        lastSavedAt: previousState.lastSavedAt,
        status: "error",
      }));
    },
    onSaved: (savedAt) => {
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

  const persistSnapshot = useCallback((
    nextDocuments: DocumentData[],
    nextActiveDocId: string,
    lastSavedOverride?: number,
  ) => {
    const result = saveData({
      version: 2,
      documents: nextDocuments,
      activeDocId: nextActiveDocId,
      lastSaved: lastSavedOverride ?? autoSaveState.lastSavedAt ?? Date.now(),
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
  }, [autoSaveState.lastSavedAt]);

  const saveImmediate = useCallback(() => {
    persistSnapshot(documents, activeDocId);
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
    setDocuments(nextDocuments);
    setActiveDocId(replacementDocument.id);
    setEditorKey((key) => key + 1);

    const result = saveData({
      activeDocId: replacementDocument.id,
      documents: nextDocuments,
      lastSaved: Date.now(),
      version: 2,
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
    markAutosavePending();
  }, [activeDoc, activeDocId, markAutosavePending]);

  const updateDocument = useCallback((documentId: string, patch: Partial<DocumentData>) => {
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
    markAutosavePending();
  }, [documents, markAutosavePending]);

  const handleContentChange = useCallback((content: string) => {
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
    markAutosavePending();
  }, [activeDoc, activeDocId, markAutosavePending]);

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
    setDocuments(nextDocuments);
    setActiveDocId(newDoc.id);
    setEditorKey((key) => key + 1);
    persistSnapshot(nextDocuments, newDoc.id);

    return newDoc;
  }, [documents, persistSnapshot, resolveUniqueDocumentId]);

  useEffect(() => {
    const flushSnapshot = () => {
      const snapshot = {
        activeDocId: activeDocIdRef.current,
        documents: documentsRef.current,
        version: 2 as const,
      };
      const snapshotKey = JSON.stringify(snapshot);

      if (snapshotKey === lastSavedSnapshotKeyRef.current) {
        return;
      }

      persistSnapshot(
        documentsRef.current,
        activeDocIdRef.current,
        lastSavedAtRef.current ?? Date.now(),
      );
    };

    const handlePageHide = () => {
      flushSnapshot();
    };

    const handleBeforeUnload = () => {
      flushSnapshot();
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      flushSnapshot();
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [persistSnapshot]);

  const selectDocument = useCallback((id: string) => {
    saveImmediate();
    setActiveDocId(id);
    setEditorKey((key) => key + 1);
  }, [saveImmediate]);

  const closeDocument = useCallback((id: string) => {
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
    markAutosavePending();
  }, [activeDocId, markAutosavePending]);

  const deleteDocument = useCallback((id: string) => {
    let nextActiveDocumentId: string | null = null;
    let shouldResetEditor = false;

    if (documents.length <= 1) {
      const replacementDocument = createNewDocument();
      nextActiveDocumentId = replacementDocument.id;
      shouldResetEditor = true;
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
    markAutosavePending();
  }, [markAutosavePending]);

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
    hasRestoredDocuments: hasMeaningfulSavedDocuments(initialSavedData),
    renameDocument,
    resetDocuments,
    selectDocument,
    updateDocument,
    updateActiveDoc,
  };
};
