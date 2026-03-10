# Markdown Muse

Markdown Muse is a local-first technical document editor built around `.docsy`, `Document AST`, and review-first AI patch workflows.

Core characteristics:

- Markdown, LaTeX, HTML, JSON, YAML, AsciiDoc, and RST support
- rich-text editing and structured editing in one product
- AI output flows through `Patch Review` instead of mutating documents directly
- local knowledge indexing, graph inspection, and cross-document maintenance
- landing page and `/guide` user documentation

![Markdown Muse preview](src/assets/editor-preview.png)

## Language

- [Korean README](README.ko.md)
- [English README](README.en.md)

## Quick Summary

- Multi-document editing with tabs and a file sidebar
- Rich-text editing for Markdown, LaTeX, and HTML
- Structured editing for JSON and YAML
- `.docsy` save and restore
- `Document AST` serialization, rendering, validation, and patch application
- Review-first AI workflows for:
  - summaries
  - section generation
  - comparison
  - update suggestions
  - procedure extraction
  - TOC suggestions
- Local knowledge indexing and retrieval
- Version history with snapshot restore
- Share link and QR document sharing
- Clipboard export
- Responsive editor shell for desktop, tablet, and mobile

## Build Profiles

Markdown Muse currently ships with two runtime profiles.

- `desktop`
  The full editing surface is available by default, including document tools, structured editing, AI, history, knowledge panels, and advanced blocks.
- `web`
  The default editor starts lighter. Heavier features are activated only when needed.

Key commands:

- `npm run build`
  Desktop-oriented production build
- `npm run build:web`
  Web-oriented production build

Example:

```bash
# desktop profile
npm run build

# web profile
npm run build:web
```

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

### Run The AI Server

1. Create a local environment file

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

2. Configure `.env.local`

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `AI_SERVER_PORT`
- `AI_ALLOWED_ORIGIN`
- `VITE_AI_API_BASE_URL`

3. Start the AI server

```bash
npm run ai:server
```

4. Start the frontend in another terminal

```bash
npm run dev
```

## Scripts

- `npm run dev` - start the Vite dev server
- `npm run build` - desktop production build
- `npm run build:web` - web production build
- `npm run build:dev` - development-mode build
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint
- `npm run test` - run Vitest
- `npm run test:watch` - run Vitest in watch mode
- `npm run ai:server` - start the Gemini proxy server
- `npm run typecheck:server` - type-check server config

## Current Product Documentation

- [Implemented Features Summary](docs/implemented-features-summary-2026-03-11.md)
- [Implemented Features Summary (Korean)](docs/implemented-features-summary-ko-2026-03-11.md)
- [Developer Feature Map](docs/developer-feature-map-2026-03-11.md)
- [PRD Status Check](docs/prd-status-check-2026-03-11.md)

## Documentation Map

Use each documentation surface for a different purpose:

- `/guide`
  End-user guide inside the product. Use this when the goal is learning how to use the app.
- `docs/`
  Repository-facing product, implementation, planning, and release documents. Use this when the goal is understanding the current product state or engineering plan.
- `PRD/`
  Source requirement drafts and historical PRD material. Use this when the goal is tracing original requirements or older planning context.

## Main Documents

- [Docs Index](docs/README.md)
- [PRD Index](PRD/README.md)
- [Architecture Overview](docs/architecture-overview-2026-03-10.md)
- [Landing Guide Implementation Plan](docs/landing-guide-implementation-plan-2026-03-11.md)
- [Release Gate and DoD for v1.0](docs/release-gate-and-dod-v1-2026-03-10.md)
- [v0.8-v1.0 Execution Plan](docs/prd-v0.8-to-v1.0-execution-plan-2026-03-10.md)
- [Web Performance Optimization Summary](docs/session-summary-2026-03-10-web-performance-optimization.md)
- [GCP Deployment Guide](docs/gcp-deployment.md)

## Security Notes

- `GEMINI_API_KEY` is not shipped to the browser bundle.
- Gemini calls are handled through `server/aiServer.ts`.
- The frontend sends document payloads to the proxy, and secrets remain on the server through environment variables.
