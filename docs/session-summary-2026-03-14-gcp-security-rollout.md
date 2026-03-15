# Session Summary: GCP Security Rollout

Date: 2026-03-14

## Summary

This session took the repository security hardening work from code-only changes
to an actual deployed-state migration on the existing GCP stack.

The work covered three layers:

- repository and deployment workflow hardening
- in-place Cloud Run and Firebase Hosting rollout on the existing `docsy` and
  `docsy-tex` services
- operator follow-up identification for the remaining GitHub Actions and
  edge-layer gaps

At the end of the session, the live Cloud Run services and Firebase Hosting
surface were updated to the new security posture. The main unresolved item is
GitHub Actions access to specific Secret Manager secrets.

## Repository Changes Completed

### 1. TeX security policy split

The TeX policy was refined so the deployment can allow full raw LaTeX documents
without also enabling dangerous file or process primitives.

Current controls:

- `TEX_ALLOW_RAW_DOCUMENT`
- `TEX_ALLOW_RESTRICTED_COMMANDS`
- `TEX_ALLOWED_PACKAGES`

Behavior:

- full raw documents can be enabled
- restricted file/process primitives remain blocked by default
- `\usepackage{...}` is checked against an allowlist unless restricted commands
  are explicitly enabled

### 2. Existing-deployment migration support

Added and updated:

- baseline snapshot tooling
- an in-place GCP migration runbook
- diagnostics token Secret Manager support in deploy configuration
- documentation of current live security state and remaining gaps

Key artifacts:

- [Security Status](security-status-2026-03-14.md)
- [Existing GCP Security Migration Runbook](existing-gcp-security-migration-runbook-2026-03-14.md)
- [Edge and Browser Security Runbook](edge-and-browser-security-runbook-2026-03-14.md)

## Live GCP Changes Applied

### 1. Baseline snapshot captured

The pre-change state of the deployed stack was captured with:

- `scripts/snapshot-existing-gcp-deployment.ps1`

Snapshot output:

- `output/gcp-snapshot/20260314-170140/`

This captured:

- AI service export
- TeX service export
- Secret Manager inventory
- Firebase Hosting site information

### 2. TeX service redeployed

The existing `docsy-tex` service was redeployed in place with:

- `TEX_MAX_REQUEST_BYTES=400000`
- `TEX_ALLOW_RAW_DOCUMENT=true`
- `TEX_ALLOW_RESTRICTED_COMMANDS=false`
- production-safe `TEX_ALLOWED_PACKAGES`

Direct health verification succeeded with:

- identity token
- `X-Docsy-Tex-Token`

### 3. AI service redeployed

The existing `docsy` AI service was redeployed in place with:

- explicit `AI_ALLOWED_ORIGIN`
- explicit `WORKSPACE_FRONTEND_ORIGIN`
- explicit OAuth redirect URI
- request-size limits
- TeX policy passthrough values
- diagnostics token moved to a Secret Manager-backed runtime env

The diagnostics token now comes from:

- Secret Manager secret `ai-diagnostics-token`

### 4. Firebase Hosting updated

Firebase Hosting was updated with the latest built frontend and `firebase.json`
security headers.

The normal `firebase deploy` path could not be used from the local environment
because Firebase CLI authentication was not valid for Hosting API calls.

Instead, Hosting was updated through the Firebase Hosting REST API using the
current GCP access token path.

## Live Verification Completed

### Public health

- `GET /api/ai/health` returned minimal readiness output only
- `GET /api/tex/health` through the AI proxy returned success

### Internal diagnostics health

- token omitted: route returned `404`
- token supplied from Secret Manager: detailed health payload returned success

### Browser security headers

Verified on:

- `/`
- `/editor`

Observed:

- `Content-Security-Policy-Report-Only`
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `X-Frame-Options`

### OAuth and origin enforcement

Verified:

- correct frontend origin can start Google Workspace connect flow
- incorrect origin is rejected with `403 Origin is not allowed`
- OAuth start returns a valid Google authorization URL

### TeX runtime policy

Verified:

- full raw LaTeX document compilation succeeds when `TEX_ALLOW_RAW_DOCUMENT=true`
- disallowed package request like `\usepackage{minted}` is rejected with `400`
- restricted commands remain blocked while `TEX_ALLOW_RESTRICTED_COMMANDS=false`

## Current Live Runtime Shape

### AI service

Current important values:

- `AI_ALLOWED_ORIGIN=https://urban-dds.web.app`
- `WORKSPACE_FRONTEND_ORIGIN=https://urban-dds.web.app`
- `GOOGLE_OAUTH_REDIRECT_URI=https://docsy-mc32v24cyq-du.a.run.app/api/auth/google/callback`
- `GOOGLE_OAUTH_PUBLISHING_STATUS=testing`
- `AI_MAX_REQUEST_BYTES=2097152`
- `AI_DIAGNOSTICS_TOKEN` from Secret Manager
- `TEX_ALLOW_RAW_DOCUMENT=true`
- `TEX_ALLOW_RESTRICTED_COMMANDS=false`
- production-safe `TEX_ALLOWED_PACKAGES`

### TeX service

Current important values:

- `TEX_MAX_SOURCE_BYTES=300000`
- `TEX_MAX_REQUEST_BYTES=400000`
- `TEX_MAX_CONCURRENCY=2`
- `TEX_ALLOW_RAW_DOCUMENT=true`
- `TEX_ALLOW_RESTRICTED_COMMANDS=false`
- production-safe `TEX_ALLOWED_PACKAGES`

## Remaining Problem: GitHub Actions Secret Access

The live services are updated, but GitHub Actions is still not fully healthy.

Observed workflow failures show:

- `Secret Manager secret tex-service-auth-token is required.`
- `Secret Manager secret google-client-secret is required.`

Given the live deployment and local checks, the likely root cause is not secret
absence but GitHub Actions service-account access.

Most likely issue:

- the service account represented by `GCP_SA_KEY` does not currently have
  Secret Manager read access for one or more required secrets

Required GitHub Actions secret access targets:

- `google-client-secret`
- `tex-service-auth-token`
- `ai-diagnostics-token`

Required role:

- `roles/secretmanager.secretAccessor`

## Remaining Problem: Cloud Armor / WAF

The project now has `compute.googleapis.com` enabled, but there is still no
load-balancer-side infrastructure to attach Cloud Armor to.

Observed state:

- no backend services
- no URL maps
- no serverless NEGs
- no security policies

Conclusion:

- Cloud Armor is not a simple in-place toggle on the current Firebase Hosting +
  direct Cloud Run shape
- it requires a new ingress architecture with load balancer resources

## Practical Deployment Status

### Completed

- repository hardening landed
- Cloud Run AI service hardened and redeployed
- Cloud Run TeX service hardened and redeployed
- Firebase Hosting headers and frontend build pushed live
- diagnostics token moved to Secret Manager

### Not yet completed

- GitHub Actions secret access alignment
- Cloud Armor / WAF rollout
- CSP move from report-only to enforced mode
- managed encrypted refresh-token storage beyond file-backed runtime state

## Recommended Next Steps

1. Grant the GitHub Actions service account `roles/secretmanager.secretAccessor`
   on:
   - `google-client-secret`
   - `tex-service-auth-token`
   - `ai-diagnostics-token`
2. Re-run the split workflows from GitHub Actions and confirm they now pass.
3. Decide whether the current public demo should continue with
   `TEX_ALLOW_RAW_DOCUMENT=true` or be tightened again.
4. If edge-layer protection is required, start a separate Cloud Armor ingress
   design and migration effort.

## Related Documents

- [Security Status](security-status-2026-03-14.md)
- [Existing GCP Security Migration Runbook](existing-gcp-security-migration-runbook-2026-03-14.md)
- [Security Credential Rotation Runbook](security-credential-rotation-runbook-2026-03-14.md)
- [Edge and Browser Security Runbook](edge-and-browser-security-runbook-2026-03-14.md)
- [GCP Deployment Guide](gcp-deployment.md)
