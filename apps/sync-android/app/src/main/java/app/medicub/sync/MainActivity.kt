package app.medicub.sync

import android.content.Intent
import android.os.Bundle
import android.speech.tts.TextToSpeech
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.os.LocaleListCompat
import app.medicub.sync.alarm.DoseAlarmReceiver
import app.medicub.sync.ui.screens.BpWizardScreen
import app.medicub.sync.ui.screens.ShareScreen
import app.medicub.sync.ui.screens.TodayScreen
import java.util.Locale

class MainActivity : ComponentActivity(), TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tts = TextToSpeech(this, this)

        setContent {
            var selectedScreen by remember { mutableStateOf("today") }
            var isHindi by remember { mutableStateOf(false) }
            var showDemoDialog by remember { mutableStateOf(false) }

            Scaffold(
                topBar = {
                    TopAppBar(
                        title = {
                            Text(
                                text = stringResource(R.string.app_name),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.combinedClickable(
                                    onClick = {},
                                    onLongClick = { showDemoDialog = true }
                                )
                            )
                        },
                        actions = {
                            // Language Switcher: English <-> Hindi
                            TextButton(
                                onClick = {
                                    isHindi = !isHindi
                                    val localeTag = if (isHindi) "hi" else "en"
                                    AppCompatDelegate.setApplicationLocales(
                                        LocaleListCompat.forLanguageTags(localeTag)
                                    )
                                }
                            ) {
                                Text(
                                    text = if (isHindi) "English" else "हिंदी",
                                    color = Color(0xFF38BDF8),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E293B))
                    )
                },
                bottomBar = {
                    NavigationBar(containerColor = Color(0xFF1E293B)) {
                        NavigationBarItem(
                            selected = selectedScreen == "today",
                            onClick = { selectedScreen = "today" },
                            label = { Text(stringResource(R.string.tab_today)) },
                            icon = { Text("💊", fontSize = 18.sp) }
                        )
                        NavigationBarItem(
                            selected = selectedScreen == "share",
                            onClick = { selectedScreen = "share" },
                            label = { Text(stringResource(R.string.tab_share)) },
                            icon = { Text("📱", fontSize = 18.sp) }
                        )
                        NavigationBarItem(
                            selected = selectedScreen == "bp",
                            onClick = { selectedScreen = "bp" },
                            label = { Text(stringResource(R.string.tab_bp_check)) },
                            icon = { Text("❤️", fontSize = 18.sp) }
                        )
                    }
                }
            ) { innerPadding ->
                Box(modifier = Modifier.padding(innerPadding)) {
                    when (selectedScreen) {
                        "today" -> TodayScreen(
                            tts = tts,
                            onFireAlarmNow = { fireDoseAlarmNow() }
                        )
                        "share" -> ShareScreen(
                            onTriggerBiometric = {}
                        )
                        "bp" -> BpWizardScreen()
                    }
                }

                // Demo Control Dialog (Long-press Title)
                if (showDemoDialog) {
                    AlertDialog(
                        onDismissRequest = { showDemoDialog = false },
                        title = { Text("⚙️ Live Demo Clock & Alarms") },
                        text = {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Jump time or fire dose reminder now for judging scenario.")
                                Button(
                                    onClick = {
                                        fireDoseAlarmNow()
                                        showDemoDialog = false
                                    },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("⏰ Fire Exact Dose Alarm Now")
                                }
                            }
                        },
                        confirmButton = {
                            TextButton(onClick = { showDemoDialog = false }) {
                                Text("Close")
                            }
                        }
                    )
                }
            }
        }
    }

    private fun fireDoseAlarmNow() {
        val intent = Intent(this, DoseAlarmReceiver::class.java).apply {
            action = DoseAlarmReceiver.ACTION_DOSE_ALARM
            putExtra(DoseAlarmReceiver.EXTRA_DRUG_BRAND, "Amlong 5")
            putExtra(DoseAlarmReceiver.EXTRA_DOSE, "5mg")
        }
        sendBroadcast(intent)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale("hi", "IN")
        }
    }

    override fun onDestroy() {
        tts?.shutdown()
        super.onDestroy()
    }
}
