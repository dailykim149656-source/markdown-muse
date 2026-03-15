# Release Gate and DoD for PRD v1.0

Date: 2026-03-10
Status: Draft working reference
Scope: Markdown Muse `v0.8 -> v1.0`

## Objective

This document fixes the release gate for the current PRD scope and ties it to
implemented product surfaces:

- `Workspace Graph`
- `Document Health / Change Monitoring`
- `Suggestion Queue`
- `Patch Review`
- `Knowledge Search rerank`

The goal is to define what "ready for v1.0" means in product terms, operator
terms, and implementation terms.

## Current implementation baseline

Implemented now:

- Graph route and graph surface with `source -> target` context handoff
- Consistency, impact, and change flows connected into graph exploration
- Review-first suggestion flow using `Patch Review`
- Multi-document suggestion queue with retry, graph re-entry, and review reopen
- Patch review metrics for confidence and provenance coverage
- Knowledge search semantic rerank with term expansion and title/section bias

Not yet fixed as a final release artifact:

- Release-closeout execution and operator sign-off still need to be completed
- Synonym coverage beyond heuristic expansion
- Medium and large workspace usability thresholds documented as hard limits

## v1.0 Definition of Done

`v1.0` is done only if all items below are true.

1. Review-first safety
- No AI-driven document update is auto-applied.
- All generated updates enter `Patch Review` before document mutation.
- Patch review shows patch count, confidence tier, provenance coverage, and source attribution count.

2. Cross-document orchestration
- Suggestions can be queued across multiple source/target document pairs.
- Queue items keep context, priority, retry state, and provenance summary.
- Queue items can reopen graph context and patch review.

3. Explainability
- Health issues show likely cause, impact scope, and next action.
- Change monitoring shows queue priority and reason.
- Graph route shows source/target chain context and issue metadata.
- Search results expose rerank hints instead of opaque ordering only.

4. Handoff visibility
- Operators can inspect queue state before handoff.
- Patch review exposes patch counts, confidence tiers, and provenance coverage.
- Share/export remains downstream of review and sync checks.

5. Validation baseline
- Focused regression tests exist for graph handoff, queue UI,
  patch review metrics, diagnostics panels, and knowledge search rerank.
- Production build completes successfully.

## Release gate

The release gate is a `pass` only if all checks below pass.

### Gate A: queue health

Pass condition:

- Failed queue items = `0`
- Running queue items = `0` at release decision time

Hold condition:

- Any failed queue item still unresolved
- Any queue item still running while the release decision is made

Current product surface:

- `Suggestion Queue` panel

### Gate B: provenance coverage

Pass condition:

- Provenance coverage for ready patch sets = `100%`

Hold condition:

- Any ready suggestion lacks source provenance in loaded patch data

Current product surface:

- `Patch Review` metrics header
- `Suggestion Queue` panel

### Gate C: review readiness

Pass condition:

- Patch review can be opened directly from queue items
- Accepted patch count is visible before apply
- Operators can inspect patch confidence tier

Hold condition:

- Review entry is broken
- Patch metadata is missing

Current product surface:

- `Suggestion Queue`
- `Patch Review`

### Gate D: diagnostic traceability

Pass condition:

- Operators can move from diagnostics -> graph -> queue/review
- Consistency, change, and impact contexts preserve source/target relationship

Hold condition:

- Context is lost between surfaces
- Graph re-entry or patch-review re-entry is broken

Current product surface:

- `Change Monitoring`
- `Document Impact`
- `Consistency Issues`
- `Workspace Graph`

## Manual verification checklist

Use this list before a release candidate is declared ready.

For the operational execution version of this checklist, use:

- `docs/release-closeout-checklist-2026-03-11.md`

1. Open a consistency issue and move into graph.
2. Confirm `source -> target` chain is visible.
3. Trigger `Suggest patch` from graph.
4. Confirm a queue item is created.
5. Reopen the queue item in `Patch Review`.
6. Confirm confidence and provenance metrics are visible.
7. Confirm queue status and patch-review metrics reflect the current review state.
8. Retry a queue item and confirm attempt count increments.
9. Use `Queue all` from change monitoring and confirm FIFO processing.
10. Run build and focused regression tests.

## Implemented traceability

Primary UI surfaces:

- `src/components/editor/GraphExplorerDialog.tsx`
- `src/components/editor/SuggestionQueuePanel.tsx`
- `src/components/editor/PatchReviewDialog.tsx`
- `src/components/editor/DocumentHealthPanel.tsx`
- `src/components/editor/ChangeMonitoringPanel.tsx`
- `src/components/editor/DocumentImpactPanel.tsx`
- `src/components/editor/KnowledgeSearchPanel.tsx`

Primary orchestration/state:

- `src/pages/Index.tsx`
- `src/hooks/useAiAssistant.ts`
- `src/hooks/useKnowledgeBase.ts`
- `src/lib/knowledge/knowledgeIndex.ts`

Primary regression coverage:

- `src/test/patchReviewMetrics.test.tsx`
- `src/test/suggestionQueuePanel.test.tsx`
- `src/test/healthDiagnosticsPanel.test.tsx`
- `src/test/graphExplorerContext.test.tsx`
- `src/test/knowledgeGraphActions.test.tsx`
- `src/test/knowledgeSearchRerank.test.tsx`

## Remaining work after this gate

These are outside the minimum `v1.0` gate, but are the next quality steps.

1. Expand semantic retrieval beyond heuristic synonym expansion.
2. Define workspace-size performance thresholds for graph/search explicitly.
3. Add persistent operator analytics if release telemetry becomes necessary.
