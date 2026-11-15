use crate::catalog::Catalog;
use crate::model::*;
use crate::normalize::{expand_drug_ingredients, parse_frequency_to_doses_per_day};
use std::collections::HashMap;

pub fn check_dose_limits(
    catalog: &Catalog,
    regimen: &[RegimenItem],
    new_items: &[RxItem],
    patient_id: &str,
    now: &str,
) -> Vec<Flag> {
    let mut flags = Vec::new();
    let mut daily_sums: HashMap<String, (f64, Vec<String>)> = HashMap::new();

    // Sum from active regimen
    for reg_item in regimen {
        if reg_item.status != "active" {
            continue;
        }
        let doses_per_day = parse_frequency_to_doses_per_day(&reg_item.frequency);
        if doses_per_day <= 0.0 {
            continue; // SOS
        }
        let ings = expand_drug_ingredients(catalog, &reg_item.drug_id);
        for ing in ings {
            let entry = daily_sums
                .entry(ing.ingredient_id.clone())
                .or_insert((0.0, Vec::new()));
            entry.0 += ing.strength_mg * doses_per_day;
            entry.1.push(format!(
                "{} ({:.1}mg)",
                reg_item.brand,
                ing.strength_mg * doses_per_day
            ));
        }
    }

    // Sum from new items
    for new_item in new_items {
        let doses_per_day = parse_frequency_to_doses_per_day(&new_item.frequency_code);
        if doses_per_day <= 0.0 {
            continue; // SOS
        }
        let ings = expand_drug_ingredients(catalog, &new_item.drug_id);
        for ing in ings {
            let entry = daily_sums
                .entry(ing.ingredient_id.clone())
                .or_insert((0.0, Vec::new()));
            entry.0 += ing.strength_mg * doses_per_day;
            entry.1.push(format!(
                "{} (new, {:.1}mg)",
                new_item.brand,
                ing.strength_mg * doses_per_day
            ));
        }
    }

    for (ing_id, (total_daily, sources)) in &daily_sums {
        if let Some(ing) = catalog.find_ingredient(ing_id)
            && let Some(max_mg) = ing.max_daily_dose_mg
            && *total_daily > max_mg
        {
            let ratio = *total_daily / max_mg;
            let severity = if ratio >= 1.5 {
                Severity::Critical
            } else {
                Severity::High
            };

            let flag_id = format!("flag-dose-max-{}-{}", ing_id, patient_id);

            let evidence = serde_json::json!({
                "rule_id": "R-DOSE-001",
                "ingredient_id": ing_id,
                "ingredient_name": ing.inn_name,
                "total_daily_dose_mg": total_daily,
                "max_daily_dose_mg": max_mg,
                "ratio": ratio,
                "contributing_items": sources
            });

            flags.push(Flag {
                id: flag_id,
                patient_id: patient_id.to_string(),
                rule_id: "R-DOSE-001".to_string(),
                rule_version: Some("1.0".to_string()),
                flag_type: FlagType::DailyDoseExceeded,
                severity,
                status: FlagStatus::Open,
                evidence,
                explain_clinician_en: format!(
                    "Cumulative daily dose of {} is {:.1} mg/day, exceeding the reference maximum of {:.1} mg/day. Sources: {}.",
                    ing.inn_name, total_daily, max_mg, sources.join(", ")
                ),
                explain_patient_en: format!(
                    "The combined daily dose of {} across your medicines exceeds standard guidelines. Please contact your doctor before taking this dose.",
                    ing.inn_name
                ),
                explain_patient_hi: format!(
                    "आपकी दवाओं में {} की कुल दैनिक खुराक मानक सीमा से अधिक है। कृपया यह खुराक लेने से पहले डॉक्टर से संपर्क करें।",
                    ing.inn_name
                ),
                route_to_role: UserRole::Doctor,
                assigned_to_user: None,
                respond_by: None,
                created_at: now.to_string(),
                decisions: Vec::new(),
            });
        }
    }

    flags
}
