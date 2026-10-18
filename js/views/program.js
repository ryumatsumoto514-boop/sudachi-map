/* 巣立ちマップ v4 — program page  #/p/ID  (owner: PROGRAM)
 * An editorial fact sheet, 「教科書と駅サイン」 (VISUAL-SPEC §7.6 · MOTION-SPEC §4.2 Program):
 *   masthead: 56px kanji tile (the shared-morph destination) + who runs it / category + h1 + 2px rule
 *             + こんなとき (marker) + lead
 *   → ひと目でわかる: ruled fact grid (big amount numbers roll in)  → inline actions (call / save / links)
 *   → 01 申し込みまでの流れ: numbered ink squares on a rail that fills as you scroll; each square stamps
 *        when the fill reaches it; 持ちもの checklist with drawn checks and a rolling count
 *   → 02 窓口でこう聞く (hairline table, copy, 窓口で見せる)  → 03 連絡先  → 04 場所
 *   → 気をつけること → まなぶ (cover thumbs) → ツール → 支援者向けメモ → 出典 → 同じ分野の支援
 *   The sticky action bar appears only after the inline actions have scrolled out of view.
 *   Desktop ≥1100: reading column (7/12) + right column (glance, then actions that stick).
 * Speed (MOTION-SPEC §6 rule 4): during a page transition render() returns the first screen (masthead,
 * glance, actions, 01) and the rest lands in SM.motion.afterTransition, in the same DOM order.
 * Motion is optional: everything is visible and usable without SM.motion. */
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
    'pg.nf.body': { ja: 'リンクが古いかもしれません。名前が変わったか、掲載をやめた可能性があります。', jr: 'リンクが古いのかもしれません。「さがす」から、もう一度さがしてみてね。', en: 'The link may be old, or the program was renamed or removed.' },
    'pg.nf.btn': { ja: '支援をさがす', en: 'Search support' },
    'pg.when': { ja: 'こんなとき', en: 'When' },
    'pg.facts': { ja: 'ひと目でわかる', en: 'At a glance' },
    'pg.f.amount': { ja: 'もらえる・できること', jr: 'もらえる・できること', en: 'What you get' },
    'pg.f.repay': { ja: '返済', jr: '返すお金？', en: 'Pay back?' },
    'pg.f.kind': { ja: '種類', en: 'Type' },
    'pg.f.deadline': { ja: '締切・時期', jr: 'いつまで', en: 'Deadline' },
    'pg.f.effort': { ja: '手間', jr: 'たいへんさ', en: 'Effort' },
    'pg.f.basis': { ja: '運営', jr: 'やっているところ', en: 'Run by' },
    'pg.f.who': { ja: '対象', jr: '使える人', en: 'Who can use it' },
    'pg.effort.low': { ja: '電話・行くだけ', en: 'Just call or visit' },
    'pg.effort.mid': { ja: '書類がいくつか', en: 'A few documents' },
    'pg.effort.high': { ja: '書類が多い・審査あり', jr: '書類が多い・しらべてから決まる', en: 'Many documents, review' },
    'pg.effort.s1': { ja: 'かんたん', en: 'Easy' },
    'pg.effort.s2': { ja: 'ふつう', en: 'Some' },
    'pg.effort.s3': { ja: '多い', en: 'A lot' },
    'pg.right': { ja: '申請は権利', en: 'Your right' },
    'pg.how': { ja: '申し込みまでの流れ', jr: '使うまでの流れ', en: 'Steps to apply' },
    'pg.s.how': { ja: '申し込み・相談のしかた', jr: '申しこみ・相談のしかた', en: 'How to apply' },
    'pg.s.where': { ja: '窓口', jr: 'どこに行く・連絡する', en: 'Where to go' },
    'pg.s.docs': { ja: '持ちもの', en: 'What to bring' },
    'pg.s.docsTick': { ja: 'そろえたらチェック', en: 'Tick when ready' },
    'pg.s.docsCount': { ja: 'そろった数', en: 'Ready' },
    'pg.s.docsAll': { ja: 'そろった', en: 'All set' },
    'pg.s.docsNote': { ja: '窓口によってちがうことがあります。行く前に電話で確かめよう。', jr: '場所によってちがうことがあります。行く前に電話でたしかめよう。', en: 'This can differ by office. Call ahead to check.' },
    'pg.ask': { ja: '窓口でこう聞く', en: 'What to ask' },
    'pg.ask.sub': { ja: '窓口や電話で、このまま読めます。', jr: '窓口や電話で、このまま読めます。', en: 'You can read these out as they are.' },
    'pg.ask.n': { ja: '問{n}', en: 'Q{n}' },
    'pg.ask.copy': { ja: '質問をコピー', en: 'Copy questions' },
    'pg.ask.copied': { ja: '質問をコピーしました', en: 'Questions copied' },
    'pg.ask.script': { ja: '電話の台本を作る', en: 'Make a phone script' },
    'pg.show': { ja: '窓口で見せる', en: 'Show at the desk' },
    'pg.show.k': { ja: '窓口の方へ', en: 'For the staff' },
    'pg.show.lead': { ja: 'この制度について、聞きたいことがあります。', en: 'この制度について、聞きたいことがあります。' },
    'pg.show.foot': { ja: 'メモを取るので、ゆっくり教えてもらえると助かります。', en: 'メモを取るので、ゆっくり教えてもらえると助かります。' },
    'pg.show.close': { ja: '閉じる', en: 'Close' },
    'pg.show.hint': { ja: '画面を窓口の人に向けて見せてください。', en: 'Turn the screen to the staff. The text is in Japanese for them.' },
    'pg.contact': { ja: '連絡先', en: 'Contact' },
    'pg.places': { ja: '場所', en: 'Places' },
    'pg.loc.addr': { ja: '住所', en: 'Address' },
    'pg.loc.hours': { ja: '時間', en: 'Hours' },
    'pg.loc.tel': { ja: '電話', en: 'Phone' },
    'pg.loc.note': { ja: 'メモ', en: 'Note' },
    'pg.loc.map': { ja: '地図で見る', en: 'See on map' },
    'pg.loc.gmap': { ja: 'Google マップ', en: 'Google Maps' },
    'pg.loc.more': { ja: 'ほかの場所（{n}か所）', en: '{n} more places' },
    'pg.caution': { ja: '気をつけること', en: 'Good to know' },
    'pg.learn.k': { ja: 'まなぶ', en: 'Learn' },
    'pg.learn.h': { ja: 'この制度の前に知っておくと安心', jr: 'この制度を使う前に、読んでおこう', en: 'Good to know before you apply' },
    'pg.learn.min': { ja: '{n}分', en: '{n} min' },
    'pg.learn.done': { ja: '読んだ', en: 'Read' },
    'pg.tools': { ja: 'あわせて使えるツール', en: 'Helpful tools' },
    'pg.tool.script': { ja: '電話・窓口の台本', en: 'Phone & visit script' },
    'pg.tool.scriptSub': { ja: 'この制度用の台本を作って、そのまま読む', en: 'Make a script for this program and read it out' },
    'pg.tool.check': { ja: '契約チェック', en: 'Contract check' },
    'pg.tool.checkSub': { ja: 'サインの前に、危ないサインがないか確かめる', en: 'Check for warning signs before you sign' },
    'pg.tool.money': { ja: '生活費シミュレーター', jr: 'おこづかい・生活費けいさん', en: 'Living cost calculator' },
    'pg.tool.moneySub': { ja: 'ひと月にいくら残るか、ざっくり計算', en: 'See what is left each month' },
    'pg.sup': { ja: '支援者向けメモ', en: 'Notes for supporters' },
    'pg.sup.hint': { ja: '施設職員・先生・里親の方へ：手続きのコツをまとめたメモがあります。', en: 'For staff, teachers and foster carers: there are practical notes for this program.' },
    'pg.sup.show': { ja: '表示する', en: 'Show' },
    'pg.src': { ja: '出典', en: 'Source' },
    'pg.src.checked': { ja: '確認日 {d}', en: 'Checked {d}' },
    'pg.src.by': { ja: '確認 {by}', en: 'Checked by {by}' },
    'pg.src.warn': { ja: '金額や条件は変わることがあります。必ず公式ページで最新の内容を確認してください。', jr: '金額やルールは変わることがあります。公式ページでいちばん新しい内容を見てね。', en: 'Amounts and rules can change. Always check the official page for the latest.' },
    'pg.report': { ja: 'まちがいを報告する', en: 'Report a mistake' },
    'pg.report.msg': { ja: '報告の文をコピーしました。運営（Economix JP）に送ってください', en: 'Report text copied. Please send it to Economix JP.' },
    'pg.report.note': { ja: 'ボタンを押すと報告用の文がコピーされます。送り方は「このサイトについて」にあります。', en: 'This copies a report template. See "About" for how to send it.' },
    'pg.report.about': { ja: 'このサイトについて', en: 'About this site' },
    'pg.related': { ja: '同じ「{cat}」の支援', en: 'More for {cat}' },
    'pg.related.all': { ja: 'すべて見る', en: 'See all' },
    'pg.bar': { ja: 'この制度でできること', en: 'Actions' },
    'pg.bar.script': { ja: '台本をつくる', en: 'Script' },
    'pg.bar.scriptLong': { ja: '電話の台本を作る', en: 'Make a phone script' },
    'pg.bar.web': { ja: '公式', en: 'Official' },
    'pg.bar.webFull': { ja: '公式ページ', en: 'Official page' },
    'pg.bar.webLong': { ja: '公式ページを開く（新しいタブ）', en: 'Open the official page (new tab)' },
    'pg.bar.save': { ja: '保存', en: 'Save' },
    'pg.bar.saved': { ja: '保存ずみ', en: 'Saved' },
    'pg.hanko': { ja: '済', en: '✓' },
    'pg.newtab': { ja: '（新しいタブで開きます）', en: '(opens in a new tab)' },
    'pg.call': { ja: '電話する', en: 'Call' },
    'pg.callLong': { ja: '{name}に電話する {num}', en: 'Call {name} {num}' },
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
    'pg.tokyo': { ja: '東京都に住む人は、東京都の窓口・金額がわかる「東京都版」を見てください。', jr: '東京都に住む人は、東京都の窓口と金額がわかる「東京都版」を見てね。', en: 'Living in Tokyo? The Tokyo version has Tokyo amounts and the Tokyo application desk.' },
    'pg.careOnly': { ja: '施設や里親家庭で育った人向け', en: 'For people who grew up in care' },
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
    if (/24時間/.test(main) && !/\d+\s*(時|:)\d*\s*[〜~～]/.test(main)) return { open: true, label: t('pg.h24') };
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
      hit = { open: (mins >= a && mins < b) || (mins + 1440 < b), label: t('pg.today', { h: lab }) };
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
    return { open: !!hs.open, text: hs.closedDay ? t('pg.closedToday') : hs.open ? t('pg.openNow') : t('pg.closedNow') };
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
     note. The first money number of the first line gets data-count, so it rolls in like a station board. */
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
          attr = ' data-count="' + v + '"' + (dec ? ' data-count-decimals="' + dec + '"' : '') +
            // a fact rolls on first sight or when it changed since the last visit, never on every visit (§4.1)
            (o.seen ? ' data-count-seen="' + esc(o.seen) + '"' : '');
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

  /* one section: the shared section head (2px rule draws in), body in one generic reveal */
  function sec(n, id, title, inner, o) {
    o = o || {};
    var head = SM.ui.sectionHeader(title, { num: n || null, id: id, sub: o.sub, action: o.action });
    return '<section class="pg-sec' + (o.cls ? ' ' + o.cls : '') + (o.cv ? ' cv' : '') + '" aria-labelledby="' + id + '">' + head +
      '<div class="pg-sec-body"' + (o.reveal === false ? '' : rv('', 60)) + '>' + inner + '</div></section>';
  }

  /* ---------------------------------------------------------------- masthead */
  function head(p, o) {
    var cat = (p.cat && p.cat[0]) || 'procedures';
    var bits = [];
    if (p.basis) bits.push('<span class="pg-basis">' + esc(SM.ui.basisLabel(p)) + '</span>');
    var cats = (p.cat || [cat]).slice(0, 3).map(function (k) { return SM.ui.catLabel(k); }).filter(Boolean);
    if (cats.length) bits.push('<span>' + esc(cats.join(en() ? ', ' : '・')) + '</span>');
    var tags = [];
    if (p.for && p.for.careOnly) tags.push(SM.ui.tag(t('pg.careOnly'), 'local'));
    if (p.right) tags.push(SM.ui.tag(t('pg.right'), 'right'));
    var hook = L(p.hook), summary = L(p.summary);
    var still = o.still;
    return '<header class="pg-head">' +
      '<div class="pg-mast">' + SM.ui.catIcon(cat, 'lg', { hero: true }) + '</div>' +
      '<div class="pg-meta">' +
        '<p class="pg-eyebrow">' + bits.join('<span class="pg-sep" aria-hidden="true">／</span>') + '</p>' +
        (tags.length ? '<p class="pg-tags">' + tags.join('') + '</p>' : '') +
      '</div>' +
      '<h1 class="pg-title"' + (still ? '' : rv('line', 80)) + '>' + esc(L(p.name)) + '</h1>' +
      '<span class="pg-title-rule"' + (still ? '' : rv('rule', 140)) + ' aria-hidden="true"></span>' +
      (hook || summary ? '<div class="pg-intro"' + (still ? '' : rv('', 220)) + '>' +
        (hook ? '<p class="pg-hook"><span class="pg-hook-k">' + esc(t('pg.when')) + '</span><span class="pg-hook-v">' + SM.ui.marker(hook) + '</span></p>' : '') +
        (summary ? '<p class="pg-summary">' + esc(summary) + '</p>' : '') +
      '</div>' : '') +
    '</header>';
  }

  // national record with a Tokyo-run version (see SM.tokyoVersion in match.js)
  function tokyoNote(p) {
    var tid = SM.tokyoVersion && SM.tokyoVersion[p.id];
    var tp = tid && SM.program(tid);
    if (!tp) return '';
    return '<div class="pg-tokyo">' + SM.ui.callout(esc(t('pg.tokyo')) +
      ' <a href="#/p/' + esc(enc(tid)) + '">' + esc(L(tp.name)) + '</a>', 'info') + '</div>';
  }

  /* ---------------------------------------------------------------- ひと目でわかる */
  function facts(p, o) {
    var cells = [];
    var amount = L(p.amount);
    if (amount) {
      var parts = amountParts(amount);
      cells.push({
        k: t('pg.f.amount'), wide: true, cls: 'is-amount' + (parts.length > 1 ? ' is-multi' : ''), attrs: langAttr(p.amount),
        html: parts.map(function (s, i) { return '<span class="pg-amt-line">' + amtHtml(s, { count: i === 0 && !o.still, seen: 'pg:' + p.id + ':amt' }) + '</span>'; }).join('')
      });
    }
    var r = repayInfo(p);
    if (r) cells.push({ k: t('pg.f.repay'), html: esc(r.v), cls: 'tone-' + r.tone });
    else if (p.kind && t('ui.kind.' + p.kind) !== 'ui.kind.' + p.kind) cells.push({ k: t('pg.f.kind'), html: esc(t('ui.kind.' + p.kind)) });
    if (p.deadline) {
      var short = SM.ui.deadlineShort ? SM.ui.deadlineShort(p.deadline) : '';
      var long = L(p.deadline);
      // a deadline written as a sentence: a short headline in amber, the rest as plain detail under it
      var fsp = SM.ui.factSplit ? SM.ui.factSplit(short || long) : { head: short || long, rest: '' };
      var sub = short && long && long !== short ? long : fsp.rest;
      var timed = (p.deadline.months && p.deadline.months.length) || typeof p.deadline.leaveMonths === 'number' || !p.deadline.always;
      cells.push({
        k: t('pg.f.deadline'), wide: fsp.head.length > (SM.lang() === 'en' ? 22 : 12) || (!!sub && sub.length > 26), cls: timed ? 'tone-deadline' : '', attrs: langAttr(p.deadline),
        html: esc(fsp.head) + (sub ? '<small>' + esc(sub) + '</small>' : '')
      });
    }
    if (p.effort) {
      var lvl = { low: 1, mid: 2, high: 3 }[p.effort] || 0;
      cells.push({
        k: t('pg.f.effort'), cls: 'is-effort',
        html: '<span class="pg-meter-row"><span class="pg-meter" data-lvl="' + lvl + '" aria-hidden="true">' +
            [1, 2, 3].map(function (i) { return '<i class="' + (i <= lvl ? 'is-on' : '') + '"' + (i <= lvl && !o.still ? rv('rule', 260 + i * 70) : '') + '></i>'; }).join('') + '</span>' +
          '<span class="pg-meter-t">' + esc(t('pg.effort.s' + lvl)) + '</span></span>' +
          '<small>' + esc(t('pg.effort.' + p.effort)) + '</small>'
      });
    }
    var who = L(p.who);
    if (who) cells.push({ k: t('pg.f.who'), html: esc(who), wide: true, cls: 'is-who', attrs: langAttr(p.who) });
    if (!cells.length) return '';
    // the short facts pair up in the 2-column sheet: amount first, then the half cells, then the wide ones
    var head = cells[0] && cells[0].cls && cells[0].cls.indexOf('is-amount') === 0 ? [cells.shift()] : [];
    cells = head.concat(cells.filter(function (c) { return !c.wide; }), cells.filter(function (c) { return c.wide; }));
    // two columns with no holes: a lone half cell before a wide one (or at the end) becomes wide
    var col = 0, prev = null;
    cells.forEach(function (c) {
      if (c.wide) { if (col === 1 && prev) prev.wide = true; col = 0; }
      else if (col === 0) { col = 1; }
      else { c.right = true; col = 0; }
      prev = c;
    });
    if (col === 1 && prev) prev.wide = true;
    return '<section class="pg-glance" aria-labelledby="pg-h-facts"' + (o.still ? '' : rv('', 200)) + '>' +
      '<h2 class="pg-label" id="pg-h-facts">' + esc(t('pg.facts')) + '</h2>' +
      '<dl class="pg-facts">' + cells.map(function (c) {
        return '<div class="pg-f' + (c.wide ? ' is-wide' : '') + (c.right ? ' is-r' : '') + (c.cls ? ' ' + c.cls : '') + '">' +
          '<dt>' + esc(c.k) + '</dt><dd' + (c.attrs || '') + '>' + c.html + '</dd></div>';
      }).join('') + '</dl></section>';
  }

  /* ---------------------------------------------------------------- actions (inline + sticky bar) */
  function saveBtn(p, cls, lOn, lOff, aria) {
    var saved = SM.isSaved(p.id);
    return '<button type="button" class="' + cls + (saved ? ' is-saved' : '') + '" data-act="save" data-id="' + esc(p.id) + '" aria-pressed="' + saved + '"' +
      ' data-label-on="' + esc(lOn) + '" data-label-off="' + esc(lOff) + '"' + (aria ? ' aria-label="' + esc(aria) + '"' : '') + ' data-press>' +
      ic(saved ? 'star-fill' : 'star') + '<span class="save-label">' + esc(saved ? lOn : lOff) + '</span></button>';
  }
  function actions(p, o) {
    var c = p.contact || {};
    var web = webOf(p);
    var st = c.phone ? statusOf(c) : null;
    var call = c.phone ? '<a class="btn btn-primary btn-block btn-lg pg-call-btn" href="' + esc(telHref(c.phone)) + '" data-press' +
        ' aria-label="' + esc(t('pg.callLong', { name: L(c.phoneLabel) || shortName(p), num: c.phone }) + (st ? '（' + st.text + '）' : '')) + '">' +
        '<span class="pg-call-l">' + ic('phone') + '<span>' + esc(t('pg.call')) + '</span></span>' +
        '<span class="pg-call-r"><b class="pg-call-num" data-noruby>' + esc(c.phone) + '</b>' + (st ? '<small class="pg-call-st' + (st.open ? ' is-open' : '') + '">' + esc(st.text) + '</small>' : '') + '</span></a>' : '';
    var save = saveBtn(p, 'btn btn-block pg-save' + (call ? ' btn-secondary' : ' is-main'), t('ui.saved'), t('ui.save'));
    var links = [];
    if (web) links.push('<a class="pg-tlink" href="' + esc(web) + '" target="_blank" rel="noopener noreferrer"><span>' + esc(t('pg.bar.webFull')) + '</span>' + ic('external', 'pg-tlink-ext') + newTab() + '</a>');
    links.push('<a class="pg-tlink" href="#/tools/script/' + enc(p.id) + '"><span>' + esc(t('pg.bar.scriptLong')) + '</span>' + arrow('r') + '</a>');
    // never a reveal: 電話する / 保存 are there the moment the page (or a scroll) reaches them
    return '<div class="pg-actions no-print" id="pg-actions" role="group" aria-label="' + esc(t('pg.bar')) + '">' +
      call + save + '<p class="pg-tlinks">' + links.join('') + '</p></div>';
  }
  function actionBar(p) {
    var c = p.contact || {};
    var web = webOf(p);
    var st = c.phone ? statusOf(c) : null;
    var main = '';
    if (c.phone) {
      main = '<a class="pg-act pg-act-call" href="' + esc(telHref(c.phone)) + '" data-press aria-label="' + esc(t('pg.callLong', { name: shortName(p), num: c.phone }) + (st ? '（' + st.text + '）' : '')) + '">' + ic('phone') +
        '<span class="pg-act-call-t"><b>' + esc(t('pg.call')) + '</b>' + (st ? '<small>' + esc(st.text) + '</small>' : '<small data-noruby>' + esc(c.phone) + '</small>') + '</span></a>';
    } else if (web) {
      main = '<a class="pg-act pg-act-web" href="' + esc(web) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(t('pg.bar.webLong')) + '"><span>' + esc(t('pg.bar.webFull')) + '</span>' + ic('external') + '</a>';
    }
    return '<div class="pg-bar no-print' + (main ? '' : ' is-solo') + '" id="pg-bar" role="group" aria-label="' + esc(t('pg.bar')) + '">' +
      saveBtn(p, 'pg-act pg-act-save', t('pg.bar.saved'), t('pg.bar.save'), t('ui.save') + '：' + shortName(p)) + main + '</div>';
  }

  /* ---------------------------------------------------------------- 01 steps */
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
  function steps(p, n, o) {
    var items = [];
    var how = L(p.how), where = L(p.where), docs = list(p.docs);
    if (how) items.push({ title: t('pg.s.how'), body: '<p' + langAttr(p.how) + '>' + esc(how) + '</p>' });
    if (where) items.push({ title: t('pg.s.where'), body: '<p' + langAttr(p.where) + '>' + esc(where) + '</p>' });
    if (docs.length) {
      var done = docsDone(p.id).filter(function (i) { return i < docs.length; });
      items.push({
        title: t('pg.s.docs'), docs: true, count: docsCounter(done.length, docs.length),
        body: '<p class="pg-docs-tick">' + esc(t('pg.s.docsTick')) + '</p>' +
          '<ul class="pg-docs"' + (en() ? ' lang="ja"' : '') + '>' + docs.map(function (d, i) {
            var on = done.indexOf(i) !== -1;
            return '<li><label class="pg-doc"><input type="checkbox" class="pg-doc-in" data-act="pg-doc" data-i="' + i + '"' + (on ? ' checked' : '') + '>' +
              '<span class="pg-doc-box" aria-hidden="true">' + ic('check') + '</span><span class="pg-doc-t">' + esc(L(d)) + '</span></label></li>';
          }).join('') + '</ul><p class="pg-note">' + esc(t('pg.s.docsNote')) + '</p>'
      });
    }
    if (!items.length) return '';
    var jo = jaOnly(p.how) || jaOnly(p.where);
    var wait = o.wait ? ' is-wait' : '';
    var html = (jo ? jaNote() : '') + '<div class="pg-steps-wrap"><span class="pg-rail" aria-hidden="true"><i class="pg-rail-fill"></i></span>' +
      '<ol class="pg-steps">' + items.map(function (s, i) {
        return '<li class="pg-step' + (s.docs ? ' is-docs' : '') + '"><span class="pg-step-n' + wait + '" aria-hidden="true">' + (i + 1) + '</span>' +
          '<div class="pg-step-body"><h3 class="pg-step-t"><span>' + esc(s.title) + '</span>' + (s.count || '') + '</h3>' + s.body + '</div></li>';
      }).join('') + '</ol></div>';
    return sec(n, 'pg-h-how', t('pg.how'), html, { cls: 'pg-sec-how', reveal: false });
  }

  /* ---------------------------------------------------------------- 02 asks */
  function askCopyText(p) {
    var a = list(p.ask);
    return shortName(p) + (en() ? ' — questions' : ' について聞きたいこと') + '\n' + a.map(function (q, i) { return (i + 1) + '. ' + L(q); }).join('\n');
  }
  function asks(p, n) {
    var a = list(p.ask);
    if (!a.length) return '';
    var html = (jaOnly(a[0]) ? jaNote() : '') +
      '<ol class="pg-asks"' + langAttr(a[0]) + '>' + a.map(function (q, i) {
        return '<li class="pg-ask"><span class="pg-ask-n">' + esc(t('pg.ask.n', { n: i + 1 })) + '</span><p class="pg-ask-q">' + esc(L(q)) + '</p></li>';
      }).join('') + '</ol>' +
      '<div class="pg-ask-actions">' +
        SM.ui.button(t('pg.ask.copy'), { act: 'copy', variant: 'secondary', size: 'sm', icon: 'copy', attrs: 'data-text="' + esc(askCopyText(p)) + '" data-msg="' + esc(t('pg.ask.copied')) + '"' }) +
        SM.ui.button(t('pg.show'), { act: 'pg-show', variant: 'secondary', size: 'sm', icon: 'text-size', attrs: 'aria-haspopup="dialog"' }) +
        '<a class="pg-tlink" href="#/tools/script/' + enc(p.id) + '"><span>' + esc(t('pg.ask.script')) + '</span>' + arrow('r') + '</a>' +
      '</div>';
    return sec(n, 'pg-h-ask', t('pg.ask'), html, { sub: t('pg.ask.sub'), cls: 'pg-sec-ask', cv: true });
  }

  /* ---------------------------------------------------------------- 03 contact */
  function contact(p, n) {
    var c = p.contact;
    if (!c || !(c.phone || c.line || c.chat || c.web || L(c.hours))) return '';
    var html = '<div class="pg-contact">';
    if (c.phone) {
      var free = /^(0120|0800)/.test(String(c.phone).replace(/\D/g, '')) && !/無料|フリーダイヤル|free/i.test(L(c.phoneLabel) || '');
      var today = hoursToday(c.hours);
      var line = today ? hoursLine(c) : '';
      var st = statusOf(c);
      html += '<div class="pg-tel">' +
        '<p class="pg-tel-label"' + langAttr(c.phoneLabel) + '>' + esc(L(c.phoneLabel) || t('ui.phone')) + (free ? ' ' + SM.ui.tag(t('pg.free'), 'free') : '') + '</p>' +
        '<div class="pg-tel-row"><a class="pg-tel-num" href="' + esc(telHref(c.phone)) + '" tabindex="-1" aria-hidden="true" data-noruby>' + esc(c.phone) + '</a>' +
          '<a class="btn btn-secondary btn-sm pg-tel-call" href="' + esc(telHref(c.phone)) + '" aria-label="' + esc(t('pg.callLong', { name: L(c.phoneLabel) || shortName(p), num: c.phone })) + '">' + ic('phone') + '<span>' + esc(t('pg.call')) + '</span></a></div>' +
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
    html += '</div>';
    return sec(n, 'pg-h-contact', t('pg.contact'), html, { cls: 'pg-sec-contact', cv: true });
  }

  /* ---------------------------------------------------------------- 04 places */
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
      '<h3 class="pg-loc-name">' + esc(name) + (area ? '<span class="pg-loc-area">' + esc(area) + '</span>' : '') + '</h3>' +
      (rows.length ? '<dl class="pg-loc-kv">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>' : '') +
      (acts.length ? '<div class="pg-loc-actions">' + acts.join('') + '</div>' : '') +
    '</li>';
  }
  function places(p, n) {
    var locs = Array.isArray(p.locations) ? p.locations.filter(Boolean) : [];
    if (!locs.length) return '';
    var mine = SM.state && SM.state.answers ? SM.state.answers.area : null;
    var idx = locs.map(function (l, i) { return { l: l, i: i }; });
    if (mine) idx.sort(function (a, b) { return (b.l.area === mine) - (a.l.area === mine) || a.i - b.i; });
    var first = idx.slice(0, 3), rest = idx.slice(3);
    var lj = en() ? ' lang="ja"' : '';
    var html = (en() ? jaNote() : '') + '<ul class="pg-locs"' + lj + '>' + first.map(function (x) { return locRow(p, x.l, x.i); }).join('') + '</ul>';
    if (rest.length) {
      html += '<details class="disclose pg-more"><summary><span>' + esc(t('pg.loc.more', { n: rest.length })) + '</span></summary>' +
        '<ul class="pg-locs"' + lj + '>' + rest.map(function (x) { return locRow(p, x.l, x.i); }).join('') + '</ul></details>';
    }
    return sec(n, 'pg-h-places', t('pg.places'), html, { cls: 'pg-sec-places', cv: true });
  }

  /* ---------------------------------------------------------------- caution, まなぶ, tools, supporter */
  /* 気をつけること, with the supporter row (施設職員・先生・里親の方へ … 表示する) ruled directly under it: the
     note belongs to the caution, not to a gap of its own between the lessons and the small print */
  function caution(p) {
    var c = L(p.caution), sup = supporter(p);
    if (!c) return sup ? '<div class="pg-caution pg-caution-sup cv">' + sup + '</div>' : '';
    return '<section class="pg-caution cv" aria-label="' + esc(t('pg.caution')) + '"' + rv('', 0) + '>' +
      SM.ui.callout('<span' + langAttr(p.caution) + '>' + esc(c) + '</span>', 'warn', { title: t('pg.caution') }) + sup + '</section>';
  }

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
      '<span class="pg-lesson-text"><span class="pg-lesson-k"><span>' + esc(t('pg.learn.k')) + '</span><span class="pg-sep" aria-hidden="true">／</span>' +
        '<span>' + esc(t('pg.learn.min', { n: l.minutes || 2 })) + '</span>' + (done ? SM.ui.tag(t('pg.learn.done'), 'free') : '') + '</span>' +
        '<span class="pg-lesson-t">' + esc(L(l.title)) + '</span></span>' + arrow('r', 'pg-lesson-go') + '</a></li>';
  }
  function lessons(p) {
    var ls = lessonsFor(p.id);
    if (!ls.length) return '';
    return '<section class="pg-learn cv" aria-labelledby="pg-h-learn">' +
      SM.ui.sectionHeader(t('pg.learn.h'), { id: 'pg-h-learn' }) +
      '<ul class="pg-lessons"' + rv('', 60) + '>' + ls.map(lessonRow).join('') + '</ul></section>';
  }

  function tools(p) {
    var cats = p.cat || [];
    var rows = [];
    if (list(p.ask).length || (p.contact && p.contact.phone)) rows.push(SM.ui.listItem({ title: t('pg.tool.script'), sub: t('pg.tool.scriptSub'), href: '#/tools/script/' + enc(p.id) }));
    if (cats.indexOf('housing') !== -1 || cats.indexOf('work') !== -1) rows.push(SM.ui.listItem({ title: t('pg.tool.check'), sub: t('pg.tool.checkSub'), href: '#/tools/check' }));
    if (cats.indexOf('money') !== -1 || (cats.indexOf('housing') !== -1 && L(p.amount))) rows.push(SM.ui.listItem({ title: t('pg.tool.money'), sub: t('pg.tool.moneySub'), href: '#/tools/money' }));
    if (!rows.length) return '';
    return '<section class="pg-tools cv" aria-labelledby="pg-h-tools">' +
      SM.ui.sectionHeader(t('pg.tools'), { id: 'pg-h-tools' }) + '<div class="list"' + rv('', 60) + '>' + rows.join('') + '</div></section>';
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

  /* ---------------------------------------------------------------- 出典 (small print) */
  function source(p) {
    var s = p.source || {};
    var links = [];
    if (s.url) links.push({ org: s.org || s.url, url: s.url });
    (Array.isArray(p.sources2) ? p.sources2 : []).forEach(function (x) { if (x && x.url) links.push({ org: x.org || x.url, url: x.url }); });
    var checked = s.checked || SM.updated;
    var report = (en() ? '[Sudachi Map — correction report]' : '【巣立ちマップ まちがいの報告】') + '\n' +
      (en() ? 'Program: ' : '制度名：') + L(p.name) + '（' + p.id + '）\n' +
      (en() ? 'Checked date: ' : '確認日：') + checked + '\n' +
      (en() ? 'What is wrong:' : 'まちがっていること：') + '\n\n' +
      (en() ? 'Correct information / source (if you know):' : '正しい内容・出典（わかれば）：') + '\n';
    return '<footer class="pg-src cv" aria-labelledby="pg-h-src">' +
      '<h2 class="pg-src-h" id="pg-h-src">' + esc(t('pg.src')) + '</h2>' +
      (links.length ? '<ul class="pg-src-links">' + links.map(function (x) {
        return '<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer"><span>' + esc(x.org) + '</span>' + ic('external', 'pg-src-ext') + newTab() + '</a></li>';
      }).join('') + '</ul>' : '') +
      '<p class="pg-src-meta"><span>' + esc(t('pg.src.checked', { d: SM.fmtDate(checked) })) + '</span>' +
        (p.verifiedBy ? '<span>' + esc(t('pg.src.by', { by: p.verifiedBy })) + '</span>' : '') + '</p>' +
      '<p class="pg-src-warn">' + esc(t('pg.src.warn')) + '</p>' +
      '<div class="pg-report">' +
        SM.ui.button(t('pg.report'), { act: 'copy', variant: 'text', size: 'sm', icon: 'copy', attrs: 'data-text="' + esc(report) + '" data-msg="' + esc(t('pg.report.msg')) + '"' }) +
        '<p>' + esc(t('pg.report.note')) + ' <a href="#/about">' + esc(t('pg.report.about')) + '</a></p>' +
      '</div>' +
    '</footer>';
  }

  /* ---------------------------------------------------------------- related */
  function related(p) {
    var cat = p.cat && p.cat[0];
    if (!cat) return '';
    var area = SM.state && SM.state.answers ? SM.state.answers.area : null;
    // 中学生: nothing made only for older people (same rule as their search results — SPEC-v3 §3)
    var jrOk = SM.isJunior && SM.isJunior() && SM.matchUtil && SM.matchUtil.jrOk;
    var out = (SM.data.programs || []).filter(function (x) {
      if (!x || x.id === p.id || !x.cat || x.cat[0] !== cat) return false;
      if (jrOk && !jrOk(x)) return false;
      var as = (x.for && x.for.areas) || [];
      if (as.length && as[0] !== '13' && area && area.length === 5 && as.indexOf(area) === -1) return false;
      if (as.length && area === 'other') return false;
      return true;
    });
    out.sort(function (a, b) {
      var sa = (a.basis === p.basis ? 1 : 0) + ((a.cat || []).filter(function (c) { return (p.cat || []).indexOf(c) !== -1; }).length);
      var sb = (b.basis === p.basis ? 1 : 0) + ((b.cat || []).filter(function (c) { return (p.cat || []).indexOf(c) !== -1; }).length);
      return sb - sa;
    });
    out = out.slice(0, 3);
    if (!out.length) return '';
    var headHtml = SM.ui.sectionHeader(t('pg.related', { cat: SM.ui.catLabel(cat) }), { action: { label: t('pg.related.all'), href: '#/find/cat/' + cat }, id: 'pg-h-rel' });
    return '<section class="pg-related cv" aria-labelledby="pg-h-rel">' + headHtml +
      '<div class="pcards" data-reveal-stagger="40">' + out.map(function (x) { return SM.ui.programCard(x, { compact: true }); }).join('') + '</div></section>';
  }

  /* ---------------------------------------------------------------- deferred rendering (MOTION-SPEC §6 rule 4) */
  var DEFER = null;   // { id, parts: { name: html } } — filled into [data-defer=name] after the transition
  function canDefer(id) {
    var M = motion();
    if (!M || typeof M.afterTransition !== 'function' || typeof M.inTransition !== 'function') return false;
    try { if (!M.inTransition()) return false; } catch (e) { return false; }
    var r = SM.route || {};
    // back to a position below the first screen: the restore must land on real content
    if (r.kind === 'back' && (r.restoreY || 0) > 160) return false;
    // an in-place re-render of the same program renders in full (its scroll position is kept)
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
    // 01 arrived with the deferred part (phones): wire its rail and squares now
    if (d.parts.main && d.parts.main.indexOf('pg-sec-how') !== -1 && root.querySelector('.pg[data-id]')) { stopObservers(); wireLive(root); }
    if (window.requestAnimationFrame) requestAnimationFrame(function () { fitRuby(root); });
  }

  /* ---------------------------------------------------------------- the living page: steps rail, stamps, sticky bar
   * One rAF-throttled passive scroll check (not IntersectionObserver: a jump — an anchor, a restored position,
   * a fling — can carry an element from below the screen to above it without ever intersecting, and the bar
   * and the squares must still follow). Reads two or three rects per frame while scrolling; nothing else. */
  var IOS = [];
  var SCROLL = null;
  function stopObservers() {
    IOS.forEach(function (o) { try { o.disconnect(); } catch (e) { } }); IOS = [];
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
  function wireLive(root) {
    var M = motion();
    // 01: the rail fills with the scroll (its foot follows the 60% line) — CSS scroll timeline via the engine
    var fill = root.querySelector('.pg-rail-fill');
    if (fill && M && M.scrollLinked) { try { M.scrollLinked(fill, { prop: 'scaleY', range: ['cover 40vh', 'cover calc(100% - 60vh)'] }); } catch (e) { } }
    // each square stamps once when the fill reaches it (its top crosses 60% of the screen)
    var tiles = Array.prototype.slice.call(root.querySelectorAll('.pg-step-n.is-wait'));
    if (tiles.length && (reduced() || !window.requestAnimationFrame)) { tiles.forEach(function (x) { x.classList.remove('is-wait'); }); tiles = []; }
    // the sticky bar: only once the inline actions have gone up under the header
    var bar = root.querySelector('#pg-bar'), acts = root.querySelector('#pg-actions');
    if (!acts) bar = null;
    var barOn = null;
    var setBar = function (on) {
      if (on === barOn) return;
      barOn = on;
      bar.classList.toggle('is-on', on);
      bar.setAttribute('aria-hidden', on ? 'false' : 'true');
      try { bar.inert = !on; } catch (e) { }
    };
    if (bar) { bar.classList.add('is-auto'); setBar(false); }
    if (!tiles.length && !bar) return;
    var art = root.querySelector('.pg[data-id]') || root;
    var ticking = false, ready = false;
    var paint = function () {
      ticking = false;
      if (!art.isConnected) { stopObservers(); return; }
      if (bar) setBar(acts.getBoundingClientRect().bottom <= chromeBottom() + 1);
      if (tiles.length && ready) {
        var line = (window.innerHeight || 800) * 0.6, hit = [];
        tiles = tiles.filter(function (x) {
          var r = x.getBoundingClientRect();
          if (r.top >= line) return true;
          if (r.bottom < 0) x.classList.remove('is-wait');   // jumped past: no stamp off screen
          else hit.push(x);
          return false;
        });
        hit.forEach(function (el, i) {
          setTimeout(function () {
            // the outline square stays drawn underneath until the ink lands on it (the stamp starts from nothing,
            // so without it the square would blink out for a frame first)
            var under = null, step = el.parentNode;
            if (M && M.stamp && step && !(M.reduced && M.reduced())) {
              under = el.cloneNode(true);
              under.setAttribute('aria-hidden', 'true');
              under.style.cssText = 'position:absolute;left:0;top:0;z-index:0;pointer-events:none;';
              step.insertBefore(under, el);
            }
            el.classList.remove('is-wait');
            var p = null;
            if (M && M.stamp) { try { p = M.stamp(el); } catch (e) { } }
            var drop = function () { if (under && under.parentNode) under.parentNode.removeChild(under); under = null; };
            if (p && p.then) p.then(drop, drop); else drop();
            setTimeout(drop, 900);
          }, i * 110);
        });
      }
    };
    SCROLL = function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
    window.addEventListener('scroll', SCROLL, { passive: true });
    window.addEventListener('resize', SCROLL, { passive: true });
    SCROLL();
    // squares wait for the page to land before the first one stamps
    var go = function () { ready = true; if (SCROLL) SCROLL(); };
    if (M && M.afterTransition) M.afterTransition(function () { setTimeout(go, 120); }); else setTimeout(go, 200);
  }

  // desktop: the whole side column (glance + actions) stays in view when it fits the screen; otherwise only
  // the actions do (CSS). Measured once per render and on resize.
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
      var en = entries[entries.length - 1];
      st.classList.toggle('pg-quiet', en.isIntersecting || en.boundingClientRect.top > 0);
    }, { rootMargin: '-104px 0px 0px 0px', threshold: 0 });
    io.observe(h1);
    TITLE_IO = io;
  }
  SM.pgTitleHandoff = wireTitle;   // tools.js uses the same hand-off

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
    var a = !silent && M && M.animate ? M.animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'linear', fill: 'forwards' }) : null;
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
        // quick exit stays one tap away: this page covers the app bar (FIXER-robust)
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
    // at a counter speed wins: a 160ms cross-fade, nothing slides (MOTION-SPEC §4.2)
    var M = motion();
    if (M && M.animate) M.animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'linear' });
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
    // swap in place with a 160ms cross-fade (nothing moves; MOTION-SPEC §4.2)
    var box = document.createElement('div');
    box.innerHTML = supporterMemo(p);
    var memo = box.firstChild;
    hint.parentNode.replaceChild(memo, hint);
    try { if (SM.applyRuby) SM.applyRuby(memo); } catch (e) { }
    var M = motion();
    if (M && M.animate) M.animate(memo, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'linear' });
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
        // the hanko lands once the count has rolled to the total
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
   * Runs after core's applyRuby (next frame). Exported for tools.js as SM.fitRuby. */
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
      wireLive(root);
      wireTitle(root);
      wireAside(root);
      after(function () { fitRuby(root); });
    },
    render: function (args) {
      var id = args && args[0];
      var p = id ? SM.program(id) : null;
      DEFER = null;
      if (!p) {
        return '<div class="pg pg-nf"><h1 class="sr-only">' + esc(t('pg.nf.title')) + '</h1>' +
          SM.ui.empty(t('pg.nf.title'), t('pg.nf.body'), SM.ui.button(t('pg.nf.btn'), { href: '#/find', variant: 'primary' }), { illus: 'not-found' }) + '</div>';
      }
      var r = SM.route || {};
      var still = !!r.instant || reduced();   // back / revisit: nothing replays (MOTION-SPEC §3.8)
      var defer = canDefer(p.id);
      if (defer) DEFER = { id: p.id, parts: {} };
      var o = { still: still, wait: !still };
      var n = 0;
      var s1 = steps(p, n + 1, o); if (s1) n++;
      var s2 = asks(p, n + 1); if (s2) n++;
      var s3 = contact(p, n + 1); if (s3) n++;
      var s4 = places(p, n + 1); if (s4) n++;
      if (n < 3) {   // number the sections only when there are three or more (VISUAL-SPEC §6.6)
        n = 0;
        s1 = steps(p, 0, o); s2 = asks(p, 0); s3 = contact(p, 0); s4 = places(p, 0);
      }
      var rest = s2 + s3 + s4 + caution(p) + lessons(p) + tools(p) + source(p);
      // phones and tablets: 01 starts well below the first screen (y ≈ 1480 at 390×844, after the masthead, the
      // glance and the actions), so it waits with the rest; on the desktop grid it is the first screen's left column
      var wide = false;
      try { wide = !!(window.matchMedia && window.matchMedia('(min-width: 1100px)').matches); } catch (e) { wide = false; }
      var mainHtml = defer && !wide && s1 ? slot('main', s1 + rest, true) : s1 + slot('main', rest, defer);
      return '<article class="pg wide-layout" data-id="' + esc(p.id) + '">' +
        head(p, o) +
        tokyoNote(p) +
        '<div class="pg-body">' +
          '<aside class="pg-aside">' + facts(p, o) + actions(p, o) + '</aside>' +
          '<div class="pg-main">' + mainHtml + '</div>' +
        '</div>' +
        slot('related', related(p), defer) +
        actionBar(p) +
      '</article>';
    },
    /* boot.js calls this after a save toggle; it has already stamped the star, flown it to やること and
       swapped every label. Nothing else to do here (the page is not re-rendered). */
    onSave: function () { }
  };
})();
