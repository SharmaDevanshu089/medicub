use crate::catalog::Catalog;

#[derive(Debug, Clone, PartialEq)]
pub struct NormalizedIngredient {
    pub ingredient_id: String,
    pub name: String,
    pub strength_mg: f64,
}

pub fn normalize_to_mg(val: f64, unit: &str) -> f64 {
    match unit.trim().to_lowercase().as_str() {
        "mg" => val,
        "mcg" | "ug" => val / 1000.0,
        "g" => val * 1000.0,
        _ => val, // fallback e.g. IU or unspecified
    }
}

pub fn expand_drug_ingredients(catalog: &Catalog, drug_id: &str) -> Vec<NormalizedIngredient> {
    let mut result = Vec::new();
    if let Some(drug) = catalog.find_drug(drug_id) {
        for di in &drug.ingredients {
            let ing_id = di.ingredient_id.clone().unwrap_or_else(|| {
                // Try to find ingredient by name in catalog
                for (id, ing) in &catalog.ingredients {
                    if ing.inn_name.eq_ignore_ascii_case(&di.name) {
                        return id.clone();
                    }
                }
                di.name.to_lowercase().replace(' ', "-")
            });

            let name = if let Some(ing) = catalog.find_ingredient(&ing_id) {
                ing.inn_name.clone()
            } else {
                di.name.clone()
            };

            let strength_mg = normalize_to_mg(di.strength_value, &di.strength_unit);

            result.push(NormalizedIngredient {
                ingredient_id: ing_id,
                name,
                strength_mg,
            });
        }
    }
    result
}

pub fn parse_frequency_to_doses_per_day(freq: &str) -> f64 {
    match freq.trim().to_uppercase().as_str() {
        "OD" => 1.0,
        "BD" => 2.0,
        "TDS" => 3.0,
        "QID" => 4.0,
        "HS" => 1.0,
        "SOS" => 0.0, // SOS is as-needed, excluded from daily routine sums
        _ => 1.0,
    }
}
