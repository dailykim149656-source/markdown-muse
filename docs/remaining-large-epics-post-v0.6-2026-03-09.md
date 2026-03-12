# Remaining Large Epics After v0.4-v0.6 Execution

Date: 2026-03-09

## Historical Note

This document records the post-v0.6 epic view from 2026-03-09.

Parts of this document have since been implemented, especially around graph
visualization and release-closeout productization.

For the current repository-state view, use:

- `docs/prd-status-check-2026-03-11.md`
- `docs/remaining-work-execution-plan-2026-03-11.md`
- `docs/release-closeout-checklist-2026-03-11.md`

## Context

The currently implemented scope now covers the practical and lower-risk portion of the PRD direction:

- local knowledge index with persistence
- index lifecycle controls (`reset`, `rebuild`, `reindex`)
- stale detection and index metadata
- image-aware ingestion and retrieval
- grouped knowledge search
- workspace graph/health foundations
- active-document impact workflow
- issue-driven document open and patch suggestion flow

What remains is no longer "incremental feature fill-in". The remaining items are larger product/architecture epics that require separate design and implementation phases.

## 1. Graph Visualization UI

### What is missing

- interactive graph canvas for document/section/image relationships
- pan/zoom/filter/search over graph nodes and edges
- graph-focused inspection workflow from node to source document
- visual clustering for duplicate, similar, and reference relationships

### Why it is a large epic

- current code computes graph data, but does not yet provide a dedicated visualization surface
- once a graph UI exists, layout stability, rendering performance, node interaction, and mobile behavior become product concerns
- graph UX needs decisions on scale limits, default grouping, edge visibility, and issue overlays

### Recommended implementation direction

- start with a dedicated `Workspace Graph` panel or route
- reuse current `workspaceInsights` graph model as the first data source
- support only `document`, `section`, and `image` nodes first
- gate graph size with heuristics and filters before adding arbitrary full-graph rendering

### Key risks

- poor readability on medium or large workspaces
- high bundle/runtime cost if the graph library is introduced carelessly
- visual complexity outrunning actual user value

## 2. External Change Monitoring

### What is missing

- repository watcher or file-system watcher for external sources
- source refresh flow for imported references
- periodic rescan or snapshot comparison against external files
- change event history for "what changed since last review"

### Why it is a large epic

- current impact analysis is based on already indexed local workspace documents
- PRD-level "living documentation" requires inputs from outside the currently opened editor session
- connectors, snapshots, diffing, and provenance rules need to be designed together

### Recommended implementation direction

- begin with manual `rescan` and `refresh imported source` actions
- store source fingerprints per imported document
- add repository snapshot comparison before introducing automatic watchers
- keep the workflow human-triggered until reliability is proven

### Key risks

- noisy false positives
- missing change provenance
- platform-specific watcher behavior
- unclear behavior when source files move, split, or are renamed

## 3. Automated Health-to-Patch Pipeline

### What is missing

- direct workflow from health issue to generated patch plan
- automatic impacted-document batching
- multi-document patch suggestion orchestration
- queueing/review model for many impacted documents

### Why it is a large epic

- current system can show issues and can generate reviewable patches, but the orchestration between them is still user-driven
- once multiple impacted documents are involved, prioritization and batching matter
- patch generation across several documents needs stronger guardrails than single-document comparison

### Recommended implementation direction

- add a `Suggest fixes` action per health issue category
- support one impacted target document at a time first
- only after that, add multi-document review queues
- preserve the current `detect -> suggest -> review -> apply` contract

### Key risks

- patch flood from weak issue detection
- low-confidence suggestions consuming review time
- users losing track of causal chains between source change and suggested patch

## 4. Concept and Semantic Graph Intelligence

### What is missing

- concept nodes beyond document/section/image
- semantic entity extraction
- stronger duplicate/conflict detection than title/reference heuristics
- relationship confidence scoring and explanation

### Why it is a large epic

- current graph uses deterministic and heuristic relationships
- PRD-level knowledge graph becomes much more valuable only when concept extraction works reliably
- concept extraction quality strongly affects false positive rates in similarity, conflict, and dependency views

### Recommended implementation direction

- keep deterministic graph edges as the default layer
- add concept extraction only as a second, optional overlay
- attach confidence and provenance to every inferred concept edge
- avoid making inferred concept links first-class editing targets too early

### Key risks

- high false positive rate
- unclear trust model for AI-inferred relations
- difficult evaluation without representative document corpora

## 5. Fully Automatic Self-Maintaining Documentation Loop

### What is missing

- autonomous monitoring of source systems
- autonomous impact detection
- autonomous patch generation across workspace scope
- background execution policy, audit trail, and safety controls

### Why it is a large epic

- this is the highest-risk interpretation of the PRD direction
- the current product is intentionally review-first
- full automation introduces policy, safety, and accountability questions that are not solved by the current architecture alone

### Recommended implementation direction

- do not jump directly to autonomous apply flows
- keep the system manual or semi-automatic:
  - detect
  - summarize
  - suggest
  - review
  - apply
- require explicit user approval for every document mutation

### Key risks

- silent regressions in documentation
- hard-to-audit changes
- over-trust in low-confidence automation
- poor rollback experience

## 6. Collaboration and Multi-User Editing

### What is missing

- real-time collaborative editing
- shared patch review state
- concurrent knowledge index updates
- multi-user activity/provenance model

### Why it is a large epic

- this is orthogonal to most current local-first implementation work
- collaboration requires conflict resolution, shared persistence, and user identity
- AST/patch review semantics complicate concurrent mutation handling

### Recommended implementation direction

- treat this as a separate product stream
- do not mix it into the current PRD execution line unless collaboration becomes a hard requirement

### Key risks

- CRDT/OT complexity
- review state conflicts
- large architectural changes to persistence and sync

## 7. Production-Grade Semantic Retrieval

### What is missing

- durable vector storage beyond lightweight local indexing
- embedding generation/update policy
- hybrid retrieval tuning
- corpus-scale ranking evaluation

### Why it is a large epic

- current retrieval is intentionally local, lightweight, and interpretable
- stronger semantic retrieval introduces model lifecycle, storage, and cost questions
- evaluation and provenance matter more once retrieval quality affects patch generation

### Recommended implementation direction

- keep keyword and structural retrieval as the default
- add semantic retrieval as an optional second-stage reranker
- require explicit provenance display in every AI workflow that uses retrieved context

### Key risks

- retrieval opacity
- stale embeddings
- quality drift when models change

## Recommended Next Priority Order

If work continues beyond the implemented v0.6 foundation, the safest order is:

1. Graph visualization UI
2. Manual external change monitoring and source refresh
3. Health issue to patch suggestion workflow
4. Semantic/concept graph overlay
5. Production-grade retrieval
6. Collaboration
7. Fully automatic self-maintaining loop

## Non-Recommendations

The following should not be attempted as a first next step:

- full autonomous documentation updates
- AI-inferred concept graph as the primary graph layer
- large graph canvas before filter and grouping rules exist
- always-on filesystem or repository watchers without provenance/fingerprint design
- multi-document automatic patch application

## Practical Conclusion

The repository is now at the point where the remaining work is mostly about productized orchestration and higher-risk systems design, not missing local editor fundamentals.

In other words:

- the editor and patch-review core are already in place
- the knowledge layer is already real
- the remaining roadmap is mostly about scaling visibility, automation, and trust

That means future work should be planned as explicit epics with separate acceptance criteria, not as small follow-up chores.
