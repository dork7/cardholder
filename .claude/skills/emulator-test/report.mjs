#!/usr/bin/env node
// Builds <runDir>/index.html from <runDir>/results.jsonl and the screenshots in <runDir>/shots/.
//   node report.mjs <runDir>
// One results.jsonl line per case:
//   {"id":"H-06","status":"pass|fail|blocked|manual","note":"what was seen","shots":["shots/H-06.png"]}
// Area and case title come from CASES.md by id. Exit code 2 when a case in scope has no line.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const runDir = resolve(process.argv[2] || '.');
const rows = readFileSync(join(runDir, 'results.jsonl'), 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l, i) => {
    try { return JSON.parse(l); } catch { return { id: `line ${i + 1}`, area: '?', case: 'Unreadable result line', status: 'fail', note: l, shots: [] }; }
  });

// Cases in CASES.md (or the run's scope in run.json) with no result line are reported as "missing".
const catalogue = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'CASES.md'), 'utf8');
const areaNames = Object.fromEntries([...catalogue.matchAll(/^## ([A-Z]) — (.+)$/gm)].map((m) => [m[1], m[2]]));
const cases = [...catalogue.matchAll(/^- ([A-Z]-\d+) — ([^—]+)/gm)].map((m) => ({ id: m[1], case: m[2].trim(), area: areaNames[m[1][0]] }));
const meta0 = (() => { try { return JSON.parse(readFileSync(join(runDir, 'run.json'), 'utf8')); } catch { return {}; } })();
const scope = meta0.scope?.length ? meta0.scope : null;
const inScope = cases.filter((c) => !scope || scope.some((s) => c.id === s || c.id.startsWith(`${s}-`)));
const byId = Object.fromEntries(cases.map((c) => [c.id, c]));
for (const r of rows) { r.area = byId[r.id]?.area ?? r.area ?? 'Other'; r.case = r.case ?? byId[r.id]?.case ?? ''; }
const seen = new Set(rows.map((r) => r.id));
for (const c of inScope) if (!seen.has(c.id)) rows.push({ ...c, status: 'missing', note: 'No result recorded.' });

const order = ['fail', 'missing', 'blocked', 'manual', 'pass'];
const count = Object.fromEntries(order.map((s) => [s, rows.filter((r) => r.status === s).length]));
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const meta = meta0;

rows.sort((a, b) => cases.findIndex((c) => c.id === a.id) - cases.findIndex((c) => c.id === b.id));
const areas = [...new Set(rows.map((r) => r.area))];
const section = (area) => `
  <section><h2>${esc(area)}</h2>
  ${rows.filter((r) => r.area === area).map((r) => `
    <article class="case ${esc(r.status)}" data-status="${esc(r.status)}">
      <header><span class="badge">${esc(r.status)}</span><code>${esc(r.id)}</code><h3>${esc(r.case)}</h3></header>
      ${r.note ? `<p>${esc(r.note)}</p>` : ''}
      ${(r.shots || []).length ? `<div class="shots">${r.shots.map((s) => `<a href="${esc(s)}" target="_blank"><img loading="lazy" src="${esc(s)}" alt="${esc(r.id)} screenshot"></a>`).join('')}</div>` : ''}
    </article>`).join('')}
  </section>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Emulator test run</title>
<style>
:root{--bg:#fff;--ink:#141414;--muted:#6b6b6b;--rule:#d9d9d9;--pass:#1f7a3a;--fail:#b3261e;--blocked:#8a5a00;--manual:#3d5a99;--missing:#b3261e}
@media (prefers-color-scheme:dark){:root{--bg:#121212;--ink:#ececec;--muted:#9a9a9a;--rule:#333;--pass:#6fcf8a;--fail:#ff8a80;--blocked:#f0b955;--manual:#9db4ef;--missing:#ff8a80}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 -apple-system,system-ui,sans-serif;padding:24px 16px;max-width:1200px;margin-inline:auto}
h1{font-size:28px;margin:0 0 4px}h2{font-size:18px;border-top:2px solid var(--ink);padding-top:10px;margin:36px 0 8px}h3{font-size:15px;margin:0;font-weight:600}
.meta{color:var(--muted);margin:0 0 16px}.filters{display:flex;gap:8px;flex-wrap:wrap;position:sticky;top:0;background:var(--bg);padding:8px 0;border-bottom:1px solid var(--rule)}
.filters button{font:inherit;border:1px solid var(--ink);background:none;color:var(--ink);padding:6px 12px;cursor:pointer}.filters button[aria-pressed=true]{background:var(--ink);color:var(--bg)}
.case{border-bottom:1px solid var(--rule);padding:12px 0}.case header{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.case p{margin:6px 0 0;color:var(--muted);white-space:pre-wrap}
code{color:var(--muted)}.badge{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;min-width:64px}
.pass .badge{color:var(--pass)}.fail .badge{color:var(--fail)}.blocked .badge{color:var(--blocked)}.manual .badge{color:var(--manual)}.missing .badge{color:var(--missing)}
.shots{display:flex;gap:8px;overflow-x:auto;margin-top:8px}.shots img{height:320px;border:1px solid var(--rule);display:block}
@media (max-width:600px){.shots img{height:240px}}
</style></head><body>
<h1>Emulator test run</h1>
<p class="meta">${esc(meta.device || '')} ${esc(meta.commit || '')} ${esc(meta.started || '')} · ${rows.length} cases · ${order.map((s) => `${count[s]} ${s}`).join(' · ')}</p>
<div class="filters">${['all', ...order].map((s) => `<button data-f="${s}" aria-pressed="${s === 'all'}">${s}${s === 'all' ? '' : ` (${count[s]})`}</button>`).join('')}</div>
${areas.map(section).join('')}
<script>
document.querySelectorAll('.filters button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.filters button').forEach(x=>x.setAttribute('aria-pressed',x===b));
  document.querySelectorAll('.case').forEach(c=>c.hidden=b.dataset.f!=='all'&&c.dataset.status!==b.dataset.f);
  document.querySelectorAll('section').forEach(s=>s.hidden=![...s.querySelectorAll('.case')].some(c=>!c.hidden));
});
</script></body></html>`;

writeFileSync(join(runDir, 'index.html'), html);
console.log(`${join(runDir, 'index.html')}  (${order.map((s) => `${count[s]} ${s}`).join(', ')})`);
const missing = rows.filter((r) => r.status === 'missing').map((r) => r.id);
if (missing.length) { console.log(`missing: ${missing.join(' ')}`); process.exit(2); }
