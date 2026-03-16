# Docsy Final Submission Package

## Project name

Docsy

## Tagline

Gemini-powered visual UI navigation for Docsy's document workflow

## One-line summary

Docsy is a visual UI navigator and review-first document workflow agent that uses Gemini to interpret live Docsy viewport screenshots and trigger executable browser actions before handing off to patch review.

## Short description

Docsy helps teams maintain technical documentation safely. It now observes the real Docsy UI, chooses the next visible browser action, and then uses the existing review-first patch workflow to keep the user in control of document changes.

## Medium description

Technical documentation drifts across multiple files. A procedure changes in one SOP or runbook, but related documents are often left outdated. Most AI tools can generate text, but they do not fit the real workflow of maintaining documentation safely.

Docsy treats this as a workflow problem. The app captures the live Docsy viewport, adds lightweight UI hints and document context, sends that to a Gemini-powered AI service, and receives structured JSON browser actions or patch proposals in return. The product then executes one visible browser action at a time and opens a review-first patch workflow instead of silently mutating the document.

## Long description

Docsy is a visual UI navigator and document workflow agent built for technical documentation such as SOPs, runbooks, onboarding guides, and engineering docs. The product is designed around one idea: AI should take visible browser actions safely and still keep important document edits reviewable.

In the current demo flow, a user launches the Visual Navigator and asks Docsy to complete a visible UI task such as opening the Google Workspace connection dialog or navigating to patch review. The app captures the real visible Docsy viewport, adds compact UI hints, and sends that context to a separate AI service running on Cloud Run, where Gemini is accessed through the Google GenAI SDK.

Gemini returns structured JSON rather than free-form chat output. In the current implementation, that structured response can trigger real browser actions such as opening the Google Workspace menu, opening the connection dialog, switching editor modes, or navigating to patch review. The user then sees before/after patch cards, related document recommendations, conflict highlights, and TOC suggestion previews, and can accept or reject the proposed update.

This makes Docsy a stronger fit for real documentation maintenance workflows and for the UI Navigator challenge. Gemini becomes the user's hands on the visible Docsy UI, while document changes still stay reviewable.

## Core features

- visual navigator tab with bounded browser action loop
- review-first patch workflow
- Gemini-backed structured JSON output
- multimodal request path with live viewport screenshots plus document context
- one real browser action wired from model output per turn
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

Gemini is used here not as a chat layer, but as an engine for visual UI decisions and structured workflow actions inside the editor.

## Demo flow

1. Open Docsy and launch the Visual Navigator.
2. Ask it to open the Google Workspace connection dialog or patch review.
3. Let Docsy capture the live viewport and send structured multimodal context to Gemini.
4. Receive one strict JSON browser action at a time.
5. Watch Docsy execute the visible UI flow.
6. Continue into patch review.
7. Accept or reject the proposed document change.

## Gemini judging bullets

- Uses Gemini through the Google GenAI SDK
- Includes a multimodal input path with live viewport screenshots
- Receives strict structured JSON output
- Maps model output to real browser actions
- Demonstrates a real product workflow, not just prompting

## What makes this different

- It is not a generic AI text editor
- It does not rely on silent auto-editing
- It turns model output into visible browser actions and operational editor behavior
- It keeps the user in control with review-first patch application

## Current limitations

- the current navigator is limited to the visible Docsy web UI, not arbitrary websites or desktop apps
- v1 uses screenshots, not screen recordings
- the executable action set is intentionally bounded for safety
- final Cloud Run deployment still needs real project-specific values

## Links to fill before submission

- Public repository: `[REPLACE_WITH_GITHUB_REPO_URL]`
- Demo video: `[REPLACE_WITH_DEMO_VIDEO_URL]`
- Frontend demo URL: `[REPLACE_WITH_DEPLOYED_FRONTEND_URL]`
- AI service URL: `[REPLACE_WITH_CLOUD_RUN_AI_URL]`

## Final 60-second demo narration

This is Docsy, a Gemini-powered visual UI navigator for technical document workflows.

Instead of only generating text, Docsy can now look at the real visible UI and take the next browser action inside the current session.

I ask the navigator to open the Google Workspace connection flow. Docsy captures the live viewport, sends that screenshot to Gemini on Cloud Run through the Google GenAI SDK, and gets back one structured browser action at a time.

Docsy executes those actions visibly in the browser. Then it can continue into the existing review-first patch workflow for the document itself.

Patch review still works the same way: I inspect the before and after changes and decide whether to accept them.

The key idea is that Gemini becomes the user's hands on screen, but the user still stays in control of every document change.

## Opening line

Docsy is a Gemini-powered visual UI navigator for technical documentation workflows.

## Closing line

Docsy shows how Gemini can power safer document maintenance through live UI navigation and structured, reviewable workflow actions.

## Submission checklist

- [ ] repo URL filled
- [ ] demo video URL filled
- [ ] deploy URL filled
- [ ] AI service URL filled
- [ ] `/api/ai/health` verified
- [ ] demo under 90 seconds
- [ ] visual navigator loop visible
- [ ] live browser action executes successfully
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
