package app.medicub.sync.ui.screens

import androidx.compose.foundation.background
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
            .background(Color(0xFF0F172A))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text(
                text = "Guided Blood Pressure Check",
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Wearable estimates are context only. Only validated cuff readings with high reliability can trigger clinical escalation.",
                color = Color(0xFF94A3B8),
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 4.dp)
            )
        }

        // Checklist Items
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(10.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Pre-Measurement Reliability Checklist:", color = Color(0xFF38BDF8), fontWeight = FontWeight.Bold, fontSize = 14.sp)

                    ChecklistItem("Seated with back supported & feet flat (+20)", seated) { seated = it }
                    ChecklistItem("Rested quietly for 5+ minutes (+20)", rested) { rested = it }
                    ChecklistItem("Arm supported at heart level (+15)", armLevel) { armLevel = it }
                    ChecklistItem("No caffeine, smoking, or exercise in last 30m (+15)", noCaffeine) { noCaffeine = it }
                    ChecklistItem("Correct cuff placement on bare upper arm (+10)", cuffPlaced) { cuffPlaced = it }
                    ChecklistItem("Validated upper arm cuff (not wearable) (+10)", validatedDevice) { validatedDevice = it }
                    ChecklistItem("Two readings 1 minute apart (+10)", consistentSecond) { consistentSecond = it }
                }
            }
        }

        // Reliability Score Badge
        item {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (isAlertEligible) Color(0x3322C55E) else Color(0x33F97316)
                ),
                shape = RoundedCornerShape(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Reading Reliability Score", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        Text(
                            text = if (isAlertEligible) "✓ Alert-Eligible Clinical Reading" else "⚠️ Reliability below 70 - Re-measure Recommended",
                            color = if (isAlertEligible) Color(0xFF22C55E) else Color(0xFFF97316),
                            fontSize = 12.sp
                        )
                    }
                    Text(
                        text = "$score / 100",
                        color = if (isAlertEligible) Color(0xFF22C55E) else Color(0xFFF97316),
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Submit reading button
        item {
            Button(
                onClick = { /* In production: Submit vitals with reliability score to /v1/vitals */ },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Log Reading ($systolic / $diastolic mmHg)", fontWeight = FontWeight.Bold)
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
        Text(label, color = Color(0xFFF8FAFC), fontSize = 13.sp, modifier = Modifier.weight(1f))
        Checkbox(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = CheckboxDefaults.colors(checkedColor = Color(0xFF0284C7))
        )
    }
}
