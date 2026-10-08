(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RedditScrollerCore = api;
})(globalThis, function () {
  'use strict';
  const PIXELS_PER_BANANA = 356;
  const DEFAULTS = Object.freeze({ speed: 60, pauseSeconds: 5, pauseOnPosts: true, collapsed: false });
  function number(value, fallback, min, max) {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.min(max, Math.max(min, value)) : fallback;
  }
  function settings(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    return {
      speed: number(value.speed, DEFAULTS.speed, 10, 300),
      pauseSeconds: number(value.pauseSeconds, DEFAULTS.pauseSeconds, 1, 30),
      pauseOnPosts: typeof value.pauseOnPosts === 'boolean' ? value.pauseOnPosts : true,
      collapsed: typeof value.collapsed === 'boolean' ? value.collapsed : false,
    };
  }
  // One animation loop owns scrolling, reading pauses, and end-of-feed waits.
  class Scroller {
    constructor(env, options) {
      this.env = env;
      this.options = settings(options);
      this.running = false;
      this.frame = null;
      this.seen = new Set();
      this.distance = 0;
      this.fraction = 0;
      this.lastTime = null;
      this.readUntil = 0;
      this.readStarted = 0;
      this.stuckSince = null;
      this.lastPostCheck = -Infinity;
      this.state = '';
      this.tick = this.tick.bind(this);
      this.setState('Ready');
    }
    setState(state) {
      if (state !== this.state) {
        this.state = state;
        this.env.onState?.(state, this.running);
      }
    }
    schedule() {
      if (this.running && this.frame === null) this.frame = this.env.requestFrame(this.tick);
    }
    start() {
      if (this.running) return;
      this.running = true;
      this.lastTime = null;
      this.stuckSince = null;
      this.readUntil = 0;
      this.fraction = 0;
      this.setState('Scrolling');
      this.schedule();
    }
    stop(reason = 'Paused') {
      this.running = false;
      if (this.frame !== null) this.env.cancelFrame(this.frame);
      this.frame = null;
      this.lastTime = null;
      this.readUntil = 0;
      this.fraction = 0;
      this.setState(reason);
    }
    reset(reason = 'Page changed — press Start') {
      this.stop(reason);
      this.seen.clear();
      this.lastPostCheck = -Infinity;
    }
    configure(value) {
      this.options = settings({ ...this.options, ...value });
      if (!this.options.pauseOnPosts) this.readUntil = 0;
      else if (this.readUntil) this.readUntil = this.readStarted + this.options.pauseSeconds * 1000;
    }
    tick(time) {
      this.frame = null;
      if (!this.running) return;
      const elapsed = this.lastTime === null ? 0 : Math.min(100, Math.max(0, time - this.lastTime));
      this.lastTime = time;
      if (time < this.readUntil) {
        this.setState('Reading this post');
        this.schedule();
        return;
      }
      this.readUntil = 0;
      if (this.options.pauseOnPosts && time - this.lastPostCheck >= 100) {
        this.lastPostCheck = time;
        const line = Math.min(160, Math.max(80, this.env.viewportHeight() * 0.18));
        const post = this.env.posts().find(p => !this.seen.has(p.key) && p.top <= line && p.bottom > line + 40);
        if (post) {
          this.seen.add(post.key);
          this.readStarted = time;
          this.readUntil = time + this.options.pauseSeconds * 1000;
          this.fraction = 0;
          this.stuckSince = null;
          this.setState('Reading this post');
          this.schedule();
          return;
        }
      }
      if (this.state === 'Reading this post') this.setState('Scrolling');
      this.fraction += this.options.speed * elapsed / 1000;
      const step = Math.floor(this.fraction);
      this.fraction -= step;
      if (step > 0) {
        const before = this.env.position();
        this.env.scrollBy(step);
        const moved = Math.max(0, Math.min(step, this.env.position() - before));
        if (moved > 0) {
          this.stuckSince = null;
          this.distance += moved;
          this.setState('Scrolling');
          this.env.onDistance?.(moved, this.distance);
        } else {
          if (this.stuckSince === null) this.stuckSince = time;
          this.setState('Waiting for more posts');
          if (time - this.stuckSince >= 10000) {
            this.stop('End of loaded feed');
            return;
          }
        }
      }
      this.schedule();
    }
  }
  return { Scroller, settings, DEFAULTS, PIXELS_PER_BANANA };
});
