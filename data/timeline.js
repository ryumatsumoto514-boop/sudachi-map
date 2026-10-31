/* 巣立ちマップ v3 — data/timeline.js (LEARN-DATA; v2 by A9)
 * Timelines used by #/plan. SM.data.timeline holds groups from TWO tracks — always filter by `track`:
 *
 *  track:'leaving'  (all v2 groups) anchored to 巣立ちの日 (SM.state.leaveDate):
 *     m     = months before (-) / after (+) the leaving day
 *     title = what this period is about,  sub = one kind line (optional)
 *     short = v8: the station name on the desktop roadmap (≤8 chars, | = the one line-break point; full title in the panel)
 *     tasks = [{ id, ja, en, p:[program ids], paths:['study'|'work'] (optional: only shown for that path),
 *                href:'#/…' (optional) + hrefLabel:{ja,en} }]
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
      sub: { ja: 'まだ先でも大丈夫。早く話すほど、使える支援が増えます。', en: 'Still early, and that is good. Talking early opens more doors.' },
      tasks: [
        { id: 'talk', ja: '「巣立ったあと、どうしたい？」を職員や先生と話す', en: 'Talk with staff or a teacher about what you want after leaving', p: [] },
        { id: 'yoyaku', ja: '進学したいなら、給付奨学金の「予約採用」がいつか先生に聞く', en: 'If you want to study, ask a teacher when the scholarship pre-application is', p: ['jasso-kyufu'], paths: ['study'] },
        { id: 'encho', ja: '18歳をすぎても今の家にいられるか（措置延長）聞いてみる', en: 'Ask if you can stay where you live after 18 (extended care)', p: ['sochi-encho'] }
      ]
    },
    {
      track: 'leaving',
      m: -10,
      title: { ja: '学校のお金の支援に申し込む', en: 'Apply for school money support' },
      short: { ja: '学校の|お金', en: 'School money' },
      sub: { ja: '奨学金は、高3の春〜初夏に学校で申し込むものが多いです。', en: 'Many scholarships are applied for at school in spring of the last year.' },
      tasks: [
        { id: 'kyufu', ja: '返さなくていい奨学金（給付奨学金）に、学校で申し込む', en: 'Apply at school for the grant scholarship (no pay-back)', p: ['jasso-kyufu', 'jasso-genmen'], paths: ['study'] },
        { id: 'minkan', ja: '民間の奨学金（夢の奨学金など）の募集時期を調べる', en: 'Check when private scholarships (e.g. Yume) open', p: ['yume-shogaku'], paths: ['study'] },
        { id: 'tsucho', ja: '通帳・印鑑・マイナンバーカードが自分の手元にあるか確かめる', en: 'Check you have your bankbook, seal and My Number card', p: ['mynumber-card'] }
      ]
    },
    {
      track: 'leaving',
      m: -8,
      title: { ja: '仕事や学校を決めていく', en: 'Decide on work or school' },
      short: { ja: '仕事か|学校', en: 'Work or school' },
      tasks: [
        { id: 'ryo', ja: '働くなら、寮や社宅があるか、やめたら出る必要があるかを確かめる', en: 'If working: check for a dorm, and whether you must leave it if you quit', p: ['hellowork-wakamono'], paths: ['work'] },
        { id: 'juken', ja: '受験料の支援が使えるか聞く', en: 'Ask about help with exam fees', p: ['jasso-juken', 'tokyo-juken-challenge'], paths: ['study'] },
        { id: 'kyoten', ja: 'アフターケアの居場所に、一度行ってみる', en: 'Visit an aftercare drop-in place once', p: ['yogo-kyoten'] }
      ]
    },
    {
      track: 'leaving',
      m: -6,
      title: { ja: '巣立ったあとの、お金の計画', en: 'Plan your money after leaving' },
      short: { ja: 'お金の|計画', en: 'Money plan' },
      sub: { ja: 'ざっくりでOK。足りない分は、支援でうめられることがあります。', en: 'Rough numbers are fine. Gaps can often be filled with support.' },
      tasks: [
        { id: 'shikin', ja: '自立支援資金貸付のことを職員に聞く（条件しだいで返さなくていい）', en: 'Ask staff about the Independence Support Loan (may not need paying back)', p: ['jiritsu-shikin', 'tokyo-jiritsu-shikin'] },
        { id: 'sim', ja: '生活費シミュレーターで、1か月のお金を計算してみる', en: 'Work out a month of money with the living-cost simulator', p: [], href: '#/tools/money', hrefLabel: { ja: '生活費シミュレーターへ', en: 'Open the simulator' } },
        { id: 'local', ja: '住む区市町村に、独自の支援があるか調べる', en: 'Check if your city or ward has its own support', p: [], href: '#/find', hrefLabel: { ja: '支援をさがす', en: 'Find support' } }
      ]
    },
    {
      track: 'leaving',
      m: -4,
      title: { ja: '住まいを探しはじめる', en: 'Start looking for a place to live' },
      short: { ja: '住まい|探し', en: 'Find a place' },
      tasks: [
        { id: 'erabu', ja: '自立援助ホーム・UR・ふつうの賃貸から、どれにするか考える', en: 'Choose between a self-reliance home, UR housing or a normal rental', p: ['jiritsu-enjo', 'ur-chintai', 'tokyo-sasaeru-jutaku'] },
        { id: 'hosho', ja: '保証人のことは「身元保証人確保対策事業」が使えるか職員に聞く', en: 'Ask staff if the guarantor support scheme can cover you', p: ['mimoto-hosho'] },
        { id: 'mitsumori', ja: '部屋の初期費用の見積もりを、2つ以上もらって比べる', en: 'Get 2+ quotes for move-in costs and compare', p: [] }
      ]
    },
    {
      track: 'leaving',
      m: -3,
      title: { ja: '契約の前に、立ち止まってチェック', en: 'Stop and check before you sign' },
      short: { ja: '契約|チェック', en: 'Check the lease' },
      tasks: [
        { id: 'keiyaku', ja: '契約書は控えをもらう。サインの前に職員と一緒に読む', en: 'Always keep a copy. Read contracts with staff before signing', p: ['shohisha-188'], href: '#/tools/check', hrefLabel: { ja: '契約チェックへ', en: 'Contract check' } },
        { id: 'meigi', ja: 'スマホ・口座・カードを人に貸さない、売らない（犯罪にまきこまれます）', en: 'Never lend or sell your phone, bank account or cards (it can drag you into crime)', p: [] },
        { id: 'start', ja: '東京都の「自立生活スタート支援」が使えるか聞く', en: 'Ask about Tokyo’s start-up support for independent living', p: ['tokyo-jiritsu-start'] }
      ]
    },
    {
      track: 'leaving',
      m: -2,
      title: { ja: '引っ越しの準備', en: 'Get ready to move' },
      short: { ja: '引っ越し|準備', en: 'Moving prep' },
      tasks: [
        { id: 'kaden', ja: '家電や家具は、支援団体からもらえないか先に聞く', en: 'Ask support groups for free appliances and furniture first', p: [] },
        { id: 'tenso', ja: '郵便局で、郵便の転送の届けを出す', en: 'File a mail forwarding request at the post office', p: [] },
        { id: 'renraku', ja: '困ったときの連絡先（施設・児相・相談先）をスマホに入れる', en: 'Save emergency contacts (your home, child guidance centre, helplines)', p: ['yorisoi'] }
      ]
    },
    {
      track: 'leaving',
      m: -1,
      title: { ja: '役所の手続きを確かめる', en: 'Check your city-office paperwork' },
      short: { ja: '役所の|手続き', en: 'City‑office steps' },
      tasks: [
        { id: 'tenshutsu', ja: '転出届を出す（オンラインでもできます）', en: 'File your move-out notice (can be done online)', p: ['hikkoshi-todoke'] },
        { id: 'kokuho', ja: '国民健康保険に入る準備をする（保険料が安くなることも）', en: 'Get ready to join National Health Insurance (fees may be reduced)', p: ['kokuho'] },
        { id: 'nenkin', ja: '20歳以上なら、国民年金の免除や学生納付特例を調べる', en: 'If 20+, look into pension payment waivers or the student deferral', p: ['nenkin-gakusei', 'nenkin-menjo'] }
      ]
    },
    {
      track: 'leaving',
      m: 0,
      title: { ja: '巣立ちの日', en: 'Your leaving day' },
      sub: { ja: 'ここからがスタート。できなかったことは、あとからでも大丈夫。', en: 'This is the start. Anything left undone can still be done later.' },
      tasks: [
        { id: 'hoken', ja: '次の日から病院は自分の保険。マイナ保険証の登録か、資格確認書が届くまでどうするかを聞いておく', en: 'From tomorrow you use your own insurance. Register your My Number card as your insurance card, or ask what to do until your eligibility certificate (資格確認書) arrives.', p: ['kokuho'] },
        { id: 'denwacho', ja: '職員の連絡先と、よ\u2060り\u2060そ\u2060いホットラインを電話帳に入れる', en: 'Save your staff contact and the Yorisoi Hotline in your phone', p: ['yorisoi'] }
      ]
    },
    {
      track: 'leaving',
      m: 1,
      title: { ja: '新しい暮らしの、最初の1か月', en: 'Your first month' },
      short: { ja: '最初の|1か月', en: 'First month' },
      tasks: [
        { id: 'tennyu', ja: '転入届は、引っ越してから14日以内に出す', en: 'File your move-in notice within 14 days of moving', p: ['hikkoshi-todoke'] },
        { id: 'calendar', ja: '給料日・家賃の日・奨学金が入る日をカレンダーに入れる', en: 'Put payday, rent day and scholarship day in your calendar', p: [] },
        { id: 'genki', ja: '施設や居場所に「元気です」と1回連絡する', en: 'Send one “I’m OK” message to your old home or drop-in place', p: ['yogo-kyoten'] }
      ]
    },
    {
      track: 'leaving',
      m: 3,
      title: { ja: '3か月後。むりしていないか確かめる', en: '3 months on: check you are OK' },
      short: { ja: '3か月後に|確認', en: '3‑month check' },
      sub: { ja: 'つまずくのはふつうのこと。早めに相談すると、選べる道が多いです。', en: 'Stumbling is normal. Asking early keeps more options open.' },
      tasks: [
        { id: 'tarinai', ja: 'お金が足りないときは早めに相談（住居確保給付金・くらしの相談）', en: 'Short on money? Ask early (housing benefit, life support desk)', p: ['jukyo-kakuho', 'jiritsu-sodan'] },
        { id: 'tsurai', ja: '仕事がつらいときは、労働の相談やサポステへ', en: 'Work feels hard? Talk to a labour helpline or Saposute', p: ['rodo-hotline', 'saposute'] },
        { id: 'hanasu', ja: 'ひとりで抱えない。だれかと話す日を決める', en: 'Don’t carry it alone. Pick a day to talk to someone', p: ['tokyo-wakanavi'] }
      ]
    },
    {
      track: 'leaving',
      m: 6,
      title: { ja: '半年後。これからを考える', en: '6 months on: think ahead' },
      short: { ja: '半年後に|考える', en: '6‑month check' },
      tasks: [
        { id: 'kaeru', ja: '仕事を変えたい・学び直したいときも、相談できる', en: 'Want to change jobs or study again? You can ask for help', p: ['tokyo-shigoto-young', 'kyushokusha-shien'] },
        { id: 'tetsuzuki', ja: '国保や年金の手続きがすんでいるか確かめる', en: 'Check your health insurance and pension paperwork is done', p: ['kokuho', 'nenkin-menjo'] },
        { id: 'file', ja: '大事な書類の控えを、1つのファイルにまとめる', en: 'Keep copies of important papers together in one folder', p: [] }
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
        { id: 'learn', ja: '「高校にかかるお金と支援」のレッスンを読む', jr: '「高校のお金」のレッスンを読む', en: 'Read the lesson on high school costs and support', p: [], href: '#/learn/jr-koko-okane', hrefLabel: { ja: 'レッスンへ', en: 'Open the lesson' } },
        { id: 'gakushu', ja: '無料の学習支援や居場所が近くにあるか、区市町村に聞く', jr: '近くに、無料で勉強を教えてくれる場所があるか聞く', en: 'Ask your city about free study support or drop-in places nearby', p: ['kodomo-gakushu-shien'] },
        { id: 'enjo', ja: '学用品や給食費が心配なら、「就学援助」のことを家の人や先生と話す', jr: '給食費などが心配なら、「就学援助」のことを先生と話す', en: 'Worried about school supplies or lunch fees? Talk about school-expense aid with family or a teacher', p: ['shugaku-enjo'] }
      ]
    },
    {
      track: 'junior', id: 'j3-spring', seq: 1, grade: 'jhs3', months: [4, 5, 6],
      when: { ja: '中3の4〜6月', jr: '中3の春（4〜6月）', en: 'Grade 9, Apr–Jun' },
      title: { ja: '進路を話しはじめる', jr: '行きたい高校のことを話そう', en: 'Start talking about next steps' },
      short: { ja: '進路を|話す', jr: '高校のことを|話す', en: 'Talk next steps' },
      sub: { ja: '迷っていても大丈夫。話すほど、選べる道が見えてきます。', jr: 'まよっていても大丈夫。', en: 'Not sure yet? That’s fine. Talking opens up options.' },
      tasks: [
        { id: 'shinro', ja: '行きたい高校や将来のことを、先生・家の人・施設の職員と話す', jr: '行きたい高校のことを、先生や家の人と話す', en: 'Talk about schools and the future with a teacher, family or care staff', p: ['tokyo-kyoiku-sodan'] },
        { id: 'challenge', ja: '塾代や受験料が心配なら、「受験生チャレンジ支援貸付」を区市町村の窓口で相談する（4月1日から受付）', jr: '塾代や受験料が心配なら、「受験生チャレンジ」を窓口で聞く（4月から）', en: 'Worried about cram school or exam fees? Ask your city about Tokyo’s exam-support loan (opens 1 April)', p: ['tokyo-juken-challenge'] },
        { id: 'hikaku', ja: '都立と私立で、授業料と支援がどうちがうか知る', jr: '都立と私立で、お金がどうちがうか知る', en: 'Learn how tuition and support differ between public and private schools', p: ['tokyo-toritsu-jugyoryo', 'tokyo-shiritsu-jugyoryo'], href: '#/learn/jr-koko-okane', hrefLabel: { ja: 'レッスンへ', en: 'Open the lesson' } }
      ]
    },
    {
      track: 'junior', id: 'j3-summer', seq: 2, grade: 'jhs3', months: [7, 8, 9],
      when: { ja: '中3の7〜9月', jr: '中3の夏（7〜9月）', en: 'Grade 9, Jul–Sep' },
      title: { ja: '学校を見に行く', jr: '高校を見に行こう', en: 'Go and see schools' },
      short: { ja: '学校を|見に行く', jr: '高校を|見に行く', en: 'See schools' },
      tasks: [
        { id: 'setsumeikai', ja: '学校説明会や体験入学に行って、通学時間や校則を確かめる', jr: '学校説明会に行って、通う時間やきまりを見る', en: 'Visit open days: check travel time and school rules', p: [] },
        { id: 'ryoshusho', ja: '受験生チャレンジで借りた塾代の領収書は、なくさずに取っておく（あとで全部出します）', jr: '塾代の領収書は、すてずにとっておく', en: 'Keep every cram-school receipt from the exam-support loan (you hand them all in later)', p: ['tokyo-juken-challenge'] },
        { id: 'gakushu', ja: 'ひとりで勉強しにくいときは、学習支援の場所を使う', jr: 'ひとりで勉強しにくいときは、学習支援を使う', en: 'Find it hard to study alone? Use a study-support place', p: ['kodomo-gakushu-shien'] }
      ]
    },
    {
      track: 'junior', id: 'j3-autumn', seq: 3, grade: 'jhs3', months: [10, 11, 12],
      when: { ja: '中3の10〜12月', jr: '中3の秋（10〜12月）', en: 'Grade 9, Oct–Dec' },
      title: { ja: '受ける学校を決める', jr: '受ける高校を決めよう', en: 'Choose where to apply' },
      short: { ja: '学校を|決める', jr: '高校を|決める', en: 'Choose schools' },
      tasks: [
        { id: 'mendan', ja: '先生との面談で、受ける学校を決める。費用のことも聞いてOK', jr: '先生と話して、受ける高校を決める', en: 'Decide where to apply in meetings with your teacher. Asking about costs is OK', p: [] },
        { id: 'jukenryo', ja: '受験料も、受験生チャレンジで借りられる（高校の受験料は2万7,400円まで）', jr: '受験料も、受験生チャレンジでかりられる', en: 'Exam fees can be covered by the exam-support loan too (up to ¥27,400 for high school)', p: ['tokyo-juken-challenge'] },
        { id: 'shorui', ja: '願書や必要な書類を、締切といっしょにメモする', jr: '出す紙と、しめきりをメモする', en: 'Write down every form and its deadline', p: [] }
      ]
    },
    {
      track: 'junior', id: 'j3-winter', seq: 4, grade: 'jhs3', months: [1, 2, 3],
      when: { ja: '中3の1〜3月', jr: '中3の冬（1〜3月）', en: 'Grade 9, Jan–Mar' },
      title: { ja: '受験と、合格のあと', jr: '受験と、合格したあと', en: 'Exams, and after you pass' },
      short: { ja: '受験と|合格後', jr: '受験と|合格後', en: 'Exams and after' },
      sub: { ja: '合格したら、すぐに手続きが始まります。', jr: '合格したら、すぐ手つづき。', en: 'Paperwork starts as soon as you pass.' },
      tasks: [
        { id: 'nyugaku', ja: '合格したら入学の手続き。都立高校の入学料（5,650円）は、合格発表の翌日から5日以内に払う', jr: '合格したら、入学の手つづき。都立の入学料は5日以内にはらう', en: 'After passing, enrol. Tokyo public high school entry fee (¥5,650) is due within 5 days of the results', p: [] },
        { id: 'ryoshusho2', ja: '受験生チャレンジの領収書を、区市町村の窓口に全部出す', jr: '受験生チャレンジの領収書を、窓口に出す', en: 'Hand in all exam-support loan receipts at the city desk', p: ['tokyo-juken-challenge'] },
        { id: 'junbi', ja: '制服・教科書・定期代など、入学前にかかるお金を家の人と確かめる', jr: '制服や教科書のお金を、家の人と確かめる', en: 'Check pre-entry costs (uniform, textbooks, commuter pass) with family', p: [] }
      ]
    },
    {
      track: 'junior', id: 'h1-spring', seq: 5, grade: 'hs1', months: [4, 5, 6],
      when: { ja: '高1の4〜6月', jr: '高1の春（4〜6月）', en: 'High school year 1, Apr–Jun' },
      title: { ja: '入学したら、すぐ申請', jr: '入学したら、すぐ申請', en: 'Apply as soon as you start' },
      short: { ja: '入学したら|申請', jr: '入学したら|申請', en: 'Apply at entry' },
      sub: { ja: '出さないと、授業料を払うことになるものもあります。', jr: '出さないと、お金をはらうことになります。', en: 'Miss these and you may have to pay tuition.' },
      tasks: [
        { id: 'shugakushien', ja: '学校から案内が来たら「就学支援金」をオンラインで申請する（都立は都のオンライン申請システム、私立などはe-Shien）', jr: '学校から案内が来たら「就学支援金」を申請する', en: 'When school sends instructions, apply online for the tuition support fund (Tokyo public schools: Tokyo’s own system; private schools and others: e-Shien)', p: ['koko-shugaku', 'tokyo-toritsu-jugyoryo'] },
        { id: 'menjo', ja: '受験生チャレンジを使った人は、5月末までに「免除」の書類を窓口へ（在学証明書か学生証が必要）', jr: '受験生チャレンジを使った人は、5月末までに免除の紙を出す', en: 'Used the exam-support loan? Submit the forgiveness form by the end of May (proof of enrolment or student ID)', p: ['tokyo-juken-challenge'] },
        { id: 'souki', ja: '奨学給付金の「新入生の早めの申請」（4月〜7月上旬。都立は7月7日まで）ができるか、学校に聞く', jr: '奨学給付金を早めにもらえるか、学校に聞く', en: 'Ask school about the early claim for new students (April to early July; Tokyo public schools: by 7 July) of the scholarship benefit', p: ['koko-kyufukin', 'tokyo-kokoritsu-kyufukin'] }
      ]
    },
    {
      track: 'junior', id: 'h1-july', seq: 6, grade: 'hs1', months: [7, 8, 9],
      when: { ja: '高1の7〜9月', jr: '高1の夏（7〜9月）', en: 'High school year 1, Jul–Sep' },
      title: { ja: '給付金と助成金の申請', jr: '給付金の申請', en: 'Apply for the benefit and top-up' },
      short: { ja: '給付金の|申請', jr: '給付金の|申請', en: 'Benefit claims' },
      tasks: [
        { id: 'kyufukin', ja: '「奨学給付金」を申請する（都立は7月8日〜9月15日にオンラインで。私立は東京都私学財団で、授業料軽減助成金と一緒に申請できる）', jr: '「奨学給付金」を申請する（都立は9月15日まで）', en: 'Apply for the scholarship benefit (Tokyo public: online, 8 July–15 September; private: with the Tokyo Private School Foundation, together with the tuition top-up)', p: ['koko-kyufukin', 'tokyo-kokoritsu-kyufukin'] },
        { id: 'shiritsu', ja: '私立高校の人は、東京都の「授業料軽減助成金」を申請する（7月・東京都私学財団）', jr: '私立の人は、東京都の「授業料軽減助成金」を申請する', en: 'At a private school? Apply for Tokyo’s tuition top-up in July (Tokyo Private School Foundation)', p: ['tokyo-shiritsu-jugyoryo'] },
        { id: 'maitoshi', ja: '奨学給付金や東京都の授業料軽減助成金は毎年の申請が必要。就学支援金も、学校から案内が来たら必ず手続きする', jr: '給付金の申請は毎年。来年の分もカレンダーに入れる', en: 'The scholarship benefit and Tokyo’s tuition top-up need a new application every year. For the tuition support fund, always act when school sends instructions', p: [] }
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
