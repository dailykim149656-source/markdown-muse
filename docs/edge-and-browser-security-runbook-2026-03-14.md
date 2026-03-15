# Edge and Browser Security Runbook

## Goal

Harden the public Docsy web deployment without changing the anonymous product
shape. This runbook covers:

- edge abuse protection for `/api/**`
- app-level rate limiting as a fallback
- browser security headers
- CSP report-only rollout and enforcement
- internal diagnostics health access

## Edge abuse protection

The repo now includes app-level rate limiting, but it should be treated as a
backstop. Put a managed edge policy in front of the public AI API.

Recommended shape:

1. Protect the Cloud Run backend or external HTTPS entrypoint with Cloud Armor.
2. Apply separate budgets for:
   - `/api/ai/agent/turn`
   - `/api/ai/summarize`
   - `/api/tex/preview`
   - `/api/tex/export-pdf`
   - `/api/auth/google/connect`
   - `/api/auth/session`
3. Keep health endpoints looser than expensive generation endpoints.
4. Log and alert on repeated `429` spikes by route bucket.

## App-level rate limiting

The AI service now rate-limits expensive routes by client IP plus route bucket.

Key points:

- expensive AI/TeX POST routes are tighter than auth/session reads
- `429` bodies stay small and generic
- `Retry-After` is returned for callers that want to back off cleanly

## Firebase Hosting headers

`firebase.json` now sets:

- `Content-Security-Policy-Report-Only`
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `X-Frame-Options`

These headers apply to the static frontend surface. API responses add baseline
security headers from the Node service itself.

## CSP rollout

Current rollout mode is `Report-Only`.

The policy currently allows:

- `style-src 'unsafe-inline'` because the editor still uses inline styles
- `img-src` with `data:` and `blob:` for QR/image workflows
- `img-src https://lh3.googleusercontent.com` for Google profile images
- `object-src 'self' blob:` for PDF preview
- `connect-src 'self' https:` so the deployed frontend can still reach its API origin

Recommended rollout:

1. Collect CSP reports for one release cycle.
2. Remove any unnecessary allowances discovered during review.
3. Convert the same policy to enforced CSP after violations are understood.

Reports are sent to:

- `/api/security/csp-report`

## Internal diagnostics health

Public health endpoints are now intentionally minimal.

If you need the detailed AI diagnostics payload in a deployed environment:

1. Set `AI_DIAGNOSTICS_TOKEN` on the AI service.
2. Call `GET /api/internal/ai/health` with header:
   - `X-Docsy-Diagnostics-Token: YOUR_TOKEN`

If `AI_DIAGNOSTICS_TOKEN` is unset, the internal route is available only for
local development.

Recommended deployment shape:

- store the diagnostics token in Secret Manager
- inject it into Cloud Run as a secret-backed env var instead of a plain env var

## Validation checklist

1. `GET /health` returns only minimal readiness fields.
2. `GET /api/internal/ai/health` is blocked without the diagnostics token in production-style environments.
3. Firebase-hosted `/` responses include the expected security headers.
4. CSP reports arrive at `/api/security/csp-report`.
5. Rate limiting produces `429` for repeated expensive requests and leaves normal traffic unaffected.
