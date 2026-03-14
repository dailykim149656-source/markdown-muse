# Google OAuth Production Migration Runbook

Date: 2026-03-14

## Goal

Move Docsy Google Workspace OAuth from testing-mode preview domains to an external-production setup that uses owned custom domains and a separate production GCP project.

## Current baseline

- Frontend hosting currently uses Firebase Hosting.
- API and OAuth callback handling currently run on Cloud Run.
- Testing-mode examples in the repo use managed Google domains such as `*.web.app` and `*.run.app`.
- The current default scope profile remains `restricted` because the product still supports broad Drive search/import/export flows.

## Target topology

- Frontend origin: `https://app.<your-domain>`
- API base URL: `https://api.<your-domain>`
- OAuth redirect URI: `https://api.<your-domain>/api/auth/google/callback`
- Privacy Policy: `https://app.<your-domain>/privacy`
- Terms of Service: `https://app.<your-domain>/terms`

## Repository support added in this change

- `GOOGLE_OAUTH_PUBLISHING_STATUS` now distinguishes `testing` vs `production`.
- `GOOGLE_WORKSPACE_SCOPE_PROFILE` now supports:
  - `restricted`: current broad Drive access profile
  - `reduced`: `drive.file`-centered profile for a lighter verification path
- `npm run check:public-deploy` validates:
  - frontend/API URL shape
  - redirect URI path
  - `AI_ALLOWED_ORIGIN` alignment
  - production-domain readiness
  - scope verification risk
- GitHub Actions now support:
  - `GCP_FIREBASE_PROJECT_ID`
  - `GCP_GOOGLE_OAUTH_PUBLISHING_STATUS`
  - `GCP_GOOGLE_WORKSPACE_SCOPE_PROFILE`

## Production cutover steps

1. Create or choose a production GCP project dedicated to the public OAuth app.
2. Create the production OAuth client in that project.
3. Connect `app.<your-domain>` to Firebase Hosting.
4. Connect `api.<your-domain>` to Cloud Run custom domains.
5. Verify both domains in Search Console before updating Google Auth Platform branding.
6. Set Google Auth Platform branding URLs to the frontend custom domain.
7. Add the owned domain under Authorized domains.
8. Keep the app in `Testing` until branding URLs and redirect URI are live.
9. Switch `GOOGLE_OAUTH_PUBLISHING_STATUS=production` only after the custom-domain deployment is healthy.

## Required GitHub secrets

- `GCP_PROJECT_ID`
- `GCP_FIREBASE_PROJECT_ID`
- `GCP_AI_ALLOWED_ORIGIN`
- `GCP_WORKSPACE_FRONTEND_ORIGIN`
- `GCP_WEB_VITE_AI_API_BASE_URL`
- `GCP_GOOGLE_CLIENT_ID`
- `GCP_GOOGLE_OAUTH_REDIRECT_URI`
- `GCP_GOOGLE_OAUTH_PUBLISHING_STATUS`
- `GCP_GOOGLE_WORKSPACE_SCOPE_PROFILE`
- `GCP_GOOGLE_CLIENT_SECRET_SECRET_NAME`
- `GCP_TEX_SERVICE_BASE_URL`
- `GCP_TEX_SERVICE_AUTH_TOKEN_SECRET_NAME`

## Recommended production values

```text
GCP_FIREBASE_PROJECT_ID=your-production-firebase-project
GCP_AI_ALLOWED_ORIGIN=https://app.your-domain.dev
GCP_WORKSPACE_FRONTEND_ORIGIN=https://app.your-domain.dev
GCP_WEB_VITE_AI_API_BASE_URL=https://api.your-domain.dev
GCP_GOOGLE_OAUTH_REDIRECT_URI=https://api.your-domain.dev/api/auth/google/callback
GCP_GOOGLE_OAUTH_PUBLISHING_STATUS=production
GCP_GOOGLE_WORKSPACE_SCOPE_PROFILE=restricted
```

## Scope strategy

### Keep current product behavior

- Use `GOOGLE_WORKSPACE_SCOPE_PROFILE=restricted`.
- This preserves broad Drive search/import/export behavior.
- Expect full Google app verification and restricted-scope review for external production.

### Reduce verification burden

- Move the UX to a `drive.file`-centered model first.
- Then switch to `GOOGLE_WORKSPACE_SCOPE_PROFILE=reduced`.
- Do not flip this env var alone unless the product flow has been updated to stop relying on broad Drive listing/search.

## DuckDNS note

- DuckDNS may be usable for short-lived demos or staging validation.
- It is not the recommended production answer for Docsy branding review.
- The validator in this repo warns on `*.duckdns.org` hosts so that production releases do not silently ship on a weak branding domain.

## Validation checklist

- `npm run check:public-deploy` passes with production env values.
- `GET https://api.<your-domain>/api/ai/health` returns:
  - `googleOAuthPublishingStatus=production`
  - the expected `googleWorkspaceScopeProfile`
- Google Auth Platform branding accepts Homepage, Privacy Policy, Terms, and Authorized domains.
- Google OAuth completes without redirect mismatch.
- External non-test-user accounts can authenticate after production approval.
