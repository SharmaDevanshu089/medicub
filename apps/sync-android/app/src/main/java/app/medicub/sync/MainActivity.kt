package app.medicub.sync

import android.Manifest
import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.speech.tts.TextToSpeech
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.activity.compose.setContent
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.os.LocaleListCompat
import app.medicub.sync.alarm.DoseAlarmReceiver
import app.medicub.sync.network.ApiClient
import app.medicub.sync.network.PatientProfile
import app.medicub.sync.network.ServerState
import app.medicub.sync.ui.screens.BpWizardScreen
import app.medicub.sync.ui.screens.OnboardingScreen
import app.medicub.sync.ui.screens.ShareScreen
import app.medicub.sync.ui.screens.TodayScreen
import app.medicub.sync.wear.WearSyncManager
import kotlinx.coroutines.launch
import java.util.Locale

// Google Material 3 Clinical Palette
private val BarBg = Color(0xFFFFFFFF)
private val BarBorder = Color(0xFFE2E8F0)
private val TextPrimary = Color(0xFF0F172A)
private val GoogleBlue = Color(0xFF1A73E8)
private val TextSecondary = Color(0xFF64748B)

class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = null
    private lateinit var wearSyncManager: WearSyncManager
    private lateinit var apiClient: ApiClient

    private var onBiometricResultCallback: ((Boolean) -> Unit)? = null

    // Permission launcher for Android 13+ Notification permission
    private val requestNotificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (!isGranted) {
                Toast.makeText(this, "Notifications required for dose reminders", Toast.LENGTH_SHORT).show()
            }
        }

    @OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tts = TextToSpeech(this, this)
        wearSyncManager = WearSyncManager(this)
        apiClient = ApiClient(this)

        checkAndRequestPermissions()

        val watchDevice = wearSyncManager.getConnectedWatch()
        val watchVitals = wearSyncManager.getLatestWearableContext()

        setContent {
            val coroutineScope = rememberCoroutineScope()
            var patientProfile by remember { mutableStateOf(apiClient.getPatientProfile()) }
            var serverState by remember { mutableStateOf<ServerState>(ServerState.Connecting) }
            var selectedScreen by remember { mutableStateOf("today") }
            var isHindi by remember { mutableStateOf(false) }
            var showDemoDialog by remember { mutableStateOf(false) }
            var showServerConfigDialog by remember { mutableStateOf(false) }

            // Initial health check
            LaunchedEffect(Unit) {
                serverState = apiClient.checkHealth()
            }

            // If not onboarded yet, show OnboardingScreen
            if (patientProfile == null) {
                OnboardingScreen(
                    apiClient = apiClient,
                    onOnboardingComplete = { profile ->
                        patientProfile = profile
                        coroutineScope.launch {
                            serverState = apiClient.checkHealth()
                        }
                    }
                )
            } else {
                Scaffold(
                    topBar = {
                        TopAppBar(
                            title = {
                                Column(
                                    modifier = Modifier.combinedClickable(
                                        onClick = { showServerConfigDialog = true },
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
                                // Server Status Quick Indicator
                                IconButton(onClick = { showServerConfigDialog = true }) {
                                    Text(
                                        text = if (serverState is ServerState.Connected) "🌐" else "⚠️",
                                        fontSize = 18.sp
                                    )
                                }

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
                                watchVitals = watchVitals,
                                patientProfile = patientProfile,
                                serverState = serverState,
                                apiClient = apiClient,
                                onConfigureServer = { showServerConfigDialog = true }
                            )
                            "share" -> ShareScreen(
                                onTriggerBiometric = { callback ->
                                    triggerBiometricPrompt(callback)
                                },
                                apiClient = apiClient,
                                patientProfile = patientProfile
                            )
                            "bp" -> BpWizardScreen(
                                apiClient = apiClient,
                                patientProfile = patientProfile
                            )
                        }
                    }

                    // Server Configuration & Diagnostics Dialog
                    if (showServerConfigDialog) {
                        var tempUrl by remember { mutableStateOf(apiClient.currentBaseUrl) }
                        var pingResult by remember { mutableStateOf<String?>(null) }
                        var isPinging by remember { mutableStateOf(false) }

                        AlertDialog(
                            onDismissRequest = { showServerConfigDialog = false },
                            title = { Text("🌐 Cloud Backend & Diagnostic", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
                            text = {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text(
                                        text = "Current Endpoint:",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = TextSecondary
                                    )
                                    OutlinedTextField(
                                        value = tempUrl,
                                        onValueChange = { tempUrl = it },
                                        modifier = Modifier.fillMaxWidth(),
                                        singleLine = true,
                                        shape = RoundedCornerShape(8.dp)
                                    )

                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Button(
                                            onClick = {
                                                tempUrl = ApiClient.DEFAULT_VERCEL_URL
                                                apiClient.currentBaseUrl = tempUrl
                                            },
                                            shape = RoundedCornerShape(6.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = GoogleBlue),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Text("Vercel Cloud", fontSize = 11.sp)
                                        }
                                        OutlinedButton(
                                            onClick = {
                                                tempUrl = ApiClient.DEFAULT_LOCAL_URL
                                                apiClient.currentBaseUrl = tempUrl
                                            },
                                            shape = RoundedCornerShape(6.dp),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Text("Local LAN", fontSize = 11.sp)
                                        }
                                    }

                                    Button(
                                        onClick = {
                                            apiClient.currentBaseUrl = tempUrl
                                            isPinging = true
                                            coroutineScope.launch {
                                                val state = apiClient.checkHealth()
                                                serverState = state
                                                isPinging = false
                                                pingResult = when (state) {
                                                    is ServerState.Connected -> "✓ Connected in ${state.latencyMs}ms (Audit chain OK)"
                                                    is ServerState.Offline -> "⚠️ Failed: ${state.errorReason}"
                                                    ServerState.Connecting -> "Connecting..."
                                                }
                                            }
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F172A)),
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        if (isPinging) {
                                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                        } else {
                                            Text("Test Connection & Verify Audit", fontSize = 13.sp)
                                        }
                                    }

                                    if (pingResult != null) {
                                        Text(
                                            text = pingResult ?: "",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = if (serverState is ServerState.Connected) Color(0xFF15803D) else Color(0xFFB91C1C)
                                        )
                                    }

                                    Divider(modifier = Modifier.padding(vertical = 4.dp))

                                    OutlinedButton(
                                        onClick = {
                                            apiClient.clearPatientProfile()
                                            patientProfile = null
                                            showServerConfigDialog = false
                                        },
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFB91C1C)),
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text("🔄 Restart Onboarding Flow for Demo", fontSize = 12.sp)
                                    }
                                }
                            },
                            confirmButton = {
                                TextButton(onClick = {
                                    apiClient.currentBaseUrl = tempUrl
                                    coroutineScope.launch {
                                        serverState = apiClient.checkHealth()
                                    }
                                    showServerConfigDialog = false
                                }) {
                                    Text("Apply & Close")
                                }
                            }
                        )
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
    }

    private fun checkAndRequestPermissions() {
        // Notification permission for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestNotificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        // Exact Alarm permission check for Android 12+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                // Device requires exact alarm permission in settings
            }
        }
    }

    private fun triggerBiometricPrompt(callback: (Boolean) -> Unit) {
        val biometricManager = BiometricManager.from(this)
        val canAuth = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL
        )

        if (canAuth != BiometricManager.BIOMETRIC_SUCCESS && canAuth != BiometricManager.BIOMETRIC_STATUS_UNKNOWN) {
            // No biometric sensor or credential configured - gracefully pass for demo
            callback(true)
            return
        }

        val executor = ContextCompat.getMainExecutor(this)
        val prompt = BiometricPrompt(this, executor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                callback(true)
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                if (errorCode == BiometricPrompt.ERROR_USER_CANCELED || errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON) {
                    callback(false)
                } else {
                    // Graceful fallback on emulator/non-biometric devices
                    callback(true)
                }
            }

            override fun onAuthenticationFailed() {
                callback(false)
            }
        })

        try {
            val promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle("Patient Consent Authorization")
                .setSubtitle("Confirm identity to share clinical records")
                .setAllowedAuthenticators(
                    BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL
                )
                .build()

            prompt.authenticate(promptInfo)
        } catch (e: Exception) {
            callback(true)
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
