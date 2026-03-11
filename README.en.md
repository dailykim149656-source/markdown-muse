# Docsy

Docsy is a hackathon-ready AI document workflow agent built on top of the Markdown Muse editor.

The product is designed around a review-first editing loop:

1. the user edits a document
2. Gemini analyzes document context
3. the system returns a structured action or patch proposal
4. the user reviews the proposed change before applying it

![Docsy editor preview](src/assets/editor-preview.png)

## Language

- [Default README](README.md)
- [Korean README](README.ko.md)

## Hackathon goal

This repository is being prepared for a Gemini hackathon submission that demonstrates:

- Gemini API integration through the Google GenAI SDK
- review-first patch workflows
- structured JSON output from the model
- a path to multimodal reasoning with editor screenshots
- a practical document maintenance use case

## Demo scenario

1. Open multiple technical documents.
2. Change a procedure in one of them.
3. Send document context and editor state to the AI service.
4. Gemini returns an action or patch proposal.
5. The app opens the patch review experience.
6. The user accepts or rejects the proposal.

## Repository layout

```text
src/       frontend editor and UI workflows
server/    Gemini-backed AI service
docs/      engineering documentation
PRD/       product requirement documents
public/    static assets
```

## Current product capabilities

- multi-document editing with tabs and sidebar workflows
- Markdown, LaTeX, HTML, JSON, and YAML editing
- document AST generation and structured patch support
- AI-assisted summaries, section generation, TOC suggestions, and update proposals
- patch review dialog instead of direct document mutation
- local knowledge indexing and related document workflows
- version history, sharing, and export flows

## Local setup

### Requirements

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run the web app

```bash
npm run dev
```

### Run the AI service

Create `.env.local`:

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Configure:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `AI_SERVER_PORT`
- `AI_ALLOWED_ORIGIN`
- `VITE_AI_API_BASE_URL`

Then start the service:

```bash
npm run ai:server
```

## Cloud Run deployment

The AI service is set up for Cloud Run deployment.

Deployment contract:

- Cloud Run provides `PORT`
- `GEMINI_API_KEY` should be injected from Secret Manager
- `GEMINI_MODEL` selects the Gemini model
- `AI_ALLOWED_ORIGIN` defines the permitted frontend origin list

Deployment files:

- [Dockerfile.ai](Dockerfile.ai)
- [cloudbuild.ai.yaml](cloudbuild.ai.yaml)

Frontend configuration:

- set `VITE_AI_API_BASE_URL` to the deployed AI service URL
- if unset outside localhost, the frontend falls back to same-origin

Health endpoint:

- `GET /api/ai/health`

## Main scripts

- `npm run dev`
- `npm run ai:server`
- `npm run build`
- `npm run build:web`
- `npm run preview`
- `npm run lint`
- `npm run test`
- `npm run typecheck:server`

## Key documents

- [Hackathon PRD](PRD/docsy_prd.md)
- [Final submission package](docs/final-submission-package-2026-03-11.md)
- [Hackathon implementation session summary](docs/session-summary-2026-03-11-hackathon-implementation.md)
- [Docs index](docs/README.md)
- [PRD index](PRD/README.md)
- [GCP deployment guide](docs/gcp-deployment.md)

## Security notes

- `GEMINI_API_KEY` is not exposed to the browser bundle.
- Gemini calls run through the server layer.
- Documents can be sent to the AI service, but credentials stay in server-side environment variables.
