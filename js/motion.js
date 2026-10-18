/* =====================================================================
   巣立ちマップ v4 — motion.js  (owner: ENGINE)  — pairs with css/motion.css
   Implements MOTION-SPEC.md §1–§7. Print/signage motion: rules that draw, type that rises from
   behind a rule, hanko stamps, station-board digit rolls, tiles that travel. transform/opacity
   only, every animation interruptible, nothing loops.

   Content is visible by default: elements are hidden only after JS has marked them pending
   (html.motion-ready + .m-pending), so a missing IntersectionObserver / a JS error never hides
   anything. Reduced motion is ONE switch: html.m-reduce (OS setting OR 設定 › 動きを少なく).

   ------------------------------------------------------------------ API (all on SM.motion)
   tokens                         {ease, dur, stagger:40, staggerMax:6, spring:{snappy,smooth,stamp,flick}}
   reduced() -> bool              OS reduce OR settings.motion==='reduce' (html.m-reduce). Use this, never matchMedia.
   syncReduce() -> bool           re-read the OS + settings and toggle html.m-reduce (core.applySettings calls it)
   tier() -> 'full'|'lite'|'off'  off = reduced; lite = save-data / <2GB / two slow transitions this session
   spring(preset|{response,damping,velocity}) -> {easing, duration}
   animate(el, keyframes, {duration, easing, spring, delay, fill, key, commit, clear}) -> Animation|null
   sequence(steps, {ignoreHold}) -> {play(), skip(), cancel(), finished}
   hold(reason, maxMs=2400) -> release()      whenReleased(fn)      held() -> bool
   finishAll([root], {all, instant, noFlush})
   once(key) -> bool               seen(key[, value]) -> previous
   odometer(el, value, {from, format, duration, delay, direction, instant}) -> Promise
   count(el, to, {from, decimals, format, finalText, duration, tween})
   stamp(el, {ring}) -> Promise    check(el, {color, keep}) -> Promise   nudge(el)   pulse(el)
   flyTo(fromEl, toEl, {duration, onArrive}) -> Promise
   swapText(el, text) -> Promise   press(el)
   sheet(dialogEl, scrimEl, {drag, fast, onDismiss}) -> {open(), close(velocity), destroy(), isDialog()}
   shared(name, el)                sharedTarget(name, el)
   transition(kind, update, {from, to, shared}) -> Promise   kinds: forward|back|tab|none|theme|fade
   afterTransition(fn[, {keep}])   skipTransition()      inTransition() -> bool
   scrollLinked(el, {prop, from, to, source, range}) -> {destroy()}
   indicator(bar, target, {vertical})
   mount(root[, {instant}])        flip(container, fn[, {selector, duration}])   pulse   drawLine   lineProgress
   revealAll([root])               keepFocus(scope, fn)    format(n, decimals)

   Attributes wired by mount():
     data-reveal[=""|up|slide|fade|rule|underline|line|mark]   data-reveal-delay="ms"
     data-reveal-stagger[="40"] (cap 6; lite 3)   data-count="222" (rolls; data-count-style="tween" = v3 tween,
     data-count-from, data-count-seen="key" → rolls only when changed since the last visit)
     data-draw (SVG stroke draw)   data-press[="ink"] (also .btn and .tabbar .tab automatically)
     data-scroll="fill-y|fill-x|fade"   data-vt="cat" / data-vt-hero="cat" / data-vt-scope (shared morphs)
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
  var DUR = { instant: 90, quick: 160, base: 240, page: 300, morph: 420, draw: 440, hero: 520 };
  var STAGGER = 40, STAGGER_MAX = 6;

  /* ---------------------------------------------------------------- springs
     SwiftUI semantics: response = one undamped period (s), damping = damping fraction.
     velocity = initial velocity in "distances per second" (release px/s ÷ remaining px).
     Rendered to CSS linear(); same numbers as the --spring-* custom properties in motion.css. */
  var SPRINGS = {
    snappy: { response: 0.30, damping: 0.86 },
    smooth: { response: 0.42, damping: 1.00 },
    stamp: { response: 0.32, damping: 0.62 },
    flick: { response: 0.36, damping: 0.92 }
  };
  var SPRING_FALLBACK = {
    snappy: { easing: EASE.standard, duration: 320 },
    smooth: { easing: EASE.standard, duration: 400 },
    stamp: { easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)', duration: 420 },
    flick: { easing: EASE.standard, duration: 300 }
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
        var c = navigator.connection, mem = navigator.deviceMemory;
        tierVal = (c && c.saveData) || (mem && mem < 2) ? 'lite' : 'full';
      }
      docEl.classList.toggle('m-lite', tierVal === 'lite');
    }
    return tierVal;
  }
  /* Downgrade on the MEDIAN of the last five update callbacks (MOTION-SPEC §6 rule 10), never on two single
     samples: one cold route or a font arriving mid-session must not cost a phone its transitions for the whole
     session. Samples that say nothing about the device are skipped: the first navigation after launch (cold code,
     the first Intl / font work) and any taken while web fonts are still loading (each arriving face relayouts the
     whole document inside the update). */
  var navSeen = 0;
  function noteUpdate(ms) {
    navSeen++;
    if (navSeen === 1) return;
    try { if (document.fonts && document.fonts.status === 'loading') return; } catch (e) { }
    vtTimes.push(ms);
    if (vtTimes.length > 5) vtTimes.shift();
    if (tierVal === 'lite' || ssGet('sm2:tier') === 'full' || vtTimes.length < 5) return;
    var med = vtTimes.slice().sort(function (a, b) { return a - b; })[2];
    if (med > 160) { tierVal = 'lite'; ssSet('sm2:tier', 'lite'); docEl.classList.add('m-lite'); }
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

  function animate(el, kf, o) {
    if (!el || !kf) return null;
    o = o || {};
    if (!hasWAAPI || reduced()) {
      if (fillsForward(o.fill) || o.commit) applyFrame(el, lastFrame(kf));
      return null;
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
    var base = o.duration || 560;
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
    var colStep = blankStart ? 20 : 32;
    rolling.forEach(function (r) {
      var timing = { duration: Math.min(640, base + r.n * 12), delay: (o.delay || 0) + (L - 1 - r.idx) * colStep, easing: ODO_EASE, fill: 'both' };
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
    var o = { duration: opts.duration ? Math.max(400, Math.min(800, opts.duration)) : undefined, instant: opts.instant };
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
    var dur = parseInt(el.getAttribute('data-count-dur') || '', 10) || 640;
    if (el.getAttribute('data-count-style') === 'tween') {
      count(el, a.to, { from: from == null ? 0 : from, decimals: a.dec, duration: dur, finalText: finalText, tween: true });
      return;
    }
    odometer(el, finalText, { from: from == null ? '' : fmtNum(from, a.dec), duration: Math.min(800, dur), delay: delay || 0 });
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
  function lateReveal() { return now() - winOpen > 600; }

  function setDelay(el, ms) { if (ms) el.style.setProperty('--m-delay', ms + 'ms'); else el.style.removeProperty('--m-delay'); }

  function revealEl(el, delay, late) {
    if (!el.classList.contains('m-pending')) return;
    if (late) { delay = Math.min(delay || 0, 60); el.classList.add('m-late'); }
    else delay = (delay || 0) + (parseInt(el.getAttribute('data-reveal-delay') || '0', 10) || 0);
    var kind = el.getAttribute('data-reveal');
    setDelay(el, delay);
    if (kind === 'mark') {
      el.classList.remove('m-pending');
      setTimeout(function () { stamp(el, { ring: false }); }, delay);
    } else {
      el.classList.add('m-in');
      el.classList.remove('m-pending');
    }
    var life = delay + (late ? (kind === 'line' ? 280 : 200) : kind === 'line' ? 560 : kind === 'rule' ? 480 : 340);
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
    var cap = late ? 3 : lite() ? 3 : STAGGER_MAX;
    order.forEach(function (k) {
      var list = groups[k];
      if (k === '_solo') { list.forEach(function (el) { revealEl(el, 0, late); }); return; }
      list.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
      var step = late ? Math.min(list[0]._smStagger, 30) : list[0]._smStagger;
      // items 7+ arrive with item 6 (cap); a long list reveals as a block after that
      list.forEach(function (el, i) { revealEl(el, Math.min(i, cap - 1) * step, late); });
    });
  }
  function ensureIO() {
    if (io || !hasIO) return io;
    io = new IntersectionObserver(onIntersect, { root: null, rootMargin: '0px', threshold: 0 });
    return io;
  }

  function enabled() { return hasIO && !reduced(); }
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
    if (SM.illus && typeof SM.illus.mount === 'function') { try { SM.illus.mount(root, { instant: instant || !enabled() }); } catch (e) { } }
    if (!enabled()) return;
    ensureIO();
    var watch = instant ? claim : watchEl;
    // a view (or a block a view swaps in) arriving: its data-reveal-delay choreography plays (see armWindow)
    if (!instant) armWindow();

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
  var PRESS_SEL = '[data-press], .btn, .tabbar .tab';
  var pressed = null;
  function pressTarget(ev) {
    var t = ev.target;
    if (!t || !t.closest) return null;
    var el = t.closest(PRESS_SEL);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true' || el.getAttribute('data-press') === 'none') return null;
    return el;
  }
  function pressPart(el) {
    if (el.classList.contains('tab')) return { node: el.querySelector('svg') || el, scale: '0.92' };
    if (el.getAttribute('data-press') === 'ink') return null;           // rows: ink wash only (CSS)
    return { node: el, scale: '0.97' };
  }
  function pressOn(el) {
    if (pressed && pressed !== el) pressOff(true);
    pressed = el;
    el.classList.add('m-pressed');
    if (reduced()) return;
    var p = pressPart(el);
    if (p) animate(p.node, [{ scale: p.scale }], { duration: DUR.instant, easing: EASE.standard, fill: 'forwards', key: 'press' });
  }
  function pressOff(immediate) {
    if (!pressed) return;
    var el = pressed; pressed = null;
    var go = function () {
      if (pressed === el) return;
      el.classList.remove('m-pressed');
      var p = pressPart(el);
      if (p && p.node._smA && p.node._smA.press) animate(p.node, [{ scale: '1' }], { spring: 'snappy', key: 'press', fill: 'forwards', clear: true });
    };
    if (immediate) go(); else setTimeout(go, 40);
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
  ['pointerup', 'pointercancel', 'dragstart'].forEach(function (t) { window.addEventListener(t, function () { pressOff(); }, { passive: true, capture: true }); });
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
    var dur = Math.min(400, opts.duration || 400);
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
        animate(el, [{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }],
          { duration: 300, delay: Math.min(newCount++, STAGGER_MAX - 1) * 30 + 60, easing: EASE.standard, fill: 'backwards', key: 'flip' });
      }
    });
    return out;
  }

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
  function flyTo(from, to, o) {
    o = o || {};
    var arrive = function () { if (o.onArrive) { try { o.onArrive(); } catch (e) { console.error(e); } } };
    if (reduced() || !hasWAAPI || !visible(from) || !visible(to)) { arrive(); return Promise.resolve(); }
    var a = from.getBoundingClientRect();
    var target = to.querySelector ? (to.querySelector('svg') || to) : to;
    var tb = target.getBoundingClientRect();
    var g = from.cloneNode(true);
    if (g.removeAttribute) g.removeAttribute('id');
    g.setAttribute('aria-hidden', 'true');
    var col = '';
    try { col = getComputedStyle(from).color; } catch (e) { }
    g.style.cssText = 'color:' + col + ';position:fixed;left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height +
      'px;margin:0;z-index:110;pointer-events:none;transform-origin:50% 50%;overflow:visible;';
    document.body.appendChild(g);
    var dx = (tb.left + tb.width / 2) - (a.left + a.width / 2), dy = (tb.top + tb.height / 2) - (a.top + a.height / 2);
    var s = Math.max(0.3, Math.min(1, (tb.height * 0.8) / (a.height || 1)));
    var dur = o.duration || 520;
    flightEnd = Math.max(flightEnd, now() + dur);
    // the arc, on two properties: it lifts first (rises 28px clear of its own label while x barely moves), then
    // travels and falls into the tab like a thrown object. x is balanced (slow start, slow end) so the lift reads
    // as a toss, not a drag across the button's text.
    var ax = animate(g, [{ translate: '0 0' }, { translate: dx + 'px 0' }], { duration: dur, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' });
    var ay = animate(g, [
      { transform: 'translateY(0) scale(1)', easing: 'cubic-bezier(0.2, 0, 0.4, 1)' },
      { transform: 'translateY(-28px) scale(1.05)', offset: 0.25, easing: 'cubic-bezier(0.55, 0, 0.9, 0.5)' },
      { transform: 'translateY(' + dy + 'px) scale(' + s + ')' }
    ], { duration: dur, easing: 'linear', fill: 'forwards' });
    animate(g, [{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0.85 }], { duration: dur, easing: 'linear', fill: 'forwards' });
    return settled([ax, ay]).then(function () {
      if (g.parentNode) g.parentNode.removeChild(g);
      if (isSvgEl(target)) prepSvg(target);
      animate(target, [{ scale: '0.86' }, { scale: '1' }], { spring: 'stamp', key: 'arrive' });
      arrive();
    });
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
    var a = animate(oldS, [{ opacity: 0, translate: '0 -6px' }], { duration: flipMode ? 80 : DUR.instant, easing: flipMode ? 'linear' : EASE.exit, fill: 'forwards', key: 'swap' });
    var b = animate(newS, [{ opacity: 0, translate: '0 8px' }, { opacity: 1, translate: '0 0' }], { duration: 200, delay: flipMode ? 90 : 60, easing: EASE.enter, fill: 'backwards', key: 'swap' });
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

  /* ---------------------------------------------------------------- view transitions */
  var VT_CLASSES = ['vt-forward', 'vt-back', 'vt-tab', 'vt-shared', 'vt-theme', 'vt-fade', 'vt-same-title'];
  var cur = null;            // { vt, kind, named:[], done:Promise }
  var navGen = 0;
  var morphMem = {};         // destination hash -> { key, id, from }
  var tap = null, explicitSrc = null, explicitDst = null;
  var LEGACY_HERO = { cat: '.pg-mast .cat-icon, .f-cat-sign .cat-icon, .f-cat-hero .cat-icon, .ln-head .cat-icon' };

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var link = t.closest('a[href^="#/"], [data-act="go"], [data-href^="#/"]');
    if (!link) return;
    tap = { scope: link.closest('[data-vt-scope], article, li') || link, link: link, t: now() };
  }, true);

  function share(name, el) { explicitSrc = el ? { key: name || 'cat', el: el, t: now() } : null; }
  function shareTarget(name, el) { explicitDst = el ? { key: name || 'cat', el: el } : null; }

  function ratioInView(el) {
    if (!el || !el.isConnected) return 0;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return 0;
    var vh = window.innerHeight || 800, vw = window.innerWidth || 400;
    var ih = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    var iw = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
    return (ih * iw) / (r.width * r.height);
  }
  function srcIn(scope, key) {
    if (!scope || !scope.querySelector) return null;
    if (scope.matches && scope.matches('[data-vt~="' + key + '"]')) return scope;
    return scope.querySelector('[data-vt~="' + key + '"]') || (key === 'cat' ? scope.querySelector('.cat-icon') : null);
  }
  function heroIn(root, key) {
    var list = root.querySelectorAll('[data-vt-hero~="' + key + '"]');
    for (var i = 0; i < list.length; i++) if (ratioInView(list[i]) > 0.5) return list[i];
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
  function pickShared(kind, o) {
    var view = document.getElementById('view') || document;
    var out = null, t = now();
    if (kind === 'forward') {
      if (explicitSrc && t - explicitSrc.t < 1500 && ratioInView(explicitSrc.el) >= 0.5) {
        out = { key: explicitSrc.key, from: explicitSrc.el, id: idOf(null, explicitSrc.el) };
      } else if (tap && t - tap.t < 1500 && tap.scope.isConnected) {
        var key = o.shared || 'cat';
        var el = srcIn(tap.scope, key);
        if (el && ratioInView(el) >= 0.5) out = { key: key, from: el, id: idOf(tap.scope, el) };
      }
    } else if (kind === 'back' && o.from && morphMem[o.from] && morphMem[o.from].from === o.to) {
      var m = morphMem[o.from];
      var hero = heroIn(view, m.key);
      if (hero && m.id) out = { key: m.key, from: hero, id: m.id, back: true };
    }
    tap = null; explicitSrc = null;
    return out;
  }
  function destFor(s) {
    var view = document.getElementById('view') || document;
    if (explicitDst && explicitDst.key === s.key && ratioInView(explicitDst.el) > 0.5) return explicitDst.el;
    if (!s.back) return heroIn(view, s.key);
    var row = null;
    try { row = view.querySelector('[data-id="' + attrEsc(s.id) + '"]'); } catch (e) { row = null; }
    var el = row ? srcIn(row, s.key) : null;
    return el && ratioInView(el) > 0.5 ? el : null;
  }
  function clearNames(list) { list.forEach(function (el) { try { el.style.viewTransitionName = ''; } catch (e) { } }); }
  function setKind(kind) {
    VT_CLASSES.forEach(function (c) { docEl.classList.remove(c); });
    if (kind && kind !== 'none') docEl.classList.add('vt-' + kind);
  }

  /* The page entrance used when there is no view transition (lite tier, or the API is missing). */
  function plainEntrance(kind, isLite) {
    var v = document.getElementById('view');
    if (!v || reduced() || kind === 'none') return null;
    var travel = isLite ? 12 : 32;
    var x = kind === 'forward' ? travel : kind === 'back' ? -travel : 0;
    var yy = kind === 'tab' ? 8 : 0;
    if (kind === 'theme' || kind === 'fade') { x = 0; yy = 0; }
    return animate(v, [{ opacity: 0, translate: x + 'px ' + yy + 'px' }, { opacity: 1, translate: '0 0' }],
      { duration: isLite ? 160 : DUR.page, easing: EASE.standard, key: 'enter' });
  }
  /* FLIP fallback for the shared tile when the View Transitions API is missing: a fixed ghost of the
     source flies to the destination's box; the destination is hidden until the ghost lands. */
  function flipShared(srcRect, srcEl, dst) {
    if (!srcRect || !dst) return;
    var b = dst.getBoundingClientRect();
    if (!b.width || !srcRect.width) return;
    var g = ghostOf(srcEl, srcRect);
    g.style.transformOrigin = '0 0';
    document.body.appendChild(g);
    dst.style.visibility = 'hidden';
    var a = animate(g, [{ transform: 'none' }, {
      transform: 'translate(' + (b.left - srcRect.left) + 'px,' + (b.top - srcRect.top) + 'px) scale(' + (b.width / srcRect.width) + ',' + (b.height / srcRect.height) + ')'
    }], { duration: DUR.morph, easing: EASE.standard, fill: 'forwards' });
    done(a).then(function () { dst.style.visibility = ''; if (g.parentNode) g.parentNode.removeChild(g); });
  }

  function transition(kind, update, o) {
    o = o || {};
    kind = kind || 'none';
    var run = function () { try { if (update) update(); } catch (e) { console.error(e); } };
    navGen++;
    // a new transition always supersedes a running one: rapid taps never queue
    skipTransition();
    var useVT = hasVT && kind !== 'none' && (reduced() || !lite());
    var allowShared = !reduced() && !lite() && (kind === 'forward' || kind === 'back');
    var shared = allowShared ? pickShared(kind, o) : (tap = null, explicitSrc = null, null);
    explicitDst = null;
    if (!useVT) {
      if (kind === 'none') { run(); return Promise.resolve(); }
      var srcRect = shared && !hasVT ? shared.from.getBoundingClientRect() : null;
      var srcEl = shared ? shared.from.cloneNode(true) : null;
      // a provisional record, so afterTransition() calls made by the view during run() wait for the entrance
      var resolveP, rec0 = { vt: null, kind: kind, named: [], anim: null };
      rec0.done = new Promise(function (r) { resolveP = r; });
      cur = rec0;
      var t0 = now();
      run();
      noteUpdate(now() - t0);
      var ent = plainEntrance(kind, lite());
      rec0.anim = ent;
      if (shared && !hasVT) {
        var dst = destFor(shared);
        if (dst) {
          flipShared(srcRect, srcEl, dst);
          if (!shared.back) morphMem[o.to] = { key: shared.key, id: shared.id, from: o.from };
        }
      }
      done(ent).then(function () { if (cur === rec0) cur = null; resolveP(); });
      return rec0.done;
    }
    var named = [];
    if (shared) { shared.from.style.viewTransitionName = 'sm-' + shared.key; named.push(shared.from); }
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
        var d = destFor(shared);
        if (d) {
          d.style.viewTransitionName = 'sm-' + shared.key;
          named.push(d);
          docEl.classList.add('vt-shared');
        }
        if (!shared.back) morphMem[o.to] = { key: shared.key, id: shared.id, from: o.from };
        else if (o.from) delete morphMem[o.from];
      }
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
      animate(bar, [{ transform: prev }, { transform: t }], { spring: 'snappy', key: 'ind' });
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
    tokens: { ease: EASE, dur: DUR, stagger: STAGGER, staggerMax: STAGGER_MAX, spring: springTokens },
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
