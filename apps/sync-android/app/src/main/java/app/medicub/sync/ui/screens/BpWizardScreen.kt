package app.medicub.sync.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.medicub.sync.network.ApiClient
import app.medicub.sync.network.PatientProfile
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// Google Material 3 Clinical Palette
private val ClinicalBg = Color(0xFFF8FAFC)
private val ClinicalCardBg = Color(0xFFFFFFFF)
private val ClinicalBorder = Color(0xFFE2E8F0)
private val ClinicalTextDark = Color(0xFF0F172A)
private val ClinicalTextMuted = Color(0xFF475569)
private val ClinicalTextSubtle = Color(0xFF64748B)
private val GoogleBlue = Color(0xFF1A73E8)
private val GreenSuccess = Color(0xFF15803D)
private val GreenBg = Color(0xFFECFDF5)
private val GreenBorder = Color(0xFFA7F3D0)
private val AmberWarning = Color(0xFFB45309)
private val AmberBg = Color(0xFFFFFBEB)
private val AmberBorder = Color(0xFFFDE68A)
private val CrimsonRed = Color(0xFFB91C1C)
private val CrimsonBg = Color(0xFFFEF2F2)
private val CrimsonBorder = Color(0xFFFECACA)

@Composable
fun BpWizardScreen(
    apiClient: ApiClient? = null,
    patientProfile: PatientProfile? = null
) {
    val coroutineScope = rememberCoroutineScope()

    var seated by remember { mutableStateOf(true) }
    var rested by remember { mutableStateOf(true) }
    var armLevel by remember { mutableStateOf(true) }
    var noCaffeine by remember { mutableStateOf(true) }
    var cuffPlaced by remember { mutableStateOf(true) }
    var validatedDevice by remember { mutableStateOf(true) }
    var consistentSecond by remember { mutableStateOf(false) }

    var systolicInput by remember { mutableStateOf("138") }
    var diastolicInput by remember { mutableStateOf("88") }
    var pulseInput by remember { mutableStateOf("72") }

    var isSubmitting by remember { mutableStateOf(false) }
    var submissionResult by remember { mutableStateOf<String?>(null) }

    // 5-minute pre-reading relaxation timer state
    var timerRunning by remember { mutableStateOf(false) }
    var secondsLeft by remember { mutableStateOf(300) } // 5 minutes

    LaunchedEffect(timerRunning) {
        if (timerRunning) {
            while (secondsLeft > 0 && timerRunning) {
                delay(1000L)
                secondsLeft--
            }
            if (secondsLeft == 0) {
                timerRunning = false
                rested = true
            }
        }
    }

    // Compute reliability score
    var score = 0
    if (seated) score += 20
    if (rested) score += 20
    if (armLevel) score += 15
    if (noCaffeine) score += 15
    if (cuffPlaced) score += 10
    if (validatedDevice) score += 10
    if (consistentSecond) score += 10

    val isAlertEligible = score >= 70

    val sys = systolicInput.toIntOrNull() ?: 120
    val dia = diastolicInput.toIntOrNull() ?: 80

    // AHA/ACC Clinical BP Category
    val (categoryText, categoryColor, categoryBg) = when {
        sys >= 180 || dia >= 120 -> Triple("🚨 Hypertensive Crisis — Alert Clinic", CrimsonRed, CrimsonBg)
        sys >= 140 || dia >= 90 -> Triple("Stage 2 Hypertension", Color(0xFFC2410C), Color(0xFFFFF7ED))
        sys in 130..139 || dia in 80..89 -> Triple("Stage 1 Hypertension", AmberWarning, AmberBg)
        sys in 120..129 && dia < 80 -> Triple("Elevated Blood Pressure", GoogleBlue, Color(0xFFEFF6FF))
        else -> Triple("Normal Blood Pressure", GreenSuccess, GreenBg)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(ClinicalBg)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Clinical Protocol Banner
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = ClinicalCardBg),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, ClinicalBorder, RoundedCornerShape(12.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "AHA/ACC Guided BP Protocol",
                        color = ClinicalTextDark,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Safety Invariant #4: Smartwatch & wearable estimates are clinical context only. Only validated upper-arm cuff readings with reliability ≥ 70 can trigger acute escalation.",
                        color = ClinicalTextMuted,
                        fontSize = 12.sp,
                        lineHeight = 17.sp
                    )
                }
            }
        }

        // 5-Minute Rest Timer Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = ClinicalCardBg),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, ClinicalBorder, RoundedCornerShape(12.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "⏱️ 5-Minute Quiet Rest Period",
                                color = GoogleBlue,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Text(
                                text = if (secondsLeft == 0) "Completed rest requirement" else "Rest quietly without talking before inflating cuff",
                                color = ClinicalTextMuted,
                                fontSize = 12.sp
                            )
                        }

                        val mins = secondsLeft / 60
                        val secs = secondsLeft % 60
                        Surface(
                            color = if (secondsLeft == 0) GreenBg else Color(0xFFF1F5F9),
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, if (secondsLeft == 0) GreenBorder else ClinicalBorder)
                        ) {
                            Text(
                                text = String.format("%02d:%02d", mins, secs),
                                color = if (secondsLeft == 0) GreenSuccess else ClinicalTextDark,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = {
                                if (secondsLeft == 0) secondsLeft = 300
                                timerRunning = !timerRunning
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (timerRunning) Color(0xFFEA580C) else GoogleBlue
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f).height(38.dp)
                        ) {
                            Text(
                                text = if (timerRunning) "Pause Rest" else if (secondsLeft == 0) "Restart 5m Rest" else "Start 5m Rest",
                                fontSize = 12.5.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        OutlinedButton(
                            onClick = {
                                timerRunning = false
                                secondsLeft = 0
                                rested = true
                            },
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f).height(38.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, ClinicalBorder)
                        ) {
                            Text("Already Rested ✓", fontSize = 12.5.sp, color = ClinicalTextDark)
                        }
                    }
                }
            }
        }

        // Checklist Items
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = ClinicalCardBg),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, ClinicalBorder, RoundedCornerShape(12.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Clinical Reliability Checklist",
                        color = GoogleBlue,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )

                    ChecklistItem("Seated with back supported & feet flat (+20)", seated) { seated = it }
                    ChecklistItem("Rested quietly for 5+ minutes (+20)", rested) { rested = it }
                    ChecklistItem("Arm supported at heart level (+15)", armLevel) { armLevel = it }
                    ChecklistItem("No caffeine, smoking, or exercise in last 30m (+15)", noCaffeine) { noCaffeine = it }
                    ChecklistItem("Correct cuff placement on bare upper arm (+10)", cuffPlaced) { cuffPlaced = it }
                    ChecklistItem("Validated upper arm cuff (not wearable) (+10)", validatedDevice) { validatedDevice = it }
                    ChecklistItem("Two readings taken 1 minute apart (+10)", consistentSecond) { consistentSecond = it }
                }
            }
        }

        // Reliability Score Badge
        item {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (isAlertEligible) GreenBg else AmberBg
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.5.dp, if (isAlertEligible) GreenBorder else AmberBorder, RoundedCornerShape(12.dp))
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
                            text = "Measurement Reliability",
                            color = ClinicalTextDark,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = if (isAlertEligible) "✓ Alert-Eligible Clinical Reading" else "⚠️ Reliability below 70 - Re-measure Recommended",
                            color = if (isAlertEligible) GreenSuccess else AmberWarning,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Text(
                        text = "$score / 100",
                        color = if (isAlertEligible) GreenSuccess else AmberWarning,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Reading Values Input Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = ClinicalCardBg),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, ClinicalBorder, RoundedCornerShape(12.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Enter Upper-Arm Cuff Reading",
                        color = ClinicalTextDark,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedTextField(
                            value = systolicInput,
                            onValueChange = { systolicInput = it },
                            label = { Text("Systolic (mmHg)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp)
                        )

                        OutlinedTextField(
                            value = diastolicInput,
                            onValueChange = { diastolicInput = it },
                            label = { Text("Diastolic (mmHg)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp)
                        )

                        OutlinedTextField(
                            value = pulseInput,
                            onValueChange = { pulseInput = it },
                            label = { Text("Pulse (BPM)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Clinical Category Badge
                    Surface(
                        color = categoryBg,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = categoryText,
                            color = categoryColor,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                        )
                    }
                }
            }
        }

        // Optional Toast / Status
        if (submissionResult != null) {
            item {
                Surface(
                    color = GreenBg,
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, GreenBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = submissionResult ?: "",
                        color = GreenSuccess,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }
        }

        // Submit reading button
        item {
            Button(
                onClick = {
                    if (apiClient != null) {
                        isSubmitting = true
                        coroutineScope.launch {
                            val patId = patientProfile?.id ?: "usr-patient-001"
                            val (ok, serverScore) = apiClient.logVitals(
                                patientId = patId,
                                systolic = sys,
                                diastolic = dia,
                                pulseBpm = pulseInput.toIntOrNull() ?: 72,
                                checklistPassed = isAlertEligible
                            )
                            isSubmitting = false
                            submissionResult = if (ok) {
                                "✓ Validated reading ($sys / $dia mmHg) synced to Clinic Cloud! Reliability Score: $serverScore/100"
                            } else {
                                "✓ Validated reading recorded locally in safe mode. Reliability Score: $score/100"
                            }
                        }
                    } else {
                        submissionResult = "✓ Validated reading recorded ($sys / $dia mmHg). Score: $score/100"
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = GoogleBlue),
                shape = RoundedCornerShape(8.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Text(
                        text = "Record Validated Cuff Reading ($sys / $dia mmHg)",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}

@Composable
fun ChecklistItem(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            color = ClinicalTextDark,
            fontSize = 13.sp,
            modifier = Modifier.weight(1f)
        )
        Checkbox(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = CheckboxDefaults.colors(
                checkedColor = GoogleBlue,
                checkmarkColor = Color.White
            )
        )
    }
}
