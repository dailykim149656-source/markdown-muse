# Docsy Workspace Phase 1-2 Implementation Plan

Date: 2026-03-11

## References

- `PRD/docsy_workspace_prd_phase1_2.md`
- `docs/architecture-overview-2026-03-10.md`
- `docs/architecture-hackathon-2026-03-11.md`
- `src/pages/Index.tsx`
- `src/hooks/useDocumentManager.ts`
- `src/hooks/useKnowledgeBase.ts`
- `src/hooks/usePatchReview.ts`
- `server/aiServer.ts`

## Purpose

This document turns the Phase 1-2 Google Workspace PRD into an implementation
sequence that fits the current repository structure.

The key constraint is simple:

- do not rewrite the editor, knowledge, or patch-review foundation
- add Google Workspace as a new source and sync layer around the current local
  review-first workflow

## Decision Summary

The current codebase already has the product core that the PRD needs:

- local multi-document editor workflow
- workspace graph and knowledge indexing
- review-first patch generation and application
- AI-assisted suggestion flows

What is missing is not another editor architecture. What is missing is the
external system boundary:

- Google OAuth/session handling
- Google Drive/Docs import
- Google-bound document metadata
- remote apply back to Google Docs
- change sync against Drive updates

Therefore the implementation should preserve the current local architecture and
add a `workspace integration layer`.

## Architecture Approach

### Preserve existing local workflow

Keep the current product loop unchanged:

1. import or open a document into `DocumentData`
2. index and analyze locally
3. generate reviewable patch sets
4. let the user accept or edit patches
5. apply to the local editor first
6. optionally sync the reviewed result back to Google Docs

### Add three new boundaries

1. `Workspace auth boundary`
   Handles OAuth, session, provider status, and account identity.

2. `Workspace source boundary`
   Imports Google Drive/Docs content into `DocumentData` plus server-side
   snapshots.

3. `Workspace sync boundary`
   Pushes reviewed changes back to Google Docs and pulls Drive changes into the
   existing change-monitoring flow.

### Keep patch generation local in Phase 1

The PRD shows a server endpoint for patch generation, but the current app
already generates review-first patch sets in the browser with existing editor
state and AI flows.

For the first implementation slice:

- keep patch generation in the current frontend runtime
- do not build `/api/patches/generate` first
- only add server APIs for auth, import, apply, and change sync

This avoids duplicating logic that is already implemented in:

- `src/hooks/useAiAssistant.ts`
- `src/lib/ai/suggestDocumentUpdates.ts`
- `src/lib/ai/compareDocuments.ts`

## Current Code Mapping

### Existing code that should remain the center of gravity

- `src/hooks/useDocumentManager.ts`
  Owns active docs, creation, rename, delete, autosave, and in-memory editor
  state transitions.

- `src/hooks/useKnowledgeBase.ts`
  Already builds workspace records, impact chains, issue lists, and change
  monitoring from the local document set.

- `src/hooks/usePatchReview.ts`
  Already enforces review-first application and should remain the only path that
  mutates the active document after AI suggestions.

- `src/pages/Index.tsx`
  Already orchestrates the editor, queue, patch review, and knowledge workflow.

- `src/components/editor/EditorHeader.tsx`
  Already has the right action area for import/connect/sync controls.

### Existing code that should be extended rather than replaced

- `src/types/document.ts`
  Add typed Google binding and sync metadata here, or in a sibling
  `src/types/workspace.ts`.

- `src/lib/ai/client.ts`
  This is currently the only browser-side API client. Add a new sibling client
  for workspace APIs instead of mixing Google endpoints into the AI client.

- `server/aiServer.ts`
  Keep as the single HTTP server entry for now, but split route handling into
  new modules rather than growing this file further.

## Scope and Non-Goals

### In scope for Phase 1-2

- Google OAuth connect/disconnect/session
- Google Drive file picker or server-side file listing
- Google Docs import into the existing editor
- Google-bound document metadata on imported docs
- review-first local patch flow on imported docs
- reviewed apply back to Google Docs
- manual or pull-based Drive change sync
- UI affordances for connection, import, sync status, and conflict handling

### Explicitly out of scope for the first implementation slice

- full server-side patch generation rewrite
- always-on background workers as the only sync path
- multi-user collaborative review state
- complete fidelity for every advanced Docsy node in Google Docs apply
- Drive comments integration
- arbitrary Google Workspace file types beyond the first supported subset

## Supported Content Strategy

Full Docsy-to-Google Docs fidelity is not realistic in the first slice. The
implementation should define a supported Google round-trip subset and block or
warn on unsupported remote apply cases.

### Phase 1 supported for import and apply

- paragraphs
- headings
- bullet and ordered lists
- bold, italic, underline
- links
- basic line breaks

### Phase 1 import-only or lossy fallback

- tables
- images
- block quotes
- code blocks

### Phase 1 not supported for Google Docs apply

- mermaid
- math
- admonitions
- footnotes
- cross-references
- figure captions with internal references
- advanced styling beyond what Google Docs can represent safely

When unsupported content is present:

- local editing remains allowed
- patch review remains allowed
- remote apply is disabled or degraded with a clear warning

## Data Model Changes

## Client document model

Add a new typed binding for external workspace-backed documents.

Suggested shape:

```ts
export type WorkspaceProvider = "google_drive";

export type WorkspaceDocumentKind =
  | "google_docs"
  | "drive_html"
  | "drive_markdown";

export type WorkspaceSyncStatus =
  | "local_only"
  | "imported"
  | "dirty_local"
  | "syncing"
  | "synced"
  | "conflict"
  | "error";

export interface WorkspaceBinding {
  provider: WorkspaceProvider;
  documentKind: WorkspaceDocumentKind;
  fileId: string;
  mimeType: string;
  revisionId?: string;
  driveModifiedTime?: string;
  importedAt: number;
  lastSyncedAt?: number;
  syncStatus: WorkspaceSyncStatus;
  syncError?: string;
}
```

Recommended placement:

- `src/types/workspace.ts` for the new types
- `src/types/document.ts` to add `workspaceBinding?: WorkspaceBinding`

### Server-side persistence model

Do not hardwire the browser local model as the only source of truth for Google
  sync. The server needs durable snapshot storage for:

- OAuth/session identity
- imported source snapshots
- last known Google revision
- apply requests
- change cursor state

Suggested repository entities:

- `workspace_connections`
- `workspace_documents`
- `workspace_document_snapshots`
- `workspace_change_cursors`

Use a repository interface first. For development:

- local SQLite is acceptable

For deployed multi-instance environments:

- switch the repository adapter to managed storage later

This keeps the current implementation pragmatic without baking local SQLite into
the public server contract.

## Backend Plan

## New server modules

Create these modules under `server/modules/workspace` and `server/modules/auth`.

### Auth modules

- `server/modules/auth/googleOAuth.ts`
  Builds auth URL, exchanges code for tokens, refreshes access tokens.

- `server/modules/auth/sessionStore.ts`
  Reads/writes workspace session state.

- `server/modules/auth/routes.ts`
  Handles auth routes.

### Workspace modules

- `server/modules/workspace/googleDriveClient.ts`
  Wraps Drive API listing, file metadata, and changes.

- `server/modules/workspace/googleDocsClient.ts`
  Wraps Docs API get and batchUpdate calls.

- `server/modules/workspace/googleDocsMapper.ts`
  Converts Google Docs structures into the reduced Docsy-compatible import
  format and builds outbound Docs requests from reviewed local content.

- `server/modules/workspace/repository.ts`
  Interface for connections, snapshots, change cursors, and binding metadata.

- `server/modules/workspace/routes.ts`
  Handles import, apply, listing, and change routes.

### Shared modules

- `server/modules/http/json.ts`
  Shared request parsing and JSON response helpers so new routes do not continue
  duplicating utility logic inside `aiServer.ts`.

## Environment variables

Add these to `.env.example` after the current AI variables.

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
GOOGLE_SESSION_SECRET=
GOOGLE_WORKSPACE_SCOPES=https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.metadata.readonly
WORKSPACE_DB_PATH=.data/docsy-workspace.sqlite
```

If a deployed environment cannot rely on local disk persistence, keep
`WORKSPACE_DB_PATH` as a development-only adapter and move the repository
implementation behind an interface.

## API Contract

## Auth routes

### `POST /api/auth/google/connect`

Response:

```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "provider": "google_drive"
}
```

### `GET /api/auth/google/callback`

Behavior:

- validate state
- exchange code
- persist tokens server-side
- set session cookie
- redirect back to `/editor`

### `GET /api/auth/session`

Response:

```json
{
  "connected": true,
  "provider": "google_drive",
  "user": {
    "email": "user@example.com",
    "name": "Example User"
  }
}
```

### `POST /api/auth/google/disconnect`

Response:

```json
{
  "ok": true
}
```

## Workspace routes

### `GET /api/workspace/files`

Purpose:

- list import candidates from Drive for the current user

Query params:

- `q`
- `cursor`
- `pageSize`

Response:

```json
{
  "files": [
    {
      "fileId": "123",
      "name": "Etch Process SOP",
      "mimeType": "application/vnd.google-apps.document",
      "modifiedTime": "2026-03-11T04:10:00Z"
    }
  ],
  "nextCursor": "..."
}
```

### `POST /api/workspace/import`

Request:

```json
{
  "fileId": "drive_file_id"
}
```

Response:

```json
{
  "document": {
    "id": "docsy_doc_001",
    "name": "Etch Process SOP",
    "mode": "html",
    "content": "<h1>Etch Process SOP</h1>",
    "metadata": {
      "title": "Etch Process SOP"
    },
    "workspaceBinding": {
      "provider": "google_drive",
      "documentKind": "google_docs",
      "fileId": "drive_file_id",
      "mimeType": "application/vnd.google-apps.document",
      "revisionId": "17",
      "driveModifiedTime": "2026-03-11T04:10:00Z",
      "importedAt": 1773200000000,
      "syncStatus": "imported"
    }
  }
}
```

Implementation note:

- return a `DocumentData`-compatible payload so the browser can pass it almost
  directly into `createDocument(...)`

### `POST /api/patches/apply`

Request:

```json
{
  "documentId": "docsy_doc_001",
  "fileId": "drive_file_id",
  "baseRevisionId": "17",
  "mode": "html",
  "content": "<h1>Etch Process SOP</h1><p>Updated text</p>"
}
```

Response:

```json
{
  "ok": true,
  "appliedAt": 1773200300000,
  "revisionId": "18",
  "driveModifiedTime": "2026-03-11T04:15:00Z",
  "syncStatus": "synced",
  "warnings": []
}
```

Implementation note:

- send final reviewed content, not raw patch operations
- let the server compute Google Docs batchUpdate requests against the stored
  base snapshot

### `GET /api/workspace/changes`

Response:

```json
{
  "changes": [
    {
      "fileId": "drive_file_id",
      "name": "Etch Process SOP",
      "modifiedTime": "2026-03-11T04:18:00Z",
      "changeType": "content_changed"
    }
  ],
  "nextCursor": "..."
}
```

### `POST /api/workspace/rescan`

Purpose:

- manually refresh the metadata and snapshots for already imported Google-bound
  documents

## Frontend Plan

## New browser-side modules

- `src/types/workspace.ts`
- `src/lib/workspace/client.ts`
- `src/hooks/useWorkspaceAuth.ts`
- `src/hooks/useWorkspaceFiles.ts`
- `src/hooks/useWorkspaceSync.ts`

## New UI components

- `src/components/editor/WorkspaceConnectionDialog.tsx`
- `src/components/editor/WorkspaceImportDialog.tsx`
- `src/components/editor/WorkspaceSyncStatusBadge.tsx`

These should be lazy-loaded from the editor route in the same style as the
current dialogs.

## Existing files to change

### `src/types/document.ts`

- add `workspaceBinding`

### `src/pages/Index.tsx`

- initialize workspace auth/file/sync hooks
- open connection dialog
- open import dialog
- map imported server payloads into `createDocument(...)`
- pass sync actions down to the header and sidebar

### `src/components/editor/EditorHeader.tsx`

- add `Connect Google`
- add `Import from Drive`
- add sync status badge for the active doc when it has a binding

### `src/hooks/usePatchReview.ts`

- keep the current local apply path unchanged
- after a successful local apply, if the active document has a Google binding,
  call the workspace apply mutation
- update `workspaceBinding.syncStatus` and revision metadata based on response

### `src/hooks/useKnowledgeBase.ts`

- do not rewrite indexing
- optionally read `workspaceBinding` metadata to improve source labels and stale
  detection
- keep current change-monitoring logic and feed it with imported docs plus
  Drive-change refreshes

### `src/components/editor/FileSidebarKnowledgePanels.tsx`

- add one manual workspace rescan action
- merge Drive-change notifications into the existing change-monitoring surface

## Execution Slices

## Slice 0. Server extraction and repository scaffolding

Goal:

- prepare the codebase so new auth/workspace routes do not turn
  `server/aiServer.ts` into the entire backend

Files:

- update `server/aiServer.ts`
- add shared HTTP helpers
- add repository interfaces and dev adapter

Exit criteria:

- AI endpoints still work unchanged
- new non-AI route modules can be plugged in cleanly

## Slice 1. Google auth and session

Goal:

- complete connect, callback, session status, and disconnect flow

Files:

- `server/modules/auth/*`
- `src/lib/workspace/client.ts`
- `src/hooks/useWorkspaceAuth.ts`
- `src/components/editor/WorkspaceConnectionDialog.tsx`
- `src/pages/Index.tsx`

Exit criteria:

- user can connect and reconnect Google account
- browser never stores refresh token directly
- editor can render connected/disconnected state

## Slice 2. Drive listing and import

Goal:

- import Google Docs into the current local editor state

Files:

- `server/modules/workspace/googleDriveClient.ts`
- `server/modules/workspace/googleDocsClient.ts`
- `server/modules/workspace/googleDocsMapper.ts`
- `server/modules/workspace/routes.ts`
- `src/hooks/useWorkspaceFiles.ts`
- `src/components/editor/WorkspaceImportDialog.tsx`
- `src/pages/Index.tsx`

Exit criteria:

- user can browse or search Drive docs
- imported Google Docs open as normal editor documents
- imported docs carry `workspaceBinding`
- existing knowledge/index/graph flows work without rewrite

## Slice 3. Google-bound sync metadata in the editor

Goal:

- make imported docs visibly distinct and expose sync state

Files:

- `src/types/document.ts`
- `src/types/workspace.ts`
- `src/components/editor/EditorHeader.tsx`
- `src/components/editor/DocumentTabs.tsx`
- `src/components/editor/FileSidebar.tsx`

Exit criteria:

- users can tell whether the active doc is local-only or Google-bound
- users can see `imported`, `dirty_local`, `syncing`, `synced`, `conflict`,
  and `error` states

## Slice 4. Review-first remote apply

Goal:

- keep the current patch-review flow but let reviewed changes sync back to
  Google Docs

Files:

- `src/hooks/usePatchReview.ts`
- `src/hooks/useWorkspaceSync.ts`
- `server/modules/workspace/googleDocsMapper.ts`
- `server/modules/workspace/routes.ts`

Exit criteria:

- accepted patches still apply locally first
- successful local apply can be pushed to Google Docs
- unsupported content blocks remote apply with a clear warning
- sync status updates after success or failure

## Slice 5. Drive change sync and conflict handling

Goal:

- detect when the source Google doc changed outside Docsy

Files:

- `server/modules/workspace/googleDriveClient.ts`
- `server/modules/workspace/repository.ts`
- `src/hooks/useWorkspaceSync.ts`
- `src/hooks/useKnowledgeBase.ts`
- `src/components/editor/ChangeMonitoringPanel.tsx`

Exit criteria:

- user can manually refresh imported docs
- changed remote docs show up in existing change-monitoring flows
- stale base revisions mark docs as `conflict`

## Slice 6. Tests and guardrails

Goal:

- prevent regressions in auth, import, apply, and sync-state UX

Files:

- `src/test/*`
- new server module tests as needed
- `e2e/*` for critical import/apply smoke flows

Exit criteria:

- mapper tests cover supported Google Docs subset
- client tests cover connected/imported/syncing/conflict states
- patch review still enforces review-first behavior

## Testing Plan

### Unit tests

- `googleDocsMapper` import normalization
- outbound Google Docs apply request builder
- workspace binding migration on document creation/import
- sync status transitions in client hooks

### Component tests

- connection dialog state
- import dialog list and selection flow
- header sync badge rendering
- patch-review apply path for Google-bound docs

### Integration tests

- import a Google doc into `createDocument(...)`
- apply reviewed patches and transition to `synced`
- detect stale revision and transition to `conflict`

### E2E smoke tests

- connect mocked account
- import Drive doc
- run suggestion flow
- accept patch
- sync back to mocked Google Docs service

## Risks and Controls

### Risk 1. Full Google Docs fidelity expands too far

Control:

- enforce a supported subset for Phase 1
- warn and block unsupported remote apply instead of silently degrading

### Risk 2. Backend state grows inside one file

Control:

- split new route and client code into modules before implementing Google logic

### Risk 3. Sync conflicts bypass review-first workflow

Control:

- local patch review stays mandatory
- remote apply happens only after local reviewed apply succeeds
- stale base revision marks conflict and stops push

### Risk 4. Storage choice becomes deployment debt

Control:

- implement repository interface first
- treat SQLite as a dev adapter, not the permanent architecture contract

## Recommended Implementation Order

1. Slice 0: route extraction and repository scaffolding
2. Slice 1: Google auth/session
3. Slice 2: Drive file listing and import
4. Slice 3: client document binding and sync-state UI
5. Slice 4: review-first remote apply
6. Slice 5: Drive change sync and conflict handling
7. Slice 6: test closure and polish

## Practical Next Step

Start with `Slice 0` and `Slice 1` together.

Reason:

- every later slice depends on auth and route structure
- these slices are low-risk and unlock frontend progress immediately
- they avoid touching the already-stable editor and patch logic too early
