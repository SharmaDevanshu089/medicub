package app.medicub.sync.ui.screens

import android.speech.tts.TextToSpeech
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.medicub.sync.R
import app.medicub.sync.network.ApiClient
import app.medicub.sync.network.PatientProfile
import app.medicub.sync.network.ServerState
import app.medicub.sync.wear.WatchDevice
import app.medicub.sync.wear.WatchVitalsContext
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// Google Material 3 Clinical Palette
private val ClinicalBg = Color(0xFFF8FAFC)
private val ClinicalCardBg = Color(0xFFFFFFFF)
private val ClinicalBorder = Color(0xFFE2E8F0)
private val ClinicalTextDark = Color(0xFF0F172A)
private val ClinicalTextMuted = Color(0xFF475569)
private val ClinicalTextSubtle = Color(0xFF64748B)
private val GoogleBlue = Color(0xFF1A73E8)
private val GoogleTeal = Color(0xFF006874)
private val AmberWarningBg = Color(0xFFFFFBEB)
private val AmberWarningBorder = Color(0xFFF59E0B)
private val AmberWarningText = Color(0xFF92400E)
private val GreenSuccess = Color(0xFF15803D)
private val GreenButtonBg = Color(0xFF16A34A)

@Composable
fun TodayScreen(
    tts: TextToSpeech?,
    onFireAlarmNow: () -> Unit,
    watchDevice: WatchDevice? = null,
    watchVitals: WatchVitalsContext? = null,
    patientProfile: PatientProfile?,
    serverState: ServerState,
    apiClient: ApiClient,
    onConfigureServer: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    var amlongTaken by remember { mutableStateOf(false) }
    var glycometTaken by remember { mutableStateOf(false) }
    var isSpeaking by remember { mutableStateOf(false) }
    var syncMessage by remember { mutableStateOf<String?>(null) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(ClinicalBg)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Live Server Connection Status Banner
        item {
            when (serverState) {
                is ServerState.Connected -> {
                    Surface(
                        color = Color(0xFFECFDF5),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFA7F3D0)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onConfigureServer() }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 9.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .background(GreenSuccess, CircleShape)
                                )
                                Text(
                                    text = "Connected to Medicub Cloud · ${serverState.latencyMs}ms",
                                    color = GreenSuccess,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Text(
                                text = "Settings ⚙️",
                                color = GoogleBlue,
                                fontSize = 11.5.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
                is ServerState.Connecting -> {
                    Surface(
                        color = Color(0xFFEFF6FF),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBFDBFE)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 9.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(12.dp),
                                strokeWidth = 1.5.dp,
                                color = GoogleBlue
                            )
                            Text(
                                text = "Connecting to clinical safety network...",
                                color = GoogleBlue,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
                is ServerState.Offline -> {
                    Surface(
                        color = Color(0xFFFEF2F2),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onConfigureServer() }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "⚠️ Server Unreachable · Safe Local Mode Active",
                                    color = Color(0xFF991B1B),
                                    fontSize = 12.5.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = serverState.errorReason,
                                    color = Color(0xFFB91C1C),
                                    fontSize = 11.sp
                                )
                            }
                            Button(
                                onClick = { onConfigureServer() },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                                shape = RoundedCornerShape(6.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                modifier = Modifier.height(30.dp)
                            ) {
                                Text("Retry", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }

        // Optional Toast / Sync Banner
        if (syncMessage != null) {
            item {
                Surface(
                    color = Color(0xFFF0FDF4),
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBBF7D0)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = syncMessage ?: "",
                        color = GreenSuccess,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(10.dp)
                    )
                }
            }
        }

        // 2. Patient Profile Header Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = ClinicalCardBg),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, ClinicalBorder, RoundedCornerShape(12.dp))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = patientProfile?.name ?: "रमेश कुमार (Ramesh Kumar)",
                            color = ClinicalTextDark,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "ABHA: ${patientProfile?.abhaId ?: "91-1234-5678-9012"} · Age ${patientProfile?.age ?: 62}",
                            color = ClinicalTextMuted,
                            fontSize = 12.5.sp
                        )
                        Text(
                            text = "Rx Conditions: ${patientProfile?.conditions?.joinToString(", ") ?: "Essential HTN, T2DM"}",
                            color = GoogleTeal,
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Button(
                        onClick = {
                            isSpeaking = true
                            val text = "नमस्ते ${patientProfile?.name ?: "रमेश जी"}। आपकी सुबह की दवा एम्लॉन्ग 5 मिलीग्राम लेने का समय हो गया है। कृपया नाश्ते के बाद पानी के साथ लें।"
                            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "tts_today")
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = GoogleBlue),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "🔊 " + stringResource(R.string.action_read_aloud),
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                    }
                }
            }
        }

        // 3. Smartwatch / Wear OS Companion Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = ClinicalCardBg),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(12.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text("⌚", fontSize = 20.sp)
                            Column {
                                Text(
                                    text = watchDevice?.name ?: "Pixel Watch 3 (Wear OS)",
                                    color = ClinicalTextDark,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = "${watchDevice?.model ?: "Wear OS Companion"} · Battery: ${watchDevice?.batteryPct ?: 86}%",
                                    color = ClinicalTextSubtle,
                                    fontSize = 12.sp
                                )
                            }
                        }

                        Surface(
                            color = Color(0xFFECFDF5),
                            shape = RoundedCornerShape(6.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFA7F3D0))
                        ) {
                            Text(
                                text = "● Live Context",
                                color = GreenSuccess,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Surface(
                        color = Color(0xFFF1F5F9),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "Watch Pulse: ${watchVitals?.heartRateBpm ?: 74} bpm",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp,
                                    color = ClinicalTextDark
                                )
                                Text(
                                    text = "Resting: ${watchVitals?.sleepDurationHours ?: 6.8}h",
                                    fontWeight = FontWeight.Medium,
                                    fontSize = 13.sp,
                                    color = ClinicalTextDark
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Safety Invariant #4: Smartwatch metrics serve as clinical context only (device_class: wearable_estimate). Dose escalation requires validated BP cuff reading.",
                                fontSize = 10.5.sp,
                                color = ClinicalTextSubtle,
                                lineHeight = 14.sp
                            )
                        }
                    }
                }
            }
        }

        // 4. Clinical Safety Alert Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = AmberWarningBg),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.5.dp, AmberWarningBorder, RoundedCornerShape(12.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text("⚠️", fontSize = 16.sp)
                            Text(
                                text = stringResource(R.string.alert_card_title),
                                color = AmberWarningText,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }

                        Surface(
                            color = Color(0xFFFEF3C7),
                            shape = RoundedCornerShape(4.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, AmberWarningBorder)
                        ) {
                            Text(
                                text = stringResource(R.string.alert_card_status),
                                color = AmberWarningText,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = stringResource(R.string.alert_card_body),
                        color = Color(0xFF78350F),
                        fontSize = 13.sp,
                        lineHeight = 18.sp
                    )
                }
            }
        }

        // 5. Morning Slot Dose Card
        item {
            AnimatedDoseCard(
                slotTitle = "☀️ " + stringResource(R.string.morning_doses),
                time = "08:00 AM",
                drugBrand = "Amlong 5",
                composition = "Amlodipine 5mg",
                instructions = "डॉ. अय्यर (Cardiologist) · भोजन के बाद पानी के साथ (After food with water)",
                isTaken = amlongTaken,
                onTaken = {
                    amlongTaken = true
                    coroutineScope.launch {
                        val patId = patientProfile?.id ?: "usr-patient-001"
                        val ok = apiClient.recordDoseEvent(patId, "Amlong 5", "taken")
                        syncMessage = if (ok) "✓ Amlong 5 marked Taken & synced to Doctor Audit Log" else "Recorded locally (will sync when online)"
                    }
                },
                onSkip = {
                    amlongTaken = false
                    coroutineScope.launch {
                        val patId = patientProfile?.id ?: "usr-patient-001"
                        apiClient.recordDoseEvent(patId, "Amlong 5", "skipped")
                        syncMessage = "Amlong 5 marked Skipped"
                    }
                }
            )
        }

        // 6. Night Slot Dose Card
        item {
            AnimatedDoseCard(
                slotTitle = "🌙 " + stringResource(R.string.night_doses),
                time = "08:00 PM",
                drugBrand = "Glycomet 500",
                composition = "Metformin 500mg",
                instructions = "डॉ. राव (Diabetologist) · रात के खाने के साथ (With evening dinner)",
                isTaken = glycometTaken,
                onTaken = {
                    glycometTaken = true
                    coroutineScope.launch {
                        val patId = patientProfile?.id ?: "usr-patient-001"
                        val ok = apiClient.recordDoseEvent(patId, "Glycomet 500", "taken")
                        syncMessage = if (ok) "✓ Glycomet 500 marked Taken & synced to Doctor Audit Log" else "Recorded locally"
                    }
                },
                onSkip = {
                    glycometTaken = false
                    coroutineScope.launch {
                        val patId = patientProfile?.id ?: "usr-patient-001"
                        apiClient.recordDoseEvent(patId, "Glycomet 500", "skipped")
                        syncMessage = "Glycomet 500 marked Skipped"
                    }
                }
            )
        }
    }
}

@Composable
fun AnimatedDoseCard(
    slotTitle: String,
    time: String,
    drugBrand: String,
    composition: String,
    instructions: String,
    isTaken: Boolean,
    onTaken: () -> Unit,
    onSkip: () -> Unit
) {
    var buttonPressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (buttonPressed) 0.95f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
        label = "dose_button_spring"
    )

    Card(
        colors = CardDefaults.cardColors(containerColor = ClinicalCardBg),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(
                width = if (isTaken) 1.5.dp else 1.dp,
                color = if (isTaken) Color(0xFFA7F3D0) else ClinicalBorder,
                shape = RoundedCornerShape(12.dp)
            )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = slotTitle,
                    color = GoogleBlue,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
                Text(
                    text = time,
                    color = ClinicalTextSubtle,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Surface(
                color = if (isTaken) Color(0xFFF0FDF4) else Color(0xFFF8FAFC),
                shape = RoundedCornerShape(8.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, if (isTaken) Color(0xFFBBF7D0) else Color(0xFFEDF2F7)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = drugBrand,
                            color = ClinicalTextDark,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold
                        )
                        if (isTaken) {
                            Surface(
                                color = Color(0xFFDCFCE7),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    text = "✓ Taken",
                                    color = GreenSuccess,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    Text(
                        text = composition,
                        color = GoogleTeal,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = instructions,
                        color = ClinicalTextMuted,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 4.dp),
                        lineHeight = 16.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = {
                        buttonPressed = true
                        onTaken()
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                        .scale(scale),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isTaken) GreenSuccess else GreenButtonBg
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = if (isTaken) "✓ " + stringResource(R.string.action_taken) else stringResource(R.string.action_taken),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }

                OutlinedButton(
                    onClick = onSkip,
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = ClinicalTextMuted),
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, ClinicalBorder)
                ) {
                    Text(
                        text = stringResource(R.string.action_skip),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}
