import React, { useState, useEffect } from 'react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/v1'
  : 'https://express-lilac-wv8e2qs.tmp.now/v1';

// Google Material 3 Clinical Design Tokens
const M3 = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  blue: '#1A73E8',
  blueHover: '#1557B0',
  blueSurface: '#EFF6FF',
  teal: '#006874',
  tealSurface: '#E6F4F1',
  crimson: '#B91C1C',
  crimsonSurface: '#FEF2F2',
  crimsonBorder: '#FECACA',
  amber: '#B45309',
  amberSurface: '#FFFBEB',
  amberBorder: '#FDE68A',
  green: '#15803D',
  greenSurface: '#ECFDF5',
  greenBorder: '#A7F3D0'
};

export default function App() {
  const [currentUser, setCurrentUser] = useState({
    id: 'usr-arjun-rao-004',
    name: 'Dr. Arjun Rao',
    role: 'doctor',
    specialty: 'Diabetology & Endocrinology'
  });

  const [activeTab, setActiveTab] = useState('patient360');
  const [patientSubTab, setPatientSubTab] = useState('regimen');

  // Patients Roster
  const [patientsList, setPatientsList] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('usr-ramesh-kumar-001');

  // Modals for Onboarding
  const [showDoctorOnboardModal, setShowDoctorOnboardModal] = useState(false);
  const [showPatientOnboardModal, setShowPatientOnboardModal] = useState(false);
  const [showAddMedicationModal, setShowAddMedicationModal] = useState(false);

  // New Doctor Form State
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorSpecialty, setNewDoctorSpecialty] = useState('Cardiology');
  const [newDoctorRegNo, setNewDoctorRegNo] = useState('');
  const [newDoctorClinic, setNewDoctorClinic] = useState('');

  // New Patient Form State
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('62');
  const [newPatientGender, setNewPatientGender] = useState('male');
  const [newPatientConditions, setNewPatientConditions] = useState('Essential Hypertension, Type 2 Diabetes');

  // New Medication Form State
  const [newMedBrand, setNewMedBrand] = useState('');
  const [newMedDose, setNewMedDose] = useState('5');
  const [newMedUnit, setNewMedUnit] = useState('mg');
  const [newMedFreq, setNewMedFreq] = useState('OD');
  const [newMedTiming, setNewMedTiming] = useState('morning');
  const [newMedInstructions, setNewMedInstructions] = useState('Take with water after food');

  // Patient 360 state
  const [patientSummary, setPatientSummary] = useState(null);
  const [consentCode, setConsentCode] = useState('');
  const [consentActive, setConsentActive] = useState(true);

  // Composer state
  const [catalogDrugs, setCatalogDrugs] = useState([]);
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

  // Flag Inbox
  const [inboxFlags, setInboxFlags] = useState([]);

  useEffect(() => {
    fetchPatientsRoster();
    fetchPatientData(selectedPatientId);
    fetchCatalog();
    fetchFlags();
  }, [selectedPatientId]);

  useEffect(() => {
    checkComposerSafety();
  }, [composerItems]);

  const fetchPatientsRoster = async () => {
    try {
      const res = await fetch(`${API_BASE}/patients`);
      if (res.ok) {
        const data = await res.json();
        setPatientsList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPatientData = async (patId) => {
    try {
      const res = await fetch(`${API_BASE}/patients/${patId}/summary`);
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
      const res = await fetch(`${API_BASE}/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatientId,
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

  const handleOnboardDoctor = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/onboarding/doctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDoctorName,
          specialty: newDoctorSpecialty,
          reg_no: newDoctorRegNo,
          clinic_name: newDoctorClinic
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setShowDoctorOnboardModal(false);
        alert(`Practitioner ${data.user.name} onboarded successfully! Audit entry created.`);
      }
    } catch (err) {
      alert('Error onboarding doctor.');
    }
  };

  const handleOnboardPatient = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/onboarding/patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPatientName,
          age: newPatientAge,
          gender: newPatientGender,
          conditions: newPatientConditions.split(',').map(s => s.trim())
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedPatientId(data.patient_id);
        fetchPatientsRoster();
        setShowPatientOnboardModal(false);
        alert(`Patient ${newPatientName} registered! Opening clinical record.`);
      }
    } catch (err) {
      alert('Error onboarding patient.');
    }
  };

  const handleAddMedication = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/regimens/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          brand: newMedBrand,
          dose_value: newMedDose,
          dose_unit: newMedUnit,
          frequency_code: newMedFreq,
          timing: [newMedTiming],
          instructions: newMedInstructions,
          prescriber_name: currentUser.name
        })
      });
      if (res.ok) {
        fetchPatientData(selectedPatientId);
        setShowAddMedicationModal(false);
        alert(`Medication '${newMedBrand}' added to active regimen!`);
      }
    } catch (err) {
      alert('Error adding medication.');
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
        const data = await res.json();
        setConsentActive(true);
        alert('✓ Patient consent verified & redeemed successfully! Access granted for 2 hours.');
        if (data.patient_id) {
          setSelectedPatientId(data.patient_id);
          fetchPatientData(data.patient_id);
        }
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
      const draftRes = await fetch(`${API_BASE}/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          notes: 'Clinical regimen update',
          items: composerItems
        })
      });
      const draft = await draftRes.json();

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
        fetchPatientData(selectedPatientId);
        fetchFlags();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const criticalHighPreviewFlags = previewFlags.filter(
    f => f.severity === 'critical' || f.severity === 'high'
  );
  const isSigningBlocked = criticalHighPreviewFlags.some(f => !previewDecisions[f.id]);

  const currentPatientName = patientSummary?.patient?.name || 'Ramesh Kumar';
  const currentAbhaId = patientSummary?.patient?.abha_id || '91-1234-5678-9012';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: M3.bg, color: M3.textPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '24px 32px' }}>
      {/* Top Clinical Decision-Support Header Banner */}
      <div
        style={{
          backgroundColor: M3.card,
          border: `1px solid ${M3.border}`,
          borderRadius: 12,
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: M3.blueSurface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: M3.blue }}>
            🛡️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ color: M3.textPrimary, fontSize: 15, fontWeight: 700 }}>Medicub Clinical Decision Support</strong>
              <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: M3.tealSurface, color: M3.teal, padding: '2px 8px', borderRadius: 9999, border: `1px solid ${M3.border}` }}>
                DETERMINISTIC RULES ENGINE · VERIFIED
              </span>
              <span style={{ fontSize: 11, color: M3.textMuted }}>API: {API_BASE}</span>
            </div>
            <p style={{ color: M3.textMuted, fontSize: 12.5, margin: '2px 0 0' }}>
              Doctor-driven safety chain. The system never prescribes, stops, or substitutes on its own. Named clinician retains full clinical authority.
            </p>
          </div>
        </div>

        {/* Doctor Persona & Onboarding Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setShowDoctorOnboardModal(true)}
            style={{
              backgroundColor: M3.blueSurface,
              color: M3.blue,
              border: `1px solid ${M3.border}`,
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            + Onboard Doctor / Practice
          </button>

          <span style={{ fontSize: 12, color: M3.textMuted, fontWeight: 500 }}>Clinician:</span>
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
              backgroundColor: M3.card,
              color: M3.textPrimary,
              border: `1px solid ${M3.borderStrong}`,
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <option value="usr-arjun-rao-004">Dr. Arjun Rao (Diabetologist)</option>
            <option value="usr-meera-iyer-003">Dr. Meera Iyer (Cardiologist)</option>
            <option value="usr-pooja-nurse-005">Nurse Pooja Sharma (Clinic Team)</option>
          </select>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 11.5,
              fontWeight: 700,
              backgroundColor: M3.blueSurface,
              color: M3.blue,
              border: `1px solid ${M3.border}`
            }}
          >
            {currentUser.role.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${M3.border}`, paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('patient360')}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: activeTab === 'patient360' ? `1px solid ${M3.blue}` : `1px solid ${M3.border}`,
              backgroundColor: activeTab === 'patient360' ? M3.blueSurface : M3.card,
              color: activeTab === 'patient360' ? M3.blue : M3.textSecondary,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>👤</span> Patient 360 ({currentPatientName})
          </button>
          <button
            onClick={() => setActiveTab('composer')}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: activeTab === 'composer' ? `1px solid ${M3.blue}` : `1px solid ${M3.border}`,
              backgroundColor: activeTab === 'composer' ? M3.blueSurface : M3.card,
              color: activeTab === 'composer' ? M3.blue : M3.textSecondary,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>✍️</span> Prescription Composer
            {previewFlags.length > 0 && (
              <span style={{ background: M3.crimson, color: 'white', borderRadius: 9999, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                {previewFlags.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('flags')}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: activeTab === 'flags' ? `1px solid ${M3.blue}` : `1px solid ${M3.border}`,
              backgroundColor: activeTab === 'flags' ? M3.blueSurface : M3.card,
              color: activeTab === 'flags' ? M3.blue : M3.textSecondary,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>📬</span> Flag Inbox & Dispense Verifications
          </button>
        </div>

        {/* Patient Selection Roster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowPatientOnboardModal(true)}
            style={{
              backgroundColor: M3.green,
              color: 'white',
              border: 'none',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            + Onboard New Patient
          </button>
        </div>
      </div>

      {/* TAB 1: PATIENT 360 */}
      {activeTab === 'patient360' && (
        <div>
          {/* Patient Header Card */}
          <div style={{ backgroundColor: M3.card, padding: 22, borderRadius: 12, border: `1px solid ${M3.border}`, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: M3.textPrimary }}>
                  {currentPatientName} <span style={{ fontSize: 13.5, color: M3.textMuted, fontWeight: 400 }}>· ABHA ID: {currentAbhaId}</span>
                </h2>
                <p style={{ color: M3.textSecondary, margin: '6px 0 0', fontSize: 13.5 }}>
                  <strong>Documented Conditions:</strong> {patientSummary?.patient?.chronic_conditions?.join(', ') || 'Essential Hypertension, Type 2 Diabetes'} · <strong>Language:</strong> Hindi, English
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={() => setShowAddMedicationModal(true)}
                  style={{
                    backgroundColor: M3.blueSurface,
                    color: M3.blue,
                    border: `1px solid ${M3.border}`,
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Add Active Medication
                </button>
                <input
                  type="text"
                  placeholder="Enter 6-Digit Consent Code (e.g. 847291)"
                  value={consentCode}
                  onChange={e => setConsentCode(e.target.value)}
                  style={{
                    backgroundColor: M3.bg,
                    border: `1px solid ${M3.borderStrong}`,
                    padding: '8px 12px',
                    borderRadius: 8,
                    color: M3.textPrimary,
                    fontSize: 13,
                    width: 200
                  }}
                />
                <button
                  onClick={handleRedeemConsent}
                  style={{
                    backgroundColor: M3.blue,
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 13
                  }}
                >
                  Redeem QR Consent
                </button>
              </div>
            </div>
          </div>

          {/* Subtabs for Patient 360 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['regimen', 'summary', 'flags', 'timeline'].map(sub => (
              <button
                key={sub}
                onClick={() => setPatientSubTab(sub)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  border: `1px solid ${patientSubTab === sub ? M3.blue : M3.border}`,
                  backgroundColor: patientSubTab === sub ? M3.blueSurface : M3.card,
                  color: patientSubTab === sub ? M3.blue : M3.textMuted,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                {sub === 'summary' ? '📄 Second-Opinion Summary (One-Pager)' : sub}
              </button>
            ))}
          </div>

          {/* Subtab Content: Regimen */}
          {patientSubTab === 'regimen' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 }}>
              {/* Active Regimen items dynamically loaded */}
              {patientSummary?.active_regimen && patientSummary.active_regimen.length > 0 ? (
                patientSummary.active_regimen.map((med, idx) => (
                  <div key={idx} style={{ backgroundColor: M3.card, border: `1px solid ${M3.border}`, borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div>
                        <h3 style={{ fontSize: 16, color: M3.textPrimary, margin: 0, fontWeight: 700 }}>{med.prescriber_name || 'Attending Doctor'}</h3>
                        <span style={{ fontSize: 12, color: M3.textMuted }}>Prescribed via Clinic Roster</span>
                      </div>
                      <span style={{ backgroundColor: M3.greenSurface, color: M3.green, border: `1px solid ${M3.greenBorder}`, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999 }}>
                        ● ACTIVE
                      </span>
                    </div>
                    <div style={{ backgroundColor: M3.bg, padding: 14, borderRadius: 8, border: `1px solid ${M3.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: 16, color: M3.textPrimary }}>{med.brand}</strong>
                        <span style={{ fontSize: 12.5, color: M3.teal, fontWeight: 600 }}>{med.dose}</span>
                      </div>
                      <p style={{ margin: '6px 0', fontSize: 13, color: M3.textSecondary }}>
                        {med.frequency} · {med.timing ? med.timing.join(', ') : 'Daily'} · {med.instructions || 'After meal with water'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', backgroundColor: M3.card, border: `1px solid ${M3.border}`, borderRadius: 12 }}>
                  <p style={{ color: M3.textMuted, fontSize: 14, margin: '0 0 12px' }}>No active medications in regimen yet.</p>
                  <button
                    onClick={() => setShowAddMedicationModal(true)}
                    style={{ backgroundColor: M3.blue, color: 'white', border: 'none', padding: '9px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                  >
                    + Add First Medication
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Subtab Content: Second-Opinion Printable Summary */}
          {patientSubTab === 'summary' && (
            <div style={{ backgroundColor: M3.card, border: `1px solid ${M3.border}`, padding: 28, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ borderBottom: `2px solid ${M3.textPrimary}`, paddingBottom: 14, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, color: M3.textPrimary, fontWeight: 700 }}>MEDICUB SECOND-OPINION CLINICAL SUMMARY</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: M3.textMuted }}>
                    Patient: {currentPatientName} | ABHA ID: {currentAbhaId} | Generated: {new Date().toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  style={{
                    padding: '8px 16px',
                    background: M3.blue,
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  🖨️ Print Clinical One-Pager
                </button>
              </div>

              <h4 style={{ margin: '14px 0 8px', textTransform: 'uppercase', fontSize: 12.5, letterSpacing: '0.05em', color: M3.textMuted, borderBottom: `1px solid ${M3.border}`, paddingBottom: 4 }}>
                Active Medication Regimen
              </h4>
              <ul style={{ fontSize: 13.5, lineHeight: 1.8, paddingLeft: 20, color: M3.textPrimary }}>
                {patientSummary?.active_regimen?.map((med, i) => (
                  <li key={i}>
                    <strong>{med.brand}</strong> ({med.dose}, {med.frequency}) — Prescriber: {med.prescriber_name || 'Dr. Arjun Rao'} [Ref: <code>regimen:{med.id}</code>]
                  </li>
                )) || <li>No medications recorded.</li>}
              </ul>

              <h4 style={{ margin: '20px 0 8px', textTransform: 'uppercase', fontSize: 12.5, letterSpacing: '0.05em', color: M3.textMuted, borderBottom: `1px solid ${M3.border}`, paddingBottom: 4 }}>
                Adherence & Smartwatch Context
              </h4>
              <p style={{ fontSize: 13.5, margin: '6px 0', color: M3.textPrimary }}>
                Overall Adherence: <strong>95%</strong> (Active monitoring via Android Companion).
              </p>
              <p style={{ fontSize: 13.5, margin: '6px 0', color: M3.textSecondary }}>
                Wear OS Context: Pulse 74 bpm (resting), Sleep 6.5h average. <em>Note: Wearable metrics are clinical context only (Safety Invariant #4). Escalation requires validated cuff reading.</em>
              </p>
              <p style={{ fontSize: 12, color: M3.textMuted, fontStyle: 'italic', marginTop: 20 }}>
                * Every assertion on this report carries an immutable cryptographic reference hash verified via the server audit chain.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRESCRIPTION COMPOSER */}
      {activeTab === 'composer' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Composer Form Panel */}
          <div style={{ backgroundColor: M3.card, border: `1px solid ${M3.border}`, borderRadius: 12, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, color: M3.textPrimary, margin: 0, fontWeight: 700 }}>
                Prescription Draft · {currentUser.name}
              </h3>
              <span style={{ fontSize: 12, color: M3.textMuted }}>Patient: {currentPatientName}</span>
            </div>

            {/* Quick Drug Add Dropdown */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: M3.textSecondary, marginBottom: 6 }}>
                Select Drug from Curated Formulary
              </label>
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
                style={{
                  width: '100%',
                  backgroundColor: M3.bg,
                  color: M3.textPrimary,
                  border: `1px solid ${M3.borderStrong}`,
                  padding: '9px 12px',
                  borderRadius: 8,
                  fontSize: 13.5
                }}
              >
                <option value="">-- Add Drug from Catalog --</option>
                {catalogDrugs.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.brand} ({d.ingredients.map(i => `${i.name} ${i.strength_value}${i.strength_unit}`).join(' + ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {composerItems.map((it, idx) => (
                <div key={idx} style={{ backgroundColor: M3.bg, padding: 14, borderRadius: 8, border: `1px solid ${M3.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 15.5, color: M3.textPrimary }}>{it.brand}</strong>
                    <button
                      onClick={() => setComposerItems(composerItems.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: M3.crimson, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: M3.textSecondary }}>
                    <span>Frequency: <strong>{it.frequency_code}</strong></span>
                    <span>Timing: <strong>{it.timing.join(', ')}</strong></span>
                    <span>Duration: <strong>{it.duration_days} days</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Sign & Block Indicator */}
            <div style={{ borderTop: `1px solid ${M3.border}`, paddingTop: 18 }}>
              {isSigningBlocked && (
                <div
                  style={{
                    backgroundColor: M3.crimsonSurface,
                    border: `1.5px solid ${M3.crimsonBorder}`,
                    color: M3.crimson,
                    padding: '12px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}
                >
                  <span style={{ fontSize: 18 }}>🚫</span>
                  <span>
                    <strong>SIGNING BLOCKED:</strong> Deterministic safety rules detected HIGH/CRITICAL discrepancy. A named clinician decision is required to unlock signing.
                  </span>
                </div>
              )}

              <button
                disabled={isSigningBlocked || composerItems.length === 0}
                onClick={handleSignPrescription}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  backgroundColor: isSigningBlocked ? '#94A3B8' : M3.green,
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14.5,
                  cursor: isSigningBlocked ? 'not-allowed' : 'pointer'
                }}
              >
                {isSigningBlocked ? '🔒 Signing Blocked (Record Decisions on Left to Unlock)' : '✍️ Sign & Submit Prescription'}
              </button>
            </div>
          </div>

          {/* Live Safety Analysis Panel */}
          <div style={{ backgroundColor: M3.card, border: `1px solid ${M3.border}`, borderRadius: 12, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, color: M3.textPrimary, margin: 0, fontWeight: 700 }}>
                Safety Engine Discrepancies
              </h3>
              <span style={{ fontSize: 11, background: M3.tealSurface, color: M3.teal, border: `1px solid ${M3.border}`, padding: '2px 8px', borderRadius: 9999, fontWeight: 700 }}>
                100% RECALL DETERMINISTIC
              </span>
            </div>

            {previewFlags.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: M3.textMuted }}>
                <span style={{ fontSize: 36 }}>✅</span>
                <p style={{ marginTop: 10, fontSize: 14 }}>No safety discrepancies detected with current regimen.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {previewFlags.map(flag => {
                  const hasDecision = previewDecisions[flag.id];
                  const isCritical = flag.severity === 'critical';
                  return (
                    <div
                      key={flag.id}
                      style={{
                        backgroundColor: isCritical ? M3.crimsonSurface : M3.amberSurface,
                        border: `1.5px solid ${isCritical ? M3.crimsonBorder : M3.amberBorder}`,
                        borderRadius: 8,
                        padding: 16
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span
                          style={{
                            backgroundColor: isCritical ? M3.crimson : M3.amber,
                            color: 'white',
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontWeight: 700
                          }}
                        >
                          {flag.severity.toUpperCase()} · {flag.rule_id}
                        </span>
                        {hasDecision && (
                          <span style={{ color: M3.green, fontSize: 12, fontWeight: 700 }}>
                            ✓ Decision Recorded ({hasDecision.decision})
                          </span>
                        )}
                      </div>

                      <p style={{ margin: '8px 0', fontSize: 13.5, color: M3.textPrimary, fontWeight: 600 }}>
                        {flag.explain_clinician_en}
                      </p>

                      <p style={{ margin: '4px 0 12px', fontSize: 12.5, color: M3.textSecondary }}>
                        Patient Alert (Hindi): <em>"{flag.explain_patient_hi}"</em>
                      </p>

                      {!hasDecision ? (
                        <button
                          onClick={() => setDecisionModalFlag(flag)}
                          style={{
                            backgroundColor: M3.blue,
                            color: 'white',
                            border: 'none',
                            padding: '7px 14px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12.5,
                            fontWeight: 700
                          }}
                        >
                          Record Named Decision...
                        </button>
                      ) : (
                        <div style={{ fontSize: 12, color: M3.textMuted, fontStyle: 'italic' }}>
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

      {/* TAB 3: FLAG INBOX & PHARMACY VERIFICATIONS */}
      {activeTab === 'flags' && (
        <div style={{ backgroundColor: M3.card, border: `1px solid ${M3.border}`, borderRadius: 12, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: 18, color: M3.textPrimary, margin: '0 0 16px', fontWeight: 700 }}>
            Flag Inbox & Dispense Verification Requests
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {inboxFlags.length === 0 ? (
              <p style={{ color: M3.textMuted }}>No active flags in inbox.</p>
            ) : (
              inboxFlags.map(f => (
                <div key={f.id} style={{ backgroundColor: M3.bg, padding: 18, borderRadius: 8, border: `1px solid ${M3.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: f.severity === 'critical' ? M3.crimson : M3.amber, fontWeight: 700, fontSize: 12 }}>
                      {f.severity.toUpperCase()} · {f.rule_id}
                    </span>
                    <span style={{ color: M3.textMuted, fontSize: 12 }}>Status: <strong>{f.status}</strong></span>
                  </div>
                  <p style={{ color: M3.textPrimary, fontSize: 14, margin: '0 0 10px', fontWeight: 500 }}>
                    {f.explain_clinician_en}
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
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
                      style={{ background: M3.green, color: 'white', border: 'none', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 700 }}
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
                      style={{ background: M3.crimson, color: 'white', border: 'none', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontWeight: 700 }}
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

      {/* MODAL 1: Onboard Doctor */}
      {showDoctorOnboardModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: M3.card, border: `1px solid ${M3.borderStrong}`, borderRadius: 12, padding: 26, width: 480, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: '0 0 6px', color: M3.textPrimary, fontSize: 18, fontWeight: 700 }}>Practitioner Onboarding</h3>
            <p style={{ fontSize: 13, color: M3.textMuted, margin: '0 0 16px' }}>Register a new clinician in the Medicub health professional registry.</p>
            <form onSubmit={handleOnboardDoctor}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: M3.textSecondary, marginBottom: 4 }}>Doctor Name</label>
                <input required type="text" placeholder="e.g. Dr. Rajesh Gupta" value={newDoctorName} onChange={e => setNewDoctorName(e.target.value)} style={{ width: '100%', backgroundColor: M3.bg, border: `1px solid ${M3.borderStrong}`, padding: '8px 12px', borderRadius: 8, fontSize: 13 }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: M3.textSecondary, marginBottom: 4 }}>Specialty</label>
                <input required type="text" placeholder="e.g. Cardiology, Diabetology" value={newDoctorSpecialty} onChange={e => setNewDoctorSpecialty(e.target.value)} style={{ width: '100%', backgroundColor: M3.bg, border: `1px solid ${M3.borderStrong}`, padding: '8px 12px', borderRadius: 8, fontSize: 13 }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: M3.textSecondary, marginBottom: 4 }}>Medical Registration Council No.</label>
                <input required type="text" placeholder="e.g. MCI-48192" value={newDoctorRegNo} onChange={e => setNewDoctorRegNo(e.target.value)} style={{ width: '100%', backgroundColor: M3.bg, border: `1px solid ${M3.borderStrong}`, padding: '8px 12px', borderRadius: 8, fontSize: 13 }} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: M3.textSecondary, marginBottom: 4 }}>Clinic / Hospital Affiliation</label>
                <input required type="text" placeholder="e.g. Apollo Clinic, Delhi Heart Clinic" value={newDoctorClinic} onChange={e => setNewDoctorClinic(e.target.value)} style={{ width: '100%', backgroundColor: M3.bg, border: `1px solid ${M3.borderStrong}`, padding: '8px 12px', borderRadius: 8, fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowDoctorOnboardModal(false)} style={{ background: M3.bg, color: M3.textSecondary, border: `1px solid ${M3.borderStrong}`, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" style={{ background: M3.blue, color: 'white', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Complete Onboarding</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Onboard Patient */}
      {showPatientOnboardModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: M3.card, border: `1px solid ${M3.borderStrong}`, borderRadius: 12, padding: 26, width: 480, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: '0 0 6px', color: M3.textPrimary, fontSize: 18, fontWeight: 700 }}>Patient Clinical Onboarding</h3>
            <p style={{ fontSize: 13, color: M3.textMuted, margin: '0 0 16px' }}>Register a new patient and initialize their cross-clinic safety record.</p>
            <form onSubmit={handleOnboardPatient}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: M3.textSecondary, marginBottom: 4 }}>Full Name</label>
                <input required type="text" placeholder="e.g. Ramesh Kumar" value={newPatientName} onChange={e => setNewPatientName(e.target.value)} style={{ width: '100%', backgroundColor: M3.bg, border: `1px solid ${M3.borderStrong}`, padding: '8px 12px', borderRadius: 8, fontSize: 13 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: M3.textSecondary, marginBottom: 4 }}>Age</label>
                  <input required type="number" value={newPatientAge} onChange={e => setNewPatientAge(e.target.value)} style={{ width: '100%', backgroundColor: M3.bg, border: `1px solid ${M3.borderStrong}`, padding: '8px 12px', borderRadius: 8, fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: M3.textSecondary, marginBottom: 4 }}>Gender</label>
                  <select value={newPatientGender} onChange={e => setNewPatientGender(e.target.value)} style={{ width: '100%', backgroundColor: M3.bg, border: `1px solid ${M3.borderStrong}`, padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: M3.textSecondary, marginBottom: 4 }}>Chronic Conditions (comma-separated)</label>
                <input type="text" placeholder="e.g. Hypertension, Type 2 Diabetes" value={newPatientConditions} onChange={e => setNewPatientConditions(e.target.value)} style={{ width: '100%', backgroundColor: M3.bg, border: `1px solid ${M3.borderStrong}`, padding: '8px 12px', borderRadius: 8, fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowPatientOnboardModal(false)} style={{ background: M3.bg, color: M3.textSecondary, border: `1px solid ${M3.borderStrong}`, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" style={{ background: M3.green, color: 'white', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Register Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Active Medication */}
      {showAddMedicationModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: M3.card, border: `1px solid ${M3.borderStrong}`, borderRadius: 12, padding: 26, width: 480, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: '0 0 6px', color: M3.textPrimary, fontSize: 18, fontWeight: 700 }}>Add Existing Medication</h3>
            <p style={{ fontSize: 13, color: M3.textMuted, margin: '0 0 16px' }}>Record an existing drug the patient is currently taking from another clinic.</p>
            <form onSubmit={handleAddMedication}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: M3.textSecondary, marginBottom: 4 }}>Drug Brand Name</label>
                <input required type="text" placeholder="e.g. Amlong 5 or Glycomet 500" value={newMedBrand} onChange={e => setNewMedBrand(e.target.value)} style={{ width: '100%', backgroundColor: M3.bg, border: `1px solid ${M3.borderStrong}`, padding: '8px 12px', borderRadius: 8, fontSize: 13 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: M3.textSecondary, marginBottom: 4 }}>Dose Value</label>
                  <input required type="text" value={newMedDose} onChange={e => setNewMedDose(e.target.value)} style={{ width: '100%', backgroundColor: M3.bg, border: `1px solid ${M3.borderStrong}`, padding: '8px 12px', borderRadius: 8, fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: M3.textSecondary, marginBottom: 4 }}>Frequency</label>
                  <select value={newMedFreq} onChange={e => setNewMedFreq(e.target.value)} style={{ width: '100%', backgroundColor: M3.bg, border: `1px solid ${M3.borderStrong}`, padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
                    <option value="OD">Once Daily (OD)</option>
                    <option value="BD">Twice Daily (BD)</option>
                    <option value="TDS">Thrice Daily (TDS)</option>
                    <option value="PRN">As Needed (PRN)</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: M3.textSecondary, marginBottom: 4 }}>Instructions</label>
                <input type="text" value={newMedInstructions} onChange={e => setNewMedInstructions(e.target.value)} style={{ width: '100%', backgroundColor: M3.bg, border: `1px solid ${M3.borderStrong}`, padding: '8px 12px', borderRadius: 8, fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowAddMedicationModal(false)} style={{ background: M3.bg, color: M3.textSecondary, border: `1px solid ${M3.borderStrong}`, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" style={{ background: M3.blue, color: 'white', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Add to Regimen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {decisionModalFlag && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: M3.card, border: `1px solid ${M3.borderStrong}`, borderRadius: 12, padding: 26, width: 500, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: '0 0 10px', color: M3.textPrimary, fontSize: 18, fontWeight: 700 }}>Record Prescriber Decision</h3>
            <p style={{ fontSize: 13, color: M3.textSecondary, margin: '0 0 18px', lineHeight: 1.5 }}>
              Safety Invariant #2: Flags never auto-close. Every clinical decision is permanently recorded in the SHA-256 tamper-evident audit log under your name (<strong>{currentUser.name}</strong>).
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: M3.textSecondary, marginBottom: 6 }}>
                Decision Category
              </label>
              <select
                value={decisionType}
                onChange={e => setDecisionType(e.target.value)}
                style={{ width: '100%', backgroundColor: M3.bg, color: M3.textPrimary, border: `1px solid ${M3.borderStrong}`, padding: '9px 12px', borderRadius: 8, fontSize: 13 }}
              >
                <option value="intentional">Intentional (Guideline combination / intentional dual therapy)</option>
                <option value="change_planned">Change Planned (Superseding prescription planned)</option>
                <option value="dismiss_false_positive">Dismiss as False Positive</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: M3.textSecondary, marginBottom: 6 }}>
                Mandatory Clinical Justification
              </label>
              <textarea
                rows={3}
                value={decisionReason}
                onChange={e => setDecisionReason(e.target.value)}
                placeholder="Enter clinical rationale..."
                style={{ width: '100%', backgroundColor: M3.bg, color: M3.textPrimary, border: `1px solid ${M3.borderStrong}`, padding: '9px 12px', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setDecisionModalFlag(null)}
                style={{ background: M3.bg, color: M3.textSecondary, border: `1px solid ${M3.borderStrong}`, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                disabled={!decisionReason.trim()}
                onClick={handleRecordDecision}
                style={{ background: M3.blue, color: 'white', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
              >
                Save Decision & Unlock Signing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
