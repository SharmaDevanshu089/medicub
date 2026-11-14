# 04 · Data model

Postgres (Neon). IDs are UUIDv7 (time-ordered). Timestamps are `timestamptz` (UTC). Names below are the canonical table and column names. The OpenAPI schema uses the same names in `snake_case`.

## Identity and organisation

| Table | Key columns |
|---|---|
| `users` | `id`, `role` (`patient\|doctor\|nurse\|pharmacist\|admin`), `name`, `phone`, `email`, `password_hash`, `locale` (`en\|hi`), `created_at` |
| `patients` | `user_id` PK/FK, `abha_demo_id`, `dob`, `sex`, `conditions text[]`, `caregiver_user_id` null |
| `clinicians` | `user_id` PK/FK, `registration_no_demo`, `specialty`, `facility_id` |
| `facilities` | `id`, `kind` (`clinic\|pharmacy`), `name`, `lat`, `lng`, `geofence_m` |
| `team_members` | `clinician_id`, `member_user_id`, `team_role` (`lead\|assistant`) |
| `device_tokens` | `user_id`, `platform`, `fcm_token`, `updated_at` |

## Consent

| Table | Key columns |
|---|---|
| `consent_codes` | `code` PK, `patient_id`, `scope text[]`, `expires_at`, `redeemed_at` null |
| `consents` | `id`, `patient_id`, `grantee_user_id`, `scope text[]` (`clinic`, `dispense`), `status` (`active\|revoked\|expired`), `created_at`, `expires_at`, `revoked_at` |

## Drug catalog (curated, reviewed)

| Table | Key columns |
|---|---|
| `ingredients` | `id`, `inn_name`, `atc_code`, `class_id`, `max_daily_dose_mg` null, `source` |
| `therapeutic_classes` | `id`, `name`, `avoid_couse bool`, `note` |
| `drugs` | `id`, `brand`, `manufacturer`, `form`, `route`, `gtin` null, `image_url` null |
| `drug_ingredients` | `drug_id`, `ingredient_id`, `strength_value`, `strength_unit` |
| `interactions` | `id`, `ingredient_a`, `ingredient_b`, `severity`, `mechanism_text`, `management_text`, `source`, `reviewed bool` |
| `intentional_pairs` | `ingredient_a`, `ingredient_b`, `note`, `source` (whitelist, P1) |

## Prescriptions and regimen

| Table | Key columns |
|---|---|
| `prescriptions` | `id`, `rx_code` (human-readable, e.g. `RX-7K2M-9Q`), `patient_id`, `prescriber_id`, `facility_id`, `status` (`draft\|signed\|superseded\|cancelled`), `notes`, `signed_at`, `content_hash`, `supersedes_id` null |
| `prescription_items` | `id`, `rx_id`, `drug_id`, `dose_value`, `dose_unit`, `frequency_code` (`OD\|BD\|TDS\|QID\|HS\|SOS`), `timing text[]` (`morning\|noon\|night\|with_food…`), `duration_days`, `instructions` |
| `regimen_items` | `id`, `patient_id`, `drug_id`, `source_item_id`, `status` (`active\|stopped\|on_hold`), `started_on`, `ended_on` null |

`regimen_items` is maintained by the server whenever an Rx is signed or superseded. It is the **current regimen** the rules engine compares against.

## Safety

| Table | Key columns |
|---|---|
| `flags` | `id`, `patient_id`, `rule_id`, `rule_version`, `type`, `severity`, `status`, `evidence jsonb`, `explain_clinician_en`, `explain_patient_en`, `explain_patient_hi`, `route_to_role`, `assigned_to_user`, `origin` (`rx_check\|dispense\|reconcile\|vitals`), `origin_ref`, `respond_by`, `created_at`, `resolved_at` |
| `flag_decisions` | `id`, `flag_id`, `decided_by`, `decision` (`intentional\|change_planned\|dismiss_false_positive\|ack`), `reason`, `superseding_rx_id` null, `created_at` |
| `audit_log` | `id`, `seq bigint unique`, `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id`, `payload jsonb`, `prev_hash`, `entry_hash`, `at` |

## Adherence, vitals

| Table | Key columns |
|---|---|
| `dose_events` | `id`, `patient_id`, `regimen_item_id`, `scheduled_at`, `status` (`taken\|missed\|skipped\|snoozed`), `logged_at`, `source` (`app\|caregiver`), `client_key` unique (idempotency) |
| `vitals` | `id`, `patient_id`, `kind` (`bp\|hr\|glucose\|sleep`), `value jsonb`, `device_class` (`validated_cuff\|manual\|wearable_estimate`), `measured_at`, `tz_offset_min`, `reliability_score` null, `context jsonb`, `client_key` unique |

## Pharmacy

| Table | Key columns |
|---|---|
| `inventory_items` | `id`, `facility_id`, `drug_id` null (unmatched allowed), `sku_name`, `batch_no`, `expiry_on`, `qty`, `mrp`, `row_hash`, `synced_at`. Unique `(facility_id, sku_name, batch_no)` |
| `dispenses` | `id`, `rx_id`, `facility_id`, `pharmacist_id`, `status` (`in_progress\|blocked\|completed`), `created_at`, `completed_at` |
| `dispense_items` | `id`, `dispense_id`, `rx_item_id`, `scanned_drug_id` null, `scanned_code`, `result` (`equivalent_candidate\|mismatch\|unknown\|duplicate\|interaction`), `attested_by` null, `flag_id` null |

## Notifications and check-ins

| Table | Key columns |
|---|---|
| `notifications` | `id`, `user_id`, `kind`, `payload jsonb` (ids + `title_key` only), `created_at`, `delivered_at`, `read_at` |
| `checkins` | `id`, `patient_id`, `facility_id`, `source` (`geofence\|manual`), `at` |

## FHIR R4 mapping (for exports and talking to judges)

| Medicub | FHIR resource |
|---|---|
| `prescription_items` | `MedicationRequest` |
| `drugs` + `drug_ingredients` | `Medication` (with `ingredient`) |
| `dose_events` | `MedicationStatement` |
| `dispenses` / `dispense_items` | `MedicationDispense` |
| `vitals` (BP) | `Observation`: panel LOINC `85354-9`, systolic `8480-6`, diastolic `8462-4` |
| `vitals` (HR) | `Observation`: LOINC `8867-4` |
| `flags` | `DetectedIssue` |
| `consents` | `Consent` |
| `audit_log` | `AuditEvent` / `Provenance` |

## Seed data layout (`data/seed/`)

`ingredients.csv`, `therapeutic_classes.csv`, `drugs.csv`, `drug_ingredients.csv`, `interactions.csv`, `intentional_pairs.csv`, `demo_people.json` (personas), `demo_prescriptions.json`, `inventory_demo.csv` (pharmacy stock in an ERP-like export), `eval_cases.json`. Every CSV has a `source` column. Everything is synthetic or public reference data. Never real patients.
