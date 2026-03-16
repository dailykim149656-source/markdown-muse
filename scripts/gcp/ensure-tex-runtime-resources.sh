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

CLOUD_TASKS_SERVICE="cloudtasks.googleapis.com"
RUN_SERVICE_ACCOUNT="${RUN_SERVICE_ACCOUNT:-}"
if [[ -z "${RUN_SERVICE_ACCOUNT}" ]]; then
  PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
  if [[ -z "${PROJECT_NUMBER}" ]]; then
    echo "Unable to resolve project number for ${PROJECT_ID}." >&2
    exit 1
  fi

  RUN_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi

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

USE_CLOUD_TASKS="true"
TASKS_SERVICE_STATE_OUTPUT=""
if TASKS_SERVICE_STATE_OUTPUT="$(gcloud services list --enabled --project "${PROJECT_ID}" --filter="config.name:${CLOUD_TASKS_SERVICE}" --format='value(config.name)' 2>&1)"; then
  if [[ "$(printf '%s' "${TASKS_SERVICE_STATE_OUTPUT}" | tr -d '\r')" == "${CLOUD_TASKS_SERVICE}" ]]; then
    echo "  cloud_tasks_api: enabled"
  else
    echo "  cloud_tasks_api: disabled"
    ENABLE_OUTPUT=""
    if ! ENABLE_OUTPUT="$(gcloud services enable "${CLOUD_TASKS_SERVICE}" --project "${PROJECT_ID}" 2>&1 >/dev/null)"; then
      echo "Warning: ${CLOUD_TASKS_SERVICE} is disabled and could not be enabled by this deploy principal." >&2
      echo "TeX service will fall back to local background processing." >&2
      echo "${ENABLE_OUTPUT}" >&2
      USE_CLOUD_TASKS="false"
      TEX_TASK_QUEUE=""
      TEX_TASK_LOCATION=""
    else
      echo "  cloud_tasks_api: enabled"
    fi
  fi
else
  echo "Warning: unable to inspect ${CLOUD_TASKS_SERVICE} state for ${PROJECT_ID}." >&2
  echo "${TASKS_SERVICE_STATE_OUTPUT}" >&2
  echo "TeX service will fall back to local background processing." >&2
  USE_CLOUD_TASKS="false"
  TEX_TASK_QUEUE=""
  TEX_TASK_LOCATION=""
fi

if [[ "${USE_CLOUD_TASKS}" == "true" ]]; then
  if ! gcloud tasks queues describe "${TEX_TASK_QUEUE}" --location "${TEX_TASK_LOCATION}" >/dev/null 2>&1; then
    CREATE_OUTPUT=""
    if ! CREATE_OUTPUT="$(gcloud tasks queues create "${TEX_TASK_QUEUE}" --location "${TEX_TASK_LOCATION}" 2>&1 >/dev/null)"; then
      echo "Warning: unable to create Cloud Tasks queue ${TEX_TASK_QUEUE} in ${TEX_TASK_LOCATION}." >&2
      echo "TeX service will fall back to local background processing." >&2
      echo "${CREATE_OUTPUT}" >&2
      USE_CLOUD_TASKS="false"
      TEX_TASK_QUEUE=""
      TEX_TASK_LOCATION=""
    fi
  fi
fi

if [[ "${USE_CLOUD_TASKS}" == "true" ]]; then
  BIND_OUTPUT=""
  if ! BIND_OUTPUT="$(gcloud tasks queues add-iam-policy-binding "${TEX_TASK_QUEUE}" \
    --location "${TEX_TASK_LOCATION}" \
    --member="serviceAccount:${RUN_SERVICE_ACCOUNT}" \
    --role="roles/cloudtasks.enqueuer" \
    2>&1 >/dev/null)"; then
    echo "Warning: unable to grant roles/cloudtasks.enqueuer on ${TEX_TASK_QUEUE} to ${RUN_SERVICE_ACCOUNT}." >&2
    echo "TeX service will fall back to local background processing." >&2
    echo "${BIND_OUTPUT}" >&2
    USE_CLOUD_TASKS="false"
    TEX_TASK_QUEUE=""
    TEX_TASK_LOCATION=""
  fi
fi

if [[ "${USE_CLOUD_TASKS}" != "true" ]]; then
  echo "  cloud_tasks_mode: disabled"
else
  echo "  cloud_tasks_mode: queue"
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "preview_bucket=${TEX_PREVIEW_BUCKET}"
    echo "task_queue=${TEX_TASK_QUEUE}"
    echo "task_location=${TEX_TASK_LOCATION}"
  } >> "${GITHUB_OUTPUT}"
fi
