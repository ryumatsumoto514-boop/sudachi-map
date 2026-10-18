# 巣立ちマップ — LOGO (v4, final)

Owner: BRAND-FINAL. Files: `assets/brand/*`, the brand block in `js/icons.js` (`SM.icon('logo')`, `SM.brand`).
Board: `tmp4-BRAND-FINAL/board.png` (scratch, not shipped).
Everything is generated from one geometry source. To regenerate, run `python3 tmp4-BRAND-FINAL/build.py --js --png`.
Do not hand-edit the generated paths.

> **Fix this first (ENGINE, one line).** `boot.js` still paints `ic('logo')` and then the typed name.
> The new mark *is* 巣, so today's header reads "巣 巣立ちマ…".
> Replace it with `SM.brand.lockup({ label: false })` (see §8). PLAN's print header and HOME's colophon have the
> same pattern (§8).

---

## 1. Decision

**The logo is 「駅名標」: a 巣 station box on a green line that steps up at 45°.**

- The 巣 box reads like a station number box (駅ナンバリング). It is station 00, where your line starts.
- The green line leaves the box and steps up one level. That step is 巣立ち.
- A line runs both ways, so you can always come back.
- The 巣 is also the first character of the name. The lockup therefore still reads 巣立ちマップ: the box is not an
  extra symbol bolted onto the name.

### Panel (5 concepts, 3 independent judges, 0–10 each)

| concept | idea | youth | designer | team | total |
|---|---|---:|---:|---:|---:|
| **駅名標 (path)** | 巣 station box on the green line that steps up | **8** | **8.5** | 7.5 | **24** |
| 燕 (bird) | a swallow climbing out of the ink nest | 6.5 | 5 | 8 | 19.5 |
| はじめの一画 (type) | 立 with its first stroke in green | 5.5 | 7.5 | 5.5 | 18.5 |
| 巣ピン (pin-nest) | a map pin whose head opens like a nest | 6 | 6 | 6.5 | 18.5 |
| ひらく (door) | an entrance door swinging open toward you | 5 | 4 | 6 | 15 |

Two of the three judges ranked it first, and it has the highest total.

**Why this one.**
- It is the only concept that is a whole system rather than a picture. The box has the same form as the category
  marks (住 金 学 働 手 話).
- The green line can carry on into the map (routes) and the UI.
- It looks like Japanese public signage, not like an app template.
- It works in one colour, reversed, in dark mode and as a 16 px favicon.

**Why the bird was dropped.** Ryu asked whether the logo should be a bird at all. We tested it and the answer is no.
- At 16–32 px (favicon, tab, app bar) every bird we drew became a green dot or a green splat.
- A lone swallow is a very common motif (ヤクルト, JR つばめ, tattoo flash), so it would not be ours.
- It says "leaving" but nothing about *where to go*, and a map app is about where to go.
- A mascot animal reads young. The users are 中学生 up to young adults leaving care, so the mark should feel public,
  calm and grown-up, like a station sign that adults also trust.

The bird's best idea is kept as the story. Like the station swallows that return every spring, the line runs both
ways: you leave, and you can come back.

---

## 2. Construction

All three masters below share the same layout. They differ only in hinting.
- **Display master** (files, print, large): em = 100 units, unhinted.
- **Screen master** (`SM.brand.lockup`): box = 20 units, with 巣 and the wordmark snapped to whole pixels for a 24 px box.
- **Small master** (`SM.icon('logo')`, favicons): redrawn per size, hinted per size.

### Display master (em = 100)
| part | value |
|---|---|
| box | B = 98 square. Top at −92, bottom 6 below the baseline. Ink, square corners. |
| 巣 in the box | Zen Kaku Gothic New **700**, set at 76 % of B and knocked out (the page shows through). Lifted 0.6 % of B optically. |
| wordmark 立ちマップ | Zen Kaku Gothic New **900**, outlined. マ ッ ×1.12, プ ×1.08. Tracking +4. Kerning 立ち −3, ちマ −7, マッ −8, ップ −10. |
| box → 立 | gap 10 (14 visible, including 立's side bearing) |
| line | u = 10 thick. It starts at the box's left edge, u/2 under the box, and runs 1.5u past the last glyph's ink. |
| step | rise 2u at 45°, then a run of 2.5u. Centreline fillets r = 0.75u, square ends. |
| colours | box and wordmark: ink. Line: green. Nothing else is ever green. |

### Symbol (`mark.svg`, per box side 100)
The box stands on the line. Line 12, gap 6, the line runs 8 past the box, rise 24, run 24, fillet 9.

### Screen master (`SM.brand.lockup`, units = 1/20 box)
- Box 20 × 20 at (0, 0).
- Line lockup: line 2 thick, 1 under the box, rise 4, run 5, fillet 1.5. viewBox 134 × 23.
- Compact lockups: the viewBox is exactly the box height (ja 122.5 × 20, en 148 × 20) with `overflow="visible"`.
  The ち / プ / p tails hang just below. **CSS `height` is therefore the box size in px**, and the box always lands
  on whole pixels (tested: 18/20/22/24 px, top on an integer px, at 1×, 2× and 3×).

### Small master (24 grid, `SM.icon('logo')`, `mark-small.svg`)
- Box 20 at (0, 0), with 巣 hinted at 20 px.
- 1-unit gap, then a straight 3-unit foot that runs the full 24 width, past the box.
- At this size the step cannot be drawn cleanly, so the foot is straight.

### Favicons
- `favicon-32.svg`: box 26 (巣 at 80 %, hinted), foot at y 28–32, opaque paper behind.
- `favicon-16.svg`: hand-cut on the 16 px grid. Box 13, foot at y 14–15.
- Both carry `@media (prefers-color-scheme: dark)` inside the SVG: the box turns light (#EDEBE4) on dark chrome.
- Checked at real 16 px in light and dark tab mocks (board §05).

---

## 3. Versions and files (`assets/brand/`)

| file | what | use |
|---|---|---|
| `lockup-horizontal.svg` (+ `-mono`, `-reverse`) | box + name + green line | **primary**, ≥ 40 px tall: splash, about, posters, OG image |
| `lockup-compact.svg` (+ `-mono`, `-reverse`) | box + name, no line | app bar, headers, anything < 40 px tall |
| `lockup-en.svg` (+ `-mono`, `-reverse`) | box + "Sudachi Map" | English contexts only |
| `lockup-stacked.svg` (+ `-mono`, `-reverse`) | symbol over 巣立ちマップ over SUDACHI MAP | portrait: posters, stickers, slide titles, end cards |
| `mark.svg` (+ `-mono`, `-reverse`) | symbol: the box on the stepping line | ≥ 40 px where the name is already present (social avatar, sign-off) |
| `mark-small.svg` (+ `-mono`, `-reverse`) | 24-grid mark (box + straight foot) | 16–32 px UI; the same drawing as `SM.icon('logo')` |
| `app-icon.svg`, `app-icon-green.svg` | 180 grid, the symbol as a sign with the line running off the edge | home-screen icon, store, LINE avatar |
| `favicon-32.svg`, `favicon-16.svg` | per-size masters | browser tab |
| `mark-animated.svg` | screen line lockup with grouped parts and the launch keyframes | reference and preview of the launch slot (§7) |
| `favicon-data-uri.txt` | favicon-32 as a data URI | `index.html` `<link rel="icon">` |
| `brand-snippets.txt` | exact markup and CSS strings for LAUNCH and ENGINE | paste, do not retype |
| `png/` | app-icon-180/512, favicon-16/32, mark-1024, lockup PNGs (2400 w), line-profile-640 | apple-touch-icon, decks, docs, SNS |

JS API (`js/icons.js`, classic script):
- `SM.brand.lockup({ line, lang, label, cls, clipId })`: inline SVG string. The defaults are compact, the current
  language and `role="img"`.
- `SM.brand.mark(cls, label)`: the 24-grid mark.
- `SM.icon('logo')`: the same mark in icon form (`aria-hidden`).
- `SM.brand.data`: the raw geometry.
- Animation parts carry classes: `.lg-box`, `.lg-word > .lg-g1…`, `.lg-line > .lg-run1 .lg-step .lg-run2`.

---

## 4. Clear space, minimum sizes

- **Clear space:** ½ B (half the box side) on every side of any lockup. Nothing goes inside it, including the
  masthead rule. The app bar is exempt vertically, because the bar itself is the frame.
- **Minimum sizes (box side):**

| version | screen | print |
|---|---|---|
| line lockup | box ≥ 34 px (lockup ≥ 40 px tall) | box ≥ 8 mm |
| compact lockup | box ≥ 14 px | box ≥ 4 mm |
| symbol `mark.svg` | ≥ 40 px | ≥ 12 mm |
| small mark / favicon | 16–32 px (use the per-size master) | — |

- **App bar sizes (box = CSS height):**

| width | ja | en |
|---|---|---|
| ≥ 900 px | 24 px | 24 px |
| 420–899 px | 22 px | 22 px |
| 380–419 px | 22 px | 18 px |
| 340–379 px | 20 px | 18 px |
| < 340 px | 18 px | 14 px |

  These sizes were measured on the live header at 320, 360, 390, 430 and 1280 px. At each size there is room before
  すぐ閉じる / Quick exit.

## 5. Colours

| token | light | dark | role |
|---|---|---|---|
| ink (`currentColor`, `--ink`) | #1B1B19 | #EDEBE4 | box and wordmark (17.3:1 / 15.5:1 on paper) |
| green (`--action`) | #0B6E44 | #3FB37A | the line only (6.3:1 / 7.0:1 on paper) |
| paper | #FFFFFF | #141413 | the 巣 is a knockout, so it is always the page colour |

- **Mono:** all ink, or all white on green or on ink.
- **Reverse:** box and name in white on ink, line in green.
- **Never** use category colours, gradients, shadows or outlines.

## 6. Do / don't

**Do**
- Use the line lockup only at ≥ 40 px tall. It always starts at the box and ends with the step, then a run.
- On green or ink, go all white. In one colour, go all ink.
- Use `SM.brand.lockup()` everywhere the name appears as a brand. It is outlined, so it never truncates and never
  waits for the web font.

**Don't**
- Show the box alone. It reads as a hanko or a ramen sign. It always has its line (symbol, small mark) or its name.
- Put the mark next to typed text 「巣立ちマップ」. That reads 巣巣立ちマップ.
- Put the line version in the app bar or anywhere under 40 px. It doubles the masthead rule and looks like a link.
- Recolour the box, stretch, slant, outline, add effects, or retype the name in another font.
- Use a plain green underline as decoration anywhere else. The green stepped line belongs to the logo and to map
  routes.
- Use the logo as a map pin, or put the brand box in a row of category marks.

---

## 7. Launch animation (MOTION-SPEC §2.3 slot): parts and order

Same SVG as the static lockup: `SM.brand.lockup({ line: true, label: false, clipId: 'lx-clip' })`.
- The wordmark group has a **static** clip ending at the line's top edge, so the glyphs rise from behind the line.
- Transform and opacity only. Every part has `transform-box: fill-box`. Fill mode is `backwards`.
- No dashoffset, no clip, mask or filter animation, no SMIL.

**Order:**
1. The box stamps.
2. The line leaves the box and accelerates like a train.
3. Each kana of 立ちマップ rises as the line head passes under it.
4. The 45° step comes last.

| part (slot) | class | from → to | origin | start | dur | curve |
|---|---|---|---|---:|---:|---|
| lx-p1 box | `.lg-box` | opacity 0→1 (by 20 %), scale 1.14 → 0.975 → 1 | 50 % 100 % | 120 | 300 | in `(.55,0,.9,.45)`, then `(.2,0,.2,1)` |
| lx-p2 run 1 | `.lg-run1` | scaleX 0→1 | 0 50 % | 200 | 200 | `(.45,0,.55,1)` |
| lx-p3 step | `.lg-step` | scale 0→1 | 0 100 % | 400 | 50 | `(.4,0,1,1)` |
| lx-p4 run 2 | `.lg-run2` | scaleX 0→1 | 0 50 % | 450 | 70 | `(0,0,.2,1)` |
| wordmark row: 立 ち マ ッ プ | `.lg-g1…g5` | translateY(24 → 0) user units, from behind the clip | — | 240 / 262 / 282 / 302 / 322 | 340 | `--ease-expo (.16,1,.3,1)` |

- The mark slot runs 120–520 ms: 4 parts, and the line takes 320 ms in total. The box stamp is the one accent beat
  (2.5 % undershoot).
- The wordmark row settles at 662 ms. This replaces MOTION-SPEC's generic "6 glyphs at 240 + 36 × i", because the
  巣 is the box.
- **The settled frame is pixel-identical to the static lockup.** Tested at 2×: diff = 0. The fill mode must stay
  `backwards`: with `both`, the identity transform stays on and re-antialiases (max diff 25/255).
- CSS to paste: `brand-snippets.txt` §4 (already scoped to `#launch`, with `lg-*` class names, so no renaming is
  needed).
- Preview: open `assets/brand/mark-animated.svg` in a browser.

**Layout in the splash.**
- Box 52 px: lockup height = 52 × 23 / 20 = 59.8 px; width 348 px at 52.
- Use `min(52px, (100vw − 32px) × 20 / 134)` so it fits at 320 px.
- Seat the lockup on MOTION-SPEC's rule: the rule's centre line sits on the centre of `.lg-run1` (lockup y = 22
  units, i.e. 57.2 px below the box top at 52 px).
- The green route then draws *along* the ink rule and steps up off it. The rule runs ahead of the green the whole
  time.
- The caption hangs below the rule, as specified.

**Hand-off (§2.4).**
- In one rAF, read `#launch .lg-box` and `.appbar .brand .lg-box`. Both SVGs use the same coordinates (box at 0,0,
  identical glyph paths).
- With transform-origin `0 0` on the splash SVG:
  - `s = dst.height / src.height`
  - `translate(dst.left − src.left, dst.top − src.top) scale(s)`
  - 380 ms (260 ms after a skip), `--ease-standard`.
- `.lg-line` opacity 1→0 over 160 ms, linear, from H. The compact app-bar lockup has no line.
- The ink rule translates to the masthead rule, as specified.
- **English (`lx-en`):** the box FLIPs, the JP wordmark fades over 120 ms, and the app-bar "Sudachi Map" lockup
  fades in from H+200 over 160 ms.

**Other cases.**
- **Returning visit (`lx-short`):** box beat only, `.lg-box` scale 1.08 → 0.975 → 1, 260 ms from 60 ms, on the
  app-bar lockup. The CSS is `brand-snippets.txt` §5.
- **Skip:** the CSS keyframes obey `html.lx-skip #launch * { animation-delay:0; animation-duration:120ms }`.
- **Reduced motion:** static. Use `brand-snippets.txt` §6 (`html.m-reduce` and the media query).
- A reference demo of the FLIP (not shipped) is `tmp4-BRAND-FINAL/demo-launch.html`.

---

## 8. Integration checklist (each owner)

**ENGINE (`boot.js`, about line 128).** Replace `ic('logo') + '<span class="brand-name">' …`:

```js
'<a class="brand" href="#/" aria-label="…">' + SM.brand.lockup({ label: false }) +
  '<span class="brand-name">' + esc(t('shell.brand')) + '</span></a>'
```

Keep the string identical to the static HTML (`brand-snippets.txt` §2), so the repaint changes nothing (§2.7).

**SYSTEM (`base.css`).**

```css
.appbar .brand { gap: 0; }
.appbar .brand .logo-lockup { display: block; flex: none; height: 22px; width: auto; max-width: none; overflow: visible; }
@media (max-width: 379px) { .appbar .brand .logo-lockup { height: 20px; } }
@media (max-width: 339px) { .appbar .brand .logo-lockup { height: 18px; } }
@media (max-width: 419px) { body.lang-en .appbar .brand .logo-lockup { height: 18px; } }
@media (max-width: 339px) { body.lang-en .appbar .brand .logo-lockup { height: 14px; } }
@media (min-width: 900px) { .appbar .brand .logo-lockup { height: 24px; } }
.appbar .brand .brand-name { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
```

`max-width: none` matters: the global `svg { max-width: 100% }` would otherwise squash the lockup off the pixel
grid at 320 px.

**LAUNCH (`index.html`, `launch.css`, `launch.js`).**
- Favicon: paste `brand-snippets.txt` §1 (the data URI) in place of the old one.
- Add `<link rel="apple-touch-icon" href="assets/brand/png/app-icon-180.png">`.
- Static app-bar brand: `brand-snippets.txt` §2.
- Splash: §3.
- Keyframes: §4–§6.
- Choreography: §7 above.

**HOME (`home.js`).**
- Colophon (about line 543): replace `h-colo-mark` + `h-colo-name` with `SM.brand.lockup()` (role img, it names
  itself). Size it with `height: 28px`.
- Hero eyebrow `h-logo` (about line 229): `SM.icon('logo')` is allowed there because it is not next to the name.
  It is redundant under the app bar, though, so dropping it is fine.

**PLAN (`plan.js`, about line 655).** In the print header, replace `ic('logo') + '<span>巣立ちマップ</span>'` with
`SM.brand.lockup()` at `height: 5mm`.

**MAP (recommendations only).**
- Category pins can be station boxes (same square, same knockout).
- A route is the green line.
- 現在地 is a green dot.
- Never use the logo itself as a pin.

## 9. Type and licence
- Zen Kaku Gothic New (SIL OFL 1.1), outlined into paths, so no font file ships for the logo.
- The 900 weight exists only inside the logo outlines. That is exempt from VISUAL-SPEC's no-900 rule for live text.
- SUDACHI MAP in the stacked lockup is Zen Kaku Gothic New 700, tracked +36.

## 10. Known risks
- **Until ENGINE switches `boot.js`, the header shows 巣 twice** (see the top of this file).
- At 16 px, the 巣 is a pattern rather than a legible character. The box and the green foot carry the recognition.
  This is checked and accepted: it reads as "the black box with the green line".
- At 1×, the favicon-32 master scaled to a 16 px tab is softer than `favicon-16.svg`.
  `index.html` uses favicon-32 as the data URI, because browsers pick that at 2×. `favicon-16.svg` and
  `png/favicon-16.png` are there for 1×-heavy contexts.
- "Sudachi Map" alone can read as the citrus (酢橘). Use the English lockup only where the context is clearly
  Japanese support. Japanese stays primary.
