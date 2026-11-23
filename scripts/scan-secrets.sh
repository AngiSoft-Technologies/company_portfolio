#!/usr/bin/env bash
# Offline secret scan that mirrors the blocking CI gate in
# .github/workflows/netlify-deploy.yml.
#
# Requirements: an already-installed gitleaks binary (v8.30.1 in CI). No network
# access, API key, or dashboard access is used. Set GITLEAKS_BIN to an explicit
# path if gitleaks is not on PATH. GITLEAKS_REPORT_PATH overrides the report
# destination (defaults to <tmp>/gitleaks-local-report.json).
#
# The scan runs against a temporary export of tracked files plus the new,
# not-yet-committed security files, so untracked runtime secrets (backend/.env),
# .git history, and build caches do not create noise. CI checks out the same
# tracked-file view. Historical hits are deliberately out of scope here; see
# docs/security/OWASP_AUDIT.md (OBS-03) for the manual rotation check.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GITLEAKS_BIN="${GITLEAKS_BIN:-gitleaks}"
REPORT_PATH="${GITLEAKS_REPORT_PATH:-${TMPDIR:-/tmp}/gitleaks-local-report.json}"

if ! command -v "$GITLEAKS_BIN" >/dev/null 2>&1; then
    echo "gitleaks not found (looked for: $GITLEAKS_BIN). Install it locally or set GITLEAKS_BIN=/path/to/gitleaks." >&2
    exit 127
fi

SCAN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/gitleaks-src.XXXXXX")"
trap 'rm -rf "$SCAN_DIR"' EXIT

git -C "$ROOT" ls-files -z | tar -C "$ROOT" --null -T - -cf - | tar -xf - -C "$SCAN_DIR"

# New security files may still be untracked while this change is in review.
for file in .gitleaksignore scripts/scan-secrets.sh .github/workflows/netlify-deploy.yml; do
    if [ -f "$ROOT/$file" ]; then
        mkdir -p "$SCAN_DIR/$(dirname "$file")"
        cp "$ROOT/$file" "$SCAN_DIR/$file"
    fi
done

(
    cd "$SCAN_DIR"
    "$GITLEAKS_BIN" dir \
        --no-banner \
        --redact \
        --max-target-megabytes 2 \
        --report-format json \
        --report-path "$REPORT_PATH" \
        .
)

echo "gitleaks report: $REPORT_PATH"
