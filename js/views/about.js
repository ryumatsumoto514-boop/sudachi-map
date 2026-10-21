/* 巣立ちマップ v4 — js/views/about.js (HOME)
   About (#/about): who makes this, 中学生のみなさんへ, まなぶ, listing standards, how info is checked,
   privacy, disclaimer, contact, map data and credits. VISUAL-SPEC §7.11.
   v5 (SPEC-v5 Part B: fewer words on screen, full detail kept): h1 (rises) + a one-line lead, the `about-team`
   illustration, a 2×2 numbers grid (num-xl, rolling like a station board), the 最終確認 date, then the contents
   as numbered ruled rows. Every section = its head + ONE short lead line + the structured part (lists, steps,
   facts as tags) + the long explanation folded behind 「くわしく」 (<details>, so it opens with no JS and is found
   by in-page search). Safety lines (erase, shared device, すぐ閉じる, 110/119) are never folded.
   The page ends with the full lockup, whose green line draws once — the same signature as home's colophon.
   First screen first (MOTION-SPEC §6 rule 4): the sections render after the transition, into the same place.
   Fully bilingual. */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.views = SM.views || {};

  function t(k, v) { return SM.t ? SM.t(k, v) : k; }
  function esc(s) { return SM.esc ? SM.esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function L(o) { return SM.L ? SM.L(o) : (o && o.ja) || o || ''; }
  function ic(n, c) { return SM.icon ? SM.icon(n, c) : ''; }
  function en() { try { return SM.lang() === 'en'; } catch (e) { return false; } }
  function arrow(dir) {
    if (SM.ui && SM.ui.arrow) return SM.ui.arrow(dir);
    return '<span class="arrow" aria-hidden="true">' + ({ d: '↓', l: '←' }[dir] || '→') + '</span>';
  }
  function reduced() { try { return !!(SM.motion && SM.motion.reduced && SM.motion.reduced()); } catch (e) { return false; } }
  function illus(name, o) {
    try { return SM.illus && SM.illus.has && SM.illus.has(name) ? SM.illus(name, o) : ''; } catch (e) { return ''; }
  }

  var SITE = 'https://www.economixjp.org/';
  var GSI_URL = 'https://maps.gsi.go.jp/development/vt.html';
  var KSJ_URL = 'https://nlftp.mlit.go.jp/ksj/';
  var MAPLIBRE_URL = 'https://github.com/maplibre/maplibre-gl-js';

  SM.strings && SM.strings({
    'about.title': { ja: 'このサイトについて', en: 'About' },
    'about.eyebrow': { ja: 'Economix JP がつくっています', en: 'Made by Economix JP' },
    'about.h1': { ja: '巣立ちマップについて', en: 'About Sudachi Map' },
    'about.lead': { ja: 'だれが、どんな基準で作っているか。', jr: 'だれが、どうやって作っているか。', en: 'Who makes this site, and how.' },
    'about.toc': { ja: '目次', en: 'On this page' },
    'about.more': { ja: 'くわしく', en: 'More' },
    'about.moreSrc': { ja: '出典の一覧', en: 'List of sources' },
    'about.nav.who': { ja: '作っている人', en: 'Who we are' },
    'about.nav.junior': { ja: '中学生のみなさんへ', en: 'For junior high students' },
    'about.nav.learn': { ja: 'まなぶ — お金のきほん', en: 'Learn — money basics' },
    'about.nav.rules': { ja: '掲載基準', en: 'What we list' },
    'about.nav.check': { ja: '情報の確認方法', en: 'How we check' },
    'about.nav.privacy': { ja: 'プライバシー', en: 'Privacy' },
    'about.nav.disclaimer': { ja: '免責', en: 'Disclaimer' },
    'about.nav.contact': { ja: 'お問い合わせ', en: 'Contact' },
    'about.nav.credits': { ja: '地図データ・出典', en: 'Map data & credits' },

    'about.statsLabel': { ja: 'このサイトの数字', en: 'This site in numbers' },
    'about.stat.total': { ja: 'のせている支援', en: 'Programs listed' },
    'about.stat.free': { ja: '返さなくていい支援', en: 'Never paid back' },
    'about.stat.local': { ja: '区市町村の制度・窓口', en: 'Local programs' },
    'about.stat.lessons': { ja: 'お金のレッスン', en: 'Money lessons' },
    'about.stat.date': { ja: '最終確認', en: 'Last checked' },
    'about.unit': { ja: '件', en: '' },
    'about.unitLesson': { ja: '本', en: '' },

    'about.who.h': { ja: '誰が作っているか', en: 'Who makes this' },
    'about.who.lead': { ja: '東京の高校生の団体「Economix JP」が作っています。', en: 'Made by Economix JP, a group run by high-school students in Tokyo.' },
    'about.who.tags': { ja: '高校生が運営・NPOと作ったガイドがもと・まちがいはすぐ直す', en: 'Run by students・Built on a guide made with nonprofits・Mistakes fixed fast' },
    'about.who.p1': { ja: '巣立ちマップは、東京の高校生が運営する団体「Economix JP」が作っています。Economix JP は、日本の若い人にお金の知識（金融リテラシー）を届ける活動をしています。', en: 'Sudachi Map is made by Economix JP, a group run by high-school students in Tokyo. Economix JP works to bring financial literacy to young people in Japan.' },
    'about.who.p2': { ja: 'もとになっているのは、NPOのみなさんと一緒に作った自立支援ガイドです。支援の現場で働く人の知恵を、同じ世代の目線で、わかりやすく届けることが私たちの役割です。', en: 'It is based on an independence-support guide we made together with nonprofit partners. Our job is to take what people on the front line know, and make it easy to understand from the eyes of the same generation.' },
    'about.who.p3': { ja: 'まちがいを見つけたら、すぐ直します。出典と確認日は、それぞれの支援のページの下にあります。', en: 'If we find a mistake, we fix it right away. The source and the date we checked are at the bottom of every program page.' },
    'about.who.link': { ja: 'Economix JP の公式サイト', en: 'Economix JP website' },

    'about.junior.h': { ja: '中学生のみなさんへ', en: 'For junior high students' },
    'about.junior.lead': { ja: '中学生から使えます。こんなことがわかります。', en: 'Works from junior high. You will find:' },
    'about.junior.note': { ja: '1問目で「中1・中2」か「中3」をえらぶと、やさしいことばになります。', en: 'Pick your junior-high year in question 1 for simpler wording.' },
    'about.junior.p1': { ja: '巣立ちマップは、中学生から使えます。施設や里親家庭でくらす中1〜中3の人も、質問に答えると、いま使える支援と、これから必要になる支援がわかります。', jr: '巣立ちマップは、中学生から使えます。質問に答えると、いま使える支援と、これから使える支援がわかります。', en: 'Sudachi Map works from junior high. If you live in a children\'s home or with a foster family and are in junior high, answer the questions to see support you can use now and later.' },
    'about.junior.l1': { ja: '高校受験や入学にかかるお金の支援', en: 'Help with the costs of high-school entrance exams and starting school' },
    'about.junior.l2': { ja: 'いじめ・学校・家のことを話せる相談先', en: 'Places to talk about bullying, school or home' },
    'about.junior.l3': { ja: '「やること」に、高校受験の年のお金の予定', en: 'A money timeline for your exam year in "My to-do list"' },
    'about.junior.l4': { ja: 'むずかしい漢字の ふりがな（設定でオン・オフ）', en: 'Furigana over hard kanji (on/off in Settings)' },
    'about.junior.p2': { ja: '質問の1問目で「中1・中2」か「中3」をえらぶと、中学生向けの、やさしいことばになります。', en: 'Pick "Junior high yr 1–2" or "yr 3" in the first question for simpler wording made for junior high.' },
    'about.junior.btn': { ja: '質問に答えてさがす', en: 'Answer the questions' },

    'about.learn.h': { ja: 'まなぶ — お金のきほん', en: 'Learn — money basics' },
    'about.learn.lead': { ja: '1つ2〜3分のお金のレッスン。クイズや計算もあります。', jr: '1つ2〜3分で学べるお金のレッスン。クイズもあります。', en: '2–3 minute money lessons, with quizzes and calculators.' },
    'about.learn.tags': { ja: '給付と貸付・利息・手取り・契約・家賃', jr: '返すお金・返さなくていいお金・利息・バイトと税金', en: 'Grants vs loans・Interest・Take-home pay・Contracts・Rent' },
    'about.learn.p1': { ja: 'Economix JP は、若い人にお金の知識を届けるために活動しています。「まなぶ」では、給付と貸付のちがい、利息、手取り、契約、家賃など、巣立つ前に知っておくと安心なことを、1つ2〜3分のレッスンにまとめました。クイズや計算もあります。', jr: '「まなぶ」では、返すお金・返さなくていいお金、利息、バイトと税金など、知っておくと安心なお金のことを、1つ2〜3分で学べます。クイズもあります。', en: 'Economix JP exists to bring money knowledge to young people. "Learn" has 2–3 minute lessons on grants vs. loans, interest, take-home pay, contracts, rent and more — with quizzes and calculators.' },
    'about.learn.p2': { ja: 'レッスンの数字や決まりは、公式のページで確かめ、それぞれのレッスンに出典をのせています。どこまで進んだかは、このスマホの中だけに記録されます。', en: 'Numbers and rules in the lessons are checked against official pages, and each lesson lists its sources. Your progress is saved only on this device.' },
    'about.learn.srcH': { ja: 'レッスンのおもな出典', en: 'Main sources for lessons' },
    'about.learn.btn': { ja: 'まなぶをひらく', en: 'Open Learn' },

    'about.rules.h': { ja: '掲載基準', en: 'What we list' },
    'about.rules.yesH': { ja: 'のせるもの', en: 'We list' },
    'about.rules.y1': { ja: '国・東京都・区市町村などの<b>公的な制度と窓口</b>', en: '<b>Public programs and offices</b> run by the national government, Tokyo, and cities/wards' },
    'about.rules.y2': { ja: '実績のある<b>NPOの無料の支援</b>（相談・居場所・住まいなど）', en: '<b>Free support from established nonprofits</b> (talking, drop-in places, housing)' },
    'about.rules.y3': { ja: '公式のページで、内容をたしかめられたもの', en: 'Things we could confirm on an official page' },
    'about.rules.noH': { ja: 'のせないもの', en: 'We never list' },
    'about.rules.n1': { ja: '有料の相談、会社のローン、保証会社など、<b>お金もうけが目的のサービス</b>', en: '<b>Paid or for-profit services</b> such as paid counseling, company loans or guarantor companies' },
    'about.rules.n2': { ja: '広告。お金をもらって順番を上げることもしません', en: 'Ads. Nobody can pay to be shown higher' },
    'about.rules.n3': { ja: '公式の情報で確認できなかった電話番号・金額・住所（わからない所は空けています）', en: "Phone numbers, amounts or addresses we couldn't confirm (we leave them blank)" },
    'about.rules.rightH': { ja: '「申請は権利」の印', en: 'The "Your right" mark' },
    'about.rules.right': { ja: '法律や制度で決まっていて、条件に合えばだれでも申し込めるものです。', en: 'It is set by law or a public system — if you meet the conditions, you can apply. No need to hold back.' },

    'about.check.h': { ja: '情報の確認方法', en: 'How we check information' },
    'about.check.s1h': { ja: '公式のページを読む', en: 'We read the official page' },
    'about.check.s2h': { ja: '出典と確認日をのせる', en: 'We show the source and the date' },
    'about.check.s3h': { ja: '年に1回以上、見直す', en: 'We review at least once a year' },
    'about.check.s4h': { ja: 'まちがいは直す', en: 'We fix mistakes' },
    'about.check.s1': { ja: '<b>公式のページを読む。</b>国・都・区市町村・運営団体の、その支援のページそのものを読んで書いています。', en: '<b>We read the official page</b> for each program — the exact page, not just a homepage.' },
    'about.check.s2': { ja: '<b>出典と確認日をのせる。</b>どの支援のページにも、読んだページへのリンクと、確認した日があります。', en: '<b>We show the source and the date.</b> Every program page links to its source and shows when we checked it.' },
    'about.check.s3': { ja: '<b>年に1回以上、見直す。</b>金額や条件は4月（新年度）に変わることが多いので、その前後は特にていねいに確認します。', en: '<b>We review at least once a year,</b> with extra care around April, when amounts and rules often change.' },
    'about.check.s4': { ja: '<b>まちがいは直す。</b>それぞれの支援のページにある「まちがいを報告」から教えてください。', en: '<b>We fix mistakes.</b> Use "Report a mistake" on any program page.' },
    'about.check.srcH': { ja: '支援のおもな出典', en: 'Main sources for programs' },
    'about.check.more': { ja: 'ほか {n}', en: '+{n} more' },

    'about.privacy.h': { ja: 'プライバシー', en: 'Privacy' },
    'about.privacy.p1': { ja: '<b>名前・住所・連絡先は聞きません。</b>ログインもありません。', en: '<b>We never ask for your name, address or contact details.</b> There is no login.' },
    'about.privacy.p2': { ja: '<b>答え・保存した支援・まなぶの記録は、このスマホの中だけ</b>に残ります。どこにも送信しません。', en: '<b>Your answers, saved items and lesson progress stay only on this device.</b> Nothing is sent anywhere.' },
    'about.privacy.p3': { ja: 'アクセス解析や広告のしくみは入れていません。地図もこのサイトの中で描いています。', en: 'There are no analytics or ad trackers. The map is drawn inside this site.' },
    'about.privacy.p4': { ja: '文字のフォントだけ Google Fonts から読みこみます（答えの中身は送られません）。「Google マップで開く」はタップしたときだけ開きます。', en: 'Only the fonts load from Google Fonts (your answers are not sent). "Open in Google Maps" opens only if you tap it.' },
    'about.privacy.eraseH': { ja: '記録を消すには', en: 'To erase your data' },
    'about.privacy.erase': { ja: '右上の「設定」→「このスマホの記録をすべて消す」で、答え・保存・チェック・まなぶの記録がすべて消えます。', en: 'Settings (top right) → "Erase everything on this device" deletes your answers, saved items, checks and lesson progress.' },
    'about.privacy.shared': { ja: '施設や学校の共有パソコン・タブレットを使ったときは、終わったら消してください。', en: 'If you used a shared computer or tablet at a facility or school, please erase when you finish.' },
    'about.privacy.exit': { ja: '人に見られたくないときは、右上の「すぐ閉じる」（パソコンは Esc を2回）で、すぐに別のページに切りかわります。', en: 'If you don\'t want someone to see, tap "Leave" at the top (or press Esc twice) to switch to another page right away.' },
    'about.privacy.eraseBtn': { ja: 'このスマホの記録を消す', en: 'Erase data on this device' },

    'about.disc.h': { ja: '免責', en: 'Disclaimer' },
    'about.disc.lead': { ja: '申し込む前に、かならず公式ページや窓口で最新の内容を確認してください。', en: 'Before you apply, always check the official page or office for the latest.' },
    'about.disc.p1': { ja: '金額・条件・受付時間などは変わることがあります。申し込む前に、かならず公式ページや窓口で最新の内容を確認してください。', en: 'Amounts, conditions and hours can change. Before you apply, always check the official page or office.' },
    'about.disc.p2': { ja: '使えるかどうかを決めるのは、それぞれの窓口です。巣立ちマップは「入口」で、法律の相談の代わりにはなりません。', en: 'Each office decides who can use their program. This site is a starting point and is not legal advice.' },
    'about.disc.p3': { ja: 'このサイトの情報だけをもとにして不利益があっても、Economix JP は責任を負うことができません。ご理解ください。', en: 'Economix JP cannot be responsible for any loss based only on this site\'s information.' },
    'about.disc.sos': { ja: '命や体があぶないときは、すぐに 110・119、または「緊急」ボタンへ。', en: 'If you are in danger, call 110 or 119 now, or tap "Emergency".' },
    'about.disc.sosBtn': { ja: '緊急の連絡先を見る', en: 'Emergency numbers' },

    'about.contact.h': { ja: 'お問い合わせ', en: 'Contact' },
    'about.contact.lead': { ja: 'まちがい、のせてほしい支援、使いにくい所を教えてください。', en: 'Tell us about mistakes, programs to add, or anything hard to use.' },
    'about.contact.p1': { ja: 'まちがいの報告、のせてほしい支援、使いにくい所など、なんでも教えてください。Economix JP の公式サイトから連絡できます。', en: 'Tell us about mistakes, programs we should add, or anything hard to use. You can reach us through the Economix JP website.' },
    'about.contact.p2': { ja: 'ここは相談窓口ではありません。困っていることの相談は「相談・こころ」の窓口へどうぞ。', en: 'This is not a helpline. To talk about a problem, please use the "Talk to someone" list.' },
    'about.contact.btn': { ja: 'Economix JP に連絡する', en: 'Contact Economix JP' },
    'about.contact.consult': { ja: '相談先を見る', en: 'Places to talk' },

    'about.credits.h': { ja: '地図データ・出典', en: 'Map data & credits' },
    'about.credits.map': { ja: '地図', en: 'Map data' },
    'about.credits.mapVal': { ja: '地理院ベクトルタイル・国土数値情報（行政区域・鉄道・駅別乗降客数・土地利用細分メッシュ）を加工して作成', en: 'Processed from GSI Vector Tiles and MLIT National Land Numerical Information' },
    'about.credits.mapLinks': { ja: '国土地理院 地理院ベクトルタイル', en: 'GSI Vector Tiles' },
    'about.credits.mapLinks2': { ja: '国土交通省 国土数値情報', en: 'MLIT National Land Numerical Information' },
    'about.credits.engine': { ja: '地図の表示', en: 'Map rendering' },
    'about.credits.engineVal': { ja: 'MapLibre GL JS（BSD-3-Clause）。このサイトの中に入れて使っています。', en: 'MapLibre GL JS (BSD-3-Clause), bundled with this site.' },
    'about.credits.geo': { ja: '窓口の位置', en: 'Office locations' },
    'about.credits.geoVal': { ja: '国土地理院「アドレス検索」で、公式の住所から位置を求めています。', en: 'From official addresses, using the GSI (Geospatial Information Authority of Japan) address search.' },
    'about.credits.fonts': { ja: '文字', en: 'Fonts' },
    'about.credits.fontsVal': { ja: 'BIZ UDPゴシック、IBM Plex Sans JP（SIL Open Font License 1.1）', en: 'BIZ UDPGothic, IBM Plex Sans JP (SIL Open Font License 1.1)' },
    'about.credits.logo': { ja: 'ロゴ', en: 'Logo' },
    'about.credits.logoVal': { ja: 'Zen Kaku Gothic New（SIL Open Font License 1.1）をもとに形を作っています。', en: 'Lettering drawn from Zen Kaku Gothic New (SIL Open Font License 1.1).' },
    'about.credits.illus': { ja: 'イラスト', en: 'Illustrations' },
    'about.credits.illusVal': { ja: '巣立ちマップのオリジナルです。', en: 'Original to Sudachi Map.' },
    'about.credits.data': { ja: '支援の情報', en: 'Program info' },
    'about.credits.dataVal': { ja: 'それぞれの支援のページに出典と確認日をのせています。', en: 'Each program page shows its source and check date.' },

    'about.foot': { ja: '© 2026 Economix JP · 巣立ちマップ v{v} · 最終確認 {d}', en: '© 2026 Economix JP · Sudachi Map v{v} · Last checked {d}' }
  });

  function programs() { return (SM.data && SM.data.programs) || []; }
  function lessons() { return (SM.data && SM.data.lessons) || []; }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function fmtDate(d) { try { return SM.fmtDate ? SM.fmtDate(d) : d; } catch (e) { return d; } }
  function section(title, o) {
    if (SM.ui && SM.ui.sectionHeader) return SM.ui.sectionHeader(title, o);
    return '<div class="section-head"><h2 class="section-title" id="' + esc(o.id) + '">' + esc(title) + '</h2></div>';
  }
  function btn(label, o) {
    if (SM.ui && SM.ui.button) return SM.ui.button(label, o);
    return o.href ? '<a class="btn" href="' + esc(o.href) + '">' + esc(label) + '</a>' : '<button type="button" class="btn" data-act="' + esc(o.act || '') + '">' + esc(label) + '</button>';
  }
  function kv(rows) {
    if (SM.ui && SM.ui.kv) return SM.ui.kv(rows);
    return '<dl class="kv">' + rows.map(function (r) { return '<div class="kv-row"><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>';
  }
  function ext(href, label) {
    return '<a class="ab-ext" href="' + esc(href) + '" target="_blank" rel="noopener"><span>' + esc(label) + '</span>' + ic('external', 'ab-ext-ic') + '<span class="sr-only">' + esc(t('core.newtab')) + '</span>' + '</a>';
  }

  /* entrance delays for the first screen (forward / first open); none when instant or reduced */
  var D = null;
  function rv(kind, ms) {
    var a = ' data-reveal="' + (kind || '') + '"';
    return D && ms ? a + ' data-reveal-delay="' + ms + '"' : a;
  }


  /* ------------------------------------------------------------ numbers: a 2×2 ruled grid (4 across on desktop) */
  function stats() {
    var ps = programs();
    var free = 0, local = 0;
    ps.forEach(function (p) {
      if (!p) return;
      // same rule as the green 「返さなくていい」 line on every program row (SM.ui.repayLabel)
      if (p.repay === 'none' || (!p.repay && p.kind === 'grant')) free++;
      if (p.basis === 'local') local++;
    });
    var u = t('about.unit');
    var nl = lessons().length;
    var total = SM.ui && SM.ui.listedCount ? SM.ui.listedCount() : ps.length;
    // FIX-B (F29): one source for the counts when the app has it (SM.counts), so about, home and さがす agree
    try {
      var C = typeof SM.counts === 'function' ? SM.counts() : null;
      if (C && typeof C === 'object') {
        if (typeof C.total === 'number') total = C.total;
        if (typeof C.free === 'number') free = C.free;
        if (typeof C.local === 'number') local = C.local;
        if (typeof C.lessons === 'number') nl = C.lessons;
      }
    } catch (e) { /* keep the local counts */ }
    var cells = [
      ['total', total, u],
      ['free', free, u],
      ['local', local, u]
    ];
    if (nl) cells.push(['lessons', nl, t('about.unitLesson')]);
    // dt first (screen readers: "のせている支援 222件"); the grid shows the number on top
    var grid = cells.map(function (c, i) {
      return '<div class="ab-stat"' + rv('up', 200 + i * 60) + '><dt class="ab-stat-k">' + esc(t('about.stat.' + c[0])) + '</dt>' +
        // FIX-B (motion): the board rolls on every forward arrival (it only rolled when a number had changed)
        '<dd class="ab-stat-v"><b class="num' + (D ? ' x-rolls' : '') + '" data-count="' + c[1] + '"' + (D ? '' : ' data-count-seen="about.' + c[0] + '"') + ' data-count-dur="900">' + c[1] + '</b>' +
        (c[2] ? '<span class="ab-stat-u">' + esc(c[2]) + '</span>' : '') + '</dd></div>';
    }).join('');
    return '<section class="ab-numbers' + (cells.length === 3 ? ' is-3' : '') + '" aria-labelledby="ab-num-h">' +
      '<h2 class="sr-only" id="ab-num-h">' + esc(t('about.statsLabel')) + '</h2>' +
      '<dl class="ab-stats">' + grid + '</dl>' +
      '<p class="ab-checked"' + rv('fade', 360) + '><span class="ab-checked-k">' + esc(t('about.stat.date')) + '</span>' +
        '<span class="ab-checked-v num">' + esc(fmtDate(SM.updated || '2026-10-17')) + '</span></p>' +
    '</section>';
  }

  function orgList(items, max, moreKey) {
    var counts = {};
    items.forEach(function (o) {
      if (!o) return;
      o = String(o).split(/[「『（(]/)[0].replace(/\s+$/, '').trim();
      if (!o) return;
      counts[o] = (counts[o] || 0) + 1;
    });
    var orgs = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b, 'ja'); });
    if (!orgs.length) return '';
    var top = orgs.slice(0, max);
    var rest = orgs.length - top.length;
    return '<ul class="ab-sources" role="list">' + top.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') +
      (rest > 0 ? '<li class="is-more">' + esc(t(moreKey, { n: rest })) + '</li>' : '') + '</ul>';
  }
  function programSources() {
    return orgList(programs().map(function (p) { return p && p.source && p.source.org; }), 12, 'about.check.more');
  }
  function lessonSources() {
    var orgs = [];
    lessons().forEach(function (l) { (l && l.sources || []).forEach(function (s) { if (s && s.org) orgs.push(s.org); }); });
    return orgList(orgs, 8, 'about.check.more');
  }

  function bullets(items) { return '<ul class="bullets ab-bullets">' + items.map(function (h) { return '<li>' + h + '</li>'; }).join('') + '</ul>'; }

  var NAV = ['who', 'junior', 'learn', 'rules', 'check', 'privacy', 'disclaimer', 'contact', 'credits'];
  function navList() { return NAV.filter(function (id) { return id !== 'learn' || lessons().length > 0; }); }

  // facts as a row of small neutral tags ("a・b・c"), the way home shows them
  function tags(str) {
    return '<ul class="ab-tags" role="list">' + String(str || '').split('・').map(function (x) {
      return '<li class="tag tag-neutral">' + esc(x) + '</li>';
    }).join('') + '</ul>';
  }
  // the long explanation, folded: a native <details> (opens with no JS, found by in-page search, screen readers
  // announce it as collapsed / expanded). label: the summary's words (default 「くわしく」).
  function more(html, label) {
    if (!html) return '';
    return '<details class="ab-more"><summary class="ab-more-s" data-press="ink"><span>' + esc(label || t('about.more')) + '</span>' +
      '<span class="ab-more-go" aria-hidden="true">' + arrow('d') + '</span></summary>' +
      '<div class="ab-more-b">' + html + '</div></details>';
  }
  function p(k, cls) { return '<p' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(t(k)) + '</p>'; }

  /* one section: head, one short lead line, the structured part, the folded detail, the actions */
  function sec(id, title, o) {
    var n = navList().indexOf(id) + 1;
    return '<section class="ab-sec" id="ab-' + id + '" aria-labelledby="ab-' + id + '-h" tabindex="-1">' +
      section(title, { id: 'ab-' + id + '-h', num: pad2(n) }) +
      '<div class="ab-body"' + rv('up') + '>' +
        (o.lead ? '<p class="ab-lede">' + o.lead + '</p>' : '') +
        (o.body || '') + more(o.more, o.moreLabel) +
        (o.actions ? '<div class="ab-actions">' + o.actions + '</div>' : '') + (o.tail || '') +
      '</div></section>';
  }

  function sections() {
    var hasLearn = lessons().length > 0;
    var meta = SM.data && SM.data.mapMeta && SM.data.mapMeta.attribution;
    var mapVal = meta ? (en() ? meta.en : meta.ja) : '';
    if (!mapVal) mapVal = t('about.credits.mapVal');

    var who = sec('who', t('about.who.h'), {
      lead: esc(t('about.who.lead')),
      body: tags(t('about.who.tags')),
      more: p('about.who.p1') + p('about.who.p2') + p('about.who.p3'),
      actions: btn(t('about.who.link'), { href: SITE, variant: 'secondary', size: 'sm' })
    });

    var junior = sec('junior', t('about.junior.h'), {
      lead: esc(t('about.junior.lead')),
      body: bullets([esc(t('about.junior.l1')), esc(t('about.junior.l2')), esc(t('about.junior.l3')), esc(t('about.junior.l4'))]) +
        p('about.junior.note', 'ab-note'),
      more: p('about.junior.p1') + p('about.junior.p2'),
      actions: btn(t('about.junior.btn'), { href: '#/find/q/1', variant: 'primary', attrs: 'data-press' })
    });

    var ls = hasLearn ? lessonSources() : '';
    var learn = hasLearn ? sec('learn', t('about.learn.h'), {
      lead: esc(t('about.learn.lead')),
      body: tags(t('about.learn.tags')),
      more: p('about.learn.p1') + p('about.learn.p2') +
        (ls ? '<p class="ab-sub-h">' + esc(t('about.learn.srcH')) + '</p>' + ls : ''),
      actions: btn(t('about.learn.btn'), { href: '#/learn', variant: 'secondary', size: 'sm', arrow: true, attrs: 'data-press' })
    }) : '';

    var rules = sec('rules', t('about.rules.h'), {
      body: '<div class="cols ab-cols">' +
          '<div><p class="ab-sub-h is-first">' + esc(t('about.rules.yesH')) + '</p>' + bullets([t('about.rules.y1'), t('about.rules.y2'), t('about.rules.y3')]) + '</div>' +
          '<div><p class="ab-sub-h is-first is-no">' + esc(t('about.rules.noH')) + '</p>' + bullets([t('about.rules.n1'), esc(t('about.rules.n2')), esc(t('about.rules.n3'))]) + '</div>' +
        '</div>' +
        '<div class="ab-right"><span class="tag tag-right">' + esc(t('about.rules.rightH')) + '</span><p>' + esc(t('about.rules.right')) + '</p></div>'
    });

    // how we check: four short steps on screen; what each means, and the source list, folded
    var ps = programSources();
    var check = sec('check', t('about.check.h'), {
      body: '<ol class="ab-steps" role="list"' + (D ? '' : ' data-reveal-stagger="60"') + '>' + ['s1', 's2', 's3', 's4'].map(function (k, i) {
        return '<li><span class="ab-step-n num" aria-hidden="true">' + (i + 1) + '</span><span class="ab-step-t">' + esc(t('about.check.' + k + 'h')) + '</span></li>';
      }).join('') + '</ol>',
      more: '<ul class="bullets ab-bullets">' + ['s1', 's2', 's3', 's4'].map(function (k) { return '<li>' + t('about.check.' + k) + '</li>'; }).join('') + '</ul>' +
        (ps ? '<p class="ab-sub-h">' + esc(t('about.check.srcH')) + '</p>' + ps : '')
    });

    // privacy: the three promises on screen; the font / Google Maps note folded; erase + safety never folded
    var privacy = sec('privacy', t('about.privacy.h'), {
      body: bullets([t('about.privacy.p1'), t('about.privacy.p2'), esc(t('about.privacy.p3'))]),
      more: p('about.privacy.p4'),
      tail: '<p class="ab-sub-h">' + esc(t('about.privacy.eraseH')) + '</p>' +
      p('about.privacy.erase') +
      (SM.ui && SM.ui.callout ? SM.ui.callout(esc(t('about.privacy.shared')), 'warn') : '<p class="ab-note">' + esc(t('about.privacy.shared')) + '</p>') +
      p('about.privacy.exit', 'ab-note') +
      '<div class="ab-actions">' + btn(t('about.privacy.eraseBtn'), { act: 'erase', variant: 'danger', size: 'sm' }) + '</div>'
    });

    var disc = sec('disclaimer', t('about.disc.h'), {
      lead: esc(t('about.disc.lead')),
      more: p('about.disc.p1') + p('about.disc.p2') + p('about.disc.p3'),
      tail: '<div class="ab-sos">' +
        '<p>' + esc(t('about.disc.sos')) + '</p>' +
        '<button type="button" class="btn btn-sos btn-sm" data-act="sos">' + ic('phone') + '<span>' + esc(t('about.disc.sosBtn')) + '</span></button>' +
      '</div>'
    });

    var contact = sec('contact', t('about.contact.h'), {
      lead: esc(t('about.contact.lead')),
      body: p('about.contact.p2', 'ab-note'),
      more: p('about.contact.p1'),
      actions: btn(t('about.contact.btn'), { href: SITE, variant: 'secondary', size: 'sm' }) +
        btn(t('about.contact.consult'), { href: '#/find/cat/consult', variant: 'text', arrow: true })
    });

    var credits = sec('credits', t('about.credits.h'), {
      body: kv([
        [t('about.credits.map'), '<span class="ab-cr">' + esc(mapVal) + '</span><span class="ab-cr-links">' +
          ext(GSI_URL, t('about.credits.mapLinks')) + ext(KSJ_URL, t('about.credits.mapLinks2')) + '</span>'],
        [t('about.credits.engine'), '<span class="ab-cr">' + esc(t('about.credits.engineVal')) + '</span><span class="ab-cr-links">' + ext(MAPLIBRE_URL, 'MapLibre GL JS') + '</span>']
      ]),
      more: kv([
        [t('about.credits.geo'), esc(t('about.credits.geoVal'))],
        [t('about.credits.data'), esc(t('about.credits.dataVal'))],
        [t('about.credits.fonts'), esc(t('about.credits.fontsVal'))],
        [t('about.credits.logo'), esc(t('about.credits.logoVal'))],
        [t('about.credits.illus'), esc(t('about.credits.illusVal'))]
      ])
    });

    // the signature: the full lockup, its green line drawn once (ja; English uses the plain lockup)
    var mark = '';
    if (SM.brand && SM.brand.lockup) {
      mark = SM.brand.lockup({ line: !en(), cls: 'ab-logo' });
      mark = mark.replace('<g class="lg-line"', '<g class="lg-line" data-reveal="rule"');
    }
    var foot = '<footer class="ab-foot">' + (mark ? '<div class="ab-foot-mark">' + mark + '</div>' : '') +
      '<p>' + esc(t('about.foot', { v: SM.version || '4.0.0', d: fmtDate(SM.updated || '2026-10-17') })) + '</p></footer>';

    return who + junior + learn + rules + check + privacy + disc + contact + credits + foot;
  }

  function render() {
    var r = SM.route || {};
    D = !reduced() && !r.instant && !!(SM.motion && SM.motion.mount);
    var art = illus('about-team', { size: 'hero', cls: 'ab-art-il' });

    var head =
      '<header class="ab-hero">' +
        '<h1 class="ab-title" tabindex="-1"><span class="ab-title-l"' + rv('line', 0) + '>' + esc(t('about.h1')) + '</span></h1>' +
        '<p class="ab-lead"' + rv('up', 120) + '>' + esc(t('about.lead')) + '</p>' +
      '</header>' +
      (art ? '<div class="ab-art">' + art + '</div>' : '');

    var list = navList();
    var toc = '<nav class="ab-toc" aria-labelledby="ab-toc-h">' +
      '<p class="ab-toc-h" id="ab-toc-h">' + esc(t('about.toc')) + '</p>' +
      '<ol class="ab-toc-list" role="list"' + rv('', 420) + '>' + list.map(function (id, i) {
        return '<li><button type="button" class="ab-toc-item" data-noruby data-act="about-jump" data-target="ab-' + id + '" data-press="ink">' +
          '<span class="ab-toc-n num" aria-hidden="true">' + pad2(i + 1) + '</span>' +
          '<span class="ab-toc-t">' + esc(t('about.nav.' + id)) + '</span>' +
          '<span class="ab-toc-go">' + arrow('d') + '</span></button></li>';
      }).join('') + '</ol></nav>';

    var out = head + stats() + toc;
    var deep = r.kind === 'back' && (r.restoreY || 0) > (window.innerHeight || 700) * 0.5;
    if (SM.motion && SM.motion.afterTransition && !deep) {
      pending = { instant: !!r.instant };
      out += '<div id="ab-later" class="ab-later" aria-hidden="true"></div>';
    } else {
      pending = null;
      var keep = D; D = false;
      out += sections();
      D = keep;
    }
    return out;
  }

  var pending = null;
  function fillLater() {
    var p = pending; pending = null;
    if (!p) return;
    var slot = document.getElementById('ab-later');
    if (!slot || !slot.parentNode) return;
    D = false;
    var tpl = document.createElement('template');
    tpl.innerHTML = sections();
    var nodes = Array.prototype.slice.call(tpl.content.children);
    slot.parentNode.replaceChild(tpl.content, slot);
    nodes.forEach(function (n) {
      try { if (SM.applyRuby) SM.applyRuby(n); } catch (e) { /* ignore */ }
      try { if (SM.motion && SM.motion.mount) SM.motion.mount(n, { instant: p.instant }); } catch (e) { /* ignore */ }
    });
  }

  if (SM.on) {
    SM.on('about-jump', function (el) {
      var id = el && el.getAttribute('data-target');
      try { if (SM.motion && SM.motion.finishAll) SM.motion.finishAll(); } catch (e) { /* ignore */ }   // lands the entrance + the deferred sections
      var target = id && document.getElementById(id);
      if (!target) return;
      try { if (SM.motion && SM.motion.revealAll) SM.motion.revealAll(target); } catch (e) { /* ignore */ }
      target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      try { target.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      // FIX-B (motion): the tapped 目次 numeral stamps; the section's rule draws again once the page has arrived
      var M = SM.motion;
      if (M && !reduced()) {
        var nEl = el.querySelector('.ab-toc-n');
        try { if (nEl && M.stamp) M.stamp(nEl, { ring: false }); } catch (e) { /* ignore */ }
        var rule = target.querySelector('.section-rule');
        var head = target.querySelector('.section-head-text');
        setTimeout(function () {
          if (!target.isConnected || !M.animate) return;
          try {
            if (rule) M.animate(rule, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', key: 'ab-rule' });
            if (head) M.animate(head, [{ transform: 'translateX(-10px)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 360, easing: 'cubic-bezier(0.2, 0, 0, 1)', key: 'ab-head' });
          } catch (e) { /* ignore */ }
        }, 420);
      }
    });
  }

  SM.views.about = {
    // no tab owns about: a sentinel value that matches no tab, so none is highlighted
    tab: 'about',
    title: { ja: 'このサイトについて', en: 'About' },
    back: '#/',
    render: render,
    mount: function (main) {
      if (pending && SM.motion && SM.motion.afterTransition) SM.motion.afterTransition(fillLater);
      // the delays shape the first screen only
      if (D && main) {
        setTimeout(function () {
          var list = main.querySelectorAll('[data-reveal-delay]');
          for (var i = 0; i < list.length; i++) list[i].removeAttribute('data-reveal-delay');
        }, 1000);
      }
      D = false;
    }
  };
})();
