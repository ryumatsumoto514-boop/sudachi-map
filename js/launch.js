/* 巣立ちマップ v5 — launch.js (LAUNCH). Classic script, loaded last (after boot.js).
   SPEC-v5 Part A 1, MOTION-SPEC §2. Reads window.__lx from the head gate in index.html.

   1. html.lx-full — the hand-off. The opening already runs on the inline CSS in index.html from frame 1 (the line
      draws across the screen, the 巣 box arrives along it, 立ちマップ ride in). This script:
        - holds the view's entrance (SM.motion.hold) while the splash is up,
        - waits for H = max(intro end 740ms, first render, the web fonts if they are in by then); on a slow network the
          splash holds with a small "train" running along the line (CSS) until the app is ready,
        - in one frame reads the geometry, then FLIPs the lockup into the app-bar logo, lifts the whole line up into
          the app bar's underline (it thins and settles into the hairline colour), fades the caption and the paper,
          and raises the tab bar (the rail on desktop),
        - releases the view's entrance 60ms into the hand-off (home.js cascades its first screen in from there),
        - when everything lands, in the same frame: removes the splash, restores the chrome, writes sm2:seen.
      A tap / key / wheel on the splash (head gate) fast-forwards the intro and hands off as soon as the app is ready.
   2. html.lx-short — the 0.55s returning beat is pure CSS (inline); this keeps it in step if boot repaints the bar,
      then tidies up. html.lx-fade (reduced motion) — fades the page in once it has rendered (css/launch.css).
   3. Always: meta theme-color follows the theme; SM.loadMapLib() loads MapLibre + the map data on first use.

   Public:
     SM.loadMapLib([cb]) -> Promise<maplibregl>  (cb(err, maplibregl) also called). Idempotent. Adds, in order,
        js/vendor/maplibre-gl.css, js/vendor/maplibre-gl.js, data/map/base.js, data/map/style.js. Resolves when
        window.maplibregl, SM.mapStyle and SM.data.mapMeta exist; rejects if a file fails to load.
        Started by the map view itself, and right after the first render when the app opens on #/map. Fires `sm:maplib`.
     document event `sm:launched` {mode, skipped} when the opening has finished (every mode, also when cut short).
     document event `sm:lxskip` when the full opening was skipped before the view was released.
     SM.launch = { mode, done() } for diagnostics. */
(function () {
  'use strict';
  var w = window, d = document, de = d.documentElement;
  var SM = w.SM = w.SM || {};
  var L = w.__lx || (w.__lx = { mode: '', done: true });
  var raf = w.requestAnimationFrame ? function (f) { return w.requestAnimationFrame(f); } : function (f) { return setTimeout(f, 16); };
  function now() { return w.performance && performance.now ? performance.now() : Date.now(); }
  function noop() { }
  function emit(name, detail) {
    try { d.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) { }
  }

  SM.launch = { mode: L.mode, done: function () { return !!L.done; } };

  /* ------------------------------------------------------------------ theme-color follows the theme */
  function setMeta(n, v) { var m = d.querySelector('meta[name="' + n + '"]'); if (m && m.getAttribute('content') !== v) m.setAttribute('content', v); }
  var themeQueued = false;
  function syncTheme() {
    if (themeQueued) return;
    themeQueued = true;
    raf(function () {
      themeQueued = false;
      var dark = de.getAttribute('data-theme') === 'dark', bg = '';
      try { bg = getComputedStyle(d.body).backgroundColor; } catch (e) { }
      if (!bg || /rgba\(.*,\s*0\)$|transparent/.test(bg)) bg = dark ? '#141413' : '#FFFFFF';
      setMeta('theme-color', bg);
      setMeta('color-scheme', dark ? 'dark' : 'light');
    });
  }
  var lastTheme = de.getAttribute('data-theme');
  if (w.MutationObserver) {
    new MutationObserver(function () {
      var t = de.getAttribute('data-theme');
      if (t !== lastTheme) { lastTheme = t; syncTheme(); }
      // 動きを少なく switched on while the splash is up: end it now (CSS has already hidden it)
      if (L.mode === 'full' && !L.done && de.classList.contains('m-reduce') && finishLaunch) finishLaunch();
    }).observe(de, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  }

  /* ------------------------------------------------------------------ SM.loadMapLib: MapLibre on first use */
  var MAP_CSS = 'js/vendor/maplibre-gl.css';
  var MAP_JS = ['js/vendor/maplibre-gl.js', 'data/map/base.js', 'data/map/style.js'];
  var mapP = null;
  function mapReady() { return !!(w.maplibregl && SM.mapStyle && SM.data && SM.data.mapMeta); }
  function hasTag(sel, attr, src) {
    var list = d.querySelectorAll(sel);
    for (var i = 0; i < list.length; i++) if (list[i].getAttribute(attr) === src) return list[i];
    return null;
  }
  SM.loadMapLib = function (cb) {
    if (!mapP) {
      mapP = new Promise(function (resolve, reject) {
        if (mapReady()) { resolve(w.maplibregl); return; }
        var settled = false, poll = 0, started = now();
        function ok() {
          if (settled || !mapReady()) return false;
          settled = true; clearInterval(poll);
          if (SM.mapStyle.root === undefined) SM.mapStyle.root = '';
          resolve(w.maplibregl);
          emit('sm:maplib');
          return true;
        }
        function fail(src) {
          if (settled) return;
          settled = true; clearInterval(poll);
          mapP = null; // a later call may retry
          // drop the tags that never loaded: a retry must add fresh ones (it would otherwise wait on the dead
          // tags until the 20s timeout, and the map would sit on 準備しています instead of falling back)
          MAP_JS.forEach(function (src) {
            var t = hasTag('script', 'src', src);
            if (t && !t._smOk && t.parentNode) t.parentNode.removeChild(t);
          });
          reject(new Error('map library failed to load: ' + src));
        }
        if (!hasTag('link[rel="stylesheet"]', 'href', MAP_CSS)) {
          var l = d.createElement('link');
          l.rel = 'stylesheet'; l.href = MAP_CSS;
          d.head.appendChild(l);
        }
        var last = null;
        MAP_JS.forEach(function (src) {
          if (hasTag('script', 'src', src)) return; // someone else added it; the poll below notices when it ran
          var s = d.createElement('script');
          s.src = src; s.async = false; // execute in insertion order
          s.onerror = function () { fail(src); };
          s.addEventListener('load', function () { s._smOk = true; });
          d.body.appendChild(s);
          last = s;
        });
        if (last) last.addEventListener('load', function () { if (!ok()) setTimeout(ok, 0); });
        // covers tags added by someone else, and engines that fire load before running dependants
        poll = setInterval(function () { if (!ok() && now() - started > 20000) fail('timeout'); }, 60);
      });
    }
    if (typeof cb === 'function') mapP.then(function (m) { cb(null, m); }, function (e) { cb(e); });
    return mapP;
  };
  function warmMap() { if (!mapReady()) SM.loadMapLib().catch(noop); }
  function isMapHash(h) { return /^#\/map(\/|$|\?)/.test(h || ''); }
  /* No warm-up on intent (pointerdown on a map link, or the hashchange to #/map): parsing MapLibre + the base
     data is one long task (about 350ms at 4x CPU) that then landed between the tap and its transition, so the
     マップ tab answered three times slower than the other tabs. The map view starts the load itself in
     afterTransition, under its framed outline placeholder, which is what that placeholder is for. (INTEGRATOR) */

  /* ------------------------------------------------------------------ after the first render */
  var onReadyFns = [];
  function whenReady(fn) { onReadyFns.push(fn); }
  function domReady() {
    // our DOMContentLoaded listener was added after boot.js's, so SM.start (first render) has run by now
    raf(function () {
      L.readyAt = now();
      var fns = onReadyFns; onReadyFns = [];
      fns.forEach(function (f) { try { f(); } catch (e) { if (w.console) console.error(e); } });
    });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', domReady); else domReady();
  whenReady(function () { if (isMapHash(location.hash)) warmMap(); });

  /* ------------------------------------------------------------------ html.lx-short: the returning beat */
  L.taken = true;   // the head gate's fallback (index.html) leaves the opening to this script from here on
  function tidyClasses() { de.classList.remove('lx-full', 'lx-short', 'lx-fade', 'lx-fade-go', 'lx-on', 'lx-out', 'lx-in', 'lx-skip', 'lx-skip-css'); }
  if (L.mode === 'short') {
    var bar = d.querySelector('.appbar'), beatStart = null;
    // the clock of the beat that is on screen (the bar's animations may still be pending when this script runs)
    var clock = function () {
      try {
        var list = bar ? bar.getAnimations({ subtree: true }) : [];
        for (var i = 0; i < list.length; i++) {
          var an = list[i];
          if (!/^lx-s-arrive$/.test(an.animationName || '')) continue;
          if (an.startTime !== null && an.startTime !== undefined) { beatStart = an.startTime; return; }
          if (an.ready) an.ready.then(function () { if (beatStart === null && an.startTime !== null) beatStart = an.startTime; }, noop);
        }
      } catch (e) { }
    };
    clock();
    // boot repaints the brand when it differs (English): the new one would beat again from 0. Put every new
    // animation in the bar on the old clock, so the beat continues (or stays finished) and nothing restarts.
    var mo = (w.MutationObserver && bar) ? new MutationObserver(function () {
      if (beatStart === null) { clock(); return; }
      try { bar.getAnimations({ subtree: true }).forEach(function (a) { if (/^lx-/.test(a.animationName || '') && a.startTime !== beatStart) a.startTime = beatStart; }); } catch (e) { }
    }) : null;
    if (mo) mo.observe(bar, { childList: true, subtree: true });
    var tidied = false;
    var tidy = function () {
      if (tidied) return;
      tidied = true;
      if (mo) mo.disconnect();
      de.classList.remove('lx-short');
      L.done = true;
      emit('sm:launched', { mode: 'short' });
    };
    // the green line has settled into the hairline (≈620ms): what is left is exactly the real border
    if (bar) bar.addEventListener('animationend', function (e) { if (e.animationName === 'lx-soft') setTimeout(tidy, 20); });
    setTimeout(tidy, 1600);
  }

  /* ------------------------------------------------------------------ html.lx-fade: reduced motion */
  if (L.mode === 'fade') {
    whenReady(function () {
      de.classList.add('lx-fade-go');
      setTimeout(function () {
        de.classList.remove('lx-fade', 'lx-fade-go');
        L.done = true;
        emit('sm:launched', { mode: 'fade' });
      }, 260);
    });
  }

  /* ------------------------------------------------------------------ html.lx-full: the hand-off */
  var root = d.getElementById('launch');
  var finishLaunch = null;
  if (L.mode !== 'full' || !root) {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    if (L.mode === 'full') { tidyClasses(); L.done = true; emit('sm:launched', { mode: 'full', skipped: true }); }
    return;
  }

  var INTRO_END = 660;       // the last kana is landing, the caption has hung (inline CSS in index.html)
  var FONT_DEADLINE = 660;  // web fonts may be waited for only while the intro still plays: never on the network
  var MOVE = 360, MOVE_SKIP = 260;
  var EASE = 'cubic-bezier(0.2, 0, 0, 1)';          // --ease-standard
  /* the lockup's flight, split by axis: it shrinks toward its top-left (and moves across) a little ahead of its rise,
     so its far end clears すぐ閉じる on the way up instead of grazing the button's corner. */
  var EASE_X = 'cubic-bezier(0.05, 0.75, 0, 1)', EASE_Y = 'cubic-bezier(0.2, 0, 0.05, 1)';
  var started = false, ready = false, fontsOk = false, timer = 0, chromeAnims = [];

  de.classList.add('lx-on');
  var release = noop;
  try { if (SM.motion && typeof SM.motion.hold === 'function') release = SM.motion.hold('launch', 2600) || noop; } catch (e) { release = noop; }
  var released = false;
  function releaseView() {
    if (released) return;
    released = true;
    try { release(); } catch (e) { }
    // the guard on #view lifts at once: every held element is still in its from-state, and its own entrance (with
    // its delay from the table in home.js) brings it in. No fade of the whole view on top of that.
    de.classList.add('lx-in');
  }

  function finish(hidden) {
    if (L.done) return;
    L.done = true; L.out = true;
    clearTimeout(timer);
    if (L.off) L.off();
    chromeAnims.forEach(function (a) { try { a.cancel(); } catch (e) { } });
    chromeAnims = [];
    var bar = d.querySelector('.appbar');
    if (bar) { bar.style.backgroundColor = ''; bar.style.borderBottomColor = ''; }
    releaseView();   // if its timer has not run yet (busy main thread): release now
    tidyClasses();
    if (root.parentNode) root.parentNode.removeChild(root);
    if (!hidden) { try { localStorage.setItem('sm2:seen', '1'); } catch (e) { } }
    emit('sm:launched', { mode: 'full', skipped: !!L.skipped });
  }
  finishLaunch = function () { finish(false); };
  // leaving mid-splash (quick exit, link out): never let a back/forward-cache restore show a half splash
  w.addEventListener('pagehide', function () { if (!L.done) finish(true); });

  // where the CSS intro's clock started (document timeline = performance.now() base)
  function introStart() {
    try {
      var a = root.querySelector('.lx-track').getAnimations()[0];
      if (a && a.startTime !== null && a.startTime !== undefined && !L.skipped) return a.startTime;
    } catch (e) { }
    return L.t0 || 0;
  }
  var t0 = null;

  // the hand-off runs straight from the timer: waiting for one more frame would queue it behind the first layout
  function later(ms) {
    clearTimeout(timer);
    timer = setTimeout(handoff, Math.max(0, ms));
  }
  // inFrame: called from a rAF callback. If the hand-off is already due (slow phones: the app is ready only after
  // the intro has ended), start it in this very frame instead of a timer + another frame behind the first layout.
  function schedule(inFrame) {
    if (started || !ready || L.done) return;
    var t = now(), due;
    if (L.skipped) due = inFrame === true ? t : (L.skipAt || t) + 150; // skipped + ready: go now (the parts finish in flight)
    else {
      if (t0 === null) { t0 = introStart(); L.introT0 = Math.round(t0); }
      due = t0 + INTRO_END;
      // fonts may extend the poster only while it is still playing; an app that is ready late never waits longer
      if (!fontsOk && t < due + 40 && t < t0 + FONT_DEADLINE) due = Math.max(due, t0 + FONT_DEADLINE); // fontsOk re-schedules
    }
    if (inFrame === true && due - t <= 8) { clearTimeout(timer); handoff(); return; }
    later(due - t);
  }
  // home.js listens: an entrance that was set up for the full opening switches to the short one
  L.onskip = function () { emit('sm:lxskip'); schedule(false); };

  // web fonts: the first view should paint in Plex / BIZ, but never wait past FONT_DEADLINE
  function fontGate() {
    var link = d.getElementById('sm-fonts');
    function ok() { if (!fontsOk) { fontsOk = true; schedule(false); } }
    if (!link || !d.fonts || !d.fonts.ready || L.fontsCss === -1) { ok(); return; }
    function settle() {
      // two frames: the rendered view has asked for the faces it uses, so fonts.ready now waits for them
      raf(function () { raf(function () { d.fonts.ready.then(ok, ok); }); });
    }
    if (L.fontsCss === 1) settle();
    else { link.addEventListener('load', settle); link.addEventListener('error', ok); }
  }

  whenReady(function () { ready = true; fontGate(); schedule(true); });

  function handoff() {
    if (started || L.done) return;
    started = true; L.out = true;
    var skipped = !!L.skipped, dur = skipped ? MOVE_SKIP : MOVE;
    var lock = root.querySelector('.lx-lockup'), track = root.querySelector('.lx-track');
    var paper = root.querySelector('.lx-paper'), cap = root.querySelector('.lx-cap'), runner = root.querySelector('.lx-run');
    var line = lock && lock.querySelector('.lg-line'), word = lock && lock.querySelector('.lg-word');
    var appbar = d.querySelector('.appbar'), brand = appbar && appbar.querySelector('.brand');
    var tBox = brand && (brand.querySelector('.lg-box') || brand.querySelector('svg'));
    var tabbar = d.querySelector('.tabbar');
    var rs;
    try { rs = getComputedStyle(root); } catch (e) { rs = null; }
    // splash already gone (CSS failsafe fired, reduced motion, no CSS): just clean up
    if (!rs || rs.display === 'none' || rs.visibility === 'hidden' || !lock || !track || !tBox || de.classList.contains('m-reduce')) {
      finish(false); return;
    }

    // ---- reads (no writes before this point) ----
    var la = lock.getBoundingClientRect(), tb = tBox.getBoundingClientRect();
    var bAfter = null;
    try { bAfter = getComputedStyle(brand, '::after'); } catch (e) { bAfter = null; }
    var hasBarLine = !!(bAfter && bAfter.content && bAfter.content !== 'none' && bAfter.content !== 'normal');
    var ab = appbar.getBoundingClientRect();
    var cs = getComputedStyle(appbar);
    var bw = parseFloat(cs.borderBottomWidth) || 0, bc = cs.borderBottomColor, bstyle = cs.borderBottomStyle;
    var wide = !!(w.matchMedia && w.matchMedia('(min-width: 900px)').matches);
    var en = de.classList.contains('lx-en') || !!brand.querySelector('.logo-lockup.is-en');
    if (!la.height || !tb.height) { finish(false); return; }
    var unit = la.height / 23, lineY = la.top + 22 * unit;   // the line's centre (lockup units 21–23)

    // ---- writes ----
    de.classList.add('lx-out');
    // the lockup and the line land inside the app bar, which sits above the splash: from here until they land
    // the bar has no paper and no border of its own (finish() hands both back in the landing frame)
    appbar.style.backgroundColor = 'transparent';
    appbar.style.borderBottomColor = 'transparent';
    if (runner) runner.style.display = 'none';
    // launch.js is alive: the CSS failsafes must not cut the hand-off short
    try {
      root.getAnimations().forEach(function (a) { if (/^lx-failsafe/.test(a.animationName || '')) a.cancel(); });
      [brand, tabbar].forEach(function (el) { if (el) el.getAnimations().forEach(function (a) { if (/^lx-restore/.test(a.animationName || '')) a.cancel(); }); });
    } catch (e) { }

    var anims = [];
    function run(el, kf, opt, chrome) {
      if (!el || !el.animate) return null;
      var a = el.animate(kf, opt);
      (chrome ? chromeAnims : anims).push(a);
      return a;
    }

    // 1. the lockup FLIPs into the app-bar logo: box onto box (transform-origin 0 0 = the box's top-left)
    var side = la.height * 20 / 23;                       // the box is 20 of the lockup's 23 units
    var s = tb.height / side, dx = tb.left - la.left, dy = tb.top - la.top;
    L.geom = { from: [la.left, la.top, side], to: [tb.left, tb.top, tb.height], line: [lineY, ab.bottom], wide: wide };
    run(lock, [{ translate: '0 0' }, { translate: '0 ' + dy + 'px' }], { duration: dur, easing: EASE_Y, fill: 'forwards' });
    run(lock, [{ transform: 'none' }, { transform: 'translateX(' + dx + 'px) scale(' + s + ')' }],
      { duration: dur, easing: EASE_X, fill: 'forwards' });
    /* the logo's own green line (under 立ちマップ, ending in the step) was drawn by the track until now (same pixels);
       it flies with the lockup and lands on the bar's brand line (base.css .brand::after), which takes over in the
       landing frame. Only the run under the box lets go. English and bars without the line: it all lets go. */
    if (line) line.style.opacity = '1';
    var run1 = line && line.querySelector('.lg-run1');
    if (line && run1 && hasBarLine && !en) {
      var NS = 'http://www.w3.org/2000/svg';
      var head = d.createElementNS(NS, 'path');
      head.setAttribute('class', 'lg-run0');
      head.setAttribute('d', 'M0 21H23.333V23H0Z');
      run1.setAttribute('d', 'M23.333 21H124.429V23H23.333Z');
      line.insertBefore(head, run1);
      run(head, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear', fill: 'forwards' });
      var uEnd = tb.height / 20;                        // px per lockup unit once docked
      // the bar's line: 2px tall, 2px under the box → centre at 20 + 3px, in units; the lockup's centre is at 22
      var gapU = 3 / uEnd - 2, thick = Math.max(0.5, Math.min(1.2, 1 / uEnd));
      line.style.transformBox = 'view-box';
      line.style.transformOrigin = '0 22px';
      run(line, [{ transform: 'none' }, { transform: 'translateY(' + gapU.toFixed(3) + 'px) scaleY(' + thick.toFixed(3) + ')' }],
        { duration: dur, easing: EASE, fill: 'forwards' });
    } else if (line) {
      run(line, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear', fill: 'forwards' });
    }
    if (en) {
      // English: only the box travels. The JP wordmark fades; "Sudachi Map" fades in, in place.
      run(word, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'linear', fill: 'forwards' });
      var tWord = brand.querySelector('.lg-word'), tBoxEl = brand.querySelector('.lg-box');
      run(brand, [{ opacity: 1 }, { opacity: 1 }], { duration: 10000, fill: 'forwards' }, true);
      run(tBoxEl, [{ opacity: 0 }, { opacity: 0 }], { duration: 10000, fill: 'forwards' }, true);
      run(tWord, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: skipped ? 100 : 200, easing: 'linear', fill: 'both' }, true);
    }

    // 2. the line keeps going: the whole track rises and becomes the app bar's underline (its width, its colour)
    var hasBorder = bw > 0 && bstyle !== 'none' && !/^transparent$|rgba\([^)]*,\s*0\)$/.test(bc);
    var target = ab.bottom - (hasBorder ? bw / 2 : 0.5);
    var ty = target - lineY, sy = Math.max(0.15, (hasBorder ? bw : 1) / (2 * unit));
    track.style.transformOrigin = '0 ' + lineY.toFixed(2) + 'px';
    run(track, [{ transform: 'translateY(0) scaleY(1)' }, { transform: 'translateY(' + ty.toFixed(2) + 'px) scaleY(' + sy.toFixed(3) + ')' }],
      { duration: dur, easing: EASE_Y, fill: 'forwards' });
    if (hasBorder) {
      // the green settles into the hairline: a hairline of the bar's own colour fades in where the line lands
      var hair = d.createElement('i');
      hair.style.cssText = 'position:absolute;left:0;right:0;display:block;pointer-events:none;top:' + (ab.bottom - bw) + 'px;height:' + bw + 'px;background:' + bc;
      root.appendChild(hair);
      run(hair, [{ opacity: 0 }, { opacity: 1 }], { duration: dur * 0.45, delay: dur * 0.55, easing: 'linear', fill: 'both' });
    }
    run(track, [{ opacity: 1 }, { opacity: 0 }], { duration: dur * 0.45, delay: dur * 0.55, easing: 'linear', fill: 'both' });

    // 3. caption out, paper out, tab bar (rail) in
    run(cap, [{ opacity: 1 }, { opacity: 0 }], { duration: 90, easing: 'cubic-bezier(0, 0, 0.2, 1)', fill: 'forwards' });
    run(paper, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, delay: skipped ? 0 : 60, easing: 'linear', fill: 'both' });
    if (tabbar) {
      run(tabbar, [{ transform: wide ? 'translateX(-100%)' : 'translateY(100%)' }, { transform: 'none' }],
        { duration: dur, delay: skipped ? 0 : 80, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)', fill: 'both' }, true);
    }

    // 4. the view's held entrance starts while the brand is still travelling (H+60; H+40 after a skip): the hero's
    //    first line rises as the paper fades, so there is no empty frame between the poster and the page
    setTimeout(releaseView, skipped ? 40 : 60);

    // 5. land: same frame — splash gone, real logo + border + tab bar in place (pixel-identical underneath)
    var all = anims.concat(chromeAnims.filter(function (a) { return a.effect && a.effect.getTiming().duration < 10000; }));
    var landed = false;
    function land() { if (landed) return; landed = true; finish(false); }
    Promise.all(all.map(function (a) { return a.finished; })).then(land, land);
    // belt and braces: never leave the splash up if an animation is cancelled from outside
    setTimeout(land, dur + 260);
  }
})();
