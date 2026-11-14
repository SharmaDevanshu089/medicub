# 06 · Git workflow

One monorepo, trunk-based, short-lived branches. `main` is **always demo-able**. History should read like a changelog.

## Setup

```bash
git init medicub && cd medicub
git branch -M main
# add .gitignore (Rust, Android/Gradle, Node, Tauri, .env, keystores, *.json service accounts)
git add . && git commit -m "chore: bootstrap monorepo skeleton"
git tag m0-skeleton
```

Remote: GitHub. Protect `main` (PRs required, CI green). Connect the repo to Vercel for **preview deployments on every PR** (server and team-web as two Vercel projects, root directories `apps/server` and `apps/team-web`).

## Branches

`<type>/<app>/<slug>`

- **type:** `feat | fix | refactor | test | docs | chore | perf`
- **app:** `server | sync | team | mgmt | core | contract | data | docs | ops`
- Examples: `feat/team/rx-composer`, `fix/sync/alarm-after-reboot`, `feat/core/duplicate-rule`, `chore/ops/ci-android`

Keep branches under ~1 day of work. Longer means split it.

## Commits (Conventional Commits)

```
<type>(<scope>): <imperative summary, ≤ 72 chars>

<why, not what; optional body>
Refs: R-DUP-001 | Contract: v0.3
```

Scope = the app tag above. Examples:

- `feat(core): detect duplicate ingredients across combination pills`
- `feat(sync): add Taken/Snooze/Skip actions to dose notifications`
- `fix(mgmt): handle Windows-1252 CSV exports`
- `feat(contract): add POST /v1/dispenses/{id}/attest`

Rules:

- One logical change per commit; always buildable.
- Commit **at least after every working step**. Your safety net is small commits.
- Never commit generated build output, secrets, or real data.
- Don't `git add -A` blindly; inspect `git status` and `git diff --staged`.

## Parallel agents: git worktrees

Each agent gets its own working directory so they never trample each other:

```bash
git worktree add ../medicub-core    -b feat/core/rules-v1
git worktree add ../medicub-server  -b feat/server/api-v1
git worktree add ../medicub-sync    -b feat/sync/today-screen
git worktree add ../medicub-team    -b feat/team/rx-composer
git worktree add ../medicub-mgmt    -b feat/mgmt/inventory-import
```

Rules:

1. An agent only edits its own paths (`AGENTS.md` §3). Path ownership is what makes merges conflict-free.
2. **Hot files**: `contract/**`, `crates/medicub-core/**`, and `data/seed/**` have a single owner. Others request changes via a handoff report.
3. Before reporting done: `git fetch && git rebase origin/main`, then rerun tests.
4. Never force-push `main`. Force-push is only for your own feature branch after a rebase (`--force-with-lease`).

## Pull requests

- Small (< ~400 changed lines excluding generated code and lockfiles).
- Title is a conventional commit. Merge method: **rebase and merge** (linear history, commits preserved).
- Template (`.github/pull_request_template.md`):

```
## What & why
## Demo-scenario step affected  (1–5, or none)
## Safety checklist
- [ ] No autonomous medical action added
- [ ] Audit entries written for clinical state changes
- [ ] Synthetic data only
## Contract
- [ ] Matches contract vX.Y   - [ ] Contract change (linked PR)
## How to verify
```

## CI (GitHub Actions, path-filtered)

| Workflow | Triggers on | Runs |
|---|---|---|
| `core.yml` | `crates/medicub-core/**`, `data/seed/**` | fmt, clippy, tests, **eval harness (prints precision/recall)** |
| `server.yml` | `apps/server/**`, `crates/**`, `contract/**` | fmt, clippy, tests (Postgres service), OpenAPI lint |
| `team.yml` | `apps/team-web/**`, `contract/**` | typecheck, lint, build |
| `mgmt.yml` | `apps/management/**`, `crates/**` | `cargo clippy`, frontend check, `tauri build --debug` smoke (if feasible) |
| `sync.yml` | `apps/sync-android/**`, `contract/**` | ktlint, unit tests, `assembleDebug` |
| `contract.yml` | `contract/**` | OpenAPI validation; diff vs. previous tag flags breaking changes |

## Tags and releases

- `m0-skeleton`, `m1-slice`, `m2-connected`, `m3-scenario`, `m4-polish`, `demo-freeze`
- `contract-v0.1`, `contract-v0.2`, …: tag contract changes so clients can pin
- Generate `CHANGELOG.md` with `git-cliff` from Conventional Commits before `demo-freeze`
- On `demo-freeze`: no feature merges, only fixes labelled `fix(...)` with human approval

## Cheat sheet

```bash
git switch -c feat/team/flag-inbox
git add -p                                  # stage deliberately
git commit -m "feat(team): rank flags by severity then recency"
git fetch && git rebase origin/main
git push -u origin feat/team/flag-inbox --force-with-lease
git log --oneline --graph --decorate -20
git bisect start / good <tag> / bad         # when the demo path breaks
```

## Secrets

`.env.example` is committed; `.env` never. Vercel env vars hold `DATABASE_URL`, `JWT_SECRET`, `FCM_SERVICE_ACCOUNT_JSON_B64`, `ADMIN_TOKEN`. Android uses `google-services.json` from a **demo Firebase project** and keeps it out of the repo (CI uses a stub). If a secret is ever committed, rotate it, since removing it from history is not enough.
