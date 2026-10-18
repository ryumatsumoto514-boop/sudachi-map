/* 巣立ちマップ v4 — launch.js (LAUNCH). Classic script, loaded last (after boot.js).
   MOTION-SPEC §2 (opening), LOGO.md §7 (the mark slot). Reads window.__lx from the head gate in index.html.

   1. html.lx-full — the hand-off. The intro already runs on CSS from first paint. This script:
        - holds the view's entrance (SM.motion.hold) while the splash is up,
        - waits for H = max(intro end 860ms, first render, web fonts — at most until 1300ms),
        - in one frame reads the geometry, then FLIPs the lockup into the app-bar logo, slides the rule up into the
          app bar's bottom border (matching its width and colour), fades the caption, the green line and the
          paper, and raises the tab bar (the rail on desktop),
        - releases the view's entrance 90ms into the hand-off (40 after a skip; see step 4): the view is not
          faded as a whole (its parts are already in their from-state), so the first line starts to rise while the
          paper is still fading — no blank frame between the poster and the page,
        - when everything lands, in the same frame: removes the splash, restores the chrome, writes sm2:seen.
      A tap / key / wheel on the splash (head gate) fast-forwards the intro and hands off as soon as the app is ready.
   2. html.lx-short — the returning beat is pure CSS; this keeps it in step if boot repaints the bar, then tidies up.
   3. Always: meta theme-color follows the theme; SM.loadMapLib() loads MapLibre + the map data on first use.

   Public:
     SM.loadMapLib([cb]) -> Promise<maplibregl>  (cb(err, maplibregl) also called). Idempotent. Adds, in order,
        js/vendor/maplibre-gl.css, js/vendor/maplibre-gl.js, data/map/base.js, data/map/style.js. Resolves when
        window.maplibregl, SM.mapStyle and SM.data.mapMeta exist; rejects if a file fails to load.
        Started by the map view itself, and right after the first render when the app opens on #/map (not on
        pointerdown or hashchange: parsing MapLibre there held the tap's own transition). Fires `sm:maplib`.
     document event `sm:launched` when the opening has finished (or was cut short).
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
  if (L.mode === 'short') {
    var bar = d.querySelector('.appbar');
    var beatOf = function (box) {
      try {
        var list = box && box.getAnimations ? box.getAnimations() : [];
        for (var i = 0; i < list.length; i++) if (list[i].animationName === 'lg-beat') return list[i];
      } catch (e) { }
      return null;
    };
    var beat = bar ? beatOf(bar.querySelector('.brand .lg-box')) : null, beatStart = null;
    // the clock of the beat that is actually on screen (it may still be pending when this script runs)
    var clock = function (an) {
      if (!an) return;
      if (an.startTime !== null && an.startTime !== undefined) { beatStart = an.startTime; return; }
      if (an.ready) an.ready.then(function () { if (an.startTime !== null && beatStart === null) beatStart = an.startTime; }, noop);
    };
    clock(beat);
    // boot may repaint the bar (innerHTML) while or after the beat runs: the new box would beat again. Put the new
    // animation on the old one's clock, so the beat continues (or stays finished): nothing visibly restarts.
    // (If the old box never reached the screen, beatStart is unknown and the new one simply plays.)
    var mo = (w.MutationObserver && bar) ? new MutationObserver(function () {
      var nb = beatOf(bar.querySelector('.brand .lg-box'));
      if (!nb || nb === beat) return;
      beat = nb;
      if (beatStart !== null) { try { nb.startTime = beatStart; } catch (e) { } } else clock(nb);
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
    // the ink rule (::after) and its paper mask (::before) soften into the bar's own hairline by 760ms: then the
    // overlay goes, and what is left is exactly the real border
    if (bar) bar.addEventListener('animationend', function (e) { if (e.animationName === 'lx-soft') setTimeout(tidy, 20); });
    setTimeout(tidy, 3000);
  }

  /* ------------------------------------------------------------------ html.lx-full: the hand-off */
  var root = d.getElementById('launch');
  var finishLaunch = null;
  if (L.mode !== 'full' || !root) {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    if (L.mode === 'full') { de.classList.remove('lx-full', 'lx-skip', 'lx-skip-css'); L.done = true; }
    return;
  }

  var INTRO_END = 860;       // caption settles at 760 + 100ms of stillness (MOTION-SPEC §2.2)
  var FONT_DEADLINE = 1300;  // wait for the web fonts at most until here (VISUAL-SPEC §9: ≤600ms past the intro)
  var MOVE = 380, MOVE_SKIP = 260;
  var EASE = 'cubic-bezier(0.2, 0, 0, 1)';          // --ease-standard
  /* the lockup's flight, split by axis: it shrinks toward its top-left (and moves across) a little ahead of its rise,
     so its far end clears すぐ閉じる by 12px or more on the way up instead of grazing the pill's corner (2-3px on a
     standard phone). The vertical stays close to --ease-standard: the view's entrance timing (step 4) still holds. */
  var EASE_X = 'cubic-bezier(0.05, 0.75, 0, 1)', EASE_Y = 'cubic-bezier(0.2, 0, 0.05, 1)';
  var EXIT = 'cubic-bezier(0.3, 0, 0.8, 0.15)';     // --ease-exit
  var started = false, ready = false, fontsOk = false, timer = 0, chromeAnims = [];

  de.classList.add('lx-on');
  var release = noop;
  try { if (SM.motion && typeof SM.motion.hold === 'function') release = SM.motion.hold('launch', 2400) || noop; } catch (e) { release = noop; }
  var released = false;
  function releaseView() {
    if (released) return;
    released = true;
    try { release(); } catch (e) { }
    // the guard on #view lifts at once: every held element is still in its from-state, and its own entrance (with
    // its delay from the table in home.js) is what brings it in. A fade of the whole view on top of that would
    // square every element's opacity (a quarter at its own halfway point) and read as dead air.
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
    releaseView();   // if its timer has not run yet (busy main thread): release now, no fade (L.done)
    de.classList.remove('lx-full', 'lx-on', 'lx-out', 'lx-in', 'lx-skip', 'lx-skip-css');
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
      var a = root.querySelector('.lx-rule-ink').getAnimations()[0];
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
  // home.js listens: an entrance that was set up for the full opening switches to the short one (no 1.3s replay)
  L.onskip = function () { emit('sm:lxskip'); schedule(false); };
  if (L.skipped) { /* tapped before this script parsed: the head gate already fast-forwarded the CSS */ }

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
    var lock = root.querySelector('.lx-lockup'), rule = root.querySelector('.lx-rule');
    var ink = root.querySelector('.lx-rule-ink'), hair = root.querySelector('.lx-rule-hair');
    var paper = root.querySelector('.lx-paper'), cap = root.querySelector('.lx-cap');
    var line = root.querySelector('.lg-line'), word = root.querySelector('.lg-word');
    var appbar = d.querySelector('.appbar'), brand = appbar && appbar.querySelector('.brand');
    var tBox = brand && (brand.querySelector('.lg-box') || brand.querySelector('svg'));
    var tabbar = d.querySelector('.tabbar');
    var rs;
    try { rs = getComputedStyle(root); } catch (e) { rs = null; }
    // splash already gone (CSS failsafe fired, reduced motion, no CSS): just clean up
    if (!rs || rs.display === 'none' || rs.visibility === 'hidden' || !lock || !rule || !tBox || de.classList.contains('m-reduce')) {
      finish(false); return;
    }

    // ---- reads (no writes before this point) ----
    var la = lock.getBoundingClientRect(), tb = tBox.getBoundingClientRect();
    var bAfter = null;
    try { bAfter = getComputedStyle(brand, '::after'); } catch (e) { bAfter = null; }
    var hasBarLine = !!(bAfter && bAfter.content && bAfter.content !== 'none' && bAfter.content !== 'normal');
    var ra = rule.getBoundingClientRect(), ab = appbar.getBoundingClientRect();
    var cs = getComputedStyle(appbar), inkColor = getComputedStyle(ink).backgroundColor;
    var bw = parseFloat(cs.borderBottomWidth) || 0, bc = cs.borderBottomColor, bstyle = cs.borderBottomStyle;
    var wide = !!(w.matchMedia && w.matchMedia('(min-width: 900px)').matches);
    var en = de.classList.contains('lx-en') || !!brand.querySelector('.logo-lockup.is-en');
    if (!la.height || !tb.height) { finish(false); return; }

    // ---- writes ----
    de.classList.add('lx-out');
    // the lockup and the rule land inside the app bar, which sits above the splash: from here until they land
    // the bar has no paper and no border of its own (finish() hands both back in the landing frame)
    appbar.style.backgroundColor = 'transparent';
    appbar.style.borderBottomColor = 'transparent';
    // launch.js is alive: the 3.2s CSS failsafes must not cut the hand-off short
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
    L.geom = { from: [la.left, la.top, side], to: [tb.left, tb.top, tb.height], rule: [ra.top, ab.bottom], wide: wide };
    run(lock, [{ translate: '0 0' }, { translate: '0 ' + dy + 'px' }], { duration: dur, easing: EASE_Y, fill: 'forwards' });
    run(lock, [{ transform: 'none' }, { transform: 'translateX(' + dx + 'px) scale(' + s + ')' }],
      { duration: dur, easing: EASE_X, fill: 'forwards' });
    /* the green line: the bar draws it too (base.css .brand::after, from under 立 to the step), so the splash HANDS
       it over instead of dropping it. Only the run under the box (0 → 23.333 units) lets go; the rest flies with the
       lockup, easing 1 unit lower (the bar's line sits 2px under the box, the lockup's 1 unit), and in the landing
       frame the bar's own line takes over at the same place (launch.css keeps it hidden until then). English and
       bars without the line: the whole line lets go, as before. */
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
    } else {
      run(line, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear', fill: 'forwards' });
    }
    if (en) {
      // English: only the box travels. The JP wordmark fades; "Sudachi Map" fades in, in place, from H+200.
      run(word, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'linear', fill: 'forwards' });
      var tWord = brand.querySelector('.lg-word'), tBoxEl = brand.querySelector('.lg-box');
      run(brand, [{ opacity: 1 }, { opacity: 1 }], { duration: 10000, fill: 'forwards' }, true);
      run(tBoxEl, [{ opacity: 0 }, { opacity: 0 }], { duration: 10000, fill: 'forwards' }, true);
      run(tWord, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: skipped ? 100 : 200, easing: 'linear', fill: 'both' }, true);
    }

    // 2. the rule rises and becomes the app bar's bottom border (its width, its colour)
    var hasBorder = bw > 0 && bstyle !== 'none' && !/^transparent$|rgba\([^)]*,\s*0\)$/.test(bc);
    var ty = (ab.bottom - (hasBorder ? bw : 0)) - ra.top;
    var sy = hasBorder ? Math.max(0.25, bw / (ra.height || 2)) : 1;
    run(rule, [{ transform: 'none' }, { transform: 'translateY(' + ty + 'px) scaleY(' + sy + ')' }],
      { duration: dur, easing: EASE_Y, fill: 'forwards' });
    if (!hasBorder) {
      run(ink, [{ opacity: 1 }, { opacity: 0 }], { duration: dur * 0.5, delay: dur * 0.5, easing: 'linear', fill: 'forwards' });
    } else if (bc !== inkColor) {
      // an ink rule landing on a hairline: it softens into the border colour on the way up
      hair.style.background = bc;
      run(hair, [{ opacity: 0 }, { opacity: 1 }], { duration: dur * 0.55, delay: dur * 0.3, easing: 'linear', fill: 'both' });
      run(ink, [{ opacity: 1 }, { opacity: 0 }], { duration: dur * 0.55, delay: dur * 0.3, easing: 'linear', fill: 'both' });
    }

    // 3. caption out, paper out, tab bar (rail) in
    // the caption lets go at once and in place (a slow-start exit kept it legible behind the departing lockup)
    run(cap, [{ opacity: 1 }, { opacity: 0 }], { duration: 90, easing: 'cubic-bezier(0, 0, 0.2, 1)', fill: 'forwards' });
    run(paper, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: skipped ? 0 : 60, easing: 'linear', fill: 'both' });
    if (tabbar) {
      run(tabbar, [{ transform: wide ? 'translateX(-100%)' : 'translateY(100%)' }, { transform: 'none' }],
        { duration: dur, delay: skipped ? 0 : 80, easing: EASE, fill: 'both' }, true);
    }

    // 4. the view's held entrance starts while the brand is still travelling: R = H+90 (H+40 after a skip).
    //    MOTION-SPEC §2.4 says H+140, but on --ease-standard the lockup has visually docked by about H+110, and
    //    H+140 left ~5 frames of empty page between the poster and the first ink (measured, 1x and 4x). From H+90
    //    the art's ground line and the eyebrow start drawing as the brand lands; nothing is legible under the
    //    lockup's path before it has passed (it is above y 100 by H+90).
    setTimeout(releaseView, skipped ? 40 : 90);

    // 5. land: same frame — splash gone, real logo + border + tab bar in place (pixel-identical underneath)
    var all = anims.concat(chromeAnims.filter(function (a) { return a.effect && a.effect.getTiming().duration < 10000; }));
    var landed = false;
    function land() { if (landed) return; landed = true; finish(false); }
    Promise.all(all.map(function (a) { return a.finished; })).then(land, land);
    // belt and braces: never leave the splash up if an animation is cancelled from outside
    setTimeout(land, dur + 240);
  }
})();
