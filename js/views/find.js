/* 巣立ちマップ v5 — views/find.js (FIND)
   v5 (SPEC-v5): fewer words, motion you notice.
   - Browse: title, search, popular words, ONE compact way in (.f-way: a line + 質問に答える / 結果を見る), category rows
     without sub-lines (marks stamp in, counts roll). Arrival cascades title → search → words → way in → rows.
   - Questions: question ≤ 20 chars, options ≤ 10, 「なぜ聞くの」 behind SM.ui.more. Progress is a train line
     (qProgress / playLine): the train runs from the last stop to this one, passed stations fill, it pulls in with a
     settle. Options cascade 50ms apart; a chosen option fills with a colour sweep (CSS ::after) and ~420ms later the
     next question slides in 48px on the rise spring (swap). Reduced motion: fades only.
   - Results: one headline (あなたに合いそうな支援) + one caveat; the first time for an answer set a "searching" beat
     (scanBeat, ≤ 900ms) runs a line through the six category stations, then the count rolls 0 → N; group heads
     rise with their mark stamping, rows cascade; filters re-flow by FLIP; 保存 = stamp + flight (boot.js).
   - Category: no eyebrow / lead paragraph (the topic note is behind くわしく).
   Routes:  #/find               browse (search, categories, all supports)
            #/find/q/N[?ret=results]  one question per screen (N = 1..6)
            #/find/results       personalised results
            #/find/cat/KEY       one category
   Uses SM.match / SM.matchSummary / SM.matchUtil (js/match.js), SM.ui.* (components.js), SM.illus (illus.js) and
   SM.motion (motion.js). Every effect goes through SM.motion: without it, or with reduced motion, the final state is
   in the HTML and nothing moves.

   VISUAL-SPEC §7.3–7.5 · MOTION-SPEC §4 (Questions, Results, Category), §3.4 (shared morphs), §6 (performance).
   - Questions: a journey strip per question; the protagonist walks the green route from question to question
     while the counter rolls and the line grows (named view-transition groups, see the hashchange listener at
     the end). An answer: the marker fills and the check draws, the other options step back, and 260ms later
     the next question slides in. Area cells stamp their ink block.
   - Results: the count stands on the results-arrive strip's ground line and rolls from 0 (first time for an
     answer set), the sentence rises with its 蛍光ペン, the three picks arrive 40ms apart. Filters re-flow by FLIP
     and every number rolls to its new value. The jump bar's indicator follows the scroll.
   - Category: the tapped kanji tile flies into .f-cat-sign; the title rises at +120ms.
   - First screen first: each render returns the first screen; the rest lands in SM.motion.afterTransition.
   中学生 (SPEC-v3 §3): Q1 starts with 中1・中2 / 中3, Q2 becomes 高校に行きたい / 働きたい / まだわからない,
   Q5 adds 12〜14歳; copy has `jr` variants that SM.t / SM.L pick while body.is-junior. */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.views = SM.views || {};

  /* ------------------------------------------------------------------ strings */
  SM.strings({
    'find.title': { ja: 'さがす', en: 'Find' },
    'find.browse.h1': { ja: '支援をさがす', en: 'Find support' },
    'find.browse.lead': { ja: '言葉でさがすか、困りごとから見てみよう。', en: 'Search by word, or start from what you need.' },
    'find.search.ph': { ja: '例：家賃、奨学金、保証人', jr: '例：高校、受験、そうだん', en: 'e.g. rent, scholarship, guarantor' },
    'find.search.label': { ja: '支援をさがす', en: 'Search programs' },
    'find.search.clear': { ja: '入力を消す', en: 'Clear' },
    'find.search.try': { ja: 'よくさがされる言葉', en: 'Popular searches' },
    'find.search.count': { ja: '「{q}」の支援', en: 'results for “{q}”' },
    'find.search.unit': { ja: '件', en: '' },
    'find.search.none': { ja: '見つかりませんでした', en: 'Nothing found' },
    'find.search.noneBody': { ja: 'ちがう言葉か、下の困りごとから。', en: 'Try another word, or a topic below.' },
    'find.cta.eyebrow': { ja: '質問は6つ・1分でおわります', en: '6 questions · about 1 minute' },
    // v5: the compact way in — one line + one button (+ a 「1分」 chip beside it)
    'find.cta.line': { ja: '6つの質問で、合う支援がわかる', jr: '6つの質問で、合う支援がわかる', en: '6 questions find what fits you' },
    'find.cta.go': { ja: '質問に答える', en: 'Answer' },
    'find.cta.min': { ja: '1分', en: '1 min' },
    'find.search.tryAria': { ja: 'よくさがされる言葉', en: 'Popular searches' },
    'find.cta.title1': { ja: '答えるだけで、', en: 'Answer a few questions to find ' },
    'find.cta.mark': { ja: 'あなたに合う支援', en: 'the support that fits you' },
    'find.cta.title2': { ja: 'がわかる', en: '' },
    'find.cta.title': { ja: '6つの質問で、あなたに合う支援をしぼりこむ', en: 'Answer 6 questions to find what fits you' },
    'find.cta.body': { ja: '名前はいりません。答えはこのスマホの中だけ。', en: 'No name needed. Answers stay on this phone.' },
    'find.cta.start': { ja: '質問をはじめる', en: 'Start the questions' },
    'find.cta.doneEyebrow': { ja: '前に答えた内容から', en: 'From your answers' },
    'find.cta.doneUnit': { ja: '件', en: 'programs' },
    'find.cta.doneTitle': { ja: 'あなたに合いそうな支援があります', en: 'may fit you' },
    'find.cta.doneLine': { ja: 'あなたに合いそうな支援', en: 'programs that could help' },
    'find.cta.results': { ja: '結果を見る', en: 'See results' },
    'find.cta.change': { ja: '答えを変える', en: 'Change answers' },
    'find.cats.h': { ja: '困りごとから見る', en: 'Browse by need' },
    'find.cats.unit': { ja: '件', en: '' },
    'find.all.h': { ja: 'すべての支援', en: 'All programs' },
    'find.all.sub': { ja: '{n}件・東京都と全国の制度、民間の団体', en: '{n} · Tokyo, national and nonprofit' },
    'find.basis.label': { ja: 'だれの支援か', en: 'Run by' },
    'find.basis.all': { ja: 'すべて', en: 'All' },
    'find.basis.allArea': { ja: '{area}で使える', en: 'In {area}' },
    'find.basis.allAny': { ja: '都内どこでも', en: 'Anywhere in Tokyo' },
    'find.all.subArea': { ja: '{area}で使える {n}件（ぜんぶで {total}件）', en: '{n} you can use in {area} ({total} in all)' },
    'find.basis.national': { ja: '国', en: 'National' },
    'find.basis.tokyo': { ja: '東京都', en: 'Tokyo' },
    'find.basis.local': { ja: '区市町村', en: 'City / ward' },
    'find.basis.npo': { ja: '団体', en: 'Nonprofit' },
    'find.sort.label': { ja: '並べ方', en: 'Sort' },
    'find.sort.fit': { ja: 'おすすめ順', en: 'Recommended' },
    'find.sort.free': { ja: '返さなくていい順', en: 'No pay-back first' },
    'find.sort.effort': { ja: '手間が少ない順', en: 'Easiest first' },
    'find.sort.deadline': { ja: '締切が近い順', en: 'Deadline soonest' },
    'find.more': { ja: 'もっと見る（あと{n}件）', en: 'Show more ({n} more)' },
    'find.less': { ja: '少なく表示', en: 'Show less' },
    'find.none.basis': { ja: 'この条件の支援はまだありません', en: 'No programs match this filter yet' },
    'find.n': { ja: '{n}件', en: '{n}' },

    'find.q.k': { ja: '質問', en: 'Question' },
    'find.q.of': { ja: '質問 {n} / {total}', en: 'Question {n} of {total}' },
    'find.q.whyK': { ja: 'なぜ聞くの', en: 'Why we ask' },
    'find.q.skip': { ja: 'わからない・スキップ', en: 'Not sure / skip' },
    'find.q.prev': { ja: '前の質問', en: 'Previous' },
    'find.q.nextN': { ja: '次へ（{n}つ選択中）', en: 'Next ({n} selected)' },
    'find.q.skipNext': { ja: '選ばずに次へ', en: 'Skip for now' },
    'find.q.toResults': { ja: '結果にもどる', en: 'Back to results' },
    'find.q.seeResults': { ja: '結果を見る', en: 'See results' },
    'find.q.quit': { ja: 'あとで', en: 'Later' },
    'find.q.multi': { ja: 'いくつでも選べます', en: 'Choose as many as you like' },
    'find.q.optional': { ja: '答えなくてOK', en: 'Optional' },
    'find.q.whyMore': { ja: 'なぜ聞くの', en: 'Why we ask' },
    'find.q.station': { ja: '質問{n}', en: 'Question {n}' },
    'find.q.private': { ja: '答えはこのスマホの中だけ。どこにも送られません。', en: 'Your answers stay on this phone. Nothing is sent.' },
    'find.q.g.jhs': { ja: '中学生', en: 'Junior high school' },
    'find.q.g.hs': { ja: '高校生', en: 'High school' },
    'find.q.g.left': { ja: '巣立ったあと・そのほか', en: 'After leaving care · other' },
    'find.area.search': { ja: '区や市の名前（ひらがなでもOK）', en: 'Ward or city name' },
    'find.area.none': { ja: '見つかりませんでした。ひらがなでも、さがせます。', en: 'No match. Try another spelling.' },
    'find.area.note': { ja: 'いまは東京都の支援を中心にのせています。', en: 'This version focuses on Tokyo.' },
    'find.area.g.23ku': { ja: '23区', en: '23 wards' },
    'find.area.g.tama': { ja: '多摩', en: 'Tama area' },
    'find.area.g.islands': { ja: '島しょ', en: 'Islands' },
    'find.area.special': { ja: 'まだ決まっていないとき', en: 'If you are not sure' },
    'find.area.unsure': { ja: 'まだ決まっていない', en: 'Not decided yet' },
    'find.area.unsureHint': { ja: '都内どこでも使える支援', en: 'All-Tokyo programs' },
    'find.area.other': { ja: '東京都の外', en: 'Outside Tokyo' },
    'find.area.otherHint': { ja: '全国の制度と相談先', en: 'National programs' },

    'find.res.eyebrow': { ja: 'あなたの答えから', en: 'From your answers' },
    'find.res.unit': { ja: '件', en: '' },
    'find.res.mark': { ja: '使えるかもしれない支援', jr: '使えるかもしれない支援や相談先', en: 'programs that could help' },
    'find.res.after': { ja: 'が見つかりました', en: '' },
    // the headline sentence in nowrap phrases; the last one carries the 蛍光ペン (VISUAL-SPEC §7.5)
    'find.res.p1': { ja: '使えるかもしれない', en: 'programs' },
    'find.res.p2': { ja: '支援が', jr: '支援や相談先が', en: 'that' },
    'find.res.p3': { ja: '見つかりました', en: 'could help' },
    'find.res.srCount': { ja: '{n}件の', en: '{n}' },
    // 「今、住む場所がない」: a calm headline (no marker, no count roll) and tonight's numbers right under it (FIXER-robust)
    'find.res.urgentTitle': { ja: '今夜の相談先を、先に出しています', jr: '今すぐ相談できるところ', en: 'Where to go tonight comes first' },
    'find.res.urgentSub': { ja: 'ほかに使えるかもしれない支援も、下に{n}件あります。', jr: 'ほかに使えるかもしれない支援も、下に{n}件あります。', en: '{n} more programs that could help are listed below.' },
    'find.res.sub': { ja: '合いそうな順。決めるのは窓口です。', jr: '合いそうな順。決めるのは窓口の人。', en: 'By fit. The office decides.' },
    // v5 headline (≤14 chars): 64件 / あなたに合いそうな支援
    'find.res.h': { ja: 'あなたに合いそうな支援', jr: 'あなたに合いそうな支援', en: 'Programs that may fit you' },
    'find.res.scan': { ja: 'さがしています', en: 'Searching' },
    'find.res.noAnswers': { ja: '質問に答えると、あなたに合う順に並びます。', en: 'Answer the questions to sort these by fit.' },
    'find.res.answers': { ja: 'あなたの答え', en: 'Your answers' },
    'find.res.answersHint': { ja: 'タップで変えられます', en: 'Tap to change' },
    'find.res.unset': { ja: '未回答', en: 'Not answered' },
    'find.res.k.stage': { ja: '今', en: 'Now' },
    'find.res.k.path': { ja: '次', en: 'Next' },
    'find.res.k.area': { ja: '住む場所', en: 'Area' },
    'find.res.k.concerns': { ja: '気になる', en: 'Needs' },
    'find.res.k.age': { ja: '年齢', en: 'Age' },
    'find.res.k.care': { ja: '暮らし', en: 'Background' },
    'find.res.change': { ja: '変える', en: 'Change' },
    'find.res.more': { ja: 'ほか{n}つ', en: '+{n} more' },
    'find.res.add': { ja: '答える', en: 'Answer' },
    'find.res.filters': { ja: 'しぼりこむ', en: 'Filter' },
    'find.f.free': { ja: '返さなくていいだけ', en: 'No pay-back only' },
    'find.f.now': { ja: '今すぐ申し込める', en: 'Can apply now' },
    'find.f.near': { ja: '近くの窓口', en: 'Office nearby' },
    'find.res.jump': { ja: '分野へ移動', en: 'Jump to' },
    'find.top.h': { ja: 'まずはこれ', jr: 'まずはここから', en: 'Start here' },
    'find.top.sub': { ja: 'あなたの答えに、いちばん合いそうな3つ', en: 'The 3 that fit your answers best' },
    'find.top.subAll': { ja: 'はじめに見てほしい3つ', en: 'Good places to start' },
    'find.group.mine': { ja: 'あなたが選んだ', en: 'You chose this' },
    'find.local.h': { ja: '区や市の支援', en: 'Ward & city programs' },
    'find.local.sub': { ja: '住む場所が決まったら（{n}件）', en: 'Once you know where you live ({n})' },
    'find.local.pick': { ja: '住む場所を選ぶ', en: 'Choose your area' },
    'find.other.note': { ja: '東京都の外は、全国の制度と相談先を出しています。', en: 'Outside Tokyo: national programs and helplines.' },
    'find.notHere.title': { ja: 'ほかにもあるかも', en: 'There may be more' },
    'find.notHere.body': { ja: '相談窓口がいっしょに調べてくれます', jr: '大人がいっしょに調べてくれます', en: 'A helpline can look with you' },
    'find.notHere.all': { ja: '相談窓口をすべて見る', en: 'See all helplines' },
    'find.private.title': { ja: '答えはこのスマホの中だけ', en: 'Your answers stay on this phone' },
    'find.private.body': { ja: 'どこにも送られません。名前もいりません。', en: 'Nothing is sent anywhere. No name needed.' },
    'find.reset': { ja: '答えを消して、最初から', en: 'Clear answers and start over' },
    'find.reset.done': { ja: '答えを消しました', en: 'Answers cleared' },
    'find.empty.filter': { ja: 'しぼりこみが多すぎるかも', en: 'Maybe too many filters' },
    'find.empty.filterBody': { ja: '条件をひとつ外すと、出てきます。', en: 'Remove one and more will show up.' },
    'find.empty.clear': { ja: 'しぼりこみを外す', en: 'Remove filters' },
    'find.empty.none': { ja: 'まだぴったりの支援が見つかりません', en: 'No close match yet' },
    'find.empty.noneBody': { ja: '答えを変えるか、困りごとから見てみよう。', en: 'Change your answers, or browse by topic.' },

    'find.ward.h': { ja: '区や市だけの支援 {n}件', en: '{n} ward & city programs' },
    'find.ward.sub': { ja: '「区市町村」で、住む場所の支援を見られます', en: 'See them under “City / ward”' },
    'find.cat.eyebrow': { ja: '困りごと', en: 'Topic' },
    'find.cat.unit': { ja: '件の支援', en: 'programs' },
    'find.cat.fit': { ja: 'あなたに合いそう', en: 'May fit you' },
    'find.cat.rest': { ja: 'そのほかの支援', en: 'Other programs' },
    'find.cat.restSub': { ja: '答えとは合わないかも', en: 'May not match your answers' },
    'find.cat.sos': { ja: '今すぐ話したいときは、上の「緊急」ボタンから。', en: 'If you need to talk right now, use the “Emergency” button at the top.' },
    'find.cat.localH': { ja: '区や市ごとの支援（{n}）', en: 'Ward & city programs ({n})' },
    'find.cat.localSub': { ja: '住む所をえらぶと、しぼれます', en: 'Pick where you live to narrow' },
    'find.cat.localPick': { ja: '住む所をえらぶ', en: 'Choose where you live' },
    'find.cat.others': { ja: 'ほかの困りごと', en: 'Other topics' },

    'find.crisis.title': { ja: '今夜、いる場所がない？', en: 'Nowhere to stay tonight?' },
    'find.crisis.lead': { ja: '番号をタップすると、すぐ電話がかかります。', en: 'Tap a number to call now.' },
    'find.crisis.chal': { ja: 'TOKYOチャレンジネット', en: 'TOKYO Challenge Net' },
    'find.crisis.today': { ja: '今日', en: 'Today' },
    'find.crisis.open': { ja: '{h}', en: '{h}' },
    'find.crisis.closed': { ja: '日曜・祝日はお休み。よりそいホットライン（24時間）へ', en: 'Closed Sundays & holidays. Call Yorisoi Hotline (24h)' },
    'find.crisis.after': { ja: '今は受付時間外。よりそいホットライン（24時間）へ', en: 'Closed now. Call Yorisoi Hotline (24h)' },
    'find.crisis.yori': { ja: 'よりそいホットライン（24時間）', en: 'Yorisoi Hotline (24h)' },
    'find.crisis.hogo': { ja: '生活保護を申請する（申請は権利です）', en: 'Apply for public assistance (it is your right)' },
    'find.crisis.line': { ja: 'LINEで相談する（ブリッジフォースマイル）', en: 'Talk on LINE (Bridge for Smile)' },
    'find.crisis.189': { ja: '18歳未満なら 189（児童相談所）', en: 'Under 18: call 189 (child guidance)' },
    'find.crisis.jrTitle': { ja: '家にいられない・帰れないとき', en: 'If you can\'t stay at home or go back' },
    'find.crisis.jrLead': { ja: '番号をタップすると電話がかかります。名前を言わなくても相談できます。', en: 'Tap a number to call. You don\'t have to give your name.' },
    'find.search.helpTitle': { ja: 'こんな支援が近いかもしれません', en: 'These may be what you need' },
    'find.urgent.label': { ja: '今、いる場所がない', jr: '今、家にいられない', en: 'Nowhere to stay now' },
    'find.urgent.hint': { ja: '今夜の相談先を先に出します', jr: '今すぐ話せる所を先に出します', en: 'Tonight\'s help comes first' },
    'find.urgent.why': { ja: '今、いる場所がないと答えたので', jr: '今、家にいられないと答えたので', en: 'You said you have nowhere to stay now' },
    'find.stamp.done': { ja: '選びました', en: 'Selected' },
    // labelled rows on a program row besides 「理由」 (match.js why lines with kind 'for' / 'note')
    'find.whyFor': { ja: '対象', en: 'For' },
    'find.whyNote': { ja: 'ポイント', en: 'Tip' },
    // 中学生: lists are narrowed to what is open to them; a supporter can look at everything (this visit only)
    'find.jr.filtered': { ja: '中学生向けにしぼっています（ほか{n}件）', en: 'Showing programs for junior high only ({n} more)' },
    'find.jr.showAll': { ja: 'ぜんぶ見る（職員や先生と見るとき）', jr: 'ぜんぶ見る（職員や先生と見るとき）', en: 'Show all (when looking with staff)' },
    'find.jr.allOn': { ja: 'すべての支援を表示しています', en: 'Showing every program' },
    'find.jr.back': { ja: '中学生向けにもどす', en: 'Back to junior high only' },
    // 緊急 sheet → 「話すのがこわいときは」: only places you can reach by LINE or chat
    'find.chat.h': { ja: 'LINE・チャットで話せるところ', jr: 'チャットで話せるところ', en: 'Talk by LINE or chat' },
    'find.chat.intro': { ja: '文字で相談できます。名前は言わなくて大丈夫。', jr: '文字で相談できるよ。名前は言わなくて大丈夫。', en: 'Type instead of calling. No name needed.' },
    'find.chat.all': { ja: '電話の相談先もふくめて、すべて見る', en: 'See every place to talk, phone too' }
  });
  function t(k, v) { return SM.t(k, v); }
  function L(o) { return SM.L(o); }
  function esc(s) { return SM.esc(s); }
  function ic(n, c) { return SM.icon ? SM.icon(n, c) : ''; }
  function en() { return SM.lang() === 'en'; }
  function U() { return SM.matchUtil || {}; }
  // the drawn arrow of the system (components.js); a text glyph only if components is missing
  function arrow(d) { return SM.ui && SM.ui.arrow ? SM.ui.arrow(d || 'r') : '<span class="arrow" aria-hidden="true">' + (d === 'l' ? '←' : '→') + '</span>'; }
  var ARROW = arrow('r');
  function ill(name, o) {
    try { return SM.illus && SM.illus.has && SM.illus.has(name) ? SM.illus(name, o || {}) : ''; } catch (e) { return ''; }
  }

  /* ------------------------------------------------------------------ motion helpers
     Everything goes through SM.motion (MOTION-SPEC §7). Without it, or with reduced motion, the final state is
     already in the HTML/CSS and nothing moves. */
  function M() { return SM.motion || null; }
  function reduced() { var m = M(); if (!m || !m.reduced) return false; try { return !!m.reduced(); } catch (e) { return false; } }
  function lite() { var m = M(); try { return !!(m && m.tier && m.tier() === 'lite'); } catch (e) { return false; } }
  function animOn() { return !!(M() && M().animate) && !reduced(); }
  function mcall(name) {
    var m = M();
    if (!m || typeof m[name] !== 'function') return null;
    try { return m[name].apply(m, Array.prototype.slice.call(arguments, 1)); } catch (e) { return null; }
  }
  function anim(el, kf, o) { return el && animOn() ? mcall('animate', el, kf, o) : null; }
  function fmtN(n) { var m = M(); if (m && m.format) { try { return m.format(n); } catch (e) { } } return String(n); }
  // reveal attributes only when the screen is new (navigation), never on an in-place re-render,
  // so toggling a filter or opening a group does not make the whole list flash in again
  function R(attr) { return mem.quiet ? '' : ' ' + attr; }
  function pulse(el) { if (el) mcall('pulse', el); }
  // re-render in place, letting rows glide to their new places (FLIP on the smooth spring)
  function reflow(update) {
    var view = document.getElementById('view');
    var m = M();
    if (view && m && m.flip) { try { m.flip(view, update, { selector: '.pcard, [data-flip-key]' }); return; } catch (e) { } }
    update();
  }

  /* ------------------------------------------------------------------ first screen first (MOTION-SPEC §6 rule 4)
     render() returns the first screen; the rest is a <template data-later> in the same container, filled in
     SM.motion.afterTransition (same DOM order, same headings). A back navigation that restores a scroll
     position renders everything at once, so the restore lands on real content. */
  var later = {}, laterN = 0;
  function lazy(html) {
    if (!html) return '';
    if (!mem.defer) return html;
    var k = 'fl' + (++laterN);
    later[k] = html;
    return '<template data-later="' + k + '"></template>';
  }
  // a deferred run of rows: each fades in as it scrolls into view (the first screen keeps its stagger)
  function lazyRows(html) { return lazy(mem.defer ? html.replace(/<article class="pcard/g, '<article data-reveal="fade" class="pcard') : html); }
  function flushLater(root) {
    root = root || document.getElementById('view');
    if (!root) return;
    var ph = root.querySelectorAll('template[data-later]');
    if (ph.length) {
      var inst = !!(SM.route && SM.route.instant);
      var added = [];
      Array.prototype.forEach.call(ph, function (tp) {
        var k = tp.getAttribute('data-later'), html = later[k];
        delete later[k];
        var par = tp.parentNode;
        if (!par) return;
        if (html) {
          var box = document.createElement('template');
          box.innerHTML = html;
          Array.prototype.forEach.call(box.content.childNodes, function (n) { if (n.nodeType === 1) added.push(n); });
          par.insertBefore(box.content, tp);
        }
        par.removeChild(tp);
      });
      added.forEach(function (n) {
        try { SM.applyRuby(n); } catch (e) { }
        mcall('mount', n, { instant: inst });
      });
    }
    var fns = mem.afterFlush; mem.afterFlush = [];
    fns.forEach(function (f) { try { f(root); } catch (e) { console.error('[find] after flush', e); } });
  }
  function scheduleLater(root) {
    if (!root.querySelector('template[data-later]') && !mem.afterFlush.length) return;
    var m = M();
    if (m && m.afterTransition) m.afterTransition(function () { flushLater(); });
    else flushLater(root);
  }
  // work that needs the deferred rows (scrollspy): now if nothing is waiting, else after the flush
  function whenFlushed(root, fn) {
    if (root.querySelector('template[data-later]')) mem.afterFlush.push(fn);
    else fn(root);
  }
  /* ------------------------------------------------------------------ copy */
  var INTRO = {
    housing: { ja: '部屋を借りる、保証人、家賃の支え。巣立つ前から準備できることも多いです。', jr: '家にいづらいとき、住むところのこと。こまったら、まず相談してみよう。', en: 'Renting a room, guarantors, help with rent. Much can be prepared before you leave.' },
    money: { ja: '生活費の給付や、利子なしの貸付。「返さなくていい」ものから見てみよう。', jr: '高校や受験のお金、くらしのお金。「返さなくていい」ものから見てみよう。', en: 'Grants for living costs and interest-free loans. Start with the ones you do not pay back.' },
    education: { ja: '高校・大学・専門学校に進むための奨学金や学費の支え。締切が早いものもあるので、早めにチェック。', jr: '高校の授業料、受験や塾のお金、勉強の場所。受験の前に見ておこう。', en: 'Scholarships and fee support for high school and college. Some deadlines come early, so check soon.' },
    work: { ja: '仕事さがし、職場の悩み、職業訓練。', jr: '働くこと、アルバイトのこと。', en: 'Finding work, problems at work, training.' },
    procedures: { ja: '住民票・健康保険・年金・マイナンバー。引っ越したら14日以内の手続きもあります。', jr: '役所や学校の書類のこと。大人といっしょに進めよう。', en: 'Residence, health insurance, pension, My Number. Some must be done within 14 days of moving.' },
    consult: { ja: 'だれかに話したいとき。電話・LINE・チャット・居場所があります。', jr: 'だれかに話したいとき。電話やLINE、チャットで話せます。', en: 'When you want to talk to someone: phone, LINE, chat and drop-in places.' }
  };
  // simpler hints for 中学生 (category hints otherwise come from SM.CATS)
  var CAT_HINT_JR = {
    housing: { ja: '家にいづらい・住むところ', en: 'Home, a place to stay' },
    money: { ja: '学校のお金・くらしのお金', en: 'School costs, living costs' },
    education: { ja: '高校・受験・塾・勉強', en: 'High school, exams, study' },
    work: { ja: '働くこと・アルバイト', en: 'Work, part-time jobs' },
    procedures: { ja: '書類・役所の手続き', en: 'Papers, city office' },
    consult: { ja: 'だれかに話したい', en: 'When you want to talk' }
  };
  // kana keywords so hiragana searches find kanji records
  var CAT_KW = {
    housing: 'すまい いえ へや やちん ほしょうにん じゅうたく ひっこし けいやく 住宅 家賃 部屋 保証人 アパート',
    money: 'おかね せいかつひ きゅうふ かしつけ しょうがくきん 生活費 給付 貸付 お金 借りる',
    education: 'しんがく だいがく せんもんがっこう しょうがくきん がっこう がくひ こうこう じゅけん じゅく 進学 大学 専門学校 奨学金 学費 受験 高校 塾',
    work: 'しごと しゅうしょく はたらく はろーわーく ばいと あるばいと 仕事 就職 アルバイト 職業訓練',
    procedures: 'てつづき じゅうみんひょう ほけん ねんきん まいなんばー やくしょ 手続き 住民票 保険 年金 マイナンバー 役所',
    consult: 'そうだん こころ でんわ らいん ちゃっと はなす いばしょ 相談 こころ 電話 LINE チャット 居場所'
  };
  var KANA_ALIAS = {
    'やちん': '家賃', 'ほしょうにん': '保証人', 'しょうがくきん': '奨学金', 'せいかつひ': '生活費', 'ほけん': '保険',
    'ねんきん': '年金', 'しごと': '仕事', 'そうだん': '相談', 'じゅうみんひょう': '住民票', 'しんがく': '進学',
    'がくひ': '学費', 'ひっこし': '引っ越', 'いばしょ': '居場所', 'けいやく': '契約', 'しゅうしょく': '就職',
    'せいかつほご': '生活保護', 'でんわ': '電話', 'だいがく': '大学', 'ばいと': 'アルバイト', 'あるばいと': 'アルバイト',
    'まいなんばー': 'マイナンバー', 'じゅうたく': '住宅', 'へや': '部屋', 'きゅうふ': '給付', 'かしつけ': '貸付',
    'じゅけん': '受験', 'せんもんがっこう': '専門学校', 'しかく': '資格', 'くんれん': '訓練', 'びょういん': '病院',
    'にんしん': '妊娠', 'ぼうりょく': '暴力', 'しゃっきん': '借金', 'しせつ': '施設', 'さとおや': '里親',
    'こうこう': '高校', 'じゅく': '塾', 'じゅぎょうりょう': '授業料', 'きょうかしょ': '教科書', 'がっこう': '学校',
    'ちゅうがく': '中学', 'べんきょう': '勉強'
  };
  var SUGGEST = [
    { ja: '家賃', en: 'rent' }, { ja: '奨学金', en: 'scholarship' }, { ja: '保証人', en: 'guarantor' },
    { ja: '生活費', en: 'living' }, { ja: '保険', en: 'insurance' }, { ja: 'LINE', en: 'LINE' }
  ];
  var SUGGEST_JR = [
    { ja: '高校', en: 'high school' }, { ja: '受験', en: 'exam' }, { ja: '塾', en: 'cram school' },
    { ja: '授業料', en: 'tuition' }, { ja: 'いじめ', en: 'bullying' }, { ja: 'LINE', en: 'LINE' }
  ];

  /* ------------------------------------------------------------------ questions */
  function opt(v, ja, en_, hja, hen, g) { return { v: v, g: g || null, label: { ja: ja, en: en_ }, hint: hja ? { ja: hja, en: hen || '' } : null }; }
  /* v5 (SPEC-v5 Part B 質問): a question ≤ 20 chars, options ≤ 10 chars, a short hint only where two options would
     be confused without it. 「なぜ聞くの」 sits behind a small disclosure (it opens in place). */
  var Q = [
    { n: 1, key: 'stage',
      title: { ja: '今の状況は？', en: 'Where are you now?' },
      why: { ja: '中学生か、高校生か、もう巣立ったかで、使える支援や締切がちがうからです。', en: 'Programs and deadlines differ by school year and by whether you have left care.' },
      opts: [
        opt('jhs12', '中1・中2', 'Junior high 1–2', null, null, 'jhs'),
        opt('jhs3', '中3', 'Junior high 3', '高校受験の年', 'Entrance-exam year', 'jhs'),
        opt('hs12', '高1・高2', 'High school 1–2', null, null, 'hs'),
        opt('hs3', '高3', 'High school 3', '来年の春に巣立つ', 'Leaving care next spring', 'hs'),
        opt('left0', '巣立って1年以内', 'Left care <1 yr', null, null, 'left'),
        opt('left1', '巣立って1年以上', 'Left care 1+ yrs', null, null, 'left'),
        opt('nohs', '高校に行っていない', 'Not in high school', 'やめた・働いている', 'Left school or working', 'left')
      ] },
    { n: 2, key: 'path',
      title: { ja: '次にしたいことは？', jr: '中学を出たら、どうしたい？', en: 'What next?' },
      why: { ja: '進学と仕事では、使える奨学金や窓口がちがうからです。', jr: '高校に行くか、働くかで、使える支援がちがうからです。', en: 'Scholarships and offices differ for study and work.' },
      opts: [
        opt('study', '進学したい', 'Study', '大学・専門学校など', 'University, college'),
        opt('work', '働きたい', 'Work', '働いている人も', 'Or already working'),
        opt('unsure', 'まだ決めていない', 'Not decided')
      ],
      optsJr: [
        opt('hs', '高校に行きたい', 'High school', '全日制・定時制・通信制', 'Any kind of high school'),
        opt('work', '働きたい', 'Work'),
        opt('unsure', 'まだわからない', 'Not sure yet')
      ] },
    { n: 3, key: 'area',
      title: { ja: '住む（住む予定の）ところは？', jr: '今、住んでいるところは？', en: 'Where will you live?' },
      why: { ja: '区や市によって、独自の支援や窓口があるからです。いまは東京都の支援を中心にのせています。', jr: '区や市によって、相談できる場所や支援がちがうからです。', en: 'Each ward or city has its own programs and offices. This version focuses on Tokyo.' } },
    { n: 4, key: 'concerns', multi: true,
      title: { ja: '今、気になることは？', en: 'What is on your mind?' },
      why: { ja: '気になることに近い支援から、先に表示します。', en: 'We show programs for these first.' } },
    { n: 5, key: 'age',
      title: { ja: '年齢は？', en: 'How old are you?' },
      why: { ja: '年齢で使えるかどうかが決まる支援があるからです。', en: 'Some programs have age limits.' },
      opts: [
        opt('a12', '12〜14歳', '12–14'), opt('a15', '15〜17歳', '15–17'), opt('a18', '18〜19歳', '18–19'),
        opt('a20', '20〜22歳', '20–22'), opt('a23', '23歳以上', '23 or older')
      ] },
    { n: 6, key: 'care', optional: true,
      title: { ja: 'どこで暮らしてきた？', jr: '今、どこで暮らしている？', en: 'Where have you lived?' },
      why: { ja: '答えなくても大丈夫。答えると、施設や里親家庭で育った人向けの支援を、あなたに合う順に上にならべます。', jr: '答えなくても大丈夫。答えると、あなたに合う支援を上にならべます。', en: 'You do not have to answer. If you do, programs for people who grew up in care are sorted to fit you better.' },
      opts: [
        opt('facility', '児童養護施設', "Children's home"),
        opt('foster', '里親・ファミリーホーム', 'Foster / family home'),
        opt('jhome', '自立援助ホーム', 'Independence home'),
        opt('other', 'そのほか', 'Other', '一時保護所など', 'e.g. a shelter')
      ] }
  ];
  var TOTAL = Q.length;

  // the protagonist's pose on each question's strip (VISUAL-SPEC §7.4)
  var POSE = ['stand', 'look', 'map', 'think', 'stand', 'wave'];
  var QRE = /#\/find\/q\/(\d+)/;

  /* ------------------------------------------------------------------ state (per viewer) */
  var ui = (SM.store && SM.store.get('find:ui', null)) || {};
  ui.filters = ui.filters || { free: false, now: false, near: false };
  ui.basis = ui.basis || 'all';
  ui.sort = ui.sort || 'fit';
  /* mem (this visit only):
     quiet      in-place re-render (SM.render): no reveals, nothing deferred
     nav        a hashchange happened since the last render (so the same hash again is a navigation, not a re-render)
     defer      render the first screen now and the rest after the transition
     fromQ      the question we came from (the counter rolls, the line grows and the figure walks from there)
     fromOutside arrived from another screen (not a reload / deep link)
     rollFrom   numbers on screen before an in-place re-render ({key: text}), so they roll to the new value
     leaveT     the pending forward navigation after an answer (restarts when another option is tapped) */
  var mem = {
    q: '', expanded: {}, browseShown: 24, leaving: false, leaveT: null, quiet: false, nav: false, defer: false,
    lastHash: null, fromQ: null, fromOutside: false, rollFrom: null, focusMore: null, jrAll: false, afterFlush: [], spy: null
  };
  function saveUi() { try { SM.store.set('find:ui', ui); } catch (e) { } }

  function answers() { return SM.state.answers; }
  function junior() {
    var a = answers();
    if (U().isJunior) return U().isJunior(a);
    return a.stage === 'jhs12' || a.stage === 'jhs3' || a.age === 'a12';
  }
  // 中学生 lists show only what is open to them, unless a supporter chose ぜんぶ見る (this visit only:
  // kept in memory, never stored, so the phone goes back to the junior view next time)
  function jrFilter() { return junior() && !mem.jrAll; }
  // a ruled text row with a trailing arrow (list-item from the system)
  function rowLink(o) {
    return '<button type="button" class="list-item f-rowlink" data-act="' + o.act + '" data-value="' + esc(o.value) + '"' + (o.id ? ' id="' + o.id + '"' : '') + '>' +
      '<span class="list-body"><span class="list-title">' + esc(o.title) + '</span>' +
      (o.sub ? '<span class="list-sub">' + esc(o.sub) + '</span>' : '') + '</span><span class="list-meta">' + arrow('r') + '</span></button>';
  }
  function jrNote(hidden, where) {
    if (!junior()) return '';
    var on = !!mem.jrAll;
    if (!on && !hidden) return '';
    return rowLink({ act: 'find-jr-all', value: on ? '0' : '1', id: 'f-jrall-' + where,
      title: on ? t('find.jr.allOn') : t('find.jr.filtered', { n: hidden }), sub: on ? t('find.jr.back') : t('find.jr.showAll') });
  }
  /* a program row. why lines with kind 'for' (who the service is for) or 'note' (a tip) get their own
     labelled row (「対象」「ポイント」) so nobody reads them as the reason they were shown */
  function whyRow(kind, items) {
    var txt = items.map(function (w) { return L(w); }).filter(Boolean).join(en() ? ' · ' : '・');
    if (!txt) return '';
    var lab = t(kind === 'for' ? 'find.whyFor' : 'find.whyNote');
    return '<p class="pcard-why pcard-why-' + kind + '"><span class="pcard-why-k" aria-hidden="true">' + esc(lab) + '</span>' +
      '<span><span class="sr-only">' + esc(lab) + ': </span>' + esc(txt) + '</span></p>';
  }
  function pcard(p, o) {
    o = o || {};
    var why = o.why ? (Array.isArray(o.why) ? o.why : [o.why]) : [];
    var plain = [], extra = { 'for': [], note: [] };
    why.forEach(function (w) { if (w && (w.kind === 'for' || w.kind === 'note')) extra[w.kind].push(w); else if (w) plain.push(w); });
    if (!extra['for'].length && !extra.note.length) return SM.ui.programCard(p, o);
    var copy = {}; for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) copy[k] = o[k]; }
    copy.why = plain.length ? plain : null;
    var html = SM.ui.programCard(p, copy);
    var noteTxt = extra.note.map(function (w) { return L(w); }).filter(Boolean).join(en() ? ' · ' : '・');
    var note = !noteTxt ? '' : SM.ui.more ? SM.ui.more(t('find.whyNote'), '<p class="pcard-why pcard-why-note">' + esc(noteTxt) + '</p>', { inline: true, cls: 'pcard-more' }) : whyRow('note', extra.note);
    var rows = whyRow('for', extra['for']) + note;
    // the row ends …</div>[save button]</article>: add the rows at the end of .pcard-main
    var end = html.lastIndexOf('<button type="button" class="pcard-save"');
    if (end === -1) end = html.lastIndexOf('</article>');
    var at = end === -1 ? -1 : html.lastIndexOf('</div>', end);
    return at === -1 ? html : html.slice(0, at) + rows + html.slice(at);
  }
  function answeredAny() {
    var a = answers();
    return !!(a.stage || a.path || a.area || (a.concerns && a.concerns.length) || a.age || (a.care && a.care !== 'skip'));
  }
  // one string per answer set: the results count rolls from 0 the first time a set is seen (MOTION-SPEC §4 Results)
  function answerSig() {
    var a = answers();
    return [a.stage, a.path, a.area, (a.concerns || []).join('+'), a.age, a.care, a.urgent ? 'u' : ''].join('|');
  }
  function catName(k) { var c = SM.CATS && SM.CATS[k]; return c ? (en() ? c.en : c.ja) : k; }
  function catHint(k) {
    if (junior() && !en() && CAT_HINT_JR[k]) return L(CAT_HINT_JR[k]);
    var c = SM.CATS && SM.CATS[k]; return c ? L(c.hint) : '';
  }
  function catOrder() { return SM.CAT_ORDER || ['housing', 'money', 'education', 'work', 'procedures', 'consult']; }
  function programs() { return (SM.data && SM.data.programs) || []; }
  // a number that rolls (odometer) from its previous value after an in-place re-render (data-roll = its key)
  function rollNum(key, n, cls) {
    return '<b class="' + (cls || 'f-n') + '" data-roll="' + key + '">' + esc(fmtN(n)) + '</b>';
  }
  // every number that may change in place: [data-roll], chip counts and tab counts (keyed by their control's id)
  function rollEls(root) {
    var out = [];
    if (!root) return out;
    Array.prototype.forEach.call(root.querySelectorAll('[data-roll], .chip[id] .chip-count, button[id] > .f-tab-n'), function (el) {
      var k = el.getAttribute('data-roll');
      if (!k) { var host = el.parentNode; k = host && host.id ? 'c:' + host.id : null; }
      if (k) out.push({ k: k, el: el });
    });
    return out;
  }
  function shownText(el) { return el._smOdoShown != null ? el._smOdoShown : String(el.textContent || '').trim(); }
  function snapRolls() {
    var out = {};
    rollEls(document.getElementById('view')).forEach(function (x) { out[x.k] = shownText(x.el); });
    return out;
  }
  /* a count that rolls up the first time (and from the last value when it changed since): the start value is
     written at mount, before anything is visible, and the roll starts once its block has faded in, so the final
     number never flashes first. Back, reloads, re-renders and reduced motion simply show it */
  function countIn(root, delay) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-f-count]'), function (el) {
      var n = parseFloat(el.getAttribute('data-f-count')), key = el.getAttribute('data-f-seen');
      if (!isFinite(n)) return;
      var prev = key ? mcall('seen', key) : undefined;
      if (key) mcall('seen', key, n);
      if (mem.quiet || !animOn() || (SM.route && SM.route.instant) || prev === n) return;
      // built now (write-only), waiting out the delay inside the animation: its first frame (blank cells the first
      // time, never a '0' that reads as a value; else the old number) is what the fading block shows
      var from = typeof prev === 'number' && isFinite(prev) ? fmtN(prev) : '';
      mcall('odometer', el, fmtN(n), { from: from, duration: 640, delay: delay });
    });
  }
  function playRolls(root) {
    var from = mem.rollFrom; mem.rollFrom = null;
    if (!from || !animOn()) return;
    var n = 0;
    rollEls(root).forEach(function (x) {
      var was = from[x.k], now = String(x.el.textContent || '').trim();
      if (was == null || was === now || n >= 10) return;
      n++;
      mcall('odometer', x.el, now, { from: was, duration: 420 });
    });
  }
  /* ------------------------------------------------------------------ search */
  var hayCache = null, hayLen = -1, hayLang = '';
  function rubyReadings(text) {
    var dict = SM.data.ruby || {}, out = [];
    for (var k in dict) { if (Object.prototype.hasOwnProperty.call(dict, k) && dict[k] && text.indexOf(k) !== -1) out.push(dict[k]); }
    return out.join(' ');
  }
  function haystack(p) {
    var list = programs();
    if (!hayCache || hayLen !== list.length || hayLang !== SM.lang()) { hayCache = {}; hayLen = list.length; hayLang = SM.lang(); }
    if (hayCache[p.id]) return hayCache[p.id];
    var parts = [];
    ['name', 'hook', 'summary'].forEach(function (f) { var o = p[f]; if (o) { parts.push(o.ja || ''); parts.push(o.jr || ''); parts.push(o.en || ''); } });
    if (p.kana) parts.push(p.kana);
    if (p.where) parts.push(L(p.where));
    if (p.amount) parts.push(L(p.amount));
    var weak = [];
    (p.cat || []).forEach(function (c) {
      var C = SM.CATS && SM.CATS[c];
      if (C) { parts.push(C.ja, C.en); weak.push(L(C.hint)); }
      weak.push(CAT_KW[c] || '');
    });
    var areas = (p.for && p.for.areas) || [];
    areas.forEach(function (code) { var a = SM.area(code); if (a) parts.push(a.name, a.kana, a.en); });
    if (SM.ui && SM.ui.basisLabel) parts.push(SM.ui.basisLabel(p));
    if (p.contact && (p.contact.line || /line/i.test(p.contact.chat || ''))) parts.push('LINE らいん');
    var jaText = [p.name && p.name.ja, p.hook && p.hook.ja, p.summary && p.summary.ja].join(' ');
    parts.push(rubyReadings(jaText));
    var h = { s: U().norm(parts.join(' ')), w: U().norm(weak.join(' ')) };
    hayCache[p.id] = h;
    return h;
  }
  /* intents: how people say what they need, not the name of a scheme */
  var INTENTS = [
    { key: 'housing', crisis: true,
      re: /住む|すむ|住め|すめ|住まい|すまい|家(?!賃|族|庭|計|電)|いえ(?!ない)|部屋|へや|泊ま|とま|寝る|寝れ|ねる場所|ねれる|ねる所|ネカフェ|ねかふぇ|ネットカフェ|ねっとかふぇ|漫画喫茶|ホームレス|ほーむれす|家出|いえで|追い出|おいだ|野宿|のじゅく|帰れない|かえれない|居場所がない|いる場所/,
      ids: ['tokyo-challenge-net', 'seikatsu-hogo', 'b4s-line-soudan', 'jiritsu-enjo', 'jiso-189', 'jiritsu-sodan', 'jukyo-kakuho'],
      idsJr: ['jiso-189', 'kodomo-sos', 'tokyo-jisou', 'tokyo-kodomo-net', 'b4s-line-soudan'] },
    { key: 'money',
      re: /お金|おかね|かね(?!つ)|金がない|食べ|たべ|ごはん|ご飯|食費|借金|しゃっきん|払え|はらえ|生活でき|くらせ|暮らせ|貧乏|びんぼう|給料|きゅうりょう/,
      ids: ['seikatsu-hogo', 'jiritsu-sodan', 'jukyo-kakuho', 'houterasu', 'seikatsu-fukushi'],
      idsJr: ['koko-shugaku', 'koko-kyufukin', 'tokyo-juken-challenge', 'shugaku-enjo'] },
    { key: 'feel',
      re: /死にたい|しにたい|消えたい|きえたい|つらい|辛い|しんどい|さみしい|寂しい|ひとり|話したい|はなしたい|こわい|怖い/,
      ids: ['yorisoi', 'inochi-sos', 'anata-no-ibasho', 'tokyo-kokoro-hotline', 'b4s-line-soudan'],
      idsJr: ['kodomo-sos', 'childline', 'anata-no-ibasho', 'tokyo-kodomo-net', 'yorisoi'] },
    { key: 'violence',
      re: /暴力|ぼうりょく|なぐ|殴|dv|虐待|ぎゃくたい|逃げ|にげ/,
      ids: ['jiso-189', 'tokyo-josei-center', 'onestop-8891', 'police-9110', 'yorisoi'],
      idsJr: ['jiso-189', 'kodomo-sos', 'tokyo-kodomo-net', 'onestop-8891', 'jinken-110'] },
    { key: 'school', young: true,
      re: /いじめ|イジメ|苛め|不登校|ふとうこう|学校に行けない|がっこうにいけない|学校がつらい|先生/,
      ids: ['kodomo-sos', 'tokyo-kyoiku-sodan', 'tokyo-kodomo-net', 'childline', 'jinken-110'] },
    { key: 'work',
      re: /働きたい|はたらきたい|仕事がない|しごとがない|クビ|くび|やめさせ|辞めさせ|給料が/,
      ids: ['hellowork-wakamono', 'tokyo-shigoto-young', 'saposute', 'tokyo-rodo-sodan', 'rodo-hotline'] }
  ];
  // "住む場所がない" -> "住む場所": drop how-I-feel endings before the plain word search
  var ENDINGS = /(がない|が無い|がありません|ない|したい|たい|に困っ(てる|ている|た)?|で困っ(てる|ている|た)?|困ってる|困っている|困る|こまる|こまってる|です|ます|かも|どうしよう|どうすれば|どうしたら|[?？!！。、]+)+$/;
  function intentsFor(q) {
    var s = String(q || '');
    try { s = s.normalize('NFKC'); } catch (e) { }
    s = s.toLowerCase();
    // school-age lines (いじめ・不登校) only for people who are still school age
    var a = answers();
    var adult = /^(left0|left1)$/.test(a.stage || '') || /^(a18|a20|a23)$/.test(a.age || '');
    return INTENTS.filter(function (it) { return it.re.test(s) && !(it.young && adult); });
  }
  function intentRows(intents) {
    var a = answers();
    var jr = junior();
    var allowed = U().urgentIds ? U().urgentIds(a) : null;
    // 中学生: only what their answers allow (nothing made for adults)
    var fits = null;
    if (jr) { fits = {}; SM.match(a).forEach(function (r) { fits[r.p.id] = 1; }); }
    var seen = {}, out = [];
    intents.forEach(function (it) {
      ((jr && it.idsJr) || it.ids).forEach(function (id) {
        if (seen[id]) return;
        if (id === 'jiso-189' && allowed && allowed.indexOf(id) === -1) return;
        if (fits && !fits[id]) return;
        var p = SM.program(id);
        if (!p) return;
        seen[id] = 1; out.push({ p: p, why: [] });
      });
    });
    return out;
  }
  function stripEnding(q) {
    return String(q || '').split(/[\s　]+/).map(function (w) { var x = w.replace(ENDINGS, ''); return x || w; }).join(' ');
  }

  /* "今夜、いる場所がない？" — call rows, pinned wherever housing help is listed.
     中学生 get child-protection lines (189, 子供SOSダイヤル) instead of adult housing schemes. */
  function chalToday() {
    var now = new Date(), d = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
    if (d === 0) return { open: false, closedDay: true };
    var end = (d === 2 || d === 4) ? 20 : 17;
    var label = en() ? '10:00–' + end + ':00' : '10時〜' + end + '時';
    return { open: h >= 10 && h < end, label: label, closedDay: false };
  }
  function telRow(num, label, opts) {
    opts = opts || {};
    var digits = String(num).replace(/[^\d+#*]/g, '');
    var free = /^0120|^0800/.test(digits);
    return '<a class="contact-item contact-phone f-crisis-tel" href="tel:' + esc(digits) + '"' + (opts.press === false ? '' : ' data-press') + '>' +
      '<span class="contact-main"><span class="contact-label">' + esc(label) + (free ? '<span class="contact-free">' + esc(en() ? 'Free' : '無料') + '</span>' : '') + '</span>' +
      '<span class="contact-value" data-noruby>' + esc(num) + '</span></span>' +
      '<span class="contact-cta">' + ic('phone') + '<span class="contact-cta-t">' + esc(en() ? 'Call' : '電話する') + '</span></span></a>' +
      (opts.hours ? '<p class="contact-hours' + (opts.open ? ' is-open' : '') + '"><span class="contact-hours-k">' + esc(opts.hoursK || (en() ? 'Hours' : '受付時間')) + '</span><span>' + esc(opts.hours) + '</span></p>' : '');
  }
  function linkRow(href, label, external) {
    return '<a class="contact-item f-crisis-link" href="' + esc(href) + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>' +
      '<span class="contact-main"><span class="contact-value">' + esc(label) + '</span></span>' +
      (external ? ic('external', 'contact-go') + '<span class="sr-only">' + esc(t('core.newtab')) + '</span>' : '<span class="f-row-arrow">' + ARROW + '</span>') + '</a>';
  }
  function crisisCard(o) {
    o = o || {};
    var id = 'f-crisis-h' + (o.id || '');
    var rows = '', title, lead;
    var b4s = SM.program('b4s-line-soudan');
    var line = b4s && b4s.contact && b4s.contact.line;
    if (junior()) {
      title = t('find.crisis.jrTitle'); lead = t('find.crisis.jrLead');
      ['jiso-189', 'kodomo-sos'].forEach(function (pid) {
        var p = SM.program(pid), c = p && p.contact;
        if (!c || !c.phone) return;
        rows += telRow(c.phone, L(c.phoneLabel) || L(p.name), { hours: L(c.hours) });
      });
      if (line) rows += linkRow(line, t('find.crisis.line'), true);
    } else {
      var a = answers();
      var allowed = U().urgentIds ? U().urgentIds(a) : [];
      var c = chalToday();
      title = t('find.crisis.title'); lead = t('find.crisis.lead');
      var hours = c.closedDay ? t('find.crisis.closed') : c.open ? c.label : c.label + '・' + t('find.crisis.after');
      rows += telRow('0120-874-225', t('find.crisis.chal'), { hours: hours, hoursK: t('find.crisis.today'), open: c.open });
      if (!c.open || o.withYori) rows += telRow('0120-279-338', t('find.crisis.yori'));
      if (allowed.indexOf('seikatsu-hogo') !== -1) rows += linkRow('#/p/seikatsu-hogo', t('find.crisis.hogo'));
      if (line) rows += linkRow(line, t('find.crisis.line'), true);
      if (allowed.indexOf('jiso-189') !== -1) rows += telRow('189', t('find.crisis.189'));
    }
    return '<section class="f-crisis' + (o.cls ? ' ' + o.cls : '') + '" aria-labelledby="' + id + '">' +
      '<h2 class="f-crisis-title" id="' + id + '">' + esc(title) + '</h2>' +
      '<p class="f-crisis-lead">' + esc(lead) + '</p>' +
      '<div class="contact f-crisis-rows">' + rows + '</div></section>';
  }
  SM.findCrisisCard = crisisCard;

  function search(q) {
    q = stripEnding(q);
    var raw = String(q || '').split(/[\s　]+/).map(function (s) { return U().norm(s); }).filter(Boolean);
    if (!raw.length) return [];
    // each term may also match its kanji spelling (やちん -> 家賃)
    var terms = raw.map(function (x) { return KANA_ALIAS[x] ? [x, U().norm(KANA_ALIAS[x])] : [x]; });
    var base = SM.match(jrFilter() ? answers() : { concerns: [] });
    // strong = the record's own words; weak = category keywords (used only when nothing strong matches)
    var hit = function (key) {
      return base.filter(function (r) {
        var h = haystack(r.p);
        return terms.every(function (alts) {
          return alts.some(function (term) { return h.s.indexOf(term) !== -1 || (key === 'w' && h.w.indexOf(term) !== -1); });
        });
      });
    };
    var found = hit('s');
    if (!found.length) found = hit('w');
    return found.map(function (r) {
      // titles that contain the term first
      var nm = U().norm((r.p.name && (r.p.name.ja + ' ' + (r.p.name.en || ''))) || '');
      r._t = (terms.some(function (alts) { return alts.some(function (term) { return nm.indexOf(term) !== -1; }); }) ? 0 : 1) + (otherWard(r) ? 2 : 0);
      return r;
    }).sort(function (a, b) { return a._t - b._t; });
  }

  /* ------------------------------------------------------------------ sorting for browse */
  function sortRows(rows, how) {
    var u = U(), now = new Date();
    var idx = {}; rows.forEach(function (r, i) { idx[r.p.id] = i; });
    var by = {
      fit: null,
      free: function (a, b) { return (u.isFree(a.p) ? 0 : 1) - (u.isFree(b.p) ? 0 : 1); },
      effort: function (a, b) { return (u.EFFORT[a.p.effort] == null ? 1 : u.EFFORT[a.p.effort]) - (u.EFFORT[b.p.effort] == null ? 1 : u.EFFORT[b.p.effort]); },
      deadline: function (a, b) { return u.deadlineRank(a.p, now) - u.deadlineRank(b.p, now); }
    }[how];
    if (!by) return rows;
    return rows.slice().sort(function (a, b) { return by(a, b) || idx[a.p.id] - idx[b.p.id]; });
  }
  // ward-only records for a ward that is not the user's: hidden under 'すべて', shown under '区市町村'
  function otherWard(r) {
    var ar = (r.p.for && r.p.for.areas) || [];
    if (!ar.length || !ar.every(U().isWard)) return false;
    var mine = answers().area;
    return !(U().isWard(mine) && ar.indexOf(mine) !== -1);
  }
  function basisRows(rows) {
    if (ui.basis === 'all') return rows.filter(function (r) { return !otherWard(r); });
    var out = rows.filter(function (r) { return r.p.basis === ui.basis; });
    if (ui.basis === 'local') out = out.filter(function (r) { return !otherWard(r); }).concat(out.filter(otherWard));
    return out;
  }
  function wardHint(rows) {
    if (ui.basis !== 'all') return '';
    var n = rows.filter(otherWard).length;
    if (!n) return '';
    return rowLink({ act: 'find-basis', value: 'local', id: 'f-wardhint', title: t('find.ward.h', { n: n }) });
  }
  function isExtraWhy(w) { return !!(w && (w.kind === 'for' || w.kind === 'note')); }
  /* a ruled list of program rows. o.first: rows rendered now (the rest wait for the transition: lazyRows);
     o.block: no per-row stagger (the section reveals as one block) */
  function cards(rows, o) {
    o = o || {};
    var prev = null;
    var html = rows.map(function (r) {
      var why = o.noWhy ? null : r.why;
      // groups: the same 理由 on every row is noise — show it only when it changes from the row above
      if (o.dedupWhy && why) {
        var arr = Array.isArray(why) ? why : [why];
        var plain = arr.filter(function (w) { return w && !isExtraWhy(w); });
        var key = plain.map(function (w) { return w.ja || String(w); }).join('|');
        if (plain.length && key === prev) why = arr.filter(isExtraWhy);
        else if (plain.length) prev = key;
      }
      return pcard(r.p, { why: why, compact: o.compact });
    });
    var first = o.first != null && mem.defer ? o.first : html.length;
    return '<div class="pcards"' + (o.block ? '' : R('data-reveal-stagger="40"')) + '>' + html.slice(0, first).join('') +
      (html.length > first ? lazyRows(html.slice(first).join('')) : '') + '</div>';
  }
  function wide() { try { return !!(window.matchMedia && window.matchMedia('(min-width: 1100px)').matches); } catch (e) { return false; } }

  /* ================================================================== BROWSE */
  function resultCount() { return SM.match(answers()).filter(function (r) { return !r.local; }).length; }
  /* the way in, one compact block (SPEC-v5 Part B さがす): one line + one button.
     new:       6つの質問で、合う支援がわかる   [質問に答える →] 1分
     returning: 64件 あなたに合いそうな支援       [結果を見る →]  変える
     The block slides up after the search; its button's arrow nudges once when it has landed (mountBrowse). */
  function ctaBlock(mini) {
    var done = SM.state.answered || answeredAny();
    if (done && !mini) {
      var n = resultCount();
      return '<section class="f-way is-back" aria-labelledby="f-back-t"' + R('data-reveal="up" data-reveal-delay="200"') + '>' +
        '<h2 class="f-way-t" id="f-back-t"><span class="f-back-n"><span data-f-count="' + n + '" data-f-seen="find.browse.n">' + esc(fmtN(n)) + '</span>' +
        '<span class="unit">' + esc(t('find.cta.doneUnit')) + '</span></span><span class="f-back-line">' + esc(t('find.cta.doneLine')) + '</span></h2>' +
        '<div class="f-way-acts">' + SM.ui.button(t('find.cta.results'), { href: '#/find/results', attrs: 'data-press' }) +
        '<a class="f-way-alt" href="#/find/q/1">' + esc(t('find.res.change')) + '</a></div></section>';
    }
    return '<section class="f-way' + (mini ? ' is-mini' : '') + '" aria-labelledby="f-way-t' + (mini ? '2' : '') + '"' + (mini ? '' : R('data-reveal="up" data-reveal-delay="200"')) + '>' +
      '<h2 class="f-way-t" id="f-way-t' + (mini ? '2' : '') + '">' + esc(t('find.cta.line')) + '</h2>' +
      '<div class="f-way-acts">' + SM.ui.button(t('find.cta.go'), { href: '#/find/q/1', attrs: 'data-press' }) +
      '<span class="tag tag-neutral f-way-min">' + esc(t('find.cta.min')) + '</span></div></section>';
  }

  function catCounts() {
    var counts = {};
    var wardKnown = U().isWard(answers().area);
    var jrFits = null;
    if (jrFilter()) { jrFits = {}; SM.match(answers()).forEach(function (r) { jrFits[r.p.id] = 1; }); }
    programs().forEach(function (p) {
      if (wardKnown ? otherWard({ p: p }) : isLocalItem({ p: p })) return;
      if (SM.tokyoVersion && SM.tokyoVersion[p.id] && answers().area !== 'other') return;
      if (jrFits && !jrFits[p.id]) return;
      (p.cat || []).forEach(function (c) { counts[c] = (counts[c] || 0) + 1; });
    });
    return counts;
  }
  // 01 困りごとから見る: ruled rows whose kanji mark travels into the category page (shared morph)
  function catList(numLabel) {
    var counts = catCounts();
    // reading order on arrival: title, search, words, the way in (+200), then this list (+280 and on)
    var head = SM.ui.sectionHeader(t('find.cats.h'), { id: 'f-cats-h', num: numLabel, reveal: !mem.quiet });
    if (!mem.quiet) head = head.replace('data-reveal="up"', 'data-reveal="up" data-reveal-delay="280"').replace('data-reveal="rule" data-reveal-delay="80"', 'data-reveal="rule" data-reveal-delay="360"');
    return '<section class="f-cats-sec" aria-labelledby="f-cats-h">' + head +
      '<ul class="f-cats list" role="list"' + R('data-reveal-stagger="50"') + '>' + catOrder().map(function (k, i) {
        var row = SM.ui.listItem({ title: catName(k), subSr: catHint(k), href: '#/find/cat/' + k, cat: k, id: 'cat:' + k,
          meta: counts[k] || 0, unit: t('find.cats.unit'), count: !mem.quiet, attrs: 'data-press' });
        // the kanji mark stamps in as its row arrives (a hanko on the station sign)
        if (!mem.quiet) row = row.replace('<span class="cat-icon', '<span data-reveal="mark" data-reveal-delay="' + (440 + i * 50) + '" class="cat-icon');
        return '<li' + (mem.quiet ? '' : ' data-reveal-delay="320"') + '>' + row + '</li>';
      }).join('') + '</ul></section>';
  }

  function basisTabs(rows, idp) {
    var keys = ['all', 'national', 'tokyo', 'local', 'npo'];
    // 'all' hides other wards' own schemes (they live under 区市町村), so its count does too
    var c = { all: rows.filter(function (r) { return !otherWard(r); }).length };
    rows.forEach(function (r) { c[r.p.basis] = (c[r.p.basis] || 0) + 1; });
    var wardNm = myWardName();
    return '<div class="f-basis" role="group" aria-label="' + esc(t('find.basis.label')) + '"><div class="seg-tabs f-basis-tabs" data-key="' + idp + '">' +
      keys.filter(function (k) { return k === 'all' || c[k]; }).map(function (k) {
        // no ward yet: 'all' leaves out ward-only schemes, so it is named for what it holds (not 「すべて」 beside a bigger total)
        var lbl = k === 'all' ? (wardNm ? t('find.basis.allArea', { area: wardNm }) : t('find.basis.allAny')) : t('find.basis.' + k);
        return '<button type="button" aria-pressed="' + (ui.basis === k) + '" data-act="find-basis" data-value="' + k + '" id="' + idp + '-b-' + k + '">' +
          '<span>' + esc(lbl) + '</span><span class="f-tab-n">' + esc(c[k] || 0) + '</span></button>';
      }).join('') + '<i class="m-indicator" aria-hidden="true"></i></div></div>';
  }
  function sortSelect(id) {
    return '<label class="f-sort" for="' + id + '"><span class="f-sort-k">' + esc(t('find.sort.label')) + '</span>' +
      '<select class="select f-sort-sel" id="' + id + '" data-act="find-sort">' + ['fit', 'free', 'effort', 'deadline'].map(function (k) {
        return '<option value="' + k + '"' + (ui.sort === k ? ' selected' : '') + '>' + esc(t('find.sort.' + k)) + '</option>';
      }).join('') + '</select></label>';
  }
  function listHead(n, id) {
    return '<div class="f-list-head"><p class="f-list-n" aria-live="polite">' + rollNum('list-n', n, 'f-list-num') +
      '<span class="unit">' + esc(t('find.cats.unit')) + '</span></p>' + sortSelect(id) + '</div>';
  }
  // the sticky bar of a list: underline tabs (who runs it) + count + sort
  function listTools(rows, idp, sortId, delay) {
    return '<div class="f-tools"' + (delay != null ? R('data-reveal="fade" data-reveal-delay="' + delay + '"') : '') + '>' +
      basisTabs(rows, idp) + listHead(basisRows(rows).length, sortId) + '</div>';
  }

  // the user's own ward (or null): 'すべて' then reads 「練馬区で使える」 so its count makes sense
  function myWardName() {
    var code = answers().area;
    if (!U().isWard(code)) return null;
    var ar = SM.area ? SM.area(code) : null;
    return ar ? (en() ? (ar.en || ar.name) : ar.name) : null;
  }
  function allList(numLabel) {
    var a = answers();
    var jr = jrFilter();
    var base = SM.state.answered || answeredAny() ? SM.match(a) : SM.match({ concerns: [] });
    // keep everything in browse: records excluded by answers are appended after (not for 中学生:
    // records made only for older people stay out of their lists)
    var seen = {}; base.forEach(function (r) { seen[r.p.id] = 1; });
    var hidden = 0;
    SM.match({ concerns: [] }).forEach(function (r) {
      if (seen[r.p.id]) return;
      if (jr) { if (!otherWard(r)) hidden++; return; }
      r.why = []; base.push(r);
    });
    var rows = sortRows(basisRows(base), ui.sort);
    var shown = rows.slice(0, mem.browseShown);
    var body = rows.length ? cards(shown, { compact: true, noWhy: true, first: 8 }) : SM.ui.empty(t('find.none.basis'), '', '');
    var more = rows.length > shown.length ?
      '<div class="f-more-wrap">' + SM.ui.button(t('find.more', { n: rows.length - shown.length }), { act: 'find-browse-more', variant: 'secondary', block: true, arrow: 'down', attrs: 'id="f-browse-more"' }) + '</div>' : '';
    return '<section class="f-all" aria-labelledby="f-all-h">' +
      SM.ui.sectionHeader(t('find.all.h'), { id: 'f-all-h', num: numLabel, reveal: !mem.quiet }) +
      listTools(base, 'f-all', 'f-all-sort') +
      jrNote(hidden, 'all') + body + more + wardHint(base) + '</section>';
  }

  function searchResults(q) {
    var intents = intentsFor(q);
    var pinned = intentRows(intents);
    var pinnedIds = {}; pinned.forEach(function (r) { pinnedIds[r.p.id] = 1; });
    var rows = search(q).filter(function (r) { return !pinnedIds[r.p.id]; });
    var crisis = intents.some(function (it) { return it.crisis; });
    var n = pinned.length + rows.length;
    // 中学生: how many hits the junior filter held back (so a supporter can tell something was filtered)
    var jrHidden = 0;
    if (jrFilter()) {
      var mine = {}; pinned.concat(rows).forEach(function (r) { mine[r.p.id] = 1; });
      mem.jrAll = true;
      try { search(q).forEach(function (r) { if (!mine[r.p.id] && !otherWard(r)) jrHidden++; }); } finally { mem.jrAll = false; }
    }
    var jrRow = jrNote(jrHidden, 's');
    if (!n) {
      // never a dead end: who to call now, then the topics
      return '<div class="f-sresults"><p class="f-count" role="status"><span class="f-count-q">' + esc(t('find.search.none')) + '</span></p>' +
        '<p class="f-snone-body">' + esc(t('find.search.noneBody')) + '</p>' + jrRow +
        crisisCard({ withYori: true, id: '-s' }) + catList() + '</div>';
    }
    return '<div class="f-sresults"><p class="f-count" role="status">' + rollNum('s-n', n, 'f-count-n') + '<span class="f-count-u">' + esc(t('find.search.unit')) + '</span>' +
      '<span class="f-count-q">' + esc(t('find.search.count', { q: q.trim() })) + '</span></p>' + jrRow +
      (crisis ? crisisCard({ id: '-s' }) : '') +
      (pinned.length ? '<section class="f-intent" aria-labelledby="f-intent-h">' + SM.ui.sectionHeader(t('find.search.helpTitle'), { id: 'f-intent-h', level: 2, reveal: false }) +
        cards(pinned) + '</section>' : '') +
      (rows.length ? cards(rows) : '') +
    '</div>';
  }

  function browseBody() {
    var q = mem.q.trim();
    if (q) return searchResults(q);
    // phone: the list is below the first screen (side column first), so all of it waits for the transition
    return wide() ? allList('02') : lazy(allList('02'));
  }
  // the way in (36件 → 結果を見る): under the search, in the side column that stays in view on desktop; empty while searching
  function sideMore() { return mem.q.trim() ? '' : ctaBlock(); }
  // 01 困りごとから見る: above the list on a phone; a full-width 2 × 3 index above the 4 / 8 split on desktop
  // (never inside the sticky side column, where it needed its own scroller); empty while searching
  function catsMore() { return mem.q.trim() ? '' : catList('01'); }

  function renderBrowse() {
    var sug = junior() && !en() ? SUGGEST_JR : SUGGEST;
    return '<div class="f-browse wide-layout"><div class="f-side">' +
      '<header class="f-head"><h1 class="f-h1"' + R('data-reveal="line"') + '>' + esc(t('find.browse.h1')) + '</h1></header>' +
      '<div class="f-side-stick">' +
      '<div class="f-searchbox" role="search">' +
        '<div class="f-search-wrap"' + R('data-reveal="up" data-reveal-delay="80"') + '>' + SM.ui.searchField({ id: 'f-q', placeholder: t('find.search.ph'), label: t('find.search.label'), value: mem.q }) +
        '<button type="button" class="search-clear" id="f-q-clear" aria-label="' + esc(t('find.search.clear')) + '"' + (mem.q ? '' : ' hidden') + '>' + ic('close') + '</button></div>' +
        '<div class="f-suggest" role="group" aria-label="' + esc(t('find.search.tryAria')) + '">' +
          '<div class="chips-scroll f-suggest-row"' + R('data-reveal-stagger="50"') + '>' + sug.map(function (s) {
            var w = L(s);
            return SM.ui.chip(w, { act: 'find-suggest', pressed: mem.q.trim() === w, attrs: 'data-q="' + esc(w) + '"' + (mem.quiet ? '' : ' data-reveal-delay="140"') });
          }).join('') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="f-side-more" id="f-side-more">' + sideMore() + '</div>' +
      '</div></div>' +
      '<div class="f-cats-slot" id="f-cats-slot">' + catsMore() + '</div>' +
      '<div id="f-browse-body" class="f-browse-body">' + browseBody() + '</div></div>';
  }

  function paintSuggest() {
    var q = mem.q.trim();
    Array.prototype.forEach.call(document.querySelectorAll('#view [data-act="find-suggest"]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-q') === q ? 'true' : 'false');
    });
  }
  function refreshBrowseBody() {
    var body = document.getElementById('f-browse-body');
    if (!body) return;
    var was = mem.quiet; mem.quiet = true;           // typing: no reveal cascade on every keystroke
    var wasDefer = mem.defer; mem.defer = false;
    var rolls = snapRolls();
    body.innerHTML = browseBody();
    var more = document.getElementById('f-side-more');
    var moreHtml = sideMore();
    var moreChanged = !!more && (!moreHtml) !== (!more.innerHTML);
    if (moreChanged) more.innerHTML = moreHtml;
    var cats = document.getElementById('f-cats-slot');
    var catsHtml = catsMore();
    var catsChanged = !!cats && (!catsHtml) !== (!cats.innerHTML);
    if (catsChanged) cats.innerHTML = catsHtml;
    mem.quiet = was; mem.defer = wasDefer;
    try { SM.applyRuby(body); if (moreChanged && moreHtml) SM.applyRuby(more); if (catsChanged && catsHtml) SM.applyRuby(cats); } catch (e) { }
    mcall('mount', body, { instant: true });
    if (moreChanged && moreHtml) mcall('mount', more, { instant: true });
    if (catsChanged && catsHtml) mcall('mount', cats, { instant: true });
    mem.rollFrom = rolls; playRolls(body);
    paintSuggest();
    wireTabs(body);
  }

  function mountBrowse(root) {
    countIn(root, 260);
    // the way in has landed: its arrow nudges once (a hint that it moves you on)
    if (!mem.quiet && animOn() && !(SM.route && SM.route.instant)) {
      var way = root.querySelector('.f-way .btn .arrow');
      if (way) anim(way, [{ translate: '0 0' }, { translate: '8px 0', offset: 0.3 }, { translate: '0 0', offset: 0.6 }, { translate: '5px 0', offset: 0.8 }, { translate: '0 0' }],
        { duration: 900, delay: 900, easing: 'ease-in-out', key: 'nudge' });
    }
    var input = root.querySelector('#f-q');
    var clear = root.querySelector('#f-q-clear');
    whenFlushed(root, wireTabs);
    if (!input) return;
    var timer = null;
    function update() {
      mem.q = input.value;
      if (clear) clear.hidden = !mem.q;
      refreshBrowseBody();
    }
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(update, 120); });
    input.addEventListener('keydown', function (e) {
      // no stopPropagation: clearing also counts as the 1st Esc of the Esc×2 quick exit
      if (e.key === 'Escape' && input.value) { input.value = ''; update(); }
      if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); update(); try { input.blur(); } catch (er) { } }
    });
    if (clear) clear.addEventListener('click', function () { input.value = ''; update(); input.focus(); });
  }
  // underline tabs: the 2px indicator sits under the chosen tab and slides when it changes (the bar is rebuilt by
  // an in-place re-render, so its old position and scroll are carried over)
  function snapTabs() {
    var out = {};
    Array.prototype.forEach.call(document.querySelectorAll('#view .f-basis-tabs[data-key]'), function (bar) {
      var ind = bar.querySelector('.m-indicator');
      out[bar.getAttribute('data-key')] = { tf: ind ? ind.style.transform : '', x: bar.scrollLeft };
    });
    return out;
  }
  function wireTabs(root) {
    if (!root) return;
    var from = mem.tabsFrom || {}; mem.tabsFrom = null;
    Array.prototype.forEach.call(root.querySelectorAll('.f-basis-tabs'), function (bar) {
      var on = bar.querySelector('[aria-pressed="true"]'), ind = bar.querySelector('.m-indicator');
      var f = from[bar.getAttribute('data-key')];
      if (f) { if (f.x) bar.scrollLeft = f.x; if (ind && f.tf) { ind.style.transform = f.tf; ind._smPlaced = true; } }
      if (on && ind) mcall('indicator', ind, on);
    });
  }

  SM.on('find-suggest', function (el) {
    var input = document.getElementById('f-q');
    if (!input) return;
    var w = el.getAttribute('data-q') || '';
    // tapping the chosen word again clears it
    input.value = mem.q.trim() === w ? '' : w;
    mem.q = input.value;
    refreshBrowseBody();
    var clear = document.getElementById('f-q-clear'); if (clear) clear.hidden = !mem.q;
  });
  function rerender() { mem.rollFrom = snapRolls(); mem.tabsFrom = snapTabs(); SM.render(); }
  SM.on('find-basis', function (el) {
    ui.basis = el.getAttribute('data-value') || 'all';
    mem.browseShown = 24; saveUi();
    reflow(rerender);
  });
  SM.on('find-sort', function (el) { ui.sort = el.value || 'fit'; saveUi(); reflow(rerender); });
  SM.on('find-browse-more', function () {
    var before = mem.browseShown;
    mem.browseShown += 24;
    mem.focusMore = { sel: '.f-all .pcards > .pcard', idx: before };
    reflow(rerender);
    focusMore();
  });
  // もっと見る: focus moves to the first new row
  function focusMore() {
    var f = mem.focusMore; mem.focusMore = null;
    if (!f) return;
    var list = document.querySelectorAll('#view ' + f.sel);
    var row = list[f.idx];
    var link = row && row.querySelector('.pcard-link');
    if (link) { try { link.focus({ preventScroll: true }); } catch (e) { } }
  }
  /* ================================================================== QUESTIONS
     One question per screen. The journey strip (VISUAL-SPEC §7.4) is the signature: each question has its own
     scene on one ground line, and the protagonist walks along the green route from the last question to this one.
     q→q (MOTION-SPEC §4 Questions): the progress group (sm-progress) and the strip (f-q-journey) are named for the
     view transition, so they stay put while the question slides; inside them the counter rolls, the line grows
     and the figure walks. The names are on only while html.f-qq is set (the hashchange listener at the end). */
  // a walk: under way after a beat, steady, then slowing to a stop (in front of a question) or already moving (walking in)
  var WALK = [0.3, 0.1, 0.6, 1], WALK_IN = [0.2, 0.3, 0.6, 1];
  function bez(b) { return 'cubic-bezier(' + b.join(', ') + ')'; }
  var EASE_STD = 'cubic-bezier(0.2, 0, 0, 1)';
  var EASE_DRAW = 'cubic-bezier(0.5, 0, 0.15, 1)';
  function qNext(n, query) {
    if (query && query.ret === 'results') return '#/find/results';
    return n < TOTAL ? '#/find/q/' + (n + 1) : '#/find/results';
  }
  function retQ(query) { return query && query.ret === 'results' ? '?ret=results' : ''; }
  function qOpts(q) { return q.optsJr && junior() ? q.optsJr : q.opts; }
  // options arrive in reading order: 30ms apart from 120ms, capped at the 6th (MOTION-SPEC §4 Questions)
  // (the title rises at +0; options from +60, 30ms apart, capped at the 4th: a question is answerable at once)
  // v5: options cascade in 50ms apart from +120ms (cap 8), each rising 28px (SPEC-v5 Part A 5)
  function rv(i) { return R('data-reveal="up" data-reveal-delay="' + (120 + Math.min(i, 7) * 50) + '"'); }
  function routeW(k) { return (30 + (k - 1) * 54) / 360; }       // the green route to question k (strip units / 360)

  function radioOpt(q, o, selected, extraCls, i) {
    var cls = 'opt f-opt' + (selected ? ' is-selected' : '') + (extraCls ? ' ' + extraCls : '');
    return '<button type="button" class="' + cls + '" role="radio" aria-checked="' + (selected ? 'true' : 'false') + '" tabindex="-1"' +
      ' data-act="find-answer" data-key="' + q.key + '" data-value="' + esc(o.v) + '" data-press' + (i != null ? rv(i) : '') + '>' +
      '<span class="opt-ind">' + ic('check') + '</span>' +
      '<span class="opt-body"><span class="opt-title">' + esc(L(o.label)) + '</span>' +
      (o.hint && L(o.hint) ? '<span class="opt-hint">' + esc(L(o.hint)) + '</span>' : '') + '</span></button>';
  }

  function areaOpts(q, cur) {
    var areas = (SM.data.areas || []).slice();
    var groups = ['23ku', 'tama', 'islands'];
    var html = '<div class="f-area-special" role="group" aria-label="' + esc(t('find.area.special')) + '">' +
      '<div class="opts">' +
      radioOpt(q, { v: '13', label: t('find.area.unsure'), hint: t('find.area.unsureHint') }, cur === '13', 'f-opt-special', 2) +
      radioOpt(q, { v: 'other', label: t('find.area.other'), hint: t('find.area.otherHint') }, cur === 'other', 'f-opt-special', 3) +
      '</div></div>';
    groups.forEach(function (g) {
      var list = areas.filter(function (a) { return a.group === g; });
      if (!list.length) return;
      // the ward grid is long and mostly below the fold: it is never reveal-gated (controls render visible)
      html += '<div class="f-area-group" data-group="' + g + '"><p class="opt-group-label f-ag-label" id="f-ag-' + g + '"><span>' + esc(t('find.area.g.' + g)) + '</span><span class="f-ag-n">' + list.length + '</span></p>' +
        '<div class="f-area-grid">' + list.map(function (a) {
          var on = cur === a.code;
          var hay = U().norm([a.name, a.kana, a.en, a.name.replace(/[区市町村]$/, '')].join(' '));
          return '<button type="button" class="f-area-b' + (on ? ' is-selected' : '') + '" role="radio" aria-checked="' + on + '" tabindex="-1" data-act="find-answer" data-key="area" data-value="' + esc(a.code) + '" data-hay="' + esc(hay) + '" data-press>' +
            '<span class="f-area-name" data-noruby>' + esc(en() ? (a.en || a.name) : a.name) + '</span>' +
            (en() ? '' : '<span class="f-area-kana" lang="ja" data-noruby>' + esc(a.kana || '') + '</span>') + '</button>';
        }).join('') + '</div></div>';
    });
    return html;
  }

  /* 質問 3 / 6 · あとで — and the progress as a train line (SPEC-v5 Part A 5): six stations on a 4px rail, the run
     (green) from the first station to this one, passed stations filled, and the train (this question's station
     sign) standing at its stop. Between questions the train travels along the rail from the last stop to this one
     while the run grows behind it (playJourney); the stations it passes fill as it goes. */
  function stX(k) { return (k - 1) / (TOTAL - 1) * 100; }       // station k along the rail (%)
  function qProgress(n, q, query) {
    var ret = query && query.ret === 'results';
    var st = '';
    for (var i = 1; i <= TOTAL; i++) {
      st += '<span class="f-q-st' + (i < n ? ' is-done' : i === n ? ' is-cur' : '') + '" data-st="' + i + '" style="left:' + stX(i).toFixed(3) + '%"></span>';
    }
    return '<div class="f-q-top">' +
      '<div class="f-q-head">' +
        '<p class="f-q-step"><span class="f-q-k" aria-hidden="true">' + esc(t('find.q.k')) + '</span>' +
          '<span class="f-q-n" aria-hidden="true"><b class="f-q-cur">' + n + '</b><span class="f-q-of">/ ' + TOTAL + '</span></span>' +
          '<span class="sr-only">' + esc(t('find.q.of', { n: n, total: TOTAL })) + '</span></p>' +
        (q.optional ? '<span class="tag tag-neutral f-q-opt">' + esc(t('find.q.optional')) + '</span>' : '') +
        '<a class="f-q-quit" href="' + (ret ? '#/find/results' : '#/find') + '">' + esc(t(ret ? 'find.q.toResults' : 'find.q.quit')) + '</a>' +
      '</div>' +
      '<div class="f-q-line" role="progressbar" aria-label="' + esc(en() ? 'Progress' : '進みぐあい') + '" aria-valuemin="0" aria-valuemax="' + TOTAL + '" aria-valuenow="' + n + '" aria-valuetext="' + esc(t('find.q.of', { n: n, total: TOTAL })) + '">' +
        '<span class="f-q-rail" aria-hidden="true"><i class="f-q-run" style="transform:scaleX(' + (stX(n) / 100).toFixed(4) + ')"></i>' + st +
        '<span class="f-q-trainbox" style="transform:translateX(' + stX(n).toFixed(3) + '%)"><b class="f-q-train">' + n + '</b></span></span></div>' +
    '</div>';
  }

  // the strip of this question + the protagonist standing at its place on the route (feet on the ground line)
  function qJourney(n, q) {
    var x = (24 + (n - 1) * 54) / 360 * 100;
    // arriving from another question the scene swaps in place (soft: no ground draw); otherwise it draws in
    var animate = mem.quiet ? false : (mem.fromQ != null ? 'soft' : true);
    // desktop (find.css ≥900px) shows the same scene twice as long (q-*-wide): same ground, same scale, the walker's
    // place and the route in the same % of the stage, so the walk lands on its spot at any width
    var wide = ill('q-' + q.key + '-wide', { size: 'fill', animate: animate, cls: 'f-q-strip f-q-strip-w' });
    return '<div class="f-q-journey' + (wide ? ' has-wide' : '') + '" aria-hidden="true">' +
      ill('q-' + q.key, { size: 'strip', animate: animate, cls: 'f-q-strip' }) + wide +
      '<i class="f-q-walk" style="transform:scaleX(' + routeW(n).toFixed(4) + ')"></i>' +
      '<div class="f-q-fig" style="left:' + x.toFixed(3) + '%">' +
        // the walk is two drawings swapped by distance (contact: legs apart / passing: legs together, a little higher),
        // then this question's pose. Only the pose is there when nothing moves (reduced motion, reload)
        '<span class="f-q-fig-m"><span class="f-q-fig-w">' + ill('q-figure', { pose: 'walk', animate: false }) + '</span>' +
          '<span class="f-q-fig-s">' + ill('q-figure', { pose: 'stand', animate: false }) + '</span></span>' +
        '<span class="f-q-fig-p">' + ill('q-figure', { pose: POSE[n - 1] || 'stand', animate: false }) + '</span>' +
      '</div></div>';
  }

  function renderQuestion(nRaw, query) {
    var n = parseInt(nRaw, 10);
    if (!(n >= 1 && n <= TOTAL)) n = 1;
    var q = Q[n - 1];
    var a = answers();
    var ret = query && query.ret === 'results';
    var titleId = 'f-q-title';
    var title = '<h1 class="q-title f-q-title" id="' + titleId + '"' + R('data-reveal="line"') + '>' + esc(L(q.title)) + '</h1>';
    // 「なぜ聞くの」: closed by default, opens in place (SM.ui.more); the answers-stay-here line lives inside it
    var whyBody = '<p class="q-why f-why-t">' + esc(L(q.why)) + '</p><p class="f-why-priv">' + esc(t('find.q.private')) + '</p>';
    var why = '<div class="f-why"' + R('data-reveal="fade" data-reveal-delay="80"') + '>' +
      (SM.ui.more ? SM.ui.more(t('find.q.whyMore'), whyBody, { inline: true, id: 'f-why-' + n }) :
        '<details class="f-why-d"><summary>' + esc(t('find.q.whyMore')) + '</summary>' + whyBody + '</details>') + '</div>';

    var body = '', foot = '', k = 0;
    if (q.key === 'concerns') {
      var cs = a.concerns || [];
      body = '<p class="f-q-hint"' + rv(k++) + '>' + esc(t('find.q.multi')) + '</p>' +
        '<div class="opts f-opts" role="group" aria-labelledby="' + titleId + '">' +
        '<button type="button" class="opt opt-multi f-opt f-opt-urgent' + (a.urgent ? ' is-selected' : '') + '" role="checkbox" aria-checked="' + (!!a.urgent) + '" data-act="find-urgent" data-press' + rv(k++) + '>' +
          '<span class="opt-ind">' + ic('check') + '</span>' +
          '<span class="opt-body"><span class="opt-title">' + esc(t('find.urgent.label')) + '</span><span class="opt-hint">' + esc(t('find.urgent.hint')) + '</span></span></button>' +
        catOrder().map(function (c) {
          var on = cs.indexOf(c) !== -1;
          return '<button type="button" class="opt opt-multi f-opt' + (on ? ' is-selected' : '') + '" role="checkbox" aria-checked="' + on + '" data-act="find-toggle" data-value="' + c + '" data-press' + rv(k++) + '>' +
            '<span class="opt-ind">' + ic('check') + '</span>' + SM.ui.catIcon(c, 'sm') +
            '<span class="opt-body"><span class="opt-title">' + esc(catName(c)) + '</span><span class="sr-only">' + esc(catHint(c)) + '</span></span></button>';
        }).join('') + '</div>';
      foot = '<div class="q-foot f-q-foot"><button type="button" class="btn btn-primary btn-lg btn-block f-next' + (cs.length || ret ? ' is-ready' : '') + '" id="f-next" data-act="find-next" data-press>' +
        '<span class="f-next-l">' + esc(concernBtnLabel(cs.length, ret)) + '</span>' + arrow('r') + '</button></div>';
    } else if (q.key === 'area') {
      body = '<div class="f-area-search"' + rv(k++) + '>' + SM.ui.searchField({ id: 'f-area-q', placeholder: t('find.area.search'), label: t('find.area.search') }) + '</div>' +
        '<div class="f-area" role="radiogroup" aria-labelledby="' + titleId + '">' +
        '<p class="f-area-none" id="f-area-none" role="status" hidden>' + esc(t('find.area.none')) + '</p>' + areaOpts(q, a.area) + '</div>';
    } else if (q.key === 'stage') {
      var cur0 = a.stage, lastG = null;
      body = '<div class="f-opts f-opts-grouped" role="radiogroup" aria-labelledby="' + titleId + '">' +
        q.opts.map(function (o) {
          var lab = '';
          if (o.g !== lastG) {
            lab = (lastG ? '</div>' : '') + '<p class="opt-group-label" aria-hidden="true"' + rv(k++) + '>' + esc(t('find.q.g.' + o.g)) + '</p><div class="opts">';
            lastG = o.g;
          }
          return lab + radioOpt(q, o, cur0 === o.v, '', k++);
        }).join('') + '</div></div>';
    } else {
      var cur = q.key === 'path' && U().effPath ? U().effPath(a) : a[q.key];
      body = '<div class="opts f-opts" role="radiogroup" aria-labelledby="' + titleId + '">' +
        qOpts(q).map(function (o) { return radioOpt(q, o, cur === o.v, '', k++); }).join('') + '</div>';
    }
    var skipVal = q.key === 'care' ? 'skip' : '';
    var skipLabel = q.key === 'care' ? { ja: '答えない', en: 'Prefer not to say' } : null;
    var skip = q.key === 'concerns' ? '' :
      '<button type="button" class="opt opt-quiet f-skip" data-act="find-skip" data-key="' + q.key + '" data-value="' + skipVal + '"' +
        ((q.key === 'care' && a.care === 'skip') ? ' aria-pressed="true"' : '') + ' data-press' + rv(k++) + '>' +
        '<span class="opt-body"><span class="opt-title">' + esc(skipLabel ? L(skipLabel) : t('find.q.skip')) + '</span></span>' + '<span class="opt-end">' + arrow('r') + '</span></button>';

    var see = (SM.state.answered || ret) && n < TOTAL && q.key !== 'concerns';
    var nav = '<nav class="f-q-nav" aria-label="' + esc(en() ? 'Questions' : '質問の移動') + '">' +
      (n > 1 ? '<a class="f-q-prev" href="#/find/q/' + (n - 1) + retQ(query) + '">' + arrow('l') + '<span>' + esc(t('find.q.prev')) + '</span></a>' : '<span></span>') +
      (see ? '<a class="f-q-see" href="#/find/results" data-act="find-finish"><span>' + esc(t('find.q.seeResults')) + '</span>' + arrow('r') + '</a>' : '') +
      '</nav>';
    return '<div class="f-q f-q-' + q.key + '" data-n="' + n + '" data-next="' + esc(qNext(n, query)) + '">' + qProgress(n, q, query) + qJourney(n, q) +
      '<div class="f-q-body">' + title + why + body + skip + '</div>' + foot + nav + '</div>';
  }
  function concernBtnLabel(k, ret) {
    if (ret) return t('find.q.toResults');
    return k ? t('find.q.nextN', { n: k }) : t('find.q.skipNext');
  }

  /* after an answer: the app moves on 260ms after the tap so the choice is seen to register; another tap in that
     window moves the selection and restarts the wait (MOTION-SPEC §4 Questions). Reduced motion: 60ms. */
  function leaveTo(hash, delay) {
    if (mem.leaving) return;
    clearTimeout(mem.leaveT);
    var ret = SM.route && SM.route.query && SM.route.query.ret === 'results' && hash === '#/find/results';
    mem.leaveT = setTimeout(function () {
      mem.leaveT = null;
      if (mem.leaving) return;
      mem.leaving = true;
      // back to the results it came from: the back grammar (the results page is where we were)
      SM.go(hash, { transition: ret ? 'back' : 'forward' });
    }, reduced() ? Math.min(200, delay == null ? 200 : delay) : (delay == null ? 260 : delay));
  }
  function markAnsweredIfDone(hash) { if (hash === '#/find/results') { SM.state.answered = true; SM.save(); } }

  function setStage(val) {
    // keep Q2 meaningful when someone moves between 中学生 and older: 進学したい <-> 高校に行きたい
    var a = answers();
    var wasJr = junior();
    SM.setAnswer('stage', val);
    var isJr = junior();
    if (wasJr !== isJr) {
      if (isJr && a.path === 'study') SM.setAnswer('path', 'hs');
      else if (!isJr && a.path === 'hs') SM.setAnswer('path', 'study');
    }
  }
  // the chosen ward cell: its ink block presses in like a hanko, on the same stamp spring as every other marker
  function stampCell(el) {
    anim(el, [{ transform: 'scale(0.86)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { spring: 'stamp', pseudoElement: '::before', key: 'stamp' });
  }

  SM.on('find-answer', function (el) {
    if (mem.leaving) return;
    var key = el.getAttribute('data-key'), val = el.getAttribute('data-value');
    var box = el.closest('.f-q');
    var was = el.getAttribute('aria-checked') === 'true';
    if (box) {
      Array.prototype.forEach.call(box.querySelectorAll('[role="radio"]'), function (b) {
        var on = b === el;
        b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
        b.classList.toggle('is-selected', on);
      });
      // the other options step back (50%, 160ms)
      box.classList.add('has-choice');
      Array.prototype.forEach.call(box.querySelectorAll('.opts, .f-area'), function (g) { g.classList.add('has-choice'); });
    }
    // the marker fills on the stamp spring and the check draws; a ward cell stamps its ink block
    if (!was) { var ind = el.querySelector('.opt-ind'); if (ind) mcall('check', ind); else stampCell(el); }
    if (key === 'stage') setStage(val); else SM.setAnswer(key, val);
    var next = box ? box.getAttribute('data-next') : '#/find/results';
    if (key === 'care') next = '#/find/results';
    markAnsweredIfDone(next);
    // the choice is seen to register (the colour sweeps across the option, the check draws), then the flow moves on
    leaveTo(next, el.classList.contains('f-area-b') ? 300 : 420);
  });
  SM.on('find-skip', function (el) {
    if (mem.leaving) return;
    var key = el.getAttribute('data-key');
    var v = el.getAttribute('data-value') || null;
    if (key === 'stage') setStage(v); else SM.setAnswer(key, v);
    var box = el.closest('.f-q');
    if (box) Array.prototype.forEach.call(box.querySelectorAll('[role="radio"]'), function (b) { b.setAttribute('aria-checked', 'false'); b.classList.remove('is-selected'); });
    var next = key === 'care' ? '#/find/results' : (box ? box.getAttribute('data-next') : '#/find/results');
    markAnsweredIfDone(next);
    leaveTo(next, 200);
  });
  // 次へ（2つ選択中）: the label swaps, the button turns solid with the first choice and its arrow nudges once
  function setNextLabel(n) {
    var btn = document.getElementById('f-next');
    if (!btn) return;
    var ret = SM.route && SM.route.query && SM.route.query.ret === 'results';
    var lab = btn.querySelector('.f-next-l');
    var txt = concernBtnLabel(n, ret);
    var was = btn.classList.contains('is-ready'), ready = n > 0 || !!ret;
    // when the button also changes colour, the labels never overlap and the colour flips in the gap between them
    if (lab) { if (!M() || !M().swapText) lab.textContent = txt; else mcall('swapText', lab, txt, { flip: was !== ready, host: btn }); }
    btn.classList.toggle('is-ready', ready);
    if (!was && n > 0) mcall('nudge', btn.querySelector('.arrow'));
  }
  SM.on('find-toggle', function (el) {
    var c = el.getAttribute('data-value');
    var cs = (answers().concerns || []).slice();
    var i = cs.indexOf(c);
    if (i === -1) cs.push(c); else cs.splice(i, 1);
    SM.setAnswer('concerns', cs);
    el.setAttribute('aria-checked', i === -1 ? 'true' : 'false');
    el.classList.toggle('is-selected', i === -1);
    if (i === -1) mcall('check', el.querySelector('.opt-ind'));
    setNextLabel(cs.length);
  });
  SM.on('find-urgent', function (el) {
    var on = !answers().urgent;
    SM.setAnswer('urgent', on);
    var cs = (answers().concerns || []).slice();
    if (on && cs.indexOf('housing') === -1) {
      cs.unshift('housing'); SM.setAnswer('concerns', cs);
      var hb = document.querySelector('[data-act="find-toggle"][data-value="housing"]');
      if (hb) { hb.setAttribute('aria-checked', 'true'); hb.classList.add('is-selected'); mcall('check', hb.querySelector('.opt-ind')); }
    }
    el.setAttribute('aria-checked', on ? 'true' : 'false');
    el.classList.toggle('is-selected', on);
    if (on) mcall('check', el.querySelector('.opt-ind'));
    setNextLabel(cs.length);
  });
  SM.on('find-next', function (el) {
    var box = el.closest('.f-q');
    var next = box ? box.getAttribute('data-next') : '#/find/results';
    markAnsweredIfDone(next);
    leaveTo(next, 0);
  });
  SM.on('find-finish', function () { SM.state.answered = true; SM.save(); SM.go('#/find/results', { transition: 'forward' }); });

  /* the journey: counter, line and walk (all inside the named groups during q→q, so they play in place) */
  function playJourney(root, n) {
    if (mem.quiet || !animOn()) return;
    var from = mem.fromQ;
    var inst = !!(SM.route && SM.route.instant);
    var mode = from != null && from !== n ? 'step' : (n === 1 && mem.fromOutside ? 'enter' : (inst ? null : 'rise'));
    if (!mode) return;
    var fig = root.querySelector('.f-q-fig'), walk = root.querySelector('.f-q-walk');
    var cur = root.querySelector('.f-q-cur');
    // entering from outside the counter rolls in from blank, never from a 0 that reads as a value (§4.1)
    if (cur && mode !== 'rise') mcall('odometer', cur, String(n), { from: mode === 'step' ? String(from) : '', duration: 420 });
    playLine(root, n, mode === 'step' ? from : null, mode);
    if (!fig) return;
    if (mode === 'rise') {
      anim(fig, [{ opacity: 0, transform: 'translateY(8%)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 200, easing: EASE_STD, fill: 'backwards' });
      anim(walk, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(' + routeW(n).toFixed(4) + ')' }], { duration: 440, delay: 140, easing: EASE_DRAW, fill: 'backwards' });
      return;
    }
    var d = mode === 'step' ? n - from : 1;
    var steps = Math.abs(d);
    var dur = mode === 'enter' ? 760 : Math.min(1080, 660 + (steps - 1) * 210);
    var curve = mode === 'enter' ? WALK_IN : WALK, ease = bez(curve);
    // arriving from another screen the page fades in first: walk in once it is there
    var delay = mode === 'enter' ? 170 : 70;
    // one step on the route = 54 strip units = 112.5% of the figure's own width (48 units)
    var dx = mode === 'enter' ? -160 : -d * 112.5;
    var w0 = mode === 'enter' ? 0 : routeW(from);
    fig.classList.toggle('is-back', d < 0);
    anim(fig, [{ transform: 'translateX(' + dx + '%)' }, { transform: 'none' }], { duration: dur, delay: delay, easing: ease, fill: 'backwards' });
    anim(walk, [{ transform: 'scaleX(' + w0.toFixed(4) + ')' }, { transform: 'scaleX(' + routeW(n).toFixed(4) + ')' }], { duration: dur, delay: delay, easing: ease, fill: 'backwards' });
    walkCycle(root, Math.abs(dx), dur, delay, curve);
  }
  /* the train line: the train leaves its last stop, runs along the rail (the green run grows behind it) and pulls in
     at this question's station with a small settle; each station it passes fills as the train reaches it, and the
     arriving one stamps. From outside (question 1) the stations come up one by one and the train rolls in. */
  function playLine(root, n, from, mode) {
    var run = root.querySelector('.f-q-run'), box = root.querySelector('.f-q-trainbox'), train = root.querySelector('.f-q-train');
    var sts = root.querySelectorAll('.f-q-st');
    if (!run || !box) return;
    var x1 = stX(n), r1 = 'scaleX(' + (x1 / 100).toFixed(4) + ')';
    if (from != null && from !== n) {
      var x0 = stX(from), d = Math.abs(n - from);
      var dur = Math.min(760, 480 + (d - 1) * 120), delay = 80;
      var ease = 'cubic-bezier(0.45, 0, 0.2, 1.04)';   // pulls away, runs, brakes into the stop with a ≈3% settle
      anim(box, [{ transform: 'translateX(' + x0.toFixed(3) + '%)' }, { transform: 'translateX(' + x1.toFixed(3) + '%)' }], { duration: dur, delay: delay, easing: ease, fill: 'backwards', key: 'train' });
      anim(run, [{ transform: 'scaleX(' + (x0 / 100).toFixed(4) + ')' }, { transform: r1 }], { duration: dur, delay: delay, easing: ease, fill: 'backwards', key: 'run' });
      if (train) {
        // the train's number turns over as it leaves (old stop → this one)
        mcall('odometer', train, String(n), { from: String(from), duration: 360, delay: delay });
        anim(train, [{ scale: '1' }, { scale: '1.18', offset: 0.5 }, { scale: '1' }], { duration: 360, delay: delay + dur - 80, easing: 'ease-out', key: 'arrive' });
      }
      // stations between the stops change state as the train passes them (forward: fill; back: empty)
      Array.prototype.forEach.call(sts, function (st) {
        var k = +st.getAttribute('data-st');
        var lo = Math.min(from, n), hi = Math.max(from, n);
        if (k < lo || k > hi) return;
        var tt = delay + dur * Math.abs(k - from) / d;
        anim(st, [{ opacity: 0.35, scale: '0.6' }, { opacity: 1, scale: '1' }], { duration: 260, delay: Math.max(0, tt - 40), spring: 'pop', fill: 'backwards', key: 'st' });
      });
      return;
    }
    if (mode === 'enter' || mode === 'rise') {
      // the line is laid down: stations pop up left to right, then the train rolls in to the first stop
      Array.prototype.forEach.call(sts, function (st, i) {
        anim(st, [{ opacity: 0, scale: '0.2' }, { opacity: 1, scale: '1' }], { spring: 'pop', delay: 120 + i * 50, fill: 'backwards', key: 'st' });
      });
      anim(run, [{ transform: 'scaleX(0)' }, { transform: r1 }], { duration: 520, delay: 160, easing: EASE_DRAW, fill: 'backwards', key: 'run' });
      anim(box, [{ transform: 'translateX(-12%)', opacity: 0 }, { transform: 'translateX(' + x1.toFixed(3) + '%)', opacity: 1 }],
        { duration: 620, delay: 200, easing: 'cubic-bezier(0.2, 0, 0, 1.04)', fill: 'backwards', key: 'train' });
    }
  }
  /* the two walk drawings alternate every quarter stride of distance travelled (not of time), so the feet
     never slide while the walk eases in and out; the last drawing is the passing one, which settles into the pose */
  function walkCycle(root, dist, dur, delay, curve) {
    var mLay = root.querySelector('.f-q-fig-m'), wLay = root.querySelector('.f-q-fig-w'), sLay = root.querySelector('.f-q-fig-s');
    var pLay = root.querySelector('.f-q-fig-p');
    if (!mLay || !wLay || !sLay || !pLay) return;
    var frames = Math.max(2, Math.round(dist / 22)); if (frames % 2) frames++;
    var T = delay + dur, at = function (p) { return (delay + dur * walkTime(curve, p)) / T; };
    var contact = [], passing = [], k;
    for (k = 0; k < frames; k++) {
      var o = k === 0 ? 0 : Math.min(0.999, at(k / frames));
      contact.push({ opacity: k % 2 ? 0 : 1, offset: o, easing: 'steps(1, end)' });
      passing.push({ opacity: k % 2 ? 1 : 0, offset: o, easing: 'steps(1, end)' });
    }
    contact.push({ opacity: 0, offset: 1 }); passing.push({ opacity: 1, offset: 1 });
    anim(wLay, contact, { duration: T, easing: 'linear', fill: 'both' });
    anim(sLay, passing, { duration: T, easing: 'linear', fill: 'both' });
    // the walking pair shows from the start until the figure stops; the pose takes over on the same frame
    anim(mLay, [{ opacity: 1, easing: 'steps(1, end)' }, { opacity: 1, offset: 0.999, easing: 'steps(1, end)' }, { opacity: 0 }], { duration: T, easing: 'linear' });
    anim(pLay, [{ opacity: 0, easing: 'steps(1, end)' }, { opacity: 0, offset: 0.999, easing: 'steps(1, end)' }, { opacity: 1 }], { duration: T, easing: 'linear' });
  }
  // time (0–1) at which the walk's easing curve has covered progress p (the curve inverted by bisection)
  function walkTime(c, p) {
    var x1 = c[0], y1 = c[1], x2 = c[2], y2 = c[3];
    var bz = function (a, b, s) { var u = 1 - s; return 3 * u * u * s * a + 3 * u * s * s * b + s * s * s; };
    var lo = 0, hi = 1;
    for (var i = 0; i < 24; i++) { var mid = (lo + hi) / 2; if (bz(y1, y2, mid) < p) lo = mid; else hi = mid; }
    return bz(x1, x2, (lo + hi) / 2);
  }

  function mountQuestion(root) {
    var box = root.querySelector('.f-q');
    if (!box) return;
    var n = parseInt(box.getAttribute('data-n'), 10) || 1;
    // the q→q names come off when this transition has finished
    if (document.documentElement.classList.contains('f-qq')) {
      var g = qqGen;
      var off = function () { if (g === qqGen) clearQQ(); };
      if (M() && M().afterTransition) mcall('afterTransition', off, { keep: true }); else off();
    }
    playJourney(root, n);
    var group = root.querySelector('[role="radiogroup"]');
    if (!group) return;
    var radios = function () {
      return Array.prototype.filter.call(group.querySelectorAll('[role="radio"]'), function (b) { return !b.hidden && !b.closest('[hidden]'); });
    };
    var setRoving = function () {
      var list = radios();
      var sel = list.filter(function (b) { return b.getAttribute('aria-checked') === 'true'; })[0] || list[0];
      Array.prototype.forEach.call(group.querySelectorAll('[role="radio"]'), function (b) { b.tabIndex = b === sel ? 0 : -1; });
    };
    setRoving();
    group.addEventListener('keydown', function (e) {
      var keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, Home: 'h', End: 'e' };
      if (!(e.key in keys)) return;
      var list = radios();
      var i = list.indexOf(document.activeElement);
      if (i === -1) return;
      e.preventDefault();
      var k = keys[e.key];
      var j = k === 'h' ? 0 : k === 'e' ? list.length - 1 : (i + k + list.length) % list.length;
      list.forEach(function (b, x) { b.tabIndex = x === j ? 0 : -1; });
      list[j].focus();
    });
    // area search
    var input = root.querySelector('#f-area-q');
    if (input) {
      var none = root.querySelector('#f-area-none');
      var filter = function () {
        var term = U().norm(input.value);
        var any = false;
        Array.prototype.forEach.call(group.querySelectorAll('.f-area-group'), function (g) {
          var vis = 0;
          Array.prototype.forEach.call(g.querySelectorAll('[data-hay]'), function (b) {
            var ok = !term || b.getAttribute('data-hay').indexOf(term) !== -1;
            b.hidden = !ok; if (ok) vis++;
          });
          g.hidden = vis === 0; if (vis) any = true;
        });
        var sp = group.querySelector('.f-area-special');
        if (sp) sp.hidden = !!term && any;
        if (none) none.hidden = any || !term;
        setRoving();
      };
      input.addEventListener('input', filter);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var vis = radios().filter(function (b) { return b.hasAttribute('data-hay'); });
          if (vis.length === 1) vis[0].click();
          else if (vis.length) vis[0].focus();
        } else if (e.key === 'ArrowDown') {
          var v = radios(); if (v.length) { e.preventDefault(); v[0].focus(); }
        }
      });
      // bring the chosen area into view once the page has arrived (not inside the transition), but not
      // while walking through the questions: then the scene and the question stay in view
      var sel = group.querySelector('.f-area-b[aria-checked="true"]');
      var walking = mem.fromQ != null && mem.fromQ !== n;
      if (sel && sel.scrollIntoView && !walking && !(SM.route && SM.route.restoreY > 0)) {
        var bring = function () { try { if (sel.isConnected) sel.scrollIntoView({ block: 'center' }); } catch (e) { } };
        if (M() && M().afterTransition) mcall('afterTransition', bring); else setTimeout(bring, 0);
      }
    }
  }
  /* ================================================================== RESULTS
     The arrival (MOTION-SPEC §4 Results): the results-arrive strip draws (the protagonist reaches the house under the
     pin), the count stands on the same ground line and rolls from 0 like a station board (the first time for an
     answer set; after that only when it changed), the sentence rises with its 蛍光ペン, then the three picks and the
     filters arrive in order. Filters re-flow by FLIP and every number on screen rolls to its new value. */
  function applyFilters(rows) {
    var u = U(), area = answers().area, now = new Date();
    return rows.filter(function (r) {
      if (ui.filters.free && !u.isFree(r.p)) return false;
      if (ui.filters.now && !u.nowOpen(r.p, now)) return false;
      if (ui.filters.near && !u.nearby(r.p, area)) return false;
      return true;
    });
  }
  function countWith(rows, key) {
    var save = ui.filters; var f = { free: save.free, now: save.now, near: save.near }; f[key] = true;
    ui.filters = f; var n = applyFilters(rows).length; ui.filters = save; return n;
  }

  function ansCell(r) {
    var lbl = r.set ? r.label : t('find.res.unset');
    return '<li><a class="f-ans' + (r.set ? '' : ' is-unset') + '" href="#/find/q/' + r.q + '?ret=results" aria-label="' +
      esc(t('find.res.k.' + r.key) + '：' + lbl + '（' + t('find.res.change') + '）') + '">' +
      '<span class="f-ans-k">' + esc(t('find.res.k.' + r.key)) + '</span>' +
      '<span class="f-ans-v">' + esc(lbl) + '</span>' +
      '<span class="f-ans-go" aria-hidden="true">' + esc(r.set ? t('find.res.change') : t('find.res.add')) + '</span></a></li>';
  }
  // one ruled row (あなたの答え 高3／働きたい／練馬区 … 変える) that opens the editable list
  function answersBar(delay) {
    var rows = SM.matchSummary(answers());
    var list = '<ul class="f-ans-list" role="list">' + rows.map(ansCell).join('') + '</ul>';
    var set = rows.filter(function (r) { return r.set; });
    var key = set.filter(function (r) { return r.key === 'stage' || r.key === 'path' || r.key === 'area'; });
    if (!key.length) key = set.slice(0, 3);
    var rest = set.length - key.length;
    // each separator travels with the answer AFTER it, and 「ほか2つ」 with the last one, so no line ends on a
    // separator and nothing is orphaned (EN uses a middle dot, never the full-width ／)
    var sep = en() ? '\u00b7' : '／';
    var line = key.map(function (r, i) {
      return '<span class="f-ans-i">' + (i ? '<span class="f-ans-sep" aria-hidden="true">' + sep + '</span>' : '') + esc(r.label) +
        (i === key.length - 1 && rest > 0 ? '<span class="f-ans-more">' + esc(t('find.res.more', { n: rest })) + '</span>' : '') + '</span>';
    }).join(' ');
    return '<details class="disclose f-answers"' + (mem.expanded._answers ? ' open' : '') + R('data-reveal="fade" data-reveal-delay="' + delay + '"') + '>' +
      '<summary class="f-answers-sum"><span class="f-answers-sum-t"><span class="f-answers-title" id="f-ans-h">' + esc(t('find.res.answers')) + '</span>' +
        '<span class="f-answers-line">' + line + '</span></span>' +
        '<span class="f-answers-go">' + esc(t('find.res.change')) + '</span></summary>' +
      list + '</details>';
  }

  function filterBar(rows, delay) {
    return '<div class="f-filters"' + R('data-reveal="fade" data-reveal-delay="' + delay + '"') + '><p class="f-filters-l eyebrow" id="f-filters-l">' + esc(t('find.res.filters')) + '</p>' +
      '<div class="chips-scroll f-filter-chips" role="group" aria-labelledby="f-filters-l">' + ['free', 'now', 'near'].map(function (k) {
        return SM.ui.chip(t('find.f.' + k), { act: 'find-filter', pressed: !!ui.filters[k], count: countWith(rows, k), attrs: 'data-value="' + k + '" id="f-f-' + k + '"' });
      }).join('') + '</div></div>';
  }

  function pickTop(rows) {
    var top = [], used = {};
    var concerns = answers().concerns || [];
    // one per concern first (in the order the user picked them), then by rank
    concerns.forEach(function (c) {
      if (top.length >= 3) return;
      for (var i = 0; i < rows.length; i++) { var r = rows[i]; if (r.group === c && !used[r.p.id] && !r.otherLocal) { top.push(r); used[r.p.id] = 1; break; } }
    });
    for (var i = 0; i < rows.length && top.length < 3; i++) { if (!used[rows[i].p.id] && !rows[i].otherLocal) { top.push(rows[i]); used[rows[i].p.id] = 1; } }
    // keep rank order
    var rank = {}; rows.forEach(function (r, j) { rank[r.p.id] = j; });
    return top.sort(function (x, y) { return rank[x.p.id] - rank[y.p.id]; });
  }

  // the three picks: on a phone only the first is on the first screen, the other two come after the transition
  function topItems(top) {
    var item = function (r, i, attrs) { return '<li class="f-top-item" data-rank="0' + (i + 1) + '"' + attrs + '>' + pcard(r.p, { why: r.why }) + '</li>'; };
    var now = mem.defer && !wide() ? 1 : top.length;
    return top.slice(0, now).map(function (r, i) { return item(r, i, R('data-reveal-delay="440"')); }).join('') +
      lazy(top.slice(now).map(function (r, i) { return item(r, i + now, ' data-reveal="up"'); }).join(''));
  }
  function groupOrder() {
    var cs = (answers().concerns || []).filter(function (c) { return catOrder().indexOf(c) !== -1; });
    return cs.concat(catOrder().filter(function (c) { return cs.indexOf(c) === -1; }));
  }

  function consultPicks(all) {
    var pref = junior() ? ['kodomo-sos', 'childline', 'tokyo-kodomo-net'] : ['tokyo-wakanavi', 'yorisoi', 'b4s-line-soudan'];
    var ids = {}; all.forEach(function (r) { ids[r.p.id] = r; });
    var out = pref.map(function (id) { return ids[id]; }).filter(Boolean);
    if (out.length < 3) all.forEach(function (r) { if (out.length < 3 && (r.p.cat || [])[0] === 'consult' && out.indexOf(r) === -1) out.push(r); });
    return out.slice(0, 3);
  }

  // 64件 standing on the strip's ground line, the protagonist arriving at the house on the right; one headline
  // (あなたに合いそうな支援, its 蛍光ペン drawn after it rises) and one short caveat line
  function resHead(n) {
    return '<header class="f-res-head">' +
      '<div class="f-res-stage" aria-hidden="true">' + ill('results-arrive', { size: 'strip', cls: 'f-res-art' }) +
        '<p class="f-res-count"><b class="f-res-n" id="f-res-n" data-n="' + n + '">' + esc(fmtN(n)) + '</b><span class="unit">' + esc(t('find.res.unit')) + '</span></p></div>' +
      '<h1 class="f-res-title"' + R('data-reveal="line" data-reveal-delay="140"') + '><span class="sr-only">' + esc(t('find.res.srCount', { n: n })) + '</span>' +
        '<mark class="f-mark"><span class="f-mark-ink" aria-hidden="true"></span><span class="f-mark-t">' + esc(t('find.res.h')) + '</span></mark></h1>' +
      '<p class="f-res-sub ui-wrap"' + R('data-reveal="fade" data-reveal-delay="240"') + '>' + esc(t('find.res.sub')) + '</p>' +
      '<p class="sr-only" role="status" id="f-res-status"></p></header>';
  }

  function resHeadUrgent(n) {
    var sub = esc(t('find.res.urgentSub', { n: '\u0000' })).replace('\u0000', '<b class="f-res-n" id="f-res-n" data-n="' + n + '">' + esc(fmtN(n)) + '</b>');
    return '<header class="f-res-head is-urgent">' +
      '<h1 class="f-res-title">' + esc(t('find.res.urgentTitle')) + '</h1>' +
      '<p class="f-res-sub ui-wrap">' + sub + '</p>' +
      '<p class="sr-only" role="status" id="f-res-status"></p></header>';
  }

  function groupHead(g, n, mine) {
    return '<div class="f-group-head" data-flip-key="gh-' + g + '"' + R('data-reveal="up"') + '>' +
      (mem.quiet ? SM.ui.catIcon(g, 'sm') : SM.ui.catIcon(g, 'sm').replace('<span class="cat-icon', '<span data-reveal="mark" data-reveal-delay="120" class="cat-icon')) +
      // the あなたが選んだ tag rides on the title line
      '<div class="f-group-text"><div class="f-group-tl"><h2 class="f-group-title" id="f-gh-' + g + '">' + esc(catName(g)) + '<span class="sr-only">（' + esc(catHint(g)) + '）</span></h2>' +
      (mine ? '<span class="f-mine">' + esc(t('find.group.mine')) + '</span>' : '') + '</div></div>' +
      '<p class="f-group-n">' + rollNum('g-' + g, n, 'f-group-num') + '<span class="unit">' + esc(t('find.res.unit')) + '</span></p>' +
      '<span class="section-rule"' + R('data-reveal="rule"') + ' aria-hidden="true"></span></div>';
  }

  function renderResults() {
    var a = answers();
    var all = SM.match(a);
    var main = all.filter(function (r) { return !r.local; });
    var locals = all.filter(function (r) { return r.local; });
    var rows = applyFilters(main);
    var filtersOn = ui.filters.free || ui.filters.now || ui.filters.near;
    var any = answeredAny();
    var side = [], body = [];

    // 今、住む場所がない: the crisis numbers come first, under a calm headline (before the answers and filters)
    // (two copies, one per layout: under the headline on phones, at the top of the wide column on desktop; CSS shows one)
    if (a.urgent) { side.push(resHeadUrgent(rows.length)); side.push(crisisCard({ id: '-r', cls: 'is-narrow' })); body.push(crisisCard({ id: '-rw', cls: 'is-wide' })); }
    else side.push(resHead(rows.length));
    if (!any) side.push('<div' + R('data-reveal="fade" data-reveal-delay="300"') + '>' + SM.ui.callout(esc(t('find.res.noAnswers')) + '<div class="f-callout-act">' + SM.ui.button(t('find.cta.start'), { href: '#/find/q/1', size: 'sm' }) + '</div>', 'info') + '</div>');
    if (any) side.push(answersBar(300));
    if (a.area === 'other') side.push(SM.ui.callout(esc(t('find.other.note')), 'info'));
    side.push(filterBar(main, 340));

    if (!rows.length) {
      body.push(filtersOn ?
        SM.ui.empty(t('find.empty.filter'), t('find.empty.filterBody'), SM.ui.button(t('find.empty.clear'), { act: 'find-filter-clear', variant: 'secondary' }), { illus: 'results-empty' }) :
        SM.ui.empty(t('find.empty.none'), t('find.empty.noneBody'), SM.ui.button(t('find.cta.change'), { href: '#/find/q/1', variant: 'secondary' }), { illus: 'results-empty' }));
    } else {
      var top = rows.length > 3 ? pickTop(rows) : rows.slice();
      if (a.urgent && U().urgentIds) {
        // "今、住む場所がない": tonight's places come first, even if other answers would hide them
        var byId = {}; all.forEach(function (r) { byId[r.p.id] = r; });
        top = U().urgentIds(a).map(function (id) {
          var r = byId[id], pr = SM.program(id);
          if (!pr) return null;
          return { p: pr, why: [{ ja: '今、いる場所がないと答えたので', jr: '今、家にいられないと答えたので', en: 'You said you have nowhere to stay now' }], group: (r && r.group) || 'housing' };
        }).filter(Boolean).slice(0, 3);
      }
      var topIds = {}; top.forEach(function (r) { topIds[r.p.id] = 1; });
      var rest = rows.filter(function (r) { return !topIds[r.p.id]; });
      var groups = {}; rest.forEach(function (r) { (groups[r.group] = groups[r.group] || []).push(r); });
      var order = groupOrder().filter(function (g) { return groups[g] && groups[g].length; });
      var cs = a.concerns || [];

      // まずはこれ: a full-bleed band, three rows ranked like stations (01 02 03 under the kanji mark)
      body.push('<section class="f-top band" aria-labelledby="f-top-h">' +
        '<div class="f-top-head" data-flip-key="top-head"' + R('data-reveal="up" data-reveal-delay="360"') + '><h2 class="f-top-title" id="f-top-h">' + esc(t('find.top.h')) + '</h2>' +
        '<p class="sr-only">' + esc(t(any ? 'find.top.sub' : 'find.top.subAll')) + '</p></div>' +
        '<ol class="f-top-list" role="list"' + R('data-reveal-stagger="60"') + '>' + topItems(top) + '</ol></section>');

      // the category index: sticky underline tabs with marks and counts; the indicator follows the scroll
      if (order.length > 1) {
        body.push('<nav class="f-jump" aria-label="' + esc(t('find.res.jump')) + '"' + R('data-reveal="fade" data-reveal-delay="480"') + '><div class="seg-tabs f-jump-tabs">' + order.map(function (g) {
          return '<button type="button" class="f-jump-b" data-act="find-jump" data-g="' + g + '">' + SM.ui.catIcon(g, 'xs') +
            '<span class="f-jump-name">' + esc(catName(g)) + '</span>' + rollNum('j-' + g, groups[g].length, 'f-jump-n') + '</button>';
        }).join('') + '<i class="m-indicator f-jump-ind" aria-hidden="true"></i></div></nav>');
      }

      // groups: below the first screen, so they arrive after the transition; each reveals as one block
      var gh = order.map(function (g) {
        var list = groups[g];
        var mine = cs.indexOf(g) !== -1;
        var limit = mine || !cs.length ? 3 : 2;
        var open = !!mem.expanded[g];
        var shown = open ? list : list.slice(0, limit);
        return '<section class="f-group cat-' + g + (mine ? ' is-mine' : '') + '" id="f-g-' + g + '" aria-labelledby="f-gh-' + g + '">' +
          groupHead(g, list.length, mine) +
          (g === 'housing' && !a.urgent ? crisisCard({ id: '-g' }) : '') +
          cards(shown, { dedupWhy: true }) +
          (list.length > limit ? '<button type="button" class="f-more" id="f-more-' + g + '" data-act="find-more" data-g="' + g + '" aria-expanded="' + open + '">' +
            '<span>' + esc(open ? t('find.less') : t('find.more', { n: list.length - limit })) + '</span>' + arrow(open ? 'u' : 'd') + '</button>' : '') +
        '</section>';
      }).join('');
      body.push(lazy(gh));
    }

    var tail = '';
    // local supports when the area is unknown
    if (locals.length && a.area !== 'other') {
      var lrows = applyFilters(locals);
      if (lrows.length) {
        tail += '<details class="disclose f-local"' + (mem.expanded._local ? ' open' : '') + '>' +
          '<summary><span class="f-local-text"><b>' + esc(t('find.local.h')) + '</b>' +
          '<small>' + esc(t('find.local.sub', { n: lrows.length })) + '</small></span></summary>' +
          '<div class="f-local-body">' + SM.ui.button(t('find.local.pick'), { href: '#/find/q/3?ret=results', variant: 'secondary', size: 'sm' }) +
          '<div class="pcards">' + lrows.map(function (r) { return pcard(r.p, { why: r.why, compact: true }); }).join('') + '</div></div></details>';
      }
    }
    // not here + consult links
    var picks = consultPicks(main);
    tail += '<section class="f-nothere" aria-labelledby="f-nh-h"' + R('data-reveal="fade"') + '>' +
      SM.ui.sectionHeader(t('find.notHere.title'), { id: 'f-nh-h', sub: t('find.notHere.body'), reveal: !mem.quiet }) +
      (picks.length ? '<div class="list">' + picks.map(function (r) {
        return SM.ui.listItem({ title: L(r.p.name), subSr: L(r.p.hook) || L(r.p.summary), href: '#/p/' + encodeURIComponent(r.p.id), cat: 'consult', id: r.p.id });
      }).join('') + '</div>' : '') +
      SM.ui.button(t('find.notHere.all'), { href: '#/find/cat/consult', variant: 'text' }) +
    '</section>';
    // privacy
    tail += '<div class="f-private">' +
      '<button type="button" class="f-reset" data-act="find-reset"><span>' + esc(t('find.reset')) + '</span></button></div>';
    body.push(lazy(tail));

    return '<div class="f-res wide-layout"><div class="f-res-side">' + side.join('') + '</div>' +
      '<div class="f-res-main">' + body.join('') + '</div></div>';
  }

  SM.on('find-jr-all', function (el) {
    mem.jrAll = el.getAttribute('data-value') === '1';
    mem.browseShown = 24;
    SM.render();
  });
  function resRerender() {
    mem.rollFrom = snapRolls();
    mem.jumpFrom = snapJump();
    var n = document.getElementById('f-res-n');
    mem.resFrom = n ? parseInt(n.getAttribute('data-n'), 10) : null;
    SM.render();
  }
  SM.on('find-filter', function (el) {
    var k = el.getAttribute('data-value');
    ui.filters[k] = !ui.filters[k]; saveUi();
    reflow(resRerender);
    announceResults();
  });
  SM.on('find-filter-clear', function () {
    ui.filters = { free: false, now: false, near: false }; saveUi();
    reflow(resRerender);
    announceResults();
  });
  /* a11y: the headline number is aria-hidden, so say the new count once the filter re-flow is done */
  var resStatusT = null;
  function announceResults() {
    clearTimeout(resStatusT);
    resStatusT = setTimeout(function () {
      var st = document.getElementById('f-res-status'), n = document.getElementById('f-res-n');
      if (!st || !n) return;
      var num = n.getAttribute('data-n') || String(n.textContent).replace(/[^\d]/g, '');
      st.textContent = en() ? num + ' results' : '結果は' + num + '件です';
    }, 150);
  }
  SM.on('find-more', function (el) {
    var g = el.getAttribute('data-g');
    var open = !mem.expanded[g];
    mem.expanded[g] = open;
    if (open) mem.focusMore = { sel: '#f-g-' + g + ' .pcards > .pcard', idx: document.querySelectorAll('#f-g-' + g + ' .pcards > .pcard').length };
    reflow(resRerender);
    focusMore();
  });
  SM.on('find-jump', function (el) {
    flushLater();
    var g = el.getAttribute('data-g');
    var s = document.getElementById('f-g-' + g);
    if (!s) return;
    var red = reduced();
    var bar = document.querySelector('#view .f-jump');
    var off = 120;
    try { if (bar) off = (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight + 12; } catch (e) { }
    var y = s.getBoundingClientRect().top + window.scrollY - off;
    try { window.scrollTo({ top: y, behavior: red ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, y); }
    var h = s.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) { } }
    setJump(g);
    var mark = s.querySelector('.f-group-head .cat-mark');
    if (mark) setTimeout(function () { pulse(mark); }, red ? 0 : 420);
  });
  SM.on('find-reset', function () {
    SM.state.answers = { stage: null, path: null, area: null, concerns: [], age: null, care: null, urgent: false };
    SM.state.answered = false;
    SM.save();
    if (SM.syncJunior) { try { SM.syncJunior(); } catch (e) { } }
    mem.expanded = {};
    SM.toast(t('find.reset.done'));
    SM.go('#/find/q/1');
  });

  /* jump bar: the tab of the group under the bar is marked, its 2px indicator slides there and the row scrolls
     so the tab stays visible. Rects are read only in the observer and rAF, never while mounting. */
  function snapJump() {
    var ind = document.querySelector('#view .f-jump-ind'), bar = document.querySelector('#view .f-jump-tabs');
    return ind ? { tf: ind.style.transform, on: ind.classList.contains('is-on'), x: bar ? bar.scrollLeft : 0 } : null;
  }
  function setJump(g) {
    var bar = document.querySelector('#view .f-jump-tabs');
    if (!bar) return;
    var on = null;
    Array.prototype.forEach.call(bar.querySelectorAll('.f-jump-b'), function (b) {
      var me = b.getAttribute('data-g') === g;
      if (me) { b.setAttribute('aria-current', 'true'); on = b; } else b.removeAttribute('aria-current');
    });
    var ind = bar.querySelector('.f-jump-ind');
    if (!ind) return;
    ind.classList.toggle('is-on', !!on);
    if (!on) return;
    mcall('indicator', ind, on);
    // keep the tab in view inside the scroller (never scrolls the page)
    window.requestAnimationFrame(function () {
      var l = on.offsetLeft, r = l + on.offsetWidth;
      if (l < bar.scrollLeft + 16 || r > bar.scrollLeft + bar.clientWidth - 16) {
        var x = Math.max(0, l - 24);
        try { bar.scrollTo({ left: x, behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { bar.scrollLeft = x; }
      }
    });
  }
  function wireJump(root) {
    if (mem.spy) { try { mem.spy.disconnect(); } catch (e) { } mem.spy = null; }
    var bar = root.querySelector('.f-jump-tabs');
    var from = mem.jumpFrom; mem.jumpFrom = null;
    if (!bar) return;
    var ind = bar.querySelector('.f-jump-ind');
    if (from && ind) {
      if (from.x) bar.scrollLeft = from.x;
      if (from.tf) { ind.style.transform = from.tf; ind._smPlaced = true; }
      ind.classList.toggle('is-on', from.on);
    }
    var secs = Array.prototype.slice.call(root.querySelectorAll('.f-group'));
    if (!secs.length || typeof IntersectionObserver !== 'function') return;
    var live = {};
    var pick = function () {
      var g = null;
      for (var i = 0; i < secs.length; i++) if (live[secs[i].id]) { g = secs[i].id.slice(4); break; }
      if (g !== mem.jumpOn) { mem.jumpOn = g; setJump(g); }
    };
    mem.jumpOn = undefined;
    // the band just under the sticky bars (top 45% of the screen) decides which group is "here"
    mem.spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) { live[e.target.id] = e.isIntersecting; });
      pick();
    }, { rootMargin: '-150px 0px -55% 0px', threshold: 0 });
    secs.forEach(function (s) { mem.spy.observe(s); });
  }

  /* the "searching" beat (SPEC-v5 Part A 6, ≤ 900ms; first time for an answer set only): over the arrival strip, a
     green line runs through the six category stations (住 金 学 働 手 話); each mark lights and stamps as the line
     reaches it; then the strip clears and the count rolls 0 → N. Built by JS only (no JS: nothing to hide), aria-hidden
     (the count is announced by the heading). Returns when the count should start rolling (ms), 0 when skipped. */
  function scanBeat(root) {
    var stage = root.querySelector('.f-res-stage');
    if (!stage || !animOn() || lite()) return 0;
    var keys = catOrder();
    var box = document.createElement('div');
    box.className = 'f-scan';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<p class="f-scan-l">' + esc(t('find.res.scan')) + '</p><div class="f-scan-rail"><i class="f-scan-run"></i>' +
      keys.map(function (k, i) { return '<span class="f-scan-st" style="left:' + (i / (keys.length - 1) * 100).toFixed(3) + '%">' + SM.ui.catIcon(k, 'xs') + '</span>'; }).join('') + '</div>';
    stage.appendChild(box);
    var RUN = 520, T0 = 140, OUT = 680;
    anim(box.querySelector('.f-scan-run'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: RUN, delay: T0, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'both' });
    Array.prototype.forEach.call(box.querySelectorAll('.f-scan-st'), function (st, i) {
      var at = T0 + RUN * i / (keys.length - 1);
      anim(st, [{ opacity: 0.25, scale: '0.7', filter: 'grayscale(1)' }, { opacity: 1, scale: '1.15', filter: 'grayscale(0)', offset: 0.55 }, { opacity: 1, scale: '1', filter: 'grayscale(0)' }],
        { duration: 300, delay: Math.max(0, at - 60), easing: 'ease-out', fill: 'both' });
    });
    anim(box.querySelector('.f-scan-l'), [{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: 60, fill: 'both' });
    var out = anim(box, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-12px)' }], { duration: 220, delay: OUT, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)', fill: 'both' });
    var gone = function () { if (box.parentNode) box.parentNode.removeChild(box); };
    if (out && out.finished) out.finished.then(gone, gone); else gone();
    setTimeout(gone, 1400);   // never left behind (hidden tab, cancelled animation)
    // the strip's own figure and the rest of the head wait for the beat
    var art = stage.querySelector('.f-res-art');
    if (art) anim(art, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: OUT, fill: 'backwards' });
    Array.prototype.forEach.call(root.querySelectorAll('[data-reveal]'), function (el) {
      if (el.closest('.f-res-stage')) return;
      el.setAttribute('data-reveal-delay', String((parseInt(el.getAttribute('data-reveal-delay'), 10) || 0) + 480));
    });
    return OUT + 20;
  }
  function mountResults(root) {
    var fa = root.querySelector('.f-answers');
    if (fa) fa.addEventListener('toggle', function () { mem.expanded._answers = fa.open; });
    whenFlushed(root, function (r) {
      var d = r.querySelector('.f-local');
      if (d) d.addEventListener('toggle', function () { mem.expanded._local = d.open; });
      wireJump(r);
    });
    // the headline count: in from blank the first time for this answer set (never a '0件' that reads as "nothing
    // for you"), from the last count when it changed (also after a filter), otherwise it simply stands there
    // (back never replays it)
    var nEl = root.querySelector('#f-res-n');
    if (nEl && !answers().urgent) {
      var n = parseInt(nEl.getAttribute('data-n'), 10) || 0;
      var prev = mcall('seen', 'find.res') || null;
      mcall('seen', 'find.res', { sig: answerSig(), n: n });
      var from = null;
      if (mem.quiet) from = mem.resFrom;
      else if (!prev || prev.sig !== answerSig()) from = 0;
      else if (prev.n !== n) from = prev.n;
      mem.resFrom = null;
      if (from != null && isFinite(from) && from !== n && animOn()) {
        // the odometer reserves the final width from the first frame (nothing around the number moves).
        // The first time for an answer set, a short "searching" beat runs first (scanBeat) and the count rolls 0 → N
        // as it clears; otherwise it rolls from the last count at once (≤640ms, §4.1)
        var beat = !mem.quiet && from === 0 && !(SM.route && SM.route.instant) ? scanBeat(root) : 0;
        if (mem.quiet) mcall('odometer', nEl, fmtN(n), { from: fmtN(from), duration: 420 });
        else mcall('odometer', nEl, fmtN(n), { from: from === 0 ? '' : fmtN(from), duration: beat ? 720 : 640, delay: beat });
      }
    }
    playRolls(root);
  }
  /* ================================================================== CATEGORY
     The arrival morph lands in .f-cat-sign (the tapped row's kanji tile flies up and grows); the title line
     rises at +120ms; the topic's scene (cat-<key>) stands on the same ground line as the sign and the title. */
  function hasChat(r) { var c = r.p.contact || {}; return !!(c.line || c.chat); }
  function catHero(key, title, eyebrow, n, intro, o) {
    return '<header class="f-cat-hero cat-' + key + '">' +
      '<div class="f-cat-stage">' +
        '<div class="f-cat-sign">' + SM.ui.catIcon(key, 'xl', { hero: true }) + '</div>' +
        '<div class="f-cat-name">' + (eyebrow ? '<p class="eyebrow f-cat-eyebrow"' + R('data-reveal="fade"') + '>' + esc(eyebrow) + '</p>' : '') +
          '<h1 class="f-h1 f-cat-h1"' + R('data-reveal="line" data-reveal-delay="40"') + '>' + esc(title) + '</h1></div>' +
        '<div class="f-cat-art">' + ill('cat-' + key, { size: 'spot' }) + '</div>' +
      '</div>' +
      '<p class="f-cat-count"' + R('data-reveal="fade" data-reveal-delay="80"') + '><span class="num-xl f-cat-n"><span data-f-count="' + n + '" data-f-seen="find.cat.' + key + '">' + esc(fmtN(n)) + '</span></span>' +
        '<span class="f-cat-unit">' + esc(t('find.cat.unit')) + '</span></p>' +
      // the topic's explanation is one tap away (「くわしく」 opens in place), not a lead paragraph (SPEC-v5 Part B)
      (!intro ? '' : o && o.introOpen ? '<p class="f-cat-intro"' + R('data-reveal="fade" data-reveal-delay="120"') + '>' + esc(intro) + '</p>' :
        '<div class="f-cat-intro"' + R('data-reveal="fade" data-reveal-delay="120"') + '>' +
        (SM.ui.more ? SM.ui.more(null, '<p class="f-cat-intro-t">' + esc(intro) + '</p>', { inline: true, id: 'f-cat-more-' + key }) : '<p>' + esc(intro) + '</p>') + '</div>') +
    '</header>';
  }
  function renderCat(key, query) {
    if (!SM.CATS || !SM.CATS[key]) return renderBrowse();
    var inCat = function (r) { return (r.p.cat || []).indexOf(key) !== -1; };
    var jr = jrFilter();
    // 中学生: the category shows only what is open to them
    var everything = (jr ? SM.match(answers()) : SM.match({ concerns: [] })).filter(inCat);
    // 緊急 → 「話すのがこわいときは」: #/find/cat/consult?chat=1 lists only LINE / chat services
    var chat = key === 'consult' && !!query && query.chat === '1';
    var jrHidden = 0;
    if (jr) {
      var mineIds = {}; everything.forEach(function (r) { mineIds[r.p.id] = 1; });
      SM.match({ concerns: [] }).forEach(function (r) { if (inCat(r) && !mineIds[r.p.id] && !isLocalItem(r) && (!chat || hasChat(r))) jrHidden++; });
    }
    if (chat) return renderChat(everything, jrHidden);
    // one set for the header count, the tabs and the list. With no ward chosen, ward/city
    // items (mostly for people placed by that ward) wait in a closed group below.
    var localSet = [];
    if (!U().isWard(answers().area)) {
      localSet = everything.filter(isLocalItem);
      everything = everything.filter(function (r) { return !isLocalItem(r); });
    } else everything = everything.filter(function (r) { return !otherWard(r); });
    var inEvery = {}; everything.forEach(function (r) { inEvery[r.p.id] = 1; });
    var savedBasis = ui.basis;
    if (ui.basis !== 'all' && !everything.some(function (r) { return r.p.basis === ui.basis; })) ui.basis = 'all';
    var primaryFirst = function (rows) {
      // 中学生: what is made for their stage leads (高校のお金 before 消費生活センター), then the rest
      if (jr) {
        var forJr = function (r) { var st = (r.p.for && r.p.for.stages) || []; return st.indexOf('jhs12') !== -1 || st.indexOf('jhs3') !== -1; };
        return rows.filter(forJr).concat(rows.filter(function (r) { return !forJr(r); }));
      }
      return rows.filter(function (r) { return r.p.cat[0] === key; }).concat(rows.filter(function (r) { return r.p.cat[0] !== key; }));
    };
    var any = SM.state.answered || answeredAny();
    var side = [], list = [];
    side.push(catHero(key, catName(key), '', everything.length, L(INTRO[key])));
    if (key === 'housing') side.push(crisisCard({ id: '-c' }));
    if (key === 'consult') side.push(SM.ui.callout(esc(t('find.cat.sos')), 'info'));

    /* reading order, top to bottom (never a lower block before the one above it): the sign lands (morph), eyebrow
       +0, title +40, count +80, intro +120, the list tools +160, then the list from +200 (mountCat), 40 apart */
    list.push(listTools(everything, 'f-cat', 'f-cat-sort', 160));
    list.push(jrNote(jrHidden, 'cat'));
    var tail = '';
    if (any) {
      var fit = SM.match(answers()).filter(function (r) { return inCat(r) && !r.local && inEvery[r.p.id]; });
      var fitIds = {}; fit.forEach(function (r) { fitIds[r.p.id] = 1; });
      var restRows = everything.filter(function (r) { return !fitIds[r.p.id]; });
      fit = sortRows(basisRows(primaryFirst(fit)), ui.sort);
      restRows = sortRows(basisRows(primaryFirst(restRows)), ui.sort);
      if (fit.length) {
        list.push('<section class="f-cat-sec" aria-labelledby="f-cf-h">' + SM.ui.sectionHeader(t('find.cat.fit'), { id: 'f-cf-h', sub: t('find.n', { n: fit.length }), action: { label: t('find.cta.change'), href: '#/find/q/1' }, reveal: !mem.quiet }) +
          cards(fit, { first: wide() ? 3 : 1 }) + '</section>');
      }
      if (restRows.length) {
        tail += '<section class="f-cat-sec" aria-labelledby="f-cr-h">' + SM.ui.sectionHeader(t('find.cat.rest'), { id: 'f-cr-h', sub: t('find.cat.restSub'), reveal: !mem.quiet }) +
          cards(restRows, { compact: true, noWhy: true }) + '</section>';
      }
      if (!fit.length && !restRows.length) list.push(SM.ui.empty(t('find.none.basis'), '', '', { illus: 'results-empty' }));
      tail += wardHint(everything);
    } else {
      var rows = sortRows(basisRows(primaryFirst(everything)), ui.sort);
      list.push(rows.length ? cards(rows.map(function (r) { return { p: r.p, why: r.local ? r.why : null }; }), { first: wide() ? 3 : 1 }) :
        SM.ui.empty(t('find.none.basis'), '', '', { illus: 'results-empty' }));
      tail += wardHint(everything);
      tail += ctaBlock(true);
    }
    if (localSet.length) {
      tail += '<details class="disclose f-local f-cat-local">' +
        '<summary><span class="f-local-text"><b>' + esc(t('find.cat.localH', { n: localSet.length })) + '</b>' +
        '<small>' + esc(t('find.cat.localSub')) + '</small></span></summary>' +
        '<div class="f-local-body">' + SM.ui.button(t('find.cat.localPick'), { href: '#/find/q/3', variant: 'secondary', size: 'sm' }) +
        '<div class="pcards">' + localSet.map(function (r) { return pcard(r.p, { why: r.why, compact: true }); }).join('') + '</div></div></details>';
    }
    // way-finding: the other topics, as a row of kanji marks (each one morphs into its own page)
    tail += '<nav class="f-cat-others" aria-labelledby="f-co-h"><p class="eyebrow f-co-h" id="f-co-h">' + esc(t('find.cat.others')) + '</p>' +
      '<ul class="f-co-list" role="list">' + catOrder().filter(function (k) { return k !== key; }).map(function (k) {
        return '<li><a class="f-co" href="#/find/cat/' + k + '" data-id="cat:' + k + '" data-press>' + SM.ui.catIcon(k, 'sm', { vt: true }) + '<span>' + esc(catName(k)) + '</span></a></li>';
      }).join('') + '</ul></nav>';
    list.push(lazy(tail));
    ui.basis = savedBasis;
    return '<div class="f-catv wide-layout"><div class="f-cat-side">' + side.join('') + '</div><div class="f-cat-main">' + list.join('') + '</div></div>';
  }
  function renderChat(everything, jrHidden) {
    var rows = everything.filter(function (r) { return hasChat(r) && !otherWard(r); });
    // 中学生: the 24h chat and the children's line first; everyone else: the 24h chat, then by fit
    var pref = junior() ? ['anata-no-ibasho', 'childline'] : ['anata-no-ibasho'];
    var first = pref.map(function (id) { for (var i = 0; i < rows.length; i++) if (rows[i].p.id === id) return rows[i]; return null; }).filter(Boolean);
    rows = first.concat(rows.filter(function (r) { return first.indexOf(r) === -1; }));
    var side = catHero('consult', t('find.chat.h'), catName('consult'), rows.length, t('find.chat.intro'), { introOpen: true });
    var list = jrNote(jrHidden, 'chat') +
      (rows.length ? cards(rows.map(function (r) { return { p: r.p }; }), { first: 3 }) : SM.ui.empty(t('find.none.basis'), '', '', { illus: 'results-empty' })) +
      '<p class="f-chat-all">' + SM.ui.button(t('find.chat.all'), { href: '#/find/cat/consult', variant: 'text' }) + '</p>';
    return '<div class="f-catv wide-layout"><div class="f-cat-side">' + side + '</div><div class="f-cat-main">' + list + '</div></div>';
  }
  function isLocalItem(r) {
    var ar = (r.p.for && r.p.for.areas) || [];
    return r.p.basis === 'local' || (ar.length > 0 && ar.every(U().isWard));
  }
  function mountCat(root) {
    countIn(root, 20);   // the digits are already rolling when the count line (+80) fades in: never a bare 件の支援
    // the list after the header (before the engine's mount: it reads these delays; a scrolled-to reveal ignores them)
    if (!mem.quiet && !(SM.route && SM.route.instant)) {
      Array.prototype.forEach.call(root.querySelectorAll('.f-cat-main > .f-cat-sec, .f-cat-main > .pcards, .f-cat-main > .empty'), function (sec, si) {
        var base = 200 + si * 40;
        // the section's own heading (あなたに合いそう・17件・答えを変える) arrives with its list, never ahead of the
        // header above it (sectionHeader only reveals its rule; the text would stand there from the first frame)
        var sh = sec.hasAttribute('data-reveal') ? null : sec.querySelector(':scope > .section-head');
        if (sh && !sh.hasAttribute('data-reveal')) sh.setAttribute('data-reveal', 'fade');
        Array.prototype.forEach.call(sec.querySelectorAll('[data-reveal]'), function (el) {
          if (!el.hasAttribute('data-reveal-delay')) el.setAttribute('data-reveal-delay', String(base));
        });
        if (sec.hasAttribute('data-reveal') && !sec.hasAttribute('data-reveal-delay')) sec.setAttribute('data-reveal-delay', String(base));
        Array.prototype.forEach.call(sec.matches('[data-reveal-stagger]') ? [sec] : sec.querySelectorAll('[data-reveal-stagger]'), function (g) {
          Array.prototype.forEach.call(g.children, function (c) { if (!c.hasAttribute('data-reveal-delay')) c.setAttribute('data-reveal-delay', String(base + 40)); });
        });
      });
    }
    wireTabs(root);
  }

  /* desktop: a side column stays in view only when all of it fits the screen; it never gets a scroller of its
     own (a nested scroller hid categories with no affordance). Same rule as the tools pages (wireSide). */
  var sideRO = null, sideFit = null;
  function fitSides(root) {
    if (sideRO) { try { sideRO.disconnect(); } catch (e) { } sideRO = null; }
    if (sideFit) { window.removeEventListener('resize', sideFit); sideFit = null; }
    var els = root.querySelectorAll('.f-side-stick, .f-res-side, .f-cat-side');
    if (!els.length || !window.matchMedia) return;
    var mq = window.matchMedia('(min-width: 1100px)');
    // no layout reads on phones, and none inside the page transition's update (MOTION-SPEC §6 rule 2): the
    // ResizeObserver's first callback comes after the frame's own layout; without one, measure in a frame
    var fit = function () {
      Array.prototype.forEach.call(els, function (el) {
        if (!el.isConnected) return;
        if (!mq.matches) { el.classList.remove('is-stick'); return; }
        var h = el.getBoundingClientRect().height;
        el.classList.toggle('is-stick', h + 104 <= (window.innerHeight || 800));
      });
    };
    sideFit = fit;
    window.addEventListener('resize', fit, { passive: true });
    if (window.ResizeObserver) {
      try { sideRO = new ResizeObserver(fit); Array.prototype.forEach.call(els, function (el) { sideRO.observe(el); }); } catch (e) { sideRO = null; }
    }
    if (!sideRO) requestAnimationFrame(fit);
  }

  /* ================================================================== VIEW */
  SM.views.find = {
    tab: 'find',
    title: function (args) {
      args = args || [];
      if (args[0] === 'q') return { ja: 'しつもん', en: 'Questions' };
      if (args[0] === 'results') return { ja: 'あなたに合う支援', en: 'Programs for you' };
      if (args[0] === 'cat' && SM.CATS && SM.CATS[args[1]]) return { ja: SM.CATS[args[1]].ja, en: SM.CATS[args[1]].en };
      return { ja: '支援をさがす', en: 'Find support' };
    },
    back: function (args, query) {
      args = args || [];
      if (args[0] === 'q') {
        if (query && query.ret === 'results') return '#/find/results';
        var n = parseInt(args[1], 10) || 1;
        return n > 1 ? '#/find/q/' + (n - 1) : '#/find';
      }
      if (args[0] === 'results' || args[0] === 'cat') return '#/find';
      return null;
    },
    render: function (args, query) {
      args = args || [];
      clearTimeout(mem.leaveT); mem.leaveT = null;
      mem.leaving = false;
      var hash = (SM.route && SM.route.hash) || location.hash || '';
      var prev = mem.lastHash;
      // the same hash again without a hashchange is an in-place re-render (SM.render), not a navigation
      mem.quiet = !mem.nav && prev === hash;
      mem.nav = false;
      mem.lastHash = hash;
      if (!mem.quiet) {
        later = {}; mem.afterFlush = [];
        if (mem.spy) { try { mem.spy.disconnect(); } catch (e) { } mem.spy = null; }
        mem.rollFrom = null; mem.resFrom = null; mem.jumpFrom = null; mem.tabsFrom = null;
      }
      var kind = SM.route && SM.route.kind;
      mem.defer = !mem.quiet && !!(M() && M().afterTransition) && !((SM.route && SM.route.restoreY) > 0);
      var pm = mem.quiet ? null : QRE.exec(prev || '');
      mem.fromQ = pm ? parseInt(pm[1], 10) : null;
      mem.fromOutside = !mem.quiet && !pm && kind !== 'none';
      var html;
      if (args[0] === 'q') html = renderQuestion(args[1], query || {});
      else if (args[0] === 'results') html = renderResults();
      else if (args[0] === 'cat') html = renderCat(args[1], query || {});
      else html = renderBrowse();
      return html;
    },
    mount: function (root, args) {
      args = args || [];
      if (args[0] === 'q') mountQuestion(root);
      else if (args[0] === 'results') mountResults(root);
      else if (args[0] === 'cat') mountCat(root);
      else mountBrowse(root);
      scheduleLater(root);
      if (args[0] !== 'q') fitSides(root);
    },
    /* q N → q N±1 in place (core's view.swap; MOTION-SPEC §3.5): the chrome, the progress group and the strip stay,
       only the question changes, with no document view transition. The old question leaves where it is (80ms fade,
       32px travel; its strip props fade with it), so the screen moves on the first frame after the 260ms beat
       without any new layout; only then is it replaced, the page scrolls if it must, and the new question arrives
       from the other side (220ms fade, 300ms travel) while the counter rolls, the line grows and the figure walks
       (playJourney). Nothing is cloned or moved, so the swap lays out the new question once and nothing else.
       Returns 'later' and calls o.ready() when the new question is in the DOM (core focuses it then), true when
       it swapped at once (reduced motion), false for anything else (core runs the normal transition). */
    swap: function (root, args, query, o) {
      args = args || []; o = o || {};
      if (args[0] !== 'q' || !root) return false;
      if (mem.swapNow) mem.swapNow();   // a swap still leaving lands first
      var box = root.querySelector('.f-q');
      var pm = QRE.exec(mem.lastHash || '');
      var n = parseInt(args[1], 10);
      if (!box || !pm || !(n >= 1 && n <= TOTAL) || +pm[1] === n || box.parentNode !== root) return false;
      var hash = (SM.route && SM.route.hash) || location.hash || '';
      var from = +pm[1];
      var dir = (o.kind === 'back' || n < from) ? -1 : 1;
      var moving = animOn();
      // the same bookkeeping as render() for a navigation
      clearTimeout(mem.leaveT); mem.leaveT = null;
      mem.leaving = false; mem.quiet = false; mem.nav = false; mem.lastHash = hash;
      later = {}; mem.afterFlush = [];
      if (mem.spy) { try { mem.spy.disconnect(); } catch (e) { } mem.spy = null; }
      mem.rollFrom = null; mem.resFrom = null; mem.jumpFrom = null; mem.tabsFrom = null;
      mem.defer = !!(M() && M().afterTransition);
      mem.fromQ = from; mem.fromOutside = false;
      qqGen++; clearQQ();
      var done = false, arrive = moving;
      var commit = function () {
        if (done) return;
        done = true; mem.swapNow = null;
        if (box.parentNode !== root || mem.lastHash !== hash) return;   // another screen took over meanwhile
        mem.leaving = false;
        var t0 = Date.now(), sy = window.scrollY || 0;   // read before any write: free
        var tpl = document.createElement('template');
        tpl.innerHTML = renderQuestion(args[1], query || {});
        var nb = tpl.content.firstElementChild;
        if (!nb) return;
        root.replaceChild(nb, box);
        if (arrive) {
          // the new question: everything but the progress group and the strip, from the other side
          Array.prototype.forEach.call(nb.children, function (c) {
            if (c.classList.contains('f-q-top') || c.classList.contains('f-q-journey')) return;
            anim(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'cubic-bezier(0, 0, 0.2, 1)', fill: 'backwards', key: 'qin-o' });
            anim(c, [{ translate: (48 * dir) + 'px 0' }, { translate: '0 0' }], { spring: 'rise', key: 'qin-t' });
          });
        } else if (reduced()) {
          // reduced motion: no travel, a short cross-fade (SPEC-v5 Part A)
          Array.prototype.forEach.call(nb.children, function (c) {
            if (c.classList.contains('f-q-top')) return;
            mcall('animate', c, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' });
          });
        }
        mountQuestion(root);
        scheduleLater(root);
        try { if (SM.syncJunior) SM.syncJunior(); } catch (e) { }
        try { if (SM.paintJrBanner) SM.paintJrBanner(root); } catch (e) { }
        try { if (SM.applyRuby) SM.applyRuby(nb); } catch (e) { }
        // back returns mount instantly (§3.8): only the swap itself moves
        if (M() && M().mount) { try { M().mount(nb, { instant: !!o.instant }); } catch (e) { } }
        // every write is done: the scroll and the focus are the only steps that lay out (one style + layout pass)
        var toY = o.kind === 'back' && SM.route && SM.route.restoreY ? SM.route.restoreY : 0;
        if (sy !== toY) { try { window.scrollTo({ top: toY, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, toY); } }
        if (typeof o.ready === 'function') { try { o.ready(); } catch (e) { } }
        if (arrive) { swapCost.push(Date.now() - t0); if (swapCost.length > 3) swapCost.shift(); }
      };
      if (!moving) { commit(); return true; }
      // the old question leaves in place: compositor-only work, so this frame costs no layout (and no inherited
      // property on the box, which would restyle all of it). Its answers are shut by mem.leaving until it is gone.
      mem.leaving = true;
      var last = null;
      Array.prototype.forEach.call(box.children, function (c) {
        if (c.classList.contains('f-q-top') || c.classList.contains('f-q-journey')) return;
        var a = anim(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 80, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)', fill: 'forwards', key: 'qout-o' });
        anim(c, [{ translate: '0 0' }, { translate: (-48 * dir) + 'px 0' }], { duration: 300, easing: EASE_STD, fill: 'forwards', key: 'qout-t' });
        if (a) last = a;
      });
      // the strip keeps its ground line and its walker; its props go with the question and the next strip draws its own
      Array.prototype.forEach.call(box.querySelectorAll('.f-q-strip svg > g:not([data-il="base"])'), function (g) {
        anim(g, [{ opacity: 1 }, { opacity: 0 }], { duration: 80, easing: 'linear', fill: 'forwards', key: 'qout-p' });
      });
      mem.swapNow = function () { arrive = false; commit(); };
      /* when to build the new question: when the fade has run (its exit curve holds the old question near full
         strength until the last frames, so building any earlier would cut it off visibly). On a phone where the
         last builds took long, the build starts sooner, after the leave's first frame, and the fade, which runs
         on the compositor, finishes on its own while the main thread works: build cost c starts c/2 early. */
      var cost = swapCost.length ? Math.min.apply(Math, swapCost) : 0;
      if (cost > 0) {
        var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
        raf(function () { setTimeout(commit, Math.max(0, 80 - cost / 2)); });
      }
      if (last && last.finished) last.finished.then(commit, commit);
      setTimeout(commit, 200);   // in case no frame comes (a hidden tab)
      return 'later';
    },
    // boot.js runs the save sequence (stamp, flight to やること, badge, toast); the row only keeps its state
    onSave: function (id, on) {
      var view = document.getElementById('view');
      if (!view) return;
      Array.prototype.forEach.call(view.querySelectorAll('article.pcard[data-id]'), function (a) {
        if (a.getAttribute('data-id') === id) a.classList.toggle('is-saved', !!on);
      });
    }
  };

  /* ------------------------------------------------------------------ q→q naming (MOTION-SPEC §4 Questions)
     Registered before the router's own hashchange listener (boot.js), so the class is on <html> when the view
     transition captures the old page. Only when both ends are questions, the strip is fully on screen (the
     shared group must not fly in from above) and the transition will be a real view transition. */
  var qqGen = 0;
  var swapCost = [];   // ms the last in-place question swaps took to build (find.swap)
  function clearQQ() { document.documentElement.classList.remove('f-qq', 'f-qq-back'); }
  window.addEventListener('hashchange', function (e) {
    mem.nav = true;
    qqGen++;
    clearQQ();
    var a = QRE.exec((e && e.oldURL) || ''), b = QRE.exec((e && e.newURL) || location.href);
    if (!a || !b || a[1] === b[1]) return;
    if (reduced() || lite() || !document.startViewTransition) return;
    var j = document.querySelector('#view .f-q-journey');
    if (!j) return;
    var r = j.getBoundingClientRect(), h = window.innerHeight || 800;
    if (!r.height || r.top < 0 || r.bottom > h) return;
    document.documentElement.classList.add('f-qq');
    if (+b[1] < +a[1]) document.documentElement.classList.add('f-qq-back');
    var g = qqGen;
    setTimeout(function () { if (g === qqGen) clearQQ(); }, 1600);   // safety: never leave the names on
  });
})();
