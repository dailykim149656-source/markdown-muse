# Docsy Issue Backlog

Version: `v0.1`  
Date: `2026-03-09`  
Source Documents:
- `PRD/docsy_prd_v0.2.docx`
- `PRD/docsy_system_architecture_v0.2.docx`

## 1. Backlog Rules

### Priority

- `P0`: blocks architecture or product roadmap
- `P1`: core milestone work
- `P2`: important improvement, but not blocking
- `P3`: later extension

### Status

- `Ready`: can be started now
- `Blocked`: depends on another item
- `Later`: intentionally deferred

## 2. Epic Overview

- `EPIC-A`: Editor Foundation
- `EPIC-B`: Document AST
- `EPIC-C`: Conversion Engine v2
- `EPIC-D`: Ingestion Pipeline
- `EPIC-E`: Patch Review System
- `EPIC-F`: AI Intelligence MVP
- `EPIC-G`: Retrieval Layer
- `EPIC-H`: Future Extensions

## 3. Ready Now

### DOC-001 - Centralize shared document types

- Epic: `EPIC-A`
- Priority: `P0`
- Status: `Ready`
- Summary: Move `DocumentData`, mode types, conversion-related shared types, and patch-ready identifiers into a central domain module.
- Why now: Current types are still distributed across editor-focused files.
- Acceptance criteria:
  - one shared document type module exists
  - `Index`, hooks, and editor components use the shared types
  - no duplicate mode/type definitions remain in active paths

### DOC-002 - Extract `EditorWorkspace` from page shell

- Epic: `EPIC-A`
- Priority: `P0`
- Status: `Ready`
- Depends on: `DOC-001`
- Summary: Move editor layout orchestration out of `src/pages/Index.tsx`.
- Acceptance criteria:
  - `Index` only wires hooks and top-level layout
  - editor header, tabs, preview, and find/replace layout move into a workspace component
  - no behavior regression in current editor flow

### DOC-003 - Add regression coverage for current export matrix

- Epic: `EPIC-A`
- Priority: `P0`
- Status: `Ready`
- Summary: Expand converter tests to lock current behavior before AST migration.
- Acceptance criteria:
  - export coverage includes rich blocks:
    - admonition
    - footnote
    - figure
    - cross reference
    - mermaid
    - math
  - golden or snapshot-style fixtures exist for representative documents

### AST-001 - Define `Document AST` schema

- Epic: `EPIC-B`
- Priority: `P0`
- Status: `Ready`
- Summary: Define the canonical node model and metadata contract.
- Acceptance criteria:
  - AST spec covers all currently supported technical blocks
  - mark model is documented
  - block identity fields are defined
  - patch targeting assumptions are documented

### AST-002 - Define stable block id strategy

- Epic: `EPIC-B`
- Priority: `P0`
- Status: `Ready`
- Depends on: `AST-001`
- Summary: Specify how block ids are created, persisted, and updated.
- Acceptance criteria:
  - id generation rules are deterministic
  - edits that should preserve identity do preserve identity
  - node replacement cases are documented

### AST-003 - Build TipTap -> AST serializer

- Epic: `EPIC-B`
- Priority: `P1`
- Status: `Ready`
- Depends on: `AST-001`, `AST-002`
- Summary: Convert current editor state into canonical AST.
- Acceptance criteria:
  - serializer supports major text blocks and technical nodes
  - serializer output is covered by fixtures/tests
  - unsupported nodes fail predictably, not silently

## 4. Next Queue

### AST-004 - Build AST -> TipTap hydrator

- Epic: `EPIC-B`
- Priority: `P1`
- Status: `Blocked`
- Depends on: `AST-003`
- Summary: Reconstruct editor documents from AST.
- Acceptance criteria:
  - AST fixtures can render back into editor state
  - major node attributes survive hydrate/dehydrate cycles

### AST-005 - Add AST round-trip fixture suite

- Epic: `EPIC-B`
- Priority: `P1`
- Status: `Blocked`
- Depends on: `AST-003`, `AST-004`
- Summary: Create representative technical document fixtures for serializer/hydrator validation.
- Acceptance criteria:
  - fixture set covers technical writing cases
  - round-trip assertions exist
  - regressions are visible in test output

### CONV-001 - AST -> Markdown exporter

- Epic: `EPIC-C`
- Priority: `P1`
- Status: `Blocked`
- Depends on: `AST-003`
- Summary: Start AST-native export path with Markdown.
- Acceptance criteria:
  - AST exports readable Markdown
  - technical blocks degrade or map predictably
  - tests compare output against expected fixtures

### CONV-002 - AST -> HTML exporter

- Epic: `EPIC-C`
- Priority: `P1`
- Status: `Blocked`
- Depends on: `AST-003`
- Summary: Provide canonical HTML rendering from AST.
- Acceptance criteria:
  - AST renders to HTML without using live editor DOM
  - preview/export can consume AST-generated HTML

### CONV-003 - AST -> LaTeX exporter

- Epic: `EPIC-C`
- Priority: `P1`
- Status: `Blocked`
- Depends on: `AST-003`
- Summary: Move LaTeX export away from direct HTML conversion where possible.
- Acceptance criteria:
  - headings, lists, code, tables, equations, figures, admonitions are covered
  - wrapper/preamble behavior is defined

### PATCH-001 - Define patch schema

- Epic: `EPIC-E`
- Priority: `P1`
- Status: `Ready`
- Depends on: `AST-001`, `AST-002`
- Summary: Define a structured patch object for AI suggestions.
- Acceptance criteria:
  - schema covers:
    - target id
    - operation type
    - original content
    - suggested content
    - reasoning / source metadata
  - schema supports preview before apply

### PATCH-002 - Build patch preview component

- Epic: `EPIC-E`
- Priority: `P1`
- Status: `Blocked`
- Depends on: `PATCH-001`
- Summary: UI for reviewing patch proposals before application.
- Acceptance criteria:
  - user can inspect original vs suggested content
  - user can accept, reject, or edit
  - multiple patches can be reviewed in sequence

### ING-001 - Define ingestion interfaces

- Epic: `EPIC-D`
- Priority: `P1`
- Status: `Ready`
- Summary: Create interface contracts for external document ingestion.
- Acceptance criteria:
  - input contract supports PRD-listed formats
  - output contract includes:
    - normalized text
    - sections
    - metadata
    - chunks

### ING-002 - Build section parsing and metadata extraction

- Epic: `EPIC-D`
- Priority: `P1`
- Status: `Blocked`
- Depends on: `ING-001`
- Summary: Extract analyzable structure from external files.
- Acceptance criteria:
  - sections have stable boundaries
  - metadata contract is explicit
  - extraction is test-covered for at least Markdown/HTML/LaTeX

## 5. AI MVP Backlog

### AI-001 - Summarization service contract

- Epic: `EPIC-F`
- Priority: `P1`
- Status: `Blocked`
- Depends on: `ING-001`, `ING-002`
- Summary: Define summary request/response format grounded on chunks and metadata.
- Acceptance criteria:
  - summary input references chunk ids
  - summary output supports source attribution

### AI-002 - Document comparison workflow

- Epic: `EPIC-F`
- Priority: `P1`
- Status: `Blocked`
- Depends on: `ING-002`, `PATCH-001`
- Summary: Compare two documents and emit reviewable deltas.
- Acceptance criteria:
  - comparison result distinguishes:
    - added
    - removed
    - changed
    - inconsistent
  - output can be mapped to patch previews where applicable

### AI-003 - Section generation workflow

- Epic: `EPIC-F`
- Priority: `P2`
- Status: `Blocked`
- Depends on: `PATCH-001`
- Summary: Generate new section drafts as insertable patches.
- Acceptance criteria:
  - generation output includes insertion target
  - user can review and edit before apply

### AI-004 - Procedure extraction workflow

- Epic: `EPIC-F`
- Priority: `P2`
- Status: `Blocked`
- Depends on: `ING-002`
- Summary: Extract SOP-style steps from source documents.
- Acceptance criteria:
  - output is structured as ordered steps
  - source chunks are attributable

### AI-005 - Update suggestion workflow

- Epic: `EPIC-F`
- Priority: `P1`
- Status: `Blocked`
- Depends on: `PATCH-001`, `PATCH-002`, `ING-002`
- Summary: Generate suggested document updates as explicit patches.
- Acceptance criteria:
  - no silent mutation path exists
  - every suggestion is reviewable

## 6. Retrieval Backlog

### RET-001 - Keyword retrieval layer

- Epic: `EPIC-G`
- Priority: `P1`
- Status: `Blocked`
- Depends on: `ING-002`
- Summary: Add deterministic retrieval before semantic search.
- Acceptance criteria:
  - chunks can be filtered/ranked by keywords and metadata
  - retrieval result format is reusable by AI workflows

### RET-002 - Semantic chunk schema

- Epic: `EPIC-G`
- Priority: `P2`
- Status: `Blocked`
- Depends on: `ING-002`
- Summary: Define embedding-ready chunk structure.
- Acceptance criteria:
  - chunk ids, hierarchy, metadata, and text boundaries are stable

### RET-003 - Vector store integration

- Epic: `EPIC-G`
- Priority: `P2`
- Status: `Blocked`
- Depends on: `RET-002`
- Summary: Add semantic retrieval storage and query path.
- Acceptance criteria:
  - vector indexing is reproducible
  - retrieved chunks preserve document provenance

## 7. Deferred Backlog

### FUT-001 - Knowledge graph visualization

- Epic: `EPIC-H`
- Priority: `P3`
- Status: `Later`
- Depends on: ingestion + retrieval maturity

### FUT-002 - Collaborative editing

- Epic: `EPIC-H`
- Priority: `P3`
- Status: `Later`
- Depends on: AST stability and patch/application maturity

### FUT-003 - AI-assisted structured writing

- Epic: `EPIC-H`
- Priority: `P3`
- Status: `Later`
- Depends on: AI MVP stability

## 8. Recommended First Sprint

The first sprint should contain only the items that unlock the rest of the roadmap.

### Sprint 1 Candidate Scope

- `DOC-001`
- `DOC-002`
- `DOC-003`
- `AST-001`
- `AST-002`

### Sprint 1 Exit Criteria

- shared types are centralized
- page shell is thinner
- current converter behavior is better locked down
- AST schema exists and is concrete enough to implement
- stable id strategy is approved

## 9. Recommended Second Sprint

- `AST-003`
- `AST-004`
- `AST-005`
- `PATCH-001`
- `ING-001`

## 10. Not Recommended Yet

The following should not start before AST and patch foundations exist:

- full AI assistant UI
- automatic document overwrite/update
- semantic retrieval first
- collaboration features
