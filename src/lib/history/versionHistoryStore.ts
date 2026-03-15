import type { DocumentVersionSnapshot } from "@/types/document";

const DATABASE_NAME = "docsy-version-history";
const DATABASE_VERSION = 1;
const STORE_NAME = "snapshots";
const DOCUMENT_ID_INDEX = "documentId";
const FALLBACK_STORAGE_KEY = "docsy-version-history-fallback-v1";

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

export const coerceDocumentVersionSnapshot = (candidate: unknown): DocumentVersionSnapshot | null => {
  if (!isRecord(candidate)) {
    return null;
  }

  if (
    typeof candidate.snapshotId !== "string"
    || typeof candidate.documentId !== "string"
    || typeof candidate.createdAt !== "number"
    || typeof candidate.mode !== "string"
    || (candidate.trigger !== "autosave" && candidate.trigger !== "export" && candidate.trigger !== "patch_apply")
    || typeof candidate.contentHash !== "string"
    || !isRecord(candidate.document)
  ) {
    return null;
  }

  return candidate as unknown as DocumentVersionSnapshot;
};

const readFallbackSnapshots = (): DocumentVersionSnapshot[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    return (JSON.parse(raw) as unknown[])
      .map(coerceDocumentVersionSnapshot)
      .filter((snapshot): snapshot is DocumentVersionSnapshot => Boolean(snapshot));
  } catch {
    return [];
  }
};

const writeFallbackSnapshots = (snapshots: DocumentVersionSnapshot[]) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(snapshots));
  } catch {
    // best effort fallback persistence
  }
};

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
          const store = database.createObjectStore(STORE_NAME, { keyPath: "snapshotId" });
          store.createIndex(DOCUMENT_ID_INDEX, "documentId", { unique: false });
          return;
        }

        const transaction = request.transaction;
        const store = transaction?.objectStore(STORE_NAME);

        if (store && !store.indexNames.contains(DOCUMENT_ID_INDEX)) {
          store.createIndex(DOCUMENT_ID_INDEX, "documentId", { unique: false });
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

const sortSnapshots = (snapshots: DocumentVersionSnapshot[]) =>
  [...snapshots].sort((left, right) =>
    right.createdAt - left.createdAt
    || right.snapshotId.localeCompare(left.snapshotId));

export const listDocumentVersionSnapshots = async (documentId: string): Promise<DocumentVersionSnapshot[]> => {
  const database = await openDatabase();

  if (!database) {
    return sortSnapshots(readFallbackSnapshots().filter((snapshot) => snapshot.documentId === documentId));
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index(DOCUMENT_ID_INDEX);
    const snapshots = await requestToPromise(index.getAll(documentId));
    await transactionToPromise(transaction);

    return sortSnapshots(
      (snapshots as unknown[])
        .map(coerceDocumentVersionSnapshot)
        .filter((snapshot): snapshot is DocumentVersionSnapshot => Boolean(snapshot)),
    );
  } catch {
    return sortSnapshots(readFallbackSnapshots().filter((snapshot) => snapshot.documentId === documentId));
  }
};

export const appendDocumentVersionSnapshot = async (
  snapshot: DocumentVersionSnapshot,
  limitPerDocument = 5,
) => {
  const database = await openDatabase();

  if (!database) {
    const existing = readFallbackSnapshots().filter((entry) => entry.documentId !== snapshot.documentId);
    const nextDocumentSnapshots = sortSnapshots([
      snapshot,
      ...readFallbackSnapshots().filter((entry) => entry.documentId === snapshot.documentId && entry.snapshotId !== snapshot.snapshotId),
    ]).slice(0, limitPerDocument);

    writeFallbackSnapshots([...existing, ...nextDocumentSnapshots]);
    return nextDocumentSnapshots;
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index(DOCUMENT_ID_INDEX);
    const existingSnapshots = (await requestToPromise(index.getAll(snapshot.documentId)) as unknown[])
      .map(coerceDocumentVersionSnapshot)
      .filter((entry): entry is DocumentVersionSnapshot => Boolean(entry));
    const nextSnapshots = sortSnapshots([
      snapshot,
      ...existingSnapshots.filter((entry) => entry.snapshotId !== snapshot.snapshotId),
    ]);

    store.put(snapshot);

    for (const staleSnapshot of nextSnapshots.slice(limitPerDocument)) {
      store.delete(staleSnapshot.snapshotId);
    }

    await transactionToPromise(transaction);
    return nextSnapshots.slice(0, limitPerDocument);
  } catch {
    const existing = readFallbackSnapshots().filter((entry) => entry.documentId !== snapshot.documentId);
    const nextDocumentSnapshots = sortSnapshots([
      snapshot,
      ...readFallbackSnapshots().filter((entry) => entry.documentId === snapshot.documentId && entry.snapshotId !== snapshot.snapshotId),
    ]).slice(0, limitPerDocument);

    writeFallbackSnapshots([...existing, ...nextDocumentSnapshots]);
    return nextDocumentSnapshots;
  }
};

export const upsertDocumentVersionSnapshot = async (
  snapshot: DocumentVersionSnapshot,
  limitPerDocument = 5,
) =>
  appendDocumentVersionSnapshot(snapshot, limitPerDocument);

export const clearDocumentVersionSnapshots = async (documentId?: string) => {
  const database = await openDatabase();

  if (!database) {
    const snapshots = documentId
      ? readFallbackSnapshots().filter((snapshot) => snapshot.documentId !== documentId)
      : [];
    writeFallbackSnapshots(snapshots);
    return;
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    if (!documentId) {
      store.clear();
      await transactionToPromise(transaction);
      return;
    }

    const index = store.index(DOCUMENT_ID_INDEX);
    const snapshots = (await requestToPromise(index.getAll(documentId)) as unknown[])
      .map(coerceDocumentVersionSnapshot)
      .filter((snapshot): snapshot is DocumentVersionSnapshot => Boolean(snapshot));

    for (const snapshot of snapshots) {
      store.delete(snapshot.snapshotId);
    }

    await transactionToPromise(transaction);
  } catch {
    const snapshots = documentId
      ? readFallbackSnapshots().filter((snapshot) => snapshot.documentId !== documentId)
      : [];
    writeFallbackSnapshots(snapshots);
  }
};
