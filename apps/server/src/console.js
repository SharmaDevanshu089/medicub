const express = require('express');
const router = express.Router();
const store = require('./store');

router.get('/', (req, res) => {
  const auditVerification = store.verifyAuditChain();
  const openFlags = Array.from(store.flags.values()).filter(f => f.status === 'open');
  const recentAudits = store.auditLog.slice(-15).reverse();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Medicub Server · Clinical Mission Control</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --border: #E2E8F0;
      --border-strong: #CBD5E1;
      --text: #0F172A;
      --text-muted: #64748B;
      --text-secondary: #475569;
      --blue: #1A73E8;
      --blue-surface: #EFF6FF;
      --teal: #006874;
      --teal-surface: #E6F4F1;
      --critical: #B91C1C;
      --critical-surface: #FEF2F2;
      --high: #B45309;
      --high-surface: #FFFBEB;
      --success: #15803D;
      --success-surface: #ECFDF5;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 28px 36px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: center; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 18px 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .title-group h1 { font-size: 22px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 8px; }
    .title-group p { color: var(--text-muted); font-size: 13px; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; }
    .badge-success { background: var(--success-surface); color: var(--success); border: 1px solid #A7F3D0; }
    .badge-critical { background: var(--critical-surface); color: var(--critical); border: 1px solid #FECACA; }
    .badge-teal { background: var(--teal-surface); color: var(--teal); border: 1px solid #CCECE6; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; margin-bottom: 24px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .card-title { font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 600; margin-bottom: 8px; }
    .card-val { font-size: 26px; font-weight: 700; color: var(--text); }
    .btn { background: var(--blue); color: white; border: none; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 700; }
    .btn:hover { background: #1557B0; }
    .btn-danger { background: #DC2626; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13.5px; }
    th { text-align: left; padding: 12px; color: var(--text-muted); border-bottom: 2px solid var(--border); font-weight: 600; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 12px; border-bottom: 1px solid var(--border); color: var(--text-secondary); }
    .hash { font-family: monospace; color: var(--blue); font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-group">
      <h1>🛡️ Medicub Server · Clinical Mission Control</h1>
      <p>Deterministic Safety Engine & Cryptographic Audit Verification Chain · Catalyst PS4</p>
    </div>
    <div style="display: flex; align-items: center; gap: 12px;">
      <span class="badge badge-success">● System Liveness OK</span>
      <span class="badge badge-teal">Rust Core Embedded</span>
      <button class="btn btn-danger" onclick="resetDemo()">Reset Demo Seed</button>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Audit Chain Integrity (SHA-256)</div>
      <div class="card-val" style="color: ${auditVerification.ok ? 'var(--success)' : 'var(--critical)'}">
        ${auditVerification.ok ? '✓ TAMPER-EVIDENT' : '❌ HASH BROKEN'}
      </div>
      <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 6px;">
        ${auditVerification.checked} sequential SHA-256 blocks validated.
      </p>
    </div>

    <div class="card">
      <div class="card-title">Open Safety Flags</div>
      <div class="card-val" style="color: ${openFlags.length > 0 ? 'var(--high)' : 'var(--success)'}">
        ${openFlags.length}
      </div>
      <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 6px;">
        Zero flags auto-closed. All require named doctor decisions.
      </p>
    </div>

    <div class="card">
      <div class="card-title">Prescriptions in System</div>
      <div class="card-val">${store.prescriptions.size}</div>
      <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 6px;">
        ${Array.from(store.prescriptions.values()).filter(p => p.status === 'signed').length} active signed regimens.
      </p>
    </div>

    <div class="card">
      <div class="card-title">Curated Drug Catalog</div>
      <div class="card-val">${store.catalog.drugs.size} Drugs</div>
      <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 6px;">
        ${store.catalog.ingredients.size} ingredients, ${store.catalog.interactions.length} reviewed interactions.
      </p>
    </div>
  </div>

  <div class="card" style="margin-bottom: 24px;">
    <h2 style="font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 4px;">Live Audit Log (SHA-256 Cryptographic Chain)</h2>
    <p style="font-size: 12.5px; color: var(--text-muted);">
      Every clinical state change writes an append-only entry chained to the previous entry hash.
    </p>
    <table>
      <thead>
        <tr>
          <th>Seq</th>
          <th>Time</th>
          <th>Actor</th>
          <th>Action</th>
          <th>Sentence</th>
          <th>Entry Hash</th>
        </tr>
      </thead>
      <tbody>
        ${recentAudits
          .map(
            a => `
          <tr>
            <td><strong>#${a.seq}</strong></td>
            <td style="color: var(--text-muted);">${new Date(a.at).toLocaleTimeString()}</td>
            <td><strong>${a.actor_name}</strong> <span style="font-size: 11.5px; color: var(--text-muted);">(${a.actor_role})</span></td>
            <td><code>${a.action}</code></td>
            <td style="color: var(--text);">${a.sentence}</td>
            <td class="hash">${a.entry_hash.substring(0, 16)}...</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <script>
    async function resetDemo() {
      if (confirm('Reset database to pristine demo seed state?')) {
        const res = await fetch('/v1/admin/seed/reset', { method: 'POST' });
        if (res.ok) {
          alert('Demo data successfully reset to seed state.');
          window.location.reload();
        }
      }
    }
  </script>
</body>
</html>`;

  res.send(html);
});

module.exports = router;
