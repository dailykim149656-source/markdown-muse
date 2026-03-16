#!/usr/bin/env bash
set -euo pipefail

require_env() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "${value}" ]]; then
    echo "${name} is required." >&2
    exit 1
  fi
}

require_env "PROJECT_ID"
require_env "GCP_REGION"
require_env "RUN_SERVICE_ACCOUNT"

TEX_PREVIEW_BUCKET="${TEX_PREVIEW_BUCKET:-${PROJECT_ID}-docsy-tex-preview}"
TEX_TASK_QUEUE="${TEX_TASK_QUEUE:-tex-compile}"
TEX_TASK_LOCATION="${TEX_TASK_LOCATION:-${GCP_REGION}}"

echo "Ensuring TeX runtime resources:"
echo "  project: ${PROJECT_ID}"
echo "  region: ${GCP_REGION}"
echo "  preview_bucket: ${TEX_PREVIEW_BUCKET}"
echo "  task_queue: ${TEX_TASK_QUEUE}"
echo "  task_location: ${TEX_TASK_LOCATION}"
echo "  runtime_service_account: ${RUN_SERVICE_ACCOUNT}"

if ! gcloud storage buckets describe "gs://${TEX_PREVIEW_BUCKET}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${TEX_PREVIEW_BUCKET}" \
    --project "${PROJECT_ID}" \
    --location "${GCP_REGION}" \
    --uniform-bucket-level-access
fi

LIFECYCLE_FILE="$(mktemp)"
cat > "${LIFECYCLE_FILE}" <<'EOF'
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": { "age": 1 }
    }
  ]
}
EOF
gcloud storage buckets update "gs://${TEX_PREVIEW_BUCKET}" --lifecycle-file "${LIFECYCLE_FILE}" >/dev/null
rm -f "${LIFECYCLE_FILE}"

gcloud storage buckets add-iam-policy-binding "gs://${TEX_PREVIEW_BUCKET}" \
  --member="serviceAccount:${RUN_SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin" \
  >/dev/null

gcloud iam service-accounts add-iam-policy-binding "${RUN_SERVICE_ACCOUNT}" \
  --member="serviceAccount:${RUN_SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountTokenCreator" \
  >/dev/null

if ! gcloud tasks queues describe "${TEX_TASK_QUEUE}" --location "${TEX_TASK_LOCATION}" >/dev/null 2>&1; then
  gcloud tasks queues create "${TEX_TASK_QUEUE}" --location "${TEX_TASK_LOCATION}" >/dev/null
fi

gcloud tasks queues add-iam-policy-binding "${TEX_TASK_QUEUE}" \
  --location "${TEX_TASK_LOCATION}" \
  --member="serviceAccount:${RUN_SERVICE_ACCOUNT}" \
  --role="roles/cloudtasks.enqueuer" \
  >/dev/null

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "preview_bucket=${TEX_PREVIEW_BUCKET}"
    echo "task_queue=${TEX_TASK_QUEUE}"
    echo "task_location=${TEX_TASK_LOCATION}"
  } >> "${GITHUB_OUTPUT}"
fi
