# Medicub

> One patient, one medication record: from doctor, to patient, to pharmacy, with a named human verifying every risk.

Built for the **CATALYST Hackathon (MAMC)**.
Primary track: **PS4 · One Patient, One Medication Record**.
Secondary hooks: PS3 (reading reliability, travel-aware reminders) and PS5 (closed-loop accountability, named owners).

---

## The 60-second story

A patient with diabetes and hypertension sees two specialists. The second one prescribes a combination pill whose brand name hides an ingredient (amlodipine) the patient already takes from the first. Today nobody notices until something goes wrong.

With Medicub:

1. The doctor's screen warns *before signing*: "amlodipine appears twice. Intentional?"
2. The patient's phone shows one plain-language schedule (Hindi or English) and reminds them at the right time.
3. At the chemist, the shop is out of the prescribed brand. Scanning the substitute strip makes the system **block silent substitution** and send a one-tap Approve/Reject card to the prescriber.
4. Every decision is recorded in a tamper-evident audit trail with a named professional.

**The software never prescribes, stops, or substitutes anything. It finds, explains, and routes. Humans decide.**

---

## The pieces

| Piece | Who uses it | Tech | Folder |
|---|---|---|---|
| **Medicub Sync** | Patient (and caregiver) | Android native, Kotlin + Jetpack Compose | `apps/sync-android` |
| **Medicub Team** | Doctor and clinic team | SvelteKit web app (tablet and laptop), on Vercel | `apps/team-web` |
| **Medicub Management** | Pharmacy | Tauri v2 desktop app + SvelteKit, local SQLite, CSV inventory connector | `apps/management` |
| **Medicub Server** | All three apps | One Rust (axum) server on Vercel, Neon Postgres, built-in web console | `apps/server` |
| **medicub-core** | Server and pharmacy app | Pure Rust rules engine (ingredients, duplicates, interactions, substitution, reliability) | `crates/medicub-core` |
| **Contract** | Everyone | `contract/openapi.yaml`, the single source of truth for the API | `contract/` |

```
medicub/
├── README.md                  ← you are here
├── AGENTS.md                  ← rules every AI agent must follow
├── docs/                      ← shared docs (read in order)
├── contract/openapi.yaml      ← API contract (changes only via contract PRs)
├── crates/medicub-core/       ← rules engine
├── apps/server/               ← Rust API + web console
├── apps/sync-android/         ← patient app
├── apps/team-web/             ← doctor app
├── apps/management/           ← pharmacy desktop app
└── data/seed/                 ← synthetic drugs, patients, inventory CSV, eval cases
```

## Reading order

| Step | File | For |
|---|---|---|
| 1 | `README.md` | Everyone |
| 2 | `AGENTS.md` | Every agent, before touching anything |
| 3 | `docs/01-product-and-scope.md` | What we build, P0/P1/P2 per app |
| 4 | `docs/02-architecture.md` | How the pieces connect |
| 5 | `docs/03-safety-and-rules-engine.md` | The non-negotiables and the logic |
| 6 | `docs/04-data-model.md`, `docs/05-api-contract.md` | Data and API |
| 7 | `docs/06-git-workflow.md` | How we use git |
| 8 | `docs/07-demo-script.md` | What the judges will see |
| 9 | `docs/08-agent-playbook.md` | How to run the agents (for the human lead) |
| 10 | Your app's `AGENTS.md` | App-specific build brief |

## Decisions I made where your brief was silent (change any of them)

1. **Medicub Team is a SvelteKit web app**, not a native app. It deploys to Vercel with the server, works on any clinic tablet or laptop, and needs no install.
2. **"Server GUI" = a built-in web console** at `/console` (health, live audit feed, hash-chain verifier, demo scenario runner, API docs). It is the judge-facing "control room".
3. **Database = Neon Postgres.** Vercel functions are stateless, so no SQLite on the server. The pharmacy desktop app keeps its own local SQLite.
4. **Notifications:** FCM data messages feed native Android notifications. Web and desktop clients poll (5 s in demo mode) and raise native OS notifications.
5. **Doctor "hardware auth" is scoped to passkeys (WebAuthn)** as a P1. P0 is email and password. True hardware tokens and NFC cards are stretch.
6. **ABDM is modelled, not integrated.** ABHA-style IDs, consent artefacts, and FHIR-shaped exports are mimicked with synthetic data. No real ABDM sandbox calls are required.
7. **All data is synthetic.** Say this on a slide.

## Open items only the human lead can answer

- Hackathon duration and team size (sets how much of P1 is realistic; see the cut list in `docs/08`).
- Do you have a Firebase project, a physical Android phone, and a Neon account? (Day-0 spikes need all three.)
- Will you have a clinician or pharmacist advisor to review the seed drug and interaction data? (Strongly recommended; see `docs/03`.)
