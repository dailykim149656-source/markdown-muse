import type { SourceSnapshotRecord } from "@/lib/knowledge/sourceFingerprint";

const SOURCE_SNAPSHOT_STORAGE_KEY = "docsy.source-snapshots.v1";

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const normalizeSnapshots = (value: unknown): SourceSnapshotRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (
        !entry
        || typeof entry !== "object"
        || typeof entry.documentId !== "string"
        || typeof entry.documentName !== "string"
        || typeof entry.fileName !== "string"
        || typeof entry.fingerprint !== "string"
        || typeof entry.indexedAt !== "number"
        || typeof entry.rawContentLength !== "number"
        || typeof entry.scannedAt !== "number"
        || typeof entry.sourceFormat !== "string"
      ) {
        return null;
      }

      return entry as SourceSnapshotRecord;
    })
    .filter((entry): entry is SourceSnapshotRecord => Boolean(entry))
    .sort((left, right) => right.scannedAt - left.scannedAt || left.documentName.localeCompare(right.documentName));
};

export const listSourceSnapshots = async (): Promise<SourceSnapshotRecord[]> => {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(SOURCE_SNAPSHOT_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    return normalizeSnapshots(JSON.parse(rawValue));
  } catch {
    return [];
  }
};

export const replaceSourceSnapshots = async (snapshots: SourceSnapshotRecord[]) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SOURCE_SNAPSHOT_STORAGE_KEY, JSON.stringify(normalizeSnapshots(snapshots)));
};

export const clearSourceSnapshots = async () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(SOURCE_SNAPSHOT_STORAGE_KEY);
};
