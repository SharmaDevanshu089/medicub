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
  <title>Medicub Control Console · Hackathon Mission Control</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --critical: #ef4444;
      --high: #f97316;
      --success: #22c55e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 24px; }
    .title-group h1 { font-size: 24px; font-weight: 700; color: var(--accent); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .badge-success { background: rgba(34, 197, 94, 0.2); color: var(--success); border: 1px solid var(--success); }
    .badge-critical { background: rgba(239, 68, 68, 0.2); color: var(--critical); border: 1px solid var(--critical); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 18px; }
    .card-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 8px; }
    .card-val { font-size: 28px; font-weight: 700; }
    .btn { background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
    .btn:hover { background: #0369a1; }
    .btn-secondary { background: #475569; }
    .btn-danger { background: #b91c1c; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th { text-align: left; padding: 10px; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    td { padding: 10px; border-bottom: 1px solid var(--border); }
    .hash { font-family: monospace; color: #38bdf8; font-size: 11px; }
    .scenario-box { background: rgba(2, 132, 199, 0.1); border: 1px solid #0284c7; border-radius: 8px; padding: 16px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-group">
      <h1>Medicub Server · Mission Control Room</h1>
      <p style="color: var(--text-muted); font-size: 13px;">CATALYST Hackathon PS4 Control Console · Named-Human Verification Chain</p>
    </div>
    <div>
      <span class="badge badge-success">● System Liveness OK</span>
      <button class="btn btn-danger" style="margin-left: 12px;" onclick="resetDemo()">Reset Demo Seed</button>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Audit Hash Chain Integrity</div>
      <div class="card-val" style="color: ${auditVerification.ok ? 'var(--success)' : 'var(--critical)'}">
        ${auditVerification.ok ? '✅ TAMPER-EVIDENT' : '❌ HASH BROKEN'}
      </div>
      <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
        ${auditVerification.checked} sequential SHA-256 blocks validated.
      </p>
    </div>

    <div class="card">
      <div class="card-title">Open Safety Flags</div>
      <div class="card-val" style="color: ${openFlags.length > 0 ? 'var(--high)' : 'var(--success)'}">
        ${openFlags.length}
      </div>
      <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
        Zero flags auto-closed. All require named doctor decisions.
      </p>
    </div>

    <div class="card">
      <div class="card-title">Prescriptions in System</div>
      <div class="card-val">${store.prescriptions.size}</div>
      <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
        ${Array.from(store.prescriptions.values()).filter(p => p.status === 'signed').length} active signed regimens.
      </p>
    </div>

    <div class="card">
      <div class="card-title">Curated Drug Catalog</div>
      <div class="card-val">${store.catalog.drugs.size} Drugs</div>
      <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
        ${store.catalog.ingredients.size} ingredients, ${store.catalog.interactions.length} reviewed interactions.
      </p>
    </div>
  </div>

  <div class="card" style="margin-bottom: 24px;">
    <h2 style="font-size: 16px; margin-bottom: 12px;">Live Audit Trail (Cryptographic Hash Chain)</h2>
    <table>
      <thead>
        <tr>
          <th>Seq</th>
          <th>Time</th>
          <th>Actor</th>
          <th>Action</th>
          <th>Sentence</th>
          <th>Entry Hash (SHA-256)</th>
        </tr>
      </thead>
      <tbody>
        ${recentAudits
          .map(
            a => `
          <tr>
            <td>#${a.seq}</td>
            <td style="color: var(--text-muted);">${new Date(a.at).toLocaleTimeString()}</td>
            <td><strong>${a.actor_name}</strong> <span style="font-size: 11px; color: var(--text-muted);">(${a.actor_role})</span></td>
            <td><code>${a.action}</code></td>
            <td>${a.sentence}</td>
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
