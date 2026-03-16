# Cloud Run OOM Monitoring

These templates provision the Phase 1.5 monitoring guardrails for `docsy` and
`docsy-tex`:

- a Cloud Monitoring dashboard with per-service memory utilization
- a memory-utilization alert policy (`5m mean > 85%`)
- a log-based OOM/restart counter metric per service
- an alert policy on top of the OOM/restart log metric

## Usage

Render the files without applying:

```bash
node scripts/gcp/apply-cloud-run-monitoring.mjs \
  --project=my-gcp-project \
  --region=asia-northeast3 \
  --services=docsy,docsy-tex
```

Apply the rendered dashboard, log metrics, and alert policies with `gcloud`:

```bash
node scripts/gcp/apply-cloud-run-monitoring.mjs \
  --project=my-gcp-project \
  --region=asia-northeast3 \
  --services=docsy,docsy-tex \
  --apply
```

The script writes rendered artifacts to `output/gcp-monitoring/` before calling
`gcloud`, so the exact payloads are preserved for review.
