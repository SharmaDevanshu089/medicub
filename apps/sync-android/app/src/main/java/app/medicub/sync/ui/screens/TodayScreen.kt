package app.medicub.sync.ui.screens

import android.speech.tts.TextToSpeech
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import app.medicub.sync.R
import app.medicub.sync.wear.WatchDevice
import app.medicub.sync.wear.WatchVitalsContext

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
    watchVitals: WatchVitalsContext? = null
) {
    var amlongTaken by remember { mutableStateOf(false) }
    var glycometTaken by remember { mutableStateOf(false) }
    var watchTileSynced by remember { mutableStateOf(true) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(ClinicalBg)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Patient Header Bar with TTS Read Aloud
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
                            text = "रमेश कुमार (Ramesh Kumar)",
                            color = ClinicalTextDark,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Next dose in 45 minutes · 2 medications today",
                            color = ClinicalTextMuted,
                            fontSize = 13.sp
                        )
                    }

                    Button(
                        onClick = {
                            val text = "आपकी सुबह की खुराक एम्लॉन्ग पांच मिलीग्राम लेने का समय हो गया है।"
                            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "tts_today")
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = GoogleBlue),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "🔊 " + stringResource(R.string.action_read_aloud),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                    }
                }
            }
        }

        // Smartwatch / Wear OS Companion Card
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
                                    text = watchDevice?.name ?: "Wear OS Companion Connected",
                                    color = ClinicalTextDark,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = "${watchDevice?.model ?: "Pixel Watch / Wear OS"} · Battery: ${watchDevice?.batteryPct ?: 84}%",
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
                                text = "● Live Sync",
                                color = GreenSuccess,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Wearable Vitals Context Banner (Safety Invariant #4 compliant)
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
                                    text = "Sleep: ${watchVitals?.sleepDurationHours ?: 6.5}h",
                                    fontWeight = FontWeight.Medium,
                                    fontSize = 13.sp,
                                    color = ClinicalTextDark
                                )
                            }
                            Spacer(modifier = Modifier.height(3.dp))
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

        // Plain-Language Safety Alert Card (Defining Demo Scenario)
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
                        fontSize = 13.5.sp,
                        lineHeight = 19.sp
                    )
                }
            }
        }

        // Morning Slot (08:00 AM)
        item {
            ClinicalDoseCard(
                slotTitle = "☀️ " + stringResource(R.string.morning_doses),
                time = "08:00 AM",
                drugBrand = "Amlong 5",
                composition = "Amlodipine 5mg",
                instructions = "डॉ. अय्यर (Cardiologist) · भोजन के बाद पानी के साथ (After food with water)",
                isTaken = amlongTaken,
                onTaken = { amlongTaken = true },
                onSkip = { amlongTaken = false }
            )
        }

        // Night Slot (08:00 PM)
        item {
            ClinicalDoseCard(
                slotTitle = "🌙 " + stringResource(R.string.night_doses),
                time = "08:00 PM",
                drugBrand = "Glycomet 500",
                composition = "Metformin 500mg",
                instructions = "डॉ. राव (Diabetologist) · रात के खाने के साथ (With evening dinner)",
                isTaken = glycometTaken,
                onTaken = { glycometTaken = true },
                onSkip = { glycometTaken = false }
            )
        }
    }
}

@Composable
fun ClinicalDoseCard(
    slotTitle: String,
    time: String,
    drugBrand: String,
    composition: String,
    instructions: String,
    isTaken: Boolean,
    onTaken: () -> Unit,
    onSkip: () -> Unit
) {
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
                color = Color(0xFFF8FAFC),
                shape = RoundedCornerShape(8.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEDF2F7)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = drugBrand,
                        color = ClinicalTextDark,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold
                    )
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
                    onClick = onTaken,
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
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
