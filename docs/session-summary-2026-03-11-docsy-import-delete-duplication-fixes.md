# 2026-03-11 Session Summary: Docsy Import, Delete, and Duplicate Cleanup

## Purpose

This document summarizes the work completed during the 2026-03-11 session for
`markdown-muse`.

The session had two main tracks:

- reviewing the `docsy_workspace_graph` PRD against the current codebase
- fixing document-management regressions around `.docsy` import, document
  deletion, and duplicate document display

## 1. Workspace Graph PRD Review

Reviewed these PRD files:

- `PRD/docsy_workspace_graph_prd_v0.8.docx`
- `PRD/docsy_workspace_graph_ui_wireframe.docx`

Compared the PRD requirements with the existing implementation in:

- `src/lib/knowledge/workspaceInsights.ts`
- `src/hooks/useKnowledgeBase.ts`
- `src/components/editor/WorkspaceGraphPanel.tsx`
- `src/components/editor/GraphExplorerDialog.tsx`
- `src/pages/WorkspaceGraph.tsx`

Main conclusion:

- the repository already had a functional graph data model and graph-oriented
  workflow integration
- current implementation covered the graph MVP and parts of filtering/focus
  behavior
- the main missing piece relative to the PRD was a true node-link canvas with
  zoom, pan, and richer visual graph rendering

Also clarified that `TOC` means `Table of Contents`, and in this codebase it
maps to the `table_of_contents` AST node defined in:

- `src/types/documentAst.ts`

## 2. Problem Investigation

After the PRD review, the session focused on document-management bugs reported
from the running app.

The reported issues were:

- importing a `.docsy` file added a document even when the workspace should have
  stayed at one document
- deleting documents did not work correctly, especially for the last document
- duplicate documents could remain visible in the UI

Investigation showed three distinct root causes.

### 2.1 Import always appended

The `.docsy` import path in `src/hooks/useDocumentIO.ts` always called
`createDocument(...)`, which appended a new document to the current list.

That meant:

- a blank auto-created draft was not replaced during import
- re-imports could keep accumulating documents

### 2.2 Delete behaved like close

`deleteDocument` in `src/hooks/useDocumentManager.ts` previously delegated to
`closeDocument`.

That meant:

- deletion inherited the `close` guard
- the last remaining document was not actually deletable
- UI behavior was inconsistent because the delete button itself was hidden when
  only one document existed

### 2.3 Old duplicate state could survive in autosave

Even after import behavior was improved, previously saved duplicate entries and
ghost blank drafts could still be restored from `localStorage`.

That meant:

- users could still see duplicate document entries after refresh
- fixing only the runtime import path was not enough

## 3. Implemented Changes

### 3.1 Import replacement policy

Updated `src/hooks/useDocumentIO.ts` to determine whether an imported document
should:

- replace an existing matching document
- replace the single initial blank draft
- append as a genuinely new document

Implemented:

- `isReplaceableBlankDocument(...)`
- `resolveImportedDocumentOptions(...)`

Behavior after the fix:

- if the incoming `.docsy` document ID already exists, the import replaces that
  document
- if the workspace only contains a single blank draft, the import replaces that
  draft
- otherwise the import appends as a new document

### 3.2 Replace-aware document creation

Expanded `CreateDocumentOptions` in `src/types/document.ts` with:

- `replaceDocumentId?: string`

Updated `src/hooks/useDocumentManager.ts` so `createDocument(...)` can now:

- replace a target document in place
- preserve the new document as active
- avoid ID collisions by remapping duplicate IDs with a fresh UUID when needed

### 3.3 Real delete semantics

Reworked `deleteDocument(...)` in `src/hooks/useDocumentManager.ts`.

Behavior after the fix:

- deleting a non-last document removes it normally
- deleting the active document moves focus to the next available document
- deleting the last remaining document creates a fresh blank draft so the app
  always remains in a valid single-document state

### 3.4 Delete button availability

Updated `src/components/editor/FileSidebar.tsx` so the delete action is always
available instead of being hidden when only one document exists.

This aligned the UI with the new delete policy.

### 3.5 Autosave deduplication and ghost cleanup

Updated `src/components/editor/useAutoSave.ts` to normalize autosaved document
state both on load and on save.

Implemented:

- duplicate collapse by document ID
- duplicate collapse by document signature
- active-document preference when resolving equivalent duplicates
- cleanup for older auto-generated blank drafts when a newer content document is
  already present

This allowed already-saved bad state to self-heal on reload instead of keeping
duplicate entries around forever.

## 4. Files Changed

Main runtime files:

- `src/hooks/useDocumentIO.ts`
- `src/hooks/useDocumentManager.ts`
- `src/components/editor/useAutoSave.ts`
- `src/components/editor/FileSidebar.tsx`
- `src/pages/Index.tsx`
- `src/types/document.ts`

New or updated tests:

- `src/test/documentImportFlow.test.ts`
- `src/test/useDocumentManager.test.tsx`
- `src/test/docsyAutosaveMigration.test.ts`

## 5. Verification

The following validation work was completed during the session:

### Automated tests

Ran focused tests for:

- `.docsy` import flow
- autosave migration and deduplication
- document manager replacement and delete behavior
- existing `.docsy` codec coverage

Representative commands:

1. `npx vitest run src/test/documentImportFlow.test.ts src/test/useDocumentManager.test.tsx`
2. `npx vitest run src/test/docsyAutosaveMigration.test.ts src/test/documentImportFlow.test.ts src/test/useDocumentManager.test.tsx`
3. `npm run build`

### UI verification

Used Playwright against a local preview build to confirm:

- blank workspace -> `.docsy` import replaces the initial draft instead of
  creating an extra document
- deleting the last remaining document transitions the UI back to a fresh blank
  draft
- the autosave snapshot eventually reflects the same cleaned state shown in the
  UI

## 6. Final Outcome

At the end of the session:

- `.docsy` import no longer blindly creates extra documents
- re-import of the same `.docsy` document prefers replacement over duplication
- the last document can now be deleted safely
- stale duplicate entries and ghost blank drafts are cleaned from autosave state
- the document list is more stable across refreshes and repeated import/delete
  flows

## 7. Remaining Note

The session created a temporary local file `temp-import.docsy` for import
verification during debugging. It was not part of the product change itself.
