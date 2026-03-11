# Docsy Submission Copy

## Project name

Docsy

## One-line pitch

Docsy is a review-first AI document workflow agent that uses Gemini to turn technical document context into structured, reviewable editor actions.

## Short description

Docsy helps teams maintain technical documentation safely. Instead of auto-editing documents, it analyzes document context, related files, and editor state, then proposes structured actions and patch suggestions that users review before applying.

## Medium description

Technical documentation often drifts across multiple files. A procedure changes in one runbook or SOP, but related documents are left outdated. Most AI tools can generate text, but they do not fit the real workflow of maintaining documentation safely.

Docsy approaches this as a workflow problem instead of a text-generation problem. The editor gathers document context, structure, and related-document signals, sends multimodal input to a Gemini-powered AI service, and receives structured JSON actions or patch proposals in return. The product then opens a review-first patch workflow instead of silently mutating the document.

This lets teams use AI for document maintenance while keeping humans in control of every change.

## Long description

Docsy is an AI document workflow agent built for technical documentation such as SOPs, runbooks, onboarding guides, and engineering docs. The product is designed around one idea: AI should propose reviewable actions, not directly rewrite important documents without oversight.

In the current demo flow, a user edits one technical document, and Docsy identifies related documents that may now be inconsistent. The app gathers the active document content, structural metadata, and an image payload representing the current editor state. That context is sent to a separate AI service running on Cloud Run, where Gemini is accessed through the Google GenAI SDK.

Gemini returns structured JSON rather than free-form chat output. In the current implementation, that structured response can trigger a real editor action: opening patch review. The user then sees before/after patch cards, related document recommendations, conflict highlights, and TOC suggestion previews, and can accept or reject the proposed update.

This makes Docsy a better fit for real documentation maintenance workflows. It treats AI as a workflow assistant that understands structure, relationships, and review boundaries, rather than as an unrestricted text generator.

## Core features

- review-first patch workflow
- Gemini-backed structured JSON output
- multimodal request path with image payload plus document context
- related-document recommendation
- conflict highlighting across documentation
- TOC suggestion preview
- before/after patch review cards

## Gemini-specific bullets

- Uses Gemini through the Google GenAI SDK
- Sends multimodal input to Gemini
- Receives strict structured JSON responses
- Maps model output to a real UI action
- Demonstrates a practical productivity workflow rather than a prompt-only demo

## What makes it different

- It does not rely on silent AI auto-editing
- It is built around document maintenance, not generic chat
- It turns model output into operational editor behavior
- It combines document structure, related-document context, and multimodal input

## 3 judging bullets

- Safe AI workflow: review-first patch proposals instead of direct document mutation
- Practical Gemini use: multimodal context plus structured JSON actions
- Clear product value: faster and safer maintenance of technical documentation across related files

## 5 judging bullets

- Gemini-powered AI service integrated through the Google GenAI SDK
- Multimodal input path combining document context and image payload
- Structured action JSON returned by the model
- Real editor workflow triggered from model output
- Review-first patch application for safer document maintenance

## 30-second pitch

Docsy is a review-first AI document workflow agent for technical documentation. When a user updates one document, Docsy uses Gemini to analyze document context and related files, then returns structured actions and patch proposals instead of raw text. The key difference is safety: AI suggests changes, but the user reviews every patch before it is applied.

## 60-second pitch

Technical documentation drifts fast, especially across SOPs, onboarding guides, and runbooks. Updating one file often leaves related documents behind. Docsy solves that as a workflow problem. The editor gathers document context, structure, and multimodal UI state, sends it to a Gemini-powered AI service, and receives structured JSON actions or patch proposals in return. Instead of auto-rewriting the document, Docsy opens a review-first patch workflow where the user can inspect before/after changes, see related-document recommendations and conflict highlights, and then accept or reject the update. It turns Gemini into a safe operational workflow agent for documentation maintenance.

## Final tagline options

- Gemini-powered review-first document maintenance
- Structured AI actions for safer technical documentation
- AI patch workflows for documentation teams
