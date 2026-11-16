# Medicub: Project State & Continuous Handoff Guide (`continue.md`)

*Generated: 2026-11-16. This document serves as the complete, single-source-of-truth handoff guide for any developer or AI agent continuing work on Medicub.*

---

## 1. Project Mission & Invariants

Medicub is a Doctor → Patient → Pharmacy medication-safety chain designed for high-stakes healthcare environments and hackathons judged by **doctors**. It prioritizes patient safety, immutable audit trails, plain-language patient UX, and strict human-in-the-loop decision-support.

### Safety Invariants (Never Violate):
1. **The system never prescribes, stops, substitutes, or changes a dose autonomously.** It only detects, explains, and routes to a named human professional.
2. **Every flag stays open until a named clinician records an explicit decision.** No auto-close, no timeouts that dismiss alerts.
3. **Safety decisions are 100% deterministic**, calculated by pure Rust `medicub-core` rules over curated medical data. LLMs are never used to decide, rank, or suppress clinical flags.
4. **Smartwatch/wearable readings are clinical context only** (`device_class: wearable_estimate`). Clinical dose escalations require validated-cuff readings with reliability score ≥ 70.
5. **Potential error ≠ intentional combination therapy.** Always prompt the prescriber; never assume intent.
6. **Synthetic clinical data only.** No real patient data in code, tests, or commits.
7. **Every state change on clinical entities writes a tamper-evident SHA-256 audit entry.**

---

## 2. Live Cloud Infrastructure (Zero Localhost Required)

All backend and web applications are deployed live to **Vercel Cloud**:

| Application | Path | Tech Stack | Live Vercel URL | Claim / Admin Code |
|---|---|---|---|---|
| **Core API & Audit Chain** | `apps/server` | Node.js Express, Vercel Serverless, SHA-256 Audit | [https://express-lilac-wv8e2qs.tmp.now](https://express-lilac-wv8e2qs.tmp.now) | `89ca1487-b19d-4b88-8f7d-69f59a6715ac` |
| **Doctor Web Dashboard** | `apps/team-web` | React 19, Vite, Google M3 Clinical Theme | [https://instant-basin-h1h7egs.tmp.now](https://instant-basin-h1h7egs.tmp.now) | `9ec080f5-700c-4d1b-865d-8731cb368627` |
| **Pharmacy Web Workspace** | `apps/management` | React, Vite, Local Embedded Rust Engine | [https://turbo-ocarina-2mnfk3u.tmp.now](https://turbo-ocarina-2mnfk3u.tmp.now) | `2cfbd426-f857-461f-a6b6-26703f43f37d` |
| **Patient Mobile Companion** | `apps/sync-android` | Android Native, Jetpack Compose, Wear OS Companion | Deployed via APK (`app-debug.apk`) | Physical Phone / Emulator |

*Audit Verification Endpoint:*
👉 `https://express-lilac-wv8e2qs.tmp.now/v1/audit/verify` (Returns `{"ok": true, "checked": ...}`)

---

## 3. Architecture & Codebase Map

| Subsystem | Location | Language / Framework | Key Responsibility |
|---|---|---|---|
| **Deterministic Rules Engine** | `crates/medicub-core` | Rust 2024 (`#![forbid(unsafe_code)]`) | Evaluates DDIs, duplicate therapy, contraindications, dosage ranges with zero I/O. 10/10 test cases verified. |
| **API Server & Mission Control** | `apps/server` | Node.js, Express, Vercel Serverless | REST endpoints, SHA-256 hash-chain audit log, onboarding suite, vitals, dose events. |
| **Doctor Workspace** | `apps/team-web` | React 19, Vite, Material 3 Clinical | Practitioner onboarding, patient clinical registration, contraindication alert routing, human decision signing. |
| **Pharmacy Console** | `apps/management` | React, Vite, Tauri v2 compatible | Facility & Registered Pharmacist onboarding, GTIN 2D barcode scan verification, substitution blocking. |
| **Patient Companion App** | `apps/sync-android` | Kotlin, Jetpack Compose, Material 3 | 3-step onboarding, live Vercel cloud sync (253ms), biometric consent gate, AHA/ACC BP protocol, spring animations. |
| **API Contract** | `contract/openapi.yaml` | OpenAPI 3.1 | Single source of truth for all network interfaces. |
| **Seed & Catalog Data** | `data/seed` & `apps/server/data` | Curated CSVs | Clinician-reviewed drug brands, contraindications, and interaction catalogs. |

---

## 4. Current State of Development (What Was Completed)

### 4.1 Onboarding Suite for Every Persona
1. **Patient Onboarding (`apps/sync-android`)**:
   - Step 1: Personal & Health ID Details (Name, Age, Gender, ABHA Health ID).
   - Step 2: Chronic Health Conditions multi-select (Hypertension, T2DM, CKD, Dyslipidemia, Asthma).
   - Step 3: Current Active Medication intake (Brand, Dose, Frequency, Prescriber).
   - Seamlessly registers on the Vercel backend (`POST /v1/onboarding/patient` & `POST /v1/regimens/intake`).
2. **Doctor Onboarding (`apps/team-web`)**:
   - Practitioner registration modal capturing Medical License Number, Specialization, Department, and Medical Council ID (`POST /v1/onboarding/doctor`).
   - Patient intake modal for registering new clinical records on the fly.
3. **Pharmacy Facility Onboarding (`apps/management`)**:
   - Facility registration modal capturing Pharmacy License Number, Registered Pharmacist (R.Ph.) credentials (`POST /v1/onboarding/pharmacy`).

### 4.2 Android Patient App Redesign & Verification
- **Live Vercel Connectivity**: Android client targets `https://express-lilac-wv8e2qs.tmp.now/v1` with automatic latency measurement (`● Connected to Medicub Cloud · 253ms`) and fallback to safe offline mode.
- **Runtime Permissions**: System prompt for `POST_NOTIFICATIONS` and exact alarm scheduling permission.
- **Biometric Consent Gate**: Opening the "Share" tab enforces local biometric authentication (`BiometricPrompt` / device PIN) before generating a one-time 6-digit clinic OTP and dynamic 2D QR matrix.
- **AHA/ACC Guided BP Protocol**:
  - 5-minute pre-measurement quiet rest countdown timer.
  - 7-point clinical reliability checklist computing a 0–100 reliability score.
  - Live AHA/ACC BP categorization (Normal, Elevated, Stage 1 HTN, Stage 2 HTN, Crisis).
  - Syncs readings to `/v1/vitals` on the server.
- **Micro-Interactions**: Spring bounce animations (`Spring.DampingRatioMediumBouncy`) on dose logging, Hindi/English TTS with audio status, and Wear OS companion context card.
- **Verified on Hardware**: Compiled to `apps/sync-android/app/build/outputs/apk/debug/app-debug.apk` and verified on running Android device.

---

## 5. How to Run & Verify

### 5.1 Cloud Access (Recommended)
Open the deployed URLs directly in your browser:
- Doctor App: [https://instant-basin-h1h7egs.tmp.now](https://instant-basin-h1h7egs.tmp.now)
- Pharmacy App: [https://turbo-ocarina-2mnfk3u.tmp.now](https://turbo-ocarina-2mnfk3u.tmp.now)
- Server Audit: [https://express-lilac-wv8e2qs.tmp.now/v1/audit/verify](https://express-lilac-wv8e2qs.tmp.now/v1/audit/verify)

### 5.2 Local Alternative (Offline Mode)
```powershell
# 1. Start Server
npm --prefix apps/server run dev

# 2. Start Doctor App
npm --prefix apps/team-web run dev

# 3. Start Pharmacy App
npm --prefix apps/management run dev
```

### 5.3 Android Patient App
```powershell
# Build APK:
cd apps/sync-android
.\gradlew.bat assembleDebug

# Install on physical phone or emulator:
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Launch:
adb shell am start -n app.medicub.sync/.MainActivity
```

### 5.4 Automated Test Suites
```powershell
# Rust deterministic rules engine tests (10/10 passing):
cargo test --manifest-path crates/medicub-core/Cargo.toml

# Server integration test suite (13/13 passing):
node apps/server/test_server.js
```

---

## 6. Next Steps in the Implementation Plan

1. **End-to-End Care Chain Verification**:
   - Step A: Patient onboarded on Android App shares 6-digit OTP / QR code.
   - Step B: Doctor on Web Dashboard redeems code (`POST /v1/consents/redeem`), reviews patient's Amlong 5 history, and attempts to prescribe Telma-AM (triggering the duplicate therapy flag).
   - Step C: Doctor records human decision reason and signs prescription.
   - Step D: Pharmacist scans prescription barcode, verifies dispensed GTIN, and completes attestation.
2. **Room Database Persistence for Android**:
   - Cache medication regimens, dose history, and offline vital logs in local SQLite via Room to ensure 100% functionality without internet.
3. **Wear OS Tile Integration**:
   - Build companion Wear OS Watch Face Tile demonstrating next dose countdown and background heartbeat context sync.
4. **FHIR R4 MedicationStatement Export**:
   - Enhance `/v1/patients/:id/fhir-bundle` with full HL7 FHIR compliance for ABDM ABDM-M3 milestone standards.

---

## 7. Git & Version Control Policy

- All discrete steps must be committed using Conventional Commits: `<type>(<scope>): <summary>`.
- Remote repository: `https://github.com/SharmaDevanshu089/medicub.git`.
- Always push commits immediately after completing and verifying a unit of work.
