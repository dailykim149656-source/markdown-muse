# Markdown Muse

Language: [Korean](README.ko.md) | [English](README.en.md)

Markdown Muse is a local-first technical document editor built around rich-text
editing, `.docsy` persistence, `Document AST`, and reviewable patches.

It supports `Markdown`, `LaTeX`, `HTML`, `JSON`, `YAML`, `AsciiDoc`, and
`reStructuredText`, and it uses an AI workflow that generates reviewable patch
sets instead of modifying documents directly.

![Markdown Muse preview](src/assets/editor-preview.png)

## What It Does

- Multi-document editing with tabs and a file sidebar
- Rich-text editing for Markdown, LaTeX, and HTML
- Structured editing for JSON and YAML
- Local autosave and session restore
- `.docsy` save and restore with richer editor state preservation
- `Document AST` serialization, rendering, validation, and patch application
- Review-first AI workflows for summaries, section generation, comparisons,
  update suggestions, and procedure extraction
- Local knowledge indexing with search over normalized document chunks
- Import and export for `Markdown`, `LaTeX`, `HTML`, `Typst`, `AsciiDoc`,
  `reStructuredText`, `JSON`, `YAML`, and `PDF`
- Mermaid diagrams, math, tables, admonitions, footnotes, captions, and cross
  references
- `ko/en` UI internationalization

## Core Product Model

Markdown Muse is not just a text editor.

The current implementation follows this model:

- Source formats are import and export surfaces
- `.docsy` is the persistence format that preserves richer editor state
- `Document AST` is the canonical structured document representation
- AI output becomes a reviewable patch set
- Users inspect, accept, reject, or edit changes before they are applied

## Key Capabilities

### Editing

- `Markdown`, `LaTeX`, and `HTML` rich-text editing
- `JSON` and `YAML` structured editing
- Mode switching and format conversion
- Find and replace for rich text and plain text editors

### AI and Review

- AI summary generation with attribution details
- Section generation into Patch Review
- Document comparison preview
- Update suggestion generation into Patch Review
- Procedure extraction from the active document
- Patch Review for both rich-text and structured document flows

### Knowledge Layer

- Local knowledge index for opened and imported documents
- IndexedDB-backed storage with localStorage fallback
- Sidebar search over normalized sections and chunks
- Source provenance preserved for imported files

### Structured Data

- JSON and YAML schema-aware editing surface
- Structured patch application via `structured_path`
- Safe review flow for structured patches without unsafe free-form rewrites

## Architecture Overview

### UI Layer

- `src/components/editor`
- `src/pages`
- `src/i18n`

This layer contains the editor UI, dialogs, toolbar, preview, sidebar, and
localized interface strings.

### State and Workflow Layer

- `src/hooks/useDocumentManager.ts`
- `src/hooks/useEditorUiState.ts`
- `src/hooks/useFormatConversion.ts`
- `src/hooks/useDocumentIO.ts`
- `src/hooks/useAiAssistant.ts`
- `src/hooks/usePatchReview.ts`
- `src/hooks/useKnowledgeBase.ts`

These hooks coordinate document state, UI state, format conversion, file IO, AI
actions, patch review, and local knowledge indexing.

### Domain Layer

- `src/lib/ast`
- `src/lib/docsy`
- `src/lib/patches`
- `src/lib/ai`
- `src/lib/ingestion`
- `src/lib/retrieval`
- `src/lib/knowledge`

This layer handles AST transforms, `.docsy` persistence, patch validation and
application, AI orchestration, ingestion normalization, retrieval, and local
knowledge indexing.

### Server Layer

- `server/aiServer.ts`

Gemini requests are proxied through the local Node server rather than being sent
directly from the browser.

## Project Structure

```text
.
|- docs/                      # session summaries and roadmap notes
|- PRD/                       # product and architecture documents
|- public/
|- server/                    # Gemini proxy server
|- src/
|  |- assets/
|  |- components/
|  |  |- editor/             # editor UI, dialogs, extensions, preview
|  |  |- ui/                 # shared shadcn/ui components
|  |- hooks/                 # state, workflow, AI, IO, knowledge hooks
|  |- i18n/                  # translations and provider
|  |- lib/
|  |  |- ai/
|  |  |- ast/
|  |  |- docsy/
|  |  |- ingestion/
|  |  |- knowledge/
|  |  |- patches/
|  |  |- rendering/
|  |  |- retrieval/
|  |- pages/
|  |- test/
|  |- types/
|- .env.example
|- package.json
`- README.md
```

## Supported Formats

### Import and Open

- `.docsy`
- `.md`
- `.markdown`
- `.txt`
- `.tex`
- `.html`
- `.htm`
- `.json`
- `.yaml`
- `.yml`
- `.adoc`
- `.asciidoc`
- `.rst`

### Export

- Markdown
- LaTeX
- HTML
- JSON
- YAML
- Typst
- AsciiDoc
- reStructuredText
- PDF via browser print flow

## `.docsy` Format

`.docsy` is the application persistence format.

It is designed to preserve richer state than plain source formats, including:

- document metadata
- TipTap JSON
- `Document AST`
- source snapshots by mode
- autosave recovery state

Source formats such as Markdown or LaTeX are still important import and export
targets, but `.docsy` is the format intended to minimize state loss across save
and restore.

## Local Knowledge and AI

The AI and retrieval model is review-first and local-first where possible.

- The client prepares editor content and normalized retrieval context
- The local AI server proxies Gemini requests
- Generated output is returned as summaries or patch sets
- Patch sets are reviewed before application
- Opened and imported documents are indexed into the local knowledge store

Relevant paths:

- `src/components/editor/AiAssistantDialog.tsx`
- `src/components/editor/PatchReviewDialog.tsx`
- `src/components/editor/PatchReviewPanel.tsx`
- `src/components/editor/KnowledgeSearchPanel.tsx`
- `src/hooks/useAiAssistant.ts`
- `src/hooks/usePatchReview.ts`
- `src/hooks/useKnowledgeBase.ts`
- `src/lib/ai`
- `src/lib/knowledge`
- `server/aiServer.ts`

## Getting Started

### Requirements

- Node.js 18 or newer
- npm

### Install

```bash
npm install
```

### Run the App

```bash
npm run dev
```

The default Vite dev server runs on `http://localhost:8080`.

### Run the AI Server

1. Create a local environment file.

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

2. Configure `.env.local`.

- `GEMINI_API_KEY`
- `GEMINI_MODEL` default: `gemini-2.5-flash`
- `AI_SERVER_PORT` default: `8787`
- `AI_ALLOWED_ORIGIN` default: `http://localhost:8080`
- `VITE_AI_API_BASE_URL` default: `http://localhost:8787`

3. Start the AI server.

```bash
npm run ai:server
```

4. Start the frontend in another terminal.

```bash
npm run dev
```

## Scripts

- `npm run dev` - start the Vite dev server
- `npm run build` - production build
- `npm run build:dev` - development-mode build
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint
- `npm run test` - run Vitest
- `npm run test:watch` - run Vitest in watch mode
- `npm run ai:server` - start the Gemini proxy server
- `npm run typecheck:server` - type-check the server config

## Test Coverage Areas

Tests live in `src/test/` and currently focus on:

- format conversion and round-trip behavior
- AST rendering and validation
- `.docsy` file format and autosave migration
- patch parsing, review, and application
- structured patch application
- ingestion normalization
- retrieval contracts and vector store behavior
- selected editor UI behavior

Representative test files:

- `src/test/docsyFileFormat.test.ts`
- `src/test/docsyAutosaveMigration.test.ts`
- `src/test/docsyRichTextRoundtrip.test.ts`
- `src/test/applyDocumentPatch.test.ts`
- `src/test/applyStructuredPatchSet.test.ts`
- `src/test/reviewPatchSet.test.ts`
- `src/test/compareDocuments.test.ts`
- `src/test/knowledgeIndex.test.ts`
- `src/test/normalizeIngestionRequest.test.ts`
- `src/test/patchReviewPanel.test.tsx`

## Documentation

### docs

- [2026-03-09 Session Summary](docs/session-summary-2026-03-09.md)
- [2026-03-09 Docsy Storage Update](docs/session-summary-2026-03-09-docsy.md)
- [2026-03-09 Engineering Update](docs/session-summary-2026-03-09-engineering-update.md)
- [2026-03-09 Feasible Roadmap](docs/prd-feasible-implementation-roadmap-2026-03-09.md)
- [2026-03-09 Roadmap Execution Summary](docs/session-summary-2026-03-09-roadmap-execution.md)

### PRD

- [Execution Plan v0.1](PRD/docsy_execution_plan_v0.1.md)
- [Issue Backlog v0.1](PRD/docsy_issue_backlog_v0.1.md)
- [Document AST Design Spec v0.1](PRD/docsy_document_ast_design_spec_v0.1.md)

## Security Notes

- `GEMINI_API_KEY` is not shipped to the browser bundle
- Gemini calls are handled through `server/aiServer.ts`
- The frontend sends document payloads to the proxy and the server manages the
  secret through environment variables
