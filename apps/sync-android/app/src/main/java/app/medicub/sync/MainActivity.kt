package app.medicub.sync

import android.content.Intent
import android.os.Bundle
import android.speech.tts.TextToSpeech
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
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
import app.medicub.sync.wear.WearSyncManager
import java.util.Locale

// Google Material 3 Clinical Colors
private val BarBg = Color(0xFFFFFFFF)
private val BarBorder = Color(0xFFE2E8F0)
private val TextPrimary = Color(0xFF0F172A)
private val GoogleBlue = Color(0xFF1A73E8)
private val TextSecondary = Color(0xFF64748B)

class MainActivity : ComponentActivity(), TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = null
    private lateinit var wearSyncManager: WearSyncManager

    @OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tts = TextToSpeech(this, this)
        wearSyncManager = WearSyncManager(this)

        val watchDevice = wearSyncManager.getConnectedWatch()
        val watchVitals = wearSyncManager.getLatestWearableContext()

        setContent {
            var selectedScreen by remember { mutableStateOf("today") }
            var isHindi by remember { mutableStateOf(false) }
            var showDemoDialog by remember { mutableStateOf(false) }

            Scaffold(
                topBar = {
                    TopAppBar(
                        title = {
                            Column(
                                modifier = Modifier.combinedClickable(
                                    onClick = {},
                                    onLongClick = { showDemoDialog = true }
                                )
                            ) {
                                Text(
                                    text = stringResource(R.string.app_name),
                                    color = TextPrimary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 19.sp
                                )
                                Text(
                                    text = "Patient Companion · Connected to Clinic",
                                    color = TextSecondary,
                                    fontSize = 11.sp
                                )
                            }
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
                                    color = GoogleBlue,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                            }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = BarBg,
                            titleContentColor = TextPrimary
                        )
                    )
                },
                bottomBar = {
                    NavigationBar(
                        containerColor = BarBg,
                        tonalElevation = 2.dp
                    ) {
                        NavigationBarItem(
                            selected = selectedScreen == "today",
                            onClick = { selectedScreen = "today" },
                            label = { Text(stringResource(R.string.tab_today), fontWeight = FontWeight.Medium) },
                            icon = { Text("💊", fontSize = 18.sp) },
                            colors = NavigationBarItemDefaults.colors(
                                indicatorColor = Color(0xFFE8F0FE),
                                selectedIconColor = GoogleBlue,
                                selectedTextColor = GoogleBlue
                            )
                        )
                        NavigationBarItem(
                            selected = selectedScreen == "share",
                            onClick = { selectedScreen = "share" },
                            label = { Text(stringResource(R.string.tab_share), fontWeight = FontWeight.Medium) },
                            icon = { Text("📱", fontSize = 18.sp) },
                            colors = NavigationBarItemDefaults.colors(
                                indicatorColor = Color(0xFFE8F0FE),
                                selectedIconColor = GoogleBlue,
                                selectedTextColor = GoogleBlue
                            )
                        )
                        NavigationBarItem(
                            selected = selectedScreen == "bp",
                            onClick = { selectedScreen = "bp" },
                            label = { Text(stringResource(R.string.tab_bp_check), fontWeight = FontWeight.Medium) },
                            icon = { Text("❤️", fontSize = 18.sp) },
                            colors = NavigationBarItemDefaults.colors(
                                indicatorColor = Color(0xFFE8F0FE),
                                selectedIconColor = GoogleBlue,
                                selectedTextColor = GoogleBlue
                            )
                        )
                    }
                }
            ) { innerPadding ->
                Box(
                    modifier = Modifier
                        .padding(innerPadding)
                        .background(Color(0xFFF8FAFC))
                ) {
                    when (selectedScreen) {
                        "today" -> TodayScreen(
                            tts = tts,
                            onFireAlarmNow = { fireDoseAlarmNow() },
                            watchDevice = watchDevice,
                            watchVitals = watchVitals
                        )
                        "share" -> ShareScreen(
                            onTriggerBiometric = {}
                        )
                        "bp" -> BpWizardScreen()
                    }
                }

                // Demo Control Dialog (Triggered via Long-press on Title)
                if (showDemoDialog) {
                    AlertDialog(
                        onDismissRequest = { showDemoDialog = false },
                        title = { Text("⚙️ Live Demo Clock & Watch Sync") },
                        text = {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text("Trigger an exact reminder or force-sync Wear OS watch tile for judges.")
                                Button(
                                    onClick = {
                                        fireDoseAlarmNow()
                                        showDemoDialog = false
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = GoogleBlue),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("⏰ Fire Exact Dose Alarm Now")
                                }
                                OutlinedButton(
                                    onClick = {
                                        wearSyncManager.syncDoseToWatch("Amlong 5", "5mg", "08:00 AM")
                                        showDemoDialog = false
                                    },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("⌚ Push Schedule to Pixel Watch Tile")
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
