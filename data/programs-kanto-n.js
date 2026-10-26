/* 巣立ちマップ v7 — data/programs-kanto-n.js (DATA-N)
 * 北関東（茨城県 08・栃木県 09・群馬県 10）の支援と、水戸市・宇都宮市・前橋市・高崎市の生活の相談窓口。
 * すべて 2026-10-26 に、source.url の公式ページ（または県から受託した運営団体のページ）を読んで確認しました。
 * ページに書いていないこと（金額・時間・住所など）は入れていません（推測で埋めていません）。
 * 座標は 国土地理院 住所検索API で住所から求め、逆ジオコーダーで市町村コードを確かめました。
 * basis: 'pref' = 県の制度（pref: '08' など）／'local' = 市の制度（for.areas: ['08201'] など）。
 */
(function () {
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};
  SM.data.programs = SM.data.programs || [];

  var C = '2026-10-26';
  var V = 'Economix JP';
  var CARE = ['facility', 'foster', 'jhome'];
  var NOT_JR = ['hs12', 'hs3', 'left0', 'left1', 'nohs'];                  // 中学生には出さない
  var KIDS = ['jhs12', 'jhs3', 'hs12', 'hs3'];                             // 中学生・高校生
  var ALL_ST = ['jhs12', 'jhs3', 'hs12', 'hs3', 'left0', 'left1', 'nohs']; // 中学生にも出す

  function src(org, url) { return { org: org, url: url, checked: C }; }
  function loc(name, area, addr, lat, lng, phone, hours, note) {
    return { name: name, area: area, addr: addr, lat: lat, lng: lng, phone: phone, hours: hours || '', note: note || '' };
  }

  /* ---- 公式ページ ---- */
  var IB_SHIKIN = 'https://www.ibaraki-welfare.or.jp/work-training/%e4%bf%ae%e5%ad%a6%e8%b3%87%e9%87%91%e7%ad%89%e8%b2%b8%e4%bb%98%e4%ba%8b%e6%a5%ad/%e5%85%90%e7%ab%a5%e9%a4%8a%e8%ad%b7%e6%96%bd%e8%a8%ad%e9%80%80%e6%89%80%e8%80%85%e7%ad%89%e8%87%aa%e7%ab%8b%e6%94%af%e6%8f%b4%e8%b3%87%e9%87%91%e8%b2%b8/';
  var IB_SHIKIN_FLYER = 'https://www.ibaraki-welfare.or.jp/home/wp-content/uploads/2026/03/9ed37837bf025b79b101b04f6db5e0c4.pdf';
  var IB_JISOU = 'https://www.pref.ibaraki.jp/hokenfukushi/fukusise/sodan/fukuso/madoguchi.html';
  var IB_JISOU2 = 'https://www.pref.ibaraki.jp/bugai/josei/seishonen/sodan2/pc/ppage632111101.html';
  var IB_GYAKU = 'https://www.pref.ibaraki.jp/bugai/josei/seishonen/sodan2/pc/ppage631100000.html';
  var IB_SOUDAN = 'https://www.pref.ibaraki.jp/hokenfukushi/yakumu/mayaku/overdose.html';
  var IB_KODOMO = 'https://kyoiku.pref.ibaraki.jp/gakko/kodomo-hotline/';
  var IB_KOKORO = 'https://www.pref.ibaraki.jp/hokenfukushi/shofuku/seishin/snssoudan.html';
  var IB_HIKI = 'https://www.pref.ibaraki.jp/bugai/josei/seishonen/sodan2/pc/ppage642001000.html';
  var IB_KONKYU = 'https://www.pref.ibaraki.jp/hokenfukushi/fukushi/hogo/konkyuusya/konkyusya-seido.html';
  var IB_KONKYU_PDF = 'https://www.pref.ibaraki.jp/hokenfukushi/fukushi/hogo/konkyuusya/documents/jiritsusoudanshienkikan.pdf';
  var MITO = 'https://www.city.mito.lg.jp/page/3455.html';
  var TG_JISOU = 'https://www.pref.tochigi.lg.jp/e68/welfare/kodomo/kosodatesoudan/jisouichi.html';
  var TG_SOUDAN = 'https://www.pref.tochigi.lg.jp/c01/advice/kurashi/seishounen/d001_soudan.html';
  var TG_TEL = 'https://www.pref.tochigi.lg.jp/e68/welfare/kodomo/kosodatesoudan/telesou.html';
  var TG_SNS = 'https://www.pref.tochigi.lg.jp/m09/zidou-seitoshido/2026sns.html';
  var TG_KOKORO = 'https://www.pref.tochigi.lg.jp/e05/02ssnskokoronosoudan.html';
  var TG_YC = 'https://www.pref.tochigi.lg.jp/e06/yc_sns.html';
  var TG_JOSEI = 'https://www.pref.tochigi.lg.jp/c07/joseishien/linesoudan.html';
  var TG_POLARIS = 'https://www.pref.tochigi.lg.jp/e12/31polarisu.html';
  var TG_KONKYU = 'https://www.pref.tochigi.lg.jp/e12/seikatusienn.html';
  var TG_KYUFU = 'https://www.pref.tochigi.lg.jp/m01/education/gakkoukyouiku/koutou/kyuufukin_k.html';
  var UTSU = 'https://www.city.utsunomiya.lg.jp/_res/projects/default_project/_page_/001/030/017/annaitirasir7.pdf';
  var GM_SHIKIN = 'https://www.pref.gunma.jp/03/bm0100021.html';
  var GM_JISOU = 'https://www.pref.gunma.jp/page/1816.html';
  var GM_HOT = 'https://www.pref.gunma.jp/03/p08210002.html';
  var GM_LINE = 'https://www.pref.gunma.jp/page/3658.html';
  var GM_KONKYU = 'https://www.pref.gunma.jp/02/d0100089.html';
  var GM_ASUNOWA = 'https://www.pref.gunma.jp/site/houdou/774994.html';
  var GM_KYUFU = 'https://www.pref.gunma.jp/03/a3500024.html';
  var IPPO = 'https://youngassist.com/support.php';
  var MAEBASHI = 'https://www.city.maebashi.gunma.jp/soshiki/fukushibu/shakaifukushi/gyomu/3/1/1/5469.html';
  var MAEBASHI_SHAKYO = 'https://www.mae-shakyo.or.jp/sien/maebashi/maebashi.html';
  var TAKASAKI = 'https://www.city.takasaki.gunma.jp/page/4812.html';
  var TAKASAKI2 = 'https://www.city.takasaki.gunma.jp/page/4156.html';
  var SAPO = 'https://saposute-net.mhlw.go.jp/station.html';
  var SAPO_ABOUT = 'https://saposute-net.mhlw.go.jp/about.html';
  function sapoUrl(slug) { return 'https://saposute-net.mhlw.go.jp/station_detail/' + slug + '.html'; }

  var WD_JISOU = '平日 8:30–17:15';

  /* ---- 児童相談所（各県のページより） ---- */
  var IB_JISOU_LOCS = [
    loc('茨城県 中央児童相談所', '08201', '茨城県水戸市水府町864-16', 36.380070, 140.483414, '029-221-4150', WD_JISOU,
      '担当: 水戸市・笠間市・ひたちなか市・常陸大宮市・那珂市・小美玉市・茨城町・城里町・大洗町・東海村・大子町'),
    loc('茨城県 日立児童相談所', '08202', '茨城県日立市弁天町3-4-7', 36.587189, 140.650620, '0294-22-0294', WD_JISOU,
      '担当: 日立市・常陸太田市・高萩市・北茨城市'),
    loc('茨城県 鉾田児童相談所（県鉾田合同庁舎内）', '08234', '茨城県鉾田市鉾田1367-3', 36.159538, 140.516907, '0291-33-4119', WD_JISOU,
      '担当: 鹿嶋市・潮来市・神栖市・行方市・鉾田市'),
    loc('茨城県 土浦児童相談所', '08203', '茨城県土浦市下高津3-14-5', 36.073853, 140.188202, '029-821-4595', WD_JISOU,
      '担当: 土浦市・石岡市・龍ケ崎市・取手市・牛久市・つくば市・守谷市・稲敷市・かすみがうら市・つくばみらい市・美浦村・阿見町・河内町・利根町'),
    loc('茨城県 筑西児童相談所（筑西合同庁舎分庁舎）', '08227', '茨城県筑西市二木成615', 36.290054, 139.975220, '0296-24-1614', WD_JISOU,
      '担当: 古河市・結城市・下妻市・常総市・筑西市・坂東市・桜川市・八千代町・五霞町・境町')
  ];
  var TG_JISOU_LOCS = [
    loc('栃木県 中央児童相談所', '09201', '栃木県宇都宮市野沢町4-1', 36.605080, 139.857635, '028-665-7830', WD_JISOU,
      '担当: 宇都宮市・鹿沼市・日光市・真岡市・上三川町・益子町・茂木町・市貝町・芳賀町。面接・訪問は予約制'),
    loc('栃木県 県南児童相談所', '09203', '栃木県栃木市沼和田町17-22', 36.369133, 139.733215, '0282-24-6121', WD_JISOU,
      '担当: 足利市・栃木市・佐野市・小山市・下野市・壬生町・野木町。栃木駅から歩いて7分'),
    loc('栃木県 県北児童相談所', '09213', '栃木県那須塩原市南町7-20', 36.880432, 139.985657, '0287-36-1058', WD_JISOU,
      '担当: 大田原市・矢板市・那須塩原市・さくら市・那須烏山市・塩谷町・高根沢町・那須町・那珂川町。JR西那須野駅から歩いて10分')
  ];
  var GM_JISOU_LOCS = [
    loc('群馬県 中央児童相談所', '10201', '群馬県前橋市野中町360-1', 36.377579, 139.110077, '027-261-1000', '', '担当: 前橋市・伊勢崎市・佐波郡（玉村町）'),
    loc('群馬県 北部児童相談所', '10208', '群馬県渋川市金井394', 36.511509, 138.977951, '0279-20-1010', '',
      '担当: 沼田市・渋川市・北群馬郡・吾妻郡・利根郡。地図の位置は「渋川市金井」地区の中心（番地までは出ません）'),
    loc('群馬県 西部児童相談所（富岡合同庁舎内）', '10210', '群馬県富岡市田島343-1', 36.248341, 138.861115, '0274-67-5575', '',
      '担当: 藤岡市・富岡市・安中市・多野郡・甘楽郡。令和8年4月1日に高崎市から移転しました'),
    loc('群馬県 東部児童相談所', '10205', '群馬県太田市新田木崎町369-5', 36.274830, 139.307846, '0276-57-6111', '', '担当: 桐生市・太田市・館林市・みどり市・邑楽郡'),
    loc('高崎市 児童相談所', '10202', '群馬県高崎市問屋町4-4-1', 36.347328, 139.015701, '027-345-5190', '', '担当: 高崎市（高崎市が運営）')
  ];

  /* ---- 生活の相談（自立相談支援）: 共通の文 ---- */
  var KONKYU_ASK = [
    '施設（里親家庭）を出たばかりで、生活費と家賃が心配です。使える制度はありますか？',
    '住居確保給付金（家賃の給付金）の対象になるか、調べてもらえますか？',
    'お金のやりくりの相談もできますか？'
  ];
  var KONKYU_SUP = '生活困窮者自立支援法にもとづく自立相談支援機関。住居確保給付金・家計改善支援・就労準備支援などの入口。社会的養護経験者で住まいや家計に不安がある場合、早めの同行がおすすめ。';
  var KONKYU_CAUTION = '相談しただけでお金がもらえるわけではありません。でも、使える制度をいっしょに探してくれる「最初の入口」です。生活保護を受けている人は、担当のケースワーカーに相談します。';

  SM.data.programs.push(

    /* ═════════════════ 茨城県（08） ═════════════════ */

    {
      id: 'ibaraki-jiritsu-shikin',
      name: { ja: '自立支援資金貸付（茨城県）', en: 'Independence Support Loan (Ibaraki)' },
      hook: { ja: '家賃や生活費、資格のお金が足りない', en: 'I need help with rent, living costs or a licence' },
      summary: {
        ja: '茨城県内の施設や里親家庭を出た人が、生活費・家賃・資格のお金を利息なしで借りられます。決まった年数働き続けると、返さなくてよくなります。窓口は茨城県社会福祉協議会です。',
        en: 'Interest-free loans for living costs, rent and licences for people who left care in Ibaraki. Forgiven if you keep working for a set number of years. Run by the Ibaraki Council of Social Welfare.'
      },
      cat: ['money', 'housing', 'education'],
      kind: 'loan_forgivable', basis: 'pref', pref: '08', right: false,
      amount: {
        ja: '生活費 月5万円まで（進学した人）・家賃 月35,400円まで（水戸・日立・土浦・古河・取手市。ほかの市町村は34,000円）・資格の費用 25万円まで',
        en: 'Living ¥50k/month (students); rent up to ¥35,400/month (¥34,000 outside the five largest cities); licences up to ¥250k'
      },
      repay: 'conditional',
      who: { ja: '茨城県内の児童養護施設などを出た人、または里親家庭などの委託が終わった人で、親などからお金の支えがない人。生活費は大学・専門学校などに通う人、家賃は進学した人と働いている人が対象。資格の費用は、施設や里親家庭にいる間でも使えます。出てから5年以内まで申し込めます。' },
      how: { ja: 'まず施設や里親の担当の人と相談します。申込書などの書類をそろえて施設長に出すと、施設長が推薦書をつけて、決められた期間に県社協へ送ります。' },
      where: { ja: '施設・里親の担当の人 → 茨城県社会福祉協議会' },
      docs: ['自立支援資金貸付申請書（第1号様式）', '施設長の推薦書（施設が用意）', '申請チェックリストにある書類（県社協のページからダウンロード）'],
      ask: ['自立支援資金貸付を使いたいです。私は対象になりますか？', '今の申込み期間はいつまでですか？', '連帯保証人がいないときは、どうすればいいですか？'],
      caution: { ja: '申込みは年3回の期間に分かれています（資格の費用はいつでも）。期間の外でも、必要になったら相談できます。返さなくてよくなるには、進学した人は卒業後1年以内に就職して5年、働く人は5年、資格の人は2年、働き続けることが必要です。それぞれの費用の申請は1回までです。' },
      supporter: { ja: '茨城県社協 福祉人材・研修部 029-350-8366。家賃支援費の上限は住宅扶助相当（水戸・日立・土浦・古河・取手 35,400円、その他 34,000円）。進学者は定期通院の医療費実費を貸付期間のうち2年間加算可。就職者の家賃は貸付開始月から2年まで。連帯保証人1名が原則だが、立てられない場合は施設長（里親委託は児童相談所長）の意見書等で申請可。令和8年度の受付: 第1期 4/1〜5/8、第2期 8/3〜9/11、第3期 12/1〜令和9年1/29（必着）。' },
      effort: 'high',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: null, areas: ['08'] },
      deadline: {
        ja: '令和8年度は 4月1日〜5月8日・8月3日〜9月11日・12月1日〜令和9年1月29日（必着）。資格の費用は1月29日まで随時。',
        en: '2026 rounds: Apr 1–May 8, Aug 3–Sep 11, Dec 1–Jan 29 (licence costs: anytime until Jan 29)',
        leaveMonths: -3, months: [4, 5, 8, 9, 12, 1], always: false
      },
      contact: { phone: '029-350-8366', phoneLabel: '茨城県社会福祉協議会 福祉人材・研修部', line: null, chat: null, web: IB_SHIKIN, hours: null },
      locations: [],
      source: src('茨城県社会福祉協議会', IB_SHIKIN),
      sources2: [{ org: '茨城県社会福祉協議会（制度のチラシPDF）', url: IB_SHIKIN_FLYER }],
      verifiedBy: V
    },

    {
      id: 'ibaraki-jisou',
      name: { ja: '児童相談所（茨城県）', en: 'Child Guidance Centers (Ibaraki)' },
      hook: { ja: '施設や里親のこと、家のことを相談したい', en: 'I want to talk about my care placement or my family' },
      summary: {
        ja: '子どもと家族のことを、何でも相談できる県の窓口です。相談は無料で、秘密は守られます。施設や里親家庭に入ること・出ることも、児童相談所が担当しています。',
        en: 'Free, confidential public offices for children and families. They also handle placements in and out of care.'
      },
      cat: ['consult', 'procedures'],
      kind: 'service', basis: 'pref', pref: '08', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '18歳未満の子どもと、その家族など。住んでいる市町村で、担当の児童相談所が決まっています。' },
      how: { ja: '担当の児童相談所に電話します（平日 8時30分〜17時15分）。会って話したいときは、予約するとスムーズです。夜や休日は「189」へ。' },
      where: { ja: '住んでいる市町村を担当する児童相談所（地図で確認）' },
      docs: [],
      ask: ['施設を出る時期について相談したいです', '担当の児童福祉司さんと話したいです', '家に帰りたくありません。どうしたらいいですか？'],
      caution: { ja: '担当は住んでいる市町村で決まります。電話する前に、下の一覧で担当の児童相談所を確かめてね。' },
      supporter: { ja: '県の相談窓口一覧（青少年家庭課）では土浦児童相談所は 029-821-4595（福祉相談センターのページでは 0298-21-4595 表記、同じ番号）。面談は予約優先。' },
      effort: 'low',
      for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: ['08'] },
      deadline: null,
      contact: {
        phone: '189', phoneLabel: '夜・休日は 189（虐待対応ダイヤル）', line: null, chat: null, web: IB_JISOU,
        hours: { ja: '各児童相談所: 平日 8時30分〜17時15分', en: 'Weekdays 8:30–17:15' }
      },
      locations: IB_JISOU_LOCS,
      source: src('茨城県（児童相談所相談窓口）', IB_JISOU),
      sources2: [{ org: '茨城県 青少年と保護者のための相談窓口一覧（児童相談所）', url: IB_JISOU2 }],
      verifiedBy: V
    },

    {
      id: 'ibaraki-gyakutai-hotline',
      name: { ja: 'い\u2060ば\u2060ら\u2060き虐待ホットライン', en: 'Ibaraki Child Abuse Hotline' },
      hook: { ja: '家で、たたかれたり、ひどいことを言われたりする', en: 'Someone at home hits me or says terrible things' },
      summary: {
        ja: '子どもの虐待のことを、24時間・毎日相談できる茨城県の電話です。子ども本人からの相談も受けています。名前を言わなくても大丈夫です。',
        en: 'Ibaraki\'s 24-hour hotline about child abuse, every day. Children themselves can call, and you can stay anonymous.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '08', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '18歳未満の子どもの虐待のことなら、だれでも。子ども本人も相談できます。' },
      how: { ja: '電話するだけです。名前を言わなくても大丈夫。専門の相談員が話を聞き、児童相談所が関係機関と連携して動きます。' },
      where: { ja: '電話（24時間・休みなし）' },
      docs: [],
      ask: ['親にたたかれて、家に帰りたくありません', '家にいるのがこわいです。今日どこに行けばいいですか？'],
      caution: { ja: '今すぐ危ないときは 110番 へ。相談した人の秘密は守られます。' },
      supporter: { ja: '茨城県福祉部 青少年家庭課の所管。通報者の秘密は守られる。' },
      effort: 'low',
      for: { stages: ALL_ST, paths: [], care: [], careOnly: false, age: { min: 0, max: 17 }, areas: ['08'] },
      deadline: null,
      contact: {
        phone: '0293-22-0293', phoneLabel: 'い\u2060ば\u2060ら\u2060き虐待ホットライン', line: null, chat: null, web: IB_GYAKU,
        hours: { ja: '24時間・毎日', en: '24 hours, every day' }
      },
      locations: [],
      source: src('茨城県（青少年と保護者のための相談窓口一覧）', IB_GYAKU),
      verifiedBy: V
    },

    {
      id: 'ibaraki-kodomo-hotline',
      name: { ja: '子どもホットライン・い\u2060ば\u2060ら\u2060き子どもSNS相談', en: 'Ibaraki Kids Hotline & LINE chat' },
      hook: { ja: '学校や家のこと、だれかに聞いてほしい', en: 'I want someone to listen about school or home' },
      summary: {
        ja: '茨城県の、子ども専用の相談です。電話は24時間。LINEやWebチャットは毎日17時〜22時。いじめ、友だち、家族、自分のことなど、何でも話せます。',
        en: 'Ibaraki\'s help lines just for kids: phone 24 hours, LINE or web chat every day 17:00–22:00. Talk about bullying, friends, family or yourself.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '08', right: false,
      amount: { ja: '無料（通話料はかかります）', en: 'Free (call charges apply)' }, repay: null,
      who: { ja: '電話・メール: 18歳までの子ども。SNS相談: 小学生・中学生・高校生。' },
      how: { ja: '電話は 029-221-8181（24時間）。メール kodomo@edu.pref.ibaraki.jp も24時間受付。LINEかWebチャットは、下のリンクから始めます（毎日17時〜22時）。名前や学校名は言わなくて大丈夫です。' },
      where: { ja: '電話・メール・LINE・Webチャット' },
      docs: [],
      ask: ['学校に行くのがつらいです', '家の人とうまくいかなくて、家にいたくありません'],
      caution: { ja: '電話は途中で切っても大丈夫です。メールの返事には何日かかかることがあります。' },
      supporter: { ja: '子どもホットライン: 茨城県教育庁 学校教育部 生徒支援・いじめ対策推進室。相談員とは会えない（電話・FAX・メールのみ）。FAX 029-302-2166。' },
      effort: 'low',
      for: { stages: KIDS, paths: [], care: [], careOnly: false, age: { min: 6, max: 18 }, areas: ['08'] },
      deadline: null,
      contact: {
        phone: '029-221-8181', phoneLabel: '子どもホットライン（24時間）', line: null, chat: 'https://pref-ibaraki.coco-chaport.jp/', web: IB_KODOMO,
        hours: { ja: '電話 24時間／SNS 毎日 17時〜22時', en: 'Phone 24h / chat daily 17:00–22:00' }
      },
      locations: [],
      source: src('茨城県（オーバードーズ・薬物などの相談窓口）', IB_SOUDAN),
      sources2: [{ org: '茨城県教育委員会（子どもホットライン）', url: IB_KODOMO }],
      verifiedBy: V
    },

    {
      id: 'ibaraki-kokoro-sns',
      name: { ja: 'こころのSNS相談＠い\u2060ば\u2060ら\u2060き', en: 'Ibaraki Mental Health LINE Chat' },
      hook: { ja: 'つらい気持ちを、文字で聞いてほしい', en: 'I want to share how I feel by text' },
      summary: {
        ja: 'つらい気持ちや、身近な人に言いにくい悩みを、LINEで相談できる茨城県の窓口です。公認心理師などの資格をもつ相談員が答えます。無料・名前なしでOK。',
        en: 'Ibaraki\'s free, anonymous LINE chat for any worry or hard feelings, answered by qualified counselors.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '08', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '茨城県に住んでいる人、県内に通勤・通学している人（学生も大人も）。' },
      how: { ja: 'LINEで「こころのSNS相談＠い\u2060ば\u2060ら\u2060き」を友だち登録して、「相談を開始する」をタップします。' },
      where: { ja: 'LINE' },
      docs: [],
      ask: ['気持ちが落ちこんで、どうしたらいいかわかりません', 'だれにも言えないことがあります'],
      caution: { ja: '受付時間の外に送ったときは、時間になってからもう一度送ります。混んでいると待つことがあります。命が危ないときは、関係機関と連携することがあります。' },
      supporter: null,
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['08'] },
      deadline: null,
      contact: {
        phone: null, phoneLabel: null, line: 'https://lin.ee/x8sEuvO', chat: null, web: IB_KOKORO,
        hours: { ja: '月〜土 17時〜22時／日 16時〜22時', en: 'Mon–Sat 17:00–22:00, Sun 16:00–22:00' }
      },
      locations: [],
      source: src('茨城県（こころのSNS相談＠い\u2060ば\u2060ら\u2060き）', IB_KOKORO),
      verifiedBy: V
    },

    {
      id: 'ibaraki-hikikomori',
      name: { ja: '茨城県ひきこもり相談支援センター', en: 'Ibaraki Hikikomori Support Center' },
      hook: { ja: '外に出られない。家族ともあまり話せない', en: 'I can\'t go out, and I barely talk to my family' },
      summary: {
        ja: 'ひきこもりの本人や家族の相談にのってくれる、茨城県の窓口です。電話・メール・面談（予約）で相談でき、合う支援先も紹介してくれます。',
        en: 'Ibaraki\'s center for people who are withdrawn from society and their families. Talk by phone, email or in person (booking needed).'
      },
      cat: ['consult', 'work'],
      kind: 'service', basis: 'pref', pref: '08', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '茨城県に住む人。本人でも家族でも。期間は問いません。' },
      how: { ja: 'まず電話かメール（info@ibahiki.org）で連絡します。会って話すときは予約します。近くの保健所でも相談できます。' },
      where: { ja: '筑西市西方（電話・メールでも相談できます）' },
      docs: [],
      ask: ['しばらく家から出られていません。何から始めればいいですか？', '電話だけで相談してもいいですか？'],
      caution: { ja: '日曜・月曜・祝日はお休みです。会って話すのは予約制です。' },
      supporter: { ja: '一般社団法人アイネットが県の委託で運営。県内の各保健所（中央・ひたちなか・日立・潮来・竜ケ崎・土浦・つくば・筑西・古河）でも平日8:30–17:00に相談可。医師相談は保健所で予約制。' },
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['08'] },
      deadline: null,
      contact: {
        phone: '0296-48-6631', phoneLabel: 'ひきこもり相談支援センター', line: null, chat: null, web: IB_HIKI,
        hours: { ja: '火〜土 9時〜18時（祝日・年末年始は休み）', en: 'Tue–Sat 9:00–18:00' }
      },
      locations: [loc('茨城県ひきこもり相談支援センター', '08227', '茨城県筑西市西方1790-29', 36.281288, 139.959686, '0296-48-6631', '火〜土 9:00–18:00', '面談は予約制')],
      source: src('茨城県（青少年と保護者のための相談窓口一覧）', IB_HIKI),
      verifiedBy: V
    },

    {
      id: 'ibaraki-jiritsu-sodan',
      name: { ja: 'くらしとしごとの相談窓口（茨城県）', en: 'Life & work support desks (Ibaraki)' },
      hook: { ja: 'お金・仕事・住まいのこと、まとめて相談したい', en: 'I want to talk about money, work and housing in one place' },
      summary: {
        ja: 'お金・仕事・住まいに困ったときの無料の相談窓口です。市に住む人はその市の窓口、町や村に住む人は県の窓口（県民センターなど）が担当です。家賃の給付金（住居確保給付金）などにつないでくれます。',
        en: 'Free help with money, work and housing. If you live in a city, go to your city\'s desk; town and village residents go to the prefecture\'s offices. They connect you to support such as the Housing Security Benefit.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: 'pref', pref: '08', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: 'お金などのことで生活に困っている人、仕事のない状態が長く続いている人など（生活保護を受けている人はのぞく）。' },
      how: { ja: '住んでいる市（町村の人は下の県の窓口）に電話して「生活の相談をしたい」と伝えます。相談員がいっしょに困りごとを整理して、計画を立ててくれます。' },
      where: { ja: '市に住む人: 市の窓口（県の一覧PDF）／町村に住む人: 県北・県央・県南・県西の窓口' },
      docs: [],
      ask: KONKYU_ASK,
      caution: { ja: KONKYU_CAUTION },
      supporter: { ja: KONKYU_SUP + ' 県の一覧（令和6年4月現在）: 大子町→県北県民センター 0294-80-3320／茨城町・大洗町・城里町・東海村→福祉相談センター 029-226-1512／美浦村・阿見町・河内町・利根町→県南県民センター 029-822-7241／八千代町・五霞町・境町→県西県民センター境分室 0280-87-0224。制度の問い合わせ: 県福祉人材・指導課 保護担当 029-301-3164。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['08'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: { phone: null, phoneLabel: null, line: null, chat: null, web: IB_KONKYU_PDF, hours: null },
      locations: [
        loc('県北県民センター 生活自立相談窓口（常陸太田合同庁舎1階）', '08212', '茨城県常陸太田市山下町4119', 36.527164, 140.531418, '0294-80-3320', '', '担当: 大子町'),
        loc('福祉相談センター 生活自立相談窓口（三の丸庁舎2階）', '08201', '茨城県水戸市三の丸1-5-38', 36.376850, 140.474380, '029-226-1512', '', '担当: 茨城町・大洗町・城里町・東海村'),
        loc('県南県民センター 生活自立相談窓口（土浦合同庁舎1階）', '08203', '茨城県土浦市真鍋5-17-26', 36.102085, 140.195358, '029-822-7241', '', '担当: 美浦村・阿見町・河内町・利根町'),
        loc('県西県民センター 境分室 生活自立相談窓口（境合同庁舎1階）', '08546', '茨城県猿島郡境町長井戸320', 36.123444, 139.803314, '0280-87-0224', '', '担当: 八千代町・五霞町・境町')
      ],
      source: src('茨城県（生活困窮者自立支援制度）', IB_KONKYU),
      sources2: [{ org: '茨城県（茨城県内の自立相談支援窓口のご案内 PDF・令和6年4月現在）', url: IB_KONKYU_PDF }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'mito-jiritsu-sodan',
      name: { ja: '水戸市 自立相談支援室', en: 'Mito City Self-Reliance Support Office' },
      hook: { ja: '家賃が払えない。住むところがなくなりそう', en: 'I can\'t pay rent and might lose my home' },
      summary: {
        ja: '水戸市に住む人のための、仕事・生活・住まいの無料の相談窓口です。家賃の給付金（住居確保給付金）の受付もここ。住まいがない人には、3か月まで無料で住む場所と食事を用意する「シェルター」もあります。',
        en: 'Free help for Mito residents with work, money and housing, including the Housing Security Benefit. If you have nowhere to live, a shelter offers free housing and meals for up to 3 months.'
      },
      cat: ['housing', 'consult', 'money', 'work'],
      kind: 'service', basis: 'local', pref: '08', right: false,
      amount: { ja: '相談・利用は無料', en: 'Free' }, repay: null,
      who: { ja: '水戸市に住んでいて、仕事をやめたなどの理由で生活に困っている人、住まいのことで困っている人。' },
      how: { ja: 'まず電話（029-291-3941）か、市役所2階の窓口213へ。家賃の給付金・家計の相談・シェルターを使いたいときも、受付はここです。' },
      where: { ja: '水戸市役所 2階 窓口213' },
      docs: [],
      ask: ['住むところがなくなりそうです。シェルターは使えますか？', '住居確保給付金（家賃の給付金）の対象になりますか？', '仕事を始める準備から手伝ってもらえますか？'],
      caution: { ja: '給付金には条件があり、家賃の上限もあります。シェルターは3か月までで、そのあいだに次の住まいを一緒に探します。' },
      supporter: { ja: KONKYU_SUP + ' 運営: 水戸市社会福祉協議会。メール jiritusien@mito-syakyo.or.jp。住居確保給付金は原則3か月・最長9か月。居住支援事業（シェルター）は3か月間、衣食住を無償提供。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['08201'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '029-291-3941', phoneLabel: '水戸市自立相談支援室', line: null, chat: null, web: MITO,
        hours: { ja: '平日 8時30分〜17時（土日祝・年末年始は休み）', en: 'Weekdays 8:30–17:00' }
      },
      locations: [loc('水戸市 自立相談支援室（水戸市役所 2階 窓口213）', '08201', '茨城県水戸市中央1-4-1', 36.366558, 140.472672, '029-291-3941', '平日 8:30–17:00', '')],
      source: src('水戸市（自立相談支援事業）', MITO),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'ibaraki-saposute',
      name: { ja: '若者サポートステーション（茨城県）', en: 'Youth Support Stations (Ibaraki)' },
      hook: { ja: '働くことに自信がない。何から始めればいい？', en: 'I\'m not confident about working. Where do I start?' },
      summary: {
        ja: '働きはじめる前の準備から、仕事が決まったあとまで支えてくれる、国の委託の無料窓口です。茨城県には水戸・筑西・つくばの3か所があります。',
        en: 'Free, government-funded centers that help you get ready for work and keep a job. Ibaraki has three: Mito, Chikusei and Tsukuba.'
      },
      cat: ['work', 'consult'],
      kind: 'service', basis: 'national', pref: '08', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '15〜49歳で、今は働いていない・学校に行っていない人と、その家族。' },
      how: { ja: '近くのサポステに電話して、相談の予約をします。' },
      where: { ja: '水戸市・筑西市・つくば市のサポステ' },
      docs: [],
      ask: ['まず話を聞くだけでもいいですか？', '職場体験はできますか？'],
      caution: { ja: '仕事の紹介は少なめです。ハローワークと一緒に使うのがおすすめです。' },
      supporter: { ja: '厚生労働省委託。職場定着までの支援がある。' },
      effort: 'low',
      for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 15, max: 49 }, areas: ['08'] },
      deadline: { ja: 'いつでも', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: { phone: '0120-717-557', phoneLabel: 'い\u2060ば\u2060ら\u2060き若者サポートステーション（水戸）', line: null, chat: null, web: SAPO, hours: null },
      locations: [
        loc('い\u2060ば\u2060ら\u2060き若者サポートステーション（MIOSビル1階）', '08201', '茨城県水戸市赤塚1-1', 36.382076, 140.415100, '0120-717-557', '', ''),
        loc('い\u2060ば\u2060ら\u2060き県西若者サポートステーション', '08227', '茨城県筑西市西方1790-29', 36.281288, 139.959686, '0296-54-6012', '', ''),
        loc('い\u2060ば\u2060ら\u2060き県南若者サポートステーション（荒井マンションⅡ 2C）', '08220', '茨城県つくば市東新井28-4', 36.074554, 140.112335, '029-893-3380', '', '')
      ],
      source: src('厚生労働省（全国のサポステ）', SAPO),
      sources2: [
        { org: '厚生労働省（い\u2060ば\u2060ら\u2060き若者サポートステーション）', url: sapoUrl('sec0201-ibaraki') },
        { org: '厚生労働省（サポステとは）', url: SAPO_ABOUT }
      ],
      verifiedBy: V
    },

    /* ═════════════════ 栃木県（09） ═════════════════ */

    {
      id: 'tochigi-jisou',
      name: { ja: '児童相談所（栃木県）', en: 'Child Guidance Centers (Tochigi)' },
      hook: { ja: '施設や里親のこと、家のことを相談したい', en: 'I want to talk about my care placement or my family' },
      summary: {
        ja: '子どもに関するどんなことでも相談できる県の窓口です。県内に3か所あり、住んでいる市町で担当が決まっています。施設や里親家庭に入ること・出ることも担当しています。',
        en: 'Public offices for any matter about children, including placements in and out of care. Tochigi has three, each covering certain towns.'
      },
      cat: ['consult', 'procedures'],
      kind: 'service', basis: 'pref', pref: '09', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '18歳未満の子どもと、その家族など。' },
      how: { ja: '担当の児童相談所に電話します（平日 8時30分〜17時15分）。会って話すときや家に来てもらうときは予約します。夜や休日は「189」へ。' },
      where: { ja: '住んでいる市町を担当する児童相談所（地図で確認）' },
      docs: [],
      ask: ['施設を出る時期について相談したいです', '担当の児童福祉司さんと話したいです', '家にいるのがつらいです。相談できますか？'],
      caution: { ja: '担当は住んでいる市町で決まります。電話する前に、下の一覧で担当を確かめてね。' },
      supporter: { ja: '栃木県は中央・県南・県北の3児童相談所。テレホン児童相談（028-665-7788、毎日9–20時）も別にある。' },
      effort: 'low',
      for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: ['09'] },
      deadline: null,
      contact: {
        phone: '189', phoneLabel: '夜・休日は 189（虐待対応ダイヤル）', line: null, chat: null, web: TG_JISOU,
        hours: { ja: '各児童相談所: 平日 8時30分〜17時15分', en: 'Weekdays 8:30–17:15' }
      },
      locations: TG_JISOU_LOCS,
      source: src('栃木県（県内児童相談所一覧）', TG_JISOU),
      sources2: [{ org: '栃木県（心や体の健康などについての相談窓口）', url: TG_SOUDAN }],
      verifiedBy: V
    },

    {
      id: 'tochigi-tel-jidou',
      name: { ja: 'テレホン児童相談（栃木県）', en: 'Tochigi Child Telephone Line' },
      hook: { ja: '名前を言わずに、子どものことを相談したい', en: 'I want to talk about a child\'s worries without giving my name' },
      summary: {
        ja: '子どもについての心配や悩みを、専門の電話相談員に相談できます。毎日9時〜20時。名前を言わなくても大丈夫で、秘密は守られます。',
        en: 'Talk to a trained phone counselor about worries concerning children, every day 9:00–20:00. Anonymous and confidential.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '09', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '子どもについて心配や悩みがある人。' },
      how: { ja: '028-665-7788 に電話します。名前は言わなくて大丈夫です。' },
      where: { ja: '電話' },
      docs: [],
      ask: ['家のことで悩んでいます。話を聞いてもらえますか？', 'どこに相談したらいいか教えてください'],
      caution: { ja: '今すぐ危ないときは 110番 へ。' },
      supporter: { ja: '栃木県中央児童相談所のページで案内。保護者専用の「家庭教育ホットライン」028-665-7867 もある。' },
      effort: 'low',
      for: { stages: ALL_ST, paths: [], care: [], careOnly: false, age: null, areas: ['09'] },
      deadline: null,
      contact: {
        phone: '028-665-7788', phoneLabel: 'テレホン児童相談', line: null, chat: null, web: TG_TEL,
        hours: { ja: '毎日 9時〜20時', en: 'Every day 9:00–20:00' }
      },
      locations: [],
      source: src('栃木県（テレホン児童相談）', TG_TEL),
      verifiedBy: V
    },

    {
      id: 'tochigi-sns-soudan',
      name: { ja: 'SNS相談＠と\u2060ち\u2060ぎ（中学生・高校生）', en: 'Tochigi LINE chat for students' },
      hook: { ja: 'いじめや学校のこと、LINEで相談したい', en: 'I want to talk about bullying or school on LINE' },
      summary: {
        ja: '栃木県教育委員会の、中学生・高校生のためのLINE相談です。悩みの相談や、いじめの通報ができます。毎週水曜・日曜の19時〜21時（長い休みの前後は毎日）。',
        en: 'Tochigi Board of Education\'s LINE chat for junior high and high school students, for worries and reporting bullying. Wed & Sun 19:00–21:00 (daily around school breaks).'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '09', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '栃木県内の中学校・高校・特別支援学校（中・高等部）などに通う生徒。' },
      how: { ja: '学校で配られたQRコードつきのカードを読みこんで、LINEで登録します。カードがないときは、学校の先生に聞いてね。' },
      where: { ja: 'LINE' },
      docs: [],
      ask: ['いじめられています。どうしたらいいですか？', '友だちのことで悩んでいます'],
      caution: { ja: '受付は決まった時間だけです（令和8年度: 4月25日〜令和9年3月31日の水曜・日曜 19時〜21時。8月23日〜9月9日、1月3日〜1月13日は毎日）。急ぐときは電話の相談へ。' },
      supporter: { ja: '栃木県教育委員会 児童生徒指導推進室。集中期間 第1期 4/25〜5/13、第2期 8/23〜9/9、第3期 1/3〜1/13 は毎日19–21時。' },
      effort: 'low',
      for: { stages: KIDS, paths: [], care: [], careOnly: false, age: { min: 12, max: 18 }, areas: ['09'] },
      deadline: null,
      contact: {
        phone: null, phoneLabel: null, line: null, chat: null, web: TG_SNS,
        hours: { ja: '水・日 19時〜21時（集中期間は毎日）', en: 'Wed & Sun 19:00–21:00 (daily in peak periods)' }
      },
      locations: [],
      source: src('栃木県教育委員会（SNSを活用した相談事業）', TG_SNS),
      verifiedBy: V
    },

    {
      id: 'tochigi-kokoro-line',
      name: { ja: 'こころの相談＠と\u2060ち\u2060ぎ（LINE）', en: 'Tochigi Mental Health LINE Chat' },
      hook: { ja: '不安やストレスを、文字で聞いてほしい', en: 'I want to share my worries and stress by text' },
      summary: {
        ja: '心の不安や悩み、ストレスを、LINEで相談できる栃木県の窓口です。日・火・木曜の18時〜22時。名前なし・無料で使えます。',
        en: 'Tochigi\'s free, anonymous LINE chat for worries and stress. Sun, Tue and Thu 18:00–22:00.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '09', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '栃木県に住んでいる人。' },
      how: { ja: '県のページの2次元コードからLINEで友だち登録して、「LINEでこころの相談を希望する方はこちら」を選びます。答えたくない質問は「答えたくない」で大丈夫です。' },
      where: { ja: 'LINE' },
      docs: [],
      ask: ['眠れなくて、気持ちが落ちこんでいます', 'だれにも言えない悩みがあります'],
      caution: { ja: '混んでいると、すぐに相談できないことがあります。命が危ないときは、警察などと連携することがあります。' },
      supporter: { ja: '栃木県障害福祉課。電話相談は「こころのダイヤル」（県のページから）。' },
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['09'] },
      deadline: null,
      contact: {
        phone: null, phoneLabel: null, line: null, chat: TG_KOKORO, web: TG_KOKORO,
        hours: { ja: '日・火・木 18時〜22時', en: 'Sun, Tue, Thu 18:00–22:00' }
      },
      locations: [],
      source: src('栃木県（SNS相談「こころの相談＠と\u2060ち\u2060ぎ」）', TG_KOKORO),
      verifiedBy: V
    },

    {
      id: 'tochigi-young-carer-line',
      name: { ja: 'と\u2060ち\u2060ぎヤングケアラーチャンネル（LINE）', en: 'Tochigi Young Carer LINE Channel' },
      hook: { ja: '家族のお世話で、自分の時間がない', en: 'Caring for my family leaves me no time for myself' },
      summary: {
        ja: '家族のお世話をしている子ども・若者のための、栃木県のLINE相談です。相談員には元ヤングケアラーが多くいます。メッセージはいつでも送れて、平日11時〜20時に返事がきます。',
        en: 'Tochigi\'s LINE chat for young people who care for family members. Many counselors were young carers themselves. Send any time; replies on weekdays 11:00–20:00.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '09', right: false,
      amount: { ja: '無料（通信料はかかります）', en: 'Free (data charges apply)' }, repay: null,
      who: { ja: '家族のお世話（ケア）をしている子ども・若者。日常の悩みも相談できます。' },
      how: { ja: 'LINEで「と\u2060ち\u2060ぎヤングケアラーチャンネル」を友だち登録して、メッセージを送ります。名前なしで使えます。' },
      where: { ja: 'LINE' },
      docs: [],
      ask: ['家族の世話で、勉強する時間がありません', 'だれかに話を聞いてほしいです'],
      caution: { ja: '返事は月〜金曜（祝日・年末年始をのぞく）の11時〜20時です。' },
      supporter: { ja: '栃木県こども政策課。相談員は心理士・看護師・社会福祉士など。' },
      effort: 'low',
      for: { stages: ALL_ST, paths: [], care: [], careOnly: false, age: null, areas: ['09'] },
      deadline: null,
      contact: {
        phone: null, phoneLabel: null, line: 'https://lin.ee/f43UMfr', chat: null, web: TG_YC,
        hours: { ja: '送信は24時間／返事は平日 11時〜20時', en: 'Send 24h / replies weekdays 11:00–20:00' }
      },
      locations: [],
      source: src('栃木県（と\u2060ち\u2060ぎヤングケアラーチャンネル）', TG_YC),
      verifiedBy: V
    },

    {
      id: 'tochigi-josei-line',
      name: { ja: '困難を抱える女性LINE相談＠と\u2060ち\u2060ぎ', en: 'Tochigi LINE chat for women in difficulty' },
      hook: { ja: 'DVや性被害のこと、電話では話しにくい', en: 'It\'s hard to talk about abuse or sexual violence on the phone' },
      summary: {
        ja: 'DV・性被害・生活の困りごとなどを、LINEのチャットで相談できる栃木県の窓口です。火曜と土曜の15時〜22時。秘密は守られ、名前なしでも相談できます。',
        en: 'Tochigi\'s LINE chat for women facing abuse, sexual violence or money trouble. Tue & Sat 15:00–22:00. Confidential, anonymous OK.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '09', right: false,
      amount: { ja: '無料（通信料はかかります）', en: 'Free (data charges apply)' }, repay: null,
      who: { ja: '栃木県に住んでいて、暮らしの中で困った問題をかかえている女性（そうなりそうな人も）。' },
      how: { ja: 'LINEで友だち登録して、チャットで相談します。' },
      where: { ja: 'LINE' },
      docs: [],
      ask: ['これってDVかな？と思うことがあります', '仕事ができなくなって、生活に困っています'],
      caution: { ja: '混んでいるとすぐに相談できないことがあります。10分以上返事がないと終わることがあります。危険があるときは警察などと連携することがあります。' },
      supporter: { ja: '栃木県 人権・男女共同参画課。電話の相談先は県の「DV・性暴力被害に関する相談窓口」のページ。' },
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['09'] },
      deadline: null,
      contact: {
        phone: null, phoneLabel: null, line: 'https://lin.ee/inKys5f', chat: null, web: TG_JOSEI,
        hours: { ja: '火・土 15時〜22時', en: 'Tue & Sat 15:00–22:00' }
      },
      locations: [],
      source: src('栃木県（困難を抱える女性LINE相談＠と\u2060ち\u2060ぎ）', TG_JOSEI),
      verifiedBy: V
    },

    {
      id: 'tochigi-polaris',
      name: { ja: 'ポラリス☆と\u2060ち\u2060ぎ（子ども若者・ひきこもり総合相談センター）', en: 'Polaris Tochigi (youth & hikikomori center)' },
      hook: { ja: '学校にも仕事にも行けていない。どうしよう', en: 'I\'m not going to school or work. What now?' },
      summary: {
        ja: 'ひきこもり・ニート・不登校など、いろいろな悩みをかかえる子ども・若者と家族の、栃木県の相談窓口です。電話・メール・面談（予約）で、無料で相談できます。',
        en: 'Tochigi\'s free center for young people (and families) dealing with withdrawal, not working or not going to school. Phone, email or in person (booking).'
      },
      cat: ['consult', 'work'],
      kind: 'service', basis: 'pref', pref: '09', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '悩みや困りごとをかかえる子ども・若者と、その家族。ひきこもりのことは年齢に関係なくだれでも。' },
      how: { ja: '電話（028-643-3422）かメール（soudan@polaris-t.net）で連絡します。会って話すときは予約します（1回1時間・無料）。' },
      where: { ja: '宇都宮市下戸祭' },
      docs: [],
      ask: ['学校に行けていません。何から始めればいいですか？', '家族といっしょに相談してもいいですか？'],
      caution: { ja: '日曜・月曜はお休みです。会って話すのは予約制です。' },
      supporter: { ja: '県が一般社団法人栃木県若年者支援機構に委託（子ども・若者総合相談センター兼ひきこもり地域支援センター）。中高年ひきこもり専用電話 028-643-3438。市町の窓口一覧は県のページ。' },
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['09'] },
      deadline: null,
      contact: {
        phone: '028-643-3422', phoneLabel: 'ポラリス☆と\u2060ち\u2060ぎ', line: null, chat: null, web: TG_POLARIS,
        hours: { ja: '火〜土 10時〜19時', en: 'Tue–Sat 10:00–19:00' }
      },
      locations: [loc('ポラリス☆と\u2060ち\u2060ぎ', '09201', '栃木県宇都宮市下戸祭2-3-3', 36.571697, 139.878052, '028-643-3422', '火〜土 10:00–19:00', '面談は予約制')],
      source: src('栃木県（ひきこもり支援）', TG_POLARIS),
      verifiedBy: V
    },

    {
      id: 'tochigi-jiritsu-sodan',
      name: { ja: 'くらしとしごとの相談窓口（栃木県）', en: 'Life & work support desks (Tochigi)' },
      hook: { ja: 'お金・仕事・住まいのこと、まとめて相談したい', en: 'I want to talk about money, work and housing in one place' },
      summary: {
        ja: '生活に困ったときの無料の相談窓口です。市に住む人はその市、町に住む人は町の窓口（または県の健康福祉センター）が担当です。相談員がいっしょに支援プランを作ってくれます。',
        en: 'Free help when life gets hard. Each city and town in Tochigi has a desk; a counselor makes a support plan with you.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: 'pref', pref: '09', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '生活に困っている人。お金のことだけでなく、人とのつながりがない、どこに相談したらいいかわからない人も。' },
      how: { ja: '住んでいる市や町の窓口に電話します（一覧は県のページ）。相談員がいないこともあるので、行く前に電話しよう。' },
      where: { ja: '住んでいる市・町の窓口（県のページの一覧）' },
      docs: [],
      ask: KONKYU_ASK,
      caution: { ja: KONKYU_CAUTION },
      supporter: { ja: KONKYU_SUP + ' 町在住者は県の健康福祉センターが実施主体: 県東（益子・茂木・市貝・芳賀）0285-82-3322／県南（上三川・壬生・野木）0285-21-2948／県北（塩谷・高根沢・那須・那珂川）0287-23-2171。市在住者は各市（宇都宮市は宇都宮市社協 028-612-6668 など、県のページに全市町の番号）。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['09'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: { phone: null, phoneLabel: null, line: null, chat: null, web: TG_KONKYU, hours: null },
      locations: [],
      source: src('栃木県（生活困窮者自立支援制度）', TG_KONKYU),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'utsunomiya-jiritsu-sodan',
      name: { ja: '宇都宮市 自立相談支援機関（宇都宮市社会福祉協議会）', en: 'Utsunomiya Self-Reliance Support Desk' },
      hook: { ja: '仕事をなくして、家賃が払えない', en: 'I lost my job and can\'t pay rent' },
      summary: {
        ja: '宇都宮市に住む人のための、仕事・お金・住まいの無料の相談窓口です。仕事さがしの手伝いや、家賃の給付金（住居確保給付金）の受付をしています。',
        en: 'Free help for Utsunomiya residents with work, money and housing, including job-search support and the Housing Security Benefit.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: 'local', pref: '09', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '宇都宮市に住んでいて、仕事をやめた・収入がへったなどで生活に困っている人。' },
      how: { ja: 'まず電話（028-612-6668）で相談します。窓口は総合福祉センター5階（東武宇都宮駅から歩いて5分）。' },
      where: { ja: '宇都宮市総合福祉センター 5階' },
      docs: [],
      ask: KONKYU_ASK,
      caution: { ja: '給付金には条件があり、対象にならないこともあります。' + KONKYU_CAUTION },
      supporter: { ja: KONKYU_SUP + ' 宇都宮市から宇都宮市社会福祉協議会に委託。メール jiritsu@utsunomiya-syakyo.or.jp。住居確保給付金は原則3か月（延長2回まで）。生活福祉資金（総合支援資金）は市社協 028-636-1251（事前に電話）。生活保護は市役所 生活福祉第1課・第2課 028-632-2105・2465。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['09201'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '028-612-6668', phoneLabel: '自立相談支援機関（宇都宮市社協）', line: null, chat: null, web: UTSU,
        hours: { ja: '平日 8時30分〜17時15分（土日祝・年末年始は休み）', en: 'Weekdays 8:30–17:15' }
      },
      locations: [loc('宇都宮市 自立相談支援機関（宇都宮市総合福祉センター 5階）', '09201', '栃木県宇都宮市中央1-1-15', 36.559074, 139.882141, '028-612-6668', '平日 8:30–17:15', '東武宇都宮駅から歩いて5分')],
      source: src('宇都宮市（生活にお困りの方への相談窓口のご案内）', UTSU),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'tochigi-kyufukin',
      name: { ja: '奨学のための給付金（栃木県・公立高校）', en: 'Tochigi Scholarship Benefit (public high schools)' },
      hook: { ja: '教科書や制服、学用品のお金が足りない', en: 'I can\'t afford textbooks, uniforms or school supplies' },
      summary: {
        ja: '公立高校などに通う生徒がいる、収入の少ない家庭に、授業料以外の教育費として返さなくていいお金を出してくれます。毎年、申請が必要です。',
        en: 'A non-repayable benefit for lower-income families of public high school students, for costs other than tuition. Apply every year.'
      },
      cat: ['education', 'money'],
      kind: 'grant', basis: 'pref', pref: '09', right: false,
      amount: {
        ja: '全日制・定時制で 年35,930円〜143,700円（住民税が非課税の家庭は143,700円、生活保護の家庭は32,300円）',
        en: 'Full/part-time: ¥35,930–¥143,700 a year (¥143,700 for tax-exempt households; ¥32,300 on welfare)'
      },
      repay: 'none',
      who: { ja: '7月1日の時点で、保護者が栃木県に住んでいて、公立の高校・高専（3年まで）などに通う生徒がいる家庭のうち、生活保護・住民税が非課税・所得割が少ない家庭。' },
      how: { ja: '保護者が申請書と書類を、通っている学校に出します（県外の一部の学校の人は県に郵送）。マイナンバーでも申請できます。' },
      where: { ja: '通っている学校' },
      docs: ['申請書（その1 または その2）', '課税（非課税）証明書（保護者全員分）または マイナンバーの写し', '口座届出書と通帳の写し', '在学証明書（栃木県立高校の人はいらない）'],
      ask: ['給付金の申請は、学校にいつまでに出せばいいですか？', '私の家は対象になりますか？', 'マイナンバーで申請できますか？'],
      caution: { ja: '施設などにいて、措置費から見学旅行費や特別育成費が出ている人は対象になりません。税の申告をしていない保護者は、先に市町村で申告が必要です。' },
      supporter: { ja: '県内の国公立校・茨城/群馬/埼玉の公立校は在籍校が指定する日まで。それ以外の国公立校は県教育政策課に令和8年9月18日まで。家計急変世帯向けの申請もある。問い合わせ: 教育政策課 028-623-3354。私立高校は文書学事課のページ。' },
      effort: 'mid',
      for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['09'] },
      deadline: { ja: '学校が指定する日まで（県に直接出す人は令和8年9月18日まで）', en: 'By your school\'s deadline (direct applications: Sep 18, 2026)', leaveMonths: null, months: [7, 8, 9], always: false },
      contact: { phone: '028-623-3354', phoneLabel: '栃木県教育委員会 教育政策課', line: null, chat: null, web: TG_KYUFU, hours: null },
      locations: [],
      source: src('栃木県教育委員会（栃木県奨学のための給付金（公立）制度）', TG_KYUFU),
      verifiedBy: V
    },

    {
      id: 'tochigi-saposute',
      name: { ja: '若者サポートステーション（栃木県）', en: 'Youth Support Stations (Tochigi)' },
      hook: { ja: '働くことに自信がない。何から始めればいい？', en: 'I\'m not confident about working. Where do I start?' },
      summary: {
        ja: '働きはじめる前の準備から、仕事が決まったあとまで支えてくれる、国の委託の無料窓口です。栃木県には宇都宮・小山・大田原の3か所があります。',
        en: 'Free, government-funded centers that help you get ready for work and keep a job. Tochigi has three: Utsunomiya, Oyama and Otawara.'
      },
      cat: ['work', 'consult'],
      kind: 'service', basis: 'national', pref: '09', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '15〜49歳で、今は働いていない・学校に行っていない人と、その家族。' },
      how: { ja: '近くのサポステに電話して、相談の予約をします。' },
      where: { ja: '宇都宮市・小山市・大田原市のサポステ' },
      docs: [],
      ask: ['まず話を聞くだけでもいいですか？', '職場体験はできますか？'],
      caution: { ja: '仕事の紹介は少なめです。ハローワークと一緒に使うのがおすすめです。' },
      supporter: { ja: '厚生労働省委託。職場定着までの支援がある。' },
      effort: 'low',
      for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 15, max: 49 }, areas: ['09'] },
      deadline: { ja: 'いつでも', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: { phone: '028-612-2341', phoneLabel: 'と\u2060ち\u2060ぎ若者サポートステーション（宇都宮）', line: null, chat: null, web: SAPO, hours: null },
      locations: [
        loc('と\u2060ち\u2060ぎ若者サポートステーション（サエラビル3階）', '09201', '栃木県宇都宮市駅前通り1-5-13', 36.559727, 139.896530, '028-612-2341', '', ''),
        loc('と\u2060ち\u2060ぎ県南若者サポートステーション（小山市総合福祉センター3階）', '09208', '栃木県小山市中央町2-2-21', 36.313663, 139.802139, '0285-25-7002', '', ''),
        loc('と\u2060ち\u2060ぎ県北若者サポートステーション', '09210', '栃木県大田原市若草1-832', 36.858398, 140.033081, '080-8747-8663', '', '')
      ],
      source: src('厚生労働省（全国のサポステ）', SAPO),
      sources2: [
        { org: '厚生労働省（と\u2060ち\u2060ぎ若者サポートステーション）', url: sapoUrl('sec0204-tochigi') },
        { org: '厚生労働省（サポステとは）', url: SAPO_ABOUT }
      ],
      verifiedBy: V
    },

    /* ═════════════════ 群馬県（10） ═════════════════ */

    {
      id: 'gunma-jiritsu-shikin',
      name: { ja: '自立支援資金貸付（群馬県）', en: 'Independence Support Loan (Gunma)' },
      hook: { ja: '家賃や生活費、資格のお金が足りない', en: 'I need help with rent, living costs or a licence' },
      summary: {
        ja: '群馬県内の施設や里親家庭を出た人が、生活費・家賃・資格のお金を利息なしで借りられる県の制度です。決まった年数働き続けると、返さなくてよくなります。',
        en: 'Gunma\'s interest-free loans for living costs, rent and licences for people who left care. Forgiven if you keep working for a set number of years.'
      },
      cat: ['money', 'housing', 'education'],
      kind: 'loan_forgivable', basis: 'pref', pref: '10', right: false,
      amount: {
        ja: '生活費 月5万円（進学した人）・家賃（住んでいる地域の生活保護の家賃の上限まで）・資格の費用 25万円まで',
        en: 'Living ¥50k/month (students); rent (up to the local welfare housing cap); licences up to ¥250k'
      },
      repay: 'conditional',
      who: { ja: '群馬県内の児童養護施設などを出た人、または里親家庭などの委託が終わった人で、親などからお金の支えがない人。生活費は大学・専門学校などに通う人、家賃は進学した人と働いている人が対象。資格の費用は、施設や里親家庭にいる間でも使えます。' },
      how: { ja: '施設か児童相談所を通して、群馬県社会福祉協議会に書類を出します。書類の審査と、本人・連帯保証人との面接のあとで決まります。家賃・生活費は毎月振り込まれます。' },
      where: { ja: '施設・児童相談所 → 群馬県社会福祉協議会 福祉資金課' },
      docs: ['貸付申請書', '施設長または児童相談所長の意見書', '法定代理人の同意書（未成年のとき）', '世帯全員の住民票', '連帯保証人の住民票と、資力がわかる書類', '在学証明書（進学）／在職証明書（就職）', '賃貸契約書の写しなど（家賃）', '資格の費用がわかるもの（資格）'],
      ask: ['自立支援資金貸付を使いたいです。私は対象になりますか？', '連帯保証人がいないときは、どうすればいいですか？', '返さなくてよくなる条件を教えてください'],
      caution: { ja: '連帯保証人は原則必要で、未成年のときは親権者などの同意が原則必要です。むずかしいときは担当の人に相談しよう。学校をやめたり仕事をやめたりすると、契約が終わって返すことになります。在学中も働いてからも、定期的に今の様子を報告します。' },
      supporter: { ja: '群馬県児童福祉課の事業、窓口は群馬県社協 福祉資金課 027-255-6031（前橋市新前橋町13-12）。返還免除: 進学者は卒業後1年以内に就職し5年継続、就職者は5年継続、資格取得は2年継続（いずれも週20時間以上）。就職者の家賃は退所後2年まで。延滞利子 年3%。' },
      effort: 'high',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: null, areas: ['10'] },
      deadline: { ja: '締切はページにのっていません。出る日が決まったら早めに担当の人に相談を', en: 'No deadline listed; ask early once your leaving date is set', leaveMonths: -3, months: null, always: false },
      contact: { phone: '027-255-6031', phoneLabel: '群馬県社会福祉協議会 福祉資金課', line: null, chat: null, web: GM_SHIKIN, hours: null },
      locations: [],
      source: src('群馬県（児童福祉課）', GM_SHIKIN),
      verifiedBy: V
    },

    {
      id: 'gunma-ippo',
      name: { ja: 'ヤング・アシスト い\u2060っ\u2060ぽ（群馬県）', en: 'Young Assist Ippo (Gunma care-leaver base)' },
      hook: { ja: 'ひとり暮らしや仕事のこと、頼れる大人がほしい', en: 'I want an adult I can rely on for living alone and work' },
      summary: {
        ja: '群馬県の「社会的養護自立支援拠点」です。くらしと仕事の相談、ひとり暮らしの準備、仕事さがし、高卒認定などの勉強まで、無料で手伝ってくれます。気軽に立ち寄れる居場所でもあります。',
        en: 'Gunma\'s base for care-experienced young people: free help with daily life, work, living alone, job matching and study (e.g. the high-school equivalency exam), plus a drop-in space.'
      },
      cat: ['consult', 'work', 'housing'],
      kind: 'place', basis: 'npo', pref: '10', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '児童養護施設・里親家庭などで暮らしたことのある人、今暮らしていて近く自立する人、虐待を受けたのに公的な支援につながらなかった人。年齢の制限はありません。' },
      how: { ja: 'まず電話・LINE・メールで連絡します。1対1の相談は1人1時間で、予約制です。電話だけでなく、出かけて行く相談もしています。' },
      where: { ja: '前橋市南町（グランコート南町 301号室）' },
      docs: [],
      ask: ['初めて相談したいです。いつ行けますか？', 'ひとり暮らしの準備を手伝ってもらえますか？', '仕事さがしや、職場見学もできますか？'],
      caution: { ja: '木曜・日曜・祝日はお休みです。LINE・メールはいつでも送れますが、返事には時間がかかることがあります。' },
      supporter: { ja: '一般社団法人ヤング・アシスト（群馬県 社会的養護自立支援拠点事業の委託事業所。2018年県受託、2024年度から拠点事業）。FAX 027-289-3772。食料・日用品の寄付の受け取り、弁護士相談・学習支援、協力企業とのマッチングと職場定着支援あり。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: false, age: null, areas: ['10'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '027-289-3771', phoneLabel: 'ヤング・アシスト い\u2060っ\u2060ぽ', line: 'https://line.me/ti/p/fi79uPV2AU', chat: null,
        web: 'https://youngassist.com/howto.php',
        hours: { ja: '月・火・水・金・土 10時〜16時（木・日・祝日は休み）', en: 'Mon/Tue/Wed/Fri/Sat 10:00–16:00' }
      },
      locations: [loc('ヤング・アシスト い\u2060っ\u2060ぽ（グランコート南町 301号室）', '10201', '群馬県前橋市南町3-3-5', 36.382492, 139.068970, '027-289-3771',
        '月・火・水・金・土 10:00–16:00（木・日・祝 休み）', '個別相談は予約制（1人1時間）')],
      source: src('一般社団法人ヤング・アシスト（い\u2060っ\u2060ぽ）', IPPO),
      sources2: [
        { org: 'ヤング・アシスト い\u2060っ\u2060ぽ（相談の流れ）', url: 'https://youngassist.com/howto.php' },
        { org: 'ヤング・アシスト い\u2060っ\u2060ぽ（法人概要）', url: 'https://youngassist.com/profile.php' }
      ],
      verifiedBy: V
    },

    {
      id: 'gunma-jisou',
      name: { ja: '児童相談所（群馬県・高崎市）', en: 'Child Guidance Centers (Gunma)' },
      hook: { ja: '施設や里親のこと、家のことを相談したい', en: 'I want to talk about my care placement or my family' },
      summary: {
        ja: '子どもと家族のことを相談できる公的な窓口です。群馬県には県の4か所と、高崎市の児童相談所があります。施設や里親家庭に入ること・出ることも担当しています。',
        en: 'Public offices for children and families, including placements in and out of care. Gunma has four prefectural centers plus Takasaki City\'s own.'
      },
      cat: ['consult', 'procedures'],
      kind: 'service', basis: 'pref', pref: '10', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '18歳未満の子どもと、その家族など。住んでいる市町村で、担当の児童相談所が決まっています。' },
      how: { ja: '担当の児童相談所に電話します。夜や休日でも、こどもホットライン24（0120-783-884）か「189」に電話できます。' },
      where: { ja: '住んでいる市町村を担当する児童相談所（地図で確認）' },
      docs: [],
      ask: ['施設を出る時期について相談したいです', '担当の児童福祉司さんと話したいです', '家にいるのがつらいです。相談できますか？'],
      caution: { ja: '高崎市に住む人は、高崎市の児童相談所が担当です。西部児童相談所は令和8年4月1日に富岡市へ移りました。' },
      supporter: { ja: '中央児童相談所は北部支所を含む。メール: 中央・北部 chuuji@pref.gunma.lg.jp、西部 nishijisou@、東部 toujisou@（pref.gunma.lg.jp）、高崎市 kodomo-somu@city.takasaki.gunma.jp。' },
      effort: 'low',
      for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: ['10'] },
      deadline: null,
      contact: { phone: '189', phoneLabel: '夜・休日は 189（虐待対応ダイヤル）', line: null, chat: null, web: GM_JISOU, hours: null },
      locations: GM_JISOU_LOCS,
      source: src('群馬県（児童相談所一覧）', GM_JISOU),
      verifiedBy: V
    },

    {
      id: 'gunma-kodomo-hotline24',
      name: { ja: 'こどもホットライン24（群馬県）', en: 'Gunma Kids Hotline 24' },
      hook: { ja: '夜でも休みの日でも、だれかに話したい', en: 'I need to talk to someone, even at night or on holidays' },
      summary: {
        ja: '群馬県に住む18歳未満の子どもと保護者のための、24時間の電話相談です。虐待のことも、子育ての不安も相談できます。平日の昼はLINE相談もあります。',
        en: 'Gunma\'s 24-hour phone line for children under 18 and their parents, including abuse. LINE chat on weekday daytimes too.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '10', right: false,
      amount: { ja: '無料（フリーダイヤル）', en: 'Free (toll-free)' }, repay: null,
      who: { ja: '群馬県に住んでいる18歳未満の子どもと、その保護者。' },
      how: { ja: '0120-783-884（携帯電話からは 027-263-1100）に電話します。LINEは「ぐんまこども・子育て相談」（@050bnjkf）を友だち登録します。' },
      where: { ja: '電話・メール・LINE' },
      docs: [],
      ask: ['家の人とうまくいかなくて、家にいるのがつらいです', 'だれにも言えないことがあります'],
      caution: { ja: '相談中でつながらないときは、時間をおいてかけ直してね。LINEは平日9時〜17時だけ（12時〜13時はお休み）。急ぐときは電話へ。' },
      supporter: { ja: 'LINE「ぐんまこども・子育て相談」は群馬県中央児童相談所が運用。メール相談 kodomo-soudan@pref.gunma.lg.jp（返事に数日）。県ページの更新は2019年・2020年。' },
      effort: 'low',
      for: { stages: ALL_ST, paths: [], care: [], careOnly: false, age: { min: 0, max: 17 }, areas: ['10'] },
      deadline: null,
      contact: {
        phone: '0120-783-884', phoneLabel: 'こどもホットライン24（携帯は 027-263-1100）', line: null, chat: GM_LINE, web: GM_HOT,
        hours: { ja: '電話 24時間／LINE 平日 9時〜17時（12時〜13時をのぞく）', en: 'Phone 24h / LINE weekdays 9:00–17:00' }
      },
      locations: [],
      source: src('群馬県（こどもホットライン24）', GM_HOT),
      sources2: [{ org: '群馬県（ぐんまこども・子育て相談 LINEアカウント）', url: GM_LINE }],
      verifiedBy: V
    },

    {
      id: 'gunma-asunowa',
      name: { ja: 'あ\u2060す\u2060の\u2060わ（群馬県子ども・若者総合相談センター）', en: 'Asunowa (Gunma Youth Consultation Center)' },
      hook: { ja: 'どこに相談すればいいかわからない', en: 'I don\'t know who to ask' },
      summary: {
        ja: '2026年10月にできた、群馬県の子ども・若者のための総合相談窓口です。15〜39歳くらいの人の、どんな悩みも聞いて、合う支援先につないでくれます。電話・LINE・メール・面談で相談できます。',
        en: 'Gunma\'s new (October 2026) one-stop center for young people aged about 15–39. Any worry; they connect you to the right support. Phone, LINE, email or in person.'
      },
      cat: ['consult'],
      kind: 'service', basis: 'pref', pref: '10', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: 'おおむね15歳〜39歳の子ども・若者。家族や学校の先生からの相談も受けています。' },
      how: { ja: '電話（027-212-1200）、LINE（@751dywsg を友だち追加）、メール（asunowa@g-shakyo.or.jp）で連絡します。会って話すのは予約制（オンラインもOK）。' },
      where: { ja: '前橋市新前橋町 群馬県社会福祉総合センター 4階' },
      docs: [],
      ask: ['何から相談すればいいかわかりません。話を聞いてもらえますか？', '私に合う相談先を教えてください'],
      caution: { ja: '開いているのは火曜〜土曜です（祝日・年末年始は休み）。' },
      supporter: { ja: '子ども・若者育成支援推進法にもとづく総合相談センター。貧困・虐待・ひきこもり・ヤングケアラー等を受け止め、支援先へつなぐ。県 私学・青少年課 青少年育成係の所管。ウェブサイトは作成中（2026年9月時点）。' },
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: { min: 15, max: 39 }, areas: ['10'] },
      deadline: null,
      contact: {
        phone: '027-212-1200', phoneLabel: 'あ\u2060す\u2060の\u2060わ', line: null, chat: null, web: GM_ASUNOWA,
        hours: { ja: '火〜土（祝日・年末年始は休み）', en: 'Tue–Sat (closed holidays)' }
      },
      locations: [loc('あ\u2060す\u2060の\u2060わ（群馬県社会福祉総合センター 4階）', '10201', '群馬県前橋市新前橋町13-12', 36.380390, 139.049911, '027-212-1200', '火〜土', '面談は予約制')],
      source: src('群馬県（子ども・若者総合相談センター「あ\u2060す\u2060の\u2060わ」開設）', GM_ASUNOWA),
      verifiedBy: V
    },

    {
      id: 'gunma-jiritsu-sodan',
      name: { ja: 'くらしとしごとの相談窓口（群馬県）', en: 'Life & work support desks (Gunma)' },
      hook: { ja: 'お金・仕事・住まいのこと、まとめて相談したい', en: 'I want to talk about money, work and housing in one place' },
      summary: {
        ja: '働けない、住む所がないなど、生活に困ったときの無料の相談窓口です。市に住む人はその市の窓口、町村に住む人は町村の社会福祉協議会か県社会福祉協議会に相談できます。',
        en: 'Free help when you can\'t work or have nowhere to live. City residents go to their city\'s desk; town and village residents to the local or prefectural Council of Social Welfare.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: 'pref', pref: '10', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '働きたくても働けない、住む所がないなど、生活に困っている人。家族など、まわりの人からの相談もできます。' },
      how: { ja: '住んでいる市の窓口に電話するか、直接行きます（番号は県のページ）。町村の人は、町村の社会福祉協議会か、県社会福祉協議会 地域福祉課（027-212-0011）へ。' },
      where: { ja: '住んでいる市の窓口／町村の社会福祉協議会' },
      docs: [],
      ask: KONKYU_ASK,
      caution: { ja: KONKYU_CAUTION },
      supporter: { ja: KONKYU_SUP + ' 県ページ（2026年4月1日更新）の市の窓口: 前橋 027-898-6890／高崎 027-321-1302／桐生 0277-46-1111（内271）／伊勢崎 0270-27-6273／太田 0276-48-8177／沼田 0278-23-2111／館林 0276-47-5129（内640）／渋川 0279-22-2115／藤岡 0274-25-8456／富岡 0274-70-2232／安中 027-382-1111（内1191）／みどり 0277-76-0975。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['10'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: { phone: '027-212-0011', phoneLabel: '群馬県社会福祉協議会 地域福祉課（町村に住む人）', line: null, chat: null, web: GM_KONKYU, hours: null },
      locations: [],
      source: src('群馬県（生活に困窮している方を支援する相談窓口）', GM_KONKYU),
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'maebashi-jiritsu-sodan',
      name: { ja: 'ま\u2060え\u2060ば\u2060し生活自立相談センター', en: 'Maebashi Life Support Center' },
      hook: { ja: '仕事や住まいのことで、生活が苦しい', en: 'Work or housing problems are making life hard' },
      summary: {
        ja: '前橋市に住む人のための、仕事・住まい・家計の無料の相談窓口です。前橋市役所1階にあります。家賃の給付金（住居確保給付金）の相談もここで、先に電話で予約します。',
        en: 'Free help for Maebashi residents with work, housing and budgeting, on the 1st floor of City Hall. Call ahead to book for the Housing Security Benefit.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: 'local', pref: '10', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '前橋市に住んでいて、仕事やお金のことなどで生活に困っている人。家族など、まわりの人からの相談もできます。' },
      how: { ja: '電話（027-898-6890）か、市役所1階の社会福祉課の中の窓口へ。住居確保給付金の相談・申請は、先に電話で予約します。' },
      where: { ja: '前橋市役所 1階 社会福祉課内' },
      docs: [],
      ask: KONKYU_ASK,
      caution: { ja: KONKYU_CAUTION },
      supporter: { ja: KONKYU_SUP + ' 前橋市が前橋市社会福祉協議会に委託。電話 027-898-6890・6891・6892、メール soudan@mae-shakyo.or.jp。中学生向け学習支援も社会福祉課内で実施。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['10201'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '027-898-6890', phoneLabel: 'ま\u2060え\u2060ば\u2060し生活自立相談センター', line: null, chat: null, web: MAEBASHI,
        hours: { ja: '月〜金 9時〜17時（祝日・年末年始は休み）', en: 'Mon–Fri 9:00–17:00' }
      },
      locations: [loc('ま\u2060え\u2060ば\u2060し生活自立相談センター（前橋市役所 1階 社会福祉課内）', '10201', '群馬県前橋市大手町2-12-1', 36.389862, 139.063110, '027-898-6890', '月〜金 9:00–17:00', '')],
      source: src('前橋市（生活困窮者自立支援制度について）', MAEBASHI),
      sources2: [{ org: '前橋市社会福祉協議会（ま\u2060え\u2060ば\u2060し生活自立相談センターについて）', url: MAEBASHI_SHAKYO }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'takasaki-jiritsu-sodan',
      name: { ja: '高崎市 生活支援窓口（社会福祉課 生活支援担当）', en: 'Takasaki Life Support Desk' },
      hook: { ja: '仕事が続かない。家賃が払えない', en: 'I can\'t keep a job and can\'t pay rent' },
      summary: {
        ja: '高崎市に住む人のための、仕事・お金・住まいの無料の相談窓口です。相談員があなただけの支援プランを作り、仕事さがしや家賃の給付金（住居確保給付金）につないでくれます。',
        en: 'Free help for Takasaki residents with work, money and housing. A counselor makes a personal plan and connects you to job support and the Housing Security Benefit.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: 'local', pref: '10', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '高崎市に住んでいて、十分な収入がなく生活に困っている人（生活保護を受けていない人）。家族など、まわりの人からの相談もできます。' },
      how: { ja: '電話（027-321-1302）で予約してから、市役所1階2番窓口へ。家に来てもらう相談もあります。秘密は守られます。' },
      where: { ja: '高崎市役所 1階 2番窓口' },
      docs: [],
      ask: KONKYU_ASK,
      caution: { ja: '面接は原則予約制です。' + KONKYU_CAUTION },
      supporter: { ja: KONKYU_SUP + ' 高崎市は市の直営（社会福祉課 生活支援担当）。ハローワークのナビゲーターと連携した就労支援、就労訓練（認定事業所）、家計改善支援あり。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['10202'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '027-321-1302', phoneLabel: '高崎市 社会福祉課 生活支援担当', line: null, chat: null, web: TAKASAKI,
        hours: { ja: '月〜金 8時30分〜17時15分（祝日・年末年始は休み）', en: 'Mon–Fri 8:30–17:15' }
      },
      locations: [loc('高崎市役所 1階 2番窓口（社会福祉課 生活支援担当）', '10202', '群馬県高崎市高松町35-1', 36.321316, 139.003265, '027-321-1302', '月〜金 8:30–17:15', '原則予約制')],
      source: src('高崎市（生活困窮者自立支援）', TAKASAKI),
      sources2: [{ org: '高崎市（自立相談支援事業）', url: TAKASAKI2 }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'gunma-shiritsu-kyufukin',
      name: { ja: '奨学のための給付金（群馬県・私立高校）', en: 'Gunma Scholarship Benefit (private high schools)' },
      hook: { ja: '私立高校の、授業料以外のお金が心配', en: 'I\'m worried about private high school costs beyond tuition' },
      summary: {
        ja: '私立高校などに通う生徒がいる、収入の少ない家庭に、群馬県が返さなくていいお金を出してくれます。住民税が非課税の家庭なら、年15万2,000円（通信制以外）です。',
        en: 'Gunma gives a non-repayable benefit to lower-income families of private high school students: ¥152,000 a year for tax-exempt households (non-correspondence).'
      },
      cat: ['education', 'money'],
      kind: 'grant', basis: 'pref', pref: '10', right: false,
      amount: {
        ja: '年38,000円〜152,000円（住民税が非課税の家庭は152,000円、生活保護の家庭は52,600円。通信制以外）',
        en: '¥38,000–¥152,000 a year (¥152,000 tax-exempt; ¥52,600 on welfare; non-correspondence)'
      },
      repay: 'none',
      who: { ja: '7月1日の時点で、保護者が群馬県に住んでいて、私立高校などに通い就学支援金をもらえる生徒がいる家庭のうち、生活保護・住民税が非課税・年収490万円未満くらいの家庭。家計が急に苦しくなった家庭も。' },
      how: { ja: '県内の私立高校の人は、学校に書類を出します（締切は学校に確認）。県外の私立高校の人は、県の私学・青少年課に郵送します。' },
      where: { ja: '通っている学校（県外の学校の人は群馬県 私学・青少年課）' },
      docs: ['申請書など（県のページの提出書類一覧）', '住民税の所得割がわかるもの（マイナポータル・課税証明書など）'],
      ask: ['給付金の申請は、学校にいつまでに出せばいいですか？', '私の家は対象になりますか？', '家計が急に苦しくなったときも申請できますか？'],
      caution: { ja: '施設などにいて、措置費から見学旅行費や特別育成費が出ている人は対象になりません。特別支援学校の高等部の人も対象外です。1人につき年1回、通算3回（通信制などは4回）までです。' },
      supporter: { ja: '群馬県 生活こども部 私学・青少年課 私学振興係 027-226-2141。県外校の申請期限は令和8年11月30日必着（延長後）。公立高校は県教育委員会 管理課の別制度。' },
      effort: 'mid',
      for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['10'] },
      deadline: { ja: '県内の学校: 学校に確認／県外の学校: 令和8年11月30日必着', en: 'In-prefecture schools: ask your school; out-of-prefecture: Nov 30, 2026', leaveMonths: null, months: [7, 8, 9, 10, 11], always: false },
      contact: { phone: '027-226-2141', phoneLabel: '群馬県 私学・青少年課 私学振興係', line: null, chat: null, web: GM_KYUFU, hours: null },
      locations: [],
      source: src('群馬県（群馬県私立高等学校等奨学のための給付金制度）', GM_KYUFU),
      verifiedBy: V
    },

    {
      id: 'gunma-saposute',
      name: { ja: '若者サポートステーション（群馬県）', en: 'Youth Support Station (Gunma)' },
      hook: { ja: '働くことに自信がない。何から始めればいい？', en: 'I\'m not confident about working. Where do I start?' },
      summary: {
        ja: '働きはじめる前の準備から、仕事が決まったあとまで支えてくれる、国の委託の無料窓口です。群馬県には前橋と、太田のサテライトがあります。',
        en: 'Free, government-funded center that helps you get ready for work and keep a job. Gunma has one in Maebashi and a satellite in Ota.'
      },
      cat: ['work', 'consult'],
      kind: 'service', basis: 'national', pref: '10', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '15〜49歳で、今は働いていない・学校に行っていない人と、その家族。' },
      how: { ja: '近くのサポステに電話して、相談の予約をします。' },
      where: { ja: '前橋市・太田市のサポステ' },
      docs: [],
      ask: ['まず話を聞くだけでもいいですか？', '職場体験はできますか？'],
      caution: { ja: '仕事の紹介は少なめです。ハローワークと一緒に使うのがおすすめです。' },
      supporter: { ja: '厚生労働省委託。職場定着までの支援がある。' },
      effort: 'low',
      for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 15, max: 49 }, areas: ['10'] },
      deadline: { ja: 'いつでも', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: { phone: '027-212-3630', phoneLabel: 'ぐんま若者サポートステーション（前橋）', line: null, chat: null, web: SAPO, hours: null },
      locations: [
        loc('ぐんま若者サポートステーション（群馬県公社総合ビル8階）', '10201', '群馬県前橋市大渡町1-10-7', 36.396912, 139.048065, '027-212-3630', '', ''),
        loc('ぐんま若者サポートステーション 東毛常設サテライト（太田市役所南庁舎2階）', '10205', '群馬県太田市浜町2-7', 36.290039, 139.375412, '0276-57-8222', '', '')
      ],
      source: src('厚生労働省（全国のサポステ）', SAPO),
      sources2: [
        { org: '厚生労働省（ぐんま若者サポートステーション）', url: sapoUrl('sec0207-gunma') },
        { org: '厚生労働省（サポステとは）', url: SAPO_ABOUT }
      ],
      verifiedBy: V
    }
  );
})();
