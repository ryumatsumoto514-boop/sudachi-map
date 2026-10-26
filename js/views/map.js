/* 巣立ちマップ v4 — js/views/map.js (MAP)
   SM.views.map: a real vector map of 関東 (MapLibre GL JS 4.7.1, vendored; data baked into data/map/*.js — nothing
   is fetched at runtime) + area picker + filters + a ruled list of places. Tokyo is drawn in full detail; the
   other six prefectures (v7) are lighter and their detail is loaded per prefecture (data/map/kanto/<pref>.js).
   Routes: #/map  ·  #/map/CODE  ·  #/map/CODE/ID  (ID = program id, or "programId~index" for one location).
   CODE: a 5-digit 区市町村 code anywhere in 関東 (政令市 = the city code, e.g. 14100), a 2-digit prefecture code
   (#/map/14 = 神奈川県), or "all" (= 関東ぜんぶ). No geolocation, ever.

   Layout. Phone/tablet (< 1100px): a stage. The header and controls scroll away, the map frame sticks under
   the app bar, and the list is a sheet that slides over the map with the page's own (native) scroll — so it
   is fast on a cheap phone, keyboard / screen-reader friendly, and snaps to three rests: peek (header + map +
   the list's head), half (map + list) and full (list). Desktop (≥ 1100px): map (7 cols, sticky) | list (5).

   Engines. 'gl' = MapLibre; one instance per session: it survives re-renders and tab switches (its element
   is moved into the new frame), so coming back is instant. 'svg' = the v3 flat SVG map, used when WebGL is
   missing or MapLibre fails before it loads. While MapLibre loads, the same SVG (ward outlines only) is the
   paper placeholder, framed like the camera that is coming, and the canvas fades in over it.

   Pins are HTML buttons (keyboard + screen reader reachable): the kanji station mark as a flag, clustered
   per zoom level (hierarchical, so clusters split from / merge into their parent when you zoom).

   Motion (MOTION-SPEC §4 Map; all via SM.motion, all off under SM.motion.reduced()):
   map init only in SM.motion.afterTransition; canvas fades in 240ms after load; area pick = flyTo
   (600–1200ms, curve 1.42) while the tint fades (320ms), then the area's border draws (760ms --ease-draw)
   and the pins drop (stamp spring, 24ms stagger, cap 12); zoom = clusters split / merge on the smooth
   spring; pin tap = easeTo 420ms, the pin grows (snappy) and the others dim, the peek card rises (smooth,
   drag to dismiss with velocity); list → pin = sheet slides down + easeTo + one pulse; pin → list = the
   row scrolls into view and flashes. Reduced: jumpTo, no drops, no draws, ≤120ms fades. */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.views = SM.views || {};

  /* ------------------------------------------------------------------ strings */
  var STR = {
    'map.title': { ja: 'マップ', en: 'Map' },
    'map.h1': { ja: '支援の場所マップ', jr: '相談できる場所マップ', en: 'Where to get support' },
    'map.lead1': { ja: '区市町村を選ぶと、', jr: '住んでいる区市町村を選ぶと、', en: 'Pick your city or ward to see ' },
    'map.leadMark': { ja: '近くの窓口と電話番号', jr: '近くで話せる場所', en: 'places near you' },
    'map.lead2': { ja: 'がわかります。', jr: 'がわかります。', en: ', with phone numbers.' },
    'map.pick': { ja: '区市町村を選ぶ', en: 'Choose a city / ward' },
    'map.change': { ja: '変える', en: 'Change' },
    'map.all': { ja: '関東ぜんぶ', en: 'All of Kanto' },
    'map.allSub': { ja: '地図で関東の全体を見る', en: 'See the whole map' },
    'map.prefs': { ja: '都県', en: 'Prefecture' },
    'map.prefAll': { ja: '{name}ぜんぶ', en: 'All of {name}' },
    'map.prefAllSub': { ja: '{name}の全体を見る', en: 'See all of {name}' },
    'map.prefPlaces': { ja: '{name}の区市町村', en: 'Cities in {name}' },
    'map.yours': { ja: 'あなたの区市町村', en: 'Your area' },
    'map.yoursShort': { ja: 'あなた', en: 'You' },
    'map.backYours': { ja: '{name}にもどる', en: 'Back to {name}' },
    'map.area': { ja: '見ている区市町村', en: 'Showing' },
    'map.selected': { ja: '選んでいます', en: 'Selected' },
    'map.search': { ja: '区市町村の名前（ひらがなでもOK）', en: 'Search (e.g. Nerima)' },
    'map.g.23ku': { ja: '23区', en: '23 wards' },
    'map.g.tama': { ja: '多摩', en: 'Tama' },
    'map.g.islands': { ja: '島しょ', en: 'Islands' },
    'map.groups': { ja: '地域', en: 'Region' },
    'map.noHit': { ja: '見つかりません。ひらがなや、ちがう書き方でためしてね。', en: 'No match. Try another spelling.' },
    'map.catAll': { ja: 'すべて', en: 'All' },
    'map.catJisou': { ja: '児童相談所', en: 'Child guidance centres' },
    'map.filter': { ja: '種類でしぼる', en: 'Filter by type' },
    'map.jrLabel': { ja: '見る場所', en: 'Which places' },
    'map.jrOnly': { ja: '中学生向け', en: 'For junior high' },
    'map.jrAll': { ja: 'すべての場所', en: 'All places' },
    'map.jrNote': { ja: '中学生が相談できる場所だけを出しています。', en: 'Showing only places junior-high students can use.' },
    'map.mapLabel': { ja: '関東の地図。{name}', en: 'Map of Kanto. {name}' },
    'map.canvas': { ja: '関東の地図（矢印キーで動かせます。＋と−で拡大・縮小）', en: 'Map of Kanto (arrow keys move it, + and − zoom)' },
    'map.zoomIn': { ja: '拡大', en: 'Zoom in' },
    'map.zoomOut': { ja: '縮小', en: 'Zoom out' },
    'map.fitShort': { ja: '全体', en: 'All' },
    'map.fit': { ja: '関東の全体を見る', en: 'Show all of Kanto' },
    'map.fitArea': { ja: '{name}を見る', en: 'Show {name}' },
    'map.north': { ja: '北', en: 'N' },
    'map.count': { ja: '{n}か所', en: '{n} places' },
    'map.unit': { ja: 'か所', en: 'places' },
    'map.inArea': { ja: '{name}の中', en: 'In {name}' },
    'map.near': { ja: '近くの区市町村', en: 'Nearby areas' },
    'map.nearSub': { ja: '近い順。{name}に住んでいても使えます', en: 'Closest first. You can use these from {name} too' },
    'map.allList': { ja: '関東の場所', en: 'Places in Kanto' },
    'map.noneInArea': { ja: '{name}の中には、まだ場所がのっていません。近くの場所か、電話・LINEで話せる窓口を見てみてね。', en: 'No places listed in {name} yet. Try the nearby ones, or talk by phone or LINE.' },
    'map.toConsult': { ja: '電話・LINEで話せる窓口', en: 'Talk by phone or LINE' },
    'map.none': { ja: 'この区市町村には、まだ登録がありません', en: 'Nothing listed here yet' },
    'map.noneBody': { ja: '近くの区市町村か、都や県の窓口を見てみよう。', en: 'Try a nearby area, or the prefecture-wide offices.' },
    'map.resetCat': { ja: 'すべて表示', en: 'Show everything' },
    'map.more': { ja: 'もっと見る（あと{n}か所）', en: 'Show {n} more' },
    'map.dist': { ja: '約{d}km', en: '~{d} km' },
    'map.gmaps': { ja: 'Google マップで開く', en: 'Open in Google Maps' },
    'map.detail': { ja: 'この支援のページ', en: 'About this support' },   // FIX-B (F21): it navigates, so it is not 「くわしく」
    'map.howto': { ja: '住所・行き方', en: 'Address & directions' },
    'map.hoursK': { ja: '受付', en: 'Hours' },
    'map.addrK': { ja: '住所', en: 'Address' },
    'map.noteK': { ja: 'メモ', en: 'Note' },
    'map.call': { ja: '電話する', en: 'Call' },
    'map.free': { ja: '無料', en: 'Free' },
    'map.aud.u18': { ja: '{n}歳未満', en: 'Under {n}' },
    'map.aud.upto': { ja: '{n}歳まで', en: 'Up to {n}' },
    'map.aud.o18': { ja: '{n}歳以上', en: '{n}+' },
    'map.aud.notJr': { ja: '中学生は対象外', en: 'Not for junior high' },
    'map.areas': { ja: '区市町村から選ぶ', en: 'Pick a city / ward' },
    'map.areasSub': { ja: 'タップすると、その区市町村の場所が見られます', en: 'Tap one to see its places' },
    'map.picked': { ja: '選んだ場所', en: 'Selected place' },
    'map.showAllCards': { ja: 'ぜんぶの場所を一覧で見る', en: 'List every place' },
    'map.onMap': { ja: '地図で見る', en: 'Show on map' },
    'map.onMapShort': { ja: '地図', en: 'Map' },
    'map.toList': { ja: '一覧で見る', en: 'See in list' },
    'map.close': { ja: '閉じる', en: 'Close' },
    'map.cluster': { ja: 'この場所に{n}か所あります', en: '{n} places here' },
    'map.clusterBtn': { ja: '{n}か所（拡大する）', en: '{n} places (zoom in)' },
    'map.chipArea': { ja: '{name}：{n}か所（選ぶ）', en: '{name}: {n} places (select)' },
    'map.chipRegion': { ja: '{name}：{n}か所（拡大する）', en: '{name}: {n} places (zoom in)' },
    'map.r.ku': { ja: '23区', en: '23 wards' },
    'map.r.n': { ja: '多摩北部', en: 'North Tama' },
    'map.r.s': { ja: '多摩南部', en: 'South Tama' },
    'map.r.w': { ja: '多摩西部', en: 'West Tama' },
    'map.islandsTitle': { ja: '島しょ部は地図にのっていません', en: 'The islands are not on the map' },
    'map.islandsBody': { ja: '{name}は地図の外にあります。下のリストと、電話・LINEで話せる窓口を使ってね。', en: '{name} is outside the map. Use the list below, or talk by phone or LINE.' },
    'map.islandsNote': { ja: '大島・八丈島・小笠原などの島しょ部は、地図にはのせていません。「変える」から選べます。', en: 'Islands (Oshima, Hachijo, Ogasawara…) are not drawn. You can still pick them with "Change".' },
    'map.call1': { ja: '行く前に電話で確かめよう。予約がいる場所もあります。', en: 'Call before you go — some places need a booking.' },
    'map.callShort': { ja: '行く前に電話で確かめよう。', en: 'Call before you go.' },
    'map.about': { ja: 'この地図について', en: 'About this map' },
    'map.more2': { ja: 'くわしく', en: 'Details' },
    'map.privacy': { ja: '現在地は使いません。選んだ区市町村も、このスマホの中だけに残ります。', en: 'We never use your location. Your choice stays on this phone only.' },
    // "|" = where the credit may wrap (never inside 加工, map.css .m-attr)
    'map.attr': { ja: '地理院ベクトルタイル・国土数値情報を|加工して作成', en: 'Processed from GSI Vector Tiles |& MLIT National Land Info' },
    'map.source': { ja: '地図：地理院ベクトルタイル・国土数値情報（行政区域・鉄道・駅別乗降客数・土地利用細分メッシュ）を加工して作成。地図の表示に MapLibre GL JS（BSD-3-Clause）を使っています。', en: 'Map: processed from GSI Vector Tiles and MLIT National Land Numerical Information (administrative areas, railways, station ridership, land use). Drawn with MapLibre GL JS (BSD-3-Clause).' },
    'map.attrSimple': { ja: '国土数値情報（行政区域データ）を|加工して作成', en: 'MLIT National Land |Numerical Information' },
    'map.sourceSimple': { ja: '地図：国土数値情報（行政区域データ）国土交通省 をもとに巣立ちマップが作成', en: 'Map: based on National Land Numerical Information (Administrative Areas), MLIT' },
    'map.addrCheck': { ja: '住所や時間は、各団体の公式ページで確認しています（{date}）。', en: 'Addresses and hours checked on official pages ({date}).' },
    'map.program': { ja: '使える支援', en: 'Support' },
    'map.peekLabel': { ja: '選んだ場所', en: 'Selected place' },
    'map.loading': { ja: '地図を準備しています', en: 'Preparing the map' },
    'map.simple': { ja: 'かんたんな地図で表示しています', en: 'Showing a simple map' },
    'map.skip': { ja: '地図をとばして一覧へ', en: 'Skip the map, go to the list' },
    'map.sheetOpen': { ja: '一覧を広げる', en: 'Expand the list' },
    'map.sheetClose': { ja: '地図を広げる', en: 'Show the map' },
    'map.toMap': { ja: '地図を見る', en: 'Show map' },
    'map.hint': { ja: '地図の区市町村をタップしても選べます。', en: 'You can also tap the map.' },
    'map.askGo': { ja: '{name}を見る', en: 'Show {name}' },
    // FIX-B (v6)
    'map.badArea': { ja: 'その区市町村は見つかりませんでした。関東ぜんぶを表示しています。', en: 'That area was not found. Showing all of Kanto.' },
    'map.badPlace': { ja: 'その場所は見つかりませんでした。一覧から選んでください。', en: 'That place was not found. Pick one from the list.' },
    'map.progPage': { ja: 'この支援のページ', en: 'About this support' },
    'map.areasShort': { ja: '区市町村', en: 'Areas' }
  };
  if (SM.strings) SM.strings(STR);

  /* ------------------------------------------------------------------ helpers */
  var noop = function () { };
  function t(k, v) {
    var s = SM.t ? SM.t(k, v) : null;
    if (!s || s === k) { var e = STR[k]; s = e ? (lang() === 'en' ? e.en : e.ja) : k; if (v) s = s.replace(/\{(\w+)\}/g, function (m, n) { return v[n] != null ? v[n] : m; }); }
    return s;
  }
  function lang() { try { return SM.lang ? SM.lang() : 'ja'; } catch (e) { return 'ja'; } }
  function esc(s) { return SM.esc ? SM.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function L(o) { if (o == null) return ''; if (SM.L) return SM.L(o); return typeof o === 'string' ? o : (o[lang()] || o.ja || ''); }
  function icon(n, c) { return SM.icon ? SM.icon(n, c) : ''; }
  function ui() { return SM.ui || {}; }
  function arrow(dir) { return SM.ui && SM.ui.arrow ? SM.ui.arrow(dir) : '<span class="arrow" aria-hidden="true">→</span>'; }
  function areas() { return (SM.data && SM.data.areas) || []; }
  function geo() { return (SM.data && SM.data.geo) || null; }
  function areaBy(code) {
    if (!code) return null;
    if (SM.area) { try { var a = SM.area(code); if (a) return a; } catch (e) { } }
    var list = areas(); for (var i = 0; i < list.length; i++) if (list[i].code === code) return list[i];
    return null;
  }
  function areaName(a) { return a ? (lang() === 'en' ? (a.en || a.name) : a.name) : ''; }
  /* v7: 関東. A code is a 区市町村 (5 digits) or a prefecture (2 digits: 08 茨城 … 14 神奈川) */
  var PREF_ORDER = ['13', '14', '11', '12', '08', '09', '10'];   // the order people list them in (東京 first)
  function prefList() { return (SM.data && SM.data.prefs) || []; }
  function prefBy(code) { var l = prefList(); for (var i = 0; i < l.length; i++) if (l[i] && l[i].code === code) return l[i]; return null; }
  function prefName(pc) { var p = prefBy(pc); return p ? (lang() === 'en' ? (p.en || p.name) : p.name) : ''; }
  function isPrefCode(c) { return typeof c === 'string' && /^\d\d$/.test(c) && !!prefBy(c); }
  function isCity(c) { return typeof c === 'string' && /^\d{5}$/.test(c) && !!areaBy(c) && !!prefBy(c.slice(0, 2)); }
  function isCode(c) { return isCity(c) || isPrefCode(c); }
  function prefOfCode(c) { return typeof c === 'string' && /^\d{2}(\d{3})?$/.test(c) ? c.slice(0, 2) : null; }
  /* the name of what a code shows: 練馬区 / 横浜市 / 神奈川県 ('' when unknown) */
  function placeName(code) { return isPrefCode(code) ? prefName(code) : areaName(areaBy(code)); }
  /* the person's prefecture first, then 東京 · 神奈川 · 埼玉 · 千葉 · 茨城 · 栃木 · 群馬 */
  function prefOrder() {
    var m = prefOfCode(mineCode()), out = m ? [m] : [];
    PREF_ORDER.forEach(function (c) { if (out.indexOf(c) < 0 && prefBy(c)) out.push(c); });
    return out;
  }
  function isIsland(code) { var a = areaBy(code); return !!(a && a.group === 'islands'); }
  /* one switch for reduced motion (MOTION-SPEC §7): the OS setting OR 設定 › 動きを少なく */
  function reduced() {
    if (SM.motion && SM.motion.reduced) { try { return !!SM.motion.reduced(); } catch (e) { } }
    return document.documentElement.classList.contains('m-reduce');
  }
  function motion(fn) { return !!(SM.motion && typeof SM.motion[fn] === 'function'); }
  function anim(el, kf, o) { return el && motion('animate') ? SM.motion.animate(el, kf, o) : null; }
  function after(fn) { if (motion('afterTransition')) SM.motion.afterTransition(fn); else setTimeout(fn, 0); }
  function motionMount(el) { if (el && motion('mount')) { try { SM.motion.mount(el); } catch (e) { } } }
  function keepFocus(scope, fn) { return scope && motion('keepFocus') ? SM.motion.keepFocus(scope, fn) : fn(); }
  function focusLost() { var a = document.activeElement; return !a || a === document.body || a.isConnected === false; }
  function focusTo(el, scroll) {
    if (!el) return;
    if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName)) el.setAttribute('tabindex', '-1');
    try { el.focus({ preventScroll: !scroll }); } catch (e) { }
  }
  var now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };
  var raf = window.requestAnimationFrame ? function (f) { return requestAnimationFrame(f); } : function (f) { return setTimeout(f, 16); };
  var caf = window.cancelAnimationFrame ? function (i) { cancelAnimationFrame(i); } : function (i) { clearTimeout(i); };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  /* cubic-bezier as a JS easing (MapLibre camera easing, the border draw) */
  function bezier(p1x, p1y, p2x, p2y) {
    var cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
    var cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
    function sx(u) { return ((ax * u + bx) * u + cx) * u; }
    function sy(u) { return ((ay * u + by) * u + cy) * u; }
    function dx(u) { return (3 * ax * u + 2 * bx) * u + cx; }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      var u = x, i, e, d;
      for (i = 0; i < 8; i++) { e = sx(u) - x; if (Math.abs(e) < 1e-5) return sy(u); d = dx(u); if (Math.abs(d) < 1e-6) break; u -= e / d; }
      var lo = 0, hi = 1; u = x;
      for (i = 0; i < 30; i++) { e = sx(u); if (Math.abs(e - x) < 1e-5) break; if (x > e) lo = u; else hi = u; u = (lo + hi) / 2; }
      return sy(u);
    };
  }
  var EASE_STD = bezier(0.2, 0, 0, 1), EASE_DRAW = bezier(0.5, 0, 0.15, 1);

  /* a short spoken summary after the list changes (the list itself is not a live region) */
  var statusT = null;
  function announce() {
    clearTimeout(statusT);
    statusT = setTimeout(function () {
      var st = S.root && S.root.querySelector('#m-status'); if (!st) return;
      var n = S.root.querySelector('#m-list .m-count [data-n]'), en = lang() === 'en';
      st.textContent = (S.code ? placeName(S.code) : t('map.all')) + (en ? ': ' : '：') +
        (n ? n.getAttribute('data-n') + (en ? ' ' : '') + t('map.unit') : t('map.none'));
    }, 300);
  }
  function ruby(el) { if (el && SM.applyRuby) { try { SM.applyRuby(el); } catch (e) { } } }
  function catOf(p) { return (p && p.cat && p.cat[0]) || 'procedures'; }
  function cssEsc(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'); }
  function digits(n) { return String(n == null ? '' : n).replace(/[^\d+#*]/g, ''); }
  function telHref(n) { return 'tel:' + digits(n).replace(/#/g, '%23'); }
  function isFree(n) { return /^(0120|0800)/.test(digits(n)); }
  function mineCode() { var m = SM.state && SM.state.answers && SM.state.answers.area; return isCode(m) ? m : null; }
  function isJunior() { try { return SM.isJunior ? !!SM.isJunior() : false; } catch (e) { return false; } }
  // 児童相談所 (one record, ~22 offices) would swamp 相談・こころ: it gets its own chip, listed last,
  // and is left out of すべて so the default map shows places you can walk into.
  var SUB = { 'tokyo-jisou': 'jisou' };
  function fcat(r) { return r.sub || r.cat; }
  function catLabel(k) { if (k === 'jisou') return t('map.catJisou'); var c = SM.CATS && SM.CATS[k]; return c ? (lang() === 'en' ? c.en : c.ja) : k; }
  function catMark(k) { var c = SM.CATS && SM.CATS[k]; return c && c.mark ? c.mark : '・'; }
  function catOrder() { return SM.CAT_ORDER || ['housing', 'money', 'education', 'work', 'procedures', 'consult']; }
  function store(k, v) { if (!SM.store) return v; try { if (arguments.length > 1) { SM.store.set(k, v); return v; } return SM.store.get(k, null); } catch (e) { return null; } }
  function km(lat1, lng1, lat2, lng2) {
    var R = 6371, toR = Math.PI / 180, dLat = (lat2 - lat1) * toR, dLng = (lng2 - lng1) * toR;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function gmaps(loc) { return 'https://www.google.com/maps/search/?api=1&query=' + loc.lat + ',' + loc.lng; }
  function kanaNorm(s) { // katakana -> hiragana, lower, no spaces
    return String(s || '').toLowerCase().replace(/[\u30a1-\u30f6]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); }).replace(/[\s\u2060]+/g, '');
  }
  // map and list side by side (matches the 1100px breakpoint in map.css); no layout read
  var wideMq = null;
  try { wideMq = window.matchMedia('(min-width: 1100px)'); } catch (e) { wideMq = null; }
  function wide() { return wideMq ? wideMq.matches : window.innerWidth >= 1100; }
  function stage() { return !wide(); }
  function theme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

  /* 中学生 can use this record? Same rule as match.js (SPEC-v3 §3): hidden when for.age.min > 15, or when
     stages do not include jhs12/jhs3 — unless stages is [] and the record is open to under-15s. */
  function jrOk(p) {
    var f = (p && p.for) || {}, st = f.stages || [], ag = f.age || null;
    var aMin = ag && ag.min != null ? ag.min : null;
    if (aMin != null && aMin > 15) return false;
    if (st.indexOf('jhs12') !== -1 || st.indexOf('jhs3') !== -1) return true;
    if (st.length) return false;
    return aMin == null || aMin <= 14;
  }
  // short "who is it for" text for a row (only when the age limit matters)
  function audOf(r) {
    if (isJunior() && !r.jr) return { text: t('map.aud.notJr'), off: true };
    var ag = r.p.for && r.p.for.age;
    if (ag && ag.max != null && ag.max <= 19) return { text: ag.max < 18 ? t('map.aud.u18', { n: ag.max + 1 }) : t('map.aud.upto', { n: ag.max }) };
    if (ag && ag.min != null && ag.min >= 18) return { text: t('map.aud.o18', { n: ag.min }) };
    return null;
  }

  /* ------------------------------------------------------------------ module state */
  var S = {
    code: null,      // selected area code or null (= all Tokyo)
    cat: null,       // category filter or null
    jr: null,        // 中学生向け switch: null/true = on (when junior), false = off
    focus: null,     // focused location key
    showAll: false,
    engine: null,    // 'gl' | 'svg' | null (not decided yet)
    root: null, frame: null,
    off: null,       // unbind for the current mount
    gen: 0           // mount generation (stale async work checks it)
  };
  var savedCat = store('mapCat');
  if (savedCat && ((SM.CATS && SM.CATS[savedCat]) || savedCat === 'jisou')) S.cat = savedCat;
  if (store('mapJr') === false) S.jr = false;
  function jrOn() { return isJunior() && S.jr !== false; }
  function passJr(r) { return !jrOn() || r.jr; }
  // 中学生: 児童相談所 counts as an ordinary place in すべて (it is where a 中学生 can go for help)
  function inAll(r) { return !r.sub || isJunior(); }
  function catMatch(r) { return (S.cat ? fcat(r) === S.cat : inAll(r)) && passJr(r); }

  /* ------------------------------------------------------------------ data */
  /* can someone living in `code` (a 区市町村 or a prefecture) use this record? SPEC-v7: [] = anywhere, ['14'] = in
     神奈川県, ['14100'] = 横浜市 only; another prefecture's own records are out (match.js usableIn) */
  function eligible(p, code) {
    if (!code) return true;
    var U = SM.matchUtil;
    if (U && U.usableIn) { try { return U.usableIn(p, code) !== false; } catch (e) { } }
    var ar = ((p.for && p.for.areas) || []).map(String);
    if (!ar.length && p.basis === 'tokyo') ar = ['13'];
    var pc = prefOfCode(code), rp = p.pref || (p.basis === 'tokyo' || p.basis === 'local' ? '13' : null);
    if (rp && (p.basis === 'tokyo' || p.basis === 'pref' || p.basis === 'local') && rp !== pc) return false;
    if (!ar.length) return true;
    return ar.indexOf(pc) >= 0 || ar.indexOf(code) >= 0 || (code.length === 2 && ar.some(function (c) { return c.slice(0, 2) === pc; }));
  }
  /* on the map: 関東 (the Tokyo islands lie south of it and are not drawn) */
  var ONMAP = [138.35, 34.85, 140.95, 37.2];
  function onMap(lat, lng) { return lng >= ONMAP[0] && lng <= ONMAP[2] && lat >= ONMAP[1] && lat <= ONMAP[3]; }
  var LOCS = null, LOCS_N = -1;
  function allLocations() {
    var progs = (SM.data && SM.data.programs) || [], g = geo();
    if (LOCS && LOCS_N === progs.length) return LOCS;
    var out = [];
    progs.forEach(function (p) {
      if (!p) return;
      var jr = jrOk(p);
      (p.locations || []).forEach(function (loc, i) {
        if (!loc) return;
        var ll = typeof loc.lat === 'number' && typeof loc.lng === 'number' && isFinite(loc.lat) && isFinite(loc.lng);
        var r = { key: p.id + '~' + i, p: p, loc: loc, cat: catOf(p), sub: SUB[p.id] || null, hasLL: ll, hasGeo: !!(ll && onMap(loc.lat, loc.lng)), jr: jr };
        if (r.hasGeo && g && g.project) { var xy = g.project(loc.lat, loc.lng); r.x = xy[0]; r.y = xy[1]; }
        out.push(r);
      });
    });
    LOCS = out; LOCS_N = progs.length;
    return out;
  }
  function inScope(code) { return allLocations().filter(function (r) { return eligible(r.p, code); }); }
  function byKey(key) { var l = allLocations(); for (var i = 0; i < l.length; i++) if (l[i].key === key) return l[i]; return null; }
  function pinRecords() { return inScope(S.code).filter(function (r) { return r.hasGeo && catMatch(r); }); }
  function centerOf(code) {
    var g = geo();
    var l0 = g && ((g.labels && g.labels[code]) || (g.prefLabels && g.prefLabels[code]));
    if (l0 && g.unproject) { var l = l0; return g.unproject(l[0], l[1]); }
    var a = areaBy(code);
    return a && a.lat ? { lat: a.lat, lng: a.lng } : null;
  }
  function findFocusKey(id, list) {
    if (!id) return null;
    for (var i = 0; i < list.length; i++) if (list[i].key === id) return id;
    var cands = list.filter(function (r) { return r.p.id === id; });
    if (!cands.length) return null;
    var inA = cands.filter(function (r) { return r.loc.area === S.code; });
    return (inA[0] || cands[0]).key;
  }
  // make a focused place visible even if a filter would hide it
  function unhide(r) {
    if (!r) return;
    if (!passJr(r)) S.jr = false;
    if (!catMatch(r)) S.cat = r.sub || null;
  }

  /* ------------------------------------------------------------------ route (read the live hash so SM.render() after replaceState stays right) */
  function routeArgs(args) {
    var h = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    var parts = h.split('/').filter(Boolean).map(function (s) { try { return decodeURIComponent(s); } catch (e) { return s; } });
    if (parts[0] === 'map') return parts.slice(1);
    return args || [];
  }
  function setHash() {
    // only while the map is the page: a late callback (flight end, peek close) must never rewrite the URL of
    // the page the reader has already moved on to (INTEGRATOR)
    if (!/^#\/map(\/|$|\?)/.test(location.hash || '') || !S.root || !S.root.isConnected) return;
    // FIX-B (F17): 東京都ぜんぶ is written as /all whenever a bare #/map would open the reader's own area instead,
    // so the address always reopens what is on screen (a bad #/map/99999 is normalised the same way)
    var h = '#/map' + (S.code ? '/' + S.code : (S.focus || mineCode() ? '/all' : '')) + (S.focus ? '/' + encodeURIComponent(S.focus) : '');
    if (location.hash === h) return;
    // FIX-B (S16): the router's own quiet URL update when there is one (keeps its back stack in step)
    if (typeof SM.replaceHash === 'function') { try { if (SM.replaceHash(h)) return; } catch (e) { } }
    try { history.replaceState(history.state, '', h); } catch (e) { /* file:// may refuse; ignore */ }
    // the router skips a hashchange to the hash it last routed: keep it in step with the replaced URL, or a link
    // back to the first area (#/map/13104 after the map moved on to 13120) would be ignored
    if (location.hash === h && SM.route && typeof SM.route.hash === 'string' && /^#\/map/.test(SM.route.hash)) SM.route.hash = h;
  }

  /* ================================================================== render */
  function render(args) {
    var a = routeArgs(args);
    S.bad = null;
    var code = a[0];
    if (code === 'all') code = null;
    else if (!isCode(code)) {
      // FIX-B (F17): an unknown code (#/map/99999) shows all of Kanto and says so; mount() fixes the address
      S.bad = a[0] ? 'area' : null;
      code = null;
      if (!a[0]) code = mineCode();
    }
    if (code !== S.code) S.showAll = false;
    S.code = code;
    // engine: decided once (the probe usually ran in idle time already), so the first frame is the right one
    if (S.engine == null) S.engine = hasWebGL() ? 'gl' : 'svg';
    S.focus = a[1] ? findFocusKey(a[1], inScope(code)) : null;
    if (a[1] && !S.focus && !S.bad) S.bad = 'place';
    if (S.focus) unhide(byKey(S.focus));
    var U = ui();
    // phone: a compact title + one-line lead, the picker, then the map; the list sheet opens with its count row
    // (「01 新宿区の中 8か所」 is what its peek shows). Desktop: the grid puts them in the right column (map.css)
    var mhead = '<header class="m-head">' +
        '<h1 class="m-title" data-reveal="line">' + esc(t('map.h1')) + '</h1>' +
      '</header>';
    void U;
    return '' +
      '<div class="m-layout">' +
        '<div class="m-side">' +
          mhead +
          '<div class="m-controls" id="m-controls">' + controlsHtml() + '</div>' +
          '<a class="m-skip" href="#m-list" data-act="map-skip">' + esc(t('map.skip')) + '</a>' +
          mapShellHtml() +
        '</div>' +
        '<div class="m-panel" id="m-panel">' +
          '<button type="button" class="m-handle" data-act="map-sheet" aria-controls="m-list" aria-label="' + esc(t('map.sheetOpen')) + '"><i aria-hidden="true"></i></button>' +
          '<div id="m-list" class="m-list" tabindex="-1">' + listHtml(false, true) + '</div>' +
          '<p class="sr-only" role="status" id="m-status"></p>' +
          footHtml() +
        '</div>' +
      '</div>' +
      '<button type="button" class="m-tomap" data-act="map-tomap" hidden>' + icon('map') + '<span>' + esc(t('map.toMap')) + '</span></button>';
  }

  function controlsHtml() {
    var U = ui();
    var mine = mineCode(), mineName = mine ? placeName(mine) : '';
    var isMine = !!mine && S.code === mine;
    var scope = inScope(S.code).filter(passJr);
    /* v7: one count everywhere — the places INSIDE the chosen area (the list head 「横浜市の中 26か所」 and the
       関東 index row say the same number); a topic with places only nearby keeps its chip, at 0 */
    var isPfC = isPrefCode(S.code);
    var inside = function (r) { return !S.code || (isPfC ? prefOfCode(r.loc.area) === S.code : r.loc.area === S.code); };
    var counts = {}, seen = {};
    scope.forEach(function (r) { var k = fcat(r); seen[k] = 1; if (inside(r)) counts[k] = (counts[k] || 0) + 1; });

    var picker = '<button type="button" class="m-picker" data-act="map-pick" aria-haspopup="dialog" data-press>' +
      '<span class="m-picker-k">' + esc(isMine ? t('map.yours') : t('map.area')) + '</span>' +
      '<span class="m-picker-v">' + esc(S.code ? placeName(S.code) : t('map.all')) + '</span>' +
      '<span class="m-picker-go"><span>' + esc(t('map.change')) + '</span>' + icon('chevron-down') + '</span></button>';

    var back = '';
    if (mineName && !isMine) back = '<button type="button" class="m-back-mine" data-act="map-area" data-code="' + esc(mine) + '">' + arrow('l') + '<span>' + esc(t('map.backYours', { name: mineName })) + '</span></button>';

    var jr = '';
    if (isJunior() && U.seg) {
      jr = '<div class="m-jr">' + U.seg([
        { label: t('map.jrOnly'), value: 'jr', pressed: jrOn() },
        { label: t('map.jrAll'), value: 'all', pressed: !jrOn() }
      ], { act: 'map-jr', label: t('map.jrLabel') }) + '</div>';
    }

    var chips = [U.chip ? U.chip(t('map.catAll'), { act: 'map-cat', pressed: !S.cat, attrs: 'data-cat=""', count: scope.filter(function (r) { return inAll(r) && inside(r); }).length }) : ''];
    // 児童相談所 is a kind of 相談 place: a sub-filter right after 相談・こころ, with its 話 mark (every chip in the
    // row reads the same way: mark · name · count)
    /* FIX-B (F23): 児童相談所 is an extra layer, not a part of すべて (すべて leaves it out). It sits after a rule,
       with an outlined 話, and carries no count: 「すべて 19 … 児童相談所 22」 read as a part bigger than the
       whole. Picking it shows its count in the list head like any other filter. */
    var jis = seen.jisou || S.cat === 'jisou' ? U.chip(catLabel('jisou'), { act: 'map-cat', pressed: S.cat === 'jisou', cat: 'consult', attrs: 'data-cat="jisou"' }) : '';
    catOrder().forEach(function (k) {
      if ((!seen[k] || !counts[k]) && S.cat !== k) return;
      chips.push(U.chip(catLabel(k), { act: 'map-cat', pressed: S.cat === k, cat: k, count: counts[k] || 0, attrs: 'data-cat="' + esc(k) + '"' }));
    });
    if (jis) chips.push('<span class="m-cats-sep" aria-hidden="true"></span>' + jis);
    return '<div class="m-area">' + picker + back + '</div>' + jr +
      '<div class="chips-scroll m-cats" role="group" aria-label="' + esc(t('map.filter')) + '">' + chips.join('') + '</div>';
  }

  /* the simple map (no WebGL): the bay and the big rivers from the overview water (base.js), projected into the
     SVG's units once: rings away from mainland Tokyo and under 2 units² dropped, thinned (Douglas-Peucker,
     0.3 units ≈ 25 m), written as relative moves (≈ 0.25 MB of path) */
  var SVG_WATER = null, SVG_WK = false;
  function svgWater(g) {
    if (SVG_WATER != null && SVG_WK === !!(SM.data.mapKanto)) return SVG_WATER;
    SVG_WK = !!(SM.data.mapKanto);
    var W0 = SM.data.mapLayers && SM.data.mapLayers.waterLo, K = SM.data.mapKanto;
    if (!W0 || !g || !g.project) return '';
    // v7: base.js has the water around Tokyo only; kanto.js adds the sea and lakes of the rest of 関東
    var W = { features: W0.features.concat(K && K.waterLo ? K.waterLo.features : []) };
    var out = [], TOL = 0.3, vb = g.vb || [0, 0, 1000, 520], M = 20;
    var thin = function (p) {
      var keep = new Uint8Array(p.length), st = [[0, p.length - 1]];
      keep[0] = keep[p.length - 1] = 1;
      while (st.length) {
        var s = st.pop(), a = s[0], b = s[1], ax = p[a][0], ay = p[a][1], dx = p[b][0] - ax, dy = p[b][1] - ay;
        var L2 = dx * dx + dy * dy, md = 0, mi = -1;
        for (var i = a + 1; i < b; i++) {
          var ex = p[i][0] - ax, ey = p[i][1] - ay, d;
          if (L2 === 0) d = Math.sqrt(ex * ex + ey * ey);
          else d = Math.abs(ex * dy - ey * dx) / Math.sqrt(L2);
          if (d > md) { md = d; mi = i; }
        }
        if (mi > 0 && md > TOL) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
      }
      var r = []; for (var j = 0; j < p.length; j++) if (keep[j]) r.push(p[j]);
      return r;
    };
    W.features.forEach(function (f) {
      var gm = f.geometry; if (!gm) return;
      var polys = gm.type === 'Polygon' ? [gm.coordinates] : gm.type === 'MultiPolygon' ? gm.coordinates : [];
      polys.forEach(function (rings) {
        rings.forEach(function (ring) {
          if (ring.length < 4) return;
          var p = ring.map(function (c) { return g.project(c[1], c[0]); }), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          p.forEach(function (v) { if (v[0] < x0) x0 = v[0]; if (v[0] > x1) x1 = v[0]; if (v[1] < y0) y0 = v[1]; if (v[1] > y1) y1 = v[1]; });
          if (x1 < vb[0] - M || x0 > vb[0] + vb[2] + M || y1 < vb[1] - M || y0 > vb[1] + vb[3] + M) return;
          p = thin(p);
          if (p.length < 4) return;
          var ar = 0; for (var k = 0, n = p.length; k < n; k++) { var q = p[(k + 1) % n]; ar += p[k][0] * q[1] - q[0] * p[k][1]; }
          if (Math.abs(ar) / 2 < 2) return;
          // relative moves on a 0.1 grid (rounded once, so the ring closes exactly)
          var r10 = p.map(function (v) { return [Math.round(v[0] * 10), Math.round(v[1] * 10)]; }), d = 'M' + (r10[0][0] / 10) + ' ' + (r10[0][1] / 10) + 'l';
          for (var m = 1; m < r10.length; m++) d += (m > 1 ? ' ' : '') + ((r10[m][0] - r10[m - 1][0]) / 10) + ' ' + ((r10[m][1] - r10[m - 1][1]) / 10);
          out.push(d + 'z');
        });
      });
    });
    SVG_WATER = out.join('');
    return SVG_WATER;
  }
  /* the water comes after the first paint: from base.js when the map files were warmed (launch.js), otherwise
     base.js is read once in idle time (a local file; not on data saver) */
  var waterLoad = 0;
  function svgWaterFill(root) {
    var wp = root.querySelector('.m-water'); if (!wp || wp.getAttribute('d')) return;
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 300); };
    var put = function () { if (!wp.isConnected) return; loadKanto().then(function () { idle(function () { if (!wp.isConnected) return; var d = svgWater(geo()); if (d) wp.setAttribute('d', d); }); }); };
    if (SM.data.mapLayers && SM.data.mapLayers.waterLo) { idle(put); return; }
    var cn = navigator.connection;
    if (waterLoad || (cn && cn.saveData)) return;
    waterLoad = 1;
    idle(function () {
      var s = document.createElement('script'); s.src = 'data/map/base.js'; s.async = true;
      s.onload = function () { loadKanto().then(function () { idle(function () { var w = S.root && S.root.querySelector('.m-water'); if (w && !w.getAttribute('d')) { var d = svgWater(geo()); if (d) w.setAttribute('d', d); } }); }); };
      s.onerror = function () { waterLoad = 0; };
      document.head.appendChild(s);
    });
  }
  /* the map frame. GL ready: an empty slot the live map moves into. Otherwise: the SVG (placeholder while
     MapLibre loads, or the v3 fallback map) + the loading line. Furniture (zoom, scale, credit) is shared. */
  /* the SVG's box of a code: a 区市町村's, or a prefecture's */
  function boxOf(code) { var g = geo(); return code && g ? ((g.boxes && g.boxes[code]) || (g.prefBoxes && g.prefBoxes[code]) || null) : null; }
  function selPath(code) { var g = geo(); return code && g ? (g.paths[code] || (g.prefs && g.prefs[code]) || '') : ''; }
  function wardPaths(vb, m) {
    var g = geo(), out = '';
    Object.keys(g.paths).forEach(function (c) {
      var bx = vb && g.boxes[c];
      if (bx && (bx[0] > vb[0] + vb[2] + m || bx[0] + bx[2] < vb[0] - m || bx[1] > vb[1] + vb[3] + m || bx[1] + bx[3] < vb[1] - m)) return;
      out += '<path class="m-ward' + (c === S.code ? ' is-sel' : '') + '" data-code="' + c + '" d="' + g.paths[c] + '"/>';
    });
    return out;
  }
  function prefPaths() {
    var g = geo(); if (!g.prefs) return '';
    return Object.keys(g.prefs).map(function (c) { return '<path class="m-pref" d="' + g.prefs[c] + '"/>'; }).join('');
  }
  /* the other prefectures' 区市町村 for the simple map (data/map/geo-kanto.js, ≈ 0.1 MB, once) */
  var geoMoreP = null;
  function geoMore() {
    var g = geo();
    if (!g || !g.more || (SM.data && SM.data.geoKanto)) return Promise.resolve();
    if (geoMoreP) return geoMoreP;
    geoMoreP = new Promise(function (res) {
      var src = g.more; if (SM._vsrc) { try { src = SM._vsrc(src); } catch (e) { } }
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { res(); }; s.onerror = function () { geoMoreP = null; res(); };
      document.head.appendChild(s);
    });
    return geoMoreP;
  }
  /* the wards that came with geo-kanto.js go into a drawn SVG (placeholder or simple map) */
  function svgAddWards(root) {
    var w = root && root.querySelector('.m-svg .m-wards'); if (!w) return;
    var have = {}; Array.prototype.forEach.call(w.querySelectorAll('.m-ward'), function (p) { have[p.getAttribute('data-code')] = 1; });
    var g = geo(), add = '';
    Object.keys(g.paths).forEach(function (c) { if (!have[c]) add += '<path class="m-ward' + (c === S.code ? ' is-sel' : '') + '" data-code="' + c + '" d="' + g.paths[c] + '"/>'; });
    if (add) w.insertAdjacentHTML('beforeend', add);
    var se = root.querySelector('.m-svg .m-sel'); if (se && S.code) se.setAttribute('d', selPath(S.code));
  }
  function mapShellHtml() {
    var a = areaBy(S.code), g = geo();
    var label = esc(t('map.mapLabel', { name: S.code ? placeName(S.code) : t('map.all') }));
    var glReady = GL.state === 'ready' && S.engine === 'gl';
    var svg = '';
    if (!glReady && g) {
      var ph = S.engine !== 'svg';
      // the placeholder only needs the wards around the area it is framed on (less to parse in the update)
      var vb = ph && !willFly() && S.code && !isIsland(S.code) && boxOf(S.code), m = vb ? Math.max(vb[2], vb[3]) * 1.2 : 0;
      var paths = wardPaths(vb, m);
      svg = '<div class="m-svgwrap' + (ph ? ' is-ph' : '') + '">' +
        '<svg class="m-svg" viewBox="' + esc(phViewBox()) + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
          '<g class="m-prefs">' + prefPaths() + '</g>' +
          '<g class="m-wards">' + paths + '</g>' +
          (ph ? '' : '<path class="m-water" d="' + svgWater(g) + '"/>') +
          '<path class="m-mine" d=""/>' +
          '<path class="m-sel" d="' + selPath(S.code) + '"/>' +
        '</svg></div>' +
        '<div class="m-labels" aria-hidden="true"></div>' +
        '<div class="m-pins"></div>';
    }
    var island = !!(a && a.group === 'islands');
    var areaBtn = S.code && !island ? zareaHtml() : '';
    var loading = (!glReady && S.engine !== 'svg') ?
      '<div class="m-load" aria-hidden="true"><i class="m-load-bar"></i><span class="m-load-t">' + esc(t('map.loading')) + '</span></div>' : '';
    return '<section class="m-mapwrap' + (S.engine === 'svg' ? ' is-svg' : '') + '" aria-label="' + label + '">' +
      '<div class="m-map" id="m-map">' +
        svg +
        '<div class="m-gl-slot"></div>' +
        '<div class="m-zoom">' +
          '<button type="button" class="m-zbtn" data-act="map-zoom" data-dir="in" aria-label="' + esc(t('map.zoomIn')) + '" title="' + esc(t('map.zoomIn')) + '">' + icon('plus') + '</button>' +
          '<button type="button" class="m-zbtn" data-act="map-zoom" data-dir="out" aria-label="' + esc(t('map.zoomOut')) + '" title="' + esc(t('map.zoomOut')) + '">' + icon('minus') + '</button>' +
          '<button type="button" class="m-zbtn m-zfit" data-act="map-fit" aria-label="' + esc(t('map.fit')) + '" title="' + esc(t('map.fit')) + '"><span aria-hidden="true">' + esc(t('map.fitShort')) + '</span></button>' +
          areaBtn +
        '</div>' +
        '<div class="m-furn" aria-hidden="true">' +
          '<span class="m-north"><i></i><b>' + esc(t('map.north')) + '</b></span>' +
          '<span class="m-scale"><i class="m-scale-bar"></i><b class="m-scale-t"></b></span>' +
        '</div>' +
        '<div class="m-attr">' + String(S.engine === 'svg' ? t('map.attrSimple') : t('map.attr')).split('|').map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('') + '</div>' +
        (S.engine === 'svg' ? '<div class="m-simple">' + esc(t('map.simple')) + '</div>' : '') +
        loading +
        '<div class="m-peek" id="m-peek" hidden></div>' +
      '</div>' +
      (island ? ui().callout(esc(t('map.islandsBody', { name: areaName(a) })), 'info', { title: t('map.islandsTitle') }) : '') +
      '</section>';
  }
  /* the zoom stack's 4th button: back to the chosen area (or prefecture) */
  function zareaHtml() {
    var lab = t('map.fitArea', { name: placeName(S.code) }), sn = shortCode(S.code);
    return '<button type="button" class="m-zbtn m-zarea" data-act="map-fit-area" aria-label="' + esc(lab) + '" title="' + esc(lab) + '"><span aria-hidden="true"' + (sn.length > 3 ? ' class="is-long"' : '') + '>' + esc(sn) + '</span></button>';
  }
  function shortCode(code) {
    if (!isPrefCode(code)) return shortName(areaBy(code));
    var p = prefBy(code);
    if (lang() === 'en') return (p.en || '').length <= 7 ? p.en : 'Pref.';
    return p.short || p.name.replace(/[都県]$/, '');
  }
  function shortName(a) {
    if (!a) return '';
    // English: a name that does not fit the 44px button says what it is instead (「Shinju.」 read as a typo);
    // the full name is the button's label
    if (lang() === 'en') return (a.en || '').length <= 7 ? a.en : (a.type === 'ku' ? 'Ward' : a.type === 'shi' ? 'City' : a.type === 'mura' ? 'Vill.' : 'Town');
    var n = a.name.replace(/[区市町村]$/, '');
    return n || a.name;
  }
  /* the placeholder is framed like the camera that is coming: the area's box (or all of Tokyo), fitted inside
     the same padding as the GL camera (the svg box is inset by CSS) — xMidYMid meet = fitBounds. */
  /* the first live map of a visit opens on all of Tokyo and flies to the area (SPEC-v5: the map arrives,
     it does not just appear); the placeholder is framed on that overview too, so the fade lines up */
  /* (all of Tokyo is the widest view already: with no area chosen there is nothing to fly to, the pins drop) */
  function flyable() { return !!(S.code && !isIsland(S.code) && !S.focus && !reduced()); }
  function willFly() { return S.engine === 'gl' && !GL.map && !GL.flewIn && flyable(); }
  /* v7: where the opening flight starts — the chosen 区市町村's prefecture (Tokyo: mainland Tokyo, as before), or all
     of 関東 for a prefecture */
  function flyFromVB() {
    var g = geo(), pc = isCity(S.code) ? S.code.slice(0, 2) : null;
    if (pc === '13') return g.tokyoVb || g.vb;
    return (pc && g.prefBoxes && g.prefBoxes[pc]) || g.vb;
  }
  function kb(code) {
    var b = SM.mapStyle && SM.mapStyle.kBounds ? SM.mapStyle.kBounds(code) : null;
    return b || SM.data.mapMeta.bounds;
  }
  function flyFromBounds() {
    var pc = isCity(S.code) ? S.code.slice(0, 2) : null;
    var m = pc === '13' ? SM.data.mapMeta.bounds : kb(pc || 'all');
    return { b: [[m[0], m[1]], [m[2], m[3]]], max: 12 };
  }
  /* the simple map: the first frame is where its flight starts (all of Tokyo first, a little further out later) */
  function svgFrom() {
    var g = geo(); if (S.engine !== 'svg' || !flyable() || !boxOf(S.code)) return null;
    if (!V.flown) return flyFromVB();
    var b = boxOf(S.code), k = 1.6;
    return [b[0] - b[2] * (k - 1) / 2, b[1] - b[3] * (k - 1) / 2, b[2] * k, b[3] * k];
  }
  function phViewBox() {
    var g = geo(); if (!g) return '0 0 100 100';
    var fb = willFly() ? flyFromVB() : svgFrom();
    if (fb) return fb.map(function (v) { return (+v).toFixed(1); }).join(' ');
    var b = (S.code && !isIsland(S.code) && boxOf(S.code)) || g.vb;
    return b.map(function (v) { return (+v).toFixed(1); }).join(' ');
  }

  /* one place = one ruled row: kanji mark | name, who/where, phone (biggest), hours, address & links */
  function telHtml(num, label, sub) {
    var free = isFree(num);
    var k = (label || free) ? '<span class="m-tel-k">' + (label ? '<span>' + esc(label) + '</span>' : '') + (free ? '<span class="m-tel-free">' + esc(t('map.free')) + '</span>' : '') + '</span>' : '';
    return '<a class="m-tel' + (sub ? ' is-sub' : '') + '" href="' + esc(telHref(num)) + '" data-press>' +
      '<span class="m-tel-main">' + k + '<span class="m-tel-n">' + esc(num) + '</span></span>' +
      '<span class="m-tel-go call-go' + (sub ? ' is-quiet' : '') + '">' + icon('phone') + '<span class="m-tel-go-t call-go-t">' + esc(t('map.call')) + '</span></span></a>';
  }
  function rowId(key) { return 'mloc-' + String(key).replace(/[^\w-]/g, '_'); }
  /* FIX-B (F24): a place's display name. Japanese: the office's own name. English: the program's English name
     (plus the area when one program has offices in many areas); the Japanese office name stays as a small
     second line (lang="ja"), since that is what the sign and the phone call use. Japanese is the fallback only
     when there is no English name at all. */
  function locName(r) {
    var p = r.p, loc = r.loc, ja = loc.name || L(p.name);
    if (lang() !== 'en') return { text: ja, ja: false, sub: '' };
    var pen = p.name && typeof p.name === 'object' ? p.name.en : '';
    if (!pen) return { text: ja, ja: true, sub: '' };
    var text = pen, ar = loc.area ? areaBy(loc.area) : null;
    if (ar && (p.locations || []).length > 1) { var an = areaName(ar); if (an && pen.indexOf(an) === -1) text = pen + ' (' + an + ')'; }
    return { text: text, ja: false, sub: loc.name && loc.name !== text ? loc.name : '' };
  }
  /* a long Japanese name gets break chances where the script changes (よこはま若者|サポートステーション, 区役所|生活支援課)
     and before a bracket, so a name wider than its column breaks between words, never inside サポートステー|ション */
  function wbrJa(html) {
    return String(html).replace(/([ぁ-ゟ一-鿿々])(?=[ァ-ヺー])|([ァ-ヺー])(?=[一-鿿々])|(?=[（(])/g, function (m) { return m + '<wbr>'; });
  }
  function rowHtml(r, dist) {
    var p = r.p, loc = r.loc, U = ui();
    var ar = loc.area ? areaBy(loc.area) : null;
    var ln = locName(r), name = ln.text;
    var meta = [];
    // v5: the kanji mark already says the kind; the section says the area. Only facts that change the choice stay:
    // who it is for (age) and how far it is.
    void ar;
    var aud = audOf(r);
    if (aud) meta.push('<span class="m-loc-aud' + (aud.off ? ' is-off' : '') + '">' + esc(aud.text) + '</span>');
    if (dist != null) meta.push('<span class="m-loc-dist">' + esc(t('map.dist', { d: dist < 10 ? dist.toFixed(1) : Math.round(dist) })) + '</span>');
    var prog = name.indexOf(L(p.name)) === -1 ? '<a class="m-loc-prog" href="#/p/' + esc(encodeURIComponent(p.id)) + '"><span class="sr-only">' + esc(t('map.program')) + ': </span><span>' + esc(L(p.name)) + '</span>' + arrow('r') + '</a>' : '';
    var head = '<div class="m-loc-head"><div class="m-loc-titles">' +
      '<h3 class="m-loc-name"' + (ln.ja ? ' lang="ja"' : '') + '>' + (lang() === 'en' && !ln.ja ? esc(name) : wbrJa(esc(name))) + '</h3>' +
      (ln.sub ? '<p class="m-loc-ja" lang="ja">' + esc(ln.sub) + '</p>' : '') +
      (meta.length ? '<p class="m-loc-meta">' + meta.join('') + '</p>' : '') + '</div>' +
      (r.hasGeo ? '<button type="button" class="m-loc-pin" data-act="map-show" data-key="' + esc(r.key) + '" aria-label="' + esc(t('map.onMap') + (lang() === 'en' ? ': ' : '：') + name) + '">' + icon('pin') + '<span class="m-lp-l" aria-hidden="true">' + esc(t('map.onMap')) + '</span><span class="m-lp-s" aria-hidden="true">' + esc(t('map.onMapShort')) + '</span></button>' : '') +
      '</div>';
    var tels = loc.phone ? telHtml(loc.phone, null, false) : '';
    var c = p.contact, subTel = '';
    if (c && c.phone && digits(c.phone) !== digits(loc.phone) && isFree(c.phone)) subTel = telHtml(c.phone, L(c.phoneLabel), true);
    // no phone of its own: the free line is the row's phone button
    if (!tels && subTel) { tels = subTel; subTel = ''; }
    var hours = loc.hours ? '<p class="m-loc-kv"><span class="m-k">' + esc(t('map.hoursK')) + '</span><span>' + esc(L(loc.hours)) + '</span></p>' : '';
    var addr = loc.addr ? '<p class="m-loc-kv"><span class="m-k">' + esc(t('map.addrK')) + '</span><span' + (lang() === 'en' ? ' lang="ja"' : '') + '>' + esc(loc.addr) + '</span></p>' : '';
    var note = loc.note ? '<p class="m-loc-kv"><span class="m-k">' + esc(t('map.noteK')) + '</span><span>' + esc(L(loc.note)) + '</span></p>' : '';
    var acts = '<div class="btn-row m-loc-acts">' +
      (r.hasLL && U.button ? U.button(t('map.gmaps'), { href: gmaps(loc), variant: 'secondary', size: 'sm', external: true }) : '') +
      (U.button ? U.button(t('map.progPage'), { href: '#/p/' + encodeURIComponent(p.id), variant: 'text', size: 'sm', arrow: true }) : '') +
      '</div>';
    var more = '<details class="m-more"' + (S.focus === r.key ? ' open' : '') + '><summary><span>' + esc(t('map.more2')) + '</span></summary>' +
      '<div class="m-more-body">' + subTel + hours + addr + note + prog + acts + '</div></details>';
    return '<article class="m-loc' + (S.focus === r.key ? ' is-focus' : '') + '" id="' + rowId(r.key) + '" data-key="' + esc(r.key) + '" data-id="' + esc(r.key) + '" data-flip-key="' + esc(r.key) + '">' +
      (U.catIcon ? U.catIcon(r.cat, 'sm', { vt: true }) : '') +
      '<div class="m-loc-main">' + head + tels + more + '</div></article>';
  }

  function countHtml(n, roll) {
    return '<span class="m-count"><b class="num" data-n="' + n + '"' + (roll ? ' data-count="' + n + '"' : '') + '>' + n + '</b><span>' + esc(t('map.unit')) + '</span></span>';
  }
  function head(num, title, n, sub, roll) {
    var U = ui();
    if (U.sectionHeader) return U.sectionHeader(title, { num: num, sub: sub, action: n != null ? countHtml(n, roll) : '', reveal: false });
    return '<h2>' + esc(title) + '</h2>';
  }
  function audRank(r) {
    if (isJunior()) return r.jr ? 0 : 1;
    var a = SM.state && SM.state.answers || {};
    var adult = a.age === 'a18' || a.age === 'a20' || a.age === 'a23' || a.stage === 'left0' || a.stage === 'left1';
    var ag = r.p.for && r.p.for.age;
    return adult && ag && ag.max != null && ag.max < 18 ? 1 : 0;
  }

  /* first: the first screen only (the section head and its first row); the rest is filled in
     afterTransition (MOTION-SPEC §6 rule 4 — the rows' text layout is most of this view's update cost) */
  /* part: 'head' = the area's own section only (an area change paints it at tap time), 'rest' = what follows it */
  function listHtml(roll, first, part) {
    var U = ui();
    var a = S.code ? { name: placeName(S.code) } : null, isPf = isPrefCode(S.code);
    var inSel = function (r) { return isPf ? prefOfCode(r.loc.area) === S.code : r.loc.area === S.code; };
    var list = inScope(S.code).filter(catMatch);
    var html = '';
    var note = jrOn() ? '<p class="m-jrnote">' + esc(t('map.jrNote')) + '</p>' : '';
    if (!list.length) {
      return note + (U.empty ? U.empty(t('map.none'), t('map.noneBody'), S.cat ? U.button(t('map.resetCat'), { act: 'map-cat', variant: 'secondary', attrs: 'data-cat=""' }) : '', { illus: 'map-empty' }) : '');
    }
    var catRank = {}; catOrder().forEach(function (k, i) { catRank[k] = i; });
    function byCat(x, y) { return (catRank[x.cat] - catRank[y.cat]) || (audRank(x) - audRank(y)) || String(x.loc.name).localeCompare(String(y.loc.name), 'ja'); }

    if (a) {
      var inA = list.filter(inSel).sort(byCat);
      var c = centerOf(S.code);
      var others = list.filter(function (r) { return !inSel(r); }).map(function (r) {
        return { r: r, d: (c && r.hasLL) ? km(c.lat, c.lng, r.loc.lat, r.loc.lng) : null };
      }).sort(function (x, y) { return (x.d == null ? 1e9 : x.d) - (y.d == null ? 1e9 : y.d); });
      if (part !== 'rest') {
        // the 中学生 note under the count (the sheet's peek shows 「練馬区の中 N か所」 first)
        html += '<section class="m-group" aria-labelledby="m-g1">' + head('01', t('map.inArea', { name: a.name }), inA.length, null, roll).replace('<h2 class="section-title"', '<h2 class="section-title" id="m-g1"') + note;
        if (inA.length) html += '<div class="m-locs">' + (first ? inA.slice(0, 1) : inA).map(function (r) { return rowHtml(r, null); }).join('') + '</div>';
        else html += U.callout(esc(t('map.noneInArea', { name: a.name })) + ' <a href="#/find/cat/consult">' + esc(t('map.toConsult')) + '</a>', 'info');
        html += '</section>';
      }
      if (first || part === 'head') return html;
      if (others.length) {
        var limit = 6, focusIdx = -1;
        others.forEach(function (o, i) { if (o.r.key === S.focus) focusIdx = i; });
        var showN = S.showAll ? others.length : Math.max(limit, focusIdx + 1);
        html += '<section class="m-group" aria-labelledby="m-g2">' + head('02', t('map.near'), others.length, null).replace('<h2 class="section-title"', '<h2 class="section-title" id="m-g2"') +
          '<div class="m-locs">' + others.slice(0, showN).map(function (o) { return rowHtml(o.r, o.d); }).join('') + '</div>' +
          (others.length > showN ? '<div class="m-more-wrap">' + U.button(t('map.more', { n: others.length - showN }), { act: 'map-more', variant: 'secondary', block: true, icon: 'chevron-down' }) + '</div>' : '') +
          '</section>';
      }
    } else if (!S.showAll) {
      // all of 関東: a ruled index of 区市町村 (name + count) per prefecture (Tokyo in its three parts); rows appear
      // once an area is picked
      // a row's number = what opening that area lists under 「〇〇の中」: its places a resident there can use
      var ag = {};
      list.forEach(function (r) { var k = r.loc.area || 'zz'; if (k !== 'zz' && !eligible(r.p, k)) return; (ag[k] = ag[k] || []).push(r); });
      var picked = S.focus ? list.filter(function (r) { return r.key === S.focus; })[0] : null;
      html += note;
      if (picked) html += '<section class="m-group">' + head('', t('map.picked'), null) + '<div class="m-locs">' + rowHtml(picked, null) + '</div></section>';
      // FIX-B (F43): a narrow or big-text sheet head keeps to one line next to its count
      html += '<section class="m-group">' + head('01', t(bigText() || window.innerWidth < 360 ? 'map.areasShort' : 'map.areas'), list.length, null, roll);
      if (first) return html + '</section>';
      var cell = function (x) {
        return '<button type="button" class="m-acell" data-act="map-area" data-code="' + esc(x.code) + '" data-flip-key="a-' + esc(x.code) + '" data-press>' +
          '<span class="m-acell-n">' + esc(areaName(x)) + '</span><span class="m-acell-c num">' + ag[x.code].length + '</span>' + arrow('r') + '</button>';
      };
      prefOrder().forEach(function (pc) {
        var subs = pc === '13' ? ['23ku', 'tama', 'islands'] : [pc], out = '';
        subs.forEach(function (gk) {
          var codes = areas().filter(function (x) { return x.code.slice(0, 2) === pc && (pc !== '13' || x.group === gk) && ag[x.code]; });
          if (!codes.length) return;
          out += (pc === '13' ? '<h4 class="m-asub">' + esc(t('map.g.' + gk)) + '</h4>' : '') + '<div class="m-agrid">' + codes.map(cell).join('') + '</div>';
        });
        if (out) html += '<h3 class="m-agroup">' + esc(prefName(pc)) + '</h3>' + out;
      });
      html += '<div class="m-more-wrap">' + U.button(t('map.showAllCards'), { act: 'map-more', variant: 'secondary', block: true, icon: 'list' }) + '</div></section>';
    } else {
      // all of 関東, every place as a row (opt-in): grouped by 区市町村, prefectures in prefOrder(), codes in order
      var groups = {}, order = [], po = prefOrder();
      list.forEach(function (r) { var k = r.loc.area || 'zz'; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(r); });
      var rank = function (k) { var i = po.indexOf(String(k).slice(0, 2)); return (i < 0 ? 9 : i) + ':' + k; };
      order.sort(function (x, y) { return rank(x) < rank(y) ? -1 : rank(x) > rank(y) ? 1 : 0; });
      html += note + '<section class="m-group">' + head('01', t('map.allList'), list.length);
      if (first) return html + '</section>';
      order.forEach(function (k) {
        var ar = areaBy(k);
        html += '<div class="m-subgroup"><h3 class="m-subhead"><button type="button" class="m-subhead-btn" data-act="map-area" data-code="' + esc(k) + '"' + (ar ? '' : ' disabled') + '>' +
          '<span>' + esc(ar ? areaName(ar) : '—') + '</span><span class="m-subhead-n num">' + groups[k].length + '</span>' + (ar ? arrow('r') : '') + '</button></h3>' +
          '<div class="m-locs">' + groups[k].sort(byCat).map(function (r) { return rowHtml(r, null); }).join('') + '</div></div>';
      });
      html += '</section>';
    }
    return html;
  }
  function footHtml() {
    var date = SM.updated ? (SM.fmtDate ? SM.fmtDate(SM.updated) : SM.updated) : '';
    // one short line stays; the rest (privacy, islands, sources) is behind 「この地図について」
    return '<footer class="m-foot">' +
      '<p class="m-foot-call">' + esc(t('map.callShort')) + '</p>' +
      '<details class="m-more m-about"><summary><span>' + esc(t('map.about')) + '</span></summary><div class="m-more-body">' +
      '<ul class="bullets m-foot-list"><li>' + esc(t('map.call1')) + '</li><li>' + esc(t('map.privacy')) + '</li><li>' + esc(t('map.islandsNote')) + '</li></ul>' +
      '<p class="m-foot-src">' + esc(S.engine === 'svg' ? t('map.sourceSimple') : t('map.source')) + (date ? '<br>' + esc(t('map.addrCheck', { date: date })) : '') + '</p>' +
      '</div></details>' +
      '</footer>';
  }

  /* ================================================================== pins (shared by both engines) */
  /* single place: the kanji mark as a flag (28px square, 2px paper keyline, 6px notch; the notch tip is the
     point). cluster: an ink square with the count and a thin bar of the category mix. Real buttons. */
  function pinInner(m, it) {
    if (it && it.chip) {
      // overview: one paper chip per 区市町村 (or per region when zoomed further out): name + count
      // compact (where chips would overlap): the name without 区/市/町/村 and the count — never a bare number,
      // which read as the black cluster squares one level deeper
      return '<span class="m-pin-in"><span class="m-chip-mark" aria-hidden="true"><span class="m-chip-n">' + esc(chipName(it)) + '</span>' +
        (it.chip === 'area' ? '<span class="m-chip-short">' + esc(chipShort(it)) + '</span>' : '') + '<b class="m-chip-c">' + m.length + '</b></span></span>';
    }
    if (m.length === 1) {
      var r = m[0];
      return '<span class="m-pin-in"><span class="m-pin-mark cat-' + esc(r.cat) + '" aria-hidden="true">' + esc(catMark(r.cat)) + '</span></span>';
    }
    var cats = {}; m.forEach(function (r) { cats[r.cat] = (cats[r.cat] || 0) + 1; });
    var mix = catOrder().filter(function (k) { return cats[k]; }).map(function (k) { return '<i class="cat-' + k + '" style="flex:' + cats[k] + '"></i>'; }).join('');
    return '<span class="m-pin-in"><span class="m-pin-mark" aria-hidden="true"><b>' + m.length + '</b><span class="m-mix">' + mix + '</span></span></span>';
  }
  function pinLabel(m, it) {
    if (it && it.chip) return t(it.chip === 'area' ? 'map.chipArea' : 'map.chipRegion', { name: chipName(it), n: m.length });
    if (m.length > 1) return t('map.clusterBtn', { n: m.length });
    var r = m[0], nm = locName(r).text;
    return nm + (lang() === 'en' ? ' (' + catLabel(fcat(r)) + ')' : '（' + catLabel(fcat(r)) + '）');
  }
  function pinNode(key, m, it) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'm-pin' + (it && it.chip ? ' m-chip' + (it.chip === 'region' ? ' is-region' : '') + (it.code && it.code === S.code ? ' is-cur' : '') :
      (m.length > 1 ? ' m-cluster' + (m.length > 9 ? ' is-big' : '') : ''));
    b.setAttribute('data-act', 'map-pin');
    b.setAttribute('data-key', key);
    b.setAttribute('aria-label', pinLabel(m, it));
    b.innerHTML = pinInner(m, it);
    return b;
  }
  /* the overview chips: 区市町村 at their label point; below that, four regions (23区 and the three parts of 多摩) */
  var TAMA = {
    n: ['13202', '13203', '13204', '13206', '13207', '13208', '13210', '13211', '13213', '13214', '13215', '13219', '13220', '13221', '13222', '13223', '13229'],
    s: ['13201', '13209', '13212', '13224', '13225'],
    w: ['13205', '13218', '13227', '13228', '13303', '13305', '13307', '13308']
  };
  /* the region a 区市町村 belongs to at the region level: Tokyo's four parts, and one per other prefecture ('P:14') */
  function regionOf(code) {
    var a = areaBy(code); if (!a) return null;
    var pc = String(code).slice(0, 2);
    if (pc !== '13') return prefBy(pc) ? 'P:' + pc : null;
    if (a.group === '23ku') return 'ku';
    for (var k in TAMA) if (TAMA[k].indexOf(code) >= 0) return k;
    return a.group === 'tama' ? 'n' : null;
  }
  function regionCodes(k) { return areas().filter(function (a) { return regionOf(a.code) === k; }).map(function (a) { return a.code; }); }
  function chipName(it) {
    if (it.pref) return prefName(it.pref);
    if (it.chip === 'region') return t('map.r.' + it.region);
    return areaName(areaBy(it.code));
  }
  function chipShort(it) {
    var a = areaBy(it.code); if (!a) return '';
    if (lang() === 'en') { var e = a.en || a.name; return e.length <= 6 ? e : e.slice(0, 5) + '.'; }
    return a.name.replace(/[区市町村]$/, '') || a.name;
  }
  var AP = null, APn = -1;
  function areaPts() {
    var f = SM.data && SM.data.mapLayers && SM.data.mapLayers.areaLabels;
    if (!f) return {};
    if (AP && APn === f.features.length) return AP;
    AP = {}; APn = f.features.length;
    f.features.forEach(function (x) { AP[x.properties.code] = x.geometry.coordinates; });
    return AP;
  }
  /* a prefecture chip's point: its name's point on the map (kanto.js), else the middle of its 区市町村 */
  function prefPt(pc, P) {
    var K = SM.data && SM.data.mapKanto, f = K && K.prefLabels && K.prefLabels.features.filter(function (x) { return x.properties.code === pc; })[0];
    if (f) return f.geometry.coordinates;
    var sx = 0, sy = 0, n = 0;
    for (var c in P) if (c.slice(0, 2) === pc) { sx += P[c][0]; sy += P[c][1]; n++; }
    return n ? [sx / n, sy / n] : null;
  }
  function recArea(r) {
    var P = areaPts(), c = r.loc.area;
    if (c && P[c]) return c;
    var best = null, bd = 1e9;
    for (var k in P) { var d = Math.pow(P[k][0] - r.loc.lng, 2) + Math.pow(P[k][1] - r.loc.lat, 2); if (d < bd) { bd = d; best = k; } }
    return best;
  }
  function majorArea(m) {
    var c = {}, best = null, n = 0;
    m.forEach(function (r) { var a = recArea(r); if (!a) return; c[a] = (c[a] || 0) + 1; if (c[a] > n) { n = c[a]; best = a; } });
    return best;
  }
  function buildChips(recs) {
    var P = areaPts(), by = {};
    recs.forEach(function (r) { var c = recArea(r); if (c) (by[c] = by[c] || []).push(r); });
    GL.chips = []; GL.chipBy = {}; GL.regions = []; GL.regionBy = {}; GL.prefChips = []; GL.prefBy = {};
    var rg = {}, pg = {};
    Object.keys(by).forEach(function (c) {
      var p = P[c], it = { key: 'a:' + c, code: c, chip: 'area', lng: p[0], lat: p[1], m: by[c] };
      GL.chips.push(it); GL.chipBy[it.key] = it;
      var k = regionOf(c);
      if (k) { rg[k] = rg[k] || []; Array.prototype.push.apply(rg[k], by[c]); }
      var pc = c.slice(0, 2);
      if (prefBy(pc)) { pg[pc] = pg[pc] || []; Array.prototype.push.apply(pg[pc], by[c]); }
    });
    // one chip per prefecture: the region level keeps it for the six outside Tokyo (the same pin, no swap)
    Object.keys(pg).forEach(function (pc) {
      var pt = prefPt(pc, P); if (!pt) return;
      var it = { key: 'P:' + pc, pref: pc, code: pc, chip: 'region', lng: pt[0], lat: pt[1], m: pg[pc] };
      GL.prefChips.push(it); GL.prefBy[it.key] = it;
      if (pc !== '13') { GL.regions.push(it); GL.regionBy[it.key] = it; }
    });
    Object.keys(rg).forEach(function (k) {
      if (k.charAt(0) === 'P') return;
      // anchored at the mean of all its areas' label points (stable whatever the filter)
      var cs = regionCodes(k).filter(function (c) { return P[c]; }), sx = 0, sy = 0;
      cs.forEach(function (c) { sx += P[c][0]; sy += P[c][1]; });
      var it = { key: 'r:' + k, region: k, chip: 'region', lng: sx / cs.length, lat: sy / cs.length, m: rg[k] };
      GL.regions.push(it); GL.regionBy[it.key] = it;
    });
  }
  /* chip widths for the collision pass and the label proxies (Plex 700 12 name + num 13 count, 8px sides) */
  function chipW(it, compact) {
    var reg = it.chip === 'region', n = String(it.m.length).length * (reg ? 8.6 : 8);
    var nm = compact && !reg ? chipShort(it) : chipName(it), w = 0;
    for (var i = 0; i < nm.length; i++) w += nm.charCodeAt(i) > 0x2e80 ? (reg ? 13.2 : 12.2) : (reg ? 7.8 : 7.2);
    // compact: 6px sides, a 4px gap, no divider (map.css .is-compact)
    if (compact && !reg) return Math.ceil(w + n + 20);
    return Math.ceil(w + n + (reg ? 39 : 27));
  }
  /* pins drop in from above, north to south: 36px of fall on the stamp spring (a small bounce on landing), 45ms
     stagger, cap 12 (the rest land with the 12th). v4's 12px / 24ms read as a flicker on a phone.
     Reduced motion: they fade in (no fall). */
  function dropPins(list, base) {
    if (!list || !list.length) return;
    list.sort(function (a, b) { return a.y - b.y; });
    var red = reduced();
    list.forEach(function (it, i) {
      var inner = it.el && it.el.firstElementChild; if (!inner) return;
      if (red) { anim(inner, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'linear', fill: 'backwards', key: 'pin' }); return; }
      anim(inner, [{ translate: '0 -36px', scale: '0.7', opacity: 0 }, { translate: '0 0', scale: '1', opacity: 1 }],
        { spring: 'stamp', delay: (base || 0) + Math.min(i, 11) * 45, fill: 'backwards', key: 'pin' });
    });
  }

  /* ================================================================== GL engine (MapLibre) */
  var GL = {
    state: 'idle',   // idle | loading | ready | failed
    map: null, el: null, pinsEl: null,
    w: 0, h: 0,      // frame size (from our ResizeObserver; no layout reads per frame)
    theme: null, lang: null, code: undefined,
    idx: null, sig: '', level: -1,
    pins: {},        // key -> {el, it, x, y, off}
    dying: [],
    selKey: null,
    flight: 0, flying: false,
    draw: 0, drawCode: null,
    ro: null, tipT: 0, scaleZ: -1,
    chips: [], chipBy: {}, regions: [], regionBy: {},   // overview chips (areas, regions)
    fk: '', colSig: null, colData: null                 // focus pulled out of its cluster; label collision proxies
  };
  /* levels: ≤ REGION_L the four regions, CHIP_L one chip per 区市町村, above that hierarchical clusters */
  /* v7: ≤ PREF_L one chip per prefecture (all of 関東 on a phone), REGION_L Tokyo's four parts + the other
     prefectures, CHIP_L one per 区市町村 */
  var MINZ = 7, MAXZ = 17, CR = 40, PREF_L = 7, REGION_L = 8, CHIP_L = 9;
  var webgl = null;
  function hasWebGL() {
    if (webgl !== null) return webgl;
    try {
      var c = document.createElement('canvas');
      var gx = window.WebGLRenderingContext ? (c.getContext('webgl2') || c.getContext('webgl')) : null;
      webgl = !!gx;
      // give the probe context back right away (browsers cap live WebGL contexts)
      try { var lc = gx && gx.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext(); } catch (x) { }
    } catch (e) { webgl = false; }
    return webgl;
  }
  // probe WebGL in idle time after start, so the map view's first render does not pay for it
  // (not during the opening: a GL context costs ~50ms of main thread, wait for sm:launched)
  (function () {
    function probe() { (window.requestIdleCallback || function (f) { return setTimeout(f, 1500); })(function () { try { hasWebGL(); } catch (e) { } }); }
    var lx = window.__lx;
    if (lx && lx.mode && !lx.done) document.addEventListener('sm:launched', function once() { document.removeEventListener('sm:launched', once); probe(); });
    else probe();
  })();
  function libReady() { return !!(window.maplibregl && SM.mapStyle && SM.data && SM.data.mapMeta && SM.data.mapLayers); }
  /* v7: 関東's overview (data/map/kanto.js, ≈ 0.26 MB) loads beside MapLibre; without it the map is Tokyo's */
  var kantoP = null;
  function loadKanto() {
    if (SM.data && SM.data.mapKanto) return Promise.resolve();
    if (kantoP) return kantoP;
    kantoP = new Promise(function (res) {
      var src = 'data/map/kanto.js'; if (SM._vsrc) { try { src = SM._vsrc(src); } catch (e) { } }
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { mark('kanto'); res(); };
      s.onerror = function () { kantoP = null; res(); };
      document.head.appendChild(s);
    });
    return kantoP;
  }
  /* MapLibre + the base data, in order, on first use. LAUNCH's SM.loadMapLib already warms this on intent
     (pointerdown on a map link); this is the same loader for when launch.js is not there. */
  var ownLoad = null;
  function loadLib() {
    if (libReady()) return Promise.resolve();
    if (SM.loadMapLib) return SM.loadMapLib().then(function () { });
    if (ownLoad) return ownLoad;
    ownLoad = new Promise(function (res, rej) {
      if (!document.querySelector('link[href="js/vendor/maplibre-gl.css"]')) {
        var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'js/vendor/maplibre-gl.css'; document.head.appendChild(l);
      }
      var srcs = ['js/vendor/maplibre-gl.js', 'data/map/base.js', 'data/map/style.js'], last = null;
      srcs.forEach(function (src) {
        var s = document.createElement('script'); s.src = src; s.async = false;
        s.onerror = function () { ownLoad = null; rej(new Error('map: ' + src)); };
        document.body.appendChild(s); last = s;
      });
      last.onload = function () { if (libReady()) res(); else rej(new Error('map: not ready')); };
    });
    return ownLoad;
  }
  function fontsReady() {
    var f = document.fonts;
    if (!f || !f.load) return Promise.resolve();
    var all = Promise.all([f.load('500 16px "IBM Plex Sans JP"', '新宿区Shinjuku0'), f.load('700 16px "IBM Plex Sans JP"', '練馬区')]).catch(noop);
    return Promise.race([all, new Promise(function (r) { setTimeout(r, 900); })]);
  }

  /* mercator helpers (0..1 world units) */
  function lngX(lng) { return (lng + 180) / 360; }
  function latY(lat) { var s = Math.sin(lat * Math.PI / 180); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); }
  function xLng(x) { return x * 360 - 180; }
  function yLat(y) { return 360 / Math.PI * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) - 90; }

  /* custom layers live INSIDE the style object, so setStyle (theme / language) keeps them through its diff */
  var EMPTY = { type: 'FeatureCollection', features: [] };
  function ringsOf(code) {
    var A = SM.data.mapLayers && SM.data.mapLayers.areas; if (!A || !code) return EMPTY;
    var out = [], F = isPrefCode(code) && SM.mapStyle.prefFeatures ? SM.mapStyle.prefFeatures(code) : A.features;
    F.forEach(function (f) {
      if (!f.properties || f.properties.code !== code) return;
      var polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      polys.forEach(function (poly) {
        var ring = poly[0]; if (!ring || ring.length < 4) return;
        // a prefecture: its islets and piers are left out of the drawn border (smudges under the lift shadow)
        if (F !== A.features) { var x0 = 180, x1 = -180, y0 = 90, y1 = -90; ring.forEach(function (c) { if (c[0] < x0) x0 = c[0]; if (c[0] > x1) x1 = c[0]; if (c[1] < y0) y0 = c[1]; if (c[1] > y1) y1 = c[1]; }); if (x1 - x0 < 0.03 && y1 - y0 < 0.03) return; }
        // start at the northernmost point, so every border draws from the top
        var pts = ring.slice(0, ring.length - 1), top = 0;
        for (var i = 1; i < pts.length; i++) if (pts[i][1] > pts[top][1]) top = i;
        var rot = pts.slice(top).concat(pts.slice(0, top)); rot.push(rot[0]);
        out.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: rot } });
      });
    });
    return { type: 'FeatureCollection', features: out };
  }
  function selColor(th) { var P = SM.mapStyle.palettes[th === 'dark' ? 'dark' : 'light']; return P.selLine; }
  function gradient(p, th) {
    var c = selColor(th);
    return p >= 1 ? ['step', ['line-progress'], c, 2, c] : ['step', ['line-progress'], c, Math.max(0, p), 'rgba(0,0,0,0)'];
  }
  /* undrawn: the chosen area's border starts undrawn (the reveal's pen draws it once, with its final width), so
     the first frames never show it drawn, then gone, then drawing again */
  function bigText() { try { return !!(SM.state && SM.state.settings && SM.state.settings.big); } catch (e) { return false; } }
  function fullStyle(th, lg, undrawn) {
    GL.big = bigText();
    var st = SM.mapStyle.build({ lang: lg, theme: th, big: GL.big, selected: S.code && !isIsland(S.code) ? S.code : null });
    st.sources['m-sel'] = { type: 'geojson', data: ringsOf(GL.drawCode), lineMetrics: true, tolerance: 0.2 };
    GL.selCode = GL.drawCode || null;
    var layer = {
      id: 'm-sel-draw', type: 'line', source: 'm-sel',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': selColor(th), 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 14, 2.5], 'line-gradient': gradient(undrawn ? 0 : 1, th) }
    };
    var at = -1;
    st.layers.forEach(function (l, i) {
      if (l.id === 'area-sel-line') { l.paint['line-opacity'] = 0; at = i + 1; }   // we draw the outline ourselves
    });
    if (at < 0) at = st.layers.length;
    st.layers.splice(at, 0, liftLayer(th), layer);
    /* the HTML pins sit above the canvas, so MapLibre's label placement cannot see them: an invisible symbol per
       pin (the top layer, so it is placed first) makes station and place names step aside instead of hiding
       under a flag. Images are transparent boxes of the pin's size (styleimagemissing, glBind). */
    st.sources['m-pincol'] = { type: 'geojson', data: GL.colData || EMPTY, buffer: 16, tolerance: 0 };
    st.layers.push({
      id: 'm-pincol', type: 'symbol', source: 'm-pincol',
      layout: { 'icon-image': ['get', 'i'], 'icon-anchor': ['case', ['==', ['get', 'c'], 1], 'center', 'bottom'],
        'icon-offset': ['coalesce', ['get', 'o'], ['literal', [0, 0]]],
        'icon-allow-overlap': true, 'icon-ignore-placement': false, 'icon-padding': 2 },
      paint: { 'icon-opacity': 0 }
    });
    return st;
  }

  /* the chosen area lifts off the page: a soft shadow under its border slides down a few px once the pen has
     drawn it (flat paper, one shadow, no glow). GL.lifted survives setStyle (theme / language) */
  function liftO(th) { return th === 'dark' ? 0.7 : 0.34; }
  function liftLayer(th) {
    var on = !!(GL.lifted && GL.drawCode);
    return {
      id: 'm-sel-lift', type: 'line', source: 'm-sel', layout: { 'line-join': 'round' },
      paint: { 'line-color': th === 'dark' ? '#000000' : '#16241d', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 5, 14, 8],
        'line-blur': ['interpolate', ['linear'], ['zoom'], 8, 3, 14, 5], 'line-opacity': on ? liftO(th) : 0,
        'line-translate': on ? [0, 5] : [0, 0], 'line-translate-anchor': 'viewport' }
    };
  }
  function glLift(on, animate) {
    var map = GL.map; if (!map) return;
    GL.lifted = !!on;
    var d = animate && !reduced() ? 560 : 0;
    try {
      map.setPaintProperty('m-sel-lift', 'line-opacity-transition', { duration: on ? d : 0, delay: 0 });
      map.setPaintProperty('m-sel-lift', 'line-translate-transition', { duration: on ? d + 160 : 0, delay: 0 });
      map.setPaintProperty('m-sel-lift', 'line-opacity', on ? liftO(GL.theme) : 0);
      map.setPaintProperty('m-sel-lift', 'line-translate', on && !reduced() ? [0, 5] : (on ? [0, 3] : [0, 0]));
    } catch (e) { }
  }
  function glVisible() { return GL.state === 'ready' && GL.el && GL.el.isConnected; }

  /* camera: the visible part of the frame (phone: the sheet overlaps the frame's foot; the zoom stack sits
     at the top right) */
  var LAP = 16;
  function insets(extraBottom, place) {
    var w = GL.w || 390, narrow = w < 560;
    /* room for the pins' flags above their points (top) and for the zoom stack plus half a cluster (right);
       the loading placeholder (.m-svgwrap.is-ph in map.css) uses the same insets so the two line up */
    return { top: (narrow ? 40 : 52) + (place ? chipsLap() : 0), right: narrow ? 76 : 84, bottom: (narrow ? 24 : 36) + (stage() ? LAP : 0) + (extraBottom || 0), left: narrow ? 24 : 36 };
  }
  /* phone: how far the category chips (riding on the frame's top edge until the page scrolls) reach into the
     frame; a focused place and its flag stay below them (area fits keep the placeholder's insets).
     Read only when the camera is about to move. */
  function chipsLap() {
    if (!stage() || !S.root || !S.frame || !S.frame.isConnected) return 0;
    var c = S.root.querySelector('.m-cats'); if (!c) return 0;
    var lap = c.getBoundingClientRect().bottom - S.frame.getBoundingClientRect().top - 4;
    return Math.max(0, Math.min(56, Math.round(lap)));
  }
  function targetBounds() {
    var meta = SM.data.mapMeta;
    if (S.code && !isIsland(S.code)) {
      var b = SM.mapStyle.areaBounds(S.code);
      if (b) return { b: [[b[0], b[1]], [b[2], b[3]]], max: isPrefCode(S.code) ? 11 : 14 };
    }
    var m = kb('all') || meta.bounds;
    return { b: [[m[0], m[1]], [m[2], m[3]]], max: 12 };
  }
  /* area fits leave the category chips' lap free too (phone, page at its top): a place drawn under 住まい could
     not be tapped (the chip took the tap). The loading placeholder adds the same lap in map.css */
  function cameraFor(tb, extraBottom) {
    var map = GL.map;
    var pad = insets(extraBottom, true);
    if (GL.w && (pad.left + pad.right > GL.w - 80 || pad.top + pad.bottom > GL.h - 80)) pad = { top: 8, right: 8, bottom: 8, left: 8 };
    try { return map.cameraForBounds(tb.b, { padding: pad, maxZoom: tb.max }); } catch (e) { return null; }
  }
  /* move the camera: flyTo with a distance-based duration (600–1200ms, curve 1.42), easeTo for short hops,
     jumpTo under reduced motion. done() runs when this flight (not a later one) has ended. */
  function glMove(center, zoom, o) {
    o = o || {};
    var map = GL.map, id = ++GL.flight;
    // the flight this one replaces never reaches its done: let it settle what it owned first (an area flight
    // hid the pins and cleared the border; without this they stayed hidden when the map's reveal or a tap
    // took the camera mid-flight — INTEGRATOR)
    var prev = GL.flightAbort; GL.flightAbort = o.abort || null;
    if (prev) { try { prev(o); } catch (e) { } }
    var fin = function () { if (id !== GL.flight) return; GL.flightAbort = null; GL.flying = false; if (o.done) o.done(); };
    if (!center) { fin(); return 0; }
    var c0 = map.getCenter(), z0 = map.getZoom();
    zoom = clamp(zoom == null ? z0 : zoom, map.getMinZoom(), map.getMaxZoom());
    var ws = 512 * Math.pow(2, Math.min(z0, zoom));
    var dx = (lngX(center.lng) - lngX(c0.lng)) * ws, dy = (latY(center.lat) - latY(c0.lat)) * ws;
    var px = Math.sqrt(dx * dx + dy * dy), dz = Math.abs(zoom - z0);
    if (reduced() || o.instant || (px < 1 && dz < 0.01)) {
      map.jumpTo({ center: center, zoom: zoom });
      GL.flying = !!o.hidePins;
      setTimeout(fin, 0);
      return 0;
    }
    GL.flying = !!o.hidePins;
    map.once('moveend', fin);
    var dur;
    if (o.ease || (dz < 0.6 && px < (GL.w || 400) * 0.8)) {
      dur = o.duration || clamp(320 + px * 0.25 + dz * 160, 420, 700);
      map.easeTo({ center: center, zoom: zoom, duration: dur, easing: EASE_STD, essential: true });
    } else {
      dur = o.duration || clamp(520 + dz * 120 + px * 0.45, 600, 1200);
      map.flyTo({ center: center, zoom: zoom, duration: dur, curve: 1.42, essential: true });
    }
    return dur;
  }

  /* -------- create (first visit), in afterTransition */
  /* the newest mount owns the start (a visit that left while loading never creates a map into a dead frame) */
  var TM = {};   // load timeline (ms since navigation start), for tests: SM.mapView.timing()
  function mark(k) { if (TM[k] == null) TM[k] = Math.round(now()); }
  function glStart(gen) {
    GL.startTok = gen;
    GL.state = 'loading';
    mark('start');
    Promise.all([loadLib().then(function () { mark('lib'); }), loadKanto()]).then(function () { return fontsReady(); }).then(function () {
      mark('fonts');
      if (GL.startTok !== gen) return;
      if (gen !== S.gen || !S.frame || !S.frame.isConnected) { GL.state = 'idle'; return; }
      glCreate(S.frame);
    }).catch(function (e) {
      if (GL.startTok !== gen) return;
      if (window.console) console.warn('[map] MapLibre unavailable, using the simple map', e && e.message);
      glFail();
    });
  }
  function glCreate(frame) {
    var slot = frame.querySelector('.m-gl-slot'); if (!slot) { GL.state = 'idle'; return; }
    mark('create');
    var el = document.createElement('div');
    el.className = 'm-gl is-loading';
    slot.appendChild(el);
    GL.el = el;
    GL.w = slot.clientWidth || frame.clientWidth || 390; GL.h = slot.clientHeight || frame.clientHeight || 400;
    frameShort(GL.h);
    GL.theme = theme(); GL.lang = lang(); GL.code = S.code;
    GL.drawCode = S.code && !isIsland(S.code) ? S.code : null;
    var map;
    try {
      SM.mapStyle.root = SM.mapStyle.root || '';
      SM.mapStyle.prepare(window.maplibregl);
      SM.mapStyle.setTheme(GL.theme);
      var tb = targetBounds();
      GL.flyIn = willFly();
      if (GL.flyIn) tb = flyFromBounds();
      var opts = {
        container: el, style: fullStyle(GL.theme, GL.lang, !reduced()),
        localIdeographFontFamily: SM.mapStyle.fontFamily, maxBounds: SM.data.mapMeta.maxBounds,
        bounds: tb.b, fitBoundsOptions: { padding: insets(0, true), maxZoom: tb.max },
        trackResize: false, keyboard: true, doubleClickZoom: true, boxZoom: false,
        locale: { 'Map.Title': t('map.canvas') }
      };
      var mo = SM.mapStyle.mapOptions;
      for (var k in mo) if (!(k in opts)) opts[k] = mo[k];
      map = new window.maplibregl.Map(opts);
    } catch (e) {
      if (window.console) console.warn('[map] MapLibre failed to start', e);
      if (el.parentNode) el.parentNode.removeChild(el);
      glFail();
      return;
    }
    GL.map = map;
    try { SM.mapStyle.attach(map, { theme: GL.theme, detailDelay: false, busy: function () { return GL.flying || !!GL.draw || now() < (GL.restUntil || 0); } }); } catch (e) { }
    // a prefecture's detail is in: the chosen 区市町村's border is redrawn from its 25 m polygon
    SM.mapStyle.onKanto = function (pc) {
      var c = GL.drawCode;
      if (!GL.map || !c || c.length !== 5 || c.slice(0, 2) !== pc || GL.draw) return;
      var src = GL.map.getSource('m-sel'); if (src && GL.selCode === c) { try { src.setData(ringsOf(c)); } catch (e) { } }
    };
    var loaded = false;
    map.on('error', function (ev) {
      if (loaded) return;
      if (window.console) console.warn('[map] error before load', ev && ev.error && ev.error.message);
      loaded = true;
      try { map.remove(); } catch (x) { }
      GL.map = null; if (el.parentNode) el.parentNode.removeChild(el); GL.el = null;
      glFail();
    });
    // a map that never loads (a broken GPU driver) must not keep the frame in its loading state forever
    var guard = setTimeout(function () { if (!loaded) { loaded = true; try { map.remove(); } catch (x) { } GL.map = null; if (el.parentNode) el.parentNode.removeChild(el); GL.el = null; glFail(); } }, 20000);
    map.once('load', function () {
      mark('load');
      if (loaded) return;
      loaded = true; clearTimeout(guard);
      GL.state = 'ready';
      glBind(map);
      try { var cv = map.getCanvas(); cv.setAttribute('aria-label', t('map.canvas')); } catch (e) { }
      SM.mapStyle.select(map, GL.drawCode);
      // pins layer lives inside the canvas container, so a pan can start on a pin
      var pl = document.createElement('div');
      pl.className = 'm-glpins';
      map.getCanvasContainer().appendChild(pl);
      GL.pinsEl = pl;
      var reveal = function () {
        if (!GL.el) return;
        mark('reveal');
        GL.el.classList.remove('is-loading');
        var fr = GL.el.closest('.m-map');
        var ph = fr && fr.querySelector('.m-svgwrap'), ld = fr && fr.querySelector('.m-load');
        var a1 = anim(GL.el, [{ opacity: 0 }, { opacity: 1 }], { duration: reduced() ? 120 : 240, easing: 'cubic-bezier(0, 0, 0.2, 1)' });
        var cleanup = function () {
          [ph, fr && fr.querySelector('.m-labels'), fr && fr.querySelector('.m-pins')].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
        };
        if (ld) loadDone(ld);
        if (a1 && a1.finished) a1.finished.then(cleanup, cleanup); else cleanup();
        // then: the border draws and the pins drop (route focus: the place card opens)
        var land = function () {
          glDraw(GL.drawCode, true);
          setTimeout(function () { glPins('drop'); glFocusRoute(); }, reduced() ? 0 : 180);
          // the detail layers (rivers, parks, main roads at full precision) follow once the reveal has played
          setTimeout(function () { try { SM.mapStyle.start(); } catch (e) { } }, reduced() ? 300 : 1300);
        };
        if (S.focus) glFocusCamera(S.focus, { instant: true });
        if (GL.flyIn && !S.focus && !reduced()) { GL.flewIn = true; setTimeout(flyIn, 260); return; }
        GL.flewIn = true;
        setTimeout(land, reduced() ? 0 : 200);
      };
      /* opening flight: all of Tokyo → the area (no area: a short push in). The border starts drawing at 60%
         of the flight and the pins drop at 85%, as an area change does; a drag or a tap takes the camera over */
      var flyIn = function () {
        if (!GL.map || !GL.el || !GL.el.isConnected) { land(); return; }
        var cam = cameraFor(targetBounds());
        if (!cam) { land(); return; }
        var drew = false, dropped = false;
        var landDraw = function () { if (drew) return; drew = true; glDraw(GL.drawCode, true); };
        var landPins = function () { if (dropped) return; dropped = true; glPins('drop'); glFocusRoute(); };
        var dur = glMove(cam.center, cam.zoom, {
          duration: 1500, hidePins: true,
          abort: function () { GL.flying = false; landDraw(); landPins(); },
          done: function () { landDraw(); if (dropped) glPins('instant'); else landPins(); }
        });
        var fid = GL.flight;
        if (dur > 0) {
          setTimeout(function () { if (fid === GL.flight) landDraw(); }, Math.round(dur * 0.6));
          setTimeout(function () { if (fid === GL.flight) landPins(); }, Math.round(dur * 0.85));
        }
        setTimeout(function () { try { SM.mapStyle.start(); } catch (e) { } }, (dur || 0) + 400);
      };
      // wait for the first full frame so the fade shows a finished map (labels in), not a half-drawn one
      var fired = false, go = function () { if (fired) return; fired = true; reveal(); };
      map.once('idle', go);
      setTimeout(go, 1500);
      paintScale();
    });
  }
  function glFail() {
    GL.state = 'failed';
    S.engine = 'svg';
    if (S.root && S.root.isConnected) {
      // re-render the frame as the simple map (the list stays as it is)
      var wrap = S.root.querySelector('.m-mapwrap');
      if (wrap) {
        var tmp = document.createElement('div');
        tmp.innerHTML = mapShellHtml();
        wrap.parentNode.replaceChild(tmp.firstChild, wrap);
        ruby(S.root.querySelector('.m-mapwrap'));
      }
      var src = S.root.querySelector('.m-foot-src');
      if (src) { var date = SM.updated ? (SM.fmtDate ? SM.fmtDate(SM.updated) : SM.updated) : ''; src.innerHTML = esc(t('map.sourceSimple')) + (date ? '<br>' + esc(t('map.addrCheck', { date: date })) : ''); }
      svgMount(S.root);
    }
  }
  /* the 2px green line along the frame's top: grows toward 85% while loading (one animation, no loop),
     completes on load and fades; the caption appears only if loading takes longer than 400ms */
  function loadStart(frame) {
    var ld = frame && frame.querySelector('.m-load'); if (!ld) return;
    var bar = ld.querySelector('.m-load-bar');
    if (!reduced()) anim(bar, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(0.85)' }], { duration: 2600, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)', fill: 'forwards', key: 'load' });
    else bar.style.transform = 'scaleX(0.85)';
    ld._capT = setTimeout(function () { ld.classList.add('is-slow'); }, 400);
  }
  function loadDone(ld) {
    clearTimeout(ld._capT);
    var bar = ld.querySelector('.m-load-bar');
    var a = anim(bar, [{ transform: 'scaleX(1)' }], { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards', key: 'load' });
    var b = anim(ld, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: 200, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)', fill: 'forwards' });
    var rm = function () { if (ld.parentNode) ld.parentNode.removeChild(ld); };
    if (b && b.finished) b.finished.then(rm, rm); else rm();
    void a;
  }

  /* -------- events (bound once per map) */
  function glBind(map) {
    var lastLevelCheck = 0;
    map.on('move', function () {
      placePins();
      if (!GL.flying) {
        var t1 = now();
        if (t1 - lastLevelCheck > 60) { lastLevelCheck = t1; if (levelFor(map.getZoom()) !== GL.level) glPins('anim'); }
      }
      paintScale();
    });
    map.on('moveend', function () {
      if (!GL.flying && GL.idx && levelFor(map.getZoom()) !== GL.level) glPins('anim');
      else if (!GL.flying) chipFit();
      paintScale();
    });
    // a pan that starts on a pin must not end as a tap on it
    map.on('dragstart', function () { GL.dragging = true; GL.dragAt = now(); });
    map.on('dragend', function () { GL.dragging = false; GL.dragAt = now(); });
    // tap a ward (overview scales only) to choose it; pins and furniture are not the map. A tap while the place
    // card is open only puts the card away. The choice waits 280ms: the second tap of a double-tap is a zoom,
    // and it (or any camera move) cancels the first (before, the second tap chose the ward under the finger
    // mid-flight)
    var clickT = 0, skipTo = 0;
    map.on('movestart', function () { if (clickT) { clearTimeout(clickT); clickT = 0; } });
    // the second finger-down of a double-tap is seen here, before the zoom and before its click
    map.getCanvasContainer().addEventListener('pointerdown', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') GL.touchAt = now();
      if (clickT) { clearTimeout(clickT); clickT = 0; skipTo = now() + 600; }
    });
    map.on('click', function (e) {
      var tg = e.originalEvent && e.originalEvent.target;
      if (tg && tg.closest && tg.closest('.m-pin')) return;
      if (peekOpen()) { peekClose(); return; }
      if (GL.flying || map.isMoving()) return;
      if (now() < skipTo) { skipTo = 0; return; }
      if (clickT) { clearTimeout(clickT); clickT = 0; return; }
      var asked = wardAskOpen();
      wardAskClose();
      if (map.getZoom() >= 12.5) return;
      var f = null;
      try { f = map.queryRenderedFeatures(e.point, { layers: ['area-sel'] })[0]; } catch (x) { f = null; }
      var code = f && f.properties && f.properties.code;
      if (!code || !isCode(code)) return;
      if (code === S.code || code === asked) return;
      /* a finger's tap only asks (a near miss next to a flag must not swap the user's area, the list and the URL):
         the area lights up and 「文京区を見る →」 stands at the tap; that button chooses it. A mouse click chooses
         at once (the hover name already said which area it is) */
      var touch = !!(GL.touchAt && now() - GL.touchAt < 900);
      var pt = e.point;
      clickT = setTimeout(function () {
        clickT = 0; if (GL.flying || map.isMoving()) return;
        if (touch) wardAsk(code, pt.x, pt.y); else setArea(code, { fromMap: true });
      }, 300);
    });
    map.on('movestart', function () { wardAskClose(); });
    // the label proxies' images: transparent boxes the size of a pin, a cluster or a chip
    map.on('styleimagemissing', function (e) {
      var m = /^m-col-(\d+)x(\d+)$/.exec((e && e.id) || '');
      if (!m || map.hasImage(e.id)) return;
      var w = +m[1], h = +m[2];
      try { map.addImage(e.id, { width: w, height: h, data: new Uint8Array(w * h * 4) }); } catch (x) { }
    });
    // hover: the ward's name follows the pointer (mouse only)
    var canvas = map.getCanvasContainer();
    var tip = document.createElement('div'); tip.className = 'm-tip'; tip.setAttribute('aria-hidden', 'true');
    GL.el.appendChild(tip);
    var pend = null;
    map.on('mousemove', function (e) {
      // the mouse events a touch screen sends after a tap are not hover: no ward name (it stayed up after a tap)
      var oe = e && e.originalEvent;
      if ((oe && oe.sourceCapabilities && oe.sourceCapabilities.firesTouchEvents) || (GL.touchAt && now() - GL.touchAt < 1000)) { tip.classList.remove('is-show'); return; }
      pend = e;
      if (GL.tipT) return;
      GL.tipT = raf(function () {
        GL.tipT = 0;
        var ev = pend; pend = null;
        if (!ev || map.isMoving() || map.getZoom() >= 12.5) { tip.classList.remove('is-show'); canvas.style.cursor = ''; return; }
        var tg = ev.originalEvent && ev.originalEvent.target;
        if (tg && tg.closest && tg.closest('.m-pin')) { tip.classList.remove('is-show'); return; }
        var f = null;
        try { f = map.queryRenderedFeatures(ev.point, { layers: ['area-sel'] })[0]; } catch (x) { f = null; }
        var a = f && areaBy(f.properties && f.properties.code);
        if (!a) { tip.classList.remove('is-show'); canvas.style.cursor = ''; return; }
        tip.textContent = areaName(a);
        tip.style.transform = 'translate(' + Math.round(ev.point.x) + 'px,' + Math.round(ev.point.y - 14) + 'px) translate(-50%,-100%)';
        tip.classList.add('is-show');
        canvas.style.cursor = a.code === S.code ? '' : 'pointer';
      });
    });
    map.on('mouseout', function () { tip.classList.remove('is-show'); canvas.style.cursor = ''; });
    map.on('movestart', function () { tip.classList.remove('is-show'); });
    // after setStyle (theme / language): selection state again
    map.on('style.load', function () { try { SM.mapStyle.select(map, GL.drawCode); } catch (e) { } });
  }

  /* -------- a tapped area asks before it is chosen (both engines): the area lights up (tint + outline) and an ink
     button 「文京区を見る →」 stands at the tap, its notch on the finger's point. It goes after 4s, on any camera
     move, on the next tap, or when the area changes; only the button chooses (setArea). */
  var ASK = { code: null, el: null, t: 0, svg: false };
  function wardAskOpen() { return ASK.code; }
  function wardHov(code, on, svg) {
    if (!code) return;
    if (svg) { var w = V.svg && V.svg.querySelector('.m-ward[data-code="' + code + '"]'); if (w) w.classList.toggle('is-hov', on); return; }
    if (GL.map) { try { GL.map.setFeatureState({ source: 'areas', id: code }, { hov: on }); } catch (e) { } }
  }
  function wardAskClose() {
    clearTimeout(ASK.t); ASK.t = 0;
    if (ASK.code) wardHov(ASK.code, false, ASK.svg);
    ASK.code = null;
    var el = ASK.el; ASK.el = null;
    if (!el || !el.parentNode) return;
    el.style.pointerEvents = 'none';
    var a = reduced() ? null : anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)', fill: 'forwards' });
    var rm = function () { if (el.parentNode) el.parentNode.removeChild(el); };
    if (a && a.finished) a.finished.then(rm, rm); else rm();
  }
  function wardAsk(code, x, y, svg) {
    wardAskClose();
    var a = areaBy(code), host = svg ? V.box : GL.el;
    if (!a || !host) return;
    ASK.code = code; ASK.svg = !!svg;
    wardHov(code, true, svg);
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'm-ask'; b.setAttribute('data-act', 'map-ask'); b.setAttribute('data-code', code);
    b.innerHTML = '<span>' + esc(t('map.askGo', { name: areaName(a) })) + '</span>' + arrow('r');
    host.appendChild(b);
    ruby(b);
    // centred over the tap, inside the frame (one layout read, at tap time); under the point near the top edge
    var sz = svg ? svgBoxSize() : { w: GL.w, h: GL.h }, bw = b.offsetWidth, bh = b.offsetHeight;
    var below = y - bh - 12 < 8 + (stage() ? chipsLap() : 0);
    var left = clamp(x - bw / 2, 8, Math.max(8, sz.w - 8 - bw)), top = below ? y + 12 : y - bh - 12;
    b.style.left = Math.round(left) + 'px'; b.style.top = Math.round(top) + 'px';
    b.style.setProperty('--m-ask-nx', Math.round(clamp(x - left, 14, bw - 14)) + 'px');
    b.classList.toggle('is-below', below);
    ASK.el = b;
    if (reduced()) anim(b, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'linear' });
    else anim(b, [{ opacity: 0, scale: '0.9' }, { opacity: 1, scale: '1' }], { spring: 'snappy' });
    ASK.t = setTimeout(wardAskClose, 4000);
  }

  /* -------- re-mount: move the live map into the new frame; camera / pins after the transition */
  function glAttach(frame) {
    var slot = frame.querySelector('.m-gl-slot');
    if (!slot || !GL.el) return;
    slot.appendChild(GL.el);
  }
  function glResizeObserve(frame) {
    if (GL.ro) { try { GL.ro.disconnect(); } catch (e) { } GL.ro = null; }
    if (!window.ResizeObserver) return;
    var slot = frame.querySelector('.m-gl-slot'); if (!slot) return;
    GL.ro = new ResizeObserver(function (ents) {
      var r = ents[ents.length - 1].contentRect;
      var w = Math.round(r.width), h = Math.round(r.height);
      if (!w || !h) return;   // detached / hidden: keep the last size (no blank canvas on return)
      if (w === GL.w && h === GL.h) return;
      GL.w = w; GL.h = h;
      frameShort(h);
      if (GL.map) { try { GL.map.resize(); } catch (e) { } placePins(); paintScale(); }
    });
    GL.ro.observe(slot);
  }
  /* the state of the route → the map: theme / language, selection, camera, pins. Called after transitions
     and after in-place re-renders. */
  function glSync(o) {
    o = o || {};
    var map = GL.map; if (!map) return;
    var th = theme(), lg = lang();
    if (th !== GL.theme || lg !== GL.lang || bigText() !== !!GL.big) {
      GL.theme = th; GL.lang = lg;
      try { SM.mapStyle.setTheme(th); map.setStyle(fullStyle(th, lg)); } catch (e) { }
      try { map.getCanvas().setAttribute('aria-label', t('map.canvas')); } catch (e) { }
      try { map.redraw(); } catch (e) { }
    }
    var codeChanged = GL.code !== S.code;
    GL.code = S.code;
    if (codeChanged) { glSelectArea(true); return; }
    if (S.focus && o.route) { glFocus(S.focus, { peek: true }); glPins('instant'); return; }
    glPins(o.drop ? 'drop' : 'instant');
  }
  /* area chosen: the tint fades while the camera flies there, then the border draws and the pins drop */
  function glSelectArea(animate) {
    var map = GL.map; if (!map) return;
    var code = S.code && !isIsland(S.code) ? S.code : null;
    // a route that names a place (#/map/CODE/ID) keeps it through the flight: peekClose clears S.focus
    // (and the hash), and the done callback below would then have nothing to focus (INTEGRATOR)
    var keepFocus = S.focus;
    peekClose(true);
    if (keepFocus && !S.focus) { S.focus = keepFocus; setHash(); }
    glPrime(code);
    GL.drawCode = code;
    try { SM.mapStyle.select(map, code); } catch (e) { }
    if (code && code.length === 5 && code.slice(0, 2) !== '13' && SM.mapStyle.ensureKanto) { try { SM.mapStyle.ensureKanto(code.slice(0, 2)); } catch (e) { } }
    var cam = cameraFor(targetBounds());
    if (GL.pinsEl && !reduced()) { GL.pinsEl.classList.add('is-away'); pinAux(); }
    var drew = false, dropped = false;
    // the pins stay away until the new set drops: shown at once, the old clusters stood at the new camera
    // for 200ms and then were swapped out (INTEGRATOR)
    var drop = function () {
      if (GL.pinsEl && GL.pinsEl.classList.contains('is-away')) {
        // the hidden clusters go at once (a fade-out would show them through the class change); all drop anew
        Object.keys(GL.pins).forEach(function (k) { kill(GL.pins[k]); });
        GL.pins = {}; GL.selKey = null;
        GL.pinsEl.classList.remove('is-away');
      }
      glPins('drop');
    };
    var dur = glMove(cam && cam.center, cam && cam.zoom, {
      instant: !animate, hidePins: true,
      // replaced by another area flight: that one owns the pins and the border. Otherwise bring both back now.
      abort: function (next) { if (next.hidePins) return; GL.flying = false; if (GL.pinsEl) GL.pinsEl.classList.remove('is-away'); if (GL.drawCode === code) glDraw(code, false); glPins('instant'); },
      done: function () {
        if (!drew) { drew = true; glDraw(code, animate); }
        if (dropped) { glPins('instant'); if (S.focus) glFocusRoute(); return; }
        setTimeout(function () { dropped = true; drop(); if (S.focus) glFocusRoute(); }, reduced() || !animate ? 0 : 200);
      }
    });
    /* no dead beat after the landing: flyTo front-loads its movement, so the camera looks settled long before
       moveend. The border starts drawing at 65% of the flight and the pins drop at 90% */
    if (dur > 0) {
      var fid = GL.flight;
      setTimeout(function () { if (fid !== GL.flight || drew) return; drew = true; glDraw(code, true); }, Math.round(dur * 0.65));
      setTimeout(function () { if (fid !== GL.flight || dropped) return; dropped = true; drop(); }, Math.round(dur * 0.9));
    }
  }
  /* at the start of a flight: the old border goes (undrawn) and the new rings go to the worker at once, hidden,
     so the pen at 65% of the flight starts on a line that is already tiled (set at the pen's start, the
     worker's answer came a few frames in and the line appeared part-drawn) */
  function glPrime(code) {
    var map = GL.map; if (!map) return;
    caf(GL.draw); GL.draw = 0;
    try { map.setPaintProperty('m-sel-draw', 'line-gradient', gradient(0, GL.theme)); } catch (e) { }
    glLift(false, false);
    var src = map.getSource('m-sel'); if (!src) return;
    if (GL.selCode !== (code || null)) { src.setData(code ? ringsOf(code) : EMPTY); GL.selCode = code || null; }
  }
  /* the chosen area's border draws itself from the top, like a pen (line-gradient on line-progress) */
  function glDraw(code, animate) {
    var map = GL.map; if (!map) return;
    caf(GL.draw); GL.draw = 0;
    var src = map.getSource('m-sel');
    if (!src) return;
    if (!code) { src.setData(EMPTY); GL.selCode = null; glLift(false, false); return; }
    GL.drawCode = code;
    if (GL.selCode !== code) { src.setData(ringsOf(code)); GL.selCode = code; }
    var th = GL.theme;
    // a prefecture's long coast (piers, ports) smudges under the shadow: it is drawn flat
    var lift = !isPrefCode(code);
    if (!animate || reduced()) { try { map.setPaintProperty('m-sel-draw', 'line-gradient', gradient(1, th)); } catch (e) { } glLift(lift, false); return; }
    var t0 = now(), dur = 760;
    try { map.setPaintProperty('m-sel-draw', 'line-gradient', gradient(0, th)); } catch (e) { }
    (function step() {
      var k = Math.min(1, (now() - t0) / dur);
      try { map.setPaintProperty('m-sel-draw', 'line-gradient', gradient(EASE_DRAW(k), th)); } catch (e) { return; }
      if (k < 1) GL.draw = raf(step); else { GL.draw = 0; glLift(lift, true); }
    })();
  }

  /* -------- pins: hierarchical clusters per zoom level */
  function buildIndex(recs) {
    var levels = {}, up = {};
    levels[MAXZ + 1] = recs.map(function (r) {
      return { key: r.key, lng: r.loc.lng, lat: r.loc.lat, x: lngX(r.loc.lng), y: latY(r.loc.lat), w: 1, m: [r] };
    });
    for (var z = MAXZ; z >= MINZ; z--) {
      var prev = levels[z + 1], rr = CR / (512 * Math.pow(2, z)), used = {}, out = [], upz = up[z + 1] = {};
      var order = prev.slice().sort(function (a, b) { return b.w - a.w || a.y - b.y || (a.key < b.key ? -1 : 1); });
      for (var i = 0; i < order.length; i++) {
        var it = order[i]; if (used[it.key]) continue; used[it.key] = 1;
        var grp = [it];
        for (var j = i + 1; j < order.length; j++) {
          var o = order[j]; if (used[o.key]) continue;
          if (Math.abs(o.x - it.x) <= rr && Math.abs(o.y - it.y) <= rr) { used[o.key] = 1; grp.push(o); }
        }
        var node = it;
        if (grp.length > 1) {
          var sx = 0, sy = 0, sw = 0, m = [];
          grp.forEach(function (g) { sx += g.x * g.w; sy += g.y * g.w; sw += g.w; m = m.concat(g.m); });
          node = { key: 'c:' + m.map(function (r) { return r.key; }).sort().join('|'), x: sx / sw, y: sy / sw, w: sw, m: m };
          node.lng = xLng(node.x); node.lat = yLat(node.y);
        }
        for (var q = 0; q < grp.length; q++) upz[grp[q].key] = node.key;
        out.push(node);
      }
      levels[z] = out;
    }
    return { levels: levels, up: up };
  }
  /* the chosen area, framed below the chip scale (八王子市 / 町田市 / 奥多摩町 land at z9.6–9.8 on a phone), shows
     its places, not one 「八王子市 | 2」 chip: near its own framing the level is at least the first cluster level */
  function areaFitZ() {
    if (!S.code || isIsland(S.code) || !GL.map) return 0;
    var key = S.code + ':' + GL.w + 'x' + GL.h;
    if (GL.fitKey !== key) {
      var cam = null;
      try { var b = SM.mapStyle.areaBounds(S.code); if (b) cam = GL.map.cameraForBounds([[b[0], b[1]], [b[2], b[3]]], { padding: insets(0, false), maxZoom: isPrefCode(S.code) ? 11 : 14 }); } catch (e) { cam = null; }
      GL.fitKey = key; GL.fitZ = cam ? cam.zoom : 0;
    }
    return GL.fitZ;
  }
  function levelFor(zoom) {
    var lv = clamp(Math.floor(zoom + 0.2), MINZ, MAXZ);
    if (lv <= CHIP_L && S.code) {
      var fz = areaFitZ();
      // a chosen prefecture, framed: its 区市町村 chips (not one 「神奈川県 | 25」 chip)
      if (isPrefCode(S.code)) { if (fz && lv < CHIP_L && zoom >= fz - 0.35) lv = CHIP_L; }
      else if (lv > REGION_L && fz && fz < CHIP_L + 0.8 && zoom >= fz - 0.35) lv = CHIP_L + 1;
    }
    return lv;
  }
  /* the key at level zTo of the cluster that holds level-zFrom item `key` (up[z] maps level z keys to z − 1) */
  function ancestor(key, zFrom, zTo) {
    var k = key;
    for (var z = zFrom; z > zTo && k; z--) k = GL.idx.up[z] ? GL.idx.up[z][k] : k;
    return k;
  }
  /* the same across the overview levels (cluster → 区市町村 chip → region) */
  function parentKey(it, zFrom, zTo) {
    if (zTo <= PREF_L) {
      if (it.pref) return it.key;
      if (it.region) return 'P:13';
      var a0 = it.chip === 'area' ? it.code : majorArea(it.m);
      return a0 ? 'P:' + a0.slice(0, 2) : null;
    }
    if (zTo <= REGION_L) {
      if (it.chip === 'region') return it.key;
      var a = it.chip === 'area' ? it.code : majorArea(it.m), k = a && regionOf(a);
      return k ? (k.charAt(0) === 'P' ? k : 'r:' + k) : null;
    }
    if (zTo <= CHIP_L) { if (it.chip) return it.key; var a2 = majorArea(it.m); return a2 ? 'a:' + a2 : null; }
    if (it.chip) return null;
    return ancestor(it.key, zFrom, zTo);
  }
  function itemAtLevel(z, key) {
    if (z <= PREF_L) return GL.prefBy[key] || null;
    if (z <= REGION_L) return GL.regionBy[key] || null;
    if (z <= CHIP_L) return GL.chipBy[key] || null;
    return itemAt(z, key);
  }
  function itemsAt(z) {
    if (z <= PREF_L) return GL.prefChips || [];
    if (z <= REGION_L) return GL.regions;
    if (z <= CHIP_L) return GL.chips;
    return GL.idx.levels[z] || [];
  }
  /* the focused place always stands as its own flag: pulled out of the cluster that would hold it */
  function pullFocus(items, key) {
    var out = [];
    items.forEach(function (it) {
      if (it.m.length < 2 || !it.m.some(function (r) { return r.key === key; })) { out.push(it); return; }
      var rec = it.m.filter(function (r) { return r.key === key; })[0], rest = it.m.filter(function (r) { return r.key !== key; });
      out.push({ key: rec.key, lng: rec.loc.lng, lat: rec.loc.lat, m: [rec] });
      if (rest.length === 1) out.push({ key: rest[0].key, lng: rest[0].loc.lng, lat: rest[0].loc.lat, m: rest });
      else {
        var sx = 0, sy = 0; rest.forEach(function (r) { sx += lngX(r.loc.lng); sy += latY(r.loc.lat); });
        out.push({ key: 'c:' + rest.map(function (r) { return r.key; }).sort().join('|'), lng: xLng(sx / rest.length), lat: yLat(sy / rest.length), m: rest });
      }
    });
    return out;
  }
  function itemAt(z, key) {
    var l = GL.idx.levels[z] || [];
    for (var i = 0; i < l.length; i++) if (l[i].key === key) return l[i];
    return null;
  }
  /* mode: 'instant' (no motion), 'drop' (new pins drop in), 'anim' (zoom: split from / merge into parents) */
  function glPins(mode) {
    var map = GL.map; if (!map || !GL.pinsEl) return;
    var recs = pinRecords();
    var sig = recs.map(function (r) { return r.key; }).join(',');
    var fresh = sig !== GL.sig;
    if (fresh) { GL.idx = buildIndex(recs); buildChips(recs); GL.sig = sig; }
    var oldZ = GL.level, z = levelFor(map.getZoom());
    var fk = z > CHIP_L && S.focus ? S.focus : '';
    if (!fresh && z === oldZ && mode !== 'drop' && fk === GL.fk) { placePins(); chipFit(); return; }
    GL.level = z; GL.fk = fk;
    var items = itemsAt(z);
    if (fk) items = pullFocus(items, fk);
    var want = {}; items.forEach(function (it) { want[it.key] = it; });
    var useAnim = mode === 'anim' && !fresh && oldZ >= 0 && !reduced();
    var zoomIn = z > oldZ;
    var added = [];
    // leaving
    Object.keys(GL.pins).forEach(function (k) {
      if (want[k]) return;
      var p = GL.pins[k]; delete GL.pins[k];
      if (k === GL.selKey) GL.selKey = null;
      if (p.away) { p.away = false; kill(p); return; }   // a tapped cluster that already faded out
      var inner = p.el.firstElementChild, a = null;
      if (useAnim && !zoomIn) {
        // merging: travel into the cluster (or chip) that takes it, and fade
        var anc = parentKey(p.it, oldZ, z), to = anc && want[anc];
        if (to) {
          var pa = map.project([to.lng, to.lat]), pb = map.project([p.it.lng, p.it.lat]);
          a = anim(inner, [{ translate: '0 0', opacity: 1 }, { translate: Math.round(pa.x - pb.x) + 'px ' + Math.round(pa.y - pb.y) + 'px', opacity: 0 }], { duration: 240, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards', key: 'pin' });
        }
      }
      if (!a && (useAnim || mode === 'drop') && !reduced()) a = anim(inner, [{ opacity: 1, scale: '1' }, { opacity: 0, scale: '0.6' }], { duration: 120, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)', fill: 'forwards', key: 'pin' });
      p.el.setAttribute('aria-hidden', 'true'); p.el.tabIndex = -1; p.el.style.pointerEvents = 'none';
      if (a && a.finished) { GL.dying.push(p); var rm = function () { kill(p); }; a.finished.then(rm, rm); }
      else kill(p);
    });
    // staying / arriving
    items.forEach(function (it) {
      var p = GL.pins[it.key];
      if (p) { p.it = it; return; }
      var el = pinNode(it.key, it.m, it);
      el.style.zIndex = String((it.code && it.code === S.code ? 12000 : 10000) - Math.round((it.lat - 35) * 8000));
      pinInsert(el, it);
      p = GL.pins[it.key] = { el: el, it: it, off: null, x: 0, y: 0 };
      added.push(p);
    });
    placePins();
    if (useAnim) {
      added.forEach(function (p) {
        var inner = p.el.firstElementChild;
        if (zoomIn) {
          // splitting: each child leaves its parent's spot (a cluster, an area chip, a region chip)
          var anc = parentKey(p.it, z, oldZ), from = anc && itemAtLevel(oldZ, anc);
          if (from && anc !== p.it.key) {
            var pa = map.project([from.lng, from.lat]), pb = map.project([p.it.lng, p.it.lat]);
            anim(inner, [{ translate: Math.round(pa.x - pb.x) + 'px ' + Math.round(pa.y - pb.y) + 'px', opacity: 0.4 }, { translate: '0 0', opacity: 1 }], { spring: 'smooth', fill: 'backwards', key: 'pin' });
            return;
          }
        }
        anim(inner, [{ scale: '0.6', opacity: 0 }, { scale: '1', opacity: 1 }], { spring: 'stamp', delay: zoomIn ? 0 : 90, fill: 'backwards', key: 'pin' });
      });
    } else if (mode === 'drop') {
      var vis = [];
      Object.keys(GL.pins).forEach(function (k) { var p = GL.pins[k]; if (!p.off) vis.push({ el: p.el, y: p.y }); });
      dropPins(vis);
    }
    chipFit(true);
    markSel();
  }
  /* chips that would overlap a bigger one drop their 区/市/町/村 and step aside (no further than half their width,
     so they stay on their own area); one that still meets another is put away (hidden, out of the tab order), and
     the canvas's own collision-aware area name shows in its place. Never two chips on top of each other: the
     covered one could not be tapped (千代田区 under 港区) */
  function chipCull(p, on) {
    if (!!p.culled === on) return false;
    p.culled = on;
    pinVis(p);
    if (on) { p.el.setAttribute('aria-hidden', 'true'); p.el.tabIndex = -1; p.el.style.pointerEvents = 'none'; }
    else { p.el.removeAttribute('aria-hidden'); p.el.removeAttribute('tabindex'); p.el.style.pointerEvents = ''; }
    return true;
  }
  function pinVis(p) { var h = !!(p.off || p.culled); if (p.hid !== h) { p.hid = h; p.el.style.visibility = h ? 'hidden' : ''; } }
  function chipFit(force) {
    var map = GL.map; if (!map) return;
    if (GL.level > CHIP_L) { if (force) pinAux(); return; }
    var list = [];
    for (var k in GL.pins) if (GL.pins[k].it.chip) list.push(GL.pins[k]);
    list.sort(function (a, b) { return (b.it.code === S.code) - (a.it.code === S.code) || b.it.m.length - a.it.m.length || (a.it.lat - b.it.lat); });
    var placed = [], changed = false;
    function hitBy(r) { for (var i = 0; i < placed.length; i++) { var q = placed[i]; if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) return q; } return null; }
    // the nearest free spot beside the chip it meets (sideways first), no further than lim
    function step(r, q, lim) {
      var c = [[q[0] - r[2], 0], [q[2] - r[0], 0], [0, q[1] - r[3]], [0, q[3] - r[1]]];
      c.sort(function (a, b) { return Math.abs(a[0]) + Math.abs(a[1]) - Math.abs(b[0]) - Math.abs(b[1]); });
      for (var i = 0; i < c.length; i++) {
        if (Math.abs(c[i][0]) + Math.abs(c[i][1]) > lim) continue;
        var r2 = [r[0] + c[i][0], r[1] + c[i][1], r[2] + c[i][0], r[3] + c[i][1]];
        if (!hitBy(r2)) return { d: c[i], r: r2 };
      }
      return null;
    }
    list.forEach(function (p) {
      var pt = map.project([p.it.lng, p.it.lat]), w = chipW(p.it, false), compact = false, d = [0, 0], s, cull = false;
      var r = [pt.x - w / 2 - 3, pt.y - 16, pt.x + w / 2 + 3, pt.y + 16], q = hitBy(r);
      // a region chip keeps its name and steps aside; an area chip first drops its 区/市/町/村, then steps aside
      if (q && p.it.chip === 'region' && (s = step(r, q, w))) { d = s.d; r = s.r; q = null; }
      if (q && p.it.chip === 'region') { compact = false; }
      else if (q) {
        compact = true; w = chipW(p.it, true); r = [pt.x - w / 2 - 2, pt.y - 15, pt.x + w / 2 + 2, pt.y + 15]; q = hitBy(r);
        if (q && (s = step(r, q, w / 2))) { d = s.d; r = s.r; q = null; }
        // the chosen area's own chip always stands
        if (q && p.it.code !== S.code) { cull = true; d = [0, 0]; }
      }
      if (!cull) placed.push(r);
      if (chipCull(p, cull)) changed = true;
      if (p.compact !== compact) { p.compact = compact; p.el.classList.toggle('is-compact', compact); changed = true; }
      var dx = Math.round(d[0]), dy = Math.round(d[1]);
      if ((p.dx || 0) !== dx || (p.dy || 0) !== dy) {
        p.dx = dx; p.dy = dy; changed = true;
        p.el.style.translate = dx || dy ? 'calc(-50% + ' + dx + 'px) ' + dy + 'px' : '';
      }
    });
    if (changed || force) pinAux();
  }
  /* what the canvas needs to know about the HTML pins: the label proxies (one invisible box per pin) and, at the
     chip scales, which area names the chips stand in for */
  function pinAux() {
    var map = GL.map; if (!map) return;
    var away = !!(GL.pinsEl && GL.pinsEl.classList.contains('is-away'));
    var f = [], sig = [], codes = [];
    if (!away) for (var k in GL.pins) {
      var p = GL.pins[k], it = p.it, w, h, c = 1, o = null;
      if (p.culled) continue;   // its area name shows on the canvas instead (and may take the spot)
      if (it.chip) { w = chipW(it, !!p.compact); h = 30; if (it.code) codes.push(it.code); if (it.region) codes.push('13'); if (p.dx || p.dy) o = [p.dx || 0, p.dy || 0]; }
      else if (it.m.length > 1) { w = h = it.m.length > 9 ? 44 : 38; }
      else { c = 0; var on = k === GL.selKey; w = on ? 40 : 32; h = on ? 52 : 42; }
      var id = 'm-col-' + Math.round(w) + 'x' + h;
      sig.push(k + id + (o ? '@' + o.join('/') : ''));
      f.push({ type: 'Feature', properties: o ? { i: id, c: c, o: o } : { i: id, c: c }, geometry: { type: 'Point', coordinates: [it.lng, it.lat] } });
    }
    try { SM.mapStyle.hideAreaLabels(map, GL.level <= CHIP_L ? codes : []); } catch (e) { }
    var s = sig.sort().join(',');
    if (s === GL.colSig) return;
    GL.colSig = s;
    GL.colData = { type: 'FeatureCollection', features: f };
    var src = map.getSource('m-pincol');
    if (src) { try { src.setData(GL.colData); } catch (e) { } }
  }
  /* the Tab order reads the map north to south, then west to east (a pan or a zoom never changes that order, so
     only the new pins are placed; the ones already there keep their spot and their running animations) */
  function pinInsert(el, it) {
    el._lat = it.lat; el._lng = it.lng;
    var c = GL.pinsEl.firstElementChild;
    while (c && !(c._lat < it.lat || (c._lat === it.lat && c._lng > it.lng))) c = c.nextElementSibling;
    GL.pinsEl.insertBefore(el, c);
  }
  function kill(p) {
    var i = GL.dying.indexOf(p); if (i >= 0) GL.dying.splice(i, 1);
    if (p.el && p.el.parentNode) {
      // keyboard focus on a pin that goes away: the map takes it (not <body>)
      var hadFocus = p.el.contains(document.activeElement);
      p.el.parentNode.removeChild(p.el);
      if (hadFocus && GL.map) { try { GL.map.getCanvas().focus({ preventScroll: true }); } catch (e) { } }
    }
  }
  /* every frame of a camera move: write transforms only (no layout reads) */
  function placePins() {
    var map = GL.map; if (!map || !GL.pinsEl) return;
    var w = GL.w, h = GL.h;
    var all = [];
    for (var k in GL.pins) all.push(GL.pins[k]);
    for (var d = 0; d < GL.dying.length; d++) all.push(GL.dying[d]);
    for (var i = 0; i < all.length; i++) {
      var p = all[i], pt = map.project([p.it.lng, p.it.lat]);
      var off = pt.x < -48 || pt.y < -24 || pt.x > w + 48 || pt.y > h + 60;
      if (off !== p.off) { p.off = off; pinVis(p); }
      if (off) continue;
      var x = Math.round(pt.x), y = Math.round(pt.y);
      if (x !== p.x || y !== p.y) { p.x = x; p.y = y; p.el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
    }
  }
  function markSel() {
    if (!GL.pinsEl) return;
    var key = null;
    if (S.focus) {
      // the pin (or the cluster) that holds the focused place
      for (var k in GL.pins) { if (GL.pins[k].it.m.some(function (r) { return r.key === S.focus; })) { key = k; break; } }
    }
    GL.selKey = key;
    GL.pinsEl.classList.toggle('has-sel', !!key && !!peekOpen());
    for (var k2 in GL.pins) {
      var on = k2 === key;
      GL.pins[k2].el.classList.toggle('is-sel', on);
      if (on) GL.pins[k2].el.setAttribute('aria-current', 'true'); else GL.pins[k2].el.removeAttribute('aria-current');
    }
    pinAux();
  }
  function pinOf(key) {
    for (var k in GL.pins) if (GL.pins[k].it.m.some(function (r) { return r.key === key; })) return GL.pins[k];
    return null;
  }

  /* -------- focus a place: camera + selected pin + place card */
  function glFocusCamera(key, o) {
    o = o || {};
    var r = byKey(key), map = GL.map;
    if (!r || !r.hasGeo || !map) { if (o.done) o.done(); return; }
    var zoom = o.zoom != null ? o.zoom : map.getZoom();
    // keep the area view when the place is in it; otherwise come close (streets and stations show)
    if (o.zoom == null) {
      var pt = map.project([r.loc.lng, r.loc.lat]), ins = insets(peekRoom(), true);
      var inside = pt.x > ins.left && pt.x < GL.w - ins.right && pt.y > ins.top && pt.y < GL.h - ins.bottom;
      // phone: a step less close, so the nearby stations stay in the small frame
      if (!inside || zoom < 11) zoom = Math.max(zoom, stage() ? 14 : 14.5);
      // and close enough that the place stands as its own flag, not inside a 2か所 / 3か所 cluster (places that
      // share one building never split: the focus pulls them out of their cluster instead, see pullFocus)
      if (GL.idx && GL.idx.up[MAXZ + 1]) {
        var lv0 = levelFor(zoom), lv = lv0, it;
        while (lv <= MAXZ) { it = itemAt(lv, ancestor(key, MAXZ + 1, lv)); if (!it || it.m.length <= 1) break; lv++; }
        if (lv > lv0 && lv <= MAXZ) zoom = Math.max(zoom, Math.min(lv + 0.25, 15.5));
      }
    }
    glMove(centerFor(r.loc.lng, r.loc.lat, zoom), zoom, { instant: o.instant, ease: o.ease, duration: 420, done: o.done });
  }
  /* the center that puts a point at the middle of the free part of the frame (above the place card) */
  function centerFor(lng, lat, zoom) {
    var map = GL.map, ins = insets(peekRoom(), true);
    var tx = (ins.left + (GL.w - ins.right)) / 2, ty = (ins.top + (GL.h - ins.bottom)) / 2;
    var ws = 512 * Math.pow(2, zoom);
    var cx = lngX(lng) - (tx - GL.w / 2) / ws, cy = latY(lat) - (ty - GL.h / 2) / ws;
    return { lng: xLng(cx), lat: yLat(cy) };
  }
  /* room the place card takes at the foot of the frame (its real height once it is open; this runs in event
     handlers, never inside a view transition) */
  function peekRoom() {
    var el = peekEl(), c = el && !el.hidden && el.firstElementChild, h = GL.h || 400;
    // open: from the card's top to the frame's foot (the card rides above the credit on a phone), less what insets()
    // already keeps free at the bottom, plus 8px of air
    var hgt = c ? (h - el.offsetTop) + 8 - ((GL.w || 390) < 560 ? 24 : 36) - (stage() ? LAP : 0) : Math.round(h * 0.45);
    return Math.max(0, Math.min(Math.round(h * 0.72), hgt));
  }
  /* list → map: the card opens first (so the camera knows how much of the frame is left), then the camera
     moves the place into the free part, then the pin pulses once */
  function glFocus(key, o) {
    o = o || {};
    S.focus = key;
    var r = byKey(key);
    if (r) peekShow([r], { key: key, keyboard: o.keyboard });
    glFocusCamera(key, {
      instant: o.instant, zoom: o.zoom, done: function () {
        glPins('instant');
        markSel();
        var p = pinOf(key);
        if (p && o.pulse && motion('pulse')) { try { SM.motion.pulse(p.el.firstElementChild); } catch (e) { } }
        if (o.done) o.done();
      }
    });
  }
  function glFocusRoute() {
    if (!S.focus) return;
    glFocus(S.focus, { pulse: true });
  }

  /* -------- scale bar (micro) */
  function paintScale() {
    var map = GL.map; if (!map || !S.frame) return;
    var z = map.getZoom(); if (Math.abs(z - GL.scaleZ) < 0.01) return; GL.scaleZ = z;
    var lat = map.getCenter().lat;
    var mpp = 40075016.686 * Math.cos(lat * Math.PI / 180) / (512 * Math.pow(2, z));
    scaleTo(1 / mpp);
  }
  function scaleTo(pxPerM) {
    var el = S.frame && S.frame.querySelector('.m-scale'); if (!el) return;
    var steps = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000], d = 50000;
    for (var i = 0; i < steps.length; i++) if (steps[i] * pxPerM >= 48) { d = steps[i]; break; }
    var bar = el.querySelector('.m-scale-bar'), tx = el.querySelector('.m-scale-t');
    var w = Math.round(d * pxPerM);
    if (bar && bar._w !== w) { bar._w = w; bar.style.width = w + 'px'; }
    var label = d < 1000 ? d + ' m' : (d / 1000) + ' km';
    if (tx && tx.textContent !== label) tx.textContent = label;
  }

  /* ================================================================== SVG engine (v3 flat map; no WebGL) */
  var V = { svg: null, layer: null, labels: null, box: null, selEl: null, mineEl: null, vb: null, anim: 0, clusters: [], signNew: false };
  function svgBoxSize() { var el = V.box; if (!el) return { w: 1, h: 1 }; return { w: el.clientWidth || 1, h: el.clientHeight || 1 }; }
  function fullVB() { var g = geo(); return g.vb ? g.vb.slice() : g.viewBox.split(/\s+/).map(Number); }
  function fitAspect(b, padFrac) {
    var s = svgBoxSize(), asp = s.w / s.h;
    var pad = padFrac == null ? 0.18 : padFrac;
    var w = b[2] * (1 + pad * 2), h = b[3] * (1 + pad * 2);
    var cx = b[0] + b[2] / 2, cy = b[1] + b[3] / 2;
    if (w / h > asp) h = w / asp; else w = h * asp;
    return [cx - w / 2, cy - h / 2, w, h];
  }
  function minW() { return 10; }
  function clampVB(v) {
    var f = fitAspect(fullVB(), 0.02);
    var w = Math.max(minW(), Math.min(v[2], f[2])), h = w * (v[3] / v[2]);
    var cx = v[0] + v[2] / 2, cy = v[1] + v[3] / 2;
    cx = Math.max(f[0] + Math.min(w / 2, f[2] / 2), Math.min(f[0] + f[2] - Math.min(w / 2, f[2] / 2), cx));
    cy = Math.max(f[1] + Math.min(h / 2, f[3] / 2), Math.min(f[1] + f[3] - Math.min(h / 2, f[3] / 2), cy));
    return [cx - w / 2, cy - h / 2, w, h];
  }
  function targetVB() {
    var g = geo();
    if (S.code && boxOf(S.code)) {
      var b = boxOf(S.code).slice();
      if (b[2] < 26) { var dx = (26 - b[2]) / 2; b[0] -= dx; b[2] = 26; }
      if (b[3] < 26) { var dy = (26 - b[3]) / 2; b[1] -= dy; b[3] = 26; }
      return fitAspect(b, 0.16);
    }
    return fitAspect(fullVB(), 0.04);
  }
  function applyVB(v) {
    V.vb = v;
    if (V.svg) V.svg.setAttribute('viewBox', v[0].toFixed(2) + ' ' + v[1].toFixed(2) + ' ' + v[2].toFixed(2) + ' ' + v[3].toFixed(2));
    svgPosition();
  }
  function svgAnimateTo(v, done, ms) {
    v = clampVB(v);
    caf(V.anim);
    if (V.layer && V.layer.style.visibility) V.layer.style.visibility = '';
    var from = V.vb;
    var same = from && Math.abs(from[0] - v[0]) + Math.abs(from[1] - v[1]) + Math.abs(from[2] - v[2]) < 0.05;
    if (!from || same || reduced()) { applyVB(v); svgLayout(); if (done) done(); return; }
    var t0 = now(), dur = ms || 560, box = V.box;
    function step() {
      if (V.box !== box) return;
      var k = Math.min(1, (now() - t0) / dur), e = EASE_STD(k);
      var lw = Math.exp(Math.log(from[2]) + (Math.log(v[2]) - Math.log(from[2])) * e);
      var lh = lw * (v[3] / v[2]);
      var cx = (from[0] + from[2] / 2) + ((v[0] + v[2] / 2) - (from[0] + from[2] / 2)) * e;
      var cy = (from[1] + from[3] / 2) + ((v[1] + v[3] / 2) - (from[1] + from[3] / 2)) * e;
      applyVB([cx - lw / 2, cy - lh / 2, lw, lh]);
      if (k < 1) V.anim = raf(step);
      else { box.classList.remove('is-moving'); applyVB(v); svgLayout(); if (done) done(); }
    }
    box.classList.add('is-moving');
    V.anim = raf(step);
  }
  function toPx(x, y) { var s = svgBoxSize(), v = V.vb; return [(x - v[0]) / v[2] * s.w, (y - v[1]) / v[3] * s.h]; }
  function svgStrokes() {
    if (!V.vb) return;
    var k = V.vb[2] / svgBoxSize().w;
    if (V.selEl) V.selEl.style.strokeWidth = (2 * k).toFixed(4);
    if (V.mineEl) { V.mineEl.style.strokeWidth = (1.5 * k).toFixed(4); V.mineEl.style.strokeDasharray = (5 * k).toFixed(4) + ' ' + (3.5 * k).toFixed(4); }
  }
  var UNITS_KM = null;
  function svgScale() {
    if (!V.vb) return;
    var g = geo();
    if (UNITS_KM == null) { var a = g.project(35.7, 139.5), b = g.project(35.7 + 1 / 111.32, 139.5); UNITS_KM = Math.abs(b[1] - a[1]) || 11.06; }
    scaleTo(svgBoxSize().w / V.vb[2] * UNITS_KM / 1000);
  }
  function svgLayout(drop) { svgClusters(); svgLabels(); svgPosition(); if (drop) dropPins(V.clusters.map(function (c, i) { return { el: V.layer.children[i], y: c.y }; })); }
  function svgClusters() {
    if (!V.layer || !V.vb) return;
    var ae = document.activeElement, held = null;
    if (ae && ae !== V.layer && V.layer.contains(ae)) { var ok = ae.getAttribute('data-key'); held = ok; }
    var recs = pinRecords(), R = 34, cl = [];
    recs.sort(function (a, b) { return (b.key === S.focus) - (a.key === S.focus) || a.y - b.y; });
    recs.forEach(function (r) {
      var p = toPx(r.x, r.y), hit = null;
      for (var i = 0; i < cl.length; i++) { var c = cl[i]; if (Math.abs(c.px - p[0]) < R && Math.abs(c.py - p[1]) < R) { hit = c; break; } }
      if (hit) hit.m.push(r); else cl.push({ px: p[0], py: p[1], m: [r] });
    });
    // a cluster is drawn at its members' centre, which can drift within R of a neighbour: merge until no two drawn
    // marks overlap (the greedy pass compared against each cluster's first member only)
    var centre = function (c) { var sx = 0, sy = 0; c.m.forEach(function (r) { sx += r.x; sy += r.y; }); c.x = sx / c.m.length; c.y = sy / c.m.length; var q = toPx(c.x, c.y); c.px = q[0]; c.py = q[1]; };
    cl.forEach(centre);
    // a single place's flag stands above its point; a cluster's badge sits on it
    var markY = function (c) { return c.m.length === 1 ? c.py - 22 : c.py; };
    for (var pass = 0, merged = true; merged && pass < 40; pass++) {
      merged = false;
      for (var a = 0; a < cl.length && !merged; a++) for (var b = a + 1; b < cl.length; b++) {
        if (Math.abs(cl[a].px - cl[b].px) < R && Math.abs(markY(cl[a]) - markY(cl[b])) < R) { cl[a].m = cl[a].m.concat(cl[b].m); cl.splice(b, 1); centre(cl[a]); merged = true; break; }
      }
    }
    cl.forEach(function (c) {
      c.key = c.m.length === 1 ? c.m[0].key : 'c:' + c.m.map(function (r) { return r.key; }).sort().join('|');
      c.focus = c.m.some(function (r) { return r.key === S.focus; });
    });
    cl.sort(function (a, b) { return a.y - b.y; });
    V.clusters = cl;
    V.layer.textContent = '';
    cl.forEach(function (c) {
      var el = pinNode(c.key, c.m);
      if (c.focus) { el.classList.add('is-sel'); el.setAttribute('aria-current', 'true'); }
      V.layer.appendChild(el);
    });
    if (held && focusLost()) {
      var to = null;
      V.clusters.forEach(function (c, i) { if (!to && c.m.some(function (r) { return held.indexOf(r.key) >= 0; })) to = V.layer.children[i]; });
      focusTo(to || (S.root && S.root.querySelector('.m-zfit')));
    }
  }
  /* a label's point: a 区市町村's, or (zoomed far out) a prefecture's */
  function labelPt(c) { var g = geo(); return (g.labels && g.labels[c]) || (g.prefLabels && g.prefLabels[c]) || null; }
  function svgLabels() {
    var g = geo(); if (!V.labels || !V.vb) return;
    var s = svgBoxSize(), scale = s.w / V.vb[2], placed = [], html = '';
    // all of 関東 (more than ≈ 900 units across): the seven prefecture names (and the chosen place's)
    if (V.vb[2] > 900 && g.prefLabels) {
      Object.keys(g.prefLabels).forEach(function (c) {
        var p = toPx(g.prefLabels[c][0], g.prefLabels[c][1]);
        if (p[0] < -40 || p[1] < -20 || p[0] > s.w + 40 || p[1] > s.h + 20) return;
        html += '<span class="m-label is-pref' + (c === S.code ? ' is-sel' : '') + '" data-code="' + c + '">' + esc(prefName(c)) + '</span>';
      });
      if (isCity(S.code) && g.labels[S.code]) html += '<span class="m-label is-sel" data-code="' + S.code + '">' + esc(placeName(S.code)) + '</span>';
      V.labels.innerHTML = html;
      return;
    }
    var codes = Object.keys(g.labels);
    codes.sort(function (a, b) { return (b === S.code) - (a === S.code) || (g.boxes[b][2] * g.boxes[b][3]) - (g.boxes[a][2] * g.boxes[a][3]); });
    codes.forEach(function (c) {
      var ar = areaBy(c); if (!ar) return;
      var nm = areaName(ar), sel = c === S.code;
      var bw = g.boxes[c][2] * scale;
      var lw = sel ? (lang() === 'en' ? nm.length * 8.5 : nm.length * 14) + 8 : (lang() === 'en' ? nm.length * 6.5 : nm.length * 12) + 6, lh = sel ? 22 : 16;
      if (!sel && bw < lw * 1.1) return;
      var p = toPx(g.labels[c][0], g.labels[c][1]);
      if (p[0] < -40 || p[1] < -20 || p[0] > s.w + 40 || p[1] > s.h + 20) return;
      var rect = [p[0] - lw / 2, p[1] - lh / 2, lw, lh];
      for (var i = 0; i < placed.length; i++) { var q = placed[i]; if (rect[0] < q[0] + q[2] && rect[0] + rect[2] > q[0] && rect[1] < q[1] + q[3] && rect[1] + rect[3] > q[1]) return; }
      placed.push(rect);
      html += '<span class="m-label' + (sel ? ' is-sel' : '') + '" data-code="' + c + '">' + esc(nm) + '</span>';
    });
    V.labels.innerHTML = html;
  }
  function svgPosition() {
    if (!V.vb) return;
    var g = geo();
    if (V.layer) {
      var pins = V.layer.children, sz = svgBoxSize();
      for (var i = 0; i < pins.length; i++) {
        var c = V.clusters[i]; if (!c) continue;
        var p = toPx(c.x, c.y);
        pins[i].style.transform = 'translate(' + Math.round(p[0]) + 'px,' + Math.round(p[1]) + 'px)';
        var out = p[0] < 8 || p[1] < 8 || p[0] > sz.w - 8 || p[1] > sz.h - 8;
        pins[i].style.visibility = out ? 'hidden' : '';
      }
    }
    if (V.labels) {
      var ls = V.labels.children;
      for (var j = 0; j < ls.length; j++) {
        var l = labelPt(ls[j].getAttribute('data-code')); if (!l) continue;
        var q = toPx(l[0], l[1]);
        ls[j].style.transform = 'translate(' + q[0].toFixed(1) + 'px,' + q[1].toFixed(1) + 'px) translate(-50%,-50%)';
      }
    }
    svgStrokes();
    svgScale();
  }
  function svgPaint(draw) {
    if (!V.svg) return;
    var g = geo(), mine = mineCode();
    Array.prototype.forEach.call(V.svg.querySelectorAll('.m-ward'), function (el) {
      var c = el.getAttribute('data-code');
      el.classList.toggle('is-sel', c === S.code);
      el.classList.toggle('is-mine', c === mine && c !== S.code);
    });
    if (V.selEl) {
      if (V.selEl.getAnimations) { try { V.selEl.getAnimations().forEach(function (a) { a.cancel(); }); } catch (e) { } }
      V.selEl.style.strokeDasharray = ''; V.selEl.style.strokeDashoffset = '';
      var d = selPath(S.code);
      V.selEl.setAttribute('d', d);
      if (d && draw && motion('drawLine') && !reduced()) { try { SM.motion.drawLine(V.selEl, { duration: 760 }); } catch (e) { } }
    }
    if (V.mineEl) V.mineEl.setAttribute('d', mine && mine !== S.code ? selPath(mine) : '');
    svgStrokes();
  }
  function svgMount(root) {
    var wrap = root.querySelector('.m-mapwrap');
    V.box = root.querySelector('#m-map');
    V.svg = root.querySelector('.m-svg');
    V.layer = root.querySelector('.m-pins');
    V.labels = root.querySelector('.m-labels');
    V.selEl = root.querySelector('.m-sel');
    V.mineEl = root.querySelector('.m-mine');
    V.vb = null; V.clusters = [];
    if (!V.box || !V.svg || !geo()) return;
    if (wrap) wrap.classList.add('is-svg');
    // the other prefectures' 区市町村 (lazy): drawn into this SVG when they arrive
    var g0 = S.gen;
    geoMore().then(function () { if (g0 !== S.gen || !V.svg || !V.svg.isConnected) return; svgAddWards(root); svgPaint(false); svgLayout(false); });
    var sw = root.querySelector('.m-svgwrap'); if (sw) sw.classList.remove('is-ph');
    if (V.svg && !V.svg.querySelector('.m-water')) {
      var wpath = document.createElementNS('http://www.w3.org/2000/svg', 'path'); wpath.setAttribute('class', 'm-water');
      V.svg.insertBefore(wpath, V.mineEl || V.selEl || null);
    }
    svgWaterFill(root);
    svgPaint(false);
    var tv = clampVB(targetVB());
    // the simple map arrives too: from all of Tokyo (first open) or from a little further out (return)
    // the flight starts where the first frame was drawn (svgFrom, framed by phViewBox; xMidYMid meet = fitAspect 0)
    var fly = !!svgFrom() && svgBoxSize().w > 1;
    var cur = fly && String(V.svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    if (fly && (!cur || cur.length !== 4 || cur.some(isNaN))) fly = false;
    if (fly) {
      var first = !V.flown, from = clampVB(fitAspect(cur, 0));
      applyVB(from);
      svgLayout(false);
      V.flown = true;
      var lay = V.layer, bx = V.box, landed = false;
      svgAnimateTo(tv, function () { landed = true; if (V.box !== bx) return; if (lay) lay.style.visibility = ''; svgLayout(true); }, first ? 1100 : 640);
      if (!landed && lay) lay.style.visibility = 'hidden';
    } else {
      V.flown = true;
      applyVB(tv);
      svgLayout(true);
    }
    frameShort(svgBoxSize().h);
    if (S.focus) { var f = svgPinFor(S.focus); if (f) peekShow(f.c.m.length > 1 ? f.c.m : f.c.m, { key: S.focus }); }
    var gen = S.gen;
    // tap a ward to select it (pointer only; the picker is the accessible way)
    var down = null, dragging = false;
    // a finger's tap asks first (as on the live map); a mouse click chooses
    var touchAt = 0;
    V.box.addEventListener('pointerdown', function (ev) { if (ev.pointerType && ev.pointerType !== 'mouse') touchAt = now(); }, true);
    V.svg.addEventListener('click', function (ev) {
      if (dragging) return;
      if (peekOpen()) { peekClose(); return; }
      var asked = wardAskOpen();
      wardAskClose();
      var p = ev.target.closest && ev.target.closest('.m-ward');
      if (!p) return;
      var code = p.getAttribute('data-code');
      if (code === S.code) { peekClose(); svgAnimateTo(targetVB()); return; }
      if (code === asked) return;
      if (touchAt && now() - touchAt < 900) { var r = V.box.getBoundingClientRect(); wardAsk(code, ev.clientX - r.left, ev.clientY - r.top, true); return; }
      setArea(code, { fromMap: true });
    });
    var tip = document.createElement('div'); tip.className = 'm-tip'; tip.setAttribute('aria-hidden', 'true'); V.box.appendChild(tip);
    V.svg.addEventListener('pointermove', function (ev) {
      if (ev.pointerType !== 'mouse' || down) { tip.classList.remove('is-show'); return; }
      var p = ev.target.closest && ev.target.closest('.m-ward');
      if (!p) { tip.classList.remove('is-show'); return; }
      var a = areaBy(p.getAttribute('data-code')); if (!a) return;
      var r = V.box.getBoundingClientRect();
      tip.textContent = areaName(a);
      tip.style.transform = 'translate(' + (ev.clientX - r.left) + 'px,' + (ev.clientY - r.top - 14) + 'px) translate(-50%,-100%)';
      tip.classList.add('is-show');
    });
    V.svg.addEventListener('pointerleave', function () { tip.classList.remove('is-show'); });
    var pts = {}, startVB = null, startMid = null, startDist = 0;
    function mid() { var k = Object.keys(pts), x = 0, y = 0; k.forEach(function (i) { x += pts[i].x; y += pts[i].y; }); return { x: x / k.length, y: y / k.length, n: k.length }; }
    function dist() { var k = Object.keys(pts); if (k.length < 2) return 0; var a = pts[k[0]], b = pts[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
    V.box.addEventListener('pointerdown', function (ev) {
      if (ev.target.closest('.m-pin, .m-zoom, .m-peek')) return;
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var m = mid();
      if (ev.pointerType === 'mouse' || m.n >= 2) { down = true; dragging = false; startVB = V.vb.slice(); startMid = m; startDist = dist(); caf(V.anim); V.box.classList.remove('is-moving'); }
    });
    function onMove(ev) {
      if (!pts[ev.pointerId] || !V.box || !V.box.isConnected) return;
      pts[ev.pointerId].x = ev.clientX; pts[ev.pointerId].y = ev.clientY;
      if (!down || !startVB) return;
      var m = mid(), s = svgBoxSize();
      if (ev.pointerType !== 'mouse' && m.n < 2) return;
      var dx = m.x - startMid.x, dy = m.y - startMid.y;
      if (!dragging && Math.hypot(dx, dy) < 5 && !(startDist && Math.abs(dist() - startDist) > 6)) return;
      dragging = true; V.box.classList.add('is-dragging'); tip.classList.remove('is-show');
      var f = (startDist && dist()) ? startDist / dist() : 1;
      var w = startVB[2] * f, h = startVB[3] * f;
      var r = V.box.getBoundingClientRect();
      var ax = startVB[0] + (startMid.x - r.left) / s.w * startVB[2], ay = startVB[1] + (startMid.y - r.top) / s.h * startVB[3];
      applyVB(clampVB([ax - (m.x - r.left) / s.w * w, ay - (m.y - r.top) / s.h * h, w, h]));
    }
    function onUp(ev) {
      if (!pts[ev.pointerId]) return;
      delete pts[ev.pointerId];
      if (!down) return;
      if (Object.keys(pts).length === 0 || ev.pointerType === 'mouse') {
        down = null; startVB = null;
        if (V.box) V.box.classList.remove('is-dragging');
        if (dragging) { svgLayout(false); setTimeout(function () { dragging = false; }, 0); }
      } else { startVB = V.vb.slice(); startMid = mid(); startDist = dist(); }
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    V.box.addEventListener('wheel', function (ev) {
      if (!V.vb) return;
      ev.preventDefault();
      var r = V.box.getBoundingClientRect(), s = svgBoxSize();
      var f = Math.exp(ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.0018));
      var v = V.vb, ax = v[0] + (ev.clientX - r.left) / s.w * v[2], ay = v[1] + (ev.clientY - r.top) / s.h * v[3];
      var w = v[2] * f, h = v[3] * f;
      applyVB(clampVB([ax - (ev.clientX - r.left) / s.w * w, ay - (ev.clientY - r.top) / s.h * h, w, h]));
      clearTimeout(V.wheelT); V.wheelT = setTimeout(function () { svgLayout(false); }, 120);
    }, { passive: false });
    var ro = null;
    if (window.ResizeObserver) {
      var lastW = 0, lastH = 0;
      ro = new ResizeObserver(function () {
        if (gen !== S.gen || !V.box || !V.box.isConnected) return;
        var s = svgBoxSize(); if (s.w === lastW && s.h === lastH) return; lastW = s.w; lastH = s.h;
        frameShort(s.h);
        if (V.vb) { var v = V.vb, cx = v[0] + v[2] / 2, cy = v[1] + v[3] / 2, w = v[2], h = w * s.h / s.w; applyVB(clampVB([cx - w / 2, cy - h / 2, w, h])); svgLayout(false); }
      });
      ro.observe(V.box);
    }
    var prevOff = S.off;
    S.off = function () {
      if (prevOff) prevOff();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (ro) { try { ro.disconnect(); } catch (e) { } }
    };
  }
  function svgPinFor(key) {
    for (var i = 0; i < V.clusters.length; i++) if (V.clusters[i].m.some(function (r) { return r.key === key; })) return { el: V.layer.children[i], c: V.clusters[i] };
    return null;
  }
  function svgFocus(key, o) {
    o = o || {};
    S.focus = key;
    var rec = byKey(key);
    var done = function () {
      svgLayout(false);
      var f = svgPinFor(key);
      if (f) { peekShow(f.c.m, { key: key, keyboard: o.keyboard }); if (o.pulse && motion('pulse')) { try { SM.motion.pulse(f.el.firstElementChild); } catch (e) { } } }
    };
    if (rec && rec.hasGeo && V.vb) {
      var t0 = targetVB();
      if (rec.x > t0[0] && rec.x < t0[0] + t0[2] && rec.y > t0[1] && rec.y < t0[1] + t0[3] && V.vb[2] <= t0[2] * 1.01) { done(); return; }
      var w = Math.min(V.vb[2], 60), h = w * (V.vb[3] / V.vb[2]);
      svgAnimateTo([rec.x - w / 2, rec.y - h / 2, w, h], done);
    } else done();
  }

  /* ================================================================== peek card (both engines) */
  /* an overlay inside the frame: rises on the smooth spring, drags down to dismiss with the finger's speed */
  function peekEl() { return S.root && S.root.querySelector('#m-peek'); }
  function peekOpen() { var el = peekEl(); return !!(el && !el.hidden); }
  function peekHtml(m, key) {
    var U = ui(), x = '<button type="button" class="m-peek-x" data-act="map-peek-close" aria-label="' + esc(t('map.close')) + '">' + icon('close') + '</button>';
    if (m.length === 1) {
      var r = m[0], loc = r.loc, pln = locName(r), nm = pln.text;
      var ar = loc.area ? areaBy(loc.area) : null;
      var meta = [];
      void ar;   // v5: name + phone; the mark says the kind, the age line stays (it decides who can go)
      var aud = audOf(r); if (aud) meta.push('<span class="' + (aud.off ? 'is-off' : '') + '">' + esc(aud.text) + '</span>');
      return '<div class="m-peek-grip" aria-hidden="true"></div>' +
        '<div class="m-peek-row">' + (U.catIcon ? U.catIcon(r.cat, 'sm') : '') +
        '<div class="m-peek-text">' + (meta.length ? '<p class="m-peek-meta">' + meta.join('<i aria-hidden="true"></i>') + '</p>' : '') +
        '<h3 class="m-peek-name"' + (pln.ja ? ' lang="ja"' : '') + '><button type="button" class="m-peek-go" data-act="map-tolist" data-key="' + esc(r.key) + '" aria-label="' + esc(nm + (lang() === 'en' ? ': ' : '：') + t('map.toList')) + '">' + esc(nm) + '</button></h3>' +
        '</div>' + x + '</div>' +
        (loc.phone ? '<a class="m-peek-tel" href="' + esc(telHref(loc.phone)) + '" data-press><span class="m-peek-num">' + esc(loc.phone) + '</span><span class="call-go">' + icon('phone') + '<span class="call-go-t">' + esc(t('map.call')) + '</span></span></a>' : '') +
        '<div class="m-peek-acts">' +
          '<a class="m-peek-link" href="#/p/' + esc(encodeURIComponent(r.p.id)) + '"><span>' + esc(t('map.progPage')) + '</span>' + arrow('r') + '</a>' +
          '<button type="button" class="m-peek-link" data-act="map-tolist" data-key="' + esc(r.key) + '"><span>' + esc(t('map.toList')) + '</span>' + arrow('d') + '</button>' +
          (r.hasLL ? '<a class="m-peek-link" href="' + esc(gmaps(loc)) + '" target="_blank" rel="noopener"><span>' + esc(t('map.gmaps')) + '</span>' + arrow('ne') + '<span class="sr-only">' + esc(t('core.newtab')) + '</span></a>' : '') +
        '</div>';
    }
    return '<div class="m-peek-grip" aria-hidden="true"></div>' +
      '<div class="m-peek-row"><div class="m-peek-text"><h3 class="m-peek-name">' + esc(t('map.cluster', { n: m.length })) + '</h3></div>' + x + '</div>' +
      '<ul class="m-peek-list">' + m.map(function (r) {
        var ln2 = locName(r), nm2 = ln2.text;
        return '<li><button type="button" class="m-peek-item' + (r.key === key ? ' is-on' : '') + '" data-act="map-tolist" data-key="' + esc(r.key) + '">' + (U.catIcon ? U.catIcon(r.cat, 'xs') : '') +
          '<span class="m-peek-text"><span class="m-peek-iname"' + (ln2.ja ? ' lang="ja"' : '') + '>' + esc(nm2) + '</span>' + (r.loc.phone ? '<span class="m-peek-isub num">' + esc(r.loc.phone) + '</span>' : '') + '</span>' + icon('chevron-right') + '</button></li>';
      }).join('') + '</ul>';
  }
  var peekDrag = null;
  function peekShow(m, o) {
    o = o || {};
    var el = peekEl(); if (!el || !m || !m.length) return;
    var was = !el.hidden;
    el.innerHTML = '<div class="m-peek-card" role="group" aria-label="' + esc(t('map.peekLabel')) + '">' + peekHtml(m, o.key) + '</div>';
    el.hidden = false;
    ruby(el);
    var card = el.firstElementChild;
    if (!was) {
      if (reduced()) anim(card, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'linear', key: 'peek' });
      else anim(card, [{ translate: '0 calc(100% + 24px)' }, { translate: '0 0' }], { spring: 'rise', key: 'peek' });   // v5: springs (≈3% overshoot)
    } else if (!reduced()) {
      anim(card, [{ opacity: 0.4 }, { opacity: 1 }], { duration: 160, easing: 'cubic-bezier(0, 0, 0.2, 1)', key: 'peekx' });
    }
    peekBindDrag(el);
    if (!was) peekReveal();
    if (GL.pinsEl) GL.pinsEl.classList.add('has-sel');
    if (o.keyboard) {
      // the phone number first (the reason to open a place); querySelector with a list returns the first in DOM
      // order, which was the × button
      focusTo(el.querySelector('.m-peek-tel') || el.querySelector('.m-peek-item') || el.querySelector('.m-peek-link') || el.querySelector('.m-peek-x'));
    }
  }
  /* phone, short screens (landscape, small phones at the top of the page): the card sits at the frame's foot, so
     when that foot is under the tab bar the page scrolls just enough to show it (never past the "half" rest) */
  function peekReveal() {
    if (!stage() || !S.frame || !S.frame.isConnected) return;
    var r = S.frame.getBoundingClientRect(), vb = window.innerHeight, tb = document.querySelector('.tabbar');
    if (tb) { var q = tb.getBoundingClientRect(); if (q.height && q.top < vb) vb = q.top; }
    var need = Math.ceil(r.bottom - vb); if (need <= 2) return;
    var y = window.scrollY || 0, sn = snaps();
    if (y >= sn.half) return;
    scrollToY(Math.min(y + need, sn.half));
  }
  function peekClose(instant, v) {
    var el = peekEl();
    if (GL.pinsEl) GL.pinsEl.classList.remove('has-sel');
    if (!el || el.hidden) return;
    var card = el.firstElementChild;
    var hadFocus = el.contains(document.activeElement);
    var fin = function () { if (el._closing !== tok) return; el.hidden = true; el.innerHTML = ''; el._closing = null; };
    var tok = {}; el._closing = tok;
    if (instant || !card || !motion('animate')) { fin(); }
    else if (reduced()) { var r = anim(card, [{ opacity: 0 }], { duration: 120, easing: 'linear', fill: 'forwards', key: 'peek' }); if (r) r.finished.then(fin, fin); else fin(); }
    else {
      var a;
      if (typeof v === 'number' && v > 0) {
        var hgt = card.offsetHeight || 200, cur = peekDrag ? peekDrag.y : 0, rest = Math.max(1, hgt + 24 - cur);
        a = anim(card, [{ translate: '0 ' + cur + 'px' }, { translate: '0 ' + (hgt + 24) + 'px' }], { spring: { response: 0.36, damping: 1, velocity: (v * 1000) / rest }, maxDuration: 420, fill: 'forwards', key: 'peek' });
      } else a = anim(card, [{ translate: '0 calc(100% + 24px)', opacity: 1 }], { duration: 200, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)', fill: 'forwards', key: 'peek' });
      if (a) a.finished.then(fin, fin); else fin();
    }
    // the pin that opened it keeps the keyboard
    if (hadFocus) {
      var p = S.focus && (S.engine === 'gl' ? pinOf(S.focus) : null);
      focusTo(p ? p.el : (S.root && S.root.querySelector('.m-zfit')));
    }
    S.focus = null;
    if (S.engine === 'gl') { markSel(); if (GL.fk && GL.map && GL.state === 'ready') glPins(instant ? 'instant' : 'anim'); }
    else if (V.layer) Array.prototype.forEach.call(V.layer.querySelectorAll('.m-pin.is-sel'), function (x) { x.classList.remove('is-sel'); x.removeAttribute('aria-current'); });
    Array.prototype.forEach.call(S.root ? S.root.querySelectorAll('.m-loc.is-focus') : [], function (x) { x.classList.remove('is-focus'); });
    setHash();
  }
  function peekBindDrag(el) {
    if (el._drag) return;
    el._drag = true;
    var tr = null;
    function begin(x, y, tt, target) {
      if (target.closest && target.closest('a, button:not(.m-peek-x):not(.m-peek-go), .m-peek-list')) { tr = null; return; }
      tr = { x0: x, y0: y, t: tt, lastY: y, lastT: tt, v: 0, on: false };
    }
    function move(x, y, tt) {
      if (!tr) return false;
      var dy = y - tr.y0, dx = x - tr.x0;
      if (!tr.on) { if (Math.abs(dy) < 6 || Math.abs(dy) < Math.abs(dx)) return false; tr.on = true; }
      var card = el.firstElementChild; if (!card) return false;
      if (card._smA && card._smA.peek) { try { card._smA.peek._smReplaced = true; card._smA.peek.cancel(); } catch (e) { } delete card._smA.peek; }
      var yv = dy < 0 ? Math.max(-16, dy * 0.25) : dy;
      peekDrag = { y: yv };
      card.style.translate = '0 ' + yv + 'px';
      var dt = tt - tr.lastT; if (dt > 0) tr.v = 0.8 * ((y - tr.lastY) / dt) + 0.2 * tr.v;
      tr.lastY = y; tr.lastT = tt;
      return true;
    }
    function end(tt) {
      if (!tr) return;
      var r = tr; tr = null;
      if (!r.on) return;
      var card = el.firstElementChild; if (!card) return;
      el._dragAt = now();
      var yv = peekDrag ? peekDrag.y : 0, v = tt - r.lastT > 80 ? 0 : r.v, hgt = card.offsetHeight || 200;
      card.style.translate = '';
      if (yv > hgt * 0.32 || v > 0.6) { peekClose(false, Math.max(v, 0.4)); peekDrag = null; return; }
      if (reduced()) { peekDrag = null; return; }
      anim(card, [{ translate: '0 ' + yv + 'px' }, { translate: '0 0' }], { spring: { response: 0.30, damping: 0.86, velocity: yv ? (-v * 1000) / -yv : 0 }, key: 'peek' });
      peekDrag = null;
    }
    el.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch' || e.button !== 0) return; begin(e.clientX, e.clientY, e.timeStamp, e.target); });
    el.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; if (move(e.clientX, e.clientY, e.timeStamp)) { try { el.setPointerCapture(e.pointerId); } catch (x) { } } });
    el.addEventListener('pointerup', function (e) { if (e.pointerType !== 'touch') end(e.timeStamp); });
    el.addEventListener('pointercancel', function (e) { if (e.pointerType !== 'touch') end(e.timeStamp); });
    el.addEventListener('touchstart', function (e) { if (e.touches.length !== 1) { tr = null; return; } var p = e.touches[0]; begin(p.clientX, p.clientY, e.timeStamp, e.target); }, { passive: true });
    el.addEventListener('touchmove', function (e) { var p = e.touches[0]; if (p && move(p.clientX, p.clientY, e.timeStamp) && e.cancelable) e.preventDefault(); }, { passive: false });
    el.addEventListener('touchend', function (e) { end(e.timeStamp); });
    el.addEventListener('touchcancel', function (e) { end(e.timeStamp); });
    // short frames: the compact card is one tap target (→ its row in the list); its links live in the row
    el.addEventListener('click', function (e) {
      if (!S.frame || !S.frame.classList.contains('is-short')) return;
      if (e.target.closest && e.target.closest('a, button, .m-peek-list')) return;
      if (el._dragAt && now() - el._dragAt < 350) return;
      var go = el.querySelector('.m-peek-go'); if (go) go.click();
    });
  }
  function frameShort(h) { if (S.frame && h > 0) { S.frame.classList.toggle('is-short', h < 440); S.frame.classList.toggle('is-tiny', h < 300); S.frame.classList.toggle('is-stage', stage()); } }

  /* ================================================================== phone stage: the list is a sheet */
  /* geometry (CSS variables on the view, measured in a ResizeObserver callback — layout is clean there):
     --m-above  how far the frame's top sits below the app bar at scroll 0 (header, controls, banner)
     snaps: 0 (peek) · above (half: the frame sticks, list below) · above + frame − lap (full: list on top) */
  var G = { above: 0, mapH: 0, appbar: 56, ro: null, scrollT: 0, tomap: false };
  function stageMeasure() {
    var root = S.root; if (!root || !root.isConnected) return;
    var wrap = root.querySelector('.m-mapwrap'), ctl = root.querySelector('.m-controls'); if (!wrap || !ctl) return;
    if (!stage()) return;
    var bar = document.querySelector('.appbar');
    var ab = bar ? bar.getBoundingClientRect().bottom : 56;
    var y = window.scrollY || window.pageYOffset || 0;
    // the frame is sticky, so measure its in-flow top through what sits right above it (the controls)
    G.appbar = ab;
    G.above = Math.max(0, Math.round(ctl.getBoundingClientRect().bottom + y - ab));
    /* the map's height leaves the sheet's peek row in view under whatever sits above the frame (文字を大きく, ふりがな,
       English, "← 練馬区にもどる" and the 中学生 switch make that head taller; map.css: --m-h) */
    if (G.aboveSet !== G.above) { G.aboveSet = G.above; root.style.setProperty('--m-above', G.above + 'px'); }
    G.mapH = wrap.offsetHeight;
    stageScroll();
  }
  function snaps() { return { peek: 0, half: Math.max(0, G.above), full: Math.max(0, G.above + G.mapH - LAP) }; }
  function stageScroll() {
    if (!S.root || !stage()) return;
    var y = window.scrollY || 0, sn = snaps();
    var full = y >= sn.full - 24;
    var hd = S.root.querySelector('.m-handle');
    if (hd && hd._full !== full) { hd._full = full; hd.setAttribute('aria-label', t(full ? 'map.sheetClose' : 'map.sheetOpen')); hd.setAttribute('aria-expanded', String(full)); }
    var show = y > sn.half + G.mapH * 0.5 - LAP;
    if (show !== G.tomap) {
      G.tomap = show;
      var b = S.root.querySelector('.m-tomap');
      if (b) {
        if (show) { b.hidden = false; anim(b, [{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { spring: 'snappy', key: 'tm' }); }
        else {
          var a = anim(b, [{ opacity: 0, translate: '0 8px' }], { duration: 160, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)', fill: 'forwards', key: 'tm' });
          var hide = function () { if (!G.tomap) { b.hidden = true; if (b._smA) { } try { b.getAnimations().forEach(function (x) { x.cancel(); }); } catch (e) { } } };
          if (a) a.finished.then(hide, hide); else hide();
        }
      }
    }
  }
  function scrollToY(y) {
    try { window.scrollTo({ top: Math.max(0, y), behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, y); }
  }
  /* bring the map into view (phone): the sheet slides down to "half" if it covers the frame */
  function revealMap() {
    if (!stage()) return;
    var y = window.scrollY || 0, sn = snaps();
    if (y > sn.half + 8 || y < sn.half - G.above * 0.6) {
      if (y > sn.half + 8) scrollToY(sn.half);
    }
  }
  function stageBind(root) {
    var onScroll = function () { if (G.scrollT) return; G.scrollT = raf(function () { G.scrollT = 0; stageScroll(); }); };
    window.addEventListener('scroll', onScroll, { passive: true });
    var ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { stageMeasure(); });
      [root.querySelector('.m-head'), root.querySelector('.m-controls'), root.querySelector('.m-mapwrap'), root].forEach(function (n) { if (n) ro.observe(n); });
    }
    // mouse: drag the handle to move the sheet (touch drags scroll the page natively)
    var hd = root.querySelector('.m-handle'), drag = null;
    if (hd) {
      hd.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || e.button !== 0) return; drag = { y: e.clientY, s: window.scrollY, moved: false }; try { hd.setPointerCapture(e.pointerId); } catch (x) { } });
      hd.addEventListener('pointermove', function (e) { if (!drag) return; var d = drag.y - e.clientY; if (Math.abs(d) > 4) drag.moved = true; if (drag.moved) window.scrollTo(0, drag.s + d); });
      var up = function () {
        if (!drag) return;
        var moved = drag.moved, s0 = drag.s; drag = null;
        if (moved) { hd._skipClick = true; setTimeout(function () { hd._skipClick = false; }, 0); snapTo(s0, 0); }
      };
      hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
    }
    /* touch: the page's own scroll moves the sheet, so it can come to rest anywhere. When a touch scroll (and its
       momentum) ends above the list between two rests, it settles on the nearest one (when more than 8px away) */
    /* the rest follows the swipe: a flick (≥ 0.25 px/ms at release) or a drag of more than 48px goes on to the next
       rest in its direction; a slow, short one settles on the nearest (before, a deliberate 108px swipe down from
       "full" sprang back up, because only the release position counted) */
    var T = { on: false, end: 0, moved: false, t: 0, y0: null, v: 0, vRel: 0, lastY: 0, lastT: 0 }, hasEnd = 'onscrollend' in window;
    var settle = function () {
      T.t = 0;
      if (T.on || !T.moved || !S.root || !stage()) return;
      T.moved = false;
      var y0 = T.y0, v = T.vRel;
      T.y0 = null; T.vRel = 0;
      snapTo(y0, v);
    };
    var arm = function () { clearTimeout(T.t); T.t = setTimeout(settle, 160); };
    var onTS = function () { T.on = true; T.moved = false; clearTimeout(T.t); T.y0 = window.scrollY || 0; T.v = 0; T.vRel = 0; T.lastY = T.y0; T.lastT = now(); };
    var onTE = function () { T.on = false; T.end = now(); T.vRel = T.end - T.lastT > 100 ? 0 : T.v; if (T.moved && !hasEnd) arm(); };
    var onSc = function () {
      if (T.on) {
        var y = window.scrollY || 0, tt = now(), dt = tt - T.lastT;
        if (dt > 0) { T.v = 0.7 * ((y - T.lastY) / dt) + 0.3 * T.v; T.lastY = y; T.lastT = tt; }
      }
      if (T.on || now() - T.end < 1500) { T.moved = true; if (!T.on && !hasEnd) arm(); }
    };
    var onEnd = function () { if (!T.on && T.moved) settle(); };
    window.addEventListener('touchstart', onTS, { passive: true });
    window.addEventListener('touchend', onTE, { passive: true });
    window.addEventListener('touchcancel', onTE, { passive: true });
    window.addEventListener('scroll', onSc, { passive: true });
    if (hasEnd) window.addEventListener('scrollend', onEnd);
    var prevOff = S.off;
    S.off = function () {
      if (prevOff) prevOff();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onTS);
      window.removeEventListener('touchend', onTE);
      window.removeEventListener('touchcancel', onTE);
      window.removeEventListener('scroll', onSc);
      if (hasEnd) window.removeEventListener('scrollend', onEnd);
      clearTimeout(T.t);
      G.aboveSet = null; try { root.style.removeProperty('--m-above'); } catch (e) { }
      if (ro) { try { ro.disconnect(); } catch (e) { } }
    };
  }
  /* settle the sheet on a rest: the next one in the swipe's direction (release speed v px/ms, or the travel since
     y0), else the nearest. Deep in the list (past "full") nothing moves */
  function snapTo(y0, v) {
    var y = window.scrollY || 0, sn = snaps();
    if (y >= sn.full + 40) return;
    var rests = [sn.peek, sn.half, sn.full], best = null, bd = 1e9, dir = 0;
    // only a swipe that began on the sheet's way (not one that scrolled back up out of the list) has a direction
    if (y0 == null || y0 > sn.full + 40) { v = 0; y0 = null; }
    if (Math.abs(v || 0) >= 0.25) dir = v > 0 ? 1 : -1;
    else if (y0 != null && Math.abs(y - y0) > 48) dir = y > y0 ? 1 : -1;
    if (dir > 0) rests.forEach(function (r) { if (r > y + 8 && (best == null || r < best)) best = r; });
    else if (dir < 0) rests.forEach(function (r) { if (r < y - 8 && (best == null || r > best)) best = r; });
    if (best == null) rests.forEach(function (r) { var d = Math.abs(r - y); if (d < bd) { bd = d; best = r; } });
    if (Math.abs(best - y) > 8) scrollToY(best);
  }

  /* ================================================================== refresh / area / focus */
  function refresh(opts) {
    opts = opts || {};
    if (!S.root) return;
    var c = S.root.querySelector('#m-controls');
    if (c) {
      var cs = c.querySelector('.m-cats'), sl = cs ? cs.scrollLeft : 0;
      // FIX-B (motion): the chip counts roll to the new area's numbers like the list count does
      var was = {};
      Array.prototype.forEach.call(c.querySelectorAll('.m-cats .chip[data-cat]'), function (b) { var n = b.querySelector('.chip-count'); if (n) was[b.getAttribute('data-cat')] = +n.textContent; });
      keepFocus(c, function () { c.innerHTML = controlsHtml(); });
      var cs2 = c.querySelector('.m-cats'); if (cs2) cs2.scrollLeft = sl;
      ruby(c);
      if (opts.move && motion('odometer') && !reduced()) {
        Array.prototype.forEach.call(c.querySelectorAll('.m-cats .chip[data-cat]'), function (b) {
          var n = b.querySelector('.chip-count'), k = b.getAttribute('data-cat'), v = n ? +n.textContent : NaN;
          if (n && was[k] != null && isFinite(v) && v !== was[k]) { try { SM.motion.odometer(n, v, { from: was[k], duration: 420 }); } catch (e) { } }
        });
      }
    }
    var l = S.root.querySelector('#m-list');
    if (l) {
      var oldN = l.querySelector('.m-count [data-n]');
      var n0 = oldN ? +oldN.getAttribute('data-n') : null;
      /* an area change replaces every row, so there is nothing to FLIP (and its layout reads cost ~250ms at 4x
         CPU, all before the flight could start): the new rows rise in by CSS (.is-swap), and the "near" section
         is appended once the camera has landed */
      var part = opts.move && S.code ? 'head' : undefined;
      S.restTok = (S.restTok || 0) + 1;
      l.classList.toggle('is-swap', !!opts.move && !reduced());
      var fill = function () { keepFocus(l, function () { l.innerHTML = listHtml(false, false, part); ruby(l); }); };
      if (!opts.move && motion('flip') && opts.flip !== false && !reduced()) { try { SM.motion.flip(l, fill, { selector: '.m-loc, .m-acell' }); } catch (e) { fill(); } }
      else fill();
      if (part) listRest(l, S.restTok);
      var nEl = l.querySelector('.m-count [data-n]');
      if (nEl && n0 != null && motion('odometer')) { var n1 = +nEl.getAttribute('data-n'); if (n1 !== n0) { try { SM.motion.odometer(nEl, n1, { from: n0 }); } catch (e) { } } }
    }
    var a = areaBy(S.code);
    var wrapIsl = S.root.querySelector('.m-mapwrap > .callout');
    var isl = a && a.group === 'islands';
    if (wrapIsl && !isl) wrapIsl.parentNode.removeChild(wrapIsl);
    if (isl) {
      var html = ui().callout(esc(t('map.islandsBody', { name: areaName(a) })), 'info', { title: t('map.islandsTitle') });
      var mw = S.root.querySelector('.m-mapwrap');
      if (wrapIsl) wrapIsl.outerHTML = html; else if (mw) mw.insertAdjacentHTML('beforeend', html);
    }
    zoomStack();
    var wrap = S.root.querySelector('.m-mapwrap');
    if (wrap) wrap.setAttribute('aria-label', t('map.mapLabel', { name: S.code ? placeName(S.code) : t('map.all') }));
    if (S.engine === 'gl' && GL.map && GL.state === 'ready') {
      if (opts.move) { GL.code = S.code; glSelectArea(true); }
      else glPins(opts.drop ? 'drop' : 'instant');
    } else if (S.engine === 'svg' && V.svg) {
      svgPaint(!!opts.move);
      if (opts.move) svgAnimateTo(targetVB(), function () { svgLayout(true); });
      else svgLayout(!!opts.drop);
    } else if (opts.move && S.root) {
      // still loading: keep the placeholder framed on the new choice
      var sv = S.root.querySelector('.m-svgwrap.is-ph .m-svg');
      if (sv) {
        sv.setAttribute('viewBox', phViewBox());
        Array.prototype.forEach.call(sv.querySelectorAll('.m-ward'), function (p) { p.classList.toggle('is-sel', p.getAttribute('data-code') === S.code); });
        var se = sv.querySelector('.m-sel'); if (se) se.setAttribute('d', selPath(S.code));
      }
    }
    setHash();
    motionMount(c); motionMount(l);
    if (opts.move || opts.drop) announce();
  }
  /* the rest of an area's list (section 02), in idle time after the flight */
  function listRest(l, tok) {
    var run = function () {
      if (tok !== S.restTok || !l.isConnected || l.querySelector('#m-g2')) return;
      var html = listHtml(false, false, 'rest'); if (!html) return;
      var n = l.children.length;
      l.insertAdjacentHTML('beforeend', html);
      for (var i = n; i < l.children.length; i++) ruby(l.children[i]);
    };
    var idle = window.requestIdleCallback ? function (f) { requestIdleCallback(f, { timeout: 1500 }); } : function (f) { setTimeout(f, 0); };
    setTimeout(function () { idle(run); }, reduced() || S.engine !== 'gl' ? 0 : 1100);
  }
  /* the zoom stack's 4th button follows the chosen area */
  function zoomStack() {
    var z = S.root && S.root.querySelector('.m-zoom'); if (!z) return;
    var old = z.querySelector('.m-zarea');
    if (old) old.parentNode.removeChild(old);
    if (S.code && !isIsland(S.code)) z.insertAdjacentHTML('beforeend', zareaHtml());
  }

  function setArea(code, o) {
    o = o || {};
    if (code === 'all' || !isCode(code)) code = null;
    wardAskClose();
    S.code = code; S.focus = null; S.showAll = false;
    peekClose(true);
    refresh({ move: true });
    if (o.fromMap) return;
    if (stage()) {
      // bring the map back into view: the flight is the answer to the tap
      var y = window.scrollY || 0, sn = snaps();
      if (y > sn.half + 8) scrollToY(o.fromList ? sn.peek : sn.half);
    }
  }

  function focusLoc(key, opts) {
    opts = opts || {};
    S.focus = key;
    unhide(byKey(key));
    refresh({ flip: false });
    var sel = '.m-loc[data-key="' + cssEsc(key) + '"]';
    var row = S.root && S.root.querySelector(sel);
    if (!row) { S.showAll = true; refresh({ flip: false }); row = S.root.querySelector(sel); }
    if (opts.scroll && row) {
      try { row.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }); } catch (e) { row.scrollIntoView(); }
      try { row.setAttribute('tabindex', '-1'); row.focus({ preventScroll: true }); } catch (e) { }
      // the row flashes a 6% ink wash (600ms) so the eye finds it
      if (!reduced()) anim(row, [{ backgroundColor: 'var(--wash)' }, { backgroundColor: 'var(--wash)', offset: 0.3 }, { backgroundColor: 'rgba(0,0,0,0)' }], { duration: 600, easing: 'linear', key: 'flash' });
    }
    if (opts.map) {
      if (S.engine === 'gl' && GL.state === 'ready') glFocus(key, { pulse: true, keyboard: opts.keyboard });
      else if (S.engine === 'svg') svgFocus(key, { pulse: true, keyboard: opts.keyboard });
    }
  }

  /* hover a row (desktop): its pin lights up */
  function hotPin(key) {
    var layer = S.engine === 'gl' ? GL.pinsEl : V.layer;
    if (!layer) return;
    Array.prototype.forEach.call(layer.querySelectorAll('.m-pin.is-hot'), function (p) { p.classList.remove('is-hot'); });
    if (!key) return;
    var el = null;
    if (S.engine === 'gl') { var p = pinOf(key); el = p && p.el; } else { var f = svgPinFor(key); el = f && f.el; }
    if (el) el.classList.add('is-hot');
  }

  /* ------------------------------------------------------------------ area picker sheet */
  function groupOf(code) { var a = isCity(code) && code.slice(0, 2) === '13' ? areaBy(code) : null; return a ? a.group : null; }
  /* v7: 都県 first (seven buttons, 東京 first), then that prefecture's 区市町村 (Tokyo: 23区 / 多摩 / 島しょ).
     The search looks through all of 関東. */
  function pickerHtml() {
    var U = ui(), mine = mineCode();
    var g0 = groupOf(S.code) || groupOf(mine) || '23ku';
    var p0 = prefOfCode(S.code) || prefOfCode(mine) || '13';
    function opt(code, title, sub, on) {
      return '<button type="button" class="m-pk-opt" data-act="map-area" data-code="' + esc(code) + '" aria-pressed="' + on + '" data-press>' +
        '<span class="m-pk-text"><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></span>' +
        (on ? '<span class="m-pk-on">' + esc(t('map.selected')) + '</span>' : arrow('r')) + '</button>';
    }
    var top = '<div class="m-pk-top">' +
      opt('all', t('map.all'), t('map.allSub'), !S.code) +
      (mine ? opt(mine, placeName(mine), t('map.yours'), S.code === mine) : '') + '</div>';
    var po = PREF_ORDER.filter(function (c) { return prefBy(c); });
    var prefs = '<div class="m-pk-prefs" role="group" aria-label="' + esc(t('map.prefs')) + '">' + po.map(function (pc) {
      var p = prefBy(pc), nm = lang() === 'en' ? p.en : (p.short || p.name);
      return '<button type="button" class="m-pk-pref" data-act="map-pk-pref" data-value="' + pc + '" aria-pressed="' + (pc === p0) + '" aria-label="' + esc(prefName(pc)) + '" data-press>' +
        '<span>' + esc(nm) + '</span>' + (pc === prefOfCode(mine) ? '<small>' + esc(t('map.yoursShort')) + '</small>' : '') + '</button>';
    }).join('') + '</div>';
    var cell = function (a) {
      return '<button type="button" class="m-pk-cell" data-act="map-area" data-code="' + a.code + '" aria-pressed="' + (a.code === S.code) + '" data-q="' + esc(kanaNorm(a.name + ' ' + a.kana + ' ' + a.en)) + '" data-press>' +
        '<span>' + esc(areaName(a)) + '</span>' + (a.code === mine ? '<small>' + esc(t('map.yoursShort')) + '</small>' : '') + '</button>';
    };
    var seg = U.seg ? '<div class="m-pk-seg">' + U.seg(['23ku', 'tama', 'islands'].map(function (k) {
      return { label: t('map.g.' + k), value: k, pressed: k === g0 };
    }), { act: 'map-pk-group', label: t('map.groups') }) + '</div>' : '';
    var body = po.map(function (pc) {
      var nm = prefName(pc);
      var groups = pc === '13' ? ['23ku', 'tama', 'islands'].map(function (gk) {
        var items = areas().filter(function (a) { return a.code.slice(0, 2) === '13' && a.group === gk; });
        return '<section class="m-pk-group" data-group="' + gk + '"><h3 class="m-pk-gtitle">' + esc(nm + (lang() === 'en' ? ' · ' : ' ') + t('map.g.' + gk)) + '</h3><div class="m-pk-grid">' + items.map(cell).join('') + '</div></section>';
      }).join('') : '<section class="m-pk-group" data-group="' + pc + '"><h3 class="m-pk-gtitle">' + esc(nm) + '</h3><div class="m-pk-grid">' +
        areas().filter(function (a) { return a.code.slice(0, 2) === pc; }).map(cell).join('') + '</div></section>';
      return '<section class="m-pk-pane" data-pref="' + pc + '" aria-label="' + esc(t('map.prefPlaces', { name: nm })) + '">' +
        '<div class="m-pk-popt">' + opt(pc, t('map.prefAll', { name: nm }), t('map.prefAllSub', { name: nm }), S.code === pc) + '</div>' +
        (pc === '13' ? seg : '') + groups + '</section>';
    }).join('');
    return '<div class="v-map m-pk" data-group="' + g0 + '" data-pref="' + p0 + '">' +
      (U.searchField ? U.searchField({ id: 'm-pk-q', placeholder: t('map.search'), label: t('map.search') }) : '<input id="m-pk-q" type="search">') +
      top + prefs + '<div class="m-pk-body">' + body + '<p class="m-pk-none" hidden>' + esc(t('map.noHit')) + '</p></div></div>';
  }
  /* what the picker shows: the chosen prefecture's pane (Tokyo: its chosen part), or every match of the search */
  function pkSync(pk) {
    var pf = pk.getAttribute('data-pref') || '13', g = pk.getAttribute('data-group') || '23ku', q = pk.classList.contains('is-search');
    Array.prototype.forEach.call(pk.querySelectorAll('.m-pk-pref'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === pf)); });
    Array.prototype.forEach.call(pk.querySelectorAll('.m-pk-seg [data-value]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === g)); });
    Array.prototype.forEach.call(pk.querySelectorAll('.m-pk-pane'), function (pane) {
      var mine = pane.getAttribute('data-pref') === pf, vis = 0;
      Array.prototype.forEach.call(pane.querySelectorAll('.m-pk-group'), function (s) {
        var on = q ? !!s.querySelector('.m-pk-cell:not([hidden])') : mine && (pf !== '13' || s.getAttribute('data-group') === g);
        s.hidden = !on; if (on) vis++;
      });
      pane.hidden = !vis;
    });
  }
  function pkGroup(pk, g) { pk.setAttribute('data-group', g); pkSync(pk); }
  function openPicker() {
    if (!SM.sheet) return;
    SM.sheet(pickerHtml(), {
      title: t('map.pick'), cls: 'm-pk-sheet',
      mount: function (dlg) {
        var q = dlg.querySelector('#m-pk-q'), pk = dlg.querySelector('.m-pk');
        if (!q || !pk) return;
        pkSync(pk);
        q.addEventListener('input', function () {
          var v = kanaNorm(q.value).replace(/[区市町村]$|(く|し|まち|むら)$/, '');
          var any = false;
          pk.classList.toggle('is-search', !!v);
          Array.prototype.forEach.call(pk.querySelectorAll('.m-pk-cell'), function (b) {
            var ok = !v || b.getAttribute('data-q').indexOf(v) >= 0;
            b.hidden = !ok; if (ok && v) any = true;
          });
          pkSync(pk);
          ['.m-pk-top', '.m-pk-prefs', '.m-pk-seg'].forEach(function (sel) { var el = pk.querySelector(sel); if (el) el.hidden = !!v; });
          Array.prototype.forEach.call(pk.querySelectorAll('.m-pk-popt'), function (el) { el.hidden = !!v; });
          var none = pk.querySelector('.m-pk-none'); if (none) none.hidden = !v || any;
        });
      }
    });
  }

  /* ------------------------------------------------------------------ acts */
  if (SM.on) {
    SM.on('map-pick', function () { openPicker(); });
    SM.on('map-pk-group', function (el) {
      var pk = el.closest && el.closest('.m-pk'); if (!pk) return;
      pkGroup(pk, el.getAttribute('data-value') || '23ku');
    });
    SM.on('map-pk-pref', function (el) {
      var pk = el.closest && el.closest('.m-pk'); if (!pk) return;
      pk.setAttribute('data-pref', el.getAttribute('data-value') || '13');
      pkSync(pk);
    });
    SM.on('map-area', function (el) {
      var code = el.getAttribute('data-code');
      var fromSheet = !!(el.closest && el.closest('.m-pk'));
      var fromCtl = !!(el.closest && el.closest('.m-controls'));
      var root0 = S.root;
      var apply = function () {
        if (!S.root || S.root !== root0 || !S.root.isConnected) return;
        setArea(code, { fromList: !fromSheet && !fromCtl });
        if (fromSheet || fromCtl) {
          var pk = S.root && S.root.querySelector('.m-picker');
          if (pk && document.activeElement !== pk) { try { pk.focus({ preventScroll: true }); } catch (e) { } }
        } else if (focusLost()) focusTo(S.root && S.root.querySelector('#m-list h2'));   // an area cell in the list
        if (stage() && (fromSheet || fromCtl)) {
          var y = window.scrollY || 0;
          if (y > snaps().half + 8) scrollToY(0);
        }
      };
      if (fromSheet && SM.closeSheet) {
        SM.closeSheet({ noFocus: true });
        var pk0 = S.root && S.root.querySelector('.m-picker');
        if (pk0) { try { pk0.focus({ preventScroll: true }); } catch (e) { } }
        /* the sheet leaves first; the area change (list re-render + the camera flight) starts as it clears the
           map. In the same task, that work held the sheet's first frames (≈120ms at 1x, ≈470ms at 4x CPU) and
           the flight ran hidden behind it (INTEGRATOR). */
        if (!reduced()) { setTimeout(apply, 180); return; }
      }
      apply();
    });
    /* the chip row is rendered anew on a filter change: the pressed fill would cut from one chip to the other. The
       old pressed chip fades from ink back to its rest look and the new one from its rest look into ink (160ms),
       each from the colours read off the chip before the row was replaced. */
    function chipLook(cat) {
      var b = S.root && S.root.querySelector('.m-cats [data-cat="' + (cat || '') + '"]');
      if (!b) return null;
      try { var cs = getComputedStyle(b); return { backgroundColor: cs.backgroundColor, color: cs.color, boxShadow: cs.boxShadow }; } catch (e) { return null; }
    }
    function chipShift(from, to, looks) {
      if (reduced() || from === to) return;
      [[from, looks[0]], [to, looks[1]]].forEach(function (x) {
        var b = S.root && S.root.querySelector('.m-cats [data-cat="' + (x[0] || '') + '"]');
        if (b && x[1]) { var k = x[1]; k.offset = 0; anim(b, [k], { duration: 160, easing: 'cubic-bezier(0.2, 0, 0, 1)' }); }
      });
    }
    SM.on('map-cat', function (el) {
      var c = el.getAttribute('data-cat') || null;
      var was = S.cat;
      S.cat = (S.cat === c) ? null : c;
      var looks = [chipLook(was), chipLook(S.cat)];
      store('mapCat', S.cat);
      if (S.focus) { var fr = byKey(S.focus); if (!fr || !catMatch(fr)) peekClose(); }
      refresh({ drop: true });
      chipShift(was, S.cat, looks);
      var btn = S.root && S.root.querySelector('.m-cats [data-cat="' + (S.cat || '') + '"]');
      if (btn) { try { btn.focus({ preventScroll: true }); } catch (e) { } }
    });
    SM.on('map-jr', function (el) {
      var v = el.getAttribute('data-value');
      S.jr = v === 'all' ? false : null;
      store('mapJr', S.jr === false ? false : null);
      if (S.focus) { var fr = byKey(S.focus); if (!fr || !catMatch(fr)) peekClose(); }
      refresh({ drop: true });
      var btn = S.root && S.root.querySelector('.m-jr [data-value="' + v + '"]');
      if (btn) { try { btn.focus({ preventScroll: true }); } catch (e) { } }
    });
    SM.on('map-zoom', function (el) {
      var dir = el.getAttribute('data-dir') === 'in' ? 1 : -1;
      if (S.engine === 'gl' && GL.map) {
        var m = GL.map, z = clamp(m.getZoom() + dir, m.getMinZoom(), m.getMaxZoom());
        if (reduced()) m.jumpTo({ zoom: z }); else m.easeTo({ zoom: z, duration: 300, easing: EASE_STD });
        return;
      }
      if (!V.vb) return;
      var f = dir > 0 ? 1 / 1.7 : 1.7, v = V.vb;
      var w = v[2] * f, h = v[3] * f, cx = v[0] + v[2] / 2, cy = v[1] + v[3] / 2;
      svgAnimateTo([cx - w / 2, cy - h / 2, w, h]);
    });
    SM.on('map-fit', function () {
      peekClose();
      if (S.engine === 'gl' && GL.map) {
        var mb = kb('all'), cam = cameraFor({ b: [[mb[0], mb[1]], [mb[2], mb[3]]], max: 12 });
        if (cam) glMove(cam.center, cam.zoom, {});
        return;
      }
      if (V.vb) svgAnimateTo(fitAspect(fullVB(), 0.04));
    });
    SM.on('map-fit-area', function () {
      peekClose();
      if (S.engine === 'gl' && GL.map) { var cam = cameraFor(targetBounds()); if (cam) glMove(cam.center, cam.zoom, {}); return; }
      if (V.vb) svgAnimateTo(targetVB());
    });
    SM.on('map-more', function () {
      var n0 = S.root ? S.root.querySelectorAll('#m-list .m-loc').length : 0;
      S.showAll = true; refresh();
      if (focusLost() && S.root) { var rows = S.root.querySelectorAll('#m-list .m-loc'); focusTo(rows[n0] || rows[0], true); }
    });
    SM.on('map-peek-close', function () { peekClose(); });
    SM.on('map-ask', function (el) {
      var code = el.getAttribute('data-code');
      wardAskClose();
      if (code && code !== S.code) setArea(code, { fromMap: true });
    });
    SM.on('map-pin', function (el, ev) {
      var key = el.getAttribute('data-key'); if (!key) return;
      if (S.engine === 'gl' && (GL.dragging || now() - (GL.dragAt || 0) < 250)) return;
      wardAskClose();
      var kb = !!(ev && ev.detail === 0);
      var m = null, z = 0;
      if (S.engine === 'gl') {
        var p = GL.pins[key]; if (!p) return;
        if (p.it.chip) { chipGo(p.it); return; }
        m = p.it.m;
        if (m.length > 1) {
          // zoom to where this cluster splits (or list them when they share one spot)
          var map = GL.map, lv = GL.level, zz = lv + 1;
          while (zz <= MAXZ && GL.idx.levels[zz].some(function (it) { return it.key === key; })) zz++;
          var xs = m.map(function (r) { return lngX(r.loc.lng); }), ys = m.map(function (r) { return latY(r.loc.lat); });
          var spread = Math.max(Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys));
          if (zz > MAXZ || spread * 512 * Math.pow(2, map.getMaxZoom()) < 24) { S.focus = m[0].key; peekShow(m, { key: null, keyboard: kb }); markSel(); return; }
          z = Math.min(map.getMaxZoom(), zz + 0.25);
          peekClose(true);
          // the tapped cluster lets go as the camera starts (120ms), so it never stands over the places that split
          // out of it; if the move ends with it still on the map (nothing split), it comes back
          if (!reduced() && p.el.firstElementChild) {
            p.away = true;
            anim(p.el.firstElementChild, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)', fill: 'forwards', key: 'pin' });
            setTimeout(function () {
              if (GL.pins[key] !== p || !p.away) return;
              p.away = false;
              anim(p.el.firstElementChild, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'cubic-bezier(0, 0, 0.2, 1)', key: 'pin' });
            }, 480 + 400);
          }
          glMove({ lng: p.it.lng, lat: p.it.lat }, z, { duration: 480 });
          return;
        }
        S.focus = m[0].key;
        unhideRow(S.focus);
        peekShow(m, { key: S.focus, keyboard: kb });
        markSel();
        glFocusCamera(S.focus, { ease: true, zoom: GL.map.getZoom() });
      } else {
        var f = null;
        V.clusters.forEach(function (c, i) { if (V.layer.children[i] === el) f = c; });
        if (!f) return;
        if (f.m.length > 1) {
          var xs2 = f.m.map(function (r) { return r.x; }), ys2 = f.m.map(function (r) { return r.y; });
          var x0 = Math.min.apply(null, xs2), y0 = Math.min.apply(null, ys2), x1 = Math.max.apply(null, xs2), y1 = Math.max.apply(null, ys2);
          if (Math.max(x1 - x0, y1 - y0) > 0.6 && V.vb[2] > minW() * 1.05) {
            var sz = Math.max(x1 - x0, y1 - y0, minW() / 1.6);
            peekClose(true);
            svgAnimateTo(fitAspect([(x0 + x1) / 2 - sz / 2, (y0 + y1) / 2 - sz / 2, sz, sz], 0.35), function () { svgLayout(true); });
            return;
          }
          peekShow(f.m, { keyboard: kb }); return;
        }
        S.focus = f.m[0].key;
        Array.prototype.forEach.call(V.layer.querySelectorAll('.m-pin'), function (x) { x.classList.remove('is-sel'); x.removeAttribute('aria-current'); });
        el.classList.add('is-sel'); el.setAttribute('aria-current', 'true');
        unhideRow(S.focus);
        peekShow(f.m, { key: S.focus, keyboard: kb });
      }
      if (motion('pulse') && el.firstElementChild) { try { SM.motion.pulse(el.firstElementChild); } catch (e) { } }
      setHash();
    });
    SM.on('map-tolist', function (el) {
      var key = el.getAttribute('data-key');
      var pe = peekEl(); if (pe && pe._dragAt && now() - pe._dragAt < 350 && pe.contains(el)) return;
      peekClose(true);
      focusLoc(key, { scroll: true });
    });
    SM.on('map-show', function (el, ev) {
      var key = el.getAttribute('data-key');
      revealMap();
      if (!stage()) {
        var wrap = S.root && S.root.querySelector('.m-mapwrap');
        if (wrap && !wide()) { try { wrap.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }); } catch (e) { } }
      }
      focusLoc(key, { map: true, keyboard: !!(ev && ev.detail === 0) });
    });
    SM.on('map-sheet', function (el) {
      if (el._skipClick) return;
      var y = window.scrollY || 0, sn = snaps();
      scrollToY(y >= sn.full - 24 ? sn.peek : sn.full);
    });
    SM.on('map-tomap', function () { scrollToY(snaps().half); });
    SM.on('map-skip', function (el, ev) {
      if (ev) ev.preventDefault();
      var l = S.root && S.root.querySelector('#m-list');
      if (!l) return;
      if (stage()) scrollToY(snaps().full);
      focusTo(l.querySelector('h2') || l);
    });
  }
  /* a chip: an area chip chooses that 区市町村 (or frames it again), a region chip frames its 区市町村 */
  function chipGo(it) {
    var map = GL.map; if (!map) return;
    if (it.chip === 'area') {
      if (it.code !== S.code) { setArea(it.code, { fromMap: true }); return; }
      var c0 = cameraFor(targetBounds()); if (c0) glMove(c0.center, c0.zoom, {});
      return;
    }
    var b = null;
    // a prefecture chip frames its prefecture (its 区市町村 chips, or Tokyo's four parts, take over)
    if (it.pref) {
      var pb = SM.mapStyle.areaBounds(it.pref); if (!pb) return;
      var pcam = cameraFor({ b: [[pb[0], pb[1]], [pb[2], pb[3]]], max: 10 });
      if (pcam) glMove(pcam.center, Math.max(pcam.zoom, (it.pref === '13' ? CHIP_L : REGION_L) + 0.05), {});
      return;
    }
    regionCodes(it.region).forEach(function (c) {
      var x = SM.mapStyle.areaBounds(c); if (!x) return;
      b = b ? [Math.min(b[0], x[0]), Math.min(b[1], x[1]), Math.max(b[2], x[2]), Math.max(b[3], x[3])] : x.slice();
    });
    if (!b) return;
    var cam = cameraFor({ b: [[b[0], b[1]], [b[2], b[3]]], max: 11 });
    if (cam) glMove(cam.center, Math.max(cam.zoom, CHIP_L + 0.05), {});
  }
  function unhideRow(key) {
    Array.prototype.forEach.call(S.root ? S.root.querySelectorAll('.m-loc.is-focus') : [], function (x) { x.classList.remove('is-focus'); });
    var row = S.root && S.root.querySelector('.m-loc[data-key="' + cssEsc(key) + '"]');
    if (row) {
      row.classList.add('is-focus');
      var d = row.querySelector('.m-more'); void d;
      // FIX-B (motion): the row answers the pin — its mark and name slide in from the focus bar while the pin pulses
      if (!reduced()) anim(row, [{ transform: 'translateX(10px)', opacity: 0.55 }, { transform: 'none', opacity: 1 }], { spring: 'rise', key: 'row-lift' });
      if (wide()) { try { row.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' }); } catch (e) { } }
    }
  }

  /* ------------------------------------------------------------------ mount */
  /* the list arrives after the map: phone, the sheet springs up from under the frame; desktop, the column
     slides in. Transform + opacity only, fill backwards (no JS: nothing is ever hidden) */
  function sheetIn(root) {
    var el = stage() ? root.querySelector('.m-panel') : root.querySelector('#m-list');
    if (!el) return;
    if (stage()) anim(el, [{ transform: 'translateY(72px)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { spring: 'rise', delay: 240, fill: 'backwards', key: 'sheet-in' });
    else anim(el, [{ transform: 'translateX(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 460, easing: (SM.motion.tokens && SM.motion.tokens.ease && SM.motion.tokens.ease.expo) || 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 200, fill: 'backwards', key: 'sheet-in' });
  }
  function mount(root) {
    if (S.off) { try { S.off(); } catch (e) { } S.off = null; }
    var gen = ++S.gen;
    S.root = root;
    S.frame = root.querySelector('#m-map');
    G.tomap = false; G.above = 0;
    wardAskClose();
    // a place card belongs to the old page
    var list = root.querySelector('#m-list');
    if (list) {
      list.addEventListener('mouseover', function (ev) { var r = ev.target.closest && ev.target.closest('.m-loc'); hotPin(r ? r.getAttribute('data-key') : null); });
      list.addEventListener('mouseleave', function () { hotPin(null); });
    }
    stageBind(root);
    sheetIn(root);
    // FIX-B (F17): a wrong deep link — put the address right and say what is shown instead
    if (S.bad) {
      var bad = S.bad; S.bad = null;
      after(function () {
        if (gen !== S.gen || !root.isConnected) return;
        setHash();
        if (SM.toast) { try { SM.toast(t(bad === 'area' ? 'map.badArea' : 'map.badPlace')); } catch (e) { } }
      });
    }
    // the rest of the list (render() returned its first screen only)
    after(function () {
      if (gen !== S.gen || !root.isConnected) return;
      var l = root.querySelector('#m-list');
      if (l) { l.innerHTML = listHtml(); ruby(l); motionMount(l); }
    });
    if (!S.frame) return;
    var frame = S.frame;
    // Esc closes the place card wherever focus is (a tapped pin may have been redrawn, leaving focus on <body>);
    // an open sheet or a text field keeps its own Esc
    var onEsc = function (e) {
      if ((e.key !== 'Escape' && e.key !== 'Esc') || e.defaultPrevented || !frame.isConnected || !peekOpen()) return;
      if (SM.sheetOpen && SM.sheetOpen()) return;
      var a = document.activeElement;
      if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')) return;
      peekClose();
    };
    document.addEventListener('keydown', onEsc);
    var offEsc = S.off;
    S.off = function () { if (offEsc) offEsc(); document.removeEventListener('keydown', onEsc); };

    // engine: decided once. The live MapLibre map (if any) moves into this frame right away (no layout read).
    if (S.engine == null) S.engine = hasWebGL() ? 'gl' : 'svg';
    if (S.engine === 'gl' && GL.state === 'ready' && GL.el) glAttach(S.frame);
    if (S.engine === 'gl' && GL.pinsEl) GL.pinsEl.classList.remove('has-sel');
    var routeFocus = S.focus;

    after(function () {
      if (gen !== S.gen || !root.isConnected) return;
      stageMeasure();
      if (S.engine === 'svg') { svgMount(root); return; }
      glResizeObserve(S.frame);
      if (GL.state === 'ready' && GL.map) {
        GL.w = 0; GL.h = 0;
        var slot = S.frame.querySelector('.m-gl-slot');
        GL.w = slot.clientWidth; GL.h = slot.clientHeight;
        frameShort(GL.h);
        try { GL.map.resize(); } catch (e) { }
        // the page transition hides the canvas while the old page is captured (motion.js); it was detached at
        // that moment, so nothing brought it back: a return visit showed pins on a blank map
        try { GL.map.getCanvas().style.visibility = ''; GL.map.triggerRepaint(); } catch (e) { }
        GL.scaleZ = -1; paintScale();
        if (GL.pinsEl) GL.pinsEl.classList.remove('is-away');
        S.focus = routeFocus;
        // back on the map: the pins drop again and the camera settles in from a little further out
        var settle = !routeFocus && GL.code === S.code && !reduced() && !(S.root && S.root.querySelector('.m-loc.is-focus'));
        // FIX-B (S7): a return visit holds the detail feed until the camera has rested 600ms (it froze the settle)
        GL.restUntil = now() + 1300;
        glSync({ route: true, drop: !routeFocus });
        if (!routeFocus) markSel();
        if (settle) {
          var m0 = GL.map, c0 = m0.getCenter(), z0 = m0.getZoom();
          m0.jumpTo({ center: c0, zoom: Math.max(m0.getMinZoom(), z0 - 0.4) });
          glMove(c0, z0, { ease: true, duration: 700, hidePins: true, done: function () { glPins('instant'); } });
        }
      } else if (GL.state === 'failed') {
        S.engine = 'svg'; glFail();
      } else {
        // first visit, or still loading from an earlier one: this mount takes the start over
        loadStart(S.frame);
        glStart(gen);
        // a place outside Tokyo: its 区市町村 join the placeholder when geo-kanto.js is in (Tokyo never needs it)
        if (S.code && S.code.slice(0, 2) !== '13') geoMore().then(function () { if (gen === S.gen && root.isConnected && root.querySelector('.m-svgwrap.is-ph')) svgAddWards(root); });
      }
    });
  }

  SM.views.map = {
    tab: 'map',
    title: { ja: 'マップ', en: 'Map' },
    render: render,
    mount: mount
  };
  /* for tests and the integrator: the live map (or null), the engine, the state */
  SM.mapView = {
    map: function () { return GL.map; },
    engine: function () { return S.engine; },
    state: function () { return GL.state; },
    pins: function () { return Object.keys(GL.pins).length; },
    timing: function () { return TM; }
  };
})();
