# data/map — baked map data for 巣立ちマップ

Real cartography for Tokyo mainland (23区 + 多摩, the 53 areas of `data/areas.js`, islands excluded), baked at
build time into classic-script `.js` files. Nothing is fetched at runtime: no tile server, no glyph server, works
from `file://` with `connect-src 'none'`. Rendered with the vendored MapLibre GL JS 4.7.1 (`js/vendor/`).

## Files

| File | Size | Loaded | Contents (`SM.data.mapLayers.<name>` = GeoJSON FeatureCollection) |
|---|---|---|---|
| `base.js` | 1.11 MB | with the map view | `mask areas borders areaLabels waterLo greenLo roadsLo coast rail stationLines stations labels` + `SM.data.mapMeta` + `SM.data.mapDecode` |
| `detail.js` | 2.08 MB | lazily (after the map's reveal, or zoom ≥ 9.3) | `water streams green roads` — each one a function in `SM.data.mapLayers._lazy`, decoded when it is fed (`SM.mapStyle.layer(name)`) |
| `towns.js` | 0.11 MB | lazily, zoom ≥ 12.8 | `towns`: 町・丁目 name points (GSI z14 注記 町字名・小字名, Tokyo mainland). `b` 1 = one per 町 (z13.5–15), 0 = one per 丁目 with `c` its number (z15+), 2 = a 町 without 丁目 (always); `n` = name. JA only |
| `streets/<code>.js` ×94 | 1.98 MB total, 5–108 KB each | lazily, only the files touching the view at zoom ≥ 12.4 | `SM.data.mapStreets[<code>]`: every 市区町村道 ≥ 3 m (53 area files + 41 context cells `c<i>_<j>` within 2.5 km of Tokyo) |
| `style.js` | 38 KB | after `base.js` | `SM.mapStyle`: style builder, palettes, glyph/icon helpers, LOD loader, selection, label clean-up |
| `README.md` | — | — | this file |

Total ≈ 5.3 MB on disk; the first map paint needs `base.js` only (≈ 80 ms decode on a laptop). Each file decodes
itself (quantized 1e-5°, delta + zigzag varints in base64url, columnar properties), so the bytes stay small and
the result is plain GeoJSON. `js/vendor/maplibre-gl.js` (803 KB, BSD-3-Clause, `maplibre-gl.LICENSE.txt`) and
`maplibre-gl.css` are byte-identical to cdnjs `maplibre-gl/4.7.1`.

## Sources, licenses, attribution

| Data | Source | License | Used for |
|---|---|---|---|
| 地理院ベクトルタイル `optimal_bvmap-v1` (z9–14) | 国土地理院 `https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/{z}/{x}/{y}.pbf` | 国土地理院コンテンツ利用規約 (CC BY 4.0 compatible) | water (WA), streams (RvrCL), coast, major roads + streets (RdCL), rail tunnels (RailCL), place/water/park/peak names (Anno), 町・丁目 names (Anno 町字名・小字名 → `towns.js`), green-block geometry (RdCL + Anno symbols + BldA) |
| 地理院ベクトルタイル `experimental_bvmap` (`label`) | 国土地理院 | same | kana readings of station names (validated, see below) |
| 国土数値情報 行政区域 N03 (2024-01-01), 東京都 + 埼玉・千葉・神奈川・山梨・茨城・群馬 | 国土交通省 | CC BY 4.0 | areas, borders, label anchors, Tokyo outline / outside mask |
| 国土数値情報 鉄道 N02 (2024) | 国土交通省 | CC BY 4.0 | railway lines (names, operators, classes), station platforms and points |
| 国土数値情報 駅別乗降客数 S12 (2024) | 国土交通省 | CC BY 4.0 | station ranking (median of 2019 / 2022 / 2023) |
| 国土数値情報 土地利用細分メッシュ L03-b (2021), meshes 5238–5440 | 国土交通省 | CC BY 4.0 | forest / farm classification, context forests |

Not used: A13 and P13 (non-commercial terms), OpenStreetMap (not reachable from the build host).

**Attribution (must be visible on the map)**, from `SM.data.mapMeta.attribution`:
- short (the map corner, `micro` 10px): `地理院ベクトルタイル・国土数値情報を加工して作成`
- full (about page / credits): `地理院ベクトルタイル・国土数値情報（行政区域・鉄道・駅別乗降客数・土地利用細分メッシュ）を加工して作成`
- English: `Processed from GSI Vector Tiles and MLIT National Land Numerical Information`
- Also credit MapLibre GL JS (BSD-3-Clause) on the about/credits page.

## What MAP needs to know (integration)

1. **Scripts** (classic, in this order; only on the map view is fine): `js/vendor/maplibre-gl.js` →
   `data/map/base.js` → `data/map/style.js`; CSS `js/vendor/maplibre-gl.css`. `detail.js` and `streets/*.js` are
   added by `style.js` as `<script>` tags from `SM.mapStyle.root + path` (set `SM.mapStyle.root = ''` when the page
   is `site/index.html`). They need `script-src 'self'` only.
2. **CSP** (index.html): add `worker-src blob:` and `child-src blob:` (MapLibre's standard build starts its worker
   from a blob URL) and `img-src 'self' data: blob:`. `connect-src` stays `'none'` (verified: no requests at all).
3. **WebGL check**: `maplibregl.supported` does **not** exist in v4. Use
   `!!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))` on a scratch canvas; if
   false (or `new maplibregl.Map` throws, or the map fires `error` before `load`), show the v3 SVG fallback.
4. **Init** inside `SM.motion.afterTransition()` (MOTION-SPEC §4 Map), after the webfont is ready (labels are
   rasterised from the page font once, so wait up to ~900 ms for
   `document.fonts.load('500 16px "IBM Plex Sans JP"')` and `700`):
   ```js
   SM.mapStyle.prepare(maplibregl);                      // registers the empty 'smglyph' protocol, once
   var opts = { container: el, style: SM.mapStyle.build({ lang: 'ja', theme: 'light', selected: code }),
     localIdeographFontFamily: SM.mapStyle.fontFamily, maxBounds: SM.data.mapMeta.maxBounds,
     bounds: SM.mapStyle.areaBounds(code) || SM.data.mapMeta.bounds, fitBoundsOptions: { padding: 24 } };
   for (var k in SM.mapStyle.mapOptions) opts[k] = SM.mapStyle.mapOptions[k];
   var map = new maplibregl.Map(opts);
   SM.mapStyle.attach(map, { theme: 'light' });          // all-script local glyphs, station icon, lazy LOD files
   map.on('load', function () { SM.mapStyle.select(map, code); /* fade canvas in 240ms, add pins */ });
   ```
   `attach` patches one MapLibre 4.7.1 internal (`GlyphManager#_doesCharSupportLocalGlyph`) so Latin and digits are
   drawn locally too; it returns `true` when the patch is active. If a future MapLibre drops that method, CJK still
   renders (localIdeographFontFamily) and only Latin labels would be missing — keep 4.7.1.
5. **Selection**: `SM.mapStyle.select(map, '13120')` (null clears) sets feature-state on `areas` (`promoteId:
   'code'`): tint `--action-tint` 70% under the green/water, 2px ink outline, the area label switches to Plex 700
   ink; 320 ms paint transitions. `SM.mapStyle.areaBounds(code)` gives `[w,s,e,n]` for `fitBounds`/`flyTo`.
   `SM.mapStyle.selected()` returns the current code.
6. **Camera**: 全体 = `fitBounds(SM.data.mapMeta.bounds, {padding: 16})` (whole Tokyo fits the phone frame,
   z ≈ 8.0 at 390×473). 現在の区 = `fitBounds(areaBounds(code), {padding: 24})`. Area pick = `flyTo` /
   `fitBounds` with `duration` clamp(600, distance, 1200), `curve: 1.42`, `essential: false`; reduced motion →
   `jumpTo` / `duration: 0`. Zoom buttons `easeTo({zoom: z ± 1, duration: 300})`. `minZoom` 7.3, `maxZoom` 15.5 (the data
   is z14; past 15.5 the overzoomed z14 geometry shows its corners). Sources cut tiles up to z13–15 (geojson-vt
   `maxzoom` per source in `style.js`) so lines stay smooth when zoomed in,
   no rotation/pitch; `maxBounds` keeps the camera inside the data.
7. **Theme / language**: `SM.mapStyle.setTheme(t)` then `map.setStyle(SM.mapStyle.build({ lang, theme: t,
   selected: SM.mapStyle.selected() }))`. Re-add your pin source/layers on the next `style.load`
   (`setStyle` replaces everything; data already loaded is reused, nothing reloads). `lang: 'en'` uses the `en`
   property (romaji / English) where present.
8. **Pins**: add your own GeoJSON source + symbol layers (or HTML markers) **after** `label-station-top`, or insert
   them before `label-area` if area labels should stay on top. Icons via `map.addImage` from a canvas (no sprites).
   Re-add images on `styleimagemissing`.
9. **Lazy data**: `SM.mapStyle.attach(map, {detailDelay: false, busy: fn})` lets the view start the detail itself
   (`SM.mapStyle.start()`, e.g. once its reveal has played; 6 s fallback). `detail.js` then feeds one layer per task
   (`water` → `green` → `roads` → `streams`, 90 ms apart, never while the camera moves or `busy()` is true), so no
   single task holds the whole decode + `setData`. Until a layer arrives its overview stand-in (`pre-water`,
   `pre-green`, `pre-road-case`, `pre-road`: the `*Lo` data drawn at detail scales) fills in, and it is removed once
   the new source has drawn (`sourcedata` + `isSourceLoaded`, 4 s fallback): no blank-then-pop at the first paint.
   `SM.mapStyle.ensure('detail', cb)` forces `detail.js`; streets load automatically at
   zoom ≥ 12.4 on `moveend` and during user gestures (not along a programmatic flight path), only the files whose
   bbox touches the view + 25% (`SM.data.mapMeta.streets[code] = [w,s,e,n,bytes]`); the `streets` source holds
   just those areas. `SM.mapStyle.pending()` = files still loading (useful for a tiny loading hint).
10. **Performance notes**: ~40 style layers, GeoJSON sources tiled in the worker. On a cheap Android the first
    `load` is dominated by decoding `base.js` (~0.3–0.5 s); `detail.js` decodes in idle time. Do not create the
    map inside a view transition.

**Label clean-up** (`style.js`, once per load): `(特)` / `(サクラ)` suffixes stripped, names starting with `(`
dropped, `本名(別名)` reduced to one name, river-mouth duplicates of the big rivers dropped, and 荒川 / 隅田川 /
多摩川 / 江戸川 / 中川 (z11) and 神田川 (z12) promoted so they label first. Subway-only stations (`SUB`) are drawn
with a grey ring and grey, smaller names and placed after JR / private stations. Station names may step out to a
far ring of anchors when a pin's invisible collision box (map.js `m-pincol`) stands on the station.
`SM.mapStyle.hideAreaLabels(map, codes)` hides area names that map.js draws as count chips at overview scales.

## Layers (schema)

Coordinates are WGS84 lon/lat (JGD2011 ≈ WGS84). `t` = 1 inside Tokyo (mainland), 0 outside (context, drawn dimmed).

| Layer | Geometry | Properties | Notes |
|---|---|---|---|
| `mask` | Polygon | — | everything in the data extent that is not Tokyo; drawn over land/green, under water |
| `areas` | (Multi)Polygon ×53 | `code name kana en group` | N03 exact codes (`13101`…`13308`), `group` 23ku/tama/… as `data/areas.js` |
| `areaLabels` | Point ×53 | `code name kana en group area` | pole of inaccessibility of the largest part; `area` km² (sort key) |
| `borders` | Line | `k` muni\|pref, `t` | muni = between two Tokyo areas; pref = prefecture lines (t=1 if Tokyo is on one side) |
| `waterLo` | Polygon | `k` sea\|inland | overview (z < 10.5), ≥ 4 ha, 35–45 m generalisation |
| `water` | Polygon | `k`, `minz` | z14 GSI water (1:2,500 level) in the detail box, z11 outside; `minz` by size |
| `streams` | Line | `minz` | GSI river centre lines not covered by water polygons, ≥ 300 m; minz 11/12/13 by length |
| `coast` | Line | — | sea outline without artificial box edges |
| `greenLo` | Polygon | — | parks + forests ≥ 30 ha for z < 10.5 |
| `green` | Polygon | `k` park\|forest\|farm, `minz`, `ctx` | parks/forests/farms; `ctx: 1` = forest outside Tokyo (L03-b only) |
| `roadsLo` | Line | `k` motorway\|trunk, `t` | z11 GSI, for z < 10.5 |
| `roads` | Line | `k` motorway\|trunk\|primary\|secondary, `t`, `tunnel` | 高速 / 国道 / 都道府県道 (primary ≥ 13 m), z13 GSI |
| streets (`SM.data.mapStreets[code]`) | MultiLine | `w` 0 (< 5.5 m) \| 1 (5.5–13 m) \| 2 (≥ 13 m), `c: 1` = context cell | 市区町村道, joined into straight "strokes", 2 m generalisation; the style merges the visible files into the `streets` source |
| `rail` | Line | `cls` jr\|shinkansen\|private\|subway\|mono\|tram, `name` (N02 line), `label` (display name, e.g. 東武スカイツリーライン), `op` (short operator), `t`, `ug` | `ug: 1` = tunnel / underground section (from GSI RailCL), drawn dashed |
| `stationLines` | Line | `cls`, `t`, `ug` | N02 station platforms (≥ 30 m), drawn as the Japanese platform bar from z13 |
| `stations` | Point ×684 | `name en kana lines[] r minz t jr sub short` | one per station complex (same name within 700 m merged); `r` = ridership rank in Tokyo (999 outside); `minz` = first zoom shown (z8 anchors 新宿 渋谷 池袋 東京 品川 上野 立川 八王子 町田 吉祥寺, then spacing + ridership); `sub: 1` subway-only (from z12); `short` map label (羽田空港) |
| `labels` | Point ×875 | `name en kind ang vert minz t` | `kind` river\|lake\|sea\|park\|cemetery\|landmark\|hill\|peak; `ang` text rotation (deg, map-aligned); `vert: 1` = vertical (縦書き) river name |

`SM.data.mapMeta`: `version`, `bounds` (Tokyo mainland), `maxBounds`, `detailBounds`, `center`, `attribution`,
`files` (`streets` has a `{code}` placeholder), `lod {detailFrom: 10.5, streetsFrom: 13}`, `streets {code: bbox+bytes}`.

## Recommended style (as built by `SM.mapStyle.build`)

Light follows VISUAL-SPEC §7.10; dark is the opt-in 暗い画面 palette (`SM.mapStyle.palettes`).

- **Land** `#F7F6F2`, turning to the urban-block tone `#F1EFE9` from z12.5→14.5 so white streets read. Outside
  Tokyo: `#ECEAE3` at 72% over land and green, under water (the bay stays blue).
- **Water** `#D3E3EF`, streams/coast `#B4CEE3`; names Plex 500 11px `#3D5F80` (4.5:1 on water), letter-spacing .08em, rotated along
  the river or 縦書き.
- **Green** park `#DDEBD7`, forest `#E3ECDB`, farm `#EEF0E3` (z ≥ 12); names `#43603A` from z11.5; peaks `▲` from z10.
  Landmarks (東京タワー, スカイツリー, 都庁 … `LANDMARKS` in `style.js`) are placed first in that layer, in ink-2.
- **Streets** a fine `#E5E2D9` texture at z13, white with a `#D6D1C5` casing from z14 (widths by `w`).
  `SM.mapStyle.build({ big: true })` (文字を大きく) scales every text size by 1.2.
- **Roads** white with `#CCC6B8` (国道 `#BDB6A5`) casing; 高速 sand `#F8EDD6` / `#D2BC92`; tunnels dashed.
- **Rail** JR ink `#1B1B19` with 6/6 white dashes from z11 (the Japanese convention); private `#5E5D57`; subway
  `#9C9A92` dashed from z12; tunnels dashed and faint; platforms = white bar with ink (or grey) casing from z13;
  station squares (white, 1.5px ink) up to z14.2; the squares are the last style layer (before map.js's pin
  collision proxy) and never block labels (`icon-ignore-placement: false`, drawn with `allow-overlap`).
- **Borders** muni `#9C9A92` dashed 3/2; prefecture `#8A877E`; selected area `--action-tint` 70% + 2px ink.
- **Labels** priority: anchor stations > selected area (Plex 700) > area labels (Plex 500 `#77756E`) > stations
  (Plex 500 ink, 2px white halo, ranked by ridership) > water / green / hills.
- No pitch, no rotation, no idle animation; 180 ms label fade.

## Rebuild (tmp4-MAP-DATA/, Node 22 + Python 3 venv with shapely 2, numpy, scipy, scikit-image; mapshaper via npx)

Run Python with `venv/bin/python -I` from `tmp4-MAP-DATA/` (downloads are untrusted data). Extents live in
`scripts/geo.py` (`DETAIL` 138.92,35.48–139.94,35.92 = z12–14; `CONTEXT` 138.40,35.05–140.45,36.30 = z9–11).

1. `node scripts/fetch.js` — polite cached tile download to `dl/tiles/opt/z/x/y.pbf` (UA `SudachiMap-build/1.0`);
   `node scripts/fetch_exp.js` for `experimental_bvmap` labels.
2. Decode: `node scripts/extract.js <z> <bbox> WA,RvrCL,Anno,RdCL,RailCL[,AdmBdry|,Cstline|,BldA] work/z<z>` for
   z9–11 (CONTEXT), z12–13 and z14 (DETAIL); `extract_exp_labels.js`, `extract_exp14_labels.js`.
3. KSJ zips into `dl/ksj/x/` (N03-20240101 08 10 11 12 13 14 19, N02-24, S12-24, L03-b-21 5238–5440).
4. Admin: mapshaper `-i N03 files combine-files snap -merge-layers force -clip bbox=138.35,35.00,140.50,36.35
   -each 'pref=N03_001, code=N03_007' -dissolve2 code copy-fields=pref,N03_004` → `n03_ctx.json`; `-simplify
   interval=4 keep-shapes -filter-islands min-area=2000` → `n03_simp.json`; `-lines pref,code` → `n03_lines.json`;
   then `scripts/build_admin.py`.
5. `scripts/build_water.py` (unions cached in `work/water_union_*.pkl`; delete them after changing extents),
   `scripts/build_streams.py`.
6. `scripts/build_rail.py` (N02 + S12 + GSI tunnels) → `scripts/build_labels.py` (station readings, Anno names).
7. `scripts/build_roads.py` (major roads + overview roads), `scripts/build_streets.py` (per-area street files,
   writes `site/data/map/streets/` and `work/streets_index.json`).
8. Green: `scripts/l03_grid.py dl/l03grid.npy <L03 geojsons>` → `scripts/build_green.py` (block classification,
   slow: several minutes on 4 processes) → `scripts/build_green_final.py` (`scripts/green_forestmask.py` redoes only the L03 mask).
   Round 3 park fill (FIXER-map-2, `tmp4-FIXER-map-2/green/`): `green_fix.py` (flood fill from park labels,
   `parks_extra.pkl`) → `final.py` (runs build_green_final with those parks added) → `splice.py` (encodes with
   `codec.py` and replaces only the `_lazy.green` statement in `detail.js` and `M.greenLo` in `base.js`; build_js.py
   is not re-run because detail.js was post-processed into lazy functions).
9. `scripts/build_js.py` → `base.js`, `detail.js`, `mapMeta`. Then `node --check` every file.
10. Visual check: `node scripts/shots.js overview,ku23,nerima,shinjuku 390x844 2 '&frame=app'` (Playwright,
    SwiftShader) → `shots/`. The prototype is `tmp4-MAP-DATA/proto/index.html` (same CSP as the app plus the
    blob worker).

## How the less obvious parts were made

- **Parks and forests** are not in the GSI tiles as polygons. City blocks are polygonised from the z14 road
  network, then each block is scored with GSI map symbols inside it (広葉樹林/針葉樹林/竹林, 墓地, 田畑, 公園 names),
  L03-b land use (12 m samples) and building cover. Clear park blocks keep real street-bounded edges (皇居, 新宿御苑,
  代々木公園, 井の頭公園, 多磨霊園 …); mountains and the context use a smoothed L03-b forest mask.
  Park paths are ordinary 市区町村道 centre lines, so big parks fall apart into small blocks that miss their label.
  Every GSI park label (Anno 534, plus park-like 531 sites: 新宿御苑, 皇居外苑, 赤坂御用地, 庭園, 緑地) therefore
  seeds a flood fill over touching blocks that are nearly unbuilt (BldA < 20%), not built-up in L03-b (700 ≤ 35%),
  not water (vector water ≤ 50%) and green in L03-b or holding a tree/park symbol: 500 m / 60 ha caps for ordinary
  labels, 1–1.7 km / 250 ha for the iconic ones (井の頭, 駒沢, 水元, 昭和記念, 葛西臨海, 代々木, 砧, 光が丘, 舎人,
  木場, 夢の島, 城北中央, 野川, 神代植物公園).
- **Station readings** come from GSI `experimental_bvmap` kana, accepted only when they match the reading of the
  name's prefix (fixes GSI's 西日暮里 → にっぽり), plus manual overrides for katakana names; English is Hepburn
  without macrons (Ryogoku, Ochanomizu).
- **Tunnels**: N02 lines are split where they run inside a GSI トンネル/地下 corridor and away from surface track.
- **Streets** are noded, merged and re-joined into straight strokes through intersections before simplification
  (about half the vertices of a plain edge list).

## Known limits

- No buildings (GSI z14 BldA only has 堅ろう buildings and would add several MB).
- No road names; street classes come from the GSI width ranks.
- Context outside Tokyo is intentionally lighter (no streets beyond 2.5 km, coarser water).
- Islands (大島, 八丈島, 小笠原 …) are not in this data set; the list view covers them.
