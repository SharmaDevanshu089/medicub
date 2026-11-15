pub mod dose;
pub mod duplicate;
pub mod interaction;
pub mod reconcile;
pub mod substitution;
pub mod therapeutic;

use crate::catalog::Catalog;
use crate::model::*;

pub fn run_all(
    catalog: &Catalog,
    regimen: &[RegimenItem],
    new_items: &[RxItem],
    patient_id: &str,
    now: &str,
) -> Vec<Flag> {
    let mut flags = Vec::new();

    // 1. Duplicates
    flags.extend(duplicate::check_duplicates(
        catalog, regimen, new_items, patient_id, now,
    ));

    // 2. Therapeutic class duplication
    flags.extend(therapeutic::check_therapeutic_duplication(
        catalog, regimen, new_items, patient_id, now,
    ));

    // 3. Curated drug interactions
    flags.extend(interaction::check_interactions(
        catalog, regimen, new_items, patient_id, now,
    ));

    // 4. Maximum daily dose limits
    flags.extend(dose::check_dose_limits(
        catalog, regimen, new_items, patient_id, now,
    ));

    // Sort deterministically: Severity (Critical first), Rule ID, Flag ID
    flags.sort_by(|a, b| {
        let sev_order = |s: &Severity| match s {
            Severity::Critical => 0,
            Severity::High => 1,
            Severity::Moderate => 2,
            Severity::Low => 3,
            Severity::Info => 4,
        };
        sev_order(&a.severity)
            .cmp(&sev_order(&b.severity))
            .then_with(|| a.rule_id.cmp(&b.rule_id))
            .then_with(|| a.id.cmp(&b.id))
    });

    flags
}
