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
