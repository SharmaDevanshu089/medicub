use medicub_core::{check_scan, load_default_catalog, RxItem, ScanOutcome};
use std::io::Cursor;

pub fn evaluate_substitution(
    prescribed_drug_id: &str,
    scanned_code: Option<&str>,
    scanned_drug_id: Option<&str>,
) -> serde_json::Value {
    let catalog = load_default_catalog();
    let pres_item = RxItem {
        id: None,
        drug_id: prescribed_drug_id.to_string(),
        brand: "Prescribed Item".to_string(),
        dose_value: 5.0,
        dose_unit: "mg".to_string(),
        frequency_code: "OD".to_string(),
        timing: vec!["morning".to_string()],
        duration_days: 30,
        instructions: None,
    };

    let result = check_scan(
        &catalog,
        &pres_item,
        scanned_code,
        scanned_drug_id,
        &[],
        "2026-11-16T18:00:00Z",
    );

    let outcome_str = match result.result {
        ScanOutcome::EquivalentCandidate => "equivalent_candidate",
        ScanOutcome::Mismatch => "mismatch",
        ScanOutcome::Unknown => "unknown",
        ScanOutcome::Duplicate => "duplicate",
        ScanOutcome::Interaction => "interaction",
    };

    serde_json::json!({
        "result": outcome_str,
        "matched_drug_id": result.matched_drug_id,
        "differences": result.differences,
        "reference": {
            "prescribed": result.reference.prescribed,
            "scanned": result.reference.scanned
        }
    })
}

pub fn parse_csv_inventory(csv_content: &str) -> Vec<serde_json::Value> {
    let mut reader = csv::Reader::from_reader(Cursor::new(csv_content.as_bytes()));
    let mut items = Vec::new();

    for record in reader.records().flatten() {
        if record.len() >= 5 {
            items.push(serde_json::json!({
                "sku_name": record.get(0).unwrap_or(""),
                "batch_no": record.get(1).unwrap_or(""),
                "expiry_on": record.get(2).unwrap_or(""),
                "qty": record.get(3).and_then(|s| s.parse::<i32>().ok()).unwrap_or(0),
                "mrp": record.get(4).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0),
                "gtin": record.get(5).unwrap_or(""),
                "manufacturer": record.get(6).unwrap_or(""),
                "pack": record.get(7).unwrap_or("")
            }));
        }
    }
    items
}

fn main() {
    println!("[Medicub Management] Offline Pharmacy Engine Initialized.");
    let test_res = evaluate_substitution("DRUG001", Some("8901082000035"), Some("DRUG003"));
    println!("[Medicub Management] Offline check result for Stamlo 5: {}", test_res["result"]);
}
