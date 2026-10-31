/* 巣立ちマップ — data/map/style.js
   Recommended MapLibre style + small offline helpers for the baked map data
   (data/map/base.js, detail.js, towns.js, streets/<code>.js).
   Classic script, no network: every source is an in-memory GeoJSON object from SM.data.mapLayers, labels are drawn
   with a local font through MapLibre's TinySDF path (no glyph server), icons are drawn on a canvas, and the lazy
   files are added as <script> tags (works on file:// with script-src 'self').

   Use:
     SM.mapStyle.prepare(maplibregl)                       // once, before new maplibregl.Map
     var map = new maplibregl.Map(Object.assign({ container, style: SM.mapStyle.build({ lang: 'ja', theme: 'light' }),
                 localIdeographFontFamily: SM.mapStyle.fontFamily, maxBounds: SM.data.mapMeta.maxBounds },
                 SM.mapStyle.mapOptions));
     SM.mapStyle.attach(map, { theme: 'light' })           // local glyphs for all scripts, station icons, LOD loading
     SM.mapStyle.select(map, '13120')                      // highlight an area (null clears)
   See data/map/README.md for the layer schema and the reasoning behind each choice.

   Round 3 (FIXER-map-1):
   - detail.js layers are decoded lazily, one per task, and fed while the camera rests (no 0.9 s block at 4x CPU);
     until a detail layer is in, the overview layer stands in at every zoom ("pre-*" layers), so an area view never
     opens without its rivers, parks and main roads and the swap reads as a sharpening, not a pop.
   - label data cleanup at runtime: GSI notation such as 六義園(特) / 小金井(サクラ) is stripped, orphan "(…)" names
     dropped, the big rivers are named along their courses from z11 (the -90° river-mouth duplicates are gone).
   - subway-only stations get a grey square and a quieter label (JR / private / subway hierarchy).
   - the selected area's tint fades out as you zoom in (parks stay readable), parks one step darker.
   - maxZoom 16 (the data is z14), platform bars capped, 町・丁目 names (towns.js) from z13.5.

   Round 3b (FIXER-map-2):
   - station squares are placed before every label (just under map.js's pin proxies): names step around them
     instead of printing under a square; each station's own name sits on a slightly wider near ring.
   - the ten anchor stations show from the whole-Tokyo view (z7.6); a few landmarks (東京タワー, 都庁 …) from z11.5.
   - residential streets keep a visible casing through z14–15 (no z14.5 fade-out); maxZoom 15.5 (no buildings in
     the data, so z16 was a near-empty map).
   - AA contrast for area / town / water / park names; opts.big (設定 › 文字を大きく) scales every label 1.2×.
   - GeoJSON sources carry a maxzoom that matches their data, so the worker cuts fewer tiles in pinches and flights.
   - station romanizations and the 羽田空港第3ターミナル label fixed at load; 上野恩賜公園 duplicate dropped.

   v8 (WARDS): the 44 wards of 横浜・川崎・相模原・さいたま・千葉. kanto.js carries their label points (K.wardLabels) and
   bounds (meta.wardBounds); a prefecture file carries the 25 m polygons (P.wards), the inner ward lines (P.wardBorders)
   and the same labels. Sources kWards (promoteId code: feature-state sel / hov like `areas`), kWardBorders, kWardLabels;
   layers ward-sel, border-ward (z ≥ 9.4, under the 区市町村 lines), ward-sel-line / ward-hov-line, label-ward (z ≥ 9.6,
   where the five cities' own names step back: `hz`), label-ward-sel. select(map, '14101') and areaBounds('14101') work
   like a 区市町村's; SM.mapStyle.isWard(code). */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};

  var FONT = '"IBM Plex Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic UI", "Meiryo", sans-serif';
  var EMPTY = { type: 'FeatureCollection', features: [] };

  /* Palettes. Light follows VISUAL-SPEC §7.10 (land, water, parks, JR convention, borders, --action-tint selection);
     dark is the opt-in 暗い画面 variant. */
  var PAL = {
    light: {
      land: '#F7F6F2', blocks: '#F1EFE9', outside: '#ECEAE3', outsideOpacity: 0.72,
      water: '#D3E3EF', waterLine: '#B4CEE3', waterText: '#3D5F80',
      park: '#D3E6CB', forest: '#E3ECDB', farm: '#EEF0E3', greenText: '#43603A',
      road: '#FFFFFF', roadCase: '#CCC6B8', trunkCase: '#BDB6A5', motor: '#F8EDD6', motorCase: '#D2BC92',
      streetTexture: '#E5E2D9', streetCase: '#D6D1C5', street: '#FFFFFF',
      tunnel: '#CFCABE',
      jr: '#1B1B19', jrDash: '#FFFFFF', rail: '#5E5D57', subway: '#9C9A92', tram: '#8C8A83',
      platform: '#FFFFFF',
      border: '#9C9A92', pref: '#8A877E',
      selFill: '#E3F0E8', selLine: '#1B1B19',
      text: '#1B1B19', text2: '#5E5D57', text3: '#6B6962', town: '#6E6C65', halo: '#FFFFFF',
      station: '#FFFFFF', stationLine: '#1B1B19'
    },
    dark: {
      land: '#1C1C1A', blocks: '#20201E', outside: '#121211', outsideOpacity: 0.66,
      water: '#1F2E3A', waterLine: '#2D4354', waterText: '#8FB0CC',
      park: '#26361F', forest: '#202B1D', farm: '#24271E', greenText: '#98B48D',
      road: '#3A3935', roadCase: '#2A2A27', trunkCase: '#2A2A27', motor: '#4B4436', motorCase: '#2E2A22',
      streetTexture: '#292926', streetCase: '#262624', street: '#333230',
      tunnel: '#3A3935',
      jr: '#D8D6CE', jrDash: '#1C1C1A', rail: '#A4A29A', subway: '#6B6962', tram: '#77756E',
      platform: '#1C1C1A',
      border: '#6B6962', pref: '#86847C',
      selFill: '#15291F', selLine: '#F2F0E8',
      text: '#F2F0E8', text2: '#C2C0B8', text3: '#A3A198', town: '#8F8D85', halo: '#1C1C1A',
      station: '#1C1C1A', stationLine: '#F2F0E8'
    }
  };

  function z(stops) { return ['interpolate', ['exponential', 1.5], ['zoom']].concat(stops); }
  function minz() { return ['>=', ['zoom'], ['coalesce', ['get', 'minz'], 0]]; }
  function inT(a, b) { return ['case', ['==', ['get', 't'], 1], a, b]; }
  function byW(w0, w1, w2) { return ['match', ['get', 'w'], 0, w0, 1, w1, w2]; }
  function ctx(v) { return ['case', ['==', ['get', 'c'], 1], v * 0.55, v]; }
  var SUB = ['==', ['get', 'sub'], 1];

  /* -------- data helpers */
  function layers() { return SM.data.mapLayers || {}; }
  /* a detail layer, decoded on first use (detail.js wraps each one in a function) */
  function layer(n) {
    var L = layers();
    if (!L[n] && L._lazy && typeof L._lazy[n] === 'function') { var f = L._lazy[n]; delete L._lazy[n]; L[n] = f(); if (n === 'roads' && KX.merged) retag(L[n]); if (n === 'green' && KX.merged) kGreen(L[n]); }
    return L[n] || null;
  }

  /* -------- 関東 (v7): data/map/kanto.js (eager: prefectures, 区市町村 at 200 m, sea, 高速, rail, main stations) and
     data/map/kanto/<pref>.js (lazy, one per prefecture: 区市町村 at 25 m, borders, water, roads, streams, stations).
     Tokyo keeps its own detail (base.js / detail.js / streets): base features outside Tokyo but inside Kanto turn
     from context (t 0, faint, under the mask) into map (t 1), and every other prefecture's features go to their own
     "k-*" sources, drawn by a copy of each base layer right above it (a pref file's setData never re-sends Tokyo). */
  var KX = { merged: false, loaded: {}, base: null, ring: null, box: null };
  var KSRC = ['borders', 'waterLo', 'roadsLo', 'rail', 'stations', 'water', 'coast', 'streams', 'roads', 'stationLines', 'labels'];
  function KD() { return SM.data.mapKanto || null; }
  function KM() { return SM.data.mapKantoMeta || null; }
  function KP() { return SM.data.mapKantoPref || {}; }
  function fc(list) { return { type: 'FeatureCollection', features: list }; }
  /* inside Kanto: the outline is Kanto's land padded by 1.5 km (178 points, ray casting after a box test) */
  function inKanto(x, y) {
    if (!KX.ring) {
      var K = KD(), g = K && K.outline && K.outline.features[0] && K.outline.features[0].geometry;
      if (!g) return false;
      KX.ring = g.type === 'Polygon' ? g.coordinates : g.coordinates[0];
      var b = [180, 90, -180, -90];
      KX.ring[0].forEach(function (c) { if (c[0] < b[0]) b[0] = c[0]; if (c[1] < b[1]) b[1] = c[1]; if (c[0] > b[2]) b[2] = c[0]; if (c[1] > b[3]) b[3] = c[1]; });
      KX.box = b;
    }
    var B = KX.box; if (x < B[0] || x > B[2] || y < B[1] || y > B[3]) return false;
    var inside = false;
    KX.ring.forEach(function (r) {
      for (var i = 0, j = r.length - 1; i < r.length; j = i++) {
        var xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
      }
    });
    return inside;
  }
  function midOf(g) {
    var c = g && g.coordinates; if (!c) return null;
    if (g.type === 'Point') return c;
    if (g.type === 'MultiLineString' || g.type === 'Polygon') c = c[0];
    else if (g.type === 'MultiPolygon') c = c[0][0];
    return c && c.length ? c[Math.floor(c.length / 2)] : null;
  }
  /* context features (t 0) that lie in Kanto become map features (t 1), once per collection */
  function retag(col) {
    if (!col || col._smK || !KD()) return;
    col._smK = true;
    col.features.forEach(function (f) {
      var p = f.properties; if (!p || p.t !== 0) return;
      var m = midOf(f.geometry); if (m && inKanto(m[0], m[1])) p.t = 1;
    });
  }
  /* green: Tokyo's only (the forests around it stopped at the edge of the old context box, a straight line across
     埼玉 and 群馬 once the map covers all of 関東) — the overview polygons by their box centre in Tokyo, the detail
     ones without their context forests (ctx 1) */
  function inGeom(g, x, y) {
    var polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates, inside = false;
    polys.forEach(function (rings) {
      rings.forEach(function (r) {
        for (var i = 0, j = r.length - 1; i < r.length; j = i++) {
          var xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
          if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
      });
    });
    return inside;
  }
  function kGreen(col) {
    if (!col || col._smK) return;
    col._smK = true;
    col.features = col.features.filter(function (f) { return f.properties.ctx !== 1; });
  }
  function kMerge() {
    var K = KD(), M = KM(), L = layers();
    if (KX.merged || !K || !M || !L.areas || !L.areaLabels) return;
    KX.merged = true;
    KX.base = { areas: L.areas.features, areaLabels: L.areaLabels.features };
    ['rail', 'stationLines', 'roadsLo', 'labels', 'roads'].forEach(function (n) { if (L[n]) retag(L[n]); });
    // the context stations around Tokyo and the context prefecture lines: kanto.js has all of them, as map features
    if (L.stations) L.stations = fc(L.stations.features.filter(function (f) { return f.properties.t !== 0; }));
    if (L.borders) L.borders = fc(L.borders.features.filter(function (f) { return !(f.properties.k === 'pref' && f.properties.t === 0); }));
    L.mask = K.mask;
    var tk = prefFeatures('13')[0];
    if (tk && L.greenLo) L.greenLo = fc(L.greenLo.features.filter(function (f) {
      var b = [180, 90, -180, -90];
      (function walk(a) { if (typeof a[0] === 'number') { if (a[0] < b[0]) b[0] = a[0]; if (a[1] < b[1]) b[1] = a[1]; if (a[0] > b[2]) b[2] = a[0]; if (a[1] > b[3]) b[3] = a[1]; } else a.forEach(walk); })(f.geometry.coordinates);
      return inGeom(tk.geometry, (b[0] + b[2]) / 2, (b[1] + b[3]) / 2);
    }));
    if (L.green) kGreen(L.green);
    var meta = SM.data.mapMeta;
    if (meta) { meta.maxBounds = M.maxBounds; meta.kantoBounds = M.bounds; }
    mapOptions.minZoom = 5.8;   // all of 関東 fits a 320px phone frame
    kAreas();
  }
  /* the 区市町村 polygons: Tokyo's + each prefecture's, at 25 m once its file is in (200 m before) */
  function kAreas() {
    var K = KD(), P = KP(), L = layers(), a = KX.base.areas.slice();
    K.areas.features.forEach(function (f) { if (!KX.loaded[f.properties.p]) a.push(f); });
    Object.keys(KX.loaded).sort().forEach(function (pc) { if (P[pc] && P[pc].areas) Array.prototype.push.apply(a, P[pc].areas.features); });
    L.areas = fc(a);
    L.areaLabels = fc(KX.base.areaLabels.concat(K.areaLabels.features));
    // v8: a 政令市's own name steps back where its wards are named (label-ward from WARD_Z)
    if (K.wardLabels && !K._smHz) {
      K._smHz = true;
      var parents = {};
      K.wardLabels.features.forEach(function (f) { parents[f.properties.parent] = 1; });
      K.areaLabels.features.forEach(function (f) { if (parents[f.properties.code]) f.properties.hz = WARD_Z; });
    }
  }
  var WARD_Z = 9.6;
  /* v8: a ward of a 政令市 (its bounds are in kanto.js's meta) */
  function isWardCode(code) { var M = KM(); return !!(code && M && M.wardBounds && M.wardBounds[code]); }
  function wardsOn() { var K = KD(); return !!(KX.merged && K && K.wardLabels); }
  /* a k-* source: kanto.js's own part + the loaded prefectures' parts (their 25 m prefecture lines replace the 80 m ones) */
  function kData(n) {
    var K = KD(), P = KP(), out = [];
    if (!K || !KX.merged) return EMPTY;
    if (K[n]) out = n === 'borders' ? K[n].features.filter(function (f) { return !KX.loaded[f.properties.p]; }) : K[n].features.slice();
    Object.keys(KX.loaded).sort().forEach(function (pc) { var x = P[pc] && P[pc][n]; if (x) Array.prototype.push.apply(out, x.features); });
    return fc(out);
  }
  function isPref(code) { return typeof code === 'string' && /^\d\d$/.test(code); }
  /* [w,s,e,n] of all of Kanto ('all'), a prefecture ('14') — null when kanto.js is not there */
  function kBounds(code) {
    var M = KM(); if (!M) return null;
    if (!code || code === 'all') return M.bounds.slice();
    return M.prefBounds && M.prefBounds[code] ? M.prefBounds[code].slice() : null;
  }
  /* a prefecture's outline (for the drawn selection border) */
  function prefFeatures(code) {
    var K = KD(); if (!K || !K.prefs) return [];
    return K.prefs.features.filter(function (f) { return f.properties.code === code; });
  }
  /* GSI cartographic notation and duplicates, cleaned once (875 points, < 1 ms) */
  var BIG_RIVERS = { '荒川': 11, '隅田川': 11, '多摩川': 11, '江戸川': 11, '中川': 11, '神田川': 12 };
  /* the places young people find their way by (the GSI 注記 has only 皇居): name, en, lng, lat, minz */
  var LANDMARKS = [
    ['東京タワー', 'Tokyo Tower', 139.7454, 35.6586, 11.5], ['東京スカイツリー', 'Tokyo Skytree', 139.8107, 35.7101, 11.5],
    ['東京都庁', 'Tokyo Metropolitan Govt.', 139.6917, 35.6896, 11.5], ['浅草寺', 'Senso-ji', 139.7967, 35.7148, 12],
    ['明治神宮', 'Meiji Jingu', 139.6993, 35.6764, 12], ['東京ドーム', 'Tokyo Dome', 139.7519, 35.7056, 12],
    ['国会議事堂', 'National Diet', 139.7449, 35.6759, 12.5], ['国立競技場', 'National Stadium', 139.7146, 35.6778, 12.5],
    ['サンシャイン60', 'Sunshine 60', 139.7190, 35.7289, 12.5], ['六本木ヒルズ', 'Roppongi Hills', 139.7292, 35.6604, 13],
    ['両国国技館', 'Ryogoku Kokugikan', 139.7932, 35.6969, 13], ['日本武道館', 'Nippon Budokan', 139.7499, 35.6933, 13],
    ['東京ビッグサイト', 'Tokyo Big Sight', 139.7946, 35.6298, 12.5], ['豊洲市場', 'Toyosu Market', 139.7843, 35.6456, 13],
    ['味の素スタジアム', 'Ajinomoto Stadium', 139.5272, 35.6641, 13], ['東京競馬場', 'Tokyo Racecourse', 139.4853, 35.6631, 13]
  ];
  /* station romanizations the build joined wrongly (official forms) and map-only short names */
  var ST_EN = {
    '新宿三丁目': 'Shinjuku-sanchome', '西新宿五丁目': 'Nishi-Shinjuku-gochome', '新宿西口': 'Shinjuku-nishiguchi',
    '中央大学・明星大学': 'Chuo-Daigaku-Meisei-Daigaku', '大塚・帝京大学': 'Otsuka-Teikyo-Daigaku', '荒川七丁目': 'Arakawa-nanachome'
  };
  var ST_SHORT = { '羽田空港第3ターミナル': null };
  function cleanStations() {
    var st = layers().stations;
    if (!st || st._smClean) return;
    st._smClean = true;
    st.features.forEach(function (f) {
      var p = f.properties || {};
      if (ST_EN[p.name]) p.en = ST_EN[p.name];
      if (p.name in ST_SHORT) { if (ST_SHORT[p.name]) p.short = ST_SHORT[p.name]; else delete p.short; }
    });
  }
  function cleanLabels() {
    cleanStations();
    var lab = layers().labels;
    if (!lab || lab._smClean) return;
    lab._smClean = true;
    LANDMARKS.forEach(function (l) {
      lab.features.push({ type: 'Feature', properties: { name: l[0], en: l[1], kind: 'landmark', lm: 1, minz: l[4], t: 1 }, geometry: { type: 'Point', coordinates: [l[2], l[3]] } });
    });
    lab.features = lab.features.filter(function (f) {
      var p = f.properties || {}, n = String(p.name || '');
      if (/^[（(]/.test(n)) return false;                                   // (御薬園跡及び養生所跡)
      if (n === '上野恩賜公園') return false;                                // 上野公園 (minz 10) stands 150 m away
      n = n.replace(/[（(](特|サクラ)[)）]$/, '');                           // 六義園(特), 小金井(サクラ)
      var m = /^(.+?)[（(]([^)）]+)[)）]$/.exec(n);                         // 酉谷山(天目山), 荒川第一調整池(彩湖)
      if (m) n = (m[1].length >= 7 && m[2].length < m[1].length) ? m[2] : m[1];
      p.name = n;
      if (p.kind === 'river' && BIG_RIVERS[n] && p.t === 1) {
        // the -90° vertical duplicates at the river mouths (築地 / 葛西) read as a label lying on its side
        if (p.vert === 1 && p.ang === -90) return false;
        p.minz = Math.min(p.minz == null ? 99 : p.minz, BIG_RIVERS[n]);
        p.b = 1;
      }
      return true;
    });
  }

  /* the area labels map.js covers with its own count chips (overview scales) */
  var hiddenLabels = [];
  function notHidden(f) { return hiddenLabels.length ? ['all', f, ['!', ['in', ['get', 'code'], ['literal', hiddenLabels]]]] : f; }
  /* lz: the zoom a name starts at (関東: big cities from 7.4, the rest — Tokyo's too — from 8.1) */
  /* hz: the zoom a name stops at (v8: a 政令市's name gives way to its wards' from WARD_Z) */
  function areaLabelFilter(sel) { return notHidden(['all', ['!=', ['get', 'code'], sel || ''], ['>=', ['zoom'], ['coalesce', ['get', 'lz'], 8.1]], ['<', ['zoom'], ['coalesce', ['get', 'hz'], 99]]]); }
  function selLabelFilter(sel) { return notHidden(['all', ['==', ['get', 'code'], sel || ''], ['<', ['zoom'], ['coalesce', ['get', 'hz'], 99]]]); }
  function wardLabelFilter(sel) { return ['all', ['!=', ['get', 'code'], sel || ''], ['>=', ['zoom'], ['coalesce', ['get', 'lz'], WARD_Z]]]; }
  function wardSelFilter(sel) { return ['==', ['get', 'code'], sel || '']; }

  /* 文字を大きく: every text-size × k. A zoom curve must stay the top-level expression, so its stop values are
     scaled one by one (['*', k, curve] would be rejected) */
  function scaleSize(e, k) {
    if (typeof e === 'number') return Math.round(e * k * 10) / 10;
    if (!Array.isArray(e)) return e;
    var zoomIn = e[0] === 'interpolate' ? e[2] : e[0] === 'step' ? e[1] : null;
    if (zoomIn && zoomIn[0] === 'zoom') {
      var out = e.slice(), first = e[0] === 'interpolate' ? 4 : 2;
      if (e[0] === 'step') out[2] = scaleSize(e[2], k);
      for (var i = first; i < out.length; i += 2) out[i] = scaleSize(out[i], k);
      return out;
    }
    return ['*', k, e];
  }

  function build(opts) {
    opts = opts || {};
    var P = PAL[opts.theme === 'dark' ? 'dark' : 'light'];
    kMerge();
    var L = layers(), KON = KX.merged, WON = wardsOn();
    cleanLabels();
    var en = opts.lang === 'en';
    var name = en ? ['coalesce', ['get', 'en'], ['get', 'name']] : ['get', 'name'];
    var DETAIL = (SM.data.mapMeta && SM.data.mapMeta.lod && SM.data.mapMeta.lod.detailFrom) || 10.5;
    /* maxzoom per source: the worker cuts tiles only as fine as the data (overzoomed above). Shapes that meet
       other layers' lines (areas, borders, the bay) keep enough precision for z15.5 */
    function src(id, extra) {
      var s = { type: 'geojson', data: L[id] || EMPTY, buffer: 64, tolerance: 0.45 };
      for (var k in extra) s[k] = extra[k];
      return s;
    }
    var MED = ['Plex Medium'], BOLD = ['Plex Bold'];
    var waterText = { 'text-color': P.waterText, 'text-halo-color': P.water, 'text-halo-width': 1.2, 'text-opacity': inT(1, 0.7) };
    var waterSort = ['case', ['==', ['get', 'b'], 1], 0, 10];
    function stAnchors(r, f) {
      return ['literal', ['left', [r, 0], 'right', [-r, 0], 'top', [0, r], 'bottom', [0, -r],
                          'left', [f, 0], 'right', [-f, 0], 'top', [0, f], 'bottom', [0, -f]]];
    }
    var STATION_LABEL = {
            'text-field': en ? name : ['coalesce', ['get', 'short'], ['get', 'name']], 'text-font': MED,
            'text-size': ['interpolate', ['linear'], ['zoom'],
              7.6, 11,
              9, ['case', SUB, 11, ['<=', ['get', 'r'], 10], 12, 11],
              14, ['case', SUB, 11.5, ['<=', ['get', 'r'], 10], 14, 12],
              16, ['case', SUB, 12, ['<=', ['get', 'r'], 10], 16, 13]],
            // near ring first (just clear of the station's own square, which is placed before every label); when a
            // pin (map.js collision proxy) stands on the station the label steps out to the far ring
            'text-variable-anchor-offset': ['interpolate', ['linear'], ['zoom'], 12, stAnchors(0.8, 1.85), 15, stAnchors(1.1, 2.3)],
            'text-justify': 'auto', 'text-padding': 1.5, 'text-max-width': 12,
            // subway-only stations after JR / private ones (the Japanese map hierarchy)
            'symbol-sort-key': ['+', ['get', 'r'], ['case', SUB, 1000, 0]]
          };
    var STATION_PAINT = { 'text-color': ['case', SUB, P.text2, P.text], 'text-halo-color': P.halo, 'text-halo-width': 2, 'text-opacity': inT(1, 0.6) };
    var railOp = ['interpolate', ['linear'], ['zoom'], 7, inT(0.35, 0.2), 8, inT(0.6, 0.3), 10, inT(1, 0.5)];
    // sel = the chosen area; hov = an area a tap is asking about (map.js: 「○○区を見る」), a lighter tint
    var selOn = function (v) { return ['case', ['boolean', ['feature-state', 'sel'], false], v, ['boolean', ['feature-state', 'hov'], false], Math.round(v * 0.55 * 100) / 100, 0]; };
    var roadCaseW = function () {
      return ['interpolate', ['exponential', 1.5], ['zoom'],
        10.5, ['match', ['get', 'k'], 'motorway', 1.6, 'trunk', 1.3, 'primary', 1.0, 0.6],
        13, ['match', ['get', 'k'], 'motorway', 4.4, 'trunk', 4.0, 'primary', 3.2, 2.2],
        15, ['match', ['get', 'k'], 'motorway', 11.5, 'trunk', 10.5, 'primary', 9.2, 7.6],
        16, ['match', ['get', 'k'], 'motorway', 19, 'trunk', 17.5, 'primary', 15.5, 12.5]];
    };
    var roadW = ['interpolate', ['exponential', 1.5], ['zoom'],
      11.5, ['match', ['get', 'k'], 'motorway', 1.0, 'trunk', 0.8, 'primary', 0.5, 0.3],
      13, ['match', ['get', 'k'], 'motorway', 2.8, 'trunk', 2.6, 'primary', 2.0, 1.3],
      15, ['match', ['get', 'k'], 'motorway', 9, 'trunk', 8, 'primary', 7, 5.6],
      16, ['match', ['get', 'k'], 'motorway', 15, 'trunk', 13.5, 'primary', 12, 9.6]];

    var lyr = [
        /* land turns into the "urban block" tone as streets appear, so white streets read */
        { id: 'land', type: 'background', paint: { 'background-color': ['interpolate', ['linear'], ['zoom'], 12.5, P.land, 14.5, P.blocks] } },

        /* selected area: tint under everything else, outline on top (see area-sel-line). It says "this is your
           area" at area scale and fades as you zoom in, so the parks inside it stay readable */
        { id: 'area-sel', type: 'fill', source: 'areas',
          paint: { 'fill-color': P.selFill, 'fill-opacity': ['interpolate', ['linear'], ['zoom'],
            9, selOn(0.7), 11, selOn(0.5), 12.5, selOn(0.28), 15, selOn(0.12)],
            'fill-opacity-transition': { duration: 320 }, 'fill-antialias': false } },
        /* v8: a chosen ward of a 政令市 (#/map/14101), the same tint */
        WON ? { id: 'ward-sel', type: 'fill', source: 'kWards',
          paint: { 'fill-color': P.selFill, 'fill-opacity': ['interpolate', ['linear'], ['zoom'],
            9, selOn(0.7), 11, selOn(0.5), 12.5, selOn(0.28), 15, selOn(0.12)],
            'fill-opacity-transition': { duration: 320 }, 'fill-antialias': false } } : null,
        /* a chosen prefecture (#/map/14): a light tint over its land at the overview scales */
        KON ? { id: 'pref-sel', type: 'fill', source: 'kPrefs',
          paint: { 'fill-color': P.selFill, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, selOn(0.6), 10, selOn(0.35), 12, selOn(0.12)],
            'fill-opacity-transition': { duration: 320 }, 'fill-antialias': false } } : null,

        { id: 'green-lo', type: 'fill', source: 'greenLo', maxzoom: DETAIL, paint: { 'fill-color': P.forest, 'fill-antialias': false } },
        L.green ? null : { id: 'pre-green', type: 'fill', source: 'greenLo', minzoom: DETAIL, paint: { 'fill-color': P.forest, 'fill-antialias': false } },
        { id: 'green', type: 'fill', source: 'green', minzoom: DETAIL, filter: minz(),
          paint: { 'fill-color': ['match', ['get', 'k'], 'park', P.park, 'farm', P.farm, P.forest], 'fill-antialias': true } },

        /* overview: lakes and rivers outside Tokyo sit under the grey mask (no blue cobweb around the city) */
        { id: 'water-lo-in', type: 'fill', source: 'waterLo', maxzoom: DETAIL, filter: ['!=', ['get', 'k'], 'sea'], paint: { 'fill-color': P.water } },

        { id: 'outside', type: 'fill', source: 'mask', paint: { 'fill-color': P.outside, 'fill-opacity': P.outsideOpacity, 'fill-antialias': false } },

        { id: 'water-lo', type: 'fill', source: 'waterLo', maxzoom: DETAIL, filter: ['==', ['get', 'k'], 'sea'], paint: { 'fill-color': P.water } },
        L.water ? null : { id: 'pre-water', type: 'fill', source: 'waterLo', minzoom: DETAIL, paint: { 'fill-color': P.water } },
        { id: 'water', type: 'fill', source: 'water', minzoom: DETAIL, filter: minz(), paint: { 'fill-color': P.water } },
        { id: 'streams', type: 'line', source: 'streams', minzoom: 11, filter: minz(),
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': P.waterLine, 'line-width': z([11, 0.5, 14, 1.1, 16, 1.8]), 'line-opacity': z([11, 0, 11.6, 1]) } },
        { id: 'coast', type: 'line', source: 'coast', minzoom: 9,
          paint: { 'line-color': P.waterLine, 'line-width': z([9, 0.5, 14, 1.2]) } },

        /* streets (per-area lazy files): a fine texture at z13, white streets with a casing from z14 */
        { id: 'street-case', type: 'line', source: 'streets', minzoom: 12.5,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['interpolate', ['linear'], ['zoom'], 13.5, P.streetTexture, 14.5, P.streetCase],
            // the casing stays ≥ 0.6px a side from z14 (the white fill starts thin), so the residential grid never
            // fades out at the place-focus zoom (z14–14.5)
            'line-width': z([13, byW(0.35, 0.7, 1.1), 14, byW(1.5, 2.3, 3.1), 15, byW(2.8, 4.4, 6.4), 16, byW(5.4, 8.2, 11.6)]),
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 12.5, 0, 13.1, byW(0, ctx(1), ctx(1)), 13.8, ctx(1)]
          } },
        { id: 'street', type: 'line', source: 'streets', minzoom: 14,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': P.street,
            'line-width': z([14, byW(0.25, 0.8, 1.5), 15, byW(1.4, 2.8, 4.2), 16, byW(4, 6.4, 9.4)]),
            'line-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 14.6, ctx(1)]
          } },

        /* major roads (国道 / 都道府県道 / 高速) */
        { id: 'roads-lo', type: 'line', source: 'roadsLo', maxzoom: DETAIL, filter: ['==', ['get', 'k'], 'motorway'],
          layout: { 'line-join': 'round' },
          paint: { 'line-color': P.motorCase, 'line-width': z([8, 0.5, 10.5, 1.4]), 'line-opacity': inT(0.8, 0.45) } },
        /* until detail.js is in: the overview's 高速 + 国道 drawn like the real roads */
        L.roads ? null : { id: 'pre-road-case', type: 'line', source: 'roadsLo', minzoom: DETAIL,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': ['match', ['get', 'k'], 'motorway', P.motorCase, P.trunkCase], 'line-width': roadCaseW(), 'line-opacity': inT(1, 0.6) } },
        L.roads ? null : { id: 'pre-road', type: 'line', source: 'roadsLo', minzoom: 11.5,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': ['match', ['get', 'k'], 'motorway', P.motor, P.road], 'line-width': roadW, 'line-opacity': inT(1, 0.7) } },
        { id: 'road-tunnel', type: 'line', source: 'roads', minzoom: 12, filter: ['==', ['get', 'tunnel'], 1],
          paint: { 'line-color': P.tunnel, 'line-width': z([12, 0.8, 16, 3]), 'line-dasharray': [3, 2], 'line-opacity': inT(1, 0.55) } },
        { id: 'road-case', type: 'line', source: 'roads', minzoom: DETAIL,
          filter: ['all', ['!=', ['get', 'tunnel'], 1], ['any', ['!=', ['get', 'k'], 'secondary'], ['>=', ['zoom'], 12]]],
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['match', ['get', 'k'], 'motorway', P.motorCase, 'trunk', P.trunkCase, P.roadCase],
            'line-width': roadCaseW(),
            'line-opacity': inT(1, 0.6)
          } },
        { id: 'road', type: 'line', source: 'roads', minzoom: 11.5,
          filter: ['all', ['!=', ['get', 'tunnel'], 1], ['any', ['!=', ['get', 'k'], 'secondary'], ['>=', ['zoom'], 12]]],
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['match', ['get', 'k'], 'motorway', P.motor, P.road],
            'line-width': roadW,
            'line-opacity': inT(1, 0.7)
          } },

        /* borders (v8: the ward lines inside the five 政令市 first, finer and under the 区市町村 lines) */
        WON ? { id: 'border-ward', type: 'line', source: 'kWardBorders', minzoom: 9.4,
          layout: { 'line-join': 'round' },
          paint: { 'line-color': P.border, 'line-width': z([9.4, 0.5, 14, 1]), 'line-dasharray': [2, 2], 'line-opacity': z([9.4, 0.3, 11, 0.8]) } } : null,
        { id: 'border-muni', type: 'line', source: 'borders', filter: ['==', ['get', 'k'], 'muni'], minzoom: 8.5,
          layout: { 'line-join': 'round' },
          paint: { 'line-color': P.border, 'line-width': z([9, 0.6, 14, 1.2]), 'line-dasharray': [3, 2], 'line-opacity': z([8.5, 0.5, 11, 1]) } },
        { id: 'border-pref', type: 'line', source: 'borders', filter: ['==', ['get', 'k'], 'pref'],
          layout: { 'line-join': 'round' },
          paint: { 'line-color': P.pref, 'line-width': ['interpolate', ['linear'], ['zoom'], 6.5, inT(1.1, 0.6), 8, inT(1, 0.6), 13, inT(1.6, 0.9)], 'line-opacity': inT(0.9, 0.45) } },
        { id: 'area-sel-line', type: 'line', source: 'areas', layout: { 'line-join': 'round' },
          paint: { 'line-color': P.selLine, 'line-width': 2, 'line-opacity': ['case', ['boolean', ['feature-state', 'sel'], false], 1, 0], 'line-opacity-transition': { duration: 320 } } },
        { id: 'area-hov-line', type: 'line', source: 'areas', layout: { 'line-join': 'round' },
          paint: { 'line-color': P.selLine, 'line-width': 1.5, 'line-opacity': ['case', ['boolean', ['feature-state', 'hov'], false], 0.85, 0], 'line-opacity-transition': { duration: 160 } } },
        WON ? { id: 'ward-sel-line', type: 'line', source: 'kWards', layout: { 'line-join': 'round' },
          paint: { 'line-color': P.selLine, 'line-width': 2, 'line-opacity': ['case', ['boolean', ['feature-state', 'sel'], false], 1, 0], 'line-opacity-transition': { duration: 320 } } } : null,
        WON ? { id: 'ward-hov-line', type: 'line', source: 'kWards', layout: { 'line-join': 'round' },
          paint: { 'line-color': P.selLine, 'line-width': 1.5, 'line-opacity': ['case', ['boolean', ['feature-state', 'hov'], false], 0.85, 0], 'line-opacity-transition': { duration: 160 } } } : null,

        /* railways: JR ink with white dashes (Japanese map convention), private lines grey, subways faint dashed */
        { id: 'rail-subway', type: 'line', source: 'rail', minzoom: 12, filter: ['==', ['get', 'cls'], 'subway'],
          paint: { 'line-color': P.subway, 'line-width': z([12, 0.7, 16, 1.6]), 'line-dasharray': [2.5, 1.5], 'line-opacity': z([12, 0, 12.6, 0.75]) } },
        /* underground / tunnel sections of JR and private lines: thin dashed (solid and faint below z11) */
        { id: 'rail-ug-lo', type: 'line', source: 'rail', maxzoom: 11, filter: ['all', ['==', ['get', 'ug'], 1], ['!=', ['get', 'cls'], 'subway']],
          paint: { 'line-color': ['match', ['get', 'cls'], ['jr', 'shinkansen'], P.jr, P.rail], 'line-width': z([8, 0.5, 11, 1]), 'line-opacity': ['interpolate', ['linear'], ['zoom'], 8, inT(0.27, 0.14), 10, inT(0.45, 0.22)] } },
        { id: 'rail-ug', type: 'line', source: 'rail', minzoom: 11, filter: ['all', ['==', ['get', 'ug'], 1], ['!=', ['get', 'cls'], 'subway']],
          paint: { 'line-color': ['match', ['get', 'cls'], ['jr', 'shinkansen'], P.jr, P.rail], 'line-width': z([11, 1, 16, 2]), 'line-dasharray': [3, 2],
                   'line-opacity': inT(0.55, 0.35) } },
        { id: 'rail-other', type: 'line', source: 'rail', filter: ['all', ['!=', ['get', 'ug'], 1], ['match', ['get', 'cls'], ['private', 'mono', 'tram'], true, false]],
          layout: { 'line-join': 'round' },
          paint: { 'line-color': ['match', ['get', 'cls'], 'private', P.rail, P.tram], 'line-width': z([8, 0.5, 12, 1, 16, 2.4]), 'line-opacity': railOp } },
        { id: 'rail-jr', type: 'line', source: 'rail', filter: ['all', ['!=', ['get', 'ug'], 1], ['match', ['get', 'cls'], ['jr', 'shinkansen'], true, false]],
          layout: { 'line-join': 'round' },
          paint: { 'line-color': P.jr, 'line-width': z([7, 0.6, 8, 0.7, 11, 1.4, 13, 2.6, 16, 4.5]), 'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, inT(0.45, 0.3), 8.5, inT(1, 0.55)] } },
        { id: 'rail-jr-dash', type: 'line', source: 'rail', minzoom: 11, filter: ['all', ['!=', ['get', 'ug'], 1], ['match', ['get', 'cls'], ['jr', 'shinkansen'], true, false]],
          paint: { 'line-color': P.jrDash, 'line-width': z([11, 0.6, 13, 1.4, 16, 2.8]), 'line-dasharray': [3, 3], 'line-opacity': z([11, 0, 11.6, 1]) } },

        /* station platforms: the thick bar along the track used on Japanese maps (z >= 13); capped so they stay
           bars, not slabs, at street scale */
        { id: 'platform-case', type: 'line', source: 'stationLines', minzoom: 12.8,
          layout: { 'line-cap': 'butt', 'line-join': 'round' },
          paint: { 'line-color': ['case', ['any', ['==', ['get', 'cls'], 'subway'], ['==', ['get', 'ug'], 1]], P.subway, P.stationLine],
                   'line-width': z([13, 3.4, 15, 7, 16, 8]),
                   'line-opacity': ['interpolate', ['linear'], ['zoom'], 12.8, 0, 13.5, ['case', ['any', ['==', ['get', 'cls'], 'subway'], ['==', ['get', 'ug'], 1]], 0.8, inT(1, 0.6)]] } },
        { id: 'platform', type: 'line', source: 'stationLines', minzoom: 12.8,
          layout: { 'line-cap': 'butt', 'line-join': 'round' },
          paint: { 'line-color': P.platform, 'line-width': z([13, 1.4, 15, 4.4, 16, 5]), 'line-opacity': z([12.8, 0, 13.5, 1]) } },

        /* labels (placed top of this list last — MapLibre places the top layer first):
           町・丁目 < green < hills < water < stations < areas < anchor stations < the chosen area < pins (map.js) */
        { id: 'label-town', type: 'symbol', source: 'towns', minzoom: 13.5,
          filter: ['case', ['==', ['get', 'b'], 1], ['<', ['zoom'], 15], ['==', ['get', 'b'], 0], ['>=', ['zoom'], 15], true],
          layout: { 'text-field': ['case', ['>', ['coalesce', ['get', 'c'], 0], 0], ['concat', ['get', 'n'], ['to-string', ['get', 'c']], '丁目'], ['get', 'n']], 'text-font': MED, 'text-size': ['interpolate', ['linear'], ['zoom'], 13.5, 11, 16, 12],
                    'text-letter-spacing': 0.04, 'text-padding': 4, 'text-max-width': 7, 'visibility': en ? 'none' : 'visible' },
          paint: { 'text-color': P.town, 'text-halo-color': P.halo, 'text-halo-width': 1.4,
                   'text-opacity': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 13.9, 1] } },
        /* parks, cemeteries, landmarks (landmarks in ink grey: 東京タワー is not a park) */
        { id: 'label-green', type: 'symbol', source: 'labels', minzoom: 11.5, filter: ['all', minz(), ['match', ['get', 'kind'], ['park', 'cemetery', 'landmark'], true, false]],
          layout: { 'text-field': name, 'text-font': MED, 'text-size': ['interpolate', ['linear'], ['zoom'], 11.5, 11, 16, 13], 'text-max-width': 7, 'text-padding': 4,
                    'symbol-sort-key': ['case', ['==', ['get', 'lm'], 1], ['get', 'minz'], 20] },
          paint: { 'text-color': ['case', ['==', ['get', 'lm'], 1], P.text2, P.greenText], 'text-halo-color': P.halo, 'text-halo-width': 1.4 } },
        { id: 'label-hill', type: 'symbol', source: 'labels', minzoom: 10, filter: ['all', minz(), ['match', ['get', 'kind'], ['hill', 'peak'], true, false]],
          layout: { 'text-field': ['case', ['==', ['get', 'kind'], 'peak'], ['concat', '▲ ', name], name], 'text-font': MED,
                    'text-size': ['match', ['get', 'kind'], 'hill', 12, 10], 'text-letter-spacing': ['match', ['get', 'kind'], 'hill', en ? 0.12 : 0.3, 0.02], 'text-padding': 4 },
          paint: { 'text-color': P.greenText, 'text-halo-color': P.halo, 'text-halo-width': 1.2, 'text-opacity': 0.9 } },
        { id: 'label-water', type: 'symbol', source: 'labels', filter: ['all', minz(), ['!=', ['get', 'vert'], 1], ['match', ['get', 'kind'], ['river', 'lake', 'sea'], true, false]],
          layout: { 'text-field': name, 'text-font': MED, 'text-size': ['match', ['get', 'kind'], 'sea', 13, 11], 'text-letter-spacing': 0.08,
                    'text-rotate': ['coalesce', ['get', 'ang'], 0], 'text-rotation-alignment': 'map', 'text-max-width': 12, 'text-padding': 2,
                    'symbol-sort-key': waterSort },
          paint: waterText },
        { id: 'label-water-v', type: 'symbol', source: 'labels', filter: ['all', minz(), ['==', ['get', 'vert'], 1], ['match', ['get', 'kind'], ['river', 'lake', 'sea'], true, false]],
          layout: { 'text-field': name, 'text-font': MED, 'text-size': 11, 'text-letter-spacing': 0.08,
                    'text-writing-mode': en ? ['horizontal'] : ['vertical'], 'text-rotation-alignment': 'viewport', 'text-padding': 2,
                    'symbol-sort-key': waterSort },
          paint: waterText },

        /* labels: stations */
        { id: 'label-station', type: 'symbol', source: 'stations', minzoom: 9, filter: ['all', minz(), ['>', ['get', 'minz'], 8], ['any', ['!', SUB], ['>=', ['zoom'], 12]]],
          layout: STATION_LABEL,
          paint: STATION_PAINT },

        /* labels: wards / cities */
        { id: 'label-area', type: 'symbol', source: 'areaLabels', minzoom: KON ? 6.5 : 7.3,
          filter: areaLabelFilter(opts.selected),
          layout: {
            'text-field': name, 'text-font': MED,
            'text-size': ['interpolate', ['linear'], ['zoom'], 7, 11, 9, 12, 12, 13, 14, 15],
            'text-letter-spacing': 0.04, 'text-padding': 2, 'symbol-sort-key': ['-', 0, ['get', 'area']]
          },
          paint: { 'text-color': P.text3, 'text-halo-color': P.halo, 'text-halo-width': 1.6,
                   'text-opacity': ['interpolate', ['linear'], ['zoom'], 13.5, 1, 15, 0.35] } },
        /* v8: the wards of the five 政令市, from WARD_Z (their city's own name steps back there: hz) */
        WON ? { id: 'label-ward', type: 'symbol', source: 'kWardLabels', minzoom: WARD_Z,
          filter: wardLabelFilter(opts.selected),
          layout: {
            'text-field': name, 'text-font': MED,
            'text-size': ['interpolate', ['linear'], ['zoom'], 9.6, 11, 12, 12.5, 14, 14.5],
            'text-letter-spacing': 0.04, 'text-padding': 2, 'symbol-sort-key': ['-', 0, ['get', 'area']]
          },
          paint: { 'text-color': P.text3, 'text-halo-color': P.halo, 'text-halo-width': 1.6,
                   'text-opacity': ['interpolate', ['linear'], ['zoom'], 13.5, 1, 15, 0.35] } } : null,
        /* the ten anchor stations (新宿, 渋谷, 池袋, 東京, 品川, 上野, 立川, 八王子, 町田, 吉祥寺) outrank area labels */
        { id: 'label-station-top', type: 'symbol', source: 'stations', minzoom: KON ? 8.2 : 7.6, filter: ['<=', ['get', 'minz'], 8],
          layout: STATION_LABEL, paint: STATION_PAINT },
        /* the chosen area's name is placed first (stations move away from it instead of being drawn over); it may
           step above or below its point when a pin (map.js collision proxy) stands there */
        { id: 'label-area-sel', type: 'symbol', source: 'areaLabels', filter: selLabelFilter(opts.selected),
          layout: { 'text-field': name, 'text-font': BOLD, 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 12, 12, 14, 14, 16],
                    'text-letter-spacing': 0.04, 'text-allow-overlap': false, 'text-ignore-placement': false,
                    'text-variable-anchor': ['center', 'bottom', 'top'], 'text-radial-offset': 0.8, 'text-padding': 4 },
          paint: { 'text-color': P.text, 'text-halo-color': P.halo, 'text-halo-width': 2 } },
        WON ? { id: 'label-ward-sel', type: 'symbol', source: 'kWardLabels', filter: wardSelFilter(opts.selected),
          layout: { 'text-field': name, 'text-font': BOLD, 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 12, 12, 14, 14, 16],
                    'text-letter-spacing': 0.04, 'text-allow-overlap': false, 'text-ignore-placement': false,
                    'text-variable-anchor': ['center', 'bottom', 'top'], 'text-radial-offset': 0.8, 'text-padding': 4 },
          paint: { 'text-color': P.text, 'text-halo-color': P.halo, 'text-halo-width': 2 } } : null,
        /* 関東: the seven prefecture names at the overview scales (map.js's count chips stand in for them) */
        KON ? { id: 'label-pref', type: 'symbol', source: 'kPrefLabels', maxzoom: 8.7, filter: notHidden(['has', 'code']),
          layout: { 'text-field': name, 'text-font': BOLD, 'text-size': ['interpolate', ['linear'], ['zoom'], 6.5, 13, 8.5, 15],
                    'text-letter-spacing': en ? 0.06 : 0.14, 'text-padding': 6, 'text-max-width': 9 },
          paint: { 'text-color': P.text2, 'text-halo-color': P.halo, 'text-halo-width': 2,
                   'text-opacity': ['interpolate', ['linear'], ['zoom'], 8.1, 1, 8.6, 0] } } : null,

        /* station squares (the platform bars take over from z14; subway-only: grey and smaller). The last layer
           here, so they are placed right after map.js's pin proxies and before every label: always drawn, and every
           name — the chosen area's too — steps around them instead of printing under a square. The ten anchors
           (minz 8) show from the whole-Tokyo view */
        { id: 'station', type: 'symbol', source: 'stations', minzoom: KON ? 8.2 : 7.6, maxzoom: 14.2,
          filter: ['all', ['any', minz(), ['<=', ['get', 'minz'], 8]], ['any', ['!', SUB], ['>=', ['zoom'], 12]]],
          layout: { 'icon-image': ['case', SUB, 'sm-station-sub', 'sm-station'],
                    'icon-size': ['interpolate', ['exponential', 1.5], ['zoom'], 7.6, 0.5, 9, ['case', SUB, 0.47, 0.55], 13, ['case', SUB, 0.68, 0.8]],
                    'icon-allow-overlap': true, 'icon-ignore-placement': false, 'icon-padding': 0, 'symbol-sort-key': ['get', 'r'] },
          paint: { 'icon-opacity': ['interpolate', ['linear'], ['zoom'], 13.4, inT(1, 0.6), 14.1, 0] } }
    ];
    /* 関東: each base layer drawn from a k-* source gets a copy right above it (the stand-ins "pre-*" are not
       copied: a prefecture's file is in long before its detail zoom) */
    if (KON) {
      var withK = [];
      lyr.forEach(function (l) {
        withK.push(l);
        if (!l || !l.source || KSRC.indexOf(l.source) < 0 || /^pre-/.test(l.id)) return;
        var c = {}; for (var k in l) c[k] = l[k];
        c.id = 'k-' + l.id; c.source = 'k-' + l.source;
        withK.push(c);
      });
      lyr = withK;
    }
    if (opts.big) {
      lyr.forEach(function (l) { if (l && l.layout && l.layout['text-size'] != null) { l.layout = Object.assign({}, l.layout); l.layout['text-size'] = scaleSize(l.layout['text-size'], 1.2); } });
    }
    var sources = {
        mask: src('mask', { maxzoom: 13 }), areas: src('areas', { promoteId: 'code', maxzoom: 13 }), borders: src('borders', { maxzoom: 14 }),
        areaLabels: src('areaLabels', { maxzoom: 12 }), waterLo: src('waterLo', { maxzoom: 11 }), greenLo: src('greenLo', { maxzoom: 11 }),
        roadsLo: src('roadsLo', { maxzoom: 11 }), coast: src('coast', { maxzoom: 14 }), rail: src('rail', { maxzoom: 14 }), stationLines: src('stationLines', { maxzoom: 14 }),
        stations: src('stations', { maxzoom: 13 }), labels: src('labels', { maxzoom: 13 }),
        water: src('water', { maxzoom: 14 }), streams: src('streams', { tolerance: 0.6, maxzoom: 14 }), green: src('green', { maxzoom: 14 }), roads: src('roads', { maxzoom: 14 }),
        streets: src('streets', { tolerance: 0.6, buffer: 32, maxzoom: 15 }),
        towns: src('towns', { buffer: 32, maxzoom: 15 })
    };
    if (KON) {
      KSRC.forEach(function (n) { var s0 = sources[n], s1 = {}; for (var k in s0) s1[k] = s0[k]; s1.data = kData(n); sources['k-' + n] = s1; });
      sources.kPrefs = { type: 'geojson', data: KD().prefs, promoteId: 'code', maxzoom: 11, buffer: 64, tolerance: 0.45 };
      sources.kPrefLabels = { type: 'geojson', data: KD().prefLabels, maxzoom: 9 };
    }
    if (WON) {
      sources.kWards = { type: 'geojson', data: kData('wards'), promoteId: 'code', maxzoom: 13, buffer: 64, tolerance: 0.45 };
      sources.kWardBorders = { type: 'geojson', data: kData('wardBorders'), maxzoom: 14, buffer: 64, tolerance: 0.45 };
      sources.kWardLabels = { type: 'geojson', data: KD().wardLabels, maxzoom: 12 };
    }
    return {
      version: 8,
      name: 'sudachi-' + (opts.theme === 'dark' ? 'dark' : 'light'),
      glyphs: 'smglyph://{fontstack}/{range}',
      sources: sources,
      layers: lyr.filter(Boolean)
    };
  }

  /* MapLibre options that go with the style (pass maxBounds: SM.data.mapMeta.maxBounds as well). maxZoom 15.5: the
     data is z14 and has no buildings; past 15.5 the map was only overzoomed gaps (a pinch-in read as broken) */
  var mapOptions = {
    minZoom: 7.3, maxZoom: 15.5, maxPitch: 0, dragRotate: false, pitchWithRotate: false, touchPitch: false,
    renderWorldCopies: false, fadeDuration: 180, attributionControl: false, cooperativeGestures: false
  };

  /* Register the glyph protocol (empty answers; all glyphs are drawn locally after attach). Call once. */
  var prepared = false;
  function prepare(maplibregl) {
    if (prepared || !maplibregl) return;
    prepared = true;
    try { maplibregl.addProtocol('smglyph', function () { return Promise.resolve({ data: new ArrayBuffer(0) }); }); } catch (e) { /* harmless */ }
  }

  /* Draw every label glyph locally (TinySDF + the page font), not just CJK. MapLibre 4.7.1 internals. */
  function localGlyphs(map) {
    try {
      var gm = map.style && map.style.glyphManager;
      var proto = gm && Object.getPrototypeOf(gm);
      if (proto && typeof proto._doesCharSupportLocalGlyph === 'function' && !proto.__smAll) {
        proto._doesCharSupportLocalGlyph = function () { return !!this.localIdeographFontFamily; };
        proto.__smAll = true;
      }
      return !!(proto && proto.__smAll);
    } catch (e) { return false; }
  }

  /* station squares: white with an ink keyline (JR / private), white with a grey keyline (subway only) */
  var ICONS = ['sm-station', 'sm-station-sub'], iconBusy = false;
  function stationIcon(map, theme) {
    // addImage fires styledata (→ onStyle → here again): add only what is missing, and never re-enter
    if (iconBusy) return;
    iconBusy = true;
    try { stationIcons(map, theme); } finally { iconBusy = false; }
  }
  function stationIcons(map, theme) {
    var P = PAL[theme === 'dark' ? 'dark' : 'light'];
    // pixels written directly: a 2D canvas + getImageData forces a GPU readback (≈ 750 ms on a software GPU)
    var r = 2, s = 12 * r, a = 3 * r / 2 + 1, b = s - a;
    function rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
    [[ICONS[0], P.stationLine], [ICONS[1], P.subway]].forEach(function (d) {
      var data = new Uint8Array(s * s * 4), line = rgb(d[1]), fill = rgb(P.station);
      for (var y = 0; y < s; y++) for (var x = 0; x < s; x++) {
        var c = (x >= a && x < b && y >= a && y < b) ? fill : line, i = (y * s + x) * 4;
        data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
      }
      if (!map.hasImage(d[0])) map.addImage(d[0], { width: s, height: s, data: data }, { pixelRatio: r });
    });
  }

  /* Lazy files: <script> tags with local paths. */
  var loading = {};
  function loadFile(key, cb, path) {
    var meta = SM.data.mapMeta || {}, files = meta.files || {};
    if (loading[key] === 'done') { if (cb) cb(); return; }
    if (loading[key]) { loading[key].push(cb); return; }
    loading[key] = [cb];
    var s = document.createElement('script');
    var u = path || files[key] || ('data/map/' + key + '.js');
    if (SM._vsrc) { try { u = SM._vsrc(u); } catch (e) { } }
    s.src = (SM.mapStyle.root || '') + u;
    s.async = true;
    s.onload = function () { var q = loading[key]; loading[key] = 'done'; q.forEach(function (f) { if (f) f(); }); };
    s.onerror = function () { loading[key] = null; };
    document.head.appendChild(s);
  }

  function feed(map, names) {
    names.forEach(function (n) { var so = map.getSource(n), d = layer(n); if (so && d) so.setData(d); });
  }
  /* most visible first; each one is its own task (decode + setData ≈ 60–300 ms at 4x CPU) */
  var DETAIL_LAYERS = ['water', 'green', 'roads', 'streams'];
  var PRE = { water: ['pre-water'], green: ['pre-green'], roads: ['pre-road-case', 'pre-road'] };

  /* streets: load the per-area files that touch the (padded) viewport; the source holds only those areas */
  var streetsKey = '', streetsWant = [];
  function refreshStreets(map) {
    var S = SM.data.mapStreets || {}, have = streetsWant.filter(function (c) { return S[c]; }).sort();
    var key = have.join(',');
    if (key === streetsKey) return;
    streetsKey = key;
    var feats = [];
    have.forEach(function (c) { Array.prototype.push.apply(feats, S[c].features); });
    SM.data.mapLayers.streets = { type: 'FeatureCollection', features: feats };
    feed(map, ['streets']);
  }
  /* files that arrive together make one setData (each one serialises the whole streets source) */
  var streetsT = 0;
  function refreshStreetsSoon(map) { clearTimeout(streetsT); streetsT = setTimeout(function () { refreshStreets(map); }, 120); }
  function checkStreets(map, force) {
    var meta = SM.data.mapMeta || {}, idx = meta.streets || {}, from = (meta.lod && meta.lod.streetsFrom) || 13;
    if (!force && map.getZoom() < from - 0.6) return;
    var b = map.getBounds(), w = b.getWest(), s = b.getSouth(), e = b.getEast(), n = b.getNorth();
    var dx = (e - w) * 0.25, dy = (n - s) * 0.25;
    w -= dx; e += dx; s -= dy; n += dy;
    var want = [];
    for (var code in idx) { var bb = idx[code]; if (bb[0] <= e && bb[2] >= w && bb[1] <= n && bb[3] >= s) want.push(code); }
    if (want.length > 14) return;              /* never at overview scales */
    streetsWant = want;
    var tpl = (meta.files && meta.files.streets) || 'data/map/streets/{code}.js';
    want.forEach(function (code) { loadFile('streets:' + code, function () { refreshStreetsSoon(map); }, tpl.replace('{code}', code)); });
    refreshStreetsSoon(map);
  }
  /* 町・丁目 names (towns.js, ≈ 0.1 MB): from z13 */
  function checkTowns(map) {
    if (map.getZoom() < 12.8 || loading.towns === 'done' || loading.towns) return;
    loadFile('towns', function () { feed(map, ['towns']); });
  }

  function attach(map, opts) {
    opts = opts || {};
    var theme = opts.theme;
    var ok = localGlyphs(map);
    function onStyle() { localGlyphs(map); if (!map.hasImage(ICONS[0]) || !map.hasImage(ICONS[1])) stationIcon(map, theme); }
    map.on('styledata', onStyle);
    map.on('styleimagemissing', function (e) { if (ICONS.indexOf(e.id) >= 0) stationIcon(map, theme); });
    var meta = SM.data.mapMeta || { lod: { detailFrom: 10.5, streetsFrom: 13 } };
    /* detail: the file is loaded once, then each layer is decoded and fed in its own task while the camera rests
       (a pan or a flight waits for its end), and its stand-in ("pre-*") is removed once the new data is drawn */
    var queue = null, pumpT = 0, detailCbs = [];
    function busy() { return map.isMoving() || (opts.busy && opts.busy()); }
    function swapOut(n) {
      var ids = PRE[n]; if (!ids) return;
      var done = false;
      var off = function () {
        if (done) return; done = true; map.off('sourcedata', onData);
        ids.forEach(function (id) { if (map.getLayer(id)) { try { map.removeLayer(id); } catch (e) { } } });
      };
      var onData = function (e) { if (e && e.sourceId === n && e.isSourceLoaded) setTimeout(off, 60); };
      map.on('sourcedata', onData);
      setTimeout(off, 4000);   // never keep both for long
    }
    function pump() {
      if (map._removed || !map.style) { queue = null; pumpT = 0; return; }   // the view left
      pumpT = 0;
      if (!queue || !queue.length) return;
      if (busy()) { pumpT = setTimeout(pump, 220); return; }
      var n = queue.shift();
      feed(map, [n]);
      swapOut(n);
      if (queue.length) pumpT = setTimeout(pump, 90);
      else { var q = detailCbs; detailCbs = []; q.forEach(function (f) { try { f(); } catch (e) { } }); }
    }
    function loadDetail(cb) {
      if (cb) {
        if (queue && !queue.length) { cb(); }
        else detailCbs.push(cb);
      }
      loadFile('detail', function () {
        if (queue) return;
        queue = DETAIL_LAYERS.slice();
        if (!pumpT) pumpT = setTimeout(pump, 0);
      });
    }
    /* 関東: a prefecture's file is loaded when the view (from z8.4) meets the prefecture; it goes in one source per
       task while the camera rests (区市町村 first: the 25 m polygons and borders), like the detail layers */
    var kq = [], kT = 0;
    function kPump() {
      kT = 0;
      if (!kq.length) return;
      if (map._removed || !map.style) { kq.length = 0; return; }   // the view left: nothing to feed
      if (busy()) { kT = setTimeout(kPump, 220); return; }
      var job = kq.shift();
      try { job(); } catch (e) { }
      if (kq.length) kT = setTimeout(kPump, 60);
    }
    function kIn(pc, cb) {
      var P = KP()[pc];
      if (!P || KX.loaded[pc]) { if (cb) kq.push(cb); if (!kT) kT = setTimeout(kPump, 0); return; }
      kq.push(function () {
        KX.loaded[pc] = true;
        kAreas();
        var a = map.getSource('areas'); if (a) a.setData(layers().areas);
        if (SM.mapStyle.onKanto) { try { SM.mapStyle.onKanto(pc); } catch (e) { } }
      });
      KSRC.forEach(function (n) {
        if (!P[n] && !(n === 'borders')) return;
        kq.push(function () { var so = map.getSource('k-' + n); if (so) so.setData(kData(n)); });
      });
      // v8: the prefecture's wards (polygons first: a chosen ward's tint, then its inner lines)
      if (P.wards) kq.push(function () {
        var sw = map.getSource('kWards'); if (sw) sw.setData(kData('wards'));
        var sb = map.getSource('kWardBorders'); if (sb) sb.setData(kData('wardBorders'));
      });
      if (cb) kq.push(cb);
      if (!kT) kT = setTimeout(kPump, 0);
    }
    function kLoad(pc, cb) {
      var M = KM(); if (!KX.merged || !M || !M.files[pc]) { if (cb) cb(); return; }
      loadFile('kanto:' + pc, function () { kIn(pc, cb); }, M.path.replace('{pref}', pc));
    }
    function kCheck() {
      var M = KM(); if (!KX.merged || !M || map.getZoom() < M.detailFrom) return;
      var b = map.getBounds(), w = b.getWest(), s = b.getSouth(), e = b.getEast(), n = b.getNorth();
      var dx = (e - w) * 0.1, dy = (n - s) * 0.1;
      w -= dx; e += dx; s -= dy; n += dy;
      Object.keys(M.files).forEach(function (pc) {
        if (KX.loaded[pc] || loading['kanto:' + pc]) return;
        var bb = (M.prefBounds && M.prefBounds[pc]) || M.files[pc].b;
        if (!(bb[0] <= e && bb[2] >= w && bb[1] <= n && bb[3] >= s)) return;
        // the box meets the view: does the prefecture's land? (a 7 × 7 grid over the padded view; 茨城's box
        // reaches into 練馬区's view, its land does not)
        var f = prefFeatures(pc)[0];
        if (f) {
          var hit = false;
          for (var i = 0; i <= 6 && !hit; i++) for (var j = 0; j <= 6 && !hit; j++) hit = inGeom(f.geometry, w + (e - w) * i / 6, s + (n - s) * j / 6);
          if (!hit) return;
        }
        kLoad(pc);
      });
    }
    var last = 0, ready = false;
    function check() {
      if (!ready) return;   /* the first frame draws from base.js only; detail and streets follow it */
      if (map.getZoom() >= meta.lod.detailFrom - 1.2 || opts.eager) loadDetail();
      checkStreets(map);
      checkTowns(map);
      kCheck();
    }
    function start() {
      if (ready) return;
      ready = true;
      check();
      /* warm the detail file in idle time so the first zoom-in is instant — not on data saver or a 2g/3g
         connection (about 1.3 MB): there it loads only when the map is zoomed in far enough (check) */
      var cn = navigator.connection;
      if (cn && (cn.saveData || /2g|3g/.test(cn.effectiveType || ''))) return;
      var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 1200); };
      idle(function () { loadDetail(); });
    }
    map.on('moveend', check);
    /* during gestures, load as the view moves; programmatic flights load at their end (no files for the path) */
    map.on('move', function (e) { if (!e || !e.originalEvent) return; var t = Date.now(); if (t - last > 350) { last = t; check(); } });
    map.on('load', function () {
      /* after the first frame is on screen (and its fade-in has had its frames), then detail; the parse must not
         land inside the reveal. opts.detailDelay lets the view time it (default 700 ms; false = the view calls
         SM.mapStyle.start() itself, e.g. once its reveal choreography is over) */
      if (opts.detailDelay === false) { setTimeout(start, 6000); return; }
      setTimeout(start, opts.detailDelay != null ? opts.detailDelay : 700);
    });
    SM.mapStyle.start = start;
    SM.mapStyle.ensure = function (key, cb) {
      if (key === 'streets') { checkStreets(map, true); if (cb) cb(); } else { ready = true; loadDetail(cb); }
    };
    /* map.js: the prefecture of a chosen area now (cb once it is drawn at full detail) */
    SM.mapStyle.ensureKanto = function (pc, cb) { kLoad(pc, cb); };
    SM.mapStyle.setTheme = function (t) { theme = t; ICONS.forEach(function (id) { if (map.hasImage(id)) map.removeImage(id); }); };
    return ok;
  }

  var selected = null;
  function selSrc(code) { return isPref(code) ? 'kPrefs' : isWardCode(code) ? 'kWards' : 'areas'; }
  function select(map, code) {
    if (selected && map.getSource(selSrc(selected))) map.setFeatureState({ source: selSrc(selected), id: selected }, { sel: false });
    selected = code || null;
    if (selected && map.getSource(selSrc(selected))) map.setFeatureState({ source: selSrc(selected), id: selected }, { sel: true });
    if (map.getLayer('label-area-sel')) map.setFilter('label-area-sel', selLabelFilter(selected));
    if (map.getLayer('label-area')) map.setFilter('label-area', areaLabelFilter(selected));
    if (map.getLayer('label-ward-sel')) map.setFilter('label-ward-sel', wardSelFilter(selected));
    if (map.getLayer('label-ward')) map.setFilter('label-ward', wardLabelFilter(selected));
  }
  /* hide the area labels of these codes (map.js draws count chips in their place); [] shows them all again */
  function hideAreaLabels(map, codes) {
    codes = (codes || []).slice().sort();
    if (codes.join(',') === hiddenLabels.join(',')) return;
    hiddenLabels = codes;
    if (map && map.getLayer('label-area')) map.setFilter('label-area', areaLabelFilter(selected));
    if (map && map.getLayer('label-area-sel')) map.setFilter('label-area-sel', selLabelFilter(selected));
  }

  /* bbox [w,s,e,n] of an area code from the baked polygons (for fitBounds) */
  function areaBounds(code) {
    if (!code || code === 'all' || isPref(code)) return kBounds(code);
    if (isWardCode(code)) return KM().wardBounds[code].slice();   // v8: a ward (kanto.js meta, there before its file)
    kMerge();   // a 区市町村 outside Tokyo is in the merged polygons (map.js may ask before the first style is built)
    var A = (SM.data.mapLayers || {}).areas; if (!A) return null;
    var b = [180, 90, -180, -90];
    A.features.forEach(function (f) {
      if (f.properties.code !== code) return;
      (function walk(a) { if (typeof a[0] === 'number') { if (a[0] < b[0]) b[0] = a[0]; if (a[1] < b[1]) b[1] = a[1]; if (a[0] > b[2]) b[2] = a[0]; if (a[1] > b[3]) b[3] = a[1]; } else a.forEach(walk); })(f.geometry.coordinates);
    });
    return b[0] <= b[2] ? b : null;
  }

  /* number of lazy files still loading (tests / loading indicator) */
  function pending() { var n = 0; for (var k in loading) if (loading[k] && loading[k] !== 'done') n++; return n; }

  SM.mapStyle = {
    pending: pending, selected: function () { return selected; },
    build: build, prepare: prepare, attach: attach, select: select, areaBounds: areaBounds, hideAreaLabels: hideAreaLabels,
    layer: layer,
    /* 関東 (v7) */
    kanto: function () { return KX.merged; }, kBounds: kBounds, prefFeatures: prefFeatures, inKanto: inKanto,
    isWard: isWardCode, wardZoom: WARD_Z,
    kantoLoaded: function () { }, ensureKanto: function (pc, cb) { if (cb) cb(); }, onKanto: null,
    fontFamily: FONT, mapOptions: mapOptions, palettes: PAL, root: '', loadFile: loadFile,
    ensure: function () {}, setTheme: function () {}, start: function () {}
  };
})();
