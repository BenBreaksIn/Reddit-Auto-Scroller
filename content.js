/* global chrome, RedditScrollerCore */
(() => {
  'use strict';
  const HOST = 'reddit-auto-scroller';
  if (document.getElementById(HOST)) return;
  const { Scroller, settings, PIXELS_PER_BANANA } = RedditScrollerCore;
  const host = document.createElement('div');
  host.id = HOST;
  host.style.cssText = 'all:initial;position:fixed;right:16px;bottom:16px;z-index:2147483646;color-scheme:dark;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.4}
      *{box-sizing:border-box}button,input{font:inherit}button{cursor:pointer}
      section{font:14px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;width:292px;max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);overflow:auto;background:#181b20;color:#f7f7f8;border:1px solid #454b56;border-radius:16px;box-shadow:0 8px 30px #0005;padding:18px}
      header{display:flex;gap:12px;align-items:center;justify-content:space-between}h2{font-size:15px;line-height:1.3;margin:0;font-weight:650}
      .icon{background:transparent;color:#cad0d9;border:1px solid #58616e;border-radius:7px;min-width:32px;height:32px;font-size:18px}
      p{margin:12px 0;color:#c6cbd3;font-size:12px}button:focus-visible,input:focus-visible{outline:3px solid #ffd166;outline-offset:3px}
      .stats{display:flex;align-items:center;gap:10px;border-top:1px solid #3c424c;border-bottom:1px solid #3c424c;padding:12px 0;margin:14px 0 18px}.banana{font-size:24px}.stats div{flex:1}.stats small{display:block;color:#afb8c4;font-size:11px}.stats strong{font-variant-numeric:tabular-nums;font-size:17px;font-weight:600}
      label{display:block;color:#e5e8ed;font-size:12px}.row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:16px}output{color:#ffd166;font-variant-numeric:tabular-nums;font-size:12px}input[type=range]{width:100%;height:24px;margin:8px 0 0;accent-color:#ff7648;cursor:pointer}input[type=checkbox]{accent-color:#ff7648;width:16px;height:16px;margin:0}.check{display:flex;align-items:center;gap:9px;margin-top:16px;cursor:pointer}
      .primary{display:block;width:100%;margin-top:16px;border:0;border-radius:9px;background:#ff7648;color:#1a110d;font-weight:700;min-height:42px;padding:10px}.primary:hover{background:#ff946e}.primary[aria-pressed=true]{background:#e8edf5;color:#18212f}
      .hint{font-size:11px;color:#aeb6c2;margin:10px 0 0;text-align:center}.error{color:#ffc595}[hidden]{display:none!important}
      section.collapsed{width:244px;padding:13px}section.collapsed .details,section.collapsed .hint{display:none}section.collapsed p{margin:8px 0 0}section.collapsed .primary{margin-top:10px}
    </style>
    <section aria-label="Reddit Auto Scroller">
      <header><h2>Reddit Auto Scroller</h2><button class="icon" id="collapse" aria-label="Minimize controls" aria-expanded="true" title="Minimize controls">−</button></header>
      <p id="status" role="status">Ready</p>
      <div class="details">
        <div class="stats"><span class="banana" aria-hidden="true">🍌</span><div><small>This tab</small><strong id="session">0</strong></div><div><small>All time</small><strong id="lifetime">0</strong></div></div>
        <div class="row"><label for="speed">Scrolling speed</label><output id="speed-value" for="speed">60 px/s</output></div>
        <input id="speed" type="range" min="10" max="300" step="10" value="60">
        <label class="check"><input id="reading" type="checkbox" checked>Pause once on each post</label>
        <div id="pause-control"><div class="row"><label for="pause">Reading time</label><output id="pause-value" for="pause">5 sec</output></div><input id="pause" type="range" min="1" max="30" step="1" value="5"></div>
      </div>
      <button class="primary" id="toggle" aria-pressed="false">Start scrolling</button>
      <p class="hint">Scroll manually or press Esc to pause.</p>
      <p id="storage-error" class="error" hidden>Settings could not be saved. Reload this page after updating the extension.</p>
    </section>`;
  document.documentElement.append(host);
  const $ = id => root.getElementById(id);
  const panel = root.querySelector('section');
  const extension = typeof chrome !== 'undefined' && chrome.runtime?.id;
  let options = settings();
  let lifetime = 0;
  let pendingDistance = 0;
  let lastSaved = performance.now();
  let saving = false;
  let changedLocally = false;
  let saveTimer;
  let route = location.href;
  let engine;

  function showOptions() {
    $('speed').value = options.speed;
    $('speed-value').value = `${options.speed} px/s`;
    $('reading').checked = options.pauseOnPosts;
    $('pause').value = options.pauseSeconds;
    $('pause-value').value = `${options.pauseSeconds} sec`;
    $('pause-control').hidden = !options.pauseOnPosts;
    panel.classList.toggle('collapsed', options.collapsed);
    $('collapse').textContent = options.collapsed ? '+' : '−';
    $('collapse').setAttribute('aria-label', options.collapsed ? 'Expand controls' : 'Minimize controls');
    $('collapse').title = options.collapsed ? 'Expand controls' : 'Minimize controls';
    $('collapse').setAttribute('aria-expanded', String(!options.collapsed));
  }
  function showCounts() {
    $('session').textContent = Math.floor((engine?.distance || 0) / PIXELS_PER_BANANA).toLocaleString();
    $('lifetime').textContent = Math.floor((lifetime + pendingDistance) / PIXELS_PER_BANANA).toLocaleString();
  }
  async function message(value) {
    if (!extension) return null; // Standalone preview; no page-storage fallback.
    try {
      const result = await chrome.runtime.sendMessage(value);
      if (!result?.ok) throw new Error('Storage unavailable');
      $('storage-error').hidden = true;
      return result;
    } catch {
      $('storage-error').hidden = false;
      return null;
    }
  }
  async function flushDistance() {
    if (saving || !pendingDistance) return;
    if (!extension) {
      lifetime += pendingDistance;
      pendingDistance = 0;
      lastSaved = performance.now();
      showCounts();
      return;
    }
    saving = true;
    const pixels = Math.min(pendingDistance, 100000);
    pendingDistance -= pixels;
    const result = await message({ type: 'distance', pixels });
    if (result) lifetime = result.lifetimePixels;
    else pendingDistance += pixels;
    lastSaved = performance.now();
    saving = false;
    showCounts();
  }
  function update(value) {
    changedLocally = true;
    options = settings({ ...options, ...value });
    engine.configure(options);
    showOptions();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => message({ type: 'settings', settings: options }), 150);
  }
  function posts() {
    let nodes = document.querySelectorAll('shreddit-post');
    if (!nodes.length) nodes = document.querySelectorAll('[data-testid="post-container"]');
    if (!nodes.length) nodes = document.querySelectorAll('.thing.link');
    return Array.from(nodes, node => {
      const box = node.getBoundingClientRect();
      return { key: node.getAttribute('permalink') || node.id || node, top: box.top, bottom: box.bottom };
    }).filter(post => post.bottom > post.top);
  }
  engine = new Scroller({
    requestFrame: callback => requestAnimationFrame(callback),
    cancelFrame: id => cancelAnimationFrame(id),
    viewportHeight: () => innerHeight,
    position: () => scrollY,
    scrollBy: amount => window.scrollBy({ top: amount, left: 0, behavior: 'instant' }),
    posts,
    onState: (state, running) => {
      $('status').textContent = state;
      $('toggle').textContent = running ? 'Pause scrolling' : 'Start scrolling';
      $('toggle').setAttribute('aria-pressed', String(running));
      if (!running && engine) void flushDistance();
    },
    onDistance: pixels => {
      pendingDistance += pixels;
      showCounts();
      if (pendingDistance >= PIXELS_PER_BANANA || performance.now() - lastSaved >= 5000) void flushDistance();
    },
  }, options);
  $('toggle').addEventListener('click', () => engine.running ? engine.stop() : engine.start());
  $('collapse').addEventListener('click', () => update({ collapsed: !options.collapsed }));
  $('speed').addEventListener('input', event => update({ speed: Number(event.target.value) }));
  $('pause').addEventListener('input', event => update({ pauseSeconds: Number(event.target.value) }));
  $('reading').addEventListener('change', event => update({ pauseOnPosts: event.target.checked }));
  const outside = event => !event.composedPath().includes(host);
  function manual(event) {
    if (engine.running && outside(event)) engine.stop('Paused — you have control');
  }
  window.addEventListener('wheel', manual, { passive: true });
  window.addEventListener('touchstart', manual, { passive: true });
  window.addEventListener('pointerdown', manual, { passive: true });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') { if (engine.running) engine.stop(); return; }
    const target = event.composedPath()[0];
    if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || '')) return;
    if ([' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) manual(event);
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && engine.running) engine.stop('Paused while tab is hidden');
  });
  window.addEventListener('pagehide', () => { engine.stop(); void flushDistance(); });
  function navigation() {
    if (location.href !== route) {
      route = location.href;
      engine.reset();
    }
  }
  window.addEventListener('popstate', navigation);
  new MutationObserver(navigation).observe(document.documentElement, { childList: true, subtree: true });
  if (extension) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.lifetimePixels && Number.isFinite(changes.lifetimePixels.newValue)) {
        lifetime = changes.lifetimePixels.newValue;
        showCounts();
      }
    });
    let legacyBananas = 0;
    try { legacyBananas = Number(localStorage.getItem('redditScrollerLifetimeBananas')) || 0; } catch {}
    message({ type: 'initialize', legacyBananas }).then(result => {
      if (!result) return;
      lifetime = result.lifetimePixels;
      if (!changedLocally) {
        options = settings(result.settings);
        engine.configure(options);
        showOptions();
      }
      showCounts();
    });
  }
  showOptions();
})();
