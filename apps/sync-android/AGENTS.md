# Medicub Sync (Android) · agent brief

> Read `README.md`, root `AGENTS.md`, `docs/01` (Sync section), `docs/02`, `docs/05` first. You own `apps/sync-android/**`.

## Mission

The patient's companion: **one clear medicine schedule**, reminders that fire reliably, a safe way to share records with a doctor or chemist, and plain-language alerts. Built natively to showcase real Android APIs. Primary user: Ramesh, 62, Hindi-first, low digital literacy. Secondary user: his daughter (caregiver).

## Stack

- Kotlin, Jetpack Compose + Material 3, single-activity, Navigation Compose
- MVVM + Hilt, coroutines + Flow, kotlinx.serialization, Retrofit/OkHttp
- Room (source of truth for UI) + outbox table; WorkManager for sync; DataStore (encrypted) for tokens/settings
- Package `app.medicub.sync` (note: `in` is a Kotlin keyword, so avoid `in.medicub`)
- `minSdk 28` (Health Connect SDK support), `targetSdk` = latest stable; Gradle Kotlin DSL + version catalog
- Firebase Messaging (FCM) with **data messages only**; `google-services.json` from the demo Firebase project (not committed; CI uses a stub)

## Native Android APIs to showcase (and how)

| API | Use | Gotchas |
|---|---|---|
| **Notifications** | Channels: *Dose reminders* (high), *Safety alerts* (urgent), *Updates* (default). Rich cards with **action buttons** Taken / Snooze 10 min / Skip → `BroadcastReceiver` → Room → sync. Localised en/hi. Big-text style. | Runtime `POST_NOTIFICATIONS` (API 33+); actions must work with the app closed |
| **Exact alarms** (`AlarmManager.setExactAndAllowWhileIdle`) | Precise dose times | `SCHEDULE_EXACT_ALARM` needs user grant (API 33+/34); check `canScheduleExactAlarms()` and deep-link to settings; **reschedule on `BOOT_COMPLETED`, `TIME_SET`, `TIMEZONE_CHANGED`** (travel-aware) |
| **FCM** | Server-originated events (`RX_SIGNED`, `FLAG_RAISED`, `CONSENT_GRANTED`…) | Data messages only; app builds the notification; fetch details by ID after auth |
| **CameraX + ML Kit** | Photo of a strip or prescription: on-device text recognition + barcode scanning (EAN-13, Code 128, QR, DataMatrix) | Camera permission; show OCR result for **confirmation** before saving anything |
| **Health Connect** | Read `BloodPressureRecord`, `HeartRateRecord`, `SleepSessionRecord` as **context only**, tag `device_class = wearable_estimate` unless manual | Permissions flow; availability check; emulator needs the Health Connect app |
| **BiometricPrompt** | App lock; confirm before showing the sharing QR | Fallback to device credential |
| **Geofencing client** | Clinic check-in (P1) | Needs background location; always offer a manual **"I'm here"** button |
| **TextToSpeech** (hi-IN, en-IN) | "Read aloud" schedule | Check voice availability; handle missing Hindi voice gracefully |
| **Per-app language** (`LocaleManager`/`AppCompatDelegate`) | English ↔ Hindi switch | All strings in `strings.xml` + `values-hi` |
| **WorkManager** | Periodic + expedited outbox sync; constraint: network | Idempotency keys on every outbox item |
| **NFC HCE** (P2) | Tap-to-share consent code | QR is the P0 path |
| **BLE Blood Pressure profile** (P2) | Pair a validated cuff | Physical device only |
| **Glance widget** (P2) | Next dose | |
| **Print/Share** (P2) | Medication passport PDF via `PrintManager` | |

**Permission health screen** (Settings): one place showing notifications, exact alarms, battery optimisation, camera, Health Connect, location, each with a "fix it" button. This prevents most demo-day failures.

## Screens

1. **Onboarding/Login:** phone → OTP (demo `123456`), language, text size
2. **Today:** Morning / Noon / Night cards with pictograms; big **Taken / Skip**; "Read aloud"; next-dose countdown; alert banner when a flag is open
3. **Medicines:** each medicine with pictogram, plain "what it's for", prescriber, and since-when; no clinical jargon
4. **Records:** timeline (Rx, changes, flags, vitals, dispenses)
5. **Share:** biometric → dynamic QR with 5-minute countdown; scope picker (*Doctor* / *Chemist*); active consents list with **Revoke**
6. **Alerts:** plain-language flag cards with live status ("Doctor is reviewing"); never tells the patient to stop a medicine; always "ask your doctor or pharmacist before the next dose"
7. **Add medicine** (P1): scan strip/prescription → confirm → sent for professional verification, not auto-added to the regimen
8. **Check BP** (P1): wizard (rest 5 min, seated, arm at heart level, no caffeine, cuff placed) → enter reading → reliability score → re-measure prompt if low
9. **Pharmacy finder** (P1): in-stock yes/no near me
10. **Caregiver mode** (P1): linked account sees adherence and gets missed-dose alerts
11. **Settings:** language, text size, high contrast, permission health

## Architecture rules

- **Offline-first:** UI reads Room only. Network results update Room. Writes go to Room + `outbox`; WorkManager flushes with `Idempotency-Key`/`client_key`.
- **`Clock` abstraction** everywhere time is read. A hidden **demo panel** (long-press the app title) can jump time, fire a dose reminder now, simulate a push, and toggle airplane-mode hints. This is essential for the live demo.
- Schedules: server provides the regimen; the app expands times locally (mirror `medicub-core` `expand_schedule` rules: `OD/BD/TDS/QID/HS`, timing slots). **Never alter a dose** because of a time-zone change; show local time and keep the dose as prescribed.
- No patient data in logs. `allowBackup=false`. Tokens in encrypted DataStore.
- The app never tells the patient to start, stop, or change a medicine; it only reminds, records, explains, and routes to a professional.

## Accessibility (graded implicitly by the doctors)

Minimum 48 dp touch targets; text scales to 200%; icons + text, never colour alone; TalkBack labels on every control; high-contrast theme; short sentences; Hindi copy reviewed by a native speaker.

## Build order

1. Project skeleton, Hilt, Room, theme, language switch, `Clock`; **FCM + notification-action spike on a physical device**.
2. Login + token storage + API client from the contract.
3. Today screen + schedule expansion + exact alarms + boot/timezone rescheduling + notification actions + dose events outbox.
4. Medicines, Records, Alerts (from API).
5. Share (QR, biometric, consents, revoke) + `CONSENT_GRANTED` notification.
6. Offline sync polish; demo panel.
7. P1: photo capture, BP wizard + Health Connect, read-aloud, caregiver, geofence, pharmacy finder.
8. Accessibility pass with TalkBack; permission health screen.

## Tests

JUnit for schedule expansion (incl. DST/time-zone change), outbox idempotency, notification action receivers; Compose UI tests for Today and Share; manual device checklist in `apps/sync-android/DEVICE_CHECKLIST.md` (reboot alarm, Doze, airplane mode, language switch).

## Done when

The demo steps involving the patient (steps 1, 3, 4, 5 in `docs/07`) work on a physical phone, offline reminders fire after reboot, the permission health screen shows all green, and `./gradlew ktlintCheck assembleDebug test` passes.
