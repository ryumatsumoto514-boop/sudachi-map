/* 巣立ちマップ v8 — js/views/home.js (HOME)
   Home (#/) as a PATH (SPEC-v8 workstream 1). Within one screen the person sees what this is, the three things
   they can do, where they are on that path, and the one next step:

     .h-mast    関東版 ─────── 支援 N件・ログインなし
     .h-hero    kicker (施設や里親家庭を出る人へ) · one headline (支援を見つけて、やることに。) · one sub-line
     .h-path    the route of three stations on the green line — 1 しらべる → 2 見つける → 3 やること.
                Each station is an ink square with its number (done = green with a check, now = solid ink like the
                logo's 巣 box, ahead = an outline). The current station carries 「いまここ」, the one fact that
                matters there and the ONE green CTA; done stations show what was done (the answers, N件・保存 M件,
                できた d／t・あとN日) and link back. The returning state therefore reads 「ここまで来た、次はこれ」.
     .h-ask     ことばで きく — a fill-in line that routes to #/ask/<words> (nothing is sent).
     .h-art     the walk: the picture whose figure walks toward the new home as it scrolls through the viewport
                (CSS scroll-driven animation; rAF fallback; reduced motion = the final picture).
     then the stations of the page: 困りごと (6 kanji marks on one line that fills with scroll), 今すぐ話したい
     (timetable), まなぶ (line of lessons), ツール, 支援者, 奥付.
   Desktop (≥ 760px of column): headline left / picture right, the path across the whole width, きく under it.
   中学生 (body.is-junior): jr copy, jr picture, counts only for what fits them, まなぶ before 困りごと.

   Motion: the opening (launch.js) lands its line in the app bar; home picks it up: the masthead rule draws, the
   headline lines rise, the path line draws down (across on desktop) and the stations stamp in as it reaches them,
   the CTA springs, the crisis link slides in (CSS choreography under .h-play; delays from ENTER). Below the fold:
   the route line fills with scroll, counts roll when visible, section heads settle as their rules draw, the
   timetable dots run, the まなぶ line fills. Reduced motion: short fades, the final state at once. If JS fails,
   everything stands (nothing is hidden without .h-play / .m-pending). Strings: ja, jr, en. */
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
    return '<span class="arrow" aria-hidden="true"></span>';
  }
  function illus(name, o) {
    try { return SM.illus && SM.illus.has && SM.illus.has(name) ? SM.illus(name, o) : ''; } catch (e) { return ''; }
  }
  function reduced() { try { return !!(SM.motion && SM.motion.reduced && SM.motion.reduced()); } catch (e) { return false; } }
  /* a number about to roll is blank while its host starts to rise (css: .x-rolls), so the final value never
     flashes before the board rolls up to it */
  function rollCls(key, n) {
    if (mode === 'none') return '';
    try { return SM.motion && SM.motion.seen && SM.motion.seen(key) !== n ? ' x-rolls' : ''; } catch (e) { return ''; }
  }

  SM.strings && SM.strings({
    'home.title': { ja: 'ホーム', en: 'Home' },

    /* masthead */
    'home.ed': { ja: '関東版', en: 'Kanto edition' },
    'home.mast': { ja: 'このサイトについて', en: 'About this site' },
    'home.mastCount': { ja: '支援 {n}件', en: '{n} programs' },
    'home.f.login': { ja: 'ログインなし', en: 'No login' },
    'home.unit': { ja: '件', en: '' },

    /* hero */
    'home.kicker': { ja: '施設や里親家庭を出る人へ', jr: '施設や里親家庭でくらす中学生へ', en: 'For young people leaving care' },
    'home.h1a': { ja: '支援を見つけて、', jr: '支援を見つけて、', en: 'Find support.' },
    'home.h1b': { ja: 'やることに。', jr: 'やることに。', en: 'Make it your plan.' },
    'home.sub': { ja: '名前もログインもいらない。', jr: '名前もログインもいらない。', en: 'No name, no login, nothing sent.' },
    'home.pathLabel': { ja: 'この先の道のり', en: 'The path' },
    'home.crisis': { ja: '今夜いる場所がない・家にいられない', jr: '家にいられない・帰れないとき', en: 'Nowhere to stay tonight?' },

    /* the three stations */
    'home.st1': { ja: 'しらべる', jr: 'しらべる', en: 'Answer' },
    'home.st2': { ja: '見つける', jr: '見つける', en: 'Find' },
    'home.st3': { ja: 'やること', jr: 'やること', en: 'Do' },
    'home.here': { ja: 'いまここ', jr: 'いまここ', en: 'You are here' },
    'home.doneSr': { ja: 'おわった', en: 'done' },
    'home.aheadSr': { ja: 'このあと', en: 'ahead' },
    'home.st1.todo': { ja: '6つの質問・3分', jr: '6つの質問・3分', en: '6 questions · 3 min' },
    'home.st1.change': { ja: '変える', en: 'Change' },
    'home.st1.changeSr': { ja: '答えを変える', en: 'Change your answers' },
    'home.st2.todo': { ja: 'あなたに合う支援が出る', jr: 'きみに合う支援が出る', en: 'See what fits you' },
    'home.st2.fit': { ja: '合いそうな支援 {n}件', jr: '合いそうな支援 {n}件', en: '{n} may fit you' },
    'home.st2.fitNone': { ja: '結果ができている', en: 'Your results are ready' },
    'home.st2.saved': { ja: '保存 {n}件', en: '{n} saved' },
    'home.st2.go': { ja: '結果', en: 'Results' },
    'home.st3.todo': { ja: '保存して、順番にやる', jr: '保存して、順番にやる', en: 'Save it, do it in order' },
    'home.st3.done': { ja: 'できた {d}／{t}', en: '{d} of {t} done' },
    'home.st3.saved': { ja: '保存 {n}件', en: '{n} saved' },
    'home.st3.next': { ja: 'つぎ', en: 'Next' },
    'home.st3.allDone': { ja: 'ぜんぶできた', en: 'All done' },
    'home.st3.noDate': { ja: '巣立ちの日は、やることで決める', jr: '高校入学の日は、やることで決める', en: 'Set the day in your to-do list' },
    'home.cta': { ja: '質問に答える', jr: '質問に答える', en: 'Answer 6 questions' },
    'home.seeResults': { ja: '結果を見る', en: 'See results' },
    'home.planGo': { ja: 'やることをひらく', en: 'Open my to-do list' },
    'home.daysTo': { ja: '巣立ちまで', jr: '高校入学まで', en: 'Until you leave' },
    'home.daysToJr': { ja: '高校入学まで', en: 'Until high school' },
    'home.daysPre': { ja: 'あと', en: '' },
    'home.daysUnit': { ja: '日', en: 'days' },
    'home.daysAssumed': { ja: '仮', en: 'est.' },
    'home.daysToday': { ja: '今日が巣立ちの日。おめでとう。', en: 'Today is your leaving day.' },
    'home.daysSince': { ja: '巣立って {n}日', en: '{n} days since you left' },

    /* きく */
    'home.askK': { ja: 'ことばで きく', en: 'Ask in your own words' },
    'home.askPh': { ja: '例：家賃がはらえない', jr: '例：高校 お金', en: 'e.g. can’t pay rent' },
    'home.askGo': { ja: 'きく', en: 'Ask' },
    'home.askLabel': { ja: '困っていることを、ことばで入力', en: 'Type what is worrying you' },

    /* 困りごと (the route) */
    'home.catsTitle': { ja: '困りごとから見る', en: 'Browse by need' },
    'home.catsAll': { ja: 'すべて見る', en: 'See all' },
    'home.catsFor': { ja: '{area}の人に合う数', en: 'Counts for {area}' },
    'home.catCount': { ja: '{name} {n}件', en: '{name}: {n}' },

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
    'home.t.yorisoi': { ja: '24時間・なんでも', en: '24 hours·Anything' },
    'home.t.ibasho': { ja: '24時間・チャット', en: '24 hours·Chat' },
    'home.t.wakanavi': { ja: '東京都・若者向け', en: 'Tokyo·Youth' },
    'home.t.b4s': { ja: '施設・里親家庭の出身者', en: 'Grew up in care' },
    'home.t.kodomoSos': { ja: '24時間・いじめ・家', en: '24 hours·Bullying·Home' },
    'home.t.childline': { ja: '18歳まで', en: 'Up to 18' },
    'home.t.prefYouth': { ja: '{pref}・若者向け', en: '{pref}·Youth' },
    'home.t.prefKids': { ja: '{pref}・子ども向け', en: '{pref}·Children' },
    'home.chatTalk': { ja: 'チャットで話す', en: 'Chat now' },
    'home.lineTalk': { ja: 'LINEで話す', en: 'Talk on LINE' },

    /* まなぶ */
    'home.learnTitle': { ja: 'まなぶ', en: 'Learn' },
    'home.learnAll': { ja: 'すべて見る', en: 'All lessons' },
    'home.learnDoneOf': { ja: '{total}本のうち {done}本おわった', en: '{done} of {total} done' },
    'home.learnProgK': { ja: 'おわった', en: 'done' },
    'home.learnNext': { ja: 'つぎ', en: 'Next' },
    'home.learnFirst': { ja: 'ここから', en: 'Start here' },
    'home.learnResumeK': { ja: 'とちゅう', en: 'In progress' },
    'home.learnResume': { ja: '続きから', en: 'Continue' },
    'home.learnStart': { ja: 'はじめる', en: 'Start' },
    'home.learnAgain': { ja: 'もう一度', en: 'Read again' },
    'home.learnAt': { ja: '{n}/{total}', en: '{n}/{total}' },
    'home.learnMin': { ja: '{n}分', en: '{n} min' },
    'home.learnAllDone': { ja: '全部おわった', en: 'All done' },
    'home.learnDone': { ja: 'おわった', en: 'done' },
    'home.learnFor': { ja: '中学生向け', en: 'Junior high' },
    'home.learnUp': { ja: 'このあと', en: 'Up next' },
    'home.learnIntro': { ja: '{n}のレッスン・1つ{min}分', jr: '{n}のレッスン・1つ{min}分', en: '{n} lessons · {min} min each' },
    'home.learnIntroN': { ja: '{n}のレッスン', en: '{n} lessons' },

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

    /* 奥付 */
    'home.colo.title': { ja: '巣立ちマップ', en: 'Sudachi Map' },
    'home.colo.ed': { ja: '関東版', en: 'Kanto edition' },
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
    if (d) h = h.replace('data-reveal="rule" data-reveal-delay="80"', 'data-reveal="rule" data-reveal-delay="' + (d + 40) + '"');
    return h;
  }
  function updated() { return SM.updated || '2026-10-26'; }
  function fmtDate(d) { try { return SM.fmtDate ? SM.fmtDate(d) : d; } catch (e) { return d; } }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function isoOf(d) {
    if (typeof d === 'string') return d;
    if (!(d instanceof Date) || isNaN(d)) return null;
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
  function checkSvg() {
    return '<svg class="h-st-check" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false"><path d="m5 12.5 4.5 4.5 9.5-10"/></svg>';
  }

  /* ------------------------------------------------------------ area rule (SPEC-v7 data contract, via SM.matchUtil) */
  function codeOf(x) { return String(x == null ? '' : x); }
  function U() { return SM.matchUtil || {}; }
  function prefOfCode(c) { try { return (U().prefOf && U().prefOf(c)) || ''; } catch (e) { return ''; } }
  function usable(p, area) {
    try { if (U().usableIn) return !!U().usableIn(p, U().cleanArea ? U().cleanArea({ area: area }) : area); } catch (e) { /* ignore */ }
    return true;
  }
  var countsMemo = null;
  function catCounts() {
    var a = answers();
    var key = JSON.stringify(a) + '|' + programs().length;
    if (countsMemo && countsMemo.key === key) return countsMemo.c;
    var c = {};
    try { if (U().catCounts) c = U().catCounts(a); } catch (e) { c = {}; }
    countsMemo = { key: key, c: c };
    return c;
  }
  function areaName(code) {
    try { var a = SM.area ? SM.area(code) : null; if (a) return en() ? (a.en || a.name) : a.name; } catch (e) { /* ignore */ }
    try {
      var ps = (SM.data && SM.data.prefs) || [];
      for (var i = 0; i < ps.length; i++) if (codeOf(ps[i].code) === codeOf(code)) return en() ? (ps[i].en || ps[i].name) : ps[i].name;
    } catch (e) { /* ignore */ }
    return '';
  }
  function fitCount() {
    // the same count as the results page and さがす (city-only rows wait in their own group there)
    try { if (SM.match) return SM.match(answers()).filter(function (r) { return !r.local; }).length; } catch (e) { /* ignore */ }
    return null;
  }
  function savedItems() { return ((SM.state && SM.state.saved) || []).map(prog).filter(Boolean); }

  /* ------------------------------------------------------------ entrance choreography
     ms after the entrance starts: the opening's release (first visit) or the mount (returning beat, a tab opened
     for the first time this session). Hero parts are CSS (--d, css .h-play); the rest are SM.motion reveals. */
  var ENTER = {
    launch: { mast: 0, kicker: 40, l1: 90, l2: 150, sub: 230, path: 260, stop: 120, cta: 600, crisis: 250, ask: 760, art: 420, head: 800, route: 860, nudge: 1200 },
    short: { mast: 0, kicker: 20, l1: 60, l2: 110, sub: 170, path: 200, stop: 95, cta: 480, crisis: 190, ask: 600, art: 320, head: 640, route: 700, nudge: 1000 }
  };
  var mode = 'none', T = null;
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
  // one hero part of the CSS choreography: its kind (line | rise | cta | slide | draw | art | path | stamp) and delay
  function ha(kind, key, extra) {
    if (!T) return '';
    var d = typeof key === 'number' ? key : T[key];
    return ' data-h="' + kind + '" style="--d:' + (d + (extra || 0)) + 'ms"';
  }
  function hline(cls, key, html) {
    return '<span class="' + cls + ' h-ln-o"' + (T ? ' data-h="line"' : '') + '><span class="h-ln-i"' + (T ? ' style="--d:' + T[key] + 'ms"' : '') + '>' + html + '</span></span>';
  }

  /* ------------------------------------------------------------ masthead: 関東版 ─────── 支援 N件・ログインなし */
  function mast() {
    var n = junior() ? (catCounts()._all || listed()) : listed();
    var num = '<b class="num h-mast-n' + rollCls('home.total', n) + '" data-count="' + n + '" data-count-seen="home.total" data-count-dur="900"' +
      (T ? ' data-reveal-delay="' + (T.mast + 120) + '"' : '') + '>' + n + '</b>';
    var count = t('home.mastCount', { n: '\u0000' }).split('\u0000');
    return '<div class="h-mast"' + ha('draw', 'mast') + '>' +
      '<p class="h-mast-ed">' + esc(t('home.ed')) + '</p>' +
      '<p class="h-mast-facts" aria-label="' + esc(t('home.mast')) + '"><span>' + esc(count[0] || '') + num + esc(count[1] || '') + '</span>' +
        '<span class="h-mast-sep" aria-hidden="true"></span><span>' + esc(t('home.f.login')) + '</span></p>' +
    '</div>';
  }

  /* ------------------------------------------------------------ the person's place on the path */
  function planModel() {
    try { if (SM.plan && typeof SM.plan.build === 'function') return SM.plan.build(); } catch (e) { /* ignore */ }
    return null;
  }
  function progress() {
    var st = SM.state || {};
    var jr = junior();
    var saved = savedItems();
    var answered = !!st.answered;
    var model = planModel();
    var leave = jr ? st.hsDate : st.leaveDate;
    var anchorISO = model && model.anchor ? isoOf(model.anchor) : leave || null;
    var assumed = !!(model && model.assumed);
    if (!model && !leave) anchorISO = null;
    var days = anchorISO ? dayDiff(anchorISO) : null;
    var next = null, done = 0, total = 0, allDone = false;
    if (model && model.groups && model.groups.length) {
      done = model.done || 0; total = model.total || 0;
      allDone = total > 0 && done === total;
      var order = [];
      if (model.cur >= 0) order.push(model.groups[model.cur]);
      model.groups.forEach(function (g, i) { if (i !== model.cur) order.push(g); });
      for (var i = 0; i < order.length && !next; i++) {
        var g = order[i];
        for (var j = 0; j < (g.all || []).length; j++) if (!g.all[j].done) { next = g.all[j]; break; }
      }
    }
    var cur = !answered ? 1 : saved.length ? 3 : 2;
    return { jr: jr, answered: answered, saved: saved, savedN: saved.length, fit: answered ? fitCount() : null, model: model, days: days, assumed: assumed, hasDate: !!anchorISO,
      next: next, done: done, total: total, allDone: allDone, cur: cur };
  }

  /* ------------------------------------------------------------ hero: kicker · headline · sub-line */
  function heroCopy() {
    return '<div class="h-copy"><h1 class="h-title" id="h-title" tabindex="-1">' +
      hline('h-kicker', 'kicker', esc(t('home.kicker'))) +
      hline('h-main', 'l1', esc(t('home.h1a'))) +
      hline('h-main', 'l2', esc(t('home.h1b'))) +
    '</h1>' + hline('h-sub', 'sub', esc(t('home.sub'))) + '<div class="h-crisis-w">' + crisisLink() + '</div></div>';
  }
  function cta(label, href) {
    if (SM.ui && SM.ui.button) return SM.ui.button(label, { href: href, variant: 'primary', size: 'lg', block: true, cls: 'h-cta', attrs: 'data-press' });
    return '<a class="btn btn-primary btn-lg btn-block h-cta" href="' + esc(href) + '" data-press><span>' + esc(label) + '</span>' + arrow() + '</a>';
  }
  // 中学生: straight to the SOS sheet (189 and 子供SOS first there); otherwise the 住まい page (tonight's numbers)
  function crisisLink() {
    var inner = '<span>' + esc(t('home.crisis')) + '</span>' + arrow();
    return junior() ? '<button type="button" class="btn btn-text h-crisis" data-act="sos" aria-haspopup="dialog" data-press' + ha('slide', 'crisis') + '>' + inner + '</button>' :
      '<a class="btn btn-text h-crisis" href="#/find/cat/housing" data-press' + ha('slide', 'crisis') + '>' + inner + '</a>';
  }

  /* ------------------------------------------------------------ the path: three stations on the green line */
  function answersSummary() {
    try {
      if (!SM.matchSummary) return '';
      return SM.matchSummary(answers()).filter(function (r) {
        return r.set && r.label && (r.key === 'stage' || r.key === 'path' || r.key === 'area');
      }).map(function (r) { return r.label; }).join(en() ? ' · ' : '・');
    } catch (e) { return ''; }
  }
  function numHtml(n, key, dur, delay) {
    return '<b class="num' + rollCls(key, n) + '" data-count="' + n + '" data-count-seen="' + key + '" data-count-dur="' + (dur || 700) + '"' + (T && delay != null ? ' data-reveal-delay="' + delay + '"' : '') + '>' + n + '</b>';
  }
  function daysFact(P, delay) {
    if (!P.hasDate || P.days === null) return '<span class="h-st-f is-quiet">' + esc(t('home.st3.noDate')) + '</span>';
    if (P.days > 0) {
      return '<span class="h-st-f h-st-days"><span class="h-st-days-k">' + esc(t(P.jr ? 'home.daysToJr' : 'home.daysTo')) +
        (P.assumed ? '<span class="h-st-tag">' + esc(t('home.daysAssumed')) + '</span>' : '') + '</span>' +
        '<span class="h-st-days-v">' + (t('home.daysPre') ? '<span class="h-st-days-pre">' + esc(t('home.daysPre')) + '</span>' : '') +
        numHtml(P.days, 'home.days', 760, delay) + '<span class="h-st-days-u">' + esc(t('home.daysUnit')) + '</span></span></span>';
    }
    if (P.days === 0) return '<span class="h-st-f">' + esc(t('home.daysToday')) + '</span>';
    return '<span class="h-st-f">' + esc(t('home.daysSince', { n: -P.days })) + '</span>';
  }
  /* station 3's facts: progress (できた d／t), the next task, the countdown — from the やること model when its
     files are in (plan.js is lazy; mount() fetches it and swaps these in place), else from the state alone */
  function st3Facts(P, delay) {
    var out = '', first = '';
    if (P.model && P.total) {
      first = '<span class="h-st-f"><span class="h-st-prog">' + esc(t('home.st3.done', { d: '\u0000', t: P.total })).split('\u0000').map(function (s, i) {
        return i === 0 ? esc(s) + numHtml(P.done, 'home.planDone', 600, delay) : esc(s);
      }).join('') + '</span></span>';
    } else if (P.savedN) first = '<span class="h-st-f">' + esc(t('home.st3.saved', { n: P.savedN })) + '</span>';
    // one line: できた d／t · 巣立ちまで あと N日 (the next task is one line below, cut with …; the whole text is on #/plan)
    out += '<span class="h-st-duo">' + first + daysFact(P, delay) + '</span>';
    if (P.model && P.total) {
      if (P.next) out += '<span class="h-st-f h-st-next" title="' + esc(P.next.text) + '"><span class="h-st-next-k">' + esc(t('home.st3.next')) + '</span><span class="h-st-next-t">' + esc(P.next.text) + '</span></span>';
      else if (P.allDone) out += '<span class="h-st-f">' + esc(t('home.st3.allDone')) + '</span>';
    }
    return out;
  }
  function station(i, state, o) {
    var name = t('home.st' + i);
    var sr = state === 'done' ? t('home.doneSr') : state === 'now' ? t('home.here') : t('home.aheadSr');
    var d = T ? T.path + 80 + (i - 1) * T.stop : 0;
    var no = '<span class="h-st-no"' + ha('stamp', d) + ' aria-hidden="true">' + (state === 'done' ? checkSvg() : '<span class="num">' + i + '</span>') + '</span>';
    var here = state === 'now' ? '<span class="h-st-here" aria-hidden="true">' + esc(t('home.here')) + '</span>' : '';
    var nameHtml = '<h2 class="h-st-name" id="h-st' + i + '"><span class="sr-only">' + i + '. </span>' + esc(name) + '<span class="sr-only">（' + esc(sr) + '）</span>' + here + '</h2>';
    var body;
    if (o.href && state === 'done') {
      body = '<a class="h-st-a" href="' + esc(o.href) + '" data-press="ink">' +
        '<span class="h-st-text"' + ha('rise', d, 60) + '>' + nameHtml + '<span class="h-st-facts">' + o.facts + '</span></span>' +
        '<span class="h-st-go"' + ha('rise', d, 60) + '><span' + (o.goSr ? ' aria-hidden="true"' : '') + '>' + esc(o.go || '') + '</span>' +
        (o.goSr ? '<span class="sr-only">' + esc(o.goSr) + '</span>' : '') + arrow() + '</span></a>';
    } else {
      body = '<div class="h-st-text"' + ha('rise', d, 60) + '>' + nameHtml + '<span class="h-st-facts">' + o.facts + '</span></div>' +
        (o.cta ? '<div class="h-st-cta"><div class="h-cta-w"' + ha('cta', 'cta') + '>' + cta(o.cta, o.href) + '</div></div>' : '');
    }
    return '<li class="h-st is-' + state + '" data-st="' + i + '" style="--i:' + (i - 1) + '">' + no + '<div class="h-st-body">' + body + '</div></li>';
  }
  function path(P) {
    var s1 = P.answered ? 'done' : 'now';
    var s2 = P.savedN ? 'done' : P.answered ? 'now' : 'ahead';
    var s3 = P.savedN ? 'now' : 'ahead';
    var fitDelay = T ? T.path + 80 + T.stop + 60 : null;
    var ans = P.answered ? answersSummary() : '';
    var f1 = P.answered ? '<span class="h-st-f">' + esc(ans || t('home.st1.todo')) + '</span>' : '<span class="h-st-f">' + esc(t('home.st1.todo')) + '</span>';
    var f2;
    if (!P.answered) f2 = '<span class="h-st-f is-quiet">' + esc(t('home.st2.todo')) + '</span>';
    else {
      var fit = P.fit != null && P.fit > 0 ? t('home.st2.fit', { n: '\u0000' }).split('\u0000').map(function (s, i) { return i === 0 ? esc(s) + numHtml(P.fit, 'home.fit', 760, fitDelay) : esc(s); }).join('') : esc(t('home.st2.fitNone'));
      f2 = '<span class="h-st-f">' + fit + '</span>' + (P.savedN ? '<span class="h-st-f">' + esc(t('home.st2.saved', { n: P.savedN })) + '</span>' : '');
    }
    var f3 = s3 === 'now' ? st3Facts(P, T ? T.path + 80 + 2 * T.stop + 60 : null) : '<span class="h-st-f is-quiet">' + esc(t('home.st3.todo')) + '</span>' + (P.hasDate && P.days > 0 ? daysFact(P, null) : '');
    var stops =
      station(1, s1, { href: '#/find/q/1', facts: f1, cta: s1 === 'now' ? t('home.cta') : '', go: t('home.st1.change'), goSr: t('home.st1.changeSr') }) +
      station(2, s2, { href: s2 === 'ahead' ? '' : '#/find/results', facts: f2, cta: s2 === 'now' ? t('home.seeResults') : '', go: t('home.st2.go'), goSr: t('home.seeResults') }) +
      station(3, s3, { href: '#/plan', facts: f3, cta: s3 === 'now' ? t('home.planGo') : '' });
    var doneN = s3 === 'now' ? 2 : s2 === 'now' ? 1 : 0;
    var attr = ha('path', 'path');
    if (T) attr = attr.replace('style="', 'style="--stop:' + T.stop + 'ms;');
    return '<ol class="h-path" role="list" aria-label="' + esc(t('home.pathLabel')) + '" data-done="' + doneN + '"' + attr + '>' +
      '<span class="h-path-ln" aria-hidden="true"><span class="h-path-ln-done"></span></span>' + stops + '</ol>';
  }

  /* ------------------------------------------------------------ きく: a fill-in line that routes to #/ask/<words> */
  function ask() {
    var d = T ? ' data-h="rise" style="--d:' + T.ask + 'ms"' : '';
    return '<form class="h-ask" role="search" action="#/ask" data-h-ask' + d + '>' +
      '<label class="h-ask-k" for="h-ask-in"><span class="h-ask-ic">' + ic('search') + '</span><span>' + esc(t('home.askK')) + '</span></label>' +
      '<span class="h-ask-line"><input class="h-ask-in" id="h-ask-in" name="q" type="search" enterkeyhint="search" autocomplete="off" spellcheck="false" maxlength="80"' +
        ' placeholder="' + esc(t('home.askPh')) + '" aria-label="' + esc(t('home.askLabel')) + '">' +
        '<button class="h-ask-go" type="submit" data-press><span>' + esc(t('home.askGo')) + '</span>' + arrow() + '</button></span>' +
    '</form>';
  }
  function goAsk(form) {
    var inp = form && form.querySelector('input');
    var q = inp ? String(inp.value || '').replace(/\s+/g, ' ').trim() : '';
    var h = q ? '#/ask/' + encodeURIComponent(q) : '#/ask';
    try { if (SM.go) { SM.go(h); return; } } catch (e) { /* ignore */ }
    location.hash = h;
  }
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || !f.hasAttribute || !f.hasAttribute('data-h-ask')) return;
    e.preventDefault();
    goAsk(f);
  }, true);

  /* ------------------------------------------------------------ the walk: the picture, driven by scroll */
  function walk(jr) {
    var art = illus(jr ? 'home-jr-hero' : 'home-hero', { size: 'fill', cls: 'h-art-il', animate: false });
    if (!art) return '';
    return '<div class="h-art" data-h-walk' + ha('art', 'art') + '>' + art + '</div>';
  }
  var hasSDA = false;
  try { hasSDA = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'view()') && typeof CSS.registerProperty === 'function'); } catch (e) { hasSDA = false; }
  function wireWalk(root) {
    var list = root.querySelectorAll('[data-h-walk]');
    for (var i = 0; i < list.length; i++) wireWalkOne(list[i]);
  }
  function wireWalkOne(el) {
    if (el._hWalk) return;
    el._hWalk = true;
    var fig = el.querySelector('.il');
    if (!fig) return;
    if (reduced()) { fig.style.setProperty('--walk', '1'); return; }
    if (hasSDA) { fig.classList.add('h-walk-sda'); return; }
    // fallback: the figure's place follows the picture's place in the viewport (rAF-throttled, passive)
    var ticking = false, live = false, ob = null;
    function paint() {
      ticking = false;
      var r = el.getBoundingClientRect(), vh = window.innerHeight || 800;
      // 0 when the picture's top enters at the bottom; 1 when its middle reaches 55% of the viewport
      var a = vh, b = vh * 0.55 - r.height / 2;
      var p = a === b ? 1 : (a - r.top) / (a - b);
      p = Math.max(0, Math.min(1, p));
      fig.style.setProperty('--walk', p.toFixed(3));
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }
    function on() { if (live) return; live = true; window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll, { passive: true }); onScroll(); }
    function off() { if (!live) return; live = false; window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); onScroll(); }
    if (typeof IntersectionObserver !== 'function') { on(); return; }
    ob = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) on(); else off(); }); }, { rootMargin: '10% 0px' });
    ob.observe(el);
    paint();
  }

  /* ------------------------------------------------------------ offline: a slim ruled row */
  function offline() {
    var off = false;
    try { off = navigator.onLine === false; } catch (e) { off = false; }
    if (!off) return '';
    return '<aside class="h-offline" role="status">' + illus('offline', { size: 'thumb-sm', animate: false, cls: 'h-offline-il' }) +
      '<p><b>' + esc(t('home.offline')) + '</b>' + esc(t('home.offlineBody')) + '</p></aside>';
  }

  /* ------------------------------------------------------------ 困りごと: the 路線図 — six stations on one line
     the line is an element (not a pseudo) so it can fill with scroll (data-scroll, SM.motion.scrollLinked) */
  function route(first) {
    var order = SM.CAT_ORDER || ['housing', 'money', 'education', 'work', 'procedures', 'consult'];
    var counts = catCounts();
    var unit = t('home.unit');
    var lead = first && T;
    var base = lead ? T.route : 0, step = lead ? T.stop : 80;
    var a = answers().area;
    var where = a && a !== 'other' ? areaName(a) : '';
    var jr = junior();
    var stops = order.map(function (k, i) {
      var n = counts[k] || 0;
      var at = lead ? ' data-reveal-delay="' + (base + 120 + i * step) + '"' : '';
      // 中学生: a lone 「1件」 reads as "nothing here" — a station with fewer than 2 shows no number
      var quiet = jr && n < 2;
      var label = quiet ? catLabel(k) : t('home.catCount', { name: catLabel(k), n: n });
      return '<li class="h-stop" style="--i:' + i + '"><a class="h-stop-a cat-' + esc(k) + '" href="#/find/cat/' + esc(k) + '" data-press="ink" aria-label="' + esc(label) + '">' +
        '<span class="h-stop-mark">' + catMark(k, 'sm', true) + '</span>' +
        '<span class="h-stop-name">' + esc(catLabel(k)) + '</span>' +
        (quiet ? '<span class="h-stop-n is-quiet" aria-hidden="true"></span>' :
        '<span class="h-stop-n" aria-hidden="true"><b class="num" data-count="' + n + '" data-count-dur="620"' + at + '>' + n + '</b>' + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</span>') +
        '<span class="h-stop-go" aria-hidden="true">' + arrow() + '</span>' +
      '</a></li>';
    }).join('');
    var d = lead ? ' data-reveal-delay="' + base + '"' : '';
    return '<section class="h-sec h-route-sec" id="h-cats" aria-labelledby="h-cats-h" tabindex="-1">' +
      head(t('home.catsTitle'), { id: 'h-cats-h', sub: where ? t('home.catsFor', { area: where }) : '', action: { label: t('home.catsAll'), href: '#/find' } }, first) +
      '<ol class="h-route" role="list" data-reveal="fade"' + d + '><span class="h-route-ln" aria-hidden="true" data-h-fill></span>' + stops + '</ol>' +
    '</section>';
  }

  /* ------------------------------------------------------------ 今すぐ話したい: a timetable */
  var TALK = [
    { id: 'yorisoi', sub: 'home.t.yorisoi' },
    { id: 'anata-no-ibasho', sub: 'home.t.ibasho' },
    { id: 'tokyo-wakanavi', sub: 'home.t.wakanavi', lineLabel: 'home.lineShort', pref: '13', unanswered: true },
    { id: 'kanagawa-kowaka-line', sub: 'home.t.prefYouth', pref: '14' },
    { id: 'chiba-lighthouse', sub: 'home.t.prefYouth', pref: '12' },
    { id: 'tochigi-polaris', sub: 'home.t.prefYouth', pref: '09' },
    { id: 'gunma-asunowa', sub: 'home.t.prefYouth', pref: '10' },
    { id: 'b4s-line-soudan', sub: 'home.t.b4s' }
  ];
  var TALK_JR = [
    { id: 'kodomo-sos', sub: 'home.t.kodomoSos' },
    { id: 'childline', sub: 'home.t.childline' },
    { id: 'kanagawa-kodomo-hotline', sub: 'home.t.prefKids', pref: '14' },
    { id: 'saitama-smile-net', sub: 'home.t.prefKids', pref: '11' },
    { id: 'chiba-kosapo-24h', sub: 'home.t.prefKids', pref: '12' },
    { id: 'ibaraki-kodomo-hotline', sub: 'home.t.prefKids', pref: '08' },
    { id: 'tochigi-tel-jidou', sub: 'home.t.prefKids', pref: '09' },
    { id: 'gunma-kodomo-hotline24', sub: 'home.t.prefKids', pref: '10' },
    { id: 'anata-no-ibasho', sub: 'home.t.ibasho' },
    { id: 'yorisoi', sub: 'home.t.yorisoi' }
  ];
  function talkFor(x, area) {
    var p = prog(x.id);
    if (!p || !usable(p, area)) return false;
    if (!x.pref) return true;
    var pc = prefOfCode(area);
    return pc ? pc === x.pref : !!(x.unanswered && area !== 'other');
  }
  function talkRow(x, i) {
    var p = prog(x.id);
    if (!p || !p.contact) return '';
    var c = p.contact, name = shortName(p);
    var ext = ic('external', 'h-tt-ext') + '<span class="sr-only">' + esc(t('core.newtab')) + '</span>';
    var hours = c.hours ? L(c.hours) : '';
    var free = c.phone && isFreeDial(c.phone);
    var pn = x.pref ? (U().prefName ? U().prefName(x.pref, en()) : '') : '';
    var tags = [free ? t('home.free') : ''].concat(String(t(x.sub, { pref: pn }) || '').split(/[・·]/)).filter(Boolean);
    var seen = {};
    tags = tags.filter(function (s) { if (seen[s]) return false; seen[s] = 1; return true; });
    var main = '', alt = '';
    if (c.phone) {
      main = '<a class="h-tt-num" href="' + esc(telHref(c.phone)) + '" aria-label="' + esc(t('home.callShort') + ' ' + name + ' ' + c.phone + (hours ? '. ' + hours : '')) + '">' +
        '<span class="h-tt-ic">' + ic('phone') + '</span><span class="num" data-noruby>' + esc(c.phone) + '</span></a>';
      var link = c.line || c.chat;
      if (link) alt = '<a class="h-tt-alt" href="' + esc(link) + '" target="_blank" rel="noopener"><span>' + esc(t(c.line ? (x.lineLabel || 'home.lineShort') : 'home.chatShort')) + '</span>' + ext + '</a>';
    } else if (c.chat || c.line) {
      main = '<a class="h-tt-num is-chat" href="' + esc(c.chat || c.line) + '" target="_blank" rel="noopener">' +
        '<span class="h-tt-ic">' + ic('chat') + '</span><span class="h-tt-chat">' + esc(t(c.chat ? 'home.chatTalk' : 'home.lineTalk')) + '</span>' + ext + '</a>';
    } else return '';
    return '<li class="h-tt" data-id="' + esc(p.id) + '" style="--i:' + i + '">' +
      '<div class="h-tt-who"><h3 class="h-tt-name"><a href="#/p/' + encodeURIComponent(p.id) + '">' + esc(name) + '</a></h3>' +
        '<p class="h-tt-tags">' + tags.map(function (s, k) { return '<span' + (k === 0 && free ? ' class="is-free"' : '') + '>' + esc(s) + '</span>'; }).join('') + '</p></div>' +
      '<span class="h-tt-dots" aria-hidden="true"></span>' +
      '<div class="h-tt-act">' + main + alt + '</div>' +
    '</li>';
  }
  function talk(jr) {
    var area = answers().area;
    var rows = (jr ? TALK_JR : TALK).filter(function (x) { return talkFor(x, area); }).slice(0, 5).map(talkRow).join('');
    return '<section class="h-sec h-talk" id="h-talk" aria-labelledby="h-talk-h">' +
      head(t('home.talkTitle'), { id: 'h-talk-h', sub: t('home.talkBody') }) +
      (rows ? '<ul class="h-tts" role="list" data-reveal="fade">' + rows + '</ul>' : '') +
      '<div class="h-talk-foot" data-reveal>' +
        '<a class="btn btn-text h-more" href="#/find/cat/consult"><span>' + esc(t('home.talkMore')) + '</span>' + arrow() + '</a>' +
        '<button type="button" class="h-sos" data-act="sos" aria-haspopup="dialog"><span class="h-sos-k">' + esc(t('home.talkSos')) + '</span>' +
          '<span class="h-sos-v">' + ic('phone') + '<b>' + esc(t('home.talkSosBtn')) + '</b>' + arrow() + '</span></button>' +
      '</div>' +
    '</section>';
  }

  /* ------------------------------------------------------------ まなぶ: a line of stations + the lesson to read next */
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
  function posOf(id) {
    try {
      var p = SM.store && SM.store.get ? SM.store.get('learnPos', {}) : null;
      var v = p && typeof p === 'object' ? p[id] : 0;
      return typeof v === 'number' && v > 0 ? v : 0;
    } catch (e) { return 0; }
  }
  function lessonHref(l) { return '#/learn/' + encodeURIComponent(l.id); }

  function learn(jr, first) {
    var list = lessonsFor(jr);
    if (!list.length) return '';
    var every = jr ? list.slice() : list.concat(((SM.data && SM.data.lessons) || []).filter(function (l) { return l && l.id && list.indexOf(l) === -1; }));
    var total = every.length;
    var done = every.filter(function (l) { return isLearned(l.id); }).length;
    var feature = null, resume = false, i;
    for (i = 0; i < list.length; i++) if (!isLearned(list[i].id) && posOf(list[i].id) > 0) { feature = list[i]; resume = true; break; }
    if (!feature) for (i = 0; i < list.length; i++) if (!isLearned(list[i].id)) { feature = list[i]; break; }
    var allDone = !feature;
    if (!feature) feature = list[0];
    var steps = (feature.steps && feature.steps.length) || 0;
    var at = resume ? Math.min(posOf(feature.id) + 1, steps || 1) : 0;
    var flag = allDone ? t('home.learnAllDone') : resume ? t('home.learnResumeK') : done ? t('home.learnNext') : t('home.learnFirst');
    var cat = feature.cat || 'money';
    var no = jr ? pad2(list.indexOf(feature) + 1) : (feature.order != null ? pad2(feature.order) : '');
    var cover = illus('learn-cover-' + feature.id, { size: 'cover', animate: false, cls: 'h-cover-il' });
    var goLabel = allDone ? t('home.learnAgain') : resume ? t('home.learnResume') : t('home.learnStart');
    var meta = '<span class="h-lf-meta">' + catMark(cat, 'xs', true) + (no ? '<span class="num">' + esc(no) + '</span>' : '') +
      (feature.minutes ? '<span>' + esc(t('home.learnMin', { n: feature.minutes })) + '</span>' : '') +
      (resume && steps ? '<span class="h-lf-at num">' + esc(t('home.learnAt', { n: at, total: steps })) + '</span>' : '') + '</span>';
    var featureHtml = '<a class="h-lf" href="' + lessonHref(feature) + '" data-id="' + esc(feature.id) + '" data-press="ink">' +
      '<span class="h-lf-art' + (cover ? '' : ' is-blank') + '">' + cover + '<span class="h-lf-flag">' + esc(flag) + '</span>' +
        (resume && steps ? '<span class="h-lf-bar" aria-hidden="true" style="--p:' + (at / steps).toFixed(3) + '"></span>' : '') + '</span>' +
      '<span class="h-lf-body">' + meta + '<span class="h-lf-title">' + esc(L(feature.title)) + '</span>' +
        '<span class="h-lf-go btn btn-secondary" aria-hidden="true"><span>' + esc(goLabel) + '</span>' + arrow() + '</span></span>' +
    '</a>';
    var rest = list.filter(function (l) { return l !== feature && !isLearned(l.id); }).slice(0, 3);
    var rows = rest.map(function (l) {
      var n = jr ? pad2(list.indexOf(l) + 1) : (l.order != null ? pad2(l.order) : '');
      return '<li><a class="h-lr" href="' + lessonHref(l) + '" data-press="ink">' + catMark(l.cat || 'money', 'xs', true) +
        '<span class="h-lr-t">' + esc(L(l.title)) + '</span>' +
        '<span class="h-lr-m num">' + (l.minutes ? esc(t('home.learnMin', { n: l.minutes })) : esc(n)) + '</span>' + arrow() + '</a></li>';
    }).join('');
    var stops = '';
    var cur = allDone ? -1 : done;
    for (var j = 0; j < total; j++) stops += '<i class="h-ls' + (j < done ? ' is-done' : j === cur ? ' is-now' : '') + '" style="--i:' + j + '"></i>';
    var mins = every.map(function (l) { return +l.minutes || 0; }).filter(Boolean);
    var mn = mins.length ? Math.min.apply(null, mins) : 0, mx = mins.length ? Math.max.apply(null, mins) : 0;
    var range = mn ? (mn === mx ? String(mn) : mn + (en() ? '–' : '〜') + mx) : '';
    var count = done ? '<p class="h-lp-n"><b class="num">' + done + '</b><span class="h-lp-of num">/' + total + '</span><span class="h-lp-k">' + esc(t('home.learnProgK')) + '</span>' +
        '<span class="sr-only">' + esc(t('home.learnDoneOf', { done: done, total: total })) + '</span></p>' :
      '<p class="h-lp-n is-intro"><span class="h-lp-intro">' + esc(t(range ? 'home.learnIntro' : 'home.learnIntroN', { n: total, min: range })) + '</span></p>';
    var prog = '<div class="h-lp" data-reveal="fade"' + (first && T ? ' data-reveal-delay="' + T.route + '"' : '') + '>' + count +
      '<span class="h-lp-line" aria-hidden="true" style="--n:' + total + ';--done:' + done + '">' + stops + '</span></div>';
    var hold = first && T ? ' data-reveal-delay="' + (T.route + 120) + '"' : '';
    return '<section class="h-sec h-learn' + (jr ? ' is-jr' : '') + '" id="h-learn" aria-labelledby="h-learn-h">' +
      head(t('home.learnTitle'), { id: 'h-learn-h', action: { label: t('home.learnAll'), href: '#/learn' } }, first) +
      prog +
      '<div class="h-learn-body" data-reveal="up"' + hold + '>' + featureHtml +
        (rows ? '<div class="h-lr-w"><p class="h-lr-k">' + esc(t('home.learnUp')) + '</p><ul class="h-lrs" role="list">' + rows + '</ul></div>' : '') +
      '</div>' +
    '</section>';
  }

  /* ------------------------------------------------------------ ツール */
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

  /* ------------------------------------------------------------ 奥付 */
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
    var mark = '';
    if (SM.brand && SM.brand.lockup) {
      mark = SM.brand.lockup({ line: !en(), cls: 'h-colo-logo' });
      mark = mark.replace('<g class="lg-line"', '<g class="lg-line" data-reveal="rule"');
    } else mark = ic('logo') + '<span class="h-colo-name">' + esc(t('home.colo.title')) + '</span>';
    return '<footer class="h-colo" aria-labelledby="h-colo-h">' +
      '<h2 class="sr-only" id="h-colo-h">' + esc(t('home.colo.title')) + '</h2>' +
      '<div class="h-colo-head"><span class="h-colo-mark">' + mark + '</span>' +
        '<span class="h-colo-ed">' + esc(t('home.colo.ed')) + ' <span class="num">v' + esc(SM.version || '8.0.0') + '</span></span></div>' +
      '<div class="h-colo-body">' + kv +
        '<p class="h-colo-note">' + esc(t('home.colo.note')) + '</p>' +
        '<a class="btn btn-text h-more" href="#/about"><span>' + esc(t('home.colo.about')) + '</span>' + arrow() + '</a></div>' +
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

  /* the ふりがな offer sits under the hero (VISUAL-SPEC §7.2): boot inserts it first; on home it moves after the hero */
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

  var netWired = false;
  function wireNet() {
    if (netWired) return;
    netWired = true;
    var on = function () { if (SM.route && SM.route.key === 'home' && SM.render) { try { SM.render(); } catch (e) { /* ignore */ } } };
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
  }

  /* ------------------------------------------------------------ first screen first
     The hero (with the path, きく and the picture) and section 01 render in render(); the rest is built section by
     section in idle time into a slot after section 01 — at once when the reader scrolls, presses a key or prints. */
  var pending = null;
  function mountNode(n, instant) {
    try { if (SM.applyRuby) SM.applyRuby(n); } catch (e) { /* ignore */ }
    try { if (SM.motion && SM.motion.mount) SM.motion.mount(n, { instant: instant }); } catch (e) { /* ignore */ }
    wireFills(n);
  }
  function fillLater(all) {
    var p = pending;
    if (!p) return;
    var slot = document.getElementById('h-later');
    if (!slot || !slot.parentNode) { pending = null; unhook(); return; }
    T = null;
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
    if (opening && SM.motion && SM.motion.whenReleased) SM.motion.whenReleased(function () { setTimeout(go, 1100); });
    else if (SM.motion && SM.motion.afterTransition) SM.motion.afterTransition(go);
    else go();
  }

  /* ------------------------------------------------------------ scroll-linked fills (the route line)
     SM.motion.scrollLinked draws with animation-timeline where supported, else IO + rAF. Reduced motion: full. */
  function wireFills(root) {
    var list = root.querySelectorAll ? root.querySelectorAll('[data-h-fill]') : [];
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el._hFill) continue;
      el._hFill = true;
      var horizontal = false;
      try { horizontal = getComputedStyle(el).getPropertyValue('--dir').trim() === 'x'; } catch (e) { horizontal = false; }
      if (SM.motion && SM.motion.scrollLinked) {
        el._hFill = SM.motion.scrollLinked(el, { prop: horizontal ? 'scaleX' : 'scaleY', from: 0, to: 1, range: ['entry 20%', 'cover 60%'] });
      }
    }
  }

  /* ------------------------------------------------------------ the hero's CSS choreography
     .h-play starts every part on its --d (× --h-k after a skip). .h-done (≈2s) drops the clips and the
     animations. A tap or key in between lands it (.h-land). */
  var heroTimer = 0, heroEl = null;
  function landHero() {
    var h = heroEl;
    if (!h || !h.classList.contains('h-play') || h.classList.contains('h-done')) return;
    h.classList.add('h-land');
    var m = h.parentNode && h.parentNode.querySelector(':scope > .h-mast');
    if (m) m.classList.add('h-land');
    clearTimeout(heroTimer);
    heroTimer = setTimeout(function () { h.classList.add('h-done'); if (m) m.classList.add('h-done'); }, 40);
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
    var m = main && main.querySelector(':scope > .h-mast');
    if (!h || !table) return;
    heroEl = h;
    var go = function () {
      if (!h.isConnected) return;
      var k = parseFloat(h.style.getPropertyValue('--h-k')) || 1;
      h.classList.add('h-play');
      if (m) m.classList.add('h-play');
      document.addEventListener('pointerdown', onInput, true);
      document.addEventListener('keydown', onInput, true);
      nudge(h, Math.round(table.nudge * k));
      clearTimeout(heroTimer);
      heroTimer = setTimeout(function () { h.classList.add('h-done'); if (m) m.classList.add('h-done'); offInput(); }, Math.round((table.nudge + 700) * k));
    };
    if (mode === 'launch' && SM.motion && SM.motion.whenReleased) SM.motion.whenReleased(go);
    else go();
  }

  /* the opening was skipped (launch.js 'sm:lxskip'): the held first screen switches to the returning pace (× 0.55)
     and numbers stand at their value instead of rolling from blank */
  function toShort(view) {
    var parts = view.querySelectorAll(':scope > .h-hero, :scope > .h-mast');
    for (var j = 0; j < parts.length; j++) parts[j].style.setProperty('--h-k', '0.55');
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

  /* station 3 reads the やること model: its files are lazy, so fetch them once there is something to show and
     swap the facts in place (a short cross-fade; no re-render, nothing moves) */
  function needPlan(main) {
    var st = SM.state || {};
    var jr = junior();
    if (SM.plan || !(SM.needView)) return;
    if (!((st.saved && st.saved.length) || (jr ? st.hsDate : st.leaveDate))) return;
    SM.needView('plan').then(function () {
      if (!main.isConnected || !SM.plan) return;
      var li = main.querySelector('.h-st[data-st="3"]');
      if (!li) return;
      var facts = li.querySelector('.h-st-facts');
      if (!facts) return;
      var P = progress();
      var keep = T; T = null;
      var html = li.classList.contains('is-now') ? st3Facts(P, null) : '<span class="h-st-f is-quiet">' + esc(t('home.st3.todo')) + '</span>' + (P.hasDate && P.days > 0 ? daysFact(P, null) : '');
      T = keep;
      if (facts.innerHTML === html) return;
      var tpl = document.createElement('template');
      tpl.innerHTML = html;
      var nodes = Array.prototype.slice.call(tpl.content.children);
      facts.innerHTML = '';
      facts.appendChild(tpl.content);
      facts.classList.add('h-swapped');
      for (var i = 0; i < nodes.length; i++) mountNode(nodes[i], true);
    }, function () { /* offline: the state's own facts stay */ });
  }

  SM.views.home = {
    tab: 'home',
    title: { ja: 'ホーム', en: 'Home' },
    render: function () {
      try { if (SM.syncJunior) SM.syncJunior(); } catch (e) { /* ignore */ }
      var jr = junior();
      var hasLearn = lessonsFor(jr).length > 0;
      mode = pickMode();
      T = ENTER[mode] || null;
      var P = progress();

      var out = mast();
      out += '<section class="h-hero wide-layout is-at-' + P.cur + '" aria-labelledby="h-title">' +
        heroCopy() + path(P) + ask() + walk(jr) + '</section>';
      out += offline();
      // section 01 renders now; 中学生 see まなぶ first, everyone else the route
      out += jr && hasLearn ? learn(true, true) : route(true);
      var parts = [];
      if (jr && hasLearn) parts.push(function () { return route(false); }, function () { return talk(true); });
      else parts.push(function () { return '<div class="h-duo' + (hasLearn ? '' : ' is-one') + '">' + talk(jr) + (hasLearn ? learn(false, false) : '') + '</div>'; });
      parts.push(tools, function () { return staff() + colophon(); });

      var r = SM.route || {};
      var deep = r.kind === 'back' && (r.restoreY || 0) > (window.innerHeight || 700) * 0.5;
      if (!homeShown() && !deep) {
        pending = { parts: parts, instant: !!r.instant };
        out += '<div id="h-later" class="h-later" aria-hidden="true"></div>';
      } else {
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
      if (main) {
        main.classList.toggle('is-answered', !!(SM.state && SM.state.answered));
        wireWalk(main);
        wireFills(main);
        needPlan(main);
      }
      if (T && main) {
        if (mode === 'launch' && window.__lx && window.__lx.skipped) toShort(main);
        playHero(main, T);
        var expire = function () {
          setTimeout(function () {
            var list = main.querySelectorAll('[data-reveal-delay]');
            for (var i = 0; i < list.length; i++) list[i].removeAttribute('data-reveal-delay');
          }, 1800);
        };
        if (SM.motion && SM.motion.whenReleased) SM.motion.whenReleased(expire); else expire();
      }
      T = null;
    }
  };
})();
