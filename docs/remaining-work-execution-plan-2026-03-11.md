# Remaining Work Execution Plan

Date: 2026-03-11
Status: Current follow-up implementation plan
Scope: Post-RC remaining work in the current repository

## References

- `docs/implemented-features-summary-2026-03-11.md`
- `docs/prd-status-check-2026-03-11.md`
- `docs/release-gate-and-dod-v1-2026-03-10.md`
- `docs/remaining-large-epics-post-v0.6-2026-03-09.md`

## Purpose

This document turns the currently remaining work into an execution order that
matches the actual repository state as of 2026-03-11.

The intent is:

- close release-candidate gaps first
- improve retrieval quality next
- harden Google Workspace sync after that
- keep larger v1+ epics out of the immediate release line

## Current repository position

Already implemented in product terms:

- core editor, templates, autosave, version history, share, and export
- review-first AI authoring and patch review
- workspace graph, diagnostics, suggestion queue, and operations gate
- landing and guide surfaces
- Google Workspace connect, import, rescan, and sync routes

Still open in meaningful terms:

- final real-workspace manual QA and release closure
- hard performance thresholds backed by measured numbers
- retrieval beyond heuristic semantic rerank
- Google Docs sync fidelity for non-trivial markdown structures
- longer-horizon epics such as collaboration and autonomous maintenance

## Delivery strategy

Work in four phases.

- Phase 1 is a release-closeout phase and should be completed before any larger
  product expansion.
- Phases 2 and 3 are quality-expansion phases that can proceed after release
  closure or in parallel if staffing allows.
- Phase 4 contains separate epics and should not be mixed into release work.

## Phase 1. Release Closeout

Target objective:

- turn the current release candidate into a fully closed release candidate with
  repeatable validation and explicit operating limits

Main tasks:

- create a representative manual QA matrix for small, medium, and large
  workspaces
- validate the critical end-to-end flows:
  - editor creation and template hydration
  - graph exploration and graph-to-editor handoff
  - diagnostics to queue to patch review
  - workspace import, rescan, refresh, and sync conflict handling
- define benchmark-backed thresholds for supported workspace sizes
- align docs so the newest state documents are the clear source of truth
- clean broken or stale doc references in the docs index

Suggested implementation targets:

- `src/components/editor/KnowledgeOperationsPanel.tsx`
- `src/components/editor/WorkspaceGraphPanel.tsx`
- `src/components/editor/GraphCanvas.tsx`
- `e2e/editor-regression.spec.ts`
- `e2e/graph-regression.spec.ts`
- `docs/README.md`
- `docs/release-gate-and-dod-v1-2026-03-10.md`

Exit criteria:

- representative workspace validation is documented and executed
- build passes and focused regression suites pass
- supported graph/search workspace limits are stated with actual measured values
- docs index points readers to the current-state planning documents

## Phase 2. Retrieval Quality Expansion

Target objective:

- move semantic search from heuristic expansion plus rerank to a real hybrid
  retrieval path while preserving explainability

Main tasks:

- define an embedding generation path for normalized ingestion chunks
- connect vector retrieval into the live search flow
- keep keyword retrieval as the base layer and add vector retrieval as a second
  stage or blended stage
- preserve provenance, rerank reason labels, and operator-visible trust signals
- add retrieval evaluation fixtures and regression checks

Suggested implementation targets:

- `src/lib/knowledge/knowledgeIndex.ts`
- `src/lib/retrieval/vectorStore.ts`
- `src/lib/retrieval/semanticChunkSchema.ts`
- `src/hooks/useKnowledgeBase.ts`
- `src/components/editor/KnowledgeSearchPanel.tsx`
- `src/test/knowledgeSearchRerank.test.tsx`
- `src/test/vectorStore.test.ts`

Exit criteria:

- semantic mode uses actual vector-backed retrieval or hybrid retrieval
- retrieval results remain explainable through visible labels or provenance
- evaluation fixtures show measurable improvement on ambiguous semantic queries

## Phase 3. Google Workspace Sync Fidelity

Target objective:

- reduce the gap between local editor richness and Google Docs round-trip
  fidelity

Current known loss points:

- code fences
- math blocks
- images
- markdown tables
- block quotes and admonitions
- TOC placeholders
- footnotes
- cross-references
- some inline formatting reductions

Main tasks:

- prioritize supported sync fidelity for the highest-value structures first
- improve pre-sync warnings so lossy transforms are explicit before apply
- extend Google Docs mapping coverage where feasible
- add round-trip regression fixtures for import and sync behavior
- define a documented support matrix for what sync preserves and what it
  flattens

Suggested implementation targets:

- `server/modules/workspace/googleDocsMapper.ts`
- `server/modules/workspace/routes.ts`
- `src/hooks/useWorkspaceSync.ts`
- `src/components/editor/WorkspaceConnectionDialog.tsx`
- `src/components/editor/PatchReviewDialog.tsx`

Exit criteria:

- the highest-frequency document structures have improved preservation
- remaining lossy structures are explicitly disclosed in product and docs
- sync regression fixtures exist for representative imported documents

## Phase 4. Long-Horizon Epics

These should be treated as separate design streams, not as follow-up chores.

### 4.1 Concept and semantic graph overlay

Goal:

- move beyond `document / section / image` graph nodes into inferred concept
  and entity relationships with confidence and provenance

### 4.2 External background change monitoring

Goal:

- evolve from manual rescan and refresh into durable watcher or connector-based
  change monitoring

### 4.3 Collaboration and multi-user editing

Goal:

- add identity, concurrent review state, and collaborative editing semantics

### 4.4 Autonomous maintenance loop

Goal:

- explore background detect and suggest workflows without breaking the
  review-first contract

Constraint:

- do not introduce silent auto-apply behavior into the current release line

## Recommended execution order

1. Release-closeout docs cleanup and QA matrix
2. Performance measurement and hard threshold definition
3. Focused e2e expansion around graph, queue, and workspace sync
4. Hybrid retrieval implementation
5. Google Workspace sync fidelity improvements
6. Separate design docs for long-horizon epics

## Risks and guardrails

### Risk 1. Mixing release work with product expansion

Guardrail:

- do not start Phase 2 or 3 changes by weakening release validation ownership

### Risk 2. Better retrieval reducing trust

Guardrail:

- keep provenance and rerank explanations mandatory in AI-assisted flows

### Risk 3. Workspace sync appearing lossless when it is not

Guardrail:

- preserve explicit warnings and add stronger pre-apply disclosure

### Risk 4. Large epics disrupting the current architecture

Guardrail:

- require separate design docs and acceptance criteria before implementation

## Immediate next step

Start with Phase 1 and close the repository-level release gaps:

1. document the manual QA matrix
2. measure workspace-size operating limits
3. expand focused e2e coverage where the release gate depends on it
4. clean docs so the latest status documents are the default reference
