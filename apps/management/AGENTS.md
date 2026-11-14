# Medicub Management (pharmacy desktop) · agent brief

> Read `README.md`, root `AGENTS.md`, `docs/01` (Management section), `docs/03`, `docs/05` first. You own `apps/management/**`.

## Mission

A fast, offline-capable pharmacy desktop app for Imran, who runs a small chemist. It (1) keeps a stock and expiry ledger fed by **CSV exports from whatever billing software he already uses**, (2) dispenses against a patient's digital prescription, and (3) **blocks unsafe or silent substitutions** by running the same `medicub-core` rules locally, then routes a verification card to the prescriber.

## Stack

- **Tauri v2**, Rust backend (`src-tauri`), SvelteKit (static adapter, SSR off) + TypeScript + Tailwind
- Local DB: SQLite (`rusqlite` bundled, or `sqlx` sqlite; pick one and stick to it)
- `medicub-core` as a **path dependency** in `src-tauri` (offline rules)
- Crates: `csv`, `encoding_rs`, `chrono` or `time`, `notify` (watch folder), `strsim` (fuzzy match), `reqwest` (rustls), `serde`, `thiserror`, `sha2`
- Tauri plugins: `notification`, `dialog`, `fs` (scoped), `store`/`stronghold` for tokens; **no shell plugin**; strict CSP and capability files (least privilege)
- Targets: Windows (primary, since most pharmacies run Windows) and Linux; document `tauri build` commands

## Screens

| Screen | Purpose |
|---|---|
| **Dashboard** | Low stock, expiring ≤ 90 days, prescriptions waiting, pending doctor verifications, sync status |
| **Inventory** | Searchable table (name, batch, expiry, qty, MRP), filters (expiring, low, unmatched to catalog) |
| **Import wizard** | Pick CSV → detect encoding and delimiter → map columns (saved profiles) → preview → validation report → import |
| **Dispense** | Enter/scan Rx code or patient's `dispense` QR → items checklist → per-item scan/entry → traffic-light result → attest or escalate |
| **Verifications** | Outbox + responses from prescribers (pending / approved / rejected), with age and queued-offline state |
| **Settings** | Server URL, facility, login, watch folder, mapping profiles, language |

## CSV inventory connector (the demo-critical feature)

Goal: **no re-typing, no vendor lock-in.** Retail pharmacy ERPs (Marg, RetailGraph, and similar) can export CSV/Excel reports; layouts vary, so we use **column-mapping profiles** rather than hard-coding one vendor's format. Profiles named after products are *guesses to be verified with a real export*; ship a "Generic" profile and `data/seed/inventory_demo.csv` as the reference.

- Canonical fields: `sku_name`, `batch_no`, `expiry_on`, `qty`, `mrp`, optional `gtin`, `manufacturer`, `pack`.
- Detect: encoding (UTF-8 / UTF-8-BOM / Windows-1252), delimiter (`,` `;` tab), header row, thousands separators, and date styles (`dd-mm-yyyy`, `dd/mm/yyyy`, `mm/yy`, `MMM-yy`).
- Row identity: `row_hash = sha256(sku_name|batch_no|expiry_on|qty|mrp)`; **re-import is idempotent** (upsert on `(sku_name, batch_no)`; unchanged rows skipped).
- **Validation report** before commit: counts of new / updated / unchanged / rejected rows, with reasons ("expiry in the past", "qty not a number") and a downloadable rejects CSV.
- **Catalog matching:** fuzzy-match `sku_name` to the drug catalog (`strsim` + normalised brand tokens). Suggest the best match, require a click to confirm low-confidence matches, and store the mapping. Unmatched items stay in stock but cannot be auto-checked.
- **Watch folder (P1):** `notify` watches a chosen directory; a new/changed CSV triggers the import with the saved profile and a desktop notification with the summary.
- After import, push a compact `inventory/sync` to the server (queued if offline). Patients only ever see in-stock **yes/no**, never quantities or prices.

## Dispense flow (offline-capable)

1. **Redeem** the patient's `dispense` QR/code (needs network once) → fetch the Rx and a **regimen snapshot**; cache both locally with the consent expiry.
2. For each Rx item, pharmacist **scans** the product in hand (USB scanners act as keyboards: capture rapid keystroke bursts ending in Enter; webcam scanning via `getUserMedia` + `BarcodeDetector`/zxing as a fallback) or searches by name.
3. Run **`medicub_core::check_scan`** locally (cached catalog from `GET /v1/catalog/export`, Rx item, regimen snapshot). Show:
   - 🟢 **Equivalent candidate**: same ingredients, strengths, and form. Pharmacist **attests** (recorded locally, synced).
   - 🔴 **Blocked**: mismatch / unknown / duplicate / interaction. Show prescribed vs scanned side by side (brand, composition, strength, form, image if available), the plain-language explanation, and the flag's severity. Only action: **Send to prescriber**.
4. **Send to prescriber** → `request-verification` (queued in the local outbox if offline, with a clear "will send when online" state).
5. Poll for the decision; on `FLAG_RESOLVED`/approval, raise a desktop notification and unlock that item. If the prescriber changes the Rx, reload the new items.
6. **Complete** only when every item is attested or approved. Record a dispense receipt (no prices needed).

Never provide a "dispense anyway" override on blocked items. If the pharmacist believes the block is wrong, they use *Send to prescriber* with a note.

## Local data

SQLite tables: `inventory_items`, `import_profiles`, `import_runs`, `catalog_*` (cached export), `rx_cache`, `regimen_snapshot`, `dispenses`, `dispense_items`, `outbox` (idempotency keys), `settings`. Tokens in the OS keychain/stronghold, never in plain files. Patient data in the cache expires with the consent and is purged on logout.

## UX principles

- Pharmacists are busy: keyboard-first, large result states, one primary action per screen.
- Traffic-light results use colour **plus** text/icons.
- Connection indicator in the title bar; queued items always visible.
- Plain-language explanations (English; Hindi as P1) alongside the clinical one.

## Security

Least-privilege Tauri capabilities (fs limited to the chosen folders, no arbitrary shell, no unrestricted HTTP: whitelist the server origin); strict CSP; validate all CSV input; never `eval`; no telemetry.

## Build order

1. Tauri v2 + SvelteKit skeleton, SQLite, settings, server login. **Spike: pick CSV → parse with `csv` → show rows.**
2. Import wizard (encoding/delimiter/date detection, mapping profiles, validation report, idempotent import).
3. Inventory + Dashboard views; catalog export sync (`/v1/catalog/export`).
4. Redeem Rx + regimen snapshot cache.
5. Dispense flow with core `check_scan`, attest, outbox, verification card send.
6. Poll + desktop notifications for doctor responses.
7. P1: watch folder, GS1 parsing (batch + expiry), availability publishing, image/composition comparison, Hindi explanations.
8. Packaging (`tauri build`), icon, installer, and a first-run guide.

## Tests

Rust unit tests for CSV parsing (encodings, date formats, bad rows), idempotent import, fuzzy matching; integration test: scan result for the demo trio (prescribed brand / combination brand / alternate brand) matches the eval cases; frontend `svelte-check`. Provide 3 sample CSV exports with different layouts in `apps/management/samples/` (synthetic).

## Done when

Step 4 of `docs/07` runs end to end **with the network off**, the CSV import wizard handles all sample files, blocked items cannot be dispensed, queued escalations send after reconnect, and the installer builds.
