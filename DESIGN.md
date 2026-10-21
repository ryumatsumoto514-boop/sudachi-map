# 巣立ちマップ design system v5: 「教科書と駅サイン」, set properly — and moving

**v5 (SPEC-v5, 2026-10-18).** Two changes on top of v4, both from Ryu's review ("everything is still"; "too many words"):
- **Motion at a visible scale** (Part A): 280–520ms, 24–48px of travel, a spring ease-out with ≤4% overshoot, stagger 50ms
  capped at 8. Pages push in with depth, tabs cross-fade while the indicator slides, the tapped row's mark and title morph
  into the next page's header, controls sink 2px and darken under the finger, a dot flies to やること when you save. Reduced
  motion keeps short fades and colour changes only. See §7.
- **Fewer words in shared components** (Part B): rows carry a title, ONE key fact and up to three fact tags — no grey
  sub-line, no eyebrow, no labelled facts. Everything else goes on the detail page or behind 「くわしく」 (`SM.ui.more`). See §6.


v4 keeps the v3 idea (a textbook crossed with station signage: paper, 墨 ink, one green, flat, ruled, typographic) and makes
the craft visible. That means:
- one type family for display and numbers (IBM Plex Sans JP)
- one drawn arrow
- one heavy rule that draws itself in
- category marks that travel between screens
- controls that answer the finger in the same frame

Contracts this file implements: `VISUAL-SPEC.md` §2–6, §8–9 (look) and `MOTION-SPEC.md` §4.1 (component motion).

**Files.** SYSTEM owns these:
- `css/base.css`: tokens, shell, every shared component
- `js/components.js`: `SM.CATS` and `SM.ui.*`
- this file

Others own the neighbours:
- `js/icons.js` (`SM.icon`, `SM.brand`): BRAND
- `js/illus.js` (`SM.illus`): ILLUS
- `js/motion.js` and `css/motion.css` (`SM.motion`): ENGINE
- `css/launch.css`: LAUNCH

**Style guide.** `../tmp4-SYSTEM/guide.html` is every component on one page, built by `node ../tmp4-SYSTEM/guide.js 390,1280
[dark|big,ruby|en]`. Open it next to your view.

---------------------------------------------------------------------------------------------------
## 1. Hard rules (reviewers check every one)

| Rule | In practice |
|---|---|
| **Two families, two weights each** | Display, labels, controls and every number use IBM Plex Sans JP **500/700** (`--font-display`, `--font-num`). Running text uses BIZ UDPGothic **400/700** (`--font-body`). **No 900, no 300, no Zen Kaku.** `font-synthesis-weight: none`. |
| **Text styles only** | Use the `.ts-*` classes or the `--t-*` role tokens (§3.2). No raw `font-size: Npx/Nem` in view CSS, no `calc(var(--fs-*) * k)`. |
| **Four trackings** | `--ls-num` −0.02em · `--ls-0` 0 · `--ls-body` .02em · `--ls-label` .04em. Use no other `letter-spacing`. |
| **Rules** | Hairline = `1px var(--rule)` everywhere. The **one heavy rule** = `2px var(--rule-heavy)` (ink), only at section starts (`SM.ui.sectionHeader`) and the page title of a detail page. **Never two rules within 8px.** |
| **Radius 0** | Blocks, rows, bands, sheets and images use `0`. Buttons, inputs, tags and chips use `var(--r-ctl)` (2px). Only things whose meaning is round use `--r-round`: radio, map pin, timeline dot. |
| **No card-with-shadow** | Group with whitespace, hairlines and flat `.band` tints. `--shadow-overlay` goes on overlays only (sheet, toast, map popover). |
| **No blur, glow or gradient** | The only gradients are the fade masks on horizontal scrollers. |
| **One solid green per viewport** | The primary action. Call buttons are **ink outline** (`.call-go`). `.call-go.is-primary` only when that call IS the screen's action. |
| **Color means something** | Green: action and 返さなくていい. Amber: 締切 and 貸付. Blue: focus and info only (**国・都 is no longer blue**). Red: emergency only. |
| **Category = kanji mark** | 住 金 学 働 手 話 in a solid square (`SM.ui.catIcon`). Never an icon in a pastel tile. |
| **One drawn arrow** | `.arrow` / `SM.ui.arrow(dir)` everywhere: buttons, rows, links. Never type →, ↓ or › as text glyphs in new markup. |
| **No emoji, no decorative icons** | Icons only where they act: phone, external, close, search, settings, copy, calendar, star, tabs. |

---------------------------------------------------------------------------------------------------
## 2. Color tokens (`:root`; dark is opt-in only: `<html data-theme="dark">`, never `prefers-color-scheme`)

| Group | Tokens |
|---|---|
| Paper | `--paper` (page, #fff) · `--paper-2` (band, hover row, selected option) · `--paper-3` (pressed, empty track) · `--field` (inputs) |
| Ink | `--ink` (墨: text, solid buttons, heavy rule) · `--ink-2` (secondary) · `--ink-3` (labels and captions, AA on paper-2) · `--ink-4` (decorative and disabled only, never text) |
| Rules | `--rule` (hairline) · `--rule-2` (control borders, ≥3:1) · `--rule-heavy` (= ink) |
| Washes | `--wash` (6% ink: press) · `--scrim` (ink 32%: behind sheets) |
| Action | `--action` · `--action-hover` · `--action-press` · `--on-action` · `--action-tint` · `--action-text`; fills: `--action-fill(-hover/-press)` · `--on-action-fill` |
| Semantic | `--blue --blue-tint --blue-text` (info and focus) · `--amber --amber-tint --amber-text` (締切・貸付) · `--red --red-hover --red-tint --red-text --on-red` (emergency) |
| Marker | `--marker`: the 蛍光ペン yellow, one phrase per screen. It is also the toast action color. |
| Category | `--cat-housing #355695 · --cat-money #895700 · --cat-education #68448d · --cat-work #006a7d · --cat-procedures #4c5a69 · --cat-consult #8e3665` (one OKLCH family, white glyph ≥6:1), `--on-cat`, `--cat-*-tint`. Inside `.cat-<key>` you get `--cat-c` (fill) and `--cat-t` (tint). Never body text. |
| Focus | `--focus` (blue) · `--focus-ring` (box-shadow form: paper inner ring and blue outer ring, for focus on ink fills and the map) |

v2 and v3 names still resolve (`--bg --surface --line --primary* --sky* --coral* --cat-*-bg/-fg --r-pill --shadow*`
…). Migrate them when you restyle.

---------------------------------------------------------------------------------------------------
## 3. Type

### 3.1 Families
```
--font-display / --font-num  "IBM Plex Sans JP", Hiragino Sans, Noto Sans JP, …   (palt on, tabular digits)
--font-body                  "BIZ UDPGothic", Hiragino Sans, …                    (no palt, tracking .02em)
```
Google Fonts: `BIZ+UDPGothic:wght@400;700&family=IBM+Plex+Sans+JP:wght@500;700` (LAUNCH loads it).
`font-feature-settings: "palt"` is on every display-family text style. Body text never gets palt.

### 3.2 Text styles: class `.ts-*` (and the v3 alias), with size token `--t-*`

| Style | Class | Family · weight | Phone / ≥900px | Use |
|---|---|---|---|---|
| num-hero | `.num-hero` | Plex 700 | 72 / 96 | 165日, 64件: one per screen |
| num-xl | `.num-xl` `.num-big` | Plex 700 | 48 / 56 | stats, simulator total |
| display | `.display` `.ts-display` | Plex 700 | 36 / 48 | home hero H1 only |
| h1 | `h1` `.h1` `.ts-h1` | Plex 700 | 28 / 32 | page, question and program titles |
| h2 | `h2` `.h2` `.ts-h2` | Plex 700 | 22 / 24 | section titles |
| h3 | `h3` `.h3` `.ts-h3` | Plex 700 | 18 | row titles |
| kicker | `.kicker` | Plex 500 | 18 / 20 | the line above display or num-hero |
| lead | `.lead` | BIZ 400 | 16 / 18 | first paragraph, ink-2 |
| body | `.ts-body` (default) | BIZ 400 | 16 | running text |
| ui | `.ts-ui` | Plex 700 (500 inactive) | 15 | buttons, back link, chips, rail |
| meta | `.ts-meta` `.small` | BIZ 400 | 14 | hooks, subs, hours |
| label | `.ts-label` `.eyebrow` | Plex 500, `--ls-label` | 12 | eyebrows, fact labels, group labels |
| micro | `.ts-micro` | Plex 500 | 11 | tab labels, map labels, badges |
| num-l | `.ts-num-l` | Plex 700 | 26 / 28 | phone numbers (nowrap) |
| num-inline | `.ts-num-inline` `.amt-n` | Plex 700 | 1.4em of its text | numbers inside text: 月**5**万円 |

The sizes are `--fs-micro 11 · xs 12 · sm 14 · md 15 · base 16 · lg 18 · xl 22 · 2xl 28 · 3xl 36 · 4xl 48 · 5xl 72 · 6xl 96`, in rem.

**文字を大きく** (`body.is-big`) sets the root to 18px. Everything in rem grows; chrome sizes do not.

**Chrome sizes** are fixed px so the header and tab bar always fit at 320px:
- `--t-chrome` 13: すぐ閉じる, section numbers, the sub-bar title
- `--t-chrome-s` 12
- `--t-badge` 10 and `--t-badge-rail` 11

**Relative tokens:**
- `--t-unit` .38em: 件, 日 and 円 after a big number, same baseline, Plex 500
- `--t-unit-inline` .72em
- `--t-num-inline(-lg)`
- `--t-ruby(-long)`

Line heights: `--lh-display 1.25 · --lh-heading 1.35 · --lh-title 1.45 · --lh-ui 1.4 · --lh 1.75 · --lh-meta 1.6 · --lh-num 1`.

### 3.3 Numbers
Every number the reader acts on is Plex 700 tabular. That covers counts, days, money, phone numbers, progress, ranks and dates in headings.
- Units sit small after the number (`SM.ui.num(222, '件')`).
- Ranks and section numbers have two digits (01) and are small (`--t-chrome`, ink-3).
- Money uses thousands separators and U+2212 for minus.
- Odometer rolls (ENGINE) need Plex digits. Never animate a BIZ number.

### 3.4 Line breaking
- h1–h3, titles and the display: `word-break: auto-phrase; text-wrap: balance`.
- UI strings: `text-wrap: pretty`.
- Paragraphs: normal, `line-break: strict`.
- Single-column text grids use `grid-template-columns: minmax(0, 1fr)`, and flex text children use `min-width: 0`. The shared classes already do this.
- ふりがな: core runs `SM.fitRuby(root)` after each render. Call it yourself after a partial re-render.

### 3.5 English (`body.lang-en`)
palt is off. `--ls-body` is redefined to 0, so every component that uses it loses its tracking. Labels go uppercase, with `--ls-label` raised to .06em. These are the same tokens redefined, not new values.

---------------------------------------------------------------------------------------------------
## 4. Space, grid, layout

| Token | Value |
|---|---|
| `--s-1..11` | 4 8 12 16 20 24 32 40 56 72 96 |
| `--gutter` | 16 (<375) · 20 · 32 (≥900) · 40 (≥1100) |
| `--sec-gap` | 56 phone · 72 desktop: the space between `section`s in `.view` |
| `--bleed` | 12: how far a row's hover or press band reaches past the column |
| `--appbar-h 56 · --subbar-h 48 · --tabbar-h 64 · --tap 44` | |
| `--rail-w` | 232 (≥900) · 256 (≥1280); rows `--rail-row` 48 |
| `--container` | 1120: desktop content box, 12 columns, 24px gaps |
| `--read-w` | 720: reading column (8 of 12) |
| `--sticky-top` | under the appbar, for sticky side columns |

**Desktop (≥900).**
- The content sits right of the rail in one container. It is centered in the remaining space, and all views share its left edge.
- Reading views are 720px wide, left-aligned. Wide views get the full container: render a `.wide-layout` element, or give the view `.is-wide`. The map (`.v-map`) is wide by default.
- Inside the container:
  - `.grid-12` with `.span-3…12`
  - `.split-4-8`, `.split-8-4`, `.split-7-5`, `.split-5-7`, `.split-6-6` (one column on phones)
  - `.sticky-col` for a side column that stays in view
- `.band` is a flat `--paper-2` block: full bleed on phones, the exact grid area on desktop (24px padding). Variants: `.band-action`, `.band-ink`.
- `.cols` / `.cols-3` are newspaper columns with hairline column rules.

**Helpers.**
- `.stack` / `.stack-sm` / `.stack-lg`, `.row`, `.row-between`, `.grid-2`, `.full-bleed`
- `.cv` is `content-visibility: auto`. Put it on sections after the first on long lists (MOTION-SPEC §6).
- `.view > * + *` gives a 24px rhythm (`.tight` makes it 12). `section + section` is `--sec-gap` apart.

---------------------------------------------------------------------------------------------------
## 5. Shell (CORE/LAUNCH markup, styled here)

- **Appbar.** 56px, paper, **1px `--rule` bottom**: the identity lives in the logo now, not in a masthead rule.
  - Left: the lockup `svg.logo-lockup` from `SM.brand.lockup({label:false})`, plus a visually hidden `.brand-name`. The lockup is 22px tall: 20 below 380px, 18 below 340px, 24 at ≥900. In English it is 18 below 420px and 14 below 340px.
  - Right: `.pill.pill-exit` (すぐ閉じる, 1px ink outline), `.pill.pill-sos` (緊急, red) and `.icon-btn` settings. All are 36px tall with 44px hit areas.
  - Contract with LAUNCH: the appbar keeps a **real `border-bottom`**, because launch.js reads its width and color to land the opening rule on it. `.appbar::before/::after` belong to `css/launch.css`.
- **Subbar.** 48px with a hairline. `.back` (Plex 700, chevron that nudges left) | `.subbar-title` (`--t-chrome`, ink-3, ellipsis). On desktop there is no bar: the back link sits above the H1 on the content edge.
- **Tab bar (phone).** 64px with a hairline top. Icons are 24px at 1.75 stroke (2 when active). Labels use micro Plex 500, 700 and ink when active. The badge is a 16px green square with a paper ring.
  - **Indicator:** `.tabbar::before` is a **32×3 green bar centered over the active tab**, positioned by `--tab-index` with `transform` only.
  - CSS derives `--tab-index` from `.is-active` / `[aria-current]`, so it works without JS. Core also sets it inline, along with `--tab-ind-o`, `.has-active`, `.is-extra` and `.ind-ready`. motion.css adds the spring transition after `.ind-ready`.
  - `.tab-extra` (まなぶ) is hidden on phones.
- **Desktop rail (≥900).**
  - The tab bar becomes a left rail: rows are 48px, with a 20px icon and a label at 15px Plex 500 (700 when active).
  - The active row is ONE element (`.tabbar::before`): a paper-2 fill with a 3px ink bar on its left edge. It slides by `translateY(index × 100%)`, and the まなぶ row (index 4) is included.
  - v5: no privacy footnote at the foot of the rail (fewer words; the privacy promise lives in 設定 and the about page).

---------------------------------------------------------------------------------------------------
## 6. Components (`SM.ui.*` returns HTML strings; every v2/v3 signature still works, new options are additive)

### Arrow: `SM.ui.arrow(dir?, cls?)`
`<span class="arrow [arrow-l|arrow-d|arrow-u|arrow-ne]" aria-hidden="true">→</span>`
- base.css masks the arrow-right geometry over the glyph, which stays for no-CSS.
- `--arrow-s` sets the size: 20 in md buttons and rows, 24 in `btn-lg`, 16 in section actions and `btn-sm`.
- It nudges 3px toward where it goes on hover, and 4px on press (`:active` or ENGINE's `.m-pressed`), on the snappy spring.
- Views that hand-write arrows add the modifier: `<span class="arrow arrow-d">↓</span>`.

### Button: `SM.ui.button(label, {act, href, variant, size, block, icon, iconEnd, arrow, sub, disabled, attrs, cls, external})`
- **Variants:**
  - `primary`: solid green, one per viewport
  - `ink`: solid 墨
  - `secondary`: 1.5px ink outline
  - `soft`: paper-2
  - **`text`**: a text link with no box, aligned to the column edge, 1.5px underline; with an arrow, the underline shows only on hover. `ghost` is the v3 name for it.
  - `danger`: red outline
  - `sos`: red, emergency only
- **Sizes:** `lg` 56px/18, md 48/15, `sm` 44/14. All labels are Plex 700.
- **`block`:** full width; the label sits left and the arrow right.
- **`sub`:** a two-line CTA: "質問に答えてさがす / 6問・約3分 →".
- **Arrows:**
  - `arrow: true | 'down' | 'left' | 'up' | 'ne' | false`. Primary, ink and text buttons that link inside the app (`#/…`) get → automatically.
  - A label ending in → ↓ ← ↑ (or starting with ←) is drawn with the matching arrow instead of the typed glyph.
  - External links get the external icon.
- **The partner of a primary CTA is a `text` link with an arrow**, not a second outlined block.
- **Press:** ENGINE scales `.btn` to .97 on pointerdown and releases on the snappy spring. Nothing to add.

### Toggles
- **Chip:** `SM.ui.chip(label, {act, pressed, cat, icon, count, href})`.
  - 36px tall (44 hit), 1px rule-2, 14px Plex 500. Pressed is an ink fill with paper text at 700.
  - **The fill is the state:** no check glyph.
  - The label is `.chip-l[data-t]`, which reserves the bold width so pressing never moves the row. Hand-written chips should copy this markup.
  - `cat` chips carry a 24px mark.
  - `.chips` wraps; `.chips-scroll` is a single-line scroller on phones with an edge fade, and wraps on desktop.
- **Segmented:** `SM.ui.seg(items, {act, label, style})`.
  - `box` (default): a 1px ink frame. The ink fill is ONE element (`.seg::before`) that **slides** to the pressed segment on the snappy spring. The index comes from `:has()` (up to 6 equal segments), so toggling `aria-pressed` in place animates it.
  - `style:'tabs'`: underline tabs (2px ink). They scroll sideways when they do not fit. For a sliding underline, add a `.m-indicator` child and call `SM.motion.indicator(bar, target)`.
- **Switch:** `SM.ui.switchRow(label, {sub, checked, act, id})`.
  - The track is 48×28 with a square 22px knob.
  - Off: paper-3 track with an ink-3 knob.
  - On: green track with a white knob, which slides 20px on the snappy spring and squashes to .92 while pressed.

### Tags: `SM.ui.tag(label, tone, icon?)` and `SM.ui.programTags(p, {skipRepay, skipDeadline, showCareOnly})`
- 22px tall, 12px Plex 500, flat.
- Tones:
  - `free` (green)
  - `loan` and `deadline` (amber)
  - `gov`, `npo` and `neutral` (paper-2, ink-2)
  - `local` (1px rule-2 outline)
  - `right` (1px ink outline)
  - `ink`, `action` and `sos`
- Tags never wrap internally. Use at most two in a row.

### Fact tags (v5): `SM.ui.factTag(kind, value?)`, `SM.ui.factTags(p | [{kind, value}], {max:3, skip})`, `SM.ui.programFacts(p, {max, skip})`
- The short, scannable facts that replace sentences in rows: `grant` 返さなくていい · `loan` あとで返す · `cond` 返済なしの場合も ·
  `deadline` 締切 {v} (or `deadlineAny` 締切あり) · `free` 無料 · `h24` 24時間 · `always` いつでも · `right` 申請は権利.
- Flat, square (0 radius), 12px Plex 500, one tone per kind (green for money you keep / free, amber for loans and deadlines,
  ink outline for 申請は権利). `factTags` returns `<span class="tags tags-fact">` so it can sit inside a link or button.
- `programFacts(p)` derives the list from a program (repayment, deadline, cost, hours) in priority order; max 3 per row.

### Key facts (v5): `SM.ui.keyFacts([{label, value | html, unit, tone}], {cls})`
- `dl.keyfacts` of 2–4 short label/value pairs (`.kf > .kf-k + .kf-v`) for the top of a detail page: いくら · 返済 · 締切 · どこで.
  Values are Plex 700 (numbers inside get `amt-n`); tone `free` (green) · `loan` / `deadline` (amber) · `muted`. Use it instead of a paragraph that says the same.

### 「くわしく」 disclosure (v5): `SM.ui.more(label?, contentHtml, {open, id, closeLabel, cls, inline})`
- Hides secondary text (conditions, background, long how-to) behind ONE ruled row: `button.more-btn` (label + drawn +/−,
  44px) with `aria-expanded` / `aria-controls`, and `div.more-body[role=region][hidden]`. Default label くわしく.
- `inline:true` renders a text trigger (`.more-inline`) for use inside a paragraph; `closeLabel` swaps the label when open.
- `SM.ui.moreToggle(btn)` toggles it (wired via `data-act="more"`). With JS, ENGINE opens it in place (`SM.motion.expand`:
  the block unclips, everything below slides down on one curve, the text fades and drops 12px). Without JS the body is
  `hidden`; never put safety text (phone numbers, crisis lines, deadlines that cost money) behind it.

### Kanji marks: `SM.ui.catIcon(cat, size?, {reading, label, vt, hero})` (alias `catMark`)
- **Sizes:** `xs` 24 (chips, legends, inline) · **`sm` 32 = default** (every list row) · `lg` 56 (program and category headers) · `xl` 80 (desktop category hero). The glyph is Plex 700 at .58 of the size.
- **Reading:** the ふりがな reading shows under the mark with ふりがな on (or with `reading:true`). With ふりがな on, row mark columns widen to fit it, so titles stay aligned.
- **`label:true`** adds the category name to the right, like a sign.
- **Shared morph (MOTION-SPEC §3.4):**
  - `vt:true` puts `data-vt="cat"` on the square. That makes it a source: list rows, `programCard` and `listItem` with an href set it automatically.
  - `hero:true` puts `data-vt-hero="cat"` on it. Destinations (program, category and lesson headers) set it.
  - The tapped row needs `data-id` (`programCard` sets it; `listItem({id})`).

### Program row: `SM.ui.programCard(p, {why, compact, showSave, href, headingLevel, vt, full, hook, whyInline, facts, tags})`
- **v5 default (lean):** `[32 mark]  title (h3, data-vt="title")  /  ONE key fact (the amount's headline clause)  /  fact tags (max 3)  [☆ 44]`.
  No eyebrow, no hook, no labelled facts, no visible 理由 line (the reason is read to screen readers only).
  - `hook:true` adds the one-line hook back; `whyInline:true` shows the 理由 line; `tags:false` drops the tags;
    `facts:[{kind, value}]` overrides them.
  - `full:true` renders the v4 row below (for places that really need it).
- **v4 full layout (`full:true`):** a ruled row:
  - `[32 mark]`, then eyebrow (`basis ／ category ／ 申請は権利`, label Plex 500, ink-3: basis is no longer blue)
  - title (h3, balance)
  - hook (meta 15, 2 lines)
  - amount (numbers in num-inline)
  - facts as labelled text: `返済 ｜ 返さなくていい  申込 ｜ いつでも`, with values in Plex 700 green or amber
  - `理由` line
- **Save star:** 44×44, aligned to the eyebrow line, 22px. Filled is ink, and ENGINE stamps it on save.
- **Hover and press:** a paper-2 band bleeds 12px past the column; press is an instant 6% ink wash.
- **Compact:** 16px padding, hook on one line, no amount.
- **Wrapping:** wrap rows in `.pcards`. Lists start with a hairline; directly under a section head they start at its rule.

### Section head: `SM.ui.sectionHeader(title, {num, sub, action, level, id, plain, reveal, cls})`
```
01  困りごとから見る                         すべて見る →
    いちばん近いものをえらんでね
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  2px ink, draws in from the left
```
- `num` is small (`--t-chrome`, ink-3) and baseline-aligned with the title. `num: 1` prints `01`. Number a page's sections only when it has 3 or more.
- `sub` is meta ink-3, set in the title's column.
- `action: {label, href, act, arrow}` renders 14px Plex 500 with a 16px arrow, bottom-aligned.
- The rule is its own element, `<span class="section-rule" data-reveal="rule">`, so ENGINE draws it (`scaleX`, 440ms `--ease-draw`).
  - `reveal:false` keeps it static (in-place re-renders).
  - `plain:true` drops it.
- Hand-built `.section-head` markup without a `.section-rule` child still gets the static rule from `::after`. Switch to `SM.ui.sectionHeader` when you restyle.
- This replaces `h-sec`, `pg-sec-head`, `tl-sec-head`, `pp-sec`, `ab-sec` and `f-cat-sec`. Keep those classes only as spacing hooks via `cls`.

### Lists: `SM.ui.listItem({title, sub, subSr, href, act, icon, cat, meta, unit, count, amount, tags, chevron, id, vt, attrs})`
- Ruled rows, at least 56px tall.
- Title is Plex 700 16. The count sits at the right in Plex 700 18 with a small unit (`meta: 24, unit: '件'`); `count:true` rolls it.
- v5: prefer NO grey sub-line. Put the one fact that matters in `amount` (`.list-amount`, Plex 700) or `tags` (fact tags),
  and pass explanatory text as `subSr` (screen readers only). `sub` still works for the rare row that needs it.
- With an `href` the title carries `data-vt="title"` (shared title morph; `vt:false` turns it off).
- Rows have a trailing drawn arrow, with the same hover and press band as program rows.

### Questions: `SM.ui.opt(label, {hint, selected, multi, quiet, catIcon, icon, end, act, href})` and `SM.ui.progress(step, total, {style, prefix, label})`
- **Option:**
  - At least 60px tall, 1px rule-2, with a 22px indicator (circle, or a square when `multi`). Title is 18 Plex 700.
  - Selected is a 2px ink frame on paper-2 with an ink indicator; ENGINE draws the check.
  - After an answer the others step back to .5: ENGINE adds `.is-dimmed`, or the view puts `.has-choice` on `.opts`.
  - `quiet` (わからない・スキップ) has no frame, a hairline on top and a trailing arrow.
- **Progress `{style:'bar', prefix:'質問'}`:**
  - The label reads "質問 **2** / 6" (num-l), over one 2px paper-3 track.
  - The green fill (`--p` = step/total, `scaleX`) is grown by ENGINE. Hairline ticks mark the steps.
- **Progress default:** 2px segments (done ink, current green) and "2 / 6".

### Contact: `SM.ui.contactRow(c, {web:false})`
- The number is the biggest thing (`--t-num-l`, Plex 700), and it is itself the `tel:` link, underlined on hover.
- `電話する` is a **sm ink-outline** button (`.contact-cta` / `.call-go`). Below 360px it collapses to the phone icon.
- LINE, chat and the web link are text rows with the external icon. Hours show as `受付時間 ｜ …`.

### Callout: `SM.ui.callout(html, tone, {title})`
- A flat tint with a **2px top rule** in the tone color, 16px padding, body text at meta size, no icons.
- Tones: `info` (blue), `warn` (amber), `safe` (green), `danger` (red).

### Empty state: `SM.ui.empty(title, body, action, {illus, level})`
- A spot illustration (`SM.illus(name, {size:'spot'})`: 200px on phones, 240 on desktop, left-aligned), then the title (h3 style), one kind line, and one action.
- No heavy rule above.
- `illus` names: `results-empty`, `saved-empty`, `plan-empty`, `map-empty`, `not-found`.
- With no `SM.illus`, or an unknown name, the picture is simply left out.

### Others
- `SM.ui.num(value, unit, {style:'hero'|'xl'|'l'|'inline', count, countSeen})`: a number with its small unit. `count:true` adds `data-count`, so ENGINE rolls it like a station board.
- `SM.ui.amount(s, {size:'lg'})`: numbers inside an amount string at 1.4em (2em for lg). Compound numbers never break.
- `SM.ui.kv(rows)`: label and value rows with hairlines. They stack below 420px.
- `SM.ui.searchField({id, placeholder, value, act, label})`: 52px with a 22px glass. Values are Plex 500; the placeholder is BIZ in ink-3.
- `SM.ui.marker(text)`: the 蛍光ペン. **One per screen.**
- `SM.ui.sheetFrame(body, {title, foot})`: header markup for `SM.sheet`.
- Also: `SM.ui.deadlineShort`, `repayLabel`, `basisLabel`, `catLabel` and `listedCount`.
- Inputs (`.input .select .textarea .field .label .help .check`): 48px, 1px rule-2, and 2px ink on focus (an inset 1px plus the border).
- `details.disclose`: a ruled row with a drawn + / −. ENGINE opens and closes it in place (`SM.motion.expand`); add
  `data-native` to keep the browser's instant toggle.

### Sheets and toast (CORE markup, ENGINE motion, styled here)
- **Phone sheet:**
  - Radius 0, `--shadow-overlay`, behind a `--scrim`.
  - A 36×4 handle with a full-width grab area.
  - A 56px head: `.sheet-title` (22 Plex 700), すぐ閉じる and close (44).
- **≥640px:** a 560px dialog with a 2px ink top edge.
- **Motion:** `SM.motion.sheet` drives open, close and drag through `translate` and opacity. The CSS keyframes are only a fallback (motion.css turns them off with `.m-sheet`).
- **Toast:**
  - Ink, 48px, square, 15px Plex 700, centered with `transform`.
  - ENGINE animates `translate` and opacity.
  - The action (`.toast-act`) is in **marker yellow**.
  - An undo toast has a `.toast-life` hairline that shrinks.

---------------------------------------------------------------------------------------------------
## 7. Motion hooks that the system provides (the engine is `SM.motion`, MOTION-SPEC.md)

**v5 scale (SPEC-v5 Part A).** Durations 280–520ms (`--dur-base` 320, `--dur-page` 440, `--dur-morph` 480, `--dur-hero` 560);
travel 24–48px (`--m-rise` 28px, `--m-slide` 32px, page entrance 48px); `--ease-spring` / `--spring-rise` (≈3% overshoot,
~520ms) for things that arrive, `--ease-push` for pages; stagger 50ms, cap 8. Reduced: `--dur-reduce` 180ms, opacity and
colour only.

- **Pages.** forward = the new page pushes in from the right over the old one, which shifts 30% left and dims; back = the
  reverse. Tabs = cross-fade with a 16px rise while the indicator slides. The tapped row's `data-vt="cat"` mark and
  `data-vt="title"` title morph into the destination's `data-vt-hero="cat"` / `data-vt-hero="title"` (or the view's `h1`).
- **Press.** `.btn .chip .pill .icon-btn .pcard-save .seg>* .section-action .opt .contact-cta .sos-copy .back .more-btn
  .toast-act [data-press]` sink 2px and darken on pointer-down (≤50ms), spring back on release. Rows get the ink wash;
  tab icons squeeze and pop.
- **Save.** `SM.motion.flyTo(fromEl, 'plan')`: a green dot arcs to the やること tab, the icon pops, a ring lands, and
  `SM.motion.badge('plan', n)` pops / rolls the count.
- **Scroll.** Section rules draw as they enter; heads rise 28px; lists stagger.

| Hook | Where | What happens |
|---|---|---|
| `data-reveal="rule"` on `.section-rule` | every `SM.ui.sectionHeader` | the 2px rule draws from the left |
| `data-vt="cat"` / `data-vt-hero="cat"` on `.cat-mark` | rows / headers (`catIcon {vt, hero}`) | the kanji tile morphs between screens |
| `.btn`, `.chip`, `.pill`, `[data-press]` … | buttons, any pressable | ENGINE press: sink 2px + darken, spring back; the arrow nudges (base.css) |
| `data-vt="title"` / `data-vt-hero="title"` | row titles (`programCard`, `listItem` with href) / page H1 | the title morphs between screens |
| `.more-btn`, `details.disclose` | `SM.ui.more`, disclosures | open/close in place (`SM.motion.expand`) |
| `.tab-badge` | tab bar | `SM.motion.badge(tab, n)`: pops in, rolls, bumps |
| row press | `.pcard` `.list-item` `.contact-item` `details > summary` | instant 6% ink wash, fades 160ms after release (CSS only) |
| `.seg::before` | segmented | the ink fill slides on `--spring-snappy` (CSS only) |
| `.switch::before` | switch | the knob slides and squashes on the snappy spring (CSS only) |
| `.chip-l[data-t]` | chips | no layout shift when pressed |
| `.tabbar::before` + `--tab-index` | tab bar / rail | the indicator slides (core and motion.css) |
| `.m-indicator` | underline tabs | `SM.motion.indicator(bar, target)` |
| `.progress-fill` `--p` | question progress | the fill grows (ENGINE) |
| `data-count` | `SM.ui.num({count})` | odometer roll |

- **Easing and duration tokens** (`--ease-standard/enter/exit/draw/rise/expo`, `--dur-instant…hero`, `--spring-*`) are canonical in motion.css and mirrored in base.css. The v3 names `--ease`, `--ease-out` and `--dur-1..3` are aliased.
- **Reduced motion** is `html.m-reduce` (set from the OS preference or 設定 › 動きを少なく), and motion.css handles it. Do not add your own `prefers-reduced-motion` kills.
- **Focus rings** appear instantly: 2px `--focus`, 2px offset, square. Over ink fills and the map, use the paper inner ring.

---------------------------------------------------------------------------------------------------
## 8. Rules for view CSS
- Scope everything under your view root (`.v-find …`). Use tokens only, never hex. No `font-size` in px or em, and no `letter-spacing` outside the four tokens. Reviewers grep for both:
  - `grep -nP "font-size:\s*[0-9.]+(px|em)" css/*.css`
  - `grep -nP "letter-spacing:\s*(?!var\(|0;|normal)" css/*.css`
- Never `font-weight: 900`, and never Zen Kaku.
- Section heads come from `SM.ui.sectionHeader`. Arrows come from `SM.ui.arrow`. Marks come from `SM.ui.catIcon` (default 32: drop your own size overrides).
- Desktop layout comes from `.grid-12` / `.split-*` / `.sticky-col` inside the container. Do not invent max-widths.
- Never put two rules within 8px. A list under a section head starts at the head's rule. A banner under the appbar has no top border (the jr banner's border is gone).
- Hover effects go only under `@media (hover: hover)`. Never put a hover tint on a pressed segment.
- **Delete v3 leftovers when you restyle:**
  - 3px and 4px heavy rules
  - 900-weight titles and tracking
  - blue 国・都 labels
  - solid green call buttons in lists
  - text-glyph arrows (→ ↓ ›)
  - icon tiles
  - checkbox glyphs inside chips

---------------------------------------------------------------------------------------------------
## 9. Do / Don't

| Do | Don't |
|---|---|
| Separate items with hairlines and whitespace | Put each item in a rounded box with a shadow |
| One 2px ink rule per section start, drawn in | Stack a heavy rule on a hairline, or 3px/4px rules |
| Make the number the biggest thing (num-hero, num-l, amt-n) | Hide amounts in small grey text |
| One key fact + at most 3 flat fact tags per row (`返さなくていい` `締切 3/31`) | A grey sentence under every title, or rounded colored pills for every fact |
| Put secondary text behind 「くわしく」 (`SM.ui.more`) | Explain every button in a paragraph above it |
| One green action per screen; partner it with a text link → | Two outlined blocks of equal weight, green call buttons in every row |
| The kanji mark for category, travelling between screens | A house or heart icon in a pastel tile |
| One 蛍光ペン phrase | Gradient text, glow, highlight everything |
| Motion that answers the finger (press, push, slide, draw, a spring ≤4%) | Bounce, shake, confetti, shimmer, loops, parallax |
| Left-align to the shared container edge | Center everything, or give each view its own max-width |

## 10. Voice
Short, kind, plain (中学生でも読める). Never use deficit language. 申請は権利.

## Theme (2026-10-17, Ryu)
The app is always light (white paper) by default, even when the phone is in dark mode, because Ryu found the dark background
hard to read. Dark is opt-in only: 設定 › 暗い画面 sets `settings.dark`, which core maps to `<html data-theme="dark">`. Do not add
`prefers-color-scheme` rules.

## v6 additions (FIX-A, 2026-10-21)
- **Tabs**: one list, `SM.tabs` (core.js) — key, href, icon. The tab bar, the desktop rail, TAB_ROOTS and the
  lazy-view preload all read it. A new tab = one entry there + its files in index.html `__smLazy`. Re-tapping the
  current tab scrolls to the top and focuses the h1 (never a re-render). While a tab's view file loads, the tab shows
  `.is-boarding` (a fill bar) and the indicator has already moved.
- **Switches** say their state in words: `.switch-state` (オン / オフ) sits after the input; the off knob is a
  paper outline, the on knob solid. `SM.ui.switchRow` adds it; hand-written switches must too.
- **Sheet header**: under 640px and under 文字を大きく the title takes its own row under すぐ閉じる / 緊急 / ×
  (緊急 stays in every sheet). Pills are 44px.
- **Toasts**: a toast never covers a sheet's actions (inside a sheet it sits low and lets taps through unless it
  has an action); opening a sheet or navigating hides a toast older than 250 / 700 ms. `SM.hideToast({ifOlder})`.
- **Saves**: `SM.save()` returns ok. When storage is not available, the save flight lands amber
  (`SM.motion.flyTo(..., {tone:'warn'})`) and the toast says it will be lost on close (once, with a 設定 link).
- **IME**: `SM.composing(ev)` — every Enter / Esc handler ignores keys sent while a kana→kanji conversion is
  open (the quick exit too). Search boxes redraw on `compositionend`.
- **Lazy files** carry the build id: `SM._vsrc(src)` → `src?v=<__smV>`. Use it for any script a view adds itself.
- **Search rows**: the さがす box and きく share SM.search. Matched words are `<mark class="f-hl">` / `ask-hl`, a
  marker band behind the letters that sweeps in only on rows new on screen. Never a 「合いそうな理由」 line in a search.
- **Crisis first, never on a typo**: a crisis word puts the right numbers first (the housing card for nowhere to
  stay, the talk lines + 緊急 for the rest); an unknown word gets もしかして, popular words, きく and one quiet line.
- **Inline urgent numbers**: an option that means "now" (今、いる場所がない) opens its numbers right under itself
  (SM.motion.expand, a red rule drawing down); its button names the action (今すぐ相談先を見る), never a count.
- **Facts rows** draw dividers on the left of each item and clip the row on x, so no line starts with a divider.
- **Answers shown back** (home, results) are plain text separated by ／ (EN ·), never tag-shaped: only 変える is
  a control.
