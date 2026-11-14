# Medicub Server · agent brief

> Read `README.md`, root `AGENTS.md`, `docs/02`, `docs/03`, `docs/04`, `docs/05` first. You own `apps/server/**`.

## Mission

One Rust web server that serves **every API** for Sync, Team, and Management, runs `medicub-core` for all safety decisions, writes a tamper-evident audit log, sends push notifications, and exposes a judge-facing `/console`. It deploys to **Vercel**.

## Stack

| Concern | Choice |
|---|---|
| Language | Rust 2024 edition |
| Web | axum 0.8, tower, tower-http (cors, trace, limit, request-id) |
| Vercel | `vercel_runtime` with the `axum` feature (`VercelLayer`); follow Vercel's *Rust Axum* template and docs |
| DB | Neon Postgres via `sqlx` (`postgres`, `runtime-tokio-rustls`, `uuid`, `time`, `json`), migrations in `apps/server/migrations/` |
| Auth | `argon2` (Argon2id), `jsonwebtoken` (HS256 for the hackathon) |
| Push | FCM HTTP v1 via `reqwest` + a service-account OAuth token (`gcp_auth` or a small `jsonwebtoken` flow) |
| Console | server-rendered HTML with `maud` (or `askama`) + a little htmx; no SPA |
| Docs | `/v1/openapi.json` served from the contract file; `/docs` loads Swagger UI from a CDN |
| Logging | `tracing` + `tracing-subscriber` (JSON); **never log patient data** |

## Environment variables (`.env.example` committed, `.env` never)

`DATABASE_URL` (Neon **pooled**), `JWT_SECRET`, `ADMIN_TOKEN`, `FCM_SERVICE_ACCOUNT_JSON_B64`, `FCM_PROJECT_ID`, `DEMO_MODE` (`true|false`), `ALLOWED_ORIGINS`, `POLICY_RESPONSE_TARGETS` (optional JSON override).

## Vercel rules (the runtime is in public beta)

- **Day-0 spike first:** axum hello + `/v1/health` + a Neon query, deployed on Vercel. Then confirm the `medicub-core` path dependency builds. If a Cargo workspace breaks the build, use the fallbacks in `docs/02` and tell the human lead.
- Stateless: no in-memory caches that matter, no background loops. Post-response work uses the runtime's `waitUntil`-style awaiter.
- No websockets or streams. Clients poll `/v1/notifications`; Android gets FCM.
- Pool size ≤ 5; connect lazily; set statement timeouts.
- **Migrations never run at request time.** Provide `just migrate` / `cargo sqlx migrate run` and document it.
- Provide `docker-compose.yml` (Postgres) for local dev and a `just dev` that runs the server locally without Vercel.

## Code layout

```
apps/server/
  Cargo.toml
  vercel.json
  migrations/            sqlx migrations (see docs/04 for tables)
  src/
    main.rs              router + Vercel layer + local runner
    config.rs
    error.rs             Problem+JSON error type with stable codes
    auth/                otp (demo), login, jwt, extractors, role guards
    consent/             codes, redeem, grants, middleware (role + scope + expiry)
    audit/               append(), hash chain, verify()
    catalog/             drugs, search, by-code, export, loader from data/seed
    rx/                  drafts, check (calls core), decisions, sign, supersede, regimen maintenance
    flags/               persistence, inbox, decisions, escalation sweep
    dispense/            start, scan (core check_scan), request-verification, attest, complete
    inventory/           bulk sync (row_hash idempotent), availability (aggregated)
    adherence/           dose events, adherence stats
    vitals/              ingest + reliability (core), series
    checkins/
    notify/              notifications table, FCM sender, templates (title keys only)
    patients/            summary, regimen, timeline, schedule, reconciliation, context-summary, fhir-bundle
    console/             dashboard, audit verifier, scenario runner, notification tester
    seed/                demo seed + reset
  tests/                 integration tests against Postgres
```

## Non-negotiables for this app

1. **All clinical decisions call `medicub-core`.** No rule logic in handlers.
2. **Consent middleware on every patient-data route.** A single extractor checks role, active grant, scope, and expiry. Unit-test the 403 paths.
3. **Every clinical state change writes an audit entry in the same DB transaction.** Audit is append-only; `entry_hash = sha256(prev_hash ‖ canonical_json(entry))`; use an advisory lock or serialisable insert so `seq` and hash chains never fork.
4. **Sign guard:** `POST /v1/prescriptions/{id}/sign` returns `409 flags_unresolved` if any HIGH/CRITICAL preview flag lacks a prescriber decision.
5. **Flags never auto-close.** A sweep (callable endpoint, triggered by Vercel Cron or the console) only **escalates** overdue flags.
6. **Push payloads contain IDs and a title key only**, no names, drugs, or readings.
7. `DEMO_MODE=false` disables the fixed OTP, the seed reset, and the console. Test it.
8. Request body limits, rate limits on auth and consent redeem, CORS allowlist.
9. Idempotency: honour `Idempotency-Key` / `client_key` on batch POSTs.

## Console (`/console`, admin token, demo mode)

Dashboard (health, DB latency, counts, open flags by severity, last 20 audit events, auto-refresh), **Audit verifier** (button → ✅/❌ + first bad seq), **Scenario runner** (steps 1–5 from `docs/07`, "next", "reset", "skip to N"), **Notification tester**, link to `/docs`. Make it look like a clean control room (readable at projector distance).

## Seed and reset

`POST /v1/admin/seed/reset` (demo mode) truncates and loads `data/seed/*`: personas from `docs/01`, the prescribed amlodipine brand in Dr. Iyer's active Rx, the pharmacy inventory with the alternate brand only, and demo accounts (document the logins in `apps/server/README.md`). Reset must take < 5 s.

## Build order

1. Vercel + Neon spike → health endpoint deployed.
2. Migrations + seed loader + `audit` (with `verify`).
3. `auth` (login, refresh, demo OTP) + `me`.
4. `catalog` (search, by-code, export).
5. `consent` (codes, redeem, revoke) + middleware.
6. `rx` (draft, check via core, decisions, sign) + `flags` + notifications table.
7. `patients` (summary, regimen, timeline, schedule).
8. `dispense` + `inventory` + `scan` via core.
9. `adherence`, `vitals`, `checkins`, FCM sender.
10. `console`, scenario runner, reconciliation, context-summary, fhir-bundle.

## Contract duties

Implement exactly `contract/openapi.yaml`. If a client needs something missing, put a proposed diff in your handoff report; don't ship undocumented endpoints.

## Tests

Integration tests (Postgres via docker compose or `sqlx::test`): consent denial paths, sign-guard 409, audit chain verify and tamper detection, idempotent replays, the full defining scenario via API calls only.

## Done when

All endpoints for the milestone pass integration tests; `/v1/audit/verify` returns ok after the scenario; deployed to Vercel with a preview URL; `.env.example`, a run guide, and demo logins documented.
