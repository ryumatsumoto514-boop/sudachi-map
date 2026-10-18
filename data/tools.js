/* 巣立ちマップ v3 — data for the three tools (owner: PROGRAM)
 *   SM.data.scripts  : 電話・窓口の台本   (#/tools/script)
 *   SM.data.checks   : 契約チェック       (#/tools/check)
 *   SM.data.sim      : 生活費シミュレーター・ひとり暮らし (#/tools/money)  — also read by learnCalc.budget (keep keys)
 *   SM.data.simJr    : おこづかい・バイト（中学生・高校生）  (#/tools/money, mode "jr")
 * Extra (additive): SM.data.scriptTips, SM.data.checkScenes, SM.data.checkInfo.
 * Text objects may carry `jr` (simpler Japanese for 中学生); SM.L() picks it while body.is-junior.
 * Program links use ids from data/programs-*.js; the views skip any id that does not exist.
 * Scripts are Japanese only on purpose: they are read aloud at a Japanese counter / on the phone.
 */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};

  /* trim trailing 。 so the template can add its own */
  function c(v) { return String(v == null ? '' : v).trim().replace(/[。．.、]+$/, ''); }
  function open(mode, phone, visit) { return mode === 'visit' ? visit : phone; }

  /* ===================================================================== scripts
   * fields: [{ k, label:{ja,en}, def (example value), hint? }]
   * tpl(f, o) -> string. o.mode = 'phone' | 'visit'. Lines in （ ） are "help phrases",
   * lines ending in ？ are questions — the view styles them differently.
   * jr: true = written for 中学生 (listed first while body.is-junior). */
  SM.data.scripts = {
    madoguchi: {
      label: { ja: '役所・社協などに制度のことを聞く', en: 'Ask a city office about a program' },
      short: { ja: '制度のことを聞く', en: 'Ask about a program' },
      icon: 'document',
      modes: true,
      fields: [
        { k: 'seido', label: { ja: '聞きたい制度の名前', en: 'Program name' }, def: '自立支援資金貸付' },
        { k: 'jokyo', label: { ja: '自分の状況', en: 'Your situation' }, def: '来年の3月に施設を出る予定で、4月から専門学校に通います', hint: { ja: '「いつ・どこを出るか」「進学か仕事か」があると伝わりやすい', en: 'When you leave, and school or work' } },
        { k: 'komari', label: { ja: 'いちばん知りたいこと', en: 'What you most want to know' }, def: '家賃の支援を受けられるか' }
      ],
      tpl: function (f, o) {
        return open(o.mode,
          'お忙しいところすみません。\n' + c(f.seido) + 'のことで、教えてほしくて電話しました。',
          'すみません。\n' + c(f.seido) + 'のことで、聞きたいことがあって来ました。') +
          '\n\n私は、' + c(f.jokyo) + '。\n' + c(f.komari) + 'を知りたいです。' +
          '\n\n私は対象になりますか？\n必要な書類と、手続きの流れを教えてください。' +
          '\n\n（メモを取るので、ゆっくりお願いします）\n（もう一度お願いします）\n（担当の方のお名前を教えてください）';
      }
    },

    sodan: {
      label: { ja: '相談窓口に、はじめて電話する', en: 'Call a helpline for the first time' },
      short: { ja: 'はじめて相談する', en: 'First call to a helpline' },
      icon: 'heart',
      modes: true,
      fields: [
        { k: 'nayami', label: { ja: '話したいこと', en: 'What you want to talk about' }, def: 'ひとり暮らしのお金', hint: { ja: 'ざっくりで大丈夫。「なんとなく不安」でもOK', en: 'Rough is fine' } },
        { k: 'kibo', label: { ja: 'どうしてほしいか', en: 'What you would like' }, def: 'まずは話を聞いてほしい' }
      ],
      tpl: function (f, o) {
        return open(o.mode,
          'はじめて電話します。\n' + c(f.nayami) + 'のことで、相談したくて電話しました。',
          'はじめて来ました。\n' + c(f.nayami) + 'のことで、相談したくて来ました。') +
          '\nうまく話せないかもしれませんが、聞いてもらえますか？' +
          '\n\n' + c(f.kibo) + 'です。' +
          '\n\n（名前は言わなくても大丈夫ですか？）\n（少し考える時間をください）\n（今日はここまでにします。また連絡してもいいですか？）';
      }
    },

    otona: {
      jr: true,
      label: { ja: '先生や施設の人に、相談を切り出す', jr: '先生や施設の人に「相談したい」と言う', en: 'Ask a teacher or carer for a talk' },
      short: { ja: '大人に相談する', jr: '大人に相談する', en: 'Talk to an adult' },
      icon: 'users',
      modes: false,
      fields: [
        { k: 'dare', label: { ja: '相談したい人', jr: '話したい人', en: 'Who' }, def: '先生', hint: { ja: '担任の先生、施設の職員さん、スクールカウンセラーなど', jr: '先生、施設の人、スクールカウンセラーなど', en: 'Teacher, care worker, school counsellor' } },
        { k: 'nayami', label: { ja: '話したいこと', en: 'What about' }, def: '高校に行くお金のこと', hint: { ja: 'ざっくりで大丈夫', jr: 'ざっくりでOK', en: 'Rough is fine' } }
      ],
      tpl: function (f) {
        return c(f.dare) + '、少し時間をもらえますか？\n' + c(f.nayami) + 'で、相談したいことがあります。' +
          '\n\nうまく話せないかもしれないけど、聞いてもらえますか？' +
          '\n\n（今すぐじゃなくて大丈夫です。話せる時間を教えてください）\n（ほかの人に話すときは、先に教えてください）';
      }
    },

    koko: {
      jr: true,
      label: { ja: '先生に、高校にかかるお金と支援を聞く', jr: '先生に、高校のお金と支援のことを聞く', en: 'Ask a teacher about high school costs' },
      short: { ja: '高校のお金を聞く', jr: '高校のお金を聞く', en: 'High school costs' },
      icon: 'school',
      modes: false,
      fields: [
        { k: 'gakko', label: { ja: '行きたい高校', jr: '行きたい高校', en: 'School you want' }, def: '都立高校' },
        { k: 'fuan', label: { ja: '心配なこと', jr: '心配なこと', en: 'What worries you' }, def: '入学のときと、毎月かかるお金' }
      ],
      tpl: function (f) {
        return '先生、相談したいことがあります。\n' + c(f.gakko) + 'に行きたいと思っています。\n' + c(f.fuan) + 'が心配です。' +
          '\n\n授業料の支援（就学支援金）や、奨学給付金は、私も使えますか？\n受験料や塾のお金を借りられる制度（受験生チャレンジ支援貸付）は、私も使えますか？\nいつまでに、何をすればいいですか？' +
          '\n\n（締切を、メモに書いてもらえますか）\n（施設の人や家の人にも、いっしょに説明してもらえますか）';
      }
    },

    fudosan: {
      label: { ja: '不動産会社に部屋のことを聞く', en: 'Ask a real estate agent about a room' },
      short: { ja: '部屋をさがす', en: 'Find a room' },
      icon: 'home-heart',
      modes: true,
      fields: [
        { k: 'bukken', label: { ja: '物件や希望', en: 'What you are looking for' }, def: '家賃5万円くらいの1Kで、○○駅のまわり' },
        { k: 'hosho', label: { ja: '保証人のこと', en: 'About a guarantor' }, def: '親に頼めないので、施設の保証の制度を使いたい' }
      ],
      tpl: function (f, o) {
        return open(o.mode, 'すみません、部屋を探していて電話しました。', 'すみません、部屋を探しています。') +
          '\n' + c(f.bukken) + 'を探しています。' +
          '\n\n保証人のことですが、' + c(f.hosho) + 'です。\nそれでも申し込める部屋はありますか？' +
          '\n\n初期費用は、全部でいくらくらいになりますか？\n内わけ（敷金・礼金・仲介手数料・保証会社・火災保険）を教えてください。' +
          '\n\n（見積もりを紙かメールでもらえますか）\n（今日は決めずに、相談してから連絡します）';
      }
    },

    hellowork: {
      label: { ja: 'ハローワーク・サポステに初めて行く', en: 'First visit to Hello Work / Saposute' },
      short: { ja: '仕事の相談', en: 'Job support' },
      icon: 'briefcase',
      modes: true,
      fields: [
        { k: 'nenrei', label: { ja: '年齢と状況', en: 'Age and situation' }, def: '18歳で、今年の3月に高校を卒業しました' },
        { k: 'kibo', label: { ja: '希望', en: 'What you want' }, def: '寮か社宅がある仕事を探しています' }
      ],
      tpl: function (f, o) {
        return open(o.mode, 'すみません、はじめて利用したくて電話しました。', 'すみません、はじめて利用します。') +
          '\n' + c(f.nenrei) + '。\n' + c(f.kibo) + '。' +
          '\n\n予約はいりますか？\n持ち物は何が必要ですか？\n同じ担当の方に、続けて相談できますか？' +
          '\n\n（最初は相談だけでも大丈夫ですか）';
      }
    },

    gakko: {
      label: { ja: '先生に奨学金のことを相談する', en: 'Talk to a teacher about scholarships' },
      short: { ja: '奨学金を先生に', en: 'Scholarships' },
      icon: 'school',
      modes: false,
      fields: [
        { k: 'shinro', label: { ja: '進路', en: 'Your plan' }, def: '○○専門学校に進みたい' },
        { k: 'fuan', label: { ja: '不安なこと', en: 'What worries you' }, def: '学費と、ひとり暮らしの生活費' }
      ],
      tpl: function (f) {
        return '先生、相談したいことがあります。\n' + c(f.shinro) + 'と思っています。\n不安なのは、' + c(f.fuan) + 'です。' +
          '\n\n給付型奨学金の予約採用は、いつまでに、何を出せばいいですか？\n施設や里親家庭で育ったことで、申し込みの区分が変わると聞きました。確認してもらえますか？' +
          '\n\n（締切を、メモに書いてもらえますか）';
      }
    },

    yakusho: {
      label: { ja: '役所で住民票・保険・年金の手続き', en: 'City hall: residence, insurance, pension' },
      short: { ja: '引っ越しの手続き', en: 'Moving paperwork' },
      icon: 'document',
      modes: false,
      fields: [
        { k: 'hikkoshi', label: { ja: '引っ越した日', en: 'Moving day' }, def: '3月31日' },
        { k: 'jotai', label: { ja: '今の状態', en: 'Your situation' }, def: '学生で、会社の保険には入りません' }
      ],
      tpl: function (f) {
        return 'すみません。' + c(f.hikkoshi) + 'に引っ越してきました。\n転入届をお願いします。' +
          '\n\n' + c(f.jotai) + '。\n国民健康保険にも入りたいです。\n保険料が安くなる対象か、見てもらえますか？' +
          '\n\n（20歳以上なら）国民年金の免除か、学生納付特例の申請もしたいです。' +
          '\n\n（今日できない手続きがあれば、次に何を持ってくればいいか教えてください）';
      }
    }
  };

  SM.data.scriptTips = [
    { ja: 'かける前に、この画面と紙とペンを用意する', jr: 'かける前に、この画面と紙とペンを用意しよう', en: 'Have this screen, paper and a pen ready' },
    { ja: '名前を言わなくても、相談できることが多い', jr: '名前を言わなくても、相談できることが多いよ', en: 'You can often ask without giving your name' },
    { ja: '「メモを取るので、ゆっくりお願いします」と言っていい', en: 'It is OK to ask them to speak slowly' },
    { ja: '聞き取れなかったら「もう一度お願いします」。何回でもOK', en: '"Could you say that again?" — as many times as you need' },
    { ja: '最後に「担当の方のお名前」と「次にすること」を聞く', jr: 'さいごに「相手の名前」と「次にすること」を聞こう', en: 'At the end, ask their name and what to do next' },
    { ja: '緊張するときは、職員や相談員に横にいてもらう', jr: 'きんちょうするときは、大人に横にいてもらおう', en: 'If you are nervous, ask a staff member to sit with you' }
  ];

  /* ===================================================================== contract check
   * w = weight. crime = could make YOU part of a crime (名義貸し・闇バイト). minor = only shown to under-18s.
   * Scenes: jrRank orders them while body.is-junior (lower = first). */
  SM.data.checkScenes = [
    { key: 'room', label: { ja: '部屋・お金を払う契約', jr: '部屋や、お金をはらう約束', en: 'Rooms and paid contracts' }, icon: 'home-heart', jrRank: 4 },
    { key: 'work', label: { ja: '仕事・アルバイト', jr: 'バイト・仕事のさそい', en: 'Jobs' }, icon: 'briefcase', jrRank: 3 },
    { key: 'net', label: { ja: 'ネット・ゲーム・買い物', jr: 'ネット・ゲーム・買い物', en: 'Online, games and shopping' }, icon: 'globe', jrRank: 1 },
    { key: 'sns', label: { ja: 'もうけ話・SNS', jr: 'もうけ話・SNSのさそい', en: 'Money offers and social media' }, icon: 'alert', jrRank: 2 }
  ];

  SM.data.checks = [
    { k: 'isoge', scene: 'room', w: 2, t: { ja: '「今日中に決めて」「今だけ」と急かされている', jr: '「今日中に決めて」「今だけ」とせかされている', en: 'They push you to decide today' } },
    { k: 'kami', scene: 'room', w: 3, t: { ja: '契約書や見積もりの控えを、もらえない・見せてくれない', jr: '約束の紙（契約書）を、もらえない・見せてくれない', en: 'They will not give or show you the contract or quote' } },
    { k: 'shoki', scene: 'room', w: 2, t: { ja: '部屋の初期費用が、家賃の6か月分より多い', en: 'Move-in costs are more than 6 months of rent' } },
    { k: 'sokujitsu', scene: 'room', w: 2, t: { ja: '「保証人なし・審査なし・身分証なし」で、すぐOKと言われた', en: '"No guarantor, no check, no ID — OK today"' } },
    { k: 'kari', scene: 'room', w: 2, t: { ja: '契約のために、別の所でお金を借りるよう言われた', jr: 'はらうために、どこかでお金を借りてと言われた', en: 'They told you to borrow money elsewhere to sign' } },
    { k: 'chigau', scene: 'work', w: 1, t: { ja: '仕事の中身や給料が、聞いていた話とちがう', en: 'The job or pay is different from what you were told' } },
    { k: 'tenbiki', scene: 'work', w: 2, t: { ja: '給料から、理由のわからないお金が引かれる・寮費がとても高い', en: 'Unclear deductions from pay, or very high dorm fees' } },
    { k: 'iyaku', scene: 'work', w: 2, t: { ja: 'やめたいと言ったら「違約金」「損害賠償」と言われた', jr: 'やめたいと言ったら「お金をはらえ」と言われた', en: 'They threaten fines when you want to quit' } },
    { k: 'yami', scene: 'work', w: 4, crime: true, t: { ja: '「受け取るだけ」「運ぶだけ」で高いお金がもらえる仕事にさそわれた', jr: '「受け取るだけ」「運ぶだけ」でたくさんお金がもらえる、とさそわれた', en: 'A job paying a lot "just to pick up or carry" something' } },
    { k: 'muryo', scene: 'net', w: 3, t: { ja: '「無料」のはずが、あとから「料金をはらって」と画面やメールで言われた', jr: '「無料」だったのに、あとから「お金をはらって」と出てきた', en: 'It said "free", then a screen or email told you to pay' } },
    { k: 'rmt', scene: 'net', w: 2, t: { ja: 'ゲームのアイテムやアカウントを、知らない人と売り買いしようとしている', jr: 'ゲームのアイテムやアカウントを、知らない人と売り買いしようとしている', en: 'Buying or selling game items or accounts with a stranger' } },
    { k: 'naisho', scene: 'net', w: 1, minor: true, t: { ja: '家の人や施設の人にないしょで、課金やネットの買い物をした・しようとしている', jr: '家の人や施設の人にないしょで、課金やネットの買い物をした・しようとしている', en: 'Paying in games or shopping online without telling your carers' } },
    { k: 'mokaru', scene: 'sns', w: 3, t: { ja: '「必ずもうかる」「友だちを誘えばお金が戻る」と言われた', jr: '「ぜったいもうかる」「友だちをさそえばお金がもどる」と言われた', en: '"Guaranteed profit" or "invite friends to earn it back"' } },
    { k: 'meigi', scene: 'sns', w: 4, crime: true, t: { ja: '自分の名前で、スマホ・口座・カードを作って「貸して」「売って」と言われた', jr: '自分の名前でスマホや口座を作って「かして」「売って」と言われた', en: 'Asked to open a phone, bank account or card and lend or sell it' } },
    { k: 'sns', scene: 'sns', w: 1, t: { ja: 'SNS・マッチングアプリ・知らない人から来た話だ', jr: 'SNSや、知らない人から来た話だ', en: 'It came from social media, a dating app or a stranger' } }
  ];

  /* junior: true = shown first while body.is-junior; adult: true = hidden while body.is-junior.
     src = the official page the fact comes from (same pages LEARN-DATA read for the まなぶ lessons). */
  SM.data.checkInfo = [
    { junior: true,
      title: { ja: '18歳までの契約は、取り消せることがある', jr: '18歳までの約束（契約）は、取り消せることがある', en: 'Under 18? Contracts can often be cancelled' },
      body: { ja: '18歳になるまでは、親や施設の人など（保護者）の同意がない契約は、あとから取り消せることがあります（未成年者取消し）。ただし、おこづかいの範囲の買い物や、年齢をうそをついてした契約などは取り消せないことがあります。', jr: '18歳になるまでは、保護者（親や施設の人など）が「いいよ」と言っていない約束（契約）は、あとから取り消せることがあります。でも、おこづかいで買える物や、年れいをうそをついた約束などは、取り消せないことがあります。', en: 'Until 18, a contract made without your guardian’s consent can often be cancelled. Small purchases within your pocket money, or contracts where you lied about your age, may not be.' },
      ids: ['shohisha-188'], src: { org: '政府広報オンライン', url: 'https://www.gov-online.go.jp/article/201801/entry-8951.html' } },
    { title: { ja: 'クーリング・オフ（8日以内なら取り消せることも）', en: 'Cooling-off period' },
      body: { ja: '訪問販売・電話でのさそい・キャッチセールスなどは、書面を受け取った日から8日間（マルチ商法は20日間）なら、理由なしで取り消せます。お店やネット通販で自分から買ったものは対象外です。', jr: '家に来た人や電話・道でさそわれて買ったものは、紙をもらった日から8日間なら、理由がなくても取り消せます。お店やネットで自分から買ったものは、できません。', en: 'Door-to-door, phone and street sales can be cancelled within 8 days of getting the papers (20 days for multi-level marketing). Things you bought yourself in a shop or online are not covered.' },
      ids: ['shohisha-188'] },
    { adult: true,
      title: { ja: '部屋の初期費用の目安', en: 'Typical move-in costs' },
      body: { ja: '敷金・礼金・仲介手数料・前家賃・保証会社・火災保険をあわせて、家賃の4〜6か月分くらいがよくある金額です。それより高いときは、内わけを紙でもらいましょう。', en: 'Deposit, key money, agent fee, first rent, guarantor company and insurance are usually 4–6 months of rent in total. If it is more, ask for a written breakdown.' },
      ids: ['ur-chintai', 'mimoto-hosho'] },
    { adult: true,
      title: { ja: '仕事をやめるとき', en: 'Quitting a job' },
      body: { ja: '正社員でも、ふつうは2週間前に伝えればやめられます（民法）。「損害賠償」と言われても、ほとんどはおどしです。ひとりで抱えずに相談しましょう。', en: 'Even full-time workers can usually quit with 2 weeks\' notice (Civil Code). Threats of damages are usually empty. Talk to someone.' },
      ids: ['rodo-hotline', 'tokyo-rodo-sodan'] },
    { adult: true,
      title: { ja: '18歳からは「おとな」の契約', en: 'At 18 you sign as an adult' },
      body: { ja: '18歳になると、親や施設の同意なしで契約できます。そのかわり、サインした契約は取り消しにくくなります。サインの前に、だれか1人に見せてください。', en: 'From 18 you can sign contracts on your own, but they are harder to cancel. Show someone before you sign.' },
      ids: ['tokyo-shohi-center'] }
  ];

  /* ===================================================================== money simulator: ひとり暮らし
   * Rough monthly numbers for one person living alone. They are a starting point the user edits,
   * not official statistics. (data/learn.js learnCalc.budget reads presets + expenses: keep the keys.) */
  SM.data.sim = {
    presets: {
      ku23: { label: { ja: '東京23区', en: 'Tokyo 23 wards' }, rent: 70000, food: 38000, util: 12000, phone: 5000, trans: 8000, ins: 0, other: 25000 },
      tama: { label: { ja: '多摩（市町村）', en: 'Tama area' }, rent: 55000, food: 36000, util: 12000, phone: 5000, trans: 10000, ins: 0, other: 23000 }
    },
    defaultPreset: 'ku23',
    defaults: { income: 150000, scholarship: 0, shien: false, yachin: false },
    expenses: [
      { k: 'rent', label: { ja: '家賃', en: 'Rent' }, hint: { ja: '管理費こみ。寮なら寮費', en: 'Incl. fees; dorm fee if in a dorm' }, max: 150000, tone: 'housing' },
      { k: 'food', label: { ja: '食費', en: 'Food' }, max: 80000, tone: 'money' },
      { k: 'util', label: { ja: '電気・ガス・水道', en: 'Utilities' }, short: { ja: '光熱費', en: 'Utilities' }, max: 40000, tone: 'work' },
      { k: 'phone', label: { ja: 'スマホ・ネット', en: 'Phone & internet' }, short: { ja: '通信', en: 'Phone' }, max: 20000, tone: 'education' },
      { k: 'trans', label: { ja: '交通', en: 'Transport' }, max: 40000, tone: 'procedures' },
      { k: 'ins', label: { ja: '保険・年金', en: 'Insurance & pension' }, short: { ja: '保険・年金', en: 'Insurance' }, hint: { ja: '国民健康保険＋年金。免除なら0に近い', en: 'Health insurance + pension; near 0 if exempt' }, max: 40000, tone: 'consult' },
      { k: 'other', label: { ja: 'そのほか', en: 'Other' }, hint: { ja: '日用品・服・病院・友だち・貯金', en: 'Daily goods, clothes, doctor, friends, savings' }, max: 80000, tone: 'neutral' }
    ],
    incomes: [
      { k: 'income', label: { ja: '給料・バイト代（手取り）', en: 'Take-home pay' }, hint: { ja: '税金や保険を引いたあとの金額', en: 'After tax and insurance' }, max: 400000, lesson: 'tedori' },
      { k: 'scholarship', label: { ja: '奨学金・仕送りなど', en: 'Scholarship / other support' }, max: 200000 }
    ],
    /* optional support from 自立支援資金貸付 (see program jiritsu-shikin: 生活費 月5万円 for students, 家賃 up to a local cap) */
    shienAmount: 50000,
    shienId: 'jiritsu-shikin',
    lessons: ['seikatsuhi', 'tedori', 'komattara'],
    note: { ja: '目安の数字は、ひとり暮らしの「ざっくり」の金額です。実際は人によって大きくちがいます。自分の数字に変えて使ってください。', en: 'The presets are rough numbers for living alone. Change them to your own.' }
  };

  /* ===================================================================== money simulator: おこづかい・バイト
   * For 中学生 and 高校生. Example numbers only (not statistics) — the reader changes them.
   * Facts used: 中学生は原則アルバイトできない（労働基準法・年少者）, 東京都の最低賃金 1,280円（2026年10月1日から）
   * — the same facts and sources as the まなぶ lesson jr-baito-zeikin (SM.data.learnFacts.minWageTokyo). */
  SM.data.simJr = {
    presets: {
      jhs: { label: { ja: '中学生', en: 'Junior high' }, allowance: 2000, gift: 2000, baito: 0, snack: 1500, phone: 0, trans: 0, fun: 1000, school: 500, game: 500 },
      hs: { label: { ja: '高校生（バイトあり）', jr: '高校生（バイトあり）', en: 'High school (part-time job)' }, allowance: 3000, gift: 1500, baito: 40000, snack: 6000, phone: 3000, trans: 3000, fun: 8000, school: 2000, game: 2000 }
    },
    defaultPreset: 'jhs',
    defaults: {},
    incomes: [
      { k: 'allowance', label: { ja: 'おこづかい', en: 'Allowance' }, max: 20000, step: 500 },
      { k: 'gift', label: { ja: 'お年玉・お祝い（1か月分）', jr: 'お年玉・お祝い（1か月分）', en: 'Gifts (per month)' }, hint: { ja: '1年でもらう分を12で割った金額', jr: '1年でもらう分を、12でわった金額', en: 'A year’s total divided by 12' }, max: 20000, step: 500 },
      { k: 'baito', label: { ja: 'バイト代（高校生から）', en: 'Part-time pay (from high school)' }, hint: { ja: '中学生のあいだは、ふつうはアルバイトできません', jr: '中学生のあいだは、ふつうはバイトできません', en: 'Junior high students generally can’t work part-time' }, max: 150000, step: 1000, wageCalc: true }
    ],
    expenses: [
      { k: 'snack', label: { ja: '食べもの・おやつ', en: 'Snacks & food' }, short: { ja: '食べもの', en: 'Food' }, max: 30000, step: 500 },
      { k: 'phone', label: { ja: 'スマホ代（自分ではらう分）', jr: 'スマホ代（自分ではらう分）', en: 'Phone (your share)' }, short: { ja: 'スマホ代', en: 'Phone' }, max: 15000, step: 500 },
      { k: 'trans', label: { ja: '電車・バス', en: 'Train & bus' }, max: 20000, step: 500 },
      { k: 'fun', label: { ja: '服・遊び', en: 'Clothes & fun' }, max: 40000, step: 500 },
      { k: 'school', label: { ja: '本・学用品', en: 'Books & school things' }, max: 15000, step: 500 },
      { k: 'game', label: { ja: 'ゲーム・課金', en: 'Games & in-app' }, max: 20000, step: 500 }
    ],
    wage: { yen: 1280, from: '2026-10-01', hours: 4, days: 8 },   // 東京都の最低賃金（厚生労働省）
    goal: 30000,
    lessons: ['jr-baito-zeikin', 'jr-koko-okane', 'kyufu-kashitsuke'],
    programs: ['koko-kyufukin', 'tokyo-juken-challenge'],
    note: { ja: '数字は「例」です。自分の数字に変えて使ってください。', jr: '数字は「れい」です。自分の数字に変えてね。', en: 'These are example numbers. Change them to your own.' }
  };
  /* keep the wage in step with the まなぶ facts when they are loaded later */
  try {
    var mw = SM.data.learnFacts && SM.data.learnFacts.minWageTokyo;
    if (mw && mw.yen) { SM.data.simJr.wage.yen = mw.yen; SM.data.simJr.wage.from = mw.from || SM.data.simJr.wage.from; }
  } catch (e) { /* ignore */ }
})();
