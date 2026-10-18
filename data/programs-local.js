/* 巣立ちマップ v3 — data/programs-local.js (A5 / DATA-T)
 * 区市町村の支援。
 *  (1) 23区・26市（＋西多摩の町村）の「くらしとしごとの相談窓口」（生活困窮者自立支援法の自立相談支援機関）
 *  (2) 区独自の、施設や里親家庭を巣立つ若者（ケアリーバー）向けの支援
 *  (3) v3: 62区市町村の子供家庭支援センター（中学生・高校生の身近な相談先）
 *  (4) v3: 23区の子どもの学習・生活支援事業（生活困窮世帯の子どもの学習支援）
 * (1)(2) は 2026-10-16、(3)(4) は 2026-10-17 に各区市（または東京都福祉局）の公式ページを読んで確認しました。
 * わからない項目は null にしています（推測で埋めていません）。
 * 座標は 国土地理院 住所検索API で住所から求めました。
 *
 * 追加フィールド（SPEC外・任意）: eligibleBy
 *   'residence' … その区市に「住んでいる人」が対象（for.areas = [その区市]）
 *   'origin'    … 住んでいる場所ではなく「どの区の施設・里親・児童相談所から巣立ったか」で決まる
 *                 （for.areas = ['13'] にして、who / caution で条件をはっきり書いています）
 */
(function () {
  var SM = window.SM;
  var C = '2026-10-16';
  var C3 = '2026-10-17';   // v3 で追加・確認した記録
  var NOT_JR = ['hs12', 'hs3', 'left0', 'left1', 'nohs'];   // 中学生（jhs12/jhs3）には出さない
  var V = 'Economix JP';
  var CARE = ['facility', 'foster', 'jhome'];

  // 東京都福祉局オープンデータ「自立相談支援機関問合せ先一覧」（住所・受付時間の補足に使用）
  var TOKYO_LIST = {
    org: '東京都福祉局（オープンデータ「生活困窮者自立支援制度 自立相談支援機関問合せ先一覧」）',
    url: 'https://spec.api.metro.tokyo.lg.jp/spec/t000054d0000000045-9866b97f6b8fe1b898893a5f4167fd85-0'
  };

  function loc(name, area, addr, lat, lng, phone, hours, note) {
    return { name: name, area: area, addr: addr, lat: lat, lng: lng, phone: phone, hours: hours, note: note || '' };
  }

  /* ---- (1) くらしとしごとの相談窓口（自立相談支援機関） ------------------------------------ */
  /* o = { code, slug, city, en, wname, wnameEn, phone, hoursJa, hoursEn, locs, url, org, note, noReserve, hogoNote, sources2, basis, areas } */
  function jiritsu(o) {
    var reserve = o.noReserve
      ? '予約なしで行けます。電話だけの相談もできます。'
      : 'まず電話で「生活の相談をしたい」と伝えて、予約してから行くと待たずにすみます。';
    return {
      id: o.slug + '-jiritsu-sodan',
      name: { ja: o.city + ' ' + o.wname, en: o.en + ': ' + (o.wnameEn || 'Living & work support desk') },
      hook: { ja: 'お金・仕事・住まいのこと、まとめて相談したい', en: 'I want to talk about money, work and housing in one place' },
      summary: {
        ja: o.city + 'に住む人のための、お金・仕事・住まいの無料の相談窓口です。相談員がいっしょに計画を立てて、家賃の給付金（住居確保給付金）などの制度につないでくれます。',
        en: 'A free support desk for ' + o.en + ' residents about money, work and housing. A counselor makes a plan with you and connects you to programs such as the Housing Security Benefit.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: o.basis || 'local', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: (o.whoJa || (o.city + 'に住んでいて、お金・仕事・住まいのことで困っている人。')) + (o.hogoNote === false ? '' : '生活保護を受けている人は、担当のケースワーカーに相談します。') },
      how: { ja: reserve + '家族や支援者といっしょに行っても大丈夫です。家賃や収入がわかる紙（通帳・給料明細・賃貸の契約書など）があると、話が早く進みます。' },
      where: { ja: o.whereJa || (o.locs.length ? o.locs[0].name : o.city) },
      docs: [],
      ask: [
        '施設（里親家庭）を出たばかりで、生活費と家賃が心配です。使える制度はありますか？',
        '住居確保給付金（家賃の給付金）の対象になるか、調べてもらえますか？',
        'お金のやりくりの相談（家計の相談）もできますか？'
      ],
      caution: { ja: (o.note ? o.note + ' ' : '') + '相談しただけでお金がもらえるわけではありません。でも、使える制度をいっしょに探してくれる「最初の入口」です。' },
      supporter: { ja: '生活困窮者自立支援法にもとづく自立相談支援機関。住居確保給付金・家計改善支援・就労準備支援などの入口。社会的養護経験者で住まいや家計に不安がある場合、早めの同行がおすすめ。' + (o.supNote ? ' ' + o.supNote : '') },
      effort: 'low',
      // v3: 大人の家計・仕事の窓口なので中学生には出さない（中学生は (3) 子供家庭支援センターへ）
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: o.areas || [o.code] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: o.phone, phoneLabel: o.wname, line: null, chat: null, web: o.web !== undefined ? o.web : o.url,
        hours: o.hoursJa ? { ja: o.hoursJa, en: o.hoursEn || null } : null
      },
      locations: o.locs,
      source: { org: o.org || o.city, url: o.url, checked: C },
      sources2: o.sources2 || [],
      eligibleBy: 'residence',
      verifiedBy: V
    };
  }

  var WD = '平日'; // 土日・祝日・年末年始は休み（各ページで確認）

  var J = [
    jiritsu({ code: '13101', slug: 'chiyoda', city: '千代田区', en: 'Chiyoda City', wname: 'くらしと仕事・家計の相談（生活支援課）', wnameEn: 'Life, work & household budget consultation',
      phone: '03-5211-4126', hoursJa: '平日 9時〜17時', hoursEn: 'Weekdays 9:00–17:00',
      url: 'https://www.city.chiyoda.lg.jp/koho/kenko/sekatsu/kurashi.html', org: '千代田区（保健福祉部 生活支援課）',
      note: '前の日までに予約すると、待ち時間が少なくなります。区役所に行けないときは、家に来てもらう相談もできます。',
      hogoNote: false,
      locs: [loc('千代田区役所（生活支援課）', '13101', '東京都千代田区九段南1-2-1', 35.693947, 139.75354, '03-5211-4126', WD + ' 9:00–17:00', '')] }),

    jiritsu({ code: '13102', slug: 'chuo', city: '中央区', en: 'Chuo City', wname: 'くらしとしごとの相談（ふくしの総合相談窓口）', wnameEn: 'Life & work consultation (welfare one-stop desk)',
      phone: '03-3546-5303', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.chuo.lg.jp/a0022/kenkouiryou/fukushiippan/seikatsushien/seikatukonkyu.html', org: '中央区',
      locs: [loc('京橋ふくしの総合相談窓口（中央区役所 本庁舎 地下1階）', '13102', '東京都中央区築地1-1-1', 35.670841, 139.771927, '03-3546-5303', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13103', slug: 'minato', city: '港区', en: 'Minato City', wname: '港区生活・就労支援センター', wnameEn: 'Minato Life & Employment Support Center',
      phone: '03-5114-8826', hoursJa: '平日 8時30分〜17時15分', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.minato.tokyo.jp/jiritsusien/seikatukonnkyuusyajiritusien.html', org: '港区',
      locs: [loc('港区生活・就労支援センター（麻布地区総合支所 2階）', '13103', '東京都港区六本木5-16-45', 35.660809, 139.735794, '03-5114-8826', WD + ' 8:30–17:15', '')] }),

    jiritsu({ code: '13104', slug: 'shinjuku', city: '新宿区', en: 'Shinjuku City', wname: '生活支援相談窓口', wnameEn: 'Life support consultation desk',
      phone: '03-5273-3853', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.shinjuku.lg.jp/fukushi/fukushi01_002056.html', org: '新宿区',
      hogoNote: false,
      locs: [loc('新宿区 生活支援相談窓口（区役所 第二分庁舎 1階）', '13104', '東京都新宿区新宿5-18-21', 35.693802, 139.706436, '03-5273-3853', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13105', slug: 'bunkyo', city: '文京区', en: 'Bunkyo City', wname: '自立相談支援窓口', wnameEn: 'Self-reliance support desk',
      phone: '03-5803-1917', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.bunkyo.lg.jp/b019/p003129.html', org: '文京区（生活福祉課）',
      note: '相談員が出かけていることもあるので、前もって電話で予約しましょう。',
      locs: [loc('文京区 自立相談支援窓口（文京シビックセンター 9階北側）', '13105', '東京都文京区春日1-16-21', 35.708336, 139.752411, '03-5803-1917', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13106', slug: 'taito', city: '台東区', en: 'Taito City', wname: '生活や仕事の相談（保護課 生活困窮者支援担当）', wnameEn: 'Life & work consultation',
      phone: '03-5246-1158', hoursJa: '平日 8時30分〜17時（12時〜13時をのぞく）', hoursEn: 'Weekdays 8:30–17:00 (closed 12–13)',
      url: 'https://www.city.taito.lg.jp/kurashi/soudan/seikatsu/seikatsukonkyu.html', org: '台東区',
      note: '電話だけの相談もできます。',
      locs: [loc('台東区役所 本庁舎 2階 9番窓口', '13106', '東京都台東区東上野4-5-6', 35.712452, 139.77977, '03-5246-1158', WD + ' 8:30–17:00（12:00–13:00 をのぞく）', '')] }),

    jiritsu({ code: '13107', slug: 'sumida', city: '墨田区', en: 'Sumida City', wname: 'くらし・しごと相談室すみだ', wnameEn: 'Sumida Life & Work Consultation Room',
      phone: '03-5608-6289', hoursJa: '平日 8時30分〜17時（東京都の一覧より）', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.sumida.lg.jp/kenko_fukushi/seikatuhukusi/seikatusoudan.html', org: '墨田区',
      note: '窓口に行くときは、前もって予約してください。メールでも相談を受けています。',
      supNote: 'メール KURASHISHIGOTO@city.sumida.lg.jp。住所・時間は東京都オープンデータの一覧で補足。',
      sources2: [TOKYO_LIST],
      locs: [loc('くらし・しごと相談室すみだ（墨田区役所 3階）', '13107', '東京都墨田区吾妻橋1-23-20', 35.710602, 139.801895, '03-5608-6289', WD + ' 8:30–17:00', '要予約')] }),

    jiritsu({ code: '13108', slug: 'koto', city: '江東区', en: 'Koto City', wname: '生活・仕事・家計の相談（自立相談支援）', wnameEn: 'Life, work & budget consultation',
      phone: '03-3647-8487', hoursJa: '平日 8時30分〜17時（12時〜13時は受付のみ）', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.koto.lg.jp/250251/kurashi/sodan/sekatsu/seikatusigotosoudan.html', org: '江東区',
      note: '住んでいる住所によって、窓口（保護第一課・保護第二課）が分かれます。どちらか迷ったら電話で聞いてOKです。',
      hogoNote: false, sources2: [TOKYO_LIST],
      whereJa: '保護第一課（江東区役所 2階24番）または 保護第二課（総合区民センター 1階）',
      locs: [
        loc('江東区 保護第一課（江東区役所 2階24番）', '13108', '東京都江東区東陽4-11-28', 35.672993, 139.81636, '03-3647-8487', WD + ' 8:30–17:00', '住所によって担当がちがいます'),
        loc('江東区 保護第二課（総合区民センター 1階）', '13108', '東京都江東区大島4-5-1', 35.688911, 139.826523, '03-3637-3741', WD + ' 8:30–17:00', '住所によって担当がちがいます')
      ] }),

    jiritsu({ code: '13109', slug: 'shinagawa', city: '品川区', en: 'Shinagawa City', wname: '暮らし・しごと応援センター', wnameEn: 'Life & Work Support Center',
      phone: '03-5742-9117', hoursJa: '平日 9時〜12時・13時〜17時', hoursEn: 'Weekdays 9:00–12:00, 13:00–17:00',
      url: 'https://www.city.shinagawa.tokyo.jp/PC/kenkou/kenkou-seikatsukomaru/hpg000001255.html', org: '品川区',
      locs: [loc('品川区 暮らし・しごと応援センター（品川区役所）', '13109', '東京都品川区広町2-1-36', 35.608822, 139.729767, '03-5742-9117', WD + ' 9:00–12:00／13:00–17:00', '')] }),

    jiritsu({ code: '13110', slug: 'meguro', city: '目黒区', en: 'Meguro City', wname: 'めぐろ くらしの相談窓口', wnameEn: 'Meguro Life Consultation Desk',
      phone: '03-5722-9370', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.meguro.tokyo.jp/fukushisougou/kenkoufukushi/seikatsushien/kikitorikun.html', org: '目黒区',
      noReserve: true,
      locs: [loc('めぐろ くらしの相談窓口（目黒区総合庁舎 本館 2階）', '13110', '東京都目黒区上目黒2-19-15', 35.640465, 139.6987, '03-5722-9370', WD + ' 8:30–17:00', '予約なしでOK')] }),

    jiritsu({ code: '13111', slug: 'ota', city: '大田区', en: 'Ota City', wname: '生活再建・就労サポートセンター JOBOTA（ジョボタ）', wnameEn: 'JOBOTA Life Rebuilding & Work Support Center',
      phone: '03-6423-0251', hoursJa: '月〜土 10時〜18時（祝日・年末年始は休み）', hoursEn: 'Mon–Sat 10:00–18:00',
      url: 'https://www.city.ota.tokyo.jp/seikatsu/fukushi/seikatsukonkyusya/seikatsu.html', org: '大田区',
      note: '土曜日も開いています。',
      locs: [loc('JOBOTA（柳原大森ビル 6階）', '13111', '東京都大田区大森北1-11-1', 35.587132, 139.728271, '03-6423-0251', '月〜土 10:00–18:00', '土曜も相談できます')] }),

    jiritsu({ code: '13112', slug: 'setagaya', city: '世田谷区', en: 'Setagaya City', wname: 'ぷらっとホーム世田谷', wnameEn: 'Platform Setagaya (life support center)',
      phone: '03-5431-5355', hoursJa: '平日 9時〜17時', hoursEn: 'Weekdays 9:00–17:00',
      url: 'https://www.city.setagaya.lg.jp/02412/2969.html', org: '世田谷区',
      note: '2025年3月31日に三軒茶屋分庁舎へ引っこしました。行くときは前もって予約してください。',
      hogoNote: false,
      locs: [loc('ぷらっとホーム世田谷（世田谷区役所 三軒茶屋分庁舎 5階）', '13112', '東京都世田谷区太子堂2-16-7', 35.644386, 139.670822, '03-5431-5355', WD + ' 9:00–17:00', '要予約')] }),

    jiritsu({ code: '13113', slug: 'shibuya', city: '渋谷区', en: 'Shibuya City', wname: '生活支援相談窓口', wnameEn: 'Life support consultation desk',
      phone: '03-3463-2116', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.shibuya.tokyo.jp/kenko/seikatsu-fukushi/kurashi-sodan/kurashinosoudan.html', org: '渋谷区',
      hogoNote: false, sources2: [TOKYO_LIST],
      locs: [loc('渋谷区 生活支援相談窓口（渋谷区役所）', '13113', '東京都渋谷区宇田川町1-1', 35.663475, 139.697189, '03-3463-2116', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13114', slug: 'nakano', city: '中野区', en: 'Nakano City', wname: '中野くらしサポート', wnameEn: 'Nakano Life Support',
      phone: '03-3228-8950', hoursJa: '平日 8時30分〜17時（受付は16時30分まで）', hoursEn: 'Weekdays 8:30–17:00 (last entry 16:30)',
      url: 'https://www.city.tokyo-nakano.lg.jp/kenko_hukushi/hogo/nakanokurashisupport.html', org: '中野区',
      note: '電話かインターネットで予約してから行きましょう。',
      hogoNote: false,
      locs: [loc('中野くらしサポート（中野区役所 4階）', '13114', '東京都中野区中野4-11-19', 35.709118, 139.662613, '03-3228-8950', WD + ' 8:30–17:00（受付 16:30 まで）', '要予約')] }),

    jiritsu({ code: '13115', slug: 'suginami', city: '杉並区', en: 'Suginami City', wname: 'くらしのサポートステーション', wnameEn: 'Life Support Station',
      phone: '03-3391-1751', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.suginami.tokyo.jp/guide/shien/shien/1021717.html', org: '杉並区',
      hogoNote: false,
      locs: [loc('くらしのサポートステーション（ウェルファーム杉並 複合施設棟 1階）', '13115', '東京都杉並区天沼3-19-16', 35.710388, 139.620667, '03-3391-1751', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13116', slug: 'toshima', city: '豊島区', en: 'Toshima City', wname: 'くらし・しごと相談支援センター', wnameEn: 'Life & Work Consultation Center',
      phone: '03-4566-2454', hoursJa: '平日 9時〜16時', hoursEn: 'Weekdays 9:00–16:00',
      url: 'https://www.city.toshima.lg.jp/164/kenko/sekatsu/032834.html', org: '豊島区',
      note: '急ぎのとき以外は予約制です。電話での相談もできます。',
      hogoNote: false,
      locs: [loc('くらし・しごと相談支援センター（豊島区役所 本庁舎 4階西 2番）', '13116', '東京都豊島区南池袋2-45-1', 35.725372, 139.717087, '03-4566-2454', WD + ' 9:00–16:00', '原則予約制')] }),

    jiritsu({ code: '13117', slug: 'kita', city: '北区', en: 'Kita City', wname: '北区くらしとしごと相談センター', wnameEn: 'Kita Life & Work Consultation Center',
      phone: '03-6454-3104', hoursJa: '平日 8時30分〜17時15分（予約優先）', hoursEn: 'Weekdays 8:30–17:15 (appointments first)',
      url: 'https://www.city.kita.lg.jp/living/counseling/1002161.html', org: '北区',
      hogoNote: false,
      locs: [loc('北区くらしとしごと相談センター（岸町ふれあい館 1階）', '13117', '東京都北区岸町1-6-17', 35.755028, 139.734924, '03-6454-3104', WD + ' 8:30–17:15', '予約優先')] }),

    jiritsu({ code: '13118', slug: 'arakawa', city: '荒川区', en: 'Arakawa City', wname: '仕事・生活サポートデスク', wnameEn: 'Work & Life Support Desk',
      phone: '03-3802-3094', hoursJa: null,
      url: 'https://www.city.arakawa.tokyo.jp/a027/seikatsu/seikatsushien/280415shigotoseikatu.html', org: '荒川区（福祉推進課）',
      note: '受付の時間は、電話で確認してください。',
      hogoNote: false,
      locs: [loc('荒川区 仕事・生活サポートデスク（荒川区役所 本庁舎 1階）', '13118', '東京都荒川区荒川2-2-3', 35.73513, 139.783615, '03-3802-3094', null, '時間は電話で確認')] }),

    jiritsu({ code: '13119', slug: 'itabashi', city: '板橋区', en: 'Itabashi City', wname: 'いたばし暮らしのサポートセンター', wnameEn: 'Itabashi Life Support Center',
      phone: '03-6912-4591', hoursJa: '本部: 平日 9時〜19時、毎月第2日曜 9時〜17時／分室: 平日 9時〜17時', hoursEn: 'HQ: weekdays 9–19 and 2nd Sunday 9–17; branches weekdays 9–17',
      url: 'https://www.city.itabashi.tokyo.jp/kenko/fukushi/soudan/1003795.html', org: '板橋区',
      note: '行く前に電話で面談の予約をしてください。本部は夜7時まで、毎月第2日曜日も開いています。',
      hogoNote: false,
      whereJa: '板橋本部（グリーンホール 4階）・赤塚分室・志村分室',
      locs: [
        loc('いたばし暮らしのサポートセンター 板橋本部（グリーンホール 4階）', '13119', '東京都板橋区栄町36-1', 35.750931, 139.705063, '03-6912-4591', WD + ' 9:00–19:00／第2日曜 9:00–17:00', '施設点検日は 17:00 まで'),
        loc('いたばし暮らしのサポートセンター 赤塚分室（赤塚福祉課内）', '13119', '東京都板橋区赤塚6-38-1', 35.778679, 139.645477, '03-6904-1332', WD + ' 9:00–17:00', ''),
        loc('いたばし暮らしのサポートセンター 志村分室（志村福祉課内）', '13119', '東京都板橋区蓮根2-28-1', 35.784122, 139.675156, '03-5948-7088', WD + ' 9:00–17:00', '')
      ] }),

    jiritsu({ code: '13120', slug: 'nerima', city: '練馬区', en: 'Nerima City', wname: '生活サポートセンター', wnameEn: 'Life Support Center',
      phone: '03-3993-9963', hoursJa: '平日 8時30分〜17時15分', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.nerima.tokyo.jp/kurashi/jinken/komatta/supportcenter.html', org: '練馬区',
      note: 'Zoom（オンライン）での相談もできます（予約制）。',
      locs: [loc('練馬区 生活サポートセンター（練馬区役所 西庁舎 3階）', '13120', '東京都練馬区豊玉北6-12-1', 35.73571, 139.651672, '03-3993-9963', WD + ' 8:30–17:15', '')] }),

    jiritsu({ code: '13121', slug: 'adachi', city: '足立区', en: 'Adachi City', wname: '福祉まるごと相談課（くらしとしごとの相談）', wnameEn: 'All-in-one Welfare Consultation',
      phone: '03-3880-5705', hoursJa: null,
      url: 'https://www.city.adachi.tokyo.jp/seikatsu-shien/gaiyou.html', org: '足立区（福祉まるごと相談課）',
      note: 'だれでも、どんなことでも相談できる窓口です。平日に来られない人のために休日に開く日もあります。時間は電話で確認してください。',
      hogoNote: false,
      whereJa: '東部拠点（足立区役所 本庁舎別館 1階）または 西部拠点（すこやかプラザあだち 3階）',
      locs: [
        loc('福祉まるごと相談課 東部拠点（足立区役所 本庁舎別館 1階）', '13121', '東京都足立区梅島2-2-2', 35.775513, 139.802856, '03-3880-5705', null, '予約すると個室で相談できます'),
        loc('福祉まるごと相談課 西部拠点（すこやかプラザあだち 3階）', '13121', '東京都足立区江北5-14-5', 35.776733, 139.76535, '03-5888-4571', null, '予約すると個室で相談できます')
      ] }),

    jiritsu({ code: '13122', slug: 'katsushika', city: '葛飾区', en: 'Katsushika City', wname: '自立相談支援窓口', wnameEn: 'Self-reliance support desk',
      phone: '03-5654-8625', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.katsushika.lg.jp/kurashi/1000061/1003796/1003862.html', org: '葛飾区',
      hogoNote: false,
      locs: [loc('葛飾区 自立相談支援窓口（葛飾区役所 3階 312番窓口）', '13122', '東京都葛飾区立石5-13-1', 35.743164, 139.84729, '03-5654-8625', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13123', slug: 'edogawa', city: '江戸川区', en: 'Edogawa City', wname: 'くらしごと相談室', wnameEn: 'Life & Work Consultation Rooms',
      phone: '03-5662-0085', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.edogawa.tokyo.jp/e043/kenko/fukushikaigo/sekatsuhogo/konkyu_sodan/index.html', org: '江戸川区',
      note: '住んでいる地域で担当の相談室（中央・小岩・葛西）が分かれます。1回の相談は30分〜1時間くらいかかります。',
      hogoNote: false,
      whereJa: 'くらしごと相談室 中央・小岩・葛西（住む地域で担当が決まります）',
      locs: [
        loc('くらしごと相談室 中央', '13123', '東京都江戸川区中央1-3-17', 35.705959, 139.868835, '03-5662-0085', WD + ' 8:30–17:00', '区民課・小松川事務所・東部/鹿骨事務所の一部の地域'),
        loc('くらしごと相談室 小岩', '13123', '東京都江戸川区東小岩6-9-14', 35.733685, 139.888214, '03-5876-7730', WD + ' 8:30–17:00', '小岩事務所・東部/鹿骨事務所の一部の地域'),
        loc('くらしごと相談室 葛西', '13123', '東京都江戸川区東葛西7-12-6', 35.658928, 139.875916, '03-5659-6626', WD + ' 8:30–17:00', '葛西事務所・区民課の一部の地域')
      ] }),

    /* ---- 多摩の市 ---- */
    jiritsu({ code: '13201', slug: 'hachioji', city: '八王子市', en: 'Hachioji City', wname: '生活にお困りの方の自立相談（生活支援課）', wnameEn: 'Self-reliance consultation',
      phone: '042-620-7462', hoursJa: '平日 8時30分〜11時・13時〜16時（予約が必要）', hoursEn: 'Weekdays 8:30–11:00, 13:00–16:00 (appointment needed)',
      url: 'https://www.city.hachioji.tokyo.jp/kurashi/welfare/007/001/p020335.html', org: '八王子市',
      note: '相談は予約が必要です。八王子駅南口総合事務所での出張相談もあります（予約制）。',
      locs: [loc('八王子市役所（生活支援課 自立担当）', '13201', '東京都八王子市元本郷町3-24-1', 35.666496, 139.316162, '042-620-7462', WD + ' 8:30–11:00／13:00–16:00', '要予約')] }),

    jiritsu({ code: '13202', slug: 'tachikawa', city: '立川市', en: 'Tachikawa City', wname: 'くらし・しごとサポートセンター', wnameEn: 'Life & Work Support Center',
      phone: '042-503-4308', hoursJa: '平日 8時30分〜17時15分', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.tachikawa.lg.jp/kenko/seikatsu/1003361/1022107.html', org: '立川市',
      hogoNote: false,
      locs: [loc('立川市くらし・しごとサポートセンター（総合福祉センター内）', '13202', '東京都立川市富士見町2-36-47', 35.70158, 139.402008, '042-503-4308', WD + ' 8:30–17:15', '')] }),

    jiritsu({ code: '13203', slug: 'musashino', city: '武蔵野市', en: 'Musashino City', wname: '自立相談支援（生活福祉課 生活相談係）', wnameEn: 'Self-reliance consultation',
      phone: '0422-60-1254', hoursJa: '平日 8時30分〜17時（東京都の一覧より）', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.musashino.lg.jp/kenko_fukushi/seikatsu_fukushi/1044335/1006644.html', org: '武蔵野市',
      note: '電話での相談や、家に来てもらう相談もできます。',
      sources2: [TOKYO_LIST],
      locs: [loc('武蔵野市役所（生活福祉課）', '13203', '東京都武蔵野市緑町2-2-28', 35.717499, 139.566452, '0422-60-1254', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13204', slug: 'mitaka', city: '三鷹市', en: 'Mitaka City', wname: '三鷹市生活・就労支援窓口', wnameEn: 'Life & Employment Support Desk',
      phone: '0422-24-6083', hoursJa: '平日 9時〜17時（12時〜13時をのぞく。東京都の一覧より）', hoursEn: 'Weekdays 9:00–17:00 (closed 12–13)',
      url: 'https://www.city.mitaka.lg.jp/c_service/051/051206.html', org: '三鷹市',
      note: '予約した人から先に案内されるので、電話で予約しましょう。場所は予約のときに確認してください。',
      sources2: [TOKYO_LIST],
      locs: [loc('三鷹市生活・就労支援窓口（三鷹市役所）', '13204', '東京都三鷹市野崎1-1-1', 35.683262, 139.559418, '0422-24-6083', WD + ' 9:00–17:00（12:00–13:00 をのぞく）', '予約優先')] }),

    jiritsu({ code: '13205', slug: 'ome', city: '青梅市', en: 'Ome City', wname: '生活自立支援窓口', wnameEn: 'Self-reliance support desk',
      phone: '0428-23-5888', hoursJa: '平日 9時〜12時・13時〜17時', hoursEn: 'Weekdays 9:00–12:00, 13:00–17:00',
      url: 'https://www.city.ome.tokyo.jp/soshiki/27/66583.html', org: '青梅市',
      note: '電話が苦手な人は、市のWEB相談フォームでも相談できます。',
      hogoNote: false,
      locs: [loc('青梅市役所 1階 16番（生活自立支援窓口）', '13205', '東京都青梅市東青梅1-11-1', 35.788086, 139.275269, '0428-23-5888', WD + ' 9:00–12:00／13:00–17:00', '')] }),

    jiritsu({ code: '13206', slug: 'fuchu', city: '府中市', en: 'Fuchu City', wname: 'くらしと仕事の相談', wnameEn: 'Life & work consultation',
      phone: '042-335-4191', hoursJa: null,
      url: 'https://www.city.fuchu.tokyo.jp/kenko/fukushi/okomari/kurashitoshigoto.html', org: '府中市（生活福祉課 自立生活支援担当）',
      note: '予約するとスムーズです。LINEでも相談の予約ができます。受付の時間は電話で確認してください。',
      hogoNote: false,
      locs: [loc('府中市役所 おもや 2階（生活福祉課 自立生活支援担当）', '13206', '東京都府中市宮西町2-24', 35.668858, 139.477768, '042-335-4191', null, '時間は電話で確認')] }),

    jiritsu({ code: '13207', slug: 'akishima', city: '昭島市', en: 'Akishima City', wname: 'くらし・しごとサポートセンター', wnameEn: 'Life & Work Support Center',
      phone: '042-519-2033', hoursJa: '平日 8時30分〜17時15分', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.akishima.lg.jp/kurashi/sodan/1011282/1002839.html', org: '昭島市',
      hogoNote: false,
      locs: [loc('昭島市くらし・しごとサポートセンター（TE昭島ビル 201A）', '13207', '東京都昭島市昭和町2-1-6', 35.712769, 139.36264, '042-519-2033', WD + ' 8:30–17:15', '昭島駅南口の立体自転車駐車場の西どなり')] }),

    jiritsu({ code: '13208', slug: 'chofu', city: '調布市', en: 'Chofu City', wname: '調布ライフサポート', wnameEn: 'Chofu Life Support',
      phone: '042-481-7693', hoursJa: '平日 9時〜17時', hoursEn: 'Weekdays 9:00–17:00',
      url: 'https://www.city.chofu.lg.jp/060020/p032007.html', org: '調布市',
      note: '相談したいときは、前もって電話で連絡してください。本人が行けないときは、家族などが代わりに行くこともできます。',
      sources2: [TOKYO_LIST],
      locs: [loc('調布ライフサポート（調布市社会福祉協議会内）', '13208', '東京都調布市小島町2-47-1', 35.651272, 139.542633, '042-481-7693', WD + ' 9:00–17:00', '住所は東京都の一覧より')] }),

    jiritsu({ code: '13209', slug: 'machida', city: '町田市', en: 'Machida City', wname: '生活・就労相談窓口（自立相談支援）', wnameEn: 'Life & employment consultation',
      phone: '042-724-4013', hoursJa: '平日 8時30分〜17時（東京都の一覧より）', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.machida.tokyo.jp/kurashi/kurashisoudan/engo/konkyujiritu.html', org: '町田市（生活援護課）',
      sources2: [TOKYO_LIST],
      locs: [loc('町田市役所（生活援護課 生活・就労相談）', '13209', '東京都町田市森野2-2-22', 35.547039, 139.438141, '042-724-4013', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13210', slug: 'koganei', city: '小金井市', en: 'Koganei City', wname: '福祉総合相談窓口（自立相談サポートセンター）', wnameEn: 'Welfare one-stop desk',
      phone: '042-386-0295', hoursJa: '平日 8時30分〜17時／毎月第4日曜 9時〜13時（予約）', hoursEn: 'Weekdays 8:30–17:00; 4th Sunday 9–13 (booking)',
      url: 'https://www.city.koganei.lg.jp/kenkofukuhsi/444/supportcenter.html', org: '小金井市',
      note: 'まず電話などで予約しましょう。電話がむずかしい人はメールやFAXでも予約できます。月に1回、日曜日にも開いています。',
      hogoNote: false,
      locs: [loc('小金井市 福祉総合相談窓口（小金井市社会福祉協議会内）', '13210', '東京都小金井市本町5-36-17', 35.70546, 139.503891, '042-386-0295', WD + ' 8:30–17:00／第4日曜 9:00–13:00', '要予約')] }),

    jiritsu({ code: '13211', slug: 'kodaira', city: '小平市', en: 'Kodaira City', wname: 'こだいら生活相談支援センター', wnameEn: 'Kodaira Life Consultation Support Center',
      phone: '042-349-0151', hoursJa: '平日 9時〜17時（東京都の一覧より）', hoursEn: 'Weekdays 9:00–17:00',
      url: TOKYO_LIST.url, web: null, org: '東京都福祉局（自立相談支援機関問合せ先一覧）',
      note: '小平市のホームページは2026年10月16日時点でシステム障害のため見られませんでした。行く前に電話で確認してください。',
      hogoNote: false,
      supNote: '市HP（kurashi/046/046174.html）がシステム障害で閲覧不可のため、東京都オープンデータで確認。復旧後に再確認すること。',
      locs: [loc('こだいら生活相談支援センター（福祉会館 4階）', '13211', '東京都小平市学園東町1-19-13', 35.727318, 139.478058, '042-349-0151', WD + ' 9:00–17:00', '住所・時間は東京都の一覧より')] }),

    jiritsu({ code: '13212', slug: 'hino', city: '日野市', en: 'Hino City', wname: 'くらしの自立相談支援窓口 みらいと', wnameEn: 'Miraito self-reliance support desks',
      phone: '042-514-8574', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.hino.lg.jp/fukushi/fukushi/1003811.html', org: '日野市',
      note: '市内に3か所あります。「みらいと高幡」は、だれでも無料で使える居場所にもなっています（平日9時〜16時、予約なし）。',
      hogoNote: false,
      whereJa: '日野市役所 2階（セーフティネットコールセンター）・多摩平・高幡',
      locs: [
        loc('みらいと（日野市役所 2階 セーフティネットコールセンター）', '13212', '東京都日野市神明1-12-1', 35.670986, 139.395279, '042-514-8574', WD + ' 8:30–17:00', ''),
        loc('みらいと サテライトセンター多摩平', '13212', '東京都日野市多摩平3-5-21', 35.665745, 139.376648, '042-514-9855', WD + ' 8:30–17:00', '要予約'),
        loc('みらいと サテライトセンター高幡（みらいと高幡）', '13212', '東京都日野市高幡651-5 高幡マンション第2', null, null, '042-506-7221', '居場所: ' + WD + ' 9:00–16:00', '居場所としても使えます（予約なし）。地図の位置は未確認')
      ] }),

    jiritsu({ code: '13213', slug: 'higashimurayama', city: '東村山市', en: 'Higashimurayama City', wname: 'くらし・しごとサポートセンター「ほっとシティ東村山」', wnameEn: '"Hot City" Life & Work Support Center',
      phone: '042-306-3427', hoursJa: '平日 8時30分〜17時15分', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.higashimurayama.tokyo.jp/kenko/komatta/kurashi-shigoto.html', org: '東村山市',
      note: 'まず電話で予約しましょう。電話での相談もできます。',
      hogoNote: false,
      locs: [loc('ほっとシティ東村山（S&D市民センター 1階）', '13213', '東京都東村山市本町1-1-1', 35.755348, 139.46788, '042-306-3427', WD + ' 8:30–17:15', '予約優先')] }),

    jiritsu({ code: '13214', slug: 'kokubunji', city: '国分寺市', en: 'Kokubunji City', wname: '自立生活サポートセンターこくぶんじ', wnameEn: 'Independent Living Support Center Kokubunji',
      phone: '042-324-8401', hoursJa: '平日 8時30分〜17時（予約が必要）', hoursEn: 'Weekdays 8:30–17:00 (appointment needed)',
      url: 'https://www.city.kokubunji.tokyo.jp/kodomo-kyouiku/kosodate-shien/1021243/1022129.html', org: '国分寺市',
      note: '予約が必要です。はじめての相談は1時間くらいかかることがあります。',
      hogoNote: false,
      sources2: [
        { org: '国分寺市社会福祉協議会', url: 'https://www.ko-shakyo.or.jp/jiritsu-support/' },
        { org: '国分寺市（リーフレット）', url: 'https://www.city.kokubunji.tokyo.jp/_res/projects/default_project/_page_/001/002/059/2025.pdf' }
      ],
      locs: [loc('自立生活サポートセンターこくぶんじ（いずみプラザ 1階）', '13214', '東京都国分寺市泉町2-3-8', 35.696209, 139.468216, '042-324-8401', WD + ' 8:30–17:00', '要予約')] }),

    jiritsu({ code: '13215', slug: 'kunitachi', city: '国立市', en: 'Kunitachi City', wname: '福祉総合相談 ふくふく窓口', wnameEn: '"Fukufuku" welfare one-stop desk',
      phone: '042-572-2111', hoursJa: '平日 8時30分〜17時15分', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.kunitachi.tokyo.jp/soshiki/Dept03/Div01/Sec04/gyomu/0170/1464586350271.html', org: '国立市',
      note: '電話相談は名前を言わなくても大丈夫です。メールや訪問での相談もできます。',
      locs: [loc('ふくふく窓口（国立市役所 1階 1番窓口）', '13215', '東京都国立市富士見台2-47-1', 35.684376, 139.441513, '042-572-2111', WD + ' 8:30–17:15', '電話は匿名でもOK')] }),

    jiritsu({ code: '13218', slug: 'fussa', city: '福生市', en: 'Fussa City', wname: '就労と福祉の相談（社会福祉課）', wnameEn: 'Work & welfare consultation',
      phone: '042-551-1735', hoursJa: '平日 8時30分〜17時15分（12時〜13時をのぞく）', hoursEn: 'Weekdays 8:30–17:15 (closed 12–13)',
      url: 'https://www.city.fussa.tokyo.jp/life/health/welfare/1002349.html', org: '福生市',
      note: '予約した人から先に相談できます。行く前に電話してください。',
      hogoNote: false,
      locs: [loc('福生市役所 1階 10番窓口', '13218', '東京都福生市本町5', 35.738701, 139.326782, '042-551-1735', WD + ' 8:30–17:15（12:00–13:00 をのぞく）', '予約優先')] }),

    jiritsu({ code: '13219', slug: 'komae', city: '狛江市', en: 'Komae City', wname: '生活相談窓口「こまYELL（エール）」', wnameEn: '"Koma YELL" life consultation desk',
      phone: '03-3430-1111', hoursJa: '平日 8時30分〜17時（東京都の一覧より）', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.komae.tokyo.jp/index.cfm/44,78349,342,3084,html', org: '狛江市',
      note: '電話をかけたら「こまYELLにつないでください」と言ってください。WEBなら24時間いつでも相談の予約ができます。',
      sources2: [TOKYO_LIST],
      locs: [loc('こまYELL（狛江市役所）', '13219', '東京都狛江市和泉本町1-1-5', 35.634491, 139.577927, '03-3430-1111', WD + ' 8:30–17:00', '市役所の代表番号。「こまYELLに」と伝える')] }),

    jiritsu({ code: '13220', slug: 'higashiyamato', city: '東大和市', en: 'Higashiyamato City', wname: 'くらし・しごと応援センター「そえる」', wnameEn: '"Soeru" Life & Work Support Center',
      phone: '042-563-2111', hoursJa: '平日 8時30分〜17時15分', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.higashiyamato.lg.jp/kenkofukushi/chiikifukushi/1003086/1003089.html', org: '東大和市',
      note: '市役所の代表番号です。「内線1081（そえる）」と伝えてください。予約するとスムーズです。',
      hogoNote: false,
      locs: [loc('そえる（東大和市役所 本庁舎 2階 エレベーター横）', '13220', '東京都東大和市中央3-930', 35.745262, 139.426498, '042-563-2111', WD + ' 8:30–17:15', '内線1081')] }),

    jiritsu({ code: '13221', slug: 'kiyose', city: '清瀬市', en: 'Kiyose City', wname: 'きよせ生活相談支援センター「いっぽ」', wnameEn: '"Ippo" life consultation center',
      phone: '042-495-5567', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.kiyose.lg.jp/kenkouiryouhukusi/seikatusiensyakaihukusi/seikatuniokomarinotoki/1004287.html', org: '清瀬市',
      note: '混んでいることがあるので、行く前に電話で予約してください。',
      hogoNote: false,
      locs: [loc('いっぽ（清瀬市元町1-11-21 1階北側）', '13221', '東京都清瀬市元町1-11-21', 35.773136, 139.51799, '042-495-5567', WD + ' 8:30–17:00', '要予約')] }),

    jiritsu({ code: '13222', slug: 'higashikurume', city: '東久留米市', en: 'Higashikurume City', wname: '自立相談支援（福祉総務課 相談支援係）', wnameEn: 'Self-reliance consultation',
      phone: '042-470-7749', hoursJa: '平日 9時〜16時（12時〜13時をのぞく）', hoursEn: 'Weekdays 9:00–16:00 (closed 12–13)',
      url: 'https://www.city.higashikurume.lg.jp/kurashi/fukushi/enjo/1004453.html', org: '東久留米市',
      note: '混んでいるので、行く前に電話で予約してください。',
      hogoNote: false,
      locs: [loc('東久留米市役所 2階（福祉総務課 相談支援係）', '13222', '東京都東久留米市本町3-3-1', 35.758629, 139.529709, '042-470-7749', WD + ' 9:00–16:00（12:00–13:00 をのぞく）', '要予約')] }),

    jiritsu({ code: '13223', slug: 'musashimurayama', city: '武蔵村山市', en: 'Musashimurayama City', wname: '市民なやみごと相談窓口', wnameEn: 'Residents\' worries consultation desk',
      phone: '042-565-1111', hoursJa: '平日 8時30分〜12時・13時〜17時15分（受付は16時30分まで）', hoursEn: 'Weekdays 8:30–12:00, 13:00–17:15 (last entry 16:30)',
      url: 'https://www.city.musashimurayama.lg.jp/kurashi/seikatsu/1012250/1005467/', org: '武蔵村山市',
      note: '市役所の代表番号です。「なやみごと相談（内線155・156）」と伝えてください。行けないときは、まず電話で相談できます。',
      hogoNote: false,
      locs: [loc('武蔵村山市役所 1階（市民なやみごと相談窓口）', '13223', '東京都武蔵村山市本町1-1-1', 35.754745, 139.38736, '042-565-1111', WD + ' 8:30–12:00／13:00–17:15', '内線155・156')] }),

    jiritsu({ code: '13224', slug: 'tama', city: '多摩市', en: 'Tama City', wname: 'しごと・くらしサポートステーション', wnameEn: 'Work & Life Support Station',
      phone: '042-338-6942', hoursJa: '月〜金 9時〜18時／土 9時〜17時（予約制）', hoursEn: 'Mon–Fri 9–18, Sat 9–17 (booking)',
      url: 'https://www.city.tama.lg.jp/kenkofukushi/1008237/shien/seikatsu/1002713.html', org: '多摩市',
      note: '予約制です。同じフロアに、引っこし先さがしを手伝う「居住支援相談窓口」（042-401-8640）もあります。',
      hogoNote: false,
      locs: [loc('しごと・くらしサポートステーション（ベルブ永山 2階）', '13224', '東京都多摩市永山1-5', 35.628471, 139.448685, '042-338-6942', '月〜金 9:00–18:00／土 9:00–17:00', '土曜も相談できます（予約制）')] }),

    jiritsu({ code: '13225', slug: 'inagi', city: '稲城市', en: 'Inagi City', wname: '福祉くらしの総合窓口', wnameEn: 'Welfare & life one-stop desk',
      phone: '042-378-2111', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.inagi.tokyo.jp/kenko/seikatsuhukushi/1003568.html', org: '稲城市',
      note: '行く前に電話で連絡してください。',
      hogoNote: false,
      locs: [loc('稲城市役所 2階（福祉くらしの総合窓口）', '13225', '東京都稲城市東長沼2111', 35.638123, 139.504288, '042-378-2111', WD + ' 8:30–17:00', '')] }),

    jiritsu({ code: '13227', slug: 'hamura', city: '羽村市', en: 'Hamura City', wname: '生活困窮者の相談窓口（社会福祉課）', wnameEn: 'Life consultation desk',
      phone: '042-555-1111', hoursJa: '平日 8時30分〜12時・13時〜17時', hoursEn: 'Weekdays 8:30–12:00, 13:00–17:00',
      url: 'https://www.city.hamura.tokyo.jp/0000007636.html', org: '羽村市',
      note: '市役所の代表番号です。「内線107」と伝えてください。電話がむずかしいときは、直接窓口に来てもOKです。',
      sources2: [TOKYO_LIST],
      locs: [loc('羽村市役所（社会福祉課）', '13227', '東京都羽村市緑ヶ丘5-2-1', 35.767506, 139.310928, '042-555-1111', WD + ' 8:30–12:00／13:00–17:00', '内線107')] }),

    jiritsu({ code: '13228', slug: 'akiruno', city: 'あきる野市', en: 'Akiruno City', wname: '生活・就労相談窓口', wnameEn: 'Life & employment consultation desk',
      phone: '042-558-1927', hoursJa: '平日 8時30分〜17時15分（東京都の一覧より）', hoursEn: 'Weekdays 8:30–17:15',
      url: 'https://www.city.akiruno.tokyo.jp/0000006199.html', org: 'あきる野市（生活福祉課）',
      hogoNote: false, sources2: [TOKYO_LIST],
      locs: [loc('あきる野市役所（生活福祉課 生活・就労相談窓口）', '13228', '東京都あきる野市二宮350', 35.729115, 139.29451, '042-558-1927', WD + ' 8:30–17:15', '')] }),

    jiritsu({ code: '13229', slug: 'nishitokyo', city: '西東京市', en: 'Nishitokyo City', wname: '生活サポート相談窓口', wnameEn: 'Life Support Consultation Desk',
      phone: '042-420-2809', hoursJa: '平日 8時30分〜17時', hoursEn: 'Weekdays 8:30–17:00',
      url: 'https://www.city.nishitokyo.lg.jp/kenko_hukusi/seikatuenzyo/seikatsusoudann.html', org: '西東京市',
      note: '田無庁舎と保谷庁舎の2か所にあります。',
      sources2: [TOKYO_LIST],
      whereJa: '田無庁舎 1階 または 保谷庁舎 1階',
      locs: [
        loc('生活サポート相談窓口（田無庁舎 1階）', '13229', '東京都西東京市南町5-6-13', 35.726341, 139.53801, '042-420-2809', WD + ' 8:30–17:00', ''),
        loc('生活サポート相談窓口（保谷庁舎 1階）', '13229', '東京都西東京市中町1-5-1', 35.741821, 139.557983, '042-438-4023', WD + ' 8:30–17:00', '住所は東京都の一覧より')
      ] }),

    /* ---- 西多摩の町村（町村部は東京都が実施） ---- */
    jiritsu({ code: '13303', slug: 'nishitama', city: '西多摩（瑞穂町・日の出町・檜原村・奥多摩町）', en: 'Western Tama towns & villages', wname: '西多摩くらしの相談センター', wnameEn: 'Nishitama Life Consultation Center',
      phone: '0428-25-3501', hoursJa: null,
      url: 'https://www.fukushi.metro.tokyo.lg.jp/shisetsu/jigyosyo/nishifuku/seikatukonkyu', org: '東京都 西多摩福祉事務所',
      basis: 'tokyo', areas: ['13303', '13305', '13307', '13308'],
      whoJa: '瑞穂町・日の出町・檜原村・奥多摩町に住んでいて、お金・仕事・住まいのことで困っている人。',
      note: '各町村でも午後に出張相談をしています（瑞穂町: 水・金／日の出町: 木／檜原村: 月／奥多摩町: 火）。時間は電話で確認してください。',
      hogoNote: false,
      locs: [loc('西多摩くらしの相談センター（東京都青梅合同庁舎 1階）', '13205', '東京都青梅市河辺町6-4-1', 35.780197, 139.28981, '0428-25-3501', null, '各町村で巡回相談あり')] })
  ];

  // 西多摩の id を分かりやすく
  J[J.length - 1].name = { ja: '西多摩くらしの相談センター（瑞穂町・日の出町・檜原村・奥多摩町）', en: 'Nishitama Life Consultation Center (Mizuho, Hinode, Hinohara, Okutama)' };
  J[J.length - 1].summary = {
    ja: '瑞穂町・日の出町・檜原村・奥多摩町に住む人のための、お金・仕事・住まいの無料の相談窓口です（東京都が運営）。家賃の給付金（住居確保給付金）などにもつないでくれます。',
    en: 'A free support desk (run by Tokyo) for residents of Mizuho, Hinode, Hinohara and Okutama about money, work and housing.'
  };

  /* ---- (2) 区独自のケアリーバー支援 --------------------------------------------------------- */
  var L = [
    {
      id: 'nerima-habataku',
      name: { ja: 'ねりま羽ばたく若者応援プロジェクト（練馬区）', en: 'Nerima "Habataku" Youth Support Project' },
      hook: { ja: '練馬区でひとり暮らし。家賃や光熱費がきびしい', en: 'Living alone in Nerima and rent and bills are tight' },
      summary: {
        ja: '施設や里親家庭で育った、練馬区に住む若者のための支援です。家賃や光熱水費の一部を最長5年補助してくれるほか、毎週の居場所、LINE相談、法律相談、食料の配布もあります。',
        en: 'For care-experienced young people living in Nerima: help with part of rent and utilities for up to 5 years, plus a weekly drop-in space, LINE chat, legal advice and free food.'
      },
      cat: ['housing', 'consult', 'money'],
      kind: 'grant', basis: 'local', right: false,
      amount: { ja: '家賃・光熱水費の一部（最長5年）。金額は区に確認', en: 'Part of rent & utilities for up to 5 years (ask the city for amounts)' },
      repay: 'none',
      who: { ja: '児童養護施設や里親家庭などを離れて、練馬区内に住んでいる若者。居場所は、区内に住む29歳までの人が使えます。' },
      how: { ja: 'まず「子ども家庭支援センター 若者支援係」に電話して、使いたいと伝えます。居場所（毎週金曜）は申しこみなしで行けます。' },
      where: { ja: '練馬区 子ども家庭支援センター 若者支援係' },
      docs: ['本人確認ができるもの（居場所の登録に必要。ないときは相談してください）'],
      ask: ['家賃等補助金の対象になるか知りたいです。何がいりますか？', '補助はいくらぐらい、いつからもらえますか？', '急にお金がなくなったとき、一時的に住める場所はありますか？'],
      caution: { ja: '補助の金額や細かい条件はページにのっていません。電話で確認しましょう。練馬区に住んでいることが条件です。' },
      supporter: { ja: '令和7年度開始の都児相連携型の社会的養護自立支援事業（都内初）。家賃等補助（退所後最長5年）、一時居所支援（家具付きアパート）、居場所（春日町青少年館 金17:00–20:30、民間カフェ 第3土・要申込）、食料配布、LINE相談、弁護士相談。' },
      effort: 'mid',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: true, age: { min: 15, max: 29 }, areas: ['13120'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-3993-1051', phoneLabel: '練馬区 子ども家庭支援センター 若者支援係', line: null, chat: null,
        web: 'https://www.city.nerima.tokyo.jp/kosodatekyoiku/kodomo/sodan/kodomokateicenter/habataku.html',
        hours: { ja: '平日 8時30分〜17時15分', en: 'Weekdays 8:30–17:15' }
      },
      locations: [
        loc('居場所（春日町青少年館 3階・ねりま若者サポートステーション内）', '13120', '東京都練馬区春日町4-16-9', 35.752403, 139.639008, '03-5848-8341', '金 17:00–20:30（居場所）', '申しこみ不要。都営大江戸線 練馬春日町駅A2から歩いて3分')
      ],
      source: { org: '練馬区', url: 'https://www.city.nerima.tokyo.jp/kosodatekyoiku/kodomo/sodan/kodomokateicenter/habataku.html', checked: C },
      sources2: [{ org: '練馬区（チラシ）', url: 'https://www.city.nerima.tokyo.jp/kosodatekyoiku/kodomo/sodan/kodomokateicenter/habataku.files/tirashi-saisyuseiban.pdf' }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'setagaya-fairstart',
      name: { ja: 'せ\u2060た\u2060が\u2060や若者フェアスタート（奨学金・家賃・資格・医療費）', en: 'Setagaya Youth Fair Start (scholarship, rent, licenses, medical)' },
      hook: { ja: '学費、家賃、免許代、病院代…ひとりで全部はむり', en: 'Tuition, rent, a license, doctor bills — I can\'t cover it all alone' },
      summary: {
        ja: '世田谷区の施設や世田谷区の児童相談所から巣立った若者に、返さなくていいお金を出す制度です。大学などの学費、家賃、運転免許などの資格、病院代を支援します。',
        en: 'Setagaya gives non-repayable support to young people who left care through Setagaya: tuition, rent, licenses/qualifications and medical costs.'
      },
      cat: ['money', 'education', 'housing'],
      kind: 'grant', basis: 'local', right: false,
      amount: {
        ja: '学費 上限50万円＋教材費（実費）・パソコン10万円まで・通学定期／家賃 月3万円まで＋保証料2万円まで／運転免許・高卒認定 30万円まで（その他の資格 10万円まで）／病院代 年3万6千円まで',
        en: 'Tuition up to ¥500k + textbooks (actual cost), PC up to ¥100k, commuter pass; rent up to ¥30k/month + guarantee fee up to ¥20k; driving license or HS equivalency up to ¥300k (other ¥100k); medical up to ¥36k/yr'
      },
      repay: 'none',
      who: { ja: '18歳以降（または中学卒業以降）に、世田谷区内の児童養護施設・自立援助ホーム・里親家庭などを出た人、または世田谷区の児童相談所の措置が終わった人など。施設で暮らしたことがなくても、中学卒業後に世田谷区の児童相談所の一時保護や、児童相談所・子ども家庭支援センターの支援が終わった人も対象です。親や親せきから支えてもらえず、自分の収入でくらしていることが条件です。奨学金と家賃は29歳まで、資格と病院代は39歳まで。' },
      how: { ja: '申請書と、施設長などの推薦書を区に出します（オンラインか郵送）。推薦がもらえないときは、相談支援の「せたエール」が話を聞いて意見書を作ってくれます。審査のあと、本人の口座に振りこまれます。' },
      where: { ja: '世田谷区 子ども・若者部 児童相談支援課（梅丘分庁舎 2階）' },
      docs: ['申請書', '推薦書（または意見書）', '学生は在学・入学がわかる書類', '払ったことがわかる領収書・レシート'],
      ask: ['次の申請の受付はいつですか？', '推薦書を書いてくれる人がいません。どうすればいいですか？', '家賃支援と奨学金は、いっしょに申しこめますか？'],
      caution: { ja: '住んでいる場所ではなく「世田谷区の施設や児童相談所から巣立ったか」で決まります。受付は年に何回かです。令和8年度第3回の受付は 10月16日（金）まで（郵送は当日消印有効）。次の回は区に聞いてください。ほかの自治体の同じような支援を受けていると使えません。' },
      supporter: { ja: '世田谷区児童養護施設退所者等奨学・自立支援基金（寄附）が財源。令和7年度から虐待等の逆境体験があり親族の支援がない若者にも拡大。家賃は四半期ごと振込。毎年2〜3月に実績報告が必要（未提出は取消・返還の可能性）。住宅支援（借上げ区営住宅5戸）・居場所・せたエール（相談）も別にあり。' },
      effort: 'high',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: { min: 15, max: 39 }, areas: [] },
      deadline: { ja: '年に数回まとめて受付。次の回は区のページか電話で確認', en: 'Several rounds a year; check the next round', leaveMonths: null, months: null, always: false },
      contact: {
        phone: '03-6304-7740', phoneLabel: '世田谷区 児童相談支援課', line: null, chat: null,
        web: 'https://www.city.setagaya.lg.jp/03648/24424.html', hours: null
      },
      locations: [
        loc('世田谷区 児童相談支援課（梅丘分庁舎 2階）', '13112', '東京都世田谷区松原6-3-5', 35.656872, 139.653656, '03-6304-7740', null, '申請は郵送かオンライン')
      ],
      source: { org: '世田谷区', url: 'https://www.city.setagaya.lg.jp/03648/24424.html', checked: C },
      sources2: [{ org: '世田谷区（せたがや若者フェアスタート 概要）', url: 'https://www.city.setagaya.lg.jp/03648/2112.html' }],
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'minato-jiritsu-shien',
      name: { ja: '港区 社会的養護児童自立支援事業（家賃・支度金・資格）', en: 'Minato support for young people leaving care (rent, start-up, licenses)' },
      hook: { ja: 'ひとり暮らしの最初のお金と、毎月の家賃が心配', en: 'Worried about start-up costs and monthly rent' },
      summary: {
        ja: '港区が措置した施設や、港区の里親家庭から自立する人に、家賃の半分（月3万6千円まで）を最長6年、支度金20万円まで、資格を取るお金20万円までを助成します。',
        en: 'For people leaving care placed by Minato: half of rent (up to ¥36,000/month) for up to 6 years, a start-up grant up to ¥200,000 and license costs up to ¥200,000.'
      },
      cat: ['housing', 'money', 'work'],
      kind: 'grant', basis: 'local', right: false,
      amount: { ja: '家賃の1/2（月3万6千円まで・最長6年）／支度金 20万円まで／資格取得 20万円まで', en: 'Half of rent (≤¥36k/mo, ≤6 yrs); start-up ≤¥200k; licenses ≤¥200k' },
      repay: 'none',
      who: { ja: '義務教育を終えた年齢で、港区が措置した児童養護施設などから自立する人、または港区の里親家庭などから自立する人（予定の人もふくむ）。' },
      how: { ja: 'まず港区児童相談所に電話して「自立支援事業を使いたい」と伝えます。' },
      where: { ja: '港区児童相談所 児童相談課 児童福祉係' },
      docs: [],
      ask: ['私は対象になりますか？', '支度金はいつまでに申しこめばいいですか？', '東京都の家賃の支援と、どちらを先に使うといいですか？'],
      caution: { ja: '住んでいる場所ではなく「港区が措置したか・港区の里親か」で決まります。支度金は自立してから1年以内、資格のお金は5年以内に、それぞれ1回だけ申しこめます。東京都の居住費支援を受けた期間は、6年から引かれます。東京都の居住費支援（月7万2千円まで）もあります。区に聞いてください。' },
      supporter: { ja: '東京都社会福祉協議会の貸付金（自立支援資金等）と併用可。対象（3）その他区長が必要と認めた方 の規定あり。' },
      effort: 'mid',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: '支度金は自立してから1年以内、資格のお金は5年以内', en: 'Start-up grant within 1 year of leaving care; license grant within 5 years', leaveMonths: 0, months: null, always: false },
      contact: {
        phone: '03-5962-6500', phoneLabel: '港区児童相談所', line: null, chat: null,
        web: 'https://www.city.minato.tokyo.jp/jidofukushi/syakaitekiyogo.html', hours: null
      },
      locations: [],
      source: { org: '港区', url: 'https://www.city.minato.tokyo.jp/jidofukushi/syakaitekiyogo.html', checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'suginami-jiritsu-shitakukin',
      name: { ja: '杉並区 自立支度金（児童養護施設退所者等支援）', en: 'Suginami start-up grant for care leavers' },
      hook: { ja: '引っこし代や家具・家電をそろえるお金がない', en: 'No money for moving, furniture or appliances' },
      summary: {
        ja: '杉並区内の児童養護施設・自立援助ホーム・里親家庭から自立する人に、引っこしの費用や家具・家電などのお金を20万円まで出します。',
        en: 'For people leaving a children\'s home, self-reliance home or foster family in Suginami: up to ¥200,000 for moving costs, furniture and appliances.'
      },
      cat: ['money', 'housing'],
      kind: 'grant', basis: 'local', right: false,
      amount: { ja: '20万円まで（1人1回）', en: 'Up to ¥200,000 (once)' },
      repay: 'none',
      who: { ja: '杉並区内の児童養護施設や自立援助ホームを出た人、または杉並区内の里親家庭・ファミリーホームから自立した人で、自立した日が2024年4月1日以降、その日に18歳以上の人。同じような支援を他の自治体から受けている人や、生活保護を受けている人は使えません。' },
      how: { ja: '自立する日の前後3か月のうちに申請書を区に出します。決まったら請求して振りこんでもらい、買ったあとに領収書をつけて報告します。' },
      where: { ja: '杉並区 子ども家庭部 児童相談所設置準備課（杉並区役所 分庁舎 5階）' },
      docs: ['自立支度金支給申請書', '本人確認ができるもの（学生証・合格通知・社員証・内定通知・運転免許証など）', '買い物や支払いの領収書'],
      ask: ['申請は自立する何日前から出せますか？', '敷金・礼金や家電は対象になりますか？', '先にお金をもらって、あとから領収書を出す形ですか？'],
      caution: { ja: '住んでいる場所ではなく「杉並区内の施設や里親家庭から巣立ったか」で決まります。対象は自立する日の前後3か月に払ったお金です。領収書はかならず取っておきましょう。' },
      supporter: { ja: '杉並区児童養護施設退所者等応援基金（寄附）が財源。手続きは申請→概算払請求→実績報告（最後の支払日から2週間以内）の3回。' },
      effort: 'mid',
      for: { stages: ['hs3', 'left0'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: '自立する日の前後3か月以内に申請', en: 'Apply within 3 months before/after leaving care', leaveMonths: -3, months: null, always: false },
      contact: {
        phone: '03-5307-0355', phoneLabel: '杉並区 児童相談所設置準備課', line: null, chat: null,
        web: 'https://www.city.suginami.tokyo.jp/s057/1740.html', hours: null
      },
      locations: [],
      source: { org: '杉並区', url: 'https://www.city.suginami.tokyo.jp/s057/1740.html', checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'itabashi-careleaver',
      name: { ja: '板橋区 ケアリーバー応援プロジェクト', en: 'Itabashi Care Leaver Support Project' },
      hook: { ja: '家賃・光熱費・病院代…毎月の支払いがこわい', en: 'Rent, bills, doctor visits — monthly costs scare me' },
      summary: {
        ja: '板橋区の施設や里親家庭、板橋区の措置で育った人などに、支度金20万円まで、家賃を最長6年（はじめの4年は月7万2千円まで）、医療費・光熱水費（それぞれ年6万円まで）、資格のお金を助成します。居場所とLINE相談もあります。',
        en: 'Up to ¥200k start-up, rent support for up to 6 years (≤¥72k/month for years 1–4), medical and utility costs (≤¥60k/yr each) and license costs, plus a drop-in space and LINE chat.'
      },
      cat: ['housing', 'money', 'consult'],
      kind: 'grant', basis: 'local', right: false,
      amount: {
        ja: '支度金 20万円まで／家賃 1〜4年目 月7万2千円まで・5〜6年目 月3万6千円まで（家賃の1/2）／医療費 年6万円まで／光熱水費 年6万円まで／資格 費用の1/2（年15万円まで）',
        en: 'Start-up ≤¥200k; rent ≤¥72k/mo (yrs 1–4), ≤¥36k/mo (yrs 5–6); medical ≤¥60k/yr; utilities ≤¥60k/yr; licenses half (≤¥150k/yr)'
      },
      repay: 'none',
      who: { ja: '板橋区内の児童養護施設を出た人・板橋区内の里親家庭から自立した人・板橋区が措置して区外の施設や里親家庭を出た人など。原則18歳以上で措置が終わった人。働いている・学校に通っている（またはその気持ちがある）こと、施設や相談の事業所から引き続き支援を受けられることが条件です。' },
      how: { ja: 'はじめての申請では「自立に向けた目標」を短い作文で書きます。わからないことは、委託先（一般社団法人Masterpiece）のLINEや電話で手伝ってもらえます。' },
      where: { ja: '板橋区 子ども家庭部 子ども政策課 児童養護推進係' },
      docs: ['申請書', '自立に向けた目標の作文（はじめての申請のとき）', 'レシート・領収書（支度金）'],
      ask: ['私は対象ですか？ 措置をしたのはどこの区ですか？', '家賃の補助は、いつからいつまでもらえますか？', '書類の書き方を手伝ってもらえますか？'],
      caution: { ja: '住んでいる場所ではなく「板橋区の施設・里親・措置かどうか」などで決まります（区内在住で虐待経験がある人などが対象になる場合もあります）。家賃補助は自立援助ホームや生活保護、他の自治体の同じ支援を受けていると使えないことがあります。支度金は措置解除から6年をこえると請求できません。東京都の居住費支援（月7万2千円まで）もあります。どちらが使えるか区に聞いてください。' },
      supporter: { ja: '相談支援は一般社団法人Masterpiece（info@youare-masterpiece.org／080-3353-8550・070-8438-3495）。令和8年度から区内で週3回程度の居場所（火・木・第1/3/5金 13–19時、第2/4土 12–18時、予定）。東京都自立支援強化事業・養育家庭等自立援助事業等との重複不可。' },
      effort: 'high',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: '支度金は措置解除から6年以内。家賃は最長6年', en: 'Start-up grant within 6 years of leaving care; rent up to 6 years', leaveMonths: 0, months: null, always: false },
      contact: {
        phone: '03-3579-2216', phoneLabel: '板橋区 子ども政策課 児童養護推進係', line: null, chat: null,
        web: 'https://www.city.itabashi.tokyo.jp/kosodate/teate/oyakudachi/1043855.html', hours: null
      },
      locations: [
        loc('ケアリーバー居場所・相談（一般社団法人Masterpiece 拠点）', '13119', '東京都板橋区幸町1-16 ロイヤルハイツ大山 地下1階50号室', 35.745155, 139.701584, '080-3353-8550', '火・木・第1/3/5金 13:00–19:00／第2/4土 12:00–18:00（予定）', '東武東上線 大山駅から歩いて7分。行く前に連絡を')
      ],
      source: { org: '板橋区', url: 'https://www.city.itabashi.tokyo.jp/kosodate/teate/oyakudachi/1043855.html', checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'arakawa-taishosha-shien',
      name: { ja: '荒川区 児童養護施設等退所者自立支援事業（支度金・保証料・資格）', en: 'Arakawa support for care leavers (start-up, rent guarantee fee, licenses)' },
      hook: { ja: '部屋を借りたいけど、保証人も初期費用もない', en: 'I want to rent but have no guarantor or move-in money' },
      summary: {
        ja: '荒川区の施設や里親家庭、荒川区の措置で育った人に、自立のための支度金（30万円まで）、保証会社に払う保証料、資格を取る費用を補助します。',
        en: 'For people who left care in or placed by Arakawa: a start-up grant (up to ¥300,000), rental guarantee-company fees and license costs.'
      },
      cat: ['money', 'housing', 'work'],
      kind: 'grant', basis: 'local', right: false,
      amount: { ja: '支度金 30万円まで（1回）／保証料 契約時5万円まで・更新 年2万円まで／資格 年30万円まで', en: 'Start-up ≤¥300k (once); guarantee fee ≤¥50k + renewal ≤¥20k/yr; licenses ≤¥300k/yr' },
      repay: 'none',
      who: { ja: '荒川区内の施設や里親家庭を出た人、または荒川区が措置して区外の施設や里親家庭を出た人で、措置が終わったときに18歳以上の人（2023年4月1日以降に終わった人）。働いている・学校に通っている（予定やその気持ちがある）こと、親せきからお金の援助を受けられず自分の収入でくらしていること、施設長や里親の推薦があることが条件です。' },
      how: { ja: '申請書と、施設長や里親の推薦書を区に出します。推薦がもらえないときは、荒川区児童相談所長などが推薦します。まず出身の施設や里親、児童相談所に相談しましょう。' },
      where: { ja: '荒川区（出身の施設・里親家庭、荒川区児童相談所を通して申請）' },
      docs: ['補助金交付申請書', '推薦書（施設長・里親など）', '未成年のときは同意書'],
      ask: ['私は対象になりますか？', '保証会社の保証料も補助されますか？', '支度金で家具や家電を買ってもいいですか？'],
      caution: { ja: '住んでいる場所ではなく「荒川区の施設・里親・措置かどうか」で決まります。措置が終わってから5年以内に申請します。措置が終わったときから生活保護を受けている人は使えません。' },
      supporter: { ja: '根拠: 荒川区児童養護施設等退所者自立支援事業補助金交付要綱（例規集）。窓口課・電話番号は要綱に記載なし（児童相談所または子ども家庭部へ確認）。' },
      effort: 'high',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: '措置が終わってから5年以内に申請', en: 'Apply within 5 years of leaving care', leaveMonths: 0, months: null, always: false },
      contact: {
        phone: null, phoneLabel: null, line: null, chat: null,
        web: 'https://www.city.arakawa.tokyo.jp/reiki_int/reiki_honbun/p800RG00001526.html', hours: null
      },
      locations: [],
      source: { org: '荒川区（例規集：補助金交付要綱）', url: 'https://www.city.arakawa.tokyo.jp/reiki_int/reiki_honbun/p800RG00001526.html', checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'toshima-careleaver-money',
      name: { ja: '豊島区 自立時お祝い金・給付型奨学金', en: 'Toshima independence gift & scholarship for care leavers' },
      hook: { ja: '進学したいけど学費が払えるか不安', en: 'I want to study but worry about tuition' },
      summary: {
        ja: '豊島区の里親家庭や豊島区の児童相談所の措置で育った人に、自立するときのお祝い金10万円と、大学・専門学校の学費（年50万円まで・4年間）を出します。返さなくていいお金です。',
        en: 'For care leavers from Toshima foster families or placed by Toshima: a ¥100,000 independence gift and a scholarship for tuition (up to ¥500,000/year for 4 years). No repayment.'
      },
      cat: ['education', 'money'],
      kind: 'grant', basis: 'local', right: false,
      amount: { ja: 'お祝い金 10万円（1回）／奨学金 学費の実費・年50万円まで（4年間）', en: 'Gift ¥100,000 (once); scholarship up to ¥500,000/yr (4 yrs)' },
      repay: 'none',
      who: { ja: '中学卒業以上で、進学や就職のために、豊島区内の里親家庭・ファミリーホームの委託が終わる人、または豊島区児童相談所の措置で区外の施設・里親家庭・自立援助ホームなどを出る人。奨学金は大学・専門学校などに通う（予定の）人で、親せきからお金の援助を受けられない人。' },
      how: { ja: '申請書を出します（電子申請もできます）。施設長や里親の推薦が必要です。推薦がもらえないときは、豊島区児童相談所長が推薦します。' },
      where: { ja: '豊島区 子育て支援課 社会的養育施策調整グループ' },
      docs: ['申請書兼口座振替依頼書', '推薦理由書（施設長・里親が出す）', '実績報告書（奨学金）'],
      ask: ['お祝い金と奨学金は、いっしょに申しこめますか？', '国の給付型奨学金ももらう予定です。どう申請すればいいですか？', '申しこみのしめきりはいつですか？'],
      caution: { ja: '住んでいる場所ではなく「豊島区の里親・豊島区児童相談所の措置かどうか」で決まります。奨学金は入学金・授業料など学校に払うお金が対象で、教材費や交通費は対象外です。ほかの自治体から同じような奨学金をもらっていると使えません。' },
      supporter: { ja: 'としま子ども若者応援基金（寄附）が財源。高等教育の修学支援新制度で減免される額は差し引いて申請。JASSO給付型の生活費分は差し引き不要。' },
      effort: 'mid',
      for: { stages: ['hs3', 'left0', 'left1'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: 'お祝い金は自立のとき。奨学金は進学前から申請できます（くわしくは区の案内）', en: 'Gift at independence; scholarship can be applied for before starting school', leaveMonths: -3, months: null, always: false },
      contact: {
        phone: '03-4566-2500', phoneLabel: '豊島区 子育て支援課', line: null, chat: null,
        web: 'https://www.city.toshima.lg.jp/525/2606181526.html', hours: null
      },
      locations: [],
      source: { org: '豊島区', url: 'https://www.city.toshima.lg.jp/525/2606181526.html', checked: C },
      sources2: [{ org: '豊島区（令和8年度 事業のご案内PDF）', url: 'https://www.city.toshima.lg.jp/documents/56987/20260721150540.pdf' }],
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'toshima-b4s-port-ikebukuro',
      name: { ja: 'B4S PORT いけぶくろ（豊島区の居場所・相談）', en: 'B4S PORT Ikebukuro (Toshima drop-in & support)' },
      hook: { ja: '同じ経験をした人と、ごはんを食べて話したい', en: 'I want to eat and talk with people who\'ve been through the same' },
      summary: {
        ja: '豊島区が開く、施設や里親家庭で育った人などのための居場所です。月に1回、みんなで料理して夕ごはんを食べたり、スタッフに相談したりできます。自立の前後の相談（支援計画づくり）も受けられます。',
        en: 'A monthly drop-in space in Ikebukuro run with Toshima City for care-experienced young people: cook and eat together and talk to staff. Support planning before and after leaving care too.'
      },
      cat: ['consult'],
      kind: 'place', basis: 'local', right: false,
      amount: null, repay: null,
      who: { ja: '施設や里親家庭などで育った人、児童相談所に保護されたことがある人、親から不適切な関わりを受けている（受けた）人。' },
      how: { ja: 'LINEから前もって予約して行きます。相談支援は、ブリッジフォースマイルのページからLINEか電話で。' },
      where: { ja: 'IKEROOT（イケルート）1階（東池袋）' },
      docs: [],
      ask: ['はじめて行きたいです。予約はどうすればいいですか？', '自立したあとも相談できますか？'],
      caution: { ja: '開くのは原則 毎月第2日曜日の15時〜20時です。予約が必要です。' },
      supporter: { ja: '豊島区社会的養護自立支援拠点事業（委託: 認定NPO法人ブリッジフォースマイル）。令和8年8月開始。令和8年度開催日: 8/9, 9/13, 10/11, 11/8, 12/13, 1/10。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: '毎月第2日曜日（予約制）', en: '2nd Sunday monthly (booking)', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-4566-2500', phoneLabel: '豊島区 子育て支援課', line: null, chat: null,
        web: 'https://www.city.toshima.lg.jp/525/2606181603.html', hours: { ja: '居場所: 原則 第2日曜 15時〜20時', en: 'Drop-in: 2nd Sunday 15:00–20:00' }
      },
      locations: [
        loc('B4S PORT いけぶくろ（IKEROOT 1階）', '13116', '東京都豊島区東池袋4-42-16', 35.727962, 139.720795, null, '原則 第2日曜 15:00–20:00', 'LINEで予約')
      ],
      source: { org: '豊島区', url: 'https://www.city.toshima.lg.jp/525/2606181603.html', checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'katsushika-careleaver',
      name: { ja: '葛飾区 社会的養護経験者自立支援事業', en: 'Katsushika support for care leavers' },
      hook: { ja: '進学や就職の準備にお金がかかる', en: 'Getting ready for school or work costs money' },
      summary: {
        ja: '葛飾区の児童相談所の措置や、葛飾区内の施設・里親家庭から巣立って進学・就職する人に、準備のお金を20万円まで出します。',
        en: 'Up to ¥200,000 for school or job preparation for people leaving care placed by Katsushika or in a Katsushika facility/foster family.'
      },
      cat: ['money', 'education', 'work'],
      kind: 'grant', basis: 'local', right: false,
      amount: { ja: '20万円まで', en: 'Up to ¥200,000' },
      repay: 'none',
      who: { ja: '2025年3月1日以降に、葛飾区児童相談所の措置で施設などを出た人、または葛飾区内の児童養護施設・里親家庭を出た人で、進学か就職をする人。' },
      how: { ja: '申請書と推薦書（施設長か里親が書く）を、郵送か電子申請で出します。推薦がもらえないときは、葛飾区児童相談所長が推薦します。' },
      where: { ja: '葛飾区 児童相談課 事業係' },
      docs: ['申請書（本人）', '推薦書（施設長・里親）', '請求書', '実績報告書'],
      ask: ['私は対象になりますか？', 'どんな買い物が対象になりますか？', '申請はいつまでにすればいいですか？'],
      caution: { ja: '住んでいる場所ではなく「葛飾区の児童相談所の措置か、葛飾区内の施設・里親か」で決まります。' },
      supporter: { ja: '令和8年度版の案内PDF・様式（申請書・推薦書・請求書・実績報告書）が区ページにあり。' },
      effort: 'mid',
      for: { stages: ['hs3', 'left0'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13'] },
      deadline: { ja: '措置が終わって進学・就職するとき（くわしくは区の案内）', en: 'When leaving care for school or work', leaveMonths: -1, months: null, always: false },
      contact: {
        phone: '03-5698-0303', phoneLabel: '葛飾区 児童相談課 事業係', line: null, chat: null,
        web: 'https://www.city.katsushika.lg.jp/kosodate/1000056/1023387/1038571.html', hours: null
      },
      locations: [],
      source: { org: '葛飾区', url: 'https://www.city.katsushika.lg.jp/kosodate/1000056/1023387/1038571.html', checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'nakano-jiritsu-kyoten',
      name: { ja: '中野区 社会的養護自立支援（親を頼れない人へのサポート）', en: 'Nakano support hub for young people who can\'t rely on parents' },
      hook: { ja: '手続きや家さがし、ひとりだと不安', en: 'Paperwork and apartment hunting feel scary alone' },
      summary: {
        ja: '施設を出た人など、親を頼れない10〜20代の人を、支援コーディネーターが伴走して支えます。手続きの同行、仕事、こころ、家さがし、お金の管理まで相談できます。',
        en: 'A coordinator walks with young people (teens–20s) who can\'t rely on parents: help with paperwork, work, mental health, housing search and money management.'
      },
      cat: ['consult', 'housing', 'procedures'],
      kind: 'service', basis: 'local', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '親を頼れない、主に10代〜20代の人。中野区の児童相談所の措置で施設などを出た人、中野区内の施設を出た人、施設などを出て中野区に住んでいる人、虐待を受けたのに公的な支援につながらなかった人など。' },
      how: { ja: '電話かLINE（ブリッジフォースマイルの相談窓口）に連絡します。会って話したいときも、まず連絡しましょう。' },
      where: { ja: '中野区子ども・若者支援センター（相談はブリッジフォースマイルの窓口へ）' },
      docs: [],
      ask: ['家さがしを手伝ってもらえますか？', '役所の手続きにいっしょに行ってもらえますか？', '同じような人と知り合えるイベントはありますか？'],
      caution: { ja: '電話・LINEの受付は 月〜土の14時〜18時（木曜・祝日・年末年始は休み）です。' },
      supporter: { ja: '中野区社会的養護自立支援拠点事業（委託: 認定NPO法人ブリッジフォースマイル）。支援計画作成、生活補助支援、学び・交流支援（BBQ等）。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: true, age: { min: 15, max: 29 }, areas: ['13114'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-5937-3605', phoneLabel: 'ブリッジフォースマイル（中野区の相談窓口）', line: null, chat: null,
        web: 'https://www.city.tokyo-nakano.lg.jp/kurashi/soudan/soudan/syakaitekiyougo.html',
        hours: { ja: '月〜土 14時〜18時（木曜・祝日・年末年始は休み）', en: 'Mon–Sat 14:00–18:00 (closed Thu, holidays)' }
      },
      locations: [],
      source: { org: '中野区', url: 'https://www.city.tokyo-nakano.lg.jp/kurashi/soudan/soudan/syakaitekiyougo.html', checked: C },
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'shinagawa-jiritsu-kyoten',
      name: { ja: '品川区 社会的養護自立支援拠点事業', en: 'Shinagawa support hub for care leavers' },
      hook: { ja: '自立のこと、続けて相談できる人がほしい', en: 'I want someone I can keep talking to about living on my own' },
      summary: {
        ja: '施設を出た人など親を頼れない人のための相談です。いっしょに自立の計画をつくり、生活・進路・健康の相談にのってくれます。ひとり暮らしをイメージできる交流の場もあります。',
        en: 'Support for people who can\'t rely on parents, such as care leavers: make an independence plan together and get advice on life, career and health. Social events too.'
      },
      cat: ['consult'],
      kind: 'service', basis: 'local', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '品川区の児童相談所の措置で施設に入った（いる）人、品川区内の施設に入った（いる）人、施設などを出て品川区に住んでいる人、虐待を受けたのに公的な支援につながらなかった人など。' },
      how: { ja: 'ブリッジフォースマイルのホームページから、LINEか電話で相談します。' },
      where: { ja: '相談はブリッジフォースマイル（区の委託）へ' },
      docs: [],
      ask: ['自立の計画をいっしょに作ってもらえますか？', '進学と仕事、どちらがいいか迷っています。相談できますか？'],
      caution: { ja: '受付は 月・火・水・金・土の14時〜18時（祝日・年末年始は休み）です。' },
      supporter: { ja: '品川区社会的養護自立支援拠点事業（委託: 認定NPO法人ブリッジフォースマイル）。区の担当: 子ども育成課 社会的養育推進係 03-5742-7147。' },
      effort: 'low',
      for: { stages: ['hs12', 'hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13109'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-5742-7147', phoneLabel: '品川区 子ども育成課 社会的養育推進係', line: null, chat: null,
        web: 'https://www.city.shinagawa.tokyo.jp/PC/kodomo/kodomo-kateisoudan/202510sixyakaitekiyougoziritusien.html',
        hours: { ja: '相談: 月・火・水・金・土 14時〜18時', en: 'Consultation: Mon, Tue, Wed, Fri, Sat 14:00–18:00' }
      },
      locations: [],
      source: { org: '品川区', url: 'https://www.city.shinagawa.tokyo.jp/PC/kodomo/kodomo-kateisoudan/202510sixyakaitekiyougoziritusien.html', checked: C },
      sources2: [{ org: '認定NPO法人ブリッジフォースマイル', url: 'https://www.b4s.jp/care/' }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'edogawa-you-terrace',
      name: { ja: 'Youテラス（江戸川区 社会的養護自立支援拠点）', en: 'You Terrace (Edogawa care leaver hub)' },
      hook: { ja: '気軽に寄れて、話を聞いてもらえる場所がほしい', en: 'I want a place I can drop by and be listened to' },
      summary: {
        ja: '施設を出た人などのための、江戸川区の居場所・相談の拠点です。相談のほか、仲間との交流、心理カウンセリング、法律相談も受けられます。',
        en: 'An Edogawa hub for care leavers and others: talk to staff, meet peers, and get counseling and legal advice.'
      },
      cat: ['consult'],
      kind: 'place', basis: 'local', right: false,
      amount: null, repay: null,
      who: { ja: '施設などの措置が終わった人、児童相談所の指導を受けた人、虐待を受けたのに公的な支援につながらなかった人。主に江戸川区内と、となりの区の人。' },
      how: { ja: '開いている日に行くか、まず電話してみましょう。' },
      where: { ja: 'Youテラス（中葛西）' },
      docs: [],
      ask: ['はじめてです。どんなふうに使えますか？', '法律の相談もできますか？'],
      caution: { ja: '開いているのは 火・木 14時〜19時、土 11時〜16時 です。' },
      supporter: { ja: '江戸川区社会的養護自立支援拠点事業（補助事業者: 特定非営利活動法人ハートフル）。支援計画策定・相談・相互交流・心理療法・法律相談。施設入所者等の支援はワーカーズコープ・センター事業団に委託。' },
      effort: 'low',
      for: { stages: ['hs3', 'left0', 'left1', 'nohs'], paths: [], care: CARE, careOnly: true, age: null, areas: ['13123'] },
      deadline: { ja: 'いつでも', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '03-6661-4001', phoneLabel: 'Youテラス', line: null, chat: null,
        web: 'https://www.city.edogawa.tokyo.jp/jiso/jigyoguide/shakaitekiyougo.html',
        hours: { ja: '火・木 14時〜19時／土 11時〜16時', en: 'Tue & Thu 14:00–19:00, Sat 11:00–16:00' }
      },
      locations: [
        loc('Youテラス', '13123', '東京都江戸川区中葛西6-3-20', 35.660858, 139.865036, '03-6661-4001', '火・木 14:00–19:00／土 11:00–16:00', '')
      ],
      source: { org: '江戸川区 児童相談所', url: 'https://www.city.edogawa.tokyo.jp/jiso/jigyoguide/shakaitekiyougo.html', checked: C },
      eligibleBy: 'residence',
      verifiedBy: V
    }
  ];


  /* ---- (3) 子供家庭支援センター（62区市町村）— 中学生・高校生が「近くで話せる」公的な窓口 --------------
   * 出典: 東京都福祉局「子供家庭支援センター」一覧（令和8年8月1日現在）。世田谷区のみ区のページで地域別に補足。
   * 座標: 国土地理院 住所検索API。町・村の大字までしか一致しないもの（島しょ・稲城市など）は null。 */
  var KC_URL = 'https://www.fukushi.metro.tokyo.lg.jp/ja/kodomo/kosodate/center';
  var KC_SRC = { org: '東京都福祉局（子供家庭支援センター一覧 令和8年8月1日現在）', url: KC_URL, checked: C3 };
  var JR_ALL = ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'];   // 18歳未満の子ども向け（巣立った後の人はのぞく）
  // 一覧に「子ども専用」などと書かれている電話（中学生が直接かけやすい番号）
  var KIDLINE = {
    '13116': { phone: '0120-618-471', label: '子ども専用ダイヤル（豊島区）', hours: null },
    '13118': { phone: '0120-536-883', label: 'あらかわキッズ・ファミリーコール24', hours: null },
    '13119': { phone: '0120-925-610', label: '子どもなんでも相談（板橋区）', hours: { ja: '24時間365日', en: '24 hours, every day' } },
    '13207': { phone: '0120-678-044', label: '子ども専用ダイヤル（昭島市）', hours: null },
    '13209': { phone: '0120-552-164', label: '子ども専用相談ダイヤル（町田市）', hours: null },
    '13214': { phone: '0800-800-9033', label: '子ども専用相談電話（国分寺市）', hours: null }
  };
  var KC_EXTRA_LOCS = {
    '13206': [loc('府中市子育て世代包括支援センター「みらい」', '13206', '東京都府中市宮町一丁目41番地 フォーリス3階', 35.670776, 139.479736, '042-319-0072',
      '午前10時から午後6時（相談窓口は月〜金 8:30–18:00、来所相談は10時から）（休み: 年末年始・臨時休館日）', '')]
  };

  function kc(code, slug, city, en, cname, addr, lat, lng, phone, note, hours) {
    var kid = KIDLINE[code];
    var isCenter = /センター/.test(cname);
    var locs = addr ? [loc(cname, code, addr, lat, lng, phone, hours, note || '')] : [];
    if (KC_EXTRA_LOCS[code]) locs = locs.concat(KC_EXTRA_LOCS[code]);
    return {
      id: slug + '-kodomo-katei-center',
      name: {
        ja: isCenter ? cname : city + ' 子どもと家庭の相談窓口（' + cname + '）',
        en: en + ': Child & Family Support Center'
      },
      hook: { ja: '家のこと・自分のこと、近くの大人に話したい', en: 'I want to talk to an adult nearby about home or myself' },
      summary: {
        ja: city + 'の、18歳未満の子どもと家族のための相談窓口です。家や親のこと、学校に行きづらいことなど、なんでも相談できます。' + (kid ? '子どもが直接かけられる専用の電話もあります。' : ''),
        en: 'A local help desk in ' + en + ' for children under 18 and their families: home, parents, trouble going to school — anything.' + (kid ? ' There is a phone line just for kids.' : '')
      },
      cat: ['consult'],
      kind: 'service', basis: 'local', right: false,
      amount: null, repay: null,
      who: { ja: city + 'に住む18歳未満の子どもと、その家族。' },
      how: { ja: (kid ? 'まず「' + kid.label + '」（' + kid.phone + '）に電話してみよう。' : 'まず電話で「相談したいことがあります」と伝えます。') + '話しに行くこともできます。' },
      where: { ja: cname },
      docs: [],
      ask: ['家のことで困っています。話を聞いてもらえますか？', '学校に行きづらいです。どこに相談すればいいですか？', '親に知られずに相談できますか？'],
      caution: { ja: '命や体があぶないときは、すぐに110番か、児童相談所の189へ。' + (note ? 'ほかの電話番号は「場所」にのっています。' : '') },
      supporter: { ja: '区市町村の子供家庭支援センター。18歳未満の子供と子育て家庭の総合相談に加え、ショートステイ・一時預かりなどの在宅サービスやケース援助も行う（都のページより）。' },
      effort: 'low',
      for: { stages: JR_ALL, paths: [], care: [], careOnly: false, age: { min: 12, max: 17 }, areas: [code] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: kid ? kid.phone : phone,
        phoneLabel: kid ? kid.label : cname,
        line: null, chat: null, web: KC_URL,
        hours: kid ? kid.hours : { ja: hours, en: null }
      },
      locations: locs,
      source: KC_SRC,
      eligibleBy: 'residence',
      verifiedBy: V
    };
  }

  var KC = [
    kc('13101', 'chiyoda', '千代田区', 'Chiyoda', '千代田区立児童・家庭支援センター', '東京都千代田区神田司町二丁目16番 神田さくら館6階', 35.693047, 139.768494, '03-5298-5521', '千代田っこホットライン 03-3256-8150', '午前9時から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13102', 'chuo', '中央区', 'Chuo', '中央区立子ども家庭支援センター', '東京都中央区明石町12番1号 4階', 35.666866, 139.776306, '03-3542-6322', '虐待情報専用電話 03-3542-6328', '午前9時から午後5時（休み: 祝日・年末年始）'),
    kc('13103', 'minato', '港区', 'Minato', '港区子ども家庭支援センター', '東京都港区南青山5-7-11 港区子ども家庭総合支援センター1・2・3階', 35.662689, 139.712814, '03-5962-7215', '03-5962-7215 は「港区子ども家庭相談ダイヤル」', '（月曜日から金曜日）8時30分から18時00分 （土曜日）8時30分から17時00分（休み: 日曜日・祝日・年末年始）'),
    kc('13104', 'shinjuku', '新宿区', 'Shinjuku', '新宿区立子ども総合センター', '東京都新宿区新宿七丁目3番29号', 35.701225, 139.712662, '03-3232-0675', null, '午前8時30分から午後7時 日曜日・祝日（電話相談のみ）午前8時30分から午後5時（休み: 年末年始）'),
    kc('13105', 'bunkyo', '文京区', 'Bunkyo', '文京区こども家庭支援センター', '東京都文京区春日一丁目16番21号 シビックセンター5階', 35.708336, 139.752411, '03-5803-1109', null, '午前9時から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13106', 'taito', '台東区', 'Taito', '台東区日本堤子ども家庭支援センター', '東京都台東区日本堤二丁目25番8号', 35.72805, 139.797028, '03-5824-2571', '24時間受付電話 03-3875-1889', '午前9時から午後5時（ひろばは午前10時から午後4時）（休み: 日曜日・祝日・年末年始）'),
    kc('13107', 'sumida', '墨田区', 'Sumida', '墨田区子育て支援総合センター', '東京都墨田区横川五丁目7番4号 すみだ保健子育て総合センター（4階）', 35.704685, 139.818054, '03-3622-1150', '相談専用電話 03-3622-1154', '午前9時から午後6時（休み: 土曜日･日曜日・祝日･年末年始）'),
    kc('13108', 'koto', '江東区', 'Koto', '江東区こども未来部養育支援課養育支援係', '東京都江東区東陽四丁目11番28号', 35.672993, 139.81636, '03-3647-4408', '虐待ホットライン 03-3646-5481（養育支援課内）', '午前8時30分から午後5時00分（虐待ホットライン：午前8時30分から午後5時15分）（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13109', 'shinagawa', '品川区', 'Shinagawa', '品川区子ども家庭支援センター', '東京都品川区広町2-1-36', 35.608822, 139.729767, '03-6421-5236', null, '午前8時30分から午後5時15分（休み: 日曜日・祝日・年末年始）'),
    kc('13110', 'meguro', '目黒区', 'Meguro', '目黒区こども家庭センター', '東京都目黒区上目黒二丁目19番15号（目黒区総合庁舎別館2階）', 35.640465, 139.6987, '03-3715-2641', '虐待通告専用（月〜金）03-5722-9743', '8時30分から午後5時（月曜日から土曜日） 虐待通告窓口は午前8時30分から午後5時（月曜日から金曜日）（休み: 日曜日・祝日・年末年始）'),
    kc('13111', 'ota', '大田区', 'Ota', '大田区おおたこども家庭センター', '東京都大田区大森西二丁目3番22号（大田区こども未来総合センター内）', 35.578339, 139.729736, '03-5753-7830', 'おおた児童虐待対応ダイヤル #9924（03-5753-9924）', '午前8時30分から午後6時（月曜日から金曜日） 虐待通報は午前8時30分から午後5時45分（月曜日から金曜日）（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13113', 'shibuya', '渋谷区', 'Shibuya', '渋谷区子ども家庭支援センター', '東京都渋谷区宇田川町5-6', 35.66291, 139.698425, '03-3463-3748', '相談専用電話 0120-135-415', '午前9時00分から午後5時00分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13114', 'nakano', '中野区', 'Nakano', '中野区子ども・若者支援センター', '東京都中野区中央一丁目41番2号', 35.698292, 139.683182, '03-5937-3257', null, '午前8時30分から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13115', 'suginami', '杉並区', 'Suginami', '杉並子ども家庭支援センター', '東京都杉並区阿佐谷北一丁目4番2', 35.705467, 139.638382, '03-5356-2602', '相談専用電話 03-5356-2601（9:00–20:00。日・祝・年末年始は休み）', '午前8時30分から午後5時（相談専用電話は午前9時00分から午後8時00分）（休み: 土曜日・日曜日・祝日・年末年始、（相談専用電話は日・祝・年末年始））'),
    kc('13116', 'toshima', '豊島区', 'Toshima', '豊島区東部子ども家庭支援センター', '東京都豊島区上池袋二丁目35番22号', 35.737057, 139.718262, '03-5980-5275', '子ども専用 0120-618-471 / 児童虐待専用 03-6858-2302（月〜金 8:30–17:15）', '午前9時から午後6時、土曜日・日曜日は午前9時から午後5時まで（休み: 祝日・年末年始）'),
    kc('13117', 'kita', '北区', 'Kita', '北区子ども家庭支援センター', '東京都北区王子6丁目7番3号 旧清至中学校別棟', 35.762653, 139.740387, '03-3914-9565', '児童虐待専用 03-3912-1894（月〜土）', '午前9時から午後5時30分（休み: 祝日・年末年始（日曜日はひろばのみ開設））'),
    kc('13118', 'arakawa', '荒川区', 'Arakawa', '荒川区子ども家庭総合センター', '東京都荒川区荒川一丁目50番17号', 35.734066, 139.784592, '03-3802-3765', 'あらかわキッズ・ファミリーコール24 0120-536-883', '午前8時30分から午後5時15分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13119', 'itabashi', '板橋区', 'Itabashi', '板橋区子ども家庭総合支援センター', '東京都板橋区本町24-17', 35.759575, 139.708801, '03-5944-2371', '虐待相談専用 03-5944-2373（24時間365日） / 子どもなんでも相談 0120-925-610（24時間365日）', '午前8時30分から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13120', 'nerima', '練馬区', 'Nerima', '練馬区子ども家庭支援センター', '東京都練馬区豊玉北5丁目28番3号', 35.734859, 139.653244, '03-3993-8155', '虐待通告専用フリーダイヤル 0120-248-551', '午前8時30分から午後7時、土曜日は午後5時まで（休み: 日曜日・祝日・年末年始）'),
    kc('13121', 'adachi', '足立区', 'Adachi', '足立区こども家庭相談室', '東京都足立区梅島三丁目28番8号', 35.775742, 139.792709, '03-3852-3535', null, '午前8時30分から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13122', 'katsushika', '葛飾区', 'Katsushika', '葛飾区子ども総合センター', '東京都葛飾区青戸四丁目15番14号 健康プラザかつしか2階', 35.751595, 139.850891, '03-3602-1386', '虐待通報相談専用 03-3602-1389', '午前8時30分から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13123', 'edogawa', '江戸川区', 'Edogawa', '江戸川区子ども家庭センター', '東京都江戸川区中央3丁目4番18号', 35.710094, 139.871796, '03-5678-1810', null, '午前8時30分から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13201', 'hachioji', '八王子市', 'Hachioji', '八王子市こども家庭総合センター', '東京都八王子市明神町三丁目19番2号 東京たま未来メッセ庁舎・会議室棟4階 （八王子市保健所内）', 35.656578, 139.342804, '042-656-8225', null, '午前9時から午後5時（休み: 土曜日、日曜日、祝日、年末年始）'),
    kc('13202', 'tachikawa', '立川市', 'Tachikawa', '立川市子ども家庭センター', '東京都立川市錦町3-3-6', 35.694016, 139.421005, '042-528-6871', '虐待通告専用 042-528-4338', '午前9時から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13203', 'musashino', '武蔵野市', 'Musashino', '武蔵野市子ども家庭支援センター', '東京都武蔵野市緑町二丁目2番28号 武蔵野市役所3階', 35.717499, 139.566452, '0422-55-9002', 'フリーダイヤル 0120-839-002', '電話相談 午前8時30分から午後10時 （来所訪問相談 午前8時30分から午後5時）（休み: 日曜日・祝日・年末年始（来所訪問相談は土曜日も休み））'),
    kc('13204', 'mitaka', '三鷹市', 'Mitaka', '三鷹市子ども家庭支援センターりぼん', '東京都三鷹市下連雀九丁目11番7号 三鷹市教育センター2階', 35.684196, 139.559494, '0422-40-5925', null, '午前8時30分から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13205', 'ome', '青梅市', 'Ome', '青梅市こども家庭センター', '東京都青梅市東青梅一丁目174番1号 青梅市健康センター内', 35.787659, 139.272736, '0428-24-2126', null, '午前8時30分から午後5時（休み: 土曜日･日曜日･祝日・年末年始）'),
    kc('13206', 'fuchu', '府中市', 'Fuchu', '府中市子ども家庭支援センター「たっち」', '東京都府中市宮町一丁目50番 くるる3階', 35.671555, 139.480728, '042-354-8701', '042-354-8702 も使えます', '午前10時から午後8時（休み: 年末年始・臨時休館日）'),
    kc('13207', 'akishima', '昭島市', 'Akishima', '昭島市こども家庭センター', '東京都昭島市つつじが丘三丁目3番15 アキシマエンシス校舎棟1階', 35.711323, 139.368759, '042-543-9046', '子ども専用ダイヤル 0120-678-044', '午前9時から午後6時30分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13208', 'chofu', '調布市', 'Chofu', '調布市子ども家庭支援センターすこやか', '東京都調布市国領町三丁目1番38号 ココスクエア2階', 35.649574, 139.558685, '042-481-7731', '虐待防止ホットライン 0120-087-358', '午前9時から午後5時（休み: 第3土曜日とその翌日・年末年始）'),
    kc('13209', 'machida', '町田市', 'Machida', '町田市子ども家庭支援課', '東京都町田市森野二丁目2番22号 町田市役所2階', 35.547039, 139.438141, '042-724-4419', '子ども専用相談ダイヤル 0120-552-164', '午前8時30分から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13210', 'koganei', '小金井市', 'Koganei', '小金井市こども家庭センター', '東京都小金井市貫井北町五丁目18番18号 保健センター1階', 35.702, 139.49025, '042-321-3161', '総合相談 042-321-3146', '月曜日から金曜日までは午前8時30から午後5時 土曜日は午前9時から午後5時 （ひろばは午前10時から午後4時）（休み: 日曜日・祝日・年末年始 （ひろばは月曜日も休み））'),
    kc('13211', 'kodaira', '小平市', 'Kodaira', '小平市子ども家庭支援センター', '東京都小平市小川東町四丁目2番1号 小平元気村おがわ東2階', 35.73999, 139.474518, '042-348-2102', '虐待相談ほっとライン 042-347-3192', '午前10時から午後6時（休み: 日曜日・月曜日・祝日・年末年始）'),
    kc('13212', 'hino', '日野市', 'Hino', '日野市子ども家庭支援センター', '東京都日野市神明一丁目13番2号 子ども包括支援センター2階', 35.671543, 139.396469, '042-506-2152', '児童虐待専用 042-506-2153', '午前9時から午後5時45分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13213', 'higashimurayama', '東村山市', 'Higashimurayama', '東村山市こども家庭センター', '東京都東村山市本町一丁目2番3号 いきいきプラザ3階', 35.75449, 139.468414, '042-393-5111', '相談専用 042-390-2271', '午前9時から午後5時（休み: 土曜日･日曜日・祝日・年末年始）'),
    kc('13214', 'kokubunji', '国分寺市', 'Kokubunji', '国分寺市立こども家庭センター', '東京都国分寺市泉町2-3-8 いずみプラザ1階', 35.696209, 139.468216, '042-321-1809', '子ども専用相談電話 0800-800-9033（フリーダイヤル）または 042-321-1956', '午前8時30分から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13215', 'kunitachi', '国立市', 'Kunitachi', '国立市子ども家庭支援センター', '東京都国立市富士見台二丁目47番1号', 35.684376, 139.441513, '042-573-0192', null, '午前8時30分から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13218', 'fussa', '福生市', 'Fussa', '福生市こども家庭センター', '東京都福生市福生2125番地3 福生市保健センター2階', 35.743938, 139.332703, '042-539-2555', null, '午前8時30分から午後5時15分、水曜日は午後8時まで（休み: 日曜日・祝日・年末年始）'),
    kc('13219', 'komae', '狛江市', 'Komae', '狛江市子ども家庭支援センター', '東京都狛江市元和泉一丁目11番11号 ひだまりセンター1階', 35.631226, 139.575882, '03-5438-6605', '相談専用 03-5438-6606', '午前9時から午後6時（休み: 日曜日・祝日・年末年始）'),
    kc('13220', 'higashiyamato', '東大和市', 'Higashiyamato', '東大和市子ども家庭センター', '東京都東大和市中央3-936-8 市役所会議棟1階', 35.745552, 139.426147, '042-565-3651', null, '午前8時30分から午後5時15分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13221', 'kiyose', '清瀬市', 'Kiyose', '清瀬市子ども家庭支援センター', '東京都清瀬市中里五丁目842番地 清瀬市役所北隣 しあわせ未来センター内', 35.785568, 139.52655, '042-495-7701', null, '午前8時30分から午後5時15分（休み: 日曜日・祝日・年末年始）'),
    kc('13222', 'higashikurume', '東久留米市', 'Higashikurume', '東久留米市こども家庭センター', '東京都東久留米市滝山四丁目3番14号 わくわく健康プラザ北棟2階', 35.742264, 139.503891, '042-471-0910', null, '午前8時30分から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13223', 'musashimurayama', '武蔵村山市', 'Musashimurayama', '武蔵村山市子ども家庭支援センター', '東京都武蔵村山市学園四丁目5番1号 武蔵村山市民総合センター内', 35.746132, 139.403259, '042-590-1152', null, '午前8時30分から午後7時（休み: 日曜日・祝日・年末年始）'),
    kc('13224', 'tama', '多摩市', 'Tama', '多摩市こども家庭センター', '東京都多摩市関戸4-19-5', 35.648975, 139.449585, '042-355-3777', null, '午前8時30分から午後6時（休み: 日曜日・祝日・年末年始）'),
    kc('13225', 'inagi', '稲城市', 'Inagi', '稲城市子ども家庭支援センター', '東京都稲城市東長沼2115番2号 3F', null, null, '042-378-6366', null, '午前8時30分から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13227', 'hamura', '羽村市', 'Hamura', '羽村市こども家庭センター', '東京都羽村市緑ヶ丘5-5-2 保健センター2階', 35.768913, 139.312088, '042-578-2882', null, '午前8時30分から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13228', 'akiruno', 'あきる野市', 'Akiruno', 'あきる野市こども家庭センター', '東京都あきる野市秋川1－8 トラストルピア2階', 35.729977, 139.287033, '042-550-3313', null, '午前8時30分から午後6時30分 （面接相談 午前10時から午後6時30分）（休み: 第2水曜日・日曜日･祝日･年末年始）'),
    kc('13229', 'nishitokyo', '西東京市', 'Nishitokyo', '西東京市子ども家庭センター', '東京都西東京市中町1-5-1 防災・保谷保健福祉総合センター4階', 35.741821, 139.557983, '042-425-3303', '相談専用電話 042-439-0081', '午前9時から午後5時 （相談専用電話）午前9時から午後4時まで 土曜日は電話相談のみ（休み: 日曜日・祝日・年末年始）'),
    kc('13303', 'mizuho', '瑞穂町', 'Mizuho', '瑞穂町子ども家庭支援センター', '東京都瑞穂町石畑1972番地', 35.776951, 139.359375, '042-568-0051', null, '午前9時から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13305', 'hinode', '日の出町', 'Hinode', '日の出町こども家庭センター', '東京都日の出町大字平井2780番地 保健センター2階', 35.742443, 139.256607, '042-597-6177', null, '午前9時から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13308', 'okutama', '奥多摩町', 'Okutama', '奥多摩町子ども家庭支援センター', '東京都奥多摩町小丹波108番地', null, null, '0428-85-1788', null, '午前8時30分から午後5時15分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13307', 'hinohara', '檜原村', 'Hinohara', '檜原村こども家庭センター', '東京都檜原村2717番地 檜原村やすらぎの里けんこう館2階', null, null, '042-598-3122', null, '午前9時から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13361', 'oshima', '大島町', 'Oshima', '大島町子ども家庭支援センター', '東京都大島町元町字丸塚548番1', null, null, '04992-2-2398', null, '午前9時から午後5時（休み: 日曜日・祝日・年末年始）'),
    kc('13362', 'toshimamura', '利島村', 'Toshima Village', '利島村こども家庭センター', '東京都利島村105 利島村高齢者在宅サービスセンター内', null, null, '04992-9-0018', null, '午前9時から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13363', 'niijima', '新島村', 'Niijima', '新島村こども家庭センター', '東京都新島村本村三丁目12番8号 さわやか健康センター内', 34.372868, 139.25946, '04992-5-1856', null, '午前9時から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13364', 'kozushima', '神津島村', 'Kozushima', '神津島村こども家庭センター', '東京都神津島村904 神津島村役場内', 34.205669, 139.134155, '04992-8-0011', null, '午前8時30分から午後5時（休み: 土曜日･日曜日・祝日・年末年始）'),
    kc('13381', 'miyake', '三宅村', 'Miyake', '三宅村子ども家庭支援センター', '東京都三宅村阿古497 三宅村役場内', null, null, '04994-5-0902', null, '午前8時30分から午後5時15分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13382', 'mikurajima', '御蔵島村', 'Mikurajima', '御蔵島村子ども家庭支援センター', '東京都御蔵島村字入かねが沢 御蔵島村役場内', 33.897289, 139.595901, '04994-8-2121', null, '午前9時から午後5時（休み: 土曜日・日曜日･祝日・年末年始）'),
    kc('13401', 'hachijo', '八丈町', 'Hachijo', '八丈町こども家庭センター', '東京都八丈町大賀郷2551番地2 八丈町役場内', null, null, '04996-2-4300', null, '午前8時45分から午後5時00分（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13402', 'aogashima', '青ヶ島村', 'Aogashima', '青ヶ島村役場 総務課 庶務民生係', null, null, null, '04996-9-0111', null, '午前9時から午後5時（休み: 土曜日・日曜日・祝日・年末年始）'),
    kc('13421', 'ogasawara', '小笠原村', 'Ogasawara', '小笠原村子ども家庭支援センター', '東京都小笠原村父島字西町小笠原村役場内', null, null, '04998-2-3939', null, '午前8時から午後5時15分（休み: 土曜日・日曜日・祝日・年末年始）')
  ];

  // 世田谷区は5つの地域ごとにセンターがある（区のページ「総合支所業務案内 子ども家庭支援課」「窓口のご案内」）
  (function () {
    var SG = 'https://www.city.setagaya.lg.jp/kyoutsu/kodomo/8442.html';
    var r = kc('13112', 'setagaya', '世田谷区', 'Setagaya', '世田谷区子ども家庭支援センター（5地域）', null, null, null, '03-5432-2915', null, '');
    r.where = { ja: '住んでいる地域の総合支所（世田谷・北沢・玉川・砧・烏山）の子ども家庭支援センター' };
    r.how = { ja: '住んでいる地域の子ども家庭支援センターに電話します（地域は区のページ「窓口のご案内」で確認できます）。話しに行くこともできます。' };
    r.contact = { phone: '03-5432-2915', phoneLabel: 'せたがや子ども家庭支援センター（世田谷地域）', line: null, chat: null, web: SG,
      hours: { ja: '世田谷地域: 午前8時30分から午後5時（休み: 土・日・祝日・年末年始）', en: 'Setagaya area: weekdays 8:30–17:00' } };
    r.locations = [
      loc('せたがや子ども家庭支援センター（世田谷総合支所）', '13112', '東京都世田谷区世田谷4丁目22番33号', 35.646301, 139.652374, '03-5432-2915', '午前8時30分から午後5時（休み: 土・日・祝日・年末年始）', '世田谷地域'),
      loc('きたざわ子ども家庭支援センター（北沢総合支所）', '13112', '東京都世田谷区北沢2丁目8番18号', 35.662132, 139.669952, '03-6804-7525', null, '北沢地域'),
      loc('たまがわ子ども家庭支援センター（玉川総合支所）', '13112', '東京都世田谷区等々力3丁目4番1号', 35.608311, 139.648712, '03-3702-1189', null, '玉川地域'),
      loc('きぬた子ども家庭支援センター（砧総合支所）', '13112', '東京都世田谷区成城6丁目2番1号', 35.641003, 139.601028, '03-3482-1415', null, '砧地域'),
      loc('からすやま子ども家庭支援センター（烏山総合支所）', '13112', '東京都世田谷区南烏山6丁目22番14号', 35.669556, 139.598145, '03-3326-6155', null, '烏山地域')
    ];
    r.caution = { ja: '命や体があぶないときは、すぐに110番か、児童相談所の189へ。電話番号は住んでいる地域でちがいます。' };
    r.source = { org: '世田谷区（総合支所業務案内 子ども家庭支援課）', url: SG, checked: C3 };
    r.sources2 = [{ org: '世田谷区（窓口のご案内）', url: 'https://www.city.setagaya.lg.jp/02243/1413.html' }, { org: KC_SRC.org, url: KC_URL }];
    KC.splice(11, 0, r);
  })();

  /* ---- (4) 子どもの学習・生活支援事業（23区）— 生活が苦しい家庭の中学生・高校生の勉強をサポート ----------
   * 出典: 東京都福祉局「任意事業実施状況（区部）」各区PDF（令和7年9月末時点、2026年1月27日更新）。
   * 区のページで内容を確かめられた区（中央区・板橋区）は区のページを出典にしています。
   * 北区は、この事業の対象が小学生のみ（中学生は別の部署の事業）のため載せていません。 */
  var NINNI = { org: '東京都福祉局（任意事業実施状況（区部））', url: 'https://www.fukushi.metro.tokyo.lg.jp/seikatsu/seikatsukonnkyuu/ninnijigyoku' };
  /* o = { code, slug, city, en, pdf, whoJa, whatJa, stages, age, phone, phoneLabel, url?, org?, how?, free?, note?, locs?, sources2? } */
  function gakushu(o) {
    return {
      id: o.slug + '-gakushu-shien',
      name: { ja: o.city + ' 子どもの学習・生活支援', en: o.en + ': Study & Life Support for Kids' },
      hook: { ja: '塾に行けない。勉強を見てくれる人がほしい', en: 'I can\'t afford cram school and want someone to help me study' },
      summary: {
        ja: o.city + 'が、生活が苦しい家庭などの子どもの勉強や進学を手伝う事業です。' + o.whatJa,
        en: o.en + ' helps children from low-income families with studying and getting into high school.' + (o.free ? ' Free.' : '')
      },
      cat: ['education', 'consult'],
      kind: 'service', basis: 'local', right: false,
      amount: o.free ? { ja: '無料', en: 'Free' } : null, repay: null,
      who: { ja: o.whoJa },
      how: { ja: o.how || ('まず「' + o.phoneLabel + '」に電話して、「子どもの学習支援を使いたい」と伝えます。生活保護を受けている家庭は、担当のケースワーカーにも聞けます。') },
      where: { ja: o.phoneLabel },
      docs: [],
      ask: ['子どもの学習支援を使いたいです。うちは対象になりますか？', 'どこで、何曜日にやっていますか？', '高校受験の相談もできますか？'],
      caution: { ja: (o.note ? o.note + ' ' : '') + '対象になる家庭の条件があります。くわしい場所や日にちは、申しこんだ人に案内されます。' },
      supporter: { ja: '生活困窮者自立支援法の任意事業「子どもの学習・生活支援事業」（' + o.city + '）。都の一覧（令和7年9月末時点）で実施を確認。受験生チャレンジ支援貸付（中3）とあわせて案内するとよい。' },
      effort: 'mid',
      for: { stages: o.stages, paths: [], care: [], careOnly: false, age: o.age, areas: [o.code] },
      deadline: { ja: 'いつでも相談できます（定員がある教室もあります）', en: 'Anytime (some classes have limited places)', leaveMonths: null, months: null, always: true },
      contact: { phone: o.phone, phoneLabel: o.phoneLabel, line: null, chat: null, web: o.url || o.pdf, hours: o.hours || null },
      locations: o.locs || [],
      source: { org: o.org || ('東京都福祉局（生活困窮者に対する各種支援の実施状況・' + o.city + '）'), url: o.url || o.pdf, checked: C3 },
      sources2: (o.sources2 || []).concat(o.url ? [{ org: '東京都福祉局（生活困窮者に対する各種支援の実施状況・' + o.city + '）', url: o.pdf }] : [NINNI]),
      eligibleBy: 'residence',
      verifiedBy: V
    };
  }
  var NP = 'https://www.fukushi.metro.tokyo.lg.jp/documents/d/fukushi/';
  var JHS = ['jhs12', 'jhs3'], JHS_HS = ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'];

  var G = [
    gakushu({ code: '13101', slug: 'chiyoda', city: '千代田区', en: 'Chiyoda City', pdf: NP + '2026-01-26-142216-176',
      whoJa: '千代田区に住む、生活が苦しい家庭などの小学4年生〜高校3年生。',
      whatJa: '小学4年生から高校3年生まで、勉強のサポートと、安心して過ごせる居場所があります。',
      stages: JHS_HS, age: { min: 9, max: 18 }, phone: '03-5211-4126', phoneLabel: '千代田区 生活支援課' }),

    gakushu({ code: '13102', slug: 'chuo', city: '中央区', en: 'Chuo City', pdf: NP + '2026-01-26-142312-680',
      url: 'https://www.city.chuo.lg.jp/a0022/kosodate/kosodate/shien/gakushu_shien.html', org: '中央区（中央区子どもの学習・生活支援事業）', free: true,
      whoJa: '中央区に住む、就学援助（生活保護をふくむ）・児童扶養手当を受けている家庭、または同じくらいの収入の家庭の、小学4年生〜おおむね20歳以下の高校生。高校をやめた人、高校に行っていない人も。',
      whatJa: '無料です。中学生はボランティアの先生と1〜2人ずつの個別の学習会（週1回・2時間）、高校生世代は自由に勉強できる居場所があります。',
      how: '区のページの申込フォームから申しこみます。フォームがむずかしいときはメールかFAXでも申しこめます。申しこんだあとに面談があります。わからないことは区の福祉総合相談係に電話で聞けます。',
      note: '教室によっては定員がいっぱいで、募集を止めていることがあります（2026年7月24日時点）。運営はNPO法人キッズドアです。',
      stages: JHS_HS, age: { min: 9, max: 20 }, phone: '03-6278-8059', phoneLabel: '中央区 地域福祉課 福祉総合相談係' }),

    gakushu({ code: '13103', slug: 'minato', city: '港区', en: 'Minato City', pdf: NP + '2026-01-26-142411-051',
      whoJa: '港区に住む、生活保護や就学援助を受けている家庭などの中学生と、生活保護や児童扶養手当を受けている家庭などの高校生。',
      whatJa: '中学生は区内8か所の教室で、国語・数学・英語（テスト前は理科・社会も）を勉強できます。高校生向けの教室も2か所あります。',
      stages: JHS_HS, age: { min: 12, max: 18 }, phone: '03-5114-8826', phoneLabel: '港区生活・就労支援センター',
      note: '都の一覧では連絡先はメール（minato107@city.minato.tokyo.jp）です。電話番号は港区生活・就労支援センターのページのものです。',
      sources2: [{ org: '港区（生活・就労支援センター）', url: 'https://www.city.minato.tokyo.jp/jiritsusien/seikatukonnkyuusyajiritusien.html' }] }),

    gakushu({ code: '13104', slug: 'shinjuku', city: '新宿区', en: 'Shinjuku City', pdf: NP + '2026-01-26-142457-460',
      whoJa: '新宿区に住む、生活が苦しい家庭の小学4年生〜高校卒業までの子ども。',
      whatJa: '将来の夢にあわせて進学できるように勉強を手伝い、進学したあとも勉強が続くようサポートします。',
      stages: JHS_HS, age: { min: 9, max: 18 }, phone: '03-5273-3853', phoneLabel: '新宿区 生活支援相談窓口' }),

    gakushu({ code: '13105', slug: 'bunkyo', city: '文京区', en: 'Bunkyo City', pdf: NP + '2026-01-26-142529-698',
      whoJa: '文京区に住む、生活が苦しいなどで勉強やくらしの環境に困りごとがある小学生・中学生・高校生世代。',
      whatJa: '勉強と、毎日のくらしの両方をサポートします。',
      stages: JHS_HS, age: { min: 6, max: 18 }, phone: '03-5803-1917', phoneLabel: '文京区 自立相談支援窓口' }),

    gakushu({ code: '13106', slug: 'taito', city: '台東区', en: 'Taito City', pdf: NP + '2026-01-26-142605-615',
      whoJa: '台東区に住む、生活が苦しい家庭の子ども。',
      whatJa: '学習支援員が、勉強のしかたや進路の相談にのり、無料の学習教室などの情報も教えてくれます。',
      stages: JHS_HS, age: null, phone: '03-5246-1158', phoneLabel: '台東区 保護課 生活困窮者支援担当' }),

    gakushu({ code: '13107', slug: 'sumida', city: '墨田区', en: 'Sumida City', pdf: NP + '2026-01-26-142641-401',
      whoJa: '墨田区に住む、生活が苦しい家庭の中学1年生〜高校1年生（夏休みなどの学習会は小学4年生〜中学3年生）。',
      whatJa: '中学1年生から高校1年生まで、1年に50回の学習会があります。長い休みには、お昼ごはんつきの宿題サポートもあります。',
      stages: ['jhs12', 'jhs3', 'hs12'], age: { min: 12, max: 16 }, phone: '03-5608-6289', phoneLabel: 'くらし・しごと相談室すみだ' }),

    gakushu({ code: '13108', slug: 'koto', city: '江東区', en: 'Koto City', pdf: NP + '2026-01-26-142727-401',
      whoJa: '江東区に住む、生活が苦しい家庭の小学生〜高校生の年齢の子ども。',
      whatJa: '小学4〜6年生・中学生・高校生向けの学習教室「まなび塾」と、相談にのる「まなび支援員」がいます。',
      stages: JHS_HS, age: { min: 9, max: 18 }, phone: '03-3647-8487', phoneLabel: '江東区 保護第一課（保護第二課 03-3637-3741）' }),

    gakushu({ code: '13109', slug: 'shinagawa', city: '品川区', en: 'Shinagawa City', pdf: NP + '2026-01-26-142755-082',
      whoJa: '品川区に住む、生活が苦しい家庭の子ども。',
      whatJa: '勉強のサポートや、家に来て勉強の環境づくりのアドバイスをしてくれます。安心して過ごせる居場所もあります。',
      stages: JHS_HS, age: null, phone: '03-5742-9117', phoneLabel: '品川区 暮らし・しごと応援センター' }),

    gakushu({ code: '13110', slug: 'meguro', city: '目黒区', en: 'Meguro City', pdf: NP + '2026-01-26-142834-726',
      whoJa: '目黒区に住む、生活が苦しい家庭の中学生〜高校生。',
      whatJa: '中学生から高校生まで、平日週2回などの個別の学習サポートがあります。',
      stages: JHS_HS, age: { min: 12, max: 18 }, phone: '03-5722-9370', phoneLabel: '目黒区 くらしの相談窓口' }),

    gakushu({ code: '13111', slug: 'ota', city: '大田区', en: 'Ota City', pdf: NP + '2026-01-26-142926-975',
      whoJa: '大田区に住む、生活が苦しい家庭の中学生・高校生。高校に行っていない人、高校をやめた人も。',
      whatJa: '中学生は週1回の学習会（区内4か所とオンライン）と居場所があります。高校生の勉強・生活の相談、学び直しのサポートもあります。',
      stages: JHS_HS, age: { min: 12, max: 18 }, phone: '03-6715-7015', phoneLabel: '大田区 JOBOTA・蒲田生活福祉課 自立支援促進担当' }),

    gakushu({ code: '13112', slug: 'setagaya', city: '世田谷区', en: 'Setagaya City', pdf: NP + '2026-01-26-143026-248',
      whoJa: '世田谷区に住む、生活が苦しい家庭の子ども（くわしい対象は窓口で確認）。',
      whatJa: '区内5つの地域で、週1回の学習・生活サポートがあります。月1回はみんなでお弁当を食べる日もあります。',
      stages: JHS, age: null, phone: '03-5431-5355', phoneLabel: 'ぷらっとホーム世田谷' }),

    gakushu({ code: '13113', slug: 'shibuya', city: '渋谷区', en: 'Shibuya City', pdf: NP + '2026-01-26-143118-102',
      whoJa: '渋谷区に住む、生活保護を受けている家庭などの子ども。',
      whatJa: '家に来たり面談したりして、勉強や進学のことを手伝い、ほかの窓口ともつないでくれます。',
      stages: JHS_HS, age: null, phone: '03-3463-2116', phoneLabel: '渋谷区 生活支援相談窓口' }),

    gakushu({ code: '13114', slug: 'nakano', city: '中野区', en: 'Nakano City', pdf: NP + '2026-01-26-143152-381',
      whoJa: '中野区に住む、就学援助・児童扶養手当などを受けている家庭の小学4〜6年生と中学1〜3年生。',
      whatJa: '中学生は、行きたい高校への進学をめざして勉強できます。',
      stages: JHS, age: { min: 9, max: 15 }, phone: '03-3228-8950', phoneLabel: '中野くらしサポート' }),

    gakushu({ code: '13115', slug: 'suginami', city: '杉並区', en: 'Suginami City', pdf: NP + '2026-01-26-143231-995',
      whoJa: '杉並区に住む、生活が苦しい家庭の子ども。学校に行けていない・家から出にくい子どもも。',
      whatJa: '区内3会場で、ほぼ毎週、勉強と居場所のサポートがあります。保護者の相談にものります。',
      stages: JHS_HS, age: null, phone: '03-3391-1751', phoneLabel: '杉並区 くらしのサポートステーション' }),

    gakushu({ code: '13116', slug: 'toshima', city: '豊島区', en: 'Toshima City', pdf: NP + '2026-01-26-143307-731',
      whoJa: '豊島区に住む、子どもがいる家庭。',
      whatJa: '地域の学習支援教室のネットワーク「としま子ども学習支援ネットワーク（とこネット）」の教室を紹介してくれます。',
      stages: JHS_HS, age: null, phone: '03-4566-2454', phoneLabel: '豊島区 くらし・しごと相談支援センター' }),

    gakushu({ code: '13118', slug: 'arakawa', city: '荒川区', en: 'Arakawa City', pdf: NP + '2026-01-26-143418-481',
      whoJa: '荒川区に住む小学生・中学生。',
      whatJa: '小中学生が自由に勉強できる場所があり、勉強の相談や指導をしてくれます。',
      stages: JHS, age: { min: 6, max: 15 }, phone: '03-3802-4402', phoneLabel: '荒川区 福祉推進課 地域共生推進係' }),

    gakushu({ code: '13119', slug: 'itabashi', city: '板橋区', en: 'Itabashi City', pdf: NP + '2026-01-26-143516-194',
      url: 'https://www.city.itabashi.tokyo.jp/kenko/soudan/madoguchi/1002461.html', org: '板橋区（まなびのひろば けやきば）',
      whoJa: 'ひとり親家庭や生活が苦しい家庭の子ども。学習教室は小学6年生・中学生・進級や卒業にサポートが必要な高校生・高校をやめた人や高校に行っていないおおむね18歳までの人。',
      whatJa: '「まなびのひろば けやきば」（区内3か所）で、スタッフが一人ひとりにあわせて勉強を教えます。居場所や、家に来てくれる相談もあります。',
      how: '電話（3教室共通）で「けやきばの件」と伝えます。ひとり親の家庭は、チラシの二次元コードからも申しこめます。生活保護を受けている家庭は担当のケースワーカーへ。',
      stages: JHS_HS, age: { min: 11, max: 18 }, phone: '080-7245-1487', phoneLabel: 'まなびのひろば けやきば' }),

    gakushu({ code: '13120', slug: 'nerima', city: '練馬区', en: 'Nerima City', pdf: NP + '2026-01-26-143550-582',
      whoJa: '練馬区に住む、生活保護または就学援助（準要保護）を受けている家庭の中学3年生（勉強会）。生活保護を受けている家庭などの子ども（訪問・居場所・学習支援）。',
      whatJa: '中学3年生向けに、基礎の学力をつける勉強会があります。',
      how: '中3の勉強会は「学校教育支援センター 管理係」（03-6385-9911）へ。生活保護を受けている家庭の訪問・居場所・学習支援は「生活福祉課 自立促進支援係」（03-5984-4698）へ電話します。',
      stages: ['jhs3'], age: { min: 14, max: 15 }, phone: '03-6385-9911', phoneLabel: '練馬区 学校教育支援センター 管理係' }),

    gakushu({ code: '13121', slug: 'adachi', city: '足立区', en: 'Adachi City', pdf: NP + '2026-01-26-143624-506',
      whoJa: '足立区に住む、家で勉強するのがむずかしい中学生・高校生など。',
      whatJa: 'マンツーマンの学習サポートと、自習や食事ができる居場所があります。',
      stages: JHS_HS, age: { min: 12, max: 18 }, phone: '03-3880-5705', phoneLabel: '足立区 福祉まるごと相談課（生活支援推進課 03-3880-5706）' }),

    gakushu({ code: '13122', slug: 'katsushika', city: '葛飾区', en: 'Katsushika City', pdf: NP + '2026-01-26-143649-391',
      whoJa: '葛飾区立中学校に通う、基礎の学力に不安がある中学生。',
      whatJa: '区立中学校のすべての学校で、基礎の学力をのばして高校進学をめざす学習支援をしています。',
      how: 'まず学校の先生に聞くか、葛飾区の自立相談支援窓口に電話して「中学生の学習支援」について聞きます。',
      stages: JHS, age: { min: 12, max: 15 }, phone: '03-5654-8625', phoneLabel: '葛飾区 自立相談支援窓口' }),

    gakushu({ code: '13123', slug: 'edogawa', city: '江戸川区', en: 'Edogawa City', pdf: NP + '2026-01-26-143721-345',
      whoJa: '江戸川区に住む、生活が苦しい家庭の子ども。',
      whatJa: '学習支援、専門の支援員が家に来る相談、面談があります。高校に入ったあとも、卒業後の進路の相談にのります。',
      stages: JHS_HS, age: null, phone: '03-5662-0085', phoneLabel: '江戸川区 くらしごと相談室（中央）' })
  ];

  SM.data.programs.push.apply(SM.data.programs, J.concat(L, KC, G));
})();
