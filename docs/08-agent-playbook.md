# 08 · Agent playbook (for the human lead)

You command local coding agents (e.g., Claude Code) in separate terminals, one per area. This page tells you **what to run, in what order, and what to paste back to me** to coordinate.

## The agents

| Agent | Worktree / branch | Brief |
|---|---|---|
| **core** | `../medicub-core` · `feat/core/…` | `crates/medicub-core/AGENTS.md` |
| **server** | `../medicub-server` · `feat/server/…` | `apps/server/AGENTS.md` |
| **sync** | `../medicub-sync` · `feat/sync/…` | `apps/sync-android/AGENTS.md` |
| **team** | `../medicub-team` · `feat/team/…` | `apps/team-web/AGENTS.md` |
| **mgmt** | `../medicub-mgmt` · `feat/mgmt/…` | `apps/management/AGENTS.md` |
| **contract** | main checkout | Edits `contract/openapi.yaml` only on your approval |

Start every agent with the **starter prompt** (below). Never let two agents edit the same path.

## Milestones (proportions of your total time)

| Milestone | Budget | Exit criteria | Tag |
|---|---|---|---|
| **M0 Skeleton + Day-0 spikes** | ~10% | Repo, CI skeleton, contract v0.1 for auth + drugs + prescriptions + flags, Vercel "hello" deploys with Neon, FCM test push reaches the phone, Tauri app imports one CSV | `m0-skeleton` |
| **M1 Vertical slice** | ~25% | Core rules (duplicate + interaction + substitution) with eval harness; server: auth, consent, drugs, Rx check/sign, flags, audit; seed loaded | `m1-slice` |
| **M2 Apps connected** | ~25% | Team: scan→Patient 360→compose→flags. Sync: login, Today, alarms, share QR. Mgmt: inventory import, Rx lookup, dispense scan | `m2-connected` |
| **M3 Full scenario** | ~15% | Demo script steps 1–5 run end to end incl. notifications, offline pharmacy, audit verify | `m3-scenario` |
| **M4 P1 + polish** | ~15% | Photo capture, reliability wizard, Hindi, context summary, console runner, accessibility pass | `m4-polish` |
| **M5 Freeze + rehearse** | ~10% | Only fixes; 3 clean rehearsals; recorded backup video; slides | `demo-freeze` |

**Cut list** (drop in this order if time is short): P2 items → Web Push → passkeys → pharmacy finder → geofence (keep manual "I'm here") → BLE cuff → LLM narrative → Hindi on Team. **Never cut:** blocked signing, blocked substitution, flag decisions, audit chain, consent QR, offline dose reminders.

## Day-0 spikes (run in parallel; each is a 1–2 hour agent task)

1. **server:** axum "hello" + `/v1/health` + Neon query deployed on Vercel (official Rust runtime, beta). Verify the `medicub-core` path dependency builds. If not, apply the fallbacks in `docs/02`.
2. **sync:** FCM data message from a curl/console call → native notification with an action button on a physical phone. Exact alarm fires after reboot.
3. **mgmt:** Tauri v2 window, pick a CSV, parse with the `csv` crate, show rows from SQLite.
4. **team:** SvelteKit on Vercel; webcam QR scan via `BarcodeDetector` (with a zxing fallback).
5. **core:** seed a 20-drug CSV, normalise two brands, flag the amlodipine duplicate, and make the first eval case pass.

## Order of attack for the contract

1. Contract v0.1 (auth, drugs, prescriptions + check/sign, flags, audit, health). The server and Team start.
2. v0.2 (consent, patients/summary, regimen). Sync and Management start.
3. v0.3 (dispenses, inventory sync, availability, notifications, catalog export, vitals, dose events).
4. v0.4 (context summary, fhir-bundle, checkins, reconciliation).

## Starter prompts (copy, paste, fill the brackets)

**Generic header for all agents**

```
You are the [APP] agent for Medicub. Work only inside [PATHS] on branch [BRANCH]
in this git worktree. First read, in order: README.md, AGENTS.md,
docs/03-safety-and-rules-engine.md, docs/05-api-contract.md, [APP BRIEF PATH].
Follow every rule in AGENTS.md. Use Conventional Commits and commit after each
working step. Do not edit outside your paths; request contract changes in your
report. Start with milestone [Mx] tasks listed in your brief. When finished or
blocked, output the handoff report from AGENTS.md §8.
```

**core, M1:** "Implement the rules engine per `docs/03` and the module list in your brief: normalise, duplicate (R-DUP-001/002), therapeutic class (R-THER-001), interaction, substitution, reconcile, explain templates, GS1 parser, schedule expansion, then the eval harness. Seed CSVs must come from sources I give you or be left `reviewed=false`. Mark clinical decisions `// CLINICIAN-REVIEW`."

**server, M1:** "Build auth, consent middleware, drugs, prescriptions (check/sign), flags, audit (hash chain + verify), `/v1/health`, and `/console` dashboard, against contract v0.1/v0.2. Postgres migrations with sqlx. Do the Vercel spike first."

**sync, M2:** "Build onboarding/login, Today with exact-alarm reminders and notification actions, Medicines, Records, Share QR with biometric confirm, offline outbox + WorkManager sync. Use a fake `Clock` so I can jump time in demos."

**team, M2:** "Build login, QR scan → consent redeem, Patient 360, Rx composer with live check panel, signing block, flag inbox with decisions, audit view. Generate TS types from the contract."

**mgmt, M2:** "Build the CSV import wizard + SQLite ledger, Rx lookup by code/QR, dispense flow with scan → core substitution check (offline), outbox for escalations, desktop notifications."

## What to paste back to me (Claude) for coordination

- Each agent's **handoff report** (copy as is).
- Any **contract change request** diffs, so I can reconcile them across apps.
- **Failing builds or error logs** with the command that produced them.
- When two apps disagree on a field name or an enum, paste both snippets and I'll tell you which side to fix.

## Integration checks (you run these between milestones)

| After | Check |
|---|---|
| M1 | `cargo test -p medicub-core --test eval` prints per-rule precision/recall; `/v1/audit/verify` returns ok |
| M2 | Team signs an Rx that triggers a flag; the flag appears in Team's inbox and in Sync as plain language |
| M3 | Run the full demo script with a stopwatch; note every stumble in the backlog |
| M4 | TalkBack pass on Sync, keyboard-only pass on Team, screen-reader label pass on Management |
| M5 | Fresh clone → follow README → everything builds. Rotate demo secrets. |

## Risk register

| Risk | Mitigation |
|---|---|
| Vercel Rust runtime beta quirks | Day-0 spike; Docker/container fallback keeps the same axum app |
| Scope creep across four codebases | P0/P1/P2 tags, cut list, path ownership, contract-first |
| Wrong drug facts | Verified-from-label rule, `reviewed` flag, clinician advisor |
| Android permissions (exact alarms, background location, Health Connect) | Permission health screen; manual fallbacks; physical device test early |
| Demo-day connectivity | Offline-capable phone and pharmacy; local recording; console "skip to step" |
| Merge conflicts | Worktrees + path ownership + rebase before PR |
