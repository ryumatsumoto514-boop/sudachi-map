/* 巣立ちマップ v3 — data/timeline.js (LEARN-DATA; v2 by A9)
 * Timelines used by #/plan. SM.data.timeline holds groups from TWO tracks — always filter by `track`:
 *
 *  track:'leaving'  (all v2 groups) anchored to 巣立ちの日 (SM.state.leaveDate):
 *     m     = months before (-) / after (+) the leaving day
 *     title = what this period is about,  sub = one kind line (optional)
 *     short = v8: the station name on the desktop roadmap (≤8 chars, | = the one line-break point; full title in the panel)
 *     tasks = [{ id, ja, en, p:[program ids], paths:['study'|'work'] (optional: only shown for that path),
 *                href:'#/…' (optional) + hrefLabel:{ja,en} }]
 *     v9 task contract (CONTENT-L, leaving track; all optional, plan.js falls back to the long ja/en line):
 *                title:{ja,jr,en} (≤18 chars, verb-first) · why:{ja,jr,en} (one sentence) · who:'staff'|'teacher'|'city'|'jiso'|'school'|'self'|'org'
 *                say:{ja,jr,en} (one spoken line, 「」 in ja/jr, only where asking someone is the task)
 *                due:{kind:'offset',days,from:'leave'} | {kind:'text',ja,jr,en} (only where an official rule gives one)
 *     Task keys stored in SM.state.done are 'tl:<m>:<id>' (see js/views/plan.js).
 *
 *  track:'junior'   (new in v3) the 高校受験のお金 timeline for 中学生 (show when body.is-junior / SM.isJunior()).
 *     NOT anchored to 巣立ちの日 — it follows the school year (4月→3月). Junior groups have NO `m`.
 *     id     = stable group id ('j12', 'j3-spring', …) — suggested done key: 'jr:<id>:<taskId>'
 *     seq    = display order (0…)
 *     grade  = 'jhs12' (中1・中2) | 'jhs3' (中3) | 'hs1' (高1, the year after)
 *     months = calendar months this group covers, e.g. [4,5,6]; null = any time
 *     when   = {ja,jr,en} short label for the period ("中3の4〜6月")
 *     title, sub (optional), tasks = [{ id, ja, jr?, en, p:[program ids], href?, hrefLabel? }]
 *     v9 (CONTENT-J): every junior task also carries the same contract as above — title/why (ja+jr+en), who, say where
 *     someone is asked, due:{kind:'text',ja,jr,en} only for official dates (都立入学料 5日以内, 免除 5月末, 奨学給付金 都立 7/8–9/15 …).
 *     A 中3 user is in the jhs3 group whose months include today; a 中1・中2 user sees 'j12' first.
 *
 *  SM.data.timelineTrack('leaving'|'junior') returns that track's groups in display order.
 * Content: v1 prototype TIMELINE, extended (−12 … +6 months); junior track checked 2026-10-17 against
 * 東京都福祉局・受験生チャレンジ支援貸付, 東京都教育委員会（都立の授業料・入学料・奨学給付金）,
 * 文部科学省（就学支援金・奨学給付金）, 東京都私学財団（授業料軽減助成金）. */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};

  SM.data.timeline = [
    {
      track: 'leaving',
      m: -12,
      title: { ja: '巣立ったあとのことを、話しはじめる', en: 'Start talking about life after care' },
      short: { ja: '話し|はじめる', en: 'Start talking' },
      sub: { ja: 'まだ先でも大丈夫。早く話すほど、使える支援が増えます。', jr: 'まだ先でも大丈夫。早く話すほど、使える支援がふえます。', en: 'Still early, and that is good. Talking early opens more doors.' },
      tasks: [
        { id: 'talk', ja: '「巣立ったあと、どうしたい？」を職員や先生と話す', en: 'Talk with staff or a teacher about what you want after leaving', p: [],
          title: { ja: '出たあとの希望を職員と話す', jr: '出たあとのことを職員と話す', en: 'Talk about life after leaving' },
          why: { ja: '早く話すほど、使える支援や住まいの選びかたがふえます。', jr: '早く話すと、使える支援がふえます。', en: 'The earlier you talk, the more support and housing options open up.' },
          who: 'staff',
          say: { ja: '「巣立ったあと、どうしたいか話したいです。時間をもらえますか？」', jr: '「出たあとのことを話したいです。時間をください。」', en: 'I’d like to talk about what I want after I leave. Can we set a time?' } },
        { id: 'yoyaku', ja: '進学したいなら、給付奨学金の「予約採用」がいつか先生に聞く', en: 'If you want to study, ask a teacher when the scholarship pre-application is', p: ['jasso-kyufu'], paths: ['study'],
          title: { ja: '給付奨学金の時期を先生に聞く', jr: '返さなくていい奨学金の時期を聞く', en: 'Ask when the grant opens' },
          why: { ja: '返さなくていい奨学金は高3のうちに学校で申し込み、締切は学校ごとにちがいます。', jr: '返さなくていい奨学金は、高3のうちに学校で申し込むので、しめきりを早く知っておきます。', en: 'The grant is applied for through school in your final year; each school sets its own deadline.' },
          who: 'teacher',
          say: { ja: '「給付奨学金の予約採用は、いつ申し込みますか？」', jr: '「返さなくていい奨学金は、いつ申し込みますか？」', en: 'When do we apply for the JASSO grant scholarship pre-application?' } },
        { id: 'encho', ja: '18歳をすぎても今の家にいられるか（措置延長）聞いてみる', en: 'Ask if you can stay where you live after 18 (extended care)', p: ['sochi-encho'],
          title: { ja: '20歳までいられるか聞く', jr: '20歳までいられるか聞く', en: 'Ask if you can stay past 18' },
          why: { ja: '施設や里親家庭には、18歳をすぎても20歳まで続けていられる仕組み（措置延長）があります。', jr: '18歳をすぎても、20歳まで今の家にいられる仕組み（措置延長）があります。', en: 'A scheme called extended care lets you stay in your facility or foster home until 20.' },
          who: 'staff',
          say: { ja: '「措置延長で、20歳までここにいることはできますか？」', jr: '「20歳まで、ここにいることはできますか？」', en: 'Could I stay here until 20 under extended care?' } }
      ]
    },
    {
      track: 'leaving',
      m: -10,
      title: { ja: '学校のお金の支援に申し込む', en: 'Apply for school money support' },
      short: { ja: '学校の|お金', en: 'School money' },
      sub: { ja: '奨学金は、高3の春〜初夏に学校で申し込むものが多いです。', jr: '奨学金は、高3の春〜夏に学校で申し込むものが多いです。', en: 'Many scholarships are applied for at school in spring of the last year.' },
      tasks: [
        { id: 'kyufu', ja: '返さなくていい奨学金（給付奨学金）に、学校で申し込む', en: 'Apply at school for the grant scholarship (no pay-back)', p: ['jasso-kyufu', 'jasso-genmen'], paths: ['study'],
          title: { ja: '給付奨学金を学校で申し込む', jr: '返さなくていい奨学金を申し込む', en: 'Apply for the grant at school' },
          why: { ja: '返さなくていい国の奨学金で、学費が安くなる減免も同時に申し込めます。', jr: '返さなくていい国の奨学金で、学費が安くなる申し込みもいっしょにできます。', en: 'A national scholarship you never pay back, and the tuition and entrance-fee reduction is applied for at the same time.' },
          who: 'teacher',
          say: { ja: '「給付奨学金を申し込みたいです。施設の人の枠はありますか？」', jr: '「給付奨学金を申し込みたいです。何がいりますか？」', en: 'I want to apply for the grant scholarship. Is there a category for people from care?' },
          due: { kind: 'text', ja: '学校の締切まで（学校ごとにちがう）', jr: '学校のしめきりまで（学校でちがう）', en: 'By your school’s own deadline' } },
        { id: 'minkan', ja: '民間の奨学金（夢の奨学金など）の募集時期を調べる', en: 'Check when private scholarships (e.g. Yume) open', p: ['yume-shogaku'], paths: ['study'],
          title: { ja: '夢の奨学金の募集時期を調べる', jr: '夢の奨学金の時期を調べる', en: 'Check the Dream Scholarship dates' },
          why: { ja: '施設や里親家庭を経験した人のための、返さなくていい奨学金で、募集は毎年6月ごろです。', jr: '施設や里親の家で育った人のための、返さなくていい奨学金で、募集は毎年6月ごろです。', en: 'A grant for people who grew up in care, with no repayment; applications open around June each year.' },
          who: 'self',
          due: { kind: 'text', ja: '毎年6月ごろ（夢の奨学金）', jr: '毎年6月ごろ', en: 'Around June each year' } },
        { id: 'tsucho', ja: '通帳・印鑑・マイナンバーカードが自分の手元にあるか確かめる', en: 'Check you have your bankbook, seal and My Number card', p: ['mynumber-card'],
          title: { ja: '通帳・印鑑・カードを確かめる', jr: '通帳・印鑑・カードがあるか見る', en: 'Check bankbook, seal and card' },
          why: { ja: '部屋や仕事、奨学金の手続きで、通帳とマイナンバーカードはかならず使います。', jr: '部屋や仕事の手続きで、通帳とマイナンバーカードはかならず使います。', en: 'Housing, work and scholarship paperwork all need your bankbook and My Number card.' },
          who: 'staff',
          say: { ja: '「わたしの通帳とマイナンバーカードは、どこにありますか？」', jr: '「わたしの通帳とマイナンバーカードは、どこにありますか？」', en: 'Where are my bankbook and My Number card kept?' } }
      ]
    },
    {
      track: 'leaving',
      m: -8,
      title: { ja: '仕事や学校を決めていく', en: 'Decide on work or school' },
      short: { ja: '仕事か|学校', en: 'Work or school' },
      sub: { ja: '決まっていなくても大丈夫。どちらの道にも、使える支援があります。', jr: '決まっていなくても大丈夫。どちらにも支援があります。', en: 'Not decided yet? Fine. There is support on either road.' },
      tasks: [
        { id: 'ryo', ja: '働くなら、寮や社宅があるか、やめたら出る必要があるかを確かめる', en: 'If working: check for a dorm, and whether you must leave it if you quit', p: ['hellowork-wakamono'], paths: ['work'],
          title: { ja: '寮のきまりを確かめる', jr: '寮のきまりをたしかめる', en: 'Check the dorm rules' },
          why: { ja: '寮つきの仕事はやめると住まいも同時に失うので、やめたら何日で出るのかを先に知っておきます。', jr: '寮つきの仕事は、やめると住む場所もなくなるので、先に聞いておきます。', en: 'With a live-in job you lose your home the day you quit, so find out first how many days you would have to move out.' },
          who: 'org',
          say: { ja: '「この求人は寮つきですか？やめたら、寮はいつまでに出ますか？」', jr: '「この仕事は寮つきですか？やめたら、いつまでに出ますか？」', en: 'Does this job come with a dorm? If I quit, how soon would I have to move out?' } },
        { id: 'juken', ja: '受験料の支援が使えるか聞く', en: 'Ask about help with exam fees', p: ['jasso-juken', 'tokyo-juken-challenge'], paths: ['study'],
          title: { ja: '受験料の支援を職員に聞く', jr: '受験料の支援を聞く', en: 'Ask staff about exam-fee help' },
          why: { ja: '施設や里親家庭から大学などを受けるとき、受験のお金20万円をもらえる仕組みがあります。', jr: '施設や里親の家から大学などを受けるとき、受験のお金20万円がもらえる仕組みがあります。', en: 'Students in care who sit college exams can get ¥200,000 for exam costs, with no repayment.' },
          who: 'staff',
          say: { ja: '「JASSOの受験料等支援に、申し込んでもらえますか？」', jr: '「受験料の支援に、申し込んでもらえますか？」', en: 'Could you apply for the JASSO exam-fee support for me?' } },
        { id: 'kyoten', ja: 'アフターケアの居場所に、一度行ってみる', en: 'Visit an aftercare drop-in place once', p: ['yogo-kyoten'],
          title: { ja: 'アフターケアの居場所に行く', jr: '出たあとの居場所に行ってみる', en: 'Visit a care-leaver hub once' },
          why: { ja: '出たあと暮らしやお金を相談できる場所で、一度行くと困ったとき頼りやすくなります。', jr: '出たあと暮らしやお金を相談できる場所で、一度行くとこまったとき頼りやすくなります。', en: 'A place to talk about life and money after leaving; one visit now makes it easier to turn to later.' },
          who: 'staff',
          say: { ja: '「アフターケアの居場所は、どこにありますか？」', jr: '「アフターケアの居場所は、どこにありますか？」', en: 'Where is the aftercare drop-in place?' } }
      ]
    },
    {
      track: 'leaving',
      m: -6,
      title: { ja: '巣立ったあとの、お金の計画', en: 'Plan your money after leaving' },
      short: { ja: 'お金の|計画', en: 'Money plan' },
      sub: { ja: 'ざっくりでOK。足りない分は、支援でうめられることがあります。', jr: 'ざっくりでOK。足りない分は、支援でうめられることがあります。', en: 'Rough numbers are fine. Gaps can often be filled with support.' },
      tasks: [
        { id: 'shikin', ja: '自立支援資金貸付のことを職員に聞く（条件しだいで返さなくていい）', en: 'Ask staff about the Independence Support Loan (may not need paying back)', p: ['jiritsu-shikin', 'tokyo-jiritsu-shikin'],
          title: { ja: '自立支援資金を職員に聞く', jr: '生活費を借りる制度を聞く', en: 'Ask about the support loan' },
          why: { ja: '出た人が利子なしで生活費や家賃を借りられ、決まった年数働けば返さなくてよくなります。', jr: '出た人が利子なしで生活費や家賃をかりられ、決まった年数はたらけば返さなくてよくなります。', en: 'People who left care can borrow living costs and rent interest-free; after a set number of years of work it is forgiven.' },
          who: 'staff',
          say: { ja: '「自立支援資金貸付を使いたいです。わたしは対象ですか？」', jr: '「自立支援資金貸付を使いたいです。使えますか？」', en: 'I want to use the Independence Support Loan. Am I eligible?' },
          due: { kind: 'text', ja: '出てから5年以内に申し込む', jr: '出てから5年以内', en: 'Within 5 years of leaving' } },
        { id: 'sim', ja: '生活費シミュレーターで、1か月のお金を計算してみる', en: 'Work out a month of money with the living-cost simulator', p: [], href: '#/tools/money', hrefLabel: { ja: '生活費シミュレーターへ', en: 'Open the simulator' },
          title: { ja: '1か月のお金を計算する', jr: '1か月のお金を計算する', en: 'Work out one month of money' },
          why: { ja: '家賃・食費・スマホ代を足してみると、毎月いくら必要で、どこが足りないかが見えます。', jr: '家賃や食費を足してみると、毎月いくらいるか、どこが足りないかがわかります。', en: 'Adding up rent, food and phone shows what a month costs and where the gap is.' },
          who: 'self' },
        { id: 'local', ja: '住む区市町村に、独自の支援があるか調べる', en: 'Check if your city or ward has its own support', p: [], href: '#/find', hrefLabel: { ja: '支援をさがす', en: 'Find support' },
          title: { ja: '住む町の支援を調べる', jr: '住む町の支援をさがす', en: 'Check your city’s own support' },
          why: { ja: '家賃や引っ越しの支援は、住む区市町村によってちがいます。', jr: '家賃や引っ越しの助けは、住む市や区によってちがいます。', en: 'Rent and moving help differs from city to city.' },
          who: 'self' }
      ]
    },
    {
      track: 'leaving',
      m: -4,
      title: { ja: '住まいを探しはじめる', en: 'Start looking for a place to live' },
      short: { ja: '住まい|探し', en: 'Find a place' },
      sub: { ja: '保証人がいなくても、借りられる道があります。', jr: '保証人がいなくても、部屋を借りる方法はあります。', en: 'There are ways to rent even without a guarantor.' },
      tasks: [
        { id: 'erabu', ja: '自立援助ホーム・UR・ふつうの賃貸から、どれにするか考える', en: 'Choose between a self-reliance home, UR housing or a normal rental', p: ['jiritsu-enjo', 'ur-chintai', 'tokyo-sasaeru-jutaku'],
          title: { ja: '住まいの種類をくらべる', jr: '住まいの種類をくらべる', en: 'Compare your housing options' },
          why: { ja: '自立援助ホーム、保証人のいらないUR、ふつうの賃貸で、お金と暮らしかたが大きくちがいます。', jr: '自立援助ホーム、保証人のいらないUR、ふつうの賃貸で、お金と暮らしかたが大きくちがいます。', en: 'A self-reliance home with staff, UR housing with no guarantor or key money, and a normal rental differ a lot in cost and daily life.' },
          who: 'staff',
          say: { ja: '「自立援助ホーム・UR・賃貸、わたしにはどれが合いますか？」', jr: '「わたしには、どの住まいが合いますか？」', en: 'Group home, UR or a regular rental: which suits me?' } },
        { id: 'hosho', ja: '保証人のことは「身元保証人確保対策事業」が使えるか職員に聞く', en: 'Ask staff if the guarantor support scheme can cover you', p: ['mimoto-hosho'],
          title: { ja: '保証人のことを職員に聞く', jr: '保証人のことを職員に聞く', en: 'Ask staff about a guarantor' },
          why: { ja: '部屋を借りるとき、親のかわりに施設長などが保証人になれる国の仕組みがあります。', jr: '部屋をかりるとき、親のかわりに施設の人が保証人になれる仕組みがあります。', en: 'When renting, a national scheme lets your facility head stand as guarantor in place of a parent.' },
          who: 'staff',
          say: { ja: '「身元保証人確保対策事業って、わたしも使えますか？」', jr: '「保証人の制度（身元保証人確保対策事業）は、わたしも使えますか？」', en: 'Can the guarantor support scheme cover me too?' },
          due: { kind: 'text', ja: '部屋の契約の前に（出てから5年以内）', jr: '部屋の契約の前に（出てから5年以内）', en: 'Before you sign a lease (within 5 years of leaving)' } },
        { id: 'mitsumori', ja: '部屋の初期費用の見積もりを、2つ以上もらって比べる', en: 'Get 2+ quotes for move-in costs and compare', p: [],
          title: { ja: '初期費用の見積もりを2つもらう', jr: '部屋の最初のお金を2つくらべる', en: 'Get two move-in quotes' },
          why: { ja: '敷金や礼金は不動産会社でちがうので、2つくらべると高すぎる契約をさけられます。', jr: '最初のお金は店でちがうので、2つくらべると高すぎる契約をさけられます。', en: 'Deposits and fees differ by agency; comparing two quotes keeps you out of an overpriced contract.' },
          who: 'self',
          say: { ja: '「初期費用の見積もりを、紙でもらえますか？」', jr: '「最初にはらうお金の見積もりを、紙でもらえますか？」', en: 'Could I have the move-in cost estimate on paper?' } }
      ]
    },
    {
      track: 'leaving',
      m: -3,
      title: { ja: '契約の前に、立ち止まってチェック', en: 'Stop and check before you sign' },
      short: { ja: '契約|チェック', en: 'Check the lease' },
      sub: { ja: '18歳からは、自分のサインがそのまま契約になります。', jr: '18歳からは、自分のサインで契約が決まります。', en: 'From 18, your signature alone makes a contract binding.' },
      tasks: [
        { id: 'keiyaku', ja: '契約書は控えをもらう。サインの前に職員と一緒に読む', en: 'Always keep a copy. Read contracts with staff before signing', p: ['shohisha-188'], href: '#/tools/check', hrefLabel: { ja: '契約チェックへ', en: 'Contract check' },
          title: { ja: '契約書を職員と一緒に読む', jr: '契約書を職員といっしょに読む', en: 'Read the contract with staff' },
          why: { ja: '18歳からは大人なので、サインしたあとの契約は取り消しにくくなります。', jr: '18歳からは大人なので、サインしたあとの契約は取り消しにくいです。', en: 'From 18 you are an adult, so a contract is hard to undo once signed.' },
          who: 'staff',
          say: { ja: '「サインの前に、この契約書を一緒に読んでもらえますか？」', jr: '「サインの前に、いっしょに読んでもらえますか？」', en: 'Before I sign, could you read this contract with me?' } },
        { id: 'meigi', ja: 'スマホ・口座・カードを人に貸さない、売らない（犯罪にまきこまれます）', en: 'Never lend or sell your phone, bank account or cards (it can drag you into crime)', p: [],
          title: { ja: 'スマホや口座を人に貸さない', jr: 'スマホや口座を人に貸さない', en: 'Never lend your phone or account' },
          why: { ja: '貸した口座やスマホが犯罪に使われると、知らなくても自分がまきこまれます。', jr: 'かした口座やスマホが犯罪に使われると、知らなくても自分がまきこまれます。', en: 'If a lent account or phone is used for crime, you get dragged in even without knowing.' },
          who: 'self' },
        { id: 'start', ja: '東京都の「自立生活スタート支援」が使えるか聞く', en: 'Ask about Tokyo’s start-up support for independent living', p: ['tokyo-jiritsu-start'],
          title: { ja: 'スタート支援を職員に聞く', jr: '引っ越し代の制度を聞く', en: 'Ask about Tokyo start-up support' },
          why: { ja: '引っ越し代などを利息なし・保証人なしで借りられ、条件を満たせば返さなくていい東京都の制度です。', jr: '引っ越し代などを利息なし・保証人なしでかりられ、条件を満たせば返さなくていい東京都の制度です。', en: 'Tokyo lends moving costs and more with no interest or guarantor, forgiven once you meet its conditions.' },
          who: 'staff',
          say: { ja: '「自立生活スタート支援を使いたいです。対象になりますか？」', jr: '「自立生活スタート支援を使いたいです。使えますか？」', en: 'I want to use the Independent Living Start-up Support. Am I eligible?' },
          due: { kind: 'text', ja: '出る日が決まったらすぐ（お金が届くまで1か月以上）', jr: '出る日が決まったらすぐ（お金まで1か月以上）', en: 'As soon as your leaving day is set (the money takes a month or more)' } }
      ]
    },
    {
      track: 'leaving',
      m: -2,
      title: { ja: '引っ越しの準備', en: 'Get ready to move' },
      short: { ja: '引っ越し|準備', en: 'Moving prep' },
      sub: { ja: 'お金をかけずにそろえる方法から、先に聞きます。', jr: 'お金をかけない方法から、先に聞きます。', en: 'Ask about the free ways first.' },
      tasks: [
        { id: 'kaden', ja: '家電や家具は、支援団体からもらえないか先に聞く', en: 'Ask support groups for free appliances and furniture first', p: [],
          title: { ja: '家電をもらえるか団体に聞く', jr: '家電をもらえるか聞く', en: 'Ask groups for free appliances' },
          why: { ja: '冷蔵庫や洗濯機は買うと高いので、支援団体にもらえるものがないか先に聞きます。', jr: '冷蔵庫や洗濯機は高いので、もらえるものがないか先に聞きます。', en: 'A fridge or washer is expensive to buy, so ask support groups first what they can give.' },
          who: 'org',
          say: { ja: '「引っ越しで家電が必要です。ゆずってもらえるものはありますか？」', jr: '「家電が必要です。もらえるものはありますか？」', en: 'I need appliances for moving. Is there anything you can pass on?' } },
        { id: 'tenso', ja: '郵便局で、郵便の転送の届けを出す', en: 'File a mail forwarding request at the post office', p: [],
          title: { ja: '郵便の転送を届け出る', jr: '郵便の転送をたのむ', en: 'Set up mail forwarding' },
          why: { ja: '古い住所にきた手紙を新しい家に回してくれるので、役所や奨学金の大事な手紙を見のがしません。', jr: '前の住所にきた手紙を新しい家に回してくれるので、大事な手紙を見のがしません。', en: 'Mail sent to your old address gets passed on to your new home, so you do not miss important letters from the city or about scholarships.' },
          who: 'org',
          say: { ja: '「引っ越すので、郵便の転送（転居届）をお願いします。」', jr: '「引っ越すので、郵便の転送をお願いします。」', en: 'I’m moving. I’d like to set up mail forwarding, please.' } },
        { id: 'renraku', ja: '困ったときの連絡先（施設・児相・相談先）をスマホに入れる', en: 'Save emergency contacts (your home, child guidance centre, helplines)', p: ['yorisoi'],
          title: { ja: '困ったときの連絡先を入れる', jr: 'こまったときの電話を入れる', en: 'Save your help contacts' },
          why: { ja: '施設・児童相談所・相談先の番号がスマホにあれば、困った夜にすぐかけられます。', jr: '施設や相談できる電話がスマホにあれば、こまったときにすぐかけられます。', en: 'With your home, the child guidance centre and a helpline in your phone, you can call the moment things go wrong.' },
          who: 'self' }
      ]
    },
    {
      track: 'leaving',
      m: -1,
      title: { ja: '役所の手続きを確かめる', en: 'Check your city-office paperwork' },
      short: { ja: '役所の|手続き', en: 'City‑office steps' },
      sub: { ja: '住民票を動かすと、保険も年金もここから始まります。', jr: '住所をうつすと、保険や年金の手続きもここから始まります。', en: 'Moving your resident record is where insurance and pension start.' },
      tasks: [
        { id: 'tenshutsu', ja: '転出届を出す（オンラインでもできます）', en: 'File your move-out notice (can be done online)', p: ['hikkoshi-todoke'],
          title: { ja: '転出届を出す', jr: '引っ越しの届け（転出届）を出す', en: 'File your move-out notice' },
          why: { ja: '転出届は「今の町を出ます」という届けで、マイナンバーカードがあればスマホから出せます。', jr: '転出届は「今の町を出ます」という届けで、マイナンバーカードがあればスマホから出せます。', en: 'The move-out notice tells your city you are leaving; with a My Number card you can file it from your phone.' },
          who: 'city',
          say: { ja: '「引っ越すので、転出届を出したいです。」', jr: '「引っ越すので、転出届を出したいです。」', en: 'I’m moving. I’d like to file a move-out notice.' } },
        { id: 'kokuho', ja: '国民健康保険に入る準備をする（保険料が安くなることも）', en: 'Get ready to join National Health Insurance (fees may be reduced)', p: ['kokuho'],
          title: { ja: '国民健康保険の準備をする', jr: '健康保険に入る準備をする', en: 'Get ready for health insurance' },
          why: { ja: '出たら自分で保険に入り、忘れると病院でいったん全額払うことがあります。', jr: '出たら自分で保険に入り、わすれると病院で全部はらうことがあります。', en: 'After leaving you join insurance yourself; forget, and you may pay the full bill at the hospital.' },
          who: 'city',
          say: { ja: '「国民健康保険に入りたいです。保険料は安くなりますか？」', jr: '「国民健康保険に入りたいです。安くなりますか？」', en: 'I want to join National Health Insurance. Can my premium be reduced?' } },
        { id: 'nenkin', ja: '20歳以上なら、国民年金の免除や学生納付特例を調べる', en: 'If 20+, look into pension payment waivers or the student deferral', p: ['nenkin-gakusei', 'nenkin-menjo'],
          title: { ja: '年金の免除や特例を調べる', jr: '年金を待ってもらう制度を調べる', en: 'Check pension waivers' },
          why: { ja: '20歳からは年金の保険料がかかり、免除や学生納付特例を出さないと「未納」になります。', jr: '20歳からは年金のお金がかかり、免除や学生納付特例を出さないと「未納」になります。', en: 'From 20 you owe pension contributions; without a waiver or student deferral they count as unpaid.' },
          who: 'city',
          say: { ja: '「国民年金の学生納付特例（または免除）を申請したいです。」', jr: '「年金の学生納付特例を申請したいです。」', en: 'I’d like to apply for the student pension deferral (or a waiver).' },
          due: { kind: 'text', ja: '20歳になったら（毎年度の申請）', jr: '20歳になったら（毎年申請）', en: 'From age 20, every fiscal year' } }
      ]
    },
    {
      track: 'leaving',
      m: 0,
      title: { ja: '巣立ちの日', en: 'Your leaving day' },
      sub: { ja: 'ここからがスタート。できなかったことは、あとからでも大丈夫。', jr: 'ここからがスタート。できなかったことは、あとからでも大丈夫。', en: 'This is the start. Anything left undone can still be done later.' },
      tasks: [
        { id: 'hoken', ja: '次の日から病院は自分の保険。マイナ保険証の登録か、資格確認書が届くまでどうするかを聞いておく', en: 'From tomorrow you use your own insurance. Register your My Number card as your insurance card, or ask what to do until your eligibility certificate (資格確認書) arrives.', p: ['kokuho'],
          title: { ja: '保険証をどうするか聞いておく', jr: '保険証のことを聞いておく', en: 'Ask about your insurance card' },
          why: { ja: '次の日から病院は自分の保険なので、保険証のかわりの紙が来るまでの行きかたを聞きます。', jr: '次の日から病院は自分の保険なので、保険証のかわりの紙が来るまでどうするか聞きます。', en: 'From tomorrow the hospital is on your own insurance; ask what to show until the eligibility certificate arrives.' },
          who: 'staff',
          say: { ja: '「明日から病院に行くとき、保険証はどうすればいいですか？」', jr: '「明日から病院に行くとき、保険証はどうすればいいですか？」', en: 'If I need a doctor from tomorrow, what do I show as my insurance card?' } },
        { id: 'denwacho', ja: '職員の連絡先と、よ\u2060り\u2060そ\u2060いホットラインを電話帳に入れる', en: 'Save your staff contact and the Yorisoi Hotline in your phone', p: ['yorisoi'],
          title: { ja: '職員とホットラインを登録する', jr: '職員の電話と相談電話を入れる', en: 'Save staff and the hotline' },
          why: { ja: 'よ\u2060り\u2060そ\u2060いホットラインは24時間無料で話せる電話なので、番号を入れておきます。', jr: 'よ\u2060り\u2060そ\u2060いホットラインは24時間むりょうで話せる電話なので、番号を入れておきます。', en: 'The Yorisoi Hotline is free, 24 hours, for any worry; save it next to your staff contact.' },
          who: 'self' }
      ]
    },
    {
      track: 'leaving',
      m: 1,
      title: { ja: '新しい暮らしの、最初の1か月', en: 'Your first month' },
      short: { ja: '最初の|1か月', en: 'First month' },
      sub: { ja: '届けは14日以内。あとはゆっくりで大丈夫。', jr: '役所の届けは14日以内。あとはゆっくりで大丈夫。', en: 'The move-in notice has a 14-day limit. The rest can wait.' },
      tasks: [
        { id: 'tennyu', ja: '転入届は、引っ越してから14日以内に出す', en: 'File your move-in notice within 14 days of moving', p: ['hikkoshi-todoke'],
          title: { ja: '転入届を14日以内に出す', jr: '14日以内に転入届を出す', en: 'File move-in notice in 14 days' },
          why: { ja: '住民票が古い住所のままだと、給付や奨学金の大事な手紙が届きません。', jr: '住所の届けを出さないと、大事な手紙が新しい家に届きません。', en: 'If your resident record keeps the old address, important letters about benefits and scholarships never reach you.' },
          who: 'city',
          say: { ja: '「転入届を出したいです。保険と年金の手続きも一緒にできますか？」', jr: '「転入届を出したいです。保険と年金もいっしょにできますか？」', en: 'I want to file my move-in notice. Can I do insurance and pension today too?' },
          due: { kind: 'offset', days: 14, from: 'leave' } },
        { id: 'calendar', ja: '給料日・家賃の日・奨学金が入る日をカレンダーに入れる', en: 'Put payday, rent day and scholarship day in your calendar', p: [],
          title: { ja: '給料日と家賃の日を入れる', jr: '給料日と家賃の日をメモする', en: 'Put payday and rent day in' },
          why: { ja: 'お金が入る日と出る日が見えていると、家賃の日に足りないという事故を防げます。', jr: 'お金が入る日と出る日がわかると、家賃がはらえない日をふせげます。', en: 'Seeing when money comes in and goes out stops the shock of rent day with nothing in the account.' },
          who: 'self' },
        { id: 'genki', ja: '施設や居場所に「元気です」と1回連絡する', en: 'Send one “I’m OK” message to your old home or drop-in place', p: ['yogo-kyoten'],
          title: { ja: '「元気です」と1回連絡する', jr: '「元気です」と1回連絡する', en: 'Send one “I’m OK” message' },
          why: { ja: '一度連絡しておくと、本当に困ったときに「久しぶりで連絡しにくい」がなくなります。', jr: '一度連絡しておくと、こまったときに連絡しやすくなります。', en: 'One message now means that when you really need them, reaching out will not feel awkward.' },
          who: 'self' }
      ]
    },
    {
      track: 'leaving',
      m: 3,
      title: { ja: '3か月後。むりしていないか確かめる', en: '3 months on: check you are OK' },
      short: { ja: '3か月後に|確認', en: '3‑month check' },
      sub: { ja: 'つまずくのはふつうのこと。早めに相談すると、選べる道が多いです。', jr: 'つまずくのはふつうのこと。早めに相談すると、えらべる道が多いです。', en: 'Stumbling is normal. Asking early keeps more options open.' },
      tasks: [
        { id: 'tarinai', ja: 'お金が足りないときは早めに相談（住居確保給付金・くらしの相談）', en: 'Short on money? Ask early (housing benefit, life support desk)', p: ['jukyo-kakuho', 'jiritsu-sodan'],
          title: { ja: 'お金が足りないなら相談する', jr: 'お金が足りないとき相談する', en: 'Short on money? Ask early' },
          why: { ja: '家賃が払えないとき、役所が大家さんに直接払う「住居確保給付金」を早めに聞きます。', jr: '家賃がはらえないとき、役所が大家さんにはらう「住居確保給付金」を早めに聞きます。', en: 'If rent is too much, the city can pay it to your landlord directly; ask before you fall behind.' },
          who: 'city',
          say: { ja: '「家賃が払えなくなりそうです。使える制度はありますか？」', jr: '「家賃がはらえなくなりそうです。使える制度はありますか？」', en: 'I may not manage the rent. Is there a scheme I can use?' } },
        { id: 'tsurai', ja: '仕事がつらいときは、労働の相談やサポステへ', en: 'Work feels hard? Talk to a labour helpline or Saposute', p: ['rodo-hotline', 'saposute'],
          title: { ja: '仕事がつらいなら相談する', jr: '仕事がつらいなら相談する', en: 'Work feels hard? Ask someone' },
          why: { ja: '名前を言わなくても相談できる電話があり、やめたあとの次の準備もサポステが手伝います。', jr: '名前を言わなくても相談できる電話があり、やめたあとの次の準備もサポステが手伝います。', en: 'There is a hotline you can call without giving your name, and Saposute helps with what comes next.' },
          who: 'org',
          say: { ja: '「職場のことで相談したいです。これは法律違反ですか？」', jr: '「仕事のことで相談したいです。」', en: 'I’d like advice about my workplace. Is this against the law?' } },
        { id: 'hanasu', ja: 'ひとりで抱えない。だれかと話す日を決める', en: 'Don’t carry it alone. Pick a day to talk to someone', p: ['tokyo-wakanavi'],
          title: { ja: 'だれかと話す日を決める', jr: 'だれかと話す日を決める', en: 'Pick a day to talk to someone' },
          why: { ja: '若ナビαのような相談先は、まとまっていない話でも聞いてくれて、合う窓口につないでくれます。', jr: '話がまとまっていなくても、聞いてくれる相談先があります。', en: 'Services like Wakanavi listen even when your thoughts are a mess and point you to the right desk.' },
          who: 'org',
          say: { ja: '「何から相談すればいいかわかりません。話を聞いてもらえますか？」', jr: '「何から話せばいいかわかりません。聞いてもらえますか？」', en: 'I don’t know where to start. Could you just listen for a bit?' } }
      ]
    },
    {
      track: 'leaving',
      m: 6,
      title: { ja: '半年後。これからを考える', en: '6 months on: think ahead' },
      short: { ja: '半年後に|考える', en: '6‑month check' },
      sub: { ja: '道を変えるのは、あとからでもできます。', jr: '道を変えるのは、あとからでもできます。', en: 'Changing course is allowed, at any point.' },
      tasks: [
        { id: 'kaeru', ja: '仕事を変えたい・学び直したいときも、相談できる', en: 'Want to change jobs or study again? You can ask for help', p: ['tokyo-shigoto-young', 'kyushokusha-shien'],
          title: { ja: '仕事や学びの相談をする', jr: '仕事をかえたいとき相談する', en: 'Ask about changing course' },
          why: { ja: 'お金をもらいながら無料の職業訓練を受けられる制度など、仕事を変えるときの支えがあります。', jr: 'お金をもらいながら無料で職業訓練を受けられる制度など、仕事をかえるときの支えがあります。', en: 'There is support for changing course, such as free job training with a monthly allowance (the job-seeker support scheme).' },
          who: 'org',
          say: { ja: '「仕事を変えたいです。お金をもらえる訓練はありますか？」', jr: '「仕事をかえたいです。お金をもらえる訓練はありますか？」', en: 'I want to change jobs. Is there paid training I could take?' } },
        { id: 'tetsuzuki', ja: '国保や年金の手続きがすんでいるか確かめる', en: 'Check your health insurance and pension paperwork is done', p: ['kokuho', 'nenkin-menjo'],
          title: { ja: '国保と年金の手続きを確かめる', jr: '保険と年金がすんだか確かめる', en: 'Check insurance and pension' },
          why: { ja: '年金の免除は毎年度の申請が基本で、やり忘れると「未納」のまま時間がすぎます。', jr: '年金の免除は毎年申請するので、わすれると「未納」のままになります。', en: 'Pension waivers are applied for each fiscal year, and a missed one quietly turns into unpaid months.' },
          who: 'city',
          say: { ja: '「今年度の年金の免除の申請は、もうすんでいますか？」', jr: '「年金の免除の申請は、すんでいますか？」', en: 'Is this year’s pension waiver application already done?' } },
        { id: 'file', ja: '大事な書類の控えを、1つのファイルにまとめる', en: 'Keep copies of important papers together in one folder', p: [],
          title: { ja: '大事な書類を1つにまとめる', jr: '大事な書類を1つにまとめる', en: 'Keep your papers in one folder' },
          why: { ja: '契約書・保険・年金・奨学金の紙が1か所にあると、役所や相談先でそのまま見せられます。', jr: '契約書や保険の紙が1か所にあると、役所や相談先でそのまま見せられます。', en: 'With your lease, insurance, pension and scholarship papers in one place, you can show them straight away at any office.' },
          who: 'self' }
      ]
    },

    /* ================================================================ track: junior (中学生・高校受験のお金) */
    {
      track: 'junior', id: 'j12', seq: 0, grade: 'jhs12', months: null,
      when: { ja: '中1・中2', jr: '中1・中2', en: 'Grades 7–8' },
      title: { ja: 'いまのうちに知っておく', jr: 'いまのうちに知っておこう', en: 'Good to know now' },
      short: { ja: '知って|おく', jr: '知って|おこう', en: 'Good to know' },
      sub: { ja: '高校のお金は、早めに知っておくほど安心です。', jr: '高校のお金のこと、早く知るほど安心。', en: 'The earlier you know about high school costs, the calmer you’ll be.' },
      tasks: [
        { id: 'learn', ja: '「高校にかかるお金と支援」のレッスンを読む', jr: '「高校のお金」のレッスンを読む', en: 'Read the lesson on high school costs and support',
          title: { ja: '高校のお金のレッスンを読む', jr: '高校のお金のレッスンを読む', en: 'Read the high school money lesson' },
          why: { ja: '高校のお金の仕組みを先に知っておくと、高校を選ぶときにあせりません。', jr: '高校のお金のことを先に知っておくと、高校をえらぶときにあせらないよ。', en: 'Knowing how high school costs work now means no panic when you choose a school.' },
          who: 'self',
          p: [], href: '#/learn/jr-koko-okane', hrefLabel: { ja: 'レッスンへ', en: 'Open the lesson' } },
        { id: 'gakushu', ja: '無料の学習支援や居場所が近くにあるか、区市町村に聞く', jr: '近くに、無料で勉強を教えてくれる場所があるか聞く', en: 'Ask your city about free study support or drop-in places nearby',
          title: { ja: '無料の学習支援を窓口で聞く', jr: '無料で勉強できる場所を聞く', en: 'Ask the city about free study help' },
          why: { ja: '塾に行けなくても、区市町村が無料で勉強を教えてくれる場所を用意していることがあります。', jr: '塾に行けなくても、ただで勉強を教えてくれる場所があることがあります。', en: 'Even without cram school, many cities run free study-support places.' },
          who: 'city',
          say: { ja: '「無料の学習支援は、この区市町村にありますか？」', jr: '「無料で勉強できる場所は、ありますか？」', en: 'Does this city have free study support?' },
          p: ['kodomo-gakushu-shien'] },
        { id: 'enjo', ja: '学用品や給食費が心配なら、「就学援助」のことを家の人や先生と話す', jr: '給食費などが心配なら、「就学援助」のことを先生と話す', en: 'Worried about school supplies or lunch fees? Talk about school-expense aid with family or a teacher',
          title: { ja: '就学援助のことを先生に聞く', jr: '給食費などの助けを先生に聞く', en: 'Ask a teacher about school-expense aid' },
          why: { ja: '給食費や学用品のお金を区市町村が出してくれる「就学援助」は、申し込まないと使えません。', jr: '給食費や学用品のお金を出してくれる「就学援助」は、申しこまないともらえません。', en: 'School-expense aid pays lunch and supply costs, but only if someone applies.' },
          who: 'teacher',
          say: { ja: '「就学援助は、うちの場合も使えますか？」', jr: '「就学援助は、うちも使えますか？」', en: 'Can my household use the school-expense aid?' },
          p: ['shugaku-enjo'] }
      ]
    },
    {
      track: 'junior', id: 'j3-spring', seq: 1, grade: 'jhs3', months: [4, 5, 6],
      when: { ja: '中3の4〜6月', jr: '中3の春（4〜6月）', en: 'Grade 9, Apr–Jun' },
      title: { ja: '進路を話しはじめる', jr: '行きたい高校のことを話そう', en: 'Start talking about next steps' },
      short: { ja: '進路を|話す', jr: '高校のことを|話す', en: 'Talk next steps' },
      sub: { ja: '迷っていても大丈夫。話すほど、選べる道が見えてきます。', jr: 'まよっていても大丈夫。', en: 'Not sure yet? That’s fine. Talking opens up options.' },
      tasks: [
        { id: 'shinro', ja: '行きたい高校や将来のことを、先生・家の人・施設の職員と話す', jr: '行きたい高校のことを、先生や家の人と話す', en: 'Talk about schools and the future with a teacher, family or care staff',
          title: { ja: '行きたい高校を先生と話す', jr: '行きたい高校を先生と話す', en: 'Talk about schools with a teacher' },
          why: { ja: '早く話しはじめるほど、受けられる学校と使える支援の選択肢が広がります。', jr: '早く話すほど、えらべる高校と使える助けがふえます。', en: 'The earlier you start talking, the more schools and support you can choose from.' },
          who: 'teacher',
          say: { ja: '「行きたい高校があります。お金のことも含めて、相談したいです。」', jr: '「行きたい高校があります。お金のことも、相談したいです。」', en: 'There is a school I want to go to. Can we talk about it, including the costs?' },
          p: ['tokyo-kyoiku-sodan'] },
        { id: 'challenge', ja: '塾代や受験料が心配なら、「受験生チャレンジ支援貸付」を区市町村の窓口で相談する（4月1日から受付）', jr: '塾代や受験料が心配なら、「受験生チャレンジ」を窓口で聞く（4月から）', en: 'Worried about cram school or exam fees? Ask your city about Tokyo’s exam-support loan (opens 1 April)',
          title: { ja: '受験生チャレンジを窓口で聞く', jr: '塾代をかりる制度を窓口で聞く', en: 'Ask the city about the exam loan' },
          why: { ja: '塾代や受験料を利息なしで借りられ、高校に入学すれば返さなくてよくなる東京都の制度です。', jr: '塾代と受験料をかりられて、高校に入れたら返さなくていい、東京都の制度です。', en: 'Tokyo lends cram-school and exam fees interest-free, and entering high school cancels the debt.' },
          who: 'city',
          say: { ja: '「受験生チャレンジを使いたいです。だれが申し込みますか？」', jr: '「受験生チャレンジを使いたいです。だれが申しこみますか？」', en: 'I want to use the exam challenge loan. Who applies?' },
          due: { kind: 'text', ja: '4月1日から受付。締切は区市町村でちがう', jr: '4月1日から。しめきりは窓口で聞く', en: 'Opens 1 April; deadlines vary by city' },
          p: ['tokyo-juken-challenge'] },
        { id: 'hikaku', ja: '都立と私立で、授業料と支援がどうちがうか知る', jr: '都立と私立で、お金がどうちがうか知る', en: 'Learn how tuition and support differ between public and private schools',
          title: { ja: '都立と私立のお金のちがいを知る', jr: '都立と私立のお金をくらべる', en: 'Compare public and private costs' },
          why: { ja: '都立の授業料は就学支援金で実質0円。私立にも年50万1,000円までの支援があります。', jr: '都立の授業料は実質0円。私立も助けがあるので、お金だけであきらめなくていいよ。', en: 'Public tuition is effectively ¥0 and private tuition gets up to ¥501,000 a year, so money alone need not rule a school out.' },
          who: 'self',
          p: ['tokyo-toritsu-jugyoryo', 'tokyo-shiritsu-jugyoryo'], href: '#/learn/jr-koko-okane', hrefLabel: { ja: 'レッスンへ', en: 'Open the lesson' } }
      ]
    },
    {
      track: 'junior', id: 'j3-summer', seq: 2, grade: 'jhs3', months: [7, 8, 9],
      when: { ja: '中3の7〜9月', jr: '中3の夏（7〜9月）', en: 'Grade 9, Jul–Sep' },
      title: { ja: '学校を見に行く', jr: '高校を見に行こう', en: 'Go and see schools' },
      short: { ja: '学校を|見に行く', jr: '高校を|見に行く', en: 'See schools' },
      sub: { ja: '夏は見に行くチャンス。通っている自分を想像してみよう。', jr: '夏は高校を見に行くチャンス。', en: 'Summer is the time to visit. Picture yourself there.' },
      tasks: [
        { id: 'setsumeikai', ja: '学校説明会や体験入学に行って、通学時間や校則を確かめる', jr: '学校説明会に行って、通う時間やきまりを見る', en: 'Visit open days: check travel time and school rules',
          title: { ja: '学校説明会に行く', jr: '学校説明会に行ってみる', en: 'Go to an open day' },
          why: { ja: '通学時間や校則、部活のお金は、行ってみないとわからないことが多いです。', jr: '通う時間やきまり、部活のお金は、行ってみるとよくわかります。', en: 'Travel time, rules and club costs are hard to judge until you have been there.' },
          who: 'school',
          say: { ja: '「授業料のほかに、1年でどれくらいお金がかかりますか？」', jr: '「授業料のほかに、1年でいくらくらいかかりますか？」', en: 'Apart from tuition, roughly how much does a year here cost?' },
          p: [] },
        { id: 'ryoshusho', ja: '受験生チャレンジで借りた塾代の領収書は、なくさずに取っておく（あとで全部出します）', jr: '塾代の領収書は、すてずにとっておく', en: 'Keep every cram-school receipt from the exam-support loan (you hand them all in later)',
          title: { ja: '塾代の領収書をとっておく', jr: '塾の領収書をとっておく', en: 'Keep every cram-school receipt' },
          why: { ja: '受験生チャレンジで借りたお金は、領収書を出さないと全部返すことになります。', jr: '受験生チャレンジでかりたお金は、領収書がないと全部返すことになります。', en: 'Without the receipts, the whole exam loan has to be repaid.' },
          who: 'self',
          p: ['tokyo-juken-challenge'] },
        { id: 'gakushu', ja: 'ひとりで勉強しにくいときは、学習支援の場所を使う', jr: 'ひとりで勉強しにくいときは、学習支援を使う', en: 'Find it hard to study alone? Use a study-support place',
          title: { ja: '学習支援の場所を使う', jr: '学習支援で勉強する', en: 'Use a study-support place' },
          why: { ja: '勉強する場所と教えてくれる人がいると、夏の勉強が続きます。', jr: '勉強する場所と教えてくれる人がいると、つづけやすいよ。', en: 'A place to study and someone to ask makes summer studying stick.' },
          who: 'city',
          say: { ja: '「高校受験の勉強を見てもらえる場所はありますか？」', jr: '「受験の勉強を見てくれる場所はありますか？」', en: 'Is there a place where someone can help me study for the entrance exams?' },
          p: ['kodomo-gakushu-shien'] }
      ]
    },
    {
      track: 'junior', id: 'j3-autumn', seq: 3, grade: 'jhs3', months: [10, 11, 12],
      when: { ja: '中3の10〜12月', jr: '中3の秋（10〜12月）', en: 'Grade 9, Oct–Dec' },
      title: { ja: '受ける学校を決める', jr: '受ける高校を決めよう', en: 'Choose where to apply' },
      short: { ja: '学校を|決める', jr: '高校を|決める', en: 'Choose schools' },
      sub: { ja: '決めるのは自分。費用のことも聞いていい。', jr: '決めるのは自分。お金のことも聞いていいよ。', en: 'The choice is yours. Asking about costs is fine.' },
      tasks: [
        { id: 'mendan', ja: '先生との面談で、受ける学校を決める。費用のことも聞いてOK', jr: '先生と話して、受ける高校を決める', en: 'Decide where to apply in meetings with your teacher. Asking about costs is OK',
          title: { ja: '面談で受ける高校を決める', jr: '先生と受ける高校を決める', en: 'Decide where to apply with your teacher' },
          why: { ja: '受ける学校が決まると、受験料と入学後のお金の見通しが立ちます。', jr: '受ける高校が決まると、いくらかかるかが見えてきます。', en: 'Once you know where you are applying, you can see the exam and entry costs ahead.' },
          who: 'teacher',
          say: { ja: '「この学校だと、受験料と入学のときのお金はいくらくらいですか？」', jr: '「この高校だと、受験料と入学のお金はいくらくらいですか？」', en: 'For this school, roughly what are the exam fee and the costs at entry?' },
          p: [] },
        { id: 'jukenryo', ja: '受験料も、受験生チャレンジで借りられる（高校の受験料は2万7,400円まで）', jr: '受験料も、受験生チャレンジでかりられる', en: 'Exam fees can be covered by the exam-support loan too (up to ¥27,400 for high school)',
          title: { ja: '受験料の貸付を窓口で聞く', jr: '受験料もかりられるか聞く', en: 'Ask about the exam-fee loan' },
          why: { ja: '高校の受験料も、受験生チャレンジで2万7,400円まで借りられます。', jr: '高校の受験料も、受験生チャレンジで2万7,400円までかりられます。', en: 'The exam challenge loan also covers high school exam fees up to ¥27,400.' },
          who: 'city',
          say: { ja: '「受験料の分も、受験生チャレンジで借りられますか？」', jr: '「受験料も、受験生チャレンジでかりられますか？」', en: 'Can the exam fee be covered by the exam challenge loan too?' },
          p: ['tokyo-juken-challenge'] },
        { id: 'shorui', ja: '願書や必要な書類を、締切といっしょにメモする', jr: '出す紙と、しめきりをメモする', en: 'Write down every form and its deadline',
          title: { ja: '願書と締切をメモする', jr: '出す紙としめきりをメモする', en: 'Note every form and deadline' },
          why: { ja: '願書や書類は、締切をすぎると受けつけてもらえません。', jr: '出す紙は、しめきりをすぎると受けつけてもらえません。', en: 'Forms handed in after the deadline are not accepted.' },
          who: 'self',
          p: [] }
      ]
    },
    {
      track: 'junior', id: 'j3-winter', seq: 4, grade: 'jhs3', months: [1, 2, 3],
      when: { ja: '中3の1〜3月', jr: '中3の冬（1〜3月）', en: 'Grade 9, Jan–Mar' },
      title: { ja: '受験と、合格のあと', jr: '受験と、合格したあと', en: 'Exams, and after you pass' },
      short: { ja: '受験と|合格後', jr: '受験と|合格後', en: 'Exams and after' },
      sub: { ja: '合格したら、すぐに手続きが始まります。', jr: '合格したら、すぐ手つづき。', en: 'Paperwork starts as soon as you pass.' },
      tasks: [
        { id: 'nyugaku', ja: '合格したら入学の手続き。都立高校の入学料（5,650円）は、合格発表の翌日から5日以内に払う', jr: '合格したら、入学の手つづき。都立の入学料は5日以内にはらう', en: 'After passing, enrol. Tokyo public high school entry fee (¥5,650) is due within 5 days of the results',
          title: { ja: '合格したら入学の手続きをする', jr: '合格したら入学の手つづき', en: 'After passing, do the entry paperwork' },
          why: { ja: '都立高校の入学料（5,650円）は、合格発表の翌日から5日以内に払うきまりです。', jr: '都立の入学料（5,650円）は、合格発表の次の日から5日以内にはらうきまりです。', en: 'The Tokyo public high school entry fee (¥5,650) must be paid within 5 days of the day after results.' },
          who: 'school',
          say: { ja: '「入学の手続きで、いつまでに何を出して、いくら払いますか？」', jr: '「入学の手つづきで、いつまでに何を出しますか？」', en: 'For enrolment, what do I hand in, by when, and how much do I pay?' },
          due: { kind: 'text', ja: '都立：合格発表の翌日から5日以内', jr: '都立：合格発表の次の日から5日以内', en: 'Tokyo public: within 5 days of the day after results' },
          p: [] },
        { id: 'ryoshusho2', ja: '受験生チャレンジの領収書を、区市町村の窓口に全部出す', jr: '受験生チャレンジの領収書を、窓口に出す', en: 'Hand in all exam-support loan receipts at the city desk',
          title: { ja: '領収書を全部窓口に出す', jr: '領収書を窓口に出す', en: 'Hand in all receipts at the city desk' },
          why: { ja: '受験生チャレンジは、領収書を出さないと借りたお金を全部返すことになります。', jr: '領収書を出さないと、かりたお金を全部返すことになります。', en: 'Without the receipts, the whole exam loan must be repaid.' },
          who: 'city',
          say: { ja: '「受験生チャレンジの領収書を持ってきました。」', jr: '「受験生チャレンジの領収書を持ってきました。」', en: 'I have brought the receipts for the exam challenge loan.' },
          p: ['tokyo-juken-challenge'] },
        { id: 'junbi', ja: '制服・教科書・定期代など、入学前にかかるお金を家の人と確かめる', jr: '制服や教科書のお金を、家の人と確かめる', en: 'Check pre-entry costs (uniform, textbooks, commuter pass) with family',
          title: { ja: '入学前にかかるお金を確かめる', jr: '制服などのお金を確かめる', en: 'Check the costs due before entry' },
          why: { ja: '制服・教科書・定期代は授業料とは別で、入学前にまとめてかかります。', jr: '制服・教科書・定期のお金は、授業料とは別に、入学前にかかります。', en: 'Uniform, textbooks and a commuter pass are separate from tuition and all fall due before entry.' },
          who: 'school',
          say: { ja: '「入学までにかかるお金の一覧をもらえますか？」', jr: '「入学までにかかるお金の一覧はありますか？」', en: 'Could I have a list of the costs due before entry?' },
          p: [] }
      ]
    },
    {
      track: 'junior', id: 'h1-spring', seq: 5, grade: 'hs1', months: [4, 5, 6],
      when: { ja: '高1の4〜6月', jr: '高1の春（4〜6月）', en: 'High school year 1, Apr–Jun' },
      title: { ja: '入学したら、すぐ申請', jr: '入学したら、すぐ申請', en: 'Apply as soon as you start' },
      short: { ja: '入学したら|申請', jr: '入学したら|申請', en: 'Apply at entry' },
      sub: { ja: '出さないと、授業料を払うことになるものもあります。', jr: '出さないと、お金をはらうことになります。', en: 'Miss these and you may have to pay tuition.' },
      tasks: [
        { id: 'shugakushien', ja: '学校から案内が来たら「就学支援金」をオンラインで申請する（都立は都のオンライン申請システム、私立などはe-Shien）', jr: '学校から案内が来たら「就学支援金」を申請する', en: 'When school sends instructions, apply online for the tuition support fund (Tokyo public schools: Tokyo’s own system; private schools and others: e-Shien)',
          title: { ja: '就学支援金を申請する', jr: '授業料の支援を申請する', en: 'Apply for tuition support' },
          why: { ja: '授業料をただにする「就学支援金」は、手続きしないと授業料を自分で払うことになります。', jr: '授業料をただにする「就学支援金」は、申しこまないと授業料をはらうことになります。', en: 'Tuition support makes tuition free, but miss the school’s instructions and you pay tuition yourself.' },
          who: 'school',
          say: { ja: '「就学支援金の申請は、いつまでに、どこからしますか？」', jr: '「就学支援金の申しこみは、いつまでですか？」', en: 'By when, and where, do I apply for tuition support?' },
          due: { kind: 'text', ja: '学校が知らせる期限まで', jr: '学校が知らせるしめきりまで', en: 'By the deadline your school gives' },
          p: ['koko-shugaku', 'tokyo-toritsu-jugyoryo'] },
        { id: 'menjo', ja: '受験生チャレンジを使った人は、5月末までに「免除」の書類を窓口へ（在学証明書か学生証が必要）', jr: '受験生チャレンジを使った人は、5月末までに免除の紙を出す', en: 'Used the exam-support loan? Submit the forgiveness form by the end of May (proof of enrolment or student ID)',
          title: { ja: '免除の書類を5月末までに出す', jr: '免除の紙を5月末までに出す', en: 'File the loan forgiveness by end of May' },
          why: { ja: '借りたお金は、在学証明書か学生証を持って「免除」の手続きをすると、返さなくてよくなります。', jr: 'かりたお金は、学生証を持って「免除」の手続きをすると、返さなくてよくなります。', en: 'The forgiveness form, with proof of enrolment or your student ID, is what turns the exam loan into money you never repay.' },
          who: 'city',
          say: { ja: '「高校に入学したので、受験生チャレンジの免除をしたいです。」', jr: '「高校に入ったので、受験生チャレンジの免除をしたいです。」', en: 'I have started high school and would like to apply for forgiveness of the exam challenge loan.' },
          due: { kind: 'text', ja: '入学した年の5月末まで', jr: '入学した年の5月末まで', en: 'End of May of your first year' },
          p: ['tokyo-juken-challenge'] },
        { id: 'souki', ja: '奨学給付金の「新入生の早めの申請」（4月〜7月上旬。都立は7月7日まで）ができるか、学校に聞く', jr: '奨学給付金を早めにもらえるか、学校に聞く', en: 'Ask school about the early claim for new students (April to early July; Tokyo public schools: by 7 July) of the scholarship benefit',
          title: { ja: '給付金の早めの申請を学校に聞く', jr: '給付金を早くもらえるか聞く', en: 'Ask school about the early benefit claim' },
          why: { ja: '教科書代などの「奨学給付金」は、新入生だけ一部を早めにもらう申請ができます。', jr: '教科書代などの「奨学給付金」は、1年生だけ早めにもらう申しこみができます。', en: 'New students can claim part of the scholarship benefit early, for textbooks and the like.' },
          who: 'school',
          say: { ja: '「奨学給付金の新入生の早期給付は、いつまでに申し込めますか？」', jr: '「奨学給付金を早めにもらう申しこみは、いつまでですか？」', en: 'By when can I apply for the new-student early payment of the scholarship benefit?' },
          due: { kind: 'text', ja: '都立：7月7日まで（4月〜7月上旬）', jr: '都立は7月7日まで', en: 'Tokyo public: by 7 July (April to early July)' },
          p: ['koko-kyufukin', 'tokyo-kokoritsu-kyufukin'] }
      ]
    },
    {
      track: 'junior', id: 'h1-july', seq: 6, grade: 'hs1', months: [7, 8, 9],
      when: { ja: '高1の7〜9月', jr: '高1の夏（7〜9月）', en: 'High school year 1, Jul–Sep' },
      title: { ja: '給付金と助成金の申請', jr: '給付金の申請', en: 'Apply for the benefit and top-up' },
      short: { ja: '給付金の|申請', jr: '給付金の|申請', en: 'Benefit claims' },
      sub: { ja: '申請は夏。出さないともらえないお金です。', jr: '夏に申しこむ。出さないともらえないお金。', en: 'Summer is claim season. Unclaimed money stays unclaimed.' },
      tasks: [
        { id: 'kyufukin', ja: '「奨学給付金」を申請する（都立は7月8日〜9月15日にオンラインで。私立は東京都私学財団で、授業料軽減助成金と一緒に申請できる）', jr: '「奨学給付金」を申請する（都立は9月15日まで）', en: 'Apply for the scholarship benefit (Tokyo public: online, 8 July–15 September; private: with the Tokyo Private School Foundation, together with the tuition top-up)',
          title: { ja: '奨学給付金を申請する', jr: '教科書代の給付金を申請する', en: 'Apply for the scholarship benefit' },
          why: { ja: '教科書代や教材費のための、返さなくていいお金です。申請しないともらえません。', jr: '教科書代などに使える、返さなくていいお金ですが、申しこまないともらえません。', en: 'It is money for textbooks and materials you never repay, but only if you apply.' },
          who: 'school',
          say: { ja: '「奨学給付金の申請は、いつまでですか？」', jr: '「奨学給付金の申しこみは、いつまでですか？」', en: 'When is the deadline for the scholarship benefit?' },
          due: { kind: 'text', ja: '都立：7月8日〜9月15日', jr: '都立：7月8日〜9月15日', en: 'Tokyo public: 8 July – 15 September' },
          p: ['koko-kyufukin', 'tokyo-kokoritsu-kyufukin'] },
        { id: 'shiritsu', ja: '私立高校の人は、東京都の「授業料軽減助成金」を申請する（7月・東京都私学財団）', jr: '私立の人は、東京都の「授業料軽減助成金」を申請する', en: 'At a private school? Apply for Tokyo’s tuition top-up in July (Tokyo Private School Foundation)',
          title: { ja: '私立の授業料助成を申請する', jr: '私立の授業料の助けを申請する', en: 'Private school? Apply for the Tokyo top-up' },
          why: { ja: '私立の授業料は、国の就学支援金に東京都の助成を足して、年50万1,000円まで支援されます。', jr: '私立の授業料は、国と東京都の助けを足すと、年50万1,000円まで出ます。', en: 'Tokyo’s tuition top-up adds to national support, covering private tuition up to ¥501,000 a year.' },
          who: 'school',
          say: { ja: '「授業料軽減助成金の申請は、いつ、どこからしますか？」', jr: '「東京都の授業料の助成は、いつ申しこみますか？」', en: 'When and where do I apply for Tokyo’s tuition subsidy?' },
          due: { kind: 'text', ja: '毎年7月（東京都私学財団）', jr: '毎年7月', en: 'Every July (Tokyo Private School Foundation)' },
          p: ['tokyo-shiritsu-jugyoryo'] },
        { id: 'maitoshi', ja: '奨学給付金や東京都の授業料軽減助成金は毎年の申請が必要。就学支援金も、学校から案内が来たら必ず手続きする', jr: '給付金の申請は毎年。来年の分もカレンダーに入れる', en: 'The scholarship benefit and Tokyo’s tuition top-up need a new application every year. For the tuition support fund, always act when school sends instructions',
          title: { ja: '来年の申請をカレンダーに入れる', jr: '来年の申請をカレンダーに入れる', en: 'Put next year’s claims in your calendar' },
          why: { ja: '奨学給付金や授業料軽減助成金は毎年の申請が必要で、忘れた年はもらえません。', jr: '給付金の申しこみは毎年あって、わすれた年はもらえません。', en: 'These benefits need a fresh application every year; a missed year is money lost.' },
          who: 'self',
          p: [] }
      ]
    }
  ];

  /* helper: one track in display order ('leaving' sorted by m, 'junior' by seq) */
  SM.data.timelineTrack = function (track) {
    track = track || 'leaving';
    return (SM.data.timeline || []).filter(function (g) { return (g.track || 'leaving') === track; })
      .sort(function (a, b) { return track === 'junior' ? (a.seq - b.seq) : (a.m - b.m); });
  };
})();
