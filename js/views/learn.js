/* 巣立ちマップ v4 — js/views/learn.js (owner: LEARN)
 * まなぶ: short money lessons. VISUAL-SPEC §7.9 · MOTION-SPEC §3.4, §3.5, §4.2.
 *   #/learn       list — the learned count (num-xl, rolls when it changed), one segment per lesson, the
 *                 「まずはここから」 band with its cover, a filter, ruled rows with 72px cover thumbs (済 hanko)
 *   #/learn/ID    one lesson, step by step (text / compare / quiz / calc) → finish (learn-done picture, 修了 hanko,
 *                 the learned count rolls, recap, related supports, sources). Finishing marks SM.state.learned.
 * Data: SM.data.lessons, SM.data.learnCalc, SM.data.learnFacts (data/learn.js), SM.data.sim (data/tools.js).
 *
 * Motion (SM.motion only; every moment has a still final state under reduced motion):
 *   cover morph   the tapped row thumb / band cover flies into the lesson's step-1 cover (view transition
 *                 'sm-lesson'; the source is named in a capture-phase click listener, only when the lesson
 *                 will open at step 1, so a named source always has a destination)
 *   steps         in-view shared axis X (old 90ms out, new 220ms fade / 300ms travel from ±24px); the step
 *                 counter rolls, the 2px segments fill, the next button's label swaps
 *   quiz          right: a hand-drawn ○ (maru) round the key letter — the mark on a graded Japanese test; en: the key
 *                 fills and the ✓ draws — then a 正解 seal stamps across the frame's edge (ring), the rest dims.
 *                 wrong: the key turns into a quiet amber ✕; the answer gets its ○ (en: ✓ + underline). No red, no shake,
 *                 and nothing reflows: verdict tags sit on the frame edge, the hint keeps its line.
 *   calculators   results roll (odometer) on discrete changes and follow the finger while a slider is dragged;
 *                 bars settle on the snappy spring
 *   finish        learn-done entrance, 修了 hanko (stamp spring + ring), the segments sweep green, the count rolls
 *   list          rows stagger in; when the count changed since it was last shown it rolls, the new segment
 *                 draws and the finished lesson's 済 hanko stamps
 * Steps change in place (no route change). ← / → keys move between steps. Position per lesson: SM.store('learnPos').
 */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.views = SM.views || {};
  SM.data = SM.data || {};

  /* ------------------------------------------------------------------ helpers */
  function esc(s) { return SM.esc(s); }
  function L(o) { return SM.L(o); }
  function t(k, v) { return SM.t(k, v); }
  function en() { return SM.lang() === 'en'; }
  function junior() { try { return !!(SM.isJunior && SM.isJunior()); } catch (e) { return false; } }
  function ic(n, c) { return typeof SM.icon === 'function' ? SM.icon(n, c) : ''; }
  function M() { return SM.motion || null; }
  /* one switch: SM.motion.reduced() (OS setting, the app setting, html.m-reduce) */
  function reduced() {
    var m = M();
    if (m && typeof m.reduced === 'function') return m.reduced();
    return document.documentElement.classList.contains('m-reduce');
  }
  function lite() { var m = M(); try { return !!(m && m.tier && m.tier() === 'lite'); } catch (e) { return false; } }
  function E(k) { var m = M(); return (m && m.tokens && m.tokens.ease && m.tokens.ease[k]) || 'ease'; }
  function anim(el, kf, o) { var m = M(); return el && m && typeof m.animate === 'function' ? m.animate(el, kf, o) : null; }
  function ruby() { try { return !!(SM.state.settings.ruby && SM.lang() === 'ja'); } catch (e) { return false; } }
  function applyRuby(el) { try { if (el) SM.applyRuby(el); } catch (e) { } }
  function byId(id) { return document.getElementById(id); }
  function each(list, fn) { Array.prototype.forEach.call(list || [], fn); }
  function pad(n) { n = Number(n) || 0; return n < 10 ? '0' + n : String(n); }
  /* 1,234,567 — ja-JP and en-US group the same way. Grouped by hand: toLocaleString(locale) builds a formatter
     per call, and the first one costs ~150ms on a slow phone (it ran inside the step swap and every drag frame). */
  function fmt(n) {
    n = Math.round(Number(n) || 0);
    var neg = n < 0, s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return neg ? '-' + s : s;
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function arrow(d) { return SM.ui && SM.ui.arrow ? SM.ui.arrow(d) : '<span class="arrow" aria-hidden="true">' + (d === 'l' ? '←' : '→') + '</span>'; }
  function inView(el, frac) {
    if (!el || !el.isConnected) return false;
    var r = el.getBoundingClientRect(), vh = window.innerHeight || 800;
    if (!r.height) return false;
    var vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    return vis >= r.height * (frac || 0.5);
  }

  /* SPEC-v5 Part B: one idea per step, ≤60 characters of text on screen (en ≤120: same reading time). Whole
     sentences are kept (never cut mid-sentence); what does not fit waits behind 「くわしく」. data/learn.js is frozen:
     this only chooses what to show first. */
  function budget() { return en() ? 120 : 60; }
  function sentences(text) {
    var out = String(text || '').match(en() ? /[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g : /[^。！？]+[。！？]+[」』）)]*|[^。！？]+$/g);
    return out ? out.map(function (x) { return x; }) : [];
  }
  function clip(text, max) {
    max = max || budget();
    var ss = sentences(text), shown = '', i = 0;
    for (; i < ss.length; i++) {
      if (i > 0 && (shown + ss[i]).trim().length > max) break;
      shown += ss[i];
    }
    return { shown: shown.trim(), rest: ss.slice(i).join('').trim() };
  }
  /* 「くわしく」: the quiet inline disclosure (SM.ui.more, expand in place) */
  function moreHtml(inner, cls) {
    if (!inner) return '';
    if (SM.ui && SM.ui.more) return SM.ui.more(null, inner, { inline: true, cls: 'ln-more-in' + (cls ? ' ' + cls : '') });
    return '<details class="disclose ln-more-in"><summary>' + esc(t('ui.details')) + '</summary>' + inner + '</details>';
  }
  /* a note under a step / calculator: always behind 「くわしく」 */
  function noteMore(text) { return text ? moreHtml('<p class="ln-note">' + esc(text) + '</p>', 'ln-note-more') : ''; }

  /* emphasise digits in a short amount string: 月5万円 → 月<b>5</b>万円 */
  function digits(s, cls) {
    return esc(s).replace(/([0-9０-９][0-9０-９,，.．]*)/g, '<b class="' + (cls || 'ln-dg') + '">$1</b>');
  }
  /* text with the one 蛍光ペン phrase */
  function withMarker(text, mark) {
    text = text || '';
    if (mark) {
      var i = text.indexOf(mark);
      if (i !== -1) return esc(text.slice(0, i)) + '<mark class="marker">' + esc(mark) + '</mark>' + esc(text.slice(i + mark.length));
    }
    return esc(text);
  }
  /* yen with the number in its own element (so it can roll) */
  function yen(n, cls, attrs) {
    var neg = n < 0;
    return '<span class="ln-yen' + (cls ? ' ' + cls : '') + '"' + (attrs || '') + '>' +
      '<span class="ln-sign" aria-hidden="' + (neg ? 'false' : 'true') + '">' + (neg ? '−' : '') + '</span>' +
      (en() ? '<span class="ln-u">¥</span>' : '') + '<b class="ln-n num">' + fmt(Math.abs(n)) + '</b>' +
      (en() ? '' : '<span class="ln-u">円</span>') + '</span>';
  }
  function yenText(n) { return en() ? (n < 0 ? '−¥' : '¥') + fmt(Math.abs(n)) : (n < 0 ? '−' : '') + fmt(Math.abs(n)) + '円'; }

  /* ------------------------------------------------------------------ strings */
  SM.strings({
    'ln.title': { ja: 'まなぶ', en: 'Learn' },
    'ln.h1': { ja: 'お金のきほん', jr: '中学生からの、お金のきほん', en: 'Money basics' },
    'ln.lead': { ja: '申し込む前に知っておきたいことを、クイズと計算でたしかめる。{m}。', jr: '{m}。クイズでたしかめながら学べるよ。', en: '{m} each. Things worth knowing before you apply — check them with quizzes and calculators.' },
    'ln.leadMark': { ja: '1つ2〜3分', en: '2–3 minutes' },
    'ln.doneLabel': { ja: 'おわったレッスン', en: 'lessons done' },
    'ln.filter': { ja: 'だれ向けのレッスンを見るか', en: 'Which lessons to show' },
    'ln.f.all': { ja: 'すべて', en: 'All' },
    'ln.f.jr': { ja: '中学生向け', en: 'Junior high' },
    'ln.f.hs': { ja: '高校生向け', en: 'High school' },
    'ln.g.jr': { ja: '中学生向け', jr: '中学生のみんなへ', en: 'For junior high' },
    'ln.g.jrSub': { ja: '高校に行く前に、知っておきたいこと', jr: '高校に行く前に、知っておこう', en: 'Before high school' },
    'ln.g.all': { ja: 'だれでも', en: 'For everyone' },
    'ln.g.allSub': { ja: '中学生も高校生も、まずはここから', en: 'Start here, whatever your age' },
    'ln.g.hs': { ja: '高校生・巣立つ前に', en: 'High school and before leaving care' },
    'ln.g.hsSub': { ja: 'ひとり暮らしや、働きはじめる前に', en: 'Before living alone or starting work' },
    'ln.first': { ja: 'まずはここから', jr: 'まずはここから', en: 'Start here' },
    'ln.upnext': { ja: 'つぎはこれ', en: 'Up next' },
    'ln.resumeK': { ja: 'とちゅうのレッスン', en: 'In progress' },
    'ln.start': { ja: 'はじめる', en: 'Start' },
    'ln.resume': { ja: 'つづきから', en: 'Continue' },
    'ln.review': { ja: 'もう一度見る', en: 'Review' },
    'ln.allDone': { ja: 'ここにあるレッスンは、全部おわりました。おつかれさま。', jr: 'ぜんぶおわったよ。おつかれさま。', en: 'You have finished every lesson here. Nice work.' },
    'ln.min': { ja: '{n}分', en: '{n} min' },
    'ln.quizN': { ja: 'クイズ{n}問', en: '{n} quiz questions' },
    'ln.home': { ja: 'ホームへ', en: 'Home' },
    'ln.lessonN': { ja: 'レッスン {n}', en: 'Lesson {n}' },
    'ln.doneMark': { ja: '済', en: 'Done' },
    'ln.doneSr': { ja: 'おわった', en: 'done' },
    'ln.at': { ja: '{n} / {total}', en: '{n} / {total}' },
    'ln.atSr': { ja: '{total}ステップ中 {n}まで', en: 'step {n} of {total}' },
    'ln.empty': { ja: 'この中には、レッスンがありません', en: 'No lessons here' },
    'ln.emptyBody': { ja: '「すべて」にすると、全部のレッスンが見られます。', en: 'Choose “All” to see every lesson.' },
    'ln.noData': { ja: 'レッスンを読みこめませんでした', en: 'Lessons could not be loaded' },
    'ln.noDataBody': { ja: 'ページを読みこみなおしてください。', en: 'Please reload the page.' },
    'ln.notFound': { ja: 'このレッスンは見つかりません', en: 'Lesson not found' },
    'ln.notFoundBody': { ja: 'リンクが古いかもしれません。一覧からえらんでください。', en: 'The link may be out of date. Pick one from the list.' },
    'ln.toList': { ja: 'レッスン一覧へ', en: 'All lessons' },

    'ln.progress': { ja: '進みぐあい', en: 'Progress' },
    'ln.prev': { ja: 'もどる', en: 'Back' },
    'ln.next': { ja: 'つぎへ', en: 'Next' },
    'ln.skip': { ja: '答えずに、つぎへ', jr: 'とばして、つぎへ', en: 'Skip' },
    // FIX-B (v6, F33)
    'ln.resume': { ja: '続きから（{n}/{total}）', en: 'Picking up where you left off ({n}/{total})' },
    'ln.resumeStart': { ja: 'はじめから', en: 'Start over' },
    'ln.toEnd': { ja: 'まとめを見る', en: 'See the summary' },
    'ln.keys': { ja: 'キーボードの ← → でも進めます', en: 'You can also use the ← → keys' },
    'ln.k.compare': { ja: 'くらべる', en: 'Compare' },
    'ln.k.quiz': { ja: 'クイズ', en: 'Quiz' },
    'ln.k.calc': { ja: '計算', en: 'Calculator' },
    'ln.quizHint': { ja: 'えらぶと、すぐに答えが出ます。', jr: 'えらぶと、すぐ答えが出るよ。', en: 'Pick one to see the answer.' },
    'ln.optKeys': { ja: 'アイウエオ', en: 'ABCDE' },
    'ln.correct': { ja: '正解', en: 'Correct' },
    'ln.ok': { ja: '正解！', en: 'Correct!' },
    'ln.ng': { ja: 'ここがポイント', en: 'Here’s the key point' },
    'ln.answerIs': { ja: '正解は「{a}」', en: 'The answer: “{a}”' },
    'ln.yours': { ja: 'あなたの答え（ちがいます）', jr: 'あなたの答え（ちがうよ）', en: 'Your answer (not quite)' },
    'ln.answerSr': { ja: '答え：{a}', en: 'Answer: {a}' },
    'ln.tryBody': { ja: 'ほかの答えから、もう一度えらんでみよう。', jr: 'ほかの答えから、もう一回えらんでみよう。', en: 'Pick again from the other answers.' },
    'ln.retry': { ja: 'もう一度えらぶ', en: 'Try again' },
    'ln.reveal': { ja: '答えを見る', en: 'Show the answer' },

    'ln.fin.k': { ja: 'レッスン完了', en: 'Lesson complete' },
    'ln.fin.stamp': { ja: '修了', en: 'DONE' },
    'ln.fin.h': { ja: 'おつかれさま。', jr: 'おつかれさま！', en: 'Nice work.' },
    'ln.fin.score': { ja: 'クイズ {n}問中 {c}問 正解', en: 'Quiz: {c} of {n} correct' },
    'ln.fin.scoreAll': { ja: 'クイズ {n}問中 {c}問 正解。全問正解です。', en: 'Quiz: {c} of {n} correct. Full marks.' },
    'ln.fin.recap': { ja: 'このレッスンのポイント', en: 'Key points' },
    'ln.fin.related': { ja: 'このレッスンに関係する支援', jr: '関係する支援', en: 'Related support' },
    'ln.fin.tip': { ja: 'まちがえたところが、いちばん覚えられるところ。ポイントをもう一度見てみよう。', jr: 'まちがえたところが、いちばん覚えられるところ。ポイントをもう一回見てみよう。', en: 'The ones you missed are the ones you will remember. Have another look at the key points.' },
    'ln.fin.relatedSub': { ja: '気になるものは、右の星のボタンで「やること」に追加できます。', jr: '右の星をおすと、「やること」に入ります。', en: 'Tap the star on the right to add one to your to-do list.' },
    'ln.fin.more': { ja: 'ほかに {n}件', en: '{n} more' },
    'ln.fin.nextK': { ja: 'つぎのレッスン', en: 'Next lesson' },
    'ln.fin.again': { ja: 'はじめから', en: 'Start over' },
    'ln.fin.allDone': { ja: 'これで全部のレッスンがおわりました。', jr: 'これで、ぜんぶおわったよ。', en: 'That was the last lesson.' },
    'ln.src': { ja: '出典', en: 'Sources' },
    'ln.srcChecked': { ja: '{date}に、公式ページで確認しました。', en: 'Checked against official pages on {date}.' },
    'ln.estimate': { ja: '目安', en: 'Estimate' },

    /* calculators */
    'ln.c.modeAria': { ja: '計算のしかた', en: 'How to calculate' },
    'ln.c.modeM': { ja: '毎月の額で', en: 'By monthly payment' },
    'ln.c.modeY': { ja: '返す期間で', en: 'By repayment period' },
    'ln.c.principal': { ja: '借りる額', jr: 'かりる額', en: 'Amount borrowed' },
    'ln.c.rate': { ja: '年利（1年で何%ふえるか）', jr: '1年で何%ふえる？', en: 'Interest rate (per year)' },
    'ln.c.rateHint': { ja: '奨学金（第二種）の上限は年{j}%。法律の上限は年15〜20%。', jr: '奨学金は年{j}%まで。法律で、年15〜20%より高くしてはいけない。', en: 'Student loans (JASSO Type 2) cap at {j}%. The legal cap is 15–20%.' },
    'ln.c.rateChips': { ja: 'よくある年利', en: 'Common rates' },
    'ln.c.monthly': { ja: '毎月返す額', en: 'Monthly payment' },
    'ln.c.years': { ja: '返す期間', en: 'Repayment period' },
    'ln.c.yearsU': { ja: '年', en: 'yr' },
    'ln.c.total': { ja: '返すお金の合計', jr: '全部で返すお金', en: 'Total you repay' },
    'ln.c.borrowed': { ja: '借りた額', jr: 'かりた額', en: 'Borrowed' },
    'ln.c.interest': { ja: '利息', en: 'Interest' },
    'ln.c.times': { ja: '借りた額の {x}倍', jr: 'かりた額の {x}倍', en: '{x}× what you borrowed' },
    'ln.c.months': { ja: '返し終わるまで', jr: '返しおわるまで', en: 'Paid off after' },
    'ln.c.monthsV': { ja: '{n}回', en: '{n} payments' },
    'ln.c.monthsYM': { ja: '約{y}年{m}か月', en: 'about {y} yr {m} mo' },
    'ln.c.monthsY': { ja: '約{y}年', en: 'about {y} yr' },
    'ln.c.monthsM': { ja: '{m}か月', en: '{m} mo' },
    'ln.c.perMonth': { ja: '毎月返す額', en: 'Each month' },
    'ln.c.never': { ja: 'この額だと、毎月の返済が利息（月{i}）より少なく、借金がへりません。返し終わりません。', jr: 'この額だと、利息のほうが大きくて、ずっと返しおわりません。', en: 'At this amount the payment is less than the monthly interest ({i}), so the debt never shrinks.' },
    'ln.c.neverShort': { ja: '返し終わらない', jr: '返しおわらない', en: 'Never paid off' },
    'ln.c.gross': { ja: '額面（月給）', en: 'Gross monthly pay' },
    'ln.c.yearAria': { ja: '働いて何年目か', en: 'Year of work' },
    'ln.c.year1': { ja: '1年目', en: 'Year 1' },
    'ln.c.year2': { ja: '2年目から', en: 'Year 2+' },
    'ln.c.year1Note': { ja: '住民税は、前の年の収入にかかるので、1年目はふつう引かれません。', jr: '住民税は、2年目から引かれます。', en: 'Resident tax is based on last year’s income, so it usually starts in year two.' },
    'ln.c.social': { ja: '会社の社会保険に入っている', jr: '会社の保険に入っている', en: 'On the company’s social insurance' },
    'ln.c.socialSub': { ja: '入っていない人は、国民健康保険と国民年金を自分で払います（この計算には入っていません）。', jr: '入っていない人は、保険と年金を自分ではらいます。', en: 'If not, you pay National Health Insurance and the national pension yourself (not included here).' },
    'ln.c.net': { ja: '手取り（口座に入る額）', jr: '手取り（口座に入るお金）', en: 'Take-home (paid into your account)' },
    'ln.c.netPct': { ja: '額面の約{p}%', en: 'about {p}% of gross' },
    'ln.c.health': { ja: '健康保険・子ども子育て支援金', en: 'Health insurance + child support levy' },
    'ln.c.pension': { ja: '厚生年金', en: 'Employees’ pension' },
    'ln.c.koyo': { ja: '雇用保険', en: 'Employment insurance' },
    'ln.c.incomeTax': { ja: '所得税', en: 'Income tax' },
    'ln.c.residentTax': { ja: '住民税', en: 'Resident tax' },
    'ln.c.socialSum': { ja: '社会保険', en: 'Social insurance' },
    'ln.c.taxSum': { ja: '税金', en: 'Tax' },
    'ln.c.estNote': { ja: '目安です。東京・40歳未満・2026年度の料率で、ざっくり計算しています。本当の金額は給与明細で確かめましょう。', jr: '目安です。本当の金額は、給与明細で見よう。', en: 'An estimate: Tokyo, under 40, FY2026 rates, roughly calculated. Your payslip has the real numbers.' },
    'ln.c.income': { ja: '手取り（1か月）', en: 'Take-home pay (month)' },
    'ln.c.rent': { ja: '家賃', en: 'Rent' },
    'ln.c.place': { ja: '住む場所', en: 'Where you live' },
    'ln.c.otherCosts': { ja: 'ほかの生活費', en: 'Other living costs' },
    'ln.c.spend': { ja: '出ていくお金', en: 'Money going out' },
    'ln.c.left': { ja: '毎月残る', jr: '毎月のこる', en: 'Left each month' },
    'ln.c.short': { ja: '毎月たりない', en: 'Short each month' },
    'ln.c.toSim': { ja: '全部の項目を、自分の数字で計算する', jr: '自分の数字で計算する', en: 'Work it out with all your own numbers' },
    'ln.c.liveInterest': { ja: '返すお金の合計 {v}', en: 'Total you repay {v}' },
    'ln.c.liveNet': { ja: '手取り {v}', en: 'Take-home {v}' },
    'ln.c.liveLeft': { ja: '毎月残る {v}', en: 'Left each month {v}' },
    'ln.c.liveShort': { ja: '毎月たりない {v}', en: 'Short each month {v}' },
    'ln.c.unitYen': { ja: '円', en: '¥' },
    'ln.c.detail': { ja: 'うちわけ', en: 'Breakdown' },
    'ln.c.netShort': { ja: '手取り', en: 'Take-home' },
    'ln.c.leftShort': { ja: '残る', jr: 'のこる', en: 'Left over' },
    'ln.c.shortShort': { ja: 'たりない', en: 'Short' }
  });

  /* ------------------------------------------------------------------ data access */
  function lessons() {
    var list = (SM.data.lessons || []).filter(function (l) { return l && l.id && Array.isArray(l.steps); });
    return list.slice().sort(function (a, b) { return num(a.order, 99) - num(b.order, 99); });
  }
  function lessonById(id) {
    if (SM.lesson) return SM.lesson(id);
    var all = lessons();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return undefined;
  }
  function isDone(id) { return SM.isLearned ? SM.isLearned(id) : ((SM.state.learned || []).indexOf(id) !== -1); }
  function posMap() { var p = SM.store.get('learnPos', {}); return p && typeof p === 'object' ? p : {}; }
  function getPos(id) { var p = posMap()[id]; return typeof p === 'number' && p > 0 ? p : 0; }
  function setPos(id, step) {
    var p = posMap();
    if (step > 0) p[id] = step; else delete p[id];
    SM.store.set('learnPos', p);
  }
  function quizCount(l) { return l.steps.filter(function (s) { return s && s.type === 'quiz'; }).length; }
  /* 中学生 (or the 中学生向け filter): their lessons first. Otherwise the basics for everyone first. */
  function levelOrder(f) { return f === 'jr' || (f !== 'hs' && junior()) ? ['jr', 'all', 'hs'] : ['all', 'hs', 'jr']; }
  function filterOf() {
    var f = SM.store.get('learnFilter', null);
    if (f !== 'all' && f !== 'jr' && f !== 'hs') f = junior() ? 'jr' : 'all';
    return f;
  }
  function inFilter(l, f) {
    if (f === 'all') return true;
    if (f === 'jr') return l.level === 'jr' || l.level === 'all';
    return l.level === 'hs' || l.level === 'all';
  }
  /* lessons in the order the list shows them (groups by level, then order) */
  function ordered(f) {
    var all = lessons(), out = [];
    levelOrder(f).forEach(function (lv) {
      all.forEach(function (l) { if ((l.level || 'all') === lv && (!f || inFilter(l, f))) out.push(l); });
    });
    all.forEach(function (l) { if (out.indexOf(l) === -1 && (!f || inFilter(l, f)) && ['jr', 'all', 'hs'].indexOf(l.level) === -1) out.push(l); });
    return out;
  }
  /* the lesson to suggest: one in progress, else the first not done */
  function suggestion(f) {
    var list = ordered(f);
    for (var i = 0; i < list.length; i++) if (!isDone(list[i].id) && getPos(list[i].id) > 0) return { l: list[i], resume: true };
    for (var j = 0; j < list.length; j++) if (!isDone(list[j].id)) return { l: list[j], resume: false };
    return null;
  }
  function nextAfter(id) {
    var list = ordered(junior() ? 'jr' : null), i, k = -1;
    for (i = 0; i < list.length; i++) if (list[i].id === id) k = i;
    for (i = k + 1; i < list.length; i++) if (!isDone(list[i].id)) return list[i];
    for (i = 0; i < list.length; i++) if (list[i].id !== id && !isDone(list[i].id)) return list[i];
    var all = ordered(null);
    for (i = 0; i < all.length; i++) if (all[i].id !== id && !isDone(all[i].id)) return all[i];
    return null;
  }
  function lessonHref(l) { return '#/learn/' + encodeURIComponent(l.id); }
  /* 中学生 count and number only their lessons (中学生向け + だれでも), in the order listed for them:
     「0 / 12」 with 5 lessons hidden behind the filter could never be finished, and their first lesson read 「11」 */
  function mine() { return junior() ? ordered('jr') : lessons(); }
  function doneCount() { return mine().filter(function (l) { return isDone(l.id); }).length; }
  function numOf(l) {
    if (!junior()) return pad(l.order);
    var i = ordered('jr').indexOf(l);
    return i === -1 ? '' : pad(i + 1);
  }
  function numMeta(l) {
    var n = numOf(l);
    return n ? '<span class="num">' + n + '</span><span class="ln-sep" aria-hidden="true">／</span>' : '';
  }

  /* ------------------------------------------------------------------ covers
     One SVG per lesson (SM.illus 'learn-cover-<id>', artboard 240×160). Drawn with preserveAspectRatio "slice" so
     the 72px square thumb shows the safe square and the 3:2 lesson cover the whole picture: the same picture at
     two crops, which is what lets the thumb travel into the cover (view-transition 'sm-lesson', learn.css). */
  function cover(l, o) {
    o = o || {};
    var name = 'learn-cover-' + l.id;
    if (!SM.illus || (SM.illus.has && !SM.illus.has(name))) return '';
    var h = SM.illus(name, { size: 'fill', animate: o.animate || false, cls: 'ln-cover' });
    if (!h) return '';
    h = h.replace('preserveAspectRatio="xMidYMid meet"', 'preserveAspectRatio="xMidYMid slice"');
    var attrs = (o.vt ? ' data-vt="lesson"' : '') + (o.hero ? ' data-vt-hero="lesson"' : '');
    return attrs ? h.replace('<figure ', '<figure' + attrs + ' ') : h;
  }

  /* ------------------------------------------------------------------ list (#/learn) */
  var listFx = null;      // what the list's mount should play: { from, to, just }
  var listToken = 0;      // bumps when the groups are replaced (filter), so a deferred fill never lands late

  function progressBlock(done, shown, total) {
    var segs = '';
    for (var i = 0; i < total; i++) {
      var on = i < shown;
      segs += '<span class="ln-pseg' + (on ? ' is-done' : '') + '"><i' +
        (on ? ' data-reveal="rule" data-reveal-delay="' + (Math.min(i, 8) * 30) + '"' : '') + '></i></span>';
    }
    return '<section class="ln-sum" aria-label="' + esc(t('ln.progress')) + '">' +
      '<p class="ln-sum-num"><b class="num-xl" id="ln-sum-n">' + shown + '</b><span class="ln-sum-of">/ ' + total + '</span>' +
        '<span class="ln-sum-k">' + esc(t('ln.doneLabel')) + '</span></p>' +
      '<div class="ln-psegs" aria-hidden="true">' + segs + '</div>' +
    '</section>';
  }
  function nextBlock(f) {
    var s = suggestion(f);
    if (!s) {
      return '<section class="ln-feature band is-done" data-reveal>' +
        (SM.illus ? SM.illus('learn-done', { size: 'spot' }) : '') +
        '<p class="ln-feature-k">' + esc(t('ln.allDone')) + '</p></section>';
    }
    var l = s.l, pos = getPos(l.id);
    var anyDone = lessons().some(function (x) { return isDone(x.id); });
    var key = s.resume ? t('ln.resumeK') : (anyDone ? t('ln.upnext') : t('ln.first'));
    var art = cover(l, { vt: true });
    return '<section class="ln-feature band" data-vt-scope data-id="feature:' + esc(l.id) + '" aria-labelledby="ln-feature-h" data-reveal>' +
      '<p class="ln-feature-k">' + esc(key) + '</p>' +
      (art ? '<a class="ln-feature-art" href="' + esc(lessonHref(l)) + '" tabindex="-1" aria-hidden="true">' + art + '</a>' : '') +
      '<div class="ln-feature-main">' +
        '<h2 class="ln-feature-h" id="ln-feature-h">' + esc(L(l.title)) + '</h2>' +
        '<p class="ln-meta"><span class="ln-min num">' + esc(t('ln.min', { n: l.minutes || 2 })) + '</span></p>' +
        (s.resume ? lineHtml(pos, l.steps.length) : '') +
      '</div>' +
      '<a class="btn btn-primary ln-feature-go" href="' + esc(lessonHref(l)) + '" data-press><span>' + esc(s.resume ? t('ln.resume') : t('ln.start')) + '</span>' + arrow() + '</a>' +
    '</section>';
  }
  function lineHtml(pos, total) {
    var p = total ? clamp(pos / total, 0, 1) : 0;
    return '<span class="ln-line"><span class="ln-line-track" aria-hidden="true"><i data-reveal="rule" data-reveal-delay="120" style="--p:' + p.toFixed(3) + '"></i></span>' +
      '<span class="ln-line-n num" aria-hidden="true">' + esc(t('ln.at', { n: pos, total: total })) + '</span>' +
      '<span class="sr-only">' + esc(t('ln.atSr', { n: pos, total: total })) + '</span></span>';
  }
  function doneMark(pre) {
    return '<span class="ln-done' + (pre ? ' is-pre' : '') + '" data-noruby>' +
      (en() ? ic('check') : '<span aria-hidden="true">' + esc(t('ln.doneMark')) + '</span>') +
      '<span class="sr-only">' + esc(t('ln.doneSr')) + '</span></span>';
  }
  function rowHtml(l, just) {
    var done = isDone(l.id), pos = getPos(l.id), q = quizCount(l);
    void q;
    var meta = '<span class="ln-min num">' + esc(t('ln.min', { n: l.minutes || 2 })) + '</span>';
    var art = cover(l, { vt: true });
    return '<li class="ln-li" data-flip-key="' + esc(l.id) + '" data-id="' + esc(l.id) + '">' +
      '<a class="ln-row' + (done ? ' is-done' : '') + (pos && !done ? ' is-going' : '') + '" href="' + esc(lessonHref(l)) + '" data-press="ink">' +
        '<span class="ln-thumb' + (art ? '' : ' is-blank') + '">' + (art || SM.ui.catIcon(l.cat || 'money', 'lg')) +
          (done ? doneMark(just === l.id && !reduced()) : '') + '</span>' +
        '<span class="ln-row-body">' +
          '<h3 class="ln-row-title">' + esc(L(l.title)) + '</h3>' +
          '<span class="ln-meta">' + meta + '</span>' +
          (pos && !done ? lineHtml(pos, l.steps.length) : '') +
        '</span>' +
        '<span class="ln-row-go">' + arrow() + '</span>' +
      '</a></li>';
  }
  /* one html string per level group, in the order shown */
  function groupList(f, o) {
    o = o || {};
    var all = lessons(), n = 0, out = [];
    // the lesson in the 「つぎはこれ」 band is not listed again beside it (one picture, one place)
    var feat = suggestion(f), skip = feat ? feat.l.id : null;
    levelOrder(f).forEach(function (lv) {
      var items = all.filter(function (l) { return (l.level || 'all') === lv && inFilter(l, f) && l.id !== skip; });
      if (!items.length) return;
      n++;
      out.push('<section class="ln-group' + (items.length === 1 ? ' is-single' : '') + (o.cvFrom && n > o.cvFrom ? ' cv' : '') + '" data-flip-key="g-' + lv + '" aria-labelledby="ln-g-' + lv + '">' +
        SM.ui.sectionHeader(t('ln.g.' + lv), { id: 'ln-g-' + lv, num: n }) +
        '<ul class="ln-rows" data-reveal-stagger="40">' + items.map(function (l) { return rowHtml(l, o.just); }).join('') + '</ul></section>');
    });
    return out;
  }
  function emptyGroups() {
    return SM.ui.empty(t('ln.empty'), t('ln.emptyBody'), '', { illus: 'results-empty' });
  }
  function filterHtml(f) {
    return SM.ui.seg([
      { label: t('ln.f.all'), value: 'all', pressed: f === 'all' },
      { label: t('ln.f.jr'), value: 'jr', pressed: f === 'jr' },
      { label: t('ln.f.hs'), value: 'hs', pressed: f === 'hs' }
    ], { act: 'ln-filter', label: t('ln.filter') });
  }
  function renderList() {
    var all = lessons();
    if (!all.length) return SM.ui.empty(t('ln.noData'), t('ln.noDataBody'), SM.ui.button(t('ln.home'), { href: '#/', variant: 'secondary' }), { illus: 'not-found' });
    var f = filterOf();
    var view = byId('view');
    var inPlace = !!(view && view.querySelector('.ln-index'));
    var route = SM.route || {};
    var m = M();
    // the learned count: rolls from what was last shown (MOTION-SPEC §4.2)
    var total = mine().length, done = doneCount();
    var prev = m && m.seen ? m.seen('ln-done') : undefined;
    var shown = !inPlace && typeof prev === 'number' && prev >= 0 && prev < done && !reduced() ? prev : done;
    var just = !inPlace && S.justDone && isDone(S.justDone) ? S.justDone : null;
    listFx = { from: shown, to: done, just: just, inPlace: inPlace };
    // the groups below the first screen render after the transition (VT update budget): all of them in one
    // column (the band fills the first screen), from the second one in the 4 / 8 split. Not when a back
    // navigation has a scroll position to restore (it must land on real rows), nor in an in-place re-render.
    var defer = !inPlace && !(route.restoreY > 0);
    var split = (window.innerWidth || 0) >= 1100;
    var nowN = defer ? (split ? 1 : 0) : 99;
    var groups = groupList(f, { just: just, cvFrom: defer ? 1 : 0 });
    var first = groups.length ? groups.slice(0, nowN).join('') : emptyGroups();
    var later = defer && groups.length > nowN ? '<div class="ln-later" id="ln-later"></div>' : '';
    listFx.rest = later ? groups.slice(nowN) : null;
    return '<div class="ln-index wide-layout">' +
      '<div class="ln-aside">' +
        '<header class="ln-top">' +
          '<p class="eyebrow">' + esc(t('ln.title')) + '</p>' +
          '<h1 class="ln-h1" data-reveal="line">' + esc(t('ln.h1')) + '</h1>' +
        '</header>' +
        progressBlock(done, shown, total) +
        '<div id="ln-feature">' + nextBlock(f) + '</div>' +
      '</div>' +
      '<div class="ln-main">' +
        '<div class="ln-filter">' + filterHtml(f) + '</div>' +
        '<div class="ln-groups" id="ln-groups">' + first + later + '</div>' +
      '</div>' +
    '</div>';
  }
  function mountList() {
    var fx = listFx; listFx = null;
    var m = M();
    if (!fx || !m) return;
    if (m.seen) m.seen('ln-done', fx.to);
    S.justDone = null;
    var token = ++listToken;
    if (fx.rest && fx.rest.length && m.afterTransition) {
      m.afterTransition(function () {
        var box = byId('ln-later');
        if (token !== listToken || !box) return;
        box.innerHTML = fx.rest.join('');
        applyRuby(box);
        try { m.mount(box); } catch (e) { }
      });
    }
    if (fx.from === fx.to && !fx.just) return;
    if (!m.afterTransition) return;
    m.afterTransition(function () {
      var n = byId('ln-sum-n');
      if (!n) return;
      var steps = [];
      if (fx.from < fx.to) {
        steps.push({ at: 0, run: function () {
          var segs = document.querySelectorAll('#view .ln-pseg');
          for (var i = fx.from; i < fx.to && i < segs.length; i++) {
            segs[i].classList.add('is-done');
            anim(segs[i].firstElementChild, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
              { duration: 440, delay: (i - fx.from) * 60, easing: E('draw'), fill: 'backwards' });
          }
        } });
        steps.push({ at: 120, run: function () { if (m.odometer) m.odometer(n, String(fx.to), { from: String(fx.from), duration: 560 }); } });
      }
      if (fx.just) {
        steps.push({ at: 220, run: function () {
          var hk = document.querySelector('#view .ln-li[data-id="' + String(fx.just).replace(/"/g, '') + '"] .ln-done');
          if (!hk) return;
          var show = inView(hk, 1);
          hk.classList.remove('is-pre');
          if (show && m.stamp) m.stamp(hk);
        } });
      }
      if (m.sequence) m.sequence(steps).play();
      // failsafe: nothing stays hidden if a step never ran
      setTimeout(function () { each(document.querySelectorAll('#view .ln-done.is-pre'), function (x) { x.classList.remove('is-pre'); }); }, 1600);
    });
  }

  SM.on('ln-filter', function (el) {
    var v = el.getAttribute('data-value');
    if (v !== 'all' && v !== 'jr' && v !== 'hs') return;
    SM.store.set('learnFilter', v);
    var seg = el.parentNode;
    each(seg.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b === el ? 'true' : 'false'); });
    var box = byId('ln-groups');
    if (!box) { SM.render(); return; }
    listToken++;
    var swap = function () {
      var g = groupList(v);
      box.innerHTML = g.length ? g.join('') : emptyGroups();
      var feat = byId('ln-feature');
      if (feat) feat.innerHTML = nextBlock(v);
      applyRuby(box); if (feat) applyRuby(feat);
    };
    var m = M();
    if (m && typeof m.flip === 'function') m.flip(box, swap, { selector: '.ln-li' });
    else swap();
    if (m && typeof m.mount === 'function') m.mount(box.parentNode.parentNode);
  });

  /* the cover morph's source: named before SM.go runs (capture phase), and only when the lesson will open
     at step 1 — the step-1 cover is the only destination (data-vt-hero="lesson"). Works for any link to a
     lesson whose row / card holds the cover: this list, the band, and the home shelf. */
  document.addEventListener('click', function (ev) {
    if (ev.defaultPrevented || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var tg = ev.target;
    var a = tg && tg.closest ? tg.closest('a[href^="#/learn/"]') : null;
    var m = M();
    if (!a || !m || typeof m.shared !== 'function') return;
    var id = '';
    try { id = decodeURIComponent((a.getAttribute('href') || '').slice(8).split(/[?#\/]/)[0]); } catch (e) { return; }
    var l = id ? lessonById(id) : null;
    if (!l || startStep(l) !== 0) return;
    var scope = a.closest('[data-vt-scope], article, li') || a;
    var src = scope.querySelector('[data-vt~="lesson"]') || scope.querySelector('.il[data-il-name="learn-cover-' + id.replace(/"/g, '') + '"]');
    if (src) m.shared('lesson', src);
  }, true);

  /* ------------------------------------------------------------------ lesson state */
  var S = fresh(null);
  // answers[idx] = the final choice (shown with the answer); tried[idx] = wrong picks before that (one more try)
  function fresh(id) { return { id: id, step: 0, answers: {}, tried: {}, calc: {}, rolled: {}, inPlace: false, justDone: S && S.justDone || null }; }

  /* the step a visit to l opens at (mirrors enter(); no side effects) */
  function startStep(l) {
    var total = l.steps.length, view = byId('view');
    var a = view ? view.querySelector('.ln-lesson') : null;
    var onScreen = !!(a && a.getAttribute('data-id') === l.id);
    if (S.id !== l.id) { var p = getPos(l.id); return p >= total ? 0 : p; }
    if (!onScreen && S.step >= total) return 0;
    return S.step >= 0 && S.step <= total ? S.step : 0;
  }
  /* Called from render(). If the same lesson is already on screen this is an in-place re-render
     (settings changed) → keep everything. Otherwise it is a fresh visit → resume the stored step,
     or start over when the lesson was finished. */
  function enter(l) {
    var main = byId('view');
    var onScreen = false;
    if (main) {
      var a = main.querySelector('.ln-lesson');
      onScreen = !!(a && a.getAttribute('data-id') === l.id);
    }
    var total = l.steps.length;
    if (S.id !== l.id) {
      S = fresh(l.id);
      S.step = getPos(l.id);
      if (S.step >= total) S.step = 0;
      S.resumed = S.step;   // FIX-B (F33): a half-read lesson says that it resumes, and offers the start
    } else if (!onScreen && S.step >= total) {
      S = fresh(l.id);
    }
    if (!(S.step >= 0 && S.step <= total)) S.step = 0;
    S.inPlace = onScreen;
  }

  /* ------------------------------------------------------------------ steps */
  function kindLabel(k) {
    if (k === 'quiz') return '<p class="ln-kind ln-kind-quiz"><span class="ln-kind-mark" aria-hidden="true" data-noruby>' + (en() ? 'Q' : '問') + '</span><span>' + esc(t('ln.k.quiz')) + '</span></p>';
    if (k === 'compare') return '<p class="ln-kind">' + esc(t('ln.k.compare')) + '</p>';
    if (k === 'calc') return '<p class="ln-kind">' + esc(t('ln.k.calc')) + '</p>';
    return '';
  }
  function head(text, fallback) {
    var h = L(text) || fallback || '';
    return '<h2 class="ln-step-h" id="ln-sh" tabindex="-1">' + esc(h) + '</h2>';
  }

  function textStep(s, l) {
    var body = L(s);
    var mark = s.mark ? L(s.mark) : '';
    var big = '';
    if (s.big) {
      big = '<div class="ln-big">' +
        (s.big.label ? '<p class="ln-big-k">' + esc(L(s.big.label)) + '</p>' : '') +
        '<p class="ln-big-v">' + digits(L(s.big)) + '</p></div>';
    }
    var c = clip(body);
    return head(s.head, L(l.title)) + big + '<p class="ln-text">' + withMarker(c.shown, mark) + '</p>' +
      (c.rest ? moreHtml('<p class="ln-text ln-text-rest">' + withMarker(c.rest, c.shown.indexOf(mark) === -1 ? mark : '') + '</p>') : '');
  }

  function side(x, which) {
    if (!x) return '<div class="ln-side"></div>';
    var tone = x.tone === 'free' ? 'free' : x.tone === 'loan' ? 'loan' : 'neutral';
    var pts = (x.points || []).map(function (p) { return '<li>' + esc(L(p)) + '</li>'; }).join('');
    return '<div class="ln-side tone-' + tone + '">' +
      '<span class="ln-side-rule" aria-hidden="true" data-reveal="rule" data-reveal-delay="' + (which === 'l' ? 100 : 190) + '"></span>' +
      '<h3 class="ln-side-t">' + esc(L(x.title)) + '</h3>' +
      (x.big ? '<p class="ln-side-big">' + digits(L(x.big)) + '</p>' : '') +
      (x.body ? '<p class="ln-side-body">' + esc(L(x.body)) + '</p>' : '') +
    '</div>';
  }
  function compareStep(s) {
    var pts = function (x) {
      if (!x || !(x.points || []).length) return '';
      return '<div class="ln-cmp-pts"><p class="ln-cmp-pts-h">' + esc(L(x.title)) + '</p><ul class="bullets">' +
        x.points.map(function (p) { return '<li>' + esc(L(p)) + '</li>'; }).join('') + '</ul></div>';
    };
    var extra = pts(s.left) + pts(s.right) + (s.note ? '<p class="ln-note">' + esc(L(s.note)) + '</p>' : '');
    return kindLabel('compare') + head(s.head, t('ln.k.compare')) +
      '<div class="ln-cmp" data-reveal-stagger="90">' + side(s.left, 'l') + side(s.right, 'r') + '</div>' +
      (extra ? moreHtml('<div class="ln-cmp-more">' + extra + '</div>') : '');
  }

  function cleanWhy(s) { return String(s || '').replace(/^\s*(そのとおり|正解|Right|Correct|Yes)[。．.!！、,]?\s*/, ''); }
  function optKey(i) {
    var keys = t('ln.optKeys');
    return keys.charAt(i) || String(i + 1);
  }
  /* the key's check: its own path so it can draw left to right (both strokes run rightwards, so a clip reveal
     reads as the pen moving) */
  var CHECK_SVG = '<svg class="icon ln-key-ck" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" ' +
    'stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false"><path d="m4.5 12.5 5 5 10-11"/></svg>';
  /* Japanese answer sheets mark a right answer with ○ (a ✓ can read as "wrong" to a 中学生), so in Japanese the
     answer's key gets a hand-drawn maru: one pen stroke from the top, counter-clockwise, a little past where it
     began. pathLength=1, so it draws with a dash offset and no measuring. English keeps the ✓. */
  var MARU_SVG = '<svg class="ln-key-maru" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path pathLength="1" d="' +
    'M17.3 9.3C16.3 9.9 12.9 11.6 11.3 13.2C9.6 14.9 8.2 17 7.4 19.1C6.6 21.3 6.2 23.7 6.4 26C6.5 28.2 7.2 30.6 8.4 32.6' +
    'C9.5 34.6 11.2 36.5 13 37.9C14.9 39.3 17.3 40.4 19.6 40.9C22 41.5 24.6 41.6 27 41.2C29.4 40.8 31.9 39.8 34 38.5' +
    'C36 37.3 37.9 35.4 39.3 33.5C40.6 31.5 41.6 29.1 42 26.8C42.4 24.5 42.3 22 41.7 19.7C41.1 17.4 39.8 15.1 38.3 13.3' +
    'C36.8 11.5 34.6 9.9 32.4 8.8C30.2 7.7 27.6 7 25 6.9C22.5 6.8 19.8 7.2 17.4 8C15 8.8 11.8 11.3 10.7 12"/></svg>';
  function maruHtml() { return en() ? '' : MARU_SVG; }
  /* put the maru into an answer key; draw it (pen stroke, --ease-draw) unless calm */
  function drawMaru(keyEl, delay, calm) {
    if (!keyEl || en()) return;
    if (!keyEl.querySelector('.ln-key-maru')) keyEl.insertAdjacentHTML('beforeend', MARU_SVG);
    var p = keyEl.querySelector('.ln-key-maru path');
    if (p && !calm) anim(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 340, delay: delay || 0, easing: E('draw'), fill: 'backwards', key: 'maru' });
  }
  function stampHtml() { return '<span class="ln-stamp" data-noruby><span class="ln-stamp-in">' + esc(t('ln.correct')) + '</span></span>'; }
  function ansLabel() { return '<span class="ln-ans-l">' + esc(t('ln.correct')) + '</span>'; }
  function yoursHtml() { return '<span class="ln-yours">' + esc(t('ln.yours')) + '</span>'; }
  function quizStep(s, idx) {
    var ans = S.answers[idx];
    var answered = typeof ans === 'number';
    var tried = (!answered && S.tried && S.tried[idx]) || [];
    var rightPick = answered && s.options[ans] && s.options[ans].correct;
    var opts = (s.options || []).map(function (o, i) {
      var cls = 'ln-opt';
      var res = '';
      var off = answered;
      var under = false;
      if (!answered && tried.indexOf(i) !== -1) {
        cls += ' is-chosen is-wrong is-tried'; off = true;
        res = yoursHtml();
      }
      if (answered) {
        if (o.correct) {
          cls += ' is-correct';
          res = rightPick ? stampHtml() : ansLabel();
          under = !rightPick && en();
        }
        if (i === ans) cls += ' is-chosen' + (o.correct ? '' : ' is-wrong');
        if (i === ans && !o.correct) res = yoursHtml();
        if (!o.correct && i !== ans) cls += ' is-dim';
      }
      return '<button type="button" class="' + cls + '" data-act="ln-answer" data-i="' + i + '" aria-pressed="' + (answered && i === ans ? 'true' : 'false') + '"' +
        (off ? ' aria-disabled="true"' : '') + ' data-press>' +
        '<span class="ln-opt-key" aria-hidden="true" data-noruby><span class="ln-key-l">' + esc(optKey(i)) + '</span>' + CHECK_SVG + '<span class="ln-key-x"></span>' +
          (answered && o.correct ? maruHtml() : '') + '</span>' +
        '<span class="ln-opt-t"><span class="ln-opt-tw">' + esc(L(o)) + (under ? '<span class="ln-opt-u" aria-hidden="true"></span>' : '') + '</span></span>' +
        '<span class="ln-opt-res">' + res + '</span>' +
      '</button>';
    }).join('');
    return kindLabel('quiz') +
      '<h2 class="ln-step-h ln-q" id="ln-sh" tabindex="-1">' + esc(L(s.q)) + '</h2>' +

      '<div class="ln-opts' + (answered ? ' is-answered' : '') + '" role="group" aria-labelledby="ln-sh"' + (answered || lite() ? '' : ' data-reveal-stagger="40"') + '>' + opts + '</div>' +
      '<div class="ln-fb" id="ln-fb" aria-live="polite">' + (answered ? feedbackHtml(s, ans) : tried.length ? retryHtml(s, tried[tried.length - 1]) : '') + '</div>';
  }
  /* a wrong pick while a real choice is still left: say why, and let them choose again (answer not shown yet) */
  function retryHtml(s, i) {
    var o = (s.options || [])[i];
    if (!o) return '';
    var w = clip(L(o.why));
    return '<div class="ln-fb-box is-ng"><p class="ln-fb-h">' + esc(t('ln.ng')) + '</p>' +
      (w.shown ? '<p>' + esc(w.shown) + '</p>' : '') + (w.rest ? moreHtml('<p>' + esc(w.rest) + '</p>') : '') +
      '<div class="btn-row ln-fb-acts">' +
        '<button type="button" class="btn btn-ink btn-sm" data-act="ln-retry" data-press><span>' + esc(t('ln.retry')) + '</span></button>' +
        '<button type="button" class="btn btn-text btn-sm" data-act="ln-reveal"><span>' + esc(t('ln.reveal')) + '</span></button>' +
      '</div></div>';
  }
  function feedbackHtml(s, ans) {
    var o = (s.options || [])[ans];
    if (!o) return '';
    if (o.correct) {
      var cw = clip(cleanWhy(L(o.why)));
      return '<div class="ln-fb-box is-ok"><p class="ln-fb-h">' + esc(t('ln.ok')) + '</p>' + (cw.shown ? '<p>' + esc(cw.shown) + '</p>' : '') +
        (cw.rest ? moreHtml('<p>' + esc(cw.rest) + '</p>') : '') + '</div>';
    }
    var c = null;
    (s.options || []).forEach(function (x) { if (x.correct) c = x; });
    // the answer first (big), its reason in one line; why the pick was off waits behind 「くわしく」
    var aw = c && c.why ? clip(cleanWhy(L(c.why))) : { shown: '', rest: '' };
    var later = (aw.rest ? '<p>' + esc(aw.rest) + '</p>' : '') + (o.why ? '<p>' + esc(L(o.why)) + '</p>' : '');
    return '<div class="ln-fb-box is-ng"><p class="ln-fb-h">' + esc(t('ln.ng')) + '</p>' +
      (c ? '<p class="ln-fb-a">' + esc(t('ln.answerIs', { a: L(c) })) + '</p>' : '') +
      (aw.shown ? '<p>' + esc(aw.shown) + '</p>' : '') + moreHtml(later) +
    '</div>';
  }

  /* ---------- calculators ---------- */
  function calcState(s, idx) {
    if (S.calc[idx]) return S.calc[idx];
    var i = s.init || {}, st;
    if (s.kind === 'interest') {
      st = { mode: 'm', principal: num(i.principal, 300000), rate: num(i.rate, 18), monthly: num(i.monthly, 5000), years: num(i.years, 3) };
    } else if (s.kind === 'takehome') {
      st = { gross: num(i.gross, 200000), social: i.social !== false, year: Number(i.year) === 2 ? 2 : 1 };
    } else {
      var sim = SM.data.sim || {}, presets = sim.presets || {};
      var key = presets[i.preset] ? i.preset : (sim.defaultPreset || Object.keys(presets)[0] || '');
      st = { income: num(i.income, (sim.defaults || {}).income || 150000), preset: key, rent: num((presets[key] || {}).rent, 70000) };
    }
    S.calc[idx] = st;
    return st;
  }
  var RANGES = {
    principal: { min: 10000, max: 1000000, step: 10000 },
    rate: { min: 0, max: 20, step: 0.5 },
    monthly: { min: 1000, max: 50000, step: 1000 },
    years: { min: 1, max: 10, step: 1 },
    gross: { min: 50000, max: 500000, step: 5000 },
    income: { min: 30000, max: 400000, step: 5000 },
    rent: { min: 0, max: 150000, step: 1000 }
  };
  function field(idx, k, label, val, unit, hint) {
    var r = RANGES[k], id = 'ln-f' + idx + '-' + k;
    var isYen = k !== 'rate' && k !== 'years';
    var shown = k === 'rate' ? String(val) : fmt(val);
    var pre = isYen && en() ? '<span class="ln-u">¥</span>' : '';
    var post = isYen ? (en() ? '' : '<span class="ln-u">円</span>') : '<span class="ln-u">' + esc(unit) + '</span>';
    var p = clamp((val - r.min) / (r.max - r.min), 0, 1);
    return '<div class="ln-field ln-field-' + k + '">' +
      '<div class="ln-field-top"><label class="ln-field-l" for="' + id + '">' + esc(label) + '</label>' +
        '<span class="ln-field-in">' + pre + '<input class="input num" type="text" inputmode="' + (k === 'rate' ? 'decimal' : 'numeric') + '" id="' + id + '" value="' + esc(shown) + '" autocomplete="off" data-act="ln-num" data-k="' + k + '" data-idx="' + idx + '">' + post + '</span></div>' +
      '<div class="ln-slider"><span class="ln-slider-track" aria-hidden="true"><i id="' + id + '-f" style="transform:scaleX(' + p.toFixed(4) + ')"></i></span>' +
        '<input class="ln-range" type="range" id="' + id + '-r" min="' + r.min + '" max="' + r.max + '" step="' + r.step + '" value="' + val + '" data-act="ln-range" data-k="' + k + '" data-idx="' + idx + '" aria-label="' + esc(label) + '"' +
        (k === 'rate' ? ' aria-valuetext="' + esc(val + '%') + '"' : '') + '></div>' +
      (hint ? '<p class="help">' + esc(hint) + '</p>' : '') +
    '</div>';
  }
  function bar(segs, idx, id) {
    /* segs: [{c: 'action'|'ink'|..., x, w}] fractions of the bar width; transform-only */
    return '<div class="ln-bar" id="' + id + '" aria-hidden="true" data-reveal="rule">' + segs.map(function (g, i) {
      return '<i class="ln-bar-seg c-' + g.c + '" data-seg="' + i + '" style="transform:translateX(' + (g.x * 100).toFixed(3) + '%) scaleX(' + Math.max(0, g.w).toFixed(4) + ')"></i>';
    }).join('') + '</div>';
  }
  function setBar(id, segs) {
    var el = byId(id);
    if (!el) return;
    segs.forEach(function (g, i) {
      var s = el.querySelector('[data-seg="' + i + '"]');
      if (!s) return;
      s.className = 'ln-bar-seg c-' + g.c;
      s.style.transform = 'translateX(' + (g.x * 100).toFixed(3) + '%) scaleX(' + Math.max(0, g.w).toFixed(4) + ')';
    });
  }
  /* breakdown row (ruled) and the colour key under the bar */
  function legend(c, label, valueHtml, cls) {
    return '<div class="ln-kv' + (cls ? ' ' + cls : '') + '"><dt>' + esc(label) + '</dt><dd>' + valueHtml + '</dd></div>';
  }
  function key(items) {
    return '<p class="ln-key" aria-hidden="true">' + items.map(function (x) {
      return '<span' + (x.o ? ' data-o="' + x.o + '"' : '') + '><i class="ln-sw c-' + x.c + '"></i>' + esc(x.label) + '</span>';
    }).join('') + '</p>';
  }
  /* the calculator "display": label + 目安, one big number, a line, a bar, the colour key. Sticky while you adjust. */
  function display(idx, cls, labelHtml, bigHtml, subHtml, barHtml, keyHtml, extra) {
    return '<div class="ln-out' + (cls ? ' ' + cls : '') + '" id="ln-out' + idx + '">' +
      '<p class="ln-out-k">' + labelHtml + '<span class="ln-est">' + esc(t('ln.estimate')) + '</span></p>' +
      bigHtml + (subHtml || '') + barHtml + keyHtml + (extra || '') +
    '</div>';
  }
  function detail(rows) {
    return '<div class="ln-detail"><p class="ln-detail-k">' + esc(t('ln.c.detail')) + '</p><dl class="ln-kvs">' + rows + '</dl></div>';
  }
  function calcOpen(kind, idx) { return '<div class="ln-calc" id="ln-calc' + idx + '" data-kind="' + kind + '" data-idx="' + idx + '">'; }
  function calcClose(idx) { return '<p class="sr-only" aria-live="polite" id="ln-live' + idx + '"></p></div>'; }

  /* interest */
  function amort(P, rate, years) {
    var n = Math.max(1, Math.round(years * 12)), r = rate / 100 / 12;
    var A = r > 0 ? P * r / (1 - Math.pow(1 + r, -n)) : P / n;
    A = Math.ceil(A);
    return { monthly: A, months: n, total: A * n, interest: A * n - P };
  }
  function interestCalc(st) {
    var C = SM.data.learnCalc;
    if (st.mode === 'y') {
      var a = amort(st.principal, st.rate, st.years);
      return { never: false, months: a.months, total: a.total, interest: Math.max(0, a.interest), monthly: a.monthly, first: Math.round(st.principal * st.rate / 1200) };
    }
    var r = C && C.interest ? C.interest({ principal: st.principal, rate: st.rate, monthly: st.monthly }) :
      { months: 0, total: 0, interest: 0, firstInterest: 0, never: false };
    return { never: r.never, months: r.months, total: r.total, interest: r.interest, monthly: st.monthly, first: r.firstInterest };
  }
  function monthsText(n) {
    var y = Math.floor(n / 12), m = n % 12;
    if (!y) return t('ln.c.monthsM', { m: m });
    if (!m) return t('ln.c.monthsY', { y: y });
    return t('ln.c.monthsYM', { y: y, m: m });
  }
  function interestSegs(st, r) {
    if (r.never) return [{ c: 'ink', x: 0, w: 0.25 }, { c: 'amber', x: 0.25, w: 0.75 }];
    var T = Math.max(1, r.total), pw = clamp(st.principal / T, 0, 1);
    return [{ c: 'ink', x: 0, w: pw }, { c: 'amber', x: pw, w: 1 - pw }];
  }
  function timesText(st, r) {
    return t('ln.c.times', { x: (Math.round((st.principal ? r.total / st.principal : 0) * 10) / 10).toFixed(1) });
  }
  function monthsHtml(r) {
    return r.never ? esc(t('ln.c.neverShort')) : '<b class="num">' + esc(t('ln.c.monthsV', { n: r.months })) + '</b><small>' + esc(monthsText(r.months)) + '</small>';
  }
  function interestCalcHtml(s, idx) {
    var st = calcState(s, idx), r = interestCalc(st);
    var facts = SM.data.learnFacts || {};
    var jcap = facts.jassoType2Cap ? facts.jassoType2Cap.rate : 3;
    var chips = [0, jcap, 15, 18, 20].filter(function (v, i, a) { return a.indexOf(v) === i; }).map(function (v) {
      return '<button type="button" class="chip ln-rchip" data-act="ln-rate" data-v="' + v + '" data-idx="' + idx + '" aria-pressed="' + (Number(st.rate) === v ? 'true' : 'false') + '">' + esc(v + '%') + '</button>';
    }).join('');
    return calcOpen('interest', idx) +
      SM.ui.seg([{ label: t('ln.c.modeM'), value: 'm', pressed: st.mode !== 'y' }, { label: t('ln.c.modeY'), value: 'y', pressed: st.mode === 'y' }],
        { act: 'ln-mode', label: t('ln.c.modeAria') }).replace(/data-act="ln-mode"/g, 'data-act="ln-mode" data-idx="' + idx + '"') +
      display(idx, r.never ? 'is-never' : '',
        '<span class="ln-out-kt">' + esc(t('ln.c.total')) + '</span>',
        '<p class="ln-out-big" data-o="total">' + (r.never ? '<span class="ln-out-never">' + esc(t('ln.c.neverShort')) + '</span>' : yen(r.total)) + '</p>',
        '<p class="ln-out-sub" data-o="times"' + (r.never ? ' hidden' : '') + '>' + esc(timesText(st, r)) + '</p>',
        bar(interestSegs(st, r), idx, 'ln-bar' + idx),
        key([{ c: 'ink', label: t('ln.c.borrowed') }, { c: 'amber', label: t('ln.c.interest') }]),
        '<p class="ln-warn" data-o="never"' + (r.never ? '' : ' hidden') + '>' + esc(t('ln.c.never', { i: yenText(r.first) })) + '</p>') +
      '<div class="ln-fields">' +
        field(idx, 'principal', t('ln.c.principal'), st.principal) +
        field(idx, 'rate', t('ln.c.rate'), st.rate, '%', t('ln.c.rateHint', { j: jcap })) +
        '<div class="chips ln-rchips" role="group" aria-label="' + esc(t('ln.c.rateChips')) + '">' + chips + '</div>' +
        (st.mode === 'y' ? field(idx, 'years', t('ln.c.years'), st.years, t('ln.c.yearsU')) : field(idx, 'monthly', t('ln.c.monthly'), st.monthly)) +
      '</div>' +
      detail(
        legend('ink', t('ln.c.borrowed'), yen(st.principal), 'k-borrowed') +
        legend('amber', t('ln.c.interest'), r.never ? '—' : yen(r.interest), 'k-interest') +
        (st.mode === 'y' ? legend('none', t('ln.c.perMonth'), yen(r.monthly), 'k-month') : legend('none', t('ln.c.months'), monthsHtml(r), 'k-months')) +
        legend('none', t('ln.c.total'), r.never ? '—' : yen(r.total), 'k-total is-total')) +
      noteMore(s.note ? L(s.note) : '') +
    calcClose(idx);
  }

  /* take-home */
  function takeCalc(st) {
    var C = SM.data.learnCalc;
    return C && C.takehome ? C.takehome(st.gross, { social: st.social, year: st.year }) :
      { gross: st.gross, health: 0, pension: 0, koyo: 0, social: 0, incomeTax: 0, residentTax: 0, net: st.gross };
  }
  function takeSegs(r) {
    var g = Math.max(1, r.gross), n = clamp(r.net / g, 0, 1), so = clamp(r.social / g, 0, 1), tx = clamp((r.incomeTax + r.residentTax) / g, 0, 1);
    return [{ c: 'action', x: 0, w: n }, { c: 'ink', x: n, w: so }, { c: 'blue', x: n + so, w: tx }];
  }
  function takeCalcHtml(s, idx) {
    var st = calcState(s, idx), r = takeCalc(st);
    var pct = r.gross ? Math.round(r.net / r.gross * 100) : 0;
    return calcOpen('takehome', idx) +
      display(idx, '',
        '<span class="ln-out-kt">' + esc(t('ln.c.net')) + '</span>',
        '<p class="ln-out-big" data-o="net">' + yen(r.net) + '</p>',
        '<p class="ln-out-sub" data-o="pct">' + esc(t('ln.c.netPct', { p: pct })) + '</p>',
        bar(takeSegs(r), idx, 'ln-bar' + idx),
        key([{ c: 'action', label: t('ln.c.netShort') }, { c: 'ink', label: t('ln.c.socialSum') }, { c: 'blue', label: t('ln.c.taxSum') }])) +
      '<div class="ln-fields">' +
        field(idx, 'gross', t('ln.c.gross'), st.gross) +
        '<div class="ln-field ln-field-seg"><p class="ln-field-l" id="ln-yl' + idx + '">' + esc(t('ln.c.yearAria')) + '</p>' +
          SM.ui.seg([{ label: t('ln.c.year1'), value: '1', pressed: st.year !== 2 }, { label: t('ln.c.year2'), value: '2', pressed: st.year === 2 }], { act: 'ln-year' })
            .replace('role="group"', 'role="group" aria-labelledby="ln-yl' + idx + '"').replace(/data-act="ln-year"/g, 'data-act="ln-year" data-idx="' + idx + '"') +
          '<p class="help" data-o="y1note"' + (st.year === 2 ? ' hidden' : '') + '>' + esc(t('ln.c.year1Note')) + '</p></div>' +
        SM.ui.switchRow(t('ln.c.social'), { sub: t('ln.c.socialSub'), checked: st.social, act: 'ln-social', id: 'ln-soc' + idx, attrs: 'data-idx="' + idx + '"' }) +
      '</div>' +
      detail(
        legend('none', t('ln.c.gross'), yen(r.gross), 'k-gross') +
        legend('ink', t('ln.c.health'), '−' + yen(r.health), 'k-health') +
        legend('ink', t('ln.c.pension'), '−' + yen(r.pension), 'k-pension') +
        legend('ink', t('ln.c.koyo'), '−' + yen(r.koyo), 'k-koyo') +
        legend('blue', t('ln.c.incomeTax'), '−' + yen(r.incomeTax), 'k-incomeTax') +
        legend('blue', t('ln.c.residentTax'), '−' + yen(r.residentTax), 'k-residentTax') +
        legend('action', t('ln.c.net'), yen(r.net), 'k-net is-total')) +
      noteMore(s.note ? L(s.note) : t('ln.c.estNote')) +
    calcClose(idx);
  }

  /* budget */
  function budgetCalc(st) {
    var C = SM.data.learnCalc;
    var b = C && C.budget ? C.budget({ income: st.income, preset: st.preset }) : { income: st.income, items: [], total: 0, left: st.income };
    var items = b.items.map(function (x) { return { k: x.k, label: x.label, value: x.k === 'rent' ? st.rent : x.value }; });
    var total = items.reduce(function (a, x) { return a + x.value; }, 0);
    var rent = st.rent;
    return { income: st.income, items: items, rent: rent, other: total - rent, total: total, left: st.income - total };
  }
  function budgetSegs(r) {
    var scale = Math.max(1, r.income, r.total);
    var rw = r.rent / scale, ow = r.other / scale;
    var segs = [{ c: 'housing', x: 0, w: rw }, { c: 'ink', x: rw, w: ow }];
    if (r.left >= 0) segs.push({ c: 'action', x: rw + ow, w: r.left / scale });
    else segs.push({ c: 'amber', x: r.income / scale, w: -r.left / scale });
    return segs;
  }
  function budgetCalcHtml(s, idx) {
    var st = calcState(s, idx), r = budgetCalc(st);
    var sim = SM.data.sim || {}, presets = sim.presets || {};
    var pk = Object.keys(presets);
    var segHtml = pk.length > 1 ? '<div class="ln-field ln-field-seg"><p class="ln-field-l" id="ln-pl' + idx + '">' + esc(t('ln.c.place')) + '</p>' +
      SM.ui.seg(pk.map(function (k) { return { label: L(presets[k].label), value: k, pressed: st.preset === k }; }), { act: 'ln-preset' })
        .replace('role="group"', 'role="group" aria-labelledby="ln-pl' + idx + '"').replace(/data-act="ln-preset"/g, 'data-act="ln-preset" data-idx="' + idx + '"') + '</div>' : '';
    var rows = r.items.map(function (x) { return legend('none', L(x.label), yen(x.value), 'k-' + x.k); }).join('');
    var neg = r.left < 0;
    return calcOpen('budget', idx) +
      display(idx, neg ? 'is-short' : '',
        '<span class="ln-out-kt" data-o="leftK">' + esc(neg ? t('ln.c.short') : t('ln.c.left')) + '</span>',
        '<p class="ln-out-big" data-o="left">' + yen(Math.abs(r.left)) + '</p>', '',
        bar(budgetSegs(r), idx, 'ln-bar' + idx),
        key([{ c: 'housing', label: t('ln.c.rent') }, { c: 'ink', label: t('ln.c.otherCosts') },
          { c: neg ? 'amber' : 'action', label: neg ? t('ln.c.shortShort') : t('ln.c.leftShort'), o: 'leftKey' }])) +
      '<div class="ln-fields">' +
        segHtml +
        field(idx, 'income', t('ln.c.income'), st.income) +
        field(idx, 'rent', t('ln.c.rent'), st.rent) +
      '</div>' +
      detail(legend('none', t('ln.c.income'), yen(r.income), 'k-income') + rows + legend('none', t('ln.c.spend'), yen(r.total), 'k-total is-total')) +
      noteMore(s.note ? L(s.note) : '') +
      '<a class="ln-sim-link btn btn-text" href="#/tools/money" data-press><span>' + esc(t('ln.c.toSim')) + '</span>' + arrow() + '</a>' +
    calcClose(idx);
  }

  function calcStep(s, idx) {
    var inner = s.kind === 'interest' ? interestCalcHtml(s, idx) : s.kind === 'takehome' ? takeCalcHtml(s, idx) : budgetCalcHtml(s, idx);
    return kindLabel('calc') + head(s.head, t('ln.k.calc')) + inner;
  }

  /* ---------- live updates (no re-render: keeps focus while dragging / typing) ----------
     roll: the number rolls (odometer). While a slider is being dragged everything follows the finger. */
  var drag = { on: false, n: 0, idx: -1 };
  function live() { return drag.on && drag.n >= 2; }
  function countTo(holder, n, roll) {
    if (!holder) return;
    var b = holder.querySelector('.ln-n'), sign = holder.querySelector('.ln-sign');
    if (sign) { sign.textContent = n < 0 ? '−' : ''; sign.setAttribute('aria-hidden', n < 0 ? 'false' : 'true'); }
    if (!b) return;
    var txt = fmt(Math.abs(Math.round(n)));
    var m = M();
    if (m && typeof m.odometer === 'function') m.odometer(b, txt, { instant: !roll || live(), duration: 480 });
    else b.textContent = txt;
  }
  function setYenIn(root, sel, n, roll) {
    var el = root.querySelector(sel);
    if (!el) return;
    var y = el.querySelector('.ln-yen');
    if (!y) { el.innerHTML = yen(n); return; }
    countTo(y, n, roll);
  }
  function setText(el, text) {
    if (!el) return;
    if (el.textContent === text) return;
    el.textContent = text;
    applyRuby(el);
  }
  function setHtml(el, html) {
    if (!el) return;
    el.innerHTML = html;
    applyRuby(el);
  }
  var liveT = {};
  function announce(idx, text) {
    clearTimeout(liveT[idx]);
    liveT[idx] = setTimeout(function () {
      var el = byId('ln-live' + idx);
      if (el) el.textContent = text;
    }, 700);
  }
  function updateCalc(idx) {
    var l = lessonById(S.id);
    if (!l) return;
    var s = l.steps[idx], st = S.calc[idx];
    var root = byId('ln-calc' + idx), out = byId('ln-out' + idx);
    if (!s || !st || !root || !out) return;
    root.classList.toggle('is-live', live());
    if (s.kind === 'interest') {
      var r = interestCalc(st);
      out.classList.toggle('is-never', !!r.never);
      var big = out.querySelector('[data-o="total"]');
      if (r.never) { if (!big.querySelector('.ln-out-never')) { setHtml(big, '<span class="ln-out-never">' + esc(t('ln.c.neverShort')) + '</span>'); pop(big.firstElementChild); } }
      else if (!big.querySelector('.ln-yen')) { big.innerHTML = yen(r.total); pop(big.firstElementChild); }
      else countTo(big.querySelector('.ln-yen'), r.total, true);
      var tm = out.querySelector('[data-o="times"]');
      tm.hidden = !!r.never;
      setText(tm, timesText(st, r));
      var w = out.querySelector('[data-o="never"]');
      if (w.hidden === !!r.never) { w.hidden = !r.never; if (r.never) pop(w); }
      setText(w, t('ln.c.never', { i: yenText(r.first) }));
      setYenIn(root, '.k-borrowed dd', st.principal);
      ['interest', 'total'].forEach(function (k) {
        var dd = root.querySelector('.k-' + k + ' dd');
        if (!dd) return;
        if (r.never) dd.textContent = '—';
        else if (!dd.querySelector('.ln-yen')) dd.innerHTML = yen(r[k]);
        else countTo(dd.querySelector('.ln-yen'), r[k], k === 'total');
      });
      if (st.mode === 'y') setYenIn(root, '.k-month dd', r.monthly);
      else setHtml(root.querySelector('.k-months dd'), monthsHtml(r));
      setBar('ln-bar' + idx, interestSegs(st, r));
      announce(idx, r.never ? t('ln.c.neverShort') : t('ln.c.liveInterest', { v: yenText(r.total) }));
    } else if (s.kind === 'takehome') {
      var k = takeCalc(st);
      setYenIn(out, '[data-o="net"]', k.net, true);
      setText(out.querySelector('[data-o="pct"]'), t('ln.c.netPct', { p: k.gross ? Math.round(k.net / k.gross * 100) : 0 }));
      ['gross', 'health', 'pension', 'koyo', 'incomeTax', 'residentTax', 'net'].forEach(function (key) { setYenIn(root, '.k-' + key + ' dd', k[key], key === 'net'); });
      setBar('ln-bar' + idx, takeSegs(k));
      var y1 = root.querySelector('[data-o="y1note"]');
      if (y1) y1.hidden = st.year === 2;
      announce(idx, t('ln.c.liveNet', { v: yenText(k.net) }));
    } else {
      var b = budgetCalc(st);
      var neg = b.left < 0;
      var flipped = out.classList.contains('is-short') !== neg;
      out.classList.toggle('is-short', neg);
      var lk = out.querySelector('[data-o="leftK"]');
      if (flipped && lk && !ruby()) { var m = M(); if (m && m.swapText) m.swapText(lk, neg ? t('ln.c.short') : t('ln.c.left')); else setText(lk, neg ? t('ln.c.short') : t('ln.c.left')); }
      else setText(lk, neg ? t('ln.c.short') : t('ln.c.left'));
      var lkey = out.querySelector('[data-o="leftKey"]');
      if (lkey) setHtml(lkey, '<i class="ln-sw c-' + (neg ? 'amber' : 'action') + '"></i>' + esc(neg ? t('ln.c.shortShort') : t('ln.c.leftShort')));
      setYenIn(out, '[data-o="left"]', Math.abs(b.left), true);
      setYenIn(root, '.k-income dd', b.income);
      b.items.forEach(function (x) { setYenIn(root, '.k-' + x.k + ' dd', x.value); });
      setYenIn(root, '.k-total dd', b.total, true);
      setBar('ln-bar' + idx, budgetSegs(b));
      announce(idx, neg ? t('ln.c.liveShort', { v: yenText(-b.left) }) : t('ln.c.liveLeft', { v: yenText(b.left) }));
    }
  }
  /* a state change inside the display (返し終わらない, the warning) arrives on the stamp spring, small */
  function pop(el) {
    if (!el || live()) return;
    anim(el, [{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: 240, easing: E('standard'), key: 'pop' });
  }
  function syncField(idx, k, v, from) {
    var id = 'ln-f' + idx + '-' + k, r = RANGES[k];
    var inp = byId(id), rg = byId(id + '-r'), fill = byId(id + '-f');
    if (inp && from !== 'num') inp.value = k === 'rate' ? String(v) : fmt(v);
    if (rg && from !== 'range') rg.value = String(clamp(v, r.min, r.max));
    if (rg && k === 'rate') rg.setAttribute('aria-valuetext', v + '%');
    if (fill) fill.style.transform = 'scaleX(' + clamp((v - r.min) / (r.max - r.min), 0, 1).toFixed(4) + ')';
    if (k === 'rate') {
      var calc = document.querySelector('.ln-calc[data-idx="' + idx + '"]');
      if (calc) each(calc.querySelectorAll('.ln-rchip'), function (c) {
        c.setAttribute('aria-pressed', Number(c.getAttribute('data-v')) === Number(v) ? 'true' : 'false');
      });
    }
  }
  function parseNum(s) {
    s = String(s || '').replace(/[０-９．]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }).replace(/[^\d.]/g, '');
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }
  function setVal(idx, k, v, from) {
    var st = S.calc[idx];
    if (!st || !RANGES[k]) return;
    if (k === 'rate') v = Math.round(v * 10) / 10; else v = Math.round(v);
    v = clamp(v, 0, k === 'rate' ? 100 : k === 'years' ? 40 : 100000000);
    if (k === 'years') v = Math.max(1, v);
    if (k === 'principal') v = Math.max(1000, v);
    st[k] = v;
    syncField(idx, k, v, from);
    updateCalc(idx);
  }
  SM.on('ln-range', function (el) {
    if (drag.on) drag.n++;
    setVal(+el.getAttribute('data-idx'), el.getAttribute('data-k'), Number(el.value), 'range');
  });
  SM.on('ln-num', function (el) {
    var n = parseNum(el.value);
    if (n === null) return;
    setVal(+el.getAttribute('data-idx'), el.getAttribute('data-k'), n, 'num');
  });
  SM.on('ln-rate', function (el) {
    setVal(+el.getAttribute('data-idx'), 'rate', Number(el.getAttribute('data-v')), 'chip');
  });
  /* a slider press: the first value change (a tap on the track) still rolls and springs; from the second
     one on, the press is a drag and the display follows it directly (.is-live: no transitions) */
  document.addEventListener('pointerdown', function (ev) {
    var r = ev.target && ev.target.closest ? ev.target.closest('.ln-range') : null;
    if (!r) return;
    drag.on = true; drag.n = 0; drag.idx = +r.getAttribute('data-idx');
  }, true);
  function endDrag() {
    if (!drag.on) return;
    var wasLive = live();
    drag.on = false; drag.n = 0;
    each(document.querySelectorAll('.v-learn .ln-calc.is-live'), function (c) { c.classList.remove('is-live'); });
    if (wasLive) updateCalc(drag.idx);
  }
  document.addEventListener('pointerup', endDrag, true);
  document.addEventListener('pointercancel', endDrag, true);

  function rerenderCalc(idx) {
    var l = lessonById(S.id), stage = byId('ln-stage');
    if (!l || !stage || S.step !== idx) return;
    var ae = document.activeElement, fid = ae && ae.getAttribute ? ae.getAttribute('data-act') + '|' + (ae.getAttribute('data-value') || '') : null;
    stage.innerHTML = stepHtml(l, idx);
    afterStage(stage, true);
    if (fid) {
      var parts = fid.split('|');
      var again = stage.querySelector('[data-act="' + parts[0] + '"]' + (parts[1] ? '[data-value="' + parts[1] + '"]' : ''));
      if (again) try { again.focus({ preventScroll: true }); } catch (e) { }
    }
  }
  SM.on('ln-mode', function (el) {
    var idx = +el.getAttribute('data-idx'), st = S.calc[idx];
    if (!st) return;
    var v = el.getAttribute('data-value') === 'y' ? 'y' : 'm';
    if (st.mode === v) return;
    st.mode = v;
    rerenderCalc(idx);
  });
  SM.on('ln-year', function (el) {
    var idx = +el.getAttribute('data-idx'), st = S.calc[idx];
    if (!st) return;
    st.year = el.getAttribute('data-value') === '2' ? 2 : 1;
    each(el.parentNode.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b === el ? 'true' : 'false'); });
    updateCalc(idx);
  });
  SM.on('ln-social', function (el) {
    var idx = +el.getAttribute('data-idx'), st = S.calc[idx];
    if (!st) return;
    st.social = !!el.checked;
    updateCalc(idx);
  });
  SM.on('ln-preset', function (el) {
    var idx = +el.getAttribute('data-idx'), st = S.calc[idx];
    var presets = (SM.data.sim || {}).presets || {};
    var k = el.getAttribute('data-value');
    if (!st || !presets[k]) return;
    st.preset = k;
    st.rent = num(presets[k].rent, st.rent);
    each(el.parentNode.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b === el ? 'true' : 'false'); });
    syncField(idx, 'rent', st.rent);
    updateCalc(idx);
  });

  /* ---------- finish ---------- */
  function score(l) {
    var n = 0, c = 0;
    l.steps.forEach(function (s, i) {
      if (s.type !== 'quiz') return;
      n++;
      var a = S.answers[i];
      if (typeof a === 'number' && s.options[a] && s.options[a].correct) c++;
    });
    return { n: n, c: c };
  }
  function relatedHtml(l) {
    var ps = (l.related || []).map(function (id) { return SM.program ? SM.program(id) : null; }).filter(Boolean);
    // 中学生: only what is open to them (same rule as their search results — SPEC-v3 §3)
    var jrOk = SM.matchUtil && SM.matchUtil.jrOk;
    if (junior() && jrOk) ps = ps.filter(function (p) { return jrOk(p); });
    if (!ps.length) return '';
    var first = ps.slice(0, 4), rest = ps.slice(4);
    var card = function (p) { return SM.ui.programCard(p, { compact: true, headingLevel: 3 }); };
    // below the fold on the finish: content-visibility keeps its layout out of the step swap
    return '<section class="ln-related cv" aria-labelledby="ln-rel-h">' +
      SM.ui.sectionHeader(t('ln.fin.related'), { id: 'ln-rel-h' }) +
      '<div class="pcards" data-reveal-stagger="60">' + first.map(card).join('') + '</div>' +
      (rest.length ? '<details class="disclose ln-more"><summary><span>' + esc(t('ln.fin.more', { n: rest.length })) + '</span></summary>' +
        '<div class="pcards">' + rest.map(card).join('') + '</div></details>' : '') +
    '</section>';
  }
  /* the finish's related programs sit below the fold: in a step swap they land one frame after the finish
     itself, so the swap's layout stays one short task (the slot keeps the DOM order) */
  function fillRelated(l) {
    var put = function () {
      var slot = byId('ln-rel-slot');
      if (!slot) return;
      var html = relatedHtml(l);
      if (!html) { slot.parentNode.removeChild(slot); return; }
      slot.insertAdjacentHTML('afterend', html);
      var sec = slot.nextElementSibling;
      slot.parentNode.removeChild(slot);
      applyRuby(sec);
      var m = M();
      if (m && typeof m.mount === 'function') { try { m.mount(sec); } catch (e) { } }
    };
    requestAnimationFrame(function () { setTimeout(put, 0); });
  }
  /* o.fresh: the lesson was learned just now → the hanko waits to stamp and the count rolls N-1 → N */
  function finishHtml(l, o) {
    o = o || {};
    var sc = score(l);
    var recap = (l.recap || []).map(function (r) { return '<li>' + esc(L(r)) + '</li>'; }).join('');
    var nx = nextAfter(l.id);
    var cta = l.cta && l.cta.href ? SM.ui.button(L(l.cta.label), { href: l.cta.href, variant: 'secondary', block: true, arrow: true, attrs: 'data-press' }) : '';
    var play = !!o.fresh && !reduced();
    var all = mine(), done = doneCount();
    var counted = all.some(function (x) { return x.id === l.id; });
    var shownN = play && counted ? Math.max(0, done - 1) : done;
    var art = SM.illus ? SM.illus('learn-done', { size: 'spot', animate: play ? true : false }) : '';
    // the pale tile fades in WITH the figure (same start, length and curve as the figure's rise: 140ms, 360ms,
    // standard), never sweeping in or standing empty ahead of it (no bare rectangle on arrival)
    if (play && art) art = art.replace('<g data-il="plate">', '<g data-il="plate" style="--il-t:140ms;animation-name:il-fade;animation-duration:360ms">');
    // the 修了 seal: a square 角印, the two characters stacked (en: one word across)
    var word = t('ln.fin.stamp');
    var seal = en() ? '<span class="ln-hanko-w">' + esc(word) + '</span>' :
      word.split('').map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('');
    var segs = '';
    for (var i = 0; i < all.length; i++) segs += '<span class="ln-pseg' + (i < shownN ? ' is-done' : '') + '"><i></i></span>';
    return '<div class="ln-fin-top">' +
        // the picture, then the seal standing on the same ground line, which runs on to the column edge
        '<div class="ln-fin-art' + (art ? '' : ' is-bare') + '">' + art +
          (art ? '<svg class="ln-fin-ground' + (play ? ' is-pre' : '') + '" id="ln-fin-ground" viewBox="0 0 240 160" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
            '<path d="M0 140H240"/></svg>' : '') +
          '<span class="ln-hanko" aria-hidden="true" data-noruby><span class="ln-hanko-in' + (en() ? ' is-en' : '') + (play ? ' is-pre' : '') + '" id="ln-hanko">' + seal + '</span></span>' +
        '</div>' +
        '<div class="ln-fin-text">' +
          '<p class="ln-kind">' + esc(t('ln.fin.k')) + '</p>' +
          '<h2 class="ln-step-h" id="ln-sh" tabindex="-1">' + esc(t('ln.fin.h')) + '</h2>' +
          (sc.n ? '<p class="ln-fin-score">' + esc(t(sc.c === sc.n ? 'ln.fin.scoreAll' : 'ln.fin.score', { n: sc.n, c: sc.c })) + '</p>' : '') +

        '</div>' +
        // the learned count, as on the list: the number rolls on, the new segment draws in
        '<div class="ln-fin-count">' +
          '<p class="ln-fin-count-n"><span class="ln-fin-count-k">' + esc(t('ln.doneLabel')) + '</span>' +
            '<b class="ts-num-l" id="ln-fin-n" data-to="' + done + '" data-from="' + shownN + '">' + shownN + '</b><span class="of">/ ' + all.length + '</span></p>' +
          '<div class="ln-psegs" id="ln-fin-segs" aria-hidden="true">' + segs + '</div>' +
        '</div>' +
      '</div>' +
      (recap ? '<section class="ln-recap" aria-labelledby="ln-recap-h"><h3 class="ln-sub-h" id="ln-recap-h">' + esc(t('ln.fin.recap')) + '</h3>' +
        '<ol class="steps ln-recap-list" data-reveal-stagger="80">' + recap + '</ol></section>' : '') +
      (cta ? '<div class="ln-cta">' + cta + '</div>' : '') +
      (o.deferRel ? '<div id="ln-rel-slot"></div>' : relatedHtml(l)) +
      (nx ? '' : '<p class="ln-alldone">' + esc(t('ln.fin.allDone')) + '</p>') +
      '<div class="ln-fin-links">' +
        '<button type="button" class="btn btn-text btn-sm" data-act="ln-restart"><span>' + esc(t('ln.fin.again')) + '</span></button>' +
        '<a class="btn btn-text btn-sm" href="#/learn"><span>' + esc(t('ln.toList')) + '</span></a>' +
      '</div>';
  }

  function stepHtml(l, idx, o) {
    var total = l.steps.length;
    var inner;
    if (idx >= total) inner = finishHtml(l, o);
    else {
      var s = l.steps[idx] || {};
      if (s.type === 'compare') inner = compareStep(s);
      else if (s.type === 'quiz') inner = quizStep(s, idx);
      else if (s.type === 'calc') inner = calcStep(s, idx);
      else inner = textStep(s, l);
      // step 1 opens under the lesson's cover: the destination of the cover morph
      if (idx === 0) inner = cover(l, { hero: true }) + inner;
    }
    var type = idx >= total ? 'finish' : ((l.steps[idx] || {}).type || 'text');
    return '<section class="ln-step ln-step-' + esc(type) + '" data-step="' + idx + '" aria-labelledby="ln-sh">' + inner + '</section>';
  }

  /* ---------- progress + nav ---------- */
  function progShown(l, idx) { var total = l.steps.length; return idx >= total ? total : Math.min(idx + 1, total); }
  function progHtml(l, idx) {
    var total = l.steps.length, segs = '';
    for (var i = 0; i < total; i++) {
      var st = i < idx ? ' is-done' : i === idx ? ' is-current' : '';
      var kind = (l.steps[i] || {}).type === 'quiz' ? ' is-quiz' : '';
      segs += '<span class="ln-seg' + st + kind + '" style="--i:' + i + '"><i></i></span>';
    }
    var shown = progShown(l, idx);
    return '<div class="ln-prog" role="progressbar" aria-label="' + esc(t('ln.progress')) + '" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + shown + '" aria-valuetext="' + esc(idx >= total ? t('ln.fin.k') : t('ln.atSr', { n: shown, total: total })) + '">' +
      '<span class="ln-segs' + (idx >= total ? ' is-full' : '') + '">' + segs + '</span>' +
      '<span class="ln-prog-n" aria-hidden="true"><b class="num" id="ln-prog-b">' + shown + '</b><span class="of num">/ ' + total + '</span></span></div>';
  }
  /* update the existing segments so their fill transitions (scaleX) play; the counter rolls */
  function updateProg(l, idx) {
    var box = byId('ln-prog');
    if (!box) return;
    var total = l.steps.length;
    var segs = box.querySelectorAll('.ln-seg');
    if (segs.length !== total) { box.innerHTML = progHtml(l, idx); return; }
    each(segs, function (sg, i) {
      sg.classList.toggle('is-done', i < idx);
      sg.classList.toggle('is-current', i === idx);
    });
    var wrap = box.querySelector('.ln-segs');
    if (wrap) wrap.classList.toggle('is-full', idx >= total);
    var shown = progShown(l, idx);
    var pb = box.querySelector('.ln-prog');
    if (pb) {
      pb.setAttribute('aria-valuenow', String(shown));
      pb.setAttribute('aria-valuetext', idx >= total ? t('ln.fin.k') : t('ln.atSr', { n: shown, total: total }));
    }
    var b = byId('ln-prog-b'), m = M();
    if (b) { if (m && m.odometer) m.odometer(b, String(shown), { duration: 420 }); else b.textContent = String(shown); }
  }
  function nextState(l, idx) {
    var total = l.steps.length, s = l.steps[idx] || {};
    // FIX-B (F32): a wrong try is an answer too — the button no longer offers 「答えずに、つぎへ」 after it
    var tried = S.tried && S.tried[idx] && S.tried[idx].length;
    var unanswered = s.type === 'quiz' && typeof S.answers[idx] !== 'number' && !tried;
    return { primary: !unanswered, label: unanswered ? t('ln.skip') : idx === total - 1 ? t('ln.toEnd') : t('ln.next') };
  }
  function navHtml(l, idx) {
    var total = l.steps.length;
    var prev = '<button type="button" class="btn btn-secondary ln-prev" data-act="ln-prev" data-press' + (idx === 0 ? ' hidden' : '') + '>' + arrow('l') + '<span>' + esc(t('ln.prev')) + '</span></button>';
    var next;
    if (idx >= total) {
      var nx = nextAfter(l.id);
      next = nx ?
        '<a class="btn btn-primary ln-next ln-next-lesson" href="' + esc(lessonHref(nx)) + '" data-press><span class="ln-next-lbl"><small>' + esc(t('ln.fin.nextK')) + '</small><span>' + esc(L(nx.title)) + '</span></span>' + arrow() + '</a>' :
        '<a class="btn btn-primary ln-next" href="#/learn" data-press><span>' + esc(t('ln.toList')) + '</span>' + arrow() + '</a>';
    } else {
      var st = nextState(l, idx);
      next = '<button type="button" class="btn ' + (st.primary ? 'btn-primary' : 'btn-secondary is-skip') + ' ln-next" data-act="ln-next" data-press>' +
        '<span class="ln-next-t">' + esc(st.label) + '</span>' + arrow() + '</button>';
    }
    return '<div class="ln-nav-in' + (idx >= total ? ' is-fin' : '') + '">' + prev + next + '</div>';
  }
  /* the bar stays; only what changed moves: the label swaps (rise 8px), a button that turns primary nudges its arrow */
  function syncNav(l, idx, animate) {
    var nav = byId('ln-nav');
    if (!nav) return;
    var total = l.steps.length, m = M();
    var next = nav.querySelector('.ln-next');
    var lab = next ? next.querySelector('.ln-next-t') : null;
    if (idx >= total || !lab) {
      nav.innerHTML = navHtml(l, idx);
      applyRuby(nav);
      if (animate) anim(nav.querySelector('.ln-nav-in'), [{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: 240, easing: E('standard'), key: 'nav' });
      return;
    }
    var prev = nav.querySelector('.ln-prev');
    if (prev) prev.hidden = idx === 0;
    var st = nextState(l, idx);
    var was = next.classList.contains('btn-primary');
    next.classList.toggle('btn-primary', st.primary);
    next.classList.toggle('btn-secondary', !st.primary);
    next.classList.toggle('is-skip', !st.primary);
    var cur = lab.textContent;
    if (cur !== st.label) {
      // 答えずに、つぎへ → つぎへ also turns the button green: no overlap, the colour flips between the two labels
      if (animate && m && m.swapText && !ruby()) m.swapText(lab, st.label, { flip: was !== st.primary, host: next });
      else { lab.textContent = st.label; applyRuby(lab); }
    }
    if (animate && st.primary && !was && m && m.nudge) m.nudge(next.querySelector('.arrow'));
  }

  /* ---------- lesson page ---------- */
  function sourcesHtml(l, open) {
    var src = (l.sources || []).filter(function (s) { return s && s.url; });
    if (!src.length) return '';
    var host = function (u) { return String(u).replace(/^https?:\/\//, '').replace(/\/$/, ''); };
    return '<details class="disclose ln-src"' + (open ? ' open' : '') + '><summary><span>' + esc(t('ln.src')) +
      (l.checked ? '<small class="ln-src-d">' + esc(SM.fmtDate(l.checked)) + '</small>' : '') + '</span></summary>' +
      '<ul class="ln-src-list">' + src.map(function (s) {
        return '<li><a class="ln-src-a" href="' + esc(s.url) + '" target="_blank" rel="noopener"><span class="ln-src-o">' + esc(s.org) + '</span>' +
          '<span class="ln-src-u" data-noruby>' + esc(host(s.url)) + '</span>' + ic('external', 'ln-src-ic') + '<span class="sr-only">' + esc(t('core.newtab')) + '</span>' + '</a></li>';
      }).join('') + '</ul>' +
      (l.checked ? '<p class="help">' + esc(t('ln.srcChecked', { date: SM.fmtDate(l.checked) })) + '</p>' : '') +
    '</details>';
  }
  function renderLesson(id) {
    var l = lessonById(id);
    if (!l) {
      return '<h1 class="sr-only">' + esc(t('ln.notFound')) + '</h1>' +
        SM.ui.empty(t('ln.notFound'), t('ln.notFoundBody'), SM.ui.button(t('ln.toList'), { href: '#/learn', variant: 'ink' }), { illus: 'not-found' });
    }
    enter(l);
    var idx = S.step;
    return '<article class="ln-lesson" data-id="' + esc(l.id) + '" data-cat="' + esc(l.cat || '') + '">' +
      '<header class="ln-head">' +
        '<p class="ln-eyebrow">' + SM.ui.catIcon(l.cat || 'money', 'xs') +
          '<span>' + esc(SM.ui.catLabel(l.cat)) + '</span><span class="ln-sep" aria-hidden="true">／</span>' +
          (numOf(l) ? '<span class="num">' + esc(t('ln.lessonN', { n: numOf(l) })) + '</span><span class="ln-sep" aria-hidden="true">／</span>' : '') +
          '<span class="num">' + esc(t('ln.min', { n: l.minutes || 2 })) + '</span></p>' +
        '<h1 class="ln-title" data-reveal="line" data-reveal-delay="60">' + esc(L(l.title)) + '</h1>' +
        '<div id="ln-prog">' + progHtml(l, idx) + '</div>' +
      '</header>' +
      resumeHtml(l, idx) +
      '<div class="ln-stage" id="ln-stage">' + stepHtml(l, idx) + '</div>' +
      '<div class="q-foot ln-nav" id="ln-nav">' + navHtml(l, idx) + '</div>' +
      '<p class="ln-keys" aria-hidden="true">' + esc(t('ln.keys')) + '</p>' +
      '<div id="ln-srcbox">' + sourcesHtml(l, idx >= l.steps.length) + '</div>' +
    '</article>';
  }
  function resumeHtml(l, idx) {
    var total = l.steps.length;
    if (!(S.resumed > 0) || idx !== S.resumed || idx >= total) return '';
    return '<div class="ln-resume" id="ln-resume" role="note"><p class="ln-resume-t">' + esc(t('ln.resume', { n: idx + 1, total: total })) + '</p>' +
      '<button type="button" class="ln-resume-btn" data-act="ln-restart"><span>' + esc(t('ln.resumeStart')) + '</span></button></div>';
  }
  function dropResume() {
    S.resumed = 0;
    var rb = byId('ln-resume');
    if (!rb) return;
    var gone = function () { if (rb.parentNode) rb.parentNode.removeChild(rb); };
    var a = !reduced() ? anim(rb, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: E('exit'), fill: 'forwards' }) : null;
    if (a && a.finished) a.finished.then(gone, gone); else gone();
  }
  /* the arrival: the step's numbers start at 0 in the new page's first frame and roll up while it settles in
     (no layout reads here — this runs inside the transition's update) */
  function mountLesson() {
    var l = lessonById(S.id);
    if (!l || !M() || S.inPlace) return;
    stepMoments(l, S.step, {});
  }

  function afterStage(stage, instant) {
    applyRuby(stage);
    var m = M();
    if (m && typeof m.mount === 'function') { try { m.mount(stage, instant ? { instant: true } : undefined); } catch (e) { } }
  }

  /* what a step does once it is on screen: the big numbers roll in once per visit; the finish plays its sequence */
  var finSeq = null;
  function stepMoments(l, idx, o) {
    var m = M(), stage = byId('ln-stage');
    if (!m || !stage) return;
    if (idx >= l.steps.length) { finishMoment(o && o.fresh); return; }
    if (S.rolled[idx] || reduced() || lite() || !m.odometer) return;
    S.rolled[idx] = true;
    // the one big number of a step rolls; the compare columns do not (「返す 0万円」 mid-roll would read as a fact).
    // It rolls on first sight (in from blank, never from a '0' that reads as a value) or when it changed since the
    // last visit; a fact already seen simply stands there (§4.1: the odometer is for a number that changes).
    var list = stage.querySelectorAll('.ln-big-v .ln-dg, .ln-out-big .ln-n');
    each(list, function (el, i) {
      var txt = el.textContent;
      if (!/^[\d,.]+$/.test(txt) || /^0+$/.test(txt)) return;
      var key = 'ln:' + l.id + ':' + idx + ':' + i, was = m.seen ? m.seen(key) : undefined;
      if (m.seen) m.seen(key, txt);
      if (was === txt) return;
      m.odometer(el, txt, { from: typeof was === 'string' ? was : '', duration: 640, delay: 40 + i * 40 });
    });
  }
  /* the completion moment (fresh finish only; MOTION-SPEC §4.2 Learn). The learn-done picture enters on its own
     (ground 0–300ms, figure, accent ring); its ground line runs on to the column edge (250ms), the 修了 seal stamps
     onto that line as it lands (stamp spring + ring), then the learned count rolls and its new segment draws. */
  function finishMoment(fresh) {
    var m = M();
    var hk = byId('ln-hanko'), cnt = byId('ln-fin-n'), gr = byId('ln-fin-ground');
    if (finSeq) { try { finSeq.cancel(); } catch (e) { } finSeq = null; }
    if (!hk || !hk.classList.contains('is-pre')) return;
    var line = function () {
      if (!gr || !gr.classList.contains('is-pre')) return;
      gr.classList.remove('is-pre');
      anim(gr, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 240, easing: E('enter'), key: 'ground' });
    };
    var reveal = function () {
      if (!hk.classList.contains('is-pre')) return;
      hk.classList.remove('is-pre');
      if (m && m.stamp) m.stamp(hk);
    };
    var roll = function () {
      if (!cnt) return;
      var to = cnt.getAttribute('data-to'), from = +(cnt.getAttribute('data-from') || to);
      cnt.removeAttribute('data-from');
      if (to && cnt.textContent !== to && m && m.odometer) m.odometer(cnt, to, { duration: 560 });
      else if (to) cnt.textContent = to;
      var segs = document.querySelectorAll('#ln-fin-segs .ln-pseg');
      for (var i = from; i < +to && i < segs.length; i++) {
        if (segs[i].classList.contains('is-done')) continue;
        segs[i].classList.add('is-done');
        anim(segs[i].firstElementChild, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 440, delay: 80 + (i - from) * 60, easing: E('draw'), fill: 'backwards' });
      }
    };
    if (!m || !m.sequence) { line(); reveal(); roll(); return; }
    finSeq = m.sequence([{ at: 250, run: line }, { at: 430, run: reveal }, { at: 550, run: roll }]);
    finSeq.play();
    // failsafe: the line, the seal and the count never stay in their before-state
    setTimeout(function () {
      if (!hk.isConnected) return;
      if (gr) gr.classList.remove('is-pre');
      reveal(); roll();
    }, 2000);
  }

  /* step swap: the in-view shared axis X (MOTION-SPEC §3.5) — old 90ms out with 24px travel, new 220ms fade +
     300ms travel from the other side. The old step starts leaving on the tap's own frame; the new step's markup
     (and the saved place) is built while it fades, so a slow phone never sits on a frozen screen. A tap during the
     swap lands it first, so rapid taps never queue. */
  var swap = null;
  function goStep(n, dir) {
    var l = lessonById(S.id);
    var stage = byId('ln-stage');
    if (!l || !stage) return;
    var total = l.steps.length;
    n = clamp(n, 0, total);
    if (n === S.step) return;
    dropResume();
    if (swap) swap.land();
    var from = S.step;
    S.step = n;
    var finishing = n >= total;
    var freshDone = false;
    var nav = byId('ln-nav');
    var srcBox = byId('ln-srcbox');
    var html = null;
    var build = function () {
      if (html !== null) return;
      if (finishing) {
        setPos(l.id, 0);
        if (!isDone(l.id) && SM.setLearned) { SM.setLearned(l.id, true); freshDone = true; S.justDone = l.id; }
      } else setPos(l.id, n);
      html = stepHtml(l, n, { fresh: freshDone, deferRel: true });
    };
    var commit = function () {
      build();
      // the new screen starts at its top (measured on the old, laid-out step: the stage's top does not move)
      var sr0 = stage.getBoundingClientRect(), top = sr0.top;
      var bar = document.querySelector('.appbar');
      var limit = bar ? bar.getBoundingClientRect().bottom : 0;
      // scrolled past the header: back up only to the step counter (the eyebrow and title stay where they were, so
      // the header never re-appears and pushes the step down)
      var prog = top < limit + 8 ? (byId('ln-prog') || document.querySelector('.ln-lesson')) : null;
      var y = prog ? Math.max(0, prog.getBoundingClientRect().top + window.scrollY - limit - 12) : -1;
      /* the もどる / つぎへ bar never jumps under the thumb: within a lesson the stage only ever grows (it keeps the
         tallest step's height), so the bar can only move down, and when it does it glides (FLIP below) */
      // (on screen: the thumb cares where the bar is in the viewport; a bar stuck to the bottom stays put)
      var navTop0 = nav && !finishing ? nav.getBoundingClientRect().top : null;
      if (finishing) stage.style.minHeight = '';
      else if (sr0.height > (stage._lnMin || 0)) { stage._lnMin = sr0.height; stage.style.minHeight = Math.round(sr0.height) + 'px'; }
      stage.innerHTML = html;
      afterStage(stage);
      syncNav(l, n, !!nav);
      if (srcBox && finishing !== (from >= total)) { srcBox.innerHTML = sourcesHtml(l, finishing); applyRuby(srcBox); }
      if (y >= 0) { try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, y); } }
      var h = byId('ln-sh');
      if (h) { try { h.focus({ preventScroll: true }); } catch (e) { } }
      if (navTop0 !== null && !reduced()) {
        var dyN = navTop0 - nav.getBoundingClientRect().top;
        if (Math.abs(dyN) >= 1) anim(nav, [{ translate: '0 ' + dyN + 'px' }, { translate: '0 0' }], { spring: 'smooth', maxDuration: 400, key: 'ln-nav-flip' });
      }
      stepMoments(l, n, { fresh: freshDone });
      if (finishing) fillRelated(l);
    };

    var m = M();
    var red = reduced();
    updateProg(l, n);
    if (!m || typeof m.animate !== 'function') { commit(); return; }
    /* v5: the steps are a deck of flat panels. The old panel is lifted off as a fixed copy that recedes (shrinks a
       little, slides 18% the way it came from and fades) while the new panel slides over it from the other side
       (48px on the rise spring). The copy and its animation start on the tap's own frame; the new step's markup is
       built one frame later, so a slow phone never sits on a frozen screen. A tap during the swap lands it first.
       Reduced motion: no travel, the new panel cross-fades in (180ms). */
    var fwd = dir >= 0;
    var ghost = null, gA = null;
    if (!red) {
      var r0 = stage.getBoundingClientRect(), vh = window.innerHeight || 800;
      if (r0.width && r0.bottom > 0 && r0.top < vh) {
        ghost = stage.cloneNode(true);
        ghost.removeAttribute('id');
        each(ghost.querySelectorAll('[id]'), function (x) { x.removeAttribute('id'); });
        ghost.classList.add('ln-ghost');
        ghost.setAttribute('aria-hidden', 'true');
        ghost.setAttribute('inert', '');
        var top = Math.max(r0.top, 0), h = Math.min(r0.bottom, vh) - top;
        ghost.style.cssText = 'position:fixed;left:' + r0.left + 'px;top:' + r0.top + 'px;width:' + r0.width + 'px;height:' + Math.max(0, Math.min(r0.height, vh - r0.top)) +
          'px;margin:0;min-height:0;overflow:hidden;pointer-events:none;z-index:0;transform-origin:' + (fwd ? '0% ' : '100% ') + Math.round(top - r0.top + h / 2) + 'px;';
        stage.parentNode.insertBefore(ghost, stage);
        gA = anim(ghost, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (fwd ? -18 : 18) + '%) scale(0.92)' }],
          { duration: 420, easing: E('standard'), fill: 'forwards' });
        var drop = function () { if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost); };
        if (gA && gA.finished) gA.finished.then(drop, drop); else setTimeout(drop, 450);
        setTimeout(drop, 900);
      }
      // the live stage holds still and blank until its new panel arrives (one frame)
      stage.style.opacity = '0';
    }
    var me = { landed: false };
    me.land = function () {
      if (me.landed) return;
      me.landed = true;
      if (swap === me) swap = null;
      commit();
      stage.style.opacity = '';
      if (red) { anim(stage, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear', key: 'ln-op' }); return; }
      anim(stage, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: E('enter'), key: 'ln-op' });
      anim(stage, [{ transform: 'translateX(' + (fwd ? 48 : -48) + 'px)' }, { transform: 'none' }], { spring: 'rise', key: 'ln-tr' });
      // the step's parts follow the panel in, one after another (heading, body, options)
      var kids = stage.firstElementChild ? stage.firstElementChild.children : [];
      var k = 0;
      each(kids, function (c) {
        if (k > 5 || c.classList.contains('ln-cover')) return;
        anim(c, [{ opacity: 0, transform: 'translateX(' + (fwd ? 24 : -24) + 'px)' }, { opacity: 1, transform: 'none' }],
          { duration: 420, delay: 60 + k * 50, easing: E('expo') || E('standard'), fill: 'backwards', key: 'ln-kid' });
        k++;
      });
    };
    swap = me;
    // build after the frame that starts the old panel's exit has been handed to the compositor
    requestAnimationFrame(function () { setTimeout(function () { if (!me.landed) { build(); me.land(); } }, 0); });
  }

  SM.on('ln-next', function () {
    var l = lessonById(S.id);
    if (!l) return;
    goStep(S.step + 1, 1);
  });
  SM.on('ln-prev', function () { goStep(S.step - 1, -1); });
  SM.on('ln-restart', function () {
    var l = lessonById(S.id);
    if (!l) return;
    S.answers = {}; S.tried = {}; S.calc = {}; S.rolled = {};
    goStep(0, -1);
  });

  /* bring the explanation into view (above the sticky bottom bar), without pushing the question off the top:
     the scroll never takes the question's first line under the top bar (it stays readable with its answer) */
  function showFeedback(fb) {
    if (!fb || !fb.getBoundingClientRect) return;
    var r = fb.getBoundingClientRect(), navEl = byId('ln-nav');
    var bottom = navEl ? navEl.getBoundingClientRect().top : window.innerHeight;
    var topBar = document.querySelector('.subbar:not([hidden])') || document.querySelector('.appbar');
    var topLimit = (topBar ? topBar.getBoundingClientRect().bottom : 0) + 12;
    if (r.bottom > bottom - 12) {
      var by = Math.min(r.bottom - bottom + 24, r.top - topLimit);
      var qh = document.querySelector('#ln-stage .ln-q');
      if (qh) by = Math.min(by, qh.getBoundingClientRect().top - topLimit);
      if (by > 0) { try { window.scrollBy({ top: by, left: 0, behavior: reduced() ? 'instant' : 'smooth' }); } catch (e) { window.scrollBy(0, by); } }
    }
  }
  function fbIn(fb, delay) {
    var box = fb && fb.firstElementChild;
    if (!box) return;
    anim(box, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: delay || 0, easing: E('enter'), fill: 'backwards', key: 'fbo' });
    anim(box, [{ translate: '0 28px' }, { translate: '0 0' }], { spring: 'rise', delay: delay || 0, fill: 'backwards', key: 'fb' });
  }
  /* new explanation: the one on screen (a retry hint) steps out in 90ms first, then the new one rises in */
  function setFb(html, delay) {
    var fb = byId('ln-fb');
    if (!fb) return;
    var tok = fb._lnTok = (fb._lnTok || 0) + 1;
    var put = function () {
      if (fb._lnTok !== tok) return;
      fb._lnTok = tok + 1;
      fb.innerHTML = html;
      applyRuby(fb);
      fbIn(fb, delay);
      // the page moves only together with the explanation's rise, never while there is nothing new to see
      // (the options must not slide under the finger right after the tap)
      var mine = fb._lnTok;
      if (delay > 0 && !reduced()) setTimeout(function () { if (fb._lnTok === mine && fb.isConnected) showFeedback(fb); }, delay);
      else showFeedback(fb);
    };
    var old = fb.firstElementChild;
    if (!old || reduced() || !M()) { put(); return; }
    /* a retry hint answered by the 正解 explanation: they cross-fade IN PLACE. The old box lies over the new one
       (absolute, where it was) and leaves just before the new one rises (out 90ms, ending as the new one starts),
       and the area keeps the old height until the old box has gone, so nothing below the options collapses and
       comes back, and there is never an empty gap under the answer. */
    Array.prototype.slice.call(fb.querySelectorAll(':scope > .ln-fb-old')).forEach(function (x) { if (x.parentNode) x.parentNode.removeChild(x); });
    old = fb.firstElementChild;
    if (!old) { put(); return; }
    // offsets from the area's own padding box (it is static, so old.offsetTop would count from a far ancestor and
    // the old box would land a whole page section lower once the area becomes its containing block)
    var fr = fb.getBoundingClientRect(), orr = old.getBoundingClientRect();
    var h0 = fb.offsetHeight, ot = orr.top - fr.top - fb.clientTop, ol = orr.left - fr.left - fb.clientLeft, ow = old.offsetWidth;
    var stat = getComputedStyle(fb).position === 'static';
    fb._lnTok = tok + 1;
    var mine = fb._lnTok;
    if (stat) fb.style.position = 'relative';
    fb.style.minHeight = h0 + 'px';
    old.classList.add('ln-fb-old');
    old.setAttribute('aria-hidden', 'true');
    old.style.position = 'absolute'; old.style.top = ot + 'px'; old.style.left = ol + 'px'; old.style.width = ow + 'px';
    old.style.margin = '0'; old.style.pointerEvents = 'none';
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var nb = tmp.firstElementChild;
    while (tmp.firstChild) fb.appendChild(tmp.firstChild);
    applyRuby(fb);
    var d = Math.max(60, delay || 0);
    var out = anim(old, [{ opacity: 1 }, { opacity: 0 }], { duration: 90, delay: Math.max(0, d - 70), easing: 'linear', fill: 'both' });
    if (nb) {
      anim(nb, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: d, easing: E('enter'), fill: 'backwards', key: 'fbo' });
      anim(nb, [{ translate: '0 28px' }, { translate: '0 0' }], { spring: 'rise', delay: d, fill: 'backwards', key: 'fb' });
    }
    var drop = function () {
      if (old.parentNode) old.parentNode.removeChild(old);
      if (fb._lnTok !== mine) return;
      fb.style.minHeight = '';
      // a shorter explanation: the area eases down to it (FLIP of the difference), the bar below never snaps up
      var nh = fb.offsetHeight;
      if (fb.isConnected && h0 - nh > 2) anim(fb, [{ height: h0 + 'px' }, { height: nh + 'px' }], { duration: 220, easing: E('standard'), key: 'fbh' });
    };
    if (out) { out.addEventListener('finish', drop); out.addEventListener('cancel', drop); } else drop();
    setTimeout(function () { if (fb._lnTok === mine && fb.isConnected) showFeedback(fb); }, d);
  }
  function addRes(btn, html, fade) {
    var res = btn.querySelector('.ln-opt-res');
    if (!res) { btn.insertAdjacentHTML('beforeend', '<span class="ln-opt-res"></span>'); res = btn.lastElementChild; }
    res.innerHTML = html;
    if (fade) anim(res.firstElementChild, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: fade > 1 ? fade : 0, easing: E('enter'), fill: 'backwards' });
    return res.firstElementChild;
  }
  SM.on('ln-answer', function (el) {
    var l = lessonById(S.id);
    if (!l) return;
    var idx = S.step, s = l.steps[idx];
    if (!s || s.type !== 'quiz' || typeof S.answers[idx] === 'number') return;
    var i = +el.getAttribute('data-i');
    if (!s.options || !s.options[i]) return;
    if (!S.tried) S.tried = {};
    var tried = S.tried[idx] || (S.tried[idx] = []);
    if (tried.indexOf(i) !== -1) return;
    var m = M();
    if (m && m.finishAll) { try { m.finishAll(byId('ln-stage'), { instant: true, noFlush: true }); } catch (e) { } }
    var right = !!s.options[i].correct;
    // wrong, and another wrong option is still there to rule out: one more try before the answer is shown
    var otherWrong = s.options.filter(function (o, j) { return !o.correct && j !== i && tried.indexOf(j) === -1; }).length;
    if (!right && otherWrong > 0) {
      tried.push(i);
      el.classList.add('is-chosen', 'is-wrong', 'is-tried');
      el.setAttribute('aria-disabled', 'true');
      sweepOpt(el, 'ng', 0, reduced() || !m);
      addRes(el, yoursHtml(), 40);
      var hint0 = el.parentNode.parentNode.querySelector('.ln-quiz-hint');
      if (hint0) hint0.classList.add('is-gone');   // fades, keeps its line: the options never move under the finger
      setFb(retryHtml(s, i), 100);
      try { syncNav(l, idx, true); } catch (e) { }
      return;
    }
    revealQuiz(l, idx, s, i, el.parentNode);
  });
  SM.on('ln-retry', function () {
    var b = document.querySelector('#ln-stage .ln-opt:not([aria-disabled="true"])');
    if (!b) return;
    try { b.focus({ preventScroll: true }); } catch (e) { }
    try { b.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { }
  });
  SM.on('ln-reveal', function () {
    var l = lessonById(S.id);
    if (!l) return;
    var idx = S.step, s = l.steps[idx];
    var tried = (S.tried && S.tried[idx]) || [];
    var box = document.querySelector('#ln-stage .ln-opts');
    if (!s || s.type !== 'quiz' || !tried.length || !box || typeof S.answers[idx] === 'number') return;
    revealQuiz(l, idx, s, tried[tried.length - 1], box);
    var h = document.querySelector('#ln-fb .ln-fb-h');
    if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) { } }
  });
  function sweepOpt(btn, tone, delay, calm) {
    if (!btn) return;
    var old = btn.querySelector('.ln-opt-sweep');
    if (old) { if (old.classList.contains('is-' + tone)) return; old.parentNode.removeChild(old); }
    var sw = document.createElement('span');
    sw.className = 'ln-opt-sweep is-' + tone;
    sw.setAttribute('aria-hidden', 'true');
    btn.insertBefore(sw, btn.firstChild);
    btn.classList.add('has-sweep');
    if (calm) { anim(sw, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' }); return; }
    anim(sw, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 440, delay: delay || 0, easing: E('draw'), fill: 'backwards' });
  }
  /* the answer is in. Right: the ○ draws round the key letter (en: the key fills, ✓ draws), the 正解 seal stamps
     across the frame's edge (ring), the other options step back. Wrong: your key is a quiet amber ✕; the answer gets
     its green frame, the ○ and a 正解 tag. Then the explanation rises in and つぎへ turns primary. */
  function revealQuiz(l, idx, s, i, box) {
    S.answers[idx] = i;
    var right = !!s.options[i].correct;
    var m = M(), calm = reduced() || !m;
    var chosen = null, answer = null;
    box.classList.add('is-answered');
    each(box.querySelectorAll('.ln-opt'), function (b) {
      var j = +b.getAttribute('data-i'), o = s.options[j];
      // an earlier wrong try now reads like any other option that was not the answer
      if (b.classList.contains('is-tried')) {
        b.classList.remove('is-tried', 'is-chosen', 'is-wrong');
        var r0 = b.querySelector('.ln-opt-res');
        if (r0) r0.innerHTML = '';
        var s0 = b.querySelector('.ln-opt-sweep');
        if (s0 && j !== i) { s0.parentNode.removeChild(s0); b.classList.remove('has-sweep'); }
      }
      b.setAttribute('aria-disabled', 'true');
      b.setAttribute('aria-pressed', j === i ? 'true' : 'false');
      if (o.correct) { b.classList.add('is-correct'); answer = b; }
      if (j === i) { b.classList.add('is-chosen'); chosen = b; }
      if (j === i && !o.correct) { b.classList.add('is-wrong'); addRes(b, yoursHtml(), 1); }
      if (!o.correct && j !== i) b.classList.add('is-dim');
    });
    var hint = box.parentNode.querySelector('.ln-quiz-hint');
    if (hint) hint.classList.add('is-gone');
    /* big, clear feedback: the colour sweeps across the option from its key (green for the answer, a pale amber for
       a wrong pick), and the right pick gives a small spring "pop". Reduced motion: the colour simply fades in. */
    var sweep = function (btn, tone, delay) { sweepOpt(btn, tone, delay, calm); };
    if (chosen && !right) sweep(chosen, 'ng', 0);
    sweep(answer, 'ok', right ? 0 : 200);
    if (right && chosen && !calm) anim(chosen, [{ scale: '1' }, { scale: '1.035', offset: 0.35 }, { scale: '1' }], { duration: 460, easing: E('standard'), key: 'pop' });
    var keyA = answer ? answer.querySelector('.ln-opt-key') : null;
    /* the answer's mark: ja — the maru draws round the key letter; en — the key fills and the ✓ draws (engine
       check: stamp spring + two rect segments, no clip-path) */
    var mark = function (delay) {
      if (!en()) { drawMaru(keyA, delay, calm); return; }
      if (calm || !keyA || !m.check) return;
      var go = function () { if (keyA.isConnected) m.check(keyA, { color: 'var(--on-action-fill)' }); };
      if (delay) setTimeout(go, delay); else go();
    };
    if (right && chosen) {
      // the maru (0–340ms), then the 正解 seal stamps as the pen lifts, then the explanation rises in
      mark(0);
      var put = function () {
        var st = addRes(chosen, stampHtml());
        var inner = st && st.querySelector('.ln-stamp-in');
        if (!calm && inner && m.stamp) m.stamp(inner);
      };
      if (calm) put(); else setTimeout(put, 200);
    } else if (answer) {
      // your pick quietly turns into an outline ✕ (CSS, 160ms); the answer is marked: maru, 正解, underline
      mark(160);
      addRes(answer, ansLabel(), calm ? 0 : 220);
      // en: the ✓ fill is a stamp, not a stroke, so the answer also gets its underline drawn (ja: the ○ is the stroke)
      var tw = en() ? answer.querySelector('.ln-opt-tw') : null;
      if (tw && !tw.querySelector('.ln-opt-u')) {
        tw.insertAdjacentHTML('beforeend', '<span class="ln-opt-u" aria-hidden="true"></span>');
        anim(tw.lastElementChild, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 300, delay: 260, easing: E('draw'), fill: 'backwards' });
      }
    }
    syncNav(l, idx, true);
    setFb(feedbackHtml(s, i), right ? 300 : 240);
  }

  /* ← / → between steps (not while typing or on a slider) */
  document.addEventListener('keydown', function (ev) {
    if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    if (!SM.route || SM.route.key !== 'learn' || !S.id) return;
    if (SM.sheetOpen && SM.sheetOpen()) return;
    var tg = ev.target;
    if (tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.nodeName) || tg.isContentEditable)) return;
    if (tg && tg.closest && tg.closest('.seg, .chips, details summary')) return;
    if (!byId('ln-stage')) return;
    var l = lessonById(S.id);
    if (!l) return;
    if (ev.key === 'ArrowRight' && S.step < l.steps.length) { ev.preventDefault(); goStep(S.step + 1, 1); }
    else if (ev.key === 'ArrowLeft' && S.step > 0) { ev.preventDefault(); goStep(S.step - 1, -1); }
  });
  /* reformat a typed number when the field is left */
  document.addEventListener('focusout', function (ev) {
    var el = ev.target;
    if (!el || el.getAttribute === undefined || el.getAttribute('data-act') !== 'ln-num') return;
    var idx = +el.getAttribute('data-idx'), k = el.getAttribute('data-k'), st = S.calc[idx];
    if (st && k in st) el.value = k === 'rate' ? String(st[k]) : fmt(st[k]);
  });

  /* ------------------------------------------------------------------ view */
  var deskMq = null;
  try { deskMq = window.matchMedia('(min-width: 900px)'); } catch (e) { deskMq = null; }
  if (deskMq) {
    var onDesk = function () { if (SM.route && SM.route.key === 'learn' && SM.paintChrome) SM.paintChrome(); };
    if (deskMq.addEventListener) deskMq.addEventListener('change', onDesk); else if (deskMq.addListener) deskMq.addListener(onDesk);
  }

  SM.views.learn = {
    /* phone: lit under ホーム (まなぶ is reached from home). Desktop: null, so core lights the rail's まなぶ row. */
    get tab() { return deskMq && deskMq.matches ? null : 'home'; },
    title: function (args) {
      var l = args && args[0] ? lessonById(args[0]) : null;
      return l ? l.title : { ja: 'まなぶ', en: 'Learn' };
    },
    back: function (args) { return args && args[0] ? '#/learn' : '#/'; },
    render: function (args) {
      if (args && args[0]) return renderLesson(args[0]);
      return renderList();
    },
    mount: function (root, args) {
      if (args && args[0]) mountLesson(); else mountList();
    },
    /* boot.js already stamps the star, flies it to やること and shows the toast */
    onSave: function () { }
  };
})();
