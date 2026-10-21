/* 巣立ちマップ v4 — tools (owner: PROGRAM)   VISUAL-SPEC §7.7 · MOTION-SPEC §4.2 Tools
 *   #/tools               hub: three ruled rows with 72px spot thumbs, 01–03, title, sub, arrow
 *   #/tools/script/ID?    電話・窓口の台本 (pre-filled for program ID) + 読みあげモード
 *   #/tools/check         契約チェック: a 12-segment gauge that fills one segment after another
 *   #/tools/money         生活費シミュレーター: ひとり暮らし / おこづかい・バイト, live bars
 * Data: data/tools.js (SM.data.scripts / checks / sim / simJr). Everything stays on this phone (SM.store).
 * Storage keys (unchanged): scriptFields, scriptMode, checks, sim, simJr, simMode, scriptSize.
 *
 * Motion (SM.motion is optional; every state is complete without it; html.m-reduce turns all of it off):
 *   page      H1 line-reveals at +80ms, lead fades at +200; the spot illustration plays its own entrance.
 *   台本      topic / mode change: the changed parts cross-fade in place (out 90 · in 220 from 8px, §3.5);
 *             the segment indicator slides (CSS); values you typed are underlined in the script.
 *   読みあげ   the list glides to the next line on the smooth spring (FLIP of the scroll), one ink indicator
 *             moves on snappy, the current line's marker fades in, the position rolls; the flash card is instant.
 *   契約      the box fills and the check draws; the gauge fills one segment per 70ms (scaleX 200ms each);
 *             a level change stamps the level label; the count rolls; help rows FLIP.
 *   生活費    while a slider is dragged everything follows the finger directly (no easing, no rolling);
 *             a keyboard step, a preset, a switch or typing settles the bars on snappy and rolls the totals.
 * Speed (MOTION-SPEC §6 rule 4): during a page transition the first screen renders first and the rest lands
 * in SM.motion.afterTransition, in the same DOM order. Desktop ≥1100: the result sits in a sticky right column. */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.views = SM.views || {};

  function esc(s) { return SM.esc(s); }
  function L(o) { return SM.L(o); }
  function t(k, v) { return SM.t(k, v); }
  function ic(n, c) { try { return SM.icon ? SM.icon(n, c) : ''; } catch (e) { return ''; } }
  function en() { return SM.lang() === 'en'; }
  function D() { return SM.data || {}; }
  function M() { return SM.motion || null; }
  function reduced() {
    try { return M() && M().reduced ? !!M().reduced() : document.documentElement.classList.contains('m-reduce'); } catch (e) { return false; }
  }
  function arrow(d, c) { return SM.ui && SM.ui.arrow ? SM.ui.arrow(d, c) : '<span class="arrow" aria-hidden="true">→</span>'; }
  function illus(name, o) { try { return SM.illus && SM.illus.has && SM.illus.has(name) ? SM.illus(name, o || {}) || '' : ''; } catch (e) { return ''; } }
  function prog(id) { return id && SM.program ? SM.program(id) : null; }
  function lessonOf(id) {
    if (!id) return null;
    if (SM.lesson) return SM.lesson(id) || null;
    var ls = D().lessons || [];
    for (var i = 0; i < ls.length; i++) if (ls[i] && ls[i].id === id) return ls[i];
    return null;
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function shortName(p) {
    var n = L(p.name);
    var s = n.replace(/（[^）]*）|\([^)]*\)/g, '').trim();
    return s || n;
  }
  function telHref(n) { return 'tel:' + String(n).replace(/[^\d+#*]/g, '').replace(/#/g, '%23'); }
  function fmt(n) { return Math.round(Math.abs(n || 0)).toLocaleString(en() ? 'en-US' : 'ja-JP'); }
  function yen(n) { return en() ? '¥' + fmt(n) : fmt(n) + '円'; }
  function answers() { return (SM.state && SM.state.answers) || {}; }
  function junior() { try { return !!(SM.isJunior && SM.isJunior()); } catch (e) { return false; } }
  // under 18 (未成年): 中学生, age 15–17, or 高1・高2
  function minor() { var a = answers(); return junior() || a.age === 'a15' || a.stage === 'hs12'; }

  function stamp(el, o) { if (el && M() && M().stamp) { try { M().stamp(el, o); } catch (e) { } } }
  function roll(el, n, o) {
    if (!el) return;
    var s = typeof n === 'string' ? n : fmt(n);
    if (M() && M().odometer && !(o && o.direct)) { try { M().odometer(el, s); return; } catch (e) { } }
    el.textContent = s;
    el._smOdoShown = s;
  }
  function fitRuby(el) { if (el && SM.fitRuby && window.requestAnimationFrame) requestAnimationFrame(function () { try { SM.fitRuby(el); } catch (e) { } }); }
  function ruby(el) { if (el && SM.applyRuby) { try { SM.applyRuby(el); } catch (e) { } fitRuby(el); } }
  function mountIn(el) { ruby(el); if (M() && M().mount) { try { M().mount(el, { instant: true }); } catch (e) { } } }

  /* the in-place swap (MOTION-SPEC §3.5): the old content leaves in 90ms, the new one rises 8px in 220ms */
  function swapIn(el, html, after) {
    if (!el) return;
    var put = function () {
      el.innerHTML = html;
      mountIn(el);
      if (after) after();
    };
    var m = M();
    if (!m || !m.animate || reduced()) { put(); return; }
    var a = m.animate(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-12px)' }], { duration: 140, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)', fill: 'forwards', key: 'swap' });
    var go = function () {
      put();
      m.animate(el, [{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'none' }], { spring: 'rise', key: 'swap' });
    };
    if (a && a.finished) a.finished.then(go, go); else go();
  }

  // rows arrive one after another (v5: 24px, rise spring, 40–60ms apart, cap 8)
  function cascade(els, step, delay) {
    var m = M();
    if (!m || !m.animate || reduced() || !els) return;
    Array.prototype.forEach.call(els, function (el, i) {
      try { m.animate(el, [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { spring: 'rise', delay: (delay || 0) + Math.min(i, 8) * (step || 50), fill: 'backwards', key: 'casc' }); } catch (e) { }
    });
  }

  SM.strings({
    'tl.kicker': { ja: 'べんりツール', en: 'Tools' },
    'tl.hub': { ja: 'べんりツール', en: 'Tools' },
    'tl.hub.lead': { ja: '窓口・契約・お金の前に', jr: '電話・約束・お金の前に', en: 'Before you call, sign or spend' },
    'tl.script': { ja: '電話・窓口の台本', en: 'Phone & visit script' },
    'tl.script.sub': { ja: '何を言えばいいか、そのまま読める台本を作る', jr: '何を言えばいいか、読むだけの台本を作る', en: 'Make a script you can read out loud' },
    'tl.check': { ja: '契約チェック', en: 'Contract check' },
    'tl.check.sub': { ja: 'サインする前に、危ないサインがないか確かめる', jr: 'お金の約束をする前に、あぶないサインがないか見る', en: 'Check for warning signs before you sign' },
    'tl.money': { ja: '生活費の計算', jr: 'お金のけいさん', en: 'Money calculator' },
    'tl.money.sub': { ja: 'ひと月にいくら残るか、ざっくり計算する。おこづかい・バイト用もあります', jr: 'おこづかいやバイト代で、1か月にいくら残るか計算する', en: 'See what is left each month — for living alone, or pocket money and part-time pay' },
    'tl.private': { ja: '入力した内容は、どこにも送られません。このスマホの中だけで計算しています。', jr: '入力したことは、どこにも送られません。このスマホの中だけで計算しています。', en: 'Nothing you type is sent anywhere. It is all worked out on this phone.' },
    'tl.privateScript': { ja: '入力した内容は、どこにも送られません。このスマホの中だけでつくっています。', jr: '入力したことは、どこにも送られません。このスマホの中だけでつくっています。', en: 'Nothing you type is sent anywhere. The script is made on this phone.' },
    'tl.learnK': { ja: 'まなぶ', en: 'Learn' },
    'tl.learnMin': { ja: '{n}分', en: '{n} min' },
    'tl.learnDone': { ja: '読んだ', en: 'Read' },
    'tl.more': { ja: 'ページを見る', en: 'Open page' },   // FIX-B (F21): it navigates, so it is not 「くわしく」
    // FIX-B (v6)
    'sc.peekK': { ja: '台本の書き出し', en: 'Script starts' },
    'sc.peekGo': { ja: '台本を見る', en: 'See script' },
    'mn.exTag': { ja: '例', en: 'Example' },
    'mn.exTitle': { ja: '例の数字です', en: 'These are example numbers' },
    'mn.exBody': { ja: '自分の数字に変えてみよう。入れた数字は、このスマホの中だけに残ります。', en: 'Change them to your own. What you enter stays on this phone only.' },
    'tl.toResult': { ja: '結果へ', en: 'Result' },

    /* script */
    'sc.lead': { ja: '用件をえらび、空らんを書きかえる', jr: '用件をえらんで、空らんを書きかえよう', en: 'Pick a topic, fill in the blanks' },
    'sc.for': { ja: 'この制度用の台本', en: 'Script for this program' },
    'sc.forOther': { ja: '制度をはずす', en: 'Remove program' },
    'sc.step1': { ja: '用件をえらぶ', en: 'Pick a topic' },
    'sc.mode': { ja: 'どうやって聞く？', en: 'How will you ask?' },
    'sc.phone': { ja: '電話で', en: 'By phone' },
    'sc.visit': { ja: '窓口で', en: 'In person' },
    'sc.step2': { ja: '空らんをうめる', en: 'Fill in the blanks' },
    'sc.step2sub': { ja: '例が入っています。自分のことに書きかえてください。', jr: '「れい」が入っています。自分のことに書きかえてね。', en: 'Examples are filled in. Change them to fit you.' },
    'sc.step3': { ja: '台本', en: 'Your script' },
    'sc.step3sub': { ja: '下線は、あなたが入れたことばです。', en: 'Underlined words are the ones you filled in.' },
    'sc.read': { ja: '大きく読む', en: 'Read it out' },
    'sc.readSub': { ja: '1行ずつ大きく出します。電話しながら使えます。', jr: '1行ずつ大きく出ます。電話しながら使えるよ。', en: 'Shows one line at a time, large. Use it while you call.' },
    'sc.copy': { ja: 'コピー', en: 'Copy' },
    'sc.copied': { ja: '台本をコピーしました', en: 'Script copied' },
    'sc.reset': { ja: '例にもどす', en: 'Reset examples' },
    'sc.asks': { ja: 'このことも聞きたいです。', en: 'このことも聞きたいです。' },
    'sc.tips': { ja: '電話のコツ', en: 'Tips for calling' },
    'sc.legendQ': { ja: '質問', en: 'Question' },
    'sc.legendH': { ja: '困ったときの一言', en: 'If you get stuck' },
    'sc.call': { ja: '電話する', en: 'Call' },
    'sc.jaNote': { ja: '', en: 'Say this in Japanese — the script stays in Japanese so you can read it out or show it to the staff.' },
    'sc.empty': { ja: '準備中です', en: 'Coming soon' },
    'sc.updated': { ja: '台本を更新しました', en: 'Script updated' },

    /* reading mode */
    'rd.title': { ja: '読みあげモード', en: 'Reading mode' },
    'rd.of': { ja: '/ {total}', en: 'of {total}' },
    'rd.next': { ja: '次へ', en: 'Next' },
    'rd.prev': { ja: 'もどる', en: 'Back' },
    'rd.finish': { ja: '読みおわった', en: 'Done' },
    'rd.doneToast': { ja: 'おつかれさまでした。メモを見なおしておこう', en: 'Well done. Look over your notes.' },
    'rd.help': { ja: '困ったら、これを読む', jr: 'こまったら、これを読む', en: 'If you get stuck, read one of these' },
    'rd.flashBack': { ja: '台本にもどる', en: 'Back to script' },
    'rd.smaller': { ja: '文字を小さく', en: 'Smaller text' },
    'rd.bigger': { ja: '文字を大きく', en: 'Larger text' },
    'rd.close': { ja: '読みあげモードを閉じる', en: 'Close reading mode' },
    'rd.awake': { ja: '表示中は画面が消えにくくなります。行をタップするとそこへ移動します。', en: 'The screen stays on while this is open. Tap a line to jump to it.' },

    /* check */
    'ck.lead': { ja: 'サインの前に、当てはまるものをチェック', jr: '約束の前に、当てはまるものをチェック', en: 'Before you sign, tick what applies' },
    'ck.adult': { ja: '18歳からはひとりで契約でき、取り消しにくくなります。', en: 'From 18 you sign alone, and it is harder to cancel.' },
    'ck.minor': { ja: '18歳までは、保護者の同意がない契約は取り消せることがあります。こまったら、すぐ大人に相談を。', jr: '18歳までは、保護者が「いいよ」と言っていない約束は取り消せることがあります。こまったら、すぐ大人に話してね。', en: 'Under 18, contracts without your guardian’s consent can often be cancelled. Worried? Tell an adult now.' },
    'ck.result': { ja: 'チェックの結果', jr: 'けっか', en: 'Result' },
    'ck.count': { ja: '{n}こ チェック', en: '{n} ticked' },
    'ck.lv.safe': { ja: '大きなサインなし', jr: 'いまのところ大丈夫そう', en: 'No big warning signs' },
    'ck.lv.caution': { ja: '注意', jr: 'ちょっと注意', en: 'Be careful' },
    'ck.lv.danger': { ja: '危険', jr: 'あぶない', en: 'Danger' },
    'ck.zone.safe': { ja: '大丈夫そう', en: 'OK' },
    'ck.zone.caution': { ja: '注意', en: 'Careful' },
    'ck.zone.danger': { ja: '危険', jr: 'あぶない', en: 'Danger' },
    'ck.msg.safe': { ja: '控えを必ずもらい、サインの前にだれか1人に見せてください。', jr: 'お金の約束をする前に、だれか大人に見せよう。', en: 'Get a copy, and show someone before you sign.' },
    'ck.msg.caution': { ja: '今日は決めないで。「相談してから返事します」と言って帰って大丈夫。188で相談できます。', jr: '今日は決めないで。「家の人に相談してから」と言ってOK。188にも相談できます。', en: 'Do not decide today. Say "I will answer after I talk to someone" and leave. You can call 188.' },
    'ck.msg.danger': { ja: '進めないでください。払った・サインした後でも、取り返せることがあります。今日のうちに相談を。', jr: 'この話は進めないで。お金をはらっていても、とりもどせることがあります。今日のうちに大人に話そう。', en: 'Do not go ahead. Even if you paid or signed, you may get it back. Talk to someone today.' },
    'ck.crime.t': { ja: 'あなたが犯罪に巻きこまれるおそれがあります', jr: '犯罪にまきこまれるかもしれません', en: 'You could be pulled into a crime' },
    'ck.crime': { ja: '名前を貸す・口座やスマホをわたす・「受け取るだけ」の仕事は、あなたが犯罪をした人として扱われることがあります。もうやってしまっていても、早く相談するほど守られます。おどされている・今あぶないときは 110 へ。', jr: '名前をかす・口座やスマホをわたす・「受け取るだけ」「運ぶだけ」の仕事は、犯罪になります。もうやってしまっていても、早く話すほど守られます。おどされている・今あぶないときは 110 へ。', en: 'Lending your name, handing over an account or phone, or "just pick it up" jobs can make you treated as a criminal. Even if you already did it, the sooner you ask for help the better. If you are threatened or in danger now, call 110.' },
    'ck.where': { ja: '相談できるところ', en: 'Where to get help' },
    'ck.reset': { ja: '全部はずす', en: 'Clear all' },
    'ck.short': { ja: 'あてはまる {n}', en: 'Apply {n}' },
    'ck.info': { ja: '知っておくと守れること', jr: '知っておくと、自分を守れること', en: 'Good to know' },
    'ck.src': { ja: '出典：{org}', en: 'Source: {org}' },
    'ck.110': { ja: '警察（今あぶないとき）', en: 'Police (emergency)' },
    'ck.learnH': { ja: 'サインする前に読んでおきたいこと', jr: '約束する前に、読んでおこう', en: 'Worth reading before you sign' },

    /* money */
    'mn.lead': { ja: '入るお金と出るお金で、残りを計算', en: 'Money in minus money out, each month' },
    'mn.leadJr': { ja: 'もらうお金と使うお金で、残りを計算', jr: 'もらうお金と使うお金で、残りを計算', en: 'Money in minus spending, each month' },
    'mn.mode': { ja: 'どちらを計算する？', en: 'What to work out' },
    'mn.mode.alone': { ja: 'ひとり暮らし', en: 'Living alone' },
    'mn.mode.jr': { ja: 'おこづかい・バイト', en: 'Pocket money' },
    'mn.preset': { ja: '住む場所の目安', en: 'Where you will live' },
    'mn.presetJr': { ja: 'いまの学年の例', en: 'Example for your year' },
    'mn.in': { ja: '入ってくるお金（月）', jr: 'もらうお金（1か月）', en: 'Money in (per month)' },
    'mn.out': { ja: '出ていくお金（月）', jr: '使うお金（1か月）', en: 'Money out (per month)' },
    'mn.outJr': { ja: '使うお金（1か月）', en: 'Spending (per month)' },
    'mn.bal': { ja: 'ひと月の収支', jr: '1か月に残るお金', en: 'Monthly balance' },
    'mn.balJr': { ja: '1か月に残るお金', en: 'Left each month' },
    'mn.vs.in': { ja: '入る', jr: 'もらう', en: 'In' },
    'mn.vs.out': { ja: '出る', jr: '使う', en: 'Out' },
    'mn.bd': { ja: '出ていくお金の内わけ', jr: '使うお金の内わけ', en: 'Where it goes' },
    'mn.year': { ja: '1年で {n}円 たまる', en: '¥{n} saved in a year' },
    'mn.yearShort': { ja: '1年で {n}円 足りない', jr: '1年で {n}円 たりない', en: '¥{n} short over a year' },
    'mn.sr': { ja: '{label}：{v}（入る {a} − 出る {b}）', en: '{label}: {v} (in {a} − out {b})' },
    'mn.short': { ja: '毎月 {n} 足りません', jr: '毎月 {n} たりません', en: 'Short by {n} a month' },
    'mn.shortBody': { ja: '貯金を使う前に、下の支援を見て。足りないのは、あなたのせいではありません。', en: 'Check the support below first. Being short is not your fault.' },
    'mn.thin': { ja: '黒字ですが、よゆうは {n} です', en: 'In the black, but only {n} spare' },
    'mn.thinBody': { ja: '病気や故障1回で赤字に。少しずつ「もしもの時のお金」を。', en: 'One illness could put you in the red. Start a small fund.' },
    'mn.ok': { ja: '毎月 {n} のよゆうがあります', en: '{n} spare each month' },
    'mn.okBody': { ja: '最初の目標は、家賃2か月分の貯金。', en: 'First goal: savings of 2 months\' rent.' },
    'mn.jr.short': { ja: '毎月 {n} 足りません', jr: '毎月 {n} たりません', en: 'Short by {n} a month' },
    'mn.jr.shortBody': { ja: '「必要？ほしいだけ？」で、へらせるものを。足りないときは大人に相談を。', jr: '「ひつよう？ほしいだけ？」で、へらせるものを。たりないときは大人に話してね。', en: 'Ask "need or want?". If you are short, talk to an adult.' },
    'mn.jr.thin': { ja: 'のこりは {n} です', jr: 'のこりは {n} です', en: 'Only {n} left' },
    'mn.jr.thinBody': { ja: 'ほぼ使い切り。買う前に「必要？ほしいだけ？」', jr: 'ほとんど使い切り。買う前に「ひつよう？ほしいだけ？」', en: 'Nearly all spent. Ask "need or want?"' },
    'mn.jr.ok': { ja: '毎月 {n} 残ります', jr: '毎月 {n} 残るよ', en: '{n} left each month' },
    'mn.jr.okBody': { ja: '1年で {y}。目標を決めてためよう。', jr: '1年で {y}。目標を決めてためよう。', en: 'A year: {y}. Pick a goal.' },
    'mn.shien': { ja: '自立支援資金の「生活費」を入れる', en: 'Include the living-cost support (students)' },
    'mn.shienSub': { ja: '進学する人 月{n}・借りる形', en: 'Students, {n}/mo, a loan' },
    'mn.yachin': { ja: '自立支援資金の「家賃」を入れる', en: 'Include the rent support' },
    'mn.yachinSub': { ja: '家賃と同じ額（地域の上限あり）', en: 'Your rent (local caps apply)' },
    'mn.reset': { ja: '最初の数字にもどす', en: 'Reset' },
    'mn.amount': { ja: '{label}の金額', en: '{label} amount' },
    'mn.tips': { ja: '見ておきたい支援', jr: '知っておきたい支援', en: 'Support worth checking' },
    'mn.learnH': { ja: 'お金のきほんを読む', jr: 'お金のきほんを読もう', en: 'Money basics' },
    'mn.lessonLink': { ja: '「{title}」を読む', en: 'Read “{title}”' },
    'mn.t.shikin': { ja: '生活費・家賃を借りられる', en: 'Living costs and rent' },
    'mn.t.jukyo': { ja: '収入が減ったら家賃の支援', en: 'Rent help if income fell' },
    'mn.t.hogo': { ja: 'それでも足りないとき。申請は権利', en: 'If still short — your right' },
    'mn.t.sodan': { ja: 'お金の困りごとの相談窓口', en: 'Help with money problems' },
    'mn.t.rent': { ja: '家賃が収入の35%超え', en: 'Rent over 35% of income' },
    'mn.t.rent2': { ja: '借りにくい人向けの住まい', en: 'Homes for hard-to-rent' },
    'mn.t.kokuho': { ja: '保険0円？収入が少ないと安く', en: '¥0 insurance? Cheaper on low pay' },
    'mn.t.nenkin': { ja: '払えないときは免除を申請', en: 'Apply for an exemption' },
    'mn.t.jasso': { ja: '返さなくていい奨学金', en: 'Grant scholarship' },
    'mn.t.kyufukin': { ja: '教科書代などに。返さなくていい', en: 'For textbooks. No payback' },
    'mn.t.juken': { ja: '塾・受験料。合格で返済なしも', en: 'Cram school, exam fees' },
    'mn.wage': { ja: 'バイト代を時給から計算する', jr: 'バイト代を時給から計算する', en: 'Work out pay from an hourly wage' },
    'mn.wage.yen': { ja: '時給', en: 'Hourly wage' },
    'mn.wage.hours': { ja: '1日の時間', en: 'Hours a day' },
    'mn.wage.days': { ja: '1か月の日数', en: 'Days a month' },
    'mn.wage.unitH': { ja: '時間', en: 'h' },
    'mn.wage.unitD': { ja: '日', en: 'days' },
    'mn.wage.apply': { ja: 'バイト代に入れる', en: 'Use this' },
    'mn.wage.applied': { ja: 'バイト代に入れました', en: 'Added as part-time pay' },
    'mn.wage.note': { ja: '東京都の最低賃金 時給{n}（{d}から）。これより低いのは違法。', jr: '東京都の時給は{n}より下げてはいけないきまり（{d}から）。', en: 'Tokyo minimum wage: {n}/h (from {d}). Less is illegal.' }
  });

  /* ================================================================= shared pieces */
  var ILLUS = { script: 'tools-script', check: 'tools-check', money: 'tools-money' };
  // masthead: spot illustration (160 phone above the H1 · 240 desktop right of it), kicker, H1, lead
  function head(o) {
    var art = o.il ? illus(o.il, { size: 'spot', cls: 'tl-il' }) : '';
    return '<header class="tl-head' + (art ? ' has-il' : '') + '">' +
      (art ? '<div class="tl-art">' + art + '</div>' : '') +
      '<div class="tl-head-text">' +
        (o.kicker === false ? '' : '<p class="tl-kicker"><a href="#/tools">' + esc(t('tl.kicker')) + '</a></p>') +
        '<h1 class="tl-title" data-reveal="line" data-reveal-delay="80">' + esc(o.title) + '</h1>' +
        (o.lead ? '<p class="tl-lead" id="tl-lead" data-reveal="fade" data-reveal-delay="200">' + esc(o.lead) + '</p>' : '') +
      '</div></header>';
  }
  function secHead(n, id, title, o) {
    o = o || {};
    // only the script tool's sections are a sequence (用件 → 空らん → 台本, o.seq): they keep their numerals;
    // the check's groups and the money tool's in / out are not steps, so they get none
    return SM.ui.sectionHeader(title, { num: n || null, seq: !!(n && o.seq), id: id, sub: o.sub, action: o.action });
  }
  function actBtn(act, label, attrs) {
    return '<button type="button" class="section-action tl-act" data-act="' + act + '"' + (attrs || '') + '><span>' + esc(label) + '</span></button>';
  }

  /* まなぶ: the same rows as the program page (72px cover thumb) */
  function learnBlock(ids, heading) {
    var ls = (ids || []).map(lessonOf).filter(Boolean);
    if (!ls.length) return '';
    return '<section class="tl-learn cv" aria-labelledby="tl-h-learn">' + SM.ui.sectionHeader(heading, { id: 'tl-h-learn' }) +
      '<ul class="pg-lessons" data-reveal-stagger="50">' + ls.map(function (l) {
        var done = SM.isLearned ? SM.isLearned(l.id) : false;
        var thumb = illus('learn-cover-' + l.id, { size: 'thumb', animate: false }) || SM.ui.catIcon(l.cat || 'money', 'sm');
        return '<li><a class="pg-lesson" href="#/learn/' + encodeURIComponent(l.id) + '" data-press="ink">' +
          '<span class="pg-lesson-thumb">' + thumb + '</span>' +
          '<span class="pg-lesson-text"><span class="pg-lesson-k"><span>' + esc(t('tl.learnK')) + '</span><span class="pg-sep" aria-hidden="true">／</span>' +
            '<span>' + esc(t('tl.learnMin', { n: l.minutes || 2 })) + '</span>' + (done ? SM.ui.tag(t('tl.learnDone'), 'free') : '') + '</span>' +
            '<span class="pg-lesson-t">' + esc(L(l.title)) + '</span></span>' + arrow('r', 'pg-lesson-go') + '</a></li>';
      }).join('') + '</ul></section>';
  }

  /* ---------------------------------------------------------------- deferred rendering (first screen first) */
  var DEFER = null;   // { key, parts: {name: html} }
  function canDefer(key) {
    var m = M();
    if (!m || typeof m.afterTransition !== 'function' || typeof m.inTransition !== 'function') return false;
    try { if (!m.inTransition()) return false; } catch (e) { return false; }
    var r = SM.route || {};
    if (r.kind === 'back' && (r.restoreY || 0) > 160) return false;
    var cur = document.querySelector('#view .tl-page[data-tool]');
    if (cur && cur.getAttribute('data-tool') === key) return false;
    return true;
  }
  function slot(name, html, defer) {
    if (!html) return '';
    if (!defer) return html;
    DEFER.parts[name] = html;
    return '<div class="tl-defer" data-defer="' + name + '"></div>';
  }
  function fillDeferred(root, key, then) {
    var d = DEFER;
    if (!d || d.key !== key) return;
    DEFER = null;
    var instant = !!(SM.route && SM.route.instant);
    Array.prototype.forEach.call(root.querySelectorAll('[data-defer]'), function (el) {
      var html = d.parts[el.getAttribute('data-defer')];
      if (!html) return;
      el.innerHTML = html;
      try { if (SM.applyRuby) SM.applyRuby(el); } catch (e) { }
      if (M() && M().mount) { try { M().mount(el, { instant: instant }); } catch (e) { } }
    });
    fitRuby(root);
    if (then) then();
  }

  /* ---------------------------------------------------------------- the floating summary (check / money)
   * Fixed above the tab bar while the result is off the screen; gone once you reach it. check: only while the
   * result is still below. money (o.both): the result comes first on a phone, so the bar also shows once the big
   * number has scrolled away above (the arrow then points up). One rAF-throttled passive scroll check, so a jump
   * never strands it. Desktop ≥1100: never (the result column stays in view). */
  var FLOAT = null;
  function stopFloat() { if (FLOAT) { window.removeEventListener('scroll', FLOAT.fn); window.removeEventListener('resize', FLOAT.fn); FLOAT = null; } }
  function chromeBottom() {
    var b = 0;
    ['.appbar', '.subbar'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el || el.hidden) return;
      var pos = '';
      try { pos = getComputedStyle(el).position; } catch (e) { }
      if (pos === 'fixed' || pos === 'sticky') b = Math.max(b, el.getBoundingClientRect().bottom);
    });
    return b;
  }
  function wireFloat(root, targetId, floatId, o) {
    o = o || {};
    stopFloat();
    var target = root.querySelector('#' + targetId), fl = root.querySelector('#' + floatId);
    if (!target || !fl) return;
    var watch = (o.watch && root.querySelector('#' + o.watch)) || target;
    var on = null, up = null, ticking = false;
    var set = function (v) {
      if (v === on) return;
      on = v;
      fl.classList.toggle('is-on', v);
      fl.setAttribute('aria-hidden', v ? 'false' : 'true');
      try { fl.inert = !v; } catch (e) { }
    };
    var paint = function () {
      ticking = false;
      if (!fl.isConnected) { stopFloat(); return; }
      if (!watch.isConnected) watch = root.querySelector('#' + (o.watch || targetId)) || target;
      var vh = window.innerHeight || 800;
      var wide = window.matchMedia && window.matchMedia('(min-width: 1100px)').matches;
      var r = watch.getBoundingClientRect();
      var below = r.top > vh - 140;
      var above = !!o.both && r.bottom < chromeBottom() + 8;
      // the arrow turns only while the bar is hidden or on its way in, never under the finger
      if (above !== up && (!on || below || above)) { up = above; fl.classList.toggle('is-up', above); }
      set(!wide && (below || above));
    };
    fl.classList.add('is-auto');
    set(false);
    var fn = function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
    FLOAT = { fn: fn };
    window.addEventListener('scroll', fn, { passive: true });
    window.addEventListener('resize', fn, { passive: true });
    var m = M();
    if (m && m.afterTransition) m.afterTransition(function () { setTimeout(fn, 200); }); else setTimeout(fn, 200);
  }

  /* desktop: a side column stays in view when it fits the screen (else only its first block does) */
  var SIDE = null;
  function wireSide(root) {
    if (SIDE) { window.removeEventListener('resize', SIDE); SIDE = null; }
    var side = root.querySelector('.tl-side');
    if (!side || !window.matchMedia) return;
    var mq = window.matchMedia('(min-width: 1100px)');
    var fit = function () {
      if (!side.isConnected) { window.removeEventListener('resize', fit); if (SIDE === fit) SIDE = null; return; }
      if (!mq.matches) { side.classList.remove('is-stick'); return; }
      // measure the column's own height (it is stretched to the row otherwise)
      side.classList.add('is-measure');
      var h = side.getBoundingClientRect().height;
      side.classList.remove('is-measure');
      side.classList.toggle('is-stick', h + 104 <= (window.innerHeight || 800));
    };
    SIDE = fit;
    window.addEventListener('resize', fit, { passive: true });
    fit();
  }

  /* ================================================================= hub */
  function hub() {
    var rows = [['script', '#/tools/script'], ['check', '#/tools/check'], ['money', '#/tools/money']];
    if (junior()) rows = [rows[2], rows[1], rows[0]];
    return '<div class="tl-page tl-hubpage" data-tool="hub">' + head({ title: t('tl.hub'), lead: t('tl.hub.lead'), kicker: false }) +
      '<ol class="tl-hub" data-reveal-stagger="60">' + rows.map(function (r, i) {
        var th = illus(ILLUS[r[0]], { size: 'thumb', animate: false });
        return '<li><a class="tl-hub-row" href="' + r[1] + '" data-press="ink">' +
          '<span class="tl-hub-thumb">' + th + '</span>' +
          '<span class="tl-hub-text"><span class="tl-hub-n" aria-hidden="true">' + pad(i + 1) + '</span>' +
            '<span class="tl-hub-t">' + esc(t('tl.' + r[0])) + '</span><span class="sr-only">' + esc(t('tl.' + r[0] + '.sub')) + '</span></span>' +
          arrow('r', 'tl-hub-go') + '</a></li>';
      }).join('') + '</ol></div>';
  }

  /* ================================================================= script */
  var SCR = { key: null, pid: undefined, mode: null };
  function scripts() { return D().scripts || {}; }
  function scriptKeys() {
    var S = scripts(), jr = junior();
    return Object.keys(S).map(function (k, i) { return { k: k, i: i, r: S[k].jr ? (jr ? 0 : 2) : 1 }; })
      .sort(function (a, b) { return a.r - b.r || a.i - b.i; }).map(function (x) { return x.k; });
  }
  function pickScript(p) {
    var S = scripts();
    if (!p) return junior() && S.otona ? 'otona' : (S.madoguchi ? 'madoguchi' : scriptKeys()[0]);
    var cat = (p.cat && p.cat[0]) || '';
    if ((p.kind === 'hotline' || cat === 'consult') && S.sodan) return 'sodan';
    if (cat === 'work' && p.kind === 'service' && S.hellowork) return 'hellowork';
    return S.madoguchi ? 'madoguchi' : scriptKeys()[0];
  }
  function fieldStoreKey(key, p) { return p ? key + ':' + p.id : key; }
  function fieldVals(key, p) {
    var s = scripts()[key] || {};
    var all = SM.store.get('scriptFields', {}) || {};
    var saved = all[fieldStoreKey(key, p)] || {};
    var v = {};
    (s.fields || []).forEach(function (f) {
      var d = f.def;
      if (p && f.k === 'seido') d = (p.name && p.name.ja ? p.name.ja : L(p.name)).replace(/（[^）]*）|\([^)]*\)/g, '').trim() || shortName(p); // the script is spoken in Japanese
      v[f.k] = Object.prototype.hasOwnProperty.call(saved, f.k) ? saved[f.k] : d;
    });
    return v;
  }
  function scriptText(key, p, mode) {
    var s = scripts()[key];
    if (!s) return '';
    var txt = '';
    try { txt = s.tpl(fieldVals(key, p), { mode: mode, program: p }); } catch (e) { txt = ''; }
    var asks = p && Array.isArray(p.ask) ? p.ask.filter(Boolean).filter(function (q) {
      var h = String(q && q.ja ? q.ja : L(q)).split(/？|\?/)[0].trim();
      return h && txt.indexOf(h) === -1;
    }) : [];
    if (asks.length && key !== 'yakusho') {
      // insert the program's own questions before the closing help phrases
      var parts = txt.split('\n\n');
      var tail = parts.length > 1 && /^（/.test(parts[parts.length - 1]) ? parts.pop() : null;
      parts.push(SM.t('sc.asks') + '\n' + asks.map(function (q) { return q && q.ja ? q.ja : L(q); }).join('\n'));
      if (tail) parts.push(tail);
      txt = parts.join('\n\n');
    }
    return txt;
  }
  function lineKind(line) {
    var s = line.trim();
    if (!s) return 'gap';
    if (/^（.*）$/.test(s) && !/^（20歳/.test(s)) return 'help';
    if (/？/.test(s)) return 'q';
    return 'say';
  }
  function parseLines(text) {
    return String(text || '').split('\n').map(function (line) { return { k: lineKind(line), s: line.trim() }; });
  }
  function helpText(s) { return s.replace(/^（|）$/g, ''); }
  // the words you typed, as they appear in the script (the template trims a final 。)
  function fillWords(key, p) {
    var v = fieldVals(key, p);
    return Object.keys(v).map(function (k) { return String(v[k] == null ? '' : v[k]).trim().replace(/[。．.、]+$/, ''); })
      .filter(function (x) { return x.length >= 2; }).sort(function (a, b) { return b.length - a.length; });
  }
  function markFills(s, words) {
    var ranges = [];
    (words || []).forEach(function (w) {
      var i = 0;
      while ((i = s.indexOf(w, i)) !== -1) {
        var a = i, b = i + w.length;
        if (!ranges.some(function (r) { return a < r[1] && b > r[0]; })) ranges.push([a, b]);
        i = b;
      }
    });
    if (!ranges.length) return esc(s);
    ranges.sort(function (x, y) { return x[0] - y[0]; });
    var out = '', last = 0;
    ranges.forEach(function (r) { out += esc(s.slice(last, r[0])) + '<span class="scr-fill">' + esc(s.slice(r[0], r[1])) + '</span>'; last = r[1]; });
    return out + esc(s.slice(last));
  }
  function scriptHtml(text, words) {
    var out = '', help = [];
    function flush() {
      if (!help.length) return;
      out += '<div class="scr-help"><p class="scr-help-k">' + esc(t('sc.legendH')) + '</p><ul class="scr-help-list">' +
        help.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul></div>';
      help = [];
    }
    parseLines(text).forEach(function (x) {
      if (x.k === 'help') { help.push(helpText(x.s)); return; }
      flush();
      if (x.k === 'gap') out += '<span class="scr-gap" aria-hidden="true"></span>';
      else if (x.k === 'q') out += '<p class="scr-line scr-q"><span class="scr-q-mark" aria-hidden="true">問</span><span class="scr-q-t">' + markFills(x.s, words) + '</span></p>';
      else out += '<p class="scr-line">' + markFills(x.s, words) + '</p>';
    });
    flush();
    return out;
  }
  function modeHtml(s) {
    if (!s || !s.modes) return '';
    return '<p class="sr-only" id="scr-mode-l">' + esc(t('sc.mode')) + '</p>' +
      SM.ui.seg([{ label: t('sc.phone'), value: 'phone', pressed: SCR.mode === 'phone', icon: 'phone' }, { label: t('sc.visit'), value: 'visit', pressed: SCR.mode === 'visit', icon: 'pin' }], { act: 'scr-mode', label: t('sc.mode') });
  }
  function fieldsHtml(key, p) {
    var s = scripts()[key] || {};
    var vals = fieldVals(key, p);
    return (s.fields || []).map(function (f) {
      var id = 'scr-f-' + f.k;
      return '<div class="field"><label for="' + id + '">' + esc(L(f.label)) + '</label>' +
        '<input class="input" type="text" id="' + id + '" data-act="scr-field" data-k="' + esc(f.k) + '" value="' + esc(vals[f.k]) + '" autocomplete="off" enterkeyhint="done" lang="ja">' +
        (f.hint ? '<p class="help">' + esc(L(f.hint)) + '</p>' : '') + '</div>';
    }).join('');
  }
  function callHtml(p) {
    if (!(p && p.contact && p.contact.phone && SCR.mode === 'phone')) return '';
    return '<a class="btn btn-secondary btn-block scr-call" href="' + esc(telHref(p.contact.phone)) + '" data-press>' + ic('phone') + '<span>' + esc(t('sc.call')) + '</span><b class="scr-call-n" data-noruby>' + esc(p.contact.phone) + '</b></a>';
  }

  function scriptView(args, defer) {
    var S = scripts();
    var keys = scriptKeys();
    if (!keys.length) return '<div class="tl-page" data-tool="script">' + head({ title: t('tl.script'), il: ILLUS.script }) + SM.ui.empty(t('sc.empty'), '', '') + '</div>';
    var p = prog(args[1]);
    var pid = p ? p.id : null;
    if (SCR.pid !== pid || !S[SCR.key]) { SCR.pid = pid; SCR.key = pickScript(p); }
    if (!SCR.mode) SCR.mode = SM.store.get('scriptMode', 'phone') === 'visit' ? 'visit' : 'phone';
    var key = SCR.key, s = S[key];
    var text = scriptText(key, p, SCR.mode);

    var ctx = '';
    if (p) {
      var cat = (p.cat && p.cat[0]) || 'procedures';
      ctx = '<div class="scr-ctx">' + SM.ui.catIcon(cat, 'sm') +
        '<div class="scr-ctx-text"><span class="scr-ctx-k">' + esc(t('sc.for')) + '</span><a class="scr-ctx-name" href="#/p/' + encodeURIComponent(p.id) + '">' + esc(shortName(p)) + '</a></div>' +
        '<a class="scr-ctx-x" href="#/tools/script">' + esc(t('sc.forOther')) + '</a></div>';
    }
    var chips = '<div class="chips scr-keys" role="group" aria-label="' + esc(t('sc.step1')) + '">' + keys.map(function (k) {
      return SM.ui.chip(L(S[k].short || S[k].label), { act: 'scr-key', pressed: k === key, attrs: 'data-key="' + esc(k) + '" data-press' });
    }).join('') + '</div>';
    var tips = (D().scriptTips || []).map(function (x) { return '<li>' + esc(L(x)) + '</li>'; }).join('');

    var left = '<section class="tl-sec scr-setup" aria-labelledby="scr-h1">' + secHead(1, 'scr-h1', t('sc.step1'), { seq: true }) +
        '<div class="tl-sec-body">' + chips + '<p class="scr-label-title" id="scr-label">' + esc(L(s.label)) + '</p>' + peekHtml(text) +
        '<div class="scr-mode" id="scr-mode">' + modeHtml(s) + '</div></div>' +
      '</section>' +
      '<section class="tl-sec" aria-labelledby="scr-h2">' + secHead(2, 'scr-h2', t('sc.step2'), { seq: true, action: actBtn('scr-reset', t('sc.reset')) }) +
        '<div class="tl-sec-body">' +
        '<div class="scr-fields" id="scr-fields">' + fieldsHtml(key, p) + '</div></div>' +
      '</section>';
    var right = '<section class="tl-sec scr-out-wrap" aria-labelledby="scr-h3">' + secHead(3, 'scr-h3', t('sc.step3'), { seq: true }) +
        '<div class="tl-sec-body">' + (en() ? '<p class="tl-sub scr-ja-note">' + esc(t('sc.jaNote')) + '</p>' : '') +
        '<div class="scr-paper"><div class="scr-out" id="scr-out" lang="ja">' + scriptHtml(text, fillWords(key, p)) + '</div></div>' +
        '<p class="sr-only" role="status" id="scr-status"></p>' +
        '<div class="scr-actions">' +
          '<button type="button" class="btn btn-ink btn-lg btn-block scr-read-btn" data-act="scr-read" data-press aria-describedby="scr-read-d"><span class="btn-label"><span>' + esc(t('sc.read')) + '</span></span>' + arrow('r') + '</button>' +
          '<span class="sr-only" id="scr-read-d">' + esc(t('sc.readSub')) + '</span>' +
          '<div class="scr-actions-row"><button type="button" class="btn btn-secondary" id="scr-copy" data-act="copy" data-text="' + esc(text) + '" data-msg="' + esc(t('sc.copied')) + '" data-press>' + ic('copy') + '<span>' + esc(t('sc.copy')) + '</span></button>' +
          '<span class="scr-call-slot" id="scr-call">' + callHtml(p) + '</span></div>' +
        '</div></div>' +
      '</section>';
    var rest = tips ? '<details class="disclose scr-tips"><summary><span>' + esc(t('sc.tips')) + '</span></summary><ul class="bullets">' + tips + '</ul></details>' : '';
    return '<div class="tl-page tl-scriptpage wide-layout" data-tool="script">' +
      head({ title: t('tl.script'), lead: t('sc.lead'), il: ILLUS.script }) + ctx +
      '<div class="tl-split">' +
        '<div class="tl-main">' + left + '</div>' +
        '<div class="tl-side">' + slot('right', right, defer) + '</div>' +
      '</div>' + slot('rest', rest, defer) + '</div>';
  }

  /* FIX-B (F37): the script is two screens below the chips on a phone — its first line shows here, so a tap on
     another 用件 visibly changes something where the eye is, with a jump to the whole script */
  function firstLine(text) {
    var l = parseLines(text).filter(function (x) { return x.k === 'say' || x.k === 'q'; })[0];
    return l ? l.s : '';
  }
  function peekHtml(text) {
    return '<div class="scr-peek" id="scr-peek"><p class="scr-peek-k">' + esc(t('sc.peekK')) + '</p>' +
      '<p class="scr-peek-t" id="scr-peek-t" lang="ja">' + esc(firstLine(text)) + '</p>' +
      '<button type="button" class="scr-peek-go" data-act="tl-scroll" data-target="scr-h3"><span>' + esc(t('sc.peekGo')) + '</span>' + arrow('d') + '</button></div>';
  }
  function currentProgram() { return prog(SCR.pid); }
  function refreshScript(fade) {
    var p = currentProgram();
    var text = scriptText(SCR.key, p, SCR.mode);
    var out = document.getElementById('scr-out');
    var html = scriptHtml(text, fillWords(SCR.key, p));
    if (out) { if (fade) swapIn(out, html, function () { cascade(out.querySelectorAll('.scr-line, .scr-help'), 40, 120); }); else { out.innerHTML = html; ruby(out); } }
    var cp = document.getElementById('scr-copy');
    if (cp) cp.setAttribute('data-text', text);
    var pk = document.getElementById('scr-peek-t'), line = firstLine(text);
    if (pk && pk.textContent !== line) {
      var m = M();
      if (fade && m && m.swapText && !reduced()) { try { m.swapText(pk, line); } catch (e) { pk.textContent = line; } } else pk.textContent = line;
      var go = document.querySelector('#scr-peek .scr-peek-go .arrow');
      if (fade && go && m && m.animate && !reduced()) { try { m.animate(go, [{ transform: 'none' }, { transform: 'translateY(5px)', offset: 0.4 }, { transform: 'none' }], { duration: 520, delay: 160, easing: 'cubic-bezier(0.2, 0, 0, 1)', key: 'peek-go' }); } catch (e) { } }
    }
  }

  SM.on('scr-key', function (el) {
    var k = el.getAttribute('data-key');
    var S = scripts();
    if (!S[k] || k === SCR.key) return;
    SCR.key = k;
    var root = document.querySelector('#view .tl-scriptpage');
    if (!root) { SM.render(); return; }
    // chips: the ink fill is the state (no re-render, focus stays on the chip)
    Array.prototype.forEach.call(root.querySelectorAll('.scr-keys [data-key]'), function (b) {
      var on = b.getAttribute('data-key') === k;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var p = currentProgram();
    swapIn(root.querySelector('#scr-label'), esc(L(S[k].label)));
    // the 電話で / 窓口で segment only changes when the new topic has it and the old one did not (or the reverse)
    var md = root.querySelector('#scr-mode');
    if (md && !!S[k].modes !== !!md.querySelector('.seg')) swapIn(md, modeHtml(S[k]));
    swapIn(root.querySelector('#scr-fields'), fieldsHtml(k, p));
    refreshScript(true);
  });
  SM.on('scr-mode', function (el) {
    var m = el.getAttribute('data-value') === 'visit' ? 'visit' : 'phone';
    if (m === SCR.mode) return;
    SCR.mode = m;
    SM.store.set('scriptMode', m);
    var seg = el.parentNode;
    if (seg) Array.prototype.forEach.call(seg.children, function (b) { if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', b === el ? 'true' : 'false'); });
    refreshScript(true);
    var slotEl = document.getElementById('scr-call');
    if (slotEl) swapIn(slotEl, callHtml(currentProgram()));
  });
  var scrStatusT = null;
  SM.on('scr-field', function (el) {
    var p = currentProgram();
    var all = SM.store.get('scriptFields', {}) || {};
    var sk = fieldStoreKey(SCR.key, p);
    all[sk] = all[sk] || {};
    all[sk][el.getAttribute('data-k')] = el.value;
    SM.store.set('scriptFields', all);
    refreshScript(false);
    // the script is not a live region (it would be re-read on every keystroke): one short note once typing stops
    clearTimeout(scrStatusT);
    scrStatusT = setTimeout(function () {
      var st = document.getElementById('scr-status'); if (!st) return;
      st.textContent = '';
      setTimeout(function () { st.textContent = t('sc.updated'); }, 50);
    }, 1000);
  });
  SM.on('scr-reset', function () {
    var p = currentProgram();
    var all = SM.store.get('scriptFields', {}) || {};
    delete all[fieldStoreKey(SCR.key, p)];
    SM.store.set('scriptFields', all);
    var f = document.getElementById('scr-fields');
    if (!f) { SM.render(); return; }
    swapIn(f, fieldsHtml(SCR.key, p));
    refreshScript(true);
  });

  /* ---- 読みあげモード: full screen, one line at a time, help phrases one tap away, screen kept awake ---- */
  var RD = { el: null, i: 0, n: 0, helps: [], opener: null, wake: null, size: 1 };
  (function () { var s = +SM.store.get('scriptSize', 1); RD.size = s >= 0 && s <= 3 ? s : 1; })();
  function requestWake() {
    try {
      if (navigator.wakeLock && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then(function (w) { RD.wake = w; }, function () { });
      }
    } catch (e) { }
  }
  var SHELL = ['.appbar', '.subbar', '#view', '.tabbar', '.skip'];
  function shell(off) {
    SHELL.forEach(function (s) {
      var x = document.querySelector(s);
      if (!x) return;
      if (off) { x.setAttribute('aria-hidden', 'true'); try { x.inert = true; } catch (e) { } }
      else { x.removeAttribute('aria-hidden'); try { x.inert = false; } catch (e) { } }
    });
  }
  function closeRead(silent) {
    if (!RD.el) return;
    try { if (RD.wake) RD.wake.release(); } catch (e) { }
    RD.wake = null;
    var el = RD.el; RD.el = null;
    document.body.classList.remove('tl-reading');
    try { document.documentElement.style.overflow = ''; } catch (e) { }
    shell(false);
    if (!silent && RD.opener && document.contains(RD.opener)) { try { RD.opener.focus({ preventScroll: true }); } catch (e) { } }
    var m = M();
    var a = !silent && m && m.animate ? m.animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'linear', fill: 'forwards' }) : null;
    var rm = function () { if (el.parentNode) el.parentNode.removeChild(el); };
    if (a && a.finished) a.finished.then(rm, rm); else rm();
  }
  function setLine(i, o) {
    o = o || {};
    if (!RD.el || !RD.n) return;
    var prev = RD.i;
    RD.i = Math.max(0, Math.min(RD.n - 1, i));
    var el = RD.el, m = M(), still = o.instant || reduced() || !m;
    Array.prototype.forEach.call(el.querySelectorAll('.rd-li'), function (li) {
      var k = +li.getAttribute('data-i');
      li.classList.toggle('is-now', k === RD.i);
      li.classList.toggle('is-done', k < RD.i);
      var b = li.querySelector('.rd-line');
      if (b) { if (k === RD.i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); }
    });
    // position: the number rolls like a station board
    var pos = el.querySelector('#rd-pos-n');
    if (pos) { if (still || !m.odometer) { pos.textContent = String(RD.i + 1); pos._smOdoShown = String(RD.i + 1); } else m.odometer(pos, String(RD.i + 1)); }
    var last = RD.i === RD.n - 1;
    var nx = el.querySelector('.rd-next');
    if (nx) {
      var lab = nx.querySelector('.rd-next-t'), want = t(last ? 'rd.finish' : 'rd.next');
      if (lab && (lab._smSwapNew ? lab._smSwapNew.textContent : lab.textContent) !== want) {
        if (!still && m.swapText) m.swapText(lab, want); else lab.textContent = want;
      }
      nx.classList.toggle('is-finish', last);
    }
    var pv = el.querySelector('.rd-prev');
    if (pv) pv.disabled = RD.i === 0;
    var cur = el.querySelector('.rd-li.is-now');
    var sc = el.querySelector('.rd-scroll'), list = el.querySelector('.rd-lines');
    if (cur && sc) {
      // the glide: jump the scroll to where the line sits at 30% of the screen, then FLIP the list from where
      // it was on the smooth spring, so the text travels instead of the page snapping
      var s0 = sc.scrollTop;
      var target = Math.max(0, cur.offsetTop + (list ? list.offsetTop : 0) - sc.clientHeight * 0.3);
      sc.scrollTop = target;
      var s1 = sc.scrollTop;
      if (!still && list && Math.abs(s1 - s0) > 1) m.animate(list, [{ transform: 'translateY(' + (s1 - s0) + 'px)' }, { transform: 'none' }], { spring: 'smooth', key: 'glide' });
    }
    // one ink indicator for the whole list: it moves to the current line on snappy
    var ind = el.querySelector('.rd-ind'), btn = cur && cur.querySelector('.rd-line');
    if (ind && btn) {
      var y = btn.offsetTop, h = btn.offsetHeight;
      var tf = 'translateY(' + y + 'px) scaleY(' + (h / 100) + ')';
      var was = ind.style.transform;
      ind.style.transform = tf;
      if (!still && was && was !== tf && prev !== RD.i) m.animate(ind, [{ transform: was }, { transform: tf }], { spring: 'snappy', key: 'ind' });
    }
    if (o.focus && cur) { var cb = cur.querySelector('.rd-line'); if (cb) { try { cb.focus({ preventScroll: true }); } catch (e) { } } }
  }
  function setReadSize(d) {
    RD.size = Math.max(0, Math.min(3, RD.size + d));
    SM.store.set('scriptSize', RD.size);
    if (RD.el) RD.el.setAttribute('data-size', RD.size);
    setLine(RD.i, { instant: true });
  }
  // the help phrase fills the screen at once (at a counter speed wins: no animation)
  function flash(i) {
    if (!RD.el) return;
    var f = RD.el.querySelector('#rd-flash');
    if (!f) return;
    if (i == null) {
      f.hidden = true;
      var back = RD.el.querySelector('.rd-help-b[data-i="' + f.getAttribute('data-from') + '"]');
      if (back) { try { back.focus({ preventScroll: true }); } catch (e) { } }
      return;
    }
    f.querySelector('#rd-flash-t').textContent = RD.helps[i] || '';
    ruby(f);
    f.setAttribute('data-from', i);
    f.hidden = false;
    var x = f.querySelector('.rd-flash-x');
    if (x) { try { x.focus({ preventScroll: true }); } catch (e) { } }
  }
  function openRead(btn) {
    closeRead(true);
    RD.opener = btn;
    var lines = [], para = 0, prevGap = false;
    RD.helps = [];
    parseLines(scriptText(SCR.key, currentProgram(), SCR.mode)).forEach(function (x) {
      if (x.k === 'gap') { prevGap = true; return; }
      if (x.k === 'help') { RD.helps.push(helpText(x.s)); return; }
      if (prevGap && lines.length) para++;
      prevGap = false;
      lines.push({ s: x.s, q: x.k === 'q', p: para });
    });
    RD.n = lines.length;
    RD.i = 0;
    var el = document.createElement('div');
    el.className = 'v-tools tl-read';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'rd-title');
    el.setAttribute('data-size', RD.size);
    var prevP = 0;
    el.innerHTML =
      '<div class="rd-bar">' +
        '<h2 class="rd-title" id="rd-title">' + esc(t('rd.title')) + '</h2>' +
        // quick exit stays one tap away: read mode covers the app bar, and is used mid-call (FIXER-robust)
        '<button type="button" class="pill pill-exit rd-exit" data-act="exit" data-noruby title="' + esc(SM.t('core.exitHint')) + '">' + esc(SM.t('core.exit')) + '</button>' +
        '<p class="rd-pos" aria-live="polite"><b class="rd-pos-n" id="rd-pos-n">1</b><span class="rd-pos-of">' + esc(t('rd.of', { total: RD.n })) + '</span></p>' +
        '<span class="rd-tools">' +
          '<button type="button" class="rd-btn" data-act="rd-size" data-d="-1" aria-label="' + esc(t('rd.smaller')) + '">' + ic('minus') + '</button>' +
          '<button type="button" class="rd-btn" data-act="rd-size" data-d="1" aria-label="' + esc(t('rd.bigger')) + '">' + ic('plus') + '</button>' +
          '<button type="button" class="rd-btn rd-close" data-act="rd-close" aria-label="' + esc(t('rd.close')) + '">' + ic('close') + '</button>' +
        '</span>' +
      '</div>' +
      '<div class="rd-scroll"><ol class="rd-lines" lang="ja"><li class="rd-ind-li" aria-hidden="true"><i class="rd-ind"></i></li>' + lines.map(function (l, i) {
        var np = l.p !== prevP; prevP = l.p;
        return '<li class="rd-li' + (l.q ? ' is-q' : '') + (np ? ' is-para' : '') + '" data-i="' + i + '">' +
          '<button type="button" class="rd-line" data-act="rd-go" data-i="' + i + '">' +
          (l.q ? '<span class="rd-q" aria-hidden="true">問</span>' : '') + '<span class="rd-t">' + esc(l.s) + '</span></button></li>';
      }).join('') + '</ol>' +
      '<p class="rd-note">' + esc(t('rd.awake')) + '</p></div>' +
      (RD.helps.length ? '<div class="rd-help"><p class="rd-help-k">' + esc(t('rd.help')) + '</p><div class="rd-help-list" lang="ja">' +
        RD.helps.map(function (h, i) { return '<button type="button" class="rd-help-b" data-act="rd-flash" data-i="' + i + '">' + esc(h) + '</button>'; }).join('') +
      '</div></div>' : '') +
      '<div class="rd-nav">' +
        '<button type="button" class="rd-prev" data-act="rd-step" data-d="-1" data-press>' + arrow('l') + '<span>' + esc(t('rd.prev')) + '</span></button>' +
        '<button type="button" class="rd-next" data-act="rd-step" data-d="1" data-press><span class="rd-next-t">' + esc(t('rd.next')) + '</span>' + arrow('r') + '</button>' +
      '</div>' +
      '<div class="rd-flash" id="rd-flash" hidden><p class="rd-flash-t" id="rd-flash-t" lang="ja"></p>' +
        '<button type="button" class="rd-flash-x" data-act="rd-flash-close">' + arrow('l') + '<span>' + esc(t('rd.flashBack')) + '</span></button></div>';
    document.body.appendChild(el);
    RD.el = el;
    document.body.classList.add('tl-reading');
    try { document.documentElement.style.overflow = 'hidden'; } catch (e) { }
    shell(true);
    ruby(el.querySelector('.rd-lines'));
    ruby(el.querySelector('.rd-help-list'));
    requestWake();
    setLine(0, { instant: true });
    // in: the sheet fades up 16px; the lines follow 60ms later (one surface, then its content)
    var m = M();
    if (m && m.animate && !reduced()) {
      m.animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'cubic-bezier(0, 0, 0.2, 1)' });
      var sc = el.querySelector('.rd-scroll');
      if (sc) m.animate(sc, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { spring: 'smooth', delay: 60, fill: 'backwards' });
    }
    var nx = el.querySelector('.rd-next');
    try { (nx || el.querySelector('.rd-close')).focus({ preventScroll: true }); } catch (e) { }
  }
  function step(d) {
    if (!RD.el) return;
    if (d > 0 && RD.i >= RD.n - 1) { closeRead(); SM.toast(t('rd.doneToast')); return; }
    setLine(RD.i + d);
  }
  SM.on('scr-read', function (btn) { openRead(btn); });
  SM.on('rd-close', function () { closeRead(); });
  SM.on('rd-size', function (el) { setReadSize(+el.getAttribute('data-d') || 0); });
  SM.on('rd-step', function (el) { step(+el.getAttribute('data-d') || 1); });
  SM.on('rd-go', function (el) { setLine(+el.getAttribute('data-i') || 0); });
  SM.on('rd-flash', function (el) { flash(+el.getAttribute('data-i') || 0); });
  SM.on('rd-flash-close', function () { flash(null); });
  window.addEventListener('hashchange', function () { closeRead(true); });
  window.addEventListener('resize', function () { if (RD.el) setLine(RD.i, { instant: true }); });
  document.addEventListener('keydown', function (ev) {
    if (!RD.el) return;
    var f = RD.el.querySelector('#rd-flash');
    var flashOpen = f && !f.hidden;
    if (ev.key === 'Escape') { ev.stopPropagation(); ev.preventDefault(); if (flashOpen) flash(null); else closeRead(); return; }
    if (ev.key === 'Tab') {
      var list = Array.prototype.filter.call(RD.el.querySelectorAll('button'), function (b) { return !b.disabled && b.offsetParent !== null && !(flashOpen && !f.contains(b)); });
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      return;
    }
    if (flashOpen) return;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown' || ev.key === 'PageDown') { ev.preventDefault(); setLine(RD.i + 1); }
    else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' || ev.key === 'PageUp') { ev.preventDefault(); setLine(RD.i - 1); }
  }, true);
  document.addEventListener('visibilitychange', function () { if (RD.el && !document.hidden && !RD.wake) requestWake(); });

  /* ================================================================= contract check */
  var SEGS = 12; // gauge: 1–3 大丈夫そう, 4–7 注意, 8–12 危険
  function zoneOf(i) { return i < 3 ? 'safe' : i < 7 ? 'caution' : 'danger'; }
  function checkVals() { var v = SM.store.get('checks', {}); return v && typeof v === 'object' ? v : {}; }
  function checkScenes() {
    var sc = (D().checkScenes || []).slice();
    if (junior()) sc.sort(function (a, b) { return (a.jrRank || 9) - (b.jrRank || 9); });
    return sc;
  }
  function checkItems() { var m = minor(); return (D().checks || []).filter(function (c) { return !c.minor || m; }); }
  function checkEval() {
    var vals = checkVals();
    var items = checkItems();
    var hit = items.filter(function (c) { return vals[c.k]; });
    var score = hit.reduce(function (n, c) { return n + (c.w || 1); }, 0);
    var crime = hit.some(function (c) { return c.crime; });
    var work = hit.some(function (c) { return c.scene === 'work'; });
    var lvl = score === 0 ? 'safe' : (score >= 4 || crime) ? 'danger' : 'caution';
    var fill = lvl === 'safe' ? 0 : lvl === 'caution' ? Math.min(7, 3 + score) : Math.min(SEGS, 8 + Math.max(0, score - 4));
    return { hit: hit, score: score, crime: crime, work: work, lvl: lvl, fill: fill };
  }
  function gaugeHtml(ev) {
    var s = '';
    for (var i = 0; i < SEGS; i++) s += '<i class="ck-seg z-' + zoneOf(i) + (i < ev.fill ? ' is-on' : '') + '"><b></b></i>';
    return '<div class="ck-gauge" aria-hidden="true">' + s + '</div>' +
      '<div class="ck-zones" aria-hidden="true"><span class="z-safe">' + esc(t('ck.zone.safe')) + '</span><span class="z-caution">' + esc(t('ck.zone.caution')) + '</span><span class="z-danger">' + esc(t('ck.zone.danger')) + '</span></div>';
  }
  function helpRow(id, fallbackNum, fallbackName, urgent) {
    var p = prog(id);
    var num = p && p.contact && p.contact.phone ? p.contact.phone : fallbackNum;
    if (!num) return '';
    var name = p ? shortName(p) : fallbackName;
    name = name.split(num).join('').replace(/\s+$/, '').trim() || name;
    var hours = p && p.contact ? L(p.contact.hours) : '';
    return '<li class="ck-help' + (urgent ? ' is-urgent' : '') + '" data-flip-key="' + esc(id || num) + '">' +
      '<a class="ck-help-call" href="' + esc(telHref(num)) + '" data-press>' +
        '<span class="ck-help-text"><span class="ck-help-name">' + esc(name) + '</span><span class="ck-help-num" data-noruby>' + esc(num) + '</span>' +
        (hours ? '<span class="ck-help-hours">' + esc(hours) + '</span>' : '') + '</span>' +
        '<span class="ck-help-cta call-go" aria-hidden="true">' + ic('phone') + '<span class="call-go-t">' + esc(t('ui.call')) + '</span></span></a>' +
      (p ? '<a class="ck-help-more" href="#/p/' + encodeURIComponent(p.id) + '"><span>' + esc(t('tl.more')) + '</span>' + arrow('r') + '</a>' : '') +
    '</li>';
  }
  function checkAdvice(ev) {
    var tone = ev.lvl === 'safe' ? 'safe' : ev.lvl === 'caution' ? 'warn' : 'danger';
    var msg = SM.ui.callout(esc(t('ck.msg.' + ev.lvl)), tone);
    var crime = ev.crime ? SM.ui.callout(esc(t('ck.crime')), 'danger', { title: t('ck.crime.t') }) : '';
    var jr = junior();
    var rows = [];
    if (ev.crime) rows.push(helpRow(null, '110', t('ck.110'), true));
    if (jr && (ev.crime || ev.lvl === 'danger')) rows.push(helpRow('kodomo-sos', null, ''));
    rows.push(helpRow('shohisha-188', '188', en() ? 'Consumer Hotline' : '消費者ホットライン'));
    if (ev.crime || ev.lvl === 'danger') rows.push(helpRow('police-9110', '#9110', en() ? 'Police consultation' : '警察相談専用電話'));
    if (ev.lvl === 'danger' && !jr) rows.push(helpRow('houterasu', null, ''));
    if (ev.work) rows.push(helpRow('rodo-hotline', null, ''));
    var help = rows.filter(Boolean).join('');
    return '<div class="ck-msgs">' + msg + crime + '</div>' +
      (help ? '<h3 class="ck-where">' + esc(t('ck.where')) + '</h3><ul class="ck-helps" id="ck-helps">' + help + '</ul>' : '');
  }
  function miniGauge(ev) {
    var s = '';
    for (var i = 0; i < SEGS; i++) s += '<i class="z-' + zoneOf(i) + (i < ev.fill ? ' is-on' : '') + '"></i>';
    return s;
  }
  function floatCount(n) {
    var parts = String(t('ck.short')).split('{n}');
    return esc(parts[0] || '') + '<b class="tl-float-n" id="ck-float-n">' + n + '</b>' + esc(parts.slice(1).join('{n}')) +
      '<span class="tl-float-of"> / ' + checkItems().length + '</span>';
  }
  function checkFloat(ev) {
    // short on purpose: must fit at 320px with 文字を大きく
    return '<span class="tl-float-dot lvl-' + ev.lvl + '" aria-hidden="true"></span>' +
      '<span class="tl-float-main"><span class="sr-only" id="ck-float-lv">' + esc(t('ck.lv.' + ev.lvl)) + '・</span>' + floatCount(ev.hit.length) + '</span>' +
      '<span class="tl-float-mini" aria-hidden="true">' + miniGauge(ev) + '</span>' +
      '<span class="tl-float-go"><span>' + esc(t('tl.toResult')) + '</span>' + arrow('d') + '</span>';
  }

  function checkView(defer) {
    var items = checkItems();
    var vals = checkVals();
    var ev = checkEval();
    var jr = junior();
    var n = 0;
    var groups = checkScenes().map(function (sc) {
      var its = items.filter(function (c) { return !sc.key || c.scene === sc.key; });
      if (!its.length) return '';
      n++;
      var hid = 'ck-g-' + (sc.key || 'all');
      return '<section class="tl-sec ck-group" role="group" aria-labelledby="' + hid + '">' + secHead(n, hid, L(sc.label)) +
        '<div class="ck-items" data-reveal-stagger="50">' + its.map(function (c) {
          var id = 'ck-' + c.k;
          return '<label class="ck-item" for="' + id + '">' +
            '<input type="checkbox" class="ck-in" id="' + id + '" data-act="ck-toggle" data-k="' + esc(c.k) + '"' + (vals[c.k] ? ' checked' : '') + '>' +
            '<span class="ck-box" aria-hidden="true">' + ic('check') + '</span>' +
            '<span class="ck-t">' + esc(L(c.t)) + '</span></label>';
        }).join('') + '</div></section>';
    }).filter(Boolean);
    var infos = (D().checkInfo || []).filter(function (x) { return !(jr && x.adult); });
    if (minor()) infos.sort(function (a, b) { return (b.junior ? 1 : 0) - (a.junior ? 1 : 0); });
    else infos = infos.filter(function (x) { return !x.junior || minor(); });
    var info = infos.map(function (x) {
      var links = (x.ids || []).map(prog).filter(Boolean).map(function (p) {
        return '<a class="tl-inline-link" href="#/p/' + encodeURIComponent(p.id) + '"><span>' + esc(shortName(p)) + '</span>' + arrow('r') + '</a>';
      }).join('');
      var src = x.src && x.src.url ? '<p class="ck-info-src"><a href="' + esc(x.src.url) + '" target="_blank" rel="noopener noreferrer"><span>' + esc(t('ck.src', { org: x.src.org || x.src.url })) + '</span>' + ic('external') + '<span class="sr-only">' + esc(t('core.newtab')) + '</span>' + '</a></p>' : '';
      return '<details class="disclose"><summary><span>' + esc(L(x.title)) + '</span></summary><p>' + esc(L(x.body)) + '</p>' + (links ? '<p class="ck-info-links">' + links + '</p>' : '') + src + '</details>';
    }).join('');
    var age = '<div class="ck-age">' + (minor() ? SM.ui.callout(esc(t('ck.minor')), 'info') : SM.ui.callout(esc(t('ck.adult')), 'info')) + '</div>';
    var result = '<section class="tl-sec ck-result" id="ck-result" aria-labelledby="ck-h-res" tabindex="-1">' +
        secHead(0, 'ck-h-res', t('ck.result'), { action: actBtn('ck-reset', t('ck.reset'), ev.hit.length ? '' : ' hidden') }) +
        '<div class="ck-meter lvl-' + ev.lvl + '" data-lvl="' + ev.lvl + '" data-fill="' + ev.fill + '">' +
          '<div class="ck-meter-top"><p class="ck-lvl" id="ck-lvl" role="status" data-lvl="' + ev.lvl + '">' + esc(t('ck.lv.' + ev.lvl)) + '</p>' +
          '<p class="ck-count"><b class="ck-count-n" id="ck-count-n">' + ev.hit.length + '</b><span>' + esc(String(t('ck.count')).replace('{n}', '').trim()) + '</span></p></div>' +
          gaugeHtml(ev) +
        '</div>' +
        '<div class="ck-advice" id="ck-advice">' + checkAdvice(ev) + '</div>' +
      '</section>';
    var rest = (info ? '<section class="tl-sec ck-info cv" aria-labelledby="ck-h-info">' + secHead(0, 'ck-h-info', t('ck.info')) + '<div class="ck-info-list">' + info + '</div></section>' : '') +
      learnBlock(jr ? ['keiyaku', 'koza-card'] : ['keiyaku', 'komattara'], t('ck.learnH'));
    var float = '<button type="button" class="tl-float no-print" id="ck-float" data-act="tl-scroll" data-target="ck-result">' + checkFloat(ev) + '</button>';
    return '<div class="tl-page tl-checkpage wide-layout" data-tool="check">' +
      head({ title: t('tl.check'), lead: t('ck.lead'), il: ILLUS.check }) +
      '<div class="tl-split">' +
        '<div class="tl-main">' + age + groups[0] + slot('groups', groups.slice(1).join(''), defer) + '</div>' +
        '<div class="tl-side">' + slot('result', result, defer) + '</div>' +
      '</div>' + slot('rest', rest, defer) + float + '</div>';
  }

  // the gauge fills one segment after another (scaleX 200ms each, 70ms apart) and empties in reverse
  function paintGauge(segs, from, to, still) {
    var m = M();
    Array.prototype.forEach.call(segs, function (s, i) {
      var on = i < to;
      s.classList.toggle('is-on', on);
      if (still || !m || !m.animate) return;
      var b = s.firstElementChild;
      if (!b) return;
      if (on && i >= from) m.animate(b, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 300, delay: (i - from) * 60, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'backwards', key: 'seg' });
      else if (!on && i < from) m.animate(b, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 140, delay: (from - 1 - i) * 40, easing: 'cubic-bezier(0.3, 0, 0.8, 0.15)', fill: 'backwards', key: 'seg' });
    });
    return Math.abs(to - from) * 60 + 120;
  }
  function paintCheck() {
    var ev = checkEval();
    var root = document.querySelector('#view .tl-checkpage');
    if (!root) return;
    var still = reduced();
    var meter = root.querySelector('.ck-meter');
    if (meter) {
      var prev = meter.getAttribute('data-lvl');
      var from = +meter.getAttribute('data-fill') || 0;
      meter.className = 'ck-meter lvl-' + ev.lvl;
      meter.setAttribute('data-lvl', ev.lvl);
      meter.setAttribute('data-fill', ev.fill);
      var wait = paintGauge(meter.querySelectorAll('.ck-seg'), from, ev.fill, still);
      var lv = root.querySelector('#ck-lvl');
      if (lv && prev !== ev.lvl) {
        // the level label stamps when the fill arrives in its zone
        // the label keeps its old words and colour until the fill arrives in the new zone, then stamps
        clearTimeout(lv._ckT);
        lv._ckT = setTimeout(function () {
          lv._ckT = 0;
          var cur = meter.getAttribute('data-lvl');
          lv.textContent = t('ck.lv.' + cur); lv.setAttribute('data-lvl', cur); ruby(lv);
          if (!still) stamp(lv, { ring: false });
        }, still ? 0 : Math.min(420, wait));
      }
      roll(root.querySelector('#ck-count-n'), String(ev.hit.length));
    }
    var adv = root.querySelector('#ck-advice');
    if (adv) {
      var html = checkAdvice(ev);
      var swap = function () { adv.innerHTML = html; };
      if (M() && M().flip && !still) { try { M().flip(adv, swap, { selector: '.ck-help, .callout' }); } catch (e) { swap(); } }
      else swap();
      ruby(adv);
    }
    var fl = root.querySelector('#ck-float');
    if (fl) {
      // on a phone the bar is what you see while you tick: the count rolls, new segments fill in turn,
      // the level dot stamps when the level changes
      var dot = fl.querySelector('.tl-float-dot'), mini = fl.querySelector('.tl-float-mini');
      var flv = fl.querySelector('#ck-float-lv');
      if (flv) flv.textContent = t('ck.lv.' + ev.lvl) + '・';
      roll(fl.querySelector('#ck-float-n'), String(ev.hit.length), { direct: still });
      if (dot && dot.className !== 'tl-float-dot lvl-' + ev.lvl) {
        dot.className = 'tl-float-dot lvl-' + ev.lvl;
        if (fl.classList.contains('is-on') && !still) stamp(dot, { ring: false });
      }
      if (mini) {
        var m0 = M(), fromM = mini.querySelectorAll('.is-on').length;
        Array.prototype.forEach.call(mini.children, function (x, i) {
          x.classList.toggle('is-on', i < ev.fill);
          if (!still && m0 && m0.animate && i < ev.fill && i >= fromM) m0.animate(x, [{ transform: 'scaleY(0.2)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 180, delay: (i - fromM) * 50, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'backwards', key: 'mseg' });
        });
      }
    }
    var rs = root.querySelector('[data-act="ck-reset"]');
    if (rs) rs.hidden = !ev.hit.length;
    if (SIDE) SIDE();
  }
  SM.on('ck-toggle', function (el) {
    var v = checkVals();
    var k = el.getAttribute('data-k');
    if (el.checked) v[k] = true; else delete v[k];
    SM.store.set('checks', v);
    var box = el.parentNode && el.parentNode.querySelector('.ck-box');
    if (el.checked && box && M() && M().check) { try { M().check(box, { fill: 'var(--ink)' }); } catch (e) { } }
    else if (!el.checked && box && M() && M().uncheck) { try { M().uncheck(box, { color: 'var(--ink)' }); } catch (e) { } }
    paintCheck();
  });
  SM.on('ck-reset', function () {
    SM.store.set('checks', {});
    Array.prototype.forEach.call(document.querySelectorAll('#view [data-act="ck-toggle"]'), function (i) { i.checked = false; });
    paintCheck();
  });
  SM.on('tl-scroll', function (el) {
    var target = document.getElementById(el.getAttribute('data-target'));
    if (!target) return;
    try { target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); } catch (e) { target.scrollIntoView(); }
    try { target.focus({ preventScroll: true }); } catch (e) { }
  });

  /* ================================================================= money */
  function simMode() {
    var m = SM.store.get('simMode', null);
    if (m === 'jr' && D().simJr) return 'jr';
    if (m === 'alone') return 'alone';
    return junior() && D().simJr ? 'jr' : 'alone';
  }
  function simCfg(mode) { return (mode === 'jr' ? D().simJr : D().sim) || {}; }
  function simKey(mode) { return mode === 'jr' ? 'simJr' : 'sim'; }
  function wageCfg() {
    var c = simCfg('jr').wage || {};
    var mw = D().learnFacts && D().learnFacts.minWageTokyo;
    return { yen: (mw && mw.yen) || c.yen || 1280, from: (mw && mw.from) || c.from || '', hours: c.hours || 4, days: c.days || 8 };
  }
  function simDefault(mode) {
    var c = simCfg(mode);
    var pk = c.defaultPreset || Object.keys(c.presets || {})[0];
    var v = { preset: pk };
    var pr = (c.presets || {})[pk] || {};
    (c.expenses || []).concat(c.incomes || []).forEach(function (e) { v[e.k] = pr[e.k] || 0; });
    var d = c.defaults || {};
    Object.keys(d).forEach(function (k) { v[k] = d[k]; });
    if (mode === 'jr') { var w = wageCfg(); v.wage = w.yen; v.hours = w.hours; v.days = w.days; }
    return v;
  }
  function simVals(mode) {
    var v = SM.store.get(simKey(mode), null);
    var d = simDefault(mode);
    if (!v || typeof v !== 'object') return d;
    Object.keys(d).forEach(function (k) { if (v[k] == null) v[k] = d[k]; });
    return v;
  }
  function simCalc(v, mode) {
    var c = simCfg(mode);
    var out = 0, inc = 0;
    (c.expenses || []).forEach(function (e) { out += +v[e.k] || 0; });
    (c.incomes || []).forEach(function (e) { inc += +v[e.k] || 0; });
    if (mode !== 'jr') {
      if (v.shien) inc += c.shienAmount || 0;
      if (v.yachin) inc += +v.rent || 0;
    }
    return { inc: inc, out: out, bal: inc - out };
  }
  /* FIX-B (F36): nothing entered yet = the example numbers. The hero says 例 in grey and the message invites an
     edit, instead of an amber 「毎月 8,000円 足りません」 that read like the person's own verdict. */
  function isEx(mode) { try { return SM.store.get(simKey(mode), null) == null; } catch (e) { return false; } }
  function markOf(st) { return st === 'ex' ? '' : st === 'short' ? '✕' : '✓'; }
  function statusOf(r, mode) { return r.bal < 0 ? 'short' : r.bal < (mode === 'jr' ? 1000 : 20000) ? 'thin' : 'ok'; }
  function simTips(v, r, mode) {
    var tips = [];
    var add = function (id, key) { var p = prog(id); if (p && !tips.some(function (x) { return x.p.id === id; })) tips.push({ p: p, text: t(key) }); };
    if (mode === 'jr') {
      add('koko-kyufukin', 'mn.t.kyufukin');
      if (answers().area !== 'other') add('tokyo-juken-challenge', 'mn.t.juken');
      return tips;
    }
    var area = answers().area;
    var inTokyo = area !== 'other';
    if (r.bal < 0) {
      if (!(v.shien && v.yachin)) add(inTokyo && prog('tokyo-jiritsu-shikin') ? 'tokyo-jiritsu-shikin' : 'jiritsu-shikin', 'mn.t.shikin');
      add('jukyo-kakuho', 'mn.t.jukyo');
      add('jiritsu-sodan', 'mn.t.sodan');
      add('seikatsu-hogo', 'mn.t.hogo');
    }
    if (r.inc > 0 && (+v.rent || 0) > r.inc * 0.35) { add('ur-chintai', 'mn.t.rent'); if (inTokyo) add('tokyo-sasaeru-jutaku', 'mn.t.rent2'); }
    if (!(+v.ins)) { add('kokuho', 'mn.t.kokuho'); add('nenkin-menjo', 'mn.t.nenkin'); }
    if (!(+v.scholarship) && answers().path === 'study') add('jasso-kyufu', 'mn.t.jasso');
    return tips;
  }
  function msgHtml(v, r, mode) {
    if (isEx(mode)) return SM.ui.callout(esc(t('mn.exBody')), 'info', { title: t('mn.exTitle') });
    var st = statusOf(r, mode);
    var tone = st === 'short' ? 'warn' : st === 'thin' ? 'info' : 'safe';
    var title, body;
    if (mode === 'jr') {
      title = t('mn.jr.' + st, { n: yen(r.bal) });
      body = t('mn.jr.' + st + 'Body', { y: yen(r.bal * 12) });
    } else {
      title = st === 'short' ? t('mn.short', { n: yen(-r.bal) }) : st === 'thin' ? t('mn.thin', { n: yen(r.bal) }) : t('mn.ok', { n: yen(r.bal) });
      body = t(st === 'short' ? 'mn.shortBody' : st === 'thin' ? 'mn.thinBody' : 'mn.okBody');
    }
    return SM.ui.callout(esc(body), tone, { title: title });
  }
  function signOf(n) { return n < 0 ? '−' : n > 0 ? '+' : ''; }
  function yearHtml(r) {
    var parts = String(t(r.bal < 0 ? 'mn.yearShort' : 'mn.year')).split('{n}');
    return esc(parts[0] || '') + '<b class="mn-year-n" id="mn-year-n">' + fmt(r.bal * 12) + '</b>' + esc(parts.slice(1).join('{n}'));
  }
  function srText(r, mode) {
    return t('mn.sr', { label: t(mode === 'jr' ? 'mn.balJr' : 'mn.bal'), v: (r.bal < 0 ? '−' : '') + yen(r.bal), a: yen(r.inc), b: yen(r.out) });
  }
  function pct(x) { return Math.max(0, Math.min(1, x || 0)).toFixed(4); }
  // the breakdown bars are drawn against the biggest expense (the % column gives the share of the total)
  function bdMax(c, v) { return Math.max.apply(null, [1].concat((c.expenses || []).map(function (e) { return +v[e.k] || 0; }))); }
  function moneyResult(v, mode) {
    var c = simCfg(mode);
    var r = simCalc(v, mode);
    var st = isEx(mode) ? 'ex' : statusOf(r, mode);
    var max = Math.max(r.inc, r.out, 1);
    var top = bdMax(c, v);
    var bd = (c.expenses || []).map(function (e) {
      var n = +v[e.k] || 0;
      var share = r.out ? n / r.out : 0;
      return '<li class="mn-bd-row" data-k="' + esc(e.k) + '"><span class="mn-bd-k">' + esc(L(e.short || e.label)) + '</span>' +
        '<span class="mn-bd-track"><i class="mn-bar mn-bd-bar" style="transform:scaleX(' + pct(n / top) + ')"></i></span>' +
        '<span class="mn-bd-v">' + esc(fmt(n)) + '</span><span class="mn-bd-p">' + Math.round(share * 100) + '%</span></li>';
    }).join('');
    var unit = en() ? '' : '<span class="mn-unit-big">円</span>';
    return '<div class="mn-big st-' + st + '" id="mn-big">' +
        '<p class="mn-big-k">' + (st === 'ex' ? '<span class="mn-ex-tag" id="mn-ex-tag">' + esc(t('mn.exTag')) + '</span>' : '') + esc(t(mode === 'jr' ? 'mn.balJr' : 'mn.bal')) + '</p>' +
        '<p class="mn-big-v"><span class="mn-sign' + (r.bal < 0 ? ' is-minus' : '') + '" id="mn-sign">' + signOf(r.bal) + '</span>' + (en() ? '<span class="mn-unit-big is-pre">¥</span>' : '') +
          '<b class="mn-n" id="mn-n" data-count="' + Math.abs(r.bal) + '">' + fmt(r.bal) + '</b>' + unit +
          '<span class="mn-mark" id="mn-mark" aria-hidden="true">' + markOf(st) + '</span></p>' +
        (mode === 'jr' ? '<p class="mn-year" id="mn-year" data-neg="' + (r.bal < 0) + '">' + yearHtml(r) + '</p>' : '') +
        '<p class="sr-only" id="mn-sr" aria-live="polite">' + esc(srText(r, mode)) + '</p>' +
      '</div>' +
      '<div class="mn-vs" aria-hidden="true">' +
        '<div class="mn-vs-row is-in"><span class="mn-vs-k">' + esc(t('mn.vs.in')) + '</span><span class="mn-vs-track"><i class="mn-bar mn-vs-bar" id="mn-vs-in-bar" style="transform:scaleX(' + pct(r.inc / max) + ')"></i></span><span class="mn-vs-v" id="mn-vs-in">' + esc(fmt(r.inc)) + '</span></div>' +
        '<div class="mn-vs-row is-out"><span class="mn-vs-k">' + esc(t('mn.vs.out')) + '</span><span class="mn-vs-track"><i class="mn-bar mn-vs-bar" id="mn-vs-out-bar" style="transform:scaleX(' + pct(r.out / max) + ')"></i></span><span class="mn-vs-v" id="mn-vs-out">' + esc(fmt(r.out)) + '</span></div>' +
      '</div>' +
      '<div class="mn-bd"><p class="tl-label">' + esc(t('mn.bd')) + '</p><ul class="mn-bd-list">' + bd + '</ul></div>' +
      '<div class="mn-msg" id="mn-msg" data-st="' + st + '">' + msgHtml(v, r, mode) + '</div>';
  }
  function tipsHtml(v, mode) {
    var tips = simTips(v, simCalc(v, mode), mode).slice(0, 5);
    if (!tips.length) return '';
    return '<p class="tl-label">' + esc(t('mn.tips')) + '</p><div class="list mn-tip-list">' + tips.map(function (x) {
      return '<a class="list-item" href="#/p/' + encodeURIComponent(x.p.id) + '" data-flip-key="' + esc(x.p.id) + '">' + SM.ui.catIcon((x.p.cat && x.p.cat[0]) || 'money', 'sm', { vt: true }) +
        '<span class="list-body"><span class="list-title">' + esc(shortName(x.p)) + '</span><span class="list-sub">' + esc(x.text) + '</span></span>' +
        '<span class="list-meta">' + arrow('r', 'list-chev') + '</span></a>';
    }).join('') + '</div>';
  }
  function floatHtml(v, mode) {
    var r = simCalc(v, mode);
    var st = isEx(mode) ? 'ex' : statusOf(r, mode);
    return '<span class="tl-float-dot st-' + st + '" aria-hidden="true"></span><span class="tl-float-main">' + esc(t(mode === 'jr' ? 'mn.balJr' : 'mn.bal')) + '</span>' +
      '<span class="tl-float-num"><span id="mn-float-s"' + (r.bal < 0 ? ' class="is-minus"' : '') + '>' + signOf(r.bal) + '</span>' + (en() ? '¥' : '') + '<b class="tl-float-n" id="mn-float-n">' + fmt(r.bal) + '</b>' + (en() ? '' : '円') + '</span>' +
      '<span class="tl-float-go"><span>' + esc(t('tl.toResult')) + '</span>' + arrow('d') + '</span>';
  }
  function moneyRow(e, v, kind) {
    var id = 'mn-' + e.k;
    var val = +v[e.k] || 0;
    var max = Math.max(e.max || 100000, val);
    var lesson = e.lesson ? lessonOf(e.lesson) : null;
    return '<div class="mn-row is-' + kind + '">' +
      '<div class="mn-row-top"><label class="mn-label" for="' + id + '"><span>' + esc(L(e.label)) + '</span>' + (e.hint ? '<span class="mn-hint">' + esc(L(e.hint)) + '</span>' : '') + '</label>' +
        '<span class="mn-input">' + (en() ? '<span class="mn-unit">¥</span>' : '') +
        '<input class="input mn-num" type="text" inputmode="numeric" id="' + id + '" data-act="mn-num" data-k="' + esc(e.k) + '" value="' + fmt(val) + '" autocomplete="off">' +
        (en() ? '' : '<span class="mn-unit">円</span>') + '</span></div>' +
      '<div class="mn-slider"><span class="mn-track" aria-hidden="true"><i class="mn-fill" id="' + id + '-f" style="transform:scaleX(' + pct(val / max) + ')"></i></span>' +
        '<input class="mn-range" type="range" min="0" max="' + max + '" step="' + (e.step || 1000) + '" value="' + val + '" id="' + id + '-r" data-act="mn-range" data-k="' + esc(e.k) + '" aria-label="' + esc(t('mn.amount', { label: L(e.label) })) + '"></div>' +
      (e.wageCalc || (kind === 'in' && e.k === 'baito') ? wageHtml(v) : '') +
      (lesson ? '<a class="tl-inline-link mn-lesson" href="#/learn/' + encodeURIComponent(lesson.id) + '"><span>' + esc(t('mn.lessonLink', { title: L(lesson.title) })) + '</span>' + arrow('r') + '</a>' : '') +
    '</div>';
  }
  function wageTotal(v) { return Math.round((+v.wage || 0) * (+v.hours || 0) * (+v.days || 0)); }
  function wageHtml(v) {
    var w = wageCfg();
    var f = function (k, label, unit, pre) {
      return '<label class="mn-w-f" for="mn-w-' + k + '"><span class="mn-w-l">' + esc(label) + '</span><span class="mn-w-in">' + (pre ? '<span class="mn-unit">' + pre + '</span>' : '') +
        '<input class="input mn-num" type="text" inputmode="numeric" id="mn-w-' + k + '" data-act="mn-wage" data-k="' + k + '" value="' + fmt(+v[k] || 0) + '" autocomplete="off">' +
        (unit ? '<span class="mn-unit">' + esc(unit) + '</span>' : '') + '</span></label>';
    };
    return '<details class="disclose mn-wage"' + (v.preset === 'hs' ? ' open' : '') + '><summary><span>' + esc(t('mn.wage')) + '</span></summary>' +
      '<div class="mn-w-grid">' +
        f('wage', t('mn.wage.yen'), en() ? '' : '円', en() ? '¥' : '') + '<span class="mn-w-x" aria-hidden="true">×</span>' +
        f('hours', t('mn.wage.hours'), t('mn.wage.unitH')) + '<span class="mn-w-x" aria-hidden="true">×</span>' +
        f('days', t('mn.wage.days'), t('mn.wage.unitD')) +
      '</div>' +
      '<div class="mn-w-out"><p class="mn-w-sum"><span aria-hidden="true">＝</span>' + (en() ? '<span class="mn-unit">¥</span>' : '') + '<b class="mn-w-total" id="mn-w-total">' + fmt(wageTotal(v)) + '</b>' + (en() ? '' : '<span class="mn-unit">円</span>') + '</p>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-act="mn-wage-apply" data-press>' + esc(t('mn.wage.apply')) + '</button></div>' +
      '<p class="help">' + esc(t('mn.wage.note', { n: yen(w.yen), d: w.from ? SM.fmtDate(w.from) : '' })) + '</p>' +
    '</details>';
  }
  function presetSeg(mode, v) {
    var presets = simCfg(mode).presets || {};
    return SM.ui.seg(Object.keys(presets).map(function (k) { return { label: L(presets[k].label), value: k, pressed: v.preset === k }; }), { act: 'mn-preset', label: t(mode === 'jr' ? 'mn.presetJr' : 'mn.preset') });
  }
  // everything under the mode tabs (swapped in place when the mode changes)
  function moneyBody(mode, defer) {
    var c = simCfg(mode);
    var v = simVals(mode);
    var switches = mode === 'jr' ? '' : '<div class="mn-switches">' +
      SM.ui.switchRow(t('mn.shien'), { sub: t('mn.shienSub', { n: yen(c.shienAmount || 50000) }), checked: !!v.shien, act: 'mn-toggle', id: 'mn-shien', attrs: 'data-k="shien"' }) +
      SM.ui.switchRow(t('mn.yachin'), { sub: t('mn.yachinSub'), checked: !!v.yachin, act: 'mn-toggle', id: 'mn-yachin', attrs: 'data-k="yachin"' }) +
    '</div>';
    var inputs = '<section class="tl-sec mn-in-sec" aria-labelledby="mn-h-in">' + secHead(1, 'mn-h-in', t('mn.in')) +
        '<div class="mn-rows">' + (c.incomes || []).map(function (e) { return moneyRow(e, v, 'in'); }).join('') + '</div>' + switches +
      '</section>' +
      '<section class="tl-sec mn-out-sec" aria-labelledby="mn-h-out">' + secHead(2, 'mn-h-out', t(mode === 'jr' ? 'mn.outJr' : 'mn.out')) +
        '<div class="mn-rows">' + (c.expenses || []).map(function (e) { return moneyRow(e, v, 'out'); }).join('') + '</div>' +
      '</section>';
    var result = '<section class="tl-sec mn-result" id="mn-result" aria-labelledby="mn-h-res" tabindex="-1"><h2 class="sr-only" id="mn-h-res">' + esc(t(mode === 'jr' ? 'mn.balJr' : 'mn.bal')) + '</h2>' +
        '<div class="mn-res-body" id="mn-res-body">' + moneyResult(v, mode) + '</div></section>';
    // 知っておきたい支援 follows the form in the main column: the side column holds only the result, which always fits
    var tips = '<div class="mn-tips" id="mn-tips">' + tipsHtml(v, mode) + '</div>';
    var rest = learnBlock(c.lessons || [], t('mn.learnH')) +
      '<div class="mn-foot">' + '<button type="button" class="tl-reset" data-act="mn-reset">' + esc(t('mn.reset')) + '</button>' + '</div>' +
      (c.note ? '<p class="tl-note">' + esc(L(c.note)) + '</p>' : '');
    return '<div class="mn-preset"><p class="tl-label">' + esc(t(mode === 'jr' ? 'mn.presetJr' : 'mn.preset')) + '</p><div id="mn-preset-seg">' + presetSeg(mode, v) + '</div></div>' +
      '<div class="tl-split mn-split">' +
        '<div class="tl-side mn-side">' + result + '</div>' +
        '<div class="tl-main mn-main">' + slot('inputs', inputs + tips, defer) + '</div>' +
      '</div>' + slot('rest', rest, defer) +
      '<button type="button" class="tl-float no-print" id="mn-float" data-act="tl-scroll" data-target="mn-result">' + floatHtml(v, mode) + '</button>';
  }
  function moneyView(defer) {
    var mode = simMode();
    var modes = D().simJr ? '<div class="mn-modes">' + SM.ui.seg([
      { label: t('mn.mode.alone'), value: 'alone', pressed: mode === 'alone' },
      { label: t('mn.mode.jr'), value: 'jr', pressed: mode === 'jr' }
    ], { act: 'mn-mode', label: t('mn.mode'), style: 'tabs' }) + '</div>' : '';
    return '<div class="tl-page tl-moneypage mn wide-layout" data-tool="money" data-mode="' + mode + '">' +
      head({ title: t('tl.money'), lead: t(mode === 'jr' ? 'mn.leadJr' : 'mn.lead'), il: ILLUS.money }) +
      modes + '<div class="mn-body" id="mn-body">' + moneyBody(mode, defer) + '</div></div>';
  }

  /* entrance: every bar grows from zero in turn (in / out first, then the breakdown, then the sliders' fills) */
  function growBars(root) {
    var m = M();
    if (!m || !m.animate || reduced() || !root) return;
    var bars = Array.prototype.slice.call(root.querySelectorAll('.mn-vs-bar, .mn-bd-bar'));
    bars.forEach(function (b, i) {
      var to = b.style.transform || 'scaleX(1)';
      try { m.animate(b, [{ transform: 'scaleX(0)' }, { transform: to }], { duration: 560, delay: 160 + Math.min(i, 9) * 55, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards', key: 'grow' }); } catch (e) { }
    });
  }

  /* live state: while a slider is held, everything follows the finger directly */
  var LIVE = { drag: false };
  var srTimer = 0;
  function paintMoney(v, mode, o) {
    o = o || {};
    var root = document.querySelector('#view .tl-moneypage');
    if (!root) return;
    var direct = !!o.direct;
    var c = simCfg(mode), r = simCalc(v, mode), st = isEx(mode) ? 'ex' : statusOf(r, mode);
    var max = Math.max(r.inc, r.out, 1);
    root.classList.toggle('is-live', direct);
    var big = root.querySelector('#mn-big');
    if (big) {
      var was = (big.className.match(/st-(\w+)/) || [])[1];
      big.className = 'mn-big st-' + st;
      var sg = root.querySelector('#mn-sign');
      if (sg) { sg.textContent = signOf(r.bal); sg.classList.toggle('is-minus', r.bal < 0); }
      roll(root.querySelector('#mn-n'), r.bal, { direct: direct });
      var yr = root.querySelector('#mn-year');
      if (yr) {
        var neg = r.bal < 0;
        if (yr.getAttribute('data-neg') !== String(neg)) { yr.setAttribute('data-neg', String(neg)); yr.innerHTML = yearHtml(r); ruby(yr); }
        else roll(root.querySelector('#mn-year-n'), r.bal * 12, { direct: direct });
      }
      if (was && was !== st && !direct) stamp(root.querySelector('#mn-sign'), { ring: false });
      // the 例 tag leaves on the first edit (or comes back after リセット)
      var tag = root.querySelector('#mn-ex-tag'), bk = big.querySelector('.mn-big-k');
      if (st !== 'ex' && tag) tag.parentNode.removeChild(tag);
      else if (st === 'ex' && !tag && bk) bk.insertAdjacentHTML('afterbegin', '<span class="mn-ex-tag" id="mn-ex-tag">' + esc(t('mn.exTag')) + '</span>');
      // ✓ / ✕ beside the number: it stamps in when the verdict crosses zero
      var mk = root.querySelector('#mn-mark'), mt = markOf(st);
      if (mk && mk.textContent !== mt) { mk.textContent = mt; if (mt && !direct) stamp(mk, { ring: false }); }
    }
    var set = function (id, p, n) {
      var b = root.querySelector('#' + id + '-bar');
      if (b) b.style.transform = 'scaleX(' + pct(p) + ')';
      roll(root.querySelector('#' + id), n, { direct: direct });
    };
    set('mn-vs-in', r.inc / max, r.inc);
    set('mn-vs-out', r.out / max, r.out);
    var top = bdMax(c, v);
    (c.expenses || []).forEach(function (e) {
      var row = root.querySelector('.mn-bd-row[data-k="' + e.k + '"]');
      if (!row) return;
      var n = +v[e.k] || 0, share = r.out ? n / r.out : 0;
      var bar = row.querySelector('.mn-bd-bar');
      if (bar) bar.style.transform = 'scaleX(' + pct(n / top) + ')';
      var b = row.querySelector('.mn-bd-v'); if (b) b.textContent = fmt(n);
      var s = row.querySelector('.mn-bd-p'); if (s) s.textContent = Math.round(share * 100) + '%';
    });
    var msg = root.querySelector('#mn-msg');
    if (msg) {
      var wasSt = msg.getAttribute('data-st');
      var mh = msgHtml(v, r, mode);
      if (msg.innerHTML !== mh) { msg.innerHTML = mh; ruby(msg); }
      msg.setAttribute('data-st', st);
      if (wasSt !== st && !direct) {
        // the verdict changes colour and words: a short cross-fade with a lift, then the title stamps
        if (M() && M().animate && !reduced()) { try { M().animate(msg, [{ opacity: 0.25, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(0.2, 0, 0, 1)', key: 'mn-msg' }); } catch (e) { } }
        stamp(msg.querySelector('.callout-title'), { ring: false });
      }
    }
    if (!direct) paintTips(v, mode);
    var fs = root.querySelector('#mn-float-s');
    if (fs) { fs.textContent = signOf(r.bal); fs.classList.toggle('is-minus', r.bal < 0); }
    roll(root.querySelector('#mn-float-n'), r.bal, { direct: direct || !root.querySelector('#mn-float.is-on') });
    var fd = root.querySelector('#mn-float .tl-float-dot');
    if (fd) fd.className = 'tl-float-dot st-' + st;
    clearTimeout(srTimer);
    srTimer = setTimeout(function () { var s = document.getElementById('mn-sr'); if (s) s.textContent = srText(r, mode); }, 700);
  }
  function paintTips(v, mode) {
    var tp = document.getElementById('mn-tips');
    if (!tp) return;
    var html = tipsHtml(v, mode);
    if (tp.getAttribute('data-sig') === html) return;
    tp.setAttribute('data-sig', html);
    var swap = function () { tp.innerHTML = html; };
    if (M() && M().flip && !reduced()) { try { M().flip(tp, swap, { selector: '.list-item' }); } catch (e) { swap(); } } else swap();
    ruby(tp);
    if (SIDE) SIDE();
  }
  function setRange(k, val) {
    var r = document.getElementById('mn-' + k + '-r');
    if (!r) return;
    var max = +r.max || 1;
    if (val > max) { r.max = String(val); max = val; }
    r.value = String(val);
    var f = document.getElementById('mn-' + k + '-f');
    if (f) f.style.transform = 'scaleX(' + pct(val / max) + ')';
  }
  function toInt(s) {
    var raw = String(s || '').replace(/[０-９]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 0xFEE0); }).replace(/[^\d]/g, '');
    return Math.min(raw ? parseInt(raw, 10) : 0, 9999999);
  }
  function curMode() { var el = document.querySelector('#view .tl-moneypage[data-mode]'); return el ? el.getAttribute('data-mode') : simMode(); }
  function saveVals(mode, v) { SM.store.set(simKey(mode), v); }
  SM.on('mn-num', function (el) {
    var mode = curMode(), k = el.getAttribute('data-k'), n = toInt(el.value);
    var v = simVals(mode);
    v[k] = n;
    saveVals(mode, v);
    setRange(k, n);
    paintMoney(v, mode);
  });
  SM.on('mn-range', function (el) {
    var mode = curMode(), k = el.getAttribute('data-k'), n = +el.value || 0;
    var v = simVals(mode);
    v[k] = n;
    saveVals(mode, v);
    setRange(k, n);
    var num = document.getElementById('mn-' + k);
    if (num) num.value = fmt(n);
    paintMoney(v, mode, { direct: LIVE.drag });
  });
  // a held slider: direct follow; on release everything settles (bars on snappy, tips FLIP)
  document.addEventListener('pointerdown', function (ev) {
    var tg = ev.target;
    if (tg && tg.classList && tg.classList.contains('mn-range')) LIVE.drag = true;
  }, true);
  var endDrag = function () {
    if (!LIVE.drag) return;
    LIVE.drag = false;
    var mode = curMode();
    if (document.querySelector('#view .tl-moneypage')) paintMoney(simVals(mode), mode);
  };
  window.addEventListener('pointerup', endDrag, true);
  window.addEventListener('pointercancel', endDrag, true);
  SM.on('mn-wage', function (el) {
    var mode = 'jr', k = el.getAttribute('data-k'), n = toInt(el.value);
    var v = simVals(mode);
    v[k] = n;
    saveVals(mode, v);
    roll(document.getElementById('mn-w-total'), wageTotal(v));
  });
  SM.on('mn-wage-apply', function () {
    var mode = 'jr';
    var v = simVals(mode);
    v.baito = wageTotal(v);
    saveVals(mode, v);
    setRange('baito', v.baito);
    var num = document.getElementById('mn-baito');
    if (num) { num.value = fmt(v.baito); stamp(num.parentNode, { ring: false }); }
    paintMoney(v, mode);
    SM.toast(t('mn.wage.applied'));
  });
  document.addEventListener('focusout', function (ev) {
    var el = ev.target;
    var a = el && el.getAttribute ? el.getAttribute('data-act') : null;
    if (a === 'mn-num' || a === 'mn-wage') el.value = fmt(toInt(el.value));
  });
  SM.on('mn-toggle', function (el) {
    var mode = curMode();
    var v = simVals(mode);
    v[el.getAttribute('data-k')] = !!el.checked;
    saveVals(mode, v);
    paintMoney(v, mode);
  });
  // a preset: the indicator slides, every row moves to its new value, bars settle and totals roll
  function applyVals(v, mode) {
    var c = simCfg(mode);
    (c.expenses || []).concat(c.incomes || []).forEach(function (e) {
      var n = +v[e.k] || 0;
      var num = document.getElementById('mn-' + e.k);
      if (num) num.value = fmt(n);
      setRange(e.k, n);
    });
    ['shien', 'yachin'].forEach(function (k) { var s = document.getElementById('mn-' + k); if (s) s.checked = !!v[k]; });
    paintMoney(v, mode);
  }
  SM.on('mn-preset', function (el) {
    var mode = curMode(), c = simCfg(mode);
    var k = el.getAttribute('data-value');
    var pr = (c.presets || {})[k];
    if (!pr) return;
    var v = simVals(mode);
    if (v.preset === k) return;
    v.preset = k;
    (c.expenses || []).forEach(function (e) { if (pr[e.k] != null) v[e.k] = pr[e.k]; });
    if (mode === 'jr') (c.incomes || []).forEach(function (e) { if (pr[e.k] != null) v[e.k] = pr[e.k]; });
    saveVals(mode, v);
    var seg = el.parentNode;
    if (seg) Array.prototype.forEach.call(seg.children, function (b) { if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', b === el ? 'true' : 'false'); });
    applyVals(v, mode);
    var wg = document.querySelector('#view .mn-wage');
    if (wg && mode === 'jr') wg.open = k === 'hs';
  });
  SM.on('mn-mode', function (el) {
    var m = el.getAttribute('data-value') === 'jr' ? 'jr' : 'alone';
    var page = document.querySelector('#view .tl-moneypage');
    if (!page) { SM.store.set('simMode', m); SM.render(); return; }
    if (m === page.getAttribute('data-mode')) return;
    SM.store.set('simMode', m);
    var seg = el.parentNode;
    if (seg) Array.prototype.forEach.call(seg.children, function (b) { if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', b === el ? 'true' : 'false'); });
    page.setAttribute('data-mode', m);
    var lead = page.querySelector('#tl-lead');
    if (lead) swapIn(lead, esc(t(m === 'jr' ? 'mn.leadJr' : 'mn.lead')));
    var body = page.querySelector('#mn-body');
    swapIn(body, moneyBody(m, false), function () {
      var tp = document.getElementById('mn-tips');
      if (tp) tp.setAttribute('data-sig', tipsHtml(simVals(m), m));
      wireFloat(page, 'mn-result', 'mn-float', { both: true, watch: 'mn-big' });
      wireSide(page);
      growBars(page);
    });
  });
  SM.on('mn-reset', function () {
    var mode = curMode();
    var d = simDefault(mode);
    // FIX-B (F36): back to the example numbers, shown as 例 again
    try { SM.store.remove(simKey(mode)); } catch (e) { saveVals(mode, d); }
    var segEl = document.getElementById('mn-preset-seg');
    if (segEl) Array.prototype.forEach.call(segEl.querySelectorAll('[data-value]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-value') === d.preset ? 'true' : 'false'); });
    if (document.getElementById('mn-res-body')) applyVals(d, mode); else SM.render();
  });

  /* ================================================================= view */
  var SUBS = { script: 1, check: 1, money: 1 };
  SM.views.tools = {
    tab: 'home',
    title: function (args) {
      var s = args && args[0];
      if (s === 'script') return { ja: '電話・窓口の台本', en: 'Phone & visit script' };
      if (s === 'check') return { ja: '契約チェック', en: 'Contract check' };
      if (s === 'money') return { ja: '生活費の計算', jr: 'お金のけいさん', en: 'Money calculator' };
      return { ja: 'べんりツール', en: 'Tools' };
    },
    back: function (args) {
      var s = args && args[0];
      if (s === 'script' && args[1] && prog(args[1])) return '#/p/' + encodeURIComponent(args[1]);
      return SUBS[s] ? '#/tools' : '#/';
    },
    render: function (args) {
      args = args || [];
      var s = args[0];
      DEFER = null;
      var key = SUBS[s] ? s : 'hub';
      var defer = key !== 'hub' && canDefer(key);
      if (defer) DEFER = { key: key, parts: {} };
      if (s === 'script') return scriptView(args, defer);
      if (s === 'check') return checkView(defer);
      if (s === 'money') return moneyView(defer);
      return hub();
    },
    mount: function (root, args) {
      var s = args && args[0];
      var key = SUBS[s] ? s : 'hub';
      stopFloat();
      fitRuby(root);
      if (SM.pgTitleHandoff) { try { SM.pgTitleHandoff(root); } catch (e) { } }
      var m = M();
      var after = function (fn) { if (m && m.afterTransition) m.afterTransition(fn); else setTimeout(fn, 0); };
      var wire = function () {
        if (s === 'check') { wireFloat(root, 'ck-result', 'ck-float'); wireSide(root); }
        else if (s === 'money') {
          wireFloat(root, 'mn-result', 'mn-float', { both: true, watch: 'mn-big' });
          wireSide(root);
          var tp = root.querySelector('#mn-tips');
          if (tp) tp.setAttribute('data-sig', tipsHtml(simVals(simMode()), simMode()));
          if (!(SM.route && SM.route.instant)) growBars(root);
        } else if (s === 'script') wireSide(root);
      };
      if (DEFER && DEFER.key === key) after(function () { fillDeferred(root, key, wire); });
      else { DEFER = null; wire(); }
    }
  };
})();
