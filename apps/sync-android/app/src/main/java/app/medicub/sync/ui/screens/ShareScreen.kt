package app.medicub.sync.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.medicub.sync.R

// Google Material 3 Clinical Palette
private val ClinicalBg = Color(0xFFF8FAFC)
private val ClinicalCardBg = Color(0xFFFFFFFF)
private val ClinicalBorder = Color(0xFFE2E8F0)
private val ClinicalTextDark = Color(0xFF0F172A)
private val ClinicalTextMuted = Color(0xFF475569)
private val GoogleBlue = Color(0xFF1A73E8)
private val CrimsonRevoke = Color(0xFFB91C1C)

@Composable
fun ShareScreen(
    onTriggerBiometric: () -> Unit
) {
    var isBiometricConfirmed by remember { mutableStateOf(true) }
    var consentScope by remember { mutableStateOf("clinic") }
    var isRevoked by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(ClinicalBg)
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = ClinicalCardBg),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, ClinicalBorder, RoundedCornerShape(12.dp))
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = stringResource(R.string.share_title),
                    color = ClinicalTextDark,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = stringResource(R.string.share_instruction),
                    color = ClinicalTextMuted,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Dynamic 5-minute QR Code Container
        Card(
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .size(240.dp)
                .border(1.5.dp, ClinicalBorder, RoundedCornerShape(16.dp))
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "📱 [QR CODE]",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = ClinicalTextDark
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "medicub://consent/7K2M9Q",
                        color = GoogleBlue,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (!isRevoked) "Valid for: 4m 32s" else "TOKEN REVOKED",
                        color = if (!isRevoked) CrimsonRevoke else ClinicalTextMuted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Consent Scope Controls
        Card(
            colors = CardDefaults.cardColors(containerColor = ClinicalCardBg),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, ClinicalBorder, RoundedCornerShape(12.dp))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Grant Consent To:",
                    color = ClinicalTextDark,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = consentScope == "clinic",
                        onClick = { consentScope = "clinic" },
                        label = { Text("Clinic (30 days)") }
                    )
                    FilterChip(
                        selected = consentScope == "pharmacy",
                        onClick = { consentScope = "pharmacy" },
                        label = { Text("Pharmacy (Dispense only)") }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = { isRevoked = !isRevoked },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isRevoked) Color(0xFF64748B) else CrimsonRevoke
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = if (isRevoked) "Consent Revoked" else "Revoke Consent Instantly",
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
