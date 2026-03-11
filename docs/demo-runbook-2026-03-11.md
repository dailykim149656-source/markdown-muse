# Docsy Demo Runbook

## Goal

Deliver a short demo that clearly shows:

- Gemini is being used
- multimodal context is being sent
- the model returns structured output
- the output triggers a real editor workflow
- the user reviews changes before applying them

## Ideal length

- 60 to 90 seconds

## Recommended demo assets

- one source document with a procedure section
- one related target document that should also be updated
- one visible related-document recommendation in the sidebar
- one visible conflict or missing-section warning

## Pre-demo checklist

- AI service URL is configured
- Gemini API key is configured on the server
- the editor opens with two or more prepared documents
- patch review panel can open successfully
- one update path already produces a patch set

## Recording sequence

### 1. Open the workspace

Show:

- multiple documents
- knowledge/impact sidebar
- patch review capable editor

Say:

"Docsy is an AI document workflow agent for technical documentation."

### 2. Show the trigger change

Show:

- a short edit to a procedure or runbook step

Say:

"I changed one procedure here, but related documents may now be inconsistent."

### 3. Show related-document context

Show:

- related document recommendation
- conflict or missing-section highlight if available

Say:

"Docsy identifies the most relevant related documents and highlights where conflicts may exist."

### 4. Trigger the AI workflow

Show:

- AI assistant action or suggest updates flow

Say:

"The editor sends structured document context and multimodal UI state to a Gemini-powered AI service."

### 5. Show the result

Show:

- action result
- patch set becoming available
- patch review opening

Say:

"Gemini returns structured action data, and the app opens patch review instead of silently changing the document."

### 6. Show review-first finish

Show:

- before/after patch cards
- accept and reject controls

Say:

"The key idea is review-first AI. The user stays in control of every proposed update."

## Live presentation fallback

If one step is unstable during the demo:

1. show the source edit
2. trigger the AI flow
3. show the structured result or prepared patch review state
4. narrate the intended UI action path

## Do not spend time on

- long typing
- settings screens
- exhaustive feature tours
- low-priority tabs
- implementation details unless asked

## Strong closing sentence

"Docsy uses Gemini to turn document understanding into structured, reviewable workflow actions for safer documentation maintenance."
