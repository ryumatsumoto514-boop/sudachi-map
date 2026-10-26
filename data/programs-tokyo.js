/* 巣立ちマップ v3 — data/programs-tokyo.js (A4 / DATA-T)
 * 東京都・都内NPOの支援。すべて 2026-10-16 に公式ページ／運営団体のページを読んで確認しました。
 * v3（2026-10-17）: 中学生向けの記録を追加し、受験生チャレンジ支援貸付を再確認。中学生に出す／出さないを for.stages で整理。
 * わからない項目は null にしています（推測で埋めていません）。
 * 座標は 国土地理院 住所検索API で住所から求めました。
 */
(function () {
  var C = '2026-10-16';
  var C3 = '2026-10-17';
  var NOT_JR = ['hs12', 'hs3', 'left0', 'left1', 'nohs'];            // 中学生には出さない
  var ALL_ST = ['jhs12', 'jhs3', 'hs12', 'hs3', 'left0', 'left1', 'nohs']; // 中学生にも出す
  var V = 'Economix JP';
  var CARE = ['facility', 'foster', 'jhome'];

  var FLAT = 'https://www.fukushi.metro.tokyo.lg.jp/kodomo/sodan/kyotenjigyou';
  var WOMEN = 'https://www.fukushi.metro.tokyo.lg.jp/kiban/madoguchi/josei_soudan';
  var JISOU = 'https://www.fukushi.metro.tokyo.lg.jp/shisetsu/jicen/list';
  var TCSW_J = 'https://www.tcsw.tvac.or.jp/shikin/jiritsu/index.html';
  var YUZU = 'https://www.acyuzuriha.com/action/';
  var B4S_CARE = 'https://www.b4s.jp/care/';
  var SHIGOTO_PDF = 'https://www.hataraku.metro.tokyo.lg.jp/shiryo/sodanmadoguti_syukatsuhikkei.pdf';
  var RODO = 'https://www.hataraku.metro.tokyo.lg.jp/sodan/sodan/index.html';

  // 東京都・特別区の児童相談所（東京都福祉局「東京都児童相談所一覧」2026年8月1日更新 より）
  function js(name, area, addr, lat, lng, phone, note) {
    return { name: name, area: area, addr: addr, lat: lat, lng: lng, phone: phone, hours: '平日 9:00–17:00', note: note };
  }
  var JISOU_LOCS = [
    js('東京都 児童相談センター', '13104', '東京都新宿区北新宿4-6-1 東京都子供家庭総合センター内', 35.707607, 139.694107, '03-5937-2317',
      '担当: 新宿区・中央区・台東区・千代田区・八丈町・青ヶ島村・三宅村・御蔵島村・小笠原村。渋谷区・目黒区・大島町・利島村・新島村・神津島村は 03-5937-2314'),
    js('東京都 練馬児童相談所', '13120', '東京都練馬区豊玉北5-28-3', 35.734859, 139.653244, '03-6915-8253', '担当: 練馬区'),
    js('東京都 北児童相談所', '13117', '東京都北区王子6-1-12', 35.761162, 139.738800, '03-3913-5421', '担当: 北区'),
    js('東京都 大田児童相談所', '13111', '東京都大田区大森西2-3-22 大田区こども未来総合センター内', 35.578339, 139.729736, '03-5763-5364', '担当: 大田区'),
    js('東京都 立川児童相談所', '13202', '東京都立川市柴崎町2-21-19 立川福祉保健庁舎3階', 35.694309, 139.408432, '042-523-1321',
      '担当: 立川市・青梅市・昭島市・国立市・福生市・あきる野市・羽村市・瑞穂町・日の出町・檜原村・奥多摩町'),
    js('東京都 杉並児童相談所（11月1日から『多摩中部児童相談所』）', '13115', '東京都杉並区南荻窪4-23-6', 35.701256, 139.614914, '03-5370-6001',
      '担当: 杉並区・武蔵野市・三鷹市。11月1日から「多摩中部児童相談所」に名前が変わります'),
    js('東京都 江東児童相談所', '13108', '東京都江東区枝川3-6-9', 35.658981, 139.810654, '03-3640-5432', '担当: 墨田区・江東区'),
    js('東京都 小平児童相談所', '13211', '東京都小平市花小金井1-31-24 多摩小平保健所庁舎3階', 35.730331, 139.516418, '042-467-3711',
      '担当: 小平市・小金井市・東村山市・国分寺市・西東京市・東大和市・清瀬市・東久留米市・武蔵村山市'),
    js('東京都 八王子児童相談所', '13201', '東京都八王子市台町3-17-30', 35.654816, 139.321991, '042-624-1141', '担当: 八王子市・日野市'),
    js('東京都 町田児童相談所', '13209', '東京都町田市山崎1-2-17', 35.568497, 139.429199, '042-851-9357', '担当: 町田市'),
    js('東京都 足立児童相談所', '13121', '東京都足立区西新井本町3-8-4', 35.775627, 139.776627, '03-3854-1181', '担当: 足立区'),
    js('東京都 多摩児童相談所', '13224', '東京都多摩市諏訪2-6', 35.627968, 139.451675, '042-372-5600', '担当: 多摩市・府中市・調布市・稲城市・狛江市'),
    js('世田谷区 児童相談所', '13112', '東京都世田谷区松原6-41-7', 35.656521, 139.649506, '03-6379-0697', '担当: 世田谷区'),
    js('江戸川区 児童相談所（はあとポート）', '13123', '東京都江戸川区中央3-4-18', 35.710094, 139.871796, '03-5678-1810', '担当: 江戸川区'),
    js('荒川区 子ども家庭総合センター（児童相談所）', '13118', '東京都荒川区荒川1-50-17', 35.734066, 139.784592, '03-3802-3765', '担当: 荒川区'),
    js('港区 児童相談所', '13103', '東京都港区南青山5-7-11', 35.662689, 139.712814, '03-5962-6500', '担当: 港区'),
    js('中野区 児童相談所', '13114', '東京都中野区中央1-41-2', 35.698292, 139.683182, '03-5937-3289', '担当: 中野区'),
    js('板橋区 子ども家庭総合支援センター（児童相談所）', '13119', '東京都板橋区本町24-17', 35.759575, 139.708801, '03-5944-2373', '担当: 板橋区'),
    js('豊島区 児童相談所', '13116', '東京都豊島区長崎3-6-24', 35.728687, 139.688461, '03-6758-7910', '担当: 豊島区'),
    js('葛飾区 児童相談所', '13122', '東京都葛飾区立石2-30-1', 35.740181, 139.841522, '03-5698-0303', '担当: 葛飾区'),
    js('品川区 児童相談所', '13109', '東京都品川区北品川3-10-9', 35.616840, 139.737595, '03-6712-8261', '担当: 品川区'),
    js('文京区 児童相談所', '13105', '東京都文京区小石川3-14-7', 35.711887, 139.746582, '03-3811-5241', '担当: 文京区')
  ];

  SM.data.programs.push(

    /* ───────── ふ\u2060ら\u2060っ\u2060とホーム（東京都 社会的養護自立支援拠点事業）───────── */
    {
      id: 'tokyo-flat-hinatabokko',
      name: { ja: '日向ぼっこ（ふ\u2060ら\u2060っ\u2060とホーム）', en: 'Hinatabokko (Flat Home drop-in)' },
      hook: { ja: 'ほっとできる場所と、話せる人がほしい', en: 'I want a place to relax and someone to talk to' },
      summary: {
        ja: '施設や里親家庭で育った人などが集まれる居場所です。くらしや仕事のことも相談できます。東京都の「ふ\u2060ら\u2060っ\u2060とホーム」の1つです。',
        en: 'A drop-in space for people with care experience, where you can also talk about daily life and work. One of Tokyo\'s "Flat Home" bases.'
      },
      cat: ['consult', 'work'],
      kind: 'place', basis: 'npo', right: false,
      amount: null, repay: null,
      who: { ja: '施設や里親家庭などで育った人。虐待をうけた経験があるのに、これまで支援につながらなかった人も。' },
      how: { ja: '初めての人は、先に面談があります。まず電話かメールで連絡しよう。個別の相談はいつでも受けています。' },
      where: { ja: '新宿区下落合（高田馬場駅から歩いて3分）' },
      docs: [],
      ask: ['初めて行きたいです。面談はいつできますか？', 'どんなことを相談できますか？', '行くときに持っていくものはありますか？'],
      caution: { ja: '水曜・土曜はお休みです。初めての人は前もって面談が必要です。' },
      supporter: { ja: '東京都 社会的養護自立支援拠点事業（ふ\u2060ら\u2060っ\u2060とホーム事業）令和8年度補助事業者。個別相談は随時受付。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: false, age: null, areas: ['13'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-5834-7433', phoneLabel: '日向ぼっこ', line: null, chat: null,
        web: 'https://hinatabokko2006.com/access/',
        hours: { ja: '月・木・金・日 12時〜18時／火 14時〜20時（水・土は休み）', en: 'Mon/Thu/Fri/Sun 12–18, Tue 14–20 (closed Wed/Sat)' }
      },
      locations: [{
        name: 'NPO法人 日向ぼっこ', area: '13104',
        addr: '東京都新宿区下落合1-3-16 ジョリーメゾンヌベル下落合202号室',
        lat: 35.715973, lng: 139.703247, phone: '03-5834-7433',
        hours: '月・木・金・日 12:00–18:00／火 14:00–20:00（水・土 休み）', note: '高田馬場駅から歩いて3分。初めての人は事前面談あり'
      }],
      source: { org: 'NPO法人 日向ぼっこ', url: 'https://hinatabokko2006.com/access/', checked: C },
      sources2: [{ org: '東京都福祉局（ふ\u2060ら\u2060っ\u2060とホーム事業）', url: FLAT }],
      verifiedBy: V
    },

    {
      id: 'tokyo-flat-b4s-akiba',
      name: { ja: 'B4S PORT あ\u2060き\u2060ば（ふ\u2060ら\u2060っ\u2060とホーム）', en: 'B4S PORT Akiba (Flat Home drop-in)' },
      hook: { ja: '安心して過ごせる場所と、人に聞かれたくない相談先がほしい', en: 'I want a safe place to hang out and a private place to talk' },
      summary: {
        ja: 'ブリッジフォースマイルが東京都から受けて開いている居場所です。無料で使えて、予約すると1対1の相談（1回60分）もできます。',
        en: 'A free drop-in space run by Bridge for Smile for Tokyo. You can also book a private 60-minute consultation.'
      },
      cat: ['consult'],
      kind: 'place', basis: 'npo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '施設や里親家庭などでくらした経験がある人。児童相談所に保護されたことがある人。親からひどい扱いを受けている（受けた）人。' },
      how: { ja: '前もって電話かLINEで予約してから行きます。個別相談は、居場所が開いていない時間に日時を決めます。' },
      where: { ja: '台東区柳橋（アーク柳橋401）' },
      docs: [],
      ask: ['初めて行きたいです。いつ予約できますか？', '個別に相談したいです。どの日時なら空いていますか？', 'ごはんは出ますか？'],
      caution: { ja: '利用には予約が必要です。予約の電話は平日10時〜18時です。' },
      supporter: { ja: '東京都 ふ\u2060ら\u2060っ\u2060とホーム事業の補助事業者（認定NPO法人ブリッジフォースマイル）。メール andyou@b4s.jp。B4Sは令和8年11月に都内でもう1か所開設予定（都のページでは事業所名未定）。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: false, age: null, areas: ['13'] },
      deadline: { ja: 'いつでも（予約制）', en: 'Anytime (booking needed)', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-6842-6766', phoneLabel: 'ブリッジフォースマイル', line: 'https://lin.ee/NU4F9FG', chat: null,
        web: 'https://www.b4s.jp/post-7599/',
        hours: { ja: '居場所: 火・土 15時〜20時／木 15時〜18時。電話予約: 平日10時〜18時', en: 'Open Tue/Sat 15–20, Thu 15–18. Phone booking weekdays 10–18' }
      },
      locations: [{
        name: 'B4S PORT あ\u2060き\u2060ば', area: '13106', addr: '東京都台東区柳橋1-6-2 アーク柳橋401',
        lat: 35.696064, lng: 139.786850, phone: '03-6842-6766',
        hours: '火・土 15:00–20:00／木 15:00–18:00', note: '予約制（電話かLINE）'
      }],
      source: { org: '認定NPO法人ブリッジフォースマイル', url: 'https://www.b4s.jp/post-7599/', checked: C },
      sources2: [{ org: '東京都福祉局（ふ\u2060ら\u2060っ\u2060とホーム事業）', url: FLAT }],
      verifiedBy: V
    },

    {
      id: 'tokyo-flat-satellite-tachikawa',
      name: { ja: 'サテライト立川（ふ\u2060ら\u2060っ\u2060とホーム）', en: 'Satellite Tachikawa (Flat Home drop-in)' },
      hook: { ja: 'お金や仕事のこと、だれかに相談したい', en: 'I want to talk to someone about money or work' },
      summary: {
        ja: '施設や里親家庭でくらした人のための拠点です。お金・仕事・人間関係・健康・法律のことを相談でき、困ったときは一時的に泊まれることもあります。無料です。',
        en: 'A free base for care leavers: talk about money, work, relationships, health or legal issues, and in a crisis you may be able to stay for a short time.'
      },
      cat: ['consult', 'work', 'housing'],
      kind: 'place', basis: 'npo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '児童養護施設や里親家庭などでくらした経験がある人。' },
      how: { ja: '予約サイトから希望の日時を申し込みます。電話かメールで確認の連絡がきたら、その時間に行きます。' },
      where: { ja: '立川市羽衣町（JR南武線 西国立駅から歩いて3分）' },
      docs: [],
      ask: ['相談の予約をしたいです。空いている日はありますか？', '就職や進学のことも相談できますか？', '住むところに困ったとき、一時的に泊まれますか？'],
      caution: { ja: '木曜・日曜はお休みです。Googleマップでは別の会社名（ハードフェースウエルドカンパニー）で出ることがあります。' },
      supporter: { ja: '東京都 ふ\u2060ら\u2060っ\u2060とホーム事業の補助事業者（一般社団法人リーチ奨学育英会）。予約は https://reserva.be/reach 。FAX 042-595-7761。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: 'いつでも（予約制）', en: 'Anytime (booking needed)', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '042-595-7760', phoneLabel: 'サテライト立川', line: null, chat: 'https://reserva.be/reach',
        web: 'https://shiseiikuei.or.jp/satellite-tachikawa/',
        hours: { ja: '10時〜21時（木・日は休み）', en: '10:00–21:00 (closed Thu/Sun)' }
      },
      locations: [{
        name: 'サテライト立川', area: '13202', addr: '東京都立川市羽衣町3-2-10',
        lat: 35.692215, lng: 139.425507, phone: '042-595-7760',
        hours: '10:00–21:00（木・日 休み）', note: 'JR南武線 西国立駅から歩いて3分。予約制'
      }],
      source: { org: '一般社団法人リーチ奨学育英会', url: 'https://shiseiikuei.or.jp/satellite-tachikawa/', checked: C },
      sources2: [{ org: '東京都福祉局（ふ\u2060ら\u2060っ\u2060とホーム事業）', url: FLAT }],
      verifiedBy: V
    },

    {
      id: 'tokyo-flat-yuzuriha',
      name: { ja: 'アフターケア相談所 ゆ\u2060ず\u2060り\u2060は（ふ\u2060ら\u2060っ\u2060とホーム）', en: 'Yuzuriha Aftercare Center (Flat Home)' },
      hook: { ja: '役所や病院に、いっしょに行ってくれる人がほしい', en: 'I want someone to come with me to the city office or hospital' },
      summary: {
        ja: '住まい・くらし・仕事・進学の困りごとを、1対1で一緒に考えてくれます。生活保護の申請や、病院・不動産屋への付きそいも。相談は無料で、年齢制限もありません。',
        en: 'Free one-to-one help with housing, daily life, work and school, including going with you to apply for welfare or to the hospital or a rental agency. No age limit.'
      },
      cat: ['consult', 'procedures', 'housing'],
      kind: 'service', basis: 'npo', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '施設などを出て、くらし・仕事・進学が不安な人。親や家族から離れたい人。年齢制限はありません。' },
      how: { ja: '電話かホームページのお問い合わせフォームで連絡します。毎週水曜13時〜17時の「ゆ\u2060ず\u2060り\u2060はサロン」は予約なしで行けます。' },
      where: { ja: '電話・フォームで相談（住所はホームページにのっていません）' },
      docs: [],
      ask: ['生活保護の申請に、いっしょに行ってもらえますか？', '部屋を探したいです。不動産屋に付きそってもらえますか？', 'サロンには予約なしで行っていいですか？'],
      caution: { ja: '住所はホームページにのっていません。行き方は電話で聞いてください。フォームの返事には数日かかります。' },
      supporter: { ja: '社会福祉法人 子供の家。東京都 ふ\u2060ら\u2060っ\u2060とホーム事業の補助事業者（ゆ\u2060ず\u2060り\u2060は／ながれる）。都のページでは、子供の家が令和8年10月にもう1か所開設予定（名称未定）。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: false, age: null, areas: ['13'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '042-315-6738', phoneLabel: 'ゆ\u2060ず\u2060り\u2060は・ながれる', line: null, chat: 'https://www.acyuzuriha.com/contact/',
        web: YUZU, hours: null
      },
      locations: [],
      source: { org: '社会福祉法人 子供の家 ゆ\u2060ず\u2060り\u2060は', url: YUZU, checked: C },
      sources2: [{ org: '東京都福祉局（ふ\u2060ら\u2060っ\u2060とホーム事業）', url: FLAT }],
      verifiedBy: V
    },

    {
      id: 'yuzuriha-kousotsunintei',
      name: { ja: 'ゆ\u2060ず\u2060り\u2060は 高卒認定 学習会', en: 'Yuzuriha study group for the high-school equivalency exam' },
      hook: { ja: '高校を出ていないけど、もう一度勉強したい', en: 'I didn\'t finish high school but want to study again' },
      summary: {
        ja: '高卒認定（高校卒業と同じ資格）をとるための無料の学習会です。交通費は全額出て、軽食もあります。講師が学びたいことに合わせて教えてくれます。',
        en: 'A free weekly study group for the high-school equivalency exam. Travel costs are fully paid and snacks are provided.'
      },
      cat: ['education'],
      kind: 'service', basis: 'npo', right: false,
      amount: { ja: '無料・交通費は全額支給', en: 'Free; travel costs fully covered' }, repay: null,
      who: { ja: '高卒認定をとりたい人。ほかに学びたいことがある人も相談できます。' },
      how: { ja: '参加したいときは、前もって ゆ\u2060ず\u2060り\u2060は に連絡します。毎週木曜18時〜20時です。' },
      where: { ja: 'アフターケア相談所 ゆ\u2060ず\u2060り\u2060は（場所は電話で確認）' },
      docs: [],
      ask: ['高卒認定の学習会に参加したいです。次はいつですか？', '勉強がかなり苦手でも大丈夫ですか？', '交通費はどうやってもらえますか？'],
      caution: { ja: '参加したいときは、前もって連絡しよう。' },
      supporter: null,
      effort: 'low',
      for: { stages: ['nohs', 'left0', 'left1'], paths: ['study', 'unsure'], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: { ja: '毎週木曜 18時〜20時（いつでも始められます）', en: 'Every Thursday 18:00–20:00', leaveMonths: null, months: null, always: true },
      contact: { phone: '042-315-6738', phoneLabel: 'ゆ\u2060ず\u2060り\u2060は', line: null, chat: 'https://www.acyuzuriha.com/contact/', web: YUZU, hours: { ja: '学習会: 毎週木曜 18時〜20時', en: 'Thu 18:00–20:00' } },
      locations: [],
      source: { org: '社会福祉法人 子供の家 ゆ\u2060ず\u2060り\u2060は', url: YUZU, checked: C },
      verifiedBy: V
    },

    {
      id: 'yuzuriha-koubou',
      name: { ja: 'ゆ\u2060ず\u2060り\u2060は工房（ジャムづくり）', en: 'Yuzuriha Workshop (jam making)' },
      hook: { ja: '毎日働くのはまだしんどい。少しずつ働いてみたい', en: 'Working every day is too hard right now; I want to start small' },
      summary: {
        ja: 'スタッフといっしょにジャムをつくる仕事の場です。工賃（お給料）と交通費の全額を、その日にもらえます。',
        en: 'Make jam together with staff. You get paid for the work, plus full travel costs, on the same day.'
      },
      cat: ['work'],
      kind: 'service', basis: 'npo', right: false,
      amount: { ja: '工賃と交通費（全額）を当日支給', en: 'Same-day pay plus full travel costs' }, repay: null,
      who: { ja: '毎日働くことがむずかしい人。人とやりとりすることに緊張や不安がある人。' },
      how: { ja: '参加したいときは、前もって ゆ\u2060ず\u2060り\u2060は に連絡します。毎週木曜13時〜16時です。' },
      where: { ja: 'アフターケア相談所 ゆ\u2060ず\u2060り\u2060は（場所は電話で確認）' },
      docs: [],
      ask: ['工房に参加してみたいです。見学できますか？', '毎週来られなくても大丈夫ですか？', '工賃はいくらくらいですか？'],
      caution: null,
      supporter: null,
      effort: 'low',
      for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: { ja: '毎週木曜 13時〜16時', en: 'Every Thursday 13:00–16:00', leaveMonths: null, months: null, always: true },
      contact: { phone: '042-315-6738', phoneLabel: 'ゆ\u2060ず\u2060り\u2060は', line: null, chat: 'https://www.acyuzuriha.com/contact/', web: YUZU, hours: { ja: '工房: 毎週木曜 13時〜16時', en: 'Thu 13:00–16:00' } },
      locations: [],
      source: { org: '社会福祉法人 子供の家 ゆ\u2060ず\u2060り\u2060は', url: YUZU, checked: C },
      verifiedBy: V
    },

    /* ───────── ブリッジフォースマイル（自主事業）───────── */
    {
      id: 'b4s-port-shimokita',
      name: { ja: 'B4S PORT し\u2060も\u2060き\u2060た', en: 'B4S PORT Shimokita' },
      hook: { ja: 'だれかと一緒にごはんを食べたい', en: 'I want to share a meal with someone' },
      summary: {
        ja: 'おしゃべりしたり、一緒にごはんを作って食べたり、ゆっくりしたりできる居場所です。金・日は夕食があります。個別相談（1回30分）もできます。',
        en: 'A drop-in space in Shimokitazawa to chat, cook and eat together, or just rest. Dinner on Fri/Sun; 30-minute private chats available.'
      },
      cat: ['consult'],
      kind: 'place', basis: 'npo', right: false,
      amount: null, repay: null,
      who: { ja: '親からひどい扱いを受けている人、または受けた経験がある人。' },
      how: { ja: 'LINE・メール・電話で予約してから行きます。ごはんを食べたいときは、開く時間までに連絡します。LINEはID「@019xkunj」で探せます。' },
      where: { ja: '世田谷区北沢（下北沢）' },
      docs: [],
      ask: ['初めて行きたいです。予約できますか？', '夕ごはんを食べたいです。何時までに連絡すればいいですか？'],
      caution: { ja: '世田谷区からの委託は終わり、今はブリッジフォースマイルが自分たちで続けています。開いていない時間は 03-6842-6766 へ。' },
      supporter: null,
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: false, age: null, areas: ['13'] },
      deadline: { ja: 'いつでも（予約制）', en: 'Anytime (booking needed)', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '080-5652-1963', phoneLabel: 'PORT し\u2060も\u2060き\u2060た（開いている時間だけ）', line: null, chat: null,
        web: 'https://www.b4s.jp/post-6426/',
        hours: { ja: '水 14時〜18時／金・日 16時〜20時（夕食あり）', en: 'Wed 14–18, Fri/Sun 16–20 (dinner)' }
      },
      locations: [{
        name: 'B4S PORT し\u2060も\u2060き\u2060た', area: '13112', addr: '東京都世田谷区北沢2-10-15 藤和下北沢ハイタウンA614',
        lat: 35.661770, lng: 139.668610, phone: '080-5652-1963',
        hours: '水 14:00–18:00／金・日 16:00–20:00', note: '予約制。電話は開いている時間だけ'
      }],
      source: { org: '認定NPO法人ブリッジフォースマイル', url: 'https://www.b4s.jp/post-6426/', checked: C },
      sources2: [{ org: '認定NPO法人ブリッジフォースマイル（お知らせ）', url: 'https://www.b4s.jp/post-12498/' }],
      verifiedBy: V
    },

    {
      id: 'b4s-line-soudan',
      name: { ja: 'ブリッジフォースマイル LINE・電話相談', en: 'Bridge for Smile LINE / phone help' },
      hook: { ja: '親を頼れない。何から相談すればいいかわからない', en: 'I can\'t rely on my parents and don\'t know where to start' },
      summary: {
        ja: '親を頼れない10〜30代のための相談です。仕事、役所への付きそい、住む場所さがし、急に泊まる場所が必要なときなど、一緒に方法を考えてくれます。',
        en: 'Help for people in their teens to 30s who can\'t rely on their parents: work, going with you to the city office, finding housing, emergency places to stay, and more.'
      },
      cat: ['consult', 'housing', 'work'],
      kind: 'hotline', basis: 'npo', right: false,
      amount: null, repay: null,
      who: { ja: '親を頼れない10〜30代の人。' },
      how: { ja: 'LINEか電話で連絡します。スタッフが順番に返事をして、くわしく話を聞きます。近くの支援先を紹介してくれることもあります。' },
      where: { ja: 'LINE・電話' },
      docs: [],
      ask: ['今日泊まるところがありません。どうすればいいですか？', '役所の手続きに、いっしょに行ってもらえますか？', '住む部屋を探したいです。'],
      caution: { ja: '1回30分までです。受付は月・火・水・金・土の14時〜18時です。' },
      supporter: null,
      effort: 'low',
      for: { stages: ALL_ST, paths: [], care: [], careOnly: false, age: { min: 10, max: 39 }, areas: [] },
      deadline: null,
      contact: {
        phone: '045-755-7330', phoneLabel: 'B4S 相談', line: 'https://lin.ee/qjS8C9n', chat: null, web: B4S_CARE,
        hours: { ja: '月・火・水・金・土 14時〜18時（年末年始をのぞく）', en: 'Mon/Tue/Wed/Fri/Sat 14:00–18:00' }
      },
      locations: [],
      source: { org: '認定NPO法人ブリッジフォースマイル', url: B4S_CARE, checked: C },
      verifiedBy: V
    },

    /* ───────── 東京都社会福祉協議会の貸付 ───────── */
    {
      id: 'tokyo-jiritsu-start',
      name: { ja: '自立生活スタート支援事業（東京都）', en: 'Tokyo Independent Living Start-up Loan' },
      hook: { ja: '引っ越しや、仕事・学校の準備のお金が足りない', en: 'I don\'t have enough money to move out or get ready for work or school' },
      summary: {
        ja: '施設などを出るときの引っ越し代や、就職・進学の準備のお金を、利息なしで借りられる東京都の制度です。保証人はいりません。2年働き続けるか、学校を卒業すれば返さなくてよくなります。',
        en: 'A Tokyo interest-free loan for moving costs and getting ready for work or school when you leave care. No guarantor needed. Fully forgiven after 2 years of work, or when you graduate.'
      },
      cat: ['money', 'housing', 'education'],
      kind: 'loan_forgivable', basis: 'tokyo', right: false,
      amount: {
        ja: '引っ越し 32万円・就職の準備 10万円・資格や技能 30万円・進学の準備 50万円まで（あわせて80万円まで）',
        en: 'Moving ¥320k, job prep ¥100k, skills ¥300k, school entry ¥500k (up to ¥800k in total)'
      },
      repay: 'conditional',
      who: {
        ja: '東京都内（都が措置した都外の施設も）の児童養護施設・児童自立支援施設・自立援助ホーム・養育家庭・ファミリーホームの人で、出る日が決まっている人か、出てから5年以内の人。都内に住民票がある人。'
      },
      how: {
        ja: 'まず施設や里親の担当の人に相談します。担当の人が東京都社会福祉協議会（東社協）に連絡し、本人・担当の人・東社協の3人で面接します。そのあと申し込み、2週間ほどで審査が終わります。'
      },
      where: { ja: '施設・里親の担当の人 → 東京都社会福祉協議会' },
      docs: ['借入申込書', '施設長・里親の意見書（施設や里親が用意）', '見積書など、必要な金額がわかる書類'],
      ask: ['自立生活スタート支援事業を使いたいです。私は対象になりますか？', '返さなくてよくなる条件を教えてください', 'お金が振り込まれるのはいつごろですか？'],
      caution: {
        ja: '利息はなし・保証人もいりません。でも借りたお金なので、条件（2年間・週20時間以上働く／借りて進学した学校を卒業）を満たすまでは、毎年書類を出します。出さないと返すことになります。生活保護を受けている人は使えません。'
      },
      supporter: {
        ja: '東京都の補助で東社協が実施。施設等の長・里親等の意見書が必須、連帯保証人は不要。就学支度資金はサービス推進費の大学進学等支度金加算などが優先。資格取得は国の自立支援資金（資格取得支援費）が優先で、不足分は技能習得資金から5万円まで。就労1年以上で一部免除の場合あり。'
      },
      effort: 'high',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: {
        ja: '出る日が決まったら早めに。相談からお金が届くまで1か月以上かかります。出てから5年以内まで申し込めます。',
        en: 'Start as soon as your leaving date is set; it takes over a month. Available up to 5 years after leaving.',
        leaveMonths: -3, months: null, always: false
      },
      contact: {
        phone: '03-3268-7238', phoneLabel: '東京都社会福祉協議会 福祉資金部', line: null, chat: null, web: TCSW_J,
        hours: null
      },
      locations: [],
      source: { org: '東京都社会福祉協議会', url: TCSW_J, checked: C },
      sources2: [{ org: '東京都社会福祉協議会（ご案内PDF）', url: 'https://www.tcsw.tvac.or.jp/shikin/jiritsu/documents/202411_jiritsu-start.pdf' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-jiritsu-shikin',
      name: { ja: '自立支援資金貸付（東京都の窓口）', en: 'Independence Support Loan (Tokyo window)' },
      hook: { ja: '家賃や生活費の支えがほしい', en: 'I need help with rent and living costs' },
      summary: {
        ja: '進学した人は生活費（月5万円）と家賃を、働く人は家賃を、利息なしで借りられます。決まった年数働けば、返さなくてよくなります。東京都では東京都社会福祉協議会が窓口です。',
        en: 'Interest-free loans for living costs (¥50k/month for students) and rent. Forgiven after working for a set number of years. In Tokyo, run by the Tokyo Council of Social Welfare.'
      },
      cat: ['money', 'housing'],
      kind: 'loan_forgivable', basis: 'tokyo', right: false,
      amount: {
        ja: '生活費 月5万円（進学した人）・家賃 月53,700円まで（23区など。地域でちがう）・資格をとる費用 25万円まで',
        en: 'Living ¥50k/month (students); rent up to ¥53,700/month (23 wards etc.); licences up to ¥250k'
      },
      repay: 'conditional',
      who: {
        ja: '都内の児童養護施設・自立援助ホームなどを出た人、または里親・ファミリーホームの委託が終わった人で、出てから5年以内の人。親などからお金の支えがない人。資格の費用は、施設や里親家庭にいる間も使えます。'
      },
      how: { ja: '施設や里親の担当の人に相談します。担当の人から東社協に連絡し、3人で面接してから申し込みます。家賃・生活費は毎月振り込まれます。' },
      where: { ja: '施設・里親の担当の人 → 東京都社会福祉協議会' },
      docs: ['借入申込書', '住民票（マイナンバーなし・3か月以内）', '収支計画予定表', '施設長・里親の意見書', '在学証明書（進学した人）', '家賃がわかる賃貸借契約書のコピー', '在職証明書など（働いている人）'],
      ask: ['自立支援資金貸付を使いたいです。私は対象になりますか？', '返さなくてよくなる条件を教えてください', '保証人がいないときはどうすればいいですか？'],
      caution: {
        ja: '返さなくてよくなるには、進学した人は卒業後1年以内に就職して5年間、働く人は5年間（資格の費用は2年間）、週20時間以上働き続けることが必要です。保証人は原則必要ですが、いないときは相談できます。働く人の家賃は2年までです。'
      },
      supporter: {
        ja: '国と東京都の補助で東社協が実施（2025年10月版案内）。家賃支援費の上限は居住地の生活保護住宅扶助（単身）: 23区・羽村市とあきる野市をのぞく24市 53,700円、羽村市・あきる野市・瑞穂町 45,000円、日の出町・檜原村・奥多摩町・島しょ 40,900円。進学者の生活支援費に定期通院の医療費を追加できる（令和5年7月〜）。都外施設は施設所在地の道府県で申請。'
      },
      effort: 'high',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: {
        ja: '進学・就職で出るときに。出てから5年以内まで。相談から送金まで1か月以上かかります。',
        en: 'When you leave for school or work; up to 5 years after leaving. Takes over a month.',
        leaveMonths: -3, months: null, always: false
      },
      contact: { phone: '03-3268-7238', phoneLabel: '東京都社会福祉協議会 福祉資金部', line: null, chat: null, web: TCSW_J, hours: null },
      locations: [],
      source: { org: '東京都社会福祉協議会', url: TCSW_J, checked: C },
      sources2: [{ org: '東京都社会福祉協議会（貸付のご案内PDF 2025年10月版）', url: 'https://www.tcsw.tvac.or.jp/shikin/jiritsu/documents/2025jidou.pdf' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-juken-challenge',
      name: { ja: '受験生チャレンジ支援貸付', en: 'Exam Challenge Support Loan' },
      hook: { ja: '塾代や受験料が払えない', en: 'I can\'t pay for cram school or exam fees' },
      summary: {
        ja: '塾代と受験料を、利息なしで借りられる東京都の制度です。高校や大学などに入学すれば、返さなくてよくなります。',
        en: 'A Tokyo interest-free loan for cram school and exam fees. You don\'t have to pay it back if you get into high school, university or a vocational school.'
      },
      cat: ['education', 'money'],
      kind: 'loan_forgivable', basis: 'tokyo', right: false,
      amount: {
        ja: '塾代 30万円まで・大学などの受験料 12万円まで（高校の受験料は 2万7400円まで）',
        en: 'Cram school up to ¥300k; university exam fees up to ¥120k (high-school exams up to ¥27,400)'
      },
      repay: 'conditional',
      who: {
        ja: '中学3年生・高校3年生、または高校中退・高卒認定に合格・定時制4年・浪人などで進学をめざす20歳未満の人がいる世帯。都内に住民票があり、収入などの条件にあう世帯。'
      },
      how: {
        ja: 'まず住んでいる区市町村の窓口で相談します。書類を出すと、東京都社会福祉協議会が審査します。借用書を出してから2〜3週間でお金が振り込まれます。'
      },
      where: { ja: '住んでいる区市町村の窓口' },
      docs: ['住民票（世帯全員・3か月以内）', '課税証明書', '在学証明書（生徒証でも可）', '本人確認書類', '塾の受講料や受験料がわかるもの', '印鑑登録証明書（借用書を出すとき）', 'あとで領収書'],
      ask: ['受験生チャレンジ支援貸付を使いたいです。私の場合、だれが申し込みますか？', '今年の締切はいつですか？', '入学したら、返さなくていい手続きはどうしますか？'],
      caution: {
        ja: '申し込むのは「世帯の生計の中心の人」です。施設や里親家庭にいる人は、使えるかどうか担当の人と窓口に確認しよう。領収書を出さないと、全部返すことになります。'
      },
      supporter: {
        ja: '東京都の補助で東社協が実施、受付は区市町村。返済免除率99%（都のページ、令和8年4月1日更新で再確認）。1人1年度のみだが、中3で借りて高3でもう一度申し込むことは可。目的が同じ他の公的制度を使っている場合は差額のみ。生活保護世帯は対象外。収入基準のめやす（一般世帯4人で総収入504.9万円以下など）は都のページ参照。'
      },
      effort: 'high',
      for: { stages: ['jhs3', 'hs3', 'nohs'], paths: ['study', 'hs'], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['13'] },
      deadline: {
        ja: '毎年4月1日から受付。締切は区市町村によってちがうので、早めに窓口へ。領収書は令和9年3月末までに出します。',
        en: 'Applications open April 1 each year; deadlines vary by city.',
        leaveMonths: null, months: null, always: false
      },
      contact: {
        phone: '03-5320-4072', phoneLabel: '東京都 福祉局 地域福祉課（制度の問い合わせ）', line: null, chat: null,
        web: 'https://www.fukushi.metro.tokyo.lg.jp/seikatsu/teisyotokusyataisaku/jukenseichallenge',
        hours: null
      },
      locations: [],
      source: { org: '東京都福祉局', url: 'https://www.fukushi.metro.tokyo.lg.jp/seikatsu/teisyotokusyataisaku/jukenseichallenge', checked: C3 },
      sources2: [{ org: '東京都社会福祉協議会', url: 'https://www.tcsw.tvac.or.jp/shikin/index.html' }],
      verifiedBy: V
    },

    /* ───────── 東京都の相談窓口 ───────── */
    {
      id: 'tokyo-jisou',
      name: { ja: '児童相談所（東京都・特別区）', en: 'Child Guidance Centers (Tokyo)' },
      hook: { ja: '施設や里親のこと、家のことを相談したい', en: 'I want to talk about my care placement or my family' },
      summary: {
        ja: '子どもと家族のことを相談できる公的な窓口です。施設や里親家庭に入ること・出ることも、児童相談所が担当しています。',
        en: 'Public offices for children and families. They are also in charge of placements in and out of care.'
      },
      cat: ['consult', 'procedures'],
      kind: 'service', basis: 'tokyo', right: false,
      amount: null, repay: null,
      who: { ja: 'おもに18歳未満の子どもと家族。住んでいる区市町村で、担当の児童相談所が決まっています。' },
      how: { ja: '担当の児童相談所に電話します。平日9時〜17時。夜や休日は「189」（児童相談所 虐待対応ダイヤル）へ。' },
      where: { ja: '住んでいる区市町村を担当する児童相談所（地図で確認）' },
      docs: [],
      ask: ['施設を出る時期について相談したいです', '担当の児童福祉司さんと話したいです', '18歳をすぎても今のところにいられるか相談できますか？'],
      caution: { ja: '文京・品川・葛飾・豊島・板橋・中野・港・荒川・江戸川・世田谷区は、区の児童相談所が担当です。電話番号のかけまちがいに気をつけてね。' },
      supporter: { ja: '都児相に相談中の関係機関・本人の夜間休日の緊急連絡は 03-5937-2330（平日17:45以降・土日祝）。品川児童相談所（都）は令和8年7月31日に廃止、大田児童相談所が8月1日に開設。杉並児童相談所は11月1日から多摩中部児童相談所に改称（杉並区は区児相を設置予定）。' },
      effort: 'low',
      for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '189', phoneLabel: '夜・休日は 189（虐待対応ダイヤル）', line: null, chat: null, web: JISOU,
        hours: { ja: '各児童相談所: 平日 9時〜17時', en: 'Weekdays 9:00–17:00' }
      },
      locations: JISOU_LOCS,
      source: { org: '東京都福祉局', url: JISOU, checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-wakanavi',
      name: { ja: '若ナビα（東京都若者総合相談センター）', en: 'Wakanavi α (Tokyo Youth Counseling Center)' },
      hook: { ja: 'どこに相談すればいいかわからない', en: 'I don\'t know who to ask' },
      summary: {
        ja: '若い人のどんな悩みも聞いてくれる東京都の無料の相談窓口です。電話・LINE・メールで相談でき、合う相談先につないでくれます。',
        en: 'Tokyo\'s free help line for young people with any worry, by phone, LINE or email. They connect you to the right service.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '東京都に住む・学ぶ・働く、おおむね18歳〜39歳の人とその家族。' },
      how: { ja: '電話するか、LINEで「相談ほっとLINE＠東京」を友だち登録して「若者総合相談」を選びます。メールは24時間受付（利用者登録が必要）。' },
      where: { ja: '電話・LINE・メール（面談も相談できます）' },
      docs: [],
      ask: ['何から相談すればいいかわかりません。話を聞いてもらえますか？', '私に合う相談先を教えてください'],
      caution: { ja: '急いで助けが必要なとき（命の危険など）は、110番・119番へ。メールの返事は3〜7日かかります。' },
      supporter: { ja: 'メールと面談は英語・中国語・韓国/朝鮮語にも対応。支援機関からの引継ぎ相談も可。' },
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: { min: 18, max: 39 }, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-3267-0808', phoneLabel: '若ナビα', line: null, chat: 'https://www.wakanavi-tokyo.metro.tokyo.lg.jp/about/',
        web: 'https://www.wakanavi-tokyo.metro.tokyo.lg.jp/about/',
        hours: { ja: '電話・LINE: 月〜土 11時〜23時（受付は22時30分まで・年末年始は休み）', en: 'Phone/LINE: Mon–Sat 11:00–23:00 (last call 22:30)' }
      },
      locations: [],
      source: { org: '東京都若者総合相談センター 若ナビα', url: 'https://www.wakanavi-tokyo.metro.tokyo.lg.jp/about/', checked: C },
      sources2: [{ org: '東京都（都庁の相談窓口案内）', url: 'https://www.metro.tokyo.lg.jp/tosei/iken-sodan/sodan/kyoiku' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-challenge-net',
      name: { ja: 'TOKYOチャレンジネット', en: 'TOKYO Challenge Net' },
      hook: { ja: '住むところがない。ネットカフェで寝ている', en: 'I have nowhere to live and sleep in internet cafés' },
      summary: {
        ja: '住まいをなくした人や、なくしそうな人のための東京都の窓口です。住まいさがし・仕事・お金を借りる相談まで、まとめて手伝ってくれます。',
        en: 'Tokyo\'s support center for people who lost (or may lose) their home: help with housing, jobs and loan advice, all in one place.'
      },
      cat: ['housing', 'work', 'money'],
      kind: 'service', basis: 'tokyo', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '住まいがなく、ネットカフェなどで寝泊まりしながら働いている人や、仕事をなくした人。働いている、または働いて自立をめざしていて、東京都内でくらしている人。' },
      how: { ja: '電話するか、窓口に行きます。女性専用の電話もあります。' },
      where: { ja: '新宿区歌舞伎町（東京都健康プラザハイジア3階）' },
      docs: [],
      ask: ['住むところがありません。今日からどうすればいいですか？', '住まいと仕事を一緒に探したいです', '部屋に入るお金がありません。借りられますか？'],
      caution: { ja: '日曜・祝日は休みです。このほかの生活の困りごとは、住んでいる地域の福祉事務所や自立相談支援機関へ。' },
      supporter: { ja: '離職中で介護職に関心がある人向けに「介護職支援コース」（介護資格を無料で取得）あり。' },
      effort: 'low',
      for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '0120-874-225', phoneLabel: 'TOKYOチャレンジネット（女性専用 0120-874-505）', line: null, chat: null,
        web: 'https://www.tokyo-challenge.net/',
        hours: { ja: '月・水・金・土 10時〜17時／火・木 10時〜20時（日・祝は休み）', en: 'Mon/Wed/Fri/Sat 10–17, Tue/Thu 10–20' }
      },
      locations: [{
        name: 'TOKYOチャレンジネット', area: '13104', addr: '東京都新宿区歌舞伎町2-44-1 東京都健康プラザハイジア3階',
        lat: 35.696693, lng: 139.701263, phone: '0120-874-225',
        hours: '月・水・金・土 10:00–17:00／火・木 10:00–20:00', note: '女性専用ダイヤル 0120-874-505'
      }],
      source: { org: 'TOKYOチャレンジネット（東京都）', url: 'https://www.tokyo-challenge.net/', checked: C },
      sources2: [{ org: '東京都福祉局（住まいに困っている）', url: 'https://www.fukushi.metro.tokyo.lg.jp/seikatsu/seikatsu_kyoju_shuro/sumai' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-shigoto-young',
      name: { ja: '東京しごとセンター ヤングコーナー', en: 'Tokyo Shigoto Center — Young Corner' },
      hook: { ja: '自分に合う仕事がわからない', en: 'I don\'t know what job suits me' },
      summary: {
        ja: '東京都の仕事さがしの窓口です。ヤングコーナーは若い人向けで、仕事の相談や就職の準備を手伝ってくれます。',
        en: 'Tokyo\'s job center. The Young Corner helps young people with career advice and job hunting.'
      },
      cat: ['work'],
      kind: 'service', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '仕事をさがしている若い人（対象の年齢は窓口で確認してね）。' },
      how: { ja: '電話するか、飯田橋の東京しごとセンターに行きます。多摩地域の人は立川の「しごとセンター多摩」も使えます。' },
      where: { ja: '千代田区飯田橋（東京しごとセンター）／立川市（しごとセンター多摩）' },
      docs: [],
      ask: ['初めて仕事をさがします。何から始めればいいですか？', '履歴書の書き方を教えてもらえますか？', '面接の練習はできますか？'],
      caution: null,
      supporter: { ja: '東京しごとセンター総合相談 03-5211-1571。公式サイト tokyoshigoto.jp はボット対策で自動確認できなかったため、窓口情報は都（産業労働局・福祉局）の資料で確認。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-5211-2851', phoneLabel: 'ヤングコーナー', line: null, chat: null, web: 'https://www.tokyoshigoto.jp/',
        hours: { ja: '月〜金 9時〜20時／土 9時〜17時（年末年始は休み）', en: 'Mon–Fri 9–20, Sat 9–17' }
      },
      locations: [
        {
          name: '東京しごとセンター（ヤングコーナー）', area: '13101', addr: '東京都千代田区飯田橋3-10-3',
          lat: 35.700005, lng: 139.749588, phone: '03-5211-2851', hours: '月〜金 9:00–20:00／土 9:00–17:00', note: ''
        },
        {
          name: '東京しごとセンター多摩', area: '13202', addr: '東京都立川市柴崎町3-9-2 3階',
          lat: 35.695484, lng: 139.412247, phone: '042-526-4510', hours: '月〜金 9:00–20:00／土 9:00–17:00', note: '多摩地域の窓口'
        }
      ],
      source: { org: '東京都産業労働局（TOKYOはたらくネット 相談窓口のご案内）', url: SHIGOTO_PDF, checked: C },
      sources2: [{ org: '東京都福祉局（女性の方への相談体制）', url: WOMEN }],
      verifiedBy: V
    },

    {
      id: 'tokyo-shushoku-daredemo',
      name: { ja: '就職だれでも相談（東京都）', en: 'Job Help for Everyone (Tokyo, LINE/phone)' },
      hook: { ja: '窓口に行く前に、気軽に仕事の相談をしたい', en: 'I want to ask about jobs casually before going anywhere' },
      summary: {
        ja: 'LINE・電話・オンラインで、就職や転職の相談が気軽にできる東京都のサービスです。',
        en: 'Tokyo\'s casual job-hunting help by LINE, phone or video call.'
      },
      cat: ['work'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '就職や転職のことを相談したい人。' },
      how: { ja: '電話するか、LINEで友だち登録して相談します（東京都福祉局のページにQRコードがあります）。ビデオ会議でも相談できます。' },
      where: { ja: 'LINE・電話・オンライン' },
      docs: [],
      ask: ['働いたことがありません。どんな仕事ができますか？', '今のバイトをやめて正社員になりたいです'],
      caution: null,
      supporter: null,
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-5211-1752', phoneLabel: '就職だれでも相談', line: null, chat: null, web: WOMEN,
        hours: { ja: '月〜土 10時〜18時（年末年始は休み）', en: 'Mon–Sat 10:00–18:00' }
      },
      locations: [],
      source: { org: '東京都福祉局（女性の方への相談体制）', url: WOMEN, checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-rodo-sodan',
      name: { ja: '東京都ろうどう110番（労働相談）', en: 'Tokyo Labor Hotline' },
      hook: { ja: 'バイト代が払われない。急にクビと言われた', en: 'I wasn\'t paid, or I was suddenly fired' },
      summary: {
        ja: 'お給料が払われない、クビ、職場のいじめ、有給休暇など、働くことの困りごとを無料で相談できます。LINE電話なら通話料はかかりません。名前を言わなくても大丈夫です。',
        en: 'Free advice on unpaid wages, dismissal, workplace bullying, paid leave and more. LINE calls are free and you can stay anonymous.'
      },
      cat: ['work', 'consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '働くことで困っている人。' },
      how: { ja: '電話するか、LINEで「労働相談情報センター」を友だち登録して「LINEで電話相談する」を押します。会って相談したいときは予約します。' },
      where: { ja: '電話・LINE電話・オンライン・窓口（予約制）' },
      docs: ['雇用契約書や労働条件通知書（あれば）', '給与明細やシフトのメモ（あれば）'],
      ask: ['バイト代が払われていません。どうすればいいですか？', '急にやめてと言われました。これは問題ありませんか？', '有給休暇はバイトでも取れますか？'],
      caution: { ja: '0570の番号は通話料がかかり、かけ放題の対象外です。LINE電話なら通話料なし（1回30分まで）。' },
      supporter: { ja: '来所相談は会社所在地で担当事務所が決まる（予約制）。飯田橋の労働相談情報センターは 03-3265-6110。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: ['work'], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '0570-00-6110', phoneLabel: '東京都ろうどう110番', line: 'https://lin.ee/RR042kg', chat: null, web: RODO,
        hours: { ja: '月〜金 9時〜20時／土 9時〜17時（祝日・年末年始は休み）', en: 'Mon–Fri 9–20, Sat 9–17' }
      },
      locations: [{
        name: '東京都 労働相談情報センター（飯田橋）', area: '13101', addr: '東京都千代田区飯田橋3-10-3 東京しごとセンター9階',
        lat: 35.700005, lng: 139.749588, phone: '03-3265-6110', hours: '月〜金 9:00–17:00（来所は予約制）',
        note: '会社が千代田・中央・新宿・渋谷・中野・杉並区・島しょにある人の担当'
      }],
      source: { org: '東京都産業労働局（TOKYOはたらくネット）', url: RODO, checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-shohi-center',
      name: { ja: '東京都消費生活総合センター', en: 'Tokyo Consumer Affairs Center' },
      hook: { ja: '契約でだまされたかも。お金のトラブルを相談したい', en: 'I think I was tricked into a contract' },
      summary: {
        ja: '買い物や契約のトラブルを無料で相談できる東京都の窓口です。借金が重なって困っている相談も受けています。',
        en: 'Tokyo\'s free help desk for shopping and contract trouble, including debt problems.'
      },
      cat: ['money', 'consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '東京都に住む・働く・学ぶ人。' },
      how: { ja: '電話するか、予約なしで飯田橋のセンターに行きます。全国共通の「188」でもつながります。' },
      where: { ja: '新宿区神楽河岸（飯田橋セントラルプラザ16階）' },
      docs: ['契約書やレシート、やりとりの画面（あれば）'],
      ask: ['ネットで契約したものをやめたいです', 'SNSで「もうかる副業」に誘われて払ってしまいました', '借金がふえて返せません'],
      caution: { ja: '1回30分くらいです。メールでの相談はできません。日曜・祝日は休みです。' },
      supporter: null,
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-3235-1155', phoneLabel: '消費生活相談', line: null, chat: null,
        web: 'https://www.shouhiseikatu.metro.tokyo.lg.jp/sodan/sodan.html',
        hours: { ja: '月〜土 9時〜17時（日・祝・年末年始は休み）', en: 'Mon–Sat 9:00–17:00' }
      },
      locations: [{
        name: '東京都消費生活総合センター', area: '13104', addr: '東京都新宿区神楽河岸1-1 飯田橋セントラルプラザ16階',
        lat: 35.700947, lng: 139.743423, phone: '03-3235-1155', hours: '月〜土 9:00–17:00', note: '予約なしで相談できます。JR・地下鉄 飯田橋駅すぐ'
      }],
      source: { org: '東京都（東京くらしWEB）', url: 'https://www.shouhiseikatu.metro.tokyo.lg.jp/sodan/sodan.html', checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-kokoro-hotline',
      name: { ja: 'こころといのちのほっとライン（東京都）', en: 'Tokyo Suicide Prevention Line' },
      hook: { ja: '生きるのがつらい', en: 'Life feels too hard' },
      summary: {
        ja: '生きるのがつらいと感じたときに、電話やLINEで話を聞いてもらえる東京都の窓口です。電話は毎日、昼12時から朝5時30分まで。',
        en: 'Tokyo\'s phone and LINE line for when life feels too hard. Phone open every day from noon to 5:30 a.m.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料（電話は通話料がかかります）', en: 'Free (call charges apply)' }, repay: null,
      who: { ja: '生きるのがつらいと感じている人。' },
      how: { ja: '電話するか、LINEで「相談ほっとLINE＠東京」を友だち登録して「生きるのがつらいと感じたら…」を選びます。' },
      where: { ja: '電話・LINE' },
      docs: [],
      ask: ['今、とてもつらいです。話を聞いてもらえますか？'],
      caution: { ja: '0570の番号は通話料がかかり、かけ放題の対象外です。今すぐ危ないときは119番・110番へ。' },
      supporter: null,
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '0570-087478', phoneLabel: '東京都自殺相談ダイヤル', line: null, chat: null, web: WOMEN,
        hours: { ja: '電話: 毎日 12時〜翌5時30分／LINE: 毎日 15時〜22時30分', en: 'Phone daily 12:00–5:30; LINE daily 15:00–22:30' }
      },
      locations: [],
      source: { org: '東京都福祉局（女性の方への相談体制）', url: WOMEN, checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-wakasapo',
      name: { ja: 'わ\u2060か\u2060さ\u2060ぽ（と\u2060う\u2060き\u2060ょ\u2060う若者ヘルスサポート）', en: 'Wakasapo (Tokyo Teen Health Support)' },
      hook: { ja: 'からだや心のことを、こっそり聞きたい', en: 'I want to ask about my body or feelings privately' },
      summary: {
        ja: '10代のからだや心の悩みに、看護師などが電話やメールで答えてくれます。無料のフリーダイヤルです。',
        en: 'Nurses answer teens\' questions about their body and mind by free phone or email.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '東京都に住む・学ぶ・働く、中学生以上の10代の人。' },
      how: { ja: '電話（0120-372-463 みんなに・よりそう）かメールで相談します。' },
      where: { ja: '電話・メール' },
      docs: [],
      ask: ['生理や体のことで不安があります', '気持ちが落ちこんで眠れません'],
      caution: { ja: 'メールはいつでも送れますが、返事は電話と同じ時間帯にきます。' },
      supporter: null,
      effort: 'low',
      for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'left0', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 12, max: 19 }, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '0120-372-463', phoneLabel: 'わ\u2060か\u2060さ\u2060ぽ', line: null, chat: null, web: WOMEN,
        hours: { ja: '月〜金 15時〜20時／土・日 9時〜14時（元日は休み）', en: 'Mon–Fri 15–20, Sat/Sun 9–14' }
      },
      locations: [],
      source: { org: '東京都福祉局（女性の方への相談体制）', url: WOMEN, checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-ninshin-hotline',
      name: { ja: '妊娠相談ほっとライン（東京都）', en: 'Tokyo Pregnancy Hotline' },
      hook: { ja: '妊娠したかもしれない。だれにも言えない', en: 'I might be pregnant and can\'t tell anyone' },
      summary: {
        ja: '思いがけない妊娠や体のこと、お金の心配を、看護師などに相談できます。ひとりで病院や薬局に行けないときは、付きそいの支援もあります。',
        en: 'Talk to nurses about an unexpected pregnancy, your health or costs. If you can\'t go to a clinic or pharmacy alone, someone can go with you.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料（付きそいのときの診察代などを助成する場合あり）', en: 'Free (some medical costs may be covered)' }, repay: null,
      who: { ja: '東京都に住む人。' },
      how: { ja: '電話かメールで相談します。電話がこわいときは、24時間使えるチャットボット「妊娠したかも相談＠東京」もあります。' },
      where: { ja: '電話・メール・チャットボット' },
      docs: [],
      ask: ['妊娠したかもしれません。まず何をすればいいですか？', '病院に一人で行くのが不安です', '緊急避妊薬はどこでもらえますか？'],
      caution: { ja: 'メールの返事は最長1日くらいかかります。2日たっても返事がないときは、もう一度送ってください。' },
      supporter: { ja: '東京都委託（運営: 株式会社メディカル・コンシェルジュ）。医療機関・薬局への同行支援はNPO法人フローレンスに委託、都内在住・在学で対象と判断された人。診療・処方費を公費助成（就労者は原則対象外）。' },
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-5339-1133', phoneLabel: '妊娠相談ほっとライン', line: null,
        chat: 'https://www17.webcas.net/form/pub/concier/ninshinhotline',
        web: 'https://www.fukushi.metro.tokyo.lg.jp/kodomo/sodan/ninshin-hotline',
        hours: { ja: '毎日 10時〜22時（元日は休み）', en: 'Daily 10:00–22:00' }
      },
      locations: [],
      source: { org: '東京都福祉局', url: 'https://www.fukushi.metro.tokyo.lg.jp/kodomo/sodan/ninshin-hotline', checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-josei-center',
      name: { ja: '東京都女性相談支援センター', en: 'Tokyo Women\'s Support Center' },
      hook: { ja: '家や恋人から逃げたい。安全な場所がほしい', en: 'I need to get away from my home or partner and be safe' },
      summary: {
        ja: '女性のさまざまな悩みを聞く東京都の窓口です。暴力（DV）から逃げたいときの相談や、急いで保護が必要なときの支援もしています。',
        en: 'Tokyo\'s help center for women, including escaping violence and urgent protection.'
      },
      cat: ['consult', 'housing'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '女性。23区に住む人は本所、多摩・島しょに住む人は多摩支所へ。' },
      how: { ja: '電話で相談します。LINE相談「女性はーとふるLINE＠東京」もあります。' },
      where: { ja: '電話・LINE（場所は安全のため公開していません）' },
      docs: [],
      ask: ['家にいるのがこわいです。どうすればいいですか？', '今夜泊まれる安全な場所はありますか？'],
      caution: { ja: '危険がせまっているときは、すぐ110番へ。1回の相談は20分くらいです。上の電話は23区の本所です。多摩・島しょに住む人は 多摩支所 042-522-4232（月〜金 9時〜16時、祝日・年末年始は休み）へ。' },
      supporter: { ja: '多摩支所 042-522-4232（月〜金 9時〜16時、祝日・年末年始除く）。配偶者暴力相談支援センターを兼ねる。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-5261-3110', phoneLabel: '女性相談支援センター（23区）', line: 'https://www.fukushi.metro.tokyo.lg.jp/kodomo/sodan/linesodan', chat: null,
        web: WOMEN,
        hours: { ja: '月〜金 9時〜21時／土日祝・年末年始 9時〜17時', en: 'Mon–Fri 9–21; weekends/holidays 9–17' }
      },
      locations: [],
      source: { org: '東京都福祉局（女性の方への相談体制）', url: WOMEN, checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-womens-plaza',
      name: { ja: '東京ウィメンズプラザ 相談', en: 'Tokyo Women\'s Plaza helpline' },
      hook: { ja: '恋人や家族との関係がつらい', en: 'My relationship with my partner or family hurts' },
      summary: {
        ja: '恋人や家族からの暴力、親子の問題、人間関係、生き方の悩みを電話で相談できます。DVの相談はLINE「ささえるライン＠東京」でもできます。',
        en: 'Phone help for violence from partners or family, parent-child problems and relationships. DV help also by LINE.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '電話相談は女性向け。' },
      how: { ja: '電話するか、LINEで「ささえるライン＠東京」を友だち登録します（DVの相談）。' },
      where: { ja: '電話・LINE' },
      docs: [],
      ask: ['恋人に束縛されていてつらいです', '家族との関係で悩んでいます'],
      caution: { ja: 'DV専用の電話は 03-5467-1721 です。危険がせまっているときは110番へ。' },
      supporter: null,
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-5467-2455', phoneLabel: '一般相談（DV専用 03-5467-1721）', line: null, chat: null, web: WOMEN,
        hours: { ja: '電話: 9時〜21時／LINE: 14時〜20時（年末年始は休み）', en: 'Phone 9–21; LINE 14–20' }
      },
      locations: [],
      source: { org: '東京都福祉局（女性の方への相談体制）', url: WOMEN, checked: C },
      verifiedBy: V
    },

    {
      id: 'tokyo-tmc-navi',
      name: { ja: '東京都多言語相談ナビ（TMC Navi）', en: 'Tokyo Multilingual Consultation Navi (TMC Navi)' },
      hook: { ja: '日本語の手続きがむずかしい', en: 'Japanese paperwork is hard for me' },
      summary: {
        ja: '東京でくらす外国の人の困りごとに、14の言語（やさしい日本語も）で答えてくれる電話窓口です。',
        en: 'A free phone line answering everyday questions for foreign residents of Tokyo in 14 languages, including easy Japanese.'
      },
      cat: ['procedures', 'consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '東京都でくらす外国の人。' },
      how: { ja: 'フリーダイヤルに電話します。' },
      where: { ja: '電話' },
      docs: [],
      ask: ['在留カードや住民票の手続きを教えてください', '私の言葉で話せる人はいますか？'],
      caution: null,
      supporter: { ja: '運営: 公益財団法人東京都つながり創生財団。対応言語: やさしい日本語・英語・中国語・韓国語・ベトナム語・タガログ語・ネパール語・ヒンディー語・タイ語・ポルトガル語・スペイン語・インドネシア語・フランス語・ロシア語。' },
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '0120-142-142', phoneLabel: 'TMC Navi', line: null, chat: null, web: WOMEN,
        hours: { ja: '月〜金 10時〜16時（年末年始は休み）', en: 'Mon–Fri 10:00–16:00' }
      },
      locations: [],
      source: { org: '東京都福祉局（女性の方への相談体制）', url: WOMEN, checked: C },
      verifiedBy: V
    },

    /* ───────── 住まい ───────── */
    {
      id: 'tokyo-sasaeru-jutaku',
      name: { ja: '東京ささエール住宅', en: 'Tokyo Sasaeru Housing (safety-net rentals)' },
      hook: { ja: '保証人がいなくて、部屋を借りるのが不安', en: 'I worry landlords will turn me down' },
      summary: {
        ja: '住まいさがしに困っている人の入居を断らないと登録された、東京都の賃貸住宅です。東京都では「児童養護施設を出た人」も対象に入っています。',
        en: 'Rental homes registered in Tokyo as not refusing people who struggle to find housing. Tokyo includes people who left children\'s homes in this group.'
      },
      cat: ['housing'],
      kind: 'housing', basis: 'tokyo', right: false,
      amount: null, repay: null,
      who: { ja: '住まいさがしに困っている人（収入が少ない人、子育て中の人など）。東京都の計画では、児童養護施設を出た人もふくまれます。' },
      how: { ja: '国の「セーフティネット住宅情報提供システム」で部屋をさがします。住まいさがしの相談は、住んでいる区市町村の住宅や福祉の窓口へ。' },
      where: { ja: 'インターネットでさがす／区市町村の窓口' },
      docs: [],
      ask: ['児童養護施設を出た人でも入れるささエール住宅はありますか？', '家賃や保証料の手伝いはありますか？'],
      caution: { ja: 'ふつうの賃貸と同じように、契約や審査があります。契約の前に、内容をだれかと一緒に確認しよう。部屋ごとに、受け入れる人の範囲が決まっています。' },
      supporter: { ja: '東京都住宅確保要配慮者賃貸住宅供給促進計画（2022年3月改定）で、法・省令の対象に加え「児童養護施設退所者」を住宅確保要配慮者としている。八王子市の住宅は八王子市の登録制度。' },
      effort: 'mid',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: null,
      contact: {
        phone: null, phoneLabel: null, line: null, chat: null,
        web: 'https://www.juutakuseisaku.metro.tokyo.lg.jp/safety_net/chintaitourokuseido', hours: null
      },
      locations: [],
      source: { org: '東京都住宅政策本部', url: 'https://www.juutakuseisaku.metro.tokyo.lg.jp/safety_net/chintaitourokuseido', checked: C },
      sources2: [{ org: '東京都住宅政策本部（供給促進計画）', url: 'https://www.juutakuseisaku.metro.tokyo.lg.jp/documents/d/juutakuseisaku/sokushin_01' }],
      verifiedBy: V
    },

    /* ───────── 都内のNPO ───────── */
    {
      id: 'sankakusha',
      name: { ja: 'サンカクシャ', en: 'Sankakusha' },
      hook: { ja: '頼れる大人がいない。住まいと仕事を立て直したい', en: 'I have no adult to rely on and need to rebuild housing and work' },
      summary: {
        ja: '親や身近な大人を頼れない15〜25歳くらいの若者に、居場所・仕事・住まいのサポートをしている豊島区のNPOです。',
        en: 'A Toshima-based NPO supporting young people (about 15–25) who can\'t rely on their parents, with a drop-in space, work and housing help.'
      },
      cat: ['housing', 'work', 'consult'],
      kind: 'service', basis: 'npo', right: false,
      amount: null, repay: null,
      who: { ja: '親や身近な大人を頼れない、15歳〜25歳くらいの若者。' },
      how: { ja: 'LINEかフォームで問い合わせ → スタッフと面談 → 必要なら見学 → サポート開始、の順です。' },
      where: { ja: '豊島区上池袋' },
      docs: [],
      ask: ['新しい相談の受付は始まっていますか？', '住む場所のサポートはどんな内容ですか？'],
      caution: { ja: '2026年8月12日から、新しい相談の受付をしばらく休んでいます。再開の案内は2026年12月ごろの予定です。' },
      supporter: { ja: '居場所「サンカクキチ」は週4日（火・水・木・土）、利用・夕食は無料。支援団体からの紹介も受付（再開後）。' },
      effort: 'low',
      for: { stages: ['hs12', 'hs3', 'left0', 'left1', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 15, max: 25 }, areas: ['13'] },
      deadline: null,
      contact: {
        phone: '03-6905-8287', phoneLabel: 'サンカクシャ（新しい相談は休止中）', line: 'https://lin.ee/FtTpB4Z', chat: 'https://www.sankakusha.or.jp/administration/soudan_form/',
        web: 'https://www.sankakusha.or.jp/administration', hours: null
      },
      locations: [{
        name: 'サンカクシャ', area: '13116', addr: '東京都豊島区上池袋4-35-12 3階',
        lat: 35.74215, lng: 139.71960, phone: '03-6905-8287', hours: '居場所は週4日（火・水・木・土）', note: '新しい相談は休止中（2026年12月ごろ案内予定）'
      }],
      source: { org: '特定非営利活動法人サンカクシャ', url: 'https://www.sankakusha.or.jp/administration', checked: C },
      verifiedBy: V
    },

    /* ───────── v3: 中学生・高校生のための東京都の支援（2026-10-17 確認）───────── */
    {
      id: 'tokyo-shiritsu-jugyoryo',
      name: { ja: '私立高校の授業料軽減助成金（東京都）', en: 'Tokyo Private High School Tuition Subsidy' },
      hook: { ja: '私立高校に行きたいけど、授業料が高い', en: 'I want to go to a private high school but tuition is expensive' },
      summary: {
        ja: '国の就学支援金に東京都が上乗せして、私立高校の授業料を年50万1,000円まで助けてくれます。所得制限はありません。国と都の両方に申しこむ必要があります。',
        en: 'Tokyo adds to the national tuition support so private high school tuition is covered up to ¥501,000 a year. No income limit. You must apply to both the national and Tokyo schemes.'
      },
      cat: ['education', 'money'],
      kind: 'grant', basis: 'tokyo', right: false,
      amount: {
        ja: '都の助成 年4万3,800円まで（国の就学支援金 年45万7,200円とあわせて最大 年50万1,000円。実際に払った授業料まで）',
        en: 'Tokyo pays up to ¥43,800/year (with the national ¥457,200, up to ¥501,000/year, capped at actual tuition)'
      },
      repay: 'none',
      who: { ja: '本人と保護者が東京都に住んでいて、私立高校（全日制・定時制など）に通う生徒の保護者。国の就学支援金をもらえる人。都の外の私立高校に通っていても対象です。' },
      how: { ja: '毎年7月ごろ、保護者がスマホかパソコンで東京都私学財団の申請サイトから申しこみます（毎年必要）。国の就学支援金は、学校を通して別に申しこみます。' },
      where: { ja: '東京都私学財団（オンライン申請）' },
      docs: ['申請サイトのアカウント（メールアドレス）', '奨学給付金もいっしょに申しこむときは課税証明書'],
      ask: ['私の学校の授業料だと、国と都でいくらまで助けてもらえますか？', '今年の申請はいつですか？申しこみ忘れたらどうなりますか？', '奨学給付金もいっしょに申しこめますか？'],
      caution: { ja: '授業料だけが対象で、施設費などはふくまれません。7月の受付を過ぎると、1月の特別申請まで待つことになります。国の就学支援金だけで授業料が全部まかなえるときは、申しこまなくて大丈夫です。' },
      supporter: { ja: '（公財）東京都私学財団が実施。令和8年度は通常申請7月、特別申請は令和9年1月上旬（12月に案内）。振込は都内校10月・12月・3月。都認可通信制は令和8年度の時期が例年と異なる。中3の進路相談の段階で「私立でも授業料は国＋都で年50万1,000円まで」と伝えると選択肢が広がる。' },
      effort: 'mid',
      for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['13'] },
      deadline: {
        ja: '毎年7月に申請（令和8年度の通常分は終了。特別申請は令和9年1月上旬の予定）',
        en: 'Apply every July (special window early January)',
        leaveMonths: null, months: [7, 1], always: false
      },
      contact: {
        phone: '03-5206-7925', phoneLabel: '東京都私学就学支援金センター 授業料軽減担当（高校）', line: null, chat: null,
        web: 'https://www.shigaku-tokyo.or.jp/parents_index/pa_jugyoryo/',
        hours: { ja: '平日 9時15分〜17時', en: 'Weekdays 9:15–17:00' }
      },
      locations: [],
      source: { org: '公益財団法人 東京都私学財団', url: 'https://www.shigaku-tokyo.or.jp/parents_index/pa_jugyoryo/', checked: C3 },
      verifiedBy: V
    },

    {
      id: 'tokyo-toritsu-jugyoryo',
      name: { ja: '都立高校の授業料（就学支援金で実質0円）', en: 'Tokyo Metropolitan High School Tuition (covered in full)' },
      hook: { ja: '都立高校の授業料って、いくらかかるの？', en: 'How much is tuition at a Tokyo public high school?' },
      summary: {
        ja: '都立高校の授業料（全日制で年11万8,800円）は、国の就学支援金でまかなわれます。2026年度から所得制限がなくなりました。ただし、学校から案内が来たときに手続きをしないと、授業料を払うことになります。',
        en: 'Tuition at Tokyo public high schools (¥118,800/year full-time) is covered by national support, with no income limit from 2026. But if you skip the paperwork when school asks, you have to pay.'
      },
      cat: ['education', 'procedures'],
      kind: 'procedure', basis: 'tokyo', right: true,
      amount: { ja: '授業料の分（全日制 月9,900円＝年11万8,800円、定時制 月2,700円）を国が学校に払う', en: 'Covers tuition (full-time ¥9,900/month = ¥118,800/year; part-time ¥2,700/month)' },
      repay: 'none',
      who: { ja: '都立高校・都立中等教育学校の後期課程・都立特別支援学校の高等部に通う生徒。高校を卒業したことがある人は対象外です。' },
      how: { ja: '入学すると学校から「システム利用開始情報通知書」が配られます。それを見て、都のオンライン申請システムで申請します（2026年度は在校生もふくめ全員。都立特別支援学校は学校ごとのフォーム）。お金は学校が受け取り、家には振り込まれません。' },
      where: { ja: '通っている都立高校の経営企画室' },
      docs: ['学校から配られる案内にそって入力'],
      ask: ['就学支援金の手続きはいつまでですか？', '施設や里親家庭にいる場合、だれが申請しますか？', '授業料以外にかかるお金を助けてもらえる制度はありますか？'],
      caution: { ja: '手続きをしないと、授業料を払うことになります。授業料のほかに、教科書代・修学旅行代などは別にかかります（給付型奨学金や奨学のための給付金を見てね）。' },
      supporter: { ja: '支給期間は最大36か月（定時制・通信制48か月）。高校中退後の学び直しは「学び直し支援金」で最長12か月（定時制・通信制24か月）延長。国籍・在留資格で対象外の生徒には「高校生等・新修学支援金」。都立高校のオンライン申請は令和8年度は1月9日まで（新入生・在校生共通）。問い合わせ: 教育庁 高等学校教育課経理担当 03-5320-7862。都立特別支援学校の場合の問い合わせ: 特別支援教育課経理担当 03-5320-6754。' },
      effort: 'low',
      for: { stages: ['jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['13'] },
      deadline: { ja: '入学後、学校が知らせる期限まで（2026年度のオンライン申請は1月9日まで）', en: 'By the deadline your school gives (2026 online applications: until January 9)', leaveMonths: null, months: [4], always: false },
      contact: {
        phone: '03-5320-7862', phoneLabel: '東京都教育庁 高等学校教育課 経理担当', line: null, chat: null,
        web: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/scholarship', hours: null
      },
      locations: [],
      source: { org: '東京都教育委員会（高等学校等就学支援金事業について）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/scholarship', checked: C3 },
      sources2: [{ org: '東京都教育委員会（各種支援制度のオンライン申請について）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/starting_application_online' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-toritsu-kyufugata',
      name: { ja: '東京都立学校等 給付型奨学金', en: 'Tokyo Public School Scholarship (school activity costs)' },
      hook: { ja: '修学旅行や模試のお金が心配', en: 'I\'m worried about the cost of school trips and practice exams' },
      summary: {
        ja: '修学旅行・模試・検定試験などの費用を、東京都が保護者のかわりに学校へ払ってくれます。返さなくていいお金です。2026年度から対象の家庭が広がりました。',
        en: 'Tokyo pays the school directly for trips, practice exams and qualification tests. No repayment. More families qualify from 2026.'
      },
      cat: ['education', 'money'],
      kind: 'grant', basis: 'tokyo', right: false,
      amount: { ja: '年5万円まで（生活保護・住民税の所得割が非課税の家庭）／年3万円まで（所得割の合計が18万2,500円未満の家庭）', en: 'Up to ¥50,000/year (lowest-income) or ¥30,000/year' },
      repay: 'none',
      who: { ja: '都立高校（中等教育学校の後期課程をふくむ）・都内の一部の国公立高校・都立特別支援学校の高等部などに通う、収入の条件にあう家庭の生徒（年収のめやす 約490万円未満）。' },
      how: { ja: '学校から配られる案内にそって申しこみます（都立高校はオンライン）。認められると、学校が決めた対象の費用を、上限まで払わずに参加できます。' },
      where: { ja: '通っている学校の経営企画室・事務室' },
      docs: ['申請書（学校で配布、または オンライン）', 'マイナンバー収集台紙（都立学校で配布）または住民税の課税証明書など'],
      ask: ['給付型奨学金の申しこみはいつまでですか？', '修学旅行のお金も対象になりますか？', '端末（タブレット）を買う支援もありますか？'],
      caution: { ja: 'お金は家に振り込まれず、都が学校に払います。施設などで措置費（見学旅行費など）が出ている場合は対象外です。' },
      supporter: { ja: '給付型奨学金の認定世帯には、都立高校の端末購入の保護者負担（3万円）支援もある。家計急変で対象になる場合あり。問い合わせ: 教育庁 高等学校教育課経理担当 03-5320-7862。都立特別支援学校の場合の問い合わせ: 特別支援教育課経理担当 03-5320-6754。' },
      effort: 'mid',
      for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['13'] },
      deadline: { ja: '学校が知らせる期限まで', en: 'By the deadline your school gives', leaveMonths: null, months: null, always: false },
      contact: {
        phone: '03-5320-7862', phoneLabel: '東京都教育庁 高等学校教育課 経理担当', line: null, chat: null,
        web: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/non-refundable_scholarship', hours: null
      },
      locations: [],
      source: { org: '東京都教育委員会（東京都立学校等給付型奨学金制度）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/non-refundable_scholarship', checked: C3 },
      verifiedBy: V
    },

    {
      id: 'tokyo-kokoritsu-kyufukin',
      name: { ja: '東京都 国公立高校等 奨学のための給付金', en: 'Tokyo Scholarship Benefit for Public High School Students' },
      hook: { ja: '教科書や制服、学用品のお金が足りない', en: 'I can\'t afford textbooks, uniforms or school supplies' },
      summary: {
        ja: '都立などの国公立高校に通う生徒の家庭に、教科書代や学用品代などとして、返さなくていいお金を出してくれます。2026年度から年収490万円くらいの家庭まで広がりました。',
        en: 'A non-repayable benefit for families of students at Tokyo public high schools, for textbooks, supplies and trips. Extended to households earning about ¥4.9 million from 2026.'
      },
      cat: ['education', 'money'],
      kind: 'grant', basis: 'tokyo', right: false,
      amount: {
        ja: '全日制・定時制で 年3万5,930円〜14万3,700円（住民税が非課税の家庭は14万3,700円、生活保護の家庭は3万2,300円）',
        en: 'Full/part-time: ¥35,930–¥143,700 a year (¥143,700 for tax-exempt households; ¥32,300 on welfare)'
      },
      repay: 'none',
      who: { ja: '保護者が東京都に住んでいて、都立などの国公立高校に通う生徒がいる家庭のうち、生活保護を受けている家庭か、住民税の所得割の合計が18万2,500円未満の家庭。私立高校の人は東京都私学財団の制度です。' },
      how: { ja: '学校から案内がきたら、通っている学校を通して申しこみます（都立高校はオンライン。基準日は毎年7月1日）。入学したばかりの1年生には、早めにもらえる「一部早期給付」もあります。' },
      where: { ja: '通っている学校の経営企画室' },
      docs: ['申請（都立はオンライン）', '口座振替依頼書と通帳のコピー', 'マイナンバー収集台紙 または 住民税の課税証明書など', '住民票の写し'],
      ask: ['奨学のための給付金の申しこみはいつですか？', '1年生の早期給付はいつ申しこめますか？', '家の収入が急に減ったときも申しこめますか？'],
      caution: { ja: '令和8年度の通常の受付は終わりました。家計が急に苦しくなった家庭は令和9年1月末まで申しこめます（都立のオンライン申請は1月9日まで）。施設などで措置費（見学旅行費など）が出ている人は対象外です。私立高校の人は東京都私学就学支援金センター 03-5206-7925 へ。' },
      supporter: { ja: '親権者が児童相談所長・児童福祉施設長・法人後見人などの場合、その所得は審査対象外（いないものとみなして書類提出）。保護者がいない場合は扶養誓約書。私立は東京都私学財団の奨学給付金（授業料軽減助成金と同時申請可）。令和8年度の都立の申請期間：一部早期給付（新入生のみ・年額の4分の1、9月ごろ支給）は7月7日まで、通常申請は7月8日〜9月15日（12月末までに振込予定）。' },
      effort: 'mid',
      for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['13'] },
      deadline: {
        ja: '通常の申請は7月8日〜9月15日（基準日7月1日）。令和8年度の通常分は終了。家計急変は令和9年1月末まで',
        en: 'Regular applications 8 July–15 September (FY2026; base date July 1). The 2026 regular window is closed (sudden income drop: until end of Jan 2027)',
        leaveMonths: null, months: [7, 8, 9], always: false
      },
      contact: { phone: '03-5320-7862', phoneLabel: '東京都教育庁 高等学校教育課 経理担当', line: null, chat: null, web: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/scholarship_public_school', hours: null },
      locations: [],
      source: { org: '東京都教育委員会（東京都国公立高等学校等奨学のための給付金事業のお知らせ）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/scholarship_public_school', checked: C3 },
      sources2: [{ org: '公益財団法人 東京都私学財団（私立の奨学給付金は授業料軽減助成金と同時申請）', url: 'https://www.shigaku-tokyo.or.jp/parents_index/pa_jugyoryo/' }, { org: '東京都教育委員会（各種支援制度のオンライン申請について）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/starting_application_online' }, { org: '東京都教育委員会（新入生への一部早期給付）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/admission/tuition/tuition/scholarship_public_school/scholarship_public_school_early_package' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-jicen-4152',
      name: { ja: '4152（よいこに）電話相談（東京都児童相談センター）', en: 'Tokyo Child Guidance Center Phone Line "4152"' },
      hook: { ja: '友だちや学校、家のことで悩んでいる', en: 'I\'m struggling with friends, school or home' },
      summary: {
        ja: '18歳未満の子どものことなら、なんでも相談できる東京都の電話です。子ども本人もかけられます。名前を言わなくても大丈夫です。',
        en: 'Tokyo\'s phone line for anything about children under 18. Kids can call too, and you don\'t have to give your name.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: null, repay: null,
      who: { ja: '東京都に住んでいるか、東京都の学校に通っている子どもと、その保護者など。' },
      how: { ja: '03-3366-4152 に電話します。終わりの時間の30分前までにかけると、ゆっくり話せます。' },
      where: { ja: '電話' },
      docs: [],
      ask: ['友だちとうまくいきません', '学校に行きたくないです', '家にいるのがつらいです'],
      caution: { ja: '秘密は守られます。でも、命や体があぶないと判断されたときは、児童相談所や警察と情報を共有することがあります。番号のかけまちがいに気をつけてね。' },
      supporter: { ja: '聴覚言語障害者相談FAX 03-3366-6036（回答に日数を要することあり）。' },
      effort: 'low',
      for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 6, max: 17 }, areas: ['13'] },
      deadline: { ja: 'いつでも（受付時間内）', en: 'Anytime during hours', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-3366-4152', phoneLabel: '4152（よいこに）電話相談', line: null, chat: null,
        web: 'https://www.fukushi.metro.tokyo.lg.jp/shisetsu/jicen/annai/4152',
        hours: { ja: '月〜金 9時〜21時／土・日・祝 9時〜17時（12月29日〜1月3日は休み）', en: 'Mon–Fri 9–21, Sat/Sun/holidays 9–17 (closed Dec 29–Jan 3)' }
      },
      locations: [],
      source: { org: '東京都福祉局（児童相談センター 4152電話相談）', url: 'https://www.fukushi.metro.tokyo.lg.jp/shisetsu/jicen/annai/4152', checked: C3 },
      sources2: [{ org: '東京都保健医療局（子供・若者の相談窓口一覧）', url: 'https://www.hokeniryo.metro.tokyo.lg.jp/kenkou/tokyokaigi/madoguti/kodomo' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-kodomo-net',
      name: { ja: '話してみなよ 東京子供ネット', en: 'Tokyo Kodomo Net (children\'s rights helpline)' },
      hook: { ja: 'いじめ・体罰・虐待をうけている', en: 'I\'m being bullied, physically punished or abused' },
      summary: {
        ja: 'いじめ・体罰・虐待などで、自分の権利が守られていないときの子ども専用の相談先です。無料の電話のほか、メールや手紙でも相談できます。弁護士などの専門員が、解決まで動いてくれることもあります。',
        en: 'A free helpline just for children whose rights aren\'t being protected — bullying, physical punishment, abuse. Phone, web form or letter. Specialists such as lawyers can step in to help solve it.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料（フリーダイヤル）', en: 'Free' }, repay: null,
      who: { ja: '子ども本人。いじめ・体罰・虐待・性被害などを受けたとき、それに気づいたとき、そのことで悩んでいるとき。' },
      how: { ja: '0120-874-374（はなしてみなよ）に電話します。携帯電話からもかけられます。電話がむずかしいときは、ページのメールフォームから送れます。' },
      where: { ja: '電話・メールフォーム・手紙' },
      docs: [],
      ask: ['SNSで悪口を言われています', '先生に無理やり正座させられました', '大人から暴力をふるわれています'],
      caution: { ja: 'すぐに危ないときは110番へ。' },
      supporter: { ja: '東京都児童相談センターが事務局の「子供の権利擁護専門相談事業」（平成16年度〜）。状況により権利擁護専門員（弁護士・福祉関係者）の面接相談（要予約）につなぎ、事実確認・関係機関への助言や調整を行う。事務局 03-5937-2305。' },
      effort: 'low',
      for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 6, max: 17 }, areas: ['13'] },
      deadline: { ja: 'いつでも（受付時間内）', en: 'Anytime during hours', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '0120-874-374', phoneLabel: '東京子供ネット（無料）', line: null, chat: null,
        web: 'https://www.fukushi.metro.tokyo.lg.jp/shisetsu/jicen/annai/keriyougo',
        hours: { ja: '月〜金 9時〜21時／土・日・祝 9時〜17時（12月29日〜1月3日は休み）', en: 'Mon–Fri 9–21, Sat/Sun/holidays 9–17 (closed Dec 29–Jan 3)' }
      },
      locations: [],
      source: { org: '東京都福祉局（子供の権利擁護専門相談事業）', url: 'https://www.fukushi.metro.tokyo.lg.jp/shisetsu/jicen/annai/keriyougo', checked: C3 },
      sources2: [{ org: '東京都福祉局（子供の権利擁護専門相談事業 リーフレット：受付時間）', url: 'https://www.fukushi.metro.tokyo.lg.jp/documents/d/fukushi/r7kenri-yougo-pdf' }],
      verifiedBy: V
    },

    {
      id: 'tokyo-soudan-line',
      name: { ja: '相談ほっとLINE＠東京', en: 'Soudan Hot LINE @ Tokyo' },
      hook: { ja: '消えてしまいたいくらいつらい。電話はこわい', en: 'I feel so bad I want to disappear, and calling is scary' },
      summary: {
        ja: 'LINEで文字だけで相談できる東京都の窓口です。毎日15時〜23時。「話してみよう 子供専用」や「ネット・スマホで困ったら」の相談も、同じアカウントでできます。',
        en: 'Tokyo\'s text-only LINE counseling, daily 15:00–23:00. The same account also handles a kids-only channel and help with internet/smartphone trouble.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '東京都に住む・通う・働く人で、消えてしまいたいほどつらい気持ちや悩みがある人。' },
      how: { ja: 'LINEで「相談ほっとLINE@東京」をさがして友だち追加し、メッセージを送ります（受付は22時30分まで）。' },
      where: { ja: 'LINE' },
      docs: [],
      ask: ['今つらくて、だれかに聞いてほしいです', '家にいるのがしんどいです'],
      caution: { ja: 'こんでいるとすぐに返事がこないことがあります。急ぐときはメニューの「ここナビ」からほかの相談先も探せます。命があぶないときは119番・110番へ。' },
      supporter: { ja: '東京都保健医療局 健康推進課。若年層の自殺防止対策。秘密は守るが、身体・生命の危険がある場合は警察等と共有する場合あり。「若ナビα」「性被害相談窓口」「こころのLINE相談」も同一アカウント。' },
      effort: 'low',
      for: { stages: [], paths: [], care: [], careOnly: false, age: null, areas: ['13'] },
      deadline: { ja: '毎日（15時〜23時）', en: 'Daily 15:00–23:00', leaveMonths: null, months: null, always: true },
      contact: {
        phone: null, phoneLabel: null, line: null, chat: null,
        web: 'https://www.hokeniryo.metro.tokyo.lg.jp/kenkou/tokyokaigi/rinji1/linesoudan',
        hours: { ja: '毎日 15時〜23時（受付は22時30分まで）', en: 'Daily 15:00–23:00 (last entry 22:30)' }
      },
      locations: [],
      source: { org: '東京都保健医療局（東京都でLINE相談を実施します）', url: 'https://www.hokeniryo.metro.tokyo.lg.jp/kenkou/tokyokaigi/rinji1/linesoudan', checked: C3 },
      verifiedBy: V
    },

    {
      id: 'tokyo-kyoiku-sodan',
      name: { ja: '東京都教育相談センター（いじめ相談ホットライン・高校進学の相談）', en: 'Tokyo Education Counseling Center (bullying hotline & high school advice)' },
      hook: { ja: 'いじめや学校のこと、高校進学のことを相談したい', en: 'I want to talk about bullying, school or getting into high school' },
      summary: {
        ja: '学校や勉強のことを相談できる東京都の窓口です。いじめなどの相談は24時間つながる無料の電話。都立高校の入学・進路の相談や、学校に行けていない人・高校をやめた人のための相談もあります。',
        en: 'Tokyo\'s counseling center for school matters: a free 24-hour line for bullying and other worries, plus advice on getting into Tokyo public high schools and support for students out of school.'
      },
      cat: ['consult', 'education'],
      kind: 'hotline', basis: 'tokyo', right: false,
      amount: null, repay: null,
      who: { ja: '高校生くらいの年齢までの子どもと、その保護者。' },
      how: { ja: 'いじめや学校のことは 0120-53-8288（24時間）。都立高校の入学・進路は 03-3360-4175。学校に行けていない・高校をやめた人の進路は「青少年リスタートプレイス」03-3360-4192。来所での相談もできます。' },
      where: { ja: '電話（来所相談は 新宿区北新宿 東京都子供家庭総合センター4階）' },
      docs: [],
      ask: ['いじめられています。どうすればいいですか？', '都立高校の入試について知りたいです', '中学校に行けていません。高校に行けますか？'],
      caution: { ja: 'すぐに危ないときは110番へ。英語・中国語・韓国語の通訳つき相談は金曜の午後です。' },
      supporter: { ja: '高校進級・進路・入学相談 月〜土 9:00–17:00。青少年リスタートプレイス／思春期サポートプレイス 平日 9:00–17:00（03-3360-4192）。学校問題解決サポートセンター 03-3360-4195。' },
      effort: 'low',
      for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'], paths: [], care: [], careOnly: false, age: { min: 6, max: 18 }, areas: ['13'] },
      deadline: { ja: 'いつでも', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '0120-53-8288', phoneLabel: '東京都いじめ相談ホットライン（教育相談一般・24時間）', line: null, chat: null,
        web: 'https://www.kyoiku.metro.tokyo.lg.jp/consulting/students_parents/window',
        hours: { ja: '24時間', en: '24 hours' }
      },
      locations: [{
        name: '東京都教育相談センター（東京都子供家庭総合センター4階）', area: '13104', addr: '東京都新宿区北新宿4-6-1',
        lat: 35.707607, lng: 139.694107, phone: '03-3360-4175', hours: '高校進級・進路・入学相談: 月〜土 9:00–17:00', note: '来所相談は希望すればできます'
      }],
      source: { org: '東京都教育委員会（教育についての相談）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/consulting/students_parents/window', checked: C3 },
      verifiedBy: V
    }

  );
})();
