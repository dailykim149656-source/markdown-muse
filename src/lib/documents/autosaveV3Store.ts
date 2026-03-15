import type { AutoSaveData, AutosaveManifestV3, DocumentData, StoredDocumentRecordV3 } from "@/types/document";
import { migrateStoredDocumentData } from "@/lib/documents/storedDocument";

const DATABASE_NAME = "docsy-autosave-v3";
const DATABASE_VERSION = 1;
const DOCUMENT_STORE_NAME = "documents";
const META_STORE_NAME = "meta";
const MANIFEST_KEY = "manifest";
export const DOCSY_AUTOSAVE_POINTER_STORAGE_KEY = "docsy-autosave-v3-pointer";

let databasePromise: Promise<IDBDatabase> | null = null;

const hasIndexedDb = () =>
  typeof window !== "undefined"
  && typeof window.indexedDB !== "undefined";

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });

const transactionToPromise = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const openDatabase = async () => {
  if (!hasIndexedDb()) {
    return null;
  }

  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(DOCUMENT_STORE_NAME)) {
          database.createObjectStore(DOCUMENT_STORE_NAME, { keyPath: "documentId" });
        }

        if (!database.objectStoreNames.contains(META_STORE_NAME)) {
          database.createObjectStore(META_STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };

      request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
    });
  }

  try {
    return await databasePromise;
  } catch {
    databasePromise = null;
    return null;
  }
};

const coerceStoredDocumentRecord = (candidate: unknown): StoredDocumentRecordV3 | null => {
  if (!isRecord(candidate) || typeof candidate.documentId !== "string" || !isRecord(candidate.document)) {
    return null;
  }

  const updatedAt = typeof candidate.updatedAt === "number"
    ? candidate.updatedAt
    : typeof candidate.document.updatedAt === "number"
      ? candidate.document.updatedAt
      : Date.now();

  return {
    document: migrateStoredDocumentData(candidate.document as unknown as DocumentData),
    documentId: candidate.documentId,
    updatedAt,
  };
};

const coerceManifest = (candidate: unknown): AutosaveManifestV3 | null => {
  if (
    !isRecord(candidate)
    || candidate.version !== 3
    || typeof candidate.activeDocId !== "string"
    || typeof candidate.lastSaved !== "number"
    || !Array.isArray(candidate.documentIds)
  ) {
    return null;
  }

  return {
    activeDocId: candidate.activeDocId,
    documentIds: candidate.documentIds.filter((documentId): documentId is string => typeof documentId === "string"),
    lastSaved: candidate.lastSaved,
    version: 3,
  };
};

export const readAutosavePointer = (): AutosaveManifestV3 | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return coerceManifest(JSON.parse(window.localStorage.getItem(DOCSY_AUTOSAVE_POINTER_STORAGE_KEY) || "null"));
  } catch {
    return null;
  }
};

export const writeAutosavePointer = (manifest: AutosaveManifestV3) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DOCSY_AUTOSAVE_POINTER_STORAGE_KEY, JSON.stringify(manifest));
  } catch {
    // best effort
  }
};

export const clearAutosavePointer = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(DOCSY_AUTOSAVE_POINTER_STORAGE_KEY);
  } catch {
    // best effort
  }
};

const buildManifest = (data: AutoSaveData, lastSaved: number): AutosaveManifestV3 => ({
  activeDocId: data.activeDocId,
  documentIds: data.documents.map((document) => document.id),
  lastSaved,
  version: 3,
});

export const readAutosaveV3Snapshot = async (): Promise<AutoSaveData | null> => {
  const database = await openDatabase();

  if (!database) {
    return null;
  }

  try {
    const metaTransaction = database.transaction(META_STORE_NAME, "readonly");
    const manifest = coerceManifest(await requestToPromise(metaTransaction.objectStore(META_STORE_NAME).get(MANIFEST_KEY)));
    await transactionToPromise(metaTransaction);

    if (!manifest || manifest.documentIds.length === 0) {
      return null;
    }

    const documentTransaction = database.transaction(DOCUMENT_STORE_NAME, "readonly");
    const documentStore = documentTransaction.objectStore(DOCUMENT_STORE_NAME);
    const records = await Promise.all(
      manifest.documentIds.map(async (documentId) =>
        coerceStoredDocumentRecord(await requestToPromise(documentStore.get(documentId)))),
    );
    await transactionToPromise(documentTransaction);

    const documents = records
      .filter((record): record is StoredDocumentRecordV3 => Boolean(record))
      .map((record) => record.document);

    if (documents.length === 0) {
      return null;
    }

    return {
      activeDocId: documents.some((document) => document.id === manifest.activeDocId)
        ? manifest.activeDocId
        : documents[0].id,
      documents,
      lastSaved: manifest.lastSaved,
      version: 2,
    };
  } catch {
    return null;
  }
};

export const writeAutosaveV3Snapshot = async (
  data: AutoSaveData,
  options?: { dirtyDocumentIds?: string[]; lastSaved?: number },
) => {
  const database = await openDatabase();

  if (!database) {
    return false;
  }

  const lastSaved = options?.lastSaved ?? data.lastSaved ?? Date.now();
  const manifest = buildManifest(data, lastSaved);
  const dirtyDocumentIds = new Set(options?.dirtyDocumentIds ?? data.documents.map((document) => document.id));

  try {
    const existingManifestTransaction = database.transaction(META_STORE_NAME, "readonly");
    const previousManifest = coerceManifest(
      await requestToPromise(existingManifestTransaction.objectStore(META_STORE_NAME).get(MANIFEST_KEY)),
    );
    await transactionToPromise(existingManifestTransaction);

    const transaction = database.transaction([DOCUMENT_STORE_NAME, META_STORE_NAME], "readwrite");
    const documentStore = transaction.objectStore(DOCUMENT_STORE_NAME);
    const metaStore = transaction.objectStore(META_STORE_NAME);

    for (const document of data.documents) {
      if (!dirtyDocumentIds.has(document.id)) {
        continue;
      }

      documentStore.put({
        document: migrateStoredDocumentData(document),
        documentId: document.id,
        updatedAt: document.updatedAt,
      } satisfies StoredDocumentRecordV3);
    }

    for (const removedDocumentId of previousManifest?.documentIds || []) {
      if (!manifest.documentIds.includes(removedDocumentId)) {
        documentStore.delete(removedDocumentId);
      }
    }

    metaStore.put(manifest, MANIFEST_KEY);
    await transactionToPromise(transaction);
    writeAutosavePointer(manifest);
    return true;
  } catch {
    return false;
  }
};

export const clearAutosaveV3Snapshot = async () => {
  clearAutosavePointer();
  const database = await openDatabase();

  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction([DOCUMENT_STORE_NAME, META_STORE_NAME], "readwrite");
    transaction.objectStore(DOCUMENT_STORE_NAME).clear();
    transaction.objectStore(META_STORE_NAME).clear();
    await transactionToPromise(transaction);
  } catch {
    // best effort
  }
};
