# Docsy Hackathon Demo Script

## Demo objective

Show that Docsy is not just a text generator. It is now a visual UI navigator for its own document workflow, using Gemini to interpret the live viewport and trigger real browser actions before handing off to review-first patch handling.

## Total target length

- 60 to 90 seconds

## Demo setup

- open the editor in advanced mode
- keep the AI Assistant available
- keep Google Workspace disconnected so the connection dialog is meaningful
- keep at least one document open with a patch review flow ready to show afterward

## Script

### Scene 1: Opening

Narration:

"This is Docsy, a Gemini-powered visual UI navigator for technical document workflows."

Screen:

- show the editor workspace
- briefly show the AI Assistant button, Google Workspace button, and Patch Review button

### Scene 2: Introduce the navigator

Narration:

"Instead of only generating text, Docsy can now look at the visible UI and take the next browser action inside the current session."

Screen:

- open AI Assistant
- switch to the Visual Navigator tab

### Scene 3: Give a UI task

Narration:

"I can ask it to complete a visible UI task, like opening the Google Workspace connection flow."

Screen:

- enter a short intent such as `Open the Google Workspace connection dialog`
- click `Start visual run`

### Scene 4: Gemini action loop

Narration:

"Docsy captures the live viewport, sends that screenshot to Gemini on Cloud Run, and gets back one structured browser action at a time."

Screen:

- let the assistant dialog close
- show the floating Visual Navigator overlay
- show the Google Workspace menu opening
- show the connection dialog opening

### Scene 5: Reviewable execution

Narration:

"Each step is bounded, reviewable, and visible. The product is not guessing in the background."

Screen:

- keep the overlay on screen for a moment
- show the action history and confidence

### Scene 6: Handoff to document workflow

Narration:

"After the UI navigation step, Docsy still hands off to the review-first patch workflow for the actual document change."

Screen:

- navigate to Patch Review or open it manually if needed
- show before and after cards

### Scene 7: Close

Narration:

"The key idea is that Gemini becomes the user's hands on screen, while the user still stays in control of every document change."

Screen:

- end on patch review and the visual navigator overlay or history

## Editing notes

- keep the intent short and concrete
- avoid long typing sequences
- show at least one visible browser action
- keep the overlay visible long enough for judges to read it
- end with the review-first patch flow so the product story stays coherent

## Fallback version

If the full multi-step loop is unstable:

1. open the Visual Navigator tab
2. start a run that opens only one visible UI surface
3. show the overlay and action history
4. manually continue into Patch Review
5. narrate that the UI loop and patch workflow are intentionally separate

## Submission message

"Docsy combines Gemini multimodal reasoning, executable browser actions, and review-first patch workflows for safer technical document maintenance."
