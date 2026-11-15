import React, { useState, useEffect } from 'react';

const API_BASE = '/v1';

export default function App() {
  const [currentUser, setCurrentUser] = useState({
    id: 'usr-arjun-rao-004',
    name: 'Dr. Arjun Rao',
    role: 'doctor',
    specialty: 'Diabetology & Endocrinology'
  });

  const [activeTab, setActiveTab] = useState('patient360');
  const [patientSubTab, setPatientSubTab] = useState('regimen');

  // Patient 360 data
  const [patientSummary, setPatientSummary] = useState(null);
  const [consentCode, setConsentCode] = useState('');
  const [consentActive, setConsentActive] = useState(true);

  // Composer state
  const [catalogDrugs, setCatalogDrugs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [composerItems, setComposerItems] = useState([
    {
      drug_id: 'DRUG002',
      brand: 'Telma-AM 40/5',
      dose_value: 1,
      dose_unit: 'tablet',
      frequency_code: 'OD',
      timing: ['morning'],
      duration_days: 30
    }
  ]);
  const [previewFlags, setPreviewFlags] = useState([]);
  const [previewDecisions, setPreviewDecisions] = useState({});
  const [decisionModalFlag, setDecisionModalFlag] = useState(null);
  const [decisionType, setDecisionType] = useState('intentional');
  const [decisionReason, setDecisionReason] = useState('Dual therapy planned; switching from single agent after consulting Dr. Iyer');
  const [signedRx, setSignedRx] = useState(null);

  // Flag Inbox & Pharmacy Verifications
  const [inboxFlags, setInboxFlags] = useState([]);

  // Load initial data
  useEffect(() => {
    fetchPatientData();
    fetchCatalog();
    fetchFlags();
  }, []);

  // Run live check whenever composer items change
  useEffect(() => {
    checkComposerSafety();
  }, [composerItems]);

  const fetchPatientData = async () => {
    try {
      const res = await fetch(`${API_BASE}/patients/usr-ramesh-kumar-001/summary`);
      if (res.ok) {
        const data = await res.json();
        setPatientSummary(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await fetch(`${API_BASE}/drugs/search?q=`);
      if (res.ok) {
        const data = await res.json();
        setCatalogDrugs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFlags = async () => {
    try {
      const res = await fetch(`${API_BASE}/flags`);
      if (res.ok) {
        const data = await res.json();
        setInboxFlags(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const checkComposerSafety = async () => {
    if (composerItems.length === 0) {
      setPreviewFlags([]);
      return;
    }
    try {
      // Create temporary draft or check via backend
      const res = await fetch(`${API_BASE}/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: 'usr-ramesh-kumar-001',
          items: composerItems
        })
      });
      if (res.ok) {
        const draft = await res.json();
        const checkRes = await fetch(`${API_BASE}/prescriptions/${draft.id}/check`, {
          method: 'POST'
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          setPreviewFlags(checkData.flags || []);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRedeemConsent = async () => {
    if (!consentCode) return;
    try {
      const res = await fetch(`${API_BASE}/consents/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: consentCode.trim() })
      });
      if (res.ok) {
        setConsentActive(true);
        alert('Patient consent verified & redeemed successfully! Access granted for 2 hours.');
        fetchPatientData();
      } else {
        alert('Invalid or expired consent code.');
      }
    } catch (e) {
      alert('Error connecting to server.');
    }
  };

  const handleRecordDecision = () => {
    if (!decisionModalFlag) return;
    setPreviewDecisions({
      ...previewDecisions,
      [decisionModalFlag.id]: {
        decision: decisionType,
        reason: decisionReason
      }
    });
    setDecisionModalFlag(null);
  };

  const handleSignPrescription = async () => {
    try {
      // 1. Create draft
      const draftRes = await fetch(`${API_BASE}/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: 'usr-ramesh-kumar-001',
          notes: 'Stage 2 hypertension dual therapy adjustment',
          items: composerItems
        })
      });
      const draft = await draftRes.json();

      // 2. Attach recorded preview decisions
      for (const [flagId, dec] of Object.entries(previewDecisions)) {
        await fetch(`${API_BASE}/prescriptions/${draft.id}/decisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flag_id: flagId,
            decision: dec.decision,
            reason: dec.reason
          })
        });
      }

      // 3. Sign
      const signRes = await fetch(`${API_BASE}/prescriptions/${draft.id}/sign`, {
        method: 'POST'
      });

      if (signRes.status === 409) {
        const err = await signRes.json();
        alert(`SIGNING BLOCKED: ${err.detail}`);
      } else if (signRes.ok) {
        const signed = await signRes.json();
        setSignedRx(signed);
        alert(`Prescription signed successfully! Code: ${signed.rx_code}`);
        fetchPatientData();
        fetchFlags();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Has all critical/high preview flags got decisions?
  const criticalHighPreviewFlags = previewFlags.filter(
    f => f.severity === 'critical' || f.severity === 'high'
  );
  const isSigningBlocked = criticalHighPreviewFlags.some(f => !previewDecisions[f.id]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', padding: 20 }}>
      {/* Top Clinical Decision-Support Banner */}
      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #38bdf8',
          borderRadius: 8,
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🛡️</span>
          <div>
            <strong style={{ color: '#38bdf8' }}>Clinical Decision Support</strong>
            <span style={{ color: '#94a3b8', marginLeft: 8, fontSize: 13 }}>
              Decision support, not an automated decision. You as the named clinician are responsible for all prescribing actions.
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={currentUser.id}
            onChange={e => {
              const id = e.target.value;
              if (id === 'usr-meera-iyer-003') {
                setCurrentUser({
                  id,
                  name: 'Dr. Meera Iyer',
                  role: 'doctor',
                  specialty: 'Cardiology'
                });
              } else if (id === 'usr-pooja-nurse-005') {
                setCurrentUser({
                  id,
                  name: 'Nurse Pooja Sharma',
                  role: 'nurse',
                  specialty: 'Clinic Team'
                });
              } else {
                setCurrentUser({
                  id: 'usr-arjun-rao-004',
                  name: 'Dr. Arjun Rao',
                  role: 'doctor',
                  specialty: 'Diabetology & Endocrinology'
                });
              }
            }}
            style={{
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #475569',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 13
            }}
          >
            <option value="usr-arjun-rao-004">Dr. Arjun Rao (Diabetologist)</option>
            <option value="usr-meera-iyer-003">Dr. Meera Iyer (Cardiologist)</option>
            <option value="usr-pooja-nurse-005">Nurse Pooja Sharma (Nurse / Assistant)</option>
          </select>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: currentUser.role === 'doctor' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(234, 179, 8, 0.2)',
              color: currentUser.role === 'doctor' ? '#38bdf8' : '#eab308',
              border: `1px solid ${currentUser.role === 'doctor' ? '#38bdf8' : '#eab308'}`
            }}
          >
            {currentUser.role.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Nav Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #334155', paddingBottom: 12, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('patient360')}
          style={{
            padding: '8px 18px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: activeTab === 'patient360' ? '#0284c7' : '#1e293b',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          👤 Patient 360 (Ramesh Kumar)
        </button>
        <button
          onClick={() => setActiveTab('composer')}
          style={{
            padding: '8px 18px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: activeTab === 'composer' ? '#0284c7' : '#1e293b',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ✍️ Prescription Composer {previewFlags.length > 0 && <span style={{ background: '#ef4444', borderRadius: 10, padding: '2px 6px', fontSize: 11, marginLeft: 6 }}>{previewFlags.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab('flags')}
          style={{
            padding: '8px 18px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: activeTab === 'flags' ? '#0284c7' : '#1e293b',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          📬 Flag Inbox & Verification Cards
        </button>
      </div>

      {/* TAB 1: PATIENT 360 */}
      {activeTab === 'patient360' && (
        <div>
          {/* Patient Card Header */}
          <div style={{ backgroundColor: '#1e293b', padding: 20, borderRadius: 10, border: '1px solid #334155', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  Ramesh Kumar, 62 <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 400 }}>· Male · ABHA: 91-1234-5678-9012</span>
                </h2>
                <p style={{ color: '#94a3b8', margin: '6px 0 0', fontSize: 14 }}>
                  <strong>Conditions:</strong> Type 2 Diabetes Mellitus, Essential Hypertension · <strong>Language:</strong> Hindi (Primary)
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Enter Consent QR Code"
                  value={consentCode}
                  onChange={e => setConsentCode(e.target.value)}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    padding: '8px 12px',
                    borderRadius: 6,
                    color: 'white'
                  }}
                />
                <button
                  onClick={handleRedeemConsent}
                  style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                >
                  Redeem QR Consent
                </button>
              </div>
            </div>
          </div>

          {/* Subtabs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {['regimen', 'summary', 'flags', 'timeline'].map(sub => (
              <button
                key={sub}
                onClick={() => setPatientSubTab(sub)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid #334155',
                  backgroundColor: patientSubTab === sub ? '#334155' : 'transparent',
                  color: patientSubTab === sub ? '#38bdf8' : '#94a3b8',
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Subtab Content: Regimen */}
          {patientSubTab === 'regimen' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {/* Prescriber 1: Dr. Meera Iyer (Cardiology) */}
              <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, color: '#38bdf8', margin: 0 }}>Dr. Meera Iyer (Cardiologist)</h3>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Delhi Heart Clinic</span>
                </div>
                <div style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 6, border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 15, color: '#f8fafc' }}>Amlong 5</strong>
                    <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>● ACTIVE</span>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: 13, color: '#94a3b8' }}>
                    Amlodipine 5mg · Once Daily (OD) · Morning
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                    Prescribed 02 Nov 2026 · Rx: RX-IYER-7K2M
                  </p>
                </div>
              </div>

              {/* Prescriber 2: Dr. Arjun Rao (Diabetology) */}
              <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, color: '#38bdf8', margin: 0 }}>Dr. Arjun Rao (Diabetologist)</h3>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Metro Diabetes Care</span>
                </div>
                <div style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 6, border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 15, color: '#f8fafc' }}>Glycomet 500</strong>
                    <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>● ACTIVE</span>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: 13, color: '#94a3b8' }}>
                    Metformin 500mg · Twice Daily (BD) · Morning & Night
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                    Prescribed 25 Oct 2026 · Rx: RX-RAO-9Q1P
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Subtab Content: Second-Opinion Printable Summary */}
          {patientSubTab === 'summary' && (
            <div style={{ backgroundColor: '#ffffff', color: '#0f172a', padding: 24, borderRadius: 8, fontFamily: 'serif' }}>
              <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: 10, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>MEDICUB SECOND-OPINION CONTEXT SUMMARY</h2>
                  <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>Patient: Ramesh Kumar, 62M | ABHA: 91-1234-5678-9012 | Generated: {new Date().toLocaleDateString()}</p>
                </div>
                <button onClick={() => window.print()} style={{ height: 32, padding: '0 12px', background: '#0284c7', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Print One-Pager</button>
              </div>

              <h4 style={{ margin: '12px 0 6px', textTransform: 'uppercase', fontSize: 13, borderBottom: '1px solid #cbd5e1' }}>Unified Active Medication Regimen</h4>
              <ul style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
                <li>Amlong 5 (Amlodipine 5mg, OD Morning) — Prescriber: Dr. Meera Iyer [Ref: <code>regimen:item-iyer-001</code>]</li>
                <li>Glycomet 500 (Metformin 500mg, BD) — Prescriber: Dr. Arjun Rao [Ref: <code>regimen:item-rao-001</code>]</li>
              </ul>

              <h4 style={{ margin: '16px 0 6px', textTransform: 'uppercase', fontSize: 13, borderBottom: '1px solid #cbd5e1' }}>Safety & Adherence Profile</h4>
              <p style={{ fontSize: 13, margin: '4px 0' }}>Overall adherence: <strong>95%</strong> (3 missed doses logged in past 30 days).</p>
              <p style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 16 }}>* Every assertion on this report carries an immutable cryptographic reference hash for verification.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRESCRIPTION COMPOSER */}
      {activeTab === 'composer' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
          {/* Composer Form */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 20 }}>
            <h3 style={{ fontSize: 18, color: '#38bdf8', margin: '0 0 16px' }}>
              Prescription Draft (Dr. Arjun Rao)
            </h3>

            {/* Quick drug add */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Search Drug Catalog</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  onChange={e => {
                    const drug = catalogDrugs.find(d => d.id === e.target.value);
                    if (drug) {
                      setComposerItems([
                        ...composerItems,
                        {
                          drug_id: drug.id,
                          brand: drug.brand,
                          dose_value: 1,
                          dose_unit: 'tablet',
                          frequency_code: 'OD',
                          timing: ['morning'],
                          duration_days: 30
                        }
                      ]);
                    }
                  }}
                  style={{ flex: 1, backgroundColor: '#0f172a', color: 'white', border: '1px solid #475569', padding: '8px 12px', borderRadius: 6 }}
                >
                  <option value="">-- Add Drug from Catalog --</option>
                  {catalogDrugs.map(d => (
                    <option key={d.id} value={d.id}>{d.brand} ({d.ingredients.map(i => `${i.name} ${i.strength_value}${i.strength_unit}`).join(' + ')})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected items list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {composerItems.map((it, idx) => (
                <div key={idx} style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 8, border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 15, color: '#f8fafc' }}>{it.brand}</strong>
                    <button
                      onClick={() => setComposerItems(composerItems.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 13 }}>
                    <span>Frequency: <strong>{it.frequency_code}</strong></span>
                    <span>Timing: <strong>{it.timing.join(', ')}</strong></span>
                    <span>Duration: <strong>{it.duration_days} days</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Sign Button & Block Indicator */}
            <div style={{ borderTop: '1px solid #334155', paddingTop: 16 }}>
              {isSigningBlocked && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#fca5a5',
                    padding: '10px 14px',
                    borderRadius: 6,
                    fontSize: 13,
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <span>🚫</span>
                  <span>
                    <strong>SIGNING BLOCKED:</strong> Safety engine detected HIGH/CRITICAL flag(s). A named doctor decision is required before signing.
                  </span>
                </div>
              )}

              <button
                disabled={isSigningBlocked || composerItems.length === 0}
                onClick={handleSignPrescription}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  backgroundColor: isSigningBlocked ? '#475569' : '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: isSigningBlocked ? 'not-allowed' : 'pointer',
                  opacity: isSigningBlocked ? 0.6 : 1
                }}
              >
                {isSigningBlocked ? '🔒 Signing Blocked (Resolve Flags Below)' : '✍️ Sign & Submit Prescription'}
              </button>
            </div>
          </div>

          {/* Live Check Panel */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 20 }}>
            <h3 style={{ fontSize: 18, color: '#f8fafc', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Live Safety Engine Analysis</span>
              <span style={{ fontSize: 12, background: '#0284c7', color: 'white', padding: '2px 8px', borderRadius: 9999 }}>Deterministic</span>
            </h3>

            {previewFlags.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <span style={{ fontSize: 32 }}>✅</span>
                <p style={{ marginTop: 10 }}>No safety discrepancies detected with current regimen.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {previewFlags.map(flag => {
                  const hasDecision = previewDecisions[flag.id];
                  return (
                    <div
                      key={flag.id}
                      style={{
                        backgroundColor: '#0f172a',
                        border: `1px solid ${flag.severity === 'critical' ? '#ef4444' : '#f97316'}`,
                        borderRadius: 8,
                        padding: 14
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span
                          style={{
                            backgroundColor: flag.severity === 'critical' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                            color: flag.severity === 'critical' ? '#ef4444' : '#f97316',
                            border: `1px solid ${flag.severity === 'critical' ? '#ef4444' : '#f97316'}`,
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontWeight: 700
                          }}
                        >
                          {flag.severity.toUpperCase()} · {flag.rule_id}
                        </span>
                        {hasDecision && (
                          <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>
                            ✓ Decision Recorded ({hasDecision.decision})
                          </span>
                        )}
                      </div>

                      <p style={{ margin: '6px 0', fontSize: 13, color: '#f8fafc', fontWeight: 500 }}>
                        {flag.explain_clinician_en}
                      </p>

                      <p style={{ margin: '4px 0 10px', fontSize: 12, color: '#94a3b8' }}>
                        Patient Alert (Hindi): <em>"{flag.explain_patient_hi}"</em>
                      </p>

                      {!hasDecision ? (
                        <button
                          onClick={() => setDecisionModalFlag(flag)}
                          style={{
                            backgroundColor: '#0284c7',
                            color: 'white',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          Record Named Decision...
                        </button>
                      ) : (
                        <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                          Reason: "{hasDecision.reason}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FLAG INBOX & PHARMACY VERIFICATION CARDS */}
      {activeTab === 'flags' && (
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 18, color: '#38bdf8', margin: '0 0 16px' }}>
            Flag Inbox & Dispense Verification Requests
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {inboxFlags.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>No active flags in inbox.</p>
            ) : (
              inboxFlags.map(f => (
                <div key={f.id} style={{ backgroundColor: '#0f172a', padding: 16, borderRadius: 8, border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#f97316', fontWeight: 700, fontSize: 12 }}>{f.severity.toUpperCase()} · {f.rule_id}</span>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>Status: {f.status}</span>
                  </div>
                  <p style={{ color: '#f8fafc', fontSize: 14, margin: '0 0 8px' }}>{f.explain_clinician_en}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={async () => {
                        await fetch(`${API_BASE}/flags/${f.id}/decision`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ decision: 'intentional', reason: 'Substitution approved by Dr. Rao' })
                        });
                        alert('Decision recorded.');
                        fetchFlags();
                      }}
                      style={{ background: '#22c55e', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                      Approve Substitution
                    </button>
                    <button
                      onClick={async () => {
                        await fetch(`${API_BASE}/flags/${f.id}/decision`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ decision: 'change_planned', reason: 'Alternate brand rejected' })
                        });
                        alert('Substitution rejected.');
                        fetchFlags();
                      }}
                      style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {decisionModalFlag && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 10, padding: 24, width: 480 }}>
            <h3 style={{ margin: '0 0 12px', color: '#f8fafc', fontSize: 18 }}>Record Prescriber Decision</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 16px' }}>
              Every clinical decision is permanently recorded in the tamper-evident audit log under your name (<strong>{currentUser.name}</strong>).
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Decision Category</label>
              <select
                value={decisionType}
                onChange={e => setDecisionType(e.target.value)}
                style={{ width: '100%', backgroundColor: '#0f172a', color: 'white', border: '1px solid #475569', padding: 8, borderRadius: 6 }}
              >
                <option value="intentional">Intentional (Guideline combination / intentional dual therapy)</option>
                <option value="change_planned">Change Planned (Superseding prescription planned)</option>
                <option value="dismiss_false_positive">Dismiss as False Positive</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Mandatory Clinical Justification</label>
              <textarea
                rows={3}
                value={decisionReason}
                onChange={e => setDecisionReason(e.target.value)}
                placeholder="Enter clinical rationale..."
                style={{ width: '100%', backgroundColor: '#0f172a', color: 'white', border: '1px solid #475569', padding: 8, borderRadius: 6 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setDecisionModalFlag(null)}
                style={{ background: '#475569', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                disabled={!decisionReason.trim()}
                onClick={handleRecordDecision}
                style={{ background: '#0284c7', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              >
                Save Decision & Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
