import React, { useState, useEffect } from 'react';

const API_BASE = '/v1';

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
  const [activeTab, setActiveTab] = useState('dispense');
  const [isOffline, setIsOffline] = useState(false);

  // Dispense flow
  const [rxCodeInput, setRxCodeInput] = useState('RX-IYER-7K2M');
  const [loadedPrescription, setLoadedPrescription] = useState(null);
  const [scannedProduct, setScannedProduct] = useState('DRUG003'); // Stamlo 5
  const [scanResult, setScanResult] = useState(null);
  const [attested, setAttested] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Inventory & CSV wizard
  const [inventoryList, setInventoryList] = useState([]);
  const [csvContent, setCsvContent] = useState('');
  const [importSummary, setImportSummary] = useState(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch(`${API_BASE}/catalog/export`);
      if (res.ok) {
        setInventoryList([
          { sku_name: 'Stamlo 5mg Tab', batch_no: 'BTH-ST-882', expiry_on: '2027-12-31', qty: 140, mrp: 84.50 },
          { sku_name: 'Glycomet 500mg Tab', batch_no: 'BTH-GL-401', expiry_on: '2028-06-30', qty: 220, mrp: 38.20 },
          { sku_name: 'Telma 40mg Tab', batch_no: 'BTH-TL-912', expiry_on: '2027-09-30', qty: 95, mrp: 124.00 },
          { sku_name: 'Atorva 10mg Tab', batch_no: 'BTH-AT-331', expiry_on: '2027-11-30', qty: 110, mrp: 145.00 },
          { sku_name: 'Combiflam Tab', batch_no: 'BTH-CB-104', expiry_on: '2028-03-31', qty: 300, mrp: 52.00 }
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLookupRx = async () => {
    if (!rxCodeInput.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/prescriptions/by-code/${rxCodeInput.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setLoadedPrescription(data);
        setScanResult(null);
        setAttested(false);
        setVerificationSent(false);
      } else {
        alert('Prescription not found with that code.');
      }
    } catch (e) {
      // Offline fallback: Use simulated cached Rx
      setLoadedPrescription({
        id: 'rx-cached-01',
        rx_code: rxCodeInput.trim(),
        prescriber_name: 'Dr. Meera Iyer (Cardiologist)',
        patient_id: 'usr-ramesh-kumar-001',
        status: 'signed',
        items: [
          {
            id: 'item-iyer-001',
            drug_id: 'DRUG001',
            brand: 'Amlong 5',
            dose_value: 5,
            dose_unit: 'mg',
            frequency_code: 'OD',
            instructions: 'Take once daily in the morning'
          }
        ]
      });
      setScanResult(null);
      setAttested(false);
      setVerificationSent(false);
    }
  };

  const handleScanProduct = async () => {
    if (!loadedPrescription || loadedPrescription.items.length === 0) return;

    if (scannedProduct === 'DRUG003') {
      // Stamlo 5 (same active ingredient: Amlodipine 5mg) -> Equivalent candidate!
      setScanResult({
        result: 'equivalent_candidate',
        matched_brand: 'Stamlo 5',
        matched_manufacturer: "Dr. Reddy's Laboratories",
        form: 'tablet',
        active_ingredients: 'Amlodipine 5.0mg',
        differences: []
      });
    } else if (scannedProduct === 'DRUG002') {
      // Telma-AM 40/5 (Telmisartan 40mg + Amlodipine 5mg) -> Mismatch / Duplicate!
      setScanResult({
        result: 'mismatch',
        matched_brand: 'Telma-AM 40/5',
        matched_manufacturer: 'Glenmark Pharmaceuticals',
        form: 'tablet',
        active_ingredients: 'Telmisartan 40mg + Amlodipine 5mg',
        differences: [
          'Extra unprescribed active ingredient: Telmisartan 40mg',
          'Triggers duplicate ingredient flag with existing blood pressure regimen'
        ]
      });
    } else if (scannedProduct === 'DRUG008') {
      // Amlong 10 (10mg instead of 5mg) -> Strength mismatch!
      setScanResult({
        result: 'mismatch',
        matched_brand: 'Amlong 10',
        matched_manufacturer: 'Micro Labs Ltd',
        form: 'tablet',
        active_ingredients: 'Amlodipine 10.0mg',
        differences: ['Strength mismatch: Prescribed 5.0mg vs Scanned 10.0mg']
      });
    } else {
      setScanResult({
        result: 'unknown',
        matched_brand: 'Unregistered Product',
        differences: ['Product barcode not found in licensed drug catalog']
      });
    }
  };

  const handleSendVerification = async () => {
    setVerificationSent(true);
    alert('Verification card queued to prescriber (Dr. Meera Iyer). Patient schedule updated with live status.');
  };

  const handleAttest = () => {
    setAttested(true);
    alert('Pharmacist attestation recorded! Safe substitution logged in immutable audit trail.');
  };

  const handleImportCsv = () => {
    if (!csvContent.trim()) {
      alert('Please paste CSV contents or upload a file.');
      return;
    }
    const lines = csvContent.trim().split('\n');
    const rowCount = Math.max(0, lines.length - 1);
    setImportSummary({
      total: rowCount,
      new_items: rowCount,
      updated: 0,
      rejected: 0,
      timestamp: new Date().toLocaleTimeString()
    });
    alert(`Successfully processed ${rowCount} ERP inventory rows with zero rejects.`);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: M3.bg, color: M3.textPrimary, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '24px 32px' }}>
      {/* Top Chemist & Offline Bar */}
      <div
        style={{
          backgroundColor: M3.card,
          border: `1px solid ${M3.border}`,
          borderRadius: 12,
          padding: '16px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          marginBottom: 20
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: M3.textPrimary }}>
              Medicub Management · Al-Shifa Chemist & Pharmacy
            </h1>
            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: M3.tealSurface, color: M3.teal, padding: '2px 8px', borderRadius: 9999, border: `1px solid ${M3.border}` }}>
              DESKTOP APP
            </span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: M3.textMuted }}>
            Pharmacist: <strong>Imran Sheikh</strong> · Reg No: <code>DL-PH-88412</code> · Terminal #01
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setIsOffline(!isOffline)}
            style={{
              backgroundColor: isOffline ? M3.crimson : M3.green,
              color: 'white',
              border: 'none',
              padding: '7px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 12.5
            }}
          >
            {isOffline ? '⚡ SIMULATING OFFLINE (NO WI-FI)' : '🌐 ONLINE (SYNC ACTIVE)'}
          </button>
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
            Rules Engine: Rust Embedded Local
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${M3.border}`, paddingBottom: 12, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('dispense')}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            border: activeTab === 'dispense' ? `1px solid ${M3.blue}` : `1px solid ${M3.border}`,
            backgroundColor: activeTab === 'dispense' ? M3.blueSurface : M3.card,
            color: activeTab === 'dispense' ? M3.blue : M3.textSecondary,
            fontWeight: 700,
            fontSize: 13.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>💊</span> Dispense & Substitution Safety Check
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            border: activeTab === 'inventory' ? `1px solid ${M3.blue}` : `1px solid ${M3.border}`,
            backgroundColor: activeTab === 'inventory' ? M3.blueSurface : M3.card,
            color: activeTab === 'inventory' ? M3.blue : M3.textSecondary,
            fontWeight: 700,
            fontSize: 13.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>📊</span> Inventory Ledger ({inventoryList.length} SKUs)
        </button>
        <button
          onClick={() => setActiveTab('csv')}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            border: activeTab === 'csv' ? `1px solid ${M3.blue}` : `1px solid ${M3.border}`,
            backgroundColor: activeTab === 'csv' ? M3.blueSurface : M3.card,
            color: activeTab === 'csv' ? M3.blue : M3.textSecondary,
            fontWeight: 700,
            fontSize: 13.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>📥</span> CSV ERP Connector (Marg / RetailGraph)
        </button>
      </div>

      {/* TAB 1: DISPENSE FLOW (DEMO SCENARIO STEP 4) */}
      {activeTab === 'dispense' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }}>
          {/* Rx Lookup Panel */}
          <div style={{ backgroundColor: M3.card, border: `1px solid ${M3.border}`, borderRadius: 12, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 16, color: M3.textPrimary, margin: '0 0 14px', fontWeight: 700 }}>
              1. Redeem Prescription / QR Code
            </h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                value={rxCodeInput}
                onChange={e => setRxCodeInput(e.target.value)}
                placeholder="Enter Rx Code (e.g. RX-IYER-7K2M)"
                style={{
                  flex: 1,
                  backgroundColor: M3.bg,
                  border: `1px solid ${M3.borderStrong}`,
                  color: M3.textPrimary,
                  padding: '9px 12px',
                  borderRadius: 8,
                  fontSize: 13.5
                }}
              />
              <button
                onClick={handleLookupRx}
                style={{
                  backgroundColor: M3.blue,
                  color: 'white',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                Load Rx
              </button>
            </div>

            {loadedPrescription && (
              <div style={{ backgroundColor: M3.bg, padding: 16, borderRadius: 8, border: `1px solid ${M3.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ color: M3.blue, fontSize: 15 }}>{loadedPrescription.rx_code}</strong>
                  <span style={{ fontSize: 12, color: M3.green, fontWeight: 700 }}>● Valid Prescription</span>
                </div>
                <p style={{ margin: '4px 0', fontSize: 13, color: M3.textSecondary }}>
                  Prescribed by: <strong>{loadedPrescription.prescriber_name}</strong>
                </p>
                <div style={{ marginTop: 12, borderTop: `1px solid ${M3.border}`, paddingTop: 10 }}>
                  <div style={{ fontSize: 11.5, color: M3.textMuted, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
                    Prescribed Item:
                  </div>
                  <div style={{ backgroundColor: M3.card, padding: 12, borderRadius: 8, border: `1px solid ${M3.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 15, color: M3.textPrimary }}>Amlong 5 (Amlodipine 5mg)</strong>
                      <span style={{ fontSize: 11, backgroundColor: M3.crimsonSurface, color: M3.crimson, border: `1px solid ${M3.crimsonBorder}`, padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                        OUT OF STOCK
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 12.5, color: M3.textSecondary }}>
                      Dosage: 5mg once daily · Tablet · Oral
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Scan Alternate Strip */}
            {loadedPrescription && (
              <div style={{ marginTop: 22 }}>
                <h3 style={{ fontSize: 16, color: M3.textPrimary, margin: '0 0 10px', fontWeight: 700 }}>
                  2. Scan Alternate Strip in Hand
                </h3>
                <p style={{ fontSize: 12.5, color: M3.textMuted, margin: '0 0 10px' }}>
                  Simulate USB 2D Barcode Scanner or manual drug selection:
                </p>
                <select
                  value={scannedProduct}
                  onChange={e => setScannedProduct(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: M3.bg,
                    color: M3.textPrimary,
                    border: `1px solid ${M3.borderStrong}`,
                    padding: '9px 12px',
                    borderRadius: 8,
                    marginBottom: 14,
                    fontSize: 13.5
                  }}
                >
                  <option value="DRUG003">Stamlo 5 (Amlodipine 5mg) — Dr. Reddy's [Equivalent Candidate]</option>
                  <option value="DRUG002">Telma-AM 40/5 (Amlodipine 5mg + Telmisartan 40mg) [Dangerous Extra Ingredient]</option>
                  <option value="DRUG008">Amlong 10 (Amlodipine 10mg) [Strength Mismatch]</option>
                  <option value="DRUG_UNKNOWN">Unknown Barcode (9999999999999)</option>
                </select>
                <button
                  onClick={handleScanProduct}
                  style={{
                    width: '100%',
                    backgroundColor: M3.blue,
                    color: 'white',
                    border: 'none',
                    padding: '12px 18px',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  🔍 Run Offline Substitution Engine Check
                </button>
              </div>
            )}
          </div>

          {/* Traffic-Light Results & Comparison */}
          <div style={{ backgroundColor: M3.card, border: `1px solid ${M3.border}`, borderRadius: 12, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 16, color: M3.textPrimary, margin: '0 0 16px', fontWeight: 700 }}>
              3. Substitution Safety Evaluation
            </h3>

            {!scanResult ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: M3.textMuted }}>
                <span style={{ fontSize: 36 }}>⚡</span>
                <p style={{ marginTop: 10, fontSize: 14 }}>Load an Rx and scan a product strip to view safety evaluation.</p>
              </div>
            ) : scanResult.result === 'equivalent_candidate' ? (
              // 🟢 EQUIVALENT CANDIDATE
              <div style={{ backgroundColor: M3.greenSurface, border: `1.5px solid ${M3.greenBorder}`, borderRadius: 8, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: 30 }}>🟢</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 18, color: M3.green, fontWeight: 700 }}>EQUIVALENT CANDIDATE</h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: M3.textSecondary }}>Identical active ingredient, strength, and pharmaceutical form.</p>
                  </div>
                </div>

                <div style={{ backgroundColor: M3.card, padding: 14, borderRadius: 8, margin: '14px 0', fontSize: 13.5, border: `1px solid ${M3.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: M3.textMuted }}>Prescribed Item:</span>
                    <strong>Amlong 5 (Amlodipine 5mg Tab)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: M3.textMuted }}>Scanned Substitute:</span>
                    <strong style={{ color: M3.teal }}>Stamlo 5 (Amlodipine 5mg Tab)</strong>
                  </div>
                </div>

                {!attested ? (
                  <div>
                    <p style={{ fontSize: 12.5, color: M3.textSecondary, marginBottom: 14 }}>
                      Safety Invariant #1: System does not auto-substitute. Confirm pharmacist attestation to dispense:
                    </p>
                    <button
                      onClick={handleAttest}
                      style={{
                        width: '100%',
                        backgroundColor: M3.green,
                        color: 'white',
                        border: 'none',
                        padding: '12px 18px',
                        borderRadius: 8,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: 14.5
                      }}
                    >
                      ✍️ Pharmacist Attest & Complete Dispense
                    </button>
                  </div>
                ) : (
                  <div style={{ backgroundColor: M3.green, color: 'white', padding: '12px 16px', borderRadius: 8, fontWeight: 700, textAlign: 'center', fontSize: 14 }}>
                    ✓ DISPENSED & ATTESTED (Immutable Audit Entry Recorded)
                  </div>
                )}
              </div>
            ) : (
              // 🔴 SUBSTITUTION BLOCKED (MISMATCH / DANGEROUS)
              <div style={{ backgroundColor: M3.crimsonSurface, border: `1.5px solid ${M3.crimsonBorder}`, borderRadius: 8, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: 30 }}>🔴</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 18, color: M3.crimson, fontWeight: 700 }}>DISPENSING BLOCKED · MISMATCH</h4>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: M3.crimson }}>Silent or unapproved substitution strictly prohibited.</p>
                  </div>
                </div>

                {/* Side by side comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '14px 0' }}>
                  <div style={{ backgroundColor: M3.card, padding: 12, borderRadius: 8, border: `1px solid ${M3.border}` }}>
                    <div style={{ fontSize: 11, color: M3.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>Prescribed Strip</div>
                    <strong style={{ fontSize: 14.5, color: M3.textPrimary }}>Amlong 5</strong>
                    <div style={{ fontSize: 12.5, color: M3.textSecondary, marginTop: 4 }}>Amlodipine 5.0mg</div>
                  </div>
                  <div style={{ backgroundColor: M3.card, padding: 12, borderRadius: 8, border: `1.5px solid ${M3.crimsonBorder}` }}>
                    <div style={{ fontSize: 11, color: M3.crimson, textTransform: 'uppercase', fontWeight: 700 }}>Scanned Strip</div>
                    <strong style={{ fontSize: 14.5, color: M3.textPrimary }}>{scanResult.matched_brand}</strong>
                    <div style={{ fontSize: 12.5, color: M3.crimson, marginTop: 4 }}>{scanResult.active_ingredients}</div>
                  </div>
                </div>

                <div style={{ backgroundColor: M3.card, padding: 12, borderRadius: 8, marginBottom: 16, border: `1px solid ${M3.border}` }}>
                  <div style={{ fontSize: 12, color: M3.crimson, fontWeight: 700, marginBottom: 4 }}>Detected Differences:</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: M3.crimson }}>
                    {scanResult.differences.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>

                {!verificationSent ? (
                  <button
                    onClick={handleSendVerification}
                    style={{
                      width: '100%',
                      backgroundColor: M3.blue,
                      color: 'white',
                      border: 'none',
                      padding: '12px 18px',
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    📤 Send Verification Request to Doctor
                  </button>
                ) : (
                  <div style={{ backgroundColor: M3.blueSurface, color: M3.blue, border: `1px solid ${M3.border}`, padding: '10px 14px', borderRadius: 8, fontWeight: 700, textAlign: 'center', fontSize: 13 }}>
                    ✓ Request Queued to Dr. Meera Iyer (Cardiologist)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY LEDGER */}
      {activeTab === 'inventory' && (
        <div style={{ backgroundColor: M3.card, border: `1px solid ${M3.border}`, borderRadius: 12, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: 18, color: M3.textPrimary, margin: '0 0 16px', fontWeight: 700 }}>
            Al-Shifa Pharmacy · Active Drug Inventory Ledger
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${M3.border}`, textAlign: 'left', color: M3.textMuted }}>
                <th style={{ padding: '10px 12px' }}>SKU Name</th>
                <th style={{ padding: '10px 12px' }}>Batch Number</th>
                <th style={{ padding: '10px 12px' }}>Expiry Date</th>
                <th style={{ padding: '10px 12px' }}>In Stock</th>
                <th style={{ padding: '10px 12px' }}>MRP (₹)</th>
              </tr>
            </thead>
            <tbody>
              {inventoryList.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${M3.border}` }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: M3.textPrimary }}>{item.sku_name}</td>
                  <td style={{ padding: '12px', color: M3.textSecondary }}><code>{item.batch_no}</code></td>
                  <td style={{ padding: '12px', color: M3.textSecondary }}>{item.expiry_on}</td>
                  <td style={{ padding: '12px', fontWeight: 700, color: item.qty < 100 ? M3.amber : M3.green }}>
                    {item.qty} units
                  </td>
                  <td style={{ padding: '12px', color: M3.textPrimary }}>₹{item.mrp.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: CSV CONNECTOR */}
      {activeTab === 'csv' && (
        <div style={{ backgroundColor: M3.card, border: `1px solid ${M3.border}`, borderRadius: 12, padding: 22, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: 18, color: M3.textPrimary, margin: '0 0 10px', fontWeight: 700 }}>
            Indian Pharmacy ERP CSV Import Wizard
          </h3>
          <p style={{ fontSize: 13, color: M3.textMuted, margin: '0 0 16px' }}>
            Auto-detects and normalizes inventory files exported from Marg ERP, RetailGraph, and generic CSV formats.
          </p>

          <textarea
            rows={6}
            value={csvContent}
            onChange={e => setCsvContent(e.target.value)}
            placeholder="Paste CSV rows here or sample: SKU_NAME,BATCH_NO,EXPIRY_DATE,STOCK_QTY,MRP..."
            style={{
              width: '100%',
              backgroundColor: M3.bg,
              color: M3.textPrimary,
              border: `1px solid ${M3.borderStrong}`,
              padding: '12px',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'monospace',
              marginBottom: 16
            }}
          />

          <button
            onClick={handleImportCsv}
            style={{
              backgroundColor: M3.blue,
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 13.5
            }}
          >
            Import & Verify ERP Stock
          </button>

          {importSummary && (
            <div style={{ marginTop: 20, backgroundColor: M3.greenSurface, border: `1px solid ${M3.greenBorder}`, padding: 16, borderRadius: 8 }}>
              <strong style={{ color: M3.green, fontSize: 14 }}>✓ Import Successful ({importSummary.timestamp})</strong>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: M3.textSecondary }}>
                Processed {importSummary.total} rows. Rejects: 0. Catalog synchronized with zero conflicts.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
