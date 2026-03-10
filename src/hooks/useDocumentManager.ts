import { useCallback, useMemo, useState } from "react";
import type {
  AutoSaveData,
  AutoSaveIndicatorState,
  CreateDocumentOptions,
  DocumentData,
} from "@/types/document";
import {
  createNewDocument,
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

  const saveImmediate = useCallback(() => {
    const result = saveData({
      version: 2,
      documents,
      activeDocId,
      lastSaved: autoSaveState.lastSavedAt ?? Date.now(),
    });

    if (result.ok) {
      setAutoSaveState({
        error: null,
        lastSavedAt: result.savedAt,
        status: "saved",
      });
      return;
    }

    setAutoSaveState((previousState) => ({
      error: result.error,
      lastSavedAt: previousState.lastSavedAt,
      status: "error",
    }));
  }, [activeDocId, autoSaveState.lastSavedAt, documents]);

  const bumpEditorKey = useCallback(() => {
    setEditorKey((key) => key + 1);
  }, []);

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

        return {
          ...doc,
          ...patch,
          updatedAt: patch.updatedAt ?? Date.now(),
        };
      })
    );
    markAutosavePending();
  }, [activeDoc, activeDocId, markAutosavePending]);

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
      sourceSnapshots,
      storageKind = "docsy",
      tiptapJson = null,
      updatedAt,
    } = options;

    const baseDocument = createNewDocument(name, mode);
    const newDoc: DocumentData = {
      ...baseDocument,
      ast,
      content,
      createdAt: createdAt ?? baseDocument.createdAt,
      id: id ?? baseDocument.id,
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
    };

    setDocuments((previousDocuments) => [...previousDocuments, newDoc]);
    setActiveDocId(newDoc.id);
    setEditorKey((key) => key + 1);
    setAutoSaveState((previousState) => ({
      error: null,
      lastSavedAt: previousState.lastSavedAt,
      status: "saving",
    }));

    return newDoc;
  }, []);

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
    closeDocument(id);
  }, [closeDocument]);

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
    hasRestoredDocuments: Boolean(initialSavedData?.documents?.length),
    renameDocument,
    selectDocument,
    updateActiveDoc,
  };
};
