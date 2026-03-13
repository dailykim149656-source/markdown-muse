# Session Summary: Vertex AI Migration for Gemini Runtime

Date: 2026-03-13

## Summary

This session migrated the AI runtime from Gemini Developer API key usage to Vertex AI authentication and configuration.

The main objective was to align the local and deployed AI runtime with a GCP-native model:

- local development should use Application Default Credentials
- Cloud Run should use the runtime service account instead of a Gemini API key
- health checks should report configuration state based on Vertex AI env values
- deployment automation should inject Vertex AI project and location values directly into Cloud Run

## What changed

### 1. Gemini server client now initializes through Vertex AI

The server Gemini client no longer reads `GEMINI_API_KEY` or `GOOGLE_API_KEY`.

It now requires:

- `GOOGLE_GENAI_USE_VERTEXAI=true`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GEMINI_MODEL`

The runtime initializes `@google/genai` with:

- `vertexai: true`
- `project`
- `location`

Main file:

- `server/modules/gemini/client.ts`

### 2. AI health endpoint now reflects Vertex AI configuration

The AI health route previously treated the runtime as configured when an API key was present.

It now reports `configured: true` only when the Vertex AI configuration contract is satisfied.

Main file:

- `server/aiServer.ts`

### 3. Local env template was rewritten for Vertex AI

The local env example now documents Vertex AI instead of Gemini API keys.

Expected local settings now include:

- `GOOGLE_GENAI_USE_VERTEXAI=true`
- `GOOGLE_CLOUD_PROJECT=urban-dds`
- `GOOGLE_CLOUD_LOCATION=asia-northeast3`
- `GEMINI_MODEL=gemini-2.5-flash`

It also documents that local development requires:

```bash
gcloud auth application-default login
gcloud config set project urban-dds
```

Main files:

- `.env.example`
- `README.md`

### 4. Cloud Run deployment contract was updated

Cloud Build and GitHub Actions were updated so Cloud Run receives Vertex AI configuration env vars instead of a Gemini API key secret.

Cloud Run now expects:

- `GOOGLE_GENAI_USE_VERTEXAI=true`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GEMINI_MODEL`
- existing Google Workspace and frontend origin env vars

The deployment path no longer injects `GEMINI_API_KEY` into the AI service.

The remaining secret-managed server dependency in this path is:

- `GOOGLE_CLIENT_SECRET`

Main files:

- `cloudbuild.ai.yaml`
- `.github/workflows/deploy-gcp.yml`

## Operational implications

### Local development

Local development now depends on ADC instead of an API key.

Required commands:

```bash
gcloud auth application-default login
gcloud config set project urban-dds
```

If ADC is not available, the AI server can start but Vertex calls will fail at request time.

### Cloud Run

Cloud Run now needs:

- the Vertex AI env vars listed above
- a runtime service account with Vertex AI access

Recommended IAM requirement:

- `roles/aiplatform.user`

If this role is missing, the runtime may report as configured but Vertex requests will fail.

## Verification completed

The following checks passed during this session:

- `npm run typecheck:server`
- `npm run build`

Local health verification after restart showed:

- `configured: true`
- `model: gemini-2.5-flash`

## Follow-up items

The migration is in place, but these checks are still recommended before treating the deployment as complete:

1. Verify local ADC can successfully call Vertex AI from the AI server.
2. Confirm the Cloud Run runtime service account has Vertex AI permissions.
3. Re-run the GitHub Actions deployment and confirm the new Cloud Run revision picks up the Vertex AI env vars.
4. Verify `/api/ai/health` on the deployed service reports `configured: true`.
5. Remove any remaining operational references to Gemini API key usage if they still exist outside the files changed in this session.
