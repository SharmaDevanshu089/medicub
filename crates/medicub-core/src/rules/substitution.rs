use crate::catalog::Catalog;
use crate::model::*;
use crate::normalize::expand_drug_ingredients;

pub fn drug_to_card(drug: &Drug) -> DrugCard {
    DrugCard {
        drug_id: drug.id.clone(),
        brand: drug.brand.clone(),
        manufacturer: drug.manufacturer.clone(),
        form: drug.form.clone(),
        image_url: drug.image_url.clone(),
        ingredients: drug.ingredients.clone(),
    }
}

pub fn check_scan(
    catalog: &Catalog,
    prescribed: &RxItem,
    scanned_code: Option<&str>,
    scanned_drug_id: Option<&str>,
    regimen: &[RegimenItem],
    now: &str,
) -> ScanResult {
    let prescribed_drug = match catalog.find_drug(&prescribed.drug_id) {
        Some(d) => d,
        None => {
            return ScanResult {
                result: ScanOutcome::Unknown,
                matched_drug_id: None,
                differences: vec!["Prescribed drug not found in catalog".to_string()],
                flags: vec![],
                reference: ScanResultReference {
                    prescribed: DrugCard {
                        drug_id: prescribed.drug_id.clone(),
                        brand: prescribed.brand.clone(),
                        manufacturer: "Unknown".to_string(),
                        form: "tablet".to_string(),
                        image_url: None,
                        ingredients: vec![],
                    },
                    scanned: None,
                },
            };
        }
    };

    let pres_card = drug_to_card(prescribed_drug);

    // Find scanned drug either by scanned_drug_id or barcode/gtin
    let scanned_drug = if let Some(id) = scanned_drug_id {
        catalog.find_drug(id)
    } else if let Some(code) = scanned_code {
        catalog.find_drug_by_gtin(code)
    } else {
        None
    };

    let scanned_drug = match scanned_drug {
        Some(d) => d,
        None => {
            // R-SUB-002: Unknown product
            let flag = Flag {
                id: format!("flag-sub-unknown-{}", prescribed.drug_id),
                patient_id: "patient-dispense".to_string(),
                rule_id: "R-SUB-002".to_string(),
                rule_version: Some("1.0".to_string()),
                flag_type: FlagType::UnknownProduct,
                severity: Severity::High,
                status: FlagStatus::Open,
                evidence: serde_json::json!({
                    "rule_id": "R-SUB-002",
                    "scanned_code": scanned_code,
                    "prescribed_drug": prescribed.brand
                }),
                explain_clinician_en: format!(
                    "Unregistered or unknown barcode '{}' scanned for prescribed '{}'. Dispensing blocked until verified.",
                    scanned_code.unwrap_or("N/A"), prescribed.brand
                ),
                explain_patient_en: "The pharmacy scanned a medicine package not recognized in the system. The pharmacist is verifying it with your doctor.".to_string(),
                explain_patient_hi: "फार्मेसी द्वारा स्कैन की गई दवा प्रणाली में पहचानी नहीं गई है। फार्मासिस्ट डॉक्टर से पुष्टि कर रहे हैं।".to_string(),
                route_to_role: UserRole::Doctor,
                assigned_to_user: None,
                respond_by: None,
                created_at: now.to_string(),
                decisions: Vec::new(),
            };

            return ScanResult {
                result: ScanOutcome::Unknown,
                matched_drug_id: None,
                differences: vec![format!(
                    "Barcode '{}' not found in drug catalog",
                    scanned_code.unwrap_or("unknown")
                )],
                flags: vec![flag],
                reference: ScanResultReference {
                    prescribed: pres_card,
                    scanned: None,
                },
            };
        }
    };

    let scan_card = drug_to_card(scanned_drug);

    // Compare prescribed vs scanned
    let mut differences = Vec::new();
    let pres_ings = expand_drug_ingredients(catalog, &prescribed_drug.id);
    let scan_ings = expand_drug_ingredients(catalog, &scanned_drug.id);

    // 1. Check form
    if !prescribed_drug
        .form
        .eq_ignore_ascii_case(&scanned_drug.form)
    {
        differences.push(format!(
            "Dosage form mismatch: Prescribed '{}' vs Scanned '{}'",
            prescribed_drug.form, scanned_drug.form
        ));
    }

    // 2. Check ingredient counts and matching
    if pres_ings.len() != scan_ings.len() {
        differences.push(format!(
            "Ingredient count mismatch: Prescribed has {} active ingredients, scanned has {}",
            pres_ings.len(),
            scan_ings.len()
        ));
    }

    for p_ing in &pres_ings {
        match scan_ings
            .iter()
            .find(|s| s.ingredient_id == p_ing.ingredient_id)
        {
            None => {
                differences.push(format!("Missing active ingredient: {}", p_ing.name));
            }
            Some(s_ing) => {
                if (s_ing.strength_mg - p_ing.strength_mg).abs() > 0.001 {
                    differences.push(format!(
                        "Strength mismatch for {}: Prescribed {:.1}mg vs Scanned {:.1}mg",
                        p_ing.name, p_ing.strength_mg, s_ing.strength_mg
                    ));
                }
            }
        }
    }

    for s_ing in &scan_ings {
        if !pres_ings
            .iter()
            .any(|p| p.ingredient_id == s_ing.ingredient_id)
        {
            differences.push(format!(
                "Extra unprescribed active ingredient: {}",
                s_ing.name
            ));
        }
    }

    if !differences.is_empty() {
        // Mismatch!
        let flag = Flag {
            id: format!(
                "flag-sub-mismatch-{}-{}",
                prescribed_drug.id, scanned_drug.id
            ),
            patient_id: "patient-dispense".to_string(),
            rule_id: "R-SUB-001".to_string(),
            rule_version: Some("1.0".to_string()),
            flag_type: FlagType::SubstitutionMismatch,
            severity: Severity::High,
            status: FlagStatus::Open,
            evidence: serde_json::json!({
                "rule_id": "R-SUB-001",
                "prescribed_drug": prescribed_drug.brand,
                "scanned_drug": scanned_drug.brand,
                "differences": differences
            }),
            explain_clinician_en: format!(
                "Substitution mismatch at pharmacy: Pharmacist scanned '{}' for prescribed '{}'. Differences: {}. Dispensing blocked.",
                scanned_drug.brand,
                prescribed_drug.brand,
                differences.join("; ")
            ),
            explain_patient_en: format!(
                "The substitute medicine scanned at the pharmacy differs from your prescription ({} vs {}). Your doctor is reviewing it.",
                scanned_drug.brand, prescribed_drug.brand
            ),
            explain_patient_hi: format!(
                "फार्मेसी में स्कैन की गई वैकल्पिक दवा आपके पर्चे से भिन्न है ({} बनाम {})। डॉक्टर इसकी समीक्षा कर रहे हैं।",
                scanned_drug.brand, prescribed_drug.brand
            ),
            route_to_role: UserRole::Doctor,
            assigned_to_user: None,
            respond_by: None,
            created_at: now.to_string(),
            decisions: Vec::new(),
        };

        return ScanResult {
            result: ScanOutcome::Mismatch,
            matched_drug_id: Some(scanned_drug.id.clone()),
            differences,
            flags: vec![flag],
            reference: ScanResultReference {
                prescribed: pres_card,
                scanned: Some(scan_card),
            },
        };
    }

    // Exact bioequivalent composition candidate!
    // Now verify if this drug produces new duplicate/interaction with remainder of patient's regimen
    let simulated_item = RxItem {
        id: None,
        drug_id: scanned_drug.id.clone(),
        brand: scanned_drug.brand.clone(),
        dose_value: prescribed.dose_value,
        dose_unit: prescribed.dose_unit.clone(),
        frequency_code: prescribed.frequency_code.clone(),
        timing: prescribed.timing.clone(),
        duration_days: prescribed.duration_days,
        instructions: prescribed.instructions.clone(),
    };

    // Filter out the prescribed item if it exists in regimen
    let remainder_regimen: Vec<RegimenItem> = regimen
        .iter()
        .filter(|r| r.drug_id != prescribed.drug_id)
        .cloned()
        .collect();

    let extra_dup = crate::rules::duplicate::check_duplicates(
        catalog,
        &remainder_regimen,
        std::slice::from_ref(&simulated_item),
        "dispense",
        now,
    );
    let extra_int = crate::rules::interaction::check_interactions(
        catalog,
        &remainder_regimen,
        std::slice::from_ref(&simulated_item),
        "dispense",
        now,
    );

    let mut all_extra = extra_dup;
    all_extra.extend(extra_int);

    if !all_extra.is_empty() {
        return ScanResult {
            result: ScanOutcome::Duplicate,
            matched_drug_id: Some(scanned_drug.id.clone()),
            differences: vec![
                "Drug triggers safety flags with existing patient regimen".to_string(),
            ],
            flags: all_extra,
            reference: ScanResultReference {
                prescribed: pres_card,
                scanned: Some(scan_card),
            },
        };
    }

    ScanResult {
        result: ScanOutcome::EquivalentCandidate,
        matched_drug_id: Some(scanned_drug.id.clone()),
        differences: vec![],
        flags: vec![],
        reference: ScanResultReference {
            prescribed: pres_card,
            scanned: Some(scan_card),
        },
    }
}
