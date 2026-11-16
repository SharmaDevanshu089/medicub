const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Store {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = new Map();
    this.patients = new Map();
    this.consents = new Map();
    this.consentCodes = new Map();
    this.prescriptions = new Map();
    this.regimenItems = new Map();
    this.flags = new Map();
    this.dispenses = new Map();
    this.inventory = new Map();
    this.doseEvents = new Map();
    this.vitals = new Map();
    this.checkins = [];
    this.notifications = [];
    this.devices = new Map();
    this.auditLog = [];
    this.lastAuditHash = '0'.repeat(64);

    this.catalog = {
      ingredients: new Map(),
      therapeuticClasses: new Map(),
      drugs: new Map(),
      interactions: [],
      intentionalPairs: []
    };

    this.loadSeed();
    this.audit({
      actor_id: 'system',
      actor_name: 'System',
      actor_role: 'admin',
      action: 'SYSTEM_BOOTSTRAP',
      entity_type: 'system',
      entity_id: 'medicub-01',
      sentence: 'System initialized and seed data loaded successfully'
    });
  }

  parseCsv(content) {
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    
    // Parse header
    const headers = this.parseCsvLine(lines[0]);
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length >= headers.length) {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = values[idx] || '';
        });
        records.push(obj);
      }
    }
    return records;
  }

  parseCsvLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  }

  loadSeed() {
    let seedDir = path.resolve(__dirname, '../data/seed');
    if (!fs.existsSync(seedDir)) {
      seedDir = path.resolve(__dirname, '../../../data/seed');
    }
    if (!fs.existsSync(seedDir)) return;

    // 1. Classes
    const classFile = path.join(seedDir, 'therapeutic_classes.csv');
    if (fs.existsSync(classFile)) {
      const classes = this.parseCsv(fs.readFileSync(classFile, 'utf8'));
      classes.forEach(c => {
        this.catalog.therapeuticClasses.set(c.id, {
          id: c.id,
          name: c.name,
          avoid_couse: c.avoid_couse.toLowerCase() === 'true',
          note: c.note
        });
      });
    }

    // 2. Ingredients
    const ingFile = path.join(seedDir, 'ingredients.csv');
    if (fs.existsSync(ingFile)) {
      const ingredients = this.parseCsv(fs.readFileSync(ingFile, 'utf8'));
      ingredients.forEach(i => {
        this.catalog.ingredients.set(i.id, {
          id: i.id,
          inn_name: i.inn_name,
          atc_code: i.atc_code || null,
          class_id: i.class_id || null,
          max_daily_dose_mg: i.max_daily_dose_mg ? parseFloat(i.max_daily_dose_mg) : null,
          source: i.source || null
        });
      });
    }

    // 3. Drug ingredients
    const drugIngMap = new Map();
    const diFile = path.join(seedDir, 'drug_ingredients.csv');
    if (fs.existsSync(diFile)) {
      const diList = this.parseCsv(fs.readFileSync(diFile, 'utf8'));
      diList.forEach(di => {
        if (!drugIngMap.has(di.drug_id)) drugIngMap.set(di.drug_id, []);
        const ing = this.catalog.ingredients.get(di.ingredient_id);
        drugIngMap.get(di.drug_id).push({
          name: ing ? ing.inn_name : di.ingredient_id,
          ingredient_id: di.ingredient_id,
          strength_value: parseFloat(di.strength_value) || 0,
          strength_unit: di.strength_unit || 'mg'
        });
      });
    }

    // 4. Drugs
    const drugFile = path.join(seedDir, 'drugs.csv');
    if (fs.existsSync(drugFile)) {
      const drugs = this.parseCsv(fs.readFileSync(drugFile, 'utf8'));
      drugs.forEach(d => {
        this.catalog.drugs.set(d.id, {
          id: d.id,
          brand: d.brand,
          manufacturer: d.manufacturer,
          form: d.form,
          route: d.route || 'oral',
          gtin: d.gtin || null,
          image_url: d.image_url || null,
          ingredients: drugIngMap.get(d.id) || []
        });
      });
    }

    // 5. Interactions
    const intFile = path.join(seedDir, 'interactions.csv');
    if (fs.existsSync(intFile)) {
      const interactions = this.parseCsv(fs.readFileSync(intFile, 'utf8'));
      this.catalog.interactions = interactions.map(item => ({
        id: item.id,
        ingredient_a: item.ingredient_a,
        ingredient_b: item.ingredient_b,
        severity: item.severity.toLowerCase(),
        mechanism_text: item.mechanism_text,
        management_text: item.management_text,
        source: item.source,
        reviewed: item.reviewed.toLowerCase() === 'true'
      }));
    }

    // 6. Intentional pairs
    const pairsFile = path.join(seedDir, 'intentional_pairs.csv');
    if (fs.existsSync(pairsFile)) {
      this.catalog.intentionalPairs = this.parseCsv(fs.readFileSync(pairsFile, 'utf8'));
    }

    // 7. Users
    const peopleFile = path.join(seedDir, 'demo_people.json');
    if (fs.existsSync(peopleFile)) {
      const people = JSON.parse(fs.readFileSync(peopleFile, 'utf8'));
      people.forEach(p => {
        this.users.set(p.id, p);
        if (p.patient_profile) {
          this.patients.set(p.id, {
            user_id: p.id,
            name: p.name,
            phone: p.phone,
            ...p.patient_profile
          });
        }
      });
    }

    // 8. Prescriptions & active regimen
    const rxFile = path.join(seedDir, 'demo_prescriptions.json');
    if (fs.existsSync(rxFile)) {
      const rxs = JSON.parse(fs.readFileSync(rxFile, 'utf8'));
      rxs.forEach(rx => {
        this.prescriptions.set(rx.id, rx);
        if (rx.status === 'signed') {
          rx.items.forEach(it => {
            const regId = `reg-${it.id}`;
            this.regimenItems.set(regId, {
              id: regId,
              patient_id: rx.patient_id,
              drug_id: it.drug_id,
              brand: it.brand,
              dose: `${it.dose_value}${it.dose_unit}`,
              frequency: it.frequency_code,
              timing: it.timing || ['morning'],
              prescriber_name: rx.prescriber_name,
              prescriber_id: rx.prescriber_id,
              source_rx_id: rx.id,
              status: 'active',
              started_on: rx.signed_at,
              ended_on: null
            });
          });
        }
      });
    }

    // 9. Inventory demo
    const invFile = path.join(seedDir, 'inventory_demo.csv');
    if (fs.existsSync(invFile)) {
      const invList = this.parseCsv(fs.readFileSync(invFile, 'utf8'));
      invList.forEach((inv, idx) => {
        const id = `inv-${idx + 1}`;
        this.inventory.set(id, {
          id,
          facility_id: 'fac-al-shifa-chemist',
          sku_name: inv.sku_name,
          batch_no: inv.batch_no,
          expiry_on: inv.expiry_on,
          qty: parseInt(inv.qty, 10) || 0,
          mrp: parseFloat(inv.mrp) || 0,
          gtin: inv.gtin || null,
          manufacturer: inv.manufacturer || '',
          pack: inv.pack || ''
        });
      });
    }
  }

  audit({ actor_id, actor_name, actor_role, action, entity_type, entity_id, sentence, payload = {} }) {
    const seq = this.auditLog.length + 1;
    const at = new Date().toISOString();
    const prev_hash = this.lastAuditHash;

    const entryToHash = {
      seq,
      actor_id,
      actor_role,
      action,
      entity_type,
      entity_id,
      payload,
      prev_hash,
      at
    };

    const entry_hash = crypto
      .createHash('sha256')
      .update(prev_hash + JSON.stringify(entryToHash))
      .digest('hex');

    const fullEntry = {
      seq,
      actor_id,
      actor_name,
      actor_role,
      action,
      entity_type,
      entity_id,
      sentence,
      payload,
      prev_hash,
      entry_hash,
      at
    };

    this.auditLog.push(fullEntry);
    this.lastAuditHash = entry_hash;
    return fullEntry;
  }

  verifyAuditChain() {
    let prev = '0'.repeat(64);
    for (let i = 0; i < this.auditLog.length; i++) {
      const entry = this.auditLog[i];
      if (entry.prev_hash !== prev) {
        return { ok: false, checked: i, first_bad_seq: entry.seq };
      }

      const entryToHash = {
        seq: entry.seq,
        actor_id: entry.actor_id,
        actor_role: entry.actor_role,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        payload: entry.payload,
        prev_hash: entry.prev_hash,
        at: entry.at
      };

      const expectedHash = crypto
        .createHash('sha256')
        .update(entry.prev_hash + JSON.stringify(entryToHash))
        .digest('hex');

      if (expectedHash !== entry.entry_hash) {
        return { ok: false, checked: i, first_bad_seq: entry.seq };
      }
      prev = entry.entry_hash;
    }
    return { ok: true, checked: this.auditLog.length, first_bad_seq: null };
  }

  // Safety Rules Engine
  checkSafety(patientId, newItems) {
    const flags = [];
    const now = new Date().toISOString();

    const activeRegimen = Array.from(this.regimenItems.values()).filter(
      r => r.patient_id === patientId && r.status === 'active'
    );

    // Expand new items
    for (const newItem of newItems) {
      const newDrug = this.catalog.drugs.get(newItem.drug_id);
      if (!newDrug) continue;

      for (const newIng of newDrug.ingredients) {
        for (const regItem of activeRegimen) {
          const regDrug = this.catalog.drugs.get(regItem.drug_id);
          if (!regDrug) continue;

          for (const regIng of regDrug.ingredients) {
            // Rule R-DUP-001: Duplicate ingredient
            if (newIng.ingredient_id === regIng.ingredient_id) {
              const ing = this.catalog.ingredients.get(newIng.ingredient_id);
              const maxDose = ing ? ing.max_daily_dose_mg : null;

              const newDaily = newIng.strength_value * (newItem.frequency_code === 'BD' ? 2 : 1);
              const regDaily = regIng.strength_value * (regItem.frequency === 'BD' ? 2 : 1);
              const combinedDaily = newDaily + regDaily;

              const isCritical = maxDose && combinedDaily > maxDose;
              const severity = isCritical ? 'critical' : 'high';

              const flagId = `flag-dup-cross-${newIng.ingredient_id}-${regItem.id}`;
              flags.push({
                id: flagId,
                patient_id: patientId,
                rule_id: 'R-DUP-001',
                rule_version: '1.0',
                type: 'duplicate_ingredient',
                severity,
                status: 'open',
                evidence: {
                  ingredient_id: newIng.ingredient_id,
                  ingredient_name: newIng.name,
                  regimen_item: {
                    brand: regItem.brand,
                    prescriber: regItem.prescriber_name,
                    dose: regItem.dose
                  },
                  new_item: {
                    brand: newItem.brand || newDrug.brand,
                    dose: `${newItem.dose_value}${newItem.dose_unit}`
                  },
                  combined_daily_dose_mg: combinedDaily,
                  max_daily_dose_mg: maxDose
                },
                explain_clinician_en: `${newIng.name} appears in 2 active items: '${regItem.brand}' (${regItem.prescriber_name}) and '${newItem.brand || newDrug.brand}'. Combined daily dose: ${combinedDaily} mg. Is dual therapy intentional?`,
                explain_patient_en: `Two of your medicines contain the same ingredient (${newIng.name}). Please ask your doctor or pharmacist before your next dose. Don't stop any medicine on your own.`,
                explain_patient_hi: `आपकी दो दवाइयों में एक ही तत्व (${newIng.name}) है। अगली खुराक से पहले अपने डॉक्टर या फार्मासिस्ट से पूछें। अपने आप कोई दवा बंद न करें।`,
                route_to_role: 'doctor',
                created_at: now,
                decisions: []
              });
            }

            // Rule R-INT-*: Curated Interactions
            for (const inter of this.catalog.interactions) {
              if (!inter.reviewed) continue;
              const match =
                (inter.ingredient_a === newIng.ingredient_id && inter.ingredient_b === regIng.ingredient_id) ||
                (inter.ingredient_b === newIng.ingredient_id && inter.ingredient_a === regIng.ingredient_id);

              if (match) {
                const isWhitelisted = this.catalog.intentionalPairs.some(
                  p =>
                    (p.ingredient_a === newIng.ingredient_id && p.ingredient_b === regIng.ingredient_id) ||
                    (p.ingredient_b === newIng.ingredient_id && p.ingredient_a === regIng.ingredient_id)
                );

                const severity = isWhitelisted ? 'info' : inter.severity;
                const flagId = `flag-int-${inter.id}-${newIng.ingredient_id}-${regIng.ingredient_id}`;

                flags.push({
                  id: flagId,
                  patient_id: patientId,
                  rule_id: inter.id,
                  rule_version: '1.0',
                  type: 'interaction',
                  severity,
                  status: 'open',
                  evidence: {
                    interaction_id: inter.id,
                    ingredient_a: newIng.name,
                    ingredient_b: regIng.name,
                    mechanism: inter.mechanism_text,
                    management: inter.management_text,
                    source: inter.source
                  },
                  explain_clinician_en: `Interaction between '${newDrug.brand}' (${newIng.name}) and '${regItem.brand}' (${regIng.name}): ${inter.mechanism_text}. Management: ${inter.management_text}`,
                  explain_patient_en: `Your doctor is reviewing how two of your medicines (${newDrug.brand} and ${regItem.brand}) work together.`,
                  explain_patient_hi: `आपके डॉक्टर यह जांच रहे हैं कि आपकी दो दवाएं (${newDrug.brand} और ${regItem.brand}) आपस में कोई प्रतिकूल प्रभाव तो नहीं डालतीं।`,
                  route_to_role: 'doctor',
                  created_at: now,
                  decisions: []
                });
              }
            }
          }
        }
      }
    }

    return flags;
  }
}

const store = new Store();
module.exports = store;
