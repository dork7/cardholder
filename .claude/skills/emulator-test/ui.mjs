#!/usr/bin/env node
// Drives Doc Keeper on an Android emulator through adb + uiautomator, so every case runs the same way.
//
//   node ui.mjs link <route>               open cardholder://<route> (e.g. settings, card/<id>, edit/new)
//   node ui.mjs tap <sel> [--long]         tap (or long-press) the first node matching <sel>, scrolling to it if needed
//   node ui.mjs scrollto <sel>             scroll down, then up, until <sel> is on screen; exit 1 if never
//   node ui.mjs wait <sel> [ms]            wait until <sel> is on screen (default 8000 ms); exit 1 if not
//   node ui.mjs gone <sel> [ms]            wait until <sel> is off screen; exit 1 if still there
//   node ui.mjs has <sel>                  exit 0 if on screen now, 1 if not
//   node ui.mjs type <text>                type into the focused field
//   node ui.mjs key back|enter|home        press a key
//   node ui.mjs swipe left|right|up|down   swipe across the middle of the screen
//   node ui.mjs find <sel>                 print matching nodes as JSON (id, desc, text, bounds)
//   node ui.mjs screen                     print every labelled node on screen, one per line
//   node ui.mjs shot <runDir> <caseId>     save a screenshot as <runDir>/shots/<caseId>[-n].png, print its path
//
// <sel> is id:<testID>, desc:<content-desc>, text:<visible text>, or bare text tried against all three.
// Exact matches win; a bare selector falls back to substring. A trailing * matches by prefix ('id:row-*'; quote it so the shell doesn't glob it).
// uiautomator only sees what is on screen: wait/has/find do not scroll, so scrollto first for controls below the fold.
// Set ANDROID_SERIAL to target one device when several are attached.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const PKG = 'com.hamza.cardholder';
const sdkAdb = join(process.env.ANDROID_HOME || join(homedir(), 'Library/Android/sdk'), 'platform-tools/adb');
const ADB = existsSync(sdkAdb) ? sdkAdb : 'adb';

const adb = (args, opts = {}) => execFileSync(ADB, args, { maxBuffer: 64 << 20, ...opts });
const sh = (...args) => adb(['shell', ...args]).toString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function dump() {
  let xml = '';
  for (let i = 0; i < 3 && !xml.includes('<hierarchy'); i++) {
    try { xml = adb(['exec-out', 'uiautomator', 'dump', '/dev/tty']).toString(); } catch { /* idle timeout; retry */ }
  }
  const nodes = [];
  for (const m of xml.matchAll(/<node ([^>]*?)\/?>/g)) {
    const a = Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, unescape(v)]));
    const b = a.bounds?.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!b) continue;
    const [x1, y1, x2, y2] = b.slice(1).map(Number);
    if (x2 <= x1 || y2 <= y1) continue;
    nodes.push({
      id: (a['resource-id'] || '').replace(/^.*:id\//, ''),
      desc: a['content-desc'] || '',
      text: a.text || '',
      clickable: a.clickable === 'true',
      checked: a.checked === 'true',
      enabled: a.enabled !== 'false',
      bounds: [x1, y1, x2, y2],
      center: [Math.round((x1 + x2) / 2), Math.round((y1 + y2) / 2)],
    });
  }
  return nodes;
}

function unescape(s) {
  return s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#10;/g, '\n').replace(/&amp;/g, '&');
}

function match(nodes, sel) {
  const m = sel.match(/^(id|desc|text):(.*)$/s);
  const fields = m ? [m[1]] : ['id', 'desc', 'text'];
  const want = m ? m[2] : sel;
  const prefix = want.endsWith('*');
  const base = prefix ? want.slice(0, -1) : want;
  const exact = nodes.filter((n) => fields.some((f) => (prefix ? n[f].startsWith(base) : n[f] === base) && n[f] !== ''));
  if (exact.length || m) return exact;
  const lower = base.toLowerCase();
  return nodes.filter((n) => fields.some((f) => n[f].toLowerCase().includes(lower)));
}

async function waitFor(sel, ms, present = true) {
  const until = Date.now() + ms;
  for (;;) {
    const found = match(dump(), sel).length > 0;
    if (found === present) return true;
    if (Date.now() > until) return false;
    await sleep(400);
  }
}

function scrollPage(dir) {
  const [w, h] = screenSize();
  const x = Math.round(w / 2), a = Math.round(h * 0.7), b = Math.round(h * 0.35);
  sh('input', 'swipe', x, dir === 'down' ? a : b, x, dir === 'down' ? b : a, '400');
}

async function scrollTo(sel) {
  let nodes = dump();
  for (const dir of ['down', 'up']) {
    for (let i = 0; i < 10; i++) {
      const hits = match(nodes, sel);
      if (hits.length) return hits;
      const before = labelled(nodes).join('\n');
      scrollPage(dir);
      await sleep(350);
      nodes = dump();
      if (labelled(nodes).join('\n') === before) break; // reached the end in this direction
    }
  }
  return match(nodes, sel);
}

function screenSize() {
  const m = sh('wm', 'size').match(/(\d+)x(\d+)\s*$/m);
  return m ? [Number(m[1]), Number(m[2])] : [1080, 2400];
}

const [cmd, ...rest] = process.argv.slice(2);
const fail = (msg) => { console.error(msg); process.exit(1); };

switch (cmd) {
  case 'link': {
    const route = (rest[0] || '').replace(/^\/+/, '');
    sh('am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', `'cardholder://${route}'`, PKG);
    console.log(`opened cardholder://${route}`);
    break;
  }
  case 'tap': {
    const sel = rest.find((r) => !r.startsWith('--'));
    const hits = await scrollTo(sel);
    if (!hits.length) fail(`no node matches ${sel}. On screen:\n${labelled(dump()).join('\n')}`);
    const [x, y] = hits[0].center;
    if (rest.includes('--long')) sh('input', 'swipe', x, y, x, y, '900');
    else sh('input', 'tap', x, y);
    console.log(`tapped ${sel} at ${x},${y}`);
    break;
  }
  case 'scrollto': {
    if (!(await scrollTo(rest[0])).length) fail(`not found after scrolling: ${rest[0]}`);
    console.log(`visible: ${rest[0]}`);
    break;
  }
  case 'wait':
  case 'gone': {
    const ok = await waitFor(rest[0], Number(rest[1] || 8000), cmd === 'wait');
    if (!ok) fail(`${cmd === 'wait' ? 'never appeared' : 'still on screen'}: ${rest[0]}. On screen:\n${labelled(dump()).join('\n')}`);
    console.log(`${cmd === 'wait' ? 'visible' : 'gone'}: ${rest[0]}`);
    break;
  }
  case 'has':
    process.exit(match(dump(), rest[0]).length ? 0 : 1);
  case 'type': {
    const text = rest.join(' ').replace(/([\\'"`$&|;<>()*?!#~])/g, '\\$1').replace(/ /g, '%s');
    sh('input', 'text', `'${text}'`);
    break;
  }
  case 'key': {
    const codes = { back: 4, enter: 66, home: 3, del: 67, tab: 61 };
    if (!codes[rest[0]]) fail(`unknown key ${rest[0]}`);
    sh('input', 'keyevent', codes[rest[0]]);
    break;
  }
  case 'swipe': {
    const [w, h] = screenSize();
    const cx = Math.round(w / 2), cy = Math.round(h / 2), dx = Math.round(w * 0.35), dy = Math.round(h * 0.3);
    const v = { left: [cx + dx, cy, cx - dx, cy], right: [cx - dx, cy, cx + dx, cy], up: [cx, cy + dy, cx, cy - dy], down: [cx, cy - dy, cx, cy + dy] }[rest[0]];
    if (!v) fail(`unknown direction ${rest[0]}`);
    sh('input', 'swipe', ...v, '300');
    break;
  }
  case 'find':
    console.log(JSON.stringify(match(dump(), rest[0]), null, 1));
    break;
  case 'screen':
    console.log(labelled(dump()).join('\n'));
    break;
  case 'shot': {
    const [runDir, caseId] = rest;
    if (!runDir || !caseId) fail('usage: shot <runDir> <caseId>');
    const dir = join(runDir, 'shots');
    mkdirSync(dir, { recursive: true });
    let file = join(dir, `${caseId}.png`);
    for (let n = 2; existsSync(file); n++) file = join(dir, `${caseId}-${n}.png`);
    writeFileSync(file, adb(['exec-out', 'screencap', '-p']));
    console.log(file);
    break;
  }
  default:
    fail('usage: node ui.mjs link|tap|scrollto|wait|gone|has|type|key|swipe|find|screen|shot … (see the header of this file)');
}

function labelled(nodes) {
  return nodes
    .filter((n) => n.id || n.desc || n.text)
    .map((n) => [n.id && `id:${n.id}`, n.desc && `desc:${JSON.stringify(n.desc)}`, n.text && `text:${JSON.stringify(n.text)}`, n.checked && '[checked]', !n.enabled && '[disabled]'].filter(Boolean).join('  '));
}
