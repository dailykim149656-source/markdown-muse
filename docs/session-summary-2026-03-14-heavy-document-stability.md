# 2026-03-14 Heavy-Document and High-Document-Count Stability

## Summary

This document records the heavy-document and high-document-count stability work completed on 2026-03-14.

The goal of this pass was not to weaken immediate WYSIWYG editing. The goal was to keep typing-critical editor behavior intact while moving secondary work off the hot path as document size and document count increase.

The main targets were:

- heavy active documents around `100k+` characters
- workspaces with `100-200` documents
- secondary systems that were still reacting too eagerly to every edit:
  - markdown/latex export conversion
  - autosave persistence
  - knowledge indexing

## What changed

### 1. Document performance profiling was added

New helper:

- [src/lib/documents/documentPerformanceProfile.ts](../src/lib/documents/documentPerformanceProfile.ts)

Type additions:

- [src/types/document.ts](../src/types/document.ts)

What it does:

- classifies the active document into `normal`, `large`, or `heavy`
- uses document character count, structural block count, and image count
- supports AST-backed documents, tiptap JSON-backed documents, and content-only estimation

Current thresholds:

- `normal`: under `25k` chars, under `150` blocks, under `10` images
- `large`: `25k-100k` chars or `150-500` blocks or `10-40` images
- `heavy`: over `100k` chars or over `500` blocks or over `40` images

This profile is internal only. There is no user-facing API or format change.

### 2. Secondary format conversion is now deferred for large and heavy documents

Updated hook:

- [src/hooks/useFormatConversion.ts](../src/hooks/useFormatConversion.ts)

Main behavior change:

- renderable HTML stays immediate
- renderable markdown and LaTeX document output are no longer recomputed eagerly on every hot-path update for `large` and `heavy` documents
- background conversion now runs after idle or short delay depending on document profile
- stale background work is ignored when the active document changes

New internal capabilities:

- `flushSecondaryRenderables`
- `getFreshRenderableMarkdown`
- `getFreshRenderableLatex`
- `getFreshRenderableLatexDocument`

This means:

- preview opening can force a fresh LaTeX conversion before it mounts
- export/share/print can force a fresh conversion only when needed
- AI requests can force current markdown just before request execution instead of keeping it hot continuously

### 3. Autosave moved toward incremental IndexedDB-backed storage

New storage module:

- [src/lib/documents/autosaveV3Store.ts](../src/lib/documents/autosaveV3Store.ts)

Updated autosave and document manager:

- [src/components/editor/useAutoSave.ts](../src/components/editor/useAutoSave.ts)
- [src/hooks/useDocumentManager.ts](../src/hooks/useDocumentManager.ts)

Main behavior change:

- IndexedDB v3 is now the primary autosave path
- documents are stored individually instead of persisting the entire open-document array every cycle
- a manifest tracks `activeDocId`, document order, and `lastSaved`
- dirty document IDs are tracked and only changed documents are written on autosave

Migration behavior:

- existing `docsy-autosave-v2` payloads are still readable
- v2 data is migrated into v3 on hydration
- small sessions continue to keep a compact localStorage fallback cache
- if IndexedDB is unavailable, correctness falls back to the existing localStorage behavior

Important practical outcome:

- startup and unload no longer need whole-session payload rewrites for every save cycle
- heavy sessions stop paying the same autosave cost as small sessions

### 4. Knowledge indexing became incremental and staged

Updated modules:

- [src/hooks/useKnowledgeBase.ts](../src/hooks/useKnowledgeBase.ts)
- [src/lib/knowledge/knowledgeIndex.ts](../src/lib/knowledge/knowledgeIndex.ts)

What changed:

- the knowledge hook no longer rebuilds live knowledge records from the full document array on every deferred update
- dirty document fingerprints are tracked per document
- only changed documents are queued for reindexing
- removed documents are removed from the knowledge store incrementally

Heavy document strategy:

- heavy documents first get a `summary` stage record
- summary indexing captures title, headings, image references, and reduced plain text
- full-body indexing is deferred to a later idle pass

New internal helper behavior:

- `buildKnowledgeDocumentFingerprint`
- `buildKnowledgeRecordFromDocument(..., { stage: "summary" | "full" })`

Result:

- search can keep using the latest committed knowledge state
- heavy edits no longer force immediate full ingestion normalization on every change

### 5. Runtime consumers were updated to use flush-on-demand

Updated runtime and consumer files:

- [src/pages/Index.tsx](../src/pages/Index.tsx)
- [src/components/editor/AiAssistantRuntime.tsx](../src/components/editor/AiAssistantRuntime.tsx)
- [src/components/editor/DocumentIORuntime.tsx](../src/components/editor/DocumentIORuntime.tsx)
- [src/hooks/useAiAssistant.ts](../src/hooks/useAiAssistant.ts)
- [src/hooks/useLiveAgent.ts](../src/hooks/useLiveAgent.ts)
- [src/hooks/useDocumentIO.ts](../src/hooks/useDocumentIO.ts)

What changed:

- preview open now flushes secondary conversion before switching on
- document export and share paths fetch fresh markdown/latex only when required
- AI assistant and live agent request paths now fetch fresh markdown on demand instead of relying on continuously hot conversion state
- workspace sync/export uses forced markdown resolution only at execution time

## Verification completed

### Build

Completed:

- `npm run build`

Current result:

- build passes
- the main editor chunk is now about `279.4 KB` raw and `83.4 KB` gzip in [dist/bundle-report.json](../dist/bundle-report.json)

Current remaining build warning:

- [src/components/editor/TemplateDialog.tsx](../src/components/editor/TemplateDialog.tsx) is still dynamically imported by [src/components/editor/EditorWorkspace.tsx](../src/components/editor/EditorWorkspace.tsx) and statically imported by [src/pages/Index.tsx](../src/pages/Index.tsx)
- this warning pre-existed the heavy-document pass and still needs cleanup if chunk purity is a goal

### Tests added

New focused tests:

- [src/test/documentPerformanceProfile.test.ts](../src/test/documentPerformanceProfile.test.ts)
- [src/test/useFormatConversion.test.tsx](../src/test/useFormatConversion.test.tsx)
- [src/test/autosaveV3Migration.test.ts](../src/test/autosaveV3Migration.test.ts)

Expanded tests:

- [src/test/knowledgeIndex.test.ts](../src/test/knowledgeIndex.test.ts)
- [src/test/indexRuntimeActivation.test.tsx](../src/test/indexRuntimeActivation.test.tsx)

Focused verification that passed:

- `npx vitest run src/test/useDocumentManager.test.tsx src/test/indexRuntimeActivation.test.tsx`
- `npx vitest run src/test/documentPerformanceProfile.test.ts src/test/useFormatConversion.test.tsx src/test/autosaveV3Migration.test.ts src/test/knowledgeIndex.test.ts`

### Full suite status

Full `npm test` was run repeatedly, but the suite is not fully clean at repository level.

Observed failures during full-suite runs:

- [src/test/useTexValidation.test.tsx](../src/test/useTexValidation.test.tsx)
  - order-sensitive failure where one test expects `status === "error"` but intermittently observes `success`
  - the same file passes when run in isolation
- [src/test/guidePage.test.tsx](../src/test/guidePage.test.tsx)
  - timeout under full-suite load
- [src/test/graphExplorerDialog.test.tsx](../src/test/graphExplorerDialog.test.tsx)
  - timeout under full-suite load

Interpretation:

- the heavy-document pass added passing focused coverage for its own changes
- repository-wide full-suite stability is still affected by pre-existing or parallel-load-sensitive tests outside this change set

## Performance benchmark updates

Benchmark script was extended:

- [scripts/measure-release-closeout-performance.mjs](../scripts/measure-release-closeout-performance.mjs)

New scenarios added:

- `workspace-200`
- `heavy-active`
- `mixed-heavy`

Latest measurement output:

- [output/playwright/release-closeout-performance.json](../output/playwright/release-closeout-performance.json)

Captured at:

- `2026-03-13T15:19:23.070Z`

Results:

- `small`: `editorLoadMs 899`, `knowledgeSearchMs 877`, `graphRouteOpenMs 613`
- `medium`: `editorLoadMs 522`, `knowledgeSearchMs 735`, `graphRouteOpenMs 377`
- `large`: `editorLoadMs 495`, `knowledgeSearchMs 980`, `graphRouteOpenMs 783`
- `workspace-200`: `editorLoadMs 1313`, `knowledgeSearchMs 1578`, `graphRouteOpenMs 2254`
- `heavy-active`: `editorLoadMs 9727`, `knowledgeSearchMs 956`, `graphRouteOpenMs 1202`
- `mixed-heavy`: `editorLoadMs 6850`, `knowledgeSearchMs 1041`, `graphRouteOpenMs 1426`

## What improved

- background markdown/latex conversion is no longer guaranteed to recompute on every heavy edit
- autosave is now structurally capable of writing only dirty documents
- knowledge indexing no longer treats every edit like a full-workspace reindex
- heavy documents now get a lighter first-pass knowledge record before full indexing
- AI/export/share/preview paths now request fresh derived content only when they actually need it

## What did not meet target

The heavy-document pass reduced unnecessary secondary work, but it did not solve the core cost of mounting and rendering a truly heavy active editor document.

The main misses are:

- `workspace-200` is still above the target range
- `heavy-active` is far above the target range
- `mixed-heavy` knowledge and graph numbers are still higher than desired

This indicates the remaining bottleneck is no longer just background indexing or autosave. The next bottleneck is the rich-text editor load and render cost for heavy active content itself.

## Recommended next step

If another pass is scheduled, the next targets should be:

1. reducing heavy tiptap document mount cost for the active editor surface
2. introducing stronger heavy-document safeguards around initial rich-text hydration and decoration work
3. profiling why isolated heavy-active startup remains much slower than multi-document normal workspaces
4. fixing the remaining [TemplateDialog](../src/components/editor/TemplateDialog.tsx) chunk warning to keep startup chunk boundaries predictable
