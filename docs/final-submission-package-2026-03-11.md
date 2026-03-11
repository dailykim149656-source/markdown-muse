# Docsy Final Submission Package

## Project name

Docsy

## Tagline

Gemini-powered review-first document maintenance

## One-line summary

Docsy is a review-first AI document workflow agent that uses Gemini to turn technical document context into structured, reviewable editor actions.

## Short description

Docsy helps teams maintain technical documentation safely. Instead of auto-editing documents, it analyzes document context, related files, and editor state, then proposes structured actions and patch suggestions that users review before applying.

## Medium description

Technical documentation drifts across multiple files. A procedure changes in one SOP or runbook, but related documents are often left outdated. Most AI tools can generate text, but they do not fit the real workflow of maintaining documentation safely.

Docsy treats this as a workflow problem. The editor gathers document context, structure, related-document signals, and multimodal editor-state input, sends that to a Gemini-powered AI service, and receives structured JSON actions or patch proposals in return. The product then opens a review-first patch workflow instead of silently mutating the document.

## Long description

Docsy is an AI document workflow agent built for technical documentation such as SOPs, runbooks, onboarding guides, and engineering docs. The product is designed around one idea: AI should propose reviewable actions, not directly rewrite important documents without oversight.

In the current demo flow, a user edits one technical document, and Docsy identifies related documents that may now be inconsistent. The app gathers the active document content, structural metadata, and an image payload representing the current editor state. That context is sent to a separate AI service running on Cloud Run, where Gemini is accessed through the Google GenAI SDK.

Gemini returns structured JSON rather than free-form chat output. In the current implementation, that structured response can trigger a real editor action: opening patch review. The user then sees before/after patch cards, related document recommendations, conflict highlights, and TOC suggestion previews, and can accept or reject the proposed update.

This makes Docsy a better fit for real documentation maintenance workflows. It treats AI as a workflow assistant that understands structure, relationships, and review boundaries, rather than as an unrestricted text generator.

## Core features

- review-first patch workflow
- Gemini-backed structured JSON output
- multimodal request path with image payload plus document context
- one real UI action wired from model output
- related-document recommendation
- conflict highlighting
- TOC suggestion preview
- before/after patch review cards

## Why Gemini

Docsy needs more than text generation:

- multimodal context handling
- structured JSON responses
- product-ready action output
- safe workflow integration

Gemini is used here not as a chat layer, but as an engine for structured workflow decisions inside an editor.

## Demo flow

1. Open multiple related technical documents.
2. Update one procedure.
3. Let Docsy identify related documents and conflict signals.
4. Send structured multimodal context to Gemini.
5. Receive action JSON and patch proposal.
6. Open patch review.
7. Accept or reject the proposed change.

## Gemini judging bullets

- Uses Gemini through the Google GenAI SDK
- Includes a multimodal input path
- Receives strict structured JSON output
- Maps model output to a real UI action
- Demonstrates a real product workflow, not just prompting

## What makes this different

- It is not a generic AI text editor
- It does not rely on silent auto-editing
- It turns model output into operational editor behavior
- It keeps the user in control with review-first patch application

## Current limitations

- the current image input is a generated editor-state snapshot, not a full DOM screenshot capture
- one action type is wired end-to-end today
- final Cloud Run deployment still needs real project-specific values

## Links to fill before submission

- Public repository: `[REPLACE_WITH_GITHUB_REPO_URL]`
- Demo video: `[REPLACE_WITH_DEMO_VIDEO_URL]`
- Frontend demo URL: `[REPLACE_WITH_DEPLOYED_FRONTEND_URL]`
- AI service URL: `[REPLACE_WITH_CLOUD_RUN_AI_URL]`

## Final 60-second demo narration

This is Docsy, an AI document workflow agent for technical documentation.

Here I have multiple related documents open in the editor. If I update a procedure in one document, related documents can quickly become inconsistent.

I’ll change this onboarding step. Now Docsy can recommend related documents, surface conflict signals, and send document context plus multimodal editor state to a Gemini-powered AI service.

Instead of returning raw text, Gemini returns structured action data and a reviewable patch proposal.

Docsy then opens patch review, where I can inspect before and after changes, understand the proposed update, and choose whether to accept or reject it.

The key idea is review-first AI. Gemini helps maintain documentation, but the user stays in control of every change.

## Opening line

Docsy is a Gemini-powered AI document workflow agent for technical documentation.

## Closing line

Docsy shows how Gemini can power safer document maintenance through structured, reviewable workflow actions.

## Submission checklist

- [ ] repo URL filled
- [ ] demo video URL filled
- [ ] deploy URL filled
- [ ] AI service URL filled
- [ ] `/api/ai/health` verified
- [ ] demo under 90 seconds
- [ ] related-document recommendation visible
- [ ] conflict highlight visible
- [ ] patch review opens during demo

## Related reference docs

- [Hackathon Submission Brief](hackathon-submission-brief-2026-03-11.md)
- [Submission Copy](submission-copy-2026-03-11.md)
- [Demo Script](demo-script-2026-03-11.md)
- [Demo Runbook](demo-runbook-2026-03-11.md)
- [Final Demo Narration](final-demo-narration-2026-03-11.md)
- [Cloud Run Deploy Runbook](cloud-run-deploy-runbook-2026-03-11.md)
- [Submission Form Template](submission-form-template-2026-03-11.md)
- [Judge Q&A](judge-qa-2026-03-11.md)
