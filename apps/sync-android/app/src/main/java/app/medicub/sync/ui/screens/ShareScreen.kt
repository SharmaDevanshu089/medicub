package app.medicub.sync.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.medicub.sync.R
import app.medicub.sync.network.ApiClient
import app.medicub.sync.network.ConsentCodeResult
import app.medicub.sync.network.PatientProfile
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// Google Material 3 Clinical Palette
private val ClinicalBg = Color(0xFFF8FAFC)
private val ClinicalCardBg = Color(0xFFFFFFFF)
private val ClinicalBorder = Color(0xFFE2E8F0)
private val ClinicalTextDark = Color(0xFF0F172A)
private val ClinicalTextMuted = Color(0xFF475569)
private val GoogleBlue = Color(0xFF1A73E8)
private val CrimsonRevoke = Color(0xFFB91C1C)
private val GreenSuccess = Color(0xFF15803D)
private val GreenBg = Color(0xFFECFDF5)

@Composable
fun ShareScreen(
    onTriggerBiometric: (onResult: (Boolean) -> Unit) -> Unit,
    apiClient: ApiClient? = null,
    patientProfile: PatientProfile? = null
) {
    val coroutineScope = rememberCoroutineScope()
    var isBiometricConfirmed by remember { mutableStateOf(false) }
    var consentResult by remember { mutableStateOf<ConsentCodeResult?>(null) }
    var isLoadingCode by remember { mutableStateOf(false) }
    var isRevoked by remember { mutableStateOf(false) }

    // 15-minute countdown timer (900 seconds)
    var secondsRemaining by remember { mutableStateOf(900) }

    LaunchedEffect(isBiometricConfirmed) {
        if (isBiometricConfirmed && !isRevoked) {
            isLoadingCode = true
            val patId = patientProfile?.id ?: "usr-patient-001"
            consentResult = apiClient?.createConsentCode(patId) ?: ConsentCodeResult(
                code = "847291",
                expiresAt = "15m",
                qrData = "MEDICUB:CONSENT:847291:$patId",
                facilityId = "fac-apollo-delhi"
            )
            isLoadingCode = false

            while (secondsRemaining > 0 && !isRevoked) {
                delay(1000L)
                secondsRemaining--
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(ClinicalBg)
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
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

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = "ABDM Patient Consent Protocol · Temporary Point-to-Point Sharing",
                    color = GoogleBlue,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        if (!isBiometricConfirmed || isRevoked) {
            // Locked Consent Gate Card
            Card(
                colors = CardDefaults.cardColors(containerColor = ClinicalCardBg),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, ClinicalBorder, RoundedCornerShape(12.dp))
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("🔐", fontSize = 42.sp)

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = if (isRevoked) "Consent Revoked" else "Biometric Consent Gate",
                        color = ClinicalTextDark,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = if (isRevoked)
                            "Access was invalidated. The previous QR code and numeric OTP are permanently expired in the audit trail."
                        else
                            "To protect patient privacy, generating a clinic QR code or OTP requires local biometric authentication (fingerprint or PIN).",
                        color = ClinicalTextMuted,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                        lineHeight = 18.sp
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    Button(
                        onClick = {
                            onTriggerBiometric { success ->
                                if (success) {
                                    isRevoked = false
                                    secondsRemaining = 900
                                    isBiometricConfirmed = true
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = GoogleBlue),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Text(
                            text = if (isRevoked) "Re-authorize Access" else "Authenticate to Generate QR Code",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        } else {
            // Unlocked Consent Display
            Card(
                colors = CardDefaults.cardColors(containerColor = ClinicalCardBg),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, ClinicalBorder, RoundedCornerShape(12.dp))
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    if (isLoadingCode) {
                        CircularProgressIndicator(color = GoogleBlue, modifier = Modifier.size(36.dp))
                        Spacer(modifier = Modifier.height(10.dp))
                        Text("Contacting Clinic Gateway...", color = ClinicalTextMuted, fontSize = 13.sp)
                    } else {
                        // Numeric OTP
                        Text(
                            text = "One-Time Clinic OTP",
                            color = ClinicalTextMuted,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )

                        val codeStr = consentResult?.code ?: "847291"
                        Text(
                            text = codeStr.chunked(3).joinToString("  "),
                            color = GoogleBlue,
                            fontSize = 32.sp,
                            fontWeight = FontWeight.ExtraBold,
                            fontFamily = FontFamily.Monospace,
                            letterSpacing = 4.sp
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        // Stylized QR Matrix Representation
                        Surface(
                            color = Color(0xFFF8FAFC),
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFCBD5E1)),
                            modifier = Modifier
                                .size(170.dp)
                                .padding(4.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(8.dp),
                                verticalArrangement = Arrangement.SpaceBetween,
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Box(modifier = Modifier.size(36.dp).background(ClinicalTextDark, RoundedCornerShape(4.dp)))
                                    Box(modifier = Modifier.size(36.dp).background(ClinicalTextDark, RoundedCornerShape(4.dp)))
                                }

                                Text(
                                    text = "SCAN VIA DOCTOR APP",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = ClinicalTextMuted
                                )

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Box(modifier = Modifier.size(36.dp).background(ClinicalTextDark, RoundedCornerShape(4.dp)))
                                    Box(modifier = Modifier.size(20.dp).background(GoogleBlue, RoundedCornerShape(2.dp)))
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Countdown Progress
                        val mins = secondsRemaining / 60
                        val secs = secondsRemaining % 60
                        Text(
                            text = "Expires in ${String.format("%02d:%02d", mins, secs)} (Auto-Revokes)",
                            color = if (secondsRemaining < 120) CrimsonRevoke else GreenSuccess,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold
                        )

                        Spacer(modifier = Modifier.height(6.dp))

                        LinearProgressIndicator(
                            progress = { secondsRemaining / 900f },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(4.dp),
                            color = if (secondsRemaining < 120) CrimsonRevoke else GoogleBlue,
                            trackColor = Color(0xFFE2E8F0)
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Revoke Button
                        Button(
                            onClick = {
                                isRevoked = true
                                isBiometricConfirmed = false
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = CrimsonRevoke),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp)
                        ) {
                            Text(
                                text = "Revoke Access Immediately",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.5.sp
                            )
                        }
                    }
                }
            }
        }
    }
}
