# Existing GCP Security Migration Runbook

## Goal

Apply the current security hardening changes to an already deployed stack using:

- Firebase Hosting for the web frontend
- Cloud Run `docsy` for the AI API
- Cloud Run `docsy-tex` for the TeX service

This runbook assumes:

- service names stay the same
- domains stay the same
- Google OAuth is still in `testing`

## 1. Capture the current baseline

Before changing live configuration, snapshot the deployed runtime:

```powershell
.\scripts\snapshot-existing-gcp-deployment.ps1 `
  -ProjectId "YOUR_PROJECT_ID"
```

This captures:

- current `docsy` Cloud Run service export
- current `docsy-tex` Cloud Run service export
- current Secret Manager secret list
- Firebase Hosting sites list when the Firebase CLI is authenticated

Manual checks to record alongside the snapshot:

- current frontend origin
- current API origin
- current Google OAuth redirect URI in Google Cloud Console
- current secret names for:
  - `google-client-secret`
  - `tex-service-auth-token`

## 2. Confirm or set the required secrets

GitHub Actions secrets needed for the migration:

- `GCP_PROJECT_ID`
- `GCP_SA_KEY`
- `GCP_AI_ALLOWED_ORIGIN`
- `GCP_WORKSPACE_FRONTEND_ORIGIN`
- `GCP_GOOGLE_CLIENT_ID`
- `GCP_GOOGLE_OAUTH_REDIRECT_URI`
- `GCP_GOOGLE_OAUTH_PUBLISHING_STATUS`
- `GCP_GOOGLE_WORKSPACE_SCOPE_PROFILE`
- `GCP_TEX_SERVICE_BASE_URL`
- `GCP_WEB_VITE_AI_API_BASE_URL`
- `FIREBASE_SERVICE_ACCOUNT_URBAN_DDS`

Recommended optional GitHub Actions secrets:

- `GCP_AI_DIAGNOSTICS_TOKEN`
- `GCP_AI_MAX_REQUEST_BYTES`
- `GCP_TEX_MAX_REQUEST_BYTES`
- `GCP_TEX_ALLOW_RAW_DOCUMENT`
- `GCP_TEX_ALLOW_RESTRICTED_COMMANDS`
- `GCP_TEX_ALLOWED_PACKAGES`
- `GCP_GOOGLE_WORKSPACE_SCOPES`
- `GCP_GOOGLE_CLIENT_SECRET_SECRET_NAME`
- `GCP_TEX_SERVICE_AUTH_TOKEN_SECRET_NAME`

Secret Manager secrets expected by the runtime:

- `google-client-secret`
- `tex-service-auth-token`

## 3. Recommended migration values

For the current in-place rollout:

- `GOOGLE_OAUTH_PUBLISHING_STATUS=testing`
- `GOOGLE_WORKSPACE_SCOPE_PROFILE=restricted`
- `AI_MAX_REQUEST_BYTES=2097152`
- `TEX_MAX_REQUEST_BYTES=400000`
- `TEX_ALLOW_RESTRICTED_COMMANDS=false`

If full raw LaTeX documents are required in production-like use:

- `TEX_ALLOW_RAW_DOCUMENT=true`

Recommended production-safe package allowlist:

```text
amsmath,amssymb,amsthm,array,booktabs,enumitem,fontspec,geometry,graphicx,hyperref,longtable,makecell,mathtools,multirow,tabularx,xcolor,xeCJK
```

## 4. Rollout order

### Step 1. Deploy TeX first

Run:

- `deploy-tex.yml`
  or
- `deploy-full-stack.yml`

Reason:

- The AI service depends on the TeX service policy and health.

### Step 2. Verify TeX directly

Required:

- Cloud Run identity token
- `X-Docsy-Tex-Token`

Expected:

- `GET https://YOUR_TEX_URL/health` succeeds

### Step 3. Deploy AI second

Run:

- `deploy-ai.yml`
  or continue through
- `deploy-full-stack.yml`

Reason:

- The AI service must point to the already-updated TeX service URL and policy.

### Step 4. Verify public and internal AI health

Expected:

- `GET /api/ai/health` returns minimal readiness data
- `GET /api/tex/health` through the AI proxy succeeds
- `GET /api/internal/ai/health` succeeds only when `GCP_AI_DIAGNOSTICS_TOKEN` is configured and supplied

### Step 5. Rebuild and deploy Firebase Hosting

Run:

- `deploy-web.yml`
  or continue through
- `deploy-full-stack.yml`

Reason:

- This publishes the updated Firebase Hosting headers and report-only CSP.

## 5. OAuth migration checks

Do not change domains during this pass.

Verify all of the following:

- `WORKSPACE_FRONTEND_ORIGIN` exactly matches the deployed frontend origin
- `GOOGLE_OAUTH_REDIRECT_URI` exactly matches the deployed API callback origin
- the same callback URL is registered in Google Cloud Console
- Google OAuth client remains in `testing`

Expected user impact:

- existing browser sessions may rotate after reconnect
- some users may need to reconnect Google Workspace once after rollout

## 6. Validation checklist

### API and TeX

- `GET /api/ai/health` returns minimal output only
- `GET /api/tex/health` succeeds
- direct TeX health succeeds with identity token and app token

### OAuth and sessions

- Google Workspace connect still opens correctly
- callback returns to the expected frontend origin
- `__Host-...` secure session cookie is issued on HTTPS
- mismatched `Origin` on POST routes is rejected

### Browser security

- Firebase responses for `/` and `/editor` include:
  - `Content-Security-Policy-Report-Only`
  - `Strict-Transport-Security`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `X-Frame-Options`
- QR, Google profile image, Mermaid, KaTeX, clipboard, and PDF preview flows still work
- CSP reports arrive at `/api/security/csp-report`

### TeX policy

- generated LaTeX flow works
- full raw LaTeX documents only work when `TEX_ALLOW_RAW_DOCUMENT=true`
- restricted primitives remain blocked unless `TEX_ALLOW_RESTRICTED_COMMANDS=true`
- `\usepackage{...}` outside `TEX_ALLOWED_PACKAGES` is rejected

## 7. Rollback approach

If the rollout breaks OAuth, TeX, or frontend runtime behavior:

1. redeploy the previous `docsy-tex` image revision
2. redeploy the previous `docsy` AI revision
3. redeploy the previous frontend artifact
4. compare against the baseline snapshot from step 1 before retrying

## Related Documents

- [Security Status](security-status-2026-03-14.md)
- [GCP Deployment Guide](gcp-deployment.md)
- [Cloud Run Deploy Runbook](cloud-run-deploy-runbook-2026-03-11.md)
- [Edge and Browser Security Runbook](edge-and-browser-security-runbook-2026-03-14.md)
