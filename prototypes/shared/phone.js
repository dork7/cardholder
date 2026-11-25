// "Open on phone" button, added to every prototype page by
// scripts/prototypes-server.mjs. Desktop only: a small icon that opens a
// QR code and the network address of the current page. Nothing else.
(function () {
  if (window.matchMedia('(pointer: coarse)').matches || typeof qrcode !== 'function') return;

  const css = `
    .dk-phone{position:fixed;right:16px;bottom:16px;z-index:2147483000;font:13px/1.3 system-ui,sans-serif}
    .dk-phone>button{width:36px;height:36px;border-radius:50%;border:1px solid rgba(0,0,0,.15);
      background:#fff;color:#111;cursor:pointer;display:grid;place-items:center;
      box-shadow:0 2px 8px rgba(0,0,0,.15);padding:0}
    .dk-phone>button:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
    .dk-phone-pop{position:absolute;right:0;bottom:44px;background:#fff;color:#111;border-radius:12px;
      padding:12px;box-shadow:0 8px 24px rgba(0,0,0,.2);text-align:center;width:172px}
    .dk-phone-pop[hidden]{display:none}
    .dk-phone-pop svg{display:block;width:148px;height:148px;margin:0 auto 8px}
    .dk-phone-pop code{font:12px ui-monospace,monospace;word-break:break-all;user-select:all}`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'dk-phone';
  wrap.innerHTML =
    '<div class="dk-phone-pop" hidden role="dialog" aria-label="Open on phone"></div>' +
    '<button type="button" aria-label="Open on phone" title="Open on phone" aria-expanded="false">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5"/>' +
    '<path d="M11 18h2"/></svg></button>';
  document.body.appendChild(wrap);

  const pop = wrap.firstChild;
  const button = wrap.lastChild;
  let origin;

  async function show() {
    if (origin === undefined) {
      origin = await fetch('/__lan').then((r) => r.json()).then((d) => d.origin).catch(() => null);
    }
    if (!origin) {
      pop.textContent = 'No network connection';
    } else {
      const address = origin + location.pathname + location.search + location.hash;
      const qr = qrcode(0, 'M');
      qr.addData(address);
      qr.make();
      pop.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
      const label = document.createElement('code');
      label.textContent = origin.replace('http://', '');
      pop.appendChild(label);
    }
    pop.hidden = false;
    button.setAttribute('aria-expanded', 'true');
  }

  function hide() {
    pop.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    pop.hidden ? show() : hide();
  });
  // Keep prototype keyboard shortcuts (arrow keys) from seeing these events.
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
    e.stopPropagation();
  });
  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) hide();
  });
})();
