import type { JSONContent } from "@tiptap/core";
import type { DocumentAst, DocumentMetadata } from "./documentAst";

export type EditorMode = "markdown" | "latex" | "html" | "json" | "yaml";
export type StorageKind = "legacy" | "docsy";
export type SourceSnapshots = Partial<Record<EditorMode, string>>;

export interface DocumentData {
  id: string;
  name: string;
  mode: EditorMode;
  content: string;
  createdAt: number;
  updatedAt: number;
  ast?: DocumentAst | null;
  metadata?: DocumentMetadata;
  sourceSnapshots?: SourceSnapshots;
  storageKind?: StorageKind;
  tiptapJson?: JSONContent | null;
}

export interface AutoSaveData {
  version: 2;
  documents: DocumentData[];
  activeDocId: string;
  lastSaved: number;
}

export interface CreateDocumentOptions {
  ast?: DocumentAst | null;
  content?: string;
  createdAt?: number;
  id?: string;
  metadata?: DocumentMetadata;
  mode?: EditorMode;
  name?: string;
  sourceSnapshots?: SourceSnapshots;
  storageKind?: StorageKind;
  tiptapJson?: JSONContent | null;
  updatedAt?: number;
}
