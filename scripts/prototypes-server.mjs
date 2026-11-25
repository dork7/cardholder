// Serves prototypes/ on the local network so they can be opened on a phone.
// Every prototype page gets a small phone button (prototypes/shared/phone.js)
// that shows a QR code and the network address of the current page.
// Only files under prototypes/ are served.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';

const PORT = Number(process.env.PORT) || 4178;
const ROOT = resolve(import.meta.dirname, '..');
const PROTOTYPES = join(ROOT, 'prototypes');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.md': 'text/plain; charset=utf-8',
};

const PHONE_TAGS =
  '<script src="/prototypes/shared/qrcode.min.js"></script>' +
  '<script src="/prototypes/shared/phone.js"></script>';

function lanAddress() {
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

async function resolveFile(pathname) {
  const file = normalize(join(ROOT, decodeURIComponent(pathname)));
  if (file !== PROTOTYPES && !file.startsWith(PROTOTYPES + sep)) return null;
  const info = await stat(file).catch(() => null);
  if (!info) return null;
  if (info.isDirectory()) {
    const index = join(file, 'index.html');
    return (await stat(index).catch(() => null)) ? index : null;
  }
  return file;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/__lan') {
    const ip = lanAddress();
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ origin: ip ? `http://${ip}:${PORT}` : null }));
    return;
  }

  // A folder URL without a trailing slash breaks relative links.
  const file = await resolveFile(url.pathname);
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
    return;
  }
  if (file.endsWith('index.html') && !url.pathname.endsWith('/') && !url.pathname.endsWith('.html')) {
    res.writeHead(301, { location: url.pathname + '/' + url.search });
    res.end();
    return;
  }

  const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  let body = await readFile(file);
  if (type.startsWith('text/html')) {
    const html = body.toString('utf8');
    body = html.includes('</body>') ? html.replace('</body>', `${PHONE_TAGS}</body>`) : html + PHONE_TAGS;
  }
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = lanAddress();
  console.log(`Prototypes: http://127.0.0.1:${PORT}/prototypes/`);
  if (ip) console.log(`On your phone (same Wi-Fi): http://${ip}:${PORT}/prototypes/`);
});
