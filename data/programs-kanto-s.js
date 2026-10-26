/* 巣立ちマップ v7 — data/programs-kanto-s.js (DATA-S)
 * 神奈川県・埼玉県・千葉県（政令市 横浜市・川崎市・相模原市・さ\u2060い\u2060た\u2060ま市・千葉市 をふくむ）の支援。
 * すべて 2026-10-26 に、県・市の公式ページ（または県・市から委託された運営団体のページ）を読んで確認しました。
 * ページに書いていないこと（金額・電話番号・住所・締切）は入れていません。
 * 座標は 国土地理院 住所検索API で住所から求め、逆ジオコーダで区市町村コードを確かめました。
 *
 * SPEC-v7 データ契約: basis 'pref' = 都以外の県の制度（pref: '14' など）。政令市・市の制度は basis 'local' ＋ pref。
 * for.areas: ['14'] = 神奈川県内ならどこでも / ['14100'] = 横浜市に住む人だけ / 町村だけの窓口は町村コードの一覧。
 * locations[].area = その窓口がある区市町村（政令市は市のコード 14100 など）。
 * 追加フィールド（任意・programs-local.js と同じ）: eligibleBy 'residence' | 'origin'
 *   'origin' … 住んでいる場所ではなく「どこの県・市の施設や里親家庭から巣立ったか」で決まる支援。
 */
(function () {
  var SM = window.SM;
  var C = '2026-10-26';
  var V = 'Economix JP';
  var CARE = ['facility', 'foster', 'jhome'];
  var NOT_JR = ['hs12', 'hs3', 'left0', 'left1', 'nohs'];              // 中学生には出さない
  var ALL_ST = ['jhs12', 'jhs3', 'hs12', 'hs3', 'left0', 'left1', 'nohs']; // 中学生にも出す
  var KIDS = ['jhs12', 'jhs3', 'hs12', 'hs3', 'nohs'];                  // 18歳未満の子ども向けの窓口
  var LEAVERS = ['hs3', 'left0', 'left1', 'nohs'];                      // 巣立つ前後の人

  function loc(name, area, addr, lat, lng, phone, hours, note) {
    return { name: name, area: area, addr: addr, lat: lat, lng: lng, phone: phone, hours: hours || '', note: note || '' };
  }

  /* ───────── 公式ページ ───────── */
  var KN_JIRITSU = 'https://www.knsyk.jp/download_file/view/2e48687c-029c-443f-a2c2-c87630b04f37/591';
  var KN_JISOU = 'https://www.pref.kanagawa.jp/docs/he8/faq/p34091.html';
  var KN_TOWNS = 'https://www.pref.kanagawa.jp/docs/r6w/konkyu/tyouson.html';
  var KN_KONKYU_LIST = 'https://www.pref.kanagawa.jp/docs/r6w/cnt/f533087/index.html';
  var KN_GAKUHI = 'https://www.pref.kanagawa.jp/docs/v3e/jyosei/gakuhisien/index.html';
  var KN_SHOGAKU = 'https://www.pref.kanagawa.jp/docs/en7/cnt/f324/index.html';
  var KN_SAPO = 'https://www.pref.kanagawa.jp/docs/t7e/cnt/f4151/p471988.html';
  var KN_KOWAKA = 'https://www.pref.kanagawa.jp/docs/t7e/kowaka/201909kowakalinesoudan.html';
  var KN_KOWAKA_C = 'https://www.pref.kanagawa.jp/docs/ch3/cnt/soudan/02_soudan.html';
  var KN_HOTLINE = 'https://www.pref.kanagawa.jp/docs/he8/rights-of-children/hotline-children.html';
  var KN_CARD = 'https://www.pref.kanagawa.jp/docs/ch3/cnt/soudan/10_soudancard/card_index.html';
  var ASUNARO = 'https://shonan-asunaro.com/';
  var YK_KYOTEN = 'https://www.city.yokohama.lg.jp/kosodate-kyoiku/yogo/kyoten.html';
  var YK_KONKYU = 'https://www.city.yokohama.lg.jp/kenko-iryo-fukushi/fukushi-kaigo/seikatsu/jiritsu/konnan/seikatsukonkyu.html';
  var YK_MADO = 'https://www.city.yokohama.lg.jp/kenko-iryo-fukushi/fukushi-kaigo/seikatsu/madoguchi.html';
  var KW_DAIJOB = 'https://www.city.kawasaki.jp/350/page/0000055699.html';
  var KW_KYOTEN = 'https://www.city.kawasaki.jp/450/page/0000147122.html';
  var SG_KONKYU = 'https://www.city.sagamihara.kanagawa.jp/kosodate/fukushi/1026642/1006553/index.html';

  var ST_SHIRYO = 'https://www.pref.saitama.lg.jp/documents/259851/shiryo_r6-1.pdf';
  var ST_YOKO = 'https://www.pref.saitama.lg.jp/documents/210419/saitamakenjidouyougoshisetutaishoshatounitaisurujiritushienkashitukejigyouhojokinkouhuyoukou.pdf';
  var ST_YOSAN = 'https://www.pref.saitama.lg.jp/yosan-info/ST2026-10/pdf/036032.pdf';
  var ST_YOUGO = 'https://www.pref.saitama.lg.jp/a0608/jidou-shisetsu/syakaitekiyougo.html';
  var ST_CLOVER = 'https://www.pref.saitama.lg.jp/a0608/jidou-shisetsu/clover-house.html';
  var CLOVER_OP = 'https://compass-navi.or.jp/activity/01.html';
  var ST_JISOU = 'https://www.pref.saitama.lg.jp/a0608/jisou-annai.html';
  var ST_KONKYU = 'https://www.pref.saitama.lg.jp/a0602/jiritsushien/madoguchi.html';
  var SC_KONKYU = 'https://www.city.saitama.lg.jp/002/003/002/p088576.html';
  var ST_FUBO = 'https://www.pref.saitama.lg.jp/a0204/fubofutan2.html';
  var ST_FUBO_NENSHU = 'https://www.pref.saitama.lg.jp/documents/26351/r8_setainenshu_nihonkokuseki.pdf';
  var ST_SHOGAKU = 'https://www.pref.saitama.lg.jp/f2204/j-s/gen-taiyo.html';
  var ST_SHOGAKU_B = 'https://www.pref.saitama.lg.jp/f2204/j-s/gen-boshuu.html';
  var ST_LINE = 'https://www.pref.saitama.lg.jp/a0608/gyakutai-taiou/snsgyakutaisoudan.html';
  var ST_SMILE = 'https://www.pref.saitama.lg.jp/a0608/smile-net/index.html';

  var CB_JIRITSU = 'https://www.chibakenshakyo.com/0105shikin_page003.php';
  var CB_SHOGAKU = 'https://www.pref.chiba.lg.jp/jika/shougakukin/index.html';
  var CB_SHOGAKU_PDF = 'https://www.pref.chiba.lg.jp/jika/shougakukin/documents/bosyuyoukou-r8.pdf';
  var CB_CANS = 'https://kazenomura.jp/facility/%E3%81%A1%E3%81%B0%E3%82%A2%E3%83%95%E3%82%BF%E3%83%BC%E3%82%B1%E3%82%A2%E3%83%8D%E3%83%83%E3%83%88%E3%83%AF%E3%83%BC%E3%82%AF%E3%82%B9%E3%83%86%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3/';
  var CB_JISOU = 'https://www.pref.chiba.lg.jp/jika/soudan/jidou/soudanjo.html';
  var CB_KONKYU = 'https://www.pref.chiba.lg.jp/kenshidou/seikatukonkyuu.html';
  var CC_KONKYU = 'https://www.city.chiba.jp/hokenfukushi/hogo/konnkyuushapr.html';
  var CB_SHIKIN = 'https://www.pref.chiba.lg.jp/kyouiku/zaimu/enjo/shougakukin/290401.html';
  var CB_LIGHT = 'https://www.pref.chiba.lg.jp/kkbunka/kodomowakamono/lighthouse.html';
  var CB_KOSAPO = 'https://www.pref.chiba.lg.jp/kyouiku/shidou/soudan/ijime.html';
  var SAPO_NET = 'https://saposute-net.mhlw.go.jp/station.html';

  /* ───────── 児童相談所（場所） ───────── */
  var KN_WD = '平日 8:30–17:15';
  var KN_JISOU_LOCS = [
    loc('神奈川県 中央児童相談所', '14205', '神奈川県藤沢市亀井野3119', 35.374489, 139.483658, '0466-84-1600', KN_WD, '担当: 藤沢市・茅ヶ崎市・寒川町'),
    loc('神奈川県 平塚児童相談所', '14203', '神奈川県平塚市中原3-1-6', 35.349628, 139.335556, '0463-73-6888', KN_WD, '担当: 平塚市・秦野市・伊勢原市・大磯町・二宮町'),
    loc('神奈川県 鎌倉三浦地域児童相談所', '14201', '神奈川県横須賀市日の出町1-4-7', 35.279724, 139.677063, '046-828-7050', KN_WD, '担当: 鎌倉市・逗子市・三浦市・葉山町（場所は横須賀市）'),
    loc('神奈川県 小田原児童相談所', '14206', '神奈川県小田原市荻窪350-1', 35.262947, 139.153763, '0465-32-8000', KN_WD, '担当: 小田原市・南足柄市・中井町・大井町・松田町・開成町・山北町・箱根町・真鶴町・湯河原町'),
    loc('神奈川県 厚木児童相談所', '14212', '神奈川県厚木市水引2-11-7', 35.449062, 139.357178, '046-240-6430', KN_WD, '担当: 厚木市・海老名市・座間市・愛川町・清川村'),
    loc('神奈川県 綾瀬児童相談所', '14218', '神奈川県綾瀬市深谷中4-2-1', 35.437614, 139.430511, '0467-78-2110', KN_WD, '担当: 大和市・綾瀬市'),
    loc('横浜市 中央児童相談所', '14100', '神奈川県横浜市南区浦舟町3-44-2', 35.434162, 139.626358, '045-260-6510', '平日 8:45–17:00', '担当: 西区・中区・南区'),
    loc('横浜市 東部児童相談所', '14100', '神奈川県横浜市鶴見区生麦3-15-30', 35.492966, 139.669830, '045-633-4720', '', '担当: 鶴見区・神奈川区'),
    loc('横浜市 西部児童相談所', '14100', '神奈川県横浜市保土ケ谷区川辺町5-10', 35.458832, 139.596054, '045-331-5471', '平日 8:45–17:00', '担当: 保土ケ谷区・旭区・泉区・瀬谷区'),
    loc('横浜市 南部児童相談所', '14100', '神奈川県横浜市港南区丸山台1-9-10', 35.399590, 139.573257, '045-349-0122', '平日 8:45–17:00', '担当: 港南区・磯子区・金沢区・戸塚区・栄区'),
    loc('横浜市 北部児童相談所', '14100', '神奈川県横浜市都筑区茅ケ崎中央32-1', 35.544849, 139.570541, '045-948-2441', '平日 8:45–17:00', '担当: 港北区・緑区・青葉区・都筑区'),
    loc('川崎市 南部児童相談所（中央児童相談所）', '14130', '神奈川県川崎市幸区鹿島田1-21-9', 35.553307, 139.675125, '044-542-1234', '', '担当: 川崎区・幸区・中原区'),
    loc('川崎市 中部児童相談所', '14130', '神奈川県川崎市高津区久本1-4-1', 35.597900, 139.610458, '044-877-8111', '', '担当: 高津区・宮前区'),
    loc('川崎市 北部児童相談所', '14130', '神奈川県川崎市多摩区生田7-16-2', 35.616615, 139.542236, '044-931-4300', '', '担当: 多摩区・麻生区'),
    loc('相模原市 児童相談所', '14150', '神奈川県相模原市中央区淵野辺2-7-2', 35.575455, 139.394653, '042-730-3500', '平日 8:30–17:00', '担当: 相模原市'),
    loc('横須賀市 児童相談所', '14201', '神奈川県横須賀市小川町16', 35.282032, 139.673431, '046-820-2323', '平日 8:30–17:00', '担当: 横須賀市')
  ];

  var ST_WD = '平日 8:30–18:15';
  var ST_JISOU_LOCS = [
    loc('埼玉県 中央児童相談所', '11219', '埼玉県上尾市上尾村1242-1', 35.983387, 139.597961, '048-775-4152', ST_WD, '担当: 鴻巣市・上尾市・桶川市・久喜市・北本市・蓮田市・白岡市・伊奈町'),
    loc('埼玉県 南児童相談所', '11203', '埼玉県川口市芝下1-1-56', 35.834953, 139.700180, '048-262-4152', ST_WD, '担当: 川口市・蕨市・戸田市'),
    loc('埼玉県 朝霞児童相談所', '11227', '埼玉県朝霞市青葉台1-10-63', 35.790455, 139.592300, '048-465-4152', ST_WD, '担当: 朝霞市・志木市・和光市・新座市・富士見市・ふじみ野市・三芳町'),
    loc('埼玉県 川越児童相談所', '11201', '埼玉県川越市宮元町33-1', 35.931908, 139.483292, '049-223-4152', ST_WD, '担当: 川越市・東松山市・坂戸市・鶴ヶ島市・毛呂山町・越生町・滑川町・嵐山町・小川町・川島町・吉見町・鳩山町・ときがわ町・東秩父村'),
    loc('埼玉県 所沢児童相談所', '11208', '埼玉県所沢市並木1-9-2', 35.800167, 139.473694, '04-2992-4152', ST_WD, '担当: 所沢市・飯能市・狭山市・入間市・日高市'),
    loc('埼玉県 熊谷児童相談所', '11202', '埼玉県熊谷市箱田5-13-1', 36.150463, 139.392441, '048-521-4152', ST_WD, '担当: 熊谷市・行田市・秩父市・加須市・本庄市・羽生市・深谷市・横瀬町・皆野町・長瀞町・小鹿野町・美里町・神川町・上里町・寄居町'),
    loc('埼玉県 越谷児童相談所', '11222', '埼玉県越谷市恩間402-1', 35.924702, 139.769913, '048-975-4152', ST_WD, '担当: 春日部市・越谷市・幸手市・宮代町・杉戸町・松伏町'),
    loc('埼玉県 草加児童相談所', '11221', '埼玉県草加市西町425-2', 35.829227, 139.795563, '048-920-4152', ST_WD, '担当: 草加市・八潮市・三郷市・吉川市'),
    loc('さ\u2060い\u2060た\u2060ま市 北部児童相談所', '11100', '埼玉県さ\u2060い\u2060た\u2060ま市浦和区上木崎4-4-10 さ\u2060い\u2060た\u2060ま市子ども家庭総合センター「あいぱれっと」4階', 35.886208, 139.643616, '048-711-3917', '', '担当: 西区・北区・大宮区・見沼区・岩槻区'),
    loc('さ\u2060い\u2060た\u2060ま市 南部児童相談所', '11100', '埼玉県さ\u2060い\u2060た\u2060ま市浦和区上木崎4-4-10 さ\u2060い\u2060た\u2060ま市子ども家庭総合センター「あいぱれっと」4階', 35.886208, 139.643616, '048-711-2489', '', '担当: 中央区・桜区・浦和区・南区・緑区（北部と同じ建物）')
  ];

  var CB_WD = '平日 9:00–17:00';
  var CB_JISOU_LOCS = [
    loc('千葉県 中央児童相談所', '12100', '千葉県千葉市稲毛区天台6-5-2', 35.641174, 140.116058, '043-253-4101', CB_WD, '担当: 習志野市・市原市・八千代市'),
    loc('千葉県 市川児童相談所', '12203', '千葉県市川市東大和田2-8-6', 35.715389, 139.924316, '047-370-1077', CB_WD, '担当: 市川市・浦安市'),
    loc('千葉県 松戸児童相談所', '12207', '千葉県松戸市高塚新田92-18', 35.759411, 139.942276, '047-710-0270', CB_WD, '担当: 松戸市・鎌ケ谷市（令和8年9月14日開所）'),
    loc('千葉県 柏児童相談所', '12217', '千葉県柏市根戸445-12', 35.884338, 139.983963, '04-7131-7175', CB_WD, '担当: 野田市・柏市・流山市・我孫子市'),
    loc('千葉県 柏児童相談所 柏末広支所', '12217', '千葉県柏市末広町11-18', 35.865093, 139.971832, '04-7147-5455', CB_WD, '担当: 柏市（一時保護の仕事はのぞく）'),
    loc('千葉県 印旛児童相談所', '12231', '千葉県印西市牧の原6-2-3', 35.803318, 140.173294, '0476-94-7500', CB_WD, '担当: 成田市・佐倉市・四街道市・八街市・印西市・白井市・富里市・酒々井町・栄町（令和8年4月20日開所）'),
    loc('千葉県 銚子児童相談所', '12202', '千葉県銚子市台町2183', 35.722996, 140.823303, '0479-23-0076', CB_WD, '担当: 銚子市・旭市・匝瑳市・香取市・香取郡'),
    loc('千葉県 東上総児童相談所', '12210', '千葉県茂原市高師3007-6', 35.436390, 140.294022, '0475-27-1733', CB_WD, '担当: 茂原市・東金市・勝浦市・山武市・いすみ市・大網白里市・山武郡・長生郡・夷隅郡'),
    loc('千葉県 君津児童相談所', '12225', '千葉県君津市中野4-18-9', 35.334080, 139.890182, '0439-55-3100', CB_WD, '担当: 館山市・木更津市・鴨川市・君津市・富津市・袖ケ浦市・南房総市・安房郡'),
    loc('千葉市 東部児童相談所', '12100', '千葉県千葉市美浜区高浜3-2-3', 35.620163, 140.065643, '043-277-8820', '平日 9:00–16:30（12:00–13:00 をのぞく）', '担当: 中央区・若葉区・緑区'),
    loc('千葉市 西部児童相談所', '12100', '千葉県千葉市美浜区高浜3-3-1 はまのわ3階', 35.621181, 140.066772, '043-277-8821', '平日 9:00–16:30（12:00–13:00 をのぞく）', '担当: 花見川区・稲毛区・美浜区'),
    loc('船橋市 児童相談所', '12204', '千葉県船橋市若松2-3-61', 35.679062, 139.997162, '047-409-2234', '', '担当: 船橋市（令和8年7月1日開所）')
  ];

  /* ───────── くらし・しごとの相談窓口（自立相談支援機関）の場所 ───────── */
  var YK_WD = '平日 8:45–17:00';
  function yk(ward, addr, lat, lng, phone) {
    return loc('横浜市 ' + ward + '役所 生活支援課（生活支援係）', '14100', '神奈川県横浜市' + ward + addr, lat, lng, phone, YK_WD, ward + 'に住む人の窓口');
  }
  var YK_LOCS = [
    yk('鶴見区', '鶴見中央3-20-1', 35.508606, 139.681915, '045-510-1782'),
    yk('神奈川区', '広台太田町3-8', 35.476830, 139.629440, '045-411-7103'),
    yk('西区', '中央1-5-10', 35.453632, 139.616882, '045-320-8407'),
    yk('中区', '日本大通35', 35.444958, 139.641998, '045-224-8241'),
    yk('南区', '浦舟町2-33', 35.434521, 139.627686, '045-341-1203'),
    yk('港南区', '港南4-2-10', 35.401218, 139.593277, '045-847-8404'),
    yk('保土ケ谷区', '川辺町2-9', 35.460640, 139.595428, '045-334-6314'),
    yk('旭区', '鶴ケ峰1-4-12', 35.474888, 139.544846, '045-954-6104'),
    yk('磯子区', '磯子3-5-1', 35.402821, 139.618546, '045-750-2405'),
    yk('金沢区', '泥亀2-9-1', 35.337433, 139.624435, '045-788-7814'),
    yk('港北区', '大豆戸町26-1', 35.518993, 139.633163, '045-540-2329'),
    yk('緑区', '寺山町118', 35.511959, 139.537979, '045-930-2318'),
    yk('青葉区', '市ケ尾町31-4', 35.553493, 139.536621, '045-978-2446'),
    yk('都筑区', '茅ケ崎中央32-1', 35.544849, 139.570541, '045-948-2311'),
    yk('戸塚区', '戸塚町16-17', 35.400028, 139.532776, '045-866-8431'),
    yk('栄区', '桂町303-19', 35.364349, 139.553375, '045-894-8400'),
    yk('泉区', '和泉中央北5-1-1', 35.418259, 139.488937, '045-800-2305'),
    yk('瀬谷区', '二ツ橋町190', 35.466015, 139.498642, '045-367-5705')
  ];

  var SC_WD = '平日 9:00–17:00（初めての相談は16:30までに）';
  function sc(ward, addr, lat, lng, phone) {
    return loc('さ\u2060い\u2060た\u2060ま市 ' + ward + ' 福祉まるごと相談窓口（' + ward + '役所 福祉課内）', '11100', '埼玉県さ\u2060い\u2060た\u2060ま市' + ward + addr, lat, lng, phone, SC_WD, '');
  }
  var SC_LOCS = [
    sc('西区', '西大宮3-4-2', 35.925182, 139.579498, '048-620-2656'),
    sc('北区', '宮原町1-852-1', 35.931389, 139.620361, '048-669-6056'),
    sc('大宮区', '吉敷町1-124-1', 35.901691, 139.630554, '048-646-3065'),
    sc('見沼区', '堀崎町12-36', 35.937374, 139.651810, '048-681-6058'),
    sc('中央区', '下落合5-7-10', 35.883789, 139.626755, '048-840-6052'),
    sc('桜区', '道場4-3-1', 35.856750, 139.610306, '048-856-6261'),
    sc('浦和区', '常盤6-4-4', 35.860851, 139.645523, '048-829-6196'),
    sc('南区', '別所7-20-1', 35.845428, 139.645584, '048-844-7161'),
    sc('緑区', '大字中尾975-1', 35.871410, 139.683929, '048-712-1162'),
    sc('岩槻区', '本町3-2-5', 35.950104, 139.693756, '048-790-0191')
  ];

  var CC_WD = '平日 9:00–17:00';
  function cc(name, addr, lat, lng, phone) {
    return loc('千葉市 生活自立・仕事相談センター' + name, '12100', '千葉県千葉市' + addr, lat, lng, phone, CC_WD, '千葉市に住んでいれば、どのセンターでも相談できます');
  }
  var CC_LOCS = [
    cc('中央', '中央区中央4-5-1 きぼーる15階', 35.607548, 140.122330, '043-202-5563'),
    cc('花見川', '花見川区瑞穂1-1 花見川保健福祉センター1階', 35.663074, 140.068405, '043-307-6765'),
    cc('稲毛', '稲毛区穴川4-12-4 稲毛保健福祉センター3階', 35.636635, 140.105453, '043-207-7070'),
    cc('若葉', '若葉区貝塚2-19-1 若葉保健福祉センター3階', 35.633301, 140.155243, '043-312-1723'),
    cc('緑', '緑区鎌取町226-1 緑保健福祉センター2階', 35.566963, 140.175415, '043-293-1133'),
    cc('美浜', '美浜区真砂5-15-2 美浜保健福祉センター2階', 35.641068, 140.062286, '043-270-5811')
  ];

  /* 窓口が県（県から委託された団体）になる町村 */
  var KN_TOWN_CODES = ['14301', '14321', '14341', '14342', '14361', '14362', '14363', '14364', '14366', '14382', '14383', '14384', '14401', '14402'];
  var ST_TOWN_CODES = ['11301', '11324', '11326', '11327', '11341', '11342', '11343', '11346', '11347', '11348', '11349', '11361', '11362', '11363', '11365', '11369', '11381', '11383', '11385', '11408', '11442', '11464', '11465'];
  var CB_TOWN_CODES = ['12322', '12329', '12342', '12347', '12349', '12403', '12409', '12410', '12421', '12422', '12423', '12424', '12426', '12427', '12441', '12443', '12463'];
  /* 神奈川県で、横浜市・川崎市・相模原市・横須賀市をのぞく市町村（県の児童相談所の担当区域） */
  var KN_KEN_AREA = ['14203', '14204', '14205', '14206', '14207', '14208', '14210', '14211', '14212', '14213', '14214', '14215', '14216', '14217', '14218'].concat(KN_TOWN_CODES);

  /* ───────── 自立相談支援（くらしとしごとの相談）の共通部分 ───────── */
  var KONKYU_ASK = [
    '施設（里親家庭）を出たばかりで、生活費と家賃が心配です。使える制度はありますか？',
    '住居確保給付金（家賃の給付金）の対象になるか、調べてもらえますか？',
    'お金のやりくりの相談（家計の相談）もできますか？'
  ];
  var KONKYU_SUP = '生活困窮者自立支援法にもとづく自立相談支援機関。住居確保給付金・家計改善支援・就労準備支援などの入口。社会的養護経験者で住まいや家計に不安がある場合、早めの同行がおすすめ。';
  var KONKYU_FOOT = '相談しただけでお金がもらえるわけではありません。でも、使える制度をいっしょに探してくれる「最初の入口」です。';

  SM.data.programs.push(

    /* ═══════════════════════ 神奈川県 ═══════════════════════ */

    {
      id: 'kanagawa-jiritsu-shikin',
      name: { ja: '自立支援資金貸付（神奈川県）', en: 'Independence Support Loan (Kanagawa)' },
      hook: { ja: '家賃や生活費の支えがほしい', en: 'I need help with rent and living costs' },
      summary: {
        ja: '進学した人は生活費（月5万円）と家賃を、働く人は家賃を、利息なしで借りられます。決まった年数働けば、返さなくてよくなります。神奈川県では神奈川県社会福祉協議会が窓口です。',
        en: 'Interest-free loans for living costs (¥50k/month for students) and rent, forgiven after working for a set number of years. In Kanagawa, run by the Kanagawa Council of Social Welfare.'
      },
      cat: ['money', 'housing'],
      kind: 'loan_forgivable', basis: 'pref', pref: '14', right: false,
      amount: {
        ja: '生活費 月5万円（進学した人）・家賃（住む地域の生活保護の住宅扶助額まで）・資格をとる費用 25万円まで',
        en: 'Living ¥50k/month (students); rent up to the local welfare housing allowance; licences up to ¥250k'
      },
      repay: 'conditional',
      who: {
        ja: '神奈川県内の児童養護施設・児童自立支援施設・児童心理治療施設・自立援助ホームを出た人（入所中の人も）、里親・ファミリーホームの委託が終わった人（委託中の人も）で、親などからお金の支えがない人。出てから5年以内の人。'
      },
      how: {
        ja: '自分では申し込めません。施設を出た人は施設を通して、里親家庭を出た人は児童相談所を通して申し込みます。まず施設や児童相談所の担当の人に相談しよう。'
      },
      where: { ja: '施設・児童相談所の担当の人 → 神奈川県社会福祉協議会' },
      docs: ['貸付申請書', '施設長または児童相談所長の意見書（施設・児童相談所が用意）', '住民票（マイナンバーなし・3か月以内）', '個人情報の取り扱いの同意書', '在学証明書または合格証明書（進学した人）', '家賃がわかる賃貸借契約書のコピー', '在職証明書や内定通知書（働く人）'],
      ask: ['自立支援資金貸付を使いたいです。私は対象になりますか？', '返さなくてよくなる条件を教えてください', '連帯保証人がいないときはどうなりますか？'],
      caution: {
        ja: '返さなくてよくなるには、進学した人は卒業してから1年以内に就職して5年間、働く人は5年間（資格の費用は2年間）、働き続けることが必要です。そのあいだ出す書類も多く、出さないと返すことになります。働く人の家賃は、出てから2年までです。'
      },
      supporter: {
        ja: '神奈川県社会福祉協議会「神奈川県児童養護施設退所者等自立支援資金貸付の手引き」（令和6年7月改訂版）による。無利子（延滞時は年3%）。連帯保証人は原則1名だが、立てられない場合も貸付可能。生活支援費・家賃支援費は毎月15日振込、資格取得支援費は一括。定期通院がある進学者は医療費の実費（月35,400円上限・2年まで）を生活支援費に追加可。大学院・職業能力開発促進法の学校（例: 県立産業技術短期大学校）は対象外。就職者の5年の起算は令和3年12月20日以降の貸付けでは貸付開始月。施設・児童相談所以外からの申請は受け付けない。'
      },
      effort: 'high',
      for: { stages: LEAVERS, paths: [], care: CARE, careOnly: true, age: null, areas: ['14'] },
      deadline: {
        ja: '出る日が決まったら早めに。出てから5年以内まで申し込めます。',
        en: 'Start early once your leaving date is set; available up to 5 years after leaving.',
        leaveMonths: -3, months: null, always: false
      },
      contact: {
        phone: '045-311-8753', phoneLabel: '神奈川県社会福祉協議会 福祉サービス推進課', line: null, chat: null, web: KN_JIRITSU,
        hours: { ja: '8時30分〜17時15分', en: '8:30–17:15' }
      },
      locations: [],
      source: { org: '神奈川県社会福祉協議会（自立支援資金貸付の手引き 令和6年7月改訂版）', url: KN_JIRITSU, checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'kanagawa-asunaro',
      name: { ja: 'あ\u2060す\u2060な\u2060ろサポートステーション（神奈川県）', en: 'Asunaro Support Station (Kanagawa)' },
      hook: { ja: '出たあとも、たよれる場所と人がほしい', en: 'I want a place and people to rely on after leaving care' },
      summary: {
        ja: '施設や里親家庭で育った人のための、神奈川県の拠点です。くらし・仕事の相談、役所や病院への付きそい、手づくりのごはんがあり、住む場所に困ったときは短いあいだ住める部屋もあります。',
        en: 'Kanagawa\'s base for people who grew up in care: help with daily life and work, someone to go with you to offices or hospitals, home-cooked meals, and a short-stay room if you lose your place to live.'
      },
      cat: ['consult', 'housing', 'work'],
      kind: 'place', basis: 'npo', pref: '14', right: false,
      amount: { ja: '相談・ごはんは無料', en: 'Free (talks and meals)' }, repay: null,
      who: { ja: '施設や里親家庭などで育った人（社会的養護の経験がある人）。虐待をうけた経験があるのに、これまで支援につながらなかった人も。' },
      how: { ja: 'まず電話かホームページのフォームで連絡します。来て話すだけでなく、家に来てもらう相談や、役所・病院・法律事務所への付きそいもあります。' },
      where: { ja: '藤沢市辻堂（本部）・海老名市（県央ブランチ）' },
      docs: [],
      ask: ['初めてです。話を聞いてもらうだけでも行っていいですか？', '役所の手続きに、いっしょに行ってもらえますか？', '住むところがなくなりそうです。しばらく泊まれる部屋はありますか？'],
      caution: { ja: '横浜市・相模原市・横須賀市には、それぞれの市の拠点があります（このアプリの別のページ）。県央ブランチは月・水・金だけ開いています。' },
      supporter: { ja: '社会福祉法人白十字会林間学校が神奈川県から受託（平成26年〜）。社会的養護自立支援拠点事業。県域の各施設に窓口となる「あ\u2060す\u2060な\u2060ろサポーター」を配置。継続支援計画の作成、医療連携・法律相談、就労支援、一時居住支援（県央ブランチ）など10部門。メール shonan.asunaro@gmail.com（本部）。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: CARE, careOnly: false, age: null, areas: ['14'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '0466-54-8917', phoneLabel: 'あ\u2060す\u2060な\u2060ろサポートステーション（本部）', line: null, chat: 'https://shonan-asunaro.com/contact', web: ASUNARO,
        hours: { ja: '平日 10時〜17時／土曜 13時〜20時', en: 'Weekdays 10–17, Sat 13–20' }
      },
      locations: [
        loc('あ\u2060す\u2060な\u2060ろサポートステーション（本部）', '14205', '神奈川県藤沢市辻堂1-4-19 SURF 502', 35.336052, 139.449112, '0466-54-8917', '平日 10:00–17:00／土 13:00–20:00', ''),
        loc('あ\u2060す\u2060な\u2060ろ県央ブランチ', '14215', '神奈川県海老名市国分南3-16-19 第10三幸ビル302号室', 35.447796, 139.399933, '046-205-4633', '月・水・金 10:00–17:00（来所受付 15:00–17:00）', '県央地域の人向け。一時的に住める部屋あり')
      ],
      source: { org: '社会福祉法人白十字会林間学校 あ\u2060す\u2060な\u2060ろサポートステーション', url: ASUNARO, checked: C },
      verifiedBy: V
    },

    {
      id: 'sagamihara-asunaro',
      name: { ja: 'あ\u2060す\u2060な\u2060ろサポートステーション さ\u2060が\u2060み\u2060は\u2060ら', en: 'Asunaro Support Station Sagamihara' },
      hook: { ja: 'くらしや仕事のこと、相模原で相談したい', en: 'I want to talk about daily life or work in Sagamihara' },
      summary: {
        ja: '相模原市が開いた、施設や里親家庭で育った人のための拠点です。くらしの相談、仕事の相談、これからの計画づくりを手伝ってくれます。',
        en: 'Sagamihara City\'s base for people who grew up in care: help with daily life, work and making a plan for what comes next.'
      },
      cat: ['consult', 'work'],
      kind: 'place', basis: 'local', pref: '14', right: false,
      amount: null, repay: null,
      who: { ja: '施設や里親家庭などで育った人（相模原市の社会的養護自立支援拠点事業の対象の人）。' },
      how: { ja: 'まず電話かメールで連絡します。' },
      where: { ja: '相模原市緑区橋本（橋本第2エステート301）' },
      docs: [],
      ask: ['初めてです。どんなことを相談できますか？', '仕事さがしも手伝ってもらえますか？'],
      caution: { ja: '土曜は月1回だけ開いています。日にちは電話で聞いてください。' },
      supporter: { ja: '相模原市の社会的養護自立支援拠点事業（令和7年7月1日開所、運営: 社会福祉法人白十字会林間学校）。相模原市発表資料（令和7年6月24日）と運営法人ページで確認。メール sagamihara.asunaro@gmail.com。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: CARE, careOnly: false, age: null, areas: ['14150'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '042-703-5566', phoneLabel: 'あ\u2060す\u2060な\u2060ろサポートステーション さ\u2060が\u2060み\u2060は\u2060ら', line: null, chat: null, web: ASUNARO,
        hours: { ja: '平日 10時〜17時（土曜は月1回）', en: 'Weekdays 10–17 (one Saturday a month)' }
      },
      locations: [
        loc('あ\u2060す\u2060な\u2060ろサポートステーション さ\u2060が\u2060み\u2060は\u2060ら', '14150', '神奈川県相模原市緑区橋本6-38-8 橋本第2エステート301', 35.598038, 139.339966, '042-703-5566', '平日 10:00–17:00', '土曜は月1回開所')
      ],
      source: { org: '社会福祉法人白十字会林間学校 あ\u2060す\u2060な\u2060ろサポートステーション', url: ASUNARO, checked: C },
      sources2: [{ org: '相模原市（発表資料 令和7年6月24日）', url: 'https://www.city.sagamihara.kanagawa.jp/_res/projects/default_project/_page_/001/033/183/0624/01.pdf' }],
      verifiedBy: V
    },

    {
      id: 'yokosuka-asunaro',
      name: { ja: 'あ\u2060す\u2060な\u2060ろサポートステーション よ\u2060こ\u2060す\u2060か', en: 'Asunaro Support Station Yokosuka' },
      hook: { ja: '横須賀で、話せる場所がほしい', en: 'I want a place to talk in Yokosuka' },
      summary: {
        ja: '横須賀市から頼まれて開いている、施設や里親家庭で育った人のための拠点です。2026年1月に開きました。',
        en: 'A base for people who grew up in care, run for Yokosuka City. Opened in January 2026.'
      },
      cat: ['consult'],
      kind: 'place', basis: 'local', pref: '14', right: false,
      amount: null, repay: null,
      who: { ja: '施設や里親家庭などで育った人（横須賀市の社会的養護自立支援拠点事業の対象の人）。' },
      how: { ja: 'まず電話かメールで連絡します。' },
      where: { ja: '横須賀市汐入町（汐入駅の近く）' },
      docs: [],
      ask: ['初めてです。いつ行けますか？', 'どんなことを相談できますか？'],
      caution: { ja: '月・水・金だけ開いています。' },
      supporter: { ja: '横須賀市委託 社会的養護自立支援拠点事業（令和7年10月受託、令和8年1月開所。運営: 社会福祉法人白十字会林間学校）。メール yokosuka.asunaro0107@gmail.com。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: CARE, careOnly: false, age: null, areas: ['14201'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '046-845-9492', phoneLabel: 'あ\u2060す\u2060な\u2060ろサポートステーション よ\u2060こ\u2060す\u2060か', line: null, chat: null, web: ASUNARO,
        hours: { ja: '月・水・金 10時〜17時', en: 'Mon/Wed/Fri 10–17' }
      },
      locations: [
        loc('あ\u2060す\u2060な\u2060ろサポートステーション よ\u2060こ\u2060す\u2060か', '14201', '神奈川県横須賀市汐入町1-6 ガーベラマンション汐入201', 35.283199, 139.658005, '046-845-9492', '月・水・金 10:00–17:00', '')
      ],
      source: { org: '社会福祉法人白十字会林間学校 あ\u2060す\u2060な\u2060ろサポートステーション', url: ASUNARO, checked: C },
      verifiedBy: V
    },

    {
      id: 'yokohama-b4s-port',
      name: { ja: 'B4S PORT よ\u2060こ\u2060は\u2060ま（横浜市の居場所）', en: 'B4S PORT Yokohama (drop-in space)' },
      hook: { ja: '気軽に寄れる場所と、人に聞かれたくない相談先がほしい', en: 'I want a place to drop by and somewhere to talk privately' },
      summary: {
        ja: '横浜市から頼まれてブリッジフォースマイルが開いている居場所です。横浜駅から歩いて5分。いっしょにごはんを作って食べたり、1対1で相談（1回30分）したりできます。',
        en: 'A drop-in space run by Bridge for Smile for Yokohama City, 5 minutes from Yokohama Station. Cook and eat together, or book a private 30-minute talk.'
      },
      cat: ['consult'],
      kind: 'place', basis: 'npo', pref: '14', right: false,
      amount: { ja: '基本無料（夕ごはん 300円）', en: 'Free (dinner ¥300)' }, repay: null,
      who: { ja: '施設や里親家庭でくらした経験がある人。児童相談所に保護されたことがある人。親からひどい扱いを受けている（受けた）人。' },
      how: { ja: 'LINEで予約してから行きます（LINE ID: @692pshfg）。初めての日に利用登録をします。個別相談は電話・メール・LINEで予約します。' },
      where: { ja: '横浜市西区高島（横浜駅 東口から歩いて5分）' },
      docs: [],
      ask: ['初めて行きたいです。いつ予約できますか？', '1対1で相談したいです。空いている日時はありますか？'],
      caution: { ja: '開いているのは金・土・日・祝日の14時〜20時です。予約が必要です。' },
      supporter: { ja: '横浜市 社会的養護自立支援拠点事業の委託事業者（特定非営利活動法人ブリッジフォースマイル）。2012年から運営。相談予約電話は開所日 045-548-8011、問い合わせ 03-6842-6766、メール y.port4@b4s.jp。市の担当: こども青少年局 こどもの権利擁護課 045-671-2394。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: CARE, careOnly: false, age: null, areas: ['14'] },
      deadline: { ja: 'いつでも（予約制）', en: 'Anytime (booking needed)', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '045-548-8011', phoneLabel: 'B4S PORT よ\u2060こ\u2060は\u2060ま（相談予約・開所日）', line: null, chat: null, web: 'https://www.b4s.jp/ypf/',
        hours: { ja: '金・土・日・祝 14時〜20時', en: 'Fri/Sat/Sun/holidays 14–20' }
      },
      locations: [
        loc('B4S PORT よ\u2060こ\u2060は\u2060ま', '14100', '神奈川県横浜市西区高島2-5-5 ハイツ横浜203号', 35.461960, 139.622452, '045-548-8011', '金・土・日・祝 14:00–20:00', '予約制（LINE）。横浜駅東口から歩いて5分')
      ],
      source: { org: '認定NPO法人ブリッジフォースマイル', url: 'https://www.b4s.jp/ypf/', checked: C },
      sources2: [{ org: '横浜市（社会的養護自立支援拠点事業）', url: YK_KYOTEN }],
      verifiedBy: V
    },

    {
      id: 'kawasaki-jiritsu-kyoten',
      name: { ja: '川崎市 社会的養護自立支援拠点事業（相談支援）', en: 'Kawasaki Support for Care Leavers' },
      hook: { ja: '川崎市の施設や里親家庭を出たあと、相談できる人がほしい', en: 'I left care in Kawasaki and want someone to talk to' },
      summary: {
        ja: '川崎市の児童相談所が担当した人に、出たあとのくらしや仕事の相談を続けてくれる市の事業です。出てから5年間使えます。',
        en: 'A Kawasaki City service that keeps supporting people placed by the city\'s child guidance centers, with help on daily life and work for 5 years after leaving.'
      },
      cat: ['consult', 'work'],
      kind: 'service', basis: 'local', pref: '14', right: false,
      amount: null, repay: null,
      who: { ja: '川崎市の児童相談所長が措置した人（里親・施設）。施設などにいる人（原則として中学校を卒業した人）と、出てから5年以内の人。住んでいる場所ではなく、どこの児童相談所が担当したかで決まります。' },
      how: { ja: '市から頼まれている窓口（パソナ 就労支援センター）に電話します。' },
      where: { ja: '川崎市幸区幸町（モリファーストビル7階）' },
      docs: [],
      ask: ['川崎市の施設を出ました。相談支援を使えますか？', '仕事のことも相談できますか？'],
      caution: { ja: '令和9年4月から運営する会社が変わるかもしれません。つながらないときは市の担当（044-200-2929）に聞いてください。' },
      supporter: { ja: '川崎市社会的養護自立支援拠点事業（委託先: 株式会社パソナ 就労支援センター、HP https://kawasaki-yougo.com/）。市担当: こども未来局 児童家庭支援・虐待対策室 044-200-2929。令和9年4月以降の受託事業者は公募予定。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: CARE, careOnly: true, age: null, areas: ['14'] },
      deadline: { ja: '出てから5年以内', en: 'Up to 5 years after leaving', leaveMonths: null, months: null, always: true },
      contact: { phone: '044-271-1414', phoneLabel: 'パソナ 就労支援センター（川崎市の委託）', line: null, chat: null, web: KW_KYOTEN, hours: null },
      locations: [
        loc('川崎市 社会的養護自立支援拠点事業（パソナ 就労支援センター）', '14130', '神奈川県川崎市幸区幸町2-593 モリファーストビル7階', 35.537434, 139.698914, '044-271-1414', '', '川崎市の児童相談所が担当した人向け')
      ],
      source: { org: '川崎市（こども未来局）', url: KW_KYOTEN, checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'kanagawa-jisou',
      name: { ja: '児童相談所（神奈川県内）', en: 'Child Guidance Centers (Kanagawa)' },
      hook: { ja: '施設や里親のこと、家のことを相談したい', jr: '家のことや、こわいことを相談したい', en: 'I want to talk about my care placement or my family' },
      summary: {
        ja: '子どもと家族のことを相談できる公的な窓口です。施設や里親家庭に入ること・出ることも、児童相談所が担当しています。',
        jr: '子どもと家族のことを相談できるところです。お金はかかりません。夜や休みの日は「189」に電話できます。',
        en: 'Public offices for children and families. They are also in charge of placements in and out of care.'
      },
      cat: ['consult', 'procedures'],
      kind: 'service', basis: 'pref', pref: '14', right: false,
      amount: null, repay: null,
      who: { ja: 'おもに18歳未満の子どもと家族。住んでいる市町村で、担当の児童相談所が決まっています。横浜市・川崎市・相模原市・横須賀市は、市の児童相談所です。' },
      how: { ja: '担当の児童相談所に電話します。県の児童相談所は平日8時30分〜17時15分。夜や休日は「189」（児童相談所 虐待対応ダイヤル）へ。' },
      where: { ja: '住んでいる市町村を担当する児童相談所（地図で確認）' },
      docs: [],
      ask: ['施設を出る時期について相談したいです', '担当の児童福祉司さんと話したいです', '18歳をすぎても今のところにいられるか相談できますか？'],
      caution: { ja: '鎌倉市・逗子市・三浦市・葉山町の担当（鎌倉三浦地域児童相談所）は横須賀市にあります。電話番号のかけまちがいに気をつけてね。' },
      supporter: { ja: '神奈川県「児童相談所一覧」（2026年8月6日更新）による。県所管域は横浜・川崎・相模原・横須賀以外の市町村。子ども・家庭110番（県中央児童相談所）0466-84-7000 毎日9〜20時。横浜市の東部児童相談所（鶴見区・神奈川区）は県一覧で確認、受付時間は未確認。川崎市の各児相の受付時間は県一覧に記載なし。' },
      effort: 'low',
      for: { stages: KIDS, paths: [], care: [], careOnly: false, age: null, areas: ['14'] },
      deadline: null,
      contact: {
        phone: '189', phoneLabel: '夜・休日は 189（虐待対応ダイヤル）', line: null, chat: null, web: KN_JISOU,
        hours: { ja: '県の児童相談所: 平日 8時30分〜17時15分', en: 'Prefectural centers: weekdays 8:30–17:15' }
      },
      locations: KN_JISOU_LOCS,
      source: { org: '神奈川県（子ども家庭課）', url: KN_JISOU, checked: C },
      sources2: [{ org: '神奈川県（相談窓口一覧・児童虐待）', url: 'https://www.pref.kanagawa.jp/docs/nx3/cnt/suisinn/soudan-zidou.html' }, { org: '神奈川県（人権・子どもホットライン）', url: KN_HOTLINE }, { org: '神奈川県（県内児童・生徒のための相談窓口一覧）', url: KN_CARD }],
      verifiedBy: V
    },

    {
      id: 'kanagawa-towns-jiritsu-sodan',
      name: { ja: 'ほっとステーション横浜・小田原（神奈川県 町村の くらしの相談）', en: 'Hot Station (Kanagawa towns: living & work support)' },
      hook: { ja: 'お金・仕事・住まいのこと、まとめて相談したい', en: 'I want to talk about money, work and housing in one place' },
      summary: {
        ja: '神奈川県の町や村に住む人のための、お金・仕事・住まいの無料の相談窓口です。県が開いています。電話のあと、家に来てもらって相談を続けることもできます。',
        en: 'A free Kanagawa Prefecture desk for people living in its towns and villages, about money, work and housing. After a phone call, counselors can also visit you at home.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: 'pref', pref: '14', right: false,
      townsOnly: true,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '神奈川県の町村（葉山町・寒川町・大磯町・二宮町・愛川町・清川村・中井町・大井町・松田町・山北町・開成町・箱根町・真鶴町・湯河原町）に住んでいて、生活に困っている人。生活保護を受けている人はのぞきます。' },
      how: { ja: 'まず電話します。電話代がかからないよう、折り返しかけてくれます。窓口に行く前に電話すると、待たずにすみます。家族や支援者からの相談もできます。' },
      where: { ja: '葉山・寒川・大磯・二宮・愛川・清川 → ほっとステーション横浜／中井・大井・松田・山北・開成・箱根・真鶴・湯河原 → ほっとステーション小田原' },
      docs: [],
      ask: KONKYU_ASK,
      caution: { ja: '市に住んでいる人は、市の窓口が担当です。ほっとステーション小田原の電話番号は令和8年4月1日から 0465-20-5085 に変わりました。' + KONKYU_FOOT },
      supporter: { ja: KONKYU_SUP + ' ほっとステーション横浜は神奈川県社会福祉協議会（メール kon@knsyk.jp）、ほっとステーション小田原は労働者協同組合ワーカーズコープ・センター事業団（メール hs-odawara@roukyou.gr.jp）に委託。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: KN_TOWN_CODES },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '045-311-8874', phoneLabel: 'ほっとステーション横浜', line: null, chat: null, web: KN_TOWNS,
        hours: { ja: '平日 9時〜17時', en: 'Weekdays 9:00–17:00' }
      },
      locations: [
        loc('ほっとステーション横浜（神奈川県社会福祉センター内）', '14100', '神奈川県横浜市神奈川区反町3-17-2', 35.474983, 139.626068, '045-311-8874', '平日 9:00–17:00', '担当: 葉山町・寒川町・大磯町・二宮町・愛川町・清川村'),
        loc('ほっとステーション小田原', '14206', '神奈川県小田原市荻窪306', 35.264622, 139.151718, '0465-20-5085', '平日 9:00–17:00', '担当: 中井町・大井町・松田町・山北町・開成町・箱根町・真鶴町・湯河原町')
      ],
      source: { org: '神奈川県（県内の町村にお住まいの方へ）', url: KN_TOWNS, checked: C },
      sources2: [{ org: '神奈川県社会福祉協議会（生活困窮者自立相談支援事業）', url: 'https://www.knsyk.jp/service/konkyu' }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'yokohama-jiritsu-sodan',
      name: { ja: '横浜市 区役所の生活支援課（くらしの相談）', en: 'Yokohama: ward Life Support Sections' },
      hook: { ja: 'お金・仕事・住まいのこと、まとめて相談したい', en: 'I want to talk about money, work and housing in one place' },
      summary: {
        ja: '横浜市に住む人のための、お金・仕事・住まいの無料の相談窓口です。住んでいる区の区役所にあります。仕事さがし、家計の見直し、家賃の給付金（住居確保給付金）などにつないでくれます。',
        en: 'A free desk for Yokohama residents about money, work and housing, in your ward office. They help with job hunting, budgeting and programs such as the Housing Security Benefit.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: 'local', pref: '14', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '横浜市に住んでいて、生活に困っている人。生活保護を受けている人はのぞきます。住むところがない人は、いちばん近い区役所へ。' },
      how: { ja: '住んでいる区の区役所 生活支援課に行きます。まず電話で相談してもOKです。家族からの相談もできます。' },
      where: { ja: '住んでいる区の区役所 生活支援課（地図で確認）' },
      docs: [],
      ask: KONKYU_ASK,
      caution: { ja: '仕事のあっせんはしていませんが、区役所の中のハローワークの窓口と一緒に仕事さがしを手伝ってくれます。' + KONKYU_FOOT },
      supporter: { ja: KONKYU_SUP + ' 横浜市は18区の福祉保健センター生活支援課が窓口（電話番号は市「各区の相談窓口」2025年9月12日更新の生活支援係）。市の担当: 健康福祉局 生活支援課。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['14100'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: null, phoneLabel: null, line: null, chat: null, web: YK_MADO,
        hours: { ja: '平日 8時45分〜17時', en: 'Weekdays 8:45–17:00' }
      },
      locations: YK_LOCS,
      source: { org: '横浜市（生活困窮者自立支援制度）', url: YK_KONKYU, checked: C },
      sources2: [{ org: '横浜市（各区の相談窓口）', url: YK_MADO }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'kawasaki-daijob',
      name: { ja: '川崎市生活自立・仕事相談センター（だいJOBセンター）', en: 'Kawasaki Life & Work Support Center (Dai-JOB Center)' },
      hook: { ja: 'お金・仕事・住まいのこと、まとめて相談したい', en: 'I want to talk about money, work and housing in one place' },
      summary: {
        ja: '川崎市に住む人のための、お金・仕事・住まいの無料の相談窓口です。仕事・心・住まい・家計・法律の専門の人がいて、手続きにいっしょに行ってくれることもあります。',
        en: 'A free desk for Kawasaki residents about money, work and housing, with specialists in jobs, mental health, housing, budgeting and law. They may go with you to complete procedures.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: 'local', pref: '14', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '川崎市に住んでいて、仕事をなくしたなどで生活に困っている人。生活保護を受けている人はのぞきます。' },
      how: { ja: '予約制です。電話かホームページから予約します。オンライン相談もできます。麻生区役所（月）・高津区役所（火）・多摩区役所（水）・宮前区役所（木）にも出張相談があります。' },
      where: { ja: '川崎区駅前本町（川崎フロンティアビル5階・川崎駅から歩いて2分）' },
      docs: [],
      ask: KONKYU_ASK,
      caution: { ja: '予約のある人が先です。住居確保給付金の申請は、窓口で会うか郵送です。' + KONKYU_FOOT },
      supporter: { ja: KONKYU_SUP + ' 川崎市は「だいJOBセンター」1か所（中高年事業団やまて企業組合に委託）。出張相談は各区役所で9〜17時・予約制。市担当: 健康福祉局 生活保護・自立支援室 044-200-0309。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['14130'] },
      deadline: { ja: 'いつでも相談できます（予約制）', en: 'Anytime (booking needed)', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '044-245-5120', phoneLabel: 'だいJOBセンター（予約）', line: null, chat: null, web: KW_DAIJOB,
        hours: { ja: '平日 10時〜18時', en: 'Weekdays 10:00–18:00' }
      },
      locations: [
        loc('川崎市生活自立・仕事相談センター（だいJOBセンター）', '14130', '神奈川県川崎市川崎区駅前本町11-2 川崎フロンティアビル5階', 35.531563, 139.699097, '044-245-5120', '平日 10:00–18:00', '予約制。JR川崎駅・京急川崎駅から歩いて2分')
      ],
      source: { org: '川崎市（健康福祉局）', url: KW_DAIJOB, checked: C },
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'sagamihara-jiritsu-sodan',
      name: { ja: '相模原市 生活としごとの応援 自立支援相談窓口', en: 'Sagamihara Self-reliance Support Desks' },
      hook: { ja: 'お金・仕事・住まいのこと、まとめて相談したい', en: 'I want to talk about money, work and housing in one place' },
      summary: {
        ja: '相模原市に住む人のための、お金・仕事・住まいの無料の相談窓口です。区ごとにあります。来られない人には、家に来て相談することもあります。',
        en: 'Free desks for Sagamihara residents about money, work and housing, one in each ward. Staff can also visit you at home.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: 'local', pref: '14', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '相模原市に住んでいて、生活に困っている人。' },
      how: { ja: '住んでいる区の窓口に電話します。予約した人が先に受け付けてもらえます。緑区は城山・津久井・相模湖・藤野の総合事務所でも出張相談があります（予約制）。' },
      where: { ja: '緑区（シティ・プラザはしもと6階）・中央区（あじさい会館5階）・南区（南保健福祉センター1階）' },
      docs: [],
      ask: KONKYU_ASK,
      caution: { ja: 'お昼（12時〜13時）は休みです。' + KONKYU_FOOT },
      supporter: { ja: KONKYU_SUP + ' 相模原市は3区の自立支援相談窓口。アウトリーチ支援、フードバンク団体と連携した食材支援（相談利用者・月1回）あり。所在地は神奈川県の窓口一覧で補足。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['14150'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: null, phoneLabel: null, line: null, chat: null, web: SG_KONKYU,
        hours: { ja: '平日 9時〜12時・13時〜17時', en: 'Weekdays 9–12, 13–17' }
      },
      locations: [
        loc('相模原市 緑区自立支援相談窓口（市総合就職支援センター内）', '14150', '神奈川県相模原市緑区橋本6-2-1 シティ・プラザはしもと6階', 35.596298, 139.344482, '042-774-1131', '平日 9:00–12:00／13:00–17:00', '緑区に住む人の窓口'),
        loc('相模原市 中央区自立支援相談窓口', '14150', '神奈川県相模原市中央区富士見6-1-20 あじさい会館5階', 35.569698, 139.373367, '042-769-8206', '平日 9:00–12:00／13:00–17:00', '中央区に住む人の窓口'),
        loc('相模原市 南区自立支援相談窓口', '14150', '神奈川県相模原市南区相模大野6-22-1 南保健福祉センター1階', 35.528885, 139.433380, '042-701-7717', '平日 9:00–12:00／13:00–17:00', '南区に住む人の窓口')
      ],
      source: { org: '相模原市（生活困窮者自立支援制度）', url: SG_KONKYU, checked: C },
      sources2: [{ org: '神奈川県（生活困窮者 相談窓口の一覧）', url: KN_KONKYU_LIST }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'kanagawa-shiritsu-gakuhi',
      name: { ja: '私立高校の学費補助金（神奈川県）', en: 'Kanagawa Private High School Tuition Support' },
      hook: { ja: '私立高校に行きたいけど、授業料が高い', jr: '私立高校の授業料が高くて心配', en: 'I want to go to a private high school but tuition is expensive' },
      summary: {
        ja: '国の就学支援金に神奈川県が上乗せして、県内の私立高校の授業料を年48万円まで助けてくれます。所得制限はありません。生活保護・住民税非課税の世帯は、入学金も助けてもらえます。',
        jr: '神奈川県の私立高校の授業料は、国と県で年48万円まで出してもらえます。返さなくていいお金です。申しこみは高校から案内があります。',
        en: 'Kanagawa adds to the national support so private high school tuition is covered up to ¥480,000 a year, with no income limit. Low-income households also get help with the entrance fee.'
      },
      cat: ['education', 'money'],
      kind: 'grant', basis: 'pref', pref: '14', right: false,
      amount: {
        ja: '授業料 国と県あわせて年48万円まで（所得制限なし）・入学金 21万2,000円まで（生活保護・住民税非課税の世帯）',
        en: 'Tuition up to ¥480,000/year with the national support (no income limit); entrance fee up to ¥212,000 for low-income households'
      },
      repay: 'none',
      who: { ja: '神奈川県内の私立高校（中等教育学校の後期課程・専修学校高等課程もふくむ）に通う生徒で、生徒と保護者がどちらも神奈川県に住んでいる人。国の就学支援金などをもらえる人。' },
      how: { ja: '通っている高校を通して申しこみます。6月ごろ学校から案内があるので、学校の締切までに書類を出します。' },
      where: { ja: '通っている私立高校' },
      docs: ['学校から配られる申請書類'],
      ask: ['私の学校の授業料だと、国と県でいくらまで助けてもらえますか？', '申しこみの締切はいつですか？', '奨学給付金（教科書代など）もいっしょに申しこめますか？'],
      caution: { ja: '県の補助は神奈川県内にある私立高校が対象です。補助のしかた（授業料から引く・あとで振りこむ）や時期は学校によってちがいます。' },
      supporter: { ja: '神奈川県 私学振興課（助成グループ 045-210-3793、平日8:30〜12:00・13:00〜17:15）。令和8年度は授業料補助＝就学支援金等（国）＋学費補助金（県）≦48万円。授業料全額免除の場合は対象外。外国籍等で就学支援金新制度の対象外の生徒には別リーフレットあり。中3の進路相談で「私立でも授業料は国＋県で年48万円まで」と伝えると選択肢が広がる。' },
      effort: 'mid',
      for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['14'] },
      deadline: {
        ja: '毎年6月ごろ、学校から案内があります',
        en: 'Your school sends the forms around June each year',
        leaveMonths: null, months: [6], always: false
      },
      contact: {
        phone: '045-210-3793', phoneLabel: '神奈川県 私学振興課 助成グループ', line: null, chat: null, web: KN_GAKUHI,
        hours: { ja: '平日 8時30分〜12時・13時〜17時15分', en: 'Weekdays 8:30–12:00, 13:00–17:15' }
      },
      locations: [],
      source: { org: '神奈川県（私立学校学費支援制度のご紹介）', url: KN_GAKUHI, checked: C },
      sources2: [{ org: '神奈川県（学費補助金について）', url: 'https://www.pref.kanagawa.jp/docs/v3e/jyosei/gakuhisien/gakuhihojyo.html' }],
      verifiedBy: V
    },

    {
      id: 'kanagawa-koko-shogakukin',
      name: { ja: '神奈川県高等学校奨学金（貸付）', en: 'Kanagawa High School Scholarship Loan' },
      hook: { ja: '高校の生活費や教材費が足りない', jr: '高校に行くお金が足りるか心配', en: 'I need money for high school costs' },
      summary: {
        ja: '高校生に毎月お金を貸してくれる神奈川県の奨学金です。利息はありません。高校を卒業して6か月たってから返します。中3のうちに予約もできます。',
        jr: '高校生になったら毎月お金を借りられる、神奈川県の奨学金です。利息はありませんが、あとで返すお金です。中3の秋〜冬に予約できます。',
        en: 'A Kanagawa interest-free monthly loan for high school students, repaid starting 6 months after graduation. Junior high third-years can apply in advance.'
      },
      cat: ['education', 'money'],
      kind: 'loan', basis: 'pref', pref: '14', right: false,
      amount: {
        ja: '月1万〜3万円（国公立）／月1万〜5万円（私立）から選ぶ（新入生の場合）',
        en: '¥10k–30k/month (public) or ¥10k–50k/month (private), your choice (first-year amounts)'
      },
      repay: 'yes',
      who: { ja: '神奈川県に住んで県内の高校に通う生徒、または保護者が神奈川県に住んでいて高校・専修学校高等課程に通う生徒。' },
      how: { ja: '中3の人は「予約採用」に、中学校を通して申しこみます。高校生は4月の「定期採用」に高校を通して申しこみます（年度の途中は「随時採用」）。' },
      where: { ja: '中学校・高校の奨学金の担当の先生 → 神奈川県教育委員会 財務課' },
      docs: ['願書（学校で配られます）', '貸付が決まったあと、連帯保証人の印鑑登録証明書'],
      ask: ['予約採用の申しこみ方を教えてください', '連帯保証人を2人立てられないときは、どうすればいいですか？', '返すのはいつから、毎月いくらくらいですか？'],
      caution: { ja: '返すお金です。連帯保証人が原則2人（保護者1人と、別にくらす大人1人）必要です。2人目が立てられないときは、県の高校奨学金グループに相談できます。' },
      supporter: { ja: '神奈川県教育委員会 財務課 高校奨学金グループ 045-210-8251。令和9年度入学者向け予約採用は令和8年11月2日〜令和9年1月15日。予約採用者は希望により高校入学前の3月に一部前倒し（短期臨時奨学金）。2年生以上は上限が1万円下がるが申請（要件あり）で新入生と同額可。返還は卒業6か月後から貸付期間の4倍以内、無利息。大学進学等で返還猶予、一定条件で免除あり。社会的養護の子どもは保証人要件が壁になりやすいので、施設・児相と早めに相談を。' },
      effort: 'mid',
      for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['14'] },
      deadline: {
        ja: '中3の予約採用は令和8年11月2日〜令和9年1月15日。高校生の定期採用は4月（随時採用は1月末まで）',
        en: 'Advance applications Nov 2, 2026 – Jan 15, 2027; high school students apply in April (rolling until end of January)',
        leaveMonths: null, months: [11, 12, 1, 4], always: false
      },
      contact: {
        phone: '045-210-8251', phoneLabel: '神奈川県教育委員会 財務課 高校奨学金グループ', line: null, chat: null, web: KN_SHOGAKU,
        hours: null
      },
      locations: [],
      source: { org: '神奈川県教育委員会（神奈川県高等学校奨学金）', url: KN_SHOGAKU, checked: C },
      sources2: [{ org: '神奈川県教育委員会（奨学金の概要PDF）', url: 'https://www.pref.kanagawa.jp/documents/25167/seidogaiyou2025.pdf' }],
      verifiedBy: V
    },

    {
      id: 'kanagawa-saposute',
      name: { ja: '地域若者サポートステーション（神奈川県内7か所）', en: 'Youth Support Stations in Kanagawa (7 places)' },
      hook: { ja: '働くことに自信がない。近くで相談したい', en: 'I am not confident about working. I want help nearby' },
      summary: {
        ja: '働きはじめる前の準備から手伝ってくれる無料の窓口「サポステ」の、神奈川県内の場所です。仕事の相談や職場体験ができます。',
        en: 'Where to find "Saposute" in Kanagawa: free centers that help you get ready to work, with job counseling and work experience.'
      },
      cat: ['work', 'consult'],
      kind: 'service', basis: 'national', pref: '14', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '15〜49歳で、今は働いていない・学校に行っていない人と、その家族。' },
      how: { ja: '近くのサポステに電話して予約してから行きます。' },
      where: { ja: '横浜・新横浜・大船（鎌倉市）・溝の口（川崎市）・橋本（相模原市）・小田原・本厚木' },
      docs: [],
      ask: ['まず見学や話を聞くだけでもいいですか？', '職場体験はできますか？'],
      caution: { ja: '開いている曜日はサポステごとにちがいます。行く前に電話で確かめてください。' },
      supporter: { ja: '厚生労働省と自治体の協働事業。県西部・県央は国と神奈川県が協働で運営（NPO法人子どもと生活文化協会）。所在地は厚生労働省「全国のサポステ」で確認。' },
      effort: 'low',
      for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 15, max: 49 }, areas: ['14'] },
      deadline: { ja: 'いつでも', en: 'Any time', leaveMonths: null, months: null, always: true },
      contact: { phone: null, phoneLabel: null, line: null, chat: null, web: KN_SAPO, hours: null },
      locations: [
        loc('よ\u2060こ\u2060は\u2060ま若者サポートステーション', '14100', '神奈川県横浜市西区北幸1-11-15 横浜STビル3階', 35.467323, 139.618469, '045-290-7234', '月〜土 10:00–18:00（第3月曜・日・祝 休み）', '横浜駅西口から歩いて約7分'),
        loc('よ\u2060こ\u2060は\u2060ま若者サポートステーション 新横浜サテライト', '14100', '神奈川県横浜市港北区新横浜3-18-6 新横浜TSビル5階', 35.510361, 139.616806, '045-290-7234', '火〜金 10:00–18:00', '新横浜駅7番出口から歩いて約2分'),
        loc('湘南・横浜若者サポートステーション', '14204', '神奈川県鎌倉市小袋谷1-6-1 川島ビル2階', 35.349354, 139.531906, '0467-42-0203', '月〜金（第3月曜のぞく）・第3土曜 10:00–18:00', '大船駅東口から歩いて約5分'),
        loc('かわさき若者サポートステーション', '14130', '神奈川県川崎市高津区溝口1-6-10 てくのかわさき3階', 35.598724, 139.614166, '044-850-2517', '月〜土 9:00–17:00', '武蔵溝ノ口駅・溝の口駅から歩いて約5分'),
        loc('さ\u2060が\u2060み\u2060は\u2060ら若者サポートステーション', '14150', '神奈川県相模原市緑区橋本6-2-1 シティ・プラザはしもと6階（相模原市総合就職支援センター内）', 35.596298, 139.344482, '042-703-3861', '月〜金 8:30–17:00', '橋本駅北口から歩いて約1分'),
        loc('神奈川県西部地域若者サポートステーション', '14206', '神奈川県小田原市城山1-6-32 Sビル2階', 35.256454, 139.152603, '0465-32-4115', '月〜金 10:00–17:00（土曜は月1回）', 'JR小田原駅西口から歩いて3分'),
        loc('神奈川県央地域若者サポートステーション', '14212', '神奈川県厚木市中町2-12-15 アミューあつぎ7階', 35.442242, 139.366089, '046-297-3067', '月〜土 10:00–17:00', '本厚木駅から歩いて約5分')
      ],
      source: { org: '神奈川県（地域若者サポートステーション）', url: KN_SAPO, checked: C },
      sources2: [{ org: '厚生労働省（全国のサポステ）', url: SAPO_NET }],
      verifiedBy: V
    },

    {
      id: 'kanagawa-kowaka-line',
      name: { ja: 'か\u2060な\u2060が\u2060わ子ども・若者総合相談（LINE・電話）', en: 'Kanagawa Youth Consultation (LINE & phone)' },
      hook: { ja: 'どこに相談すればいいかわからない', jr: 'だれに相談したらいいか、わからない', en: 'I don\'t know who to ask' },
      summary: {
        ja: '働くこと、将来のこと、家族や友だちのこと。どんな悩みでも聞いてくれる神奈川県の無料の窓口です。LINEは名前を言わずに相談できます。',
        jr: '学校、家族、友だち、将来のこと。どんなことでもLINEか電話で相談できる、神奈川県の窓口です。名前は言わなくて大丈夫。',
        en: 'Kanagawa\'s free help line for any worry: work, the future, family or friends. You can use LINE without giving your name.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '14', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '神奈川県に住む・学校に通う・働く、子ども・若者（おおむね30代まで）と、その家族。' },
      how: { ja: 'LINEで友だち追加して（ID: kana-kowaka）メッセージを送ります。電話は 045-242-8201。会って話したいときは、まず電話で予約します。' },
      where: { ja: 'LINE・電話（会って話すときは 神奈川県立青少年センター2階）' },
      docs: [],
      ask: ['どこに相談したらいいかわからなくて、連絡しました', '働きたいけど、何から始めればいいですか？'],
      caution: { ja: 'LINEは火・木・土の14時〜21時、電話は火〜日の9時〜12時・13時〜16時です（月曜・年末年始は休み）。' },
      supporter: { ja: '神奈川県 子どもみらい部青少年課。LINE 火・木・土 14〜21時（祝休日・年末年始除く）、県ページでは対象おおむね39歳まで。電話相談は県立青少年センター（火〜日、土日祝も受付）。面接相談は電話予約制。同じ時間帯に「か\u2060な\u2060が\u2060わひきこもり相談LINE」もある。' },
      effort: 'low',
      for: { stages: ALL_ST, paths: [], care: [], careOnly: false, age: null, areas: ['14'] },
      deadline: null,
      contact: {
        phone: '045-242-8201', phoneLabel: 'か\u2060な\u2060が\u2060わ子ども・若者総合相談センター', line: 'http://nav.cx/2V9NpP7', chat: null, web: KN_KOWAKA,
        hours: { ja: 'LINE 火・木・土 14時〜21時／電話 火〜日 9時〜12時・13時〜16時', en: 'LINE Tue/Thu/Sat 14–21; phone Tue–Sun 9–12, 13–16' }
      },
      locations: [],
      source: { org: '神奈川県（か\u2060な\u2060が\u2060わ子ども・若者総合相談LINE）', url: KN_KOWAKA, checked: C },
      sources2: [{ org: '神奈川県（か\u2060な\u2060が\u2060わ子ども・若者総合相談センター）', url: KN_KOWAKA_C }],
      verifiedBy: V
    },

    {
      id: 'kanagawa-kodomo-hotline',
      name: { ja: '人権・子どもホットライン（神奈川県 子ども専用電話）', en: 'Kanagawa Children\'s Rights Hotline' },
      hook: { ja: '家や学校で、いやなことをされている', jr: '家や学校で、いやなことをされたり言われたりする', en: 'Someone at home or school is treating me badly' },
      summary: {
        ja: '18歳未満の子どもが電話できる、神奈川県の子ども専用の相談電話です。毎日、朝9時から夜8時まで。相談の内容や住んでいる場所によって、合う窓口も教えてくれます。',
        jr: '子どもだけが電話できる、神奈川県の相談電話です。毎日、朝9時から夜8時まで話を聞いてくれます。',
        en: 'A Kanagawa phone line just for children under 18, every day 9:00–20:00. They also tell you the right place to go next.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '14', right: false,
      amount: { ja: '無料（電話代はかかります）', en: 'Free (call charges apply)' }, repay: null,
      who: { ja: '神奈川県に住む18歳未満の子ども。横浜市・川崎市・相模原市・横須賀市に住んでいる人は、市の児童相談所に相談します。' },
      how: { ja: '0466-84-1616 に電話します。近所の子どもが心配なときは、大人も電話できます。' },
      where: { ja: '電話' },
      docs: [],
      ask: ['家で、親にたたかれたり、ひどいことを言われたりします', 'だれに相談したらいいか、教えてください'],
      caution: { ja: 'あきらかに虐待のときは、平日は近くの児童相談所、休日などは「子ども・家庭110番」0466-84-7000（毎日9時〜20時）へ。夜おそくや今すぐ危ないときは 189 か 110 に電話してください。' },
      supporter: { ja: '神奈川県 福祉子どもみらい局（総合療育相談センター）。対象は県内在住の18歳未満（政令市・横須賀市在住者は各市の児童相談所を案内）。' },
      effort: 'low',
      for: { stages: KIDS, paths: [], care: [], careOnly: false, age: { min: null, max: 17 }, areas: KN_KEN_AREA },
      deadline: null,
      contact: {
        phone: '0466-84-1616', phoneLabel: '人権・子どもホットライン', line: null, chat: null, web: KN_HOTLINE,
        hours: { ja: '毎日 9時〜20時', en: 'Every day 9:00–20:00' }
      },
      locations: [],
      source: { org: '神奈川県（子ども専用 人権・子どもホットライン）', url: KN_HOTLINE, checked: C },
      sources2: [{ org: '神奈川県（テレホン相談 子ども家庭110番）', url: 'https://www.pref.kanagawa.jp/docs/w6j/jisou/kodomo110.html' }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    /* ═══════════════════════ 埼玉県 ═══════════════════════ */

    {
      id: 'saitama-jiritsu-shikin',
      name: { ja: '自立支援資金貸付（埼玉県）', en: 'Independence Support Loan (Saitama)' },
      hook: { ja: '家賃や生活費の支えがほしい', en: 'I need help with rent and living costs' },
      summary: {
        ja: '進学した人は生活費（月5万円まで）と家賃を、働く人は家賃を、借りられます。5年間（資格の費用は2年間）働けば、返さなくてよくなります。埼玉県では埼玉県社会福祉協議会が行っています。',
        en: 'Loans for living costs (up to ¥50k/month for students) and rent, forgiven after 5 years of work (2 years for licence costs). In Saitama, run by the Saitama Council of Social Welfare.'
      },
      cat: ['money', 'housing'],
      kind: 'loan_forgivable', basis: 'pref', pref: '11', right: false,
      amount: {
        ja: '生活費 月5万円まで（進学した人）・家賃（1か月の家賃相当）・資格をとる費用 25万円まで',
        en: 'Living up to ¥50k/month (students); rent; licences up to ¥250k'
      },
      repay: 'conditional',
      who: { ja: '埼玉県の児童養護施設などを出た人、里親の委託が終わった人で、親からお金の支えが得られない人。資格の費用は、施設や里親家庭にいる間も使えます。' },
      how: { ja: '施設や里親の担当の人、または児童相談所に相談します。' },
      where: { ja: '施設・里親の担当の人 → 埼玉県社会福祉協議会' },
      docs: [],
      ask: ['自立支援資金貸付を使いたいです。私は対象になりますか？', '返さなくてよくなる条件を教えてください', '申しこみは、だれを通してすればいいですか？'],
      caution: { ja: '返さなくてよくなるには、進学した人は卒業後、働く人は出たあと、5年間（資格の費用は2年間）週20時間以上働くことが必要です。働く人の家賃は出てから2年までです。' },
      supporter: { ja: '埼玉県の補助で埼玉県社会福祉協議会が実施（県交付要綱）。内容は県資料「埼玉県の児童養護施設等の退所児童に対する自立支援」（令和6年）による。埼玉県社協のホームページは2026-10-26時点で一時公開停止中のため、申込方法・最新の要件は県こども安全課 養護担当（048-830-3331）か県社協で確認を。' },
      effort: 'high',
      for: { stages: LEAVERS, paths: [], care: CARE, careOnly: true, age: null, areas: ['11'] },
      deadline: {
        ja: '進学・就職で出るときに。早めに担当の人に相談しよう。',
        en: 'When you leave for school or work; talk to your caseworker early.',
        leaveMonths: -3, months: null, always: false
      },
      contact: { phone: '048-830-3331', phoneLabel: '埼玉県 こども安全課 養護担当', line: null, chat: null, web: ST_SHIRYO, hours: null },
      locations: [],
      source: { org: '埼玉県（児童養護施設等の退所児童に対する自立支援 資料）', url: ST_SHIRYO, checked: C },
      sources2: [{ org: '埼玉県（自立支援貸付事業費補助金交付要綱）', url: ST_YOKO }, { org: '埼玉県（社会的養護の現状・問い合わせ先）', url: ST_YOUGO }],
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'saitama-clover-house',
      name: { ja: 'クローバーハウス（埼玉県のアフターケア事業所）', en: 'Clover House (Saitama aftercare space)' },
      hook: { ja: 'ほっとできる場所と、話せる仲間がほしい', en: 'I want a place to relax and people to talk to' },
      summary: {
        ja: '埼玉県の施設や里親家庭を出た人のための、県の居場所・相談場所です。おしゃべりやゲームでくつろげて、100円で夕ごはんも食べられます。くらしや仕事の相談もできます。',
        en: 'Saitama\'s drop-in and support space for people who left care in the prefecture. Relax, play games, have dinner for ¥100, and talk about daily life or work.'
      },
      cat: ['consult', 'work'],
      kind: 'place', basis: 'npo', pref: '11', right: false,
      amount: { ja: '夕ごはん 100円', en: 'Dinner ¥100' }, repay: null,
      who: { ja: '埼玉県内の児童養護施設・里親・ファミリーホーム・児童自立支援施設・児童心理治療施設・自立援助ホームを出た人（進学・就職・仕事さがし中、どんな状況でもOK）。出る予定の人も。出てからおおむね10年までの人。' },
      how: { ja: 'すでに出ている人は、行く前に必ず予約します（コンパスナビのホームページの予約フォームか電話）。まだ施設や里親家庭にいる人は、職員さん・里親さんといっしょに行きます。' },
      where: { ja: 'JR浦和駅 東口から歩いて5分（住所は公開していません）' },
      docs: [],
      ask: ['初めて行きたいです。予約はどうすればいいですか？', '仕事のことも相談できますか？', 'セミナーやイベントはいつありますか？'],
      caution: { ja: '開いているのは木・金・土の12時〜20時です。住所は公開していないので、予約のときに聞いてください。' },
      supporter: { ja: '埼玉県「児童養護施設退所児童等アフターケア事業所」。運営は一般社団法人コンパスナビ（県委託、居住支援法人として県指定）。スタッフに社会的養護経験者（ユース）がいる。生活スキル等のセミナー月1〜2回。電話 048-815-4111（平日10〜18時）。県担当: こども安全課 048-830-3340。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: CARE, careOnly: true, age: null, areas: ['11'] },
      deadline: { ja: 'いつでも（予約制）', en: 'Anytime (booking needed)', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '048-815-4111', phoneLabel: '一般社団法人コンパスナビ', line: null, chat: null, web: CLOVER_OP,
        hours: { ja: '居場所: 木・金・土 12時〜20時／電話: 平日 10時〜18時', en: 'Open Thu/Fri/Sat 12–20; phone weekdays 10–18' }
      },
      locations: [],
      // the phone number and phone hours come from the operator's page; the prefecture page has the rest
      source: { org: '一般社団法人コンパスナビ（クローバーハウス）', url: CLOVER_OP, checked: C },
      sources2: [{ org: '埼玉県（クローバーハウス）', url: ST_CLOVER }],
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'saitama-kibou-no-ie',
      name: { ja: '希望の家（埼玉県 進学する人の住まい）', en: 'Kibo no Ie (Saitama housing for care-leaver students)' },
      hook: { ja: '進学したいけど、住むところと家賃が心配', en: 'I want to study but worry about housing and rent' },
      summary: {
        ja: '施設や里親家庭を出て大学や専門学校に進む人に、埼玉県が低い家賃で部屋を貸してくれます。社会福祉士が卒業まで相談にのってくれます。',
        en: 'Saitama rents rooms at a low price to care leavers going to university or vocational school, with a social worker supporting them until graduation.'
      },
      cat: ['housing', 'education'],
      kind: 'housing', basis: 'pref', pref: '11', right: false,
      amount: { ja: '低い家賃で1人1部屋（県内4か所・20人分）', en: 'Low-rent private room (4 sites, 20 places)' }, repay: null,
      who: { ja: '埼玉県の児童養護施設などを出た人、里親の委託が終わった人で、大学・専門学校などに進学した人。' },
      how: { ja: '施設や里親の担当の人、または埼玉県 こども安全課（養護担当）に聞いてみよう。申し込み方は県のページにはのっていません。' },
      where: { ja: '埼玉県内4か所' },
      docs: [],
      ask: ['希望の家に入れるか、だれに相談すればいいですか？', '家賃はいくらですか？', 'いつまで住めますか？'],
      caution: { ja: '在学中だけ住めます。部屋の数に限りがあります（20人分）。' },
      supporter: { ja: '埼玉県「児童養護施設退所者を10年支える自立支援事業（ささえーる）」の希望の家事業（令和8年度予算見積調書で確認）。民間アパートを借り上げ、社会福祉士が月1回以上面談。運営は公募による委託（令和6年度資料では公益社団法人埼玉県社会福祉士会、家賃は約4千円）。さ\u2060い\u2060た\u2060ま市措置児童分は市が費用負担。' },
      effort: 'mid',
      for: { stages: ['hs3', 'left0', 'left1'], paths: ['study'], care: CARE, careOnly: true, age: null, areas: ['11'] },
      deadline: { ja: '進学が決まったら早めに', en: 'As soon as your school place is decided', leaveMonths: -4, months: null, always: false },
      contact: { phone: '048-830-3331', phoneLabel: '埼玉県 こども安全課 養護担当', line: null, chat: null, web: ST_YOSAN, hours: null },
      locations: [],
      source: { org: '埼玉県（令和8年度予算見積調書 こども安全課）', url: ST_YOSAN, checked: C },
      sources2: [{ org: '埼玉県（児童養護施設等の退所児童に対する自立支援 資料）', url: ST_SHIRYO }],
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'saitama-jisou',
      name: { ja: '児童相談所（埼玉県・さ\u2060い\u2060た\u2060ま市）', en: 'Child Guidance Centers (Saitama)' },
      hook: { ja: '施設や里親のこと、家のことを相談したい', jr: '家のことや、こわいことを相談したい', en: 'I want to talk about my care placement or my family' },
      summary: {
        ja: '子どもと家族のことを相談できる公的な窓口です。子どもからの相談も受けています。相談は無料で、秘密は守られます。',
        jr: '子どもからの相談も聞いてくれるところです。お金はかからず、ひみつは守られます。夜や休みの日は「189」へ。',
        en: 'Public offices for children and families. Children can call too. It is free and confidential.'
      },
      cat: ['consult', 'procedures'],
      kind: 'service', basis: 'pref', pref: '11', right: false,
      amount: null, repay: null,
      who: { ja: '0歳から18歳未満の子どもと家族。住んでいる市町村で担当の児童相談所が決まっています。さ\u2060い\u2060た\u2060ま市に住んでいる人は、さ\u2060い\u2060た\u2060ま市の児童相談所です。' },
      how: { ja: '担当の児童相談所に電話します（県の児童相談所は電話番号の下4けたが 4152）。夜や休日は「189」へ。さ\u2060い\u2060た\u2060ま市の人は 048-711-6824（24時間）。' },
      where: { ja: '住んでいる市町村を担当する児童相談所（地図で確認）' },
      docs: [],
      ask: ['施設を出る時期について相談したいです', '担当の児童福祉司さんと話したいです', '家にいるのがつらいです。どうしたらいいですか？'],
      caution: { ja: '朝霞児童相談所が新しくでき（令和7年4月）、担当の区域が変わりました。地図で自分の担当を確かめてね。' },
      supporter: { ja: '埼玉県「児童相談所のご案内」による。県児相の相談時間は平日8:30〜18:15。時間外の虐待通報は189（さ\u2060い\u2060た\u2060ま市は市児童虐待通告電話相談 048-711-6824、24時間）。埼玉県虐待通報ダイヤル #7171。子どもスマイルネット 048-822-7007 も案内。さ\u2060い\u2060た\u2060ま市児相の相談時間は市に要確認。' },
      effort: 'low',
      for: { stages: KIDS, paths: [], care: [], careOnly: false, age: null, areas: ['11'] },
      deadline: null,
      contact: {
        phone: '189', phoneLabel: '夜・休日は 189（虐待対応ダイヤル）', line: null, chat: null, web: ST_JISOU,
        hours: { ja: '県の児童相談所: 平日 8時30分〜18時15分', en: 'Prefectural centers: weekdays 8:30–18:15' }
      },
      locations: ST_JISOU_LOCS,
      source: { org: '埼玉県（こども安全課）', url: ST_JISOU, checked: C },
      verifiedBy: V
    },

    {
      id: 'saitama-towns-jiritsu-sodan',
      name: { ja: 'アスポート相談支援センター（埼玉県 町村の くらしの相談）', en: 'Asport (Saitama towns: living & work support)' },
      hook: { ja: 'お金・仕事・住まいのこと、まとめて相談したい', en: 'I want to talk about money, work and housing in one place' },
      summary: {
        ja: '埼玉県の町や村に住む人のための、お金・仕事・住まいの無料の相談窓口です。県が開いています。町村役場の福祉課に行けば、家に来てもらうか役場で相談できます。',
        en: 'Saitama Prefecture\'s free desks for people living in its towns and villages, about money, work and housing. Ask at your town office and a counselor will meet you there or at home.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: 'pref', pref: '11', right: false,
      townsOnly: true,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '埼玉県の町村に住んでいて、生活に困っている人。' },
      how: { ja: '住んでいる地域のアスポート相談支援センターに電話するか、町村役場の福祉課に行きます。福祉課から支援員に連絡が行き、家に来てもらうか役場で相談します。' },
      where: { ja: '地域ごとのアスポート相談支援センター（地図で確認）または町村役場の福祉課' },
      docs: [],
      ask: KONKYU_ASK,
      caution: { ja: '市に住んでいる人は、市の窓口が担当です。' + KONKYU_FOOT },
      supporter: { ja: KONKYU_SUP + ' 埼玉県の町村部は「アスポート相談支援センター」が担当（町村部統括: さ\u2060い\u2060た\u2060ま市浦和区 彩の国すこやかプラザ2階 048-822-1249）。受付時間は県ページに記載なし。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ST_TOWN_CODES },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: { phone: '048-822-1249', phoneLabel: 'アスポート相談支援センター埼玉（町村部統括）', line: null, chat: null, web: ST_KONKYU, hours: null },
      locations: [
        loc('アスポート相談支援センター埼玉東部', '11214', '埼玉県春日部市中央1-12-1 メゾン福嶋5階', 35.980324, 139.749756, '048-720-8475', '', '担当: 伊奈町・松伏町・宮代町・杉戸町'),
        loc('アスポート相談支援センター埼玉西部（小川町社会福祉協議会内）', '11343', '埼玉県比企郡小川町腰越618 パトリアおがわ', 36.046669, 139.241837, '0493-81-3148', '', '担当: 滑川町・嵐山町・小川町・東秩父村'),
        loc('アスポート相談支援センター埼玉西部 毛呂山出張所（毛呂山町社会福祉協議会内）', '11326', '埼玉県入間郡毛呂山町川角303-3', 35.942257, 139.335571, '080-2274-1445', '', '担当: 毛呂山町・越生町・鳩山町・ときがわ町'),
        loc('アスポート相談支援センター埼玉西部 三芳出張所（三芳町役場1階）', '11324', '埼玉県入間郡三芳町藤久保1100-1', 35.829254, 139.527008, '049-258-0122', '', '担当: 三芳町'),
        loc('アスポート相談支援センター埼玉西部 川島出張所（川島町社会福祉協議会内）', '11346', '埼玉県比企郡川島町大字平沼1175', 35.981792, 139.481598, '070-4391-7084', '', '担当: 川島町・吉見町'),
        loc('アスポート相談支援センター埼玉北部（保健福祉総合センター内）', '11408', '埼玉県大里郡寄居町大字保田原301', 36.118023, 139.214432, '048-577-6883', '', '担当: 上里町・神川町・美里町・寄居町'),
        loc('アスポート相談支援センター埼玉秩父（皆野町社会福祉協議会内）', '11362', '埼玉県秩父郡皆野町大字大渕103-1', 36.072601, 139.083496, '0494-62-6565', '', '担当: 横瀬町・小鹿野町・長瀞町・皆野町')
      ],
      source: { org: '埼玉県（生活困窮者の総合相談窓口）', url: ST_KONKYU, checked: C },
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'saitama-city-jiritsu-sodan',
      name: { ja: 'さ\u2060い\u2060た\u2060ま市 福祉まるごと相談窓口（くらしの相談）', en: 'Saitama City: Welfare One-stop Desks' },
      hook: { ja: 'お金・仕事・住まいのこと、まとめて相談したい', en: 'I want to talk about money, work and housing in one place' },
      summary: {
        ja: 'さ\u2060い\u2060た\u2060ま市に住む人のための、お金・仕事・住まいの無料の相談窓口です。各区役所の福祉課にあります。家賃の給付金（住居確保給付金）や家計の相談、住まい探しの手伝いにもつないでくれます。',
        en: 'Free desks for Saitama City residents about money, work and housing, in each ward office. They connect you to the Housing Security Benefit, budgeting help and support finding a place to live.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: 'local', pref: '11', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: 'さ\u2060い\u2060た\u2060ま市に住んでいて、生活に困っている人。住むところがない人は、いちばん近い窓口へ。' },
      how: { ja: '住んでいる区の福祉まるごと相談窓口に電話します。初めての相談は16時30分までに行きます。' },
      where: { ja: '住んでいる区の区役所 福祉課（地図で確認）' },
      docs: [],
      ask: KONKYU_ASK,
      caution: { ja: '相談に時間がかかることがあるので、早めの時間に行こう。' + KONKYU_FOOT },
      supporter: { ja: KONKYU_SUP + ' さ\u2060い\u2060た\u2060ま市は10区の区役所福祉課に「福祉まるごと相談窓口」。シェルター事業・地域居住支援事業（入居支援）あり。市担当: 福祉局 生活福祉部 生活福祉課 自立支援係。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['11100'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: null, phoneLabel: null, line: null, chat: null, web: SC_KONKYU,
        hours: { ja: '平日 9時〜17時（初めての相談は16時30分まで）', en: 'Weekdays 9:00–17:00 (first visit by 16:30)' }
      },
      locations: SC_LOCS,
      source: { org: 'さ\u2060い\u2060た\u2060ま市（生活困窮者自立支援制度）', url: SC_KONKYU, checked: C },
      sources2: [{ org: '埼玉県（生活困窮者の総合相談窓口）', url: ST_KONKYU }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'saitama-fubo-futan',
      name: { ja: '父母負担軽減事業補助金（埼玉県 私立高校）', en: 'Saitama Private High School Fee Support' },
      hook: { ja: '私立高校の施設費や入学金が払えるか不安', jr: '私立高校の入学金などが心配', en: 'I worry about private high school fees and the entrance fee' },
      summary: {
        ja: '埼玉県内の私立高校に通う家庭に、国の就学支援金（授業料）に上乗せして、埼玉県が施設費や入学金を助けてくれます。所得の条件があります。',
        jr: '埼玉県の私立高校に通うと、県が施設費や入学金を出してくれることがあります。返さなくていいお金です。',
        en: 'Saitama adds to the national tuition support by helping with facility fees and the entrance fee at private high schools in the prefecture. Income limits apply.'
      },
      cat: ['education', 'money'],
      kind: 'grant', basis: 'pref', pref: '11', right: false,
      amount: {
        ja: '全日制の例: 年収めやす約500万円未満 → 施設費など20万円・入学金22万3,000円まで／約609万円未満 → 入学金10万円まで（国の授業料 年45万7,200円とは別）',
        en: 'Full-time example: income under ~¥5M → facility fees ¥200k + entrance fee up to ¥223k; under ~¥6.09M → entrance fee up to ¥100k (on top of national tuition ¥457,200)'
      },
      repay: 'none',
      who: { ja: '埼玉県が認可した私立高校などに通う生徒で、生徒と保護者がどちらも埼玉県に住んでいて、所得の条件にあう家庭。' },
      how: { ja: '通っている学校を通して申しこみます。受付の時期は学校ごとにちがいます（例年5月〜6月ごろ）。' },
      where: { ja: '通っている私立高校' },
      docs: ['学校から配られる申請書類'],
      ask: ['私の家は、県の補助の対象になりますか？', '申しこみの締切はいつですか？', '家計が急に変わったときも使えますか？'],
      caution: { ja: '補助額は上限です。実際にはらう金額が少ないときは、その金額までです。年収はめやすで、保護者の課税標準額などで決まります。' },
      supporter: { ja: '埼玉県 総務部学事課「学費軽減ヘルプデスク」048-830-2725（平日8:30〜17:15）。令和8年度 目安年収表（日本国籍・片働き・子1人モデル）: 基準①約500万円未満で国45万7,200＋施設費20万円（1年生は入学金22万3,000円も、計88万200円）、基準②約609万円未満で1年生のみ入学金10万円。家計急変世帯の特例、外国籍生徒の補助あり。生活保護世帯は実負担額を補助。' },
      effort: 'mid',
      for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['11'] },
      deadline: {
        ja: '例年5月〜6月ごろ、学校を通して申しこみ（学校ごとにちがいます）',
        en: 'Usually May–June through your school (varies by school)',
        leaveMonths: null, months: [5, 6], always: false
      },
      contact: {
        phone: '048-830-2725', phoneLabel: '埼玉県 学事課 学費軽減ヘルプデスク', line: null, chat: null, web: ST_FUBO,
        hours: { ja: '平日 8時30分〜17時15分', en: 'Weekdays 8:30–17:15' }
      },
      locations: [],
      source: { org: '埼玉県（私立学校の父母負担軽減について 令和8年度）', url: ST_FUBO, checked: C },
      sources2: [{ org: '埼玉県（令和8年度 補助対象となる世帯の目安年収）', url: ST_FUBO_NENSHU }],
      verifiedBy: V
    },

    {
      id: 'saitama-koko-shogakukin',
      name: { ja: '埼玉県高等学校等奨学金（貸付）', en: 'Saitama High School Scholarship Loan' },
      hook: { ja: '高校の生活費や教材費が足りない', jr: '高校に行くお金が足りるか心配', en: 'I need money for high school costs' },
      summary: {
        ja: '高校生にお金を貸してくれる埼玉県の奨学金です。毎月の奨学金と、入学のときの一時金があります。銀行との約束どおりに返せば利息はかかりません。中3のうちにも申しこめます。',
        jr: '高校生になったらお金を借りられる、埼玉県の奨学金です。入学のときのお金もあります。あとで返すお金です。',
        en: 'A Saitama loan for high school students: a monthly amount plus a one-off entry payment. No interest if repaid as agreed. Junior high third-years can apply too.'
      },
      cat: ['education', 'money'],
      kind: 'loan', basis: 'pref', pref: '11', right: false,
      amount: {
        ja: '月1万5千〜2万5千円（国公立）／月2万〜4万円（私立）・入学一時金 5万か10万円（国公立）／10万か25万円（私立）',
        en: '¥15k–25k/month (public) or ¥20k–40k/month (private); entry payment ¥50k/100k (public) or ¥100k/250k (private)'
      },
      repay: 'yes',
      who: { ja: '高校などに通う生徒（進学する予定の中3もふくむ）で、保護者が埼玉県に住んでいる人。学校長の推薦が必要です（成績の条件はありません）。所得の条件があります。' },
      how: { ja: '中3の人は10月ごろ中学校から案内があります。高校生は4月上旬に高校から案内があります。書類は学校から受けとり、埼玉県に直接郵送します。認定されたら埼玉りそな銀行で契約します。' },
      where: { ja: '学校で書類を受けとる → 埼玉県教育委員会（財務課）に郵送 → 埼玉りそな銀行' },
      docs: ['学校から配られる申請書類一式', '世帯の住民税の所得割がわかるもの'],
      ask: ['中3募集の締切はいつですか？', '親権者の同意がとれないときは、どうすればいいですか？', '返すのはいつから、毎月いくらくらいですか？'],
      caution: { ja: '返すお金です。銀行での契約には、戸籍上のすべての親権者の同意と署名が必要で、親権者のうち1人は本人といっしょに銀行に行きます。施設や里親家庭にいる人は、担当の人と早めに相談しよう。' },
      supporter: { ja: '埼玉県教育局 財務課 授業料・奨学金担当（コールセンター 048-830-8855）。令和8年度は当初募集4月30日・追加募集8月7日締切（終了）、家計急変世帯向け募集中。令和9年度入学の中3募集は10月以降に中学校経由で案内予定（令和8年度分は11月4日開始・1月30日締切だった）。中3募集は6か月分ずつ（前期2月下旬以降）、当初募集は12か月分を一括で貸与。世帯年収の目安約830万円以下（4人世帯モデル、家計急変募集ページ）。' },
      effort: 'mid',
      for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['11'] },
      deadline: {
        ja: '中3は秋〜冬に中学校から案内（令和8年度分は1月30日締切だった）。高校生は4月末が締切',
        en: 'Junior high: notice via school in autumn/winter; high school: deadline end of April',
        leaveMonths: null, months: [11, 12, 1, 4], always: false
      },
      contact: {
        phone: '048-830-8855', phoneLabel: '埼玉県教育局 財務課（コールセンター）', line: null, chat: null, web: ST_SHOGAKU,
        hours: null
      },
      locations: [],
      source: { org: '埼玉県教育委員会（奨学金の貸与）', url: ST_SHOGAKU, checked: C },
      sources2: [{ org: '埼玉県教育委員会（奨学生の募集）', url: ST_SHOGAKU_B }],
      verifiedBy: V
    },

    {
      id: 'saitama-saposute',
      name: { ja: '地域若者サポートステーション（埼玉県内5か所）', en: 'Youth Support Stations in Saitama (5 places)' },
      hook: { ja: '働くことに自信がない。近くで相談したい', en: 'I am not confident about working. I want help nearby' },
      summary: {
        ja: '働きはじめる前の準備から手伝ってくれる無料の窓口「サポステ」の、埼玉県内の場所です。',
        en: 'Where to find "Saposute" in Saitama: free centers that help you get ready to work.'
      },
      cat: ['work', 'consult'],
      kind: 'service', basis: 'national', pref: '11', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '15〜49歳で、今は働いていない・学校に行っていない人と、その家族。' },
      how: { ja: '近くのサポステに電話して予約してから行きます。' },
      where: { ja: '川口・川越・深谷・さ\u2060い\u2060た\u2060ま（大宮）・春日部' },
      docs: [],
      ask: ['まず見学や話を聞くだけでもいいですか？', '職場体験はできますか？'],
      caution: { ja: '開いている時間はサポステごとにちがいます。行く前に電話で確かめてください。' },
      supporter: { ja: '厚生労働省の委託事業。所在地・電話は厚生労働省「全国のサポステ」で確認（受付時間は各サポステのサイトで要確認）。' },
      effort: 'low',
      for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 15, max: 49 }, areas: ['11'] },
      deadline: { ja: 'いつでも', en: 'Any time', leaveMonths: null, months: null, always: true },
      contact: { phone: null, phoneLabel: null, line: null, chat: null, web: SAPO_NET, hours: null },
      locations: [
        loc('かわぐち若者サポートステーション', '11203', '埼玉県川口市川口3-2-2 川口若者ゆめワーク3階', 35.802452, 139.715195, '048-255-8680', '', ''),
        loc('かわごえ若者サポートステーション（常設サテライト）', '11201', '埼玉県川越市脇田本町6-6 石川ビル4階', 35.906048, 139.482010, '049-293-2562', '', ''),
        loc('深谷若者サポートステーション', '11218', '埼玉県深谷市西島4-2-61 ウエストビル2階', 36.193001, 139.278900, '048-577-4727', '', ''),
        loc('地域若者サポートステーションさ\u2060い\u2060た\u2060ま', '11100', '埼玉県さ\u2060い\u2060た\u2060ま市大宮区桜木町1-7-5 ソニックシティビル地下1階', 35.905506, 139.619995, '048-650-3366', '', 'イベント広場横'),
        loc('埼玉とうぶ若者サポートステーション', '11214', '埼玉県春日部市粕壁東1-19-14 ホワイトストーンハイツ1階', 35.980156, 139.757233, '048-741-6583', '', '')
      ],
      source: { org: '厚生労働省（全国のサポステ）', url: SAPO_NET, checked: C },
      verifiedBy: V
    },

    {
      id: 'saitama-oyako-line',
      name: { ja: '親と子どもの悩みごと相談＠埼玉（LINE）', en: 'Saitama Parent & Child LINE Consultation' },
      hook: { ja: '家族のことを、文字で相談したい', jr: '家で、たたかれたりこわいことをされる。LINEで話したい', en: 'I want to message someone about my family' },
      summary: {
        ja: '親子の関係や、家族からの虐待のことを、LINEで相談できる埼玉県の窓口です。平日は夜10時まで、土日祝も相談できます。',
        jr: '家族のこと、こわいことを、LINEで相談できます。平日は夜10時まで。さ\u2060い\u2060た\u2060ま市の人も使えます。',
        en: 'Saitama\'s LINE service for worries about parents and children, including abuse at home. Weekdays until 22:00, weekends and holidays too.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '11', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '埼玉県に住む子どもと、その保護者など。さ\u2060い\u2060た\u2060ま市の人も使えます。' },
      how: { ja: 'LINEで「親と子どもの悩みごと相談＠埼玉」を検索するか、友だち追加ボタンから追加して、メッセージを送ります。' },
      where: { ja: 'LINE' },
      docs: [],
      ask: ['家で親にたたかれます。どうしたらいいですか？', '家にいるのがつらいです'],
      caution: { ja: '命や安全があぶないと判断されたときは、守るために児童相談所や警察に連絡が行くことがあります。今すぐ危ないときは 110 や 189 に電話してね。' },
      supporter: { ja: '埼玉県 福祉部こども安全課 児童虐待対策担当（048-830-3335）。受付 月〜金 9〜22時、土日祝 9〜17時（12月29日〜1月3日除く）。電話は子どもスマイルネット 048-822-7007、県虐待通報ダイヤル #7171 または 048-762-7533（24時間）。' },
      effort: 'low',
      for: { stages: KIDS, paths: [], care: [], careOnly: false, age: null, areas: ['11'] },
      deadline: null,
      contact: {
        phone: null, phoneLabel: null, line: 'https://line.me/R/ti/p/@620vnbix', chat: null, web: ST_LINE,
        hours: { ja: '月〜金 9時〜22時／土日祝 9時〜17時', en: 'Mon–Fri 9–22; weekends/holidays 9–17' }
      },
      locations: [],
      source: { org: '埼玉県（親と子どもの悩みごと相談＠埼玉）', url: ST_LINE, checked: C },
      verifiedBy: V
    },

    {
      id: 'saitama-smile-net',
      name: { ja: '子どもスマイルネット（埼玉県の子どもの相談電話）', en: 'Kodomo Smile Net (Saitama children\'s phone line)' },
      hook: { ja: 'いじめや家のことを、だれかに聞いてほしい', jr: 'いじめや友だち、家のことを話したい', en: 'I want someone to listen about bullying or home' },
      summary: {
        ja: '18歳未満の子ども（高校生も）の悩みを聞いてくれる、埼玉県の電話相談です。土日もふくめ毎日、朝10時30分から夕方6時まで。',
        jr: 'いじめ、先生や友だちのこと、親のこと、将来のこと。どんな話でも聞いてくれる埼玉県の電話です。毎日 10時30分〜18時。',
        en: 'Saitama\'s phone line for children under 18 (high school students too), every day including weekends, 10:30–18:00.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '11', right: false,
      amount: { ja: '無料（電話代はかかります）', en: 'Free (call charges apply)' }, repay: null,
      who: { ja: '埼玉県の子ども（原則18歳未満、高校生も）。保護者からの子育ての相談も受けています。' },
      how: { ja: '048-822-7007 に電話します。午前中のほうがつながりやすいです。' },
      where: { ja: '電話' },
      docs: [],
      ask: ['クラスで仲間はずれにされています', '家族の世話で、勉強する時間がありません'],
      caution: { ja: '祝日と年末年始は休みです。いじめや体罰など、話を聞くだけで解決しないときは、「子どもの権利擁護委員会」が力になってくれます。' },
      supporter: { ja: '埼玉県 子どもの権利擁護委員会の電話相談窓口。10月・11月は土日を含む毎日10:30〜18:00（10/12・11/3・11/23は休み）。権利侵害の調査・調整につながる。' },
      effort: 'low',
      for: { stages: KIDS, paths: [], care: [], careOnly: false, age: { min: null, max: 17 }, areas: ['11'] },
      deadline: null,
      contact: {
        phone: '048-822-7007', phoneLabel: '子どもスマイルネット', line: null, chat: null, web: ST_SMILE,
        hours: { ja: '毎日 10時30分〜18時（祝日・年末年始は休み）', en: 'Every day 10:30–18:00 (closed holidays)' }
      },
      locations: [],
      source: { org: '埼玉県（子どもスマイルネット）', url: ST_SMILE, checked: C },
      verifiedBy: V
    },

    /* ═══════════════════════ 千葉県 ═══════════════════════ */

    {
      id: 'chiba-jiritsu-shikin',
      name: { ja: '自立支援資金貸付（千葉県）', en: 'Independence Support Loan (Chiba)' },
      hook: { ja: '家賃や生活費の支えがほしい', en: 'I need help with rent and living costs' },
      summary: {
        ja: '進学した人は生活費（月5万円）と家賃を、働く人は家賃を、利息なしで借りられます。決まった年数働けば、全額返さなくてよくなります。千葉県では千葉県社会福祉協議会が窓口です。',
        en: 'Interest-free loans for living costs (¥50k/month for students) and rent, fully forgiven after working for a set number of years. In Chiba, run by the Chiba Council of Social Welfare.'
      },
      cat: ['money', 'housing'],
      kind: 'loan_forgivable', basis: 'pref', pref: '12', right: false,
      amount: {
        ja: '生活費 月5万円（進学した人）・家賃（千葉県内は月3万7,200〜4万6,000円まで）・資格をとる費用 25万円まで',
        en: 'Living ¥50k/month (students); rent up to ¥37,200–46,000/month in Chiba; licences up to ¥250k'
      },
      repay: 'conditional',
      who: {
        ja: '児童養護施設・児童自立支援施設・児童心理治療施設・自立援助ホームを出た人、里親・ファミリーホームの委託が終わった人で、親などからお金の支えがない人。出てから5年以内の人。資格の費用は、施設や里親家庭にいる間も使えます。'
      },
      how: { ja: '施設を出た人（いる人）は、その施設に申し込みます。里親家庭の人は、担当の児童相談所に申し込みます。' },
      where: { ja: '施設・児童相談所 → 千葉県社会福祉協議会' },
      docs: ['貸付申込書', '施設長などの意見書（施設・児童相談所が用意）', '家賃支援費・資格取得支援費の所要額計算書'],
      ask: ['自立支援資金貸付を使いたいです。私は対象になりますか？', '返さなくてよくなる条件を教えてください', '連帯保証人がいないときはどうなりますか？'],
      caution: {
        ja: '申しこんだ日より前の分は借りられません（さかのぼりなし）。返さなくてよくなるには、進学した人は卒業後1年以内に就職して5年間、働く人は借りはじめてから5年間、資格の費用は就職してから2年間、働き続けることが必要です。'
      },
      supporter: {
        ja: '千葉県社会福祉協議会 福祉資金部（043-244-2945）。無利子（返還となった場合の延滞は年3.0%）。連帯保証人は原則必要だが、やむを得ず立てられない場合はなしでも可。申請は資金種類ごとに1回まで。退所時に不要だった人も、5年以内なら後から申請可。進学者の生活支援費に医療費実費を2年まで追加可。家賃支援費は住宅扶助額が上限（県内37,200〜46,000円）。就職者の家賃は2年まで。'
      },
      effort: 'high',
      for: { stages: LEAVERS, paths: [], care: CARE, careOnly: true, age: null, areas: ['12'] },
      deadline: {
        ja: '出る日が決まったら早めに。出てから5年以内まで申し込めます。',
        en: 'Start early once your leaving date is set; available up to 5 years after leaving.',
        leaveMonths: -3, months: null, always: false
      },
      contact: { phone: '043-244-2945', phoneLabel: '千葉県社会福祉協議会 福祉資金部', line: null, chat: null, web: CB_JIRITSU, hours: null },
      locations: [],
      source: { org: '千葉県社会福祉協議会', url: CB_JIRITSU, checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'chiba-care-shogakukin',
      name: { ja: '児童養護施設等退所者に対する奨学金（千葉県・給付）', en: 'Chiba Scholarship for Care Leavers (grant)' },
      hook: { ja: '大学や専門学校に行きたいけど、学費が心配', en: 'I want to go to university but worry about the cost' },
      summary: {
        ja: '千葉県の施設や里親家庭から大学・専門学校に進む人に、年30万円をくれる奨学金です。返さなくていいお金です。ほかの奨学金といっしょに使えて、卒業後の進路にも決まりはありません。',
        en: 'A Chiba grant of ¥300,000 a year for young people in care in Chiba who go on to university or vocational school. No repayment, can be combined with other scholarships, and no conditions on your career after graduating.'
      },
      cat: ['education', 'money'],
      kind: 'grant', basis: 'pref', pref: '12', right: false,
      amount: { ja: '年30万円（月2万5,000円分。6か月分ずつ年2回）', en: '¥300,000/year (¥25,000/month, paid twice a year)' },
      repay: 'none',
      who: {
        ja: '千葉県（千葉市・船橋市もふくむ）が措置・委託している、児童養護施設・児童自立支援施設・児童心理治療施設・自立援助ホーム・里親・ファミリーホームの人で、出るときに令和9年4月から大学・短大・高専・専門学校・職業能力開発施設などに進学したい人。お金の事情で進学がむずかしい人。'
      },
      how: { ja: '申請書（様式1）と推薦書（様式2）を、受付期間内に千葉県 児童家庭課へ郵送します。施設や里親の担当の人に相談しながら準備しよう。' },
      where: { ja: '千葉県 健康福祉部 児童家庭課 虐待防止対策室（郵送）' },
      docs: ['奨学金申請書（様式1）', '奨学金推薦書（様式2）', '選ばれたあと: 千葉県社会福祉協議会への申請書と誓約書', '入学後: 学業状況報告書'],
      ask: ['この奨学金に申しこみたいです。推薦書はだれが書きますか？', 'JASSOの奨学金といっしょに使えますか？', '結果はいつわかりますか？'],
      caution: { ja: '進学できなかったときは、もらえません。選ばれた理由は教えてもらえません。' },
      supporter: { ja: '千葉県 児童家庭課 虐待防止対策室 奨学金担当（043-223-2357）。令和8年度募集要項（令和8年7月）: 予約型、受付 令和8年11月2日〜12月18日（消印有効）、2月下旬に書面で通知。選定は申請書・推薦書・児童相談所長の意見をもとに児童家庭課長が決定。給付事務は千葉県社会福祉協議会。寄付金が原資（令和8年度入学者は応募18人・給付18人）。' },
      effort: 'mid',
      for: { stages: ['hs3'], paths: ['study'], care: CARE, careOnly: true, age: null, areas: ['12'] },
      deadline: {
        ja: '令和8年11月2日〜12月18日（消印有効）',
        en: 'Nov 2 – Dec 18, 2026 (postmarked)',
        leaveMonths: null, months: [11, 12], always: false
      },
      contact: { phone: '043-223-2357', phoneLabel: '千葉県 児童家庭課 虐待防止対策室（奨学金担当）', line: null, chat: null, web: CB_SHOGAKU, hours: null },
      locations: [],
      source: { org: '千葉県（児童養護施設等退所者に対する奨学金制度）', url: CB_SHOGAKU, checked: C },
      sources2: [{ org: '千葉県（令和8年度 募集要項）', url: CB_SHOGAKU_PDF }],
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'chiba-cans',
      name: { ja: 'ちばアフターケアネットワークステーション（CANS）', en: 'Chiba Aftercare Network Station (CANS)' },
      hook: { ja: '出たあとのくらしや仕事のこと、相談したい', en: 'I want to talk about life and work after leaving care' },
      summary: {
        ja: '千葉県と千葉市から頼まれて開いている、施設や里親家庭を出た人のための相談窓口です。スタッフ手づくりのごはんを食べながら話を聞いてくれます。無料です。',
        en: 'A free support center for care leavers, run for Chiba Prefecture and Chiba City. Staff listen while you share a home-cooked meal.'
      },
      cat: ['consult', 'work'],
      kind: 'place', basis: 'npo', pref: '12', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '千葉県や千葉市が措置した、児童養護施設などを出た（出る予定の）人と、里親の委託が終わった（終わる予定の）人。今どこに住んでいるかは問いません。' },
      how: { ja: '電話で連絡します（時間外は留守番電話）。ホームページのフォームからも相談できます。' },
      where: { ja: '千葉市中央区長洲（本千葉駅から歩いて約3分）・松戸支所' },
      docs: [],
      ask: ['初めてです。どんなことを相談できますか？', '仕事のことも相談できますか？', '松戸の支所にも行けますか？'],
      caution: { ja: '開いているのは月〜金のおおむね9時〜18時です。' },
      supporter: { ja: '千葉県・千葉市委託の社会的養護自立支援拠点事業。運営: 社会福祉法人生活クラブ（生活クラブ風の村、居住支援法人）。FAX 043-441-7391。県外の施設・里親・児相と連携できれば県外在住者も対象。' },
      effort: 'low',
      for: { stages: LEAVERS, paths: [], care: CARE, careOnly: true, age: null, areas: ['12'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: '043-441-7390', phoneLabel: 'ちばアフターケアネットワークステーション', line: null, chat: 'https://kazenomura.jp/contactus/', web: CB_CANS,
        hours: { ja: '月〜金 おおむね9時〜18時', en: 'Mon–Fri about 9–18' }
      },
      locations: [
        loc('ちばアフターケアネットワークステーション（CANS）', '12100', '千葉県千葉市中央区長洲1-3-1 パークコート100 302号室', 35.603428, 140.120529, '043-441-7390', '月〜金 9:00–18:00ごろ', 'JR本千葉駅から歩いて約3分'),
        loc('ちばアフターケアネットワークステーション 松戸支所', '12207', '千葉県松戸市松戸1495-56 ベルトピア松戸第6 601号室', 35.778313, 139.899155, '043-441-7390', '', 'JR・京成 松戸駅から歩いて約9分')
      ],
      source: { org: '社会福祉法人生活クラブ（生活クラブ風の村）', url: CB_CANS, checked: C },
      eligibleBy: 'origin',
      verifiedBy: V
    },

    {
      id: 'chiba-jisou',
      name: { ja: '児童相談所（千葉県・千葉市・船橋市）', en: 'Child Guidance Centers (Chiba)' },
      hook: { ja: '施設や里親のこと、家のことを相談したい', jr: '家のことや、こわいことを相談したい', en: 'I want to talk about my care placement or my family' },
      summary: {
        ja: '18歳未満の子どもについて、子どもや家族からの相談を受ける公的な窓口です。施設や里親家庭に入ること・出ることも、児童相談所が担当しています。',
        jr: '子どもと家族のことを相談できるところです。千葉県の「子ども家庭110番」は毎日、夜8時まで相談できます。',
        en: 'Public offices for children under 18 and their families. They are also in charge of placements in and out of care.'
      },
      cat: ['consult', 'procedures'],
      kind: 'service', basis: 'pref', pref: '12', right: false,
      amount: null, repay: null,
      who: { ja: '18歳未満の子どもと家族。住んでいる市町村で担当の児童相談所が決まっています。千葉市・船橋市は市の児童相談所です。' },
      how: { ja: '担当の児童相談所に電話します（来所は予約制、平日9時〜17時）。電話相談は「子ども家庭110番」043-252-1152（毎日8時30分〜20時、千葉市・船橋市をのぞく）。' },
      where: { ja: '住んでいる市町村を担当する児童相談所（地図で確認）' },
      docs: [],
      ask: ['施設を出る時期について相談したいです', '担当の児童福祉司さんと話したいです', '18歳をすぎても今のところにいられるか相談できますか？'],
      caution: { ja: '令和8年に松戸・印旛・船橋市の児童相談所ができて、担当の区域が変わりました。地図で自分の担当を確かめてね。' },
      supporter: { ja: '千葉県「児童相談所について」（令和8年10月16日更新）による。子ども家庭110番 043-252-1152: 一般相談 毎日8:30〜20:00（千葉市・船橋市を除く）、虐待の相談・通告 24時間（千葉市を除く）。千葉市児相の電話受付は平日9:00〜16:30（12〜13時除く）。船橋市児相（令和8年7月1日開所）の受付時間は未確認。' },
      effort: 'low',
      for: { stages: KIDS, paths: [], care: [], careOnly: false, age: null, areas: ['12'] },
      deadline: null,
      contact: {
        phone: '043-252-1152', phoneLabel: '子ども家庭110番（千葉県）', line: null, chat: null, web: CB_JISOU,
        hours: { ja: '子ども家庭110番: 毎日 8時30分〜20時（虐待は24時間）', en: 'Kodomo Katei 110: daily 8:30–20:00 (abuse reports 24h)' }
      },
      locations: CB_JISOU_LOCS,
      source: { org: '千葉県（児童家庭課）', url: CB_JISOU, checked: C },
      verifiedBy: V
    },

    {
      id: 'chiba-towns-jiritsu-sodan',
      name: { ja: '千葉県 町村の くらしの相談窓口（自立相談支援）', en: 'Chiba towns: living & work support desks' },
      hook: { ja: 'お金・仕事・住まいのこと、まとめて相談したい', en: 'I want to talk about money, work and housing in one place' },
      summary: {
        ja: '千葉県の町や村に住む人のための、お金・仕事・住まいの無料の相談窓口です。郡ごとに窓口があります。窓口に行けない人には、出向いて相談することもできます。',
        en: 'Free desks for people living in Chiba\'s towns and villages, about money, work and housing, one for each district. Staff can come to you if you cannot visit.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: 'pref', pref: '12', right: false,
      townsOnly: true,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '千葉県の町村に住んでいて、生活に困っている人。生活保護を受けている人はのぞきます。' },
      how: { ja: '住んでいる郡の窓口に電話します。印旛郡（酒々井町・栄町）043-308-6332／香取郡 0478-50-1919／山武郡 0475-77-7532／長生郡 0475-36-3013／夷隅郡 0470-64-6380／安房郡（鋸南町）0470-28-5667。' },
      where: { ja: 'さかえ・しすいワーク・ライフサポートセンター／香取CCC／さんぶ生活相談センターリンクサポート／長生ひなた／夷隅ひなた／ひだまり' },
      docs: [],
      ask: KONKYU_ASK,
      caution: { ja: '市に住んでいる人は、市の窓口が担当です。' + KONKYU_FOOT },
      supporter: { ja: KONKYU_SUP + ' 千葉県「生活困窮者自立支援制度について」（令和8年4月10日更新）の自治体別相談窓口一覧による。町村部の窓口の住所・受付時間は県ページに記載なし。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: CB_TOWN_CODES },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: { phone: null, phoneLabel: null, line: null, chat: null, web: CB_KONKYU, hours: null },
      locations: [],
      source: { org: '千葉県（生活困窮者自立支援制度について）', url: CB_KONKYU, checked: C },
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'chiba-city-jiritsu-sodan',
      name: { ja: '千葉市 生活自立・仕事相談センター（くらしの相談）', en: 'Chiba City Life & Work Support Centers' },
      hook: { ja: 'お金・仕事・住まいのこと、まとめて相談したい', en: 'I want to talk about money, work and housing in one place' },
      summary: {
        ja: '千葉市に住む人のための、お金・仕事・住まいの無料の相談窓口です。6つの区にあり、どのセンターでも相談できます。あなただけの支援プランをいっしょに作ってくれます。',
        en: 'Free centers for Chiba City residents about money, work and housing, one in each of the 6 wards; you can use any of them. They make a support plan with you.'
      },
      cat: ['consult', 'money', 'housing', 'work'],
      kind: 'service', basis: 'local', pref: '12', right: false,
      amount: { ja: '相談は無料', en: 'Free' }, repay: null,
      who: { ja: '千葉市に住んでいて、生活や仕事に困っている人。住んでいる区とちがうセンターでも相談できます。' },
      how: { ja: '近くのセンターに電話するか、行って相談します。' },
      where: { ja: '中央・花見川・稲毛・若葉・緑・美浜の各センター（地図で確認）' },
      docs: [],
      ask: KONKYU_ASK,
      caution: { ja: KONKYU_FOOT },
      supporter: { ja: KONKYU_SUP + ' 千葉市は6区に生活自立・仕事相談センター（運営は千葉市社会福祉協議会・ワーカーズコープ・NPO法人リンク など）。就労準備・家計改善・就労訓練・一時生活支援あり。' },
      effort: 'low',
      for: { stages: NOT_JR, paths: [], care: [], careOnly: false, age: null, areas: ['12100'] },
      deadline: { ja: 'いつでも相談できます', en: 'Anytime', leaveMonths: null, months: null, always: true },
      contact: {
        phone: null, phoneLabel: null, line: null, chat: null, web: CC_KONKYU,
        hours: { ja: '平日 9時〜17時', en: 'Weekdays 9:00–17:00' }
      },
      locations: CC_LOCS,
      source: { org: '千葉市（生活自立・仕事相談センター）', url: CC_KONKYU, checked: C },
      sources2: [{ org: '千葉県（生活困窮者自立支援制度について）', url: CB_KONKYU }],
      eligibleBy: 'residence',
      verifiedBy: V
    },

    {
      id: 'chiba-shogaku-shikin',
      name: { ja: '千葉県奨学資金（高校生の貸付）', en: 'Chiba High School Scholarship Loan' },
      hook: { ja: '高校の生活費や教材費が足りない', jr: '高校に行くお金が足りるか心配', en: 'I need money for high school costs' },
      summary: {
        ja: '高校生に毎月お金を貸してくれる千葉県の奨学金です。利息はありません。中3の秋に予約すると、高校1年の4月分から借りられます。',
        jr: '高校生になったら毎月お金を借りられる、千葉県の奨学金です。利息はありませんが、あとで返すお金です。中3の10〜11月ごろに予約できます。',
        en: 'A Chiba interest-free monthly loan for high school students. Apply in autumn of junior high year 3 to receive it from April of year 1.'
      },
      cat: ['education', 'money'],
      kind: 'loan', basis: 'pref', pref: '12', right: false,
      amount: {
        ja: '月1万円か2万円（私立は3万円も）。家から通わない人は月1万5千円・2万5千円（私立は3万5千円も）',
        en: '¥10k or ¥20k/month (¥30k private); living away from home ¥15k/¥25k (¥35k private)'
      },
      repay: 'yes',
      who: { ja: '高校などに通う人（予約は中学生）で、保護者が千葉県に住んでいる人。お金の事情で勉強を続けるのがむずかしい人。' },
      how: { ja: '中3の人は10〜11月ごろ、中学校を通して予約します。高校生は4月上旬〜5月上旬（一次）、10月（二次）に高校を通して申しこみます。家計が急に変わったときはいつでも。' },
      where: { ja: '中学校・高校の担当の先生や事務室 → 千葉県教育委員会 財務課' },
      docs: ['前の年の所得証明書など、収入がわかる書類', '学校から配られる申請書類'],
      ask: ['予約募集の締切はいつですか？', '連帯保証人と保証人を立てられないときは、どうすればいいですか？', '返すのはいつから、毎月いくらくらいですか？'],
      caution: { ja: '返すお金です。連帯保証人（親権者）と保証人（別にくらす大人）が必要です。母子・父子・寡婦福祉資金（修学資金）を借りている人は使えません。' },
      supporter: { ja: '千葉県教育委員会 企画管理部財務課 育英班（0120-23-1008）。貸付終了の翌月から6か月据置後、10〜12年以内で返還（例: 月2万円×3年→10年以内、年7.2万円程度）。収入基準の目安: 給与所得4人世帯で総収入768万円など。高専は対象外（JASSOへ）。社会的養護の子どもは保証人要件を施設・児相と早めに確認。' },
      effort: 'mid',
      for: { stages: ['jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: { min: 14, max: 19 }, areas: ['12'] },
      deadline: {
        ja: '中3の予約は10〜11月ごろ。高校生は4月上旬〜5月上旬と10月（締切は学校ごとにちがいます）',
        en: 'Junior high advance: around Oct–Nov; high school: April–early May and October (school deadlines vary)',
        leaveMonths: null, months: [10, 11, 4, 5], always: false
      },
      contact: { phone: '0120-23-1008', phoneLabel: '千葉県教育委員会 財務課 育英班', line: null, chat: null, web: CB_SHIKIN, hours: null },
      locations: [],
      source: { org: '千葉県教育委員会（千葉県奨学資金の貸付け）', url: CB_SHIKIN, checked: C },
      verifiedBy: V
    },

    {
      id: 'chiba-saposute',
      name: { ja: '地域若者サポートステーション（千葉県内8か所）', en: 'Youth Support Stations in Chiba (8 places)' },
      hook: { ja: '働くことに自信がない。近くで相談したい', en: 'I am not confident about working. I want help nearby' },
      summary: {
        ja: '働きはじめる前の準備から手伝ってくれる無料の窓口「サポステ」の、千葉県内の場所です。',
        en: 'Where to find "Saposute" in Chiba: free centers that help you get ready to work.'
      },
      cat: ['work', 'consult'],
      kind: 'service', basis: 'national', pref: '12', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '15〜49歳で、今は働いていない・学校に行っていない人と、その家族。' },
      how: { ja: '近くのサポステに電話して予約してから行きます。' },
      where: { ja: '千葉市（幕張）・市川・柏・成田・木更津・船橋・茂原・松戸' },
      docs: [],
      ask: ['まず見学や話を聞くだけでもいいですか？', '職場体験はできますか？'],
      caution: { ja: '開いている時間はサポステごとにちがいます。行く前に電話で確かめてください。' },
      supporter: { ja: '厚生労働省の委託事業。所在地・電話は厚生労働省「全国のサポステ」で確認（受付時間は各サポステのサイトで要確認）。ちば南東部は事務所（茂原503）と相談場所が別。' },
      effort: 'low',
      for: { stages: ['left0', 'left1', 'nohs'], paths: ['work', 'unsure'], care: [], careOnly: false, age: { min: 15, max: 49 }, areas: ['12'] },
      deadline: { ja: 'いつでも', en: 'Any time', leaveMonths: null, months: null, always: true },
      contact: { phone: null, phoneLabel: null, line: null, chat: null, web: SAPO_NET, hours: null },
      locations: [
        loc('ちば地域若者サポートステーション（ちば仕事プラザ内）', '12100', '千葉県千葉市美浜区幕張西4-1-10', 35.659996, 140.041367, '043-351-5531', '', ''),
        loc('いちかわ・うらやす若者サポートステーション', '12203', '千葉県市川市相之川4-14-12 水野ビル3階', 35.672508, 139.900269, '047-711-3820', '', ''),
        loc('かしわ地域若者サポートステーション', '12217', '千葉県柏市柏下66-1 柏市保健勤労会館2階', 35.866917, 139.986542, '04-7100-1940', '', ''),
        loc('ちば北総地域若者サポートステーション（成田市勤労会館内）', '12211', '千葉県成田市不動ヶ岡1113-1', 35.772415, 140.309860, '0476-24-7880', '', ''),
        loc('ちば南部地域若者サポートステーション', '12206', '千葉県木更津市富士見1-1-1 たちより館2階', 35.380558, 139.925842, '0438-23-3711', '', ''),
        loc('ふなばし地域若者サポートステーション', '12204', '千葉県船橋市湊町2-1-2 Y.M.A.Officeビル5階', 35.695396, 139.984558, '047-437-6003', '', ''),
        loc('ちば南東部地域若者サポートステーション（相談・グループワーク）', '12210', '千葉県茂原市高師291-5 グランヴェール高師206号', 35.431686, 140.297745, '0475-23-5515', '', '事務所は茂原市茂原503'),
        loc('まつど若者サポートステーション', '12207', '千葉県松戸市本町7-10 ちばぎん松戸ビル8階', 35.784664, 139.898209, '047-703-8301', '', '')
      ],
      source: { org: '厚生労働省（全国のサポステ）', url: SAPO_NET, checked: C },
      verifiedBy: V
    },

    {
      id: 'chiba-lighthouse',
      name: { ja: 'ライトハウスちば（千葉県子ども・若者総合相談センター）', en: 'Lighthouse Chiba (Chiba Youth Consultation Center)' },
      hook: { ja: 'どこに相談すればいいかわからない', jr: '学校に行けない。だれに相談したらいいかわからない', en: 'I don\'t know who to ask' },
      summary: {
        ja: 'ひきこもり、ニート、不登校など、どこに相談したらいいかわからないときの千葉県の無料の窓口です。電話で話を聞いて、合う支援先を教えてくれます。家族からの相談もできます。',
        jr: '学校に行けない、家から出られない。そんなとき電話で話を聞いてくれる千葉県の窓口です。家族や先生からの相談もできます。',
        en: 'Chiba\'s free first stop when you don\'t know where to go, for issues like withdrawal, not working or not attending school. They listen by phone and point you to the right support.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '12', right: false,
      amount: { ja: '無料', en: 'Free' }, repay: null,
      who: { ja: '千葉県に住む、おおむね39歳までの子ども・若者と、その家族や関係する人。' },
      how: { ja: '043-420-8066 に電話します。会って話したいときは、電話・メール・ホームページ・ファックスで予約してから行きます。' },
      where: { ja: '電話（面接は 千葉県都町合同庁舎4階・予約制）' },
      docs: [],
      ask: ['どこに相談したらいいかわからなくて、電話しました', '家から出るのがつらいです。何から始めればいいですか？'],
      caution: { ja: '月曜と年末年始は休みです（月曜が祝日のときは次の火曜が休み）。' },
      supporter: { ja: '千葉県が子ども・若者育成支援推進法にもとづき設置（平成24年〜）。面接相談は週4日程度。義務教育終了後〜30歳前後向けの支援プログラム（木・金・日、要予約、6か月めど）、保護者の「親の会」（年6回）あり。メール lighthouse@abeam.ocn.ne.jp、FAX 043-420-8023。' },
      effort: 'low',
      for: { stages: ALL_ST, paths: [], care: [], careOnly: false, age: null, areas: ['12'] },
      deadline: null,
      contact: {
        phone: '043-420-8066', phoneLabel: 'ライトハウスちば', line: null, chat: null, web: CB_LIGHT,
        hours: { ja: '火〜日 10時〜17時', en: 'Tue–Sun 10:00–17:00' }
      },
      locations: [
        loc('千葉県子ども・若者総合相談センター ライトハウスちば（千葉県都町合同庁舎4階）', '12100', '千葉県千葉市中央区都町2-1-12', 35.611534, 140.135941, '043-420-8066', '火〜日 10:00–17:00', '面接は予約制。JR千葉駅から京成バス「千葉テレビ入口」下車すぐ')
      ],
      source: { org: '千葉県（ライトハウスちば）', url: CB_LIGHT, checked: C },
      verifiedBy: V
    },

    {
      id: 'chiba-kosapo-24h',
      name: { ja: '子どもと親のサポートセンター（千葉県 24時間電話相談）', en: 'Chiba Child & Parent Support Center (24h phone)' },
      hook: { ja: '夜でも、今すぐだれかと話したい', jr: 'いじめや学校のことで、今すぐ話したい', en: 'I need to talk to someone right now, even at night' },
      summary: {
        ja: '学校や家のこと、いじめなどの悩みを、24時間いつでも無料で電話できる千葉県教育委員会の窓口です。メールでも相談できます。',
        jr: 'いじめ、学校、家のこと。24時間いつでも、無料で電話できる千葉県の窓口です。',
        en: 'Chiba Board of Education\'s free 24-hour phone line for worries about school, home or bullying. Email is available too.'
      },
      cat: ['consult'],
      kind: 'hotline', basis: 'pref', pref: '12', right: false,
      amount: { ja: '無料（フリーダイヤル）', en: 'Free (toll-free)' }, repay: null,
      who: { ja: '千葉県の小・中・高校生などの児童生徒と、その保護者。' },
      how: { ja: '0120-415-446 に電話します（千葉県内からかけてください）。メール saposoudan@chiba-c.ed.jp でも相談できます。' },
      where: { ja: '電話・メール' },
      docs: [],
      ask: ['学校に行きたくありません', 'いじめのことを、だれにも言えません'],
      caution: { ja: '「24時間子供SOSダイヤル」0120-0-78310 も、千葉県内からはここにつながります。' },
      supporter: { ja: '千葉県教育委員会 子どもと親のサポートセンター。電話・メール24時間。来所相談は予約制（平日9〜17時、新規は保護者から電話申込）。ワンストップ・オンライン相談（Zoom・匿名チャット可）、小4〜高校生向けSNS相談もある。' },
      effort: 'low',
      for: { stages: ['jhs12', 'jhs3', 'hs12', 'hs3'], paths: [], care: [], careOnly: false, age: { min: null, max: 18 }, areas: ['12'] },
      deadline: null,
      contact: {
        phone: '0120-415-446', phoneLabel: '子どもと親のサポートセンター', line: null, chat: null, web: CB_KOSAPO,
        hours: { ja: '24時間', en: '24 hours' }
      },
      locations: [],
      source: { org: '千葉県教育委員会（子どもと親のサポートセンター相談窓口）', url: CB_KOSAPO, checked: C },
      verifiedBy: V
    }
  );
})();
