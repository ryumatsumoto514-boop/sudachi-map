/* 巣立ちマップ v5 — core (ENGINE)
 * Defines window.SM: store, state, i18n, router, delegated events, sheet, toast, copy, furigana.
 * Navigation runs through SM.motion.transition (MOTION-SPEC §3): the update callback renders, mounts,
 * writes chrome classes, restores scroll and focuses — in that order, with no layout reads before the
 * scroll restore. Classic script. No modules, no network. */
(function () {
  'use strict';

  var SM = window.SM = window.SM || {};
  SM.version = '4.0.0';
  SM.updated = '2026-10-17';
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
  function defaults() {
    return {
      answers: { stage: null, path: null, area: null, concerns: [], age: null, care: null },
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
  function merge(base, over) {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return base;
    Object.keys(over).forEach(function (k) {
      var b = base[k], o = over[k];
      if (b && typeof b === 'object' && !Array.isArray(b) && o && typeof o === 'object' && !Array.isArray(o)) merge(b, o);
      else if (Array.isArray(b)) { if (Array.isArray(o)) base[k] = o; }
      else base[k] = o;
    });
    return base;
  }
  SM.state = merge(defaults(), SM.store.get('state', null));
  if (!Array.isArray(SM.state.answers.concerns)) SM.state.answers.concerns = [];
  if (!Array.isArray(SM.state.learned)) SM.state.learned = [];
  if (!SM.state.hints || typeof SM.state.hints !== 'object') SM.state.hints = { jrRuby: false };

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

  SM.save = function () { SM.store.set('state', SM.state); };
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
    'core.saved': { ja: 'やることに追加しました', en: 'Added to your to-do list' },
    'core.unsaved': { ja: 'やることから外しました', en: 'Removed from your to-do list' },
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
    Array.prototype.forEach.call(root.querySelectorAll('ruby:not(.is-long)'), function (r) {
      var box = r.parentElement;
      while (box && box !== root && /^inline/.test(getComputedStyle(box).display)) box = box.parentElement;
      if (box && box.clientWidth && r.getBoundingClientRect().width > box.clientWidth + 1) r.classList.add('is-long');
    });
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
          SM.go(link.getAttribute('href'));
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
  var sheetState = null; // { opener, onClose, dlg, overlay, ctl, title }
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
      sheetState = { opener: opener, onClose: opts.onClose || null, dlg: dlg, overlay: ov, ctl: ctl, title: title };
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
  function loadScript(src) {
    if (needP[src]) return needP[src];
    if (hasStatic(src)) return (needP[src] = Promise.resolve());
    needP[src] = new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el._smLazy = true;
      el.src = src; el.async = false;
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
  /* A view that reads another view's helpers on its first screen waits for them: home's やること preview counts
     down to 高校入学 for 中学生 (SM.plan.anchor in plan.js). Tried once per name, so a broken file can't loop. */
  var depsTried = {};
  function viewDeps(name) {
    if (depsTried[name]) return null;
    var st = SM.state || {};
    if (name === 'home' && !SM.plan && SM.isJunior() && ((st.saved || []).length || st.hsDate)) return lazyFiles('plan');
    return null;
  }
  /* Idle preload: the views people open next first (さがす, a program page), then the rest. On data saver or a
     2g/3g connection only those two. One group at a time, each in its own idle slot. */
  var preloaded = false;
  SM.preloadViews = function () {
    if (preloaded) return;
    preloaded = true;
    var c = navigator.connection, lean = !!(c && (c.saveData || /2g|3g/.test(c.effectiveType || '')));
    var order = lean ? ['find', 'p'] : ['find', 'p', 'plan', 'learn', 'map', 'tools', 'about'];
    var idle = window.requestIdleCallback ? function (f) { window.requestIdleCallback(f, { timeout: 3000 }); } : function (f) { setTimeout(f, 300); };
    (function next() {
      var name = order.shift();
      if (!name) return;
      idle(function () { SM.needView(name).then(next, next); });
    })();
  };

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
  var TAB_ROOTS = { '#/': 1, '#/find': 1, '#/map': 1, '#/plan': 1, '#/learn': 1 };
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
      SM.need(missing || deps).then(function () {
        lazyLoading(false);
        var now = location.hash && location.hash !== '#' ? location.hash : '#/';
        if (now === current.hash && current.name) return;   // routed meanwhile (e.g. another load finished first)
        if (!findView(parseHash(now).name) && parseHash(now).name === r.name) { lazyFailed(); return; }
        SM._route();
      }, function (e) {
        lazyLoading(false);
        console.error(e);
        if (deps) { SM._route(); return; }   // the view itself is here: show it without the extra
        if (parseHash(location.hash).name === r.name) lazyFailed();
      });
      return;
    }
    if (!findView(r.name)) {
      if (r.name !== 'home') { location.replace('#/'); return; }
    }
    var hash = raw && raw !== '#' ? raw : '#/';
    // detect "back": target equals the entry before the current one
    var isBack = navStack.length > 1 && navStack[navStack.length - 2] === hash;
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
      if (SM.sheetOpen()) SM.closeSheet({ noFocus: true, instant: true });
      doRender(true, { instant: instant });
      // scroll, then focus: the only two steps that may read layout (MOTION-SPEC §3.3)
      try { window.scrollTo({ top: restoreY, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, restoreY); }
      var main = document.getElementById('view');
      if (!wasFirst && main) focusAfterNav(kind, hash, main);
    }, { from: prevHash, to: hash, sameTitle: sameTitle });
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
      if (sheetState) SM.closeSheet(); else x.click();
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
