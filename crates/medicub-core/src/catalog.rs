use crate::model::*;
use std::collections::HashMap;

#[derive(Debug, Clone, Default)]
pub struct Catalog {
    pub ingredients: HashMap<String, Ingredient>,
    pub drugs: HashMap<String, Drug>,
    pub classes: HashMap<String, TherapeuticClass>,
    pub interactions: Vec<Interaction>,
    pub intentional_pairs: Vec<IntentionalPair>,
    pub drugs_by_gtin: HashMap<String, String>,
}

impl Catalog {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add_ingredient(&mut self, ing: Ingredient) {
        self.ingredients.insert(ing.id.clone(), ing);
    }

    pub fn add_drug(&mut self, drug: Drug) {
        if let Some(ref gtin) = drug.gtin {
            self.drugs_by_gtin.insert(gtin.clone(), drug.id.clone());
        }
        self.drugs.insert(drug.id.clone(), drug);
    }

    pub fn add_class(&mut self, class: TherapeuticClass) {
        self.classes.insert(class.id.clone(), class);
    }

    pub fn add_interaction(&mut self, interaction: Interaction) {
        self.interactions.push(interaction);
    }

    pub fn add_intentional_pair(&mut self, pair: IntentionalPair) {
        self.intentional_pairs.push(pair);
    }

    pub fn find_drug(&self, drug_id: &str) -> Option<&Drug> {
        self.drugs.get(drug_id)
    }

    pub fn find_drug_by_gtin(&self, gtin: &str) -> Option<&Drug> {
        self.drugs_by_gtin
            .get(gtin)
            .and_then(|id| self.drugs.get(id))
    }

    pub fn find_ingredient(&self, ing_id: &str) -> Option<&Ingredient> {
        self.ingredients.get(ing_id)
    }

    pub fn search_drugs(&self, query: &str) -> Vec<&Drug> {
        let q = query.trim().to_lowercase();
        if q.is_empty() {
            return self.drugs.values().collect();
        }
        let mut matches = Vec::new();
        for drug in self.drugs.values() {
            if drug.brand.to_lowercase().contains(&q)
                || drug.manufacturer.to_lowercase().contains(&q)
                || drug
                    .ingredients
                    .iter()
                    .any(|i| i.name.to_lowercase().contains(&q))
            {
                matches.push(drug);
            }
        }
        matches.sort_by(|a, b| a.brand.cmp(&b.brand));
        matches
    }

    pub fn is_intentional_pair(&self, ing_a: &str, ing_b: &str) -> bool {
        self.intentional_pairs.iter().any(|p| {
            (p.ingredient_a == ing_a && p.ingredient_b == ing_b)
                || (p.ingredient_a == ing_b && p.ingredient_b == ing_a)
        })
    }
}
