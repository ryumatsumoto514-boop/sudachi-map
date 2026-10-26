/* 巣立ちマップ v7 — js/views/home.js (HOME)
   Home (#/), redesigned for SPEC-v7 workstream 1: clear AND beautiful. A transit poster set like a textbook:
   the green line of the logo is the structure of the page, the kanji marks are its stations.

   Page, top to bottom (phone; desktop composes the same parts on a 12-column grid):
     .h-mast    a dateline (関東版 · 支援 N件・ログインなし) on the page's first heavy rule
     .h-hero    new visitor: kicker + one display headline (marker on 使える支援) + the picture + ONE green CTA +
                the crisis link (今夜いる場所がない). Desktop 7/5: headline left, picture right on the CTA's baseline.
                returning: あなたに合いそうな支援 N件 (num-hero) + the answers (／, 変える) + 結果を見る; やること
                (countdown + saved) beside it (desktop) / under it (phone).
     .h-ask     きく: a fill-in line (ことばで きく ＿＿＿ 例：家賃がはらえない) → #/ask/<words>. Nothing is sent: the
                form never submits; it routes in the app.
     .h-route   困りごと as a 路線図: the six kanji marks are stations on one green line (vertical on the phone,
                horizontal across the page on desktop), name + count at each stop. Counts follow the person's
                answers (area in 関東: national + their prefecture + their city).
     .h-talk    今すぐ話したい as a timetable: name ……… number (the number dials), hours as text, LINE / チャット
                as a quiet link; 相談先をもっと見る; the red 緊急 line.
     .h-learn   まなぶ: progress as a line of stations (done = filled), the lesson to read next (続きから when it
                was left half-read) with its cover, then the next three as rows.
     .h-tools   three tools · .h-staff band · .h-colo 奥付.
   中学生 (body.is-junior): the jr picture and copy, counts only for what fits them, まなぶ before 困りごと.

   Motion (SPEC-v5 Part A scale; transform / opacity only; never hides content if JS fails):
   - The opening (launch.js) lands its line in the app bar; home picks it up: the masthead rule draws from the
     left, the headline lines rise from behind their baselines, the marker sweeps, the picture's figures walk in,
     the CTA springs up, the crisis link slides in (CSS choreography, .h-play, delays from the ENTER table).
   - Then the train runs: the route's green line draws through the six stations (down on the phone, across on
     desktop) and each kanji mark stamps in as the line reaches it, its count rolling (SM.motion reveals with
     per-stop delays). The same on scroll for the timetable (leader dots run out to each number) and the まなぶ
     line (stations fill up to where the reader is).
   - Tables: 'launch' (the opening hands off), 'short' (returning beat / first tab visit), 'none' (reduced
     motion, back, revisits, in-place renders). A tap / key during the hero lands it at once (.h-land).
   - Render the first screen first: hero + section 01 in render(); the rest one section per idle callback.
   Fully bilingual via SM.strings; 中学生 copy via the `jr` variant. */
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

    /* masthead: the edition and the facts, set as a dateline */
    'home.ed': { ja: '関東版', en: 'Kanto edition' },
    'home.mast': { ja: 'このサイトについて', en: 'About this site' },
    'home.mastCount': { ja: '支援 {n}件', en: '{n} programs' },
    'home.f.login': { ja: 'ログインなし', en: 'No login' },
    'home.f.count': { ja: '関東の支援', en: 'programs in Kanto' },
    'home.unit': { ja: '件', en: '' },

    /* hero — first visit */
    'home.kicker': { ja: '施設や里親家庭を出る人へ', jr: '施設や里親家庭でくらす中学生へ', en: 'For young people leaving care' },
    'home.h1pre': { ja: '「', en: '' },
    'home.h1mark': { ja: '使える支援', en: 'Support you can use,' },
    'home.h1post': { ja: '」が、', en: '' },
    'home.h1c': { ja: '3分でわかる。', en: 'found in 3 minutes.' },
    'home.cta': { ja: '質問に答える', en: 'Answer 6 questions' },
    'home.crisis': { ja: '今夜いる場所がない・家にいられない', jr: '家にいられない・帰れないとき', en: 'Nowhere to stay tonight?' },

    /* hero — returning visitor */
    'home.backA': { ja: 'あなたに合いそうな支援', en: 'Programs that may fit you' },
    'home.backUnit': { ja: '件', en: '' },
    'home.backNone': { ja: 'あなたの答えで、支援をまとめています。', en: 'Your results are ready.' },
    'home.seeResults': { ja: '結果を見る', en: 'See results' },
    'home.changeAnswers': { ja: '変える', en: 'Change' },
    'home.changeLabel': { ja: '答えを変える', en: 'Change your answers' },
    'home.yourAnswers': { ja: 'あなたの答え', en: 'Your answers' },

    /* きく */
    'home.askK': { ja: 'ことばで きく', en: 'Ask in your own words' },
    'home.askPh': { ja: '例：家賃がはらえない', jr: '例：高校 お金', en: 'e.g. can’t pay rent' },
    'home.askGo': { ja: 'きく', en: 'Ask' },
    'home.askLabel': { ja: '困っていることを、ことばで入力', en: 'Type what is worrying you' },

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
  function dayDiff(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    var a = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    var n = todayISO().split('-');
    var b = Date.UTC(+n[0], +n[1] - 1, +n[2]);
    return Math.round((a - b) / 86400000);
  }
  function listed() { return SM.ui && SM.ui.listedCount ? SM.ui.listedCount() : programs().length; }

  /* ------------------------------------------------------------ area rule (SPEC-v7 data contract)
     answers.area: a 5-digit Kanto code, a 2-digit prefecture code, 'other' (outside Kanto) or null.
     A record: for.areas [] = anywhere; ['14'] = all of 神奈川; ['14100'] = 横浜市 only. basis 'tokyo' = ['13'].
     In prefecture X → [] + [X] + records naming their city. 'other' → only records open to anyone.
     null → national + every prefecture's own (pref-level) records; city-only records wait for an answer. */
  function codeOf(x) { return String(x == null ? '' : x); }
  function U() { return SM.matchUtil || {}; }
  function prefOfCode(c) { try { return (U().prefOf && U().prefOf(c)) || ''; } catch (e) { return ''; } }
  // can someone living in `area` use this record? (match.js's area rule — the same one さがす uses)
  function usable(p, area) {
    try { if (U().usableIn) return !!U().usableIn(p, U().cleanArea ? U().cleanArea({ area: area }) : area); } catch (e) { /* ignore */ }
    return true;
  }
  /* the numbers on the six stations: exactly the rows さがす lists for this person when a station is tapped
     (SM.matchUtil.catCounts is the one rule for both; 中学生: only what is open to them) */
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

  /* ------------------------------------------------------------ entrance choreography
     ms after the entrance starts: the opening's release (first visit) or the mount (returning beat, a tab opened
     for the first time this session). Hero parts are CSS (--d, css .h-play); the rest are SM.motion reveals. */
  var ENTER = {
    launch: { mast: 0, kicker: 40, l1: 90, l2: 150, mark: 380, art: 120, cta: 300, nudge: 820, crisis: 380, answers: 220, side: 340, ask: 420, head: 460, route: 520, stop: 90 },
    short: { mast: 0, kicker: 20, l1: 60, l2: 110, mark: 300, art: 80, cta: 220, nudge: 700, crisis: 290, answers: 150, side: 260, ask: 320, head: 340, route: 400, stop: 75 }
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
  // one hero part of the CSS choreography: its kind (line | rise | cta | slide | draw | art) and its delay
  function ha(kind, key, extra) {
    if (!T) return '';
    var d = typeof key === 'number' ? key : T[key];
    return ' data-h="' + kind + '" style="--d:' + (d + (extra || 0)) + 'ms"';
  }
  function hline(cls, key, html) {
    return '<span class="' + cls + ' h-ln-o"' + (T ? ' data-h="line"' : '') + '><span class="h-ln-i"' + (T ? ' style="--d:' + T[key] + 'ms"' : '') + '>' + html + '</span></span>';
  }
  function markInk() {
    return '<span class="h-mark-ink"' + (T ? ' style="--mark-at:' + T.mark + 'ms"' : '') + ' aria-hidden="true"></span>';
  }

  /* ------------------------------------------------------------ masthead: 関東版 ─────── 支援 N件・ログインなし */
  function mast() {
    // 中学生: the supports open to them where they live (the same rows さがす lists), not the whole catalogue
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

  /* ------------------------------------------------------------ hero */
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
  function heroNew(jr) {
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
      '<div class="h-copy">' + title + '</div>' +
      (art ? '<div class="h-art"' + ha('art', 'art') + '>' + art + '</div>' : '') +
      '<div class="h-actions"><div class="h-cta-w"' + ha('cta', 'cta') + '>' + cta(t('home.cta'), '#/find/q/1') + '</div>' + crisisLink() + '</div>' +
    '</section>';
  }

  function fitCount() {
    // the same count as the results page and さがす (city-only rows wait in their own group there)
    try { if (SM.match) return SM.match(answers()).filter(function (r) { return !r.local; }).length; } catch (e) { /* ignore */ }
    return null;
  }
  function heroBack(side, jr) {
    var n = fitCount();
    var summary = '';
    try {
      if (SM.matchSummary) {
        summary = SM.matchSummary(answers()).filter(function (r) {
          return r.set && r.label && (r.key === 'stage' || r.key === 'path' || r.key === 'area');
        }).map(function (r, i) {
          return '<span class="h-ans">' + (i ? '<span class="h-ans-sep" aria-hidden="true">' + (en() ? '·' : '／') + '</span>' : '') + esc(r.label) + '</span>';
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
    // the right-hand column on desktop: やること when there is something in it, else the picture
    // with やること on the right, the picture stays too, smaller, above it (wide screens only)
    var art = illus(jr ? 'home-jr-hero' : 'home-hero', { size: 'fill', cls: 'h-art-il' });
    return '<section class="h-hero is-back wide-layout' + (side ? ' has-side' : art ? ' has-art' : '') + '" aria-labelledby="h-title">' +
      '<div class="h-copy">' + title + ans + '</div>' +
      (side ? '<div class="h-side"' + ha('rise', 'side') + '>' + (art ? '<div class="h-art is-back-art is-mini" aria-hidden="true">' + art + '</div>' : '') + side + '</div>' : art ? '<div class="h-art is-back-art"' + ha('art', 'art') + '>' + art + '</div>' : '') +
      '<div class="h-actions"><div class="h-cta-w"' + ha('cta', 'cta') + '>' + cta(t('home.seeResults'), '#/find/results') + '</div>' + crisisLink() + '</div>' +
    '</section>';
  }

  /* ------------------------------------------------------------ きく: a fill-in line that routes to #/ask/<words> */
  function ask() {
    var d = T ? ' data-reveal="up" data-reveal-delay="' + T.ask + '"' : ' data-reveal="up"';
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

  /* ------------------------------------------------------------ やること (only when there is something) */
  function planPreview() {
    var saved = (SM.state && SM.state.saved) || [];
    var leave = SM.state && SM.state.leaveDate;
    var items = saved.map(prog).filter(Boolean);
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
      return '<a class="list-item h-plan-item" href="#/p/' + encodeURIComponent(p.id) + '" data-id="' + esc(p.id) + '" data-press="ink">' + catMark(cat, 'xs', true) +
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

  /* ------------------------------------------------------------ offline: a slim ruled row */
  function offline() {
    var off = false;
    try { off = navigator.onLine === false; } catch (e) { off = false; }
    if (!off) return '';
    return '<aside class="h-offline" role="status">' + illus('offline', { size: 'thumb-sm', animate: false, cls: 'h-offline-il' }) +
      '<p><b>' + esc(t('home.offline')) + '</b>' + esc(t('home.offlineBody')) + '</p></aside>';
  }

  /* ------------------------------------------------------------ 困りごと: the 路線図 — six stations on one line */
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
      '<ol class="h-route" role="list" data-reveal="fade"' + d + '>' + stops + '</ol>' +
    '</section>';
  }

  /* ------------------------------------------------------------ 今すぐ話したい: a timetable */
  /* national lines for everyone, plus ONE line of the person's own prefecture (existing records only; shown when
     the answer is in that prefecture — Tokyo's also when no area is answered, as before) */
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
  /* name ……… number. The number is the biggest thing and dials; its label carries name, number and hours.
     A chat-only line puts its チャット link where the number would be. LINE / chat beside a number is a quiet link. */
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
      // a chat-only line: the same box as the phone's, and words — never a big word where a number would be
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
    /* a line that serves one prefecture (東京都わかもの…) is left out for people elsewhere */
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
  // where a half-read lesson stopped (learn.js keeps it in SM.store 'learnPos': {id: step index})
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
    // progress counts every lesson (中学生: only theirs), so the numbers match the まなぶ page
    var every = jr ? list.slice() : list.concat(((SM.data && SM.data.lessons) || []).filter(function (l) { return l && l.id && list.indexOf(l) === -1; }));
    var total = every.length;
    var done = every.filter(function (l) { return isLearned(l.id); }).length;
    // the lesson to read now: one left half-read, else the first not done, else the first
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
    // the next three after the feature (not done first)
    var rest = list.filter(function (l) { return l !== feature && !isLearned(l.id); }).slice(0, 3);
    var rows = rest.map(function (l) {
      var n = jr ? pad2(list.indexOf(l) + 1) : (l.order != null ? pad2(l.order) : '');
      return '<li><a class="h-lr" href="' + lessonHref(l) + '" data-press="ink">' + catMark(l.cat || 'money', 'xs', true) +
        '<span class="h-lr-t">' + esc(L(l.title)) + '</span>' +
        '<span class="h-lr-m num">' + (l.minutes ? esc(t('home.learnMin', { n: l.minutes })) : esc(n)) + '</span>' + arrow() + '</a></li>';
    }).join('');
    // progress: a line of stations, one per lesson; done ones filled, the current one ringed
    var stops = '';
    var cur = allDone ? -1 : done;
    for (var j = 0; j < total; j++) stops += '<i class="h-ls' + (j < done ? ' is-done' : j === cur ? ' is-now' : '') + '" style="--i:' + j + '"></i>';
    // nothing read yet: what is here (12のレッスン・1つ2〜3分), not a discouraging 「0/12」
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
        '<span class="h-colo-ed">' + esc(t('home.colo.ed')) + ' <span class="num">v' + esc(SM.version || '7.0.0') + '</span></span></div>' +
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
     The hero, きく and section 01 render in render(); the rest is built section by section in idle time into a
     slot after section 01 — at once when the reader scrolls, presses a key, jumps or prints. */
  var pending = null;
  function mountNode(n, instant) {
    try { if (SM.applyRuby) SM.applyRuby(n); } catch (e) { /* ignore */ }
    try { if (SM.motion && SM.motion.mount) SM.motion.mount(n, { instant: instant }); } catch (e) { /* ignore */ }
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

  /* ------------------------------------------------------------ the hero's CSS choreography
     .h-play starts every part on its --d (× --h-k after a skip). .h-done (≈1.7s) drops the clips and the
     animations. A tap or key in between lands it (.h-land). */
  var heroTimer = 0, heroEl = null;
  function landHero() {
    var h = heroEl;
    if (!h || !h.classList.contains('h-play') || h.classList.contains('h-done')) return;
    h.classList.add('h-land');
    var m = h.parentNode && h.parentNode.querySelector(':scope > .h-mast');
    if (m) m.classList.add('h-land');
    try { if (SM.illus && SM.illus.finish) SM.illus.finish(h); } catch (e) { /* ignore */ }
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
      heroTimer = setTimeout(function () { h.classList.add('h-done'); if (m) m.classList.add('h-done'); offInput(); }, Math.round((table.nudge + 600) * k));
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

      var plan = planPreview();
      var out = mast() + (answered ? heroBack(plan, jr) : heroNew(jr) + plan);
      out += offline();
      out += ask();
      // section 01 renders now; 中学生 see まなぶ first, everyone else the route
      out += jr && hasLearn ? learn(true, true) : route(true);
      var parts = [];
      if (jr && hasLearn) parts.push(function () { return route(false); }, function () { return talk(true); });
      // desktop: the timetable and まなぶ side by side (7 / 5); one column on the phone
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
      if (main) main.classList.toggle('is-answered', !!(SM.state && SM.state.answered));
      if (T && main) {
        if (mode === 'launch' && window.__lx && window.__lx.skipped) toShort(main);
        playHero(main, T);
        var expire = function () {
          setTimeout(function () {
            var list = main.querySelectorAll('[data-reveal-delay]');
            for (var i = 0; i < list.length; i++) list[i].removeAttribute('data-reveal-delay');
          }, 1500);
        };
        if (SM.motion && SM.motion.whenReleased) SM.motion.whenReleased(expire); else expire();
      }
      T = null;
    }
  };
})();
