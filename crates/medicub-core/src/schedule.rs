use crate::model::*;

pub fn expand_schedule(items: &[RegimenItem], _date: &str) -> Vec<DoseSlot> {
    let mut morning_items = Vec::new();
    let mut noon_items = Vec::new();
    let mut night_items = Vec::new();
    let mut bedtime_items = Vec::new();

    for item in items {
        if item.status != "active" {
            continue;
        }

        let freq = item.frequency.to_uppercase();
        let timing_lower: Vec<String> = item.timing.iter().map(|t| t.to_lowercase()).collect();

        let in_morning = timing_lower.iter().any(|t| t.contains("morn"))
            || freq == "OD"
            || freq == "BD"
            || freq == "TDS"
            || freq == "QID";

        let in_noon = timing_lower
            .iter()
            .any(|t| t.contains("noon") || t.contains("lunch"))
            || freq == "TDS"
            || freq == "QID";

        let in_night = timing_lower
            .iter()
            .any(|t| t.contains("night") || t.contains("dinner"))
            || freq == "BD"
            || freq == "TDS"
            || freq == "QID";

        let in_bedtime = timing_lower.iter().any(|t| t.contains("bed")) || freq == "HS";

        let slot_item = DoseSlotItem {
            regimen_item_id: item.id.clone(),
            brand: item.brand.clone(),
            dose: item.dose.clone(),
            instructions: format!("{} - {}", item.frequency, item.prescriber_name),
            taken: false,
        };

        if in_morning {
            morning_items.push(slot_item.clone());
        }
        if in_noon {
            noon_items.push(slot_item.clone());
        }
        if in_night {
            night_items.push(slot_item.clone());
        }
        if in_bedtime {
            bedtime_items.push(slot_item);
        }
    }

    vec![
        DoseSlot {
            slot: "morning".to_string(),
            time: "08:00".to_string(),
            items: morning_items,
        },
        DoseSlot {
            slot: "noon".to_string(),
            time: "13:00".to_string(),
            items: noon_items,
        },
        DoseSlot {
            slot: "night".to_string(),
            time: "20:00".to_string(),
            items: night_items,
        },
        DoseSlot {
            slot: "bedtime".to_string(),
            time: "22:00".to_string(),
            items: bedtime_items,
        },
    ]
}
