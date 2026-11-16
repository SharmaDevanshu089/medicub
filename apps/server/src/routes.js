const express = require('express');
const router = express.Router();
const store = require('./store');
const crypto = require('crypto');

// Auth helper
function getAuthUser(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '');
  if (token.startsWith('user_')) {
    const userId = token.replace('user_', '');
    return store.users.get(userId) || null;
  }
  // Try finding by ID directly
  return store.users.get(token) || Array.from(store.users.values())[0];
}

// 1. Health
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db_latency_ms: 1.2,
    version: '0.1.0'
  });
});

// 2. Auth
router.post('/auth/otp/request', (req, res) => {
  const { phone } = req.body;
  res.json({
    message: 'OTP sent successfully',
    demo_otp: '123456'
  });
});

router.post('/auth/otp/verify', (req, res) => {
  const { phone, otp } = req.body;
  if (otp !== '123456' && process.env.NODE_ENV !== 'production') {
    return res.status(401).json({
      type: 'https://medicub.local/errors/invalid_otp',
      title: 'Invalid OTP',
      status: 401,
      detail: 'The submitted OTP code is invalid.'
    });
  }

  // Find user by phone
  let user = Array.from(store.users.values()).find(u => u.phone === phone);
  if (!user) {
    user = store.users.get('usr-ramesh-kumar-001');
  }

  res.json({
    access: `user_${user.id}`,
    refresh: `refresh_${user.id}`,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,
      email: user.email,
      locale: user.locale || 'hi'
    }
  });
});

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = Array.from(store.users.values()).find(
    u => u.email.toLowerCase() === (email || '').toLowerCase()
  );

  if (!user || user.password !== password) {
    return res.status(401).json({
      type: 'https://medicub.local/errors/invalid_credentials',
      title: 'Invalid Credentials',
      status: 401,
      detail: 'Email or password does not match.'
    });
  }

  store.audit({
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    action: 'USER_LOGIN',
    entity_type: 'user',
    entity_id: user.id,
    sentence: `${user.name} (${user.role}) logged in`
  });

  res.json({
    access: `user_${user.id}`,
    refresh: `refresh_${user.id}`,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,
      email: user.email,
      locale: user.locale || 'en'
    }
  });
});

router.post('/auth/refresh', (req, res) => {
  const { refresh } = req.body;
  const userId = (refresh || '').replace('refresh_', '');
  const user = store.users.get(userId) || store.users.get('usr-ramesh-kumar-001');

  res.json({
    access: `user_${user.id}`,
    refresh: `refresh_${user.id}`,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,
      email: user.email,
      locale: user.locale || 'en'
    }
  });
});

router.get('/me', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-arjun-rao-004');
  res.json({
    id: user.id,
    role: user.role,
    name: user.name,
    phone: user.phone,
    email: user.email,
    locale: user.locale || 'en'
  });
});

router.post('/devices', (req, res) => {
  const user = getAuthUser(req);
  const { platform, fcm_token } = req.body;
  if (user) {
    store.devices.set(user.id, { platform, fcm_token, updated_at: new Date().toISOString() });
  }
  res.json({ registered: true });
});

// 3. Consents
router.post('/consents/codes', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-ramesh-kumar-001');
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const scope = req.body.scope || ['clinic'];

  const consentCode = {
    code,
    patient_id: user.id,
    scope,
    qr_payload: `medicub://consent/${code}`,
    expires_at
  };

  store.consentCodes.set(code, consentCode);

  store.audit({
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    action: 'CONSENT_CODE_CREATED',
    entity_type: 'consent_code',
    entity_id: code,
    sentence: `${user.name} generated time-bound QR consent code (${scope.join(', ')})`,
    payload: { scope }
  });

  res.status(201).json({
    code,
    qr_payload: consentCode.qr_payload,
    expires_at
  });
});

router.post('/consents/redeem', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-arjun-rao-004');
  const { code } = req.body;
  const consentCode = store.consentCodes.get(code);

  if (!consentCode) {
    return res.status(400).json({
      type: 'https://medicub.local/errors/invalid_consent_code',
      title: 'Invalid or Expired Consent Code',
      status: 400,
      detail: 'The provided consent code is invalid or has expired.'
    });
  }

  const id = `cst-${Date.now()}`;
  const expires_at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const consent = {
    id,
    patient_id: consentCode.patient_id,
    grantee_user_id: user.id,
    grantee_name: user.name,
    grantee_role: user.role,
    scope: consentCode.scope,
    status: 'active',
    created_at: new Date().toISOString(),
    expires_at,
    revoked_at: null
  };

  store.consents.set(id, consent);
  store.consentCodes.delete(code);

  const patient = store.users.get(consentCode.patient_id);
  store.audit({
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    action: 'CONSENT_REDEEMED',
    entity_type: 'consent',
    entity_id: id,
    sentence: `${user.name} (${user.role}) redeemed consent for patient ${patient ? patient.name : consentCode.patient_id}`
  });

  // Notify patient
  store.notifications.push({
    id: `notif-${Date.now()}`,
    user_id: consentCode.patient_id,
    kind: 'CONSENT_GRANTED',
    title_key: 'notif.consent.granted',
    payload: {
      grantee_name: user.name,
      grantee_role: user.role,
      expires_at
    },
    created_at: new Date().toISOString(),
    read_at: null
  });

  res.json(consent);
});

router.get('/consents', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-ramesh-kumar-001');
  const list = Array.from(store.consents.values()).filter(c => c.patient_id === user.id);
  res.json(list);
});

router.post('/consents/:id/revoke', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-ramesh-kumar-001');
  const consent = store.consents.get(req.params.id);
  if (!consent) {
    return res.status(404).json({ title: 'Consent not found', status: 404 });
  }

  consent.status = 'revoked';
  consent.revoked_at = new Date().toISOString();

  store.audit({
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    action: 'CONSENT_REVOKED',
    entity_type: 'consent',
    entity_id: consent.id,
    sentence: `${user.name} revoked consent grant`
  });

  res.json(consent);
});

// 4. Patients
router.get('/patients/:id/summary', (req, res) => {
  const patient = store.patients.get(req.params.id) || store.patients.get('usr-ramesh-kumar-001');
  const regimen = Array.from(store.regimenItems.values()).filter(
    r => r.patient_id === req.params.id && r.status === 'active'
  );
  const open_flags = Array.from(store.flags.values()).filter(
    f => f.patient_id === req.params.id && f.status === 'open'
  );
  const latest_vitals = Array.from(store.vitals.values()).filter(v => v.patient_id === req.params.id);

  res.json({
    patient,
    regimen,
    open_flags,
    latest_vitals,
    adherence: {
      total_scheduled: 60,
      taken_count: 57,
      missed_count: 3,
      adherence_percentage: 95.0
    }
  });
});

router.get('/patients/:id/regimen', (req, res) => {
  const items = Array.from(store.regimenItems.values()).filter(
    r => r.patient_id === req.params.id && r.status === 'active'
  );
  res.json(items);
});

router.get('/patients/:id/timeline', (req, res) => {
  const patientId = req.params.id;
  const events = [];

  // Prescriptions
  Array.from(store.prescriptions.values())
    .filter(p => p.patient_id === patientId)
    .forEach(p => {
      events.push({
        id: `tl-rx-${p.id}`,
        timestamp: p.signed_at || new Date().toISOString(),
        kind: 'prescription',
        title: `Prescription Signed (${p.rx_code})`,
        description: `Prescribed by ${p.prescriber_name}: ${p.items.map(i => i.brand).join(', ')}`,
        actor: p.prescriber_name
      });
    });

  // Flags
  Array.from(store.flags.values())
    .filter(f => f.patient_id === patientId)
    .forEach(f => {
      events.push({
        id: `tl-flag-${f.id}`,
        timestamp: f.created_at,
        kind: 'safety_flag',
        title: `Safety Flag Raised (${f.severity.toUpperCase()})`,
        description: f.explain_clinician_en,
        actor: 'Medicub Safety Rules'
      });
    });

  // Consents
  Array.from(store.consents.values())
    .filter(c => c.patient_id === patientId)
    .forEach(c => {
      events.push({
        id: `tl-cst-${c.id}`,
        timestamp: c.created_at,
        kind: 'consent',
        title: `Consent Shared (${c.scope.join(', ')})`,
        description: `Shared with ${c.grantee_name} (${c.grantee_role})`,
        actor: c.grantee_name
      });
    });

  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(events);
});

router.get('/patients/:id/schedule', (req, res) => {
  const patientId = req.params.id;
  const items = Array.from(store.regimenItems.values()).filter(
    r => r.patient_id === patientId && r.status === 'active'
  );

  const morningItems = [];
  const noonItems = [];
  const nightItems = [];
  const bedtimeItems = [];

  items.forEach(it => {
    const slotItem = {
      regimen_item_id: it.id,
      brand: it.brand,
      dose: it.dose,
      instructions: `${it.frequency} - ${it.prescriber_name}`,
      taken: false
    };

    if (it.frequency === 'OD' || it.frequency === 'BD' || it.timing.includes('morning')) {
      morningItems.push(slotItem);
    }
    if (it.frequency === 'TDS' || it.timing.includes('noon')) {
      noonItems.push(slotItem);
    }
    if (it.frequency === 'BD' || it.frequency === 'TDS' || it.timing.includes('night')) {
      nightItems.push(slotItem);
    }
    if (it.frequency === 'HS' || it.timing.includes('bedtime')) {
      bedtimeItems.push(slotItem);
    }
  });

  res.json({
    patient_id: patientId,
    date: new Date().toISOString().split('T')[0],
    slots: [
      { slot: 'morning', time: '08:00', items: morningItems },
      { slot: 'noon', time: '13:00', items: noonItems },
      { slot: 'night', time: '20:00', items: nightItems },
      { slot: 'bedtime', time: '22:00', items: bedtimeItems }
    ]
  });
});

router.get('/patients/:id/reconciliation', (req, res) => {
  res.json({
    added: [],
    stopped: [],
    changed: [],
    unresolved: Array.from(store.flags.values()).filter(
      f => f.patient_id === req.params.id && f.status === 'open'
    )
  });
});

router.get('/patients/:id/context-summary', (req, res) => {
  const patientId = req.params.id;
  const regimen = Array.from(store.regimenItems.values()).filter(
    r => r.patient_id === patientId && r.status === 'active'
  );
  const flags = Array.from(store.flags.values()).filter(
    f => f.patient_id === patientId && f.status === 'open'
  );

  res.json({
    patient_id: patientId,
    generated_at: new Date().toISOString(),
    sections: [
      {
        title: 'Active Regimen',
        lines: regimen.map(r => ({
          text: `${r.brand} (${r.dose}, ${r.frequency}) prescribed by ${r.prescriber_name}`,
          source_ref: `regimen:${r.id}`
        }))
      },
      {
        title: 'Open Safety Flags',
        lines: flags.map(f => ({
          text: `[${f.severity.toUpperCase()}] ${f.rule_id}: ${f.explain_clinician_en}`,
          source_ref: `flag:${f.id}`
        }))
      }
    ]
  });
});

router.get('/patients/:id/fhir-bundle', (req, res) => {
  res.json({
    resourceType: 'Bundle',
    type: 'collection',
    entry: []
  });
});

// 5. Catalog
router.get('/drugs/search', (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  const all = Array.from(store.catalog.drugs.values());
  if (!q) return res.json(all);

  const filtered = all.filter(
    d =>
      d.brand.toLowerCase().includes(q) ||
      d.manufacturer.toLowerCase().includes(q) ||
      d.ingredients.some(i => i.name.toLowerCase().includes(q))
  );
  res.json(filtered);
});

router.get('/drugs/:id', (req, res) => {
  const drug = store.catalog.drugs.get(req.params.id);
  if (!drug) return res.status(404).json({ title: 'Drug not found', status: 404 });
  res.json(drug);
});

router.get('/drugs/by-code/:gtin', (req, res) => {
  const drug = Array.from(store.catalog.drugs.values()).find(d => d.gtin === req.params.gtin);
  if (!drug) return res.status(404).json({ title: 'Drug not found by code', status: 404 });
  res.json(drug);
});

router.get('/catalog/export', (req, res) => {
  res.json({
    ingredients: Array.from(store.catalog.ingredients.values()),
    therapeutic_classes: Array.from(store.catalog.therapeuticClasses.values()),
    drugs: Array.from(store.catalog.drugs.values()),
    interactions: store.catalog.interactions,
    intentional_pairs: store.catalog.intentionalPairs
  });
});

// 6. Prescriptions
router.post('/prescriptions', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-arjun-rao-004');
  const { patient_id, notes, items } = req.body;

  const id = `rx-${Date.now()}`;
  const rx_code = `RX-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const rxItems = (items || []).map((it, idx) => {
    const drug = store.catalog.drugs.get(it.drug_id);
    return {
      id: `item-${id}-${idx + 1}`,
      drug_id: it.drug_id,
      brand: drug ? drug.brand : it.brand || 'Medication',
      dose_value: it.dose_value,
      dose_unit: it.dose_unit,
      frequency_code: it.frequency_code,
      timing: it.timing || ['morning'],
      duration_days: it.duration_days,
      instructions: it.instructions || ''
    };
  });

  const prescription = {
    id,
    rx_code,
    patient_id,
    prescriber_id: user.id,
    prescriber_name: user.name,
    facility_id: user.clinician_profile ? user.clinician_profile.facility_id : 'fac-clinic-01',
    status: 'draft',
    notes: notes || '',
    signed_at: null,
    content_hash: null,
    items: rxItems,
    preview_decisions: new Map()
  };

  store.prescriptions.set(id, prescription);

  store.audit({
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    action: 'PRESCRIPTION_DRAFT_CREATED',
    entity_type: 'prescription',
    entity_id: id,
    sentence: `${user.name} created draft prescription (${rx_code}) with ${rxItems.length} items`
  });

  res.status(201).json(prescription);
});

router.get('/prescriptions/:id', (req, res) => {
  const rx = store.prescriptions.get(req.params.id);
  if (!rx) return res.status(404).json({ title: 'Prescription not found', status: 404 });
  res.json(rx);
});

router.put('/prescriptions/:id', (req, res) => {
  const rx = store.prescriptions.get(req.params.id);
  if (!rx) return res.status(404).json({ title: 'Prescription not found', status: 404 });
  if (rx.status !== 'draft') {
    return res.status(400).json({ title: 'Only draft prescriptions can be modified', status: 400 });
  }

  const { items, notes } = req.body;
  if (notes !== undefined) rx.notes = notes;
  if (items) {
    rx.items = items.map((it, idx) => {
      const drug = store.catalog.drugs.get(it.drug_id);
      return {
        id: `item-${rx.id}-${idx + 1}`,
        drug_id: it.drug_id,
        brand: drug ? drug.brand : it.brand || 'Medication',
        dose_value: it.dose_value,
        dose_unit: it.dose_unit,
        frequency_code: it.frequency_code,
        timing: it.timing || ['morning'],
        duration_days: it.duration_days,
        instructions: it.instructions || ''
      };
    });
  }

  res.json(rx);
});

router.post('/prescriptions/:id/check', (req, res) => {
  const rx = store.prescriptions.get(req.params.id);
  if (!rx) return res.status(404).json({ title: 'Prescription not found', status: 404 });

  const flags = store.checkSafety(rx.patient_id, rx.items);
  res.json({ flags });
});

router.post('/prescriptions/:id/decisions', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-arjun-rao-004');
  const rx = store.prescriptions.get(req.params.id);
  if (!rx) return res.status(404).json({ title: 'Prescription not found', status: 404 });

  const { flag_id, decision, reason } = req.body;
  if (!rx.preview_decisions) rx.preview_decisions = new Map();

  rx.preview_decisions.set(flag_id, {
    decided_by: user.id,
    decider_name: user.name,
    decision,
    reason,
    created_at: new Date().toISOString()
  });

  store.audit({
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    action: 'PRESCRIPTION_CHECK_DECISION',
    entity_type: 'prescription',
    entity_id: rx.id,
    sentence: `${user.name} recorded decision '${decision}' on safety flag: "${reason}"`,
    payload: { flag_id, decision, reason }
  });

  res.json({ success: true });
});

router.post('/prescriptions/:id/sign', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-arjun-rao-004');
  const rx = store.prescriptions.get(req.params.id);
  if (!rx) return res.status(404).json({ title: 'Prescription not found', status: 404 });

  // SIGN GUARD: Check for unresolved high/critical flags
  const flags = store.checkSafety(rx.patient_id, rx.items);
  const criticalHighFlags = flags.filter(f => f.severity === 'critical' || f.severity === 'high');

  const previewDecisions = rx.preview_decisions || new Map();
  const unresolvedFlags = criticalHighFlags.filter(f => !previewDecisions.has(f.id));

  if (unresolvedFlags.length > 0) {
    return res.status(409).json({
      type: 'https://medicub.local/errors/flags_unresolved',
      title: 'Prescription Signing Blocked',
      status: 409,
      code: 'flags_unresolved',
      detail: `Prescription cannot be signed. ${unresolvedFlags.length} HIGH/CRITICAL flag(s) require a recorded prescriber decision before signing.`,
      unresolved_flags: unresolvedFlags
    });
  }

  // Sign prescription
  rx.status = 'signed';
  rx.signed_at = new Date().toISOString();
  rx.content_hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(rx.items) + rx.signed_at)
    .digest('hex');

  // Update patient's active regimen items
  rx.items.forEach(it => {
    const regId = `reg-${it.id}`;
    store.regimenItems.set(regId, {
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

  // Persist flags and attach decisions
  flags.forEach(f => {
    const dec = previewDecisions.get(f.id);
    if (dec) {
      f.status = dec.decision === 'intentional' ? 'resolved_intentional' : 'resolved_change';
      f.decisions = [
        {
          id: `dec-${Date.now()}`,
          ...dec
        }
      ];
    }
    store.flags.set(f.id, f);
  });

  store.audit({
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    action: 'PRESCRIPTION_SIGNED',
    entity_type: 'prescription',
    entity_id: rx.id,
    sentence: `${user.name} signed prescription ${rx.rx_code} (content hash: ${rx.content_hash.substring(0, 12)}...)`,
    payload: { rx_code: rx.rx_code, items_count: rx.items.length }
  });

  // Notify patient
  store.notifications.push({
    id: `notif-${Date.now()}`,
    user_id: rx.patient_id,
    kind: 'RX_SIGNED',
    title_key: 'notif.rx.signed',
    payload: { rx_id: rx.id, rx_code: rx.rx_code },
    created_at: new Date().toISOString(),
    read_at: null
  });

  res.json(rx);
});

router.get('/prescriptions/by-code/:rx_code', (req, res) => {
  const rx = Array.from(store.prescriptions.values()).find(
    p => p.rx_code.toLowerCase() === req.params.rx_code.toLowerCase()
  );
  if (!rx) return res.status(404).json({ title: 'Prescription not found', status: 404 });
  res.json(rx);
});

// 7. Flags
router.get('/flags', (req, res) => {
  let list = Array.from(store.flags.values());
  if (req.query.patient_id) {
    list = list.filter(f => f.patient_id === req.query.patient_id);
  }
  if (req.query.status) {
    list = list.filter(f => f.status === req.query.status);
  }
  res.json(list);
});

router.get('/flags/:id', (req, res) => {
  const flag = store.flags.get(req.params.id);
  if (!flag) return res.status(404).json({ title: 'Flag not found', status: 404 });
  res.json(flag);
});

router.post('/flags/:id/decision', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-arjun-rao-004');
  const flag = store.flags.get(req.params.id);
  if (!flag) return res.status(404).json({ title: 'Flag not found', status: 404 });

  const { decision, reason, superseding_rx_id } = req.body;
  const decId = `dec-${Date.now()}`;

  flag.decisions.push({
    id: decId,
    decided_by: user.id,
    decider_name: user.name,
    decision,
    reason,
    superseding_rx_id: superseding_rx_id || null,
    created_at: new Date().toISOString()
  });

  flag.status = decision === 'intentional' ? 'resolved_intentional' : 'resolved_change';

  store.audit({
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    action: 'FLAG_DECISION_RECORDED',
    entity_type: 'flag',
    entity_id: flag.id,
    sentence: `${user.name} recorded decision '${decision}' on flag ${flag.rule_id}: "${reason}"`
  });

  res.json(flag);
});

// 8. Dispensing
router.post('/dispenses', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-imran-sheikh-006');
  const { rx_id, facility_id } = req.body;
  const rx = store.prescriptions.get(rx_id);

  if (!rx) return res.status(404).json({ title: 'Prescription not found', status: 404 });

  const id = `disp-${Date.now()}`;
  const dispense = {
    id,
    rx_id,
    facility_id: facility_id || 'fac-al-shifa-chemist',
    pharmacist_id: user.id,
    status: 'in_progress',
    items: rx.items.map(it => ({
      id: `disp-item-${it.id}`,
      rx_item_id: it.id,
      scanned_drug_id: null,
      scanned_code: null,
      result: 'unknown',
      attested_by: null,
      flag_id: null
    })),
    created_at: new Date().toISOString(),
    completed_at: null
  };

  store.dispenses.set(id, dispense);

  store.audit({
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    action: 'DISPENSE_SESSION_STARTED',
    entity_type: 'dispense',
    entity_id: id,
    sentence: `${user.name} started dispense session for Rx ${rx.rx_code}`
  });

  res.status(201).json(dispense);
});

router.get('/dispenses/:id', (req, res) => {
  const disp = store.dispenses.get(req.params.id);
  if (!disp) return res.status(404).json({ title: 'Dispense session not found', status: 404 });
  res.json(disp);
});

router.post('/dispenses/:id/scan', (req, res) => {
  const disp = store.dispenses.get(req.params.id);
  if (!disp) return res.status(404).json({ title: 'Dispense session not found', status: 404 });

  const rx = store.prescriptions.get(disp.rx_id);
  const { rx_item_id, code, drug_id } = req.body;
  const rxItem = rx.items.find(i => i.id === rx_item_id);

  if (!rxItem) return res.status(404).json({ title: 'Rx item not found', status: 404 });

  const presDrug = store.catalog.drugs.get(rxItem.drug_id);
  let scannedDrug = null;

  if (drug_id) {
    scannedDrug = store.catalog.drugs.get(drug_id);
  } else if (code) {
    scannedDrug = Array.from(store.catalog.drugs.values()).find(d => d.gtin === code);
  }

  const dispItem = disp.items.find(i => i.rx_item_id === rx_item_id);

  if (!scannedDrug) {
    // Unknown
    if (dispItem) dispItem.result = 'unknown';
    return res.json({
      result: 'unknown',
      matched_drug_id: null,
      differences: [`Barcode '${code}' not found in catalog`],
      flags: [],
      reference: {
        prescribed: presDrug,
        scanned: null
      }
    });
  }

  // Check bioequivalence
  const presIngs = presDrug.ingredients;
  const scanIngs = scannedDrug.ingredients;
  const differences = [];

  if (presDrug.form !== scannedDrug.form) {
    differences.push(`Form mismatch: ${presDrug.form} vs ${scannedDrug.form}`);
  }

  if (presIngs.length !== scanIngs.length) {
    differences.push(`Ingredient count mismatch`);
  }

  presIngs.forEach(pi => {
    const match = scanIngs.find(si => si.ingredient_id === pi.ingredient_id);
    if (!match) {
      differences.push(`Missing active ingredient: ${pi.name}`);
    } else if (match.strength_value !== pi.strength_value) {
      differences.push(`Strength mismatch for ${pi.name}: ${pi.strength_value} vs ${match.strength_value}`);
    }
  });

  if (differences.length > 0) {
    if (dispItem) {
      dispItem.result = 'mismatch';
      dispItem.scanned_drug_id = scannedDrug.id;
    }
    return res.json({
      result: 'mismatch',
      matched_drug_id: scannedDrug.id,
      differences,
      flags: [
        {
          id: `flag-sub-${rxItem.id}-${scannedDrug.id}`,
          rule_id: 'R-SUB-001',
          severity: 'high',
          explain_clinician_en: `Substitution mismatch: ${scannedDrug.brand} scanned for ${presDrug.brand}. Differences: ${differences.join('; ')}`
        }
      ],
      reference: {
        prescribed: presDrug,
        scanned: scannedDrug
      }
    });
  }

  // Equivalent candidate!
  if (dispItem) {
    dispItem.result = 'equivalent_candidate';
    dispItem.scanned_drug_id = scannedDrug.id;
  }

  res.json({
    result: 'equivalent_candidate',
    matched_drug_id: scannedDrug.id,
    differences: [],
    flags: [],
    reference: {
      prescribed: presDrug,
      scanned: scannedDrug
    }
  });
});

router.post('/dispenses/:id/attest', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-imran-sheikh-006');
  const disp = store.dispenses.get(req.params.id);
  if (!disp) return res.status(404).json({ title: 'Dispense session not found', status: 404 });

  const { rx_item_id } = req.body;
  const dispItem = disp.items.find(i => i.rx_item_id === rx_item_id);
  if (!dispItem) return res.status(404).json({ title: 'Item not found', status: 404 });

  dispItem.attested_by = user.id;

  store.audit({
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    action: 'PHARMACIST_SUBSTITUTION_ATTESTED',
    entity_type: 'dispense_item',
    entity_id: dispItem.id,
    sentence: `${user.name} attested equivalent generic substitution for item ${rx_item_id}`
  });

  res.json(disp);
});

router.post('/dispenses/:id/request-verification', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-imran-sheikh-006');
  const disp = store.dispenses.get(req.params.id);
  if (!disp) return res.status(404).json({ title: 'Dispense session not found', status: 404 });

  const { rx_item_id, note } = req.body;
  const rx = store.prescriptions.get(disp.rx_id);

  const flagId = `flag-dispense-verify-${Date.now()}`;
  const flag = {
    id: flagId,
    patient_id: rx.patient_id,
    rule_id: 'R-SUB-001',
    rule_version: '1.0',
    type: 'substitution_mismatch',
    severity: 'high',
    status: 'open',
    evidence: {
      dispense_id: disp.id,
      rx_item_id,
      note
    },
    explain_clinician_en: `Pharmacist ${user.name} requests approval for substitution: "${note || 'Brand substitution requested due to stock unavailability'}"`,
    explain_patient_en: `Your pharmacy has sent a substitution request to your doctor for review.`,
    explain_patient_hi: `आपकी फार्मेसी ने डॉक्टर को दवा बदलने के लिए मंज़ूरी का अनुरोध भेजा है।`,
    route_to_role: 'doctor',
    created_at: new Date().toISOString(),
    decisions: []
  };

  store.flags.set(flagId, flag);

  store.audit({
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    action: 'DISPENSE_VERIFICATION_REQUESTED',
    entity_type: 'flag',
    entity_id: flagId,
    sentence: `${user.name} sent substitution verification card to prescriber ${rx.prescriber_name}`
  });

  res.json({ flag_id: flagId, status: 'queued' });
});

router.post('/dispenses/:id/complete', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-imran-sheikh-006');
  const disp = store.dispenses.get(req.params.id);
  if (!disp) return res.status(404).json({ title: 'Dispense session not found', status: 404 });

  disp.status = 'completed';
  disp.completed_at = new Date().toISOString();

  store.audit({
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    action: 'DISPENSE_COMPLETED',
    entity_type: 'dispense',
    entity_id: disp.id,
    sentence: `${user.name} completed dispensing for Rx ${disp.rx_id}`
  });

  res.json(disp);
});

// 9. Inventory
router.put('/facilities/:id/inventory/sync', (req, res) => {
  const { items } = req.body;
  let imported = 0;
  let updated = 0;
  let unchanged = 0;

  (items || []).forEach(it => {
    const key = `inv-${it.sku_name}-${it.batch_no}`;
    if (store.inventory.has(key)) {
      updated++;
    } else {
      imported++;
      store.inventory.set(key, {
        id: key,
        facility_id: req.params.id,
        ...it
      });
    }
  });

  res.json({ imported, updated, unchanged });
});

router.get('/inventory/availability', (req, res) => {
  res.json([
    {
      facility_id: 'fac-al-shifa-chemist',
      facility_name: 'Al-Shifa Chemist & Pharmacy',
      in_stock: true,
      lat: 28.6139,
      lng: 77.209
    }
  ]);
});

// 10. Adherence & Vitals
router.post('/dose-events', (req, res) => {
  const { events } = req.body;
  (events || []).forEach(ev => {
    store.doseEvents.set(ev.client_key, ev);
  });
  res.json({ processed: (events || []).length });
});

router.get('/patients/:id/adherence', (req, res) => {
  res.json({
    total_scheduled: 60,
    taken_count: 57,
    missed_count: 3,
    adherence_percentage: 95.0
  });
});

router.post('/vitals', (req, res) => {
  const { readings } = req.body;
  const results = (readings || []).map((r, idx) => {
    const id = `vit-${Date.now()}-${idx}`;
    let score = 85;
    if (r.checklist) {
      score = 0;
      if (r.checklist.seated_supported) score += 20;
      if (r.checklist.rested_5min) score += 20;
      if (r.checklist.arm_heart_level) score += 15;
      if (r.checklist.no_caffeine_exercise) score += 15;
      if (r.checklist.correct_cuff_placement) score += 10;
      if (r.checklist.validated_device) score += 10;
      if (r.checklist.consistent_second_reading) score += 10;
    }
    const alert_eligible = score >= 70;
    const recheck_recommended = score < 70;

    store.vitals.set(id, {
      id,
      patient_id: r.patient_id || 'usr-ramesh-kumar-001',
      ...r,
      reliability_score: score
    });

    return {
      id,
      reliability_score: score,
      alert_eligible,
      recheck_recommended
    };
  });

  res.json(results);
});

router.get('/patients/:id/vitals', (req, res) => {
  const list = Array.from(store.vitals.values()).filter(v => v.patient_id === req.params.id);
  res.json(list);
});

// 11. Checkins
router.post('/checkins', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-ramesh-kumar-001');
  const { facility_id, source } = req.body;
  store.checkins.push({
    patient_id: user.id,
    patient_name: user.name,
    facility_id,
    source: source || 'manual',
    arrived_at: new Date().toISOString()
  });

  store.audit({
    actor_id: user.id,
    actor_name: user.name,
    actor_role: user.role,
    action: 'PATIENT_CHECKIN',
    entity_type: 'facility',
    entity_id: facility_id,
    sentence: `${user.name} checked in at clinic queue (${source})`
  });

  res.status(201).json({ success: true });
});

router.get('/facilities/:id/arrivals', (req, res) => {
  const queue = store.checkins.filter(c => c.facility_id === req.params.id);
  res.json(queue);
});

// 12. Notifications
router.get('/notifications', (req, res) => {
  const user = getAuthUser(req) || store.users.get('usr-ramesh-kumar-001');
  const list = store.notifications.filter(n => n.user_id === user.id);
  res.json(list);
});

router.post('/notifications/:id/read', (req, res) => {
  const notif = store.notifications.find(n => n.id === req.params.id);
  if (notif) notif.read_at = new Date().toISOString();
  res.json({ success: true });
});

// 13. Audit
router.get('/audit', (req, res) => {
  let list = store.auditLog;
  if (req.query.patient_id) {
    list = list.filter(e => e.payload && e.payload.patient_id === req.query.patient_id);
  }
  res.json(list);
});

router.get('/audit/verify', (req, res) => {
  const result = store.verifyAuditChain();
  res.json(result);
});

// 14. Admin Reset
router.post('/admin/seed/reset', (req, res) => {
  store.reset();
  res.json({ success: true, message: 'Database reset to demo seed state' });
});

// ==========================================
// 15. ONBOARDING SUITE (Patient, Doctor, Chemist)
// ==========================================

router.get('/onboarding/status', (req, res) => {
  res.json({
    patients_count: store.patients.size,
    doctors_count: Array.from(store.users.values()).filter(u => u.role === 'doctor').length,
    pharmacists_count: Array.from(store.users.values()).filter(u => u.role === 'pharmacist').length,
    active_regimens_count: store.regimenItems.size,
    recent_patients: Array.from(store.patients.values()).slice(-5),
    recent_doctors: Array.from(store.users.values()).filter(u => u.role === 'doctor').slice(-5),
    recent_pharmacies: Array.from(store.users.values()).filter(u => u.role === 'pharmacist').slice(-5)
  });
});

router.post('/onboarding/patient', (req, res) => {
  const { name, age, gender, abha_id, phone, conditions, emergency_contact, locale } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Patient full name is required' });
  }

  const id = `usr-patient-${Date.now()}`;
  const patientUser = {
    id,
    name,
    phone: phone || '+919876543210',
    email: `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now().toString().slice(-4)}@example.in`,
    role: 'patient',
    locale: locale || 'en',
    patient_profile: {
      dob: `${new Date().getFullYear() - (parseInt(age, 10) || 45)}-01-01`,
      gender: gender || 'male',
      abha_id: abha_id || `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      allergies: [],
      chronic_conditions: Array.isArray(conditions) ? conditions : (conditions ? [conditions] : []),
      primary_prescriber_id: 'usr-arjun-rao-004',
      emergency_contact: emergency_contact || { name: 'Family Contact', phone: '+919999988888', relation: 'Kin' }
    }
  };

  store.users.set(id, patientUser);
  store.patients.set(id, {
    user_id: id,
    name,
    phone: patientUser.phone,
    ...patientUser.patient_profile
  });

  store.audit({
    actor_id: id,
    actor_name: name,
    actor_role: 'patient',
    action: 'PATIENT_ONBOARDED',
    entity_type: 'patient',
    entity_id: id,
    sentence: `Patient ${name} (ABHA: ${patientUser.patient_profile.abha_id}) completed digital onboarding`
  });

  res.status(201).json({
    success: true,
    patient_id: id,
    user: patientUser
  });
});

router.post('/onboarding/doctor', (req, res) => {
  const { name, specialty, reg_no, clinic_name, phone, email } = req.body;
  if (!name || !specialty) {
    return res.status(400).json({ error: 'Doctor name and specialty are required' });
  }

  const id = `usr-doc-${Date.now()}`;
  const docUser = {
    id,
    name: name.startsWith('Dr.') ? name : `Dr. ${name}`,
    phone: phone || '+919811223344',
    email: email || `${name.toLowerCase().replace(/[^a-z]/g, '')}@clinic.in`,
    role: 'doctor',
    specialty,
    reg_no: reg_no || `MCI-${Math.floor(10000 + Math.random() * 90000)}`,
    clinic_name: clinic_name || 'City Specialty Clinic',
    locale: 'en'
  };

  store.users.set(id, docUser);

  store.audit({
    actor_id: id,
    actor_name: docUser.name,
    actor_role: 'doctor',
    action: 'DOCTOR_ONBOARDED',
    entity_type: 'practitioner',
    entity_id: id,
    sentence: `${docUser.name} (${docUser.specialty}, Reg: ${docUser.reg_no}) onboarded at ${docUser.clinic_name}`
  });

  res.status(201).json({
    success: true,
    doctor_id: id,
    user: docUser
  });
});

router.post('/onboarding/pharmacy', (req, res) => {
  const { pharmacy_name, pharmacist_name, license_no, location, phone } = req.body;
  if (!pharmacy_name || !pharmacist_name) {
    return res.status(400).json({ error: 'Pharmacy name and pharmacist name are required' });
  }

  const id = `usr-pharm-${Date.now()}`;
  const pharmUser = {
    id,
    name: pharmacist_name,
    phone: phone || '+919822334455',
    email: `${pharmacist_name.toLowerCase().replace(/[^a-z]/g, '')}@pharmacy.in`,
    role: 'pharmacist',
    pharmacy_name,
    license_no: license_no || `DL-${Math.floor(10000 + Math.random() * 90000)}`,
    location: location || 'Central Market',
    locale: 'en'
  };

  store.users.set(id, pharmUser);

  store.audit({
    actor_id: id,
    actor_name: pharmacist_name,
    actor_role: 'pharmacist',
    action: 'PHARMACY_ONBOARDED',
    entity_type: 'dispensary',
    entity_id: id,
    sentence: `Pharmacist ${pharmacist_name} registered ${pharmacy_name} (Lic: ${pharmUser.license_no})`
  });

  res.status(201).json({
    success: true,
    pharmacy_id: id,
    user: pharmUser
  });
});

router.post('/regimens/intake', (req, res) => {
  const { patient_id, drug_id, brand, dose_value, dose_unit, frequency_code, timing, prescriber_name, instructions } = req.body;
  if (!patient_id || !brand) {
    return res.status(400).json({ error: 'patient_id and brand are required' });
  }

  const regId = `reg-${Date.now()}`;
  const item = {
    id: regId,
    patient_id,
    drug_id: drug_id || 'DRUG_CUSTOM',
    brand,
    dose: `${dose_value || 1}${dose_unit || 'tab'}`,
    frequency: frequency_code || 'OD',
    timing: timing || ['morning'],
    prescriber_name: prescriber_name || 'Self-Reported / Previous Doctor',
    prescriber_id: 'usr-intake-001',
    instructions: instructions || 'Take with water after food',
    status: 'active',
    started_on: new Date().toISOString(),
    ended_on: null
  };

  store.regimenItems.set(regId, item);

  store.audit({
    actor_id: patient_id,
    actor_name: store.patients.get(patient_id)?.name || 'Patient',
    actor_role: 'patient',
    action: 'REGIMEN_MEDICATION_ADDED',
    entity_type: 'regimen_item',
    entity_id: regId,
    sentence: `Active medication '${brand}' (${item.dose}, ${item.frequency}) added to regimen for patient ${patient_id}`
  });

  res.status(201).json({
    success: true,
    regimen_item: item
  });
});

router.get('/patients', (req, res) => {
  const list = Array.from(store.patients.values()).map(p => ({
    id: p.user_id,
    name: p.name,
    phone: p.phone,
    gender: p.gender,
    dob: p.dob,
    abha_id: p.abha_id,
    conditions: p.chronic_conditions || []
  }));
  res.json(list);
});

router.get('/doctors', (req, res) => {
  const list = Array.from(store.users.values())
    .filter(u => u.role === 'doctor')
    .map(u => ({
      id: u.id,
      name: u.name,
      specialty: u.specialty,
      reg_no: u.reg_no,
      clinic_name: u.clinic_name
    }));
  res.json(list);
});

module.exports = router;
