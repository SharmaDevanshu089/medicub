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
import java.util.Locale

@Composable
fun TodayScreen(
    tts: TextToSpeech?,
    onFireAlarmNow: () -> Unit
) {
    var amlongTaken by remember { mutableStateOf(false) }
    var glycometTaken by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Read Aloud & Next Dose Bar
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "रमेश कुमार (Ramesh Kumar)",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Next dose in 45 minutes",
                        color = Color(0xFF94A3B8),
                        fontSize = 13.sp
                    )
                }

                Button(
                    onClick = {
                        val text = "आपकी सुबह की खुराक एम्लॉन्ग पांच मिलीग्राम लेने का समय हो गया है।"
                        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "tts_today")
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(stringResource(R.string.action_read_aloud), fontSize = 13.sp)
                }
            }
        }

        // Plain-Language Safety Alert Card (Defining Demo Scenario)
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.5.dp, Color(0xFFF97316), RoundedCornerShape(12.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "⚠️ " + stringResource(R.string.alert_card_title),
                            color = Color(0xFFF97316),
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                        Surface(
                            color = Color(0x33F97316),
                            shape = RoundedCornerShape(4.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF97316))
                        ) {
                            Text(
                                text = stringResource(R.string.alert_card_status),
                                color = Color(0xFFF97316),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = stringResource(R.string.alert_card_body),
                        color = Color(0xFFF8FAFC),
                        fontSize = 14.sp,
                        lineHeight = 20.sp
                    )
                }
            }
        }

        // Morning Slot (08:00 AM)
        item {
            DoseSlotCard(
                slotTitle = "☀️ " + stringResource(R.string.morning_doses),
                time = "08:00 AM",
                drugBrand = "Amlong 5",
                composition = "Amlodipine 5mg",
                instructions = "डॉ. अय्यर (Cardiologist) · भोजन के बाद पानी के साथ",
                isTaken = amlongTaken,
                onTaken = { amlongTaken = true },
                onSkip = { amlongTaken = false }
            )
        }

        // Night Slot (08:00 PM)
        item {
            DoseSlotCard(
                slotTitle = "🌙 " + stringResource(R.string.night_doses),
                time = "08:00 PM",
                drugBrand = "Glycomet 500",
                composition = "Metformin 500mg",
                instructions = "डॉ. राव (Diabetologist) · रात के खाने के साथ",
                isTaken = glycometTaken,
                onTaken = { glycometTaken = true },
                onSkip = { glycometTaken = false }
            )
        }
    }
}

@Composable
fun DoseSlotCard(
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
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(slotTitle, color = Color(0xFF38BDF8), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(time, color = Color(0xFF94A3B8), fontSize = 13.sp)
            }

            Spacer(modifier = Modifier.height(10.dp))

            Surface(
                color = Color(0xFF0F172A),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(drugBrand, color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                    Text(composition, color = Color(0xFF38BDF8), fontSize = 13.sp)
                    Text(instructions, color = Color(0xFF94A3B8), fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = onTaken,
                    modifier = Modifier.weight(1f).height(48.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isTaken) Color(0xFF16A34A) else Color(0xFF22C55E)
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(if (isTaken) "✓ " + stringResource(R.string.action_taken) else stringResource(R.string.action_taken), fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = onSkip,
                    modifier = Modifier.weight(1f).height(48.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF94A3B8)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(stringResource(R.string.action_skip), fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
