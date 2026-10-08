/* global chrome, importScripts, RedditScrollerCore */
'use strict';
importScripts('core.js');

// Serialize updates across Reddit tabs. Store no URLs or post contents.
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !message || typeof message !== 'object') return false;
  if (!['initialize', 'settings', 'distance'].includes(message.type)) return false;
  queue = queue.catch(() => {}).then(async () => {
    const stored = await chrome.storage.local.get(['settings', 'lifetimePixels', 'legacyImported']);
    let lifetimePixels = Number.isFinite(stored.lifetimePixels) ? Math.max(0, stored.lifetimePixels) : 0;
    let options = RedditScrollerCore.settings(stored.settings);
    const updates = {};
    if (message.type === 'initialize' && !stored.legacyImported) {
      const legacy = Number.isSafeInteger(message.legacyBananas) ? Math.max(0, Math.min(1e9, message.legacyBananas)) : 0;
      lifetimePixels = Math.max(lifetimePixels, legacy * RedditScrollerCore.PIXELS_PER_BANANA);
      updates.legacyImported = true;
      updates.lifetimePixels = lifetimePixels;
    }
    if (message.type === 'settings') {
      options = RedditScrollerCore.settings({ ...options, ...message.settings });
      updates.settings = options;
    }
    if (message.type === 'distance') {
      if (!Number.isFinite(message.pixels) || message.pixels < 0 || message.pixels > 100000) throw new Error('Invalid distance');
      lifetimePixels = Math.min(Number.MAX_SAFE_INTEGER, lifetimePixels + message.pixels);
      updates.lifetimePixels = lifetimePixels;
    }
    if (Object.keys(updates).length) await chrome.storage.local.set(updates);
    return { settings: options, lifetimePixels };
  });
  queue.then(value => respond({ ok: true, ...value }), () => respond({ ok: false }));
  return true;
});
