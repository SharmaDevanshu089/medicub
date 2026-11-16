package app.medicub.sync.ui.screens

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

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

@Composable
fun BpWizardScreen() {
    var seated by remember { mutableStateOf(true) }
    var rested by remember { mutableStateOf(true) }
    var armLevel by remember { mutableStateOf(true) }
    var noCaffeine by remember { mutableStateOf(true) }
    var cuffPlaced by remember { mutableStateOf(true) }
    var validatedDevice by remember { mutableStateOf(true) }
    var consistentSecond by remember { mutableStateOf(false) }

    var systolic by remember { mutableStateOf("138") }
    var diastolic by remember { mutableStateOf("88") }

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

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(ClinicalBg)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
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
                        text = "Guided Blood Pressure Protocol",
                        color = ClinicalTextDark,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Safety Invariant #4: Wearable estimates are clinical context only. Only validated upper-arm cuff readings with reliability ≥ 70 can trigger acute escalation.",
                        color = ClinicalTextMuted,
                        fontSize = 12.sp,
                        lineHeight = 17.sp
                    )
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
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Pre-Measurement Reliability Checklist",
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

        // Submit reading button
        item {
            Button(
                onClick = { /* Submit vitals with reliability score to /v1/vitals */ },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = GoogleBlue),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = "Record Validated Cuff Reading ($systolic / $diastolic mmHg)",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
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
