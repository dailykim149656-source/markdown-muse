# Cloud Run Deploy Runbook

## Goal

Deploy the Docsy AI service to Cloud Run using the current `cloudbuild.ai.yaml` pipeline.

## What this deploys

- the Node.js AI service in `server/`
- Gemini access through the Google GenAI SDK
- the health endpoint at `/api/ai/health`

## Required inputs

- Google Cloud project ID
- Artifact Registry repository name
- Cloud Run service name
- region
- allowed frontend origin
- Secret Manager secret name for `GEMINI_API_KEY`

## Assumed defaults

- region: `asia-northeast3`
- service: `markdown-muse-ai`
- model: `gemini-2.5-flash`

## One-time setup

### 1. Enable required APIs

```powershell
gcloud services enable `
  cloudbuild.googleapis.com `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  secretmanager.googleapis.com
```

### 2. Create an Artifact Registry repository

```powershell
gcloud artifacts repositories create docsy `
  --repository-format=docker `
  --location=asia-northeast3
```

If the repository already exists, skip this step.

### 3. Create the Gemini API key secret

```powershell
Set-Content -NoNewline .tmp-gemini-key.txt "YOUR_GEMINI_API_KEY"
gcloud secrets create gemini-api-key --data-file=.tmp-gemini-key.txt
Remove-Item .tmp-gemini-key.txt
```

If the secret already exists, add a new version instead:

```powershell
Set-Content -NoNewline .tmp-gemini-key.txt "YOUR_GEMINI_API_KEY"
gcloud secrets versions add gemini-api-key --data-file=.tmp-gemini-key.txt
Remove-Item .tmp-gemini-key.txt
```

## Deploy with Cloud Build

### Direct command

```powershell
gcloud builds submit `
  --config cloudbuild.ai.yaml `
  --substitutions `
_IMAGE_URI=asia-northeast3-docker.pkg.dev/YOUR_PROJECT_ID/docsy/markdown-muse-ai:latest,`
_REGION=asia-northeast3,`
_SERVICE_NAME=markdown-muse-ai,`
_GEMINI_MODEL=gemini-2.5-flash,`
_AI_ALLOWED_ORIGIN=https://YOUR_FRONTEND_DOMAIN,`
_GEMINI_API_KEY_SECRET=gemini-api-key `
  .
```

### PowerShell helper

Use:

- [deploy-ai-cloud-run.ps1](../scripts/deploy-ai-cloud-run.ps1)

Example:

```powershell
.\scripts\deploy-ai-cloud-run.ps1 `
  -ProjectId "YOUR_PROJECT_ID" `
  -AllowedOrigin "https://YOUR_FRONTEND_DOMAIN"
```

## After deploy

### 1. Verify health

```powershell
curl https://YOUR_CLOUD_RUN_URL/api/ai/health
```

Expected fields:

- `ok: true`
- `configured: true`
- `model: gemini-2.5-flash`

### 2. Configure the frontend

Set:

- `VITE_AI_API_BASE_URL=https://YOUR_CLOUD_RUN_URL`

If your frontend is served from the same origin as the AI service, you can rely on same-origin fallback instead.

## Deployment contract

- Cloud Run provides `PORT`
- `GEMINI_API_KEY` is injected from Secret Manager
- `GEMINI_MODEL` controls the active model
- `AI_ALLOWED_ORIGIN` controls CORS

## Recommended production values

- `_SERVICE_NAME=markdown-muse-ai`
- `_REGION=asia-northeast3`
- `_GEMINI_MODEL=gemini-2.5-flash`
- `_AI_ALLOWED_ORIGIN=https://your-frontend-domain`
- `_GEMINI_API_KEY_SECRET=gemini-api-key`

## Common failure points

### `configured: false`

Cause:

- the secret was not attached correctly

Check:

- secret exists
- Cloud Build deploy step references the correct secret name

### CORS errors

Cause:

- `AI_ALLOWED_ORIGIN` does not match the actual frontend origin

Check:

- exact scheme and host
- include the deployed frontend origin, not localhost

### Image push or Artifact Registry failure

Cause:

- repository missing
- wrong region or image URI

Check:

- Artifact Registry repository exists in the same region
- `_IMAGE_URI` uses the correct project, repository, and region

## Final manual inputs

Before real deployment, the only values you must decide are:

- project ID
- frontend origin
- Artifact Registry repository name if not using `docsy`
