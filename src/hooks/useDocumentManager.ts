import { useCallback, useMemo, useState } from "react";
import type { AutoSaveData, CreateDocumentOptions, DocumentData } from "@/types/document";
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

  const activeDoc = useMemo(
    () => documents.find((doc) => doc.id === activeDocId) || documents[0],
    [documents, activeDocId]
  );

  const autoSaveData = useMemo<AutoSaveData>(() => ({
    version: 2,
    documents,
    activeDocId,
    lastSaved: Date.now(),
  }), [documents, activeDocId]);

  useAutoSave(autoSaveData);

  const saveImmediate = useCallback(() => {
    saveData({ version: 2, documents, activeDocId, lastSaved: Date.now() });
  }, [documents, activeDocId]);

  const bumpEditorKey = useCallback(() => {
    setEditorKey((key) => key + 1);
  }, []);

  const updateActiveDoc = useCallback((patch: Partial<DocumentData>) => {
    setDocuments((previousDocuments) =>
      previousDocuments.map((doc) => {
        if (doc.id !== activeDocId) {
          return doc;
        }

        const hasChanges = Object.entries(patch).some(([key, value]) => !areValuesEqual(doc[key as keyof DocumentData], value));

        if (!hasChanges) {
          return doc;
        }

        return {
          ...doc,
          ...patch,
          updatedAt: patch.updatedAt ?? Date.now(),
        };
      })
    );
  }, [activeDocId]);

  const handleContentChange = useCallback((content: string) => {
    setDocuments((previousDocuments) =>
      previousDocuments.map((doc) => {
        if (doc.id !== activeDocId) {
          return doc;
        }

        const sourceSnapshots = {
          ...(doc.sourceSnapshots || {}),
          [doc.mode]: content,
        };

        if (doc.content === content && areValuesEqual(doc.sourceSnapshots, sourceSnapshots)) {
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
  }, [activeDocId]);

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
  }, [activeDocId]);

  const deleteDocument = useCallback((id: string) => {
    closeDocument(id);
  }, [closeDocument]);

  const renameDocument = useCallback((id: string, name: string) => {
    setDocuments((previousDocuments) =>
      previousDocuments.map((doc) => doc.id === id ? { ...doc, name, updatedAt: Date.now() } : doc)
    );
  }, []);

  return {
    activeDoc,
    activeDocId,
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
