#!/usr/bin/env bash
# Push backend/.env config to Fly.io secrets without ever printing values.
#
# Usage (from backend/):
#   ./scripts/fly-secrets.sh [--app angisoft-api]
#   ./scripts/fly-secrets.sh --app company-portfolio --only DATABASE_URL,S3_ENDPOINT
#
# Values are read from backend/.env at runtime (never embedded in this file).
# Environment variables take precedence (handy for REDIS_URL from `fly redis
# create`, or DATABASE_URL overrides):
#   REDIS_URL=redis://... ./scripts/fly-secrets.sh
#
# --only KEY1,KEY2 pushes just those keys (bypasses the skip/placeholder rules).

set -euo pipefail

APP="angisoft-api"
ONLY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --app) APP="$2"; shift 2;;
    --only) ONLY="$2"; shift 2;;
    *) echo "Unknown arg: $1" >&2; exit 1;;
  esac
done

# Resolve backend dir (script lives in backend/scripts/).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

[[ -f "$ENV_FILE" ]] || { echo "No .env at $ENV_FILE" >&2; exit 1; }

declare -A values=()

read_env() {
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%$'\r'}"
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    key="${line%%=*}"
    value="${line#*=}"
    # strip optional surrounding quotes
    [[ "$value" =~ ^\"(.*)\"$ || "$value" =~ ^\'(.*)\'$ ]] && value="${BASH_REMATCH[1]}"
    values["$key"]="$value"
  done < "$ENV_FILE"
}
read_env
declare -A only_keys=()
if [[ -n "$ONLY" ]]; then
  for k in ${ONLY//,/ }; do only_keys["$k"]=1; done
fi

SKIP_LIST=(NODE_ENV PORT FRONTEND_URL CORS_ORIGIN DATABASE_URL_UNPOOLED IAM_URL REDIS_FAMILY)

is_local_only() {
  local k="$1"
  for skip in "${SKIP_LIST[@]}"; do [[ "$k" == "$skip" ]] && return 0; done
  return 1
}

is_placeholder() {
  case "$value" in
    *'xxxxx'*|*'your_'*|*'sk_live_xxxxx'*|*'sk_test_xxxxx'*) return 0;;
  esac
  return 1
}

args=()
for key in "${!values[@]}"; do
  value="${values[$key]}"
  # environment override wins
  if [[ -n "${!key+x}" ]]; then value="${!key}"; fi

  if [[ -n "$ONLY" ]]; then
    if [[ -z "${only_keys[$key]:-}" ]]; then
      echo "skip  $key (not in --only)"
      continue
    fi
    if [[ -z "$value" ]]; then
      echo "skip  $key (empty)"
      continue
    fi
  else
    if is_local_only "$key"; then
      echo "skip  $key (local-only / in fly.toml)"
      continue
    fi
    if [[ -z "$value" ]]; then
      echo "skip  $key (empty)"
      continue
    fi
    if is_placeholder "$key"; then
      echo "skip  $key (placeholder value)"
      continue
    fi
  fi
  args+=("$key=$value")
  echo "set   $key"
done

if [[ ${#args[@]} -eq 0 ]]; then
  echo "Nothing to set." >&2
  exit 0
fi

echo "→ fly secrets set --app $APP (${#args[@]} vars)"
# shellcheck disable=SC2068
fly secrets set --app "$APP" ${args[@]}