# Security Status

Date: 2026-03-14

## Summary

This document summarizes the current security hardening state of the Docsy and
Markdown Muse deployment, including what has already been implemented in the
repository and what is still planned or recommended before broader production
use.

The current state is materially safer than the earlier hackathon baseline, but
it should still be treated as a staged hardening rollout rather than a finished
security program.

## Implemented

### 1. Secret handling and workspace state

- Repo-tracked workspace state under `.data/` was removed from source control.
- `.data/` is ignored going forward.
- Workspace state now defaults outside the repository:
  - local: `${HOME}/.docsy/workspace-state.json`
  - Cloud Run: `/tmp/docsy-workspace-state.json`
- Persisted workspace state was reduced so that:
  - access tokens are not stored
  - ID tokens are not stored
  - imported Google Docs body payloads are not stored
  - imported Google Docs JSON payloads are not stored
- A repository-path guard prevents repo-local workspace state outside tests.

### 2. Untrusted document and rendering hardening

- Shared `.docsy` documents now rehydrate from validated AST, not embedded
  `tiptap` payloads.
- KaTeX rendering was switched to `trust: false`.
- Mermaid rendering now uses:
  - `securityLevel: "strict"`
  - SVG sanitization through DOMPurify before insertion
- Share-link generation no longer depends on storing trusted editor-state payloads.

### 3. TeX hardening

- Request-body limits were added for AI and TeX routes.
- Public raw full-document TeX compilation is disabled by default.
- TeX security controls are now split into separate switches:
  - `TEX_ALLOW_RAW_DOCUMENT`
  - `TEX_ALLOW_RESTRICTED_COMMANDS`
  - `TEX_ALLOWED_PACKAGES`
- File and process primitives remain blocked unless explicitly enabled.
- `\usepackage{...}` is checked against an allowlist unless restricted commands
  are fully enabled.

### 4. OAuth and session hardening

- `WORKSPACE_FRONTEND_ORIGIN` now fails closed in production-style deployments.
- State-changing auth and workspace POST routes now enforce trusted origin checks.
- Session cookies were tightened:
  - `__Host-...` cookie name on secure requests
  - `HttpOnly`
  - `Secure`
  - `Path=/`
  - `SameSite=Lax`
- Session handling now includes:
  - shorter absolute TTL
  - idle expiry
  - session touch on use
  - session rotation on OAuth callback/reconnect

### 5. Public API and deployment exposure reduction

- Public health endpoints were reduced to minimal readiness output.
- A token-protected internal diagnostics route was added for detailed AI health.
- Baseline browser security headers were added to API responses.
- Firebase Hosting now serves:
  - `Content-Security-Policy-Report-Only`
  - `Strict-Transport-Security`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `X-Frame-Options`
- A CSP reporting endpoint exists at `/api/security/csp-report`.
- App-level rate limiting was added for AI, TeX, auth, and workspace route groups.

### 6. Dependency and verification improvements

- High and critical `npm audit` findings were removed from the current lockfile.
- Remaining audit findings are currently moderate and tied to the current Vite
  major version boundary.
- Regression coverage was added for:
  - workspace state sanitization
  - shared document AST-only loading
  - Mermaid SVG sanitization
  - KaTeX unsafe URL rejection
  - request-size enforcement
  - TeX security policy branching
  - diagnostics auth
  - rate limiting
  - session cookie hardening
  - auth origin enforcement

## Still Planned or Recommended

### 1. Edge-layer abuse controls

These are not fully implemented in repo-managed infrastructure yet:

- Cloud Armor or equivalent WAF in front of public `/api/**`
- route-specific external rate limiting budgets
- alerting on repeated 429 spikes and abuse patterns

App-level rate limiting now exists, but it should be treated as a fallback, not
the only protection layer.

### 2. CSP enforcement rollout

Current mode is `Report-Only`, not enforced CSP.

Recommended next steps:

1. collect report-only violations for at least one release cycle
2. remove unnecessary allowances
3. switch to enforced CSP once violations are understood

### 3. Token storage maturity

Workspace refresh tokens are no longer kept in repo-tracked files, but storage is
still file-based.

Recommended future move:

- migrate long-lived credential storage to a managed backend with encryption
  controls, for example Firestore, Redis, or SQL plus KMS/Secret Manager-backed
  protection

### 4. Full production TeX policy refinement

The current allowlist is practical but still coarse.

Potential next step:

- separate package allowlists by environment
- add explicit guidance for trusted local use versus public web deployment
- optionally split `graphicx` or other high-risk capabilities into their own
  controls

### 5. CI and lint cleanup

- server typecheck passes
- security-focused tests pass
- some broad UI test runs still show occasional timeout behavior under heavier
  parallel execution
- repository-wide lint is still not clean because of longstanding unrelated
  issues outside the current security work

These are quality and maintenance concerns rather than direct new security
findings, but they affect confidence and release hygiene.

## Current Deployment Position

### Reasonable for

- local development
- internal testing
- limited public demo deployment with correct env and domain configuration

### Not yet the final state for

- mature production rollout with stronger external abuse protection
- enforced CSP posture
- managed encrypted long-lived credential storage

## Related Documents

- [Security Credential Rotation Runbook](security-credential-rotation-runbook-2026-03-14.md)
- [Edge and Browser Security Runbook](edge-and-browser-security-runbook-2026-03-14.md)
- [GCP Deployment Guide](gcp-deployment.md)
- [Cloud Run Deploy Runbook](cloud-run-deploy-runbook-2026-03-11.md)
