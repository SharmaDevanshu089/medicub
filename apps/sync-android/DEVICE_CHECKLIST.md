# Sync Android · Physical Device & Emulator Verification Checklist

## Running with Android CLI
From the `apps/sync-android` directory:

1. **Start the Emulator:**
   ```powershell
   android emulator start Medium_Phone_API_37.0
   ```
2. **Deploy and Run the App:**
   Because `sync-android` is a standard multi-module Gradle project (with the application located in `:app`), pass `:app` or run from inside the `app/` directory:
   ```powershell
   # Option A (from apps/sync-android):
   android run :app

   # Option B (from inside apps/sync-android/app):
   cd app
   android run
   ```
3. **Or Run via Gradle Wrapper:**
   ```powershell
   .\gradlew.bat installDebug
   ```

---

## Pre-Demo Setup
1. **Notifications Permission:** Ensure `POST_NOTIFICATIONS` is granted.
2. **Exact Alarms:** Settings → Alarms & Reminders → Allow Medicub Sync.
3. **Battery Optimization:** Ensure battery optimization is disabled / exempt so `AlarmManager.setExactAndAllowWhileIdle` fires during device idle/Doze mode.
4. **Text-to-Speech:** Install Hindi (hi-IN) voice package in Google Speech Services.

---

## Demo Verification Steps (Step 3 in docs/07)
1. **Language Switch:** Tap "हिंदी" in top bar; verify all labels and alert card render in Hindi.
2. **Wear OS Companion Status:** Verify the connected watch card displays Google Pixel Watch 3 (Wear OS 5.0) context.
3. **Hidden Demo Clock:** Long-press "Medicub Sync" app bar; tap "Fire Exact Dose Alarm Now".
4. **Notification Actions:** Verify heads-up notification appears with **Taken / Snooze 10m / Skip** action buttons.
5. **Share QR:** Open Share tab; verify dynamic QR code with 5-minute countdown is visible for Dr. Rao / Chemist scanning.
6. **Guided BP Wizard:** Open BP Check; toggle checklist items; verify reliability score updates in real-time (threshold $\ge 70$ for alert eligibility).
