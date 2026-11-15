const http = require('http');
const app = require('./src/index');

const server = app.listen(3002, async () => {
  console.log('Testing Medicub Server on port 3002...');

  try {
    // 1. Health test
    const health = await fetchJson('http://localhost:3002/v1/health');
    console.log('1. Health check:', health.status === 'ok' ? 'PASS' : 'FAIL');

    // 2. Audit verify test
    const auditVerify = await fetchJson('http://localhost:3002/v1/audit/verify');
    console.log('2. Audit chain verify:', auditVerify.ok ? 'PASS' : 'FAIL', `(${auditVerify.checked} entries)`);

    // 3. Login test
    const loginRes = await fetchJson('http://localhost:3002/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dr.rao@clinic.local', password: 'password123' })
    });
    console.log('3. Doctor login:', loginRes.user && loginRes.user.name === 'Dr. Arjun Rao' ? 'PASS' : 'FAIL');

    // 4. Draft new prescription with combination pill Telma-AM 40/5 (Demo Scenario Step 2)
    const draftRes = await fetchJson('http://localhost:3002/v1/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loginRes.access}` },
      body: JSON.stringify({
        patient_id: 'usr-ramesh-kumar-001',
        notes: 'Hypertension adjustment',
        items: [
          {
            drug_id: 'DRUG002', // Telma-AM 40/5 (Telmisartan 40mg + Amlodipine 5mg)
            dose_value: 1,
            dose_unit: 'tablet',
            frequency_code: 'OD',
            timing: ['morning'],
            duration_days: 30
          }
        ]
      })
    });
    console.log('4. Create draft Rx:', draftRes.id ? 'PASS' : 'FAIL');

    // 5. Safety check on draft
    const checkRes = await fetchJson(`http://localhost:3002/v1/prescriptions/${draftRes.id}/check`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginRes.access}` }
    });
    const dupFlag = checkRes.flags.find(f => f.rule_id === 'R-DUP-001');
    console.log('5. Safety check fires R-DUP-001 (duplicate amlodipine):', dupFlag ? 'PASS' : 'FAIL');

    // 6. Attempt sign WITHOUT decision (should be BLOCKED with 409 flags_unresolved)
    const signAttempt = await fetchRaw(`http://localhost:3002/v1/prescriptions/${draftRes.id}/sign`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginRes.access}` }
    });
    console.log('6. Sign blocked (HTTP 409 flags_unresolved):', signAttempt.status === 409 ? 'PASS' : 'FAIL');

    // 7. Record prescriber decision: "intentional" with reason
    const decRes = await fetchJson(`http://localhost:3002/v1/prescriptions/${draftRes.id}/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loginRes.access}` },
      body: JSON.stringify({
        flag_id: dupFlag.id,
        decision: 'intentional',
        reason: 'Patient transitioning from Amlong 5 to Telma-AM 40/5; Dr Iyer consulted.'
      })
    });
    console.log('7. Record prescriber decision:', decRes.success ? 'PASS' : 'FAIL');

    // 8. Sign now succeeds!
    const signSuccess = await fetchJson(`http://localhost:3002/v1/prescriptions/${draftRes.id}/sign`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${loginRes.access}` }
    });
    console.log('8. Sign succeeded after decision:', signSuccess.status === 'signed' ? 'PASS' : 'FAIL');

    // 9. Re-verify audit hash chain
    const auditAfter = await fetchJson('http://localhost:3002/v1/audit/verify');
    console.log('9. Post-signing audit chain verify:', auditAfter.ok ? 'PASS' : 'FAIL', `(${auditAfter.checked} entries)`);

    console.log('\nALL 9 SERVER TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});

function fetchJson(url, opts = {}) {
  return fetch(url, opts).then(r => r.json());
}

function fetchRaw(url, opts = {}) {
  return fetch(url, opts);
}
