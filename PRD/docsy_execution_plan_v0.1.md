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

### Not yet aligned with PRD / architecture

- No canonical `Document AST`.
- Conversion pipeline is still centered on `HTML intermediate`.
- No external document ingestion pipeline.
- No chunking / metadata extraction layer.
- No vector retrieval layer.
- No LLM analysis workflow.
- No patch review/apply system.

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

1. Shared document/domain types
2. `EditorWorkspace` decomposition
3. `Document AST` schema draft
4. stable block id strategy
5. TipTap -> AST serializer spike

### Next

6. AST fixtures and round-trip tests
7. AST -> Markdown/HTML export
8. patch schema draft
9. patch preview UI skeleton
10. ingestion contract definitions

### Later

11. external document parsing pipeline
12. patch apply engine
13. AI summarization and comparison MVP
14. semantic retrieval

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

## 10. Recommended Next Deliverable

The next concrete deliverable should be:

- `Document AST Design Spec`

That spec should define:

- node types,
- marks,
- ids,
- metadata fields,
- conversion boundaries,
- and patch target semantics.
