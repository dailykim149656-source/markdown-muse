# Markdown Muse

Markdown Muse is a local-first technical document editor built around rich-text
editing, `.docsy` persistence, `Document AST`, and reviewable AI patch
workflows.

It supports `Markdown`, `LaTeX`, `HTML`, `JSON`, `YAML`, `AsciiDoc`, and
`reStructuredText`, and it uses an AI workflow that produces reviewable patch
sets instead of mutating documents directly.

![Markdown Muse preview](src/assets/editor-preview.png)

## What It Does

- Multi-document editing with tabs and a file sidebar
- Rich-text editing for Markdown, LaTeX, and HTML
- Structured editing for JSON and YAML
- Local autosave and session restore
- `.docsy` save and restore with richer editor state preservation
- `Document AST` serialization, rendering, validation, and patch application
- Review-first AI workflows for summaries, section generation, comparisons,
  update suggestions, procedure extraction, and TOC suggestions
- Local knowledge indexing with search over normalized document chunks
- Local version history with snapshot preview and restore
- Share-link and QR-based lightweight document sharing
- Clipboard export for Markdown, HTML, JSON, and YAML
- Responsive editor shell for desktop, tablet, and mobile

## Desktop And Web Profiles

Markdown Muse now ships with two runtime profiles.

- `desktop`
  The full editing surface is available by default, including document tools,
  structured editing, AI, history, knowledge panels, and advanced blocks.
- `web`
  The default editor starts in a lighter mode focused on text, headings, lists,
  blockquotes, inline formatting, and links. Heavier features are activated
  only when needed.

Build commands:

- `npm run build`
  Desktop-oriented production build.
- `npm run build:web`
  Web-oriented production build with lighter default loading behavior.

Example:

```bash
# Desktop profile
npm run build

# Web profile
npm run build:web
```

## Recent Optimization Summary

Recent work focused on reducing the web route cost without breaking desktop
feature coverage.

- Core rich-text editing is separated from document tools and advanced blocks.
- Document tools are opt-in on web.
  This includes tables, images, captions, cross-references, footnotes,
  admonitions, TOC placeholders, code-block UI, and font controls.
- Advanced blocks are opt-in on web.
  This includes math and Mermaid editing.
- Structured editing remains supported, but `JSON` and `YAML` are opened
  explicitly instead of being exposed in the default web mode switch.
- AI, knowledge, history, share, and structured editing paths are loaded
  through lazy runtime boundaries.
- Desktop keeps the full feature set visible while allowing internal lazy
  loading where appropriate.

Representative web build snapshot:

- `/editor` main chunk: about `270KB raw / 79KB gzip`
- `EditorToolbarDocumentTools` chunk: about `21KB raw`
- `EditorToolbarAdvancedTools` chunk: about `3KB raw`

## Architecture Notes

### Product Model

- Source formats are import and export surfaces.
- `.docsy` is the persistence format that preserves richer editor state.
- `Document AST` is the canonical structured document representation.
- AI output becomes a reviewable patch set.
- Users inspect, accept, reject, or edit changes before application.

### Layering

- `src/components/editor`
  Editor UI, dialogs, toolbars, preview, and sidebar features.
- `src/hooks`
  Document state, UI state, file IO, AI orchestration, patch review, and
  knowledge workflows.
- `src/lib/ast`
  AST transforms, rendering, indexing, and validation.
- `src/lib/docsy`
  `.docsy` persistence and compatibility helpers.
- `src/lib/ai`
  AI contracts, patch generation, comparison, TOC logic, and procedure
  extraction.
- `src/lib/knowledge`
  Local indexing, provenance, consistency analysis, and workspace graph logic.
- `server/aiServer.ts`
  Gemini proxy server used by the web client.

## Getting Started

### Requirements

- Node.js 18 or newer
- npm

### Install

```bash
npm install
```

### Run The Frontend

```bash
npm run dev
```

The default Vite dev server runs on `http://localhost:8080`.

### Run The AI Server

1. Create a local environment file.

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

2. Configure `.env.local`.

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `AI_SERVER_PORT`
- `AI_ALLOWED_ORIGIN`
- `VITE_AI_API_BASE_URL`

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
- `npm run build` - production desktop-oriented build
- `npm run build:web` - production web-oriented build
- `npm run build:dev` - development-mode build
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint
- `npm run test` - run Vitest
- `npm run test:watch` - run Vitest in watch mode
- `npm run ai:server` - start the Gemini proxy server
- `npm run typecheck:server` - type-check the server config

## Documentation

- [Docs Index](docs/README.md)
- [PRD Index](PRD/README.md)
- [Architecture Overview](docs/architecture-overview-2026-03-10.md)
- [Web Performance Optimization Summary](docs/session-summary-2026-03-10-web-performance-optimization.md)
- [GCP Deployment Guide](docs/gcp-deployment.md)
- [v0.7 Implementation Update](docs/session-summary-2026-03-10-v0.7-implementation-update.md)
- [v0.7 Implementation Plan](docs/prd-v0.7-implementation-plan-2026-03-10.md)
- [Feasible Roadmap](docs/prd-feasible-implementation-roadmap-2026-03-09.md)

## Security Notes

- `GEMINI_API_KEY` is not shipped to the browser bundle.
- Gemini calls are handled through `server/aiServer.ts`.
- The frontend sends document payloads to the proxy, and the server manages the
  secret through environment variables.
