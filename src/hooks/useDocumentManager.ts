import { useCallback, useMemo, useState } from "react";
import {
  createNewDocument,
  loadSavedData,
  saveData,
  useAutoSave,
  type AutoSaveData,
  type DocumentData,
} from "@/components/editor/useAutoSave";

interface CreateDocumentOptions {
  content?: string;
  mode?: DocumentData["mode"];
  name?: string;
}

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
    documents,
    activeDocId,
    lastSaved: Date.now(),
  }), [documents, activeDocId]);

  useAutoSave(autoSaveData);

  const saveImmediate = useCallback(() => {
    saveData({ documents, activeDocId, lastSaved: Date.now() });
  }, [documents, activeDocId]);

  const bumpEditorKey = useCallback(() => {
    setEditorKey((key) => key + 1);
  }, []);

  const updateActiveDoc = useCallback((patch: Partial<DocumentData>) => {
    setDocuments((previousDocuments) =>
      previousDocuments.map((doc) => doc.id === activeDocId ? { ...doc, ...patch, updatedAt: Date.now() } : doc)
    );
  }, [activeDocId]);

  const handleContentChange = useCallback((content: string) => {
    updateActiveDoc({ content });
  }, [updateActiveDoc]);

  const createDocument = useCallback((options: CreateDocumentOptions = {}) => {
    const {
      content = "",
      mode = "markdown",
      name = "Untitled",
    } = options;

    const newDoc = createNewDocument(name, mode);
    newDoc.content = content;

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
