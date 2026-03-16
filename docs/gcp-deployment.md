# GCP deployment

Markdown Muse is deployed to GCP in three parts:

- frontend: static web build on Firebase Hosting
- AI API: Cloud Run service
- TeX validation service: separate Cloud Run service for XeLaTeX validation and PDF compilation

The desktop profile is not part of the GCP deployment path. GCP should serve the
`web` profile only.

Recommended custom-domain topology for this repo:

- `https://app.YOUR_DOMAIN` serves the frontend from Firebase Hosting
- the browser also calls `https://app.YOUR_DOMAIN/api/...`
- Firebase Hosting rewrites `/api/**` to the Cloud Run `docsy` service
- use a separate `api.YOUR_DOMAIN` only if you intentionally want split frontend/API domains

## Frontend

### 1. Prepare web env

Create a web deployment env file or inject the same values from CI/CD.

Required frontend values:

- `VITE_APP_PROFILE=web`
- `VITE_AI_API_BASE_URL=https://app.YOUR_DOMAIN`

Example:

```bash
echo VITE_APP_PROFILE=web > .env.production.local
echo VITE_AI_API_BASE_URL=https://app.YOUR_DOMAIN >> .env.production.local
```

### 2. Build the web profile

```bash
npm ci
npm run build:web
```

The generated `dist/` folder is the deployable frontend artifact.

### 3. Deploy to Firebase Hosting

Deploy the static bundle with Firebase Hosting.

```bash
firebase deploy --only hosting
```

### 4. Configure static hosting

Firebase Hosting must rewrite unknown SPA paths such as `/editor` to
`/index.html`.

This repository already includes that rewrite in `firebase.json`.
The same config also rewrites `/api/**` to the Cloud Run `docsy` service, so
single-domain custom-domain deploys do not need a separate `api` subdomain.
Firebase Hosting only forwards the `__session` cookie to rewritten backends, so deployed Google Workspace auth sessions must use `__session` rather than custom secure cookie names.

### 5. Cache guidance

Use cache policy appropriate for hashed assets:

- `index.html`: short TTL or no-cache
- `assets/*` with hashed filenames: long TTL

This project already emits hashed asset filenames, so CDN caching is safe for
most files under `dist/assets/`.

## AI API

### 1. Build the image

Use `Dockerfile.ai` locally or `cloudbuild.ai.yaml` in Cloud Build.

```bash
gcloud builds submit \
  --config cloudbuild.ai.yaml \
  --substitutions=_IMAGE_URI=REGION-docker.pkg.dev/PROJECT/REPO/markdown-muse-ai
```

### 2. Required runtime env vars

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `AI_ALLOWED_ORIGIN`
- `AI_MAX_REQUEST_BYTES`
- `AI_DIAGNOSTICS_TOKEN`
- `AI_SERVER_PORT`
- `TEX_SERVICE_BASE_URL`
- `TEX_SERVICE_AUTH_TOKEN`
- `TEX_ALLOW_ALL_PACKAGES`
- `TEX_ALLOW_RAW_DOCUMENT`
- `TEX_ALLOW_RESTRICTED_COMMANDS`
- `TEX_ALLOWED_PACKAGES`
- `WORKSPACE_FRONTEND_ORIGIN`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_OAUTH_PUBLISHING_STATUS`
- `GOOGLE_WORKSPACE_SCOPE_PROFILE`
- Cloud Firestore enabled in the target project for shared Google Workspace state

Recommended values:

- `GEMINI_MODEL=gemini-2.5-flash`
- `AI_SERVER_PORT=8080`
- `AI_ALLOWED_ORIGIN=https://app.YOUR_DOMAIN`
- `AI_MAX_REQUEST_BYTES=2097152`
- `AI_DIAGNOSTICS_TOKEN` should be provided through a Secret Manager-backed env when internal diagnostics access is needed
- `WORKSPACE_FRONTEND_ORIGIN=https://app.YOUR_DOMAIN`
- `GOOGLE_OAUTH_REDIRECT_URI=https://app.YOUR_DOMAIN/api/auth/google/callback`
- `GOOGLE_OAUTH_PUBLISHING_STATUS=testing`
- `GOOGLE_WORKSPACE_SCOPE_PROFILE=restricted`
- Cloud Firestore enabled with a database created in the same project
- `TEX_ALLOW_ALL_PACKAGES=true`
- `TEX_ALLOW_RAW_DOCUMENT=true`
- `TEX_ALLOW_RESTRICTED_COMMANDS=false`
- `TEX_ALLOWED_PACKAGES=amsmath,amssymb,amsthm,array,booktabs,caption,enumitem,etoolbox,fancyhdr,float,fontspec,geometry,graphicx,hyperref,inputenc,latexsym,listings,longtable,makecell,mathtools,multirow,setspace,soul,tabularx,tcolorbox,titlesec,ulem,xcolor,xeCJK`
- `TEX_SERVICE_BASE_URL=https://YOUR_TEX_CLOUD_RUN_URL`

`AI_ALLOWED_ORIGIN` should be the exact frontend origin, not `*`. The deploy
validator now treats wildcard CORS as invalid outside local development.
When Firebase Hosting fronts Cloud Run through the existing `/api/**` rewrite,
`VITE_AI_API_BASE_URL` should usually be the frontend custom domain so browser
traffic stays same-origin.
For external production Google OAuth, keep managed preview domains such as
`*.web.app` and `*.run.app` out of the final config.
LaTeX mode sends raw LaTeX to the backend. Full preambles and
`\documentclass ... \begin{document} ... \end{document}` wrappers require
`TEX_ALLOW_RAW_DOCUMENT=true`.
Public/demo deployments now default to `TEX_ALLOW_ALL_PACKAGES=true`, which
disables package allowlist enforcement while still keeping dangerous
file/process primitives blocked with `TEX_ALLOW_RESTRICTED_COMMANDS=false`.

### 3. Deploy to Cloud Run

```bash
gcloud run deploy markdown-muse-ai \
  --image REGION-docker.pkg.dev/PROJECT/REPO/markdown-muse-ai \
  --region REGION \
  --allow-unauthenticated \
  --set-env-vars GEMINI_MODEL=gemini-2.5-flash,AI_SERVER_PORT=8080,AI_ALLOWED_ORIGIN=https://app.YOUR_DOMAIN,WORKSPACE_FRONTEND_ORIGIN=https://app.YOUR_DOMAIN,GOOGLE_OAUTH_REDIRECT_URI=https://app.YOUR_DOMAIN/api/auth/google/callback,GOOGLE_OAUTH_PUBLISHING_STATUS=testing,GOOGLE_WORKSPACE_SCOPE_PROFILE=restricted,TEX_SERVICE_BASE_URL=https://YOUR_TEX_CLOUD_RUN_URL
```

Set `GEMINI_API_KEY` through Secret Manager or Cloud Run secrets rather than
inline CLI flags when possible.

Run the public-deploy validator before switching the OAuth app to production:

```bash
npm run check:public-deploy
```

Google Workspace OAuth state must be shared across Cloud Run instances. This repo now defaults to the Firestore repository backend on Cloud Run. Before rollout, enable Firestore and create a database in the deploy project.

### 4. GitHub Actions deployment (recommended)

You do not need to manually `git clone` in GCP.  
`github.com` repository is your source of truth, and CI handles the build/deploy.

Use:

- [deploy-tex.yml](/F:/Docsy-document_editor/markdown-muse/.github/workflows/deploy-tex.yml)
- [deploy-ai.yml](/F:/Docsy-document_editor/markdown-muse/.github/workflows/deploy-ai.yml)
- [deploy-web.yml](/F:/Docsy-document_editor/markdown-muse/.github/workflows/deploy-web.yml)
- [deploy-full-stack.yml](/F:/Docsy-document_editor/markdown-muse/.github/workflows/deploy-full-stack.yml)

Required repository secrets:

- `GCP_SA_KEY` (service account JSON, or replace with workload identity auth)
- `GCP_PROJECT_ID`
- `GCP_FIREBASE_PROJECT_ID` (optional override when Hosting lives in a separate production project)
- `GCP_AI_ALLOWED_ORIGIN` (exact frontend origin)
- `GCP_WORKSPACE_FRONTEND_ORIGIN` (exact frontend origin used for OAuth redirects)
- `GCP_GOOGLE_OAUTH_REDIRECT_URI` (exact callback URL on the frontend custom domain)
- `GCP_GOOGLE_OAUTH_PUBLISHING_STATUS` (`testing` or `production`)
- `GCP_GOOGLE_WORKSPACE_SCOPE_PROFILE` (`restricted` or `reduced`)
- `GCP_AI_DIAGNOSTICS_TOKEN_SECRET_NAME` (optional, defaults to `ai-diagnostics-token`)
- `GCP_TEX_SERVICE_AUTH_TOKEN_SECRET_NAME` (optional, defaults to `tex-service-auth-token`)
- `GCP_TEX_SERVICE_BASE_URL`
- `GCP_WEB_VITE_AI_API_BASE_URL` (optional override; defaults to `GCP_WORKSPACE_FRONTEND_ORIGIN` in the repo workflows)
- `FIREBASE_SERVICE_ACCOUNT_URBAN_DDS`

The split workflows do:

- `deploy-tex.yml`
  - deploy only the TeX service
  - health check `GET /health`
- `deploy-ai.yml`
  - deploy only the AI API
  - health checks `GET /api/ai/health` and `GET /api/tex/health`
  - reads `GCP_TEX_SERVICE_BASE_URL` from secrets
- `deploy-web.yml`
  - build and deploy only the frontend
  - uses `GCP_WEB_VITE_AI_API_BASE_URL` when set, otherwise defaults to the configured frontend origin
- `deploy-full-stack.yml`
  - manual coordinated release workflow
  - runs TeX -> AI -> web in sequence

Trigger behavior:

- each split workflow includes its own workflow file in `push.paths`
- deployment validation script changes trigger the relevant workflows
- `deploy-full-stack.yml` remains manual by design and does not auto-run on push

Recommended usage:

- day-to-day deploys: use the split workflows
- coordinated releases or contract changes: use `deploy-full-stack.yml`

Diagnostics secret fallback:

- if `GCP_AI_DIAGNOSTICS_TOKEN_SECRET_NAME` is unset, deploy workflows fall back to `ai-diagnostics-token`
- internal diagnostics verification now checks Secret Manager directly and logs a clear skip when the secret does not exist

## TeX validation service

### 1. Build the image

Use `Dockerfile.tex` locally or `cloudbuild.tex.yaml` in Cloud Build.

```bash
gcloud builds submit \
  --config cloudbuild.tex.yaml \
  --substitutions=_IMAGE_URI=REGION-docker.pkg.dev/PROJECT/REPO/markdown-muse-tex
```

### 2. Required runtime env vars

- `TEX_SERVICE_PORT`
- `TEX_COMPILE_TIMEOUT_MS`
- `TEX_MAX_SOURCE_BYTES`
- `TEX_MAX_REQUEST_BYTES`
- `TEX_MAX_CONCURRENCY`
- `TEX_SERVICE_AUTH_TOKEN`
- `TEX_ALLOW_ALL_PACKAGES`
- `TEX_ALLOW_RAW_DOCUMENT`
- `TEX_ALLOW_RESTRICTED_COMMANDS`
- `TEX_ALLOWED_PACKAGES`

Recommended values:

- `TEX_SERVICE_PORT=8081`
- `TEX_COMPILE_TIMEOUT_MS=15000`
- `TEX_MAX_SOURCE_BYTES=300000`
- `TEX_MAX_REQUEST_BYTES=400000`
- `TEX_MAX_CONCURRENCY=2`
- `TEX_ALLOW_ALL_PACKAGES=true`
- `TEX_ALLOW_RAW_DOCUMENT=true`
- `TEX_ALLOW_RESTRICTED_COMMANDS=false`
- `TEX_ALLOWED_PACKAGES=amsmath,amssymb,amsthm,array,booktabs,caption,enumitem,etoolbox,fancyhdr,float,fontspec,geometry,graphicx,hyperref,inputenc,latexsym,listings,longtable,makecell,mathtools,multirow,setspace,soul,tabularx,tcolorbox,titlesec,ulem,xcolor,xeCJK`

The TeX service is called by the AI API, not directly by the browser. The
frontend should continue to use only `VITE_AI_API_BASE_URL`.
This repo's public/demo deployment keeps full raw LaTeX documents enabled while
allows arbitrary installed LaTeX packages while still blocking dangerous
file/process primitives with
`TEX_ALLOW_RESTRICTED_COMMANDS=false`.
`TEX_ALLOWED_PACKAGES` remains available only for stricter/private deployments
that opt back into allowlist enforcement with `TEX_ALLOW_ALL_PACKAGES=false`.

The current TeX image is a coverage-first profile, not a minimal fast-build
profile. It intentionally includes a broader curated TeX Live package set for
common resumes, papers, reports, citations, and layout packages. Deploy time
and image size are therefore higher than a minimal XeLaTeX image.

When TeX package coverage changes, routine redeploy normally requires only:

- `deploy-tex.yml`

If coverage is still insufficient after the curated package set, the next
escalation path is evaluating `texlive-full`.

### 3. New Cloud Run resource creation

1. Create or reuse an Artifact Registry repository for the TeX image.
2. Create a Secret Manager secret for `tex-service-auth-token`.
3. Deploy a new Cloud Run service such as `docsy-tex` using `Dockerfile.tex` with `--no-allow-unauthenticated`.
4. Grant `roles/run.invoker` on the TeX service to the AI service account.
5. Note the resulting service URL and pass it to the AI service as `TEX_SERVICE_BASE_URL`.
6. Use the same `TEX_SERVICE_AUTH_TOKEN` secret in both the TeX service and the AI service.

The AI service calls the TeX service with:

- a Cloud Run identity token in `Authorization: Bearer ...`
- an app-level shared secret in `X-Docsy-Tex-Token`
- request-time LaTeX validation that rejects raw full-document compilation unless `TEX_ALLOW_RAW_DOCUMENT=true`
- package allowlist enforcement is skipped when `TEX_ALLOW_ALL_PACKAGES=true`
- file/process primitives remain blocked unless `TEX_ALLOW_RESTRICTED_COMMANDS=true`
- `\usepackage{...}` declarations are checked against `TEX_ALLOWED_PACKAGES` unless restricted commands are fully enabled

## Credential exposure response

If any workspace state file or OAuth token is committed to Git history, follow:

- [Security Credential Rotation Runbook](security-credential-rotation-runbook-2026-03-14.md)
- [Edge and Browser Security Runbook](edge-and-browser-security-runbook-2026-03-14.md)

### 4. Rollback and health checks

- Health endpoint: `GET https://YOUR_TEX_CLOUD_RUN_URL/health`
- direct health checks require the same Cloud Run identity token and `X-Docsy-Tex-Token` header as runtime traffic
- Roll back by redeploying the previous TeX image revision and then the AI service revision that points to it.

## Recommended rollout shape

1. Deploy the TeX service first.
2. Confirm `GET /health` works from the TeX Cloud Run URL.
3. Deploy the AI API with `TEX_SERVICE_BASE_URL` pointing to that TeX URL.
4. Confirm `GET /api/ai/health` and `GET /api/tex/health` work from the AI API URL.
5. Build the frontend with `VITE_AI_API_BASE_URL` pointing to `https://app.YOUR_DOMAIN` so Firebase Hosting keeps browser API traffic same-origin. Use the API origin only for split-domain deployments.
6. Deploy the frontend to Firebase Hosting.
7. Confirm SPA rewrites for routes such as `/editor`.
8. Turn on appropriate caching for hashed assets.

## 도메인이 없을 때 가장 쉬운 배포(기본 제공 도메인)

도메인이 없을 때는 기본 URL만 써도 바로 배포할 수 있습니다.

- AI API: Cloud Run 기본 URL 사용
  - 예) `https://markdown-muse-ai-xxxxx.a.run.app`
- 프런트엔드: Cloud Storage 정적 호스팅 기본 URL 사용
  - 예) `https://storage.googleapis.com/YOUR_BUCKET/index.html`

### 필요한 값(최소)

1) GitHub Secrets

- `GCP_PROJECT_ID`
- `GCP_SA_KEY`
- `FIREBASE_SERVICE_ACCOUNT_URBAN_DDS`
- `GCP_AI_ALLOWED_ORIGIN`는 임시 배포 단계에서는 생략 가능(워크플로우에서 기본 `*`로 동작)

2) AI CORS

- 도메인 미보유면 우선 `AI_ALLOWED_ORIGIN=*`이 편합니다.
- 보안상 위험이 있다면 도메인이 생기면 추후 `https://storage.googleapis.com/YOUR_BUCKET` 형태로 정확히 제한하세요.

### GUI 중심 단계

1. Cloud Console에서 Artifact Registry, Secret Manager, Cloud Run, Cloud Storage 항목이 준비되었는지 확인
2. GitHub Secrets를 등록
3. GitHub에 `main` 푸시 또는 Actions 수동 실행
4. 배포 완료 후 확인:
   - `https://YOUR_CLOUD_RUN_URL/api/ai/health`가 200
   - `https://storage.googleapis.com/YOUR_BUCKET/index.html` 접속
   - `/editor`를 직접 입력하고 새로고침해도 동작

> `docs`에 있는 `cloudbuild.ai.yaml`은 Cloud Run 배포용이고, 프런트는 기존처럼 `build:web` 결과를 Cloud Storage에 올려 사용하는 방식입니다.

## Post-deploy checks

Verify all of the following:

- `GET https://YOUR_TEX_CLOUD_RUN_URL/health` returns success
- `GET https://app.YOUR_DOMAIN/api/ai/health` returns success
- `GET https://app.YOUR_DOMAIN/api/tex/health` returns success
- browser requests from the frontend origin pass CORS
- direct navigation to `/editor` works
- refresh on `/editor` works
- share-link hash routes still open correctly
- web build loads the `web` profile, not the desktop profile
- `googleOAuthPublishingStatus` and `googleWorkspaceScopeProfile` in `/api/ai/health` match the intended rollout mode

## Deployment Checklist

### Cloud Run env

Required:

- `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- `GEMINI_MODEL`
- `AI_ALLOWED_ORIGIN`
- `TEX_SERVICE_BASE_URL`
- `TEX_SERVICE_AUTH_TOKEN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_OAUTH_PUBLISHING_STATUS`
- `GOOGLE_WORKSPACE_SCOPE_PROFILE`
- `WORKSPACE_FRONTEND_ORIGIN`

Recommended:

- `GOOGLE_WORKSPACE_SCOPES`
- `WORKSPACE_STATE_PATH`

Expected shape:

- `AI_ALLOWED_ORIGIN=https://app.YOUR_DOMAIN`
- `TEX_SERVICE_BASE_URL=https://YOUR_TEX_CLOUD_RUN_URL`
- `WORKSPACE_FRONTEND_ORIGIN=https://app.YOUR_DOMAIN`
- `GOOGLE_OAUTH_REDIRECT_URI=https://app.YOUR_DOMAIN/api/auth/google/callback`
- `GOOGLE_OAUTH_PUBLISHING_STATUS=testing|production`
- `GOOGLE_WORKSPACE_SCOPE_PROFILE=restricted|reduced`
- the AI service account has `roles/run.invoker` on the TeX service

### GitHub repository secrets

Required:

- `GCP_SA_KEY`
- `GCP_PROJECT_ID`
- `GCP_FIREBASE_PROJECT_ID`
- `GCP_AI_ALLOWED_ORIGIN`
- `GCP_WORKSPACE_FRONTEND_ORIGIN`
- `GCP_GOOGLE_OAUTH_REDIRECT_URI`
- `GCP_GOOGLE_OAUTH_PUBLISHING_STATUS`
- `GCP_GOOGLE_WORKSPACE_SCOPE_PROFILE`
- `GCP_TEX_SERVICE_AUTH_TOKEN_SECRET_NAME` (optional, defaults to `tex-service-auth-token`)
- `GCP_TEX_SERVICE_BASE_URL`
- `FIREBASE_SERVICE_ACCOUNT_URBAN_DDS`

Recommended:

- `GCP_WEB_VITE_AI_API_BASE_URL` (set it explicitly to `https://app.YOUR_DOMAIN` or let the workflow default it from `GCP_WORKSPACE_FRONTEND_ORIGIN`)

Expected shape:

- `GCP_AI_ALLOWED_ORIGIN=https://app.YOUR_DOMAIN`
- `GCP_WORKSPACE_FRONTEND_ORIGIN=https://app.YOUR_DOMAIN`
- `GCP_GOOGLE_OAUTH_REDIRECT_URI=https://app.YOUR_DOMAIN/api/auth/google/callback`
- `GCP_GOOGLE_OAUTH_PUBLISHING_STATUS=testing|production`
- `GCP_GOOGLE_WORKSPACE_SCOPE_PROFILE=restricted|reduced`
- `GCP_TEX_SERVICE_BASE_URL=https://YOUR_TEX_CLOUD_RUN_URL`
- `GCP_WEB_VITE_AI_API_BASE_URL=https://app.YOUR_DOMAIN`

### Frontend build env

Required:

- `VITE_APP_PROFILE=web`
- `VITE_AI_API_BASE_URL=https://app.YOUR_DOMAIN`

## Troubleshooting

### Google Workspace API error after deploy

Symptom:

- `Google Workspace API is not reachable`
- `Unexpected token '<'`
- frontend requests appear to target `/api`

Cause:

- the frontend was built without `VITE_AI_API_BASE_URL`
- the frontend custom domain is not forwarding `/api/**` to Cloud Run
- the browser receives `index.html` instead of JSON from the AI API

Fix:

1. Confirm the Cloud Run service is healthy:
   - `GET https://app.YOUR_DOMAIN/api/ai/health`
2. Set frontend build env:
   - `VITE_APP_PROFILE=web`
   - `VITE_AI_API_BASE_URL=https://app.YOUR_DOMAIN`
3. Rebuild and redeploy the frontend
4. Keep the Firebase Hosting `/api/**` rewrite to Cloud Run active in `firebase.json`

### Google OAuth redirect mismatch

Symptom:

- Google login fails after consent
- callback errors mention redirect mismatch or missing callback parameters

Fix:

- Cloud Run env:
  - `GOOGLE_OAUTH_REDIRECT_URI=https://app.YOUR_DOMAIN/api/auth/google/callback`
  - `WORKSPACE_FRONTEND_ORIGIN=https://app.YOUR_DOMAIN`
- Google Cloud OAuth client:
  - add the exact same callback URL to `Authorized redirect URIs`

### CORS failure between frontend and AI API

Symptom:

- browser requests to Cloud Run fail only in deployed frontend

Fix:

- set `AI_ALLOWED_ORIGIN=https://app.YOUR_DOMAIN`
- use the exact frontend origin, including protocol

### Raw LaTeX document compilation is disabled for this deployment

Symptom:

- preview or PDF export fails with:
  - `Raw LaTeX document compilation is disabled for this deployment. Submit document body content instead of a full preamble/document wrapper.`

Cause:

- the deployed AI service and/or TeX service revision drifted to `TEX_ALLOW_RAW_DOCUMENT=false`
- this usually happens after a redeploy when workflow defaults or Cloud Build substitutions no longer match the intended demo policy

Fix:

- confirm both Cloud Run services have `TEX_ALLOW_RAW_DOCUMENT=true`
- keep `TEX_ALLOW_RESTRICTED_COMMANDS=false` unless you explicitly trust file/process primitives
- redeploy through the repo-managed workflows so AI and TeX receive the same TeX policy values

### LaTeX source requests package "...", which is not on the allowed package list

Symptom:

- preview or PDF export fails with:
  - `LaTeX source requests package "..." , which is not on the allowed package list for this deployment.`

Cause:

- the deployment is still running with `TEX_ALLOW_ALL_PACKAGES=false`
- or a stricter/private environment intentionally opted back into allowlist mode

Fix:

- for public/demo deployments, set `TEX_ALLOW_ALL_PACKAGES=true` on both AI and TeX services and redeploy
- for stricter/private deployments, extend `TEX_ALLOWED_PACKAGES` only if you intentionally want allowlist mode
- if the package comes from custom/raw user LaTeX outside the built-in feature set, leave it blocked unless you explicitly trust and support it

### Package is allowed, but XeLaTeX still fails to load it

Symptom:

- the package-policy error is gone, but compile logs still report that a package or style file cannot be found

Cause:

- the TeX package is allowed by policy but not installed in the container image
- the current image is broad (`texlive-latex-extra`, `texlive-publishers`, `texlive-science`, etc.) but it is still not equivalent to `texlive-full`

Fix:

- treat this as TeX image coverage, not policy enforcement
- inspect compile logs to identify the missing package
- either install the missing TeX Live collection(s) or evaluate moving to `texlive-full` if package churn remains high

### Secret preflight says a secret is required, but the secret already exists

Symptom:

- workflow logs show `Unable to access required Secret Manager secret ...`
- the secret is visible from an operator shell in the target project

Cause:

- the GitHub Actions service account behind `GCP_SA_KEY` does not have access to
  the secret metadata or latest version
- workflow preflight now checks actual secret access, not just the configured name

Fix:

- check the `Show active GCP deploy principal` step in the same workflow run and
  use that service account email for IAM binding
- grant the GitHub Actions service account `roles/secretmanager.secretAccessor`
  on the required secret
- for diagnostics checks, do the same for `ai-diagnostics-token` if you want the
  internal health verification to run

### `GET /api/ai/health` works, but browser AI assistant requests still fail

Symptom:

- `GET /api/ai/health` returns 200 JSON
- browser `POST /api/ai/agent/turn` requests still fail with 5xx

Check these first:

- Firestore is enabled and has a database in the same GCP project as the AI Cloud Run service
- the Cloud Run runtime service account can access Firestore in that project
- `AI_ALLOWED_ORIGIN`, `WORKSPACE_FRONTEND_ORIGIN`, and `GOOGLE_OAUTH_REDIRECT_URI` all match the deployed frontend origin when using Firebase Hosting `/api/**` rewrites

Recommended post-deploy smoke test:

```bash
node scripts/check-ai-runtime-smoke.mjs --origin https://app.YOUR_DOMAIN
```

That smoke test verifies:

- `GET /api/ai/health`
- `GET /api/auth/session` without cookies
- `POST /api/ai/agent/turn` with a minimal payload

## Notes

- `npm run build` is for desktop-oriented output and should not be used for the
  static GCP frontend deployment.
- `npm run build:web` is the correct production build for GCP frontend hosting.
- The web profile intentionally defers AI, knowledge, history, structured
  editing, document tools, and advanced blocks until needed.
