# Sync Android · Physical Device Verification Checklist

## Pre-Demo Setup
1. **Notifications Permission:** Ensure `POST_NOTIFICATIONS` is granted.
2. **Exact Alarms:** Settings → Alarms & Reminders → Allow Medicub Sync.
3. **Battery Optimization:** Ensure battery optimization is disabled / exempt so `AlarmManager.setExactAndAllowWhileIdle` fires during device idle/Doze mode.
4. **Text-to-Speech:** Install Hindi (hi-IN) voice package in Google Speech Services.

## Demo Verification Steps (Step 3 in docs/07)
1. **Language Switch:** Tap "हिंदी" in top bar; verify all labels and alert card render in Hindi.
2. **Hidden Demo Clock:** Long-press "मेडीकब सिंक" app bar; tap "Fire Exact Dose Alarm Now".
3. **Notification Actions:** Verify heads-up notification appears with **Taken / Snooze 10m / Skip** action buttons.
4. **Share QR:** Open Share tab; verify dynamic QR code with 5-minute countdown is visible for Dr. Rao / Chemist scanning.
5. **Guided BP Wizard:** Open BP Check; toggle checklist items; verify reliability score updates in real-time.
