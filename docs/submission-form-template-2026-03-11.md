# Docsy Submission Form Template

## Project name

Docsy

## Tagline

Gemini-powered review-first document maintenance

## One-line summary

Docsy is a review-first AI document workflow agent that uses Gemini to turn technical document context into structured, reviewable editor actions.

## Short description

Docsy helps teams maintain technical documentation safely. Instead of auto-editing documents, it analyzes document context, related files, and editor state, then proposes structured actions and patch suggestions that users review before applying.

## Problem statement

Technical documentation drifts across multiple files. A procedure changes in one SOP or runbook, but related documents are often left outdated. Most AI tools can generate text, but they do not fit the real workflow of maintaining documentation safely.

## Solution

Docsy treats documentation maintenance as a workflow problem. The editor gathers document context, structure, related-document signals, and multimodal editor-state input, sends that to a Gemini-powered AI service, and receives structured JSON actions or patch proposals in return. The product then opens a review-first patch workflow instead of silently mutating the document.

## What Gemini is used for

- multimodal context handling
- structured JSON output
- patch and action proposal generation
- review-first workflow triggering

## Key features

- review-first patch workflow
- structured AI action output
- related-document recommendation
- conflict highlighting
- TOC suggestion preview
- before/after patch review cards

## Why this is a strong Gemini use case

Docsy needs more than text generation. It needs multimodal context, structured output, and model behavior that maps into a real product workflow. Gemini is used to return operational editor actions rather than assistant prose.

## Public repository

`[REPLACE_WITH_GITHUB_REPO_URL]`

## Demo video

`[REPLACE_WITH_DEMO_VIDEO_URL]`

## Live demo or deployed URL

`[REPLACE_WITH_DEPLOYED_FRONTEND_URL]`

## AI service URL

`[REPLACE_WITH_CLOUD_RUN_AI_URL]`

## Architecture summary

- frontend: React + Vite editor
- AI service: Node.js on Cloud Run
- model access: Google GenAI SDK
- output pattern: structured JSON + patch review

## Demo flow

1. Open multiple related technical documents.
2. Update one procedure.
3. Let Docsy identify related documents and conflict signals.
4. Send structured multimodal context to Gemini.
5. Receive action JSON and patch proposal.
6. Open patch review and let the user accept or reject the change.

## What is novel here

The product does not treat AI as unrestricted text generation. It treats AI as a workflow agent that understands document structure, proposes safe actions, and keeps users in control through review-first patch application.

## Current limitations

- the current image input is a generated editor-state snapshot, not full DOM capture
- one action type is wired end-to-end today
- the strongest path is documentation patch review, not a general autonomous agent

## Final submission notes

- fill in the repo, video, and deployment links
- verify `/api/ai/health` before submitting
- keep the demo under 90 seconds
