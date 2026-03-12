# PRD v0.8 to v1.0 Execution Plan

Date: 2026-03-10

## Historical Note

This document is a historical execution plan from 2026-03-10.

For the current repository-state view, use:

- `docs/prd-status-check-2026-03-11.md`
- `docs/remaining-work-execution-plan-2026-03-11.md`
- `docs/release-closeout-checklist-2026-03-11.md`

## References

- `PRD/docsy_prd.docx`
- `docs/prd-v0.7-implementation-plan-2026-03-10.md`
- `docs/remaining-large-epics-post-v0.6-2026-03-09.md`
- `docs/session-summary-2026-03-10-v0.7-implementation-update.md`

## Purpose

This document turns the remaining PRD scope into an execution sequence that can
be implemented from the current repository state without mixing low-risk
stabilization work with larger product epics.

The intent is:

- stabilize the current editor/productization slice first
- finish the `v0.8` graph product surface
- raise the quality of `v0.9` health and change reasoning
- ship a review-first `v1.0` cross-document maintenance MVP

## Current Baseline

Already in place:

- `.docsy + Document AST + reviewable patch` foundation
- local knowledge index lifecycle and grouped retrieval
- workspace graph data model and consistency issue detection
- impact and change monitoring panels
- `v0.7` user-facing features: autosave feedback, history, share, TOC,
  format checks, responsive shell

Current constraint:

- the highest immediate risk is product regression in editor hydration,
  template flows, lazy dialogs, and source/WYSIWYG synchronization
- the next roadmap work should not begin on top of unstable creation and editing
  flows

## Delivery Strategy

Work in five sprints. Treat `Sprint 0` as a stabilization gate. Do not start
`v0.8` product work until the gate is closed.

## Sprint Schedule

### Sprint 0. Stabilization Gate

Target dates: 2026-03-11 to 2026-03-20

Goal:

- eliminate regressions introduced during recent UI and lazy-loading work

Backlog:

- stabilize template dialog loading and locale rendering
- fix template-based document creation hydration
- restore immediate source/WYSIWYG bidirectional sync in rich-text modes
- verify version history, patch review, knowledge sidebar, and share dialogs
- add targeted tests for template creation and initial editor hydration

Exit criteria:

- template button opens reliably
- template-selected documents render in WYSIWYG on first paint
- source edits reflect in WYSIWYG without visible lag
- no blocking crash in lazy dialogs

### Sprint 1. v0.8 Graph Productization

Target dates: 2026-03-23 to 2026-04-03

Goal:

- turn graph data into a primary workspace inspection surface

Backlog:

- add a dedicated graph route or expanded graph surface
- improve node inspection, filter persistence, and graph search
- expose node-to-document and node-to-issue workflows cleanly
- keep heuristic graph as the base layer and preserve AI overlay separation

Exit criteria:

- medium-sized workspaces remain readable
- graph is navigable without relying on summary cards only
- users can move from graph node to source document and issue context directly

### Sprint 2. v0.9 Health and Change Diagnostics

Target dates: 2026-04-06 to 2026-04-17

Goal:

- improve diagnostic trust and make impact reasoning explainable

Backlog:

- strengthen dependency path explanation in impact panels
- reduce similarity-only false positives
- add source fingerprint visibility and manual refresh/rescan affordances
- improve issue severity/action priority rules
- surface better causal explanations in health and consistency flows

Exit criteria:

- impact panels explain why a document is affected
- changed-source handling is traceable and manually recoverable
- health output is ordered by actionability rather than raw counts

### Sprint 3. v1.0 Cross-Document Maintenance MVP

Target dates: 2026-04-20 to 2026-05-01

Goal:

- ship a review-first multi-document maintenance flow

Backlog:

- introduce a multi-document suggestion queue
- preserve issue provenance and causal chain across queue items
- support one source document driving suggestions for multiple targets
- keep patch generation and patch review explicit per target document

Exit criteria:

- users can queue impacted docs for review
- every suggestion keeps source issue context
- no automatic mutation bypasses patch review

### Sprint 4. Retrieval, Trust, and Release Gates

Target dates: 2026-05-04 to 2026-05-15

Goal:

- close the trust and release gaps around `v1.0`

Backlog:

- add optional semantic reranking behind explicit provenance
- define audit and rollback expectations for suggestion flows
- tighten confidence/provenance display requirements
- add regression coverage around queueing, graph actions, and health reasoning
- define medium-workspace performance gates

Exit criteria:

- provenance is present in all AI-assisted maintenance flows
- rollback and review expectations are documented and testable
- the app remains usable on representative medium-sized workspaces

## Priority Backlog

### P0

- stabilize template dialog and locale-safe rendering
- fix editor hydration after `createDocument` and template selection
- restore rich-text source/WYSIWYG synchronization semantics
- add regression tests for template creation and initial editor render

### P1

- graph route/product surface
- graph node inspection and action handoff
- issue-to-suggestion causal chain persistence
- dependency reasoning and impact explanation improvements
- source fingerprint and manual refresh workflow
- multi-document review queue MVP

### P2

- optional semantic reranking with provenance
- retrieval evaluation fixtures and ranking calibration
- stronger queue prioritization heuristics

### P3

- always-on external watchers
- collaboration and multi-user review state
- fully automatic cross-workspace patch apply

## Phase 0 Implementation Order

1. Fix template dialog reliability and locale text consistency.
2. Fix template-based document creation so WYSIWYG hydrates immediately.
3. Fix source-to-editor and editor-to-source synchronization timing.
4. Add focused tests for template creation, hydration, and dialog load.
5. Re-run the main editor smoke path before starting graph work.

## Working Rules

- keep `detect -> suggest -> review -> apply`
- do not introduce automatic apply in `v1.0`
- keep heuristic graph as the primary truth layer
- treat AI-inferred relations as overlays with confidence and provenance
- prefer human-triggered source refresh over background watchers in this phase

## Risks To Watch

- graph UI work can add bundle and runtime cost quickly
- multi-document suggestions can lose provenance if queueing is underspecified
- retrieval changes can reduce trust if provenance is weaker than current
  keyword/structural behavior
- stabilization work is small individually but blocks every later sprint if left
  open

## Practical Next Step

Start `Sprint 0` immediately. The repository is close enough to the next roadmap
stage that unstable editor creation and dialog flows are now the main delivery
risk.
