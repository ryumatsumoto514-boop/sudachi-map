# 巣立ちマップ (Sudachi Map) — Build Spec

## What this is
A production web platform by **Economix JP** (a Tokyo high-school student
economics-education organization) for young people leaving Japan's child
welfare system (児童養護施設・里親家庭・自立援助ホーム etc.) around age 18,
and anyone else facing the same "nobody taught me this" gap: housing,
money, work, further education, procedures, and where to get help.

This is NOT a marketing landing page. It is a **functional support-matching
tool**. The core feature is a short questionnaire that takes a user's
situation (grade/age, desired path, region, current concern) and returns a
**ranked, personalized list of real programs/contacts** they can act on
today, each with what it is, who qualifies, the deadline, and exactly who
to contact (name of the actual desk/organization, not "consult a
specialist"). A full searchable/filterable database backs it too.

## Hard constraints
1. **Do not fabricate institutions, phone numbers, amounts, or deadlines.**
   Every resource record must come from `data/resources.json`, which is
   pre-populated with real, sourced entries. If you need more entries,
   flag them in `data/TODO-more-entries.md` for human review instead of
   inventing plausible-sounding ones. Fabricating a wrong phone number for
   a vulnerable teenager is the single worst failure mode for this project.
2. **Japanese-first.** All UI copy, the wizard, and content are in
   Japanese, written at a plain, warm, non-bureaucratic reading level (the
   audience is a stressed 17-19 year old, often reading on a phone, often
   without an adult to ask "what does this mean"). Add an English toggle
   as a stretch goal only if time remains — do not let it block ship.
3. **Must not look "vibecoded."** No generic centered-hero SaaS template,
   no purple-gradient-blob AI look, no lorem-ipsum-density text walls, no
   emoji-as-icons. Reference-quality bars: findhelp.org (US benefits
   navigator), Japan's デジタル庁 Design System (accessibility, plain
   language, calm civic trust), and Headspace-level warmth in illustration
   /spacing — but the brand identity is Economix's own, not copied from
   any of these.
4. **Brand system — derive from `assets/economix-logo.png`:**
   - Logo mark: bold geometric "X", one solid diagonal stroke with a
     gradient from dusty rose `#E8A7A0`-ish to deep crimson `#C6303E`/
     `#B12A3A`, crossed with a second stroke built from vertical bars that
     fade from solid red to transparent — a "data / motion" motif. Reuse
     this **vertical-fading-bars motif** as a recurring UI element (e.g.
     progress indicators, section dividers, chart/timeline bars) rather
     than using it only as a static logo.
   - Primary color: a refined crimson/red (~`#C6303E` to `#A82438` for
     text/buttons on light backgrounds — check contrast ≥ 4.5:1).
   - Neutral base: warm off-white (`#FAF7F5` / `#FDFBFA`), near-black
     ink (`#1C1A19`) for text — avoid pure white/pure black, it reads cold
     and clinical for this audience.
   - Typography: clean humanist sans for Latin (Inter or similar) paired
     with a rounded/humanist Japanese web font (Noto Sans JP or similar);
     generous line-height for Japanese body text (1.8+).
   - Product name: **巣立ちマップ** (Sudachi Map — "fledging/leaving-the-
     nest map"), presented as an Economix JP project ("Economix JP が運営").
     Place the Economix logo (small, top-left header + footer) — this is
     an Economix product, not a rebrand away from it.
   - This must NOT resemble the pasted Claude prototype's look (plain
     list-of-links, no visual hierarchy, no color system, cramped). Take
     its **information architecture** (situation-first entry points,
     phase timeline, emergency numbers always reachable) as a reference
     for structure only — rebuild the visual layer from scratch, properly
     designed: real spacing scale, card system, iconography (use lucide-
     react or heroicons, not emoji), motion/microinteractions on
     hover/focus, clear visual hierarchy.

## Core features (in priority order)

### 1. マッチング診断 (Matching Wizard) — THE main feature
Multi-step form, one question per screen, big tap targets, progress bar
using the fading-bars motif, back button always available, ~5 steps max:
1. 今の状況 (current situation): 在学中の高校生 / 施設を出る準備中 / すでに
   自立して生活中 / 支援者・職員として見ている, etc.
2. 学年・年齢 (rough stage, not exact birthdate — privacy-conscious)
3. 希望する進路 (大学・短大 / 専門学校 / 就職 / まだ決めていない)
4. 地域 (都道府県 — for region-scoped programs like JASSO regional funds,
   prefectural rent-assistance loans)
5. 今いちばん困っていること / 知りたいこと (multi-select: 住まい, お金/
   奨学金, 仕事, 手続き・書類, 相談したい, 今すぐ助けが要る)

Output: a ranked results page — top matches first, each as a card with:
name, one-line plain-language description, who qualifies (bullet, not
paragraph), amount/benefit if applicable, deadline or "通年", the exact
contact (org name + phone/URL), and a "詳しく見る" expand. Include a
"この結果を保存/共有" (generates a shareable URL encoding their answers
in query params — no login, no server-side account needed for MVP) and a
"印刷用に表示" (print-friendly view they can bring to a caseworker).
No login required. No PII stored server-side for MVP — all answers stay
client-side/in the URL.

### 2. 何に困ってる？ (Browse by situation) — zero-friction entry
Homepage also offers direct situation buttons (住む場所がない, お金が
足りない, 仕事を探したい, 進学したい, 手続き・契約, 相談したい, 今すぐ
危ない) that jump straight to filtered results — for users who don't want
to do the full wizard. Also a **今すぐ助けが必要** always-visible sticky
element (footer bar or corner button) with the top 4-6 emergency numbers,
one tap to call on mobile (`tel:` links), reachable from every single page.

### 3. 検索データベース (Full searchable database)
All resources browsable/filterable by category, region, and
対象者(who's eligible), with real-time text search (fuzzy match on name/
description — use a small client-side search like Fuse.js, no backend
needed since dataset is modest). Show total count. Sort by deadline /
新着 / 支給額.

### 4. 巣立ちタイムライン (Phase timeline)
Reuse the prototype's good idea: 6か月前 → 3か月前 → 1か月前 → 巣立ちの日 →
1か月後 → 3か月後, each phase showing a concrete checklist tied back to
relevant resources/links. Visualize as an actual horizontal/vertical
timeline component (not a plain list) using the brand's bar motif.

### 5. 生活費シミュレーター (Cost simulator) — value-add feature not in
the Claude draft. Simple calculator: user picks a rough region (東京23区 /
政令指定都市 / その他) and living situation (一人暮らし / シェアハウス /
社員寮), shows a realistic monthly budget breakdown (家賃目安, 光熱費,
食費, 通信費, 保険・税, 貯金目安) using clearly-labeled *reference estimates*
with a disclaimer that they're estimates, not guarantees, plus a link to
resources that can help cover a shortfall — directly connects a generic
tool back into the matching database.

### 6. 電話が苦手な人のための「言うことスクリプト」
For each contact-heavy resource category, a short copyable script the
user can literally read aloud or paste into a chat/LINE to that
institution ("〇〇について相談したいのですが、児童養護施設を出た者です。
名前は◯◯です。" style templates). Low-effort, high-impact, keep from the
prototype's spirit but written properly.

### 7. 自分だけの巣立ちカード
A generated one-page summary (from wizard answers) — key contacts,
deadlines, and a checklist — downloadable/printable as PDF (client-side
generation, e.g. via `@react-pdf/renderer` or html-to-canvas+jsPDF; if
time-constrained, ship as a clean print CSS view first and PDF export as
a fast-follow).

### 8. About / Economix JP について
Short section (not the main focus) explaining who built this and why —
use the real background text about Economix JP's mission shift toward
underserved youth (draft copy will be supplied separately in
`content/about.md`; if not yet present when you reach this step, write a
faithful placeholder from this spec's intro paragraph and flag it for
review).

## Tech stack
- **Next.js 14+ (App Router), TypeScript, Tailwind CSS.**
- Static-friendly / server components where possible; this must deploy
  cleanly to **Vercel** with zero extra config (no custom server).
- `Fuse.js` for client search, `lucide-react` for icons, `framer-motion`
  used sparingly for tasteful microinteractions (page/step transitions,
  card hover) — not gratuitous.
- Data lives in `data/resources.json` (schema below) and
  `data/timeline.json` — treat these as the single source of truth; the
  matching logic is pure client-side filtering/scoring over this data, no
  backend/database needed for MVP.
- Fully responsive, mobile-first (assume most users are on a phone).
  Meet basic a11y: semantic HTML, visible focus states, sufficient
  contrast, `tel:`/`mailto:` links properly marked up.

## Data schema (`data/resources.json`)
```json
{
  "id": "string-slug",
  "name": "正式名称",
  "operator": "実施団体名",
  "category": "housing | money | work | education | procedures | consultation | emergency",
  "region": "全国 | 東京都 | ... (prefecture or 全国)",
  "summary": "一文の平易な説明",
  "eligibility": ["箇条書きの対象者条件"],
  "benefit": "支給額・内容（該当する場合）",
  "deadline": "締切日 or 通年 or 施設退所後5年以内 etc.",
  "contact": {"org": "窓口名", "phone": "電話番号 or null", "url": "URL or null"},
  "tags": ["施設出身", "奨学金", "緊急", ...],
  "source_url": "この情報の出典URL（検証用、UIに小さく表示可）"
}
```
I will populate this file with real, sourced entries myself and hand it
to you (or it will already be present in `data/resources.json` when you
start) — build the matching/search/UI logic to consume this schema
exactly. If the file has fewer entries than expected, do not pad it with
invented ones; leave a note instead.

## Deploy
Repo is already initialized at this path and pushed to
`https://github.com/ryumatsumoto514-boop/sudachi-map`. Commit as you go.
Do not run `vercel` deploy yourself — that will be handled separately
with an access token. Just make sure `npm run build` succeeds cleanly.

## Definition of done for this pass
- `npm run build` succeeds with no errors.
- Homepage, wizard (all steps + results), full database/search page,
  timeline page, cost simulator, and about section all exist and are
  navigable.
- Uses `data/resources.json` as-is, no invented resource data.
- Looks deliberately designed (spacing, color, type scale all consistent
  and intentional) — not a default template.
- Mobile viewport (375px) works without horizontal scroll or overlap.
