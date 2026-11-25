// PROTOTYPE (throwaway): four dark-mode treatments of the same four screens, switchable via ?variant=.
// Assumption: this is read-only visual study; "A" mirrors the shipped dark palette in src/ui/theme.ts.
const variants = [
  { id: 'navy', name: 'A · Navy glass', blurb: 'The shipped direction, refined: deep navy, glassy raised controls, soft borders, tinted space tiles.',
    t: { frame:'#262c3d', bg:'#101827', surface:'#19253a', surface2:'#233149', glass:'#233149d6', text:'#f3f6fc', muted:'#b5c1d3', accent:'#a7b3ff', onaccent:'#10243e', danger:'#ff8b9b',
      border:'rgba(255,255,255,.12)', shadow:'0 4px 14px #0004', hero1:'#484fbf', hero2:'#252f9d', heroshadow:'0 10px 28px #0006', heroborder:'rgba(255,255,255,.14)', dim:'brightness(.93)',
      vbtn:'#ffffff1c', vborder:'#ffffff2e', spaces:['#383055','#213f3b','#403729','#263b61'], sborder:'rgba(255,255,255,.10)' } },
  { id: 'graphite', name: 'B · Graphite', blurb: 'Neutral grey, no blue cast. Elevation is purely tonal (lighter = higher), no borders or shadows, accent desaturated so it does not glare.',
    t: { frame:'#26262b', bg:'#121214', surface:'#1c1c20', surface2:'#26262c', glass:'#2c2c33e8', text:'#e8e8ed', muted:'#a7a7b2', accent:'#aab3f2', onaccent:'#14152b', danger:'#f2a0a8',
      border:'transparent', shadow:'none', hero1:'#41479f', hero2:'#2c3178', heroshadow:'none', heroborder:'transparent', dim:'brightness(.88) saturate(.92)',
      vbtn:'#ffffff18', vborder:'transparent', spaces:['#2f2b44','#223532','#38301f','#252f4a'], sborder:'transparent' } },
  { id: 'oled', name: 'C · Midnight OLED', blurb: 'True black for OLED screens and battery. Surfaces are near-black with indigo hairline borders; the hero glows; space tiles are outlined, not filled.',
    t: { frame:'#1b1b22', bg:'#000000', surface:'#0b0c11', surface2:'#15161e', glass:'#101119e6', text:'#eef0f8', muted:'#9fa7bd', accent:'#b4beff', onaccent:'#0b0f33', danger:'#ff9aa6',
      border:'rgba(167,179,255,.20)', shadow:'none', hero1:'#2c34bb', hero2:'#10155a', heroshadow:'0 0 46px #3442e655', heroborder:'rgba(180,190,255,.35)', dim:'brightness(.82) saturate(.9)',
      vbtn:'#ffffff14', vborder:'#b4beff40', spaces:['#12101f','#0b1a18','#1a150c','#0d1526'], sborder:'rgba(167,179,255,.35)' } },
  { id: 'comfort', name: 'D · Comfort (recommended)', blurb: 'Built for readability: soft near-black (not pure black, avoids halation), tonal elevation plus a faint border, off-white text, muted text at 7:1+, one calm accent, tinted tiles, dimmed document art, 44px touch targets and larger small text.',
    t: { frame:'#23262e', bg:'#0f1218', surface:'#171b24', surface2:'#222836', glass:'#1d2330ee', text:'#e9edf5', muted:'#b3bccd', accent:'#a9b8ff', onaccent:'#0e1430', danger:'#ffa3ae',
      border:'rgba(255,255,255,.09)', shadow:'0 2px 8px #0003', hero1:'#3d46a8', hero2:'#2a3182', heroshadow:'0 8px 22px #0005', heroborder:'rgba(255,255,255,.12)', dim:'brightness(.9) saturate(.92)',
      vbtn:'#ffffff1c', vborder:'#ffffff30', spaces:['#2a2740','#1d3331','#352f22','#222f4a'], sborder:'rgba(255,255,255,.08)', tap:'44px', fs:'12px', navfs:'11px' } },
];
const I = {
  search:'<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 5 5"/>', plus:'<path d="M12 5v14M5 12h14"/>', pin:'<path d="M8 3h8l-1 6 3 3v2H6v-2l3-3zM12 14v8"/>',
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>', doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4"/>', note:'<path d="M5 3h10l4 4v14H5z"/><path d="M8 12h8M8 16h6"/>',
  space:'<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
  rotate:'<path d="M20 12a8 8 0 1 1-3-6.2M20 4v5h-5"/>', sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>', hold:'<path d="M9 11V5a2 2 0 0 1 4 0v6M13 11V8a2 2 0 0 1 4 0v5a6 6 0 0 1-6 6H9a5 5 0 0 1-4-2l-2-3a2 2 0 0 1 3-2l2 2"/>'
};
const ic = (n) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
const docs = [
  { n:'Emirates ID', s:'Personal', c:'lilac', k:'ID card', ch:'Changed 7 seconds ago', pin:true },
  { n:'Driving licence', s:'Personal', c:'mint', k:'Licence', ch:'Changed 36 seconds ago', pin:true },
  { n:'Health insurance', s:'Family', c:'sand', k:'Insurance', ch:'Changed 49 minutes ago', pin:false },
  { n:'Apartment contract', s:'Home', c:'blue', k:'PDF · 4 pages', ch:'Changed yesterday', pin:false },
];
const notes = [
  { t:'For the next trip', b:'Passport, residency and travel insurance. Check the expiry dates before booking.', s:'Travel' },
  { t:'Moving checklist', b:'Transfer utilities, update the address and keep the apartment contract nearby.', s:'Home' },
];
const spaceNames = ['Personal','Family','Home','Travel'];
const statusBar = '<div class="status"><span>9:41</span><span>▂▄▆ ◉ ▰</span></div>';
const topBar = (sub) => `<div class="top"><div class="brand">doc keeper<small>${sub}</small></div><div style="display:flex;gap:8px"><span class="ibtn">${ic('search')}</span><span class="ibtn">${ic('plus')}</span></div></div>`;
const nav = (on) => `<div class="nav">${[['Home','home'],['Documents','doc'],['Notes','note'],['Spaces','space']].map(([l,i]) => `<div class="${l===on?'on':''}">${ic(i)}${l}</div>`).join('')}</div>`;
const row = (d) => `<div class="row"><span class="thumb ${d.c}"></span><span class="rc"><strong>${d.n}</strong><span>${d.s} space · ${d.ch}</span></span><span class="pin ${d.pin?'on':''}">${ic('pin')}</span></div>`;
const screens = {
  'Home': () => `${statusBar}<div class="body">${topBar('Your private space')}<div class="search">${ic('search')} Search documents and notes</div>
    <div class="hero"><h2>My favorites</h2><div class="art lilac"><div><small>✦ ${docs[0].k}</small><br><b>${docs[0].n}</b></div><div><div class="ln"></div><div class="ln" style="width:70%"></div></div></div><div class="meta"><strong>${docs[0].n}</strong><span>Personal space</span></div></div>
    <div class="row-h"><h2>Recently visited</h2></div><div class="rows">${docs.slice(1,4).map(row).join('')}</div></div>${nav('Home')}`,
  'Documents': () => `${statusBar}<div class="body">${topBar('Documents')}<div class="chips"><span class="chip on">All</span><span class="chip">Pinned</span><span class="chip">Expiring</span><span class="chip">Tags</span></div>
    <div class="rows">${docs.concat(docs.slice(0,1)).map(row).join('')}</div></div>${nav('Documents')}`,
  'Spaces & notes': (t) => `${statusBar}<div class="body">${topBar('Spaces')}<div class="spaces">${spaceNames.map((s,i) => `<div class="space" style="--s:${t.spaces[i]};--sborder:${t.sborder}"><strong>${s}</strong><small>${i+1} documents · ${i} notes</small></div>`).join('')}</div>
    <div class="row-h"><h2>Notes</h2></div>${notes.map(n => `<div class="note"><em>${n.s}</em><br><strong>${n.t}</strong><p>${n.b}</p></div>`).join('')}</div>${nav('Spaces')}`,
  'Full screen': () => `${statusBar}<div class="body" style="gap:0"><div class="doc"><b>Emirates ID</b><div class="ln" style="width:55%"></div><div class="ln"></div><div class="ln" style="width:80%"></div><div style="flex:1"></div><div class="ln" style="width:40%"></div></div>
    <div class="vbar"><span class="vbtn round">${ic('rotate')}</span><span class="vbtn round">${ic('sun')}</span><span class="vbtn">${ic('hold')} Hold</span></div><div class="vclose">Close</div></div>`,
};
// WCAG contrast
const hex = (h) => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
const lum = (h) => { const [r,g,b] = hex(h).map(v => { v/=255; return v<=.03928 ? v/12.92 : ((v+.055)/1.055)**2.4; }); return .2126*r+.7152*g+.0722*b; };
const ratio = (a,b) => { const [x,y] = [lum(a),lum(b)].sort((p,q) => q-p); return (x+.05)/(y+.05); };
function report(v) {
  const t = v.t;
  const rows = [['Text on background',t.text,t.bg,4.5],['Muted text on background',t.muted,t.bg,4.5],['Muted text on surface',t.muted,t.surface,4.5],['Text on raised surface',t.text,t.surface2,4.5],
    ['Accent on background',t.accent,t.bg,3],['Label on accent button',t.onaccent,t.accent,4.5],['White on hero (lighter end)','#ffffff',t.hero1,4.5],['Danger on background',t.danger,t.bg,4.5]];
  return `<h3>Contrast, ${v.name} (WCAG: 4.5 text, 3 for non-text accents)</h3><table><tr><th>Pair</th><th>Foreground</th><th>Background</th><th>Ratio</th><th></th></tr>${rows.map(([l,f,b,min]) => { const r = ratio(f,b); return `<tr><td>${l}</td><td><span class="sw" style="background:${f}"></span>${f}</td><td><span class="sw" style="background:${b}"></span>${b}</td><td>${r.toFixed(2)}:1</td><td class="${r>=min?'ok':'warn'}">${r>=min?'pass':'below '+min}</td></tr>`; }).join('')}</table>`;
}
const params = new URLSearchParams(location.search);
let idx = Math.max(0, variants.findIndex(v => v.id === params.get('variant')));
function render() {
  const v = variants[idx], t = v.t;
  document.getElementById('title').textContent = v.name;
  document.getElementById('blurb').textContent = v.blurb;
  document.getElementById('label').textContent = `${'ABCD'[idx]} (${v.name.split('· ')[1]})`;
  const style = Object.entries(t).filter(([k]) => k !== 'spaces').map(([k,val]) => `--${k}:${val}`).join(';');
  document.getElementById('screens').innerHTML = Object.entries(screens).map(([name, fn]) =>
    `<div class="slot"><div class="phone ${name==='Full screen'?'viewer':''}" style="${style}">${fn(t)}</div><span>${name}</span></div>`).join('');
  document.getElementById('report').innerHTML = report(v);
  const u = new URL(location.href); u.searchParams.set('variant', v.id); history.replaceState(null, '', u);
}
const go = (d) => { idx = (idx + d + variants.length) % variants.length; render(); };
document.getElementById('previous').onclick = () => go(-1);
document.getElementById('next').onclick = () => go(1);
addEventListener('keydown', (e) => { if (/input|textarea/i.test(e.target.tagName) || e.target.isContentEditable) return; if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); });
render();
