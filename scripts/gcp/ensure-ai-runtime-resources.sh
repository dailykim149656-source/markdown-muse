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

RUN_SERVICE_ACCOUNT="${RUN_SERVICE_ACCOUNT:-}"
if [[ -z "${RUN_SERVICE_ACCOUNT}" ]]; then
  PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
  if [[ -z "${PROJECT_NUMBER}" ]]; then
    echo "Unable to resolve project number for ${PROJECT_ID}." >&2
    exit 1
  fi

  RUN_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi

echo "Ensuring AI runtime resources:"
echo "  project: ${PROJECT_ID}"
echo "  runtime_service_account: ${RUN_SERVICE_ACCOUNT}"
echo "  required_service: aiplatform.googleapis.com"
echo "  required_role: roles/aiplatform.user"

gcloud services enable aiplatform.googleapis.com --project "${PROJECT_ID}" >/dev/null

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUN_SERVICE_ACCOUNT}" \
  --role="roles/aiplatform.user" \
  >/dev/null

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "runtime_service_account=${RUN_SERVICE_ACCOUNT}"
  } >> "${GITHUB_OUTPUT}"
fi
