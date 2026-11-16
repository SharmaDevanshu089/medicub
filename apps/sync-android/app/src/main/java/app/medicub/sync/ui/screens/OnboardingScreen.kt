package app.medicub.sync.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
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
import app.medicub.sync.network.ApiClient
import app.medicub.sync.network.PatientProfile
import kotlinx.coroutines.launch

// Google Material 3 Clinical Design Tokens
private val ClinicalBg = Color(0xFFF8FAFC)
private val ClinicalCardBg = Color(0xFFFFFFFF)
private val ClinicalBorder = Color(0xFFE2E8F0)
private val ClinicalTextDark = Color(0xFF0F172A)
private val ClinicalTextMuted = Color(0xFF475569)
private val GoogleBlue = Color(0xFF1A73E8)
private val GoogleTeal = Color(0xFF006874)
private val GreenSuccess = Color(0xFF15803D)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OnboardingScreen(
    apiClient: ApiClient,
    onOnboardingComplete: (PatientProfile) -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    var currentStep by remember { mutableStateOf(1) }
    var isSubmitting by remember { mutableStateOf(false) }

    // Patient Form State
    var patientName by remember { mutableStateOf("Ramesh Kumar") }
    var patientAge by remember { mutableStateOf("62") }
    var patientGender by remember { mutableStateOf("Male") }
    var abhaId by remember { mutableStateOf("91-1234-5678-9012") }

    // Chronic Conditions State
    val selectedConditions = remember { mutableStateListOf("Essential Hypertension", "Type 2 Diabetes") }
    val availableConditions = listOf("Essential Hypertension", "Type 2 Diabetes", "Dyslipidemia", "Chronic Kidney Disease", "Asthma")

    // Medications Intake State
    var initialBrand by remember { mutableStateOf("Amlong 5") }
    var initialDose by remember { mutableStateOf("5mg") }
    var initialFreq by remember { mutableStateOf("OD") }
    var initialDoctor by remember { mutableStateOf("Dr. Meera Iyer (Cardiologist)") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Patient Onboarding · Step $currentStep of 3",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = ClinicalTextDark
                        )
                        Text(
                            text = "Medicub Medication Safety Platform",
                            fontSize = 12.sp,
                            color = ClinicalTextMuted
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = ClinicalCardBg)
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(ClinicalBg)
                .padding(innerPadding)
                .padding(20.dp)
        ) {
            // Animated Step Progress Bar
            LinearProgressIndicator(
                progress = { currentStep / 3f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp),
                color = GoogleBlue,
                trackColor = Color(0xFFE2E8F0)
            )

            Spacer(modifier = Modifier.height(20.dp))

            AnimatedContent(
                targetState = currentStep,
                transitionSpec = {
                    fadeIn(animationSpec = tween(300)) togetherWith fadeOut(animationSpec = tween(200))
                },
                label = "onboarding_step_transition"
            ) { step ->
                when (step) {
                    1 -> {
                        // Step 1: Patient Identity
                        Card(
                            colors = CardDefaults.cardColors(containerColor = ClinicalCardBg),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, ClinicalBorder, RoundedCornerShape(12.dp))
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Text(
                                    text = "1. Personal & Health ID Details",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = ClinicalTextDark
                                )
                                Text(
                                    text = "Enter patient identity to establish cross-clinic clinical record.",
                                    fontSize = 12.5.sp,
                                    color = ClinicalTextMuted,
                                    modifier = Modifier.padding(top = 2.dp, bottom = 14.dp)
                                )

                                OutlinedTextField(
                                    value = patientName,
                                    onValueChange = { patientName = it },
                                    label = { Text("Full Name") },
                                    modifier = Modifier.fillMaxWidth()
                                )

                                Spacer(modifier = Modifier.height(12.dp))

                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    OutlinedTextField(
                                        value = patientAge,
                                        onValueChange = { patientAge = it },
                                        label = { Text("Age") },
                                        modifier = Modifier.weight(1f)
                                    )
                                    OutlinedTextField(
                                        value = patientGender,
                                        onValueChange = { patientGender = it },
                                        label = { Text("Gender") },
                                        modifier = Modifier.weight(1f)
                                    )
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                OutlinedTextField(
                                    value = abhaId,
                                    onValueChange = { abhaId = it },
                                    label = { Text("ABHA / Health ID") },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    }

                    2 -> {
                        // Step 2: Chronic Conditions
                        Card(
                            colors = CardDefaults.cardColors(containerColor = ClinicalCardBg),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, ClinicalBorder, RoundedCornerShape(12.dp))
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Text(
                                    text = "2. Chronic Health Conditions",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = ClinicalTextDark
                                )
                                Text(
                                    text = "Used by the deterministic rules engine to prevent contraindicated combinations.",
                                    fontSize = 12.5.sp,
                                    color = ClinicalTextMuted,
                                    modifier = Modifier.padding(top = 2.dp, bottom = 14.dp)
                                )

                                availableConditions.forEach { cond ->
                                    val isSelected = selectedConditions.contains(cond)
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 4.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(text = cond, fontSize = 14.sp, color = ClinicalTextDark)
                                        Checkbox(
                                            checked = isSelected,
                                            onCheckedChange = { checked ->
                                                if (checked) selectedConditions.add(cond)
                                                else selectedConditions.remove(cond)
                                            },
                                            colors = CheckboxDefaults.colors(checkedColor = GoogleBlue)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    3 -> {
                        // Step 3: Current Medication Intake
                        Card(
                            colors = CardDefaults.cardColors(containerColor = ClinicalCardBg),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, ClinicalBorder, RoundedCornerShape(12.dp))
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Text(
                                    text = "3. Current Active Medication",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = ClinicalTextDark
                                )
                                Text(
                                    text = "Intake your existing medication to start safety monitoring.",
                                    fontSize = 12.5.sp,
                                    color = ClinicalTextMuted,
                                    modifier = Modifier.padding(top = 2.dp, bottom = 14.dp)
                                )

                                OutlinedTextField(
                                    value = initialBrand,
                                    onValueChange = { initialBrand = it },
                                    label = { Text("Drug Brand (e.g. Amlong 5)") },
                                    modifier = Modifier.fillMaxWidth()
                                )

                                Spacer(modifier = Modifier.height(10.dp))

                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    OutlinedTextField(
                                        value = initialDose,
                                        onValueChange = { initialDose = it },
                                        label = { Text("Dose") },
                                        modifier = Modifier.weight(1f)
                                    )
                                    OutlinedTextField(
                                        value = initialFreq,
                                        onValueChange = { initialFreq = it },
                                        label = { Text("Frequency (OD/BD)") },
                                        modifier = Modifier.weight(1f)
                                    )
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                OutlinedTextField(
                                    value = initialDoctor,
                                    onValueChange = { initialDoctor = it },
                                    label = { Text("Prescribing Doctor") },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Navigation Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (currentStep > 1) {
                    OutlinedButton(
                        onClick = { currentStep -= 1 },
                        modifier = Modifier
                            .weight(1f)
                            .height(50.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Back", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    }
                }

                Button(
                    onClick = {
                        if (currentStep < 3) {
                            currentStep += 1
                        } else {
                            // Submit onboarding to live Vercel backend
                            isSubmitting = true
                            coroutineScope.launch {
                                val res = apiClient.onboardPatient(
                                    name = patientName,
                                    age = patientAge.toIntOrNull() ?: 62,
                                    gender = patientGender,
                                    conditions = selectedConditions.toList()
                                )

                                val profile = res.getOrElse {
                                    PatientProfile(
                                        id = "usr-patient-local",
                                        name = patientName,
                                        age = patientAge.toIntOrNull() ?: 62,
                                        gender = patientGender,
                                        abhaId = abhaId,
                                        conditions = selectedConditions.toList(),
                                        isRegisteredOnServer = false
                                    )
                                }

                                // Intake initial medication
                                apiClient.intakeMedication(
                                    patientId = profile.id,
                                    brand = initialBrand,
                                    dose = initialDose,
                                    freq = initialFreq,
                                    timing = "morning",
                                    instructions = "Take after breakfast with water",
                                    prescriber = initialDoctor
                                )

                                isSubmitting = false
                                onOnboardingComplete(profile)
                            }
                        }
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = GoogleBlue),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                    } else {
                        Text(
                            text = if (currentStep < 3) "Continue" else "Finish & Start Safe Plan",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}
