# GCP deployment

Markdown Muse is deployed to GCP in two parts:

- frontend: static web build on Firebase Hosting
- AI API: Cloud Run service

The desktop profile is not part of the GCP deployment path. GCP should serve the
`web` profile only.

## Frontend

### 1. Prepare web env

Create a web deployment env file or inject the same values from CI/CD.

Required frontend values:

- `VITE_APP_PROFILE=web`
- `VITE_AI_API_BASE_URL=https://YOUR_CLOUD_RUN_URL`

Example:

```bash
echo VITE_APP_PROFILE=web > .env.production.local
echo VITE_AI_API_BASE_URL=https://YOUR_CLOUD_RUN_URL >> .env.production.local
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
- `AI_SERVER_PORT`

Recommended values:

- `GEMINI_MODEL=gemini-2.5-flash`
- `AI_SERVER_PORT=8080`
- `AI_ALLOWED_ORIGIN=https://YOUR_FRONTEND_DOMAIN`

`AI_ALLOWED_ORIGIN` should be the exact frontend origin, not `*`.

### 3. Deploy to Cloud Run

```bash
gcloud run deploy markdown-muse-ai \
  --image REGION-docker.pkg.dev/PROJECT/REPO/markdown-muse-ai \
  --region REGION \
  --allow-unauthenticated \
  --set-env-vars GEMINI_MODEL=gemini-2.5-flash,AI_SERVER_PORT=8080,AI_ALLOWED_ORIGIN=https://YOUR_FRONTEND_DOMAIN
```

Set `GEMINI_API_KEY` through Secret Manager or Cloud Run secrets rather than
inline CLI flags when possible.

### 4. GitHub Actions deployment (recommended)

You do not need to manually `git clone` in GCP.  
`github.com` repository is your source of truth, and CI handles the build/deploy.

Use:

- [deploy-gcp.yml](/.github/workflows/deploy-gcp.yml)

Required repository secrets:

- `GCP_SA_KEY` (service account JSON, or replace with workload identity auth)
- `GCP_PROJECT_ID`
- `GCP_AI_ALLOWED_ORIGIN` (exact frontend origin)
- `FIREBASE_SERVICE_ACCOUNT_URBAN_DDS`

The workflow does:

- Cloud Build deploy for AI API (`cloudbuild.ai.yaml`)
- health check `GET /api/ai/health`
- web profile build (`npm run build:web`) with:
  - `VITE_APP_PROFILE=web`
  - `VITE_AI_API_BASE_URL` from deployed Cloud Run URL
- deploy `dist/` to Firebase Hosting with SPA fallback to `index.html`

Recommended repository secret:

- `GCP_WEB_VITE_AI_API_BASE_URL` (explicit Cloud Run base URL for frontend builds)

## Recommended rollout shape

1. Deploy the AI API first.
2. Confirm `GET /api/ai/health` works from the public URL.
3. Build the frontend with `VITE_AI_API_BASE_URL` pointing to that Cloud Run URL.
4. Deploy the frontend to Firebase Hosting.
5. Confirm SPA rewrites for routes such as `/editor`.
6. Turn on appropriate caching for hashed assets.

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

- `GET https://YOUR_CLOUD_RUN_URL/api/ai/health` returns success
- browser requests from the frontend origin pass CORS
- direct navigation to `/editor` works
- refresh on `/editor` works
- share-link hash routes still open correctly
- web build loads the `web` profile, not the desktop profile

## Deployment Checklist

### Cloud Run env

Required:

- `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- `GEMINI_MODEL`
- `AI_ALLOWED_ORIGIN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `WORKSPACE_FRONTEND_ORIGIN`

Recommended:

- `GOOGLE_WORKSPACE_SCOPES`
- `WORKSPACE_STATE_PATH`

Expected shape:

- `AI_ALLOWED_ORIGIN=https://YOUR_FRONTEND_DOMAIN`
- `WORKSPACE_FRONTEND_ORIGIN=https://YOUR_FRONTEND_DOMAIN`
- `GOOGLE_OAUTH_REDIRECT_URI=https://YOUR_CLOUD_RUN_URL/api/auth/google/callback`

### GitHub repository secrets

Required:

- `GCP_SA_KEY`
- `GCP_PROJECT_ID`
- `GCP_AI_ALLOWED_ORIGIN`
- `FIREBASE_SERVICE_ACCOUNT_URBAN_DDS`

Recommended:

- `GCP_WEB_VITE_AI_API_BASE_URL`

Expected shape:

- `GCP_AI_ALLOWED_ORIGIN=https://YOUR_FRONTEND_DOMAIN`
- `GCP_WEB_VITE_AI_API_BASE_URL=https://YOUR_CLOUD_RUN_URL`

### Frontend build env

Required:

- `VITE_APP_PROFILE=web`
- `VITE_AI_API_BASE_URL=https://YOUR_CLOUD_RUN_URL`

## Troubleshooting

### Google Workspace API error after deploy

Symptom:

- `Google Workspace API is not reachable`
- `Unexpected token '<'`
- frontend requests appear to target `/api`

Cause:

- the frontend was built without `VITE_AI_API_BASE_URL`
- in static hosting, `/api` points to the frontend host unless you configured a real reverse proxy
- the browser receives `index.html` instead of JSON from the AI API

Fix:

1. Confirm the Cloud Run service is healthy:
   - `GET https://YOUR_CLOUD_RUN_URL/api/ai/health`
2. Set frontend build env:
   - `VITE_APP_PROFILE=web`
   - `VITE_AI_API_BASE_URL=https://YOUR_CLOUD_RUN_URL`
3. Rebuild and redeploy the frontend
4. If you intentionally use `/api`, configure an actual reverse proxy from the frontend host to Cloud Run

### Google OAuth redirect mismatch

Symptom:

- Google login fails after consent
- callback errors mention redirect mismatch or missing callback parameters

Fix:

- Cloud Run env:
  - `GOOGLE_OAUTH_REDIRECT_URI=https://YOUR_CLOUD_RUN_URL/api/auth/google/callback`
  - `WORKSPACE_FRONTEND_ORIGIN=https://YOUR_FRONTEND_DOMAIN`
- Google Cloud OAuth client:
  - add the exact same callback URL to `Authorized redirect URIs`

### CORS failure between frontend and AI API

Symptom:

- browser requests to Cloud Run fail only in deployed frontend

Fix:

- set `AI_ALLOWED_ORIGIN=https://YOUR_FRONTEND_DOMAIN`
- use the exact frontend origin, including protocol

## Notes

- `npm run build` is for desktop-oriented output and should not be used for the
  static GCP frontend deployment.
- `npm run build:web` is the correct production build for GCP frontend hosting.
- The web profile intentionally defers AI, knowledge, history, structured
  editing, document tools, and advanced blocks until needed.
