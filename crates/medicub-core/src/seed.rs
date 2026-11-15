use crate::catalog::Catalog;
use crate::model::*;

pub fn load_default_catalog() -> Catalog {
    let ing_csv = include_str!("../../../data/seed/ingredients.csv");
    let class_csv = include_str!("../../../data/seed/therapeutic_classes.csv");
    let drug_csv = include_str!("../../../data/seed/drugs.csv");
    let drug_ing_csv = include_str!("../../../data/seed/drug_ingredients.csv");
    let int_csv = include_str!("../../../data/seed/interactions.csv");
    let pairs_csv = include_str!("../../../data/seed/intentional_pairs.csv");

    load_catalog_from_csv(
        ing_csv,
        class_csv,
        drug_csv,
        drug_ing_csv,
        int_csv,
        pairs_csv,
    )
}

pub fn load_catalog_from_csv(
    ing_csv: &str,
    class_csv: &str,
    drug_csv: &str,
    drug_ing_csv: &str,
    int_csv: &str,
    pairs_csv: &str,
) -> Catalog {
    let mut catalog = Catalog::new();

    // 1. Classes
    let mut rdr = csv::Reader::from_reader(class_csv.as_bytes());
    for res in rdr.records().flatten() {
        if res.len() >= 3 {
            catalog.add_class(TherapeuticClass {
                id: res[0].trim().to_string(),
                name: res[1].trim().to_string(),
                avoid_couse: res[2].trim().eq_ignore_ascii_case("true"),
                note: res.get(3).map(|s| s.trim().to_string()),
            });
        }
    }

    // 2. Ingredients
    let mut rdr = csv::Reader::from_reader(ing_csv.as_bytes());
    for res in rdr.records().flatten() {
        if res.len() >= 2 {
            let max_dose = res.get(4).and_then(|s| s.trim().parse::<f64>().ok());
            catalog.add_ingredient(Ingredient {
                id: res[0].trim().to_string(),
                inn_name: res[1].trim().to_string(),
                atc_code: res.get(2).map(|s| s.trim().to_string()),
                class_id: res
                    .get(3)
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty()),
                max_daily_dose_mg: max_dose,
                source: res.get(5).map(|s| s.trim().to_string()),
            });
        }
    }

    // 3. Drug ingredients mapping
    let mut drug_ingredients_map: std::collections::HashMap<String, Vec<DrugIngredient>> =
        std::collections::HashMap::new();
    let mut rdr = csv::Reader::from_reader(drug_ing_csv.as_bytes());
    for res in rdr.records().flatten() {
        if res.len() >= 4 {
            let drug_id = res[0].trim().to_string();
            let ing_id = res[1].trim().to_string();
            let strength_val = res[2].trim().parse::<f64>().unwrap_or(0.0);
            let strength_unit = res[3].trim().to_string();

            let ing_name = catalog
                .find_ingredient(&ing_id)
                .map(|i| i.inn_name.clone())
                .unwrap_or_else(|| ing_id.clone());

            drug_ingredients_map
                .entry(drug_id)
                .or_default()
                .push(DrugIngredient {
                    name: ing_name,
                    ingredient_id: Some(ing_id),
                    strength_value: strength_val,
                    strength_unit,
                });
        }
    }

    // 4. Drugs
    let mut rdr = csv::Reader::from_reader(drug_csv.as_bytes());
    for res in rdr.records().flatten() {
        if res.len() >= 4 {
            let id = res[0].trim().to_string();
            let ingredients = drug_ingredients_map.remove(&id).unwrap_or_default();

            catalog.add_drug(Drug {
                id: id.clone(),
                brand: res[1].trim().to_string(),
                manufacturer: res[2].trim().to_string(),
                form: res[3].trim().to_string(),
                route: res.get(4).map(|s| s.trim().to_string()),
                gtin: res
                    .get(5)
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty()),
                image_url: res
                    .get(6)
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty()),
                ingredients,
            });
        }
    }

    // 5. Interactions
    let mut rdr = csv::Reader::from_reader(int_csv.as_bytes());
    for res in rdr.records().flatten() {
        if res.len() >= 8 {
            let sev = match res[3].trim().to_lowercase().as_str() {
                "critical" => Severity::Critical,
                "high" => Severity::High,
                "moderate" => Severity::Moderate,
                "low" => Severity::Low,
                _ => Severity::Info,
            };
            catalog.add_interaction(Interaction {
                id: res[0].trim().to_string(),
                ingredient_a: res[1].trim().to_string(),
                ingredient_b: res[2].trim().to_string(),
                severity: sev,
                mechanism_text: res[4].trim().to_string(),
                management_text: res[5].trim().to_string(),
                source: res[6].trim().to_string(),
                reviewed: res[7].trim().eq_ignore_ascii_case("true"),
            });
        }
    }

    // 6. Intentional pairs
    let mut rdr = csv::Reader::from_reader(pairs_csv.as_bytes());
    for res in rdr.records().flatten() {
        if res.len() >= 4 {
            catalog.add_intentional_pair(IntentionalPair {
                ingredient_a: res[0].trim().to_string(),
                ingredient_b: res[1].trim().to_string(),
                note: res[2].trim().to_string(),
                source: res[3].trim().to_string(),
            });
        }
    }

    catalog
}
