import { useEffect, useRef } from "react";
import type { AutoSaveData, DocumentData, EditorMode } from "@/types/document";
import { migrateStoredDocumentData } from "@/lib/documents/storedDocument";

const STORAGE_KEY = "docsy-autosave-v2";
const LEGACY_STORAGE_KEY = "docsy-autosave";

const isEditorMode = (value: unknown): value is EditorMode =>
  value === "markdown" || value === "latex" || value === "html" || value === "json" || value === "yaml";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeLegacyDocument = (value: unknown): DocumentData | null => {
  if (!isRecord(value)) {
    return null;
  }

  const mode = isEditorMode(value.mode) ? value.mode : "markdown";

  if (typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }

  return migrateStoredDocumentData({
    id: value.id,
    name: value.name,
    mode,
    content: typeof value.content === "string" ? value.content : "",
    createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
    ast: value.ast ?? null,
    metadata: isRecord(value.metadata) ? value.metadata : undefined,
    sourceSnapshots: isRecord(value.sourceSnapshots) ? value.sourceSnapshots as DocumentData["sourceSnapshots"] : undefined,
    storageKind: value.storageKind === "docsy" || value.storageKind === "legacy" ? value.storageKind : undefined,
    tiptapJson: isRecord(value.tiptapJson) ? value.tiptapJson : null,
  });
};

const isAutoSaveData = (value: unknown): value is AutoSaveData =>
  isRecord(value)
  && value.version === 2
  && Array.isArray(value.documents)
  && typeof value.activeDocId === "string"
  && typeof value.lastSaved === "number";

export const createNewDocument = (name = "Untitled", mode: EditorMode = "markdown"): DocumentData => ({
  id: crypto.randomUUID(),
  name,
  mode,
  content: "",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ast: null,
  metadata: {},
  sourceSnapshots: { [mode]: "" },
  storageKind: "docsy",
  tiptapJson: null,
});

export const migrateLegacyAutoSaveData = (raw: unknown): AutoSaveData | null => {
  if (isAutoSaveData(raw)) {
    return {
      ...raw,
      documents: raw.documents.map(migrateStoredDocumentData),
    };
  }

  if (!isRecord(raw) || !Array.isArray(raw.documents) || typeof raw.activeDocId !== "string") {
    return null;
  }

  const documents = raw.documents
    .map(normalizeLegacyDocument)
    .filter((document): document is DocumentData => Boolean(document));

  if (!documents.length) {
    return null;
  }

  return {
    version: 2,
    documents,
    activeDocId: documents.some((document) => document.id === raw.activeDocId)
      ? raw.activeDocId
      : documents[0].id,
    lastSaved: typeof raw.lastSaved === "number" ? raw.lastSaved : Date.now(),
  };
};

export const loadSavedData = (): AutoSaveData | null => {
  try {
    const nextRaw = localStorage.getItem(STORAGE_KEY);

    if (nextRaw) {
      const migrated = migrateLegacyAutoSaveData(JSON.parse(nextRaw) as unknown);

      if (migrated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...migrated, lastSaved: Date.now() }));
        return migrated;
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);

    if (!legacyRaw) {
      return null;
    }

    const migrated = migrateLegacyAutoSaveData(JSON.parse(legacyRaw) as unknown);

    if (!migrated) {
      return null;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...migrated, lastSaved: Date.now() }));
    localStorage.removeItem(LEGACY_STORAGE_KEY);

    return migrated;
  } catch {
    return null;
  }
};

export interface AutoSaveWriteSuccess {
  ok: true;
  savedAt: number;
}

export interface AutoSaveWriteFailure {
  ok: false;
  error: string;
}

export type AutoSaveWriteResult = AutoSaveWriteSuccess | AutoSaveWriteFailure;

export const getAutoSaveSnapshotKey = (data: AutoSaveData) => JSON.stringify({
  activeDocId: data.activeDocId,
  documents: data.documents,
  version: data.version,
});

export const saveData = (data: AutoSaveData): AutoSaveWriteResult => {
  const savedAt = Date.now();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...data,
      version: 2,
      lastSaved: savedAt,
    }));
    return { ok: true, savedAt };
  } catch {
    return {
      error: "Autosave failed because local storage is unavailable or full.",
      ok: false,
    };
  }
};

interface UseAutoSaveOptions {
  onError?: (error: string) => void;
  onSaved?: (savedAt: number) => void;
  onSaving?: () => void;
}

export const useAutoSave = (
  data: AutoSaveData | null,
  intervalMs = 3000,
  options: UseAutoSaveOptions = {},
) => {
  const dataRef = useRef(data);
  const optionsRef = useRef(options);
  const lastSavedSnapshotRef = useRef<string | null>(
    data && data.lastSaved > 0 ? getAutoSaveSnapshotKey(data) : null,
  );

  dataRef.current = data;
  optionsRef.current = options;

  useEffect(() => {
    lastSavedSnapshotRef.current = data && data.lastSaved > 0 ? getAutoSaveSnapshotKey(data) : null;
  }, [data?.lastSaved]);

  useEffect(() => {
    if (!data) return;
    const timer = setInterval(() => {
      if (!dataRef.current) {
        return;
      }

      const snapshotKey = getAutoSaveSnapshotKey(dataRef.current);

      if (snapshotKey === lastSavedSnapshotRef.current) {
        return;
      }

      optionsRef.current.onSaving?.();
      const result = saveData(dataRef.current);

      if (result.ok) {
        lastSavedSnapshotRef.current = snapshotKey;
        optionsRef.current.onSaved?.(result.savedAt);
        return;
      }

      optionsRef.current.onError?.(result.error);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [data, intervalMs]);
};

export type { AutoSaveData, DocumentData };
