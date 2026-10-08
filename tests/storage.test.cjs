const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../core.js');
function background(initial = {}) {
  const store = structuredClone(initial);
  let listener;
  vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'), 'utf8'), {
    importScripts() {}, RedditScrollerCore: core,
    chrome: {
      runtime: { id: 'extension-id', onMessage: { addListener(fn) { listener = fn; } } },
      storage: { local: {
        async get() { await new Promise(resolve => setTimeout(resolve, 1)); return structuredClone(store); },
        async set(value) { Object.assign(store, value); },
      } },
    },
  });
  return { store, listener, send: message => new Promise(resolve => listener(message, { id: 'extension-id' }, resolve)) };
}
test('simultaneous distance updates from multiple tabs are additive', async () => {
  const f = background();
  const results = await Promise.all(Array.from({ length: 20 }, () => f.send({ type: 'distance', pixels: 356 })));
  assert.ok(results.every(r => r.ok));
  assert.equal(f.store.lifetimePixels, 7120);
});
test('imports the legacy counter only once', async () => {
  const f = background();
  await f.send({ type: 'initialize', legacyBananas: 5 });
  await f.send({ type: 'distance', pixels: 10 });
  await f.send({ type: 'initialize', legacyBananas: 500 });
  assert.equal(f.store.lifetimePixels, 5 * 356 + 10);
});
test('invalid requests do not poison later storage operations', async () => {
  const f = background();
  assert.equal((await f.send({ type: 'distance', pixels: -100 })).ok, false);
  assert.equal((await f.send({ type: 'distance', pixels: 20 })).ok, true);
  assert.equal(f.store.lifetimePixels, 20);
  assert.equal(f.listener({ type: 'distance', pixels: 20 }, { id: 'someone-else' }, () => {}), false);
});
test('settings are sanitized and survive a new initialization', async () => {
  const f = background();
  await f.send({ type: 'settings', settings: { speed: 200, pauseOnPosts: false, collapsed: true } });
  const result = await f.send({ type: 'initialize' });
  assert.equal(result.settings.speed, 200);
  assert.equal(result.settings.pauseOnPosts, false);
  assert.equal(result.settings.collapsed, true);
});
