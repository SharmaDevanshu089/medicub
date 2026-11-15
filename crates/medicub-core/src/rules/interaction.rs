use crate::catalog::Catalog;
use crate::model::*;
use crate::normalize::expand_drug_ingredients;

pub fn check_interactions(
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
                for r_ing in &reg_ings {
                    for inter in &catalog.interactions {
                        if !inter.reviewed {
                            continue;
                        }

                        let matches = (inter.ingredient_a == n_ing.ingredient_id
                            && inter.ingredient_b == r_ing.ingredient_id)
                            || (inter.ingredient_b == n_ing.ingredient_id
                                && inter.ingredient_a == r_ing.ingredient_id);

                        if matches {
                            let is_whitelisted = catalog
                                .is_intentional_pair(&n_ing.ingredient_id, &r_ing.ingredient_id);

                            let severity = if is_whitelisted {
                                Severity::Info
                            } else {
                                inter.severity.clone()
                            };

                            let rule_code = inter.id.clone();

                            let flag_id = format!(
                                "flag-int-{}-{}-{}-{}",
                                rule_code, n_ing.ingredient_id, r_ing.ingredient_id, patient_id
                            );

                            let evidence = serde_json::json!({
                                "rule_id": rule_code,
                                "interaction_id": inter.id,
                                "ingredient_a": n_ing.name,
                                "ingredient_b": r_ing.name,
                                "new_brand": new_item.brand,
                                "regimen_brand": reg_item.brand,
                                "mechanism": inter.mechanism_text,
                                "management": inter.management_text,
                                "source": inter.source,
                                "is_whitelisted": is_whitelisted
                            });

                            flags.push(Flag {
                                id: flag_id,
                                patient_id: patient_id.to_string(),
                                rule_id: rule_code,
                                rule_version: Some("1.0".to_string()),
                                flag_type: FlagType::Interaction,
                                severity,
                                status: FlagStatus::Open,
                                evidence,
                                explain_clinician_en: format!(
                                    "Interaction between '{}' ({}) and '{}' ({}): {}. Management: {} [Source: {}]",
                                    new_item.brand, n_ing.name, reg_item.brand, r_ing.name,
                                    inter.mechanism_text, inter.management_text, inter.source
                                ),
                                explain_patient_en: format!(
                                    "Your doctor is reviewing how two of your medicines ({} and {}) work together. Please ask your doctor before taking both.",
                                    new_item.brand, reg_item.brand
                                ),
                                explain_patient_hi: format!(
                                    "आपके डॉक्टर यह जांच रहे हैं कि आपकी दो दवाएं ({} और {}) आपस में कोई प्रतिकूल प्रभाव तो नहीं डालतीं। दोनों दवाएं लेने से पहले डॉक्टर से सलाह लें।",
                                    new_item.brand, reg_item.brand
                                ),
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
    }

    flags
}
