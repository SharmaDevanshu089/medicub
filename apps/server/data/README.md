# data/seed/

Synthetic and public reference data only. **Never real patients.**

Owned by the core agent; every change is reviewed by the human lead (and ideally a clinical advisor).

Files to create (layout in `docs/04-data-model.md`):
`ingredients.csv`, `therapeutic_classes.csv`, `drugs.csv`, `drug_ingredients.csv`, `interactions.csv`, `intentional_pairs.csv`, `demo_people.json`, `demo_prescriptions.json`, `inventory_demo.csv`, `eval_cases.json`.

Rules:
- Every CSV has a `source` column; interaction rows also have `reviewed` (true/false).
- Verify brand composition and strengths against the product label. Do not fill gaps from memory.
- Rows with `reviewed=false` stay off the demo path.
- The demo trio (prescribed amlodipine 5 mg brand, a combination brand containing amlodipine, an alternate amlodipine 5 mg brand) must exist and be verified, since the defining scenario depends on it.
