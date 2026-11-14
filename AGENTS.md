# AGENTS.md: rules for every AI agent on Medicub

You are one of several agents building Medicub in parallel. The human lead coordinates you. Read this fully before writing code.

## 0. Mission

Build a Doctor → Patient → Pharmacy medication-safety chain for a hackathon judged by **doctors**. They reward patient safety, audit trails, plain-language UX, and clear human-in-the-loop design. They distrust black-box AI.

## 1. Read order

`README.md` → this file → `docs/03-safety-and-rules-engine.md` → `docs/05-api-contract.md` → your app's `AGENTS.md` → other docs as needed.

## 2. Safety invariants (never violate, never "work around")

1. **The system never prescribes, stops, substitutes, or changes a dose on its own.** It only detects, explains, and routes to a named human.
2. **Every flag stays open until a named professional records a decision.** No auto-close, no timeouts that dismiss.
3. **Safety decisions are deterministic**, made by `medicub-core` rules over curated data. An LLM may only phrase explanations or summaries and must never decide, rank, or suppress a flag.
4. **Wearable and smartwatch readings are context only.** Escalation uses validated-device or manual cuff readings, and only after a reliability check.
5. **Potential error ≠ intentional combination therapy.** Always ask the prescriber; never assume.
6. **Synthetic data only.** No real patient data, ever, in code, tests, screenshots, or commits.
7. **Every state change on clinical entities writes an audit entry** (see `docs/04`).
8. UI always shows that the tool is *decision support*. No wording that implies the software decided.

If a task seems to require breaking one of these, **stop and ask the human lead.**

## 3. Stay in your lane

| Area | Path | Owner agent |
|---|---|---|
| Rules engine | `crates/medicub-core/**` | core |
| API + console | `apps/server/**` | server |
| Patient app | `apps/sync-android/**` | sync |
| Doctor app | `apps/team-web/**` | team |
| Pharmacy app | `apps/management/**` | mgmt |
| API contract | `contract/**` | contract (human-approved only) |
| Seed data | `data/seed/**` | core (with human review) |
| Docs | `docs/**`, root `*.md` | human lead |

Never edit files outside your path. Need something elsewhere? Write it in your handoff report (section 8).

## 4. Contract first

- `contract/openapi.yaml` is the source of truth. Code follows the contract, never the reverse.
- Need a new or changed endpoint? **Stop.** Propose the change as a diff in your report. Only the contract agent edits it, after human approval.
- Generated or hand-written clients must match the contract field for field (names, casing, enums, nullability).

## 5. Git rules (full version in `docs/06-git-workflow.md`)

- Work only on your own branch: `<type>/<app>/<slug>`, e.g. `feat/team/rx-composer`. Never commit to `main`.
- Conventional Commits with scope: `feat(sync): schedule dose alarms with exact alarms`.
- Commit after every working step (small, buildable). Never `git add -A` blindly; review `git status` first.
- Rebase on `main` before you report done. Never force-push shared branches.
- Never commit secrets, `.env`, keystores, service-account JSON, or build output.

## 6. Code style

- **Concise, low-ceremony.** Small functions, no speculative abstractions, no boilerplate comments. Comments explain *why*, not *what*.
- Rust: edition 2024, `cargo fmt` + `cargo clippy -D warnings`, no `unwrap()`/`expect()` outside tests, errors via `thiserror`/`anyhow` as appropriate.
- Kotlin: ktlint, coroutines and Flow, no `!!`.
- TypeScript: strict mode, Svelte 5 runes, no `any`.
- Prefer the platform's native API over a library when it's simple enough.

## 7. UX and language rules

- Patient-facing text: **plain language, short sentences, English and Hindi**, large touch targets, icons plus text, never colour alone.
- Clinician-facing text: concise, evidence first, with severity, rule name, and "why" expandable.
- Never show raw error codes to end users. Show what happened and what to do next.

## 8. Definition of done (every task)

- [ ] Builds and passes lint, tests, and type checks for your app
- [ ] Matches the contract
- [ ] Audit entries written for clinical state changes (where applicable)
- [ ] Works offline or degrades gracefully (where your brief says so)
- [ ] The demo scenario step you own works end to end with seed data
- [ ] Committed in small conventional commits, rebased on `main`
- [ ] Handoff report produced (below)

**Handoff report** (paste back to the human lead):

```
App/branch:
Done:            (bullets, user-visible)
Not done / cut:
Contract change requests:  (diff or "none")
Cross-app needs:           (what another agent must provide)
How to run & verify:       (exact commands)
Known risks:
```

## 9. Stop and ask the human lead when

- A contract change, new top-level dependency, or new permission is needed
- A safety invariant seems to conflict with a requirement
- You need clinical judgment (thresholds, interactions, wording of medical advice). Don't invent; mark `// CLINICIAN-REVIEW` and use a conservative default
- Anything touches another agent's path

## 10. Never

- Invent drug data and present it as fact. Seed data is a curated subset with a `source` column, reviewed by a clinician.
- Add telemetry or call third-party AI APIs with patient-like data.
- Leave `TODO` in code on the demo path without a tracking line in your report.
