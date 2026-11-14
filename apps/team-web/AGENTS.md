# Medicub Team (doctor web app) · agent brief

> Read `README.md`, root `AGENTS.md`, `docs/01` (Team section), `docs/03`, `docs/05` first. You own `apps/team-web/**`.

## Mission

The doctor's and clinic team's workspace. A doctor must be able to **see the whole medication picture in one screen, get warned before signing a risky prescription, and clear flags with one tap and a reason.** Judges are doctors; the UI must feel fast, calm, and trustworthy.

## Stack

- SvelteKit (Svelte 5 runes) + TypeScript strict + Tailwind
- `@sveltejs/adapter-vercel`; deploy as its own Vercel project (root `apps/team-web`)
- API types generated from `contract/openapi.yaml` with `openapi-typescript`; thin typed fetch client (`src/lib/api`)
- Charts: a small library (uPlot or Chart.js); print CSS for the context summary
- QR scanning: native `BarcodeDetector` with `@zxing/browser` fallback; manual code entry always available
- Notifications: poll `/v1/notifications` every 5 s (pause on hidden tab), raise browser `Notification`s when permitted; Web Push is P2
- Auth: access/refresh tokens in `httpOnly` cookies via SvelteKit server hooks; role from `/v1/me`

## Screens

| Route | Purpose |
|---|---|
| `/login` | Email + password; role badge (doctor / nurse) |
| `/` Today | Arrivals queue (check-ins), open flags routed to me, quick "Scan patient" |
| `/scan` | Scan or type the patient's QR code → redeem consent → open Patient 360 |
| `/patients/[id]` **Patient 360** | Tabs: **Overview** (snapshot, open flags, adherence, latest vitals), **Regimen** (grouped by prescriber, with source Rx and dates), **Timeline**, **Vitals**, **Flags**, **Audit**, **Summary** (second-opinion one-pager) |
| `/patients/[id]/rx/new` **Composer** | Drug search (generic-first), dose/frequency/duration, live **Check panel** |
| `/flags` | Inbox: ranked by severity then recency, filter by status, SLA countdowns |
| `/flags/[id]` | Evidence, "why", decision history, decision form |
| `/patients/[id]/reconcile` | Diff since last visit: added / stopped / changed / unresolved, by whom |
| `/team` (P1) | Team members and roles |

## Must-get-right interactions

1. **Prescription composer with live check:** on every item change, call `POST /v1/prescriptions/{id}/check` (debounced) and render flags beside the draft, ranked by severity. Each flag has an expandable **Why** (rule ID, evidence list, combined daily dose, sources).
2. **Signing is blocked** (button disabled, with the reason shown) until every HIGH/CRITICAL flag has a decision. Decisions: **Intentional** (reason required), **Change planned** (reason required), **Dismiss as false positive** (reason required). Show the server's 409 `flags_unresolved` clearly if it occurs anyway.
3. **Flag decision form:** one screen, three buttons, mandatory reason (quick-pick reasons + free text), shows who is deciding (name + role) and the timestamp. After submit, the audit line appears immediately in plain sentences.
4. **Verification card from the pharmacy:** shows both products side by side (composition, strength, form, packaging image if available), the rule that fired, and the patient's other active items; **Approve / Reject** buttons that map to decisions with a reason.
5. **Decision-support banner** always visible on clinical screens: "Decision support, not a decision. You are responsible for the prescription."
6. **Roles:** nurse can scan, view, draft, acknowledge flags; cannot sign or decide. Enforce in UI **and** rely on server enforcement.
7. **Consent timer:** show "Access until 19:40", with time remaining; handle revoked/expired states gracefully (403 → explain and offer re-scan).

## Second-opinion summary (P1)

Deterministic one-pager from `GET /v1/patients/{id}/context-summary`: snapshot, regimen grouped by prescriber, changes in the last 90 days, open flags, vitals trend (reliability badges), adherence, and sources. **Every line links to its source record** (provenance). Print stylesheet fits on one A4 page. Any LLM-written narrative (P2) must sit below the deterministic content, be labelled "AI-phrased, check sources", and never influence flags.

## UX principles

- Evidence first, minimal chrome; clinicians scan, not read.
- Severity colours **plus** icons and text labels (CRITICAL / HIGH / MODERATE / LOW / INFO). Never colour alone.
- Two clicks to any patient data from the home screen; keyboard shortcuts for the composer (`/` search, `Ctrl+Enter` check).
- Tablet-friendly: 44 px targets, no hover-only affordances.
- Explicit connection status (online/offline banner). **Never lose a decision silently:** disable submit offline and say why.
- Loading states and empty states are designed, not defaults.

## Notifications

On a poll result of `FLAG_RAISED` / `DISPENSE_BLOCKED` / `PATIENT_ARRIVED`, show an in-app toast and a browser notification (if permitted); clicking deep-links to the entity. Payloads contain IDs only, so fetch details after.

## Build order

1. SvelteKit skeleton, Tailwind, Vercel deploy, typed API client, auth hooks.
2. `/login`, `/`, role-aware layout, decision-support banner.
3. `/scan` + consent redeem + Patient 360 (Overview, Regimen).
4. Composer + live check panel + sign guard.
5. Flag inbox + flag detail + decisions + audit tab.
6. Verification card view (from dispense flags) + reconciliation diff.
7. Arrivals, notifications, timeline, vitals.
8. P1: second-opinion summary + print, team roles, passkeys.
9. Accessibility and keyboard pass; empty/error states; demo polish.

## Tests

Typecheck and lint in CI; component tests for the check panel (flag ranking, blocked sign button) and the decision form (reason required); Playwright smoke for scan → compose → block → decide → sign using a mocked API (or the preview server).

## Done when

Steps 1, 2, and 5 of `docs/07` work end to end against the real server; sign-block and mandatory reasons are enforced; works on a tablet-sized viewport; `pnpm check && pnpm lint && pnpm build` passes.
