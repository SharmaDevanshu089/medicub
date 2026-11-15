use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Critical,
    High,
    Moderate,
    Low,
    Info,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FlagType {
    DuplicateIngredient,
    TherapeuticDuplication,
    Interaction,
    DailyDoseExceeded,
    SubstitutionMismatch,
    UnknownProduct,
    ReconciliationGap,
    UnreliableReading,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FlagStatus {
    Open,
    Acknowledged,
    ResolvedIntentional,
    ResolvedChange,
    DismissedFalsePositive,
    Escalated,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserRole {
    Patient,
    Doctor,
    Nurse,
    Pharmacist,
    Admin,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DrugIngredient {
    pub name: String,
    pub ingredient_id: Option<String>,
    pub strength_value: f64,
    pub strength_unit: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Drug {
    pub id: String,
    pub brand: String,
    pub manufacturer: String,
    pub form: String,
    pub route: Option<String>,
    pub gtin: Option<String>,
    pub image_url: Option<String>,
    pub ingredients: Vec<DrugIngredient>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Ingredient {
    pub id: String,
    pub inn_name: String,
    pub atc_code: Option<String>,
    pub class_id: Option<String>,
    pub max_daily_dose_mg: Option<f64>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TherapeuticClass {
    pub id: String,
    pub name: String,
    pub avoid_couse: bool,
    pub note: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Interaction {
    pub id: String,
    pub ingredient_a: String,
    pub ingredient_b: String,
    pub severity: Severity,
    pub mechanism_text: String,
    pub management_text: String,
    pub source: String,
    pub reviewed: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IntentionalPair {
    pub ingredient_a: String,
    pub ingredient_b: String,
    pub note: String,
    pub source: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RxItem {
    pub id: Option<String>,
    pub drug_id: String,
    pub brand: String,
    pub dose_value: f64,
    pub dose_unit: String,
    pub frequency_code: String,
    pub timing: Vec<String>,
    pub duration_days: i32,
    pub instructions: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RegimenItem {
    pub id: String,
    pub patient_id: String,
    pub drug_id: String,
    pub brand: String,
    pub dose: String,
    pub frequency: String,
    pub timing: Vec<String>,
    pub prescriber_name: String,
    pub status: String,
    pub started_on: String,
    pub ended_on: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Flag {
    pub id: String,
    pub patient_id: String,
    pub rule_id: String,
    pub rule_version: Option<String>,
    #[serde(rename = "type")]
    pub flag_type: FlagType,
    pub severity: Severity,
    pub status: FlagStatus,
    pub evidence: serde_json::Value,
    pub explain_clinician_en: String,
    pub explain_patient_en: String,
    pub explain_patient_hi: String,
    pub route_to_role: UserRole,
    pub assigned_to_user: Option<String>,
    pub respond_by: Option<String>,
    pub created_at: String,
    pub decisions: Vec<FlagDecision>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FlagDecision {
    pub id: String,
    pub decided_by: String,
    pub decider_name: String,
    pub decision: String,
    pub reason: String,
    pub superseding_rx_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScanOutcome {
    EquivalentCandidate,
    Mismatch,
    Unknown,
    Duplicate,
    Interaction,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DrugCard {
    pub drug_id: String,
    pub brand: String,
    pub manufacturer: String,
    pub form: String,
    pub image_url: Option<String>,
    pub ingredients: Vec<DrugIngredient>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ScanResultReference {
    pub prescribed: DrugCard,
    pub scanned: Option<DrugCard>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ScanResult {
    pub result: ScanOutcome,
    pub matched_drug_id: Option<String>,
    pub differences: Vec<String>,
    pub flags: Vec<Flag>,
    pub reference: ScanResultReference,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReadingChecklist {
    pub seated_supported: bool,
    pub rested_5min: bool,
    pub arm_heart_level: bool,
    pub no_caffeine_exercise: bool,
    pub correct_cuff_placement: bool,
    pub validated_device: bool,
    pub consistent_second_reading: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ReliabilityResult {
    pub score: u32,
    pub alert_eligible: bool,
    pub recheck_reasons: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Gs1 {
    pub gtin: Option<String>,
    pub batch: Option<String>,
    pub expiry: Option<String>,
    pub serial: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DoseSlotItem {
    pub regimen_item_id: String,
    pub brand: String,
    pub dose: String,
    pub instructions: String,
    pub taken: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DoseSlot {
    pub slot: String,
    pub time: String,
    pub items: Vec<DoseSlotItem>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Reconciliation {
    pub added: Vec<serde_json::Value>,
    pub stopped: Vec<serde_json::Value>,
    pub changed: Vec<serde_json::Value>,
    pub unresolved: Vec<serde_json::Value>,
}
