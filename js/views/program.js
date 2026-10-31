/* 巣立ちマップ v5 — program page  #/p/ID  (owner: PROGRAM)
 * SPEC-v5 Part B 制度ページ: read at a glance, details one tap away.
 *   masthead: 56px kanji mark (shared-morph destination) + who runs it / category + h1 (title morph destination)
 *             + 2px rule that draws + ONE short sub-line (the hook, only when it is short)
 *   → 3 key facts as label / value (amount, 返済, 締切 or 受付) — the money number rolls in like a station board
 *   → ONE primary action (電話する, or 公式ページ when there is no phone) + 保存 (hanko + a dot that flies to やること)
 *   → sections collapsed by default, each one ruled row: 対象 · もらえるもの · 手続き · 窓口でこう聞く · 気をつけること · 出典
 *     (出典 shows its 確認日 on the row itself). Opening one expands in place (SM.motion.expand) and its rows cascade in;
 *     the step squares of 手続き stamp one after another.
 *   → まなぶ · 同じ分野の支援 (after the page transition)
 *   The sticky action bar appears only after the inline actions have scrolled out of view.
 *   Desktop ≥1100: sections in the reading column (7/12), facts + actions in the right column.
 * Motion is optional: everything is visible and usable without SM.motion (sections then open without animation). */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.views = SM.views || {};

  function esc(s) { return SM.esc(s); }
  function L(o) { return SM.L(o); }
  function t(k, v) { return SM.t(k, v); }
  function ic(n, c) { try { return SM.icon ? SM.icon(n, c) : ''; } catch (e) { return ''; } }
  function en() { return SM.lang() === 'en'; }
  function enc(s) { return encodeURIComponent(s); }
  function motion() { return SM.motion || null; }
  function reduced() { var M = motion(); try { return M && M.reduced ? !!M.reduced() : false; } catch (e) { return false; } }
  function arrow(d, c) { return SM.ui && SM.ui.arrow ? SM.ui.arrow(d, c) : '<span class="arrow" aria-hidden="true">→</span>'; }
  function illus(name, o) { try { return SM.illus && SM.illus.has && SM.illus.has(name) ? SM.illus(name, o || {}) || '' : ''; } catch (e) { return ''; } }
  function rv(kind, delay) { return ' data-reveal="' + (kind || '') + '"' + (delay ? ' data-reveal-delay="' + delay + '"' : ''); }

  SM.strings({
    'pg.title': { ja: '制度のくわしい内容', en: 'Program details' },
    'pg.nf.title': { ja: 'このページは見つかりませんでした', en: 'We could not find this page' },
    'pg.nf.body': { ja: 'リンクが古いかもしれません。', jr: 'リンクが古いのかもしれません。', en: 'The link may be old.' },
    'pg.nf.btn': { ja: '支援をさがす', en: 'Search support' },
    /* key facts (labels ≤ 6 chars) */
    'pg.facts': { ja: '要点', en: 'Key facts' },
    'pg.k.grant': { ja: 'もらえる', en: 'You get' },
    'pg.k.loan': { ja: '借りられる', jr: 'かりられる', en: 'You can borrow' },
    'pg.k.amount': { ja: '金額', en: 'Amount' },
    'pg.k.what': { ja: '内容', en: 'What' },
    'pg.k.cost': { ja: '費用', en: 'Cost' },
    'pg.k.hours': { ja: '受付', en: 'Open' },
    'pg.f.repay': { ja: '返済', jr: '返すお金', en: 'Pay back?' },
    'pg.f.kind': { ja: '種類', en: 'Type' },
    'pg.f.deadline': { ja: '締切', jr: 'いつまで', en: 'Deadline' },
    'pg.f.effort': { ja: '手間', jr: 'たいへんさ', en: 'Effort' },
    'pg.f.basis': { ja: '運営', jr: 'やっているところ', en: 'Run by' },
    'pg.effort.s1': { ja: 'かんたん', en: 'Easy' },
    'pg.effort.s2': { ja: 'ふつう', en: 'Some' },
    'pg.effort.s3': { ja: '多い', en: 'A lot' },
    'pg.right': { ja: '申請は権利', en: 'Your right' },
    'pg.careOnly': { ja: '施設や里親家庭で育った人向け', en: 'For people who grew up in care' },
    /* sections (collapsed rows) */
    'pg.a.who': { ja: '対象', jr: '使える人', en: 'Who can use it' },
    'pg.a.get': { ja: 'もらえるもの', en: 'What you get' },
    'pg.a.what': { ja: '内容', en: 'What it is' },
    'pg.a.how': { ja: '手続き', jr: '使いかた', en: 'How to apply' },
    'pg.a.docs': { ja: '持ちもの {n}', en: '{n} items' },
    'pg.a.asks': { ja: '{n}問', en: '{n} questions' },
    'pg.a.open': { ja: '開く', en: 'Open' },
    'pg.s.how': { ja: '申し込み', jr: '申しこみ', en: 'Apply' },
    'pg.s.where': { ja: '窓口', jr: 'どこに行く', en: 'Where' },
    'pg.s.docs': { ja: '持ちもの', en: 'What to bring' },
    'pg.s.docsCount': { ja: 'そろった数', en: 'Ready' },
    'pg.s.docsAll': { ja: 'そろった', en: 'All set' },
    'pg.s.docsNote': { ja: '窓口でちがうことも。行く前に電話で確認を。', jr: '場所でちがうことも。行く前に電話でたしかめよう。', en: 'Can differ by office. Call ahead.' },
    'pg.s.when': { ja: '時期', jr: 'いつ', en: 'When' },
    'pg.ask': { ja: '窓口でこう聞く', en: 'What to ask' },
    'pg.ask.n': { ja: '問{n}', en: 'Q{n}' },
    'pg.ask.copy': { ja: 'コピー', en: 'Copy' },
    'pg.ask.copied': { ja: '質問をコピーしました', en: 'Questions copied' },
    'pg.ask.script': { ja: '台本を作る', en: 'Make a script' },
    'pg.show': { ja: '窓口で見せる', en: 'Show staff' },
    'pg.show.k': { ja: '窓口の方へ', en: 'For the staff' },
    'pg.show.lead': { ja: 'この制度について、聞きたいことがあります。', en: 'この制度について、聞きたいことがあります。' },
    'pg.show.foot': { ja: 'メモを取るので、ゆっくり教えてもらえると助かります。', en: 'メモを取るので、ゆっくり教えてもらえると助かります。' },
    'pg.show.close': { ja: '閉じる', en: 'Close' },
    'pg.show.hint': { ja: '画面を窓口の人に向けて見せてください。', en: 'Turn the screen to the staff. The text is in Japanese for them.' },
    'pg.contact': { ja: '連絡先', en: 'Contact' },
    'pg.loc.addr': { ja: '住所', en: 'Address' },
    'pg.loc.hours': { ja: '時間', en: 'Hours' },
    'pg.loc.tel': { ja: '電話', en: 'Phone' },
    'pg.loc.note': { ja: 'メモ', en: 'Note' },
    'pg.loc.map': { ja: '地図で見る', en: 'See on map' },
    'pg.loc.gmap': { ja: 'Google マップ', en: 'Google Maps' },
    'pg.loc.more': { ja: 'ほかの場所（{n}か所）', en: '{n} more places' },
    'pg.places': { ja: '場所', en: 'Places' },
    'pg.caution': { ja: '気をつけること', en: 'Good to know' },
    'pg.learn.k': { ja: 'まなぶ', en: 'Learn' },
    'pg.learn.h': { ja: '先に読んでおく', jr: '先に読んでおこう', en: 'Read first' },
    'pg.learn.min': { ja: '{n}分', en: '{n} min' },
    'pg.learn.done': { ja: '読んだ', en: 'Read' },
    'pg.sup': { ja: '支援者向けメモ', en: 'Notes for supporters' },
    'pg.sup.hint': { ja: '支援者向けのメモがあります', en: 'There are notes for supporters' },
    'pg.sup.show': { ja: '表示する', en: 'Show' },
    'pg.src': { ja: '出典', en: 'Source' },
    'pg.src.checked': { ja: '確認日 {d}', en: 'Checked {d}' },
    'pg.src.by': { ja: '確認 {by}', en: 'Checked by {by}' },
    'pg.src.warn': { ja: '金額や条件は変わることがあります。公式ページで最新を確認してください。', jr: '金額やルールは変わることがあります。公式ページでいちばん新しい内容を見てね。', en: 'Amounts and rules can change. Check the official page.' },
    'pg.report': { ja: 'まちがいを報告', en: 'Report a mistake' },
    'pg.report.msg': { ja: '報告の文をコピーしました。運営（Economix JP）に送ってください', en: 'Report text copied. Please send it to Economix JP.' },
    'pg.report.note': { ja: '報告用の文をコピーします。送り方：', en: 'Copies a report template. How to send:' },
    'pg.report.about': { ja: 'このサイトについて', en: 'About this site' },
    /* FIX-B (v6, F04): the person's own 区市町村 window, when the program is applied for there */
    'pg.local.k': { ja: 'あなたの区市町村の窓口', en: 'Your local office' },
    'pg.local.kArea': { ja: '{area}の窓口', en: 'Office for {area}' },
    'pg.local.map': { ja: '地図で見る', en: 'On the map' },
    'pg.local.page': { ja: '窓口のページ', en: 'Office page' },
    'pg.local.find': { ja: '近くの窓口をさがす', en: 'Find your local office' },
    'pg.local.findSub': { ja: '住んでいる区市町村の窓口で申し込みます', en: 'You apply at the office where you live' },
    'pg.local.none': { ja: '{area}の窓口を地図で見る', en: 'See offices near {area}' },
    'pg.local.call': { ja: '窓口に電話', en: 'Call office' },
    'pg.local.callLong': { ja: '{name}に電話する {num}', en: 'Call {name} {num}' },
    // v7 (Kanto): a city with one office per ward (横浜市 …), and a prefecture whose page lists every city's office
    'pg.local.multi': { ja: '窓口 {n}か所', en: '{n} offices' },
    'pg.local.list': { ja: '住んでいる市の窓口は、この県のページの一覧で', jr: '住んでいる市の窓口は、県のページの一覧でわかるよ', en: 'Your city\'s office is in the prefecture\'s list' },
    'pg.prefVer': { ja: '{pref}に住む人は{pref}版へ', jr: '{pref}に住む人は{pref}版を見てね', en: 'Live in {pref}? See the {pref} version' },
    'pg.area.k': { ja: '住んでいる所', en: 'Where you live' },
    'pg.area.where': { ja: '地域', en: 'Area' },
    'pg.area.origin': { ja: '巣立った所', en: 'Where you left care' },
    'pg.area.originNote': { ja: '今住んでいる所ではなく、どこの施設・里親家庭から巣立ったかで決まります', jr: '今住んでいる所ではなく、どこの施設や里親家庭から巣立ったかで決まるよ', en: 'Goes by where you left care, not where you live now' },
    'pg.area.more': { ja: '{list}など {n}か所', en: '{list} and more ({n} places)' },
    'pg.prefVer.k': { ja: '住んでいる都県の版', en: 'Your prefecture\'s version' },
    'pg.related': { ja: '同じ「{cat}」の支援', en: 'More for {cat}' },
    'pg.related.all': { ja: 'すべて見る', en: 'See all' },
    'pg.bar': { ja: 'この制度でできること', en: 'Actions' },
    'pg.bar.webFull': { ja: '公式ページ', en: 'Official page' },
    'pg.bar.webLong': { ja: '公式ページを開く（新しいタブ）', en: 'Open the official page (new tab)' },
    'pg.bar.save': { ja: '保存', en: 'Save' },
    'pg.bar.saved': { ja: '保存ずみ', en: 'Saved' },
    'pg.hanko': { ja: '済', en: '✓' },
    'pg.newtab': { ja: '（新しいタブで開きます）', en: '(opens in a new tab)' },
    'pg.call': { ja: '電話する', en: 'Call' },
    'pg.callLong': { ja: '{name}に電話する {num}', en: 'Call {name} {num}' },
    'pg.web.go': { ja: '公式ページ', en: 'Official page' },
    'pg.free': { ja: '無料', en: 'Free' },
    'pg.hoursK': { ja: '受付時間', en: 'Hours' },
    'pg.today': { ja: '今日 {h}', en: 'Today {h}' },
    'pg.closedToday': { ja: '今日はお休み', en: 'Closed today' },
    'pg.closedNow': { ja: '受付時間外', en: 'Closed now' },
    'pg.openNow': { ja: '今あいています', en: 'Open now' },
    'pg.h24': { ja: '24時間', en: '24 hours' },
    'pg.line': { ja: 'LINEで相談', en: 'Chat on LINE' },
    'pg.chat': { ja: 'チャットで相談', en: 'Online chat' },
    'pg.web': { ja: '公式ページ', en: 'Official page' },
    'pg.jaOnly': { ja: '', en: 'Japanese only — you can show this part to the staff.' }
  });

  /* ---------------------------------------------------------------- opening hours (best effort)
   * Reads strings like "月・水・金・土 10時〜17時／火・木 10時〜20時（日・祝は休み）" or "平日 8:30〜17:15".
   * Returns null when it can't tell. Holidays are not known, so the full text is always shown too.
   * Exported as SM.hoursToday (other views use it). */
  var DOW = { '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };
  function parseDays(spec) {
    if (/毎日|毎週|年中|365/.test(spec)) return [0, 1, 2, 3, 4, 5, 6];
    var out = {};
    if (/平日/.test(spec)) { [1, 2, 3, 4, 5].forEach(function (d) { out[d] = 1; }); spec = spec.replace(/平日/g, ''); }
    var rng = /([月火水木金土日])\s*[〜~～\-–]\s*([月火水木金土日])/g, m;
    while ((m = rng.exec(spec))) { for (var d = DOW[m[1]]; ; d = (d + 1) % 7) { out[d] = 1; if (d === DOW[m[2]]) break; } }
    spec.replace(rng, '').replace(/[月火水木金土日]/g, function (c) { out[DOW[c]] = 1; return c; });
    return Object.keys(out).map(Number);
  }
  function hoursToday(h, now) {
    var txt = h && typeof h === 'object' ? (h.ja || '') : String(h || '');
    if (!txt) return null;
    now = now || new Date();
    var dow = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
    var main = txt.replace(/（[^）]*）|\([^)]*\)/g, '');
    if (/24時間/.test(main) && !/\d+\s*(時|:)\d*\s*[〜~～]/.test(main)) return { open: true, label: t('pg.h24'), h24: true };
    var closed = {};
    (txt.match(/（[^）]*休[^）]*）|\([^)]*休[^)]*\)/g) || []).forEach(function (c) {
      c.replace(/年末年始|元日|祝日?/g, '').replace(/[月火水木金土日]/g, function (x) { closed[DOW[x]] = 1; return x; });
    });
    if (closed[dow]) return { open: false, closedDay: true, label: t('pg.closedToday') };
    var segs = main.split(/[／\/。]/).filter(function (x) { return /\d/.test(x) && !/^\s*(LINE|メール|チャット|居場所|学習会|工房)/i.test(x); });
    var timeRe = /(\d{1,2})(?:時|:)(\d{1,2})?分?\s*[〜~～\-–]\s*(翌)?(\d{1,2})(?:時|:)?(\d{1,2})?分?/;
    var hit = null, anyDays = false;
    segs.forEach(function (sg) {
      if (hit) return;
      var tm = timeRe.exec(sg);
      if (!tm) return;
      var spec = sg.slice(0, tm.index).replace(/^[^:：]*[:：]/, '');
      var days = parseDays(spec);
      if (days.length) anyDays = true; else days = [0, 1, 2, 3, 4, 5, 6];
      if (days.indexOf(dow) === -1) return;
      var a = (+tm[1]) * 60 + (+(tm[2] || 0)), b = (+tm[4]) * 60 + (+(tm[5] || 0));
      if (tm[3] || b <= a) b += 24 * 60;
      var lab = sg.slice(tm.index, tm.index + tm[0].length).trim();
      hit = { open: (mins >= a && mins < b) || (mins + 1440 < b), label: t('pg.today', { h: lab }), range: lab };
    });
    if (hit) return hit;
    if (anyDays) return { open: false, closedDay: true, label: t('pg.closedToday') };
    return null;
  }
  SM.hoursToday = hoursToday;
  function hoursLine(c) {
    var h = hoursToday(c && c.hours);
    if (!h) return '';
    return h.label + (h.closedDay || h.open ? '' : '・' + t('pg.closedNow'));
  }
  // A phone labelled as the night/holiday or 24h line (e.g. 189) is not bound by the office hours.
  var ALWAYS_LINE = /24時間|夜[・、]?休日|夜間[・、]?休日|休日[・、]?夜間/;
  function statusOf(c) {
    var lab = c && c.phoneLabel ? (typeof c.phoneLabel === 'object' ? c.phoneLabel.ja : c.phoneLabel) : '';
    var hs = c && c.phone && !ALWAYS_LINE.test(lab || '') ? hoursToday(c.hours) : null;
    if (!hs) return null;
    return { open: !!hs.open, h24: !!hs.h24, range: hs.range || '', text: hs.h24 ? t('pg.h24') : hs.closedDay ? t('pg.closedToday') : hs.open ? t('pg.openNow') : t('pg.closedNow') };
  }

  /* ---------------------------------------------------------------- helpers */
  function shortName(p) {
    var n = L(p.name);
    var s = n.replace(/（[^）]*）|\([^)]*\)/g, '').trim();
    return s || n;
  }
  SM.programShortName = SM.programShortName || shortName;

  function telHref(n) {
    return 'tel:' + String(n).replace(/[^\d+#*]/g, '').replace(/#/g, '%23');
  }
  SM.telHref = SM.telHref || telHref;

  // English mode: much of the data is Japanese only. Mark it so screen readers use Japanese, and say so.
  function jaOnly(o) { return en() && !(o && typeof o === 'object' && !Array.isArray(o) && o.en); }
  function jaNote() { return '<p class="pg-ja-note">' + esc(t('pg.jaOnly')) + '</p>'; }
  function langAttr(o) { return jaOnly(o) ? ' lang="ja"' : ''; }
  function list(a) { return Array.isArray(a) ? a.filter(function (x) { return x != null && String(L(x)).trim() !== ''; }) : []; }
  function newTab() { return '<span class="sr-only">' + esc(t('pg.newtab')) + '</span>'; }
  function webOf(p) { var c = p.contact || {}; return c.web || (p.source && p.source.url) || ''; }

  /* ---------------------------------------------------------------- the person's own 区市町村 window (FIX-B v6, F04)
   * A national / prefecture-wide program applied for at "区市町村の自立相談支援機関（くらしの相談窓口）" names no office.
   * The app holds those offices: <slug>-jiritsu-sodan records (data/programs-local.js: one per Tokyo 区市; v7 Kanto
   * files: 政令市・市, and the prefecture's own desk for 町村 residents), the same records the map shows.
   * With an answered 区市町村: that office (name, phone, 地図で見る); a city with one window per ward (横浜市) shows the
   * office and how many windows; a prefecture whose desk record lists every city's office (茨城・栃木・群馬) points
   * to it. Without a city: one row to the map. Facts come only from the data (nothing invented). */
  var LOCAL_RE = /自立相談支援機関|くらしの(困りごと)?相談/;
  function jaText(x) { return x && typeof x === 'object' ? (x.ja || '') : String(x || ''); }
  function MU() { return SM.matchUtil || {}; }
  function prefOf(code) {
    if (MU().prefOf) { try { return MU().prefOf(code); } catch (e) { } }
    code = code == null ? '' : String(code);
    return /^\d{5}$/.test(code) ? code.slice(0, 2) : /^\d{2}$/.test(code) ? code : null;
  }
  // an office record: the 自立相談支援機関 of a place (川崎市's is called だいJOBセンター)
  function isOffice(x) { return !!x && (/-jiritsu-sodan$/.test(x.id) || x.id === 'kawasaki-daijob'); }
  function areasOf(p) {
    var as = ((p && p.for && p.for.areas) || []).map(String);
    if (!as.length && p && p.basis === 'tokyo') as = ['13'];
    return as;
  }
  function localKind(p) {
    if (!p || isOffice(p)) return null;
    var as = areasOf(p);
    if (as.length) {
      // a record made for some cities names its own office; a prefecture's record only for people in it
      if (as.every(function (c) { return /^\d{5}$/.test(c); })) return null;
      var mp = prefOf(myArea());
      if (mp && as.indexOf(mp) === -1) return null;
      if (!mp && as.indexOf('13') === -1 && myArea()) return null;
    }
    return LOCAL_RE.test(jaText(p.where) + ' ' + jaText(p.how)) ? 'jiritsu' : null;
  }
  // answers.area when it is a 区市町村 or a prefecture of 関東 (v7: 5-digit or 2-digit code), else null
  function myArea() {
    var a = SM.state && SM.state.answers ? SM.state.answers.area : null;
    return typeof a === 'string' && (/^(08|09|10|11|12|13|14)\d{3}$/.test(a) || /^(08|09|10|11|12|13|14)$/.test(a)) ? a : null;
  }
  // the Japanese name of a 区市町村 (the data's 担当 notes are Japanese, whatever the language on screen)
  function areaJa(code) { var a = code && SM.area ? SM.area(code) : null; return a ? a.name : ''; }
  function areaType(code) { var a = code && SM.area ? SM.area(code) : null; return a ? a.type : ''; }
  /* the window of an office record for one 区市町村: its one location there, else the one whose 担当 note names the
     place, else the record's only location; several there (one per ward) → multi */
  function pickLoc(x, code) {
    var locs = Array.isArray(x.locations) ? x.locations : [];
    var here = [], nm = areaJa(code), named = -1;
    for (var j = 0; j < locs.length; j++) {
      var l = locs[j];
      if (!l) continue;
      if (String(l.area) === code) here.push(j);
      if (named === -1 && nm && jaText(l.note).indexOf(nm) !== -1) named = j;
    }
    if (here.length === 1) return { i: here[0], n: 1 };
    if (named !== -1) return { i: named, n: 1, named: true };
    if (here.length > 1) return { i: -1, n: here.length, multi: true };
    if (locs.length === 1) return { i: 0, n: 1 };
    return { i: -1, n: locs.length, multi: locs.length > 1 };
  }
  // multi: the record's own main number when it has one (江東区: two windows, one number), none otherwise (横浜市)
  function office(x, code) {
    var pl = pickLoc(x, code);
    var loc = pl.i >= 0 ? x.locations[pl.i] : null;
    var phone = loc ? (loc.phone || '') : ((x.contact && x.contact.phone) || '');
    var mapI = loc ? pl.i : -1;
    return { p: x, loc: loc, i: mapI, n: pl.n, multi: !!pl.multi, mode: 'own', phone: phone, name: loc && loc.name ? loc.name : L(x.name) };
  }
  function localOffice(code) {
    if (!code) return null;
    code = String(code);
    var ps = (SM.data && SM.data.programs) || [];
    var i, x;
    if (/^\d{5}$/.test(code)) {
      // 1. an office made for this 区市町村 (a city's own, or the prefecture's desk for its 町村)
      for (i = 0; i < ps.length; i++) {
        x = ps[i];
        if (isOffice(x) && areasOf(x).indexOf(code) !== -1) return office(x, code);
      }
      // v8: a ward of a 政令市 (14101) without an office of its own → the city's office (14100), its window for the ward
      var cityC = SM.matchUtil && SM.matchUtil.cityOf ? SM.matchUtil.cityOf(code) : null;
      if (cityC && cityC !== code) {
        for (i = 0; i < ps.length; i++) {
          x = ps[i];
          if (isOffice(x) && areasOf(x).indexOf(cityC) !== -1) return office(x, code);
        }
      }
    }
    // 2. outside Tokyo, the prefecture's desk record: a window whose 担当 names the place, the desk's number for
    //    町村 residents (as its label says), else the record itself — it lists every city's office
    var pf = prefOf(code);
    if (!pf || pf === '13' || code.length !== 5) return null;
    for (i = 0; i < ps.length; i++) {
      x = ps[i];
      if (!isOffice(x) || areasOf(x).indexOf(pf) === -1) continue;
      var pl = pickLoc(x, code);
      if (pl.named) return office(x, code);
      var c = x.contact || {}, town = /^(machi|mura)$/.test(areaType(code));
      if (town && c.phone && /町村/.test(jaText(c.phoneLabel))) return { p: x, loc: null, i: -1, n: 0, multi: false, mode: 'own', phone: c.phone, name: jaText(c.phoneLabel) || L(x.name) };
      return { p: x, loc: null, i: -1, n: 0, multi: false, mode: 'list', phone: '', name: L(x.name) };
    }
    return null;
  }
  SM.localOffice = SM.localOffice || localOffice;
  function localInfo(p) {
    if (!localKind(p)) return null;
    var code = myArea();
    return { code: code, office: code && code.length === 5 ? localOffice(code) : null };
  }
  // a 区市町村 or (v7) a prefecture code, in the language on screen
  function placeName(code) {
    if (!code) return '';
    if (String(code).length === 2) return SM.ui && SM.ui.prefLabel ? SM.ui.prefLabel(code) : '';
    // v8: a ward of a 政令市 with its city (「横浜市 鶴見区の窓口」; 緑区 alone names four places)
    var a = SM.area ? SM.area(code) : null;
    if (a && a.parent && SM.matchUtil && SM.matchUtil.areaFull) return SM.matchUtil.areaFull(code, en());
    return areaName(code);
  }
  function localHtml(p, o) {
    var li = localInfo(p);
    if (!li) return '';
    var city = li.code && li.code.length === 5 ? li.code : null;
    var area = placeName(li.code);
    var off = li.office;
    var pin = '<span class="pg-local-pin" aria-hidden="true">' + ic('pin') + '</span>';
    if (!off) {
      // no office in the data for this place (or only the prefecture is known): the map, which lists what there is
      var href = city ? '#/map/' + enc(city) : '#/map';
      return '<a class="pg-local is-find" href="' + esc(href) + '" data-press="ink"' + (o.still ? '' : rv('up', 320)) + '>' + pin +
        '<span class="pg-local-text"><span class="pg-local-k">' + esc(area ? t('pg.local.kArea', { area: area }) : t('pg.local.k')) + '</span>' +
        '<span class="pg-local-name">' + esc(city ? t('pg.local.none', { area: area }) : t('pg.local.find')) + '</span>' +
        (city ? '' : '<span class="pg-local-sub">' + esc(t('pg.local.findSub')) + '</span>') + '</span>' + arrow('r', 'pg-local-go') + '</a>';
    }
    var nmAttr = en() && !(off.p.name && off.p.name.en) ? ' lang="ja"' : '';
    var nm = en() && off.p.name && off.p.name.en ? off.p.name.en : off.name;
    var page = '<a class="pg-tlink" href="#/p/' + enc(off.p.id) + '"><span>' + esc(t('pg.local.page')) + '</span>' + arrow('r') + '</a>';
    if (off.mode === 'list') {
      // the prefecture's desk record, whose page lists each city's office (茨城・栃木・群馬)
      return '<section class="pg-local" aria-labelledby="pg-h-local"' + (o.still ? '' : rv('up', 320)) + '>' +
        '<h2 class="pg-local-k" id="pg-h-local">' + pin + '<span>' + esc(t('pg.local.kArea', { area: area })) + '</span></h2>' +
        '<p class="pg-local-name"' + nmAttr + '>' + esc(nm) + '</p>' +
        '<p class="pg-local-sub">' + esc(t('pg.local.list')) + '</p>' +
        '<p class="pg-local-acts">' + page + '</p></section>';
    }
    // the map opens where the window is (a 町 served from a desk in another city), on that window when there is one
    var mapCode = off.loc && /^\d{5}$/.test(String(off.loc.area || '')) ? String(off.loc.area) : city;
    var mapHref = '#/map/' + enc(mapCode) + (off.i >= 0 ? '/' + enc(off.p.id + '~' + off.i) : '');
    var acts = '<a class="pg-tlink" href="' + esc(mapHref) + '"><span>' + esc(t('pg.local.map')) + '</span>' + arrow('r') + '</a>' + page;
    return '<section class="pg-local" aria-labelledby="pg-h-local"' + (o.still ? '' : rv('up', 320)) + '>' +
      '<h2 class="pg-local-k" id="pg-h-local">' + pin + '<span>' + esc(t('pg.local.kArea', { area: area })) + '</span></h2>' +
      '<p class="pg-local-name"' + nmAttr + '>' + esc(nm) + '</p>' +
      (off.multi ? '<p class="pg-local-sub">' + esc(t('pg.local.multi', { n: off.n })) + '</p>' : '') +
      (off.phone ? '<div class="pg-tel-row pg-local-tel"><a class="pg-tel-num" href="' + esc(telHref(off.phone)) + '" tabindex="-1" aria-hidden="true" data-noruby>' + esc(off.phone) + '</a>' +
        '<a class="btn btn-secondary btn-sm pg-tel-call" href="' + esc(telHref(off.phone)) + '" data-press aria-label="' + esc(t('pg.local.callLong', { name: nm, num: off.phone })) + '">' + ic('phone') + '<span>' + esc(t('pg.call')) + '</span></a></div>' : '') +
      '<p class="pg-local-acts">' + acts + '</p></section>';
  }

  function repayInfo(p) {
    if (p.repay === 'none' || (!p.repay && p.kind === 'grant')) return { v: t('ui.repay.none'), tone: 'free' };
    if (p.repay === 'conditional' || p.kind === 'loan_forgivable') return { v: t('ui.repay.conditional'), tone: 'loan' };
    if (p.repay === 'yes' || p.kind === 'loan') return { v: t('ui.repay.yes'), tone: 'loan' };
    return null;
  }

  function areaName(code) {
    var a = code && SM.area ? SM.area(code) : null;
    return a ? (en() ? (a.en || a.name) : a.name) : '';
  }

  /* amount text set like a price in print: only MONEY numbers (followed by 万/円/千/億/%, or a range
     "50〜80%") are big; other numbers (23区, 2026年度, 1回30分) stay body size. Text in （ ） is a small
     note. The first money number gets data-count, so it rolls in like a station board. */
  var MONEY_AFTER = /^(\s*[万円千億%％]|[〜~～\-–]\s*[0-9０-９][0-9０-９,，.．]*\s*[万円千億%％])/;
  function numHtml(s, o) {
    var out = '', last = 0, re = /[0-9０-９][0-9０-９,，.．]*/g, m;
    while ((m = re.exec(s))) {
      var num = m[0].replace(/[,，.．]+$/, '');
      re.lastIndex = m.index + num.length;
      out += esc(s.slice(last, m.index));
      var money = MONEY_AFTER.test(s.slice(m.index + num.length)), attr = '';
      if (money && o.count && !o.counted && /^(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(num)) {
        var v = parseFloat(num.replace(/,/g, ''));
        if (isFinite(v) && v >= 3) {
          o.counted = true;
          var dec = (num.split('.')[1] || '').length;
          attr = ' data-count="' + v + '"' + (dec ? ' data-count-decimals="' + dec + '"' : '');
        }
      }
      out += money ? '<b class="amt-n"' + attr + '>' + esc(num) + '</b>' : '<span class="amt-o">' + esc(num) + '</span>';
      last = m.index + num.length;
    }
    return out + esc(s.slice(last));
  }
  function amtHtml(s, o) {
    o = o || {};
    s = SM.ui.normAmount ? SM.ui.normAmount(s) : String(s);   // 2万7400円 → 2万7,400円
    var out = '', buf = '', depth = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch === '（' || ch === '(') {
        if (depth === 0) { out += numHtml(buf, o); buf = ''; }
        depth++; buf += ch;
      } else if ((ch === '）' || ch === ')') && depth > 0) {
        buf += ch; depth--;
        if (depth === 0) { out += '<span class="pg-amt-note">' + numHtml(buf, {}) + '</span>'; buf = ''; }
      } else buf += ch;
    }
    if (buf) out += depth > 0 ? '<span class="pg-amt-note">' + numHtml(buf, {}) + '</span>' : numHtml(buf, o);
    return out;
  }
  /* "A 5万円・B 3万円・C 2万円" → one line each (only when the part is long and every line keeps an amount) */
  var HAS_AMT = /[0-9０-９][0-9０-９,，.．]*\s*[万円千億%％]/;
  function amountParts(str) {
    var out = [];
    String(str).split(/\s*／\s*/).filter(Boolean).forEach(function (part) {
      if (part.length <= 30) { out.push(part); return; }
      var pieces = [], buf = '', depth = 0;
      for (var i = 0; i < part.length; i++) {
        var ch = part.charAt(i);
        if (ch === '（' || ch === '(') depth++;
        else if ((ch === '）' || ch === ')') && depth > 0) depth--;
        if ((ch === '・' || ch === '＋') && depth === 0) { pieces.push(buf); buf = ''; } else buf += ch;
      }
      pieces.push(buf);
      var segs = [], cur = '';
      pieces.forEach(function (x) {
        cur = cur ? cur + '・' + x : x;
        if (HAS_AMT.test(cur.replace(/（[^）]*）|\([^)]*\)/g, ''))) { segs.push(cur.trim()); cur = ''; }
      });
      if (cur) { if (segs.length) segs[segs.length - 1] += '・' + cur; else segs.push(cur); }
      out = out.concat(segs);
    });
    return out;
  }

  /* ---------------------------------------------------------------- masthead */
  function head(p, o) {
    var cat = (p.cat && p.cat[0]) || 'procedures';
    var bits = [];
    if (p.basis) bits.push('<span class="pg-basis">' + esc(SM.ui.basisLabel(p)) + '</span>');
    var cats = (p.cat || [cat]).slice(0, 2).map(function (k) { return SM.ui.catLabel(k); }).filter(Boolean);
    if (cats.length) bits.push('<span>' + esc(cats.join(en() ? ', ' : '・')) + '</span>');
    var tags = [];
    if (p.for && p.for.careOnly) tags.push(SM.ui.tag(t('pg.careOnly'), 'local'));
    if (p.right) tags.push(SM.ui.tag(t('pg.right'), 'right'));
    // one short sub-line at most (SPEC-v5: ≤ 25 chars); a long hook stays in もらえるもの
    var hook = L(p.hook);
    if (hook && hook.length > (en() ? 60 : 25)) hook = '';
    var still = o.still;
    return '<header class="pg-head">' +
      '<div class="pg-mast"' + (still ? '' : rv('mark', 0)) + '>' + SM.ui.catIcon(cat, 'lg', { hero: true }) + '</div>' +
      '<div class="pg-meta">' +
        '<p class="pg-eyebrow">' + bits.join('<span class="pg-sep" aria-hidden="true">／</span>') + '</p>' +
        (tags.length ? '<p class="pg-tags"' + (still ? '' : rv('fade', 260)) + '>' + tags.join('') + '</p>' : '') +
      '</div>' +
      '<h1 class="pg-title" data-vt-hero="title"' + (still ? '' : rv('line', 60)) + '>' + esc(L(p.name)) + '</h1>' +
      '<span class="pg-title-rule"' + (still ? '' : rv('rule', 180)) + ' aria-hidden="true"></span>' +
      (hook ? '<p class="pg-hook"' + langAttr(p.hook) + (still ? '' : rv('up', 260)) + '>' + SM.ui.marker(hook) + '</p>' : '') +
    '</header>';
  }

  /* v7 (Kanto): a national scheme that each 都県 runs as its own program (自立支援資金貸付, サポステ): the person's
     prefecture's version as one ruled link row; with no answer yet, every version the app has, as a row of names
     (東京都 first). Outside Kanto: nothing. (SM.tokyoVersion in match.js is the Tokyo case of the same idea.) */
  var VERSIONED = ['jiritsu-shikin', 'saposute'];
  var PREF_SLUG = { '13': 'tokyo', '14': 'kanagawa', '11': 'saitama', '12': 'chiba', '08': 'ibaraki', '09': 'tochigi', '10': 'gunma' };
  // display order: 東京都, then the code order (Object.keys would put '10'–'14' before '08' and '09')
  var PREF_ORDER = ['13', '08', '09', '10', '11', '12', '14'];
  function prefVersions(p) {
    if (!p || p.basis !== 'national' || p.pref) return [];
    var ids = VERSIONED.indexOf(p.id) !== -1 ? [] : null;
    var tv = SM.tokyoVersion && SM.tokyoVersion[p.id];
    if (!ids && !tv) return [];
    return PREF_ORDER.map(function (code) {
      var id = code === '13' && tv ? tv : PREF_SLUG[code] + '-' + p.id;
      var x = SM.program(id);
      return x && x !== p ? { code: code, p: x } : null;
    }).filter(Boolean);
  }
  function tokyoNote(p) {
    var vs = prefVersions(p);
    if (!vs.length) return '';
    var a = SM.state && SM.state.answers ? SM.state.answers.area : null;
    if (a === 'other') return '';
    var pf = myArea() ? prefOf(myArea()) : null;
    if (a && !pf) return '';
    if (pf) {
      var v = vs.filter(function (x) { return x.code === pf; })[0];
      if (!v) return '';
      return '<a class="pg-tokyo" href="#/p/' + esc(enc(v.p.id)) + '" data-press="ink"><span class="pg-tokyo-k">' + esc(t('pg.prefVer', { pref: placeName(pf) })) + '</span>' +
        '<span class="pg-tokyo-n">' + esc(shortName(v.p)) + '</span>' + arrow('r', 'pg-tokyo-go') + '</a>';
    }
    return '<nav class="pg-prefs" aria-labelledby="pg-prefs-k"><p class="pg-tokyo-k" id="pg-prefs-k">' + esc(t('pg.prefVer.k')) + '</p>' +
      '<ul class="pg-prefs-list" role="list">' + vs.map(function (x) {
        return '<li><a class="pg-tlink" href="#/p/' + esc(enc(x.p.id)) + '"><span>' + esc(placeName(x.code)) + '</span>' + arrow('r') + '</a></li>';
      }).join('') + '</ul></nav>';
  }


  /* ---------------------------------------------------------------- key facts: 3 label / value cells */
  function deadlineHead(p) {
    var d = p.deadline;
    if (!d) return '';
    // months → 「4月〜6月」; otherwise the first clause of the written text (leaveMonths is a planning hint for
    // やること, not a deadline: 「出る4か月前」 would misread as the last day to apply)
    var src = d.months && d.months.length && SM.ui.deadlineShort ? SM.ui.deadlineShort(d) : L(d);
    if (!src && SM.ui.deadlineShort) src = SM.ui.deadlineShort(d);
    var h = SM.ui.factSplit ? SM.ui.factSplit(src).head : src;
    var max = en() ? 34 : 16;
    if (h.length > max) { var c = h.search(en() ? /,\s/ : /[、，]/); if (c > 3 && c <= max + 4) h = h.slice(0, c); }
    return h;
  }
  function factCells(p, o) {
    var cells = [];
    var amount = L(p.amount);
    if (amount) {
      var cl = SM.ui.amountClause ? SM.ui.amountClause(amount) : { text: amountParts(amount)[0], more: amountParts(amount).length > 1 };
      var txt = cl.text || amount, more = !!cl.more;
      // ONE amount: stop at the first ・ / ＋ / 、 that closes an amount (生活費 月5万円・家賃… → 生活費 月5万円 ＋ほか)
      var top = txt.replace(/（[^）]*）|\([^)]*\)/g, function (m) { return new Array(m.length + 1).join('\u0000'); });
      var reCut = /[・＋、]|\s\+\s|,\s/g, mm;
      while ((mm = reCut.exec(top))) { var lft = txt.slice(0, mm.index); if (HAS_AMT.test(lft) || /¥\s*[0-9]/.test(lft)) { txt = txt.slice(0, mm.index).trim(); more = true; break; } }
      var free = /^(相談は)?無料|^free/i.test(txt) && !HAS_AMT.test(txt) && !/¥\s*[0-9]/.test(txt);
      var loan = /^loan/.test(p.kind || '') || p.repay === 'yes' || p.repay === 'conditional';
      var grant = p.kind === 'grant' || p.repay === 'none';
      var label = free ? t('pg.k.cost') : loan ? t('pg.k.loan') : grant ? t('pg.k.grant') : (HAS_AMT.test(txt) || /¥\s*[0-9]/.test(txt)) ? t('pg.k.amount') : t('pg.k.what');
      cells.push({
        k: label, cls: 'is-amount' + (free ? ' tone-free' : ''), wide: true, attrs: langAttr(p.amount),
        html: free ? esc(t('pg.free')) : '<span class="pg-amt-line">' + amtHtml(txt, { count: !o.still }) + '</span>' +
          (more ? '<span class="pg-k-more">' + esc(t('ui.amountMore')) + '</span>' : '')
      });
    }
    var r = repayInfo(p);
    if (r) cells.push({ k: t('pg.f.repay'), html: esc(r.v), cls: 'tone-' + r.tone });
    var c = p.contact || {};
    var st = c.phone ? statusOf(c) : null;
    var hrsCell = null;
    if (st) {
      hrsCell = { k: t('pg.k.hours'), cls: 'is-hours' + (st.open ? ' is-open' : ''),
        html: '<span class="pg-dot" aria-hidden="true"></span>' + esc(st.text) + (st.range && !st.h24 ? '<small data-noruby>' + esc(st.range) + '</small>' : '') };
    } else if (/24\s*時間/.test(L(c.hours) || '')) {
      hrsCell = { k: t('pg.k.hours'), cls: 'is-hours is-open', html: '<span class="pg-dot" aria-hidden="true"></span>' + esc(t('pg.h24')) };
    }
    var dl = deadlineHead(p);
    var timed = p.deadline && ((p.deadline.months && p.deadline.months.length) || !p.deadline.always);
    var dlCell = dl ? { k: t(timed ? 'pg.f.deadline' : 'pg.s.when'), html: esc(dl), cls: timed ? 'tone-deadline' : '', attrs: langAttr(p.deadline), wide: dl.length > (en() ? 22 : 10) } : null;
    // a hotline: 受付 first; everything else: 締切 first
    var order = p.kind === 'hotline' || !p.deadline ? [hrsCell, dlCell] : [dlCell, hrsCell];
    order.forEach(function (x) { if (x) cells.push(x); });
    if (cells.length < 3 && p.effort) {
      var lvl = { low: 1, mid: 2, high: 3 }[p.effort] || 0;
      cells.push({
        k: t('pg.f.effort'), cls: 'is-effort',
        html: '<span class="pg-meter-row"><span class="pg-meter" data-lvl="' + lvl + '" aria-hidden="true">' +
          [1, 2, 3].map(function (i) { return '<i class="' + (i <= lvl ? 'is-on' : '') + '"></i>'; }).join('') + '</span>' +
          '<span class="pg-meter-t">' + esc(t('pg.effort.s' + lvl)) + '</span></span>'
      });
    }
    if (cells.length < 3 && p.basis) cells.push({ k: t('pg.f.basis'), html: esc(SM.ui.basisLabel(p)) });
    return cells.slice(0, 3);
  }
  function facts(p, o) {
    var cells = factCells(p, o);
    if (!cells.length) return '';
    // in reading order: halves pair up; a half left alone before a wide cell (or at the end) becomes wide
    var col = 0, prev = null;
    cells.forEach(function (c) {
      if (c.wide) { if (col === 1 && prev) prev.wide = true; col = 0; }
      else if (col === 0) col = 1;
      else { c.right = true; col = 0; }
      prev = c;
    });
    if (col === 1 && prev) prev.wide = true;
    return '<section class="pg-glance" aria-labelledby="pg-h-facts">' +
      '<h2 class="sr-only" id="pg-h-facts">' + esc(t('pg.facts')) + '</h2>' +
      '<dl class="pg-facts"' + (o.still ? '' : ' data-reveal-stagger="70"') + '>' + cells.map(function (c) {
        return '<div class="pg-f' + (c.wide ? ' is-wide' : '') + (c.right ? ' is-r' : '') + (c.cls ? ' ' + c.cls : '') + '">' +
          '<dt>' + esc(c.k) + '</dt><dd' + (c.attrs || '') + '>' + c.html + '</dd></div>';
      }).join('') + '</dl></section>';
  }

  /* ---------------------------------------------------------------- actions (inline + sticky bar) */
  function saveBtn(p, cls, lOn, lOff, aria) {
    var saved = SM.isSaved(p.id);
    return '<button type="button" class="' + cls + (saved ? ' is-saved' : '') + '" data-act="save" data-id="' + esc(p.id) + '" aria-pressed="' + saved + '"' +
      ' data-label-on="' + esc(lOn) + '" data-label-off="' + esc(lOff) + '"' + (aria ? ' aria-label="' + esc(aria) + '"' : '') + ' data-press>' +
      ic(saved ? 'star-fill' : 'star') + '<span class="save-label">' + esc(saved ? lOn : lOff) + '</span>' +
      '<span class="pg-hanko" aria-hidden="true" data-noruby>' + esc(t('pg.hanko')) + '</span></button>';
  }
  function actions(p, o) {
    var c = p.contact || {};
    var web = webOf(p);
    var st = c.phone ? statusOf(c) : null;
    var main = '';
    if (c.phone) {
      main = '<a class="btn btn-primary btn-block btn-lg pg-call-btn pg-main-act" href="' + esc(telHref(c.phone)) + '" data-press' +
        ' aria-label="' + esc(t('pg.callLong', { name: L(c.phoneLabel) || shortName(p), num: c.phone }) + (st ? '（' + st.text + '）' : '')) + '">' +
        '<span class="pg-call-l">' + ic('phone') + '<span>' + esc(t('pg.call')) + '</span></span>' +
        '<b class="pg-call-num" data-noruby>' + esc(c.phone) + '</b></a>';
    } else if (web) {
      main = '<a class="btn btn-primary btn-block btn-lg pg-web-btn pg-main-act" href="' + esc(web) + '" target="_blank" rel="noopener noreferrer" data-press>' +
        '<span>' + esc(t('pg.web.go')) + '</span>' + ic('external') + newTab() + '</a>';
    }
    var save = saveBtn(p, 'btn pg-save' + (main ? '' : ' is-main'), t('pg.bar.saved'), t('pg.bar.save'), t('ui.save') + '：' + shortName(p));
    var second = c.phone && web ? '<a class="btn pg-web2" href="' + esc(web) + '" target="_blank" rel="noopener noreferrer" data-press>' +
      '<span>' + esc(t('pg.bar.webFull')) + '</span>' + ic('external') + newTab() + '</a>' : '';
    return '<div class="pg-actions no-print" id="pg-actions" role="group" aria-label="' + esc(t('pg.bar')) + '"' + (o.still ? '' : rv('up', 220)) + '>' +
      main + '<div class="pg-act-row' + (second ? '' : ' is-one') + '">' + save + second + '</div></div>';
  }
  function actionBar(p) {
    var c = p.contact || {};
    var web = webOf(p);
    var st = c.phone ? statusOf(c) : null;
    var main = '';
    // FIX-B (F04): a program applied for at the person's own office: that office's phone rides in the bar too
    var li = !c.phone ? localInfo(p) : null, off = li && li.office && li.office.phone ? li.office : null;
    var local = off ? '<a class="pg-act pg-act-local" href="' + esc(telHref(off.phone)) + '" data-press aria-label="' + esc(t('pg.local.callLong', { name: off.name, num: off.phone })) + '">' + ic('phone') +
      '<span class="pg-act-call-t"><b>' + esc(t('pg.local.call')) + '</b><small data-noruby>' + esc(off.phone) + '</small></span></a>' : '';
    if (c.phone) {
      main = '<a class="pg-act pg-act-call" href="' + esc(telHref(c.phone)) + '" data-press aria-label="' + esc(t('pg.callLong', { name: shortName(p), num: c.phone }) + (st ? '（' + st.text + '）' : '')) + '">' + ic('phone') +
        '<span class="pg-act-call-t"><b>' + esc(t('pg.call')) + '</b><small data-noruby>' + esc(c.phone) + '</small></span></a>';
    } else if (web) {
      main = '<a class="pg-act pg-act-web' + (local ? ' is-short' : '') + '" href="' + esc(web) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(t('pg.bar.webLong')) + '"><span>' + esc(t('pg.bar.webFull')) + '</span>' + ic('external') + '</a>';
    }
    return '<div class="pg-bar no-print' + (main || local ? '' : ' is-solo') + (local ? ' has-local' : '') + '" id="pg-bar" role="group" aria-label="' + esc(t('pg.bar')) + '">' +
      saveBtn(p, 'pg-act pg-act-save', t('pg.bar.saved'), t('pg.bar.save'), t('ui.save') + '：' + shortName(p)) + main + local + '</div>';
  }

  /* ---------------------------------------------------------------- collapsed sections */
  /* acc(key, title, meta, body): <section> + <h2><button aria-expanded> + a region (hidden; "until-found" where the
     browser supports it, so find-in-page still reaches the text). Opening: SM.motion.expand (the space opens, the
     rows below slide down), then the rows inside cascade in. */
  var UNTIL_FOUND = typeof document !== 'undefined' && document.body && ('onbeforematch' in document.body);
  var OPEN = { id: null, keys: {} };
  function acc(p, key, title, meta, body) {
    if (!body) return '';
    var open = OPEN.id === p.id && !!OPEN.keys[key];
    var bid = 'pg-acc-' + key, hid = 'pg-acc-b-' + key;
    return '<section class="pg-acc' + (open ? ' is-open' : '') + '" data-acc="' + key + '">' +
      '<h2 class="pg-acc-h"><button type="button" class="pg-acc-btn" id="' + hid + '" data-act="pg-acc" data-press="ink" aria-expanded="' + open + '" aria-controls="' + bid + '">' +
        '<span class="pg-acc-t">' + esc(title) + '</span>' +
        (meta ? '<span class="pg-acc-meta" data-noruby>' + esc(meta) + '</span>' : '') +
        '<span class="more-ic pg-acc-ic" aria-hidden="true"></span></button></h2>' +
      '<div class="pg-acc-body" id="' + bid + '" role="region" aria-labelledby="' + hid + '"' + (open ? '' : (UNTIL_FOUND ? ' hidden="until-found"' : ' hidden')) + '>' + body + '</div>' +
    '</section>';
  }

  /* 対象 */
  /* v7 (Kanto): where it applies, as one label / value line: 住んでいる所 神奈川県 (eligibleBy 'residence'), 巣立った所
     (eligibleBy 'origin': where you left care, not where you live), else 地域; a list of 町村 is cut after 4 names */
  function areaLine(p) {
    var as = ((p.for && p.for.areas) || []).map(String);   // only areas the record names (not 東京都's implicit one)
    if (!as.length) return '';
    var names = as.map(placeName).filter(Boolean);
    if (!names.length) return '';
    var sep = en() ? ', ' : '・';
    var v = names.length > 6 ? t('pg.area.more', { list: names.slice(0, 4).join(sep), n: names.length }) : names.join(sep);
    var origin = p.eligibleBy === 'origin';
    var k = origin ? 'pg.area.origin' : p.eligibleBy === 'residence' ? 'pg.area.k' : 'pg.area.where';
    return '<p class="pg-area"><span class="pg-area-k">' + esc(t(k)) + '</span>' +
      '<span class="pg-area-v">' + esc(v) + '</span>' +
      (origin ? '<span class="pg-area-n">' + esc(t('pg.area.originNote')) + '</span>' : '') + '</p>';
  }
  function whoBody(p) {
    var who = L(p.who), area = areaLine(p);
    if (!who) return area;
    return area + (jaOnly(p.who) ? jaNote() : '') + '<p class="pg-text"' + langAttr(p.who) + '>' + esc(who) + '</p>';
  }
  /* もらえるもの / 内容: the summary, then every amount line with its notes */
  function getBody(p) {
    var amount = L(p.amount), summary = L(p.summary), hook = L(p.hook);
    var html = '';
    if (hook && hook.length > (en() ? 60 : 25)) html += '<p class="pg-text pg-text-hook"' + langAttr(p.hook) + '>' + esc(hook) + '</p>';
    if (summary) html += '<p class="pg-text"' + langAttr(p.summary) + '>' + esc(summary) + '</p>';
    if (amount) {
      var parts = amountParts(amount);
      html += '<ul class="pg-amts"' + langAttr(p.amount) + '>' + parts.map(function (s) { return '<li>' + amtHtml(s, {}) + '</li>'; }).join('') + '</ul>';
    }
    return html;
  }
  /* 手続き: 時期 → steps (申し込み · 窓口 · 持ちもの checklist) → 連絡先 → 場所 → 支援者メモ */
  function docsDone(id) {
    var all = SM.store.get('pgDocs', {}) || {};
    return Array.isArray(all[id]) ? all[id] : [];
  }
  function docsCounter(done, total) {
    var all = done >= total;
    return '<span class="pg-docs-count' + (all ? ' is-all' : '') + '" id="pg-docs-count"><span class="sr-only">' + esc(t('pg.s.docsCount')) + ' </span>' +
      '<b class="pg-docs-n" id="pg-docs-n">' + done + '</b><span class="pg-docs-of"> / ' + total + '</span>' +
      '<span class="pg-docs-all" aria-hidden="' + (all ? 'false' : 'true') + '"' + (all ? '' : ' hidden') + '>' + esc(t('pg.s.docsAll')) + '</span></span>';
  }
  function stepsHtml(p) {
    var items = [];
    var how = L(p.how), where = L(p.where), docs = list(p.docs);
    if (how) items.push({ title: t('pg.s.how'), body: '<p' + langAttr(p.how) + '>' + esc(how) + '</p>' });
    if (where) items.push({ title: t('pg.s.where'), body: '<p' + langAttr(p.where) + '>' + esc(where) + '</p>' });
    if (docs.length) {
      var done = docsDone(p.id).filter(function (i) { return i < docs.length; });
      items.push({
        title: t('pg.s.docs'), docs: true, count: docsCounter(done.length, docs.length),
        body: '<ul class="pg-docs"' + (en() ? ' lang="ja"' : '') + '>' + docs.map(function (d, i) {
            var on = done.indexOf(i) !== -1;
            return '<li><label class="pg-doc"><input type="checkbox" class="pg-doc-in" data-act="pg-doc" data-i="' + i + '"' + (on ? ' checked' : '') + '>' +
              '<span class="pg-doc-box" aria-hidden="true">' + ic('check') + '</span><span class="pg-doc-t">' + esc(L(d)) + '</span></label></li>';
          }).join('') + '</ul><p class="pg-note">' + esc(t('pg.s.docsNote')) + '</p>'
      });
    }
    if (!items.length) return '';
    var jo = jaOnly(p.how) || jaOnly(p.where);
    return (jo ? jaNote() : '') + '<div class="pg-steps-wrap"><span class="pg-rail" aria-hidden="true"><i class="pg-rail-fill"></i></span>' +
      '<ol class="pg-steps">' + items.map(function (s, i) {
        return '<li class="pg-step' + (s.docs ? ' is-docs' : '') + '"><span class="pg-step-n" aria-hidden="true">' + (i + 1) + '</span>' +
          '<div class="pg-step-body"><h3 class="pg-step-t"><span>' + esc(s.title) + '</span>' + (s.count || '') + '</h3>' + s.body + '</div></li>';
      }).join('') + '</ol></div>';
  }
  function whenHtml(p) {
    var d = L(p.deadline);
    if (!d) return '';
    return '<dl class="pg-kv"><div><dt>' + esc(t('pg.s.when')) + '</dt><dd' + langAttr(p.deadline) + '>' + esc(d) + '</dd></div></dl>';
  }
  function contactHtml(p) {
    var c = p.contact;
    if (!c || !(c.phone || c.line || c.chat || c.web || L(c.hours))) return '';
    var html = '<div class="pg-contact"><h3 class="pg-sub-h">' + esc(t('pg.contact')) + '</h3>';
    if (c.phone) {
      var free = /^(0120|0800)/.test(String(c.phone).replace(/\D/g, '')) && !/無料|フリーダイヤル|free/i.test(L(c.phoneLabel) || '');
      var line = hoursLine(c);
      var st = statusOf(c);
      html += '<div class="pg-tel">' +
        '<p class="pg-tel-label"' + langAttr(c.phoneLabel) + '>' + esc(L(c.phoneLabel) || t('ui.phone')) + (free ? ' ' + SM.ui.tag(t('pg.free'), 'free') : '') + '</p>' +
        '<div class="pg-tel-row"><a class="pg-tel-num" href="' + esc(telHref(c.phone)) + '" tabindex="-1" aria-hidden="true" data-noruby>' + esc(c.phone) + '</a>' +
          '<a class="btn btn-secondary btn-sm pg-tel-call" href="' + esc(telHref(c.phone)) + '" data-press aria-label="' + esc(t('pg.callLong', { name: L(c.phoneLabel) || shortName(p), num: c.phone })) + '">' + ic('phone') + '<span>' + esc(t('pg.call')) + '</span></a></div>' +
        (line ? '<p class="pg-today' + (st && st.open ? ' is-open' : '') + '"><i aria-hidden="true"></i>' + esc(line) + '</p>' : '') +
      '</div>';
    }
    var hrs = L(c.hours);
    if (hrs) html += '<dl class="pg-hours"><dt>' + esc(t('pg.hoursK')) + '</dt><dd' + langAttr(c.hours) + '>' + esc(hrs) + '</dd></dl>';
    var links = [];
    if (c.line) links.push([c.line, t('pg.line')]);
    if (c.chat) links.push([c.chat, t('pg.chat')]);
    if (c.web) links.push([c.web, t('pg.web')]);
    links.forEach(function (x) {
      var host = ''; try { host = x[0].replace(/^https?:\/\//, '').split('/')[0]; } catch (e) { }
      html += '<a class="pg-link-row" href="' + esc(x[0]) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="pg-link-t">' + esc(x[1]) + '</span><span class="pg-link-host">' + esc(host) + '</span>' + ic('external', 'pg-link-go') + newTab() + '</a>';
    });
    return html + '</div>';
  }
  function locRow(p, l, i) {
    var name = l.name || shortName(p);
    var area = areaName(l.area);
    var rows = [];
    if (l.addr) rows.push([t('pg.loc.addr'), esc(l.addr)]);
    if (l.hours) rows.push([t('pg.loc.hours'), esc(L(l.hours))]);
    if (l.phone) rows.push([t('pg.loc.tel'), '<a class="pg-loc-tel" href="' + esc(telHref(l.phone)) + '" data-noruby>' + esc(l.phone) + '</a>']);
    if (l.note) rows.push([t('pg.loc.note'), esc(L(l.note))]);
    var acts = [];
    if (l.area) acts.push(SM.ui.button(t('pg.loc.map'), { href: '#/map/' + enc(l.area) + '/' + enc(p.id + '~' + i), variant: 'secondary', size: 'sm', icon: 'pin', arrow: true }));
    if (typeof l.lat === 'number' && typeof l.lng === 'number') {
      acts.push('<a class="pg-tlink" href="https://www.google.com/maps/search/?api=1&amp;query=' + l.lat + ',' + l.lng + '" target="_blank" rel="noopener noreferrer"><span>' + esc(t('pg.loc.gmap')) + '</span>' + ic('external', 'pg-tlink-ext') + newTab() + '</a>');
    }
    return '<li class="pg-loc">' +
      '<h4 class="pg-loc-name">' + esc(name) + (area ? '<span class="pg-loc-area">' + esc(area) + '</span>' : '') + '</h4>' +
      (rows.length ? '<dl class="pg-loc-kv">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>' : '') +
      (acts.length ? '<div class="pg-loc-actions">' + acts.join('') + '</div>' : '') +
    '</li>';
  }
  function placesHtml(p) {
    var locs = Array.isArray(p.locations) ? p.locations.filter(Boolean) : [];
    if (!locs.length) return '';
    var mine = SM.state && SM.state.answers ? SM.state.answers.area : null;
    var idx = locs.map(function (l, i) { return { l: l, i: i }; });
    if (mine) idx.sort(function (a, b) { return (b.l.area === mine) - (a.l.area === mine) || a.i - b.i; });
    var first = idx.slice(0, 3), rest = idx.slice(3);
    var lj = en() ? ' lang="ja"' : '';
    var html = '<div class="pg-places"><h3 class="pg-sub-h">' + esc(t('pg.places')) + '</h3>' + (en() ? jaNote() : '') +
      '<ul class="pg-locs"' + lj + '>' + first.map(function (x) { return locRow(p, x.l, x.i); }).join('') + '</ul>';
    if (rest.length) {
      html += '<details class="disclose pg-more"><summary><span>' + esc(t('pg.loc.more', { n: rest.length })) + '</span></summary>' +
        '<ul class="pg-locs"' + lj + '>' + rest.map(function (x) { return locRow(p, x.l, x.i); }).join('') + '</ul></details>';
    }
    return html + '</div>';
  }
  function howBody(p) {
    var parts = whenHtml(p) + stepsHtml(p) + contactHtml(p) + placesHtml(p);
    return parts ? parts + supporter(p) : '';
  }
  /* 窓口でこう聞く */
  function askCopyText(p) {
    var a = list(p.ask);
    return shortName(p) + (en() ? ' — questions' : ' について聞きたいこと') + '\n' + a.map(function (q, i) { return (i + 1) + '. ' + L(q); }).join('\n');
  }
  function asksBody(p) {
    var a = list(p.ask);
    if (!a.length) return '';
    return (jaOnly(a[0]) ? jaNote() : '') +
      '<ol class="pg-asks"' + langAttr(a[0]) + '>' + a.map(function (q, i) {
        return '<li class="pg-ask"><span class="pg-ask-n">' + esc(t('pg.ask.n', { n: i + 1 })) + '</span><p class="pg-ask-q">' + esc(L(q)) + '</p></li>';
      }).join('') + '</ol>' +
      '<div class="pg-ask-actions">' +
        SM.ui.button(t('pg.show'), { act: 'pg-show', variant: 'secondary', size: 'sm', icon: 'text-size', attrs: 'aria-haspopup="dialog" data-press' }) +
        SM.ui.button(t('pg.ask.copy'), { act: 'copy', variant: 'secondary', size: 'sm', icon: 'copy', attrs: 'data-press data-text="' + esc(askCopyText(p)) + '" data-msg="' + esc(t('pg.ask.copied')) + '"' }) +
        '<a class="pg-tlink" href="#/tools/script/' + enc(p.id) + '"><span>' + esc(t('pg.ask.script')) + '</span>' + arrow('r') + '</a>' +
      '</div>';
  }
  /* 気をつけること (safety text: never cut) */
  function cautionBody(p) {
    var c = L(p.caution);
    if (!c) return '';
    return '<p class="pg-text pg-caution-t"' + langAttr(p.caution) + '>' + esc(c) + '</p>';
  }
  function supporterMemo(p) {
    return '<section class="pg-sup" aria-label="' + esc(t('pg.sup')) + '">' + SM.ui.callout('<span' + langAttr(p.supporter) + '>' + esc(L(p.supporter)) + '</span>', 'info', { title: t('pg.sup') }) + '</section>';
  }
  function supporter(p) {
    if (!L(p.supporter)) return '';
    if (SM.state.settings.supporter) return supporterMemo(p);
    return '<p class="pg-sup-hint"><span>' + esc(t('pg.sup.hint')) + '</span>' +
      '<button type="button" class="pg-linkbtn" data-act="pg-supporter">' + esc(t('pg.sup.show')) + '</button></p>';
  }
  /* 出典 (small print) */
  function checkedOf(p) { return (p.source && p.source.checked) || SM.updated; }
  function sourceBody(p) {
    var s = p.source || {};
    var links = [];
    if (s.url) links.push({ org: s.org || s.url, url: s.url });
    (Array.isArray(p.sources2) ? p.sources2 : []).forEach(function (x) { if (x && x.url) links.push({ org: x.org || x.url, url: x.url }); });
    var checked = checkedOf(p);
    var report = (en() ? '[Sudachi Map — correction report]' : '【巣立ちマップ まちがいの報告】') + '\n' +
      (en() ? 'Program: ' : '制度名：') + L(p.name) + '（' + p.id + '）\n' +
      (en() ? 'Checked date: ' : '確認日：') + checked + '\n' +
      (en() ? 'What is wrong:' : 'まちがっていること：') + '\n\n' +
      (en() ? 'Correct information / source (if you know):' : '正しい内容・出典（わかれば）：') + '\n';
    return '<div class="pg-src">' +
      (links.length ? '<ul class="pg-src-links">' + links.map(function (x) {
        return '<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer"><span>' + esc(x.org) + '</span>' + ic('external', 'pg-src-ext') + newTab() + '</a></li>';
      }).join('') + '</ul>' : '') +
      '<p class="pg-src-meta"><span>' + esc(t('pg.src.checked', { d: SM.fmtDate(checked) })) + '</span>' +
        (p.verifiedBy ? '<span>' + esc(t('pg.src.by', { by: p.verifiedBy })) + '</span>' : '') + '</p>' +
      '<p class="pg-src-warn">' + esc(t('pg.src.warn')) + '</p>' +
      '<div class="pg-report">' +
        SM.ui.button(t('pg.report'), { act: 'copy', variant: 'text', size: 'sm', icon: 'copy', attrs: 'data-text="' + esc(report) + '" data-msg="' + esc(t('pg.report.msg')) + '"' }) +
        '<p>' + esc(t('pg.report.note')) + '</p><a class="pg-tlink pg-report-about" href="#/about"><span>' + esc(t('pg.report.about')) + '</span>' + arrow('r') + '</a>' +
      '</div>' +
    '</div>';
  }
  function sections(p, o) {
    var amount = L(p.amount);
    var docsN = list(p.docs).length, asksN = list(p.ask).length;
    var rows = [
      acc(p, 'who', t('pg.a.who'), '', whoBody(p)),
      acc(p, 'get', t(amount ? 'pg.a.get' : 'pg.a.what'), '', getBody(p)),
      acc(p, 'how', t('pg.a.how'), docsN ? t('pg.a.docs', { n: docsN }) : '', howBody(p)),
      acc(p, 'ask', t('pg.ask'), asksN ? t('pg.a.asks', { n: asksN }) : '', asksBody(p)),
      acc(p, 'caution', t('pg.caution'), '', cautionBody(p)),
      acc(p, 'src', t('pg.src'), SM.fmtDate(checkedOf(p)), sourceBody(p))
    ].filter(Boolean);
    // supporter memo without a 手続き section (rare): its own row under the list
    var sup = !howBody(p) ? supporter(p) : '';
    return '<div class="pg-accs"' + (o.still ? '' : ' data-reveal-stagger="50" data-reveal-delay="260"') + '>' + rows.join('') + '</div>' + sup;
  }

  /* opening / closing a section */
  var CASCADE = '.pg-kv > div, .pg-step, .pg-docs > li, .pg-ask, .pg-ask-actions, .pg-tel, .pg-hours, .pg-link-row, .pg-loc, .pg-src-links > li, .pg-amts > li, .pg-text, .pg-sup-hint';
  function cascadeIn(body) {
    var M = motion();
    if (!M || !M.animate || reduced()) return;
    var items = Array.prototype.slice.call(body.querySelectorAll(CASCADE)).filter(function (el) {
      return !el.closest('details:not([open])');
    }).slice(0, 10);
    items.forEach(function (el, i) {
      try { M.animate(el, [{ opacity: 0, translate: '0 24px' }, { opacity: 1, translate: '0 0' }], { spring: 'rise', delay: 70 + Math.min(i, 8) * 50, fill: 'backwards', key: 'pg-casc' }); } catch (e) { }
    });
    // 手続き: the rail draws down and each square stamps in turn
    var fill = body.querySelector('.pg-rail-fill');
    if (fill) { try { M.animate(fill, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 520 + 140 * body.querySelectorAll('.pg-step').length, delay: 120, easing: 'cubic-bezier(0.5, 0, 0.15, 1)', fill: 'backwards', key: 'pg-rail' }); } catch (e) { } }
    Array.prototype.forEach.call(body.querySelectorAll('.pg-step-n'), function (n, i) {
      n.classList.add('is-wait');
      setTimeout(function () { n.classList.remove('is-wait'); if (M.stamp) { try { M.stamp(n); } catch (e) { } } }, 200 + i * 160);
    });
    // 持ちもの: the count rolls up from 0 to what is already ticked
    var cn = body.querySelector('#pg-docs-n');
    if (cn && M.odometer && +cn.textContent > 0) { try { M.odometer(cn, cn.textContent, { from: '0', delay: 300 }); } catch (e) { } }
  }
  function setAcc(sec, open, o) {
    o = o || {};
    var btn = sec.querySelector('.pg-acc-btn'), body = sec.querySelector('.pg-acc-body');
    if (!btn || !body) return;
    var art = sec.closest('.pg[data-id]');
    var id = art ? art.getAttribute('data-id') : null;
    if (OPEN.id !== id) OPEN = { id: id, keys: {} };
    OPEN.keys[sec.getAttribute('data-acc')] = open;
    var apply = function (v) {
      if (v) body.removeAttribute('hidden'); else body.setAttribute('hidden', UNTIL_FOUND ? 'until-found' : '');
      sec.classList.toggle('is-open', v);
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    };
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    sec.classList.toggle('is-open', open);
    var M = motion();
    if (!o.instant && M && typeof M.expand === 'function') {
      M.expand(sec, open, { setOpen: apply, body: body });
      if (open) cascadeIn(body);
    } else apply(open);
    if (open) {
      try { if (SM.applyRuby) SM.applyRuby(body); } catch (e) { }
      if (window.requestAnimationFrame) requestAnimationFrame(function () { fitRuby(body); });
    }
  }
  SM.on('pg-acc', function (btn) {
    var sec = btn.closest ? btn.closest('.pg-acc') : null;
    if (!sec) return;
    setAcc(sec, btn.getAttribute('aria-expanded') !== 'true');
  });
  // find-in-page reached hidden text: open that section at once
  if (UNTIL_FOUND) document.addEventListener('beforematch', function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('.pg-acc-body') : null;
    var sec = b && b.closest('.pg-acc');
    if (sec) setAcc(sec, true, { instant: true });
  }, true);

  /* ---------------------------------------------------------------- まなぶ, related */
  function lessonsFor(id) {
    var junior = SM.useJr ? SM.useJr() : false;
    var ls = (SM.data.lessons || []).filter(function (l) { return l && l.id && Array.isArray(l.related) && l.related.indexOf(id) !== -1; });
    ls.sort(function (a, b) {
      var ra = junior ? (a.level === 'jr' ? 0 : a.level === 'all' ? 1 : 2) : (a.level === 'jr' ? 2 : 0);
      var rb = junior ? (b.level === 'jr' ? 0 : b.level === 'all' ? 1 : 2) : (b.level === 'jr' ? 2 : 0);
      return ra - rb || (a.related.indexOf(id) - b.related.indexOf(id)) || ((a.order || 99) - (b.order || 99));
    });
    return ls.slice(0, 2);
  }
  SM.lessonsFor = SM.lessonsFor || lessonsFor;
  function lessonRow(l) {
    var done = SM.isLearned ? SM.isLearned(l.id) : false;
    var thumb = illus('learn-cover-' + l.id, { size: 'thumb', animate: false, cls: 'pg-lesson-il' }) || SM.ui.catIcon(l.cat || 'money', 'sm');
    return '<li><a class="pg-lesson" href="#/learn/' + esc(enc(l.id)) + '" data-press="ink">' +
      '<span class="pg-lesson-thumb">' + thumb + '</span>' +
      '<span class="pg-lesson-text"><span class="pg-lesson-t">' + esc(L(l.title)) + '</span>' +
        '<span class="pg-lesson-k"><span>' + esc(t('pg.learn.min', { n: l.minutes || 2 })) + '</span>' + (done ? SM.ui.tag(t('pg.learn.done'), 'free') : '') + '</span></span>' +
      arrow('r', 'pg-lesson-go') + '</a></li>';
  }
  function lessons(p) {
    var ls = lessonsFor(p.id);
    if (!ls.length) return '';
    return '<section class="pg-learn cv" aria-labelledby="pg-h-learn">' +
      SM.ui.sectionHeader(t('pg.learn.h'), { id: 'pg-h-learn' }) +
      '<ul class="pg-lessons" data-reveal-stagger="60">' + ls.map(lessonRow).join('') + '</ul></section>';
  }
  function related(p) {
    var cat = p.cat && p.cat[0];
    if (!cat) return '';
    var area = SM.state && SM.state.answers ? SM.state.answers.area : null;
    // 中学生: nothing made only for older people (same rule as their search results — SPEC-v3 §3)
    var jrOk = SM.isJunior && SM.isJunior() && SM.matchUtil && SM.matchUtil.jrOk;
    var out = (SM.data.programs || []).filter(function (x) {
      if (!x || x.id === p.id || !x.cat || x.cat[0] !== cat) return false;
      if (jrOk && !jrOk(x)) return false;
      // v7: the area rule of the results (SM.matchUtil.usableIn): nothing the person cannot use where they live
      var U = SM.matchUtil;
      if (U && U.usableIn) return U.usableIn(x, area || null) !== false;
      var as = (x.for && x.for.areas) || [];
      if (as.length && as[0] !== '13' && area && area.length === 5 && as.indexOf(area) === -1) return false;
      if (as.length && area === 'other') return false;
      return true;
    });
    // with no area answered, another prefecture's own records go below those for everyone (and this one's prefecture)
    var U2 = SM.matchUtil, myP = U2 && U2.recPref ? U2.recPref(p) : null;
    function far(x) { if (area || !U2 || !U2.recPref) return 0; var rp = U2.recPref(x); return rp && rp !== myP ? 2 : 0; }
    out.sort(function (a, b) {
      var sa = (a.basis === p.basis ? 1 : 0) + ((a.cat || []).filter(function (c) { return (p.cat || []).indexOf(c) !== -1; }).length) - far(a);
      var sb = (b.basis === p.basis ? 1 : 0) + ((b.cat || []).filter(function (c) { return (p.cat || []).indexOf(c) !== -1; }).length) - far(b);
      return sb - sa;
    });
    out = out.slice(0, 3);
    if (!out.length) return '';
    var headHtml = SM.ui.sectionHeader(t('pg.related', { cat: SM.ui.catLabel(cat) }), { action: { label: t('pg.related.all'), href: '#/find/cat/' + cat }, id: 'pg-h-rel' });
    return '<section class="pg-related cv" aria-labelledby="pg-h-rel">' + headHtml +
      '<div class="pcards" data-reveal-stagger="50">' + out.map(function (x) { return SM.ui.programCard(x, { compact: true }); }).join('') + '</div></section>';
  }

  /* ---------------------------------------------------------------- deferred rendering (MOTION-SPEC §6 rule 4) */
  var DEFER = null;   // { id, parts: { name: html } } — filled into [data-defer=name] after the transition
  function canDefer(id) {
    var M = motion();
    if (!M || typeof M.afterTransition !== 'function' || typeof M.inTransition !== 'function') return false;
    try { if (!M.inTransition()) return false; } catch (e) { return false; }
    var r = SM.route || {};
    if (r.kind === 'back' && (r.restoreY || 0) > 160) return false;
    var cur = document.querySelector('#view .pg[data-id]');
    if (cur && cur.getAttribute('data-id') === id) return false;
    return true;
  }
  function slot(name, html, defer) {
    if (!html) return '';
    if (!defer) return html;
    DEFER.parts[name] = html;
    return '<div class="pg-defer" data-defer="' + name + '"></div>';
  }
  function fillDeferred(root, id) {
    var d = DEFER;
    if (!d || d.id !== id) return;
    DEFER = null;
    var instant = !!(SM.route && SM.route.instant);
    Array.prototype.forEach.call(root.querySelectorAll('[data-defer]'), function (el) {
      var html = d.parts[el.getAttribute('data-defer')];
      if (!html) return;
      el.innerHTML = html;
      try { if (SM.applyRuby) SM.applyRuby(el); } catch (e) { }
      var M = motion();
      if (M && M.mount) { try { M.mount(el, { instant: instant }); } catch (e) { } }
    });
    if (window.requestAnimationFrame) requestAnimationFrame(function () { fitRuby(root); });
  }

  /* ---------------------------------------------------------------- the sticky bar
   * One rAF-throttled passive scroll check (a jump — an anchor, a restored position, a fling — can carry the actions
   * from below the screen to above it without ever intersecting, and the bar must still follow). */
  var SCROLL = null;
  function stopObservers() {
    if (SCROLL) { window.removeEventListener('scroll', SCROLL); window.removeEventListener('resize', SCROLL); SCROLL = null; }
  }
  function hasIO() { return typeof window.IntersectionObserver === 'function'; }
  // the line the page scrolls under: the bottom of the app bar, or of the sticky sub-bar on phones
  function chromeBottom() {
    var y = 0;
    ['.appbar', '.subbar'].forEach(function (s) {
      var el = document.querySelector(s);
      if (!el) return;
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || (cs.position !== 'sticky' && cs.position !== 'fixed')) return;
      y = Math.max(y, el.getBoundingClientRect().bottom);
    });
    return y || 56;
  }
  function wireBar(root) {
    var bar = root.querySelector('#pg-bar'), acts = root.querySelector('#pg-actions');
    if (!bar || !acts) return;
    var barOn = null;
    var setBar = function (on) {
      if (on === barOn) return;
      barOn = on;
      bar.classList.toggle('is-on', on);
      bar.setAttribute('aria-hidden', on ? 'false' : 'true');
      try { bar.inert = !on; } catch (e) { }
    };
    bar.classList.add('is-auto');
    setBar(false);
    var art = root.querySelector('.pg[data-id]') || root;
    var ticking = false;
    /* FIX-B (F46): the bar takes the tab bar's place only while you read on down. Scrolling back up (heading for
       the tabs) or reaching the end of the page (まなぶ / 同じ分野の支援) gives the tab bar back. */
    var lastY = window.scrollY || 0, upRun = 0, downRun = 0, wantUp = false;
    var paint = function () {
      ticking = false;
      if (!art.isConnected) { stopObservers(); return; }
      var y = window.scrollY || 0, dy = y - lastY;
      lastY = y;
      if (dy < 0) { upRun -= dy; downRun = 0; } else if (dy > 0) { downRun += dy; upRun = 0; }
      if (upRun > 48) wantUp = true;
      if (downRun > 24) wantUp = false;
      var past = acts.getBoundingClientRect().bottom <= chromeBottom() + 1;
      var vh = window.innerHeight || 800;
      var end = (document.documentElement.scrollHeight || 0) - (y + vh) < 120;
      setBar(past && !wantUp && !end);
    };
    SCROLL = function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
    window.addEventListener('scroll', SCROLL, { passive: true });
    window.addEventListener('resize', SCROLL, { passive: true });
    SCROLL();
  }

  // desktop: the whole side column (facts + actions) stays in view when it fits the screen
  var asideRO = null;
  function wireAside(root) {
    var aside = root.querySelector('.pg-aside');
    if (!aside || !window.matchMedia) return;
    var mq = window.matchMedia('(min-width: 1100px)');
    var fit = function () {
      if (!aside.isConnected) { window.removeEventListener('resize', fit); return; }
      if (!mq.matches) { aside.classList.remove('is-stick'); return; }
      var top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--appbar-h')) || 56;
      aside.classList.toggle('is-stick', aside.scrollHeight + top + 48 <= (window.innerHeight || 800));
    };
    if (asideRO) window.removeEventListener('resize', asideRO);
    asideRO = fit;
    window.addEventListener('resize', fit, { passive: true });
    fit();
  }

  // large-title hand-off (MOTION-SPEC §3.2): the sub-bar title stays quiet while the h1 is on screen
  var TITLE_IO = null;
  function wireTitle(root) {
    if (TITLE_IO) { try { TITLE_IO.disconnect(); } catch (e) { } TITLE_IO = null; }
    var st = document.querySelector('.subbar .subbar-title');
    var h1 = root.querySelector('h1');
    if (!st || !h1 || !hasIO()) { if (st) st.classList.remove('pg-quiet'); return; }
    st.classList.add('pg-quiet');
    var io = new IntersectionObserver(function (entries) {
      if (!h1.isConnected) { io.disconnect(); return; }
      var e = entries[entries.length - 1];
      st.classList.toggle('pg-quiet', e.isIntersecting || e.boundingClientRect.top > 0);
    }, { rootMargin: '-104px 0px 0px 0px', threshold: 0 });
    io.observe(h1);
    TITLE_IO = io;
  }
  SM.pgTitleHandoff = wireTitle;   // tools.js uses the same hand-off

  /* the primary action answers the tap: the phone icon stamps with an ink ring (the dialer opens on its own) */
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('#view .pg-main-act, #view .pg-act-call, #view .pg-tel-call') : null;
    if (!a) return;
    var M = motion(), svg = a.querySelector('svg');
    if (M && M.stamp && svg) { try { M.stamp(svg); } catch (e) { } }
  });

  /* ---------------------------------------------------------------- 窓口で見せる: a full-screen card for the desk */
  var SHOW = { el: null, opener: null };
  var SHELL = ['.appbar', '.subbar', '#view', '.tabbar', '.skip'];
  function shell(off) {
    SHELL.forEach(function (s) {
      var x = document.querySelector(s);
      if (!x) return;
      if (off) { x.setAttribute('aria-hidden', 'true'); try { x.inert = true; } catch (e) { } }
      else { x.removeAttribute('aria-hidden'); try { x.inert = false; } catch (e) { } }
    });
  }
  function closeShow(silent) {
    var el = SHOW.el;
    if (!el) return;
    SHOW.el = null;
    shell(false);
    document.body.classList.remove('pg-showing');
    try { document.documentElement.style.overflow = ''; } catch (e) { }
    if (!silent && SHOW.opener && document.contains(SHOW.opener)) { try { SHOW.opener.focus({ preventScroll: true }); } catch (e) { } }
    var M = motion();
    var a = !silent && M && M.animate ? M.animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'linear', fill: 'forwards' }) : null;
    var rm = function () { if (el.parentNode) el.parentNode.removeChild(el); };
    if (a && a.finished) a.finished.then(rm, rm); else rm();
  }
  function openShow(btn) {
    var art = btn && btn.closest ? btn.closest('.pg[data-id]') : null;
    var p = art ? SM.program(art.getAttribute('data-id')) : null;
    if (!p) return;
    closeShow(true);
    SHOW.opener = btn;
    var a = list(p.ask);
    var nm = p.name && p.name.ja ? p.name.ja : L(p.name);
    var el = document.createElement('div');
    el.className = 'v-program pg-show';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'pg-show-name');
    el.innerHTML =
      '<div class="pg-show-bar"><p class="pg-show-k">' + esc(t('pg.show.k')) + '</p>' +
        // quick exit stays one tap away: this page covers the app bar
        '<span class="pg-show-acts"><button type="button" class="pill pill-exit" data-act="exit" data-noruby title="' + esc(SM.t('core.exitHint')) + '">' + esc(SM.t('core.exit')) + '</button>' +
        '<button type="button" class="pg-show-x" data-act="pg-show-close">' + ic('close') + '<span>' + esc(t('pg.show.close')) + '</span></button></span></div>' +
      '<div class="pg-show-scroll"><div class="pg-show-body" lang="ja">' +
        '<p class="pg-show-lead">' + esc(SM.t('pg.show.lead')) + '</p>' +
        '<h2 class="pg-show-name" id="pg-show-name">' + esc(nm) + '</h2>' +
        (a.length ? '<ol class="pg-show-asks">' + a.map(function (q, i) {
          return '<li><span class="pg-show-n">問' + (i + 1) + '</span><p>' + esc(q && q.ja ? q.ja : L(q)) + '</p></li>';
        }).join('') + '</ol>' : '') +
        '<p class="pg-show-foot">' + esc(SM.t('pg.show.foot')) + '</p>' +
      '</div>' + (en() ? '<p class="pg-show-hint">' + esc(t('pg.show.hint')) + '</p>' : '') + '</div>';
    document.body.appendChild(el);
    SHOW.el = el;
    document.body.classList.add('pg-showing');
    try { document.documentElement.style.overflow = 'hidden'; } catch (e) { }
    shell(true);
    try { if (SM.applyRuby) SM.applyRuby(el); } catch (e) { }
    // the card rises into place, then its questions follow one by one
    var M = motion();
    if (M && M.animate) {
      M.animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' });
      var body = el.querySelector('.pg-show-body');
      if (body) M.animate(body, [{ opacity: 0, translate: '0 40px' }, { opacity: 1, translate: '0 0' }], { spring: 'rise', fill: 'backwards' });
      Array.prototype.forEach.call(el.querySelectorAll('.pg-show-asks > li'), function (li, i) {
        M.animate(li, [{ opacity: 0, translate: '0 24px' }, { opacity: 1, translate: '0 0' }], { spring: 'rise', delay: 120 + Math.min(i, 8) * 60, fill: 'backwards' });
      });
    }
    var x = el.querySelector('.pg-show-x');
    try { x.focus({ preventScroll: true }); } catch (e) { }
  }
  SM.on('pg-show', function (btn) { openShow(btn); });
  SM.on('pg-show-close', function () { closeShow(); });
  window.addEventListener('hashchange', function () { closeShow(true); });
  document.addEventListener('keydown', function (ev) {
    if (!SHOW.el) return;
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); closeShow(); return; }
    if (ev.key === 'Tab') {
      // focus cycles between the bar's buttons (すぐ閉じる, 閉じる)
      ev.preventDefault();
      var bs = SHOW.el.querySelectorAll('.pg-show-bar button'), n = bs.length;
      if (!n) return;
      var i = Array.prototype.indexOf.call(bs, document.activeElement);
      var j = i === -1 ? (ev.shiftKey ? n - 1 : 0) : (i + (ev.shiftKey ? n - 1 : 1)) % n;
      try { bs[j].focus(); } catch (e) { }
    }
  }, true);

  /* ---------------------------------------------------------------- acts */
  SM.on('pg-supporter', function (btn) {
    SM.state.settings.supporter = true;
    SM.save();
    if (SM.applySettings) SM.applySettings();
    var hint = btn && btn.closest ? btn.closest('.pg-sup-hint') : null;
    var art = btn && btn.closest ? btn.closest('.pg[data-id]') : null;
    var p = art ? SM.program(art.getAttribute('data-id')) : null;
    if (!hint || !p) { SM.render(); return; }
    var box = document.createElement('div');
    box.innerHTML = supporterMemo(p);
    var memo = box.firstChild;
    hint.parentNode.replaceChild(memo, hint);
    try { if (SM.applyRuby) SM.applyRuby(memo); } catch (e) { }
    var M = motion();
    if (M && M.animate) M.animate(memo, [{ opacity: 0, translate: '0 16px' }, { opacity: 1, translate: '0 0' }], { spring: 'rise' });
    var co = memo.querySelector('.callout');
    if (co) { co.setAttribute('tabindex', '-1'); try { co.focus({ preventScroll: true }); } catch (e) { } }
  });

  SM.on('pg-doc', function (el) {
    var art = el.closest ? el.closest('.pg[data-id]') : null;
    var id = art && art.getAttribute('data-id');
    if (!id) return;
    var i = +el.getAttribute('data-i');
    var all = SM.store.get('pgDocs', {}) || {};
    var arr = Array.isArray(all[id]) ? all[id] : [];
    var at = arr.indexOf(i);
    if (el.checked && at === -1) arr.push(i);
    if (!el.checked && at !== -1) arr.splice(at, 1);
    if (arr.length) all[id] = arr; else delete all[id];
    SM.store.set('pgDocs', all);
    var M = motion();
    var box = el.parentNode && el.parentNode.querySelector('.pg-doc-box');
    if (el.checked && box && M && M.check) { try { M.check(box, { fill: 'var(--ink)' }); } catch (e) { } }
    else if (!el.checked && box && M && M.uncheck) { try { M.uncheck(box, { color: 'var(--ink)' }); } catch (e) { } }
    // the count rolls like a station board; when everything is ready, a そろった hanko stamps once
    var total = art.querySelectorAll('.pg-doc-in').length;
    var done = art.querySelectorAll('.pg-doc-in:checked').length;
    var n = art.querySelector('#pg-docs-n');
    if (n) { if (M && M.odometer) M.odometer(n, String(done)); else n.textContent = String(done); }
    var cnt = art.querySelector('#pg-docs-count');
    var tag = art.querySelector('.pg-docs-all');
    var full = done >= total;
    if (cnt) cnt.classList.toggle('is-all', full);
    if (tag) {
      var was = !tag.hidden || !!tag._pgT;
      clearTimeout(tag._pgT); tag._pgT = 0;
      tag.setAttribute('aria-hidden', full ? 'false' : 'true');
      if (!full) tag.hidden = true;
      else if (!was) {
        if (M && M.stamp && !reduced()) {
          tag._pgT = setTimeout(function () { tag._pgT = 0; if (art.querySelectorAll('.pg-doc-in:checked').length < total) return; tag.hidden = false; try { M.stamp(tag); } catch (e) { } }, 480);
        } else tag.hidden = false;
        if (SM.announce) SM.announce(t('pg.s.docsAll'));
      }
    }
  });

  /* ---------------------------------------------------------------- view */
  /* ふりがな: a long compound with one reading (社会的養護自立支援拠点事業) is a single <ruby> and cannot wrap.
   * When one is wider than its line, show it as base + （reading） in small type so the text can wrap.
   * Runs after core's applyRuby (next frame). */
  function fitRuby(root) {
    if (!root || !document.body.classList.contains('is-ruby')) return;
    Array.prototype.forEach.call(root.querySelectorAll('ruby:not(.is-long)'), function (r) {
      var box = r.parentElement;
      while (box && box !== root && /^(inline|contents)/.test(getComputedStyle(box).display)) box = box.parentElement;
      if (box && box.clientWidth && r.getBoundingClientRect().width > box.clientWidth + 1) r.classList.add('is-long');
    });
  }
  SM.fitRuby = SM.fitRuby || fitRuby;

  SM.views.program = {
    tab: 'find',
    title: function (args) {
      var p = args && args[0] ? SM.program(args[0]) : null;
      return p ? { ja: shortName(p), en: (p.name && p.name.en) || shortName(p) } : { ja: t('pg.title'), en: 'Program' };
    },
    back: '#/find',
    mount: function (root, args) {
      stopObservers();
      var id = args && args[0];
      var M = motion();
      var after = function (fn) { if (M && M.afterTransition) M.afterTransition(fn); else setTimeout(fn, 0); };
      if (DEFER && DEFER.id === id) after(function () { fillDeferred(root, id); });
      else DEFER = null;
      if (!root.querySelector('.pg[data-id]')) return;
      wireBar(root);
      wireTitle(root);
      wireAside(root);
      after(function () { fitRuby(root); });
      // FIX-B (v6 motion): your office lifts in after the key facts and its map pin drops beside it, once
      var pin = root.querySelector('.pg-local-pin');
      if (pin && M && M.animate && !reduced() && !(SM.route && SM.route.instant)) {
        try { M.animate(pin, [{ translate: '0 -22px', scale: '0.6', opacity: 0 }, { translate: '0 0', scale: '1', opacity: 1 }], { spring: 'stamp', delay: 620, fill: 'backwards', key: 'pg-pin' }); } catch (e) { }
      }
    },
    render: function (args) {
      var id = args && args[0];
      var p = id ? SM.program(id) : null;
      DEFER = null;
      if (!p) {
        return '<div class="pg pg-nf"><h1 class="sr-only">' + esc(t('pg.nf.title')) + '</h1>' +
          SM.ui.empty(t('pg.nf.title'), t('pg.nf.body'), SM.ui.button(t('pg.nf.btn'), { href: '#/find', variant: 'primary' }), { illus: 'not-found' }) + '</div>';
      }
      if (OPEN.id !== p.id) OPEN = { id: p.id, keys: {} };
      var r = SM.route || {};
      var still = !!r.instant || reduced();   // back / revisit: nothing replays (MOTION-SPEC §3.8)
      var defer = canDefer(p.id);
      if (defer) DEFER = { id: p.id, parts: {} };
      var o = { still: still };
      return '<article class="pg wide-layout" data-id="' + esc(p.id) + '">' +
        head(p, o) +
        '<div class="pg-body">' +
          '<aside class="pg-aside">' + facts(p, o) + actions(p, o) + localHtml(p, o) + '</aside>' +
          '<div class="pg-main">' + tokyoNote(p) + sections(p, o) + '</div>' +
        '</div>' +
        slot('rest', lessons(p) + related(p), defer) +
        actionBar(p) +
      '</article>';
    },
    /* boot.js calls this after a save toggle; it has already stamped the star, flown a dot to やること and swapped
       every label. Here: the 済 hanko lands on this page's save buttons. */
    onSave: function (id, on, info) {
      if (!on || (info && info.undo)) return;
      var M = motion();
      if (!M || !M.stamp || reduced()) return;
      Array.prototype.forEach.call(document.querySelectorAll('#view .pg[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"] [data-act="save"] .pg-hanko'), function (h, i) {
        if (h.offsetParent === null) return;
        setTimeout(function () { try { M.stamp(h); } catch (e) { } }, 140 + i * 40);
      });
    }
  };
})();
