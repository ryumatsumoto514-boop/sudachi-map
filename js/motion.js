/* =====================================================================
   巣立ちマップ v5 — motion.js  (owner: ENGINE)  — pairs with css/motion.css
   Implements MOTION-SPEC.md §1–§7 at the SPEC-v5 Part A scale: 280–520ms, 24–48px of travel, a spring
   ease-out with ≤4% overshoot, stagger 50ms (cap 8). Print/signage motion: pages that push in with depth,
   rules that draw, type that rises from behind a rule, hanko stamps, station-board digit rolls, a dot that
   flies to やること. transform/opacity only, every animation interruptible, nothing loops.

   Content is visible by default: elements are hidden only after JS has marked them pending
   (html.motion-ready + .m-pending), so a missing IntersectionObserver / a JS error never hides
   anything; a sweep (~1s after mount, after transitions, on <details> open, on resize) reveals any target
   the observer missed. Reduced motion is ONE switch: html.m-reduce (OS setting OR 設定 › 動きを少なく):
   it keeps short opacity fades (150–200ms) and colour changes, and drops every movement.

   ------------------------------------------------------------------ API (all on SM.motion)
   tokens                         {ease, dur, stagger:50, staggerMax:8, rise:28, spring:{snappy,smooth,stamp,flick,rise,pop}}
   reduced() -> bool              OS reduce OR settings.motion==='reduce' (html.m-reduce). Use this, never matchMedia.
   syncReduce() -> bool           re-read the OS + settings and toggle html.m-reduce (core.applySettings calls it)
   tier() -> 'full'|'lite'|'off'  off = reduced; lite = save-data / deviceMemory <1GB at start, or (after the
                                  first 2 navigations) a median of 8 transitions >450ms on a <4GB device. Lite
                                  still moves (shorter travel, cap 5 stagger); it never turns motion off.
   spring(preset|{response,damping,velocity}) -> {easing, duration}
   animate(el, keyframes, {duration, easing, spring, delay, fill, key, commit, clear, reduceOk}) -> Animation|null
                                  reduced: movement props are stripped, opacity/colour fade in 120–180ms
   sequence(steps, {ignoreHold}) -> {play(), skip(), cancel(), finished}
   hold(reason, maxMs=2400) -> release()      whenReleased(fn)      held() -> bool
   finishAll([root], {all, instant, noFlush})
   once(key) -> bool               seen(key[, value]) -> previous
   odometer(el, value, {from, format, duration, delay, direction, instant}) -> Promise
   count(el, to, {from, decimals, format, finalText, duration, tween})
   stamp(el, {ring}) -> Promise    check(el, {color, keep}) -> Promise   nudge(el)   pulse(el)
   flyTo(fromEl, toEl|tabKey, {duration, onArrive, ghost}) -> Promise
                                  a 14px green dot arcs to the target (tab), the tab icon pops, a ring lands,
                                  the badge bumps. ghost:true flies a clone of fromEl instead.
   badge(tabKey|.tab|.tab-badge, value, {roll, bump}) -> el   tab badge: pops in, rolls, fades out at 0
   bump(el, {scale})               a one-shot spring scale (≤1.12)
   expand(container, open, {setOpen, body, closedHeight}) -> Promise   in-place open/close (clip + followers);
                                  SM.ui.more() and every details.disclose / details.more summary use it
   swapText(el, text) -> Promise   press(el)
   sheet(dialogEl, scrimEl, {drag, fast, onDismiss}) -> {open(), close(velocity), destroy(), isDialog()}
   shared(name, el)                sharedTarget(name, el)
   transition(kind, update, {from, to, shared}) -> Promise   kinds: forward|back|tab|none|theme|fade
                                  forward/back = push with depth (old page shifts 30% and dims), tab = cross-fade
                                  + indicator slide; shared names 'cat' (mark) and 'title' morph between pages
   afterTransition(fn[, {keep}])   skipTransition()      inTransition() -> bool
   scrollLinked(el, {prop, from, to, source, range}) -> {destroy()}
   indicator(bar, target, {vertical})
   mount(root[, {instant}])        flip(container, fn[, {selector, duration}])   pulse   drawLine   lineProgress
   revealAll([root])               keepFocus(scope, fn)    format(n, decimals)

   Attributes wired by mount():
     data-reveal[=""|up|slide|fade|rule|underline|line|mark]   data-reveal-delay="ms"
     data-reveal-stagger[="50"] (cap 8; lite 5)   data-count="222" (rolls; data-count-style="tween" = v3 tween,
     data-count-from, data-count-seen="key" → rolls only when changed since the last visit)
     data-draw (SVG stroke draw)   data-press[="ink"] (sink 2px + darken; also .btn/.chip/.tab… automatically)
     data-scroll="fill-y|fill-x|fade"   data-vt="cat title" / data-vt-hero="cat title" / data-vt-scope (shared morphs)
   ===================================================================== */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  var docEl = document.documentElement;
  var noop = function () { };

  var hasIO = typeof window.IntersectionObserver === 'function';
  var hasWAAPI = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
  var hasVT = typeof document.startViewTransition === 'function';
  function supports(p, v) { try { return !!(window.CSS && CSS.supports && CSS.supports(p, v)); } catch (e) { return false; } }
  var hasLinear = supports('animation-timing-function', 'linear(0, 1)');
  var hasSDA = supports('animation-timeline', 'view()');
  var now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };
  var raf = window.requestAnimationFrame ? function (f) { return requestAnimationFrame(f); } : function (f) { return setTimeout(f, 16); };

  /* ---------------------------------------------------------------- tokens */
  var EASE = {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
    draw: 'cubic-bezier(0.5, 0, 0.15, 1)',
    rise: 'cubic-bezier(0.25, 1, 0.5, 1)',
    expo: 'cubic-bezier(0.16, 1, 0.3, 1)'
  };
  /* v5 scale (SPEC-v5 Part A): 280–520ms, travel 24–48px, spring-like ease-out with a tiny overshoot, staggers
     40–60ms capped at 8. v4 (90–300ms, 8–16px) read as "everything is still" on a phone. */
  EASE.spring = 'cubic-bezier(0.22, 1.12, 0.36, 1)';   // ≈3% overshoot: the fallback where linear() is missing
  EASE.push = 'cubic-bezier(0.16, 1, 0.3, 1)';         // page push: fast off the mark, long soft landing
  var DUR = { instant: 100, quick: 200, base: 320, page: 440, morph: 480, draw: 560, hero: 560, reduce: 180 };
  var STAGGER = 50, STAGGER_MAX = 8;
  var RISE = 28;                                       // default reveal travel (px)

  /* ---------------------------------------------------------------- springs
     SwiftUI semantics: response = one undamped period (s), damping = damping fraction.
     velocity = initial velocity in "distances per second" (release px/s ÷ remaining px).
     Rendered to CSS linear(); same numbers as the --spring-* custom properties in motion.css. */
  var SPRINGS = {
    snappy: { response: 0.30, damping: 0.86 },
    smooth: { response: 0.42, damping: 1.00 },
    stamp: { response: 0.32, damping: 0.62 },
    flick: { response: 0.36, damping: 0.92 },
    // v5: reveals, press release, indicators — ≈3% overshoot, settles in ≈520ms
    rise: { response: 0.48, damping: 0.76, velocity: 6 },
    // v5: badge bump, tab icon pop — a little more bounce, short
    pop: { response: 0.34, damping: 0.6 }
  };
  var SPRING_FALLBACK = {
    snappy: { easing: EASE.standard, duration: 320 },
    smooth: { easing: EASE.standard, duration: 400 },
    stamp: { easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)', duration: 420 },
    flick: { easing: EASE.standard, duration: 300 },
    rise: { easing: EASE.spring, duration: 520 },
    pop: { easing: 'cubic-bezier(0.34, 1.5, 0.64, 1)', duration: 420 }
  };
  function springPos(t, w0, z, v0) {
    if (z < 1) {
      var wd = w0 * Math.sqrt(1 - z * z), B = (z * w0 - v0) / wd;
      return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + B * Math.sin(wd * t));
    }
    if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + (w0 - v0) * t);
    var s = Math.sqrt(z * z - 1), r1 = -w0 * (z - s), r2 = -w0 * (z + s);
    var C1 = (-v0 - r2) / (r1 - r2), C2 = 1 - C1;
    return 1 - (C1 * Math.exp(r1 * t) + C2 * Math.exp(r2 * t));
  }
  var springCache = {};
  function spring(p) {
    var name = typeof p === 'string' ? p : null;
    var o = name ? SPRINGS[name] : p;
    if (!o) { name = 'smooth'; o = SPRINGS.smooth; }
    var resp = o.response || 0.4, z = o.damping == null ? 0.86 : o.damping, v0 = o.velocity || 0;
    if (!isFinite(v0)) v0 = 0;
    v0 = Math.max(-40, Math.min(40, v0));
    var key = resp + '|' + z + '|' + Math.round(v0 * 10) / 10;
    if (springCache[key]) return springCache[key];
    var out;
    if (!hasLinear) {
      out = name && SPRING_FALLBACK[name] ? SPRING_FALLBACK[name] :
        { easing: z < 0.8 ? SPRING_FALLBACK.stamp.easing : EASE.standard, duration: Math.round(resp * 1000) };
    } else {
      var w0 = 2 * Math.PI / resp, dt = 1 / 240, t, still = 0, settle = 2;
      for (t = dt; t < 2; t += dt) {
        var x = springPos(t, w0, z, v0);
        if (Math.abs(1 - x) < 0.003) { still += dt; if (still > 0.04) { settle = t - 0.04; break; } } else still = 0;
      }
      var dur = Math.max(120, Math.round(settle * 1000));
      var n = Math.max(12, Math.min(60, Math.round(dur / 14)));
      var pts = [];
      for (var i = 0; i <= n; i++) pts.push(i === n ? '1' : String(Math.round(springPos(settle * i / n, w0, z, v0) * 1000) / 1000));
      out = { easing: 'linear(' + pts.join(', ') + ')', duration: dur };
    }
    springCache[key] = out;
    return out;
  }

  /* ---------------------------------------------------------------- reduced motion: one switch */
  var mq = null;
  try { mq = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { mq = null; }
  function settingReduce() {
    try { return !!(SM.state && SM.state.settings && SM.state.settings.motion === 'reduce'); } catch (e) { return false; }
  }
  function osReduce() { return !!(mq && mq.matches); }
  function reduced() { return osReduce() || settingReduce() || docEl.classList.contains('m-reduce'); }
  function syncReduce() {
    var on = osReduce() || settingReduce();
    docEl.classList.toggle('m-reduce', on);
    syncReady();
    return on;
  }

  /* ---------------------------------------------------------------- tier */
  var tierVal = null, vtTimes = [];
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } }
  function tier() {
    if (reduced()) return 'off';
    if (!tierVal) {
      var forced = ssGet('sm2:tier');
      if (forced === 'lite' || forced === 'full') tierVal = forced;
      else {
        // lite from the start only on data saver or a device that reports under 1GB (deviceMemory 0.25 / 0.5)
        var c = navigator.connection, mem = navigator.deviceMemory;
        tierVal = (c && c.saveData) || (mem && mem < 1) ? 'lite' : 'full';
      }
      docEl.classList.toggle('m-lite', tierVal === 'lite');
    }
    return tierVal;
  }
  /* Demotion to 'lite' is for truly slow devices only (v5). v4 demoted a whole session after a median of 160ms over
     five route renders, which a real phone reaches on the long lists (results, map) and then lost most of its
     motion. Now: samples skip the first two navigations after launch (cold code, Intl, fonts) and any taken while
     web fonts load; a session is demoted only when the MEDIAN of the last eight update callbacks is over 450ms, and
     never on a device that reports 4GB of memory or more. sessionStorage 'sm2:tier' = 'full' | 'lite' forces it. */
  var navSeen = 0, SAMPLES = 8, SLOW_MS = 450;
  function noteUpdate(ms) {
    navSeen++;
    if (navSeen <= 2) return;
    try { if (document.fonts && document.fonts.status === 'loading') return; } catch (e) { }
    vtTimes.push(ms);
    if (vtTimes.length > SAMPLES) vtTimes.shift();
    if (tierVal === 'lite' || ssGet('sm2:tier') === 'full' || vtTimes.length < SAMPLES) return;
    var mem = navigator.deviceMemory;
    if (mem && mem >= 4) return;
    var med = vtTimes.slice().sort(function (a, b) { return a - b; })[SAMPLES >> 1];
    if (med > SLOW_MS) { tierVal = 'lite'; ssSet('sm2:tier', 'lite'); docEl.classList.add('m-lite'); }
  }
  function lite() { return tier() === 'lite'; }

  /* ---------------------------------------------------------------- animate (keyed, interruptible) */
  var META = { offset: 1, easing: 1, composite: 1 };
  function lastFrame(kf) {
    if (Array.isArray(kf)) return kf[kf.length - 1] || {};
    var f = {};
    Object.keys(kf || {}).forEach(function (k) { var v = kf[k]; f[k] = Array.isArray(v) ? v[v.length - 1] : v; });
    return f;
  }
  function propsOf(kf) {
    var out = {};
    (Array.isArray(kf) ? kf : [kf]).forEach(function (f) { Object.keys(f || {}).forEach(function (k) { if (!META[k]) out[k] = 1; }); });
    return Object.keys(out);
  }
  function cssName(p) { return p === 'cssFloat' ? 'float' : p.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }); }
  function applyFrame(el, frame) {
    if (!el || !el.style || !frame) return;
    Object.keys(frame).forEach(function (k) { if (!META[k]) { try { el.style.setProperty(cssName(k), String(frame[k])); } catch (e) { } } });
  }
  function clearProps(el, props) { props.forEach(function (p) { try { el.style.removeProperty(cssName(p)); } catch (e) { } }); }
  function fillsForward(f) { return f === 'forwards' || f === 'both'; }

  /* Reduced motion (OS or 設定) keeps short opacity cross-fades and colour changes and drops movement (SPEC-v5
     Part A): a keyframe set is cut down to its opacity / colour properties and played in ≤DUR.reduce, linear-ish,
     with any delay capped. A set with nothing but movement lands on its end state at once (as v4 did). */
  var REDUCE_KEEP = { opacity: 1, color: 1, backgroundColor: 1, borderColor: 1, fill: 1, stroke: 1, offset: 1, easing: 1, composite: 1 };
  function reduceFrames(kf) {
    var out, keep = false;
    if (Array.isArray(kf)) {
      out = kf.map(function (f) {
        var g = {};
        Object.keys(f || {}).forEach(function (k) { if (REDUCE_KEEP[k]) { g[k] = f[k]; if (!META[k]) keep = true; } });
        return g;
      });
    } else {
      out = {};
      Object.keys(kf || {}).forEach(function (k) { if (REDUCE_KEEP[k]) { out[k] = kf[k]; if (!META[k]) keep = true; } });
    }
    return keep ? out : null;
  }
  function animate(el, kf, o) {
    if (!el || !kf) return null;
    o = o || {};
    if (!hasWAAPI) {
      if (fillsForward(o.fill) || o.commit) applyFrame(el, lastFrame(kf));
      return null;
    }
    if (reduced() && !o.reduceOk) {
      var rk = o.pseudoElement ? null : reduceFrames(kf);
      // the moving parts still land where they end (fill forwards / commit), without travelling
      if (fillsForward(o.fill) || o.commit) applyFrame(el, lastFrame(kf));
      if (!rk) return null;
      var ro = {};
      Object.keys(o).forEach(function (k) { ro[k] = o[k]; });
      ro.spring = null;
      ro.duration = Math.max(120, Math.min(DUR.reduce, o.duration || DUR.reduce));
      ro.delay = Math.min(o.delay || 0, 150);
      ro.easing = 'linear';
      ro.reduceOk = true;
      kf = rk; o = ro;
    }
    var timing = {
      duration: o.duration != null ? o.duration : DUR.base,
      easing: o.easing || EASE.standard,
      delay: o.delay || 0,
      fill: o.fill || (o.delay ? 'backwards' : 'none')
    };
    if (o.endDelay) timing.endDelay = o.endDelay;
    // a pseudo-element (::before / ::after): its own key space, and nothing of the host's inline style is touched
    var pseudo = o.pseudoElement || null;
    if (pseudo) timing.pseudoElement = pseudo;
    if (o.spring) {
      var sp = spring(o.spring);
      timing.easing = sp.easing;
      timing.duration = o.maxDuration ? Math.min(sp.duration, o.maxDuration) : sp.duration;
    }
    var props = propsOf(kf);
    var map = null, snap = null, akey = pseudo ? pseudo + o.key : o.key;
    if (o.key) {
      map = el._smA || (el._smA = {});
      var prev = map[akey];
      if (prev) {
        if (!pseudo) {
          snap = prev._smSnap || null;
          if (!snap) { snap = {}; props.forEach(function (p) { snap[p] = el.style.getPropertyValue(cssName(p)); }); }
          try { if (prev.playState !== 'idle') prev.commitStyles(); } catch (e) { }
        }
        prev._smReplaced = true;
        try { prev.cancel(); } catch (e) { }
      }
    }
    var a;
    try { a = el.animate(kf, timing); } catch (e) {
      if (fillsForward(timing.fill) || o.commit) applyFrame(el, lastFrame(kf));
      return null;
    }
    if (map) { map[akey] = a; if (snap) a._smSnap = snap; }
    var end = function (finished) {
      if (a._smReplaced) return;
      if (map && map[akey] === a) delete map[akey];
      if (pseudo) return;
      if (finished && o.commit) { try { a.commitStyles(); } catch (e) { applyFrame(el, lastFrame(kf)); } try { a.cancel(); } catch (e) { } }
      if (finished && o.clear) { try { a.cancel(); } catch (e) { } clearProps(el, props); }
      if (snap && !o.commit && !(finished && fillsForward(timing.fill))) {
        Object.keys(snap).forEach(function (p) {
          if (snap[p]) el.style.setProperty(cssName(p), snap[p]); else el.style.removeProperty(cssName(p));
        });
      }
    };
    a.addEventListener('finish', function () { end(true); });
    a.addEventListener('cancel', function () { end(false); });
    return a;
  }
  function done(a) {
    if (!a) return Promise.resolve();
    return a.finished.then(noop, noop);
  }
  function settled(list) { return Promise.all(list.map(done)).then(noop, noop); }
  /* speed an animation up so it ends within ms (used by skip / finishAll) */
  function hurry(a, ms) {
    try {
      if (!a || a.playState === 'finished' || a.playState === 'idle') return;
      if (!(ms > 0)) { a.finish(); return; }
      var t = a.effect.getComputedTiming();
      var left = (t.endTime || 0) - (a.currentTime || 0);
      if (!(left > ms)) return;
      var rate = left / Math.max(1, ms);
      if (a.updatePlaybackRate) a.updatePlaybackRate(rate); else a.playbackRate = rate;
    } catch (e) { try { a.finish(); } catch (e2) { } }
  }

  /* ---------------------------------------------------------------- hold (launch) */
  var holds = 0, held = [], releaseQ = [];
  function hold(reason, maxMs) {
    holds++;
    var released = false, timer;
    function release() {
      if (released) return;
      released = true;
      clearTimeout(timer);
      holds = Math.max(0, holds - 1);
      if (holds) return;
      armWindow();
      var q = held; held = [];
      if (q.length) onIntersect(q);
      var r = releaseQ; releaseQ = [];
      r.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
    }
    timer = setTimeout(release, maxMs || 2400);
    return release;
  }
  function whenReleased(fn) { if (typeof fn !== 'function') return; if (!holds) fn(); else releaseQ.push(fn); }

  /* ---------------------------------------------------------------- sequence */
  var seqs = [];
  function sequence(steps, so) {
    so = so || {};
    steps = (steps || []).slice();
    var anims = [], timers = [], fired = [], st = 'idle', resolveFin;
    var fin = new Promise(function (r) { resolveFin = r; });
    var api = { play: play, skip: skip, cancel: cancel, finished: fin };
    function call(fn) { try { fn(); } catch (e) { console.error(e); } }
    function end() {
      if (st === 'done') return;
      st = 'done';
      var i = seqs.indexOf(api); if (i !== -1) seqs.splice(i, 1);
      resolveFin();
    }
    function start() {
      if (st !== 'waiting') return;
      st = 'running';
      seqs.push(api);
      var off = reduced() || !hasWAAPI;
      steps.forEach(function (s, idx) {
        var at = s.at || 0;
        if (typeof s.run === 'function') {
          if (off || !at) { fired[idx] = true; call(s.run); return; }
          timers.push({ idx: idx, id: setTimeout(function () { fired[idx] = true; call(s.run); }, at) });
          return;
        }
        if (!s.el || !s.keyframes) return;
        var o = {};
        Object.keys(s.opts || {}).forEach(function (k) { o[k] = s.opts[k]; });
        o.delay = (o.delay || 0) + at;
        if (!o.fill) o.fill = 'backwards';
        var a = animate(s.el, s.keyframes, o);
        if (a) anims.push(a);
      });
      var maxRun = 0;
      timers.forEach(function (t) { maxRun = Math.max(maxRun, steps[t.idx].at || 0); });
      Promise.all([settled(anims), new Promise(function (r) { setTimeout(r, off ? 0 : maxRun + 1); })]).then(end);
    }
    function play() {
      if (st !== 'idle') return fin;
      st = 'waiting';
      if (so.ignoreHold) start(); else whenReleased(start);
      return fin;
    }
    function skip(ms) {
      if (st === 'idle' || st === 'waiting') { st = 'waiting'; start(); }
      timers.forEach(function (t) { clearTimeout(t.id); if (!fired[t.idx]) { fired[t.idx] = true; call(steps[t.idx].run); } });
      timers = [];
      anims.forEach(function (a) { hurry(a, ms == null ? 120 : ms); });
      return fin;
    }
    function cancel() {
      timers.forEach(function (t) { clearTimeout(t.id); }); timers = [];
      anims.forEach(function (a) { try { a.cancel(); } catch (e) { } });
      end();
    }
    return api;
  }

  /* ---------------------------------------------------------------- once / seen */
  var onceMem = {};
  function once(key) {
    var k = 'sm2:once:' + key;
    if (onceMem[k]) return false;
    onceMem[k] = 1;
    if (ssGet(k)) return false;
    ssSet(k, '1');
    return true;
  }
  function seen(key, value) {
    var store = SM.store, all = {};
    try { all = (store && store.get('motionSeen', {})) || {}; } catch (e) { all = {}; }
    var prev = Object.prototype.hasOwnProperty.call(all, key) ? all[key] : undefined;
    if (arguments.length > 1) {
      all[key] = value;
      try { if (store) store.set('motionSeen', all); } catch (e) { }
    }
    return prev;
  }

  /* ---------------------------------------------------------------- numbers */
  var fmtCache = {};   // toLocaleString builds a new Intl formatter per call: keep one per locale/decimals
  function fmtNum(n, decimals) {
    var d = decimals || 0;
    var loc = (SM.lang && SM.lang() === 'en') ? 'en-US' : 'ja-JP';
    try {
      var k = loc + d, nf = fmtCache[k] || (fmtCache[k] = new Intl.NumberFormat(loc, { minimumFractionDigits: d, maximumFractionDigits: d }));
      return nf.format(Number(n));
    } catch (e) { return Number(n).toFixed(d); }
  }
  /* The page's first Intl formatter costs ≈10–50ms (ICU data). Make it in idle time once the opening is over,
     not inside the first count roll or the first tap that rolls one (INTEGRATOR). */
  (function warmIntl() {
    var go = function () { try { fmtNum(1); } catch (e) { } };
    var idle = function () { if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1200); };
    var lx = window.__lx;
    if (lx && lx.mode && !lx.done) document.addEventListener('sm:launched', idle, { once: true }); else idle();
  })();
  function parseNum(s) {
    var n = parseFloat(String(s == null ? '' : s).replace(/\u2212/g, '-').replace(/[^\d.\-]/g, ''));
    return isFinite(n) ? n : NaN;
  }

  /* Odometer: digit columns roll like a station board. The real value is the element's text the
     whole time (an sr-only twin while rolling, so layout, baseline and screen readers use it); the
     moving cells are aria-hidden. Each cell holds an invisible copy of its FINAL glyph, so the width
     is the final width from the first frame and never changes (§4.1); the strip of digits moves by
     translateY in % of its own height — no measuring, no layout reads, no per-frame text writes.
     A column that appears (0 → 165: the hundreds) starts on a blank row inside its reserved width; a
     column that goes away (1,000 → 999) keeps the old glyph's width until the roll ends. `from: ''`
     rolls every column in from blank, so a first count never shows a misleading 0. */
  var odoRunning = [];
  var ODO_EASE = 'cubic-bezier(0.2, 0.5, 0.1, 1)';
  function odoFinish(el) { if (el && el._smOdo) el._smOdo(); }
  function odometer(el, value, o) {
    if (!el) return Promise.resolve();
    o = o || {};
    var dec = o.decimals || 0;
    var f = o.format || function (n) { return typeof n === 'number' ? fmtNum(n, dec) : String(n); };
    var to = typeof value === 'string' ? value : f(value);
    var from;
    if (o.from != null) from = typeof o.from === 'string' ? o.from : f(o.from);
    else from = el._smOdoShown != null ? el._smOdoShown : String(el.textContent || '').trim();
    var t = now(), rapid = el._smOdoT && t - el._smOdoT < 120 && o.from == null;
    el._smOdoT = t;
    odoFinish(el);
    el._smOdoShown = to;
    el.classList.add('m-odo');
    if (el.textContent !== to || el.firstElementChild) el.textContent = to;
    if (o.instant || rapid || reduced() || !hasWAAPI || from === to) return Promise.resolve();

    // a start of all zeros ("000" → 164) would read as real values (001, 012 …): only the last column starts on 0,
    // the leading ones roll in from blank
    if (/^0{2,}$/.test(from) && /\d\d/.test(to)) from = '0';
    var L = Math.max(from.length, to.length);
    var a = pad(from, L), b = pad(to, L);
    var blankStart = !/\S/.test(from);
    var dir = o.direction && o.direction !== 'auto' ? o.direction : null;
    if (!dir) { var na = parseNum(from), nb = parseNum(to); dir = (isFinite(na) && isFinite(nb) && nb < na) ? 'down' : 'up'; }
    var up = dir !== 'down';
    var base = o.duration || 720;
    var frag = document.createElement('span');
    frag.className = 'm-odo-w';
    frag.setAttribute('aria-hidden', 'true');
    var sr = document.createElement('span');
    sr.className = 'm-odo-sr';
    sr.textContent = to;
    var rolling = [];
    for (var i = 0; i < L; i++) {
      var ca = a.charAt(i), cb = b.charAt(i);
      var cell = document.createElement('span');
      cell.className = 'm-odo-c';
      var ghost = document.createElement('span');
      ghost.className = 'm-odo-g';
      // the ghost reserves the width: the final glyph, or the old one for a column that goes away (its width
      // is let go only when finish() writes the final text). Never a width animation (§6 rule 1).
      var shrink = ca !== ' ' && cb === ' ';
      ghost.textContent = shrink ? ca : (cb === ' ' ? '' : cb);
      cell.appendChild(ghost);
      if (ca !== cb) {
        var seq;
        if (/\d/.test(ca) && /\d/.test(cb)) {
          var da = +ca, db = +cb, steps = up ? (db - da + 10) % 10 : (da - db + 10) % 10;
          seq = [];
          for (var s2 = 0; s2 <= steps; s2++) seq.push(String(up ? (da + s2) % 10 : (da - s2 + 10) % 10));
        } else seq = [ca, cb];
        if (!up) seq.reverse();
        var strip = document.createElement('span');
        strip.className = 'm-odo-s';
        seq.forEach(function (d) {
          var r = document.createElement('span');
          if (d === ' ' || d === '') { r.className = 'm-odo-b'; r.textContent = '0'; } else r.textContent = d;
          strip.appendChild(r);
        });
        cell.appendChild(strip);
        cell.className = 'm-odo-c m-odo-r';
        ghost.style.visibility = 'hidden';
        var n = seq.length - 1;
        var endPct = -(n / (n + 1)) * 100;
        rolling.push({ strip: strip, from: up ? 0 : endPct, to: up ? endPct : 0, n: n, idx: i, cell: cell });
      }
      frag.appendChild(cell);
    }
    if (!rolling.length) return Promise.resolve();
    el.textContent = '';
    el.appendChild(frag);
    el.appendChild(sr);
    el.classList.add('is-rolling');
    var anims = [];
    /* ODO_EASE: quick to leave the start row (a first count must not sit on blank cells while its unit is already
       legible) and a short tail; the rows are spaced apart (motion.css), so while the strip settles no ink of the
       neighbouring digit is inside the cell. Columns start right to left like a station board, closer together
       when they roll in from blank. */
    var colStep = blankStart ? 28 : 44;
    rolling.forEach(function (r) {
      var timing = { duration: Math.min(920, base + r.n * 14), delay: (o.delay || 0) + (L - 1 - r.idx) * colStep, easing: ODO_EASE, fill: 'both' };
      anims.push(animate(r.strip, [{ transform: 'translateY(' + r.from + '%)' }, { transform: 'translateY(' + r.to + '%)' }], timing));
    });
    var finished = false;
    var finish = function () {
      if (finished) return;
      finished = true;
      if (el._smOdo === finish) el._smOdo = null;
      anims.forEach(function (x) { if (x) try { x.cancel(); } catch (e) { } });
      el.classList.remove('is-rolling');
      if (el._smOdoShown === to && (el.firstElementChild || el.textContent !== to)) el.textContent = to;
      var k = odoRunning.indexOf(el); if (k !== -1) odoRunning.splice(k, 1);
    };
    el._smOdo = finish;
    odoRunning.push(el);
    return settled(anims).then(finish);
  }
  function pad(s, L) { while (s.length < L) s = ' ' + s; return s; }

  /* v3 tween (opt-in: count(el, to, {tween:true}) / data-count-style="tween") */
  function tweenCount(el, from, to, finalText, dur, fmt, dec) {
    if (el._smTween) el._smTween();
    var r = Math.pow(10, dec), start = null, id;
    var mv = document.createElement('span'); mv.className = 'm-cnt'; mv.setAttribute('aria-hidden', 'true');
    var sr = document.createElement('span'); sr.className = 'm-cnt-sr'; sr.textContent = finalText;
    mv.setAttribute('data-v', fmt(from));
    el.textContent = ''; el.appendChild(mv); el.appendChild(sr);
    var stop = function () { cancelAnimationFrame(id); el._smTween = null; if (mv.parentNode === el) el.textContent = finalText; };
    el._smTween = stop;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - p, 3);
      if (mv.parentNode !== el) { el._smTween = null; return; }
      mv.setAttribute('data-v', fmt(Math.round((from + (to - from) * e) * r) / r));
      if (p < 1) id = requestAnimationFrame(frame); else stop();
    }
    id = requestAnimationFrame(frame);
  }

  function count(el, to, opts) {
    if (!el) return Promise.resolve();
    opts = opts || {};
    var dec = opts.decimals != null ? opts.decimals : 0;
    var fmt = opts.format || function (n) { return fmtNum(n, dec); };
    to = Number(to);
    if (!isFinite(to)) return Promise.resolve();
    var finalText = opts.finalText != null ? String(opts.finalText) : fmt(to);
    if (opts.tween) {
      var from = opts.from != null ? Number(opts.from) : parseNum(el._smOdoShown != null ? el._smOdoShown : el.textContent);
      if (reduced() || !isFinite(from) || from === to) { el.textContent = finalText; return Promise.resolve(); }
      tweenCount(el, from, to, finalText, Math.min(600, opts.duration || 500), fmt, dec);
      return Promise.resolve();
    }
    var o = { duration: opts.duration ? Math.max(400, Math.min(900, opts.duration)) : undefined, instant: opts.instant };
    if (opts.from != null) o.from = typeof opts.from === 'string' ? opts.from : fmt(Number(opts.from));
    return odometer(el, finalText, o);
  }

  /* data-count */
  function countAttrs(el) {
    return { to: parseFloat(el.getAttribute('data-count')), dec: parseInt(el.getAttribute('data-count-decimals') || '0', 10) || 0 };
  }
  function runDataCount(el, delay) {
    el._smCountT = null;
    var a = countAttrs(el);
    if (!isFinite(a.to)) return;
    var cur = el._smOdo || el.firstElementChild ? null : String(el.textContent || '').trim();
    var finalText = cur !== null && /\d/.test(cur) && parseNum(cur) === a.to ? cur : fmtNum(a.to, a.dec);
    var key = el.getAttribute('data-count-seen');
    var fa = el.getAttribute('data-count-from');
    // no start value given and none seen before: the columns roll in from blank (never a static "0件" first)
    var from = fa != null && fa !== '' && isFinite(parseFloat(fa)) ? parseFloat(fa) : null;
    if (key) {
      var prev = seen(key, a.to);
      if (prev === a.to) { el._smOdoShown = finalText; return; }
      if (typeof prev === 'number' && isFinite(prev)) from = prev;
    }
    var dur = parseInt(el.getAttribute('data-count-dur') || '', 10) || 820;
    if (el.getAttribute('data-count-style') === 'tween') {
      count(el, a.to, { from: from == null ? 0 : from, decimals: a.dec, duration: dur, finalText: finalText, tween: true });
      return;
    }
    odometer(el, finalText, { from: from == null ? '' : fmtNum(from, a.dec), duration: Math.min(900, dur), delay: delay || 0 });
  }
  function scheduleCount(el, delay) {
    if (el._smCountT) clearTimeout(el._smCountT);
    el._smCountT = null;
    /* The odometer is built now, in the same task as the reveal, and waits out the delay inside WAAPI
       (fill: both): the first frame of the fade already shows the start value. A timer here let a frame or two
       of the final value show through the fade before it snapped to 0 and rolled (the "count flash"). */
    if (hasWAAPI && !reduced() && el.getAttribute('data-count-style') !== 'tween') { runDataCount(el, delay || 0); return; }
    el._smCountT = setTimeout(function () { runDataCount(el); }, delay || 0);
  }
  function finishDataCount(el) {
    if (el._smCountT) {
      clearTimeout(el._smCountT); el._smCountT = null;
      var key = el.getAttribute('data-count-seen'); var a = countAttrs(el);
      if (key && isFinite(a.to)) seen(key, a.to);
    }
    odoFinish(el);
    if (el._smTween) el._smTween();
  }

  /* ---------------------------------------------------------------- reveal */
  var io = null;
  var entranceUntil = 0;
  /* The entrance window: data-reveal-delay choreographs a screen's ARRIVAL (title, then facts, then actions). It
     opens with the first reveal batch after a view mounts (or after the launch hold lets go) and closes 600ms
     later. A reveal that starts after that is the user scrolling: it runs at once (no delay, a 160ms fade, a short
     capped stagger), so a block reached by scrolling, a call button above all, is never missing when it arrives. */
  var winOpen = 0, winArm = 0;
  function armWindow() { winArm = now(); winOpen = winArm; }
  function lateReveal() { return now() - winOpen > 900; }

  function setDelay(el, ms) { if (ms) el.style.setProperty('--m-delay', ms + 'ms'); else el.style.removeProperty('--m-delay'); }

  function revealEl(el, delay, late) {
    if (!el.classList.contains('m-pending')) return;
    var red = reduced();
    if (red) { delay = 0; late = true; }
    if (late) { delay = Math.min(delay || 0, 160); el.classList.add('m-late'); }
    else delay = (delay || 0) + (parseInt(el.getAttribute('data-reveal-delay') || '0', 10) || 0);
    var kind = el.getAttribute('data-reveal');
    setDelay(el, delay);
    if (kind === 'mark' && !red) {
      el.classList.remove('m-pending');
      setTimeout(function () { stamp(el, { ring: false }); }, delay);
    } else {
      el.classList.add('m-in');
      el.classList.remove('m-pending');
    }
    var life = delay + (red ? 200 : late ? (kind === 'rule' || kind === 'underline' ? 600 : 420) : kind === 'line' || kind === 'rule' ? 640 : 560);
    if (!late) entranceUntil = Math.max(entranceUntil, now() + life);
    // drop the reveal transition afterwards so the view's own transitions/hover rules win again
    clearTimeout(el._smInT);
    el._smInT = setTimeout(function () { el.classList.remove('m-in', 'm-fast', 'm-now', 'm-late'); setDelay(el, 0); }, life + 80);
    // a count starts its roll 100ms before its block starts to appear: the first visible frames show digits already
    // on their way in, never a unit beside blank cells (the rows are blank before that, under a block still at 0)
    if (el.hasAttribute('data-count')) scheduleCount(el, Math.max(0, delay - 100));
    if (el.hasAttribute('data-draw')) whenIdle(function () { setTimeout(function () { drawLine(el); }, delay); });
    var inner = el.querySelectorAll ? el.querySelectorAll('[data-count]:not(.m-pending)') : [];
    // a count inside the revealed block starts rolling WITH it: its first frame (blank or old digits, fill:both)
    // is applied in the same frame the block starts to appear, so the unit never stands next to empty cells
    for (var i = 0; i < inner.length; i++) if (inner[i]._smWait) { inner[i]._smWait = false; scheduleCount(inner[i], Math.max(0, delay - 100)); }
    if (window.SM && SM.illus && typeof SM.illus.play === 'function' && el.classList.contains('il') && el.getAttribute('data-il-anim') === 'enter') {
      setTimeout(function () { try { SM.illus.play(el); } catch (e) { } }, delay);
    }
  }

  function onIntersect(entries) {
    if (holds > 0) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (!en._held && io) io.unobserve(en.target);
        held.push({ isIntersecting: true, target: en.target, _held: true });
      });
      return;
    }
    var groups = {}, order = [];
    var hit = false;
    for (var e0 = 0; e0 < entries.length; e0++) if (entries[e0].isIntersecting) { hit = true; break; }
    // the first batch after a mount anchors the window (a slow transition can land it a few hundred ms later)
    if (hit && winArm) { if (now() - winArm < 1500) winOpen = now(); winArm = 0; }
    var late = lateReveal();
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      if (!en._held && io) io.unobserve(el);
      var p = el._smStagger ? el.parentNode : null;
      var key = p ? (p._smId || (p._smId = 'g' + Math.random().toString(36).slice(2))) : '_solo';
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(el);
    });
    var cap = late ? 4 : lite() ? 5 : STAGGER_MAX;
    order.forEach(function (k) {
      var list = groups[k];
      if (k === '_solo') { list.forEach(function (el) { revealEl(el, 0, late); }); return; }
      list.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
      var step = late ? Math.min(list[0]._smStagger, 40) : list[0]._smStagger;
      // items 9+ arrive with item 8 (cap); a long list reveals as a block after that
      list.forEach(function (el, i) { revealEl(el, Math.min(i, cap - 1) * step, late); });
    });
  }
  function ensureIO() {
    if (io || !hasIO) return io;
    io = new IntersectionObserver(onIntersect, { root: null, rootMargin: '0px', threshold: 0 });
    return io;
  }

  /* reveals run in every mode: reduced motion keeps them as short opacity fades (motion.css, html.m-reduce) */
  function enabled() { return hasIO; }
  function syncReady() {
    if (enabled()) docEl.classList.add('motion-ready');
    else { docEl.classList.remove('motion-ready'); revealAll(document); }
  }

  function watchEl(el) {
    if (el._smWatched) return;
    el._smWatched = true;
    el.classList.add('m-pending');
    if (el.hasAttribute('data-draw')) prepDraw(el);
    io.observe(el);
  }
  function claim(el) { el._smWatched = true; }

  /* sweep: a safety net under IntersectionObserver. A target that is moved in the DOM after it was observed
     (a view regrouping its columns), or that was inside a closed <details> / hidden block when observed, can
     miss its intersection callback and stay at opacity 0. A sweep re-reads every pending target: one on screen
     is revealed now (late: a short fade), the rest are re-observed so the next scroll catches them.
     It runs ~1s after each view mount, after every afterTransition flush, when a <details> opens and on resize. */
  var sweepT = 0;
  function sweep(root) {
    if (!io || !document.querySelectorAll) return;
    root = root && root.querySelectorAll ? root : document;
    var list = root.querySelectorAll('.m-pending'), vh = window.innerHeight || 800, on = [], off = [];
    for (var i = 0; i < list.length && i < 400; i++) {
      var el = list[i];
      if (!el._smWatched) continue;
      var r = el.getBoundingClientRect();
      if (r.width + r.height > 0 && r.bottom > 0 && r.top < vh) on.push(el); else off.push(el);
    }
    on.forEach(function (el, k) { try { io.unobserve(el); } catch (e) { } revealEl(el, Math.min(k, 3) * 40, true); });
    off.forEach(function (el) { try { io.unobserve(el); io.observe(el); } catch (e) { } });
  }
  function sweepSoon(ms) { clearTimeout(sweepT); sweepT = setTimeout(function () { if (!holds) sweep(); else whenReleased(function () { sweepSoon(300); }); }, ms || 0); }
  /* S17: a jump of more than a screen (End, a scrollbar drag, find-in-page, a screen reader moving on) skips
     blocks that never intersected on the way. Once the scroll rests, every pending block ABOVE the viewport is
     shown at once (no animation: nobody is looking at it), and the ones on screen get the usual late fade. */
  var jumpY = 0, jumpT = 0;
  function afterJump() {
    var y = window.scrollY || 0, vh = window.innerHeight || 800;
    if (Math.abs(y - jumpY) <= vh) { jumpY = y; return; }
    jumpY = y;
    if (!io) return;
    var list = document.querySelectorAll('.m-pending'), above = [];
    for (var i = 0; i < list.length && i < 600; i++) {
      var r = list[i].getBoundingClientRect();
      if (r.width + r.height > 0 && r.bottom <= 0) above.push(list[i]);
    }
    above.forEach(function (el) {
      try { io.unobserve(el); } catch (e) { }
      el.classList.remove('m-pending');
      if (el.hasAttribute('data-draw')) clearDash(el);
      if (el.hasAttribute('data-count')) finishDataCount(el);
    });
    sweep();
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('scroll', function () {
      clearTimeout(jumpT);
      jumpT = setTimeout(afterJump, 140);
    }, { passive: true });
    // find-in-page on hidden="until-found" content, and printing: everything shows
    document.addEventListener('beforematch', function () { revealAll(document); }, true);
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('toggle', function (ev) {
      var t = ev.target;
      if (t && t.tagName === 'DETAILS' && t.open) raf(function () { sweep(t); });
    }, true);
    window.addEventListener('resize', function () { sweepSoon(250); }, { passive: true });
  }

  function revealAll(root) {
    root = root || document;
    if (!root.querySelectorAll) return;
    var els = root.querySelectorAll('.m-pending');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      el.classList.remove('m-pending');
      if (io) try { io.unobserve(el); } catch (e) { }
      if (el.hasAttribute('data-draw')) clearDash(el);
    }
    held = held.filter(function (h) { return !(root === document || root.contains(h.target)); });
    var cs = root.querySelectorAll('[data-count]');
    for (var j = 0; j < cs.length; j++) { cs[j]._smWait = false; finishDataCount(cs[j]); }
  }

  /* In-place re-renders (SM.render() → core doRender(false)) must not replay entrances or counts.
     mount(root, {instant:true}) — or any mount inside SM.render() — claims every target as shown. */
  var quietDepth = 0;
  function wrapRender() {
    var orig = SM.render;
    if (typeof orig !== 'function' || orig._smQuiet) return;
    var quiet = function () {
      var view = document.getElementById('view');
      var mem = view ? focusMemo(view) : null;
      quietDepth++;
      try { return orig.apply(this, arguments); }
      finally { quietDepth--; if (mem) restoreFocus(mem, true); }
    };
    quiet._smQuiet = true;
    SM.render = quiet;
  }

  function wrapLine(ln) {
    if (ln._smLine) return;
    ln._smLine = true;
    if (ln.firstElementChild && ln.firstElementChild.classList.contains('m-line-in') && ln.childNodes.length === 1) return;
    var inner = document.createElement('span');
    inner.className = 'm-line-in';
    while (ln.firstChild) inner.appendChild(ln.firstChild);
    ln.appendChild(inner);
  }

  function mount(root, opts) {
    root = root || document;
    if (!root.querySelectorAll) return;
    wrapRender();
    syncReady();
    var instant = !!(opts && opts.instant) || quietDepth > 0;
    var i, list;
    // heading line reveals: the wrapper exists in every mode so layout never differs between modes
    list = root.querySelectorAll('[data-reveal="line"]');
    for (i = 0; i < list.length; i++) wrapLine(list[i]);
    if (root !== document && root.getAttribute && root.getAttribute('data-reveal') === 'line') wrapLine(root);
    // scroll-linked shorthands
    list = root.querySelectorAll('[data-scroll]');
    for (i = 0; i < list.length; i++) wireScroll(list[i]);
    reserveSwaps(root);
    // illustrations
    if (SM.illus && typeof SM.illus.mount === 'function') { try { SM.illus.mount(root, { instant: instant || !enabled() || reduced() }); } catch (e) { } }
    if (!enabled()) return;
    ensureIO();
    var watch = instant ? claim : watchEl;
    // a view (or a block a view swaps in) arriving: its data-reveal-delay choreography plays (see armWindow)
    if (!instant) armWindow();
    sweepSoon(1100);

    list = root.querySelectorAll('[data-reveal-stagger]');
    for (i = 0; i < list.length; i++) {
      var par = list[i];
      var step = parseInt(par.getAttribute('data-reveal-stagger'), 10);
      if (!isFinite(step) || step < 0) step = STAGGER;
      var kids = par.children;
      for (var k = 0; k < kids.length; k++) {
        var c = kids[k];
        if (c._smWatched || c.hasAttribute('hidden')) continue;
        c._smStagger = step || 1;
        if (!c.hasAttribute('data-reveal')) c.setAttribute('data-reveal', '');
        watch(c);
      }
    }
    list = root.querySelectorAll('[data-reveal], [data-draw]');
    for (i = 0; i < list.length; i++) watch(list[i]);
    if (root !== document && root.hasAttribute && (root.hasAttribute('data-reveal') || root.hasAttribute('data-draw'))) watch(root);

    /* S12: on a forward push the incoming page used to slide in blank and cascade only after the slide. Now its
       first three blocks (document order: the heading, the key facts, the first action) start their entrance
       inside the push, 40ms apart, so the page arrives readable; everything after them still reveals on scroll.
       No layout is read here (this runs inside the transition's update). */
    var rk = SM.route && SM.route.kind;
    if (!instant && rk === 'forward' && root.id === 'view' && !reduced()) {
      var firsts = root.querySelectorAll('.m-pending'), took = 0;
      for (i = 0; i < firsts.length && took < 3; i++) {
        var f0 = firsts[i];
        if (f0.closest('[hidden], details:not([open]), template')) continue;
        try { io.unobserve(f0); } catch (e) { }
        revealEl(f0, 70 + took * 40, false);
        took++;
      }
    }

    list = root.querySelectorAll('[data-count]');
    for (i = 0; i < list.length; i++) {
      var n = list[i];
      if (n._smWatched) continue;
      if (instant) {
        claim(n);
        var ck = n.getAttribute('data-count-seen'), cv = countAttrs(n);
        if (ck && isFinite(cv.to)) seen(ck, cv.to);
        continue;
      }
      var host = n.parentNode && n.parentNode.closest ? n.parentNode.closest('.m-pending') : null;
      if (host) { n._smWatched = true; n._smWait = true; }
      else { n.setAttribute('data-reveal', n.getAttribute('data-reveal') || 'fade'); watch(n); }
    }
  }

  /* finishAll: end every pending reveal / sequence / odometer now (user input during an entrance,
     SM.go, print). Deferred rendering (afterTransition) is flushed too unless opts.noFlush. */
  function inViewport(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < (window.innerHeight || 800) && r.width + r.height > 0;
  }
  /* finishAll(root, {all, instant, noFlush, force, ifBusy}): land every running entrance now. Reads all
     rects first, then writes, so a long page costs one layout. ifBusy: do nothing when no entrance,
     sequence or odometer is running (SM.go calls it on every navigation). */
  function finishAll(root, o) {
    if (root && !root.querySelectorAll) { o = root; root = null; }
    root = root || document;
    o = o || {};
    if (!o.noFlush) flushAfter();
    if (holds > 0 && !o.force) return;
    if (o.ifBusy && !(entranceUntil && now() < entranceUntil) && !seqs.length && !odoRunning.length) return;
    seqs.slice().forEach(function (s) { s.skip(o.instant ? 0 : 120); });
    var cls = o.instant ? 'm-now' : 'm-fast';
    var list = root.querySelectorAll('.m-in, .m-pending');
    var hit = [];
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      hit.push(el.classList.contains('m-in') ? 1 : (o.all || inViewport(el)) ? 2 : 0);
    }
    for (var j = 0; j < list.length; j++) {
      var e2 = list[j];
      if (hit[j] === 1) { e2.classList.add(cls); setDelay(e2, 0); continue; }
      if (hit[j] === 2) {
        if (io) try { io.unobserve(e2); } catch (e) { }
        e2.classList.add(cls);
        e2.removeAttribute('data-reveal-delay');
        revealEl(e2, 0);
        setDelay(e2, 0);
      }
    }
    odoRunning.slice().forEach(function (el) { if (root === document || root.contains(el)) odoFinish(el); });
    entranceUntil = 0;
  }
  // input during an entrance finishes it (keyboard: everything, so Tab never lands on invisible content)
  function onInput(ev) {
    if (!entranceUntil || now() > entranceUntil) return;
    if (ev.type === 'keydown' && /^(Shift|Control|Alt|Meta)$/.test(ev.key)) return;
    finishAll(document.getElementById('view') || document, { all: ev.type === 'keydown', noFlush: true });
  }
  ['pointerdown', 'keydown', 'wheel'].forEach(function (t) { window.addEventListener(t, onInput, { capture: true, passive: true }); });

  /* ---------------------------------------------------------------- press */
  /* v5 (SPEC-v5 Part A.4): every tap answers within 50ms. pointerdown adds .m-pressed at once (css/motion.css
     darkens the fill / washes the row) and the control SINKS 2px; release springs back past its rest by 1px and
     settles. A press is held on screen for at least 110ms, so a quick tap still shows. Rows (list rows, sheet
     rows, summaries) only wash: a whole row moving under the finger reads as a layout shift. Tabs pop their icon.
     data-press="none" opts out; data-press="ink" = wash only; data-press (bare) = sink. */
  var SINK_SEL = '.btn, .chip, .pill, .icon-btn, .pcard-save, .seg > button, .seg > a, .section-action, .opt, .contact-cta, ' +
    '.sos-copy, .sos-li.is-urgent > .sos-row, .back, .more-btn, .toast-act, [data-press]:not([data-press="ink"])';
  var WASH_SEL = 'a.list-item, button.list-item, .contact-item, .sos-row, .set-link, .sos-home-link, .sos-chat-link, ' +
    'details.disclose > summary, [data-press="ink"]';
  var PRESS_SEL = SINK_SEL + ', ' + WASH_SEL + ', .tabbar .tab';
  var PRESS_MIN = 110;
  var pressed = null;
  function pressTarget(ev) {
    var t = ev.target;
    if (!t || !t.closest) return null;
    var el = t.closest(PRESS_SEL);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true' || el.getAttribute('data-press') === 'none') return null;
    if (el.closest('[data-press="none"]')) return null;
    return el;
  }
  function pressPart(el) {
    if (el._smPart !== undefined) return el._smPart;
    var part = null;
    if (el.classList.contains('tab') && el.closest('.tabbar')) part = { node: el.querySelector('svg') || el, tab: true };
    else if (el.matches(SINK_SEL)) part = { node: el, tab: false };
    el._smPart = part;
    return part;
  }
  function pressOn(el) {
    if (pressed && pressed !== el) pressOff(true);
    pressed = el;
    el._smPT = now();
    el.classList.add('m-pressed');
    if (reduced()) return;
    var p = pressPart(el);
    if (!p) return;
    if (p.tab) { prepSvg(p.node); animate(p.node, [{ scale: '0.86' }], { duration: DUR.instant, easing: EASE.enter, fill: 'forwards', key: 'press' }); }
    else animate(p.node, [{ translate: '0 2px' }], { duration: 70, easing: EASE.enter, fill: 'forwards', key: 'press' });
  }
  function pressOff(immediate) {
    if (!pressed) return;
    var el = pressed; pressed = null;
    var go = function () {
      if (pressed === el) return;
      el.classList.remove('m-pressed');
      var p = pressPart(el);
      if (!p || !p.node._smA || !p.node._smA.press) return;
      if (p.tab) animate(p.node, [{ scale: '0.86' }, { scale: '1.12', offset: 0.42 }, { scale: '1' }], { duration: 360, easing: 'ease-out', key: 'press', clear: true });
      else animate(p.node, [{ translate: '0 2px' }, { translate: '0 -1px', offset: 0.42 }, { translate: '0 0' }], { duration: 300, easing: 'ease-out', key: 'press', clear: true });
    };
    var held = now() - (el._smPT || 0);
    if (immediate) go(); else setTimeout(go, Math.max(30, PRESS_MIN - held));
  }
  function press(el) {
    if (!el) return;
    pressOn(el);
    setTimeout(function () { if (pressed === el) pressOff(); }, 120);
  }
  document.addEventListener('pointerdown', function (ev) {
    if (ev.button !== undefined && ev.button !== 0) return;
    var el = pressTarget(ev); if (el) pressOn(el);
  }, { passive: true });
  ['pointerup', 'dragstart'].forEach(function (t) { window.addEventListener(t, function () { pressOff(); }, { passive: true, capture: true }); });
  // a scroll that starts on a control cancels its press at once (no held minimum: the finger is scrolling)
  window.addEventListener('pointercancel', function () { pressOff(true); }, { passive: true, capture: true });
  window.addEventListener('blur', function (ev) { if (ev.target === window) pressOff(true); });
  document.addEventListener('pointerleave', function (ev) { if (pressed && ev.target === pressed) pressOff(); }, { passive: true, capture: true });
  document.addEventListener('keydown', function (ev) {
    if ((ev.key === ' ' || ev.key === 'Enter') && !ev.repeat) { var el = pressTarget(ev); if (el) pressOn(el); }
  });
  document.addEventListener('keyup', function (ev) { if (ev.key === ' ' || ev.key === 'Enter') pressOff(); });

  /* row ink for program cards: the row washes while its title link is pressed (css/base.css §16). A class, because
     .pcard:has(.pcard-link:active) made every tap re-style the whole page. */
  var inked = null;
  function inkOff() { if (!inked) return; inked.classList.remove('m-row-press'); inked = null; }
  document.addEventListener('pointerdown', function (ev) {
    inkOff();
    if (ev.button !== undefined && ev.button !== 0) return;
    var t = ev.target, link = t && t.closest && t.closest('.pcard-link'), row = link && link.closest('.pcard');
    if (row) { inked = row; row.classList.add('m-row-press'); }
  }, { passive: true });
  ['pointerup', 'pointercancel', 'dragstart'].forEach(function (t) { window.addEventListener(t, inkOff, { passive: true, capture: true }); });
  window.addEventListener('blur', function (ev) { if (ev.target === window) inkOff(); });

  /* ---------------------------------------------------------------- focus across re-renders */
  var SIG_ATTRS = ['data-act', 'data-key', 'data-id', 'data-code', 'data-value', 'data-cat', 'data-k', 'data-flip-key', 'data-href', 'href', 'name'];
  function attrEsc(v) { return String(v).replace(/["\\]/g, '\\$&'); }
  function focusSig(el) {
    if (!el || el.nodeType !== 1) return null;
    if (el.id) return '#' + (window.CSS && CSS.escape ? CSS.escape(el.id) : attrEsc(el.id));
    var sel = el.tagName.toLowerCase(), any = false;
    for (var i = 0; i < SIG_ATTRS.length; i++) {
      var v = el.getAttribute(SIG_ATTRS[i]);
      if (v != null && v !== '') { sel += '[' + SIG_ATTRS[i] + '="' + attrEsc(v) + '"]'; any = true; }
    }
    return any ? sel : null;
  }
  function focusLost() {
    var a = document.activeElement;
    return !a || a === document.body || a === document.documentElement || a.isConnected === false;
  }
  function focusMemo(scope) {
    var a = document.activeElement;
    if (!scope || !a || a === document.body || a === scope || !scope.contains(a)) return null;
    var m = { scope: scope, sig: null, s: null, e: null };
    try { m.sig = focusSig(a); } catch (e) { m.sig = null; }
    try { if (typeof a.selectionStart === 'number') { m.s = a.selectionStart; m.e = a.selectionEnd; } } catch (e) { }
    return m;
  }
  function focusEl(el) {
    try { el.focus({ preventScroll: true }); } catch (e) { return false; }
    return document.activeElement === el;
  }
  function restoreFocus(m, headingFallback) {
    if (!m || !focusLost()) return true;
    var el = null;
    if (m.sig) { try { el = m.scope.querySelector(m.sig); } catch (e) { el = null; } }
    if (el && focusEl(el)) {
      if (m.s !== null && el.setSelectionRange) { try { el.setSelectionRange(m.s, m.e); } catch (e) { } }
      return true;
    }
    if (headingFallback) {
      var h = m.scope.querySelector('h1') || m.scope;
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      return focusEl(h);
    }
    return false;
  }
  function keepFocus(scope, fn) {
    var m = focusMemo(scope);
    var out = fn ? fn() : undefined;
    if (m) { try { restoreFocus(m, false); } catch (e) { } }
    return out;
  }

  /* ---------------------------------------------------------------- flip (smooth spring ≤400ms) */
  function flipKey(el) { return el.getAttribute('data-flip-key') || el.getAttribute('data-id') || el.id || null; }
  function items(container, sel) {
    if (sel) return Array.prototype.slice.call(container.querySelectorAll(sel));
    return Array.prototype.slice.call(container.children);
  }
  // a ghost stays inside the page's view, so view-scoped styles (.v-plan …) still dress it; fixed, so it holds its
  // place on screen (#view sets no transform / containment)
  function ghostHost(el) { return (el.closest && el.closest('#view')) || document.body; }
  function ghostOf(el, r) {
    var g = el.cloneNode(true);
    g.removeAttribute('id');
    g.setAttribute('aria-hidden', 'true');
    g.style.cssText += ';position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height +
      'px;margin:0;z-index:70;pointer-events:none;box-sizing:border-box;';
    return g;
  }
  function flip(container, fn, opts) {
    opts = opts || {};
    if (!container || !hasWAAPI || reduced()) return keepFocus(container, fn);
    var vh = window.innerHeight || 800;
    var before = items(container, opts.selector);
    var host = ghostHost(container);
    var byKey = {}, byEl = [];
    before.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var k = flipKey(el);
      if (k) byKey[k] = { r: r, el: el };
      byEl.push([el, r]);
    });
    var fm = focusMemo(container);
    var out = fn ? fn() : undefined;
    if (fm) { try { restoreFocus(fm, false); } catch (e) { } }
    var after = items(container, opts.selector);
    // read every new position first, then animate: starting an animation between two reads forces a
    // style + layout per row (MAP measured 250ms for a list at 4x)
    var lasts = after.map(function (el) { return el.getBoundingClientRect(); });
    var stillHere = typeof Set === 'function' ? new Set(after) : null;
    var afterKeys = {};
    after.forEach(function (el) { var k = flipKey(el); if (k) afterKeys[k] = 1; });
    var dur = Math.min(480, opts.duration || 460);
    var newCount = 0, gone = 0;
    /* opts.hop: rows that change place in the list (a 済み row going to the end, an undo bringing it back) never
       slide THROUGH their neighbours (opaque rows passing over each other slice each other's text). The row fades
       out where it was (90ms --ease-exit, a ghost), the others close the gap by FLIP, and the row rises in at its
       new place (8px, 200ms --ease-enter) once the gap has mostly closed: the remove grammar, both ways. */
    var hops = opts.hop ? (opts.hop.length != null ? Array.prototype.slice.call(opts.hop) : [opts.hop]) : [];
    // removed items fade out in place (ghost), so the gap they leave closes by FLIP, never by height
    byEl.forEach(function (pair) {
      var el = pair[0], r = pair[1], k = flipKey(el);
      var removed = stillHere ? !stillHere.has(el) && !(k && afterKeys[k]) : false;
      if (!removed || gone >= 6 || r.bottom < 0 || r.top > vh || !r.width) return;
      gone++;
      var g = ghostOf(el, r);
      host.appendChild(g);
      var a = animate(g, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: EASE.exit, fill: 'forwards' });
      done(a).then(function () { if (g.parentNode) g.parentNode.removeChild(g); });
    });
    after.forEach(function (el, idx) {
      var k = flipKey(el), first = null;
      if (k && byKey[k]) first = byKey[k].r;
      else for (var i = 0; i < byEl.length; i++) if (byEl[i][0] === el) { first = byEl[i][1]; break; }
      var last = lasts[idx];
      if (last.bottom < -50 || last.top > vh + 50) { if (!first) return; if (first.bottom < -50 || first.top > vh + 50) return; }
      if (first) {
        var dx = first.left - last.left, dy = first.top - last.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        if (hops.indexOf(el) !== -1) {
          if (first.bottom > 0 && first.top < vh && first.width) {
            var hg = ghostOf(el, first);
            host.appendChild(hg);
            var ha = animate(hg, [{ opacity: 1 }, { opacity: 0 }], { duration: DUR.instant, easing: EASE.exit, fill: 'forwards' });
            done(ha).then(function () { if (hg.parentNode) hg.parentNode.removeChild(hg); });
          }
          animate(el, [{ opacity: 0, translate: '0 8px' }, { opacity: 1, translate: '0 0' }],
            { duration: 200, delay: Math.round(dur * 0.55), easing: EASE.enter, fill: 'backwards', key: 'flip' });
          return;
        }
        animate(el, [{ translate: dx + 'px ' + dy + 'px' }, { translate: '0 0' }], { spring: 'smooth', maxDuration: dur, key: 'flip' });
      } else {
        el._smWatched = true;
        if (el.classList.contains('m-pending')) { el.classList.remove('m-pending'); if (io) try { io.unobserve(el); } catch (e) { } }
        animate(el, [{ opacity: 0, translate: '0 24px' }, { opacity: 1, translate: '0 0' }],
          { spring: 'rise', delay: Math.min(newCount++, STAGGER_MAX - 1) * 40 + 60, fill: 'backwards', key: 'flip' });
      }
    });
    return out;
  }

  /* ---------------------------------------------------------------- expand (くわしく, details.disclose) */
  /* expand(container, open[, {setOpen(bool), body, closedHeight}]) -> Promise
     Opens or closes a block IN PLACE with transform / opacity only (no height animation): the block's new height
     appears at once in layout, but it is clipped back to its old height and everything below it on screen is
     translated back to where it was; then the clip opens and the blocks below slide down together, on one curve,
     while the new content fades and drops 12px into place. Closing runs the same in reverse and commits at the end.
     setOpen(v) performs the real state change (hidden / open / aria-expanded); body is the part that fades.
     SM.ui.more() blocks and every details.disclose use it automatically (click on the button / summary). */
  var EXP_DUR = 380, EXP_EASE = 'cubic-bezier(0.2, 0, 0, 1)';
  function followers(container) {
    var out = [], stop = (container.closest && container.closest('#view, .sheet-body')) || document.body;
    for (var n = container; n && n !== stop && n !== document.body && out.length < 60; n = n.parentElement) {
      for (var sib = n.nextElementSibling; sib && out.length < 60; sib = sib.nextElementSibling) out.push(sib);
    }
    return out;
  }
  function expand(container, open, o) {
    o = o || {};
    var setOpen = o.setOpen || function () { };
    if (!container) return Promise.resolve();
    if (container._smExpEnd) container._smExpEnd();
    var bodies = o.body ? (o.body.length != null ? Array.prototype.slice.call(o.body) : [o.body]) : [];
    if (!hasWAAPI || !container.isConnected) { setOpen(open); return Promise.resolve(); }
    if (reduced()) {
      setOpen(open);
      if (open) bodies.forEach(function (b) { animate(b, [{ opacity: 0 }, { opacity: 1 }], { duration: DUR.reduce, key: 'expand' }); });
      return Promise.resolve();
    }
    var vh = window.innerHeight || 800;
    // reads first
    var h0 = container.getBoundingClientRect().height;
    var fol = followers(container).filter(function (el) {
      if (el.offsetParent === null) return false;
      // a sticky / fixed bar (the question's 次へ) stays where it is: moving it with the blocks below looked broken
      try { var ps = getComputedStyle(el).position; if (ps === 'sticky' || ps === 'fixed') return false; } catch (e) { }
      var r = el.getBoundingClientRect();
      return r.bottom > -40 && r.top < vh + 40;
    });
    var d, anims = [], ended = false;
    var clipOf = function (px) { return 'inset(-8px -24px ' + Math.max(0, px) + 'px -24px)'; };
    if (open) {
      setOpen(true);
      d = container.getBoundingClientRect().height - h0;
      if (d > 1) {
        anims.push(animate(container, [{ clipPath: clipOf(d) }, { clipPath: clipOf(0) }], { duration: EXP_DUR, easing: EXP_EASE, key: 'expand-c' }));
        fol.forEach(function (el) { anims.push(animate(el, [{ translate: '0 ' + (-d) + 'px' }, { translate: '0 0' }], { duration: EXP_DUR, easing: EXP_EASE, key: 'expand' })); });
      }
      bodies.forEach(function (b) {
        anims.push(animate(b, [{ opacity: 0, translate: '0 -12px' }, { opacity: 1, translate: '0 0' }], { duration: 320, delay: 60, easing: EASE.enter, fill: 'backwards', key: 'expand' }));
      });
    } else {
      var hc = o.closedHeight;
      if (hc == null) { setOpen(false); hc = container.getBoundingClientRect().height; setOpen(true); }
      d = h0 - hc;
      if (!(d > 1)) { setOpen(false); return Promise.resolve(); }
      anims.push(animate(container, [{ clipPath: clipOf(0) }, { clipPath: clipOf(d) }], { duration: 300, easing: EXP_EASE, fill: 'forwards', key: 'expand-c' }));
      fol.forEach(function (el) { anims.push(animate(el, [{ translate: '0 0' }, { translate: '0 ' + (-d) + 'px' }], { duration: 300, easing: EXP_EASE, fill: 'forwards', key: 'expand' })); });
      bodies.forEach(function (b) { anims.push(animate(b, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: EASE.exit, fill: 'forwards', key: 'expand' })); });
    }
    var finish = function () {
      if (ended) return;
      ended = true;
      container._smExpEnd = null;
      if (!open) setOpen(false);
      anims.forEach(function (a) { if (a) try { a.cancel(); } catch (e) { } });
    };
    container._smExpEnd = finish;
    return settled(anims).then(finish);
  }
  // details.disclose (and details.more): the summary opens / closes them through expand()
  document.addEventListener('click', function (ev) {
    if (ev.defaultPrevented || !hasWAAPI) return;
    var t = ev.target, sum = t && t.closest ? t.closest('summary') : null;
    if (!sum) return;
    var det = sum.parentElement;
    if (!det || det.tagName !== 'DETAILS' || !(det.classList.contains('disclose') || det.classList.contains('more')) || det.hasAttribute('data-native')) return;
    if (t.closest('a, button, input, select, textarea') && t.closest('a, button, input, select, textarea') !== sum) return;
    ev.preventDefault();
    var open = !det.open;
    var kids = Array.prototype.filter.call(det.children, function (c) { return c !== sum; });
    var bs = getComputedStyle(det);
    var closedH = sum.getBoundingClientRect().height + (parseFloat(bs.borderTopWidth) || 0) + (parseFloat(bs.borderBottomWidth) || 0) +
      (parseFloat(bs.paddingTop) || 0) + (parseFloat(bs.paddingBottom) || 0);
    expand(det, open, { setOpen: function (v) { det.open = v; }, body: kids, closedHeight: closedH });
  });

  /* ---------------------------------------------------------------- stamp / check / nudge / pulse */
  function isSvgEl(el) { return typeof SVGElement !== 'undefined' && el instanceof SVGElement; }
  function prepSvg(el) {
    if (isSvgEl(el)) { el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center'; return true; }
    return false;
  }
  function pulse(el) {
    if (!el || reduced()) return Promise.resolve();
    prepSvg(el);
    return done(animate(el, [
      { scale: '1' }, { scale: '1.22', offset: 0.3 }, { scale: '0.97', offset: 0.65 }, { scale: '1' }
    ], { duration: 600, easing: 'ease-out', key: 'pulse' }));
  }
  /* stamp(el): the hanko press on the stamp spring, then an ink ring (320ms after 90ms). An <svg> icon
     gets a round ring drawn in its parent. A second stamp on an ancestor or descendant of an element
     stamped in the last 150ms is ignored, so a view that also stamps its button does not double up. */
  var lastStamp = null;
  function stamp(el, o) {
    if (!el || !hasWAAPI || reduced()) return Promise.resolve();
    o = o || {};
    var now = performance.now();
    if (lastStamp && lastStamp.el !== el && now - lastStamp.t < 150 && lastStamp.el.isConnected &&
        (lastStamp.el.contains(el) || el.contains(lastStamp.el))) return Promise.resolve();
    lastStamp = { el: el, t: now };
    var svg = prepSvg(el);
    var a = animate(el, [{ scale: '1.6', rotate: '-8deg', opacity: 0 }, { scale: '1', rotate: '0deg', opacity: 1 }], { spring: 'stamp', key: 'stamp' });
    if (o.ring === false || /^(INPUT|IMG|SELECT|TEXTAREA)$/.test(el.tagName)) return done(a);
    var host = svg ? el.parentElement : el;
    if (!host || isSvgEl(host)) return done(a);
    var restore = null, box = null;
    try {
      if (getComputedStyle(host).position === 'static') { restore = host.style.position; host.style.position = 'relative'; }
      if (svg) {
        var sr = el.getBoundingClientRect(), hr = host.getBoundingClientRect();
        var d = Math.max(sr.width, sr.height) + 12;
        box = { left: sr.left + sr.width / 2 - hr.left - host.clientLeft - d / 2, top: sr.top + sr.height / 2 - hr.top - host.clientTop - d / 2, d: d };
      }
    } catch (e) { }
    var ink = document.createElement('span');
    ink.className = 'm-ink';
    ink.setAttribute('aria-hidden', 'true');
    if (box) ink.style.cssText = 'inset:auto;left:' + box.left + 'px;top:' + box.top + 'px;width:' + box.d + 'px;height:' + box.d + 'px;border-radius:50%';
    host.appendChild(ink);
    var r = animate(ink, [{ transform: 'scale(0.9)', opacity: 0.5 }, { transform: 'scale(1.6)', opacity: 0 }],
      { duration: 320, delay: 90, easing: EASE.enter, fill: 'both' });
    var clean = function () { if (ink.parentNode) ink.parentNode.removeChild(ink); if (restore !== null) host.style.position = restore; };
    if (r) done(r).then(clean); else clean();
    return done(a);
  }
  function nudge(el) {
    if (!el || reduced()) return Promise.resolve();
    return done(animate(el, [{ translate: '0 -3px' }, { translate: '0 0' }], { spring: 'snappy', key: 'nudge' }));
  }
  /* check(box): the box fills on the stamp spring, then the check draws as two rect segments that
     scale from their start points (90ms, then 120ms). An <svg> child (the real glyph) is hidden while
     the drawn one plays and shown again at the end. */
  /* The drawn mark is the real icon's geometry, so the hand-over at the end is invisible: the check icon's own
     points ('m4.5 12.5 5 5 10-11' in a 24 viewBox), its stroke width (from the svg's computed style, in viewBox
     units) and its square caps / miter join (each segment runs th/2 past its end points). Everything is measured
     on the svg itself, BEFORE the box starts its scale-from-0.6, so the rects are untransformed. */
  var CHECK = [[4.5 / 24, 12.5 / 24], [9.5 / 24, 17.5 / 24], [19.5 / 24, 6.5 / 24]];
  /* every layout read of a check, taken in one go: the box size, the glyph's place, stroke, caps and whether the box
     needs position:relative. A tap reads these on pointerdown (before the input toggles, when nothing re-styles the
     page), so the click itself only writes and the box answers on the next frame (MOTION-SPEC §6: reads before
     writes; a read after the toggle costs a full re-style on a slow phone). */
  function measureCheck(el) {
    var r = el.getBoundingClientRect();
    var geo = { t: now(), w: r.width, h: r.height, g: null, sw: 2, round: false, stat: false };
    var svg = el.querySelector ? el.querySelector('svg') : null;
    try {
      geo.stat = getComputedStyle(el).position === 'static';
      if (svg) {
        var sr = svg.getBoundingClientRect(), cs = getComputedStyle(svg);
        geo.sw = parseFloat(cs.strokeWidth) || 2;
        geo.round = cs.strokeLinecap === 'round';
        // rects include any running transform (the option presses to 0.97 as it is tapped): back to local px
        var k = el.offsetWidth ? r.width / el.offsetWidth : 1;
        if (!(k > 0.2)) k = 1;
        geo.w = r.width / k; geo.h = r.height / k;
        if (sr.width >= 6) geo.g = { x: (sr.left - r.left) / k - (el.clientLeft || 0), y: (sr.top - r.top) / k - (el.clientTop || 0), w: sr.width / k, h: sr.height / k };
      }
    } catch (e) { geo.g = null; }
    return geo;
  }
  function checkBoxOf(t) {
    var lab = t && t.closest ? t.closest('label') : null;
    if (!lab) return null;
    var inp = lab.control || lab.querySelector('input[type="checkbox"]');
    var box = inp && inp.type === 'checkbox' ? inp.nextElementSibling : null;
    return box && box.nodeType === 1 && box.tagName !== 'INPUT' && box.tagName !== 'LABEL' ? box : null;
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('pointerdown', function (e) {
      if (!hasWAAPI || reduced()) return;
      var box = checkBoxOf(e.target);
      if (box) { try { box._smGeo = measureCheck(box); } catch (x) { } }
    }, { capture: true, passive: true });
  }
  function freshGeo(el) {
    var g = el._smGeo;
    el._smGeo = null;
    return g && now() - g.t < 2500 ? g : measureCheck(el);
  }
  function check(el, o) {
    if (!el || !hasWAAPI || reduced()) return Promise.resolve();
    o = o || {};
    // all reads first (or the pointerdown's), then only writes
    var geo = freshGeo(el);
    var g = geo.g, sw = geo.sw, round = geo.round;
    if (!g) {
      // no glyph inside: draw the same mark at the icon's usual share of the box (14 of 22)
      var s0 = Math.min(geo.w, geo.h) * 14 / 22;
      g = { x: (geo.w - s0) / 2, y: (geo.h - s0) / 2, w: s0, h: s0 };
    }
    /* a checkbox square (input:checked + box): only its FILL presses in (0.6 → 1); the square's edge stays where it
       is, drawn in the fill colour from the first frame. The box's own fill steps aside (no CSS transition) while a
       fill layer grows inside it; at the end the layer goes and the box's own fill is already there. Any other
       target (a quiz key) scales as one piece. o.fill names the checked fill (a colour or var()), so nothing has to
       be read after the toggle; without it the computed fill is read. */
    var fillEl = null, box;
    var inp = el.previousElementSibling;
    if (inp && inp.tagName === 'INPUT' && inp.checked) {
      var bg = o.fill || '';
      if (!bg) { try { bg = getComputedStyle(el).backgroundColor; } catch (e) { bg = ''; } }
      if (bg && bg !== 'transparent' && !/^rgba\(0, 0, 0, 0\)$/.test(bg)) {
        el._smFill = bg;
        fillEl = document.createElement('span');
        fillEl.className = 'm-check-fill';
        fillEl.setAttribute('aria-hidden', 'true');
        fillEl.style.background = bg;
        el.style.setProperty('--m-fill', bg);
        el.classList.add('m-filling', 'm-notrans');
      }
    }
    if (geo.stat) el.style.position = 'relative';
    el._smPosOk = true;
    if (fillEl) el.insertBefore(fillEl, el.firstChild);
    box = fillEl ? animate(fillEl, [{ scale: '0.6' }, { scale: '1' }], { spring: 'stamp', key: 'check' })
      : animate(el, [{ scale: '0.6' }, { scale: '1' }], { spring: 'stamp', key: 'check' });
    var unfill = function () {
      if (!fillEl) return;
      if (fillEl.parentNode) fillEl.parentNode.removeChild(fillEl);
      fillEl = null;
      el.classList.remove('m-filling');
      el.style.removeProperty('--m-fill');
      // the box's own fill comes back with its CSS transition still off; transitions return a frame later
      raf(function () { raf(function () { if (!el.classList.contains('m-filling')) el.classList.remove('m-notrans'); }); });
    };
    if (g.w < 6) return done(box).then(unfill);
    var wrap = document.createElement('span');
    wrap.className = 'm-check';
    wrap.setAttribute('aria-hidden', 'true');
    if (o.color) wrap.style.setProperty('--m-check-color', o.color);
    var th = Math.max(1, g.w * sw / 24);
    var segs = [];
    for (var i = 0; i < 2; i++) {
      var p = CHECK[i], q = CHECK[i + 1];
      var px = g.x + p[0] * g.w, py = g.y + p[1] * g.h;
      var dx = (q[0] - p[0]) * g.w, dy = (q[1] - p[1]) * g.h;
      var dist = Math.sqrt(dx * dx + dy * dy), ux = dx / dist, uy = dy / dist;
      var seg = document.createElement('i');
      // left-centre on the start point; translate back th/2 along the stroke (the square cap), rotate, then the
      // scaleX draw grows it from that capped start
      seg.style.cssText = 'left:' + px + 'px;top:' + (py - th / 2) + 'px;width:' + (dist + th) + 'px;height:' + th + 'px;' +
        'translate:' + (-ux * th / 2) + 'px ' + (-uy * th / 2) + 'px;rotate:' + (Math.atan2(dy, dx) * 180 / Math.PI) + 'deg;scale:0 1;' +
        (round ? 'border-radius:' + (th / 2) + 'px;' : '');
      wrap.appendChild(seg);
      segs.push(seg);
    }
    el.appendChild(wrap);
    el.classList.add('m-checking');
    var a1 = animate(segs[0], [{ scale: '0 1' }, { scale: '1 1' }], { duration: 90, delay: 40, easing: EASE.standard, fill: 'both' });
    var a2 = animate(segs[1], [{ scale: '0 1' }, { scale: '1 1' }], { duration: 120, delay: 130, easing: EASE.standard, fill: 'both' });
    return settled([box, a1, a2]).then(function () {
      unfill();
      if (o.keep) { segs.forEach(function (sg) { sg.style.scale = '1 1'; }); return; }
      el.classList.remove('m-checking');
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    });
  }
  /* uncheck(box[, {color}]): the fill fades back (120ms --ease-standard), no reverse draw, and the box never passes
     through another fill on the way (its CSS transition is off while the fill layer fades). */
  function uncheck(el, o) {
    if (!el || !hasWAAPI || reduced()) return Promise.resolve();
    o = o || {};
    var col = o.color || el._smFill;
    // a check still running: it lands now (its layer goes), then the fade starts from a full fill
    var w = el.querySelector(':scope > .m-check');
    if (w && w.parentNode) w.parentNode.removeChild(w);
    var old = el.querySelector(':scope > .m-check-fill');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    el.classList.remove('m-checking', 'm-filling');
    if (el._smA && el._smA.check) { try { el._smA.check.cancel(); } catch (e) { } }
    if (!col) return Promise.resolve();
    // positioned once (check() or an earlier uncheck did it, or the pointerdown read says so): no read after a toggle
    var geo = el._smGeo; el._smGeo = null;
    if (!el._smPosOk && (geo ? geo.stat : (function () { try { return getComputedStyle(el).position === 'static'; } catch (e) { return false; } })())) el.style.position = 'relative';
    el._smPosOk = true;
    var f = document.createElement('span');
    f.className = 'm-check-fill';
    f.setAttribute('aria-hidden', 'true');
    f.style.background = col;
    el.classList.add('m-notrans');
    el.insertBefore(f, el.firstChild);
    var a = animate(f, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: EASE.standard, fill: 'forwards' });
    return done(a).then(function () {
      if (f.parentNode) f.parentNode.removeChild(f);
      raf(function () { if (!el.querySelector(':scope > .m-check-fill')) el.classList.remove('m-notrans'); });
    });
  }

  /* ---------------------------------------------------------------- flyTo (save → やること) */
  function visible(el) {
    if (!el || !el.isConnected) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < (window.innerHeight || 800);
  }
  /* while a save flight is in the air the toast waits for it to land (SM.toast reads flightLeft()), so the ghost
     never crosses the toast's 元に戻す on its way down to the tab */
  var flightEnd = 0;
  function flightLeft() { return Math.max(0, flightEnd - now()); }
  /* flyTo(fromEl, toEl, {duration, onArrive, ghost, tone}) -> Promise   tone:'warn' = an amber dot and ring (a save
     that cannot persist: storage blocked, FIX-A S9)
     v5 save feedback (SPEC-v5 Part A.7): a green station dot leaves the save button, lifts clear of it, arcs down into
     the やること tab and lands there: the tab icon pops, its badge bumps (onArrive usually rolls the count) and a
     thin ring spreads from the tab. ghost:true flies a copy of fromEl instead of the dot (v4 behaviour).
     Reduced motion / hidden ends: onArrive runs at once. The toast waits for the landing (flightLeft()). */
  function flyTo(from, to, o) {
    o = o || {};
    if (typeof to === 'string') to = document.querySelector('.tabbar .tab[data-tab="' + to + '"]');
    var arrive = function () { if (o.onArrive) { try { o.onArrive(); } catch (e) { console.error(e); } } };
    if (!from || !to || reduced() || !hasWAAPI || !visible(from) || !visible(to)) { arrive(); return Promise.resolve(); }
    var a = from.getBoundingClientRect();
    var target = to.querySelector ? (to.querySelector('svg') || to) : to;
    var tb = target.getBoundingClientRect();
    var g, size;
    if (o.ghost) {
      g = from.cloneNode(true);
      if (g.removeAttribute) g.removeAttribute('id');
      var col = '';
      try { col = getComputedStyle(from).color; } catch (e) { }
      g.style.cssText = 'color:' + col + ';position:fixed;left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height +
        'px;margin:0;z-index:110;pointer-events:none;transform-origin:50% 50%;overflow:visible;';
      size = a.height || 1;
    } else {
      size = 14;
      g = document.createElement('span');
      g.className = 'm-fly-dot' + (o.tone === 'warn' ? ' is-warn' : '');
      g.style.cssText = 'left:' + (a.left + a.width / 2 - size / 2) + 'px;top:' + (a.top + a.height / 2 - size / 2) + 'px;';
    }
    g.setAttribute('aria-hidden', 'true');
    document.body.appendChild(g);
    var cx = o.ghost ? a.left + a.width / 2 : a.left + a.width / 2, cy = a.top + a.height / 2;
    var dx = (tb.left + tb.width / 2) - cx, dy = (tb.top + tb.height / 2) - cy;
    var s = o.ghost ? Math.max(0.3, Math.min(1, (tb.height * 0.8) / size)) : 0.7;
    var dur = o.duration || 600;
    var lift = Math.min(64, Math.max(36, Math.abs(dy) * 0.18));
    flightEnd = Math.max(flightEnd, now() + dur);
    // the arc on two properties: x travels balanced (slow start, slow end), y lifts first then falls into the tab
    var ax = animate(g, [{ translate: '0 0' }, { translate: dx + 'px 0' }], { duration: dur, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' });
    var ay = animate(g, [
      { transform: 'translateY(0) scale(' + (o.ghost ? 1 : 0.4) + ')', easing: 'cubic-bezier(0.2, 0, 0.4, 1)' },
      { transform: 'translateY(' + (-lift) + 'px) scale(' + (o.ghost ? 1.05 : 1.15) + ')', offset: 0.28, easing: 'cubic-bezier(0.55, 0, 0.85, 0.4)' },
      { transform: 'translateY(' + dy + 'px) scale(' + s + ')' }
    ], { duration: dur, easing: 'linear', fill: 'forwards' });
    return settled([ax, ay]).then(function () {
      if (g.parentNode) g.parentNode.removeChild(g);
      landOn(to, target, o.tone);
      arrive();
    });
  }
  /* the landing: tab icon pops, a ring spreads from the tab, the badge bumps */
  function landOn(to, target, tone) {
    if (isSvgEl(target)) prepSvg(target);
    animate(target, [{ scale: '0.8' }, { scale: '1.18', offset: 0.4 }, { scale: '1' }], { duration: 420, easing: 'ease-out', key: 'arrive' });
    var host = to;
    if (host && host.appendChild && !isSvgEl(host)) {
      var ring = document.createElement('span');
      ring.className = 'm-land' + (tone === 'warn' ? ' is-warn' : '');
      ring.setAttribute('aria-hidden', 'true');
      try {
        var hr = host.getBoundingClientRect(), r = target.getBoundingClientRect();
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        var d = Math.max(r.width, r.height) + 10;
        ring.style.cssText = 'left:' + (r.left + r.width / 2 - hr.left - d / 2) + 'px;top:' + (r.top + r.height / 2 - hr.top - d / 2) + 'px;width:' + d + 'px;height:' + d + 'px;';
      } catch (e) { }
      host.appendChild(ring);
      var ra = animate(ring, [{ transform: 'scale(0.6)', opacity: 0.9 }, { transform: 'scale(1.9)', opacity: 0 }], { duration: 520, easing: EASE.enter, fill: 'forwards' });
      var rm = function () { if (ring.parentNode) ring.parentNode.removeChild(ring); };
      if (ra) done(ra).then(rm); else rm();
    }
    var b = to && to.querySelector ? to.querySelector('.tab-badge:not([hidden])') : null;
    if (b) bump(b);
  }

  /* bump(el[, {scale}]) -> Promise: a short pop (1 → 1.3 → 1 on the pop spring). Badges, counters. */
  function bump(el, o) {
    if (!el || reduced()) return Promise.resolve();
    o = o || {};
    prepSvg(el);
    var k = o.scale || 1.32;
    return done(animate(el, [{ scale: '1' }, { scale: String(k), offset: 0.3 }, { scale: '0.96', offset: 0.65 }, { scale: '1' }], { duration: 460, easing: 'ease-out', key: 'bump' }));
  }

  /* badge(target, value[, {roll, bump, label}]) — the tab badge API.
     target: a tab key ('plan', 'find' …), a .tab element or a .tab-badge element. value: a number or short text;
     0 / '' / null hides it. roll: true rolls the digits (odometer) when the value changes; bump: true pops it.
     A badge that appears pops in; one that goes fades out. Returns the badge element (or null). Views call it
     guarded: if (SM.motion.badge) SM.motion.badge('plan', n, {roll:true, bump:true}). */
  function badge(target, value, o) {
    o = o || {};
    var tab = null, b = null;
    if (typeof target === 'string') tab = document.querySelector('.tabbar .tab[data-tab="' + attrEsc(target) + '"]');
    else if (target && target.classList && target.classList.contains('tab-badge')) { b = target; tab = b.parentNode; }
    else tab = target;
    if (!b && tab) {
      b = tab.querySelector('.tab-badge');
      if (!b) {
        b = document.createElement('span');
        b.className = 'tab-badge';
        b.setAttribute('aria-hidden', 'true');
        b.hidden = true;
        tab.appendChild(b);
      }
    }
    if (!b) return null;
    var txt = value == null || value === 0 || value === '' ? '' : (typeof value === 'number' && value > 99 ? '99+' : String(value));
    var shown = b._smOdoShown != null ? b._smOdoShown : b.textContent;
    var wasHidden = b.hidden;
    if (!txt) {
      if (wasHidden) return b;
      if (o.roll || o.bump) {
        var fa = animate(b, [{ opacity: 1, scale: '1' }, { opacity: 0, scale: '0.5' }], { duration: 200, easing: EASE.exit, key: 'badge' });
        var hide = function () { if (!b._smOdoShown) { b.hidden = true; } };
        b._smOdoShown = '';
        if (fa) done(fa).then(hide); else hide();
      } else { b.hidden = true; b._smOdoShown = ''; b.textContent = ''; }
      return b;
    }
    b.hidden = false;
    if (wasHidden) {
      b._smOdoShown = txt; b.textContent = txt;
      if (o.roll || o.bump) animate(b, [{ opacity: 0, scale: '0.3' }, { opacity: 1, scale: '1.25', offset: 0.55 }, { scale: '1' }], { duration: 420, easing: 'ease-out', key: 'badge' });
      return b;
    }
    if (shown !== txt) {
      if (o.roll && !reduced()) odometer(b, txt, { from: shown, duration: 480 });
      else { odoFinish(b); b._smOdoShown = txt; b.textContent = txt; }
    } else if (b.firstElementChild && !b._smOdo) { b.textContent = txt; }
    if (o.bump) bump(b);
    return b;
  }

  /* ---------------------------------------------------------------- swapText */
  /* swapText: the two labels are SEQUENCED in one grid cell — the old one leaves (90ms, up 6px, --ease-exit),
     the new one rises 60ms later (200ms, --ease-enter), so at most ~30ms of faint overlap and never two legible
     strings on top of each other. When the old label has gone it is removed, so the cell is exactly the new
     label's width. Buttons that must not change width at all reserve the widest label up front: mount() gives
     their label data-swap-alt="<other label>" (save, copy), and css/motion.css lays an invisible copy of it
     under the text, so the icon never moves. A swap during a swap starts from where the labels are. */
  function swapText(el, text, o) {
    if (!el) return Promise.resolve();
    o = o || {};
    text = String(text == null ? '' : text);
    var wrap = el._smSwap && el._smSwap.parentNode === el && el.childNodes.length === 1 ? el._smSwap : null;
    var curN = wrap ? wrap.querySelector('.m-swap-n:not(.m-swap-o)') : null;
    var cur = curN ? curN.textContent : el.textContent;
    if (cur === text) return Promise.resolve();
    if (reduced() || !hasWAAPI) { el._smSwap = null; el.textContent = text; return Promise.resolve(); }
    if (!wrap || !curN) {
      wrap = document.createElement('span');
      wrap.className = 'm-swap';
      curN = document.createElement('span');
      curN.className = 'm-swap-n';
      curN.textContent = cur;
      wrap.appendChild(curN);
      el.textContent = '';
      el.appendChild(wrap);
      el._smSwap = wrap;
    }
    // anything still leaving from an earlier swap goes now
    Array.prototype.slice.call(wrap.querySelectorAll('.m-swap-o')).forEach(function (x) { if (x.parentNode) x.parentNode.removeChild(x); });
    var oldS = curN;
    oldS.classList.add('m-swap-o');
    oldS.setAttribute('aria-hidden', 'true');
    var newS = document.createElement('span');
    newS.className = 'm-swap-n';
    newS.textContent = text;
    wrap.appendChild(newS);
    /* o.flip: a label that changes WITH its button's colour (答えずに、つぎへ → つぎへ, 次へ when it becomes ready):
       no overlap at all — the old label is gone by 90ms, the new one starts at 90ms, and the button's colour
       transition is cut to 90ms (.m-swapping), so the colour flips while no label is legible. */
    var flipMode = !!o.flip;
    var host = null;
    if (flipMode) {
      host = o.host || (el.closest ? el.closest('button, .btn, a, [role="button"]') : null) || el;
      host.classList.add('m-swapping');
      clearTimeout(host._smSwapT);
      host._smSwapT = setTimeout(function () { host.classList.remove('m-swapping'); }, 320);
    }
    // one keyframe: the old label leaves from wherever it is (it may still be rising from the last swap)
    var a = animate(oldS, [{ opacity: 0, translate: '0 -10px' }], { duration: flipMode ? 80 : DUR.instant, easing: flipMode ? 'linear' : EASE.exit, fill: 'forwards', key: 'swap' });
    var b = animate(newS, [{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { duration: 260, delay: flipMode ? 90 : 60, easing: EASE.enter, fill: 'backwards', key: 'swap' });
    var drop = function () { if (oldS.parentNode) oldS.parentNode.removeChild(oldS); };
    if (a) done(a).then(drop); else drop();
    return settled([a, b]);
  }
  /* width reservation for labels that swap (see swapText): the other label, as an attribute css/motion.css shows
     invisibly under the text. Attribute writes only (no layout), so it is safe inside a view-transition update. */
  function reserveSwaps(root) {
    var i, list;
    try { list = root.querySelectorAll('[data-act="save"][data-label-on][data-label-off] .save-label'); } catch (e) { list = []; }
    for (i = 0; i < list.length; i++) {
      var lab = list[i], b = lab.closest('[data-act="save"]');
      if (!b || lab.hasAttribute('data-swap-alt')) continue;
      var on = b.getAttribute('data-label-on'), off = b.getAttribute('data-label-off');
      lab.setAttribute('data-swap-alt', String(lab.textContent).trim() === on ? off : on);
    }
    var copied = '';
    try { copied = SM.t ? SM.t('core.copied') : ''; } catch (e) { copied = ''; }
    if (!copied || copied === 'core.copied') return;
    try { list = root.querySelectorAll('.btn[data-act="copy"]'); } catch (e) { list = []; }
    for (i = 0; i < list.length; i++) {
      var cl = list[i].querySelector(':scope > span:not(.arrow):not(.sr-only)');
      if (cl && !cl.hasAttribute('data-swap-alt')) cl.setAttribute('data-swap-alt', copied);
    }
  }

  /* ---------------------------------------------------------------- sheet (spring, drag to dismiss) */
  var DIALOG_MQ = '(min-width: 640px)';
  function sheet(dlg, scrim, so) {
    so = so || {};
    var dmq = null;
    try { dmq = window.matchMedia(DIALOG_MQ); } catch (e) { dmq = null; }
    var isDialog = function () { return !!(dmq && dmq.matches); };
    var y = 0, h = 0, dragging = false, track = null, closed = false, suppressClick = false;
    var fastOpen = so.fast ? { response: 0.30, damping: 1 } : 'smooth';
    dlg.classList.add('m-sheet');
    if (scrim) scrim.classList.add('m-sheet');

    function scrimTo(op, dur, ease) {
      if (!scrim) return null;
      return animate(scrim, [{ opacity: op }], { duration: dur, easing: ease || 'linear', fill: 'forwards', key: 'scrim' });
    }
    function setY(v) {
      y = v;
      dlg.style.translate = v ? '0 ' + v + 'px' : '';
      if (scrim) {
        if (scrim._smA && scrim._smA.scrim) { try { scrim._smA.scrim.cancel(); } catch (e) { } }
        scrim.style.opacity = String(Math.max(0, Math.min(1, 1 - v / (h || 1))));
      }
    }
    function open() {
      closed = false;
      if (reduced()) {
        var r1 = animate(dlg, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'linear', key: 'sheet' });
        if (scrim) animate(scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'linear', key: 'scrim' });
        return done(r1);
      }
      var a;
      if (isDialog()) {
        a = animate(dlg, [{ opacity: 0, translate: '0 16px' }, { opacity: 1, translate: '0 0' }], { spring: 'smooth', key: 'sheet' });
        if (scrim) animate(scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE.enter, key: 'scrim' });
      } else {
        a = animate(dlg, [{ translate: '0 calc(100% + 24px)' }, { translate: '0 0' }], { spring: fastOpen, key: 'sheet' });
        if (scrim) animate(scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: so.fast ? 120 : 200, easing: EASE.enter, key: 'scrim' });
      }
      return done(a);
    }
    function settleTo(target, v, onDone) {
      // spring from the current drag position, seeded with the finger's velocity (px/ms)
      var dist = target - y;
      var norm = dist ? (v * 1000) / dist : 0;
      // dismiss: the flick spring (§3.6) carrying the release velocity, ≤360ms; return: snappy with the velocity
      var sp = target > 0 ? { response: SPRINGS.flick.response, damping: SPRINGS.flick.damping, velocity: norm } : { response: 0.30, damping: 0.86, velocity: norm };
      var from = y;
      dlg.style.translate = '';
      var a = animate(dlg, [{ translate: '0 ' + from + 'px' }, { translate: '0 ' + target + 'px' }], { spring: sp, maxDuration: target > 0 ? 360 : 460, fill: 'forwards', key: 'sheet' });
      scrimTo(target > 0 ? 0 : 1, target > 0 ? 180 : 200, target > 0 ? EASE.exit : EASE.enter);
      y = target;
      return done(a).then(function () {
        if (target === 0 && dlg._smA && !dlg._smA.sheet) { /* replaced */ }
        if (target === 0) { try { if (a) a.cancel(); } catch (e) { } dlg.style.translate = ''; if (scrim) { scrim.style.opacity = ''; } }
        if (onDone) onDone();
      });
    }
    function close(v) {
      if (closed) return Promise.resolve();
      closed = true;
      destroy();
      if (reduced()) {
        var r = animate(dlg, [{ opacity: 0 }], { duration: 120, easing: 'linear', fill: 'forwards', key: 'sheet' });
        scrimTo(0, 120);
        return done(r);
      }
      if (isDialog()) {
        var d = animate(dlg, [{ opacity: 0, translate: '0 8px' }], { duration: DUR.quick, easing: EASE.exit, fill: 'forwards', key: 'sheet' });
        scrimTo(0, DUR.quick, EASE.exit);
        return done(d);
      }
      if (h === 0) h = dlg.offsetHeight || 400;
      if (typeof v === 'number' && (y > 0 || v > 0)) return settleTo(h + 24, Math.max(v, 0.4));
      var c = animate(dlg, [{ translate: '0 calc(100% + 24px)' }], { duration: 220, easing: EASE.exit, fill: 'forwards', key: 'sheet' });
      scrimTo(0, DUR.quick, EASE.exit);
      return done(c);
    }

    /* drag: handle + header always; body only when scrolled to the top and moving down. Pointer
       events for mouse/pen, touch events for fingers (so a body that can scroll keeps native scroll). */
    function canStart(target, dy) {
      if (closed || isDialog()) return false;
      if (so.drag === false) return false;
      if (target.closest && target.closest('input, select, textarea, [contenteditable=""], [contenteditable="true"], .m-nodrag')) return false;
      var head = dlg.querySelector('.sheet-head'), handle = dlg.querySelector('.sheet-handle');
      if ((head && head.contains(target)) || (handle && handle.contains(target))) return true;
      var body = dlg.querySelector('.sheet-body');
      if (body && body.contains(target)) {
        if (dy <= 0) return false;
        // any scrolled ancestor between target and the dialog blocks the drag
        for (var n = target; n && n !== dlg; n = n.parentNode) if (n.scrollTop > 0) return false;
        return true;
      }
      return dy > 0;
    }
    function begin(e) {
      track = { x: e.x, y: e.y, t: e.t, lastY: e.y, lastT: e.t, v: 0, target: e.target, started: false };
    }
    function move(e) {
      if (!track) return false;
      var dx = e.x - track.x, dy = e.y - track.y;
      if (!track.started) {
        if (Math.abs(dy) < 6 || Math.abs(dy) < Math.abs(dx)) return false;
        if (!canStart(track.target, dy)) { track = null; return false; }
        track.started = true;
        dragging = true;
        h = dlg.offsetHeight || 400;
        // take over from any running open/settle animation at its current position (the sheet's
        // resting bottom edge is the viewport bottom, so the offset is how far below that it sits)
        var tr = 0;
        try { tr = Math.round(dlg.getBoundingClientRect().bottom - (window.innerHeight || 0)); } catch (x) { tr = 0; }
        if (dlg._smA && dlg._smA.sheet) { try { dlg._smA.sheet._smReplaced = true; dlg._smA.sheet.cancel(); } catch (x) { } delete dlg._smA.sheet; }
        y = Math.max(0, tr || 0);
        // keep the pointerdown origin (minus wherever the sheet already was): the slop is included, so the sheet
        // catches up the first 6px on this frame and then tracks the finger exactly (§5: 1:1, like native sheets)
        track.y = track.y - (y >= 0 ? y : y / 0.25);
        dlg.classList.add('is-dragging');
      }
      var d = e.y - track.y;
      setY(d < 0 ? Math.max(-24, d * 0.25) : d);
      var dt = e.t - track.lastT;
      if (dt > 0) track.v = 0.8 * ((e.y - track.lastY) / dt) + 0.2 * track.v;
      track.lastY = e.y; track.lastT = e.t;
      return true;
    }
    function end(e) {
      if (!track) return;
      var t = track; track = null;
      if (!t.started) return;
      dragging = false;
      dlg.classList.remove('is-dragging');
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 0);
      // a finger resting before release has no velocity left
      var v = e && e.t - t.lastT > 80 ? 0 : t.v;
      if (y > h * 0.32 || v > 0.6) {
        if (so.onDismiss) so.onDismiss(v); else close(v);
      } else if (reduced()) { setY(0); if (scrim) scrim.style.opacity = ''; }
      else settleTo(0, v);
    }
    function pt(ev) { return { x: ev.clientX, y: ev.clientY, t: ev.timeStamp, target: ev.target }; }
    function tt(ev) { var p = ev.touches[0] || ev.changedTouches[0]; return { x: p.clientX, y: p.clientY, t: ev.timeStamp, target: ev.target }; }
    var onPD = function (ev) {
      if (ev.pointerType === 'touch' || (ev.button !== undefined && ev.button !== 0)) return;
      begin(pt(ev));
      dlg._smPid = ev.pointerId;
    };
    var onPM = function (ev) {
      if (ev.pointerType === 'touch' || !track) return;
      var was = track.started;
      if (move(pt(ev)) && !was) { try { dlg.setPointerCapture(ev.pointerId); } catch (x) { } }
    };
    var onPU = function (ev) { if (ev.pointerType === 'touch') return; end(pt(ev)); };
    var onTS = function (ev) { if (ev.touches.length !== 1) { track = null; return; } begin(tt(ev)); };
    var onTM = function (ev) { if (!track) return; if (move(tt(ev)) && ev.cancelable) ev.preventDefault(); };
    var onTE = function (ev) { end(tt(ev)); };
    var onClick = function (ev) { if (suppressClick) { ev.stopPropagation(); ev.preventDefault(); suppressClick = false; } };
    var bound = false;
    if (so.drag !== false) {
      dlg.addEventListener('pointerdown', onPD);
      dlg.addEventListener('pointermove', onPM);
      dlg.addEventListener('pointerup', onPU);
      dlg.addEventListener('pointercancel', onPU);
      dlg.addEventListener('touchstart', onTS, { passive: true });
      dlg.addEventListener('touchmove', onTM, { passive: false });
      dlg.addEventListener('touchend', onTE);
      dlg.addEventListener('touchcancel', onTE);
      dlg.addEventListener('click', onClick, true);
      bound = true;
    }
    function destroy() {
      if (!bound) return;
      bound = false;
      dlg.removeEventListener('pointerdown', onPD);
      dlg.removeEventListener('pointermove', onPM);
      dlg.removeEventListener('pointerup', onPU);
      dlg.removeEventListener('pointercancel', onPU);
      dlg.removeEventListener('touchstart', onTS);
      dlg.removeEventListener('touchmove', onTM);
      dlg.removeEventListener('touchend', onTE);
      dlg.removeEventListener('touchcancel', onTE);
      setTimeout(function () { dlg.removeEventListener('click', onClick, true); }, 0);
    }
    /* height change while open (content swap): FLIP the sheet on the smooth spring */
    function resize(fromTop) {
      if (reduced() || !isFinite(fromTop)) return null;
      var top = dlg.getBoundingClientRect().top;
      var d = fromTop - top;
      if (Math.abs(d) < 1) return null;
      return animate(dlg, [{ translate: '0 ' + d + 'px' }, { translate: '0 0' }], { spring: 'smooth', key: 'sheet' });
    }
    return { open: open, close: close, destroy: destroy, resize: resize, isDialog: isDialog, dragging: function () { return dragging; } };
  }

  /* ---------------------------------------------------------------- view transitions
     v5 grammar (SPEC-v5 Part A.2), css/motion.css §10:
       forward  the new page slides in from the right edge over the old one (EASE.push, 440ms); the old page shifts
                30% left and dims under it — depth, like a stack of pages
       back     the reverse: the old page slides off to the right, the page under it comes back from -30%
       tab      a cross-fade with a 16px rise; the tab bar's indicator slides on the pop spring
       shared   the tapped row's kanji mark (sm-cat) and its TITLE (sm-title) morph into the next page's mark and
                heading; the page itself does not slide then, it rises into place under them
     Without the View Transitions API (or on the 'lite' tier) the new page enters with a WAAPI slide (plainEntrance)
     and the mark / title fly as ghosts (flipShared). */
  var VT_CLASSES = ['vt-forward', 'vt-back', 'vt-tab', 'vt-shared', 'vt-theme', 'vt-fade', 'vt-same-title'];
  var cur = null;            // { vt, kind, named:[], done:Promise }
  var navGen = 0;
  var morphMem = {};         // destination hash -> { keys:[], id, from }
  var tap = null, explicitSrc = null, explicitDst = {};
  var SHARED_KEYS = ['cat', 'title'];
  var LEGACY_HERO = { cat: '.pg-mast .cat-icon, .f-cat-sign .cat-icon, .f-cat-hero .cat-icon, .ln-head .cat-icon' };
  var TITLE_SRC = '.pcard-title, .list-title';

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var link = t.closest('a[href^="#/"], [data-act="go"], [data-href^="#/"]');
    if (!link) return;
    tap = { scope: link.closest('[data-vt-scope], article, li') || link, link: link, t: now() };
  }, true);

  function share(name, el) { explicitSrc = el ? { key: name || 'cat', el: el, t: now() } : null; }
  function shareTarget(name, el) { if (el) explicitDst[name || 'cat'] = el; else delete explicitDst[name || 'cat']; }

  function ratioInView(el) {
    if (!el || !el.isConnected) return 0;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return 0;
    var vh = window.innerHeight || 800, vw = window.innerWidth || 400;
    var ih = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    var iw = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
    return (ih * iw) / (r.width * r.height);
  }
  function srcIn(scope, key, link) {
    if (!scope || !scope.querySelector) return null;
    if (scope.matches && scope.matches('[data-vt~="' + key + '"]')) return scope;
    var el = scope.querySelector('[data-vt~="' + key + '"]');
    if (el) return el;
    if (key === 'cat') return scope.querySelector('.cat-icon');
    if (key === 'title') {
      el = scope.querySelector(TITLE_SRC);
      // only the title of the row that was tapped (a link inside a list item may be something else entirely)
      if (el && link && !(el.contains(link) || link.contains(el))) return null;
      return el;
    }
    return null;
  }
  function heroIn(root, key) {
    var list = root.querySelectorAll('[data-vt-hero~="' + key + '"]');
    for (var i = 0; i < list.length; i++) if (ratioInView(list[i]) > 0.5) return list[i];
    if (key === 'title') {
      var h = root.querySelector('h1');
      return h && ratioInView(h) > 0.5 ? h : null;
    }
    if (LEGACY_HERO[key]) {
      list = root.querySelectorAll(LEGACY_HERO[key]);
      for (var j = 0; j < list.length; j++) if (ratioInView(list[j]) > 0.5) return list[j];
    }
    return null;
  }
  function idOf(scope, el) {
    var n = scope && scope.getAttribute && scope.getAttribute('data-id') ? scope : (el && el.closest ? el.closest('[data-id]') : null);
    return n ? n.getAttribute('data-id') : '';
  }
  // a title only morphs into a heading that says the same thing (住まい → 住まい, a program name → its page)
  function normText(el) { return String(el && el.textContent || '').replace(/[\s　（）()「」・、。,.]/g, ''); }
  function sameText(a, b) {
    var x = normText(a), y = normText(b);
    if (!x || !y) return false;
    var k = Math.min(4, x.length, y.length);
    return y.indexOf(x.slice(0, k)) !== -1 || x.indexOf(y.slice(0, k)) !== -1;
  }
  function pickShared(kind, o) {
    var view = document.getElementById('view') || document;
    var out = null, t = now();
    if (kind === 'forward') {
      if (explicitSrc && t - explicitSrc.t < 1500 && ratioInView(explicitSrc.el) >= 0.5) {
        out = { back: false, id: idOf(null, explicitSrc.el), list: [{ key: explicitSrc.key, from: explicitSrc.el }] };
      } else if (tap && t - tap.t < 1500 && tap.scope.isConnected) {
        var keys = o.shared ? [o.shared] : SHARED_KEYS, list = [], id = '';
        keys.forEach(function (key) {
          var el = srcIn(tap.scope, key, tap.link);
          if (el && ratioInView(el) >= 0.5) { list.push({ key: key, from: el }); id = id || idOf(tap.scope, el); }
        });
        if (list.length) out = { back: false, id: id, list: list };
      }
    } else if (kind === 'back' && o.from && morphMem[o.from] && morphMem[o.from].from === o.to) {
      var m = morphMem[o.from], back = [];
      (m.keys || []).forEach(function (key) {
        var hero = heroIn(view, key);
        if (hero && m.id) back.push({ key: key, from: hero });
      });
      if (back.length) out = { back: true, id: m.id, list: back };
    }
    tap = null; explicitSrc = null;
    return out;
  }
  function destFor(s, it) {
    var view = document.getElementById('view') || document;
    var ex = explicitDst[it.key];
    if (ex && ratioInView(ex) > 0.5) return ex;
    var el = null;
    if (!s.back) el = heroIn(view, it.key);
    else {
      var row = null;
      try { row = view.querySelector('[data-id="' + attrEsc(s.id) + '"]'); } catch (e) { row = null; }
      el = row ? srcIn(row, it.key, null) : null;
      if (el && ratioInView(el) <= 0.5) el = null;
    }
    if (el && it.key === 'title' && !sameText(it.from, el)) el = null;
    return el;
  }
  /* a destination that is still waiting on its entrance (data-reveal) must be visible in the new snapshot: it is
     claimed as shown, so the morph lands on real text and the reveal does not replay inside the moving group */
  function unpend(el) {
    var view = document.getElementById('view');
    for (var n = el; n && n !== view && n !== document.body; n = n.parentElement) {
      if (n.classList && n.classList.contains('m-pending')) {
        n.classList.remove('m-pending');
        n._smWatched = true;
        if (io) try { io.unobserve(n); } catch (e) { }
      }
    }
  }
  function clearNames(list) { list.forEach(function (el) { try { el.style.viewTransitionName = ''; } catch (e) { } }); }
  function setKind(kind) {
    VT_CLASSES.forEach(function (c) { docEl.classList.remove(c); });
    if (kind && kind !== 'none') docEl.classList.add('vt-' + kind);
  }
  /* The page entrance used when there is no view transition (lite tier, or the API is missing). Reduced motion:
     animate() keeps only the opacity (a short cross-fade). */
  function plainEntrance(kind, isLite) {
    var v = document.getElementById('view');
    if (!v || kind === 'none') return null;
    var travel = isLite ? 32 : 48;
    var x = kind === 'forward' ? travel : kind === 'back' ? -travel : 0;
    var yy = kind === 'tab' ? 16 : 0;
    if (kind === 'theme' || kind === 'fade') { x = 0; yy = 0; }
    return animate(v, [{ opacity: 0, translate: x + 'px ' + yy + 'px' }, { opacity: 1, translate: '0 0' }],
      { duration: isLite ? 300 : 400, easing: EASE.push, key: 'enter' });
  }
  /* FLIP fallback for the shared mark / title when the View Transitions API is missing: a fixed ghost of the source
     flies to the destination's box (a title scales uniformly, so its letters are never stretched); the destination
     fades in under the ghost as it lands. */
  function flipShared(srcRect, srcEl, dst, key) {
    if (!srcRect || !dst) return;
    var b = dst.getBoundingClientRect();
    if (!b.width || !srcRect.width) return;
    var g = ghostOf(srcEl, srcRect);
    g.style.transformOrigin = '0 0';
    document.body.appendChild(g);
    var sx = b.width / srcRect.width, sy = b.height / srcRect.height;
    if (key === 'title') { sx = sy; g.style.whiteSpace = 'nowrap'; }
    var tf = 'translate(' + (b.left - srcRect.left) + 'px,' + (b.top - srcRect.top) + 'px) scale(' + sx + ',' + sy + ')';
    var a = animate(g, [{ transform: 'none', opacity: 1 }, { transform: tf, opacity: 1, offset: 0.7 }, { transform: tf, opacity: 0 }],
      { duration: DUR.morph, easing: EASE.push, fill: 'forwards' });
    animate(dst, [{ opacity: 0 }, { opacity: 0, offset: 0.55 }, { opacity: 1 }], { duration: DUR.morph, easing: 'linear', key: 'shared' });
    done(a).then(function () { if (g.parentNode) g.parentNode.removeChild(g); });
  }

  function transition(kind, update, o) {
    o = o || {};
    kind = kind || 'none';
    var run = function () { try { if (update) update(); } catch (e) { console.error(e); } };
    navGen++;
    // a new transition always supersedes a running one: rapid taps never queue
    skipTransition();
    var useVT = hasVT && kind !== 'none' && (reduced() || !lite());
    var allowShared = !reduced() && (kind === 'forward' || kind === 'back');
    var shared = allowShared ? pickShared(kind, o) : (tap = null, explicitSrc = null, null);
    var keep = [];
    if (!useVT) {
      if (kind === 'none') { explicitDst = {}; run(); return Promise.resolve(); }
      var ghosts = shared && !shared.back ? shared.list.map(function (it) { return { it: it, r: it.from.getBoundingClientRect(), el: it.from.cloneNode(true) }; }) : [];
      // a provisional record, so afterTransition() calls made by the view during run() wait for the entrance
      var resolveP, rec0 = { vt: null, kind: kind, named: [], anim: null };
      rec0.done = new Promise(function (r) { resolveP = r; });
      cur = rec0;
      var t0 = now();
      run();
      noteUpdate(now() - t0);
      var ent = plainEntrance(kind, lite());
      rec0.anim = ent;
      ghosts.forEach(function (gh) {
        var dst = destFor(shared, gh.it);
        if (!dst) return;
        unpend(dst);
        flipShared(gh.r, gh.el, dst, gh.it.key);
        keep.push(gh.it.key);
      });
      if (shared && !shared.back && keep.length) morphMem[o.to] = { keys: keep, id: shared.id, from: o.from };
      explicitDst = {};
      done(ent).then(function () { if (cur === rec0) cur = null; resolveP(); });
      return rec0.done;
    }
    var named = [];
    if (shared) shared.list.forEach(function (it) { it.from.style.viewTransitionName = 'sm-' + it.key; named.push(it.from); });
    setKind(kind);
    // same subbar title on both pages (core predicts it before the transition, so no class change lands inside
    // the update, where it would restyle the whole document): the title holds still
    if (o.sameTitle) docEl.classList.add('vt-same-title');
    var go = function () {
      clearNames(named);
      var t1 = now();
      run();
      if (kind !== 'theme' && kind !== 'fade') noteUpdate(now() - t1);
      if (shared) {
        shared.list.forEach(function (it) {
          var d = destFor(shared, it);
          if (!d) return;
          unpend(d);
          d.style.viewTransitionName = 'sm-' + it.key;
          named.push(d);
          keep.push(it.key);
        });
        if (keep.length) docEl.classList.add('vt-shared');
        if (!shared.back) { if (keep.length) morphMem[o.to] = { keys: keep, id: shared.id, from: o.from }; }
        else if (o.from) delete morphMem[o.from];
      }
      explicitDst = {};
    };
    /* a WebGL map on the page that is leaving: the snapshot would read its drawing buffer back (on a software GPU
       that alone was a 1.4s task). The canvas steps out of the capture (hidden: the map's own land colour shows
       for the 80ms fade-out); if it is still on the page after the update (not a route change), it comes back. */
    var gl = [];
    if (kind === 'forward' || kind === 'back' || kind === 'tab') {
      var cvs = document.querySelectorAll('#view canvas.maplibregl-canvas');
      for (var ci = 0; ci < cvs.length; ci++) { gl.push(cvs[ci]); cvs[ci].style.visibility = 'hidden'; }
    }
    var glBack = function () { gl.forEach(function (c) { if (c.isConnected) c.style.visibility = ''; }); gl = []; };
    var go0 = go;
    go = function () { go0(); glBack(); };
    var vt;
    try { vt = document.startViewTransition(go); }
    catch (e) { setKind(null); clearNames(named); glBack(); run(); return Promise.resolve(); }
    var rec = { vt: vt, kind: kind, named: named, done: null };
    var clean = function () {
      clearNames(named);
      if (cur === rec) { cur = null; setKind(null); }
    };
    rec.done = (vt.finished || Promise.resolve()).then(clean, clean);
    if (vt.ready && vt.ready.catch) vt.ready.catch(function () { clean(); });
    cur = rec;
    return rec.done;
  }
  function skipTransition() {
    if (!cur) return;
    var c = cur;
    try { if (c.vt && c.vt.skipTransition) c.vt.skipTransition(); } catch (e) { }
    try { if (c.anim) c.anim.finish(); } catch (e) { }
  }
  function inTransition() { return !!cur; }
  function whenIdle(fn) { if (cur && cur.done) cur.done.then(function () { setTimeout(fn, 0); }); else fn(); }

  /* afterTransition(fn): run after the current transition has finished (or next frame if none).
     Work queued for a view that was navigated away from before it ran is dropped. */
  var afterQ = [], afterScheduled = false;
  function flushAfter() {
    afterScheduled = false;
    var q = afterQ; afterQ = [];
    q.forEach(function (it) {
      if (!it.keep && it.gen !== navGen) return;
      try { it.fn(); } catch (e) { console.error('[SM] afterTransition failed', e); }
    });
    sweepSoon(400);
  }
  function scheduleAfter() {
    if (afterScheduled || !afterQ.length) return;
    afterScheduled = true;
    var c = cur;
    var next = function () {
      afterScheduled = false;
      // another transition started meanwhile: wait for that one instead
      if (cur && cur !== c) scheduleAfter(); else flushAfter();
    };
    if (c && c.done) c.done.then(function () { setTimeout(next, 0); });
    else raf(function () { setTimeout(function () { if (cur) { afterScheduled = false; scheduleAfter(); } else next(); }, 0); });
  }
  function afterTransition(fn, o) {
    if (typeof fn !== 'function') return;
    afterQ.push({ fn: fn, gen: navGen, keep: !!(o && o.keep) });
    scheduleAfter();
  }

  /* ---------------------------------------------------------------- scroll-linked */
  function parseRange(r) {
    var m = /^\s*(cover|contain|entry|exit|entry-crossing|exit-crossing)\s+(-?[\d.]+)%\s*$/.exec(r || '');
    return m ? { name: m[1], p: parseFloat(m[2]) / 100 } : { name: 'cover', p: 0 };
  }
  // the element's top (px from the viewport top) at a named range point of a view() timeline
  function topAt(rp, hgt, vh) {
    var a, b;
    switch (rp.name) {
      case 'entry': a = vh; b = hgt < vh ? vh - hgt : 0; break;
      case 'exit': a = hgt < vh ? 0 : vh - hgt; b = -hgt; break;
      case 'contain': a = hgt < vh ? vh - hgt : 0; b = hgt < vh ? 0 : vh - hgt; break;
      case 'entry-crossing': a = vh; b = vh - hgt; break;
      case 'exit-crossing': a = 0; b = -hgt; break;
      default: a = vh; b = -hgt;
    }
    return a + (b - a) * rp.p;
  }
  var SL_PROPS = { scaleY: 1, scaleX: 1, opacity: 1, translateY: 1 };
  function slValue(prop, v) {
    if (prop === 'opacity') return { opacity: String(v) };
    if (prop === 'translateY') return { transform: 'translateY(' + v + 'px)' };
    return { transform: prop + '(' + v + ')' };
  }
  function scrollLinked(el, o) {
    o = o || {};
    var prop = SL_PROPS[o.prop] ? o.prop : 'scaleY';
    var from = o.from != null ? +o.from : (prop === 'translateY' ? 16 : 0);
    var to = o.to != null ? +o.to : (prop === 'translateY' ? 0 : 1);
    var source = o.source === 'scroll' ? 'scroll' : 'view';
    var range = o.range || ['entry 0%', 'exit 100%'];
    var api = { destroy: noop };
    if (!el) return api;
    if (prop === 'scaleY' && !el.style.transformOrigin) el.style.transformOrigin = 'center top';
    if (prop === 'scaleX' && !el.style.transformOrigin) el.style.transformOrigin = 'left center';
    if (reduced() || lite()) { applyFrame(el, slValue(prop, to)); return api; }
    if (hasSDA) {
      el.setAttribute('data-m-sl', '');
      el.style.setProperty('--m-sl-from', String(from));
      el.style.setProperty('--m-sl-to', String(to));
      el.style.animation = 'm-sl-' + prop + ' linear both';
      el.style.animationTimeline = source === 'scroll' ? 'scroll(root block)' : 'view()';
      if (source === 'view') el.style.animationRange = range[0] + ' ' + range[1];
      api.destroy = function () {
        el.removeAttribute('data-m-sl');
        el.style.animation = ''; el.style.animationTimeline = ''; el.style.animationRange = '';
      };
      return api;
    }
    // fallback: one IntersectionObserver + a rAF-throttled passive scroll listener while in view
    var r0 = parseRange(range[0]), r1 = parseRange(range[1]);
    var ticking = false, live = false, ob = null;
    function paint() {
      ticking = false;
      var p;
      if (source === 'scroll') {
        var max = (document.documentElement.scrollHeight || 1) - (window.innerHeight || 1);
        p = max > 0 ? (window.scrollY || 0) / max : 1;
      } else {
        var r = el.getBoundingClientRect(), vh = window.innerHeight || 800;
        var a = topAt(r0, r.height, vh), b = topAt(r1, r.height, vh);
        p = a === b ? 1 : (a - r.top) / (a - b);
      }
      p = Math.max(0, Math.min(1, p));
      applyFrame(el, slValue(prop, from + (to - from) * p));
    }
    function onScroll() { if (!ticking) { ticking = true; raf(paint); } }
    function on() { if (live) return; live = true; window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll, { passive: true }); onScroll(); }
    function off() { if (!live) return; live = false; window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); onScroll(); }
    if (source === 'scroll' || !hasIO) on();
    else {
      ob = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) on(); else off(); }); });
      ob.observe(el);
      applyFrame(el, slValue(prop, from));
    }
    api.destroy = function () { off(); if (ob) ob.disconnect(); };
    return api;
  }
  function wireScroll(el) {
    if (el._smScroll) return;
    var v = el.getAttribute('data-scroll');
    var o = v === 'fill-x' ? { prop: 'scaleX', range: ['entry 50%', 'exit 50%'] }
      : v === 'fade' ? { prop: 'opacity', from: 0, to: 1, range: ['entry 0%', 'entry 100%'] }
      : { prop: 'scaleY', range: ['entry 50%', 'exit 50%'] };
    var r = el.getAttribute('data-scroll-range');
    if (r) { var parts = r.split(','); if (parts.length === 2) o.range = [parts[0].trim(), parts[1].trim()]; }
    el._smScroll = scrollLinked(el, o);
  }

  /* ---------------------------------------------------------------- lines (SVG / HTML bars) */
  function isGeom(el) { return el && typeof el.getTotalLength === 'function'; }
  function prepDraw(el) {
    // pathLength="1" lets the dash draw without getTotalLength (no layout in mount)
    if (!isGeom(el)) { el.style.transformOrigin = 'left center'; el.style.transform = 'scaleX(0)'; return; }
    if (el.getAttribute('stroke-dasharray') || el.style.strokeDasharray) return;
    el.setAttribute('pathLength', '1');
    el._smPL = true;
    el.style.strokeDasharray = '1 1';
    el.style.strokeDashoffset = '1';
  }
  function clearDash(el) {
    if (isGeom(el)) {
      el.style.strokeDasharray = ''; el.style.strokeDashoffset = '';
      if (el._smPL) { el.removeAttribute('pathLength'); el._smPL = false; }
    } else if (el && el.style) el.style.transform = '';
  }
  function lineProgress(el, p) {
    if (!el) return;
    p = Math.max(0, Math.min(1, Number(p) || 0));
    if (isGeom(el)) {
      if (el._smPL) { el.style.strokeDashoffset = String(1 - p); return; }
      var len = 0; try { len = el.getTotalLength(); } catch (e) { len = 0; }
      if (!len) return;
      el.style.strokeDasharray = len + ' ' + len;
      el.style.strokeDashoffset = String(len * (1 - p));
    } else {
      el.style.transformOrigin = el.style.transformOrigin || 'left center';
      el.style.transform = 'scaleX(' + p + ')';
    }
  }
  function drawLine(el, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      if (!el) return resolve();
      if (reduced() || !hasWAAPI) { clearDash(el); return resolve(); }
      var dur = Math.min(600, opts.duration || DUR.draw), delay = opts.delay || 0;
      var a;
      if (isGeom(el)) {
        var len = 1;
        if (!el._smPL) {
          try { len = el.getTotalLength(); } catch (e) { len = 0; }
          if (!len) { clearDash(el); return resolve(); }
          el.style.strokeDasharray = len + ' ' + len;
        }
        el.style.strokeDashoffset = opts.reverse ? '0' : String(len);
        a = animate(el, opts.reverse ? [{ strokeDashoffset: 0 }, { strokeDashoffset: len }] : [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          { duration: dur, delay: delay, easing: EASE.draw, fill: 'both' });
        if (!a) { clearDash(el); return resolve(); }
        a.onfinish = function () {
          if (opts.reverse) el.style.strokeDashoffset = String(len); else clearDash(el);
          try { a.cancel(); } catch (e) { }
          resolve();
        };
      } else {
        el.style.transformOrigin = 'left center';
        a = animate(el, opts.reverse ? [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }] : [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
          { duration: dur, delay: delay, easing: EASE.draw, fill: 'both' });
        if (!a) { el.style.transform = opts.reverse ? 'scaleX(0)' : ''; return resolve(); }
        a.onfinish = function () { el.style.transform = opts.reverse ? 'scaleX(0)' : ''; try { a.cancel(); } catch (e) { } resolve(); };
      }
      a.oncancel = function () { resolve(); };
    });
  }

  /* ---------------------------------------------------------------- indicator (generic bars) */
  function indicator(bar, target, opts) {
    if (!bar || !target) return;
    opts = opts || {};
    raf(function () {
      var parent = bar.offsetParent || bar.parentNode;
      if (!parent || !parent.getBoundingClientRect) return;
      var pr = parent.getBoundingClientRect(), tr = target.getBoundingClientRect();
      var base = opts.vertical ? (bar.offsetHeight || 100) : (bar.offsetWidth || 100);
      var t;
      if (opts.vertical) {
        t = 'translateY(' + (tr.top - pr.top + (parent.scrollTop || 0)) + 'px) scaleY(' + (tr.height / base) + ')';
        bar.style.transformOrigin = 'center top';
      } else {
        t = 'translateX(' + (tr.left - pr.left + (parent.scrollLeft || 0)) + 'px) scaleX(' + (tr.width / base) + ')';
        bar.style.transformOrigin = 'left center';
      }
      var prev = bar.style.transform;
      bar.style.transform = t;
      if (!bar._smPlaced || reduced() || !prev || prev === t) { bar._smPlaced = true; return; }
      animate(bar, [{ transform: prev }, { transform: t }], { spring: 'rise', key: 'ind' });
    });
  }

  /* ---------------------------------------------------------------- print */
  window.addEventListener('beforeprint', function () { finishAll(document, { all: true, force: true, instant: true }); revealAll(document); });

  if (mq) {
    var onMq = function () { syncReduce(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  var springTokens = {};
  Object.keys(SPRINGS).forEach(function (k) { springTokens[k] = spring(k); });

  SM.motion = {
    tokens: { ease: EASE, dur: DUR, stagger: STAGGER, staggerMax: STAGGER_MAX, rise: RISE, spring: springTokens },
    reduced: reduced,
    syncReduce: syncReduce,
    tier: tier,
    spring: spring,
    animate: animate,
    sequence: sequence,
    hold: hold,
    whenReleased: whenReleased,
    held: function () { return holds > 0; },
    finishAll: finishAll,
    once: once,
    seen: seen,
    odometer: odometer,
    count: count,
    stamp: stamp,
    check: check,
    uncheck: uncheck,
    nudge: nudge,
    pulse: pulse,
    flyTo: flyTo,
    flightLeft: flightLeft,
    badge: badge,
    bump: bump,
    swapText: swapText,
    press: press,
    sheet: sheet,
    shared: share,
    sharedTarget: shareTarget,
    transition: transition,
    skipTransition: skipTransition,
    inTransition: inTransition,
    afterTransition: afterTransition,
    scrollLinked: scrollLinked,
    indicator: indicator,
    mount: mount,
    flip: flip,
    expand: expand,
    drawLine: drawLine,
    lineProgress: lineProgress,
    revealAll: revealAll,
    keepFocus: keepFocus,
    focusSig: focusSig,
    format: fmtNum
  };
  syncReduce();
  tier();
})();
