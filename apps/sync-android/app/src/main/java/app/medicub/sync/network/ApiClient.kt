package app.medicub.sync.network

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

sealed interface ServerState {
    data class Connected(val url: String, val latencyMs: Long, val auditOk: Boolean) : ServerState
    data object Connecting : ServerState
    data class Offline(val url: String, val errorReason: String) : ServerState
}

data class PatientProfile(
    val id: String,
    val name: String,
    val age: Int,
    val gender: String,
    val abhaId: String,
    val conditions: List<String>,
    val isRegisteredOnServer: Boolean
)

data class RegimenItem(
    val id: String,
    val brand: String,
    val dose: String,
    val frequency: String,
    val timing: String,
    val instructions: String,
    val prescriberName: String
)

data class ConsentCodeResult(
    val code: String,
    val expiresAt: String,
    val qrData: String,
    val facilityId: String
)

class ApiClient(private val context: Context) {

    companion object {
        private const val PREFS_NAME = "medicub_network_prefs"
        private const val KEY_BASE_URL = "base_url"
        private const val KEY_SAVED_PROFILE = "saved_patient_profile"

        // Default to live Vercel deployed backend; user can switch anytime
        const val DEFAULT_VERCEL_URL = "https://express-lilac-wv8e2qs.tmp.now/v1"
        const val DEFAULT_LOCAL_URL = "http://192.168.1.2:3001/v1"
        const val DEFAULT_EMULATOR_URL = "http://10.0.2.2:3001/v1"
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var currentBaseUrl: String
        get() = prefs.getString(KEY_BASE_URL, DEFAULT_VERCEL_URL) ?: DEFAULT_VERCEL_URL
        set(value) {
            prefs.edit().putString(KEY_BASE_URL, value.trim().removeSuffix("/")).apply()
        }

    fun savePatientProfile(profile: PatientProfile) {
        val json = JSONObject().apply {
            put("id", profile.id)
            put("name", profile.name)
            put("age", profile.age)
            put("gender", profile.gender)
            put("abhaId", profile.abhaId)
            put("conditions", JSONArray(profile.conditions))
            put("isRegisteredOnServer", profile.isRegisteredOnServer)
        }
        prefs.edit().putString(KEY_SAVED_PROFILE, json.toString()).apply()
    }

    fun getPatientProfile(): PatientProfile? {
        val str = prefs.getString(KEY_SAVED_PROFILE, null) ?: return null
        return try {
            val json = JSONObject(str)
            val condList = mutableListOf<String>()
            val arr = json.optJSONArray("conditions")
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    condList.add(arr.getString(i))
                }
            }
            PatientProfile(
                id = json.optString("id", "usr-patient-001"),
                name = json.optString("name", "Ramesh Kumar"),
                age = json.optInt("age", 62),
                gender = json.optString("gender", "Male"),
                abhaId = json.optString("abhaId", "91-1234-5678-9012"),
                conditions = condList,
                isRegisteredOnServer = json.optBoolean("isRegisteredOnServer", true)
            )
        } catch (e: Exception) {
            null
        }
    }

    fun clearPatientProfile() {
        prefs.edit().remove(KEY_SAVED_PROFILE).apply()
    }

    suspend fun checkHealth(): ServerState = withContext(Dispatchers.IO) {
        val start = System.currentTimeMillis()
        val targetUrl = "$currentBaseUrl/audit/verify"
        try {
            val url = URL(targetUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 4000
            conn.readTimeout = 4000
            conn.requestMethod = "GET"

            val code = conn.responseCode
            if (code in 200..299) {
                val reader = BufferedReader(InputStreamReader(conn.inputStream))
                val resp = reader.readText()
                reader.close()
                val json = JSONObject(resp)
                val auditOk = json.optBoolean("ok", true)
                val latency = System.currentTimeMillis() - start
                ServerState.Connected(currentBaseUrl, latency, auditOk)
            } else {
                ServerState.Offline(currentBaseUrl, "HTTP $code from server")
            }
        } catch (e: Exception) {
            Log.w("ApiClient", "Health check failed for $targetUrl: ${e.message}")
            ServerState.Offline(currentBaseUrl, e.localizedMessage ?: "Connection unreachable")
        }
    }

    suspend fun onboardPatient(
        name: String,
        age: Int,
        gender: String,
        conditions: List<String>
    ): Result<PatientProfile> = withContext(Dispatchers.IO) {
        try {
            val url = URL("$currentBaseUrl/onboarding/patient")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 6000
            conn.readTimeout = 6000
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true

            val body = JSONObject().apply {
                put("name", name)
                put("age", age)
                put("gender", gender)
                put("conditions", JSONArray(conditions))
            }

            val writer = OutputStreamWriter(conn.outputStream)
            writer.write(body.toString())
            writer.flush()
            writer.close()

            val code = conn.responseCode
            if (code in 200..299) {
                val reader = BufferedReader(InputStreamReader(conn.inputStream))
                val resp = reader.readText()
                reader.close()
                val json = JSONObject(resp)
                val patId = json.optString("patient_id", "usr-patient-001")
                val userObj = json.optJSONObject("user")
                val profileObj = userObj?.optJSONObject("patient_profile")
                val abha = profileObj?.optString("abha_id", "91-1234-5678-9012") ?: "91-1234-5678-9012"

                val profile = PatientProfile(
                    id = patId,
                    name = name,
                    age = age,
                    gender = gender,
                    abhaId = abha,
                    conditions = conditions,
                    isRegisteredOnServer = true
                )
                savePatientProfile(profile)
                Result.success(profile)
            } else {
                // Offline fallback profile
                val fallbackProfile = PatientProfile(
                    id = "local-pat-${System.currentTimeMillis()}",
                    name = name,
                    age = age,
                    gender = gender,
                    abhaId = "91-${(1000..9999).random()}-${(1000..9999).random()}-9012",
                    conditions = conditions,
                    isRegisteredOnServer = false
                )
                savePatientProfile(fallbackProfile)
                Result.success(fallbackProfile)
            }
        } catch (e: Exception) {
            Log.e("ApiClient", "Patient onboarding fallback to local: ${e.message}")
            val fallbackProfile = PatientProfile(
                id = "local-pat-${System.currentTimeMillis()}",
                name = name,
                age = age,
                gender = gender,
                abhaId = "91-1234-5678-9012",
                conditions = conditions,
                isRegisteredOnServer = false
            )
            savePatientProfile(fallbackProfile)
            Result.success(fallbackProfile)
        }
    }

    suspend fun intakeMedication(
        patientId: String,
        brand: String,
        dose: String,
        freq: String,
        timing: String,
        instructions: String,
        prescriber: String
    ): Result<RegimenItem> = withContext(Dispatchers.IO) {
        try {
            val url = URL("$currentBaseUrl/regimens/intake")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 6000
            conn.readTimeout = 6000
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true

            val body = JSONObject().apply {
                put("patient_id", patientId)
                put("brand", brand)
                put("dose_value", dose)
                put("frequency_code", freq)
                put("timing", timing)
                put("instructions", instructions)
                put("prescriber_name", prescriber)
            }

            val writer = OutputStreamWriter(conn.outputStream)
            writer.write(body.toString())
            writer.flush()
            writer.close()

            val code = conn.responseCode
            if (code in 200..299) {
                val reader = BufferedReader(InputStreamReader(conn.inputStream))
                val resp = reader.readText()
                reader.close()
                val json = JSONObject(resp)
                val regObj = json.optJSONObject("regimen_item")
                val regId = regObj?.optString("id", "reg-${System.currentTimeMillis()}") ?: "reg-${System.currentTimeMillis()}"

                Result.success(
                    RegimenItem(
                        id = regId,
                        brand = brand,
                        dose = dose,
                        frequency = freq,
                        timing = timing,
                        instructions = instructions,
                        prescriberName = prescriber
                    )
                )
            } else {
                Result.success(
                    RegimenItem(
                        id = "reg-local-${System.currentTimeMillis()}",
                        brand = brand,
                        dose = dose,
                        frequency = freq,
                        timing = timing,
                        instructions = instructions,
                        prescriberName = prescriber
                    )
                )
            }
        } catch (e: Exception) {
            Result.success(
                RegimenItem(
                    id = "reg-local-${System.currentTimeMillis()}",
                    brand = brand,
                    dose = dose,
                    frequency = freq,
                    timing = timing,
                    instructions = instructions,
                    prescriberName = prescriber
                )
            )
        }
    }

    suspend fun recordDoseEvent(
        patientId: String,
        brand: String,
        status: String
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val url = URL("$currentBaseUrl/dose-events")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 4000
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true

            val isoDate = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(Date())
            val eventObj = JSONObject().apply {
                put("client_key", UUID.randomUUID().toString())
                put("patient_id", patientId)
                put("regimen_item_id", "reg-$brand")
                put("brand", brand)
                put("scheduled_time", isoDate)
                put("actual_time", isoDate)
                put("status", status)
                put("source", "patient_app")
            }

            val body = JSONObject().apply {
                put("events", JSONArray().apply { put(eventObj) })
            }

            val writer = OutputStreamWriter(conn.outputStream)
            writer.write(body.toString())
            writer.flush()
            writer.close()
            conn.responseCode in 200..299
        } catch (e: Exception) {
            Log.w("ApiClient", "Dose event offline queue: ${e.message}")
            false
        }
    }

    suspend fun logVitals(
        patientId: String,
        systolic: Int,
        diastolic: Int,
        pulseBpm: Int,
        checklistPassed: Boolean
    ): Pair<Boolean, Int> = withContext(Dispatchers.IO) {
        try {
            val url = URL("$currentBaseUrl/vitals")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 4000
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true

            val checklistObj = JSONObject().apply {
                put("seated_supported", true)
                put("rested_5min", checklistPassed)
                put("arm_heart_level", true)
                put("no_caffeine_exercise", true)
                put("correct_cuff_placement", true)
                put("validated_device", true)
                put("consistent_second_reading", true)
            }

            val readingObj = JSONObject().apply {
                put("patient_id", patientId)
                put("systolic_mmhg", systolic)
                put("diastolic_mmhg", diastolic)
                put("pulse_bpm", pulseBpm)
                put("device_class", "validated_cuff")
                put("checklist", checklistObj)
            }

            val body = JSONObject().apply {
                put("readings", JSONArray().apply { put(readingObj) })
            }

            val writer = OutputStreamWriter(conn.outputStream)
            writer.write(body.toString())
            writer.flush()
            writer.close()

            val code = conn.responseCode
            if (code in 200..299) {
                val reader = BufferedReader(InputStreamReader(conn.inputStream))
                val resp = reader.readText()
                reader.close()
                val json = JSONObject(resp)
                val results = json.optJSONArray("results")
                val firstRes = results?.optJSONObject(0)
                val score = firstRes?.optInt("reliability_score", 90) ?: 90
                Pair(true, score)
            } else {
                Pair(false, 85)
            }
        } catch (e: Exception) {
            Pair(false, 85)
        }
    }

    suspend fun createConsentCode(patientId: String): ConsentCodeResult = withContext(Dispatchers.IO) {
        try {
            val url = URL("$currentBaseUrl/consents/codes")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 4000
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true

            val body = JSONObject().apply {
                put("patient_id", patientId)
                put("target_facility_id", "fac-apollo-delhi")
                put("target_role", "doctor")
                put("expires_in_minutes", 15)
            }

            val writer = OutputStreamWriter(conn.outputStream)
            writer.write(body.toString())
            writer.flush()
            writer.close()

            val code = conn.responseCode
            if (code in 200..299) {
                val reader = BufferedReader(InputStreamReader(conn.inputStream))
                val resp = reader.readText()
                reader.close()
                val json = JSONObject(resp)
                val consentObj = json.optJSONObject("consent")
                val numericCode = consentObj?.optString("code", "847291") ?: "847291"
                val expiresAt = consentObj?.optString("expires_at", "15m") ?: "15m"
                val qrData = json.optString("qr_data", "MEDICUB:CONSENT:$numericCode:$patientId")

                ConsentCodeResult(
                    code = numericCode,
                    expiresAt = expiresAt,
                    qrData = qrData,
                    facilityId = "fac-apollo-delhi"
                )
            } else {
                createLocalConsentFallback(patientId)
            }
        } catch (e: Exception) {
            createLocalConsentFallback(patientId)
        }
    }

    private fun createLocalConsentFallback(patientId: String): ConsentCodeResult {
        val randCode = (100000..999999).random().toString()
        return ConsentCodeResult(
            code = randCode,
            expiresAt = "15m",
            qrData = "MEDICUB:OFFLINE-CONSENT:$randCode:$patientId",
            facilityId = "fac-apollo-delhi"
        )
    }
}
