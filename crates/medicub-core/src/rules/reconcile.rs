use crate::model::*;
use std::collections::HashMap;

pub fn reconcile(prev: &[RegimenItem], next: &[RegimenItem]) -> Reconciliation {
    let mut added = Vec::new();
    let mut stopped = Vec::new();
    let mut changed = Vec::new();
    let unresolved = Vec::new();

    let prev_map: HashMap<&str, &RegimenItem> = prev
        .iter()
        .map(|item| (item.drug_id.as_str(), item))
        .collect();
    let next_map: HashMap<&str, &RegimenItem> = next
        .iter()
        .map(|item| (item.drug_id.as_str(), item))
        .collect();

    for next_item in next {
        match prev_map.get(next_item.drug_id.as_str()) {
            None => {
                added.push(serde_json::json!({
                    "drug_id": next_item.drug_id,
                    "brand": next_item.brand,
                    "dose": next_item.dose,
                    "frequency": next_item.frequency,
                    "prescriber": next_item.prescriber_name
                }));
            }
            Some(prev_item) => {
                if prev_item.dose != next_item.dose || prev_item.frequency != next_item.frequency {
                    changed.push(serde_json::json!({
                        "drug_id": next_item.drug_id,
                        "brand": next_item.brand,
                        "from_dose": prev_item.dose,
                        "to_dose": next_item.dose,
                        "from_frequency": prev_item.frequency,
                        "to_frequency": next_item.frequency,
                        "prescriber": next_item.prescriber_name
                    }));
                }
            }
        }
    }

    for prev_item in prev {
        if !next_map.contains_key(prev_item.drug_id.as_str()) {
            stopped.push(serde_json::json!({
                "drug_id": prev_item.drug_id,
                "brand": prev_item.brand,
                "dose": prev_item.dose,
                "frequency": prev_item.frequency,
                "prescriber": prev_item.prescriber_name
            }));
        }
    }

    Reconciliation {
        added,
        stopped,
        changed,
        unresolved,
    }
}
