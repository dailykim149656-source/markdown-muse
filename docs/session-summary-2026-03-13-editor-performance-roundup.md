# 2026-03-13 Editor Performance Optimization Roundup

## Summary

This document summarizes the editor performance optimization work completed up to 2026-03-13.

The optimization work was done in several passes:

- AI/runtime transport splitting
- advanced editor feature lazy-loading
- editor shell decomposition
- large-workspace graph and knowledge optimization
- workspace and document I/O runtime decoupling

The primary goal across all passes was to reduce `/editor` startup cost without sacrificing immediate WYSIWYG editing.

## What changed

### 1. AI and runtime transport were split

The original shared AI client path was decomposed into feature-specific modules so unrelated features stopped pulling each other into the same chunk path.

Key modules:

- [src/lib/ai/httpClient.ts](../src/lib/ai/httpClient.ts)
- [src/lib/ai/assistantClient.ts](../src/lib/ai/assistantClient.ts)
- [src/lib/ai/liveAgentClient.ts](../src/lib/ai/liveAgentClient.ts)
- [src/lib/ai/autosaveSummaryClient.ts](../src/lib/ai/autosaveSummaryClient.ts)
- [src/lib/ai/texClient.ts](../src/lib/ai/texClient.ts)
- [src/lib/ai/texAutoFixClient.ts](../src/lib/ai/texAutoFixClient.ts)

Result:

- dynamic/static import relocation warnings around the old shared AI path were removed
- AI assistant, live agent, autosave summaries, TeX preview, and TeX auto-fix became independently chunkable

### 2. Advanced editor features moved behind lazy boundaries

The editor no longer creates advanced extensions eagerly.

Key files:

- [src/components/editor/editorConfig.ts](../src/components/editor/editorConfig.ts)
- [src/components/editor/EditorToolbarPanelSections.tsx](../src/components/editor/EditorToolbarPanelSections.tsx)
- [src/lib/editor/templateFallback.ts](../src/lib/editor/templateFallback.ts)

Result:

- Mermaid and math extensions load only when advanced blocks are enabled
- toolbar math preview no longer forces eager math rendering code into the initial route path
- duplicated template fallback logic was removed from the editor page

### 3. Editor shell responsibilities were split into runtimes

Optional runtime ownership moved out of the main editor page.

New runtime components:

- [src/components/editor/DocumentSupportRuntime.tsx](../src/components/editor/DocumentSupportRuntime.tsx)
- [src/components/editor/PreviewRuntime.tsx](../src/components/editor/PreviewRuntime.tsx)
- [src/components/editor/WorkspaceRuntime.tsx](../src/components/editor/WorkspaceRuntime.tsx)
- [src/components/editor/DocumentIORuntime.tsx](../src/components/editor/DocumentIORuntime.tsx)

Supporting helpers:

- [src/lib/history/versionHistoryActions.ts](../src/lib/history/versionHistoryActions.ts)
- [src/lib/io/documentIoShared.ts](../src/lib/io/documentIoShared.ts)

Main route:

- [src/pages/Index.tsx](../src/pages/Index.tsx)

Result:

- patch review, version history, preview/TeX validation, workspace auth/sync/export/import, and document I/O/export/share are no longer owned directly by the editor shell
- these systems now mount on demand or on idle hydration
- desktop defaults for eager optional feature activation were disabled in [src/lib/appProfile.ts](../src/lib/appProfile.ts)

### 4. Knowledge and graph recomputation costs were reduced

Graph and knowledge work was optimized specifically for medium and large workspaces.

Key files:

- [src/hooks/useKnowledgeBase.ts](../src/hooks/useKnowledgeBase.ts)
- [src/components/editor/graphViewModel.ts](../src/components/editor/graphViewModel.ts)
- [src/components/editor/graphCanvasLayout.ts](../src/components/editor/graphCanvasLayout.ts)
- [src/components/editor/GraphCanvas.tsx](../src/components/editor/GraphCanvas.tsx)
- [src/components/editor/WorkspaceGraphPanel.tsx](../src/components/editor/WorkspaceGraphPanel.tsx)
- [src/components/editor/GraphExplorerDialog.tsx](../src/components/editor/GraphExplorerDialog.tsx)
- [src/pages/WorkspaceGraph.tsx](../src/pages/WorkspaceGraph.tsx)

Result:

- graph surfaces now share one prepared graph view model instead of duplicating sort/filter/search pipelines
- graph queries use deferred input instead of fully synchronous filtering on every keypress
- large-workspace selection no longer forces full selection-centered relayout in the canvas
- adjacency maps and connection summaries replace repeated edge scanning in large graph detail panels

### 5. Storage and reset support were hardened

Supporting behavior was tightened to avoid performance regressions caused by state mismatches.

Key files:

- [src/hooks/useDocumentManager.ts](../src/hooks/useDocumentManager.ts)
- [src/lib/documents/resetLocalDocumentState.ts](../src/lib/documents/resetLocalDocumentState.ts)
- [src/hooks/useVersionHistory.ts](../src/hooks/useVersionHistory.ts)

Result:

- newly created documents persist immediately and consistently
- local reset now clears version history through lazy storage loading rather than pinning that code into startup
- version history initialization remains consistent after controller decomposition

## Verification completed

The following checks passed after the latest optimization pass:

- `npm run build`
- `npm run test`
- `npm run measure:release-closeout`

Focused regression coverage added or expanded:

- [src/test/editorConfig.test.tsx](../src/test/editorConfig.test.tsx)
- [src/test/templateFallback.test.ts](../src/test/templateFallback.test.ts)
- [src/test/indexRuntimeActivation.test.tsx](../src/test/indexRuntimeActivation.test.tsx)
- [src/test/graphCanvasLayout.test.ts](../src/test/graphCanvasLayout.test.ts)
- [src/test/workspaceGraphPanel.test.tsx](../src/test/workspaceGraphPanel.test.tsx)
- [src/test/graphExplorerDialog.test.tsx](../src/test/graphExplorerDialog.test.tsx)

Current full test result:

- `121` test files
- `502` tests passing

## Current measured results

Latest release-closeout measurement:

- [output/playwright/release-closeout-performance.json](../output/playwright/release-closeout-performance.json)

Captured at:

- `2026-03-13T14:06:34.811Z`

Results:

- small: `editorLoadMs 1526`, `graphFilterSearchMs 123`, `graphRouteOpenMs 504`, `knowledgeSearchMs 688`, `queueCreationToReadyMs 8195`
- medium: `editorLoadMs 324`, `graphFilterSearchMs 120`, `graphRouteOpenMs 224`, `knowledgeSearchMs 454`, `queueCreationToReadyMs 7370`
- large: `editorLoadMs 398`, `graphFilterSearchMs 297`, `graphRouteOpenMs 511`, `knowledgeSearchMs 610`, `queueCreationToReadyMs 9729`

## Bundle status

Latest bundle report:

- [dist/bundle-report.json](../dist/bundle-report.json)

Current notable chunks:

- `assets/Index-*.js`: about `256.5 KB` raw, `76.3 KB` gzip
- `assets/WorkspaceRuntime-*.js`: about `10.6 KB` raw, `3.8 KB` gzip
- `assets/DocumentIORuntime-*.js`: about `16.5 KB` raw, `5.5 KB` gzip
- `assets/DocumentSupportRuntime-*.js`: about `12.7 KB` raw, `3.8 KB` gzip
- `assets/PreviewRuntime-*.js`: about `7.1 KB` raw, `2.7 KB` gzip

Interpretation:

- the editor shell is materially smaller than before
- optional workspace and document I/O logic now live behind separate runtime chunks
- graph and knowledge code is still large overall, but the hot path is significantly cheaper than before

## Remaining heavy areas

- `tiptap-vendor` remains the single biggest editor-related code cost, but it is intentionally retained to preserve immediate WYSIWYG startup.
- `math-vendor`, `mermaid.core`, and `cytoscape.esm` remain large feature chunks, even though they are no longer the main startup bottleneck.
- startup and route-open measurements still show variance between runs, so future work should continue validating on repeated measurements, not one sample.

## Recommended next step

If another optimization pass is needed, the next most likely targets are:

1. further reducing workspace/auth-related first interaction cost after runtime mount
2. trimming export/print/share converter weight inside the document I/O runtime
3. considering stronger feature gating for heavy optional rendering stacks like Mermaid and KaTeX
