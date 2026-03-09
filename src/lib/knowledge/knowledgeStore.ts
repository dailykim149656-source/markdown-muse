import { coerceKnowledgeRecord, type KnowledgeDocumentRecord } from "@/lib/knowledge/knowledgeIndex";

const DATABASE_NAME = "docsy-knowledge-index";
const DATABASE_VERSION = 2;
const STORE_NAME = "documents";
const FALLBACK_STORAGE_KEY = "docsy-knowledge-index-fallback-v2";
const LEGACY_FALLBACK_STORAGE_KEY = "docsy-knowledge-index-fallback-v1";

let databasePromise: Promise<IDBDatabase> | null = null;

const hasIndexedDb = () =>
  typeof window !== "undefined"
  && typeof window.indexedDB !== "undefined";

const readFallbackRecords = (): KnowledgeDocumentRecord[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY)
      || window.localStorage.getItem(LEGACY_FALLBACK_STORAGE_KEY);
    return raw
      ? (JSON.parse(raw) as unknown[]).map(coerceKnowledgeRecord).filter((record): record is KnowledgeDocumentRecord => Boolean(record))
      : [];
  } catch {
    return [];
  }
};

const writeFallbackRecords = (records: KnowledgeDocumentRecord[]) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(records));
    window.localStorage.removeItem(LEGACY_FALLBACK_STORAGE_KEY);
  } catch {
    // best effort fallback persistence
  }
};

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

const openDatabase = async () => {
  if (!hasIndexedDb()) {
    return null;
  }

  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "documentId" });
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

export const listKnowledgeRecords = async (): Promise<KnowledgeDocumentRecord[]> => {
  const database = await openDatabase();

  if (!database) {
    return readFallbackRecords();
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const records = await requestToPromise(store.getAll());
    await transactionToPromise(transaction);

    return (records as unknown[])
      .map(coerceKnowledgeRecord)
      .filter((record): record is KnowledgeDocumentRecord => Boolean(record))
      .sort((left, right) =>
      right.updatedAt - left.updatedAt
      || left.fileName.localeCompare(right.fileName));
  } catch {
    return readFallbackRecords();
  }
};

export const upsertKnowledgeRecords = async (records: KnowledgeDocumentRecord[]) => {
  if (records.length === 0) {
    return;
  }

  const database = await openDatabase();

  if (!database) {
    const existing = readFallbackRecords();
    const merged = new Map(existing.map((record) => [record.documentId, record]));

    for (const record of records) {
      merged.set(record.documentId, record);
    }

    writeFallbackRecords(Array.from(merged.values()));
    return;
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    for (const record of records) {
      store.put(record);
    }

    await transactionToPromise(transaction);
  } catch {
    const existing = readFallbackRecords();
    const merged = new Map(existing.map((record) => [record.documentId, record]));

    for (const record of records) {
      merged.set(record.documentId, record);
    }

    writeFallbackRecords(Array.from(merged.values()));
  }
};

export const removeKnowledgeRecord = async (documentId: string) => {
  const database = await openDatabase();

  if (!database) {
    writeFallbackRecords(readFallbackRecords().filter((record) => record.documentId !== documentId));
    return;
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(documentId);
    await transactionToPromise(transaction);
  } catch {
    writeFallbackRecords(readFallbackRecords().filter((record) => record.documentId !== documentId));
  }
};

export const clearKnowledgeRecords = async () => {
  const database = await openDatabase();

  if (!database) {
    writeFallbackRecords([]);
    return;
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    await transactionToPromise(transaction);
  } catch {
    writeFallbackRecords([]);
  }
};
