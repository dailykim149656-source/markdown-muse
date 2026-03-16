# Current Workspace Auth Contract

Date: 2026-03-16
Status: Current source of truth for deployed Google Workspace auth behavior

## Topology

- Frontend origin: Firebase Hosting on `https://docsy.cyou`
- API origin: same origin via Firebase Hosting rewrite `/api/** -> Cloud Run docsy`
- Session/state backend: Firestore on Cloud Run

## Success Criterion

Google Workspace auth is considered successful only when:

1. Google OAuth callback completes
2. the server issues a session cookie
3. `GET /api/auth/session` returns `connected: true`

Do not treat the callback redirect alone as success.

## Cookie Contract

- Secure hosted session cookie name: `__session`
- Local non-secure session cookie name: `docsy_workspace_session`
- Legacy secure cookie accepted during migration: `__Host-docsy-workspace-session`
- Secure hosted cookie policy:
  - `HttpOnly`
  - `Path=/`
  - `Secure`
  - `SameSite=None`

Firebase Hosting rewrites only forward `__session` to the rewritten backend, so deployed workspace auth must use that cookie name.

## Required Deploy Env

- `AI_ALLOWED_ORIGIN=https://docsy.cyou`
- `WORKSPACE_FRONTEND_ORIGIN=https://docsy.cyou`
- `GOOGLE_OAUTH_REDIRECT_URI=https://docsy.cyou/api/auth/google/callback`
- `GOOGLE_OAUTH_PUBLISHING_STATUS=testing|production`
- `GOOGLE_WORKSPACE_SCOPE_PROFILE=restricted|reduced`
- `WORKSPACE_REPOSITORY_BACKEND=firestore`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Runtime Source Of Truth

- OAuth URL and token exchange: `server/modules/auth/googleOAuth.ts`
- Callback/session routes: `server/modules/auth/routes.ts`
- Cookie contract: `server/modules/auth/sessionStore.ts`
- Shared session/state persistence: `server/modules/workspace/repository.ts`
- Browser API calls with credentials: `src/lib/workspace/client.ts`
- Frontend success/failure UX: `src/pages/Index.tsx`

## Required Log Pattern

A successful hosted login should produce this order in the latest deployed revision:

1. `POST /api/auth/google/connect`
2. `GET /api/auth/google/callback?...`
3. `callback connected ...`
4. `GET /api/auth/session`
5. `session lookup connected=true ...`

Common failure signatures:

- `callback failed code=workspace_provider_error ...`
- `session lookup connected=false sessionId=none ...`
- `Error [500]: Firestore transactions require all reads to be executed before all writes.`
- `invalid_client`

## AI Assistant 5xx First Checks

If `GET /api/ai/health` is healthy but browser `POST /api/ai/agent/turn` requests fail, check these first:

1. Firestore database exists in the target GCP project and `firestore.googleapis.com` is enabled.
2. The Cloud Run runtime service account can read and write Firestore for the deployed project.
3. `AI_ALLOWED_ORIGIN`, `WORKSPACE_FRONTEND_ORIGIN`, and `GOOGLE_OAUTH_REDIRECT_URI` are aligned to the same deployed frontend origin for the Firebase Hosting rewrite topology.

Hosted smoke verification order:

1. `GET /api/ai/health`
2. `GET /api/auth/session` without cookies should return `connected=false`
3. `POST /api/ai/agent/turn` with a minimal payload should return 200 JSON with `assistantMessage` and `effect`

## Diagnostics

- Public health: `GET /api/ai/health`
- Internal health: `GET /api/internal/ai/health` with `X-Docsy-Diagnostics-Token`
- Runtime smoke: `node scripts/check-ai-runtime-smoke.mjs --origin https://YOUR_ORIGIN`
- Manual smoke helper: `scripts/check-google-workspace-auth-smoke.ps1`

## Frontend/Server Revision Tracking

- Server revision is surfaced from Cloud Run `K_REVISION`
- Frontend build id is exposed at runtime as `window.__docsyRuntime.frontendBuildId`
- If auth symptoms and logs do not line up, confirm both the latest frontend build and latest server revision before debugging behavior
