# Sprint 0 Stabilization Backlog

Date: 2026-03-10

## Goal

Close the blocking regressions introduced during recent UI, lazy-loading, and
editor productization work so `v0.8` graph work can begin on a stable base.

This sprint is complete only when document creation, template flows, editor
hydration, and sidebar/dialog entry points behave predictably again.

## Scope

In scope:

- template dialog reliability
- locale-safe template UI
- template-based document creation hydration
- rich-text source/WYSIWYG synchronization
- lazy dialog smoke path stability
- focused regression coverage

Out of scope:

- new graph features
- health reasoning improvements
- multi-document queueing
- semantic retrieval changes

## Execution Order

1. Fix template dialog reliability and locale consistency.
2. Fix template-selected document creation and first-paint hydration.
3. Fix rich-text source/WYSIWYG synchronization semantics.
4. Add targeted regression coverage for the broken flows.
5. Run a narrow stabilization verification pass.

## Backlog

### P0-001 Template Dialog Load Reliability

Problem:

- template button can open a blank/white surface if the dialog module or its
  locale text is in a bad state

Implementation:

- keep `TemplateDialog` data structure simple and deterministic
- remove brittle locale branching that can break lazy render
- keep template definitions and UI text separate

Primary files:

- `src/components/editor/TemplateDialog.tsx`
- `src/components/editor/EditorWorkspace.tsx`

Done when:

- template button opens a dialog every time
- no white screen occurs on first open or reopen
- dialog still supports search, category, and mode filters

### P0-002 Template Locale Consistency

Problem:

- template names/descriptions and controls can mix English and Korean in the
  same view

Implementation:

- bind template UI text to current `locale` only
- ensure category labels, filter labels, and template card text all switch
  together

Primary files:

- `src/components/editor/TemplateDialog.tsx`
- `src/i18n/I18nProvider.tsx`
- `src/i18n/core.ts`

Done when:

- `ko` shows a fully Korean template UI surface
- `en` shows a fully English template UI surface
- switching locale does not leave stale category filter state behind

### P0-003 Template Creation Hydration

Problem:

- creating a document from a template can leave WYSIWYG blank on first render
  even when content exists

Implementation:

- ensure `createDocument` passes stable initial content and snapshots
- ensure rich-text editors hydrate initial content after extension readiness
- remove any editor hold behavior that blocks rendering when advanced/document
  extensions are not actually required

Primary files:

- `src/pages/Index.tsx`
- `src/hooks/useDocumentManager.ts`
- `src/components/editor/MarkdownEditor.tsx`
- `src/components/editor/LatexEditor.tsx`
- `src/components/editor/HtmlEditor.tsx`
- `src/components/editor/editorConfig.ts`

Done when:

- selecting a markdown template renders content in WYSIWYG immediately
- selecting a latex/html template also renders immediately
- template-based docs do not require manual tab/mode changes to appear

### P0-004 Source <-> WYSIWYG Sync Restoration

Problem:

- source editing no longer feels live in one or both directions

Implementation:

- replace delayed sync behavior that visibly lags user input
- keep loop prevention guards but use frame-level sync instead of long debounce
- avoid redundant `setContent` when editor HTML is already current

Primary files:

- `src/components/editor/MarkdownEditor.tsx`
- `src/components/editor/LatexEditor.tsx`
- `src/components/editor/HtmlEditor.tsx`
- `src/components/editor/SourcePanel.tsx`

Done when:

- typing in source updates WYSIWYG without obvious lag
- typing in WYSIWYG updates source without drift
- sync guards prevent infinite feedback loops

### P0-005 Lazy Dialog Entry Smoke Path

Problem:

- template/history/share/patch/AI dialogs now sit behind lazy boundaries and can
  regress independently

Implementation:

- verify all dialog open/close paths still mount correctly
- ensure fallback states do not mask runtime errors
- keep dialog props stable across first render

Primary files:

- `src/components/editor/EditorWorkspace.tsx`
- `src/pages/Index.tsx`
- `src/components/editor/TemplateDialog.tsx`

Done when:

- each dialog opens from its primary entry point
- first-open and reopen both work
- no dialog leaves the app in a blank content state

### P1-001 Template Inventory Review

Problem:

- template set drifted and no longer clearly matches roadmap use cases

Implementation:

- keep core writing templates
- add roadmap-relevant templates for graph, impact, and maintenance workflows
- keep blank template at low visual priority

Primary files:

- `src/components/editor/TemplateDialog.tsx`

Done when:

- template list covers editor writing, operations, change tracking, and
  cross-document maintenance scenarios
- blank template remains available without dominating the list

### P1-002 Template Fallback Safety

Problem:

- if a template has empty content or a malformed payload, document creation can
  silently degrade to a blank editor

Implementation:

- add locale-aware fallback content per mode
- ensure fallback content is only used when template content is empty

Primary files:

- `src/pages/Index.tsx`

Done when:

- no non-blank template creates an empty document
- fallback content follows current locale

### P1-003 Regression Tests

Problem:

- the broken flows were not protected by targeted tests

Implementation:

- add focused tests around template creation
- add tests or smoke coverage for initial rich-text hydration
- add tests around locale-driven template rendering

Suggested test targets:

- `src/test/`
- template dialog behavior test
- document creation hydration test
- editor sync behavior test

Done when:

- the exact regressions fixed in this sprint are covered
- tests fail if template content is not rendered into WYSIWYG

## Validation Pass

Do not run broad validation first. Use a narrow pass after P0 tasks are closed:

1. open template dialog
2. create one markdown template doc
3. create one html or latex template doc
4. confirm WYSIWYG/source bidirectional sync
5. open history, share, patch review, and AI dialogs once each
6. run targeted tests for template creation and hydration
7. run a build once after targeted tests pass

## Release Gate

Sprint 0 is not complete if any of the following remain:

- template button can blank the editor surface
- template-selected docs do not hydrate on first render
- source/WYSIWYG sync still feels delayed or one-directional
- locale switching leaves mixed template UI labels

## Handoff To Sprint 1

Only start `v0.8 graph productization` after:

- all `P0` items are closed
- `P1-003` regression tests exist
- one narrow build/test verification pass is green
