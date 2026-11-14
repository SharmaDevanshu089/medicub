# 03 · Safety guardrails and the rules engine

> The engine is **deterministic, explainable, and boring on purpose.** Judges are doctors. "Why was this flagged?" must always have a one-screen answer.

## 1. Invariants (restated from `AGENTS.md`)

1. No autonomous prescribing, stopping, substituting, or dose change.
2. Flags close only by a named professional's recorded decision.
3. Decisions come from `medicub-core` rules, never from an LLM.
4. Wearable estimates are context only.
5. Potential error and intentional combination are distinguished by asking the prescriber.
6. Every clinical state change is audited.

## 2. Pipeline

```
input (Rx items + current regimen + [scanned product])
  → normalise     brand → [(ingredient, strength)], form, class
  → expand        combination pills become ingredient lists
  → compare       run rule set over (new items × existing items) and within-Rx
  → classify      attach type + severity + evidence
  → rank          severity desc, then confidence, then recency
  → explain       template lookup (en/hi) + evidence list
  → output        Vec<Flag> (pure data, no side effects)
```

Side effects (storing flags, notifying, auditing) live in the **server**, not in core.

## 3. Flag types and rules

| Rule ID | Flag type | Triggers when | Default severity |
|---|---|---|---|
| `R-DUP-001` | Duplicate ingredient | Same active ingredient appears in two different active items (different brand, prescriber, or inside a combination) | HIGH (CRITICAL if summed dose exceeds reference max) |
| `R-DUP-002` | Duplicate within one Rx | Same ingredient twice in one prescription | HIGH |
| `R-THER-001` | Therapeutic duplication | Two items from the same therapeutic class where co-use is generally avoided (e.g., two ARBs) | MODERATE → HIGH by class table |
| `R-INT-xxx` | Interaction | Ingredient pair found in the curated interaction table | per table (LOW…CRITICAL) |
| `R-DOSE-001` | Daily-dose overlap | Sum of daily dose across items sharing an ingredient > reference max | HIGH/CRITICAL |
| `R-SUB-001` | Substitution mismatch | Scanned product's ingredient set, strengths, or form ≠ prescribed | HIGH (blocks item) |
| `R-SUB-002` | Unknown product | Scanned code not in catalog | HIGH (blocks item) |
| `R-REC-001` | Reconciliation gap | Patient logs taking a drug that has no active Rx, or an Rx item was stopped but doses continue | MODERATE |
| `R-VIT-001` | Unreliable reading | BP reading reliability score < threshold | INFO (triggers guided re-measure, not an alert) |

Frequency → doses per day (for `R-DOSE-001`): `OD=1, BD=2, TDS=3, QID=4, HS=1`; `SOS` excluded from sums and noted.

**Intentional-combination whitelist (P1):** a curated list of ingredient pairs or classes with guideline-supported co-use (e.g., many fixed-dose combinations). A whitelisted pair is demoted to INFO and still shown. It is never hidden.

## 4. Severity, routing, response targets

| Severity | Meaning | Routed to | Default response target* |
|---|---|---|---|
| CRITICAL | Potential serious harm if taken as written | Prescriber + clinic lead; patient told to *contact the doctor before the next dose of the affected medicine* | 1 hour |
| HIGH | Likely error or significant risk | Prescriber (and dispensing pharmacist if at dispense) | 4 hours |
| MODERATE | Needs review | Prescriber's team | 24 hours |
| LOW | Awareness | Next visit | next visit |
| INFO | Context only | Shown, no action | none |

\*Configurable in server settings. Missed targets **escalate** to a second clinician (PS5 accountability) and never auto-close.

Patient-facing copy never says "stop taking X". It says to **ask the doctor or pharmacist before the next dose**, and does not tell the patient which medicine to skip.

## 5. Flag lifecycle

```
OPEN ─► ACKNOWLEDGED ─► RESOLVED_INTENTIONAL   (reason required; named professional)
  │            │       ─► RESOLVED_CHANGE      (links to superseding Rx or dispense change)
  │            │       ─► DISMISSED_FALSE_POSITIVE (reason required; feeds rule-quality metrics)
  └────► ESCALATED (response target missed; assigned to second clinician)
```

- Re-evaluate on every regimen change. A resolved flag **reopens** if its evidence changes (e.g., the dose is later increased).
- Each transition: who, role, when, reason, evidence snapshot → audit entry.
- "Dismiss" counts are exposed per rule so we can show judges rule quality, not just rule count.

## 6. Substitution policy (conservative default)

| Scan result | Condition | Outcome |
|---|---|---|
| `EquivalentCandidate` | Same ingredient set, same strengths, same form, no new flags | Pharmacist **attests**; recorded. No doctor round-trip. |
| `Mismatch` | Any ingredient, strength, or form differs | **Blocked**; Approve/Reject card to prescriber |
| `Unknown` | Product not in catalog | **Blocked**; pharmacist identifies manually; routed to prescriber |
| Any new `R-DUP`/`R-INT` flag with current regimen | — | **Blocked**; routed to prescriber |

`// CLINICIAN-REVIEW`: whether a pharmacist may substitute an equivalent without the prescriber varies by practice and regulation. The default here is conservative, and the policy is a server setting a clinical advisor must confirm.

## 7. BP reading reliability (PS3 hook; P1)

Deterministic score 0–100 from a short checklist. Weights are **tunable defaults**, flagged for clinician review.

| Factor | Weight |
|---|---|
| Seated, back supported, feet flat | 20 |
| Rested ≥ 5 minutes | 20 |
| Arm supported at heart level | 15 |
| No caffeine / smoking / exercise in last 30 min | 15 |
| Correct cuff size and placement confirmed | 10 |
| Validated device (`device_class = validated_cuff`) | 10 |
| Two readings ≥ 1 minute apart, consistent | 10 |

- Score ≥ 70 → reading is **alert-eligible**; otherwise the app guides a proper re-measure *first*.
- Alert thresholds are **clinician-configured per patient**. Defaults come from a cited guideline chosen with the clinical advisor. Crisis-range readings with symptoms (commonly cited ≥180/120) always show emergency guidance, with the destination's emergency number when travelling.
- `wearable_estimate` readings: stored, charted as context, **never** alert-eligible.

## 8. Explanation templates

Templates live in `crates/medicub-core/src/explain/` as keyed strings with placeholders and are **reviewed by a clinician and a native Hindi speaker**. They are never generated live.

Example (`R-DUP-001`):

- **Clinician (en):** "Amlodipine 5 mg appears in 2 active items: *Amlong 5* (Dr Iyer, 02 Nov) and *Telma-AM 40/5* (Dr Rao, today). Combined daily amlodipine: 10 mg. Is dual therapy intentional?"
- **Patient (en):** "Two of your medicines contain the same ingredient (amlodipine). Please ask your doctor or pharmacist before your next dose. Don't stop any medicine on your own."
- **Patient (hi):** "आपकी दो दवाइयों में एक ही तत्व (एम्लोडिपिन) है। अगली खुराक से पहले अपने डॉक्टर या फार्मासिस्ट से पूछें। अपने आप कोई दवा बंद न करें।"

Every flag carries an `evidence` JSON (items, ingredients, strengths, sources, rule ID, rule version) so the UI can render "why".

## 9. Data and its honesty

- `data/seed/ingredients.csv`, `drugs.csv`, `interactions.csv`, `classes.csv`: a **small curated subset** for the demo (~60–120 Indian brands relevant to hypertension, diabetes, lipids, pain/cold OTCs).
- Every interaction row has `source` (e.g., label, guideline, public interaction database) and `reviewed_by` fields. Rows without clinician review are marked `reviewed=false` and excluded from the demo path.
- Brand → ingredient/strength facts must be verified against the product label before they go in. Agents must **not** fill gaps from memory.
- Be upfront with judges: "curated subset for demo; production would integrate a licensed drug database."

## 10. Evaluation harness (our proof of accuracy)

- `data/seed/eval_cases.json`: ~60–100 synthetic scenarios with **expected flags** (true duplicates, hidden-in-combination duplicates, benign look-alikes, intentional combinations, substitution mismatches, unknowns).
- `cargo test -p medicub-core --test eval -- --nocapture` prints **precision, recall, and false-positive rate per rule** and a confusion summary.
- Clinical advisor reviews the case file, so "ground truth" isn't just our opinion.
- Put the table on a slide. Few teams will have numbers.

## 11. Audit log

Append-only table `audit_log` with `seq`, `actor`, `role`, `action`, `entity`, `payload`, `prev_hash`, `entry_hash`. Audited actions include: login, consent create/redeem/revoke, summary read, Rx create/sign/supersede, flag raised/ack/decision/escalate, dispense start/scan/attest/block/complete, inventory sync, seed reset. UI shows the audit in human sentences ("Dr Meera Iyer marked this flag *intentional* at 14:03: 'dual therapy per plan'").
