# Docsy Submission Checklist

## Repo

- [ ] README explains the product in one screen
- [ ] Gemini usage is explicit
- [ ] hackathon docs are linked from [docs/README.md](README.md)
- [ ] temporary logs and artifacts are ignored
- [ ] demo path is clear from the repository alone

## AI service

- [ ] `GEMINI_API_KEY` is available through server-side config
- [ ] `/api/ai/health` returns `ok: true`
- [ ] the service is deployed or ready to deploy to Cloud Run
- [ ] `AI_ALLOWED_ORIGIN` matches the real frontend origin
- [ ] `VITE_AI_API_BASE_URL` points to the deployed AI service if needed

## Demo flow

- [ ] at least two related documents are prepared
- [ ] one document has an obvious procedure change
- [ ] related document recommendation is visible
- [ ] conflict or missing-section signal is visible
- [ ] patch review opens successfully
- [ ] before/after cards are visible in patch review

## Gemini judging points

- [ ] Gemini is used through the Google GenAI SDK
- [ ] multimodal input path is present
- [ ] structured JSON output is present
- [ ] one AI action is wired to a real UI behavior
- [ ] the workflow is review-first rather than silent auto-edit

## Recording

- [ ] demo fits in 60 to 90 seconds
- [ ] the opening line is prepared
- [ ] the closing line is prepared
- [ ] fallback plan exists if one live step fails

## Final manual inputs before deploy

- [ ] Google Cloud project ID
- [ ] frontend origin
- [ ] Artifact Registry repository name if not using `docsy`
- [ ] Secret Manager secret name if not using `gemini-api-key`
