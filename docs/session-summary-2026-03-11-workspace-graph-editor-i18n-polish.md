# 2026-03-11 Workspace Graph, Editor, and i18n Session Summary

## Scope

This session focused on stabilizing editor behavior, expanding the Workspace Graph into a usable graph-review surface, separating incompatible editor mode families in the UI, and cleaning up Korean localization quality.

It also included regression coverage work so the latest graph and editor changes are protected by both Vitest and Playwright.

## What Was Done

### 1. Workspace Graph implementation moved beyond list-only exploration

The graph-related PRD documents in `PRD/` were reviewed against the current codebase and the feasible implementation path was executed in stages.

Implemented areas:

- Added explicit graph modes: `Full graph`, `Document graph`, `Issues graph`
- Added issue-focused graph filtering by issue kind
- Added issue-driven graph edges and issue severity metadata on graph nodes
- Added an SVG graph canvas with:
  - zoom in / zoom out
  - center reset
  - drag pan
  - canvas height presets and slider
  - fullscreen mode
  - mini-map
  - mini-map drag / click viewport movement
  - hover detail cards for nodes and edges
  - richer visual legend with node and edge samples
- Improved graph layout stability with a dedicated layout helper
- Added section/image deep-link navigation from graph nodes back into the editor
- Added AST-aware section/image targeting for more reliable in-editor navigation

Key files:

- `src/lib/knowledge/workspaceInsights.ts`
- `src/components/editor/workspaceGraphUtils.ts`
- `src/components/editor/WorkspaceGraphPanel.tsx`
- `src/components/editor/GraphExplorerDialog.tsx`
- `src/components/editor/GraphCanvas.tsx`
- `src/components/editor/graphCanvasLayout.ts`
- `src/lib/editor/editorFocusTarget.ts`
- `src/lib/editor/editorFocusNavigation.ts`
- `src/lib/ast/documentIndex.ts`
- `src/pages/WorkspaceGraph.tsx`
- `src/pages/Index.tsx`

## 2. WYSIWYG editing stability issues were fixed

The editor had a reseed loop where parent state updates echoed back into TipTap and triggered repeated `setContent(...)` calls during typing.

That loop caused:

- cursor jumps
- unstable line movement while typing
- backspace/delete failures
- HTML source <-> WYSIWYG sync instability

Fixes:

- introduced a seed-sync guard utility
- prevented same-session prop echoes from reseeding the editor
- kept true external document changes able to reseed
- preserved source pane synchronization

Key files:

- `src/components/editor/editorSeedSync.ts`
- `src/components/editor/MarkdownEditor.tsx`
- `src/components/editor/HtmlEditor.tsx`
- `src/components/editor/LatexEditor.tsx`

## 3. Rich-text and structured editors were separated in the UX

`markdown` / `latex` / `html` and `json` / `yaml` were treated as incompatible mode families instead of one shared convertible set.

Implemented changes:

- introduced explicit mode families
- allowed switching only within the same family
- blocked cross-family conversion inside the same document
- changed cross-family actions in the header to `New {mode}` document creation instead of in-place conversion

Key files:

- `src/lib/editor/modeFamilies.ts`
- `src/hooks/useFormatConversion.ts`
- `src/components/editor/EditorHeader.tsx`
- `src/pages/Index.tsx`

## 4. Korean localization quality was repaired

The previous Korean message file had widespread mojibake/corrupted strings.

What changed:

- rebuilt `ko.ts` on top of `en.ts` fallback structure
- removed corrupted display paths
- restored valid Korean strings for high-traffic UI areas
- expanded Korean coverage further for:
  - graph
  - health / consistency
  - suggestion queue
  - change monitoring
  - templates
  - toolbar controls

This means:

- Korean UI no longer falls back to broken mojibake text
- untranslated keys safely fall back to English instead of rendering corrupted content

Key files:

- `src/i18n/messages/ko.ts`
- `src/i18n/messages/en.ts`
- `src/i18n/core.ts`

## 5. Regression coverage was expanded

### Vitest

Graph coverage was expanded and kept passing for:

- graph canvas
- graph explorer dialog
- workspace graph panel
- graph layout
- workspace insights
- i18n coverage

Key test files:

- `src/test/graphCanvas.test.tsx`
- `src/test/graphExplorerDialog.test.tsx`
- `src/test/workspaceGraphPanel.test.tsx`
- `src/test/graphCanvasLayout.test.ts`
- `src/test/workspaceInsights.test.ts`
- `src/test/i18nCoverage.test.ts`

### Playwright

Existing editor regression coverage remained in place, and a new graph regression spec was added.

Graph e2e coverage now checks:

- graph canvas rendering from seeded autosave state
- hover detail behavior
- focus-selection and reset-view flow
- fullscreen open/close flow
- issues-graph narrowing behavior

Key e2e files:

- `e2e/editor-regression.spec.ts`
- `e2e/graph-regression.spec.ts`
- `playwright.config.ts`

## Related Existing Session Notes

This session built on earlier work that was already documented separately:

- [2026-03-11 Docsy Import/Delete/Duplication Fixes](session-summary-2026-03-11-docsy-import-delete-duplication-fixes.md)
- [2026-03-11 Hackathon Implementation Summary](session-summary-2026-03-11-hackathon-implementation.md)

## Validation Run

The following verification was completed during this session:

### Focused Vitest runs

- `npx vitest run src/test/i18nCoverage.test.ts src/test/graphCanvas.test.tsx src/test/graphExplorerDialog.test.tsx src/test/workspaceGraphPanel.test.tsx`
- `npx vitest run src/test/graphCanvas.test.tsx src/test/graphExplorerDialog.test.tsx src/test/workspaceGraphPanel.test.tsx src/test/workspaceInsights.test.ts src/test/graphCanvasLayout.test.ts src/test/i18nCoverage.test.ts`
- earlier editor and format-conversion focused suites were also run while implementing individual fixes

### Playwright

- `npx playwright test e2e/editor-regression.spec.ts`
- `npx playwright test e2e/graph-regression.spec.ts`

### Build

- `npm run build`

## Result

At the end of the session:

- Workspace Graph is now a real interactive review surface rather than only a list-style inspector
- graph-driven section/image navigation works more reliably
- WYSIWYG editing regressions are fixed and covered
- incompatible editor mode families are clearly separated in the UX
- Korean localization no longer renders corrupted text
- graph and editor behavior are protected by both unit/integration and browser-level regression tests
