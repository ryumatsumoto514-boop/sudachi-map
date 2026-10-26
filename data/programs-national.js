/* 巣立ちマップ v3 — 国の制度・全国で使える窓口 (owner: DATA-N; v2 owner A3)
 * Every record was checked on 2026-10-16 (v3 additions/re-checks: 2026-10-17, see src3) against the official/operator page in `source.url`.
 * Unconfirmed phone numbers, hours, amounts etc. are null on purpose — do not fill them in by guessing.
 * Tokyo-only and 区市町村 items live in programs-tokyo.js / programs-local.js.
 */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};
  SM.data.programs = SM.data.programs || [];

  var CHECKED = '2026-10-16';
  var BY = 'Economix JP';
  function src(org, url) { return { org: org, url: url, checked: CHECKED }; }
  // v3 (round 2): records added or re-checked for 中学生 support on 2026-10-17
  var CHECKED3 = '2026-10-17';
  function src3(org, url) { return { org: org, url: url, checked: CHECKED3 }; }
  var MEXT_SOS24 = 'https://www.mext.go.jp/a_menu/shotou/seitoshidou/06112216.html';
  var MEXT_SOSTEL = 'https://www.mext.go.jp/a_menu/shotou/seitoshidou/06112211.html';
  var MEXT_SOSSNS = 'https://www.mext.go.jp/a_menu/shotou/seitoshidou/06112212.html';

  var CFA_SHIKIN_PDF = 'https://www.cfa.go.jp/assets/contents/node/basic_page/field_ref_resources/40ecef9f-f018-4913-9ee7-ffa98da27c89/878c782e/20241030_policies_jidougyakutai_sogoshienjigyo_32.pdf';
  var CFA_MIMOTO_PDF = 'https://www.cfa.go.jp/assets/contents/node/basic_page/field_ref_resources/40ecef9f-f018-4913-9ee7-ffa98da27c89/d9decb1f/20241030_policies_jidougyakutai_sogoshienjigyo_13.pdf';
  var CFA_GUIDE_PDF = 'https://www.cfa.go.jp/assets/contents/node/basic_page/field_ref_resources/a23cc922-6f03-41a4-a39d-c7bdadaf7adf/454ec772/20250319_policies_shakaiteki-yougo_tsuuchi_53.pdf';
  var JASSO_GUIDE_PDF = 'https://www.jasso.go.jp/shogakukin/moshikomi/yoyaku/tebiki/__icsFiles/afieldfile/2026/03/17/r9kyufuannai_1.pdf';
  var MAMORO = 'https://www.mhlw.go.jp/mamorouyokokoro/soudan/tel/';

  SM.data.programs.push(

  /* ================= 社会的養護の経験がある人のための国の制度 ================= */

  {
    id: 'jiritsu-shikin',
    name: { ja: '自立支援資金貸付（児童養護施設退所者等）', en: 'Independence Support Loan for Care Leavers' },
    hook: { ja: '家賃や生活費、資格のお金が足りない', en: 'I need help with rent, living costs or a license' },
    summary: {
      ja: '施設や里親家庭を出た人が、利子なしで生活費・家賃・資格のお金を借りられます。決まった年数働き続けると、返さなくてよくなります。',
      en: 'Interest-free money for living costs, rent and job licenses for people who left care. If you keep working for a set number of years, you do not have to pay it back.'
    },
    cat: ['money', 'housing'],
    kind: 'loan_forgivable', basis: 'national', right: false,
    amount: {
      ja: '生活費 月5万円（進学する人）＋家賃（地域の上限まで）／資格のお金 25万円まで',
      en: 'Living costs ¥50,000/month (students) + rent (up to a local cap) / up to ¥250,000 for licenses'
    },
    repay: 'conditional',
    who: { ja: '児童養護施設・自立援助ホーム・里親家庭・ファミリーホームなどを出た人で、家族からお金の助けが見込めない人。生活費は大学・専門学校などに通う人、家賃は進学する人と働く人が対象。資格のお金は施設などにいる間でも使えます。' },
    how: { ja: '住んでいる都道府県の窓口（多くは社会福祉協議会）に申し込みます。施設・里親・自立援助ホームの職員と一緒に準備するとスムーズです。施設などを出てから5年以内なら申し込めます。' },
    where: { ja: '都道府県の社会福祉協議会など（いた施設や児童相談所でも教えてくれます）' },
    docs: ['申込書（窓口の用紙）', '本人確認書類', '学校や仕事がわかる書類（在学証明書・内定通知など）', '家の契約書のコピー（家賃の支援を受けるとき）'],
    ask: ['私は対象になりますか？（いつ、どこを出たか・進学か就職かを伝える）', '返さなくてよくなる条件を、紙で見せてもらえますか？', '保証人がいなくても借りられますか？', '申込みの締切と、お金が振り込まれる日はいつですか？'],
    caution: { ja: '学校をやめたり仕事をやめると契約が終わり、返すことになる場合があります。返さなくてよくなる条件（例：卒業後1年以内に就職して5年続ける）を必ず確認しましょう。' },
    supporter: { ja: '利子なし。連帯保証人は原則立てるが、なしでも貸付可。就職者の家賃支援は退所後2年まで。返還免除：進学者は卒業後1年以内に就職し5年継続、就職者は5年継続、資格取得は2年継続。各資金の申請は1回まで。退所時に不要でも退所後5年以内なら後から申請できる。延滞利子は年3.0%。' },
    effort: 'high',
    for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: ['facility', 'foster', 'jhome', 'other'], careOnly: true, age: { min: 15, max: null }, areas: [] },
    deadline: { ja: '施設などを出てから5年以内なら申し込めます。進学する人は入学の前から相談しておくと安心。', en: 'You can apply within 5 years of leaving care. Students should ask before school starts.', leaveMonths: -4, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://irisconnect.jp/system/support-services', hours: null },
    locations: [],
    source: src('こども家庭庁（実施要綱）', CFA_SHIKIN_PDF),
    sources2: [{ org: 'Iris（こども家庭庁補助事業）', url: 'https://irisconnect.jp/system/support-services' }],
    verifiedBy: BY
  },

  {
    id: 'mimoto-hosho',
    name: { ja: '身元保証人確保対策事業', en: 'Guarantor Support Program' },
    hook: { ja: '部屋や仕事の「保証人」がいない', en: 'I have no one to be my guarantor' },
    summary: {
      ja: '家を借りる・働く・進学するときに、施設長や里親などが保証人になれるよう、国の仕組みで保険をかけます。',
      en: 'When you rent, get a job or enter school, your former facility head or foster parent can be your guarantor, backed by national insurance.'
    },
    cat: ['housing', 'work', 'education'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '施設・里親家庭・自立援助ホーム・一時保護などにいる人、または出てから5年以内の人で、親などに保証人を頼めない人。' },
    how: { ja: 'いた施設の職員・里親・児童相談所に「身元保証人確保対策事業を使いたい」と相談します。施設長などが保証人になり、全国社会福祉協議会が保険をかけます。' },
    where: { ja: 'いた施設・里親・児童相談所（運営は全国社会福祉協議会）' },
    docs: ['保証人の欄がある書類（部屋の契約書・会社や学校の書類）'],
    ask: ['この契約で、身元保証人確保対策事業を使って保証人になってもらえますか？', '保証はいつまで続きますか？', 'この部屋の不動産会社は、保証会社も必要と言っています。どうしたらいいですか？'],
    caution: { ja: '保証の期間には限りがあります（部屋は原則3年・最長4年、仕事は原則3年・最長5年、学校は卒業まで）。不動産会社によっては保証会社も求められるので、契約の前に確認しましょう。' },
    supporter: { ja: '対象理由：父母等の死亡・行方不明・拘留、心身の障害、経済的困窮、虐待やDV等で保証人が不適当。保証人になれるのは施設長・里親・ファミリーホーム養育者・児相所長・自立援助ホーム設置者など。申込書と「利用の手引」は全社協サイトにある。' },
    effort: 'mid',
    for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: ['facility', 'foster', 'jhome', 'other'], careOnly: true, age: { min: 15, max: null }, areas: [] },
    deadline: { ja: '施設などを出てから5年以内に申し込みます。部屋や仕事の契約の前に相談を。', en: 'Apply within 5 years of leaving care, before you sign a contract.', leaveMonths: -3, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.shakyo.or.jp/download/mimoto/index.html', hours: null },
    locations: [],
    source: src('こども家庭庁（実施要綱）', CFA_MIMOTO_PDF),
    sources2: [{ org: '全国社会福祉協議会', url: 'https://www.shakyo.or.jp/download/mimoto/index.html' }],
    verifiedBy: BY
  },

  {
    id: 'sochi-encho',
    name: { ja: '措置延長（18歳を過ぎても今の家にいる）', en: 'Staying in Care After 18' },
    hook: { ja: '18歳で出るのは、まだ不安', en: 'I am not ready to leave at 18' },
    summary: {
      ja: '施設や里親家庭には、20歳になるまで続けていられる仕組みがあります。進学しても、働いていても、希望を伝えてかまいません。20歳をすぎても、同じ施設や里親家庭で『児童自立生活援助』として暮らし続けられる場合があります（2024年4月から）。',
      en: 'You can stay in your facility or foster home until age 20. You may ask for this whether you study or work. Since April 2024 you may also be able to stay in the same facility or foster home after 20 under the self-reliance living support scheme.'
    },
    cat: ['housing'],
    kind: 'housing', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '児童養護施設・里親家庭・ファミリーホームなどで暮らす人。学校が続くか不安な人、働きはじめたけれど不安な人なども含みます。' },
    how: { ja: '担当の職員や里親、児童相談所に「措置延長をしたい」と伝えます。18歳を過ぎていれば、親の同意はいりません。' },
    where: { ja: '担当の職員・里親・児童相談所' },
    docs: [],
    ask: ['20歳まで、ここにいることはできますか？', '措置延長をしたら、退所のときの支援（自立支援資金など）はどうなりますか？', '20歳を過ぎたあとは、どんな選択肢がありますか？'],
    caution: { ja: '決めるのは児童相談所です。早めに希望を伝えて、話し合いの時間をとってもらいましょう。' },
    supporter: { ja: '児童福祉法31条2項。国のガイドラインは、高校卒業・進学・就職で慣習的に解除せず、本人が希望すれば積極的に活用すべきとしている。18歳以上は保護者の同意不要（本人の意に反しない限り継続可）。' },
    effort: 'low',
    for: { stages: ['hs12', 'hs3'], paths: [], care: ['facility', 'foster'], careOnly: true, age: { min: 15, max: 22 }, areas: [] },
    deadline: { ja: '高3になる前から、担当の人と話しはじめると安心です。', en: 'Start talking with your caseworker before your last year of high school.', leaveMonths: -12, months: null, always: false },
    contact: null,
    locations: [],
    source: src('こども家庭庁「社会的養護経験者等への支援に関するガイドライン」', CFA_GUIDE_PDF),
    verifiedBy: BY
  },

  {
    id: 'jiritsu-enjo',
    name: { ja: '自立援助ホーム（児童自立生活援助事業）', en: 'Independent Living Support Homes' },
    hook: { ja: '安心して住める場所と、相談できる大人がほしい', en: 'I need a safe place to live and an adult to talk to' },
    summary: {
      ja: '職員と一緒に暮らしながら、仕事や生活のことを相談できる住まいです。2024年から年齢で一律に終わることがなくなりました。',
      en: 'A home where you live with staff and get help with work and daily life. Since 2024 there is no fixed age limit.'
    },
    cat: ['housing', 'consult'],
    kind: 'housing', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '中学を卒業した20歳未満で、施設や里親家庭を出た人や、一時保護を解除された人など。20歳以上でも、施設などを出た人で事情がある場合は使えることがあります。' },
    how: { ja: '児童相談所に「自立援助ホームを使いたい」と相談します。ホームの職員が申込みを手伝ってくれることもあります。施設や里親家庭がそのまま支援の場所になる型もあります。' },
    where: { ja: '児童相談所（都道府県）' },
    docs: ['申込書（児童相談所・ホームで案内）'],
    ask: ['空いているホームはありますか？', '食費や家賃など、毎月いくらかかりますか？', '仕事が決まっていなくても入れますか？', 'いつまでいられますか？'],
    caution: { ja: '食費や住む費用の一部を払うことがあります。空きが少ない地域もあるので、ほかの方法も並行して考えましょう。' },
    supporter: { ja: '2024年4月施行の改正児童福祉法で、実施場所が自立援助ホーム以外（施設・里親等）にも広がり、従来の「22歳の年度末」の一律年齢制限が弾力化。20歳以上は措置解除者等でやむを得ない事情があり都道府県が必要と認めた者。申込書は都道府県に提出（事業者が代行可）。' },
    effort: 'mid',
    for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 15, max: null }, areas: [] },
    deadline: { ja: 'いつでも相談できます。', en: 'You can ask any time.', leaveMonths: -3, months: null, always: true },
    contact: null,
    locations: [],
    source: src('こども家庭庁「社会的養護経験者等への支援に関するガイドライン」', CFA_GUIDE_PDF),
    verifiedBy: BY
  },

  {
    id: 'yogo-kyoten',
    name: { ja: '社会的養護自立支援拠点（アフターケアの居場所）', en: 'Care Leaver Support Hubs' },
    hook: { ja: '出たあとも、気軽に寄れる場所がほしい', en: 'I want a place to drop by after leaving care' },
    summary: {
      ja: '施設や里親家庭を出た人などが集まれる場所です。暮らし・仕事・お金の相談、役所への付き添い、困ったときの一時的な住まいの支援もあります。',
      en: 'A drop-in place for people who left care. Help with life, work and money, someone to go with you to offices, and short-term housing help.'
    },
    cat: ['consult', 'housing'],
    kind: 'place', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '施設・里親家庭・自立援助ホームを出た人、一時保護を受けたことがある人、虐待を経験したのに支援につながれなかった人など。年齢の上限はありません。' },
    how: { ja: '住んでいる都道府県の拠点に連絡します。場所がわからなければ、いた施設や児童相談所に聞けば教えてくれます。' },
    where: { ja: '都道府県が決めた拠点（NPOなどが運営）' },
    docs: [],
    ask: ['どんなことを手伝ってもらえますか？', '役所や病院に一緒に来てもらえますか？', '住む場所がなくなりそうなとき、泊まれるところはありますか？'],
    caution: { ja: '拠点の名前は地域ごとに違います。「アフターケア」「自立支援拠点」で探すか、施設・児童相談所に聞きましょう。' },
    supporter: { ja: '2024年4月施行の改正児童福祉法で創設。相互交流の場、生活・就労相談、関係機関との調整、住居を失った場合の一時的な滞在支援などを行う。支援コーディネーター・生活相談支援員・就労相談支援員を配置。退所前から利用できる事業もある。' },
    effort: 'low',
    for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: ['facility', 'foster', 'jhome', 'other'], careOnly: true, age: { min: 15, max: null }, areas: [] },
    deadline: { ja: 'いつでも。出る前に一度行ってみると、あとで頼りやすくなります。', en: 'Any time. Visit once before you leave so it is easier to come back later.', leaveMonths: -2, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://irisconnect.jp/system/after-care', hours: null },
    locations: [],
    source: src('こども家庭庁「社会的養護経験者等への支援に関するガイドライン」', CFA_GUIDE_PDF),
    sources2: [{ org: 'Iris（こども家庭庁補助事業）', url: 'https://irisconnect.jp/system/after-care' }],
    verifiedBy: BY
  },

  {
    id: 'iris-site',
    name: { ja: 'Iris（社会的養護経験者向け情報サイト）', en: 'Iris — Info Site for Care Leavers' },
    hook: { ja: '同じ経験をした人の声を読みたい', en: 'I want to hear from people with the same experience' },
    summary: {
      ja: '社会的養護を経験したメンバーが中心になってつくる、こども家庭庁の補助を受けたサイトです。相談先・制度・先輩の声がふりがなつきで読めます。',
      en: 'A site made mainly by care-experienced people, funded by the Children and Families Agency. Help lines, programs and real stories, with furigana.'
    },
    cat: ['consult'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '施設・里親家庭などで暮らしている人、暮らしたことがある人、まわりの大人。' },
    how: { ja: 'サイトを開くだけ。登録はいりません。' },
    where: { ja: 'インターネット' },
    docs: [],
    ask: ['（読むだけでOK）気になった制度は、職員や窓口に「Irisで見た」と伝えてみよう'],
    caution: null,
    supporter: { ja: 'こども家庭庁「社会的養護経験者等ネットワーク形成事業」の補助で運営。制度一覧（自立支援資金・身元保証・アフターケア等）は本人に見せる資料として使いやすい。' },
    effort: 'low',
    for: { stages: [], paths: [], care: ['facility', 'foster', 'jhome', 'other'], careOnly: true, age: null, areas: [] },
    deadline: null,
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://irisconnect.jp/', hours: null },
    locations: [],
    source: src('Iris（こども家庭庁補助事業）', 'https://irisconnect.jp/about-iris/'),
    sources2: [{ org: 'こども家庭庁', url: 'https://www.cfa.go.jp/policies/shakaiteki-yougo' }],
    verifiedBy: BY
  },

  /* ================= 進学 ================= */

  {
    id: 'jasso-kyufu',
    name: { ja: 'JASSO 給付奨学金（返さなくていい奨学金）', en: 'JASSO Grant Scholarship (no repayment)' },
    hook: { ja: '大学や専門学校に行きたいけど、お金が心配', en: 'I want to go to college but worry about money' },
    summary: {
      ja: '国の奨学金で、返す必要がありません。施設や里親家庭にいた人は「ひとり家族」として審査され、いちばん手厚い区分になりやすいです。',
      en: 'A national scholarship you never pay back. People from care are assessed as a one-person household, so they often get the highest level.'
    },
    cat: ['education', 'money'],
    kind: 'grant', basis: 'national', right: false,
    amount: {
      ja: '月 最大75,800円（私立・ひとり暮らし・第Ⅰ区分）／国公立なら66,700円',
      en: 'Up to ¥75,800/month (private, living away, top level) / ¥66,700 at public schools'
    },
    repay: 'none',
    who: { ja: '大学・短大・専門学校・高専（4年生から）に進む人。18歳になる前の日に、施設・自立援助ホーム・里親・ファミリーホームにいた人は「社会的養護を必要とする人」として申し込めます。' },
    how: { ja: '高3のとき、高校からIDとパスワードをもらい、スカラネットで申し込んでマイナンバーを出します。あとでJASSOから案内が来たら、施設などにいたことの証明書を送ります。授業料・入学金の減免も同時に申し込みます。' },
    where: { ja: '今の高校（進学後は進学先の奨学金窓口）' },
    docs: ['マイナンバーがわかる書類', '奨学金確認書兼地方税同意書', '本人確認書類', '施設の在籍証明書や児童（里親）委託証明書（案内が来たら）'],
    ask: ['「社会的養護を必要とする人」として申し込みたいです。何が必要ですか？', '学校の締切はいつですか？', 'ひとり暮らしで家賃を払うので「自宅外通学」で申請できますか？'],
    caution: { ja: 'お金が入るのは進学したあとです。入学金など、入学前に払うお金には使えません。施設から通うと「自宅通学」の低い金額になります。家賃を払って通うなら「自宅外通学」を選び、契約書などの証明を出しましょう。' },
    supporter: { ja: '社会的養護を必要とする人は1人世帯（本人が生計維持者）として判定。カッコ内の減額月額は「施設等から通学し自宅通学扱い」の場合。独立生計者が家賃を払って通学する場合は距離にかかわらず自宅外申請可（進学後に証明書類）。第一種奨学金と併用すると貸与額が0円になる場合あり。家計基準は毎年10月に見直し。' },
    effort: 'mid',
    for: { stages: ['hs12', 'hs3', 'left0', 'left1', 'nohs'], paths: ['study', 'unsure'], care: [], careOnly: false, age: { min: 15, max: 30 }, areas: [] },
    deadline: { ja: '高3のとき（進学の前の年）に高校を通じて申し込みます。締切は学校ごとに違うので、先生に早めに聞きましょう。進学後も学校で春と秋に申し込めます。', en: 'Apply through your high school in your final year. Deadlines differ by school. You can also apply after entering college (spring/fall).', leaveMonths: -10, months: null, always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.jasso.go.jp/shogakukin/moshikomi/yoyaku/houhou.html', hours: null },
    locations: [],
    source: src('日本学生支援機構（JASSO）給付奨学金案内（2027年度予約採用）', JASSO_GUIDE_PDF),
    sources2: [{ org: '日本学生支援機構（JASSO）', url: 'https://www.jasso.go.jp/shogakukin/moshikomi/yoyaku/houhou.html' }],
    verifiedBy: BY
  },

  {
    id: 'jasso-genmen',
    name: { ja: '授業料・入学金の減免（高等教育の修学支援新制度）', en: 'Tuition and Entrance Fee Reduction' },
    hook: { ja: '学費が高くて進学をあきらめそう', en: 'Tuition is too expensive' },
    summary: {
      ja: '給付奨学金と一緒に申し込むと、大学や専門学校の授業料と入学金が安くなったり、0円になったりします。',
      en: 'Apply together with the JASSO grant to have college tuition and entrance fees reduced or waived.'
    },
    cat: ['education', 'money'],
    kind: 'grant', basis: 'national', right: false,
    amount: {
      ja: '私立大学なら 授業料 年70万円・入学金26万円まで／国公立大学なら 年54万円・28万円まで',
      en: 'Private university: up to ¥700,000/yr tuition + ¥260,000 entrance fee / public: ¥540,000 + ¥280,000'
    },
    repay: 'none',
    who: { ja: '給付奨学金の対象になった人（国や自治体が認めた大学・短大・専門学校・高専に通う人）。' },
    how: { ja: '高校で給付奨学金を申し込むときに、同時に申し込みます。進学後、進学先の学校で減免の手続きをします。' },
    where: { ja: '今の高校 → 進学先の学校' },
    docs: ['給付奨学金の書類と同じ', '進学後に学校が指定する申請書'],
    ask: ['入学金を入学前に払わないといけませんか？待ってもらえる制度はありますか？', '減免の申請は、入学後いつまでですか？'],
    caution: { ja: '減免は入学したあとに行われます。入学前に入学金などを一度払う必要がある学校もあります。入学後に入学金の減免を申し込むときは、入学から3か月以内に学校で手続きを。' },
    supporter: { ja: '上限額（年額）：大学 国公立 入学金28万・授業料54万／私立 26万・70万、短大 国公立17万・39万／私立25万・62万、専門学校 国公立7万・17万／私立16万・59万。入学金の納付猶予制度がある学校もあるので出願前に確認。' },
    effort: 'mid',
    for: { stages: ['hs12', 'hs3', 'left0', 'left1', 'nohs'], paths: ['study', 'unsure'], care: [], careOnly: false, age: { min: 15, max: 30 }, areas: [] },
    deadline: { ja: '給付奨学金と同じ（高3のとき、学校の締切まで）。', en: 'Same as the JASSO grant (in your last year of high school).', leaveMonths: -10, months: null, always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.jasso.go.jp/shogakukin/moshikomi/yoyaku/houhou.html', hours: null },
    locations: [],
    source: src('日本学生支援機構（JASSO）給付奨学金案内（2027年度予約採用）', JASSO_GUIDE_PDF),
    verifiedBy: BY
  },

  {
    id: 'jasso-juken',
    name: { ja: '児童養護施設等の生徒への受験料等支援（JASSO）', en: 'Exam Fee Support for Students in Care' },
    hook: { ja: '受験料が高くて、何校も受けられない', en: 'Exam fees are too high to apply to several schools' },
    summary: {
      ja: '施設や里親家庭にいる人が大学などを受けるとき、受験のためのお金として20万円が受け取れます。返す必要はありません。',
      en: 'Students in care get ¥200,000 for college entrance exam costs. No repayment.'
    },
    cat: ['education', 'money'],
    kind: 'grant', basis: 'national', right: false,
    amount: { ja: '1人20万円', en: '¥200,000 per person' },
    repay: 'none',
    who: { ja: '施設・自立援助ホーム・里親・ファミリーホームに今いる人で、高校を卒業する予定（または卒業して2年以内）か高卒認定に合格した人。大学・短大・専門学校などを受験し、就職の内定がないこと。' },
    how: { ja: '今いる施設や里親を通して申し込みます。職員や里親に「受験料等支援を使いたい」と伝えましょう。' },
    where: { ja: '今いる施設・里親（申込先はJASSO）' },
    docs: ['申請書・支援対象者一覧（施設などが作ります）', '受験票のコピー（受験後に施設へ）'],
    ask: ['受験料等支援に申し込んでもらえますか？', 'お金はいつごろ受け取れますか？'],
    caution: { ja: '受験を全部やめた場合は、お金を返すことになります。' },
    supporter: { ja: '寄附金事業。令和8年度は2026年7月1日〜2027年2月26日（消印有効）に施設長・養育者が申請。受付期間内なら受験後でも申請可。職業能力開発校は対象外。外国籍の生徒は在留資格の要件あり。' },
    effort: 'low',
    for: { stages: ['hs3', 'left0'], paths: ['study'], care: ['facility', 'foster', 'jhome'], careOnly: true, age: { min: 15, max: null }, areas: [] },
    deadline: { ja: '2026年7月1日〜2027年2月26日（施設などが申し込みます。受験のあとでも期間内ならOK）', en: 'Jul 1, 2026 – Feb 26, 2027 (your facility applies; OK even after the exam).', leaveMonths: -8, months: [7, 8, 9, 10, 11, 12, 1, 2], always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.jasso.go.jp/kihukin/j_shien/index.html', hours: null },
    locations: [],
    source: src('日本学生支援機構（JASSO）', 'https://www.jasso.go.jp/kihukin/j_shien/index.html'),
    verifiedBy: BY
  },

  {
    id: 'koko-shugaku',
    name: { ja: '高等学校等就学支援金（高校の授業料）', en: 'High School Tuition Support' },
    hook: { ja: '高校の授業料が払えるか不安', jr: '高校の授業料（学校にはらうお金）が心配', en: 'I worry about paying high school tuition' },
    summary: {
      ja: '高校の授業料を国が支援します。2026年度から、家の収入に関係なく使えるようになりました。返す必要はありません。',
      jr: '高校の授業料は、国が出してくれます。2026年度から、家の収入に関係なく使えます。返さなくていいお金です。',
      en: 'The government pays high school tuition. From 2026 there is no income limit. No repayment.'
    },
    cat: ['education', 'money'],
    kind: 'grant', basis: 'national', right: true,
    amount: { ja: '公立高校 年11万8,800円／私立高校（全日制）年45万7,200円まで', en: 'Public: ¥118,800/yr / Private (full-time): up to ¥457,200/yr' },
    repay: 'none',
    who: { ja: '日本に住んでいて、高校（全日制・定時制・通信制）・高専（1〜3年）・専修学校高等課程などに通う人。日本国籍でない人は、在留資格などの条件があります。' },
    how: { ja: '学校の案内にそってオンラインで申請します（都立高校は東京都のシステム、私立高校などはe-Shien）。' },
    where: { ja: '通っている高校' },
    docs: ['学校から配られるログインの通知書（都立は「システム利用開始情報通知書」）'],
    ask: ['自分の就学支援金は申請されていますか？', '退所して住所が変わったら、何か手続きがいりますか？'],
    caution: { ja: '申請しないと支援されません。決まるまでの間、いったん授業料を払って、あとで戻ってくる学校もあります。この制度の対象にならない人にも、別の授業料の支援（高校生等・新修学支援金など）があります。中3のうちに知っておくと、高校選びで安心です。' },
    supporter: { ja: '令和8年度から所得制限撤廃（改正法 令和8年3月31日成立・4月1日施行）。支給上限年額の例：公立全日制11万8,800円、私立全日制45万7,200円、私立通信制33万7,200円。新制度の対象外（在留資格等）でも、年収約910万円未満なら「高校生等・新修学支援金」で年39万6,000円まで支援。高校中退後に再入学・通信制へ移る場合も対象になりうるので学校に確認。授業料以外は「高校生等奨学給付金」を別途申請。' },
    effort: 'low',
    for: { stages: ['jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: { ja: '入学したときに申請します（2026年度は在校生もふくめ全員）。その後も学校から案内があれば手続きします。', en: 'Apply when you start school (in FY2026, every student, including current ones). After that, follow any instructions your school sends.', leaveMonths: null, months: null, always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.mext.go.jp/a_menu/shotou/mushouka/index.htm', hours: null },
    locations: [],
    source: src3('文部科学省', 'https://www.mext.go.jp/a_menu/shotou/mushouka/index.htm'),
    sources2: [{ org: '文部科学省（新制度リーフレット・日本国籍の方用）', url: 'https://www.mext.go.jp/content/20260616-mxt_shuukyo03-100002595_2.pdf' }, { org: '文部科学省（新制度の対象外となる生徒への支援）', url: 'https://www.mext.go.jp/content/20260616-mxt_shuukyo03-100002595_5.pdf' }, { org: '東京都教育委員会（都立高校の各種支援制度のオンライン申請）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/starting_application_online' }],
    verifiedBy: BY
  },

  {
    id: 'koko-kyufukin',
    name: { ja: '高校生等奨学給付金（教科書代など）', en: 'High School Scholarship Benefit' },
    hook: { ja: '教科書や教材、制服のお金が足りない', jr: '高校の教科書や教材のお金が心配', en: 'I cannot afford textbooks and supplies' },
    summary: {
      ja: '授業料以外の教科書代・教材費などを支援する、返さなくていいお金です。2026年度から対象の世帯が広がりました。',
      jr: '高校の教科書代などに使える、返さなくていいお金です。家の収入によって、もらえるかどうかが決まります。',
      en: 'Money for textbooks and other school costs besides tuition. No repayment. More households qualify from 2026.'
    },
    cat: ['education', 'money'],
    kind: 'grant', basis: 'national', right: false,
    amount: { ja: '年14万3,700円（国公立）／15万2,000円（私立）：全日制で、住民税が非課税の世帯の場合（2026年度）', en: '¥143,700/yr (public) / ¥152,000/yr (private): full-time, tax-exempt household (FY2026)' },
    repay: 'none',
    who: { ja: '高校などに通う人のうち、生活保護の世帯や住民税が非課税の世帯など（2026年度から年収の目安490万円未満まで広がりました）。' },
    how: { ja: '住んでいる都道府県か、通っている学校に申し込みます。授業料の就学支援金とは別に申込みが必要です。' },
    where: { ja: '通っている高校・都道府県の担当' },
    docs: ['都道府県・学校が配る申請書'],
    ask: ['奨学給付金の申込みはいつまでですか？', '自分の世帯は対象になりますか？'],
    caution: { ja: '都道府県によってやり方が違います。新入生は4〜6月に一部を早くもらえる申請ができます。' },
    supporter: { ja: '国の補助による都道府県事業。令和8年度給付額（全日制等・年額）：非課税世帯 国公立14万3,700円・私立15万2,000円／年収270〜380万円 国公立4万7,900円・私立5万670円／年収380〜490万円 国公立3万5,930円・私立3万8,000円。生活保護世帯 国公立3万2,300円・私立5万2,600円。国籍・在留資格で対象世帯の範囲が異なる。家計急変も対象（7月1日までの申請で年額）。施設入所中・退所後で世帯の扱いが変わるため、学校と都道府県に確認を。' },
    effort: 'mid',
    for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: { ja: '学校や都道府県が決めた時期に申し込みます。新入生は4〜6月に早めの申請ができます。', en: 'Apply when your school or prefecture says; new students can apply early in Apr–Jun.', leaveMonths: null, months: [4, 5, 6], always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.mext.go.jp/a_menu/shotou/mushouka/index.htm', hours: null },
    locations: [],
    source: src3('文部科学省（高校生等奨学給付金リーフレット）', 'https://www.mext.go.jp/content/20260616-mxt_shuukyo03-100002595_18.pdf'),
    sources2: [{ org: '文部科学省', url: 'https://www.mext.go.jp/a_menu/shotou/mushouka/index.htm' }],
    verifiedBy: BY
  },

  {
    id: 'yume-shogaku',
    name: { ja: '日本財団 夢の奨学金', en: 'Nippon Foundation Dream Scholarship' },
    hook: { ja: '学費だけでなく、生活費や住まいも心配', en: 'I need help with living costs, not just tuition' },
    summary: {
      ja: '社会的養護を経験した18〜30歳の人のための、返さなくていい奨学金です。学費の全額と生活費、ソーシャルワーカーの伴走があります。',
      en: 'A no-repay scholarship for care-experienced people aged 18–30: full tuition, living costs, and a social worker by your side.'
    },
    cat: ['education', 'money'],
    kind: 'grant', basis: 'npo', right: false,
    amount: {
      ja: '入学金・授業料の全額＋生活費・住居費 月10万円（修学支援新制度の対象の人は月3万円）＋転居費30万円・教材費 年12万円',
      en: 'Full tuition + ¥100,000/month living costs (¥30,000 if you get the national grant) + ¥300,000 moving + ¥120,000/yr books'
    },
    repay: 'none',
    who: { ja: '日本で社会的養護（施設・里親家庭など）を経験した18〜30歳の人（4月1日時点）。大学・短大・専門学校・高専（4年生から）・大学院に通う人、通う予定の人。' },
    how: { ja: '毎年6月ごろ、オンライン（Googleフォーム）で申し込みます。申請書は本人の手書き。書類と面接で選ばれます。' },
    where: { ja: '日本財団 夢の奨学金 事務局' },
    docs: ['申請書（本人が手書き、PDFで提出）'],
    ask: ['次の募集はいつからですか？', 'JASSOの給付奨学金と一緒に使えますか？', 'すでに大学に通っていても応募できますか？'],
    caution: { ja: '採用は毎年20名前後で、選考があります。2027年度分の募集（2026年6月）は終わりました。次の募集に向けて早めに準備を。' },
    supporter: { ja: '修学支援新制度の対象者は、授業料等は制度支給額を除いた額、生活費住居費は月3万円。支援期間は正規の最短修業年限（在学中の応募は支給開始以降のみ）。毎年継続審査あり。事務局：社会福祉法人大阪児童福祉事業協会アフターケア事業部。' },
    effort: 'high',
    for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: ['study'], care: ['facility', 'foster', 'jhome', 'other'], careOnly: true, age: { min: 17, max: 30 }, areas: [] },
    deadline: { ja: '毎年6月ごろに募集（2027年度分は2026年6月1日〜30日・終了）。', en: 'Applications open around June each year (the 2027 round closed Jun 30, 2026).', leaveMonths: -10, months: [6], always: false },
    contact: { phone: '06-6765-3400', phoneLabel: '夢の奨学金 事務局', line: null, chat: null, web: 'https://dreamscholarship.jp/guideline/index.html', hours: null },
    locations: [],
    source: src('日本財団 夢の奨学金', 'https://dreamscholarship.jp/guideline/index.html'),
    verifiedBy: BY
  },

  /* ================= お金・住まい ================= */

  {
    id: 'jukyo-kakuho',
    name: { ja: '住居確保給付金', en: 'Housing Security Benefit' },
    hook: { ja: '仕事がなくなって、家賃が払えない', en: 'I lost my job and cannot pay rent' },
    summary: {
      ja: '仕事をやめたり収入が減って家賃が払えないとき、家賃の分を役所が大家さんに直接払ってくれます。返す必要はありません。',
      en: 'If you lost your job or income and cannot pay rent, the city pays your rent directly to the landlord. No repayment.'
    },
    cat: ['housing', 'money'],
    kind: 'grant', basis: 'national', right: true,
    amount: { ja: '家賃の額（上限あり。東京23区のひとり暮らしは月53,700円まで）', en: 'Your rent (capped; ¥53,700/month for one person in Tokyo 23 wards)' },
    repay: 'none',
    who: { ja: '仕事をやめて2年以内の人、または自分のせいではない理由で収入が大きく減った人で、収入と貯金が基準より少ない人。' },
    how: { ja: '住んでいる区市町村の「自立相談支援機関」に相談して申し込みます。ハローワークに登録して仕事をさがすことが条件です。' },
    where: { ja: '区市町村の自立相談支援機関（くらしの相談窓口）' },
    docs: ['本人確認書類', '仕事をやめた・収入が減ったことがわかる書類', '家の契約書', '通帳など貯金がわかるもの'],
    ask: ['私の収入と貯金で対象になりますか？', '申請してから、いつ家賃が払われますか？', '家賃の安い部屋に引っ越す費用の補助も使えますか？'],
    caution: { ja: '家賃をためる前に相談するのがいちばん大事です。支給は原則3か月（延長して最長9か月）。' },
    supporter: { ja: '収入要件：世帯収入が基準額（住民税均等割非課税額の1/12）＋家賃（住宅扶助額が上限）以下。資産：基準額の6倍（100万円上限）以下。支給は貸主へ直接振込。家計改善のための転居費用補助もある。' },
    effort: 'mid',
    for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 18, max: 99 }, areas: [] },
    deadline: { ja: 'いつでも。家賃が払えなくなりそうなら、すぐ相談を。', en: 'Any time — ask as soon as rent becomes hard.', leaveMonths: null, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://minna-tunagaru.jp/ichiran/', hours: null },
    locations: [],
    source: src('厚生労働省（住居確保給付金のご案内）', 'https://www.mhlw.go.jp/content/12600000/001436774.pdf'),
    sources2: [{ org: '厚生労働省 生活支援特設サイト', url: 'https://corona-support.mhlw.go.jp/jukyokakuhokyufukin/index.html' }],
    verifiedBy: BY
  },

  {
    id: 'jiritsu-sodan',
    name: { ja: '自立相談支援機関（くらしの困りごと相談）', en: 'Life Support Counseling Center' },
    hook: { ja: 'お金も仕事も住まいも、何から手をつければいいかわからない', en: 'Money, work, housing — I do not know where to start' },
    summary: {
      ja: '生活の困りごとをまとめて聞いて、あなた用の支援プランを一緒に作ってくれる無料の窓口です。家計の立て直しや仕事の準備も手伝います。',
      en: 'A free local office that listens to all your problems and makes a support plan with you, including budgeting and job preparation.'
    },
    cat: ['consult', 'money', 'housing'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '生活に困りごとや不安がある人なら誰でも。年齢は関係ありません。' },
    how: { ja: '住んでいる区市町村の窓口に電話するか、直接行きます。窓口の名前は地域で違います。' },
    where: { ja: '区市町村の自立相談支援機関（全国の一覧あり）' },
    docs: [],
    ask: ['初めてです。予約はいりますか？', '家賃が払えなくなりそうです。使える制度はありますか？', '家計を一緒に見てもらえますか？'],
    caution: { ja: '窓口の名前が「くらし・しごと相談センター」などバラバラです。全国の一覧から探しましょう。' },
    supporter: { ja: '生活困窮者自立支援法に基づく。住居確保給付金・就労準備支援・家計改善支援・就労訓練（中間的就労）などの入口。' },
    effort: 'low',
    for: { stages: ['left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: { ja: 'いつでも', en: 'Any time', leaveMonths: null, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://minna-tunagaru.jp/ichiran/', hours: null },
    locations: [],
    source: src('厚生労働省', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000059425.html'),
    verifiedBy: BY
  },

  {
    id: 'seikatsu-hogo',
    name: { ja: '生活保護', en: 'Public Assistance (Seikatsu Hogo)' },
    hook: { ja: '働いても、どうしても生活費が足りない', en: 'Even with work, I cannot cover basic living costs' },
    summary: {
      ja: '国が決めた最低限の生活費に足りない分が、毎月支給されます。家賃や医療費の支えもあります。申請は権利です。',
      en: 'You receive the gap between your income and the national minimum cost of living, plus rent and medical support. Applying is your right.'
    },
    cat: ['money', 'housing'],
    kind: 'grant', basis: 'national', right: true,
    amount: { ja: '国が決めた最低生活費から収入を引いた額（家賃は上限まで実費）', en: 'Minimum living cost minus your income (rent covered up to a cap)' },
    repay: 'none',
    who: { ja: '持っているお金や力を使っても、生活費が足りない人。18歳以上でひとり暮らしの人も申請できます。' },
    how: { ja: '住んでいる地域の福祉事務所（区役所・市役所の生活保護の担当）に行き、「生活保護を申請したい」とはっきり伝えます。' },
    where: { ja: '住んでいる地域の福祉事務所' },
    docs: ['申請書（窓口にあります）', '通帳のコピー', '給与明細など収入がわかるもの', '家の契約書'],
    ask: ['生活保護を申請します。申請書をください。', '施設にいたこと、家族に頼れない事情も聞いてください。', '決まるまで何日くらいかかりますか？'],
    caution: { ja: '窓口で「若いから働けるでしょう」と言われても、申請はできます。不安なら、支援団体や拠点の人に一緒に行ってもらいましょう。' },
    supporter: { ja: '申請書がなくても特別な事情があれば申請可（厚労省ページ）。申請後、資産・扶養義務者による扶養の可否などの調査がある。虐待等の事情は最初に申告し、扶養照会について相談する。同行支援が最も効果的。' },
    effort: 'high',
    for: { stages: ['left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 18, max: 99 }, areas: [] },
    deadline: { ja: 'いつでも。困ったその日に申請できます。', en: 'Any time — you can apply the day you need it.', leaveMonths: null, months: null, always: true },
    contact: null,
    locations: [],
    source: src('厚生労働省', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/seikatsuhogo/seikatuhogo/index.html'),
    sources2: [{ org: '内閣府 あなたはひとりじゃない（「国の制度を使うことは全ての人にとっての権利」）', url: 'https://notalone-cao.go.jp/' }],
    verifiedBy: BY
  },

  {
    id: 'seikatsu-fukushi',
    name: { ja: '生活福祉資金（緊急小口資金など）', en: 'Livelihood Welfare Loans' },
    hook: { ja: '今週だけ、どうしてもお金が足りない', en: 'I am short of money right now' },
    summary: {
      ja: '急にお金が足りなくなったとき、利子なしで少しのお金を借りられる国の貸付です。家を借りる費用などの貸付もあります。',
      en: 'Small interest-free emergency loans from the national system, plus loans for moving into housing and more.'
    },
    cat: ['money'],
    kind: 'loan', basis: 'national', right: false,
    amount: { ja: '緊急小口資金 10万円以内（利子なし・保証人なし）など', en: 'Emergency loan up to ¥100,000 (no interest, no guarantor), and more' },
    repay: 'yes',
    who: { ja: '収入が少ない世帯などで、急な出費などで生活が苦しくなった人。' },
    how: { ja: '住んでいる区市町村の社会福祉協議会に相談して申し込みます。審査があります。' },
    where: { ja: '区市町村の社会福祉協議会' },
    docs: ['本人確認書類', '収入がわかるもの', '何に使うかがわかるもの'],
    ask: ['返すのはいつからで、毎月いくらですか？', '今の収入で借りられますか？', '借りる前に、もらえる制度はありませんか？'],
    caution: { ja: '借金なので、返す必要があります。返す計画を一緒に立ててもらいましょう。もらえる制度（給付）を先に確認するのがおすすめです。' },
    supporter: { ja: '緊急小口：据置2か月以内・償還12か月以内。総合支援資金（単身 月15万円以内・原則3か月）、住宅入居費40万円以内、教育支援費（大学 月6.5万円以内・世帯内の連帯借受人が必要）など。保証人なしの場合は年1.5%の資金あり。' },
    effort: 'mid',
    for: { stages: ['left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 18, max: 99 }, areas: [] },
    deadline: { ja: 'いつでも', en: 'Any time', leaveMonths: null, months: null, always: true },
    contact: null,
    locations: [],
    source: src('厚生労働省（生活福祉資金貸付条件等一覧）', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/seikatsuhogo/seikatsu-fukushi-shikin1/kashitsukejoken.html'),
    sources2: [{ org: '全国社会福祉協議会', url: 'https://www.shakyo.or.jp/guide/shikin/index.html' }],
    verifiedBy: BY
  },

  {
    id: 'ur-chintai',
    name: { ja: 'UR賃貸住宅（保証人・礼金・仲介手数料なし）', en: 'UR Public Rental Housing' },
    hook: { ja: '保証人なしで、初めの費用をおさえて部屋を借りたい', en: 'I want to rent without a guarantor and with low move-in costs' },
    summary: {
      ja: '国の機関（UR都市機構）の賃貸住宅です。保証人・保証料・礼金・仲介手数料・更新料がいりません。',
      en: 'Rental homes run by a public agency. No guarantor, no guarantee fee, no key money, no agent fee, no renewal fee.'
    },
    cat: ['housing'],
    kind: 'housing', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '収入が基準以上ある人（ひとり暮らしで家賃6万2,500円未満なら、月収が家賃の4倍以上）。貯金が家賃の100倍以上ある人や、家賃を前払いする人も申し込めます。' },
    how: { ja: 'URの営業センターやサイトで部屋を探して申し込みます。' },
    where: { ja: 'UR賃貸住宅の営業センター' },
    docs: ['本人確認書類', '収入を証明する書類'],
    ask: ['私の収入で申し込める家賃はいくらまでですか？', '収入が足りないとき、ほかの申込み方法はありますか？'],
    caution: { ja: '収入の基準に届かないと申し込めないことがあります。家賃の前払い（一時払い）や貯金での申込みもあるので聞いてみましょう。' },
    supporter: { ja: '単身の基準月収：家賃62,500円未満は家賃の4倍、62,500円以上20万円未満は25万円。貯蓄基準は月額家賃の100倍。本人収入が基準の1/2以上あれば親族等の家賃補給で可などの特例あり。自立支援資金の家賃支援費と組み合わせを検討。' },
    effort: 'mid',
    for: { stages: ['hs3', 'left0', 'left1'], paths: ['work'], care: [], careOnly: false, age: { min: 18, max: 99 }, areas: [] },
    deadline: { ja: 'いつでも', en: 'Any time', leaveMonths: -3, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.ur-net.go.jp/chintai/rent/requirements/', hours: null },
    locations: [],
    source: src('UR都市機構（お申込み資格）', 'https://www.ur-net.go.jp/chintai/rent/requirements/'),
    sources2: [{ org: 'UR都市機構', url: 'https://www.ur-net.go.jp/chintai/whats/' }],
    verifiedBy: BY
  },

  /* ================= 仕事 ================= */

  {
    id: 'hellowork-wakamono',
    name: { ja: 'ハローワーク・わかものハローワーク', en: 'Hello Work & Youth Hello Work' },
    hook: { ja: '仕事をさがしたい・正社員になりたい', en: 'I want to find a job or become a full-time employee' },
    summary: {
      ja: '国の無料の仕事さがし窓口です。わかものハローワークでは、担当の人がついて、応募書類や面接の練習も手伝ってくれます。',
      en: 'Free national job centers. Youth Hello Work gives you a personal advisor and helps with résumés and interview practice.'
    },
    cat: ['work'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: 'ハローワークは誰でも使えます。わかものハローワークは、正社員をめざす若い人向け（東京は34歳以下）。' },
    how: { ja: '近くのハローワークに行って、求職の申込みをします。最初は相談だけでも大丈夫です。' },
    where: { ja: 'ハローワーク／わかものハローワーク（東京は渋谷・新宿・日暮里）' },
    docs: ['本人確認書類（求職の申込みをするとき）'],
    ask: ['担当の人をつけてもらえますか？', '寮や社宅がある求人はありますか？辞めたら寮はいつまでに出ますか？', 'お金をもらいながら職業訓練を受ける方法はありますか？'],
    caution: { ja: '寮つきの仕事は、辞めると住まいも失います。退職したあと何日で寮を出るのか、必ず確認しましょう。' },
    supporter: { ja: 'わかものハローワークは全国28か所（PDF時点）、おおむね45歳未満対象。東京の3か所は34歳以下。求職者支援制度・トライアル雇用などの入口。' },
    effort: 'low',
    for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 15, max: 34 }, areas: [] },
    deadline: { ja: 'いつでも', en: 'Any time', leaveMonths: -6, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/jakunen/wakamono/index.html', hours: null },
    locations: [
      { name: '渋谷わかものハローワーク', area: '13113', addr: '東京都渋谷区渋谷2-15-1 渋谷クロスタワー8階', lat: 35.659077, lng: 139.705292, phone: '03-3409-0328', hours: '平日 10:00–18:00（土日祝は休み）', note: '正社員をめざす34歳以下。JR渋谷駅から徒歩5分。' },
      { name: '新宿わかものハローワーク', area: '13104', addr: '東京都新宿区西新宿1-7-1 松岡セントラルビル9階', lat: 35.691826, lng: 139.698029, phone: '03-5909-8609', hours: '平日 10:00–18:00（土日祝は休み）', note: '34歳以下。JR新宿駅西口から徒歩3分。午前中がすいています。' }
    ],
    source: src('厚生労働省', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/jakunen/wakamono/index.html'),
    sources2: [
      { org: '東京労働局 渋谷わかものハローワーク', url: 'https://jsite.mhlw.go.jp/tokyo-hellowork/kyushokusha/shibuya_wakaharo/index.html' },
      { org: '東京労働局 新宿わかものハローワーク', url: 'https://jsite.mhlw.go.jp/tokyo-hellowork/kyushokusha/shinjuku_wakaharo/index.html' }
    ],
    verifiedBy: BY
  },

  {
    id: 'saposute',
    name: { ja: '地域若者サポートステーション（サポステ）', en: 'Youth Support Station' },
    hook: { ja: '働くことに自信がない。何から始めればいい？', en: 'I am not confident about working. Where do I start?' },
    summary: {
      ja: '働きはじめる前の「準備」から一緒にやってくれる、国の委託の無料窓口です。仕事が決まったあとも、続けられるよう支えてくれます。',
      en: 'A free government-funded center that helps you prepare to work, and supports you after you start a job.'
    },
    cat: ['work', 'consult'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '15〜49歳で、今は働いていない・学校に行っていない人。' },
    how: { ja: '近くのサポステを検索して、電話かメールで予約します。' },
    where: { ja: '全国のサポステ' },
    docs: [],
    ask: ['まず見学や話を聞くだけでもいいですか？', '職場体験はできますか？'],
    caution: { ja: '求人の紹介は少なめです。ハローワークと一緒に使うのがおすすめです。' },
    supporter: { ja: '厚労省委託事業。職場定着までの支援がある。' },
    effort: 'low',
    for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 15, max: 49 }, areas: [] },
    deadline: { ja: 'いつでも', en: 'Any time', leaveMonths: null, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://saposute-net.mhlw.go.jp/about.html', hours: null },
    locations: [],
    source: src('厚生労働省（サポステ）', 'https://saposute-net.mhlw.go.jp/about.html'),
    verifiedBy: BY
  },

  {
    id: 'kyushokusha-shien',
    name: { ja: '求職者支援制度（お金をもらいながら職業訓練）', en: 'Job Seeker Support System' },
    hook: { ja: '資格やスキルを身につけて、いい仕事につきたい', en: 'I want skills for a better job' },
    summary: {
      ja: '無料の職業訓練を受けながら、条件を満たせば月10万円の給付金が受け取れます。ハローワークが仕事さがしもサポートします。',
      en: 'Free job training, plus ¥100,000/month if you qualify. Hello Work supports your job search.'
    },
    cat: ['work', 'money'],
    kind: 'grant', basis: 'national', right: true,
    amount: { ja: '月10万円（職業訓練受講給付金）＋訓練は無料', en: '¥100,000/month + free training' },
    repay: 'none',
    who: { ja: '雇用保険を受け取れない人（雇用保険に入っていなかった人など）や、収入が少ないパートの人など。給付金は本人の収入が月8万円以下などの条件があります。' },
    how: { ja: 'ハローワークで相談し、求職の申込みをして訓練を選びます。' },
    where: { ja: 'ハローワーク' },
    docs: ['本人確認書類', '収入がわかるもの'],
    ask: ['私は給付金の対象になりますか？', 'どんな訓練コースがありますか？', '家賃が払えないとき、ほかに使える制度はありますか？'],
    caution: { ja: '給付金の条件に合わなくても、訓練だけは無料で受けられます。訓練を休むと給付金が出ないことがあります。' },
    supporter: { ja: '給付金要件：本人収入月8万円以下、世帯収入月30万円以下、世帯金融資産300万円以下など。過去6年以内に受給していないこと。' },
    effort: 'mid',
    for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 16, max: 99 }, areas: [] },
    deadline: { ja: '訓練コースごとに募集期間があります。', en: 'Each course has its own application period.', leaveMonths: null, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyushokusha_shien/index.html', hours: null },
    locations: [],
    source: src('厚生労働省', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyushokusha_shien/index.html'),
    verifiedBy: BY
  },

  {
    id: 'koyo-hoken',
    name: { ja: '雇用保険の基本手当（失業手当）', en: 'Unemployment Benefit' },
    hook: { ja: '仕事をやめた。次が決まるまでの生活費が不安', en: 'I quit my job and need money until the next one' },
    summary: {
      ja: '雇用保険に入って働いていた人が仕事をやめたとき、次の仕事をさがす間の生活費として受け取れます。',
      en: 'If you had employment insurance and lost your job, you get money while you look for the next one.'
    },
    cat: ['work', 'money'],
    kind: 'grant', basis: 'national', right: true,
    amount: { ja: 'やめる前の6か月の給料をもとに、1日あたり約50〜80%', en: 'About 50–80% of your previous daily wage' },
    repay: 'none',
    who: { ja: 'やめる前の2年間に、雇用保険に入っていた期間が12か月以上ある人（会社の都合でやめた人などは1年間に6か月以上）。働く気持ちがあって、すぐ働ける人。' },
    how: { ja: 'ハローワークで求職の申込みをして、会社からもらう「離職票」を出します。' },
    where: { ja: '住んでいる地域のハローワーク' },
    docs: ['離職票（会社からもらう）', '本人確認書類', 'マイナンバーがわかるもの', '通帳'],
    ask: ['私は基本手当をもらえますか？', 'いつから、何日分もらえますか？', '会社が離職票をくれません。どうすればいいですか？'],
    caution: { ja: '受け取れる期間は、原則やめた日の次の日から1年です。早めに手続きしましょう。' },
    supporter: { ja: '所定給付日数は90〜360日（年齢・加入期間・離職理由で決定）。特定受給資格者・特定理由離職者は手厚い場合あり。' },
    effort: 'mid',
    for: { stages: ['left0', 'left1', 'nohs'], paths: ['work'], care: [], careOnly: false, age: { min: 16, max: 99 }, areas: [] },
    deadline: { ja: '仕事をやめたら、なるべく早く（受給できる期間は原則1年）。', en: 'As soon as you leave your job (you have about 1 year).', leaveMonths: null, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.hellowork.mhlw.go.jp/insurance/insurance_basicbenefit.html', hours: null },
    locations: [],
    source: src('厚生労働省 ハローワークインターネットサービス', 'https://www.hellowork.mhlw.go.jp/insurance/insurance_basicbenefit.html'),
    verifiedBy: BY
  },

  {
    id: 'rodo-hotline',
    name: { ja: '労働条件相談ほっとライン', en: 'Working Conditions Hotline' },
    hook: { ja: '残業代が出ない・辞めさせてもらえない', en: 'Unpaid overtime, or they will not let me quit' },
    summary: {
      ja: '職場の困りごとを、平日の夜や土日にも無料で電話相談できます。名前を言わなくても大丈夫です。',
      en: 'Free phone advice about workplace problems on weekday evenings and weekends. You can stay anonymous.'
    },
    cat: ['work', 'consult'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '働いている人なら誰でも（アルバイトも）。' },
    how: { ja: '0120-811-610 に電話します。' },
    where: { ja: '電話' },
    docs: ['あれば：給与明細、シフト表、雇用契約書'],
    ask: ['これは法律違反ですか？', '証拠として、何を残しておけばいいですか？'],
    caution: { ja: 'ここから会社に指導はできません。必要なら労働基準監督署などを紹介してくれます。' },
    supporter: { ja: '厚労省委託事業。日本語のほか13言語に対応。通話は録音される。' },
    effort: 'low',
    for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: ['work'], care: [], careOnly: false, age: { min: 15, max: null }, areas: [] },
    deadline: null,
    contact: { phone: '0120-811-610', phoneLabel: 'ほっとライン（無料）', line: null, chat: null, web: 'https://www.check-roudou.mhlw.go.jp/lp/hotline/', hours: { ja: '月〜金 17:00〜22:00／土日祝 9:00〜21:00（12/29〜1/3は休み）', en: 'Mon–Fri 17:00–22:00 / Sat, Sun, holidays 9:00–21:00' } },
    locations: [],
    source: src('厚生労働省', 'https://www.check-roudou.mhlw.go.jp/lp/hotline/'),
    verifiedBy: BY
  },

  /* ================= 手続き・契約・法律 ================= */

  {
    id: 'houterasu',
    name: { ja: '法テラス（日本司法支援センター）', en: 'Houterasu — Japan Legal Support Center' },
    hook: { ja: '借金・契約・トラブルで、法律の助けがほしい', en: 'I need legal help with debt, a contract or a dispute' },
    summary: {
      ja: '国がつくった法律の相談窓口です。収入が少なければ、弁護士や司法書士に無料で相談でき、費用の立て替えも頼めます。',
      en: 'A public legal help center. If your income is low, you can talk to a lawyer for free and get fees advanced.'
    },
    cat: ['procedures', 'consult'],
    kind: 'service', basis: 'national', right: false,
    amount: { ja: '無料相談 1回30分・同じ問題で3回まで（収入などの条件あり）', en: 'Free consultations: 30 min, up to 3 times per issue (income limits)' },
    repay: null,
    who: { ja: '法律のことで困っている人。無料相談は、収入と貯金が基準以下の人（例：東京23区のひとり暮らしは手取り月20万200円以下、貯金180万円以下）。' },
    how: { ja: 'まずサポートダイヤル（0570-078374）で、どこに相談すればいいか聞けます。無料相談は近くの法テラスに予約します。' },
    where: { ja: '電話・メール・全国の法テラス' },
    docs: ['トラブルの書類（契約書・請求書・LINEのスクショなど）'],
    ask: ['無料相談の条件に当てはまりますか？', '弁護士費用の立て替えは、どうやって返しますか？'],
    caution: { ja: '借金や契約は、時間がたつと解決しにくくなります。「とりあえず電話」で大丈夫です。' },
    supporter: { ja: '立替費用は分割返済（利息なし）。立替には審査あり。収入基準は本人＋配偶者で判断。IP電話からは別番号。' },
    effort: 'low',
    for: { stages: ['left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 18, max: 99 }, areas: [] },
    deadline: null,
    contact: { phone: '0570-078374', phoneLabel: '法テラス・サポートダイヤル', line: null, chat: null, web: 'https://www.houterasu.or.jp/site/soudan-tatekae/goriyounonagare.html', hours: { ja: '平日 9:00〜21:00／土曜 9:00〜17:00（メールは24時間）', en: 'Weekdays 9:00–21:00 / Sat 9:00–17:00' } },
    locations: [
      { name: '法テラス東京', area: '13104', addr: '東京都新宿区西新宿1-24-1 エステック情報ビル13階', lat: 35.690514, lng: 139.695648, phone: '0570-078301', hours: '平日 9:00–17:00（土日祝・年末年始は休み）', note: 'JR新宿駅西口から徒歩8分。IP電話は 050-3383-5300。' }
    ],
    source: src('法テラス（無料法律相談のご利用の流れ）', 'https://www.houterasu.or.jp/site/soudan-tatekae/goriyounonagare.html'),
    sources2: [{ org: '法テラス東京', url: 'https://www.houterasu.or.jp/site/chihoujimusho-tokyo/access.html' }],
    verifiedBy: BY
  },

  {
    id: 'shohisha-188',
    name: { ja: '消費者ホットライン 188', en: 'Consumer Hotline 188' },
    hook: { ja: '高い契約をさせられた・解約できない', jr: '高いお金をはらわされそう・やめたいのにやめられない', en: 'I was pushed into a costly contract and cannot cancel' },
    summary: {
      ja: '188（いやや）に電話すると、近くの消費生活センターにつながります。クーリング・オフや解約のしかたを教えてくれます。',
      en: 'Call 188 to reach your local consumer center. They explain cooling-off and how to cancel.'
    },
    cat: ['procedures', 'consult'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '誰でも。副業・投資・美容・ネット通販などで困っている人。' },
    how: { ja: '188 に電話して、郵便番号などを入れると近くの窓口につながります。' },
    where: { ja: '電話（近くの消費生活センター）' },
    docs: ['契約書・領収書・やりとりのスクショ'],
    ask: ['クーリング・オフできますか？（いつ、どこで契約したか伝える）', '業者に自分で連絡しないほうがいいですか？'],
    caution: { ja: '相談は無料ですが、通話料はかかります。18歳から成人なので、契約は取り消しにくくなります。サインする前に相談を。' },
    supporter: { ja: '若者の消費者トラブル（情報商材・マルチ・美容医療等）は初動が重要。' },
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '188', phoneLabel: '消費者ホットライン', line: null, chat: null, web: 'https://www.caa.go.jp/policies/policy/local_cooperation/local_consumer_administration/hotline/', hours: null },
    locations: [],
    source: src('消費者庁', 'https://www.caa.go.jp/policies/policy/local_cooperation/local_consumer_administration/hotline/'),
    verifiedBy: BY
  },

  {
    id: 'kokuho',
    name: { ja: '国民健康保険に入る（保険料の軽減も）', en: 'Joining National Health Insurance' },
    hook: { ja: '施設を出たら、病院のお金はどうなる？', en: 'How do I pay for the doctor after leaving care?' },
    summary: {
      ja: '会社の保険に入らない人は、住んでいる区市町村の国民健康保険に入ります。収入が少ないと保険料が安くなる仕組みがあります。',
      en: 'If you are not on a work health plan, join your city\'s National Health Insurance. Premiums are reduced for low income.'
    },
    cat: ['procedures'],
    kind: 'procedure', basis: 'national', right: true,
    amount: null, repay: null,
    who: { ja: '施設などを出て、会社の健康保険に入らない人（学生・アルバイトなど）。' },
    how: { ja: '引っ越し先の区役所・市役所で、転入届と一緒に手続きします。病院では「マイナ保険証」か「資格確認書」を見せます。' },
    where: { ja: '住んでいる区市町村の国民健康保険の窓口' },
    docs: ['本人確認書類', 'マイナンバーがわかるもの', '（会社をやめた人）保険をやめた日がわかる書類'],
    ask: ['収入が少ないです。保険料の軽減の対象になりますか？', '収入がなくても、税金の申告は必要ですか？', '払うのが難しいとき、分割や減免はできますか？'],
    caution: { ja: '施設を出たら、自分で保険に入る必要があります。手続きを忘れると、病院でいったん全額払うことになる場合もあります。引っ越しと同じ日に手続きしましょう。' },
    supporter: { ja: '所得が基準以下の世帯は均等割・平等割の7割・5割・2割軽減（所得の把握が前提）。災害等特別な事情で減免・納付猶予あり。非自発的失業者の軽減あり。マイナ保険証がない人には資格確認書が申請なしで交付される。' },
    effort: 'low',
    for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 15, max: null }, areas: [] },
    deadline: { ja: '施設を出た日・会社をやめた日から、すぐに。', en: 'Right after you leave care or a job.', leaveMonths: 0, months: null, always: false },
    contact: null,
    locations: [],
    source: src('厚生労働省', 'https://www.mhlw.go.jp/stf/newpage_21517.html'),
    sources2: [{ org: '厚生労働省（資格確認書）', url: 'https://www.mhlw.go.jp/stf/newpage_45470.html' }],
    verifiedBy: BY
  },

  {
    id: 'nenkin-gakusei',
    name: { ja: '国民年金の学生納付特例', en: 'Student Pension Payment Deferral' },
    hook: { ja: '20歳になった学生。年金を払うお金がない', en: 'I am a 20+ student and cannot pay the pension' },
    summary: {
      ja: '20歳以上の学生は、申請すれば在学中の年金保険料をあとで払えます。「未納」にならず、けがや病気のときの障害年金も守られます。',
      en: 'Students 20+ can defer pension payments while in school. You avoid "unpaid" status and keep disability pension rights.'
    },
    cat: ['procedures', 'money'],
    kind: 'procedure', basis: 'national', right: true,
    amount: { ja: '月17,920円（2026年度）の保険料を、在学中は払わなくてよい', en: 'Defer the ¥17,920/month premium (FY2026) while in school' },
    repay: null,
    who: { ja: '20歳以上の学生（大学・短大・専門学校など、夜間・通信も）で、本人の前の年の所得が基準以下の人（128万円＋扶養の人数×38万円など）。' },
    how: { ja: '区役所・市役所の国民年金の窓口、年金事務所、または通っている学校に申請します。マイナポータルからも申請できます。' },
    where: { ja: '区市町村の国民年金窓口・年金事務所・学校' },
    docs: ['在学証明書か学生証のコピー', 'マイナンバーカード（ない人はマイナンバーがわかるものと本人確認書類）'],
    ask: ['学生納付特例を申請したいです', 'さかのぼって申請できますか？'],
    caution: { ja: '何もしないと「未納」になります。20歳の誕生月に届く書類は捨てないで。毎年度の申請が必要です。' },
    supporter: { ja: '承認期間は10年以内なら追納可。過去分は申請月の2年1か月前まで遡及可。税の申告をしていないと審査できないので住民税の申告が必要な場合あり。' },
    effort: 'low',
    for: { stages: ['left0', 'left1'], paths: ['study'], care: [], careOnly: false, age: { min: 20, max: 99 }, areas: [] },
    deadline: { ja: '20歳になったら、毎年4月以降に（年度ごと）。', en: 'From age 20, each school year (from April).', leaveMonths: null, months: [4], always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.nenkin.go.jp/service/kokunen/menjo/20150514.html', hours: null },
    locations: [],
    source: src('日本年金機構', 'https://www.nenkin.go.jp/service/kokunen/menjo/20150514.html'),
    sources2: [{ org: '日本年金機構（国民年金保険料）', url: 'https://www.nenkin.go.jp/service/kokunen/hokenryo/hokenryo.html' }],
    verifiedBy: BY
  },

  {
    id: 'nenkin-menjo',
    name: { ja: '国民年金保険料の免除・納付猶予', en: 'Pension Premium Exemption' },
    hook: { ja: '収入が少なくて、年金の保険料が払えない', en: 'My income is too low to pay the pension premium' },
    summary: {
      ja: '収入が少ないときや仕事を失ったときは、申請すると年金の保険料が全部または一部免除になります。未納のままより、将来もらえる年金が守られます。',
      en: 'With low income or after losing a job, you can be fully or partly exempt from pension premiums — far better than leaving them unpaid.'
    },
    cat: ['procedures', 'money'],
    kind: 'procedure', basis: 'national', right: true,
    amount: { ja: '月17,920円（2026年度）の保険料が、全額・4分の3・半額・4分の1免除', en: 'Full, 3/4, 1/2 or 1/4 exemption of the ¥17,920/month premium (FY2026)' },
    repay: null,
    who: { ja: '20歳以上で、前の年の所得が基準以下の人や、仕事を失った人（学生は「学生納付特例」）。' },
    how: { ja: '区役所・市役所の国民年金の窓口か年金事務所で申請します。マイナポータルからも申請できます。' },
    where: { ja: '区市町村の国民年金窓口・年金事務所' },
    docs: ['マイナンバーカード（ない人はマイナンバーがわかるものと本人確認書類）', '（仕事を失った人）離職票など'],
    ask: ['全額免除になりますか？', '免除と納付猶予の違いは何ですか？', 'さかのぼって申請できますか？'],
    caution: { ja: '何もしないと「未納」になり、けがや病気のときに障害年金を受け取れないことがあります。' },
    supporter: { ja: '全額免除期間は年金額の1/2を反映（未納は0）。納付猶予は50歳未満。失業による特例免除あり。10年以内なら追納可。過去分は2年1か月前まで。' },
    effort: 'low',
    for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 20, max: 99 }, areas: [] },
    deadline: { ja: '払えないとわかったら、すぐに（毎年度の申請が基本）。', en: 'As soon as you cannot pay (usually every year).', leaveMonths: null, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.nenkin.go.jp/service/kokunen/menjo/20150428.html', hours: null },
    locations: [],
    source: src('日本年金機構', 'https://www.nenkin.go.jp/service/kokunen/menjo/20150428.html'),
    verifiedBy: BY
  },

  {
    id: 'hikkoshi-todoke',
    name: { ja: '住民票の転出届・転入届', en: 'Moving-Out / Moving-In Registration' },
    hook: { ja: '引っ越したら、役所で何をすればいい？', en: 'What do I do at city hall when I move?' },
    summary: {
      ja: '引っ越したら住民票を新しい住所に移します。マイナンバーカードがあれば、転出届はスマホから出せます。',
      en: 'When you move, transfer your resident record. With a My Number Card you can file the move-out online.'
    },
    cat: ['procedures'],
    kind: 'procedure', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '引っ越すすべての人。' },
    how: { ja: '前の区市町村に転出届（マイナポータルでもOK）→ 引っ越してから14日以内に、新しい区市町村の窓口で転入届。' },
    where: { ja: '前の役所 → 新しい役所（マイナポータル）' },
    docs: ['本人確認書類', 'マイナンバーカード（あれば）', '転出証明書（オンラインで出した人はいらない）'],
    ask: ['国民健康保険や年金の手続きも、今日一緒にできますか？', 'マイナンバーカードの住所変更もお願いします'],
    caution: { ja: '住民票が古い住所のままだと、大事な手紙や給付の案内が届きません。転入届は引っ越しから14日以内に。' },
    supporter: { ja: '転入届はオンライン不可（転出届と来庁予約のみオンライン）。郵便局の転居届（転送）も同時に。' },
    effort: 'low',
    for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: [], careOnly: false, age: { min: 15, max: null }, areas: [] },
    deadline: { ja: '引っ越してから14日以内に転入届。', en: 'File the move-in within 14 days of moving.', leaveMonths: 0, months: null, always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.digital.go.jp/policies/moving_onestop_service', hours: null },
    locations: [],
    source: src('デジタル庁', 'https://www.digital.go.jp/policies/moving_onestop_service'),
    sources2: [{ org: 'デジタル庁（よくある質問）', url: 'https://www.digital.go.jp/policies/moving_onestop_service/faq-01' }],
    verifiedBy: BY
  },

  {
    id: 'mynumber-card',
    name: { ja: 'マイナンバーカード', en: 'My Number Card' },
    hook: { ja: '顔写真つきの身分証がない', en: 'I do not have a photo ID' },
    summary: {
      ja: '無料で作れる、顔写真つきの身分証です。部屋や仕事、銀行の手続きで使えて、保険証にもなります。',
      en: 'A free photo ID. Use it for renting, jobs and banks, and as your health insurance card.'
    },
    cat: ['procedures'],
    kind: 'procedure', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '日本に住民票がある人なら誰でも。' },
    how: { ja: 'オンラインなどで申請し、約1か月後に区役所・市役所で受け取ります。受け取りは原則本人が行きます。' },
    where: { ja: '申請：オンライン・郵送など／受け取り：区市町村の窓口' },
    docs: ['交付通知書（はがき）', '本人確認書類', '通知カード（持っている人）'],
    ask: ['写真つきの身分証がありません。受け取りに何を持っていけばいいですか？', '保険証として使う登録もここでできますか？'],
    caution: { ja: '18歳以上はカードの有効期限が10回目の誕生日まで、電子証明書は5回目の誕生日までです。暗証番号はメモして安全な場所に。' },
    supporter: { ja: '交付手数料は当面無料（再発行は原則有料）。施設を出る前に作っておくと、口座開設・賃貸契約・就職手続きが楽になる。' },
    effort: 'mid',
    for: { stages: ['hs12', 'hs3', 'left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: { ja: '施設を出る2〜3か月前までに申請しておくと安心。', en: 'Apply 2–3 months before you leave care.', leaveMonths: -3, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.digital.go.jp/policies/mynumber_faq_03', hours: null },
    locations: [],
    source: src('デジタル庁（よくある質問：マイナンバーカード）', 'https://www.digital.go.jp/policies/mynumber_faq_03'),
    verifiedBy: BY
  },

  /* ================= 相談・こころ・安全 ================= */

  {
    id: 'yorisoi',
    name: { ja: 'よ\u2060り\u2060そ\u2060いホットライン', en: 'Yorisoi Hotline' },
    hook: { ja: 'どこに相談したらいいかわからない', en: 'I do not know who to talk to' },
    summary: {
      ja: '24時間、無料で、どんな悩みでも話せる電話です。外国語や、DV・性暴力、性のことなど専門の相談も選べます。',
      en: 'A free 24-hour line for any worry. Special lines for other languages, DV and sexual violence, and LGBTQ+ concerns.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'npo', right: false,
    amount: null, repay: null,
    who: { ja: '誰でも。眠れない、つらい、お金がない、どこに行けばいいかわからないとき。' },
    how: { ja: '0120-279-338 に電話します。ガイダンスで専門の相談も選べます。' },
    where: { ja: '電話（チャット・SNSの案内も公式サイトに）' },
    docs: [],
    ask: ['話がまとまっていなくても大丈夫ですか？（大丈夫です）'],
    caution: { ja: 'つながりにくいときは、時間をおいてかけ直してください。050で始まるIP電話からは 050-3655-0279。' },
    supporter: { ja: '福島県からは 0120-279-226。電話が苦手な本人には、あなたのい\u2060ば\u2060し\u2060ょ等のチャット窓口も案内。' },
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '0120-279-338', phoneLabel: 'よ\u2060り\u2060そ\u2060いホットライン（無料）', line: null, chat: null, web: 'https://www.since2011.net/yorisoi/', hours: { ja: '24時間', en: '24 hours' } },
    locations: [],
    source: src('一般社団法人 社会的包摂サポートセンター', 'https://www.since2011.net/yorisoi/'),
    sources2: [{ org: '厚生労働省「まもろうよ こころ」', url: MAMORO }],
    verifiedBy: BY
  },

  {
    id: 'inochi-sos',
    name: { ja: '#いのちSOS', en: '#Inochi SOS' },
    hook: { ja: '死にたい・消えたい気持ちがある', en: 'I feel like I want to die or disappear' },
    summary: {
      ja: '「死にたい」「生きることに疲れた」気持ちを、専門の相談員が受け止めます。毎日24時間、無料でつながります。',
      en: 'Trained counselors listen when you feel you want to die. Free, every day, 24 hours.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'npo', right: false,
    amount: null, repay: null,
    who: { ja: '誰でも。' },
    how: { ja: '0120-061-338 に電話します。' },
    where: { ja: '電話' },
    docs: [],
    ask: ['今の気持ちを聞いてほしいです'],
    caution: { ja: '今すぐ危ないときは 119 か 110 へ。' },
    supporter: null,
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '0120-061-338', phoneLabel: '#いのちSOS（無料）', line: null, chat: null, web: MAMORO, hours: { ja: '毎日24時間', en: '24 hours, every day' } },
    locations: [],
    source: src('厚生労働省「まもろうよ こころ」', MAMORO),
    verifiedBy: BY
  },

  {
    id: 'anata-no-ibasho',
    name: { ja: 'あなたのい\u2060ば\u2060し\u2060ょ（チャット相談）', en: 'Anata no Ibasho (chat support)' },
    hook: { ja: '電話はこわい。文字なら話せるかも', en: 'Calling is scary, but I could type' },
    summary: {
      ja: '24時間365日、誰でも無料・匿名で使えるチャット相談です。名前を言わなくて大丈夫です。',
      en: 'Free, anonymous chat counseling for anyone, 24/7.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'npo', right: false,
    amount: null, repay: null,
    who: { ja: '年齢や性別に関係なく、誰でも。' },
    how: { ja: '公式サイトからチャットを始めます。' },
    where: { ja: 'インターネット（チャット）' },
    docs: [],
    ask: ['うまく言えないけど、聞いてほしいです'],
    caution: { ja: '混んでいると、つながるまで時間がかかることがあります。' },
    supporter: { ja: 'NPO法人あなたのい\u2060ば\u2060し\u2060ょが運営。厚労省「まもろうよ こころ」にSNS・チャット相談として掲載。' },
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: null, phoneLabel: null, line: null, chat: 'https://talkme.jp/', web: 'https://talkme.jp/', hours: { ja: '24時間365日', en: '24/7' } },
    locations: [],
    source: src('厚生労働省「まもろうよ こころ」（あなたのい\u2060ば\u2060し\u2060ょを掲載）', MAMORO),
    sources2: [{ org: 'NPO法人あなたのい\u2060ば\u2060し\u2060ょ', url: 'https://talkme.jp/' }],
    verifiedBy: BY
  },

  {
    id: 'kodomo-sos',
    name: { ja: '24時間子供SOSダイヤル', en: '24-hour Child SOS Dial' },
    hook: { ja: 'いじめや学校・家のことで、すぐ話したい', jr: 'いじめや友だち、学校のことを、今すぐ話したい', en: 'I need to talk about bullying, school or home now' },
    summary: {
      ja: '子どもや保護者が、夜や休みの日もふくめて24時間いつでも電話できる、無料の相談です（文部科学省）。',
      jr: 'いじめ、学校に行くこと、友だちのこと。夜でも休みの日でも、24時間電話できます。お金はかかりません。',
      en: 'A free 24-hour phone line for children and parents, nights and holidays included (Ministry of Education).'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '子ども（小学生・中学生・高校生など）と、その保護者。いじめのほか、どんなSOSでも。' },
    how: { ja: '0120-0-78310（なやみいおう）に電話します。' },
    where: { ja: '電話' },
    docs: [],
    ask: ['話を聞いてほしいです'],
    caution: { ja: 'つながらないときも、あきらめずにもう一度かけてください。050で始まるIP電話などからは、つながらないことがあります。今すぐ危ないときは 110 へ。' },
    supporter: { ja: '都道府県・指定都市の教育委員会などが運営する全国共通ダイヤル。夜間・休日も対応。' },
    effort: 'low',
    for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '0120-0-78310', phoneLabel: '24時間子供SOSダイヤル（無料）', line: null, chat: null, web: MEXT_SOS24, hours: { ja: '24時間', en: '24 hours' } },
    locations: [],
    source: src3('文部科学省「子供のSOSの相談窓口（24時間）」', MEXT_SOS24),
    sources2: [{ org: 'こども家庭庁（その他の相談窓口）', url: 'https://www.cfa.go.jp/policies/jidougyakutai/gyakutai-taiou-dial' }, { org: '厚生労働省「まもろうよ こころ」', url: MAMORO }],
    verifiedBy: BY
  },

  {
    id: 'childline',
    name: { ja: 'チャイルドライン（18歳まで）', en: 'Childline (up to 18)' },
    hook: { ja: '誰かに聞いてほしいだけ', jr: 'ちょっと話を聞いてほしい', en: 'I just want someone to listen' },
    summary: {
      ja: '18歳までの人のための、無料の電話とチャットです。名前も言わなくていいし、途中で切ってもOKです。',
      jr: '18歳までの人が、名前を言わずに、無料で話せる電話とチャットです。いやになったら、とちゅうで切ってだいじょうぶ。',
      en: 'Free phone and chat for anyone up to 18. No name needed.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'npo', right: false,
    amount: null, repay: null,
    who: { ja: '18歳までの人。' },
    how: { ja: '0120-99-7777 に電話するか（毎日 午後4時〜9時）、サイトのチャットを使います（月〜土 午後4時〜9時、第4日曜は午後4時〜6時半）。' },
    where: { ja: '電話・チャット' },
    docs: [],
    ask: ['話を聞いてほしいです'],
    caution: { ja: '年末年始（12月29日〜1月3日）はお休みです。キッズフォンや050で始まるIP電話はつながらないことがあり、LINE電話などのインターネット電話からはかけられません。' },
    supporter: { ja: '運営：認定NPO法人チャイルドライン支援センター。「ネットでんわ」は2026年3月31日で終了。チャットは本人が望まない限り通報しない方針と明記。' },
    effort: 'low',
    for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: { min: null, max: 18 }, areas: [] },
    deadline: null,
    contact: { phone: '0120-99-7777', phoneLabel: 'チャイルドライン（無料）', line: null, chat: 'https://childline.or.jp/chat/', web: 'https://childline.or.jp/tel/', hours: { ja: '電話 毎日16:00〜21:00／チャット 月〜土16:00〜21:00（第4日曜は16:00〜18:30）', en: 'Phone daily 16:00–21:00 / Chat Mon–Sat 16:00–21:00 (4th Sunday 16:00–18:30)' } },
    locations: [],
    source: src3('チャイルドライン支援センター（電話で話す）', 'https://childline.or.jp/tel/'),
    sources2: [{ org: 'チャイルドライン支援センター（チャットで話す）', url: 'https://childline.or.jp/chat/' }, { org: '文部科学省「子供のSOSの相談窓口（電話）」', url: MEXT_SOSTEL }],
    verifiedBy: BY
  },

  {
    id: 'jiso-189',
    name: { ja: '児童相談所 189（いちはやく）', en: 'Child Guidance Center 189' },
    hook: { ja: '家や施設で、こわいことがある', jr: '家で、たたかれたり、こわいことをされる', en: 'Something scary is happening at home or in care' },
    summary: {
      ja: '189 にかけると、近くの児童相談所につながります。名前を言わなくても相談でき、秘密は守られます。通話は無料です。',
      jr: '189にかけると、近くの児童相談所につながります。名前を言わなくてもいいし、お金もかかりません。',
      en: 'Dial 189 to reach your local child guidance center. Anonymous, confidential and free.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '虐待かもと思ったとき。自分のことでも、まわりの子のことでも。中学生や高校生が、自分で電話してかまいません。' },
    how: { ja: '189 に電話します。オペレーターが住んでいる地域を聞いて、近くの児童相談所につなぎます。虐待のほかの、こどものいろいろな相談は 0120-189-783（児童相談所相談専用ダイヤル・無料）でもできます。' },
    where: { ja: '電話（近くの児童相談所）' },
    docs: [],
    ask: ['今の状況を話したいです', '安全に過ごせる場所はありますか？'],
    caution: { ja: '一部のIP電話からはつながりません。今すぐ危ないときは 110 へ。' },
    supporter: { ja: '2025年12月22日から、すべての電話でオペレーターが地域を聞き取り管轄の児相へ転送。措置延長・児童自立生活援助の相談も児相へ。' },
    effort: 'low',
    for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '189', phoneLabel: '児童相談所 虐待対応ダイヤル（無料）', line: null, chat: null, web: 'https://www.cfa.go.jp/policies/jidougyakutai/gyakutai-taiou-dial', hours: { ja: '24時間365日', en: '24/7' } },
    locations: [],
    source: src3('こども家庭庁', 'https://www.cfa.go.jp/policies/jidougyakutai/gyakutai-taiou-dial'),
    sources2: [{ org: '文部科学省「子供のSOSの相談窓口（電話）」', url: MEXT_SOSTEL }],
    verifiedBy: BY
  },

  {
    id: 'notalone',
    name: { ja: 'あなたはひとりじゃない（支援さがしチャットボット）', en: 'You Are Not Alone — Support Finder' },
    hook: { ja: '自分に合う支援を、質問に答えて探したい', en: 'I want to find support by answering questions' },
    summary: {
      ja: '国（内閣府）のサイトです。チャットボットの質問に答えると、あなたに合う支援や相談窓口が見つかります。18歳以下の人向けのページもあります。',
      jr: 'チャットボットの質問に答えると、自分に合う相談先がわかります。名前や電話番号は入れなくてだいじょうぶ。',
      en: 'A government site: answer a chatbot\'s questions to find support and help lines that fit you. There is a page for people 18 and under.'
    },
    cat: ['consult'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '誰でも。18歳以下の人向けの電話・メール・チャットの窓口も紹介しています。' },
    how: { ja: 'サイトを開いて、チャットボットで探します。' },
    where: { ja: 'インターネット' },
    docs: [],
    ask: ['（読むだけでOK）'],
    caution: null,
    supporter: { ja: '内閣府孤独・孤立対策推進室。相談窓口の守秘義務や「制度を使うことは権利」というメッセージを本人に伝えやすい。' },
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://notalone-cao.go.jp/', hours: null },
    locations: [],
    source: src3('内閣府 孤独・孤立対策推進室', 'https://notalone-cao.go.jp/'),
    sources2: [{ org: '18歳以下のみなさんへ（同サイト）', url: 'https://notalone-cao.go.jp/under18/' }],
    verifiedBy: BY
  },

  {
    id: 'onestop-8891',
    name: { ja: '性暴力の相談 #8891（ワンストップ支援センター）', en: 'Sexual Violence Support #8891' },
    hook: { ja: 'いやな性的なことをされた', en: 'Something sexual happened that I did not want' },
    summary: {
      ja: '#8891 にかけると、近くの性犯罪・性暴力被害者のためのワンストップ支援センターにつながります。通話は無料です。',
      en: 'Dial #8891 to reach your nearest one-stop center for sexual violence. The call is free.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '性暴力を受けた人。性別や年齢は関係ありません。' },
    how: { ja: '#8891 に電話します（NTTひかり電話からは 0120-8891-77）。' },
    where: { ja: '電話（近くの支援センター）' },
    docs: [],
    ask: ['何から話せばいいかわかりません。聞いてもらえますか？'],
    caution: { ja: '受付時間はセンターごとに違います。一部のIP電話からはつながりません。今すぐ危ないときは 110 へ。' },
    supporter: null,
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '#8891', phoneLabel: 'ワンストップ支援センター（無料）', line: null, chat: null, web: 'https://www.gender.go.jp/policy/no_violence/seibouryoku/consult.html', hours: null },
    locations: [],
    source: src('内閣府 男女共同参画局', 'https://www.gender.go.jp/policy/no_violence/seibouryoku/consult.html'),
    sources2: [{ org: '警察庁（令和7年版 犯罪被害者白書 相談先一覧）', url: 'https://www.npa.go.jp/hanzaihigai/whitepaper/2025/zenbun/siryo/siryo-9.html' }],
    verifiedBy: BY
  },

  {
    id: 'police-9110',
    name: { ja: '警察相談専用電話 #9110', en: 'Police Consultation #9110' },
    hook: { ja: 'ストーカーや詐欺かも。でも110番ほどじゃない', en: 'Stalking or a scam — but not a 110 emergency' },
    summary: {
      ja: '事件かどうかわからない困りごとを、警察に相談できる全国共通の番号です。',
      en: 'A nationwide number to ask the police about trouble that may not be an emergency.'
    },
    cat: ['consult', 'procedures'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '誰でも。' },
    how: { ja: '#9110 に電話すると、住んでいる地域の警察の相談窓口につながります。' },
    where: { ja: '電話（都道府県警察）' },
    docs: ['あれば：やりとりのスクショ、日時のメモ'],
    ask: ['これは警察に相談していいことですか？', '証拠として何を残せばいいですか？'],
    caution: { ja: '今すぐ危ないときは 110 へ。時間外は当直や音声案内になることがあります。' },
    supporter: null,
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '#9110', phoneLabel: '警察相談専用電話', line: null, chat: null, web: 'https://www.keishicho.metro.tokyo.lg.jp/sodan/madoguchi/sogo.html', hours: { ja: '平日 8:30〜17:15（都道府県で違います）', en: 'Weekdays 8:30–17:15 (varies by prefecture)' } },
    locations: [],
    source: src('警視庁 総合相談センター（#9110）', 'https://www.keishicho.metro.tokyo.lg.jp/sodan/madoguchi/sogo.html'),
    sources2: [{ org: '警察庁（令和7年版 犯罪被害者白書 相談先一覧）', url: 'https://www.npa.go.jp/hanzaihigai/whitepaper/2025/zenbun/siryo/siryo-9.html' }],
    verifiedBy: BY
  },

  /* ================= 中学生にも関係する国の制度・窓口（v3 で追加・2026-10-17 確認） ================= */

  {
    id: 'shugaku-enjo',
    name: { ja: '就学援助（小学校・中学校のお金）', en: 'School Expense Aid (Elementary & Junior High)' },
    hook: { ja: '給食費や修学旅行のお金が心配', jr: '給食や修学旅行、部活のお金が心配', en: 'I worry about school lunch and school trip costs' },
    summary: {
      ja: '生活が苦しい家庭の小学生・中学生のために、区市町村が学用品・給食費・修学旅行費などを出してくれます。返さなくていいお金です。',
      jr: '家のお金が苦しいとき、学校で使うお金（給食・修学旅行・学用品など）を区市町村が出してくれます。返さなくていいです。',
      en: 'Your city pays school supplies, lunch, school trips and more for elementary and junior high students from low-income families. No repayment.'
    },
    cat: ['education', 'money'],
    kind: 'grant', basis: 'national', right: true,
    amount: null,
    repay: 'none',
    who: { ja: '生活保護を受けている家庭や、それに近いくらい生活が苦しいと区市町村が認めた家庭の、小学生・中学生（申し込むのは保護者）。基準は区市町村ごとに決まっています。' },
    how: { ja: '保護者が、住んでいる区市町村（教育委員会）に申し込みます。対象になるか、何が出るかは区市町村に問い合わせます。' },
    where: { ja: '住んでいる区市町村の教育委員会' },
    docs: ['区市町村の申請書'],
    ask: ['就学援助は、いつ・どこで申し込めますか？', 'うちの家は対象になりそうですか？', '修学旅行や部活のお金も出ますか？', '中学に入る前のお金（新入学の学用品費）も出ますか？'],
    caution: { ja: '申し込むのは保護者です。何にいくら出るかは区市町村ごとにちがいます。施設や里親家庭で暮らしている人は、学校のお金の出し方がちがうことがあるので、職員や里親に聞いてください。' },
    supporter: { ja: '学校教育法19条「経済的理由によって就学困難と認められる学齢児童生徒の保護者に対しては、市町村は、必要な援助を与えなければならない」。要保護者（国庫補助1/2）と準要保護者（市町村単独・認定基準は各市町村）。国庫補助の対象品目：学用品費・体育実技用具費・新入学児童生徒学用品費等・通学用品費・通学費・修学旅行費・校外活動費・医療費・学校給食費・クラブ活動費・生徒会費・PTA会費・卒業アルバム代等・オンライン学習通信費。' },
    effort: 'mid',
    for: { stages: ['jhs12', 'jhs3'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: { ja: '区市町村ごとに申込みの時期が決まっています。くわしくは区市町村に聞きましょう。', en: 'Each city sets its own application period. Ask your city office.', leaveMonths: null, months: null, always: false },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.mext.go.jp/a_menu/shotou/career/05010502/017.htm', hours: null },
    locations: [],
    source: src3('文部科学省「就学援助制度について（就学援助ポータルサイト）」', 'https://www.mext.go.jp/a_menu/shotou/career/05010502/017.htm'),
    verifiedBy: BY
  },

  {
    id: 'kodomo-gakushu-shien',
    name: { ja: '子どもの学習・生活支援事業（学習支援）', en: 'Learning and Life Support for Children' },
    hook: { ja: '塾に行けない。勉強を見てくれる人がほしい', jr: '塾に行けない。勉強を教えてほしい', en: 'I cannot go to cram school and want help studying' },
    summary: {
      ja: '生活に困りごとがある家庭の子どもに、区市町村が勉強の支援や、安心してすごせる居場所、高校進学の相談などを用意しています（国の制度）。',
      jr: '勉強を見てもらえたり、高校に行くための相談ができたりする場所です。区市町村がやっています。',
      en: 'Cities offer study help, a safe place to spend time and advice on going to high school for children from families facing hardship (a national program).'
    },
    cat: ['education', 'consult'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '生活に困りごとがある家庭の子どもと、その保護者。くわしい対象（学年など）や場所は、区市町村ごとに決まっています。' },
    how: { ja: '住んでいる区市町村の自立相談支援機関（くらしの困りごと相談）に「子どもの学習支援を使いたい」と相談します。' },
    where: { ja: '住んでいる区市町村（自立相談支援機関）' },
    docs: [],
    ask: ['子どもの学習支援（学習・生活支援事業）は、この区市町村にありますか？', 'どこで、何曜日にやっていますか？', 'お金はかかりますか？', '高校受験の相談もできますか？'],
    caution: { ja: '内容・対象・場所は区市町村ごとにちがいます。東京都内の区市町村の窓口は、このサイトの地図からも探せます。' },
    supporter: { ja: '生活困窮者自立支援制度の事業の一つ。学習支援のほか、生活習慣、居場所づくり、進学支援、高校進学者の中退防止支援など、子どもと保護者の双方を支援。問い合わせ先は各地域の自立相談支援機関。' },
    effort: 'low',
    for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: { ja: 'いつでも相談できます。高校受験の前なら、中1・中2のうちに聞いておくと安心です。', en: 'Ask any time. If you plan to take high school entrance exams, ask early.', leaveMonths: null, months: null, always: true },
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://minna-tunagaru.jp/ichiran/', hours: null },
    locations: [],
    source: src3('厚生労働省「生活困窮者自立支援制度」', 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000059425.html'),
    verifiedBy: BY
  },

  {
    id: 'jinken-110',
    name: { ja: 'こどもの人権110番（法務省）', en: 'Children\'s Rights Hotline (Ministry of Justice)' },
    hook: { ja: 'いじめや、家の人にいやなことをされる', jr: '学校でいじめられている。家の人にいやなことをされる', en: 'I am bullied, or someone at home hurts me' },
    summary: {
      ja: 'いじめや虐待など、こどもの困りごとを、法務局の職員や人権擁護委員が聞いて一緒に考える無料の電話です。LINE・メール・手紙でも相談できます。',
      jr: 'いじめや、家でいやなことをされたとき、話を聞いて一緒に考えてくれる無料の電話です。LINEや手紙でも相談できます。',
      en: 'A free line where Legal Affairs Bureau staff listen and help with bullying, abuse and other problems children face. LINE, email and letters also work.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: 'こども。「まわりで困っている子がいる」という相談でもだいじょうぶです。' },
    how: { ja: '0120-007-110 に電話します（平日 朝8時30分〜夕方5時15分）。LINEは「法務局LINEじんけん相談」を友だち追加します。' },
    where: { ja: '電話・LINE・メール・手紙（法務局）' },
    docs: [],
    ask: ['学校でいやなことがあって、話を聞いてほしいです', '先生や家の人には言いにくいです。どうしたらいいですか？'],
    caution: { ja: '土・日・祝日・年末年始はお休みです。つながらないときは、法務省のページの一覧から近くの相談先に電話できます。今すぐ危ないときは 110 へ。' },
    supporter: { ja: '学校のいじめ・体罰・不適切な指導、家庭内の虐待など。LINEじんけん相談（平日8:30〜17:15）、メール相談（インターネット人権相談）、こどもの人権SOSミニレター（手紙）もある。秘密は守られる。' },
    effort: 'low',
    for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: '0120-007-110', phoneLabel: 'こどもの人権110番（無料）', line: 'https://lin.ee/sypy6vm', chat: null, web: 'https://www.moj.go.jp/JINKEN/jinken112.html', hours: { ja: '平日 8:30〜17:15', en: 'Weekdays 8:30–17:15' } },
    locations: [],
    source: src3('法務省「こどもの人権110番」', 'https://www.moj.go.jp/JINKEN/jinken112.html'),
    sources2: [{ org: '文部科学省「子供のSOSの相談窓口（SNS）」', url: MEXT_SOSSNS }, { org: 'こども家庭庁（その他の相談窓口）', url: 'https://www.cfa.go.jp/policies/jidougyakutai/gyakutai-taiou-dial' }],
    verifiedBy: BY
  },

  {
    id: 'oyako-line',
    name: { ja: '親子のための相談LINE（こども家庭庁）', en: 'Parent-Child Consultation LINE' },
    hook: { ja: '親や家のことを、文字で相談したい', jr: '親や家のことを、LINEで相談したい', en: 'I want to talk about my parents or home by text' },
    summary: {
      ja: '子育てや親子のことで悩んだとき、こども（18歳未満）も保護者もLINEで相談できます。ニックネームでも相談でき、秘密は守られます。',
      jr: '親や家のことでなやんだら、LINEで相談できます。ニックネームでOK。ひみつは守られます。',
      en: 'Children under 18 and parents can talk about parenting and family problems on LINE. A nickname is fine and it stays confidential.'
    },
    cat: ['consult'],
    kind: 'hotline', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: '18歳未満のこどもと、その保護者など。' },
    how: { ja: 'LINEで友だち追加して、メッセージを送ります。住んでいる自治体の窓口につながります。' },
    where: { ja: 'LINE（住んでいる都道府県・区市町村の窓口）' },
    docs: [],
    ask: ['家のことで話を聞いてほしいです', '親には知られずに相談できますか？'],
    caution: { ja: '受付時間は住んでいる自治体でちがいます。東京都は毎日、平日9時〜23時（受付は22時30分まで）、土日祝と年末年始は9時〜17時（国の一覧・2024年10月時点）。区によってちがう時間のところもあります。相談の前に、個人情報のあつかいの説明を読みましょう。' },
    supporter: { ja: 'こども家庭庁が運営し、各自治体が対応。港区（13:00〜21:00）など区独自の時間もある。今すぐ危険がある場合は110・189へ。' },
    effort: 'low',
    for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: { min: null, max: 17 }, areas: [] },
    deadline: null,
    contact: { phone: null, phoneLabel: null, line: 'https://line.me/R/ti/p/@778asdia', chat: null, web: 'https://www.cfa.go.jp/policies/jidougyakutai/oyako-line', hours: { ja: '東京都：平日9:00〜23:00、土日祝9:00〜17:00', en: 'Tokyo: weekdays 9:00–23:00, weekends/holidays 9:00–17:00' } },
    locations: [],
    source: src3('こども家庭庁「親子のための相談LINE」', 'https://www.cfa.go.jp/policies/jidougyakutai/oyako-line'),
    verifiedBy: BY
  },

  {
    id: 'kodomo-soudan-guide',
    name: { ja: 'こども相談ガイド（こども家庭庁）', en: 'Child Consultation Guide (Children and Families Agency)' },
    hook: { ja: 'どこに相談したらいいか、一緒に探してほしい', jr: 'だれに相談すればいいか、わからない', en: 'Help me find who to talk to' },
    summary: {
      ja: '質問に答えると、電話・チャット・会いに行ける相談先を一緒に探してくれる、こども家庭庁のサイトです。名前や連絡先の登録はいりません。',
      jr: '質問に答えていくと、あなたに合う相談先を一緒に探してくれます。中学生向けのコースもあります。名前を入れなくてOK。',
      en: 'A government site that asks a few questions and finds phone, chat or in-person help for you. No name or contact details needed.'
    },
    cat: ['consult'],
    kind: 'service', basis: 'national', right: false,
    amount: null, repay: null,
    who: { ja: 'こども・若者本人（小学生・中学生・高校生以上のコースがあります）。友だちや家族のことが心配な人も使えます。' },
    how: { ja: 'サイトを開いて、質問に答えていきます。相談先は無料で使えます。' },
    where: { ja: 'インターネット' },
    docs: [],
    ask: ['（読むだけでOK）'],
    caution: null,
    supporter: { ja: '全国約7,600か所（2026年9月時点）の支援団体の情報を掲載（自治体などの公開情報をもとに原則年1回更新）。家族・家のこと、勉強・友達、居場所、心と体、トラブル、お金・住まいなどから選べる。' },
    effort: 'low',
    for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: [] },
    deadline: null,
    contact: { phone: null, phoneLabel: null, line: null, chat: null, web: 'https://www.bridge.cfa.go.jp/guide/', hours: null },
    locations: [],
    source: src3('こども家庭庁「こども相談ガイド」', 'https://www.bridge.cfa.go.jp/'),
    sources2: [{ org: 'こども家庭庁「こども相談ガイド」', url: 'https://www.bridge.cfa.go.jp/guide/' }],
    verifiedBy: BY
  }

  );
})();
