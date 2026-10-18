/* 巣立ちマップ v4 — js/views/home.js (HOME)
   Home (#/): the first impression. VISUAL-SPEC §7.2 (layout) · MOTION-SPEC §2.5, §4.2 (entrance, morphs).

   Top to bottom (new visitor): the `home-hero` illustration (people standing on the ground line, a green route that
   steps up to a new home — the logo's line), a typographic hero (one promise, one 蛍光ペン phrase), one green CTA, a
   text link, and the route strip 1 答える ─ 2 保存する ─ 3 窓口で見せる. Then 01 困りごと (six kanji station rows,
   the source of the category morph), 02 今すぐ話したい (big numbers, outline call buttons), 03 まなぶ (a shelf of
   lesson covers), 04 べんりツール, a band for supporters, and the colophon (奥付) with the full lockup, whose
   green line draws once — the opening's line, at the end of the page.
   Returning visitor: the number of supports that fit is the headline (station-board roll), then やること.
   中学生 (body.is-junior): `home-jr-hero`, junior copy, まなぶ first, the ふりがな offer under the hero.

   Motion (all through SM.motion; nothing here animates by itself):
   - The entrance is data attributes with per-element delays (data-reveal-delay), so it plays in reading order.
     On the first visit the launch holds every reveal (SM.motion.hold) and releases them as the logo docks: the
     delays then count from the release. Returning / tab entrances use the short table. Back and tab returns
     mount instantly (SM.route.instant): nothing replays (§3.8).
   - Delays only shape the first screen: they expire once the entrance is over, so content scrolled into view
     later reveals at once.
   - Render the first screen first (§6 rule 4): the hero and section 01 render in render(); the sections after it
     are built one per idle callback once the transition (or the opening) is over, or all at once on scroll.
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

    /* hero — first visit */
    'home.eyebrow': { ja: '東京版', en: 'Tokyo edition' },
    'home.eyebrow2': { ja: '中学生から、巣立ったあとまで', jr: '中学生から使える', en: 'From junior high to after you leave care' },
    'home.kicker': { ja: '施設や里親家庭を出る人の', jr: '中学生のいまから', en: 'Leaving care?' },
    'home.h1pre': { ja: '「', en: '' },
    'home.h1mark': { ja: '使える支援', en: 'Support you can use,' },
    'home.h1post': { ja: '」が、', en: '' },
    'home.h1c': { ja: '3分でわかる。', en: 'found in 3 minutes.' },
    'home.sub': { ja: '国・東京都・区市町村の支援 {n}件。名前もログインもいりません。', en: '{n} national, Tokyo and local programs. No name, no login.' },
    'home.cta': { ja: '質問に答えてさがす', en: 'Answer a few questions' },
    'home.ctaMeta': { ja: '6問・約3分', jr: '6つの質問・3分くらい', en: '6 questions · about 3 min' },
    'home.browse': { ja: '困りごとから見る', en: 'Browse by need' },
    // one quiet way in for the most urgent case, right under the hero actions (FIXER-robust)
    'home.crisis': { ja: '今夜いる場所がない・家にいられない', jr: '家にいられない・帰れないとき', en: 'Nowhere to stay tonight?' },
    'home.unit': { ja: '件', en: '' },
    'home.route': { ja: 'つかい方', en: 'How it works' },
    'home.r1': { ja: '答える', en: 'Answer' },
    'home.r2': { ja: '保存する', en: 'Save' },
    'home.r3': { ja: '窓口で見せる', jr: '先生や窓口に見せる', en: 'Show it at the office' },

    /* hero — returning visitor */
    'home.welcome': { ja: 'おかえりなさい', en: 'Welcome back' },
    'home.backA': { ja: 'あなたに合いそうな支援が', en: 'Programs for you' },
    'home.backUnit': { ja: '件', en: '' },
    'home.backB': { ja: 'あります。', en: '' },
    'home.backNone': { ja: 'あなたの答えで、支援をまとめています。', en: 'Your results are ready.' },
    'home.seeResults': { ja: 'あなたの結果を見る', en: 'See your results' },
    'home.changeAnswers': { ja: '答えを変える', en: 'Change answers' },
    'home.yourAnswers': { ja: 'あなたの答え', en: 'Your answers' },

    /* やること preview */
    'home.planTitle': { ja: 'やること', en: 'My to-do list' },
    'home.planOpen': { ja: 'ひらく', en: 'Open' },
    'home.planSaved': { ja: '保存した支援', en: 'Saved' },
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
    'home.learnSub': { ja: 'お金のきほん。申し込む前に、1つ2〜3分で。', jr: 'お金のきほん。1つ2〜3分。クイズもあるよ。', en: 'Money basics, 2–3 minutes each.' },
    'home.learnAll': { ja: 'すべて見る', en: 'All lessons' },
    'home.learnAllCard': { ja: 'すべてのレッスン', en: 'All lessons' },
    'home.learnDoneLabel': { ja: 'おわったレッスン', en: 'lessons done' },
    'home.learnNext': { ja: 'つぎのレッスン', en: 'Next lesson' },
    'home.learnFirst': { ja: 'まずはここから', en: 'Start here' },
    'home.learnMin': { ja: '{n}分', en: '{n} min' },
    'home.learnAllDone': { ja: '全部おわりました。おつかれさま。', jr: 'ぜんぶおわったよ。おつかれさま。', en: 'All done. Nice work.' },
    'home.learnDone': { ja: 'おわった', en: 'done' },
    'home.learnDoneMark': { ja: '済', en: '✓' },
    'home.learnFor': { ja: '中学生向け', en: 'Junior high' },
    'home.shelf': { ja: 'レッスンの一覧（横にスクロールできます）', en: 'Lessons (scroll sideways)' },

    /* 困りごと */
    'home.catsTitle': { ja: '困りごとから見る', en: 'Browse by need' },
    'home.catsSub': { ja: 'いちばん近いものをえらんでね', jr: 'ちかいものをえらんでね', en: 'Pick the one closest to you' },
    'home.catsAll': { ja: 'すべて見る', en: 'See all' },
    'home.count': { ja: '{n}件', en: '{n}' },

    /* 今すぐ話したい */
    'home.talkTitle': { ja: '今すぐ話したい', en: 'Want to talk now?' },
    'home.talkBody': { ja: '名前を言わなくても話せます。', en: 'You can talk without giving your name.' },
    'home.talkMore': { ja: '相談先をもっと見る', en: 'More places to talk' },
    'home.talkSos': { ja: '命や体があぶないときは', en: 'If you are in danger' },
    'home.talkSosBtn': { ja: '緊急の連絡先', en: 'Emergency numbers' },
    'home.callShort': { ja: '電話する', en: 'Call' },
    'home.chatShort': { ja: 'チャットで話す', en: 'Chat' },
    'home.lineShort': { ja: 'LINEで話す', en: 'LINE' },
    'home.free': { ja: '無料', en: 'Free' },
    'home.t.yorisoi': { ja: '24時間。どんなことでも', en: '24 hours. About anything' },
    'home.t.ibasho': { ja: '24時間・チャット。話すのがこわいときに', jr: '24時間・チャット。電話がこわいときに', en: '24/7 chat, when talking feels hard' },
    'home.t.wakanavi': { ja: '東京都の若者向け。電話・LINE', en: "Tokyo's youth line. Phone or LINE" },
    'home.t.b4s': { ja: '施設や里親家庭を出た人のための相談', en: 'For people who grew up in care' },
    'home.t.kodomoSos': { ja: '24時間。いじめ・学校・家のこと', jr: '24時間。いじめ、学校、家のこと', en: '24 hours. Bullying, school, home' },
    'home.t.childline': { ja: '18歳まで。話を聞いてほしいとき', en: 'Up to 18. When you want someone to listen' },

    /* ツール */
    'home.toolsTitle': { ja: 'べんりツール', en: 'Tools' },
    'home.toolsSub': { ja: '準備や確認に使えます', jr: 'じゅんびや、たしかめに使えます', en: 'Help to get ready' },
    'home.tool.script': { ja: '電話・窓口の台本', en: 'Phone & visit script' },
    'home.tool.scriptSub': { ja: '何を言えばいいか、そのまま読める', en: 'Know exactly what to say' },
    'home.tool.check': { ja: '契約チェック', en: 'Contract check' },
    'home.tool.checkSub': { ja: 'サインする前に、あやしい点を確認', en: 'Spot red flags before you sign' },
    'home.tool.money': { ja: '生活費シミュレーター', jr: 'おこづかい・生活費けいさん', en: 'Money calculator' },
    'home.tool.moneySub': { ja: 'ひと月にいくらかかるか', en: 'Work out a monthly budget' },

    /* 支援者 */
    'home.staffTitle': { ja: '施設職員・先生・里親の方へ', en: 'For staff, teachers and foster carers' },
    'home.staffBody': { ja: '設定で「支援者向けメモ」をオンにすると、手続きのつまずきやすい点が表示されます。', en: 'Turn on "notes for supporters" in Settings to see where young people often get stuck.' },
    'home.staffBtn': { ja: '設定をひらく', en: 'Open settings' },

    /* オフライン */
    'home.offline': { ja: 'いまオフラインです。', en: 'You are offline.' },
    'home.offlineBody': { ja: '支援の一覧・地図・やることは、このまま使えます。公式ページは開けません。', en: 'The list, the map and your to-do list still work. Official pages will not open.' },

    /* 奥付 (colophon) */
    'home.colo.title': { ja: '巣立ちマップ', en: 'Sudachi Map' },
    'home.colo.ed': { ja: '東京版', en: 'Tokyo edition' },
    'home.colo.by': { ja: 'つくった人', en: 'Made by' },
    'home.colo.byVal': { ja: 'Economix JP（東京の高校生の団体）', en: 'Economix JP (a Tokyo high-school student group)' },
    'home.colo.checked': { ja: '最終確認', en: 'Last checked' },
    'home.colo.listed': { ja: 'のせている支援', en: 'Listed' },
    'home.colo.listedVal': { ja: '{n}件（国・東京都・区市町村・NPO）', en: '{n} (national, Tokyo, local, nonprofit)' },
    'home.colo.ads': { ja: '広告', en: 'Ads' },
    'home.colo.adsVal': { ja: 'ありません。お金をもらって順番を上げることもしません。', en: 'None. Nobody can pay to be shown higher.' },
    'home.colo.data': { ja: 'あなたの答え', en: 'Your answers' },
    'home.colo.dataVal': { ja: 'このスマホの中だけ。どこにも送りません。', en: 'Only on this device. Nothing is sent.' },
    'home.colo.note': { ja: '申し込む前に、公式ページや窓口でも確認してください。このサイトは相談窓口ではありません。', en: 'Please check the official page or office before you apply. This site is not a helpline.' },
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
  // 中学生: the same plain hints as Q4 and さがす (used unless SM.CATS already carries a jr hint)
  var CAT_HINT_JR = {
    housing: '家にいづらい・住むところ', money: '学校のお金・くらしのお金', education: '高校・受験・塾・勉強',
    work: '働くこと・アルバイト', procedures: '書類・役所の手続き', consult: 'だれかに話したい'
  };
  function catHint(k) {
    var c = SM.CATS && SM.CATS[k];
    if (junior() && !en() && CAT_HINT_JR[k] && !(c && c.hint && c.hint.jr)) return CAT_HINT_JR[k];
    return c && c.hint ? L(c.hint) : '';
  }
  function catMark(k, size, vt) {
    if (SM.ui && SM.ui.catIcon) return SM.ui.catIcon(k, size, { vt: !!vt });
    var c = (SM.CATS && SM.CATS[k]) || {};
    return '<span class="cat-icon cat-' + esc(k) + (size ? ' is-' + size : '') + '"><span class="cat-stack" aria-hidden="true"><span class="cat-mark"' + (vt ? ' data-vt="cat"' : '') + '>' + esc(c.mark || '') + '</span></span></span>';
  }
  function section(title, o) {
    if (SM.ui && SM.ui.sectionHeader) return SM.ui.sectionHeader(title, o);
    return '<div class="section-head"><h2 class="section-title" id="' + esc(o.id) + '">' + esc(title) + '</h2></div>';
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
     One table per kind of arrival. Times are ms after the reveal starts: after the launch releases the view
     (first visit), or after mount (returning beat, a tab opened for the first time this session).
     'none': reduced motion, back, a tab revisited, in-place re-renders — no delays, motion.js shows all. */
  var ENTER = {
    // the opening hands off: the brand is still docking as this starts (MOTION-SPEC §2.4–2.5, exactly the §2.5
    // table: kicker 60, lines 60/130, sub 320, CTA + side 400, section rule 480, rows 520 + 40i, marker 560)
    launch: { brow: 40, browRule: 120, kicker: 60, l1: 60, l2: 130, lead: 320, act: 400, r: [520, 560, 600, 640, 680], mark: 560, side: 400, rows: 520, rowsRule: 480 },
    // returning visit / first time this session from another tab: everything settles by ~700ms
    short: { brow: 0, browRule: 80, kicker: 0, l1: 50, l2: 100, lead: 200, act: 200, r: [260, 300, 340, 380, 420], mark: 360, side: 240, rows: 240, rowsRule: 200 }
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
  // data-reveal + delay for one element of the first screen
  function rv(kind, key) {
    var a = ' data-reveal="' + (kind || '') + '"';
    if (!T) return a;
    var d = typeof key === 'number' ? key : T[key];
    return d ? a + ' data-reveal-delay="' + d + '"' : a;
  }

  /* ------------------------------------------------------------ hero */
  function eyebrow(second) {
    return '<p class="h-eyebrow"' + rv('fade', 'brow') + '>' +
      '<span class="h-eyebrow-a">' + esc(t('home.eyebrow')) + '</span>' +
      (second ? '<span class="h-eyebrow-rule"' + rv('rule', 'browRule') + ' aria-hidden="true"></span><span class="h-eyebrow-b">' + esc(second) + '</span>' : '') +
    '</p>';
  }
  // the 蛍光ペン stroke: its own element under the phrase (the text sits above it in .h-mark-t). It is not a reveal
  // of its own (inside the rising line it would only count as visible once the line is up): CSS draws it from the
  // left when its line reveals. motion.js drops .m-pending when the reveal is scheduled (the delay is a CSS
  // transition-delay), so --mark-at counts from the same moment as every other delay in the table.
  function markInk() {
    var at = T ? T.mark : 300;
    return '<span class="h-mark-ink" style="--mark-at:' + at + 'ms" aria-hidden="true"></span>';
  }
  // section 01 is part of the first screen: its head and body are held with the hero and arrive after it
  function holdHead(head, first) {
    if (!first || !T) return head;
    return head.replace('<div class="section-head', '<div data-reveal="fade" data-reveal-delay="' + Math.max(0, T.rowsRule - 20) + '" class="section-head')
      .replace('data-reveal="rule"', 'data-reveal="rule" data-reveal-delay="' + T.rowsRule + '"');
  }
  function bodyHold(first) { return first && T ? ' data-reveal-delay="' + T.rows + '"' : ''; }

  // 1 答える ─ 2 保存する ─ 3 窓口で見せる: three stations on one line
  function routeStrip() {
    var r = T ? T.r : [0, 0, 0, 0, 0];
    function st(i, key) {
      return '<span class="h-route-st" role="listitem"' + rv('fade', r[i * 2]) + '><span class="h-route-n" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="h-route-t"><span class="sr-only">' + (i + 1) + '. </span>' + esc(t(key)) + '</span></span>';
    }
    function ln(i) { return '<span class="h-route-ln"' + rv('rule', r[i]) + ' aria-hidden="true"></span>'; }
    return '<div class="h-route" role="list" aria-label="' + esc(t('home.route')) + '">' +
      st(0, 'home.r1') + ln(1) + st(1, 'home.r2') + ln(3) + st(2, 'home.r3') + '</div>';
  }

  function cta(label, href, sub) {
    if (SM.ui && SM.ui.button) return SM.ui.button(label, { href: href, variant: 'primary', size: 'lg', block: true, sub: sub, cls: 'h-cta', attrs: 'data-press' });
    return '<a class="btn btn-primary btn-lg btn-block h-cta" href="' + esc(href) + '" data-press><span>' + esc(label) + '</span>' + arrow() + '</a>';
  }
  // 中学生: straight to the SOS sheet (189 and 子供SOS first there); otherwise the 住まい page, which opens on
  // tonight's numbers
  function crisisLink() {
    var jr = false;
    try { jr = document.body.classList.contains('is-junior') || (SM.isJunior && SM.isJunior()); } catch (e) { jr = false; }
    var inner = '<span>' + esc(t('home.crisis')) + '</span>' + arrow();
    return jr ? '<button type="button" class="btn btn-text h-crisis" data-act="sos" aria-haspopup="dialog" data-press>' + inner + '</button>' :
      '<a class="btn btn-text h-crisis" href="#/find/cat/housing" data-press>' + inner + '</a>';
  }
  function jumpLink() {
    return '<button type="button" class="btn btn-text h-jump" data-act="home-jump" data-target="h-cats" data-press><span>' + esc(t('home.browse')) + '</span>' + arrow('d') + '</button>';
  }

  function heroNew(jr) {
    var n = listed();
    var art = illus(jr ? 'home-jr-hero' : 'home-hero', { size: 'fill', cls: 'h-art-il' });
    var pre = t('home.h1pre');
    var title =
      '<h1 class="h-title" id="h-title" tabindex="-1">' +
        '<span class="h-kicker"' + rv('line', 'kicker') + '>' + esc(t('home.kicker')) + '</span>' +
        '<span class="h-main"' + rv('line', 'l1') + '>' + (pre ? '<span class="h-open">' + esc(pre) + '</span>' : '') +
          '<mark class="h-mark">' + markInk() + '<span class="h-mark-t">' + esc(t('home.h1mark')) + '</span></mark>' + esc(t('home.h1post')) + '</span>' +
        '<span class="h-main"' + rv('line', 'l2') + '>' + esc(t('home.h1c')) + '</span>' +
      '</h1>';
    // the count rolls up like a station board the first time (and again only when it changed)
    var num = '<b class="h-lead-n num' + rollCls('home.total', n) + '" data-count="' + n + '" data-count-seen="home.total" data-count-dur="800">' + n + '</b>';
    var lead = esc(t('home.sub', { n: '\u0000' })).split('\u0000').join(num);
    return '<section class="h-hero is-new wide-layout' + (art ? ' has-art' : '') + '" aria-labelledby="h-title">' +
      (art ? '<div class="h-art">' + art + '</div>' : '') +
      '<div class="h-copy">' +
        eyebrow(t('home.eyebrow2')) + title +
        '<p class="h-lead lead"' + rv('', 'lead') + '>' + lead + '</p>' +
        '<div class="h-actions"' + rv('', 'act') + '>' + cta(t('home.cta'), '#/find/q/1', t('home.ctaMeta')) + jumpLink() + crisisLink() + '</div>' +
        routeStrip() +
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
          // the separator rides with the answer after it (no line ends on one); EN uses a middle dot, not ／
          return '<span class="h-ans">' + (i ? '<span class="h-sep" aria-hidden="true">' + (en() ? '\u00b7' : '／') + '</span>' : '') + esc(r.label) + '</span>';
        }).join(' ');
      }
    } catch (e) { summary = ''; }
    var unit = t('home.backUnit'), tail = t('home.backB');
    var title = n ?
      '<h1 class="h-title is-back" id="h-title" tabindex="-1">' +
        '<span class="h-kicker"' + rv('line', 'kicker') + '>' + esc(t('home.backA')) + '</span>' +
        '<span class="h-big-row"' + rv('line', 'l1') + '><mark class="h-mark h-mark-num">' + markInk() + '<span class="h-mark-t"><b class="h-big num' + rollCls('home.fit', n) + '" data-count="' + n + '" data-count-seen="home.fit" data-count-dur="720">' + n + '</b>' +
          (unit ? '<span class="h-big-unit">' + esc(unit) + '</span>' : '') + '</span></mark>' +
          (tail ? '<span class="h-big-tail">' + esc(tail) + '</span>' : '') + '</span>' +
      '</h1>' :
      '<h1 class="h-title is-back is-none" id="h-title" tabindex="-1"><span class="h-kicker"' + rv('line', 'kicker') + '>' + esc(t('home.backNone')) + '</span></h1>';
    return '<section class="h-hero is-back wide-layout' + (side ? ' has-side' : '') + '" aria-labelledby="h-title">' +
      '<div class="h-copy">' +
        eyebrow(t('home.welcome')) + title +
        (summary ? '<p class="h-answers"' + rv('', 'lead') + '><span class="h-answers-k">' + esc(t('home.yourAnswers')) + '</span><span class="h-answers-v">' + summary + '</span></p>' : '') +
        '<div class="h-actions"' + rv('', 'act') + '>' + cta(t('home.seeResults'), '#/find/results') +
          '<div class="h-links">' +
            '<a class="btn btn-text h-link" href="#/find/q/1" data-press><span>' + esc(t('home.changeAnswers')) + '</span></a>' +
            jumpLink() + crisisLink() +
          '</div>' +
        '</div>' +
      '</div>' +
      (side ? '<div class="h-side"' + rv('', 'side') + '>' + side + '</div>' : '') +
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
      section(t('home.planTitle'), { id: 'h-plan-h', sub: items.length ? t('home.planSaved') + ' ' + items.length + t('home.unit') : '', action: { label: t('home.planOpen'), href: '#/plan' } }) +
      days +
      (rows ? '<div class="list h-plan-list">' + rows + '</div>' : '') + more +
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

  function learn(num, jr, first) {
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

    return '<section class="h-sec h-learn' + (jr ? ' is-jr' : '') + '" id="h-learn" aria-labelledby="h-learn-h">' +
      holdHead(section(t('home.learnTitle'), { id: 'h-learn-h', num: num, sub: t('home.learnSub'), action: { label: t('home.learnAll'), href: '#/learn' } }), first) +
      '<div class="h-learn-body" data-reveal' + bodyHold(first) + '>' + progress +
        '<ul class="h-shelf" role="list" aria-label="' + esc(t('home.shelf')) + '">' + cards + end + '</ul>' +
      '</div>' +
    '</section>';
  }

  /* ------------------------------------------------------------ 困りごと: six kanji station rows */
  function cats(num, first) {
    var order = SM.CAT_ORDER || ['housing', 'money', 'education', 'work', 'procedures', 'consult'];
    var counts = catCounts();
    var unit = t('home.unit');
    // on a wide first screen the rows arrive in order (stagger 40ms, cap 6); otherwise the list is one block
    var stagger = first && T && (window.innerWidth || 0) >= 900;
    var rowAt = stagger ? ' data-reveal-delay="' + T.rows + '"' : '';
    var rows = order.map(function (k) {
      var n = counts[k] || 0;
      // DOM order = reading order for screen readers (name, count, hint); the grid places them visually.
      // The mark is the source of the shared morph into the category page (data-vt via catIcon {vt}).
      return '<li class="h-cat-li" data-id="' + esc(k) + '"' + rowAt + '><a class="h-cat cat-' + esc(k) + '" href="#/find/cat/' + esc(k) + '" data-press="ink">' +
        '<span class="h-cat-mark">' + catMark(k, 'sm', true) + '</span>' +
        '<span class="h-cat-name">' + esc(catLabel(k)) + '</span>' +
        (n ? '<span class="h-cat-n"><b class="num">' + n + '</b>' + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</span>' : '') +
        '<span class="h-cat-hint">' + esc(catHint(k)) + '</span>' +
        '<span class="h-cat-go">' + arrow() + '</span>' +
      '</a></li>';
    }).join('');
    var head = holdHead(section(t('home.catsTitle'), { id: 'h-cats-h', num: num, sub: t('home.catsSub'), action: { label: t('home.catsAll'), href: '#/find' } }), first);
    return '<section class="h-sec h-cats-sec" id="h-cats" aria-labelledby="h-cats-h" tabindex="-1">' + head +
      '<ul class="h-cats" role="list"' + (stagger ? ' data-reveal-stagger="40"' : ' data-reveal' + bodyHold(first)) + '>' + rows + '</ul>' +
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
  /* one structure for every line: name · tag + hours · the number · a row of equal ink-outline buttons
     (電話する / チャットで話す / LINEで話す). The number is the biggest thing and also dials (pointer only: the
     電話する button is the one link screen readers and the keyboard get, with the name and number in its label). */
  function talkRow(x) {
    var p = prog(x.id);
    if (!p || !p.contact) return '';
    var c = p.contact, name = shortName(p);
    var num = '', acts = [];
    var extBits = ic('external') + '<span class="sr-only">' + esc(t('core.newtab')) + '</span>';
    if (c.phone) {
      // the label carries what the row shows beside the number: free, and when it answers
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
      '<p class="h-ln-sub">' + free + '<span>' + esc(t(x.sub)) + '</span></p>' +
      num + '<div class="h-acts">' + acts.join('') + '</div>' +
    '</li>';
  }
  function talk(num, jr) {
    var rows = (jr ? TALK_JR : TALK).map(talkRow).join('');
    return '<section class="h-sec h-talk" id="h-talk" aria-labelledby="h-talk-h">' +
      section(t('home.talkTitle'), { id: 'h-talk-h', num: num, sub: t('home.talkBody') }) +
      '<div class="h-talk-body" data-reveal>' +
        (rows ? '<ul class="h-lines" role="list">' + rows + '</ul>' : '') +
        '<div class="h-talk-foot">' +
          '<a class="btn btn-text h-more" href="#/find/cat/consult"><span>' + esc(t('home.talkMore')) + '</span>' + arrow() + '</a>' +
          '<button type="button" class="h-sos" data-act="sos"><span class="h-sos-k">' + esc(t('home.talkSos')) + '</span>' +
            '<span class="h-sos-v">' + ic('phone') + '<b>' + esc(t('home.talkSosBtn')) + '</b>' + arrow() + '</span></button>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  /* ------------------------------------------------------------ ツール: rows with spot thumbs */
  function tools(num) {
    var list = [
      { href: '#/tools/script', k: 'script' },
      { href: '#/tools/check', k: 'check' },
      { href: '#/tools/money', k: 'money' }
    ];
    return '<section class="h-sec h-tools-sec" id="h-tools" aria-labelledby="h-tools-h">' +
      section(t('home.toolsTitle'), { id: 'h-tools-h', num: num, sub: t('home.toolsSub') }) +
      '<ul class="h-tools" role="list" data-reveal>' + list.map(function (x) {
        var art = illus('tools-' + x.k, { size: 'thumb-sm', animate: false, cls: 'h-tool-il' });
        return '<li><a class="h-tool" href="' + x.href + '" data-press="ink">' +
          (art ? '<span class="h-tool-art">' + art + '</span>' : '') +
          '<span class="h-tool-body"><span class="h-tool-t">' + esc(t('home.tool.' + x.k)) + '</span>' +
          '<span class="h-tool-s">' + esc(t('home.tool.' + x.k + 'Sub')) + '</span></span>' +
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

  /* ------------------------------------------------------------ 奥付 (an honest colophon) */
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
      fillAll();   // the sections after 01 (中学生: 困りごと is one of them)
      try { if (SM.motion && SM.motion.finishAll) SM.motion.finishAll(); } catch (e) { /* ignore */ }   // lands the entrance
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

  /* the opening was skipped (launch.js 'sm:lxskip', before it releases the view): the person asked for the app, not
     the show. The held first screen switches to the returning-visit pace (the launch table's delays × 0.55, so the
     same order lands in ~half the time) and the numbers stand at their value instead of rolling from blank. */
  document.addEventListener('sm:lxskip', function () {
    if (mode !== 'launch') return;
    var view = document.getElementById('view');
    if (!view || !view.classList.contains('v-home')) return;
    mode = 'short';
    var list = view.querySelectorAll('[data-reveal-delay]');
    for (var i = 0; i < list.length; i++) {
      var d0 = parseInt(list[i].getAttribute('data-reveal-delay'), 10) || 0;
      list[i].setAttribute('data-reveal-delay', String(Math.round(d0 * 0.55)));
    }
    var inks = view.querySelectorAll('.h-mark-ink');
    for (var j = 0; j < inks.length; j++) {
      var at = parseInt(inks[j].style.getPropertyValue('--mark-at'), 10);
      if (isFinite(at)) inks[j].style.setProperty('--mark-at', Math.round(at * 0.55) + 'ms');
    }
    var nums = view.querySelectorAll('[data-count]');
    for (var k = 0; k < nums.length; k++) { nums[k].setAttribute('data-count-from', nums[k].getAttribute('data-count')); nums[k].classList.remove('x-rolls'); }
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
      // the opening was skipped before home rendered (an early tap): the same switch as 'sm:lxskip' below, made
      // here — the launch order at 0.55× its delays, and the numbers stand at their value (no roll from blank)
      var skipped0 = mode === 'launch' && !!(window.__lx && window.__lx.skipped);
      if (skipped0 && T) {
        var T2 = {};
        for (var tk in T) T2[tk] = typeof T[tk] === 'number' ? Math.round(T[tk] * 0.55) : (T[tk] && T[tk].map ? T[tk].map(function (v) { return Math.round(v * 0.55); }) : T[tk]);
        T = T2;
      }
      var n = 0;
      function num() { n++; return n; }

      var plan = answered ? planPreview() : '';
      var out = answered ? heroBack(plan) : heroNew(jr) + planPreview();
      out += offline();
      // section 01 renders now; 中学生 see まなぶ first, everyone else the six signs
      out += jr && hasLearn ? learn(num(), true, true) : cats(num(), true);
      // the rest, one part per section; numbers are fixed now so they never depend on when a part arrives
      var parts = [];
      if (jr && hasLearn) {
        var nCats = num(), nTalk = num();
        parts.push(function () { return cats(nCats, false); }, function () { return talk(nTalk, true); });
      } else {
        var nTalk2 = num();
        parts.push(function () { return talk(nTalk2, jr); });
        if (hasLearn) { var nLearn = num(); parts.push(function () { return learn(nLearn, false, false); }); }
      }
      var nTools = num();
      parts.push(function () { return tools(nTools); }, function () { return staff() + colophon(); });

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
      // (and no .x-rolls: that keeps a number blank until its odometer builds cells, which a standing number never does)
      if (skipped0) { out = out.replace(/ x-rolls/g, '').replace(/ data-count="([^"]*)"/g, ' data-count="$1" data-count-from="$1"'); mode = 'short'; }
      return out;
    },
    mount: function (main) {
      wrapBanner();
      wireNet();
      startFill();
      // the entrance delays shape the first screen only: once it has played, anything still waiting reveals at once
      if (T && SM.motion) {
        var expire = function () {
          setTimeout(function () {
            var list = main.querySelectorAll('[data-reveal-delay]');
            for (var i = 0; i < list.length; i++) list[i].removeAttribute('data-reveal-delay');
          }, 1300);
        };
        if (SM.motion.whenReleased) SM.motion.whenReleased(expire); else expire();
      }
      T = null;
    }
  };
})();
