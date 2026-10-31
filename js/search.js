/* 巣立ちマップ v6 — js/search.js (owner: SEARCH) — SM.search, the engine behind 「きく」 (#/ask)
   A LOCAL search engine that understands everyday words. No LLM, no network: everything runs on this phone, over
   the data files already loaded (programs, lessons, tools, やること tasks, areas) and data/lexicon.js (everyday words
   → topics and record ids). Nothing is stored: no search history, no logs.

   How a query is read
     1. normalise: NFKC (width), lower case, katakana → hiragana, small kana → large, ー and ゛-variants (ぢ/づ/ゔ)
        folded, spaces/punctuation dropped. Done to the documents and the query alike.
     2. lexicon: everyday words found in the query («お金ない», «部屋», «バイト», «保証人がいない») switch on topics; a
        topic boosts its records in the curated order. Kana words also match with one typo. Crisis words switch on
        crisis kinds (the view puts crisis lines first, always).
     3. text: Japanese character bigrams (no tokenizer download) matched against each document's fields with
        weights name > aliases/tags > summary > body, IDF-weighted (bigrams that occur in no document are ignored, so
        particles and typos do not sink a query); hiragana queries also match a reading layer made from
        data/ruby.js (家賃 → やちん). English: word tokens, light stemming, prefix and one/two-typo matches.
     4. context: the person's 区市町村 and prefecture (v7, all of 関東: their city's and prefecture's records up,
        another prefecture's or another city's own records down unless the query names that place), 中学生 /
        adult (records not for them go down), the 都県 versions of national schemes (自立支援資金貸付 …).
        A prefecture typed in the query (神奈川, さいたま, ちば …) counts as naming it: its records come up.

   API (SM.search)
     build() -> ms                    builds the fast phase once (names, tags, summaries + readings). Lazy.
     warm(done?)                      adds the body text and English fields in idle slices (≤ 8ms each); done() after
     ready() -> bool  full() -> bool
     query(q, ctx?) -> {
        q, n (normalised), empty, crisis: null | { kinds:[…] }, best: hit|null,
        hits: [hit…] (all, best first), groups: { support, learn, tools, tasks, places } (hits per group),
        topics: [{ id, label }] (lexicon topics that matched), fuzzy: bool,
        suggest: [{ label, q }] (もしかして), terms: [strings to highlight] }
        hit = { key, type: 'program'|'lesson'|'tool'|'task'|'area', id, href, title {ja,en,jr?}, cat, score, rec }
        ctx = { area, junior, adult, lang } (defaults from SM.state)
     starters(junior) -> [{ label, q }]  starter chips for an empty box
     norm(s), fold(s)                    the normaliser (fold keeps string length: used for highlighting)
     highlight(text, terms) -> [[start,end]…]  ranges of `text` that match a term (kana/width/case-insensitive)
   ===================================================================== */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};

  var now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };
  function L(o, lang) {
    if (o == null) return '';
    if (typeof o === 'string') return o;
    return (lang && o[lang]) || o.ja || o.en || '';
  }
  function lex() { return SM.data.lexicon || { concepts: [], crisis: [], starters: {} }; }

  /* ------------------------------------------------------------------ normalisation */
  // small kana → large, voiced variants that people mix up → one form (both sides get the same fold)
  var LOOSE = {
    'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お', 'っ': 'つ', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'ゎ': 'わ',
    'ゕ': 'か', 'ゖ': 'け', 'ぢ': 'じ', 'づ': 'ず', 'ゐ': 'い', 'ゑ': 'え', 'ゔ': 'ぶ', 'を': 'お'
  };
  var LOOSE_RE = /[ぁぃぅぇぉっゃゅょゎゕゖぢづゐゑゔを]/g;
  // fold keeps the length (one char in, one char out): katakana → hiragana, lower case, full-width ASCII → ASCII
  function foldChar(c) {
    var k = c.charCodeAt(0);
    if (k >= 0x30a1 && k <= 0x30f6) return String.fromCharCode(k - 0x60);
    if (k >= 0xff01 && k <= 0xff5e) return String.fromCharCode(k - 0xfee0).toLowerCase();
    if (k === 0x3000) return ' ';
    if (k >= 0xff66 && k <= 0xff9d) { var n = c; try { n = c.normalize('NFKC'); } catch (e) { } return n.length === 1 ? foldChar(n) : c; }
    return c.toLowerCase();
  }
  var FOLD_RE = /[ァ-ヶ！-～　ｦ-ﾝ]/g;
  function fold(s) {
    s = String(s == null ? '' : s).replace(FOLD_RE, foldChar);
    return /[A-Z]/.test(s) ? s.toLowerCase() : s;
  }
  var PUNCT_RE = /[ーｰ\s　・･、。,.\-‐－―─〜~～（）()「」『』【】［］\[\]〈〉《》"“”'’‘!！?？:：;；/／\\＼|｜+＋*＊=＝#＃&＆%％@＠^＾_＿<>＜＞{}⁠​]/g;
  // fold + LOOSE in one pass (norm only; fold alone keeps small kana for highlighting)
  var NORM_RE = /[ァ-ヶ！-～　ｦ-ﾝぁぃぅぇぉっゃゅょゎゕゖぢづゐゑゔを]/g;
  function normChar(c) { var f = foldChar(c); return LOOSE[f] || f; }
  function norm(s, doc) {
    s = String(s == null ? '' : s);
    // documents are already composed text: NFKC only where full/half-width forms occur (much faster on a phone)
    if (!doc || /[\uff00-\uffef]/.test(s)) { try { s = s.normalize('NFKC'); } catch (e) { } }
    s = s.replace(NORM_RE, normChar);
    if (/[A-Z]/.test(s)) s = s.toLowerCase();
    return s.replace(PUNCT_RE, '');   // (ー and ｰ are in PUNCT_RE too)
  }
  // english / ascii tokens (kept apart: Japanese is matched without spaces, English needs word edges)
  var STOP_EN = {
    i: 1, me: 1, my: 1, a: 1, an: 1, the: 1, to: 1, of: 1, for: 1, in: 1, on: 1, at: 1, is: 1, am: 1, are: 1, be: 1,
    do: 1, does: 1, how: 1, what: 1, where: 1, when: 1, who: 1, can: 1, could: 1, should: 1, want: 1, need: 1,
    help: 1, with: 1, and: 1, or: 1, it: 1, this: 1, that: 1, about: 1, get: 1, have: 1, has: 1, from: 1, any: 1,
    some: 1, there: 1, if: 1, so: 1, im: 1, ive: 1, dont: 1, cant: 1, not: 1, no: 1, will: 1, would: 1, you: 1, your: 1
  };
  function stem(w) {
    w = w.replace(/'s$/, '').replace(/'/g, '');
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 5 && /(ches|shes|sses|xes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /[^s]s$/.test(w)) return w.slice(0, -1);
    if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
    return w;
  }
  function asciiTokens(s, keepStop) {
    var f = fold(String(s == null ? '' : s));
    try { f = f.normalize('NFKC'); } catch (e) { }
    var m = f.match(/[a-z0-9][a-z0-9']*/g) || [];
    var out = [];
    for (var i = 0; i < m.length; i++) {
      var w = m[i].replace(/'/g, '');
      if (!w) continue;
      if (!keepStop && STOP_EN[w]) continue;
      out.push(stem(w));
    }
    return out;
  }
  function isAscii(s) { return /^[\x20-\x7e]+$/.test(s); }
  function hasKanji(s) { return /[㐀-鿿]/.test(s); }
  function isKana(s) { return /^[ぁ-ゟ]+$/.test(s); }

  // edit distance ≤ max (Damerau: a swapped pair counts as one typo), with an early exit
  function within(a, b, max) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return false;
    var pp = null, prev = [], cur, i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur = [i];
      var best = i;
      for (j = 1; j <= lb; j++) {
        var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
        if (pp && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) v = Math.min(v, pp[j - 2] + 1);
        cur[j] = v;
        if (v < best) best = v;
      }
      if (best > max) return false;
      pp = prev; prev = cur;
    }
    return prev[lb] <= max;
  }

  /* ------------------------------------------------------------------ reading layer (data/ruby.js) */
  var RUBY = null;   // first char -> the lengths of the dictionary words that start with it, longest first
  function rubyIndex() {
    if (RUBY) return RUBY;
    RUBY = {};
    var R = SM.data.ruby || {};
    for (var w in R) {
      if (!R[w] || w.length < 2) continue;
      var c = w.charAt(0), l = RUBY[c] || (RUBY[c] = []);
      if (l.indexOf(w.length) === -1) l.push(w.length);
    }
    for (var k in RUBY) RUBY[k].sort(function (a, b) { return b - a; });
    return RUBY;
  }
  // 家賃が払えない → やちんが払えない (words in the dictionary only, longest first; the rest stays)
  function reading(s) {
    if (!s || !hasKanji(s)) return '';
    var R = SM.data.ruby || {}, idx = rubyIndex(), out = [], i = 0, from = 0, n = s.length, hit = false;
    while (i < n) {
      var lens = idx[s.charAt(i)], done = false;
      if (lens) {
        for (var li = 0; li < lens.length; li++) {
          var len = lens[li];
          if (len > n - i) continue;
          var w = s.substr(i, len), r = R[w];
          if (r && typeof r === 'string') {
            if (i > from) out.push(s.slice(from, i));
            out.push(r); i += len; from = i; done = hit = true; break;
          }
        }
      }
      if (!done) i++;
    }
    if (!hit) return '';
    if (from < n) out.push(s.slice(from));
    return out.join('');
  }

  /* ------------------------------------------------------------------ documents */
  var W = [10, 7, 5, 4, 1.5];          // name > aliases > tags > summary > body
  var DOCS = null, BYKEY = null, DF = null, BUILD_MS = 0, AREA_NAMES = null, EN_VOCAB = null;
  var CONCEPTS = null, CRISIS = null, NM = {}, RM = {};   // NM / RM: normalised text / readings of repeated lines

  function txt(o) {
    if (o == null) return '';
    if (typeof o === 'string') return o;
    if (Array.isArray(o)) return o.map(txt).join(' ');
    var s = [];
    if (o.ja) s.push(o.ja);
    if (o.jr && o.jr !== o.ja) s.push(o.jr);
    return s.join(' ');
  }
  function txtEn(o) {
    if (o == null) return '';
    if (typeof o === 'string') return isAscii(o) ? o : '';
    if (Array.isArray(o)) return o.map(txtEn).join(' ');
    return o.en || '';
  }
  function enField(s) { var t = asciiTokens(s, false); return t.length ? ' ' + t.join(' ') + ' ' : ''; }

  /* Two phases, so opening 「きく」 is instant: names, aliases, tags and summaries (+ their readings) are indexed at
     once; the long body text and the English fields are added by full() — in idle time (warm) or, at the latest, by
     the first query that runs before warm has finished. */
  function mkDoc(type, id, o) {
    var f = [], k = [];
    for (var i = 0; i < 4; i++) {
      var ja = o.ja[i] || '';
      // tag lines repeat a lot (same categories and kind): normalised once each
      f[i] = i >= 2 ? (NM[ja] != null ? NM[ja] : (NM[ja] = norm(ja, true))) : norm(ja, true);
      // reading layer for the short, high-weight fields (where hiragana queries matter)
      // (the readings are added in the second phase)
      k[i] = '';
    }
    f[4] = ''; k[4] = '';
    var d = {
      type: type, id: id, key: type + ':' + id, title: o.title, href: o.href, cat: o.cat || null, rec: o.rec || null,
      f: f, k: k, e: ['', '', '', '', ''], prior: o.prior || 0, areas: o.areas || null, level: o.level || null, track: o.track || null,
      raw: { body: o.ja[4] || '', ja0: o.ja[0] || '', ja3: o.ja[3] || '', more3: o.more3 || null, en: o.en }
    };
    d.all = f.join('\u0001') + '\u0001' + k.join('\u0001');
    d.allEn = '';
    return d;
  }
  function full(d) {
    if (!d.raw) return;
    var r = d.raw;
    d.raw = null;
    var val = function (x) { return typeof x === 'function' ? x() : (x || ''); };
    d.f[4] = norm(val(r.body), true);
    // the reading of field 3, and the rest of the summary (+ its reading), which joins the hook
    d.k[0] = norm(reading(r.ja0), true);
    var h3 = r.ja3 || '';
    d.k[3] = h3 ? (RM[h3] != null ? RM[h3] : (RM[h3] = norm(reading(h3), true))) : '';
    if (r.more3) {
      var m = val(r.more3);
      d.f[3] += ' ' + norm(m, true);
      d.k[3] += ' ' + norm(reading(m), true);
    }
    var en = val(r.en);
    for (var i = 0; i < 5; i++) d.e[i] = enField(en[i] || '');
    d.all = d.f.join('\u0001') + '\u0001' + d.k.join('\u0001');
    d.allEn = d.e.join(' ');
  }

  // a 区市町村 by code, or (v7) a prefecture by its 2-digit code: {name, kana, en}
  function areaName(code) {
    code = code == null ? '' : String(code);
    if (/^\d{2}$/.test(code)) return prefRec(code);
    var a = SM.area ? SM.area(code) : null;
    if (!a) { var list = SM.data.areas || []; for (var i = 0; i < list.length; i++) if (list[i].code === code) { a = list[i]; break; } }
    return a;
  }
  function prefList() {
    var U = SM.matchUtil, l = SM.data.prefs;
    if (l && l.length) return l;
    try { if (U && U.prefs) return U.prefs() || []; } catch (e) { }
    return [];
  }
  function prefRec(code) {
    var l = prefList();
    for (var i = 0; i < l.length; i++) if (l[i] && String(l[i].code) === code) return l[i];
    return null;
  }
  function prefOf(code) {
    code = code == null ? '' : String(code);
    return /^\d{5}$/.test(code) ? code.slice(0, 2) : /^\d{2}$/.test(code) ? code : null;
  }
  function isCity(code) { return typeof code === 'string' && /^\d{5}$/.test(code); }
  // the prefecture a 都・県・区市町村 record belongs to (SM.matchUtil.recPref when match.js is there)
  function recPref(p) {
    var U = SM.matchUtil;
    if (U && U.recPref) { try { return U.recPref(p); } catch (e) { } }
    if (!p) return null;
    if (p.pref) return String(p.pref);
    if (p.basis === 'tokyo') return '13';
    var ar = (p.for && p.for.areas) || [];
    for (var i = 0; i < ar.length; i++) { var x = prefOf(ar[i]); if (x) return x; }
    return p.basis === 'local' ? '13' : null;
  }
  // national schemes each 都県 runs as its own program (program.js shows the person's version the same way)
  var VERSIONED = { 'jiritsu-shikin': 1, 'saposute': 1,
    // v8: one record per 都県 (data/programs-housing-kanto.js); routeIds swaps the prefix, a 都県 without one drops the line
    'kenei-jutaku': 1, 'kyoju-shien-kyogikai': 1, 'kyoju-shien-hojin': 1 };
  var PREF_SLUG = { '08': 'ibaraki', '09': 'tochigi', '10': 'gunma', '11': 'saitama', '12': 'chiba', '13': 'tokyo', '14': 'kanagawa' };
  function kindLabel(k) {
    return ({ grant: '給付 もらえる お金 grant', loan: '貸付 借りる loan', loan_forgivable: '貸付 返さなくていい場合 loan',
      service: '相談 窓口 service', hotline: '電話 相談 ホットライン hotline phone line', procedure: '手続き 役所 procedure',
      housing: '住まい 住む場所 housing', place: '居場所 場所 place' })[k] || '';
  }
  function catWords(cats) {
    return (cats || []).map(function (c) { var C = SM.CATS && SM.CATS[c]; return C ? C.ja + ' ' + C.mark : ''; }).join(' ');
  }
  function catWordsEn(cats) {
    return (cats || []).map(function (c) { var C = SM.CATS && SM.CATS[c]; return C ? C.en : ''; }).join(' ');
  }

  function programDoc(p) {
    var areas = (p.for && p.for.areas) || [];
    // v7: the record's prefecture is a tag too (神奈川県 かながわけん), so 「神奈川 奨学金」 finds 神奈川県's own
    var rp = recPref(p), tagCodes = areas.slice();
    if (rp && tagCodes.indexOf(rp) === -1 && (p.pref || p.basis === 'tokyo' || p.basis === 'pref')) tagCodes.push(rp);
    var areaWords = tagCodes.map(function (c) { var a = areaName(c); return a ? a.name + ' ' + a.kana : ''; }).join(' ');
    var areaEn = tagCodes.map(function (c) { var a = areaName(c); return a ? a.en : ''; }).join(' ');
    var c = p.contact || {};
    var locs = (p.locations || []).map(function (l) { return l.name || ''; }).join(' ');
    var dl = p.deadline || {};
    return mkDoc('program', p.id, {
      title: p.name, href: '#/p/' + encodeURIComponent(p.id), cat: (p.cat && p.cat[0]) || 'procedures', rec: p,
      areas: areas.length ? areas : null,
      ja: [
        txt(p.name),
        '',
        [catWords(p.cat), kindLabel(p.kind), areaWords, c.line || /line/i.test(c.chat || '') ? 'LINE らいん' : '', c.chat ? 'チャット' : ''].join(' '),
        txt(p.hook),
        // the long text is gathered only when the second phase runs (functions: nothing is built before that)
        function () { return [txt(p.who), txt(p.how), txt(p.where), txt(p.amount), txt(p.docs), txt(p.ask), txt(p.caution), txt(dl), txt(c.phoneLabel), locs].join(' '); }
      ],
      more3: function () { return txt(p.summary); },
      en: function () {
        return [
          txtEn(p.name), '', [catWordsEn(p.cat), kindLabel(p.kind), areaEn].join(' '),
          txtEn(p.hook) + ' ' + txtEn(p.summary),
          [txtEn(p.amount), txtEn(p.who), txtEn(p.how), txtEn(dl)].join(' ')
        ];
      }
    });
  }
  function lessonDoc(l) {
    var body = [], bodyEn = [], made = false;
    function make() {
      if (made) return; made = true;
      (l.steps || []).forEach(function (s) {
      body.push(txt(s.head), txt(s), txt(s.mark), txt(s.q));
      bodyEn.push(txtEn(s.head), txtEn(s), txtEn(s.q));
      if (s.left) body.push(txt(s.left.title), txt(s.left.body), txt(s.left.points));
      if (s.right) body.push(txt(s.right.title), txt(s.right.body), txt(s.right.points));
      (s.options || []).forEach(function (o) { body.push(txt(o)); });
      });
      (l.recap || []).forEach(function (r) { body.push(txt(r)); bodyEn.push(txtEn(r)); });
    }
    return mkDoc('lesson', l.id, {
      title: l.title, href: '#/learn/' + encodeURIComponent(l.id), cat: l.cat || 'money', rec: l, level: l.level,
      prior: -3,
      ja: [txt(l.title), '', 'まなぶ レッスン お金のきほん ' + catWords([l.cat]), txt(l.lead), function () { make(); return body.join(' '); }],
      en: function () { make(); return [txtEn(l.title), '', 'learn lesson money basics ' + catWordsEn([l.cat]), txtEn(l.lead), bodyEn.join(' ')]; }
    });
  }
  function toolDocs() {
    var out = [], D = SM.data, lx = lex().tools || {};
    function add(key, cat, title, words, body, bodyEn) {
      var t = lx[key] || {};
      out.push(mkDoc('tool', key, {
        title: t.title || title, href: t.href || '#/tools/' + key, cat: cat, prior: -1,
        ja: [txt(t.title || title), txt(t.alias), 'ツール べんりツール ' + words, txt(t.sub), body],
        en: [txtEn(t.title || title), txtEn(t.alias), 'tool ' + (t.wordsEn || ''), txtEn(t.sub), bodyEn || '']
      }));
    }
    var S = D.scripts || {}, sb = [], sbe = [];
    Object.keys(S).forEach(function (k) { sb.push(txt(S[k].label), txt(S[k].short)); sbe.push(txtEn(S[k].label), txtEn(S[k].short)); });
    add('script', 'consult', { ja: '電話・窓口の台本', en: 'Phone & visit script' }, '電話 窓口 台本 話し方', sb.join(' '), sbe.join(' '));
    var C = D.checks || [], cb = [], cbe = [];
    C.forEach(function (c) { cb.push(txt(c.t)); cbe.push(txtEn(c.t)); });
    (D.checkScenes || []).forEach(function (s) { cb.push(txt(s.label)); cbe.push(txtEn(s.label)); });
    add('check', 'procedures', { ja: '契約チェック', en: 'Contract check' }, '契約 チェック だまされ', cb.join(' '), cbe.join(' '));
    var sim = D.sim || {}, mb = [], mbe = [];
    (sim.expenses || []).concat(sim.incomes || []).forEach(function (x) { mb.push(txt(x.label)); mbe.push(txtEn(x.label)); });
    ((D.simJr || {}).expenses || []).concat((D.simJr || {}).incomes || []).forEach(function (x) { mb.push(txt(x.label)); });
    add('money', 'money', { ja: '生活費の計算', jr: 'お金のけいさん', en: 'Money calculator' }, '生活費 シミュレーター 計算 ひとり暮らし おこづかい', mb.join(' '), mbe.join(' '));
    return out;
  }
  function taskDocs() {
    var out = [], T = SM.data.timeline || [];
    T.forEach(function (g, gi) {
      (g.tasks || []).forEach(function (t) {
        var gid = g.track === 'junior' ? g.id : 'm' + g.m;
        out.push(mkDoc('task', gid + ':' + t.id, {
          title: { ja: t.ja, jr: t.jr || t.ja, en: t.en }, href: '#/plan', cat: null, prior: -3, track: g.track,
          rec: { task: t, group: g, ps: t.p || [] },
          ja: [t.ja + (t.jr ? ' ' + t.jr : ''), '', 'やること ' + txt(g.title) + ' ' + txt(g.when), txt(g.sub), ''],
          en: [t.en || '', '', 'to-do ' + txtEn(g.title), txtEn(g.sub), '']
        }));
      });
    });
    return out;
  }
  function areaDocs() {
    var counts = {}, P = SM.data.programs || [];
    P.forEach(function (p) { (p.locations || []).forEach(function (l) { if (l && l.area) counts[l.area] = (counts[l.area] || 0) + 1; }); });
    // v8: a ward's count is what #/map/<ward> lists — the ward's own offices plus the city-wide ones; a 政令市 counts its
    // wards' offices too (the map folds them into the city)
    var cityOf = SM.matchUtil && SM.matchUtil.cityOf ? SM.matchUtil.cityOf : null;
    var countFor = function (a) {
      var n = counts[a.code] || 0;
      if (!cityOf) return n;
      if (a.parent) n += counts[String(a.parent)] || 0;
      else Object.keys(counts).forEach(function (c) { if (c !== a.code && cityOf(c) === a.code) n += counts[c]; });
      return n;
    };
    return (SM.data.areas || []).map(function (a) {
      return mkDoc('area', a.code, {
        title: { ja: (a.parent && SM.matchUtil && SM.matchUtil.areaFull ? SM.matchUtil.areaFull(a.code, false) : a.name) + 'の窓口',
          en: (a.parent && SM.matchUtil && SM.matchUtil.areaFull ? SM.matchUtil.areaFull(a.code, true) : a.en) + ' — places' }, href: '#/map/' + a.code, cat: null, prior: -2,
        rec: { area: a, count: countFor(a) }, areas: [a.code],
        ja: [a.name + ' ' + a.kana, '', '窓口 マップ 地図 場所', '', ''],
        en: [a.en + ' ' + (a.type === 'ku' ? 'ward city' : 'city town village'), '', 'map place office', '', '']
      });
    });
  }

  /* lexicon: concepts (everyday words → targets), crisis kinds. Words: kana / kanji are matched inside the
     normalised query; ASCII words against the query's word tokens ('part_time' = two tokens in a row). */
  function prepWords(list) {
    var ja = [], en = [];
    (list || []).forEach(function (w) {
      if (!w) return;
      if (isAscii(w)) {
        // plain ASCII: no width folding needed (the same tokens asciiTokens would give)
        var m = w.toLowerCase().match(/[a-z0-9][a-z0-9']*/g) || [], toks = [];
        for (var i = 0; i < m.length; i++) { var x = m[i].replace(/'/g, ''); if (x) toks.push(stem(x)); }
        if (toks.length) en.push(toks);
      } else {
        var n = norm(w, true);   // NFKC only where width forms occur (as for documents)
        if (n) ja.push(n);
      }
    });
    ja.sort(function (a, b) { return b.length - a.length; });
    return { ja: ja, en: en };
  }
  function splitWords(s) { return Array.isArray(s) ? s : String(s || '').split(/\s+/).filter(Boolean); }
  function prepConcepts() {
    var L0 = lex();
    CONCEPTS = (L0.concepts || []).map(function (c) {
      var w = prepWords(splitWords(c.w));
      return {
        id: c.id, w: w, label: c.q || null, weight: c.weight == null ? 1 : c.weight,
        p: splitWords(c.p), l: splitWords(c.l), t: splitWords(c.t), k: splitWords(c.k), a: c.a || null,
        jr: c.jr != null ? splitWords(c.jr) : null, hl: splitWords(c.hl), crisis: c.crisis || null, young: !!c.young
      };
    });
    CRISIS = (L0.crisis || []).map(function (c) {
      return { kind: c.kind, w: prepWords(splitWords(c.w)), not: prepWords(splitWords(c.not)).ja };
    });
  }

  /* The first phase is a list of small jobs (the lexicon, 16 programs at a time, lessons, tools, to-dos, places), so
     warm() can run it in idle slices when the box is still empty; build() runs whatever is left at once (a query, or a
     deep link that needs an answer now). BUILD_MS = the time spent in the jobs. */
  var JOBS = null, JOB_I = 0, PART = null, BUILD_T = 0;
  function jobs() {
    if (JOBS) return;
    PART = [];
    JOBS = [prepConcepts];
    var P = SM.data.programs || [];
    for (var i = 0; i < P.length; i += 16) {
      JOBS.push((function (list) { return function () { list.forEach(function (p) { if (p && p.id) PART.push(programDoc(p)); }); }; })(P.slice(i, i + 16)));
    }
    JOBS.push(function () { (SM.data.lessons || []).forEach(function (l) { if (l && l.id) PART.push(lessonDoc(l)); }); });
    JOBS.push(function () { PART = PART.concat(toolDocs(), taskDocs()); });
    JOBS.push(function () { PART = PART.concat(areaDocs()); });
    JOBS.push(finishBuild);
  }
  function runJob() {
    var t0 = now();
    JOBS[JOB_I++]();
    BUILD_T += now() - t0;
    if (JOB_I === JOBS.length) BUILD_MS = BUILD_T;
  }
  function build() {
    if (DOCS) return BUILD_MS;
    jobs();
    while (JOB_I < JOBS.length) runJob();
    return BUILD_MS;
  }
  function finishBuild() {
    var list = PART;
    PART = null;
    BYKEY = {};
    list.forEach(function (d) { BYKEY[d.key] = d; });
    DF = {};
    /* v7: every 区市町村 of 関東 plus the seven prefectures (code '14' …: 神奈川県 / 神奈川 / かながわ / kanagawa).
       A town whose bare name is a prefecture's (茨城町) or an everyday word needs its suffix; its English name is
       left out when it is a prefecture's (Ibaraki). */
    var PREFS = prefList(), PSHORT = {}, PEN = {};
    PREFS.forEach(function (pr) { if (!pr) return; PSHORT[pr.short || pr.name.replace(/[都県]$/, '')] = 1; if (pr.en) PEN[pr.en.toLowerCase()] = 1; });
    // everyday words, common surnames or famous places that are also a 区市町村's bare name: need the suffix
    var AMB = /^(国立|中央|大島|府中|昭島|小川|一宮|白子|長生|大和|明和|富士見|日の出|みどり|東海|河内|境|上野|昭和|高山|大泉|吉岡|川島|中井|大井|二宮|開成|松田|神崎|吉見|美里|茂木|益子|芳賀|野木|塩谷|玉村|板倉|下仁田|葉山|寒川|清川)$/;
    var bareN = {};
    (SM.data.areas || []).forEach(function (a) { var b = a.name.replace(/[区市町村]$/, ''); (bareN[b] = bareN[b] || []).push(a); });
    AREA_NAMES = (SM.data.areas || []).map(function (a) {
      var bare = a.name.replace(/[区市町村]$/, '');
      var kana = norm(a.kana), kanaBare = kana.replace(/(く|し|ちょう|まち|むら|そん)$/, '');
      // a bare name two places share (千代田区 / 千代田町, 八千代市 / 八千代町) stays with the 区・市 only
      var twin = (bareN[bare] || []).length > 1 && (!/^(ku|shi)$/.test(a.type) || bareN[bare].filter(function (x) { return /^(ku|shi)$/.test(x.type); }).length > 1);
      var amb = AMB.test(bare) || !!PSHORT[bare] || twin;
      var en = a.en ? a.en.toLowerCase().replace(/[^a-z]/g, '') : '';
      return { code: a.code, name: norm(a.name), bare: bare.length >= 2 && !amb ? norm(bare) : null,
        kana: kana.length >= 4 ? kana : null, kanaBare: kanaBare.length >= 3 && !amb ? kanaBare : null,
        en: en && !PEN[en] && !twin ? stem(en) : null, ward: !!a.parent, city: a.parent ? String(a.parent) : null };
    });
    PREFS.forEach(function (pr) {
      if (!pr) return;
      var short = pr.short || pr.name.replace(/[都県]$/, '');
      var kana = norm(pr.kana || ''), kanaBare = kana.replace(/(けん|と)$/, '');
      AREA_NAMES.push({ code: String(pr.code), pref: true, name: norm(pr.name), bare: short.length >= 2 ? norm(short) : null,
        kana: kana.length >= 4 ? kana : null, kanaBare: kanaBare.length >= 3 ? kanaBare : null,
        en: pr.en ? stem(pr.en.toLowerCase().replace(/[^a-z]/g, '')) : null });
    });
    DOCS = list;
  }
  var FULL = false, WARM_I = 0, WARM_CB = [];
  function fullDone() { FULL = true; DF = {}; EN_VOCAB = null; var cb = WARM_CB; WARM_CB = []; cb.forEach(function (f) { try { f(); } catch (e) { } }); }
  function ensureFull() {
    if (FULL) return;
    build();
    while (WARM_I < DOCS.length) full(DOCS[WARM_I++]);
    fullDone();
  }
  // second phase in idle time, ≤ 8ms per slice; done() runs once the whole index is ready
  var warming = false;
  function warm(done) {
    if (FULL) { if (done) done(); return; }
    jobs();
    if (done) WARM_CB.push(done);
    if (warming) return;
    warming = true;
    var idle = window.requestIdleCallback ? function (f) { window.requestIdleCallback(f, { timeout: 500 }); } : function (f) { setTimeout(f, 16); };
    (function step() {
      if (FULL) { warming = false; return; }
      var t0 = now();
      // first phase (if nothing has needed it yet), then the second
      while (!DOCS && JOB_I < JOBS.length) { runJob(); if (now() - t0 > 8) break; }
      if (!DOCS) { idle(step); return; }
      while (WARM_I < DOCS.length) { full(DOCS[WARM_I++]); if (now() - t0 > 8) break; }
      if (WARM_I < DOCS.length) idle(step);
      else { warming = false; fullDone(); }
    })();
  }

  function df(bg) {
    if (DF[bg] != null) return DF[bg];
    var n = 0;
    for (var i = 0; i < DOCS.length; i++) if (DOCS[i].all.indexOf(bg) !== -1) n++;
    DF[bg] = n;
    return n;
  }
  function enVocab() {
    if (EN_VOCAB) return EN_VOCAB;
    EN_VOCAB = {};
    DOCS.forEach(function (d) { d.allEn.split(' ').forEach(function (w) { if (w.length >= 4) EN_VOCAB[w] = 1; }); });
    return EN_VOCAB;
  }

  /* ------------------------------------------------------------------ query analysis */
  // endings that say how you feel about it, not what it is: 「奨学金について知りたい」→「奨学金」
  var ENDINGS = /(について(しりたい|おしえて)?|をしりたい|がしりたい|しりたい|おしえて(ください|ほしい)?|とは(なに|なん)?|ってなに|ってなん|ってなんですか|ってどうするの|はどうすれば(いい)?|どうすれば(いい)?|どうしたら(いい)?|どこに(そうだん)?すれば(いい)?|どうしよう|ですか|ますか|ください|です|ます|ほしい|かな|かも|[?？!！。、]+)+$/;
  function chunksOf(q) {
    var f = fold(String(q || ''));
    try { f = f.normalize('NFKC'); } catch (e) { }
    return f.split(/[\s　、,。.!?！？・／\/]+/).map(function (c) {
      var n = norm(c.replace(/[a-z0-9']+/g, ' '));
      var s = n.replace(ENDINGS, '');
      return s.length >= 1 ? s : n;
    }).filter(function (c) { return c.length > 0; });
  }
  function bigrams(s) {
    var out = [], seen = {};
    if (s.length === 1) return [s];
    for (var i = 0; i < s.length - 1; i++) {
      var b = s.substr(i, 2);
      if (!seen[b]) { seen[b] = 1; out.push(b); }
    }
    return out;
  }

  function matchConcepts(n, toks) {
    var hits = [], covered = [];
    var tokStr = ' ' + toks.join(' ') + ' ';
    CONCEPTS.forEach(function (c) {
      var best = 0, words = [];
      for (var i = 0; i < c.w.ja.length; i++) {
        var w = c.w.ja[i];
        var at = n.indexOf(w);
        if (at !== -1) {
          var s = Math.min(1, 0.55 + w.length * 0.15);
          if (s > best) best = s;
          words.push(w);
          covered.push([at, at + w.length]);
        }
      }
      for (var j = 0; j < c.w.en.length; j++) {
        var ph = ' ' + c.w.en[j].join(' ') + ' ';
        if (tokStr.indexOf(ph) !== -1) { best = Math.max(best, c.w.en[j].length > 1 ? 1 : 0.9); words.push(c.w.en[j].join(' ')); }
      }
      if (best > 0) hits.push({ c: c, s: best, words: words, fuzzy: false });
    });
    return { hits: hits, covered: covered };
  }
  // one-typo matches for kana words (≥4 kana) and English words (≥5 letters), only for parts no exact word covered
  function fuzzyConcepts(n, toks, covered, exactIds) {
    var hits = [];
    var free = n.split('');
    covered.forEach(function (r) { for (var i = r[0]; i < r[1]; i++) free[i] = ' '; });
    var rest = free.join('').split(' ').filter(function (s) { return s.length >= 3; });
    CONCEPTS.forEach(function (c) {
      if (exactIds[c.id]) return;
      var hit = null;
      for (var i = 0; i < c.w.ja.length && !hit; i++) {
        var w = c.w.ja[i];
        if (w.length < 5 || !isKana(w)) continue;
        for (var r = 0; r < rest.length && !hit; r++) {
          var s = rest[r];
          for (var L2 = w.length - 1; L2 <= w.length + 1 && !hit; L2++) {
            for (var st = 0; st + L2 <= s.length && !hit; st++) {
              // the first kana is rarely the typo; requiring it keeps 「いきたくない」 away from 「でたくない」
              if (s.charAt(st) === w.charAt(0) && within(s.substr(st, L2), w, 1)) hit = w;
            }
          }
        }
      }
      if (!hit) {
        for (var j = 0; j < c.w.en.length && !hit; j++) {
          if (c.w.en[j].length !== 1) continue;
          var ew = c.w.en[j][0];
          if (ew.length < 5) continue;
          for (var k = 0; k < toks.length && !hit; k++) {
            if (toks[k].length >= 4 && within(toks[k], ew, ew.length >= 8 ? 2 : 1)) hit = ew;
          }
        }
      }
      if (hit) hits.push({ c: c, s: 0.75, words: [hit], fuzzy: true });
    });
    return hits;
  }
  function insidePhrase(n, at, len, phrases) {
    for (var i = 0; i < phrases.length; i++) {
      var p = phrases[i], from = Math.max(0, at - p.length), k;
      while ((k = n.indexOf(p, from)) !== -1 && k <= at) { if (k + p.length >= at + Math.min(len, p.length) && k <= at) return true; from = k + 1; }
    }
    return false;
  }
  function matchCrisis(n, toks) {
    var kinds = [], tokStr = ' ' + toks.join(' ') + ' ';
    CRISIS.forEach(function (c) {
      var on = false;
      for (var i = 0; i < c.w.ja.length && !on; i++) {
        var w = c.w.ja[i], at = -1;
        // an occurrence inside an everyday phrase (「死ぬほど眠い」) does not count; any other occurrence does
        while (!on && (at = n.indexOf(w, at + 1)) !== -1) on = !insidePhrase(n, at, w.length, c.not);
      }
      for (var j = 0; j < c.w.en.length && !on; j++) if (tokStr.indexOf(' ' + c.w.en[j].join(' ') + ' ') !== -1) on = true;
      if (on && kinds.indexOf(c.kind) === -1) kinds.push(c.kind);
    });
    return kinds;
  }
  function mentionedAreas(chunks, n, toks) {
    var out = {};
    AREA_NAMES.forEach(function (a) {
      if (n.indexOf(a.name) !== -1 || (a.bare && n.indexOf(a.bare) !== -1) || (a.kana && n.indexOf(a.kana) !== -1)) out[a.code] = 1;
      else if (a.kanaBare && chunks.some(function (c) { return c.indexOf(a.kanaBare) === 0; })) out[a.code] = 1;
      else if (a.en && a.en.length >= 4 && toks.indexOf(a.en) !== -1) out[a.code] = 1;
    });
    return out;
  }

  /* ------------------------------------------------------------------ scoring */
  function textScore(d, chunks, toks) {
    var total = 0;
    for (var c = 0; c < chunks.length; c++) {
      var ch = chunks[c];
      var bgs = bigrams(ch), den = 0, list = [];
      for (var b = 0; b < bgs.length; b++) {
        var dfi = df(bgs[b]);
        if (!dfi) continue;                                  // in no document: carries no information
        var idf = Math.log(1 + DOCS.length / dfi);
        den += idf; list.push([bgs[b], idf]);
      }
      if (!den) continue;
      var best = 0;
      for (var fi = 0; fi < 5; fi++) {
        var F = d.f[fi], K = d.k[fi];
        if (!F && !K) continue;
        var num = 0;
        for (var x = 0; x < list.length; x++) {
          if ((F && F.indexOf(list[x][0]) !== -1) || (K && K.indexOf(list[x][0]) !== -1)) num += list[x][1];
        }
        if (!num) continue;
        var cov = num / den;
        var sc = W[fi] * cov * cov;
        // the whole chunk, as written, inside the field
        if (ch.length >= 2 && (F.indexOf(ch) !== -1 || (K && K.indexOf(ch) !== -1))) sc += W[fi] * (fi === 0 ? 0.9 : 0.5);
        if (sc > best) best = sc;
      }
      // a short chunk (1–2 chars) is weak evidence on its own
      total += ch.length <= 2 ? best * 0.6 : best;
    }
    if (toks.length) {
      var vocab = null, en = 0, used = 0;
      for (var t = 0; t < toks.length; t++) {
        var w = toks[t];
        if (w.length < 2) continue;
        used++;
        var bestE = 0;
        for (var ef = 0; ef < 5; ef++) {
          var E = d.e[ef];
          if (!E) continue;
          var sc2 = 0;
          if (E.indexOf(' ' + w + ' ') !== -1) sc2 = W[ef];
          else if (w.length >= 3 && E.indexOf(' ' + w) !== -1) sc2 = W[ef] * 0.7;
          if (sc2 > bestE) bestE = sc2;
        }
        if (!bestE && w.length >= 5) {
          // one typo (two for long words), against this document's words
          vocab = vocab || d.allEn.split(' ');
          for (var v = 0; v < vocab.length; v++) {
            var vw = vocab[v];
            if (vw.length >= 4 && vw.charAt(0) === w.charAt(0) && within(w, vw, w.length >= 8 ? 2 : 1)) { bestE = 2.5; break; }
          }
        }
        en += bestE;
      }
      if (used) total += en * (used > 1 ? 1.2 : 1);
    }
    return total;
  }

  function context(c) {
    c = c || {};
    var st = SM.state || {}, a = st.answers || {};
    var junior = c.junior != null ? c.junior : (SM.isJunior ? !!SM.isJunior() : false);
    var adult = c.adult != null ? c.adult : (/^(left0|left1)$/.test(a.stage || '') || /^(a18|a20|a23)$/.test(a.age || ''));
    return { area: c.area !== undefined ? c.area : (a.area || null), junior: junior, adult: adult && !junior,
      lang: c.lang || (SM.lang ? SM.lang() : 'ja') };
  }
  function jrOk(p) {
    var U = SM.matchUtil;
    if (U && typeof U.jrOk === 'function') { try { return !!U.jrOk(p); } catch (e) { } }
    var ag = p.for && p.for.age;
    return !(ag && ag.min != null && ag.min > 15);
  }
  function nameHasArea(d, named) {
    for (var i = 0; i < AREA_NAMES.length; i++) {
      var a = AREA_NAMES[i];
      if (!named[a.code]) continue;
      var nm = d.f[0] + ' ' + d.k[0];
      if (nm.indexOf(a.name) !== -1 || (a.bare && nm.indexOf(a.bare) !== -1) || (a.kanaBare && nm.indexOf(a.kanaBare) !== -1)) return true;
    }
    return false;
  }
  /* v7 (Kanto). named: the places in the query ({code: 1}, prefectures as 2-digit codes). The person's area may be a
     city (14100), a prefecture (14), 'other' or null. */
  function ctxScore(d, ctx, named, ts, pureArea) {
    var s = 0;
    if (d.type === 'program') {
      var p = d.rec, ar = d.areas || [];
      var cityOnly = ar.length > 0 && ar.every(isCity);
      var rp = recPref(p);
      var myPref = ctx.area && ctx.area !== 'other' ? prefOf(ctx.area) : null, myCity = isCity(ctx.area) ? ctx.area : null;
      var anyNamed = false, namedPref = {};
      for (var k in named) { anyNamed = true; var np = prefOf(k); if (np) namedPref[np] = 1; }
      var namedHit = ar.some(function (c) { return named[c]; }) || nameHasArea(d, named);
      // the prefecture, or a place in it, was named: its prefecture-wide records (not another city's own) come up
      var prefNamed = !namedHit && !!rp && !!namedPref[rp] && p.basis !== 'local';
      // a place named in the query + a record of that place that also matches the words: that is the answer
      if (namedHit) s += 14 + (ts >= 2 ? 24 : 0);
      else if (prefNamed) s += 8 + (ts >= 2 ? 12 : 0);
      // only a place name: the broad くらしの相談 desk of that place before narrower services
      if ((namedHit || prefNamed) && pureArea) s += (p.cat || []).length * 0.5;
      else if (cityOnly) {
        if (myCity && ar.indexOf(myCity) !== -1) s += 8;
        else s -= anyNamed ? 30 : (myCity ? 14 : 6);
      } else if (anyNamed && rp && !namedPref[rp]) s -= 24;
      // another prefecture's own record, not asked for by name: well down; the person's own prefecture: a little up
      if (myPref && rp && !namedPref[rp]) s += rp === myPref ? (cityOnly ? 0 : 3) : -14;
      // one of its windows is in the person's own city (川崎市の人 → 川崎市にある拠点)
      if (myCity && !cityOnly && (p.locations || []).some(function (l) { return l && String(l.area) === myCity; })) s += 3;
      // no area answered yet: the national ones (for everyone) before any one prefecture's
      if (!ctx.area && rp && !namedPref[rp] && !cityOnly) s -= 3;
      if (ctx.junior && !jrOk(p)) s -= 22;
      var ag = p.for && p.for.age;
      if (ctx.adult && ag && ag.max != null && ag.max < 18) s -= 12;
      // a national scheme the person's own 都県 runs as its own program: that one first (Tokyo: SM.tokyoVersion)
      var vp = myPref || (!ctx.area ? '13' : null);
      if (vp && p.basis === 'national' && !p.pref && (VERSIONED[p.id] || (SM.tokyoVersion && SM.tokyoVersion[p.id]))) {
        var own = vp === '13' && SM.tokyoVersion && SM.tokyoVersion[p.id] ? SM.tokyoVersion[p.id] : PREF_SLUG[vp] + '-' + p.id;
        if (BYKEY['program:' + own] && (vp !== '13' || (SM.tokyoVersion && SM.tokyoVersion[p.id]))) s -= 6;
      }
      if (ctx.area === 'other' && (ar.length || rp)) s -= 12;
    } else if (d.type === 'lesson') {
      if (ctx.junior) s += d.level === 'jr' ? 5 : d.level === 'hs' ? -3 : 0;
      else if (ctx.adult && d.level === 'jr') s -= 5;
    } else if (d.type === 'task') {
      if (ctx.junior) s += d.track === 'junior' ? 3 : -8;
      else s += d.track === 'junior' ? -8 : 0;
    } else if (d.type === 'area') {
      if (named[d.id]) s += pureArea ? 50 : 20;
      else s -= 40;
      if (ctx.area === d.id) s += 2;
      // v8: 「横浜市 緑区」 names the ward of that city, not the other three 緑区; a ward named with its city beats the city
      var wa = d.rec && d.rec.area;
      if (wa && wa.parent) {
        if (named[String(wa.parent)]) s += 12;
        else if (Object.keys(named).some(function (k) { var ka = SM.area ? SM.area(k) : null; return k !== d.id && isCity(k) && ka && !ka.parent && k !== String(wa.parent); })) s -= 25;
      }
    }
    return s;
  }

  /* v7: the lexicon names records of every 都県 in one list. For someone in prefecture X, another prefecture's own
     record gives its place to X's version of the same scheme (自立支援資金貸付 …) or drops out, so the curated order
     stays about what this person can use. Outside 関東 ('other'): national and NPO records only. With no area
     answered, everything stays — except in crisis lists, which keep national and Tokyo lines (as before v7).
     Also SM.search.route(ids, crisis) for the view's own crisis rows. */
  function routeIds(ids, crisis, ctx) {
    ctx = ctx || context();
    var myPrefQ = ctx.area && ctx.area !== 'other' ? prefOf(ctx.area) : null;
    var out = [];
    (ids || []).forEach(function (id) {
      var p = SM.program ? SM.program(id) : null;
      var rp = p ? recPref(p) : null;
      var away = !!rp && (myPrefQ ? rp !== myPrefQ : ctx.area === 'other' ? true : (!!crisis && rp !== '13'));
      if (away) {
        var base = id.replace(/^(tokyo|kanagawa|saitama|chiba|ibaraki|tochigi|gunma)-/, '');
        var own = myPrefQ ? PREF_SLUG[myPrefQ] + '-' + base : '';
        var twin = VERSIONED[base] ? (own && SM.program(own) ? own : base) : null;
        if (twin && SM.program(twin) && out.indexOf(twin) === -1) out.push(twin);
        return;
      }
      if (out.indexOf(id) === -1) out.push(id);
    });
    return out;
  }

  var GROUP = { program: 'support', lesson: 'learn', tool: 'tools', task: 'tasks', area: 'places' };

  function query(q, c) {
    build();
    // the first screen of a deep link may use the fast phase only (c.partial); everything else waits for the full index
    if (!(c && c.partial)) ensureFull();
    var ctx = context(c);
    var raw = String(q == null ? '' : q);
    var n = norm(raw);
    var out = { q: raw, n: n, empty: !n, crisis: null, best: null, hits: [], groups: { support: [], learn: [], tools: [], tasks: [], places: [] },
      topics: [], fuzzy: false, suggest: [], terms: [] };
    if (!n) return out;
    var toks = asciiTokens(raw, false);
    var chunks = chunksOf(raw);

    // crisis first: never depends on anything else
    var kinds = matchCrisis(n, asciiTokens(raw, true));
    if (kinds.length) out.crisis = { kinds: kinds };

    var cm = matchConcepts(n, asciiTokens(raw, true));
    var hits = cm.hits;
    if (!hits.length || cm.covered.length === 0) {
      var exact = {}; hits.forEach(function (h) { exact[h.c.id] = 1; });
      var fz = fuzzyConcepts(n, toks, cm.covered, exact);
      if (fz.length) { hits = hits.concat(fz); out.fuzzy = !cm.hits.length; }
    }
    // v7: lexicon place words that are not 区市町村 names (横浜市の区, 大宮, 浦和 …) name their city (concept.a). They
    // are taken out before the 区市町村 names are looked for, so 「港北区」 does not also name 東京都北区.
    var placeWords = [], placeCodes = [];
    hits.forEach(function (h) {
      if (!h.c.a) return;
      var codes = splitWords(h.c.a);
      // v8: the word is a ward of that city in data/areas.js (鶴見区 → 14101): the ward is named, and its city with it
      var wards = [];
      h.words.forEach(function (w) {
        var nw = norm(w);
        AREA_NAMES.forEach(function (a) {
          if (!a.ward || codes.indexOf(a.city) === -1) return;
          if (nw === a.name || nw === a.bare || nw === a.kana || nw === a.kanaBare) { if (wards.indexOf(a.code) === -1) wards.push(a.code); }
        });
      });
      h.codes = wards.length ? wards : codes;
      placeCodes = placeCodes.concat(codes).concat(wards);
      placeWords = placeWords.concat(h.words);
    });
    var nPlace = n, chunksPlace = chunks;
    if (placeWords.length) {
      var cut = function (x) { placeWords.forEach(function (w) { if (w && !isAscii(w)) x = x.split(w).join(' '); }); return x; };
      nPlace = cut(n);
      chunksPlace = chunks.map(cut).join(' ').split(' ').filter(Boolean);
    }
    var named = mentionedAreas(chunksPlace, nPlace, toks);
    placeCodes.forEach(function (code) { named[code] = 1; });
    // only a place name (+ 窓口 / 役所 / どこ …): the map of that place is the answer
    var pureArea = false;
    if (Object.keys(named).length) {
      var rest = n;
      AREA_NAMES.forEach(function (a) {
        if (!named[a.code]) return;
        [a.name, a.kana, a.bare, a.kanaBare].forEach(function (x) { if (x) rest = rest.split(x).join(''); });
      });
      placeWords.forEach(function (w) { if (w && !isAscii(w)) rest = rest.split(w).join(''); });
      rest = rest.replace(/まどぐち|窓口|くやくしょ|区役所|しやくしょ|市役所|役所|やくしょ|ちかく|近く|ばしょ|場所|どこ|まつぷ|ちず|地図|しゆうへん|周辺|[区市町村]|[のでにへ]|ある/g, '');
      pureArea = rest.length <= 1 && !toks.some(function (t) { return !/^(map|office|offices|near|place|places)$/.test(t) && AREA_NAMES.every(function (a) { return a.en !== t; }); });
    }

    var boost = {};
    var addB = function (key, v) { boost[key] = (boost[key] || 0) + v; };
    // v8: a named place's map always passes the text gate (a two-character ward name — 緑区, 西区, 北区 — scores
    // under it once 「の窓口」 follows; the place itself is the answer)
    Object.keys(named).forEach(function (code) { if (BYKEY['area:' + code]) addB('area:' + code, 1); });
    // v7: a query that names places in ONE prefecture (「横浜 家賃」) is about that prefecture, wherever the person lives
    var anyNamedQ = false, nPrefs = {};
    Object.keys(named).forEach(function (c) { anyNamedQ = true; var pf = prefOf(c); if (pf) nPrefs[pf] = 1; });
    var nPrefList = Object.keys(nPrefs);
    var rctx = nPrefList.length === 1 ? { area: nPrefList[0], junior: ctx.junior, adult: ctx.adult, lang: ctx.lang } : ctx;
    // a lexicon place word (港北区, 大宮) brings up the map of its city like the city's own name does
    hits.forEach(function (h) { if (h.c.a) (h.codes || splitWords(h.c.a)).forEach(function (code) { addB('area:' + code, 40); }); });
    hits.forEach(function (h) {
      var c2 = h.c, s = h.s * c2.weight;
      if (c2.young && ctx.adult) s *= 0.4;
      var ps = routeIds((ctx.junior && c2.jr) ? c2.jr : c2.p, false, rctx);
      ps.forEach(function (id, i) { addB('program:' + id, s * Math.max(14, 40 - i * 4)); });
      c2.l.forEach(function (id, i) { addB('lesson:' + id, s * Math.max(10, 30 - i * 5)); });
      c2.t.forEach(function (id, i) { addB('tool:' + id, s * Math.max(12, 30 - i * 5)); });
      c2.k.forEach(function (id, i) { addB('task:' + id, s * Math.max(10, 24 - i * 4)); });
      if (c2.label) out.topics.push({ id: c2.id, label: c2.label, fuzzy: h.fuzzy });
      h.words.forEach(function (w) { if (out.terms.indexOf(w) === -1) out.terms.push(w); });
      c2.hl.forEach(function (w) { if (out.terms.indexOf(w) === -1) out.terms.push(w); });
    });
    // crisis: the crisis lines are also the first results
    if (kinds.length) {
      var CR = lex().crisisIds || {};
      kinds.forEach(function (k) {
        var ids = routeIds((ctx.junior && CR[k + ':jr']) || CR[k] || [], true, ctx);
        ids.forEach(function (id, i) { addB('program:' + id, 60 - i * 5); });
      });
    }

    // v7: "a record of that place that also matches the words" is judged on the words other than the place name
    // (「横浜 家賃」: 家賃), or every record naming 横浜 would count as matching
    var restChunks = null;
    if (anyNamedQ && !pureArea) {
      restChunks = chunks.map(function (ch) {
        AREA_NAMES.forEach(function (a) {
          if (!named[a.code]) return;
          [a.name, a.kana, a.bare, a.kanaBare].forEach(function (x) { if (x) ch = ch.split(x).join(''); });
        });
        placeWords.forEach(function (w) { if (w && !isAscii(w)) ch = ch.split(w).join(''); });
        return ch.replace(/^[のでにへはがを]+/, '');
      }).filter(function (ch) { return ch.length > 0; });
    }
    var res = [];
    for (var i = 0; i < DOCS.length; i++) {
      var d = DOCS[i];
      var ts = n.length < 2 && !toks.length ? 0 : textScore(d, chunks, toks);
      var b = boost[d.key] || 0;
      if (ts < 2.2 && !b) continue;
      var tsW = restChunks && d.type === 'program' ? textScore(d, restChunks, toks) : ts;
      var score = ts + b + d.prior + ctxScore(d, ctx, named, tsW, pureArea);
      if (score < 3) continue;
      res.push({ d: d, score: score, ts: ts, b: b });
    }
    res.sort(function (x, y) { return y.score - x.score || (x.d.type === 'program' ? -1 : 0); });
    // a ward-only record from another ward should not crowd the list: keep at most 2 unless that ward was named
    out.hits = res.map(function (r) {
      return { key: r.d.key, type: r.d.type, id: r.d.id, href: r.d.href, title: r.d.title, cat: r.d.cat, score: Math.round(r.score * 10) / 10,
        text: Math.round(r.ts * 10) / 10, rec: r.d.rec };
    });
    out.hits.forEach(function (h) { out.groups[GROUP[h.type]].push(h); });
    // the best answer is a support, a lesson, a tool or a place (a to-do line is never "the answer")
    var top = null;
    for (var bi = 0; bi < Math.min(3, out.hits.length) && !top; bi++) if (out.hits[bi].type !== 'task') top = out.hits[bi];
    if (top && top.score >= 16) out.best = top;
    chunks.forEach(function (ch) { if (ch.length >= 2 && out.terms.indexOf(ch) === -1) out.terms.push(ch); });
    toks.forEach(function (t) { if (t.length >= 3 && out.terms.indexOf(t) === -1) out.terms.push(t); });

    // もしかして: when the words were only matched with a typo, or nothing matched
    if (out.fuzzy) out.suggest = out.topics.filter(function (t) { return t.fuzzy; }).map(function (t) { return { label: t.label, q: L(t.label, 'ja') }; });
    if (!out.hits.length) out.suggest = out.suggest.concat(nearest(n, toks));
    out.suggest = dedupe(out.suggest).slice(0, 4);
    return out;
  }
  function dedupe(list) {
    var seen = {};
    return list.filter(function (s) { var k = L(s.label, 'ja'); if (!k || seen[k]) return false; seen[k] = 1; return true; });
  }
  // the topics whose words look most like the query (character bigram overlap)
  function nearest(n, toks) {
    var qb = bigrams(n), out = [];
    CONCEPTS.forEach(function (c) {
      if (!c.label) return;
      var best = 0;
      c.w.ja.forEach(function (w) {
        if (w.length < 2) return;
        var wb = bigrams(w), inter = 0;
        wb.forEach(function (b) { if (qb.indexOf(b) !== -1) inter++; });
        var dice = 2 * inter / (wb.length + qb.length);
        if (dice > best) best = dice;
      });
      c.w.en.forEach(function (ws) {
        ws.forEach(function (w) { toks.forEach(function (t) { if (t.length >= 4 && w.length >= 4 && within(t, w, 2)) best = Math.max(best, 0.5); }); });
      });
      if (best >= 0.34) out.push({ s: best, label: c.label, q: L(c.label, 'ja') });
    });
    out.sort(function (a, b) { return b.s - a.s; });
    return out.slice(0, 3);
  }

  /* highlight ranges: every place in `text` where a term occurs (kana, width and case folded; one-to-one chars) */
  function highlight(text, terms) {
    var src = fold(text || ''), ranges = [];
    var loose = src.replace(LOOSE_RE, function (c) { return LOOSE[c]; });
    (terms || []).forEach(function (t) {
      var f = fold(t).replace(LOOSE_RE, function (c) { return LOOSE[c]; });
      if (!f || f.length < (isAscii(f) ? 3 : 2)) return;
      var at = 0, guard = 0;
      while ((at = loose.indexOf(f, at)) !== -1 && guard++ < 20) {
        if (isAscii(f)) {
          var pre = loose.charAt(at - 1);
          if (pre && /[a-z0-9]/.test(pre)) { at += f.length; continue; }
        }
        ranges.push([at, at + f.length]);
        at += f.length;
      }
    });
    ranges.sort(function (a, b) { return a[0] - b[0] || b[1] - a[1]; });
    var merged = [];
    ranges.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push([r[0], r[1]]);
    });
    return merged;
  }

  function starters(junior) {
    var s = lex().starters || {};
    return (junior ? s.jr : s.ja) || s.ja || [];
  }

  SM.search = {
    build: build,
    warm: warm,
    ready: function () { return !!DOCS; },
    full: function () { return FULL; },
    query: query,
    route: function (ids, crisis) { return routeIds(ids, crisis); },
    starters: starters,
    norm: norm,
    fold: fold,
    highlight: highlight,
    doc: function (key) { build(); return BYKEY[key] || null; },
    stats: function () { build(); return { docs: DOCS.length, ms: BUILD_MS }; },
    _reset: function () { DOCS = null; JOBS = null; JOB_I = 0; PART = null; BUILD_T = 0; BUILD_MS = 0; RUBY = null; NM = {}; RM = {}; EN_VOCAB = null; FULL = false; WARM_I = 0; }
  };
})();
