import type { IngestionSourceFormat } from "@/lib/ingestion/contracts";
import type { KnowledgeDocumentRecord } from "@/lib/knowledge/knowledgeIndex";

export type SourceChangeType = "new" | "changed";

export interface SourceSnapshotRecord {
  documentId: string;
  documentName: string;
  fileName: string;
  fingerprint: string;
  indexedAt: number;
  rawContentLength: number;
  scannedAt: number;
  sourceFormat: IngestionSourceFormat;
}

export interface SourceChangeRecord {
  changeType: SourceChangeType;
  documentId: string;
  documentName: string;
  previousScannedAt?: number;
  scannedAt: number;
}

const hashString = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
};

export const createSourceFingerprint = (
  sourceFormat: IngestionSourceFormat,
  fileName: string,
  rawContent: string,
) => hashString(`${sourceFormat}\0${fileName}\0${rawContent}`);

export const buildSourceSnapshotRecordFromKnowledgeRecord = (
  record: KnowledgeDocumentRecord,
  scannedAt: number,
): SourceSnapshotRecord => ({
  documentId: record.documentId,
  documentName: record.normalizedDocument.metadata.title || record.fileName,
  fileName: record.fileName,
  fingerprint: createSourceFingerprint(record.sourceFormat, record.fileName, record.rawContent),
  indexedAt: record.indexedAt,
  rawContentLength: record.rawContent.length,
  scannedAt,
  sourceFormat: record.sourceFormat,
});

export const compareSourceSnapshots = (
  previousSnapshots: SourceSnapshotRecord[],
  nextSnapshots: SourceSnapshotRecord[],
): SourceChangeRecord[] => {
  const previousByDocumentId = new Map(previousSnapshots.map((snapshot) => [snapshot.documentId, snapshot]));

  return nextSnapshots
    .flatMap((snapshot) => {
      const previous = previousByDocumentId.get(snapshot.documentId);

      if (!previous) {
        return [{
          changeType: "new",
          documentId: snapshot.documentId,
          documentName: snapshot.documentName,
          scannedAt: snapshot.scannedAt,
        } satisfies SourceChangeRecord];
      }

      if (previous.fingerprint === snapshot.fingerprint) {
        return [];
      }

      return [{
        changeType: "changed",
        documentId: snapshot.documentId,
        documentName: snapshot.documentName,
        previousScannedAt: previous.scannedAt,
        scannedAt: snapshot.scannedAt,
      } satisfies SourceChangeRecord];
    })
    .sort((left, right) =>
      Number(left.changeType === "changed") - Number(right.changeType === "changed")
      || left.documentName.localeCompare(right.documentName));
};
