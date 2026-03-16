# Docsy Devpost Submission Copy

## Project name

Docsy

## Recommended category

UI Navigator

## Why this category fits

Docsy now includes a browser-only visual navigator for its own document workflow. It captures the real visible Docsy viewport, sends screenshots plus lightweight UI hints to Gemini on Google Cloud, and executes one bounded browser action at a time inside the current session. That makes the product a direct fit for UI Navigator rather than only a screen-aware editor assistant.

## Common requirements checklist

- Leverages a Gemini model through Vertex AI
- Built using the Google GenAI SDK
- Uses Google Cloud services, including Cloud Run and Vertex AI

## Tagline

Gemini-powered visual UI navigation for Docsy's document workflow

## One-line summary

Docsy is a visual UI navigator and review-first document workflow agent that uses Gemini to interpret the live Docsy viewport and trigger executable browser actions before handing off to patch review.

## Short description

Docsy helps teams maintain technical documentation safely. It can now observe the real Docsy UI, choose the next visible browser action, and then hand off to review-first patch workflows instead of silently editing documents.

## Problem

Technical documentation drifts across multiple files. A procedure changes in one SOP or runbook, but related documents are often left outdated. Most AI tools can generate text, but they do not fit the real workflow of maintaining documentation safely.

## Solution

Docsy treats documentation maintenance as a workflow problem. The app captures the real Docsy viewport, gathers lightweight UI hints and document context, sends that multimodal context to a Gemini-powered AI service running on Google Cloud, and receives strict JSON actions in return. The frontend executes one visible browser action at a time, such as opening Google Workspace or patch review, and then hands the user into the existing review-first workflow.

## What Gemini is used for

- multimodal interpretation of live Docsy viewport screenshots
- strict structured JSON output for summaries, section drafts, TOC suggestions, and action proposals
- visual navigation planning for the next executable browser action
- generation of reviewable current-document patch drafts

## How Google GenAI SDK is implemented

Docsy uses the Google GenAI SDK on the server, connected to Vertex AI, as the core inference layer behind both the visual navigator and the editor workflow. The backend sends prompts plus live viewport screenshot payloads to Gemini and requests strict JSON responses rather than free-form chat text.

In the visual navigator flow, Gemini selects the next browser action, such as clicking the Google Workspace menu, opening the connection dialog, switching modes, or navigating to patch review. In the AI assistant flow, Gemini still generates document summaries, new section drafts, table-of-contents suggestions, and patch-review proposals.

The frontend converts Gemini's structured response into real product behavior. In v1 the navigator executes one bounded browser action per turn, re-captures the viewport, and repeats until the visible goal is complete or follow-up is required.

## How Google Cloud is used

- Cloud Run hosts the AI service
- Vertex AI provides Gemini model access
- Cloud Build is used for container build and deployment
- Google Workspace integrations support Google Docs and Drive workflows

## Core features

- visual navigator tab with bounded browser action loop
- review-first patch workflow
- Gemini-backed structured JSON output
- multimodal request path with live viewport screenshots plus document context
- one executable browser action per model turn
- related-document recommendation
- conflict highlighting across documentation
- TOC suggestion preview
- before/after patch review cards

## Demo flow

1. Open Docsy and launch the Visual Navigator.
2. Ask it to open the Google Workspace connection dialog or navigate to patch review.
3. Let Docsy capture the live viewport and send that screenshot to Gemini through the Google GenAI SDK.
4. Receive one structured browser action at a time.
5. Watch Docsy execute the visible UI flow.
6. Continue into the review-first patch workflow.
7. Accept or reject the suggested document change.

## Why this project is a strong fit for the challenge

Docsy moves beyond text-in and text-out behavior. It now uses multimodal viewport screenshots, structured model output, and executable browser actions inside a real editor workflow. Gemini does not just write text; it becomes the user's hands on the visible Docsy UI and then hands off to a review-first document workflow.

## What makes this different

- It does not rely on silent AI auto-editing
- It is built around documentation maintenance, not generic chat
- It maps model output into real browser actions and editor behavior
- It keeps the user in control through explicit review and approval

## Judging bullets

- Uses Gemini through the Google GenAI SDK on Vertex AI
- Includes multimodal input with live viewport screenshots
- Returns strict structured JSON instead of prompt-only prose
- Maps model output to real browser actions such as opening Google Workspace and patch review
- Demonstrates a practical productivity workflow on Google Cloud

## Architecture summary

- frontend: React + Vite document editor with Visual Navigator
- backend: Node.js AI service on Cloud Run
- model access: Google GenAI SDK connected to Vertex AI
- workflow output: structured JSON converted into executable browser actions and reviewable patch actions

## Submission fields to fill

- Public repository: `[REPLACE_WITH_GITHUB_REPO_URL]`
- Demo video: `[REPLACE_WITH_DEMO_VIDEO_URL]`
- Frontend demo URL: `[REPLACE_WITH_DEPLOYED_FRONTEND_URL]`
- AI service URL: `[REPLACE_WITH_CLOUD_RUN_AI_URL]`

## Final notes

- keep the category as UI Navigator
- include a short proof clip or code reference for the Cloud Run deployment
- show the live browser action loop in the demo video
- emphasize live viewport screenshots, one-action-per-turn execution, and review-first workflow in the submission text
