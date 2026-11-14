# 05 · API contract (human-readable)

The machine-readable truth is `contract/openapi.yaml`. This page is the readable overview. **If they disagree, fix this page.** Only the contract agent edits `openapi.yaml`, after human approval.

## Conventions

- Base path `/v1`; JSON; UTF-8; `snake_case` fields; enums lowercase snake.
- Auth: `Authorization: Bearer <jwt>`. Roles: `patient | doctor | nurse | pharmacist | admin`.
- Times are ISO-8601 UTC (`2026-11-20T09:30:00Z`); vitals also carry `tz_offset_min`.
- IDs are UUIDv7 strings.
- **Idempotency:** every `POST` from an offline-capable client sends `Idempotency-Key` (or a `client_key` field for batches). Replays return the original result.
- **Pagination:** `?limit=50&cursor=<opaque>`; responses `{ "items": [...], "next_cursor": null }`.
- **Errors:** RFC 7807 `application/problem+json`: `{ "type", "title", "status", "detail", "code" }`. Stable `code` values include `consent_required`, `flags_unresolved`, `rx_not_signed`, `invalid_otp`, `validation_failed`.
- **Consent:** any patient-data endpoint for a non-patient caller requires an active grant with the right scope, else `403 consent_required`.

## Role × capability matrix

| Capability | patient | doctor | nurse | pharmacist | admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Own records, schedule, dose logs | ✅ | | | | |
| Create consent codes / revoke | ✅ | | | | |
| Redeem consent code | | ✅ | ✅ | ✅ | |
| Read patient summary (with grant) | self | ✅ | ✅ | `dispense` scope only | |
| Create/edit draft Rx | | ✅ | ✅ (draft only) | | |
| **Sign** Rx | | ✅ | ❌ | | |
| Decide on flags | | ✅ | ack only | dispense-origin flags: ack only | |
| Dispense / attest equivalent | | | | ✅ | |
| Inventory sync | | | | ✅ | |
| Console / seed reset | | | | | ✅ (demo mode) |

## Endpoints

### Auth and devices

| Method + path | Who | Purpose |
|---|---|---|
| `POST /v1/auth/otp/request` `{phone}` | patient | Start OTP login (demo OTP `123456` when `DEMO_MODE`) |
| `POST /v1/auth/otp/verify` `{phone, otp}` | patient | → `{access, refresh, user}` |
| `POST /v1/auth/login` `{email, password}` | clinician, pharmacist | → tokens |
| `POST /v1/auth/refresh` `{refresh}` | all | New access token |
| `GET /v1/me` | all | Current user + role + locale |
| `POST /v1/devices` `{platform, fcm_token}` | patient | Register push token |

### Consent

| Method + path | Who | Purpose |
|---|---|---|
| `POST /v1/consents/codes` `{scope[]}` | patient | → `{code, qr_payload, expires_at}` (5 min) |
| `POST /v1/consents/redeem` `{code}` | doctor, nurse, pharmacist | → consent grant (`expires_at`, scope, patient_id) |
| `GET /v1/consents` | patient | Active and past grants |
| `POST /v1/consents/{id}/revoke` | patient | Revoke now |

### Patient data (consent-scoped)

| Method + path | Purpose |
|---|---|
| `GET /v1/patients/{id}/summary` | Profile, current regimen, open flags, latest vitals, adherence % |
| `GET /v1/patients/{id}/regimen` | Current regimen items with prescriber and source Rx |
| `GET /v1/patients/{id}/timeline` | Rx, changes, flags, vitals, dispenses (paged) |
| `GET /v1/patients/{id}/schedule` | Morning/Noon/Night dose plan for patient and caregiver |
| `GET /v1/patients/{id}/reconciliation?since=` | Added / stopped / changed / unresolved |
| `GET /v1/patients/{id}/context-summary` | Second-opinion summary (deterministic; each line has `source_ref`) |
| `GET /v1/patients/{id}/fhir-bundle` | FHIR R4 Bundle export |

### Catalog

| Method + path | Purpose |
|---|---|
| `GET /v1/drugs/search?q=` | Generic-first search, returns brand + ingredients + strengths |
| `GET /v1/drugs/{id}` | Full detail |
| `GET /v1/drugs/by-code/{gtin}` | Lookup by barcode |
| `GET /v1/catalog/export?since=` | Bulk catalog (ingredients, drugs, interactions, classes) for offline `medicub-core` |

### Prescriptions

| Method + path | Who | Purpose |
|---|---|---|
| `POST /v1/prescriptions` | doctor, nurse | Create draft `{patient_id, items[]}` |
| `PUT /v1/prescriptions/{id}` | doctor, nurse | Edit draft |
| `POST /v1/prescriptions/{id}/check` | doctor, nurse | Dry-run rules → `{flags[]}` (preview, nothing persisted) |
| `POST /v1/prescriptions/{id}/decisions` | doctor | Record decision on preview flag before signing |
| `POST /v1/prescriptions/{id}/sign` | doctor | Sign. `409 flags_unresolved` if HIGH/CRITICAL lack decisions |
| `GET /v1/prescriptions/{id}` | scoped | Detail |
| `GET /v1/prescriptions/by-code/{rx_code}` | pharmacist (with `dispense` grant) | Fetch by human code |

### Flags

| Method + path | Purpose |
|---|---|
| `GET /v1/flags?status=open&route_to=me&patient_id=` | Inbox |
| `GET /v1/flags/{id}` | Detail with evidence, explanation, decision history |
| `POST /v1/flags/{id}/decision` `{decision, reason, superseding_rx_id?}` | Named-professional decision |

### Dispensing and inventory

| Method + path | Purpose |
|---|---|
| `POST /v1/dispenses` `{rx_id, facility_id}` | Start |
| `POST /v1/dispenses/{id}/scan` `{rx_item_id, code?, drug_id?, free_text?}` | → `{result, flags[], reference}` (`equivalent_candidate\|mismatch\|unknown\|duplicate\|interaction`) |
| `POST /v1/dispenses/{id}/request-verification` `{rx_item_id, note?}` | Create prescriber-routed flag (Approve/Reject card) |
| `POST /v1/dispenses/{id}/attest` `{rx_item_id}` | Pharmacist attests an equivalent match |
| `POST /v1/dispenses/{id}/complete` | Finish (only if every item attested or approved) |
| `GET /v1/dispenses/{id}` | Detail |
| `PUT /v1/facilities/{id}/inventory/sync` `{items[]}` | Bulk upsert from CSV connector (idempotent by `row_hash`) |
| `GET /v1/inventory/availability?drug_ids=&lat=&lng=` | Patient-facing: shops with `in_stock: true/false` only (no quantities or prices) |

### Adherence, vitals, check-in

| Method + path | Purpose |
|---|---|
| `POST /v1/dose-events` `{events[]}` | Batch, idempotent by `client_key` |
| `GET /v1/patients/{id}/adherence?from=&to=` | Adherence stats and missed doses |
| `POST /v1/vitals` `{readings[]}` | Batch; response includes `reliability_score`, `alert_eligible`, `recheck_recommended` |
| `GET /v1/patients/{id}/vitals?kind=&from=&to=` | Series |
| `POST /v1/checkins` `{facility_id, source}` | Patient arrival |
| `GET /v1/facilities/{id}/arrivals` | Clinic queue |

### Notifications and audit

| Method + path | Purpose |
|---|---|
| `GET /v1/notifications?since=` | Poll (web, desktop) |
| `POST /v1/notifications/{id}/read` | Mark read |
| `GET /v1/audit?entity_type=&entity_id=&patient_id=` | Human-readable audit |
| `GET /v1/audit/verify` | Recompute hash chain → `{ok, checked, first_bad_seq}` |

### Platform

| Path | Purpose |
|---|---|
| `GET /v1/health` | Liveness + DB latency |
| `GET /v1/openapi.json`, `GET /docs` | Contract + Swagger UI |
| `GET /console/*` | Admin web console (demo mode, admin token) |
| `POST /v1/admin/seed/reset` | Reset to the demo seed (demo mode, admin) |

## Notification payloads (FCM `data` map and `/v1/notifications` items)

```json
{ "kind": "FLAG_RAISED", "entity_type": "flag", "entity_id": "…",
  "title_key": "notif.flag.raised", "deep_link": "medicub://flag/…", "severity": "high" }
```

`kind` ∈ `RX_SIGNED, CONSENT_GRANTED, CONSENT_REVOKED, FLAG_RAISED, FLAG_RESOLVED, DISPENSE_BLOCKED, DISPENSE_READY, PATIENT_ARRIVED, MISSED_DOSE_CAREGIVER`. (`DOSE_DUE` and `CUFF_RECHECK_PROMPT` are local-only.) **No patient names, drug names, or readings in payloads.** Clients fetch details by ID after authenticating.

## Core schemas (field names are canonical)

`Flag`: `id, patient_id, rule_id, type, severity, status, evidence, explain_clinician_en, explain_patient_en, explain_patient_hi, route_to_role, respond_by, created_at, decisions[]`

`ScanResult`: `{ result, matched_drug_id?, differences[], flags[], reference: { prescribed: DrugCard, scanned: DrugCard | null } }`

`DrugCard`: `{ drug_id, brand, manufacturer, form, ingredients: [{ name, strength_value, strength_unit }], image_url? }`

`PrescriptionItem`: `{ drug_id, dose_value, dose_unit, frequency_code, timing[], duration_days, instructions? }`

## Change control

1. Propose in your handoff report as a diff on this page + `openapi.yaml`.
2. Human lead approves; the contract agent merges `contract/*` first.
3. Server implements. Clients regenerate or update their models. Tag `contract-vX.Y`.
