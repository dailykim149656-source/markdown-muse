# Docsy Devpost Submission Copy

## Project name

Docsy

## Recommended category

UI Navigator

## Why this category fits

Docsy is a screen-aware document workflow agent. It observes editor state, uses Gemini multimodal input to interpret the current document and workspace context, and returns executable UI outcomes such as opening patch review with a reviewable draft. The product is not a real-time voice agent, and it is not a multimodal storytelling generator, so UI Navigator is the closest and most defensible category.

## Common requirements checklist

- Leverages a Gemini model through Vertex AI
- Built using the Google GenAI SDK
- Uses Google Cloud services, including Cloud Run and Vertex AI

## Tagline

Gemini-powered review-first document maintenance

## One-line summary

Docsy is a review-first AI document workflow agent that uses Gemini to turn technical document context into structured, reviewable editor actions.

## Short description

Docsy helps teams maintain technical documentation safely. Instead of auto-editing documents, it analyzes document context, related files, and editor state, then proposes structured actions and patch suggestions that users review before applying.

## Problem

Technical documentation drifts across multiple files. A procedure changes in one SOP or runbook, but related documents are often left outdated. Most AI tools can generate text, but they do not fit the real workflow of maintaining documentation safely.

## Solution

Docsy treats documentation maintenance as a workflow problem. The editor gathers document context, structure, related-document signals, and multimodal editor-state input, sends that context to a Gemini-powered AI service running on Google Cloud, and receives structured JSON actions or patch proposals in return. Instead of silently mutating the document, the product opens a review-first patch workflow so the user can inspect and approve each change.

## What Gemini is used for

- multimodal interpretation of document context plus editor-state screenshots
- strict structured JSON output for summaries, section drafts, TOC suggestions, and action proposals
- live agent planning for the next editor action
- generation of reviewable current-document patch drafts

## How Google GenAI SDK is implemented

Docsy uses the Google GenAI SDK on the server, connected to Vertex AI, as the core inference layer behind the editor workflow. The backend sends prompts and optional screenshot payloads to Gemini and requests strict JSON responses rather than free-form chat text.

In the AI assistant flow, Gemini is used to generate document summaries, new section drafts, table-of-contents suggestions, and action proposals such as whether the editor should open patch review. In the live agent flow, Gemini first acts as a planner that selects the next action, such as updating the current document or searching Google Docs, and then generates a structured draft response for the chosen action.

The frontend converts Gemini's structured response into real product behavior. For example, when Gemini returns a current-document draft, Docsy builds a patch set and opens the patch review UI so the user can accept or reject the proposed change.

## How Google Cloud is used

- Cloud Run hosts the AI service
- Vertex AI provides Gemini model access
- Cloud Build is used for container build and deployment
- Google Workspace integrations support Google Docs and Drive workflows

## Core features

- review-first patch workflow
- Gemini-backed structured JSON output
- multimodal request path with image payload plus document context
- live agent planning for document actions
- related-document recommendation
- conflict highlighting across documentation
- TOC suggestion preview
- before/after patch review cards

## Demo flow

1. Open multiple related technical documents in the editor.
2. Update a procedure in one document.
3. Let Docsy analyze the active document, related context, and editor-state screenshot.
4. Send that multimodal context to Gemini through the Google GenAI SDK.
5. Receive structured JSON action data and a reviewable patch draft.
6. Open patch review and inspect the suggested changes.
7. Accept or reject the update.

## Why this project is a strong fit for the challenge

Docsy moves beyond text-in and text-out behavior. It uses multimodal context, structured model output, and executable UI actions inside a real editor workflow. The product is designed so Gemini does not just write text, but instead drives a safe, operational workflow that helps users maintain complex technical documentation.

## What makes this different

- It does not rely on silent AI auto-editing
- It is built around documentation maintenance, not generic chat
- It maps model output into real editor behavior
- It keeps the user in control through explicit review and approval

## Judging bullets

- Uses Gemini through the Google GenAI SDK on Vertex AI
- Includes multimodal input with document context and editor-state screenshots
- Returns strict structured JSON instead of prompt-only prose
- Maps model output to a real UI action by opening patch review
- Demonstrates a practical productivity workflow on Google Cloud

## Architecture summary

- frontend: React + Vite document editor
- backend: Node.js AI service on Cloud Run
- model access: Google GenAI SDK connected to Vertex AI
- workflow output: structured JSON converted into reviewable patch actions

## Submission fields to fill

- Public repository: `[REPLACE_WITH_GITHUB_REPO_URL]`
- Demo video: `[REPLACE_WITH_DEMO_VIDEO_URL]`
- Frontend demo URL: `[REPLACE_WITH_DEPLOYED_FRONTEND_URL]`
- AI service URL: `[REPLACE_WITH_CLOUD_RUN_AI_URL]`

## Final notes

- keep the category as UI Navigator
- include a short proof clip or code reference for the Cloud Run deployment
- show the live patch review opening in the demo video
- emphasize structured JSON output and review-first workflow in the submission text
