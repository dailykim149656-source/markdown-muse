# Docsy Execution Plan

Version: `v0.1`  
Date: `2026-03-09`  
Source Documents:
- `PRD/docsy_prd_v0.2.docx`
- `PRD/docsy_system_architecture_v0.2.docx`

## 1. Purpose

This document translates the PRD and system architecture into an execution order that is technically defensible and implementable in the current codebase.

The key conclusion is:

- The current product already covers much of the editor/export MVP.
- The next major milestone is not "add AI first."
- The next major milestone is to establish a stable `Document AST` and `patch-based update` foundation so that future AI features can produce reliable, reviewable changes.

## 2. Product Intent Restated

Docsy is intended to become:

- a WYSIWYG technical writing IDE,
- a multi-format technical document compiler,
- and an AI-assisted documentation update platform.

The PRD makes three commitments that must remain true together:

1. Writing must stay easy for non-developers.
2. Export/import across technical formats must remain practical.
3. AI output must be reviewable as explicit patches, not silent overwrites.

## 3. Current State Assessment

### Already aligned with PRD

- WYSIWYG technical editor exists.
- TipTap extensions already cover key technical blocks:
  - Mermaid
  - math
  - admonitions
  - footnotes
  - cross references
  - figures
- Multi-format editing exists for:
  - Markdown
  - LaTeX
  - HTML
  - JSON
  - YAML
- Multi-format export exists for:
  - Markdown
  - LaTeX
  - Typst
  - AsciiDoc
  - RST
  - HTML
  - PDF
  - JSON
  - YAML
- Document management exists:
  - multi-tab
  - sidebar
  - autosave
  - session restore
- Structured JSON/YAML editor exists with source editing and schema validation.
- Canonical `Document AST` types, serializer, hydrator, and round-trip fixtures now exist.
- AST-native export paths now exist for:
  - Markdown
  - HTML
  - LaTeX
- Patch schema, patch review UI, decision flow, and AST patch apply engine now exist.
- External ingestion normalization now exists for:
  - Markdown
  - HTML
  - LaTeX
- Deterministic retrieval layers now exist for:
  - keyword retrieval
  - semantic chunk schema
  - in-memory vector search
- AI workflow contracts now exist for:
  - summarization
  - document comparison
  - section generation
  - procedure extraction
  - update suggestion patch generation

### Not yet aligned with PRD / architecture

- No production LLM provider or orchestration layer is connected yet.
- Vector retrieval currently uses an in-memory store; persistent indexing is not wired.
- AI workflows exist as deterministic/domain contracts, but are not yet surfaced as full end-user UI flows.
- Future-extension items from the architecture document remain intentionally deferred:
  - knowledge graph visualization
  - collaborative editing
  - AI-assisted structured writing

## 4. Planning Principles

### Principle 1: Stabilize the canonical model before AI

AI-generated edits are only useful if the document model is stable enough to:

- locate the exact target section,
- preview the change,
- apply or reject it safely,
- and preserve export fidelity.

### Principle 2: Keep current editor value while changing internals

The current editor/export stack is already useful. The architecture should evolve without regressing:

- current editing UX,
- current export coverage,
- current structured editing features.

### Principle 3: Separate product milestones from architecture milestones

- Product milestone: user-visible capabilities
- Architecture milestone: internal model and pipeline upgrades

Both must progress, but architecture must lead for the AI roadmap.

## 5. Recommended Workstreams

### Workstream A. Editor Foundation Stabilization

Goal:
- reduce orchestration complexity,
- centralize shared types,
- lock down existing editor/export behavior with tests.

Outcomes:
- thinner page shell,
- clearer domain boundaries,
- lower regression risk.

### Workstream B. Document AST Foundation

Goal:
- introduce a canonical document model independent of HTML.

Required node families:
- Heading
- Paragraph
- Text / Marks
- CodeBlock
- Table
- Image
- FigureCaption
- EquationInline
- EquationBlock
- MermaidBlock
- Admonition
- FootnoteRef
- FootnoteItem
- CrossReference
- HorizontalRule

Required properties:
- stable block id
- ordering
- attributes / metadata
- optional source mapping

### Workstream C. Conversion Engine v2

Goal:
- move toward `Format -> AST -> Target Format`.

Near-term rule:
- current HTML-based converters stay available while AST converters are introduced incrementally.

### Workstream D. Document Ingestion

Goal:
- import external documents into a normalized internal representation for analysis.

Pipeline:
- file load
- text extraction
- section parsing
- metadata extraction
- chunk generation

### Workstream E. Patch-Based Update System

Goal:
- make every AI suggestion reviewable.

Required elements:
- patch schema
- diff preview
- apply / reject / edit
- conflict handling

### Workstream F. AI Intelligence MVP

PRD-priority capabilities:
- summarization
- document comparison
- section generation
- procedure extraction
- update suggestions

### Workstream G. Retrieval Layer

Order of implementation:
1. keyword retrieval
2. semantic chunk retrieval
3. vector store integration

### Workstream H. Future Expansion

Later-stage items from architecture document:
- knowledge graph visualization
- collaborative editing
- AI-assisted structured writing

## 6. Phase Plan

## Phase 0 - Stabilize Current Editor

Target:
- current editor/export code is reliable enough to serve as the base for AST migration.

Scope:
- finish page/component decomposition
- centralize shared document types
- improve converter tests
- resolve newly introduced regressions before architectural expansion

Exit criteria:
- build passes
- tests pass
- core export paths are covered by regression tests

## Phase 1 - Introduce Document AST

Target:
- define the canonical document model.

Scope:
- AST type schema
- stable ids
- AST fixtures
- TipTap -> AST serializer
- AST -> TipTap hydrator

Exit criteria:
- a document can round-trip between editor state and AST for major node types
- stable ids survive edits/import/export where applicable

## Phase 2 - Start AST-Based Conversion

Target:
- reduce dependence on HTML intermediate for export and future patch targeting.

Scope:
- AST -> Markdown
- AST -> HTML
- AST -> LaTeX
- AST export contract tests

Exit criteria:
- at least 3 major export targets can render from AST
- converter tests cover rich technical blocks

## Phase 3 - Build Ingestion Pipeline

Target:
- external documents can be normalized for analysis.

Scope:
- ingestion interfaces
- section parser
- metadata extractor
- chunk schema
- import path for Markdown/HTML/LaTeX/JSON/YAML/AsciiDoc/RST

Exit criteria:
- imported documents produce sections, metadata, and chunks
- ingestion output is inspectable and testable

## Phase 4 - Build Patch Review System

Target:
- patch objects can be applied safely to documents.

Scope:
- patch schema
- patch renderer
- accept/reject/edit flow
- patch application engine

Exit criteria:
- a suggested change can be previewed and applied without direct raw overwrite
- user can reject or edit before apply

## Phase 5 - AI MVP

Target:
- user-visible AI assistance based on explicit reviewable suggestions.

Scope:
- summarize document
- compare two documents
- generate section draft
- extract procedure steps
- propose updates as patches

Exit criteria:
- each AI action produces either:
  - a generated artifact,
  - or a reviewable patch set

## Phase 6 - Retrieval Upgrade

Target:
- improve quality of AI context selection.

Scope:
- keyword retrieval
- semantic retrieval
- vector store
- source attribution

Exit criteria:
- AI actions can cite the chunks they used
- retrieval quality is meaningfully better than naive whole-document prompts

## 7. Immediate Execution Order

This is the recommended order for the next implementation window.

### Now

1. Connect AI workflows to user-facing commands/UI
2. Persist semantic/vector indices beyond in-memory runtime
3. Add provider-backed LLM orchestration for summary / comparison / update generation
4. Expand patch preview UX with richer grouped diffs and source citations

### Next

5. Add richer ingestion support for AsciiDoc / RST normalization
6. Add retrieval evaluation fixtures and ranking regression tests
7. Harden patch conflict handling and merge diagnostics

### Later

8. knowledge graph visualization
9. collaborative editing
10. AI-assisted structured writing

## 8. Risks

### Risk 1: Adding AI before patch infrastructure

Impact:
- AI may overwrite content with low trust and poor reviewability.

Response:
- do not ship AI mutation features before patch review exists.

### Risk 2: AST migration breaks current exports

Impact:
- current working export flows regress during migration.

Response:
- maintain hybrid support during transition:
  - keep HTML-based exporters alive,
  - add AST exporters incrementally,
  - compare outputs with regression tests.

### Risk 3: Unstable node identity

Impact:
- patches cannot target sections reliably.

Response:
- define block identity rules early and test them before patch work.

## 9. Definition of Success

This plan is successful when:

- the editor remains useful as a standalone technical writing tool,
- the system gains a canonical AST,
- AI suggestions become patch-based and reviewable,
- ingestion and retrieval provide grounded context for document updates.

## 10. Current Status Snapshot

As of `2026-03-09`, the non-deferred roadmap foundation is largely implemented:

- editor foundation stabilization is complete
- AST schema / serializer / hydrator / round-trip coverage is complete
- AST-native Markdown / HTML / LaTeX export is complete
- ingestion contracts and normalization are complete
- patch review and patch apply flow are complete
- retrieval foundations are complete
- deterministic AI workflow contracts are complete

The next concrete deliverable should be:

- provider-backed AI integration that consumes the existing retrieval, patch, and ingestion contracts without bypassing reviewable patch flow
