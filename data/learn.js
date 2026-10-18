/* 巣立ちマップ v3 — data/learn.js (LEARN-DATA)
 * まなぶ: short money lessons. Route #/learn and #/learn/ID (view: js/views/learn.js).
 *
 * SM.data.lessons = [{
 *   id, order, title:{ja,jr,en}, lead:{ja,jr,en}, level:'jr'|'hs'|'all', minutes, cat (SM.CATS key),
 *   steps:[ step, … ]   (4–7 per lesson)
 *   recap:[{ja,jr,en}, …]       2–3 one-line takeaways for the last screen
 *   related:[programIds]        all exist in data/programs-*.js (views should still skip unknown ids)
 *   cta:{ href, label:{ja,en} } optional in-app link (e.g. the money simulator)
 *   sources:[{ org, url }]      official pages read on `checked`
 *   checked:'2026-10-17'
 * }]
 *
 * Step types (every text object is {ja, en} plus an optional jr = simpler Japanese for 中学生;
 * SM.L() already returns jr while body.is-junior):
 *   { type:'text', head?, ja, jr?, en, mark?:{ja,jr?,en}, big?:{ja,en,label?} }
 *       head = short heading; mark = the one phrase to show with the 蛍光ペン marker (a substring of the
 *       text in the same language); big = one large number to show above the text.
 *   { type:'compare', head?, left:SIDE, right:SIDE, note? }
 *       SIDE = { title, tone:'free'|'loan'|'neutral', big?:{ja,en}, body?, points?:[…] }
 *   { type:'quiz', q, options:[{ ja, jr?, en, correct:bool, why }] }   exactly one correct option
 *   { type:'calc', kind:'interest'|'takehome'|'budget', head?, init:{…}, note? }
 *       interest: init { principal, rate (年%), monthly }   → SM.data.learnCalc.interest(init)
 *       takehome: init { gross (月の額面), social (社会保険に入っている), year (1 or 2) } → learnCalc.takehome(gross, opts)
 *       budget:   init { income (手取り), preset (SM.data.sim.presets key) } → learnCalc.budget(init)
 *
 * SM.data.learnFacts  current numbers used by the lessons (with sources) — one place to update.
 * SM.data.learnCalc   pure helper functions for the calc steps (no DOM).
 */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};

  var CHECKED = '2026-10-17';
  function t(ja, jr, en) { var o = { ja: ja, en: en }; if (jr) o.jr = jr; return o; }

  /* ------------------------------------------------------------------ sources (all fetched and read on CHECKED) */
  var S = {
    jassoAbout: { org: '日本学生支援機構（JASSO）', url: 'https://www.jasso.go.jp/shogakukin/about/index.html' },
    jassoKyufu: { org: '日本学生支援機構（JASSO）', url: 'https://www.jasso.go.jp/shogakukin/about/kyufu/kingaku.html' },
    jassoTaiyo: { org: '日本学生支援機構（JASSO）', url: 'https://www.jasso.go.jp/shogakukin/about/taiyo/index.html' },
    jassoRishi: { org: '日本学生支援機構（JASSO）', url: 'https://www.jasso.go.jp/shogakukin/about/taiyo/taiyo_2shu/riritsu_santei.html' },
    jflecUniv: { org: '金融経済教育推進機構（J-FLEC）', url: 'https://www.j-flec.go.jp/wpimages/uploads/university_model_2.pdf' },
    jflecKihon: { org: '金融経済教育推進機構（J-FLEC）', url: 'https://www.j-flec.go.jp/materials/series-okane-kihon/' },
    jflecJhs: { org: '金融経済教育推進機構（J-FLEC）', url: 'https://www.j-flec.go.jp/materials/hajimete-okane-jikan/' },
    fsaKashikin: { org: '金融庁', url: 'https://www.fsa.go.jp/policy/kashikin/kihon.html' },
    fsaKoza: { org: '金融庁', url: 'https://www.fsa.go.jp/news/r6/ginkou/20250204/20250204.html' },
    npaYami: { org: '警察庁', url: 'https://www.npa.go.jp/bureau/safetylife/yamibaito/hanzaishaboshu.html' },
    npaKoza: { org: '警察庁', url: 'https://www.npa.go.jp/bureau/safetylife/sos47/new-topics/250110/04.html' },
    caa18: { org: '消費者庁', url: 'https://www.caa.go.jp/policies/policy/consumer_education/consumer_education/lower_the_age_of_adulthood/introduction' },
    caaKeiyaku: { org: '消費者庁', url: 'https://www.caa.go.jp/policies/policy/consumer_education/public_awareness/teaching_material/material_010/assets/consumer_education_cms203_240723_02.pdf' },
    mojSeinen: { org: '法務省', url: 'https://www.moj.go.jp/MINJI/minji07_00238.html' },
    gov18: { org: '政府広報オンライン', url: 'https://www.gov-online.go.jp/article/201801/entry-8951.html' },
    ntaPart: { org: '国税庁', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1800.htm' },
    ntaKiso: { org: '国税庁', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1199.htm' },
    ntaKyuyo: { org: '国税庁', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm' },
    ntaRate: { org: '国税庁', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm' },
    ntaKanpu: { org: '国税庁', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2030.htm' },
    tokyoJumin: { org: '東京都主税局', url: 'https://www.tax.metro.tokyo.lg.jp/kazei/life/kojin_ju' },
    nenkinHatachi: { org: '日本年金機構', url: 'https://www.nenkin.go.jp/service/kokunen/kanyu/hatachi-tetsuduki.html' },
    nenkinHokenryo: { org: '日本年金機構', url: 'https://www.nenkin.go.jp/service/kokunen/hokenryo/hokenryo.html' },
    nenkinMenjo: { org: '日本年金機構', url: 'https://www.nenkin.go.jp/service/kokunen/menjo/20150428.html' },
    nenkinGakusei: { org: '日本年金機構', url: 'https://www.nenkin.go.jp/service/kokunen/menjo/20150514.html' },
    nenkinKounen: { org: '日本年金機構', url: 'https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20150515-01.html' },
    kenpo: { org: '全国健康保険協会（協会けんぽ）', url: 'https://www.kyoukaikenpo.or.jp/about/business/insurance_rate/rate_prefectures/r08/index.html' },
    koyo: { org: '厚生労働省 東京労働局（ハローワーク立川）', url: 'https://jsite.mhlw.go.jp/tokyo-hellowork/list/tachikawa/kyushokusha/koyouhokenryouritu08.html' },
    minWage: { org: '厚生労働省', url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/minimumichiran/' },
    nensho: { org: '厚生労働省 大阪労働局', url: 'https://jsite.mhlw.go.jp/osaka-roudoukyoku/yokuaru_goshitsumon/jigyounushi/nensyo.html' },
    mhlwKonkyu: { org: '厚生労働省', url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000059425.html' },
    mhlwFukushi: { org: '厚生労働省', url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/seikatsuhogo/seikatsu-fukushi-shikin1/kashitsukejoken.html' },
    mhlwHogo: { org: '厚生労働省', url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/seikatsuhogo/seikatuhogo/index.html' },
    mlitFee: { org: '国土交通省', url: 'https://www.mlit.go.jp/totikensangyo/const/1_6_bf_000013.html' },
    tokyoChintai: { org: '東京都住宅政策本部', url: 'https://www.juutakuseisaku.metro.tokyo.lg.jp/documents/d/juutakuseisaku/310-6-jyuutaku' },
    ur: { org: 'UR都市機構', url: 'https://www.ur-net.go.jp/chintai/rent/requirements/' },
    tcsw: { org: '東京都社会福祉協議会', url: 'https://www.tcsw.tvac.or.jp/shikin/jiritsu/index.html' },
    juken: { org: '東京都福祉局', url: 'https://www.fukushi.metro.tokyo.lg.jp/seikatsu/teisyotokusyataisaku/jukenseichallenge' },
    jukenProc: { org: '東京都社会福祉協議会（受験生チャレンジ支援貸付事業）', url: 'https://jukenchallenge.jp/procedure' },
    mextKoko: { org: '文部科学省', url: 'https://www.mext.go.jp/a_menu/shotou/mushouka/index.htm' },
    mextShien: { org: '文部科学省', url: 'https://www.mext.go.jp/content/20260616-mxt_shuukyo03-100002595_2.pdf' },
    mextKyufu: { org: '文部科学省', url: 'https://www.mext.go.jp/content/20260616-mxt_shuukyo03-100002595_18.pdf' },
    toritsuJugyo: { org: '東京都教育委員会', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/tuition' },
    toritsuKyufu: { org: '東京都教育委員会', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/scholarship_public_school' },
    toritsuOnline: { org: '東京都教育委員会（各種支援制度のオンライン申請）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/starting_application_online' },
    shigaku: { org: '東京都私学財団', url: 'https://www.shigaku-tokyo.or.jp/parents_index/pa_jugyoryo/' },
    shigakuLeaf: { org: '東京都私学財団', url: 'https://www.shigaku-tokyo.or.jp/wp-content/themes/shigaku/assets/files/brochure/r8_brochure.pdf' }
  };

  /* ------------------------------------------------------------------ facts (one place to update) */
  SM.data.learnFacts = {
    checked: CHECKED,
    adultAge: { age: 18, since: '2022-04-01', source: S.mojSeinen },
    minWageTokyo: { yen: 1280, from: '2026-10-01', prev: 1226, source: S.minWage },
    incomeTaxFreeWage: { yen: 1780000, year: 2026, prev: { year: 2025, yen: 1600000 }, source: S.ntaPart,
      note: '給料だけの人。給与所得控除74万円＋基礎控除104万円（令和8年分）' },
    residentTaxMinor: { yen: 2044000, note: 'その年の1月1日に未成年（18歳未満）で、前年の給与収入が204万4千円未満なら住民税なし（全国のきまり。18歳以上・23区・ひとりなら合計所得45万円＝給与約110万円をこえるとかかる）', source: S.tokyoJumin },
    pensionMonthly: { yen: 17920, fy: 2026, source: S.nenkinHokenryo },
    rates: {               // 2026年度（東京・協会けんぽ・40歳未満・一般の事業）
      health: 0.0985,      // 健康保険（東京支部）。本人はこの半分
      kosodate: 0.0023,    // 子ども・子育て支援金（2026年4月分から）。本人はこの半分
      pension: 0.183,      // 厚生年金。本人はこの半分
      koyoWorker: 0.005,   // 雇用保険の本人負担
      sources: [S.kenpo, S.nenkinKounen, S.koyo]
    },
    kyuyoKojoMin: { incomeTax: 740000, residentTax: 650000, source: S.ntaKyuyo },
    basicDeduction: { incomeTax: 1040000, residentTax: 430000, source: S.ntaKiso },
    residentKintou: { yen: 5000, note: '都民税1,000円＋区市町村民税3,000円＋森林環境税1,000円', source: S.tokyoJumin },
    loanCap: { note: '利息制限法の上限金利は、貸す額に応じて年15〜20%', source: S.fsaKashikin },
    jassoType2Cap: { rate: 3.0, source: S.jassoRishi },
    brokerFeeCap: { months: 1.1, note: '仲介手数料は家賃1か月分×1.1倍（税込）まで', source: S.mlitFee }
  };

  /* ------------------------------------------------------------------ calculators (pure; used by the calc steps) */
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function kyuyoKojo(annual, min) {
    if (annual <= 0) return 0;
    var k;
    if (annual <= 3600000) k = annual * 0.3 + 80000;
    else if (annual <= 6600000) k = annual * 0.2 + 440000;
    else if (annual <= 8500000) k = annual * 0.1 + 1100000;
    else k = 1950000;
    return Math.min(Math.max(k, min), annual);
  }
  function basicIncomeTax(shotoku) {          // 令和8年分（国税庁 No.1199）
    if (shotoku <= 4890000) return 1040000;
    if (shotoku <= 6550000) return 670000;
    if (shotoku <= 23500000) return 620000;
    return 480000;
  }
  function incomeTaxOf(taxable) {             // 速算表（国税庁 No.2260）＋復興特別所得税 2.1%
    taxable = Math.floor(Math.max(0, taxable) / 1000) * 1000;
    if (taxable <= 0) return 0;
    var x;
    if (taxable < 1950000) x = taxable * 0.05;
    else if (taxable < 3300000) x = taxable * 0.10 - 97500;
    else if (taxable < 6950000) x = taxable * 0.20 - 427500;
    else if (taxable < 9000000) x = taxable * 0.23 - 636000;
    else if (taxable < 18000000) x = taxable * 0.33 - 1536000;
    else x = taxable * 0.40 - 2796000;
    return Math.floor(x * 1.021 / 100) * 100;
  }

  SM.data.learnCalc = {
    /** Revolving / fixed monthly repayment. Returns { months, total, interest, firstInterest, never }.
     *  never = true when the monthly payment does not even cover the first month's interest. */
    interest: function (o) {
      o = o || {};
      var P = Math.max(0, num(o.principal, 0)), r = Math.max(0, num(o.rate, 0)) / 100 / 12, A = Math.max(0, num(o.monthly, 0));
      // interest per month is rounded down (円未満切り捨て), as in J-FLEC's example: 155回・772,996円
      var first = Math.floor(P * r);
      if (!P) return { months: 0, total: 0, interest: 0, firstInterest: 0, never: false };
      if (A <= first) return { months: Infinity, total: Infinity, interest: Infinity, firstInterest: first, never: true };
      var b = P, m = 0, total = 0;
      while (b > 0 && m < 1200) {
        var i = Math.floor(b * r), pay = Math.min(A, b + i);
        b = b + i - pay; total += pay; m++;
      }
      return { months: m, total: total, interest: total - P, firstInterest: first, never: false };
    },
    /** 単利: interest for `years` years at `rate` % (e.g. 10万円・15%・1年 → 15,000). */
    simple: function (principal, rate, years) {
      return Math.round(num(principal, 0) * num(rate, 0) / 100 * num(years, 1));
    },
    /** Rough monthly take-home pay (2026年度の料率・東京23区・ひとり・40歳未満).
     *  opts: { social:true (社会保険に入っている), year:1|2 (2 = 住民税も引かれる), minor:false (18歳未満) }
     *  Returns { gross, health (健康保険＋子ども・子育て支援金), pension, koyo, social, incomeTax, residentTax, net } in yen per month. */
    takehome: function (gross, opts) {
      opts = opts || {};
      var g = Math.max(0, Math.round(num(gross, 0)));
      var R = SM.data.learnFacts.rates, inSocial = opts.social !== false;
      var health = inSocial ? Math.round(g * (R.health + R.kosodate) / 2) : 0;
      var pension = inSocial ? Math.round(g * R.pension / 2) : 0;
      var koyo = inSocial ? Math.round(g * R.koyoWorker) : 0;
      var social = health + pension + koyo;
      var annual = g * 12, socialYear = social * 12;
      var shotoku = Math.max(0, annual - kyuyoKojo(annual, 740000));
      var itYear = incomeTaxOf(shotoku - socialYear - basicIncomeTax(shotoku));
      var rtYear = 0;
      if (Number(opts.year) === 2) {
        var sr = Math.max(0, annual - kyuyoKojo(annual, 650000));
        var minorFree = opts.minor && annual < 2044000;
        if (sr > 450000 && !minorFree) {
          var tr = Math.floor(Math.max(0, sr - socialYear - 430000) / 1000) * 1000;
          rtYear = Math.max(0, Math.floor(tr * 0.1) - (tr > 0 ? 2500 : 0)) + 5000;
        }
      }
      var incomeTax = Math.round(itYear / 12), residentTax = Math.round(rtYear / 12);
      return { gross: g, health: health, pension: pension, koyo: koyo, social: social, incomeTax: incomeTax, residentTax: residentTax, net: g - social - incomeTax - residentTax };
    },
    /** Monthly budget from the money-simulator presets (data/tools.js). Returns { income, items:[{k,label,value}], total, left }. */
    budget: function (o) {
      o = o || {};
      var sim = SM.data.sim || {}, presets = sim.presets || {};
      var p = presets[o.preset] || presets[sim.defaultPreset] || {};
      var items = (sim.expenses || []).map(function (e) { return { k: e.k, label: e.short || e.label, value: num(p[e.k], 0) }; });
      var total = items.reduce(function (s, x) { return s + x.value; }, 0);
      var income = num(o.income, (sim.defaults || {}).income || 0);
      return { income: income, items: items, total: total, left: income - total };
    }
  };

  /* ------------------------------------------------------------------ lessons */
  SM.data.lessons = [

    /* 01 ---------------------------------------------------------------- */
    {
      id: 'kyufu-kashitsuke', order: 1, level: 'all', minutes: 2, cat: 'money',
      title: t('給付と貸付のちがい', '返すお金・返さなくていいお金', 'Grants vs. loans'),
      lead: t('「もらうお金」と「借りるお金」。名前は似ていても、あとで大きくちがいます。',
        '「もらうお金」と「かりるお金」。あとで、ぜんぜんちがいます。',
        'Money you receive and money you borrow can look alike. Later, they are very different.'),
      steps: [
        { type: 'text', head: t('支援のお金は3種類', '支援のお金は3つ', 'Three kinds of support money'),
          ja: '返さなくていい「給付」。あとで返す「貸付」。そして、約束を守れば返さなくてよくなる「貸付」の3つです。',
          jr: '「もらう（返さない）」「かりる（あとで返す）」「かりるけど、約束を守ると返さなくていい」の3つです。',
          en: 'Grants you never pay back, loans you do pay back, and loans that are forgiven if you keep the conditions.',
          mark: t('返さなくていい「給付」', '「もらう（返さない）」', 'Grants you never pay back') },
        { type: 'compare', head: t('同じ10万円でも', '同じ10万円でも', 'The same ¥100,000'),
          left: { title: t('給付', 'もらう', 'Grant'), tone: 'free', big: t('返す 0円', null, 'Pay back ¥0'),
            body: t('もらったら、それで終わり。', 'もらったら、おわり。', 'Once you get it, it is yours.'),
            points: [t('収入や学ぶ意欲などの条件がある', '条件はある', 'There are conditions (income, motivation…)'), t('使い道が決まっていることも', '使い方が決まっていることも', 'It may have to be used for a set purpose')] },
          right: { title: t('貸付', 'かりる', 'Loan'), tone: 'loan', big: t('返す 10万円〜', null, 'Pay back ¥100,000+'),
            body: t('あとで少しずつ返す。利息がつくものもある。', 'あとで少しずつ返す。ふえることもある。', 'You repay it bit by bit. Some loans add interest.'),
            points: [t('毎月いくら・何回で返すか確かめる', '毎月いくら返すか見る', 'Check how much per month, how many times'), t('利息なし（無利子）なら借りた額だけ返す', '「無利子」なら、かりた分だけ返す', 'Interest-free means you repay only what you borrowed')] } },
        { type: 'quiz', q: t('JASSOの「給付奨学金」は、どっち？', '「給付奨学金」は、どっち？', 'JASSO’s “kyūfu” (grant) scholarship is…'),
          options: [
            { ja: '卒業したら返すお金', jr: '卒業したら返すお金', en: 'Money you repay after graduating', correct: false,
              why: t('卒業後に返すのは「貸与（たいよ）奨学金」のほう。「給付」とついていたら、返さなくていいお金です。', '返すのは「貸与（たいよ）」のほう。「給付」は返さなくていいお金です。', 'That is the “taiyo” (loan) scholarship. “Kyūfu” means you do not repay it.') },
            { ja: '返さなくていいお金', jr: '返さなくていいお金', en: 'Money you never repay', correct: true,
              why: t('そのとおり。給付奨学金は返す必要がありません。家計や学ぶ意欲などの基準があります。', 'そのとおり。返さなくていいお金です。', 'Right. The grant scholarship is never repaid. There are income and motivation criteria.') },
            { ja: '20歳になったら返すお金', jr: '20歳になったら返すお金', en: 'Money you repay when you turn 20', correct: false,
              why: t('年齢で返すことになる奨学金はありません。給付は返さなくていいお金です。', '年れいで返すものではありません。給付は返さなくていいお金です。', 'No scholarship becomes payable at an age. A grant is never repaid.') }
          ] },
        { type: 'text', head: t('約束を守ると、返さなくてよくなる', '約束を守ると、返さなくていい', 'Loans that can be forgiven'),
          ja: '東京都の「受験生チャレンジ支援貸付」は、高校や大学などに入学すれば返さなくてよくなります。施設などを出た人の「自立支援資金貸付」も、決まった期間働き続けると返済が免除されます。',
          jr: '東京都の「受験生チャレンジ支援貸付」は、高校などに入学できたら、返さなくてよくなります。',
          en: 'Tokyo’s exam-support loan is forgiven once you enter high school or college. The Independence Support Loan for care leavers is forgiven after working for a set period.',
          mark: t('返さなくてよくなります', '返さなくてよくなります', 'is forgiven') },
        { type: 'quiz', q: t('返さなくてよくなる貸付を使うとき、いちばん大事なのは？', '「返さなくてよくなる」貸付で、大事なのは？', 'With a forgivable loan, what matters most?'),
          options: [
            { ja: '何もしなくても、あとで自動で免除される', jr: '何もしなくても、自動でなくなる', en: 'It is forgiven automatically', correct: false,
              why: t('多くの場合、免除の申請が必要です。期限をすぎると返すことになるので、カレンダーに入れておきましょう。', '「免除してください」という手続きが必要なことが多いです。', 'Usually you must apply for forgiveness. Miss the deadline and you repay it.') },
            { ja: '借りた額の半分だけ返せばいい', jr: 'かりた分の半分だけ返す', en: 'You only repay half', correct: false,
              why: t('免除になるかどうかは、決められた条件しだいです。「半分だけ」というルールではないので、窓口で条件を確かめましょう。', '「半分だけ」というルールではありません。条件を窓口で聞こう。', 'It depends on the conditions, not a “half” rule. Check them at the desk.') },
            { ja: '免除の条件と、手続きの期限を確かめておく', jr: '条件と、手続きの期限を確かめる', en: 'Check the conditions and the deadline to apply', correct: true,
              why: t('そのとおり。たとえば受験生チャレンジは、入学した年の5月末までに免除の書類を窓口に出します。', 'そのとおり。受験生チャレンジは、入学した年の5月末までに書類を出します。', 'Right. For the exam-support loan, you hand in the forgiveness form by the end of May of your first year.') }
          ] },
        { type: 'text', head: t('使う順番のコツ', '使う順番', 'The order to use them'),
          ja: 'まず返さなくていい「給付」。足りなければ、利息のない貸付や免除つきの貸付。利息のある借金は、いちばん最後に。',
          jr: 'まず「もらえるお金」。たりないときは「ふえない（無利子の）かりるお金」。ふえる借金は、いちばん最後。',
          en: 'Grants first. Then interest-free or forgivable loans. Loans with interest come last.',
          mark: t('まず返さなくていい「給付」', 'まず「もらえるお金」', 'Grants first') }
      ],
      recap: [
        t('給付＝返さない。貸付＝返す。', '給付は返さない。貸付は返す。', 'Grant = keep it. Loan = pay it back.'),
        t('免除つきの貸付は、条件と申請の期限をメモ。', '免除つきは、手続きの期限をメモ。', 'Forgivable loans: note the conditions and deadline.'),
        t('使う順番は「給付 → 無利子 → 利息あり」。', '順番は「もらう → ふえない → ふえる」。', 'Order: grant → interest-free → with interest.')
      ],
      related: ['jasso-kyufu', 'koko-kyufukin', 'tokyo-juken-challenge', 'jiritsu-shikin', 'tokyo-jiritsu-shikin', 'tokyo-jiritsu-start'],
      sources: [S.jassoAbout, S.juken, S.jukenProc, S.tcsw, S.jflecUniv],
      checked: CHECKED
    },

    /* 02 ---------------------------------------------------------------- */
    {
      id: 'rishi', order: 2, level: 'all', minutes: 3, cat: 'money',
      title: t('利息ってなに？', '借りると、お金がふえる？', 'What is interest?'),
      lead: t('借りたお金は、借りた分より多く返します。その差が「利息」です。',
        'かりたお金は、かりた分より多く返します。ふえた分が「利息」。',
        'You pay back more than you borrowed. The difference is interest.'),
      steps: [
        { type: 'text', head: t('お金のレンタル料', 'お金のレンタル料', 'A rental fee for money'),
          ja: '利息は、お金を借りるときの「レンタル料」。年15%で10万円を1年借りると、利息はおよそ1万5千円。返すのは約11万5千円です。',
          jr: '利息は、お金をかりたときのレンタル料。10万円をかりて、1年後に約11万5千円返す、ということがあります。',
          en: 'Interest is a rental fee for money. Borrow ¥100,000 for a year at 15% and the interest is about ¥15,000: you repay about ¥115,000.',
          big: { ja: '＋1万5千円', en: '+¥15,000', label: t('10万円・年15%・1年', null, '¥100,000 · 15% · 1 year') } },
        { type: 'compare', head: t('同じ10万円を1年借りる', '10万円を1年かりる', 'Borrow ¥100,000 for a year'),
          left: { title: t('利息なし（無利子）', 'ふえない（無利子）', 'Interest-free'), tone: 'free', big: t('返す 10万円', null, 'Repay ¥100,000'),
            body: t('第一種奨学金や、公的な貸付の多くは利息なし。', '国や都のかしつけには、ふえないものが多い。', 'JASSO Type 1 and many public loans charge no interest.') },
          right: { title: t('年15%', '年15%', '15% a year'), tone: 'loan', big: t('返す 約11.5万円', null, 'Repay ~¥115,000'),
            body: t('キャッシングは年15〜18%くらいのことも。', 'カードでお金をかりると、これくらいふえることも。', 'Card cash advances are often around 15–18% a year.') } },
        { type: 'quiz', q: t('30万円を年18%のリボ払い、毎月5千円で返すと、返し終わるまでどれくらい？', '30万円を毎月5千円ずつ返すと、何年かかる？', '¥300,000 at 18%, paying ¥5,000 a month. How long until it is paid off?'),
          options: [
            { ja: '約5年', jr: '約5年', en: 'About 5 years', correct: false,
              why: t('5年たっても、まだ約25万円残っています。最初は5千円のうち4,500円が利息だからです。', '5年たっても、まだ約25万円のこっています。', 'After 5 years about ¥250,000 is still left: at first, ¥4,500 of each ¥5,000 is interest.') },
            { ja: '約13年', jr: '約13年', en: 'About 13 years', correct: true,
              why: t('J-FLECの計算で約13年（155回）。返すお金は合計約77万円で、借りた額の2.5倍以上です。', '約13年。返すお金は合計約77万円。かりた分の2.5倍以上です。', 'About 13 years (155 payments) and about ¥770,000 in total: more than 2.5 times what you borrowed.') },
            { ja: '約1年', jr: '約1年', en: 'About 1 year', correct: false,
              why: t('5千円×12か月でも6万円。利息もあるので、1年ではまったく終わりません。', '5千円×12か月で6万円。1年では終わりません。', '¥5,000 × 12 is only ¥60,000, plus interest. Nowhere near.') }
          ] },
        { type: 'calc', kind: 'interest', head: t('計算でたしかめよう', '計算でたしかめよう', 'Check it with the calculator'),
          init: { principal: 300000, rate: 18, monthly: 5000 },
          note: t('J-FLECの例では、30万円を年18%・毎月5千円で返すと、約13年（155回）・合計77万2,996円です。',
            '30万円を毎月5千円ずつ返すと、13年くらいかかります。',
            'J-FLEC’s example: ¥300,000 at 18%, ¥5,000 a month, takes about 13 years (155 payments), ¥772,996 in total.') },
        { type: 'text', head: t('毎月の額が少ないほど、長くなる', '毎月が少ないほど、長くなる', 'Smaller payments, longer debt'),
          ja: 'リボ払いは毎月の支払いが少なくて楽に見えますが、残りが減らず、利息が長く続きます。「フレックス払い」「定額払い」など、名前がちがうこともあります。',
          jr: 'リボ払いは、毎月は少しでラクに見えます。でも、なかなかへらず、利息がずっとつづきます。',
          en: 'Revolving plans feel easy because each payment is small, but the balance barely falls and interest keeps running. They may be called “flex” or “fixed-amount” payments.',
          mark: t('残りが減らず', 'なかなかへらず', 'the balance barely falls') },
        { type: 'quiz', q: t('SNSで「審査なし・すぐ貸します」。どうする？', 'SNSで「すぐお金かします」。どうする？', 'On social media: “No checks, cash today.” What do you do?'),
          options: [
            { ja: '身分証の写真を送って、聞いてみる', jr: '身分証の写真を送ってみる', en: 'Send a photo of my ID and ask', correct: false,
              why: t('身分証を送ると、悪用されたり脅されたりする危険があります。送らないでください。', '身分証を送ると、悪いことに使われたり、おどされたりします。', 'Your ID can be misused or used to threaten you. Never send it.') },
            { ja: '連絡しない。困ったら社会福祉協議会や188に相談する', jr: '連絡しない。こまったら公的な窓口に相談', en: 'Don’t reply. Ask the social welfare council or call 188', correct: true,
              why: t('SNSの「個人間融資」はヤミ金融のことが多く、法外な利息や脅しのトラブルがあります。公的な窓口には利子なしの貸付もあります。', 'SNSの「お金かします」は、ヤミ金のことが多いです。公的な窓口には、ふえないかしつけもあります。', '“Private loans” on social media are often illegal lenders with huge interest and threats. Public desks offer interest-free loans.') },
            { ja: '少しだけなら借りてみる', jr: '少しだけならかりる', en: 'Borrow just a little', correct: false,
              why: t('少しでも、法外な利息や個人情報をさらされるトラブルがあります。まずは公的な窓口へ。', '少しでも、大きなトラブルになります。', 'Even small amounts lead to illegal interest or your details being exposed online.') }
          ] },
        { type: 'text', head: t('借りる前に3つ確認', 'かりる前に3つ見る', 'Check three things first'),
          ja: '①年何%か ②毎月いくら・何回か ③返すお金の合計。法律の上限は年15〜20%で、それより高い利息はルール違反です。',
          jr: '①年何%ふえる？ ②毎月いくら・何回？ ③全部でいくら返す？ この3つを見てから決めよう。',
          en: '1) the yearly rate, 2) how much per month and how many times, 3) the total you repay. The legal cap is 15–20% a year; anything higher breaks the rules.',
          mark: t('返すお金の合計', '全部でいくら返す？', 'the total you repay') }
      ],
      recap: [
        t('利息＝お金のレンタル料。', '利息は、お金のレンタル料。', 'Interest = a rental fee for money.'),
        t('リボ払いは、長く・高くなりやすい。', 'リボ払いは、長く・高くなる。', 'Revolving plans get long and expensive.'),
        t('借りる前に「年何%・毎月いくら・合計いくら」。', 'かりる前に「何%・毎月・全部で」を見る。', 'Before borrowing: rate, monthly, total.')
      ],
      related: ['seikatsu-fukushi', 'shohisha-188', 'tokyo-shohi-center', 'houterasu', 'jiritsu-sodan'],
      sources: [S.jflecUniv, S.fsaKashikin],
      checked: CHECKED
    },

    /* 03 ---------------------------------------------------------------- */
    {
      id: 'keiyaku', order: 3, level: 'all', minutes: 2, cat: 'procedures',
      title: t('契約ってなに？　名義貸しの危険', '「契約」と、名前をかすこわさ', 'Contracts, and why you never lend your name'),
      lead: t('18歳からは、ひとりで契約できます。だからこそ知っておきたいこと。',
        '18歳からは、ひとりで契約できます。その前に知っておこう。',
        'From 18 you can sign contracts alone. Here is what to know first.'),
      steps: [
        { type: 'text', head: t('契約は「約束」', '契約は「約束」', 'A contract is a promise'),
          ja: '契約は、法律で守られる約束です。お店で「これください」と言って、店の人が受け付けた時点で成立。紙がなくても契約です。一度成立した契約は、簡単にはやめられません。',
          jr: '契約は、守らないといけない約束。「これください」「はい」で、もう契約。紙がなくても契約です。',
          en: 'A contract is a promise protected by law. It is made the moment the shop accepts your order, even without paper, and it is hard to undo.',
          mark: t('紙がなくても契約です', '紙がなくても契約です', 'even without paper') },
        { type: 'text', head: t('18歳から変わること', '18歳から変わること', 'What changes at 18'),
          ja: '2022年4月から、大人は18歳から。親の同意なしで、スマホや部屋、クレジットカードの契約ができます。そのかわり、未成年のときのような「取り消し」はできません。',
          jr: '18歳からは大人。ひとりで契約できるけど、「親のOKがないから」という「取り消し」は、できなくなります。',
          en: 'Since April 2022 adulthood starts at 18. You can sign for a phone, a flat or a credit card without a parent, but you lose the minor’s right to cancel.',
          mark: t('「取り消し」はできません', '「取り消し」は、できなくなります', 'you lose the minor’s right to cancel') },
        { type: 'quiz', q: t('18歳。ネットで高いエステを申し込んだけど、やめたい。', '18歳。ネットで申しこんだけど、やめたい。', 'You are 18 and signed up online for an expensive beauty course. You want out.'),
          options: [
            { ja: '18歳と19歳は、いつでも取り消せる', jr: '18歳と19歳は、いつでも取り消せる', en: '18- and 19-year-olds can always cancel', correct: false,
              why: t('2022年4月から、18歳・19歳は未成年者取消権が使えなくなりました。', '2022年4月から、18歳・19歳は取り消せなくなりました。', 'Since April 2022, 18- and 19-year-olds no longer have the minor’s cancellation right.') },
            { ja: 'サインしていないから、契約じゃない', jr: 'サインしてないから、契約じゃない', en: 'I didn’t sign, so there is no contract', correct: false,
              why: t('ネットのボタンや口約束でも、契約は成立します。', 'ネットのボタンでも、契約になります。', 'A button click or a spoken yes is still a contract.') },
            { ja: '親の同意を理由には取り消せない。まず188に相談する', jr: '親を理由には取り消せない。188に相談', en: 'I can’t cancel for lack of parental consent. Call 188 first', correct: true,
              why: t('そのとおり。でも、契約のしかたによっては解約できることもあります。188（消費者ホットライン）で近くの消費生活センターにつながります。', 'そのとおり。188に電話すると、相談できる窓口につながります。', 'Right. Depending on how it was sold you may still be able to cancel. 188 connects you to a consumer centre.') }
          ] },
        { type: 'compare', head: t('「名前を貸して」と頼まれたら', '「名前をかして」と言われたら', 'If someone asks to use your name'),
          left: { title: t('自分の名前で、自分が使う', '自分の名前で、自分が使う', 'Your name, used by you'), tone: 'free',
            points: [t('自分のスマホ・自分の口座', '自分のスマホ・自分の口座', 'Your own phone and account'), t('暗証番号は自分だけが知っている', '暗証番号は自分だけ', 'Only you know the PIN')] },
          right: { title: t('自分の名前で、ほかの人が使う', '自分の名前で、人が使う', 'Your name, used by someone else'), tone: 'loan',
            points: [t('口座を売る・貸す、人に渡すためにスマホを契約するのは犯罪', '口座やスマホを人にわたすのは犯罪', 'Selling or lending an account, or getting a phone for someone else, is a crime'), t('契約したのはあなた。請求もあなたに来る', 'お金のせいきゅうは、あなたに来る', 'You signed, so the bills come to you')] } },
        { type: 'quiz', q: t('SNSで「口座を貸すだけで3万円」。', 'SNSで「口座をかすだけで3万円」。', 'On social media: “Lend us your bank account, get ¥30,000.”'),
          options: [
            { ja: '1回だけなら大丈夫', jr: '1回だけならOK', en: 'Once is fine', correct: false,
              why: t('1回でも犯罪です。闇バイトでは「1回だけ」と言って、あとから脅されるケースもあります。', '1回でも犯罪です。あとでおどされることもあります。', 'Once is still a crime. These schemes often say “just once” and then threaten you.') },
            { ja: 'お金に困っているなら、しかたない', jr: 'お金がないなら、しかたない', en: 'If I really need money, it’s OK', correct: false,
              why: t('理由があっても犯罪です。お金に困ったら、公的な相談窓口に。', 'どんな理由でも犯罪です。こまったら公的な窓口へ。', 'It is a crime whatever the reason. If you need money, go to a public desk.') },
            { ja: 'ことわる。犯罪になる', jr: 'ことわる。犯罪です', en: 'Say no. It’s a crime', correct: true,
              why: t('口座の売買や貸し借りは違法です（金融庁・警察庁）。口座が止められることもあります。', '口座の売り買い・かし借りは犯罪です。', 'Buying, selling or lending accounts is illegal (FSA, National Police Agency). The account can be frozen.') }
          ] },
        { type: 'text', head: t('こまったら、すぐ相談', 'こまったら、すぐ相談', 'Ask for help right away'),
          ja: '契約のトラブルは188（消費者ホットライン）。脅されたり、闇バイトに応募してしまったときは、警察（#9110、急ぐときは110）に。警察は相談した人と家族を守ります。',
          jr: '契約のトラブルは188。おどされたときは警察（#9110、いそぐときは110）。警察は、あなたと家族を守ります。',
          en: 'Contract trouble: call 188. If you are threatened or got pulled into a criminal “job”, call the police (#9110, or 110 if urgent). They protect you and your family.',
          mark: t('警察は相談した人と家族を守ります', '警察は、あなたと家族を守ります', 'They protect you and your family') }
      ],
      recap: [
        t('紙がなくても契約。', '紙がなくても契約。', 'No paper needed for a contract.'),
        t('18歳からは「取り消し」できない。', '18歳からは取り消しできない。', 'At 18 the minor’s cancellation right ends.'),
        t('口座・スマホ・名前は、人に貸さない。', '口座・スマホ・名前は、人にかさない。', 'Never lend your account, phone or name.')
      ],
      related: ['shohisha-188', 'tokyo-shohi-center', 'police-9110', 'houterasu'],
      sources: [S.caaKeiyaku, S.caa18, S.mojSeinen, S.gov18, S.npaYami, S.fsaKoza],
      checked: CHECKED
    },

    /* 04 ---------------------------------------------------------------- */
    {
      id: 'koza-card', order: 4, level: 'all', minutes: 2, cat: 'money',
      title: t('口座とカードのきほん', '口座とカードって？', 'Bank accounts and cards'),
      lead: t('給料や奨学金は口座に入ります。カードは「いつ払うか」で3種類。',
        '給料は口座に入ります。カードは「いつはらうか」で3つ。',
        'Pay and scholarships go into your account. Cards differ by when you pay.'),
      steps: [
        { type: 'text', head: t('口座は、お金の住所', '口座は、お金の住所', 'Your account is your money’s address'),
          ja: '給料・奨学金・支援のお金は、ほとんど自分名義の口座に振り込まれます。通帳・キャッシュカード・暗証番号は、自分だけで管理します。',
          jr: '給料や奨学金は、自分の口座に入ります。カードと暗証番号は、自分だけのもの。',
          en: 'Wages, scholarships and support payments go into an account in your name. Keep the passbook, card and PIN to yourself.',
          mark: t('自分だけで管理します', '自分だけのもの', 'Keep the passbook, card and PIN to yourself') },
        { type: 'compare', head: t('払うタイミングで、3種類', 'はらうタイミングは3つ', 'Three ways to pay'),
          left: { title: t('前払い・同時払い', '先に・その場ではらう', 'Pay before or at once'), tone: 'free',
            body: t('プリペイド・電子マネーは前払い。デビットカードは、使ったときに口座から引き落とし。', 'チャージした分や、口座にある分だけ使える。', 'Prepaid cards and e-money are paid in advance; a debit card takes money from your account straight away.'),
            points: [t('使えるのは、入っているお金まで', '入っている分まで', 'You can only spend what is there')] },
          right: { title: t('後払い', 'あとではらう', 'Pay later'), tone: 'loan',
            body: t('クレジットカードは、カード会社が立て替えて、あとで口座から払う。', 'クレジットカードは、あとで口座からはらう。', 'With a credit card the card company pays first; you pay later from your account.'),
            points: [t('使った気がしにくく、使いすぎやすい', '使いすぎに注意', 'Easy to overspend: it doesn’t feel like money leaving')] } },
        { type: 'quiz', q: t('クレジットカードで1万円の服を買いました。お金はいつ出ていく？', 'クレジットカードで1万円の服を買った。お金はいつへる？', 'You buy ¥10,000 of clothes by credit card. When does the money leave?'),
          options: [
            { ja: 'その場で財布から出ていく', jr: 'その場でさいふからへる', en: 'Right away, from my wallet', correct: false,
              why: t('それは現金。カードはあとから払うので、使った気がしにくいのが注意点です。', 'それは現金のとき。カードはあとからです。', 'That’s cash. Cards are paid later, which is why they feel painless.') },
            { ja: 'あとで（たとえば翌月に）口座から引き落とされる', jr: 'あとで（次の月など）口座からへる', en: 'Later (e.g. next month) from my account', correct: true,
              why: t('そのとおり。クレジットは「後払い」。カード会社が立て替えて、あとで口座から払います。', 'そのとおり。カードは「あとばらい」です。', 'Right. Credit is “pay later”: the card company pays and collects from your account.') },
            { ja: '払わなくていい', jr: 'はらわなくていい', en: 'Never', correct: false,
              why: t('クレジットは、お金を借りているのと同じ。あとで必ず払います。', 'カードは、かりているのと同じ。あとで必ずはらいます。', 'Credit is borrowing. You always pay it back.') }
          ] },
        { type: 'text', head: t('クレジットは「一括払い」が基本', 'カードは「1回ばらい」で', 'Pay in full'),
          ja: '分割払い（3回以上）やリボ払いには手数料がかかり、払う合計がふえます。一括払いにして、毎月の明細を見るくせをつけよう。',
          jr: '分けてはらう（分割・リボ）と、手数料でふえます。1回ではらって、毎月の明細を見よう。',
          en: 'Instalments (3+ payments) and revolving plans add fees. Pay in full and check your statement every month.',
          mark: t('毎月の明細を見る', '毎月の明細を見よう', 'check your statement every month') },
        { type: 'quiz', q: t('友だちに「暗証番号を教えて、カード貸して」と言われた。', '友だちに「カードと暗証番号かして」と言われた。', 'A friend asks to borrow your card and PIN.'),
          options: [
            { ja: '仲のいい友だちならOK', jr: '仲よしならOK', en: 'Fine if it’s a close friend', correct: false,
              why: t('仲がよくても、カードの利用は原則本人だけ。トラブルになると、友だち関係もこわれます。', '仲がよくても、カードは本人だけ。', 'Even for a close friend: cards are for the holder only.') },
            { ja: 'すぐ返してもらえばOK', jr: 'すぐ返してもらえばOK', en: 'Fine if they return it soon', correct: false,
              why: t('短い時間でも、勝手に使われたお金を取り戻すのはとても大変です。', '少しの時間でも、使われたお金はもどってきにくいです。', 'Even briefly: money spent without you is very hard to get back.') },
            { ja: 'ことわる。カードと暗証番号は本人だけ', jr: 'ことわる。本人だけのもの', en: 'Say no. Card and PIN are mine only', correct: true,
              why: t('そのとおり。カードを使えるのは原則本人だけです。', 'そのとおり。カードは本人だけが使えます。', 'Right. In principle only the cardholder may use the card.') }
          ] },
        { type: 'text', head: t('口座は売らない・貸さない', '口座は売らない・かさない', 'Never sell or lend an account'),
          ja: '使わない口座でも、売る・あげる・貸すのは犯罪です（お金をもらっても、もらわなくても）。いらない口座は、銀行で解約しましょう。',
          jr: '使わない口座でも、売る・あげる・かすのは犯罪。いらない口座は、銀行でやめる手続きを。',
          en: 'Selling, giving away or lending an account is a crime, paid or not. Close accounts you don’t use at the bank.',
          mark: t('売る・あげる・貸すのは犯罪です', '売る・あげる・かすのは犯罪', 'is a crime') }
      ],
      recap: [
        t('口座・カード・暗証番号は自分だけ。', 'カードと暗証番号は自分だけ。', 'Account, card and PIN: yours only.'),
        t('クレジットは後払い＝借りているのと同じ。', 'クレジットは、かりているのと同じ。', 'Credit = pay later = borrowing.'),
        t('分割・リボは手数料。一括払いが基本。', '1回ではらうのが基本。', 'Instalments cost fees. Pay in full.')
      ],
      related: ['mynumber-card', 'shohisha-188', 'police-9110'],
      sources: [S.jflecJhs, S.jflecUniv, S.fsaKoza, S.npaKoza, S.npaYami],
      checked: CHECKED
    },

    /* 05 ---------------------------------------------------------------- */
    {
      id: 'tedori', order: 5, level: 'hs', minutes: 3, cat: 'work',
      title: t('手取りと額面', '給料から、引かれるお金', 'Gross pay vs. take-home pay'),
      lead: t('求人の「月給20万円」は、そのまま全部は入りません。',
        '「月給20万円」でも、20万円ぜんぶは入りません。',
        'A job ad’s “¥200,000 a month” is not what lands in your account.'),
      steps: [
        { type: 'text', head: t('額面と手取り', '額面と手取り', 'Gross and take-home'),
          ja: '額面（がくめん）は、引かれる前の給料。手取りは、税金や保険料が引かれたあと、口座に入る金額。生活費は手取りで考えます。',
          jr: '「額面」は、引かれる前の給料。「手取り」は、口座に入るお金。使えるのは手取りです。',
          en: 'Gross pay is before deductions. Take-home is what reaches your account after tax and insurance. Plan with take-home pay.',
          mark: t('生活費は手取りで考えます', '使えるのは手取りです', 'Plan with take-home pay') },
        { type: 'compare', head: t('月給20万円（働いて1年目）のだいたい', '月給20万円（1年目）', 'A ¥200,000 monthly salary, first year'),
          left: { title: t('額面', '額面', 'Gross'), tone: 'neutral', big: t('200,000円', null, '¥200,000'),
            body: t('求人票や契約書に書いてある金額', '求人に書いてある金額', 'The figure in the job ad or contract') },
          right: { title: t('手取り', '手取り', 'Take-home'), tone: 'free', big: t('約170,000円', null, 'about ¥170,000'),
            body: t('健康保険・厚生年金・雇用保険・所得税が引かれたあと', '保険と税金が引かれたあと', 'After health insurance, pension, employment insurance and income tax') },
          note: t('東京の会社員・2026年度の料率で、ざっくり計算。2年目からは住民税（月7千円くらい）も引かれます。',
            '2年目からは、住民税（月7千円くらい）も引かれます。',
            'Rough figures for a Tokyo employee at 2026 rates. From year two, resident tax (about ¥7,000 a month) is also taken.') },
        { type: 'text', head: t('引かれるもの', '引かれるもの', 'What gets taken'),
          ja: '健康保険（病気やけがのとき）、厚生年金（年をとったときや障害のとき）、雇用保険（仕事をなくしたとき）、所得税、住民税。健康保険と厚生年金の保険料は、会社も半分出しています。',
          jr: '保険（病気のとき・年をとったとき・仕事をなくしたとき）と、税金が引かれます。保険料は、会社も半分出しています。',
          en: 'Health insurance, employees’ pension, employment insurance, income tax and resident tax. Your employer pays the other half of the health and pension premiums.',
          mark: t('会社も半分出しています', '会社も半分出しています', 'Your employer pays the other half') },
        { type: 'calc', kind: 'takehome', head: t('給料で計算してみよう', '計算してみよう', 'Try your own salary'),
          init: { gross: 200000, social: true, year: 1 },
          note: t('目安です（東京・40歳未満・2026年度）。本当の金額は、給与明細で確かめましょう。', '目安です。本当の金額は給与明細で見よう。', 'An estimate (Tokyo, under 40, 2026). Your payslip has the real numbers.') },
        { type: 'quiz', q: t('働いて2年目。給料は同じなのに、手取りが減った。なぜ？', '2年目、給料は同じなのに手取りがへった。なぜ？', 'Year two: same salary, smaller take-home. Why?'),
          options: [
            { ja: '会社が計算をまちがえた', jr: '会社のまちがい', en: 'The company made a mistake', correct: false,
              why: t('まずは給与明細で、どの項目がふえたか見てみよう。たいていは住民税です。', '給与明細を見てみよう。たいていは住民税です。', 'Check your payslip first. It is usually resident tax.') },
            { ja: '住民税が引かれはじめたから', jr: '住民税が引かれはじめたから', en: 'Resident tax started', correct: true,
              why: t('そのとおり。住民税は前の年の所得にかかるので、2年目の6月ごろから毎月の給料で引かれるのがふつうです。', 'そのとおり。住民税は、2年目の6月ごろから引かれます。', 'Right. Resident tax is based on last year’s income, so it is usually deducted from June of your second year.') },
            { ja: '保険に入るのをやめたから', jr: '保険をやめたから', en: 'I left the insurance', correct: false,
              why: t('会社員の健康保険と厚生年金は、自分でやめられません。', '会社の保険は、自分でやめられません。', 'Employees cannot opt out of health insurance and pension.') }
          ] },
        { type: 'text', head: t('給与明細は捨てない', '給与明細はすてない', 'Keep your payslips'),
          ja: '給与明細と源泉徴収票は、奨学金・部屋・支援の手続きで「収入の証明」に使います。1つのファイルにまとめておこう。',
          jr: '給与明細と源泉徴収票は、部屋をかりるときなどに使います。1つのファイルにまとめよう。',
          en: 'Payslips and your year-end tax slip prove your income for scholarships, flats and support. Keep them in one folder.',
          mark: t('「収入の証明」', '1つのファイルにまとめよう', 'prove your income') }
      ],
      recap: [
        t('使えるのは手取り。', '使えるのは手取り。', 'You can only spend take-home pay.'),
        t('月給20万円なら、手取りは約17万円（1年目）。', '20万円なら、手取りは約17万円。', '¥200,000 gross ≈ ¥170,000 take-home (year one).'),
        t('2年目から住民税が引かれる。', '2年目から住民税。', 'Resident tax starts in year two.')
      ],
      related: ['hellowork-wakamono', 'koyo-hoken', 'kokuho', 'rodo-hotline', 'tokyo-rodo-sodan'],
      sources: [S.nenkinKounen, S.kenpo, S.koyo, S.ntaKyuyo, S.ntaKiso, S.ntaRate, S.tokyoJumin, S.fsaKashikin],
      checked: CHECKED
    },

    /* 06 ---------------------------------------------------------------- */
    {
      id: 'seikatsuhi', order: 6, level: 'hs', minutes: 3, cat: 'money',
      title: t('1か月の生活費', 'ひとりで暮らすと、いくら？', 'A month of living costs'),
      lead: t('家賃・食費・スマホ…。まず「出ていくお金」を見える化しよう。',
        '家賃・ごはん・スマホ…。まず「出ていくお金」を書き出そう。',
        'Rent, food, phone… start by seeing where the money goes.'),
      steps: [
        { type: 'text', head: t('毎月かかるお金は2種類', '出ていくお金は2つ', 'Two kinds of monthly costs'),
          ja: '金額がほぼ決まっている「固定費」（家賃・スマホ・保険）と、使い方で変わる「変動費」（食費・洋服・遊び）。まず固定費を下げると、毎月がぐっと楽になります。',
          jr: '毎月だいたい同じ「固定費」（家賃・スマホ）と、使い方でかわる「変動費」（ごはん・洋服・遊び）があります。',
          en: 'Fixed costs stay about the same (rent, phone, insurance). Variable costs change with how you spend (food, clothes, fun). Cutting a fixed cost helps every month.',
          mark: t('まず固定費を下げる', '「固定費」', 'Cutting a fixed cost') },
        { type: 'compare', head: t('固定費と変動費', '固定費と変動費', 'Fixed vs. variable'),
          left: { title: t('固定費', '固定費', 'Fixed'), tone: 'neutral',
            points: [t('家賃', '家賃', 'Rent'), t('スマホ・ネット', 'スマホ・ネット', 'Phone and internet'), t('保険・年金', '保険・年金', 'Insurance and pension')] },
          right: { title: t('変動費', '変動費', 'Variable'), tone: 'neutral',
            points: [t('食費', 'ごはん代', 'Food'), t('日用品・洋服', '日用品・洋服', 'Daily goods and clothes'), t('友だちとのお金', '友だちと遊ぶお金', 'Going out with friends')] } },
        { type: 'calc', kind: 'budget', head: t('東京23区でひとり暮らしの例', '東京23区でひとりで暮らすときの例', 'Living alone in Tokyo’s 23 wards'),
          init: { income: 150000, preset: 'ku23' },
          note: t('ざっくりの目安です（手取り15万円、会社の保険あり）。会社の保険がない20歳以上の人は、国民年金（月17,920円）と国民健康保険もかかります。払えないときは免除を申請できます。',
            'ざっくりの数字です。自分の数字に変えてみよう。',
            'Rough numbers (take-home ¥150,000, covered by work insurance). If you are 20+ and not on work insurance, add the national pension (¥17,920 a month) and national health insurance. You can apply for an exemption if you can’t pay.') },
        { type: 'quiz', q: t('毎月、少しだけ足りない。まず見直すなら？', '毎月すこしたりない。まず何を見直す？', 'You are a little short every month. What do you look at first?'),
          options: [
            { ja: 'スマホのプランなど、毎月決まって出ていくお金', jr: 'スマホのプランなど、毎月同じお金', en: 'Fixed costs like your phone plan', correct: true,
              why: t('そのとおり。固定費は一度見直すと、毎月ずっと効きます。', 'そのとおり。一度へらすと、毎月ずっとラクになります。', 'Right. Cut a fixed cost once and it helps every month.') },
            { ja: '食費をゼロに近づける', jr: 'ごはん代をゼロにする', en: 'Cut food to almost nothing', correct: false,
              why: t('食べないのは体をこわします。食費は「自炊を少しふやす」くらいで。', '食べないのは体によくありません。', 'Skipping meals harms your health. Cook a little more instead.') },
            { ja: 'クレジットのリボ払いにする', jr: 'リボ払いにする', en: 'Switch to revolving credit', correct: false,
              why: t('毎月の支払いは減っても、手数料で合計はふえます。', '毎月はへっても、全部ではふえます。', 'Monthly payments drop, but fees make the total bigger.') }
          ] },
        { type: 'text', head: t('先に、少しだけ取っておく', '先に、少しだけとっておく', 'Save a little first'),
          ja: '給料が入ったら、先に数千円でも別の口座へ。病院や、家電がこわれたときなど、急な出費に使えます。',
          jr: 'お金が入ったら、先に少しだけべつにしておこう。急にお金がいるときに助かります。',
          en: 'When pay arrives, move even a few thousand yen to another account first. It covers surprises like a doctor’s visit or a broken appliance.',
          mark: t('先に数千円でも別の口座へ', '先に少しだけべつにしておこう', 'move even a few thousand yen') },
        { type: 'text', head: t('足りない分は、支援で埋められることも', 'たりないときは、支援もある', 'Support can fill the gap'),
          ja: '施設などを出た人は、生活費や家賃を借りられ、条件しだいで返さなくてよくなる「自立支援資金貸付」があります。くらしの相談窓口は、家計の立て直しも手伝ってくれます。',
          jr: '施設などを出た人には、生活費や家賃をかりられて、条件しだいで返さなくていい制度があります。',
          en: 'Care leavers can borrow living and rent money through the Independence Support Loan, forgivable on conditions. Local support desks also help fix a budget.',
          mark: t('「自立支援資金貸付」', '返さなくていい制度', 'Independence Support Loan') }
      ],
      recap: [
        t('固定費と変動費に分けて考える。', '固定費と変動費に分ける。', 'Split costs into fixed and variable.'),
        t('見直すなら、固定費から。', '見直すなら固定費から。', 'Cut fixed costs first.'),
        t('足りない分は、支援と相談で。', 'たりない分は、支援と相談で。', 'Fill gaps with support and advice.')
      ],
      cta: { href: '#/tools/money', label: t('生活費シミュレーターで計算する', null, 'Open the living-cost simulator') },
      related: ['jiritsu-shikin', 'tokyo-jiritsu-shikin', 'jiritsu-sodan', 'jukyo-kakuho', 'seikatsu-fukushi'],
      sources: [S.jflecKihon, S.jflecJhs, S.mhlwKonkyu, S.tcsw, S.nenkinHokenryo, S.nenkinMenjo],
      checked: CHECKED
    },

    /* 07 ---------------------------------------------------------------- */
    {
      id: 'yachin', order: 7, level: 'hs', minutes: 3, cat: 'housing',
      title: t('はじめての家賃と初期費用', '部屋をかりるときのお金', 'Your first rent and move-in costs'),
      lead: t('部屋を借りるときは、家賃のほかに「最初にまとめて払うお金」がかかります。',
        '部屋をかりるときは、家賃のほかに、さいしょにまとめてはらうお金があります。',
        'Renting means paying a lump of move-in costs on top of rent.'),
      steps: [
        { type: 'text', head: t('最初に払うお金', 'さいしょにはらうお金', 'Money you pay up front'),
          ja: '敷金・礼金・仲介手数料・前家賃（最初の月の家賃）・火災保険・保証会社のお金など。合わせると、家賃の何か月分にもなります。',
          jr: '敷金・礼金・仲介手数料・さいしょの月の家賃・火災保険など。合わせると、家賃の何か月分にもなります。',
          en: 'Deposit, key money, agent’s fee, the first month’s rent, fire insurance, a guarantor-company fee… together often several months of rent.',
          mark: t('家賃の何か月分にも', '家賃の何か月分にも', 'several months of rent') },
        { type: 'compare', head: t('敷金と礼金', '敷金と礼金', 'Deposit vs. key money'),
          left: { title: t('敷金', '敷金', 'Deposit (shikikin)'), tone: 'free',
            body: t('大家さんに預けるお金。出るときに、修理代や未払いを引いた残りが返ってくる。', '大家さんにあずけるお金。出るときに、のこりが返ってくる。', 'Held by the landlord. When you leave, you get back what remains after repairs or unpaid rent.') },
          right: { title: t('礼金', '礼金', 'Key money (reikin)'), tone: 'loan',
            body: t('大家さんに払うお礼のお金。出るときに返ってこない。', '大家さんへのお礼。返ってこない。', 'A thank-you payment to the landlord. Not returned.') } },
        { type: 'text', head: t('家賃6万円の部屋の例', '家賃6万円の部屋の例', 'Example: a ¥60,000 flat'),
          ja: '敷金1か月6万円・礼金1か月6万円・仲介手数料6万6千円・前家賃6万円・火災保険と保証料で約5万円。合計で約30万円になります。ただし仲介手数料は、借りる人が払うのは本来は家賃の0.55か月分（3万3千円）まで。前もって「いいよ」と言ったときだけ1.1か月分までです。',
          jr: '敷金6万円・礼金6万円・仲介手数料6万6千円・さいしょの家賃6万円・保険など約5万円。ぜんぶで約30万円。',
          en: 'Deposit ¥60,000, key money ¥60,000, agent’s fee ¥66,000, first month ¥60,000, insurance and guarantor ~¥50,000: about ¥300,000. But the tenant’s share of the agent’s fee is normally capped at 0.55 months (¥33,000); up to 1.1 months only if you agreed in advance.',
          big: { ja: '約30万円', en: 'about ¥300,000', label: t('初期費用の例', 'さいしょにはらうお金の例', 'Example move-in cost') } },
        { type: 'quiz', q: t('不動産会社に払う「仲介手数料」。家賃6万円なら、上限はいくら？', '仲介手数料。家賃6万円なら、いちばん高くていくら？', 'The agent’s fee for a ¥60,000 flat is capped at…'),
          options: [
            { ja: '12万円（家賃2か月分）', jr: '12万円', en: '¥120,000 (two months)', correct: false,
              why: t('「家賃1か月分×1.1倍」をこえる仲介手数料は、国のルール違反です。借りる人が払うのは、本来は家賃の0.55か月分まで。前もって「いいよ」と言ったときだけ1.1か月分までです。', '1か月分×1.1倍より高いのはルール違反です。', 'Anything above one month × 1.1 breaks the national rules. The tenant normally pays at most 0.55 months, or up to 1.1 only with prior consent.') },
            { ja: '6万6千円（家賃1か月分×1.1倍）', jr: '6万6千円', en: '¥66,000 (one month × 1.1)', correct: true,
              why: t('そのとおり。上限は「家賃1か月分×1.1倍」（税込）。借りる人が承諾していなければ、借りる人からは0.55か月分（3万3千円）までです。', 'そのとおり。家賃1か月分×1.1倍までです。', 'Right: one month × 1.1 including tax. Without your consent, the tenant’s share is capped at 0.55 months (¥33,000).') },
            { ja: '決まりはない', jr: '決まりはない', en: 'There is no cap', correct: false,
              why: t('上限は国が決めています。見積もりで金額を確かめましょう。', '上限は決まっています。', 'The government sets a cap. Check the quote.') }
          ] },
        { type: 'text', head: t('初期費用を下げる方法', 'さいしょのお金をへらす方法', 'Ways to lower move-in costs'),
          ja: 'UR賃貸は、礼金・仲介手数料・更新料・保証人がいりません。東京都の「自立生活スタート支援」では引っ越し代などを借りられ、条件しだいで返さなくてよくなります。',
          jr: 'UR賃貸は、礼金や仲介手数料がいりません。施設などを出る人は、引っこし代をかりられる東京都の制度もあります。',
          en: 'UR rentals need no key money, agent’s fee, renewal fee or guarantor. Tokyo’s start-up support lends moving costs and can forgive them on conditions.',
          mark: t('礼金・仲介手数料・更新料・保証人がいりません', '礼金や仲介手数料がいりません', 'no key money, agent’s fee, renewal fee or guarantor') },
        { type: 'text', head: t('入る日に、写真を撮る', '入る日に、写真をとる', 'Take photos on move-in day'),
          ja: '入居した日に、部屋のキズや汚れを日付入りの写真で残しておこう。出るときの敷金の精算で役立ちます。',
          jr: '入った日に、部屋のキズやよごれを写真にとっておこう。出るときに役立ちます。',
          en: 'On move-in day, photograph scratches and stains with the date. It helps when the deposit is settled.',
          mark: t('日付入りの写真', '写真にとっておこう', 'photograph scratches and stains with the date') },
        { type: 'quiz', q: t('「敷金なし」の部屋。出るときのお金は？', '「敷金なし」の部屋。出るときは？', 'A “no deposit” flat. What about moving out?'),
          options: [
            { ja: 'なにも払わなくていい', jr: 'なにもはらわない', en: 'Nothing to pay', correct: false,
              why: t('敷金がなくても、借りた人が負担する修理代（原状回復）は払います。', '敷金がなくても、こわした分ははらいます。', 'Even with no deposit, you pay repair costs that are your responsibility.') },
            { ja: '家賃1か月分を必ず払う', jr: '家賃1か月分をはらう', en: 'Always one month’s rent', correct: false,
              why: t('決まった額ではありません。契約書の「特約」を、入る前に確かめましょう。', '決まった金額ではありません。契約書を見よう。', 'There is no fixed amount. Read the special terms in the contract before moving in.') },
            { ja: '自分が汚したりこわしたりした分は、払う必要がある', jr: '自分がよごした・こわした分は、はらう', en: 'You pay for damage you caused', correct: true,
              why: t('そのとおり。東京都のガイドラインにも、敷金がなくても原状回復の費用は払う必要があると書かれています。', 'そのとおり。敷金がなくても、はらう必要があります。', 'Right. Tokyo’s guideline says restoration costs still apply without a deposit.') }
          ] }
      ],
      recap: [
        t('初期費用は、家賃の何か月分にもなる。', 'さいしょのお金は、家賃の何か月分も。', 'Move-in costs = several months of rent.'),
        t('仲介手数料の上限は、家賃1か月分×1.1倍。', '仲介手数料は1か月分×1.1倍まで。', 'Agent’s fee cap: one month × 1.1.'),
        t('入居の日に、写真を撮る。', '入る日に写真をとる。', 'Photograph the flat on day one.')
      ],
      related: ['ur-chintai', 'tokyo-jiritsu-start', 'mimoto-hosho', 'tokyo-sasaeru-jutaku', 'seikatsu-fukushi'],
      sources: [S.mlitFee, S.tokyoChintai, S.ur, S.tcsw],
      checked: CHECKED
    },

    /* 08 ---------------------------------------------------------------- */
    {
      id: 'shogakukin', order: 8, level: 'hs', minutes: 3, cat: 'education',
      title: t('奨学金の種類', '奨学金って、どんなもの？', 'Types of scholarships'),
      lead: t('「もらう」奨学金と「借りる」奨学金。利息のあるなしで、返す額が大きく変わります。',
        '「もらう」奨学金と「かりる」奨学金があります。',
        'Some scholarships are given, some are lent. Interest changes what you repay.'),
      steps: [
        { type: 'text', head: t('JASSOの奨学金は3つ', '国の奨学金は3つ', 'JASSO has three types'),
          ja: '返さなくていい「給付奨学金」。利息なしで借りる「第一種」。利息ありで借りる「第二種」（利率は年3%まで）。',
          jr: '返さなくていい「給付」。ふえないでかりる「第一種」。ふえてかりる「第二種」。',
          en: 'A grant you never repay, Type 1 loans with no interest, and Type 2 loans with interest (capped at 3% a year).',
          mark: t('返さなくていい「給付奨学金」', '返さなくていい「給付」', 'A grant you never repay') },
        { type: 'compare', head: t('給付と貸与', 'もらう・かりる', 'Grant vs. loan'),
          left: { title: t('給付奨学金', '給付', 'Grant'), tone: 'free', big: t('返す 0円', null, 'Repay ¥0'),
            points: [t('私立大学・ひとり暮らしなら最大 月75,800円', '私立大学でひとり暮らしなら、月75,800円まで', 'Up to ¥75,800/month (private university, living away)'), t('授業料・入学金の減免もいっしょに受けられる', '授業料が安くなる支援もいっしょに', 'Comes with tuition and entry-fee reductions')] },
          right: { title: t('貸与奨学金', '貸与', 'Loan'), tone: 'loan', big: t('卒業後に返す', null, 'Repay after graduating'),
            points: [t('第一種は利息なし', '第一種はふえない', 'Type 1: no interest'), t('第二種は利息あり（年3%まで）', '第二種はふえる（年3%まで）', 'Type 2: interest (max 3%)'), t('在学中は利息がつかない', '学校にいる間はふえない', 'No interest while studying')] } },
        { type: 'text', head: t('利息で、ここまで変わる', '利息で、こんなにかわる', 'How much interest adds'),
          ja: '月10万円を4年借りると480万円。利率3%で20年かけて返すと、返す合計は約646万円。利息だけで約166万円です（JASSOの計算例）。',
          jr: '月10万円を4年かりると480万円。3%なら、返すのはぜんぶで約646万円。166万円もふえます。',
          en: '¥100,000 a month for 4 years is ¥4.8 million. At 3% over 20 years you repay about ¥6.46 million: about ¥1.66 million is interest (JASSO example).',
          big: { ja: '＋約166万円', en: '+¥1.66 million', label: t('480万円・年3%・20年', null, '¥4.8M · 3% · 20 years') } },
        { type: 'quiz', q: t('同じ480万円を借りるなら、返す合計が少ないのは？', '480万円をかりるなら、返すお金が少ないのは？', 'Borrowing ¥4.8 million, which costs less in total?'),
          options: [
            { ja: '第二種（利息あり）', jr: '第二種', en: 'Type 2 (with interest)', correct: false,
              why: t('利息の分だけ多く返します。利率3%なら約166万円ふえます。', 'ふえる分だけ、多く返します。', 'You repay the interest too: about ¥1.66 million more at 3%.') },
            { ja: 'どちらも同じ', jr: 'どちらも同じ', en: 'Both the same', correct: false,
              why: t('利息があるかないかで、返す合計が大きく変わります。', 'ふえるかどうかで、大きくかわります。', 'Interest makes a big difference to the total.') },
            { ja: '第一種（利息なし）', jr: '第一種', en: 'Type 1 (no interest)', correct: true,
              why: t('そのとおり。借りた480万円だけを返します。第一種には成績や家計の基準があります。', 'そのとおり。かりた分だけ返します。', 'Right. You repay just the ¥4.8 million. Type 1 has grade and income criteria.') }
          ] },
        { type: 'text', head: t('施設や里親家庭から通う人', '施設や里親家庭から通う人', 'If you live in care while studying'),
          ja: '児童養護施設や里親家庭などから通う人は、自宅から通う場合の給付額が少し多くなります。家賃を払って暮らすなら「自宅外」として申請できることもあります。',
          jr: '施設や里親家庭から学校に通う人は、もらえる金額が少し多くなります。',
          en: 'Students living in a children’s home or with foster carers get a slightly higher “living at home” grant, and can apply as “living away” if they pay rent.',
          mark: t('給付額が少し多くなります', '少し多くなります', 'a slightly higher') },
        { type: 'quiz', q: t('給付奨学金は、いつ申し込むのが基本？', '給付奨学金は、いつ申しこむ？', 'When do you usually apply for the grant?'),
          options: [
            { ja: '高3のとき、高校を通じて（予約採用）', jr: '高3のとき、高校で', en: 'In the final year of high school, through school', correct: true,
              why: t('そのとおり。進学の前の年に、高校で申し込みます。締切は学校ごとにちがうので、高3の春に先生に聞こう。進学後に学校で申し込むこともできます。', 'そのとおり。高3の春に、先生に聞こう。', 'Right. You apply through school the year before you start. Deadlines vary, so ask in spring. You can also apply after enrolling.') },
            { ja: 'お金がなくなってから', jr: 'お金がなくなってから', en: 'When money runs out', correct: false,
              why: t('申し込みには時期があります。早めに準備しておくと安心です。', '申しこむ時期が決まっています。', 'There are set application periods. Prepare early.') },
            { ja: '大学を卒業してから', jr: '卒業してから', en: 'After graduating', correct: false,
              why: t('奨学金は学校にいる間のお金です。卒業後には申し込めません。', '学校にいる間のお金です。', 'Scholarships are for while you study.') }
          ] }
      ],
      recap: [
        t('まず給付。足りなければ第一種、最後に第二種。', 'まず給付。つぎに第一種。', 'Grant first, then Type 1, then Type 2.'),
        t('第二種は、利息で返す額がふえる。', '第二種は、返すお金がふえる。', 'Type 2 costs more because of interest.'),
        t('高3の春に、学校で申し込み。', '高3の春に、学校で申しこむ。', 'Apply through school in spring of your final year.')
      ],
      related: ['jasso-kyufu', 'jasso-genmen', 'yume-shogaku', 'jasso-juken'],
      sources: [S.jassoAbout, S.jassoKyufu, S.jassoTaiyo, S.jassoRishi, S.jflecUniv],
      checked: CHECKED
    },

    /* 09 ---------------------------------------------------------------- */
    {
      id: 'zeikin-hoken-nenkin', order: 9, level: 'hs', minutes: 3, cat: 'procedures',
      title: t('税金・保険・年金のきほん', '税金と保険と年金って？', 'Tax, insurance and pension basics'),
      lead: t('みんなで出しあって、困ったときに支えあうしくみ。払えないときの方法もあります。',
        'みんなでお金を出しあって、こまったときにたすけあうしくみです。',
        'Everyone chips in so people are supported when things go wrong. There are options if you cannot pay.'),
      steps: [
        { type: 'text', head: t('3つの役わり', '3つの役わり', 'Three jobs'),
          ja: '税金は、学校や道路など、みんなのサービスに。健康保険は、病気やけがのときに。年金は、年をとったときだけでなく、障害が残ったときにも支えてくれます。',
          jr: '税金は、学校や道路に。健康保険は、病気やけがのときに。年金は、年をとったときや、障害が残ったときに。',
          en: 'Taxes pay for schools, roads and services. Health insurance helps when you are ill or hurt. Pension supports you in old age and also if you become disabled.',
          mark: t('障害が残ったときにも', '障害が残ったとき', 'also if you become disabled') },
        { type: 'compare', head: t('働き方で、入るものが変わる', '働き方で、入るものがかわる', 'It depends on how you work'),
          left: { title: t('会社で働く', '会社で働く', 'Employee'), tone: 'neutral',
            points: [t('健康保険＋厚生年金', '健康保険＋厚生年金', 'Health insurance + employees’ pension'), t('保険料は会社と半分ずつ', '会社と半分ずつ', 'Premiums split with the employer'), t('給料から引かれる', '給料から引かれる', 'Taken from your pay')] },
          right: { title: t('それ以外（自分で入る）', 'それいがい', 'Everyone else'), tone: 'neutral',
            points: [t('国民健康保険＋国民年金', '国民健康保険＋国民年金', 'National Health Insurance + national pension'), t('保険料は自分で払う', '自分ではらう', 'You pay the premiums yourself'), t('払えないときは、減らす・待ってもらう申請ができる', 'はらえないときは、申請できる', 'You can apply for reductions or waivers')] } },
        { type: 'text', head: t('20歳になったら国民年金', '20歳になったら国民年金', 'Pension starts at 20'),
          ja: '日本に住む20歳以上の人は、国民年金に入ります。20歳になって2週間くらいで「加入のお知らせ」と納付書が届きます（会社の厚生年金に入っている人は別です）。保険料は月17,920円（2026年度）。',
          jr: '20歳になると、国民年金のお知らせと、はらうための紙が届きます。保険料は月17,920円（2026年度）。',
          en: 'Everyone living in Japan joins the national pension at 20. About two weeks after your birthday a notice and payment slips arrive (not if you are in an employer’s pension). The premium is ¥17,920 a month (FY2026).',
          big: { ja: '月 17,920円', en: '¥17,920 / month', label: t('国民年金の保険料（2026年度）', null, 'National pension premium, FY2026') } },
        { type: 'quiz', q: t('国民年金の保険料が払えない。どうする？', '年金の保険料がはらえない。どうする？', 'You can’t pay the pension premium. What now?'),
          options: [
            { ja: 'そのまま放っておく', jr: 'そのままにする', en: 'Ignore it', correct: false,
              why: t('未納のまま放っておくと、障害年金などが受け取れなくなる場合があります。', 'そのままにすると、こまったときの年金がもらえないことがあります。', 'Leaving it unpaid can cost you disability and other pensions.') },
            { ja: '免除や納付猶予を申請する（学生なら学生納付特例）', jr: '「はらえません」と申請する', en: 'Apply for an exemption or deferral (students: student deferral)', correct: true,
              why: t('そのとおり。申請して認められれば「未納」になりません。市区町村の窓口や年金事務所、ネットで申請できます。', 'そのとおり。申請すれば「未納」になりません。', 'Right. If approved, it does not count as unpaid. Apply at the city office, a pension office or online.') },
            { ja: '年金はもらえないから、払わなくていい', jr: '年金はもらえないから、はらわない', en: 'Pensions won’t exist, so why pay', correct: false,
              why: t('年金は老後だけでなく、障害や家族が亡くなったときの支えでもあります。', '年金は、障害が残ったときなどにもたすけてくれます。', 'Pension also covers disability and loss of a family breadwinner.') }
          ] },
        { type: 'text', head: t('税金が戻ってくることも', '税金がもどってくることも', 'Tax can come back'),
          ja: '給料から引かれた所得税が多すぎたときは、年末調整や確定申告で戻ってきます。年の途中で仕事をやめた人は、確定申告を忘れずに。',
          jr: '給料から引かれた税金が多すぎると、あとでもどってきます。仕事を途中でやめた年は、確定申告を。',
          en: 'If too much income tax was taken from your pay, you get it back through year-end adjustment or a tax return. Left a job mid-year? File a return.',
          mark: t('確定申告を忘れずに', '確定申告を', 'File a return') },
        { type: 'quiz', q: t('会社に入らず、アルバイトで暮らす。病院の保険は？', '会社に入らず、バイトで暮らす。病院の保険は？', 'You live on part-time work, no company insurance. Health cover?'),
          options: [
            { ja: '保険がなくても大丈夫', jr: '保険がなくても大丈夫', en: 'No insurance is fine', correct: false,
              why: t('保険がないと、病院代が全額自分の負担になります。', '保険がないと、病院代がとても高くなります。', 'Without insurance you pay the full medical bill.') },
            { ja: '住んでいる区市町村の国民健康保険に入る', jr: '住んでいるところの国民健康保険に入る', en: 'Join your city’s National Health Insurance', correct: true,
              why: t('そのとおり。会社の保険に入らない人は国保に入ります。収入が少ないと保険料が安くなるしくみもあります。', 'そのとおり。収入が少ないと安くなるしくみもあります。', 'Right. If you’re not on a company plan you join NHI, and premiums are reduced on low income.') },
            { ja: '20歳までは入らなくていい', jr: '20歳までは入らない', en: 'Not needed until 20', correct: false,
              why: t('年齢に関係なく、何かの健康保険に入る必要があります。', '年れいに関係なく、入ります。', 'Everyone needs some health insurance, whatever their age.') }
          ] }
      ],
      recap: [
        t('20歳から国民年金。払えないときは申請。', '20歳から年金。はらえないときは申請。', 'Pension from 20. Can’t pay? Apply for relief.'),
        t('会社員は社会保険、ほかの人は国保と国民年金。', '会社の人と、それ以外で入る保険がちがう。', 'Employees: company plans. Others: NHI + national pension.'),
        t('払いすぎた税金は、戻ってくる。', 'はらいすぎた税金は、もどる。', 'Overpaid tax comes back.')
      ],
      related: ['nenkin-gakusei', 'nenkin-menjo', 'kokuho', 'hikkoshi-todoke', 'mynumber-card'],
      sources: [S.nenkinHatachi, S.nenkinHokenryo, S.nenkinMenjo, S.nenkinGakusei, S.nenkinKounen, S.ntaKanpu],
      checked: CHECKED
    },

    /* 10 ---------------------------------------------------------------- */
    {
      id: 'komattara', order: 10, level: 'hs', minutes: 2, cat: 'consult',
      title: t('お金に困ったら、借りる前に', 'お金がたりないときは', 'Short on money? Before you borrow'),
      lead: t('ひとりで抱えないで。公的な窓口には、返さなくていい支援や、利子なしの貸付があります。',
        'ひとりでなやまないで。国や区市町村の窓口には、たすけてくれるしくみがあります。',
        'Don’t carry it alone. Public desks have support you don’t repay and interest-free loans.'),
      steps: [
        { type: 'text', head: t('まず、くらしの相談窓口', 'まず、相談窓口へ', 'Start at the life-support desk'),
          ja: '区市町村の「自立相談支援機関」は、お金・仕事・住まいの困りごとをまとめて聞いて、いっしょに計画を作ってくれます。家計の立て直しも手伝います。',
          jr: '区市町村の相談窓口は、お金・仕事・住まいのこまりごとを、まとめて聞いてくれます。',
          en: 'Your city’s self-reliance support desk listens to money, work and housing worries together and makes a plan with you, including fixing your budget.',
          mark: t('まとめて聞いて', 'まとめて聞いてくれます', 'listens to money, work and housing worries together') },
        { type: 'compare', head: t('同じ「お金を借りる」でも', '同じ「かりる」でも', 'Not all borrowing is the same'),
          left: { title: t('公的な貸付（社会福祉協議会）', '公的なかしつけ', 'Public loans (social welfare council)'), tone: 'free',
            points: [t('緊急小口資金は10万円以内・利子なし', '急なときは10万円まで、ふえない', 'Emergency small loan: up to ¥100,000, no interest'), t('相談しながら使える', '相談しながら使える', 'Comes with advice')] },
          right: { title: t('SNSの「お金貸します」', 'SNSの「お金かします」', '“Cash loans” on social media'), tone: 'loan',
            points: [t('法外な利息', 'とても高い利息', 'Illegal interest'), t('脅し・個人情報をさらされる', 'おどされる・名前をさらされる', 'Threats, your details exposed')] } },
        { type: 'quiz', q: t('家賃が払えなくなりそう。まずどこへ？', '家賃がはらえなくなりそう。どこへ？', 'You may not make rent. Where first?'),
          options: [
            { ja: 'カードのキャッシングで払う', jr: 'カードでお金をかりる', en: 'Use a card cash advance', correct: false,
              why: t('利息がついて、あとがもっと苦しくなりがちです。先に公的な窓口へ。', 'ふえて、あとがもっと大変になります。', 'Interest makes it harder later. Try a public desk first.') },
            { ja: '大家さんに何も言わずに様子を見る', jr: 'だれにも言わない', en: 'Say nothing and wait', correct: false,
              why: t('早めに相談するほど、選べる方法がふえます。', '早く相談するほど、方法がふえます。', 'The earlier you ask, the more options you have.') },
            { ja: '区市町村のくらしの相談窓口（住まいの支援も聞ける）', jr: '区市町村の相談窓口', en: 'The city life-support desk (ask about housing help)', correct: true,
              why: t('そのとおり。仕事をなくしたり収入が減ったときは、家賃の分が支給される「住居確保給付金」などの支援があります。', 'そのとおり。家賃をたすけてくれる制度もあります。', 'Right. If you lost work or income, there is support such as the housing security benefit that covers rent.') }
          ] },
        { type: 'text', head: t('生活保護も、申請できる', '生活保護も、申請できる', 'You can apply for welfare'),
          ja: '収入が国の決めた最低生活費に足りないときは、生活保護を申請できます。窓口は、住んでいる地域の福祉事務所です。',
          jr: 'くらすためのお金がたりないときは、生活保護を申請できます。窓口は福祉事務所です。',
          en: 'If your income is below the government’s minimum cost of living, you can apply for public assistance at your local welfare office.',
          mark: t('生活保護を申請できます', '生活保護を申請できます', 'you can apply for public assistance') },
        { type: 'text', head: t('借金が返せないとき', '借金が返せないとき', 'If you can’t repay a debt'),
          ja: '返せない借金は、消費生活センター（188）や法テラスに相談を。借金を減らしたり整理したりする方法があります。',
          jr: '返せない借金は、188や法テラスに相談。へらす方法があります。',
          en: 'For debts you can’t repay, ask a consumer centre (188) or Hōterasu. There are ways to reduce or restructure debt.',
          mark: t('整理したりする方法があります', 'へらす方法があります', 'ways to reduce or restructure debt') },
        { type: 'quiz', q: t('「返せないかも」と思ったら、いつ相談する？', '「返せないかも」と思ったら、いつ相談？', 'When should you ask for help with a debt?'),
          options: [
            { ja: 'できるだけ早く', jr: 'できるだけ早く', en: 'As soon as possible', correct: true,
              why: t('そのとおり。延滞が長くなるほど延滞金がふえ、信用情報にも残ります。早いほど選べる方法が多いです。', 'そのとおり。早いほど、方法がたくさんあります。', 'Right. Late fees grow and your credit record suffers. Early means more options.') },
            { ja: '返せなくなって半年たってから', jr: '半年たってから', en: 'After six months of missed payments', correct: false,
              why: t('待つほど延滞金がふえます。今日、相談しよう。', '待つほど、ふえます。', 'Waiting only adds late fees.') },
            { ja: 'だれにも言わない', jr: 'だれにも言わない', en: 'Tell no one', correct: false,
              why: t('ひとりで抱えると、どんどん苦しくなります。相談は無料の窓口が多いです。', 'ひとりでなやまないで。無料の窓口があります。', 'It gets heavier alone. Many advice desks are free.') }
          ] }
      ],
      recap: [
        t('困ったら、まずくらしの相談窓口。', 'こまったら、まず相談窓口。', 'Start at the life-support desk.'),
        t('公的な貸付には、利子なしのものも。', '公的なかしつけは、ふえないものも。', 'Public loans can be interest-free.'),
        t('SNSの「お金貸します」には近づかない。', 'SNSの「お金かします」はダメ。', 'Stay away from social-media lenders.')
      ],
      related: ['jiritsu-sodan', 'jukyo-kakuho', 'seikatsu-fukushi', 'seikatsu-hogo', 'houterasu', 'shohisha-188', 'yorisoi'],
      sources: [S.mhlwKonkyu, S.mhlwFukushi, S.mhlwHogo, S.jflecUniv],
      checked: CHECKED
    },

    /* 11 ---------------------------------------------------------------- 中学生 */
    {
      id: 'jr-koko-okane', order: 11, level: 'jr', minutes: 3, cat: 'education',
      title: t('高校にかかるお金と支援', '高校のお金、どうなるの？', 'High school costs and support'),
      lead: t('授業料は、国と東京都の支援で大きく下がります。手続きを忘れないことが大事。',
        '高校の授業料は、国と東京都がたすけてくれます。手つづきをわすれずに。',
        'National and Tokyo support cut tuition a lot. Just don’t miss the paperwork.'),
      steps: [
        { type: 'text', head: t('高校でかかるお金', '高校でかかるお金', 'What high school costs'),
          ja: '授業料のほかに、入学金、教科書・制服・通学の定期代などがかかります。授業料と、それ以外のお金で、使える支援がちがいます。',
          jr: '授業料のほかに、入学金、教科書、制服、電車の定期代などがかかります。',
          en: 'Besides tuition there are entry fees, textbooks, uniforms and commuter passes. Tuition and other costs have different support.',
          mark: t('使える支援がちがいます', '授業料のほかに', 'different support') },
        { type: 'compare', head: t('授業料の支援（2026年度）', '授業料の支援（2026年度）', 'Tuition support, FY2026'),
          left: { title: t('都立高校（全日制）', '都立高校', 'Tokyo public high school'), tone: 'free', big: t('実質 0円', null, 'effectively ¥0'),
            body: t('授業料は年11万8,800円。国の「就学支援金」で全部まかなわれる。', '授業料は国がぜんぶ出してくれる。', 'Tuition is ¥118,800 a year, fully covered by the national tuition support fund.') },
          right: { title: t('私立高校（全日制）', '私立高校', 'Private high school'), tone: 'free', big: t('最大 年50万1,000円', null, 'up to ¥501,000/yr'),
            body: t('国の就学支援金45万7,200円＋東京都の助成4万3,800円。学校の授業料が上限。', '国と東京都で、年50万1,000円までたすけてくれる。', 'National ¥457,200 + Tokyo ¥43,800, up to the school’s actual tuition.') },
          note: t('2026年度から、家の収入に関係なく使えます（東京都の助成は都内に住む人）。東京都の助成は毎年の申請が必要。国の支援金も、学校から案内が来たら必ず手続きします。',
            '家の収入に関係なく使えます。学校から案内が来たら、かならず申請しよう。',
            'From FY2026 there is no income limit (Tokyo’s top-up is for Tokyo residents). Tokyo’s top-up needs a new application every year; for the national fund, always act when school sends instructions.') },
        { type: 'quiz', q: t('就学支援金で授業料が支援されたら、卒業後に返す？', '就学支援金は、あとで返す？', 'Do you repay the tuition support fund after graduating?'),
          options: [
            { ja: '卒業したら返す', jr: '卒業したら返す', en: 'Yes, after graduating', correct: false,
              why: t('返す必要はありません。国の支援金です。', '返さなくていいお金です。', 'No. It is national support you never repay.') },
            { ja: '返さなくていい', jr: '返さなくていい', en: 'No, never', correct: true,
              why: t('そのとおり。就学支援金は返済不要で、お金は学校が受け取って授業料にあてます。', 'そのとおり。お金は学校にはらわれます。', 'Right. It is never repaid; the school receives it and applies it to tuition.') },
            { ja: '20歳になったら返す', jr: '20歳になったら返す', en: 'Yes, at 20', correct: false,
              why: t('年齢で返すことはありません。返さなくていいお金です。', '返さなくていいお金です。', 'No. It is never repaid.') }
          ] },
        { type: 'text', head: t('授業料以外：奨学給付金', '教科書代などは：奨学給付金', 'Other costs: the scholarship benefit'),
          ja: '教科書代や教材費には、返さなくていい「高校生等奨学給付金」（家の収入の条件あり）。7〜9月に申請し（都立は7月8日〜9月15日）、新入生は7月上旬（都立は7月7日）までに、年額の4分の1を早めにもらう申請もできます。',
          jr: '教科書代などには、返さなくていい「奨学給付金」があります。夏（7〜9月）に申しこみます。',
          en: 'For textbooks and materials there is the high school scholarship benefit, never repaid (income limits apply). Apply in July–September (Tokyo public schools: 8 July–15 September); new students can claim a quarter early, by early July (Tokyo public: 7 July).',
          mark: t('返さなくていい「高校生等奨学給付金」', '返さなくていい「奨学給付金」', 'never repaid') },
        { type: 'text', head: t('受験のお金：受験生チャレンジ支援貸付', '塾と受験料：受験生チャレンジ', 'Exam costs: Tokyo’s exam-support loan'),
          ja: '東京都の制度で、中3は塾代30万円まで・高校の受験料2万7,400円までを、利息なしで借りられます。高校に入学すれば返さなくてよくなります（家の収入などの条件あり。申し込むのは家の人）。施設や里親家庭の人は、塾代や受験料を施設が出してくれることが多いので、まず職員や里親さんに聞こう。',
          jr: '東京都の制度で、塾代と受験料をかりられます。高校に入学できたら、返さなくていい。施設や里親家庭の人は、施設が出してくれることが多いよ。まず職員や里親さんに聞こう。',
          en: 'Tokyo lends grade-9 students up to ¥300,000 for cram school and ¥27,400 for exam fees, interest-free. Entering high school cancels the debt (income limits; a parent or guardian applies). In a children’s home or foster care, the home often pays these costs: ask staff or your foster carer first.',
          mark: t('高校に入学すれば返さなくてよくなります', '返さなくていい', 'Entering high school cancels the debt') },
        { type: 'quiz', q: t('受験生チャレンジで借りて、高校に入学した。次にすることは？', '受験生チャレンジでかりて、高校に入学した。次は？', 'You used the exam-support loan and started high school. What next?'),
          options: [
            { ja: '何もしなくていい', jr: '何もしない', en: 'Nothing', correct: false,
              why: t('手続きをしないと、返すことになります。', '手つづきをしないと、返すことになります。', 'Without the paperwork, you have to repay it.') },
            { ja: '高校を卒業してから考える', jr: '卒業してから考える', en: 'Think about it after graduating', correct: false,
              why: t('期限は入学した年の5月末です。卒業まで待つと間に合いません。', '期限は、入学した年の5月末です。', 'The deadline is the end of May of your first year.') },
            { ja: '入学した年の5月末までに、免除の書類を窓口に出す', jr: '5月末までに、免除の紙を出す', en: 'Hand in the forgiveness form by the end of May', correct: true,
              why: t('そのとおり。在学証明書（または学生証）などを、区市町村の窓口へ。塾などの領収書も全部出しておく必要があります。', 'そのとおり。学生証などを持って、窓口へ。', 'Right. Bring proof of enrolment (or student ID) to the city desk. All cram-school receipts must be handed in too.') }
          ] },
        { type: 'text', head: t('手続きは、だれかと一緒に', '手つづきは、だれかといっしょに', 'Do the paperwork with someone'),
          ja: '就学支援金の申請は、入学後すぐに学校から案内があります。都立高校は「都立高等学校オンライン申請受付システム」、私立高校などは「e-Shien」で申請します（学校の案内にしたがおう）。家の人や施設の職員・里親さんと一緒に、期限を確かめて出そう。',
          jr: '入学したら、学校から申請の案内があります。家の人や施設の職員・里親さんといっしょに出そう。',
          en: 'School tells you how to apply for the tuition support fund right after you start. Tokyo public high schools use Tokyo’s own online system; private schools and others use e-Shien (follow your school’s instructions). Do it with a parent, carer or staff member and check the deadline.',
          mark: t('期限を確かめて出そう', 'いっしょに出そう', 'check the deadline') }
      ],
      recap: [
        t('都立の授業料は実質0円。私立も最大年50万1,000円の支援。', '都立の授業料は、実質0円。', 'Public tuition ≈ ¥0; private up to ¥501,000 a year.'),
        t('教科書代などは奨学給付金（7〜9月に申請）。', '教科書代は奨学給付金。', 'Other costs: scholarship benefit (apply Jul–Sep).'),
        t('受験生チャレンジは、入学で免除。5月末までに手続き。', '受験生チャレンジは、5月末までに手つづき。', 'Exam loan: forgiven on entry. File by end of May.')
      ],
      related: ['koko-shugaku', 'tokyo-toritsu-jugyoryo', 'tokyo-shiritsu-jugyoryo', 'koko-kyufukin', 'tokyo-kokoritsu-kyufukin', 'tokyo-juken-challenge', 'kodomo-gakushu-shien', 'tokyo-kyoiku-sodan'],
      sources: [S.mextKoko, S.mextShien, S.mextKyufu, S.toritsuJugyo, S.toritsuKyufu, S.toritsuOnline, S.shigaku, S.shigakuLeaf, S.juken, S.jukenProc],
      checked: CHECKED
    },

    /* 12 ---------------------------------------------------------------- 中学生 */
    {
      id: 'jr-baito-zeikin', order: 12, level: 'jr', minutes: 3, cat: 'work',
      title: t('おこづかい・バイトと税金', 'おこづかいとバイトと税金', 'Allowance, part-time jobs and tax'),
      lead: t('中学生は、まだバイトできません。高校生になったら知っておきたい、時給と税金のこと。',
        '中学生は、まだバイトできません。高校生になる前に、知っておこう。',
        'You can’t work part-time yet in junior high. Here is what to know for high school.'),
      steps: [
        { type: 'text', head: t('中学生は、まだ働けない', '中学生は、まだ働けない', 'Junior high students can’t work yet'),
          ja: '法律で、15歳になったあとの最初の3月31日まで（ふつうは中学校を卒業するまで）は、原則としてアルバイトできません。新聞配達などの例外も、労働基準監督署の許可が必要です。',
          jr: '法律で、中学校を卒業する3月31日までは、ふつうはアルバイトできません。',
          en: 'By law, you generally can’t be employed until the 31 March after you turn 15 (usually junior high graduation). Exceptions like newspaper delivery need a labour inspection office’s permission.',
          mark: t('原則としてアルバイトできません', 'ふつうはアルバイトできません', 'generally can’t be employed') },
        { type: 'text', head: t('「必要」と「ほしい」に分ける', '「ひつよう」と「ほしい」', 'Needs and wants'),
          ja: 'おこづかいを使う前に「必要なもの？ほしいもの？」と考えるだけで、使いすぎが減ります。メモやアプリで記録するのもおすすめ。',
          jr: 'お金を使う前に「ひつよう？ほしいだけ？」と考えよう。メモしておくと、もっとわかります。',
          en: 'Before spending, ask “Do I need it or just want it?” It cuts overspending. Writing it down helps too.',
          mark: t('「必要なもの？ほしいもの？」', '「ひつよう？ほしいだけ？」', '“Do I need it or just want it?”') },
        { type: 'quiz', q: t('「必要なもの」はどれ？', '「ひつようなもの」はどれ？', 'Which one is a need?'),
          options: [
            { ja: '人気キャラのグッズ', jr: '人気キャラのグッズ', en: 'Merch of a popular character', correct: false,
              why: t('それは「ほしいもの」。買うのは悪くないけど、必要なものの後に。', 'それは「ほしいもの」です。', 'That’s a want. Fine to buy, but after the needs.') },
            { ja: 'ゲームのガチャ', jr: 'ゲームのガチャ', en: 'A game gacha pull', correct: false,
              why: t('それも「ほしいもの」。1か月の上限を決めておこう。', 'それも「ほしいもの」。上限を決めよう。', 'Also a want. Set a monthly limit.') },
            { ja: '学校で使うノート', jr: '学校で使うノート', en: 'Notebooks for school', correct: true,
              why: t('そのとおり。勉強に使うノートは「必要なもの」です。', 'そのとおり。学校で使うものは「ひつよう」。', 'Right. Things you need for school are needs.') }
          ] },
        { type: 'text', head: t('高校生のバイト代は？', '高校生のバイト代は？', 'High school part-time pay'),
          ja: '東京都の最低賃金は、2026年10月1日から時給1,280円。これより低い時給は法律違反です。18歳未満は、残業や深夜の仕事はできません。',
          jr: '東京都では、時給は1,280円より下げてはいけないきまりです（2026年10月から）。18歳になるまでは、夜おそくは働けません。',
          en: 'Tokyo’s minimum wage is ¥1,280 an hour from 1 October 2026; paying less is illegal. Under-18s can’t do overtime or late-night work.',
          big: { ja: '時給 1,280円', en: '¥1,280 / hour', label: t('東京都の最低賃金（2026年10月1日から）', '東京都の最低賃金', 'Tokyo minimum wage from 1 Oct 2026') } },
        { type: 'quiz', q: t('時給1,280円で、1日4時間・月12日働くと、1か月のバイト代は？', '時給1,280円、1日4時間、月12日。1か月でいくら？', '¥1,280 an hour, 4 hours a day, 12 days a month. Monthly pay?'),
          options: [
            { ja: '15,360円', jr: '15,360円', en: '¥15,360', correct: false,
              why: t('それは3日分（1,280×4×3）。12日分で計算しよう。', 'それは3日分です。', 'That’s three days. Work it out for 12.') },
            { ja: '61,440円', jr: '61,440円', en: '¥61,440', correct: true,
              why: t('そのとおり。1,280円×4時間×12日＝61,440円。1年続けると約74万円で、所得税はかかりません。', 'そのとおり。1,280×4×12＝61,440円。', 'Right. ¥1,280 × 4 × 12 = ¥61,440. About ¥740,000 a year: no income tax.') },
            { ja: '128,000円', jr: '128,000円', en: '¥128,000', correct: false,
              why: t('それは100時間分。今回は4時間×12日＝48時間です。', 'それは100時間分です。', 'That’s 100 hours. Here it’s 4 × 12 = 48 hours.') }
          ] },
        { type: 'compare', head: t('バイト代と税金', 'バイト代と税金', 'Part-time pay and tax'),
          left: { title: t('所得税', '所得税', 'Income tax'), tone: 'free', big: t('年178万円まで 0円', null, '¥0 up to ¥1.78M/yr'),
            body: t('給料だけなら、年178万円まではかかりません（2026年分から。2025年分は160万円）。', '給料が年178万円までなら、かかりません。', 'With only wages, none up to ¥1.78 million a year (from 2026; ¥1.6 million for 2025).') },
          right: { title: t('住民税', '住民税', 'Resident tax'), tone: 'neutral',
            body: t('前の年の収入にかかる税金。その年の1月1日に18歳未満なら、前の年の給料が204万4千円未満のときはかかりません（18歳以上なら、23区では年110万円くらいからかかります）。', '前の年の収入にかかる税金。18歳未満なら、ほとんどかかりません。', 'Charged on last year’s income. If you are under 18 on 1 January, there is none when last year’s wages were under ¥2,044,000 (from 18, it starts at about ¥1.1 million a year in the 23 wards).') },
          note: t('家族の扶養に入っている人は、たくさん働くと家族の税金や保険が変わることがあります。働く前に、家の人や施設の職員・里親さんに相談しよう。',
            'たくさん働く前に、家の人や施設の職員・里親さんに相談しよう。',
            'If a family member claims you as a dependant, earning a lot can change their tax or insurance. Talk to them, or to your care staff or foster carer, first.') },
        { type: 'text', head: t('バイトをやめた年は、税金が戻るかも', 'やめた年は、税金がもどるかも', 'Quit mid-year? Tax may come back'),
          ja: '給料から所得税が引かれていて、年の途中でやめたときは、確定申告（還付申告）で戻ってくることがあります。源泉徴収票をもらっておこう。',
          jr: '給料から税金が引かれていて、とちゅうでやめたら、もどってくることがあります。源泉徴収票をもらっておこう。',
          en: 'If income tax was taken from your pay and you quit mid-year, a tax return can get it back. Ask for your withholding slip.',
          mark: t('源泉徴収票をもらっておこう', '源泉徴収票をもらっておこう', 'Ask for your withholding slip') }
      ],
      recap: [
        t('中学生は、原則バイトできない。', '中学生は、ふつうはバイトできない。', 'No part-time jobs in junior high (in principle).'),
        t('東京の最低賃金は時給1,280円（2026年10月から）。', '東京の時給は1,280円から。', 'Tokyo minimum wage: ¥1,280/hour (from Oct 2026).'),
        t('所得税は、給料が年178万円までなら0円。', '所得税は、年178万円まで0円。', 'No income tax on wages up to ¥1.78M a year.')
      ],
      related: ['tokyo-rodo-sodan', 'rodo-hotline', 'hellowork-wakamono'],
      sources: [S.nensho, S.minWage, S.ntaPart, S.ntaKanpu, S.tokyoJumin, S.jflecJhs],
      checked: CHECKED
    }
  ];
})();
