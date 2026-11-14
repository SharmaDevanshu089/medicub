# 07 · Demo script (the defining scenario, live)

Target length **6–7 minutes**, plus Q&A. Everything is synthetic. Everything starts from **Reset demo** in `/console`.

## Stage setup

| Device | Shows | Logged in as |
|---|---|---|
| Android phone (mirrored on screen) | Medicub Sync | Ramesh Kumar (Hindi) |
| Laptop A | Medicub Team | Dr. Arjun Rao (+ second tab for Dr. Meera Iyer's view) |
| Laptop B | Medicub Management | Imran Sheikh (pharmacy) |
| Laptop C or tab | `/console` | admin (audit verifier, scenario runner) |

Backup: a screen recording of the full run, and a "Skip to step N" button in the console scenario runner.

## Seed state (before the demo)

- Ramesh: type 2 diabetes + hypertension. Active regimen from **Dr. Iyer (cardiology)** includes *Amlong 5* (amlodipine 5 mg, once daily). Diabetes medicines from **Dr. Rao** include a metformin brand.
- Pharmacy stock (from `inventory_demo.csv`): has a **different amlodipine 5 mg brand** but **not** the prescribed one.
- Seed data details are examples. Real brands, strengths, and composition **must be verified against product labels and signed off by the clinical advisor** before use (`docs/03` §9).

## Run of show

### 0 · Hook (30 s)
"Ramesh sees two specialists. Neither sees the other's prescription. Today, the only safety net is Ramesh's memory."

### 1 · Arrival and consent (60 s)
- Phone: geofence pop-up "You're at Dr. Rao's clinic" (or tap *I'm here*). Team shows Ramesh in the arrivals queue.
- Ramesh taps **Share**, confirms with fingerprint, and a QR appears. Dr. Rao scans. Phone notification: "Dr. Rao can view your medicines until 7:40 pm. [Revoke]".
- Team opens **Patient 360**: the full regimen from both prescribers on one screen.

### 2 · Prescribing with a live safety check (90 s)
- Dr. Rao prescribes a combination pill (*Telma-AM 40/5*, telmisartan 40 mg + amlodipine 5 mg) for blood pressure.
- Before signing, the check panel lights up: **HIGH · Duplicate ingredient: amlodipine** (*Amlong 5* by Dr. Iyer + new combination). Evidence, "why", and combined daily dose are expandable.
- Signing is **blocked** until Dr. Rao records a decision. He chooses *Change planned* and notes "consult Dr. Iyer", or *Intentional* with a reason. (Pick one path and rehearse; the console can also show the other.)
- Audit line appears in plain sentences. The flag is routed to Dr. Iyer's inbox.

### 3 · The patient's view (60 s)
- Phone: Today screen shows one schedule (Morning / Noon / Night) with pictograms. Tap **Read aloud** (Hindi).
- Plain-language alert card: "दो दवाइयों में एक ही तत्व है। अगली खुराक से पहले डॉक्टर या फार्मासिस्ट से पूछें।" with live status "Doctor is reviewing".
- Dose reminder fires with **Taken / Snooze / Skip** actions. (Use the hidden demo clock to jump time.)
- *(P1)* Wearable shows an elevated morning BP trend → app does **not** alarm; it opens the guided cuff wizard (rest, posture, cuff). Reliability score appears; a proper reading is logged.

### 4 · Pharmacy interception (90 s)
- Imran redeems Ramesh's `dispense` QR. The Rx loads. **Wi-Fi is turned off** to prove offline operation.
- Shop lacks the prescribed brand. He scans the alternate brand's strip.
- Result panel (traffic light): **Blocked.** Shows both strips side by side with composition, **plus** the duplicate-amlodipine flag. Plain-language explanation. **Send to prescriber** → card queued ("will send when online").
- Wi-Fi returns; the card sends. Phone gets `DISPENSE_BLOCKED` in plain language.

### 5 · Resolution (60 s)
- Dr. Rao / Dr. Iyer sees the **Approve / Reject** card with evidence. They approve a safe adjustment (a new signed Rx superseding the old).
- Pharmacy desktop notification: "Doctor responded". The item is now dispensable and the pharmacist attests.
- Phone schedule updates automatically. Console: **Verify audit chain → ✅**.

### 6 · Close (30 s)
Slide: eval table (precision/recall per rule), "what we do not do" (no auto-prescribing, no auto-substitution, no black box), and next steps (real ABDM, licensed drug DB, pilot with MAMC pharmacists).

## Slides to prepare (6)

1. Problem (real-world quote or statistic **only if sourced**) 2. The chain (3 apps + server) 3. Safety design (human-in-the-loop, audit) 4. Eval results 5. Interop (FHIR, ABDM-style consent, GS1, ERP CSV) 6. Roadmap.

## Judge Q&A prep

| Question | Answer shape |
|---|---|
| What if the engine is wrong? | It never acts. It flags with evidence; a named professional decides; dismissals are tracked as false-positive rate per rule. |
| Why not auto-substitute generics? | Conservative by design; the substitution policy is a setting your clinicians should own. Equivalent matches still need pharmacist attestation. |
| Is AI making clinical decisions? | No. Rules are deterministic over curated data. Language models, if used, only phrase summaries, with provenance, and never rank or suppress flags. |
| Where does the drug data come from? | Curated, clinician-reviewed subset with source per row; production would license a full database. |
| Poor connectivity? | Phone schedule and reminders work offline; pharmacy app runs the same rules engine locally and queues escalations. |
| Privacy? | Consent-gated, time-bound, revocable; no patient data in push payloads; audit of every access; synthetic data only; DPDP-aligned principles. |
| How is this different from existing health-record apps? | Medication-centric reconciliation, a prescription-time check, a closed verification loop with accountability, and a pharmacy-side interception. |
| Liability? | The system supports judgment and records who decided what and when. It does not replace it. |
| Low digital literacy? | Hindi, pictograms, read-aloud, large buttons, caregiver mode, QR instead of typing. |
| How would this scale? | Stateless server, Postgres, FHIR-shaped exports, ERP CSV adapters, offline-capable clients. |

## Rehearsal checklist

- [ ] Reset → full run < 7 min, three times in a row
- [ ] Phone: notification permission, exact-alarm permission, language, battery optimisation exempt
- [ ] Hidden demo clock works; Wi-Fi toggle rehearsed
- [ ] Console audit verifier shows ✅ at the end
- [ ] Offline fallback video on local disk
- [ ] Each team member can narrate every step
