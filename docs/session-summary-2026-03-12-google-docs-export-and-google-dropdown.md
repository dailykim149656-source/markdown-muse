# 2026-03-12 Google Docs Export and Google Dropdown Summary

## Summary

This session added a first-class `Export to Google Docs` flow and reorganized Google Workspace actions into a single header dropdown.

The main goal was to close the gap between the existing Google import/sync pipeline and a practical authoring workflow:

- import an existing Google Doc into Docsy
- export a local Docsy document to a new Google Doc
- save a bound document back to Google Docs from the same UI cluster

## What was implemented

### 1. New Google Docs export API

A new server endpoint was added to create a Google Doc, translate the current document into Google Docs requests, and return a usable workspace binding.

Main result:

- new `POST /api/workspace/export` route
- Google Docs document creation via the Docs API
- initial markdown applied immediately after document creation
- returned `workspaceBinding` marks the document as synced and bound to Google Drive

Key files:

- [server/modules/workspace/routes.ts](../server/modules/workspace/routes.ts)
- [server/modules/workspace/googleDocsClient.ts](../server/modules/workspace/googleDocsClient.ts)
- [server/modules/workspace/googleDocsMapper.ts](../server/modules/workspace/googleDocsMapper.ts)

### 2. Import refresh path aligned with exported documents

The import endpoint was extended so a refresh can target an existing local document id instead of always creating or replacing by the imported Google file id.

Main result:

- `documentId` can be passed to workspace import
- exported local documents can later refresh from Google without breaking local tab identity
- remote change detection and refresh keep working for both imported and exported documents

Key files:

- [server/modules/workspace/routes.ts](../server/modules/workspace/routes.ts)
- [src/hooks/useWorkspaceChanges.ts](../src/hooks/useWorkspaceChanges.ts)
- [src/lib/workspace/client.ts](../src/lib/workspace/client.ts)
- [src/types/workspace.ts](../src/types/workspace.ts)

### 3. Frontend export hook and page wiring

A dedicated frontend export hook was added and wired into the editor page.

Main result:

- `useWorkspaceExport` added for Google Docs export
- active document is updated with returned `workspaceBinding`
- document title is normalized from the export dialog
- rich-text modes use the latest rendered markdown for export and save operations

Key files:

- [src/hooks/useWorkspaceExport.ts](../src/hooks/useWorkspaceExport.ts)
- [src/hooks/useWorkspaceSync.ts](../src/hooks/useWorkspaceSync.ts)
- [src/pages/Index.tsx](../src/pages/Index.tsx)

### 4. Google Workspace actions moved into a single dropdown

The previous header arrangement exposed Google connection and Drive import as separate buttons. That has now been consolidated into one dropdown trigger.

Main result:

- new Google dropdown in the header
- `Connect Google` or `Manage Connection`
- `Import from Google Drive`
- `Export to Google Docs` for local rich-text documents
- `Save to Google Docs` for already bound Google documents

Key file:

- [src/components/editor/EditorHeader.tsx](../src/components/editor/EditorHeader.tsx)

### 5. New export dialog

A dedicated export dialog was added so the user can confirm the Google Docs title before creating the document.

Main result:

- title input dialog for Google Docs export
- export loading state and inline error surface
- consistent interaction model with the existing import dialog

Key file:

- [src/components/editor/WorkspaceExportDialog.tsx](../src/components/editor/WorkspaceExportDialog.tsx)

## API surface added or changed

### New API

`POST /api/workspace/export`

Request shape:

```json
{
  "documentId": "local-doc-id",
  "markdown": "# Title\n\nBody",
  "title": "Google Doc Title"
}
```

Response shape:

```json
{
  "ok": true,
  "warnings": [],
  "workspaceBinding": {
    "provider": "google_drive",
    "documentKind": "google_docs",
    "fileId": "google-doc-file-id",
    "syncStatus": "synced"
  }
}
```

### Changed API

`POST /api/workspace/import`

New optional field:

```json
{
  "fileId": "google-doc-file-id",
  "documentId": "existing-local-doc-id"
}
```

Purpose:

- refresh an already bound local document without changing its local tab id
- keep exported documents compatible with the same refresh flow used by imported documents

## Current behavior after this session

### Local Docsy document

If the active document is a local rich-text document and Google Workspace is connected:

- the Google dropdown shows `Export to Google Docs`
- export creates a new Google Doc
- the current tab becomes bound to that Google Doc
- later saves can use `Save to Google Docs`

### Imported or exported Google-bound document

If the active document already has a Google workspace binding:

- the Google dropdown shows `Save to Google Docs`
- the document continues using the existing sync pipeline
- remote changes can still move the document into conflict state and require refresh

### Structured documents

`json` and `yaml` documents are not eligible for Google Docs export.

## Affected file groups

### Server

- `server/modules/workspace/routes.ts`
- `server/modules/workspace/googleDocsClient.ts`
- `server/modules/workspace/googleDocsMapper.ts`

### Frontend

- `src/pages/Index.tsx`
- `src/components/editor/EditorHeader.tsx`
- `src/components/editor/WorkspaceExportDialog.tsx`
- `src/hooks/useWorkspaceExport.ts`
- `src/hooks/useWorkspaceSync.ts`
- `src/hooks/useWorkspaceChanges.ts`
- `src/lib/workspace/client.ts`
- `src/types/workspace.ts`

### Tests

- `src/test/useWorkspaceExport.test.tsx`
- `src/test/useWorkspaceChanges.test.tsx`
- `src/test/workspaceDialogs.test.tsx`
- existing targeted workspace tests re-run

## Verification completed

The following checks passed in this session:

- `npm run typecheck:server`
- `npm run build`
- `npx vitest run src/test/useWorkspaceSync.test.tsx src/test/useWorkspaceChanges.test.tsx src/test/useWorkspaceExport.test.tsx src/test/workspaceDialogs.test.tsx src/test/editorHeaderModeDropdown.test.tsx`

Focused tests added or updated:

- export hook behavior
- refresh/import payload shape
- export dialog interaction
- existing workspace sync flow regression coverage

## Limitations and open points

- This session implemented `Export to Google Docs`, not generic Drive file upload for `.docsy` or `.md`.
- Google Docs export still inherits the existing markdown-to-Google-Docs mapping limitations, including warnings for unsupported constructs like tables, images, or code fences.
- Full app-wide frontend typecheck still reports pre-existing unrelated errors outside the changed Google Workspace paths.
- Live validation against a real Google account was not completed in this session.

## Recommended next step

The next practical step is a real Google Workspace smoke test:

1. connect a Google account in a deployed or local environment
2. export a new local markdown document to Google Docs
3. edit locally and use `Save to Google Docs`
4. import an existing Google Doc and verify refresh/conflict handling
