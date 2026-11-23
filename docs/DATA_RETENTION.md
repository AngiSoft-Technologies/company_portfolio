# Data Retention & Archive Design

> **🛠 OPERATIONAL** — Design/documentation for high-write Phase 7 tables; closes the planning gap in `ANGISOFT_DIGITAL_HQ_PLAN.md` §18.4 (`For large/high-write tables ... plan monthly partitioning/retention/archival`) and §18.9 (`inbox/message/event tables grow fast; design indexes, partitioning, retention, and archive before high-volume channels go live`).

**Status: DESIGN / PLANNER ONLY.** No retention job is enabled in production, and **no deletion runs until explicit owner approval**. The current implementation (`backend/src/workers/dataRetention.ts`) is an env-gated **planning skeleton**: it classifies tables, computes cutoffs, and produces bounded archive/review batches from rows supplied by the caller. It does not import Prisma, a queue, an object-store client, or a provider service; it performs no database reads/writes, no provider calls, and no deletes. `runDataRetention` only logs the plan.

## 1. Retention classes

| Class | Meaning | Default treatment |
|---|---|---|
| `operational` | High-write, regenerable or replayable operational data | Keep a defined hot window, archive cold, no automatic delete |
| `immutable-financial` | Append-only money records | Long hot window, immutable cold archive, never auto-delete |
| `compliance-audit` | Security/permission evidence | Long hot window, tamper-evident cold archive, never auto-delete |
| `configuration` | Connection/mailbox/send-as configuration | Archive a config snapshot on review; deletion needs owner-reviewed FK handling |
| `secret-material` | Encrypted credential envelopes | Never archive or delete on a schedule; rotate/revoke via the vault only |

Proposed windows below are policy recommendations, **not active schedules**. `proposedDeleteAfterDays` is documentation of a future review point only — nothing in code reads it to perform a delete.

## 2. Per-table matrix

All ages use the `cutoffField` column shown. Hot window → archive candidate after that age; "review" means a human/owner decision is required before any removal.

| Table | Class | `cutoffField` | Hot window (proposed) | Archive candidate after | Delete policy | Rationale | Archive destination (logical) |
|---|---|---|---|---|---|---|---|
| `ProviderEvent` | `operational` | `createdAt` | 90 days | 90 days | Review after ≥365 days; **never automatic** | Raw webhook payload/headers duplicate provider state; keep a quarter for replay/dedupe forensics, then archive under the immutable `dedupeKey`. | `tigris://angisoft-retention/archive/ProviderEvent/year=<year>/month=<month>/` |
| `ConversationMessage` | `operational` | `createdAt` | 12 months | 12 months | Review after ≥3 years; **never automatic** | Highest-write inbox/chat/social table; a hot year covers active threads and SLA disputes, archive preserves business correspondence. | `tigris://angisoft-retention/archive/ConversationMessage/year=<year>/month=<month>/` |
| `LedgerEntry` | `immutable-financial` | `occurredAt` | 2 years | 2 years | Review only after statutory 7 years; **never automatic** | Append-only financial record; two years hot for reconciliation, cold immutable archive for audit/tax. | `tigris://angisoft-retention/archive/LedgerEntry/year=<year>/month=<month>/` |
| `AuditLog` | `compliance-audit` | `createdAt` | 2 years | 2 years | Review only after statutory 7 years; **never automatic** | Permission/sensitive-data access evidence must remain queryable and tamper-evident; archive cold, do not roll off on a timer. | `tigris://angisoft-retention/archive/AuditLog/year=<year>/month=<month>/` |
| `AgentRun` | `operational` | `startedAt` | 90 days | 90 days | Review after ≥1 year; **never automatic** | Reports/outputs are regenerable operational history; one quarter hot supports coaching and boardroom context. | `tigris://angisoft-retention/archive/AgentRun/year=<year>/month=<month>/` |
| `ProviderConnection` | `configuration` | `updatedAt` | Active while connected | 12 months | **No automatic delete** (FKs to secrets/events/accounts) | Connection metadata is referenced across Phase 7; archive a snapshot, require owner-reviewed disconnect/reassignment. | `tigris://angisoft-retention/archive/ProviderConnection/config-snapshots/` |
| `ProviderSecret` | `secret-material` | `createdAt` (classification only) | Active rotation lifecycle | **None** | **No automatic delete/archive** | Encrypted envelopes (`ciphertext`/`iv`/`authTag`) are never exported by a retention sweep; rotate/revoke in the vault, tombstone only with owner approval. | `none` |
| `CommunicationAccount` | `configuration` | `updatedAt` | Active while account in use | 12 months | **No automatic delete** (grants/conversations) | Mailbox/channel identity can outlive a connection; preserve grant and conversation linkage, require owner decision. | `tigris://angisoft-retention/archive/CommunicationAccount/config-snapshots/` |
| `EmailDraft` | `operational` | `updatedAt` | 90 days | 90 days | Review after ≥1 year; **never automatic** | Unsent drafts may contain sensitive content; archive with thread context rather than dropping automatically. | `tigris://angisoft-retention/archive/EmailDraft/year=<year>/month=<month>/` |
| `EmailSendAsIdentity` | `configuration` | `updatedAt` | Active while verified | 12 months | **No automatic delete** | Verified send-as grants are delegated-access evidence; archive a config snapshot only. | `tigris://angisoft-retention/archive/EmailSendAsIdentity/config-snapshots/` |

`ProviderSecret` is intentionally skipped by the planner (`archiveAfterDays: null`), so it never produces a candidate batch.

## 3. Partitioning and index strategy

- Use **monthly `RANGE` partitions** on the `cutoffField` for the four plan-named high-write tables: `ProviderEvent(createdAt)`, `ConversationMessage(createdAt)`, `LedgerEntry(occurredAt)`, `AuditLog(createdAt)`. `AgentRun(startedAt)` joins them once volume warrants it. Partition by timestamp string cast to `timestamptz`, or convert the column type in a separately approved migration; do not cast in the hot query path.
- Existing contract indexes `ProviderEvent(connectionId, createdAt)`, `ConversationMessage(conversationId, createdAt)`, `LedgerEntry(financeAccountId, occurredAt)`, and `AgentRun(agentId|agentKey, startedAt)` remain the primary access paths. Add a partition-key index only where a sweep actually filters on it; no speculative GIN indexes (plan §18.5).
- Detaching an old partition is the future archive primitive. It is **not** implemented here and must not be run without owner approval and a verified archive manifest.
- Dedupe keys (`ProviderEvent.dedupeKey`) and ledger/event references must survive archival: archive is a copy first, detach second, never the reverse.

## 4. Archive destination strategy

- Logical root: `tigris://angisoft-retention/archive/<Table>/year=<year>/month=<month>/`. Use a **dedicated private bucket** (or a private prefix with no public ACL) — the existing `my-company-portfolio` bucket is public/CDN-fronted and must not hold cold retention data.
- Write columnar/JSONL parts compressed with `gzip` (or Parquet for analytics), alongside a manifest containing table, partition range, row count, min/max `cutoffField`, content hashes, schema version, and creation timestamp. Verify object checksums and row counts before considering any source deletion.
- Object versioning/retention lock on the archive bucket is recommended; Neon snapshots/PITR (`docs/BACKUP_RESTORE.md`: daily 30-day snapshots + 6h PITR) are **restore** mechanisms, not long-term archives.
- Never archive raw `ProviderSecret` ciphertext into object storage; configuration snapshots must omit secret fields (`secretRef` references only).
- Access to archives is `SUPER_ADMIN`/audited on retrieval; archive reads are logged in `AuditLog`.

## 5. Approval and enablement flow

1. `DATA_RETENTION_ENABLED` must be exactly `true` (trimmed, case-insensitive) for the planner to do anything. Unset/false is a complete no-op.
2. `DATA_RETENTION_BATCH_LIMIT` bounds each batch (default `500`, hard maximum `5000`; invalid values fall back to `500`).
3. `runDataRetention` logs planned actions (`archive-plan`, `review-only`, `retain-indefinitely`) with bounded id samples, counts, cutoff, and archive destination. It always returns `writes: 0, deletions: 0, providerCalls: 0, executed: 0`.
4. An owner-approved implementation must be a **separate change**: explicit per-table authorization, legal-hold/DSAR check, verified archive manifest, then deletion/detach with an audit record. Until then there is no code path that deletes.
5. Tests are DB-free (`backend/test/dataRetention.spec.ts`): classification, cutoff math, limit clamping, enabled flag, and a static zero-write guarantee check.

## 6. Non-goals

- No live database queries, Prisma client creation, provider calls, or deployments from this design/planner.
- No permission/contract/migration changes and no changes to existing workers.
- No claim of statutory retention compliance: the proposed windows are a starting policy for owner/legal review.
