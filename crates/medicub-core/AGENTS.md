# medicub-core · agent brief

> Read `README.md`, root `AGENTS.md`, and `docs/03-safety-and-rules-engine.md` first. This crate is the **safety brain**. It is used by the server and, offline, by the pharmacy desktop app.

## Mission

A pure, deterministic Rust library that takes prescriptions, a current regimen, and optionally a scanned product, and returns ranked, explainable flags. Plus helpers for schedules, GS1 barcodes, and BP reading reliability.

## Hard constraints

- `#![forbid(unsafe_code)]`. **No IO, no async, no network, no clock, no randomness** inside rules (pass `now` in). Same input → same output, always.
- Compiles for the native targets used by the server and Tauri, and stays WASM-friendly (avoid OS-only crates).
- No `unwrap()`/`expect()` outside tests. Deterministic ordering (sort by severity desc, rule id, ids).
- Data comes in as a `Catalog` value; loading from CSV lives in a feature-gated `seed` module (`include_str!` of `data/seed/*.csv`).
- Anything clinical you must choose without a source: use the most conservative default and mark `// CLINICIAN-REVIEW`.

## Module layout

```
src/
  lib.rs            public API re-exports
  model.rs          Ingredient, Drug, Strength, Form, RxItem, RegimenItem, Flag, Severity, FlagType, Evidence
  catalog.rs        Catalog { ingredients, drugs, classes, interactions, intentional_pairs } + indices
  normalize.rs      drug → Vec<(IngredientId, Strength)>; combination expansion; unit normalisation (mg, mcg, g, IU)
  rules/
    mod.rs          RuleSet + run_all(); rule versions
    duplicate.rs    R-DUP-001 / R-DUP-002
    therapeutic.rs  R-THER-001
    interaction.rs  R-INT-*
    dose.rs         R-DOSE-001 (frequency → doses/day; reference max)
    substitution.rs R-SUB-001 / R-SUB-002; EquivalentCandidate | Mismatch | Unknown
    reconcile.rs    regimen diff: added / stopped / changed / unresolved; R-REC-001
  severity.rs       severity assignment, routing, respond_by from policy
  explain/          keyed templates en + hi with placeholders (clinician + patient variants)
  schedule.rs       frequency_code + timing → dated dose times; time-zone aware; never alters dose
  gs1.rs            GS1 element-string parser: (01) GTIN, (10) batch, (17) expiry YYMMDD, (21) serial; EAN-13 fallback
  reliability.rs    BP reading reliability score (weights in docs/03 §7)
  summary.rs        deterministic context summary; every line carries source_ref
  seed.rs           (feature "seed") CSV → Catalog
tests/
  eval.rs           harness over data/seed/eval_cases.json
```

## Public API sketch (keep it small)

```rust
pub fn check_prescription(cat: &Catalog, regimen: &[RegimenItem], new_items: &[RxItem], policy: &Policy, now: Timestamp) -> Vec<Flag>;
pub fn check_scan(cat: &Catalog, prescribed: &RxItem, scanned: ScannedProduct, regimen: &[RegimenItem], policy: &Policy, now: Timestamp) -> ScanResult;
pub fn reconcile(prev: &[RegimenItem], next: &[RegimenItem]) -> Reconciliation;
pub fn expand_schedule(items: &[RegimenItem], day: Date, tz_offset_min: i32) -> Vec<DoseSlot>;
pub fn parse_gs1(raw: &str) -> Result<Gs1, Gs1Error>;
pub fn reliability_score(answers: &ReadingChecklist) -> Reliability; // { score, alert_eligible, recheck_reasons }
pub fn explain(flag: &Flag, audience: Audience, lang: Lang) -> String;
```

`Flag.evidence` is structured data (item ids, ingredient ids, strengths, rule id + version, source refs). The UI renders "why" from it. No free-text-only flags.

## Build order

1. `model`, `catalog`, `normalize` with a 20-drug seed; unit tests for combination expansion and unit conversion.
2. `rules::duplicate`, including the hidden-in-combination case (*Amlong 5* + *Telma-AM 40/5*) → first eval case green.
3. `rules::therapeutic`, `rules::interaction` (only `reviewed=true` rows on the demo path), `rules::dose`.
4. `rules::substitution` + `check_scan` (equivalent / mismatch / unknown / duplicate with regimen).
5. `severity`, `explain` (en + hi templates), `reconcile`.
6. `gs1`, `schedule`, `reliability`.
7. **Eval harness** + CI step printing precision, recall, and false-positive rate per rule.
8. `summary` (deterministic second-opinion summary).
9. Property tests (`proptest`): normalisation idempotence, stable rule ordering, no panics on arbitrary input.

## Tests you must have

- Duplicates: within one brand family; across brands; hidden in a combination; a benign look-alike (similar brand name, different ingredient); same active in a different salt form (define the behaviour in a test).
- Substitution: same set/strength/form → equivalent; different strength; extra ingredient; missing ingredient; unknown GTIN.
- Dose overlap sums; `SOS` excluded; frequency map.
- GS1: GTIN + batch + expiry string; malformed input; bad check digit.
- Reliability: each checklist factor moves the score exactly as documented.
- Explanations: every rule ID has en + hi templates (the test fails if a key is missing).

## Seed data duties

You own the structure and loaders of `data/seed/*.csv|json`.

- Every row has `source`; interaction rows have `reviewed`.
- **Do not invent** composition, strength, or interaction facts. If you lack a verified source, leave the row out or set `reviewed=false`, and list it in your report so the human lead can verify it with the clinical advisor.
- Create the demo trio, verified against labels: the prescribed amlodipine 5 mg brand, a combination brand containing amlodipine, and an alternate amlodipine 5 mg brand, so the defining scenario works.

## Done when

`cargo test -p medicub-core` is green; the eval harness prints per-rule metrics; every flag has structured evidence and en/hi explanations; there is no IO or time access inside rules; the public API is documented with short examples.
