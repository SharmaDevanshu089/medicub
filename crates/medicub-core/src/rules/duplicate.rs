use crate::catalog::Catalog;
use crate::model::*;
use crate::normalize::{expand_drug_ingredients, parse_frequency_to_doses_per_day};
use std::collections::HashMap;

pub fn check_duplicates(
    catalog: &Catalog,
    regimen: &[RegimenItem],
    new_items: &[RxItem],
    patient_id: &str,
    now: &str,
) -> Vec<Flag> {
    let mut flags = Vec::new();

    // 1. R-DUP-002: Duplicate ingredient within new items
    let mut new_item_ingredients: HashMap<String, Vec<(usize, &RxItem, f64)>> = HashMap::new();
    for (idx, item) in new_items.iter().enumerate() {
        let ing_list = expand_drug_ingredients(catalog, &item.drug_id);
        let doses_per_day = parse_frequency_to_doses_per_day(&item.frequency_code);
        for ing in ing_list {
            let daily_dose = ing.strength_mg * doses_per_day;
            new_item_ingredients
                .entry(ing.ingredient_id.clone())
                .or_default()
                .push((idx, item, daily_dose));
        }
    }

    for (ing_id, occurrences) in &new_item_ingredients {
        if occurrences.len() > 1 {
            let ing_name = catalog
                .find_ingredient(ing_id)
                .map(|i| i.inn_name.as_str())
                .unwrap_or(ing_id.as_str());

            let brands: Vec<String> = occurrences
                .iter()
                .map(|(_, it, _)| it.brand.clone())
                .collect();
            let flag_id = format!("flag-dup-within-{}-{}", ing_id, patient_id);

            let evidence = serde_json::json!({
                "rule_id": "R-DUP-002",
                "ingredient_id": ing_id,
                "ingredient_name": ing_name,
                "items": brands,
            });

            flags.push(Flag {
                id: flag_id,
                patient_id: patient_id.to_string(),
                rule_id: "R-DUP-002".to_string(),
                rule_version: Some("1.0".to_string()),
                flag_type: FlagType::DuplicateIngredient,
                severity: Severity::High,
                status: FlagStatus::Open,
                evidence,
                explain_clinician_en: format!(
                    "Ingredient {} appears multiple times within this single prescription ({}). Is this intentional?",
                    ing_name,
                    brands.join(", ")
                ),
                explain_patient_en: format!(
                    "Your doctor's prescription contains {} in more than one medicine. Please check with your doctor.",
                    ing_name
                ),
                explain_patient_hi: format!(
                    "आपके डॉक्टर के पर्चे में {} एक से अधिक दवाओं में मौजूद है। कृपया डॉक्टर से संपर्क करें।",
                    ing_name
                ),
                route_to_role: UserRole::Doctor,
                assigned_to_user: None,
                respond_by: None,
                created_at: now.to_string(),
                decisions: Vec::new(),
            });
        }
    }

    // 2. R-DUP-001: Duplicate ingredient across regimen and new items
    for new_item in new_items {
        let new_ings = expand_drug_ingredients(catalog, &new_item.drug_id);
        let new_doses_per_day = parse_frequency_to_doses_per_day(&new_item.frequency_code);

        for reg_item in regimen {
            if reg_item.status != "active" {
                continue;
            }
            let reg_ings = expand_drug_ingredients(catalog, &reg_item.drug_id);
            let reg_doses_per_day = parse_frequency_to_doses_per_day(&reg_item.frequency);

            for n_ing in &new_ings {
                for r_ing in &reg_ings {
                    if n_ing.ingredient_id == r_ing.ingredient_id {
                        let ing_name = &n_ing.name;
                        let max_dose = catalog
                            .find_ingredient(&n_ing.ingredient_id)
                            .and_then(|i| i.max_daily_dose_mg);

                        let new_daily = n_ing.strength_mg * new_doses_per_day;
                        let reg_daily = r_ing.strength_mg * reg_doses_per_day;
                        let combined_daily = new_daily + reg_daily;

                        let is_exceeded = max_dose.map(|m| combined_daily > m).unwrap_or(false);
                        let severity = if is_exceeded {
                            Severity::Critical
                        } else {
                            Severity::High
                        };

                        let flag_id = format!(
                            "flag-dup-cross-{}-{}-{}",
                            n_ing.ingredient_id, reg_item.id, patient_id
                        );

                        let evidence = serde_json::json!({
                            "rule_id": "R-DUP-001",
                            "ingredient_id": n_ing.ingredient_id,
                            "ingredient_name": ing_name,
                            "regimen_item": {
                                "regimen_id": reg_item.id,
                                "drug_id": reg_item.drug_id,
                                "brand": reg_item.brand,
                                "prescriber": reg_item.prescriber_name,
                                "dose": reg_item.dose,
                                "daily_dose_mg": reg_daily
                            },
                            "new_item": {
                                "drug_id": new_item.drug_id,
                                "brand": new_item.brand,
                                "daily_dose_mg": new_daily
                            },
                            "combined_daily_dose_mg": combined_daily,
                            "max_daily_dose_mg": max_dose
                        });

                        flags.push(Flag {
                            id: flag_id,
                            patient_id: patient_id.to_string(),
                            rule_id: "R-DUP-001".to_string(),
                            rule_version: Some("1.0".to_string()),
                            flag_type: FlagType::DuplicateIngredient,
                            severity,
                            status: FlagStatus::Open,
                            evidence,
                            explain_clinician_en: format!(
                                "{} appears in 2 active items: '{}' ({}) and new prescription '{}'. Combined daily dose: {:.1} mg{}. Is dual therapy intentional?",
                                ing_name,
                                reg_item.brand,
                                reg_item.prescriber_name,
                                new_item.brand,
                                combined_daily,
                                max_dose.map(|m| format!(" (Max recommended: {:.1} mg)", m)).unwrap_or_default()
                            ),
                            explain_patient_en: format!(
                                "Two of your medicines contain the same ingredient ({}). Please ask your doctor or pharmacist before your next dose. Don't stop any medicine on your own.",
                                ing_name
                            ),
                            explain_patient_hi: format!(
                                "आपकी दो दवाइयों में एक ही तत्व ({}) है। अगली खुराक से पहले अपने डॉक्टर या फार्मासिस्ट से पूछें। अपने आप कोई दवा बंद न करें।",
                                ing_name
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

    flags
}
