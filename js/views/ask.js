/* 巣立ちマップ v6 — views/ask.js (owner: SEARCH) — 「きく」 (#/ask, #/ask/<query>)
   A search box that understands everyday words (SPEC-v6 §1). The engine is js/search.js (SM.search), the everyday
   words are data/lexicon.js. Nothing is sent and nothing is stored: no search history; the query lives only in this
   page (and in the address, so Back from a result comes back to the same answer — never for crisis words).

   Screen, top to bottom
     なにに困ってる？ + one line (searched on this phone only) + the box (role=search) + an sr-only live region.
     Empty box: starter chips (8, 中学生 has its own) and two ways in (質問に答える / 困りごとから見る).
     A query:  (a) crisis words → いま話せるところ FIRST, before anything else, with no delay: tel rows, 110 / 119,
                   すべての連絡先 (the SOS sheet);
               (b) the query as the answer heading (it rises out of the box on Enter / on the first answer) + what was
                   understood (topics) + ONE best answer: what it is, one key fact, one action (電話する / くわしく見る /
                   読む / 開く / マップで見る), 公式ページ as a text link, the save star;
               (c) jump links + groups 支援 / まなぶ / ツール / 窓口 / やること with counts (ほかN件 opens in place);
               (d) もしかして chips when the words were only read with a typo, or nothing matched (with the way to
                   the questions and to 緊急).
   Motion (SM.motion; reduced motion = short fades, nothing moves): results update as you type (120ms debounce);
   rows that are NEW for this query cascade (30ms apart, at most 8), rows that stay do not move; the best card
   lifts in when it changes; a new group draws its rule; counts roll; matched words get a marker sweep.
   Keyboard: ↓ from the box goes into the results, ↑ / ↓ move between them, ↑ from the first goes back to the box,
   Esc clears (and still counts as the first Esc of the Esc×2 quick exit), Enter commits (and closes the keyboard on
   a phone). */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.views = SM.views || {};
  SM.data = SM.data || {};

  var esc = function (s) { return SM.esc ? SM.esc(s) : String(s == null ? '' : s); };
  var t = function (k, v) { return SM.t ? SM.t(k, v) : k; };
  var L = function (o) { return SM.L ? SM.L(o) : (o && (o.ja || o)) || ''; };
  var en = function () { return SM.lang && SM.lang() === 'en'; };
  var junior = function () { try { return !!(SM.isJunior && SM.isJunior()); } catch (e) { return false; } };
  var ic = function (n, c) { return SM.icon ? SM.icon(n, c) : ''; };
  var M = function () { return SM.motion || null; };
  function reduced() { var m = M(); try { return !m || m.reduced(); } catch (e) { return true; } }
  function anim(el, kf, o) { var m = M(); if (!m || !el) return null; try { return m.animate(el, kf, o); } catch (e) { return null; } }

  /* ------------------------------------------------------------------ strings */
  SM.strings({
    'ask.title': { ja: 'きく', en: 'Ask' },
    'ask.h1': { ja: 'なにに困ってる？', jr: 'なにに困ってる？', en: 'What do you need?' },
    'ask.sub': { ja: 'ふだんの言葉でOK。調べるのはこのスマホの中だけ。', jr: 'ふだんの言葉でOK。調べるのはこのスマホの中だけ。', en: 'Type it your way. Searched on this phone only.' },
    'ask.ph': { ja: '例：家賃がはらえない', jr: '例：高校のお金', en: 'e.g. can\'t pay rent' },
    'ask.label': { ja: '困っていることを入力', en: 'Type what you need' },
    'ask.clear': { ja: '入力を消す', en: 'Clear' },
    'ask.try': { ja: 'たとえば', en: 'For example' },
    'ask.ways': { ja: 'ほかのさがし方', en: 'Other ways to look' },
    'ask.wayQ': { ja: '6つの質問に答えてさがす', en: 'Answer 6 questions' },
    'ask.wayCats': { ja: '困りごとから見る', en: 'Browse by need' },
    'ask.best': { ja: 'いちばん近い答え', en: 'Closest answer' },
    'ask.near': { ja: '近いものが{n}件あります', en: '{n} close matches' },
    'ask.read': { ja: '読みとった言葉', en: 'Understood as' },
    'ask.jump': { ja: '結果の種類', en: 'Kinds of results' },
    'ask.g.support': { ja: '支援', en: 'Support' },
    'ask.g.learn': { ja: 'まなぶ', en: 'Learn' },
    'ask.g.tools': { ja: 'ツール', en: 'Tools' },
    'ask.g.places': { ja: '窓口', en: 'Places' },
    'ask.g.tasks': { ja: 'やること', en: 'To-dos' },
    'ask.unit': { ja: '件', en: '' },
    'ask.more': { ja: 'ほか{n}件を見る', en: 'Show {n} more' },
    'ask.less': { ja: 'たたむ', en: 'Show less' },
    'ask.maybe': { ja: 'もしかして', en: 'Did you mean' },
    'ask.none': { ja: '見つかりませんでした', en: 'Nothing found' },
    'ask.noneBody': { ja: 'ちがう言葉にするか、質問に答えてさがしてみて。', en: 'Try other words, or answer a few questions.' },
    'ask.noneQ': { ja: '質問に答える', en: 'Answer questions' },
    'ask.sos': { ja: '緊急の連絡先', en: 'Emergency contacts' },
    'ask.sosAll': { ja: '緊急の連絡先をすべて見る', en: 'See all emergency contacts' },
    'ask.call': { ja: '電話する', en: 'Call' },
    'ask.open': { ja: 'くわしく見る', en: 'See details' },
    'ask.readLesson': { ja: '読む', en: 'Read' },
    'ask.openTool': { ja: '開く', en: 'Open' },
    'ask.openMap': { ja: 'マップで見る', en: 'See on the map' },
    'ask.official': { ja: '公式ページ', en: 'Official page' },
    'ask.kind.lesson': { ja: 'まなぶ・{n}分', en: 'Lesson · {n} min' },
    'ask.kind.tool': { ja: 'べんりツール', en: 'Tool' },
    'ask.kind.place': { ja: '窓口・マップ', en: 'Places · map' },
    'ask.places': { ja: '{n}か所', en: '{n} places' },
    'ask.placesK': { ja: 'のっている窓口', en: 'Listed places' },
    'ask.phoneK': { ja: '電話', en: 'Phone' },
    'ask.amountK': { ja: 'もらえる・使えるもの', en: 'What you get' },
    'ask.status': { ja: '「{q}」：{n}件', en: '“{q}”: {n} results' },
    'ask.statusNone': { ja: '「{q}」：見つかりませんでした', en: '“{q}”: nothing found' },
    'ask.statusCrisis': { ja: 'いま話せる相談先を先に出しています。', en: 'Places to talk to now are shown first.' },
    'ask.task.when0': { ja: '巣立つ月', en: 'Leaving month' },
    'ask.task.before': { ja: '{n}か月前', en: '{n} mo. before' },
    'ask.task.after': { ja: '巣立って{n}か月', en: '{n} mo. after' },
    // crisis (a): titles by kind, most serious first
    'ask.cr.life': { ja: 'ひとりで抱えないで。いま話せるところ', jr: 'ひとりでかかえないで。いま話せるところ', en: 'You don\'t have to carry this alone. Talk to someone now' },
    'ask.cr.danger': { ja: '身の危険があるときは、すぐ電話を', en: 'If you are in danger, call now' },
    'ask.cr.abuse': { ja: '家のことで苦しいとき、話せるところ', en: 'If home is hurting you, people to talk to' },
    'ask.cr.nowhere': { ja: '今夜、いる場所がないとき', jr: '家にいられない・帰れないとき', en: 'Nowhere to stay tonight' },
    'ask.cr.emergency': { ja: '急ぐときは 119・110', en: 'Emergency: 119 / 110' },
    'ask.cr.distress': { ja: '話を聞いてくれるところ', en: 'People who will listen' },
    'ask.cr.lead': { ja: 'タップで電話。名前は言わなくて大丈夫。', en: 'Tap to call. You don\'t have to give your name.' },
    'ask.cr.urgentK': { ja: '命や体があぶないとき', en: 'If your life or body is in danger' },
    'ask.cr.chat': { ja: 'チャットで相談', en: 'Chat online' },
    'ask.cr.line': { ja: 'LINEで相談', en: 'Chat on LINE' },
    'ask.cr.page': { ja: 'くわしく見る', en: 'See details' }
  });

  /* ------------------------------------------------------------------ state (this page only; never stored) */
  var mem = {
    q: '',             // the text in the box
    shown: null,       // keys of the rows on screen (for "only new rows cascade")
    groups: {},        // group → count on screen
    best: null,        // key of the best answer on screen
    answered: false,   // an answer block is on screen
    open: {},          // group → ほかN件 opened (for this query only)
    openQ: '',
    timer: 0, urlTimer: 0, srTimer: 0,
    gen: 0
  };

  var CAPS = { support: 6, learn: 4, tools: 3, places: 3, tasks: 4 };
  var MAXROWS = 40;
  var ORDER = ['support', 'learn', 'tools', 'places', 'tasks'];

  /* ------------------------------------------------------------------ helpers */
  function hlHtml(text, terms) {
    text = String(text == null ? '' : text);
    if (!terms || !terms.length || !SM.search) return esc(text);
    var r = SM.search.highlight(text, terms), out = '', at = 0;
    r.forEach(function (x) {
      out += esc(text.slice(at, x[0])) + '<mark class="ask-hl">' + esc(text.slice(x[0], x[1])) + '</mark>';
      at = x[1];
    });
    return out + esc(text.slice(at));
  }
  // put highlighted text in place of the escaped text a component rendered (the first occurrence after `after`)
  function swapText(html, text, terms, after) {
    var e = esc(text);
    if (!e) return html;
    var from = after ? html.indexOf(after) : 0;
    if (from < 0) return html;
    var i = html.indexOf('>' + e + '<', from);
    if (i < 0) return html;
    return html.slice(0, i + 1) + hlHtml(text, terms) + html.slice(i + 1 + e.length);
  }
  function withKey(html, key) { return html.replace(/^<(\w+)/, '<$1 data-key="' + esc(key) + '"'); }
  function telHref(n) { return 'tel:' + String(n).replace(/[^\d+#*]/g, '').replace(/#/g, '%23'); }
  function isFree(n) { return /^0120|^0800/.test(String(n || '').replace(/\D/g, '')); }
  function progById(id) {
    var P = SM.data.programs || [];
    if (!mem.pIndex || mem.pIndex.n !== P.length) { mem.pIndex = { n: P.length, m: {} }; P.forEach(function (p) { mem.pIndex.m[p.id] = p; }); }
    return mem.pIndex.m[id] || null;
  }
  function hashFor(q) { return q ? '#/ask/' + encodeURIComponent(q) : '#/ask'; }
  function onAsk() { return !!(SM.route && SM.route.name === 'ask' && document.getElementById('ask-q')); }
  function quote(q) { return en() ? '“' + q + '”' : '「' + q + '」'; }

  /* ------------------------------------------------------------------ (a) crisis first */
  var CR_TITLE = { suicide: 'life', selfharm: 'life', violence: 'danger', sexual: 'danger', abuse: 'abuse', emergency: 'emergency', nowhere: 'nowhere', distress: 'distress' };
  var CR_RANK = ['suicide', 'selfharm', 'violence', 'sexual', 'emergency', 'abuse', 'nowhere', 'distress'];
  function crisisHtml(cr) {
    var kinds = cr.kinds.slice().sort(function (a, b) { return CR_RANK.indexOf(a) - CR_RANK.indexOf(b); });
    var lx = SM.data.lexicon || {}, CI = lx.crisisIds || {}, jr = junior();
    var ids = [];
    kinds.forEach(function (k) {
      ((jr && CI[k + ':jr']) || CI[k] || []).forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });
    });
    var rows = ids.map(progById).filter(Boolean).slice(0, 4).map(function (p) {
      var c = p.contact || {}, name = L(p.name), hours = L(c.hours);
      var free = c.phone && isFree(c.phone) ? t('ui.free') : '';
      var desc = [hours, free].filter(Boolean).join('・');
      var href, num, ext = false, lab;
      if (c.phone) { href = telHref(c.phone); num = c.phone; lab = name + ' ' + c.phone + (desc ? '. ' + desc : ''); }
      else if (c.chat || c.line) { href = c.chat || c.line; num = t(c.chat ? 'ask.cr.chat' : 'ask.cr.line'); ext = true; lab = name + '. ' + num + (desc ? '. ' + desc : ''); }
      else { href = '#/p/' + encodeURIComponent(p.id); num = t('ask.cr.page'); lab = name + '. ' + num; }
      return '<li class="sos-li" data-key="crisis:' + esc(p.id) + '"><a class="sos-row" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') +
        ' data-press aria-label="' + esc(lab + (ext ? '. ' + t('core.newtab') : '')) + '">' +
        '<span class="sos-ic" aria-hidden="true">' + ic(c.phone ? 'phone' : ext ? 'line' : 'arrow-right') + '</span>' +
        '<span class="sos-text"><span class="sos-name">' + esc(name) + '</span>' +
        '<span class="sos-num' + (c.phone ? '' : ' ask-cr-act') + '" data-noruby>' + esc(num) + '</span>' +
        (desc ? '<span class="sos-hours">' + esc(desc) + '</span>' : '') + '</span></a></li>';
    }).join('');
    var urgentFirst = kinds.some(function (k) { return k === 'violence' || k === 'sexual' || k === 'emergency'; });
    var urgent = function (big) {
      return '<ul class="sos-list ask-cr-urgent' + (big ? ' is-big' : '') + '" aria-label="' + esc(t('ask.cr.urgentK')) + '">' +
        [['110', 'sos.110'], ['119', 'sos.119']].map(function (u) {
          return '<li class="sos-li is-urgent"><a class="sos-row" href="tel:' + u[0] + '" data-press aria-label="' + esc(t(u[1]) + ' ' + u[0] + '. ' + t(u[1] + 'd')) + '">' +
            '<span class="sos-ic" aria-hidden="true">' + ic('phone') + '</span><span class="sos-text"><span class="sos-name">' + esc(t(u[1])) + '</span>' +
            '<span class="sos-num" data-noruby>' + u[0] + '</span>' + (big ? '<span class="sos-desc">' + esc(t(u[1] + 'd')) + '</span>' : '') + '</span></a></li>';
        }).join('') + '</ul>';
    };
    return '<section class="ask-crisis" aria-labelledby="ask-cr-h">' +
      '<h2 class="ask-cr-h" id="ask-cr-h">' + esc(t('ask.cr.' + (CR_TITLE[kinds[0]] || 'distress'))) + '</h2>' +
      '<p class="ask-cr-lead">' + esc(t('ask.cr.lead')) + '</p>' +
      (urgentFirst ? urgent(true) : '') +
      (rows ? '<ul class="sos-list ask-cr-list">' + rows + '</ul>' : '') +
      (urgentFirst ? '' : '<p class="ask-cr-k">' + esc(t('ask.cr.urgentK')) + '</p>' + urgent(false)) +
      '<button type="button" class="btn btn-sos btn-block ask-cr-all" data-act="sos">' + ic('phone') + '<span>' + esc(t('ask.sosAll')) + '</span></button>' +
    '</section>';
  }

  /* ------------------------------------------------------------------ (b) the best answer */
  function taskWhen(g) {
    if (!g) return '';
    if (g.track === 'junior' || typeof g.m !== 'number') return L(g.title);
    if (g.m === 0) return t('ask.task.when0');
    return g.m < 0 ? t('ask.task.before', { n: -g.m }) : t('ask.task.after', { n: g.m });
  }
  function bestHtml(h, terms) {
    var mark = '', kind = '', title = L(h.title), what = '', key = '', acts = '', save = '', rec = h.rec || {};
    if (h.type === 'program') {
      var p = rec, c = p.contact || {};
      mark = SM.ui.catIcon(h.cat, 'lg');
      kind = [SM.ui.basisLabel ? SM.ui.basisLabel(p) : '', SM.ui.catLabel(h.cat)].filter(Boolean).join('／');
      what = SM.ui.factSplit(L(p.summary) || L(p.hook)).head;
      var amt = L(p.amount) ? SM.ui.amountClause(L(p.amount)) : null;
      var call = !!c.phone && (p.kind === 'hotline' || (p.cat || [])[0] === 'consult');
      if (call) key = '<p class="ask-best-key ask-best-tel"><span class="ask-best-k">' + esc(t('ask.phoneK')) + (isFree(c.phone) ? '・' + esc(t('ui.free')) : '') + '</span><span class="ask-best-num" data-noruby>' + esc(c.phone) + '</span></p>';
      else if (amt && amt.text) key = '<p class="ask-best-key"><span class="sr-only">' + esc(t('ask.amountK')) + ': </span>' + SM.ui.amountHtml(amt.text) + '</p>';
      key += SM.ui.factTags(p, { max: 2 });
      var web = (p.source && p.source.url) || c.web || '';
      if (call) {
        acts = SM.ui.button(t('ask.call'), { href: telHref(c.phone), variant: 'primary', icon: 'phone', arrow: false }) +
          SM.ui.button(t('ask.open'), { href: h.href, variant: 'text' });
      } else {
        acts = SM.ui.button(t('ask.open'), { href: h.href, variant: 'primary' }) +
          (web ? SM.ui.button(t('ask.official'), { href: web, variant: 'text', external: true }) : '');
      }
      var saved = false; try { saved = !!(SM.isSaved ? SM.isSaved(p.id) : ((SM.state && SM.state.saved) || []).indexOf(p.id) !== -1); } catch (e) { }
      save = '<button type="button" class="pcard-save ask-best-save" data-act="save" data-id="' + esc(p.id) + '" aria-pressed="' + saved + '" aria-label="' + esc(t('ui.save') + '：' + title) + '" title="' + esc(t('ui.save')) + '">' + ic(saved ? 'star-fill' : 'star') + '</button>';
    } else if (h.type === 'lesson') {
      mark = SM.ui.catIcon(h.cat, 'lg');
      kind = t('ask.kind.lesson', { n: rec.minutes || 3 });
      what = L(rec.lead);
      acts = SM.ui.button(t('ask.readLesson'), { href: h.href, variant: 'primary' });
    } else if (h.type === 'tool') {
      var tl = ((SM.data.lexicon || {}).tools || {})[h.id] || {};
      mark = SM.ui.catIcon(h.cat, 'lg');
      kind = t('ask.kind.tool');
      what = L(tl.sub);
      acts = SM.ui.button(t('ask.openTool'), { href: h.href, variant: 'primary' });
    } else if (h.type === 'area') {
      mark = '<span class="ask-best-pin" aria-hidden="true">' + ic('pin') + '</span>';
      kind = t('ask.kind.place');
      key = '<p class="ask-best-key"><span class="ask-best-k">' + esc(t('ask.placesK')) + '</span>' + SM.ui.amountHtml(t('ask.places', { n: (rec.count || 0) })) + '</p>';
      acts = SM.ui.button(t('ask.openMap'), { href: h.href, variant: 'primary' });
    }
    return '<article class="ask-best" data-key="' + esc(h.key) + '"' + (h.type === 'program' ? ' data-id="' + esc(h.id) + '"' : '') + (h.cat ? ' data-cat="' + esc(h.cat) + '"' : '') + '>' +
      '<div class="ask-best-mark">' + mark + '</div>' +
      '<div class="ask-best-main">' +
        (kind ? '<p class="ask-best-kind">' + esc(kind) + '</p>' : '') +
        '<h3 class="ask-best-title"><a class="ask-nav" href="' + esc(h.href) + '">' + hlHtml(title, terms) + '</a></h3>' +
        (what ? '<p class="ask-best-what">' + hlHtml(what, terms) + '</p>' : '') +
        key +
        '<div class="ask-best-acts">' + acts + '</div>' +
      '</div>' + save +
    '</article>';
  }

  /* ------------------------------------------------------------------ (c) groups */
  function rowHtml(h, terms) {
    var title = L(h.title);
    if (h.type === 'program') {
      var html = SM.ui.programCard(h.rec, { headingLevel: 3 });
      return withKey(swapText(html, title, terms, 'class="pcard-link"'), h.key);
    }
    var o = { title: title, href: h.href, id: h.key };
    if (h.type === 'lesson') { o.cat = h.cat; o.meta = t('ask.kind.lesson', { n: (h.rec && h.rec.minutes) || 3 }).replace(/^[^・·]*[・·]\s*/, ''); }
    else if (h.type === 'tool') { o.cat = h.cat; }
    else if (h.type === 'area') { o.icon = 'pin'; o.meta = String((h.rec && h.rec.count) || 0); o.unit = t('ask.unit'); }
    else if (h.type === 'task') { o.icon = 'check-list'; o.sub = taskWhen(h.rec && h.rec.group); }
    return withKey(swapText(SM.ui.listItem(o), title, terms, 'class="list-title"'), h.key);
  }
  function groupHtml(g, list, terms, isOpen) {
    var cap = CAPS[g] || 4, shown = list.slice(0, cap), rest = list.slice(cap, MAXROWS);
    var rows = function (arr) { return arr.map(function (h) { return rowHtml(h, terms); }).join(''); };
    var wrap = g === 'support' ? 'pcards' : 'list';
    var count = '<span class="ask-count"><span class="ask-count-v" data-g="' + g + '" data-n="' + list.length + '">' + list.length + '</span><span class="unit">' + esc(t('ask.unit')) + '</span></span>';
    return '<section class="ask-group" data-g="' + g + '" aria-labelledby="ask-g-' + g + '">' +
      SM.ui.sectionHeader(t('ask.g.' + g), { level: 2, id: 'ask-g-' + g, action: count, reveal: false, cls: 'ask-gh' }) +
      '<div class="' + wrap + ' ask-rows">' + rows(shown) + '</div>' +
      (rest.length ? '<div class="' + wrap + ' ask-rows ask-rest" id="ask-rest-' + g + '"' + (isOpen ? '' : ' hidden') + '>' + rows(rest) + '</div>' +
        '<button type="button" class="ask-more" data-act="ask-more" data-g="' + g + '" aria-controls="ask-rest-' + g + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '">' +
          '<span>' + esc(isOpen ? t('ask.less') : t('ask.more', { n: rest.length })) + '</span>' + SM.ui.arrow(isOpen ? 'up' : 'down') + '</button>' : '') +
    '</section>';
  }

  /* ------------------------------------------------------------------ (d) もしかして, starters */
  // o.reveal: the chips step in one after another (the page's entrance; a repaint uses animateIn instead)
  function chipsHtml(list, label, cls, o) {
    o = o || {};
    var rv = o.reveal != null;
    return '<div class="ask-chips' + (cls ? ' ' + cls : '') + '" role="group" aria-label="' + esc(label) + '">' +
      '<p class="ask-chips-k" aria-hidden="true"' + (rv ? ' data-reveal="fade" data-reveal-delay="' + o.reveal + '"' : '') + '>' + esc(label) + '</p><div class="chips"' + (rv ? ' data-reveal-stagger="40"' : '') + '>' +
      list.map(function (s) { var w = L(s.q || s.label || s); return SM.ui.chip(L(s.label || s), { act: 'ask-try', attrs: 'data-q="' + esc(w) + '"' + (rv ? ' data-reveal="up" data-reveal-delay="' + (o.reveal + 40) + '"' : '') }); }).join('') +
      '</div></div>';
  }
  function startersList() {
    var S = SM.search ? SM.search.starters(junior()) : [];
    return S.map(function (s) { return { label: s, q: s }; });
  }
  function startHtml(enter) {
    return '<div class="ask-start">' +
      chipsHtml(startersList(), t('ask.try'), 'ask-starters', enter ? { reveal: 200 } : null) +
      '<div class="ask-ways"' + (enter ? ' data-reveal="up" data-reveal-delay="360"' : '') + '><p class="ask-chips-k">' + esc(t('ask.ways')) + '</p><div class="list">' +
        SM.ui.listItem({ title: t('ask.wayQ'), href: '#/find/q/1', icon: 'list' }) +
        SM.ui.listItem({ title: t('ask.wayCats'), href: '#/find', icon: 'search' }) +
      '</div></div></div>';
  }

  /* ------------------------------------------------------------------ the whole answer */
  function orderedGroups(res) {
    var best = res.best ? res.best.key : null;
    var gs = ORDER.map(function (g) {
      var list = res.groups[g].filter(function (h) { return h.key !== best; });
      return { g: g, list: list, top: list.length ? list[0].score : -1 };
    }).filter(function (x) { return x.list.length; });
    // a group whose first row is clearly closer comes first (to-dos always last)
    gs.sort(function (a, b) {
      if (a.g === 'tasks' || b.g === 'tasks') return a.g === 'tasks' ? 1 : b.g === 'tasks' ? -1 : 0;
      var d = b.top - a.top;
      return Math.abs(d) > 12 ? d : ORDER.indexOf(a.g) - ORDER.indexOf(b.g);
    });
    return gs;
  }
  function resultsHtml(res) {
    var terms = res.terms || [];
    var q = res.q.trim();
    var out = '';
    if (res.crisis) out += crisisHtml(res.crisis);
    var gs = orderedGroups(res);
    var total = res.hits.length;
    var maybe = res.suggest && res.suggest.length ? chipsHtml(res.suggest, t('ask.maybe'), 'ask-maybe') : '';
    // what was understood: the topics, minus one that only repeats the query
    var qn = SM.search.norm(q);
    var topics = res.topics.filter(function (x) { return !x.fuzzy && x.label && SM.search.norm(L(x.label)) !== qn; }).slice(0, 3).map(function (x) { return L(x.label); });
    out += '<section class="ask-answer" aria-labelledby="ask-qh">' +
      '<h2 class="ask-qh" id="ask-qh" tabindex="-1"><span class="ask-qh-t">' + esc(quote(q)) + '</span></h2>' +
      (topics.length ? '<p class="ask-topics"><span class="ask-topics-k">' + esc(t('ask.read')) + '</span>' + topics.map(function (x) { return '<span class="ask-topic">' + esc(x) + '</span>'; }).join('<span class="ask-sep" aria-hidden="true">・</span>') + '</p>' : '');
    if (!total) {
      out += maybe + SM.ui.empty(t('ask.none'), t('ask.noneBody'),
        SM.ui.button(t('ask.noneQ'), { href: '#/find/q/1', variant: 'primary' }) +
        '<button type="button" class="btn btn-text ask-none-sos" data-act="sos"><span>' + esc(t('ask.sos')) + '</span></button>', { illus: 'results-empty' }) +
        (res.suggest && res.suggest.length ? '' : chipsHtml(startersList(), t('ask.try'), 'ask-starters'));
      return out + '</section>';
    }
    if (res.fuzzy) out += maybe;
    if (res.best) out += '<div class="ask-best-wrap"><p class="ask-kicker">' + esc(t('ask.best')) + '</p>' + bestHtml(res.best, terms) + '</div>';
    else out += '<p class="ask-near">' + esc(t('ask.near', { n: total })) + '</p>';
    if (!res.fuzzy && maybe) out += maybe;
    out += '</section>';
    if (gs.length > 1 && total > 5) {
      out += '<nav class="ask-jump" aria-label="' + esc(t('ask.jump')) + '">' + gs.map(function (x) {
        return '<button type="button" class="ask-jump-b" data-act="ask-jump" data-g="' + x.g + '"><span>' + esc(t('ask.g.' + x.g)) + '</span><span class="ask-jump-n" data-g="' + x.g + '">' + x.list.length + '</span></button>';
      }).join('') + '</nav>';
    }
    var open = mem.openQ === res.n ? mem.open : {};
    out += gs.map(function (x) { return groupHtml(x.g, x.list, terms, !!open[x.g]); }).join('');
    return out;
  }

  /* ------------------------------------------------------------------ query + paint */
  function run(q) {
    if (!SM.search) return null;
    try { return SM.search.query(q, { partial: !SM.search.full() }); } catch (e) { console.error('[SM] ask: search failed', e); return null; }
  }
  function sig(res) { return res ? (res.crisis ? 'c' + res.crisis.kinds.join() : '') + '|' + res.hits.slice(0, 60).map(function (h) { return h.key; }).join() : ''; }

  function paint(o) {
    o = o || {};
    var out = document.getElementById('ask-out');
    if (!out) return;
    var q = mem.q.trim();
    var res = q ? run(q) : null;
    if (o.silent && sig(res) === mem.sig) return;
    mem.sig = sig(res);
    if (res && mem.openQ !== res.n) { mem.open = {}; mem.openQ = res.n; }
    // focus inside the results (a silent refresh): remember the row, put it back after
    var ae = document.activeElement, fKey = null;
    if (ae && out.contains(ae)) { var kr = ae.closest('[data-key]'); fKey = kr ? kr.getAttribute('data-key') : null; }

    var prevShown = mem.shown || {}, prevGroups = mem.groups || {}, prevBest = mem.best, wasAnswered = mem.answered;
    out.innerHTML = res ? resultsHtml(res) : startHtml();
    out.classList.toggle('is-empty', !res);
    try { SM.applyRuby(out); } catch (e) { }

    var shown = {}, groups = {};
    Array.prototype.forEach.call(out.querySelectorAll('.ask-rows > [data-key]'), function (el) { shown[el.getAttribute('data-key')] = 1; });
    Array.prototype.forEach.call(out.querySelectorAll('.ask-group'), function (el) { groups[el.getAttribute('data-g')] = el.querySelectorAll('.ask-rows > [data-key]').length; });
    var bestEl = out.querySelector('.ask-best');
    mem.shown = shown; mem.groups = groups; mem.best = bestEl ? bestEl.getAttribute('data-key') : null;
    mem.answered = !!res;

    if (fKey) { var back = out.querySelector('[data-key="' + fKey.replace(/"/g, '') + '"]'); var f = back && (back.matches('a,button') ? back : back.querySelector('a[href],button')); if (f) try { f.focus({ preventScroll: true }); } catch (e) { } }

    if (!o.instant && !o.silent) animateIn(out, { prevShown: prevShown, prevGroups: prevGroups, prevBest: prevBest, wasAnswered: wasAnswered, morph: o.morph });
    if (!o.silent) say(res, q);
    if (!o.noUrl) writeUrl(res, q);
  }

  /* motion: only what is new moves */
  function animateIn(out, p) {
    var m = M();
    if (!m) return;
    var red = reduced();
    var ENTER = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
    // the answer heading rises out of the box (the first answer, or Enter)
    var qh = out.querySelector('.ask-qh-t');
    if (qh && (p.morph || !p.wasAnswered)) morphHeading(qh, p.morph);
    // the best answer lifts in when it is a different one
    var best = out.querySelector('.ask-best');
    if (best && best.getAttribute('data-key') !== p.prevBest) {
      best.classList.add('is-new');
      anim(best, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { spring: 'rise', key: 'lift', delay: red ? 0 : 40 });
      var kick = out.querySelector('.ask-kicker');
      if (kick && !p.wasAnswered) anim(kick, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, key: 'fade' });
    }
    // rows that were not on screen before cascade; rows that stay never move
    var i = 0;
    Array.prototype.forEach.call(out.querySelectorAll('.ask-rows:not([hidden]) > [data-key]'), function (el) {
      if (p.prevShown[el.getAttribute('data-key')]) return;
      el.classList.add('is-new');
      anim(el, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
        { duration: 380, easing: ENTER, delay: 60 + Math.min(i++, 8) * 30, key: 'in' });
    });
    // a new group draws its rule; a group that stays rolls its count
    Array.prototype.forEach.call(out.querySelectorAll('.ask-group'), function (sec) {
      var g = sec.getAttribute('data-g'), n = sec.querySelectorAll('.ask-rows > [data-key]').length;
      var cv = sec.querySelector('.ask-count-v'), nv = cv ? Number(cv.getAttribute('data-n')) : 0;
      if (!(g in p.prevGroups)) {
        var rule = sec.querySelector('.section-rule');
        if (rule) anim(rule, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 520, easing: ENTER, delay: 80, key: 'draw' });
        if (cv && m.odometer) m.odometer(cv, nv, { from: '' });
      } else if (cv && m.odometer) {
        var was = out._askCounts && out._askCounts[g];
        if (was != null && Number(was) !== nv) m.odometer(cv, nv, { from: Number(was) });
      }
    });
    // the start screen: chips arrive 30ms apart
    if (out.classList.contains('is-empty') && p.wasAnswered) {
      Array.prototype.forEach.call(out.querySelectorAll('.ask-starters .chip'), function (c, k) {
        anim(c, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: ENTER, delay: Math.min(k, 8) * 30, key: 'in' });
      });
    }
    var counts = {};
    Array.prototype.forEach.call(out.querySelectorAll('.ask-count-v'), function (cv) { counts[cv.getAttribute('data-g')] = cv.getAttribute('data-n'); });
    out._askCounts = counts;
  }
  // FLIP: the heading starts where the typed text sits in the box and settles into place
  function morphHeading(el, strong) {
    var input = document.getElementById('ask-q');
    if (!input || reduced()) { anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, key: 'morph' }); return; }
    var a = input.getBoundingClientRect(), b = el.getBoundingClientRect();
    if (!a.width || !b.width) return;
    var cs = getComputedStyle(input), pad = parseFloat(cs.paddingLeft) || 0;
    var fsIn = parseFloat(cs.fontSize) || 16, fsH = parseFloat(getComputedStyle(el).fontSize) || 24;
    var s = Math.max(0.4, Math.min(1, fsIn / fsH));
    var dx = (a.left + pad) - b.left, dy = (a.top + a.height / 2) - (b.top + b.height * s / 2);
    // far away (scrolled): a short rise instead of a long flight
    if (Math.abs(dy) > 420) { dy = 24; dx = 0; s = 1; }
    anim(el, [{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', opacity: strong ? 0.35 : 0 },
      { transform: 'none', opacity: 1 }], { spring: strong ? 'rise' : 'smooth', key: 'morph' });
  }

  function say(res, q) {
    clearTimeout(mem.srTimer);
    var live = document.getElementById('ask-live');
    if (!live) return;
    var msg = !res ? '' : (res.crisis ? t('ask.statusCrisis') + ' ' : '') +
      (res.hits.length ? t('ask.status', { q: q, n: res.hits.length }) : t('ask.statusNone', { q: q }));
    // crisis is said at once; the rest when typing has paused (no chatter on every key)
    mem.srTimer = setTimeout(function () { if (live.isConnected) live.textContent = msg; }, res && res.crisis ? 50 : 700);
  }
  function writeUrl(res, q) {
    clearTimeout(mem.urlTimer);
    // crisis words never go into the address (history, screenshots, a shared link)
    var h = res && !res.crisis ? hashFor(q) : '#/ask';
    mem.urlTimer = setTimeout(function () { if (onAsk() && SM.replaceHash) SM.replaceHash(h); }, 400);
  }

  /* ------------------------------------------------------------------ acts */
  SM.on('ask-try', function (el) {
    var input = document.getElementById('ask-q');
    if (!input) return;
    input.value = el.getAttribute('data-q') || '';
    mem.q = input.value;
    syncClear();
    paint({ morph: true });
    try { input.focus({ preventScroll: true }); } catch (e) { }
    if (touch()) try { input.blur(); } catch (e) { }
  });
  SM.on('ask-more', function (el) {
    var g = el.getAttribute('data-g'), rest = document.getElementById('ask-rest-' + g);
    if (!rest) return;
    var open = rest.hidden;
    rest.hidden = !open;
    mem.open[g] = open;
    el.setAttribute('aria-expanded', open ? 'true' : 'false');
    var n = rest.querySelectorAll('[data-key]').length;
    el.innerHTML = '<span>' + esc(open ? t('ask.less') : t('ask.more', { n: n })) + '</span>' + SM.ui.arrow(open ? 'up' : 'down');
    if (open) {
      Array.prototype.forEach.call(rest.querySelectorAll('[data-key]'), function (r, k) {
        anim(r, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', delay: Math.min(k, 8) * 30, key: 'in' });
      });
    }
  });
  SM.on('ask-jump', function (el) {
    var h = document.getElementById('ask-g-' + el.getAttribute('data-g'));
    if (!h) return;
    try { h.setAttribute('tabindex', '-1'); h.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); h.focus({ preventScroll: true }); } catch (e) { }
  });

  function touch() { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } }
  function syncClear() { var c = document.getElementById('ask-q-clear'); if (c) c.hidden = !mem.q; }

  /* ------------------------------------------------------------------ view */
  function render(args) {
    var fromHash = (args || []).join('/');
    if (fromHash || !mem.q) mem.q = fromHash;
    var q = mem.q;
    // (the index is built by the first query; an empty box leaves it to warm(), in idle slices)
    var res = q.trim() ? run(q.trim()) : null;
    mem.sig = sig(res);
    if (res && mem.openQ !== res.n) { mem.open = {}; mem.openQ = res.n; }
    return '<div class="ask">' +
      // the entrance (navigation): the title line, the promise, the box rising, then the starter words one by one
      '<header class="ask-head">' +
        '<h1 class="ask-h1" data-reveal="line">' + esc(t('ask.h1')) + '</h1>' +
        '<p class="ask-sub" data-reveal="fade" data-reveal-delay="80">' + esc(t('ask.sub')) + '</p>' +
      '</header>' +
      '<div class="ask-box" role="search" data-reveal="up" data-reveal-delay="120">' +
        '<div class="ask-field">' + SM.ui.searchField({ id: 'ask-q', placeholder: t('ask.ph'), label: t('ask.label'), value: q, attrs: 'aria-controls="ask-out" spellcheck="false" autocapitalize="off"' }) +
        '<button type="button" class="search-clear" id="ask-q-clear" aria-label="' + esc(t('ask.clear')) + '"' + (q ? '' : ' hidden') + '>' + ic('close') + '</button></div>' +
      '</div>' +
      '<p class="sr-only" role="status" aria-live="polite" aria-atomic="true" id="ask-live"></p>' +
      '<div class="ask-out' + (res ? '' : ' is-empty') + '" id="ask-out"' + (res ? ' data-reveal="up" data-reveal-delay="180"' : '') + '>' + (res ? resultsHtml(res) : startHtml(true)) + '</div>' +
    '</div>';
  }

  function mount(root) {
    var input = root.querySelector('#ask-q'), clear = root.querySelector('#ask-q-clear'), out = root.querySelector('#ask-out');
    if (!input || !out) return;
    mem.gen++;
    var gen = mem.gen;
    // what is on screen now (rendered with the page): nothing of it cascades again
    mem.shown = {}; mem.groups = {};
    Array.prototype.forEach.call(out.querySelectorAll('.ask-rows > [data-key]'), function (el) { mem.shown[el.getAttribute('data-key')] = 1; });
    Array.prototype.forEach.call(out.querySelectorAll('.ask-group'), function (el) { mem.groups[el.getAttribute('data-g')] = 1; });
    var be = out.querySelector('.ask-best'); mem.best = be ? be.getAttribute('data-key') : null;
    mem.answered = !out.classList.contains('is-empty');
    var counts = {}; Array.prototype.forEach.call(out.querySelectorAll('.ask-count-v'), function (cv) { counts[cv.getAttribute('data-g')] = cv.getAttribute('data-n'); }); out._askCounts = counts;
    // an in-memory query reached by the tab (#/ask): the address follows
    if (mem.q.trim() && SM.route && !(SM.route.args || []).length) writeUrl(run(mem.q.trim()), mem.q.trim());

    function update(o) { mem.q = input.value; syncClear(); paint(o); }
    /* S4 (IME): while a kana→kanji conversion is open the answer follows more slowly; it is redrawn when the
       conversion ends; Enter / Esc then belong to the IME (no search, no blur, no quick-exit count) */
    var composing = false;
    input.addEventListener('compositionstart', function () { composing = true; });
    input.addEventListener('compositionend', function () { composing = false; clearTimeout(mem.timer); mem.timer = setTimeout(update, 60); });
    input.addEventListener('input', function (e) { clearTimeout(mem.timer); mem.timer = setTimeout(update, composing || (e && e.isComposing) ? 360 : 120); });
    input.addEventListener('keydown', function (e) {
      if (composing || e.isComposing || e.keyCode === 229) return;
      // no stopPropagation: clearing also counts as the 1st Esc of the Esc×2 quick exit
      if (e.key === 'Escape' && input.value) { clearTimeout(mem.timer); input.value = ''; update(); }
      else if (e.key === 'Enter') {
        e.preventDefault(); clearTimeout(mem.timer);
        var same = input.value === mem.q && mem.answered;
        mem.q = input.value; syncClear();
        if (same) { var qh = out.querySelector('.ask-qh-t'); if (qh) morphHeading(qh, true); }
        else paint({ morph: true });
        if (touch()) try { input.blur(); } catch (er) { }
      } else if (e.key === 'ArrowDown') {
        var first = navList(out)[0];
        if (first) { e.preventDefault(); first.focus(); }
      }
    });
    if (clear) clear.addEventListener('click', function () { clearTimeout(mem.timer); input.value = ''; update(); input.focus(); });
    // ↑ / ↓ between the results
    out.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (e.target && e.target.closest && e.target.closest('.chips')) return;
      var list = navList(out), i = list.indexOf(document.activeElement);
      if (i === -1) return;
      e.preventDefault();
      if (e.key === 'ArrowUp' && i === 0) { input.focus(); return; }
      var n = list[i + (e.key === 'ArrowDown' ? 1 : -1)];
      if (n) n.focus();
    });

    // the rest of the index (body text, English) is built in idle slices; then the answer is checked again
    if (SM.search && !SM.search.full()) {
      SM.search.warm(function () {
        if (gen !== mem.gen || !onAsk() || !mem.q.trim()) return;
        paint({ silent: true, noUrl: true });
      });
    }
    // a mouse and a keyboard: the box is ready to type in (a phone keeps its keyboard closed until tapped)
    if (!touch() && SM.motion && SM.motion.afterTransition) {
      SM.motion.afterTransition(function () {
        if (gen !== mem.gen || !input.isConnected) return;
        var a = document.activeElement;
        if (!a || a === document.body || a.id === 'view' || /^H1$/.test(a.nodeName)) {
          try { input.focus({ preventScroll: true }); var L2 = input.value.length; input.setSelectionRange(L2, L2); } catch (e) { }
        }
      });
    }
  }
  function navList(out) {
    return Array.prototype.slice.call(out.querySelectorAll('.ask-nav, .ask-rows:not([hidden]) > a.list-item, .ask-rows:not([hidden]) .pcard-link'));
  }

  SM.views.ask = {
    tab: 'ask',
    title: function () { return { ja: 'きく', en: 'Ask' }; },
    render: render,
    mount: mount
  };
})();
