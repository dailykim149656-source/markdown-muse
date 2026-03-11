import type { CreateDocumentOptions } from "./document";

export type WorkspaceProvider = "google_drive";

export type WorkspaceDocumentKind = "google_docs";

export type WorkspaceSyncStatus =
  | "local_only"
  | "imported"
  | "dirty_local"
  | "syncing"
  | "synced"
  | "conflict"
  | "error";

export interface WorkspaceBinding {
  documentKind: WorkspaceDocumentKind;
  driveModifiedTime?: string;
  fileId: string;
  importedAt: number;
  lastSyncedAt?: number;
  mimeType: string;
  provider: WorkspaceProvider;
  revisionId?: string;
  syncError?: string;
  syncStatus: WorkspaceSyncStatus;
}

export interface WorkspaceUserProfile {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
}

export interface WorkspaceAuthSession {
  connected: boolean;
  provider: WorkspaceProvider | null;
  user: WorkspaceUserProfile | null;
}

export interface GoogleConnectRequest {
  returnTo?: string;
}

export interface GoogleConnectResponse {
  authUrl: string;
  provider: WorkspaceProvider;
}

export interface WorkspaceFileListItem {
  fileId: string;
  iconLink?: string;
  mimeType: string;
  modifiedTime?: string;
  name: string;
  revisionId?: string;
  webViewLink?: string;
}

export interface WorkspaceFileListResponse {
  files: WorkspaceFileListItem[];
  nextCursor: string | null;
}

export interface WorkspaceImportResponse {
  document: CreateDocumentOptions;
}

export interface WorkspaceApplyRequest {
  baseRevisionId?: string;
  documentId: string;
  fileId: string;
  markdown: string;
}

export interface WorkspaceApplyResponse {
  appliedAt: number;
  driveModifiedTime?: string;
  ok: true;
  revisionId?: string;
  syncStatus: "synced";
  warnings: string[];
}

export interface WorkspaceRemoteChange {
  changeType: "changed";
  detectedAt: number;
  documentId: string;
  fileId: string;
  modifiedTime?: string;
  name: string;
  revisionId?: string;
}

export interface WorkspaceChangesResponse {
  changes: WorkspaceRemoteChange[];
  lastRescannedAt: number | null;
}
