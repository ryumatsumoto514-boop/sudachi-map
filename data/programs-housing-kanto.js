/* 巣立ちマップ v8 — data/programs-housing-kanto.js (DATA-HOUSING)
 * 東京都以外の関東（神奈川 14・埼玉 11・千葉 12・茨城 08・栃木 09・群馬 10）の「住まい」の支援:
 *   居住支援協議会の相談窓口 ／ 県が指定した居住支援法人の一覧 ／ 県営住宅・政令市の市営住宅の申込み ／
 *   政令市の住まいさがし支援・居住支援制度 ／ 政令市の住居確保給付金（市のページがあるところ）。
 * すべて 2026-10-31 に、source.url の公式ページ（県・市・住宅供給公社・指定管理者）を読んで確認しました。
 * ページに書いていないこと（金額・電話番号・住所・時間・締切）は入れていません。
 * 座標は 国土地理院 住所検索API で住所から求めました（locations[].area は 政令市は市のコード）。
 *
 * SPEC-v7 データ契約: basis 'pref' = 県の制度（pref: '14' など, for.areas: [pref]）／ 'local' = 政令市の制度（for.areas: [市コード]）。
 * 公営住宅の収入基準「月15万8,000円」は、年間所得から控除を引いて12で割った「所得月額」（給与の額面ではない）。
 * 中学生（jhs*）には出さない記録ばかりなので jr の文はありません（stages が NOT_JR）。
 */
(function () {
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};
  SM.data.programs = SM.data.programs || [];

  var C = '2026-10-31';
  var V = 'Economix JP';
  var LEAVERS = ['hs3', 'left0', 'left1', 'nohs'];   // 巣立つ前後の人（中学生には出さない）
  var ADULT = { min: 18, max: null };                // 公営住宅は申込者が成人（18歳以上）

  function src(org, url) { return { org: org, url: url, checked: C }; }
  function loc(name, area, addr, lat, lng, phone, hours, note) {
    return { name: name, area: area, addr: addr, lat: lat, lng: lng, phone: phone, hours: hours || '', note: note || '' };
  }

  /* ───────── 公式ページ ───────── */
  // 神奈川県
  var KN_KYOJU = 'https://www.pref.kanagawa.jp/docs/zm4/kyojushien/kyojushien.html';
  var KN_HOJIN = 'https://www.pref.kanagawa.jp/docs/zm4/kyojushien/sn-shitei.html';
  var KN_SUMAI = 'https://www.pref.kanagawa.jp/docs/zm4/kyojushien/sumai_sagashi.html';
  var KN_MACHIKYO = 'http://www.machikyo.or.jp/kyojyushien/index.html';
  var KN_KENEI = 'https://www.pref.kanagawa.jp/docs/h5z/cnt/f6022/index.html';
  var KN_KENEI_SHIKAKU = 'https://www.pref.kanagawa.jp/docs/h5z/cnt/f6022/p28475.html';
  var KN_KENEI_JOJI = 'https://www.pref.kanagawa.jp/docs/h5z/cnt/f6022/p28456.html';
  var YK_KYOGIKAI = 'https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/jutaku/sien/kyojushienkyogikai.html';
  var YK_SHIEI = 'https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/jutaku/joho/kanri.html';
  var YK_SHIEI_FAQ = 'https://www.city.yokohama.lg.jp/faq/kukyoku/kenchiku/shiei-jutaku/20211014084125276.html';
  var YK_KOUSYA = 'https://www.yokohama-kousya.or.jp/municipal/';
  var YK_JUKYO = 'https://www.city.yokohama.lg.jp/kurashi/fukushi-kaigo/seikatsu/jiritsu/jukyokakuho.html';
  var KW_SODAN = 'https://www.city.kawasaki.jp/500/page/0000081601.html';
  var KW_KYOGIKAI = 'https://www.city.kawasaki.jp/500/page/0000084646.html';
  var KW_SEIDO = 'https://www.city.kawasaki.jp/500/page/0000043481.html';
  var KW_SHIEI = 'https://www.city.kawasaki.jp/500/page/0000191068.html';
  var SG_SHIEI = 'https://www.city.sagamihara.kanagawa.jp/kurashi/1026489/sumai/1026509/1007952.html';
  var SG_SHIEI_FAQ = 'https://www.city.sagamihara.kanagawa.jp/shisei/1026875/faq/jyutaku/1002079.html';
  // 埼玉県
  var ST_SAFETY = 'https://www.pref.saitama.lg.jp/a1107/se-futelineltutozyuutaku/20200214.html';
  var ST_SASN = 'https://www.sasn.jp/description/';
  var ST_HOJIN = 'https://www.pref.saitama.lg.jp/a1107/safety-net-kyojuusienhoujin.html';
  var ST_KENEI = 'https://www.pref.saitama.lg.jp/a1107/bosyuu.html';
  var ST_KENEI_JKK = 'https://www.saijk.or.jp/lookingfor/kenei/';
  var SC_SHIEI = 'https://www.city.saitama.lg.jp/001/154/007/018/001/p129654.html';
  var SC_JUKYO = 'https://www.city.saitama.lg.jp/002/003/002/p072573.html';
  // 千葉県
  var CB_BUKAI = 'https://www.pref.chiba.lg.jp/juutaku/seisaku/juutaku/kyojyuushienn2.html';
  var CB_JOHO = 'https://www.pref.chiba.lg.jp/juutaku/seisaku/juutaku/kyojyuushienjouho.html';
  var CB_SAFETY = 'https://www.pref.chiba.lg.jp/juutaku/seisaku/safetynet/safetynet.html';
  var CB_HOJIN = 'https://www.pref.chiba.lg.jp/juutaku/seisaku/safetynet/kyojushienhoujin.html';
  var CB_HOJIN_TEBIKI = 'https://www.pref.chiba.lg.jp/juutaku/seisaku/safetynet/documents/hojintebiki.pdf';
  var CB_KENEI_SHIKAKU = 'https://www.pref.chiba.lg.jp/juutaku/boshuu/moushikomishikaku.html';
  var CB_KENEI_KAKUDAI = 'https://www.pref.chiba.lg.jp/juutaku/chintai/annai/deregulation.html';
  var CB_KENEI = 'https://www.pref.chiba.lg.jp/juutaku/chintai/annai/';
  var CC_SUMASAPO = 'https://www.city.chiba.jp/toshi/kenchiku/jutakuseisaku/sumasapochiba.html';
  var CC_NYUKYO = 'https://www.city.chiba.jp/toshi/kenchiku/jutakuseisaku/07_nyukyoshien.html';
  var CC_SHIEI_FAQ = 'https://www.city.chiba.jp/faq/toshi/kenchiku/jutakuseibi/1184.html';
  var CC_SHIEI_JKK = 'https://www.cjkk.or.jp/shiei/';
  var CC_JUKYO = 'https://www.city.chiba.jp/hokenfukushi/hogo/jyukyokakuhokyuhukinn.html';
  // 茨城県
  var IB_KYOGIKAI = 'https://www.pref.ibaraki.jp/doboku/jutaku/minkan/06kodate/kyoju-shien-kyougikai.html';
  var IB_HOJIN = 'https://www.pref.ibaraki.jp/doboku/jutaku/minkan/05chintai/jutakusafetynet/shiteihojin.html';
  var IB_HOJIN_GUIDE = 'https://www.pref.ibaraki.jp/doboku/jutaku/minkan/05chintai/jutakusafetynet/documents/guidebook_hp_202602.pdf';
  var IB_KENEI = 'https://www.pref.ibaraki.jp/doboku/jutaku/kanri/04kenei/annai.html';
  var IB_KENEI_KAISEI = 'https://www.pref.ibaraki.jp/doboku/jutaku/kanri/04kenei/20240401kaisei.html';
  var IB_KENEI_GAIYO = 'https://www.pref.ibaraki.jp/doboku/jutaku/kanri/04kenei/gaiyou.html';
  var IB_IJKC = 'http://www.ijkc.jp/';
  // 栃木県
  var TG_KYOGIKAI = 'https://www.pref.tochigi.lg.jp/h11/tochigi-kyojyushien.html';
  var TG_HOJIN = 'https://www.pref.tochigi.lg.jp/h11/town/jyuutaku/jyuutaku/01_shienhouzin.html';
  var TG_HOJIN_PDF = 'https://www.pref.tochigi.lg.jp/h11/town/jyuutaku/jyuutaku/documents/houzinichiran20260710.pdf';
  var TG_GUIDE = 'https://www.pref.tochigi.lg.jp/h11/documents/kyojushien_guide_2026_nombre_web.pdf';
  var TG_KENEI = 'https://www.pref.tochigi.lg.jp/h11/town/jyuutaku/kouei/kenei.html';
  // 群馬県
  var GM_HOJIN = 'https://www.pref.gunma.jp/page/5674.html';
  var GM_HOJIN_PDF = 'https://www.pref.gunma.jp/uploaded/attachment/716306.pdf';
  var GM_SODAN = 'https://www.pref.gunma.jp/page/7557.html';
  var GM_KENEI = 'https://www.pref.gunma.jp/04/h7300121.html';
  var GM_KENEI_JKK = 'https://www.gunma-jkk.or.jp/kenei/';
  var GM_KENEI_SHIKAKU = 'https://www.gunma-jkk.or.jp/kenei/shikaku/';

  /* ───────── 共通の文 ───────── */
  var HOJIN_WHAT = '「居住支援法人」は、部屋さがしの相談にのったり、入居のあとに見守ったりする、県が指定した団体です。';
  var HOJIN_WHO = '住まいさがしに困っている人（収入が少ない人、障害のある人、外国にルーツのある人、子育て中の人など）。法人ごとに、受けつける人の範囲と、できること（相談・保証・見守りなど）がちがいます。';
  var HOJIN_ASK = ['ひとり暮らしを始める若い人の部屋さがしを手伝ってくれる法人はどれですか？', '相談にお金はかかりますか？', '保証人がいなくても相談できますか？'];
  var HOJIN_CAUTION = '法人によっては、高齢者だけ、障害のある人だけなど、対象をしぼっているところがあります。一覧の「対象者」の欄を見てから連絡しよう。相談の前に、国の「身元保証人確保対策事業」（施設長などが保証人になれる仕組み）も確かめておくと話が早いです。';
  var HOJIN_SUP = '住宅セーフティネット法にもとづく指定法人。業務は家賃債務保証・入居相談・見守り等の生活支援・賃貸人への情報提供・残置物処理等のいずれか（すべてを行うとは限らない）。児童養護施設退所者は法令上の住宅確保要配慮者（省令）に含まれる。';
  var KOEI_WHAT = '県や市がもっている、家賃の安い賃貸住宅です。収入が少なくて住まいに困っている人のためのもので、申し込みが多いときは抽選です。';
  var KOEI_SUP_INCOME = '収入基準の「月15万8,000円」は所得月額（年間所得－控除）÷12。給与の額面ではないので、本人の源泉徴収票等で計算する。入居は原則として募集月の約3か月後。';
  var KYOGIKAI_WHAT = '「居住支援協議会」は、県・市と不動産の団体・福祉の団体が集まって、部屋を借りにくい人の住まいさがしを助ける仕組みです。';

  SM.data.programs.push(
    /* ═══════════════ 神奈川県 ═══════════════ */
    {
      id: 'kanagawa-kyoju-shien-kyogikai',
      name: { ja: '神奈川県居住支援協議会（あんしん賃貸の相談窓口）', en: 'Kanagawa Housing Support Council (rental advice desk)' },
      hook: { ja: '部屋を借りたいけど、ことわられそうで不安', en: 'I want to rent but fear landlords will turn me down' },
      summary: {
        ja: '神奈川県内の市町村・不動産団体・福祉団体でつくる協議会です。入居をことわらない「あんしん賃貸住宅」と協力不動産店を登録していて、電話で住まいさがしの相談ができます。',
        en: 'A council of Kanagawa municipalities, real-estate and welfare groups. It registers rentals and agents that do not refuse people who struggle to find housing, and takes phone enquiries.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'pref', pref: '14', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '住まいさがしに困っている人（収入が少ない人、高齢の人、障害のある人、外国にルーツのある人、子育て中の人など）。' },
      how: { ja: '協議会の相談窓口（045-664-6896）に電話します。登録された部屋は「かながわあんしん賃貸住宅検索システム」でも見られます。' },
      where: { ja: '神奈川県居住支援協議会 事務局（公益社団法人かながわ住まいまちづくり協会）' },
      docs: [],
      ask: ['若い人のひとり暮らしでも、あんしん賃貸住宅に申しこめますか？', '保証人がいないとき、どうしたらいいですか？', '住んでいる市の窓口も教えてもらえますか？'],
      caution: { ja: '部屋そのものを貸してくれる窓口ではなく、受け入れてくれる不動産店や部屋をさがす手助けです。「児童養護施設を出た人」という区分はページにのっていませんが、「収入が少ない人」としてふくまれます。' },
      supporter: { ja: KYOGIKAI_WHAT + ' かながわあんしん賃貸支援事業（高齢者・障害者・外国人・子育て世帯の入居を拒まない住宅と協力不動産店の登録）を協議会が実施。事務局は公益社団法人かながわ住まいまちづくり協会（まちきょう）。県の所管は県土整備局 住宅計画課 民間住宅グループ 045-210-6557。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['14'] },
      deadline: { ja: 'いつでも相談できます', en: 'Any time', leaveMonths: -4, months: null, always: true },
      contact: {
        phone: '045-664-6896', phoneLabel: '神奈川県居住支援協議会 相談窓口', line: null, chat: null, web: KN_KYOJU,
        hours: { ja: '平日 9時〜17時', en: 'Weekdays 9:00–17:00' }
      },
      locations: [],
      source: src('神奈川県（居住支援・住宅セーフティネット制度）', KN_KYOJU),
      sources2: [{ org: '神奈川県居住支援協議会', url: KN_MACHIKYO }, { org: '神奈川県（住まい探しに役立つ情報）', url: KN_SUMAI }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'kanagawa-kyoju-shien-hojin',
      name: { ja: '神奈川県の居住支援法人（部屋さがしを手伝う団体の一覧）', en: 'Kanagawa housing-support organizations (official list)' },
      hook: { ja: '部屋さがしを、いっしょにやってくれる人がほしい', en: 'I want someone to help me find a place' },
      summary: {
        ja: HOJIN_WHAT + '神奈川県では2026年10月1日時点で51の法人が指定されています。一覧から、自分に合う団体をさがして連絡します。',
        en: 'Organizations designated by Kanagawa to help with finding a rental, guarantees and follow-up. 51 were designated as of 1 Oct 2026; pick one from the list and contact it.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'pref', pref: '14', right: false,
      amount: null, repay: null,
      who: { ja: HOJIN_WHO },
      how: { ja: '県のページの一覧（PDF）で、住んでいる地域と「対象者」を見て、法人に直接連絡します。どこに連絡すればいいかわからないときは、県の住宅計画課（045-210-6557）か、居住支援協議会の相談窓口に聞いてみよう。' },
      where: { ja: '各法人（県の一覧から選ぶ）' },
      docs: [],
      ask: HOJIN_ASK,
      caution: { ja: HOJIN_CAUTION },
      supporter: { ja: HOJIN_SUP + ' 指定法人には かながわ外国人すまいサポートセンター、ワンエイド、DV対策センター、住まいるさがみはら 等を含む。一覧PDF: /documents/30594/itiran_r081001.pdf（業務地域・対象者・電話）。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['14'] },
      deadline: null,
      contact: { phone: '045-210-6557', phoneLabel: '神奈川県 住宅計画課 民間住宅グループ', line: null, chat: null, web: KN_HOJIN, hours: null },
      locations: [],
      source: src('神奈川県（住宅確保要配慮者居住支援法人の指定について）', KN_HOJIN),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'kanagawa-kenei-jutaku',
      name: { ja: '神奈川県営住宅（ひとりでも申しこめる住宅あり）', en: 'Kanagawa prefectural public housing' },
      hook: { ja: '家賃の安い部屋に、ひとりで住みたい', en: 'I want a cheap place of my own' },
      summary: {
        ja: KOEI_WHAT + '神奈川県には「一般単身者向住宅（特定の資格なし）」があり、成人なら共通の資格だけでひとりでも申しこめます。県外に住んでいる人も申しこめます。',
        en: 'Low-rent housing run by Kanagawa. Some "general single-person" units need only the common conditions, so an adult can apply alone. People living outside Kanagawa may apply.'
      },
      cat: ['housing'],
      kind: 'housing', basis: 'pref', pref: '14', right: false,
      amount: null, repay: null,
      who: { ja: '成人で、住まいに困っている理由（家賃が高い、せまい、立ち退きを言われている など）があり、収入が基準の中の人。税金や県営住宅の家賃をためていないこと。ひとりで申しこめるのは「一般単身者向住宅」など決まった住宅です。' },
      how: { ja: '5月と11月の定期募集（抽選）と、4月から翌年3月までの常時募集（原則先着順）があります。「募集のしおり」を配布場所でもらい、郵送で申しこみます（窓口では受けつけません）。' },
      where: { ja: '一般社団法人かながわ土地建物保全協会 入居者募集担当（郵送で申込み）' },
      docs: ['入居申込書（しおりについている）', '返信用の110円切手', '当選後: 住民票・収入のわかる書類など（二次審査）'],
      ask: ['ひとりで申しこめる住宅は、今どこが募集中ですか？', '私の収入で入居収入基準に入りますか？', '施設を出たあとで住所がまだ決まっていなくても申しこめますか？'],
      caution: { ja: '抽選なので、かならず入れるわけではありません。入居までに時間がかかるので、ほかの住まいの方法も同時に考えよう。家賃は収入と部屋で毎年決まります。' },
      supporter: { ja: '一般単身者向住宅（特定の資格なし）は共通資格のみで応募可（申込者が成人）。特定の資格ありの単身向けは60歳以上・障害・生活保護受給・DV被害者等。令和8年10月常時募集は令和9年3月31日（消印）まで受付、しおり配布も同期間。入居収入基準の額はページに記載なし（しおりで確認）。問合せ: 住宅営繕事務所 入居管理課 045-285-1014。' },
      effort: 'mid',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: ADULT, areas: ['14'] },
      deadline: { ja: '定期募集は5月と11月。常時募集（先着順）は4月〜翌年3月', en: 'Lottery rounds in May and November; first-come applications April–March', leaveMonths: -6, months: [5, 11], always: true },
      contact: {
        phone: '045-201-3673', phoneLabel: 'かながわ土地建物保全協会 入居者募集担当', line: null, chat: null, web: KN_KENEI,
        hours: { ja: '平日 8時30分〜17時15分', en: 'Weekdays 8:30–17:15' }
      },
      locations: [
        loc('かながわ土地建物保全協会 入居者募集担当（神奈川県住宅供給公社ビル 7階）', '14100', '神奈川県横浜市中区日本大通33', 35.446369, 139.642365, '045-201-3673', '平日 8:30–17:15', '申込みは郵送のみ。電話での問い合わせ先')
      ],
      source: src('神奈川県（県営住宅について）', KN_KENEI),
      sources2: [{ org: '神奈川県（県営住宅申込資格について）', url: KN_KENEI_SHIKAKU }, { org: '神奈川県（県営住宅 常時募集のお知らせ）', url: KN_KENEI_JOJI }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'yokohama-sumai-support',
      name: { ja: 'よこはま住まいサポート相談窓口（横浜市居住支援協議会）', en: 'Yokohama Sumai Support desk (housing support council)' },
      hook: { ja: '横浜で部屋をさがしたいけど、どこに相談すればいいかわからない', en: 'I need to find a place in Yokohama and do not know where to start' },
      summary: {
        ja: '横浜市の無料の住まい相談窓口です。「児童養護施設等を出た人」も相談できる人としてはっきり書かれています。支援の窓口・家賃の助成・入居をことわらない住宅の紹介、民間の部屋のさがし方を教えてくれます。',
        en: 'Yokohama\'s free housing advice desk. It explicitly names people who left children\'s homes among those it serves, and points you to support offices, rent help, safety-net rentals and how to search private rentals.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'local', pref: '14', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '横浜市で住まいさがしに困っている人。市のページは、収入が少ない人、高齢の人、障害のある人、子育て中の家庭、外国人、児童養護施設等を出た人などを対象にあげています。' },
      how: { ja: '電話（045-451-7812）か、市のページの問い合わせフォームから。窓口に行くときは予約が必要です。' },
      where: { ja: '横浜市住宅供給公社 6階（神奈川区栄町）' },
      docs: [],
      ask: ['児童養護施設を出てひとり暮らしをします。どんな部屋さがしの方法がありますか？', '保証人や緊急連絡先がいません。どうすればいいですか？', '引っこしの初期費用を助けてくれる制度はありますか？'],
      caution: { ja: '部屋を借りるには、初期費用、連絡のつく電話、緊急連絡先、保証人か保証会社が必要です。そろっていなくても、まずそれを整えるところから手伝ってくれます。生活そのものに困っているときは、区役所の福祉の窓口にも相談しよう。' },
      supporter: { ja: '横浜市居住支援協議会（平成30年10月設立）の相談窓口。市の定義する住宅確保要配慮者に「児童養護施設等退所者」を明記。横浜市住宅供給公社に委託。市の所管: 建築局 住宅政策課 045-671-4121。多言語ページあり。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['14100'] },
      deadline: { ja: 'いつでも相談できます（窓口は予約制）', en: 'Any time (visits by appointment)', leaveMonths: -4, months: null, always: true },
      contact: {
        phone: '045-451-7812', phoneLabel: 'よこはま住まいサポート相談窓口', line: null, chat: 'https://yokohama-kyojushien.jp/consult/', web: YK_KYOGIKAI,
        hours: { ja: '平日 10時〜16時（12時〜13時は休み）', en: 'Weekdays 10:00–16:00 (closed 12–13)' }
      },
      locations: [
        loc('よこはま住まいサポート相談窓口（横浜市住宅供給公社 6階）', '14100', '神奈川県横浜市神奈川区栄町8-1 ヨコハマポートサイドビル6階', 35.468666, 139.629684, '045-451-7812', '平日 10:00–16:00（12–13時休）', '来所は予約制')
      ],
      source: src('横浜市（よこはま住まいサポート／横浜市居住支援協議会）', YK_KYOGIKAI),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'yokohama-shiei-jutaku',
      name: { ja: '横浜市営住宅（4月・10月の募集と常時募集）', en: 'Yokohama municipal public housing' },
      hook: { ja: '横浜で家賃の安い部屋に住みたい', en: 'I want a cheap place in Yokohama' },
      summary: {
        ja: KOEI_WHAT + '横浜市は毎年4月と10月に募集し、そのあと先着順の常時募集もあります。「単身者可」の住宅があります。',
        en: 'Low-rent housing run by the City of Yokohama. Lottery rounds every April and October, then first-come rounds. Some units accept single applicants.'
      },
      cat: ['housing'],
      kind: 'housing', basis: 'local', pref: '14', right: false,
      amount: null, repay: null,
      who: { ja: '成人で、横浜市内に6か月以上住んでいる（または働いている）人。住まいに困っていて、世帯の所得が月15万8,000円以下（高齢・障害・子育てなどの世帯は21万4,000円以下）の人。ひとりで申しこめるのは「単身者可」などの決まった住宅です。' },
      how: { ja: '募集期間に「募集のしおり」を区役所の広報相談係か公社のホームページで手に入れて、郵送かインターネットで申しこみます。常時募集は公社の窓口で先着順です。' },
      where: { ja: '横浜市住宅供給公社 市営住宅課（神奈川区栄町）' },
      docs: ['入居申込書（しおりについている）', '当選後: 住民票・収入のわかる書類など'],
      ask: ['今回、単身者可の住宅はどこですか？', '私の収入で申しこめますか？', '常時募集はいつからですか？'],
      caution: { ja: '抽選で、人気の住宅は当たりにくいです。「お金を払えば優先で入れる」という電話は市とは関係ないので注意。入居まで数か月かかります。' },
      supporter: { ja: '令和8年10月募集は623戸（単身者可の区分あり）、申込み10月9〜23日、抽選は令和9年1月6日。常時募集は令和9年2月26日〜6月11日（公社6階窓口、先着順）。優遇（特認B組 3倍）は母子父子・高齢・障害・低額所得・DV・犯罪被害者世帯等。児童養護施設退所者の区分はなし。' + KOEI_SUP_INCOME },
      effort: 'mid',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: ADULT, areas: ['14100'] },
      deadline: { ja: '定期募集は4月と10月。常時募集（先着順）は2〜6月と8〜12月', en: 'Lottery rounds in April and October; first-come rounds Feb–Jun and Aug–Dec', leaveMonths: -6, months: [4, 10], always: true },
      contact: {
        phone: '045-451-7777', phoneLabel: '横浜市住宅供給公社 市営住宅課', line: null, chat: null, web: YK_SHIEI,
        hours: { ja: '平日 8時45分〜17時15分', en: 'Weekdays 8:45–17:15' }
      },
      locations: [
        loc('横浜市住宅供給公社 市営住宅課（6階）', '14100', '神奈川県横浜市神奈川区栄町8-1 ヨコハマポートサイドビル6階', 35.468666, 139.629684, '045-451-7777', '平日 8:45–17:15', '常時募集の受付窓口。来社相談は事前予約')
      ],
      source: src('横浜市（市営住宅の入居者募集）', YK_SHIEI),
      sources2: [{ org: '横浜市住宅供給公社（市営住宅）', url: YK_KOUSYA }, { org: '横浜市（よくある質問: 市営住宅への入居申込み）', url: YK_SHIEI_FAQ }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'yokohama-jukyo-kakuho',
      name: { ja: '住居確保給付金（横浜市）', en: 'Housing Security Benefit (Yokohama)' },
      hook: { ja: '仕事をやめて、家賃が払えなくなりそう', en: 'I lost my job and cannot keep paying rent' },
      summary: {
        ja: '仕事をやめたり収入が大きく減って家賃が払えないとき、横浜市が家賃を大家さんや不動産会社に直接払ってくれます。ひとり暮らしなら月5万2,000円まで、原則3か月（最長9か月）。返す必要はありません。',
        en: 'If you lost your job or income and cannot pay rent, Yokohama pays your rent directly to the landlord: up to ¥52,000/month for one person, for 3 months (up to 9). No repayment.'
      },
      cat: ['housing', 'money'],
      kind: 'grant', basis: 'local', pref: '14', right: true,
      amount: { ja: '家賃の額（ひとり暮らしは月5万2,000円まで）を原則3か月、最長9か月', en: 'Your rent (≤¥52,000/month for one person) for 3 months, up to 9' },
      repay: 'none',
      who: { ja: '横浜市に住んでいる（住む予定の）人で、仕事をやめて2年以内か、自分のせいではない理由で収入が減った人。ひとり暮らしなら、月の収入が14万4,000円以下で、貯金が55万2,000円以下。ハローワークで仕事をさがすことが条件です。生活保護を受けている人は対象外。' },
      how: { ja: '住んでいる区の区役所 生活支援課に電話して、まず「自立相談支援」の相談をします。そのあと申請書と書類を出します。' },
      where: { ja: '住んでいる区の区役所 生活支援課' },
      docs: ['本人確認書類', '仕事をやめた・収入が減ったことがわかる書類', '収入がわかる書類（給与明細3か月分など）', '通帳の写し（世帯全員分）', '部屋の契約書と、不動産会社に書いてもらう状況通知書'],
      ask: ['私の収入と貯金で対象になりますか？', '申請してから、いつ家賃が払われますか？', '仕事さがしの報告は、月に何回ですか？'],
      caution: { ja: '家賃をためる前に相談するのがいちばん大事。もらっている間は、月4回の面談、月2回のハローワーク相談、週1回以上の応募が必要です。引っこしの初期費用は対象外です。' },
      supporter: { ja: '生活困窮者自立支援法の住居確保給付金（横浜市実施）。上限家賃額 1人52,000円・2人62,000円・3〜5人68,000円。基準額1人92,000円、収入基準額144,000円、金融資産552,000円以下。各区生活支援課生活支援係が窓口。市の所管: 健康福祉局 生活支援課 045-671-2403。転居費用補助は別制度。' },
      effort: 'high',
      for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: ADULT, areas: ['14100'] },
      deadline: { ja: 'いつでも。家賃が払えなくなりそうなら、すぐ区役所へ', en: 'Any time — ask as soon as rent becomes hard', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '045-671-2403', phoneLabel: '横浜市 健康福祉局 生活支援課（申請は区役所の生活支援課）', line: null, chat: null, web: YK_JUKYO,
        hours: { ja: '平日 8時45分〜17時15分', en: 'Weekdays 8:45–17:15' }
      },
      locations: [],
      source: src('横浜市（住居確保給付金（家賃補助））', YK_JUKYO),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'kawasaki-sumai-sodan',
      name: { ja: 'すまいの相談窓口（川崎市居住支援協議会）', en: 'Kawasaki housing consultation desk' },
      hook: { ja: '川崎で部屋をさがしたいけど、ひとりでは不安', en: 'I need help finding a place in Kawasaki' },
      summary: {
        ja: '川崎市と川崎市住宅供給公社がやっている無料の住まい相談です。自分で部屋をさがすのがむずかしい人に、受け入れてくれる不動産店や福祉の支援を紹介します。電話・来所・オンラインで相談できます。',
        en: 'A free housing advice desk run by Kawasaki City and its housing corporation. It introduces agents and welfare support to people who struggle to find a rental on their own. Phone, in person or online.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'local', pref: '14', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '自分で住まいをさがすのがむずかしい人（高齢の人、障害のある人、外国人、ひとり親、DV被害者など）で、家賃が払えて、親族や知人などの緊急連絡先を用意できる人。支援者が代わりに相談してもいいです。' },
      how: { ja: 'まず電話（044-244-7590）で状況を話します。来所は電話で日時を決めてから。オンライン相談は5営業日前までに電話で予約します。' },
      where: { ja: '川崎市住宅供給公社 2階（川崎区砂子）' },
      docs: [],
      ask: ['若い人のひとり暮らしでも相談できますか？', '緊急連絡先になってくれる人がいません。どうしたらいいですか？', '保証会社を使う市の制度（居住支援制度）は使えますか？'],
      caution: { ja: '市営住宅に優先で入れたり、家賃を補助したりする窓口ではありません。部屋を直接紹介するのではなく、合いそうな不動産店につないでくれます。' },
      supporter: { ja: '川崎市居住支援協議会（平成28年6月設立）の相談窓口。相談対象は「原則、ご自身での住まい探しが難しい方」で、家賃支払い能力と緊急連絡人の確保が条件。住まいのサロン（中原区上小田中）で第1・3水曜にオンライン相談。市の所管: まちづくり局 住宅整備推進課 044-200-2997。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['14130'] },
      deadline: { ja: 'いつでも相談できます（来所は電話で予約）', en: 'Any time (visits by appointment)', leaveMonths: -4, months: null, always: true },
      contact: {
        phone: '044-244-7590', phoneLabel: 'すまいの相談窓口（川崎市住宅供給公社）', line: null, chat: null, web: KW_SODAN,
        hours: { ja: '平日 8時30分〜12時・13時〜17時', en: 'Weekdays 8:30–12:00, 13:00–17:00' }
      },
      locations: [
        loc('すまいの相談窓口（川崎市住宅供給公社 2階）', '14130', '神奈川県川崎市川崎区砂子1-2-4', 35.531918, 139.701279, '044-244-7590', '平日 8:30–12:00／13:00–17:00', '来所は先に電話で日時を決める')
      ],
      source: src('川崎市（すまいの相談窓口）', KW_SODAN),
      sources2: [{ org: '川崎市（川崎市居住支援協議会）', url: KW_KYOGIKAI }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'kawasaki-kyoju-shien-seido',
      name: { ja: '川崎市居住支援制度（保証人がいなくても借りられる仕組み）', en: 'Kawasaki guarantor-free rental support' },
      hook: { ja: '家賃は払えるのに、保証人がいなくて部屋を借りられない', en: 'I can pay rent but have no guarantor' },
      summary: {
        ja: '保証人がいなくて民間のアパートを借りられない人のために、川崎市が指定した保証会社が保証人の代わりになる制度です。対象には「児童福祉施設等を出た人（原則25歳未満）」がふくまれています。',
        en: 'For people who can pay rent but have no guarantor: a guarantee company designated by Kawasaki City stands in. People who left child-welfare facilities (generally under 25) are among those covered.'
      },
      cat: ['housing'],
      kind: 'service', basis: 'local', pref: '14', right: false,
      amount: { ja: '保証料は家賃＋共益費の35%を2年ごと（家賃5万円なら1万7,500円）。火災保険も必要', en: 'Guarantee fee 35% of monthly rent + fees every 2 years (¥17,500 on ¥50,000 rent); fire insurance needed' },
      repay: null,
      who: { ja: '川崎市の児童福祉施設を出た人、または川崎市が措置して市外の施設を出た人（原則25歳未満）。ほかに、60歳以上の人、外国人、ひとり親、障害のある人、DVの一時保護施設を出た人なども対象です。自分で生活でき、家賃を払える安定した収入があり、緊急連絡先を用意できることが条件です。' },
      how: { ja: '市のページにある「協力不動産店」の一覧から店を選び、そこで利用申込書を出して、保証会社の審査を受けます。' },
      where: { ja: '協力不動産店（市のページに区ごとの一覧）／問い合わせは川崎市住宅供給公社 管理営業課' },
      docs: ['川崎市居住支援制度利用申込書（様式第5号）', '収入がわかるもの（保証会社の審査）'],
      ask: ['児童養護施設を出た人の区分で申しこめますか？ 施設からの書類はいりますか？', '保証料はいつ、だれに払いますか？', 'この制度が使える部屋をあつかっている不動産店はどこですか？'],
      caution: { ja: '家賃の補助や、部屋の紹介をする制度ではありません。借金や家賃の滞納があると保証会社の審査に通らないことがあります。国の「身元保証人確保対策事業」（施設長が保証人になれる仕組み）とどちらが使いやすいか、施設の職員や児童相談所にも聞いてみよう。' },
      supporter: { ja: '対象区分「児童福祉施設等退所者等」: 市の施設または市が措置した市外施設を退所する（した）者で原則25歳未満。保証会社が家賃滞納・退去時の原状回復費等を保証。通訳派遣・見守りも。保証料35%/2年、火災保険（借家人賠償・個人賠償 各1,000万円以上）約1〜1.5万円/2年。申込書は区分別PDF（児童福祉施設等退所者用あり）。問合せ: 川崎市住宅供給公社 管理営業課 044-244-7590。' },
      effort: 'mid',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['14130'] },
      deadline: { ja: '部屋をさがすとき。契約の前に不動産店で申しこみます', en: 'When you look for a room, before you sign', leaveMonths: -3, months: null, always: true },
      contact: { phone: '044-244-7590', phoneLabel: '川崎市住宅供給公社 管理営業課', line: null, chat: null, web: KW_SEIDO, hours: null },
      locations: [],
      source: src('川崎市（川崎市居住支援制度について）', KW_SEIDO),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'kawasaki-shiei-jutaku',
      name: { ja: '川崎市営住宅（年4回の募集・60歳未満のひとり暮らし枠あり）', en: 'Kawasaki municipal public housing' },
      hook: { ja: '川崎で家賃の安い部屋に、ひとりで住みたい', en: 'I want a cheap place of my own in Kawasaki' },
      summary: {
        ja: KOEI_WHAT + '川崎市は6月・9月・12月・3月に募集します。60歳未満のひとり暮らしでも申しこめる「定期使用許可（5年）」の単身者向け区分があります。',
        en: 'Low-rent housing run by Kawasaki City, with lottery rounds in June, September, December and March. A fixed-term (5-year) category lets single people under 60 apply.'
      },
      cat: ['housing'],
      kind: 'housing', basis: 'local', pref: '14', right: false,
      amount: null, repay: null,
      who: { ja: '川崎市内に住んでいる、または市内の勤務先に1年以上勤めている人で、住まいに困っていて、世帯の所得が月15万8,000円以下（高齢・障害などの世帯は21万4,000円以下）の人。60歳未満のひとり暮らしは、戸籍上の配偶者がいない人が、5年の期限つきで申しこめます。' },
      how: { ja: '募集期間に申込書のセットを公社・区役所などでもらって郵送か持ちこみで出すか、「オンライン手続かわさき」から申しこみます。応募がなかった部屋は、あとで先着順の常時募集に出ます。' },
      where: { ja: '川崎市住宅供給公社 住宅部 市営住宅管理課（川崎区砂子）' },
      docs: ['入居申込書（配布セット）', '当選後: 住民票・収入のわかる書類など'],
      ask: ['60歳未満の単身者向け区分は、今回どの住宅ですか？', '5年の定期使用許可のあとは、どうなりますか？', '私の収入で申しこめますか？'],
      caution: { ja: '抽選です。60歳未満の単身者向けは5年の期限つき（定期使用許可）で、更新ではなく退去が前提です。次の募集は令和8年12月の予定。' },
      supporter: { ja: '募集は6・9・12・3月（年4回）。令和8年度第2回は9月18日締切、抽選11月12日。単身者向け（60歳以上・障害・生活保護等）と「単身者向け（60歳未満・定期使用許可）」区分: 戸籍上配偶者のいない単身者で5年の定期使用に同意する人。' + KOEI_SUP_INCOME + ' 市の所管: まちづくり局 市営住宅管理課 044-200-2950。' },
      effort: 'mid',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: ADULT, areas: ['14130'] },
      deadline: { ja: '募集は6月・9月・12月・3月。応募のなかった部屋は先着順の常時募集', en: 'Rounds in June, September, December and March; leftover units first-come', leaveMonths: -6, months: [3, 6, 9, 12], always: true },
      contact: { phone: '044-244-7578', phoneLabel: '川崎市住宅供給公社 市営住宅管理課（募集専用）', line: null, chat: null, web: KW_SHIEI, hours: null },
      locations: [
        loc('川崎市住宅供給公社 市営住宅管理課（川崎砂子ビル）', '14130', '神奈川県川崎市川崎区砂子1-2-4', 35.531918, 139.701279, '044-244-7578', '', '申込書の配布・受入箱あり')
      ],
      source: src('川崎市（市営住宅の定期募集（抽選）について）', KW_SHIEI),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'sagamihara-shiei-jutaku',
      name: { ja: '相模原市営住宅（5月・11月の募集と随時募集）', en: 'Sagamihara municipal public housing' },
      hook: { ja: '相模原で家賃の安い部屋に住みたい', en: 'I want a cheap place in Sagamihara' },
      summary: {
        ja: KOEI_WHAT + '相模原市は毎年5月と11月に募集し、空きが出たときは電話で先着順の随時募集をします。単身者向け住宅があります。',
        en: 'Low-rent housing run by Sagamihara City. Lottery rounds every May and November, plus first-come phone applications when units are vacant. Some units are for single people.'
      },
      cat: ['housing'],
      kind: 'housing', basis: 'local', pref: '14', right: false,
      amount: null, repay: null,
      who: { ja: '18歳以上で、相模原市内に1年以上住んでいて、住まいに困っている理由があり、世帯の所得が月15万8,000円以下（高齢・障害・子育ての世帯は21万4,000円以下）の人。市税をためていないこと。ひとりで申しこめるのは「単身者向け住宅」です。' },
      how: { ja: '定期募集は「募集のしおり」を市役所の住宅課や区役所でもらい、郵送で申しこみます（令和8年11月募集は11月2日〜16日の消印まで）。随時募集は住宅課に電話（042-769-8256）で先着順。' },
      where: { ja: '相模原市 住宅課 市営住宅班（中央区中央）／郵送先は指定管理者事務所（南区相模大野）' },
      docs: ['入居申込書（しおりについている）', '二次審査: 住民票・収入のわかる書類など'],
      ask: ['単身者向け住宅は今、募集していますか？', '随時募集の電話受付はいつまでですか？', '施設を出て1年たっていない場合、在住1年の条件はどうなりますか？'],
      caution: { ja: '市内に1年以上住んでいることが条件です。抽選で、障害・ひとり親・子育て世帯などは当たりやすくなる優遇（2〜3倍）があります。住宅によっては追加の条件があるので、しおりで確認を。' },
      supporter: { ja: '令和8年11月募集: しおり配布・申込み 11月2日〜16日（消印有効）、郵送先は指定管理者事務所（南区相模大野5-29-15 ビルドアート内）。随時募集の電話受付 令和8年8月17日〜令和9年1月29日、8:30〜17:00、先着順。' + KOEI_SUP_INCOME },
      effort: 'mid',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: ADULT, areas: ['14150'] },
      deadline: { ja: '定期募集は5月と11月。空きがあれば電話の随時募集（先着順）', en: 'Rounds in May and November; first-come phone applications when vacant', leaveMonths: -6, months: [5, 11], always: false },
      contact: {
        phone: '042-769-8256', phoneLabel: '相模原市 住宅課 市営住宅班', line: null, chat: null, web: SG_SHIEI,
        hours: { ja: '随時募集の電話受付 8時30分〜17時', en: 'Phone applications 8:30–17:00' }
      },
      locations: [
        loc('相模原市 住宅課（市役所第1別館 2階）', '14150', '神奈川県相模原市中央区中央2-11-15', 35.571014, 139.373825, '042-769-8256', '', 'しおりの配布場所のひとつ。随時募集は電話のみ'),
        loc('市営住宅 指定管理者事務所（ビルドアート内）', '14150', '神奈川県相模原市南区相模大野5-29-15', 35.530762, 139.431885, null, '', '定期募集の郵送先・しおり配布場所')
      ],
      source: src('相模原市（市営住宅について）', SG_SHIEI),
      sources2: [{ org: '相模原市（よくある質問: 市営住宅の申込資格）', url: SG_SHIEI_FAQ }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    /* ═══════════════ 埼玉県 ═══════════════ */
    {
      id: 'saitama-kyoju-shien-kyogikai',
      name: { ja: '埼玉県住まい安心支援ネットワーク（埼玉県居住支援協議会）', en: 'Saitama Housing Safety Network (housing support council)' },
      hook: { ja: '埼玉で部屋を借りたいけど、ことわられそうで不安', en: 'I want to rent in Saitama but fear being turned down' },
      summary: {
        ja: '埼玉県の居住支援協議会です。部屋を借りにくい人の入居を手伝う「あんしん賃貸住まいサポート店」をさがせて、大宮駅の「住まい相談プラザ」で住まいの相談ができます。',
        en: 'Saitama\'s housing support council. Search for "Anshin" support real-estate shops, and get housing advice at the Sumai Consultation Plaza in Omiya Station.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'pref', pref: '11', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '住まいさがしに困っている人（収入が少ない人、高齢の人、障害のある人、子育て中の家庭、外国人など）。' },
      how: { ja: 'ネットワークのサイトで「あんしん賃貸住まいサポート店」をさがして相談するか、大宮駅西口コンコースの「住まい相談プラザ」（048-658-3017）へ。' },
      where: { ja: '埼玉県住宅供給公社 住まい相談プラザ（大宮駅西口コンコース内）' },
      docs: [],
      ask: ['若い人のひとり暮らしの部屋さがしを手伝ってくれるサポート店はありますか？', '保証人がいないとき、どんな方法がありますか？', '県営住宅と民間の部屋、どちらが早く入れますか？'],
      caution: { ja: '部屋そのものを貸す窓口ではなく、受け入れてくれる不動産店や制度をさがす手助けです。「児童養護施設を出た人」という区分はページにありませんが、「収入が少ない人」としてふくまれます。' },
      supporter: { ja: KYOGIKAI_WHAT + ' 2011年設立、108団体（59市町村）。セーフティネット部会と子育て支援部会。事務局は埼玉県住宅供給公社内 048-829-2865。住まい相談プラザの時間は県の県営住宅ページに「10時〜18時30分、12/29〜1/3のみ休み」。県の所管: 都市整備部 住宅課 マンション・居住支援担当 048-830-5573。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['11'] },
      deadline: { ja: 'いつでも相談できます', en: 'Any time', leaveMonths: -4, months: null, always: true },
      contact: {
        phone: '048-658-3017', phoneLabel: '埼玉県住宅供給公社 住まい相談プラザ', line: null, chat: null, web: ST_SASN,
        hours: { ja: '10時〜18時30分（12月29日〜1月3日は休み）', en: '10:00–18:30 (closed Dec 29–Jan 3)' }
      },
      locations: [
        loc('住まい相談プラザ（大宮駅西口コンコース内）', '11100', '埼玉県さいたま市大宮区錦町630', 35.904289, 139.624069, '048-658-3017', '10:00–18:30（12/29〜1/3休）', '県営住宅・市営住宅の募集案内の配布場所でもある')
      ],
      source: src('埼玉県住まい安心支援ネットワーク（埼玉県居住支援協議会）', ST_SASN),
      sources2: [{ org: '埼玉県（民間賃貸住宅を活用した住宅セーフティネット）', url: ST_SAFETY }, { org: '埼玉県（県営住宅入居者募集のご案内・住まい相談プラザの時間）', url: ST_KENEI }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'saitama-kyoju-shien-hojin',
      name: { ja: '埼玉県の居住支援法人（部屋さがしを手伝う団体の一覧）', en: 'Saitama housing-support organizations (official list)' },
      hook: { ja: '部屋さがしを、いっしょにやってくれる人がほしい', en: 'I want someone to help me find a place' },
      summary: {
        ja: HOJIN_WHAT + '埼玉県では33の法人が指定されています（2026年10月21日のページ）。一覧で、支援する地域と「入居支援」「見守り」などの○を見て、合う団体に連絡します。',
        en: 'Organizations designated by Saitama to help with finding a rental, guarantees and follow-up. 33 are listed (page dated 21 Oct 2026); check each one\'s area and services and contact it.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'pref', pref: '11', right: false,
      amount: null, repay: null,
      who: { ja: HOJIN_WHO },
      how: { ja: '県のページの一覧（法人名を押すと個票が開きます）で、住む地域と支援の内容を見て、法人に直接連絡します。' },
      where: { ja: '各法人（県の一覧から選ぶ）' },
      docs: [],
      ask: HOJIN_ASK,
      caution: { ja: HOJIN_CAUTION },
      supporter: { ja: HOJIN_SUP + ' 埼玉の指定法人には 埼玉県社会福祉士会（県内全域・全要配慮者）、コンパスナビ（クローバーハウス運営）、ほっとプラス、believe、助け合い村 などを含む。一覧は Excel（/documents/114783/081020-1kyozyushienichiran.xlsx）。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['11'] },
      deadline: null,
      contact: { phone: '048-830-5573', phoneLabel: '埼玉県 住宅課 マンション・居住支援担当', line: null, chat: null, web: ST_HOJIN, hours: null },
      locations: [],
      source: src('埼玉県（住宅確保要配慮者居住支援法人の指定状況について）', ST_HOJIN),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'saitama-kenei-jutaku',
      name: { ja: '埼玉県営住宅（1・4・7・10月の募集、単身住宅あり）', en: 'Saitama prefectural public housing' },
      hook: { ja: '埼玉で家賃の安い部屋に住みたい', en: 'I want a cheap place in Saitama' },
      summary: {
        ja: KOEI_WHAT + '埼玉県は1月・4月・7月・10月の1日〜21日に申込みを受けつけ、支所では先着順の随時募集もあります。「単身住宅」はひとりでも申しこめます。',
        en: 'Low-rent housing run by Saitama Prefecture. Applications on the 1st–21st of January, April, July and October, plus first-come vacancies at branch offices. Single-person units exist.'
      },
      cat: ['housing'],
      kind: 'housing', basis: 'pref', pref: '11', right: false,
      amount: null, repay: null,
      who: { ja: '埼玉県内に住んでいる、または働いている人で、住まいに困っていて、世帯の所得が月15万8,000円以下（高齢・障害などの世帯は21万4,000円以下）の人。税金や公的な住宅の家賃をためていないこと。ひとりで申しこめるのは「単身住宅」「単身車イス住宅」です。' },
      how: { ja: '募集期間中だけ配られる「県営住宅入居者募集案内」を市役所・公社・住まい相談プラザなどでもらい、郵送（1日〜21日の消印）かウェブで申しこみます。随時募集は公社の支所で先着順。' },
      where: { ja: '埼玉県住宅供給公社 県営住宅課（浦和）／支所（大宮・川越・熊谷・岩槻）' },
      docs: ['入居申込書（募集案内についている）', '当選後: 住民票・収入のわかる書類など（資格審査）'],
      ask: ['単身住宅は、今回どの団地で募集していますか？ ひとりで申しこむ条件はなんですか？', '私の収入で申しこめますか？', '随時募集で空いている部屋はありますか？'],
      caution: { ja: '抽選です。入居は募集月の約3か月後（1月募集なら3月23日から）。単身住宅にひとりで申しこめる条件は募集案内で確認を。' },
      supporter: { ja: '募集月 1・4・7・10月（1日〜21日、1月は4日〜）。入居は募集月の翌々月23日〜。単身住宅・単身車イス住宅は同居親族要件の対象外（単身で申込める条件の詳細は公社の「住宅の種類による申込み資格」ページ）。' + KOEI_SUP_INCOME + ' 県の所管: 都市整備部 住宅課 048-830-5564。' },
      effort: 'mid',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: ADULT, areas: ['11'] },
      deadline: { ja: '募集は1月・4月・7月・10月の1日〜21日。支所では先着順の随時募集も', en: 'Apply on the 1st–21st of Jan, Apr, Jul and Oct; first-come vacancies at branches', leaveMonths: -6, months: [1, 4, 7, 10], always: true },
      contact: {
        phone: '048-829-2875', phoneLabel: '埼玉県住宅供給公社 県営住宅課', line: null, chat: null, web: ST_KENEI,
        hours: { ja: '平日 8時30分〜17時15分', en: 'Weekdays 8:30–17:15' }
      },
      locations: [
        loc('埼玉県住宅供給公社 本社 県営住宅課', '11100', '埼玉県さいたま市浦和区仲町3-12-10', 35.859684, 139.647125, '048-829-2875', '平日 8:30–17:15', '郵送の申込先'),
        loc('住まい相談プラザ（大宮駅西口コンコース内）', '11100', '埼玉県さいたま市大宮区錦町630', 35.904289, 139.624069, '048-658-3017', '10:00–18:30（12/29〜1/3休）', '募集案内の配布場所'),
        loc('埼玉県住宅供給公社 大宮支所', '11100', '埼玉県さいたま市大宮区寿能町2-131', 35.921761, 139.639435, '048-645-1772', '平日 8:30–17:15', '随時募集（先着順）の受付'),
        loc('埼玉県住宅供給公社 岩槻支所', '11100', '埼玉県さいたま市岩槻区諏訪3-3', 35.968174, 139.706329, '048-794-7146', '平日 8:30–17:15', '随時募集（先着順）の受付'),
        loc('埼玉県住宅供給公社 川越支所', '11201', '埼玉県川越市的場2218-4 ベルアート301号室', 35.92738, 139.442108, '049-227-6408', '平日 8:30–17:15', '随時募集（先着順）の受付'),
        loc('埼玉県住宅供給公社 熊谷支所', '11202', '埼玉県熊谷市赤城町1-147-2', 36.146683, 139.362503, '048-524-7963', '平日 8:30–17:15', '随時募集（先着順）の受付')
      ],
      source: src('埼玉県（県営住宅入居者募集のご案内）', ST_KENEI),
      sources2: [{ org: '埼玉県住宅供給公社（県営住宅をお探しの方）', url: ST_KENEI_JKK }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'saitama-city-shiei-jutaku',
      name: { ja: 'さいたま市営住宅（4・8・12月の募集）', en: 'Saitama City municipal public housing' },
      hook: { ja: 'さいたま市で家賃の安い部屋に住みたい', en: 'I want a cheap place in Saitama City' },
      summary: {
        ja: KOEI_WHAT + 'さいたま市は4月・8月・12月の1日〜21日に申込みを受けつけます。ひとりで申しこめる「単身住宅」は、60歳以上・障害のある人・生活保護を受けている人・DVや犯罪の被害にあった人など、決まった人だけです。',
        en: 'Low-rent housing run by Saitama City; applications on the 1st–21st of April, August and December. Single-person units are limited to set groups (60+, disability, public assistance, DV or crime victims, etc.).'
      },
      cat: ['housing'],
      kind: 'housing', basis: 'local', pref: '11', right: false,
      amount: null, repay: null,
      who: { ja: 'さいたま市内に住んでいる、または働いている人で、同居する親族がいて、住まいに困っていて、世帯の所得が月15万8,000円以下（裁量世帯は21万4,000円以下）の人。ひとり暮らしで申しこめるのは、60歳以上、障害者手帳のある人、生活保護を受けている人、DV被害者、犯罪被害者などに限られます。40歳未満の夫婦や子育て世帯向けの住戸もあります。' },
      how: { ja: '募集期間中だけ配られる「募集の案内」を区役所のくらし応援室・公社・住まい相談プラザなどでもらい、ウェブか郵送（21日の消印）で申しこみます。' },
      where: { ja: '埼玉県住宅供給公社 市町村営住宅課／さいたま市 住宅政策課' },
      docs: ['入居申込書（募集の案内についている）', '当選後: 住民票・収入のわかる書類など（資格審査）'],
      ask: ['若い人がひとりで申しこめる住宅はありますか？', '私の収入で申しこめますか？', '県営住宅と両方に申しこめますか？'],
      caution: { ja: '若くて健康なひとり暮らしは、原則このルールでは申しこめません。その場合は県営住宅（単身住宅）や民間の部屋も考えよう。抽選で、入居は募集月の3か月後の21日以降です。' },
      supporter: { ja: '令和8年度の募集概要。単身住宅の資格: 60歳以上、身体障害1〜4級、精神・療育・戦傷病者手帳、被爆者、生活保護受給者等、引揚者5年以内、ハンセン病療養所入所者等、DV被害者、犯罪被害者等。若者夫婦（ともに40歳未満）・子育て世帯向け住戸あり。収入月額 一般158,000円（氷川住宅114,000円）。問合せ: 住宅政策課 048-829-1521、公社市町村営住宅課 048-829-2878。' + KOEI_SUP_INCOME },
      effort: 'mid',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: ADULT, areas: ['11100'] },
      deadline: { ja: '募集は4月・8月・12月の1日〜21日', en: 'Apply on the 1st–21st of April, August and December', leaveMonths: -6, months: [4, 8, 12], always: false },
      contact: {
        phone: '048-829-1521', phoneLabel: 'さいたま市 住宅政策課 住宅整備係', line: null, chat: null, web: SC_SHIEI,
        hours: { ja: '平日 8時30分〜17時15分', en: 'Weekdays 8:30–17:15' }
      },
      locations: [
        loc('住まい相談プラザ（大宮駅西口コンコース内）', '11100', '埼玉県さいたま市大宮区錦町630', 35.904289, 139.624069, '048-658-3017', '10:00–18:30（12/29〜1/3休）', '募集の案内の配布場所（土日もあいている）')
      ],
      source: src('さいたま市（市営住宅募集概要 令和8年度）', SC_SHIEI),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'saitama-city-jukyo-kakuho',
      name: { ja: '住居確保給付金（さいたま市）', en: 'Housing Security Benefit (Saitama City)' },
      hook: { ja: '仕事をやめて、家賃が払えなくなりそう', en: 'I lost my job and cannot keep paying rent' },
      summary: {
        ja: '仕事をやめたり収入が大きく減って家賃が払えないとき、さいたま市が家賃を払ってくれます。ひとり暮らしなら月4万5,000円まで、3か月（延長で最長9か月）。返す必要はありません。',
        en: 'If you lost your job or income and cannot pay rent, Saitama City pays your rent: up to ¥45,000/month for one person, for 3 months (up to 9). No repayment.'
      },
      cat: ['housing', 'money'],
      kind: 'grant', basis: 'local', pref: '11', right: true,
      amount: { ja: '家賃の額（ひとり暮らしは月4万5,000円まで）を3か月、延長で最長9か月', en: 'Your rent (≤¥45,000/month for one person) for 3 months, up to 9' },
      repay: 'none',
      who: { ja: 'さいたま市に住んでいて、仕事をやめて2年以内か、自分のせいではない理由で収入が減った人。世帯の収入と貯金が基準より少ないこと（ひとり暮らしの貯金は55万2,000円以下）。ハローワークで仕事をさがすことが条件です。' },
      how: { ja: '住んでいる区の区役所 福祉課にある「福祉まるごと相談窓口」に、まず電話で事前相談をします。そのあと申請書と書類を出します。オンライン申請（オンたま）もできます。' },
      where: { ja: '住んでいる区の区役所 福祉課「福祉まるごと相談窓口」' },
      docs: ['支給申請書（様式1-1）と申請時確認書', '本人確認書類', '仕事をやめた・収入が減ったことがわかる書類', '収入と通帳がわかるもの', '入居住宅の状況通知書（不動産会社に書いてもらう）'],
      ask: ['私の収入と貯金で対象になりますか？', '申請してから、いつ家賃が払われますか？', '延長はどういうときにできますか？'],
      caution: { ja: '家賃をためる前に相談するのがいちばん大事。申請の前に電話での事前相談が必要です。収入が基準を少しこえると、支給額が減ります。' },
      supporter: { ja: '令和8年7月以降の基準: 基準額 1人92,000円（6月まで84,000円）、家賃上限 1人45,000円・2人54,000円・3〜5人59,000円、金融資産 1人552,000円・2人834,000円・3人以上1,000,000円。収入が基準額をこえる場合は 支給額＝基準額＋家賃額－世帯収入。窓口は9〜17時（初回相談は16:30まで）。市の所管: 福祉局 生活福祉課 自立支援係 048-829-1846。' },
      effort: 'high',
      for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: ADULT, areas: ['11100'] },
      deadline: { ja: 'いつでも。家賃が払えなくなりそうなら、すぐ区役所へ', en: 'Any time — ask as soon as rent becomes hard', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '048-829-1846', phoneLabel: 'さいたま市 生活福祉課 自立支援係（申請は区役所の福祉まるごと相談窓口）', line: null, chat: null, web: SC_JUKYO,
        hours: { ja: '区の窓口は平日 9時〜17時（初回相談は16時30分まで）', en: 'Ward desks weekdays 9:00–17:00 (first visit by 16:30)' }
      },
      locations: [
        loc('西区役所 福祉まるごと相談窓口', '11100', '埼玉県さいたま市西区西大宮3-4-2', 35.925182, 139.579498, '048-620-2656', '平日 9:00–17:00', '先に電話で事前相談'),
        loc('北区役所 福祉まるごと相談窓口', '11100', '埼玉県さいたま市北区宮原町1-852-1', 35.931389, 139.620361, '048-669-6056', '平日 9:00–17:00', '先に電話で事前相談'),
        loc('大宮区役所 福祉まるごと相談窓口', '11100', '埼玉県さいたま市大宮区吉敷町1-124-1', 35.901691, 139.630554, '048-646-3065', '平日 9:00–17:00', '先に電話で事前相談'),
        loc('見沼区役所 福祉まるごと相談窓口', '11100', '埼玉県さいたま市見沼区堀崎町12-36', 35.937374, 139.65181, '048-681-6058', '平日 9:00–17:00', '先に電話で事前相談'),
        loc('中央区役所 福祉まるごと相談窓口', '11100', '埼玉県さいたま市中央区下落合5-7-10', 35.883789, 139.626755, '048-840-6052', '平日 9:00–17:00', '先に電話で事前相談'),
        loc('桜区役所 福祉まるごと相談窓口', '11100', '埼玉県さいたま市桜区道場4-3-1', 35.85675, 139.610306, '048-856-6261', '平日 9:00–17:00', '先に電話で事前相談'),
        loc('浦和区役所 福祉まるごと相談窓口', '11100', '埼玉県さいたま市浦和区常盤6-4-4', 35.860851, 139.645523, '048-829-6196', '平日 9:00–17:00', '先に電話で事前相談'),
        loc('南区役所 福祉まるごと相談窓口', '11100', '埼玉県さいたま市南区別所7-20-1', 35.845428, 139.645584, '048-844-7161', '平日 9:00–17:00', '先に電話で事前相談'),
        loc('緑区役所 福祉まるごと相談窓口', '11100', '埼玉県さいたま市緑区中尾975-1', 35.87141, 139.683929, '048-712-1162', '平日 9:00–17:00', '先に電話で事前相談'),
        loc('岩槻区役所 福祉まるごと相談窓口', '11100', '埼玉県さいたま市岩槻区本町3-2-5', 35.950104, 139.693756, '048-790-0191', '平日 9:00–17:00', '先に電話で事前相談')
      ],
      source: src('さいたま市（住居確保給付金（家賃補助）のご案内）', SC_JUKYO),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    /* ═══════════════ 千葉県 ═══════════════ */
    {
      id: 'chiba-kyoju-shien-kyogikai',
      name: { ja: '千葉県の居住支援（すまいづくり協議会 居住支援部会）', en: 'Chiba housing support council (information service)' },
      hook: { ja: '千葉で部屋を借りたいけど、ことわられそうで不安', en: 'I want to rent in Chiba but fear being turned down' },
      summary: {
        ja: '千葉県の居住支援協議会です。部屋を借りにくい人のために、受け入れてくれる不動産店（あんしん賃貸住宅協力店）や支援団体、各市の住まいの窓口の一覧を公開しています。',
        en: 'Chiba\'s housing support council. It publishes lists of real-estate shops and groups that help people who struggle to rent, plus each city\'s housing desk.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'pref', pref: '12', right: false,
      amount: null, repay: null,
      who: { ja: '住まいさがしに困っている人（収入が少ない人、高齢の人、障害のある人、子育て中の家庭、外国人など）。' },
      how: { ja: '県の「居住支援サービス等に関する情報」ページで、協力店・支援団体・住んでいる市の住まいの窓口をさがして連絡します。わからないときは県の住宅課（043-223-3255）へ。' },
      where: { ja: '千葉県 住宅課 住宅政策班／各市の住まいの窓口' },
      docs: [],
      ask: ['私の住む市で、若い人の部屋さがしを手伝ってくれる窓口や団体はありますか？', '保証人がいないとき、どんな方法がありますか？'],
      caution: { ja: '県の窓口は情報を出すところで、部屋を直接紹介するわけではありません。千葉市に住む人は「すまいサポートちば」という専用の相談窓口があります。' },
      supporter: { ja: KYOGIKAI_WHAT + ' 千葉県は「千葉県すまいづくり協議会居住支援部会」が住宅セーフティネット法の居住支援協議会（平成25年7月設置）。あんしん賃貸支援事業（協力店・支援団体の登録）、居住支援法人ご利用の手引き（PDF）。市の住まいの窓口一覧（千葉市 すまいのコンシェルジュ 043-245-5690、市川 047-383-9594、船橋 047-436-2712、松戸 047-366-7366、柏 04-7167-1147 など）は情報ページに。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['12'] },
      deadline: null,
      contact: { phone: '043-223-3255', phoneLabel: '千葉県 住宅課 住宅政策班', line: null, chat: null, web: CB_BUKAI, hours: null },
      locations: [],
      source: src('千葉県（千葉県すまいづくり協議会居住支援部会）', CB_BUKAI),
      sources2: [{ org: '千葉県（居住支援サービス等に関する情報）', url: CB_JOHO }, { org: '千葉県（住宅セーフティネット制度について）', url: CB_SAFETY }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'chiba-kyoju-shien-hojin',
      name: { ja: '千葉県の居住支援法人（部屋さがしを手伝う団体の一覧）', en: 'Chiba housing-support organizations (official list)' },
      hook: { ja: '部屋さがしを、いっしょにやってくれる人がほしい', en: 'I want someone to help me find a place' },
      summary: {
        ja: HOJIN_WHAT + '千葉県では42の法人が指定されています（2026年6月16日時点）。一覧には法人ごとの事務所のある市と電話番号がのっています。',
        en: 'Organizations designated by Chiba to help with finding a rental, guarantees and follow-up. 42 were designated as of 16 Jun 2026; the list gives each one\'s office city and phone.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'pref', pref: '12', right: false,
      amount: null, repay: null,
      who: { ja: HOJIN_WHO },
      how: { ja: '県のページの一覧で、近くの市にある法人と、個票の「対象者」「支援内容」を見て、直接電話します。使い方は県の「居住支援法人ご利用の手引き」（PDF）にも。' },
      where: { ja: '各法人（県の一覧から選ぶ）' },
      docs: [],
      ask: HOJIN_ASK,
      caution: { ja: HOJIN_CAUTION },
      supporter: { ja: HOJIN_SUP + ' 千葉の指定法人には ガンバの会（市川）、ディープデモクラシー・センター（千葉・松戸・鴨川）、CoCoT（松戸）、えにしの会（千葉）、夕なぎ（館山）、福祉楽団（香取）等を含む。一覧PDF: /juutaku/seisaku/safetynet/documents/shiteikanribo.pdf、個表 kohyo-0001.pdf 〜。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['12'] },
      deadline: null,
      contact: { phone: '043-223-3255', phoneLabel: '千葉県 住宅課 住宅政策班', line: null, chat: null, web: CB_HOJIN, hours: null },
      locations: [],
      source: src('千葉県（千葉県が指定した住宅確保要配慮者居住支援法人の一覧）', CB_HOJIN),
      sources2: [{ org: '千葉県（居住支援法人ご利用の手引き PDF）', url: CB_HOJIN_TEBIKI }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'chiba-kenei-jutaku',
      name: { ja: '千葉県営住宅（60歳未満のひとり暮らしも申込み可）', en: 'Chiba prefectural public housing' },
      hook: { ja: '千葉で家賃の安い部屋に、ひとりで住みたい', en: 'I want a cheap place of my own in Chiba' },
      summary: {
        ja: KOEI_WHAT + '千葉県は2024年10月から、60歳未満のひとり暮らしでも申しこめるようになりました。空き家の募集は1月・4月・7月・10月の1日〜15日に郵送で受けつけます。',
        en: 'Low-rent housing run by Chiba Prefecture. Since October 2024 single people under 60 can apply too. Vacancy rounds on the 1st–15th of January, April, July and October, by mail.'
      },
      cat: ['housing'],
      kind: 'housing', basis: 'pref', pref: '12', right: false,
      amount: null, repay: null,
      who: { ja: '千葉県内に住んでいる人で、住まいに困っていて、世帯の所得が月15万8,000円以下（高齢・障害・小学校に入る前の子がいる世帯は21万4,000円以下）の人。ひとり暮らしは2LDK以下の部屋に申しこめます（年齢の条件はなくなりました）。' },
      how: { ja: '「県営住宅空家入居募集案内」を市役所・町役場の公営住宅の担当や地域振興事務所でもらい、申込書を募集期間（1日〜15日の消印）に郵送します。' },
      where: { ja: '千葉県住宅供給公社 県営住宅管理部 募集課（郵送で申込み）' },
      docs: ['県営住宅入居申込書（募集案内についている）', '当選後: 住民票・収入のわかる書類など'],
      ask: ['ひとり暮らしで申しこめる部屋は、今回どの団地ですか？', '私の収入で申しこめますか？', '県営住宅と千葉市営住宅、両方に申しこめますか？'],
      caution: { ja: '抽選です。ひとり親・DV被害者・障害・60歳以上・生活保護などの世帯は当たりやすい「特枠世帯」ですが、児童養護施設を出た人の枠はありません。千葉市に住む人は千葉市営住宅（別の制度）もあります。' },
      supporter: { ja: '令和6年10月1日から 60歳未満の単身者、里親に委託されている児童、パートナーシップ制度の利用者が申込可に。空家募集は4・7・10・1月の1〜15日（郵送・消印有効）、常時募集は市原市菊間・袖ケ浦市蔵波など一部のみ。特枠世帯に「里親に委託されている児童のいる世帯」を含む。' + KOEI_SUP_INCOME + ' 県の所管: 住宅課 県営住宅管理班 043-223-3222。' },
      effort: 'mid',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: ADULT, areas: ['12'] },
      deadline: { ja: '募集は1月・4月・7月・10月の1日〜15日（郵送）', en: 'Apply by mail on the 1st–15th of Jan, Apr, Jul and Oct', leaveMonths: -6, months: [1, 4, 7, 10], always: false },
      contact: { phone: '043-222-9200', phoneLabel: '千葉県住宅供給公社 県営住宅管理部 募集課', line: null, chat: null, web: CB_KENEI_SHIKAKU, hours: null },
      locations: [],
      source: src('千葉県（これから県営住宅をお申込みになる方へ）', CB_KENEI_SHIKAKU),
      sources2: [{ org: '千葉県（県営住宅の入居対象者を拡大します）', url: CB_KENEI_KAKUDAI }, { org: '千葉県（県営住宅についての御案内）', url: CB_KENEI }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'chiba-city-sumai-support',
      name: { ja: 'すまいサポートちば（千葉市居住支援協議会 相談窓口）', en: 'Sumai Support Chiba (Chiba City housing desk)' },
      hook: { ja: '千葉市で部屋をさがしたいけど、ひとりでは不安', en: 'I need help finding a place in Chiba City' },
      summary: {
        ja: '千葉市の無料の住まい相談窓口です。話を聞いて困りごとを整理し、福祉の窓口や協力不動産店を紹介してくれます。部屋の見学や契約の手続きに同行してもらうこともできます。',
        en: 'Chiba City\'s free housing advice desk. Staff sort out your situation, refer you to welfare desks and cooperating agents, and can accompany you to viewings and contract signing.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'local', pref: '12', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '千葉市で民間の部屋を借りるのに困っている人（収入が少ない人、高齢の人、障害のある人、子育て中の家庭など）。' },
      how: { ja: '原則予約制なので、先に電話（043-301-6273）かメール（sumasapo@cjkk.or.jp）で連絡します。' },
      where: { ja: '千葉市住宅供給公社内（中央区中央 フジモト第一生命ビルディング2階）' },
      docs: [],
      ask: ['児童養護施設を出てひとり暮らしをします。部屋さがしを手伝ってもらえますか？', '保証人や緊急連絡先がいないとき、どうすればいいですか？', '見学や契約にいっしょに来てもらえますか？'],
      caution: { ja: '予約してから行こう。市営住宅の窓口ではありません（市営住宅は同じビルの公社の別の窓口）。' },
      supporter: { ja: '千葉市居住支援協議会の相談窓口（令和5年10月2日開設）。相談支援・情報提供・同行支援（内覧・契約手続き）。千葉市の「民間賃貸住宅入居支援制度」の対象には児童養護施設退所者世帯が明記されている。市の所管: 都市局 住宅政策課 043-245-5853。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['12100'] },
      deadline: { ja: 'いつでも相談できます（原則予約制）', en: 'Any time (by appointment)', leaveMonths: -4, months: null, always: true },
      contact: {
        phone: '043-301-6273', phoneLabel: 'すまいサポートちば', line: null, chat: null, web: CC_SUMASAPO,
        hours: { ja: '平日 9時〜17時（12時〜13時は休み）', en: 'Weekdays 9:00–17:00 (closed 12–13)' }
      },
      locations: [
        loc('すまいサポートちば（千葉市住宅供給公社内 2階）', '12100', '千葉県千葉市中央区中央3-3-1 フジモト第一生命ビルディング2階', 35.608963, 140.121155, '043-301-6273', '平日 9:00–17:00（12–13時休）', '原則予約制。メール sumasapo@cjkk.or.jp')
      ],
      source: src('千葉市（すまいサポートちば（千葉市居住支援協議会相談窓口）について）', CC_SUMASAPO),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'chiba-city-nyukyo-shien',
      name: { ja: '千葉市民間賃貸住宅入居支援制度（部屋の情報と保証料の補助）', en: 'Chiba City private-rental move-in support' },
      hook: { ja: '部屋を借りるとき、ことわられないか不安。保証料も高い', en: 'I fear being refused, and guarantee fees are high' },
      summary: {
        ja: '千葉市が、不動産団体の協力で、受け入れてくれる部屋の情報を教えてくれる制度です。対象に「児童養護施設退所者世帯」がはっきり入っています。この制度でみつけた部屋は、保証料や緊急連絡先サービスの費用の補助もあります（予算の範囲内）。',
        en: 'Chiba City gives information on rentals that will accept you, with cooperating real-estate associations. Households of people who left children\'s homes are explicitly covered. For a home found this way, guarantee fees and emergency-contact service costs can be subsidized (within budget).'
      },
      cat: ['housing', 'money'],
      kind: 'service', basis: 'local', pref: '12', right: false,
      amount: { ja: '初回の保証料・緊急連絡先サービスなどの費用の補助（予算の範囲内。金額は市に確認）', en: 'Subsidy for the first guarantee fee and emergency-contact service costs (within budget; ask the city for amounts)' },
      repay: 'none',
      who: { ja: '千葉市で部屋を借りたい、児童養護施設を出た人、収入が少ない人、ひとり親、高齢の人、障害のある人、LGBTの人などで、家賃をきちんと払って生活できる人。' },
      how: { ja: '「すまいのコンシェルジュ」（千葉市住宅関連情報提供コーナー、043-301-6278）に相談します。希望に合う部屋の情報と、あつかう協力不動産店を教えてもらえます。' },
      where: { ja: '千葉市住宅関連情報提供コーナー「すまいのコンシェルジュ」（千葉市住宅供給公社内）' },
      docs: [],
      ask: ['児童養護施設退所者世帯として使えますか？ 何か証明はいりますか？', '保証料の補助はいくらまで、いつもらえますか？', '今、空いている部屋はどのくらいありますか？'],
      caution: { ja: '問い合わせたときに空きがないこともあります。費用の補助は、この制度を通してみつけた部屋だけが対象で、別のページ（円滑入居支援補助制度）に細かいルールがあります。' },
      supporter: { ja: '対象: 低額所得者・被災者・高齢者・障害者・ひとり親・児童養護施設退所者・LGBT 世帯等（家賃を適正に支払い生活できる方）。協力: 千葉県宅建協会千葉支部、全日本不動産協会千葉県本部。費用補助は「千葉市住宅確保要配慮者円滑入居支援補助制度」（初回保証料、死亡時保険料、死後事務委任契約費用、緊急連絡先サービス料）。窓口の時間: 平日と毎月第1・3日曜 10〜15時（12〜13時休）。市の所管: 住宅政策課 住宅企画第二班 043-245-5853。' },
      effort: 'mid',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['12100'] },
      deadline: { ja: '部屋をさがすとき。契約の前に相談を', en: 'When you look for a room, before you sign', leaveMonths: -3, months: null, always: true },
      contact: {
        phone: '043-301-6278', phoneLabel: 'すまいのコンシェルジュ（千葉市住宅関連情報提供コーナー）', line: null, chat: null, web: CC_NYUKYO,
        hours: { ja: '平日と毎月第1・3日曜 10時〜15時（12時〜13時は休み）', en: 'Weekdays and 1st/3rd Sundays 10:00–15:00 (closed 12–13)' }
      },
      locations: [
        loc('すまいのコンシェルジュ（千葉市住宅供給公社内 2階）', '12100', '千葉県千葉市中央区中央3-3-1 フジモト第一生命ビル2階', 35.608963, 140.121155, '043-301-6278', '平日・第1,3日曜 10:00–15:00（12–13時休）', '')
      ],
      source: src('千葉市（千葉市民間賃貸住宅入居支援制度）', CC_NYUKYO),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'chiba-city-shiei-jutaku',
      name: { ja: '千葉市営住宅（年4回の募集）', en: 'Chiba City municipal public housing' },
      hook: { ja: '千葉市で家賃の安い部屋に住みたい', en: 'I want a cheap place in Chiba City' },
      summary: {
        ja: KOEI_WHAT + '千葉市は4月・7月・10月・1月に募集し（抽選）、応募のなかった部屋は翌月に再募集します。申込書は募集月の前の月の25日から配られます。ひとり暮らしは条件によって申しこめます。',
        en: 'Low-rent housing run by Chiba City. Rounds in April, July, October and January (lottery), with re-rounds the next month. Forms are handed out from the 25th of the month before. Single applicants may qualify depending on conditions.'
      },
      cat: ['housing'],
      kind: 'housing', basis: 'local', pref: '12', right: false,
      amount: null, repay: null,
      who: { ja: '千葉市内に住んでいる、または働いている人で、同居する親族がいる（ひとり暮らしは条件により可）、収入が基準の中で、住まいに困っている人。' },
      how: { ja: '募集月の前の月の25日から、千葉市住宅供給公社・各区役所・県の住まい情報プラザで申込書をもらい、公社の窓口に出します（受付は公社だけ）。' },
      where: { ja: '千葉市住宅供給公社 入居支援班（中央区中央 フジモト第一生命ビル2階）' },
      docs: ['入居申込書', '当選後: 住民票・収入のわかる書類など'],
      ask: ['ひとり暮らしで申しこめる条件はなんですか？', '今回募集している部屋はどこですか？', '県営住宅と両方に申しこめますか？'],
      caution: { ja: '抽選です。区役所では申込みを受けつけていません（申込書をもらうだけ）。ひとり暮らしの細かい条件は公社に聞こう。千葉県営住宅（60歳未満の単身も可）は別の制度です。' },
      supporter: { ja: '定期募集 4・7・10・1月（抽選）、再募集 5・8・11・2月、再募集でも応募がなければ随時募集。申込書配布は募集月の前月25日〜。公社の受付 平日9〜17時。市の所管: 都市局 住宅整備課 043-245-5846。収入基準は公社ページ「収入基準及び計算方法」。' },
      effort: 'mid',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: ADULT, areas: ['12100'] },
      deadline: { ja: '募集は4月・7月・10月・1月。再募集は5月・8月・11月・2月', en: 'Rounds in Apr, Jul, Oct and Jan; re-rounds in May, Aug, Nov and Feb', leaveMonths: -6, months: [1, 4, 7, 10], always: false },
      contact: {
        phone: '043-301-6271', phoneLabel: '千葉市住宅供給公社 入居支援班', line: null, chat: null, web: CC_SHIEI_FAQ,
        hours: { ja: '平日 9時〜17時', en: 'Weekdays 9:00–17:00' }
      },
      locations: [
        loc('千葉市住宅供給公社 入居支援班（フジモト第一生命ビル2階）', '12100', '千葉県千葉市中央区中央3-3-1', 35.608963, 140.121155, '043-301-6271', '平日 9:00–17:00', '申込みの受付はここだけ')
      ],
      source: src('千葉市（よくある質問: 市営住宅の入居者募集スケジュールと申込資格）', CC_SHIEI_FAQ),
      sources2: [{ org: '千葉市住宅供給公社（市営住宅をお探しの方）', url: CC_SHIEI_JKK }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'chiba-city-jukyo-kakuho',
      name: { ja: '住居確保給付金（千葉市）', en: 'Housing Security Benefit (Chiba City)' },
      hook: { ja: '仕事をやめて、家賃が払えなくなりそう', en: 'I lost my job and cannot keep paying rent' },
      summary: {
        ja: '仕事をやめたり収入が大きく減って家賃が払えないとき、千葉市が家賃を不動産会社の口座に直接払ってくれます。ひとり暮らしなら月4万1,000円まで、3か月（延長で最長9か月）。返す必要はありません。',
        en: 'If you lost your job or income and cannot pay rent, Chiba City pays your rent directly to the agent: up to ¥41,000/month for one person, for 3 months (up to 9). No repayment.'
      },
      cat: ['housing', 'money'],
      kind: 'grant', basis: 'local', pref: '12', right: true,
      amount: { ja: '家賃の額（ひとり暮らしは月4万1,000円まで）を3か月、延長で最長9か月', en: 'Your rent (≤¥41,000/month for one person) for 3 months, up to 9' },
      repay: 'none',
      who: { ja: '千葉市に住んでいて、仕事をやめて2年以内か、自分のせいではない理由で仕事が減った人で、やめる前は自分の収入で生活していた人。ひとり暮らしなら月の収入が13万3,000円以下、貯金が55万2,000円以下。ハローワークで仕事をさがすことが条件です。' },
      how: { ja: '住んでいる区の保健福祉センター 社会援護課に、先に電話して、条件と書類の説明を受けてから窓口で申請します。' },
      where: { ja: '住んでいる区の保健福祉センター 社会援護課' },
      docs: ['本人確認書類', '仕事をやめた・減ったことがわかる書類', '収入がわかる書類', '通帳の写し', '部屋の契約書の写し'],
      ask: ['私の収入と貯金で対象になりますか？', '申請してから、いつ家賃が払われますか？', '共益費は対象になりますか？'],
      caution: { ja: '家賃をためる前に相談するのがいちばん大事。共益費・管理費は対象外。収入が基準をこえると減額されます。書類が足りないと決定がおくれるので、電話で聞いてそろえてから行こう。' },
      supporter: { ja: '支給上限額 単身41,000円・2人49,000円・3〜5人53,000円。収入基準額 単身133,000円・2人188,000円・3人225,000円。資産基準 単身552,000円・2人834,000円・3人以上1,000,000円。区の窓口: 中央 043-221-2147、花見川 043-275-6416、稲毛 043-284-6135、若葉 043-233-8148、緑 043-292-8135、美浜 043-270-3148。市の所管: 保健福祉局 保護課 043-245-5165。' },
      effort: 'high',
      for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: ADULT, areas: ['12100'] },
      deadline: { ja: 'いつでも。家賃が払えなくなりそうなら、すぐ区の窓口へ', en: 'Any time — ask as soon as rent becomes hard', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '043-245-5165', phoneLabel: '千葉市 保護課（申請は区の保健福祉センター 社会援護課）', line: null, chat: null, web: CC_JUKYO,
        hours: { ja: '平日 9時〜17時', en: 'Weekdays 9:00–17:00' }
      },
      locations: [],
      source: src('千葉市（住居確保給付金（家賃補助））', CC_JUKYO),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    /* ═══════════════ 茨城県 ═══════════════ */
    {
      id: 'ibaraki-kyoju-shien-kyogikai',
      name: { ja: '茨城県居住支援協議会（住まいの相談）', en: 'Ibaraki Housing Support Council' },
      hook: { ja: '茨城で部屋を借りたいけど、ことわられそうで不安', en: 'I want to rent in Ibaraki but fear being turned down' },
      summary: {
        ja: '茨城県と県内44市町村・不動産団体・福祉団体でつくる協議会です。県の住宅課にある事務局で、民間の部屋への入居の相談を受けつけています。',
        en: 'A council of Ibaraki Prefecture, all 44 municipalities, real-estate and welfare groups. Its secretariat in the prefectural Housing Division takes enquiries about moving into private rentals.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'pref', pref: '08', right: false,
      amount: null, repay: null,
      who: { ja: '住まいさがしに困っている人（収入が少ない人、高齢の人、障害のある人、子育て中の家庭など）。' },
      how: { ja: '県の住宅課 民間住宅・住宅指導グループ（029-301-4759）に電話します。県が指定した居住支援法人の一覧やガイドブックも教えてもらえます。' },
      where: { ja: '茨城県居住支援協議会 事務局（茨城県 土木部 住宅課）' },
      docs: [],
      ask: ['若い人のひとり暮らしの部屋さがしを手伝ってくれる団体はありますか？', '保証人がいないとき、どんな方法がありますか？', '県営住宅と民間の部屋、どちらが早く入れますか？'],
      caution: { ja: '県のページにのっている支援の一覧は2016年9月のもので、古いと書かれています。電話で今の状況を聞こう。協議会の案内する「身元保証人確保対策事業」（施設長が保証人になれる国の仕組み）は子ども家庭課 029-301-3247。' },
      supporter: { ja: KYOGIKAI_WHAT + ' 会員: 県宅建協会、県社協、県国際交流協会、県居住支援法人協議会、全44市町村、水戸保護観察所等。ページの支援制度一覧（2016年9月）に児童養護施設退所者向けの身元保証人確保対策事業（子ども家庭課 029-301-3247）を掲載。相談窓口の時間はページに記載なし。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['08'] },
      deadline: { ja: 'いつでも相談できます', en: 'Any time', leaveMonths: -4, months: null, always: true },
      contact: { phone: '029-301-4759', phoneLabel: '茨城県 住宅課 民間住宅・住宅指導グループ（協議会事務局）', line: null, chat: null, web: IB_KYOGIKAI, hours: null },
      locations: [
        loc('茨城県居住支援協議会 事務局（茨城県庁 住宅課）', '08201', '茨城県水戸市笠原町978-6', 36.340679, 140.444077, '029-301-4759', '', '電話で相談')
      ],
      source: src('茨城県（茨城県居住支援協議会）', IB_KYOGIKAI),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'ibaraki-kyoju-shien-hojin',
      name: { ja: '茨城県の居住支援法人（部屋さがしを手伝う団体の一覧）', en: 'Ibaraki housing-support organizations (official list)' },
      hook: { ja: '部屋さがしを、いっしょにやってくれる人がほしい', en: 'I want someone to help me find a place' },
      summary: {
        ja: HOJIN_WHAT + '茨城県では12の法人が指定されています（2026年2月24日時点）。県のガイドブック（2026年2月版）に、法人ごとの対象者と支援の内容がのっています。',
        en: 'Organizations designated by Ibaraki to help with finding a rental, guarantees and follow-up. 12 were designated as of 24 Feb 2026; the prefecture\'s guidebook (Feb 2026) describes each one.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'pref', pref: '08', right: false,
      amount: null, repay: null,
      who: { ja: HOJIN_WHO },
      how: { ja: '県のページの一覧（PDF）かガイドブック（PDF）で、住む地域と「対象者」を見て、法人に直接連絡します。' },
      where: { ja: '各法人（県の一覧から選ぶ）' },
      docs: [],
      ask: HOJIN_ASK,
      caution: { ja: HOJIN_CAUTION },
      supporter: { ja: HOJIN_SUP + ' 一覧PDF: /doboku/jutaku/minkan/05chintai/jutakusafetynet/documents/sienhoujinichiran21.pdf。指定第1号 一般社団法人LANS（つくば市、県内全域）など。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['08'] },
      deadline: null,
      contact: { phone: '029-301-4759', phoneLabel: '茨城県 住宅課 民間住宅・住宅指導グループ', line: null, chat: null, web: IB_HOJIN, hours: null },
      locations: [],
      source: src('茨城県（住宅確保要配慮者居住支援法人の指定）', IB_HOJIN),
      sources2: [{ org: '茨城県（居住支援法人ガイドブック 2026年2月版 PDF）', url: IB_HOJIN_GUIDE }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'ibaraki-kenei-jutaku',
      name: { ja: '茨城県営住宅（18歳以上ならひとりでも申込み可）', en: 'Ibaraki prefectural public housing' },
      hook: { ja: '茨城で家賃の安い部屋に、ひとりで住みたい', en: 'I want a cheap place of my own in Ibaraki' },
      summary: {
        ja: KOEI_WHAT + '茨城県は2024年4月から「同居する家族がいること」の条件をなくし、18歳以上ならひとりでも「単身可」の部屋に申しこめます。募集は1月・4月・7月・10月（定期）と随時募集です。',
        en: 'Low-rent housing run by Ibaraki Prefecture. Since April 2024 the family requirement is gone, so anyone 18+ can apply alone for units marked single-OK. Rounds in January, April, July and October, plus ongoing vacancies.'
      },
      cat: ['housing'],
      kind: 'housing', basis: 'pref', pref: '08', right: false,
      amount: null, repay: null,
      who: { ja: '住まいに困っていて、収入が基準の中の人。18歳以上なら、ひとりでも「単身可」「単身者向け住宅」と書かれた部屋（2DKなど）に申しこめます。' },
      how: { ja: '定期募集は4月・7月・10月の2日〜15日、1月は5日〜15日に、申込書と空き家の一覧を茨城県住宅管理センター・市役所・町村役場・県住宅課でもらって申しこみます。空きがあれば随時募集（先着順）もあります。' },
      where: { ja: '一般財団法人茨城県住宅管理センター（指定管理者）／市役所・町村役場でも申込書を配布' },
      docs: ['入居申込書', '当選後: 住民票・収入のわかる書類など'],
      ask: ['今、単身可の部屋はどこで募集していますか？', '私の収入で申しこめますか？', '随時募集で空いている部屋はありますか？'],
      caution: { ja: '申込みが多いと抽選です。入居は募集月の約3か月後（4月募集なら7月1日）。随時募集の部屋は変わるので、住宅管理センターに聞こう。' },
      supporter: { ja: '令和6年4月1日から同居親族要件を廃止、18歳以上の単身者は「単身可」「単身者向け住宅」の住戸に申込可。令和8年度の定期募集: 4月（2〜15日・入居7/1）、7月（2〜15日・10/1）、10月（2〜15日・1/4）、1月（5〜15日・4/1）。住宅管理センター（水戸・日立・つくば）の電話は同センターのサイトに（水戸 管理課 029-226-3350、2020年の掲示）。県の所管: 住宅課 住宅管理・滞納対策 029-301-4750。収入基準額はページに記載なし。' },
      effort: 'mid',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: ADULT, areas: ['08'] },
      deadline: { ja: '定期募集は1月・4月・7月・10月（2日〜15日）。空きがあれば随時募集', en: 'Rounds on the 2nd–15th of Jan, Apr, Jul and Oct, plus ongoing vacancies', leaveMonths: -6, months: [1, 4, 7, 10], always: true },
      contact: { phone: '029-301-4750', phoneLabel: '茨城県 住宅課 住宅管理・滞納対策', line: null, chat: null, web: IB_KENEI, hours: null },
      locations: [],
      source: src('茨城県（県営住宅 入居者募集）', IB_KENEI),
      sources2: [{ org: '茨城県（県営住宅の入居資格が変わります）', url: IB_KENEI_KAISEI }, { org: '茨城県（県営住宅の概要）', url: IB_KENEI_GAIYO }, { org: '一般財団法人茨城県住宅管理センター', url: IB_IJKC }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    /* ═══════════════ 栃木県 ═══════════════ */
    {
      id: 'tochigi-kyoju-shien-kyogikai',
      name: { ja: '栃木県住生活支援協議会（住まいに困ったときの案内）', en: 'Tochigi Housing Support Council' },
      hook: { ja: '栃木で部屋を借りたいけど、ことわられそうで不安', en: 'I want to rent in Tochigi but fear being turned down' },
      summary: {
        ja: '栃木県の居住支援協議会です。入居をことわらない「セーフティネット住宅」、見守りつきの「居住サポート住宅」、県が指定した居住支援法人など、住まいに困ったときの選択肢をまとめた「居住支援ガイドブック 2026年版」を出しています。',
        en: 'Tochigi\'s housing support council. It publishes a 2026 housing-support guidebook covering safety-net rentals, supported housing and designated support organizations.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'pref', pref: '09', right: false,
      amount: null, repay: null,
      who: { ja: '住まいさがしに困っている人（収入が少ない人、高齢の人、障害のある人、子育て中の家庭など）。' },
      how: { ja: '県のページでガイドブック（PDF）を読むか、県の住宅課 企画支援担当（028-623-2484）に電話して、合う窓口を聞きます。ガイドブックは県住宅課・各市町の住宅の担当・健康福祉センターでも配っています。' },
      where: { ja: '栃木県 住宅課 企画支援担当（県庁本館14階）' },
      docs: [],
      ask: ['若い人のひとり暮らしの部屋さがしを手伝ってくれる法人はありますか？', '保証人がいないとき、どんな方法がありますか？', 'セーフティネット住宅はどこでさがせますか？'],
      caution: { ja: '県の窓口は案内が中心で、部屋を直接紹介するわけではありません。「児童養護施設を出た人」という区分はページにありませんが、「収入が少ない人」としてふくまれます。' },
      supporter: { ja: KYOGIKAI_WHAT + ' 栃木県は「栃木県住生活支援協議会」（平成26年7月設立、46団体）が住宅セーフティネット法の居住支援協議会。あんしん賃貸住宅部会・空き家・住み替え部会・公的賃貸住宅部会。居住支援ガイドブック2026年版（PDF 9.5MB）、住まいにお困りの方向けリーフレット。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['09'] },
      deadline: null,
      contact: { phone: '028-623-2484', phoneLabel: '栃木県 住宅課 企画支援担当', line: null, chat: null, web: TG_KYOGIKAI, hours: null },
      locations: [],
      source: src('栃木県（栃木県住生活支援協議会について）', TG_KYOGIKAI),
      sources2: [{ org: '栃木県（居住支援ガイドブック 2026年版 PDF）', url: TG_GUIDE }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'tochigi-kyoju-shien-hojin',
      name: { ja: '栃木県の居住支援法人（部屋さがしを手伝う団体の一覧）', en: 'Tochigi housing-support organizations (official list)' },
      hook: { ja: '部屋さがしを、いっしょにやってくれる人がほしい', en: 'I want someone to help me find a place' },
      summary: {
        ja: HOJIN_WHAT + '栃木県では29の法人が指定されています（2026年9月29日時点）。一覧（PDF）に法人ごとの地域・支援の内容・電話番号がのっています。',
        en: 'Organizations designated by Tochigi to help with finding a rental, guarantees and follow-up. 29 were designated as of 29 Sep 2026; the PDF list gives each one\'s area, services and phone.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'pref', pref: '09', right: false,
      amount: null, repay: null,
      who: { ja: HOJIN_WHO },
      how: { ja: '県のページの一覧（PDF）で、住む地域と支援の内容を見て、法人に直接連絡します。' },
      where: { ja: '各法人（県の一覧から選ぶ）' },
      docs: [],
      ask: HOJIN_ASK,
      caution: { ja: HOJIN_CAUTION },
      supporter: { ja: HOJIN_SUP + ' 栃木の指定法人は宇都宮・鹿沼・大田原・那須塩原・足利・栃木・小山・佐野等に事務所。一覧PDF（令和8年7月10日版）に業務地域・内容・電話。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['09'] },
      deadline: null,
      contact: { phone: '028-623-2484', phoneLabel: '栃木県 住宅課 企画支援担当', line: null, chat: null, web: TG_HOJIN, hours: null },
      locations: [],
      source: src('栃木県（住宅確保要配慮者居住支援法人の指定について）', TG_HOJIN),
      sources2: [{ org: '栃木県（居住支援法人 指定一覧 PDF）', url: TG_HOJIN_PDF }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'tochigi-kenei-jutaku',
      name: { ja: '栃木県営住宅（毎月募集。若い人のひとり暮らしは原則対象外）', en: 'Tochigi prefectural public housing' },
      hook: { ja: '栃木で家賃の安い部屋に住みたい', en: 'I want a cheap place in Tochigi' },
      summary: {
        ja: KOEI_WHAT + '栃木県は毎月募集していて、受付は前の月の26日〜5日です。ただし、ひとりで申しこめるのは60歳以上・障害のある人・生活保護を受けている人・DV被害者などに限られ、若くて健康なひとり暮らしは原則申しこめません。',
        en: 'Low-rent housing run by Tochigi Prefecture, with monthly rounds (applications from the 26th to the 5th). Single applicants are limited to set groups (60+, disability, public assistance, DV victims…), so a young healthy single person generally cannot apply.'
      },
      cat: ['housing'],
      kind: 'housing', basis: 'pref', pref: '09', right: false,
      amount: null, repay: null,
      who: { ja: '栃木県内に住んでいる、または働いている人で、同居する家族（3か月以内に結婚する婚約者もふくむ）がいて、住まいに困っていて、世帯の所得が月15万8,000円以下（高齢・障害などの世帯は21万4,000円以下）の人。ひとり暮らしは60歳以上、障害のある人、生活保護を受けている人、DV被害者などだけ。一部の過疎地域の住宅は、ひとりでも申しこめます。' },
      how: { ja: '住みたい地域を担当する栃木県住宅供給公社の支所（中央・栃木）か、指定管理者のプラザ（塩那・那須・佐野・わたらせ）に電話か来所で相談し、受付期間（前の月の26日〜5日、9時〜16時）に申しこみます。募集する住宅は毎月20日ごろ更新されます。' },
      where: { ja: '栃木県住宅供給公社 中央支所・栃木支所／塩那・那須・佐野・わたらせプラザ' },
      docs: ['入居申込書', '世帯全員の住民票', '所得を証明する書類', '健康保険の資格がわかるもの', '該当する人は障害者手帳など'],
      ask: ['ひとりで申しこめる住宅はありますか？（過疎地域の指定住宅など）', '私の収入で申しこめますか？', '今月募集している住宅はどこですか？'],
      caution: { ja: '若くて健康なひとり暮らしは、このルールでは原則申しこめません。その場合は民間の部屋（居住支援法人・セーフティネット住宅）を考えよう。申込みは本人が行い、印鑑がいります。' },
      supporter: { ja: '単身者の資格: 60歳以上、身体障害1〜4級・精神1〜3級・知的、戦傷病者、被爆者、生活保護受給者、引揚者5年未満、ハンセン病療養所入所者等、DV被害者、または山村振興・過疎地域の指定住宅（鹿沼市日吉、日光市若杉、栃木市平川第一、大田原市中田原、那須塩原市稲村・東原・三島、矢板市木幡北山、佐野市伊勢山・石塚）の申込者。単身者指定住宅は2DK以下等。優先: ひとり親・障害・高齢・子育て・DV等。令和8年10月、公社サイトはメンテナンスで一時停止中（受付は継続）。' + KOEI_SUP_INCOME + ' 県の所管: 住宅課 028-623-2486。' },
      effort: 'mid',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: ADULT, areas: ['09'] },
      deadline: { ja: '毎月募集。受付は前の月の26日〜5日（9時〜16時）', en: 'Monthly rounds; applications from the 26th to the 5th, 9:00–16:00', leaveMonths: -6, months: null, always: true },
      contact: {
        phone: '028-626-3198', phoneLabel: '栃木県住宅供給公社 中央支所（宇都宮・鹿沼・日光・真岡・上三川・芳賀）', line: null, chat: null, web: TG_KENEI,
        hours: { ja: '受付 9時〜16時（土日祝日は休み）', en: 'Applications 9:00–16:00, weekdays' }
      },
      locations: [
        loc('栃木県住宅供給公社 中央支所（栃木県地域づくり機構ビル 2階）', '09201', '栃木県宇都宮市仲町1-1', 36.56255, 139.889191, '028-626-3198', '受付 9:00–16:00', '担当: 宇都宮・鹿沼・日光・真岡・上三川・芳賀'),
        loc('栃木県住宅供給公社 栃木支所（県庁下都賀庁舎内）', '09203', '栃木県栃木市神田町6-6', 36.380726, 139.743301, '0282-23-6604', '受付 9:00–16:00', '担当: 栃木・小山・壬生・下野'),
        loc('塩那プラザ（指定管理者）', '09211', '栃木県矢板市末広町34-7', 36.808926, 139.937439, '0287-47-7174', '受付 9:00–16:00', '担当: 矢板・さくら・高根沢'),
        loc('那須プラザ（指定管理者）', '09213', '栃木県那須塩原市末広町53', 36.96833, 140.046875, '0287-74-5901', '受付 9:00–16:00', '担当: 那須塩原・大田原'),
        loc('佐野プラザ（指定管理者・加嶋屋ビル1F）', '09204', '栃木県佐野市高砂町2791', 36.31316, 139.577927, '0283-85-7871', '受付 9:00–16:00', '担当: 佐野'),
        loc('わたらせプラザ（指定管理者・足利織物会館1F）', '09202', '栃木県足利市通3-2589', 36.336712, 139.446884, '0284-20-1717', '受付 9:00–16:00', '担当: 足利')
      ],
      source: src('栃木県（県営住宅入居申込案内）', TG_KENEI),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    /* ═══════════════ 群馬県 ═══════════════ */
    {
      id: 'gunma-sumai-sodan',
      name: { ja: 'ぐんま住まいの相談センター（県営・民間の部屋の相談）', en: 'Gunma Housing Consultation Center' },
      hook: { ja: '群馬で部屋をさがしたいけど、どこに相談すればいいかわからない', en: 'I need to find a place in Gunma and do not know where to start' },
      summary: {
        ja: '群馬県が群馬県住宅供給公社の中に置いている、無料の住まいの相談窓口です。県営住宅や民間の部屋への入居の相談ができます。土曜日もあいています。',
        en: 'Gunma Prefecture\'s free housing advice desk inside the Gunma Housing Corporation. Ask about moving into prefectural or private rentals. Open Saturdays too.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'pref', pref: '10', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '群馬県に住む人（住む予定の人）で、住まいのことを相談したい人。' },
      how: { ja: '電話（027-210-6634）か、前橋市紅雲町の公社に行って相談します。電話は10時〜12時・13時〜16時がすいています。弁護士などの専門相談は、まず一般相談をしてから予約します。' },
      where: { ja: 'ぐんま住まいの相談センター（群馬県住宅供給公社内）' },
      docs: [],
      ask: ['若い人がひとりで入れる県営住宅はありますか？', '保証人や身元引受人がいないとき、どうすればいいですか？', '民間の部屋で、受け入れてくれる不動産店を教えてもらえますか？'],
      caution: { ja: '県の「群馬あんしん賃貸ネット」（居住支援協議会の検索）は今、停止中です。民間の部屋をさがすときは、県が指定した居住支援法人の一覧も見よう。' },
      supporter: { ja: '群馬県 住宅政策課のページ「住まいに関する相談」。一般相談は来所・電話、専門相談（弁護士・建築士・宅建士）は予約制。公営住宅の申込みは公社の高崎・桐生・太田支所でも。県の所管: 住宅政策課 027-898-2889。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['10'] },
      deadline: { ja: 'いつでも相談できます', en: 'Any time', leaveMonths: -4, months: null, always: true },
      contact: {
        phone: '027-210-6634', phoneLabel: 'ぐんま住まいの相談センター', line: null, chat: null, web: GM_SODAN,
        hours: { ja: '平日 8時30分〜17時15分、土曜 9時30分〜15時30分（日祝・年末年始は休み）', en: 'Weekdays 8:30–17:15, Saturdays 9:30–15:30' }
      },
      locations: [
        loc('ぐんま住まいの相談センター（群馬県住宅供給公社内）', '10201', '群馬県前橋市紅雲町1-7-12', 36.386658, 139.062088, '027-210-6634', '平日 8:30–17:15／土 9:30–15:30', '電話は10–12時・13–16時がすいている')
      ],
      source: src('群馬県（住まいに関する相談）', GM_SODAN),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'gunma-kyoju-shien-hojin',
      name: { ja: '群馬県の居住支援法人（部屋さがしを手伝う団体の一覧）', en: 'Gunma housing-support organizations (official list)' },
      hook: { ja: '部屋さがしを、いっしょにやってくれる人がほしい', en: 'I want someone to help me find a place' },
      summary: {
        ja: HOJIN_WHAT + '群馬県では25の法人が指定されています（2026年4月14日時点）。一覧（PDF）に法人ごとの地域・支援の内容・電話番号がのっています。',
        en: 'Organizations designated by Gunma to help with finding a rental, guarantees and follow-up. 25 were designated as of 14 Apr 2026; the PDF list gives each one\'s area, services and phone.'
      },
      cat: ['housing', 'consult'],
      kind: 'service', basis: 'pref', pref: '10', right: false,
      amount: null, repay: null,
      who: { ja: HOJIN_WHO },
      how: { ja: '県のページの一覧（PDF）で、住む地域と支援の内容を見て、法人に直接連絡します。' },
      where: { ja: '各法人（県の一覧から選ぶ）' },
      docs: [],
      ask: HOJIN_ASK,
      caution: { ja: HOJIN_CAUTION },
      supporter: { ja: HOJIN_SUP + ' 一覧PDF: /uploaded/attachment/716306.pdf（支援事務所・対象者・業務地域・業務内容・問合せ先）。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: null, areas: ['10'] },
      deadline: null,
      contact: { phone: '027-898-2889', phoneLabel: '群馬県 住宅政策課 住宅政策係', line: null, chat: null, web: GM_HOJIN, hours: null },
      locations: [],
      source: src('群馬県（住宅確保要配慮者居住支援法人）', GM_HOJIN),
      sources2: [{ org: '群馬県（指定居住支援法人一覧 PDF）', url: GM_HOJIN_PDF }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'gunma-kenei-jutaku',
      name: { ja: '群馬県営住宅（ひとりでも申込み可・身元引受人が必要）', en: 'Gunma prefectural public housing' },
      hook: { ja: '群馬で家賃の安い部屋に、ひとりで住みたい', en: 'I want a cheap place of my own in Gunma' },
      summary: {
        ja: KOEI_WHAT + '群馬県は2019年4月から、だれでもひとりで申しこめるようになりました（ひとりで申しこめる部屋は限られます）。保証人はいりませんが、ひとり暮らしの人は「身元引受人」1人の誓約書が必要です。',
        en: 'Low-rent housing run by Gunma Prefecture. Since April 2019 anyone can apply alone (single-eligible units are limited). No guarantor, but single applicants need one "person responsible" (身元引受人) to sign a pledge.'
      },
      cat: ['housing'],
      kind: 'housing', basis: 'pref', pref: '10', right: false,
      amount: null, repay: null,
      who: { ja: '成人で、群馬県内に住んでいる、または働いている人。住まいに困っていて（持ち家がない）、世帯の所得が月15万8,000円以下（高齢・障害などの世帯は21万4,000円以下）で、税金をためていない人。敷金（家賃3か月分）を払えること。ひとり暮らしは、原則県内に住む身元引受人1人の誓約書を出します。' },
      how: { ja: '抽選団地は奇数月の1日に募集が公開され、15日までに申込書を公社にメールか郵送で出します（抽選は月末）。空きがある随時団地は、公社か支所（前橋・高崎・桐生・太田・館林・富岡・みなかみ）で受付順です。' },
      where: { ja: '群馬県住宅供給公社 管理部（前橋市紅雲町）／各支所' },
      docs: ['県営住宅入居申込書', 'ひとり暮らしの人: 身元引受人の誓約書', '当選後: 住民票・収入のわかる書類など'],
      ask: ['ひとりで申しこめる部屋は、今どこで募集していますか？', '身元引受人になってくれる人が県内にいません。どうすればいいですか？', '敷金はいつまでに払いますか？'],
      caution: { ja: 'ひとりで申しこめる部屋は限られます。身元引受人が県内で見つからないときも、事情によっては県外の人でもよいことがあるので、公社に相談しよう。入居できる日から15日以内に引っこして住所を移す必要があります。' },
      supporter: { ja: '平成31年4月1日から単身申込可、令和2年4月1日に連帯保証人制度を廃止。単身入居者は身元引受人1名（原則県内居住者）の誓約書。抽選団地: 奇数月1日公開・15日必着・月末抽選（申込書を jkk@gunma-jkk.or.jp へメール可）。随時団地: 受付順。敷金は家賃3か月分。' + KOEI_SUP_INCOME + ' 県の所管: 住宅政策課 住宅管理係 027-226-3718。' },
      effort: 'mid',
      for: { stages: LEAVERS, paths: [], care: [], careOnly: false, age: ADULT, areas: ['10'] },
      deadline: { ja: '抽選団地は奇数月（1日公開・15日締切）。空きがある団地は随時', en: 'Lottery units in odd months (posted on the 1st, due the 15th); vacant units any time', leaveMonths: -6, months: [1, 3, 5, 7, 9, 11], always: true },
      contact: { phone: '027-223-5811', phoneLabel: '群馬県住宅供給公社 管理部', line: null, chat: null, web: GM_KENEI, hours: null },
      locations: [
        loc('群馬県住宅供給公社（住宅公社ビル）', '10201', '群馬県前橋市紅雲町1-7-12', 36.386658, 139.062088, '027-223-5811', '', '随時団地の受付。支所は高崎・桐生・太田・館林・富岡・みなかみ')
      ],
      source: src('群馬県（県営住宅トップページ）', GM_KENEI),
      sources2: [{ org: '群馬県住宅供給公社（県営住宅）', url: GM_KENEI_JKK }, { org: '群馬県住宅供給公社（入居資格について）', url: GM_KENEI_SHIKAKU }],
      eligibleBy: 'residence',
      verifiedBy: V
    }
  );
})();
