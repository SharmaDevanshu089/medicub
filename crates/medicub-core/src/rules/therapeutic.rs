use crate::catalog::Catalog;
use crate::model::*;
use crate::normalize::expand_drug_ingredients;

pub fn check_therapeutic_duplication(
    catalog: &Catalog,
    regimen: &[RegimenItem],
    new_items: &[RxItem],
    patient_id: &str,
    now: &str,
) -> Vec<Flag> {
    let mut flags = Vec::new();

    for new_item in new_items {
        let new_ings = expand_drug_ingredients(catalog, &new_item.drug_id);

        for reg_item in regimen {
            if reg_item.status != "active" {
                continue;
            }
            let reg_ings = expand_drug_ingredients(catalog, &reg_item.drug_id);

            for n_ing in &new_ings {
                let n_class_id = catalog
                    .find_ingredient(&n_ing.ingredient_id)
                    .and_then(|i| i.class_id.as_deref());

                for r_ing in &reg_ings {
                    // Skip if identical ingredient (handled by R-DUP-001)
                    if n_ing.ingredient_id == r_ing.ingredient_id {
                        continue;
                    }

                    let r_class_id = catalog
                        .find_ingredient(&r_ing.ingredient_id)
                        .and_then(|i| i.class_id.as_deref());

                    if let (Some(nc), Some(rc)) = (n_class_id, r_class_id)
                        && nc == rc
                        && let Some(th_class) = catalog.classes.get(nc)
                        && th_class.avoid_couse
                    {
                        let flag_id = format!("flag-ther-{}-{}-{}", nc, reg_item.id, patient_id);

                        let evidence = serde_json::json!({
                            "rule_id": "R-THER-001",
                            "class_id": nc,
                            "class_name": th_class.name,
                            "regimen_item": {
                                "brand": reg_item.brand,
                                "ingredient": r_ing.name
                            },
                            "new_item": {
                                "brand": new_item.brand,
                                "ingredient": n_ing.name
                            },
                            "note": th_class.note
                        });

                        flags.push(Flag {
                            id: flag_id,
                            patient_id: patient_id.to_string(),
                            rule_id: "R-THER-001".to_string(),
                            rule_version: Some("1.0".to_string()),
                            flag_type: FlagType::TherapeuticDuplication,
                            severity: Severity::High,
                            status: FlagStatus::Open,
                            evidence,
                            explain_clinician_en: format!(
                                "Therapeutic class duplication: Both '{}' ({}) and '{}' ({}) belong to class '{}'. {}",
                                reg_item.brand, r_ing.name, new_item.brand, n_ing.name, th_class.name,
                                th_class.note.as_deref().unwrap_or("")
                            ),
                            explain_patient_en: "Two of your medicines work in the exact same way for the same condition. Please consult your doctor.".to_string(),
                            explain_patient_hi: "आपकी दो दवाइयां एक ही बीमारी के लिए एक ही तरीके से काम करती हैं। कृपया अपने डॉक्टर से सलाह लें।".to_string(),
                            route_to_role: UserRole::Doctor,
                            assigned_to_user: None,
                            respond_by: None,
                            created_at: now.to_string(),
                            decisions: Vec::new(),
                        });
                    }
                }
            }
        }
    }

    flags
}
