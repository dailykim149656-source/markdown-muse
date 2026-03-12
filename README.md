# Docsy

Docsy is a hackathon-ready AI document workflow agent built on top of the Markdown Muse editor.

It focuses on one core interaction:

1. a user edits a technical document
2. Gemini analyzes document context
3. the system proposes a structured action or patch
4. the user reviews the change before applying it

![Docsy editor preview](src/assets/editor-preview.png)

## Language

- [Korean README](README.ko.md)
- [English README](README.en.md)

## Why this project exists

Technical documentation usually breaks in the same places:

- procedures drift across documents
- updates are applied to one file but not related files
- AI can draft text, but it rarely returns reviewable actions

Docsy is designed to show a different pattern:

- document-aware editing
- review-first AI patch workflow
- Gemini-powered structured output
- a path to multimodal reasoning with editor screenshots

## Hackathon focus

This repository is being prepared for a Gemini hackathon submission.

Current submission priorities:

- GenAI SDK based Gemini integration
- Cloud Run deployment for the AI service
- multimodal request path for editor screenshot + document context
- action-oriented JSON response from Gemini
- one real UI action wired from AI output
- review-first patch workflow demo

## Demo flow

1. Open multiple technical documents in the editor.
2. Update a procedure in one document.
3. Send document context and editor state to the AI service.
4. Gemini returns a structured action or patch proposal.
5. The app opens the patch review flow.
6. The user accepts or rejects the change.

## Repository structure

```text
src/       frontend editor, patch review UI, workspace panels
server/    Gemini-backed AI service for structured responses
docs/      engineering notes, plans, and architecture docs
PRD/       product requirement documents for the hackathon direction
public/    static web assets
```

## Core capabilities

- multi-document editor with tabs and workspace sidebar
- Markdown, LaTeX, HTML, JSON, and YAML editing
- document AST generation and structured patch handling
- Google Workspace connection, Google Docs import/export, and bound-document save
- AI-assisted summaries, section generation, TOC suggestions, and update proposals
- patch review dialog instead of silent document mutation
- local knowledge indexing and related document workflows
- version history and share/export flows

## Local development

### Requirements

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Start the web app

```bash
npm run dev
```

### Start the AI service

Create a local env file:

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Set at least:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `AI_SERVER_PORT`
- `AI_ALLOWED_ORIGIN`
- `VITE_AI_API_BASE_URL`

Then run:

```bash
npm run ai:server
```

## Cloud Run deployment

The AI service is prepared for Cloud Run.

Runtime contract:

- `PORT` is provided by Cloud Run
- `GEMINI_API_KEY` should come from Secret Manager
- `GEMINI_MODEL` selects the model
- `AI_ALLOWED_ORIGIN` controls allowed frontend origins

Build and deploy pipeline:

- [Dockerfile.ai](Dockerfile.ai)
- [cloudbuild.ai.yaml](cloudbuild.ai.yaml)

Frontend deployment:

- set `VITE_AI_API_BASE_URL` to the deployed AI service URL
- if omitted in a non-localhost environment, the frontend falls back to same-origin

Health check:

- `GET /api/ai/health`

## Main scripts

- `npm run dev` - start the Vite dev server
- `npm run ai:server` - start the AI service locally
- `npm run build` - desktop-oriented production build
- `npm run build:web` - web-oriented production build
- `npm run preview` - preview the web build
- `npm run lint` - run ESLint
- `npm run test` - run Vitest
- `npm run typecheck:server` - type-check server code

## Important documents

- [Hackathon PRD](PRD/docsy_prd.md)
- [Final submission package](docs/final-submission-package-2026-03-11.md)
- [Hackathon implementation session summary](docs/session-summary-2026-03-11-hackathon-implementation.md)
- [Google Docs export session summary](docs/session-summary-2026-03-12-google-docs-export-and-google-dropdown.md)
- [Docs index](docs/README.md)
- [PRD index](PRD/README.md)
- [GCP deployment guide](docs/gcp-deployment.md)

## Security notes

- `GEMINI_API_KEY` is never exposed to the browser bundle.
- Gemini calls are routed through the server layer.
- The frontend sends document payloads to the AI service, while secrets stay in server environment variables.

## Status

This repository is under active hackathon preparation.

The current implementation already contains editor, patch review, and document analysis building blocks. The remaining work is focused on tightening the Gemini demo path: screenshot input, multimodal prompting, action JSON, and one end-to-end UI action.
