use medicub_core::{
    RegimenItem, RxItem, ScanOutcome, check_prescription, check_scan, load_default_catalog,
};
use serde::Deserialize;
use std::collections::{HashMap, HashSet};

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct EvalScanTest {
    prescribed_drug_id: String,
    scanned_code: Option<String>,
    scanned_drug_id: Option<String>,
    expected_result: String,
    expected_rule: Option<String>,
}

#[derive(Debug, Deserialize)]
struct EvalCase {
    id: String,
    name: String,
    #[serde(default)]
    regimen: Vec<RegimenItem>,
    #[serde(default)]
    new_items: Vec<RxItem>,
    #[serde(default)]
    expected_rules: Vec<String>,
    expected_min_severity: Option<String>,
    scan_test: Option<EvalScanTest>,
}

#[test]
fn test_eval_cases_precision_and_recall() {
    let cases_json = include_str!("../../../data/seed/eval_cases.json");
    let cases: Vec<EvalCase> = serde_json::from_str(cases_json).expect("valid eval_cases.json");
    let catalog = load_default_catalog();
    let now = "2026-11-16T18:00:00Z";

    let mut true_positives = 0;
    let mut false_positives = 0;
    let mut false_negatives = 0;
    let mut rule_counts: HashMap<String, (u32, u32)> = HashMap::new(); // (actual_fired, expected_count)

    println!("\n=======================================================");
    println!("      MEDICUB RULES ENGINE EVALUATION HARNESS          ");
    println!("=======================================================");

    for case in &cases {
        if let Some(ref scan) = case.scan_test {
            let pres_item = RxItem {
                id: None,
                drug_id: scan.prescribed_drug_id.clone(),
                brand: "Prescribed Brand".to_string(),
                dose_value: 5.0,
                dose_unit: "mg".to_string(),
                frequency_code: "OD".to_string(),
                timing: vec!["morning".to_string()],
                duration_days: 30,
                instructions: None,
            };

            let res = check_scan(
                &catalog,
                &pres_item,
                scan.scanned_code.as_deref(),
                scan.scanned_drug_id.as_deref(),
                &[],
                now,
            );

            let res_str = match res.result {
                ScanOutcome::EquivalentCandidate => "equivalent_candidate",
                ScanOutcome::Mismatch => "mismatch",
                ScanOutcome::Unknown => "unknown",
                ScanOutcome::Duplicate => "duplicate",
                ScanOutcome::Interaction => "interaction",
            };

            assert_eq!(
                res_str, scan.expected_result,
                "Case {} failed: expected {}, got {}",
                case.id, scan.expected_result, res_str
            );

            println!("  [PASS] Scan Case: {} -> {}", case.name, res_str);
            true_positives += 1;
        } else {
            let flags =
                check_prescription(&catalog, &case.regimen, &case.new_items, "eval_pt", now);

            let actual_rules: HashSet<String> = flags.iter().map(|f| f.rule_id.clone()).collect();
            let expected_rules: HashSet<String> = case.expected_rules.iter().cloned().collect();

            for r in &expected_rules {
                rule_counts.entry(r.clone()).or_insert((0, 0)).1 += 1;
            }
            for r in &actual_rules {
                rule_counts.entry(r.clone()).or_insert((0, 0)).0 += 1;
            }

            let mut case_failures = Vec::new();
            for exp in &expected_rules {
                if actual_rules.contains(exp) {
                    true_positives += 1;
                } else {
                    false_negatives += 1;
                    case_failures.push(format!("Missing expected rule {}", exp));
                }
            }

            for act in &actual_rules {
                if !expected_rules.contains(act) {
                    false_positives += 1;
                    case_failures.push(format!("Unexpected actual rule {}", act));
                }
            }

            if !case_failures.is_empty() {
                panic!("Case {} FAILED: {:?}", case.id, case_failures);
            }

            if let Some(ref min_sev) = case.expected_min_severity {
                assert!(!flags.is_empty(), "Case {} expected flags", case.id);
                let highest = &flags[0].severity;
                let highest_str = format!("{:?}", highest).to_lowercase();
                assert_eq!(
                    &highest_str, min_sev,
                    "Case {} severity mismatch: expected {}, got {}",
                    case.id, min_sev, highest_str
                );
            }

            println!(
                "  [PASS] Rx Case: {} (Rules: {:?})",
                case.name,
                flags.iter().map(|f| &f.rule_id).collect::<Vec<_>>()
            );
        }
    }

    let precision = if true_positives + false_positives > 0 {
        (true_positives as f64) / ((true_positives + false_positives) as f64) * 100.0
    } else {
        100.0
    };

    let recall = if true_positives + false_negatives > 0 {
        (true_positives as f64) / ((true_positives + false_negatives) as f64) * 100.0
    } else {
        100.0
    };

    println!("\n-------------------------------------------------------");
    println!(" EVALUATION SUMMARY METRICS (DOCTOR JUDGING READY)     ");
    println!("-------------------------------------------------------");
    println!(" Total Eval Cases Tested: {}", cases.len());
    println!(" Precision:               {:.2}%", precision);
    println!(" Recall:                  {:.2}%", recall);
    println!(" False Positive Count:    {}", false_positives);
    println!(" False Negative Count:    {}", false_negatives);
    println!("-------------------------------------------------------");
    for (rule, (act, exp)) in rule_counts {
        println!("  Rule {:<12}: fired={}, expected={}", rule, act, exp);
    }
    println!("=======================================================\n");

    assert_eq!(false_negatives, 0);
    assert_eq!(false_positives, 0);
}
