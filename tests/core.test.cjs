const test = require('node:test');
const assert = require('node:assert/strict');
const { Scroller, settings } = require('../core.js');

function fixture(options = {}) {
  let time = 0, position = 0, limit = 100000, next = 0;
  const frames = new Map(), events = [], posts = [];
  const engine = new Scroller({
    requestFrame: fn => { frames.set(++next, fn); return next; },
    cancelFrame: id => frames.delete(id),
    position: () => position,
    scrollBy: amount => { position = Math.min(limit, position + amount); },
    viewportHeight: () => 800,
    posts: () => posts.map(p => ({ key: p.id, top: p.top - position, bottom: p.bottom - position })),
    onState: (state, running) => events.push({ state, running }),
  }, { pauseOnPosts: false, ...options });
  function advance(ms, interval = 10) {
    for (let elapsed = 0; elapsed < ms; elapsed += interval) {
      time += Math.min(interval, ms - elapsed);
      const current = [...frames.entries()];
      for (const [id, callback] of current) { frames.delete(id); callback(time); }
      assert.ok(frames.size <= 1, 'there must never be duplicate animation loops');
    }
  }
  return { engine, advance, frames, posts, events, get position() { return position; }, set limit(v) { limit = v; } };
}

test('speed uses elapsed time, including slower frame rates', () => {
  for (const interval of [10, 20, 50]) {
    const f = fixture({ speed: 100 });
    f.engine.start(); f.advance(1000 + interval, interval);
    assert.equal(f.position, 100);
    assert.equal(f.engine.distance, 100);
  }
});
test('starting repeatedly and changing speed cannot create extra loops', () => {
  const f = fixture();
  f.engine.start(); f.engine.start(); f.advance(100);
  for (let i = 0; i < 20; i++) f.engine.configure({ speed: 100 + i });
  f.advance(1000);
  assert.equal(f.frames.size, 1);
  f.engine.stop(); f.advance(1000);
  assert.equal(f.frames.size, 0);
});
test('a tall post is paused once, then scrolling continues beyond the pause', () => {
  const f = fixture({ pauseOnPosts: true, pauseSeconds: 1, speed: 100 });
  f.posts.push({ id: 'tall', top: 50, bottom: 2000 });
  f.engine.start(); f.advance(500);
  assert.equal(f.engine.state, 'Reading this post');
  assert.equal(f.position, 0);
  f.advance(2500);
  assert.ok(f.position > 150);
  assert.equal(f.events.filter(e => e.state === 'Reading this post').length, 1);
});
test('each newly reached post receives one pause', () => {
  const f = fixture({ pauseOnPosts: true, pauseSeconds: 1, speed: 100 });
  f.posts.push({ id: 'one', top: 50, bottom: 250 }, { id: 'two', top: 350, bottom: 650 });
  f.engine.start(); f.advance(6000);
  assert.equal(f.events.filter(e => e.state === 'Reading this post').length, 2);
});
test('speed changes during reading do not cut the pause short or resurrect a stopped loop', () => {
  const f = fixture({ pauseOnPosts: true, pauseSeconds: 2 });
  f.posts.push({ id: 'one', top: 50, bottom: 800 });
  f.engine.start(); f.advance(500); f.engine.configure({ speed: 300 }); f.advance(1000);
  assert.equal(f.position, 0);
  f.engine.stop(); f.advance(5000);
  assert.equal(f.position, 0);
  assert.equal(f.frames.size, 0);
});
test('turning reading pauses off resumes without waiting for the old deadline', () => {
  const f = fixture({ pauseOnPosts: true, pauseSeconds: 30 });
  f.posts.push({ id: 'one', top: 50, bottom: 800 });
  f.engine.start(); f.advance(500); f.engine.configure({ pauseOnPosts: false }); f.advance(500);
  assert.ok(f.position > 0);
});
test('counts actual movement, waits at the end, and stops after ten seconds', () => {
  const f = fixture({ speed: 100 });
  f.limit = 7;
  f.engine.start(); f.advance(12000);
  assert.equal(f.engine.distance, 7);
  assert.equal(f.engine.running, false);
  assert.equal(f.engine.state, 'End of loaded feed');
  assert.equal(f.frames.size, 0);
  assert.equal(f.events.filter(e => e.state === 'Waiting for more posts').length, 1);
});
test('newly loaded content resumes scrolling during an end-of-feed wait', () => {
  const f = fixture(); f.limit = 10;
  f.engine.start(); f.advance(1000);
  assert.equal(f.engine.state, 'Waiting for more posts');
  f.limit = 1000; f.advance(1000);
  assert.equal(f.engine.state, 'Scrolling');
  assert.ok(f.position > 10);
});
test('navigation stops and resets the once-per-post reading history', () => {
  const f = fixture({ pauseOnPosts: true });
  f.posts.push({ id: 'one', top: 50, bottom: 800 });
  f.engine.start(); f.advance(100); f.engine.reset();
  assert.equal(f.engine.running, false);
  f.engine.start(); f.advance(100);
  assert.equal(f.events.filter(e => e.state === 'Reading this post').length, 2);
});
test('corrupt saved preferences are bounded and replaced with defaults', () => {
  assert.deepEqual(settings({ speed: NaN, pauseSeconds: -20, collapsed: 'true', pauseOnPosts: null }),
    { speed: 60, pauseSeconds: 1, collapsed: false, pauseOnPosts: true });
  assert.equal(settings({ speed: 1e10 }).speed, 300);
  assert.equal(settings(null).speed, 60);
});
