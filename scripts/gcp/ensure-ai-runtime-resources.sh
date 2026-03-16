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

VERTEX_API_SERVICE="aiplatform.googleapis.com"
VERTEX_API_ROLE="roles/aiplatform.user"
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
echo "  required_service: ${VERTEX_API_SERVICE}"
echo "  required_role: ${VERTEX_API_ROLE}"

SERVICE_STATE=""
SERVICE_STATE_OUTPUT=""
if SERVICE_STATE_OUTPUT="$(gcloud services list --enabled --project "${PROJECT_ID}" --filter="config.name:${VERTEX_API_SERVICE}" --format='value(config.name)' 2>&1)"; then
  SERVICE_STATE="$(printf '%s' "${SERVICE_STATE_OUTPUT}" | tr -d '\r')"
  if [[ "${SERVICE_STATE}" == "${VERTEX_API_SERVICE}" ]]; then
    echo "  service_state: ENABLED"
  else
    echo "  service_state: DISABLED"
    SERVICE_STATE="DISABLED"
  fi
else
  echo "Warning: unable to inspect ${VERTEX_API_SERVICE} state for ${PROJECT_ID}." >&2
  echo "${SERVICE_STATE_OUTPUT}" >&2
fi

if [[ "${SERVICE_STATE}" == "DISABLED" ]]; then
  ENABLE_OUTPUT=""
  if ! ENABLE_OUTPUT="$(gcloud services enable "${VERTEX_API_SERVICE}" --project "${PROJECT_ID}" 2>&1 >/dev/null)"; then
    echo "${VERTEX_API_SERVICE} is disabled and could not be enabled by this deploy principal." >&2
    echo "Enable ${VERTEX_API_SERVICE} once with a project admin or grant Service Usage Admin to the deploy principal." >&2
    echo "${ENABLE_OUTPUT}" >&2
    exit 1
  fi

  echo "  service_state: ENABLED"
fi

ROLE_PRESENT=""
ROLE_CHECK_OUTPUT=""
if ROLE_CHECK_OUTPUT="$(gcloud projects get-iam-policy "${PROJECT_ID}" --flatten="bindings[].members" --filter="bindings.role:${VERTEX_API_ROLE} AND bindings.members:serviceAccount:${RUN_SERVICE_ACCOUNT}" --format='value(bindings.role)' 2>&1)"; then
  ROLE_PRESENT="$(printf '%s' "${ROLE_CHECK_OUTPUT}" | tr -d '\r')"
  if [[ -n "${ROLE_PRESENT}" ]]; then
    echo "  role_binding: present"
  else
    echo "  role_binding: missing"
    BIND_OUTPUT=""
    if ! BIND_OUTPUT="$(gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
      --member="serviceAccount:${RUN_SERVICE_ACCOUNT}" \
      --role="${VERTEX_API_ROLE}" \
      2>&1 >/dev/null)"; then
      echo "Warning: ${VERTEX_API_ROLE} is not currently bound to ${RUN_SERVICE_ACCOUNT}, and this deploy principal could not grant it." >&2
      echo "Grant ${VERTEX_API_ROLE} to ${RUN_SERVICE_ACCOUNT} with a project admin if the runtime smoke check still fails." >&2
      echo "${BIND_OUTPUT}" >&2
    else
      echo "  role_binding: granted"
    fi
  fi
else
  echo "Warning: unable to inspect IAM bindings for ${RUN_SERVICE_ACCOUNT} on ${PROJECT_ID}." >&2
  echo "${ROLE_CHECK_OUTPUT}" >&2
  echo "Continuing without changing IAM. If Vertex access is missing, the runtime smoke check will still fail." >&2
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "runtime_service_account=${RUN_SERVICE_ACCOUNT}"
  } >> "${GITHUB_OUTPUT}"
fi
