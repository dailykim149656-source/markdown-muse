# Session Summary: GCP, Firebase, and Google OAuth Hardening

Date: 2026-03-13

## Summary

This session focused on stabilizing the production deployment for the Google Workspace integration. The initial symptoms were:

- The deployed frontend showed `Google Workspace API is not reachable. Check VITE_AI_API_BASE_URL (current: /api)`.
- `/api/ai/health` returned the frontend HTML document instead of JSON.
- Google Workspace login failed in production with `Google OAuth is not configured on the server.`
- Firebase Hosting deployment failed in GitHub Actions with `invalid_grant: Invalid JWT Signature.`

The root causes were a mix of frontend build-time environment injection issues, missing Firebase rewrite rules, and incomplete production runtime configuration for Google OAuth.

## Root Cause Analysis

### 1. `VITE_AI_API_BASE_URL` was not being applied to the web build

The GitHub Actions workflow wrote the deployment API URL into `.env.production.local`, but the frontend is built with:

```bash
vite build --mode web
```

For `mode=web`, Vite reads `.env.web`, `.env.web.local`, `.env.local`, and `.env`, not `.env.production.local`.

As a result, the deployed frontend bundle did not include `VITE_AI_API_BASE_URL`, and the workspace client fell back to `"/api"` in production.

Relevant code:

- `src/lib/workspace/client.ts`
- `.github/workflows/deploy-gcp.yml`

### 2. Firebase Hosting rewrote `/api/*` to `index.html`

`firebase.json` only had a catch-all SPA rewrite:

```json
{
  "source": "**",
  "destination": "/index.html"
}
```

That caused `/api/ai/health` to hit the frontend instead of Cloud Run. This was confirmed by the Network response body returning the SPA HTML document.

### 3. Cloud Run did not reliably retain Google OAuth runtime config

The server throws `Google OAuth is not configured on the server.` when any of the following are missing:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

Local development worked because `.env.local` contained these values. Production failed because Cloud Run revisions created by the deployment pipeline did not consistently retain them.

### 4. Firebase Hosting deploy credentials were invalid

The GitHub Actions Firebase deploy step failed with:

```text
invalid_grant: Invalid JWT Signature.
```

This indicates the `FIREBASE_SERVICE_ACCOUNT_URBAN_DDS` secret is invalid, corrupted, revoked, or otherwise not a usable service account JSON payload for Firebase CLI authentication.

## Changes Made

### 1. Fixed web build environment injection

Updated the deployment workflow so the frontend API URL is written into `.env.web.local` instead of `.env.production.local`.

Files:

- `.github/workflows/deploy-gcp.yml`

Effect:

- `vite build --mode web` now receives the deployed Cloud Run URL correctly.

### 2. Added Firebase Hosting rewrite for `/api/**`

Added a Cloud Run rewrite rule before the SPA fallback:

```json
{
  "source": "/api/**",
  "run": {
    "serviceId": "docsy",
    "region": "asia-northeast3"
  }
}
```

Files:

- `firebase.json`

Effect:

- Relative `/api/*` calls from the hosted frontend now route to the Cloud Run backend instead of `index.html`.

### 3. Hardened Cloud Run deployment config for Google OAuth

Updated Cloud Build and GitHub Actions so the Cloud Run deployment keeps the required Google OAuth settings.

Files:

- `cloudbuild.ai.yaml`
- `.github/workflows/deploy-gcp.yml`

Current runtime model:

- Plain env vars:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_OAUTH_REDIRECT_URI`
  - `WORKSPACE_FRONTEND_ORIGIN`
  - `GOOGLE_WORKSPACE_SCOPES`
  - `AI_ALLOWED_ORIGIN`
  - `GEMINI_MODEL`
- Secret Manager env vars:
  - `GEMINI_API_KEY`
  - `GOOGLE_CLIENT_SECRET`

Important design choice:

- `GOOGLE_CLIENT_SECRET` was moved away from plain env injection and into Secret Manager-backed runtime injection.
- `GOOGLE_CLIENT_ID` remains a normal env value because it is not considered secret.

### 4. Added policy pages for Google OAuth production requirements

Created two new public pages:

- `/privacy`
- `/terms`

Files:

- `src/pages/Privacy.tsx`
- `src/pages/Terms.tsx`
- `src/App.tsx`
- `src/pages/Landing.tsx`

Effect:

- These URLs can now be used in the Google OAuth consent screen configuration.

## Required Production Configuration

### GitHub Secrets

The deployment workflow now expects the following GitHub secrets or values:

Required:

- `GCP_PROJECT_ID`
- `GCP_SA_KEY`
- `FIREBASE_SERVICE_ACCOUNT_URBAN_DDS`
- `GCP_AI_ALLOWED_ORIGIN`
- `GCP_WEB_VITE_AI_API_BASE_URL`
- `GCP_GOOGLE_CLIENT_ID`
- `GCP_GOOGLE_OAUTH_REDIRECT_URI`
- `GCP_WORKSPACE_FRONTEND_ORIGIN`

Optional:

- `GCP_GOOGLE_CLIENT_SECRET_SECRET_NAME`
  - Default: `google-client-secret`
- `GCP_GOOGLE_WORKSPACE_SCOPES`

Recommended values for this deployment:

- `GCP_AI_ALLOWED_ORIGIN=https://urban-dds.web.app`
- `GCP_WEB_VITE_AI_API_BASE_URL=https://docsy-mc32v24cyq-du.a.run.app`
- `GCP_GOOGLE_OAUTH_REDIRECT_URI=https://docsy-mc32v24cyq-du.a.run.app/api/auth/google/callback`
- `GCP_WORKSPACE_FRONTEND_ORIGIN=https://urban-dds.web.app`

### GCP Secret Manager

Required secret:

- `google-client-secret`

This secret should contain only the raw Google OAuth client secret string, for example:

```text
GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
```

Useful commands:

Create:

```bash
printf '%s' 'REAL_GOOGLE_CLIENT_SECRET' | gcloud secrets create google-client-secret --data-file=-
```

Add a new version:

```bash
printf '%s' 'REAL_GOOGLE_CLIENT_SECRET' | gcloud secrets versions add google-client-secret --data-file=-
```

Grant Cloud Run access:

```bash
gcloud secrets add-iam-policy-binding google-client-secret \
  --member="serviceAccount:399359781191-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Google OAuth Production Checklist

To move the OAuth app from testing to production, the following items were identified:

- App name
- Support email
- Developer contact email
- Privacy Policy URL
- Terms of Service URL
- Authorized domains
- Authorized redirect URI

URLs created in this session:

- Privacy Policy: `https://urban-dds.web.app/privacy`
- Terms of Service: `https://urban-dds.web.app/terms`

Redirect URI to register in Google Cloud Console:

- `https://docsy-mc32v24cyq-du.a.run.app/api/auth/google/callback`

## Firebase Deploy Credential Notes

`FIREBASE_SERVICE_ACCOUNT_URBAN_DDS` does not need to be the same value as `GCP_SA_KEY`, but it can be temporarily set to the same service account JSON if that account has both:

- GCP deployment permissions
- Firebase Hosting deployment permissions

The earlier Firebase deployment failure strongly suggests that the current `FIREBASE_SERVICE_ACCOUNT_URBAN_DDS` secret needs to be replaced with a valid service account JSON file.

## Verification Commands

Check Cloud Run runtime env:

```bash
gcloud run services describe docsy \
  --region=asia-northeast3 \
  --format="yaml(spec.template.spec.containers[0].env)"
```

Check Cloud Run logs:

```bash
gcloud run services logs read docsy --region=asia-northeast3 --limit=100
```

Check whether the API health route is serving JSON:

```text
https://urban-dds.web.app/api/ai/health
```

Expected behavior:

- It should return backend JSON.
- It should not return the frontend HTML shell.

## Recommended Next Steps

1. Replace the invalid Firebase Hosting service account secret.
2. Create or rotate `google-client-secret` in Secret Manager.
3. Verify the Cloud Run service account has Secret Manager access.
4. Confirm GitHub secrets contain non-empty OAuth values.
5. Re-run the GitHub Actions deployment.
6. Verify:
   - `/api/ai/health` returns JSON
   - Google Workspace connect flow opens the Google consent screen
   - OAuth callback completes and redirects back to the frontend
7. In Google Auth Platform, switch the OAuth app to production once policy URLs and domains are configured.
