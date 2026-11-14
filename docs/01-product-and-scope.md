# 01 · Product and scope

## Personas (use these names in demos, tests, and seed data)

| Persona | Who | Needs |
|---|---|---|
| **Ramesh Kumar**, 62 | Patient, type 2 diabetes + hypertension, Hindi-first, low digital literacy | One clear schedule, reminders he can't miss, no jargon |
| **Sunita Kumar** | Ramesh's daughter, caregiver | Know when he misses doses; add medicines for him |
| **Dr. Meera Iyer** | Cardiologist (prescriber 1) | See the full list before prescribing; trust the flags |
| **Dr. Arjun Rao** | Diabetologist (prescriber 2) | Same; not blamed for what he couldn't see |
| **Nurse Pooja** | Clinic team member | Check-ins, queue, prepare records, no prescribing rights |
| **Imran Sheikh** | Pharmacist, runs a small chemist | Fast dispensing, stock visibility, safe substitutions without phone calls and paper chasing |

## Priority legend

**P0** = must work in the live demo. **P1** = strong differentiator, build after P0 is solid. **P2** = stretch, only if time remains.

## Shared capabilities (server + core)

| Feature | Pri |
|---|---|
| Brand → ingredient + strength normalisation, including combination pills | P0 |
| Duplicate-ingredient detection across prescribers and brands | P0 |
| Therapeutic-class duplication (e.g., two ARBs; ACE inhibitor + ARB) | P0 |
| Curated interaction check, ranked by severity, with source and reasoning | P0 |
| Flag lifecycle with named-professional decisions | P0 |
| Hash-chained audit log + verifier | P0 |
| Consent codes (QR), time-bound grants, revocation | P0 |
| Reconciliation diff (added / stopped / changed / unresolved) | P0 |
| Substitution check (equivalent / mismatch / unknown) | P0 |
| Explanations in English + Hindi from reviewed templates | P1 |
| Intentional-combination whitelist (guideline-supported pairs not flagged) | P1 |
| Daily-dose overlap check against reference maximums | P1 |
| BP reading reliability score + guided re-measure | P1 |
| Deterministic "second-opinion" context summary | P1 |
| LLM-phrased narrative on top of the deterministic summary (with provenance) | P2 |

## Medicub Sync (patient, Android native)

| Feature | Pri |
|---|---|
| Login (demo OTP), profile, language switch (English/Hindi), large-text mode | P0 |
| **Today** screen: Morning / Noon / Night doses with pictograms and big Taken / Skip buttons | P0 |
| Exact-time dose reminders as native notifications with action buttons (Taken / Snooze / Skip) | P0 |
| Missed-dose logging and "what I actually took" record | P0 |
| Medicines list with plain-language "what is this for" | P0 |
| Records timeline (prescriptions, changes, flags, vitals) | P0 |
| **Share with doctor / chemist**: dynamic time-bound QR consent, active consents list, revoke | P0 |
| Alert cards in plain language ("Your doctor is checking two medicines") with live status | P0 |
| Offline-first (Room cache + outbox + WorkManager sync) | P0 |
| Add medicine by **photo** of strip or prescription (CameraX + ML Kit OCR/barcode) | P1 |
| Guided cuff-reading wizard (rest, posture, cuff placement) → reliability score → re-measure prompt | P1 |
| Health Connect read (BP, heart rate, sleep) as *context only* | P1 |
| Read-aloud schedule in Hindi (TextToSpeech) | P1 |
| Caregiver mode (linked account gets missed-dose alerts) | P1 |
| Biometric lock; biometric confirm before sharing | P1 |
| Geofence clinic check-in with manual "I'm here" fallback | P1 |
| Travel-aware reminders (time zone change → show local time, never alter dose) | P1 |
| Pharmacy finder: which nearby shop has my medicine in stock | P1 |
| NFC card tap via HCE (QR is the fallback) | P2 |
| BLE cuff pairing (Blood Pressure GATT profile) | P2 |
| Glance home-screen widget: next dose | P2 |
| Print / share "medication passport" PDF | P2 |

## Medicub Team (doctor + team, web)

| Feature | Pri |
|---|---|
| Login (email + password; role: doctor / nurse) | P0 |
| Scan patient's QR → consent grant → Patient 360 view | P0 |
| Patient 360: unified regimen grouped by prescriber, timeline, open flags, vitals | P0 |
| **Prescription composer**: generic-first drug search, live rule check before signing | P0 |
| Signing blocked until HIGH/CRITICAL flags have a recorded prescriber decision | P0 |
| **Flag inbox**: ranked flags, evidence, one-tap Intentional / Change planned / Dismiss with reason | P0 |
| Audit trail view per patient and per flag | P0 |
| Reconciliation diff view ("what changed since last visit, and by whom") | P0 |
| Arrivals queue (check-in events) and browser notification on new flag | P1 |
| Second-opinion context summary: printable one-pager with provenance on every line | P1 |
| Team roles and permissions (nurse can prepare, not sign) | P1 |
| Vitals trend with reliability badge | P1 |
| Passkey (WebAuthn) login | P1 |
| Web Push notifications | P2 |
| Hindi UI | P2 |

## Medicub Management (pharmacy, Tauri desktop)

| Feature | Pri |
|---|---|
| **CSV inventory connector**: import wizard with column mapping, validation report, idempotent re-import | P0 |
| Stock + expiry ledger; low-stock and near-expiry views | P0 |
| Redeem patient QR / prescription code → see prescription (consent-scoped) | P0 |
| **Dispense flow**: per-item scan or manual entry → substitution check → traffic-light result | P0 |
| Block on mismatch / duplicate / unknown, then send **Approve/Reject card** to prescriber | P0 |
| Pharmacist attestation on equivalent matches (recorded) | P0 |
| Works offline with cached catalog + queued sync (core crate runs locally) | P0 |
| Desktop notification when the doctor responds | P1 |
| Watch-folder auto-import (ERP exports a CSV; we pick it up) | P1 |
| GS1 DataMatrix / GTIN parsing (batch + expiry from the strip) | P1 |
| "Publish availability" to patients (in-stock yes/no only; no quantities, no prices) | P1 |
| Reference images and composition side-by-side for visual verification | P1 |
| Batch recall alert | P2 |
| Sales analytics | P2 |

## Judging-criteria map (PS4) → what proves it

| Criterion | Proof in the demo |
|---|---|
| Accuracy of discrepancy detection | Eval harness: seeded-error precision/recall per rule (`docs/03`) |
| Clinical safety and sound escalation | Blocked signing, blocked substitution, severity-routed flags, never auto-closing |
| Reconciliation workflow quality | Diff view + defining scenario |
| Patient / caregiver usability | Hindi, pictograms, reminders, caregiver mode |
| Feasibility and interoperability | FHIR-shaped export, ABDM-style consent, CSV ERP connector, GS1 parsing |
| Innovation | Verification loop with hash-chained audit, offline substitution check at the chemist, console scenario runner |

## Non-goals

No diagnosis, dose recommendations, or auto-substitution. No payments, e-commerce, or delivery. No real ABDM, payer, or pharmacy-ERP integration (adapters only). No real patient data.
