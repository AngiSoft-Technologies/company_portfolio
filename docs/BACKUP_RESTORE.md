# Backup & Restore (Neon PostgreSQL)

> **🛠 OPERATIONAL** — Backup/restore runbook and drill record.

Authoritative datastore: **Neon** project `angisoft` (`holy-band-32113416`, branch `production` = `br-raspy-morning-ahpup9i8`). Fly Postgres is NOT used. Object storage (Tigris bucket `my-company-portfolio`) is separate — see `AGENTS.md` §Tigris.

## Protection layers

| Layer | Mechanism | Window |
|---|---|---|
| PITR (point-in-time recovery) | Neon history (`history_retention_seconds = 21600`) | **6 hours** — restore branch to any LSN/timestamp within 6h via `restore_snapshot` or Neon console "Restore" |
| Scheduled snapshots | Daily automatic snapshot, 03:00 UTC, 30-day retention (`set_snapshot_schedule`) | 30 days of daily restore points |
| Manual snapshots | `create_snapshot` via Neon MCP/console/API | Until deleted or `expires_at` |

**Finding (2026-11-20):** before this date the project had *no* snapshot schedule and zero snapshots — only the 6h PITR window protected data. A daily schedule (03:00 UTC, `retention_seconds=2592000`) is now configured on `production`. Re-verify with `get_snapshot_schedule` after any project/branch change.

## Restore procedures

### A. PITR / snapshot → new branch (non-destructive, preferred)

1. Neon console → project `angisoft` → Branches → source branch → **Restore** (or MCP `restore_snapshot` with `finalize: false`).
2. This creates a *new* branch at the chosen LSN/timestamp — production is untouched.
3. Verify data on the new branch (`run_sql` row counts, spot-check critical tables: `Client`, `Booking`, `Invoice`, `Payment`, `Employee`).
4. To promote: point the app's `DATABASE_URL` at the restored branch's endpoint, or use `finalize_branch_restore` to swap it into `production` (destructive — confirm first).

### B. pg_dump logical backup (extra safety, optional)

```bash
pg_dump "$DATABASE_URL" --no-owner --no-privileges -Fc -f backup-$(date +%F).dump
# restore into a scratch branch/DB:
pg_restore -d "$SCRATCH_DATABASE_URL" --no-owner --no-privileges backup-<date>.dump
```

Run from a host that can reach Neon (sandbox egress to `*.neon.tech` may be restricted; run locally or in CI).

## Drill procedure (Phase 5.3 — verified 2026-11-20)

Performed via Neon MCP, ~10 min, zero production impact:

1. `create_snapshot` on `production` → `snap-*` id.
2. `restore_snapshot(snapshot_id, finalize: false)` → new branch `drill-restore-verify`.
3. `run_sql` on drill branch: `SELECT count(*) FROM "Client"/"Booking"/"Invoice"/"Payment"/"ClientProject"/"Employee"` → matched production exactly (clients 1, bookings 1, employees 4).
4. `delete_branch` drill branch; `delete_snapshot` drill snapshot.

**Result: PASS** — snapshot→branch restore path verified end-to-end.

Repeat quarterly or after schema migrations. Keep evidence (snapshot id, branch id, counts) in the session log.

## What is NOT covered

- **Tigris objects**: bucket is public/CDN-fronted; no versioning configured. Legacy uploads were migrated once via `backend/scripts/migrate-uploads-to-tigris.mjs`. If object versioning is required, enable it on the bucket — DB restores do not roll back files.
- **Fly volumes/logs**: ephemeral; logs via `fly logs`.
- **Secrets**: `backend/.env` is gitignored single source of truth; Fly secrets pushed via `scripts/fly-secrets.sh`. Losing `.env` means regenerating provider keys — keep an offline copy in the team password manager.

## Verification commands

```bash
# Snapshot schedule
# Neon MCP: get_snapshot_schedule(project_id=holy-band-32113416, branch_id=br-raspy-morning-ahpup9i8)
# Recent snapshots
# Neon MCP: list_snapshots(project_id=holy-band-32113416)
# PITR window
# Neon MCP: describe_project / list_projects → history_retention_seconds (21600 = 6h)
```

Migration ledger: `backend/migrations/app/*` — after any restore, confirm `_prisma_migrations` (or the Prisma 8 equivalent table) matches the deployed code before restarting the API.
