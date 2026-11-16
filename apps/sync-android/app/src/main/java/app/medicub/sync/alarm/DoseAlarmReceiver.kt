package app.medicub.sync.alarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import app.medicub.sync.MainActivity

class DoseAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return

        when (action) {
            ACTION_DOSE_ALARM -> {
                val drugBrand = intent.getStringExtra(EXTRA_DRUG_BRAND) ?: "Amlong 5"
                val dose = intent.getStringExtra(EXTRA_DOSE) ?: "5mg"
                showDoseNotification(context, drugBrand, dose)
            }
            ACTION_TAKEN -> {
                val drugBrand = intent.getStringExtra(EXTRA_DRUG_BRAND) ?: "Medication"
                cancelNotification(context)
                // In production: Record dose event in Room DB & sync outbox
            }
            ACTION_SNOOZE -> {
                cancelNotification(context)
                // In production: Reschedule exact alarm for +10 minutes
            }
            ACTION_SKIP -> {
                cancelNotification(context)
                // In production: Record skipped dose in Room DB
            }
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_TIME_CHANGED -> {
                // In production: Reschedule all exact dose alarms
            }
        }
    }

    private fun showDoseNotification(context: Context, brand: String, dose: String) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "dose_reminders_channel"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Dose Reminders",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Exact time medication reminders"
                enableVibration(true)
            }
            manager.createNotificationChannel(channel)
        }

        val openAppIntent = Intent(context, MainActivity::class.java)
        val openAppPendingIntent = PendingIntent.getActivity(
            context, 0, openAppIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // Action: Taken
        val takenIntent = Intent(context, DoseAlarmReceiver::class.java).apply {
            this.action = ACTION_TAKEN
            putExtra(EXTRA_DRUG_BRAND, brand)
        }
        val takenPendingIntent = PendingIntent.getBroadcast(
            context, 1, takenIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // Action: Snooze 10m
        val snoozeIntent = Intent(context, DoseAlarmReceiver::class.java).apply {
            this.action = ACTION_SNOOZE
            putExtra(EXTRA_DRUG_BRAND, brand)
        }
        val snoozePendingIntent = PendingIntent.getBroadcast(
            context, 2, snoozeIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // Action: Skip
        val skipIntent = Intent(context, DoseAlarmReceiver::class.java).apply {
            this.action = ACTION_SKIP
            putExtra(EXTRA_DRUG_BRAND, brand)
        }
        val skipPendingIntent = PendingIntent.getBroadcast(
            context, 3, skipIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Dose Due: $brand ($dose)")
            .setContentText("It is time to take your morning dose with water.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(openAppPendingIntent)
            .setAutoCancel(true)
            .addAction(android.R.drawable.checkbox_on_background, "Taken", takenPendingIntent)
            .addAction(android.R.drawable.ic_popup_sync, "Snooze 10m", snoozePendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Skip", skipPendingIntent)
            .build()

        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun cancelNotification(context: Context) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(NOTIFICATION_ID)
    }

    companion object {
        const val ACTION_DOSE_ALARM = "app.medicub.sync.ACTION_DOSE_ALARM"
        const val ACTION_TAKEN = "app.medicub.sync.ACTION_TAKEN"
        const val ACTION_SNOOZE = "app.medicub.sync.ACTION_SNOOZE"
        const val ACTION_SKIP = "app.medicub.sync.ACTION_SKIP"

        const val EXTRA_DRUG_BRAND = "extra_drug_brand"
        const val EXTRA_DOSE = "extra_dose"

        const val NOTIFICATION_ID = 1001
    }
}
