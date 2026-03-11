# Docsy Hackathon Submission Brief

## One-line summary

Docsy is a review-first AI document workflow agent that uses Gemini to analyze technical document context and return structured, reviewable actions instead of directly rewriting files.

## Problem

Technical documentation drifts quickly:

- one SOP is updated but related documents are not
- procedures diverge across teams
- AI tools often generate text, but not safe editor actions

Docsy addresses this by combining document structure, related-document context, and editor state into a workflow where AI proposes reviewable patch actions.

## What the product demonstrates

- multi-document technical editor
- review-first patch workflow
- Gemini-backed structured JSON output
- multimodal request path with document context plus image payload
- one real UI action triggered from AI output

## Why Gemini

Docsy is designed around Gemini because the product needs more than plain text generation:

- structured JSON responses for editor actions
- multimodal reasoning for document context plus screenshot-like UI state
- grounded patch workflows that fit a technical documentation product

## Current implemented demo path

1. The user opens related technical documents.
2. The user changes a procedure in one document.
3. The app builds document context and sends it to the AI service.
4. The AI service sends multimodal structured input to Gemini.
5. Gemini returns action JSON.
6. The app opens patch review.
7. The user accepts or rejects the proposed change.

## Gemini usage in this repo

### Structured generation

- summaries
- section generation
- TOC suggestion
- action proposal for editor workflows

### Multimodal path

- the frontend generates an image payload representing current editor context
- the AI service forwards the image and prompt together to Gemini

### Action JSON

Current action type implemented:

- `open_patch_review`

This makes the AI response operational inside the editor instead of staying as assistant text.

## Architecture snapshot

- frontend: React + Vite editor
- AI service: Node.js service
- model access: Google GenAI SDK
- deployment target: Cloud Run
- output pattern: action JSON + patch review

See also:

- [architecture-hackathon-2026-03-11.md](architecture-hackathon-2026-03-11.md)
- [demo-script-2026-03-11.md](demo-script-2026-03-11.md)

## Hackathon category fit

### Strong fit

- Gemini API usage
- multimodal context path
- real product workflow instead of isolated prompting
- structured model output tied to UI behavior

### Product differentiation

Docsy does not position AI as auto-writing text into documents.

It positions AI as a workflow agent that:

- understands document structure
- identifies where review is needed
- proposes safe, reviewable actions
- keeps the user in control

## What is already polished enough for judging

- Cloud Run-ready AI service path
- public repo messaging
- architecture documentation
- demo script
- related-document recommendation
- conflict highlighting
- TOC suggestion preview
- before/after patch review cards

## Known limitations

- the current image input is a generated editor-state snapshot, not a full DOM screenshot capture
- only one action type is wired end-to-end today
- the strongest path is the patch review workflow, not a fully autonomous multi-step agent

## Judge-facing message

Docsy shows how Gemini can power a safer class of productivity tools: not just text generation, but structured, multimodal, review-first workflow actions for maintaining technical documentation.
