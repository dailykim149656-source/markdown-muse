# Docsy Final Demo Narration

## 60-second version

This is Docsy, an AI document workflow agent for technical documentation.

Here I have multiple related documents open in the editor. If I update a procedure in one document, related documents can quickly become inconsistent.

I’ll change this onboarding step. Now Docsy can recommend related documents, surface conflict signals, and send document context plus multimodal editor state to a Gemini-powered AI service.

Instead of returning raw text, Gemini returns structured action data and a reviewable patch proposal.

Docsy then opens patch review, where I can inspect before and after changes, understand the proposed update, and choose whether to accept or reject it.

The key idea is review-first AI. Gemini helps maintain documentation, but the user stays in control of every change.

## 90-second version

This is Docsy, a review-first AI document workflow agent built for technical documentation such as SOPs, runbooks, and onboarding guides.

The problem we’re targeting is simple: teams often update one document, but related documents are left outdated or inconsistent.

Here I have multiple related documents open. I’ll update a procedure in this source document.

Docsy already understands document structure and related-document signals, so it can recommend which documents are most relevant and highlight where conflicts or gaps may exist.

When I trigger the AI workflow, the editor sends structured document context and multimodal editor-state input to a Gemini-powered AI service running separately from the frontend.

Gemini returns structured JSON rather than free-form assistant text. In this demo, that structured response maps to a real product action: opening patch review.

Now I can inspect the proposed changes using before and after patch cards, review the suggested update safely, and accept or reject it.

That is the main point of Docsy: AI should not silently rewrite important documentation. It should propose structured, reviewable actions that help teams maintain documentation safely and efficiently.

## Opening line options

- Docsy is a Gemini-powered AI document workflow agent for technical documentation.
- Docsy turns AI document understanding into structured, reviewable editor actions.
- Docsy helps teams maintain technical documentation with review-first AI patch workflows.

## Closing line options

- Docsy shows how Gemini can power safer document maintenance through structured, reviewable workflow actions.
- Instead of auto-editing documents, Docsy uses Gemini to propose changes that humans review and control.
- This is Gemini not just as a chat model, but as a workflow agent for technical documentation.
