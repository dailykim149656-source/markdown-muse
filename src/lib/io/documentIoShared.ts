import type { CreateDocumentOptions, DocumentData } from "@/types/document";

export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const hasMeaningfulMetadata = (metadata: DocumentData["metadata"] | undefined) => {
  if (!metadata) {
    return false;
  }

  return Boolean(
    metadata.title
    || metadata.description
    || metadata.tags?.length
    || metadata.authors?.length
    || metadata.sourceFiles?.length
    || Object.keys(metadata.labels || {}).length,
  );
};

export const isReplaceableBlankDocument = (document: Pick<
  DocumentData,
  "ast" | "content" | "metadata" | "mode" | "name" | "sourceSnapshots" | "tiptapJson"
>) => {
  const primarySourceContent = document.sourceSnapshots?.[document.mode] || "";

  return (document.name || "").trim() === "Untitled"
    && document.content.trim().length === 0
    && primarySourceContent.trim().length === 0
    && !hasMeaningfulMetadata(document.metadata);
};

export const resolveImportedDocumentOptions = ({
  activeDocId,
  documents,
  importedDocument,
}: {
  activeDocId: string;
  documents: DocumentData[];
  importedDocument: CreateDocumentOptions;
}): CreateDocumentOptions => {
  const matchingDocument = importedDocument.id
    ? documents.find((document) => document.id === importedDocument.id) || null
    : null;

  if (matchingDocument) {
    return {
      ...importedDocument,
      replaceDocumentId: matchingDocument.id,
    };
  }

  if (documents.length !== 1) {
    return importedDocument;
  }

  const activeDocument = documents.find((document) => document.id === activeDocId) || documents[0];

  if (!activeDocument || !isReplaceableBlankDocument(activeDocument)) {
    return importedDocument;
  }

  return {
    ...importedDocument,
    replaceDocumentId: activeDocument.id,
  };
};
