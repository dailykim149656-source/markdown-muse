# GCP deployment

Markdown Muse is deployed to GCP in two parts:

- frontend: static web build
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

### 3. Upload to Cloud Storage

Upload the static bundle to a bucket that will sit behind HTTPS Load Balancer +
Cloud CDN.

```bash
gcloud storage cp --recursive dist gs://YOUR_BUCKET
```

### 4. Configure static hosting

Recommended shape:

- Cloud Storage bucket for static files
- HTTPS Load Balancer in front of the bucket
- Cloud CDN enabled on the backend bucket

Important routing rule:

- unknown SPA paths such as `/editor` must rewrite to `/index.html`

Without this rewrite, direct navigation and refresh on editor routes will fail.

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

## Recommended rollout shape

1. Deploy the AI API first.
2. Confirm `GET /api/ai/health` works from the public URL.
3. Build the frontend with `VITE_AI_API_BASE_URL` pointing to that Cloud Run URL.
4. Upload frontend assets.
5. Update the load balancer rewrite rule for SPA routes.
6. Turn on CDN caching for hashed assets.

## Post-deploy checks

Verify all of the following:

- `GET https://YOUR_CLOUD_RUN_URL/api/ai/health` returns success
- browser requests from the frontend origin pass CORS
- direct navigation to `/editor` works
- refresh on `/editor` works
- share-link hash routes still open correctly
- web build loads the `web` profile, not the desktop profile

## Notes

- `npm run build` is for desktop-oriented output and should not be used for the
  static GCP frontend deployment.
- `npm run build:web` is the correct production build for GCP frontend hosting.
- The web profile intentionally defers AI, knowledge, history, structured
  editing, document tools, and advanced blocks until needed.
