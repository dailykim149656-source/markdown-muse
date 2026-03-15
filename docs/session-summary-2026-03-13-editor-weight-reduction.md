# 2026-03-13 Editor Weight Reduction Summary

## Summary

This session focused on reducing editor startup weight and decoupling optional runtime features from the `/editor` route.

The main goals were:

- split AI transport paths so feature code no longer collapses into one shared import chain
- lazy-load advanced editor extensions instead of shipping them eagerly with the core editor path
- reduce knowledge sidebar recomputation pressure during typing and initial page load
- preserve behavior while tightening test coverage and release verification

This work improved code separation and chunk boundaries, but it did not achieve the planned 20% improvement in `/editor` startup time. The editor route is still materially heavy and needs a second pass around [Index.tsx](../src/pages/Index.tsx) and its hook graph.

## What was implemented

### 1. AI transport split into feature-specific clients

The previous shared AI client was decomposed into smaller modules so unrelated features stop pulling each other into the same bundle path.

New modules:

- [src/lib/ai/httpClient.ts](../src/lib/ai/httpClient.ts)
- [src/lib/ai/assistantClient.ts](../src/lib/ai/assistantClient.ts)
- [src/lib/ai/liveAgentClient.ts](../src/lib/ai/liveAgentClient.ts)
- [src/lib/ai/autosaveSummaryClient.ts](../src/lib/ai/autosaveSummaryClient.ts)
- [src/lib/ai/texClient.ts](../src/lib/ai/texClient.ts)
- [src/lib/ai/texAutoFixClient.ts](../src/lib/ai/texAutoFixClient.ts)

Updated consumers:

- [src/hooks/useAiAssistant.ts](../src/hooks/useAiAssistant.ts)
- [src/hooks/useLiveAgent.ts](../src/hooks/useLiveAgent.ts)
- [src/hooks/useTexAutoFix.ts](../src/hooks/useTexAutoFix.ts)
- [src/hooks/useTexValidation.ts](../src/hooks/useTexValidation.ts)
- [src/hooks/useVersionHistory.ts](../src/hooks/useVersionHistory.ts)

Result:

- the earlier dynamic/static import relocation warning around `src/lib/ai/client.ts` is gone
- AI assistant, live agent, autosave summary, TeX preview, and TeX auto-fix now have clearer chunk boundaries

### 2. Advanced editor extensions now lazy-load

The advanced extension loader now follows the same factory pattern already used for document extensions.

Updated files:

- [src/components/editor/editorConfig.ts](../src/components/editor/editorConfig.ts)
- [src/components/editor/EditorToolbarPanelSections.tsx](../src/components/editor/EditorToolbarPanelSections.tsx)

Result:

- Mermaid and math editor extensions are not created until advanced blocks are actually enabled
- toolbar math preview now lazy-loads [src/components/editor/MathRender.tsx](../src/components/editor/MathRender.tsx) instead of importing it eagerly

### 3. Template fallback duplication removed

Template fallback generation was extracted out of the editor page and unified behind one helper.

New helper:

- [src/lib/editor/templateFallback.ts](../src/lib/editor/templateFallback.ts)

Updated page:

- [src/pages/Index.tsx](../src/pages/Index.tsx)

Result:

- duplicate fallback builders inside the editor page were removed from the active call path
- the fallback behavior now has direct regression coverage

### 4. Knowledge base recomputation pressure reduced

The knowledge hook was updated to avoid competing with the editor path on every immediate state transition.

Updated file:

- [src/hooks/useKnowledgeBase.ts](../src/hooks/useKnowledgeBase.ts)

Changes:

- `useDeferredValue` now gates document-derived knowledge records and search queries
- `startTransition` is used for non-urgent reconciliation updates
- storage sync work is deferred into idle time instead of competing with first paint
- live records are merged immediately into visible knowledge state so graph views do not stall on empty IndexedDB state

### 5. Rich-text patch review dependencies moved closer to execution

Patch review no longer eagerly imports the whole rich-text patching/rendering stack during route startup.

Updated file:

- [src/hooks/usePatchReview.ts](../src/hooks/usePatchReview.ts)

Result:

- AST patching, rendering, and text patch helpers are now loaded when applying patches rather than on initial route entry

### 6. Graph route fallback improved

The dedicated graph route can now build graph insights directly from current documents if persisted knowledge state is not yet populated.

Updated file:

- [src/pages/WorkspaceGraph.tsx](../src/pages/WorkspaceGraph.tsx)

Result:

- the release-closeout measurement flow no longer stalls waiting for an empty graph surface

### 7. Autosave persistence race fixed

Immediate document creation persistence was tightened so refs and saved snapshots stay aligned during create flows.

Updated file:

- [src/hooks/useDocumentManager.ts](../src/hooks/useDocumentManager.ts)

Result:

- newly created documents persist immediately with the correct active document id

## Verification completed

The following checks passed in this session:

- `npm run build`
- `npm run test`
- `npm run measure:release-closeout`

Focused regression tests added:

- [src/test/editorConfig.test.tsx](../src/test/editorConfig.test.tsx)
- [src/test/templateFallback.test.ts](../src/test/templateFallback.test.ts)

Related tests updated:

- [src/test/aiClient.test.ts](../src/test/aiClient.test.ts)
- [src/test/useTexAutoFix.test.tsx](../src/test/useTexAutoFix.test.tsx)
- [src/test/useTexValidation.test.tsx](../src/test/useTexValidation.test.tsx)
- [src/test/useVersionHistory.test.tsx](../src/test/useVersionHistory.test.tsx)

## Build and measurement notes

### Bundle notes

The bundle is better separated, but the main editor route is still large.

Relevant output from [dist/bundle-report.json](../dist/bundle-report.json):

- `assets/Index-*.js`: about `318 KB` raw, `93.6 KB` gzip
- `assets/ai-assistant-*.js`: about `38.8 KB` raw, `11.8 KB` gzip
- `assets/ai-agent-*.js`: about `152.4 KB` raw, `46.8 KB` gzip
- `assets/editorConfigAdvanced-*.js`: about `9.8 KB` raw, `3.2 KB` gzip
- `assets/MathRender-*.js`: about `1.4 KB` raw, `0.8 KB` gzip

This confirms that optional AI and advanced editor code is now split more explicitly than before.

### Release-closeout measurements

Captured in [output/playwright/release-closeout-performance.json](../output/playwright/release-closeout-performance.json).

Results:

- small: `editorLoadMs 1835`, `graphRouteOpenMs 653`, `knowledgeSearchMs 1291`, `queueCreationToReadyMs 20037`
- medium: `editorLoadMs 1409`, `graphRouteOpenMs 844`, `knowledgeSearchMs 1032`, `queueCreationToReadyMs 20639`
- large: `editorLoadMs 1411`, `graphRouteOpenMs 1516`, `knowledgeSearchMs 1639`, `queueCreationToReadyMs 23033`

Interpretation:

- startup did not improve enough to meet the planned 20% reduction target
- knowledge search improved in some tiers but not consistently enough to count as a finished optimization pass
- graph route and queue metrics remain sensitive to document scale and still need deeper work

## Limitations and remaining work

- [src/pages/Index.tsx](../src/pages/Index.tsx) is still too large and still owns too many hook-level responsibilities for the editor route.
- The core editor path still pays for a broad set of state wiring even after the client split.
- Math vendor assets still dominate when math is exercised, and route-level deferment is only partial.
- Queue creation latency is still mostly dominated by AI/network work, so this pass only removed frontend structural overhead around it.

## Recommended next step

The next optimization pass should focus on route-level decomposition of the editor shell:

1. move history, patch review, TeX preview/validation, and AI orchestration out of [src/pages/Index.tsx](../src/pages/Index.tsx) behind feature boundaries
2. reduce initial hook activation on `/editor` so optional subsystems do not initialize until their UI is opened
3. profile why the editor route still holds around `318 KB` in its primary chunk even after the transport split
