# Release Closeout Checklist

Date: 2026-03-11
Status: Active checklist for RC closeout
Scope: Manual QA, performance thresholds, docs cleanup, and sign-off

## References

- `docs/release-gate-and-dod-v1-2026-03-10.md`
- `docs/prd-status-check-2026-03-11.md`
- `docs/remaining-work-execution-plan-2026-03-11.md`
- `docs/google-workspace-live-validation-runbook-2026-03-12.md`
- `docs/release-closeout-results-template-2026-03-12.md`

## Purpose

Use this document to close the remaining release-candidate gaps before calling
the current repository release-ready.

This checklist is intentionally operational. It is not a roadmap. It is the
execution surface for Phase 1 of the remaining work plan.

## Release-closeout goals

- validate the critical flows on representative workspaces
- document measured operating limits for graph and search
- confirm release-gate checks are observable in product
- clean docs so the latest documents are the default reference

## Workspace validation matrix

Prepare or reuse three representative datasets.

| Tier | Suggested shape | Required outcome |
| --- | --- | --- |
| Small | 5 to 15 docs, light cross-reference density | All flows feel instant and visually clear |
| Medium | 20 to 60 docs, mixed references and images | Graph, search, diagnostics, and queue remain usable |
| Large | 80+ docs or dense edge count | Product behavior is documented with explicit limits and warnings |

Record the actual dataset used for sign-off:

- Small dataset:
- Medium dataset:
- Large dataset:

## Critical flow checklist

### A. Editor and document creation

- [ ] Create a new markdown document and confirm first-paint editor hydration
- [ ] Open templates and create a markdown template document
- [ ] Open templates and create one structured-mode document (`json` or `yaml`)
- [ ] Confirm rich-text and source stay synchronized in markdown, HTML, and LaTeX
- [ ] Confirm autosave state updates after edits
- [ ] Confirm version history snapshot restore works

### B. Knowledge and diagnostics

- [ ] Confirm knowledge index becomes ready after document load
- [ ] Open document health and confirm cause, impact, and next-step guidance are visible
- [ ] Open change monitoring and confirm queue priority/reason text is visible
- [ ] Open consistency issues and confirm issue severity ordering feels actionable
- [ ] Open knowledge search and confirm rerank hint labels are visible

### C. Graph and cross-document flow

- [x] Open the dedicated graph route
- [ ] Confirm search, node filter, edge filter, and issue filter all work
- [x] Confirm issues-only mode narrows visible graph content
- [x] Open a document from the graph and confirm focus handoff works
- [x] Trigger a suggest-update action from graph context
- [x] Confirm `source -> target` context survives into queue or review flow

### D. Suggestion queue and patch review

- [x] Confirm queue item creation from diagnostics or graph context
- [x] Confirm queue item retry increments attempt count
- [x] Confirm queue item can reopen graph context
- [x] Confirm queue item can reopen patch review
- [x] Confirm patch review shows patch count, confidence, provenance coverage, and source counts
- [x] Confirm provenance-gap filtering works
- [x] Confirm no AI-assisted update applies without explicit review/apply action

### E. Google Workspace integration

- [ ] Connect a Google Workspace account
- [ ] List importable Google Docs files
- [ ] Import a Google Doc into the editor
- [ ] Rescan workspace changes and confirm changed sources surface correctly
- [ ] Refresh an imported document after remote change detection
- [ ] Apply a reviewed patch back to Google Docs
- [ ] Confirm sync conflicts are surfaced when the remote revision changed
- [ ] Confirm lossy-sync warnings are visible before or during sync workflows

### F. Build and regression

- [x] Run `npm run build`
- [x] Run focused vitest suites for graph, queue, patch review, diagnostics, and guide flows
- [x] Run `npm run test:e2e` or the Phase 1 subset if the full suite is too slow
- [x] Record any skipped coverage and the reason

## Performance threshold capture

Measured on 2026-03-12 using local `vite preview` plus
`npm run measure:release-closeout`.

| Area | Small | Medium | Large | Notes |
| --- | --- | --- | --- | --- |
| Initial editor load | `631 ms` | `432 ms` | `592 ms` | Local preview, seeded markdown workspace |
| Graph route open | `1002 ms` | `954 ms` | `1222 ms` | Waited for graph canvas visibility |
| Graph filter/search response | `105 ms` | `128 ms` | `310 ms` | Query: `Document 007` |
| Knowledge search response | `477 ms` | `498 ms` | `514 ms` | Query: `token-007` |
| Queue creation to ready state | `14013 ms` | `14854 ms` | `15712 ms` | Measured from graph-context `Suggest update` through queue/retry into visible Patch Review |

After measurement, update product and docs with explicit operating guidance:

- supported graph/search workspace range: validate up to `480 nodes / 900 edges`
- recommended review batch size: `4` for small, `2` for medium, `1` for large
- known degraded behavior outside validated range: graph search and queue-to-review latency both rise on large seeded workspaces, so issue-driven entry points and smaller batches should remain the default

## Docs cleanup checklist

- [x] `docs/README.md` points to the current status and execution docs first
- [x] broken doc links are removed or replaced
- [x] older roadmap docs are clearly treated as historical context
- [x] release-gate docs reference the current closeout checklist
- [x] latest status doc and remaining-work plan do not contradict each other

## Automated evidence captured on 2026-03-12

Validated in code or automated tests:

- `npm run build`
- `npx vitest run src/test/knowledgeOperationsPanel.test.tsx src/test/i18nCoverage.test.ts`
- `npx vitest run src/test/workspaceGraphPanel.test.tsx src/test/graphExplorerDialog.test.tsx src/test/i18nCoverage.test.ts`
- `npx vitest run src/test/graphExplorerContext.test.tsx src/test/suggestionQueuePanel.test.tsx src/test/dialogSmoke.test.tsx`
- `npx vitest run src/test/useWorkspaceSync.test.tsx src/test/useWorkspaceChanges.test.tsx`
- `npx vitest run src/test/workspaceLabels.test.ts src/test/useWorkspaceSync.test.tsx src/test/useWorkspaceChanges.test.tsx src/test/docsyAutosaveMigration.test.ts`
- `npx vitest run src/test/workspaceDialogs.test.tsx`
- `npx vitest run src/test/workspaceWarningSurfaces.test.tsx`
- `npx vitest run src/test/patchReviewMetrics.test.tsx src/test/dialogSmoke.test.tsx src/test/i18nCoverage.test.ts`
- `npx playwright test e2e/graph-regression.spec.ts -g "graph context can create a queue item and open patch review"`
- `npx playwright test e2e/graph-regression.spec.ts -g "queue item can reopen graph context"`
- `npx playwright test e2e/graph-regression.spec.ts -g "ai-assisted suggestions do not mutate the target document before explicit apply"`
- `npm run measure:release-closeout`

Measurement artifact:

- `output/playwright/release-closeout-performance.json`

Automated flow coverage now includes:

- operations gate validated-range messaging and release summary copy
- graph scale guidance and graph explorer guardrails
- graph context handoff into queue creation
- queue-to-graph re-entry from the suggestion queue
- queue retry and patch review reopen
- patch review metrics visibility
- provenance-gap filtering
- review-first guarantee that AI suggestions do not mutate documents before explicit apply
- workspace sync `409` conflict handling
- workspace sync warning persistence and synced-with-warnings labeling
- workspace warning visibility in header, tabs, and file sidebar surfaces
- workspace sync warning visibility inside Patch Review
- workspace rescan conflict marking and refresh pass-through
- Google Workspace connection and import dialog UI actions

Still not covered by the current automated results:

- representative real-account Google Workspace end-to-end validation
- real medium and large workspace manual sign-off
- lossy Google Docs sync warning verification through a live sync session

## Sign-off record

Fill this section when release-closeout work is complete.

- Build status: Passing on 2026-03-12 (`npm run build`)
- Focused vitest status: Passing for graph, queue, patch review, workspace dialogs, workspace warning surfaces, and workspace sync/change hooks
- E2E status: Passing for the Phase 1 graph-to-queue-to-review subset
- Small workspace sign-off:
- Medium workspace sign-off:
- Large workspace sign-off:
- Performance thresholds documented: Partially complete in product UI and closeout docs; seeded benchmark values are recorded, but real-workspace measurements are still open
- Docs cleanup complete: Complete for the current docs index and historical-plan labeling pass
- Open blockers: real-workspace manual QA, live Google Workspace validation, lossy sync validation
- Release-closeout decision: Not ready to close yet; automated baseline improved, manual and benchmark closure still pending

## Immediate execution order

1. Complete build and focused regression runs
2. Validate the small and medium datasets end to end
3. Measure graph/search limits and write explicit thresholds
4. Validate Google Workspace import, rescan, and sync conflict flows
5. Finish docs cleanup and record release-closeout decision
