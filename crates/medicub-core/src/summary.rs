use crate::model::*;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ContextSummaryLine {
    pub text: String,
    pub source_ref: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ContextSummarySection {
    pub title: String,
    pub lines: Vec<ContextSummaryLine>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ContextSummary {
    pub patient_id: String,
    pub generated_at: String,
    pub sections: Vec<ContextSummarySection>,
}

pub fn generate_context_summary(
    patient_id: &str,
    regimen: &[RegimenItem],
    flags: &[Flag],
    now: &str,
) -> ContextSummary {
    let mut sections = Vec::new();

    // 1. Current Active Regimen
    let mut regimen_lines = Vec::new();
    for item in regimen {
        if item.status == "active" {
            regimen_lines.push(ContextSummaryLine {
                text: format!(
                    "{} (Dose: {}, Frequency: {}) prescribed by {}",
                    item.brand, item.dose, item.frequency, item.prescriber_name
                ),
                source_ref: format!("regimen:{}", item.id),
            });
        }
    }
    sections.push(ContextSummarySection {
        title: "Active Regimen".to_string(),
        lines: regimen_lines,
    });

    // 2. Open Safety Warnings
    let mut flag_lines = Vec::new();
    for flag in flags {
        if flag.status == FlagStatus::Open {
            flag_lines.push(ContextSummaryLine {
                text: format!(
                    "[{:?}] {}: {}",
                    flag.severity, flag.rule_id, flag.explain_clinician_en
                ),
                source_ref: format!("flag:{}", flag.id),
            });
        }
    }
    sections.push(ContextSummarySection {
        title: "Safety Alerts".to_string(),
        lines: flag_lines,
    });

    ContextSummary {
        patient_id: patient_id.to_string(),
        generated_at: now.to_string(),
        sections,
    }
}
