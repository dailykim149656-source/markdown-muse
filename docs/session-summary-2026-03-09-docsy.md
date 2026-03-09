# 2026-03-09 Session Summary: Docsy Lossless Storage

## Purpose

This document records the work completed during the 2026-03-09 session for `markdown-muse`.
The main goal of the session was to reduce format-loss issues caused by saving and reloading documents through `md`, `tex`, and `html`, and to add a service-specific file format that can preserve editor state more reliably.

## Problem Statement

The existing document model was centered on a single `DocumentData.content` string.
That meant the app could lose editor-specific structure during save, reload, mode switch, or autosave restore flows.

The main risk areas were:

- TipTap JSON rich-text structure
- AST-level semantic structure
- mode-specific snapshots
- formatting details that are weakly represented in plain text export formats
- math, alignment, admonitions, footnotes, captions, and cross references

## Main Decisions

The session implemented a `.docsy` file format and aligned runtime state around richer canonical document data.

The chosen approach was:

- keep `md`, `tex`, and `html` as import/export formats
- add `.docsy` as the app-specific persistence format
- preserve TipTap JSON, AST data, and source snapshots together
- migrate autosave storage to the same richer model

## Work Completed

### 1. Added `.docsy` file format support

Created `src/lib/docsy/fileFormat.ts` with the main codec and envelope logic.

Implemented:

- `format: "docsy"`
- `version: "1.0"`
- parse and serialize helpers
- envelope type guards
- conversion from `DocumentData` to `.docsy`
- conversion from `.docsy` back to runtime document state

Rich text documents now preserve:

- TipTap JSON
- AST
- source snapshots

Structured documents now preserve:

- raw source
- structured AST
- source snapshots

### 2. Expanded runtime document types

Updated `src/types/document.ts`.

Added support for:

- `storageKind`
- `sourceSnapshots`
- `tiptapJson`
- `ast`
- `metadata`

Also expanded:

- `CreateDocumentOptions`
- `AutoSaveData`

### 3. Migrated autosave to v2

Updated `src/components/editor/useAutoSave.ts`.

Implemented:

- new storage key: `docsy-autosave-v2`
- legacy autosave migration
- initialization of richer document state for new documents
- explicit `version: 2` autosave payloads

This aligned autosave restore with the new `.docsy` persistence model.

### 4. Updated rich text editor initialization and sync flow

Updated these editors:

- `src/components/editor/MarkdownEditor.tsx`
- `src/components/editor/LatexEditor.tsx`
- `src/components/editor/HtmlEditor.tsx`

Added:

- `initialTiptapDoc`
- `onTiptapChange`

Behavior changes:

- editors can now initialize directly from TipTap JSON
- editor updates now push TipTap JSON upward
- source edits resync TipTap JSON
- unmount cleanup no longer wipes saved editor state

### 5. Reworked document state and conversion priority

Updated:

- `src/hooks/useDocumentManager.ts`
- `src/hooks/useFormatConversion.ts`
- `src/pages/Index.tsx`

Implemented:

- canonical state updates for active documents
- snapshot synchronization during editing
- AST regeneration from TipTap JSON
- conversion priority that favors TipTap JSON and AST over plain string fallbacks
- rich text snapshot tracking for `html`, `latex`, and `markdown`

### 6. Connected `.docsy` save and load to the UI

Updated:

- `src/hooks/useDocumentIO.ts`
- `src/components/editor/EditorHeader.tsx`
- `src/components/editor/EditorWorkspace.tsx`

Implemented:

- `Docsy (.docsy)` save menu item
- `.docsy` file input support
- `.docsy` load branch
- runtime restoration with `storageKind: "docsy"`

### 7. Fixed missing or incomplete editor support UI

Updated or added:

- `src/components/editor/ExportPreviewPanel.tsx`
- `src/components/editor/AiAssistantDialog.tsx`
- `src/components/editor/PatchReviewDialog.tsx`
- `src/components/editor/PatchReviewPanel.tsx`

One notable fix:

- `PatchReviewPanel` was adjusted so the non-editable original area no longer breaks the existing test expectations

### 8. Added and verified tests

Added or validated:

- `src/test/docsyFileFormat.test.ts`
- `src/test/docsyAutosaveMigration.test.ts`
- `src/test/docsyRichTextRoundtrip.test.ts`
- `src/test/patchReviewPanel.test.tsx`

The test focus areas included:

- `.docsy` serialize/parse round-trip
- autosave legacy migration
- rich text TipTap JSON and AST round-trip
- patch review UI regression coverage

### 9. Cleaned up temporary build output

Removed a temporary Vite-generated timestamp file from the repository root:

- `vite.config.ts.timestamp-1773020742799-f490611b0828.mjs`

## Key Files Changed

Core implementation files:

- `src/lib/docsy/fileFormat.ts`
- `src/types/document.ts`
- `src/components/editor/useAutoSave.ts`
- `src/hooks/useDocumentManager.ts`
- `src/hooks/useFormatConversion.ts`
- `src/hooks/useDocumentIO.ts`
- `src/pages/Index.tsx`
- `src/components/editor/MarkdownEditor.tsx`
- `src/components/editor/LatexEditor.tsx`
- `src/components/editor/HtmlEditor.tsx`
- `src/components/editor/EditorHeader.tsx`
- `src/components/editor/EditorWorkspace.tsx`

Support UI files:

- `src/components/editor/ExportPreviewPanel.tsx`
- `src/components/editor/AiAssistantDialog.tsx`
- `src/components/editor/PatchReviewDialog.tsx`
- `src/components/editor/PatchReviewPanel.tsx`

Tests:

- `src/test/docsyFileFormat.test.ts`
- `src/test/docsyAutosaveMigration.test.ts`
- `src/test/docsyRichTextRoundtrip.test.ts`
- `src/test/patchReviewPanel.test.tsx`

## Verification

The following verification commands were run during or at the end of the session:

1. `npm test`
2. `npm run build`
3. `git status --short`

Results:

- full test suite passed
- `33` test files passed
- `230` tests passed
- production build passed
- build time was about `4m 12s`
- Vite reported chunk size warnings, but the build succeeded

## Final State

At the end of the session, the following was complete:

- `.docsy` loss-minimizing save format implemented
- `.docsy` save/load wired into the editor UI
- TipTap JSON based restoration path added
- autosave v2 migration implemented
- related tests added and passing
- production build passing

## Follow-Up Candidates

The session completed the planned implementation and validation scope.
Potential future follow-up work includes:

- manual large-document round-trip validation with real user files
- formal `.docsy` versioning and migration policy documentation
- bundle size reduction and code splitting review
- longer-term cleanup of state handling across rich text and structured document modes
