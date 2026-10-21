;
/* ---- js/core.js ---- */
/* 巣立ちマップ v5 — core (ENGINE)
 * Defines window.SM: store, state, i18n, router, delegated events, sheet, toast, copy, furigana.
 * Navigation runs through SM.motion.transition (MOTION-SPEC §3): the update callback renders, mounts,
 * writes chrome classes, restores scroll and focuses — in that order, with no layout reads before the
 * scroll restore. Classic script. No modules, no network. */
(function () {
  'use strict';

  var SM = window.SM = window.SM || {};
  SM.version = window.__smV || '6.0.0';
  SM.updated = '2026-10-21';
  SM.data = SM.data || {};
  var D = SM.data;
  if (!Array.isArray(D.programs)) D.programs = [];
  if (!Array.isArray(D.areas)) D.areas = [];
  if (D.geo === undefined) D.geo = null;
  D.scripts = D.scripts || {};
  if (!Array.isArray(D.checks)) D.checks = [];
  D.sim = D.sim || {};
  if (!Array.isArray(D.timeline)) D.timeline = [];
  D.ruby = D.ruby || {};
  if (!Array.isArray(D.lessons)) D.lessons = [];
  SM.views = SM.views || {};
  SM.acts = SM.acts || {};
  /* S16: the one list of tabs. boot.js paints the tab bar from it, the router derives its tab roots from it
     (plus まなぶ, the desktop rail's extra row). A new tab also needs its lazy entry in index.html (__smLazy). */
  SM.tabs = [
    { key: 'home', href: '#/', icon: 'home' },
    { key: 'find', href: '#/find', icon: 'search' },
    { key: 'ask', href: '#/ask', icon: 'line' },   // SEARCH (v6): 「きく」
    { key: 'map', href: '#/map', icon: 'map' },
    { key: 'plan', href: '#/plan', icon: 'check-list' }
  ];

  /* ------------------------------------------------------------------ utils */
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  SM.esc = function (s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; });
  };

  function toDate(d) {
    if (d instanceof Date) return d;
    if (typeof d === 'string') {
      var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(d);
      if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    }
    var x = new Date(d);
    return isNaN(x) ? null : x;
  }
  var MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  SM.fmtDate = function (d) {
    var x = toDate(d);
    if (!x) return '';
    if (SM.lang() === 'en') return MONTHS_EN[x.getMonth()] + ' ' + x.getDate() + ', ' + x.getFullYear();
    return x.getFullYear() + '年' + (x.getMonth() + 1) + '月' + x.getDate() + '日';
  };

  function icon(name, cls) {
    try { return typeof SM.icon === 'function' ? SM.icon(name, cls) : ''; } catch (e) { return ''; }
  }
  SM._ic = icon;

  /* ------------------------------------------------------------------ store */
  var PREFIX = 'sm2:';
  var mem = {};
  var ls = null;
  try {
    ls = window.localStorage;
    var probe = PREFIX + '__probe';
    ls.setItem(probe, '1'); ls.removeItem(probe);
  } catch (e) { ls = null; }

  SM.store = {
    available: !!ls,
    get: function (key, fallback) {
      var raw = null;
      try { if (ls) raw = ls.getItem(PREFIX + key); } catch (e) { raw = null; }
      if (raw === null || raw === undefined) {
        if (Object.prototype.hasOwnProperty.call(mem, key)) raw = mem[key]; else return fallback;
      }
      try { return JSON.parse(raw); } catch (e) { return fallback; }
    },
    set: function (key, value) {
      var raw;
      try { raw = JSON.stringify(value); } catch (e) { return false; }
      mem[key] = raw;
      try { if (ls) { ls.setItem(PREFIX + key, raw); return true; } } catch (e) { /* quota / blocked */ }
      return false;
    },
    remove: function (key) {
      delete mem[key];
      try { if (ls) ls.removeItem(PREFIX + key); } catch (e) { }
    },
    clearAll: function () {
      mem = {};
      try {
        if (!ls) return;
        var keys = [];
        for (var i = 0; i < ls.length; i++) {
          var k = ls.key(i);
          if (k && k.indexOf(PREFIX) === 0) keys.push(k);
        }
        keys.forEach(function (k) { ls.removeItem(k); });
      } catch (e) { }
    }
  };

  /* ------------------------------------------------------------------ state */
  var STATE_V = 1;
  function defaults() {
    return {
      v: STATE_V,
      answers: { stage: null, path: null, area: null, concerns: [], age: null, care: null, urgent: false },
      answered: false,
      saved: [],
      done: [],
      learned: [],              // まなぶ: ids of lessons the user finished
      leaveDate: null,
      hsDate: null,             // 中学生 track: 高校入学 date 'YYYY-MM-DD' (set on やること)
      hints: { jrRuby: false }, // one-time banners the user already dismissed
      settings: { big: false, ruby: false, lang: 'ja', supporter: false, dark: false, motion: 'auto' }
    };
  }
  /* Type-safe merge (FIX-A S2): a stored value only replaces a default of the same type, so a
     corrupt or hand-edited sm2:state can never put null into answers or a string into saved.
     Keys the defaults do not know are kept (other views may add their own). */
  function kind(x) { return x === null ? 'null' : Array.isArray(x) ? 'array' : typeof x; }
  function merge(base, over) {
    if (!over || kind(over) !== 'object') return base;
    Object.keys(over).forEach(function (k) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
      var b = base[k], o = over[k], kb = kind(b), ko = kind(o);
      if (!Object.prototype.hasOwnProperty.call(base, k)) { base[k] = o; return; }
      if (kb === 'object') { if (ko === 'object') merge(b, o); return; }
      if (kb === 'array') { if (ko === 'array') base[k] = o; return; }
      if (kb === 'null') { if (ko === 'string' || ko === 'null') base[k] = o; return; }  // enum / date slots
      if (kb === ko) base[k] = o;
    });
    return base;
  }
  /* Older shapes → current (v missing = v0). Each step is idempotent. */
  function migrate(s) {
    if (!s || kind(s) !== 'object') return s;
    if (!s.v) {
      // v0 (≤ v5.x): answers.urgent was never in the defaults; settings.motion could be a boolean
      if (s.settings && typeof s.settings.motion === 'boolean') s.settings.motion = s.settings.motion ? 'auto' : 'reduce';
      s.v = 1;
    }
    return s;
  }
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  function idList(a) {
    var seen = {};
    return (Array.isArray(a) ? a : []).filter(function (x) {
      if (typeof x !== 'string' || !x || x.length > 80 || seen[x]) return false;
      seen[x] = 1; return true;
    });
  }
  // Enum checks run after SM.ENUMS exists (below); kept here so the shape rules live in one place.
  function validate(s) {
    var E = SM.ENUMS, a = s.answers;
    function en(v, list) { return list.indexOf(v) !== -1 ? v : null; }
    a.stage = en(a.stage, E.stage);
    a.path = en(a.path, E.path);
    a.age = en(a.age, E.age);
    a.care = en(a.care, E.care);
    if (a.area !== null && (typeof a.area !== 'string' || a.area.length > 40)) a.area = null;
    a.concerns = idList(a.concerns).filter(function (c) { return c.length <= 24; });
    a.urgent = a.urgent === true;
    s.answered = s.answered === true;
    s.saved = idList(s.saved);
    s.done = idList(s.done);
    s.learned = idList(s.learned);
    if (s.leaveDate !== null && !DATE_RE.test(s.leaveDate)) s.leaveDate = null;
    if (s.hsDate !== null && !DATE_RE.test(s.hsDate)) s.hsDate = null;
    var st = s.settings;
    ['big', 'ruby', 'supporter', 'dark'].forEach(function (k) { st[k] = st[k] === true; });
    if (st.lang !== 'ja' && st.lang !== 'en') st.lang = 'ja';
    if (['auto', 'reduce', 'full'].indexOf(st.motion) === -1) st.motion = 'auto';
    s.hints.jrRuby = s.hints.jrRuby === true;
    return s;
  }
  var rawState = null;
  try {
    rawState = SM.store.get('state', null);
    SM.state = merge(defaults(), migrate(rawState));
  } catch (e) {
    // keep what was there so nothing is silently lost, then start clean
    try { if (rawState) SM.store.set('state.bad', rawState); } catch (e2) { }
    SM.state = defaults();
  }

  /* ------------------------------------------------------------------ enums (SPEC.md + SPEC-v3 §3) */
  // Display order of the options (views own the labels). Old values are unchanged.
  SM.ENUMS = {
    stage: ['jhs12', 'jhs3', 'hs12', 'hs3', 'left0', 'left1', 'nohs'],
    path: ['study', 'work', 'unsure', 'hs'],
    pathJunior: ['hs', 'work', 'unsure'],       // shown instead of study/work when stage is jhs*
    age: ['a12', 'a15', 'a18', 'a20', 'a23'],
    ageBand: { a12: { min: 12, max: 14 }, a15: { min: 15, max: 17 }, a18: { min: 18, max: 19 }, a20: { min: 20, max: 22 }, a23: { min: 23, max: 30 } },
    care: ['facility', 'foster', 'jhome', 'other', 'skip'],
    juniorStages: ['jhs12', 'jhs3']
  };
  SM.ageBand = function (code) { return SM.ENUMS.ageBand[code] || null; };
  /** 中学生? (stage jhs12/jhs3, or age band a12). Reads SM.state.answers unless answers are passed. */
  SM.isJunior = function (answers) {
    var a = answers || (SM.state && SM.state.answers) || {};
    return SM.ENUMS.juniorStages.indexOf(a.stage) !== -1 || a.age === 'a12';
  };
  // body.is-junior follows the answers; called from setAnswer, applySettings and every render
  SM.syncJunior = function () {
    var b = document.body;
    if (!b) return false;
    var on = SM.isJunior();
    var was = b.classList.contains('is-junior');
    b.classList.toggle('is-junior', on);
    if (on !== was && SM.paintJrBanner) SM.paintJrBanner();
    return on;
  };

  try { validate(SM.state); } catch (e) { SM.state = defaults(); }

  /* SM.save() -> true when it reached storage. The first time it cannot (private mode, quota, blocked
     storage) the person is told once that this screen forgets on close (FIX-A S9). */
  var saveWarned = false;
  SM.save = function () {
    var ok = SM.store.set('state', SM.state);
    if (!ok) SM.store.available = false;
    // a caller that tells the person itself (boot's save: the amber flight + its own toast) sets store.quiet
    if (!ok && SM.store.quiet) saveWarned = true;
    if (!ok && !saveWarned) {
      saveWarned = true;
      setTimeout(function () {
        if (SM.toast) SM.toast(SM.t('core.noStore'), { ms: 7000, action: { label: SM.t('core.noStoreAct'), fn: function () { if (SM.acts.settings) SM.acts.settings(); } } });
      }, 0);
    }
    return ok;
  };
  SM.setAnswer = function (key, value) {
    SM.state.answers[key] = value;
    SM.save();
    if (key === 'stage' || key === 'age') SM.syncJunior();
  };

  /* まなぶ progress */
  SM.isLearned = function (id) { return SM.state.learned.indexOf(id) !== -1; };
  SM.setLearned = function (id, on) {
    if (!id) return false;
    var i = SM.state.learned.indexOf(id);
    if (on === undefined) on = true;
    if (on && i === -1) SM.state.learned.push(id);
    else if (!on && i !== -1) SM.state.learned.splice(i, 1);
    SM.save();
    return !!on;
  };
  SM.lesson = function (id) {
    var list = D.lessons || [];
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
    return undefined;
  };
  SM.isSaved = function (id) { return SM.state.saved.indexOf(id) !== -1; };
  /** SM.toggleSave(id[, {quiet, on}]) -> saved?  quiet: no toast / badge (the caller choreographs them,
      e.g. boot.js's save act: stamp → flight to やること → badge roll → undo toast). on: force a state. */
  SM.toggleSave = function (id, opts) {
    opts = opts || {};
    var i = SM.state.saved.indexOf(id), on = opts.on != null ? !!opts.on : i === -1;
    if (on && i === -1) SM.state.saved.push(id);
    else if (!on && i !== -1) SM.state.saved.splice(i, 1);
    SM.save();
    if (!opts.quiet) {
      SM.toast(SM.t(on ? 'core.saved' : 'core.unsaved'));
      if (SM.updateBadge) SM.updateBadge({ roll: true });
    }
    return on;
  };

  var pIdx = null, pLen = -1, aIdx = null, aLen = -1;
  SM.program = function (id) {
    var list = D.programs || [];
    if (!pIdx || pLen !== list.length) {
      pIdx = {}; pLen = list.length;
      list.forEach(function (p) { if (p && p.id) pIdx[p.id] = p; });
    }
    return pIdx[id];
  };
  SM.area = function (code) {
    var list = D.areas || [];
    if (!aIdx || aLen !== list.length) {
      aIdx = {}; aLen = list.length;
      list.forEach(function (a) { if (a && a.code) aIdx[a.code] = a; });
    }
    return aIdx[String(code)];
  };

  /* ------------------------------------------------------------------ i18n */
  var STR = {};
  SM.lang = function () { return SM.state.settings.lang === 'en' ? 'en' : 'ja'; };
  SM.strings = function (obj) {
    if (obj) Object.keys(obj).forEach(function (k) { STR[k] = obj[k]; });
  };
  // 中学生 copy: {ja, jr, en} — jr wins (in Japanese) while body.is-junior
  function useJr() {
    if (SM.lang() !== 'ja') return false;
    var b = document.body;
    return b ? b.classList.contains('is-junior') : SM.isJunior();
  }
  SM.useJr = useJr;
  SM.t = function (key, vars) {
    var e = STR[key], s;
    if (!e) s = key;
    else if (typeof e === 'string') s = e;
    else if (e.jr && useJr()) s = e.jr;
    else { var v = e[SM.lang()]; s = (v !== undefined && v !== null) ? v : (e.ja || ''); }
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, n) { return vars[n] !== undefined && vars[n] !== null ? vars[n] : m; });
    return s;
  };
  SM.L = function (obj) {
    if (obj === null || obj === undefined) return '';
    if (typeof obj !== 'object') return String(obj);
    if (obj.jr && useJr()) return obj.jr;
    var v = obj[SM.lang()];
    return (v !== undefined && v !== null && v !== '') ? v : (obj.ja || '');
  };

  SM.strings({
    'core.saved': { ja: '保存しました（やることに入りました）', en: 'Saved (added to your to-do list)' },
    'core.unsaved': { ja: '保存を外しました', en: 'Removed from saved' },
    'core.savedTemp': { ja: '保存しました。ただ、この画面を閉じると消えます', en: 'Saved for now, but it goes when you close this page' },
    'core.copied': { ja: 'コピーしました', en: 'Copied' },
    'core.copyFail': { ja: 'コピーできません。長押しで選んでください', en: 'Couldn’t copy. Press and hold to select.' },
    'core.close': { ja: '閉じる', en: 'Close' },
    'core.back': { ja: '戻る', en: 'Back' },
    'core.errTitle': { ja: 'この画面を表示できませんでした', en: 'This page could not be shown' },
    'core.errBody': { ja: 'ごめんなさい、こちらの不具合です（あなたのせいではありません）。', en: 'Sorry — something went wrong on our side, not yours.' },
    'core.retry': { ja: 'もう一度ためす', en: 'Try again' },
    'core.home': { ja: 'ホームへ', en: 'Go home' },
    'core.escAgain': { ja: 'もう一度 Esc で、すぐ閉じます', en: 'Press Esc again to leave quickly' },
    'core.exit': { ja: 'すぐ閉じる', en: 'Quick exit' },
    'core.exitHint': { ja: 'すぐに天気の検索に切りかえます', en: 'Switch to a weather search at once' },
    'core.newtab': { ja: '（新しいタブで開きます）', en: '(opens in a new tab)' },
    'core.undo': { ja: '元に戻す', en: 'Undo' },
    'core.undone': { ja: '元に戻しました', en: 'Undone' },
    'core.noStore': { ja: 'この画面では保存できません。閉じると消えます', en: 'This browser can’t save here. Your answers go when you close it.' },
    'core.noStoreAct': { ja: '設定', en: 'Settings' },
    'core.notFound': { ja: 'そのページは見つかりませんでした。ホームを開きました', en: 'That page wasn’t found, so Home is open.' },
    'core.offline': { ja: 'オフラインです。公式ページは開けません（一覧・地図・やることは使えます）', en: 'Offline: official pages won’t open (the list, map and to-do still work).' }
  });

  /* ------------------------------------------------------------------ toast
     SM.toast(msg[, ms | {ms, action:{label, fn}}])
     In: translateY(12px→0) + opacity on the snappy spring. Out: 160ms --ease-exit + 6px.
     A toast that arrives while one is showing replaces it in place (120ms cross-fade, no re-slide).
     With an action (元に戻す) it lives 4000ms, shows a hairline that shrinks over its life, and pauses
     while hovered or focused. role=status stays on #toast, so every message is announced once. */
  var toastSeq = 0, toastTimer = null, toastLeft = 0, toastStart = 0, toastLife = null, toastHiding = false, toastHold = false;
  function M() { return SM.motion || null; }
  function mAnimate(el, kf, o) { var m = M(); return m && m.animate ? m.animate(el, kf, o) : null; }
  function toastHide(el) {
    clearTimeout(toastTimer);
    if (!el.classList.contains('is-show')) return;
    toastHiding = true;
    var a = mAnimate(el, [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 16px' }],
      { duration: 220, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)', fill: 'forwards', key: 'toast' });
    var fin = function () {
      if (!toastHiding) return;
      toastHiding = false;
      el.classList.remove('is-show', 'has-action');
      if (a) { try { a.cancel(); } catch (e) { } }
      el.style.translate = ''; el.style.opacity = '';
    };
    if (a) a.finished.then(fin, function () { }); else fin();
  }
  function toastArm(el, ms) {
    clearTimeout(toastTimer);
    toastLeft = ms; toastStart = Date.now();
    toastTimer = setTimeout(function () { toastHide(el); }, ms);
  }
  function toastPause(on) {
    var el = document.getElementById('toast');
    if (!el || !el.classList.contains('has-action') || toastHiding) return;
    if (on && !toastHold) {
      toastHold = true;
      clearTimeout(toastTimer);
      toastLeft = Math.max(600, toastLeft - (Date.now() - toastStart));
      if (toastLife) try { toastLife.pause(); } catch (e) { }
    } else if (!on && toastHold) {
      toastHold = false;
      if (toastLife) try { toastLife.play(); } catch (e) { }
      toastArm(el, toastLeft);
    }
  }
  SM.toast = function (msg, opts) {
    var el = document.getElementById('toast');
    if (!el) return;
    if (typeof opts === 'number') opts = { ms: opts };
    opts = opts || {};
    var action = opts.action && typeof opts.action.fn === 'function' ? opts.action : null;
    var ms = opts.ms || (action ? 4000 : 2600);
    // a save flight (☆ → やること) still in the air: the toast comes up as it lands, not across its path
    var fly = M() && M().flightLeft ? M().flightLeft() : 0;
    if (fly > 0 && !opts._afterFlight) {
      var seqF = ++toastSeq;
      setTimeout(function () {
        if (seqF !== toastSeq) return;
        var o2 = {}; for (var k in opts) o2[k] = opts[k];
        o2._afterFlight = true; o2.ms = ms;
        SM.toast(msg, o2);
      }, Math.round(fly) + 40);
      return;
    }
    var showing = el.classList.contains('is-show') && !toastHiding;
    toastSeq++;
    var ae = document.activeElement;
    if (action) el._smReturn = ae && ae !== document.body && !el.contains(ae) ? ae : null;
    toastHiding = false; toastHold = false;
    el.classList.add('m-toast');
    if (!el._smBound) {
      el._smBound = true;
      el.addEventListener('pointerenter', function () { toastPause(true); });
      el.addEventListener('pointerleave', function () { toastPause(false); });
      el.addEventListener('focusin', function () { toastPause(true); });
      el.addEventListener('focusout', function () { toastPause(false); });
    }
    /* A toast replacing one that is showing (できた！ 元に戻す → 元に戻しました): the old row stays where it is, laid
       over the new one, and fades out (80ms); the new row fades in from 50ms (120ms); the ink pill's width/height
       change is a background layer scaling from the old size (160ms), so neither the text nor the pill cuts.
       Nothing is measured in the tap's task (a layout read there restyles the whole page on a slow phone): the old
       pill and row sizes come from a ResizeObserver (read when layout was clean), and the new size arrives in that
       observer's callback, after this frame's layout and before its paint. */
    var mm = M();
    var morph = showing && mm && mm.animate && !(mm.reduced && mm.reduced());
    var oldRow = null, box = el._smBox || null;
    if (!el._smRO && typeof ResizeObserver === 'function') {
      el._smRO = new ResizeObserver(function () {
        var r0 = el.querySelector(':scope > .toast-row:not(.toast-old)');
        var b = { w: el.offsetWidth, h: el.offsetHeight, row: r0, oT: r0 ? r0.offsetTop : 0, oL: r0 ? r0.offsetLeft : 0, oW: r0 ? r0.offsetWidth : 0 };
        var mo = el._smMorph;
        el._smBox = b;
        if (mo) { el._smMorph = null; mo(b); }
      });
      try { el._smRO.observe(el); } catch (e) { }
    }
    // a morph still running from a quick earlier replace ends now
    Array.prototype.slice.call(el.querySelectorAll(':scope > .toast-old, :scope > .toast-bg')).forEach(function (x) { if (x.parentNode) x.parentNode.removeChild(x); });
    el.classList.remove('is-morph');
    el._smMorph = null;
    if (morph) {
      oldRow = el.querySelector(':scope > .toast-row');
      if (oldRow && !(box && box.row === oldRow)) {
        // no clean size for this row yet (no ResizeObserver, or it has not reported): read it
        box = { w: el.offsetWidth, h: el.offsetHeight, row: oldRow, oT: oldRow.offsetTop, oL: oldRow.offsetLeft, oW: oldRow.offsetWidth };
      }
      if (oldRow) {
        oldRow.className = 'toast-row toast-old';
        oldRow.setAttribute('aria-hidden', 'true');
        try { oldRow.inert = true; } catch (e) { }
        oldRow.style.cssText = 'position:absolute;top:' + box.oT + 'px;left:' + box.oL + 'px;width:' + box.oW + 'px;margin:0;pointer-events:none;';
      }
    }
    // empty first, then fill: the live region announces the new message even if the text repeats
    Array.prototype.slice.call(el.childNodes).forEach(function (x) { if (x !== oldRow) el.removeChild(x); });
    var row = document.createElement('span');
    row.className = 'toast-row';
    var m = document.createElement('span');
    m.className = 'toast-msg';
    m.textContent = msg;
    row.appendChild(m);
    if (action) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast-act';
      b.textContent = action.label || SM.t('core.undo');
      b.addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        // the action usually answers with its own toast (元に戻しました), which cross-fades in place;
        // hide only when it did not. Focus goes back to where it was when the toast appeared.
        var seq = toastSeq, ret = el._smReturn;
        try { action.fn(); } catch (e) { console.error(e); }
        if (seq === toastSeq) toastHide(el);
        var ae = document.activeElement;
        if (ret && ret.isConnected && (!ae || ae === document.body || el.contains(ae) || !ae.isConnected) && ret.offsetParent !== null) {
          try { ret.focus({ preventScroll: true }); } catch (e) { }
        }
      });
      row.appendChild(b);
    }
    el.appendChild(row);
    el.classList.toggle('has-action', !!action);
    toastLife = null;
    if (action) {
      var life = document.createElement('i');
      life.className = 'toast-life';
      life.setAttribute('aria-hidden', 'true');
      el.appendChild(life);
      toastLife = mAnimate(life, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: ms, easing: 'linear', fill: 'forwards' });
    }
    el.classList.add('is-show');
    if (oldRow) {
      var bg = document.createElement('i');
      bg.className = 'toast-bg';
      bg.setAttribute('aria-hidden', 'true');
      el.insertBefore(bg, el.firstChild);
      el.classList.add('is-morph');
      var wOld = box.w || 1, hOld = box.h || 1, oL = box.oL, oT = box.oT, keepRow = oldRow;
      var resize = function (nb) {
        var wNew = nb.w || 1, hNew = nb.h || 1;
        // the pill re-centres on its new width and grows UP from its foot (bottom-anchored; the ink layer scales
        // from 50% 100%): the old text keeps its place on screen, inside the old ink, while it fades
        if (keepRow.isConnected) { keepRow.style.left = (oL + (wNew - wOld) / 2) + 'px'; keepRow.style.top = (oT + (hNew - hOld)) + 'px'; }
        var sx = wOld / wNew, sy = hOld / hNew;
        if (bg.isConnected && (Math.abs(1 - sx) > 0.005 || Math.abs(1 - sy) > 0.005)) {
          mAnimate(bg, [{ transform: 'scale(' + sx + ', ' + sy + ')' }, { transform: 'none' }], { duration: 160, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
        }
      };
      // same size: the observer stays quiet and nothing needs to move
      if (el._smRO) el._smMorph = resize; else resize({ w: el.offsetWidth, h: el.offsetHeight });
      var oa = mAnimate(oldRow, [{ opacity: 1 }, { opacity: 0 }], { duration: 80, easing: 'linear', fill: 'forwards' });
      mAnimate(row, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay: 50, easing: 'cubic-bezier(0, 0, 0.2, 1)', fill: 'backwards' });
      var seq0 = toastSeq, gone = oldRow;
      var endMorph = function () {
        if (gone.parentNode) gone.parentNode.removeChild(gone);
        if (seq0 !== toastSeq) return;
        if (bg.parentNode) bg.parentNode.removeChild(bg);
        el.classList.remove('is-morph');
      };
      if (oa && oa.finished) oa.finished.then(function () { setTimeout(endMorph, 90); }, endMorph); else endMorph();
    } else if (showing) mAnimate(row, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'linear' });
    else {
      var cur = el._smA && el._smA.toast;
      if (cur) { try { cur.cancel(); } catch (e) { } }
      el.style.translate = ''; el.style.opacity = '';
      mAnimate(el, [{ opacity: 0, translate: '0 32px' }, { opacity: 1, translate: '0 0' }], { spring: 'rise', key: 'toast' });
    }
    toastArm(el, ms);
    toastAt = Date.now();
  };
  /* F10: a toast belongs to the moment it was raised. A sheet opening, or a move to another screen, puts it
     away (a toast raised in the same breath — erase → home, save → flight — is kept: under 700ms old). */
  var toastAt = 0;
  SM.hideToast = function (o) {
    var el = document.getElementById('toast');
    if (!el) return;
    if (o && o.ifOlder && Date.now() - toastAt < o.ifOlder) return;
    toastSeq++;                       // a toast still waiting for a save flight to land is dropped too
    if (el.classList.contains('is-show') && !toastHiding) toastHide(el);
  };
  /** SM.announce(text): say something to screen readers without showing a toast. */
  SM.announce = function (text) {
    var r = document.getElementById('sm-live');
    if (!r) {
      r = document.createElement('div');
      r.id = 'sm-live'; r.className = 'sr-only';
      r.setAttribute('role', 'status'); r.setAttribute('aria-live', 'polite');
      document.body.appendChild(r);
    }
    r.textContent = '';
    setTimeout(function () { r.textContent = text; }, 30);
  };

  /* ------------------------------------------------------------------ copy */
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
    document.body.appendChild(ta);
    var active = document.activeElement;
    ta.select();
    try { ta.setSelectionRange(0, text.length); } catch (e) { }
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (active && active.focus) try { active.focus({ preventScroll: true }); } catch (e) { }
    return ok;
  }
  SM.copy = function (text, msg) {
    text = String(text === undefined || text === null ? '' : text);
    var done = function (ok) { SM.toast(ok ? (msg || SM.t('core.copied')) : SM.t('core.copyFail')); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(legacyCopy(text)); });
        return;
      }
    } catch (e) { }
    done(legacyCopy(text));
  };

  /* ------------------------------------------------------------------ furigana */
  var rubyRe = null, rubyKey = '';
  var SKIP_TAGS = { RUBY: 1, RT: 1, RP: 1, SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1, SVG: 1, NOSCRIPT: 1, TEMPLATE: 1 };
  // 1st/2nd-grade kanji: words made only of these (今日, 見る, 時間…) get no reading
  var EASY_KANJI = '一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六' +
    '引羽雲園遠何科夏家歌画回会海絵外角楽活間丸岩顔汽記帰弓牛魚京強教近兄形計元言原戸古午後語工公広交光考行高黄合谷国黒今才細作算止市矢姉思紙寺自時室社弱首秋週春書少場色食心新親図数西声星晴切雪船線前組走多太体台地池知茶昼長鳥朝直通弟店点電刀冬当東答頭同道読内南肉馬売買麦半番父風分聞米歩母方北毎妹万明鳴毛門夜野友用曜来里理話';
  function isEasyWord(k) {
    var kan = k.match(/[㐀-鿿々]/g);
    if (!kan) return true;
    return kan.every(function (c) { return c === '々' || EASY_KANJI.indexOf(c) !== -1; });
  }
  // put the reading over the kanji only: 使える → <ruby>使<rt>つか</rt></ruby>える
  function hira(c) { return c.replace(/[ァ-ヶ]/g, function (x) { return String.fromCharCode(x.charCodeAt(0) - 0x60); }); }
  var alignCache = {};
  function alignRuby(word, reading) {
    var key = word + '|' + reading;
    if (alignCache[key]) return alignCache[key];
    var parts = word.match(/[㐀-鿿々ヶ]+|[^㐀-鿿々ヶ]+/g) || [word];
    var re = '^' + parts.map(function (pt) {
      return /[㐀-鿿々ヶ]/.test(pt) ? '(.+?)' : hira(pt).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('') + '$';
    var m = null;
    try { m = new RegExp(re).exec(reading); } catch (e) { m = null; }
    var out;
    if (!m) out = [{ t: word, r: reading }];
    else {
      var gi = 1;
      out = parts.map(function (pt) { return /[㐀-鿿々ヶ]/.test(pt) ? { t: pt, r: m[gi++] } : { t: pt }; });
    }
    alignCache[key] = out;
    return out;
  }
  function buildRubyRe() {
    var dict = D.ruby || {};
    var keys = Object.keys(dict).filter(function (k) { return k && dict[k] && !isEasyWord(k); });
    var sig = keys.length + ':' + keys.slice(0, 3).join(',');
    if (sig === rubyKey) return rubyRe;
    rubyKey = sig;
    if (!keys.length) { rubyRe = null; return null; }
    keys.sort(function (a, b) { return b.length - a.length; });
    rubyRe = new RegExp(keys.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'g');
    return rubyRe;
  }
  function skipNode(el, root) {
    while (el && el !== root) {
      var tag = el.nodeName.toUpperCase();
      if (SKIP_TAGS[tag]) return true;
      if (tag === 'A') { var h = el.getAttribute('href') || ''; if (/^tel:/i.test(h)) return true; }
      if (el.hasAttribute && (el.hasAttribute('data-noruby') || el.isContentEditable)) return true;
      // readings inside screen-reader-only text are heard twice (「貸付かしつけ」), and svg text cannot hold <ruby> (S14)
      if (tag === 'SVG' || el.namespaceURI === 'http://www.w3.org/2000/svg') return true;
      if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return true;
      var cl = el.classList;
      if (cl && (cl.contains('sr-only') || cl.contains('visually-hidden'))) return true;
      el = el.parentNode;
    }
    return false;
  }
  SM.applyRuby = function (root) {
    if (!root || !SM.state.settings.ruby || SM.lang() !== 'ja') return;
    var re = buildRubyRe();
    if (!re) return;
    var dict = D.ruby;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !/[㐀-鿿]/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        return skipNode(n.parentNode, root) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var text = node.nodeValue, last = 0, m, frag = null;
      re.lastIndex = 0;
      while ((m = re.exec(text))) {
        if (!frag) frag = document.createDocumentFragment();
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        alignRuby(m[0], dict[m[0]]).forEach(function (seg) {
          if (!seg.r) { frag.appendChild(document.createTextNode(seg.t)); return; }
          var r = document.createElement('ruby');
          r.appendChild(document.createTextNode(seg.t));
          var rp1 = document.createElement('rp'); rp1.textContent = '(';
          var rt = document.createElement('rt'); rt.textContent = seg.r;
          var rp2 = document.createElement('rp'); rp2.textContent = ')';
          r.appendChild(rp1); r.appendChild(rt); r.appendChild(rp2);
          frag.appendChild(r);
        });
        last = m.index + m[0].length;
      }
      if (!frag) return;
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
    fitRubyLater(root); // also after views' partial updates (they call applyRuby on the new part)
  };

  /* A long compound with one reading (社会的養護自立支援拠点事業) is a single <ruby> and cannot wrap. When one is
     wider than its line, base.css shows it as base + （reading） in small type (ruby.is-long) so the line can wrap.
     Runs a frame after applyRuby, for every view and sheet (views may also call it after partial updates). */
  SM.fitRuby = function (root) {
    if (!root || !document.body.classList.contains('is-ruby')) return;
    // one read pass, then one write pass: a class write between reads would force a layout per ruby (S14).
    // A ruby of three characters or fewer (base + reading) cannot outgrow a line, so it is not measured.
    var list = root.querySelectorAll('ruby:not(.is-long)'), boxW = new Map(), long = [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if ((r.textContent || '').length < 7) continue;
      var box = r.parentElement;
      while (box && box !== root && /^inline/.test(getComputedStyle(box).display)) box = box.parentElement;
      if (!box) continue;
      var w = boxW.get(box);
      if (w === undefined) { w = box.clientWidth; boxW.set(box, w); }
      if (w && r.getBoundingClientRect().width > w + 1) long.push(r);
    }
    long.forEach(function (r) { r.classList.add('is-long'); });
  };
  function fitRubyLater(root) {
    if (!root || !SM.state.settings.ruby || SM.lang() !== 'ja') return;
    var run = function () { try { SM.fitRuby(root); } catch (e) { } };
    if (window.requestAnimationFrame) requestAnimationFrame(run); else run();
  }
  SM._fitRubyLater = fitRubyLater;

  /* ------------------------------------------------------------------ body classes */
  SM.applySettings = function () {
    var s = SM.state.settings, b = document.body, de = document.documentElement;
    if (!b) return;
    b.classList.toggle('is-big', !!s.big);
    b.classList.toggle('is-ruby', !!s.ruby);
    b.classList.toggle('lang-en', s.lang === 'en');
    b.classList.toggle('supporter', !!s.supporter);
    de.setAttribute('lang', s.lang === 'en' ? 'en' : 'ja');
    de.setAttribute('data-theme', s.dark ? 'dark' : 'light');
    // reduced motion is one switch (MOTION-SPEC §7): OS setting OR 設定 › 動きを少なく → html.m-reduce
    if (SM.motion && SM.motion.syncReduce) SM.motion.syncReduce();
    else {
      var osr = false;
      try { osr = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { }
      de.classList.toggle('m-reduce', s.motion === 'reduce' || osr);
    }
    SM.syncJunior();
  };

  /* ------------------------------------------------------------------ events */
  SM.on = function (name, fn) { SM.acts[name] = fn; };

  function isFormControl(el) {
    var t = el.nodeName;
    return t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA';
  }
  function changeKind(el) {
    if (el.nodeName === 'SELECT') return 'change';
    if (el.nodeName === 'INPUT') {
      var ty = (el.type || '').toLowerCase();
      if (ty === 'checkbox' || ty === 'radio' || ty === 'file') return 'change';
    }
    return 'input';
  }
  function runAct(el, ev) {
    var name = el.getAttribute('data-act');
    var fn = SM.acts[name];
    if (!fn) { console.warn('[SM] no act registered:', name); return; }
    try { fn(el, ev); } catch (e) { console.error('[SM] act "' + name + '" failed', e); }
  }
  /* S11: a tab tap is always a tab move: the indicator slides, the page cross-fades and starts at the top,
     whatever the history looks like. Tapping the tab you are on scrolls back to its top (and from a page under
     it, e.g. a category under さがす, goes to the tab's first screen). */
  function tabTap(a) {
    var href = a.getAttribute('href') || '#/';
    var here = current.hash || '#/';
    if (href === here || (isHomeHash(href) && isHomeHash(here))) {
      var reduce = reducedMotion();
      try { window.scrollTo({ top: 0, left: 0, behavior: reduce ? 'instant' : 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
      var h1 = document.querySelector('#view h1');
      if (h1) { if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1'); try { h1.focus({ preventScroll: true }); } catch (e) { } }
      var ic0 = a.querySelector('.icon');
      if (ic0 && SM.motion && SM.motion.nudge && !reduce) { try { SM.motion.nudge(ic0); } catch (e) { } }
      return;
    }
    SM.go(href, { transition: 'tab' });
  }
  SM._tabTap = tabTap;
  SM._bindEvents = function () {
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (ev.defaultPrevented || !t || !t.closest) return;
      // modified clicks (new tab etc.) on real links behave normally
      if ((ev.button > 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) && t.closest('a[href]')) return;
      // skip link: focus main instead of changing the hash
      var skip = t.closest('a.skip');
      if (skip) {
        ev.preventDefault();
        var v = document.getElementById('view');
        if (v) { v.setAttribute('tabindex', '-1'); v.focus(); }
        return;
      }
      // offline: an official page can't open — say so instead of opening a blank tab
      var ext = t.closest('a[href^="http"]');
      if (ext && navigator.onLine === false) {
        ev.preventDefault();
        SM.toast(SM.t('core.offline'), 4000);
        return;
      }
      var el = t.closest('[data-act]');
      if (!el) {
        // in-app route links: replace the history entry instead of pushing one,
        // so quick exit leaves no trail of visited screens (Back can't reveal them)
        var link = t.closest('a[href^="#/"], a[href="#"]');
        if (link && !link.hasAttribute('download') && !link.target) {
          ev.preventDefault();
          var tabA = link.closest('.tabbar') ? link : null;
          if (tabA) tabTap(tabA);
          else SM.go(link.getAttribute('href'));
        }
        return;
      }
      if (isFormControl(el)) return; // handled on change/input
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') { ev.preventDefault(); return; }
      var name = el.getAttribute('data-act');
      if (el.nodeName === 'A') {
        var href = el.getAttribute('href') || '';
        if (name === 'go' || href === '#' || href === '') ev.preventDefault();
      } else if (el.nodeName === 'BUTTON' && el.form && el.type === 'submit') {
        ev.preventDefault();
      }
      runAct(el, ev);
      // a non-go act on a route link: still navigate without adding a history entry
      if (el.nodeName === 'A' && name !== 'go' && !ev.defaultPrevented) {
        var h2 = el.getAttribute('href') || '';
        if (h2.indexOf('#/') === 0) { ev.preventDefault(); SM.go(h2); }
      }
    });
    function onField(ev) {
      var el = ev.target;
      if (!el || !isFormControl(el) || !el.hasAttribute('data-act')) return;
      if (changeKind(el) !== ev.type) return;
      runAct(el, ev);
    }
    document.addEventListener('change', onField);
    document.addEventListener('input', onField);
    // forms with data-act submit through the act instead of reloading
    document.addEventListener('submit', function (ev) {
      var f = ev.target;
      if (f && f.hasAttribute && f.hasAttribute('data-act')) { ev.preventDefault(); runAct(f, ev); }
      else if (f && f.closest && f.closest('#view, #sheet-root')) ev.preventDefault();
    });
  };

  /* ------------------------------------------------------------------ sheet */
  var sheetState = null; // { opener, onClose, dlg, overlay, ctl, title, pushed }
  var sheetPopping = false; // closeSheet stepped back off the sheet's own guard: its popstate is not a Back
  var FOCUSABLE = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), summary';

  function focusables(root) {
    return Array.prototype.filter.call(root.querySelectorAll(FOCUSABLE), function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
  }
  SM.sheetOpen = function () { return !!sheetState; };

  var CHROME_SEL = ['.appbar', '.subbar', '#view', '.tabbar', '.skip'];
  function setPageHidden(on) {
    CHROME_SEL.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      if (on) el.setAttribute('aria-hidden', 'true'); else el.removeAttribute('aria-hidden');
      try { el.inert = !!on; } catch (e) { }
    });
  }
  function headHtml(title, opts) {
    var isSos = /(^|\s)sheet-sos(\s|$)/.test(opts.cls || '') || opts.tone === 'sos';
    return (title ? '<h2 class="sheet-title" id="sheet-title">' + (opts.titleHtml ? title : SM.esc(title)) + '</h2>' : '<span class="sheet-title"></span>') +
      // a sheet covers the appbar on phones: quick exit must stay one tap away (same act as the header button)
      '<button type="button" class="pill pill-exit sheet-exit" data-act="exit" title="' + SM.esc(SM.t('core.exitHint')) + '">' + SM.esc(SM.t('core.exit')) + '</button>' +
      // …and so must 緊急: the SOS sheet takes this sheet's place (SM.sheet cross-fades a different sheet in)
      (isSos ? '' : '<button type="button" class="pill pill-sos sheet-sos-btn" data-act="sos" aria-label="' + SM.esc(SM.t('shell.sosLabel')) + '">' + icon('phone') + '<span>' + SM.esc(SM.t('shell.sos')) + '</span></button>') +
      '<button type="button" class="icon-btn sheet-close" data-act="sheet-close" aria-label="' + SM.esc(SM.t('core.close')) + '">' + icon('close') + '</button>';
  }
  function labelDialog(dlg, title, label) {
    if (title) { dlg.setAttribute('aria-labelledby', 'sheet-title'); dlg.removeAttribute('aria-label'); }
    else { dlg.removeAttribute('aria-labelledby'); dlg.setAttribute('aria-label', label); }
  }

  /* SM.sheet(html, {title, titleHtml, label, tone, cls, focus, mount, onClose}) -> dialog element
     Opens on the smooth spring (SOS: faster, contents opaque from frame 1) with drag-to-dismiss
     (SM.motion.sheet). When a sheet is already open, the sheet stays: a different sheet cross-fades
     its body and FLIPs its height; the same sheet re-rendering (e.g. a settings toggle) swaps in place. */
  SM.sheet = function (html, opts) {
    opts = opts || {};
    var root = document.getElementById('sheet-root');
    if (!root) return null;
    var st = sheetState && sheetState.dlg && sheetState.dlg.isConnected ? sheetState : null;
    var title = opts.title || '';
    var label = opts.label || title || '';
    var cls = 'sheet' + (opts.tone ? ' sheet-' + opts.tone : '') + (opts.cls ? ' ' + opts.cls : '');
    var sos = /(^|\s)sheet-sos(\s|$)/.test(cls) || opts.tone === 'sos';
    var dlg, body;
    if (st) {
      dlg = st.dlg;
      var same = st.title === title;
      var oldBody = dlg.querySelector('.sheet-body');
      var fromTop = NaN, oldTop = 0, ghostRect = null;
      if (!same && SM.motion && !SM.motion.reduced()) {
        fromTop = dlg.getBoundingClientRect().top;
        if (oldBody) { oldTop = oldBody.offsetTop; ghostRect = { w: oldBody.offsetWidth, h: oldBody.offsetHeight }; }
      }
      dlg.className = cls + ' m-sheet';
      labelDialog(dlg, title, label);
      var head = dlg.querySelector('.sheet-head');
      if (head) head.innerHTML = headHtml(title, opts);
      body = document.createElement('div');
      body.className = 'sheet-body';
      body.innerHTML = html;
      if (oldBody) {
        oldBody.parentNode.insertBefore(body, oldBody);
        if (ghostRect) {
          // the old body fades out where it was (90ms) while the new one fades in (160ms from 60ms)
          oldBody.setAttribute('aria-hidden', 'true');
          try { oldBody.inert = true; } catch (e) { }
          oldBody.style.cssText += ';position:absolute;left:0;right:0;top:' + oldTop + 'px;height:' + ghostRect.h + 'px;overflow:hidden;pointer-events:none;';
          var out = mAnimate(oldBody, [{ opacity: 1 }, { opacity: 0 }], { duration: 90, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)', fill: 'forwards' });
          var rm = function () { if (oldBody.parentNode) oldBody.parentNode.removeChild(oldBody); };
          if (out) out.finished.then(rm, rm); else rm();
          mAnimate(body, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: 60, easing: 'cubic-bezier(0, 0, 0.2, 1)', fill: 'backwards' });
        } else oldBody.parentNode.removeChild(oldBody);
      } else dlg.appendChild(body);
      st.title = title;
      st.onClose = opts.onClose || null;
      if (st.ctl && st.ctl.resize && isFinite(fromTop)) st.ctl.resize(fromTop);
    } else {
      var opener = document.activeElement;
      var ov = document.createElement('div');
      ov.className = 'sheet-overlay';
      ov.setAttribute('data-act', 'sheet-close');
      ov.setAttribute('aria-hidden', 'true');
      dlg = document.createElement('div');
      dlg.className = cls;
      dlg.setAttribute('role', 'dialog');
      dlg.setAttribute('aria-modal', 'true');
      dlg.setAttribute('tabindex', '-1');
      labelDialog(dlg, title, label);
      dlg.innerHTML = '<div class="sheet-handle" aria-hidden="true"></div><div class="sheet-head">' + headHtml(title, opts) + '</div>' +
        '<div class="sheet-body">' + html + '</div>';
      body = dlg.querySelector('.sheet-body');
      // a sheet that is still closing gives up its ids at once (the new one owns #sheet-title)
      Array.prototype.forEach.call(root.querySelectorAll('#sheet-title'), function (n) { n.removeAttribute('id'); });
      root.appendChild(ov);
      root.appendChild(dlg);
      var ctl = null;
      if (SM.motion && typeof SM.motion.sheet === 'function') {
        try {
          ctl = SM.motion.sheet(dlg, ov, { fast: sos, onDismiss: function (v) { if (sheetState && sheetState.dlg === dlg) SM.closeSheet({ velocity: v }); } });
        } catch (e) { console.error(e); ctl = null; }
      }
      sheetState = { opener: opener, onClose: opts.onClose || null, dlg: dlg, overlay: ov, ctl: ctl, title: title, pushed: false };
      // S3: on home there is no guard entry above the page's own, so Android's Back would leave the app with
      // 緊急 or 設定 open. A sheet opened there pushes one (marked smSheet); closing it from the UI steps back off it.
      if (!hasGuard() && !(window.__lx && window.__lx.leaving)) {
        markBase();
        try { history.pushState({ smGuard: 1, smSheet: 1 }, '', location.hash || '#/'); sheetState.pushed = true; } catch (e) { }
      }
      SM.hideToast({ ifOlder: 250 });
      document.body.classList.add('sheet-open', 'has-sheet');
      setPageHidden(true);
      if (ctl) ctl.open();
    }
    SM.applyRuby(body);
    if (typeof opts.mount === 'function') { try { opts.mount(dlg); } catch (e) { console.error(e); } }
    motionMount(dlg, { instant: true });
    // the dialog takes focus at once, not after the animation
    var first = opts.focus ? dlg.querySelector(opts.focus) : null;
    try { (first || dlg).focus({ preventScroll: true }); } catch (e) { dlg.focus(); }
    return dlg;
  };

  /* SM.closeSheet({noFocus, instant, velocity}) — focus returns to the opener when the close STARTS;
     the DOM goes when the close animation has finished (never on a timer). */
  SM.closeSheet = function (opts) {
    opts = opts || {};
    if (!sheetState) return;
    var st = sheetState;
    sheetState = null;
    // a guard this sheet pushed (home, S3) goes again, so the next Back still leaves the app as before
    if (st.pushed && !opts.noHistory) {
      var hs = null; try { hs = history.state; } catch (e) { }
      if (hs && hs.smSheet) { sheetPopping = true; try { history.back(); } catch (e) { sheetPopping = false; } }
    }
    document.body.classList.remove('sheet-open', 'has-sheet');
    setPageHidden(false);
    var dlg = st.dlg, ov = st.overlay, ctl = st.ctl;
    var root = document.getElementById('sheet-root');
    if (dlg) {
      var tn = dlg.querySelector('#sheet-title');
      if (tn) tn.removeAttribute('id');
      dlg.setAttribute('aria-hidden', 'true');
      dlg.classList.add('is-closing-m');
      try { dlg.inert = true; } catch (e) { }
    }
    if (ov) { ov.removeAttribute('data-act'); ov.classList.add('is-closing-m'); }
    var removed = false;
    var remove = function () {
      if (removed) return;
      removed = true;
      [ov, dlg].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
      if (ctl && ctl.destroy) ctl.destroy();
    };
    if (opts.instant || !ctl || !dlg) {
      remove();
      if (!dlg && root && !sheetState) root.innerHTML = '';
    } else {
      var p = ctl.close(opts.velocity);
      if (p && p.then) p.then(remove, remove); else remove();
      setTimeout(remove, 900);   // safety net only: the animation normally removes it far sooner
    }
    if (st.onClose) try { st.onClose(); } catch (e) { console.error(e); }
    if (!opts.noFocus && st.opener && document.contains(st.opener) && st.opener.focus) {
      try { st.opener.focus({ preventScroll: true }); } catch (e) { }
    }
  };

  function trapTab(ev) {
    if (!sheetState || ev.key !== 'Tab') return;
    var dlg = sheetState.dlg || document.querySelector('#sheet-root [role="dialog"]:not([aria-hidden])');
    if (!dlg) return;
    var f = focusables(dlg);
    if (!f.length) { ev.preventDefault(); dlg.focus(); return; }
    var first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (ev.shiftKey && (a === first || a === dlg || !dlg.contains(a))) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && (a === last || !dlg.contains(a))) { ev.preventDefault(); first.focus(); }
  }
  SM._trapTab = trapTab;

  /* ------------------------------------------------------------------ motion hooks */
  function motionMount(el, opts) {
    if (!el || !SM.motion || typeof SM.motion.mount !== 'function') return;
    try { SM.motion.mount(el, opts); } catch (e) { console.error('[SM] motion.mount failed', e); }
  }
  SM._motionMount = motionMount;
  function reducedMotion() {
    if (SM.motion && SM.motion.reduced) { try { return SM.motion.reduced(); } catch (e) { } }
    try {
      return SM.state.settings.motion === 'reduce' || document.documentElement.classList.contains('m-reduce') ||
        !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ router */
  /* SM.route: { name, key, args, query, hash, kind, instant, restoreY }
       kind    'none' (first render / in place) | 'forward' | 'back' | 'tab'
       instant true when returning to a view already seen this session (back, or a tab root revisited):
               mount without entrances — no reveals, no count-ups, odometers at their final value (§3.8)
       restoreY the scroll position back navigation will restore (views that defer below-the-fold
               content render everything in render() when restoreY > window.innerHeight) */
  var current = { name: null, key: null, args: [], query: {}, hash: '', kind: 'none', instant: false, restoreY: 0 };
  var lastTab = 'home';
  var navStack = [];         // visited hashes (in-app history)
  var scrollMem = {};        // hash -> scrollY
  var customTitle = null;
  SM.route = current;

  var CLASS_ALIAS = { p: 'program' };

  function parseHash(h) {
    h = h || '';
    if (h.charAt(0) === '#') h = h.slice(1);
    var q = {}, qi = h.indexOf('?');
    if (qi !== -1) {
      h.slice(qi + 1).split('&').forEach(function (kv) {
        if (!kv) return;
        var p = kv.split('=');
        try { q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); } catch (e) { }
      });
      h = h.slice(0, qi);
    }
    var parts = h.replace(/^\/+/, '').split('/').filter(function (s) { return s !== ''; }).map(function (s) {
      try { return decodeURIComponent(s); } catch (e) { return s; }
    });
    var name = parts.shift() || 'home';
    return { name: name, args: parts, query: q };
  }
  function findView(name) {
    if (SM.views[name]) return { key: name, view: SM.views[name] };
    if (name === 'p' && SM.views.program) return { key: 'program', view: SM.views.program };
    if (name === 'program' && SM.views.p) return { key: 'p', view: SM.views.p };
    return null;
  }
  function viewTitle(view, args) {
    var t = view && view.title;
    try { if (typeof t === 'function') t = t(args, current.query); } catch (e) { t = null; }
    return t ? SM.L(t) : '';
  }
  function viewBack(view, args) {
    var b = view && view.back;
    try { if (typeof b === 'function') b = b(args, current.query); } catch (e) { b = null; }
    return b || null;
  }

  /** Optional for views: set the subbar/document title after render (e.g. program name). */
  SM.setTitle = function (text) {
    customTitle = text ? SM.L(text) : null;
    paintChrome();
  };

  function errorCard(err) {
    var btns;
    if (SM.ui && SM.ui.button) {
      try {
        btns = SM.ui.button(SM.t('core.retry'), { act: 'retry', variant: 'primary', block: true }) +
               SM.ui.button(SM.t('core.home'), { href: '#/', variant: 'secondary', block: true });
      } catch (e) { btns = null; }
    }
    if (!btns) {
      btns = '<button type="button" class="btn btn-primary btn-block" data-act="retry">' + SM.esc(SM.t('core.retry')) + '</button>' +
             '<a class="btn btn-secondary btn-block" href="#/">' + SM.esc(SM.t('core.home')) + '</a>';
    }
    var art = '';
    try { if (SM.illus && SM.illus.has && SM.illus.has('error')) art = SM.illus('error', { size: 'spot' }) || ''; } catch (e) { art = ''; }
    return '<section class="sm-error" role="alert">' + art +
      '<h1 class="sm-error-title" tabindex="-1">' + SM.esc(SM.t('core.errTitle')) + '</h1>' +
      '<p class="sm-error-body">' + SM.esc(SM.t('core.errBody')) + '</p>' +
      '<div class="sm-error-actions">' + btns + '</div>' +
      '</section>';
  }
  SM.on('retry', function () {
    // a view whose files failed to load: try the load again; otherwise render the view again
    var r = parseHash(location.hash);
    if (!findView(r.name) && lazyFiles(r.name)) { SM._route(); return; }
    SM.render();
  });

  /* ------------------------------------------------------------------ lazy views
     index.html loads what the home screen needs. Every other view (and its data) is fetched on first use and,
     after the opening, in idle time (SM.preloadViews, started by boot), so later taps never wait.
     The route -> files table lives in index.html's head gate (window.__smLazy), which also preloads the files of
     a deep link while the page's own scripts download. SM.need(files) -> Promise: adds the scripts in order
     (async=false keeps execution order), once each; a failed file can be tried again. */
  SM.lazy = window.__smLazy || {};
  function lazyFiles(name) { var f = SM.lazy[name]; return f && f.length ? f : null; }
  var needP = {};
  function hasStatic(src) {
    var list = document.scripts;
    for (var i = 0; i < list.length; i++) if (list[i].getAttribute('src') === src && !list[i]._smLazy) return true;
    return false;
  }
  /* S1: every lazy file carries the build id (?v=, set by index.html as window.__smV), so a returning phone with
     last week's files in its cache fetches this build's instead of mixing old and new. file:// ignores the query. */
  function vsrc(src) { var v = window.__smV; return v && src.indexOf('?') === -1 ? src + '?v=' + encodeURIComponent(v) : src; }
  SM._vsrc = vsrc;
  function loadScript(src) {
    if (needP[src]) return needP[src];
    if (hasStatic(src) || hasStatic(vsrc(src))) return (needP[src] = Promise.resolve());
    needP[src] = new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el._smLazy = true;
      el.src = vsrc(src); el.async = false;
      el.onload = function () { resolve(); };
      el.onerror = function () {
        delete needP[src];
        if (el.parentNode) el.parentNode.removeChild(el);
        reject(new Error('[SM] could not load ' + src));
      };
      document.body.appendChild(el);
    });
    return needP[src];
  }
  SM.need = function (files) {
    return Promise.all((files || []).map(loadScript));
  };
  /** SM.needView(name) -> Promise: the files of a route name ('find', 'p', 'map' …); resolves at once when loaded. */
  SM.needView = function (name) {
    if (findView(name)) return Promise.resolve();
    var f = lazyFiles(name);
    return f ? SM.need(f) : Promise.resolve();
  };
  /* A thin bar under the app bar while a view is being fetched (shown only after 150ms, so a fast load never
     flashes it); #view says aria-busy. */
  var lazyBusy = 0;
  function lazyLoading(on) {
    lazyBusy = Math.max(0, lazyBusy + (on ? 1 : -1));
    var de = document.documentElement, v = document.getElementById('view');
    de.classList.toggle('sm-loading', lazyBusy > 0);
    if (v) { if (lazyBusy > 0) v.setAttribute('aria-busy', 'true'); else v.removeAttribute('aria-busy'); }
  }
  function lazyFailed() {
    if (SM.sheetOpen()) SM.closeSheet({ noFocus: true, instant: true });
    var mainEl = document.getElementById('view');
    if (!mainEl) return;
    mainEl.className = 'view is-error';
    mainEl.innerHTML = errorCard();
    var h = mainEl.querySelector('h1');
    if (h) { try { h.focus({ preventScroll: true }); } catch (e) { } }
  }
  /* A tab whose view is still loading answers the tap at once (slow network): the indicator slides to it and
     the tab shows a boarding state (its mark fills, base.css .is-boarding) until the files have run. */
  function boardTab(name) {
    var key = name === 'home' ? 'home' : name;
    var nav = document.querySelector('.tabbar');
    if (!nav || pendingKind !== 'tab') return null;
    var tabs = nav.querySelectorAll('.tab'), a = null, idx = -1;
    for (var i = 0; i < tabs.length; i++) if (tabs[i].getAttribute('data-tab') === key) { a = tabs[i]; idx = i; }
    if (!a) return null;
    Array.prototype.forEach.call(tabs, function (x) { x.classList.toggle('is-active', x === a); });
    a.classList.add('is-boarding');
    placeTabIndicator(idx);
    return a;
  }
  function unboard(a) { if (a) a.classList.remove('is-boarding'); }
  /* A view that reads another view's helpers on its first screen waits for them: home's やること preview counts
     down to 高校入学 for 中学生 (SM.plan.anchor in plan.js). Tried once per name, so a broken file can't loop. */
  var depsTried = {};
  function viewDeps(name) {
    if (depsTried[name]) return null;
    var st = SM.state || {};
    if (name === 'home' && !SM.plan && SM.isJunior() && ((st.saved || []).length || st.hsDate)) return lazyFiles('plan');
    return null;
  }
  /* S6: after start, the files of the views people open next are fetched WITHOUT running (<link rel=prefetch>),
     so the home entrance never stutters under a 100ms script task. A view's files run on intent: a finger or
     the pointer coming down on (or hovering, or focusing) a link to it, a few hundred ms before the route needs
     them. さがす and 制度ページ also run in idle time once the page is quiet (a long idle slot, no transition).
     On data saver or a 2g/3g connection nothing is fetched ahead. */
  var preloaded = false, prefetched = {};
  function prefetch(name) {
    (lazyFiles(name) || []).forEach(function (src) {
      if (prefetched[src] || needP[src] || hasStatic(src)) return;
      prefetched[src] = true;
      try {
        var l = document.createElement('link');
        l.rel = 'prefetch'; l.as = 'script'; l.href = vsrc(src);
        document.head.appendChild(l);
      } catch (e) { }
    });
  }
  SM.preloadViews = function () {
    if (preloaded) return;
    preloaded = true;
    var c = navigator.connection, lean = !!(c && (c.saveData || /2g|3g/.test(c.effectiveType || '')));
    if (lean) return;
    var later = ['plan', 'ask', 'learn', 'map', 'tools', 'about'];   // SEARCH (v6): + ask
    var run = ['find', 'p'];
    ['find', 'p'].concat(later).forEach(prefetch);
    var ric = window.requestIdleCallback;
    (function next() {
      var name = run[0];
      if (!name) return;
      var slot = function (dl) {
        var busy = SM.motion && SM.motion.inTransition && SM.motion.inTransition();
        if (busy || (dl && !dl.didTimeout && dl.timeRemaining() < 40)) { setTimeout(next, 400); return; }
        run.shift();
        SM.needView(name).then(next, next);
      };
      if (ric) ric(slot, { timeout: 6000 }); else setTimeout(slot, 1200);
    })();
  };
  // intent: run a view's files when a link to it is about to be used
  function onIntent(ev) {
    var t = ev.target, a = t && t.closest ? t.closest('a[href^="#/"]') : null;
    if (!a) return;
    var name = parseHash(a.getAttribute('href')).name;
    if (!findView(name) && lazyFiles(name)) SM.needView(name).catch(function () { });
  }
  ['pointerdown', 'focusin', 'mouseover'].forEach(function (type) {
    document.addEventListener(type, onIntent, { passive: true, capture: true });
  });

  function paintChrome() {
    var found = findView(current.name);
    var view = found && found.view;
    var title = customTitle || viewTitle(view, current.args);
    // subbar
    var sub = document.querySelector('.subbar');
    if (sub) {
      var back = viewBack(view, current.args);
      sub.hidden = !back;
      document.body.classList.toggle('has-subbar', !!back);
      // write only what changed: a text write re-runs body's :has() rules over the whole page (a full restyle
      // inside every transition's update for a title that is usually the same)
      var st = sub.querySelector('.subbar-title'), stT = back ? title : '';
      if (st && st.textContent !== stT) st.textContent = stT;
      var bl = sub.querySelector('.back-label'), blT = SM.t('core.back');
      if (bl && bl.textContent !== blT) bl.textContent = blT;
    }
    // tabs (pages without a tab, e.g. tools / program pages, highlight none).
    // まなぶ (#/learn…) is not a tab but has its own row on the desktop rail.
    var tab = view ? view.tab : null;
    // F19: a tool (and まなぶ on phones) is not part of any tab: no tab says "you are here" there
    if (current.key === 'tools' || current.key === 'learn') tab = null;
    if (tab) lastTab = tab;
    var activeTab = tab || (current.key === 'learn' ? 'learn' : null);
    var idx = -1;
    Array.prototype.forEach.call(document.querySelectorAll('.tabbar .tab'), function (a, i) {
      var on = a.getAttribute('data-tab') === activeTab;
      a.classList.toggle('is-active', on);
      if (on) idx = i;
      if (on && activeTab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    placeTabIndicator(idx);
    // document title
    var site = SM.t('shell.brand');
    document.title = (current.name === 'home' || !title) ? SM.t('shell.docTitle') : title + ' | ' + site;
  }
  SM.paintChrome = paintChrome;

  /* Sliding tab indicator (drawn by base.css as .tabbar::before). Core drives it with CSS variables on
     .tabbar: --tab-index / --tab-i = index of the active .tab (-1 = none), --tab-ind-o = 0|1, plus measured
     --tab-x/--tab-w/--tab-y/--tab-h in px for any style that wants exact geometry.
     .tabbar.has-active when a row is active; .is-extra when it is the rail-only まなぶ row (hidden on phones,
     so --tab-ind-o is left to CSS there); .ind-ready after the first placement (no slide-in on load). */
  function placeTabIndicator(idx) {
    var nav = document.querySelector('.tabbar');
    if (!nav) return;
    var tabs = nav.querySelectorAll('.tab');
    if (idx === undefined) {
      idx = -1;
      Array.prototype.forEach.call(tabs, function (a, i) { if (a.classList.contains('is-active')) idx = i; });
    }
    var a = idx >= 0 ? tabs[idx] : null;
    var extra = !!(a && a.classList.contains('tab-extra'));
    var st = nav.style;
    st.setProperty('--tab-i', String(idx));
    st.setProperty('--tab-index', String(Math.max(idx, 0)));
    if (extra) st.removeProperty('--tab-ind-o');
    else st.setProperty('--tab-ind-o', a ? '1' : '0');
    nav.classList.toggle('has-active', !!a);
    nav.classList.toggle('is-extra', extra);
    // geometry only changes with the window: measure in a frame (never inside a view-transition update)
    var mkey = idx + ':' + window.innerWidth;
    if (a && tabMeasured !== mkey) requestAnimationFrame(function () { measureTab(nav, a, mkey); });
    if (!nav.classList.contains('ind-ready')) {
      requestAnimationFrame(function () { requestAnimationFrame(function () { nav.classList.add('ind-ready'); }); });
    }
  }
  var tabMeasured = null;
  function measureTab(nav, a, mkey) {
    if (!a || !a.isConnected || a.offsetParent === null) return;
    var st = nav.style;
    st.setProperty('--tab-x', a.offsetLeft + 'px');
    st.setProperty('--tab-w', a.offsetWidth + 'px');
    st.setProperty('--tab-y', a.offsetTop + 'px');
    st.setProperty('--tab-h', a.offsetHeight + 'px');
    tabMeasured = mkey;
  }
  SM.placeTabIndicator = placeTabIndicator;
  var resizeT = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { tabMeasured = null; placeTabIndicator(); }, 80);
  });

  function doRender(isNav, ro) {
    ro = ro || {};
    var main = document.getElementById('view');
    if (!main) return;
    var found = findView(current.name);
    if (!found) { location.replace('#/'); return; }
    var view = found.view;
    var name = found.key;
    var cls = 'view v-' + (CLASS_ALIAS[name] || name);
    if (CLASS_ALIAS[name]) cls += ' v-' + name;
    if (!isNav) {
      // keep focus id & caret when re-rendering in place
      var ae = document.activeElement, focusId = null, selS = null, selE = null;
      if (ae && ae.id && main.contains(ae)) {
        focusId = ae.id;
        try { selS = ae.selectionStart; selE = ae.selectionEnd; } catch (e) { }
      }
      var y = window.scrollY;
    } else {
      customTitle = null;
    }
    var html, failed = false;
    try {
      html = view.render(current.args, current.query);
      if (html === undefined || html === null) html = '';
    } catch (e) {
      console.error('[SM] view "' + name + '" render failed', e);
      html = errorCard(e); failed = true;
    }
    // removing a focused node runs focus fix-up during the parse: drop focus first (set again after render).
    // Blur before the class swap: blur flushes style, and the old page under the new view class would
    // be restyled and laid out in full just to be thrown away.
    try { var fa = document.activeElement; if (isNav && fa && fa !== document.body && main.contains(fa)) fa.blur(); } catch (e) { }
    if (isNav) main.textContent = '';
    main.className = cls + (failed ? ' is-error' : '');
    main.innerHTML = html;
    if (!failed && typeof view.mount === 'function') {
      try { view.mount(main, current.args, current.query); }
      catch (e) {
        console.error('[SM] view "' + name + '" mount failed', e);
        main.innerHTML = errorCard(e); main.className = cls + ' is-error';
      }
    }
    SM.syncJunior();
    if (!failed && SM.paintJrBanner) { try { SM.paintJrBanner(main); } catch (e) { console.error('[SM] banner failed', e); } }
    try { SM.applyRuby(main); } catch (e) { console.error('[SM] ruby failed', e); }
    if (!failed) motionMount(main, isNav ? { instant: !!ro.instant } : undefined);
    paintChrome();
    if (SM.updateBadge) SM.updateBadge();
    if (!isNav) {
      window.scrollTo(0, y);
      if (focusId) {
        var el = document.getElementById(focusId);
        if (el) {
          try { el.focus({ preventScroll: true }); if (selS !== null && el.setSelectionRange) el.setSelectionRange(selS, selE); } catch (e) { }
        }
      }
    }
  }

  SM.render = function () {
    if (!current.name) return SM._route(true);
    doRender(false);
  };

  var firstRoute = true;
  var pendingKind = null;     // transition kind requested through SM.go(hash, { transition })
  var homing = null;          // SM.go to home is stepping back off the guard entry (see "browser Back")
  var TAB_ROOTS = { '#/learn': 1 };   // + every SM.tabs href (S16)
  SM.tabs.forEach(function (tb) { TAB_ROOTS[tb.href] = 1; });
  var visited = {};           // hashes rendered this session (returns mount instantly, §3.8)
  var openerMem = {};         // hash -> focus signature of the element that opened the next screen

  /* Runs update() as a page transition (MOTION-SPEC §3): SM.motion.transition when MOTION is loaded,
     else the bare API, else a plain swap. update() always runs exactly once. <html data-nav=kind>
     says which way the screen moves (motion.css keys on html.vt-*). */
  function navTransition(kind, update, o) {
    var de = document.documentElement;
    if (kind !== 'none') de.setAttribute('data-nav', kind);
    var clean = function () { if (de.getAttribute('data-nav') === kind) de.removeAttribute('data-nav'); };
    var p = null;
    try {
      if (SM.motion && typeof SM.motion.transition === 'function') p = SM.motion.transition(kind, update, o);
      else if (document.startViewTransition && kind !== 'none' && !reducedMotion()) {
        var t = document.startViewTransition(function () { try { update(); } catch (e) { console.error(e); } });
        p = t.finished || null;
      } else update();
    } catch (e) {
      console.error('[SM] view transition failed', e);
      clean();
      return;
    }
    if (p && p.then) p.then(clean, clean); else clean();
  }
  SM._navTransition = navTransition;

  function focusAfterNav(kind, hash, main) {
    var target = null;
    if (kind === 'back' && openerMem[hash]) {
      try { target = main.querySelector(openerMem[hash]); } catch (e) { target = null; }
      if (target && target.offsetParent === null) target = null;
    }
    if (!target) {
      target = main.querySelector('h1') || main;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    }
    try { target.focus({ preventScroll: true }); } catch (e) { }
  }

  SM._route = function () {
    var raw = location.hash || '';
    if (raw && raw !== '#' && raw.indexOf('#/') !== 0) {   // in-page anchor, not a route
      if (SM.motion && SM.motion.finishAll) SM.motion.finishAll();
      return;
    }
    var prevHash = current.hash, prevKey = current.key;
    if (prevHash) scrollMem[prevHash] = window.scrollY;
    var r = parseHash(raw);
    // a view that is not loaded yet: fetch its files, then route again (to whatever the hash is by then; nothing
    // has changed yet, so the old screen stays as it is and its transition / morph starts from there)
    var missing = !findView(r.name) && lazyFiles(r.name), deps = missing ? null : viewDeps(r.name);
    if (missing || deps) {
      if (deps) depsTried[r.name] = true;
      lazyLoading(true);
      var boarding = boardTab(r.name);
      SM.need(missing || deps).then(function () {
        lazyLoading(false);
        unboard(boarding);
        var now = location.hash && location.hash !== '#' ? location.hash : '#/';
        if (now === current.hash && current.name) return;   // routed meanwhile (e.g. another load finished first)
        if (!findView(parseHash(now).name) && parseHash(now).name === r.name) { lazyFailed(); return; }
        SM._route();
      }, function (e) {
        lazyLoading(false);
        unboard(boarding);
        paintChrome();
        console.error(e);
        if (deps) { SM._route(); return; }   // the view itself is here: show it without the extra
        if (parseHash(location.hash).name === r.name) lazyFailed();
      });
      return;
    }
    if (!findView(r.name)) {
      if (r.name !== 'home') {
        // F17: an address that names no screen opens home and says so (the address is corrected too)
        SM.go('#/', { transition: 'tab' });
        setTimeout(function () { SM.toast(SM.t('core.notFound'), 4000); }, 350);
        return;
      }
    }
    var hash = raw && raw !== '#' ? raw : '#/';
    // a tab tap is never "back", even when the tab is the screen before this one (S11)
    var tabTapped = pendingKind === 'tab' && TAB_ROOTS[hash.split('?')[0]];
    // detect "back": target equals the entry before the current one
    var isBack = !tabTapped && navStack.length > 1 && navStack[navStack.length - 2] === hash;
    if (isBack) navStack.pop();
    else if (navStack[navStack.length - 1] !== hash) navStack.push(hash);
    if (navStack.length > 50) navStack.splice(0, navStack.length - 50);

    // which way should the screen move?
    var kind = pendingKind;
    pendingKind = null;
    if (!kind) {
      if (firstRoute || hash === prevHash) kind = 'none';
      else if (isBack) kind = 'back';
      else if (TAB_ROOTS[hash.split('?')[0]]) kind = 'tab';
      else kind = 'forward';
    }
    if (firstRoute) kind = 'none';

    visited[hash] = true;
    // v5: a tab revisited plays its entrance again (motion on every screen); only Back and in-place renders land
    // instantly (Back must restore the scroll position onto a finished page, MOTION-SPEC §3.8)
    var instant = kind === 'back' || (kind === 'none' && !firstRoute);
    var restoreY = kind === 'back' && scrollMem[hash] ? scrollMem[hash] : 0;
    // F10: a toast from the screen being left goes with it (one raised in the same breath stays)
    if (kind !== 'none' && SM.hideToast) SM.hideToast({ ifOlder: 700 });
    // remember what opened the next screen, so Back can put focus there again
    if (prevHash && kind === 'forward') {
      var ae = document.activeElement, sig = null;
      var view0 = document.getElementById('view');
      if (ae && view0 && view0.contains(ae) && SM.motion && SM.motion.focusSig) { try { sig = SM.motion.focusSig(ae); } catch (e) { sig = null; } }
      if (sig) openerMem[prevHash] = sig; else delete openerMem[prevHash];
    }

    current.name = r.name; current.args = r.args; current.query = r.query; current.hash = hash;
    current.key = (findView(r.name) || {}).key || r.name;
    current.kind = kind; current.instant = instant; current.restoreY = restoreY;

    if (!findView(r.name)) {
      if (SM.sheetOpen()) SM.closeSheet({ noFocus: true, instant: true });
      var mainEl = document.getElementById('view');
      if (mainEl) { mainEl.className = 'view is-error'; mainEl.innerHTML = errorCard(); }
      return;
    }

    var wasFirst = firstRoute;
    firstRoute = false;
    var nextView = findView(r.name).view;

    /* In-place routes (MOTION-SPEC §3.5): a view may take a move between two of its own screens that share the
       same chrome (the question flow q N → q N±1) and swap only what changes, with an in-view shared axis instead
       of a document view transition. view.swap(main, args, query, {kind, from, to, instant, ready}) returns true
       when the DOM is already the new screen, or 'later' when the old screen is still leaving and the view will
       call ready() once the new one is in place (focus waits for it); anything else falls through to the normal
       transition. Core keeps the bookkeeping: history, route state, chrome, focus. */
    if (!wasFirst && kind !== 'none' && prevKey === current.key && nextView && typeof nextView.swap === 'function' && !SM.sheetOpen()) {
      var swapMain = document.getElementById('view'), swapped = false, swapLater = false;
      var swapReady = function () {
        if (!swapLater) return;
        swapLater = false;
        if (current.hash === hash && swapMain && swapMain.isConnected) focusAfterNav(kind, hash, swapMain);
      };
      var trySwap = function () {
        var res = false;
        try { res = nextView.swap(swapMain, r.args, r.query, { kind: kind, from: prevHash, to: hash, instant: instant, ready: swapReady }); }
        catch (e) { console.error('[SM] view swap failed', e); res = false; }
        swapped = res === true || res === 'later';
        swapLater = res === 'later';
      };
      // through the engine: a running transition is skipped and work queued for the old screen is dropped
      if (swapMain) {
        if (SM.motion && typeof SM.motion.transition === 'function') SM.motion.transition('none', trySwap); else trySwap();
      }
      if (swapped) {
        customTitle = null;
        paintChrome();
        if (SM.updateBadge) SM.updateBadge();
        if (!swapLater) focusAfterNav(kind, hash, swapMain);
        return;
      }
    }

    // the subbar keeps its title when both screens have the same one (しつもん q1 → q2 …): it holds still
    var sameTitle = false;
    try {
      var sub0 = document.querySelector('.subbar'), st0 = sub0 && sub0.querySelector('.subbar-title');
      var t0 = st0 && !sub0.hidden ? st0.textContent : '';
      sameTitle = !!t0 && !!viewBack(nextView, r.args) && viewTitle(nextView, r.args) === t0;
    } catch (e) { sameTitle = false; }

    navTransition(kind, function () {
      // an open sheet belongs to the old page: it leaves with the old snapshot, never over the new page
      if (SM.sheetOpen()) SM.closeSheet({ noFocus: true, instant: true, noHistory: true });
      doRender(true, { instant: instant });
      // scroll, then focus: the only two steps that may read layout (MOTION-SPEC §3.3)
      try { window.scrollTo({ top: restoreY, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, restoreY); }
      var main = document.getElementById('view');
      if (!wasFirst && main) focusAfterNav(kind, hash, main);
    }, { from: prevHash, to: hash, sameTitle: sameTitle });
  };

  /* SEARCH (v6, 「きく」): SM.replaceHash(hash) — a view that keeps its state in the hash (#/ask/<query>) updates the
     address as you type WITHOUT routing (no render, no transition, no hashchange). The history entry, the route
     state and the in-app Back stack follow, so Back from a result and a reload land on the same answer.
     Same view only; returns false (and changes nothing) otherwise. */
  SM.replaceHash = function (hash) {
    if (!hash || hash.indexOf('#/') !== 0 || !current.key) return false;
    var r = parseHash(hash), f = findView(r.name);
    if (!f || f.key !== current.key) return false;
    if (hash === current.hash) return true;
    try { history.replaceState(history.state, '', hash); } catch (e) { return false; }
    if (navStack.length && navStack[navStack.length - 1] === current.hash) navStack[navStack.length - 1] = hash;
    current.args = r.args; current.query = r.query; current.hash = hash;
    return true;
  };

  /** SM.go(hash[, { transition: 'forward'|'back'|'tab'|'none' }]) — the option overrides the automatic direction. */
  SM.go = function (hash, opts) {
    if (!hash) hash = '#/';
    if (hash.charAt(0) !== '#') hash = '#' + (hash.charAt(0) === '/' ? '' : '/') + hash;
    pendingKind = opts && opts.transition ? opts.transition : null;
    // a running entrance lands now, so the old page's snapshot shows the finished page
    if (SM.motion && SM.motion.finishAll) { try { SM.motion.finishAll(null, { instant: true, noFlush: true, ifBusy: true }); } catch (e) { } }
    if (location.hash === hash || (hash === '#/' && (location.hash === '' || location.hash === '#'))) {
      SM._route(); // same hash: re-route (e.g. re-tap tab)
      return;
    }
    // replace, never push: the app keeps a single history entry (see SM.back / quick exit).
    // history.replaceState, not location.replace: a fragment navigation dirties the whole old page's
    // style and layout (about 55ms on a phone) right before the transition snapshots it. The
    // hashchange listeners (router, map warm-up, plan, tools) still get their event.
    var oldURL = location.href;
    // a sheet opened on home pushed its own guard: navigating from inside it keeps that entry as the screen's
    // ordinary guard (the sheet closes with the old page and must not step back)
    if (sheetState) sheetState.pushed = false;
    try { if (history.state && history.state.smSheet) history.replaceState({ smGuard: 1 }, ''); } catch (e) { }
    // the phone's Back: home is the page's own history entry, every other screen the one guard entry above it
    // (see "browser Back" below). Going home from the guard steps back onto the page's entry (popstate routes it),
    // so the next Back leaves the app as it should.
    if (hasGuard() && isHomeHash(hash) && !homing) {
      homing = { hash: hash, kind: pendingKind };
      try { sessionStorage.setItem('sm2:home', '1'); } catch (e) { }   // read by the head gate if Back reloads
      try { history.back(); return; } catch (e) { homing = null; }
    }
    try {
      if (!hasGuard() && !isHomeHash(hash)) { markBase(); history.pushState({ smGuard: 1 }, '', hash); }
      else history.replaceState(history.state, '', hash);
    }
    catch (e) { try { location.replace(hash); } catch (x) { location.hash = hash; } return; }
    var ev;
    try { ev = new HashChangeEvent('hashchange', { oldURL: oldURL, newURL: location.href }); }
    catch (e) { ev = document.createEvent('Event'); ev.initEvent('hashchange', false, false); }
    // after the caller's own code, like the browser's queued event (but without waiting a task)
    Promise.resolve().then(function () { window.dispatchEvent(ev); });
  };

  SM.back = function () {
    var found = findView(current.name);
    var fallback = viewBack(found && found.view, current.args) || '#/';
    // in-app history only (the browser history holds one entry for the whole app)
    if (navStack.length > 1) SM.go(navStack[navStack.length - 2], { transition: 'back' });
    else { navStack.length = 0; SM.go(fallback, { transition: 'back' }); }   // the parent becomes the stack's root
  };

  /* ------------------------------------------------------------------ browser Back (one guard entry)
     Routes replace the current history entry, so Back never walks through a trail of visited screens (quick-exit
     privacy). But one entry would make Android's Back gesture leave the app from any screen. So: the page's own
     entry holds home, and the first move to any other screen pushes ONE guard entry, which later routes replace
     (never more than two entries). Back pops the guard; popstate turns that into the in-app 戻る (closing an open
     sheet or full-screen mode first) and pushes the guard again unless that lands on home. Quick exit steps off
     the guard first (index.html head gate, __lx.leave), so the weather page replaces the page's own entry.
     Trade-off: after a quick exit the guard stays as a forward-only entry, marked smExited; reaching it leaves
     again before anything paints. */
  function isHomeHash(h) { return !h || h === '#' || /^#\/?(\?.*)?$/.test(h); }
  function hasGuard() { try { return !!(history.state && history.state.smGuard); } catch (e) { return false; } }
  // the entry under the guard is marked smBase, so popstate can tell the user's Back (onto it) from a fragment
  // navigation (a typed or pasted #/… URL), which adds a fresh entry with no state and is simply routed
  function markBase() { try { var s = history.state; if (!(s && s.smBase)) history.replaceState(Object.assign({}, s, { smBase: 1 }), ''); } catch (e) { } }
  function guardPush(hash) { markBase(); try { history.pushState({ smGuard: 1 }, '', hash); } catch (e) { } }
  SM._guardStart = function () {
    var h = location.hash;
    if (!hasGuard() && !isHomeHash(h) && h.indexOf('#/') === 0) guardPush(h);
  };
  window.addEventListener('popstate', function () {
    var L = window.__lx || {};
    if (L.leaving) return;                 // quick exit: the head gate replaces this entry
    if (sheetPopping) {                    // closeSheet stepped off the guard its sheet pushed (S3)
      sheetPopping = false;
      // a new sheet opened before this pop arrived: give it a guard of its own
      if (sheetState && !hasGuard()) {
        try { history.pushState({ smGuard: 1, smSheet: 1 }, '', location.hash || '#/'); sheetState.pushed = true; } catch (e) { }
      }
      return;
    }
    if (hasGuard()) return;                // Forward onto the guard: its hashchange routes it
    var hm = homing; homing = null;
    if (hm) {                              // SM.go('#/') stepped back onto the page's entry
      try { sessionStorage.removeItem('sm2:home'); } catch (e) { }
      try { history.replaceState(history.state, '', hm.hash); } catch (e) { }
      pendingKind = hm.kind;
      SM._route();
      return;
    }
    // not the guard's base: a fragment navigation (or an entry from before the guard). hashchange routes it.
    try { if (!(history.state && history.state.smBase)) return; } catch (e) { return; }
    // the user's Back. An open sheet or full-screen mode closes first; the screen stays.
    var x = document.querySelector('.pg-show .pg-show-x, .tl-read .rd-close');
    if (sheetState || x) {
      // Back closes like a flick down (the drag-close spring with a little velocity), not a cut
      if (sheetState) { sheetState.pushed = false; SM.closeSheet({ velocity: 0.9 }); } else x.click();
      if (current.hash && !isHomeHash(current.hash)) guardPush(current.hash);
      return;
    }
    if (!current.hash || isHomeHash(current.hash)) { SM._route(); return; }
    var found = findView(current.name);
    var target = navStack.length > 1 ? navStack[navStack.length - 2] : (viewBack(found && found.view, current.args) || '#/');
    if (navStack.length <= 1) navStack.length = 0;
    if (isHomeHash(target)) { try { history.replaceState(history.state, '', target); } catch (e) { } }
    else guardPush(target);
    pendingKind = 'back';
    SM._route();
  });
  /* the browser's own hashchange after a popstate we already routed (or for the screen already shown) is skipped */
  SM._onHashChange = function () {
    var h = location.hash && location.hash !== '#' ? location.hash : '#/';
    if (current.name && h === current.hash) return;
    SM._route();
  };
})();
;
/* ---- js/icons.js ---- */
/* 巣立ちマップ v3 — icons.js (DESIGN)
   SM.icon(name, cls) -> inline SVG string.
   v3 "教科書と駅サイン": a small, functional set drawn like station pictograms —
   24px grid, 2px stroke, square caps, miter joins, straight lines and true circles only.
   currentColor, aria-hidden. Unknown names render an empty icon (never throws).

   Functional set (use these): phone, pin, external, chevron-*, arrow-*, close, calendar, clock,
   copy, print, search, settings, plus, minus, check, star/star-fill (save), home/search/map/check-list (tabs),
   line/chat, globe, mail, download, share, trash, edit, filter, list, info, alert, lock, eye-off, sun, moon,
   text-size, ruby, refresh, book, menu, flag, bookmark.
   Legacy names (money, home-heart, school, briefcase, document, heart, users, shield, leaf, sparkle) still
   resolve so v2 markup never breaks, but they are drawn as plain neutral pictograms; do not add new uses.
   Category identity is the kanji mark (SM.ui.catIcon), never an icon. */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};

  var P = {
    /* --- tabs / navigation --- */
    home: '<path d="M3 11 12 3.8 21 11"/><path d="M5.5 9.2V20.5h13V9.2"/><path d="M10 20.5v-6h4v6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
    map: '<path d="M3.5 5.8 9 4l6 2 5.5-1.8v14L15 20l-6-2-5.5 1.8z"/><path d="M9 4v14"/><path d="M15 6v14"/>',
    'check-list': '<path d="m3.5 6.3 1.8 1.8 3-3.3"/><path d="m3.5 11.8 1.8 1.8 3-3.3"/><path d="m3.5 17.3 1.8 1.8 3-3.3"/><path d="M11.5 7h9"/><path d="M11.5 12.5h9"/><path d="M11.5 18h9"/>',
    settings: '<path d="M3.5 6.5H6M10 6.5h10.5M3.5 12H13M17 12h3.5M3.5 17.5H8M12 17.5h8.5"/><path d="M6 4.5h4v4H6zM13 10h4v4h-4zM8 15.5h4v4H8z"/>',
    menu: '<path d="M4 6.5h16"/><path d="M4 12h16"/><path d="M4 17.5h16"/>',
    'chevron-left': '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    'chevron-right': '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
    'chevron-down': '<path d="M5.5 9.5 12 16l6.5-6.5"/>',
    'chevron-up': '<path d="M5.5 14.5 12 8l6.5 6.5"/>',
    'arrow-right': '<path d="M4 12h15"/><path d="m13.5 6.5 5.5 5.5-5.5 5.5"/>',
    'arrow-left': '<path d="M20 12H5"/><path d="M10.5 6.5 5 12l5.5 5.5"/>',
    'arrow-up-right': '<path d="M7 17 17 7"/><path d="M9 7h8v8"/>',
    close: '<path d="m6 6 12 12"/><path d="M18 6 6 18"/>',

    /* --- contact / action --- */
    phone: '<path d="M8.5 3.5H5L3.5 5c0 8.6 6.9 15.5 15.5 15.5l1.5-1.5v-3.5l-4-1.5-2 2c-3-1.3-5.2-3.5-6.5-6.5l2-2z"/>',
    line: '<path d="M3.5 4.5h17V16H10l-4.5 3.8V16h-2z"/><path d="M8 10.3h.1M12 10.3h.1M16 10.3h.1"/>',
    mail: '<path d="M3.5 5.5h17v13h-17z"/><path d="m3.5 6 8.5 7 8.5-7"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><ellipse cx="12" cy="12" rx="3.8" ry="8.5"/>',
    external: '<path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M17.5 13.5V20h-13V6.5H11"/>',
    pin: '<path d="M12 21.5 6.2 13.4a7 7 0 1 1 11.6 0z"/><circle cx="12" cy="9.5" r="2.4"/>',
    calendar: '<path d="M3.5 5.5h17v15h-17z"/><path d="M8 3v4.5M16 3v4.5"/><path d="M3.5 10h17"/><path d="M7.5 13.5h2v2h-2z" fill="currentColor" stroke-width="1"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5h4"/>',
    copy: '<path d="M9 9h11v11H9z"/><path d="M15 9V4H4v11h5"/>',
    print: '<path d="M7 9V3.5h10V9"/><path d="M7 17.5H3.5V9h17v8.5H17"/><path d="M7 14h10v6.5H7z"/>',
    share: '<path d="M4.5 12.5v8h15v-8"/><path d="M8 7l4-4 4 4"/><path d="M12 3.5V15"/>',
    download: '<path d="M12 3.5v11"/><path d="m7 10 5 5 5-5"/><path d="M4.5 20h15"/>',
    trash: '<path d="M3.5 6.5h17"/><path d="M5.5 6.5v14h13v-14"/><path d="M9 6.5v-3h6v3"/><path d="M10 10.5v6M14 10.5v6"/>',
    edit: '<path d="M4 20v-4L15.5 4.5l4 4L8 20z"/><path d="m13 7 4 4"/>',
    refresh: '<path d="M19.5 11A7.5 7.5 0 0 0 6 7"/><path d="M5 3.5V8h4.5"/><path d="M4.5 13A7.5 7.5 0 0 0 18 17"/><path d="M19 20.5V16h-4.5"/>',
    plus: '<path d="M12 4.5v15"/><path d="M4.5 12h15"/>',
    minus: '<path d="M4.5 12h15"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    star: '<path d="m12 3.4 2.7 5.4 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9z"/>',
    'star-fill': '<path fill="currentColor" d="m12 3.4 2.7 5.4 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9z"/>',
    bookmark: '<path d="M6 3.5h12v17l-6-4.5-6 4.5z"/>',
    filter: '<path d="M4 6.5h16"/><path d="M7 12h10"/><path d="M10 17.5h4"/>',
    list: '<path d="M9 6.5h11.5M9 12h11.5M9 17.5h11.5"/><path d="M3.5 5.5h2v2h-2zM3.5 11h2v2h-2zM3.5 16.5h2v2h-2z" fill="currentColor" stroke-width="1"/>',
    flag: '<path d="M5.5 21V3.5"/><path d="M5.5 4.5h12l-2.5 4 2.5 4h-12"/>',
    lock: '<path d="M4.5 10.5h15v10h-15z"/><path d="M8 10.5v-3a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 7.5v.6"/>',
    alert: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4"/><path d="M12 16.8v.6"/>',
    'eye-off': '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/><path d="m4 4 16 16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
    'text-size': '<path d="M3.5 7V4.5h10V7"/><path d="M8.5 4.5v15"/><path d="M6 19.5h5"/><path d="M14.5 12v-1.5h6V12"/><path d="M17.5 10.5v9"/><path d="M16 19.5h3"/>',
    ruby: '<path d="M7 3.5h10"/><path d="M4.5 7.5h15v13h-15z"/><path d="M12 7.5v13"/><path d="M4.5 14h15"/>',
    book: '<path d="M3 5h6l3 2 3-2h6v14h-6l-3 2-3-2H3z"/><path d="M12 7v14"/>',

    /* --- legacy names: neutral pictograms, kept so old markup renders; no new uses --- */
    money: '<path d="m7 4 5 7 5-7"/><path d="M12 11v9"/><path d="M7.5 12.5h9M7.5 16h9"/>',
    document: '<path d="M5 3h9l5 5v13H5z"/><path d="M14 3v5h5"/><path d="M8.5 13h7M8.5 16.5h5"/>',
    school: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11.2v5.3L12 19l5.5-2.5v-5.3"/>',
    briefcase: '<path d="M3 7.5h18v12.5H3z"/><path d="M8.5 7.5v-3h7v3"/><path d="M3 12.5h18"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20.5V17h13v3.5"/><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4"/><path d="M18.5 14h3v6.5"/>',
    shield: '<path d="M12 3 19.5 5.5v6c0 4.5-3.5 8-7.5 9.5-4-1.5-7.5-5-7.5-9.5v-6z"/>',
    heart: '<path d="M12 20 4.3 12.3a4.4 4.4 0 0 1 7.7-5.6 4.4 4.4 0 0 1 7.7 5.6z"/>',
    leaf: '<path d="M5 19.5C5 11 10 5 19.5 4.5 19 14 13.5 19.5 5 19.5z"/><path d="m5 19.5 8-8"/>',
    // sparkle is retired: it renders as a small solid square, the same bullet used in print.
    sparkle: '<path d="M9 9h6v6H9z" fill="currentColor" stroke="none"/>'
  };
  P['home-heart'] = P.home;
  // aliases
  P.x = P.close; P.chat = P.line; P.yen = P.money; P['external-link'] = P.external; P.gear = P.settings;
  P.tel = P.phone; P.warning = P.alert; P.learn = P.book;

  /* @brand:start — BRAND-FINAL (see LOGO.md). Path data is generated by tmp4-BRAND-FINAL/build.py from
     the brand geometry; regenerate rather than hand-edit.
     The mark: the 巣 station box (ink; the 巣 is knocked out, so the page shows through) standing on the
     green line. This 24-grid master is for 16–32 px: box 20 with the 巣 snapped to whole pixels at 20 px,
     a 1-unit gap and a 3-unit foot that runs on past the box. Ink = currentColor, line = --action. */
  var LOGO =
    '<path class="lg-box" fill="currentColor" stroke="none" fill-rule="evenodd" d="M0 0H20V20H0ZM9 17L9 13.658Q8.166 14.3 7.127 14.893Q6.089 15.486 5.496 15.979Q4.885 16.473 3.75 16.802Q3.654 16.605 3.462 16.325Q3.269 16.045 3.048 15.757Q2.863 15.469 2.711 15.305Q3.538 15.074 4.567 14.712Q5.274 14.35 5.748 13.905Q6.444 13.461 7.243 13L3 13L3 12L9 12L9 11L5 11L5 6L5.54 6Q5.345 5.574 5.08 5.065Q4.596 4.556 4.135 4.222L5.451 3.34Q5.708 3.766 5.996 4.32Q6.568 4.875 6.976 5.346Q6.746 5.453 6.408 5.643Q6.071 5.833 5.885 6L9.276 6Q8.947 5.514 8.45 4.86Q7.953 4.206 7.491 3.72L9.207 2.99Q9.707 3.507 10.216 4.161Q10.724 4.814 11.06 5.377Q10.81 5.483 10.397 5.666Q9.983 5.848 9.638 6L11.667 6Q11.893 5.65 12.161 5.164Q12.429 4.678 12.702 4.153Q12.976 3.629 13.265 3.173L15.231 3.902Q14.876 4.343 14.398 4.913Q13.92 5.483 13.442 6L15 6L15 11L11 11L11 12L17 12L17 13L12.155 13Q12.702 13.461 13.513 13.889Q14.469 14.317 15.471 14.654Q16.519 14.992 17.319 15.222Q17.167 15.403 16.981 15.708Q16.75 16.012 16.548 16.309Q16.346 16.605 16.231 16.802Q15.115 16.473 14.018 15.996Q12.952 15.519 12.262 14.926Q11.571 14.333 11 13.691L11 17ZM6 8L9 8L9 7L6 7ZM11 8L13 8L13 7L11 7ZM6 10L9 10L9 9L6 9ZM11 10L13 10L13 9L11 9Z"/>' +
    '<path class="lg-foot" stroke="none" style="fill:var(--action,#0b6e44)" d="M0 21H24V24H0Z"/>';

  /* Lockup geometry (screen master): box = 20 units at (0,0); 巣 and wordmark hinted for a 24 px box.
     ja: [巣]立ちマップ · en: [巣] Sudachi Map · line: the green line + 45° step under the ja lockup
     (show the line only when the lockup is ≥ 40 px tall: splash, about, print).
     The compact lockups' viewBox is exactly the box (h 20) and the svg is overflow:visible, so CSS height = the
     box in px (22 → a 22 px box on whole pixels); the ち/プ/p tails hang just below it. */
  var BR = {
    box: 'M0 0H20V20H0ZM9.167 16.667L9.167 13.882Q8.471 14.417 7.606 14.911Q6.741 15.405 5.826 15.816Q4.904 16.228 3.958 16.502Q3.878 16.337 3.718 16.104Q3.558 15.871 3.373 15.631Q3.197 15.391 3.045 15.254Q3.782 15.062 4.639 14.76Q5.457 14.458 6.246 14.088Q7.036 13.717 7.702 13.333L3.333 13.333L3.333 11.667L9.167 11.667L9.167 10.833L5 10.833L5 5.833L5.9 5.833Q5.575 5.408 5.133 4.899Q4.663 4.389 4.279 4.055L5.752 3.173Q6.18 3.599 6.659 4.154Q7.14 4.709 7.48 5.18Q7.288 5.286 7.007 5.476Q6.726 5.666 6.475 5.833L9.397 5.833Q9.122 5.347 8.708 4.693Q8.294 4.04 7.909 3.553L9.339 2.824Q9.756 3.341 10.18 3.994Q10.603 4.648 10.908 5.21Q10.675 5.317 10.33 5.499Q9.986 5.681 9.698 5.833L11.667 5.833Q11.949 5.484 12.284 4.997Q12.619 4.511 12.961 3.987Q13.304 3.462 13.555 3.006L15.192 3.736Q14.897 4.177 14.499 4.747Q14.1 5.317 13.702 5.833L15 5.833L15 10.833L10.833 10.833L10.833 11.667L16.667 11.667L16.667 13.333L12.277 13.333Q12.961 13.717 13.761 14.074Q14.558 14.431 15.393 14.712Q16.266 14.993 16.986 15.185Q16.834 15.336 16.651 15.59Q16.458 15.844 16.29 16.091Q16.122 16.337 16.026 16.502Q15.096 16.228 14.181 15.83Q13.274 15.432 12.411 14.938Q11.548 14.444 10.833 13.909L10.833 16.667ZM6.667 8.333L9.167 8.333L9.167 7.5L6.667 7.5ZM10.833 8.333L13.333 8.333L13.333 7.5L10.833 7.5ZM6.667 10L9.167 10L9.167 9.167L6.667 9.167ZM10.833 10L13.333 10L13.333 9.167L10.833 9.167Z',
    ja: { w: 122.5, h: 20, g: [
      'M23.333 20L23.333 16.667L32.723 16.667Q33.105 15.812 33.487 14.724Q33.869 13.636 34.207 12.5Q34.533 11.364 34.776 10.383Q35.02 9.402 35.122 8.78L38.211 9.518Q38.028 10.237 37.734 11.169Q37.439 12.102 37.093 13.102Q36.748 14.103 36.402 15.035Q36.057 15.967 35.752 16.667L41.667 16.667L41.667 20ZM24.167 8.333L24.167 5L30.833 5L30.833 1.667L34.167 1.667L34.167 5L40.833 5L40.833 8.333ZM28.418 16.239Q28.258 15.287 27.989 14.103Q27.72 12.918 27.38 11.772Q27.041 10.625 26.702 9.829L29.416 9.052Q29.855 10.043 30.205 11.179Q30.554 12.315 30.833 13.452Q31.131 14.588 31.322 15.579Q30.897 15.618 30.334 15.734Q29.775 15.851 29.256 15.977Q28.738 16.103 28.418 16.239Z',
      'M51.061 20.095Q51 19.667 50.796 19.095Q50.592 18.524 50.296 17.952Q50 17.381 49.673 17.014Q53.143 17.299 55 16.565Q56.857 15.83 56.857 14.299Q56.857 13.524 56.204 13.034Q55.551 12.544 54.469 12.544Q53.204 12.544 51.98 12.963Q50.755 13.381 49.796 14.361Q49.653 14.565 49.49 14.769Q49.327 14.973 49.163 15.136L46.714 13.442Q47.673 12.483 48.337 10.973Q49 9.463 49.408 7.789Q46.653 7.891 44.796 7.789L44.612 4.83Q45.449 4.973 46.857 5.003Q48.265 5.034 49.939 4.973Q50.041 4.075 50.092 3.218Q50.143 2.361 50.122 1.667L53.265 1.667Q53.265 2.34 53.204 3.146Q53.143 3.952 53.041 4.83Q54.469 4.728 55.786 4.595Q57.102 4.463 58.163 4.289Q59.224 4.116 59.857 3.912L59.633 6.85Q58.857 7.014 57.735 7.167Q56.612 7.32 55.276 7.442Q53.939 7.565 52.531 7.646Q52.204 9.116 51.694 10.605Q52.469 10.218 53.224 10.014Q53.98 9.81 54.735 9.81Q56.306 9.81 57.51 10.361Q58.714 10.912 59.388 11.932Q60.061 12.952 60.061 14.361Q60.061 17.259 57.704 18.759Q55.347 20.259 51.061 20.095Z',
      'M74.596 18.792Q74.002 17.946 73.179 17.02Q72.356 16.095 71.419 15.215Q70.482 14.335 69.522 13.58Q68.562 12.826 67.693 12.323L70.116 10.038Q71.442 10.838 72.859 11.912Q73.796 11.112 74.882 10.106Q75.967 9.1 76.904 8.14Q75.556 8.186 73.944 8.243Q72.333 8.3 70.699 8.369Q69.064 8.438 67.613 8.506Q66.162 8.575 65.076 8.643Q63.99 8.712 63.51 8.758L63.259 5.192Q64.104 5.238 65.476 5.249Q66.847 5.26 68.516 5.249Q70.184 5.238 71.944 5.203Q73.704 5.169 75.339 5.112Q76.973 5.055 78.276 4.986Q79.579 4.918 80.333 4.849L82.39 6.723Q81.636 7.775 80.47 9.078Q79.304 10.38 77.979 11.683Q76.653 12.986 75.396 14.083Q76.584 15.203 77.407 16.3Q77.019 16.552 76.493 16.986Q75.967 17.42 75.464 17.9Q74.962 18.38 74.596 18.792Z',
      'M88.291 20.209Q88.062 19.592 87.628 18.849Q87.193 18.106 86.759 17.672Q90.919 16.735 93.262 14.312Q95.605 11.889 96.176 7.798L98.896 8.255Q98.348 11.706 96.953 14.026Q95.559 16.346 93.376 17.809Q91.193 19.272 88.291 20.209ZM90.485 12.163Q90.439 11.683 90.222 10.918Q90.005 10.152 89.742 9.409Q89.479 8.666 89.251 8.3L91.788 7.5Q92.016 7.935 92.279 8.678Q92.542 9.42 92.771 10.186Q92.999 10.952 93.068 11.478ZM86.645 13.032Q86.576 12.575 86.336 11.82Q86.096 11.066 85.799 10.335Q85.502 9.603 85.251 9.238L87.765 8.323Q88.016 8.758 88.302 9.489Q88.588 10.22 88.839 10.975Q89.091 11.729 89.205 12.255Z',
      'M106.117 19.727Q105.94 19.33 105.599 18.768Q105.257 18.206 104.838 17.655Q104.42 17.104 104.001 16.751Q108.144 15.429 110.844 13.169Q113.544 10.91 114.801 7.362Q113.721 7.384 112.409 7.439Q111.098 7.494 109.753 7.538Q108.409 7.582 107.197 7.626Q105.984 7.67 105.092 7.714Q104.199 7.758 103.802 7.802L103.604 4.122Q104.464 4.188 105.797 4.21Q107.131 4.232 108.684 4.232Q110.238 4.232 111.792 4.21Q113.346 4.188 114.658 4.133Q115.969 4.078 116.784 3.989L118.989 5.158Q118.239 8.75 116.454 11.649Q114.669 14.547 112.046 16.597Q109.423 18.647 106.117 19.727ZM120.245 4.981Q119.341 4.981 118.691 4.331Q118.041 3.681 118.041 2.777Q118.041 1.851 118.691 1.201Q119.341 0.551 120.245 0.551Q121.171 0.551 121.821 1.201Q122.471 1.851 122.471 2.777Q122.471 3.681 121.821 4.331Q121.171 4.981 120.245 4.981ZM120.245 3.923Q120.73 3.923 121.071 3.593Q121.413 3.262 121.413 2.777Q121.413 2.292 121.071 1.951Q120.73 1.609 120.245 1.609Q119.76 1.609 119.429 1.951Q119.099 2.292 119.099 2.777Q119.099 3.262 119.429 3.593Q119.76 3.923 120.245 3.923Z'
    ] },
    en: { w: 148, h: 20, g: [
      'M30.127 19.118Q28.07 19.118 26.344 18.216Q24.619 17.313 23.613 15.141L26.104 13.77Q26.767 14.958 27.704 15.621Q28.642 16.284 30.242 16.284Q31.819 16.284 32.344 15.747Q32.87 15.21 32.87 14.318Q32.87 13.747 32.607 13.336Q32.344 12.924 31.464 12.547Q30.584 12.17 28.756 11.736Q26.539 11.21 25.487 10.044Q24.436 8.878 24.436 7.141Q24.436 5.701 25.122 4.627Q25.807 3.553 27.053 2.947Q28.299 2.341 29.99 2.341Q31.544 2.341 32.733 2.821Q33.922 3.301 34.756 4.078Q35.59 4.856 36.07 5.77L33.716 7.53Q33.373 6.981 32.882 6.444Q32.39 5.907 31.682 5.541Q30.973 5.176 29.944 5.176Q28.87 5.176 28.196 5.621Q27.522 6.067 27.522 7.004Q27.522 7.37 27.716 7.747Q27.91 8.124 28.63 8.49Q29.35 8.856 30.927 9.244Q33.602 9.884 34.802 11.153Q36.002 12.421 36.002 14.273Q36.002 16.627 34.413 17.873Q32.824 19.118 30.127 19.118Z',
      'M41.733 19.418Q40.013 19.418 38.757 18.271Q37.5 17.109 37.5 14.834L37.5 7.5L40.833 7.5L40.833 14.108Q40.833 15.367 41.263 16.02Q41.692 16.674 42.388 16.674Q43.165 16.674 43.666 16.008Q44.167 15.342 44.167 13.914L44.167 7.5L47.5 7.5L47.5 19.167L44.537 19.167L44.352 17.86Q43.921 18.465 43.277 18.949Q42.633 19.418 41.733 19.418Z',
      'M54.038 19.418Q52.507 19.418 51.284 18.733Q50.061 18.041 49.364 16.717Q48.667 15.393 48.667 13.517Q48.667 11.619 49.364 10.294Q50.061 8.97 51.284 8.278Q52.507 7.587 54.038 7.587Q55.57 7.587 56.667 8.642L56.667 2.5L60 2.5L60 19.167L57.116 19.167L56.984 18.088Q55.775 19.418 54.038 19.418ZM54.152 16.752Q55.25 16.752 55.992 15.92Q56.746 15.088 56.746 13.517Q56.746 11.923 55.992 11.091Q55.25 10.259 54.152 10.259Q53.055 10.259 52.324 11.091Q51.592 11.923 51.592 13.517Q51.592 15.088 52.324 15.92Q53.055 16.752 54.152 16.752Z',
      'M65.842 18.913Q64.036 19.004 62.836 18.136Q61.636 17.267 61.636 15.621Q61.636 14.456 62.333 13.621Q63.03 12.787 64.139 12.318Q65.248 11.85 66.436 11.827Q66.962 11.781 67.442 11.907Q67.922 12.033 68.333 12.238L68.333 11.507Q68.333 10.547 67.922 10.261Q67.51 9.976 66.756 9.976Q65.773 9.976 64.733 10.33Q63.693 10.684 62.939 11.233L61.636 9.016Q62.596 8.421 63.933 7.953Q65.27 7.484 66.756 7.484Q68.833 7.484 69.833 8.353Q70.833 9.221 70.833 11.507L70.833 16.307Q70.833 16.787 71.138 16.856Q71.442 16.924 72.5 16.696L72.5 18.456Q71.987 18.616 71.218 18.764Q70.583 18.913 69.979 18.913Q68.75 18.913 68.417 17.998Q67.373 18.798 65.842 18.913ZM65.773 16.444Q66.985 16.376 67.705 15.976Q68.417 15.576 68.375 14.867Q68.354 14.341 67.865 14.181Q67.373 14.021 66.665 14.067Q65.613 14.113 64.996 14.604Q64.379 15.096 64.402 15.644Q64.425 16.033 64.756 16.25Q65.088 16.467 65.773 16.444Z',
      'M78.882 19.027Q77.35 19.027 76.127 18.318Q74.904 17.61 74.207 16.307Q73.51 15.004 73.51 13.267Q73.51 11.507 74.207 10.216Q74.904 8.924 76.127 8.204Q77.35 7.484 78.882 7.484Q80.276 7.484 81.407 8.056Q82.539 8.627 83.247 9.678L80.962 11.37Q80.344 10.09 78.882 10.09Q77.784 10.09 77.11 10.901Q76.436 11.713 76.436 13.267Q76.436 14.798 77.11 15.61Q77.784 16.421 78.882 16.421Q80.322 16.421 80.984 15.164L83.247 16.833Q82.539 17.884 81.407 18.456Q80.276 19.027 78.882 19.027Z',
      'M85 19.167L85 2.5L87.5 2.5L87.5 9.134Q87.858 8.524 88.65 8.056Q89.443 7.587 90.542 7.587Q92.282 7.587 93.224 8.712Q94.167 9.837 94.167 12.041L94.167 19.167L91.667 19.167L91.667 12.767Q91.667 11.525 91.143 10.892Q90.619 10.259 89.724 10.259Q88.753 10.259 88.126 10.904Q87.5 11.548 87.5 12.931L87.5 19.167Z',
      'M97.5 19.167L97.5 7.5L100 7.5L100 19.167ZM98.73 5.854Q98.095 5.854 97.649 5.329Q97.157 4.803 97.157 4.071Q97.157 3.34 97.649 2.826Q98.095 2.311 98.73 2.311Q99.365 2.311 99.812 2.826Q100.297 3.34 100.297 4.071Q100.297 4.803 99.812 5.329Q99.365 5.854 98.73 5.854Z',
      'M108.333 19.167L108.333 2.5L110.814 2.5L115.022 10.246L119.192 2.5L122.5 2.5L122.5 19.167L119.167 19.167L119.167 7.782L115.842 14.167L114.158 14.167L110.833 7.782L110.833 19.167Z',
      'M129.175 18.913Q127.37 19.004 126.17 18.136Q124.97 17.267 124.97 15.621Q124.97 14.456 125.667 13.621Q126.364 12.787 127.472 12.318Q128.581 11.85 129.77 11.827Q130.295 11.781 130.775 11.907Q131.255 12.033 131.667 12.238L131.667 11.507Q131.667 10.547 131.255 10.261Q130.844 9.976 130.09 9.976Q129.107 9.976 128.067 10.33Q127.027 10.684 126.272 11.233L124.97 9.016Q125.93 8.421 127.267 7.953Q128.604 7.484 130.09 7.484Q132.167 7.484 133.167 8.353Q134.167 9.221 134.167 11.507L134.167 16.307Q134.167 16.787 134.319 16.856Q134.471 16.924 135 16.696L135 18.456Q134.744 18.616 134.359 18.764Q133.917 18.913 133.312 18.913Q132.083 18.913 131.75 17.998Q130.707 18.798 129.175 18.913ZM129.107 16.444Q130.318 16.376 131.038 15.976Q131.75 15.576 131.708 14.867Q131.688 14.341 131.198 14.181Q130.707 14.021 129.998 14.067Q128.947 14.113 128.33 14.604Q127.712 15.096 127.735 15.644Q127.758 16.033 128.09 16.25Q128.421 16.467 129.107 16.444Z',
      'M136.667 23.333L136.667 7.5L139.55 7.5L139.709 8.554Q140.914 7.226 142.629 7.226Q144.183 7.226 145.394 7.91Q146.606 8.601 147.303 9.924Q148 11.248 148 13.145Q148 15.018 147.303 16.342Q146.606 17.665 145.394 18.356Q144.183 19.047 142.629 19.047Q141.143 19.047 140 17.993L140 23.333ZM142.514 16.377Q143.611 16.377 144.354 15.545Q145.097 14.714 145.097 13.145Q145.097 11.552 144.354 10.721Q143.611 9.889 142.514 9.889Q141.417 9.889 140.686 10.721Q139.947 11.552 139.947 13.145Q139.947 14.714 140.686 15.545Q141.417 16.377 142.514 16.377Z'
    ] },
    line: { w: 134, h: 23, top: 21, run1: 'M0 21H124.429V23H0Z', step: 'M124.329 23L124.379 23A2.5 2.5 0 0 0 126.146 22.268L129.268 19.146A0.5 0.5 0 0 1 129.621 19L129.671 19L129.671 17L129.621 17A2.5 2.5 0 0 0 127.854 17.732L124.732 20.854A0.5 0.5 0 0 1 124.379 21L124.329 21Z', run2: 'M129.571 17H134V19H129.571Z' }
  };

  function brandEn(o) {
    if (o && o.lang) return o.lang === 'en';
    try { return typeof SM.lang === 'function' && SM.lang() === 'en'; } catch (e) { return false; }
  }
  /* SM.brand.lockup(opts) -> inline SVG string.
     opts.line   true: add the green line + step (ja only; for ≥ 40 px tall, e.g. the launch splash)
     opts.lang   'ja' | 'en' (default: the current UI language)
     opts.label  false: aria-hidden (when the parent link already names it); default role="img" + aria-label
     opts.cls    extra class names
     opts.clipId with line: clip the wordmark at the line's top edge (id must be unique in the page), so the
                 glyphs can rise from behind the line. Static clip only (never animate the clip).
     Parts for animation (transform/opacity only, transform-box: fill-box):
       .lg-box · .lg-word > .lg-g1…lg-g5 (ja) / lg-g1…lg-g10 (en) · .lg-line > .lg-run1, .lg-step, .lg-run2 */
  function lockup(o) {
    o = o || {};
    var en = brandEn(o), W = en ? BR.en : BR.ja, line = !!o.line && !en;
    var w = line ? BR.line.w : W.w, h = line ? BR.line.h : W.h, i, s;
    var name = en ? 'Sudachi Map' : '巣立ちマップ';
    s = '<svg class="logo-lockup' + (en ? ' is-en' : '') + (line ? ' has-line' : '') + (o.cls ? ' ' + o.cls : '') +
      '" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '"' +
      (o.label === false ? ' aria-hidden="true"' : ' role="img" aria-label="' + name + '"') + ' overflow="visible" focusable="false">';
    var clip = line && o.clipId ? String(o.clipId).replace(/[^\w-]/g, '') : '';
    if (clip) s += '<defs><clipPath id="' + clip + '"><rect x="-4" y="-8" width="' + (w + 8) + '" height="' + (BR.line.top + 8) + '"/></clipPath></defs>';
    s += '<path class="lg-box" fill="currentColor" fill-rule="evenodd" d="' + BR.box + '"/>';
    s += '<g class="lg-word" fill="currentColor"' + (clip ? ' clip-path="url(#' + clip + ')"' : '') + '>';
    for (i = 0; i < W.g.length; i++) s += '<path class="lg-g' + (i + 1) + '" d="' + W.g[i] + '"/>';
    s += '</g>';
    if (line) s += '<g class="lg-line" style="fill:var(--action,#0b6e44)"><path class="lg-run1" d="' + BR.line.run1 +
      '"/><path class="lg-step" d="' + BR.line.step + '"/><path class="lg-run2" d="' + BR.line.run2 + '"/></g>';
    return s + '</svg>';
  }
  /* SM.brand.mark(cls) -> the 24-grid mark on its own (same drawing as SM.icon('logo')), role="img" */
  function mark(cls, label) {
    return '<svg class="logo' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" width="24" height="24"' +
      (label === false ? ' aria-hidden="true"' : ' role="img" aria-label="巣立ちマップ"') + ' focusable="false">' + LOGO + '</svg>';
  }
  /* @brand:end */

  function icon(name, cls) {
    var isLogo = name === 'logo' || name === 'bird';
    var inner = isLogo ? LOGO : (P[name] || '');
    var c = 'icon icon-' + String(name || 'none').replace(/[^a-z0-9-]/gi, '') + (cls ? ' ' + cls : '');
    return '<svg class="' + c + '" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="10" aria-hidden="true" focusable="false">' +
      inner + '</svg>';
  }

  SM.icon = icon;
  SM.brand = { mark: mark, lockup: lockup, data: BR };
  SM.icon.names = Object.keys(P).concat(['logo']);
})();
;
/* ---- js/components.js ---- */
/* 巣立ちマップ v5 — components.js (ENGINE; was SYSTEM)
   SM.CATS and SM.ui.* — every function returns an HTML string. See DESIGN.md §6.
   v5 (SPEC-v5 Part B, fewer words): programCard is lean by default (mark + name + one key fact + fact tags + save;
   {full:true} brings the v4 row back), listItem takes an amount / tags and no grey sub-line unless asked, fact tags
   (返さなくていい・締切・無料・24時間) via SM.ui.factTags, label/value strips via SM.ui.keyFacts, and a 「くわしく」
   expand-in-place disclosure via SM.ui.more(label, contentHtml, opts). Section heads rise and draw their rule.
   v4: one drawn arrow everywhere (SM.ui.arrow), chips that never shift when pressed (.chip-l), section heads
   whose 2px rule draws in (data-reveal="rule"), kanji marks that travel between screens (data-vt="cat"),
   spot illustrations in empty states (SM.illus, guarded), a bar progress for question flows.
   Every v2/v3 signature still works; new options are additive. */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};
  SM.ui = SM.ui || {};

  /* ---------- guards (core may load first; never assume) ---------- */
  function lang() { try { return SM.lang ? SM.lang() : 'ja'; } catch (e) { return 'ja'; } }
  function en() { return lang() === 'en'; }
  function esc(s) {
    if (SM.esc) return SM.esc(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function L(o) {
    if (o == null) return '';
    if (SM.L) return SM.L(o);
    if (typeof o === 'string') return o;
    return o[lang()] || o.ja || '';
  }
  var LOCAL = {};
  function t(key, vars) {
    var s;
    if (SM.t) { s = SM.t(key, vars); if (s && s !== key) return s; }
    var e = LOCAL[key]; s = e ? (e[lang()] || e.ja) : key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }
  function icon(n, c) { return SM.icon ? SM.icon(n, c) : ''; }
  function isSaved(id) { try { return SM.isSaved ? !!SM.isSaved(id) : false; } catch (e) { return false; } }
  /* SM.illus lands with ILLUS (js/illus.js, loaded after this file). Pictures are never essential: '' on any failure. */
  function illus(name, o) {
    if (!name || !SM.illus) return '';
    try { return SM.illus(name, o || {}) || ''; } catch (e) { return ''; }
  }

  /* ---------- strings ---------- */
  var STR = {
    // F22: one verb for one action — 保存 (it lands on やること; the title and the toast say so)
    'ui.save': { ja: '保存', en: 'Save' },
    'ui.saved': { ja: '保存ずみ', en: 'Saved' },
    'ui.saveHint': { ja: '保存（やることに入ります）', en: 'Save (adds it to your to-do list)' },
    'ui.amount': { ja: 'もらえる・使える', en: 'What you get' },
    'ui.amountMore': { ja: 'ほか', en: 'and more' },
    'ui.repay.none': { ja: '返さなくていい', en: 'No need to pay back' },
    'ui.repay.conditional': { ja: '条件しだいで返済なし', en: 'May not need to pay back' },
    'ui.repay.yes': { ja: 'あとで返す', en: 'Pay back later' },
    'ui.kind.service': { ja: '相談・サポート', en: 'Support' },
    'ui.kind.hotline': { ja: '相談窓口', en: 'Helpline' },
    'ui.kind.procedure': { ja: '手続き', en: 'Paperwork' },
    'ui.kind.housing': { ja: '住まい', en: 'Housing' },
    'ui.kind.place': { ja: '居場所', en: 'Drop-in place' },
    'ui.kind.grant': { ja: '返さなくていい', en: 'Grant' },
    'ui.kind.loan': { ja: '貸付', en: 'Loan' },
    'ui.basis.national': { ja: '国の制度', en: 'National' },
    'ui.basis.tokyo': { ja: '東京都', en: 'Tokyo' },
    'ui.basis.local': { ja: '区市町村', en: 'Local' },
    'ui.basis.npo': { ja: '民間の団体', en: 'Nonprofit' },
    'ui.right': { ja: '申請は権利', en: 'Your right' },
    'ui.always': { ja: 'いつでも', en: 'Anytime' },
    'ui.deadline': { ja: '締切あり', en: 'Has a deadline' },
    'ui.months': { ja: '申込 {m}', en: 'Apply: {m}' },
    'ui.before': { ja: '巣立つ{n}か月前まで', en: '{n} mo. before leaving' },
    'ui.after': { ja: '巣立って{n}か月以内', en: 'Within {n} mo. after leaving' },
    'ui.atleave': { ja: '巣立つころ', en: 'Around leaving' },
    'ui.why': { ja: 'あなたに合いそうな理由', en: 'Why this is shown' },
    'ui.whyShort': { ja: '理由', en: 'Why' },
    'ui.fact.repay': { ja: '返済', en: 'Repay' },
    'ui.fact.apply': { ja: '申込', en: 'Apply' },
    'ui.fact.when': { ja: '期限', en: 'When' },
    'ui.fact.kind': { ja: '種類', en: 'Type' },
    'ui.careOnly': { ja: '施設や里親家庭で育った人向け', en: 'For people who grew up in care' },
    'ui.step': { ja: '{n} / {total}', en: '{n} of {total}' },
    'ui.call': { ja: '電話する', en: 'Call' },
    'ui.phone': { ja: '電話', en: 'Phone' },
    'ui.line': { ja: 'LINEで相談', en: 'Chat on LINE' },
    'ui.chat': { ja: 'チャットで相談', en: 'Online chat' },
    'ui.web': { ja: '公式ページ', en: 'Official page' },
    'ui.hours': { ja: '受付時間', en: 'Hours' },
    'ui.free': { ja: '無料', en: 'Free' },
    'ui.more': { ja: 'もっと見る', en: 'See all' },
    'ui.details': { ja: 'くわしく', en: 'Details' },
    'ui.detailsClose': { ja: 'とじる', en: 'Close' },
    'ui.tag.grant': { ja: '返さなくていい', en: 'No payback' },
    'ui.tag.loan': { ja: 'あとで返す', en: 'Pay back later' },
    'ui.tag.cond': { ja: '返済なしの場合も', en: 'May be forgiven' },
    'ui.tag.deadline': { ja: '締切 {v}', en: 'Due {v}' },
    'ui.tag.deadlineAny': { ja: '締切あり', en: 'Deadline' },
    'ui.tag.free': { ja: '無料', en: 'Free' },
    'ui.tag.h24': { ja: '24時間', en: '24h' },
    'ui.tag.always': { ja: 'いつでも', en: 'Anytime' },
    'ui.tag.right': { ja: '申請は権利', en: 'Your right' },
    'ui.progress': { ja: '進みぐあい', en: 'Progress' }
  };
  LOCAL = STR;
  if (SM.strings) { try { SM.strings(STR); } catch (e) { /* ignore */ } }

  /* ---------- categories ----------
     mark = the one-kanji station-numbering mark; reading = its ふりがな (shown with ふりがな on).
     icon/tone kept for v2 callers. */
  SM.CATS = {
    housing:    { key: 'housing',    ja: '住まい',     en: 'Housing',         mark: '住', reading: 'すまい',   letter: 'H', icon: 'home',     tone: 'housing',
                  hint: { ja: '家・部屋・保証人', en: 'Home, room, guarantor' } },
    money:      { key: 'money',      ja: 'お金',       en: 'Money',           mark: '金', reading: 'おかね',   letter: 'M', icon: 'money',    tone: 'money',
                  hint: { ja: '生活費・給付・貸付', en: 'Living costs, grants, loans' } },
    education:  { key: 'education',  ja: '進学',       en: 'School',          mark: '学', reading: 'まなぶ',   letter: 'S', icon: 'school',   tone: 'education',
                  hint: { ja: '高校・大学・専門学校・奨学金', en: 'High school, college, scholarships' } },
    work:       { key: 'work',       ja: '仕事',       en: 'Work',            mark: '働', reading: 'はたらく', letter: 'W', icon: 'briefcase', tone: 'work',
                  hint: { ja: 'しごと探し・職場の悩み', en: 'Finding work, problems at work' } },
    procedures: { key: 'procedures', ja: '手続き',     en: 'Paperwork',       mark: '手', reading: 'てつづき', letter: 'P', icon: 'document', tone: 'procedures',
                  hint: { ja: '住民票・保険・年金', en: 'Residence, insurance, pension' } },
    consult:    { key: 'consult',    ja: '相談・こころ', en: 'Talk to someone', mark: '話', reading: 'そうだん', letter: 'T', icon: 'line',     tone: 'consult',
                  hint: { ja: 'だれかに話したい', en: 'When you want to talk' } }
  };
  SM.CAT_ORDER = ['housing', 'money', 'education', 'work', 'procedures', 'consult'];

  /* ---------- helpers ---------- */
  function attrs(a) { return a ? ' ' + a : ''; }
  function actAttrs(o) {
    var s = '';
    if (o.act) s += ' data-act="' + esc(o.act) + '"';
    return s + attrs(o.attrs);
  }

  /* arrow(dir?, cls?) — the one drawn arrow (base.css §3 masks the arrow-right geometry over the glyph).
     dir: 'r' (default) | 'l' | 'd' | 'u' | 'ne' (also 'right'/'left'/'down'/'up'/'back'/'out'). Decorative. */
  var ARROW_GLYPH = { r: '→', l: '←', d: '↓', u: '↑', ne: '↗' };
  var GLYPH_DIR = { '→': 'r', '←': 'l', '↓': 'd', '↑': 'u', '↗': 'ne' };
  function arrowDir(d) {
    d = String(d == null || d === true ? 'r' : d).toLowerCase();
    if (d === 'l' || d === 'left' || d === 'back' || d === 'prev') return 'l';
    if (d === 'd' || d === 'down') return 'd';
    if (d === 'u' || d === 'up') return 'u';
    if (d === 'ne' || d === 'out' || d === 'external') return 'ne';
    return 'r';
  }
  SM.ui.arrow = function (dir, cls) {
    var d = arrowDir(dir);
    return '<span class="arrow' + (d !== 'r' ? ' arrow-' + d : '') + (cls ? ' ' + esc(cls) : '') + '" aria-hidden="true">' + ARROW_GLYPH[d] + '</span>';
  };
  /* "質問に答える →" → {text:"質問に答える", dir:'r'}; "← 戻る" → {text:"戻る", lead:'l'} */
  function splitArrow(text) {
    var out = { text: text, dir: null, lead: null };
    var m = /\s*([→↓←↑↗])\s*$/.exec(text);
    if (m) { out.dir = GLYPH_DIR[m[1]]; out.text = text.slice(0, m.index); return out; }
    var ml = /^\s*←\s*/.exec(text);
    if (ml && ml[0].length < text.length) { out.lead = 'l'; out.text = text.slice(ml[0].length); }
    return out;
  }

  /* button(label, {act, href, variant, icon, iconEnd, arrow, attrs, block, size, external, cls, sub, disabled})
     variant: primary (solid action green — one per viewport) | ink (solid 墨) | secondary (1.5px ink outline)
              | soft (flat tint) | text (text link: no box, underline; the usual partner of a primary CTA)
              | ghost (v3 name of text) | danger (red outline) | sos (solid red, emergency only)
     size: 'lg' (56px) | 'md' (48, default) | 'sm' (44)
     arrow: true adds the drawn forward arrow; 'down' | 'left' | 'up' | 'ne' picks its direction; false never.
            Added automatically to primary / ink / text buttons that link inside the app ('#/…').
            A label ending in → ↓ ← ↑ (or starting with ←) is drawn with the matching arrow instead of the glyph.
     sub: a second line under the label (two-line CTA: "質問に答えてさがす / 6問・約3分 →"). */
  SM.ui.button = function (label, o) {
    o = o || {};
    var v = o.variant || 'primary';
    if (v === 'link') v = 'text';
    var size = o.size && o.size !== 'md' ? ' btn-' + o.size : '';
    var cls = 'btn btn-' + v + size + (o.block ? ' btn-block' : '') + (o.cls ? ' ' + o.cls : '');
    var sp = o.arrow === false ? { text: L(label), dir: null, lead: null } : splitArrow(L(label));
    var text = sp.text;
    var ext = !!o.href && (o.external || /^https?:/.test(o.href));
    var fwdEnd = o.iconEnd === 'arrow-right' || o.iconEnd === 'chevron-right';
    var dir = typeof o.arrow === 'string' ? arrowDir(o.arrow) : sp.dir;
    var arrow = !!dir || o.arrow === true || fwdEnd ||
      (o.arrow !== false && !o.iconEnd && !sp.lead && (v === 'primary' || v === 'ink' || v === 'text') && o.href && /^#\//.test(o.href));
    if (/[›>]\s*$/.test(text)) arrow = false;
    var end = arrow ? SM.ui.arrow(dir || 'r') : ext && !o.iconEnd ? icon('external', 'btn-ext') : (o.iconEnd ? icon(o.iconEnd) : '');
    var body = o.sub ?
      '<span class="btn-label"><span>' + esc(text) + '</span><small class="btn-sub">' + esc(L(o.sub)) + '</small></span>' :
      '<span>' + esc(text) + '</span>';
    var inner = (sp.lead ? SM.ui.arrow('l') : '') + (o.icon ? icon(o.icon) : '') + body + end +
      (ext ? '<span class="sr-only">' + esc(t('core.newtab')) + '</span>' : '');
    if (o.href) {
      return '<a class="' + cls + '" href="' + esc(o.href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') +
        (o.disabled ? ' aria-disabled="true" tabindex="-1"' : '') + actAttrs(o) + '>' + inner + '</a>';
    }
    return '<button type="button" class="' + cls + '"' + (o.disabled ? ' disabled' : '') + actAttrs(o) + '>' + inner + '</button>';
  };

  /* chip(label, {act, pressed, attrs, icon, cat, count, href}) — square toggle; the ink fill IS the state.
     The label is a .chip-l that reserves its bold width, so pressing never moves the row. */
  SM.ui.chip = function (label, o) {
    o = o || {};
    var lead = o.cat ? SM.ui.catIcon(o.cat, 'xs') : (o.icon ? icon(o.icon, 'chip-icon') : '');
    var lab = esc(L(label));
    var inner = lead + '<span class="chip-l" data-t="' + lab + '"><span>' + lab + '</span></span>' +
      (o.count != null ? '<span class="chip-count">' + esc(o.count) + '</span>' : '');
    // no ふりがな inside a chip (a reading breaks the 36px box and the reserved bold width); the screen's title carries it
    if (o.href) return '<a class="chip' + (o.pressed ? ' is-active' : '') + '" href="' + esc(o.href) + '"' + (o.pressed ? ' aria-current="page"' : '') + ' data-noruby' + actAttrs(o) + '>' + inner + '</a>';
    return '<button type="button" class="chip" aria-pressed="' + (o.pressed ? 'true' : 'false') + '" data-noruby' + actAttrs(o) + '>' + inner + '</button>';
  };

  /* tag(label, tone, iconName?) — flat 22px label. tones: free · loan · deadline · gov · local · npo · neutral · right
     · ink · action · sos. Icons are off by default; pass a name to force one. Max 2 tags in a row. */
  SM.ui.tag = function (label, tone, ic) {
    tone = tone || 'neutral';
    var i = typeof ic === 'string' && ic ? icon(ic) : '';
    return '<span class="tag tag-' + esc(tone) + '" data-noruby>' + i + esc(L(label)) + '</span>';
  };

  function areaName(code) {
    try { var a = SM.area ? SM.area(code) : null; if (a) return en() ? (a.en || a.name) : a.name; } catch (e) { }
    return null;
  }

  /* deadline → {text (full, v2 format), label (short dt), value (dd), tone} */
  function deadlineInfo(d) {
    if (!d) return null;
    if (d.months && d.months.length) {
      var m = d.months.slice().sort(function (a, b) { return a - b; });
      var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      var f = function (x) { return en() ? M[x - 1] : x + '月'; };
      var s = m.length === 1 ? f(m[0]) : f(m[0]) + (en() ? '–' : '〜') + f(m[m.length - 1]);
      var contiguous = m.every(function (x, i) { return i === 0 || x === m[i - 1] + 1; });
      if (!contiguous) s = m.length > 3 ? (en() ? m.length + '×/year' : '年' + m.length + '回') : m.map(f).join(en() ? ', ' : '・');
      return { text: t('ui.months', { m: s }), label: t('ui.fact.apply'), value: s, tone: 'deadline' };
    }
    if (typeof d.leaveMonths === 'number') {
      var n = d.leaveMonths, v;
      if (n < 0) v = t('ui.before', { n: -n });
      else if (n > 0) v = t('ui.after', { n: n });
      else v = t('ui.atleave');
      return { text: v, label: t('ui.fact.when'), value: v, tone: 'deadline' };
    }
    if (d.always) return { text: t('ui.always'), label: t('ui.fact.apply'), value: t('ui.always'), tone: 'muted' };
    var txt = L(d);
    return txt ? { text: txt, label: t('ui.fact.when'), value: txt, tone: 'deadline' } : null;
  }
  SM.ui.deadlineShort = function (d) { var x = deadlineInfo(d); return x ? x.text : ''; };

  function repayInfo(p) {
    if (p.repay === 'none' || (!p.repay && p.kind === 'grant')) return { text: t('ui.repay.none'), tone: 'free' };
    if (p.repay === 'conditional' || p.kind === 'loan_forgivable') return { text: t('ui.repay.conditional'), tone: 'loan' };
    if (p.repay === 'yes' || p.kind === 'loan') return { text: t('ui.repay.yes'), tone: 'loan' };
    return null;
  }
  SM.ui.repayLabel = function (p) { var r = repayInfo(p || {}); return r ? r.text : ''; };

  function basisLabel(p) {
    if (p.basis === 'local') {
      var codes = (p.for && p.for.areas) || [];
      var nm = codes.length === 1 && codes[0].length === 5 ? areaName(codes[0]) : null;
      return nm || t('ui.basis.local');
    }
    return p.basis ? t('ui.basis.' + p.basis) : '';
  }
  SM.ui.basisLabel = function (p) { return basisLabel(p || {}); };

  /* programTags(p, {skipRepay, skipDeadline, showCareOnly}) */
  SM.ui.programTags = function (p, o) {
    if (!p) return '';
    o = o || {};
    var out = [];
    if (!o.skipRepay) {
      var r = repayInfo(p);
      if (r) out.push(SM.ui.tag(r.text, r.tone));
      else if (p.kind && STR['ui.kind.' + p.kind]) out.push(SM.ui.tag(t('ui.kind.' + p.kind), 'neutral'));
    }
    if (p.basis) {
      var tone = p.basis === 'local' ? 'local' : p.basis === 'npo' ? 'npo' : 'gov';
      out.push(SM.ui.tag(basisLabel(p), tone));
    }
    if (p.right) out.push(SM.ui.tag(t('ui.right'), 'right'));
    if (!o.skipDeadline) {
      var d = deadlineInfo(p.deadline);
      if (d && d.tone === 'deadline') out.push(SM.ui.tag(d.text, 'deadline'));
    }
    if (p.for && p.for.careOnly && o.showCareOnly) out.push(SM.ui.tag(t('ui.careOnly'), 'neutral'));
    return out.length ? '<div class="tags">' + out.join('') + '</div>' : '';
  };

  /* catIcon(cat, size?: 'xs' 24 | 'sm' 32 (default) | 'lg' 56 | 'xl' 80, {reading, label, vt, hero})
     reading: true always shows the ふりがな under the mark; by default it shows only when ふりがな is on.
     label: true puts the category name to the right (a "sign" like 住 住まい).
     vt: true marks the square as the SOURCE of the shared category morph (list rows; MOTION-SPEC §3.4).
     hero: true marks it as the DESTINATION (program / category / lesson headers). */
  SM.ui.catIcon = function (cat, size, o) {
    if (size && typeof size === 'object') { o = size; size = o.size; }
    o = o || {};
    var c = SM.CATS[cat] || SM.CATS.procedures;
    var lab = o.label ? '<span class="cat-name">' + esc(en() ? c.en : c.ja) + '</span>' : '';
    var vt = o.hero ? ' data-vt-hero="cat"' : o.vt ? ' data-vt="cat"' : '';
    return '<span class="cat-icon cat-' + esc(c.key) + (size ? ' is-' + esc(size) : '') + (o.label ? ' has-label' : '') + (o.reading ? ' has-reading' : '') + '">' +
      '<span class="cat-stack" aria-hidden="true" data-noruby><span class="cat-mark"' + vt + '>' + c.mark + '</span>' +
      '<span class="cat-reading">' + esc(c.reading) + '</span></span>' + lab + '</span>';
  };
  SM.ui.catMark = SM.ui.catIcon;

  /* listedCount() — how many distinct supports the site lists. A national record that has a
     Tokyo version (SM.tokyoVersion) counts once, so home, about and さがす all show one number. */
  SM.ui.listedCount = function () {
    var ps = (SM.data && SM.data.programs) || [], tv = SM.tokyoVersion || {};
    return ps.filter(function (p) { return p && p.id && !tv[p.id]; }).length;
  };
  SM.ui.catLabel = function (cat) { var c = SM.CATS[cat]; return c ? (en() ? c.en : c.ja) : ''; };

  /* num(value, unit?, {style: 'hero'|'xl'|'l'|'inline' (default), count, countSeen, cls})
     A number set in Plex 700 with its unit small (222件 · あと165日). count: true lets SM.motion roll it
     like a station board when it reveals (data-count); the real number is always in the DOM. */
  SM.ui.num = function (value, unit, o) {
    if (unit && typeof unit === 'object') { o = unit; unit = o.unit; }
    o = o || {};
    var st = o.style || 'inline';
    var cls = st === 'hero' ? 'num-hero' : st === 'xl' ? 'num-xl' : st === 'l' ? 'ts-num-l' : 'ts-num-inline';
    var n = String(value == null ? '' : value);
    var plain = n.replace(/[,，]/g, '');
    var ct = o.count && /^\d+(\.\d+)?$/.test(plain) ? ' data-count="' + esc(plain) + '"' + (o.countSeen ? ' data-count-seen="' + esc(o.countSeen) + '"' : '') : '';
    return '<span class="num ' + cls + (o.cls ? ' ' + esc(o.cls) : '') + '"><span class="num-v"' + ct + '>' + esc(n) + '</span>' +
      (unit ? '<span class="unit">' + esc(L(unit)) + '</span>' : '') + '</span>';
  };

  function whyText(why) {
    if (!why) return '';
    if (!Array.isArray(why)) why = [why];
    return why.map(function (w) { return L(w); }).filter(Boolean).join(en() ? ' · ' : '・');
  }

  /* normAmount(s): one way to write money. A bare group of 4+ digits that is money (2万7400円, 7400円) gets its
     thousands separators (2万7,400円); years and other counts (2026年度) are left alone. */
  function normAmount(s) {
    return String(s == null ? '' : s).replace(/(^|[^0-9０-９,，.．])([0-9]{4,})(?![0-9,，.．])(?=\s*[万円千億])/g, function (m, pre, d) {
      return pre + d.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    });
  }
  SM.ui.normAmount = normAmount;

  /* emphasise the money inside an amount string: 月5万円 → 月<b class="amt-n">5</b>万円.
     Only a number that IS money or a count is enlarged: digits followed by 円 万 千 億 件 日 % (or a range to one,
     30〜80%). Years, ages, months and times (2026年度, 18歳, 3か月, 4月1日, 1回30分) stay at text size.
     Each compound number (年45万7,200円 → "45万7,200円") is grouped so it never breaks across lines. */
  var AMT_RE = /[0-9０-９][0-9０-９,，.．]*(?:[万千億](?:[0-9０-９][0-9０-９,，.．]*)?)*(?:\s*[〜~～\-–]\s*[0-9０-９][0-9０-９,，.．]*(?:[万千億](?:[0-9０-９][0-9０-９,，.．]*)?)*)?(?:円|件|%|％|日(?!本))?/g;
  function amountHtml(s) {
    s = normAmount(s);
    var out = '', last = 0, m;
    AMT_RE.lastIndex = 0;
    while ((m = AMT_RE.exec(s))) {
      var g = m[0].replace(/[,，.．]+$/, '');
      if (!g) { AMT_RE.lastIndex++; continue; }
      AMT_RE.lastIndex = m.index + g.length;
      // money or a count carries its unit inside the match; a day after a month is a date (4月1日), not a count
      var money = /[万千億円件%％]/.test(g) ||
        (/日$/.test(g) && s.charAt(m.index - 1) !== '月' && !/^(あたり|ごと|に)/.test(s.slice(m.index + g.length)));
      out += esc(s.slice(last, m.index));
      out += money ?
        '<span class="amt-g">' + esc(g).replace(/([0-9０-９][0-9０-９,，.．]*)/g, '<b class="amt-n">$1</b>') + '</span>' :
        esc(g);
      last = m.index + g.length;
    }
    return out + esc(s.slice(last));
  }
  SM.ui.amountHtml = amountHtml;

  /* amountClause(s) → {text, more}: the headline of an amount, for list rows — a short label and one amount, never a
     sentence. Rows never cut inside an amount: the clause ends at the first point of a list (／ · " / " · "; "), at a
     full stop, at the first 「まで」 that a list follows, or (for a long list) at the first ・ ＋ 、 (", " " + ") that closes
     an amount. Asides in （ ） are dropped; when the only amount is inside one (授業料の分（全日制 月9,900円＝
     年11万8,800円）を国が学校に払う) the row reads label + that amount: 「授業料 年11万8,800円」.
     more: true when something was left for the program page. */
  var AMT_JA = /(?:(?:月|年|1日|1回)\s*)?(?:最大\s*)?[0-9０-９][0-9０-９,，.．]*(?:[万千億][0-9０-９,，.．]*)*円(?:まで)?/g;
  var AMT_EN = /(?:(?:up to|≤)\s*)?¥\s*[0-9][0-9,.]*k?(?:\s*\/\s*(?:month|mo|year|yr))?/g;
  function lastAmount(s, ja) { var m = String(s).match(ja ? AMT_JA : AMT_EN); return m ? m[m.length - 1].trim() : ''; }
  // the text with everything inside （ ）/( ) blanked out (same length), so a search only sees the top level
  function topLevel(s) {
    var out = '', depth = 0;
    for (var k = 0; k < s.length; k++) {
      var ch = s.charAt(k);
      if (ch === '（' || ch === '(') { depth++; out += '\u0000'; }
      else if ((ch === '）' || ch === ')') && depth > 0) { depth--; out += '\u0000'; }
      else out += depth ? '\u0000' : ch;
    }
    return out;
  }
  function amountClause(s) {
    s = String(s == null ? '' : s).trim();
    if (!s) return { text: '', more: false };
    var more = false;
    var ja = /[\u3040-\u30ff\u3400-\u9fff]/.test(s);
    var hasAmt = ja ? /[0-9０-９][0-9０-９,，.．]*\s*[万千億円%％]/ : /¥\s*[0-9]|[0-9]\s*%/;
    // the first point of a list, or the first sentence (top level only: a ； inside （ ） is part of the aside)
    var cut = topLevel(s).search(ja ? /\s*[／。]/ : s.length > 40 ? /\s+\/\s+|;\s+|\.\s+/ : /\s+\/\s+|\.\s+/);
    if (cut > 0) { s = s.slice(0, cut); more = true; }
    // asides go — unless the aside holds the only amount
    var bare = s.replace(/\s*（[^）]*）|\s*\([^)]*\)/g, '').trim();
    if (/[0-9０-９]/.test(bare) || !/[0-9０-９]/.test(s)) s = bare;
    else {
      var am = s.match(ja ? /（([^）]*)）/ : /\(([^)]*)\)/);
      var inner = am ? am[1] : '', amt = '';
      inner.split(ja ? /[、。；;]\s*/ : /;\s*|,\s+/).some(function (piece) { amt = lastAmount(piece, ja); return !!amt; });
      var label = ja ? bare.split(/の(?:分|額|一部)|[をがはに、]/)[0].trim() : bare.replace(/^(?:covers|pays?|your)\s+/i, '').trim();
      if (amt && label && label.length <= (ja ? 8 : 20)) {
        if (!ja) {
          if (/\bcap/i.test(inner) && !/up to|≤/.test(amt)) amt = 'up to ' + amt;
          label = label.charAt(0).toUpperCase() + label.slice(1);
        }
        s = label + ' ' + amt; more = true;
      } else {
        s = s.replace(/（([^）]*)）/, function (m0, inner2) {
          var c = inner2.search(/[、・]/);
          if (c > 0 && hasAmt.test(inner2.slice(0, c))) { more = true; return '（' + inner2.slice(0, c) + '）'; }
          return m0;
        });
      }
    }
    // a list of amounts: stop after the first 「…まで」, or (when long) after the first piece that closes an amount
    var made = ja ? s.search(/まで[・、＋]/) : -1;
    if (made > 0) { s = s.slice(0, made + 2); more = true; }
    else if (s.length > (ja ? 34 : 48)) {
      var re = ja ? /[・、＋]/g : /,\s+|\s+\+\s+/g, m, top = topLevel(s);
      while ((m = re.exec(top))) {
        var left = s.slice(0, m.index);
        if (left.length >= 4 && hasAmt.test(left)) { s = left; more = true; break; }
      }
    }
    s = s.replace(/[。、・＋,;:\s]+$/, '');
    return { text: s, more: more };
  }
  SM.ui.amountClause = amountClause;

  /* factSplit(text) → {head, rest}: a fact written as a sentence (締切: 「毎年4月1日から受付。締切は区市町村に
     よって…」) becomes a short headline (the first clause, asides in （ ） moved to the detail) and the rest.
     Rows show the head; detail views show the head in the fact's colour and the rest as plain meta text. */
  function factSplit(v) {
    v = String(v == null ? '' : v).trim();
    if (!v) return { head: '', rest: '' };
    var ja = /[\u3040-\u30ff\u3400-\u9fff]/.test(v);
    var head = v, rest = '';
    // the first full stop outside （ ）
    var i = -1, depth = 0;
    for (var k = 0; k < v.length; k++) {
      var ch = v.charAt(k);
      if (ch === '（' || ch === '(') depth++;
      else if ((ch === '）' || ch === ')') && depth > 0) depth--;
      else if (!depth && (ja ? ch === '。' : (ch === '.' || ch === ';') && /^(\s|$)/.test(v.charAt(k + 1)))) { i = k; break; }
    }
    if (i > 0 && i < v.length - 1) { head = v.slice(0, i); rest = v.slice(i + 1).trim(); }
    else if (i > 0) { head = v.slice(0, i); }
    // an aside in the head goes to the detail: 入学したときに申請します（2026年度は…） → 入学したときに申請します
    var pm = head.match(ja ? /\s*（([^）]*)）/ : /\s*\(([^)]*)\)/);
    if (pm && pm.index > 3) {
      var aside = pm[1].trim();
      head = (head.slice(0, pm.index) + head.slice(pm.index + pm[0].length)).trim();
      if (!ja) aside = aside.charAt(0).toUpperCase() + aside.slice(1);
      rest = aside + (ja ? '。' : '. ') + rest;
    }
    if (!ja && rest) rest = rest.charAt(0).toUpperCase() + rest.slice(1);
    return { head: head.replace(/[。.;\s]+$/, ''), rest: rest.trim() };
  }
  SM.ui.factSplit = factSplit;

  SM.ui.amount = function (s, o) {
    o = o || {};
    var v = L(s);
    return v ? '<p class="amount' + (o.size ? ' amount-' + esc(o.size) : '') + '">' + amountHtml(v) + '</p>' : '';
  };

  /* factTag(kind[, value]) — one fact as a flat 22px tag, never a sentence.
     kinds: grant (返さなくていい, green) · loan (あとで返す, amber) · cond (返済なしの場合も, amber) · deadline (締切 {value},
     amber; no value → 締切あり) · free (無料, green) · h24 (24時間, ink outline) · always (いつでも) · right (申請は権利). */
  var FACT_TONE = { grant: 'free', loan: 'loan', cond: 'loan', deadline: 'deadline', free: 'free', h24: 'right', always: 'neutral', right: 'right' };
  SM.ui.factTag = function (kind, value) {
    if (!FACT_TONE[kind]) return '';
    var label = kind === 'deadline' ? (value ? t('ui.tag.deadline', { v: L(value) }) : t('ui.tag.deadlineAny')) : t('ui.tag.' + kind);
    return '<span class="tag tag-' + FACT_TONE[kind] + ' tag-fact" data-fact="' + esc(kind) + '" data-noruby>' + esc(label) + '</span>';
  };
  /* programFacts(p, {max, skip:[kinds]}) -> [{kind, value}] — the facts a row can show as tags, most useful first:
     返済 (grant / loan / cond), 締切 (short), 無料 (free dial), 24時間, 申請は権利. */
  function shortDeadline(d) {
    var x = deadlineInfo(d);
    if (!x || x.tone !== 'deadline') return null;
    var v = factSplit(x.value).head;
    return v.length > (en() ? 18 : 10) ? null : v;
  }
  SM.ui.programFacts = function (p, o) {
    o = o || {};
    if (!p) return [];
    var skip = o.skip || [], out = [];
    var add = function (k, v) { if (skip.indexOf(k) === -1) out.push({ kind: k, value: v }); };
    if (p.repay === 'none' || (!p.repay && p.kind === 'grant')) add('grant');
    else if (p.repay === 'conditional' || p.kind === 'loan_forgivable') add('cond');
    else if (p.repay === 'yes' || p.kind === 'loan') add('loan');
    var di = deadlineInfo(p.deadline);
    // leaveMonths is planning timing (when to start), not a cut-off: some of these can be used for years after leaving
    if (di && di.tone === 'deadline' && typeof (p.deadline || {}).leaveMonths !== 'number') add('deadline', shortDeadline(p.deadline));
    var c = p.contact || {};
    var hours = L(c.hours) || '';
    if (/24\s*時間|24\s*h|24 hours/i.test(hours)) add('h24');
    if (c.phone && /^0120|^0800/.test(String(c.phone).replace(/\D/g, ''))) add('free');
    if (p.right) add('right');
    return out.slice(0, o.max || 3);
  };
  /* factTags(p | [{kind, value}], {max, skip}) -> '<span class="tags tags-fact">…</span>' ('' when none; a span, so it
     is valid inside a link or button row) */
  SM.ui.factTags = function (src, o) {
    var list = Array.isArray(src) ? src : SM.ui.programFacts(src, o);
    if (o && o.max) list = list.slice(0, o.max);
    var html = list.map(function (f) { return SM.ui.factTag(f.kind, f.value); }).join('');
    return html ? '<span class="tags tags-fact">' + html + '</span>' : '';
  };

  /* keyFacts([{label, value, tone, unit, html}], {cls}) — facts as format, not sentences: a strip of label/value cells
     (big value, small label above), 2–3 per row on phones. value is text ({ja,en} ok; numbers inside are set big by
     amountHtml); html: trusted value markup instead. tone: free (green) · deadline / loan (amber) · muted. */
  SM.ui.keyFacts = function (rows, o) {
    o = o || {};
    var cells = (rows || []).filter(function (r) { return r && (r.html || (r.value != null && r.value !== '')); }).map(function (r) {
      var v = r.html != null ? r.html : amountHtml(L(r.value));
      return '<div class="kf' + (r.tone ? ' kf-' + esc(r.tone) : '') + '"><dt class="kf-k">' + esc(L(r.label)) + '</dt>' +
        '<dd class="kf-v">' + v + (r.unit ? '<span class="unit">' + esc(L(r.unit)) + '</span>' : '') + '</dd></div>';
    });
    return cells.length ? '<dl class="keyfacts' + (o.cls ? ' ' + esc(o.cls) : '') + '" data-reveal-stagger="50">' + cells.join('') + '</dl>' : '';
  };

  /* more(label, contentHtml, {open, id, closeLabel, cls, inline}) — 「くわしく」: a disclosure that opens IN PLACE.
     A real <button aria-expanded aria-controls> + a region (hidden when closed). The engine animates it (space opens,
     the content drops in; SM.motion.expand). label defaults to くわしく / Details; closeLabel (default: the same label)
     is shown while open. contentHtml is trusted HTML. inline:true renders a quiet text-size trigger (inside cards). */
  var moreSeq = 0;
  SM.ui.more = function (label, content, o) {
    if (label && typeof label === 'object' && !label.ja && !label.en) { o = label; label = null; }
    o = o || {};
    var id = o.id || 'more-' + (++moreSeq) + '-' + Math.random().toString(36).slice(2, 6);
    var lab = label ? L(label) : t('ui.details');
    var lab2 = o.closeLabel ? L(o.closeLabel) : lab;
    var open = !!o.open;
    return '<div class="more' + (o.inline ? ' more-inline' : '') + (open ? ' is-open' : '') + (o.cls ? ' ' + esc(o.cls) : '') + '">' +
      '<button type="button" class="more-btn" data-act="more" aria-expanded="' + open + '" aria-controls="' + esc(id) + '"' +
        ' data-label="' + esc(lab) + '" data-label-open="' + esc(lab2) + '">' +
        '<span class="more-l">' + esc(open ? lab2 : lab) + '</span><span class="more-ic" aria-hidden="true"></span></button>' +
      '<div class="more-body" id="' + esc(id) + '" role="region" aria-label="' + esc(lab) + '"' + (open ? '' : ' hidden') + '>' + (content || '') + '</div>' +
    '</div>';
  };
  function moreToggle(btn) {
    var box = btn.closest ? btn.closest('.more') : null;
    var body = box ? box.querySelector(':scope > .more-body') : null;
    if (!box || !body) return;
    var open = btn.getAttribute('aria-expanded') !== 'true';
    var lab = btn.querySelector('.more-l');
    var set = function (v) {
      body.hidden = !v;
      box.classList.toggle('is-open', v);
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    };
    var nextLabel = open ? btn.getAttribute('data-label-open') : btn.getAttribute('data-label');
    if (lab && nextLabel && lab.textContent !== nextLabel) lab.textContent = nextLabel;
    if (SM.motion && typeof SM.motion.expand === 'function') {
      // the button's own state flips now (screen readers hear it at once); the region follows with the animation
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      box.classList.toggle('is-open', open);
      SM.motion.expand(box, open, { setOpen: set, body: body });
    } else set(open);
    if (open && SM.applyRuby) { try { SM.applyRuby(body); } catch (e) { } }
  }
  SM.ui.moreToggle = moreToggle;
  if (SM.on) SM.on('more', function (el) { moreToggle(el); });

  /* programCard(p, {why, compact, showSave, href, headingLevel, vt, full, hook, whyInline, facts, tags}) — a ruled row.
     v5 default (lean, SPEC-v5 Part B): [32 mark]  name / ONE key fact (the amount's headline) / fact tags
     (返さなくていい・締切・無料・24時間, max 3)   [☆ 44]. No eyebrow, no grey summary line, no labelled facts: the program
     page carries them. hook:true adds the one-line hook back; whyInline:true shows the 理由 line (otherwise the reason
     is read to screen readers only); tags:false drops the tags; facts: [{kind,value}] overrides them.
     full:true renders the v4 row (eyebrow / title / hook / amount / labelled facts / 理由).
     The mark and the title are the sources of the shared morph into the program page (vt:false turns that off).
     The article carries data-id so a back navigation finds the row again. */
  SM.ui.programCard = function (p, o) {
    if (!p) return '';
    o = o || {};
    if (!o.full) return leanCard(p, o);
    var cat = (p.cat && p.cat[0]) || 'procedures';
    var href = o.href || '#/p/' + encodeURIComponent(p.id);
    var h = 'h' + (o.headingLevel || 3);
    var saved = isSaved(p.id);
    var name = L(p.name);
    var showSave = o.showSave !== false;

    var basisTone = p.basis === 'local' ? 'local' : p.basis === 'npo' ? 'npo' : p.basis ? 'gov' : '';
    var eyebrow = [];
    if (p.basis) eyebrow.push('<span class="pcard-basis pcard-basis-' + basisTone + '">' + esc(basisLabel(p)) + '</span>');
    eyebrow.push('<span class="pcard-cat">' + esc(SM.ui.catLabel(cat)) + '</span>');
    if (p.right) eyebrow.push('<span class="pcard-right">' + esc(t('ui.right')) + '</span>');

    var line = o.compact ? (L(p.hook) || L(p.summary)) : (L(p.summary) || L(p.hook));
    var amount = L(p.amount);
    var amt = amount ? amountClause(amount) : null;   // rows show the first clause; the rest is on the program page
    var r = repayInfo(p);
    var d = deadlineInfo(p.deadline);

    var facts = '';
    if (r) facts += '<div class="pf pf-' + r.tone + '"><dt>' + esc(t('ui.fact.repay')) + '</dt><dd>' + esc(r.text) + '</dd></div>';
    else if (p.kind && STR['ui.kind.' + p.kind] && !o.compact) facts += '<div class="pf"><dt>' + esc(t('ui.fact.kind')) + '</dt><dd>' + esc(t('ui.kind.' + p.kind)) + '</dd></div>';
    // a fact written as a sentence shows its headline only (one line); the whole sentence is on the program page
    var dv = d ? factSplit(d.value) : null;
    if (d) facts += '<div class="pf pf-' + (d.tone === 'deadline' ? 'deadline' : 'muted') + '"><dt>' + esc(d.label) + '</dt><dd' + (dv.rest ? ' title="' + esc(d.value) + '"' : '') + '>' + esc(dv.head) + '</dd></div>';

    var w = whyText(o.why);
    var why = w ? '<p class="pcard-why"><span class="pcard-why-k" aria-hidden="true">' + esc(t('ui.whyShort')) + '</span><span><span class="sr-only">' + esc(t('ui.why')) + ': </span>' + esc(w) + '</span></p>' : '';

    var save = showSave ?
      '<button type="button" class="pcard-save" data-act="save" data-id="' + esc(p.id) + '" aria-pressed="' + saved + '" aria-label="' + esc(t('ui.save') + '：' + name) + '" title="' + esc(t('ui.saveHint')) + '">' +
      icon(saved ? 'star-fill' : 'star') + '</button>' : '';

    return '<article class="pcard' + (o.compact ? ' pcard-compact' : '') + (saved ? ' is-saved' : '') + '" data-id="' + esc(p.id) + '" data-cat="' + esc(cat) + '">' +
      '<div class="pcard-mark">' + SM.ui.catIcon(cat, null, { vt: o.vt !== false }) + '</div>' +
      '<div class="pcard-main">' +
        '<p class="pcard-eyebrow">' + eyebrow.join('<span class="pcard-sep" aria-hidden="true">／</span>') + '</p>' +
        '<' + h + ' class="pcard-title"' + (o.vt !== false ? ' data-vt="title"' : '') + '><a class="pcard-link" href="' + esc(href) + '">' + esc(name) + '</a></' + h + '>' +
        (line ? '<p class="pcard-hook">' + esc(line) + '</p>' : '') +
        (amt && !o.compact ? '<p class="pcard-amount"><span class="sr-only">' + esc(t('ui.amount')) + ': </span>' + amountHtml(amt.text) +
          (amt.more ? '<span class="pcard-amount-more">' + esc(t('ui.amountMore')) + '</span>' : '') + '</p>' : '') +
        (facts ? '<dl class="pcard-facts">' + facts + '</dl>' : '') +
        why +
      '</div>' + save +
    '</article>';
  };

  function leanCard(p, o) {
    var cat = (p.cat && p.cat[0]) || 'procedures';
    var href = o.href || '#/p/' + encodeURIComponent(p.id);
    var h = 'h' + (o.headingLevel || 3);
    var saved = isSaved(p.id);
    var name = L(p.name);
    var showSave = o.showSave !== false;
    var amount = L(p.amount);
    var amt = amount ? amountClause(amount) : null;
    var key = '';
    if (amt && amt.text && !o.compact) {
      key = '<p class="pcard-key pcard-amount"><span class="sr-only">' + esc(t('ui.amount')) + ': </span>' + amountHtml(amt.text) + '</p>';
    }
    var facts = o.facts || SM.ui.programFacts(p, { max: 3 });
    var tags = o.tags === false ? '' : SM.ui.factTags(facts);
    var hook = o.hook ? (L(p.hook) || L(p.summary)) : '';
    var w = whyText(o.why);
    var why = !w ? '' : o.whyInline ?
      '<p class="pcard-why"><span class="pcard-why-k" aria-hidden="true">' + esc(t('ui.whyShort')) + '</span><span><span class="sr-only">' + esc(t('ui.why')) + ': </span>' + esc(w) + '</span></p>' :
      '<p class="sr-only">' + esc(t('ui.why')) + ': ' + esc(w) + '</p>';
    var save = showSave ?
      '<button type="button" class="pcard-save" data-act="save" data-id="' + esc(p.id) + '" aria-pressed="' + saved + '" aria-label="' + esc(t('ui.save') + '：' + name) + '" title="' + esc(t('ui.saveHint')) + '">' +
      icon(saved ? 'star-fill' : 'star') + '</button>' : '';
    return '<article class="pcard pcard-lean' + (o.compact ? ' pcard-compact' : '') + (saved ? ' is-saved' : '') + '" data-id="' + esc(p.id) + '" data-cat="' + esc(cat) + '">' +
      '<div class="pcard-mark">' + SM.ui.catIcon(cat, null, { vt: o.vt !== false }) + '</div>' +
      '<div class="pcard-main">' +
        '<' + h + ' class="pcard-title"' + (o.vt !== false ? ' data-vt="title"' : '') + '><a class="pcard-link" href="' + esc(href) + '">' + esc(name) + '</a></' + h + '>' +
        (hook ? '<p class="pcard-hook">' + esc(hook) + '</p>' : '') +
        key + tags + why +
      '</div>' + save +
    '</article>';
  }

  /* sectionHeader(title, {sub, action: html | {label, href, act, arrow}, level, id, num, plain, reveal, cls})
     The one section head for every view:   01  困りごとから見る                 すべて見る →
                                                いちばん近いものをえらんでね
                                            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  (2px ink)
     num + seq: true → "01". Section numerals are for REAL sequences only (the steps of a tool: 1 用件 → 2 空らん →
     3 台本). A page's sections are not a sequence, so a num without seq is ignored (v4 round 3: the "01 ──" index
     read as decoration and drifted by persona). plain: true drops the rule.
     The rule is its own element (.section-rule) and draws in from the left when revealed (data-reveal="rule");
     v5: the title block rises 28px with it (data-reveal on .section-head-text) and the rule follows 80ms later, both
     as they scroll into view. reveal: false keeps both static (in-place re-renders). */
  SM.ui.sectionHeader = function (title, o) {
    o = o || {};
    var lv = 'h' + (o.level || 2);
    var act = '';
    if (o.action) {
      act = typeof o.action === 'string' ? o.action :
        '<a class="section-action" href="' + esc(o.action.href) + '"' + (o.action.act ? ' data-act="' + esc(o.action.act) + '"' : '') + '><span>' + esc(L(o.action.label || t('ui.more'))) + '</span>' + SM.ui.arrow(o.action.arrow || 'r') + '</a>';
    }
    var num = o.seq && o.num != null && o.num !== '' ? '<span class="section-num" aria-hidden="true">' + esc(typeof o.num === 'number' ? (o.num < 10 ? '0' + o.num : String(o.num)) : o.num) + '</span>' : '';
    var rv = o.reveal !== false;
    var rule = o.plain ? '' : '<span class="section-rule"' + (rv ? ' data-reveal="rule" data-reveal-delay="80"' : '') + ' aria-hidden="true"></span>';
    return '<div class="section-head' + (o.plain ? ' is-plain' : '') + (o.cls ? ' ' + esc(o.cls) : '') + '"><div class="section-head-text"' + (rv ? ' data-reveal="up"' : '') + '>' + num +
      '<' + lv + ' class="section-title"' + (o.id ? ' id="' + esc(o.id) + '"' : '') + '>' + esc(L(title)) + '</' + lv + '>' +
      (o.sub ? '<p class="section-sub">' + esc(L(o.sub)) + '</p>' : '') + '</div>' + act + rule + '</div>';
  };

  /* empty(title, body, actionHtml, {illus, level}) — spot illustration (200px phone / 240 desktop, left-aligned)
     + title + one kind line + one action. No heavy rule. illus: an SM.illus name ('results-empty', 'saved-empty',
     'plan-empty', 'map-empty', 'not-found'); left out or unknown → no picture. level: 2|3 makes the title a heading
     (default: a paragraph styled as h3, so it never breaks the page's heading order). A 4th argument that is not an
     object (v3 callers) is ignored. */
  SM.ui.empty = function (title, body, actionHtml, o) {
    o = o && typeof o === 'object' ? o : {};
    var art = o.illus ? illus(o.illus, { size: 'spot', label: o.illusLabel, cls: 'empty-il' }) : '';
    var tg = o.level ? 'h' + (+o.level || 3) : 'p';
    return '<div class="empty' + (art ? ' has-il' : '') + '">' + art +
      '<' + tg + ' class="empty-title">' + esc(L(title)) + '</' + tg + '>' +
      (body ? '<p class="empty-body">' + esc(L(body)) + '</p>' : '') +
      (actionHtml ? '<div class="empty-action">' + actionHtml + '</div>' : '') + '</div>';
  };

  /* callout(html, tone, {icon, title}) — flat tint with a 2px top rule in the tone colour. html is trusted.
     tones: info · warn · safe · danger. No icon by default (v4: callouts carry no icons). */
  SM.ui.callout = function (html, tone, o) {
    tone = tone || 'info'; o = o || {};
    return '<div class="callout callout-' + esc(tone) + '"' + (tone === 'danger' || tone === 'warn' ? ' role="note"' : '') + '>' +
      (o.icon ? icon(o.icon) : '') +
      '<div class="callout-body">' + (o.title ? '<b class="callout-title">' + esc(L(o.title)) + '</b>' : '') + '<div>' + html + '</div></div></div>';
  };

  /* kv(rows) — rows: [[label, valueHtml], ...]; label is text ({ja,en} ok), value is trusted HTML ({ja,en} -> escaped) */
  SM.ui.kv = function (rows) {
    return '<dl class="kv">' + (rows || []).filter(function (r) { return r && r[1] != null && r[1] !== ''; }).map(function (r) {
      var v = typeof r[1] === 'object' ? esc(L(r[1])) : r[1];
      return '<div class="kv-row"><dt>' + esc(L(r[0])) + '</dt><dd>' + v + '</dd></div>';
    }).join('') + '</dl>';
  };

  /* progress(step, total, {label, style, prefix})
     default: square segments (2px; done ink, current green) + "2 / 6".
     style 'bar': one 2px track with a green fill (--p) and hairline ticks between steps — the question flow.
     prefix: a label before the numbers ('質問'). label: custom text (replaces the numbers), false = none. */
  SM.ui.progress = function (step, total, o) {
    o = o || {};
    total = Math.max(1, total | 0);
    step = Math.max(0, Math.min(step, total));
    var custom = o.label != null && o.label !== false;
    var lbl = custom ? L(o.label) : t('ui.step', { n: step, total: total });
    var track = '';
    if (o.style === 'bar') {
      track = '<span class="progress-fill"></span>';
      for (var k = 1; k < total; k++) track += '<span class="progress-tick" style="left:' + (k * 100 / total).toFixed(3) + '%"></span>';
    } else {
      for (var i = 1; i <= total; i++) track += '<span class="progress-seg' + (i < step ? ' is-done' : i === step ? ' is-current' : '') + '"></span>';
    }
    var numHtml = custom ? esc(lbl) :
      '<b class="progress-n">' + step + '</b><span class="of">' + (en() ? ' of ' : ' / ') + total + '</span>';
    var pre = o.prefix ? '<span class="progress-k">' + esc(L(o.prefix)) + '</span>' : '';
    return '<div class="progress' + (o.style === 'bar' ? ' is-bar' : '') + '">' +
      '<div class="progress-track" role="progressbar" aria-label="' + esc(o.prefix ? L(o.prefix) : t('ui.progress')) + '" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + step + '" aria-valuetext="' + esc(lbl) + '" style="--step:' + step + ';--total:' + total + ';--p:' + (step / total).toFixed(4) + '">' + track + '</div>' +
      (o.label === false ? '' : '<p class="progress-label" aria-hidden="true">' + pre + numHtml + '</p>') + '</div>';
  };

  /* option row for question flows: opt(label, {hint, act, attrs, selected, multi, quiet, icon, catIcon, end, href})
     quiet (わからない・スキップ): no frame, hairline on top, text + arrow (end defaults to the arrow). */
  SM.ui.opt = function (label, o) {
    o = o || {};
    var cls = 'opt' + (o.multi ? ' opt-multi' : '') + (o.quiet ? ' opt-quiet' : '') + (o.selected ? ' is-selected' : '');
    var lead = o.catIcon ? SM.ui.catIcon(o.catIcon, 'sm') : o.icon ? '<span class="list-ic opt-icon">' + icon(o.icon) + '</span>' : '';
    var end = o.end != null ? o.end : (o.quiet && !o.multi ? SM.ui.arrow() : '');
    var inner = (o.quiet && !o.multi ? '' : '<span class="opt-ind">' + icon('check') + '</span>') + lead +
      '<span class="opt-body"><span class="opt-title">' + esc(L(label)) + '</span>' + (o.hint ? '<span class="opt-hint">' + esc(L(o.hint)) + '</span>' : '') + '</span>' +
      (end ? '<span class="opt-end">' + end + '</span>' : '');
    if (o.href) return '<a class="' + cls + '" href="' + esc(o.href) + '"' + actAttrs(o) + '>' + inner + '</a>';
    return '<button type="button" class="' + cls + '" aria-pressed="' + (o.selected ? 'true' : 'false') + '"' + actAttrs(o) + '>' + inner + '</button>';
  };

  /* listItem({title, sub, subSr, href, act, attrs, icon, cat, meta, unit, amount, tags, count, chevron, id, vt})
     — ruled row, trailing drawn arrow. v5: name + count / amount, no grey sub-line unless the view passes `sub`
     (only where two rows would be confused without it); subSr: the same explanation for screen readers only.
     meta: a count or short text at the right ('12'), unit: its small unit ('件'); count:true rolls meta (odometer).
     amount: a money string shown at the right with its numbers set big (月5万円). tags: [{kind,value}] fact tags or
     an HTML string, under the title. id: data-id (back finds the row).
     A row with a category mark that navigates is the source of the shared category morph; its title morphs into
     the next page's heading (vt:false turns both off). */
  SM.ui.listItem = function (o) {
    o = o || {};
    var nav = !!(o.href || o.act);
    var lead = o.cat ? SM.ui.catIcon(o.cat, 'sm', { vt: !!o.href && o.vt !== false }) : o.icon ? '<span class="list-ic">' + icon(o.icon) + '</span>' : '';
    var showChev = o.chevron !== false && nav;
    var hasMeta = o.meta != null && o.meta !== '';
    var mv = hasMeta ? (typeof o.meta === 'object' ? L(o.meta) : String(o.meta)) : '';
    var meta = hasMeta ? '<span class="list-count"><span class="list-count-v"' + (o.count && /^\d+$/.test(mv) ? ' data-count="' + esc(mv) + '"' : '') + '>' + esc(mv) + '</span>' + (o.unit ? '<span class="unit">' + esc(L(o.unit)) + '</span>' : '') + '</span>' : '';
    var amt = o.amount ? L(o.amount) : '';
    if (amt) { meta = '<span class="list-amount">' + amountHtml(amt) + '</span>' + meta; hasMeta = true; }
    var tags = !o.tags ? '' : typeof o.tags === 'string' ? o.tags : SM.ui.factTags(o.tags);
    var vtT = !!o.href && o.vt !== false ? ' data-vt="title"' : '';
    var inner = lead + '<span class="list-body"><span class="list-title"' + vtT + '>' + esc(L(o.title)) + '</span>' +
      (o.sub ? '<span class="list-sub">' + esc(L(o.sub)) + '</span>' : o.subSr ? '<span class="sr-only">' + esc(L(o.subSr)) + '</span>' : '') +
      (tags ? tags.replace('class="tags tags-fact"', 'class="tags tags-fact list-tags"') : '') + '</span>' +
      (hasMeta || showChev ? '<span class="list-meta">' + meta + (showChev ? SM.ui.arrow('r', 'list-chev') : '') + '</span>' : '');
    var id = o.id != null ? ' data-id="' + esc(o.id) + '"' : '';
    if (o.href) return '<a class="list-item" href="' + esc(o.href) + '"' + id + actAttrs(o) + '>' + inner + '</a>';
    if (o.act) return '<button type="button" class="list-item"' + id + actAttrs(o) + '>' + inner + '</button>';
    return '<div class="list-item"' + id + attrs(o.attrs) + '>' + inner + '</div>';
  };

  /* contactRow(contact, {web:false}) — how to reach them, and when. The number is the biggest thing and is itself
     the tel: link; 電話する is an ink-outline button (not green: one solid green per viewport). */
  function telHref(n) { return 'tel:' + String(n).replace(/[^\d+#*]/g, '').replace(/#/g, '%23'); }
  SM.ui.contactRow = function (c, o) {
    if (!c) return '';
    o = o || {};
    var items = [];
    var ext = icon('external', 'contact-go') + '<span class="sr-only">' + esc(t('core.newtab')) + '</span>';
    if (c.phone) {
      var free = /^0120|^0800/.test(String(c.phone).replace(/\D/g, ''));
      items.push('<a class="contact-item contact-phone" href="' + esc(telHref(c.phone)) + '">' +
        '<span class="contact-main"><span class="contact-label">' +
        esc(L(c.phoneLabel) || t('ui.phone')) + (free ? '<span class="contact-free">' + esc(t('ui.free')) + '</span>' : '') + '</span><span class="contact-value">' + esc(c.phone) + '</span></span>' +
        '<span class="contact-cta">' + icon('phone') + '<span class="contact-cta-t">' + esc(t('ui.call')) + '</span></span></a>');
    }
    if (c.line) items.push('<a class="contact-item contact-line" href="' + esc(c.line) + '" target="_blank" rel="noopener">' +
      '<span class="contact-main"><span class="contact-value">' + esc(t('ui.line')) + '</span></span>' + ext + '</a>');
    if (c.chat) items.push('<a class="contact-item contact-line" href="' + esc(c.chat) + '" target="_blank" rel="noopener">' +
      '<span class="contact-main"><span class="contact-value">' + esc(t('ui.chat')) + '</span></span>' + ext + '</a>');
    if (c.web && o.web !== false) {
      var host = ''; try { host = c.web.replace(/^https?:\/\//, '').split('/')[0]; } catch (e) { }
      items.push('<a class="contact-item contact-web" href="' + esc(c.web) + '" target="_blank" rel="noopener">' +
        '<span class="contact-main"><span class="contact-label">' + esc(host) + '</span><span class="contact-value">' + esc(t('ui.web')) + '</span></span>' + ext + '</a>');
    }
    var hours = L(c.hours);
    if (hours) items.push('<p class="contact-hours"><span class="contact-hours-k">' + esc(t('ui.hours')) + '</span><span>' + esc(hours) + '</span></p>');
    return items.length ? '<div class="contact">' + items.join('') + '</div>' : '';
  };

  /* searchField({id, placeholder, value, act, label, attrs}) — 52px, 22px glass */
  SM.ui.searchField = function (o) {
    o = o || {};
    var id = o.id || 'q';
    return '<label class="search" for="' + esc(id) + '"><span class="sr-only">' + esc(L(o.label || o.placeholder || '')) + '</span>' + icon('search') +
      '<input class="input" type="search" id="' + esc(id) + '" autocomplete="off" enterkeyhint="search" placeholder="' + esc(L(o.placeholder || '')) + '" value="' + esc(o.value || '') + '"' + (o.act ? ' data-act="' + esc(o.act) + '"' : '') + attrs(o.attrs) + '></label>';
  };

  /* seg(items:[{label, value, pressed, href, icon}], {act, label, style:'box'|'tabs'})
     box: joined square segments in a 1px ink frame; the ink fill is one element that slides (CSS, up to 6 items).
     tabs: underline tabs (2px ink). */
  SM.ui.seg = function (items, o) {
    o = o || {};
    return '<div class="seg' + (o.style === 'tabs' ? ' seg-tabs' : '') + '" role="group"' + (o.label ? ' aria-label="' + esc(L(o.label)) + '"' : '') + '>' + (items || []).map(function (it) {
      var inner = (it.icon ? icon(it.icon) : '') + '<span>' + esc(L(it.label)) + '</span>';
      if (it.href) return '<a href="' + esc(it.href) + '"' + (it.pressed ? ' aria-current="page"' : '') + '>' + inner + '</a>';
      return '<button type="button" aria-pressed="' + (it.pressed ? 'true' : 'false') + '"' + (o.act ? ' data-act="' + esc(o.act) + '"' : '') + ' data-value="' + esc(it.value) + '">' + inner + '</button>';
    }).join('') + '</div>';
  };

  /* switchRow(label, {sub, checked, act, id, attrs}) — for settings */
  SM.ui.switchRow = function (label, o) {
    o = o || {};
    return '<label class="switch-row"><span class="switch-text"><b>' + esc(L(label)) + '</b>' + (o.sub ? '<small>' + esc(L(o.sub)) + '</small>' : '') + '</span>' +
      '<input type="checkbox" class="switch" role="switch"' + (o.id ? ' id="' + esc(o.id) + '"' : '') + (o.checked ? ' checked' : '') + (o.act ? ' data-act="' + esc(o.act) + '"' : '') + attrs(o.attrs) + '>' +
      // F45: オン / オフ in words beside the switch (base.css draws it from the checkbox state)
      '<span class="switch-state" aria-hidden="true" data-on="' + (en() ? 'On' : 'オン') + '" data-off="' + (en() ? 'Off' : 'オフ') + '"></span></label>';
  };

  /* marker(text) — 蛍光ペン highlight for the ONE key phrase on a screen */
  SM.ui.marker = function (text) { return '<mark class="marker">' + esc(L(text)) + '</mark>'; };

  /* sheetFrame(bodyHtml, {title, foot}) — optional helper for core's SM.sheet */
  SM.ui.sheetFrame = function (body, o) {
    o = o || {};
    var close = en() ? 'Close' : '閉じる';
    return '<div class="sheet-handle" aria-hidden="true"></div>' +
      '<div class="sheet-head"><h2 class="sheet-title" id="sheet-title">' + esc(L(o.title || '')) + '</h2>' +
      '<button type="button" class="icon-btn sheet-close" data-act="sheet-close" aria-label="' + close + '">' + icon('close') + '</button></div>' +
      '<div class="sheet-body">' + body + '</div>' + (o.foot ? '<div class="sheet-foot">' + o.foot + '</div>' : '');
  };

  /* body.is-scrolled (kept for v3 view CSS; v4 base.css draws the same hairline at rest and scrolled) */
  (function () {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    var on = null, raf = 0;
    function check() {
      raf = 0;
      var s = (window.scrollY || 0) > 4;
      if (s !== on && document.body) { on = s; document.body.classList.toggle('is-scrolled', s); }
    }
    window.addEventListener('scroll', function () { if (!raf) raf = (window.requestAnimationFrame || setTimeout)(check); }, { passive: true });
    window.addEventListener('hashchange', function () { setTimeout(check, 0); });
  })();

  /* English typography: one apostrophe (’) everywhere — in every UI string (SM.t) and in data read
     through SM.L (「I can't pay…」 beside 「You don’t have…」). Straight double quotes become “ ” (not inside markup). */
  (function () {
    var AP = /([A-Za-z])'([A-Za-z])/g;
    var QO = /(^|[\s(\[\u2014/])"(?=\S)/g;   /* an opening straight quote → “ ; the rest close → ” (never in markup) */
    function fix(s) {
      if (typeof s !== 'string') return s;
      if (s.indexOf("'") !== -1) s = s.replace(AP, '$1\u2019$2');
      if (s.indexOf('"') !== -1 && !/[<=]/.test(s)) s = s.replace(QO, '$1\u201C').replace(/"/g, '\u201D');
      return s;
    }
    var isEn = function () { try { return SM.lang() === 'en'; } catch (e) { return false; } };
    if (SM.t && !SM.t.typo) {
      var tr = SM.t;
      SM.t = function () { var s = tr.apply(this, arguments); return isEn() ? fix(s) : s; };
      SM.t.typo = true;
    }
    if (SM.L && !SM.L.typo) {
      var get = SM.L;
      SM.L = function (obj) {
        var s = get.apply(this, arguments);
        return obj && typeof obj === 'object' && isEn() ? fix(s) : s;
      };
      SM.L.typo = true;
    }
  })();

  /* ふりがな typesetting for the 中学生 mode, run right after core's SM.fitRuby on the same roots.
     - A reading wider than its kanji overhangs a neighbouring kana by up to half a character (0.5em of the base)
       instead of opening a gap inside the phrase (「領収書　は」). Never over kanji (that is another word's
       reading), never past the start or end of a line, and the kanji themselves are never spaced out.
     - Small labels (12px and under: eyebrows, meta) show no reading: there the ruby breaks the label box and the
       screen's title carries the reading. Tags and chips are never annotated (data-noruby above; base.css hides
       readings in view-made tags). Layout reads first, then writes, then one line check. */
  (function () {
    if (!SM.fitRuby || SM.fitRuby.typeset) return;
    var core = SM.fitRuby;
    var KANA = /[\u3041-\u3096\u309d\u309e\u30a1-\u30fa\u30fc-\u30fe]/;
    function blockOf(el, root) {
      var box = el.parentElement;
      while (box && box !== root && /^inline/.test(getComputedStyle(box).display)) box = box.parentElement;
      return box || root;
    }
    function textWalker(box) {
      return document.createTreeWalker(box, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) { var p = n.parentNode && n.parentNode.nodeName; return p === 'RT' || p === 'RP' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
      });
    }
    // the base character beside a ruby: { node, i } when it is kana on the same block, else null
    function side(base, box, prev) {
      var w = textWalker(box), n;
      w.currentNode = base;
      while ((n = prev ? w.previousNode() : w.nextNode())) {
        var v = n.nodeValue;
        if (!v || !/\S/.test(v)) continue;
        if (n.parentNode && n.parentNode.nodeName === 'RUBY') return null;
        var i = prev ? v.length - 1 : 0;
        return KANA.test(v.charAt(i)) ? { node: n, i: i } : null;
      }
      return null;
    }
    function rectOf(node, i, j) {
      var rg = document.createRange();
      rg.setStart(node, i); rg.setEnd(node, j);
      var rs = rg.getClientRects();
      return rs.length ? rs[0] : rg.getBoundingClientRect();
    }
    function typeset(root) {
      if (!root || !root.querySelectorAll || !document.body.classList.contains('is-ruby')) return;
      var list = root.querySelectorAll('ruby:not(.is-long)'), jobs = [], k;
      // 1. read
      for (k = 0; k < list.length; k++) {
        var r = list[k], base = r.firstChild, rt = r.querySelector('rt');
        if (!rt || !base || base.nodeType !== 3) continue;
        var cs = getComputedStyle(r), fs = parseFloat(cs.fontSize) || 16;
        if (fs <= 12.5) { jobs.push({ r: r, off: true }); continue; }
        // the base's own width: kanji are full-width (1em + tracking). Its layout box cannot tell — the ruby
        // column stretches the base to the reading's width, which is the gap this pass removes
        var n = base.nodeValue.length, bw = n * (fs + (parseFloat(cs.letterSpacing) || 0)), tw = rt.getBoundingClientRect().width;
        var ex = tw - bw;
        if (ex <= 1) { jobs.push({ r: r, rt: rt, s: 0, e: 0 }); continue; }
        var box = blockOf(r, root);
        var ps = side(base, box, true), ns = side(base, box, false);
        var max = fs * 0.5, s = 0, e = 0;
        if (ps && ns) { s = e = Math.min(ex / 2, max); }
        else if (ps) s = Math.min(ex, max);
        else if (ns) e = Math.min(ex, max);
        jobs.push({ r: r, rt: rt, base: base, ps: ps, ns: ns, s: s, e: e, rf: parseFloat(getComputedStyle(rt).fontSize) || fs * 0.55 });
      }
      // 2. write
      var em = function (px, rf) { return px ? (-px / rf).toFixed(3) + 'em' : ''; };
      jobs.forEach(function (j) {
        if (j.off) { j.r.classList.add('rb-off'); return; }
        j.r.classList.remove('rb-off');
        j.rt.style.marginInlineStart = em(j.s, j.rf);
        j.rt.style.marginInlineEnd = em(j.e, j.rf);
      });
      // 3. a reading never hangs past the start or end of a line: drop the side whose kana sits on another line
      var drop = [];
      jobs.forEach(function (j) {
        if (j.off || !(j.s || j.e)) return;
        var b = rectOf(j.base, 0, 1), half = b.height / 2;
        if (j.s && Math.abs(rectOf(j.ps.node, j.ps.i, j.ps.i + 1).top - b.top) > half) drop.push([j, 's']);
        if (j.e) {
          var be = rectOf(j.base, j.base.nodeValue.length - 1, j.base.nodeValue.length);
          if (Math.abs(rectOf(j.ns.node, j.ns.i, j.ns.i + 1).top - be.top) > be.height / 2) drop.push([j, 'e']);
        }
      });
      drop.forEach(function (d) { d[0].rt.style[d[1] === 's' ? 'marginInlineStart' : 'marginInlineEnd'] = ''; });
    }
    SM.fitRuby = function (root) {
      core.apply(this, arguments);
      try { typeset(root); } catch (e) { }
    };
    SM.fitRuby.typeset = typeset;
  })();
})();
;
/* ---- js/illus.js ---- */
/* =====================================================================
   巣立ちマップ v4 — illus.js  (owner: ILLUS)
   The illustration set 「巣立ちの道」: people and things standing on one ground line.
   VISUAL-SPEC §10–11 (style, palette, list, API) · MOTION-SPEC §1, §4.1 (timing, reduced motion).

   GENERATED by tmp4-ILLUS/build.py from the scene sources — edit the sources, then rebuild.
   (The artwork strings below are data; the API code is hand-written in tmp4-ILLUS/illus-api.js.)

   ------------------------------------------------------------------ API (classic script, after components.js)
   SM.illus(name, opts) -> string      <figure class="il …"><svg class="il-svg" …>…</svg></figure>, '' if unknown
     opts.size    'hero'|'strip'|'spot'|'cover'|'thumb'|'thumb-sm'|'fill'|<px number>  (default: the artboard's own)
     opts.animate true (default) | false | 'soft' (soft: no ground draw / plate sweep — for strips that swap in place)
     opts.label   string | {ja,en} | true (true = the built-in description)  · omitted → aria-hidden (decorative)
     opts.pose    q-figure only: 'stand'|'walk'|'look'|'map'|'think'|'wave'
     opts.cls     extra classes on the root
     opts.vt      view-transition-name on the root. A named (shared) element gets NO entrance unless animate:true
                  is passed explicitly, because the view transition itself is its motion (q-figure walking).
   SM.illus.has(name) · names() · meta(name) · play(el[, 'enter'|'react']) -> Promise · mount(root[, {instant}])
   SM.illus.finish([root])   land every running/pending entrance in root now (user input during an entrance)
   SM.illus.register(name, {svg, artboard, alt, priority[, poses]})

   Motion: parts are <g data-il="ground|plate|scene|fig|fig2|prop|route|pin|accent|react|base"
   data-il-order="n">; each part plays once, transform/opacity only, ≤ 600ms in total, never loops.
   Hidden-before-play only under .il.is-pending, which JS adds and removes, so a failure never hides a picture.
   Reduced motion (html.m-reduce / SM.motion.reduced()): the final picture, immediately.
   ===================================================================== */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  var docEl = document.documentElement;

  /* ---------------------------------------------------------------- artboards
     [w, h, groundY, safe[x,y,w,h], thumb crop[x,y,w,h], default size] */
  var ART = {
    hero: [360, 216, 192, [12, 16, 336, 176], [72, 0, 216, 216], 'hero'],
    strip: [360, 120, 108, [0, 0, 360, 120], [120, 0, 120, 120], 'strip'],
    // the question strips on a desktop stage: the same ground and scale, twice as long (q-*-wide)
    wide: [720, 120, 108, [0, 0, 720, 120], [300, 0, 120, 120], 'fill'],
    spot: [240, 160, 140, [8, 0, 224, 160], [40, 0, 160, 160], 'spot'],
    cover: [240, 160, 140, [40, 0, 160, 160], [40, 0, 160, 160], 'cover'],
    figure: [48, 104, 104, [0, 0, 48, 104], [0, 28, 48, 48], 'fill']
  };
  var SIZES = { hero: 1, strip: 1, spot: 1, cover: 1, thumb: 1, 'thumb-sm': 1, fill: 1 };
  var POSES = ['stand', 'walk', 'look', 'map', 'think', 'wave'];
  var TOTAL = 600;     // longest entrance (ms); build.py checks every picture against it
  var REACT = 520;

  /* ---------------------------------------------------------------- styles (one <style id="sm-illus-css">) */
  var CSS = '.il{--il-ink:var(--ink,#1B1B19);--il-paper:#FFFFFF;--il-p2:var(--paper-2,#F5F4EF);--il-p3:var(--paper-3,#EBEAE4);--il-green:var(--action,#0B6E44);--il-green-t:var(--action-tint,#E3F0E8);--il-marker:var(--marker,#FFE45C);--il-clay:#D9784F;--il-navy:#355695;--il-amber:#C98500;--il-cat-housing:var(--cat-housing,#355695);--il-cat-money:var(--cat-money,#895700);--il-cat-education:var(--cat-education,#68448D);--il-cat-work:var(--cat-work,#006A7D);--il-cat-procedures:var(--cat-procedures,#4C5A69);--il-cat-consult:var(--cat-consult,#8E3665);--il-cat-housing-t:var(--cat-housing-tint,#EBF1FE);--il-cat-money-t:var(--cat-money-tint,#F8F0E4);--il-cat-education-t:var(--cat-education-tint,#F4EEFB);--il-cat-work-t:var(--cat-work-tint,#E4F5F9);--il-cat-procedures-t:var(--cat-procedures-tint,#EDF2F6);--il-cat-consult-t:var(--cat-consult-tint,#FBECF3);--il-skin-1:#F3D3B5;--il-skin-2:#D9A77F;--il-skin-3:#B07A52;--il-skin-4:#7A4E33;--il-hair-1:#1B1B19;--il-hair-2:#4A3426;--il-hair-3:#8A5A3A;--il-e-std:cubic-bezier(.2,0,0,1);--il-e-enter:cubic-bezier(0,0,.2,1);--il-e-draw:cubic-bezier(.5,0,.15,1);--il-e-stamp:cubic-bezier(.34,1.4,.64,1)}:root[data-theme="dark"] .il{--il-ink:#EDEBE4;--il-paper:#2A2A27;--il-p2:#24241F;--il-p3:#30302B;--il-green:#1F7A4D;--il-green-t:#15291F;--il-marker:#C9B227;--il-clay:#C46A44;--il-navy:#4A6DB0;--il-amber:#E3A531;--il-cat-housing:#3D62A8;--il-cat-money:#96630A;--il-cat-education:#75519C;--il-cat-work:#0B7689;--il-cat-procedures:#586777;--il-cat-consult:#9C4072;--il-cat-housing-t:#1E2735;--il-cat-money-t:#2E2515;--il-cat-education-t:#2A2332;--il-cat-work-t:#142A30;--il-cat-procedures-t:#1B2835;--il-cat-consult-t:#322028;--il-skin-1:#F3D3B5;--il-skin-2:#D9A77F;--il-skin-3:#B07A52;--il-skin-4:#7A4E33;--il-hair-1:#0E0E0D;--il-hair-2:#3A291E;--il-hair-3:#7A4E30}.il{display:block;margin:0;max-width:100%}.il>svg.il-svg{display:block;width:100%;height:auto;overflow:hidden}.il-s-hero{width:100%;max-width:560px}.il-s-strip{width:100%;max-width:480px}.il-s-spot{width:200px}@media (min-width:900px){.il-s-spot{width:240px}}.il-s-cover,.il-s-fill{width:100%}.il-s-thumb{width:72px;height:72px;flex:0 0 auto}.il-s-thumb-sm{width:56px;height:56px;flex:0 0 auto}.il.is-thumb>svg.il-svg{height:100%}.il.is-thumb [data-il="plate"]{display:none}.il-svg .il-ink{fill:var(--il-ink)}.il-svg .il-paper{fill:var(--il-paper)}.il-svg .il-p2{fill:var(--il-p2)}.il-svg .il-p3{fill:var(--il-p3)}.il-svg .il-green{fill:var(--il-green)}.il-svg .il-green-t{fill:var(--il-green-t)}.il-svg .il-marker{fill:var(--il-marker)}.il-svg .il-clay{fill:var(--il-clay)}.il-svg .il-navy{fill:var(--il-navy)}.il-svg .il-amber{fill:var(--il-amber)}.il-svg .il-cat-housing{fill:var(--il-cat-housing)}.il-svg .il-cat-money{fill:var(--il-cat-money)}.il-svg .il-cat-education{fill:var(--il-cat-education)}.il-svg .il-cat-work{fill:var(--il-cat-work)}.il-svg .il-cat-procedures{fill:var(--il-cat-procedures)}.il-svg .il-cat-consult{fill:var(--il-cat-consult)}.il-svg .il-cat-housing-t{fill:var(--il-cat-housing-t)}.il-svg .il-cat-money-t{fill:var(--il-cat-money-t)}.il-svg .il-cat-education-t{fill:var(--il-cat-education-t)}.il-svg .il-cat-work-t{fill:var(--il-cat-work-t)}.il-svg .il-cat-procedures-t{fill:var(--il-cat-procedures-t)}.il-svg .il-cat-consult-t{fill:var(--il-cat-consult-t)}.il-svg .il-skin-1{fill:var(--il-skin-1)}.il-svg .il-skin-2{fill:var(--il-skin-2)}.il-svg .il-skin-3{fill:var(--il-skin-3)}.il-svg .il-skin-4{fill:var(--il-skin-4)}.il-svg .il-hair-1{fill:var(--il-hair-1)}.il-svg .il-hair-2{fill:var(--il-hair-2)}.il-svg .il-hair-3{fill:var(--il-hair-3)}.il-svg .il-line,.il-svg .il-dash,.il-svg .il-dot{fill:none;stroke:var(--il-ink);stroke-width:1.5px;stroke-linecap:square;stroke-linejoin:miter;vector-effect:non-scaling-stroke}.il-svg .il-dash{stroke-dasharray:3px 4px;stroke-linecap:butt}.il-svg .il-dot{stroke-dasharray:1.5px 4.5px;stroke-linecap:butt}.il-svg .il-sk,.il-svg .il-sk-g,.il-svg .il-sk-p,.il-svg .il-sk-a,.il-svg .il-sk-c{fill:none;stroke:var(--il-ink);stroke-linecap:butt;stroke-linejoin:miter}.il-svg .il-sk-g{stroke:var(--il-green)}.il-svg .il-sk-p{stroke:var(--il-paper)}.il-svg .il-sk-a{stroke:var(--il-amber)}.il-svg .il-sk-c{stroke:var(--il-clay)}.il-svg [data-il],.il-svg [data-il-seg]{transform-box:fill-box}.il.is-pending [data-il]:not([data-il="base"]){opacity:0}.il.is-play [data-il]{animation-fill-mode:both;animation-delay:calc(var(--il-t,0ms) + var(--il-o,0) * 50ms)}.il-svg [data-il-order="1"]{--il-o:1}.il-svg [data-il-order="2"]{--il-o:2}.il-svg [data-il-order="3"]{--il-o:3}.il.is-play [data-il="ground"]{animation-name:il-sx;animation-duration:300ms;animation-timing-function:var(--il-e-draw);transform-origin:0 50%;--il-t:0ms}.il.is-play [data-il="plate"]{animation-name:il-sx;animation-duration:360ms;animation-timing-function:var(--il-e-std);transform-origin:0 50%;--il-t:40ms}.il.is-play [data-il="scene"]{animation-name:il-fade;animation-duration:260ms;animation-timing-function:var(--il-e-enter);--il-t:60ms}.il.is-play [data-il="fig2"]{animation-name:il-rise;animation-duration:360ms;animation-timing-function:var(--il-e-std);--il-t:80ms}.il.is-play [data-il="fig"]{animation-name:il-rise;animation-duration:360ms;animation-timing-function:var(--il-e-std);--il-t:140ms}.il.is-play [data-il="prop"]{animation-name:il-prop;animation-duration:300ms;animation-timing-function:var(--il-e-std);transform-origin:50% 100%;--il-t:160ms}.il.is-play [data-il="route"]:not([data-il-segs]){animation-name:il-fade;animation-duration:280ms;animation-timing-function:var(--il-e-enter);--il-t:200ms}.il.is-play [data-il-seg]{animation-name:il-sx;animation-fill-mode:both;animation-duration:var(--u,120ms);animation-delay:var(--d,180ms);animation-timing-function:linear;transform-origin:0 50%}.il.is-play [data-il-seg="0"]{animation-timing-function:cubic-bezier(.45,0,1,1)}.il.is-play [data-il-seg][data-il-last]{animation-timing-function:cubic-bezier(0,0,.2,1)}.il.is-play [data-il-ax="xy"]{animation-name:il-sxy;transform-origin:0 100%}.il.is-play [data-il="pin"]{animation-name:il-pin;animation-duration:240ms;animation-timing-function:var(--il-e-std);--il-t:360ms}.il.is-play [data-il="accent"],.il.is-play [data-il="react"]{animation-name:il-accent;animation-duration:240ms;animation-timing-function:var(--il-e-stamp);transform-origin:50% 50%;--il-t:360ms}.il.il-soft.is-pending [data-il="ground"],.il.il-soft.is-pending [data-il="plate"]{opacity:1}.il.il-soft.is-play [data-il="ground"],.il.il-soft.is-play [data-il="plate"]{animation-name:none}.il.is-fast [data-il],.il.is-fast [data-il-seg]{animation-duration:1ms!important;animation-delay:0ms!important}.il.is-reacting [data-il="react"]{animation:il-react 520ms var(--il-e-stamp) both;transform-origin:50% 50%}.il.is-reacted [data-il="react"]{transform:translateY(var(--il-dy,0px))}html.m-reduce .il.is-pending [data-il]{opacity:1}html.m-reduce .il [data-il],html.m-reduce .il [data-il-seg]{animation:none!important}@media print{.il:not(.il--about-team){display:none}}@keyframes il-sx{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes il-sxy{from{transform:scale(0)}to{transform:scale(1)}}@keyframes il-fade{from{opacity:0}to{opacity:1}}@keyframes il-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes il-prop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}@keyframes il-pin{0%{opacity:0;transform:translateY(-10px)}55%{opacity:1;transform:translateY(1.2px)}100%{opacity:1;transform:translateY(0)}}@keyframes il-accent{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}@keyframes il-react{from{transform:translateY(0)}to{transform:translateY(var(--il-dy,0px))}}';
  function injectCss() {
    try {
      if (document.getElementById('sm-illus-css')) return;
      var st = document.createElement('style');
      st.id = 'sm-illus-css';
      st.textContent = CSS;
      (document.head || docEl).appendChild(st);
    } catch (e) { }
  }

  /* ---------------------------------------------------------------- registry */
  var REG = {}, ORDER = [];
  function register(name, def) {
    if (!name || !def || (!def.svg && !def.poses) || !ART[def.artboard]) return false;
    if (!REG[name]) ORDER.push(name);
    REG[name] = {
      svg: def.svg || '', poses: def.poses || null, artboard: def.artboard,
      alt: def.alt || { ja: '', en: '' }, priority: def.priority || 'P2', dy: def.dy || 0
    };
    return true;
  }

  function lang() { try { return SM.lang ? SM.lang() : 'ja'; } catch (e) { return 'ja'; } }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function labelText(label, d) {
    if (label === true) return d.alt[lang()] || d.alt.ja || '';
    if (label && typeof label === 'object') return label[lang()] || label.ja || '';
    return label ? String(label) : '';
  }

  /* ---------------------------------------------------------------- SM.illus(name, opts) */
  function illus(name, opts) {
    try {
      var d = REG[name];
      if (!d) return '';
      opts = opts || {};
      var a = ART[d.artboard];
      var size = opts.size;
      var px = 0;
      if (typeof size === 'number' && size > 0) { px = Math.round(size); size = 'px'; }
      else if (!SIZES[size]) size = a[5];
      var thumb = size === 'thumb' || size === 'thumb-sm';
      var vb = thumb ? a[4] : [0, 0, a[0], a[1]];
      var inner = d.svg;
      if (d.poses) {
        var pose = opts.pose && d.poses[opts.pose] ? opts.pose : 'stand';
        inner = d.poses[pose];
      }
      var animate = opts.animate;
      if (animate === undefined) animate = !opts.vt;
      var anim = animate === false ? 'none' : 'enter';
      var cls = 'il il-' + d.artboard + ' il--' + name + ' il-s-' + size + (thumb ? ' is-thumb' : '') +
        (animate === 'soft' ? ' il-soft' : '') + (opts.cls ? ' ' + esc(opts.cls) : '');
      var style = '';
      if (px) style += 'width:' + px + 'px;';
      if (opts.vt) style += 'view-transition-name:' + esc(String(opts.vt).replace(/[^\w-]/g, '')) + ';';
      var lab = labelText(opts.label, d);
      return '<figure class="' + cls + '" data-il-name="' + esc(name) + '" data-il-anim="' + anim + '"' +
        (lab ? '' : ' aria-hidden="true"') + (style ? ' style="' + style + '"' : '') + '>' +
        '<svg class="il-svg" viewBox="' + vb.join(' ') + '" focusable="false"' +
        (lab ? ' role="img" aria-label="' + esc(lab) + '"' : ' aria-hidden="true"') +
        ' preserveAspectRatio="xMidYMid meet">' + inner + '</svg></figure>';
    } catch (e) { return ''; }
  }

  /* ---------------------------------------------------------------- motion */
  function reduced() {
    try { if (SM.motion && SM.motion.reduced) return !!SM.motion.reduced(); } catch (e) { }
    if (docEl.classList.contains('m-reduce')) return true;
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e2) { return false; }
  }
  function held() { try { return !!(SM.motion && SM.motion.held && SM.motion.held()); } catch (e) { return false; } }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  var playing = [];
  function unplay(el) {
    var i = playing.indexOf(el);
    if (i >= 0) playing.splice(i, 1);
  }
  function settle(el) {
    clearTimeout(el._ilT);
    el.classList.remove('is-pending', 'is-play', 'is-fast');
    unplay(el);
    var r = el._ilRes; el._ilRes = null; el._ilP = null;
    if (r) r();
  }

  function play(el, kind) {
    if (!el || !el.classList || !el.classList.contains('il')) return Promise.resolve();
    if (kind === 'react') return react(el);
    if (el._ilP && el._ilStart && now() - el._ilStart < 300) return el._ilP;   // one play per reveal
    if (reduced() || el.getAttribute('data-il-anim') === 'none') { settle(el); return Promise.resolve(); }
    settle(el);
    var p = new Promise(function (res) { el._ilRes = res; });
    el._ilP = p;
    el._ilStart = now();
    try { void el.offsetWidth; } catch (e) { }   // restart CSS animations on replay
    el.classList.add('is-play');
    playing.push(el);
    el._ilT = setTimeout(function () { settle(el); }, TOTAL + 80);
    return p;
  }

  function react(el) {
    return new Promise(function (res) {
      try {
        var name = el.getAttribute('data-il-name');
        var d = REG[name];
        if (!d || !el.querySelector('[data-il="react"]')) { res(); return; }
        if (d.dy) el.style.setProperty('--il-dy', d.dy + 'px');
        el.classList.remove('is-reacted', 'is-reacting');
        if (reduced()) { el.classList.add('is-reacted'); res(); return; }
        try { void el.offsetWidth; } catch (e) { }
        el.classList.add('is-reacting');
        setTimeout(function () { el.classList.remove('is-reacting'); el.classList.add('is-reacted'); res(); }, REACT + 40);
      } catch (e) { res(); }
    });
  }

  /* entrance on reveal: one IntersectionObserver, ≥ 30% visible, respects SM.motion.hold */
  var io = null;
  function onSeen(entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      try { io.unobserve(el); } catch (e) { }
      if (held() && SM.motion.whenReleased) SM.motion.whenReleased(function () { play(el); });
      else play(el);
    });
  }
  function ensureIO() {
    if (io || typeof window.IntersectionObserver !== 'function') return io;
    try { io = new IntersectionObserver(onSeen, { root: null, rootMargin: '0px', threshold: 0.3 }); } catch (e) { io = null; }
    return io;
  }

  function mount(root, opts) {
    root = root || document;
    if (!root.querySelectorAll) return;
    var instant = !!(opts && opts.instant);
    var list = [].slice.call(root.querySelectorAll('.il[data-il-anim="enter"]'));
    if (root.classList && root.classList.contains('il') && root.getAttribute('data-il-anim') === 'enter') list.push(root);
    var still = instant || reduced() || !ensureIO();
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el._ilw) continue;
      el._ilw = 1;
      if (still) continue;
      el.classList.add('is-pending');
      io.observe(el);
    }
  }

  function inView(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < (window.innerHeight || 800) && r.width > 0;
  }
  function finish(root) {
    root = root || document;
    playing.slice().forEach(function (el) {
      if (root === document || root.contains(el)) { el.classList.add('is-fast'); clearTimeout(el._ilT); el._ilT = setTimeout(function () { settle(el); }, 140); }
    });
    if (!root.querySelectorAll) return;
    var pend = root.querySelectorAll('.il.is-pending');
    for (var i = 0; i < pend.length; i++) {
      if (!inView(pend[i])) continue;
      try { if (io) io.unobserve(pend[i]); } catch (e) { }
      settle(pend[i]);
    }
  }
  // a tap or key during an entrance lands it (MOTION-SPEC §1 principle 5); scrolling does not
  function onInput(e) {
    if (!playing.length) return;
    if (e.type === 'keydown' && (e.key === 'Shift' || e.key === 'Tab')) return;
    finish(document);
  }
  try {
    document.addEventListener('pointerdown', onInput, true);
    document.addEventListener('keydown', onInput, true);
  } catch (e) { }

  /* ---------------------------------------------------------------- public */
  illus.has = function (name) { return !!REG[name]; };
  illus.names = function () { return ORDER.slice(); };
  illus.meta = function (name) {
    var d = REG[name];
    if (!d) return null;
    var a = ART[d.artboard];
    return {
      artboard: d.artboard, w: a[0], h: a[1], ground: a[2], safe: a[3].slice(), thumb: a[4].slice(),
      alt: { ja: d.alt.ja, en: d.alt.en }, priority: d.priority, poses: d.poses ? POSES.slice() : null
    };
  };
  illus.play = play;
  illus.mount = mount;
  illus.finish = finish;
  illus.register = register;
  illus.version = '4.0';
  SM.illus = illus;

  injectCss();

  /* ---------------------------------------------------------------- the set */
  var R = function (name, artboard, priority, ja, en, svg, dy) {
    register(name, { svg: svg, artboard: artboard, priority: priority, alt: { ja: ja, en: en }, dy: dy || 0 });
  };
  R('home-hero', 'hero', 'P1',
    '施設の玄関から一歩ふみ出す若者。見送る職員と、その先の新しい家へ続く道。',
    'A young person stepping out of a lit doorway, a staff member waving, and a route to a new home ahead.',
    '<g data-il="plate"><path class="il-green-t" d="M152 44h196v148h-196z"/></g><g data-il="scene"><path class="il-p3" d="M12 36h100v156h-100z"/><path class="il-marker" d="M40 58h44v134h-44z"/><path class="il-paper" d="M40 58l10 7v125l-10 2z"/><path class="il-line" d="M40 192v-134h44v134"/><path class="il-paper" d="M20 48h11v15h-11zM93 48h11v15h-11z"/></g><g data-il="fig2"><path class="il-ink" d="M62.5 131.5l3 28.5-3.5 28-10-1.5 4-26.5-3-27.5zM51.5 186h11v6h-11zM73 132.5l-3 27.5 4 26.5-10 1.5-3.5-28 3-28.5zM63.5 186h11v6h-11z"/><path class="il-navy" d="M48.5 99l3.5-4h22l3.5 4-1.5 40h-26z"/><path class="il-skin-3" d="M60 89h6v7.5h-6z"/><path class="il-hair-1" d="M51.5 80a11.5 11.5 0 1123 0a11.5 11.5 0 11-23 0z"/><path class="il-skin-3" d="M53.5 82.5a9.5 9.5 0 1119 0a9.5 9.5 0 11-19 0z"/><path class="il-hair-1" d="M54 80.5A9.5 9.5 0 0172 80.5A32.5 32.5 0 0054 80.5z"/><path class="il-navy" d="M55 99.5l.5 22.5-6.5 19.5-6-2 5.5-18.5v-21.5z"/><path class="il-sk-p" d="M55 99.5l.5 22.5M55.5 122l-5.5 16.5M48.5 99.5h6.5" stroke-width="1"/><path class="il-skin-3" d="M42 142.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0z"/><path class="il-navy" d="M72.5 96.5l16-10-8-15 6-3 11 20-21.5 14z"/><path class="il-sk-p" d="M76 102.5l-3.5-6" stroke-width="1"/><path class="il-skin-3" d="M79 68.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0z"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M84 188.5h181.5l1 3.5h-182.5z" data-il-ax="x" style="--d:180ms;--u:278ms" data-il-seg="0"/><path class="il-green" d="M265.5 188.5l10-10 1 3.5-10 10z" data-il-ax="xy" style="--d:458ms;--u:60ms" data-il-seg="1"/><path class="il-green" d="M275.5 178.5h72.5v3.5h-71.5z" data-il-ax="x" style="--d:480ms;--u:110ms" data-il-last="" data-il-seg="2"/></g><g data-il="prop" data-il-order="1"><path class="il-p3" d="M276 182h72v10h-72z"/><path class="il-paper" d="M292 178.5v-30l21-21 21 21v30z"/><path class="il-line" d="M292 178.5v-30M334 148.5v30"/><path class="il-ink" d="M288 150l25-25 25 25-2.5 2.5-22.5-22.5-22.5 22.5z"/><path class="il-green" d="M308 157.5h10.5v21h-10.5z"/><path class="il-p3" d="M298.5 156.5h8.5v8.5h-8.5z"/><path class="il-green" d="M343 176.5l-4.5-4.5v-3l4.5 4.5zM343 171.5l5-5v3.5l-5 5zM342.5 168.5h1v8.5h-1z"/><path class="il-ink" d="M339.5 176h7l-.5 6h-6z"/></g><g data-il="pin"><path class="il-green" d="M303.5 100h19v19h-3.5l-6 8-6-8h-3.5z"/><path class="il-paper" d="M310 106.5h6v6h-6z"/></g><g data-il="fig" data-il-order="1"><path class="il-green" d="M147 101l-3 20 15 11-4 5.5-18-13.5 3.5-24z"/><path class="il-skin-1" d="M155 136a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0z"/><path class="il-clay" d="M125 101.5l4-3.5 8 .5-2 30-12-1z"/><path class="il-ink" d="M146 133l3 30.5-20.5 22.5-7-6.5 17-19.5-2.5-26.5zM121.5 179l9 5 3.5 6-1 2.5-14.5-7.5zM147.5 131l12.5 27 3 28.5-10 1-3-27-11.5-25zM153 186l10-1.5 6.5 3 .5 3-16 2z"/><path class="il-green" d="M136 99l4-3.5 10.5 1 2 2-3 42.5-17-1z"/><path class="il-p3" d="M149.5 97.5h2.5l-3 43-2.5-.5z"/><path class="il-clay" d="M142.5 96h3l-1.5 21-3-.5z"/><path class="il-skin-1" d="M143.5 89l5.5.5-1.5 9-5.5-.5zM137.5 83.5a9.5 9.5 0 1119 0a9.5 9.5 0 11-19 0z"/><path class="il-hair-2" d="M139 78.5L138.5 78A10.5 10.5 0 11154 91.5L153.5 90.5z"/><path class="il-green" d="M147.5 103l-15.5 14v19h-6.5l-.5-22 18-16z"/><path class="il-sk-p" d="M147.5 103l-12.5 11.5M135.5 104.5l7.5-6.5M143 98l4.5 5" stroke-width="1"/><path class="il-skin-1" d="M125.5 137.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0z"/></g><g data-il="ground"><path class="il-line" d="M0 192h360"/></g>');
  R('home-jr-hero', 'hero', 'P1',
    '中学校の門から歩き出す中学生。手をふる先生と、その先の高校へ続く道。',
    'A junior-high student walking out of the school gate, a teacher waving, and a route to a high school ahead.',
    '<g data-il="plate"><path class="il-green-t" d="M156 44h192v148h-192z"/></g><g data-il="scene"><path class="il-p3" d="M12 72h110v120h-110z"/><path class="il-paper" d="M20 104h14v16h-14zM44 104h14v16h-14zM68 104h14v16h-14zM92 104h14v16h-14zM24.5 86a7.5 7.5 0 1115 0a7.5 7.5 0 11-15 0z"/><path class="il-sk" d="M24.5 86a7.5 7.5 0 1115 0a7.5 7.5 0 11-15 0z" stroke-width="1.5"/><path class="il-line" d="M32 86v-4.5M32 86h3.5"/><path class="il-paper" d="M44 134h10v58h-10z"/><path class="il-line" d="M44 192v-58h10v58"/><path class="il-paper" d="M104 134h10v58h-10z"/><path class="il-line" d="M104 192v-58h10v58"/></g><g data-il="fig2"><path class="il-ink" d="M78.5 132.5l3 28-3.5 27.5-9.5-1.5 3.5-26-3-27zM68 186h10.5v6h-10.5zM89 133.5l-3 27 3.5 26-9.5 1.5-3.5-27.5 3-28zM79.5 186h10.5v6h-10.5z"/><path class="il-navy" d="M65 100.5l3.5-3.5h21l3.5 3.5-1.5 39.5h-25z"/><path class="il-skin-3" d="M76 90.5h6v7.5h-6z"/><path class="il-hair-1" d="M67.5 82a11.5 11.5 0 1123 0a11.5 11.5 0 11-23 0z"/><path class="il-skin-3" d="M70 84.5a9 9 0 1118 0a9 9 0 11-18 0z"/><path class="il-hair-1" d="M70 82.5A9.5 9.5 0 0188 82.5A31.5 31.5 0 0070 82.5z"/><path class="il-navy" d="M71 101l.5 22.5-6 19-6.5-2 6-18-.5-21z"/><path class="il-sk-p" d="M71 101l.5 22.5M71.5 123.5l-5 16M65 101.5l6-.5" stroke-width="1"/><path class="il-skin-3" d="M58 143.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0z"/><path class="il-navy" d="M88.5 98.5l15.5-10-8-14.5 6-3.5 10.5 20-20.5 13.5z"/><path class="il-sk-p" d="M92 104l-3.5-5.5" stroke-width="1"/><path class="il-skin-3" d="M95 70.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0z"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M114 188.5h135.5l1 3.5h-136.5z" data-il-ax="x" style="--d:180ms;--u:234ms" data-il-seg="0"/><path class="il-green" d="M249.5 188.5l10-10 1 3.5-10 10z" data-il-ax="xy" style="--d:414ms;--u:60ms" data-il-seg="1"/><path class="il-green" d="M259.5 178.5h88.5v3.5h-87.5z" data-il-ax="x" style="--d:438ms;--u:152ms" data-il-last="" data-il-seg="2"/></g><g data-il="prop" data-il-order="1"><path class="il-p3" d="M260 182h88v10h-88z"/><path class="il-paper" d="M272 104h64v78h-64z"/><path class="il-line" d="M272 182v-78h64v78"/><path class="il-ink" d="M269 100.5h70v3.5h-70z"/><path class="il-p3" d="M280 114h12v12h-12zM298 114h12v12h-12z"/><path class="il-marker" d="M316 114h12v12h-12z"/><path class="il-p3" d="M280 134h12v12h-12zM298 134h12v12h-12zM316 134h12v12h-12z"/><path class="il-green" d="M297 156h14v26h-14z"/></g><g data-il="pin"><path class="il-green" d="M294.5 62h19v19h-3.5l-6 8-6-8h-3.5z"/><path class="il-paper" d="M301 68.5h6v6h-6z"/></g><g data-il="fig" data-il-order="1"><path class="il-navy" d="M176.5 107.5l-2.5 19 13.5 10-3.5 5-16.5-12.5 3-22.5z"/><path class="il-skin-2" d="M183.5 140a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0z"/><path class="il-ink" d="M176 137l2.5 28.5-19 21-6.5-6 16-18-2.5-24.5zM153 180l8.5 4.5 3 5.5-1 2.5-13-7zM177 135.5l11.5 25 3 26.5-9.5 1-2.5-25-11-23.5zM182.5 186.5l9-1.5 6 3 .5 2.5-15 2z"/><path class="il-navy" d="M167 105.5l3.5-3 9 1 2 2-3 39-14.5-1z"/><path class="il-paper" d="M178.5 104l2.5.5-3 39.5h-2.5z"/><path class="il-clay" d="M170.5 103h3l-7.5 35h-3zM158 132.5l13.5 1-1 14-13.5-1z"/><path class="il-skin-2" d="M173 96.5l5.5.5-1 8h-5.5zM168 91.5a9 9 0 1118 0a9 9 0 11-18 0z"/><path class="il-hair-1" d="M171 98L170.5 98A9.5 9.5 0 11184.5 85.5L184 86zM164 89.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0z"/><path class="il-navy" d="M177 109.5l-14.5 13 .5 17.5h-6.5v-20.5l16.5-15z"/><path class="il-sk-p" d="M177 109.5l-11 10M166.5 110.5l6.5-6M173 104.5l4 5" stroke-width="1"/><path class="il-skin-2" d="M156.5 141.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0z"/></g><g data-il="ground"><path class="il-line" d="M0 192h360"/></g>');
  R('about-team', 'hero', 'P2',
    '机をかこんで話しあう4人の高校生。ノートパソコン、資料、小銭のびん。ひとりが図をさしている。',
    'Four high-school students around a table with a laptop, papers and a coin jar; one points at a chart.',
    '<g data-il="plate"><path class="il-cat-money-t" d="M84 36h236v156h-236z"/></g><g data-il="scene"><path class="il-paper" d="M222 50h62v58h-62z"/><path class="il-line" d="M222 50h62v58h-62v-58"/><path class="il-green" d="M232 78h10v22h-10z"/><path class="il-amber" d="M247 86h10v14h-10z"/><path class="il-ink" d="M262 66h10v34h-10z"/><path class="il-line" d="M230 100h46"/></g><g data-il="fig2"><path class="il-clay" d="M144 114l3.5-3.5h17l3.5 3.5-1.5 37h-21z"/><path class="il-skin-3" d="M153 104.5h6v7h-6z"/><path class="il-hair-1" d="M166 98v17h-20v-17z"/><path class="il-skin-3" d="M147.5 99a8.5 8.5 0 1117 0a8.5 8.5 0 11-17 0z"/><path class="il-hair-1" d="M158 95l-4 2.5-6.5 3h-1v-3l.5-2.5 1.5-2.5 2-1.5 2.5-1.5 3-.5 3 .5 2.5 1.5 2 1.5 1.5 2.5 .5 2.5v3h-1z"/></g><g data-il="prop"><path class="il-p3" d="M110 155h98v37h-98z"/><path class="il-ink" d="M104 152h110v3.5h-110zM139 128h34v22.5h-34z"/><path class="il-paper" d="M154 137h4v4h-4zM112 149h22v3h-22z"/><path class="il-line" d="M112 149h22"/><path class="il-p3" d="M186 134h15v18h-15z"/><path class="il-amber" d="M187.5 145h12v7h-12z"/><path class="il-ink" d="M185 131h19v3h-19z"/></g><g data-il="scene" data-il-order="1"><path class="il-ink" d="M74 159h18v3h-18zM81.5 162h3v28h-3zM77 189.5h12v2.5h-12zM232 159h18v3h-18zM239.5 162h3v28h-3zM235 189.5h12v2.5h-12z"/></g><g data-il="fig" data-il-order="1"><path class="il-navy" d="M88.5 127l-.5 18 15.5 5-2 6-20-6 1-23z"/><path class="il-skin-2" d="M101 153.5a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M86.5 152.5l30 8-10.5 28.5-8-3 6.5-19.5-20.5-5zM98 186h9l5.5 3.5v2.5h-14.5zM88 152.5l29.5 7-8 29.5-9-3 6-19.5-20.5-5zM101 186h9l5.5 3.5v2.5h-14.5z"/><path class="il-navy" d="M78.5 126l3-3h10l2 2v33h-15.5z"/><path class="il-skin-2" d="M84.5 117h5l-.5 8h-5z"/><path class="il-hair-1" d="M87.5 115l-1 6h-8.5v-9.5l6-9z"/><path class="il-skin-2" d="M79 111.5a8.5 8.5 0 1117 0a8.5 8.5 0 11-17 0z"/><path class="il-hair-1" d="M82.5 118.5L81.5 119A9.5 9.5 0 1196 107L95 107.5z"/><path class="il-navy" d="M90 127l.5 18 16 4.5-2 6-20-5.5-1-23z"/><path class="il-sk-p" d="M90 127l.5 18M93.5 152.5l-9-2.5M84.5 150l-1-23M83.5 127h6.5" stroke-width="1"/><path class="il-skin-2" d="M104 153a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-green" d="M241.5 127l1 23-20 6-2-6 15.5-5-.5-18z"/><path class="il-skin-4" d="M217 153.5a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M240 161.5l-20.5 5 6.5 19.5-8 3-10.5-28.5 30-8zM226 192h-14.5v-2.5l5.5-3.5h9zM238 161.5l-20.5 5 6 19.5-9 3-8-29.5 29.5-7zM223 192h-14.5v-2.5l5.5-3.5h9z"/><path class="il-green" d="M246 158h-15.5v-33l2-2h10l3 3z"/><path class="il-skin-4" d="M240 125h-5l-.5-8h5zM228 111.5a8.5 8.5 0 1117 0a8.5 8.5 0 11-17 0z"/><path class="il-hair-1" d="M229.5 106.5L229 106A9 9 0 11243 118L242.5 118zM242.5 109.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0z"/><path class="il-green" d="M240.5 127l-1 23-20 5.5-2-6 16-4.5 .5-18z"/><path class="il-sk-p" d="M234 127l-.5 18M230.5 152.5l9-2.5M239.5 150l1-23M240.5 127h-6.5" stroke-width="1"/><path class="il-skin-4" d="M214 153a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="fig" data-il-order="2"><path class="il-ink" d="M303.5 102l5.5 21.5-3 19.5-6.5-1 3-18-5-20z"/><path class="il-skin-1" d="M299 144a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0z"/><path class="il-navy" d="M305.5 134.5l-2.5 26.5 3.5 25.5-9 1.5-4-27 2.5-27.5z"/><path class="il-ink" d="M306.5 192h-15.5v-2.5l6-3.5h9.5z"/><path class="il-navy" d="M304 135l-4.5 26 1.5 26-9.5.5-1.5-27 4.5-27z"/><path class="il-ink" d="M300.5 192h-15v-2.5l5.5-3.5h9.5zM308.5 141h-16v-40l2-2h10l3.5 3z"/><path class="il-skin-1" d="M302.5 101h-5.5l-.5-8.5h5zM289.5 87a9 9 0 1118 0a9 9 0 11-18 0z"/><path class="il-hair-2" d="M291 82L290 81.5A10 10 0 11305 94.5L304.5 93.5z"/><path class="il-ink" d="M301 105.5l-18 11.5-5-1.5-6-18 6-2 5 14 14.5-9z"/><path class="il-sk-p" d="M297.5 100.5l-5 3M292.5 111l8.5-5.5M301 105.5l-3.5-5" stroke-width="1"/><path class="il-skin-1" d="M271 94.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0z"/></g><g data-il="ground"><path class="il-line" d="M0 192h360"/></g>');
  register('q-figure', { artboard: 'figure', priority: 'P1', alt: { ja: '質問に答えながら歩いていく若者。', en: 'The young person walking through the questions.' }, poses: { stand:'<g data-il="fig"><path class="il-green" d="M25 38l-4 15 2.5 13.5-5 1-2.5-15 4-16z"/><path class="il-skin-1" d="M19 68a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-clay" d="M9.5 39l2.5-2.5h6v21h-8.5z"/><path class="il-ink" d="M26 60l2 21-2.5 20-7-1 2.5-19.5-2-19.5zM18.5 99.5h7l4.5 2.5v2h-11.5zM27 60l3 20.5-2 20.5-7-1 2-19-3-20zM21.5 99.5h7l4.5 2.5v2h-11.5z"/><path class="il-green" d="M17 36.5l2.5-2.5h8l1.5 1.5v30h-12z"/><path class="il-p3" d="M26.5 35h2v30h-2z"/><path class="il-clay" d="M21.5 34h2v15h-2z"/><path class="il-skin-1" d="M22 29.5h4l-.5 6h-4zM17.5 25a6.5 6.5 0 1113 0a6.5 6.5 0 11-13 0z"/><path class="il-hair-2" d="M20 30L19.5 30.5A7.5 7.5 0 1130.5 21.5L30 21.5z"/><path class="il-green" d="M26 37.5l-.5 15.5 2.5 14-4.5 1-3-14.5 .5-16.5z"/><path class="il-sk-p" d="M26 37.5l-.5 15.5M25.5 53l2.5 12.5M23 65.5l-2.5-12M20.5 53.5l.5-16.5M21 37l5 .5" stroke-width="1"/><path class="il-skin-1" d="M23.5 68.5a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/></g>',walk:'<g data-il="fig"><path class="il-green" d="M26 38.5l-1.5 15 9 10-3.5 3-10.5-11.5 2-17z"/><path class="il-skin-1" d="M30.5 66a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-clay" d="M10.5 39.5l3-2.5 5.5.5-1 21-8.5-.5z"/><path class="il-ink" d="M26 61.5l2 21.5-12.5 17-5.5-4 11-15-2-18.5zM10.5 95.5l6.5 3 2.5 4.5-.5 1.5-10.5-4.5zM27 60.5l8 19.5 1.5 20-7.5.5-1-19-7.5-18.5zM29.5 99.5l7-.5 4.5 2 .5 2-11.5 1.5z"/><path class="il-green" d="M18.5 37.5l2.5-2.5 7.5.5 1.5 1.5-1.5 30-12-.5z"/><path class="il-p3" d="M28 36.5h1.5l-1.5 30.5-2-.5z"/><path class="il-clay" d="M23 35.5h2l-1 14.5h-2z"/><path class="il-skin-1" d="M23.5 30.5l4 .5-1 6h-4zM19.5 26.5a6.5 6.5 0 1113 0a6.5 6.5 0 11-13 0z"/><path class="il-hair-2" d="M21.5 31.5L21 32A7.5 7.5 0 1132.5 22.5L32 23z"/><path class="il-green" d="M26.5 40l-10 11 .5 13.5-4.5.5-1-15.5 11.5-12.5z"/><path class="il-sk-p" d="M26.5 40l-9 10M17 60v4.5M18 42.5l5-5.5M23 37l3.5 3" stroke-width="1"/><path class="il-skin-1" d="M12.5 66a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/></g>',look:'<g data-il="fig"><path class="il-green" d="M25 38l-4 15 2 13.5-4.5 1-2.5-15 4-16z"/><path class="il-skin-1" d="M18.5 68a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-clay" d="M9.5 39l2.5-2.5h6v21h-8.5z"/><path class="il-ink" d="M26 60.5l2 20.5-3 20-7-1 3-19.5-2-19.5zM18 99.5h7.5l4 2.5v2h-11.5zM27 60l3.5 20.5-1.5 20.5-7-1 1.5-19-3.5-20zM22 99.5h7l4.5 2.5v2h-11.5z"/><path class="il-green" d="M17 36.5l2.5-2.5h8l1.5 1.5v30h-12z"/><path class="il-p3" d="M26.5 35h2v30h-2z"/><path class="il-clay" d="M21.5 34h2v15h-2z"/><path class="il-skin-1" d="M22 29.5h4l-.5 6h-4zM18 25a6.5 6.5 0 1113 0a6.5 6.5 0 11-13 0z"/><path class="il-hair-2" d="M22 31L21.5 31.5A7.5 7.5 0 1129.5 19L29 20z"/><path class="il-green" d="M26 37.5l-2.5 15.5 4 13.5-5 1-4-14.5 2.5-16z"/><path class="il-sk-p" d="M26 37.5l-2.5 15.5M23.5 53l3.5 12.5M22 65.5l-3.5-12.5M18.5 53l2.5-16M21 37l5 .5" stroke-width="1"/><path class="il-skin-1" d="M23 68a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/></g>',map:'<g data-il="fig"><path class="il-green" d="M25 38l-3 12.5 11-.5v5h-14l-2.5-3 3.5-15.5z"/><path class="il-skin-1" d="M32 52.5a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-clay" d="M9.5 39l2.5-2.5h6v21h-8.5z"/><path class="il-ink" d="M26 60.5l1.5 20.5-3 20-7-1 3-19.5-1.5-19.5zM18 99.5h7l4 2.5v2h-11zM27 60l3.5 20.5-1.5 20.5-7-1 1.5-19-3.5-20zM22 99.5h7l4.5 2.5v2h-11.5z"/><path class="il-green" d="M17 36.5l2.5-2.5h8l1.5 1.5v30h-12z"/><path class="il-p3" d="M26.5 35h2v30h-2z"/><path class="il-clay" d="M21.5 34h2v15h-2z"/><path class="il-skin-1" d="M22 29.5h4l-.5 6h-4zM18.5 26a6.5 6.5 0 1113 0a6.5 6.5 0 11-13 0z"/><path class="il-hair-2" d="M19.5 29L19 29.5A7.5 7.5 0 1132.5 24L31.5 24z"/><path class="il-green" d="M26 37.5l-2.5 13 11.5 1-.5 5-17-1.5 4-18.5z"/><path class="il-sk-p" d="M26 37.5l-2.5 13M23.5 50.5l5.5.5M29 56l-11.5-1M17.5 55l4-18.5M21.5 36.5l4.5 1" stroke-width="1"/><path class="il-skin-1" d="M33.5 54a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-paper" d="M32.5 43.5h16v12h-16z"/><path class="il-line" d="M32.5 43.5h16v12h-16v-12M40.5 43.5v12"/><path class="il-green" d="M35 51.5h4l3-4h4v2h-3l-3 4h-5z"/><path class="il-skin-1" d="M33.5 54a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/></g>',think:'<g data-il="fig"><path class="il-green" d="M24.5 38.5l-6 9.5 9.5-1 .5 5-14 1-2.5-3.5 8.5-13.5z"/><path class="il-skin-1" d="M27 49.5a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-clay" d="M9.5 39l2.5-2.5h6v21h-8.5z"/><path class="il-ink" d="M26 60.5l2 20.5-3 20-7-1 3-19.5-2-19.5zM18 99.5h7.5l4 2.5v2h-11.5zM27 60l3.5 20.5-1.5 20.5-7-1 1.5-19-3.5-20zM22 99.5h7l4.5 2.5v2h-11.5z"/><path class="il-green" d="M17 36.5l2.5-2.5h8l1.5 1.5v30h-12z"/><path class="il-p3" d="M26.5 35h2v30h-2z"/><path class="il-clay" d="M21.5 34h2v15h-2z"/><path class="il-skin-1" d="M22 29.5h4l-.5 6h-4zM18 25a6.5 6.5 0 1113 0a6.5 6.5 0 11-13 0z"/><path class="il-hair-2" d="M21 31L21 31.5A7.5 7.5 0 1130 20L29.5 20.5z"/><path class="il-green" d="M24.5 35l8 3-4-5.5 4.5-2.5 7.5 12-3 3.5-15-6z"/><path class="il-sk-p" d="M24.5 35l4.5 1.5M29 42l-6.5-2.5M22.5 39.5l2-4.5" stroke-width="1"/><path class="il-skin-1" d="M27.5 30a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/></g>',wave:'<g data-il="fig"><path class="il-ink" d="M23.5 60l2.5 21-3 20-7-1 3-19.5-2.5-19.5zM15.5 99.5h8v4.5h-8zM31.5 61l-2.5 19.5 3 19.5-7 1-3-20 2.5-21zM24.5 99.5h8v4.5h-8z"/><path class="il-green" d="M14.5 37l3-3h13l3 3-1 28.5h-17z"/><path class="il-skin-1" d="M21.5 29.5h5v5.5h-5zM17.5 25a6.5 6.5 0 1113 0a6.5 6.5 0 11-13 0z"/><path class="il-hair-2" d="M27 24l-4.5.5-5 2h-.5l-.5-2 .5-2 1-2 1.5-1.5 2-1 2-.5 2.5.5 2 .5 1.5 1.5 1 2 1 2v2h-1z"/><path class="il-green" d="M19.5 37.5l-1 16-4.5 14-4.5-1.5 4-13 1-16z"/><path class="il-sk-p" d="M19.5 37.5l-1 16M18.5 53.5l-3 9M14.5 37l5 .5" stroke-width="1"/><path class="il-skin-1" d="M9 68a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-green" d="M30 35l11.5-7-5-11 4.5-2 7 15-15.5 9.5z"/><path class="il-sk-p" d="M32.5 39.5l-2.5-4.5" stroke-width="1"/><path class="il-skin-1" d="M36 14.5a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/></g>' } });
  R('q-stage', 'strip', 'P1',
    '中学校から高校、そして自分の部屋へ。少しずつ高くなる三つの建物。',
    'A junior high school, a high school, then a room of your own: three buildings, each a step higher.',
    '<g data-il="scene"><path class="il-p3" d="M152 108l8-8h200v8zM246 100l8-8h106v8z"/></g><g data-il="prop"><path class="il-paper" d="M92 80h48v28h-48z"/><path class="il-line" d="M92 108v-28h48v28"/><path class="il-ink" d="M89 76.5h54v3.5h-54z"/><path class="il-p3" d="M98 86h8v8h-8zM126 86h8v8h-8z"/><path class="il-navy" d="M110.5 94h11v14h-11z"/><path class="il-paper" d="M110 69a6 6 0 1112 0a6 6 0 11-12 0z"/><path class="il-sk" d="M110 69a6 6 0 1112 0a6 6 0 11-12 0z" stroke-width="1.5"/><path class="il-line" d="M116 69v-3.5"/></g><g data-il="prop" data-il-order="1"><path class="il-paper" d="M168 60h66v40h-66z"/><path class="il-line" d="M168 100v-40h66v40"/><path class="il-ink" d="M165 56.5h72v3.5h-72z"/><path class="il-p3" d="M178.5 66h8v8h-8zM197 66h8v8h-8zM215.5 66h8v8h-8zM178.5 78h8v8h-8zM215.5 78h8v8h-8z"/><path class="il-navy" d="M195.5 86h11v14h-11z"/><path class="il-paper" d="M195 49a6 6 0 1112 0a6 6 0 11-12 0z"/><path class="il-sk" d="M195 49a6 6 0 1112 0a6 6 0 11-12 0z" stroke-width="1.5"/><path class="il-line" d="M201 49v-3.5"/></g><g data-il="prop" data-il-order="2"><path class="il-paper" d="M262 46h64v46h-64z"/><path class="il-line" d="M262 92v-46h64v46"/><path class="il-ink" d="M259 42.5h70v3.5h-70zM262 67.5h68v3h-68zM331 68l21.5 21.5-2 2-21.5-21.5z"/><path class="il-p3" d="M270.5 52h10v11h-10z"/><path class="il-marker" d="M289 52h10v11h-10z"/><path class="il-p3" d="M307.5 52h10v11h-10zM270.5 75h10v11h-10zM289 75h10v11h-10zM307.5 75h10v11h-10z"/></g><g data-il="pin"><path class="il-green" d="M286 14h16v16h-3l-5 6.5-5-6.5h-3z"/><path class="il-paper" d="M291.5 19.5h5v5h-5z"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M0 105.5h30v2.5h-30z" data-il-ax="x" style="--d:180ms;--u:410ms" data-il-last="" data-il-seg="0"/></g><g data-il="base"><path class="il-line" d="M0 108h360"/></g>');
  R('q-path', 'strip', 'P1',
    '進学と仕事、二つの方向をさす道しるべ。',
    'A signpost pointing two ways: to school and to work.',
    '<g data-il="scene"><path class="il-ink" d="M156.5 26h3v82h-3z"/><path class="il-paper" d="M158 32h40l7 7.5-7 7.5h-40z"/><path class="il-line" d="M158 32h40l7 7.5-7 7.5h-40v-15"/><path class="il-navy" d="M173 35.5h11v8h-11z"/><path class="il-paper" d="M173 41h11v1h-11zM160 54h34l7 7.5-7 7.5h-34z"/><path class="il-line" d="M160 54h34l7 7.5-7 7.5h-34v-15"/><path class="il-clay" d="M171 59h13v7h-13z"/><path class="il-ink" d="M174 59v-2.5h7v2.5h-1v-1.5h-5v1.5z"/></g><g data-il="prop"><path class="il-p3" d="M212 82h50v26h-50zM212 82v-12l16.5 12v-12l17 12v-12l16.5 12z"/><path class="il-clay" d="M231 92h12v16h-12z"/><path class="il-p3" d="M272 108l14-14h74v14z"/><path class="il-paper" d="M290 50h60v44h-60z"/><path class="il-line" d="M290 94v-44h60v44"/><path class="il-ink" d="M287 46.5h66v3.5h-66z"/><path class="il-paper" d="M313 38a7 7 0 1114 0a7 7 0 11-14 0z"/><path class="il-sk" d="M313 38a7 7 0 1114 0a7 7 0 11-14 0z" stroke-width="1.5"/><path class="il-line" d="M320 38v-4"/><path class="il-p3" d="M297 59h10v10h-10zM315 59h10v10h-10zM333 59h10v10h-10z"/><path class="il-navy" d="M314 76h12v18h-12z"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M0 105.5h84v2.5h-84z" data-il-ax="x" style="--d:180ms;--u:410ms" data-il-last="" data-il-seg="0"/></g><g data-il="base"><path class="il-line" d="M0 108h360"/></g>');
  R('q-area', 'strip', 'P1',
    '東京の家なみと、ひとつの家に立つピン。',
    'A row of Tokyo houses; a pin drops on one of them.',
    '<g data-il="scene"><path class="il-p3" d="M22 30h38v78h-38z"/><path class="il-paper" d="M27 36h6v8h-6zM38 36h6v8h-6zM49 36h6v8h-6zM27 52h6v8h-6zM38 52h6v8h-6zM49 52h6v8h-6zM27 68h6v8h-6zM38 68h6v8h-6zM49 68h6v8h-6zM27 84h6v8h-6zM38 84h6v8h-6zM49 84h6v8h-6z"/><path class="il-p3" d="M66 108v-26l15-15 15 15v26zM100 108v-22l12-12 12 12v22zM256 108v-24l14-14 14 14v24zM290 46h34v62h-34zM330 108v-22l13-13 13 13v22z"/></g><g data-il="prop"><path class="il-paper" d="M206 108v-30l18-18 18 18v30z"/><path class="il-line" d="M206 108v-30M242 78v30"/><path class="il-ink" d="M202 79.5l22-22 22 22-2.5 2.5-19.5-19.5-19.5 19.5z"/><path class="il-green" d="M219.5 90h9v18h-9z"/><path class="il-p3" d="M212 86h7v7h-7z"/></g><g data-il="pin"><path class="il-green" d="M216 22h16v16h-3l-5 6.5-5-6.5h-3z"/><path class="il-paper" d="M221.5 27.5h5v5h-5z"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M0 105.5h138v2.5h-138z" data-il-ax="x" style="--d:180ms;--u:410ms" data-il-last="" data-il-seg="0"/></g><g data-il="base"><path class="il-line" d="M0 108h360"/></g>');
  R('q-concerns', 'strip', 'P1',
    '駅の掲示板の前で考える若者。六まいの貼り紙に、住まい・お金・学び・仕事・手続き・相談の色。',
    'A young person thinking in front of a station noticeboard: six pinned notes, one colour for each worry.',
    '<g data-il="scene"><path class="il-ink" d="M253 86h3v22h-3zM336 86h3v22h-3z"/><path class="il-p3" d="M244 24h104v62h-104z"/><path class="il-ink" d="M244 24h104v9h-104z"/><path class="il-paper" d="M251 27.5h20v2h-20z"/><path class="il-line" d="M244 86h104"/></g><g data-il="prop"><path class="il-paper" d="M251 35h26v21h-26z"/><path class="il-cat-housing" d="M251 35h26v3.5h-26z"/><path class="il-p3" d="M255 43h18v1.5h-18zM255 47.5h11v1.5h-11z"/><path class="il-ink" d="M262.5 37a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/><path class="il-paper" d="M283 34h26v19h-26z"/><path class="il-cat-money" d="M283 34h26v3.5h-26z"/><path class="il-p3" d="M287 42h18v1.5h-18zM287 46.5h11v1.5h-11z"/><path class="il-ink" d="M294.5 36a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/><path class="il-paper" d="M315 36h27v20h-27z"/><path class="il-cat-education" d="M315 36h27v3.5h-27z"/><path class="il-p3" d="M319 44h19v1.5h-19zM319 48.5h11.5v1.5h-11.5z"/><path class="il-ink" d="M327 38a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/></g><g data-il="accent"><path class="il-paper" d="M252 61h25v19h-25z"/><path class="il-cat-work" d="M252 61h25v3.5h-25z"/><path class="il-p3" d="M256 69h17v1.5h-17zM256 73.5h10v1.5h-10z"/><path class="il-ink" d="M263 63a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/><path class="il-paper" d="M284 60h27v21h-27z"/><path class="il-cat-procedures" d="M284 60h27v3.5h-27z"/><path class="il-p3" d="M288 68h19v1.5h-19zM288 72.5h11.5v1.5h-11.5z"/><path class="il-ink" d="M296 62a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/><path class="il-paper" d="M316 62h25v18h-25z"/><path class="il-cat-consult" d="M316 62h25v3.5h-25z"/><path class="il-p3" d="M320 70h17v1.5h-17zM320 74.5h10v1.5h-10z"/><path class="il-ink" d="M327 64a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M0 105.5h192v2.5h-192z" data-il-ax="x" style="--d:180ms;--u:410ms" data-il-last="" data-il-seg="0"/></g><g data-il="base"><path class="il-line" d="M0 108h360"/></g>');
  R('q-age', 'strip', 'P1',
    '背の高さの印がついたドア枠と、車いすの若者。',
    'A door frame with height marks; a young adult in a wheelchair beside it.',
    '<g data-il="scene"><path class="il-p3" d="M228 6h76v102h-76z"/><path class="il-paper" d="M236 12h56v96h-56z"/><path class="il-line" d="M236 108v-96h56v96M236 80h7M236 68h7M236 57h7M236 47h7M236 39h7"/><path class="il-green" d="M236 30h9v2h-9z"/></g><g data-il="fig2"><path class="il-sk" d="M163 94.5a12 12 0 1124 0a12 12 0 11-24 0z" stroke-width="2.5"/><path class="il-ink" d="M173.5 93.5h2.5v2.5h-2.5zM187 105.5a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0zM170 80.5h17v2h-17zM168.5 82.5l-1-23.5h-4v-2h6l1.5 25.5zM186.5 81.5l3.5 23.5-1.5.5-4-24z"/><path class="il-green" d="M178 55.5l-.5 15.5 5.5 12.5-4.5 2-6-13.5 .5-16.5z"/><path class="il-skin-4" d="M178.5 85.5a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-ink" d="M176 75.5l23.5 5.5-6.5 22.5-6.5-2 4-15.5-16-4zM186.5 101.5h7l4.5 2.5v2h-11.5zM177.5 75.5l23 5-5.5 23-7-2 4-15.5-16-4zM188.5 101.5h7l4.5 2.5v2h-11.5z"/><path class="il-green" d="M170 54.5l2.5-2.5h8l1.5 1.5v26h-12z"/><path class="il-skin-4" d="M175 47.5h4l-.5 6.5h-4z"/><path class="il-clay" d="M173.5 50.5h6.5v4.5h-6.5zM177 54h3l1 13h-3z"/><path class="il-hair-1" d="M170.5 37.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0zM167 41.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0zM168 46a3 3 0 116 0a3 3 0 11-6 0zM176 36.5a3 3 0 116 0a3 3 0 11-6 0zM180 39a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-skin-4" d="M170.5 43.5a6.5 6.5 0 1113 0a6.5 6.5 0 11-13 0z"/><path class="il-hair-1" d="M172.5 48L172 48A7 7 0 11183 39L182.5 39.5z"/><path class="il-green" d="M179 55.5l-1.5 15 7 12-4.5 2.5-7.5-13 1.5-17z"/><path class="il-sk-p" d="M179 55.5l-1.5 15M177.5 70.5l4.5 7.5M177 79.5l-4.5-7.5M172.5 72l1.5-17M174 55l5 .5" stroke-width="1"/><path class="il-skin-4" d="M180.5 85a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-ink" d="M187 102.5h9.5v2h-9.5z"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M0 105.5h246v2.5h-246z" data-il-ax="x" style="--d:180ms;--u:410ms" data-il-last="" data-il-seg="0"/></g><g data-il="base"><path class="il-line" d="M0 108h360"/></g>');
  R('q-care', 'strip', 'P1',
    '窓に明かりのついた家。家の前で職員と子どもが手をふって見送る。',
    'A house with a lit window; a carer and a child wave goodbye in front of it.',
    '<g data-il="scene"><path class="il-paper" d="M112 108v-48l56-56 56 56v48z"/><path class="il-line" d="M112 108v-48M224 60v48"/><path class="il-ink" d="M108 61.5l60-60 60 60-2.5 2.5-57.5-57.5-57.5 57.5z"/><path class="il-green" d="M158 52h28v56h-28z"/><path class="il-marker" d="M124 70h20v20h-20z"/><path class="il-paper" d="M133 70h2v20h-2z"/></g><g data-il="fig2"><path class="il-ink" d="M239.5 62.5l2.5 21.5-3 21-7-1 2.5-20-2-20.5zM231.5 103.5h8v4.5h-8zM247.5 63.5l-2 20.5 2.5 20-7 1-3-21 2.5-21.5zM240.5 103.5h8v4.5h-8z"/><path class="il-navy" d="M229 38l3-2.5h16l3 2.5-1.5 30h-19z"/><path class="il-skin-3" d="M237.5 30.5h5v5.5h-5z"/><path class="il-hair-1" d="M231 24a9 9 0 1118 0a9 9 0 11-18 0z"/><path class="il-skin-3" d="M233 26a7 7 0 1114 0a7 7 0 11-14 0z"/><path class="il-hair-1" d="M233 24A7.5 7.5 0 01247 24A24.5 24.5 0 00233 24z"/><path class="il-navy" d="M234 38.5l.5 17-5 14.5-4.5-1.5 4.5-13.5-.5-16.5z"/><path class="il-sk-p" d="M234 38.5l.5 17M234.5 55.5l-4 12.5M229 38.5h5" stroke-width="1"/><path class="il-skin-3" d="M224.5 70.5a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-navy" d="M247 36.5l12-8-6-11 4.5-2.5 8.5 15.5-16 10z"/><path class="il-sk-p" d="M250 40.5l-3-4" stroke-width="1"/><path class="il-skin-3" d="M252.5 15a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-ink" d="M259.5 81l1.5 12.5-1.5 12.5-4.5-.5 2-12-1.5-12zM255 105h4.5v3h-4.5zM264.5 81.5l-1.5 12 2 12-4.5.5-1.5-12.5 1.5-12.5zM260.5 105h4.5v3h-4.5z"/><path class="il-clay" d="M254 66.5l2-2h8l2 2-1 18h-10z"/><path class="il-skin-2" d="M258.5 62h3v3h-3z"/><path class="il-hair-2" d="M262 57.5a2 2 0 114 0a2 2 0 11-4 0zM260 55.5a2 2 0 114 0a2 2 0 11-4 0zM257 55a2 2 0 114 0a2 2 0 11-4 0zM254.5 56.5a2 2 0 114 0a2 2 0 11-4 0zM253.5 59a2 2 0 114 0a2 2 0 11-4 0zM263 60a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0zM255 61.5a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/><path class="il-skin-2" d="M256 59a4 4 0 118 0a4 4 0 11-8 0z"/><path class="il-hair-2" d="M256 59.5L255.5 59.5A4.5 4.5 0 11264.5 59.5L264 59.5z"/><path class="il-clay" d="M257 66.5l-.5 10.5-2.5 8.5-3-1 2.5-8.5 .5-9.5z"/><path class="il-sk-p" d="M257 66.5l-.5 10.5M256.5 77l-1.5 5.5" stroke-width="1"/><path class="il-skin-2" d="M250.5 86a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/><path class="il-clay" d="M266 66.5l.5 9.5 2.5 8.5-3 1-2.5-8.5-.5-10.5z"/><path class="il-sk-p" d="M265 82.5l-1.5-5.5M263.5 77l-.5-10.5" stroke-width="1"/><path class="il-skin-2" d="M266.5 86a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M0 105.5h300v2.5h-300z" data-il-ax="x" style="--d:180ms;--u:410ms" data-il-last="" data-il-seg="0"/></g><g data-il="base"><path class="il-line" d="M0 108h360"/></g>');
  R('results-arrive', 'strip', 'P2',
    'ピンの立つ家にたどりつく若者。',
    'The young person arriving at the house under the pin.',
    '<g data-il="route" data-il-segs=""><path class="il-green" d="M0 105h261.5l1 3h-262.5z" data-il-ax="x" style="--d:180ms;--u:295ms" data-il-seg="0"/><path class="il-green" d="M261.5 105l9-9 1 3-9 9z" data-il-ax="xy" style="--d:475ms;--u:60ms" data-il-seg="1"/><path class="il-green" d="M270.5 96h89.5v3h-88.5z" data-il-ax="x" style="--d:490ms;--u:100ms" data-il-last="" data-il-seg="2"/></g><g data-il="prop"><path class="il-p3" d="M271 99h89v9h-89z"/><path class="il-paper" d="M288 96.5v-28l20-20 20 20v28z"/><path class="il-line" d="M288 96.5v-28M328 68.5v28"/><path class="il-ink" d="M284 70l24-24 24 24-2.5 2.5-21.5-21.5-21.5 21.5z"/><path class="il-green" d="M303 76.5h10v20h-10z"/><path class="il-p3" d="M294.5 76h8v8h-8z"/></g><g data-il="pin"><path class="il-green" d="M300 26h16v16h-3l-5 6.5-5-6.5h-3z"/><path class="il-paper" d="M305.5 31.5h5v5h-5z"/></g><g data-il="fig"><path class="il-green" d="M227 42.5l-1.5 15 9 10-3.5 3-10.5-11.5 2-17z"/><path class="il-skin-1" d="M231.5 70a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-clay" d="M211.5 43.5l3-2.5 5.5.5-1 21-8.5-.5z"/><path class="il-ink" d="M227 65.5l2 21.5-12.5 17-5.5-4 11-15-2-18.5zM211.5 99.5l6.5 3 2.5 4.5-.5 1.5-10.5-4.5zM228 64.5l8 19.5 1.5 20-7.5.5-1-19-7.5-18.5zM230.5 103.5l7-.5 4.5 2 .5 2-11.5 1.5z"/><path class="il-green" d="M219.5 41.5l2.5-2.5 7.5.5 1.5 1.5-1.5 30-12-.5z"/><path class="il-p3" d="M229 40.5h1.5l-1.5 30.5-2-.5z"/><path class="il-clay" d="M224 39.5h2l-1 14.5h-2z"/><path class="il-skin-1" d="M224.5 34.5l4 .5-1 6h-4zM220.5 30.5a6.5 6.5 0 1113 0a6.5 6.5 0 11-13 0z"/><path class="il-hair-2" d="M222.5 35.5L222 36A7.5 7.5 0 11233.5 26.5L233 27z"/><path class="il-green" d="M227.5 44l-10 11 .5 13.5-4.5.5-1-15.5 11.5-12.5z"/><path class="il-sk-p" d="M227.5 44l-9 10M218 64v4.5M219 46.5l5-5.5M224 41l3.5 3" stroke-width="1"/><path class="il-skin-1" d="M213.5 70a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/></g><g data-il="ground"><path class="il-line" d="M0 108h360"/></g>');
  R('q-stage-wide', 'wide', 'P2',
    '中学校から高校、そして自分の部屋へ。少しずつ高くなる三つの建物。',
    'A junior high school, a high school, then a room of your own: three buildings, each a step higher.',
    '<g data-il="scene"><path class="il-p3" d="M292 108l8-8h420v8zM486 100l8-8h226v8z"/></g><g data-il="prop"><path class="il-paper" d="M156 80h48v28h-48z"/><path class="il-line" d="M156 108v-28h48v28"/><path class="il-ink" d="M153 76.5h54v3.5h-54z"/><path class="il-p3" d="M162 86h8v8h-8zM190 86h8v8h-8z"/><path class="il-navy" d="M174.5 94h11v14h-11z"/><path class="il-paper" d="M174 69a6 6 0 1112 0a6 6 0 11-12 0z"/><path class="il-sk" d="M174 69a6 6 0 1112 0a6 6 0 11-12 0z" stroke-width="1.5"/><path class="il-line" d="M180 69v-3.5"/></g><g data-il="prop" data-il-order="1"><path class="il-paper" d="M330 60h66v40h-66z"/><path class="il-line" d="M330 100v-40h66v40"/><path class="il-ink" d="M327 56.5h72v3.5h-72z"/><path class="il-p3" d="M340.5 66h8v8h-8zM359 66h8v8h-8zM377.5 66h8v8h-8zM340.5 78h8v8h-8zM377.5 78h8v8h-8z"/><path class="il-navy" d="M357.5 86h11v14h-11z"/><path class="il-paper" d="M357 49a6 6 0 1112 0a6 6 0 11-12 0z"/><path class="il-sk" d="M357 49a6 6 0 1112 0a6 6 0 11-12 0z" stroke-width="1.5"/><path class="il-line" d="M363 49v-3.5"/></g><g data-il="prop" data-il-order="2"><path class="il-paper" d="M530 46h64v46h-64z"/><path class="il-line" d="M530 92v-46h64v46"/><path class="il-ink" d="M527 42.5h70v3.5h-70zM530 67.5h68v3h-68zM599 68l21.5 21.5-2 2-21.5-21.5z"/><path class="il-p3" d="M538.5 52h10v11h-10z"/><path class="il-marker" d="M557 52h10v11h-10z"/><path class="il-p3" d="M575.5 52h10v11h-10zM538.5 75h10v11h-10zM557 75h10v11h-10zM575.5 75h10v11h-10z"/></g><g data-il="pin"><path class="il-green" d="M554 14h16v16h-3l-5 6.5-5-6.5h-3z"/><path class="il-paper" d="M559.5 19.5h5v5h-5z"/></g><g data-il="scene"><path class="il-green" d="M252 100l-6.5-6.5v-4.5l6.5 6.5zM252 92.5l7-7v5.5l-7 7zM251.5 88h1.5v12.5h-1.5z"/><path class="il-clay" d="M246.5 99h11l-1.5 9h-8z"/><path class="il-green" d="M668 83l-7-7v-5l7 7zM668 75l8-8v6l-8 8zM667 70h1.5v14h-1.5z"/><path class="il-clay" d="M662 82h12l-1.5 10h-9z"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M0 105.5h60v2.5h-60z" data-il-ax="x" style="--d:180ms;--u:410ms" data-il-last="" data-il-seg="0"/></g><g data-il="base"><path class="il-line" d="M0 108h720"/></g>');
  R('q-path-wide', 'wide', 'P2',
    '進学と仕事、二つの方向をさす道しるべ。',
    'A signpost pointing two ways: to school and to work.',
    '<g data-il="scene"><path class="il-ink" d="M242.5 26h3v82h-3z"/><path class="il-paper" d="M244 32h40l7 7.5-7 7.5h-40z"/><path class="il-line" d="M244 32h40l7 7.5-7 7.5h-40v-15"/><path class="il-navy" d="M259 35.5h11v8h-11z"/><path class="il-paper" d="M259 41h11v1h-11zM246 54h34l7 7.5-7 7.5h-34z"/><path class="il-line" d="M246 54h34l7 7.5-7 7.5h-34v-15"/><path class="il-clay" d="M257 59h13v7h-13z"/><path class="il-ink" d="M260 59v-2.5h7v2.5h-1v-1.5h-5v1.5z"/></g><g data-il="prop"><path class="il-p3" d="M326 82h66v26h-66zM326 82v-12l16.5 12v-12l16.5 12v-12l16.5 12v-12l16.5 12z"/><path class="il-clay" d="M353 92h12v16h-12z"/><path class="il-p3" d="M396 90h40v18h-40zM396 90v-12l20 12v-12l20 12z"/></g><g data-il="prop" data-il-order="1"><path class="il-p3" d="M512 108l14-14h194v14z"/><path class="il-paper" d="M566 50h78v44h-78z"/><path class="il-line" d="M566 94v-44h78v44"/><path class="il-ink" d="M563 46.5h84v3.5h-84z"/><path class="il-paper" d="M598 38a7 7 0 1114 0a7 7 0 11-14 0z"/><path class="il-sk" d="M598 38a7 7 0 1114 0a7 7 0 11-14 0z" stroke-width="1.5"/><path class="il-line" d="M605 38v-4"/><path class="il-p3" d="M573.5 59h10v10h-10zM591 59h10v10h-10zM609 59h10v10h-10zM626.5 59h10v10h-10z"/><path class="il-navy" d="M599 76h12v18h-12z"/><path class="il-green" d="M470 100.5l-6-6v-4.5l6 6zM470 93.5l7-6.5v5l-7 6.5zM469.5 89.5h1.5v12h-1.5z"/><path class="il-clay" d="M465 99.5h10l-1 8.5h-8z"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M0 105.5h168v2.5h-168z" data-il-ax="x" style="--d:180ms;--u:410ms" data-il-last="" data-il-seg="0"/></g><g data-il="base"><path class="il-line" d="M0 108h720"/></g>');
  R('q-area-wide', 'wide', 'P2',
    '東京の家なみと、ひとつの家に立つピン。',
    'A row of Tokyo houses; a pin drops on one of them.',
    '<g data-il="scene"><path class="il-p3" d="M28 30h38v78h-38z"/><path class="il-paper" d="M35 36h8v8h-8zM51 36h8v8h-8zM35 52h8v8h-8zM51 52h8v8h-8zM35 68h8v8h-8zM51 68h8v8h-8zM35 84h8v8h-8zM51 84h8v8h-8z"/><path class="il-p3" d="M74 108v-26l15-15 15 15v26zM110 108v-22l12-12 12 12v22zM140 108v-30l14-14 14 14v30zM176 108v-20l11-11 11 11v20zM404 52h30v56h-30zM440 108v-22l13-13 13 13v22zM474 108v-26l15-15 15 15v26zM516 20h44v88h-44z"/><path class="il-paper" d="M522 27h6v8h-6zM535 27h6v8h-6zM548 27h6v8h-6zM522 42h6v8h-6zM535 42h6v8h-6zM548 42h6v8h-6zM522 57h6v8h-6zM535 57h6v8h-6zM548 57h6v8h-6zM522 72h6v8h-6zM535 72h6v8h-6zM548 72h6v8h-6zM522 87h6v8h-6zM535 87h6v8h-6zM548 87h6v8h-6z"/><path class="il-p3" d="M568 108v-24l14-14 14 14v24zM602 108v-30l12-12 12 12v30zM634 108v-22l15-15 15 15v22zM672 108v-26l13-13 13 13v26z"/></g><g data-il="prop"><path class="il-paper" d="M342 108v-32l20-20 20 20v32z"/><path class="il-line" d="M342 108v-32M382 76v32"/><path class="il-ink" d="M338 77.5l24-24 24 24-2.5 2.5-21.5-21.5-21.5 21.5z"/><path class="il-green" d="M357 88h10v20h-10z"/><path class="il-p3" d="M348.5 84.5h8v8h-8z"/></g><g data-il="pin"><path class="il-green" d="M354 18h16v16h-3l-5 6.5-5-6.5h-3z"/><path class="il-paper" d="M359.5 23.5h5v5h-5z"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M0 105.5h276v2.5h-276z" data-il-ax="x" style="--d:180ms;--u:410ms" data-il-last="" data-il-seg="0"/></g><g data-il="base"><path class="il-line" d="M0 108h720"/></g>');
  R('q-concerns-wide', 'wide', 'P2',
    '駅の掲示板の前で考える若者。六まいの貼り紙に、住まい・お金・学び・仕事・手続き・相談の色。',
    'A young person thinking in front of a station noticeboard: six pinned notes, one colour for each worry.',
    '<g data-il="scene"><path class="il-ink" d="M449 86h3v22h-3zM532 86h3v22h-3z"/><path class="il-p3" d="M440 24h104v62h-104z"/><path class="il-ink" d="M440 24h104v9h-104z"/><path class="il-paper" d="M447 27.5h20v2h-20z"/><path class="il-line" d="M440 86h104"/><path class="il-ink" d="M250 78h54v3.5h-54zM256 81.5h3v26.5h-3zM295 81.5h3v26.5h-3zM610 70h3v38h-3zM673 70h3v38h-3z"/><path class="il-paper" d="M600 40h86v30h-86z"/><path class="il-line" d="M600 40h86v30h-86v-30"/><path class="il-p3" d="M629 47h28v5h-28z"/><path class="il-green" d="M600 61h86v4h-86z"/><path class="il-p3" d="M606 66.5h14v1.5h-14zM666 66.5h14v1.5h-14z"/></g><g data-il="prop"><path class="il-paper" d="M447 35h26v21h-26z"/><path class="il-cat-housing" d="M447 35h26v3.5h-26z"/><path class="il-p3" d="M451 43h18v1.5h-18zM451 47.5h11v1.5h-11z"/><path class="il-ink" d="M458.5 37a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/><path class="il-paper" d="M479 34h26v19h-26z"/><path class="il-cat-money" d="M479 34h26v3.5h-26z"/><path class="il-p3" d="M483 42h18v1.5h-18zM483 46.5h11v1.5h-11z"/><path class="il-ink" d="M490.5 36a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/><path class="il-paper" d="M511 36h27v20h-27z"/><path class="il-cat-education" d="M511 36h27v3.5h-27z"/><path class="il-p3" d="M515 44h19v1.5h-19zM515 48.5h11.5v1.5h-11.5z"/><path class="il-ink" d="M523 38a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/></g><g data-il="accent"><path class="il-paper" d="M448 61h25v19h-25z"/><path class="il-cat-work" d="M448 61h25v3.5h-25z"/><path class="il-p3" d="M452 69h17v1.5h-17zM452 73.5h10v1.5h-10z"/><path class="il-ink" d="M459 63a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/><path class="il-paper" d="M480 60h27v21h-27z"/><path class="il-cat-procedures" d="M480 60h27v3.5h-27z"/><path class="il-p3" d="M484 68h19v1.5h-19zM484 72.5h11.5v1.5h-11.5z"/><path class="il-ink" d="M492 62a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/><path class="il-paper" d="M512 62h25v18h-25z"/><path class="il-cat-consult" d="M512 62h25v3.5h-25z"/><path class="il-p3" d="M516 70h17v1.5h-17zM516 74.5h10v1.5h-10z"/><path class="il-ink" d="M523 64a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M0 105.5h384v2.5h-384z" data-il-ax="x" style="--d:180ms;--u:410ms" data-il-last="" data-il-seg="0"/></g><g data-il="base"><path class="il-line" d="M0 108h720"/></g>');
  R('q-age-wide', 'wide', 'P2',
    '背の高さの印がついたドア枠と、車いすの若者。壁にカレンダー。',
    'A door frame with height marks, a young adult in a wheelchair beside it, a calendar on the wall.',
    '<g data-il="scene"><path class="il-p3" d="M380 6h340v102h-340z"/><path class="il-paper" d="M482 12h56v96h-56z"/><path class="il-line" d="M482 108v-96h56v96M482 80h7M482 68h7M482 57h7M482 47h7M482 39h7"/><path class="il-green" d="M482 30h9v2h-9z"/><path class="il-paper" d="M590 24h50v40h-50z"/><path class="il-line" d="M590 24h50v40h-50v-40M615 24v40M590 44h50"/></g><g data-il="prop"><path class="il-paper" d="M660 30h40v40h-40z"/><path class="il-line" d="M660 30h40v40h-40v-40"/><path class="il-ink" d="M660 30h40v7h-40zM668.5 25h3v7h-3zM688.5 25h3v7h-3z"/><path class="il-p3" d="M665.5 45.5h4.5v4.5h-4.5zM673.5 45.5h4.5v4.5h-4.5zM681.5 45.5h4.5v4.5h-4.5zM689.5 45.5h4.5v4.5h-4.5zM665.5 52.5h4.5v4.5h-4.5zM673.5 52.5h4.5v4.5h-4.5zM681.5 52.5h4.5v4.5h-4.5zM689.5 52.5h4.5v4.5h-4.5zM665.5 60h4.5v4.5h-4.5zM673.5 60h4.5v4.5h-4.5zM681.5 60h4.5v4.5h-4.5zM689.5 60h4.5v4.5h-4.5z"/><path class="il-sk-g" d="M679.5 55a4.5 4.5 0 119 0a4.5 4.5 0 11-9 0z" stroke-width="2"/><path class="il-green" d="M700 99l-7-7v-5l7 7zM700 91l8-8v6l-8 8zM699 86h1.5v14h-1.5z"/><path class="il-clay" d="M694 98h12l-1.5 10h-9z"/></g><g data-il="fig2"><path class="il-sk" d="M411 94.5a12 12 0 1124 0a12 12 0 11-24 0z" stroke-width="2.5"/><path class="il-ink" d="M421.5 93.5h2.5v2.5h-2.5zM435 105.5a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0zM418 80.5h17v2h-17zM416.5 82.5l-1-23.5h-4v-2h6l1.5 25.5zM434.5 81.5l3.5 23.5-1.5.5-4-24z"/><path class="il-green" d="M426 55.5l-.5 15.5 5.5 12.5-4.5 2-6-13.5 .5-16.5z"/><path class="il-skin-4" d="M426.5 85.5a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-ink" d="M424 75.5l23.5 5.5-6.5 22.5-6.5-2 4-15.5-16-4zM434.5 101.5h7l4.5 2.5v2h-11.5zM425.5 75.5l23 5-5.5 23-7-2 4-15.5-16-4zM436.5 101.5h7l4.5 2.5v2h-11.5z"/><path class="il-green" d="M418 54.5l2.5-2.5h8l1.5 1.5v26h-12z"/><path class="il-skin-4" d="M423 47.5h4l-.5 6.5h-4z"/><path class="il-clay" d="M421.5 50.5h6.5v4.5h-6.5zM425 54h3l1 13h-3z"/><path class="il-hair-1" d="M418.5 37.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0zM415 41.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0zM416 46a3 3 0 116 0a3 3 0 11-6 0zM424 36.5a3 3 0 116 0a3 3 0 11-6 0zM428 39a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-skin-4" d="M418.5 43.5a6.5 6.5 0 1113 0a6.5 6.5 0 11-13 0z"/><path class="il-hair-1" d="M420.5 48L420 48A7 7 0 11431 39L430.5 39.5z"/><path class="il-green" d="M427 55.5l-1.5 15 7 12-4.5 2.5-7.5-13 1.5-17z"/><path class="il-sk-p" d="M427 55.5l-1.5 15M425.5 70.5l4.5 7.5M425 79.5l-4.5-7.5M420.5 72l1.5-17M422 55l5 .5" stroke-width="1"/><path class="il-skin-4" d="M428.5 85a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-ink" d="M435 102.5h9.5v2h-9.5z"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M0 105.5h492v2.5h-492z" data-il-ax="x" style="--d:180ms;--u:410ms" data-il-last="" data-il-seg="0"/></g><g data-il="base"><path class="il-line" d="M0 108h720"/></g>');
  R('q-care-wide', 'wide', 'P2',
    '窓に明かりのついた家。家の前で職員と子どもが手をふって見送る。その先に、小さな新しい家。',
    'A house with a lit window; a carer and a child wave goodbye. Further on, a small new home.',
    '<g data-il="scene"><path class="il-paper" d="M404 108v-48l56-56 56 56v48z"/><path class="il-line" d="M404 108v-48M516 60v48"/><path class="il-ink" d="M400 61.5l60-60 60 60-2.5 2.5-57.5-57.5-57.5 57.5z"/><path class="il-green" d="M450 52h28v56h-28z"/><path class="il-marker" d="M416 70h20v20h-20z"/><path class="il-paper" d="M425 70h2v20h-2z"/><path class="il-line" d="M286 92h110"/><path class="il-ink" d="M290 88h2.5v20h-2.5zM305 88h2.5v20h-2.5zM320 88h2.5v20h-2.5zM335 88h2.5v20h-2.5zM350 88h2.5v20h-2.5zM365 88h2.5v20h-2.5zM380 88h2.5v20h-2.5zM395 88h2.5v20h-2.5z"/><path class="il-green" d="M268 99l-7-7v-5l7 7zM268 91l8-8v6l-8 8zM267 86h1.5v14h-1.5z"/><path class="il-clay" d="M262 98h12l-1.5 10h-9z"/></g><g data-il="fig2"><path class="il-ink" d="M531.5 62.5l2.5 21.5-3 21-7-1 2.5-20-2-20.5zM523.5 103.5h8v4.5h-8zM539.5 63.5l-2 20.5 2.5 20-7 1-3-21 2.5-21.5zM532.5 103.5h8v4.5h-8z"/><path class="il-navy" d="M521 38l3-2.5h16l3 2.5-1.5 30h-19z"/><path class="il-skin-3" d="M529.5 30.5h5v5.5h-5z"/><path class="il-hair-1" d="M523 24a9 9 0 1118 0a9 9 0 11-18 0z"/><path class="il-skin-3" d="M525 26a7 7 0 1114 0a7 7 0 11-14 0z"/><path class="il-hair-1" d="M525 24A7.5 7.5 0 01539 24A24.5 24.5 0 00525 24z"/><path class="il-navy" d="M526 38.5l.5 17-5 14.5-4.5-1.5 4.5-13.5-.5-16.5z"/><path class="il-sk-p" d="M526 38.5l.5 17M526.5 55.5l-4 12.5M521 38.5h5" stroke-width="1"/><path class="il-skin-3" d="M516.5 70.5a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-navy" d="M539 36.5l12-8-6-11 4.5-2.5 8.5 15.5-16 10z"/><path class="il-sk-p" d="M542 40.5l-3-4" stroke-width="1"/><path class="il-skin-3" d="M544.5 15a2.5 2.5 0 115 0a2.5 2.5 0 11-5 0z"/><path class="il-ink" d="M551.5 81l1.5 12.5-1.5 12.5-4.5-.5 2-12-1.5-12zM547 105h4.5v3h-4.5zM556.5 81.5l-1.5 12 2 12-4.5.5-1.5-12.5 1.5-12.5zM552.5 105h4.5v3h-4.5z"/><path class="il-clay" d="M546 66.5l2-2h8l2 2-1 18h-10z"/><path class="il-skin-2" d="M550.5 62h3v3h-3z"/><path class="il-hair-2" d="M554 57.5a2 2 0 114 0a2 2 0 11-4 0zM552 55.5a2 2 0 114 0a2 2 0 11-4 0zM549 55a2 2 0 114 0a2 2 0 11-4 0zM546.5 56.5a2 2 0 114 0a2 2 0 11-4 0zM545.5 59a2 2 0 114 0a2 2 0 11-4 0zM555 60a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0zM547 61.5a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/><path class="il-skin-2" d="M548 59a4 4 0 118 0a4 4 0 11-8 0z"/><path class="il-hair-2" d="M548 59.5L547.5 59.5A4.5 4.5 0 11556.5 59.5L556 59.5z"/><path class="il-clay" d="M549 66.5l-.5 10.5-2.5 8.5-3-1 2.5-8.5 .5-9.5z"/><path class="il-sk-p" d="M549 66.5l-.5 10.5M548.5 77l-1.5 5.5" stroke-width="1"/><path class="il-skin-2" d="M542.5 86a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/><path class="il-clay" d="M558 66.5l.5 9.5 2.5 8.5-3 1-2.5-8.5-.5-10.5z"/><path class="il-sk-p" d="M557 82.5l-1.5-5.5M555.5 77l-.5-10.5" stroke-width="1"/><path class="il-skin-2" d="M558.5 86a1.5 1.5 0 113 0a1.5 1.5 0 11-3 0z"/></g><g data-il="prop"><path class="il-paper" d="M672 108v-22l15-15 15 15v22z"/><path class="il-line" d="M672 108v-22M702 86v22"/><path class="il-ink" d="M668 87.5l19-19 19 19-2.5 2.5-16.5-16.5-16.5 16.5z"/><path class="il-green" d="M683 93h7.5v15h-7.5z"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M0 105.5h600v2.5h-600z" data-il-ax="x" style="--d:180ms;--u:410ms" data-il-last="" data-il-seg="0"/></g><g data-il="base"><path class="il-line" d="M0 108h720"/></g>');
  R('results-empty', 'spot', 'P1',
    '虫めがねで空のトレーをのぞく若者。となりのトレーにはひとつ入っている。',
    'A young person looking into an empty tray with a magnifier; the tray beside it has one thing in it.',
    '<g data-il="plate"><path class="il-green-t" d="M50 36h160v104h-160z"/></g><g data-il="prop"><path class="il-ink" d="M92 100h118v3h-118zM96 103h2.5v37h-2.5zM203.5 103h2.5v37h-2.5z"/><path class="il-green" d="M178 80h13v17h-13z"/><path class="il-paper" d="M181 84h7v1.5h-7zM100 92h46l-3 8h-40z"/><path class="il-line" d="M100 92l3 8h40l3-8"/><path class="il-paper" d="M160 92h44l-3 8h-38z"/><path class="il-line" d="M160 92l3 8h38l3-8"/></g><g data-il="fig"><path class="il-green" d="M76.5 60.5l-5 18 3 16.5-5.5 1-3.5-18 5-19z"/><path class="il-skin-1" d="M69 97a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-clay" d="M57.5 62l3-3.5h7.5v25.5h-10.5z"/><path class="il-ink" d="M77.5 87.5l2.5 24.5-3.5 24.5-8.5-1.5 3.5-23-2.5-24zM68 134.5h9l5 3v2.5h-14zM79 87l4 24.5-1.5 24.5-8.5-.5 1.5-23.5-4-23.5zM73.5 134.5h8.5l5 3v2.5h-13.5z"/><path class="il-green" d="M67 59l3-3h9l2 1.5v36.5h-14.5z"/><path class="il-p3" d="M78 56.5h2.5v37h-2.5z"/><path class="il-clay" d="M72 56h3v17.5h-3z"/><path class="il-skin-1" d="M72.5 50h5l-.5 7.5h-5zM68 45.5a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-2" d="M69 50L68.5 50.5A9 9 0 1184.5 43L84 43.5z"/><path class="il-green" d="M77.5 59l4 16 14.5-2 1 6-20 2.5-5-21.5z"/><path class="il-sk-p" d="M77.5 59l3.5 13.5M77 81.5l-5-21.5M72 60l5.5-1" stroke-width="1"/><path class="il-skin-1" d="M95 76a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-sk" d="M105 83a8 8 0 1116 0a8 8 0 11-16 0z" stroke-width="2.5"/><path class="il-ink" d="M103.5 81.5l-4.5-2 1-3.5 5 2z"/><path class="il-skin-1" d="M95 76a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('saved-empty', 'spot', 'P1',
    '三つの空のチェック欄があるクリップボードと、上の緑の星。',
    'A clipboard with three empty check boxes, and a green star about to be pinned on top.',
    '<g data-il="plate"><path class="il-green-t" d="M60 30h120v110h-120z"/></g><g data-il="prop"><path class="il-clay" d="M84 40h72v100h-72z"/><path class="il-paper" d="M90 52h60v88h-60z"/><path class="il-line" d="M90 140v-88h60v88"/><path class="il-ink" d="M107 36h26v11h-26z"/><path class="il-clay" d="M114 39h12v4h-12z"/><path class="il-paper" d="M98 68h10v10h-10z"/><path class="il-line" d="M98 68h10v10h-10v-10"/><path class="il-p3" d="M114 71h30v4h-30z"/><path class="il-paper" d="M98 92h10v10h-10z"/><path class="il-line" d="M98 92h10v10h-10v-10"/><path class="il-p3" d="M114 95h30v4h-30z"/><path class="il-paper" d="M98 116h10v10h-10z"/><path class="il-line" d="M98 116h10v10h-10v-10"/><path class="il-p3" d="M114 119h22v4h-22z"/></g><g data-il="react"><path class="il-green" d="M150 7l2.5 7.5h8l-6 5 2 7.5-6.5-4.5-6.5 4.5 2-7.5-6-5h8z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>', 24);
  R('plan-empty', 'spot', 'P1',
    'ひとつの日に緑の丸がついたカレンダーと、えんぴつ。',
    'A wall calendar with one day circled in green, and a pencil resting on the ground.',
    '<g data-il="plate"><path class="il-green-t" d="M52 20h136v120h-136z"/></g><g data-il="prop"><path class="il-paper" d="M74 34h92v82h-92z"/><path class="il-line" d="M74 34h92v82h-92v-82"/><path class="il-ink" d="M74 34h92v7h-92zM95.5 29h3v7h-3zM141.5 29h3v7h-3z"/><path class="il-p3" d="M86 51h9v9h-9zM100.5 51h9v9h-9zM115.5 51h9v9h-9zM130 51h9v9h-9zM145 51h9v9h-9zM86 65.5h9v9h-9zM100.5 65.5h9v9h-9zM115.5 65.5h9v9h-9zM130 65.5h9v9h-9zM145 65.5h9v9h-9zM86 80h9v9h-9zM100.5 80h9v9h-9zM115.5 80h9v9h-9zM130 80h9v9h-9zM145 80h9v9h-9zM86 95h9v9h-9zM100.5 95h9v9h-9zM115.5 95h9v9h-9zM130 95h9v9h-9zM145 95h9v9h-9z"/><path class="il-sk-g" d="M126 85a8.5 8.5 0 1117 0a8.5 8.5 0 11-17 0z" stroke-width="2"/></g><g data-il="accent"><path class="il-amber" d="M128 135h44v5h-44z"/><path class="il-clay" d="M172 135h6v5h-6z"/><path class="il-skin-1" d="M128 140l-8-2.5 8-2.5z"/><path class="il-ink" d="M123 138.5l-3-1 3-1z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('map-empty', 'spot', 'P1',
    '折りたたんだ紙の地図と、地面に横になったピン。それを見る車いすの若者。',
    'A folded paper map, a pin lying on the ground beside it, and a young adult in a wheelchair looking at it.',
    '<g data-il="plate"><path class="il-green-t" d="M92 40h116v100h-116z"/></g><g data-il="prop"><path class="il-paper" d="M118 82l18 8v54l-18-8z"/><path class="il-p3" d="M136 90l18-8v54l-18 8z"/><path class="il-paper" d="M154 82l18 8v54l-18-8z"/><path class="il-p3" d="M172 90l18-8v54l-18 8z"/><path class="il-line" d="M118 82l18 8 18-8 18 8 18-8v54l-18 8-18-8-18 8-18-8v-54"/><path class="il-green" d="M122.5 121l17 3.5 14-18 22.5 4.5v2l-21.5-3.5-14 18-19-4.5z"/></g><g data-il="pin"><path class="il-green" d="M186 126h14v3.5l6 3.5-6 3.5v3.5h-14z"/><path class="il-paper" d="M190.5 131h4.5v4.5h-4.5z"/></g><g data-il="fig"><path class="il-sk" d="M46.5 124.5a14 14 0 1128 0a14 14 0 11-28 0z" stroke-width="3"/><path class="il-ink" d="M59 123.5h3v3h-3zM74.5 137a3 3 0 116 0a3 3 0 11-6 0zM55 108h19.5v2.5h-19.5zM53.5 110.5l-1-27h-5v-2.5h7l1.5 29.5zM74 109l4.5 27.5-2.5.5-4.5-27.5z"/><path class="il-green" d="M64 79.5l-.5 17.5 6.5 15-5 2-7-16 .5-19z"/><path class="il-skin-4" d="M65 114.5a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M62 102.5l27 6-7.5 26.5-7.5-2.5 5-18-18.5-4.5zM74 132.5h8l5 3v2.5h-13zM63.5 102.5l27 6-6.5 26-8-2 4.5-18-18.5-4.5zM76 132.5h8.5l5 3v2.5h-13.5z"/><path class="il-green" d="M55 78.5l3-3h9l1.5 2v29.5h-13.5z"/><path class="il-skin-4" d="M60.5 70h4.5l-.5 7.5h-4.5z"/><path class="il-clay" d="M59 74h7.5v5h-7.5zM63.5 77.5h3.5l.5 15.5h-3.5z"/><path class="il-hair-1" d="M55.5 58.5a4 4 0 118 0a4 4 0 11-8 0zM52 63.5a4 4 0 118 0a4 4 0 11-8 0zM53 68.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0zM62 57.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0zM66.5 60.5a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-skin-4" d="M56 65.5a7.5 7.5 0 1115 0a7.5 7.5 0 11-15 0z"/><path class="il-hair-1" d="M57.5 70.5L57.5 71A8.5 8.5 0 1170 60.5L69.5 61z"/><path class="il-green" d="M65.5 79.5l-1.5 17.5 7.5 13.5-4.5 3-9-15.5 2-19z"/><path class="il-sk-p" d="M65.5 79.5l-1.5 17.5M64 97l4.5 8.5M63 107l-5-9M58 98l2-19M60 79l5.5.5" stroke-width="1"/><path class="il-skin-4" d="M67 113.5a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M74.5 133.5h11v2h-11z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('error', 'spot', 'P1',
    '角がやぶれた紙の地図を、テープで直そうとする若者。',
    'A paper map with a torn corner; a young person holding a strip of tape to fix it.',
    '<g data-il="plate"><path class="il-cat-money-t" d="M60 24h140v116h-140z"/></g><g data-il="prop"><path class="il-paper" d="M102 34h78v40l-6 6 4 4-8 6 2 4-8 2h-62z"/><path class="il-line" d="M102 34h78v40l-6 6 4 4-8 6 2 4-8 2h-62v-62M130 34v62M155 34v60"/><path class="il-green" d="M109.5 81l22-8 14-18 22.5-4v2l-21.5 4-14 18-22 8zM141 40h10v10h-2l-3 4-3-4h-2z"/><path class="il-paper" d="M191 138l-2-4 8-5-4-5 7-6v22h-16z"/><path class="il-line" d="M184 140h16v-22l-7 6 4 5-8 5 2 4-7 2"/></g><g data-il="fig"><path class="il-green" d="M78.5 60.5l-5 18 3 16.5-5.5 1-3.5-18 5-19z"/><path class="il-skin-1" d="M71 97a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-clay" d="M59.5 62l3-3.5h7.5v25.5h-10.5z"/><path class="il-ink" d="M79.5 87.5l2.5 24.5-3.5 24.5-8.5-1.5 3.5-23-2.5-24zM70 134.5h9l5 3v2.5h-14zM81 87l4 24.5-1.5 24.5-8.5-.5 1.5-23.5-4-23.5zM75.5 134.5h8.5l5 3v2.5h-13.5z"/><path class="il-green" d="M69 59l3-3h9l2 1.5v36.5h-14.5z"/><path class="il-p3" d="M80 56.5h2.5v37h-2.5z"/><path class="il-clay" d="M74 56h3v17.5h-3z"/><path class="il-skin-1" d="M74.5 50h5l-.5 7.5h-5zM69.5 45a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-2" d="M72 51L71.5 51.5A9 9 0 1185 40.5L84.5 41z"/><path class="il-green" d="M78 57l14 8 6-12.5 5 2-8.5 19-19-11.5z"/><path class="il-sk-p" d="M78 57l5 3M83 66.5l-7.5-4.5M75.5 62l2.5-5" stroke-width="1"/><path class="il-skin-1" d="M98 52a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-clay" d="M98 48h18v6h-18z"/><path class="il-skin-1" d="M98 52a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('not-found', 'spot', 'P1',
    '何も書かれていない道しるべと、立てかけた小さな矢印の板。',
    'An empty signpost board, with a small arrow-shaped board leaning against its post.',
    '<g data-il="plate"><path class="il-cat-procedures-t" d="M64 28h112v112h-112z"/></g><g data-il="prop"><path class="il-ink" d="M118 54h4v86h-4z"/><path class="il-paper" d="M84 34h72v32h-72z"/><path class="il-line" d="M84 34h72v32h-72v-32"/></g><g data-il="accent"><path class="il-paper" d="M119.5 125.5l31-14 10.5 4-4 10.5-31 14z"/><path class="il-line" d="M119.5 125.5l31-14 10.5 4-4 10.5-31 14-6.5-14.5"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('tools-script', 'spot', 'P2',
    '紙の台本を読みながら電話する若者と、窓口の向こうの職員。',
    'A young person on a phone call reading from a paper script; a staff member at a counter window.',
    '<g data-il="plate"><path class="il-green-t" d="M44 30h106v110h-106z"/></g><g data-il="scene"><path class="il-p3" d="M150 22h76v118h-76z"/><path class="il-paper" d="M160 46h56v52h-56z"/><path class="il-line" d="M160 98v-52h56v52"/></g><g data-il="fig2"><path class="il-navy" d="M195.5 59l5 19-3.5 18-5.5-1 3-16.5-5-18z"/><path class="il-skin-3" d="M191 97a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M197 88l-2.5 24 3 23-8.5 1.5-3-24.5 2.5-24.5zM197.5 140h-14v-2.5l5-3h9zM195.5 88.5l-3.5 23.5 2.5 23.5-8.5.5-2.5-24 3.5-25zM194 140h-14v-2.5l5.5-3h8.5z"/><path class="il-navy" d="M200.5 94h-16.5v-36.5l2-1.5h11l3 3z"/><path class="il-skin-3" d="M194 57.5h-5l-.5-7.5h5z"/><path class="il-hair-1" d="M181.5 43.5a10.5 10.5 0 1121 0a10.5 10.5 0 11-21 0z"/><path class="il-skin-3" d="M182.5 45a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-1" d="M184.5 40L184 39.5A8.5 8.5 0 01197.5 50L197 49.5z"/><path class="il-navy" d="M194 59.5l1 19.5-3.5 17.5-5.5-1.5 3.5-16.5-1-19z"/><path class="il-sk-p" d="M188.5 59.5l1 19M189.5 78.5l-3.5 15.5M192 94l3-15M195 79l-1-19.5M194 59.5h-5.5" stroke-width="1"/><path class="il-skin-3" d="M185.5 97.5a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="prop"><path class="il-ink" d="M150 96h76v4h-76z"/><path class="il-p3" d="M150 100h76v40h-76z"/></g><g data-il="fig"><path class="il-green" d="M84.5 59.5l-1 15.5 13-3.5 1.5 5.5-17 4.5-3.5-3 1-19z"/><path class="il-skin-1" d="M95.5 74a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-clay" d="M65.5 62l3-3.5h7.5v25.5h-10.5z"/><path class="il-ink" d="M85.5 87.5l2.5 24.5-3 24.5-8.5-1.5 3-23-2.5-24zM76.5 134.5h9l5 3v2.5h-14zM87 87l3.5 25-2.5 24-8.5-.5 2.5-23.5-3.5-23.5zM80 134.5h8.5l5.5 3v2.5h-14z"/><path class="il-green" d="M75 59l3-3h9l2 1.5v36.5h-14.5z"/><path class="il-p3" d="M86 56.5h2.5v37h-2.5z"/><path class="il-clay" d="M80 56h3v17.5h-3z"/><path class="il-skin-1" d="M80.5 50h5l-.5 7.5h-5zM76 45a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-2" d="M78 50.5L77 51A9 9 0 1192 41L91 41.5z"/><path class="il-green" d="M83 56.5l10 .5-6.5-5 3.5-4.5 14 10.5-2 5-19.5-.5z"/><path class="il-sk-p" d="M83 56.5l5 .5M89 62.5h-6.5M82.5 62.5l.5-6" stroke-width="1"/><path class="il-skin-1" d="M84 49a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-paper" d="M95.5 56h16v21h-16z"/><path class="il-line" d="M95.5 56h16v21h-16v-21"/><path class="il-p3" d="M99 60.5h9v1.5h-9zM99 64.5h9v1.5h-9zM99 68.5h6v1.5h-6z"/><path class="il-skin-1" d="M95.5 74a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M85.5 40h4.5v12h-4.5z"/><path class="il-skin-1" d="M84 49a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('tools-check', 'spot', 'P2',
    '虫めがねと、一行に立てた黄色い旗がある契約書。',
    'A contract with a magnifier over one line, marked with an amber flag.',
    '<g data-il="plate"><path class="il-cat-procedures-t" d="M60 26h120v114h-120z"/></g><g data-il="prop"><path class="il-paper" d="M82 20h76v120h-76z"/><path class="il-line" d="M82 140v-120h76v120"/><path class="il-ink" d="M92 30h40v4h-40z"/><path class="il-p3" d="M92 44h56v3h-56zM92 55h56v3h-56zM92 66h56v3h-56z"/><path class="il-amber" d="M92 77h56v3h-56z"/><path class="il-p3" d="M92 88h56v3h-56zM92 99h56v3h-56zM92 110h44v3h-44z"/><path class="il-sk-c" d="M133 124a7 7 0 1114 0a7 7 0 11-14 0z" stroke-width="2"/></g><g data-il="accent"><path class="il-ink" d="M160 65h2v18h-2z"/><path class="il-amber" d="M162 65h16l-5 5 5 5h-16z"/></g><g data-il="fig"><path class="il-sk" d="M99 78.5a13 13 0 1126 0a13 13 0 11-26 0z" stroke-width="3"/><path class="il-ink" d="M103 90l-10 10.5-3-3 10.5-10z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('tools-money', 'spot', 'P2',
    '財布と、入るお金・出るお金の二本の積み木。',
    'A wallet and two columns of blocks: money in (green) and money out (ink).',
    '<g data-il="plate"><path class="il-cat-money-t" d="M56 22h128v118h-128z"/></g><g data-il="prop"><path class="il-green" d="M104 126h26v14h-26zM104 110h26v14h-26zM104 94h26v14h-26zM104 78h26v14h-26zM104 62h26v14h-26zM104 46h26v14h-26z"/><path class="il-ink" d="M136 126h26v14h-26zM136 110h26v14h-26zM136 94h26v14h-26zM136 78h26v14h-26z"/></g><g data-il="accent"><path class="il-paper" d="M67 109h19v12h-19z"/><path class="il-line" d="M67 121v-12h19v12"/><path class="il-clay" d="M62 116h34v24h-34zM79 122.5h21v11h-21z"/><path class="il-sk-p" d="M79 122.5H100" stroke-width="1"/><path class="il-paper" d="M88.5 126.5h4v4h-4z"/><path class="il-amber" d="M167 131a9 9 0 1118 0a9 9 0 11-18 0z"/><path class="il-sk-p" d="M170.5 131a5.5 5.5 0 1111 0a5.5 5.5 0 11-11 0z" stroke-width="1.5"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('plan-hero', 'spot', 'P2',
    'カレンダーのページの扉へ、箱を持って歩いていく若者。',
    'A young person carrying a box toward a calendar page that opens like a door.',
    '<g data-il="plate"><path class="il-green-t" d="M92 18h116v122h-116z"/></g><g data-il="prop"><path class="il-marker" d="M128 26h62v114h-62z"/><path class="il-paper" d="M128 26l30 10v100l-30 4z"/><path class="il-line" d="M128 26l30 10v100l-30 4v-114"/><path class="il-ink" d="M128 26l30 10v6l-30-10z"/><path class="il-p3" d="M135 48l6 2v6l-6-2zM146 51.5l6 2v6l-6-2zM135 66l6 2v6l-6-2zM146 69.5l6 2v6l-6-2zM135 84l6 2v6l-6-2zM146 87.5l6 2v6l-6-2zM135 102l6 2v6l-6-2zM146 105.5l6 2v6l-6-2z"/><path class="il-line" d="M128 140v-114h62v114"/></g><g data-il="fig"><path class="il-green" d="M85 61.5l-3.5 15 13.5.5v6l-21-1 5.5-22z"/><path class="il-skin-1" d="M93.5 80a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-clay" d="M66.5 62.5l3.5-3h7l-1 25.5-10.5-.5z"/><path class="il-ink" d="M85.5 88.5l3 25.5-10.5 22.5-8-3.5 10-20.5-3-23zM70.5 132.5l8.5 2 4.5 4-.5 2.5-13.5-3zM86.5 87.5l9 23.5-1 25-8.5-.5 1-23-8-22zM86.5 134.5l8.5-.5 5.5 3v2.5l-13.5 1z"/><path class="il-green" d="M76 59.5l3-2.5h9.5l1.5 2-1.5 36-14-.5z"/><path class="il-p3" d="M87 58h2.5l-1.5 36.5h-2z"/><path class="il-clay" d="M81 57h3l-1 18-2.5-.5z"/><path class="il-skin-1" d="M82 51l4.5.5-.5 7.5-5-.5zM77 46.5a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-2" d="M79.5 52.5L79 53A9 9 0 1192.5 41.5L92 42z"/><path class="il-green" d="M86.5 61.5l-3.5 15.5 14 1.5-.5 5.5-21-2 5.5-22z"/><path class="il-sk-p" d="M86.5 61.5l-3.5 15.5M83 77l6.5.5M89 83.5l-13.5-1.5M75.5 82l5.5-22M81 60l5.5 1.5" stroke-width="1"/><path class="il-skin-1" d="M95 81.5a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-clay" d="M90.5 66.5h22v18h-22z"/><path class="il-sk-p" d="M101.5 66.5v7" stroke-width="1.5"/><path class="il-skin-1" d="M95 81.5a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('plan-jr-hero', 'spot', 'P2',
    '高校の門へ歩いていく中学生。校舎には、日にちに緑の丸がついたカウントダウンのカレンダー。',
    'A junior-high student walking toward a high-school gate; a countdown calendar on the building has one day circled in green.',
    '<g data-il="plate"><path class="il-green-t" d="M100 18h116v122h-116z"/></g><g data-il="scene"><path class="il-paper" d="M112 46h96v94h-96z"/><path class="il-line" d="M112 140v-94h96v94"/><path class="il-ink" d="M109 42.5h102v3.5h-102z"/><path class="il-p3" d="M120 56h10v10h-10zM136 56h10v10h-10zM120 76h10v10h-10zM136 76h10v10h-10z"/><path class="il-green" d="M124 114h14v26h-14z"/></g><g data-il="prop"><path class="il-paper" d="M156 54h44v44h-44z"/><path class="il-line" d="M156 54h44v44h-44v-44"/><path class="il-ink" d="M156 54h44v7h-44zM165.5 49h3v7h-3zM187.5 49h3v7h-3z"/><path class="il-p3" d="M163.5 69.5h5.5v5.5h-5.5zM175.5 69.5h5.5v5.5h-5.5zM187 69.5h5.5v5.5h-5.5zM163.5 78h5.5v5.5h-5.5zM175.5 78h5.5v5.5h-5.5zM187 78h5.5v5.5h-5.5zM163.5 86.5h5.5v5.5h-5.5zM175.5 86.5h5.5v5.5h-5.5zM187 86.5h5.5v5.5h-5.5z"/><path class="il-sk-g" d="M173 89.5a5 5 0 1110 0a5 5 0 11-10 0z" stroke-width="2"/></g><g data-il="prop" data-il-order="1"><path class="il-paper" d="M102 104h10v36h-10z"/><path class="il-line" d="M102 140v-36h10v36"/><path class="il-paper" d="M208 104h10v36h-10z"/><path class="il-line" d="M208 140v-36h10v36"/></g><g data-il="route" data-il-segs=""><path class="il-green" d="M80 137h44v3h-44z" data-il-ax="x" style="--d:180ms;--u:410ms" data-il-last="" data-il-seg="0"/></g><g data-il="fig"><path class="il-navy" d="M68 61.5l-2 17.5 11 12-4.5 4-12.5-14 2-20z"/><path class="il-skin-2" d="M73 94a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M67.5 89l2.5 25.5-15 21-6.5-5 13-18-2.5-23zM48.5 130l8 3.5 3.5 5-1 2.5-12.5-6zM68.5 87.5l9.5 23.5 2 24.5-8.5.5-1.5-23-9-22zM71.5 135l9-1 5.5 2.5v2.5l-13.5 1.5z"/><path class="il-navy" d="M59 60l3-3 8.5.5 1.5 2-2 36-13.5-.5z"/><path class="il-paper" d="M69.5 58.5h2l-2 36.5h-2z"/><path class="il-clay" d="M62.5 57.5h2.5l-6.5 32.5-3-.5zM51 85l12.5.5-1 13-12-.5z"/><path class="il-skin-2" d="M64.5 51.5l5 .5-1 7.5-5-.5zM59.5 46.5a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-1" d="M62 52.5L61.5 53A8.5 8.5 0 1174.5 41.5L74 41.5zM56 45a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-navy" d="M68.5 63l-12.5 13 1 16.5h-6l-1-18.5 14-15z"/><path class="il-sk-p" d="M68.5 63l-10.5 11M58.5 65l5.5-6M64 59l4.5 4" stroke-width="1"/><path class="il-skin-2" d="M51 94a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('plan-done', 'spot', 'P2',
    '新しい部屋の扉に鍵をさす若者。床には二つの箱と、植木。',
    'A young person putting a key into the door of a new place; two boxes and a plant on the ground.',
    '<g data-il="plate"><path class="il-green-t" d="M56 22h152v118h-152z"/></g><g data-il="scene"><path class="il-paper" d="M146 52h44v88h-44z"/><path class="il-line" d="M146 140v-88h44v88"/><path class="il-green" d="M150 56h36v84h-36z"/><path class="il-paper" d="M179 99.5h3.5v3.5h-3.5z"/></g><g data-il="prop"><path class="il-clay" d="M58 118h30v22h-30z"/><path class="il-sk-p" d="M73 118V126.5" stroke-width="1.5"/><path class="il-clay" d="M64 102h22v16h-22z"/><path class="il-sk-p" d="M75 102V108" stroke-width="1.5"/><path class="il-green" d="M75 95l-5.5-6v-4l5.5 6zM75 88.5l6.5-6.5v5l-6.5 6zM74.5 84.5h1.5v11h-1.5z"/><path class="il-paper" d="M70 94h10l-1.5 8h-7z"/></g><g data-il="fig"><path class="il-green" d="M126.5 60.5l-5 18 3 16.5-5.5 1-3.5-18 5-19z"/><path class="il-skin-1" d="M119 97a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M127.5 87.5l2.5 24.5-3.5 24.5-8.5-1.5 3.5-23-2.5-24zM118 134.5h9l5 3v2.5h-14zM129 87l4 24.5-1.5 24.5-8.5-.5 1.5-23.5-4-23.5zM123.5 134.5h8.5l5 3v2.5h-13.5z"/><path class="il-green" d="M117 59l3-3h9l2 1.5v36.5h-14.5z"/><path class="il-p3" d="M128 56.5h2.5v37h-2.5z"/><path class="il-skin-1" d="M122.5 50h5l-.5 7.5h-5zM117.5 45a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-2" d="M120 51L119.5 51.5A9 9 0 11133 40.5L132.5 41z"/><path class="il-green" d="M127.5 59.5l.5 17 14.5 4.5-1.5 5.5-18.5-5.5-.5-21.5z"/><path class="il-sk-p" d="M127.5 59.5l.5 17M131 83.5l-8.5-2.5M122.5 81l-.5-21.5M122 59.5h5.5" stroke-width="1"/><path class="il-skin-1" d="M140.5 84a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-sk-a" d="M142.5 83.5a3 3 0 116 0a3 3 0 11-6 0z" stroke-width="2"/><path class="il-amber" d="M148.5 82.5h10v4.5h-2v-2.5h-2v2h-1.5v-2h-4.5z"/><path class="il-skin-1" d="M140.5 84a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('learn-done', 'spot', 'P2',
    'はんこの押された修了証を、両手で胸の前にかかげる若者。',
    'A young person holding up a certificate with a green hanko stamped on it.',
    '<g data-il="plate"><path class="il-green-t" d="M64 24h112v116h-112z"/></g><g data-il="fig"><path class="il-ink" d="M119.5 87.5l3 24.5-3.5 24.5-8.5-1.5 3.5-23-3-24zM110 134.5h9.5v5.5h-9.5zM129 88l-3 24 3.5 23-8.5 1.5-3.5-24.5 3-24.5zM120.5 134.5h9.5v5.5h-9.5z"/><path class="il-green" d="M108.5 59l3.5-3h16l3.5 3-1.5 35h-20z"/><path class="il-skin-1" d="M117.5 50h5v6.5h-5zM112 45a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-2" d="M123.5 43.5l-5.5.5-6 2.5h-.5l-.5-2.5 .5-2.5 1.5-2 2-2 2-1 2.5-.5h3l2 1 2 2 1.5 2 1 2.5v2.5h-1z"/><path class="il-green" d="M112 62.5l-14 2.5 8 9-4 4-11.5-13 1.5-5 19-3.5z"/><path class="il-sk-p" d="M111 56.5l1 6" stroke-width="1"/><path class="il-skin-1" d="M102 77a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-green" d="M129 56.5l19 3.5 1.5 5-11.5 13-4-4 8-9-14-2.5z"/><path class="il-sk-p" d="M128 62.5l1-6" stroke-width="1"/><path class="il-skin-1" d="M132 77a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-paper" d="M103 60h34v30h-34z"/><path class="il-line" d="M103 60h34v30h-34v-30"/><path class="il-ink" d="M111 65h18v2.5h-18z"/><path class="il-p3" d="M108 71h24v1.5h-24zM108 75h16v1.5h-16z"/><path class="il-skin-1" d="M102 77a3 3 0 116 0a3 3 0 11-6 0zM132 77a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="accent"><path class="il-sk-g" d="M122.5 82a5.5 5.5 0 1111 0a5.5 5.5 0 11-11 0z" stroke-width="2"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('cat-housing', 'spot', 'P2',
    '住まい：鍵のかかった扉。',
    'Housing: a door with a key.',
    '<g data-il="plate"><path class="il-cat-housing-t" d="M60 22h120v118h-120z"/></g><g data-il="prop"><path class="il-paper" d="M96 44h48v96h-48z"/><path class="il-line" d="M96 140v-96h48v96"/><path class="il-cat-housing" d="M100 48h40v92h-40z"/><path class="il-paper" d="M133 96h3.5v3.5h-3.5z"/></g><g data-il="accent"><path class="il-sk-a" d="M128 92a4 4 0 118 0a4 4 0 11-8 0z" stroke-width="2.5"/><path class="il-amber" d="M136.5 90.5h14.5v6.5h-3v-3.5h-2.5v2.5h-2.5v-2.5h-6.5z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('cat-money', 'spot', 'P2',
    'お金：机の上にひらいた通帳と、お札の入った封筒。',
    'Money: an open bank passbook and an envelope of notes on a desk.',
    '<g data-il="plate"><path class="il-cat-money-t" d="M52 22h136v118h-136z"/></g><g data-il="scene"><path class="il-ink" d="M58 98h124v3h-124zM62 101h2.5v39h-2.5zM175.5 101h2.5v39h-2.5z"/></g><g data-il="prop"><path class="il-navy" d="M62 62h82v36h-82z"/><path class="il-paper" d="M64.5 64.5h37.5v31h-37.5zM104 64.5h37.5v31h-37.5z"/><path class="il-ink" d="M67.5 69h31.5v1.5h-31.5z"/><path class="il-p3" d="M67.5 75.5h31.5v1.5h-31.5zM67.5 82h31.5v1.5h-31.5zM67.5 88.5h31.5v1.5h-31.5z"/><path class="il-ink" d="M107 69h31.5v1.5h-31.5z"/><path class="il-p3" d="M107 75.5h31.5v1.5h-31.5zM107 82h31.5v1.5h-31.5z"/><path class="il-amber" d="M121 88h17.5v3h-17.5z"/></g><g data-il="accent"><path class="il-paper" d="M155 66h22v12h-22z"/><path class="il-line" d="M155 78v-12h22v12"/><path class="il-green" d="M159 69h6v3h-6z"/><path class="il-cat-money" d="M150 74h30v24h-30z"/><path class="il-sk-p" d="M150 74l15 13 15-13" stroke-width="1"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('cat-education', 'spot', 'P2',
    '学び：本とあかりのついた机。',
    'Education: a desk with books and a lit lamp.',
    '<g data-il="plate"><path class="il-cat-education-t" d="M52 24h136v116h-136z"/></g><g data-il="prop"><path class="il-ink" d="M66 96h108v3h-108zM70 99h2.5v41h-2.5zM167.5 99h2.5v41h-2.5z"/><path class="il-cat-education" d="M78 72h12v24h-12z"/><path class="il-paper" d="M79 93h11v2h-11z"/><path class="il-navy" d="M91 76h10v20h-10z"/><path class="il-paper" d="M92 93h9v2h-9z"/><path class="il-cat-education" d="M110 75l8.5 3-7 21-8.5-3z"/><path class="il-paper" d="M118 94h26v2h-26z"/><path class="il-line" d="M118 94h26"/></g><g data-il="scene"><path class="il-ink" d="M150 93h16v3h-16zM156.5 94v-27.5l-11.5-11.5 2-2 12.5 12.5v28.5zM131.5 58l15.5-12.5 2 9-9.5 7z"/></g><g data-il="accent"><path class="il-marker" d="M137.5 62.5l12.5-10 1.5 2-12.5 10z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('cat-work', 'spot', 'P2',
    '仕事：エプロンをつけて、店のカウンターに立つ若者。',
    'Work: a young person in an apron behind a shop counter.',
    '<g data-il="plate"><path class="il-cat-work-t" d="M52 22h136v118h-136z"/></g><g data-il="scene"><path class="il-ink" d="M58 40h2.5v56h-2.5zM94 40h2.5v56h-2.5zM58 56h38.5v2.5h-38.5zM58 76h38.5v2.5h-38.5z"/><path class="il-clay" d="M62 44h10v12h-10z"/><path class="il-amber" d="M74 48h8v8h-8z"/><path class="il-navy" d="M84 46h8v10h-8z"/><path class="il-paper" d="M62 66h14v10h-14z"/><path class="il-cat-work" d="M78 64h13v12h-13z"/></g><g data-il="fig"><path class="il-ink" d="M118.5 59l3.5-3h16l3.5 3-1.5 35h-20z"/><path class="il-skin-4" d="M127.5 50h5v6.5h-5z"/><path class="il-hair-1" d="M134.5 42a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0zM130 37.5a4 4 0 118 0a4 4 0 11-8 0zM124 36.5a4.5 4.5 0 119 0a4.5 4.5 0 11-9 0zM119.5 39.5a4 4 0 118 0a4 4 0 11-8 0zM118 45a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0zM135.5 46.5a3 3 0 116 0a3 3 0 11-6 0zM120 49.5a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-skin-4" d="M122 45a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-1" d="M122 45.5L121.5 45.5A8.5 8.5 0 11138.5 45.5L138 45.5z"/><path class="il-cat-work" d="M124 56.5h12v8.5l4 5-.5 38.5h-19l-.5-38.5 4-5z"/><path class="il-paper" d="M124.5 76.5h11.5v5.5h-11.5z"/><path class="il-cat-work" d="M123 56.5l4-7h6l4 7-1.5.5-3.5-6h-4l-3.5 6z"/><path class="il-ink" d="M124 61l-9.5 15.5 5 15-5.5 2-5.5-18 10.5-17.5z"/><path class="il-sk-p" d="M124 61l-5 8M119.5 58.5l4.5 2.5" stroke-width="1"/><path class="il-skin-4" d="M114.5 94a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M141 58l10.5 17.5-5.5 18-5.5-2 5-15-9.5-15.5z"/><path class="il-sk-p" d="M141 69l-5-8M136 61l4.5-2.5" stroke-width="1"/><path class="il-skin-4" d="M139.5 94a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="prop"><path class="il-paper" d="M70 98h120v42h-120z"/><path class="il-line" d="M70 140v-42h120v42"/><path class="il-ink" d="M66 94h128v4h-128zM158 76h24v18h-24z"/><path class="il-paper" d="M161 79h18v7h-18z"/><path class="il-cat-work" d="M74 112h112v3h-112z"/><path class="il-skin-4" d="M113 94a3 3 0 116 0a3 3 0 11-6 0zM141 94a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('cat-procedures', 'spot', 'P2',
    '手続き：窓口の書類とはんこ。',
    'Paperwork: documents and a hanko at a counter window.',
    '<g data-il="plate"><path class="il-cat-procedures-t" d="M52 20h136v120h-136z"/></g><g data-il="scene"><path class="il-paper" d="M64 24h112v64h-112z"/><path class="il-line" d="M64 88v-64h112v64"/><path class="il-p3" d="M64 92h112v48h-112z"/><path class="il-ink" d="M56 88h128v4h-128z"/></g><g data-il="prop"><path class="il-paper" d="M74 50h40v38h-40z"/><path class="il-line" d="M74 88v-38h40v38"/><path class="il-paper" d="M86 42h40v46h-40z"/><path class="il-line" d="M86 88v-46h40v46"/><path class="il-ink" d="M92 50h20v3h-20z"/><path class="il-p3" d="M92 58h28v2.5h-28zM92 64h28v2.5h-28zM92 70h18v2.5h-18z"/><path class="il-sk-c" d="M110 78a5 5 0 1110 0a5 5 0 11-10 0z" stroke-width="2"/><path class="il-cat-procedures" d="M140 60h12v26h-12z"/><path class="il-ink" d="M137 54h18v7h-18z"/><path class="il-clay" d="M140 86h12v2h-12z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('cat-consult', 'spot', 'P2',
    '相談：ベンチにならんで座るふたり。',
    'Someone to talk to: two people side by side on a bench.',
    '<g data-il="plate"><path class="il-cat-consult-t" d="M48 22h144v118h-144z"/></g><g data-il="scene"><path class="il-ink" d="M60 110h124v3.5h-124zM66 113.5h3v26.5h-3zM175 113.5h3v26.5h-3z"/></g><g data-il="fig"><path class="il-green" d="M86.5 79l-2 17 14.5 4.5-2 5.5-18.5-6 2-21.5z"/><path class="il-skin-1" d="M96.5 104a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M84.5 103l28 8-11.5 26.5-7.5-3.5 7.5-17.5-19-5.5zM93 134.5h9l5 3v2.5h-14zM86 103l28 7.5-10 27-8-3 7-18.5-19.5-5zM96 134.5h8.5l5.5 3v2.5h-14z"/><path class="il-green" d="M77 78l3-3h9l2 2v31h-14.5z"/><path class="il-p3" d="M88 76h2.5v31.5h-2.5z"/><path class="il-skin-1" d="M82.5 69.5h5l-.5 7.5h-5zM77.5 64.5a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-2" d="M80 70.5L79.5 71A9 9 0 1193 59.5L92.5 60z"/><path class="il-green" d="M87.5 79l-.5 17 14 4-1.5 5.5-19-5 1.5-22z"/><path class="il-sk-p" d="M87.5 79l-.5 17M87 96l4 1M91 103l-10.5-2.5M80.5 100.5l1.5-22M82 78.5l5.5.5" stroke-width="1"/><path class="il-skin-1" d="M99 103.5a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="fig2"><path class="il-navy" d="M161.5 78.5l2 21.5-18.5 6-2-5.5 14.5-4.5-2-17z"/><path class="il-skin-3" d="M139.5 104a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M160 111l-19 5.5 7.5 17.5-7.5 3.5-11.5-26.5 28-8zM149 140h-14v-2.5l5-3h9zM158.5 111l-19.5 5 7 18.5-8 3-10-27 28-7.5zM146 140h-14v-2.5l5.5-3h8.5z"/><path class="il-navy" d="M166.5 108h-16.5v-31l2-2h11l3 3z"/><path class="il-skin-3" d="M160 77h-5l-.5-7.5h5z"/><path class="il-hair-1" d="M147.5 63a10.5 10.5 0 1121 0a10.5 10.5 0 11-21 0z"/><path class="il-skin-3" d="M148.5 64.5a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-1" d="M150.5 59L150 59A8.5 8.5 0 01163.5 69.5L163 69z"/><path class="il-navy" d="M160 78l6 18.5-4 3.5-16.5-6 2.5-5.5 10.5 4-4-12.5z"/><path class="il-sk-p" d="M154.5 80l4 12.5M158.5 92.5l-8.5-3M150 95.5l12 4.5M162 100l4-3.5M166 96.5l-6-18.5M160 78l-5.5 2" stroke-width="1"/><path class="il-skin-3" d="M142.5 90.5a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="accent"><path class="il-cat-consult" d="M109 31h26v18h-15l-7 7v-7h-4z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('offline', 'spot', 'P2',
    'バス停で紙の地図を読む若者。スマホはポケットの中。',
    'A young person reading a paper map at a bus stop, the phone in a pocket.',
    '<g data-il="plate"><path class="il-cat-housing-t" d="M56 24h128v116h-128z"/></g><g data-il="scene"><path class="il-ink" d="M152 46h3v94h-3z"/><path class="il-paper" d="M140.5 40a13 13 0 1126 0a13 13 0 11-26 0z"/><path class="il-sk" d="M140.5 40a13 13 0 1126 0a13 13 0 11-26 0z" stroke-width="3"/><path class="il-green" d="M144 37h19v6h-19z"/><path class="il-paper" d="M146 70h15v26h-15z"/><path class="il-line" d="M146 70h15v26h-15v-26"/><path class="il-p3" d="M149 75h9v1.5h-9zM149 80h9v1.5h-9zM149 85h6v1.5h-6z"/></g><g data-il="fig"><path class="il-green" d="M102.5 60l-4 15.5 13.5-.5 .5 6h-17.5l-3-3.5 4.5-18.5z"/><path class="il-skin-1" d="M110.5 78a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-clay" d="M83.5 62l3-3.5h7.5v25.5h-10.5z"/><path class="il-ink" d="M103.5 87.5l2 24.5-3.5 24.5-8.5-1.5 3.5-23-2-24zM93.5 134.5h9l5 3v2.5h-14zM105 87l4 24.5-2 24.5-8.5-.5 2-23.5-4-23.5zM99 134.5h8.5l5 3v2.5h-13.5z"/><path class="il-green" d="M93 59l3-3h9l2 1.5v36.5h-14.5z"/><path class="il-p3" d="M104 56.5h2.5v37h-2.5z"/><path class="il-clay" d="M98 56h3v17.5h-3z"/><path class="il-skin-1" d="M98.5 50h5l-.5 7.5h-5zM94.5 46a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-2" d="M95.5 50L95 50.5A9 9 0 11111.5 43.5L110.5 44z"/><path class="il-green" d="M103.5 60l-3 16 14 1-.5 5.5-21-1.5 5-22z"/><path class="il-sk-p" d="M103.5 60l-3 16M100.5 76l6.5.5M107 82l-14-1M93 81l5-22M98 59l5.5 1" stroke-width="1"/><path class="il-skin-1" d="M112.5 80a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-paper" d="M110.5 66h22v16h-22z"/><path class="il-line" d="M110.5 66h22v16h-22v-16M121.5 66v16"/><path class="il-green" d="M113.5 77h5.5l4-6h6.5v2h-5l-4 6h-7z"/><path class="il-skin-1" d="M112.5 80a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('learn-cover-kyufu-kashitsuke', 'cover', 'P1',
    '返さなくていい緑の封筒と、返すことになる封筒を持つ若者。',
    'A young person holding a green envelope that stays, and another that has to go back.',
    '<g data-il="plate"><path class="il-p2" d="M0 0h240v140h-240z"/></g><g data-il="fig"><path class="il-ink" d="M117.5 84l3 26.5-3.5 25.5-9-1 3.5-25-3-25zM107.5 134.5h10v5.5h-10zM127.5 85l-3 25 3.5 25-9 1-3.5-25.5 3-26.5zM118.5 134.5h10v5.5h-10z"/><path class="il-green" d="M106 54l3.5-3.5h17l3.5 3.5-1.5 37h-21z"/><path class="il-skin-1" d="M115 44.5h6v7h-6zM109.5 39a8.5 8.5 0 1117 0a8.5 8.5 0 11-17 0z"/><path class="il-hair-2" d="M121.5 37l-5.5 1-6.5 2.5-1 .5v-3l.5-2.5 1.5-2.5 2-2 2.5-1 2.5-.5h3l2.5 1 2 2 1.5 2 1 3v2.5h-1z"/><path class="il-green" d="M112 54l3 22-16 12.5-4-5 13.5-10-2.5-18.5z"/><path class="il-sk-p" d="M112 54l3 22M115 76l-8 6M108.5 73.5l-2.5-17.5M106 55l6-1" stroke-width="1"/><path class="il-skin-1" d="M92.5 87a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-green" d="M130 55l-2.5 18.5 13.5 10-4 5-16-12.5 3-22z"/><path class="il-sk-p" d="M130 56l-2.5 17.5M129 82l-8-6M121 76l3-22M124 54l6 1" stroke-width="1"/><path class="il-skin-1" d="M137.5 87a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="prop"><path class="il-green" d="M65.5 73h30v21h-30z"/><path class="il-sk-p" d="M65.5 73l15 11.5 15-11.5" stroke-width="1"/><path class="il-skin-1" d="M92.5 87a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-clay" d="M140.5 73h30v21h-30z"/><path class="il-sk-p" d="M140.5 73l15 11.5 15-11.5" stroke-width="1"/><path class="il-skin-1" d="M137.5 87a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="route"><path class="il-dash" d="M136 94A22 22 0 1 1 176 90.5"/><path class="il-ink" d="M174 95l-2-6 7.5 3z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('learn-cover-rishi', 'cover', 'P1',
    '8枚かりて、10枚かえす。ふえた2枚は黄色。',
    'Borrow a stack of eight coins, return a stack of ten; the extra two are highlighted.',
    '<g data-il="plate"><path class="il-p2" d="M0 0h240v140h-240z"/></g><g data-il="prop"><path class="il-amber" d="M64 135.5h36v4.5h-36zM64 130h36v4.5h-36zM64 124.5h36v4.5h-36zM64 119h36v4.5h-36zM64 114h36v4.5h-36zM64 108.5h36v4.5h-36zM64 103h36v4.5h-36zM64 97.5h36v4.5h-36z"/></g><g data-il="prop" data-il-order="1"><path class="il-amber" d="M136 135.5h36v4.5h-36zM136 130h36v4.5h-36zM136 124.5h36v4.5h-36zM136 119h36v4.5h-36zM136 114h36v4.5h-36zM136 108.5h36v4.5h-36zM136 103h36v4.5h-36zM136 97.5h36v4.5h-36z"/><path class="il-marker" d="M136 92h36v4.5h-36z"/></g><g data-il="route"><path class="il-dash" d="M82 88l34-56 34 30"/><path class="il-ink" d="M151 63l-7-1.5 4.5-5.5z"/></g><g data-il="accent"><path class="il-marker" d="M136 77h36v4.5h-36z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('learn-cover-keiyaku', 'cover', 'P1',
    '机をはさんで、職員といっしょに契約書を読む若者。机の上には、まだ押していないはんこ。',
    'A young person reading a contract with a staff member across a desk; the hanko waits, not yet stamped.',
    '<g data-il="plate"><path class="il-p2" d="M0 0h240v140h-240z"/></g><g data-il="scene"><path class="il-ink" d="M92 84h58v3h-58zM96 87h2.5v53h-2.5zM144 87h2.5v53h-2.5zM54 109h26v3h-26zM65.5 112h3v28h-3zM160 109h26v3h-26zM171.5 112h3v28h-3z"/><path class="il-clay" d="M124 82h9v2h-9z"/><path class="il-ink" d="M126 71h5v11h-5z"/><path class="il-navy" d="M104 82h14v2h-14z"/></g><g data-il="fig2"><path class="il-navy" d="M177 81l-6.5 18-5 .5-10.5-13.5 4.5-3.5 7.5 9.5 5-13z"/><path class="il-skin-3" d="M153.5 83a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M175.5 112l-19 4.5 6 18-8 2.5-8.5-26.5 28-6.5zM162 140h-13.5v-2.5l5.5-3h8zM174 112l-19 4 4.5 19-8 2-6.5-27 27.5-6zM159.5 140h-13.5v-2.5l5-3h8.5z"/><path class="il-navy" d="M182 108.5h-15.5v-30l1.5-2h11l3 3z"/><path class="il-skin-3" d="M176 78.5h-5l-.5-7.5h5z"/><path class="il-hair-1" d="M164 64.5a10 10 0 1120 0a10 10 0 11-20 0z"/><path class="il-skin-3" d="M164.5 66a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-1" d="M166.5 61L166 60.5A8.5 8.5 0 01179.5 71L179 70.5z"/><path class="il-navy" d="M174.5 83l-19.5 8-12.5-14.5 4-3.5 10 11 15.5-6.5z"/><path class="il-sk-p" d="M172 77.5l-5.5 2.5M166.5 86l8-3M174.5 83l-2.5-5.5" stroke-width="1"/><path class="il-skin-3" d="M140.5 73.5a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="fig"><path class="il-green" d="M68 79l5.5 14 10-8.5 3.5 4.5-12.5 11-4.5-1-7-17.5z"/><path class="il-skin-1" d="M83.5 85.5a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M66 104l28 6.5-8.5 26.5-8-2.5 6-18-19-4.5zM78 134.5h8l5.5 3v2.5h-13.5zM67.5 104l27.5 6-6.5 27-8-2 4.5-19-19-4zM80.5 134.5h8.5l5 3v2.5h-13.5z"/><path class="il-green" d="M59 79.5l3-3h9l2 2v30h-14.5z"/><path class="il-p3" d="M70 77.5h2.5v30.5h-2.5z"/><path class="il-skin-1" d="M64.5 71h5l-.5 7.5h-5zM59.5 66a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-2" d="M62 72L61.5 72.5A8.5 8.5 0 1175 61.5L74 62z"/><path class="il-green" d="M69 78.5l8.5 12.5 7.5-10.5 4.5 3-10 14h-4.5l-10.5-15.5z"/><path class="il-sk-p" d="M69 78.5l4 5.5M73 94.5l-8.5-12.5M64.5 82l4.5-3.5" stroke-width="1"/><path class="il-skin-1" d="M85 81a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-paper" d="M85 57h20v27h-20z"/><path class="il-line" d="M85 57h20v27h-20v-27"/><path class="il-ink" d="M88.5 61h9v2h-9z"/><path class="il-p3" d="M88.5 66h13v1.5h-13z"/><path class="il-amber" d="M88.5 70h13v2h-13z"/><path class="il-p3" d="M88.5 74.5h13v1.5h-13zM88.5 78.5h8v1.5h-8z"/><path class="il-skin-1" d="M85 81a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('learn-cover-koza-card', 'cover', 'P1',
    'キャッシュカードを手にする若者。机には通帳とカードの読み取り機。',
    'A young person holding a bank card; a passbook and a card reader on the table.',
    '<g data-il="plate"><path class="il-p2" d="M0 0h240v140h-240z"/></g><g data-il="prop"><path class="il-ink" d="M118 94h78v3h-78zM122 97h2.5v43h-2.5zM189.5 97h2.5v43h-2.5z"/><path class="il-navy" d="M128 90h28v4h-28z"/><path class="il-paper" d="M130 88h24v2h-24z"/><path class="il-ink" d="M166 78h18v16h-18z"/><path class="il-p3" d="M169 81h12v5h-12z"/><path class="il-paper" d="M170 90h10v1.5h-10z"/></g><g data-il="fig"><path class="il-green" d="M86 62l-4.5 17.5 3 16.5-5.5 1-3-17.5 4.5-19z"/><path class="il-skin-2" d="M79 98a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M87.5 88.5l2.5 24.5-3.5 23.5-8.5-1 3.5-23-2.5-23zM78.5 134.5h8.5l5 3v2.5h-13.5zM89 88l4 24-1.5 24-8.5-.5 1.5-23-4-23zM83.5 134.5h8.5l5 3v2.5h-13.5z"/><path class="il-green" d="M77 60.5l3-3h9l2 2v35.5h-14.5z"/><path class="il-skin-2" d="M82.5 52h5l-.5 7.5h-5z"/><path class="il-ink" d="M83 54.5L82 56.5A10 10 0 1189 56.5L88 54.5zM91 58h-15.5l6.5-1.5 7-.5z"/><path class="il-skin-2" d="M82 47a6 6 0 1112 0a6 6 0 11-12 0z"/><path class="il-green" d="M87.5 61l2 13 8-8 4 4.5-12.5 11.5-4.5-1.5-2.5-19z"/><path class="il-sk-p" d="M87.5 61l2 13M89 82l-4.5-1.5M84.5 80.5l-2.5-19M82 61.5l5.5-.5" stroke-width="1"/><path class="il-skin-2" d="M97.5 67a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-green" d="M96.5 50h26v17h-26z"/><path class="il-marker" d="M101.5 55h6v5h-6z"/><path class="il-paper" d="M101.5 63h16v1.5h-16z"/><path class="il-skin-2" d="M97.5 67a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('learn-cover-tedori', 'cover', 'P1',
    '給与明細。上の長い棒が額面、下の短い棒が手取り。三つのブロックが引かれていく。',
    'A pay slip: the long bar is gross pay, the shorter bar is take-home pay; three blocks drop away.',
    '<g data-il="plate"><path class="il-p2" d="M0 0h240v140h-240z"/></g><g data-il="prop"><path class="il-paper" d="M58 18h84v122h-84z"/><path class="il-line" d="M58 140v-122h84v122"/><path class="il-ink" d="M68 28h30v4h-30zM68 46h64v11h-64z"/><path class="il-green" d="M68 63h38v11h-38z"/><path class="il-dash" d="M106 63h26v11h-26v-11"/><path class="il-p3" d="M68 88h64v2.5h-64zM68 100h64v2.5h-64zM68 112h64v2.5h-64zM68 124h46v2.5h-46z"/></g><g data-il="accent"><path class="il-amber" d="M154 56h9v9h-9zM152 122h13v18h-13z"/><path class="il-paper" d="M154 124h9v7h-9z"/><path class="il-navy" d="M170 70h9v9h-9zM168 122h13v18h-13z"/><path class="il-paper" d="M170 124h9v7h-9z"/><path class="il-clay" d="M186 84h9v9h-9zM184 122h13v18h-13z"/><path class="il-paper" d="M186 124h9v7h-9z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('learn-cover-seikatsuhi', 'cover', 'P1',
    'ひと部屋の暮らし。壁のカレンダー、天井の明かり、ちゃぶ台のごはんとスマホ。',
    'A one-room home: a calendar on the wall, a ceiling light, a bowl of rice and a phone on a low table.',
    '<g data-il="plate"><path class="il-p2" d="M0 0h240v140h-240z"/></g><g data-il="scene"><path class="il-paper" d="M50 40h46v46h-46z"/><path class="il-line" d="M50 40h46v46h-46v-46"/><path class="il-ink" d="M50 40h46v7h-46zM60 35h3v7h-3zM83 35h3v7h-3z"/><path class="il-p3" d="M56.5 55.5h5.5v5.5h-5.5zM65.5 55.5h5.5v5.5h-5.5zM75 55.5h5.5v5.5h-5.5zM84 55.5h5.5v5.5h-5.5zM56.5 65h5.5v5.5h-5.5zM65.5 65h5.5v5.5h-5.5zM75 65h5.5v5.5h-5.5zM84 65h5.5v5.5h-5.5zM56.5 74h5.5v5.5h-5.5zM65.5 74h5.5v5.5h-5.5zM75 74h5.5v5.5h-5.5zM84 74h5.5v5.5h-5.5z"/><path class="il-sk-g" d="M81.5 77a5.5 5.5 0 1111 0a5.5 5.5 0 11-11 0z" stroke-width="2"/></g><g data-il="scene" data-il-order="1"><path class="il-line" d="M150 0v38"/><path class="il-ink" d="M143 38h14l8 12h-30z"/><path class="il-marker" d="M140 50h20v3.5h-20z"/></g><g data-il="prop"><path class="il-ink" d="M108 112h88v4h-88zM114 116h3v24h-3zM187 116h3v24h-3z"/><path class="il-green" d="M74 129l-9-9v-6l9 8.5zM74 119l10-10v7l-10 10zM73 112.5h2v17.5h-2z"/><path class="il-clay" d="M66.5 127.5h15l-1.5 12.5h-12z"/></g><g data-il="accent"><path class="il-paper" d="M127 100a11 8 0 0 1 22 0z"/><path class="il-clay" d="M123 100h30a15 12 0 0 1-30 0zM132 110h12v2h-12z"/><path class="il-ink" d="M168 92h11v20h-11z"/><path class="il-p3" d="M170 94h7v13h-7z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('learn-cover-yachin', 'cover', 'P1',
    'アパートの扉と鍵。床にならぶ四つの封筒（はじめにかかるお金）。車いすで着いた若者。',
    'An apartment door with a key; four envelopes for the move-in costs; a young adult arriving.',
    '<g data-il="plate"><path class="il-p2" d="M0 0h240v140h-240z"/></g><g data-il="scene"><path class="il-paper" d="M136 48h42v92h-42z"/><path class="il-line" d="M136 140v-92h42v92"/><path class="il-cat-housing" d="M140 52h34v88h-34z"/><path class="il-paper" d="M167 98h3.5v3.5h-3.5z"/></g><g data-il="accent"><path class="il-ink" d="M167 92h1.5v6h-1.5z"/><path class="il-sk-a" d="M166 101a2 2 0 114 0a2 2 0 11-4 0z" stroke-width="1.5"/><path class="il-amber" d="M170.5 100h7.5v3.5h-1.5v-1.5h-1.5v1h-1v-1h-3.5z"/></g><g data-il="prop"><path class="il-amber" d="M98 120h24v17h-24z"/><path class="il-sk-p" d="M98 120l12 9.5 12-9.5" stroke-width="1"/><path class="il-clay" d="M105 117h24v17h-24z"/><path class="il-sk-p" d="M105 117l12 9.5 12-9.5" stroke-width="1"/><path class="il-green" d="M112 114h24v17h-24z"/><path class="il-sk-p" d="M112 114l12 9.5 12-9.5" stroke-width="1"/><path class="il-navy" d="M119 111h24v17h-24z"/><path class="il-sk-p" d="M119 111l12 9.5 12-9.5" stroke-width="1"/></g><g data-il="fig"><path class="il-sk" d="M45.5 125.5a13 13 0 1126 0a13 13 0 11-26 0z" stroke-width="3"/><path class="il-ink" d="M57.5 124h3v3h-3zM71.5 137a3 3 0 116 0a3 3 0 11-6 0zM53 109.5h19v2.5h-19zM52 112l-1-26h-5v-2h7l1 28zM71.5 110.5l4 26.5h-2l-4-26z"/><path class="il-green" d="M62 82l-.5 17 6 14-5 2-6.5-15 1-18z"/><path class="il-skin-4" d="M62.5 115.5a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M60 104l26 6-7 25-7.5-2 4.5-17.5-17.5-4zM71.5 132.5h8l4.5 3v2.5h-12.5zM61.5 104l25.5 6-6 25-7.5-2 4.5-17.5-18-4zM73.5 132.5h8l4.5 3v2.5h-12.5z"/><path class="il-green" d="M53.5 81.5l2.5-3h8.5l2 1.5v28.5h-13.5z"/><path class="il-skin-4" d="M58.5 73.5h4.5l-.5 6.5h-4.5z"/><path class="il-clay" d="M57 77h7.5v4.5h-7.5zM61.5 80h3l1 15h-3.5z"/><path class="il-hair-1" d="M53.5 62a4 4 0 118 0a4 4 0 11-8 0zM50 66.5a4 4 0 118 0a4 4 0 11-8 0zM51 72a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0zM60 61.5a3.5 3.5 0 117 0a3.5 3.5 0 11-7 0zM64 64a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-skin-4" d="M54 68.5a7.5 7.5 0 1115 0a7.5 7.5 0 11-15 0z"/><path class="il-hair-1" d="M56 73.5L55.5 74A8 8 0 1168 64L67.5 64.5z"/><path class="il-green" d="M63.5 82l-1.5 17 7 13-4.5 2.5-8-14.5 1.5-18.5z"/><path class="il-sk-p" d="M63.5 82l-1.5 17M62 99l4.5 8M61 108.5l-4.5-8.5M56.5 100l1.5-18.5M58 81.5l5.5.5" stroke-width="1"/><path class="il-skin-4" d="M64.5 114.5a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M72 134h10.5v2h-10.5z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('learn-cover-shogakukin', 'cover', 'P1',
    '本をかかえた若者と、二つの封筒。緑は給付、もう一つは返す貸与。',
    'A young person with a stack of books, and two envelopes: a green grant, and a loan that goes back.',
    '<g data-il="plate"><path class="il-p2" d="M0 0h240v140h-240z"/></g><g data-il="fig"><path class="il-ink" d="M83.5 88.5l2.5 24-3 24-8.5-1 3.5-23-2.5-23zM74 135h9.5v5h-9.5zM92.5 89.5l-2.5 23 3.5 23-8.5 1-3-24 2.5-24zM84.5 135h9.5v5h-9.5z"/><path class="il-green" d="M73 60.5l3-3h16l3 3-1 34.5h-20z"/><path class="il-skin-2" d="M81.5 52h5v6.5h-5z"/><path class="il-ink" d="M94 48.5l-1 10h-18l-1-10zM74 47a10 10 0 1120 0a10 10 0 11-20 0z"/><path class="il-skin-2" d="M78 46.5a6 6 0 1112 0a6 6 0 11-12 0z"/><path class="il-green" d="M78 63l-8.5 9 11 9-4 4-15.5-12.5 12.5-13z"/><path class="il-sk-p" d="M78 63l-5 5M73.5 75l7 6M80.5 81l-4 4M74 59.5l4 3.5" stroke-width="1"/><path class="il-skin-2" d="M76.5 84a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-green" d="M94.5 59.5l12.5 13-15.5 12.5-4-4 11-9-8.5-9z"/><path class="il-sk-p" d="M91.5 85l-4-4M87.5 81l7-6M95 68l-5-5M90 63l4-3.5" stroke-width="1"/><path class="il-skin-2" d="M85.5 84a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-cat-education" d="M73.5 62h21v7h-21z"/><path class="il-navy" d="M75.5 69h17v7h-17z"/><path class="il-clay" d="M72.5 76h22v8h-22z"/><path class="il-paper" d="M74.5 81.5h19v1.5h-19z"/><path class="il-skin-2" d="M76.5 84a3 3 0 116 0a3 3 0 11-6 0zM85.5 84a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="prop"><path class="il-green" d="M124 70h28v19h-28z"/><path class="il-sk-p" d="M124 70l14 10.5 14-10.5" stroke-width="1"/><path class="il-clay" d="M160 70h28v19h-28z"/><path class="il-sk-p" d="M160 70l14 10.5 14-10.5" stroke-width="1"/></g><g data-il="route"><path class="il-dash" d="M156 90.5A21 21 0 1 1 193.5 87"/><path class="il-ink" d="M192 92l-2-6 7.5 2.5z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('learn-cover-zeikin-hoken-nenkin', 'cover', 'P1',
    '給与明細。引かれる三つの行（税・保険・年金）を、黄色のかっこでくくっている。',
    'A pay slip: the three deduction lines (tax, insurance, pension) are bracketed in amber.',
    '<g data-il="plate"><path class="il-p2" d="M0 0h240v140h-240z"/></g><g data-il="prop"><path class="il-paper" d="M64 20h96v120h-96z"/><path class="il-line" d="M64 140v-120h96v120"/><path class="il-ink" d="M74 30h32v4h-32z"/><path class="il-p3" d="M126 31h24v2h-24z"/><path class="il-line" d="M72 44H152M72 66H152M72 102H152"/><path class="il-dot" d="M126 44v72"/><path class="il-p3" d="M74 51h30v2.5h-30z"/><path class="il-ink" d="M132 51h18v2.5h-18z"/><path class="il-p3" d="M74 58h24v2.5h-24z"/><path class="il-ink" d="M132 58h14v2.5h-14z"/><path class="il-p3" d="M74 73h30v2.5h-30z"/><path class="il-ink" d="M132 73h18v2.5h-18z"/><path class="il-p3" d="M74 82h24v2.5h-24z"/><path class="il-ink" d="M132 82h18v2.5h-18z"/><path class="il-p3" d="M74 91h30v2.5h-30z"/><path class="il-ink" d="M132 91h18v2.5h-18z"/><path class="il-p3" d="M74 109h22v2.5h-22z"/><path class="il-green" d="M130 107.5h20v5h-20z"/><path class="il-p3" d="M74 126h76v2h-76zM74 135h52v2h-52z"/></g><g data-il="accent"><path class="il-amber" d="M165 67.5h8.5v31h-8.5v-2.5h5.5v-25.5h-5.5zM172 82h7v2.5h-7z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('learn-cover-komattara', 'cover', 'P1',
    '二つの扉。明かりのついた相談の扉へ足あとが向かう。もう一つは硬貨のかかった暗い扉。',
    'Two doors: footsteps lead to the lit door with a phone sign; the other, dark door has a coin on a hook.',
    '<g data-il="plate"><path class="il-p2" d="M0 0h240v140h-240z"/></g><g data-il="scene"><path class="il-marker" d="M52 66h34v74h-34z"/><path class="il-paper" d="M52 66l10 6v65l-10 3z"/><path class="il-line" d="M52 140v-74h34v74"/><path class="il-paper" d="M55 42h28v16h-28z"/><path class="il-line" d="M55 42h28v16h-28v-16"/><path class="il-cat-consult" d="M61 46h5v3l-2 1h10l-2-1v-3h5v6h-16z"/><path class="il-ink" d="M152 66h34v74h-34z"/><path class="il-paper" d="M178 100h3v3h-3z"/></g><g data-il="accent"><path class="il-line" d="M169 66v-16"/><path class="il-amber" d="M161 42a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-sk-p" d="M164 42a5 5 0 1110 0a5 5 0 11-10 0z" stroke-width="1"/></g><g data-il="fig"><path class="il-green" d="M122 66l2 19-12 13-4-4 10-11-1.5-16.5z"/><path class="il-skin-1" d="M106 97a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-clay" d="M135.5 88l-10 .5-1-23.5 6.5-.5 3 3z"/><path class="il-ink" d="M124.5 93l-2 21 12 17-6.5 4.5-14-19 3-24.5zM136.5 135.5l-12 5.5-1-2 3.5-5 7.5-3.5zM123 94l-8.5 20.5-1.5 22-8-.5 1.5-23.5 9-21.5zM112.5 140.5l-13-1.5v-2l5.5-2.5 8 .5z"/><path class="il-green" d="M127.5 98l-13.5.5-2-34 1.5-1.5 9-.5 3 2.5z"/><path class="il-p3" d="M116.5 98h-2l-2-34 2-.5z"/><path class="il-clay" d="M121 79l-2.5.5-1-17h2.5z"/><path class="il-skin-1" d="M120.5 64.5h-4.5l-1-7h4.5zM109 52.5a7.5 7.5 0 1115 0a7.5 7.5 0 11-15 0z"/><path class="il-hair-2" d="M110 48.5L109.5 48A8.5 8.5 0 11122 59L121.5 58.5z"/><path class="il-green" d="M120 64.5l13 14-1 17h-5.5l1-15-11.5-12.5z"/><path class="il-sk-p" d="M116 68l10 11M127 90l-.5 5.5M125.5 70.5l-5.5-6M120 64.5l-4 3.5" stroke-width="1"/><path class="il-skin-1" d="M126 97a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('learn-cover-jr-koko-okane', 'cover', 'P1',
    '机で緑の封筒（給付）をひらく中学生。壁のフックに高校の制服、机には教科書と定期券。',
    'A junior-high student at a desk opening a green grant envelope; a school blazer on a wall hook, textbooks and a commuter pass on the desk.',
    '<g data-il="plate"><path class="il-p2" d="M0 0h240v140h-240z"/></g><g data-il="scene"><path class="il-ink" d="M55 24h6v4h-6z"/><path class="il-line" d="M58 28v6"/><path class="il-ink" d="M42.5 41l15.5-8 15.5 8-1 2-14.5-8-14.5 8z"/><path class="il-navy" d="M42 42l10-4 6 10 6-10 10 4 2 44h-36z"/><path class="il-paper" d="M52 38l6 10 6-10-3 26h-6z"/></g><g data-il="prop"><path class="il-ink" d="M112 90h88v3h-88zM116 93h2.5v47h-2.5zM194 93h2.5v47h-2.5zM80 109h26v3h-26zM91.5 112h3v28h-3z"/><path class="il-cat-education" d="M162 84h30v6h-30z"/><path class="il-paper" d="M163 87h29v2h-29z"/><path class="il-navy" d="M164 78h27v6h-27z"/><path class="il-paper" d="M165 81h26v2h-26z"/><path class="il-clay" d="M161 72h31v6h-31z"/><path class="il-paper" d="M162 75h30v2h-30zM144 78h15v11h-15z"/><path class="il-line" d="M144 89v-11h15v11h-15"/><path class="il-green" d="M144 81.5h15v3h-15z"/></g><g data-il="fig"><path class="il-navy" d="M94 79l7 13 9-9 4.5 4-12 12-5-1-8.5-16.5z"/><path class="il-skin-2" d="M110.5 84a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-ink" d="M92 104l28 6.5-8.5 26.5-8-2.5 6-18-19-4.5zM104 134.5h8l5.5 3v2.5h-13.5zM93.5 104l27.5 6-6.5 27-8-2 4.5-19-19-4zM106.5 134.5h8.5l5 3v2.5h-13.5z"/><path class="il-navy" d="M85.5 79.5l3-3h8l2 2v30h-13.5z"/><path class="il-paper" d="M95.5 77.5h2.5v30.5h-2.5z"/><path class="il-skin-2" d="M90.5 71h5l-.5 7.5h-5zM85.5 66a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-1" d="M88 71.5L87.5 72A8.5 8.5 0 11100 61L99.5 61zM82 64a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-navy" d="M95 78.5l10 11.5 8.5-10.5 4.5 3.5-12.5 16-15-17z"/><path class="il-sk-p" d="M95 78.5l3.5 4M98.5 91l-8-9M90.5 82l4.5-3.5" stroke-width="1"/><path class="il-skin-2" d="M114 80a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-paper" d="M117 58h16v12h-16z"/><path class="il-line" d="M117 70v-12h16v12"/><path class="il-green" d="M113 65h24v17h-24z"/><path class="il-sk-p" d="M113 65l12 9.5 12-9.5" stroke-width="1"/><path class="il-skin-2" d="M114 80a3 3 0 116 0a3 3 0 11-6 0z"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
  R('learn-cover-jr-baito-zeikin', 'cover', 'P1',
    'エプロンのひもを結ぶ中学生。棚には封筒と小銭のびん。',
    'A junior-high student tying an apron; an envelope and a coin jar on a shelf.',
    '<g data-il="plate"><path class="il-p2" d="M0 0h240v140h-240z"/></g><g data-il="prop"><path class="il-ink" d="M120 66h70v3.5h-70zM128 69.5h3v7h-3zM179 69.5h3v7h-3z"/><path class="il-paper" d="M128 48h24v18h-24z"/><path class="il-sk" d="M128 48l12 10 12-10" stroke-width="1"/><path class="il-line" d="M128 48h24v18h-24v-18"/><path class="il-p3" d="M160 44h20v22h-20z"/><path class="il-amber" d="M162 54h16v12h-16z"/><path class="il-ink" d="M158 40h24v4h-24z"/></g><g data-il="fig"><path class="il-ink" d="M87.5 88.5l2.5 24-3 24-8.5-1 3.5-23-2.5-23zM78 135h9.5v5h-9.5zM96.5 89.5l-2.5 23 3.5 23-8.5 1-3-24 2.5-24zM88.5 135h9.5v5h-9.5z"/><path class="il-navy" d="M77.5 60.5l3.5-3h14l3.5 3-1.5 34.5h-18z"/><path class="il-skin-2" d="M85.5 52h5v6.5h-5zM80 47a8 8 0 1116 0a8 8 0 11-16 0z"/><path class="il-hair-1" d="M80 47.5L79.5 48A8.5 8.5 0 1196.5 48L96 47.5zM85 37a3 3 0 116 0a3 3 0 11-6 0z"/><path class="il-clay" d="M82 58.5h12v8.5l3.5 4.5-.5 37.5h-18l-.5-37.5 3.5-4.5z"/><path class="il-paper" d="M82.5 85h11v6.5h-11z"/><path class="il-clay" d="M81.5 58l3.5-7h6l3.5 7-1 1-3.5-6h-4l-3.5 6z"/><path class="il-navy" d="M82 63l-8 11.5 7.5 8-4.5 3.5-10-10.5 10.5-16z"/><path class="il-sk-p" d="M81.5 82.5l-3-3.5M78 69l4-6M82 63l-4-3" stroke-width="1"/><path class="il-navy" d="M98.5 59.5l10.5 16-10 10.5-4.5-3.5 7.5-8-8-11.5z"/><path class="il-sk-p" d="M94 63l4 6M97.5 79l-3 3.5M98 60l-4 3" stroke-width="1"/></g><g data-il="ground"><path class="il-line" d="M0 140h240"/></g>');
})();
;
/* ---- js/motion.js ---- */
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
;
/* ---- data/areas.js ---- */
/* 巣立ちマップ v2 — data/areas.js (A6)
   All 62 区市町村 of Tokyo, in 全国地方公共団体コード order (5 digits, without the check digit).
   Codes and names checked against 国土数値情報 行政区域データ (N03, attribute N03_007 / N03_004).
   type: ku 区 / shi 市 / machi 町 / mura 村.  group: 23ku / tama (多摩・西多摩) / islands (島しょ). */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};
  function a(code, name, kana, en, type, group) { return { code: code, name: name, kana: kana, en: en, type: type, group: group }; }
  SM.data.areas = [
    a('13101', '千代田区', 'ちよだく', 'Chiyoda', 'ku', '23ku'),
    a('13102', '中央区', 'ちゅうおうく', 'Chuo', 'ku', '23ku'),
    a('13103', '港区', 'みなとく', 'Minato', 'ku', '23ku'),
    a('13104', '新宿区', 'しんじゅくく', 'Shinjuku', 'ku', '23ku'),
    a('13105', '文京区', 'ぶんきょうく', 'Bunkyo', 'ku', '23ku'),
    a('13106', '台東区', 'たいとうく', 'Taito', 'ku', '23ku'),
    a('13107', '墨田区', 'すみだく', 'Sumida', 'ku', '23ku'),
    a('13108', '江東区', 'こうとうく', 'Koto', 'ku', '23ku'),
    a('13109', '品川区', 'しながわく', 'Shinagawa', 'ku', '23ku'),
    a('13110', '目黒区', 'めぐろく', 'Meguro', 'ku', '23ku'),
    a('13111', '大田区', 'おおたく', 'Ota', 'ku', '23ku'),
    a('13112', '世田谷区', 'せたがやく', 'Setagaya', 'ku', '23ku'),
    a('13113', '渋谷区', 'しぶやく', 'Shibuya', 'ku', '23ku'),
    a('13114', '中野区', 'なかのく', 'Nakano', 'ku', '23ku'),
    a('13115', '杉並区', 'すぎなみく', 'Suginami', 'ku', '23ku'),
    a('13116', '豊島区', 'としまく', 'Toshima', 'ku', '23ku'),
    a('13117', '北区', 'きたく', 'Kita', 'ku', '23ku'),
    a('13118', '荒川区', 'あらかわく', 'Arakawa', 'ku', '23ku'),
    a('13119', '板橋区', 'いたばしく', 'Itabashi', 'ku', '23ku'),
    a('13120', '練馬区', 'ねりまく', 'Nerima', 'ku', '23ku'),
    a('13121', '足立区', 'あだちく', 'Adachi', 'ku', '23ku'),
    a('13122', '葛飾区', 'かつしかく', 'Katsushika', 'ku', '23ku'),
    a('13123', '江戸川区', 'えどがわく', 'Edogawa', 'ku', '23ku'),
    a('13201', '八王子市', 'はちおうじし', 'Hachioji', 'shi', 'tama'),
    a('13202', '立川市', 'たちかわし', 'Tachikawa', 'shi', 'tama'),
    a('13203', '武蔵野市', 'むさしのし', 'Musashino', 'shi', 'tama'),
    a('13204', '三鷹市', 'みたかし', 'Mitaka', 'shi', 'tama'),
    a('13205', '青梅市', 'おうめし', 'Ome', 'shi', 'tama'),
    a('13206', '府中市', 'ふちゅうし', 'Fuchu', 'shi', 'tama'),
    a('13207', '昭島市', 'あきしまし', 'Akishima', 'shi', 'tama'),
    a('13208', '調布市', 'ちょうふし', 'Chofu', 'shi', 'tama'),
    a('13209', '町田市', 'まちだし', 'Machida', 'shi', 'tama'),
    a('13210', '小金井市', 'こがねいし', 'Koganei', 'shi', 'tama'),
    a('13211', '小平市', 'こだいらし', 'Kodaira', 'shi', 'tama'),
    a('13212', '日野市', 'ひのし', 'Hino', 'shi', 'tama'),
    a('13213', '東村山市', 'ひがしむらやまし', 'Higashimurayama', 'shi', 'tama'),
    a('13214', '国分寺市', 'こくぶんじし', 'Kokubunji', 'shi', 'tama'),
    a('13215', '国立市', 'くにたちし', 'Kunitachi', 'shi', 'tama'),
    a('13218', '福生市', 'ふっさし', 'Fussa', 'shi', 'tama'),
    a('13219', '狛江市', 'こまえし', 'Komae', 'shi', 'tama'),
    a('13220', '東大和市', 'ひがしやまとし', 'Higashiyamato', 'shi', 'tama'),
    a('13221', '清瀬市', 'きよせし', 'Kiyose', 'shi', 'tama'),
    a('13222', '東久留米市', 'ひがしくるめし', 'Higashikurume', 'shi', 'tama'),
    a('13223', '武蔵村山市', 'むさしむらやまし', 'Musashimurayama', 'shi', 'tama'),
    a('13224', '多摩市', 'たまし', 'Tama', 'shi', 'tama'),
    a('13225', '稲城市', 'いなぎし', 'Inagi', 'shi', 'tama'),
    a('13227', '羽村市', 'はむらし', 'Hamura', 'shi', 'tama'),
    a('13228', 'あきる野市', 'あきるのし', 'Akiruno', 'shi', 'tama'),
    a('13229', '西東京市', 'にしとうきょうし', 'Nishitokyo', 'shi', 'tama'),
    a('13303', '瑞穂町', 'みずほまち', 'Mizuho', 'machi', 'tama'),
    a('13305', '日の出町', 'ひのでまち', 'Hinode', 'machi', 'tama'),
    a('13307', '檜原村', 'ひのはらむら', 'Hinohara', 'mura', 'tama'),
    a('13308', '奥多摩町', 'おくたままち', 'Okutama', 'machi', 'tama'),
    a('13361', '大島町', 'おおしままち', 'Oshima', 'machi', 'islands'),
    a('13362', '利島村', 'としまむら', 'Toshima Village', 'mura', 'islands'),
    a('13363', '新島村', 'にいじまむら', 'Niijima', 'mura', 'islands'),
    a('13364', '神津島村', 'こうづしまむら', 'Kozushima', 'mura', 'islands'),
    a('13381', '三宅村', 'みやけむら', 'Miyake', 'mura', 'islands'),
    a('13382', '御蔵島村', 'みくらじまむら', 'Mikurajima', 'mura', 'islands'),
    a('13401', '八丈町', 'はちじょうまち', 'Hachijo', 'machi', 'islands'),
    a('13402', '青ヶ島村', 'あおがしまむら', 'Aogashima', 'mura', 'islands'),
    a('13421', '小笠原村', 'おがさわらむら', 'Ogasawara', 'mura', 'islands')
  ];
})();
;
/* ---- data/programs-national.js ---- */
/* 巣立ちマップ v3 — 国の制度・全国で使える窓口 (owner: DATA-N; v2 owner A3)
 * Every record was checked on 2026-10-16 (v3 additions/re-checks: 2026-10-17, see src3) against the official/operator page in `source.url`.
 * Unconfirmed phone numbers, hours, amounts etc. are null on purpose — do not fill them in by guessing.
 * Tokyo-only and 区市町村 items live in programs-tokyo.js / programs-local.js.
 */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};
  SM.data.programs = SM.data.programs || [];

  var CHECKED = '2026-10-16';
  var BY = 'Economix JP';
  function src(org, url) { return { org: org, url: url, checked: CHECKED }; }
  // v3 (round 2): records added or re-checked for 中学生 support on 2026-10-17
  var CHECKED3 = '2026-10-17';
  function src3(org, url) { return { org: org, url: url, checked: CHECKED3 }; }
  var MEXT_SOS24 = 'https://www.mext.go.jp/a_menu/shotou/seitoshidou/06112216.html';
  var MEXT_SOSTEL = 'https://www.mext.go.jp/a_menu/shotou/seitoshidou/06112211.html';
  var MEXT_SOSSNS = 'https://www.mext.go.jp/a_menu/shotou/seitoshidou/06112212.html';

  var CFA_SHIKIN_PDF = 'https://www.cfa.go.jp/assets/contents/node/basic_page/field_ref_resources/40ecef9f-f018-4913-9ee7-ffa98da27c89/878c782e/20241030_policies_jidougyakutai_sogoshienjigyo_32.pdf';
  var CFA_MIMOTO_PDF = 'https://www.cfa.go.jp/assets/contents/node/basic_page/field_ref_resources/40ecef9f-f018-4913-9ee7-ffa98da27c89/d9decb1f/20241030_policies_jidougyakutai_sogoshienjigyo_13.pdf';
  var CFA_GUIDE_PDF = 'https://www.cfa.go.jp/assets/contents/node/basic_page/field_ref_resources/a23cc922-6f03-41a4-a39d-c7bdadaf7adf/454ec772/20250319_policies_shakaiteki-yougo_tsuuchi_53.pdf';
  var JASSO_GUIDE_PDF = 'https://www.jasso.go.jp/shogakukin/moshikomi/yoyaku/tebiki/__icsFiles/afieldfile/2026/03/17/r9kyufuannai_1.pdf';
  var MAMORO = 'https://www.mhlw.go.jp/mamorouyokokoro/soudan/tel/';

  SM.data.programs.push(

  /* ================= 社会的養護の経験がある人のための国の制度 ================= */

  {
    id: 'jiritsu-shikin',
    name: { ja: '自立支援資金貸付（児童養護施設退所者等）', en: 'Independence Support Loan for Care Leavers' },
    hook: { ja: '家賃や生活費、資格のお金が足りない', en: 'I need help with rent, living costs or a license' },
    summary: {
      ja: '施設や里親家庭を出た人が、利子なしで生活費・家賃・資格のお金を借りられます。決まった年数働き続けると、返さなくてよくなります。',
      en: 'Interest-free money for living costs, rent and job licenses for people who left care. If you keep working for a set number of years, you do not have to pay it back.'
    },
    cat: ['money', 'housing'],
    kind: 'loan_forgivable', basis: 'national', right: false,
    amount: {
      ja: '生活費 月5万円（進学する人）＋家賃（地域の上限まで）／資格のお金 25万円まで',
      en: 'Living costs ¥50,000/month (students) + rent (up to a local cap) / up to ¥250,000 for licenses'
    },
    repay: 'conditional',
    who: { ja: '児童養護施設・自立援助ホーム・里親家庭・ファミリーホームなどを出た人で、家族からお金の助けが見込めない人。生活費は大学・専門学校などに通う人、家賃は進学する人と働く人が対象。資格のお金は施設などにいる間でも使えます。' },
    how: { ja: '住んでいる都道府県の窓口（多くは社会福祉協議会）に申し込みます。施設・里親・自立援助ホームの職員と一緒に準備するとスムーズです。施設などを出てから5年以内なら申し込めます。' },
    where: { ja: '都道府県の社会福祉協議会など（いた施設や児童相談所でも教えてくれます）' },
    docs: ['申込書（窓口の用紙）', '本人確認書類', '学校や仕事がわかる書類（在学証明書・内定通知など）', '家の契約書のコピー（家賃の支援を受けるとき）'],
    ask: ['私は対象になりますか？（いつ、どこを出たか・進学か就職かを伝える）', '返さなくてよくなる条件を、紙で見せてもらえますか？', '保証人がいなくても借りられますか？', '申込みの締切と、お金が振り込まれる日はいつですか？'],
    caution: { ja: '学校をやめたり仕事をやめると契約が終わり、返すことになる場合があります。返さなくてよくなる条件（例：卒業後1年以内に就職して5年続ける）を必ず確認しましょう。' },
    supporter: { ja: '利子なし。連帯保証人は原則立てるが、なしでも貸付可。就職者の家賃支援は退所後2年まで。返還免除：進学者は卒業後1年以内に就職し5年継続、就職者は5年継続、資格取得は2年継続。各資金の申請は1回まで。退所時に不要でも退所後5年以内なら後から申請できる。延滞利子は年3.0%。' },
    effort: 'high',
    for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: ['facility', 'foster', 'jhome', 'other'], careOnly: true, age: { min: 15, max: null }, areas: [] },
    deadline: { ja: '施設などを出てから5年以内なら申し込めます。進学する人は入学の前から相談しておくと安心。', en: 'You can apply within 5 years of leaving care. Students should ask before school starts.', leaveMonths: -4, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://irisconnect.jp/system/support-services', hours: null },
    locations: [],
    source: src('こども家庭庁（実施要綱）', CFA_SHIKIN_PDF),
    sources2: [{ org: 'Iris（こども家庭庁補助事業）', url: 'https://irisconnect.jp/system/support-services' }],
    verifiedBy: BY
  },

  {
    id: 'mimoto-hosho',
    name: { ja: '身元保証人確保対策事業', en: 'Guarantor Support Program' },
    hook: { ja: '部屋や仕事の「保証人」がいない', en: 'I have no one to be my guarantor' },
    summary: {
      ja: '家を借りる・働く・進学するときに、施設長や里親などが保証人になれるよう、国の仕組みで保険をかけます。',
      en: 'When you rent, get a job or enter school, your former facility head or foster parent can be your guarantor, backed by national insurance.'
    },
    cat: ['housing', 'work', 'education'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '施設・里親家庭・自立援助ホーム・一時保護などにいる人、または出てから5年以内の人で、親などに保証人を頼めない人。' },
    how: { ja: 'いた施設の職員・里親・児童相談所に「身元保証人確保対策事業を使いたい」と相談します。施設長などが保証人になり、全国社会福祉協議会が保険をかけます。' },
    where: { ja: 'いた施設・里親・児童相談所（運営は全国社会福祉協議会）' },
    docs: ['保証人の欄がある書類（部屋の契約書・会社や学校の書類）'],
    ask: ['この契約で、身元保証人確保対策事業を使って保証人になってもらえますか？', '保証はいつまで続きますか？', 'この部屋の不動産会社は、保証会社も必要と言っています。どうしたらいいですか？'],
    caution: { ja: '保証の期間には限りがあります（部屋は原則3年・最長4年、仕事は原則3年・最長5年、学校は卒業まで）。不動産会社によっては保証会社も求められるので、契約の前に確認しましょう。' },
    supporter: { ja: '対象理由：父母等の死亡・行方不明・拘留、心身の障害、経済的困窮、虐待やDV等で保証人が不適当。保証人になれるのは施設長・里親・ファミリーホーム養育者・児相所長・自立援助ホーム設置者など。申込書と「利用の手引」は全社協サイトにある。' },
    effort: 'mid',
    for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: ['facility', 'foster', 'jhome', 'other'], careOnly: true, age: { min: 15, max: null }, areas: [] },
    deadline: { ja: '施設などを出てから5年以内に申し込みます。部屋や仕事の契約の前に相談を。', en: 'Apply within 5 years of leaving care, before you sign a contract.', leaveMonths: -3, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.shakyo.or.jp/download/mimoto/index.html', hours: null },
    locations: [],
    source: src('こども家庭庁（実施要綱）', CFA_MIMOTO_PDF),
    sources2: [{ org: '全国社会福祉協議会', url: 'https://www.shakyo.or.jp/download/mimoto/index.html' }],
    verifiedBy: BY
  },

  {
    id: 'sochi-encho',
    name: { ja: '措置延長（18歳を過ぎても今の家にいる）', en: 'Staying in Care After 18' },
    hook: { ja: '18歳で出るのは、まだ不安', en: 'I am not ready to leave at 18' },
    summary: {
      ja: '施設や里親家庭には、20歳になるまで続けていられる仕組みがあります。進学しても、働いていても、希望を伝えてかまいません。20歳をすぎても、同じ施設や里親家庭で『児童自立生活援助』として暮らし続けられる場合があります（2024年4月から）。',
      en: 'You can stay in your facility or foster home until age 20. You may ask for this whether you study or work. Since April 2024 you may also be able to stay in the same facility or foster home after 20 under the self-reliance living support scheme.'
    },
    cat: ['housing'],
    kind: 'housing', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '児童養護施設・里親家庭・ファミリーホームなどで暮らす人。学校が続くか不安な人、働きはじめたけれど不安な人なども含みます。' },
    how: { ja: '担当の職員や里親、児童相談所に「措置延長をしたい」と伝えます。18歳を過ぎていれば、親の同意はいりません。' },
    where: { ja: '担当の職員・里親・児童相談所' },
    docs: [],
    ask: ['20歳まで、ここにいることはできますか？', '措置延長をしたら、退所のときの支援（自立支援資金など）はどうなりますか？', '20歳を過ぎたあとは、どんな選択肢がありますか？'],
    caution: { ja: '決めるのは児童相談所です。早めに希望を伝えて、話し合いの時間をとってもらいましょう。' },
    supporter: { ja: '児童福祉法31条2項。国のガイドラインは、高校卒業・進学・就職で慣習的に解除せず、本人が希望すれば積極的に活用すべきとしている。18歳以上は保護者の同意不要（本人の意に反しない限り継続可）。' },
    effort: 'low',
    for: { stages: ['hs12', 'hs3'], paths: [], care: ['facility', 'foster'], careOnly: true, age: { min: 15, max: 22 }, areas: [] },
    deadline: { ja: '高3になる前から、担当の人と話しはじめると安心です。', en: 'Start talking with your caseworker before your last year of high school.', leaveMonths: -12, months: null, always: false },
    contact: null,
    locations: [],
    source: src('こども家庭庁「社会的養護経験者等への支援に関するガイドライン」', CFA_GUIDE_PDF),
    verifiedBy: BY
  },

  {
    id: 'jiritsu-enjo',
    name: { ja: '自立援助ホーム（児童自立生活援助事業）', en: 'Independent Living Support Homes' },
    hook: { ja: '安心して住める場所と、相談できる大人がほしい', en: 'I need a safe place to live and an adult to talk to' },
    summary: {
      ja: '職員と一緒に暮らしながら、仕事や生活のことを相談できる住まいです。2024年から年齢で一律に終わることがなくなりました。',
      en: 'A home where you live with staff and get help with work and daily life. Since 2024 there is no fixed age limit.'
    },
    cat: ['housing', 'consult'],
    kind: 'housing', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '中学を卒業した20歳未満で、施設や里親家庭を出た人や、一時保護を解除された人など。20歳以上でも、施設などを出た人で事情がある場合は使えることがあります。' },
    how: { ja: '児童相談所に「自立援助ホームを使いたい」と相談します。ホームの職員が申込みを手伝ってくれることもあります。施設や里親家庭がそのまま支援の場所になる型もあります。' },
    where: { ja: '児童相談所（都道府県）' },
    docs: ['申込書（児童相談所・ホームで案内）'],
    ask: ['空いているホームはありますか？', '食費や家賃など、毎月いくらかかりますか？', '仕事が決まっていなくても入れますか？', 'いつまでいられますか？'],
    caution: { ja: '食費や住む費用の一部を払うことがあります。空きが少ない地域もあるので、ほかの方法も並行して考えましょう。' },
    supporter: { ja: '2024年4月施行の改正児童福祉法で、実施場所が自立援助ホーム以外（施設・里親等）にも広がり、従来の「22歳の年度末」の一律年齢制限が弾力化。20歳以上は措置解除者等でやむを得ない事情があり都道府県が必要と認めた者。申込書は都道府県に提出（事業者が代行可）。' },
    effort: 'mid',
    for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 15, max: null }, areas: [] },
    deadline: { ja: 'いつでも相談できます。', en: 'You can ask any time.', leaveMonths: -3, months: null, always: true },
    contact: null,
    locations: [],
    source: src('こども家庭庁「社会的養護経験者等への支援に関するガイドライン」', CFA_GUIDE_PDF),
    verifiedBy: BY
  },

  {
    id: 'yogo-kyoten',
    name: { ja: '社会的養護自立支援拠点（アフターケアの居場所）', en: 'Care Leaver Support Hubs' },
    hook: { ja: '出たあとも、気軽に寄れる場所がほしい', en: 'I want a place to drop by after leaving care' },
    summary: {
      ja: '施設や里親家庭を出た人などが集まれる場所です。暮らし・仕事・お金の相談、役所への付き添い、困ったときの一時的な住まいの支援もあります。',
      en: 'A drop-in place for people who left care. Help with life, work and money, someone to go with you to offices, and short-term housing help.'
    },
    cat: ['consult', 'housing'],
    kind: 'place', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '施設・里親家庭・自立援助ホームを出た人、一時保護を受けたことがある人、虐待を経験したのに支援につながれなかった人など。年齢の上限はありません。' },
    how: { ja: '住んでいる都道府県の拠点に連絡します。場所がわからなければ、いた施設や児童相談所に聞けば教えてくれます。' },
    where: { ja: '都道府県が決めた拠点（NPOなどが運営）' },
    docs: [],
    ask: ['どんなことを手伝ってもらえますか？', '役所や病院に一緒に来てもらえますか？', '住む場所がなくなりそうなとき、泊まれるところはありますか？'],
    caution: { ja: '拠点の名前は地域ごとに違います。「アフターケア」「自立支援拠点」で探すか、施設・児童相談所に聞きましょう。' },
    supporter: { ja: '2024年4月施行の改正児童福祉法で創設。相互交流の場、生活・就労相談、関係機関との調整、住居を失った場合の一時的な滞在支援などを行う。支援コーディネーター・生活相談支援員・就労相談支援員を配置。退所前から利用できる事業もある。' },
    effort: 'low',
    for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: ['facility', 'foster', 'jhome', 'other'], careOnly: true, age: { min: 15, max: null }, areas: [] },
    deadline: { ja: 'いつでも。出る前に一度行ってみると、あとで頼りやすくなります。', en: 'Any time. Visit once before you leave so it is easier to come back later.', leaveMonths: -2, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://irisconnect.jp/system/after-care', hours: null },
    locations: [],
    source: src('こども家庭庁「社会的養護経験者等への支援に関するガイドライン」', CFA_GUIDE_PDF),
    sources2: [{ org: 'Iris（こども家庭庁補助事業）', url: 'https://irisconnect.jp/system/after-care' }],
    verifiedBy: BY
  },

  {
    id: 'iris-site',
    name: { ja: 'Iris（社会的養護経験者向け情報サイト）', en: 'Iris — Info Site for Care Leavers' },
    hook: { ja: '同じ経験をした人の声を読みたい', en: 'I want to hear from people with the same experience' },
    summary: {
      ja: '社会的養護を経験したメンバーが中心になってつくる、こども家庭庁の補助を受けたサイトです。相談先・制度・先輩の声がふりがなつきで読めます。',
      en: 'A site made mainly by care-experienced people, funded by the Children and Families Agency. Help lines, programs and real stories, with furigana.'
    },
    cat: ['consult'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '施設・里親家庭などで暮らしている人、暮らしたことがある人、まわりの大人。' },
    how: { ja: 'サイトを開くだけ。登録はいりません。' },
    where: { ja: 'インターネット' },
    docs: [],
    ask: ['（読むだけでOK）気になった制度は、職員や窓口に「Irisで見た」と伝えてみよう'],
    caution: null,
    supporter: { ja: 'こども家庭庁「社会的養護経験者等ネットワーク形成事業」の補助で運営。制度一覧（自立支援資金・身元保証・アフターケア等）は本人に見せる資料として使いやすい。' },
    effort: 'low',
    for: { stages: [], paths: [], care: ['facility', 'foster', 'jhome', 'other'], careOnly: true, age: null, areas: [] },
    deadline: null,
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://irisconnect.jp/', hours: null },
    locations: [],
    source: src('Iris（こども家庭庁補助事業）', 'https://irisconnect.jp/about-iris/'),
    sources2: [{ org: 'こども家庭庁', url: 'https://www.cfa.go.jp/policies/shakaiteki-yougo' }],
    verifiedBy: BY
  },

  /* ================= 進学 ================= */

  {
    id: 'jasso-kyufu',
    name: { ja: 'JASSO 給付奨学金（返さなくていい奨学金）', en: 'JASSO Grant Scholarship (no repayment)' },
    hook: { ja: '大学や専門学校に行きたいけど、お金が心配', en: 'I want to go to college but worry about money' },
    summary: {
      ja: '国の奨学金で、返す必要がありません。施設や里親家庭にいた人は「ひとり家族」として審査され、いちばん手厚い区分になりやすいです。',
      en: 'A national scholarship you never pay back. People from care are assessed as a one-person household, so they often get the highest level.'
    },
    cat: ['education', 'money'],
    kind: 'grant', basis: 'national', right: false,
    amount: {
      ja: '月 最大75,800円（私立・ひとり暮らし・第Ⅰ区分）／国公立なら66,700円',
      en: 'Up to ¥75,800/month (private, living away, top level) / ¥66,700 at public schools'
    },
    repay: 'none',
    who: { ja: '大学・短大・専門学校・高専（4年生から）に進む人。18歳になる前の日に、施設・自立援助ホーム・里親・ファミリーホームにいた人は「社会的養護を必要とする人」として申し込めます。' },
    how: { ja: '高3のとき、高校からIDとパスワードをもらい、スカラネットで申し込んでマイナンバーを出します。あとでJASSOから案内が来たら、施設などにいたことの証明書を送ります。授業料・入学金の減免も同時に申し込みます。' },
    where: { ja: '今の高校（進学後は進学先の奨学金窓口）' },
    docs: ['マイナンバーがわかる書類', '奨学金確認書兼地方税同意書', '本人確認書類', '施設の在籍証明書や児童（里親）委託証明書（案内が来たら）'],
    ask: ['「社会的養護を必要とする人」として申し込みたいです。何が必要ですか？', '学校の締切はいつですか？', 'ひとり暮らしで家賃を払うので「自宅外通学」で申請できますか？'],
    caution: { ja: 'お金が入るのは進学したあとです。入学金など、入学前に払うお金には使えません。施設から通うと「自宅通学」の低い金額になります。家賃を払って通うなら「自宅外通学」を選び、契約書などの証明を出しましょう。' },
    supporter: { ja: '社会的養護を必要とする人は1人世帯（本人が生計維持者）として判定。カッコ内の減額月額は「施設等から通学し自宅通学扱い」の場合。独立生計者が家賃を払って通学する場合は距離にかかわらず自宅外申請可（進学後に証明書類）。第一種奨学金と併用すると貸与額が0円になる場合あり。家計基準は毎年10月に見直し。' },
    effort: 'mid',
    for: { stages: ['hs12', 'hs3', 'left0', 'left1', 'nohs'], paths: ['study', 'unsure'], care: [], careOnly: false, age: { min: 15, max: 30 }, areas: [] },
    deadline: { ja: '高3のとき（進学の前の年）に高校を通じて申し込みます。締切は学校ごとに違うので、先生に早めに聞きましょう。進学後も学校で春と秋に申し込めます。', en: 'Apply through your high school in your final year. Deadlines differ by school. You can also apply after entering college (spring/fall).', leaveMonths: -10, months: null, always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.jasso.go.jp/shogakukin/moshikomi/yoyaku/houhou.html', hours: null },
    locations: [],
    source: src('日本学生支援機構（JASSO）給付奨学金案内（2027年度予約採用）', JASSO_GUIDE_PDF),
    sources2: [{ org: '日本学生支援機構（JASSO）', url: 'https://www.jasso.go.jp/shogakukin/moshikomi/yoyaku/houhou.html' }],
    verifiedBy: BY
  },

  {
    id: 'jasso-genmen',
    name: { ja: '授業料・入学金の減免（高等教育の修学支援新制度）', en: 'Tuition and Entrance Fee Reduction' },
    hook: { ja: '学費が高くて進学をあきらめそう', en: 'Tuition is too expensive' },
    summary: {
      ja: '給付奨学金と一緒に申し込むと、大学や専門学校の授業料と入学金が安くなったり、0円になったりします。',
      en: 'Apply together with the JASSO grant to have college tuition and entrance fees reduced or waived.'
    },
    cat: ['education', 'money'],
    kind: 'grant', basis: 'national', right: false,
    amount: {
      ja: '私立大学なら 授業料 年70万円・入学金26万円まで／国公立大学なら 年54万円・28万円まで',
      en: 'Private university: up to ¥700,000/yr tuition + ¥260,000 entrance fee / public: ¥540,000 + ¥280,000'
    },
    repay: 'none',
    who: { ja: '給付奨学金の対象になった人（国や自治体が認めた大学・短大・専門学校・高専に通う人）。' },
    how: { ja: '高校で給付奨学金を申し込むときに、同時に申し込みます。進学後、進学先の学校で減免の手続きをします。' },
    where: { ja: '今の高校 → 進学先の学校' },
    docs: ['給付奨学金の書類と同じ', '進学後に学校が指定する申請書'],
    ask: ['入学金を入学前に払わないといけませんか？待ってもらえる制度はありますか？', '減免の申請は、入学後いつまでですか？'],
    caution: { ja: '減免は入学したあとに行われます。入学前に入学金などを一度払う必要がある学校もあります。入学後に入学金の減免を申し込むときは、入学から3か月以内に学校で手続きを。' },
    supporter: { ja: '上限額（年額）：大学 国公立 入学金28万・授業料54万／私立 26万・70万、短大 国公立17万・39万／私立25万・62万、専門学校 国公立7万・17万／私立16万・59万。入学金の納付猶予制度がある学校もあるので出願前に確認。' },
    effort: 'mid',
    for: { stages: ['hs12', 'hs3', 'left0', 'left1', 'nohs'], paths: ['study', 'unsure'], care: [], careOnly: false, age: { min: 15, max: 30 }, areas: [] },
    deadline: { ja: '給付奨学金と同じ（高3のとき、学校の締切まで）。', en: 'Same as the JASSO grant (in your last year of high school).', leaveMonths: -10, months: null, always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.jasso.go.jp/shogakukin/moshikomi/yoyaku/houhou.html', hours: null },
    locations: [],
    source: src('日本学生支援機構（JASSO）給付奨学金案内（2027年度予約採用）', JASSO_GUIDE_PDF),
    verifiedBy: BY
  },

  {
    id: 'jasso-juken',
    name: { ja: '児童養護施設等の生徒への受験料等支援（JASSO）', en: 'Exam Fee Support for Students in Care' },
    hook: { ja: '受験料が高くて、何校も受けられない', en: 'Exam fees are too high to apply to several schools' },
    summary: {
      ja: '施設や里親家庭にいる人が大学などを受けるとき、受験のためのお金として20万円が受け取れます。返す必要はありません。',
      en: 'Students in care get ¥200,000 for college entrance exam costs. No repayment.'
    },
    cat: ['education', 'money'],
    kind: 'grant', basis: 'national', right: false,
    amount: { ja: '1人20万円', en: '¥200,000 per person' },
    repay: 'none',
    who: { ja: '施設・自立援助ホーム・里親・ファミリーホームに今いる人で、高校を卒業する予定（または卒業して2年以内）か高卒認定に合格した人。大学・短大・専門学校などを受験し、就職の内定がないこと。' },
    how: { ja: '今いる施設や里親を通して申し込みます。職員や里親に「受験料等支援を使いたい」と伝えましょう。' },
    where: { ja: '今いる施設・里親（申込先はJASSO）' },
    docs: ['申請書・支援対象者一覧（施設などが作ります）', '受験票のコピー（受験後に施設へ）'],
    ask: ['受験料等支援に申し込んでもらえますか？', 'お金はいつごろ受け取れますか？'],
    caution: { ja: '受験を全部やめた場合は、お金を返すことになります。' },
    supporter: { ja: '寄附金事業。令和8年度は2026年7月1日〜2027年2月26日（消印有効）に施設長・養育者が申請。受付期間内なら受験後でも申請可。職業能力開発校は対象外。外国籍の生徒は在留資格の要件あり。' },
    effort: 'low',
    for: { stages: ['hs3', 'left0'], paths: ['study'], care: ['facility', 'foster', 'jhome'], careOnly: true, age: { min: 15, max: null }, areas: [] },
    deadline: { ja: '2026年7月1日〜2027年2月26日（施設などが申し込みます。受験のあとでも期間内ならOK）', en: 'Jul 1, 2026 – Feb 26, 2027 (your facility applies; OK even after the exam).', leaveMonths: -8, months: [7, 8, 9, 10, 11, 12, 1, 2], always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.jasso.go.jp/kihukin/j_shien/index.html', hours: null },
    locations: [],
    source: src('日本学生支援機構（JASSO）', 'https://www.jasso.go.jp/kihukin/j_shien/index.html'),
    verifiedBy: BY
  },

  {
    id: 'koko-shugaku',
    name: { ja: '高等学校等就学支援金（高校の授業料）', en: 'High School Tuition Support' },
    hook: { ja: '高校の授業料が払えるか不安', jr: '高校の授業料（学校にはらうお金）が心配', en: 'I worry about paying high school tuition' },
    summary: {
      ja: '高校の授業料を国が支援します。2026年度から、家の収入に関係なく使えるようになりました。返す必要はありません。',
      jr: '高校の授業料は、国が出してくれます。2026年度から、家の収入に関係なく使えます。返さなくていいお金です。',
      en: 'The government pays high school tuition. From 2026 there is no income limit. No repayment.'
    },
    cat: ['education', 'money'],
    kind: 'grant', basis: 'national', right: true,
    amount: { ja: '公立高校 年11万8,800円／私立高校（全日制）年45万7,200円まで', en: 'Public: ¥118,800/yr / Private (full-time): up to ¥457,200/yr' },
    repay: 'none',
    who: { ja: '日本に住んでいて、高校（全日制・定時制・通信制）・高専（1〜3年）・専修学校高等課程などに通う人。日本国籍でない人は、在留資格などの条件があります。' },
    how: { ja: '学校の案内にそってオンラインで申請します（都立高校は東京都のシステム、私立高校などはe-Shien）。' },
    where: { ja: '通っている高校' },
    docs: ['学校から配られるログインの通知書（都立は「システム利用開始情報通知書」）'],
    ask: ['自分の就学支援金は申請されていますか？', '退所して住所が変わったら、何か手続きがいりますか？'],
    caution: { ja: '申請しないと支援されません。決まるまでの間、いったん授業料を払って、あとで戻ってくる学校もあります。この制度の対象にならない人にも、別の授業料の支援（高校生等・新修学支援金など）があります。中3のうちに知っておくと、高校選びで安心です。' },
    supporter: { ja: '令和8年度から所得制限撤廃（改正法 令和8年3月31日成立・4月1日施行）。支給上限年額の例：公立全日制11万8,800円、私立全日制45万7,200円、私立通信制33万7,200円。新制度の対象外（在留資格等）でも、年収約910万円未満なら「高校生等・新修学支援金」で年39万6,000円まで支援。高校中退後に再入学・通信制へ移る場合も対象になりうるので学校に確認。授業料以外は「高校生等奨学給付金」を別途申請。' },
    effort: 'low',
    for: { stages: ['jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: { ja: '入学したときに申請します（2026年度は在校生もふくめ全員）。その後も学校から案内があれば手続きします。', en: 'Apply when you start school (in FY2026, every student, including current ones). After that, follow any instructions your school sends.', leaveMonths: null, months: null, always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.mext.go.jp/a_menu/shotou/mushouka/index.htm', hours: null },
    locations: [],
    source: src3('文部科学省', 'https://www.mext.go.jp/a_menu/shotou/mushouka/index.htm'),
    sources2: [{ org: '文部科学省（新制度リーフレット・日本国籍の方用）', url: 'https://www.mext.go.jp/content/20260616-mxt_shuukyo03-100002595_2.pdf' }, { org: '文部科学省（新制度の対象外となる生徒への支援）', url: 'https://www.mext.go.jp/content/20260616-mxt_shuukyo03-100002595_5.pdf' }, { org: '東京都教育委員会（都立高校の各種支援制度のオンライン申請）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/starting_application_online' }],
    verifiedBy: BY
  },

  {
    id: 'koko-kyufukin',
    name: { ja: '高校生等奨学給付金（教科書代など）', en: 'High School Scholarship Benefit' },
    hook: { ja: '教科書や教材、制服のお金が足りない', jr: '高校の教科書や教材のお金が心配', en: 'I cannot afford textbooks and supplies' },
    summary: {
      ja: '授業料以外の教科書代・教材費などを支援する、返さなくていいお金です。2026年度から対象の世帯が広がりました。',
      jr: '高校の教科書代などに使える、返さなくていいお金です。家の収入によって、もらえるかどうかが決まります。',
      en: 'Money for textbooks and other school costs besides tuition. No repayment. More households qualify from 2026.'
    },
    cat: ['education', 'money'],
    kind: 'grant', basis: 'national', right: false,
    amount: { ja: '年14万3,700円（国公立）／15万2,000円（私立）：全日制で、住民税が非課税の世帯の場合（2026年度）', en: '¥143,700/yr (public) / ¥152,000/yr (private): full-time, tax-exempt household (FY2026)' },
    repay: 'none',
    who: { ja: '高校などに通う人のうち、生活保護の世帯や住民税が非課税の世帯など（2026年度から年収の目安490万円未満まで広がりました）。' },
    how: { ja: '住んでいる都道府県か、通っている学校に申し込みます。授業料の就学支援金とは別に申込みが必要です。' },
    where: { ja: '通っている高校・都道府県の担当' },
    docs: ['都道府県・学校が配る申請書'],
    ask: ['奨学給付金の申込みはいつまでですか？', '自分の世帯は対象になりますか？'],
    caution: { ja: '都道府県によってやり方が違います。新入生は4〜6月に一部を早くもらえる申請ができます。' },
    supporter: { ja: '国の補助による都道府県事業。令和8年度給付額（全日制等・年額）：非課税世帯 国公立14万3,700円・私立15万2,000円／年収270〜380万円 国公立4万7,900円・私立5万670円／年収380〜490万円 国公立3万5,930円・私立3万8,000円。生活保護世帯 国公立3万2,300円・私立5万2,600円。国籍・在留資格で対象世帯の範囲が異なる。家計急変も対象（7月1日までの申請で年額）。施設入所中・退所後で世帯の扱いが変わるため、学校と都道府県に確認を。' },
    effort: 'mid',
    for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: { ja: '学校や都道府県が決めた時期に申し込みます。新入生は4〜6月に早めの申請ができます。', en: 'Apply when your school or prefecture says; new students can apply early in Apr–Jun.', leaveMonths: null, months: [4, 5, 6], always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.mext.go.jp/a_menu/shotou/mushouka/index.htm', hours: null },
    locations: [],
    source: src3('文部科学省（高校生等奨学給付金リーフレット）', 'https://www.mext.go.jp/content/20260616-mxt_shuukyo03-100002595_18.pdf'),
    sources2: [{ org: '文部科学省', url: 'https://www.mext.go.jp/a_menu/shotou/mushouka/index.htm' }],
    verifiedBy: BY
  },

  {
    id: 'yume-shogaku',
    name: { ja: '日本財団 夢の奨学金', en: 'Nippon Foundation Dream Scholarship' },
    hook: { ja: '学費だけでなく、生活費や住まいも心配', en: 'I need help with living costs, not just tuition' },
    summary: {
      ja: '社会的養護を経験した18〜30歳の人のための、返さなくていい奨学金です。学費の全額と生活費、ソーシャルワーカーの伴走があります。',
      en: 'A no-repay scholarship for care-experienced people aged 18–30: full tuition, living costs, and a social worker by your side.'
    },
    cat: ['education', 'money'],
    kind: 'grant', basis: 'npo', right: false,
    amount: {
      ja: '入学金・授業料の全額＋生活費・住居費 月10万円（修学支援新制度の対象の人は月3万円）＋転居費30万円・教材費 年12万円',
      en: 'Full tuition + ¥100,000/month living costs (¥30,000 if you get the national grant) + ¥300,000 moving + ¥120,000/yr books'
    },
    repay: 'none',
    who: { ja: '日本で社会的養護（施設・里親家庭など）を経験した18〜30歳の人（4月1日時点）。大学・短大・専門学校・高専（4年生から）・大学院に通う人、通う予定の人。' },
    how: { ja: '毎年6月ごろ、オンライン（Googleフォーム）で申し込みます。申請書は本人の手書き。書類と面接で選ばれます。' },
    where: { ja: '日本財団 夢の奨学金 事務局' },
    docs: ['申請書（本人が手書き、PDFで提出）'],
    ask: ['次の募集はいつからですか？', 'JASSOの給付奨学金と一緒に使えますか？', 'すでに大学に通っていても応募できますか？'],
    caution: { ja: '採用は毎年20名前後で、選考があります。2027年度分の募集（2026年6月）は終わりました。次の募集に向けて早めに準備を。' },
    supporter: { ja: '修学支援新制度の対象者は、授業料等は制度支給額を除いた額、生活費住居費は月3万円。支援期間は正規の最短修業年限（在学中の応募は支給開始以降のみ）。毎年継続審査あり。事務局：社会福祉法人大阪児童福祉事業協会アフターケア事業部。' },
    effort: 'high',
    for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: ['study'], care: ['facility', 'foster', 'jhome', 'other'], careOnly: true, age: { min: 17, max: 30 }, areas: [] },
    deadline: { ja: '毎年6月ごろに募集（2027年度分は2026年6月1日〜30日・終了）。', en: 'Applications open around June each year (the 2027 round closed Jun 30, 2026).', leaveMonths: -10, months: [6], always: false },
    contact: { phone: '06-6765-3400', phoneLabel: '夢の奨学金 事務局', line: null, chat: null, web: 'https://dreamscholarship.jp/guideline/index.html', hours: null },
    locations: [],
    source: src('日本財団 夢の奨学金', 'https://dreamscholarship.jp/guideline/index.html'),
    verifiedBy: BY
  },

  /* ================= お金・住まい ================= */

  {
    id: 'jukyo-kakuho',
    name: { ja: '住居確保給付金', en: 'Housing Security Benefit' },
    hook: { ja: '仕事がなくなって、家賃が払えない', en: 'I lost my job and cannot pay rent' },
    summary: {
      ja: '仕事をやめたり収入が減って家賃が払えないとき、家賃の分を役所が大家さんに直接払ってくれます。返す必要はありません。',
      en: 'If you lost your job or income and cannot pay rent, the city pays your rent directly to the landlord. No repayment.'
    },
    cat: ['housing', 'money'],
    kind: 'grant', basis: 'national', right: true,
    amount: { ja: '家賃の額（上限あり。東京23区のひとり暮らしは月53,700円まで）', en: 'Your rent (capped; ¥53,700/month for one person in Tokyo 23 wards)' },
    repay: 'none',
    who: { ja: '仕事をやめて2年以内の人、または自分のせいではない理由で収入が大きく減った人で、収入と貯金が基準より少ない人。' },
    how: { ja: '住んでいる区市町村の「自立相談支援機関」に相談して申し込みます。ハローワークに登録して仕事をさがすことが条件です。' },
    where: { ja: '区市町村の自立相談支援機関（くらしの相談窓口）' },
    docs: ['本人確認書類', '仕事をやめた・収入が減ったことがわかる書類', '家の契約書', '通帳など貯金がわかるもの'],
    ask: ['私の収入と貯金で対象になりますか？', '申請してから、いつ家賃が払われますか？', '家賃の安い部屋に引っ越す費用の補助も使えますか？'],
    caution: { ja: '家賃をためる前に相談するのがいちばん大事です。支給は原則3か月（延長して最長9か月）。' },
    supporter: { ja: '収入要件：世帯収入が基準額（住民税均等割非課税額の1/12）＋家賃（住宅扶助額が上限）以下。資産：基準額の6倍（100万円上限）以下。支給は貸主へ直接振込。家計改善のための転居費用補助もある。' },
    effort: 'mid',
    for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 18, max: 99 }, areas: [] },
    deadline: { ja: 'いつでも。家賃が払えなくなりそうなら、すぐ相談を。', en: 'Any time — ask as soon as rent becomes hard.', leaveMonths: null, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://minna-tunagaru.jp/ichiran/', hours: null },
    locations: [],
    source: src('厚生労働省（住居確保給付金のご案内）', 'https://www.mhlw.go.jp/content/12600000/001436774.pdf'),
    sources2: [{ org: '厚生労働省 生活支援特設サイト', url: 'https://corona-support.mhlw.go.jp/jukyokakuhokyufukin/index.html' }],
    verifiedBy: BY
  },

  {
    id: 'jiritsu-sodan',
    name: { ja: '自立相談支援機関（くらしの困りごと相談）', en: 'Life Support Counseling Center' },
    hook: { ja: 'お金も仕事も住まいも、何から手をつければいいかわからない', en: 'Money, work, housing — I do not know where to start' },
    summary: {
      ja: '生活の困りごとをまとめて聞いて、あなた用の支援プランを一緒に作ってくれる無料の窓口です。家計の立て直しや仕事の準備も手伝います。',
      en: 'A free local office that listens to all your problems and makes a support plan with you, including budgeting and job preparation.'
    },
    cat: ['consult', 'money', 'housing'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '生活に困りごとや不安がある人なら誰でも。年齢は関係ありません。' },
    how: { ja: '住んでいる区市町村の窓口に電話するか、直接行きます。窓口の名前は地域で違います。' },
    where: { ja: '区市町村の自立相談支援機関（全国の一覧あり）' },
    docs: [],
    ask: ['初めてです。予約はいりますか？', '家賃が払えなくなりそうです。使える制度はありますか？', '家計を一緒に見てもらえますか？'],
    caution: { ja: '窓口の名前が「くらし・しごと相談センター」などバラバラです。全国の一覧から探しましょう。' },
    supporter: { ja: '生活困窮者自立支援法に基づく。住居確保給付金・就労準備支援・家計改善支援・就労訓練（中間的就労）などの入口。' },
    effort: 'low',
    for: { stages: ['left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: { ja: 'いつでも', en: 'Any time', leaveMonths: null, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://minna-tunagaru.jp/ichiran/', hours: null },
    locations: [],
    source: src('厚生労働省', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000059425.html'),
    verifiedBy: BY
  },

  {
    id: 'seikatsu-hogo',
    name: { ja: '生活保護', en: 'Public Assistance (Seikatsu Hogo)' },
    hook: { ja: '働いても、どうしても生活費が足りない', en: 'Even with work, I cannot cover basic living costs' },
    summary: {
      ja: '国が決めた最低限の生活費に足りない分が、毎月支給されます。家賃や医療費の支えもあります。申請は権利です。',
      en: 'You receive the gap between your income and the national minimum cost of living, plus rent and medical support. Applying is your right.'
    },
    cat: ['money', 'housing'],
    kind: 'grant', basis: 'national', right: true,
    amount: { ja: '国が決めた最低生活費から収入を引いた額（家賃は上限まで実費）', en: 'Minimum living cost minus your income (rent covered up to a cap)' },
    repay: 'none',
    who: { ja: '持っているお金や力を使っても、生活費が足りない人。18歳以上でひとり暮らしの人も申請できます。' },
    how: { ja: '住んでいる地域の福祉事務所（区役所・市役所の生活保護の担当）に行き、「生活保護を申請したい」とはっきり伝えます。' },
    where: { ja: '住んでいる地域の福祉事務所' },
    docs: ['申請書（窓口にあります）', '通帳のコピー', '給与明細など収入がわかるもの', '家の契約書'],
    ask: ['生活保護を申請します。申請書をください。', '施設にいたこと、家族に頼れない事情も聞いてください。', '決まるまで何日くらいかかりますか？'],
    caution: { ja: '窓口で「若いから働けるでしょう」と言われても、申請はできます。不安なら、支援団体や拠点の人に一緒に行ってもらいましょう。' },
    supporter: { ja: '申請書がなくても特別な事情があれば申請可（厚労省ページ）。申請後、資産・扶養義務者による扶養の可否などの調査がある。虐待等の事情は最初に申告し、扶養照会について相談する。同行支援が最も効果的。' },
    effort: 'high',
    for: { stages: ['left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 18, max: 99 }, areas: [] },
    deadline: { ja: 'いつでも。困ったその日に申請できます。', en: 'Any time — you can apply the day you need it.', leaveMonths: null, months: null, always: true },
    contact: null,
    locations: [],
    source: src('厚生労働省', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/seikatsuhogo/seikatuhogo/index.html'),
    sources2: [{ org: '内閣府 あなたはひとりじゃない（「国の制度を使うことは全ての人にとっての権利」）', url: 'https://notalone-cao.go.jp/' }],
    verifiedBy: BY
  },

  {
    id: 'seikatsu-fukushi',
    name: { ja: '生活福祉資金（緊急小口資金など）', en: 'Livelihood Welfare Loans' },
    hook: { ja: '今週だけ、どうしてもお金が足りない', en: 'I am short of money right now' },
    summary: {
      ja: '急にお金が足りなくなったとき、利子なしで少しのお金を借りられる国の貸付です。家を借りる費用などの貸付もあります。',
      en: 'Small interest-free emergency loans from the national system, plus loans for moving into housing and more.'
    },
    cat: ['money'],
    kind: 'loan', basis: 'national', right: false,
    amount: { ja: '緊急小口資金 10万円以内（利子なし・保証人なし）など', en: 'Emergency loan up to ¥100,000 (no interest, no guarantor), and more' },
    repay: 'yes',
    who: { ja: '収入が少ない世帯などで、急な出費などで生活が苦しくなった人。' },
    how: { ja: '住んでいる区市町村の社会福祉協議会に相談して申し込みます。審査があります。' },
    where: { ja: '区市町村の社会福祉協議会' },
    docs: ['本人確認書類', '収入がわかるもの', '何に使うかがわかるもの'],
    ask: ['返すのはいつからで、毎月いくらですか？', '今の収入で借りられますか？', '借りる前に、もらえる制度はありませんか？'],
    caution: { ja: '借金なので、返す必要があります。返す計画を一緒に立ててもらいましょう。もらえる制度（給付）を先に確認するのがおすすめです。' },
    supporter: { ja: '緊急小口：据置2か月以内・償還12か月以内。総合支援資金（単身 月15万円以内・原則3か月）、住宅入居費40万円以内、教育支援費（大学 月6.5万円以内・世帯内の連帯借受人が必要）など。保証人なしの場合は年1.5%の資金あり。' },
    effort: 'mid',
    for: { stages: ['left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 18, max: 99 }, areas: [] },
    deadline: { ja: 'いつでも', en: 'Any time', leaveMonths: null, months: null, always: true },
    contact: null,
    locations: [],
    source: src('厚生労働省（生活福祉資金貸付条件等一覧）', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/seikatsuhogo/seikatsu-fukushi-shikin1/kashitsukejoken.html'),
    sources2: [{ org: '全国社会福祉協議会', url: 'https://www.shakyo.or.jp/guide/shikin/index.html' }],
    verifiedBy: BY
  },

  {
    id: 'ur-chintai',
    name: { ja: 'UR賃貸住宅（保証人・礼金・仲介手数料なし）', en: 'UR Public Rental Housing' },
    hook: { ja: '保証人なしで、初めの費用をおさえて部屋を借りたい', en: 'I want to rent without a guarantor and with low move-in costs' },
    summary: {
      ja: '国の機関（UR都市機構）の賃貸住宅です。保証人・保証料・礼金・仲介手数料・更新料がいりません。',
      en: 'Rental homes run by a public agency. No guarantor, no guarantee fee, no key money, no agent fee, no renewal fee.'
    },
    cat: ['housing'],
    kind: 'housing', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '収入が基準以上ある人（ひとり暮らしで家賃6万2,500円未満なら、月収が家賃の4倍以上）。貯金が家賃の100倍以上ある人や、家賃を前払いする人も申し込めます。' },
    how: { ja: 'URの営業センターやサイトで部屋を探して申し込みます。' },
    where: { ja: 'UR賃貸住宅の営業センター' },
    docs: ['本人確認書類', '収入を証明する書類'],
    ask: ['私の収入で申し込める家賃はいくらまでですか？', '収入が足りないとき、ほかの申込み方法はありますか？'],
    caution: { ja: '収入の基準に届かないと申し込めないことがあります。家賃の前払い（一時払い）や貯金での申込みもあるので聞いてみましょう。' },
    supporter: { ja: '単身の基準月収：家賃62,500円未満は家賃の4倍、62,500円以上20万円未満は25万円。貯蓄基準は月額家賃の100倍。本人収入が基準の1/2以上あれば親族等の家賃補給で可などの特例あり。自立支援資金の家賃支援費と組み合わせを検討。' },
    effort: 'mid',
    for: { stages: ['hs3', 'left0', 'left1'], paths: ['work'], care: [], careOnly: false, age: { min: 18, max: 99 }, areas: [] },
    deadline: { ja: 'いつでも', en: 'Any time', leaveMonths: -3, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.ur-net.go.jp/chintai/rent/requirements/', hours: null },
    locations: [],
    source: src('UR都市機構（お申込み資格）', 'https://www.ur-net.go.jp/chintai/rent/requirements/'),
    sources2: [{ org: 'UR都市機構', url: 'https://www.ur-net.go.jp/chintai/whats/' }],
    verifiedBy: BY
  },

  /* ================= 仕事 ================= */

  {
    id: 'hellowork-wakamono',
    name: { ja: 'ハローワーク・わかものハローワーク', en: 'Hello Work & Youth Hello Work' },
    hook: { ja: '仕事をさがしたい・正社員になりたい', en: 'I want to find a job or become a full-time employee' },
    summary: {
      ja: '国の無料の仕事さがし窓口です。わかものハローワークでは、担当の人がついて、応募書類や面接の練習も手伝ってくれます。',
      en: 'Free national job centers. Youth Hello Work gives you a personal advisor and helps with résumés and interview practice.'
    },
    cat: ['work'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: 'ハローワークは誰でも使えます。わかものハローワークは、正社員をめざす若い人向け（東京は34歳以下）。' },
    how: { ja: '近くのハローワークに行って、求職の申込みをします。最初は相談だけでも大丈夫です。' },
    where: { ja: 'ハローワーク／わかものハローワーク（東京は渋谷・新宿・日暮里）' },
    docs: ['本人確認書類（求職の申込みをするとき）'],
    ask: ['担当の人をつけてもらえますか？', '寮や社宅がある求人はありますか？辞めたら寮はいつまでに出ますか？', 'お金をもらいながら職業訓練を受ける方法はありますか？'],
    caution: { ja: '寮つきの仕事は、辞めると住まいも失います。退職したあと何日で寮を出るのか、必ず確認しましょう。' },
    supporter: { ja: 'わかものハローワークは全国28か所（PDF時点）、おおむね45歳未満対象。東京の3か所は34歳以下。求職者支援制度・トライアル雇用などの入口。' },
    effort: 'low',
    for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 15, max: 34 }, areas: [] },
    deadline: { ja: 'いつでも', en: 'Any time', leaveMonths: -6, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/jakunen/wakamono/index.html', hours: null },
    locations: [
      { name: '渋谷わかものハローワーク', area: '13113', addr: '東京都渋谷区渋谷2-15-1 渋谷クロスタワー8階', lat: 35.659077, lng: 139.705292, phone: '03-3409-0328', hours: '平日 10:00–18:00（土日祝は休み）', note: '正社員をめざす34歳以下。JR渋谷駅から徒歩5分。' },
      { name: '新宿わかものハローワーク', area: '13104', addr: '東京都新宿区西新宿1-7-1 松岡セントラルビル9階', lat: 35.691826, lng: 139.698029, phone: '03-5909-8609', hours: '平日 10:00–18:00（土日祝は休み）', note: '34歳以下。JR新宿駅西口から徒歩3分。午前中がすいています。' }
    ],
    source: src('厚生労働省', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/jakunen/wakamono/index.html'),
    sources2: [
      { org: '東京労働局 渋谷わかものハローワーク', url: 'https://jsite.mhlw.go.jp/tokyo-hellowork/kyushokusha/shibuya_wakaharo/index.html' },
      { org: '東京労働局 新宿わかものハローワーク', url: 'https://jsite.mhlw.go.jp/tokyo-hellowork/kyushokusha/shinjuku_wakaharo/index.html' }
    ],
    verifiedBy: BY
  },

  {
    id: 'saposute',
    name: { ja: '地域若者サポートステーション（サポステ）', en: 'Youth Support Station' },
    hook: { ja: '働くことに自信がない。何から始めればいい？', en: 'I am not confident about working. Where do I start?' },
    summary: {
      ja: '働きはじめる前の「準備」から一緒にやってくれる、国の委託の無料窓口です。仕事が決まったあとも、続けられるよう支えてくれます。',
      en: 'A free government-funded center that helps you prepare to work, and supports you after you start a job.'
    },
    cat: ['work', 'consult'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '15〜49歳で、今は働いていない・学校に行っていない人。' },
    how: { ja: '近くのサポステを検索して、電話かメールで予約します。' },
    where: { ja: '全国のサポステ' },
    docs: [],
    ask: ['まず見学や話を聞くだけでもいいですか？', '職場体験はできますか？'],
    caution: { ja: '求人の紹介は少なめです。ハローワークと一緒に使うのがおすすめです。' },
    supporter: { ja: '厚労省委託事業。職場定着までの支援がある。' },
    effort: 'low',
    for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 15, max: 49 }, areas: [] },
    deadline: { ja: 'いつでも', en: 'Any time', leaveMonths: null, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://saposute-net.mhlw.go.jp/about.html', hours: null },
    locations: [],
    source: src('厚生労働省（サポステ）', 'https://saposute-net.mhlw.go.jp/about.html'),
    verifiedBy: BY
  },

  {
    id: 'kyushokusha-shien',
    name: { ja: '求職者支援制度（お金をもらいながら職業訓練）', en: 'Job Seeker Support System' },
    hook: { ja: '資格やスキルを身につけて、いい仕事につきたい', en: 'I want skills for a better job' },
    summary: {
      ja: '無料の職業訓練を受けながら、条件を満たせば月10万円の給付金が受け取れます。ハローワークが仕事さがしもサポートします。',
      en: 'Free job training, plus ¥100,000/month if you qualify. Hello Work supports your job search.'
    },
    cat: ['work', 'money'],
    kind: 'grant', basis: 'national', right: true,
    amount: { ja: '月10万円（職業訓練受講給付金）＋訓練は無料', en: '¥100,000/month + free training' },
    repay: 'none',
    who: { ja: '雇用保険を受け取れない人（雇用保険に入っていなかった人など）や、収入が少ないパートの人など。給付金は本人の収入が月8万円以下などの条件があります。' },
    how: { ja: 'ハローワークで相談し、求職の申込みをして訓練を選びます。' },
    where: { ja: 'ハローワーク' },
    docs: ['本人確認書類', '収入がわかるもの'],
    ask: ['私は給付金の対象になりますか？', 'どんな訓練コースがありますか？', '家賃が払えないとき、ほかに使える制度はありますか？'],
    caution: { ja: '給付金の条件に合わなくても、訓練だけは無料で受けられます。訓練を休むと給付金が出ないことがあります。' },
    supporter: { ja: '給付金要件：本人収入月8万円以下、世帯収入月30万円以下、世帯金融資産300万円以下など。過去6年以内に受給していないこと。' },
    effort: 'mid',
    for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 16, max: 99 }, areas: [] },
    deadline: { ja: '訓練コースごとに募集期間があります。', en: 'Each course has its own application period.', leaveMonths: null, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyushokusha_shien/index.html', hours: null },
    locations: [],
    source: src('厚生労働省', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyushokusha_shien/index.html'),
    verifiedBy: BY
  },

  {
    id: 'koyo-hoken',
    name: { ja: '雇用保険の基本手当（失業手当）', en: 'Unemployment Benefit' },
    hook: { ja: '仕事をやめた。次が決まるまでの生活費が不安', en: 'I quit my job and need money until the next one' },
    summary: {
      ja: '雇用保険に入って働いていた人が仕事をやめたとき、次の仕事をさがす間の生活費として受け取れます。',
      en: 'If you had employment insurance and lost your job, you get money while you look for the next one.'
    },
    cat: ['work', 'money'],
    kind: 'grant', basis: 'national', right: true,
    amount: { ja: 'やめる前の6か月の給料をもとに、1日あたり約50〜80%', en: 'About 50–80% of your previous daily wage' },
    repay: 'none',
    who: { ja: 'やめる前の2年間に、雇用保険に入っていた期間が12か月以上ある人（会社の都合でやめた人などは1年間に6か月以上）。働く気持ちがあって、すぐ働ける人。' },
    how: { ja: 'ハローワークで求職の申込みをして、会社からもらう「離職票」を出します。' },
    where: { ja: '住んでいる地域のハローワーク' },
    docs: ['離職票（会社からもらう）', '本人確認書類', 'マイナンバーがわかるもの', '通帳'],
    ask: ['私は基本手当をもらえますか？', 'いつから、何日分もらえますか？', '会社が離職票をくれません。どうすればいいですか？'],
    caution: { ja: '受け取れる期間は、原則やめた日の次の日から1年です。早めに手続きしましょう。' },
    supporter: { ja: '所定給付日数は90〜360日（年齢・加入期間・離職理由で決定）。特定受給資格者・特定理由離職者は手厚い場合あり。' },
    effort: 'mid',
    for: { stages: ['left0', 'left1', 'nohs'], paths: ['work'], care: [], careOnly: false, age: { min: 16, max: 99 }, areas: [] },
    deadline: { ja: '仕事をやめたら、なるべく早く（受給できる期間は原則1年）。', en: 'As soon as you leave your job (you have about 1 year).', leaveMonths: null, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.hellowork.mhlw.go.jp/insurance/insurance_basicbenefit.html', hours: null },
    locations: [],
    source: src('厚生労働省 ハローワークインターネットサービス', 'https://www.hellowork.mhlw.go.jp/insurance/insurance_basicbenefit.html'),
    verifiedBy: BY
  },

  {
    id: 'rodo-hotline',
    name: { ja: '労働条件相談ほっとライン', en: 'Working Conditions Hotline' },
    hook: { ja: '残業代が出ない・辞めさせてもらえない', en: 'Unpaid overtime, or they will not let me quit' },
    summary: {
      ja: '職場の困りごとを、平日の夜や土日にも無料で電話相談できます。名前を言わなくても大丈夫です。',
      en: 'Free phone advice about workplace problems on weekday evenings and weekends. You can stay anonymous.'
    },
    cat: ['work', 'consult'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '働いている人なら誰でも（アルバイトも）。' },
    how: { ja: '0120-811-610 に電話します。' },
    where: { ja: '電話' },
    docs: ['あれば：給与明細、シフト表、雇用契約書'],
    ask: ['これは法律違反ですか？', '証拠として、何を残しておけばいいですか？'],
    caution: { ja: 'ここから会社に指導はできません。必要なら労働基準監督署などを紹介してくれます。' },
    supporter: { ja: '厚労省委託事業。日本語のほか13言語に対応。通話は録音される。' },
    effort: 'low',
    for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: ['work'], care: [], careOnly: false, age: { min: 15, max: null }, areas: [] },
    deadline: null,
    contact: { phone: '0120-811-610', phoneLabel: 'ほっとライン（無料）', line: null, chat: null, web: 'https://www.check-roudou.mhlw.go.jp/lp/hotline/', hours: { ja: '月〜金 17:00〜22:00／土日祝 9:00〜21:00（12/29〜1/3は休み）', en: 'Mon–Fri 17:00–22:00 / Sat, Sun, holidays 9:00–21:00' } },
    locations: [],
    source: src('厚生労働省', 'https://www.check-roudou.mhlw.go.jp/lp/hotline/'),
    verifiedBy: BY
  },

  /* ================= 手続き・契約・法律 ================= */

  {
    id: 'houterasu',
    name: { ja: '法テラス（日本司法支援センター）', en: 'Houterasu — Japan Legal Support Center' },
    hook: { ja: '借金・契約・トラブルで、法律の助けがほしい', en: 'I need legal help with debt, a contract or a dispute' },
    summary: {
      ja: '国がつくった法律の相談窓口です。収入が少なければ、弁護士や司法書士に無料で相談でき、費用の立て替えも頼めます。',
      en: 'A public legal help center. If your income is low, you can talk to a lawyer for free and get fees advanced.'
    },
    cat: ['procedures', 'consult'],
    kind: 'service', basis: 'national', right: false,
    amount: { ja: '無料相談 1回30分・同じ問題で3回まで（収入などの条件あり）', en: 'Free consultations: 30 min, up to 3 times per issue (income limits)' },
    repay: null,
    who: { ja: '法律のことで困っている人。無料相談は、収入と貯金が基準以下の人（例：東京23区のひとり暮らしは手取り月20万200円以下、貯金180万円以下）。' },
    how: { ja: 'まずサポートダイヤル（0570-078374）で、どこに相談すればいいか聞けます。無料相談は近くの法テラスに予約します。' },
    where: { ja: '電話・メール・全国の法テラス' },
    docs: ['トラブルの書類（契約書・請求書・LINEのスクショなど）'],
    ask: ['無料相談の条件に当てはまりますか？', '弁護士費用の立て替えは、どうやって返しますか？'],
    caution: { ja: '借金や契約は、時間がたつと解決しにくくなります。「とりあえず電話」で大丈夫です。' },
    supporter: { ja: '立替費用は分割返済（利息なし）。立替には審査あり。収入基準は本人＋配偶者で判断。IP電話からは別番号。' },
    effort: 'low',
    for: { stages: ['left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 18, max: 99 }, areas: [] },
    deadline: null,
    contact: { phone: '0570-078374', phoneLabel: '法テラス・サポートダイヤル', line: null, chat: null, web: 'https://www.houterasu.or.jp/site/soudan-tatekae/goriyounonagare.html', hours: { ja: '平日 9:00〜21:00／土曜 9:00〜17:00（メールは24時間）', en: 'Weekdays 9:00–21:00 / Sat 9:00–17:00' } },
    locations: [
      { name: '法テラス東京', area: '13104', addr: '東京都新宿区西新宿1-24-1 エステック情報ビル13階', lat: 35.690514, lng: 139.695648, phone: '0570-078301', hours: '平日 9:00–17:00（土日祝・年末年始は休み）', note: 'JR新宿駅西口から徒歩8分。IP電話は 050-3383-5300。' }
    ],
    source: src('法テラス（無料法律相談のご利用の流れ）', 'https://www.houterasu.or.jp/site/soudan-tatekae/goriyounonagare.html'),
    sources2: [{ org: '法テラス東京', url: 'https://www.houterasu.or.jp/site/chihoujimusho-tokyo/access.html' }],
    verifiedBy: BY
  },

  {
    id: 'shohisha-188',
    name: { ja: '消費者ホットライン 188', en: 'Consumer Hotline 188' },
    hook: { ja: '高い契約をさせられた・解約できない', jr: '高いお金をはらわされそう・やめたいのにやめられない', en: 'I was pushed into a costly contract and cannot cancel' },
    summary: {
      ja: '188（いやや）に電話すると、近くの消費生活センターにつながります。クーリング・オフや解約のしかたを教えてくれます。',
      en: 'Call 188 to reach your local consumer center. They explain cooling-off and how to cancel.'
    },
    cat: ['procedures', 'consult'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '誰でも。副業・投資・美容・ネット通販などで困っている人。' },
    how: { ja: '188 に電話して、郵便番号などを入れると近くの窓口につながります。' },
    where: { ja: '電話（近くの消費生活センター）' },
    docs: ['契約書・領収書・やりとりのスクショ'],
    ask: ['クーリング・オフできますか？（いつ、どこで契約したか伝える）', '業者に自分で連絡しないほうがいいですか？'],
    caution: { ja: '相談は無料ですが、通話料はかかります。18歳から成人なので、契約は取り消しにくくなります。サインする前に相談を。' },
    supporter: { ja: '若者の消費者トラブル（情報商材・マルチ・美容医療等）は初動が重要。' },
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '188', phoneLabel: '消費者ホットライン', line: null, chat: null, web: 'https://www.caa.go.jp/policies/policy/local_cooperation/local_consumer_administration/hotline/', hours: null },
    locations: [],
    source: src('消費者庁', 'https://www.caa.go.jp/policies/policy/local_cooperation/local_consumer_administration/hotline/'),
    verifiedBy: BY
  },

  {
    id: 'kokuho',
    name: { ja: '国民健康保険に入る（保険料の軽減も）', en: 'Joining National Health Insurance' },
    hook: { ja: '施設を出たら、病院のお金はどうなる？', en: 'How do I pay for the doctor after leaving care?' },
    summary: {
      ja: '会社の保険に入らない人は、住んでいる区市町村の国民健康保険に入ります。収入が少ないと保険料が安くなる仕組みがあります。',
      en: 'If you are not on a work health plan, join your city\'s National Health Insurance. Premiums are reduced for low income.'
    },
    cat: ['procedures'],
    kind: 'procedure', basis: 'national', right: true,
    amount: null, repay: null,
    who: { ja: '施設などを出て、会社の健康保険に入らない人（学生・アルバイトなど）。' },
    how: { ja: '引っ越し先の区役所・市役所で、転入届と一緒に手続きします。病院では「マイナ保険証」か「資格確認書」を見せます。' },
    where: { ja: '住んでいる区市町村の国民健康保険の窓口' },
    docs: ['本人確認書類', 'マイナンバーがわかるもの', '（会社をやめた人）保険をやめた日がわかる書類'],
    ask: ['収入が少ないです。保険料の軽減の対象になりますか？', '収入がなくても、税金の申告は必要ですか？', '払うのが難しいとき、分割や減免はできますか？'],
    caution: { ja: '施設を出たら、自分で保険に入る必要があります。手続きを忘れると、病院でいったん全額払うことになる場合もあります。引っ越しと同じ日に手続きしましょう。' },
    supporter: { ja: '所得が基準以下の世帯は均等割・平等割の7割・5割・2割軽減（所得の把握が前提）。災害等特別な事情で減免・納付猶予あり。非自発的失業者の軽減あり。マイナ保険証がない人には資格確認書が申請なしで交付される。' },
    effort: 'low',
    for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 15, max: null }, areas: [] },
    deadline: { ja: '施設を出た日・会社をやめた日から、すぐに。', en: 'Right after you leave care or a job.', leaveMonths: 0, months: null, always: false },
    contact: null,
    locations: [],
    source: src('厚生労働省', 'https://www.mhlw.go.jp/stf/newpage_21517.html'),
    sources2: [{ org: '厚生労働省（資格確認書）', url: 'https://www.mhlw.go.jp/stf/newpage_45470.html' }],
    verifiedBy: BY
  },

  {
    id: 'nenkin-gakusei',
    name: { ja: '国民年金の学生納付特例', en: 'Student Pension Payment Deferral' },
    hook: { ja: '20歳になった学生。年金を払うお金がない', en: 'I am a 20+ student and cannot pay the pension' },
    summary: {
      ja: '20歳以上の学生は、申請すれば在学中の年金保険料をあとで払えます。「未納」にならず、けがや病気のときの障害年金も守られます。',
      en: 'Students 20+ can defer pension payments while in school. You avoid "unpaid" status and keep disability pension rights.'
    },
    cat: ['procedures', 'money'],
    kind: 'procedure', basis: 'national', right: true,
    amount: { ja: '月17,920円（2026年度）の保険料を、在学中は払わなくてよい', en: 'Defer the ¥17,920/month premium (FY2026) while in school' },
    repay: null,
    who: { ja: '20歳以上の学生（大学・短大・専門学校など、夜間・通信も）で、本人の前の年の所得が基準以下の人（128万円＋扶養の人数×38万円など）。' },
    how: { ja: '区役所・市役所の国民年金の窓口、年金事務所、または通っている学校に申請します。マイナポータルからも申請できます。' },
    where: { ja: '区市町村の国民年金窓口・年金事務所・学校' },
    docs: ['在学証明書か学生証のコピー', 'マイナンバーカード（ない人はマイナンバーがわかるものと本人確認書類）'],
    ask: ['学生納付特例を申請したいです', 'さかのぼって申請できますか？'],
    caution: { ja: '何もしないと「未納」になります。20歳の誕生月に届く書類は捨てないで。毎年度の申請が必要です。' },
    supporter: { ja: '承認期間は10年以内なら追納可。過去分は申請月の2年1か月前まで遡及可。税の申告をしていないと審査できないので住民税の申告が必要な場合あり。' },
    effort: 'low',
    for: { stages: ['left0', 'left1'], paths: ['study'], care: [], careOnly: false, age: { min: 20, max: 99 }, areas: [] },
    deadline: { ja: '20歳になったら、毎年4月以降に（年度ごと）。', en: 'From age 20, each school year (from April).', leaveMonths: null, months: [4], always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.nenkin.go.jp/service/kokunen/menjo/20150514.html', hours: null },
    locations: [],
    source: src('日本年金機構', 'https://www.nenkin.go.jp/service/kokunen/menjo/20150514.html'),
    sources2: [{ org: '日本年金機構（国民年金保険料）', url: 'https://www.nenkin.go.jp/service/kokunen/hokenryo/hokenryo.html' }],
    verifiedBy: BY
  },

  {
    id: 'nenkin-menjo',
    name: { ja: '国民年金保険料の免除・納付猶予', en: 'Pension Premium Exemption' },
    hook: { ja: '収入が少なくて、年金の保険料が払えない', en: 'My income is too low to pay the pension premium' },
    summary: {
      ja: '収入が少ないときや仕事を失ったときは、申請すると年金の保険料が全部または一部免除になります。未納のままより、将来もらえる年金が守られます。',
      en: 'With low income or after losing a job, you can be fully or partly exempt from pension premiums — far better than leaving them unpaid.'
    },
    cat: ['procedures', 'money'],
    kind: 'procedure', basis: 'national', right: true,
    amount: { ja: '月17,920円（2026年度）の保険料が、全額・4分の3・半額・4分の1免除', en: 'Full, 3/4, 1/2 or 1/4 exemption of the ¥17,920/month premium (FY2026)' },
    repay: null,
    who: { ja: '20歳以上で、前の年の所得が基準以下の人や、仕事を失った人（学生は「学生納付特例」）。' },
    how: { ja: '区役所・市役所の国民年金の窓口か年金事務所で申請します。マイナポータルからも申請できます。' },
    where: { ja: '区市町村の国民年金窓口・年金事務所' },
    docs: ['マイナンバーカード（ない人はマイナンバーがわかるものと本人確認書類）', '（仕事を失った人）離職票など'],
    ask: ['全額免除になりますか？', '免除と納付猶予の違いは何ですか？', 'さかのぼって申請できますか？'],
    caution: { ja: '何もしないと「未納」になり、けがや病気のときに障害年金を受け取れないことがあります。' },
    supporter: { ja: '全額免除期間は年金額の1/2を反映（未納は0）。納付猶予は50歳未満。失業による特例免除あり。10年以内なら追納可。過去分は2年1か月前まで。' },
    effort: 'low',
    for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 20, max: 99 }, areas: [] },
    deadline: { ja: '払えないとわかったら、すぐに（毎年度の申請が基本）。', en: 'As soon as you cannot pay (usually every year).', leaveMonths: null, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.nenkin.go.jp/service/kokunen/menjo/20150428.html', hours: null },
    locations: [],
    source: src('日本年金機構', 'https://www.nenkin.go.jp/service/kokunen/menjo/20150428.html'),
    verifiedBy: BY
  },

  {
    id: 'hikkoshi-todoke',
    name: { ja: '住民票の転出届・転入届', en: 'Moving-Out / Moving-In Registration' },
    hook: { ja: '引っ越したら、役所で何をすればいい？', en: 'What do I do at city hall when I move?' },
    summary: {
      ja: '引っ越したら住民票を新しい住所に移します。マイナンバーカードがあれば、転出届はスマホから出せます。',
      en: 'When you move, transfer your resident record. With a My Number Card you can file the move-out online.'
    },
    cat: ['procedures'],
    kind: 'procedure', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '引っ越すすべての人。' },
    how: { ja: '前の区市町村に転出届（マイナポータルでもOK）→ 引っ越してから14日以内に、新しい区市町村の窓口で転入届。' },
    where: { ja: '前の役所 → 新しい役所（マイナポータル）' },
    docs: ['本人確認書類', 'マイナンバーカード（あれば）', '転出証明書（オンラインで出した人はいらない）'],
    ask: ['国民健康保険や年金の手続きも、今日一緒にできますか？', 'マイナンバーカードの住所変更もお願いします'],
    caution: { ja: '住民票が古い住所のままだと、大事な手紙や給付の案内が届きません。転入届は引っ越しから14日以内に。' },
    supporter: { ja: '転入届はオンライン不可（転出届と来庁予約のみオンライン）。郵便局の転居届（転送）も同時に。' },
    effort: 'low',
    for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: [], careOnly: false, age: { min: 15, max: null }, areas: [] },
    deadline: { ja: '引っ越してから14日以内に転入届。', en: 'File the move-in within 14 days of moving.', leaveMonths: 0, months: null, always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.digital.go.jp/policies/moving_onestop_service', hours: null },
    locations: [],
    source: src('デジタル庁', 'https://www.digital.go.jp/policies/moving_onestop_service'),
    sources2: [{ org: 'デジタル庁（よくある質問）', url: 'https://www.digital.go.jp/policies/moving_onestop_service/faq-01' }],
    verifiedBy: BY
  },

  {
    id: 'mynumber-card',
    name: { ja: 'マイナンバーカード', en: 'My Number Card' },
    hook: { ja: '顔写真つきの身分証がない', en: 'I do not have a photo ID' },
    summary: {
      ja: '無料で作れる、顔写真つきの身分証です。部屋や仕事、銀行の手続きで使えて、保険証にもなります。',
      en: 'A free photo ID. Use it for renting, jobs and banks, and as your health insurance card.'
    },
    cat: ['procedures'],
    kind: 'procedure', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '日本に住民票がある人なら誰でも。' },
    how: { ja: 'オンラインなどで申請し、約1か月後に区役所・市役所で受け取ります。受け取りは原則本人が行きます。' },
    where: { ja: '申請：オンライン・郵送など／受け取り：区市町村の窓口' },
    docs: ['交付通知書（はがき）', '本人確認書類', '通知カード（持っている人）'],
    ask: ['写真つきの身分証がありません。受け取りに何を持っていけばいいですか？', '保険証として使う登録もここでできますか？'],
    caution: { ja: '18歳以上はカードの有効期限が10回目の誕生日まで、電子証明書は5回目の誕生日までです。暗証番号はメモして安全な場所に。' },
    supporter: { ja: '交付手数料は当面無料（再発行は原則有料）。施設を出る前に作っておくと、口座開設・賃貸契約・就職手続きが楽になる。' },
    effort: 'mid',
    for: { stages: ['hs12', 'hs3', 'left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: { ja: '施設を出る2〜3か月前までに申請しておくと安心。', en: 'Apply 2–3 months before you leave care.', leaveMonths: -3, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.digital.go.jp/policies/mynumber_faq_03', hours: null },
    locations: [],
    source: src('デジタル庁（よくある質問：マイナンバーカード）', 'https://www.digital.go.jp/policies/mynumber_faq_03'),
    verifiedBy: BY
  },

  /* ================= 相談・こころ・安全 ================= */

  {
    id: 'yorisoi',
    name: { ja: 'よりそいホットライン', en: 'Yorisoi Hotline' },
    hook: { ja: 'どこに相談したらいいかわからない', en: 'I do not know who to talk to' },
    summary: {
      ja: '24時間、無料で、どんな悩みでも話せる電話です。外国語や、DV・性暴力、性のことなど専門の相談も選べます。',
      en: 'A free 24-hour line for any worry. Special lines for other languages, DV and sexual violence, and LGBTQ+ concerns.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'npo', right: false,
    amount: null, repay: null,
    who: { ja: '誰でも。眠れない、つらい、お金がない、どこに行けばいいかわからないとき。' },
    how: { ja: '0120-279-338 に電話します。ガイダンスで専門の相談も選べます。' },
    where: { ja: '電話（チャット・SNSの案内も公式サイトに）' },
    docs: [],
    ask: ['話がまとまっていなくても大丈夫ですか？（大丈夫です）'],
    caution: { ja: 'つながりにくいときは、時間をおいてかけ直してください。050で始まるIP電話からは 050-3655-0279。' },
    supporter: { ja: '福島県からは 0120-279-226。電話が苦手な本人には、あなたのいばしょ等のチャット窓口も案内。' },
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '0120-279-338', phoneLabel: 'よりそいホットライン（無料）', line: null, chat: null, web: 'https://www.since2011.net/yorisoi/', hours: { ja: '24時間', en: '24 hours' } },
    locations: [],
    source: src('一般社団法人 社会的包摂サポートセンター', 'https://www.since2011.net/yorisoi/'),
    sources2: [{ org: '厚生労働省「まもろうよ こころ」', url: MAMORO }],
    verifiedBy: BY
  },

  {
    id: 'inochi-sos',
    name: { ja: '#いのちSOS', en: '#Inochi SOS' },
    hook: { ja: '死にたい・消えたい気持ちがある', en: 'I feel like I want to die or disappear' },
    summary: {
      ja: '「死にたい」「生きることに疲れた」気持ちを、専門の相談員が受け止めます。毎日24時間、無料でつながります。',
      en: 'Trained counselors listen when you feel you want to die. Free, every day, 24 hours.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'npo', right: false,
    amount: null, repay: null,
    who: { ja: '誰でも。' },
    how: { ja: '0120-061-338 に電話します。' },
    where: { ja: '電話' },
    docs: [],
    ask: ['今の気持ちを聞いてほしいです'],
    caution: { ja: '今すぐ危ないときは 119 か 110 へ。' },
    supporter: null,
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '0120-061-338', phoneLabel: '#いのちSOS（無料）', line: null, chat: null, web: MAMORO, hours: { ja: '毎日24時間', en: '24 hours, every day' } },
    locations: [],
    source: src('厚生労働省「まもろうよ こころ」', MAMORO),
    verifiedBy: BY
  },

  {
    id: 'anata-no-ibasho',
    name: { ja: 'あなたのいばしょ（チャット相談）', en: 'Anata no Ibasho (chat support)' },
    hook: { ja: '電話はこわい。文字なら話せるかも', en: 'Calling is scary, but I could type' },
    summary: {
      ja: '24時間365日、誰でも無料・匿名で使えるチャット相談です。名前を言わなくて大丈夫です。',
      en: 'Free, anonymous chat counseling for anyone, 24/7.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'npo', right: false,
    amount: null, repay: null,
    who: { ja: '年齢や性別に関係なく、誰でも。' },
    how: { ja: '公式サイトからチャットを始めます。' },
    where: { ja: 'インターネット（チャット）' },
    docs: [],
    ask: ['うまく言えないけど、聞いてほしいです'],
    caution: { ja: '混んでいると、つながるまで時間がかかることがあります。' },
    supporter: { ja: 'NPO法人あなたのいばしょが運営。厚労省「まもろうよ こころ」にSNS・チャット相談として掲載。' },
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: null, phoneLabel: null, line: null, chat: 'https://talkme.jp/', web: 'https://talkme.jp/', hours: { ja: '24時間365日', en: '24/7' } },
    locations: [],
    source: src('厚生労働省「まもろうよ こころ」（あなたのいばしょを掲載）', MAMORO),
    sources2: [{ org: 'NPO法人あなたのいばしょ', url: 'https://talkme.jp/' }],
    verifiedBy: BY
  },

  {
    id: 'kodomo-sos',
    name: { ja: '24時間子供SOSダイヤル', en: '24-hour Child SOS Dial' },
    hook: { ja: 'いじめや学校・家のことで、すぐ話したい', jr: 'いじめや友だち、学校のことを、今すぐ話したい', en: 'I need to talk about bullying, school or home now' },
    summary: {
      ja: '子どもや保護者が、夜や休みの日もふくめて24時間いつでも電話できる、無料の相談です（文部科学省）。',
      jr: 'いじめ、学校に行くこと、友だちのこと。夜でも休みの日でも、24時間電話できます。お金はかかりません。',
      en: 'A free 24-hour phone line for children and parents, nights and holidays included (Ministry of Education).'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '子ども（小学生・中学生・高校生など）と、その保護者。いじめのほか、どんなSOSでも。' },
    how: { ja: '0120-0-78310（なやみいおう）に電話します。' },
    where: { ja: '電話' },
    docs: [],
    ask: ['話を聞いてほしいです'],
    caution: { ja: 'つながらないときも、あきらめずにもう一度かけてください。050で始まるIP電話などからは、つながらないことがあります。今すぐ危ないときは 110 へ。' },
    supporter: { ja: '都道府県・指定都市の教育委員会などが運営する全国共通ダイヤル。夜間・休日も対応。' },
    effort: 'low',
    for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '0120-0-78310', phoneLabel: '24時間子供SOSダイヤル（無料）', line: null, chat: null, web: MEXT_SOS24, hours: { ja: '24時間', en: '24 hours' } },
    locations: [],
    source: src3('文部科学省「子供のSOSの相談窓口（24時間）」', MEXT_SOS24),
    sources2: [{ org: 'こども家庭庁（その他の相談窓口）', url: 'https://www.cfa.go.jp/policies/jidougyakutai/gyakutai-taiou-dial' }, { org: '厚生労働省「まもろうよ こころ」', url: MAMORO }],
    verifiedBy: BY
  },

  {
    id: 'childline',
    name: { ja: 'チャイルドライン（18歳まで）', en: 'Childline (up to 18)' },
    hook: { ja: '誰かに聞いてほしいだけ', jr: 'ちょっと話を聞いてほしい', en: 'I just want someone to listen' },
    summary: {
      ja: '18歳までの人のための、無料の電話とチャットです。名前も言わなくていいし、途中で切ってもOKです。',
      jr: '18歳までの人が、名前を言わずに、無料で話せる電話とチャットです。いやになったら、とちゅうで切ってだいじょうぶ。',
      en: 'Free phone and chat for anyone up to 18. No name needed.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'npo', right: false,
    amount: null, repay: null,
    who: { ja: '18歳までの人。' },
    how: { ja: '0120-99-7777 に電話するか（毎日 午後4時〜9時）、サイトのチャットを使います（月〜土 午後4時〜9時、第4日曜は午後4時〜6時半）。' },
    where: { ja: '電話・チャット' },
    docs: [],
    ask: ['話を聞いてほしいです'],
    caution: { ja: '年末年始（12月29日〜1月3日）はお休みです。キッズフォンや050で始まるIP電話はつながらないことがあり、LINE電話などのインターネット電話からはかけられません。' },
    supporter: { ja: '運営：認定NPO法人チャイルドライン支援センター。「ネットでんわ」は2026年3月31日で終了。チャットは本人が望まない限り通報しない方針と明記。' },
    effort: 'low',
    for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: { min: null, max: 18 }, areas: [] },
    deadline: null,
    contact: { phone: '0120-99-7777', phoneLabel: 'チャイルドライン（無料）', line: null, chat: 'https://childline.or.jp/chat/', web: 'https://childline.or.jp/tel/', hours: { ja: '電話 毎日16:00〜21:00／チャット 月〜土16:00〜21:00（第4日曜は16:00〜18:30）', en: 'Phone daily 16:00–21:00 / Chat Mon–Sat 16:00–21:00 (4th Sunday 16:00–18:30)' } },
    locations: [],
    source: src3('チャイルドライン支援センター（電話で話す）', 'https://childline.or.jp/tel/'),
    sources2: [{ org: 'チャイルドライン支援センター（チャットで話す）', url: 'https://childline.or.jp/chat/' }, { org: '文部科学省「子供のSOSの相談窓口（電話）」', url: MEXT_SOSTEL }],
    verifiedBy: BY
  },

  {
    id: 'jiso-189',
    name: { ja: '児童相談所 189（いちはやく）', en: 'Child Guidance Center 189' },
    hook: { ja: '家や施設で、こわいことがある', jr: '家で、たたかれたり、こわいことをされる', en: 'Something scary is happening at home or in care' },
    summary: {
      ja: '189 にかけると、近くの児童相談所につながります。名前を言わなくても相談でき、秘密は守られます。通話は無料です。',
      jr: '189にかけると、近くの児童相談所につながります。名前を言わなくてもいいし、お金もかかりません。',
      en: 'Dial 189 to reach your local child guidance center. Anonymous, confidential and free.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '虐待かもと思ったとき。自分のことでも、まわりの子のことでも。中学生や高校生が、自分で電話してかまいません。' },
    how: { ja: '189 に電話します。オペレーターが住んでいる地域を聞いて、近くの児童相談所につなぎます。虐待のほかの、こどものいろいろな相談は 0120-189-783（児童相談所相談専用ダイヤル・無料）でもできます。' },
    where: { ja: '電話（近くの児童相談所）' },
    docs: [],
    ask: ['今の状況を話したいです', '安全に過ごせる場所はありますか？'],
    caution: { ja: '一部のIP電話からはつながりません。今すぐ危ないときは 110 へ。' },
    supporter: { ja: '2025年12月22日から、すべての電話でオペレーターが地域を聞き取り管轄の児相へ転送。措置延長・児童自立生活援助の相談も児相へ。' },
    effort: 'low',
    for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '189', phoneLabel: '児童相談所 虐待対応ダイヤル（無料）', line: null, chat: null, web: 'https://www.cfa.go.jp/policies/jidougyakutai/gyakutai-taiou-dial', hours: { ja: '24時間365日', en: '24/7' } },
    locations: [],
    source: src3('こども家庭庁', 'https://www.cfa.go.jp/policies/jidougyakutai/gyakutai-taiou-dial'),
    sources2: [{ org: '文部科学省「子供のSOSの相談窓口（電話）」', url: MEXT_SOSTEL }],
    verifiedBy: BY
  },

  {
    id: 'notalone',
    name: { ja: 'あなたはひとりじゃない（支援さがしチャットボット）', en: 'You Are Not Alone — Support Finder' },
    hook: { ja: '自分に合う支援を、質問に答えて探したい', en: 'I want to find support by answering questions' },
    summary: {
      ja: '国（内閣府）のサイトです。チャットボットの質問に答えると、あなたに合う支援や相談窓口が見つかります。18歳以下の人向けのページもあります。',
      jr: 'チャットボットの質問に答えると、自分に合う相談先がわかります。名前や電話番号は入れなくてだいじょうぶ。',
      en: 'A government site: answer a chatbot\'s questions to find support and help lines that fit you. There is a page for people 18 and under.'
    },
    cat: ['consult'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '誰でも。18歳以下の人向けの電話・メール・チャットの窓口も紹介しています。' },
    how: { ja: 'サイトを開いて、チャットボットで探します。' },
    where: { ja: 'インターネット' },
    docs: [],
    ask: ['（読むだけでOK）'],
    caution: null,
    supporter: { ja: '内閣府孤独・孤立対策推進室。相談窓口の守秘義務や「制度を使うことは権利」というメッセージを本人に伝えやすい。' },
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://notalone-cao.go.jp/', hours: null },
    locations: [],
    source: src3('内閣府 孤独・孤立対策推進室', 'https://notalone-cao.go.jp/'),
    sources2: [{ org: '18歳以下のみなさんへ（同サイト）', url: 'https://notalone-cao.go.jp/under18/' }],
    verifiedBy: BY
  },

  {
    id: 'onestop-8891',
    name: { ja: '性暴力の相談 #8891（ワンストップ支援センター）', en: 'Sexual Violence Support #8891' },
    hook: { ja: 'いやな性的なことをされた', en: 'Something sexual happened that I did not want' },
    summary: {
      ja: '#8891 にかけると、近くの性犯罪・性暴力被害者のためのワンストップ支援センターにつながります。通話は無料です。',
      en: 'Dial #8891 to reach your nearest one-stop center for sexual violence. The call is free.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '性暴力を受けた人。性別や年齢は関係ありません。' },
    how: { ja: '#8891 に電話します（NTTひかり電話からは 0120-8891-77）。' },
    where: { ja: '電話（近くの支援センター）' },
    docs: [],
    ask: ['何から話せばいいかわかりません。聞いてもらえますか？'],
    caution: { ja: '受付時間はセンターごとに違います。一部のIP電話からはつながりません。今すぐ危ないときは 110 へ。' },
    supporter: null,
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '#8891', phoneLabel: 'ワンストップ支援センター（無料）', line: null, chat: null, web: 'https://www.gender.go.jp/policy/no_violence/seibouryoku/consult.html', hours: null },
    locations: [],
    source: src('内閣府 男女共同参画局', 'https://www.gender.go.jp/policy/no_violence/seibouryoku/consult.html'),
    sources2: [{ org: '警察庁（令和7年版 犯罪被害者白書 相談先一覧）', url: 'https://www.npa.go.jp/hanzaihigai/whitepaper/2025/zenbun/siryo/siryo-9.html' }],
    verifiedBy: BY
  },

  {
    id: 'police-9110',
    name: { ja: '警察相談専用電話 #9110', en: 'Police Consultation #9110' },
    hook: { ja: 'ストーカーや詐欺かも。でも110番ほどじゃない', en: 'Stalking or a scam — but not a 110 emergency' },
    summary: {
      ja: '事件かどうかわからない困りごとを、警察に相談できる全国共通の番号です。',
      en: 'A nationwide number to ask the police about trouble that may not be an emergency.'
    },
    cat: ['consult', 'procedures'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '誰でも。' },
    how: { ja: '#9110 に電話すると、住んでいる地域の警察の相談窓口につながります。' },
    where: { ja: '電話（都道府県警察）' },
    docs: ['あれば：やりとりのスクショ、日時のメモ'],
    ask: ['これは警察に相談していいことですか？', '証拠として何を残せばいいですか？'],
    caution: { ja: '今すぐ危ないときは 110 へ。時間外は当直や音声案内になることがあります。' },
    supporter: null,
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '#9110', phoneLabel: '警察相談専用電話', line: null, chat: null, web: 'https://www.keishicho.metro.tokyo.lg.jp/sodan/madoguchi/sogo.html', hours: { ja: '平日 8:30〜17:15（都道府県で違います）', en: 'Weekdays 8:30–17:15 (varies by prefecture)' } },
    locations: [],
    source: src('警視庁 総合相談センター（#9110）', 'https://www.keishicho.metro.tokyo.lg.jp/sodan/madoguchi/sogo.html'),
    sources2: [{ org: '警察庁（令和7年版 犯罪被害者白書 相談先一覧）', url: 'https://www.npa.go.jp/hanzaihigai/whitepaper/2025/zenbun/siryo/siryo-9.html' }],
    verifiedBy: BY
  },

  /* ================= 中学生にも関係する国の制度・窓口（v3 で追加・2026-10-17 確認） ================= */

  {
    id: 'shugaku-enjo',
    name: { ja: '就学援助（小学校・中学校のお金）', en: 'School Expense Aid (Elementary & Junior High)' },
    hook: { ja: '給食費や修学旅行のお金が心配', jr: '給食や修学旅行、部活のお金が心配', en: 'I worry about school lunch and school trip costs' },
    summary: {
      ja: '生活が苦しい家庭の小学生・中学生のために、区市町村が学用品・給食費・修学旅行費などを出してくれます。返さなくていいお金です。',
      jr: '家のお金が苦しいとき、学校で使うお金（給食・修学旅行・学用品など）を区市町村が出してくれます。返さなくていいです。',
      en: 'Your city pays school supplies, lunch, school trips and more for elementary and junior high students from low-income families. No repayment.'
    },
    cat: ['education', 'money'],
    kind: 'grant', basis: 'national', right: true,
    amount: null,
    repay: 'none',
    who: { ja: '生活保護を受けている家庭や、それに近いくらい生活が苦しいと区市町村が認めた家庭の、小学生・中学生（申し込むのは保護者）。基準は区市町村ごとに決まっています。' },
    how: { ja: '保護者が、住んでいる区市町村（教育委員会）に申し込みます。対象になるか、何が出るかは区市町村に問い合わせます。' },
    where: { ja: '住んでいる区市町村の教育委員会' },
    docs: ['区市町村の申請書'],
    ask: ['就学援助は、いつ・どこで申し込めますか？', 'うちの家は対象になりそうですか？', '修学旅行や部活のお金も出ますか？', '中学に入る前のお金（新入学の学用品費）も出ますか？'],
    caution: { ja: '申し込むのは保護者です。何にいくら出るかは区市町村ごとにちがいます。施設や里親家庭で暮らしている人は、学校のお金の出し方がちがうことがあるので、職員や里親に聞いてください。' },
    supporter: { ja: '学校教育法19条「経済的理由によって就学困難と認められる学齢児童生徒の保護者に対しては、市町村は、必要な援助を与えなければならない」。要保護者（国庫補助1/2）と準要保護者（市町村単独・認定基準は各市町村）。国庫補助の対象品目：学用品費・体育実技用具費・新入学児童生徒学用品費等・通学用品費・通学費・修学旅行費・校外活動費・医療費・学校給食費・クラブ活動費・生徒会費・PTA会費・卒業アルバム代等・オンライン学習通信費。' },
    effort: 'mid',
    for: { stages: ['jhs12', 'jhs3'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: { ja: '区市町村ごとに申込みの時期が決まっています。くわしくは区市町村に聞きましょう。', en: 'Each city sets its own application period. Ask your city office.', leaveMonths: null, months: null, always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.mext.go.jp/a_menu/shotou/career/05010502/017.htm', hours: null },
    locations: [],
    source: src3('文部科学省「就学援助制度について（就学援助ポータルサイト）」', 'https://www.mext.go.jp/a_menu/shotou/career/05010502/017.htm'),
    verifiedBy: BY
  },

  {
    id: 'kodomo-gakushu-shien',
    name: { ja: '子どもの学習・生活支援事業（学習支援）', en: 'Learning and Life Support for Children' },
    hook: { ja: '塾に行けない。勉強を見てくれる人がほしい', jr: '塾に行けない。勉強を教えてほしい', en: 'I cannot go to cram school and want help studying' },
    summary: {
      ja: '生活に困りごとがある家庭の子どもに、区市町村が勉強の支援や、安心してすごせる居場所、高校進学の相談などを用意しています（国の制度）。',
      jr: '勉強を見てもらえたり、高校に行くための相談ができたりする場所です。区市町村がやっています。',
      en: 'Cities offer study help, a safe place to spend time and advice on going to high school for children from families facing hardship (a national program).'
    },
    cat: ['education', 'consult'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '生活に困りごとがある家庭の子どもと、その保護者。くわしい対象（学年など）や場所は、区市町村ごとに決まっています。' },
    how: { ja: '住んでいる区市町村の自立相談支援機関（くらしの困りごと相談）に「子どもの学習支援を使いたい」と相談します。' },
    where: { ja: '住んでいる区市町村（自立相談支援機関）' },
    docs: [],
    ask: ['子どもの学習支援（学習・生活支援事業）は、この区市町村にありますか？', 'どこで、何曜日にやっていますか？', 'お金はかかりますか？', '高校受験の相談もできますか？'],
    caution: { ja: '内容・対象・場所は区市町村ごとにちがいます。東京都内の区市町村の窓口は、このサイトの地図からも探せます。' },
    supporter: { ja: '生活困窮者自立支援制度の事業の一つ。学習支援のほか、生活習慣、居場所づくり、進学支援、高校進学者の中退防止支援など、子どもと保護者の双方を支援。問い合わせ先は各地域の自立相談支援機関。' },
    effort: 'low',
    for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: { ja: 'いつでも相談できます。高校受験の前なら、中1・中2のうちに聞いておくと安心です。', en: 'Ask any time. If you plan to take high school entrance exams, ask early.', leaveMonths: null, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://minna-tunagaru.jp/ichiran/', hours: null },
    locations: [],
    source: src3('厚生労働省「生活困窮者自立支援制度」', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000059425.html'),
    verifiedBy: BY
  },

  {
    id: 'jinken-110',
    name: { ja: 'こどもの人権110番（法務省）', en: 'Children\'s Rights Hotline (Ministry of Justice)' },
    hook: { ja: 'いじめや、家の人にいやなことをされる', jr: '学校でいじめられている。家の人にいやなことをされる', en: 'I am bullied, or someone at home hurts me' },
    summary: {
      ja: 'いじめや虐待など、こどもの困りごとを、法務局の職員や人権擁護委員が聞いて一緒に考える無料の電話です。LINE・メール・手紙でも相談できます。',
      jr: 'いじめや、家でいやなことをされたとき、話を聞いて一緒に考えてくれる無料の電話です。LINEや手紙でも相談できます。',
      en: 'A free line where Legal Affairs Bureau staff listen and help with bullying, abuse and other problems children face. LINE, email and letters also work.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: 'こども。「まわりで困っている子がいる」という相談でもだいじょうぶです。' },
    how: { ja: '0120-007-110 に電話します（平日 朝8時30分〜夕方5時15分）。LINEは「法務局LINEじんけん相談」を友だち追加します。' },
    where: { ja: '電話・LINE・メール・手紙（法務局）' },
    docs: [],
    ask: ['学校でいやなことがあって、話を聞いてほしいです', '先生や家の人には言いにくいです。どうしたらいいですか？'],
    caution: { ja: '土・日・祝日・年末年始はお休みです。つながらないときは、法務省のページの一覧から近くの相談先に電話できます。今すぐ危ないときは 110 へ。' },
    supporter: { ja: '学校のいじめ・体罰・不適切な指導、家庭内の虐待など。LINEじんけん相談（平日8:30〜17:15）、メール相談（インターネット人権相談）、こどもの人権SOSミニレター（手紙）もある。秘密は守られる。' },
    effort: 'low',
    for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '0120-007-110', phoneLabel: 'こどもの人権110番（無料）', line: 'https://lin.ee/sypy6vm', chat: null, web: 'https://www.moj.go.jp/JINKEN/jinken112.html', hours: { ja: '平日 8:30〜17:15', en: 'Weekdays 8:30–17:15' } },
    locations: [],
    source: src3('法務省「こどもの人権110番」', 'https://www.moj.go.jp/JINKEN/jinken112.html'),
    sources2: [{ org: '文部科学省「子供のSOSの相談窓口（SNS）」', url: MEXT_SOSSNS }, { org: 'こども家庭庁（その他の相談窓口）', url: 'https://www.cfa.go.jp/policies/jidougyakutai/gyakutai-taiou-dial' }],
    verifiedBy: BY
  },

  {
    id: 'oyako-line',
    name: { ja: '親子のための相談LINE（こども家庭庁）', en: 'Parent-Child Consultation LINE' },
    hook: { ja: '親や家のことを、文字で相談したい', jr: '親や家のことを、LINEで相談したい', en: 'I want to talk about my parents or home by text' },
    summary: {
      ja: '子育てや親子のことで悩んだとき、こども（18歳未満）も保護者もLINEで相談できます。ニックネームでも相談でき、秘密は守られます。',
      jr: '親や家のことでなやんだら、LINEで相談できます。ニックネームでOK。ひみつは守られます。',
      en: 'Children under 18 and parents can talk about parenting and family problems on LINE. A nickname is fine and it stays confidential.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '18歳未満のこどもと、その保護者など。' },
    how: { ja: 'LINEで友だち追加して、メッセージを送ります。住んでいる自治体の窓口につながります。' },
    where: { ja: 'LINE（住んでいる都道府県・区市町村の窓口）' },
    docs: [],
    ask: ['家のことで話を聞いてほしいです', '親には知られずに相談できますか？'],
    caution: { ja: '受付時間は住んでいる自治体でちがいます。東京都は毎日、平日9時〜23時（受付は22時30分まで）、土日祝と年末年始は9時〜17時（国の一覧・2024年10月時点）。区によってちがう時間のところもあります。相談の前に、個人情報のあつかいの説明を読みましょう。' },
    supporter: { ja: 'こども家庭庁が運営し、各自治体が対応。港区（13:00〜21:00）など区独自の時間もある。今すぐ危険がある場合は110・189へ。' },
    effort: 'low',
    for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: { min: null, max: 17 }, areas: [] },
    deadline: null,
    contact: { phone: null, phoneLabel: null, line: 'https://line.me/R/ti/p/@778asdia', chat: null, web: 'https://www.cfa.go.jp/policies/jidougyakutai/oyako-line', hours: { ja: '東京都：平日9:00〜23:00、土日祝9:00〜17:00', en: 'Tokyo: weekdays 9:00–23:00, weekends/holidays 9:00–17:00' } },
    locations: [],
    source: src3('こども家庭庁「親子のための相談LINE」', 'https://www.cfa.go.jp/policies/jidougyakutai/oyako-line'),
    verifiedBy: BY
  },

  {
    id: 'kodomo-soudan-guide',
    name: { ja: 'こども相談ガイド（こども家庭庁）', en: 'Child Consultation Guide (Children and Families Agency)' },
    hook: { ja: 'どこに相談したらいいか、一緒に探してほしい', jr: 'だれに相談すればいいか、わからない', en: 'Help me find who to talk to' },
    summary: {
      ja: '質問に答えると、電話・チャット・会いに行ける相談先を一緒に探してくれる、こども家庭庁のサイトです。名前や連絡先の登録はいりません。',
      jr: '質問に答えていくと、あなたに合う相談先を一緒に探してくれます。中学生向けのコースもあります。名前を入れなくてOK。',
      en: 'A government site that asks a few questions and finds phone, chat or in-person help for you. No name or contact details needed.'
    },
    cat: ['consult'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: 'こども・若者本人（小学生・中学生・高校生以上のコースがあります）。友だちや家族のことが心配な人も使えます。' },
    how: { ja: 'サイトを開いて、質問に答えていきます。相談先は無料で使えます。' },
    where: { ja: 'インターネット' },
    docs: [],
    ask: ['（読むだけでOK）'],
    caution: null,
    supporter: { ja: '全国約7,600か所（2026年9月時点）の支援団体の情報を掲載（自治体などの公開情報をもとに原則年1回更新）。家族・家のこと、勉強・友達、居場所、心と体、トラブル、お金・住まいなどから選べる。' },
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.bridge.cfa.go.jp/guide/', hours: null },
    locations: [],
    source: src3('こども家庭庁「こども相談ガイド」', 'https://www.bridge.cfa.go.jp/'),
    sources2: [{ org: 'こども家庭庁「こども相談ガイド」', url: 'https://www.bridge.cfa.go.jp/guide/' }],
    verifiedBy: BY
  }

  );
})();
;
/* ---- data/programs-tokyo.js ---- */
/* 巣立ちマップ v3 — data/programs-tokyo.js (A4 / DATA-T)
 * 東京都・都内NPOの支援。すべて 2026-10-16 に公式ページ／運営団体のページを読んで確認しました。
 * v3（2026-10-17）: 中学生向けの記録を追加し、受験生チャレンジ支援貸付を再確認。中学生に出す／出さないを for.stages で整理。
 * わからない項目は null にしています（推測で埋めていません）。
 * 座標は 国土地理院 住所検索API で住所から求めました。
 */
(function () {
  var C = '2026-10-16';
  var C3 = '2026-10-17';
  var NOT_JR = ['hs12', 'hs3', 'left0', 'left1', 'nohs'];            // 中学生には出さない
  var ALL_ST = ['jhs12', 'jhs3', 'hs12', 'hs3', 'left0', 'left1', 'nohs']; // 中学生にも出す
  var V = 'Economix JP';
  var CARE = ['facility', 'foster', 'jhome'];

  var FLAT = 'https://www.fukushi.metro.tokyo.lg.jp/kodomo/sodan/kyotenjigyou';
  var WOMEN = 'https://www.fukushi.metro.tokyo.lg.jp/kiban/madoguchi/josei_soudan';
  var JISOU = 'https://www.fukushi.metro.tokyo.lg.jp/shisetsu/jicen/list';
  var TCSW_J = 'https://www.tcsw.tvac.or.jp/shikin/jiritsu/index.html';
  var YUZU = 'https://www.acyuzuriha.com/action/';
  var B4S_CARE = 'https://www.b4s.jp/care/';
  var SHIGOTO_PDF = 'https://www.hataraku.metro.tokyo.lg.jp/shiryo/sodanmadoguti_syukatsuhikkei.pdf';
  var RODO = 'https://www.hataraku.metro.tokyo.lg.jp/sodan/sodan/index.html';

  // 東京都・特別区の児童相談所（東京都福祉局「東京都児童相談所一覧」2026年8月1日更新 より）
  function js(name, area, addr, lat, lng, phone, note) {
    return { name: name, area: area, addr: addr, lat: lat, lng: lng, phone: phone, hours: '平日 9:00–17:00', note: note };
  }
  var JISOU_LOCS = [
    js('東京都 児童相談センター', '13104', '東京都新宿区北新宿4-6-1 東京都子供家庭総合センター内', 35.707607, 139.694107, '03-5937-2317',
      '担当: 新宿区・中央区・台東区・千代田区・八丈町・青ヶ島村・三宅村・御蔵島村・小笠原村。渋谷区・目黒区・大島町・利島村・新島村・神津島村は 03-5937-2314'),
    js('東京都 練馬児童相談所', '13120', '東京都練馬区豊玉北5-28-3', 35.734859, 139.653244, '03-6915-8253', '担当: 練馬区'),
    js('東京都 北児童相談所', '13117', '東京都北区王子6-1-12', 35.761162, 139.738800, '03-3913-5421', '担当: 北区'),
    js('東京都 大田児童相談所', '13111', '東京都大田区大森西2-3-22 大田区こども未来総合センター内', 35.578339, 139.729736, '03-5763-5364', '担当: 大田区'),
    js('東京都 立川児童相談所', '13202', '東京都立川市柴崎町2-21-19 立川福祉保健庁舎3階', 35.694309, 139.408432, '042-523-1321',
      '担当: 立川市・青梅市・昭島市・国立市・福生市・あきる野市・羽村市・瑞穂町・日の出町・檜原村・奥多摩町'),
    js('東京都 杉並児童相談所（11月1日から『多摩中部児童相談所』）', '13115', '東京都杉並区南荻窪4-23-6', 35.701256, 139.614914, '03-5370-6001',
      '担当: 杉並区・武蔵野市・三鷹市。11月1日から「多摩中部児童相談所」に名前が変わります'),
    js('東京都 江東児童相談所', '13108', '東京都江東区枝川3-6-9', 35.658981, 139.810654, '03-3640-5432', '担当: 墨田区・江東区'),
    js('東京都 小平児童相談所', '13211', '東京都小平市花小金井1-31-24 多摩小平保健所庁舎3階', 35.730331, 139.516418, '042-467-3711',
      '担当: 小平市・小金井市・東村山市・国分寺市・西東京市・東大和市・清瀬市・東久留米市・武蔵村山市'),
    js('東京都 八王子児童相談所', '13201', '東京都八王子市台町3-17-30', 35.654816, 139.321991, '042-624-1141', '担当: 八王子市・日野市'),
    js('東京都 町田児童相談所', '13209', '東京都町田市山崎1-2-17', 35.568497, 139.429199, '042-851-9357', '担当: 町田市'),
    js('東京都 足立児童相談所', '13121', '東京都足立区西新井本町3-8-4', 35.775627, 139.776627, '03-3854-1181', '担当: 足立区'),
    js('東京都 多摩児童相談所', '13224', '東京都多摩市諏訪2-6', 35.627968, 139.451675, '042-372-5600', '担当: 多摩市・府中市・調布市・稲城市・狛江市'),
    js('世田谷区 児童相談所', '13112', '東京都世田谷区松原6-41-7', 35.656521, 139.649506, '03-6379-0697', '担当: 世田谷区'),
    js('江戸川区 児童相談所（はあとポート）', '13123', '東京都江戸川区中央3-4-18', 35.710094, 139.871796, '03-5678-1810', '担当: 江戸川区'),
    js('荒川区 子ども家庭総合センター（児童相談所）', '13118', '東京都荒川区荒川1-50-17', 35.734066, 139.784592, '03-3802-3765', '担当: 荒川区'),
    js('港区 児童相談所', '13103', '東京都港区南青山5-7-11', 35.662689, 139.712814, '03-5962-6500', '担当: 港区'),
    js('中野区 児童相談所', '13114', '東京都中野区中央1-41-2', 35.698292, 139.683182, '03-5937-3289', '担当: 中野区'),
    js('板橋区 子ども家庭総合支援センター（児童相談所）', '13119', '東京都板橋区本町24-17', 35.759575, 139.708801, '03-5944-2373', '担当: 板橋区'),
    js('豊島区 児童相談所', '13116', '東京都豊島区長崎3-6-24', 35.728687, 139.688461, '03-6758-7910', '担当: 豊島区'),
    js('葛飾区 児童相談所', '13122', '東京都葛飾区立石2-30-1', 35.740181, 139.841522, '03-5698-0303', '担当: 葛飾区'),
    js('品川区 児童相談所', '13109', '東京都品川区北品川3-10-9', 35.616840, 139.737595, '03-6712-8261', '担当: 品川区'),
    js('文京区 児童相談所', '13105', '東京都文京区小石川3-14-7', 35.711887, 139.746582, '03-3811-5241', '担当: 文京区')
  ];

  SM.data.programs.push(

    /* ───────── ふらっとホーム（東京都 社会的養護自立支援拠点事業）───────── */
    {
      id: 'tokyo-flat-hinatabokko',
      name: { ja: '日向ぼっこ（ふらっとホーム）', en: 'Hinatabokko (Flat Home drop-in)' },
      hook: { ja: 'ほっとできる場所と、話せる人がほしい', en: 'I want a place to relax and someone to talk to' },
      summary: {
        ja: '施設や里親家庭で育った人などが集まれる居場所です。くらしや仕事のことも相談できます。東京都の「ふらっとホーム」の1つです。',
        en: 'A drop-in space for people with care experience, where you can also talk about daily life and work. One of Tokyo\'s "Flat Home" bases.'
      },
      cat: ['consult', 'work'],
      kind: 'place', basis: 'npo', right: false,
      amount: null, repay: null,
      who: { ja: '施設や里親家庭などで育った人。虐待をうけた経験があるのに、これまで支援につながらなかった人も。' },
      how: { ja: '初めての人は、先に面談があります。まず電話かメールで連絡しよう。個別の相談はいつでも受けています。' },
      where: { ja: '新宿区下落合（高田馬場駅から歩いて3分）' },
      docs: [],
      ask: ['初めて行きたいです。面談はいつできますか？', 'どんなことを相談できますか？', '行くときに持っていくものはありますか？'],
      caution: { ja: '水曜・土曜はお休みです。初めての人は前もって面談が必要です。' },
      supporter: { ja: '東京都 社会的養護自立支援拠点事業（ふらっとホーム事業）令和8年度補助事業者。個別相談は随時受付。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: false, age: null, areas: ['13'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-5834-7433', phoneLabel: '日向ぼっこ', line: null, chat: null,
        web: 'https://hinatabokko2006.com/access/',
        hours: { ja: '月・木・金・日 12時〜18時／火 14時〜20時（水・土は休み）', en: 'Mon/Thu/Fri/Sun 12–18, Tue 14–20 (closed Wed/Sat)' }
      },
      locations: [{
        name: 'NPO法人 日向ぼっこ', area: '13104',
        addr: '東京都新宿区下落合1-3-16 ジョリーメゾンヌベル下落合202号室',
        lat: 35.715973, lng: 139.703247, phone: '03-5834-7433',
        hours: '月・木・金・日 12:00–18:00／火 14:00–20:00（水・土 休み）', note: '高田馬場駅から歩いて3分。初めての人は事前面談あり'
      }],
      source: { org: 'NPO法人 日向ぼっこ', url: 'https://hinatabokko2006.com/access/', checked: C },
      sources2: [{ org: '東京都福祉局（ふらっとホーム事業）', url: FLAT }],
      verifiedBy: V
    },

    {
      id: 'tokyo-flat-b4s-akiba',
      name: { ja: 'B4S PORT あきば（ふらっとホーム）', en: 'B4S PORT Akiba (Flat Home drop-in)' },
      hook: { ja: '安心して過ごせる場所と、人に聞かれたくない相談先がほしい', en: 'I want a safe place to hang out and a private place to talk' },
      summary: {
        ja: 'ブリッジフォースマイルが東京都から受けて開いている居場所です。無料で使えて、予約すると1対1の相談（1回60分）もできます。',
        en: 'A free drop-in space run by Bridge for Smile for Tokyo. You can also book a private 60-minute consultation.'
      },
      cat: ['consult'],
      kind: 'place', basis: 'npo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '施設や里親家庭などでくらした経験がある人。児童相談所に保護されたことがある人。親からひどい扱いを受けている（受けた）人。' },
      how: { ja: '前もって電話かLINEで予約してから行きます。個別相談は、居場所が開いていない時間に日時を決めます。' },
      where: { ja: '台東区柳橋（アーク柳橋401）' },
      docs: [],
      ask: ['初めて行きたいです。いつ予約できますか？', '個別に相談したいです。どの日時なら空いていますか？', 'ごはんは出ますか？'],
      caution: { ja: '利用には予約が必要です。予約の電話は平日10時〜18時です。' },
      supporter: { ja: '東京都 ふらっとホーム事業の補助事業者（認定NPO法人ブリッジフォースマイル）。メール andyou@b4s.jp。B4Sは令和8年11月に都内でもう1か所開設予定（都のページでは事業所名未定）。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: false, age: null, areas: ['13'] },
      deadline: { ja: 'いつでも（予約制）', en: 'Anytime (booking needed)', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-6842-6766', phoneLabel: 'ブリッジフォースマイル', line: 'https://lin.ee/NU4F9FG', chat: null,
        web: 'https://www.b4s.jp/post-7599/',
        hours: { ja: '居場所: 火・土 15時〜20時／木 15時〜18時。電話予約: 平日10時〜18時', en: 'Open Tue/Sat 15–20, Thu 15–18. Phone booking weekdays 10–18' }
      },
      locations: [{
        name: 'B4S PORT あきば', area: '13106', addr: '東京都台東区柳橋1-6-2 アーク柳橋401',
        lat: 35.696064, lng: 139.786850, phone: '03-6842-6766',
        hours: '火・土 15:00–20:00／木 15:00–18:00', note: '予約制（電話かLINE）'
      }],
      source: { org: '認定NPO法人ブリッジフォースマイル', url: 'https://www.b4s.jp/post-7599/', checked: C },
      sources2: [{ org: '東京都福祉局（ふらっとホーム事業）', url: FLAT }],
      verifiedBy: V
    },

    {
      id: 'tokyo-flat-satellite-tachikawa',
      name: { ja: 'サテライト立川（ふらっとホーム）', en: 'Satellite Tachikawa (Flat Home drop-in)' },
      hook: { ja: 'お金や仕事のこと、だれかに相談したい', en: 'I want to talk to someone about money or work' },
      summary: {
        ja: '施設や里親家庭でくらした人のための拠点です。お金・仕事・人間関係・健康・法律のことを相談でき、困ったときは一時的に泊まれることもあります。無料です。',
        en: 'A free base for care leavers: talk about money, work, relationships, health or legal issues, and in a crisis you may be able to stay for a short time.'
      },
      cat: ['consult', 'work', 'housing'],
      kind: 'place', basis: 'npo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '児童養護施設や里親家庭などでくらした経験がある人。' },
      how: { ja: '予約サイトから希望の日時を申し込みます。電話かメールで確認の連絡がきたら、その時間に行きます。' },
      where: { ja: '立川市羽衣町（JR南武線 西国立駅から歩いて3分）' },
      docs: [],
      ask: ['相談の予約をしたいです。空いている日はありますか？', '就職や進学のことも相談できますか？', '住むところに困ったとき、一時的に泊まれますか？'],
      caution: { ja: '木曜・日曜はお休みです。Googleマップでは別の会社名（ハードフェースウエルドカンパニー）で出ることがあります。' },
      supporter: { ja: '東京都 ふらっとホーム事業の補助事業者（一般社団法人リーチ奨学育英会）。予約は https://reserva.be/reach 。FAX 042-595-7761。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: 'いつでも（予約制）', en: 'Anytime (booking needed)', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '042-595-7760', phoneLabel: 'サテライト立川', line: null, chat: 'https://reserva.be/reach',
        web: 'https://shiseiikuei.or.jp/satellite-tachikawa/',
        hours: { ja: '10時〜21時（木・日は休み）', en: '10:00–21:00 (closed Thu/Sun)' }
      },
      locations: [{
        name: 'サテライト立川', area: '13202', addr: '東京都立川市羽衣町3-2-10',
        lat: 35.692215, lng: 139.425507, phone: '042-595-7760',
        hours: '10:00–21:00（木・日 休み）', note: 'JR南武線 西国立駅から歩いて3分。予約制'
      }],
      source: { org: '一般社団法人リーチ奨学育英会', url: 'https://shiseiikuei.or.jp/satellite-tachikawa/', checked: C },
      sources2: [{ org: '東京都福祉局（ふらっとホーム事業）', url: FLAT }],
      verifiedBy: V
    },

    {
      id: 'tokyo-flat-yuzuriha',
      name: { ja: 'アフターケア相談所 ゆずりは（ふらっとホーム）', en: 'Yuzuriha Aftercare Center (Flat Home)' },
      hook: { ja: '役所や病院に、いっしょに行ってくれる人がほしい', en: 'I want someone to come with me to the city office or hospital' },
      summary: {
        ja: '住まい・くらし・仕事・進学の困りごとを、1対1で一緒に考えてくれます。生活保護の申請や、病院・不動産屋への付きそいも。相談は無料で、年齢制限もありません。',
        en: 'Free one-to-one help with housing, daily life, work and school, including going with you to apply for welfare or to the hospital or a rental agency. No age limit.'
      },
      cat: ['consult', 'procedures', 'housing'],
      kind: 'service', basis: 'npo', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '施設などを出て、くらし・仕事・進学が不安な人。親や家族から離れたい人。年齢制限はありません。' },
      how: { ja: '電話かホームページのお問い合わせフォームで連絡します。毎週水曜13時〜17時の「ゆずりはサロン」は予約なしで行けます。' },
      where: { ja: '電話・フォームで相談（住所はホームページにのっていません）' },
      docs: [],
      ask: ['生活保護の申請に、いっしょに行ってもらえますか？', '部屋を探したいです。不動産屋に付きそってもらえますか？', 'サロンには予約なしで行っていいですか？'],
      caution: { ja: '住所はホームページにのっていません。行き方は電話で聞いてください。フォームの返事には数日かかります。' },
      supporter: { ja: '社会福祉法人 子供の家。東京都 ふらっとホーム事業の補助事業者（ゆずりは／ながれる）。都のページでは、子供の家が令和8年10月にもう1か所開設予定（名称未定）。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: false, age: null, areas: ['13'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '042-315-6738', phoneLabel: 'ゆずりは・ながれる', line: null, chat: 'https://www.acyuzuriha.com/contact/',
        web: YUZU, hours: null
      },
      locations: [],
      source: { org: '社会福祉法人 子供の家 ゆずりは', url: YUZU, checked: C },
      sources2: [{ org: '東京都福祉局（ふらっとホーム事業）', url: FLAT }],
      verifiedBy: V
    },

    {
      id: 'yuzuriha-kousotsunintei',
      name: { ja: 'ゆずりは 高卒認定 学習会', en: 'Yuzuriha study group for the high-school equivalency exam' },
      hook: { ja: '高校を出ていないけど、もう一度勉強したい', en: 'I didn\'t finish high school but want to study again' },
      summary: {
        ja: '高卒認定（高校卒業と同じ資格）をとるための無料の学習会です。交通費は全額出て、軽食もあります。講師が学びたいことに合わせて教えてくれます。',
        en: 'A free weekly study group for the high-school equivalency exam. Travel costs are fully paid and snacks are provided.'
      },
      cat: ['education'],
      kind: 'service', basis: 'npo', right: false,
      amount: { ja: '無料・交通費は全額支給', en: 'Free; travel costs fully covered' }, repay: null,
      who: { ja: '高卒認定をとりたい人。ほかに学びたいことがある人も相談できます。' },
      how: { ja: '参加したいときは、前もって ゆずりは に連絡します。毎週木曜18時〜20時です。' },
      where: { ja: 'アフターケア相談所 ゆずりは（場所は電話で確認）' },
      docs: [],
      ask: ['高卒認定の学習会に参加したいです。次はいつですか？', '勉強がかなり苦手でも大丈夫ですか？', '交通費はどうやってもらえますか？'],
      caution: { ja: '参加したいときは、前もって連絡しよう。' },
      supporter: null,
      effort: 'low',
      for: { stages: ['nohs', 'left0', 'left1'], paths: ['study', 'unsure'], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: { ja: '毎週木曜 18時〜20時（いつでも始められます）', en: 'Every Thursday 18:00–20:00', leaveMonths: null, months: null, always: true },
      contact: { phone: '042-315-6738', phoneLabel: 'ゆずりは', line: null, chat: 'https://www.acyuzuriha.com/contact/', web: YUZU, hours: { ja: '学習会: 毎週木曜 18時〜20時', en: 'Thu 18:00–20:00' } },
      locations: [],
      source: { org: '社会福祉法人 子供の家 ゆずりは', url: YUZU, checked: C },
      verifiedBy: V
    },

    {
      id: 'yuzuriha-koubou',
      name: { ja: 'ゆずりは工房（ジャムづくり）', en: 'Yuzuriha Workshop (jam making)' },
      hook: { ja: '毎日働くのはまだしんどい。少しずつ働いてみたい', en: 'Working every day is too hard right now; I want to start small' },
      summary: {
        ja: 'スタッフといっしょにジャムをつくる仕事の場です。工賃（お給料）と交通費の全額を、その日にもらえます。',
        en: 'Make jam together with staff. You get paid for the work, plus full travel costs, on the same day.'
      },
      cat: ['work'],
      kind: 'service', basis: 'npo', right: false,
      amount: { ja: '工賃と交通費（全額）を当日支給', en: 'Same-day pay plus full travel costs' }, repay: null,
      who: { ja: '毎日働くことがむずかしい人。人とやりとりすることに緊張や不安がある人。' },
      how: { ja: '参加したいときは、前もって ゆずりは に連絡します。毎週木曜13時〜16時です。' },
      where: { ja: 'アフターケア相談所 ゆずりは（場所は電話で確認）' },
      docs: [],
      ask: ['工房に参加してみたいです。見学できますか？', '毎週来られなくても大丈夫ですか？', '工賃はいくらくらいですか？'],
      caution: null,
      supporter: null,
      effort: 'low',
      for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: { ja: '毎週木曜 13時〜16時', en: 'Every Thursday 13:00–16:00', leaveMonths: null, months: null, always: true },
      contact: { phone: '042-315-6738', phoneLabel: 'ゆずりは', line: null, chat: 'https://www.acyuzuriha.com/contact/', web: YUZU, hours: { ja: '工房: 毎週木曜 13時〜16時', en: 'Thu 13:00–16:00' } },
      locations: [],
      source: { org: '社会福祉法人 子供の家 ゆずりは', url: YUZU, checked: C },
      verifiedBy: V
    },

    /* ───────── ブリッジフォースマイル（自主事業）───────── */
    {
      id: 'b4s-port-shimokita',
      name: { ja: 'B4S PORT しもきた', en: 'B4S PORT Shimokita' },
      hook: { ja: 'だれかと一緒にごはんを食べたい', en: 'I want to share a meal with someone' },
      summary: {
        ja: 'おしゃべりしたり、一緒にごはんを作って食べたり、ゆっくりしたりできる居場所です。金・日は夕食があります。個別相談（1回30分）もできます。',
        en: 'A drop-in space in Shimokitazawa to chat, cook and eat together, or just rest. Dinner on Fri/Sun; 30-minute private chats available.'
      },
      cat: ['consult'],
      kind: 'place', basis: 'npo', right: false,
      amount: null, repay: null,
      who: { ja: '親からひどい扱いを受けている人、または受けた経験がある人。' },
      how: { ja: 'LINE・メール・電話で予約してから行きます。ごはんを食べたいときは、開く時間までに連絡します。LINEはID「@019xkunj」で探せます。' },
      where: { ja: '世田谷区北沢（下北沢）' },
      docs: [],
      ask: ['初めて行きたいです。予約できますか？', '夕ごはんを食べたいです。何時までに連絡すればいいですか？'],
      caution: { ja: '世田谷区からの委託は終わり、今はブリッジフォースマイルが自分たちで続けています。開いていない時間は 03-6842-6766 へ。' },
      supporter: null,
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: false, age: null, areas: ['13'] },
      deadline: { ja: 'いつでも（予約制）', en: 'Anytime (booking needed)', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '080-5652-1963', phoneLabel: 'PORT しもきた（開いている時間だけ）', line: null, chat: null,
        web: 'https://www.b4s.jp/post-6426/',
        hours: { ja: '水 14時〜18時／金・日 16時〜20時（夕食あり）', en: 'Wed 14–18, Fri/Sun 16–20 (dinner)' }
      },
      locations: [{
        name: 'B4S PORT しもきた', area: '13112', addr: '東京都世田谷区北沢2-10-15 藤和下北沢ハイタウンA614',
        lat: 35.661770, lng: 139.668610, phone: '080-5652-1963',
        hours: '水 14:00–18:00／金・日 16:00–20:00', note: '予約制。電話は開いている時間だけ'
      }],
      source: { org: '認定NPO法人ブリッジフォースマイル', url: 'https://www.b4s.jp/post-6426/', checked: C },
      sources2: [{ org: '認定NPO法人ブリッジフォースマイル（お知らせ）', url: 'https://www.b4s.jp/post-12498/' }],
      verifiedBy: V
    },

    {
      id: 'b4s-line-soudan',
      name: { ja: 'ブリッジフォースマイル LINE・電話相談', en: 'Bridge for Smile LINE / phone help' },
      hook: { ja: '親を頼れない。何から相談すればいいかわからない', en: 'I can\'t rely on my parents and don\'t know where to start' },
      summary: {
        ja: '親を頼れない10〜30代のための相談です。仕事、役所への付きそい、住む場所さがし、急に泊まる場所が必要なときなど、一緒に方法を考えてくれます。',
        en: 'Help for people in their teens to 30s who can\'t rely on their parents: work, going with you to the city office, finding housing, emergency places to stay, and more.'
      },
      cat: ['consult', 'housing', 'work'],
      kind: 'hotline', basis: 'npo', right: false,
      amount: null, repay: null,
      who: { ja: '親を頼れない10〜30代の人。' },
      how: { ja: 'LINEか電話で連絡します。スタッフが順番に返事をして、くわしく話を聞きます。近くの支援先を紹介してくれることもあります。' },
      where: { ja: 'LINE・電話' },
      docs: [],
      ask: ['今日泊まるところがありません。どうすればいいですか？', '役所の手続きに、いっしょに行ってもらえますか？', '住む部屋を探したいです。'],
      caution: { ja: '1回30分までです。受付は月・火・水・金・土の14時〜18時です。' },
      supporter: null,
      effort: 'low',
      for: { stages: ALL_ST, paths: [], care: [], careOnly: false, age: { min: 10, max: 39 }, areas: [] },
      deadline: null,
      contact: {
        phone: '045-755-7330', phoneLabel: 'B4S 相談', line: 'https://lin.ee/qjS8C9n', chat: null, web: B4S_CARE,
        hours: { ja: '月・火・水・金・土 14時〜18時（年末年始をのぞく）', en: 'Mon/Tue/Wed/Fri/Sat 14:00–18:00' }
      },
      locations: [],
      source: { org: '認定NPO法人ブリッジフォースマイル', url: B4S_CARE, checked: C },
      verifiedBy: V
    },

    /* ───────── 東京都社会福祉協議会の貸付 ───────── */
    {
      id: 'tokyo-jiritsu-start',
      name: { ja: '自立生活スタート支援事業（東京都）', en: 'Tokyo Independent Living Start-up Loan' },
      hook: { ja: '引っ越しや、仕事・学校の準備のお金が足りない', en: 'I don\'t have enough money to move out or get ready for work or school' },
      summary: {
        ja: '施設などを出るときの引っ越し代や、就職・進学の準備のお金を、利息なしで借りられる東京都の制度です。保証人はいりません。2年働き続けるか、学校を卒業すれば返さなくてよくなります。',
        en: 'A Tokyo interest-free loan for moving costs and getting ready for work or school when you leave care. No guarantor needed. Fully forgiven after 2 years of work, or when you graduate.'
      },
      cat: ['money', 'housing', 'education'],
      kind: 'loan_forgivable', basis: 'tokyo', right: false,
      amount: {
        ja: '引っ越し 32万円・就職の準備 10万円・資格や技能 30万円・進学の準備 50万円まで（あわせて80万円まで）',
        en: 'Moving ¥320k, job prep ¥100k, skills ¥300k, school entry ¥500k (up to ¥800k in total)'
      },
      repay: 'conditional',
      who: {
        ja: '東京都内（都が措置した都外の施設も）の児童養護施設・児童自立支援施設・自立援助ホーム・養育家庭・ファミリーホームの人で、出る日が決まっている人か、出てから5年以内の人。都内に住民票がある人。'
      },
      how: {
        ja: 'まず施設や里親の担当の人に相談します。担当の人が東京都社会福祉協議会（東社協）に連絡し、本人・担当の人・東社協の3人で面接します。そのあと申し込み、2週間ほどで審査が終わります。'
      },
      where: { ja: '施設・里親の担当の人 → 東京都社会福祉協議会' },
      docs: ['借入申込書', '施設長・里親の意見書（施設や里親が用意）', '見積書など、必要な金額がわかる書類'],
      ask: ['自立生活スタート支援事業を使いたいです。私は対象になりますか？', '返さなくてよくなる条件を教えてください', 'お金が振り込まれるのはいつごろですか？'],
      caution: {
        ja: '利息はなし・保証人もいりません。でも借りたお金なので、条件（2年間・週20時間以上働く／借りて進学した学校を卒業）を満たすまでは、毎年書類を出します。出さないと返すことになります。生活保護を受けている人は使えません。'
      },
      supporter: {
        ja: '東京都の補助で東社協が実施。施設等の長・里親等の意見書が必須、連帯保証人は不要。就学支度資金はサービス推進費の大学進学等支度金加算などが優先。資格取得は国の自立支援資金（資格取得支援費）が優先で、不足分は技能習得資金から5万円まで。就労1年以上で一部免除の場合あり。'
      },
      effort: 'high',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: {
        ja: '出る日が決まったら早めに。相談からお金が届くまで1か月以上かかります。出てから5年以内まで申し込めます。',
        en: 'Start as soon as your leaving date is set; it takes over a month. Available up to 5 years after leaving.',
        leaveMonths: -3, months: null, always: false
      },
      contact: {
        phone: '03-3268-7238', phoneLabel: '東京都社会福祉協議会 福祉資金部', line: null, chat: null, web: TCSW_J,
        hours: null
      },
      locations: [],
      source: { org: '東京都社会福祉協議会', url: TCSW_J, checked: C },
      sources2: [{ org: '東京都社会福祉協議会（ご案内PDF）', url: 'https://www.tcsw.tvac.or.jp/shikin/jiritsu/documents/202411_jiritsu-start.pdf' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-jiritsu-shikin',
      name: { ja: '自立支援資金貸付（東京都の窓口）', en: 'Independence Support Loan (Tokyo window)' },
      hook: { ja: '家賃や生活費の支えがほしい', en: 'I need help with rent and living costs' },
      summary: {
        ja: '進学した人は生活費（月5万円）と家賃を、働く人は家賃を、利息なしで借りられます。決まった年数働けば、返さなくてよくなります。東京都では東京都社会福祉協議会が窓口です。',
        en: 'Interest-free loans for living costs (¥50k/month for students) and rent. Forgiven after working for a set number of years. In Tokyo, run by the Tokyo Council of Social Welfare.'
      },
      cat: ['money', 'housing'],
      kind: 'loan_forgivable', basis: 'tokyo', right: false,
      amount: {
        ja: '生活費 月5万円（進学した人）・家賃 月53,700円まで（23区など。地域でちがう）・資格をとる費用 25万円まで',
        en: 'Living ¥50k/month (students); rent up to ¥53,700/month (23 wards etc.); licences up to ¥250k'
      },
      repay: 'conditional',
      who: {
        ja: '都内の児童養護施設・自立援助ホームなどを出た人、または里親・ファミリーホームの委託が終わった人で、出てから5年以内の人。親などからお金の支えがない人。資格の費用は、施設や里親家庭にいる間も使えます。'
      },
      how: { ja: '施設や里親の担当の人に相談します。担当の人から東社協に連絡し、3人で面接してから申し込みます。家賃・生活費は毎月振り込まれます。' },
      where: { ja: '施設・里親の担当の人 → 東京都社会福祉協議会' },
      docs: ['借入申込書', '住民票（マイナンバーなし・3か月以内）', '収支計画予定表', '施設長・里親の意見書', '在学証明書（進学した人）', '家賃がわかる賃貸借契約書のコピー', '在職証明書など（働いている人）'],
      ask: ['自立支援資金貸付を使いたいです。私は対象になりますか？', '返さなくてよくなる条件を教えてください', '保証人がいないときはどうすればいいですか？'],
      caution: {
        ja: '返さなくてよくなるには、進学した人は卒業後1年以内に就職して5年間、働く人は5年間（資格の費用は2年間）、週20時間以上働き続けることが必要です。保証人は原則必要ですが、いないときは相談できます。働く人の家賃は2年までです。'
      },
      supporter: {
        ja: '国と東京都の補助で東社協が実施（2025年10月版案内）。家賃支援費の上限は居住地の生活保護住宅扶助（単身）: 23区・羽村市とあきる野市をのぞく24市 53,700円、羽村市・あきる野市・瑞穂町 45,000円、日の出町・檜原村・奥多摩町・島しょ 40,900円。進学者の生活支援費に定期通院の医療費を追加できる（令和5年7月〜）。都外施設は施設所在地の道府県で申請。'
      },
      effort: 'high',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: {
        ja: '進学・就職で出るときに。出てから5年以内まで。相談から送金まで1か月以上かかります。',
        en: 'When you leave for school or work; up to 5 years after leaving. Takes over a month.',
        leaveMonths: -3, months: null, always: false
      },
      contact: { phone: '03-3268-7238', phoneLabel: '東京都社会福祉協議会 福祉資金部', line: null, chat: null, web: TCSW_J, hours: null },
      locations: [],
      source: { org: '東京都社会福祉協議会', url: TCSW_J, checked: C },
      sources2: [{ org: '東京都社会福祉協議会（貸付のご案内PDF 2025年10月版）', url: 'https://www.tcsw.tvac.or.jp/shikin/jiritsu/documents/2025jidou.pdf' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-juken-challenge',
      name: { ja: '受験生チャレンジ支援貸付', en: 'Exam Challenge Support Loan' },
      hook: { ja: '塾代や受験料が払えない', en: 'I can\'t pay for cram school or exam fees' },
      summary: {
        ja: '塾代と受験料を、利息なしで借りられる東京都の制度です。高校や大学などに入学すれば、返さなくてよくなります。',
        en: 'A Tokyo interest-free loan for cram school and exam fees. You don\'t have to pay it back if you get into high school, university or a vocational school.'
      },
      cat: ['education', 'money'],
      kind: 'loan_forgivable', basis: 'tokyo', right: false,
      amount: {
        ja: '塾代 30万円まで・大学などの受験料 12万円まで（高校の受験料は 2万7400円まで）',
        en: 'Cram school up to ¥300k; university exam fees up to ¥120k (high-school exams up to ¥27,400)'
      },
      repay: 'conditional',
      who: {
        ja: '中学3年生・高校3年生、または高校中退・高卒認定に合格・定時制4年・浪人などで進学をめざす20歳未満の人がいる世帯。都内に住民票があり、収入などの条件にあう世帯。'
      },
      how: {
        ja: 'まず住んでいる区市町村の窓口で相談します。書類を出すと、東京都社会福祉協議会が審査します。借用書を出してから2〜3週間でお金が振り込まれます。'
      },
      where: { ja: '住んでいる区市町村の窓口' },
      docs: ['住民票（世帯全員・3か月以内）', '課税証明書', '在学証明書（生徒証でも可）', '本人確認書類', '塾の受講料や受験料がわかるもの', '印鑑登録証明書（借用書を出すとき）', 'あとで領収書'],
      ask: ['受験生チャレンジ支援貸付を使いたいです。私の場合、だれが申し込みますか？', '今年の締切はいつですか？', '入学したら、返さなくていい手続きはどうしますか？'],
      caution: {
        ja: '申し込むのは「世帯の生計の中心の人」です。施設や里親家庭にいる人は、使えるかどうか担当の人と窓口に確認しよう。領収書を出さないと、全部返すことになります。'
      },
      supporter: {
        ja: '東京都の補助で東社協が実施、受付は区市町村。返済免除率99%（都のページ、令和8年4月1日更新で再確認）。1人1年度のみだが、中3で借りて高3でもう一度申し込むことは可。目的が同じ他の公的制度を使っている場合は差額のみ。生活保護世帯は対象外。収入基準のめやす（一般世帯4人で総収入504.9万円以下など）は都のページ参照。'
      },
      effort: 'high',
      for: { stages: ['jhs3', 'hs3', 'nohs'], paths: ['study', 'hs'], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['13'] },
      deadline: {
        ja: '毎年4月1日から受付。締切は区市町村によってちがうので、早めに窓口へ。領収書は令和9年3月末までに出します。',
        en: 'Applications open April 1 each year; deadlines vary by city.',
        leaveMonths: null, months: null, always: false
      },
      contact: {
        phone: '03-5320-4072', phoneLabel: '東京都 福祉局 地域福祉課（制度の問い合わせ）', line: null, chat: null,
        web: 'https://www.fukushi.metro.tokyo.lg.jp/seikatsu/teisyotokusyataisaku/jukenseichallenge',
        hours: null
      },
      locations: [],
      source: { org: '東京都福祉局', url: 'https://www.fukushi.metro.tokyo.lg.jp/seikatsu/teisyotokusyataisaku/jukenseichallenge', checked: C3 },
      sources2: [{ org: '東京都社会福祉協議会', url: 'https://www.tcsw.tvac.or.jp/shikin/index.html' }],
      verifiedBy: V
    },

    /* ───────── 東京都の相談窓口 ───────── */
    {
      id: 'tokyo-jisou',
      name: { ja: '児童相談所（東京都・特別区）', en: 'Child Guidance Centers (Tokyo)' },
      hook: { ja: '施設や里親のこと、家のことを相談したい', en: 'I want to talk about my care placement or my family' },
      summary: {
        ja: '子どもと家族のことを相談できる公的な窓口です。施設や里親家庭に入ること・出ることも、児童相談所が担当しています。',
        en: 'Public offices for children and families. They are also in charge of placements in and out of care.'
      },
      cat: ['consult', 'procedures'],
      kind: 'service', basis: 'tokyo', right: false,
      amount: null, repay: null,
      who: { ja: 'おもに18歳未満の子どもと家族。住んでいる区市町村で、担当の児童相談所が決まっています。' },
      how: { ja: '担当の児童相談所に電話します。平日9時〜17時。夜や休日は「189」（児童相談所 虐待対応ダイヤル）へ。' },
      where: { ja: '住んでいる区市町村を担当する児童相談所（地図で確認）' },
      docs: [],
      ask: ['施設を出る時期について相談したいです', '担当の児童福祉司さんと話したいです', '18歳をすぎても今のところにいられるか相談できますか？'],
      caution: { ja: '文京・品川・葛飾・豊島・板橋・中野・港・荒川・江戸川・世田谷区は、区の児童相談所が担当です。電話番号のかけまちがいに気をつけてね。' },
      supporter: { ja: '都児相に相談中の関係機関・本人の夜間休日の緊急連絡は 03-5937-2330（平日17:45以降・土日祝）。品川児童相談所（都）は令和8年7月31日に廃止、大田児童相談所が8月1日に開設。杉並児童相談所は11月1日から多摩中部児童相談所に改称（杉並区は区児相を設置予定）。' },
      effort: 'low',
      for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '189', phoneLabel: '夜・休日は 189（虐待対応ダイヤル）', line: null, chat: null, web: JISOU,
        hours: { ja: '各児童相談所: 平日 9時〜17時', en: 'Weekdays 9:00–17:00' }
      },
      locations: JISOU_LOCS,
      source: { org: '東京都福祉局', url: JISOU, checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-wakanavi',
      name: { ja: '若ナビα（東京都若者総合相談センター）', en: 'Wakanavi α (Tokyo Youth Counseling Center)' },
      hook: { ja: 'どこに相談すればいいかわからない', en: 'I don\'t know who to ask' },
      summary: {
        ja: '若い人のどんな悩みも聞いてくれる東京都の無料の相談窓口です。電話・LINE・メールで相談でき、合う相談先につないでくれます。',
        en: 'Tokyo\'s free help line for young people with any worry, by phone, LINE or email. They connect you to the right service.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '東京都に住む・学ぶ・働く、おおむね18歳〜39歳の人とその家族。' },
      how: { ja: '電話するか、LINEで「相談ほっとLINE＠東京」を友だち登録して「若者総合相談」を選びます。メールは24時間受付（利用者登録が必要）。' },
      where: { ja: '電話・LINE・メール（面談も相談できます）' },
      docs: [],
      ask: ['何から相談すればいいかわかりません。話を聞いてもらえますか？', '私に合う相談先を教えてください'],
      caution: { ja: '急いで助けが必要なとき（命の危険など）は、110番・119番へ。メールの返事は3〜7日かかります。' },
      supporter: { ja: 'メールと面談は英語・中国語・韓国/朝鮮語にも対応。支援機関からの引継ぎ相談も可。' },
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: { min: 18, max: 39 }, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-3267-0808', phoneLabel: '若ナビα', line: null, chat: 'https://www.wakanavi-tokyo.metro.tokyo.lg.jp/about/',
        web: 'https://www.wakanavi-tokyo.metro.tokyo.lg.jp/about/',
        hours: { ja: '電話・LINE: 月〜土 11時〜23時（受付は22時30分まで・年末年始は休み）', en: 'Phone/LINE: Mon–Sat 11:00–23:00 (last call 22:30)' }
      },
      locations: [],
      source: { org: '東京都若者総合相談センター 若ナビα', url: 'https://www.wakanavi-tokyo.metro.tokyo.lg.jp/about/', checked: C },
      sources2: [{ org: '東京都（都庁の相談窓口案内）', url: 'https://www.metro.tokyo.lg.jp/tosei/iken-sodan/sodan/kyoiku' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-challenge-net',
      name: { ja: 'TOKYOチャレンジネット', en: 'TOKYO Challenge Net' },
      hook: { ja: '住むところがない。ネットカフェで寝ている', en: 'I have nowhere to live and sleep in internet cafés' },
      summary: {
        ja: '住まいをなくした人や、なくしそうな人のための東京都の窓口です。住まいさがし・仕事・お金を借りる相談まで、まとめて手伝ってくれます。',
        en: 'Tokyo\'s support center for people who lost (or may lose) their home: help with housing, jobs and loan advice, all in one place.'
      },
      cat: ['housing', 'work', 'money'],
      kind: 'service', basis: 'tokyo', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '住まいがなく、ネットカフェなどで寝泊まりしながら働いている人や、仕事をなくした人。働いている、または働いて自立をめざしていて、東京都内でくらしている人。' },
      how: { ja: '電話するか、窓口に行きます。女性専用の電話もあります。' },
      where: { ja: '新宿区歌舞伎町（東京都健康プラザハイジア3階）' },
      docs: [],
      ask: ['住むところがありません。今日からどうすればいいですか？', '住まいと仕事を一緒に探したいです', '部屋に入るお金がありません。借りられますか？'],
      caution: { ja: '日曜・祝日は休みです。このほかの生活の困りごとは、住んでいる地域の福祉事務所や自立相談支援機関へ。' },
      supporter: { ja: '離職中で介護職に関心がある人向けに「介護職支援コース」（介護資格を無料で取得）あり。' },
      effort: 'low',
      for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '0120-874-225', phoneLabel: 'TOKYOチャレンジネット（女性専用 0120-874-505）', line: null, chat: null,
        web: 'https://www.tokyo-challenge.net/',
        hours: { ja: '月・水・金・土 10時〜17時／火・木 10時〜20時（日・祝は休み）', en: 'Mon/Wed/Fri/Sat 10–17, Tue/Thu 10–20' }
      },
      locations: [{
        name: 'TOKYOチャレンジネット', area: '13104', addr: '東京都新宿区歌舞伎町2-44-1 東京都健康プラザハイジア3階',
        lat: 35.696693, lng: 139.701263, phone: '0120-874-225',
        hours: '月・水・金・土 10:00–17:00／火・木 10:00–20:00', note: '女性専用ダイヤル 0120-874-505'
      }],
      source: { org: 'TOKYOチャレンジネット（東京都）', url: 'https://www.tokyo-challenge.net/', checked: C },
      sources2: [{ org: '東京都福祉局（住まいに困っている）', url: 'https://www.fukushi.metro.tokyo.lg.jp/seikatsu/seikatsu_kyoju_shuro/sumai' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-shigoto-young',
      name: { ja: '東京しごとセンター ヤングコーナー', en: 'Tokyo Shigoto Center — Young Corner' },
      hook: { ja: '自分に合う仕事がわからない', en: 'I don\'t know what job suits me' },
      summary: {
        ja: '東京都の仕事さがしの窓口です。ヤングコーナーは若い人向けで、仕事の相談や就職の準備を手伝ってくれます。',
        en: 'Tokyo\'s job center. The Young Corner helps young people with career advice and job hunting.'
      },
      cat: ['work'],
      kind: 'service', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '仕事をさがしている若い人（対象の年齢は窓口で確認してね）。' },
      how: { ja: '電話するか、飯田橋の東京しごとセンターに行きます。多摩地域の人は立川の「しごとセンター多摩」も使えます。' },
      where: { ja: '千代田区飯田橋（東京しごとセンター）／立川市（しごとセンター多摩）' },
      docs: [],
      ask: ['初めて仕事をさがします。何から始めればいいですか？', '履歴書の書き方を教えてもらえますか？', '面接の練習はできますか？'],
      caution: null,
      supporter: { ja: '東京しごとセンター総合相談 03-5211-1571。公式サイト tokyoshigoto.jp はボット対策で自動確認できなかったため、窓口情報は都（産業労働局・福祉局）の資料で確認。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-5211-2851', phoneLabel: 'ヤングコーナー', line: null, chat: null, web: 'https://www.tokyoshigoto.jp/',
        hours: { ja: '月〜金 9時〜20時／土 9時〜17時（年末年始は休み）', en: 'Mon–Fri 9–20, Sat 9–17' }
      },
      locations: [
        {
          name: '東京しごとセンター（ヤングコーナー）', area: '13101', addr: '東京都千代田区飯田橋3-10-3',
          lat: 35.700005, lng: 139.749588, phone: '03-5211-2851', hours: '月〜金 9:00–20:00／土 9:00–17:00', note: ''
        },
        {
          name: '東京しごとセンター多摩', area: '13202', addr: '東京都立川市柴崎町3-9-2 3階',
          lat: 35.695484, lng: 139.412247, phone: '042-526-4510', hours: '月〜金 9:00–20:00／土 9:00–17:00', note: '多摩地域の窓口'
        }
      ],
      source: { org: '東京都産業労働局（TOKYOはたらくネット 相談窓口のご案内）', url: SHIGOTO_PDF, checked: C },
      sources2: [{ org: '東京都福祉局（女性の方への相談体制）', url: WOMEN }],
      verifiedBy: V
    },

    {
      id: 'tokyo-shushoku-daredemo',
      name: { ja: '就職だれでも相談（東京都）', en: 'Job Help for Everyone (Tokyo, LINE/phone)' },
      hook: { ja: '窓口に行く前に、気軽に仕事の相談をしたい', en: 'I want to ask about jobs casually before going anywhere' },
      summary: {
        ja: 'LINE・電話・オンラインで、就職や転職の相談が気軽にできる東京都のサービスです。',
        en: 'Tokyo\'s casual job-hunting help by LINE, phone or video call.'
      },
      cat: ['work'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '就職や転職のことを相談したい人。' },
      how: { ja: '電話するか、LINEで友だち登録して相談します（東京都福祉局のページにQRコードがあります）。ビデオ会議でも相談できます。' },
      where: { ja: 'LINE・電話・オンライン' },
      docs: [],
      ask: ['働いたことがありません。どんな仕事ができますか？', '今のバイトをやめて正社員になりたいです'],
      caution: null,
      supporter: null,
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-5211-1752', phoneLabel: '就職だれでも相談', line: null, chat: null, web: WOMEN,
        hours: { ja: '月〜土 10時〜18時（年末年始は休み）', en: 'Mon–Sat 10:00–18:00' }
      },
      locations: [],
      source: { org: '東京都福祉局（女性の方への相談体制）', url: WOMEN, checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-rodo-sodan',
      name: { ja: '東京都ろうどう110番（労働相談）', en: 'Tokyo Labor Hotline' },
      hook: { ja: 'バイト代が払われない。急にクビと言われた', en: 'I wasn\'t paid, or I was suddenly fired' },
      summary: {
        ja: 'お給料が払われない、クビ、職場のいじめ、有給休暇など、働くことの困りごとを無料で相談できます。LINE電話なら通話料はかかりません。名前を言わなくても大丈夫です。',
        en: 'Free advice on unpaid wages, dismissal, workplace bullying, paid leave and more. LINE calls are free and you can stay anonymous.'
      },
      cat: ['work', 'consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '働くことで困っている人。' },
      how: { ja: '電話するか、LINEで「労働相談情報センター」を友だち登録して「LINEで電話相談する」を押します。会って相談したいときは予約します。' },
      where: { ja: '電話・LINE電話・オンライン・窓口（予約制）' },
      docs: ['雇用契約書や労働条件通知書（あれば）', '給与明細やシフトのメモ（あれば）'],
      ask: ['バイト代が払われていません。どうすればいいですか？', '急にやめてと言われました。これは問題ありませんか？', '有給休暇はバイトでも取れますか？'],
      caution: { ja: '0570の番号は通話料がかかり、かけ放題の対象外です。LINE電話なら通話料なし（1回30分まで）。' },
      supporter: { ja: '来所相談は会社所在地で担当事務所が決まる（予約制）。飯田橋の労働相談情報センターは 03-3265-6110。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: ['work'], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '0570-00-6110', phoneLabel: '東京都ろうどう110番', line: 'https://lin.ee/RR042kg', chat: null, web: RODO,
        hours: { ja: '月〜金 9時〜20時／土 9時〜17時（祝日・年末年始は休み）', en: 'Mon–Fri 9–20, Sat 9–17' }
      },
      locations: [{
        name: '東京都 労働相談情報センター（飯田橋）', area: '13101', addr: '東京都千代田区飯田橋3-10-3 東京しごとセンター9階',
        lat: 35.700005, lng: 139.749588, phone: '03-3265-6110', hours: '月〜金 9:00–17:00（来所は予約制）',
        note: '会社が千代田・中央・新宿・渋谷・中野・杉並区・島しょにある人の担当'
      }],
      source: { org: '東京都産業労働局（TOKYOはたらくネット）', url: RODO, checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-shohi-center',
      name: { ja: '東京都消費生活総合センター', en: 'Tokyo Consumer Affairs Center' },
      hook: { ja: '契約でだまされたかも。お金のトラブルを相談したい', en: 'I think I was tricked into a contract' },
      summary: {
        ja: '買い物や契約のトラブルを無料で相談できる東京都の窓口です。借金が重なって困っている相談も受けています。',
        en: 'Tokyo\'s free help desk for shopping and contract trouble, including debt problems.'
      },
      cat: ['money', 'consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '東京都に住む・働く・学ぶ人。' },
      how: { ja: '電話するか、予約なしで飯田橋のセンターに行きます。全国共通の「188」でもつながります。' },
      where: { ja: '新宿区神楽河岸（飯田橋セントラルプラザ16階）' },
      docs: ['契約書やレシート、やりとりの画面（あれば）'],
      ask: ['ネットで契約したものをやめたいです', 'SNSで「もうかる副業」に誘われて払ってしまいました', '借金がふえて返せません'],
      caution: { ja: '1回30分くらいです。メールでの相談はできません。日曜・祝日は休みです。' },
      supporter: null,
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-3235-1155', phoneLabel: '消費生活相談', line: null, chat: null,
        web: 'https://www.shouhiseikatu.metro.tokyo.lg.jp/sodan/sodan.html',
        hours: { ja: '月〜土 9時〜17時（日・祝・年末年始は休み）', en: 'Mon–Sat 9:00–17:00' }
      },
      locations: [{
        name: '東京都消費生活総合センター', area: '13104', addr: '東京都新宿区神楽河岸1-1 飯田橋セントラルプラザ16階',
        lat: 35.700947, lng: 139.743423, phone: '03-3235-1155', hours: '月〜土 9:00–17:00', note: '予約なしで相談できます。JR・地下鉄 飯田橋駅すぐ'
      }],
      source: { org: '東京都（東京くらしWEB）', url: 'https://www.shouhiseikatu.metro.tokyo.lg.jp/sodan/sodan.html', checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-kokoro-hotline',
      name: { ja: 'こころといのちのほっとライン（東京都）', en: 'Tokyo Suicide Prevention Line' },
      hook: { ja: '生きるのがつらい', en: 'Life feels too hard' },
      summary: {
        ja: '生きるのがつらいと感じたときに、電話やLINEで話を聞いてもらえる東京都の窓口です。電話は毎日、昼12時から朝5時30分まで。',
        en: 'Tokyo\'s phone and LINE line for when life feels too hard. Phone open every day from noon to 5:30 a.m.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料（電話は通話料がかかります）', en: 'Free (call charges apply)' }, repay: null,
      who: { ja: '生きるのがつらいと感じている人。' },
      how: { ja: '電話するか、LINEで「相談ほっとLINE＠東京」を友だち登録して「生きるのがつらいと感じたら…」を選びます。' },
      where: { ja: '電話・LINE' },
      docs: [],
      ask: ['今、とてもつらいです。話を聞いてもらえますか？'],
      caution: { ja: '0570の番号は通話料がかかり、かけ放題の対象外です。今すぐ危ないときは119番・110番へ。' },
      supporter: null,
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '0570-087478', phoneLabel: '東京都自殺相談ダイヤル', line: null, chat: null, web: WOMEN,
        hours: { ja: '電話: 毎日 12時〜翌5時30分／LINE: 毎日 15時〜22時30分', en: 'Phone daily 12:00–5:30; LINE daily 15:00–22:30' }
      },
      locations: [],
      source: { org: '東京都福祉局（女性の方への相談体制）', url: WOMEN, checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-wakasapo',
      name: { ja: 'わかさぽ（とうきょう若者ヘルスサポート）', en: 'Wakasapo (Tokyo Teen Health Support)' },
      hook: { ja: 'からだや心のことを、こっそり聞きたい', en: 'I want to ask about my body or feelings privately' },
      summary: {
        ja: '10代のからだや心の悩みに、看護師などが電話やメールで答えてくれます。無料のフリーダイヤルです。',
        en: 'Nurses answer teens\' questions about their body and mind by free phone or email.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '東京都に住む・学ぶ・働く、中学生以上の10代の人。' },
      how: { ja: '電話（0120-372-463 みんなに・よりそう）かメールで相談します。' },
      where: { ja: '電話・メール' },
      docs: [],
      ask: ['生理や体のことで不安があります', '気持ちが落ちこんで眠れません'],
      caution: { ja: 'メールはいつでも送れますが、返事は電話と同じ時間帯にきます。' },
      supporter: null,
      effort: 'low',
      for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'left0', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 12, max: 19 }, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '0120-372-463', phoneLabel: 'わかさぽ', line: null, chat: null, web: WOMEN,
        hours: { ja: '月〜金 15時〜20時／土・日 9時〜14時（元日は休み）', en: 'Mon–Fri 15–20, Sat/Sun 9–14' }
      },
      locations: [],
      source: { org: '東京都福祉局（女性の方への相談体制）', url: WOMEN, checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-ninshin-hotline',
      name: { ja: '妊娠相談ほっとライン（東京都）', en: 'Tokyo Pregnancy Hotline' },
      hook: { ja: '妊娠したかもしれない。だれにも言えない', en: 'I might be pregnant and can\'t tell anyone' },
      summary: {
        ja: '思いがけない妊娠や体のこと、お金の心配を、看護師などに相談できます。ひとりで病院や薬局に行けないときは、付きそいの支援もあります。',
        en: 'Talk to nurses about an unexpected pregnancy, your health or costs. If you can\'t go to a clinic or pharmacy alone, someone can go with you.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料（付きそいのときの診察代などを助成する場合あり）', en: 'Free (some medical costs may be covered)' }, repay: null,
      who: { ja: '東京都に住む人。' },
      how: { ja: '電話かメールで相談します。電話がこわいときは、24時間使えるチャットボット「妊娠したかも相談＠東京」もあります。' },
      where: { ja: '電話・メール・チャットボット' },
      docs: [],
      ask: ['妊娠したかもしれません。まず何をすればいいですか？', '病院に一人で行くのが不安です', '緊急避妊薬はどこでもらえますか？'],
      caution: { ja: 'メールの返事は最長1日くらいかかります。2日たっても返事がないときは、もう一度送ってください。' },
      supporter: { ja: '東京都委託（運営: 株式会社メディカル・コンシェルジュ）。医療機関・薬局への同行支援はNPO法人フローレンスに委託、都内在住・在学で対象と判断された人。診療・処方費を公費助成（就労者は原則対象外）。' },
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-5339-1133', phoneLabel: '妊娠相談ほっとライン', line: null,
        chat: 'https://www17.webcas.net/form/pub/concier/ninshinhotline',
        web: 'https://www.fukushi.metro.tokyo.lg.jp/kodomo/sodan/ninshin-hotline',
        hours: { ja: '毎日 10時〜22時（元日は休み）', en: 'Daily 10:00–22:00' }
      },
      locations: [],
      source: { org: '東京都福祉局', url: 'https://www.fukushi.metro.tokyo.lg.jp/kodomo/sodan/ninshin-hotline', checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-josei-center',
      name: { ja: '東京都女性相談支援センター', en: 'Tokyo Women\'s Support Center' },
      hook: { ja: '家や恋人から逃げたい。安全な場所がほしい', en: 'I need to get away from my home or partner and be safe' },
      summary: {
        ja: '女性のさまざまな悩みを聞く東京都の窓口です。暴力（DV）から逃げたいときの相談や、急いで保護が必要なときの支援もしています。',
        en: 'Tokyo\'s help center for women, including escaping violence and urgent protection.'
      },
      cat: ['consult', 'housing'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '女性。23区に住む人は本所、多摩・島しょに住む人は多摩支所へ。' },
      how: { ja: '電話で相談します。LINE相談「女性はーとふるLINE＠東京」もあります。' },
      where: { ja: '電話・LINE（場所は安全のため公開していません）' },
      docs: [],
      ask: ['家にいるのがこわいです。どうすればいいですか？', '今夜泊まれる安全な場所はありますか？'],
      caution: { ja: '危険がせまっているときは、すぐ110番へ。1回の相談は20分くらいです。上の電話は23区の本所です。多摩・島しょに住む人は 多摩支所 042-522-4232（月〜金 9時〜16時、祝日・年末年始は休み）へ。' },
      supporter: { ja: '多摩支所 042-522-4232（月〜金 9時〜16時、祝日・年末年始除く）。配偶者暴力相談支援センターを兼ねる。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-5261-3110', phoneLabel: '女性相談支援センター（23区）', line: 'https://www.fukushi.metro.tokyo.lg.jp/kodomo/sodan/linesodan', chat: null,
        web: WOMEN,
        hours: { ja: '月〜金 9時〜21時／土日祝・年末年始 9時〜17時', en: 'Mon–Fri 9–21; weekends/holidays 9–17' }
      },
      locations: [],
      source: { org: '東京都福祉局（女性の方への相談体制）', url: WOMEN, checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-womens-plaza',
      name: { ja: '東京ウィメンズプラザ 相談', en: 'Tokyo Women\'s Plaza helpline' },
      hook: { ja: '恋人や家族との関係がつらい', en: 'My relationship with my partner or family hurts' },
      summary: {
        ja: '恋人や家族からの暴力、親子の問題、人間関係、生き方の悩みを電話で相談できます。DVの相談はLINE「ささえるライン＠東京」でもできます。',
        en: 'Phone help for violence from partners or family, parent-child problems and relationships. DV help also by LINE.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '電話相談は女性向け。' },
      how: { ja: '電話するか、LINEで「ささえるライン＠東京」を友だち登録します（DVの相談）。' },
      where: { ja: '電話・LINE' },
      docs: [],
      ask: ['恋人に束縛されていてつらいです', '家族との関係で悩んでいます'],
      caution: { ja: 'DV専用の電話は 03-5467-1721 です。危険がせまっているときは110番へ。' },
      supporter: null,
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-5467-2455', phoneLabel: '一般相談（DV専用 03-5467-1721）', line: null, chat: null, web: WOMEN,
        hours: { ja: '電話: 9時〜21時／LINE: 14時〜20時（年末年始は休み）', en: 'Phone 9–21; LINE 14–20' }
      },
      locations: [],
      source: { org: '東京都福祉局（女性の方への相談体制）', url: WOMEN, checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-tmc-navi',
      name: { ja: '東京都多言語相談ナビ（TMC Navi）', en: 'Tokyo Multilingual Consultation Navi (TMC Navi)' },
      hook: { ja: '日本語の手続きがむずかしい', en: 'Japanese paperwork is hard for me' },
      summary: {
        ja: '東京でくらす外国の人の困りごとに、14の言語（やさしい日本語も）で答えてくれる電話窓口です。',
        en: 'A free phone line answering everyday questions for foreign residents of Tokyo in 14 languages, including easy Japanese.'
      },
      cat: ['procedures', 'consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '東京都でくらす外国の人。' },
      how: { ja: 'フリーダイヤルに電話します。' },
      where: { ja: '電話' },
      docs: [],
      ask: ['在留カードや住民票の手続きを教えてください', '私の言葉で話せる人はいますか？'],
      caution: null,
      supporter: { ja: '運営: 公益財団法人東京都つながり創生財団。対応言語: やさしい日本語・英語・中国語・韓国語・ベトナム語・タガログ語・ネパール語・ヒンディー語・タイ語・ポルトガル語・スペイン語・インドネシア語・フランス語・ロシア語。' },
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '0120-142-142', phoneLabel: 'TMC Navi', line: null, chat: null, web: WOMEN,
        hours: { ja: '月〜金 10時〜16時（年末年始は休み）', en: 'Mon–Fri 10:00–16:00' }
      },
      locations: [],
      source: { org: '東京都福祉局（女性の方への相談体制）', url: WOMEN, checked: C },
      verifiedBy: V
    },

    /* ───────── 住まい ───────── */
    {
      id: 'tokyo-sasaeru-jutaku',
      name: { ja: '東京ささエール住宅', en: 'Tokyo Sasaeru Housing (safety-net rentals)' },
      hook: { ja: '保証人がいなくて、部屋を借りるのが不安', en: 'I worry landlords will turn me down' },
      summary: {
        ja: '住まいさがしに困っている人の入居を断らないと登録された、東京都の賃貸住宅です。東京都では「児童養護施設を出た人」も対象に入っています。',
        en: 'Rental homes registered in Tokyo as not refusing people who struggle to find housing. Tokyo includes people who left children\'s homes in this group.'
      },
      cat: ['housing'],
      kind: 'housing', basis: 'tokyo', right: false,
      amount: null, repay: null,
      who: { ja: '住まいさがしに困っている人（収入が少ない人、子育て中の人など）。東京都の計画では、児童養護施設を出た人もふくまれます。' },
      how: { ja: '国の「セーフティネット住宅情報提供システム」で部屋をさがします。住まいさがしの相談は、住んでいる区市町村の住宅や福祉の窓口へ。' },
      where: { ja: 'インターネットでさがす／区市町村の窓口' },
      docs: [],
      ask: ['児童養護施設を出た人でも入れるささエール住宅はありますか？', '家賃や保証料の手伝いはありますか？'],
      caution: { ja: 'ふつうの賃貸と同じように、契約や審査があります。契約の前に、内容をだれかと一緒に確認しよう。部屋ごとに、受け入れる人の範囲が決まっています。' },
      supporter: { ja: '東京都住宅確保要配慮者賃貸住宅供給促進計画（2022年3月改定）で、法・省令の対象に加え「児童養護施設退所者」を住宅確保要配慮者としている。八王子市の住宅は八王子市の登録制度。' },
      effort: 'mid',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: null, phoneLabel: null, line: null, chat: null,
        web: 'https://www.juutakuseisaku.metro.tokyo.lg.jp/safety_net/chintaitourokuseido', hours: null
      },
      locations: [],
      source: { org: '東京都住宅政策本部', url: 'https://www.juutakuseisaku.metro.tokyo.lg.jp/safety_net/chintaitourokuseido', checked: C },
      sources2: [{ org: '東京都住宅政策本部（供給促進計画）', url: 'https://www.juutakuseisaku.metro.tokyo.lg.jp/documents/d/juutakuseisaku/sokushin_01' }],
      verifiedBy: V
    },

    /* ───────── 都内のNPO ───────── */
    {
      id: 'sankakusha',
      name: { ja: 'サンカクシャ', en: 'Sankakusha' },
      hook: { ja: '頼れる大人がいない。住まいと仕事を立て直したい', en: 'I have no adult to rely on and need to rebuild housing and work' },
      summary: {
        ja: '親や身近な大人を頼れない15〜25歳くらいの若者に、居場所・仕事・住まいのサポートをしている豊島区のNPOです。',
        en: 'A Toshima-based NPO supporting young people (about 15–25) who can\'t rely on their parents, with a drop-in space, work and housing help.'
      },
      cat: ['housing', 'work', 'consult'],
      kind: 'service', basis: 'npo', right: false,
      amount: null, repay: null,
      who: { ja: '親や身近な大人を頼れない、15歳〜25歳くらいの若者。' },
      how: { ja: 'LINEかフォームで問い合わせ → スタッフと面談 → 必要なら見学 → サポート開始、の順です。' },
      where: { ja: '豊島区上池袋' },
      docs: [],
      ask: ['新しい相談の受付は始まっていますか？', '住む場所のサポートはどんな内容ですか？'],
      caution: { ja: '2026年8月12日から、新しい相談の受付をしばらく休んでいます。再開の案内は2026年12月ごろの予定です。' },
      supporter: { ja: '居場所「サンカクキチ」は週4日（火・水・木・土）、利用・夕食は無料。支援団体からの紹介も受付（再開後）。' },
      effort: 'low',
      for: { stages: ['hs12', 'hs3', 'left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 15, max: 25 }, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-6905-8287', phoneLabel: 'サンカクシャ（新しい相談は休止中）', line: 'https://lin.ee/FtTpB4Z', chat: 'https://www.sankakusha.or.jp/administration/soudan_form/',
        web: 'https://www.sankakusha.or.jp/administration', hours: null
      },
      locations: [{
        name: 'サンカクシャ', area: '13116', addr: '東京都豊島区上池袋4-35-12 3階',
        lat: 35.74215, lng: 139.71960, phone: '03-6905-8287', hours: '居場所は週4日（火・水・木・土）', note: '新しい相談は休止中（2026年12月ごろ案内予定）'
      }],
      source: { org: '特定非営利活動法人サンカクシャ', url: 'https://www.sankakusha.or.jp/administration', checked: C },
      verifiedBy: V
    },

    /* ───────── v3: 中学生・高校生のための東京都の支援（2026-10-17 確認）───────── */
    {
      id: 'tokyo-shiritsu-jugyoryo',
      name: { ja: '私立高校の授業料軽減助成金（東京都）', en: 'Tokyo Private High School Tuition Subsidy' },
      hook: { ja: '私立高校に行きたいけど、授業料が高い', en: 'I want to go to a private high school but tuition is expensive' },
      summary: {
        ja: '国の就学支援金に東京都が上乗せして、私立高校の授業料を年50万1,000円まで助けてくれます。所得制限はありません。国と都の両方に申しこむ必要があります。',
        en: 'Tokyo adds to the national tuition support so private high school tuition is covered up to ¥501,000 a year. No income limit. You must apply to both the national and Tokyo schemes.'
      },
      cat: ['education', 'money'],
      kind: 'grant', basis: 'tokyo', right: false,
      amount: {
        ja: '都の助成 年4万3,800円まで（国の就学支援金 年45万7,200円とあわせて最大 年50万1,000円。実際に払った授業料まで）',
        en: 'Tokyo pays up to ¥43,800/year (with the national ¥457,200, up to ¥501,000/year, capped at actual tuition)'
      },
      repay: 'none',
      who: { ja: '本人と保護者が東京都に住んでいて、私立高校（全日制・定時制など）に通う生徒の保護者。国の就学支援金をもらえる人。都の外の私立高校に通っていても対象です。' },
      how: { ja: '毎年7月ごろ、保護者がスマホかパソコンで東京都私学財団の申請サイトから申しこみます（毎年必要）。国の就学支援金は、学校を通して別に申しこみます。' },
      where: { ja: '東京都私学財団（オンライン申請）' },
      docs: ['申請サイトのアカウント（メールアドレス）', '奨学給付金もいっしょに申しこむときは課税証明書'],
      ask: ['私の学校の授業料だと、国と都でいくらまで助けてもらえますか？', '今年の申請はいつですか？申しこみ忘れたらどうなりますか？', '奨学給付金もいっしょに申しこめますか？'],
      caution: { ja: '授業料だけが対象で、施設費などはふくまれません。7月の受付を過ぎると、1月の特別申請まで待つことになります。国の就学支援金だけで授業料が全部まかなえるときは、申しこまなくて大丈夫です。' },
      supporter: { ja: '（公財）東京都私学財団が実施。令和8年度は通常申請7月、特別申請は令和9年1月上旬（12月に案内）。振込は都内校10月・12月・3月。都認可通信制は令和8年度の時期が例年と異なる。中3の進路相談の段階で「私立でも授業料は国＋都で年50万1,000円まで」と伝えると選択肢が広がる。' },
      effort: 'mid',
      for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['13'] },
      deadline: {
        ja: '毎年7月に申請（令和8年度の通常分は終了。特別申請は令和9年1月上旬の予定）',
        en: 'Apply every July (special window early January)',
        leaveMonths: null, months: [7, 1], always: false
      },
      contact: {
        phone: '03-5206-7925', phoneLabel: '東京都私学就学支援金センター 授業料軽減担当（高校）', line: null, chat: null,
        web: 'https://www.shigaku-tokyo.or.jp/parents_index/pa_jugyoryo/',
        hours: { ja: '平日 9時15分〜17時', en: 'Weekdays 9:15–17:00' }
      },
      locations: [],
      source: { org: '公益財団法人 東京都私学財団', url: 'https://www.shigaku-tokyo.or.jp/parents_index/pa_jugyoryo/', checked: C3 },
      verifiedBy: V
    },

    {
      id: 'tokyo-toritsu-jugyoryo',
      name: { ja: '都立高校の授業料（就学支援金で実質0円）', en: 'Tokyo Metropolitan High School Tuition (covered in full)' },
      hook: { ja: '都立高校の授業料って、いくらかかるの？', en: 'How much is tuition at a Tokyo public high school?' },
      summary: {
        ja: '都立高校の授業料（全日制で年11万8,800円）は、国の就学支援金でまかなわれます。2026年度から所得制限がなくなりました。ただし、学校から案内が来たときに手続きをしないと、授業料を払うことになります。',
        en: 'Tuition at Tokyo public high schools (¥118,800/year full-time) is covered by national support, with no income limit from 2026. But if you skip the paperwork when school asks, you have to pay.'
      },
      cat: ['education', 'procedures'],
      kind: 'procedure', basis: 'tokyo', right: true,
      amount: { ja: '授業料の分（全日制 月9,900円＝年11万8,800円、定時制 月2,700円）を国が学校に払う', en: 'Covers tuition (full-time ¥9,900/month = ¥118,800/year; part-time ¥2,700/month)' },
      repay: 'none',
      who: { ja: '都立高校・都立中等教育学校の後期課程・都立特別支援学校の高等部に通う生徒。高校を卒業したことがある人は対象外です。' },
      how: { ja: '入学すると学校から「システム利用開始情報通知書」が配られます。それを見て、都のオンライン申請システムで申請します（2026年度は在校生もふくめ全員。都立特別支援学校は学校ごとのフォーム）。お金は学校が受け取り、家には振り込まれません。' },
      where: { ja: '通っている都立高校の経営企画室' },
      docs: ['学校から配られる案内にそって入力'],
      ask: ['就学支援金の手続きはいつまでですか？', '施設や里親家庭にいる場合、だれが申請しますか？', '授業料以外にかかるお金を助けてもらえる制度はありますか？'],
      caution: { ja: '手続きをしないと、授業料を払うことになります。授業料のほかに、教科書代・修学旅行代などは別にかかります（給付型奨学金や奨学のための給付金を見てね）。' },
      supporter: { ja: '支給期間は最大36か月（定時制・通信制48か月）。高校中退後の学び直しは「学び直し支援金」で最長12か月（定時制・通信制24か月）延長。国籍・在留資格で対象外の生徒には「高校生等・新修学支援金」。都立高校のオンライン申請は令和8年度は1月9日まで（新入生・在校生共通）。問い合わせ: 教育庁 高等学校教育課経理担当 03-5320-7862。都立特別支援学校の場合の問い合わせ: 特別支援教育課経理担当 03-5320-6754。' },
      effort: 'low',
      for: { stages: ['jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['13'] },
      deadline: { ja: '入学後、学校が知らせる期限まで（2026年度のオンライン申請は1月9日まで）', en: 'By the deadline your school gives (2026 online applications: until January 9)', leaveMonths: null, months: [4], always: false },
      contact: {
        phone: '03-5320-7862', phoneLabel: '東京都教育庁 高等学校教育課 経理担当', line: null, chat: null,
        web: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/scholarship', hours: null
      },
      locations: [],
      source: { org: '東京都教育委員会（高等学校等就学支援金事業について）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/scholarship', checked: C3 },
      sources2: [{ org: '東京都教育委員会（各種支援制度のオンライン申請について）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/starting_application_online' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-toritsu-kyufugata',
      name: { ja: '東京都立学校等 給付型奨学金', en: 'Tokyo Public School Scholarship (school activity costs)' },
      hook: { ja: '修学旅行や模試のお金が心配', en: 'I\'m worried about the cost of school trips and practice exams' },
      summary: {
        ja: '修学旅行・模試・検定試験などの費用を、東京都が保護者のかわりに学校へ払ってくれます。返さなくていいお金です。2026年度から対象の家庭が広がりました。',
        en: 'Tokyo pays the school directly for trips, practice exams and qualification tests. No repayment. More families qualify from 2026.'
      },
      cat: ['education', 'money'],
      kind: 'grant', basis: 'tokyo', right: false,
      amount: { ja: '年5万円まで（生活保護・住民税の所得割が非課税の家庭）／年3万円まで（所得割の合計が18万2,500円未満の家庭）', en: 'Up to ¥50,000/year (lowest-income) or ¥30,000/year' },
      repay: 'none',
      who: { ja: '都立高校（中等教育学校の後期課程をふくむ）・都内の一部の国公立高校・都立特別支援学校の高等部などに通う、収入の条件にあう家庭の生徒（年収のめやす 約490万円未満）。' },
      how: { ja: '学校から配られる案内にそって申しこみます（都立高校はオンライン）。認められると、学校が決めた対象の費用を、上限まで払わずに参加できます。' },
      where: { ja: '通っている学校の経営企画室・事務室' },
      docs: ['申請書（学校で配布、または オンライン）', 'マイナンバー収集台紙（都立学校で配布）または住民税の課税証明書など'],
      ask: ['給付型奨学金の申しこみはいつまでですか？', '修学旅行のお金も対象になりますか？', '端末（タブレット）を買う支援もありますか？'],
      caution: { ja: 'お金は家に振り込まれず、都が学校に払います。施設などで措置費（見学旅行費など）が出ている場合は対象外です。' },
      supporter: { ja: '給付型奨学金の認定世帯には、都立高校の端末購入の保護者負担（3万円）支援もある。家計急変で対象になる場合あり。問い合わせ: 教育庁 高等学校教育課経理担当 03-5320-7862。都立特別支援学校の場合の問い合わせ: 特別支援教育課経理担当 03-5320-6754。' },
      effort: 'mid',
      for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['13'] },
      deadline: { ja: '学校が知らせる期限まで', en: 'By the deadline your school gives', leaveMonths: null, months: null, always: false },
      contact: {
        phone: '03-5320-7862', phoneLabel: '東京都教育庁 高等学校教育課 経理担当', line: null, chat: null,
        web: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/non-refundable_scholarship', hours: null
      },
      locations: [],
      source: { org: '東京都教育委員会（東京都立学校等給付型奨学金制度）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/non-refundable_scholarship', checked: C3 },
      verifiedBy: V
    },

    {
      id: 'tokyo-kokoritsu-kyufukin',
      name: { ja: '東京都 国公立高校等 奨学のための給付金', en: 'Tokyo Scholarship Benefit for Public High School Students' },
      hook: { ja: '教科書や制服、学用品のお金が足りない', en: 'I can\'t afford textbooks, uniforms or school supplies' },
      summary: {
        ja: '都立などの国公立高校に通う生徒の家庭に、教科書代や学用品代などとして、返さなくていいお金を出してくれます。2026年度から年収490万円くらいの家庭まで広がりました。',
        en: 'A non-repayable benefit for families of students at Tokyo public high schools, for textbooks, supplies and trips. Extended to households earning about ¥4.9 million from 2026.'
      },
      cat: ['education', 'money'],
      kind: 'grant', basis: 'tokyo', right: false,
      amount: {
        ja: '全日制・定時制で 年3万5,930円〜14万3,700円（住民税が非課税の家庭は14万3,700円、生活保護の家庭は3万2,300円）',
        en: 'Full/part-time: ¥35,930–¥143,700 a year (¥143,700 for tax-exempt households; ¥32,300 on welfare)'
      },
      repay: 'none',
      who: { ja: '保護者が東京都に住んでいて、都立などの国公立高校に通う生徒がいる家庭のうち、生活保護を受けている家庭か、住民税の所得割の合計が18万2,500円未満の家庭。私立高校の人は東京都私学財団の制度です。' },
      how: { ja: '学校から案内がきたら、通っている学校を通して申しこみます（都立高校はオンライン。基準日は毎年7月1日）。入学したばかりの1年生には、早めにもらえる「一部早期給付」もあります。' },
      where: { ja: '通っている学校の経営企画室' },
      docs: ['申請（都立はオンライン）', '口座振替依頼書と通帳のコピー', 'マイナンバー収集台紙 または 住民税の課税証明書など', '住民票の写し'],
      ask: ['奨学のための給付金の申しこみはいつですか？', '1年生の早期給付はいつ申しこめますか？', '家の収入が急に減ったときも申しこめますか？'],
      caution: { ja: '令和8年度の通常の受付は終わりました。家計が急に苦しくなった家庭は令和9年1月末まで申しこめます（都立のオンライン申請は1月9日まで）。施設などで措置費（見学旅行費など）が出ている人は対象外です。私立高校の人は東京都私学就学支援金センター 03-5206-7925 へ。' },
      supporter: { ja: '親権者が児童相談所長・児童福祉施設長・法人後見人などの場合、その所得は審査対象外（いないものとみなして書類提出）。保護者がいない場合は扶養誓約書。私立は東京都私学財団の奨学給付金（授業料軽減助成金と同時申請可）。令和8年度の都立の申請期間：一部早期給付（新入生のみ・年額の4分の1、9月ごろ支給）は7月7日まで、通常申請は7月8日〜9月15日（12月末までに振込予定）。' },
      effort: 'mid',
      for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['13'] },
      deadline: {
        ja: '通常の申請は7月8日〜9月15日（基準日7月1日）。令和8年度の通常分は終了。家計急変は令和9年1月末まで',
        en: 'Regular applications 8 July–15 September (FY2026; base date July 1). The 2026 regular window is closed (sudden income drop: until end of Jan 2027)',
        leaveMonths: null, months: [7, 8, 9], always: false
      },
      contact: { phone: '03-5320-7862', phoneLabel: '東京都教育庁 高等学校教育課 経理担当', line: null, chat: null, web: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/scholarship_public_school', hours: null },
      locations: [],
      source: { org: '東京都教育委員会（東京都国公立高等学校等奨学のための給付金事業のお知らせ）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/scholarship_public_school', checked: C3 },
      sources2: [{ org: '公益財団法人 東京都私学財団（私立の奨学給付金は授業料軽減助成金と同時申請）', url: 'https://www.shigaku-tokyo.or.jp/parents_index/pa_jugyoryo/' }, { org: '東京都教育委員会（各種支援制度のオンライン申請について）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/starting_application_online' }, { org: '東京都教育委員会（新入生への一部早期給付）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/scholarship_public_school/scholarship_public_school_early_package' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-jicen-4152',
      name: { ja: '4152（よいこに）電話相談（東京都児童相談センター）', en: 'Tokyo Child Guidance Center Phone Line "4152"' },
      hook: { ja: '友だちや学校、家のことで悩んでいる', en: 'I\'m struggling with friends, school or home' },
      summary: {
        ja: '18歳未満の子どものことなら、なんでも相談できる東京都の電話です。子ども本人もかけられます。名前を言わなくても大丈夫です。',
        en: 'Tokyo\'s phone line for anything about children under 18. Kids can call too, and you don\'t have to give your name.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: null, repay: null,
      who: { ja: '東京都に住んでいるか、東京都の学校に通っている子どもと、その保護者など。' },
      how: { ja: '03-3366-4152 に電話します。終わりの時間の30分前までにかけると、ゆっくり話せます。' },
      where: { ja: '電話' },
      docs: [],
      ask: ['友だちとうまくいきません', '学校に行きたくないです', '家にいるのがつらいです'],
      caution: { ja: '秘密は守られます。でも、命や体があぶないと判断されたときは、児童相談所や警察と情報を共有することがあります。番号のかけまちがいに気をつけてね。' },
      supporter: { ja: '聴覚言語障害者相談FAX 03-3366-6036（回答に日数を要することあり）。' },
      effort: 'low',
      for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 6, max: 17 }, areas: ['13'] },
      deadline: { ja: 'いつでも（受付時間内）', en: 'Anytime during hours', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-3366-4152', phoneLabel: '4152（よいこに）電話相談', line: null, chat: null,
        web: 'https://www.fukushi.metro.tokyo.lg.jp/shisetsu/jicen/annai/4152',
        hours: { ja: '月〜金 9時〜21時／土・日・祝 9時〜17時（12月29日〜1月3日は休み）', en: 'Mon–Fri 9–21, Sat/Sun/holidays 9–17 (closed Dec 29–Jan 3)' }
      },
      locations: [],
      source: { org: '東京都福祉局（児童相談センター 4152電話相談）', url: 'https://www.fukushi.metro.tokyo.lg.jp/shisetsu/jicen/annai/4152', checked: C3 },
      sources2: [{ org: '東京都保健医療局（子供・若者の相談窓口一覧）', url: 'https://www.hokeniryo.metro.tokyo.lg.jp/kenkou/tokyokaigi/madoguti/kodomo' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-kodomo-net',
      name: { ja: '話してみなよ 東京子供ネット', en: 'Tokyo Kodomo Net (children\'s rights helpline)' },
      hook: { ja: 'いじめ・体罰・虐待をうけている', en: 'I\'m being bullied, physically punished or abused' },
      summary: {
        ja: 'いじめ・体罰・虐待などで、自分の権利が守られていないときの子ども専用の相談先です。無料の電話のほか、メールや手紙でも相談できます。弁護士などの専門員が、解決まで動いてくれることもあります。',
        en: 'A free helpline just for children whose rights aren\'t being protected — bullying, physical punishment, abuse. Phone, web form or letter. Specialists such as lawyers can step in to help solve it.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料（フリーダイヤル）', en: 'Free' }, repay: null,
      who: { ja: '子ども本人。いじめ・体罰・虐待・性被害などを受けたとき、それに気づいたとき、そのことで悩んでいるとき。' },
      how: { ja: '0120-874-374（はなしてみなよ）に電話します。携帯電話からもかけられます。電話がむずかしいときは、ページのメールフォームから送れます。' },
      where: { ja: '電話・メールフォーム・手紙' },
      docs: [],
      ask: ['SNSで悪口を言われています', '先生に無理やり正座させられました', '大人から暴力をふるわれています'],
      caution: { ja: 'すぐに危ないときは110番へ。' },
      supporter: { ja: '東京都児童相談センターが事務局の「子供の権利擁護専門相談事業」（平成16年度〜）。状況により権利擁護専門員（弁護士・福祉関係者）の面接相談（要予約）につなぎ、事実確認・関係機関への助言や調整を行う。事務局 03-5937-2305。' },
      effort: 'low',
      for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 6, max: 17 }, areas: ['13'] },
      deadline: { ja: 'いつでも（受付時間内）', en: 'Anytime during hours', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '0120-874-374', phoneLabel: '東京子供ネット（無料）', line: null, chat: null,
        web: 'https://www.fukushi.metro.tokyo.lg.jp/shisetsu/jicen/annai/keriyougo',
        hours: { ja: '月〜金 9時〜21時／土・日・祝 9時〜17時（12月29日〜1月3日は休み）', en: 'Mon–Fri 9–21, Sat/Sun/holidays 9–17 (closed Dec 29–Jan 3)' }
      },
      locations: [],
      source: { org: '東京都福祉局（子供の権利擁護専門相談事業）', url: 'https://www.fukushi.metro.tokyo.lg.jp/shisetsu/jicen/annai/keriyougo', checked: C3 },
      sources2: [{ org: '東京都福祉局（子供の権利擁護専門相談事業 リーフレット：受付時間）', url: 'https://www.fukushi.metro.tokyo.lg.jp/documents/d/fukushi/r7kenri-yougo-pdf' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-soudan-line',
      name: { ja: '相談ほっとLINE＠東京', en: 'Soudan Hot LINE @ Tokyo' },
      hook: { ja: '消えてしまいたいくらいつらい。電話はこわい', en: 'I feel so bad I want to disappear, and calling is scary' },
      summary: {
        ja: 'LINEで文字だけで相談できる東京都の窓口です。毎日15時〜23時。「話してみよう 子供専用」や「ネット・スマホで困ったら」の相談も、同じアカウントでできます。',
        en: 'Tokyo\'s text-only LINE counseling, daily 15:00–23:00. The same account also handles a kids-only channel and help with internet/smartphone trouble.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '東京都に住む・通う・働く人で、消えてしまいたいほどつらい気持ちや悩みがある人。' },
      how: { ja: 'LINEで「相談ほっとLINE@東京」をさがして友だち追加し、メッセージを送ります（受付は22時30分まで）。' },
      where: { ja: 'LINE' },
      docs: [],
      ask: ['今つらくて、だれかに聞いてほしいです', '家にいるのがしんどいです'],
      caution: { ja: 'こんでいるとすぐに返事がこないことがあります。急ぐときはメニューの「ここナビ」からほかの相談先も探せます。命があぶないときは119番・110番へ。' },
      supporter: { ja: '東京都保健医療局 健康推進課。若年層の自殺防止対策。秘密は守るが、身体・生命の危険がある場合は警察等と共有する場合あり。「若ナビα」「性被害相談窓口」「こころのLINE相談」も同一アカウント。' },
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: { ja: '毎日（15時〜23時）', en: 'Daily 15:00–23:00', leaveMonths: null, months: null, always: true },
      contact: {
        phone: null, phoneLabel: null, line: null, chat: null,
        web: 'https://www.hokeniryo.metro.tokyo.lg.jp/kenkou/tokyokaigi/rinji1/linesoudan',
        hours: { ja: '毎日 15時〜23時（受付は22時30分まで）', en: 'Daily 15:00–23:00 (last entry 22:30)' }
      },
      locations: [],
      source: { org: '東京都保健医療局（東京都でLINE相談を実施します）', url: 'https://www.hokeniryo.metro.tokyo.lg.jp/kenkou/tokyokaigi/rinji1/linesoudan', checked: C3 },
      verifiedBy: V
    },

    {
      id: 'tokyo-kyoiku-sodan',
      name: { ja: '東京都教育相談センター（いじめ相談ホットライン・高校進学の相談）', en: 'Tokyo Education Counseling Center (bullying hotline & high school advice)' },
      hook: { ja: 'いじめや学校のこと、高校進学のことを相談したい', en: 'I want to talk about bullying, school or getting into high school' },
      summary: {
        ja: '学校や勉強のことを相談できる東京都の窓口です。いじめなどの相談は24時間つながる無料の電話。都立高校の入学・進路の相談や、学校に行けていない人・高校をやめた人のための相談もあります。',
        en: 'Tokyo\'s counseling center for school matters: a free 24-hour line for bullying and other worries, plus advice on getting into Tokyo public high schools and support for students out of school.'
      },
      cat: ['consult', 'education'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: null, repay: null,
      who: { ja: '高校生くらいの年齢までの子どもと、その保護者。' },
      how: { ja: 'いじめや学校のことは 0120-53-8288（24時間）。都立高校の入学・進路は 03-3360-4175。学校に行けていない・高校をやめた人の進路は「青少年リスタートプレイス」03-3360-4192。来所での相談もできます。' },
      where: { ja: '電話（来所相談は 新宿区北新宿 東京都子供家庭総合センター4階）' },
      docs: [],
      ask: ['いじめられています。どうすればいいですか？', '都立高校の入試について知りたいです', '中学校に行けていません。高校に行けますか？'],
      caution: { ja: 'すぐに危ないときは110番へ。英語・中国語・韓国語の通訳つき相談は金曜の午後です。' },
      supporter: { ja: '高校進級・進路・入学相談 月〜土 9:00–17:00。青少年リスタートプレイス／思春期サポートプレイス 平日 9:00–17:00（03-3360-4192）。学校問題解決サポートセンター 03-3360-4195。' },
      effort: 'low',
      for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 6, max: 18 }, areas: ['13'] },
      deadline: { ja: 'いつでも', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '0120-53-8288', phoneLabel: '東京都いじめ相談ホットライン（教育相談一般・24時間）', line: null, chat: null,
        web: 'https://www.kyoiku.metro.tokyo.lg.jp/consulting/students_parents/window',
        hours: { ja: '24時間', en: '24 hours' }
      },
      locations: [{
        name: '東京都教育相談センター（東京都子供家庭総合センター4階）', area: '13104', addr: '東京都新宿区北新宿4-6-1',
        lat: 35.707607, lng: 139.694107, phone: '03-3360-4175', hours: '高校進級・進路・入学相談: 月〜土 9:00–17:00', note: '来所相談は希望すればできます'
      }],
      source: { org: '東京都教育委員会（教育についての相談）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/consulting/students_parents/window', checked: C3 },
      verifiedBy: V
    }

  );
})();
;
/* ---- data/programs-local.js ---- */
/* 巣立ちマップ v3 — data/programs-local.js (A5 / DATA-T)
 * 区市町村の支援。
 *  (1) 23区・26市（＋西多摩の町村）の「くらしとしごとの相談窓口」（生活困窮者自立支援法の自立相談支援機関）
 *  (2) 区独自の、施設や里親家庭を巣立つ若者（ケアリーバー）向けの支援
 *  (3) v3: 62区市町村の子供家庭支援センター（中学生・高校生の身近な相談先）
 *  (4) v3: 23区の子どもの学習・生活支援事業（生活困窮世帯の子どもの学習支援）
 * (1)(2) は 2026-10-16、(3)(4) は 2026-10-17 に各区市（または東京都福祉局）の公式ページを読んで確認しました。
 * わからない項目は null にしています（推測で埋めていません）。
 * 座標は 国土地理院 住所検索API で住所から求めました。
 *
 * 追加フィールド（SPEC外・任意）: eligibleBy
 *   'residence' … その区市に「住んでいる人」が対象（for.areas = [その区市]）
 *   'origin'    … 住んでいる場所ではなく「どの区の施設・里親・児童相談所から巣立ったか」で決まる
 *                 （for.areas = ['13'] にして、who / caution で条件をはっきり書いています）
 */
(function () {
  var SM = window.SM;
  var C = '2026-10-16';
  var C3 = '2026-10-17';   // v3 で追加・確認した記録
  var NOT_JR = ['hs12', 'hs3', 'left0', 'left1', 'nohs'];   // 中学生（jhs12/jhs3）には出さない
  var V = 'Economix JP';
  var CARE = ['facility', 'foster', 'jhome'];

  // 東京都福祉局オープンデータ「自立相談支援機関問合せ先一覧」（住所・受付時間の補足に使用）
  var TOKYO_LIST = {
    org: '東京都福祉局（オープンデータ「生活困窮者自立支援制度 自立相談支援機関問合せ先一覧」）',
    url: 'https://spec.api.metro.tokyo.lg.jp/spec/t000054d0000000045-9866b97f6b8fe1b898893a5f4167fd85-0'
  };

  function loc(name, area, addr, lat, lng, phone, hours, note) {
    return { name: name, area: area, addr: addr, lat: lat, lng: lng, phone: phone, hours: hours, note: note || '' };
  }

  /* ---- (1) くらしとしごとの相談窓口（自立相談支援機関） ------------------------------------ */
  /* o = { code, slug, city, en, wname, wnameEn, phone, hoursJa, hoursEn, locs, url, org, note, noReserve, hogoNote, sources2, basis, areas } */
  function jiritsu(o) {
    var reserve = o.noReserve
      ? '予約なしで行けます。電話だけの相談もできます。'
      : 'まず電話で「生活の相談をしたい」と伝えて、予約してから行くと待たずにすみます。';
    return {
      id: o.slug + '-jiritsu-sodan',
      name: { ja: o.city + ' ' + o.wname, en: o.en + ': ' + (o.wnameEn || 'Living & work support desk') },
      hook: { ja: 'お金・仕事・住まいのこと、まとめて相談したい', en: 'I want to talk about money, work and housing in one place' },
      summary: {
        ja: o.city + 'に住む人のための、お金・仕事・住まいの無料の相談窓口です。相談員がいっしょに計画を立てて、家賃の給付金（住居確保給付金）などの制度につないでくれます。',
        en: 'A free support desk for ' + o.en + ' residents about money, work and housing. A counselor makes a plan with you and connects you to programs such as the Housing Security Benefit.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: o.basis || 'local', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: (o.whoJa || (o.city + 'に住んでいて、お金・仕事・住まいのことで困っている人。')) + (o.hogoNote === false ? '' : '生活保護を受けている人は、担当のケースワーカーに相談します。') },
      how: { ja: reserve + '家族や支援者といっしょに行っても大丈夫です。家賃や収入がわかる紙（通帳・給料明細・賃貸の契約書など）があると、話が早く進みます。' },
      where: { ja: o.whereJa || (o.locs.length ? o.locs[0].name : o.city) },
      docs: [],
      ask: [
        '施設（里親家庭）を出たばかりで、生活費と家賃が心配です。使える制度はありますか？',
        '住居確保給付金（家賃の給付金）の対象になるか、調べてもらえますか？',
        'お金のやりくりの相談（家計の相談）もできますか？'
      ],
      caution: { ja: (o.note ? o.note + ' ' : '') + '相談しただけでお金がもらえるわけではありません。でも、使える制度をいっしょに探してくれる「最初の入口」です。' },
      supporter: { ja: '生活困窮者自立支援法にもとづく自立相談支援機関。住居確保給付金・家計改善支援・就労準備支援などの入口。社会的養護経験者で住まいや家計に不安がある場合、早めの同行がおすすめ。' + (o.supNote ? ' ' + o.supNote : '') },
      effort: 'low',
      // v3: 大人の家計・仕事の窓口なので中学生には出さない（中学生は (3) 子供家庭支援センターへ）
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: o.areas || [o.code] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: o.phone, phoneLabel: o.wname, line: null, chat: null, web: o.web !== undefined ? o.web : o.url,
        hours: o.hoursJa ? { ja: o.hoursJa, en: o.hoursEn || null } : null
      },
      locations: o.locs,
      source: { org: o.org || o.city, url: o.url, checked: C },
      sources2: o.sources2 || [],
      eligibleBy: 'residence',
      verifiedBy: V
    };
  }

  var WD = '平日'; // 土日・祝日・年末年始は休み（各ページで確認）

  var J = [
    jiritsu({ code: '13101', slug: 'chiyoda', city: '千代田区', en: 'Chiyoda City', wname: 'くらしと仕事・家計の相談（生活支援課）', wnameEn: 'Life, work & household budget consultation',
      phone: '03-5211-4126', hoursJa: '平日 9時〜17時', hoursEn: 'Weekdays 9:00–17:00',
      url: 'https://www.city.chiyoda.lg.jp/koho/kenko/sekatsu/kurashi.html', org: '千代田区（保健福祉部 生活支援課）',
      note: '前の日までに予約すると、待ち時間が少なくなります。区役所に行けないときは、家に来てもらう相談もできます。',
      hogoNote: false,
      locs: [loc('千代田区役所（生活支援課）', '13101', '東京都千代田区九段南1-2-1', 35.693947, 139.75354, '03-5211-4126', WD + ' 9:00–17:00', '')] }),

    jiritsu({ code: '13102', slug: 'chuo', city: '中央区', en: 'Chuo City', wname: 'くらしとしごとの相談（ふくしの総合相談窓口）', wnameEn: 'Life & work consultation (welfare one-stop desk)',
      phone: '03-3546-5303', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.chuo.lg.jp/a0022/kenkouiryou/fukushiippan/seikatsushien/seikatukonkyu.html', org: '中央区',
      locs: [loc('京橋ふくしの総合相談窓口（中央区役所 本庁舎 地下1階）', '13102', '東京都中央区築地1-1-1', 35.670841, 139.771927, '03-3546-5303', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13103', slug: 'minato', city: '港区', en: 'Minato City', wname: '港区生活・就労支援センター', wnameEn: 'Minato Life & Employment Support Center',
      phone: '03-5114-8826', hoursJa: '平日 8時30分〜17時15分', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.minato.tokyo.jp/jiritsusien/seikatukonnkyuusyajiritusien.html', org: '港区',
      locs: [loc('港区生活・就労支援センター（麻布地区総合支所 2階）', '13103', '東京都港区六本木5-16-45', 35.660809, 139.735794, '03-5114-8826', WD + ' 8:30–17:15', '')] }),

    jiritsu({ code: '13104', slug: 'shinjuku', city: '新宿区', en: 'Shinjuku City', wname: '生活支援相談窓口', wnameEn: 'Life support consultation desk',
      phone: '03-5273-3853', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.shinjuku.lg.jp/fukushi/fukushi01_002056.html', org: '新宿区',
      hogoNote: false,
      locs: [loc('新宿区 生活支援相談窓口（区役所 第二分庁舎 1階）', '13104', '東京都新宿区新宿5-18-21', 35.693802, 139.706436, '03-5273-3853', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13105', slug: 'bunkyo', city: '文京区', en: 'Bunkyo City', wname: '自立相談支援窓口', wnameEn: 'Self-reliance support desk',
      phone: '03-5803-1917', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.bunkyo.lg.jp/b019/p003129.html', org: '文京区（生活福祉課）',
      note: '相談員が出かけていることもあるので、前もって電話で予約しましょう。',
      locs: [loc('文京区 自立相談支援窓口（文京シビックセンター 9階北側）', '13105', '東京都文京区春日1-16-21', 35.708336, 139.752411, '03-5803-1917', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13106', slug: 'taito', city: '台東区', en: 'Taito City', wname: '生活や仕事の相談（保護課 生活困窮者支援担当）', wnameEn: 'Life & work consultation',
      phone: '03-5246-1158', hoursJa: '平日 8時30分〜17時（12時〜13時をのぞく）', hoursEn: 'Weekdays 8:30–17:00 (closed 12–13)',
      url: 'https://www.city.taito.lg.jp/kurashi/soudan/seikatsu/seikatsukonkyu.html', org: '台東区',
      note: '電話だけの相談もできます。',
      locs: [loc('台東区役所 本庁舎 2階 9番窓口', '13106', '東京都台東区東上野4-5-6', 35.712452, 139.77977, '03-5246-1158', WD + ' 8:30–17:00（12:00–13:00 をのぞく）', '')] }),

    jiritsu({ code: '13107', slug: 'sumida', city: '墨田区', en: 'Sumida City', wname: 'くらし・しごと相談室すみだ', wnameEn: 'Sumida Life & Work Consultation Room',
      phone: '03-5608-6289', hoursJa: '平日 8時30分〜17時（東京都の一覧より）', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.sumida.lg.jp/kenko_fukushi/seikatuhukusi/seikatusoudan.html', org: '墨田区',
      note: '窓口に行くときは、前もって予約してください。メールでも相談を受けています。',
      supNote: 'メール KURASHISHIGOTO@city.sumida.lg.jp。住所・時間は東京都オープンデータの一覧で補足。',
      sources2: [TOKYO_LIST],
      locs: [loc('くらし・しごと相談室すみだ（墨田区役所 3階）', '13107', '東京都墨田区吾妻橋1-23-20', 35.710602, 139.801895, '03-5608-6289', WD + ' 8:30–17:00', '要予約')] }),

    jiritsu({ code: '13108', slug: 'koto', city: '江東区', en: 'Koto City', wname: '生活・仕事・家計の相談（自立相談支援）', wnameEn: 'Life, work & budget consultation',
      phone: '03-3647-8487', hoursJa: '平日 8時30分〜17時（12時〜13時は受付のみ）', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.koto.lg.jp/250251/kurashi/sodan/sekatsu/seikatusigotosoudan.html', org: '江東区',
      note: '住んでいる住所によって、窓口（保護第一課・保護第二課）が分かれます。どちらか迷ったら電話で聞いてOKです。',
      hogoNote: false, sources2: [TOKYO_LIST],
      whereJa: '保護第一課（江東区役所 2階24番）または 保護第二課（総合区民センター 1階）',
      locs: [
        loc('江東区 保護第一課（江東区役所 2階24番）', '13108', '東京都江東区東陽4-11-28', 35.672993, 139.81636, '03-3647-8487', WD + ' 8:30–17:00', '住所によって担当がちがいます'),
        loc('江東区 保護第二課（総合区民センター 1階）', '13108', '東京都江東区大島4-5-1', 35.688911, 139.826523, '03-3637-3741', WD + ' 8:30–17:00', '住所によって担当がちがいます')
      ] }),

    jiritsu({ code: '13109', slug: 'shinagawa', city: '品川区', en: 'Shinagawa City', wname: '暮らし・しごと応援センター', wnameEn: 'Life & Work Support Center',
      phone: '03-5742-9117', hoursJa: '平日 9時〜12時・13時〜17時', hoursEn: 'Weekdays 9:00–12:00, 13:00–17:00',
      url: 'https://www.city.shinagawa.tokyo.jp/PC/kenkou/kenkou-seikatsukomaru/hpg000001255.html', org: '品川区',
      locs: [loc('品川区 暮らし・しごと応援センター（品川区役所）', '13109', '東京都品川区広町2-1-36', 35.608822, 139.729767, '03-5742-9117', WD + ' 9:00–12:00／13:00–17:00', '')] }),

    jiritsu({ code: '13110', slug: 'meguro', city: '目黒区', en: 'Meguro City', wname: 'めぐろ くらしの相談窓口', wnameEn: 'Meguro Life Consultation Desk',
      phone: '03-5722-9370', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.meguro.tokyo.jp/fukushisougou/kenkoufukushi/seikatsushien/kikitorikun.html', org: '目黒区',
      noReserve: true,
      locs: [loc('めぐろ くらしの相談窓口（目黒区総合庁舎 本館 2階）', '13110', '東京都目黒区上目黒2-19-15', 35.640465, 139.6987, '03-5722-9370', WD + ' 8:30–17:00', '予約なしでOK')] }),

    jiritsu({ code: '13111', slug: 'ota', city: '大田区', en: 'Ota City', wname: '生活再建・就労サポートセンター JOBOTA（ジョボタ）', wnameEn: 'JOBOTA Life Rebuilding & Work Support Center',
      phone: '03-6423-0251', hoursJa: '月〜土 10時〜18時（祝日・年末年始は休み）', hoursEn: 'Mon–Sat 10:00–18:00',
      url: 'https://www.city.ota.tokyo.jp/seikatsu/fukushi/seikatsukonkyusya/seikatsu.html', org: '大田区',
      note: '土曜日も開いています。',
      locs: [loc('JOBOTA（柳原大森ビル 6階）', '13111', '東京都大田区大森北1-11-1', 35.587132, 139.728271, '03-6423-0251', '月〜土 10:00–18:00', '土曜も相談できます')] }),

    jiritsu({ code: '13112', slug: 'setagaya', city: '世田谷区', en: 'Setagaya City', wname: 'ぷらっとホーム世田谷', wnameEn: 'Platform Setagaya (life support center)',
      phone: '03-5431-5355', hoursJa: '平日 9時〜17時', hoursEn: 'Weekdays 9:00–17:00',
      url: 'https://www.city.setagaya.lg.jp/02412/2969.html', org: '世田谷区',
      note: '2025年3月31日に三軒茶屋分庁舎へ引っこしました。行くときは前もって予約してください。',
      hogoNote: false,
      locs: [loc('ぷらっとホーム世田谷（世田谷区役所 三軒茶屋分庁舎 5階）', '13112', '東京都世田谷区太子堂2-16-7', 35.644386, 139.670822, '03-5431-5355', WD + ' 9:00–17:00', '要予約')] }),

    jiritsu({ code: '13113', slug: 'shibuya', city: '渋谷区', en: 'Shibuya City', wname: '生活支援相談窓口', wnameEn: 'Life support consultation desk',
      phone: '03-3463-2116', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.shibuya.tokyo.jp/kenko/seikatsu-fukushi/kurashi-sodan/kurashinosoudan.html', org: '渋谷区',
      hogoNote: false, sources2: [TOKYO_LIST],
      locs: [loc('渋谷区 生活支援相談窓口（渋谷区役所）', '13113', '東京都渋谷区宇田川町1-1', 35.663475, 139.697189, '03-3463-2116', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13114', slug: 'nakano', city: '中野区', en: 'Nakano City', wname: '中野くらしサポート', wnameEn: 'Nakano Life Support',
      phone: '03-3228-8950', hoursJa: '平日 8時30分〜17時（受付は16時30分まで）', hoursEn: 'Weekdays 8:30–17:00 (last entry 16:30)',
      url: 'https://www.city.tokyo-nakano.lg.jp/kenko_hukushi/hogo/nakanokurashisupport.html', org: '中野区',
      note: '電話かインターネットで予約してから行きましょう。',
      hogoNote: false,
      locs: [loc('中野くらしサポート（中野区役所 4階）', '13114', '東京都中野区中野4-11-19', 35.709118, 139.662613, '03-3228-8950', WD + ' 8:30–17:00（受付 16:30 まで）', '要予約')] }),

    jiritsu({ code: '13115', slug: 'suginami', city: '杉並区', en: 'Suginami City', wname: 'くらしのサポートステーション', wnameEn: 'Life Support Station',
      phone: '03-3391-1751', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.suginami.tokyo.jp/guide/shien/shien/1021717.html', org: '杉並区',
      hogoNote: false,
      locs: [loc('くらしのサポートステーション（ウェルファーム杉並 複合施設棟 1階）', '13115', '東京都杉並区天沼3-19-16', 35.710388, 139.620667, '03-3391-1751', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13116', slug: 'toshima', city: '豊島区', en: 'Toshima City', wname: 'くらし・しごと相談支援センター', wnameEn: 'Life & Work Consultation Center',
      phone: '03-4566-2454', hoursJa: '平日 9時〜16時', hoursEn: 'Weekdays 9:00–16:00',
      url: 'https://www.city.toshima.lg.jp/164/kenko/sekatsu/032834.html', org: '豊島区',
      note: '急ぎのとき以外は予約制です。電話での相談もできます。',
      hogoNote: false,
      locs: [loc('くらし・しごと相談支援センター（豊島区役所 本庁舎 4階西 2番）', '13116', '東京都豊島区南池袋2-45-1', 35.725372, 139.717087, '03-4566-2454', WD + ' 9:00–16:00', '原則予約制')] }),

    jiritsu({ code: '13117', slug: 'kita', city: '北区', en: 'Kita City', wname: '北区くらしとしごと相談センター', wnameEn: 'Kita Life & Work Consultation Center',
      phone: '03-6454-3104', hoursJa: '平日 8時30分〜17時15分（予約優先）', hoursEn: 'Weekdays 8:30–17:15 (appointments first)',
      url: 'https://www.city.kita.lg.jp/living/counseling/1002161.html', org: '北区',
      hogoNote: false,
      locs: [loc('北区くらしとしごと相談センター（岸町ふれあい館 1階）', '13117', '東京都北区岸町1-6-17', 35.755028, 139.734924, '03-6454-3104', WD + ' 8:30–17:15', '予約優先')] }),

    jiritsu({ code: '13118', slug: 'arakawa', city: '荒川区', en: 'Arakawa City', wname: '仕事・生活サポートデスク', wnameEn: 'Work & Life Support Desk',
      phone: '03-3802-3094', hoursJa: null,
      url: 'https://www.city.arakawa.tokyo.jp/a027/seikatsu/seikatsushien/280415shigotoseikatu.html', org: '荒川区（福祉推進課）',
      note: '受付の時間は、電話で確認してください。',
      hogoNote: false,
      locs: [loc('荒川区 仕事・生活サポートデスク（荒川区役所 本庁舎 1階）', '13118', '東京都荒川区荒川2-2-3', 35.73513, 139.783615, '03-3802-3094', null, '時間は電話で確認')] }),

    jiritsu({ code: '13119', slug: 'itabashi', city: '板橋区', en: 'Itabashi City', wname: 'いたばし暮らしのサポートセンター', wnameEn: 'Itabashi Life Support Center',
      phone: '03-6912-4591', hoursJa: '本部: 平日 9時〜19時、毎月第2日曜 9時〜17時／分室: 平日 9時〜17時', hoursEn: 'HQ: weekdays 9–19 and 2nd Sunday 9–17; branches weekdays 9–17',
      url: 'https://www.city.itabashi.tokyo.jp/kenko/fukushi/soudan/1003795.html', org: '板橋区',
      note: '行く前に電話で面談の予約をしてください。本部は夜7時まで、毎月第2日曜日も開いています。',
      hogoNote: false,
      whereJa: '板橋本部（グリーンホール 4階）・赤塚分室・志村分室',
      locs: [
        loc('いたばし暮らしのサポートセンター 板橋本部（グリーンホール 4階）', '13119', '東京都板橋区栄町36-1', 35.750931, 139.705063, '03-6912-4591', WD + ' 9:00–19:00／第2日曜 9:00–17:00', '施設点検日は 17:00 まで'),
        loc('いたばし暮らしのサポートセンター 赤塚分室（赤塚福祉課内）', '13119', '東京都板橋区赤塚6-38-1', 35.778679, 139.645477, '03-6904-1332', WD + ' 9:00–17:00', ''),
        loc('いたばし暮らしのサポートセンター 志村分室（志村福祉課内）', '13119', '東京都板橋区蓮根2-28-1', 35.784122, 139.675156, '03-5948-7088', WD + ' 9:00–17:00', '')
      ] }),

    jiritsu({ code: '13120', slug: 'nerima', city: '練馬区', en: 'Nerima City', wname: '生活サポートセンター', wnameEn: 'Life Support Center',
      phone: '03-3993-9963', hoursJa: '平日 8時30分〜17時15分', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.nerima.tokyo.jp/kurashi/jinken/komatta/supportcenter.html', org: '練馬区',
      note: 'Zoom（オンライン）での相談もできます（予約制）。',
      locs: [loc('練馬区 生活サポートセンター（練馬区役所 西庁舎 3階）', '13120', '東京都練馬区豊玉北6-12-1', 35.73571, 139.651672, '03-3993-9963', WD + ' 8:30–17:15', '')] }),

    jiritsu({ code: '13121', slug: 'adachi', city: '足立区', en: 'Adachi City', wname: '福祉まるごと相談課（くらしとしごとの相談）', wnameEn: 'All-in-one Welfare Consultation',
      phone: '03-3880-5705', hoursJa: null,
      url: 'https://www.city.adachi.tokyo.jp/seikatsu-shien/gaiyou.html', org: '足立区（福祉まるごと相談課）',
      note: 'だれでも、どんなことでも相談できる窓口です。平日に来られない人のために休日に開く日もあります。時間は電話で確認してください。',
      hogoNote: false,
      whereJa: '東部拠点（足立区役所 本庁舎別館 1階）または 西部拠点（すこやかプラザあだち 3階）',
      locs: [
        loc('福祉まるごと相談課 東部拠点（足立区役所 本庁舎別館 1階）', '13121', '東京都足立区梅島2-2-2', 35.775513, 139.802856, '03-3880-5705', null, '予約すると個室で相談できます'),
        loc('福祉まるごと相談課 西部拠点（すこやかプラザあだち 3階）', '13121', '東京都足立区江北5-14-5', 35.776733, 139.76535, '03-5888-4571', null, '予約すると個室で相談できます')
      ] }),

    jiritsu({ code: '13122', slug: 'katsushika', city: '葛飾区', en: 'Katsushika City', wname: '自立相談支援窓口', wnameEn: 'Self-reliance support desk',
      phone: '03-5654-8625', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.katsushika.lg.jp/kurashi/1000061/1003796/1003862.html', org: '葛飾区',
      hogoNote: false,
      locs: [loc('葛飾区 自立相談支援窓口（葛飾区役所 3階 312番窓口）', '13122', '東京都葛飾区立石5-13-1', 35.743164, 139.84729, '03-5654-8625', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13123', slug: 'edogawa', city: '江戸川区', en: 'Edogawa City', wname: 'くらしごと相談室', wnameEn: 'Life & Work Consultation Rooms',
      phone: '03-5662-0085', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.edogawa.tokyo.jp/e043/kenko/fukushikaigo/sekatsuhogo/konkyu_sodan/index.html', org: '江戸川区',
      note: '住んでいる地域で担当の相談室（中央・小岩・葛西）が分かれます。1回の相談は30分〜1時間くらいかかります。',
      hogoNote: false,
      whereJa: 'くらしごと相談室 中央・小岩・葛西（住む地域で担当が決まります）',
      locs: [
        loc('くらしごと相談室 中央', '13123', '東京都江戸川区中央1-3-17', 35.705959, 139.868835, '03-5662-0085', WD + ' 8:30–17:00', '区民課・小松川事務所・東部/鹿骨事務所の一部の地域'),
        loc('くらしごと相談室 小岩', '13123', '東京都江戸川区東小岩6-9-14', 35.733685, 139.888214, '03-5876-7730', WD + ' 8:30–17:00', '小岩事務所・東部/鹿骨事務所の一部の地域'),
        loc('くらしごと相談室 葛西', '13123', '東京都江戸川区東葛西7-12-6', 35.658928, 139.875916, '03-5659-6626', WD + ' 8:30–17:00', '葛西事務所・区民課の一部の地域')
      ] }),

    /* ---- 多摩の市 ---- */
    jiritsu({ code: '13201', slug: 'hachioji', city: '八王子市', en: 'Hachioji City', wname: '生活にお困りの方の自立相談（生活支援課）', wnameEn: 'Self-reliance consultation',
      phone: '042-620-7462', hoursJa: '平日 8時30分〜11時・13時〜16時（予約が必要）', hoursEn: 'Weekdays 8:30–11:00, 13:00–16:00 (appointment needed)',
      url: 'https://www.city.hachioji.tokyo.jp/kurashi/welfare/007/001/p020335.html', org: '八王子市',
      note: '相談は予約が必要です。八王子駅南口総合事務所での出張相談もあります（予約制）。',
      locs: [loc('八王子市役所（生活支援課 自立担当）', '13201', '東京都八王子市元本郷町3-24-1', 35.666496, 139.316162, '042-620-7462', WD + ' 8:30–11:00／13:00–16:00', '要予約')] }),

    jiritsu({ code: '13202', slug: 'tachikawa', city: '立川市', en: 'Tachikawa City', wname: 'くらし・しごとサポートセンター', wnameEn: 'Life & Work Support Center',
      phone: '042-503-4308', hoursJa: '平日 8時30分〜17時15分', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.tachikawa.lg.jp/kenko/seikatsu/1003361/1022107.html', org: '立川市',
      hogoNote: false,
      locs: [loc('立川市くらし・しごとサポートセンター（総合福祉センター内）', '13202', '東京都立川市富士見町2-36-47', 35.70158, 139.402008, '042-503-4308', WD + ' 8:30–17:15', '')] }),

    jiritsu({ code: '13203', slug: 'musashino', city: '武蔵野市', en: 'Musashino City', wname: '自立相談支援（生活福祉課 生活相談係）', wnameEn: 'Self-reliance consultation',
      phone: '0422-60-1254', hoursJa: '平日 8時30分〜17時（東京都の一覧より）', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.musashino.lg.jp/kenko_fukushi/seikatsu_fukushi/1044335/1006644.html', org: '武蔵野市',
      note: '電話での相談や、家に来てもらう相談もできます。',
      sources2: [TOKYO_LIST],
      locs: [loc('武蔵野市役所（生活福祉課）', '13203', '東京都武蔵野市緑町2-2-28', 35.717499, 139.566452, '0422-60-1254', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13204', slug: 'mitaka', city: '三鷹市', en: 'Mitaka City', wname: '三鷹市生活・就労支援窓口', wnameEn: 'Life & Employment Support Desk',
      phone: '0422-24-6083', hoursJa: '平日 9時〜17時（12時〜13時をのぞく。東京都の一覧より）', hoursEn: 'Weekdays 9:00–17:00 (closed 12–13)',
      url: 'https://www.city.mitaka.lg.jp/c_service/051/051206.html', org: '三鷹市',
      note: '予約した人から先に案内されるので、電話で予約しましょう。場所は予約のときに確認してください。',
      sources2: [TOKYO_LIST],
      locs: [loc('三鷹市生活・就労支援窓口（三鷹市役所）', '13204', '東京都三鷹市野崎1-1-1', 35.683262, 139.559418, '0422-24-6083', WD + ' 9:00–17:00（12:00–13:00 をのぞく）', '予約優先')] }),

    jiritsu({ code: '13205', slug: 'ome', city: '青梅市', en: 'Ome City', wname: '生活自立支援窓口', wnameEn: 'Self-reliance support desk',
      phone: '0428-23-5888', hoursJa: '平日 9時〜12時・13時〜17時', hoursEn: 'Weekdays 9:00–12:00, 13:00–17:00',
      url: 'https://www.city.ome.tokyo.jp/soshiki/27/66583.html', org: '青梅市',
      note: '電話が苦手な人は、市のWEB相談フォームでも相談できます。',
      hogoNote: false,
      locs: [loc('青梅市役所 1階 16番（生活自立支援窓口）', '13205', '東京都青梅市東青梅1-11-1', 35.788086, 139.275269, '0428-23-5888', WD + ' 9:00–12:00／13:00–17:00', '')] }),

    jiritsu({ code: '13206', slug: 'fuchu', city: '府中市', en: 'Fuchu City', wname: 'くらしと仕事の相談', wnameEn: 'Life & work consultation',
      phone: '042-335-4191', hoursJa: null,
      url: 'https://www.city.fuchu.tokyo.jp/kenko/fukushi/okomari/kurashitoshigoto.html', org: '府中市（生活福祉課 自立生活支援担当）',
      note: '予約するとスムーズです。LINEでも相談の予約ができます。受付の時間は電話で確認してください。',
      hogoNote: false,
      locs: [loc('府中市役所 おもや 2階（生活福祉課 自立生活支援担当）', '13206', '東京都府中市宮西町2-24', 35.668858, 139.477768, '042-335-4191', null, '時間は電話で確認')] }),

    jiritsu({ code: '13207', slug: 'akishima', city: '昭島市', en: 'Akishima City', wname: 'くらし・しごとサポートセンター', wnameEn: 'Life & Work Support Center',
      phone: '042-519-2033', hoursJa: '平日 8時30分〜17時15分', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.akishima.lg.jp/kurashi/sodan/1011282/1002839.html', org: '昭島市',
      hogoNote: false,
      locs: [loc('昭島市くらし・しごとサポートセンター（TE昭島ビル 201A）', '13207', '東京都昭島市昭和町2-1-6', 35.712769, 139.36264, '042-519-2033', WD + ' 8:30–17:15', '昭島駅南口の立体自転車駐車場の西どなり')] }),

    jiritsu({ code: '13208', slug: 'chofu', city: '調布市', en: 'Chofu City', wname: '調布ライフサポート', wnameEn: 'Chofu Life Support',
      phone: '042-481-7693', hoursJa: '平日 9時〜17時', hoursEn: 'Weekdays 9:00–17:00',
      url: 'https://www.city.chofu.lg.jp/060020/p032007.html', org: '調布市',
      note: '相談したいときは、前もって電話で連絡してください。本人が行けないときは、家族などが代わりに行くこともできます。',
      sources2: [TOKYO_LIST],
      locs: [loc('調布ライフサポート（調布市社会福祉協議会内）', '13208', '東京都調布市小島町2-47-1', 35.651272, 139.542633, '042-481-7693', WD + ' 9:00–17:00', '住所は東京都の一覧より')] }),

    jiritsu({ code: '13209', slug: 'machida', city: '町田市', en: 'Machida City', wname: '生活・就労相談窓口（自立相談支援）', wnameEn: 'Life & employment consultation',
      phone: '042-724-4013', hoursJa: '平日 8時30分〜17時（東京都の一覧より）', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.machida.tokyo.jp/kurashi/kurashisoudan/engo/konkyujiritu.html', org: '町田市（生活援護課）',
      sources2: [TOKYO_LIST],
      locs: [loc('町田市役所（生活援護課 生活・就労相談）', '13209', '東京都町田市森野2-2-22', 35.547039, 139.438141, '042-724-4013', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13210', slug: 'koganei', city: '小金井市', en: 'Koganei City', wname: '福祉総合相談窓口（自立相談サポートセンター）', wnameEn: 'Welfare one-stop desk',
      phone: '042-386-0295', hoursJa: '平日 8時30分〜17時／毎月第4日曜 9時〜13時（予約）', hoursEn: 'Weekdays 8:30–17:00; 4th Sunday 9–13 (booking)',
      url: 'https://www.city.koganei.lg.jp/kenkofukuhsi/444/supportcenter.html', org: '小金井市',
      note: 'まず電話などで予約しましょう。電話がむずかしい人はメールやFAXでも予約できます。月に1回、日曜日にも開いています。',
      hogoNote: false,
      locs: [loc('小金井市 福祉総合相談窓口（小金井市社会福祉協議会内）', '13210', '東京都小金井市本町5-36-17', 35.70546, 139.503891, '042-386-0295', WD + ' 8:30–17:00／第4日曜 9:00–13:00', '要予約')] }),

    jiritsu({ code: '13211', slug: 'kodaira', city: '小平市', en: 'Kodaira City', wname: 'こだいら生活相談支援センター', wnameEn: 'Kodaira Life Consultation Support Center',
      phone: '042-349-0151', hoursJa: '平日 9時〜17時（東京都の一覧より）', hoursEn: 'Weekdays 9:00–17:00',
      url: TOKYO_LIST.url, web: null, org: '東京都福祉局（自立相談支援機関問合せ先一覧）',
      note: '小平市のホームページは2026年10月16日時点でシステム障害のため見られませんでした。行く前に電話で確認してください。',
      hogoNote: false,
      supNote: '市HP（kurashi/046/046174.html）がシステム障害で閲覧不可のため、東京都オープンデータで確認。復旧後に再確認すること。',
      locs: [loc('こだいら生活相談支援センター（福祉会館 4階）', '13211', '東京都小平市学園東町1-19-13', 35.727318, 139.478058, '042-349-0151', WD + ' 9:00–17:00', '住所・時間は東京都の一覧より')] }),

    jiritsu({ code: '13212', slug: 'hino', city: '日野市', en: 'Hino City', wname: 'くらしの自立相談支援窓口 みらいと', wnameEn: 'Miraito self-reliance support desks',
      phone: '042-514-8574', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.hino.lg.jp/fukushi/fukushi/1003811.html', org: '日野市',
      note: '市内に3か所あります。「みらいと高幡」は、だれでも無料で使える居場所にもなっています（平日9時〜16時、予約なし）。',
      hogoNote: false,
      whereJa: '日野市役所 2階（セーフティネットコールセンター）・多摩平・高幡',
      locs: [
        loc('みらいと（日野市役所 2階 セーフティネットコールセンター）', '13212', '東京都日野市神明1-12-1', 35.670986, 139.395279, '042-514-8574', WD + ' 8:30–17:00', ''),
        loc('みらいと サテライトセンター多摩平', '13212', '東京都日野市多摩平3-5-21', 35.665745, 139.376648, '042-514-9855', WD + ' 8:30–17:00', '要予約'),
        loc('みらいと サテライトセンター高幡（みらいと高幡）', '13212', '東京都日野市高幡651-5 高幡マンション第2', null, null, '042-506-7221', '居場所: ' + WD + ' 9:00–16:00', '居場所としても使えます（予約なし）。地図の位置は未確認')
      ] }),

    jiritsu({ code: '13213', slug: 'higashimurayama', city: '東村山市', en: 'Higashimurayama City', wname: 'くらし・しごとサポートセンター「ほっとシティ東村山」', wnameEn: '"Hot City" Life & Work Support Center',
      phone: '042-306-3427', hoursJa: '平日 8時30分〜17時15分', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.higashimurayama.tokyo.jp/kenko/komatta/kurashi-shigoto.html', org: '東村山市',
      note: 'まず電話で予約しましょう。電話での相談もできます。',
      hogoNote: false,
      locs: [loc('ほっとシティ東村山（S&D市民センター 1階）', '13213', '東京都東村山市本町1-1-1', 35.755348, 139.46788, '042-306-3427', WD + ' 8:30–17:15', '予約優先')] }),

    jiritsu({ code: '13214', slug: 'kokubunji', city: '国分寺市', en: 'Kokubunji City', wname: '自立生活サポートセンターこくぶんじ', wnameEn: 'Independent Living Support Center Kokubunji',
      phone: '042-324-8401', hoursJa: '平日 8時30分〜17時（予約が必要）', hoursEn: 'Weekdays 8:30–17:00 (appointment needed)',
      url: 'https://www.city.kokubunji.tokyo.jp/kodomo-kyouiku/kosodate-shien/1021243/1022129.html', org: '国分寺市',
      note: '予約が必要です。はじめての相談は1時間くらいかかることがあります。',
      hogoNote: false,
      sources2: [
        { org: '国分寺市社会福祉協議会', url: 'https://www.ko-shakyo.or.jp/jiritsu-support/' },
        { org: '国分寺市（リーフレット）', url: 'https://www.city.kokubunji.tokyo.jp/_res/projects/default_project/_page_/001/002/059/2025.pdf' }
      ],
      locs: [loc('自立生活サポートセンターこくぶんじ（いずみプラザ 1階）', '13214', '東京都国分寺市泉町2-3-8', 35.696209, 139.468216, '042-324-8401', WD + ' 8:30–17:00', '要予約')] }),

    jiritsu({ code: '13215', slug: 'kunitachi', city: '国立市', en: 'Kunitachi City', wname: '福祉総合相談 ふくふく窓口', wnameEn: '"Fukufuku" welfare one-stop desk',
      phone: '042-572-2111', hoursJa: '平日 8時30分〜17時15分', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.kunitachi.tokyo.jp/soshiki/Dept03/Div01/Sec04/gyomu/0170/1464586350271.html', org: '国立市',
      note: '電話相談は名前を言わなくても大丈夫です。メールや訪問での相談もできます。',
      locs: [loc('ふくふく窓口（国立市役所 1階 1番窓口）', '13215', '東京都国立市富士見台2-47-1', 35.684376, 139.441513, '042-572-2111', WD + ' 8:30–17:15', '電話は匿名でもOK')] }),

    jiritsu({ code: '13218', slug: 'fussa', city: '福生市', en: 'Fussa City', wname: '就労と福祉の相談（社会福祉課）', wnameEn: 'Work & welfare consultation',
      phone: '042-551-1735', hoursJa: '平日 8時30分〜17時15分（12時〜13時をのぞく）', hoursEn: 'Weekdays 8:30–17:15 (closed 12–13)',
      url: 'https://www.city.fussa.tokyo.jp/life/health/welfare/1002349.html', org: '福生市',
      note: '予約した人から先に相談できます。行く前に電話してください。',
      hogoNote: false,
      locs: [loc('福生市役所 1階 10番窓口', '13218', '東京都福生市本町5', 35.738701, 139.326782, '042-551-1735', WD + ' 8:30–17:15（12:00–13:00 をのぞく）', '予約優先')] }),

    jiritsu({ code: '13219', slug: 'komae', city: '狛江市', en: 'Komae City', wname: '生活相談窓口「こまYELL（エール）」', wnameEn: '"Koma YELL" life consultation desk',
      phone: '03-3430-1111', hoursJa: '平日 8時30分〜17時（東京都の一覧より）', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.komae.tokyo.jp/index.cfm/44,78349,342,3084,html', org: '狛江市',
      note: '電話をかけたら「こまYELLにつないでください」と言ってください。WEBなら24時間いつでも相談の予約ができます。',
      sources2: [TOKYO_LIST],
      locs: [loc('こまYELL（狛江市役所）', '13219', '東京都狛江市和泉本町1-1-5', 35.634491, 139.577927, '03-3430-1111', WD + ' 8:30–17:00', '市役所の代表番号。「こまYELLに」と伝える')] }),

    jiritsu({ code: '13220', slug: 'higashiyamato', city: '東大和市', en: 'Higashiyamato City', wname: 'くらし・しごと応援センター「そえる」', wnameEn: '"Soeru" Life & Work Support Center',
      phone: '042-563-2111', hoursJa: '平日 8時30分〜17時15分', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.higashiyamato.lg.jp/kenkofukushi/chiikifukushi/1003086/1003089.html', org: '東大和市',
      note: '市役所の代表番号です。「内線1081（そえる）」と伝えてください。予約するとスムーズです。',
      hogoNote: false,
      locs: [loc('そえる（東大和市役所 本庁舎 2階 エレベーター横）', '13220', '東京都東大和市中央3-930', 35.745262, 139.426498, '042-563-2111', WD + ' 8:30–17:15', '内線1081')] }),

    jiritsu({ code: '13221', slug: 'kiyose', city: '清瀬市', en: 'Kiyose City', wname: 'きよせ生活相談支援センター「いっぽ」', wnameEn: '"Ippo" life consultation center',
      phone: '042-495-5567', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.kiyose.lg.jp/kenkouiryouhukusi/seikatusiensyakaihukusi/seikatuniokomarinotoki/1004287.html', org: '清瀬市',
      note: '混んでいることがあるので、行く前に電話で予約してください。',
      hogoNote: false,
      locs: [loc('いっぽ（清瀬市元町1-11-21 1階北側）', '13221', '東京都清瀬市元町1-11-21', 35.773136, 139.51799, '042-495-5567', WD + ' 8:30–17:00', '要予約')] }),

    jiritsu({ code: '13222', slug: 'higashikurume', city: '東久留米市', en: 'Higashikurume City', wname: '自立相談支援（福祉総務課 相談支援係）', wnameEn: 'Self-reliance consultation',
      phone: '042-470-7749', hoursJa: '平日 9時〜16時（12時〜13時をのぞく）', hoursEn: 'Weekdays 9:00–16:00 (closed 12–13)',
      url: 'https://www.city.higashikurume.lg.jp/kurashi/fukushi/enjo/1004453.html', org: '東久留米市',
      note: '混んでいるので、行く前に電話で予約してください。',
      hogoNote: false,
      locs: [loc('東久留米市役所 2階（福祉総務課 相談支援係）', '13222', '東京都東久留米市本町3-3-1', 35.758629, 139.529709, '042-470-7749', WD + ' 9:00–16:00（12:00–13:00 をのぞく）', '要予約')] }),

    jiritsu({ code: '13223', slug: 'musashimurayama', city: '武蔵村山市', en: 'Musashimurayama City', wname: '市民なやみごと相談窓口', wnameEn: 'Residents\' worries consultation desk',
      phone: '042-565-1111', hoursJa: '平日 8時30分〜12時・13時〜17時15分（受付は16時30分まで）', hoursEn: 'Weekdays 8:30–12:00, 13:00–17:15 (last entry 16:30)',
      url: 'https://www.city.musashimurayama.lg.jp/kurashi/seikatsu/1012250/1005467/', org: '武蔵村山市',
      note: '市役所の代表番号です。「なやみごと相談（内線155・156）」と伝えてください。行けないときは、まず電話で相談できます。',
      hogoNote: false,
      locs: [loc('武蔵村山市役所 1階（市民なやみごと相談窓口）', '13223', '東京都武蔵村山市本町1-1-1', 35.754745, 139.38736, '042-565-1111', WD + ' 8:30–12:00／13:00–17:15', '内線155・156')] }),

    jiritsu({ code: '13224', slug: 'tama', city: '多摩市', en: 'Tama City', wname: 'しごと・くらしサポートステーション', wnameEn: 'Work & Life Support Station',
      phone: '042-338-6942', hoursJa: '月〜金 9時〜18時／土 9時〜17時（予約制）', hoursEn: 'Mon–Fri 9–18, Sat 9–17 (booking)',
      url: 'https://www.city.tama.lg.jp/kenkofukushi/1008237/shien/seikatsu/1002713.html', org: '多摩市',
      note: '予約制です。同じフロアに、引っこし先さがしを手伝う「居住支援相談窓口」（042-401-8640）もあります。',
      hogoNote: false,
      locs: [loc('しごと・くらしサポートステーション（ベルブ永山 2階）', '13224', '東京都多摩市永山1-5', 35.628471, 139.448685, '042-338-6942', '月〜金 9:00–18:00／土 9:00–17:00', '土曜も相談できます（予約制）')] }),

    jiritsu({ code: '13225', slug: 'inagi', city: '稲城市', en: 'Inagi City', wname: '福祉くらしの総合窓口', wnameEn: 'Welfare & life one-stop desk',
      phone: '042-378-2111', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.inagi.tokyo.jp/kenko/seikatsuhukushi/1003568.html', org: '稲城市',
      note: '行く前に電話で連絡してください。',
      hogoNote: false,
      locs: [loc('稲城市役所 2階（福祉くらしの総合窓口）', '13225', '東京都稲城市東長沼2111', 35.638123, 139.504288, '042-378-2111', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13227', slug: 'hamura', city: '羽村市', en: 'Hamura City', wname: '生活困窮者の相談窓口（社会福祉課）', wnameEn: 'Life consultation desk',
      phone: '042-555-1111', hoursJa: '平日 8時30分〜12時・13時〜17時', hoursEn: 'Weekdays 8:30–12:00, 13:00–17:00',
      url: 'https://www.city.hamura.tokyo.jp/0000007636.html', org: '羽村市',
      note: '市役所の代表番号です。「内線107」と伝えてください。電話がむずかしいときは、直接窓口に来てもOKです。',
      sources2: [TOKYO_LIST],
      locs: [loc('羽村市役所（社会福祉課）', '13227', '東京都羽村市緑ヶ丘5-2-1', 35.767506, 139.310928, '042-555-1111', WD + ' 8:30–12:00／13:00–17:00', '内線107')] }),

    jiritsu({ code: '13228', slug: 'akiruno', city: 'あきる野市', en: 'Akiruno City', wname: '生活・就労相談窓口', wnameEn: 'Life & employment consultation desk',
      phone: '042-558-1927', hoursJa: '平日 8時30分〜17時15分（東京都の一覧より）', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.akiruno.tokyo.jp/0000006199.html', org: 'あきる野市（生活福祉課）',
      hogoNote: false, sources2: [TOKYO_LIST],
      locs: [loc('あきる野市役所（生活福祉課 生活・就労相談窓口）', '13228', '東京都あきる野市二宮350', 35.729115, 139.29451, '042-558-1927', WD + ' 8:30–17:15', '')] }),

    jiritsu({ code: '13229', slug: 'nishitokyo', city: '西東京市', en: 'Nishitokyo City', wname: '生活サポート相談窓口', wnameEn: 'Life Support Consultation Desk',
      phone: '042-420-2809', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.nishitokyo.lg.jp/kenko_hukusi/seikatuenzyo/seikatsusoudann.html', org: '西東京市',
      note: '田無庁舎と保谷庁舎の2か所にあります。',
      sources2: [TOKYO_LIST],
      whereJa: '田無庁舎 1階 または 保谷庁舎 1階',
      locs: [
        loc('生活サポート相談窓口（田無庁舎 1階）', '13229', '東京都西東京市南町5-6-13', 35.726341, 139.53801, '042-420-2809', WD + ' 8:30–17:00', ''),
        loc('生活サポート相談窓口（保谷庁舎 1階）', '13229', '東京都西東京市中町1-5-1', 35.741821, 139.557983, '042-438-4023', WD + ' 8:30–17:00', '住所は東京都の一覧より')
      ] }),

    /* ---- 西多摩の町村（町村部は東京都が実施） ---- */
    jiritsu({ code: '13303', slug: 'nishitama', city: '西多摩（瑞穂町・日の出町・檜原村・奥多摩町）', en: 'Western Tama towns & villages', wname: '西多摩くらしの相談センター', wnameEn: 'Nishitama Life Consultation Center',
      phone: '0428-25-3501', hoursJa: null,
      url: 'https://www.fukushi.metro.tokyo.lg.jp/shisetsu/jigyosyo/nishifuku/seikatukonkyu', org: '東京都 西多摩福祉事務所',
      basis: 'tokyo', areas: ['13303', '13305', '13307', '13308'],
      whoJa: '瑞穂町・日の出町・檜原村・奥多摩町に住んでいて、お金・仕事・住まいのことで困っている人。',
      note: '各町村でも午後に出張相談をしています（瑞穂町: 水・金／日の出町: 木／檜原村: 月／奥多摩町: 火）。時間は電話で確認してください。',
      hogoNote: false,
      locs: [loc('西多摩くらしの相談センター（東京都青梅合同庁舎 1階）', '13205', '東京都青梅市河辺町6-4-1', 35.780197, 139.28981, '0428-25-3501', null, '各町村で巡回相談あり')] })
  ];

  // 西多摩の id を分かりやすく
  J[J.length - 1].name = { ja: '西多摩くらしの相談センター（瑞穂町・日の出町・檜原村・奥多摩町）', en: 'Nishitama Life Consultation Center (Mizuho, Hinode, Hinohara, Okutama)' };
  J[J.length - 1].summary = {
    ja: '瑞穂町・日の出町・檜原村・奥多摩町に住む人のための、お金・仕事・住まいの無料の相談窓口です（東京都が運営）。家賃の給付金（住居確保給付金）などにもつないでくれます。',
    en: 'A free support desk (run by Tokyo) for residents of Mizuho, Hinode, Hinohara and Okutama about money, work and housing.'
  };

  /* ---- (2) 区独自のケアリーバー支援 --------------------------------------------------------- */
  var L = [
    {
      id: 'nerima-habataku',
      name: { ja: 'ねりま羽ばたく若者応援プロジェクト（練馬区）', en: 'Nerima "Habataku" Youth Support Project' },
      hook: { ja: '練馬区でひとり暮らし。家賃や光熱費がきびしい', en: 'Living alone in Nerima and rent and bills are tight' },
      summary: {
        ja: '施設や里親家庭で育った、練馬区に住む若者のための支援です。家賃や光熱水費の一部を最長5年補助してくれるほか、毎週の居場所、LINE相談、法律相談、食料の配布もあります。',
        en: 'For care-experienced young people living in Nerima: help with part of rent and utilities for up to 5 years, plus a weekly drop-in space, LINE chat, legal advice and free food.'
      },
      cat: ['housing', 'consult', 'money'],
      kind: 'grant', basis: 'local', right: false,
      amount: { ja: '家賃・光熱水費の一部（最長5年）。金額は区に確認', en: 'Part of rent & utilities for up to 5 years (ask the city for amounts)' },
      repay: 'none',
      who: { ja: '児童養護施設や里親家庭などを離れて、練馬区内に住んでいる若者。居場所は、区内に住む29歳までの人が使えます。' },
      how: { ja: 'まず「子ども家庭支援センター 若者支援係」に電話して、使いたいと伝えます。居場所（毎週金曜）は申しこみなしで行けます。' },
      where: { ja: '練馬区 子ども家庭支援センター 若者支援係' },
      docs: ['本人確認ができるもの（居場所の登録に必要。ないときは相談してください）'],
      ask: ['家賃等補助金の対象になるか知りたいです。何がいりますか？', '補助はいくらぐらい、いつからもらえますか？', '急にお金がなくなったとき、一時的に住める場所はありますか？'],
      caution: { ja: '補助の金額や細かい条件はページにのっていません。電話で確認しましょう。練馬区に住んでいることが条件です。' },
      supporter: { ja: '令和7年度開始の都児相連携型の社会的養護自立支援事業（都内初）。家賃等補助（退所後最長5年）、一時居所支援（家具付きアパート）、居場所（春日町青少年館 金17:00–20:30、民間カフェ 第3土・要申込）、食料配布、LINE相談、弁護士相談。' },
      effort: 'mid',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: true, age: { min: 15, max: 29 }, areas: ['13120'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-3993-1051', phoneLabel: '練馬区 子ども家庭支援センター 若者支援係', line: null, chat: null,
        web: 'https://www.city.nerima.tokyo.jp/kosodatekyoiku/kodomo/sodan/kodomokateicenter/habataku.html',
        hours: { ja: '平日 8時30分〜17時15分', en: 'Weekdays 8:30–17:15' }
      },
      locations: [
        loc('居場所（春日町青少年館 3階・ねりま若者サポートステーション内）', '13120', '東京都練馬区春日町4-16-9', 35.752403, 139.639008, '03-5848-8341', '金 17:00–20:30（居場所）', '申しこみ不要。都営大江戸線 練馬春日町駅A2から歩いて3分')
      ],
      source: { org: '練馬区', url: 'https://www.city.nerima.tokyo.jp/kosodatekyoiku/kodomo/sodan/kodomokateicenter/habataku.html', checked: C },
      sources2: [{ org: '練馬区（チラシ）', url: 'https://www.city.nerima.tokyo.jp/kosodatekyoiku/kodomo/sodan/kodomokateicenter/habataku.files/tirashi-saisyuseiban.pdf' }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'setagaya-fairstart',
      name: { ja: 'せ\u2060た\u2060が\u2060や若者フェアスタート（奨学金・家賃・資格・医療費）', en: 'Setagaya Youth Fair Start (scholarship, rent, licenses, medical)' },
      hook: { ja: '学費、家賃、免許代、病院代…ひとりで全部はむり', en: 'Tuition, rent, a license, doctor bills — I can\'t cover it all alone' },
      summary: {
        ja: '世田谷区の施設や世田谷区の児童相談所から巣立った若者に、返さなくていいお金を出す制度です。大学などの学費、家賃、運転免許などの資格、病院代を支援します。',
        en: 'Setagaya gives non-repayable support to young people who left care through Setagaya: tuition, rent, licenses/qualifications and medical costs.'
      },
      cat: ['money', 'education', 'housing'],
      kind: 'grant', basis: 'local', right: false,
      amount: {
        ja: '学費 上限50万円＋教材費（実費）・パソコン10万円まで・通学定期／家賃 月3万円まで＋保証料2万円まで／運転免許・高卒認定 30万円まで（その他の資格 10万円まで）／病院代 年3万6千円まで',
        en: 'Tuition up to ¥500k + textbooks (actual cost), PC up to ¥100k, commuter pass; rent up to ¥30k/month + guarantee fee up to ¥20k; driving license or HS equivalency up to ¥300k (other ¥100k); medical up to ¥36k/yr'
      },
      repay: 'none',
      who: { ja: '18歳以降（または中学卒業以降）に、世田谷区内の児童養護施設・自立援助ホーム・里親家庭などを出た人、または世田谷区の児童相談所の措置が終わった人など。施設で暮らしたことがなくても、中学卒業後に世田谷区の児童相談所の一時保護や、児童相談所・子ども家庭支援センターの支援が終わった人も対象です。親や親せきから支えてもらえず、自分の収入でくらしていることが条件です。奨学金と家賃は29歳まで、資格と病院代は39歳まで。' },
      how: { ja: '申請書と、施設長などの推薦書を区に出します（オンラインか郵送）。推薦がもらえないときは、相談支援の「せたエール」が話を聞いて意見書を作ってくれます。審査のあと、本人の口座に振りこまれます。' },
      where: { ja: '世田谷区 子ども・若者部 児童相談支援課（梅丘分庁舎 2階）' },
      docs: ['申請書', '推薦書（または意見書）', '学生は在学・入学がわかる書類', '払ったことがわかる領収書・レシート'],
      ask: ['次の申請の受付はいつですか？', '推薦書を書いてくれる人がいません。どうすればいいですか？', '家賃支援と奨学金は、いっしょに申しこめますか？'],
      caution: { ja: '住んでいる場所ではなく「世田谷区の施設や児童相談所から巣立ったか」で決まります。受付は年に何回かです。令和8年度第3回の受付は 10月16日（金）まで（郵送は当日消印有効）。次の回は区に聞いてください。ほかの自治体の同じような支援を受けていると使えません。' },
      supporter: { ja: '世田谷区児童養護施設退所者等奨学・自立支援基金（寄附）が財源。令和7年度から虐待等の逆境体験があり親族の支援がない若者にも拡大。家賃は四半期ごと振込。毎年2〜3月に実績報告が必要（未提出は取消・返還の可能性）。住宅支援（借上げ区営住宅5戸）・居場所・せたエール（相談）も別にあり。' },
      effort: 'high',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: { min: 15, max: 39 }, areas: [] },
      deadline: { ja: '年に数回まとめて受付。次の回は区のページか電話で確認', en: 'Several rounds a year; check the next round', leaveMonths: null, months: null, always: false },
      contact: {
        phone: '03-6304-7740', phoneLabel: '世田谷区 児童相談支援課', line: null, chat: null,
        web: 'https://www.city.setagaya.lg.jp/03648/24424.html', hours: null
      },
      locations: [
        loc('世田谷区 児童相談支援課（梅丘分庁舎 2階）', '13112', '東京都世田谷区松原6-3-5', 35.656872, 139.653656, '03-6304-7740', null, '申請は郵送かオンライン')
      ],
      source: { org: '世田谷区', url: 'https://www.city.setagaya.lg.jp/03648/24424.html', checked: C },
      sources2: [{ org: '世田谷区（せたがや若者フェアスタート 概要）', url: 'https://www.city.setagaya.lg.jp/03648/2112.html' }],
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'minato-jiritsu-shien',
      name: { ja: '港区 社会的養護児童自立支援事業（家賃・支度金・資格）', en: 'Minato support for young people leaving care (rent, start-up, licenses)' },
      hook: { ja: 'ひとり暮らしの最初のお金と、毎月の家賃が心配', en: 'Worried about start-up costs and monthly rent' },
      summary: {
        ja: '港区が措置した施設や、港区の里親家庭から自立する人に、家賃の半分（月3万6千円まで）を最長6年、支度金20万円まで、資格を取るお金20万円までを助成します。',
        en: 'For people leaving care placed by Minato: half of rent (up to ¥36,000/month) for up to 6 years, a start-up grant up to ¥200,000 and license costs up to ¥200,000.'
      },
      cat: ['housing', 'money', 'work'],
      kind: 'grant', basis: 'local', right: false,
      amount: { ja: '家賃の1/2（月3万6千円まで・最長6年）／支度金 20万円まで／資格取得 20万円まで', en: 'Half of rent (≤¥36k/mo, ≤6 yrs); start-up ≤¥200k; licenses ≤¥200k' },
      repay: 'none',
      who: { ja: '義務教育を終えた年齢で、港区が措置した児童養護施設などから自立する人、または港区の里親家庭などから自立する人（予定の人もふくむ）。' },
      how: { ja: 'まず港区児童相談所に電話して「自立支援事業を使いたい」と伝えます。' },
      where: { ja: '港区児童相談所 児童相談課 児童福祉係' },
      docs: [],
      ask: ['私は対象になりますか？', '支度金はいつまでに申しこめばいいですか？', '東京都の家賃の支援と、どちらを先に使うといいですか？'],
      caution: { ja: '住んでいる場所ではなく「港区が措置したか・港区の里親か」で決まります。支度金は自立してから1年以内、資格のお金は5年以内に、それぞれ1回だけ申しこめます。東京都の居住費支援を受けた期間は、6年から引かれます。東京都の居住費支援（月7万2千円まで）もあります。区に聞いてください。' },
      supporter: { ja: '東京都社会福祉協議会の貸付金（自立支援資金等）と併用可。対象（3）その他区長が必要と認めた方 の規定あり。' },
      effort: 'mid',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: '支度金は自立してから1年以内、資格のお金は5年以内', en: 'Start-up grant within 1 year of leaving care; license grant within 5 years', leaveMonths: 0, months: null, always: false },
      contact: {
        phone: '03-5962-6500', phoneLabel: '港区児童相談所', line: null, chat: null,
        web: 'https://www.city.minato.tokyo.jp/jidofukushi/syakaitekiyogo.html', hours: null
      },
      locations: [],
      source: { org: '港区', url: 'https://www.city.minato.tokyo.jp/jidofukushi/syakaitekiyogo.html', checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'suginami-jiritsu-shitakukin',
      name: { ja: '杉並区 自立支度金（児童養護施設退所者等支援）', en: 'Suginami start-up grant for care leavers' },
      hook: { ja: '引っこし代や家具・家電をそろえるお金がない', en: 'No money for moving, furniture or appliances' },
      summary: {
        ja: '杉並区内の児童養護施設・自立援助ホーム・里親家庭から自立する人に、引っこしの費用や家具・家電などのお金を20万円まで出します。',
        en: 'For people leaving a children\'s home, self-reliance home or foster family in Suginami: up to ¥200,000 for moving costs, furniture and appliances.'
      },
      cat: ['money', 'housing'],
      kind: 'grant', basis: 'local', right: false,
      amount: { ja: '20万円まで（1人1回）', en: 'Up to ¥200,000 (once)' },
      repay: 'none',
      who: { ja: '杉並区内の児童養護施設や自立援助ホームを出た人、または杉並区内の里親家庭・ファミリーホームから自立した人で、自立した日が2024年4月1日以降、その日に18歳以上の人。同じような支援を他の自治体から受けている人や、生活保護を受けている人は使えません。' },
      how: { ja: '自立する日の前後3か月のうちに申請書を区に出します。決まったら請求して振りこんでもらい、買ったあとに領収書をつけて報告します。' },
      where: { ja: '杉並区 子ども家庭部 児童相談所設置準備課（杉並区役所 分庁舎 5階）' },
      docs: ['自立支度金支給申請書', '本人確認ができるもの（学生証・合格通知・社員証・内定通知・運転免許証など）', '買い物や支払いの領収書'],
      ask: ['申請は自立する何日前から出せますか？', '敷金・礼金や家電は対象になりますか？', '先にお金をもらって、あとから領収書を出す形ですか？'],
      caution: { ja: '住んでいる場所ではなく「杉並区内の施設や里親家庭から巣立ったか」で決まります。対象は自立する日の前後3か月に払ったお金です。領収書はかならず取っておきましょう。' },
      supporter: { ja: '杉並区児童養護施設退所者等応援基金（寄附）が財源。手続きは申請→概算払請求→実績報告（最後の支払日から2週間以内）の3回。' },
      effort: 'mid',
      for: { stages: ['hs3', 'left0'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: '自立する日の前後3か月以内に申請', en: 'Apply within 3 months before/after leaving care', leaveMonths: -3, months: null, always: false },
      contact: {
        phone: '03-5307-0355', phoneLabel: '杉並区 児童相談所設置準備課', line: null, chat: null,
        web: 'https://www.city.suginami.tokyo.jp/s057/1740.html', hours: null
      },
      locations: [],
      source: { org: '杉並区', url: 'https://www.city.suginami.tokyo.jp/s057/1740.html', checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'itabashi-careleaver',
      name: { ja: '板橋区 ケアリーバー応援プロジェクト', en: 'Itabashi Care Leaver Support Project' },
      hook: { ja: '家賃・光熱費・病院代…毎月の支払いがこわい', en: 'Rent, bills, doctor visits — monthly costs scare me' },
      summary: {
        ja: '板橋区の施設や里親家庭、板橋区の措置で育った人などに、支度金20万円まで、家賃を最長6年（はじめの4年は月7万2千円まで）、医療費・光熱水費（それぞれ年6万円まで）、資格のお金を助成します。居場所とLINE相談もあります。',
        en: 'Up to ¥200k start-up, rent support for up to 6 years (≤¥72k/month for years 1–4), medical and utility costs (≤¥60k/yr each) and license costs, plus a drop-in space and LINE chat.'
      },
      cat: ['housing', 'money', 'consult'],
      kind: 'grant', basis: 'local', right: false,
      amount: {
        ja: '支度金 20万円まで／家賃 1〜4年目 月7万2千円まで・5〜6年目 月3万6千円まで（家賃の1/2）／医療費 年6万円まで／光熱水費 年6万円まで／資格 費用の1/2（年15万円まで）',
        en: 'Start-up ≤¥200k; rent ≤¥72k/mo (yrs 1–4), ≤¥36k/mo (yrs 5–6); medical ≤¥60k/yr; utilities ≤¥60k/yr; licenses half (≤¥150k/yr)'
      },
      repay: 'none',
      who: { ja: '板橋区内の児童養護施設を出た人・板橋区内の里親家庭から自立した人・板橋区が措置して区外の施設や里親家庭を出た人など。原則18歳以上で措置が終わった人。働いている・学校に通っている（またはその気持ちがある）こと、施設や相談の事業所から引き続き支援を受けられることが条件です。' },
      how: { ja: 'はじめての申請では「自立に向けた目標」を短い作文で書きます。わからないことは、委託先（一般社団法人Masterpiece）のLINEや電話で手伝ってもらえます。' },
      where: { ja: '板橋区 子ども家庭部 子ども政策課 児童養護推進係' },
      docs: ['申請書', '自立に向けた目標の作文（はじめての申請のとき）', 'レシート・領収書（支度金）'],
      ask: ['私は対象ですか？ 措置をしたのはどこの区ですか？', '家賃の補助は、いつからいつまでもらえますか？', '書類の書き方を手伝ってもらえますか？'],
      caution: { ja: '住んでいる場所ではなく「板橋区の施設・里親・措置かどうか」などで決まります（区内在住で虐待経験がある人などが対象になる場合もあります）。家賃補助は自立援助ホームや生活保護、他の自治体の同じ支援を受けていると使えないことがあります。支度金は措置解除から6年をこえると請求できません。東京都の居住費支援（月7万2千円まで）もあります。どちらが使えるか区に聞いてください。' },
      supporter: { ja: '相談支援は一般社団法人Masterpiece（info@youare-masterpiece.org／080-3353-8550・070-8438-3495）。令和8年度から区内で週3回程度の居場所（火・木・第1/3/5金 13–19時、第2/4土 12–18時、予定）。東京都自立支援強化事業・養育家庭等自立援助事業等との重複不可。' },
      effort: 'high',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: '支度金は措置解除から6年以内。家賃は最長6年', en: 'Start-up grant within 6 years of leaving care; rent up to 6 years', leaveMonths: 0, months: null, always: false },
      contact: {
        phone: '03-3579-2216', phoneLabel: '板橋区 子ども政策課 児童養護推進係', line: null, chat: null,
        web: 'https://www.city.itabashi.tokyo.jp/kosodate/teate/oyakudachi/1043855.html', hours: null
      },
      locations: [
        loc('ケアリーバー居場所・相談（一般社団法人Masterpiece 拠点）', '13119', '東京都板橋区幸町1-16 ロイヤルハイツ大山 地下1階50号室', 35.745155, 139.701584, '080-3353-8550', '火・木・第1/3/5金 13:00–19:00／第2/4土 12:00–18:00（予定）', '東武東上線 大山駅から歩いて7分。行く前に連絡を')
      ],
      source: { org: '板橋区', url: 'https://www.city.itabashi.tokyo.jp/kosodate/teate/oyakudachi/1043855.html', checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'arakawa-taishosha-shien',
      name: { ja: '荒川区 児童養護施設等退所者自立支援事業（支度金・保証料・資格）', en: 'Arakawa support for care leavers (start-up, rent guarantee fee, licenses)' },
      hook: { ja: '部屋を借りたいけど、保証人も初期費用もない', en: 'I want to rent but have no guarantor or move-in money' },
      summary: {
        ja: '荒川区の施設や里親家庭、荒川区の措置で育った人に、自立のための支度金（30万円まで）、保証会社に払う保証料、資格を取る費用を補助します。',
        en: 'For people who left care in or placed by Arakawa: a start-up grant (up to ¥300,000), rental guarantee-company fees and license costs.'
      },
      cat: ['money', 'housing', 'work'],
      kind: 'grant', basis: 'local', right: false,
      amount: { ja: '支度金 30万円まで（1回）／保証料 契約時5万円まで・更新 年2万円まで／資格 年30万円まで', en: 'Start-up ≤¥300k (once); guarantee fee ≤¥50k + renewal ≤¥20k/yr; licenses ≤¥300k/yr' },
      repay: 'none',
      who: { ja: '荒川区内の施設や里親家庭を出た人、または荒川区が措置して区外の施設や里親家庭を出た人で、措置が終わったときに18歳以上の人（2023年4月1日以降に終わった人）。働いている・学校に通っている（予定やその気持ちがある）こと、親せきからお金の援助を受けられず自分の収入でくらしていること、施設長や里親の推薦があることが条件です。' },
      how: { ja: '申請書と、施設長や里親の推薦書を区に出します。推薦がもらえないときは、荒川区児童相談所長などが推薦します。まず出身の施設や里親、児童相談所に相談しましょう。' },
      where: { ja: '荒川区（出身の施設・里親家庭、荒川区児童相談所を通して申請）' },
      docs: ['補助金交付申請書', '推薦書（施設長・里親など）', '未成年のときは同意書'],
      ask: ['私は対象になりますか？', '保証会社の保証料も補助されますか？', '支度金で家具や家電を買ってもいいですか？'],
      caution: { ja: '住んでいる場所ではなく「荒川区の施設・里親・措置かどうか」で決まります。措置が終わってから5年以内に申請します。措置が終わったときから生活保護を受けている人は使えません。' },
      supporter: { ja: '根拠: 荒川区児童養護施設等退所者自立支援事業補助金交付要綱（例規集）。窓口課・電話番号は要綱に記載なし（児童相談所または子ども家庭部へ確認）。' },
      effort: 'high',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: '措置が終わってから5年以内に申請', en: 'Apply within 5 years of leaving care', leaveMonths: 0, months: null, always: false },
      contact: {
        phone: null, phoneLabel: null, line: null, chat: null,
        web: 'https://www.city.arakawa.tokyo.jp/reiki_int/reiki_honbun/p800RG00001526.html', hours: null
      },
      locations: [],
      source: { org: '荒川区（例規集：補助金交付要綱）', url: 'https://www.city.arakawa.tokyo.jp/reiki_int/reiki_honbun/p800RG00001526.html', checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'toshima-careleaver-money',
      name: { ja: '豊島区 自立時お祝い金・給付型奨学金', en: 'Toshima independence gift & scholarship for care leavers' },
      hook: { ja: '進学したいけど学費が払えるか不安', en: 'I want to study but worry about tuition' },
      summary: {
        ja: '豊島区の里親家庭や豊島区の児童相談所の措置で育った人に、自立するときのお祝い金10万円と、大学・専門学校の学費（年50万円まで・4年間）を出します。返さなくていいお金です。',
        en: 'For care leavers from Toshima foster families or placed by Toshima: a ¥100,000 independence gift and a scholarship for tuition (up to ¥500,000/year for 4 years). No repayment.'
      },
      cat: ['education', 'money'],
      kind: 'grant', basis: 'local', right: false,
      amount: { ja: 'お祝い金 10万円（1回）／奨学金 学費の実費・年50万円まで（4年間）', en: 'Gift ¥100,000 (once); scholarship up to ¥500,000/yr (4 yrs)' },
      repay: 'none',
      who: { ja: '中学卒業以上で、進学や就職のために、豊島区内の里親家庭・ファミリーホームの委託が終わる人、または豊島区児童相談所の措置で区外の施設・里親家庭・自立援助ホームなどを出る人。奨学金は大学・専門学校などに通う（予定の）人で、親せきからお金の援助を受けられない人。' },
      how: { ja: '申請書を出します（電子申請もできます）。施設長や里親の推薦が必要です。推薦がもらえないときは、豊島区児童相談所長が推薦します。' },
      where: { ja: '豊島区 子育て支援課 社会的養育施策調整グループ' },
      docs: ['申請書兼口座振替依頼書', '推薦理由書（施設長・里親が出す）', '実績報告書（奨学金）'],
      ask: ['お祝い金と奨学金は、いっしょに申しこめますか？', '国の給付型奨学金ももらう予定です。どう申請すればいいですか？', '申しこみのしめきりはいつですか？'],
      caution: { ja: '住んでいる場所ではなく「豊島区の里親・豊島区児童相談所の措置かどうか」で決まります。奨学金は入学金・授業料など学校に払うお金が対象で、教材費や交通費は対象外です。ほかの自治体から同じような奨学金をもらっていると使えません。' },
      supporter: { ja: 'としま子ども若者応援基金（寄附）が財源。高等教育の修学支援新制度で減免される額は差し引いて申請。JASSO給付型の生活費分は差し引き不要。' },
      effort: 'mid',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: 'お祝い金は自立のとき。奨学金は進学前から申請できます（くわしくは区の案内）', en: 'Gift at independence; scholarship can be applied for before starting school', leaveMonths: -3, months: null, always: false },
      contact: {
        phone: '03-4566-2500', phoneLabel: '豊島区 子育て支援課', line: null, chat: null,
        web: 'https://www.city.toshima.lg.jp/525/2606181526.html', hours: null
      },
      locations: [],
      source: { org: '豊島区', url: 'https://www.city.toshima.lg.jp/525/2606181526.html', checked: C },
      sources2: [{ org: '豊島区（令和8年度 事業のご案内PDF）', url: 'https://www.city.toshima.lg.jp/documents/56987/20260721150540.pdf' }],
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'toshima-b4s-port-ikebukuro',
      name: { ja: 'B4S PORT いけぶくろ（豊島区の居場所・相談）', en: 'B4S PORT Ikebukuro (Toshima drop-in & support)' },
      hook: { ja: '同じ経験をした人と、ごはんを食べて話したい', en: 'I want to eat and talk with people who\'ve been through the same' },
      summary: {
        ja: '豊島区が開く、施設や里親家庭で育った人などのための居場所です。月に1回、みんなで料理して夕ごはんを食べたり、スタッフに相談したりできます。自立の前後の相談（支援計画づくり）も受けられます。',
        en: 'A monthly drop-in space in Ikebukuro run with Toshima City for care-experienced young people: cook and eat together and talk to staff. Support planning before and after leaving care too.'
      },
      cat: ['consult'],
      kind: 'place', basis: 'local', right: false,
      amount: null, repay: null,
      who: { ja: '施設や里親家庭などで育った人、児童相談所に保護されたことがある人、親から不適切な関わりを受けている（受けた）人。' },
      how: { ja: 'LINEから前もって予約して行きます。相談支援は、ブリッジフォースマイルのページからLINEか電話で。' },
      where: { ja: 'IKEROOT（イケルート）1階（東池袋）' },
      docs: [],
      ask: ['はじめて行きたいです。予約はどうすればいいですか？', '自立したあとも相談できますか？'],
      caution: { ja: '開くのは原則 毎月第2日曜日の15時〜20時です。予約が必要です。' },
      supporter: { ja: '豊島区社会的養護自立支援拠点事業（委託: 認定NPO法人ブリッジフォースマイル）。令和8年8月開始。令和8年度開催日: 8/9, 9/13, 10/11, 11/8, 12/13, 1/10。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: '毎月第2日曜日（予約制）', en: '2nd Sunday monthly (booking)', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-4566-2500', phoneLabel: '豊島区 子育て支援課', line: null, chat: null,
        web: 'https://www.city.toshima.lg.jp/525/2606181603.html', hours: { ja: '居場所: 原則 第2日曜 15時〜20時', en: 'Drop-in: 2nd Sunday 15:00–20:00' }
      },
      locations: [
        loc('B4S PORT いけぶくろ（IKEROOT 1階）', '13116', '東京都豊島区東池袋4-42-16', 35.727962, 139.720795, null, '原則 第2日曜 15:00–20:00', 'LINEで予約')
      ],
      source: { org: '豊島区', url: 'https://www.city.toshima.lg.jp/525/2606181603.html', checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'katsushika-careleaver',
      name: { ja: '葛飾区 社会的養護経験者自立支援事業', en: 'Katsushika support for care leavers' },
      hook: { ja: '進学や就職の準備にお金がかかる', en: 'Getting ready for school or work costs money' },
      summary: {
        ja: '葛飾区の児童相談所の措置や、葛飾区内の施設・里親家庭から巣立って進学・就職する人に、準備のお金を20万円まで出します。',
        en: 'Up to ¥200,000 for school or job preparation for people leaving care placed by Katsushika or in a Katsushika facility/foster family.'
      },
      cat: ['money', 'education', 'work'],
      kind: 'grant', basis: 'local', right: false,
      amount: { ja: '20万円まで', en: 'Up to ¥200,000' },
      repay: 'none',
      who: { ja: '2025年3月1日以降に、葛飾区児童相談所の措置で施設などを出た人、または葛飾区内の児童養護施設・里親家庭を出た人で、進学か就職をする人。' },
      how: { ja: '申請書と推薦書（施設長か里親が書く）を、郵送か電子申請で出します。推薦がもらえないときは、葛飾区児童相談所長が推薦します。' },
      where: { ja: '葛飾区 児童相談課 事業係' },
      docs: ['申請書（本人）', '推薦書（施設長・里親）', '請求書', '実績報告書'],
      ask: ['私は対象になりますか？', 'どんな買い物が対象になりますか？', '申請はいつまでにすればいいですか？'],
      caution: { ja: '住んでいる場所ではなく「葛飾区の児童相談所の措置か、葛飾区内の施設・里親か」で決まります。' },
      supporter: { ja: '令和8年度版の案内PDF・様式（申請書・推薦書・請求書・実績報告書）が区ページにあり。' },
      effort: 'mid',
      for: { stages: ['hs3', 'left0'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: '措置が終わって進学・就職するとき（くわしくは区の案内）', en: 'When leaving care for school or work', leaveMonths: -1, months: null, always: false },
      contact: {
        phone: '03-5698-0303', phoneLabel: '葛飾区 児童相談課 事業係', line: null, chat: null,
        web: 'https://www.city.katsushika.lg.jp/kosodate/1000056/1023387/1038571.html', hours: null
      },
      locations: [],
      source: { org: '葛飾区', url: 'https://www.city.katsushika.lg.jp/kosodate/1000056/1023387/1038571.html', checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'nakano-jiritsu-kyoten',
      name: { ja: '中野区 社会的養護自立支援（親を頼れない人へのサポート）', en: 'Nakano support hub for young people who can\'t rely on parents' },
      hook: { ja: '手続きや家さがし、ひとりだと不安', en: 'Paperwork and apartment hunting feel scary alone' },
      summary: {
        ja: '施設を出た人など、親を頼れない10〜20代の人を、支援コーディネーターが伴走して支えます。手続きの同行、仕事、こころ、家さがし、お金の管理まで相談できます。',
        en: 'A coordinator walks with young people (teens–20s) who can\'t rely on parents: help with paperwork, work, mental health, housing search and money management.'
      },
      cat: ['consult', 'housing', 'procedures'],
      kind: 'service', basis: 'local', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '親を頼れない、主に10代〜20代の人。中野区の児童相談所の措置で施設などを出た人、中野区内の施設を出た人、施設などを出て中野区に住んでいる人、虐待を受けたのに公的な支援につながらなかった人など。' },
      how: { ja: '電話かLINE（ブリッジフォースマイルの相談窓口）に連絡します。会って話したいときも、まず連絡しましょう。' },
      where: { ja: '中野区子ども・若者支援センター（相談はブリッジフォースマイルの窓口へ）' },
      docs: [],
      ask: ['家さがしを手伝ってもらえますか？', '役所の手続きにいっしょに行ってもらえますか？', '同じような人と知り合えるイベントはありますか？'],
      caution: { ja: '電話・LINEの受付は 月〜土の14時〜18時（木曜・祝日・年末年始は休み）です。' },
      supporter: { ja: '中野区社会的養護自立支援拠点事業（委託: 認定NPO法人ブリッジフォースマイル）。支援計画作成、生活補助支援、学び・交流支援（BBQ等）。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: true, age: { min: 15, max: 29 }, areas: ['13114'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-5937-3605', phoneLabel: 'ブリッジフォースマイル（中野区の相談窓口）', line: null, chat: null,
        web: 'https://www.city.tokyo-nakano.lg.jp/kurashi/soudan/soudan/syakaitekiyougo.html',
        hours: { ja: '月〜土 14時〜18時（木曜・祝日・年末年始は休み）', en: 'Mon–Sat 14:00–18:00 (closed Thu, holidays)' }
      },
      locations: [],
      source: { org: '中野区', url: 'https://www.city.tokyo-nakano.lg.jp/kurashi/soudan/soudan/syakaitekiyougo.html', checked: C },
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'shinagawa-jiritsu-kyoten',
      name: { ja: '品川区 社会的養護自立支援拠点事業', en: 'Shinagawa support hub for care leavers' },
      hook: { ja: '自立のこと、続けて相談できる人がほしい', en: 'I want someone I can keep talking to about living on my own' },
      summary: {
        ja: '施設を出た人など親を頼れない人のための相談です。いっしょに自立の計画をつくり、生活・進路・健康の相談にのってくれます。ひとり暮らしをイメージできる交流の場もあります。',
        en: 'Support for people who can\'t rely on parents, such as care leavers: make an independence plan together and get advice on life, career and health. Social events too.'
      },
      cat: ['consult'],
      kind: 'service', basis: 'local', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '品川区の児童相談所の措置で施設に入った（いる）人、品川区内の施設に入った（いる）人、施設などを出て品川区に住んでいる人、虐待を受けたのに公的な支援につながらなかった人など。' },
      how: { ja: 'ブリッジフォースマイルのホームページから、LINEか電話で相談します。' },
      where: { ja: '相談はブリッジフォースマイル（区の委託）へ' },
      docs: [],
      ask: ['自立の計画をいっしょに作ってもらえますか？', '進学と仕事、どちらがいいか迷っています。相談できますか？'],
      caution: { ja: '受付は 月・火・水・金・土の14時〜18時（祝日・年末年始は休み）です。' },
      supporter: { ja: '品川区社会的養護自立支援拠点事業（委託: 認定NPO法人ブリッジフォースマイル）。区の担当: 子ども育成課 社会的養育推進係 03-5742-7147。' },
      effort: 'low',
      for: { stages: ['hs12', 'hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13109'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-5742-7147', phoneLabel: '品川区 子ども育成課 社会的養育推進係', line: null, chat: null,
        web: 'https://www.city.shinagawa.tokyo.jp/PC/kodomo/kodomo-kateisoudan/202510sixyakaitekiyougoziritusien.html',
        hours: { ja: '相談: 月・火・水・金・土 14時〜18時', en: 'Consultation: Mon, Tue, Wed, Fri, Sat 14:00–18:00' }
      },
      locations: [],
      source: { org: '品川区', url: 'https://www.city.shinagawa.tokyo.jp/PC/kodomo/kodomo-kateisoudan/202510sixyakaitekiyougoziritusien.html', checked: C },
      sources2: [{ org: '認定NPO法人ブリッジフォースマイル', url: 'https://www.b4s.jp/care/' }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'edogawa-you-terrace',
      name: { ja: 'Youテラス（江戸川区 社会的養護自立支援拠点）', en: 'You Terrace (Edogawa care leaver hub)' },
      hook: { ja: '気軽に寄れて、話を聞いてもらえる場所がほしい', en: 'I want a place I can drop by and be listened to' },
      summary: {
        ja: '施設を出た人などのための、江戸川区の居場所・相談の拠点です。相談のほか、仲間との交流、心理カウンセリング、法律相談も受けられます。',
        en: 'An Edogawa hub for care leavers and others: talk to staff, meet peers, and get counseling and legal advice.'
      },
      cat: ['consult'],
      kind: 'place', basis: 'local', right: false,
      amount: null, repay: null,
      who: { ja: '施設などの措置が終わった人、児童相談所の指導を受けた人、虐待を受けたのに公的な支援につながらなかった人。主に江戸川区内と、となりの区の人。' },
      how: { ja: '開いている日に行くか、まず電話してみましょう。' },
      where: { ja: 'Youテラス（中葛西）' },
      docs: [],
      ask: ['はじめてです。どんなふうに使えますか？', '法律の相談もできますか？'],
      caution: { ja: '開いているのは 火・木 14時〜19時、土 11時〜16時 です。' },
      supporter: { ja: '江戸川区社会的養護自立支援拠点事業（補助事業者: 特定非営利活動法人ハートフル）。支援計画策定・相談・相互交流・心理療法・法律相談。施設入所者等の支援はワーカーズコープ・センター事業団に委託。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13123'] },
      deadline: { ja: 'いつでも', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-6661-4001', phoneLabel: 'Youテラス', line: null, chat: null,
        web: 'https://www.city.edogawa.tokyo.jp/jiso/jigyoguide/shakaitekiyougo.html',
        hours: { ja: '火・木 14時〜19時／土 11時〜16時', en: 'Tue & Thu 14:00–19:00, Sat 11:00–16:00' }
      },
      locations: [
        loc('Youテラス', '13123', '東京都江戸川区中葛西6-3-20', 35.660858, 139.865036, '03-6661-4001', '火・木 14:00–19:00／土 11:00–16:00', '')
      ],
      source: { org: '江戸川区 児童相談所', url: 'https://www.city.edogawa.tokyo.jp/jiso/jigyoguide/shakaitekiyougo.html', checked: C },
      eligibleBy: 'residence',
      verifiedBy: V
    }
  ];


  /* ---- (3) 子供家庭支援センター（62区市町村）— 中学生・高校生が「近くで話せる」公的な窓口 --------------
   * 出典: 東京都福祉局「子供家庭支援センター」一覧（令和8年8月1日現在）。世田谷区のみ区のページで地域別に補足。
   * 座標: 国土地理院 住所検索API。町・村の大字までしか一致しないもの（島しょ・稲城市など）は null。 */
  var KC_URL = 'https://www.fukushi.metro.tokyo.lg.jp/ja/kodomo/kosodate/center';
  var KC_SRC = { org: '東京都福祉局（子供家庭支援センター一覧 令和8年8月1日現在）', url: KC_URL, checked: C3 };
  var JR_ALL = ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'];   // 18歳未満の子ども向け（巣立った後の人はのぞく）
  // 一覧に「子ども専用」などと書かれている電話（中学生が直接かけやすい番号）
  var KIDLINE = {
    '13116': { phone: '0120-618-471', label: '子ども専用ダイヤル（豊島区）', hours: null },
    '13118': { phone: '0120-536-883', label: 'あらかわキッズ・ファミリーコール24', hours: null },
    '13119': { phone: '0120-925-610', label: '子どもなんでも相談（板橋区）', hours: { ja: '24時間365日', en: '24 hours, every day' } },
    '13207': { phone: '0120-678-044', label: '子ども専用ダイヤル（昭島市）', hours: null },
    '13209': { phone: '0120-552-164', label: '子ども専用相談ダイヤル（町田市）', hours: null },
    '13214': { phone: '0800-800-9033', label: '子ども専用相談電話（国分寺市）', hours: null }
  };
  var KC_EXTRA_LOCS = {
    '13206': [loc('府中市子育て世代包括支援センター「みらい」', '13206', '東京都府中市宮町一丁目41番地 フォーリス3階', 35.670776, 139.479736, '042-319-0072',
      '午前10時から午後6時（相談窓口は月〜金 8:30–18:00、来所相談は10時から）（休み: 年末年始・臨時休館日）', '')]
  };

  function kc(code, slug, city, en, cname, addr, lat, lng, phone, note, hours) {
    var kid = KIDLINE[code];
    var isCenter = /センター/.test(cname);
    var locs = addr ? [loc(cname, code, addr, lat, lng, phone, hours, note || '')] : [];
    if (KC_EXTRA_LOCS[code]) locs = locs.concat(KC_EXTRA_LOCS[code]);
    return {
      id: slug + '-kodomo-katei-center',
      name: {
        ja: isCenter ? cname : city + ' 子どもと家庭の相談窓口（' + cname + '）',
        en: en + ': Child & Family Support Center'
      },
      hook: { ja: '家のこと・自分のこと、近くの大人に話したい', en: 'I want to talk to an adult nearby about home or myself' },
      summary: {
        ja: city + 'の、18歳未満の子どもと家族のための相談窓口です。家や親のこと、学校に行きづらいことなど、なんでも相談できます。' + (kid ? '子どもが直接かけられる専用の電話もあります。' : ''),
        en: 'A local help desk in ' + en + ' for children under 18 and their families: home, parents, trouble going to school — anything.' + (kid ? ' There is a phone line just for kids.' : '')
      },
      cat: ['consult'],
      kind: 'service', basis: 'local', right: false,
      amount: null, repay: null,
      who: { ja: city + 'に住む18歳未満の子どもと、その家族。' },
      how: { ja: (kid ? 'まず「' + kid.label + '」（' + kid.phone + '）に電話してみよう。' : 'まず電話で「相談したいことがあります」と伝えます。') + '話しに行くこともできます。' },
      where: { ja: cname },
      docs: [],
      ask: ['家のことで困っています。話を聞いてもらえますか？', '学校に行きづらいです。どこに相談すればいいですか？', '親に知られずに相談できますか？'],
      caution: { ja: '命や体があぶないときは、すぐに110番か、児童相談所の189へ。' + (note ? 'ほかの電話番号は「場所」にのっています。' : '') },
      supporter: { ja: '区市町村の子供家庭支援センター。18歳未満の子供と子育て家庭の総合相談に加え、ショートステイ・一時預かりなどの在宅サービスやケース援助も行う（都のページより）。' },
      effort: 'low',
      for: { stages: JR_ALL, paths: [], care: [], careOnly: false, age: { min: 12, max: 17 }, areas: [code] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: kid ? kid.phone : phone,
        phoneLabel: kid ? kid.label : cname,
        line: null, chat: null, web: KC_URL,
        hours: kid ? kid.hours : { ja: hours, en: null }
      },
      locations: locs,
      source: KC_SRC,
      eligibleBy: 'residence',
      verifiedBy: V
    };
  }

  var KC = [
    kc('13101', 'chiyoda', '千代田区', 'Chiyoda', '千代田区立児童・家庭支援センター', '東京都千代田区神田司町二丁目16番 神田さくら館6階', 35.693047, 139.768494, '03-5298-5521', '千代田っこホットライン 03-3256-8150', '午前9時から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13102', 'chuo', '中央区', 'Chuo', '中央区立子ども家庭支援センター', '東京都中央区明石町12番1号 4階', 35.666866, 139.776306, '03-3542-6322', '虐待情報専用電話 03-3542-6328', '午前9時から午後5時（休み: 祝日・年末年始）'),
    kc('13103', 'minato', '港区', 'Minato', '港区子ども家庭支援センター', '東京都港区南青山5-7-11 港区子ども家庭総合支援センター1・2・3階', 35.662689, 139.712814, '03-5962-7215', '03-5962-7215 は「港区子ども家庭相談ダイヤル」', '（月曜日から金曜日）8時30分から18時00分 （土曜日）8時30分から17時00分（休み: 日曜日・祝日・年末年始）'),
    kc('13104', 'shinjuku', '新宿区', 'Shinjuku', '新宿区立子ども総合センター', '東京都新宿区新宿七丁目3番29号', 35.701225, 139.712662, '03-3232-0675', null, '午前8時30分から午後7時 日曜日・祝日（電話相談のみ）午前8時30分から午後5時（休み: 年末年始）'),
    kc('13105', 'bunkyo', '文京区', 'Bunkyo', '文京区こども家庭支援センター', '東京都文京区春日一丁目16番21号 シビックセンター5階', 35.708336, 139.752411, '03-5803-1109', null, '午前9時から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13106', 'taito', '台東区', 'Taito', '台東区日本堤子ども家庭支援センター', '東京都台東区日本堤二丁目25番8号', 35.72805, 139.797028, '03-5824-2571', '24時間受付電話 03-3875-1889', '午前9時から午後5時（ひろばは午前10時から午後4時）（休み: 日曜日・祝日・年末年始）'),
    kc('13107', 'sumida', '墨田区', 'Sumida', '墨田区子育て支援総合センター', '東京都墨田区横川五丁目7番4号 すみだ保健子育て総合センター（4階）', 35.704685, 139.818054, '03-3622-1150', '相談専用電話 03-3622-1154', '午前9時から午後6時（休み: 土曜日･日曜日・祝日･年末年始）'),
    kc('13108', 'koto', '江東区', 'Koto', '江東区こども未来部養育支援課養育支援係', '東京都江東区東陽四丁目11番28号', 35.672993, 139.81636, '03-3647-4408', '虐待ホットライン 03-3646-5481（養育支援課内）', '午前8時30分から午後5時00分（虐待ホットライン：午前8時30分から午後5時15分）（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13109', 'shinagawa', '品川区', 'Shinagawa', '品川区子ども家庭支援センター', '東京都品川区広町2-1-36', 35.608822, 139.729767, '03-6421-5236', null, '午前8時30分から午後5時15分（休み: 日曜日・祝日・年末年始）'),
    kc('13110', 'meguro', '目黒区', 'Meguro', '目黒区こども家庭センター', '東京都目黒区上目黒二丁目19番15号（目黒区総合庁舎別館2階）', 35.640465, 139.6987, '03-3715-2641', '虐待通告専用（月〜金）03-5722-9743', '8時30分から午後5時（月曜日から土曜日） 虐待通告窓口は午前8時30分から午後5時（月曜日から金曜日）（休み: 日曜日・祝日・年末年始）'),
    kc('13111', 'ota', '大田区', 'Ota', '大田区おおたこども家庭センター', '東京都大田区大森西二丁目3番22号（大田区こども未来総合センター内）', 35.578339, 139.729736, '03-5753-7830', 'おおた児童虐待対応ダイヤル #9924（03-5753-9924）', '午前8時30分から午後6時（月曜日から金曜日） 虐待通報は午前8時30分から午後5時45分（月曜日から金曜日）（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13113', 'shibuya', '渋谷区', 'Shibuya', '渋谷区子ども家庭支援センター', '東京都渋谷区宇田川町5-6', 35.66291, 139.698425, '03-3463-3748', '相談専用電話 0120-135-415', '午前9時00分から午後5時00分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13114', 'nakano', '中野区', 'Nakano', '中野区子ども・若者支援センター', '東京都中野区中央一丁目41番2号', 35.698292, 139.683182, '03-5937-3257', null, '午前8時30分から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13115', 'suginami', '杉並区', 'Suginami', '杉並子ども家庭支援センター', '東京都杉並区阿佐谷北一丁目4番2', 35.705467, 139.638382, '03-5356-2602', '相談専用電話 03-5356-2601（9:00–20:00。日・祝・年末年始は休み）', '午前8時30分から午後5時（相談専用電話は午前9時00分から午後8時00分）（休み: 土曜日・日曜日・祝日・年末年始、（相談専用電話は日・祝・年末年始））'),
    kc('13116', 'toshima', '豊島区', 'Toshima', '豊島区東部子ども家庭支援センター', '東京都豊島区上池袋二丁目35番22号', 35.737057, 139.718262, '03-5980-5275', '子ども専用 0120-618-471 / 児童虐待専用 03-6858-2302（月〜金 8:30–17:15）', '午前9時から午後6時、土曜日・日曜日は午前9時から午後5時まで（休み: 祝日・年末年始）'),
    kc('13117', 'kita', '北区', 'Kita', '北区子ども家庭支援センター', '東京都北区王子6丁目7番3号 旧清至中学校別棟', 35.762653, 139.740387, '03-3914-9565', '児童虐待専用 03-3912-1894（月〜土）', '午前9時から午後5時30分（休み: 祝日・年末年始（日曜日はひろばのみ開設））'),
    kc('13118', 'arakawa', '荒川区', 'Arakawa', '荒川区子ども家庭総合センター', '東京都荒川区荒川一丁目50番17号', 35.734066, 139.784592, '03-3802-3765', 'あらかわキッズ・ファミリーコール24 0120-536-883', '午前8時30分から午後5時15分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13119', 'itabashi', '板橋区', 'Itabashi', '板橋区子ども家庭総合支援センター', '東京都板橋区本町24-17', 35.759575, 139.708801, '03-5944-2371', '虐待相談専用 03-5944-2373（24時間365日） / 子どもなんでも相談 0120-925-610（24時間365日）', '午前8時30分から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13120', 'nerima', '練馬区', 'Nerima', '練馬区子ども家庭支援センター', '東京都練馬区豊玉北5丁目28番3号', 35.734859, 139.653244, '03-3993-8155', '虐待通告専用フリーダイヤル 0120-248-551', '午前8時30分から午後7時、土曜日は午後5時まで（休み: 日曜日・祝日・年末年始）'),
    kc('13121', 'adachi', '足立区', 'Adachi', '足立区こども家庭相談室', '東京都足立区梅島三丁目28番8号', 35.775742, 139.792709, '03-3852-3535', null, '午前8時30分から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13122', 'katsushika', '葛飾区', 'Katsushika', '葛飾区子ども総合センター', '東京都葛飾区青戸四丁目15番14号 健康プラザかつしか2階', 35.751595, 139.850891, '03-3602-1386', '虐待通報相談専用 03-3602-1389', '午前8時30分から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13123', 'edogawa', '江戸川区', 'Edogawa', '江戸川区子ども家庭センター', '東京都江戸川区中央3丁目4番18号', 35.710094, 139.871796, '03-5678-1810', null, '午前8時30分から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13201', 'hachioji', '八王子市', 'Hachioji', '八王子市こども家庭総合センター', '東京都八王子市明神町三丁目19番2号 東京たま未来メッセ庁舎・会議室棟4階 （八王子市保健所内）', 35.656578, 139.342804, '042-656-8225', null, '午前9時から午後5時（休み: 土曜日、日曜日、祝日、年末年始）'),
    kc('13202', 'tachikawa', '立川市', 'Tachikawa', '立川市子ども家庭センター', '東京都立川市錦町3-3-6', 35.694016, 139.421005, '042-528-6871', '虐待通告専用 042-528-4338', '午前9時から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13203', 'musashino', '武蔵野市', 'Musashino', '武蔵野市子ども家庭支援センター', '東京都武蔵野市緑町二丁目2番28号 武蔵野市役所3階', 35.717499, 139.566452, '0422-55-9002', 'フリーダイヤル 0120-839-002', '電話相談 午前8時30分から午後10時 （来所訪問相談 午前8時30分から午後5時）（休み: 日曜日・祝日・年末年始（来所訪問相談は土曜日も休み））'),
    kc('13204', 'mitaka', '三鷹市', 'Mitaka', '三鷹市子ども家庭支援センターりぼん', '東京都三鷹市下連雀九丁目11番7号 三鷹市教育センター2階', 35.684196, 139.559494, '0422-40-5925', null, '午前8時30分から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13205', 'ome', '青梅市', 'Ome', '青梅市こども家庭センター', '東京都青梅市東青梅一丁目174番1号 青梅市健康センター内', 35.787659, 139.272736, '0428-24-2126', null, '午前8時30分から午後5時（休み: 土曜日･日曜日･祝日・年末年始）'),
    kc('13206', 'fuchu', '府中市', 'Fuchu', '府中市子ども家庭支援センター「たっち」', '東京都府中市宮町一丁目50番 くるる3階', 35.671555, 139.480728, '042-354-8701', '042-354-8702 も使えます', '午前10時から午後8時（休み: 年末年始・臨時休館日）'),
    kc('13207', 'akishima', '昭島市', 'Akishima', '昭島市こども家庭センター', '東京都昭島市つつじが丘三丁目3番15 アキシマエンシス校舎棟1階', 35.711323, 139.368759, '042-543-9046', '子ども専用ダイヤル 0120-678-044', '午前9時から午後6時30分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13208', 'chofu', '調布市', 'Chofu', '調布市子ども家庭支援センターすこやか', '東京都調布市国領町三丁目1番38号 ココスクエア2階', 35.649574, 139.558685, '042-481-7731', '虐待防止ホットライン 0120-087-358', '午前9時から午後5時（休み: 第3土曜日とその翌日・年末年始）'),
    kc('13209', 'machida', '町田市', 'Machida', '町田市子ども家庭支援課', '東京都町田市森野二丁目2番22号 町田市役所2階', 35.547039, 139.438141, '042-724-4419', '子ども専用相談ダイヤル 0120-552-164', '午前8時30分から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13210', 'koganei', '小金井市', 'Koganei', '小金井市こども家庭センター', '東京都小金井市貫井北町五丁目18番18号 保健センター1階', 35.702, 139.49025, '042-321-3161', '総合相談 042-321-3146', '月曜日から金曜日までは午前8時30から午後5時 土曜日は午前9時から午後5時 （ひろばは午前10時から午後4時）（休み: 日曜日・祝日・年末年始 （ひろばは月曜日も休み））'),
    kc('13211', 'kodaira', '小平市', 'Kodaira', '小平市子ども家庭支援センター', '東京都小平市小川東町四丁目2番1号 小平元気村おがわ東2階', 35.73999, 139.474518, '042-348-2102', '虐待相談ほっとライン 042-347-3192', '午前10時から午後6時（休み: 日曜日・月曜日・祝日・年末年始）'),
    kc('13212', 'hino', '日野市', 'Hino', '日野市子ども家庭支援センター', '東京都日野市神明一丁目13番2号 子ども包括支援センター2階', 35.671543, 139.396469, '042-506-2152', '児童虐待専用 042-506-2153', '午前9時から午後5時45分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13213', 'higashimurayama', '東村山市', 'Higashimurayama', '東村山市こども家庭センター', '東京都東村山市本町一丁目2番3号 いきいきプラザ3階', 35.75449, 139.468414, '042-393-5111', '相談専用 042-390-2271', '午前9時から午後5時（休み: 土曜日･日曜日・祝日・年末年始）'),
    kc('13214', 'kokubunji', '国分寺市', 'Kokubunji', '国分寺市立こども家庭センター', '東京都国分寺市泉町2-3-8 いずみプラザ1階', 35.696209, 139.468216, '042-321-1809', '子ども専用相談電話 0800-800-9033（フリーダイヤル）または 042-321-1956', '午前8時30分から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13215', 'kunitachi', '国立市', 'Kunitachi', '国立市子ども家庭支援センター', '東京都国立市富士見台二丁目47番1号', 35.684376, 139.441513, '042-573-0192', null, '午前8時30分から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13218', 'fussa', '福生市', 'Fussa', '福生市こども家庭センター', '東京都福生市福生2125番地3 福生市保健センター2階', 35.743938, 139.332703, '042-539-2555', null, '午前8時30分から午後5時15分、水曜日は午後8時まで（休み: 日曜日・祝日・年末年始）'),
    kc('13219', 'komae', '狛江市', 'Komae', '狛江市子ども家庭支援センター', '東京都狛江市元和泉一丁目11番11号 ひだまりセンター1階', 35.631226, 139.575882, '03-5438-6605', '相談専用 03-5438-6606', '午前9時から午後6時（休み: 日曜日・祝日・年末年始）'),
    kc('13220', 'higashiyamato', '東大和市', 'Higashiyamato', '東大和市子ども家庭センター', '東京都東大和市中央3-936-8 市役所会議棟1階', 35.745552, 139.426147, '042-565-3651', null, '午前8時30分から午後5時15分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13221', 'kiyose', '清瀬市', 'Kiyose', '清瀬市子ども家庭支援センター', '東京都清瀬市中里五丁目842番地 清瀬市役所北隣 しあわせ未来センター内', 35.785568, 139.52655, '042-495-7701', null, '午前8時30分から午後5時15分（休み: 日曜日・祝日・年末年始）'),
    kc('13222', 'higashikurume', '東久留米市', 'Higashikurume', '東久留米市こども家庭センター', '東京都東久留米市滝山四丁目3番14号 わくわく健康プラザ北棟2階', 35.742264, 139.503891, '042-471-0910', null, '午前8時30分から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13223', 'musashimurayama', '武蔵村山市', 'Musashimurayama', '武蔵村山市子ども家庭支援センター', '東京都武蔵村山市学園四丁目5番1号 武蔵村山市民総合センター内', 35.746132, 139.403259, '042-590-1152', null, '午前8時30分から午後7時（休み: 日曜日・祝日・年末年始）'),
    kc('13224', 'tama', '多摩市', 'Tama', '多摩市こども家庭センター', '東京都多摩市関戸4-19-5', 35.648975, 139.449585, '042-355-3777', null, '午前8時30分から午後6時（休み: 日曜日・祝日・年末年始）'),
    kc('13225', 'inagi', '稲城市', 'Inagi', '稲城市子ども家庭支援センター', '東京都稲城市東長沼2115番2号 3F', null, null, '042-378-6366', null, '午前8時30分から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13227', 'hamura', '羽村市', 'Hamura', '羽村市こども家庭センター', '東京都羽村市緑ヶ丘5-5-2 保健センター2階', 35.768913, 139.312088, '042-578-2882', null, '午前8時30分から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13228', 'akiruno', 'あきる野市', 'Akiruno', 'あきる野市こども家庭センター', '東京都あきる野市秋川1－8 トラストルピア2階', 35.729977, 139.287033, '042-550-3313', null, '午前8時30分から午後6時30分 （面接相談 午前10時から午後6時30分）（休み: 第2水曜日・日曜日･祝日･年末年始）'),
    kc('13229', 'nishitokyo', '西東京市', 'Nishitokyo', '西東京市子ども家庭センター', '東京都西東京市中町1-5-1 防災・保谷保健福祉総合センター4階', 35.741821, 139.557983, '042-425-3303', '相談専用電話 042-439-0081', '午前9時から午後5時 （相談専用電話）午前9時から午後4時まで 土曜日は電話相談のみ（休み: 日曜日・祝日・年末年始）'),
    kc('13303', 'mizuho', '瑞穂町', 'Mizuho', '瑞穂町子ども家庭支援センター', '東京都瑞穂町石畑1972番地', 35.776951, 139.359375, '042-568-0051', null, '午前9時から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13305', 'hinode', '日の出町', 'Hinode', '日の出町こども家庭センター', '東京都日の出町大字平井2780番地 保健センター2階', 35.742443, 139.256607, '042-597-6177', null, '午前9時から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13308', 'okutama', '奥多摩町', 'Okutama', '奥多摩町子ども家庭支援センター', '東京都奥多摩町小丹波108番地', null, null, '0428-85-1788', null, '午前8時30分から午後5時15分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13307', 'hinohara', '檜原村', 'Hinohara', '檜原村こども家庭センター', '東京都檜原村2717番地 檜原村やすらぎの里けんこう館2階', null, null, '042-598-3122', null, '午前9時から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13361', 'oshima', '大島町', 'Oshima', '大島町子ども家庭支援センター', '東京都大島町元町字丸塚548番1', null, null, '04992-2-2398', null, '午前9時から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13362', 'toshimamura', '利島村', 'Toshima Village', '利島村こども家庭センター', '東京都利島村105 利島村高齢者在宅サービスセンター内', null, null, '04992-9-0018', null, '午前9時から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13363', 'niijima', '新島村', 'Niijima', '新島村こども家庭センター', '東京都新島村本村三丁目12番8号 さわやか健康センター内', 34.372868, 139.25946, '04992-5-1856', null, '午前9時から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13364', 'kozushima', '神津島村', 'Kozushima', '神津島村こども家庭センター', '東京都神津島村904 神津島村役場内', 34.205669, 139.134155, '04992-8-0011', null, '午前8時30分から午後5時（休み: 土曜日･日曜日・祝日・年末年始）'),
    kc('13381', 'miyake', '三宅村', 'Miyake', '三宅村子ども家庭支援センター', '東京都三宅村阿古497 三宅村役場内', null, null, '04994-5-0902', null, '午前8時30分から午後5時15分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13382', 'mikurajima', '御蔵島村', 'Mikurajima', '御蔵島村子ども家庭支援センター', '東京都御蔵島村字入かねが沢 御蔵島村役場内', 33.897289, 139.595901, '04994-8-2121', null, '午前9時から午後5時（休み: 土曜日・日曜日･祝日・年末年始）'),
    kc('13401', 'hachijo', '八丈町', 'Hachijo', '八丈町こども家庭センター', '東京都八丈町大賀郷2551番地2 八丈町役場内', null, null, '04996-2-4300', null, '午前8時45分から午後5時00分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13402', 'aogashima', '青ヶ島村', 'Aogashima', '青ヶ島村役場 総務課 庶務民生係', null, null, null, '04996-9-0111', null, '午前9時から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13421', 'ogasawara', '小笠原村', 'Ogasawara', '小笠原村子ども家庭支援センター', '東京都小笠原村父島字西町小笠原村役場内', null, null, '04998-2-3939', null, '午前8時から午後5時15分（休み: 土曜日・日曜日・祝日・年末年始）')
  ];

  // 世田谷区は5つの地域ごとにセンターがある（区のページ「総合支所業務案内 子ども家庭支援課」「窓口のご案内」）
  (function () {
    var SG = 'https://www.city.setagaya.lg.jp/kyoutsu/kodomo/8442.html';
    var r = kc('13112', 'setagaya', '世田谷区', 'Setagaya', '世田谷区子ども家庭支援センター（5地域）', null, null, null, '03-5432-2915', null, '');
    r.where = { ja: '住んでいる地域の総合支所（世田谷・北沢・玉川・砧・烏山）の子ども家庭支援センター' };
    r.how = { ja: '住んでいる地域の子ども家庭支援センターに電話します（地域は区のページ「窓口のご案内」で確認できます）。話しに行くこともできます。' };
    r.contact = { phone: '03-5432-2915', phoneLabel: 'せたがや子ども家庭支援センター（世田谷地域）', line: null, chat: null, web: SG,
      hours: { ja: '世田谷地域: 午前8時30分から午後5時（休み: 土・日・祝日・年末年始）', en: 'Setagaya area: weekdays 8:30–17:00' } };
    r.locations = [
      loc('せたがや子ども家庭支援センター（世田谷総合支所）', '13112', '東京都世田谷区世田谷4丁目22番33号', 35.646301, 139.652374, '03-5432-2915', '午前8時30分から午後5時（休み: 土・日・祝日・年末年始）', '世田谷地域'),
      loc('きたざわ子ども家庭支援センター（北沢総合支所）', '13112', '東京都世田谷区北沢2丁目8番18号', 35.662132, 139.669952, '03-6804-7525', null, '北沢地域'),
      loc('たまがわ子ども家庭支援センター（玉川総合支所）', '13112', '東京都世田谷区等々力3丁目4番1号', 35.608311, 139.648712, '03-3702-1189', null, '玉川地域'),
      loc('きぬた子ども家庭支援センター（砧総合支所）', '13112', '東京都世田谷区成城6丁目2番1号', 35.641003, 139.601028, '03-3482-1415', null, '砧地域'),
      loc('からすやま子ども家庭支援センター（烏山総合支所）', '13112', '東京都世田谷区南烏山6丁目22番14号', 35.669556, 139.598145, '03-3326-6155', null, '烏山地域')
    ];
    r.caution = { ja: '命や体があぶないときは、すぐに110番か、児童相談所の189へ。電話番号は住んでいる地域でちがいます。' };
    r.source = { org: '世田谷区（総合支所業務案内 子ども家庭支援課）', url: SG, checked: C3 };
    r.sources2 = [{ org: '世田谷区（窓口のご案内）', url: 'https://www.city.setagaya.lg.jp/02243/1413.html' }, { org: KC_SRC.org, url: KC_URL }];
    KC.splice(11, 0, r);
  })();

  /* ---- (4) 子どもの学習・生活支援事業（23区）— 生活が苦しい家庭の中学生・高校生の勉強をサポート ----------
   * 出典: 東京都福祉局「任意事業実施状況（区部）」各区PDF（令和7年9月末時点、2026年1月27日更新）。
   * 区のページで内容を確かめられた区（中央区・板橋区）は区のページを出典にしています。
   * 北区は、この事業の対象が小学生のみ（中学生は別の部署の事業）のため載せていません。 */
  var NINNI = { org: '東京都福祉局（任意事業実施状況（区部））', url: 'https://www.fukushi.metro.tokyo.lg.jp/seikatsu/seikatsukonnkyuu/ninnijigyoku' };
  /* o = { code, slug, city, en, pdf, whoJa, whatJa, stages, age, phone, phoneLabel, url?, org?, how?, free?, note?, locs?, sources2? } */
  function gakushu(o) {
    return {
      id: o.slug + '-gakushu-shien',
      name: { ja: o.city + ' 子どもの学習・生活支援', en: o.en + ': Study & Life Support for Kids' },
      hook: { ja: '塾に行けない。勉強を見てくれる人がほしい', en: 'I can\'t afford cram school and want someone to help me study' },
      summary: {
        ja: o.city + 'が、生活が苦しい家庭などの子どもの勉強や進学を手伝う事業です。' + o.whatJa,
        en: o.en + ' helps children from low-income families with studying and getting into high school.' + (o.free ? ' Free.' : '')
      },
      cat: ['education', 'consult'],
      kind: 'service', basis: 'local', right: false,
      amount: o.free ? { ja: '無料', en: 'Free' } : null, repay: null,
      who: { ja: o.whoJa },
      how: { ja: o.how || ('まず「' + o.phoneLabel + '」に電話して、「子どもの学習支援を使いたい」と伝えます。生活保護を受けている家庭は、担当のケースワーカーにも聞けます。') },
      where: { ja: o.phoneLabel },
      docs: [],
      ask: ['子どもの学習支援を使いたいです。うちは対象になりますか？', 'どこで、何曜日にやっていますか？', '高校受験の相談もできますか？'],
      caution: { ja: (o.note ? o.note + ' ' : '') + '対象になる家庭の条件があります。くわしい場所や日にちは、申しこんだ人に案内されます。' },
      supporter: { ja: '生活困窮者自立支援法の任意事業「子どもの学習・生活支援事業」（' + o.city + '）。都の一覧（令和7年9月末時点）で実施を確認。受験生チャレンジ支援貸付（中3）とあわせて案内するとよい。' },
      effort: 'mid',
      for: { stages: o.stages, paths: [], care: [], careOnly: false, age: o.age, areas: [o.code] },
      deadline: { ja: 'いつでも相談できます（定員がある教室もあります）', en: 'Anytime (some classes have limited places)', leaveMonths: null, months: null, always: true },
      contact: { phone: o.phone, phoneLabel: o.phoneLabel, line: null, chat: null, web: o.url || o.pdf, hours: o.hours || null },
      locations: o.locs || [],
      source: { org: o.org || ('東京都福祉局（生活困窮者に対する各種支援の実施状況・' + o.city + '）'), url: o.url || o.pdf, checked: C3 },
      sources2: (o.sources2 || []).concat(o.url ? [{ org: '東京都福祉局（生活困窮者に対する各種支援の実施状況・' + o.city + '）', url: o.pdf }] : [NINNI]),
      eligibleBy: 'residence',
      verifiedBy: V
    };
  }
  var NP = 'https://www.fukushi.metro.tokyo.lg.jp/documents/d/fukushi/';
  var JHS = ['jhs12', 'jhs3'], JHS_HS = ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'];

  var G = [
    gakushu({ code: '13101', slug: 'chiyoda', city: '千代田区', en: 'Chiyoda City', pdf: NP + '2026-01-26-142216-176',
      whoJa: '千代田区に住む、生活が苦しい家庭などの小学4年生〜高校3年生。',
      whatJa: '小学4年生から高校3年生まで、勉強のサポートと、安心して過ごせる居場所があります。',
      stages: JHS_HS, age: { min: 9, max: 18 }, phone: '03-5211-4126', phoneLabel: '千代田区 生活支援課' }),

    gakushu({ code: '13102', slug: 'chuo', city: '中央区', en: 'Chuo City', pdf: NP + '2026-01-26-142312-680',
      url: 'https://www.city.chuo.lg.jp/a0022/kosodate/kosodate/shien/gakushu_shien.html', org: '中央区（中央区子どもの学習・生活支援事業）', free: true,
      whoJa: '中央区に住む、就学援助（生活保護をふくむ）・児童扶養手当を受けている家庭、または同じくらいの収入の家庭の、小学4年生〜おおむね20歳以下の高校生。高校をやめた人、高校に行っていない人も。',
      whatJa: '無料です。中学生はボランティアの先生と1〜2人ずつの個別の学習会（週1回・2時間）、高校生世代は自由に勉強できる居場所があります。',
      how: '区のページの申込フォームから申しこみます。フォームがむずかしいときはメールかFAXでも申しこめます。申しこんだあとに面談があります。わからないことは区の福祉総合相談係に電話で聞けます。',
      note: '教室によっては定員がいっぱいで、募集を止めていることがあります（2026年7月24日時点）。運営はNPO法人キッズドアです。',
      stages: JHS_HS, age: { min: 9, max: 20 }, phone: '03-6278-8059', phoneLabel: '中央区 地域福祉課 福祉総合相談係' }),

    gakushu({ code: '13103', slug: 'minato', city: '港区', en: 'Minato City', pdf: NP + '2026-01-26-142411-051',
      whoJa: '港区に住む、生活保護や就学援助を受けている家庭などの中学生と、生活保護や児童扶養手当を受けている家庭などの高校生。',
      whatJa: '中学生は区内8か所の教室で、国語・数学・英語（テスト前は理科・社会も）を勉強できます。高校生向けの教室も2か所あります。',
      stages: JHS_HS, age: { min: 12, max: 18 }, phone: '03-5114-8826', phoneLabel: '港区生活・就労支援センター',
      note: '都の一覧では連絡先はメール（minato107@city.minato.tokyo.jp）です。電話番号は港区生活・就労支援センターのページのものです。',
      sources2: [{ org: '港区（生活・就労支援センター）', url: 'https://www.city.minato.tokyo.jp/jiritsusien/seikatukonnkyuusyajiritusien.html' }] }),

    gakushu({ code: '13104', slug: 'shinjuku', city: '新宿区', en: 'Shinjuku City', pdf: NP + '2026-01-26-142457-460',
      whoJa: '新宿区に住む、生活が苦しい家庭の小学4年生〜高校卒業までの子ども。',
      whatJa: '将来の夢にあわせて進学できるように勉強を手伝い、進学したあとも勉強が続くようサポートします。',
      stages: JHS_HS, age: { min: 9, max: 18 }, phone: '03-5273-3853', phoneLabel: '新宿区 生活支援相談窓口' }),

    gakushu({ code: '13105', slug: 'bunkyo', city: '文京区', en: 'Bunkyo City', pdf: NP + '2026-01-26-142529-698',
      whoJa: '文京区に住む、生活が苦しいなどで勉強やくらしの環境に困りごとがある小学生・中学生・高校生世代。',
      whatJa: '勉強と、毎日のくらしの両方をサポートします。',
      stages: JHS_HS, age: { min: 6, max: 18 }, phone: '03-5803-1917', phoneLabel: '文京区 自立相談支援窓口' }),

    gakushu({ code: '13106', slug: 'taito', city: '台東区', en: 'Taito City', pdf: NP + '2026-01-26-142605-615',
      whoJa: '台東区に住む、生活が苦しい家庭の子ども。',
      whatJa: '学習支援員が、勉強のしかたや進路の相談にのり、無料の学習教室などの情報も教えてくれます。',
      stages: JHS_HS, age: null, phone: '03-5246-1158', phoneLabel: '台東区 保護課 生活困窮者支援担当' }),

    gakushu({ code: '13107', slug: 'sumida', city: '墨田区', en: 'Sumida City', pdf: NP + '2026-01-26-142641-401',
      whoJa: '墨田区に住む、生活が苦しい家庭の中学1年生〜高校1年生（夏休みなどの学習会は小学4年生〜中学3年生）。',
      whatJa: '中学1年生から高校1年生まで、1年に50回の学習会があります。長い休みには、お昼ごはんつきの宿題サポートもあります。',
      stages: ['jhs12', 'jhs3', 'hs12'], age: { min: 12, max: 16 }, phone: '03-5608-6289', phoneLabel: 'くらし・しごと相談室すみだ' }),

    gakushu({ code: '13108', slug: 'koto', city: '江東区', en: 'Koto City', pdf: NP + '2026-01-26-142727-401',
      whoJa: '江東区に住む、生活が苦しい家庭の小学生〜高校生の年齢の子ども。',
      whatJa: '小学4〜6年生・中学生・高校生向けの学習教室「まなび塾」と、相談にのる「まなび支援員」がいます。',
      stages: JHS_HS, age: { min: 9, max: 18 }, phone: '03-3647-8487', phoneLabel: '江東区 保護第一課（保護第二課 03-3637-3741）' }),

    gakushu({ code: '13109', slug: 'shinagawa', city: '品川区', en: 'Shinagawa City', pdf: NP + '2026-01-26-142755-082',
      whoJa: '品川区に住む、生活が苦しい家庭の子ども。',
      whatJa: '勉強のサポートや、家に来て勉強の環境づくりのアドバイスをしてくれます。安心して過ごせる居場所もあります。',
      stages: JHS_HS, age: null, phone: '03-5742-9117', phoneLabel: '品川区 暮らし・しごと応援センター' }),

    gakushu({ code: '13110', slug: 'meguro', city: '目黒区', en: 'Meguro City', pdf: NP + '2026-01-26-142834-726',
      whoJa: '目黒区に住む、生活が苦しい家庭の中学生〜高校生。',
      whatJa: '中学生から高校生まで、平日週2回などの個別の学習サポートがあります。',
      stages: JHS_HS, age: { min: 12, max: 18 }, phone: '03-5722-9370', phoneLabel: '目黒区 くらしの相談窓口' }),

    gakushu({ code: '13111', slug: 'ota', city: '大田区', en: 'Ota City', pdf: NP + '2026-01-26-142926-975',
      whoJa: '大田区に住む、生活が苦しい家庭の中学生・高校生。高校に行っていない人、高校をやめた人も。',
      whatJa: '中学生は週1回の学習会（区内4か所とオンライン）と居場所があります。高校生の勉強・生活の相談、学び直しのサポートもあります。',
      stages: JHS_HS, age: { min: 12, max: 18 }, phone: '03-6715-7015', phoneLabel: '大田区 JOBOTA・蒲田生活福祉課 自立支援促進担当' }),

    gakushu({ code: '13112', slug: 'setagaya', city: '世田谷区', en: 'Setagaya City', pdf: NP + '2026-01-26-143026-248',
      whoJa: '世田谷区に住む、生活が苦しい家庭の子ども（くわしい対象は窓口で確認）。',
      whatJa: '区内5つの地域で、週1回の学習・生活サポートがあります。月1回はみんなでお弁当を食べる日もあります。',
      stages: JHS, age: null, phone: '03-5431-5355', phoneLabel: 'ぷらっとホーム世田谷' }),

    gakushu({ code: '13113', slug: 'shibuya', city: '渋谷区', en: 'Shibuya City', pdf: NP + '2026-01-26-143118-102',
      whoJa: '渋谷区に住む、生活保護を受けている家庭などの子ども。',
      whatJa: '家に来たり面談したりして、勉強や進学のことを手伝い、ほかの窓口ともつないでくれます。',
      stages: JHS_HS, age: null, phone: '03-3463-2116', phoneLabel: '渋谷区 生活支援相談窓口' }),

    gakushu({ code: '13114', slug: 'nakano', city: '中野区', en: 'Nakano City', pdf: NP + '2026-01-26-143152-381',
      whoJa: '中野区に住む、就学援助・児童扶養手当などを受けている家庭の小学4〜6年生と中学1〜3年生。',
      whatJa: '中学生は、行きたい高校への進学をめざして勉強できます。',
      stages: JHS, age: { min: 9, max: 15 }, phone: '03-3228-8950', phoneLabel: '中野くらしサポート' }),

    gakushu({ code: '13115', slug: 'suginami', city: '杉並区', en: 'Suginami City', pdf: NP + '2026-01-26-143231-995',
      whoJa: '杉並区に住む、生活が苦しい家庭の子ども。学校に行けていない・家から出にくい子どもも。',
      whatJa: '区内3会場で、ほぼ毎週、勉強と居場所のサポートがあります。保護者の相談にものります。',
      stages: JHS_HS, age: null, phone: '03-3391-1751', phoneLabel: '杉並区 くらしのサポートステーション' }),

    gakushu({ code: '13116', slug: 'toshima', city: '豊島区', en: 'Toshima City', pdf: NP + '2026-01-26-143307-731',
      whoJa: '豊島区に住む、子どもがいる家庭。',
      whatJa: '地域の学習支援教室のネットワーク「としま子ども学習支援ネットワーク（とこネット）」の教室を紹介してくれます。',
      stages: JHS_HS, age: null, phone: '03-4566-2454', phoneLabel: '豊島区 くらし・しごと相談支援センター' }),

    gakushu({ code: '13118', slug: 'arakawa', city: '荒川区', en: 'Arakawa City', pdf: NP + '2026-01-26-143418-481',
      whoJa: '荒川区に住む小学生・中学生。',
      whatJa: '小中学生が自由に勉強できる場所があり、勉強の相談や指導をしてくれます。',
      stages: JHS, age: { min: 6, max: 15 }, phone: '03-3802-4402', phoneLabel: '荒川区 福祉推進課 地域共生推進係' }),

    gakushu({ code: '13119', slug: 'itabashi', city: '板橋区', en: 'Itabashi City', pdf: NP + '2026-01-26-143516-194',
      url: 'https://www.city.itabashi.tokyo.jp/kenko/soudan/madoguchi/1002461.html', org: '板橋区（まなびのひろば けやきば）',
      whoJa: 'ひとり親家庭や生活が苦しい家庭の子ども。学習教室は小学6年生・中学生・進級や卒業にサポートが必要な高校生・高校をやめた人や高校に行っていないおおむね18歳までの人。',
      whatJa: '「まなびのひろば けやきば」（区内3か所）で、スタッフが一人ひとりにあわせて勉強を教えます。居場所や、家に来てくれる相談もあります。',
      how: '電話（3教室共通）で「けやきばの件」と伝えます。ひとり親の家庭は、チラシの二次元コードからも申しこめます。生活保護を受けている家庭は担当のケースワーカーへ。',
      stages: JHS_HS, age: { min: 11, max: 18 }, phone: '080-7245-1487', phoneLabel: 'まなびのひろば けやきば' }),

    gakushu({ code: '13120', slug: 'nerima', city: '練馬区', en: 'Nerima City', pdf: NP + '2026-01-26-143550-582',
      whoJa: '練馬区に住む、生活保護または就学援助（準要保護）を受けている家庭の中学3年生（勉強会）。生活保護を受けている家庭などの子ども（訪問・居場所・学習支援）。',
      whatJa: '中学3年生向けに、基礎の学力をつける勉強会があります。',
      how: '中3の勉強会は「学校教育支援センター 管理係」（03-6385-9911）へ。生活保護を受けている家庭の訪問・居場所・学習支援は「生活福祉課 自立促進支援係」（03-5984-4698）へ電話します。',
      stages: ['jhs3'], age: { min: 14, max: 15 }, phone: '03-6385-9911', phoneLabel: '練馬区 学校教育支援センター 管理係' }),

    gakushu({ code: '13121', slug: 'adachi', city: '足立区', en: 'Adachi City', pdf: NP + '2026-01-26-143624-506',
      whoJa: '足立区に住む、家で勉強するのがむずかしい中学生・高校生など。',
      whatJa: 'マンツーマンの学習サポートと、自習や食事ができる居場所があります。',
      stages: JHS_HS, age: { min: 12, max: 18 }, phone: '03-3880-5705', phoneLabel: '足立区 福祉まるごと相談課（生活支援推進課 03-3880-5706）' }),

    gakushu({ code: '13122', slug: 'katsushika', city: '葛飾区', en: 'Katsushika City', pdf: NP + '2026-01-26-143649-391',
      whoJa: '葛飾区立中学校に通う、基礎の学力に不安がある中学生。',
      whatJa: '区立中学校のすべての学校で、基礎の学力をのばして高校進学をめざす学習支援をしています。',
      how: 'まず学校の先生に聞くか、葛飾区の自立相談支援窓口に電話して「中学生の学習支援」について聞きます。',
      stages: JHS, age: { min: 12, max: 15 }, phone: '03-5654-8625', phoneLabel: '葛飾区 自立相談支援窓口' }),

    gakushu({ code: '13123', slug: 'edogawa', city: '江戸川区', en: 'Edogawa City', pdf: NP + '2026-01-26-143721-345',
      whoJa: '江戸川区に住む、生活が苦しい家庭の子ども。',
      whatJa: '学習支援、専門の支援員が家に来る相談、面談があります。高校に入ったあとも、卒業後の進路の相談にのります。',
      stages: JHS_HS, age: null, phone: '03-5662-0085', phoneLabel: '江戸川区 くらしごと相談室（中央）' })
  ];

  SM.data.programs.push.apply(SM.data.programs, J.concat(L, KC, G));
})();
;
/* ---- data/learn.js ---- */
/* 巣立ちマップ v3 — data/learn.js (LEARN-DATA)
 * まなぶ: short money lessons. Route #/learn and #/learn/ID (view: js/views/learn.js).
 *
 * SM.data.lessons = [{
 *   id, order, title:{ja,jr,en}, lead:{ja,jr,en}, level:'jr'|'hs'|'all', minutes, cat (SM.CATS key),
 *   steps:[ step, … ]   (4–7 per lesson)
 *   recap:[{ja,jr,en}, …]       2–3 one-line takeaways for the last screen
 *   related:[programIds]        all exist in data/programs-*.js (views should still skip unknown ids)
 *   cta:{ href, label:{ja,en} } optional in-app link (e.g. the money simulator)
 *   sources:[{ org, url }]      official pages read on `checked`
 *   checked:'2026-10-17'
 * }]
 *
 * Step types (every text object is {ja, en} plus an optional jr = simpler Japanese for 中学生;
 * SM.L() already returns jr while body.is-junior):
 *   { type:'text', head?, ja, jr?, en, mark?:{ja,jr?,en}, big?:{ja,en,label?} }
 *       head = short heading; mark = the one phrase to show with the 蛍光ペン marker (a substring of the
 *       text in the same language); big = one large number to show above the text.
 *   { type:'compare', head?, left:SIDE, right:SIDE, note? }
 *       SIDE = { title, tone:'free'|'loan'|'neutral', big?:{ja,en}, body?, points?:[…] }
 *   { type:'quiz', q, options:[{ ja, jr?, en, correct:bool, why }] }   exactly one correct option
 *   { type:'calc', kind:'interest'|'takehome'|'budget', head?, init:{…}, note? }
 *       interest: init { principal, rate (年%), monthly }   → SM.data.learnCalc.interest(init)
 *       takehome: init { gross (月の額面), social (社会保険に入っている), year (1 or 2) } → learnCalc.takehome(gross, opts)
 *       budget:   init { income (手取り), preset (SM.data.sim.presets key) } → learnCalc.budget(init)
 *
 * SM.data.learnFacts  current numbers used by the lessons (with sources) — one place to update.
 * SM.data.learnCalc   pure helper functions for the calc steps (no DOM).
 */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};

  var CHECKED = '2026-10-17';
  function t(ja, jr, en) { var o = { ja: ja, en: en }; if (jr) o.jr = jr; return o; }

  /* ------------------------------------------------------------------ sources (all fetched and read on CHECKED) */
  var S = {
    jassoAbout: { org: '日本学生支援機構（JASSO）', url: 'https://www.jasso.go.jp/shogakukin/about/index.html' },
    jassoKyufu: { org: '日本学生支援機構（JASSO）', url: 'https://www.jasso.go.jp/shogakukin/about/kyufu/kingaku.html' },
    jassoTaiyo: { org: '日本学生支援機構（JASSO）', url: 'https://www.jasso.go.jp/shogakukin/about/taiyo/index.html' },
    jassoRishi: { org: '日本学生支援機構（JASSO）', url: 'https://www.jasso.go.jp/shogakukin/about/taiyo/taiyo_2shu/riritsu_santei.html' },
    jflecUniv: { org: '金融経済教育推進機構（J-FLEC）', url: 'https://www.j-flec.go.jp/wpimages/uploads/university_model_2.pdf' },
    jflecKihon: { org: '金融経済教育推進機構（J-FLEC）', url: 'https://www.j-flec.go.jp/materials/series-okane-kihon/' },
    jflecJhs: { org: '金融経済教育推進機構（J-FLEC）', url: 'https://www.j-flec.go.jp/materials/hajimete-okane-jikan/' },
    fsaKashikin: { org: '金融庁', url: 'https://www.fsa.go.jp/policy/kashikin/kihon.html' },
    fsaKoza: { org: '金融庁', url: 'https://www.fsa.go.jp/news/r6/ginkou/20250204/20250204.html' },
    npaYami: { org: '警察庁', url: 'https://www.npa.go.jp/bureau/safetylife/yamibaito/hanzaishaboshu.html' },
    npaKoza: { org: '警察庁', url: 'https://www.npa.go.jp/bureau/safetylife/sos47/new-topics/250110/04.html' },
    caa18: { org: '消費者庁', url: 'https://www.caa.go.jp/policies/policy/consumer_education/consumer_education/lower_the_age_of_adulthood/introduction' },
    caaKeiyaku: { org: '消費者庁', url: 'https://www.caa.go.jp/policies/policy/consumer_education/public_awareness/teaching_material/material_010/assets/consumer_education_cms203_240723_02.pdf' },
    mojSeinen: { org: '法務省', url: 'https://www.moj.go.jp/MINJI/minji07_00238.html' },
    gov18: { org: '政府広報オンライン', url: 'https://www.gov-online.go.jp/article/201801/entry-8951.html' },
    ntaPart: { org: '国税庁', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1800.htm' },
    ntaKiso: { org: '国税庁', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1199.htm' },
    ntaKyuyo: { org: '国税庁', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm' },
    ntaRate: { org: '国税庁', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm' },
    ntaKanpu: { org: '国税庁', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2030.htm' },
    tokyoJumin: { org: '東京都主税局', url: 'https://www.tax.metro.tokyo.lg.jp/kazei/life/kojin_ju' },
    nenkinHatachi: { org: '日本年金機構', url: 'https://www.nenkin.go.jp/service/kokunen/kanyu/hatachi-tetsuduki.html' },
    nenkinHokenryo: { org: '日本年金機構', url: 'https://www.nenkin.go.jp/service/kokunen/hokenryo/hokenryo.html' },
    nenkinMenjo: { org: '日本年金機構', url: 'https://www.nenkin.go.jp/service/kokunen/menjo/20150428.html' },
    nenkinGakusei: { org: '日本年金機構', url: 'https://www.nenkin.go.jp/service/kokunen/menjo/20150514.html' },
    nenkinKounen: { org: '日本年金機構', url: 'https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20150515-01.html' },
    kenpo: { org: '全国健康保険協会（協会けんぽ）', url: 'https://www.kyoukaikenpo.or.jp/about/business/insurance_rate/rate_prefectures/r08/index.html' },
    koyo: { org: '厚生労働省 東京労働局（ハローワーク立川）', url: 'https://jsite.mhlw.go.jp/tokyo-hellowork/list/tachikawa/kyushokusha/koyouhokenryouritu08.html' },
    minWage: { org: '厚生労働省', url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/minimumichiran/' },
    nensho: { org: '厚生労働省 大阪労働局', url: 'https://jsite.mhlw.go.jp/osaka-roudoukyoku/yokuaru_goshitsumon/jigyounushi/nensyo.html' },
    mhlwKonkyu: { org: '厚生労働省', url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000059425.html' },
    mhlwFukushi: { org: '厚生労働省', url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/seikatsuhogo/seikatsu-fukushi-shikin1/kashitsukejoken.html' },
    mhlwHogo: { org: '厚生労働省', url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/seikatsuhogo/seikatuhogo/index.html' },
    mlitFee: { org: '国土交通省', url: 'https://www.mlit.go.jp/totikensangyo/const/1_6_bf_000013.html' },
    tokyoChintai: { org: '東京都住宅政策本部', url: 'https://www.juutakuseisaku.metro.tokyo.lg.jp/documents/d/juutakuseisaku/310-6-jyuutaku' },
    ur: { org: 'UR都市機構', url: 'https://www.ur-net.go.jp/chintai/rent/requirements/' },
    tcsw: { org: '東京都社会福祉協議会', url: 'https://www.tcsw.tvac.or.jp/shikin/jiritsu/index.html' },
    juken: { org: '東京都福祉局', url: 'https://www.fukushi.metro.tokyo.lg.jp/seikatsu/teisyotokusyataisaku/jukenseichallenge' },
    jukenProc: { org: '東京都社会福祉協議会（受験生チャレンジ支援貸付事業）', url: 'https://jukenchallenge.jp/procedure' },
    mextKoko: { org: '文部科学省', url: 'https://www.mext.go.jp/a_menu/shotou/mushouka/index.htm' },
    mextShien: { org: '文部科学省', url: 'https://www.mext.go.jp/content/20260616-mxt_shuukyo03-100002595_2.pdf' },
    mextKyufu: { org: '文部科学省', url: 'https://www.mext.go.jp/content/20260616-mxt_shuukyo03-100002595_18.pdf' },
    toritsuJugyo: { org: '東京都教育委員会', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/tuition' },
    toritsuKyufu: { org: '東京都教育委員会', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/scholarship_public_school' },
    toritsuOnline: { org: '東京都教育委員会（各種支援制度のオンライン申請）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/starting_application_online' },
    shigaku: { org: '東京都私学財団', url: 'https://www.shigaku-tokyo.or.jp/parents_index/pa_jugyoryo/' },
    shigakuLeaf: { org: '東京都私学財団', url: 'https://www.shigaku-tokyo.or.jp/wp-content/themes/shigaku/assets/files/brochure/r8_brochure.pdf' }
  };

  /* ------------------------------------------------------------------ facts (one place to update) */
  SM.data.learnFacts = {
    checked: CHECKED,
    adultAge: { age: 18, since: '2022-04-01', source: S.mojSeinen },
    minWageTokyo: { yen: 1280, from: '2026-10-01', prev: 1226, source: S.minWage },
    incomeTaxFreeWage: { yen: 1780000, year: 2026, prev: { year: 2025, yen: 1600000 }, source: S.ntaPart,
      note: '給料だけの人。給与所得控除74万円＋基礎控除104万円（令和8年分）' },
    residentTaxMinor: { yen: 2044000, note: 'その年の1月1日に未成年（18歳未満）で、前年の給与収入が204万4千円未満なら住民税なし（全国のきまり。18歳以上・23区・ひとりなら合計所得45万円＝給与約110万円をこえるとかかる）', source: S.tokyoJumin },
    pensionMonthly: { yen: 17920, fy: 2026, source: S.nenkinHokenryo },
    rates: {               // 2026年度（東京・協会けんぽ・40歳未満・一般の事業）
      health: 0.0985,      // 健康保険（東京支部）。本人はこの半分
      kosodate: 0.0023,    // 子ども・子育て支援金（2026年4月分から）。本人はこの半分
      pension: 0.183,      // 厚生年金。本人はこの半分
      koyoWorker: 0.005,   // 雇用保険の本人負担
      sources: [S.kenpo, S.nenkinKounen, S.koyo]
    },
    kyuyoKojoMin: { incomeTax: 740000, residentTax: 650000, source: S.ntaKyuyo },
    basicDeduction: { incomeTax: 1040000, residentTax: 430000, source: S.ntaKiso },
    residentKintou: { yen: 5000, note: '都民税1,000円＋区市町村民税3,000円＋森林環境税1,000円', source: S.tokyoJumin },
    loanCap: { note: '利息制限法の上限金利は、貸す額に応じて年15〜20%', source: S.fsaKashikin },
    jassoType2Cap: { rate: 3.0, source: S.jassoRishi },
    brokerFeeCap: { months: 1.1, note: '仲介手数料は家賃1か月分×1.1倍（税込）まで', source: S.mlitFee }
  };

  /* ------------------------------------------------------------------ calculators (pure; used by the calc steps) */
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function kyuyoKojo(annual, min) {
    if (annual <= 0) return 0;
    var k;
    if (annual <= 3600000) k = annual * 0.3 + 80000;
    else if (annual <= 6600000) k = annual * 0.2 + 440000;
    else if (annual <= 8500000) k = annual * 0.1 + 1100000;
    else k = 1950000;
    return Math.min(Math.max(k, min), annual);
  }
  function basicIncomeTax(shotoku) {          // 令和8年分（国税庁 No.1199）
    if (shotoku <= 4890000) return 1040000;
    if (shotoku <= 6550000) return 670000;
    if (shotoku <= 23500000) return 620000;
    return 480000;
  }
  function incomeTaxOf(taxable) {             // 速算表（国税庁 No.2260）＋復興特別所得税 2.1%
    taxable = Math.floor(Math.max(0, taxable) / 1000) * 1000;
    if (taxable <= 0) return 0;
    var x;
    if (taxable < 1950000) x = taxable * 0.05;
    else if (taxable < 3300000) x = taxable * 0.10 - 97500;
    else if (taxable < 6950000) x = taxable * 0.20 - 427500;
    else if (taxable < 9000000) x = taxable * 0.23 - 636000;
    else if (taxable < 18000000) x = taxable * 0.33 - 1536000;
    else x = taxable * 0.40 - 2796000;
    return Math.floor(x * 1.021 / 100) * 100;
  }

  SM.data.learnCalc = {
    /** Revolving / fixed monthly repayment. Returns { months, total, interest, firstInterest, never }.
     *  never = true when the monthly payment does not even cover the first month's interest. */
    interest: function (o) {
      o = o || {};
      var P = Math.max(0, num(o.principal, 0)), r = Math.max(0, num(o.rate, 0)) / 100 / 12, A = Math.max(0, num(o.monthly, 0));
      // interest per month is rounded down (円未満切り捨て), as in J-FLEC's example: 155回・772,996円
      var first = Math.floor(P * r);
      if (!P) return { months: 0, total: 0, interest: 0, firstInterest: 0, never: false };
      if (A <= first) return { months: Infinity, total: Infinity, interest: Infinity, firstInterest: first, never: true };
      var b = P, m = 0, total = 0;
      while (b > 0 && m < 1200) {
        var i = Math.floor(b * r), pay = Math.min(A, b + i);
        b = b + i - pay; total += pay; m++;
      }
      return { months: m, total: total, interest: total - P, firstInterest: first, never: false };
    },
    /** 単利: interest for `years` years at `rate` % (e.g. 10万円・15%・1年 → 15,000). */
    simple: function (principal, rate, years) {
      return Math.round(num(principal, 0) * num(rate, 0) / 100 * num(years, 1));
    },
    /** Rough monthly take-home pay (2026年度の料率・東京23区・ひとり・40歳未満).
     *  opts: { social:true (社会保険に入っている), year:1|2 (2 = 住民税も引かれる), minor:false (18歳未満) }
     *  Returns { gross, health (健康保険＋子ども・子育て支援金), pension, koyo, social, incomeTax, residentTax, net } in yen per month. */
    takehome: function (gross, opts) {
      opts = opts || {};
      var g = Math.max(0, Math.round(num(gross, 0)));
      var R = SM.data.learnFacts.rates, inSocial = opts.social !== false;
      var health = inSocial ? Math.round(g * (R.health + R.kosodate) / 2) : 0;
      var pension = inSocial ? Math.round(g * R.pension / 2) : 0;
      var koyo = inSocial ? Math.round(g * R.koyoWorker) : 0;
      var social = health + pension + koyo;
      var annual = g * 12, socialYear = social * 12;
      var shotoku = Math.max(0, annual - kyuyoKojo(annual, 740000));
      var itYear = incomeTaxOf(shotoku - socialYear - basicIncomeTax(shotoku));
      var rtYear = 0;
      if (Number(opts.year) === 2) {
        var sr = Math.max(0, annual - kyuyoKojo(annual, 650000));
        var minorFree = opts.minor && annual < 2044000;
        if (sr > 450000 && !minorFree) {
          var tr = Math.floor(Math.max(0, sr - socialYear - 430000) / 1000) * 1000;
          rtYear = Math.max(0, Math.floor(tr * 0.1) - (tr > 0 ? 2500 : 0)) + 5000;
        }
      }
      var incomeTax = Math.round(itYear / 12), residentTax = Math.round(rtYear / 12);
      return { gross: g, health: health, pension: pension, koyo: koyo, social: social, incomeTax: incomeTax, residentTax: residentTax, net: g - social - incomeTax - residentTax };
    },
    /** Monthly budget from the money-simulator presets (data/tools.js). Returns { income, items:[{k,label,value}], total, left }. */
    budget: function (o) {
      o = o || {};
      var sim = SM.data.sim || {}, presets = sim.presets || {};
      var p = presets[o.preset] || presets[sim.defaultPreset] || {};
      var items = (sim.expenses || []).map(function (e) { return { k: e.k, label: e.short || e.label, value: num(p[e.k], 0) }; });
      var total = items.reduce(function (s, x) { return s + x.value; }, 0);
      var income = num(o.income, (sim.defaults || {}).income || 0);
      return { income: income, items: items, total: total, left: income - total };
    }
  };

  /* ------------------------------------------------------------------ lessons */
  SM.data.lessons = [

    /* 01 ---------------------------------------------------------------- */
    {
      id: 'kyufu-kashitsuke', order: 1, level: 'all', minutes: 2, cat: 'money',
      title: t('給付と貸付のちがい', '返すお金・返さなくていいお金', 'Grants vs. loans'),
      lead: t('「もらうお金」と「借りるお金」。名前は似ていても、あとで大きくちがいます。',
        '「もらうお金」と「かりるお金」。あとで、ぜんぜんちがいます。',
        'Money you receive and money you borrow can look alike. Later, they are very different.'),
      steps: [
        { type: 'text', head: t('支援のお金は3種類', '支援のお金は3つ', 'Three kinds of support money'),
          ja: '返さなくていい「給付」。あとで返す「貸付」。そして、約束を守れば返さなくてよくなる「貸付」の3つです。',
          jr: '「もらう（返さない）」「かりる（あとで返す）」「かりるけど、約束を守ると返さなくていい」の3つです。',
          en: 'Grants you never pay back, loans you do pay back, and loans that are forgiven if you keep the conditions.',
          mark: t('返さなくていい「給付」', '「もらう（返さない）」', 'Grants you never pay back') },
        { type: 'compare', head: t('同じ10万円でも', '同じ10万円でも', 'The same ¥100,000'),
          left: { title: t('給付', 'もらう', 'Grant'), tone: 'free', big: t('返す 0円', null, 'Pay back ¥0'),
            body: t('もらったら、それで終わり。', 'もらったら、おわり。', 'Once you get it, it is yours.'),
            points: [t('収入や学ぶ意欲などの条件がある', '条件はある', 'There are conditions (income, motivation…)'), t('使い道が決まっていることも', '使い方が決まっていることも', 'It may have to be used for a set purpose')] },
          right: { title: t('貸付', 'かりる', 'Loan'), tone: 'loan', big: t('返す 10万円〜', null, 'Pay back ¥100,000+'),
            body: t('あとで少しずつ返す。利息がつくものもある。', 'あとで少しずつ返す。ふえることもある。', 'You repay it bit by bit. Some loans add interest.'),
            points: [t('毎月いくら・何回で返すか確かめる', '毎月いくら返すか見る', 'Check how much per month, how many times'), t('利息なし（無利子）なら借りた額だけ返す', '「無利子」なら、かりた分だけ返す', 'Interest-free means you repay only what you borrowed')] } },
        { type: 'quiz', q: t('JASSOの「給付奨学金」は、どっち？', '「給付奨学金」は、どっち？', 'JASSO’s “kyūfu” (grant) scholarship is…'),
          options: [
            { ja: '卒業したら返すお金', jr: '卒業したら返すお金', en: 'Money you repay after graduating', correct: false,
              why: t('卒業後に返すのは「貸与（たいよ）奨学金」のほう。「給付」とついていたら、返さなくていいお金です。', '返すのは「貸与（たいよ）」のほう。「給付」は返さなくていいお金です。', 'That is the “taiyo” (loan) scholarship. “Kyūfu” means you do not repay it.') },
            { ja: '返さなくていいお金', jr: '返さなくていいお金', en: 'Money you never repay', correct: true,
              why: t('そのとおり。給付奨学金は返す必要がありません。家計や学ぶ意欲などの基準があります。', 'そのとおり。返さなくていいお金です。', 'Right. The grant scholarship is never repaid. There are income and motivation criteria.') },
            { ja: '20歳になったら返すお金', jr: '20歳になったら返すお金', en: 'Money you repay when you turn 20', correct: false,
              why: t('年齢で返すことになる奨学金はありません。給付は返さなくていいお金です。', '年れいで返すものではありません。給付は返さなくていいお金です。', 'No scholarship becomes payable at an age. A grant is never repaid.') }
          ] },
        { type: 'text', head: t('約束を守ると、返さなくてよくなる', '約束を守ると、返さなくていい', 'Loans that can be forgiven'),
          ja: '東京都の「受験生チャレンジ支援貸付」は、高校や大学などに入学すれば返さなくてよくなります。施設などを出た人の「自立支援資金貸付」も、決まった期間働き続けると返済が免除されます。',
          jr: '東京都の「受験生チャレンジ支援貸付」は、高校などに入学できたら、返さなくてよくなります。',
          en: 'Tokyo’s exam-support loan is forgiven once you enter high school or college. The Independence Support Loan for care leavers is forgiven after working for a set period.',
          mark: t('返さなくてよくなります', '返さなくてよくなります', 'is forgiven') },
        { type: 'quiz', q: t('返さなくてよくなる貸付を使うとき、いちばん大事なのは？', '「返さなくてよくなる」貸付で、大事なのは？', 'With a forgivable loan, what matters most?'),
          options: [
            { ja: '何もしなくても、あとで自動で免除される', jr: '何もしなくても、自動でなくなる', en: 'It is forgiven automatically', correct: false,
              why: t('多くの場合、免除の申請が必要です。期限をすぎると返すことになるので、カレンダーに入れておきましょう。', '「免除してください」という手続きが必要なことが多いです。', 'Usually you must apply for forgiveness. Miss the deadline and you repay it.') },
            { ja: '借りた額の半分だけ返せばいい', jr: 'かりた分の半分だけ返す', en: 'You only repay half', correct: false,
              why: t('免除になるかどうかは、決められた条件しだいです。「半分だけ」というルールではないので、窓口で条件を確かめましょう。', '「半分だけ」というルールではありません。条件を窓口で聞こう。', 'It depends on the conditions, not a “half” rule. Check them at the desk.') },
            { ja: '免除の条件と、手続きの期限を確かめておく', jr: '条件と、手続きの期限を確かめる', en: 'Check the conditions and the deadline to apply', correct: true,
              why: t('そのとおり。たとえば受験生チャレンジは、入学した年の5月末までに免除の書類を窓口に出します。', 'そのとおり。受験生チャレンジは、入学した年の5月末までに書類を出します。', 'Right. For the exam-support loan, you hand in the forgiveness form by the end of May of your first year.') }
          ] },
        { type: 'text', head: t('使う順番のコツ', '使う順番', 'The order to use them'),
          ja: 'まず返さなくていい「給付」。足りなければ、利息のない貸付や免除つきの貸付。利息のある借金は、いちばん最後に。',
          jr: 'まず「もらえるお金」。たりないときは「ふえない（無利子の）かりるお金」。ふえる借金は、いちばん最後。',
          en: 'Grants first. Then interest-free or forgivable loans. Loans with interest come last.',
          mark: t('まず返さなくていい「給付」', 'まず「もらえるお金」', 'Grants first') }
      ],
      recap: [
        t('給付＝返さない。貸付＝返す。', '給付は返さない。貸付は返す。', 'Grant = keep it. Loan = pay it back.'),
        t('免除つきの貸付は、条件と申請の期限をメモ。', '免除つきは、手続きの期限をメモ。', 'Forgivable loans: note the conditions and deadline.'),
        t('使う順番は「給付 → 無利子 → 利息あり」。', '順番は「もらう → ふえない → ふえる」。', 'Order: grant → interest-free → with interest.')
      ],
      related: ['jasso-kyufu', 'koko-kyufukin', 'tokyo-juken-challenge', 'jiritsu-shikin', 'tokyo-jiritsu-shikin', 'tokyo-jiritsu-start'],
      sources: [S.jassoAbout, S.juken, S.jukenProc, S.tcsw, S.jflecUniv],
      checked: CHECKED
    },

    /* 02 ---------------------------------------------------------------- */
    {
      id: 'rishi', order: 2, level: 'all', minutes: 3, cat: 'money',
      title: t('利息ってなに？', '借りると、お金がふえる？', 'What is interest?'),
      lead: t('借りたお金は、借りた分より多く返します。その差が「利息」です。',
        'かりたお金は、かりた分より多く返します。ふえた分が「利息」。',
        'You pay back more than you borrowed. The difference is interest.'),
      steps: [
        { type: 'text', head: t('お金のレンタル料', 'お金のレンタル料', 'A rental fee for money'),
          ja: '利息は、お金を借りるときの「レンタル料」。年15%で10万円を1年借りると、利息はおよそ1万5千円。返すのは約11万5千円です。',
          jr: '利息は、お金をかりたときのレンタル料。10万円をかりて、1年後に約11万5千円返す、ということがあります。',
          en: 'Interest is a rental fee for money. Borrow ¥100,000 for a year at 15% and the interest is about ¥15,000: you repay about ¥115,000.',
          big: { ja: '＋1万5千円', en: '+¥15,000', label: t('10万円・年15%・1年', null, '¥100,000 · 15% · 1 year') } },
        { type: 'compare', head: t('同じ10万円を1年借りる', '10万円を1年かりる', 'Borrow ¥100,000 for a year'),
          left: { title: t('利息なし（無利子）', 'ふえない（無利子）', 'Interest-free'), tone: 'free', big: t('返す 10万円', null, 'Repay ¥100,000'),
            body: t('第一種奨学金や、公的な貸付の多くは利息なし。', '国や都のかしつけには、ふえないものが多い。', 'JASSO Type 1 and many public loans charge no interest.') },
          right: { title: t('年15%', '年15%', '15% a year'), tone: 'loan', big: t('返す 約11.5万円', null, 'Repay ~¥115,000'),
            body: t('キャッシングは年15〜18%くらいのことも。', 'カードでお金をかりると、これくらいふえることも。', 'Card cash advances are often around 15–18% a year.') } },
        { type: 'quiz', q: t('30万円を年18%のリボ払い、毎月5千円で返すと、返し終わるまでどれくらい？', '30万円を毎月5千円ずつ返すと、何年かかる？', '¥300,000 at 18%, paying ¥5,000 a month. How long until it is paid off?'),
          options: [
            { ja: '約5年', jr: '約5年', en: 'About 5 years', correct: false,
              why: t('5年たっても、まだ約25万円残っています。最初は5千円のうち4,500円が利息だからです。', '5年たっても、まだ約25万円のこっています。', 'After 5 years about ¥250,000 is still left: at first, ¥4,500 of each ¥5,000 is interest.') },
            { ja: '約13年', jr: '約13年', en: 'About 13 years', correct: true,
              why: t('J-FLECの計算で約13年（155回）。返すお金は合計約77万円で、借りた額の2.5倍以上です。', '約13年。返すお金は合計約77万円。かりた分の2.5倍以上です。', 'About 13 years (155 payments) and about ¥770,000 in total: more than 2.5 times what you borrowed.') },
            { ja: '約1年', jr: '約1年', en: 'About 1 year', correct: false,
              why: t('5千円×12か月でも6万円。利息もあるので、1年ではまったく終わりません。', '5千円×12か月で6万円。1年では終わりません。', '¥5,000 × 12 is only ¥60,000, plus interest. Nowhere near.') }
          ] },
        { type: 'calc', kind: 'interest', head: t('計算でたしかめよう', '計算でたしかめよう', 'Check it with the calculator'),
          init: { principal: 300000, rate: 18, monthly: 5000 },
          note: t('J-FLECの例では、30万円を年18%・毎月5千円で返すと、約13年（155回）・合計77万2,996円です。',
            '30万円を毎月5千円ずつ返すと、13年くらいかかります。',
            'J-FLEC’s example: ¥300,000 at 18%, ¥5,000 a month, takes about 13 years (155 payments), ¥772,996 in total.') },
        { type: 'text', head: t('毎月の額が少ないほど、長くなる', '毎月が少ないほど、長くなる', 'Smaller payments, longer debt'),
          ja: 'リボ払いは毎月の支払いが少なくて楽に見えますが、残りが減らず、利息が長く続きます。「フレックス払い」「定額払い」など、名前がちがうこともあります。',
          jr: 'リボ払いは、毎月は少しでラクに見えます。でも、なかなかへらず、利息がずっとつづきます。',
          en: 'Revolving plans feel easy because each payment is small, but the balance barely falls and interest keeps running. They may be called “flex” or “fixed-amount” payments.',
          mark: t('残りが減らず', 'なかなかへらず', 'the balance barely falls') },
        { type: 'quiz', q: t('SNSで「審査なし・すぐ貸します」。どうする？', 'SNSで「すぐお金かします」。どうする？', 'On social media: “No checks, cash today.” What do you do?'),
          options: [
            { ja: '身分証の写真を送って、聞いてみる', jr: '身分証の写真を送ってみる', en: 'Send a photo of my ID and ask', correct: false,
              why: t('身分証を送ると、悪用されたり脅されたりする危険があります。送らないでください。', '身分証を送ると、悪いことに使われたり、おどされたりします。', 'Your ID can be misused or used to threaten you. Never send it.') },
            { ja: '連絡しない。困ったら社会福祉協議会や188に相談する', jr: '連絡しない。こまったら公的な窓口に相談', en: 'Don’t reply. Ask the social welfare council or call 188', correct: true,
              why: t('SNSの「個人間融資」はヤミ金融のことが多く、法外な利息や脅しのトラブルがあります。公的な窓口には利子なしの貸付もあります。', 'SNSの「お金かします」は、ヤミ金のことが多いです。公的な窓口には、ふえないかしつけもあります。', '“Private loans” on social media are often illegal lenders with huge interest and threats. Public desks offer interest-free loans.') },
            { ja: '少しだけなら借りてみる', jr: '少しだけならかりる', en: 'Borrow just a little', correct: false,
              why: t('少しでも、法外な利息や個人情報をさらされるトラブルがあります。まずは公的な窓口へ。', '少しでも、大きなトラブルになります。', 'Even small amounts lead to illegal interest or your details being exposed online.') }
          ] },
        { type: 'text', head: t('借りる前に3つ確認', 'かりる前に3つ見る', 'Check three things first'),
          ja: '①年何%か ②毎月いくら・何回か ③返すお金の合計。法律の上限は年15〜20%で、それより高い利息はルール違反です。',
          jr: '①年何%ふえる？ ②毎月いくら・何回？ ③全部でいくら返す？ この3つを見てから決めよう。',
          en: '1) the yearly rate, 2) how much per month and how many times, 3) the total you repay. The legal cap is 15–20% a year; anything higher breaks the rules.',
          mark: t('返すお金の合計', '全部でいくら返す？', 'the total you repay') }
      ],
      recap: [
        t('利息＝お金のレンタル料。', '利息は、お金のレンタル料。', 'Interest = a rental fee for money.'),
        t('リボ払いは、長く・高くなりやすい。', 'リボ払いは、長く・高くなる。', 'Revolving plans get long and expensive.'),
        t('借りる前に「年何%・毎月いくら・合計いくら」。', 'かりる前に「何%・毎月・全部で」を見る。', 'Before borrowing: rate, monthly, total.')
      ],
      related: ['seikatsu-fukushi', 'shohisha-188', 'tokyo-shohi-center', 'houterasu', 'jiritsu-sodan'],
      sources: [S.jflecUniv, S.fsaKashikin],
      checked: CHECKED
    },

    /* 03 ---------------------------------------------------------------- */
    {
      id: 'keiyaku', order: 3, level: 'all', minutes: 2, cat: 'procedures',
      title: t('契約ってなに？　名義貸しの危険', '「契約」と、名前をかすこわさ', 'Contracts, and why you never lend your name'),
      lead: t('18歳からは、ひとりで契約できます。だからこそ知っておきたいこと。',
        '18歳からは、ひとりで契約できます。その前に知っておこう。',
        'From 18 you can sign contracts alone. Here is what to know first.'),
      steps: [
        { type: 'text', head: t('契約は「約束」', '契約は「約束」', 'A contract is a promise'),
          ja: '契約は、法律で守られる約束です。お店で「これください」と言って、店の人が受け付けた時点で成立。紙がなくても契約です。一度成立した契約は、簡単にはやめられません。',
          jr: '契約は、守らないといけない約束。「これください」「はい」で、もう契約。紙がなくても契約です。',
          en: 'A contract is a promise protected by law. It is made the moment the shop accepts your order, even without paper, and it is hard to undo.',
          mark: t('紙がなくても契約です', '紙がなくても契約です', 'even without paper') },
        { type: 'text', head: t('18歳から変わること', '18歳から変わること', 'What changes at 18'),
          ja: '2022年4月から、大人は18歳から。親の同意なしで、スマホや部屋、クレジットカードの契約ができます。そのかわり、未成年のときのような「取り消し」はできません。',
          jr: '18歳からは大人。ひとりで契約できるけど、「親のOKがないから」という「取り消し」は、できなくなります。',
          en: 'Since April 2022 adulthood starts at 18. You can sign for a phone, a flat or a credit card without a parent, but you lose the minor’s right to cancel.',
          mark: t('「取り消し」はできません', '「取り消し」は、できなくなります', 'you lose the minor’s right to cancel') },
        { type: 'quiz', q: t('18歳。ネットで高いエステを申し込んだけど、やめたい。', '18歳。ネットで申しこんだけど、やめたい。', 'You are 18 and signed up online for an expensive beauty course. You want out.'),
          options: [
            { ja: '18歳と19歳は、いつでも取り消せる', jr: '18歳と19歳は、いつでも取り消せる', en: '18- and 19-year-olds can always cancel', correct: false,
              why: t('2022年4月から、18歳・19歳は未成年者取消権が使えなくなりました。', '2022年4月から、18歳・19歳は取り消せなくなりました。', 'Since April 2022, 18- and 19-year-olds no longer have the minor’s cancellation right.') },
            { ja: 'サインしていないから、契約じゃない', jr: 'サインしてないから、契約じゃない', en: 'I didn’t sign, so there is no contract', correct: false,
              why: t('ネットのボタンや口約束でも、契約は成立します。', 'ネットのボタンでも、契約になります。', 'A button click or a spoken yes is still a contract.') },
            { ja: '親の同意を理由には取り消せない。まず188に相談する', jr: '親を理由には取り消せない。188に相談', en: 'I can’t cancel for lack of parental consent. Call 188 first', correct: true,
              why: t('そのとおり。でも、契約のしかたによっては解約できることもあります。188（消費者ホットライン）で近くの消費生活センターにつながります。', 'そのとおり。188に電話すると、相談できる窓口につながります。', 'Right. Depending on how it was sold you may still be able to cancel. 188 connects you to a consumer centre.') }
          ] },
        { type: 'compare', head: t('「名前を貸して」と頼まれたら', '「名前をかして」と言われたら', 'If someone asks to use your name'),
          left: { title: t('自分の名前で、自分が使う', '自分の名前で、自分が使う', 'Your name, used by you'), tone: 'free',
            points: [t('自分のスマホ・自分の口座', '自分のスマホ・自分の口座', 'Your own phone and account'), t('暗証番号は自分だけが知っている', '暗証番号は自分だけ', 'Only you know the PIN')] },
          right: { title: t('自分の名前で、ほかの人が使う', '自分の名前で、人が使う', 'Your name, used by someone else'), tone: 'loan',
            points: [t('口座を売る・貸す、人に渡すためにスマホを契約するのは犯罪', '口座やスマホを人にわたすのは犯罪', 'Selling or lending an account, or getting a phone for someone else, is a crime'), t('契約したのはあなた。請求もあなたに来る', 'お金のせいきゅうは、あなたに来る', 'You signed, so the bills come to you')] } },
        { type: 'quiz', q: t('SNSで「口座を貸すだけで3万円」。', 'SNSで「口座をかすだけで3万円」。', 'On social media: “Lend us your bank account, get ¥30,000.”'),
          options: [
            { ja: '1回だけなら大丈夫', jr: '1回だけならOK', en: 'Once is fine', correct: false,
              why: t('1回でも犯罪です。闇バイトでは「1回だけ」と言って、あとから脅されるケースもあります。', '1回でも犯罪です。あとでおどされることもあります。', 'Once is still a crime. These schemes often say “just once” and then threaten you.') },
            { ja: 'お金に困っているなら、しかたない', jr: 'お金がないなら、しかたない', en: 'If I really need money, it’s OK', correct: false,
              why: t('理由があっても犯罪です。お金に困ったら、公的な相談窓口に。', 'どんな理由でも犯罪です。こまったら公的な窓口へ。', 'It is a crime whatever the reason. If you need money, go to a public desk.') },
            { ja: 'ことわる。犯罪になる', jr: 'ことわる。犯罪です', en: 'Say no. It’s a crime', correct: true,
              why: t('口座の売買や貸し借りは違法です（金融庁・警察庁）。口座が止められることもあります。', '口座の売り買い・かし借りは犯罪です。', 'Buying, selling or lending accounts is illegal (FSA, National Police Agency). The account can be frozen.') }
          ] },
        { type: 'text', head: t('こまったら、すぐ相談', 'こまったら、すぐ相談', 'Ask for help right away'),
          ja: '契約のトラブルは188（消費者ホットライン）。脅されたり、闇バイトに応募してしまったときは、警察（#9110、急ぐときは110）に。警察は相談した人と家族を守ります。',
          jr: '契約のトラブルは188。おどされたときは警察（#9110、いそぐときは110）。警察は、あなたと家族を守ります。',
          en: 'Contract trouble: call 188. If you are threatened or got pulled into a criminal “job”, call the police (#9110, or 110 if urgent). They protect you and your family.',
          mark: t('警察は相談した人と家族を守ります', '警察は、あなたと家族を守ります', 'They protect you and your family') }
      ],
      recap: [
        t('紙がなくても契約。', '紙がなくても契約。', 'No paper needed for a contract.'),
        t('18歳からは「取り消し」できない。', '18歳からは取り消しできない。', 'At 18 the minor’s cancellation right ends.'),
        t('口座・スマホ・名前は、人に貸さない。', '口座・スマホ・名前は、人にかさない。', 'Never lend your account, phone or name.')
      ],
      related: ['shohisha-188', 'tokyo-shohi-center', 'police-9110', 'houterasu'],
      sources: [S.caaKeiyaku, S.caa18, S.mojSeinen, S.gov18, S.npaYami, S.fsaKoza],
      checked: CHECKED
    },

    /* 04 ---------------------------------------------------------------- */
    {
      id: 'koza-card', order: 4, level: 'all', minutes: 2, cat: 'money',
      title: t('口座とカードのきほん', '口座とカードって？', 'Bank accounts and cards'),
      lead: t('給料や奨学金は口座に入ります。カードは「いつ払うか」で3種類。',
        '給料は口座に入ります。カードは「いつはらうか」で3つ。',
        'Pay and scholarships go into your account. Cards differ by when you pay.'),
      steps: [
        { type: 'text', head: t('口座は、お金の住所', '口座は、お金の住所', 'Your account is your money’s address'),
          ja: '給料・奨学金・支援のお金は、ほとんど自分名義の口座に振り込まれます。通帳・キャッシュカード・暗証番号は、自分だけで管理します。',
          jr: '給料や奨学金は、自分の口座に入ります。カードと暗証番号は、自分だけのもの。',
          en: 'Wages, scholarships and support payments go into an account in your name. Keep the passbook, card and PIN to yourself.',
          mark: t('自分だけで管理します', '自分だけのもの', 'Keep the passbook, card and PIN to yourself') },
        { type: 'compare', head: t('払うタイミングで、3種類', 'はらうタイミングは3つ', 'Three ways to pay'),
          left: { title: t('前払い・同時払い', '先に・その場ではらう', 'Pay before or at once'), tone: 'free',
            body: t('プリペイド・電子マネーは前払い。デビットカードは、使ったときに口座から引き落とし。', 'チャージした分や、口座にある分だけ使える。', 'Prepaid cards and e-money are paid in advance; a debit card takes money from your account straight away.'),
            points: [t('使えるのは、入っているお金まで', '入っている分まで', 'You can only spend what is there')] },
          right: { title: t('後払い', 'あとではらう', 'Pay later'), tone: 'loan',
            body: t('クレジットカードは、カード会社が立て替えて、あとで口座から払う。', 'クレジットカードは、あとで口座からはらう。', 'With a credit card the card company pays first; you pay later from your account.'),
            points: [t('使った気がしにくく、使いすぎやすい', '使いすぎに注意', 'Easy to overspend: it doesn’t feel like money leaving')] } },
        { type: 'quiz', q: t('クレジットカードで1万円の服を買いました。お金はいつ出ていく？', 'クレジットカードで1万円の服を買った。お金はいつへる？', 'You buy ¥10,000 of clothes by credit card. When does the money leave?'),
          options: [
            { ja: 'その場で財布から出ていく', jr: 'その場でさいふからへる', en: 'Right away, from my wallet', correct: false,
              why: t('それは現金。カードはあとから払うので、使った気がしにくいのが注意点です。', 'それは現金のとき。カードはあとからです。', 'That’s cash. Cards are paid later, which is why they feel painless.') },
            { ja: 'あとで（たとえば翌月に）口座から引き落とされる', jr: 'あとで（次の月など）口座からへる', en: 'Later (e.g. next month) from my account', correct: true,
              why: t('そのとおり。クレジットは「後払い」。カード会社が立て替えて、あとで口座から払います。', 'そのとおり。カードは「あとばらい」です。', 'Right. Credit is “pay later”: the card company pays and collects from your account.') },
            { ja: '払わなくていい', jr: 'はらわなくていい', en: 'Never', correct: false,
              why: t('クレジットは、お金を借りているのと同じ。あとで必ず払います。', 'カードは、かりているのと同じ。あとで必ずはらいます。', 'Credit is borrowing. You always pay it back.') }
          ] },
        { type: 'text', head: t('クレジットは「一括払い」が基本', 'カードは「1回ばらい」で', 'Pay in full'),
          ja: '分割払い（3回以上）やリボ払いには手数料がかかり、払う合計がふえます。一括払いにして、毎月の明細を見るくせをつけよう。',
          jr: '分けてはらう（分割・リボ）と、手数料でふえます。1回ではらって、毎月の明細を見よう。',
          en: 'Instalments (3+ payments) and revolving plans add fees. Pay in full and check your statement every month.',
          mark: t('毎月の明細を見る', '毎月の明細を見よう', 'check your statement every month') },
        { type: 'quiz', q: t('友だちに「暗証番号を教えて、カード貸して」と言われた。', '友だちに「カードと暗証番号かして」と言われた。', 'A friend asks to borrow your card and PIN.'),
          options: [
            { ja: '仲のいい友だちならOK', jr: '仲よしならOK', en: 'Fine if it’s a close friend', correct: false,
              why: t('仲がよくても、カードの利用は原則本人だけ。トラブルになると、友だち関係もこわれます。', '仲がよくても、カードは本人だけ。', 'Even for a close friend: cards are for the holder only.') },
            { ja: 'すぐ返してもらえばOK', jr: 'すぐ返してもらえばOK', en: 'Fine if they return it soon', correct: false,
              why: t('短い時間でも、勝手に使われたお金を取り戻すのはとても大変です。', '少しの時間でも、使われたお金はもどってきにくいです。', 'Even briefly: money spent without you is very hard to get back.') },
            { ja: 'ことわる。カードと暗証番号は本人だけ', jr: 'ことわる。本人だけのもの', en: 'Say no. Card and PIN are mine only', correct: true,
              why: t('そのとおり。カードを使えるのは原則本人だけです。', 'そのとおり。カードは本人だけが使えます。', 'Right. In principle only the cardholder may use the card.') }
          ] },
        { type: 'text', head: t('口座は売らない・貸さない', '口座は売らない・かさない', 'Never sell or lend an account'),
          ja: '使わない口座でも、売る・あげる・貸すのは犯罪です（お金をもらっても、もらわなくても）。いらない口座は、銀行で解約しましょう。',
          jr: '使わない口座でも、売る・あげる・かすのは犯罪。いらない口座は、銀行でやめる手続きを。',
          en: 'Selling, giving away or lending an account is a crime, paid or not. Close accounts you don’t use at the bank.',
          mark: t('売る・あげる・貸すのは犯罪です', '売る・あげる・かすのは犯罪', 'is a crime') }
      ],
      recap: [
        t('口座・カード・暗証番号は自分だけ。', 'カードと暗証番号は自分だけ。', 'Account, card and PIN: yours only.'),
        t('クレジットは後払い＝借りているのと同じ。', 'クレジットは、かりているのと同じ。', 'Credit = pay later = borrowing.'),
        t('分割・リボは手数料。一括払いが基本。', '1回ではらうのが基本。', 'Instalments cost fees. Pay in full.')
      ],
      related: ['mynumber-card', 'shohisha-188', 'police-9110'],
      sources: [S.jflecJhs, S.jflecUniv, S.fsaKoza, S.npaKoza, S.npaYami],
      checked: CHECKED
    },

    /* 05 ---------------------------------------------------------------- */
    {
      id: 'tedori', order: 5, level: 'hs', minutes: 3, cat: 'work',
      title: t('手取りと額面', '給料から、引かれるお金', 'Gross pay vs. take-home pay'),
      lead: t('求人の「月給20万円」は、そのまま全部は入りません。',
        '「月給20万円」でも、20万円ぜんぶは入りません。',
        'A job ad’s “¥200,000 a month” is not what lands in your account.'),
      steps: [
        { type: 'text', head: t('額面と手取り', '額面と手取り', 'Gross and take-home'),
          ja: '額面（がくめん）は、引かれる前の給料。手取りは、税金や保険料が引かれたあと、口座に入る金額。生活費は手取りで考えます。',
          jr: '「額面」は、引かれる前の給料。「手取り」は、口座に入るお金。使えるのは手取りです。',
          en: 'Gross pay is before deductions. Take-home is what reaches your account after tax and insurance. Plan with take-home pay.',
          mark: t('生活費は手取りで考えます', '使えるのは手取りです', 'Plan with take-home pay') },
        { type: 'compare', head: t('月給20万円（働いて1年目）のだいたい', '月給20万円（1年目）', 'A ¥200,000 monthly salary, first year'),
          left: { title: t('額面', '額面', 'Gross'), tone: 'neutral', big: t('200,000円', null, '¥200,000'),
            body: t('求人票や契約書に書いてある金額', '求人に書いてある金額', 'The figure in the job ad or contract') },
          right: { title: t('手取り', '手取り', 'Take-home'), tone: 'free', big: t('約170,000円', null, 'about ¥170,000'),
            body: t('健康保険・厚生年金・雇用保険・所得税が引かれたあと', '保険と税金が引かれたあと', 'After health insurance, pension, employment insurance and income tax') },
          note: t('東京の会社員・2026年度の料率で、ざっくり計算。2年目からは住民税（月7千円くらい）も引かれます。',
            '2年目からは、住民税（月7千円くらい）も引かれます。',
            'Rough figures for a Tokyo employee at 2026 rates. From year two, resident tax (about ¥7,000 a month) is also taken.') },
        { type: 'text', head: t('引かれるもの', '引かれるもの', 'What gets taken'),
          ja: '健康保険（病気やけがのとき）、厚生年金（年をとったときや障害のとき）、雇用保険（仕事をなくしたとき）、所得税、住民税。健康保険と厚生年金の保険料は、会社も半分出しています。',
          jr: '保険（病気のとき・年をとったとき・仕事をなくしたとき）と、税金が引かれます。保険料は、会社も半分出しています。',
          en: 'Health insurance, employees’ pension, employment insurance, income tax and resident tax. Your employer pays the other half of the health and pension premiums.',
          mark: t('会社も半分出しています', '会社も半分出しています', 'Your employer pays the other half') },
        { type: 'calc', kind: 'takehome', head: t('給料で計算してみよう', '計算してみよう', 'Try your own salary'),
          init: { gross: 200000, social: true, year: 1 },
          note: t('目安です（東京・40歳未満・2026年度）。本当の金額は、給与明細で確かめましょう。', '目安です。本当の金額は給与明細で見よう。', 'An estimate (Tokyo, under 40, 2026). Your payslip has the real numbers.') },
        { type: 'quiz', q: t('働いて2年目。給料は同じなのに、手取りが減った。なぜ？', '2年目、給料は同じなのに手取りがへった。なぜ？', 'Year two: same salary, smaller take-home. Why?'),
          options: [
            { ja: '会社が計算をまちがえた', jr: '会社のまちがい', en: 'The company made a mistake', correct: false,
              why: t('まずは給与明細で、どの項目がふえたか見てみよう。たいていは住民税です。', '給与明細を見てみよう。たいていは住民税です。', 'Check your payslip first. It is usually resident tax.') },
            { ja: '住民税が引かれはじめたから', jr: '住民税が引かれはじめたから', en: 'Resident tax started', correct: true,
              why: t('そのとおり。住民税は前の年の所得にかかるので、2年目の6月ごろから毎月の給料で引かれるのがふつうです。', 'そのとおり。住民税は、2年目の6月ごろから引かれます。', 'Right. Resident tax is based on last year’s income, so it is usually deducted from June of your second year.') },
            { ja: '保険に入るのをやめたから', jr: '保険をやめたから', en: 'I left the insurance', correct: false,
              why: t('会社員の健康保険と厚生年金は、自分でやめられません。', '会社の保険は、自分でやめられません。', 'Employees cannot opt out of health insurance and pension.') }
          ] },
        { type: 'text', head: t('給与明細は捨てない', '給与明細はすてない', 'Keep your payslips'),
          ja: '給与明細と源泉徴収票は、奨学金・部屋・支援の手続きで「収入の証明」に使います。1つのファイルにまとめておこう。',
          jr: '給与明細と源泉徴収票は、部屋をかりるときなどに使います。1つのファイルにまとめよう。',
          en: 'Payslips and your year-end tax slip prove your income for scholarships, flats and support. Keep them in one folder.',
          mark: t('「収入の証明」', '1つのファイルにまとめよう', 'prove your income') }
      ],
      recap: [
        t('使えるのは手取り。', '使えるのは手取り。', 'You can only spend take-home pay.'),
        t('月給20万円なら、手取りは約17万円（1年目）。', '20万円なら、手取りは約17万円。', '¥200,000 gross ≈ ¥170,000 take-home (year one).'),
        t('2年目から住民税が引かれる。', '2年目から住民税。', 'Resident tax starts in year two.')
      ],
      related: ['hellowork-wakamono', 'koyo-hoken', 'kokuho', 'rodo-hotline', 'tokyo-rodo-sodan'],
      sources: [S.nenkinKounen, S.kenpo, S.koyo, S.ntaKyuyo, S.ntaKiso, S.ntaRate, S.tokyoJumin, S.fsaKashikin],
      checked: CHECKED
    },

    /* 06 ---------------------------------------------------------------- */
    {
      id: 'seikatsuhi', order: 6, level: 'hs', minutes: 3, cat: 'money',
      title: t('1か月の生活費', 'ひとりで暮らすと、いくら？', 'A month of living costs'),
      lead: t('家賃・食費・スマホ…。まず「出ていくお金」を見える化しよう。',
        '家賃・ごはん・スマホ…。まず「出ていくお金」を書き出そう。',
        'Rent, food, phone… start by seeing where the money goes.'),
      steps: [
        { type: 'text', head: t('毎月かかるお金は2種類', '出ていくお金は2つ', 'Two kinds of monthly costs'),
          ja: '金額がほぼ決まっている「固定費」（家賃・スマホ・保険）と、使い方で変わる「変動費」（食費・洋服・遊び）。まず固定費を下げると、毎月がぐっと楽になります。',
          jr: '毎月だいたい同じ「固定費」（家賃・スマホ）と、使い方でかわる「変動費」（ごはん・洋服・遊び）があります。',
          en: 'Fixed costs stay about the same (rent, phone, insurance). Variable costs change with how you spend (food, clothes, fun). Cutting a fixed cost helps every month.',
          mark: t('まず固定費を下げる', '「固定費」', 'Cutting a fixed cost') },
        { type: 'compare', head: t('固定費と変動費', '固定費と変動費', 'Fixed vs. variable'),
          left: { title: t('固定費', '固定費', 'Fixed'), tone: 'neutral',
            points: [t('家賃', '家賃', 'Rent'), t('スマホ・ネット', 'スマホ・ネット', 'Phone and internet'), t('保険・年金', '保険・年金', 'Insurance and pension')] },
          right: { title: t('変動費', '変動費', 'Variable'), tone: 'neutral',
            points: [t('食費', 'ごはん代', 'Food'), t('日用品・洋服', '日用品・洋服', 'Daily goods and clothes'), t('友だちとのお金', '友だちと遊ぶお金', 'Going out with friends')] } },
        { type: 'calc', kind: 'budget', head: t('東京23区でひとり暮らしの例', '東京23区でひとりで暮らすときの例', 'Living alone in Tokyo’s 23 wards'),
          init: { income: 150000, preset: 'ku23' },
          note: t('ざっくりの目安です（手取り15万円、会社の保険あり）。会社の保険がない20歳以上の人は、国民年金（月17,920円）と国民健康保険もかかります。払えないときは免除を申請できます。',
            'ざっくりの数字です。自分の数字に変えてみよう。',
            'Rough numbers (take-home ¥150,000, covered by work insurance). If you are 20+ and not on work insurance, add the national pension (¥17,920 a month) and national health insurance. You can apply for an exemption if you can’t pay.') },
        { type: 'quiz', q: t('毎月、少しだけ足りない。まず見直すなら？', '毎月すこしたりない。まず何を見直す？', 'You are a little short every month. What do you look at first?'),
          options: [
            { ja: 'スマホのプランなど、毎月決まって出ていくお金', jr: 'スマホのプランなど、毎月同じお金', en: 'Fixed costs like your phone plan', correct: true,
              why: t('そのとおり。固定費は一度見直すと、毎月ずっと効きます。', 'そのとおり。一度へらすと、毎月ずっとラクになります。', 'Right. Cut a fixed cost once and it helps every month.') },
            { ja: '食費をゼロに近づける', jr: 'ごはん代をゼロにする', en: 'Cut food to almost nothing', correct: false,
              why: t('食べないのは体をこわします。食費は「自炊を少しふやす」くらいで。', '食べないのは体によくありません。', 'Skipping meals harms your health. Cook a little more instead.') },
            { ja: 'クレジットのリボ払いにする', jr: 'リボ払いにする', en: 'Switch to revolving credit', correct: false,
              why: t('毎月の支払いは減っても、手数料で合計はふえます。', '毎月はへっても、全部ではふえます。', 'Monthly payments drop, but fees make the total bigger.') }
          ] },
        { type: 'text', head: t('先に、少しだけ取っておく', '先に、少しだけとっておく', 'Save a little first'),
          ja: '給料が入ったら、先に数千円でも別の口座へ。病院や、家電がこわれたときなど、急な出費に使えます。',
          jr: 'お金が入ったら、先に少しだけべつにしておこう。急にお金がいるときに助かります。',
          en: 'When pay arrives, move even a few thousand yen to another account first. It covers surprises like a doctor’s visit or a broken appliance.',
          mark: t('先に数千円でも別の口座へ', '先に少しだけべつにしておこう', 'move even a few thousand yen') },
        { type: 'text', head: t('足りない分は、支援で埋められることも', 'たりないときは、支援もある', 'Support can fill the gap'),
          ja: '施設などを出た人は、生活費や家賃を借りられ、条件しだいで返さなくてよくなる「自立支援資金貸付」があります。くらしの相談窓口は、家計の立て直しも手伝ってくれます。',
          jr: '施設などを出た人には、生活費や家賃をかりられて、条件しだいで返さなくていい制度があります。',
          en: 'Care leavers can borrow living and rent money through the Independence Support Loan, forgivable on conditions. Local support desks also help fix a budget.',
          mark: t('「自立支援資金貸付」', '返さなくていい制度', 'Independence Support Loan') }
      ],
      recap: [
        t('固定費と変動費に分けて考える。', '固定費と変動費に分ける。', 'Split costs into fixed and variable.'),
        t('見直すなら、固定費から。', '見直すなら固定費から。', 'Cut fixed costs first.'),
        t('足りない分は、支援と相談で。', 'たりない分は、支援と相談で。', 'Fill gaps with support and advice.')
      ],
      cta: { href: '#/tools/money', label: t('生活費シミュレーターで計算する', null, 'Open the living-cost simulator') },
      related: ['jiritsu-shikin', 'tokyo-jiritsu-shikin', 'jiritsu-sodan', 'jukyo-kakuho', 'seikatsu-fukushi'],
      sources: [S.jflecKihon, S.jflecJhs, S.mhlwKonkyu, S.tcsw, S.nenkinHokenryo, S.nenkinMenjo],
      checked: CHECKED
    },

    /* 07 ---------------------------------------------------------------- */
    {
      id: 'yachin', order: 7, level: 'hs', minutes: 3, cat: 'housing',
      title: t('はじめての家賃と初期費用', '部屋をかりるときのお金', 'Your first rent and move-in costs'),
      lead: t('部屋を借りるときは、家賃のほかに「最初にまとめて払うお金」がかかります。',
        '部屋をかりるときは、家賃のほかに、さいしょにまとめてはらうお金があります。',
        'Renting means paying a lump of move-in costs on top of rent.'),
      steps: [
        { type: 'text', head: t('最初に払うお金', 'さいしょにはらうお金', 'Money you pay up front'),
          ja: '敷金・礼金・仲介手数料・前家賃（最初の月の家賃）・火災保険・保証会社のお金など。合わせると、家賃の何か月分にもなります。',
          jr: '敷金・礼金・仲介手数料・さいしょの月の家賃・火災保険など。合わせると、家賃の何か月分にもなります。',
          en: 'Deposit, key money, agent’s fee, the first month’s rent, fire insurance, a guarantor-company fee… together often several months of rent.',
          mark: t('家賃の何か月分にも', '家賃の何か月分にも', 'several months of rent') },
        { type: 'compare', head: t('敷金と礼金', '敷金と礼金', 'Deposit vs. key money'),
          left: { title: t('敷金', '敷金', 'Deposit (shikikin)'), tone: 'free',
            body: t('大家さんに預けるお金。出るときに、修理代や未払いを引いた残りが返ってくる。', '大家さんにあずけるお金。出るときに、のこりが返ってくる。', 'Held by the landlord. When you leave, you get back what remains after repairs or unpaid rent.') },
          right: { title: t('礼金', '礼金', 'Key money (reikin)'), tone: 'loan',
            body: t('大家さんに払うお礼のお金。出るときに返ってこない。', '大家さんへのお礼。返ってこない。', 'A thank-you payment to the landlord. Not returned.') } },
        { type: 'text', head: t('家賃6万円の部屋の例', '家賃6万円の部屋の例', 'Example: a ¥60,000 flat'),
          ja: '敷金1か月6万円・礼金1か月6万円・仲介手数料6万6千円・前家賃6万円・火災保険と保証料で約5万円。合計で約30万円になります。ただし仲介手数料は、借りる人が払うのは本来は家賃の0.55か月分（3万3千円）まで。前もって「いいよ」と言ったときだけ1.1か月分までです。',
          jr: '敷金6万円・礼金6万円・仲介手数料6万6千円・さいしょの家賃6万円・保険など約5万円。ぜんぶで約30万円。',
          en: 'Deposit ¥60,000, key money ¥60,000, agent’s fee ¥66,000, first month ¥60,000, insurance and guarantor ~¥50,000: about ¥300,000. But the tenant’s share of the agent’s fee is normally capped at 0.55 months (¥33,000); up to 1.1 months only if you agreed in advance.',
          big: { ja: '約30万円', en: 'about ¥300,000', label: t('初期費用の例', 'さいしょにはらうお金の例', 'Example move-in cost') } },
        { type: 'quiz', q: t('不動産会社に払う「仲介手数料」。家賃6万円なら、上限はいくら？', '仲介手数料。家賃6万円なら、いちばん高くていくら？', 'The agent’s fee for a ¥60,000 flat is capped at…'),
          options: [
            { ja: '12万円（家賃2か月分）', jr: '12万円', en: '¥120,000 (two months)', correct: false,
              why: t('「家賃1か月分×1.1倍」をこえる仲介手数料は、国のルール違反です。借りる人が払うのは、本来は家賃の0.55か月分まで。前もって「いいよ」と言ったときだけ1.1か月分までです。', '1か月分×1.1倍より高いのはルール違反です。', 'Anything above one month × 1.1 breaks the national rules. The tenant normally pays at most 0.55 months, or up to 1.1 only with prior consent.') },
            { ja: '6万6千円（家賃1か月分×1.1倍）', jr: '6万6千円', en: '¥66,000 (one month × 1.1)', correct: true,
              why: t('そのとおり。上限は「家賃1か月分×1.1倍」（税込）。借りる人が承諾していなければ、借りる人からは0.55か月分（3万3千円）までです。', 'そのとおり。家賃1か月分×1.1倍までです。', 'Right: one month × 1.1 including tax. Without your consent, the tenant’s share is capped at 0.55 months (¥33,000).') },
            { ja: '決まりはない', jr: '決まりはない', en: 'There is no cap', correct: false,
              why: t('上限は国が決めています。見積もりで金額を確かめましょう。', '上限は決まっています。', 'The government sets a cap. Check the quote.') }
          ] },
        { type: 'text', head: t('初期費用を下げる方法', 'さいしょのお金をへらす方法', 'Ways to lower move-in costs'),
          ja: 'UR賃貸は、礼金・仲介手数料・更新料・保証人がいりません。東京都の「自立生活スタート支援」では引っ越し代などを借りられ、条件しだいで返さなくてよくなります。',
          jr: 'UR賃貸は、礼金や仲介手数料がいりません。施設などを出る人は、引っこし代をかりられる東京都の制度もあります。',
          en: 'UR rentals need no key money, agent’s fee, renewal fee or guarantor. Tokyo’s start-up support lends moving costs and can forgive them on conditions.',
          mark: t('礼金・仲介手数料・更新料・保証人がいりません', '礼金や仲介手数料がいりません', 'no key money, agent’s fee, renewal fee or guarantor') },
        { type: 'text', head: t('入る日に、写真を撮る', '入る日に、写真をとる', 'Take photos on move-in day'),
          ja: '入居した日に、部屋のキズや汚れを日付入りの写真で残しておこう。出るときの敷金の精算で役立ちます。',
          jr: '入った日に、部屋のキズやよごれを写真にとっておこう。出るときに役立ちます。',
          en: 'On move-in day, photograph scratches and stains with the date. It helps when the deposit is settled.',
          mark: t('日付入りの写真', '写真にとっておこう', 'photograph scratches and stains with the date') },
        { type: 'quiz', q: t('「敷金なし」の部屋。出るときのお金は？', '「敷金なし」の部屋。出るときは？', 'A “no deposit” flat. What about moving out?'),
          options: [
            { ja: 'なにも払わなくていい', jr: 'なにもはらわない', en: 'Nothing to pay', correct: false,
              why: t('敷金がなくても、借りた人が負担する修理代（原状回復）は払います。', '敷金がなくても、こわした分ははらいます。', 'Even with no deposit, you pay repair costs that are your responsibility.') },
            { ja: '家賃1か月分を必ず払う', jr: '家賃1か月分をはらう', en: 'Always one month’s rent', correct: false,
              why: t('決まった額ではありません。契約書の「特約」を、入る前に確かめましょう。', '決まった金額ではありません。契約書を見よう。', 'There is no fixed amount. Read the special terms in the contract before moving in.') },
            { ja: '自分が汚したりこわしたりした分は、払う必要がある', jr: '自分がよごした・こわした分は、はらう', en: 'You pay for damage you caused', correct: true,
              why: t('そのとおり。東京都のガイドラインにも、敷金がなくても原状回復の費用は払う必要があると書かれています。', 'そのとおり。敷金がなくても、はらう必要があります。', 'Right. Tokyo’s guideline says restoration costs still apply without a deposit.') }
          ] }
      ],
      recap: [
        t('初期費用は、家賃の何か月分にもなる。', 'さいしょのお金は、家賃の何か月分も。', 'Move-in costs = several months of rent.'),
        t('仲介手数料の上限は、家賃1か月分×1.1倍。', '仲介手数料は1か月分×1.1倍まで。', 'Agent’s fee cap: one month × 1.1.'),
        t('入居の日に、写真を撮る。', '入る日に写真をとる。', 'Photograph the flat on day one.')
      ],
      related: ['ur-chintai', 'tokyo-jiritsu-start', 'mimoto-hosho', 'tokyo-sasaeru-jutaku', 'seikatsu-fukushi'],
      sources: [S.mlitFee, S.tokyoChintai, S.ur, S.tcsw],
      checked: CHECKED
    },

    /* 08 ---------------------------------------------------------------- */
    {
      id: 'shogakukin', order: 8, level: 'hs', minutes: 3, cat: 'education',
      title: t('奨学金の種類', '奨学金って、どんなもの？', 'Types of scholarships'),
      lead: t('「もらう」奨学金と「借りる」奨学金。利息のあるなしで、返す額が大きく変わります。',
        '「もらう」奨学金と「かりる」奨学金があります。',
        'Some scholarships are given, some are lent. Interest changes what you repay.'),
      steps: [
        { type: 'text', head: t('JASSOの奨学金は3つ', '国の奨学金は3つ', 'JASSO has three types'),
          ja: '返さなくていい「給付奨学金」。利息なしで借りる「第一種」。利息ありで借りる「第二種」（利率は年3%まで）。',
          jr: '返さなくていい「給付」。ふえないでかりる「第一種」。ふえてかりる「第二種」。',
          en: 'A grant you never repay, Type 1 loans with no interest, and Type 2 loans with interest (capped at 3% a year).',
          mark: t('返さなくていい「給付奨学金」', '返さなくていい「給付」', 'A grant you never repay') },
        { type: 'compare', head: t('給付と貸与', 'もらう・かりる', 'Grant vs. loan'),
          left: { title: t('給付奨学金', '給付', 'Grant'), tone: 'free', big: t('返す 0円', null, 'Repay ¥0'),
            points: [t('私立大学・ひとり暮らしなら最大 月75,800円', '私立大学でひとり暮らしなら、月75,800円まで', 'Up to ¥75,800/month (private university, living away)'), t('授業料・入学金の減免もいっしょに受けられる', '授業料が安くなる支援もいっしょに', 'Comes with tuition and entry-fee reductions')] },
          right: { title: t('貸与奨学金', '貸与', 'Loan'), tone: 'loan', big: t('卒業後に返す', null, 'Repay after graduating'),
            points: [t('第一種は利息なし', '第一種はふえない', 'Type 1: no interest'), t('第二種は利息あり（年3%まで）', '第二種はふえる（年3%まで）', 'Type 2: interest (max 3%)'), t('在学中は利息がつかない', '学校にいる間はふえない', 'No interest while studying')] } },
        { type: 'text', head: t('利息で、ここまで変わる', '利息で、こんなにかわる', 'How much interest adds'),
          ja: '月10万円を4年借りると480万円。利率3%で20年かけて返すと、返す合計は約646万円。利息だけで約166万円です（JASSOの計算例）。',
          jr: '月10万円を4年かりると480万円。3%なら、返すのはぜんぶで約646万円。166万円もふえます。',
          en: '¥100,000 a month for 4 years is ¥4.8 million. At 3% over 20 years you repay about ¥6.46 million: about ¥1.66 million is interest (JASSO example).',
          big: { ja: '＋約166万円', en: '+¥1.66 million', label: t('480万円・年3%・20年', null, '¥4.8M · 3% · 20 years') } },
        { type: 'quiz', q: t('同じ480万円を借りるなら、返す合計が少ないのは？', '480万円をかりるなら、返すお金が少ないのは？', 'Borrowing ¥4.8 million, which costs less in total?'),
          options: [
            { ja: '第二種（利息あり）', jr: '第二種', en: 'Type 2 (with interest)', correct: false,
              why: t('利息の分だけ多く返します。利率3%なら約166万円ふえます。', 'ふえる分だけ、多く返します。', 'You repay the interest too: about ¥1.66 million more at 3%.') },
            { ja: 'どちらも同じ', jr: 'どちらも同じ', en: 'Both the same', correct: false,
              why: t('利息があるかないかで、返す合計が大きく変わります。', 'ふえるかどうかで、大きくかわります。', 'Interest makes a big difference to the total.') },
            { ja: '第一種（利息なし）', jr: '第一種', en: 'Type 1 (no interest)', correct: true,
              why: t('そのとおり。借りた480万円だけを返します。第一種には成績や家計の基準があります。', 'そのとおり。かりた分だけ返します。', 'Right. You repay just the ¥4.8 million. Type 1 has grade and income criteria.') }
          ] },
        { type: 'text', head: t('施設や里親家庭から通う人', '施設や里親家庭から通う人', 'If you live in care while studying'),
          ja: '児童養護施設や里親家庭などから通う人は、自宅から通う場合の給付額が少し多くなります。家賃を払って暮らすなら「自宅外」として申請できることもあります。',
          jr: '施設や里親家庭から学校に通う人は、もらえる金額が少し多くなります。',
          en: 'Students living in a children’s home or with foster carers get a slightly higher “living at home” grant, and can apply as “living away” if they pay rent.',
          mark: t('給付額が少し多くなります', '少し多くなります', 'a slightly higher') },
        { type: 'quiz', q: t('給付奨学金は、いつ申し込むのが基本？', '給付奨学金は、いつ申しこむ？', 'When do you usually apply for the grant?'),
          options: [
            { ja: '高3のとき、高校を通じて（予約採用）', jr: '高3のとき、高校で', en: 'In the final year of high school, through school', correct: true,
              why: t('そのとおり。進学の前の年に、高校で申し込みます。締切は学校ごとにちがうので、高3の春に先生に聞こう。進学後に学校で申し込むこともできます。', 'そのとおり。高3の春に、先生に聞こう。', 'Right. You apply through school the year before you start. Deadlines vary, so ask in spring. You can also apply after enrolling.') },
            { ja: 'お金がなくなってから', jr: 'お金がなくなってから', en: 'When money runs out', correct: false,
              why: t('申し込みには時期があります。早めに準備しておくと安心です。', '申しこむ時期が決まっています。', 'There are set application periods. Prepare early.') },
            { ja: '大学を卒業してから', jr: '卒業してから', en: 'After graduating', correct: false,
              why: t('奨学金は学校にいる間のお金です。卒業後には申し込めません。', '学校にいる間のお金です。', 'Scholarships are for while you study.') }
          ] }
      ],
      recap: [
        t('まず給付。足りなければ第一種、最後に第二種。', 'まず給付。つぎに第一種。', 'Grant first, then Type 1, then Type 2.'),
        t('第二種は、利息で返す額がふえる。', '第二種は、返すお金がふえる。', 'Type 2 costs more because of interest.'),
        t('高3の春に、学校で申し込み。', '高3の春に、学校で申しこむ。', 'Apply through school in spring of your final year.')
      ],
      related: ['jasso-kyufu', 'jasso-genmen', 'yume-shogaku', 'jasso-juken'],
      sources: [S.jassoAbout, S.jassoKyufu, S.jassoTaiyo, S.jassoRishi, S.jflecUniv],
      checked: CHECKED
    },

    /* 09 ---------------------------------------------------------------- */
    {
      id: 'zeikin-hoken-nenkin', order: 9, level: 'hs', minutes: 3, cat: 'procedures',
      title: t('税金・保険・年金のきほん', '税金と保険と年金って？', 'Tax, insurance and pension basics'),
      lead: t('みんなで出しあって、困ったときに支えあうしくみ。払えないときの方法もあります。',
        'みんなでお金を出しあって、こまったときにたすけあうしくみです。',
        'Everyone chips in so people are supported when things go wrong. There are options if you cannot pay.'),
      steps: [
        { type: 'text', head: t('3つの役わり', '3つの役わり', 'Three jobs'),
          ja: '税金は、学校や道路など、みんなのサービスに。健康保険は、病気やけがのときに。年金は、年をとったときだけでなく、障害が残ったときにも支えてくれます。',
          jr: '税金は、学校や道路に。健康保険は、病気やけがのときに。年金は、年をとったときや、障害が残ったときに。',
          en: 'Taxes pay for schools, roads and services. Health insurance helps when you are ill or hurt. Pension supports you in old age and also if you become disabled.',
          mark: t('障害が残ったときにも', '障害が残ったとき', 'also if you become disabled') },
        { type: 'compare', head: t('働き方で、入るものが変わる', '働き方で、入るものがかわる', 'It depends on how you work'),
          left: { title: t('会社で働く', '会社で働く', 'Employee'), tone: 'neutral',
            points: [t('健康保険＋厚生年金', '健康保険＋厚生年金', 'Health insurance + employees’ pension'), t('保険料は会社と半分ずつ', '会社と半分ずつ', 'Premiums split with the employer'), t('給料から引かれる', '給料から引かれる', 'Taken from your pay')] },
          right: { title: t('それ以外（自分で入る）', 'それいがい', 'Everyone else'), tone: 'neutral',
            points: [t('国民健康保険＋国民年金', '国民健康保険＋国民年金', 'National Health Insurance + national pension'), t('保険料は自分で払う', '自分ではらう', 'You pay the premiums yourself'), t('払えないときは、減らす・待ってもらう申請ができる', 'はらえないときは、申請できる', 'You can apply for reductions or waivers')] } },
        { type: 'text', head: t('20歳になったら国民年金', '20歳になったら国民年金', 'Pension starts at 20'),
          ja: '日本に住む20歳以上の人は、国民年金に入ります。20歳になって2週間くらいで「加入のお知らせ」と納付書が届きます（会社の厚生年金に入っている人は別です）。保険料は月17,920円（2026年度）。',
          jr: '20歳になると、国民年金のお知らせと、はらうための紙が届きます。保険料は月17,920円（2026年度）。',
          en: 'Everyone living in Japan joins the national pension at 20. About two weeks after your birthday a notice and payment slips arrive (not if you are in an employer’s pension). The premium is ¥17,920 a month (FY2026).',
          big: { ja: '月 17,920円', en: '¥17,920 / month', label: t('国民年金の保険料（2026年度）', null, 'National pension premium, FY2026') } },
        { type: 'quiz', q: t('国民年金の保険料が払えない。どうする？', '年金の保険料がはらえない。どうする？', 'You can’t pay the pension premium. What now?'),
          options: [
            { ja: 'そのまま放っておく', jr: 'そのままにする', en: 'Ignore it', correct: false,
              why: t('未納のまま放っておくと、障害年金などが受け取れなくなる場合があります。', 'そのままにすると、こまったときの年金がもらえないことがあります。', 'Leaving it unpaid can cost you disability and other pensions.') },
            { ja: '免除や納付猶予を申請する（学生なら学生納付特例）', jr: '「はらえません」と申請する', en: 'Apply for an exemption or deferral (students: student deferral)', correct: true,
              why: t('そのとおり。申請して認められれば「未納」になりません。市区町村の窓口や年金事務所、ネットで申請できます。', 'そのとおり。申請すれば「未納」になりません。', 'Right. If approved, it does not count as unpaid. Apply at the city office, a pension office or online.') },
            { ja: '年金はもらえないから、払わなくていい', jr: '年金はもらえないから、はらわない', en: 'Pensions won’t exist, so why pay', correct: false,
              why: t('年金は老後だけでなく、障害や家族が亡くなったときの支えでもあります。', '年金は、障害が残ったときなどにもたすけてくれます。', 'Pension also covers disability and loss of a family breadwinner.') }
          ] },
        { type: 'text', head: t('税金が戻ってくることも', '税金がもどってくることも', 'Tax can come back'),
          ja: '給料から引かれた所得税が多すぎたときは、年末調整や確定申告で戻ってきます。年の途中で仕事をやめた人は、確定申告を忘れずに。',
          jr: '給料から引かれた税金が多すぎると、あとでもどってきます。仕事を途中でやめた年は、確定申告を。',
          en: 'If too much income tax was taken from your pay, you get it back through year-end adjustment or a tax return. Left a job mid-year? File a return.',
          mark: t('確定申告を忘れずに', '確定申告を', 'File a return') },
        { type: 'quiz', q: t('会社に入らず、アルバイトで暮らす。病院の保険は？', '会社に入らず、バイトで暮らす。病院の保険は？', 'You live on part-time work, no company insurance. Health cover?'),
          options: [
            { ja: '保険がなくても大丈夫', jr: '保険がなくても大丈夫', en: 'No insurance is fine', correct: false,
              why: t('保険がないと、病院代が全額自分の負担になります。', '保険がないと、病院代がとても高くなります。', 'Without insurance you pay the full medical bill.') },
            { ja: '住んでいる区市町村の国民健康保険に入る', jr: '住んでいるところの国民健康保険に入る', en: 'Join your city’s National Health Insurance', correct: true,
              why: t('そのとおり。会社の保険に入らない人は国保に入ります。収入が少ないと保険料が安くなるしくみもあります。', 'そのとおり。収入が少ないと安くなるしくみもあります。', 'Right. If you’re not on a company plan you join NHI, and premiums are reduced on low income.') },
            { ja: '20歳までは入らなくていい', jr: '20歳までは入らない', en: 'Not needed until 20', correct: false,
              why: t('年齢に関係なく、何かの健康保険に入る必要があります。', '年れいに関係なく、入ります。', 'Everyone needs some health insurance, whatever their age.') }
          ] }
      ],
      recap: [
        t('20歳から国民年金。払えないときは申請。', '20歳から年金。はらえないときは申請。', 'Pension from 20. Can’t pay? Apply for relief.'),
        t('会社員は社会保険、ほかの人は国保と国民年金。', '会社の人と、それ以外で入る保険がちがう。', 'Employees: company plans. Others: NHI + national pension.'),
        t('払いすぎた税金は、戻ってくる。', 'はらいすぎた税金は、もどる。', 'Overpaid tax comes back.')
      ],
      related: ['nenkin-gakusei', 'nenkin-menjo', 'kokuho', 'hikkoshi-todoke', 'mynumber-card'],
      sources: [S.nenkinHatachi, S.nenkinHokenryo, S.nenkinMenjo, S.nenkinGakusei, S.nenkinKounen, S.ntaKanpu],
      checked: CHECKED
    },

    /* 10 ---------------------------------------------------------------- */
    {
      id: 'komattara', order: 10, level: 'hs', minutes: 2, cat: 'consult',
      title: t('お金に困ったら、借りる前に', 'お金がたりないときは', 'Short on money? Before you borrow'),
      lead: t('ひとりで抱えないで。公的な窓口には、返さなくていい支援や、利子なしの貸付があります。',
        'ひとりでなやまないで。国や区市町村の窓口には、たすけてくれるしくみがあります。',
        'Don’t carry it alone. Public desks have support you don’t repay and interest-free loans.'),
      steps: [
        { type: 'text', head: t('まず、くらしの相談窓口', 'まず、相談窓口へ', 'Start at the life-support desk'),
          ja: '区市町村の「自立相談支援機関」は、お金・仕事・住まいの困りごとをまとめて聞いて、いっしょに計画を作ってくれます。家計の立て直しも手伝います。',
          jr: '区市町村の相談窓口は、お金・仕事・住まいのこまりごとを、まとめて聞いてくれます。',
          en: 'Your city’s self-reliance support desk listens to money, work and housing worries together and makes a plan with you, including fixing your budget.',
          mark: t('まとめて聞いて', 'まとめて聞いてくれます', 'listens to money, work and housing worries together') },
        { type: 'compare', head: t('同じ「お金を借りる」でも', '同じ「かりる」でも', 'Not all borrowing is the same'),
          left: { title: t('公的な貸付（社会福祉協議会）', '公的なかしつけ', 'Public loans (social welfare council)'), tone: 'free',
            points: [t('緊急小口資金は10万円以内・利子なし', '急なときは10万円まで、ふえない', 'Emergency small loan: up to ¥100,000, no interest'), t('相談しながら使える', '相談しながら使える', 'Comes with advice')] },
          right: { title: t('SNSの「お金貸します」', 'SNSの「お金かします」', '“Cash loans” on social media'), tone: 'loan',
            points: [t('法外な利息', 'とても高い利息', 'Illegal interest'), t('脅し・個人情報をさらされる', 'おどされる・名前をさらされる', 'Threats, your details exposed')] } },
        { type: 'quiz', q: t('家賃が払えなくなりそう。まずどこへ？', '家賃がはらえなくなりそう。どこへ？', 'You may not make rent. Where first?'),
          options: [
            { ja: 'カードのキャッシングで払う', jr: 'カードでお金をかりる', en: 'Use a card cash advance', correct: false,
              why: t('利息がついて、あとがもっと苦しくなりがちです。先に公的な窓口へ。', 'ふえて、あとがもっと大変になります。', 'Interest makes it harder later. Try a public desk first.') },
            { ja: '大家さんに何も言わずに様子を見る', jr: 'だれにも言わない', en: 'Say nothing and wait', correct: false,
              why: t('早めに相談するほど、選べる方法がふえます。', '早く相談するほど、方法がふえます。', 'The earlier you ask, the more options you have.') },
            { ja: '区市町村のくらしの相談窓口（住まいの支援も聞ける）', jr: '区市町村の相談窓口', en: 'The city life-support desk (ask about housing help)', correct: true,
              why: t('そのとおり。仕事をなくしたり収入が減ったときは、家賃の分が支給される「住居確保給付金」などの支援があります。', 'そのとおり。家賃をたすけてくれる制度もあります。', 'Right. If you lost work or income, there is support such as the housing security benefit that covers rent.') }
          ] },
        { type: 'text', head: t('生活保護も、申請できる', '生活保護も、申請できる', 'You can apply for welfare'),
          ja: '収入が国の決めた最低生活費に足りないときは、生活保護を申請できます。窓口は、住んでいる地域の福祉事務所です。',
          jr: 'くらすためのお金がたりないときは、生活保護を申請できます。窓口は福祉事務所です。',
          en: 'If your income is below the government’s minimum cost of living, you can apply for public assistance at your local welfare office.',
          mark: t('生活保護を申請できます', '生活保護を申請できます', 'you can apply for public assistance') },
        { type: 'text', head: t('借金が返せないとき', '借金が返せないとき', 'If you can’t repay a debt'),
          ja: '返せない借金は、消費生活センター（188）や法テラスに相談を。借金を減らしたり整理したりする方法があります。',
          jr: '返せない借金は、188や法テラスに相談。へらす方法があります。',
          en: 'For debts you can’t repay, ask a consumer centre (188) or Hōterasu. There are ways to reduce or restructure debt.',
          mark: t('整理したりする方法があります', 'へらす方法があります', 'ways to reduce or restructure debt') },
        { type: 'quiz', q: t('「返せないかも」と思ったら、いつ相談する？', '「返せないかも」と思ったら、いつ相談？', 'When should you ask for help with a debt?'),
          options: [
            { ja: 'できるだけ早く', jr: 'できるだけ早く', en: 'As soon as possible', correct: true,
              why: t('そのとおり。延滞が長くなるほど延滞金がふえ、信用情報にも残ります。早いほど選べる方法が多いです。', 'そのとおり。早いほど、方法がたくさんあります。', 'Right. Late fees grow and your credit record suffers. Early means more options.') },
            { ja: '返せなくなって半年たってから', jr: '半年たってから', en: 'After six months of missed payments', correct: false,
              why: t('待つほど延滞金がふえます。今日、相談しよう。', '待つほど、ふえます。', 'Waiting only adds late fees.') },
            { ja: 'だれにも言わない', jr: 'だれにも言わない', en: 'Tell no one', correct: false,
              why: t('ひとりで抱えると、どんどん苦しくなります。相談は無料の窓口が多いです。', 'ひとりでなやまないで。無料の窓口があります。', 'It gets heavier alone. Many advice desks are free.') }
          ] }
      ],
      recap: [
        t('困ったら、まずくらしの相談窓口。', 'こまったら、まず相談窓口。', 'Start at the life-support desk.'),
        t('公的な貸付には、利子なしのものも。', '公的なかしつけは、ふえないものも。', 'Public loans can be interest-free.'),
        t('SNSの「お金貸します」には近づかない。', 'SNSの「お金かします」はダメ。', 'Stay away from social-media lenders.')
      ],
      related: ['jiritsu-sodan', 'jukyo-kakuho', 'seikatsu-fukushi', 'seikatsu-hogo', 'houterasu', 'shohisha-188', 'yorisoi'],
      sources: [S.mhlwKonkyu, S.mhlwFukushi, S.mhlwHogo, S.jflecUniv],
      checked: CHECKED
    },

    /* 11 ---------------------------------------------------------------- 中学生 */
    {
      id: 'jr-koko-okane', order: 11, level: 'jr', minutes: 3, cat: 'education',
      title: t('高校にかかるお金と支援', '高校のお金、どうなるの？', 'High school costs and support'),
      lead: t('授業料は、国と東京都の支援で大きく下がります。手続きを忘れないことが大事。',
        '高校の授業料は、国と東京都がたすけてくれます。手つづきをわすれずに。',
        'National and Tokyo support cut tuition a lot. Just don’t miss the paperwork.'),
      steps: [
        { type: 'text', head: t('高校でかかるお金', '高校でかかるお金', 'What high school costs'),
          ja: '授業料のほかに、入学金、教科書・制服・通学の定期代などがかかります。授業料と、それ以外のお金で、使える支援がちがいます。',
          jr: '授業料のほかに、入学金、教科書、制服、電車の定期代などがかかります。',
          en: 'Besides tuition there are entry fees, textbooks, uniforms and commuter passes. Tuition and other costs have different support.',
          mark: t('使える支援がちがいます', '授業料のほかに', 'different support') },
        { type: 'compare', head: t('授業料の支援（2026年度）', '授業料の支援（2026年度）', 'Tuition support, FY2026'),
          left: { title: t('都立高校（全日制）', '都立高校', 'Tokyo public high school'), tone: 'free', big: t('実質 0円', null, 'effectively ¥0'),
            body: t('授業料は年11万8,800円。国の「就学支援金」で全部まかなわれる。', '授業料は国がぜんぶ出してくれる。', 'Tuition is ¥118,800 a year, fully covered by the national tuition support fund.') },
          right: { title: t('私立高校（全日制）', '私立高校', 'Private high school'), tone: 'free', big: t('最大 年50万1,000円', null, 'up to ¥501,000/yr'),
            body: t('国の就学支援金45万7,200円＋東京都の助成4万3,800円。学校の授業料が上限。', '国と東京都で、年50万1,000円までたすけてくれる。', 'National ¥457,200 + Tokyo ¥43,800, up to the school’s actual tuition.') },
          note: t('2026年度から、家の収入に関係なく使えます（東京都の助成は都内に住む人）。東京都の助成は毎年の申請が必要。国の支援金も、学校から案内が来たら必ず手続きします。',
            '家の収入に関係なく使えます。学校から案内が来たら、かならず申請しよう。',
            'From FY2026 there is no income limit (Tokyo’s top-up is for Tokyo residents). Tokyo’s top-up needs a new application every year; for the national fund, always act when school sends instructions.') },
        { type: 'quiz', q: t('就学支援金で授業料が支援されたら、卒業後に返す？', '就学支援金は、あとで返す？', 'Do you repay the tuition support fund after graduating?'),
          options: [
            { ja: '卒業したら返す', jr: '卒業したら返す', en: 'Yes, after graduating', correct: false,
              why: t('返す必要はありません。国の支援金です。', '返さなくていいお金です。', 'No. It is national support you never repay.') },
            { ja: '返さなくていい', jr: '返さなくていい', en: 'No, never', correct: true,
              why: t('そのとおり。就学支援金は返済不要で、お金は学校が受け取って授業料にあてます。', 'そのとおり。お金は学校にはらわれます。', 'Right. It is never repaid; the school receives it and applies it to tuition.') },
            { ja: '20歳になったら返す', jr: '20歳になったら返す', en: 'Yes, at 20', correct: false,
              why: t('年齢で返すことはありません。返さなくていいお金です。', '返さなくていいお金です。', 'No. It is never repaid.') }
          ] },
        { type: 'text', head: t('授業料以外：奨学給付金', '教科書代などは：奨学給付金', 'Other costs: the scholarship benefit'),
          ja: '教科書代や教材費には、返さなくていい「高校生等奨学給付金」（家の収入の条件あり）。7〜9月に申請し（都立は7月8日〜9月15日）、新入生は7月上旬（都立は7月7日）までに、年額の4分の1を早めにもらう申請もできます。',
          jr: '教科書代などには、返さなくていい「奨学給付金」があります。夏（7〜9月）に申しこみます。',
          en: 'For textbooks and materials there is the high school scholarship benefit, never repaid (income limits apply). Apply in July–September (Tokyo public schools: 8 July–15 September); new students can claim a quarter early, by early July (Tokyo public: 7 July).',
          mark: t('返さなくていい「高校生等奨学給付金」', '返さなくていい「奨学給付金」', 'never repaid') },
        { type: 'text', head: t('受験のお金：受験生チャレンジ支援貸付', '塾と受験料：受験生チャレンジ', 'Exam costs: Tokyo’s exam-support loan'),
          ja: '東京都の制度で、中3は塾代30万円まで・高校の受験料2万7,400円までを、利息なしで借りられます。高校に入学すれば返さなくてよくなります（家の収入などの条件あり。申し込むのは家の人）。施設や里親家庭の人は、塾代や受験料を施設が出してくれることが多いので、まず職員や里親さんに聞こう。',
          jr: '東京都の制度で、塾代と受験料をかりられます。高校に入学できたら、返さなくていい。施設や里親家庭の人は、施設が出してくれることが多いよ。まず職員や里親さんに聞こう。',
          en: 'Tokyo lends grade-9 students up to ¥300,000 for cram school and ¥27,400 for exam fees, interest-free. Entering high school cancels the debt (income limits; a parent or guardian applies). In a children’s home or foster care, the home often pays these costs: ask staff or your foster carer first.',
          mark: t('高校に入学すれば返さなくてよくなります', '返さなくていい', 'Entering high school cancels the debt') },
        { type: 'quiz', q: t('受験生チャレンジで借りて、高校に入学した。次にすることは？', '受験生チャレンジでかりて、高校に入学した。次は？', 'You used the exam-support loan and started high school. What next?'),
          options: [
            { ja: '何もしなくていい', jr: '何もしない', en: 'Nothing', correct: false,
              why: t('手続きをしないと、返すことになります。', '手つづきをしないと、返すことになります。', 'Without the paperwork, you have to repay it.') },
            { ja: '高校を卒業してから考える', jr: '卒業してから考える', en: 'Think about it after graduating', correct: false,
              why: t('期限は入学した年の5月末です。卒業まで待つと間に合いません。', '期限は、入学した年の5月末です。', 'The deadline is the end of May of your first year.') },
            { ja: '入学した年の5月末までに、免除の書類を窓口に出す', jr: '5月末までに、免除の紙を出す', en: 'Hand in the forgiveness form by the end of May', correct: true,
              why: t('そのとおり。在学証明書（または学生証）などを、区市町村の窓口へ。塾などの領収書も全部出しておく必要があります。', 'そのとおり。学生証などを持って、窓口へ。', 'Right. Bring proof of enrolment (or student ID) to the city desk. All cram-school receipts must be handed in too.') }
          ] },
        { type: 'text', head: t('手続きは、だれかと一緒に', '手つづきは、だれかといっしょに', 'Do the paperwork with someone'),
          ja: '就学支援金の申請は、入学後すぐに学校から案内があります。都立高校は「都立高等学校オンライン申請受付システム」、私立高校などは「e-Shien」で申請します（学校の案内にしたがおう）。家の人や施設の職員・里親さんと一緒に、期限を確かめて出そう。',
          jr: '入学したら、学校から申請の案内があります。家の人や施設の職員・里親さんといっしょに出そう。',
          en: 'School tells you how to apply for the tuition support fund right after you start. Tokyo public high schools use Tokyo’s own online system; private schools and others use e-Shien (follow your school’s instructions). Do it with a parent, carer or staff member and check the deadline.',
          mark: t('期限を確かめて出そう', 'いっしょに出そう', 'check the deadline') }
      ],
      recap: [
        t('都立の授業料は実質0円。私立も最大年50万1,000円の支援。', '都立の授業料は、実質0円。', 'Public tuition ≈ ¥0; private up to ¥501,000 a year.'),
        t('教科書代などは奨学給付金（7〜9月に申請）。', '教科書代は奨学給付金。', 'Other costs: scholarship benefit (apply Jul–Sep).'),
        t('受験生チャレンジは、入学で免除。5月末までに手続き。', '受験生チャレンジは、5月末までに手つづき。', 'Exam loan: forgiven on entry. File by end of May.')
      ],
      related: ['koko-shugaku', 'tokyo-toritsu-jugyoryo', 'tokyo-shiritsu-jugyoryo', 'koko-kyufukin', 'tokyo-kokoritsu-kyufukin', 'tokyo-juken-challenge', 'kodomo-gakushu-shien', 'tokyo-kyoiku-sodan'],
      sources: [S.mextKoko, S.mextShien, S.mextKyufu, S.toritsuJugyo, S.toritsuKyufu, S.toritsuOnline, S.shigaku, S.shigakuLeaf, S.juken, S.jukenProc],
      checked: CHECKED
    },

    /* 12 ---------------------------------------------------------------- 中学生 */
    {
      id: 'jr-baito-zeikin', order: 12, level: 'jr', minutes: 3, cat: 'work',
      title: t('おこづかい・バイトと税金', 'おこづかいとバイトと税金', 'Allowance, part-time jobs and tax'),
      lead: t('中学生は、まだバイトできません。高校生になったら知っておきたい、時給と税金のこと。',
        '中学生は、まだバイトできません。高校生になる前に、知っておこう。',
        'You can’t work part-time yet in junior high. Here is what to know for high school.'),
      steps: [
        { type: 'text', head: t('中学生は、まだ働けない', '中学生は、まだ働けない', 'Junior high students can’t work yet'),
          ja: '法律で、15歳になったあとの最初の3月31日まで（ふつうは中学校を卒業するまで）は、原則としてアルバイトできません。新聞配達などの例外も、労働基準監督署の許可が必要です。',
          jr: '法律で、中学校を卒業する3月31日までは、ふつうはアルバイトできません。',
          en: 'By law, you generally can’t be employed until the 31 March after you turn 15 (usually junior high graduation). Exceptions like newspaper delivery need a labour inspection office’s permission.',
          mark: t('原則としてアルバイトできません', 'ふつうはアルバイトできません', 'generally can’t be employed') },
        { type: 'text', head: t('「必要」と「ほしい」に分ける', '「ひつよう」と「ほしい」', 'Needs and wants'),
          ja: 'おこづかいを使う前に「必要なもの？ほしいもの？」と考えるだけで、使いすぎが減ります。メモやアプリで記録するのもおすすめ。',
          jr: 'お金を使う前に「ひつよう？ほしいだけ？」と考えよう。メモしておくと、もっとわかります。',
          en: 'Before spending, ask “Do I need it or just want it?” It cuts overspending. Writing it down helps too.',
          mark: t('「必要なもの？ほしいもの？」', '「ひつよう？ほしいだけ？」', '“Do I need it or just want it?”') },
        { type: 'quiz', q: t('「必要なもの」はどれ？', '「ひつようなもの」はどれ？', 'Which one is a need?'),
          options: [
            { ja: '人気キャラのグッズ', jr: '人気キャラのグッズ', en: 'Merch of a popular character', correct: false,
              why: t('それは「ほしいもの」。買うのは悪くないけど、必要なものの後に。', 'それは「ほしいもの」です。', 'That’s a want. Fine to buy, but after the needs.') },
            { ja: 'ゲームのガチャ', jr: 'ゲームのガチャ', en: 'A game gacha pull', correct: false,
              why: t('それも「ほしいもの」。1か月の上限を決めておこう。', 'それも「ほしいもの」。上限を決めよう。', 'Also a want. Set a monthly limit.') },
            { ja: '学校で使うノート', jr: '学校で使うノート', en: 'Notebooks for school', correct: true,
              why: t('そのとおり。勉強に使うノートは「必要なもの」です。', 'そのとおり。学校で使うものは「ひつよう」。', 'Right. Things you need for school are needs.') }
          ] },
        { type: 'text', head: t('高校生のバイト代は？', '高校生のバイト代は？', 'High school part-time pay'),
          ja: '東京都の最低賃金は、2026年10月1日から時給1,280円。これより低い時給は法律違反です。18歳未満は、残業や深夜の仕事はできません。',
          jr: '東京都では、時給は1,280円より下げてはいけないきまりです（2026年10月から）。18歳になるまでは、夜おそくは働けません。',
          en: 'Tokyo’s minimum wage is ¥1,280 an hour from 1 October 2026; paying less is illegal. Under-18s can’t do overtime or late-night work.',
          big: { ja: '時給 1,280円', en: '¥1,280 / hour', label: t('東京都の最低賃金（2026年10月1日から）', '東京都の最低賃金', 'Tokyo minimum wage from 1 Oct 2026') } },
        { type: 'quiz', q: t('時給1,280円で、1日4時間・月12日働くと、1か月のバイト代は？', '時給1,280円、1日4時間、月12日。1か月でいくら？', '¥1,280 an hour, 4 hours a day, 12 days a month. Monthly pay?'),
          options: [
            { ja: '15,360円', jr: '15,360円', en: '¥15,360', correct: false,
              why: t('それは3日分（1,280×4×3）。12日分で計算しよう。', 'それは3日分です。', 'That’s three days. Work it out for 12.') },
            { ja: '61,440円', jr: '61,440円', en: '¥61,440', correct: true,
              why: t('そのとおり。1,280円×4時間×12日＝61,440円。1年続けると約74万円で、所得税はかかりません。', 'そのとおり。1,280×4×12＝61,440円。', 'Right. ¥1,280 × 4 × 12 = ¥61,440. About ¥740,000 a year: no income tax.') },
            { ja: '128,000円', jr: '128,000円', en: '¥128,000', correct: false,
              why: t('それは100時間分。今回は4時間×12日＝48時間です。', 'それは100時間分です。', 'That’s 100 hours. Here it’s 4 × 12 = 48 hours.') }
          ] },
        { type: 'compare', head: t('バイト代と税金', 'バイト代と税金', 'Part-time pay and tax'),
          left: { title: t('所得税', '所得税', 'Income tax'), tone: 'free', big: t('年178万円まで 0円', null, '¥0 up to ¥1.78M/yr'),
            body: t('給料だけなら、年178万円まではかかりません（2026年分から。2025年分は160万円）。', '給料が年178万円までなら、かかりません。', 'With only wages, none up to ¥1.78 million a year (from 2026; ¥1.6 million for 2025).') },
          right: { title: t('住民税', '住民税', 'Resident tax'), tone: 'neutral',
            body: t('前の年の収入にかかる税金。その年の1月1日に18歳未満なら、前の年の給料が204万4千円未満のときはかかりません（18歳以上なら、23区では年110万円くらいからかかります）。', '前の年の収入にかかる税金。18歳未満なら、ほとんどかかりません。', 'Charged on last year’s income. If you are under 18 on 1 January, there is none when last year’s wages were under ¥2,044,000 (from 18, it starts at about ¥1.1 million a year in the 23 wards).') },
          note: t('家族の扶養に入っている人は、たくさん働くと家族の税金や保険が変わることがあります。働く前に、家の人や施設の職員・里親さんに相談しよう。',
            'たくさん働く前に、家の人や施設の職員・里親さんに相談しよう。',
            'If a family member claims you as a dependant, earning a lot can change their tax or insurance. Talk to them, or to your care staff or foster carer, first.') },
        { type: 'text', head: t('バイトをやめた年は、税金が戻るかも', 'やめた年は、税金がもどるかも', 'Quit mid-year? Tax may come back'),
          ja: '給料から所得税が引かれていて、年の途中でやめたときは、確定申告（還付申告）で戻ってくることがあります。源泉徴収票をもらっておこう。',
          jr: '給料から税金が引かれていて、とちゅうでやめたら、もどってくることがあります。源泉徴収票をもらっておこう。',
          en: 'If income tax was taken from your pay and you quit mid-year, a tax return can get it back. Ask for your withholding slip.',
          mark: t('源泉徴収票をもらっておこう', '源泉徴収票をもらっておこう', 'Ask for your withholding slip') }
      ],
      recap: [
        t('中学生は、原則バイトできない。', '中学生は、ふつうはバイトできない。', 'No part-time jobs in junior high (in principle).'),
        t('東京の最低賃金は時給1,280円（2026年10月から）。', '東京の時給は1,280円から。', 'Tokyo minimum wage: ¥1,280/hour (from Oct 2026).'),
        t('所得税は、給料が年178万円までなら0円。', '所得税は、年178万円まで0円。', 'No income tax on wages up to ¥1.78M a year.')
      ],
      related: ['tokyo-rodo-sodan', 'rodo-hotline', 'hellowork-wakamono'],
      sources: [S.nensho, S.minWage, S.ntaPart, S.ntaKanpu, S.tokyoJumin, S.jflecJhs],
      checked: CHECKED
    }
  ];
})();
;
/* ---- data/ruby.js ---- */
/* 巣立ちマップ v2 — data/ruby.js (A10)
   Furigana dictionary: SM.data.ruby = { '漢字語': 'よみ' }.
   Core wraps the longest match first, so compounds win over shorter words.
   Rules: compounds over single kanji (no single-kanji keys); okurigana words are listed
   as whole words (e.g. 申し込み) so the reading stays correct. */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};
  var R = {
    /* ---------- this site ---------- */
    '巣立ち': 'すだち', '巣立つ': 'すだつ', '巣立って': 'すだって', '巣立った': 'すだった', '巣立': 'すだ',
    '巣立ちの日': 'すだちのひ', '地図': 'ちず', '支援': 'しえん', '支援者': 'しえんしゃ', '支援者向け': 'しえんしゃむけ',
    '保存': 'ほぞん', '設定': 'せってい', '表示': 'ひょうじ', '緊急': 'きんきゅう', '結果': 'けっか', '質問': 'しつもん',
    '回答': 'かいとう', '一覧': 'いちらん', '検索': 'けんさく', '画面': 'がめん', '記録': 'きろく', '文字': 'もじ',
    '入力': 'にゅうりょく', '送信': 'そうしん', '出典': 'しゅってん', '確認日': 'かくにんび', '最終確認': 'さいしゅうかくにん',
    '掲載': 'けいさい', '掲載基準': 'けいさいきじゅん', '免責': 'めんせき', '運営': 'うんえい', '台本': 'だいほん',
    '報告': 'ほうこく', '公式': 'こうしき', '情報': 'じょうほう', '最新': 'さいしん', '共有': 'きょうゆう',
    '右上': 'みぎうえ', '目次': 'もくじ', '使い方': 'つかいかた', '困りごと': 'こまりごと', '気持ち': 'きもち',
    '大丈夫': 'だいじょうぶ', '一緒': 'いっしょ', '安心': 'あんしん', '心配': 'しんぱい', '不安': 'ふあん',
    '自分': 'じぶん', '本人': 'ほんにん', '名前': 'なまえ', '今日': 'きょう', '今年': 'ことし', '来年': 'らいねん',
    '毎日': 'まいにち', '毎月': 'まいつき', '毎年': 'まいとし', '毎週': 'まいしゅう', '時間': 'じかん', '期間': 'きかん',
    '予定': 'よてい', '手間': 'てま', '全部': 'ぜんぶ', '最初': 'さいしょ', '最後': 'さいご', '場所': 'ばしょ',
    '居場所': 'いばしょ', '一度': 'いちど', '何回': 'なんかい', '理由': 'りゆう', '方法': 'ほうほう', '種類': 'しゅるい',
    '内容': 'ないよう', '状況': 'じょうきょう', '関係': 'かんけい', '言葉': 'ことば', '数字': 'すうじ', '日付': 'ひづけ',
    '日時': 'にちじ', '番号': 'ばんごう', '電話番号': 'でんわばんごう', '連絡先': 'れんらくさき', '連絡': 'れんらく',
    '返事': 'へんじ', '経験': 'けいけん', '希望': 'きぼう', '目的': 'もくてき', '目標': 'もくひょう', '目安': 'めやす',
    '問題': 'もんだい', '大事': 'だいじ', '大切': 'たいせつ', '危険': 'きけん', '安全': 'あんぜん', '可能性': 'かのうせい',
    '準備': 'じゅんび', '用意': 'ようい', '練習': 'れんしゅう', '計画': 'けいかく', '計算': 'けいさん', '判断': 'はんだん',
    '気軽': 'きがる', '苦手': 'にがて', '緊張': 'きんちょう', '順番': 'じゅんばん', '優先': 'ゆうせん', '以上': 'いじょう',
    '以下': 'いか', '以内': 'いない', '未満': 'みまん', '以外': 'いがい', '前後': 'ぜんご', '途中': 'とちゅう',
    '全国': 'ぜんこく', '地域': 'ちいき', '身近': 'みぢか', '外国': 'がいこく', '日本': 'にほん', '日本語': 'にほんご',
    '英語': 'えいご', '中国語': 'ちゅうごくご', '言語': 'げんご', '大人': 'おとな', '子供': 'こども', '家族': 'かぞく',
    '友達': 'ともだち', '恋人': 'こいびと', '先生': 'せんせい', '学校': 'がっこう', '若者': 'わかもの', '女性': 'じょせい',
    '男性': 'だんせい', '年齢': 'ねんれい', '誕生日': 'たんじょうび', '性別': 'せいべつ', '健康': 'けんこう', '病気': 'びょうき',
    '病院': 'びょういん', '薬局': 'やっきょく', '看護師': 'かんごし', '医療費': 'いりょうひ', '病院代': 'びょういんだい',
    '妊娠': 'にんしん', '子育て': 'こそだて', '障害': 'しょうがい', '匿名': 'とくめい', '無料': 'むりょう', '有料': 'ゆうりょう',
    '広告': 'こうこく', '住所': 'じゅうしょ', '電話': 'でんわ', '電話相談': 'でんわそうだん', '通話料': 'つうわりょう',
    '通話': 'つうわ', '内線': 'ないせん', '代表番号': 'だいひょうばんごう', '受付': 'うけつけ', '受付時間': 'うけつけじかん',
    '平日': 'へいじつ', '土曜': 'どよう', '日曜': 'にちよう', '日曜日': 'にちようび', '土曜日': 'どようび', '月曜': 'げつよう',
    '火曜': 'かよう', '水曜': 'すいよう', '木曜': 'もくよう', '金曜': 'きんよう', '土日': 'どにち', '土日祝': 'どにちしゅく',
    '祝日': 'しゅくじつ', '休日': 'きゅうじつ', '年末年始': 'ねんまつねんし', '元日': 'がんじつ', '午前': 'ごぜん', '午後': 'ごご',
    '夕方': 'ゆうがた', '夜間': 'やかん', '時間外': 'じかんがい', '夕食': 'ゆうしょく', '食費': 'しょくひ', '食事': 'しょくじ',
    '予約': 'よやく', '予約制': 'よやくせい', '要予約': 'ようよやく', '予約優先': 'よやくゆうせん', '面談': 'めんだん',
    '見学': 'けんがく', '参加': 'さんか', '交流': 'こうりゅう', '紹介': 'しょうかい', '案内': 'あんない', '同行': 'どうこう',
    '同行支援': 'どうこうしえん', '伴走': 'ばんそう', '応援': 'おうえん', '個別': 'こべつ', '個室': 'こしつ', '専門': 'せんもん',
    '専用': 'せんよう', '女性専用': 'じょせいせんよう', '徒歩': 'とほ', '入口': 'いりぐち', '地下': 'ちか', '本部': 'ほんぶ',
    '団体': 'だんたい', '法人': 'ほうじん', '民間': 'みんかん', '公的': 'こうてき', '会社': 'かいしゃ', '事業': 'じぎょう',
    '支援事業': 'しえんじぎょう', '事務局': 'じむきょく', '財源': 'ざいげん', '寄附': 'きふ', '委託': 'いたく', '実施': 'じっし',
    '利用': 'りよう', '登録': 'とうろく', '追加': 'ついか', '作成': 'さくせい', '提出': 'ていしゅつ', '郵送': 'ゆうそう',
    '用件': 'ようけん', '内定': 'ないてい', '同意': 'どうい', '資料': 'しりょう', '調整': 'ちょうせい', '証拠': 'しょうこ',
    '記入': 'きにゅう', '印鑑': 'いんかん', '署名': 'しょめい', '控え': 'ひかえ',


    /* ---------- everyday verbs & words (with okurigana) ---------- */
    '東京版': 'とうきょうばん', '約3分': 'やくさんぷん', '3分': 'さんぷん', '6問': 'ろくもん', '見る': 'みる', '見て': 'みて', '見せる': 'みせる',
    '出る': 'でる', '出た': 'でた', '使える': 'つかえる', '使う': 'つかう', '答える': 'こたえる', '答え': 'こたえ', '変える': 'かえる',
    '話す': 'はなす', '話したい': 'はなしたい', '話せる': 'はなせる', '話せます': 'はなせます', '聞く': 'きく', '聞いて': 'きいて',
    '読む': 'よむ', '読める': 'よめる', '書く': 'かく', '書いて': 'かいて', '選ぶ': 'えらぶ', '探す': 'さがす', '分かる': 'わかる',
    '困る': 'こまる', '困った': 'こまった', '住む': 'すむ', '住んで': 'すんで', '届く': 'とどく', '決める': 'きめる', '決まる': 'きまる',
    '頼る': 'たよる', '頼れない': 'たよれない', '消す': 'けす', '開く': 'ひらく', '閉じる': 'とじる', '抱える': 'かかえる',
    '言う': 'いう', '言わなくても': 'いわなくても', '教えて': 'おしえて', '助け': 'たすけ', '助かる': 'たすかる', '受け取る': 'うけとる',
    '持って': 'もって', '持ち物': 'もちもの', '行く': 'いく', '来る': 'くる', '待つ': 'まつ', '始める': 'はじめる', '続ける': 'つづける',
    '気になる': 'きになる', '近い': 'ちかい', '新しい': 'あたらしい', '高い': 'たかい', '安い': 'やすい', '少し': 'すこし', '多い': 'おおい',
    '早め': 'はやめ', '早く': 'はやく', '遅れ': 'おくれ', '一人': 'ひとり', '二人': 'ふたり', '人向け': 'ひとむけ', '今すぐ': 'いますぐ',

    /* ---------- 申請・手続き ---------- */
    '制度': 'せいど', '手続き': 'てつづき', '手続': 'てつづき', '窓口': 'まどぐち', '申請': 'しんせい', '申請書': 'しんせいしょ',
    '電子申請': 'でんししんせい', '申し込み': 'もうしこみ', '申し込む': 'もうしこむ', '申込み': 'もうしこみ', '申込': 'もうしこみ',
    '申込書': 'もうしこみしょ', '借入申込書': 'かりいれもうしこみしょ', '相談': 'そうだん', '相談先': 'そうだんさき',
    '相談窓口': 'そうだんまどぐち', '相談員': 'そうだんいん', '相談室': 'そうだんしつ', '相談所': 'そうだんじょ',
    '無料相談': 'むりょうそうだん', '個別相談': 'こべつそうだん', '出張相談': 'しゅっちょうそうだん', '相談支援': 'そうだんしえん',
    '総合相談': 'そうごうそうだん', '総合窓口': 'そうごうまどぐち', '対象': 'たいしょう', '対象外': 'たいしょうがい',
    '締切': 'しめきり', '締め切り': 'しめきり', '必要': 'ひつよう', '不要': 'ふよう', '書類': 'しょるい', '必要書類': 'ひつようしょるい',
    '条件': 'じょうけん', '資格': 'しかく', '審査': 'しんさ', '基準': 'きじゅん', '原則': 'げんそく', '上限': 'じょうげん',
    '最長': 'さいちょう', '全額': 'ぜんがく', '一部': 'いちぶ', '金額': 'きんがく', '費用': 'ひよう', '実費': 'じっぴ',
    '確認': 'かくにん', '本人確認': 'ほんにんかくにん', '本人確認書類': 'ほんにんかくにんしょるい', '身分証': 'みぶんしょう',
    '身分証明書': 'みぶんしょうめいしょ', '証明書': 'しょうめいしょ', '証明': 'しょうめい', '顔写真': 'かおじゃしん',
    '運転免許': 'うんてんめんきょ', '運転免許証': 'うんてんめんきょしょう', '在留カード': 'ざいりゅうカード',
    '住民票': 'じゅうみんひょう', '戸籍': 'こせき', '戸籍謄本': 'こせきとうほん', '印鑑登録': 'いんかんとうろく',
    '転入': 'てんにゅう', '転出': 'てんしゅつ', '転入届': 'てんにゅうとどけ', '転出届': 'てんしゅつとどけ', '転居': 'てんきょ',
    '引っ越し': 'ひっこし', '引越し': 'ひっこし', '届け出': 'とどけで', '届出': 'とどけで', '郵便局': 'ゆうびんきょく',
    '転送': 'てんそう', '通知': 'つうち', '通帳': 'つうちょう', '口座': 'こうざ', '銀行口座': 'ぎんこうこうざ', '暗証番号': 'あんしょうばんごう',
    '役所': 'やくしょ', '区役所': 'くやくしょ', '市役所': 'しやくしょ', '町役場': 'まちやくば', '村役場': 'むらやくば',
    '本庁舎': 'ほんちょうしゃ', '分庁舎': 'ぶんちょうしゃ', '庁舎': 'ちょうしゃ', '別館': 'べっかん', '分室': 'ぶんしつ',
    '担当': 'たんとう', '職員': 'しょくいん', '施設職員': 'しせつしょくいん', '施設長': 'しせつちょう',
    '保険': 'ほけん', '健康保険': 'けんこうほけん', '国民健康保険': 'こくみんけんこうほけん', '国保': 'こくほ',
    '保険証': 'ほけんしょう', '保険料': 'ほけんりょう', '資格確認書': 'しかくかくにんしょ', 'マイナ保険証': 'マイナほけんしょう',
    '年金': 'ねんきん', '国民年金': 'こくみんねんきん', '国民年金保険料': 'こくみんねんきんほけんりょう', '年金事務所': 'ねんきんじむしょ',
    '障害年金': 'しょうがいねんきん', '学生納付特例': 'がくせいのうふとくれい', '納付猶予': 'のうふゆうよ', '納付': 'のうふ',
    '猶予': 'ゆうよ', '未納': 'みのう', '追納': 'ついのう', '免除': 'めんじょ', '一部免除': 'いちぶめんじょ', '減免': 'げんめん',
    '軽減': 'けいげん', '税金': 'ぜいきん', '住民税': 'じゅうみんぜい', '所得税': 'しょとくぜい', '非課税': 'ひかぜい',
    '確定申告': 'かくていしんこく', '申告': 'しんこく', '所得': 'しょとく', '扶養': 'ふよう', '世帯': 'せたい', '単身': 'たんしん',
    '雇用保険': 'こようほけん', '失業': 'しつぎょう', '基本手当': 'きほんてあて', '離職票': 'りしょくひょう', '受給': 'じゅきゅう',
    '支給': 'しきゅう', '請求': 'せいきゅう', '請求書': 'せいきゅうしょ', '領収書': 'りょうしゅうしょ', '見積': 'みつもり',
    '見積もり': 'みつもり', '見積書': 'みつもりしょ', '実績報告': 'じっせきほうこく', '実績報告書': 'じっせきほうこくしょ',
    '意見書': 'いけんしょ', '推薦': 'すいせん', '推薦書': 'すいせんしょ', '作文': 'さくぶん', '面接': 'めんせつ', '合格': 'ごうかく',
    '募集': 'ぼしゅう', '応募': 'おうぼ', '認定': 'にんてい', '権利': 'けんり', '申請は権利': 'しんせいはけんり',
    '法律': 'ほうりつ', '法律相談': 'ほうりつそうだん', '弁護士': 'べんごし', '司法書士': 'しほうしょし', '法テラス': 'ほうテラス',

    /* ---------- お金 ---------- */
    '生活費': 'せいかつひ', '生活': 'せいかつ', '収入': 'しゅうにゅう', '支出': 'ししゅつ', '給料': 'きゅうりょう',
    '給与': 'きゅうよ', '給与明細': 'きゅうよめいさい', '手取り': 'てどり', '手取': 'てどり', '貯金': 'ちょきん', '家計': 'かけい',
    '家計改善支援': 'かけいかいぜんしえん', '借金': 'しゃっきん', '借りる': 'かりる', '返す': 'かえす', '払う': 'はらう',
    '支払い': 'しはらい', '支払': 'しはらい', '前払い': 'まえばらい', '支払う': 'しはらう', '申込む': 'もうしこむ', '給付': 'きゅうふ', '給付金': 'きゅうふきん',
    '貸付': 'かしつけ', '貸付金': 'かしつけきん', '貸し付け': 'かしつけ', '返済': 'へんさい', '返済免除': 'へんさいめんじょ',
    '利子': 'りし', '無利子': 'むりし', '利息': 'りそく', '補助': 'ほじょ', '補助金': 'ほじょきん', '助成': 'じょせい',
    '助成金': 'じょせいきん', '支度金': 'したくきん', '一時金': 'いちじきん', '援助': 'えんじょ', '万円': 'まんえん', '千円': 'せんえん',
    '円未満': 'えんみまん', '光熱費': 'こうねつひ', '光熱水費': 'こうねつすいひ', '水道代': 'すいどうだい', '電気代': 'でんきだい',
    '通信費': 'つうしんひ', '交通費': 'こうつうひ', '携帯電話': 'けいたいでんわ', '家電': 'かでん', '家具': 'かぐ',
    '生活保護': 'せいかつほご', '保護': 'ほご', '緊急小口資金': 'きんきゅうこぐちしきん', '総合支援資金': 'そうごうしえんしきん',
    '自立支援資金': 'じりつしえんしきん', '自立支援資金貸付': 'じりつしえんしきんかしつけ', '住居確保給付金': 'じゅうきょかくほきゅうふきん',
    '生活福祉資金': 'せいかつふくししきん', '資金': 'しきん', '消費者': 'しょうひしゃ', '消費生活': 'しょうひせいかつ',
    '消費者ホットライン': 'しょうひしゃホットライン', '契約': 'けいやく', '契約書': 'けいやくしょ', '解約': 'かいやく',
    '雇用契約書': 'こようけいやくしょ', '名義貸し': 'めいぎがし', '名義': 'めいぎ', '詐欺': 'さぎ', '犯罪': 'はんざい',
    '副業': 'ふくぎょう', '通販': 'つうはん', '損害賠償': 'そんがいばいしょう', '連帯保証人': 'れんたいほしょうにん',

    /* ---------- 住まい ---------- */
    '住まい': 'すまい', '住宅': 'じゅうたく', '住居': 'じゅうきょ', '賃貸': 'ちんたい', '賃貸住宅': 'ちんたいじゅうたく',
    '家賃': 'やちん', '家賃支援': 'やちんしえん', '敷金': 'しききん', '礼金': 'れいきん', '仲介手数料': 'ちゅうかいてすうりょう',
    '手数料': 'てすうりょう', '初期費用': 'しょきひよう', '保証人': 'ほしょうにん', '保証会社': 'ほしょうがいしゃ', '保証料': 'ほしょうりょう',
    '保証': 'ほしょう', '身元保証': 'みもとほしょう', '身元保証人': 'みもとほしょうにん', '身元保証人確保対策事業': 'みもとほしょうにんかくほたいさくじぎょう',
    '火災保険': 'かさいほけん', '更新料': 'こうしんりょう', '管理費': 'かんりひ', '共益費': 'きょうえきひ', '退去': 'たいきょ',
    '原状回復': 'げんじょうかいふく', '部屋': 'へや', '不動産会社': 'ふどうさんがいしゃ', '不動産屋': 'ふどうさんや', '不動産': 'ふどうさん',
    '大家': 'おおや', '物件': 'ぶっけん', '内見': 'ないけん', '間取り': 'まどり', '都営住宅': 'とえいじゅうたく', '公営住宅': 'こうえいじゅうたく',
    '都市機構': 'としきこう', '社宅': 'しゃたく', '寮費': 'りょうひ', '一時保護': 'いちじほご', '住み込み': 'すみこみ',

    /* ---------- 進学 ---------- */
    '進学': 'しんがく', '進学先': 'しんがくさき', '進学後': 'しんがくご', '進学者': 'しんがくしゃ', '進路': 'しんろ',
    '大学': 'だいがく', '短大': 'たんだい', '短期大学': 'たんきだいがく', '専門学校': 'せんもんがっこう', '高専': 'こうせん',
    '高校': 'こうこう', '高校生': 'こうこうせい', '中学': 'ちゅうがく', '中学生': 'ちゅうがくせい', '学生': 'がくせい',
    '生徒': 'せいと', '新入生': 'しんにゅうせい', '受験': 'じゅけん', '受験生': 'じゅけんせい', '受験料': 'じゅけんりょう',
    '入学': 'にゅうがく', '入学金': 'にゅうがくきん', '入学前': 'にゅうがくまえ', '入学後': 'にゅうがくご', '授業料': 'じゅぎょうりょう',
    '学費': 'がくひ', '教材費': 'きょうざいひ', '教科書': 'きょうかしょ', '教科書代': 'きょうかしょだい', '塾代': 'じゅくだい',
    '奨学金': 'しょうがくきん', '給付型奨学金': 'きゅうふがたしょうがくきん', '給付奨学金': 'きゅうふしょうがくきん',
    '貸与型奨学金': 'たいよがたしょうがくきん', '日本学生支援機構': 'にほんがくせいしえんきこう', '修学支援新制度': 'しゅうがくしえんしんせいど',
    '就学支援金': 'しゅうがくしえんきん', '高校生等奨学給付金': 'こうこうせいとうしょうがくきゅうふきん', '予約採用': 'よやくさいよう',
    '在学': 'ざいがく', '在学中': 'ざいがくちゅう', '在学証明書': 'ざいがくしょうめいしょ', '学生証': 'がくせいしょう',
    '卒業': 'そつぎょう', '卒業後': 'そつぎょうご', '高校卒業': 'こうこうそつぎょう', '中退': 'ちゅうたい', '高卒認定': 'こうそつにんてい',
    '国公立': 'こっこうりつ', '私立': 'しりつ', '全日制': 'ぜんにちせい', '定時制': 'ていじせい', '通信制': 'つうしんせい',
    '自宅外通学': 'じたくがいつうがく', '通学': 'つうがく', '学習会': 'がくしゅうかい', '学習': 'がくしゅう', '高等教育': 'こうとうきょういく',
    '奨学育英会': 'しょうがくいくえいかい', '年生': 'ねんせい',

    /* ---------- 仕事 ---------- */
    '仕事': 'しごと', '就職': 'しゅうしょく', '就職者': 'しゅうしょくしゃ', '就労': 'しゅうろう', '就労支援': 'しゅうろうしえん',
    '就労準備支援': 'しゅうろうじゅんびしえん', '求職': 'きゅうしょく', '求職者支援制度': 'きゅうしょくしゃしえんせいど', '求人': 'きゅうじん',
    '職場': 'しょくば', '正社員': 'せいしゃいん', '転職': 'てんしょく', '退職': 'たいしょく', '働く': 'はたらく', '働き方': 'はたらきかた',
    '職業訓練': 'しょくぎょうくんれん', '訓練': 'くんれん', '資格取得': 'しかくしゅとく', '有給休暇': 'ゆうきゅうきゅうか',
    '残業': 'ざんぎょう', '残業代': 'ざんぎょうだい', '労働': 'ろうどう', '労働相談': 'ろうどうそうだん', '労働条件': 'ろうどうじょうけん',
    '最低賃金': 'さいていちんぎん', '賃金': 'ちんぎん', '時給': 'じきゅう', '工賃': 'こうちん', '工房': 'こうぼう', '人間関係': 'にんげんかんけい',
    '履歴書': 'りれきしょ', '面接練習': 'めんせつれんしゅう',

    /* ---------- 社会的養護・福祉 ---------- */
    '社会的養護': 'しゃかいてきようご', '社会的養護経験者': 'しゃかいてきようごけいけんしゃ', '養護': 'ようご',
    '児童養護施設': 'じどうようごしせつ', '施設': 'しせつ', '里親': 'さとおや', '里親家庭': 'さとおやかてい',
    '自立援助ホーム': 'じりつえんじょホーム', '自立援助': 'じりつえんじょ', '自立': 'じりつ', '自立支援': 'じりつしえん',
    '自立生活': 'じりつせいかつ', '自立相談支援': 'じりつそうだんしえん', '自立相談支援機関': 'じりつそうだんしえんきかん',
    '自立相談支援窓口': 'じりつそうだんしえんまどぐち', '社会的養護自立支援拠点': 'しゃかいてきようごじりつしえんきょてん',
    '社会的養護自立支援拠点事業': 'しゃかいてきようごじりつしえんきょてんじぎょう', '拠点': 'きょてん', '措置': 'そち',
    '措置延長': 'そちえんちょう', '措置解除': 'そちかいじょ', '退所': 'たいしょ', '退所後': 'たいしょご', '入所': 'にゅうしょ',
    '児童相談所': 'じどうそうだんじょ', '児相': 'じそう', '児童': 'じどう', '児童福祉法': 'じどうふくしほう',
    '改正児童福祉法': 'かいせいじどうふくしほう', '虐待': 'ぎゃくたい', '虐待対応': 'ぎゃくたいたいおう', '暴力': 'ぼうりょく',
    '性暴力': 'せいぼうりょく', '家庭': 'かてい', '家庭支援': 'かていしえん', '養育者': 'よういくしゃ', '福祉': 'ふくし',
    '福祉事務所': 'ふくしじむしょ', '社会福祉協議会': 'しゃかいふくしきょうぎかい', '社協': 'しゃきょう',
    '東京都社会福祉協議会': 'とうきょうとしゃかいふくしきょうぎかい', '東社協': 'とうしゃきょう',
    '全国社会福祉協議会': 'ぜんこくしゃかいふくしきょうぎかい', '社会福祉法人': 'しゃかいふくしほうじん', '社会福祉課': 'しゃかいふくしか',
    '生活福祉課': 'せいかつふくしか', '生活支援課': 'せいかつしえんか', '生活困窮者': 'せいかつこんきゅうしゃ',
    '生活困窮者自立支援法': 'せいかつこんきゅうしゃじりつしえんほう', '特定非営利活動法人': 'とくていひえいりかつどうほうじん',
    '一般社団法人': 'いっぱんしゃだんほうじん', '公益財団法人': 'こうえきざいだんほうじん', '民生委員': 'みんせいいいん',
    '保健所': 'ほけんじょ', '保健師': 'ほけんし', '精神保健': 'せいしんほけん', '孤立': 'こりつ', '若者総合相談': 'わかものそうごうそうだん',

    /* ---------- 国・都の機関 ---------- */
    '都道府県': 'とどうふけん', '区市町村': 'くしちょうそん', '市区町村': 'しくちょうそん', '自治体': 'じちたい',
    '特別区': 'とくべつく', '町村': 'ちょうそん', '厚生労働省': 'こうせいろうどうしょう', '厚労省': 'こうろうしょう',
    '文部科学省': 'もんぶかがくしょう', 'こども家庭庁': 'こどもかていちょう', '家庭庁': 'かていちょう', '内閣府': 'ないかくふ',
    '国土交通省': 'こくどこうつうしょう', '国土地理院': 'こくどちりいん', '国土数値情報': 'こくどすうちじょうほう',
    '行政区域': 'ぎょうせいくいき', '警察': 'けいさつ', '警察庁': 'けいさつちょう', '警察相談専用電話': 'けいさつそうだんせんようでんわ',
    '救急': 'きゅうきゅう', '救急車': 'きゅうきゅうしゃ', '消防': 'しょうぼう', '東京労働局': 'とうきょうろうどうきょく',
    '労働局': 'ろうどうきょく', '日本年金機構': 'にほんねんきんきこう', '日本財団': 'にっぽんざいだん',
    '東京都': 'とうきょうと', '東京': 'とうきょう', '都内': 'とない', '東京都内': 'とうきょうとない', '都営': 'とえい',
    '東京都福祉局': 'とうきょうとふくしきょく', '福祉局': 'ふくしきょく', '東京都住宅政策本部': 'とうきょうとじゅうたくせいさくほんぶ',
    '東京都産業労働局': 'とうきょうとさんぎょうろうどうきょく', '産業労働局': 'さんぎょうろうどうきょく', '令和': 'れいわ', '年度': 'ねんど',

    /* ---------- 東京の区市町村（62） ---------- */
    '千代田区': 'ちよだく', '中央区': 'ちゅうおうく', '港区': 'みなとく', '新宿区': 'しんじゅくく', '文京区': 'ぶんきょうく',
    '台東区': 'たいとうく', '墨田区': 'すみだく', '江東区': 'こうとうく', '品川区': 'しながわく', '目黒区': 'めぐろく',
    '大田区': 'おおたく', '世田谷区': 'せたがやく', '渋谷区': 'しぶやく', '中野区': 'なかのく', '杉並区': 'すぎなみく',
    '豊島区': 'としまく', '北区': 'きたく', '荒川区': 'あらかわく', '板橋区': 'いたばしく', '練馬区': 'ねりまく',
    '足立区': 'あだちく', '葛飾区': 'かつしかく', '江戸川区': 'えどがわく',
    '八王子市': 'はちおうじし', '立川市': 'たちかわし', '武蔵野市': 'むさしのし', '三鷹市': 'みたかし', '青梅市': 'おうめし',
    '府中市': 'ふちゅうし', '昭島市': 'あきしまし', '調布市': 'ちょうふし', '町田市': 'まちだし', '小金井市': 'こがねいし',
    '小平市': 'こだいらし', '日野市': 'ひのし', '東村山市': 'ひがしむらやまし', '国分寺市': 'こくぶんじし', '国立市': 'くにたちし',
    '福生市': 'ふっさし', '狛江市': 'こまえし', '東大和市': 'ひがしやまとし', '清瀬市': 'きよせし', '東久留米市': 'ひがしくるめし',
    '武蔵村山市': 'むさしむらやまし', '多摩市': 'たまし', '稲城市': 'いなぎし', '羽村市': 'はむらし', 'あきる野市': 'あきるのし',
    '西東京市': 'にしとうきょうし', '瑞穂町': 'みずほまち', '日の出町': 'ひのでまち', '檜原村': 'ひのはらむら', '奥多摩町': 'おくたままち',
    '大島町': 'おおしままち', '利島村': 'としまむら', '新島村': 'にいじまむら', '神津島村': 'こうづしまむら', '三宅村': 'みやけむら',
    '御蔵島村': 'みくらじまむら', '八丈町': 'はちじょうまち', '青ヶ島村': 'あおがしまむら', '小笠原村': 'おがさわらむら',
    /* without suffix (only unambiguous ones) */
    '千代田': 'ちよだ', '新宿': 'しんじゅく', '文京': 'ぶんきょう', '台東': 'たいとう', '墨田': 'すみだ', '江東': 'こうとう',
    '品川': 'しながわ', '目黒': 'めぐろ', '世田谷': 'せたがや', '渋谷': 'しぶや', '中野': 'なかの', '杉並': 'すぎなみ',
    '豊島': 'としま', '荒川': 'あらかわ', '板橋': 'いたばし', '練馬': 'ねりま', '足立': 'あだち', '葛飾': 'かつしか',
    '江戸川': 'えどがわ', '八王子': 'はちおうじ', '立川': 'たちかわ', '武蔵野': 'むさしの', '三鷹': 'みたか', '青梅': 'おうめ',
    '昭島': 'あきしま', '調布': 'ちょうふ', '町田': 'まちだ', '小金井': 'こがねい', '東村山': 'ひがしむらやま', '国分寺': 'こくぶんじ',
    '福生': 'ふっさ', '狛江': 'こまえ', '東大和': 'ひがしやまと', '清瀬': 'きよせ', '東久留米': 'ひがしくるめ', '武蔵村山': 'むさしむらやま',
    '稲城': 'いなぎ', '羽村': 'はむら', '西東京': 'にしとうきょう', '奥多摩': 'おくたま', '多摩': 'たま', '西多摩': 'にしたま',
    '多摩地域': 'たまちいき', '島しょ': 'とうしょ', '二十三区': 'にじゅうさんく',
    /* places that appear in addresses / station names */
    '飯田橋': 'いいだばし', '高田馬場': 'たかだのばば', '池袋': 'いけぶくろ', '秋葉原': 'あきはばら', '下北沢': 'しもきたざわ',
    '三軒茶屋': 'さんげんぢゃや', '西新宿': 'にししんじゅく', '新宿駅': 'しんじゅくえき', '西口': 'にしぐち', '東口': 'ひがしぐち',
    '小岩': 'こいわ', '葛西': 'かさい', '田無': 'たなし', '保谷': 'ほうや', '立石': 'たていし', '柴崎町': 'しばさきちょう',
    '西国立': 'にしくにたち', '南武線': 'なんぶせん', '最寄り駅': 'もよりえき'
  };
  /* v3 (round 2): learning cards, 中学生 track, 中学生 programs.
     Okurigana stems (返さ, 使っ, 払い…) are listed as kanji + kana so every form gets the reading.
     Rendaku words (後払い, ひとり暮らし, 前借り) are listed whole so the longer key wins. */
  var R2 = {
    /* ---------- learn: money words ---------- */
    '勉強': 'べんきょう', '勉強会': 'べんきょうかい', '約束': 'やくそく', '口約束': 'くちやくそく', '保護者': 'ほごしゃ', '奨学': 'しょうがく',
    '奨学給付金': 'しょうがくきゅうふきん', '第一種': 'だいいっしゅ', '第二種': 'だいにしゅ', '第一種奨学金': 'だいいっしゅしょうがくきん', '第二種奨学金': 'だいにしゅしょうがくきん',
    '貸与': 'たいよ', '貸与型': 'たいよがた', '給付型': 'きゅうふがた', '返還': 'へんかん', '期限': 'きげん', '月末': 'げつまつ', '変動費': 'へんどうひ',
    '固定費': 'こていひ', '額面': 'がくめん', '月給': 'げっきゅう', '年収': 'ねんしゅう', '月額': 'げつがく', '年額': 'ねんがく', '定額': 'ていがく', '同額': 'どうがく',
    '半額': 'はんがく', '高額': 'こうがく', '差額': 'さがく', '総額': 'そうがく', '合計': 'ごうけい', '平均': 'へいきん', '貯蓄': 'ちょちく', '預金': 'よきん',
    '家計簿': 'かけいぼ', '家計急変': 'かけいきゅうへん', '急変': 'きゅうへん', '残高': 'ざんだか', '振込': 'ふりこみ', '振り込み': 'ふりこみ', '振り込む': 'ふりこむ',
    '振り込ま': 'ふりこま', '振り込め': 'ふりこめ', '振替': 'ふりかえ', '振替依頼書': 'ふりかえいらいしょ', '引き落とし': 'ひきおとし', '口座振替': 'こうざふりかえ',
    '銀行': 'ぎんこう', '現金': 'げんきん', '財布': 'さいふ', '仕送り': 'しおくり', '延滞': 'えんたい', '延滞金': 'えんたいきん', '多重債務': 'たじゅうさいむ',
    '債務': 'さいむ', '債務整理': 'さいむせいり', '整理': 'せいり', '利率': 'りりつ', '金利': 'きんり', '実質': 'じっしつ', '実質年率': 'じっしつねんりつ',
    '融資': 'ゆうし', '個人': 'こじん', '個人間融資': 'こじんかんゆうし', '闇バイト': 'やみばいと', '闇金': 'やみきん', '金融': 'きんゆう', '金融庁': 'きんゆうちょう',
    '金融機関': 'きんゆうきかん', '法外': 'ほうがい', '違法': 'いほう', '違反': 'いはん', '悪用': 'あくよう', '信用': 'しんよう', '信用情報': 'しんようじょうほう',
    '管理': 'かんり', '日用品': 'にちようひん', '最大': 'さいだい', '最低': 'さいてい', '基本': 'きほん', '基礎': 'きそ', '控除': 'こうじょ', '基礎控除': 'きそこうじょ',
    '給与所得控除': 'きゅうよしょとくこうじょ', '課税': 'かぜい', '課税証明書': 'かぜいしょうめいしょ', '消費税': 'しょうひぜい', '税込': 'ぜいこみ', '源泉徴収': 'げんせんちょうしゅう',
    '源泉徴収票': 'げんせんちょうしゅうひょう', '年末': 'ねんまつ', '年末調整': 'ねんまつちょうせい', '還付': 'かんぷ', '還付申告': 'かんぷしんこく', '社会保険': 'しゃかいほけん',
    '社会保険料': 'しゃかいほけんりょう', '厚生年金': 'こうせいねんきん', '保険料率': 'ほけんりょうりつ', '料率': 'りょうりつ', '会社員': 'かいしゃいん', '加入': 'かにゅう',
    '老後': 'ろうご', '遺族年金': 'いぞくねんきん', '支援金': 'しえんきん', '子ども・子育て支援金': 'こども・こそだてしえんきん', '後払い': 'あとばらい', '同時払い': 'どうじばらい',
    '一括払い': 'いっかつばらい', '分割払い': 'ぶんかつばらい', '定額払い': 'ていがくばらい', 'リボ払い': 'りぼばらい', '一括': 'いっかつ', '分割': 'ぶんかつ',
    '未払い': 'みばらい', '前借り': 'まえがり', '手数料率': 'てすうりょうりつ', 'レンタル料': 'れんたるりょう', '計算例': 'けいさんれい', '例外': 'れいがい',
    '例えば': 'たとえば', 'の例': 'のれい', '例では': 'れいでは', '例です': 'れいです', '項目': 'こうもく', '自炊': 'じすい', '出費': 'しゅっぴ',
    '修理代': 'しゅうりだい', 'お礼': 'おれい', '承諾': 'しょうだく', '入居': 'にゅうきょ', '精算': 'せいさん', '負担': 'ふたん', '特約': 'とくやく', '写真': 'しゃしん',
    '成績': 'せいせき', '自宅': 'じたく', '自宅外': 'じたくがい', '時期': 'じき', '道路': 'どうろ', '様子': 'ようす', '新聞配達': 'しんぶんはいたつ', '配達': 'はいたつ',
    '監督署': 'かんとくしょ', '労働基準監督署': 'ろうどうきじゅんかんとくしょ', '労働基準法': 'ろうどうきじゅんほう', '年少者': 'ねんしょうしゃ', '許可': 'きょか', '深夜': 'しんや',
    '将来': 'しょうらい', '求人票': 'きゅうじんひょう', '意欲': 'いよく', '成立': 'せいりつ', '簡単': 'かんたん', '未成年': 'みせいねん', '未成年者': 'みせいねんしゃ',
    '未成年者取消権': 'みせいねんしゃとりけしけん', '取消権': 'とりけしけん', '取り消し': 'とりけし', '取り消せ': 'とりけせ', '取り消す': 'とりけす', '取消': 'とりけし',
    '注意': 'ちゅうい', '注意点': 'ちゅういてん', '翌月': 'よくげつ', '翌日': 'よくじつ', '翌年': 'よくねん', '大変': 'たいへん', '勝手': 'かって', '簡易': 'かんい',
    '自動': 'じどう', '見える化': 'みえるか',
    /* ---------- lesson extras ---------- */
    '役わり': 'やくわり', '役割': 'やくわり', '役立': 'やくだ', '仲介': 'ちゅうかい', '仲が': 'なかが', '仲の': 'なかの', '仲よし': 'なかよし', '仲良し': 'なかよし',
    '特別': 'とくべつ', '区別': 'くべつ', '差別': 'さべつ', '交代': 'こうたい', '都合': 'つごう', '都度': 'つど', '生命': 'せいめい', '命令': 'めいれい',
    '命や': 'いのちや', '命を': 'いのちを', '命が': 'いのちが', '命の': 'いのちの', '命に': 'いのちに',
    /* ---------- education ---------- */
    '塾の': 'じゅくの', '塾に': 'じゅくに', '塾と': 'じゅくと', '塾など': 'じゅくなど', '塾へ': 'じゅくへ', '塾は': 'じゅくは', '塾を': 'じゅくを', '塾で': 'じゅくで',
    '塾や': 'じゅくや', '塾が': 'じゅくが', '塾も': 'じゅくも', '学習塾': 'がくしゅうじゅく', '進学塾': 'しんがくじゅく', '学習支援': 'がくしゅうしえん', '公立': 'こうりつ',
    '都立': 'とりつ', '都立高校': 'とりつこうこう', '都立学校': 'とりつがっこう', '区立': 'くりつ', '市立': 'しりつ', '私学': 'しがく', '私学財団': 'しがくざいだん',
    '東京都私学財団': 'とうきょうとしがくざいだん', '国立大学': 'こくりつだいがく', '教育': 'きょういく', '教育委員会': 'きょういくいいんかい', '都教育委員会': 'ときょういくいいんかい',
    '教育相談': 'きょういくそうだん', '学校教育': 'がっこうきょういく', '給食': 'きゅうしょく', '給食費': 'きゅうしょくひ', '修学旅行': 'しゅうがくりょこう',
    '修学旅行費': 'しゅうがくりょこうひ', '見学旅行費': 'けんがくりょこうひ', '旅行費': 'りょこうひ', '学用品': 'がくようひん', '学用品費': 'がくようひんひ', '就学': 'しゅうがく',
    '就学援助': 'しゅうがくえんじょ', '制服': 'せいふく', '定期': 'ていき', '定期代': 'ていきだい', '定期券': 'ていきけん', '授業': 'じゅぎょう', '入試': 'にゅうし',
    '担任': 'たんにん', '学校説明会': 'がっこうせつめいかい', '説明会': 'せつめいかい', '説明': 'せつめい', '体験入学': 'たいけんにゅうがく', '校則': 'こうそく',
    '願書': 'がんしょ', '入学料': 'にゅうがくりょう', '受講料': 'じゅこうりょう', '発表': 'はっぴょう', '合格発表': 'ごうかくはっぴょう',
    '受験生チャレンジ支援貸付': 'じゅけんせいちゃれんじしえんかしつけ', '模試': 'もし', '検定試験': 'けんていしけん', '試験': 'しけん', '部活': 'ぶかつ', '宿題': 'しゅくだい',
    '自習': 'じしゅう', '進級': 'しんきゅう', '指導': 'しどう', '教材': 'きょうざい', '端末': 'たんまつ', '事務室': 'じむしつ', '在校生': 'ざいこうせい',
    '生徒証': 'せいとしょう', '中等教育学校': 'ちゅうとうきょういくがっこう', '後期課程': 'こうきかてい', '高等課程': 'こうとうかてい', '課程': 'かてい', '高等部': 'こうとうぶ',
    '特別支援学校': 'とくべつしえんがっこう', '特別支援': 'とくべつしえん', '専修学校': 'せんしゅうがっこう', '高等学校': 'こうとうがっこう', '高等専門学校': 'こうとうせんもんがっこう',
    '浪人': 'ろうにん', '高校生世代': 'こうこうせいせだい', '世代': 'せだい', '環境': 'かんきょう', '弁当': 'べんとう', '二次元': 'にじげん', '準要保護': 'じゅんようほご',
    '要保護': 'ようほご',
    /* ---------- centres / offices ---------- */
    '子供家庭支援センター': 'こどもかていしえんせんたー', '子ども家庭支援センター': 'こどもかていしえんせんたー', '子ども家庭総合センター': 'こどもかていそうごうせんたー',
    '児童相談センター': 'じどうそうだんせんたー', '消費生活センター': 'しょうひせいかつせんたー', '総合': 'そうごう', '総合支所': 'そうごうししょ', '法務局': 'ほうむきょく',
    '法務省': 'ほうむしょう', '人権': 'じんけん', '人権擁護委員': 'じんけんようごいいん', '委員': 'いいん', '全員': 'ぜんいん', '定員': 'ていいん', '支援員': 'しえんいん',
    '推進課': 'すいしんか', '総務課': 'そうむか', '支援課': 'しえんか', '庶務': 'しょむ', '民生': 'みんせい', '経営企画室': 'けいえいきかくしつ', '保護司': 'ほごし',
    '養育': 'よういく', '促進': 'そくしん', '自立促進': 'じりつそくしん', '共生': 'きょうせい', '訪問': 'ほうもん', '来所': 'らいしょ', 'か所': 'かしょ',
    'カ所': 'かしょ', '箇所': 'かしょ', '事務所': 'じむしょ', '役場': 'やくば', '中央': 'ちゅうおう', '東部': 'とうぶ', '西部': 'せいぶ', '南部': 'なんぶ',
    '北部': 'ほくぶ', '蒲田': 'かまた', '北沢': 'きたざわ', '烏山': 'からすやま', '日本堤': 'にほんづつみ', '韓国語': 'かんこくご', '通訳': 'つうやく',
    '時間帯': 'じかんたい', '体罰': 'たいばつ', '秘密': 'ひみつ', '性被害': 'せいひがい', '被害': 'ひがい', '悪口': 'わるぐち', '無理': 'むり', '無理やり': 'むりやり',
    '正座': 'せいざ', '解決': 'かいけつ', '配布': 'はいふ', '収集台紙': 'しゅうしゅうだいし', '早期': 'そうき', '通常': 'つうじょう', '終了': 'しゅうりょう',
    '自由': 'じゆう', '上乗せ': 'うわのせ', '制限': 'せいげん', '両方': 'りょうほう', '実際': 'じっさい', '上旬': 'じょうじゅん', '中旬': 'ちゅうじゅん',
    '下旬': 'げじゅん', '借用書': 'しゃくようしょ', '共通': 'きょうつう', '直接': 'ちょくせつ', '写し': 'うつし', '問い合わせ': 'といあわせ', '問い': 'とい',
    '在留': 'ざいりゅう', '国籍': 'こくせき', '日本国籍': 'にほんこくせき', '高等学校等': 'こうとうがっこうとう',
    /* ---------- okurigana stems ---------- */
    '返さ': 'かえさ', '返し': 'かえし', '返せ': 'かえせ', '返っ': 'かえっ', '返る': 'かえる', '借り': 'かり', '貸し': 'かし', '貸さ': 'かさ', '貸す': 'かす',
    '貸せ': 'かせ', '払い': 'はらい', '払わ': 'はらわ', '払え': 'はらえ', '払っ': 'はらっ', '払お': 'はらお', '決ま': 'きま', '決め': 'きめ', '確か': 'たしか',
    '使っ': 'つかっ', '使い': 'つかい', '使え': 'つかえ', '使わ': 'つかわ', '使お': 'つかお', '守る': 'まもる', '守ら': 'まもら', '守り': 'まもり',
    '守れ': 'まもれ', '守っ': 'まもっ', '残り': 'のこり', '残っ': 'のこっ', '残し': 'のこし', '残る': 'のこる', '残ら': 'のこら', '変わ': 'かわ', '変え': 'かえ',
    '代わ': 'かわ', '暮らし': 'くらし', '暮らす': 'くらす', '暮らせ': 'くらせ', 'ひとり暮らし': 'ひとりぐらし', '一人暮らし': 'ひとりぐらし', '受け': 'うけ',
    '受け取り': 'うけとり', '受け取れ': 'うけとれ', '送る': 'おくる', '送っ': 'おくっ', '送ら': 'おくら', '送れ': 'おくれ', '送り': 'おくり', '働い': 'はたらい',
    '働き': 'はたらき', '働け': 'はたらけ', '働か': 'はたらか', '共働き': 'ともばたらき', '減ら': 'へら', '減っ': 'へっ', '減り': 'へり', '減る': 'へる',
    '戻っ': 'もどっ', '戻る': 'もどる', '戻す': 'もどす', '戻せ': 'もどせ', '戻り': 'もどり', '選べ': 'えらべ', '選び': 'えらび', '選ん': 'えらん',
    '撮る': 'とる', '撮っ': 'とっ', '撮り': 'とり', '届き': 'とどき', '届け': 'とどけ', '忘れ': 'わすれ', '苦し': 'くるし', '抱え': 'かかえ', '頼ま': 'たのま',
    '頼む': 'たのむ', '頼み': 'たのみ', '頼ん': 'たのん', '頼れ': 'たよれ', '頼り': 'たより', '頼っ': 'たよっ', '渡す': 'わたす', '渡し': 'わたし',
    '渡さ': 'わたさ', '脅さ': 'おどさ', '脅し': 'おどし', '脅す': 'おどす', '困っ': 'こまっ', '終わ': 'おわ', '終え': 'おえ', '続き': 'つづき', '続く': 'つづく',
    '続け': 'つづけ', '始ま': 'はじま', '始め': 'はじめ', '迷っ': 'まよっ', '迷う': 'まよう', '迷わ': 'まよわ', '低い': 'ひくい', '低く': 'ひくく',
    '短い': 'みじかい', '急ぐ': 'いそぐ', '急い': 'いそい', '急な': 'きゅうな', '急に': 'きゅうに', '捨て': 'すて', '汚し': 'よごし', '汚れ': 'よごれ',
    '汚さ': 'よごさ', '助か': 'たすか', '埋め': 'うめ', '預け': 'あずけ', '預か': 'あずか', '効き': 'きき', '効く': 'きく', '待っ': 'まっ', '待た': 'また',
    '待ち': 'まち', '認め': 'みとめ', '亡くな': 'なくな', '支え': 'ささえ', '放っ': 'ほうっ', '替え': 'かえ', '付け': 'つけ', '付い': 'つい', '付き': 'つき',
    '危ない': 'あぶない', '危な': 'あぶな', '伝え': 'つたえ', '伝わ': 'つたわ', '手伝': 'てつだ', '取り': 'とり', '取っ': 'とっ', '取れ': 'とれ', '取ら': 'とら',
    '取る': 'とる', '消し': 'けし', '消せ': 'けせ', '消さ': 'けさ', '消え': 'きえ', '落とし': 'おとし', '落とさ': 'おとさ', '落ち': 'おち', '込ま': 'こま',
    '込ん': 'こん', '込み': 'こみ', '込め': 'こめ', '申し': 'もうし', '申し込め': 'もうしこめ', '悪い': 'わるい', '悪く': 'わるく', '悪さ': 'わるさ',
    '安く': 'やすく', '必ず': 'かならず', '次の': 'つぎの', '次は': 'つぎは', '次に': 'つぎに', '次も': 'つぎも', '別の': 'べつの', '別に': 'べつに',
    '別で': 'べつで', '差が': 'さが', '差は': 'さは', '似て': 'にて', '似た': 'にた', '遊び': 'あそび', '遊ぶ': 'あそぶ', '遊べ': 'あそべ', '過ご': 'すご',
    '過ぎ': 'すぎ', '配ら': 'くばら', '配る': 'くばる', '配っ': 'くばっ', '悩ん': 'なやん', '悩み': 'なやみ', '悩む': 'なやむ', '違い': 'ちがい',
    '違う': 'ちがう', '違っ': 'ちがっ', '誰か': 'だれか', '誰に': 'だれに', '誰でも': 'だれでも', '誰も': 'だれも', '探せ': 'さがせ', '探し': 'さがし',
    '泊ま': 'とま', '泊め': 'とめ', '眠れ': 'ねむれ', '眠る': 'ねむる', '動い': 'うごい', '動く': 'うごく', '向け': 'むけ',
    /* ---------- single kanji with particles (always the same reading) ---------- */
    '服を': 'ふくを', '服や': 'ふくや', '服が': 'ふくが', '服の': 'ふくの', 'の服': 'のふく', '区の': 'くの', '区で': 'くで', '区に': 'くに', '区は': 'くは',
    '区が': 'くが', '区内': 'くない', '都の': 'との', '都が': 'とが', '都で': 'とで', '都は': 'とは', '都に': 'とに', '額が': 'がくが', '額の': 'がくの',
    '額は': 'がくは', '額だけ': 'がくだけ', '額で': 'がくで', '額を': 'がくを', '額も': 'がくも', '代は': 'だいは', '代と': 'だいと', '代を': 'だいを',
    '代など': 'だいなど', '代や': 'だいや', '代の': 'だいの', '代が': 'だいが', '代も': 'だいも', 'ごはん代': 'ごはんだい', '引っ越し代': 'ひっこしだい',
    '引っこし代': 'ひっこしだい', 'バイト代': 'ばいとだい', 'スマホ代': 'すまほだい', 'ガス代': 'がすだい', '食事代': 'しょくじだい',
    /* ---------- safety overrides (stop a stem from giving the wrong reading inside these) ---------- */
    '気付き': 'きづき', '気付い': 'きづい', '気付く': 'きづく', '気付か': 'きづか', '片付け': 'かたづけ', '片付い': 'かたづい', '着替え': 'きがえ', '両替': 'りょうがえ',
    '為替': 'かわせ', '正確': 'せいかく', '確実': 'かくじつ', '確定': 'かくてい', '明確': 'めいかく', '確率': 'かくりつ', '寿命': 'じゅみょう',
    '一生懸命': 'いっしょうけんめい', '懸命': 'けんめい', '救命': 'きゅうめい', '月払い': 'つきばらい', '年払い': 'ねんばらい', '日払い': 'ひばらい', '先払い': 'さきばらい',
    '二人暮らし': 'ふたりぐらし', 'ふたり暮らし': 'ふたりぐらし', '所得割': 'しょとくわり', '均等割': 'きんとうわり', 'その他': 'そのた', '他の': 'ほかの', '何歳': 'なんさい',
    /* ---------- program office names (中学生 records) ---------- */
    '洋服': 'ようふく', '依頼書': 'いらいしょ', '相談係': 'そうだんがかり', '支援係': 'しえんがかり', '民生係': 'みんせいがかり', '管理係': 'かんりがかり',
    '推進係': 'すいしんがかり', '児童福祉司': 'じどうふくしし', '福祉司': 'ふくしし', '専門員': 'せんもんいん', '高校等': 'こうこうとう', '高校生等': 'こうこうせいとう',
    '学校等': 'がっこうとう', 'まなび塾': 'まなびじゅく', '夢に': 'ゆめに', '夢を': 'ゆめを', '夢の': 'ゆめの', '夢が': 'ゆめが', '修学支援': 'しゅうがくしえん',
    '未来部': 'みらいぶ', '私の': 'わたしの', '私は': 'わたしは', '私が': 'わたしが', '私に': 'わたしに', '私も': 'わたしも', '東京都立': 'とうきょうとりつ',
    '保護課': 'ほごか', '第一課': 'だいいっか', '第二課': 'だいにか', '相談課': 'そうだんか', '福祉課': 'ふくしか', '措置費': 'そちひ', '施設費': 'しせつひ',
    'の件': 'のけん',
    /* ---------- more safety overrides ---------- */
    '解消': 'かいしょう', '消費': 'しょうひ', '消化': 'しょうか', '消防署': 'しょうぼうしょ', '抹消': 'まっしょう', '消毒': 'しょうどく', '譲渡': 'じょうと',
    '振り替え': 'ふりかえ', '日付け': 'ひづけ', '受付け': 'うけつけ', '取消し': 'とりけし',
    /* ---------- data fixes (round 2): 都立のオンライン申請・給付金の時期 ---------- */
    '通知書': 'つうちしょ', '利用開始': 'りようかいし', '開始': 'かいし', '基準日': 'きじゅんび', '早期給付': 'そうききゅうふ',
    '一部早期給付': 'いちぶそうききゅうふ', '印鑑登録証明書': 'いんかんとうろくしょうめいしょ', '合計所得': 'ごうけいしょとく',
    '経理担当': 'けいりたんとう', '特別支援教育課': 'とくべつしえんきょういくか'
  };
  Object.keys(R2).forEach(function (k) { if (!R[k]) R[k] = R2[k]; });
  // drop accidental single-kanji keys (they cause wrong readings inside other words)
  Object.keys(R).forEach(function (k) {
    if (k.replace(/[^㐀-鿿々ヶ]/g, '').length < 2 && !/[ぁ-んァ-ン]/.test(k)) delete R[k];
  });
  // number + counter: a digit in front makes these one-kanji keys safe (18歳, 約3万円, 1.1倍, 4階)
  var NUM = { '歳': 'さい', '倍': 'ばい', '割': 'わり', '件': 'けん', '枚': 'まい', '個': 'こ', '階': 'かい' };
  for (var d = 0; d <= 9; d++) {
    Object.keys(NUM).forEach(function (c) { R[d + c] = d + NUM[c]; });
    R['約' + d] = 'やく' + d;
    R['第' + d] = 'だい' + d;
  }
  R['3階'] = '3がい';
  SM.data.ruby = SM.data.ruby || {};
  Object.keys(R).forEach(function (k) { SM.data.ruby[k] = R[k]; });
})();
;
/* ---- js/match.js ---- */
/* 巣立ちマップ v5 — match.js (FIND)
   v5: answer labels follow the shorter question options (SPEC-v5 Part B 質問: options ≤ 10 chars); scoring unchanged.
   SM.match(answers)        -> [{ p, score, why:[{ja,jr?,en}], group, local, careNote }] sorted by fit
   SM.matchSummary(answers) -> [{ key, q, label, set }] for the answers bar (all 6 questions, in order)
   Helpers also used by the find view (additive, not in SPEC):
   SM.matchUtil = { norm, bands, labels, nowOpen, isFree, nearby, deadlineRank, EFFORT, inTokyo, isWard,
                    audienceOf, urgentIds, isJunior, effPath, jrOk }
   why lines are {ja, jr?, en} plus an optional kind: 'for' (who the service is for → shown as 「対象」)
   or 'note' (a tip → shown as 「ポイント」); plain lines are reasons (「理由」).
   v3 / SPEC-v3 §3 — 中学生 (stage jhs12/jhs3 or age a12):
     · a record is hidden when for.age.min > 15, or when its stages do not include jhs12/jhs3 —
       unless stages is [] and the record is open to under-15s (age null, or age.min null/≤14)
     · path 'hs' (高校に行きたい) is the junior form of 'study'; the two map onto each other when the
       stage answer changes, so an old answer never hides everything
     · kind, short why-lines: 「中3で高校に行きたいので」「中学生も相談できるので」「高校に入る前に知っておくと安心なので」
   Tag-based scoring. Nothing here touches the network or storage. */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};

  function L(o) { return SM.L ? SM.L(o) : (o && (o.ja || o)) || ''; }
  function lang() { try { return SM.lang ? SM.lang() : 'ja'; } catch (e) { return 'ja'; } }
  function areaOf(code) { try { return SM.area ? SM.area(code) : null; } catch (e) { return null; } }

  /* ---------------- answer labels (shared with find.js) ---------------- */
  var LABELS = {
    stage: {
      jhs12: { ja: '中1・中2', en: 'Junior high yr 1–2' },
      jhs3: { ja: '中3', en: 'Junior high yr 3' },
      hs12: { ja: '高1・高2', en: 'High school yr 1–2' },
      hs3: { ja: '高3', en: 'High school yr 3' },
      left0: { ja: '巣立って1年以内', en: 'Left care < 1 year ago' },
      left1: { ja: '巣立って1年以上', en: 'Left care 1+ years ago' },
      nohs: { ja: '高校に行っていない', en: 'Not in high school' }
    },
    stageShort: {
      jhs12: { ja: '中1・中2', en: 'JHS yr 1–2' }, jhs3: { ja: '中3', en: 'JHS yr 3' },
      hs12: { ja: '高1・高2', en: 'HS yr 1–2' }, hs3: { ja: '高3', en: 'HS yr 3' },
      left0: { ja: '巣立って1年以内', en: 'Left < 1 yr' }, left1: { ja: '巣立って1年以上', en: 'Left 1+ yrs' },
      nohs: { ja: '高校に行っていない', en: 'Not in HS' }
    },
    path: {
      hs: { ja: '高校に行きたい', en: 'Want to go to high school' },
      study: { ja: '進学したい', en: 'Want to study' },
      work: { ja: '働きたい', en: 'Work' },
      unsure: { ja: 'まだ決めていない', en: 'Not decided yet' }
    },
    age: {
      a12: { ja: '12〜14歳', en: '12–14' },
      a15: { ja: '15〜17歳', en: '15–17' }, a18: { ja: '18〜19歳', en: '18–19' },
      a20: { ja: '20〜22歳', en: '20–22' }, a23: { ja: '23歳以上', en: '23+' }
    },
    care: {
      facility: { ja: '児童養護施設', en: "Children's home" },
      foster: { ja: '里親・ファミリーホーム', en: 'Foster / family home' },
      jhome: { ja: '自立援助ホーム', en: 'Independence home' },
      other: { ja: 'そのほか', en: 'Other' },
      skip: { ja: '答えない', en: 'Prefer not to say' }
    }
  };
  var BANDS = { a12: [12, 14], a15: [15, 17], a18: [18, 19], a20: [20, 22], a23: [23, 30] };
  var JR_STAGES = { jhs12: 1, jhs3: 1 };
  // 中学生? Core's SM.isJunior when present (same rule), so the view and the matcher always agree.
  function isJunior(a) {
    a = a || {};
    if (SM.isJunior) { try { return !!SM.isJunior(a); } catch (e) { } }
    return !!JR_STAGES[a.stage] || a.age === 'a12';
  }
  // 'hs' (高校に行きたい) is the junior form of 'study' (進学したい): map so an answer given under
  // one stage still means the same thing after the stage changes.
  function effPath(a) {
    var p = (a || {}).path || null;
    if (isJunior(a)) return p === 'study' ? 'hs' : p;
    return p === 'hs' ? 'study' : p;
  }
  var EFFORT = { low: 0, mid: 1, high: 2 };
  var CARE_YES = { facility: 1, foster: 1, jhome: 1, other: 1 };
  var CAT_ORDER = ['housing', 'money', 'education', 'work', 'procedures', 'consult'];
  function catOrder() { return SM.CAT_ORDER || CAT_ORDER; }
  function catLabel(k) {
    var c = SM.CATS && SM.CATS[k];
    if (!c) return { ja: k, en: k };
    return { ja: c.ja, en: c.en };
  }

  /* ---------------- text normalisation (search) ---------------- */
  // NFKC (full/half width), lower case, katakana -> hiragana, drop spaces/punctuation that vary.
  function norm(s) {
    s = String(s == null ? '' : s);
    try { s = s.normalize('NFKC'); } catch (e) { }
    s = s.toLowerCase();
    s = s.replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); });
    s = s.replace(/[\s　・･、。,.\-‐－―〜~（）()「」『』【】\u2060]/g, '');
    return s;
  }

  /* ---------------- area helpers ---------------- */
  function isWard(code) { return typeof code === 'string' && /^13\d{3}$/.test(code); }
  function inTokyo(code) { return code === '13' || isWard(code); }

  /* ---------------- deadline helpers ---------------- */
  function nowOpen(p, now) {
    var d = p.deadline;
    if (!d) return true;
    if (d.always) return true;
    if (d.months && d.months.length) {
      var m = (now || new Date()).getMonth() + 1;
      return d.months.indexOf(m) !== -1;
    }
    return false;
  }
  // smaller = sooner. Fixed windows: months until the window opens/closes; relative or open-ended later.
  function deadlineRank(p, now) {
    var d = p.deadline;
    if (!d) return 60;
    if (d.months && d.months.length) {
      var m = (now || new Date()).getMonth() + 1, best = 99;
      d.months.forEach(function (x) { var dist = (x - m + 12) % 12; if (dist < best) best = dist; });
      return best;
    }
    if (typeof d.leaveMonths === 'number') return 20 + Math.max(0, 12 + d.leaveMonths);
    if (d.always) return 50;
    return 40;
  }
  /* F06: money you never pay back, by the same rule as the green 「返さなくていい」 line on every row
     (SM.ui.repayLabel) and the about page's count: repay 'none', or a grant with no repay field. Free counselling
     is not "money you do not pay back", so 返さなくていいだけ / 返さなくていい順 no longer keep (nearly) everything. */
  function isFree(p) {
    if (!p) return false;
    if (p.repay === 'none') return true;
    return !p.repay && p.kind === 'grant';
  }
  function nearby(p, area) {
    var locs = p.locations || [];
    if (!locs.length) return false;
    if (isWard(area)) return locs.some(function (l) { return l && String(l.area) === area; });
    return locs.some(function (l) { return l && (inTokyo(String(l.area || '')) || /東京都/.test(l.addr || '')); });
  }

  /* ---------------- why lines ---------------- */
  var STAGE_WHY = {
    jhs12: { ja: '中学生なので', en: "You're in junior high" },
    jhs3: { ja: '中3で、高校受験の年なので', en: "It's your high-school entrance exam year" },
    hs12: { ja: '高校生なので', en: "You're in high school" },
    hs3: { ja: '高3で、今年度に巣立つので', en: "You're leaving care this school year" },
    left0: { ja: '巣立って1年以内なので', en: 'You left care less than a year ago' },
    left1: { ja: '巣立ったあとも使えるので', en: 'You can use it after leaving care' },
    nohs: { ja: '高校に行っていなくても使えるので', en: 'You can use it without high school' }
  };
  var STAGE_PRE = {
    jhs12: { ja: '中学生で', en: "You're in junior high and " },
    jhs3: { ja: '中3で', en: "You're in your last junior high year and " },
    hs12: { ja: '高校生で', en: "You're in high school and " },
    hs3: { ja: '高3で', en: "You're in your last HS year and " },
    left0: { ja: '巣立ったばかりで', en: 'You just left care and ' },
    left1: { ja: '巣立ったあとで', en: 'You have left care and ' }
  };
  var PATH_WHY = {
    hs: { ja: '高校に行きたいので', en: 'want to go to high school' },
    study: { ja: '進学したいので', en: 'want to study' },
    work: { ja: '働きたい・働いているので', en: 'want to work / are working' }
  };
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function wardName(code, en) {
    var a = areaOf(code);
    if (!a) return en ? 'your area' : 'お住まいの地域';
    return en ? (a.en || a.name) : a.name;
  }

  /* ---------------- audience-specific records ---------------- */
  // Records made for one group of people. They rank lower (we never ask about these things)
  // and carry a visible "for whom" line so nobody wonders why a women's centre is in their list.
  var AUDIENCE = {
    'tokyo-josei-center': 'women',
    'tokyo-tmc-navi': 'foreign'
  };
  var AUDIENCE_WHY = {
    women: { ja: '女性のための窓口です', en: 'A service for women' },
    foreign: { ja: '外国にルーツがある人のための窓口です', en: 'For people from other countries' }
  };
  function audienceOf(p) { return p.audience || AUDIENCE[p.id] || null; }
  // 中3 (高校受験の年): the basics every 中3 should know first — exam costs, tuition, school costs
  var JR_BASICS = { 'tokyo-juken-challenge': 1, 'koko-shugaku': 1, 'koko-kyufukin': 1 };
  // 施設・里親家庭・自立援助ホーム: 塾代や受験料は施設（措置費）が出すことが多い — ask staff before a household loan
  var CARE_HOME = { facility: 1, foster: 1, jhome: 1 };
  var CARE_PAID = { 'tokyo-juken-challenge': 1 };
  // 高3で進学したい: the two core schemes for university / 専門学校 money
  var STUDY_BASICS = { 'jasso-kyufu': 1, 'jasso-genmen': 1 };
  function hasJrStage(p) {
    var st = (p && p.for && p.for.stages) || [];
    return st.indexOf('jhs12') !== -1 || st.indexOf('jhs3') !== -1;
  }
  /** SPEC-v3 §3 data rule: may this record be shown to a 中学生 at all? (answers-independent; used by
   *  related lists on program / lesson pages so nothing adult-only leaks to a 中学生) */
  function jrOk(p) {
    if (!p) return false;
    var f = p.for || {};
    var stages = f.stages || [];
    var ag = f.age || null;
    var aMin = ag && ag.min != null ? ag.min : null;
    var hasAge = !!(ag && (ag.min != null || ag.max != null));
    if (aMin != null && aMin > 15) return false;
    if (hasJrStage(p)) return true;
    if (stages.length) return false;
    return !(hasAge && !(aMin == null || aMin <= 14));
  }
  // safety net: the schemes you have a right to when there is no home or money
  var SAFETY_NET = { 'seikatsu-hogo': 1, 'jukyo-kakuho': 1, 'jiritsu-sodan': 1 };
  // "今、住む場所がない・家にいられない" (Q4 urgent): these come first, in this order
  var URGENT_IDS = ['tokyo-challenge-net', 'seikatsu-hogo', 'b4s-line-soudan', 'jiritsu-enjo', 'jiso-189', 'jiritsu-sodan'];
  // 中学生: "家にいられない" means a child-protection call first, never adult housing schemes
  var URGENT_JR = ['jiso-189', 'kodomo-sos', 'tokyo-jisou', 'tokyo-kodomo-net', 'childline', 'b4s-line-soudan'];
  function urgentIds(a) {
    a = a || {};
    if (isJunior(a)) return URGENT_JR.slice();
    var young = a.age === 'a15' || a.stage === 'hs12' || a.stage === 'hs3';
    var adult = a.age === 'a18' || a.age === 'a20' || a.age === 'a23' || a.stage === 'left0' || a.stage === 'left1';
    return URGENT_IDS.filter(function (id) {
      if (id === 'jiso-189') return !adult;          // 189 is for under 18
      if (id === 'seikatsu-hogo') return !young || !!adult;
      return true;
    });
  }

  /* ---------------- core scoring ---------------- */
  var TOKYO_VERSION = { 'jiritsu-shikin': 'tokyo-jiritsu-shikin' };
  SM.tokyoVersion = TOKYO_VERSION;
  function evaluate(p, a) {
    var f = p.for || {};
    var stages = f.stages || [], paths = f.paths || [], cares = f.care || [], areas = f.areas || [];
    var score = 10, why = [], local = false, careNote = false, otherLocal = false;
    var stageHit = false, pathHit = false;
    var junior = isJunior(a);
    var path = effPath(a);
    var jrStage = hasJrStage(p);

    // --- 中学生 (SPEC-v3 §3): nothing made only for older people
    if (junior && !jrOk(p)) return null;

    // --- area rules
    var wardOnly = areas.length > 0 && areas.every(isWard);
    var tokyoAny = areas.indexOf('13') !== -1;
    var area = a.area || null;
    // national record that has its own Tokyo-run version: show only the Tokyo one to people in Tokyo
    if (TOKYO_VERSION[p.id] && area !== 'other' && SM.program && SM.program(TOKYO_VERSION[p.id])) return null;
    if (areas.length) {
      if (area === 'other') return null;                        // Tokyo-only, user lives outside Tokyo
      if (isWard(area)) {
        if (areas.indexOf(area) !== -1) {
          score += 5;
          why.push({ prio: 0.5, w: {
            ja: wardName(area, false) + (a.stage === 'hs12' || a.stage === 'hs3' ? 'に住む予定なので' : 'に住んでいるので'),
            jr: wardName(area, false) + 'に住んでいるので',
            en: 'For people living in ' + wardName(area, true) } });
        } else if (!tokyoAny) return null;                       // another ward's program
        else score += 1;
      } else if (wardOnly) {                                     // area unknown ('13' or null): keep, rank lower
        local = true; score -= 8;
        why.push({ prio: 3, w: {
          ja: areas.map(function (c) { return wardName(c, false); }).join('・') + 'に住む人向け',
          en: 'For people living in ' + areas.map(function (c) { return wardName(c, true); }).join(', ') } });
      } else if (tokyoAny && area === '13') score += 1;
      // a ward/city's own scheme that is open Tokyo-wide (often: people leaving a facility located there)
      if (p.basis === 'local' && !wardOnly && !(isWard(area) && areas.indexOf(area) !== -1)) { score -= 6; otherLocal = true; }
    }

    // --- stage gate (a record that names stages must name this one)
    if (a.stage && stages.length && stages.indexOf(a.stage) === -1) return null;
    // --- path ('hs' also accepts records tagged 'study' that are open to 中学生)
    if (path && paths.length) {
      if (paths.indexOf(path) !== -1 || (path === 'hs' && jrStage && paths.indexOf('study') !== -1)) { pathHit = true; score += 3; }
      else if (path === 'unsure') score -= 2;
      // a 中学生 who wants to work still sees the high-school money: it may change the choice
      else if (junior && path === 'work' && (paths.indexOf('hs') !== -1 || paths.indexOf('study') !== -1)) score -= 2;
      else return null;
    }
    // --- stage score: a full hit when the record is narrow, made for 中学生, or the path also matches
    // (broad records like JASSO 給付 list 5 stages but are exactly what a 高3 who wants to study needs)
    if (a.stage && stages.length) {
      stageHit = stages.length <= 3 || (junior && jrStage) || pathHit; score += stageHit ? 3 : 1;
    }
    // 高3で進学したい: university money first; high-school-entry records (授業料・学習支援, made for 中3〜) step back
    if (a.stage === 'hs3' && path === 'study') {
      if (STUDY_BASICS[p.id]) score += 3;
      else if (stages.indexOf('jhs3') !== -1 && paths.indexOf('study') === -1) score -= 4;
    }
    // --- age band overlap
    var band = BANDS[a.age];
    if (band && a.stage === 'jhs3' && band[1] < 15) band = [band[0], 15];  // 中3: 15 by graduation
    if (band && f.age && (f.age.min != null || f.age.max != null)) {
      var mn = f.age.min == null ? 0 : f.age.min, mx = f.age.max == null ? 999 : f.age.max;
      if (mx < band[0] || mn > band[1]) return null;
      if (mx <= 30) score += 1;
    }
    // --- care
    var care = a.care || null;
    var answeredCare = !!CARE_YES[care];
    if (f.careOnly) {
      if (answeredCare) {
        if (cares.length && cares.indexOf(care) === -1) return null;
        score += 5;
        why.push({ prio: 1, w: care === 'jhome' ?
          { ja: '自立援助ホームにいた人も使えるので', en: 'Open to people from independence support homes' } :
          { ja: '施設や里親家庭で育った人向けなので', en: 'Made for people who grew up in care' } });
      } else {
        careNote = true; score += 1;
        why.push({ prio: 1, w: { ja: '施設や里親家庭で育った人向け', en: 'For people who grew up in care' } });
      }
    } else if (cares.length && answeredCare && cares.indexOf(care) !== -1) {
      score += 3;
      why.push({ prio: 2, w: { ja: '施設や里親家庭で育った人も相談しやすいので', en: 'Welcomes people who grew up in care' } });
    }

    // stage/path why (combined when both are specific). 中学生 get their own, plainer reasons.
    if (junior && jrStage) {
      var cs0 = p.cat || [];
      // high-school money (授業料・給付金など): worth knowing before 入学
      var toHs = cs0.indexOf('education') !== -1 && stages.indexOf('hs12') !== -1 &&
        (cs0.indexOf('money') !== -1 || /^(grant|loan|loan_forgivable|procedure)$/.test(p.kind || ''));
      var careHome = !!CARE_HOME[a.care];
      score += 2 + (pathHit ? 3 : 0) + (JR_BASICS[p.id] && a.stage !== 'jhs12' && !(careHome && CARE_PAID[p.id]) ? 3 : 0);
      // a tip, not a reason: find.js shows kind:'note' lines on their own row (「ポイント」)
      if (careHome && CARE_PAID[p.id]) why.push({ prio: -2, w: { kind: 'note',
        ja: '施設や里親家庭の人は、塾代や受験料を施設が出してくれることが多いです。まず職員に聞こう',
        jr: '施設や里親家庭の人は、塾代や受験料を施設が出してくれることが多いよ。まず職員に聞こう',
        en: 'In a children’s home or foster care, the home often pays cram-school and exam fees. Ask staff first.' } });
      if (pathHit && STAGE_PRE[a.stage] && PATH_WHY[path]) why.push({ prio: 0, w: { ja: STAGE_PRE[a.stage].ja + PATH_WHY[path].ja, en: STAGE_PRE[a.stage].en + PATH_WHY[path].en } });
      else if (cs0[0] === 'consult') why.push({ prio: 0.8, w: { ja: '中学生も相談できるので', en: 'Junior high students can use it too' } });
      else if (toHs) why.push({ prio: 0.8, w: { ja: '高校に入る前に知っておくと安心なので', en: 'Good to know before high school starts' } });
      else if (stages.every(function (s) { return JR_STAGES[s]; })) {
        why.push({ prio: 0, w: stages.indexOf('jhs12') !== -1 ? { ja: '中学生なので', en: "You're in junior high" } : STAGE_WHY.jhs3 });
      } else why.push({ prio: 0.8, w: { ja: '中学生も使えるので', en: 'Open to junior high students' } });
    } else if (stageHit && pathHit && STAGE_PRE[a.stage] && PATH_WHY[path]) {
      why.push({ prio: 0, w: { ja: STAGE_PRE[a.stage].ja + PATH_WHY[path].ja, en: STAGE_PRE[a.stage].en + PATH_WHY[path].en } });
    } else if (pathHit && PATH_WHY[path]) {
      why.push({ prio: 0, w: { ja: PATH_WHY[path].ja, en: cap('you ' + PATH_WHY[path].en) } });
    } else if (stageHit && STAGE_WHY[a.stage]) {
      why.push({ prio: 0, w: STAGE_WHY[a.stage] });
    }

    // --- concerns -> group
    var concerns = (a.concerns || []).filter(function (c) { return catOrder().indexOf(c) !== -1; });
    var cats = p.cat || [];
    var group = null;
    var aud = audienceOf(p);
    // a record joins a group through its main category; a secondary category only counts
    // when it matches a chosen concern and the record is not for one specific group of people
    var asPrimary = false;
    // 中学生 who chose お金: school money (授業料・給付金・受験生チャレンジ, cat [education, money]) is
    // their money — it goes under お金 even when 進学 was chosen too, so お金 is never just a consumer centre
    if (junior && jrStage && concerns.indexOf('money') !== -1 && cats[0] === 'education' && cats.indexOf('money') !== -1) { group = 'money'; asPrimary = true; }
    else if (cats.length && concerns.indexOf(cats[0]) !== -1) group = cats[0];
    else if (!aud) { for (var i = 0; i < concerns.length; i++) { if (cats.indexOf(concerns[i]) > 0) { group = concerns[i]; break; } } }
    if (group) {
      var bonus = cats[0] === group || asPrimary ? 6 : 3;
      // 中学生: records not made for their stage (消費生活センター, 188, TMC Navi…) stay in the list but don't climb
      if (junior && !jrStage) bonus = cats[0] === group ? 2 : 1;
      score += bonus;
      var cl = catLabel(group);
      why.push({ prio: 2, w: { ja: '「' + cl.ja + '」が気になると答えたので', en: 'You said ' + cl.en.toLowerCase() + ' is on your mind' } });
    } else {
      if (concerns.length) score -= 2;
      group = cats[0] || 'procedures';
    }

    // --- small nudges
    if ((p.kind === 'hotline' || p.kind === 'place') && concerns.length && concerns.indexOf('consult') === -1) score -= 1;
    if (p.right) score += 1;
    if (p.repay === 'none' || p.kind === 'grant') score += 1;
    if (aud) {
      score -= 6;
      var aw = AUDIENCE_WHY[aud] || { ja: '', en: '' };
      why.push({ prio: -1, w: { kind: 'for', ja: aw.ja, en: aw.en } });
    }
    // no home + no money after leaving care: the safety-net rights go to the top
    if (SAFETY_NET[p.id] && concerns.indexOf('housing') !== -1 && concerns.indexOf('money') !== -1 &&
        (a.stage === 'left0' || a.stage === 'left1' || a.stage === 'nohs')) {
      score += 7;
      why.push({ prio: 0.2, w: { ja: '住まいとお金の両方が気になると答えたので', en: 'You said both housing and money are on your mind' } });
    }
    if (a.urgent && urgentIds(a).indexOf(p.id) !== -1) score += 8;

    why.sort(function (x, y) { return x.prio - y.prio; });
    return { p: p, score: score, why: why.slice(0, 2).map(function (x) { return x.w; }), group: group, local: local, careNote: careNote, otherLocal: otherLocal, audience: aud };
  }

  function cmp(now) {
    return function (x, y) {
      var tx = Math.floor(x.score / 3), ty = Math.floor(y.score / 3);
      if (tx !== ty) return ty - tx;
      var rx = isFree(x.p) ? 0 : 1, ry = isFree(y.p) ? 0 : 1;
      if (rx !== ry) return rx - ry;
      var ex = EFFORT[x.p.effort] == null ? 1 : EFFORT[x.p.effort], ey = EFFORT[y.p.effort] == null ? 1 : EFFORT[y.p.effort];
      if (ex !== ey) return ex - ey;
      var dx = deadlineRank(x.p, now), dy = deadlineRank(y.p, now);
      if (dx !== dy) return dx - dy;
      if (x.score !== y.score) return y.score - x.score;
      return 0;
    };
  }

  SM.match = function (answers) {
    var a = answers || (SM.state && SM.state.answers) || {};
    var now = new Date();
    var out = [];
    (SM.data.programs || []).forEach(function (p) {
      if (!p || !p.id) return;
      var r = null;
      try { r = evaluate(p, a); } catch (e) { r = null; }
      if (r) out.push(r);
    });
    // stable sort
    out.forEach(function (r, i) { r._i = i; });
    var c = cmp(now);
    out.sort(function (x, y) { return c(x, y) || x._i - y._i; });
    out.forEach(function (r) { delete r._i; });
    return out;
  };

  SM.matchSummary = function (answers) {
    var a = answers || (SM.state && SM.state.answers) || {};
    var en = lang() === 'en';
    function pick(map, v) { return map[v] ? (en ? map[v].en : map[v].ja) : null; }
    var rows = [];
    rows.push({ key: 'stage', q: 1, label: pick(LABELS.stageShort, a.stage), set: !!a.stage });
    var ep = effPath(a);
    rows.push({ key: 'path', q: 2, label: pick(LABELS.path, ep), set: !!ep });
    var al = null;
    if (a.area === '13') al = en ? 'Tokyo (not decided)' : '東京都（未定）';
    else if (a.area === 'other') al = en ? 'Outside Tokyo' : '東京都の外';
    else if (a.area) al = wardName(a.area, en);
    rows.push({ key: 'area', q: 3, label: al, set: !!a.area });
    var cs = (a.concerns || []).map(function (k) { var c = catLabel(k); return en ? c.en : c.ja; });
    if (a.urgent) cs.unshift(en ? 'Nowhere to stay now' : '今いる場所がない');
    rows.push({ key: 'concerns', q: 4, label: cs.length ? cs.join(en ? ', ' : '・') : null, set: cs.length > 0 });
    rows.push({ key: 'age', q: 5, label: pick(LABELS.age, a.age), set: !!a.age });
    var care = a.care && a.care !== 'skip' ? pick(LABELS.care, a.care) : null;
    rows.push({ key: 'care', q: 6, label: care, set: !!care });
    return rows;
  };

  SM.matchUtil = {
    norm: norm, bands: BANDS, labels: LABELS, nowOpen: nowOpen, isFree: isFree, nearby: nearby,
    deadlineRank: deadlineRank, EFFORT: EFFORT, inTokyo: inTokyo, isWard: isWard,
    audienceOf: audienceOf, urgentIds: urgentIds, isJunior: isJunior, effPath: effPath, jrOk: jrOk
  };
})();
;
/* ---- js/views/home.js ---- */
/* 巣立ちマップ v5 — js/views/home.js (HOME)
   Home (#/): the first impression. SPEC-v5 Part A (motion people notice) + Part B (fewer words, better placed).

   First screen (new visitor), read at a glance:
     the `home-hero` picture (the figures walk in) · one sub-line (who it is for) · one headline (「使える支援」が、
     3分でわかる。) · one row of facts set as signage (222件 | ログインなし | 6問・3分) · ONE green CTA (質問に答える) ·
     the crisis link (今夜いる場所がない…, always on the first screen) · then 困りごと: six rows = kanji mark, name,
     count. No tagline, no step list, no sub-labels in buttons, no grey explanation lines (≤ 120 characters above
     the fold at 390×844).
   Returning visitor: the number of supports that fit is the headline, the answers as a tag row with 変える, one CTA.
   Below: 今すぐ話したい (big numbers, call buttons, facts as tags), まなぶ (covers), べんりツール (titles only),
   a one-line band for supporters, the colophon (label / value rows). 中学生: `home-jr-hero`, まなぶ first.

   Motion (SPEC-v5 Part A; transform / opacity only, interruptible, never hides content if JS fails):
   - The hero is a CSS choreography (css/home.css .h-play): home.js adds .h-play when the view is released by the
     opening (SM.motion.whenReleased) or when it mounts. Each part carries its delay (--d); lines rise from behind
     their own baseline, the marker sweeps, the facts step in, the CTA slides up on a spring and its arrow nudges
     once, the crisis link slides in. Without .h-play (no JS, reduced motion, back) everything simply stands.
     A tap or key during the cascade lands it at once (.h-land).
   - 困りごと rows and the section heads are SM.motion reveals with per-row delays: rows rise in order, their kanji
     marks stamp in (css on .m-in), their counts roll (data-count). Sections further down cascade as they scroll in.
   - Tables: 'launch' (the opening hands off: delays count from the release), 'short' (returning beat / first tab
     visit this session), 'none' (reduced motion, back, a tab revisited, in-place re-renders: nothing replays).
   - Render the first screen first: the hero and section 01 render in render(); the rest is built one section per
     idle callback once the transition (or the opening) is over, or all at once on scroll / key / print.
   Fully bilingual via SM.strings; 中学生 copy via the `jr` variant (SM.t picks it while body.is-junior). */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.views = SM.views || {};
  SM.data = SM.data || {};

  function t(k, v) { return SM.t ? SM.t(k, v) : k; }
  function esc(s) { return SM.esc ? SM.esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function L(o) { return SM.L ? SM.L(o) : (o && o.ja) || o || ''; }
  function ic(n, c) { return SM.icon ? SM.icon(n, c) : ''; }
  function en() { try { return SM.lang() === 'en'; } catch (e) { return false; } }
  function junior() {
    try { if (document.body && document.body.classList.contains('is-junior')) return true; } catch (e) { /* ignore */ }
    try { return !!(SM.isJunior && SM.isJunior()); } catch (e) { return false; }
  }
  function arrow(dir) {
    if (SM.ui && SM.ui.arrow) return SM.ui.arrow(dir);
    return '<span class="arrow" aria-hidden="true">' + ({ d: '↓', l: '←' }[dir] || '→') + '</span>';
  }
  function illus(name, o) {
    try { return SM.illus && SM.illus.has && SM.illus.has(name) ? SM.illus(name, o) : ''; } catch (e) { return ''; }
  }
  function reduced() { try { return !!(SM.motion && SM.motion.reduced && SM.motion.reduced()); } catch (e) { return false; } }
  /* a number that is about to roll (first time, or changed since the last visit) is blank while its line or block
     starts to rise, so the reader never sees the final value flash before the board rolls up to it (css: .x-rolls) */
  function rollCls(key, n) {
    if (mode === 'none') return '';
    try { return SM.motion && SM.motion.seen && SM.motion.seen(key) !== n ? ' x-rolls' : ''; } catch (e) { return ''; }
  }

  SM.strings && SM.strings({
    'home.title': { ja: 'ホーム', en: 'Home' },

    /* hero — first visit: one sub-line, one headline, one row of facts, one CTA */
    'home.kicker': { ja: '施設や里親家庭を出る人へ', jr: '施設や里親家庭でくらす中学生へ', en: 'Leaving care in Tokyo?' },
    'home.h1pre': { ja: '「', en: '' },
    'home.h1mark': { ja: '使える支援', en: 'Support you can use,' },
    'home.h1post': { ja: '」が、', en: '' },
    'home.h1c': { ja: '3分でわかる。', en: 'found in 3 minutes.' },
    'home.facts': { ja: 'このサイトについて', en: 'About this site' },
    'home.f.count': { ja: '東京の支援', en: 'programs' },
    'home.f.login': { ja: 'ログインなし', en: 'No login' },
    'home.f.time': { ja: '6問・3分', en: '6 questions' },
    'home.cta': { ja: '質問に答える', en: 'Answer questions' },
    // the one way in for the most urgent case, always on the first screen (FIXER-robust)
    'home.crisis': { ja: '今夜いる場所がない・家にいられない', jr: '家にいられない・帰れないとき', en: 'Nowhere to stay tonight?' },
    'home.unit': { ja: '件', en: '' },

    /* hero — returning visitor */
    'home.backA': { ja: 'あなたに合いそうな支援', en: 'Programs that may fit you' },
    'home.backUnit': { ja: '件', en: '' },
    'home.backNone': { ja: 'あなたの答えで、支援をまとめています。', en: 'Your results are ready.' },
    'home.seeResults': { ja: '結果を見る', en: 'See results' },
    'home.changeAnswers': { ja: '変える', en: 'Change' },
    'home.changeLabel': { ja: '答えを変える', en: 'Change your answers' },
    'home.yourAnswers': { ja: 'あなたの答え', en: 'Your answers' },

    /* やること preview */
    'home.planTitle': { ja: 'やること', en: 'My to-do list' },
    'home.planOpen': { ja: 'ひらく', en: 'Open' },
    'home.planSaved': { ja: '保存 {n}件', en: '{n} saved' },
    'home.planMore': { ja: 'ほか {n}件', en: '+{n} more' },
    'home.daysTo': { ja: '巣立ちの日まで', en: 'Until you leave' },
    'home.daysToEntry': { ja: '高校入学まで', en: 'Until high school starts' },
    'home.daysAssumed': { ja: '仮の日付', en: 'Estimated' },
    'home.daysPre': { ja: 'あと', en: '' },
    'home.daysUnit': { ja: '日', en: 'days' },
    'home.daysToday': { ja: '今日が巣立ちの日。おめでとう。', en: 'Today is your leaving day.' },
    'home.daysSince': { ja: '巣立って {n}日', en: '{n} days since you left' },

    /* まなぶ */
    'home.learnTitle': { ja: 'まなぶ', en: 'Learn' },
    'home.learnAll': { ja: 'すべて見る', en: 'All lessons' },
    'home.learnAllCard': { ja: 'すべてのレッスン', en: 'All lessons' },
    'home.learnDoneLabel': { ja: 'おわった', en: 'done' },
    'home.learnNext': { ja: 'つぎ', en: 'Next' },
    'home.learnFirst': { ja: 'ここから', en: 'Start here' },
    'home.learnMin': { ja: '{n}分', en: '{n} min' },
    'home.learnAllDone': { ja: '全部おわった', en: 'All done' },
    'home.learnDone': { ja: 'おわった', en: 'done' },
    'home.learnDoneMark': { ja: '済', en: '✓' },
    'home.learnFor': { ja: '中学生向け', en: 'Junior high' },
    'home.shelf': { ja: 'レッスンの一覧（横にスクロールできます）', en: 'Lessons (scroll sideways)' },

    /* 困りごと */
    'home.catsTitle': { ja: '困りごとから見る', en: 'Browse by need' },
    'home.catsAll': { ja: 'すべて見る', en: 'See all' },
    'home.count': { ja: '{n}件', en: '{n}' },

    /* 今すぐ話したい */
    'home.talkTitle': { ja: '今すぐ話したい', en: 'Want to talk now?' },
    'home.talkBody': { ja: '名前を言わなくていい', en: "You don't have to give your name" },
    'home.talkMore': { ja: '相談先をもっと見る', en: 'More places to talk' },
    'home.talkSos': { ja: '命や体があぶないとき', en: 'If you are in danger' },
    'home.talkSosBtn': { ja: '緊急の連絡先', en: 'Emergency numbers' },
    'home.callShort': { ja: '電話する', en: 'Call' },
    'home.chatShort': { ja: 'チャット', en: 'Chat' },
    'home.lineShort': { ja: 'LINE', en: 'LINE' },
    'home.free': { ja: '無料', en: 'Free' },
    // facts as tags (split on ・), not sentences
    'home.t.yorisoi': { ja: '24時間・なんでも', en: '24 hours·Anything' },
    'home.t.ibasho': { ja: '24時間・チャット', en: '24 hours·Chat' },
    'home.t.wakanavi': { ja: '東京都・若者向け', en: 'Tokyo·Youth' },
    'home.t.b4s': { ja: '施設・里親家庭の出身者', en: 'Grew up in care' },
    'home.t.kodomoSos': { ja: '24時間・いじめ・家', en: '24 hours·Bullying·Home' },
    'home.t.childline': { ja: '18歳まで', en: 'Up to 18' },

    /* ツール */
    'home.toolsTitle': { ja: 'べんりツール', en: 'Tools' },
    'home.tool.script': { ja: '電話・窓口の台本', en: 'Phone & visit script' },
    'home.tool.check': { ja: '契約チェック', en: 'Contract check' },
    'home.tool.money': { ja: '生活費の計算', jr: 'お金のけいさん', en: 'Money calculator' },

    /* 支援者 */
    'home.staffTitle': { ja: '施設職員・先生・里親の方へ', en: 'For staff, teachers and foster carers' },
    'home.staffBody': { ja: '設定で「支援者向けメモ」をオンにできます。', en: 'Turn on "notes for supporters" in Settings.' },
    'home.staffBtn': { ja: '設定をひらく', en: 'Open settings' },

    /* オフライン */
    'home.offline': { ja: 'いまオフラインです。', en: 'You are offline.' },
    'home.offlineBody': { ja: '一覧・地図・やることは使えます。', en: 'The list, the map and your to-do list still work.' },

    /* 奥付 (colophon): label / value */
    'home.colo.title': { ja: '巣立ちマップ', en: 'Sudachi Map' },
    'home.colo.ed': { ja: '東京版', en: 'Tokyo edition' },
    'home.colo.by': { ja: 'つくった人', en: 'Made by' },
    'home.colo.byVal': { ja: 'Economix JP（東京の高校生の団体）', en: 'Economix JP (Tokyo high-school students)' },
    'home.colo.checked': { ja: '最終確認', en: 'Last checked' },
    'home.colo.listed': { ja: 'のせている支援', en: 'Listed' },
    'home.colo.listedVal': { ja: '{n}件', en: '{n}' },
    'home.colo.ads': { ja: '広告', en: 'Ads' },
    'home.colo.adsVal': { ja: 'なし', en: 'None' },
    'home.colo.data': { ja: 'あなたの答え', en: 'Your answers' },
    'home.colo.dataVal': { ja: 'このスマホの中だけ', en: 'Only on this device' },
    'home.colo.note': { ja: '申し込む前に、公式ページでも確認してください。ここは相談窓口ではありません。', en: 'Check the official page before you apply. This site is not a helpline.' },
    'home.colo.about': { ja: '掲載基準・運営について', en: 'About & standards' }
  });

  /* ------------------------------------------------------------ helpers */
  function programs() { return (SM.data && SM.data.programs) || []; }
  function prog(id) {
    try { if (SM.program) return SM.program(id); } catch (e) { /* ignore */ }
    for (var i = 0, ps = programs(); i < ps.length; i++) if (ps[i].id === id) return ps[i];
    return undefined;
  }
  function answers() { return (SM.state && SM.state.answers) || {}; }
  function isWard(c) { return /^13\d{3}$/.test(String(c || '')); }
  function shortName(p) { return L(p.name).replace(/（[^）]*）\s*$/, ''); }
  function pad2(n) { n = +n || 0; return n < 10 ? '0' + n : String(n); }
  function telHref(n) { return 'tel:' + String(n).replace(/[^\d+#*]/g, '').replace(/#/g, '%23'); }
  function isFreeDial(n) { return /^(0120|0800)/.test(String(n || '').replace(/\D/g, '')); }
  function catLabel(k) { var c = SM.CATS && SM.CATS[k]; return c ? (en() ? c.en : c.ja) : k; }
  function catMark(k, size, vt) {
    if (SM.ui && SM.ui.catIcon) return SM.ui.catIcon(k, size, { vt: !!vt });
    var c = (SM.CATS && SM.CATS[k]) || {};
    return '<span class="cat-icon cat-' + esc(k) + (size ? ' is-' + size : '') + '"><span class="cat-stack" aria-hidden="true"><span class="cat-mark"' + (vt ? ' data-vt="cat"' : '') + '>' + esc(c.mark || '') + '</span></span></span>';
  }
  function section(title, o) {
    if (SM.ui && SM.ui.sectionHeader) return SM.ui.sectionHeader(title, o);
    return '<div class="section-head"><h2 class="section-title" id="' + esc(o.id) + '">' + esc(title) + '</h2></div>';
  }
  // a section head that rises in as its rule draws (first screen: on the entrance table's clock)
  function head(title, o, first) {
    var h = section(title, o);
    var d = first && T ? T.head : 0;
    h = h.replace('<div class="section-head', '<div data-reveal="up"' + (d ? ' data-reveal-delay="' + d + '"' : '') + ' class="section-head h-head');
    if (d) h = h.replace('data-reveal="rule"', 'data-reveal="rule" data-reveal-delay="' + (d + 40) + '"');
    return h;
  }
  function tags(str) {
    return String(str || '').split(/[・·]/).filter(Boolean).map(function (x) { return '<span class="tag tag-neutral">' + esc(x) + '</span>'; }).join('');
  }
  function updated() { return SM.updated || '2026-10-17'; }
  function fmtDate(d) { try { return SM.fmtDate ? SM.fmtDate(d) : d; } catch (e) { return d; } }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function dayDiff(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    var a = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    var n = todayISO().split('-');
    var b = Date.UTC(+n[0], +n[1] - 1, +n[2]);
    return Math.round((a - b) / 86400000);
  }
  function listed() { return SM.ui && SM.ui.listedCount ? SM.ui.listedCount() : programs().length; }

  /* same rule as さがす' category list, so the numbers on the signs match what the list shows */
  function catCounts() {
    var a = answers(), counts = {};
    var wardKnown = isWard(a.area);
    var fits = null;
    if (junior() && SM.match) {
      fits = {};
      try { SM.match(a).forEach(function (r) { fits[r.p.id] = 1; }); } catch (e) { fits = null; }
    }
    programs().forEach(function (p) {
      if (!p || !p.id) return;
      var ar = (p.for && p.for.areas) || [];
      var wardOnly = ar.length > 0 && ar.every(isWard);
      if (wardKnown) { if (wardOnly && ar.indexOf(a.area) === -1) return; }
      else if (p.basis === 'local' || wardOnly) return;
      if (SM.tokyoVersion && SM.tokyoVersion[p.id] && a.area !== 'other') return;
      if (fits && !fits[p.id]) return;
      (p.cat || []).forEach(function (c) { counts[c] = (counts[c] || 0) + 1; });
    });
    return counts;
  }

  /* ------------------------------------------------------------ entrance choreography
     ms after the entrance starts: the opening's release (first visit) or the mount (returning beat, a tab opened
     for the first time this session). The hero parts are CSS (--d, css .h-play); head / rows are SM.motion reveals.
     SPEC-v5 scale: travel 24–48px, 280–560ms, staggers 40–60ms. */
  var ENTER = {
    launch: { kicker: 0, l1: 50, l2: 110, mark: 340, facts: 190, factStep: 45, cta: 260, nudge: 760, crisis: 330, answers: 190, side: 320, head: 340, rows: 380, rowStep: 40 },
    short: { kicker: 0, l1: 30, l2: 80, mark: 280, facts: 130, factStep: 40, cta: 190, nudge: 660, crisis: 250, answers: 130, side: 250, head: 270, rows: 310, rowStep: 35 }
  };
  var mode = 'none', T = null;
  // home is already on screen (an in-place SM.render()): the static #view is also .v-home, so look for the hero
  function homeShown() {
    var view = document.getElementById('view');
    return !!(view && view.classList.contains('v-home') && view.querySelector(':scope > .h-hero'));
  }
  function pickMode() {
    var de = document.documentElement, r = SM.route || {};
    if (reduced() || !(SM.motion && SM.motion.mount)) return 'none';
    if (r.instant) return 'none';
    if (homeShown() && r.kind === 'none' && !de.classList.contains('lx-full')) return 'none';
    if (de.classList.contains('lx-full') && !(window.__lx && window.__lx.done)) return 'launch';
    return 'short';
  }
  // one hero part of the CSS choreography: its kind (line | rise | cta | slide) and its delay
  function ha(kind, key, extra) {
    if (!T) return '';
    var d = typeof key === 'number' ? key : T[key];
    return ' data-h="' + kind + '" style="--d:' + (d + (extra || 0)) + 'ms"';
  }
  // a line of the headline: the outer span holds the clip, the inner one rises from behind the baseline
  function hline(cls, key, html) {
    return '<span class="' + cls + ' h-ln-o"' + (T ? ' data-h="line"' : '') + '><span class="h-ln-i"' + (T ? ' style="--d:' + T[key] + 'ms"' : '') + '>' + html + '</span></span>';
  }
  // the 蛍光ペン stroke: its own element under the phrase; it sweeps from the left once its line is up
  function markInk() {
    return '<span class="h-mark-ink"' + (T ? ' style="--mark-at:' + T.mark + 'ms"' : '') + ' aria-hidden="true"></span>';
  }

  /* ------------------------------------------------------------ hero */
  function cta(label, href) {
    if (SM.ui && SM.ui.button) return SM.ui.button(label, { href: href, variant: 'primary', size: 'lg', block: true, cls: 'h-cta', attrs: 'data-press' });
    return '<a class="btn btn-primary btn-lg btn-block h-cta" href="' + esc(href) + '" data-press><span>' + esc(label) + '</span>' + arrow() + '</a>';
  }
  // 中学生: straight to the SOS sheet (189 and 子供SOS first there); otherwise the 住まい page, which opens on
  // tonight's numbers
  function crisisLink() {
    var jr = false;
    try { jr = document.body.classList.contains('is-junior') || (SM.isJunior && SM.isJunior()); } catch (e) { jr = false; }
    var inner = '<span>' + esc(t('home.crisis')) + '</span>' + arrow();
    return jr ? '<button type="button" class="btn btn-text h-crisis" data-act="sos" aria-haspopup="dialog" data-press' + ha('slide', 'crisis') + '>' + inner + '</button>' :
      '<a class="btn btn-text h-crisis" href="#/find/cat/housing" data-press' + ha('slide', 'crisis') + '>' + inner + '</a>';
  }
  // facts as signage, not sentences: 東京の支援 222件 | ログインなし | 6問・3分
  function facts(n) {
    var num = '<b class="num h-fact-n' + rollCls('home.total', n) + '" data-count="' + n + '" data-count-seen="home.total" data-count-dur="900"' +
      (T ? ' data-reveal-delay="' + T.facts + '"' : '') + '>' + n + '</b>';
    var unit = t('home.unit');
    var first = en() ? num + '<span class="h-fact-k">' + esc(t('home.f.count')) + '</span>' :
      '<span class="h-fact-k">' + esc(t('home.f.count')) + '</span>' + num + (unit ? '<span class="h-fact-u">' + esc(unit) + '</span>' : '');
    var cells = [first, '<span class="h-fact-k">' + esc(t('home.f.login')) + '</span>', '<span class="h-fact-k">' + esc(t('home.f.time')) + '</span>'];
    return '<ul class="h-facts" role="list" aria-label="' + esc(t('home.facts')) + '">' + cells.map(function (c, i) {
      return '<li class="h-fact"' + ha('rise', T ? T.facts + i * T.factStep : 0) + '>' + c + '</li>';
    }).join('') + '</ul>';
  }

  function heroNew(jr) {
    var n = listed();
    var art = illus(jr ? 'home-jr-hero' : 'home-hero', { size: 'fill', cls: 'h-art-il' });
    var pre = t('home.h1pre');
    var title =
      '<h1 class="h-title" id="h-title" tabindex="-1">' +
        hline('h-kicker', 'kicker', esc(t('home.kicker'))) +
        hline('h-main', 'l1', (pre ? '<span class="h-open">' + esc(pre) + '</span>' : '') +
          '<mark class="h-mark">' + markInk() + '<span class="h-mark-t">' + esc(t('home.h1mark')) + '</span></mark>' + esc(t('home.h1post'))) +
        hline('h-main', 'l2', esc(t('home.h1c'))) +
      '</h1>';
    return '<section class="h-hero is-new wide-layout' + (art ? ' has-art' : '') + '" aria-labelledby="h-title">' +
      (art ? '<div class="h-art">' + art + '</div>' : '') +
      '<div class="h-copy">' + title + facts(n) +
        '<div class="h-actions"><div class="h-cta-w"' + ha('cta', 'cta') + '>' + cta(t('home.cta'), '#/find/q/1') + '</div>' + crisisLink() + '</div>' +
      '</div>' +
    '</section>';
  }

  function fitCount() {
    // same count as the results page and さがす (ward/city-only rows wait in their own group there)
    try { if (SM.match) return SM.match(answers()).filter(function (r) { return !r.local; }).length; } catch (e) { /* ignore */ }
    return null;
  }
  function heroBack(side) {
    var n = fitCount();
    var summary = '';
    try {
      if (SM.matchSummary) {
        summary = SM.matchSummary(answers()).filter(function (r) {
          return r.set && r.label && (r.key === 'stage' || r.key === 'path' || r.key === 'area');
        }).map(function (r, i) {
          // F25: plain text separated by ／ (a tag looked tappable; only 変える is)
          return '<span class="h-ans">' + (i ? '<span class="h-ans-sep" aria-hidden="true">' + (en() ? '\u00b7' : '／') + '</span>' : '') + esc(r.label) + '</span>';
        }).join('');
      }
    } catch (e) { summary = ''; }
    var unit = t('home.backUnit');
    var title = n ?
      '<h1 class="h-title is-back" id="h-title" tabindex="-1">' +
        hline('h-kicker', 'kicker', esc(t('home.backA'))) +
        hline('h-big-row', 'l1', '<mark class="h-mark h-mark-num">' + markInk() + '<span class="h-mark-t"><b class="h-big num' + rollCls('home.fit', n) + '" data-count="' + n + '" data-count-seen="home.fit" data-count-dur="760"' + (T ? ' data-reveal-delay="' + T.l1 + '"' : '') + '>' + n + '</b>' +
          (unit ? '<span class="h-big-unit">' + esc(unit) + '</span>' : '') + '</span></mark>') +
      '</h1>' :
      '<h1 class="h-title is-back is-none" id="h-title" tabindex="-1">' + hline('h-kicker', 'kicker', esc(t('home.backNone'))) + '</h1>';
    var ans = summary ? '<p class="h-answers"' + ha('rise', 'answers') + '><span class="sr-only">' + esc(t('home.yourAnswers')) + ': </span>' + summary +
      '<a class="h-change" href="#/find/q/1" aria-label="' + esc(t('home.changeLabel')) + '" data-press>' + esc(t('home.changeAnswers')) + '</a></p>' : '';
    return '<section class="h-hero is-back wide-layout' + (side ? ' has-side' : '') + '" aria-labelledby="h-title">' +
      '<div class="h-copy">' + title + ans +
        '<div class="h-actions"><div class="h-cta-w"' + ha('cta', 'cta') + '>' + cta(t('home.seeResults'), '#/find/results') + '</div>' + crisisLink() + '</div>' +
      '</div>' +
      (side ? '<div class="h-side"' + ha('rise', 'side') + '>' + side + '</div>' : '') +
    '</section>';
  }

  /* ------------------------------------------------------------ やること (only when there is something) */
  function planPreview() {
    var saved = (SM.state && SM.state.saved) || [];
    var leave = SM.state && SM.state.leaveDate;
    var items = saved.map(prog).filter(Boolean);
    // 中学生 track (やること's 高校受験 switch): count down to 高校入学 instead of 巣立ちの日
    var anc = null;
    try { if (SM.plan && typeof SM.plan.anchor === 'function') anc = SM.plan.anchor(); } catch (e) { anc = null; }
    var jrTrack = !!(anc && anc.track === 'junior' && anc.date);
    if (!items.length && !leave && !(jrTrack && SM.state.hsDate)) return '';
    var days = '', d = null;
    if (jrTrack) {
      var ad = anc.date instanceof Date ? anc.date : new Date(anc.date);
      if (!isNaN(ad)) d = dayDiff(ad.getFullYear() + '-' + ('0' + (ad.getMonth() + 1)).slice(-2) + '-' + ('0' + ad.getDate()).slice(-2));
      if (d !== null && d <= 0) d = null;
    } else if (leave) d = dayDiff(leave);
    if (d !== null) {
      if (d > 0) {
        days = '<p class="h-days"><span class="h-days-k">' + esc(t(jrTrack ? 'home.daysToEntry' : 'home.daysTo')) +
          (jrTrack && anc.assumed ? ' <span class="tag tag-neutral h-days-tag">' + esc(t('home.daysAssumed')) + '</span>' : '') + '</span>' +
          '<span class="h-days-v">' + (t('home.daysPre') ? '<span class="h-days-pre">' + esc(t('home.daysPre')) + '</span>' : '') +
          '<b class="num h-days-n' + rollCls('home.days', d) + '" data-count="' + d + '" data-count-seen="home.days">' + d + '</b><span class="h-days-unit">' + esc(t('home.daysUnit')) + '</span></span></p>';
      } else if (d === 0) days = '<p class="h-days is-text"><span class="h-days-k">' + esc(t('home.daysToday')) + '</span></p>';
      else days = '<p class="h-days is-text"><span class="h-days-k">' + esc(t('home.daysSince', { n: -d })) + '</span></p>';
    }
    var rows = items.slice(0, 3).map(function (p) {
      var cat = (p.cat && p.cat[0]) || 'procedures';
      return '<a class="list-item h-plan-item" href="#/p/' + encodeURIComponent(p.id) + '" data-id="' + esc(p.id) + '" data-press="ink">' + catMark(cat, 'sm', true) +
        '<span class="list-body"><span class="list-title">' + esc(shortName(p)) + '</span></span>' +
        '<span class="list-meta">' + arrow() + '</span></a>';
    }).join('');
    var more = items.length > 3 ? '<p class="h-plan-more">' + esc(t('home.planMore', { n: items.length - 3 })) + '</p>' : '';
    return '<section class="h-plan" aria-labelledby="h-plan-h">' +
      section(t('home.planTitle'), { id: 'h-plan-h', sub: items.length ? t('home.planSaved', { n: items.length }) : '', action: { label: t('home.planOpen'), href: '#/plan' } }) +
      days +
      (rows ? '<div class="list h-plan-list" data-reveal-stagger="50">' + rows + '</div>' : '') + more +
    '</section>';
  }

  /* ------------------------------------------------------------ offline: a slim ruled row (VISUAL-SPEC §9) */
  function offline() {
    var off = false;
    try { off = navigator.onLine === false; } catch (e) { off = false; }
    if (!off) return '';
    return '<aside class="h-offline" role="status">' + illus('offline', { size: 'thumb-sm', animate: false, cls: 'h-offline-il' }) +
      '<p><b>' + esc(t('home.offline')) + '</b>' + esc(t('home.offlineBody')) + '</p></aside>';
  }

  /* ------------------------------------------------------------ まなぶ: a shelf of covers */
  function lessonsFor(jr) {
    var list = ((SM.data && SM.data.lessons) || []).filter(function (l) { return l && l.id; });
    var rank = jr ? { jr: 0, all: 1, hs: 2 } : { all: 0, hs: 0, jr: 1 };
    var rel = list.filter(function (l) { return jr ? l.level !== 'hs' : l.level !== 'jr'; });
    if (!rel.length) rel = list.slice();
    rel = rel.map(function (l, i) { return { l: l, i: i }; });
    rel.sort(function (a, b) {
      var ra = rank[a.l.level] != null ? rank[a.l.level] : 1, rb = rank[b.l.level] != null ? rank[b.l.level] : 1;
      if (ra !== rb) return ra - rb;
      var oa = a.l.order != null ? a.l.order : 999, ob = b.l.order != null ? b.l.order : 999;
      return oa - ob || a.i - b.i;
    });
    return rel.map(function (x) { return x.l; });
  }
  function isLearned(id) {
    try { if (SM.isLearned) return SM.isLearned(id); } catch (e) { /* ignore */ }
    return ((SM.state && SM.state.learned) || []).indexOf(id) !== -1;
  }
  function lessonHref(l) { return '#/learn/' + encodeURIComponent(l.id); }

  function learn(jr, first) {
    var list = lessonsFor(jr);
    if (!list.length) return '';
    // progress counts every lesson (中学生: only theirs), so the numbers match the まなぶ page
    var every = jr ? list.slice() : list.concat(((SM.data && SM.data.lessons) || []).filter(function (l) { return l && l.id && list.indexOf(l) === -1; }));
    var total = every.length;
    var done = every.filter(function (l) { return isLearned(l.id); }).length;
    var next = null;
    for (var i = 0; i < list.length; i++) if (!isLearned(list[i].id)) { next = list[i]; break; }
    var feature = next || list[0];
    var todo = list.filter(function (l) { return l !== feature && !isLearned(l.id); });
    var did = list.filter(function (l) { return l !== feature && isLearned(l.id); });
    var shown = [feature].concat(todo, did).slice(0, 8);
    var flag = next ? (done ? t('home.learnNext') : t('home.learnFirst')) : t('home.learnAllDone');

    var cards = shown.map(function (l, idx) {
      var d = isLearned(l.id);
      var cat = l.cat || 'money';
      // 中学生: numbered in the order their lessons are listed (01, 02 …), not by catalogue number
      var no = jr ? pad2(list.indexOf(l) + 1) : (l.order != null ? pad2(l.order) : '');
      var cover = illus('learn-cover-' + l.id, { size: 'cover', animate: false, cls: 'h-cover-il' });
      return '<li class="h-shelf-item' + (idx === 0 ? ' is-feature' : '') + (d ? ' is-done' : '') + '" data-id="' + esc(l.id) + '">' +
        '<a class="h-cover" href="' + lessonHref(l) + '" data-press="ink">' +
          (idx === 0 ? '<span class="h-cover-flag">' + esc(flag) + '</span>' : '') +
          '<span class="h-cover-art' + (cover ? '' : ' is-blank') + '">' + cover +
            (d ? '<span class="h-cover-done" title="' + esc(t('home.learnDone')) + '"><span aria-hidden="true">' + esc(t('home.learnDoneMark')) + '</span><span class="sr-only">' + esc(t('home.learnDone')) + '</span></span>' : '') +
          '</span>' +
          '<span class="h-cover-meta">' + catMark(cat, 'xs', true) + '<span class="num">' + esc(no) + '</span>' +
            (l.minutes ? '<span>' + esc(t('home.learnMin', { n: l.minutes })) + '</span>' : '') +
            (l.level === 'jr' && !jr ? '<span>' + esc(t('home.learnFor')) + '</span>' : '') + '</span>' +
          '<span class="h-cover-title">' + esc(L(l.title)) + '</span>' +
        '</a></li>';
    }).join('');
    var end = '<li class="h-shelf-end"><a class="h-shelf-all" href="#/learn" data-press="ink"><span>' + esc(t('home.learnAllCard')) + '</span>' + arrow() + '</a></li>';
    var segs = '';
    for (var j = 0; j < total; j++) segs += '<i class="h-seg' + (j < done ? ' is-done' : '') + '" style="--i:' + j + '"></i>';
    var progress = '<div class="h-learn-prog"><p class="h-learn-prog-n"><b class="num">' + done + '</b><span class="h-learn-prog-of num">/ ' + total + '</span>' +
      '<span class="h-learn-prog-k">' + esc(t('home.learnDoneLabel')) + '</span></p>' +
      '<span class="h-segs" aria-hidden="true" style="--n:' + total + '">' + segs + '</span></div>';

    var hold = first && T ? ' data-reveal-delay="' + T.rows + '"' : '';
    return '<section class="h-sec h-learn' + (jr ? ' is-jr' : '') + '" id="h-learn" aria-labelledby="h-learn-h">' +
      head(t('home.learnTitle'), { id: 'h-learn-h', action: { label: t('home.learnAll'), href: '#/learn' } }, first) +
      '<div class="h-learn-body" data-reveal' + hold + '>' + progress +
        '<ul class="h-shelf" role="list" aria-label="' + esc(t('home.shelf')) + '" data-reveal-stagger="60">' + cards + end + '</ul>' +
      '</div>' +
    '</section>';
  }

  /* ------------------------------------------------------------ 困りごと: six kanji station rows (mark · name · count) */
  function cats(first) {
    var order = SM.CAT_ORDER || ['housing', 'money', 'education', 'work', 'procedures', 'consult'];
    var counts = catCounts();
    var unit = t('home.unit');
    var lead = first && T;
    var rows = order.map(function (k, i) {
      var n = counts[k] || 0;
      // each row rises in its turn; its kanji mark stamps in and its count rolls as it arrives (css: .h-cat-li.m-in)
      var at = lead ? ' data-reveal-delay="' + (T.rows + i * T.rowStep) + '"' : '';
      return '<li class="h-cat-li" data-id="' + esc(k) + '" data-reveal="up"' + at + '><a class="h-cat cat-' + esc(k) + '" href="#/find/cat/' + esc(k) + '" data-press="ink">' +
        '<span class="h-cat-mark">' + catMark(k, 'sm', true) + '</span>' +
        '<span class="h-cat-name">' + esc(catLabel(k)) + '</span>' +
        (n ? '<span class="h-cat-n"><b class="num" data-count="' + n + '" data-count-dur="620">' + n + '</b>' + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</span>' : '') +
        '<span class="h-cat-go">' + arrow() + '</span>' +
      '</a></li>';
    }).join('');
    return '<section class="h-sec h-cats-sec" id="h-cats" aria-labelledby="h-cats-h" tabindex="-1">' +
      head(t('home.catsTitle'), { id: 'h-cats-h', action: { label: t('home.catsAll'), href: '#/find' } }, first) +
      '<ul class="h-cats" role="list"' + (lead ? '' : ' data-reveal-stagger="50"') + '>' + rows + '</ul>' +
    '</section>';
  }

  /* ------------------------------------------------------------ 今すぐ話したい */
  // Curated lines; numbers and links always come from the verified data records.
  var TALK = [
    { id: 'yorisoi', sub: 'home.t.yorisoi' },
    { id: 'anata-no-ibasho', sub: 'home.t.ibasho' },
    { id: 'tokyo-wakanavi', sub: 'home.t.wakanavi', lineLabel: 'home.lineShort' },
    { id: 'b4s-line-soudan', sub: 'home.t.b4s' }
  ];
  var TALK_JR = [
    { id: 'kodomo-sos', sub: 'home.t.kodomoSos' },
    { id: 'childline', sub: 'home.t.childline' },
    { id: 'anata-no-ibasho', sub: 'home.t.ibasho' },
    { id: 'yorisoi', sub: 'home.t.yorisoi' }
  ];
  /* one structure for every line: name · tags · the number · a row of equal ink-outline buttons. The number is the
     biggest thing and also dials (pointer only: the 電話する button is the one link screen readers and the keyboard
     get, with the name, number and hours in its label). */
  function talkRow(x) {
    var p = prog(x.id);
    if (!p || !p.contact) return '';
    var c = p.contact, name = shortName(p);
    var num = '', acts = [];
    var extBits = ic('external') + '<span class="sr-only">' + esc(t('core.newtab')) + '</span>';
    if (c.phone) {
      var when = [isFreeDial(c.phone) ? t('home.free') : '', c.hours ? L(c.hours) : ''].filter(Boolean).join('・');
      num = '<a class="h-tel" href="' + esc(telHref(c.phone)) + '" tabindex="-1" aria-hidden="true">' +
        '<span class="h-tel-n num" data-noruby>' + esc(c.phone) + '</span></a>';
      acts.push('<a class="btn btn-secondary btn-sm h-act" href="' + esc(telHref(c.phone)) + '" aria-label="' + esc(t('home.callShort') + ' ' + name + ' ' + c.phone + (when ? '. ' + when : '')) + '">' +
        ic('phone') + '<span>' + esc(t('home.callShort')) + '</span></a>');
    }
    var chatBtn = function (href, key) {
      return '<a class="btn btn-secondary btn-sm h-act" href="' + esc(href) + '" target="_blank" rel="noopener"><span>' + esc(t(key)) + '</span>' + extBits + '</a>';
    };
    if (c.phone && c.line) acts.push(chatBtn(c.line, x.lineLabel || 'home.lineShort'));
    else if (c.phone && c.chat) acts.push(chatBtn(c.chat, x.lineLabel || 'home.chatShort'));
    else if (!c.phone && (c.chat || c.line)) acts.push(chatBtn(c.chat || c.line, c.chat ? 'home.chatShort' : 'home.lineShort'));
    if (!acts.length) return '';
    var free = c.phone && isFreeDial(c.phone) ? '<span class="tag tag-free h-free">' + esc(t('home.free')) + '</span>' : '';
    return '<li class="h-ln" data-id="' + esc(p.id) + '">' +
      '<h3 class="h-ln-name"><a href="#/p/' + encodeURIComponent(p.id) + '">' + esc(name) + '</a></h3>' +
      '<p class="h-ln-sub">' + free + tags(t(x.sub)) + '</p>' +
      num + '<div class="h-acts">' + acts.join('') + '</div>' +
    '</li>';
  }
  function talk(jr) {
    var rows = (jr ? TALK_JR : TALK).map(talkRow).join('');
    return '<section class="h-sec h-talk" id="h-talk" aria-labelledby="h-talk-h">' +
      head(t('home.talkTitle'), { id: 'h-talk-h', sub: t('home.talkBody') }) +
      (rows ? '<ul class="h-lines" role="list" data-reveal-stagger="60">' + rows + '</ul>' : '') +
      '<div class="h-talk-foot" data-reveal>' +
        '<a class="btn btn-text h-more" href="#/find/cat/consult"><span>' + esc(t('home.talkMore')) + '</span>' + arrow() + '</a>' +
        '<button type="button" class="h-sos" data-act="sos"><span class="h-sos-k">' + esc(t('home.talkSos')) + '</span>' +
          '<span class="h-sos-v">' + ic('phone') + '<b>' + esc(t('home.talkSosBtn')) + '</b>' + arrow() + '</span></button>' +
      '</div>' +
    '</section>';
  }

  /* ------------------------------------------------------------ ツール: rows with spot thumbs, titles only */
  function tools() {
    var list = [
      { href: '#/tools/script', k: 'script' },
      { href: '#/tools/check', k: 'check' },
      { href: '#/tools/money', k: 'money' }
    ];
    return '<section class="h-sec h-tools-sec" id="h-tools" aria-labelledby="h-tools-h">' +
      head(t('home.toolsTitle'), { id: 'h-tools-h' }) +
      '<ul class="h-tools" role="list" data-reveal-stagger="60">' + list.map(function (x) {
        var art = illus('tools-' + x.k, { size: 'thumb-sm', animate: false, cls: 'h-tool-il' });
        return '<li><a class="h-tool" href="' + x.href + '" data-press="ink">' +
          (art ? '<span class="h-tool-art">' + art + '</span>' : '') +
          '<span class="h-tool-t">' + esc(t('home.tool.' + x.k)) + '</span>' +
          '<span class="h-tool-go">' + arrow() + '</span></a></li>';
      }).join('') + '</ul>' +
    '</section>';
  }

  /* ------------------------------------------------------------ 支援者 band */
  function staff() {
    return '<section class="h-staff band" aria-labelledby="h-staff-t" data-reveal>' +
      '<h2 class="h-staff-t" id="h-staff-t">' + esc(t('home.staffTitle')) + '</h2>' +
      '<p class="h-staff-b">' + esc(t('home.staffBody')) + '</p>' +
      '<button type="button" class="btn btn-secondary btn-sm h-staff-btn" data-act="settings" data-press>' + ic('settings') + '<span>' + esc(t('home.staffBtn')) + '</span></button>' +
    '</section>';
  }

  /* ------------------------------------------------------------ 奥付 (an honest colophon, label / value) */
  function colophon() {
    var rows = [
      [t('home.colo.by'), esc(t('home.colo.byVal'))],
      [t('home.colo.checked'), esc(fmtDate(updated()))],
      [t('home.colo.listed'), esc(t('home.colo.listedVal', { n: listed() }))],
      [t('home.colo.ads'), esc(t('home.colo.adsVal'))],
      [t('home.colo.data'), esc(t('home.colo.dataVal'))]
    ];
    var kv = SM.ui && SM.ui.kv ? SM.ui.kv(rows) :
      '<dl class="kv">' + rows.map(function (r) { return '<div class="kv-row"><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>';
    // the full lockup: [巣]立ちマップ standing on the green line that steps up. The line draws once when the colophon
    // arrives — the opening's line, at the end of the page.
    var mark = '';
    if (SM.brand && SM.brand.lockup) {
      mark = SM.brand.lockup({ line: !en(), cls: 'h-colo-logo' });
      mark = mark.replace('<g class="lg-line"', '<g class="lg-line" data-reveal="rule"');
    } else mark = ic('logo') + '<span class="h-colo-name">' + esc(t('home.colo.title')) + '</span>';
    return '<footer class="h-colo" aria-labelledby="h-colo-h">' +
      '<h2 class="sr-only" id="h-colo-h">' + esc(t('home.colo.title')) + '</h2>' +
      '<div class="h-colo-head"><span class="h-colo-mark">' + mark + '</span>' +
        '<span class="h-colo-ed">' + esc(t('home.colo.ed')) + ' <span class="num">v' + esc(SM.version || '4.0.0') + '</span></span></div>' +
      kv +
      '<p class="h-colo-note">' + esc(t('home.colo.note')) + '</p>' +
      '<a class="btn btn-text h-more" href="#/about"><span>' + esc(t('home.colo.about')) + '</span>' + arrow() + '</a>' +
    '</footer>';
  }

  /* ------------------------------------------------------------ act: jump to a section without touching the router */
  if (SM.on) {
    SM.on('home-jump', function (el) {
      var id = el && el.getAttribute('data-target');
      fillAll();
      landHero();
      try { if (SM.motion && SM.motion.finishAll) SM.motion.finishAll(); } catch (e) { /* ignore */ }
      var target = id && document.getElementById(id);
      if (!target) return;
      try { if (SM.motion && SM.motion.revealAll) SM.motion.revealAll(target); } catch (e) { /* ignore */ }
      target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      try { target.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    });
  }

  /* ------------------------------------------------------------ the ふりがな offer sits under the hero (VISUAL-SPEC §7.2)
     boot.js inserts it as the view's first child; on home it moves to just after the hero. */
  function wrapBanner() {
    var orig = SM.paintJrBanner;
    if (typeof orig !== 'function' || orig._home) return;
    var w = function (main) {
      var r = orig.apply(this, arguments);
      try {
        var m = main || document.getElementById('view');
        if (m && m.classList.contains('v-home')) {
          var b = m.querySelector(':scope > .jr-banner'), hero = m.querySelector(':scope > .h-hero');
          if (b && hero && hero.nextElementSibling !== b) hero.parentNode.insertBefore(b, hero.nextSibling);
        }
      } catch (e) { /* ignore */ }
      return r;
    };
    w._home = true;
    SM.paintJrBanner = w;
  }

  /* online / offline: repaint home in place (the offline row comes and goes) */
  var netWired = false;
  function wireNet() {
    if (netWired) return;
    netWired = true;
    var on = function () { if (SM.route && SM.route.key === 'home' && SM.render) { try { SM.render(); } catch (e) { /* ignore */ } } };
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
  }

  /* ------------------------------------------------------------ first screen first
     The hero and section 01 render in render(). The rest is built section by section in idle time, into a slot
     after section 01, so the first frame (and, on the first visit, the opening's hand-off) never waits for it:
     - after the page transition (SM.motion.afterTransition), or on the first visit once the opening has handed
       off and the entrance has played (whenReleased + 1s), one section per idle callback;
     - at once, all of it, as soon as the reader scrolls, presses a key, jumps to a section or prints. */
  var pending = null;   // { parts: [fn → html], instant }
  function mountNode(n, instant) {
    try { if (SM.applyRuby) SM.applyRuby(n); } catch (e) { /* ignore */ }
    try { if (SM.motion && SM.motion.mount) SM.motion.mount(n, { instant: instant }); } catch (e) { /* ignore */ }
  }
  function fillLater(all) {
    var p = pending;
    if (!p) return;
    var slot = document.getElementById('h-later');
    if (!slot || !slot.parentNode) { pending = null; unhook(); return; }
    T = null;   // later sections reveal on scroll, with no first-screen delays
    do {
      var part = p.parts.shift();
      if (!part) break;
      var tpl = document.createElement('template');
      tpl.innerHTML = part();
      var nodes = Array.prototype.slice.call(tpl.content.children);
      slot.parentNode.insertBefore(tpl.content, slot);
      for (var i = 0; i < nodes.length; i++) mountNode(nodes[i], p.instant);
    } while (all === true && p.parts.length);
    if (!p.parts.length) {
      pending = null;
      unhook();
      if (slot.parentNode) slot.parentNode.removeChild(slot);
    } else idle(fillLater);
  }
  function fillAll() { if (pending) fillLater(true); }
  function idle(fn) {
    if (window.requestIdleCallback) window.requestIdleCallback(function () { fn(); }, { timeout: 400 });
    else setTimeout(fn, 32);
  }
  var hooked = false;
  function hook() {
    if (hooked) return;
    hooked = true;
    window.addEventListener('scroll', fillAll, { passive: true });
    window.addEventListener('keydown', fillAll, true);
    window.addEventListener('beforeprint', fillAll);
  }
  function unhook() {
    if (!hooked) return;
    hooked = false;
    window.removeEventListener('scroll', fillAll, { passive: true });
    window.removeEventListener('keydown', fillAll, true);
    window.removeEventListener('beforeprint', fillAll);
  }
  function startFill() {
    if (!pending) return;
    hook();
    var de = document.documentElement;
    var opening = de.classList.contains('lx-full') && !(window.__lx && window.__lx.done);
    var go = function () { idle(fillLater); };
    if (opening && SM.motion && SM.motion.whenReleased) SM.motion.whenReleased(function () { setTimeout(go, 1000); });
    else if (SM.motion && SM.motion.afterTransition) SM.motion.afterTransition(go);
    else go();
  }

  /* ------------------------------------------------------------ the hero's CSS choreography
     play: .h-play on the hero starts every part on its --d (scaled by --h-k after a skip). It ends by itself:
     .h-done (≈1.6s) drops the clips and the animations, so nothing stays composited. A tap or key in between lands
     it (.h-land): the reader asked for the page, not the show. */
  var heroTimer = 0, heroEl = null;
  function landHero() {
    var h = heroEl;
    if (!h || !h.classList.contains('h-play') || h.classList.contains('h-done')) return;
    h.classList.add('h-land');
    clearTimeout(heroTimer);
    heroTimer = setTimeout(function () { h.classList.add('h-done'); }, 40);
    offInput();
  }
  function onInput(e) {
    if (e.type === 'keydown' && (e.key === 'Shift' || e.key === 'Tab')) return;
    landHero();
  }
  function offInput() {
    document.removeEventListener('pointerdown', onInput, true);
    document.removeEventListener('keydown', onInput, true);
  }
  function nudge(h, at) {
    // the CTA's arrow nudges once, after the button has landed: "this way"
    setTimeout(function () {
      if (!h.isConnected || h.classList.contains('h-land') || reduced()) return;
      var a = h.querySelector('.h-cta .arrow');
      if (!a || !a.animate) return;
      try {
        a.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(7px)', offset: 0.4 }, { transform: 'translateX(-1px)', offset: 0.75 }, { transform: 'translateX(0)' }],
          { duration: 520, easing: 'cubic-bezier(0.3, 0, 0.3, 1)' });
      } catch (e) { /* ignore */ }
    }, at);
  }
  function playHero(main, table) {
    var h = main && main.querySelector(':scope > .h-hero');
    if (!h || !table) return;
    heroEl = h;
    var go = function () {
      if (!h.isConnected) return;
      var k = parseFloat(h.style.getPropertyValue('--h-k')) || 1;
      h.classList.add('h-play');
      document.addEventListener('pointerdown', onInput, true);
      document.addEventListener('keydown', onInput, true);
      nudge(h, Math.round(table.nudge * k));
      clearTimeout(heroTimer);
      heroTimer = setTimeout(function () { h.classList.add('h-done'); offInput(); }, Math.round((table.nudge + 600) * k));
    };
    if (mode === 'launch' && SM.motion && SM.motion.whenReleased) SM.motion.whenReleased(go);
    else go();
  }

  /* the opening was skipped (launch.js 'sm:lxskip', before it releases the view): the person asked for the app, not
     the show. The held first screen switches to the returning-visit pace (the launch delays × 0.55, so the same
     order lands in about half the time) and the numbers stand at their value instead of rolling from blank. */
  function toShort(view) {
    var hero = view.querySelector(':scope > .h-hero');
    if (hero) hero.style.setProperty('--h-k', '0.55');
    var list = view.querySelectorAll('[data-reveal-delay]');
    for (var i = 0; i < list.length; i++) {
      var d0 = parseInt(list[i].getAttribute('data-reveal-delay'), 10) || 0;
      list[i].setAttribute('data-reveal-delay', String(Math.round(d0 * 0.55)));
    }
    var nums = view.querySelectorAll('[data-count]');
    for (var k = 0; k < nums.length; k++) { nums[k].setAttribute('data-count-from', nums[k].getAttribute('data-count')); nums[k].classList.remove('x-rolls'); }
  }
  document.addEventListener('sm:lxskip', function () {
    if (mode !== 'launch') return;
    var view = document.getElementById('view');
    if (!view || !view.classList.contains('v-home')) return;
    toShort(view);
  });

  SM.views.home = {
    tab: 'home',
    title: { ja: 'ホーム', en: 'Home' },
    render: function () {
      try { if (SM.syncJunior) SM.syncJunior(); } catch (e) { /* ignore */ }
      var jr = junior();
      var answered = !!(SM.state && SM.state.answered);
      var hasLearn = lessonsFor(jr).length > 0;
      mode = pickMode();
      T = ENTER[mode] || null;

      var plan = answered ? planPreview() : '';
      var out = answered ? heroBack(plan) : heroNew(jr) + planPreview();
      out += offline();
      // section 01 renders now; 中学生 see まなぶ first, everyone else the six signs
      out += jr && hasLearn ? learn(true, true) : cats(true);
      // the rest, one part per section
      var parts = [];
      if (jr && hasLearn) parts.push(function () { return cats(false); }, function () { return talk(true); });
      else {
        parts.push(function () { return talk(jr); });
        if (hasLearn) parts.push(function () { return learn(false, false); });
      }
      parts.push(tools, function () { return staff() + colophon(); });

      var r = SM.route || {};
      var deep = r.kind === 'back' && (r.restoreY || 0) > (window.innerHeight || 700) * 0.5;
      if (!homeShown() && !deep) {
        pending = { parts: parts, instant: !!r.instant };
        out += '<div id="h-later" class="h-later" aria-hidden="true"></div>';
      } else {
        // in place, or back to a spot further down: everything now, so the scroll position can be restored
        pending = null;
        var keep = T; T = null;
        out += parts.map(function (f) { return f(); }).join('');
        T = keep;
      }
      return out;
    },
    mount: function (main) {
      wrapBanner();
      wireNet();
      startFill();
      if (T && main) {
        // tapped before home rendered: the same switch as 'sm:lxskip'
        if (mode === 'launch' && window.__lx && window.__lx.skipped) toShort(main);
        playHero(main, T);
        // the entrance delays shape the first screen only: once it has played, anything still waiting reveals at once
        var expire = function () {
          setTimeout(function () {
            var list = main.querySelectorAll('[data-reveal-delay]');
            for (var i = 0; i < list.length; i++) list[i].removeAttribute('data-reveal-delay');
          }, 1300);
        };
        if (SM.motion && SM.motion.whenReleased) SM.motion.whenReleased(expire); else expire();
      }
      T = null;
    }
  };
})();
;
/* ---- js/boot.js ---- */
/* 巣立ちマップ v5 — shell & boot (ENGINE)
 * Paints the app shell (patching the static HTML in place: nothing pops), registers built-in acts (go, save,
 * copy, sheet-close, sos, exit, settings, back), the SOS + settings sheets, keyboard handling, and starts the
 * router. Save = stamp → flight to やること → badge roll → undo toast (MOTION-SPEC §4.1). Loaded before launch.js. */
(function () {
  'use strict';
  var SM = window.SM;
  var esc = SM.esc, t = SM.t, ic = SM._ic;

  /* ------------------------------------------------------------------ strings */
  SM.strings({
    'shell.brand': { ja: '巣立ちマップ', en: 'Sudachi Map' },
    'shell.docTitle': { ja: '巣立ちマップ｜施設や里親家庭を出る人の支援ガイド（東京）', en: 'Sudachi Map | Support for young people leaving care in Tokyo' },
    'shell.skip': { ja: '本文へ', en: 'Skip to content' },
    'shell.exit': { ja: 'すぐ閉じる', en: 'Quick exit' },
    'shell.exitHint': { ja: 'すぐに天気の検索に切りかえます（Esc 2回でも）', en: 'Switch to a weather search at once (or Esc twice)' },
    'shell.sos': { ja: '緊急', en: 'SOS' },
    'shell.sosLabel': { ja: '緊急の連絡先', en: 'SOS — emergency contacts' },
    'shell.settings': { ja: '設定', en: 'Settings' },
    'shell.nav': { ja: 'メイン', en: 'Main' },
    'tab.home': { ja: 'ホーム', en: 'Home' },
    'tab.find': { ja: 'さがす', en: 'Find' },
    'tab.ask': { ja: 'きく', en: 'Ask' },   // SEARCH (v6): 「きく」 tab
    'tab.map': { ja: 'マップ', en: 'Map' },
    'tab.plan': { ja: 'やること', en: 'To-do' },
    'tab.planCount': { ja: 'やること（保存 {n}件）', en: 'To-do ({n} saved)' },
    'tab.learn': { ja: 'まなぶ', en: 'Learn' },
    'tab.learnSub': { ja: 'お金のきほん', en: 'Money basics' },

    'jr.title': { ja: 'ふりがなをつけますか？', en: 'Turn on furigana?' },
    'jr.body': { ja: 'むずかしい漢字に読みがな。あとで設定で変えられます', en: 'Readings over hard kanji. Change it any time in Settings.' },
    'jr.yes': { ja: 'ふりがなをつける', en: 'Turn on furigana' },
    'jr.no': { ja: 'いまはいい', en: 'Not now' },
    'jr.done': { ja: 'ふりがなをつけました', en: 'Furigana is on' },

    'sos.title': { ja: 'いま、話せるところ', en: 'Someone to talk to, now' },
    'sos.lead': { ja: 'タップで電話。名前は言わなくて大丈夫。', en: 'Tap to call. You don\'t have to give your name.' },
    'sos.g1': { ja: '命や体があぶないとき', en: 'If your life or safety is in danger' },
    'sos.g2': { ja: 'つらい・こまったを話したいとき', en: 'If you need to talk' },
    'sos.g3': { ja: 'お金・契約のトラブル', en: 'Money & contract trouble' },
    'sos.gHome': { ja: 'いる場所がない・家にいられない', en: 'Nowhere to stay / can\'t stay at home' },
    'sos.seikatsu': { ja: '生活保護（福祉事務所）', en: 'Public assistance (welfare office)' },
    'sos.seikatsud': { ja: '住む所もお金もないとき。申請は権利。窓口は区や市の福祉事務所', en: 'No home, no money: applying is your right. At your ward/city welfare office' },
    'sos.seikatsuBtn': { ja: '生活保護（福祉事務所）', en: 'Public assistance' },
    'sos.110': { ja: '警察', en: 'Police' },
    'sos.110d': { ja: '身の危険を感じたら', en: 'If you feel unsafe' },
    'sos.119': { ja: '救急・消防', en: 'Ambulance / Fire' },
    'sos.119d': { ja: '大けが・急な病気・火事', en: 'Serious injury, sudden illness, fire' },
    'sos.yori': { ja: 'よりそいホットライン', en: 'Yorisoi Hotline' },
    'sos.yorid': { ja: 'お金・住まい・こころ、なんでも', en: 'Money, housing, feelings — anything' },
    'sos.yorih': { ja: '24時間・無料', en: '24 hours · free' },
    'sos.inochi': { ja: '#いのちSOS', en: '#Inochi SOS' },
    'sos.inochid': { ja: '「死にたい」「消えたい」と思ったら', en: 'If you feel like dying or disappearing' },
    'sos.free': { ja: '無料', en: 'Free' },
    'sos.189': { ja: '児童相談所（いちはやく）', en: 'Child guidance center' },
    'sos.189d': { ja: '虐待かも・家にいられない（18歳未満）', en: 'Abuse, or can\'t stay at home (under 18)' },
    'sos.waka': { ja: '若ナビα（東京都の若者相談）', en: 'Wakanavi α (Tokyo youth line)' },
    'sos.wakad': { ja: 'おおむね18〜39歳。LINE「相談ほっとLINE＠東京」もあり', en: 'Ages ~18–39. Also on LINE: "相談ほっとLINE＠東京"' },
    'sos.wakah': { ja: '月〜土 11時〜23時', en: 'Mon–Sat 11:00–23:00' },
    'sos.chal': { ja: 'TOKYOチャレンジネット', en: 'TOKYO Challenge Net' },
    'sos.chald': { ja: '住む所がない・ネットカフェで寝ている', en: 'No place to live, sleeping in net cafés' },
    'sos.chalh': { ja: '月水金土 10〜17時・火木 10〜20時（祝日休み）', en: 'Mon/Wed/Fri/Sat 10–17, Tue/Thu 10–20 (closed holidays)' },
    'sos.188': { ja: '消費者ホットライン', en: 'Consumer hotline' },
    'sos.188d': { ja: '契約・お金のトラブル。近くの窓口へつながる', en: 'Contract or money trouble. Connects to a local office' },
    // 中学生 sheet (body.is-junior): child lines instead of adult housing / youth services
    'sos.jr.lead': { ja: 'タップで電話。名前は言わなくて大丈夫。', en: 'Tap to call. You don\'t have to give your name.' },
    'sos.jr.g1': { ja: '命や体があぶないとき', jr: '命や体があぶないとき', en: 'If your life or safety is in danger' },
    'sos.jr.gHome': { ja: '家にいられない・こわいとき', jr: '家にいられない・こわいとき', en: 'Can\'t stay at home, or scared' },
    'sos.jr.g2': { ja: '話を聞いてほしいとき', jr: '話を聞いてほしいとき', en: 'When you want someone to listen' },
    'sos.jr189d': { ja: 'たたかれる・家にいられない。18歳になるまで、いつでも', jr: 'たたかれる、家にいられない。24時間、いつでも', en: 'Being hurt, or can\'t stay at home. Any time, under 18' },
    'sos.kodomo': { ja: '24時間子供SOSダイヤル', en: '24-hour Child SOS Dial' },
    'sos.kodomod': { ja: 'いじめ・学校・家のこと。夜中でもつながります', jr: 'いじめ、学校、家のこと。夜中でもつながります', en: 'Bullying, school, home. Answers even at night' },
    'sos.kodomoh': { ja: '24時間・無料', en: '24 hours · free' },
    'sos.child': { ja: 'チャイルドライン', en: 'Childline' },
    'sos.childd': { ja: '18歳までの子どものための電話。話を聞いてくれます', jr: '18歳までの子どものための電話。話を聞いてくれるよ', en: 'A line for children up to 18. Someone listens' },
    'sos.childh': { ja: '毎日16時〜21時・無料', en: 'Daily 16:00–21:00 · free' },
    'sos.jr.yorid': { ja: 'どんなことでも話せます', jr: 'どんなことでも話せます', en: 'You can talk about anything' },
    'sos.jr.chatBody': { ja: 'チャットで相談できるところもあります。', jr: 'チャットで相談できるところもあるよ。', en: 'Some places let you talk by chat.' },
    'sos.exitSheet': { ja: 'すぐ閉じる', en: 'Quick exit' },
    'sos.copy': { ja: '{name}の番号をコピー', en: 'Copy number for {name}' },
    'sos.copied': { ja: '番号をコピーしました', en: 'Number copied' },
    'sos.chatTitle': { ja: '電話がこわいときは', en: 'If calling feels too hard' },
    'sos.chatBody': { ja: 'LINE・チャットでも相談できます。', en: 'You can also talk by LINE or chat.' },
    'sos.chatBtn': { ja: 'LINE・チャットの相談先', en: 'LINE & chat options' },
    'sos.checked': { ja: '番号は {date} に公式ページで確認', en: 'Numbers checked on official pages, {date}' },

    'set.title': { ja: '設定', en: 'Settings' },
    'set.gView': { ja: '見やすさ', en: 'Display' },
    'set.big': { ja: '文字を大きく', en: 'Larger text' },
    'set.bigd': { ja: '画面の文字を大きく', en: 'Bigger text everywhere' },
    'set.ruby': { ja: 'ふりがな', en: 'Furigana' },
    'set.rubyd': { ja: 'むずかしい漢字に読みがな', en: 'Readings over hard kanji (Japanese only)' },
    'set.lang': { ja: 'English', en: 'English' },
    'set.langd': { ja: '画面を英語に', en: 'Show the app in English' },
    'set.dark': { ja: '暗い画面', en: 'Dark screen' },
    'set.darkd': { ja: '背景を黒っぽく（ふだんは白）', en: 'Dark background (white by default)' },
    'set.motion': { ja: '動きを少なく', en: 'Reduce motion' },
    'set.motiond': { ja: '画面は動かさず、ふっと切りかえます', en: 'No movement; screens simply fade' },
    'set.gSup': { ja: '支援する人へ', en: 'For supporters' },
    'set.sup': { ja: '支援者向けメモを表示', en: 'Show supporter notes' },
    'set.supd': { ja: '職員・先生・里親さん向けのメモ', en: 'Notes for care staff, teachers and foster carers' },
    'set.gPriv': { ja: 'このスマホの記録', en: 'Data on this phone' },
    'set.priv': { ja: '名前もログインもいりません。答えや保存した支援は、このスマホの中だけにあります。どこにも送りません。', en: 'No name, no login. Your answers and saved items stay on this phone only. Nothing is sent anywhere.' },
    'set.noStore': { ja: 'このブラウザでは記録が残りません。閉じると消えます。', en: 'This browser can\'t keep data. It\'s gone when you close the page.' },
    'set.erase': { ja: 'このスマホの記録をすべて消す', en: 'Erase everything on this phone' },
    'set.eraseNote': { ja: '共有のスマホ・パソコンでは、最後に消すと安心です。', en: 'On a shared phone or computer, erase when you\'re done.' },
    'set.about': { ja: '運営・掲載のルール・プライバシー', en: 'About, listing rules & privacy' },
    'set.learn': { ja: 'まなぶ — お金のきほん', en: 'Learn — money basics' },
    'set.gMore': { ja: 'もっと知る', en: 'More' },
    'set.version': { ja: 'バージョン {v}・情報の確認日 {d}', en: 'Version {v} · Info checked {d}' },
    'set.confirmTitle': { ja: 'ほんとうに消しますか？', en: 'Erase everything?' },
    'set.confirmBody': { ja: '答え・保存した支援・チェック・日付・まなぶの記録が消えます。元には戻せません。', en: 'Your answers, saved items, checks, dates and lesson progress will be removed. This can\'t be undone.' },
    'set.confirmYes': { ja: 'すべて消す', en: 'Erase all' },
    'set.confirmNo': { ja: 'やめる', en: 'Cancel' },
    'set.erased': { ja: '記録を消しました', en: 'Everything was erased' },
    'set.on': { ja: 'オン', en: 'On' },
    'set.off': { ja: 'オフ', en: 'Off' }
  });

  /* ------------------------------------------------------------------ shell */
  // S16: the tab list lives in core.js (SM.tabs), where the router also reads it
  var TABS = SM.tabs;

  // まなぶ exists when its view is loaded or can be loaded on first use (index.html window.__smLazy)
  function hasLearn() { return !!(SM.views.learn || (SM.lazy && SM.lazy.learn)); }
  function brandHtml() {
    var mark = SM.brand && typeof SM.brand.lockup === 'function' ? SM.brand.lockup({ label: false }) : ic('logo');
    return '<a class="brand" href="#/" aria-label="' + esc(t('shell.brand')) + ' — ' + esc(t('tab.home')) + '">' + mark +
      '<span class="brand-name">' + esc(t('shell.brand')) + '</span></a>';
  }
  function actionsHtml() {
    return '<div class="appbar-actions">' +
      '<button type="button" class="pill pill-exit" data-act="exit" title="' + esc(t('shell.exitHint')) + '">' + esc(t('shell.exit')) + '</button>' +
      '<button type="button" class="pill pill-sos" data-act="sos" aria-label="' + esc(t('shell.sosLabel')) + '">' + ic('phone') + '<span>' + esc(t('shell.sos')) + '</span></button>' +
      '<button type="button" class="icon-btn" data-act="settings" aria-label="' + esc(t('shell.settings')) + '">' + ic('settings') + '</button>' +
      '</div>';
  }
  function tabsHtml() {
    return TABS.map(function (tb, i) {
      return '<a class="tab" href="' + tb.href + '" data-tab="' + tb.key + '" style="--i:' + i + '">' + ic(tb.icon) +
        '<span class="tab-label">' + esc(t('tab.' + tb.key)) + '</span>' +
        (tb.key === 'plan' ? '<span class="tab-badge" aria-hidden="true" hidden></span>' : '') + '</a>';
    }).join('') +
      // まなぶ: not a 5th tab — a row under the tabs on the desktop rail (hidden in the phone tab bar)
      (hasLearn() ? '<a class="tab tab-extra tab-learn" href="#/learn" data-tab="learn" style="--i:' + TABS.length + '">' + ic('book') +
        '<span class="tab-label">' + esc(t('tab.learn')) + '<small class="tab-sub">' + esc(t('tab.learnSub')) + '</small></span></a>' : '');
  }
  function frag(html) { var tpl = document.createElement('template'); tpl.innerHTML = html; return tpl.content; }
  /* Replace a node only when it differs from what we would paint. index.html carries the complete app bar
     (MOTION-SPEC §2.7): on a normal start nothing is replaced, so nothing pops or re-lays out; a language
     change swaps just the parts that changed. */
  function patch(old, html) {
    var fresh = frag(html).firstElementChild;
    if (!fresh) return old;
    if (old && old.isEqualNode(fresh)) return old;
    if (old && old.parentNode) old.parentNode.replaceChild(fresh, old);
    return fresh;
  }

  SM.paintShell = function () {
    var skip = document.querySelector('.skip');
    if (skip && skip.textContent !== t('shell.skip')) skip.textContent = t('shell.skip');
    var bar = document.querySelector('.appbar');
    if (bar) {
      var brand = bar.querySelector(':scope > .brand'), acts = bar.querySelector(':scope > .appbar-actions');
      if (brand && acts && bar.children.length === 2) { patch(brand, brandHtml()); patch(acts, actionsHtml()); }
      else bar.innerHTML = brandHtml() + actionsHtml();
    }
    var sub = document.querySelector('.subbar');
    if (sub) {
      var bl = sub.querySelector('.back-label');
      if (!bl || !sub.querySelector('.subbar-title')) {
        sub.innerHTML =
          '<button type="button" class="back" data-act="back">' + ic('chevron-left') + '<span class="back-label">' + esc(t('core.back')) + '</span></button>' +
          '<span class="subbar-title"></span>';
      } else if (bl.textContent !== t('core.back')) bl.textContent = t('core.back');
    }
    var nav = document.querySelector('.tabbar');
    if (nav) {
      if (nav.getAttribute('aria-label') !== t('shell.nav')) nav.setAttribute('aria-label', t('shell.nav'));
      var tabs = nav.querySelectorAll('.tab');
      var want = TABS.length + (hasLearn() ? 1 : 0);
      if (tabs.length !== want) nav.innerHTML = tabsHtml();
      else {
        // same tabs: relabel in place, so the indicator, badge and active state are kept
        Array.prototype.forEach.call(tabs, function (a) {
          var key = a.getAttribute('data-tab'), lab = a.querySelector('.tab-label');
          if (!lab) return;
          if (key === 'learn') {
            var sm = lab.querySelector('.tab-sub');
            if (lab.firstChild && lab.firstChild.nodeType === 3) lab.firstChild.nodeValue = t('tab.learn');
            if (sm) sm.textContent = t('tab.learnSub');
          } else if (lab.textContent !== t('tab.' + key)) lab.textContent = t('tab.' + key);
        });
      }
    }
    SM.updateBadge();
    if (SM.paintChrome) SM.paintChrome();
    if (SM.paintJrBanner) SM.paintJrBanner();
  };

  /* ------------------------------------------------------------------ 中学生: ふりがな offer (one time) */
  // Shown at the top of the view while body.is-junior, furigana is off, the UI is Japanese and the
  // banner was never answered. Either button stores the answer in SM.state.hints.jrRuby.
  function jrBannerWanted() {
    var s = SM.state;
    // not during the question flow (it pushed the options below the fold): first offered on results / home
    var h = (SM.route && SM.route.hash) || location.hash || '';
    if (/^#\/find\/q(\/|$|\?)/.test(h)) return false;
    // F09: never above the count on the results the person waited for: there it is offered as a toast once the
    // results have landed (SM.offerJrRuby, called by find.js)
    if (/^#\/find\/results/.test(h)) return false;
    // never push crisis numbers down: not while the answers say 「今、家にいられない」
    if (s.answers && s.answers.urgent) return false;
    return document.body.classList.contains('is-junior') && !s.settings.ruby && SM.lang() === 'ja' && !(s.hints && s.hints.jrRuby);
  }
  SM.paintJrBanner = function (main) {
    main = main || document.getElementById('view');
    if (!main) return;
    var old = main.querySelector(':scope > .jr-banner');
    var want = jrBannerWanted() && !main.classList.contains('is-error');
    if (!want) { if (old) old.parentNode.removeChild(old); return; }
    if (old) return;
    var box = document.createElement('aside');
    box.className = 'jr-banner';
    box.setAttribute('aria-labelledby', 'jr-banner-t');
    box.innerHTML =
      '<p class="jr-banner-text"><b id="jr-banner-t">' + esc(t('jr.title')) + '</b><span>' + esc(t('jr.body')) + '</span></p>' +
      '<div class="jr-banner-actions">' +
        '<button type="button" class="btn btn-primary btn-sm jr-yes" data-act="jr-ruby" data-press>' + esc(t('jr.yes')) + '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm jr-no" data-act="jr-dismiss">' + esc(t('jr.no')) + '</button>' +
      '</div>';
    main.insertBefore(box, main.firstChild);
  };
  function jrAnswered() {
    if (!SM.state.hints || typeof SM.state.hints !== 'object') SM.state.hints = {};
    SM.state.hints.jrRuby = true;
  }
  /* F09: the same offer as a one-line toast with its button (results: after the count has rolled). Shown once:
     showing it counts as the answer, so the banner does not come back on home. */
  SM.offerJrRuby = function () {
    var s = SM.state;
    if (!document.body.classList.contains('is-junior') || s.settings.ruby || SM.lang() !== 'ja' || (s.hints && s.hints.jrRuby)) return false;
    if (s.answers && s.answers.urgent) return false;
    jrAnswered();
    SM.save();
    SM.toast(t('jr.title'), { ms: 9000, action: { label: t('jr.yes'), fn: turnRubyOn } });
    return true;
  };
  function turnRubyOn() {
    jrAnswered();
    SM.state.settings.ruby = true;
    SM.save();
    SM.applySettings();
    SM.paintShell();
    SM.render();
    // the banner (and the button that had focus) is gone: keep keyboard / screen-reader users in place
    var h1 = document.querySelector('#view h1') || document.getElementById('view');
    if (h1) {
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
      try { h1.focus({ preventScroll: true }); } catch (e) { }
    }
    SM.toast(t('jr.done'));
  }
  SM.on('jr-ruby', turnRubyOn);
  SM.on('jr-dismiss', function () {
    jrAnswered();
    SM.save();
    var b = document.querySelector('#view > .jr-banner');
    var next = b && b.nextElementSibling;
    if (b) b.parentNode.removeChild(b);
    // keep keyboard users in place
    var target = next && next.querySelector ? (next.matches('h1, h2') ? next : next.querySelector('h1, h2')) : null;
    target = target || document.querySelector('#view h1') || document.getElementById('view');
    if (target) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      try { target.focus({ preventScroll: true }); } catch (e) { }
    }
  });

  /* SM.updateBadge([{roll}]) — the やること count. roll:true rolls the digits (odometer) instead of
     rewriting them; used after a save lands. Without roll it is a plain sync (every render). */
  SM.updateBadge = function (o) {
    var n = (SM.state.saved || []).length;
    var tab = document.querySelector('.tabbar .tab[data-tab="plan"]');
    if (!tab) return;
    var roll = !!(o && o.roll);
    if (SM.motion && SM.motion.badge) SM.motion.badge(tab, n, { roll: roll, bump: roll });
    else {
      var b = tab.querySelector('.tab-badge');
      if (b) { b.hidden = n === 0; b.textContent = n > 99 ? '99+' : String(n); }
    }
    if (n) tab.setAttribute('aria-label', t('tab.planCount', { n: n }));
    else tab.removeAttribute('aria-label');
  };

  /* ------------------------------------------------------------------ built-in acts */
  SM.on('go', function (el) {
    SM.go(el.getAttribute('data-href') || el.getAttribute('href') || '#/');
  });

  /* Save (☆): stamp the star → it flies to やること → the tab nudges and its badge rolls → toast with
     元に戻す at +120ms. Unsave: the star goes to outline, the badge rolls down, no flight. Undo reverses. */
  function paintSaveButtons(id, on) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-act="save"]'), function (b) {
      if (b.getAttribute('data-id') !== id) return;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('is-saved', on);
      var lab = b.querySelector('.save-label');
      var lOn = b.getAttribute('data-label-on'), lOff = b.getAttribute('data-label-off');
      if (lab && lOn && lOff) {
        if (SM.motion && SM.motion.swapText && b.offsetParent !== null) SM.motion.swapText(lab, on ? lOn : lOff);
        else lab.textContent = on ? lOn : lOff;
      }
      var svg = b.querySelector('svg');
      if (svg && b.getAttribute('data-icon') !== 'none' && typeof SM.icon === 'function') {
        var tmp = document.createElement('span');
        tmp.innerHTML = SM.icon(on ? 'star-fill' : 'star');
        if (tmp.firstElementChild) svg.parentNode.replaceChild(tmp.firstElementChild, svg);
      }
    });
  }
  function setSaved(id, on, src, undo) {
    SM.store.quiet = true;
    try { SM.toggleSave(id, { quiet: true, on: on }); } finally { SM.store.quiet = false; }
    paintSaveButtons(id, on);
    var mo = SM.motion;
    var tab = document.querySelector('.tabbar .tab[data-tab="plan"]');
    var star = src && src.isConnected ? src.querySelector('svg') : null;
    var landed = false;
    var land = function () { if (landed) return; landed = true; SM.updateBadge({ roll: true }); };
    // S9: a save that will not outlive this page (storage blocked or full) flies in amber and says so
    var temp = !SM.store.available;
    if (on && !undo && star && mo && !mo.reduced()) {
      if (mo.stamp) mo.stamp(star);
      if (mo.flyTo && tab) setTimeout(function () { mo.flyTo(star, tab, { onArrive: land, tone: temp ? 'warn' : '' }); }, 90);
      else land();
    } else land();
    var v = SM.views[SM.route.key];
    if (v && typeof v.onSave === 'function') { try { v.onSave(id, on, { stamped: !!star, undo: !!undo }); } catch (e) { console.error(e); } }
    else if (v && v.tab === 'plan') SM.render();
    document.dispatchEvent(new CustomEvent('sm:save', { detail: { id: id, saved: on, undo: !!undo } }));
    if (undo) { SM.toast(t('core.undone'), 1600); return; }
    setTimeout(function () {
      SM.toast(t(on ? (temp ? 'core.savedTemp' : 'core.saved') : 'core.unsaved'), {
        action: { label: t('core.undo'), fn: function () { setSaved(id, !on, null, true); } }
      });
    }, on ? 120 : 0);
  }
  SM.on('save', function (el) {
    var id = el.getAttribute('data-id');
    if (!id) return;
    setSaved(id, !SM.isSaved(id), el, false);
  });

  /* Copy: a button with a visible label swaps it (コピーしました, width reserved, reverts after 2s);
     the toast still carries a custom message, and screen readers hear it either way. */
  SM.on('copy', function (el) {
    var msg = el.getAttribute('data-msg') || undefined;
    var lab = el.classList.contains('btn') ? el.querySelector(':scope > span:not(.arrow):not(.sr-only)') : null;
    if (!lab || !SM.motion || !SM.motion.swapText || el.offsetParent === null) {
      SM.copy(el.getAttribute('data-text') || '', msg);
      return;
    }
    var orig = el._smCopyLabel || (el._smCopyLabel = lab.textContent);
    var text = el.getAttribute('data-text') || '';
    var done = t('core.copied');
    var ok = function () {
      SM.motion.swapText(lab, done);
      clearTimeout(el._smCopyT);
      el._smCopyT = setTimeout(function () { if (lab.isConnected) SM.motion.swapText(lab, orig); }, 2000);
      if (msg && msg !== done) SM.toast(msg); else if (SM.announce) SM.announce(done);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
        navigator.clipboard.writeText(text).then(ok, function () { SM.copy(text, msg); });
        return;
      }
    } catch (e) { }
    SM.copy(text, msg);
  });

  SM.on('sheet-close', function () { SM.closeSheet(); });
  SM.on('back', function () { SM.back(); });
  SM.on('exit', function () { quickExit(); });
  SM.on('sos', function () { openSOS(); });
  SM.on('settings', function () { openSettings(); });

  function quickExit() {
    exited = true;
    // no animation of any kind (MOTION-SPEC §3.7): stop a running transition and the splash, then leave
    try { if (SM.motion && SM.motion.skipTransition) SM.motion.skipTransition(); } catch (e) { }
    try { var lx = document.getElementById('launch'); if (lx && lx.parentNode) lx.parentNode.removeChild(lx); } catch (e) { }
    try { document.body.style.visibility = 'hidden'; } catch (e) { }
    try { SM.closeSheet({ noFocus: true, instant: true }); } catch (e) { }
    try { var v = document.getElementById('view'); if (v) v.innerHTML = ''; } catch (e) { }
    try { document.title = ''; } catch (e) { }
    try { sessionStorage.clear(); } catch (e) { }
    // routes replace the current history entry; with the guard entry (core.js "browser Back") the head gate steps
    // back off it first, so the weather page replaces the app's own entry: Back can't bring any screen back
    var L = window.__lx;
    if (L && typeof L.leave === 'function') L.leave();
    else location.replace('https://www.google.co.jp/search?q=%E5%A4%A9%E6%B0%97');
  }
  var exited = false;
  SM.quickExit = quickExit;

  /* ------------------------------------------------------------------ SOS sheet */
  // Each number below was checked on the official page on 2026-10-16:
  //  110/119: universal emergency numbers
  //  189: https://kodomoshien.cfa.go.jp/no-gyakutai/189/ (こども家庭庁)
  //  よりそいホットライン 0120-279-338: https://www.since2011.net/yorisoi/ and https://www.mhlw.go.jp/mamorouyokokoro/soudan/tel/
  //  #いのちSOS 0120-061-338: https://www.mhlw.go.jp/mamorouyokokoro/soudan/tel/
  //  188: https://www.caa.go.jp/policies/policy/local_cooperation/local_consumer_administration/hotline/
  //  若ナビα 03-3267-0808 / TOKYOチャレンジネット 0120-874-225: https://www.fukushi.metro.tokyo.lg.jp/kiban/madoguchi/josei_soudan.html
  var SOS = [
    { g: 'sos.g1', items: [
      { k: '110', num: '110', urgent: true },
      { k: '119', num: '119', urgent: true }
    ] },
    { g: 'sos.gHome', home: true, items: [
      { k: 'chal', num: '0120-874-225', hours: 'sos.chalh' },
      { k: '189', num: '189' }
    ] },
    { g: 'sos.g2', items: [
      { k: 'yori', num: '0120-279-338', hours: 'sos.yorih' },
      { k: 'inochi', num: '0120-061-338', hours: 'sos.free' },
      { k: 'waka', num: '03-3267-0808', hours: 'sos.wakah' }
    ] },
    { g: 'sos.g3', items: [
      { k: '188', num: '188' }
    ] }
  ];
  SM.sos = SOS;
  // 中学生 (body.is-junior): no adult housing service, no 生活保護 link, no 18–39 youth line.
  //  24時間子供SOSダイヤル 0120-0-78310: https://www.mext.go.jp/a_menu/shotou/seitoshidou/06112216.html (data: kodomo-sos)
  //  チャイルドライン 0120-99-7777 (18歳まで, 毎日16〜21時): https://childline.or.jp/tel/ (data: childline)
  var SOS_JR = [
    { g: 'sos.jr.g1', items: [
      { k: '110', num: '110', urgent: true },
      { k: '119', num: '119', urgent: true }
    ] },
    { g: 'sos.jr.gHome', items: [
      { k: '189', num: '189', d: 'sos.jr189d' },
      { k: 'kodomo', num: '0120-0-78310', hours: 'sos.kodomoh' }
    ] },
    { g: 'sos.jr.g2', items: [
      { k: 'child', num: '0120-99-7777', hours: 'sos.childh' },
      { k: 'yori', num: '0120-279-338', hours: 'sos.yorih', d: 'sos.jr.yorid' },
      { k: 'inochi', num: '0120-061-338', hours: 'sos.free' }
    ] }
  ];
  SM.sosJr = SOS_JR;
  function sosList() {
    var jr = false;
    try { jr = document.body.classList.contains('is-junior') || SM.isJunior(); } catch (e) { jr = false; }
    return jr ? SOS_JR : SOS;
  }

  function sosRow(it) {
    var name = t('sos.' + it.k);
    var desc = t(it.d || ('sos.' + it.k + 'd'));
    var tel = it.num.replace(/[^0-9]/g, '');
    return '<li class="sos-li' + (it.urgent ? ' is-urgent' : '') + '">' +
      // the label (plain text, no ruby readings) says everything the row shows, opening hours included
      '<a class="sos-row" href="tel:' + tel + '" data-press aria-label="' + esc(name + ' ' + it.num + '. ' + desc + (it.hours ? '. ' + t(it.hours) : '')) + '">' +
        '<span class="sos-ic" aria-hidden="true">' + ic('phone') + '</span>' +
        '<span class="sos-text">' +
          '<span class="sos-name">' + esc(name) + '</span>' +
          '<span class="sos-num" data-noruby>' + esc(it.num) + '</span>' +
          '<span class="sos-desc">' + esc(desc) + '</span>' +
          (it.hours ? '<span class="sos-hours">' + esc(t(it.hours)) + '</span>' : '') +
        '</span>' +
      '</a>' +
      (it.urgent ? '' : '<button type="button" class="sos-copy" data-act="copy" data-text="' + esc(it.num) + '" data-msg="' + esc(t('sos.copied')) + '" aria-label="' + esc(t('sos.copy', { name: name })) + '">' + ic('copy') + '</button>') +
    '</li>';
  }

  function openSOS() {
    var list = sosList();
    var jr = list === SOS_JR;
    var html =
      '<p class="sos-lead">' + esc(t(jr ? 'sos.jr.lead' : 'sos.lead')) + '</p>' +
      list.map(function (grp) {
        return '<section class="sos-group' + (grp.items[0].urgent ? ' sos-group-urgent' : '') + '"><h3 class="sos-gtitle">' + esc(t(grp.g)) + '</h3>' +
          '<ul class="sos-list">' + grp.items.map(sosRow).join('') + '</ul>' +
          (grp.home ? '<a class="sos-chat-link sos-home-link" href="#/p/seikatsu-hogo"><span>' + esc(t('sos.seikatsuBtn')) + '<small class="sos-desc">' + esc(t('sos.seikatsud')) + '</small></span>' + ic('chevron-right') + '</a>' : '') +
          '</section>';
      }).join('') +
      '<div class="sos-chat">' +
        '<div class="sos-chat-text"><p class="sos-chat-title">' + esc(t('sos.chatTitle')) + '</p>' +
        '<p class="sos-chat-body">' + esc(t(jr ? 'sos.jr.chatBody' : 'sos.chatBody')) + '</p>' +
        // only the places you can reach by LINE or chat (find.js filters on ?chat=1)
        '<a class="sos-chat-link" href="#/find/cat/consult?chat=1">' + esc(t('sos.chatBtn')) + ic('chevron-right') + '</a></div>' +
      '</div>' +
      '<p class="sos-foot">' + esc(t('sos.checked', { date: SM.fmtDate(SM.updated) })) + '</p>';
    SM.sheet(html, { title: t('sos.title'), cls: 'sheet-sos', mount: sosEnter });
  }
  SM.openSOS = openSOS;
  /* The SOS list lands with the sheet: rows rise 12px into place 30ms apart (transform only: every number is
     readable from the first frame), the 110 / 119 phone marks stamp, and each other phone mark nudges once.
     Reduced motion: the sheet's own fade only. */
  function sosEnter(dlg) {
    var mo = SM.motion;
    if (!mo || !mo.animate || (mo.reduced && mo.reduced())) return;
    var rows = dlg.querySelectorAll('.sos-li, .sos-chat');
    Array.prototype.forEach.call(rows, function (li, i) {
      if (i > 9) return;
      mo.animate(li, [{ transform: 'translateY(12px)' }, { transform: 'none' }], { spring: 'smooth', delay: 60 + i * 30, fill: 'backwards' });
    });
    setTimeout(function () {
      if (!dlg.isConnected) return;
      Array.prototype.forEach.call(dlg.querySelectorAll('.sos-li.is-urgent .sos-ic svg'), function (svg, i) {
        setTimeout(function () { if (svg.isConnected && mo.stamp) mo.stamp(svg, { ring: true }); }, i * 70);
      });
      Array.prototype.forEach.call(dlg.querySelectorAll('.sos-li:not(.is-urgent) .sos-ic'), function (ic0, i) {
        if (i > 6) return;
        setTimeout(function () { if (ic0.isConnected && mo.nudge) mo.nudge(ic0); }, 140 + i * 30);
      });
    }, 160);
  }

  function btn(label, o) {
    if (SM.ui && typeof SM.ui.button === 'function') {
      try { return SM.ui.button(label, { act: o.act, variant: o.variant, icon: o.icon, block: true, size: o.size || 'md' }); } catch (e) { }
    }
    return '<button type="button" class="btn btn-' + o.variant + ' btn-block" data-act="' + o.act + '">' +
      (o.icon ? ic(o.icon) : '') + '<span>' + esc(label) + '</span></button>';
  }

  /* ------------------------------------------------------------------ settings sheet */
  function toggleRow(key, iconName, checked) {
    var id = 'set-' + key;
    return '<label class="switch-row set-row" for="' + id + '">' +
      '<span class="switch-text"><b>' + esc(t('set.' + key)) + '</b>' +
        '<small id="' + id + '-d">' + esc(t('set.' + key + 'd')) + '</small></span>' +
      '<input type="checkbox" role="switch" class="switch" id="' + id + '" data-act="setting" data-key="' + key + '"' +
        ' aria-describedby="' + id + '-d"' + (checked ? ' checked' : '') + '>' +
      // F45: the state in words beside the switch (a filled knob alone read as 'on' on a dim screen)
      '<span class="switch-state" aria-hidden="true" data-on="' + esc(t('set.on')) + '" data-off="' + esc(t('set.off')) + '"></span>' +
    '</label>';
  }

  function settingsHtml() {
    var s = SM.state.settings;
    return '<section class="set-group"><h3 class="set-gtitle">' + esc(t('set.gView')) + '</h3>' +
        '<div class="set-card">' +
          toggleRow('big', 'text-size', s.big) +
          toggleRow('ruby', 'ruby', s.ruby) +
          toggleRow('lang', 'globe', s.lang === 'en') +
          toggleRow('dark', 'moon', !!s.dark) +
          toggleRow('motion', 'motion', s.motion === 'reduce') +
        '</div></section>' +
      '<section class="set-group"><h3 class="set-gtitle">' + esc(t('set.gSup')) + '</h3>' +
        '<div class="set-card">' + toggleRow('sup', 'users', s.supporter) + '</div></section>' +
      '<section class="set-group"><h3 class="set-gtitle">' + esc(t('set.gPriv')) + '</h3>' +
        '<div class="set-card set-privacy">' +
          '<p class="set-priv"><span>' + esc(t('set.priv')) + '</span></p>' +
          (SM.store.available ? '' : '<p class="set-warn">' + esc(t('set.noStore')) + '</p>') +
          '<div class="set-erase">' + btn(t('set.erase'), { act: 'erase', variant: 'danger' }) + '</div>' +
          '<p class="set-note">' + esc(t('set.eraseNote')) + '</p>' +
        '</div></section>' +
      '<section class="set-group set-more"><h3 class="set-gtitle">' + esc(t('set.gMore')) + '</h3>' +
        (hasLearn() ? '<a class="set-link" href="#/learn"><span>' + esc(t('set.learn')) + '</span>' + ic('chevron-right') + '</a>' : '') +
        '<a class="set-link" href="#/about"><span>' + esc(t('set.about')) + '</span>' + ic('chevron-right') + '</a>' +
      '</section>' +
      '<p class="set-version">' + esc(t('set.version', { v: SM.version, d: SM.fmtDate(SM.updated) })) + '</p>';
  }

  function openSettings(focusSel) {
    SM.sheet(settingsHtml(), { title: t('set.title'), cls: 'sheet-settings', focus: focusSel });
  }
  SM.openSettings = openSettings;

  SM.on('setting', function (el) {
    var key = el.getAttribute('data-key');
    var on = !!el.checked;
    var s = SM.state.settings;
    if (key === 'lang') s.lang = on ? 'en' : 'ja';
    else if (key === 'sup') s.supporter = on;
    else if (key === 'motion') s.motion = on ? 'reduce' : 'auto';
    else s[key] = on;
    if (key === 'ruby') { if (!SM.state.hints || typeof SM.state.hints !== 'object') SM.state.hints = {}; SM.state.hints.jrRuby = true; }
    SM.save();
    var apply = function () {
      SM.applySettings();
      if (key === 'lang' || key === 'ruby') SM.paintShell();
      SM.render();
      // re-paint the sheet (language / furigana may have changed) and keep focus on the same switch
      openSettings('#set-' + key);
      // the re-painted switch is a new element: its knob still slides across on the snappy spring
      var sw = document.getElementById('set-' + key);
      if (sw && sw.animate && !(SM.motion && SM.motion.reduced && SM.motion.reduced())) {
        try {
          sw.animate([{ transform: 'translateX(' + (on ? 0 : 20) + 'px)' }, { transform: 'translateX(' + (on ? 20 : 0) + 'px)' }],
            { duration: 260, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.04)', pseudoElement: '::before' });
        } catch (e) { }
      }
    };
    var mo = SM.motion;
    // theme: a 200ms cross-fade of the whole screen, nothing moves (MOTION-SPEC §3.5)
    if (key === 'dark' && mo && mo.transition) { mo.transition('theme', apply); return; }
    // 文字を大きく / ふりがな / English re-flow the whole page: it cross-fades (the old page out 160ms, the new one in
    // 200ms) instead of snapping; furigana arrive a beat after their base text (motion.css html.m-ruby-in), so
    // the change reads as "readings added". The switch's knob has already slid on its spring.
    if ((key === 'big' || key === 'ruby' || key === 'lang') && mo && mo.transition && !(mo.reduced && mo.reduced())) {
      var de = document.documentElement;
      if (key === 'ruby' && on) { de.classList.add('m-ruby-in'); setTimeout(function () { de.classList.remove('m-ruby-in'); }, 900); }
      mo.transition('fade', apply);
      return;
    }
    apply();
  });

  SM.on('erase', function () {
    var html =
      '<div class="set-confirm">' +
        '<p class="set-confirm-body">' + esc(t('set.confirmBody')) + '</p>' +
        '<div class="set-confirm-actions">' +
          btn(t('set.confirmYes'), { act: 'erase-yes', variant: 'danger' }) +
          btn(t('set.confirmNo'), { act: 'erase-no', variant: 'secondary' }) +
        '</div>' +
      '</div>';
    SM.sheet(html, { title: t('set.confirmTitle'), cls: 'sheet-confirm', label: t('set.confirmTitle'), focus: '[data-act="erase-no"]' });
  });
  SM.on('erase-no', function () { openSettings('[data-act="erase"]'); });
  SM.on('erase-yes', function () {
    SM.store.clearAll();
    try { sessionStorage.setItem('sm2:erased', '1'); } catch (e) { }
    if (location.hash && location.hash !== '#/') {
      try { history.replaceState(null, '', location.pathname + location.search + '#/'); } catch (e) { location.hash = '#/'; }
    }
    location.reload();
  });

  /* ------------------------------------------------------------------ keyboard */
  /* The 2nd Esc within 1s always exits. Caught on window in the capture phase, which runs before every
     document listener: full-screen modes (窓口で見せる, 読みあげモード), the map and search boxes handle Esc
     themselves and stop it, and must never be able to swallow the quick exit. onKey below still closes a
     sheet and shows the "press again" hint on the first press. */
  var lastEscW = 0;
  // S4: an Esc (or Enter) that belongs to a kana→kanji conversion is the input method's, never the app's
  function composing(ev) { return !!(ev.isComposing || ev.keyCode === 229); }
  SM.composing = composing;
  function onEscFirst(ev) {
    if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
    if (composing(ev)) return;
    var n = Date.now();
    if (n - lastEscW < 1000) { ev.preventDefault(); ev.stopImmediatePropagation(); quickExit(); return; }
    lastEscW = n;
  }
  /* Tab never lands on content that is still fading in: when keyboard focus moves into an entrance that has not
     landed yet (scrolled in by the Tab itself, or still waiting on its stagger), that block and its siblings land
     at once through SM.motion.finishAll, and any running animation on the way up (a view's own entrance) jumps to
     its end. Only Tab moves count, so the h1 focus after a route keeps its entrance. */
  var lastTab = 0;
  function onTabKey(ev) { if (ev.key === 'Tab') lastTab = Date.now(); }
  function onFocusReveal(ev) {
    if (Date.now() - lastTab > 400) return;
    var el = ev.target, M = SM.motion;
    if (!el || !el.closest) return;
    var p = el.closest('.m-pending, .m-in'), top = p, up;
    if (p && M && M.finishAll) {
      while (top.parentElement && (up = top.parentElement.closest('.m-pending, .m-in'))) top = up;
      try { M.finishAll(top.parentElement || document, { all: true, noFlush: true }); } catch (e) { }
    }
    for (var n = el; n && n !== document.body && n.getAnimations; n = n.parentElement) {
      var an = n.getAnimations();
      for (var i = 0; i < an.length; i++) {
        try { if (an[i].playState !== 'finished' && isFinite(an[i].effect.getComputedTiming().endTime)) an[i].finish(); } catch (e) { }
      }
    }
  }
  var lastEsc = 0;
  function onKey(ev) {
    if (ev.key === 'Tab') { SM._trapTab(ev); return; }
    if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
    if (composing(ev)) return;
    var now = Date.now();
    // the 2nd Esc within 1s always exits, even if the 1st one closed a sheet or cleared a search box
    if (now - lastEsc < 1000) { ev.preventDefault(); quickExit(); return; }
    lastEsc = now;
    if (SM.sheetOpen()) { ev.preventDefault(); SM.closeSheet(); SM.toast(t('core.escAgain'), 1000); return; }
    SM.toast(t('core.escAgain'), 1000);
  }

  /* ------------------------------------------------------------------ start */
  function idle(f) { if (window.requestIdleCallback) window.requestIdleCallback(f, { timeout: 2500 }); else setTimeout(f, 250); }
  function afterLaunch(fn) {
    var L = window.__lx, done = false;
    var go = function () { if (done) return; done = true; idle(fn); };
    if (L && L.mode && !L.done) {
      document.addEventListener('sm:launched', go);
      setTimeout(go, 4000);   // never wait on an opening that did not report back
    } else setTimeout(go, 600);   // no opening: after the first screen has settled
  }
  SM.start = function () {
    if (SM._started || SM._starting) return;
    // S2: _started (read by the head gate's "could not start" card) is set only once the first screen is up, so a
    // start that throws shows that card, with its 保存した内容を消して開く button, instead of a blank page
    SM._starting = true;
    SM.applySettings();
    SM.paintShell();
    SM._bindEvents();
    window.addEventListener('keydown', onEscFirst, true);
    window.addEventListener('keydown', onTabKey, true);
    document.addEventListener('focusin', onFocusReveal, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', function () { if (SM._onHashChange) SM._onHashChange(); else SM._route(); });
    if (SM._guardStart) SM._guardStart();   // a deep link: the phone's Back goes to the parent screen, not out
    document.documentElement.classList.add('js');
    SM._route();
    SM._started = true;
    // 緊急 tapped before the app started: the static list (index.html #sos-static) hands over to the full sheet,
    // which slides up over it; the list goes once the sheet covers it
    var sst = document.getElementById('sos-static');
    if (sst && !sst.hidden) {
      var sb = document.querySelector('.appbar [data-act="sos"]');
      try { if (sb) sb.focus({ preventScroll: true }); } catch (e) { }
      try { sst.inert = true; } catch (e) { }
      openSOS();
      setTimeout(function () { sst.hidden = true; try { sst.inert = false; } catch (e) { } }, 450);
    }
    // once the opening is over: the other views in idle time, and the web fonts if the head gate held them back
    afterLaunch(function () {
      var L = window.__lx;
      if (L && L.fonts === 'later' && L.loadFonts) idle(function () { try { L.loadFonts(); } catch (e) { } });
      if (SM.preloadViews) SM.preloadViews();
    });
    try {
      if (sessionStorage.getItem('sm2:erased')) { sessionStorage.removeItem('sm2:erased'); SM.toast(t('set.erased')); }
    } catch (e) { }
    // keep everything in one tab when the app is installed / opened offline
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      if (exited) {
        // restored from the back/forward cache after a quick exit: never show the app again, leave at once
        try { location.replace('https://www.google.co.jp/search?q=%E5%A4%A9%E6%B0%97'); } catch (x) { }
        return;
      }
      document.body.style.visibility = '';
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', SM.start);
  else SM.start();
})();
;
/* ---- js/launch.js ---- */
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
  // S1: this build's copy of each file (?v=<build id>), never last release's from the cache
  function vs(src) { return SM._vsrc ? SM._vsrc(src) : (w.__smV ? src + '?v=' + encodeURIComponent(w.__smV) : src); }
  function hasTag(sel, attr, src) {
    var list = d.querySelectorAll(sel), v = vs(src);
    for (var i = 0; i < list.length; i++) { var a = list[i].getAttribute(attr); if (a === src || a === v) return list[i]; }
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
          l.rel = 'stylesheet'; l.href = vs(MAP_CSS);
          d.head.appendChild(l);
        }
        var last = null;
        MAP_JS.forEach(function (src) {
          if (hasTag('script', 'src', src)) return; // someone else added it; the poll below notices when it ran
          var s = d.createElement('script');
          s.src = vs(src); s.async = false; // execute in insertion order
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
