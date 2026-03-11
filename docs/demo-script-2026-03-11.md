# Docsy Hackathon Demo Script

## Demo objective

Show that Docsy is not just a text generator. It is a review-first AI document workflow agent that can analyze document context, return structured output, and trigger a real editor workflow.

## Total target length

- 60 to 90 seconds

## Demo setup

- open the editor with at least two related technical documents
- prepare one document with a procedure that can be changed
- prepare another document that should be updated for consistency
- keep the patch review UI ready to show

## Script

### Scene 1: Opening

Narration:

"This is Docsy, an AI document workflow agent for maintaining technical documentation."

Screen:

- show the editor workspace
- show multiple open documents
- briefly show the sidebar and review-focused UI

### Scene 2: Introduce the problem

Narration:

"In real teams, a procedure changes in one document but related documents are often left behind."

Screen:

- open the source document
- point to the procedure section

### Scene 3: Make a change

Narration:

"Here I update one step in the onboarding procedure."

Screen:

- edit one meaningful line or step
- keep the change short and obvious

### Scene 4: Send context to Gemini

Narration:

"Docsy sends document context, structure, and editor state to a Gemini-powered AI service."

Screen:

- trigger the AI action
- if available, show that screenshot capture or context gathering is happening

### Scene 5: Structured output

Narration:

"Instead of returning raw text, Gemini produces structured action data for the editor."

Screen:

- show the AI response result
- emphasize action JSON or the resulting patch proposal

### Scene 6: Real UI action

Narration:

"That action is wired to a real interface flow. Here it opens patch review."

Screen:

- show the patch review dialog opening
- show before/after or patch cards if available

### Scene 7: Review-first close

Narration:

"The key idea is review-first AI. The system proposes changes, and the user stays in control."

Screen:

- show accept and reject controls
- end on the review screen

## Editing notes

- keep cursor movement deliberate
- avoid long typing sequences
- use one concrete document change only
- keep the patch review moment on screen for a few seconds
- if multimodal screenshot input is not yet visible in UI, explain it in narration

## Fallback version

If the fully automated action path is not ready:

1. show the source document edit
2. trigger the AI request
3. show the structured response
4. manually open patch review
5. narrate that the next step is direct UI wiring from the action

## Submission message

"Docsy combines Gemini reasoning, structured action output, and review-first patch workflows for safer technical document maintenance."
