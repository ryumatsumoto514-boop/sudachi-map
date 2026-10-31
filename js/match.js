/* 巣立ちマップ v8 — match.js (FIND; v8 WARDS)
   v8 (SPEC-v8 workstream 6): answers.area may also be a WARD of a 政令市 ('14101' 鶴見区: an area entry with
   parent '14100'). A ward answer matches [] + [pref] + [city] + [ward]; prefOf('14101') = '14', cityOf('14101') =
   '14100', isKu('14101') = true (Tokyo's 23区 are not isKu), areaFull('14101') = '横浜市 鶴見区' (en 'Tsurumi, Yokohama'). City answers are unchanged.
   v7 (SPEC-v7 data contract): Kanto. answers.area is a 5-digit 区市町村 code (政令市 = the city code), a 2-digit
   prefecture code (that prefecture, city not decided), 'other' (outside Kanto) or null. Records: basis 'national' ·
   'tokyo' (東京都, implicitly areas ['13']) · 'pref' (another prefecture's own program, field pref) · 'local' · 'npo';
   for.areas [] = anywhere in Japan, ['14'] = anywhere in 神奈川県, ['14100'] = 横浜市 residents only.
     area in prefecture X  → [] , [X] and records naming the person's city; other prefectures' pref/local records out;
                              with only X known, city-only records of X stay but rank lower (local: true)
     'other'               → national + NPO records with no area limit only
     null                  → national, NPO and every prefecture's pref-level records; city-only records rank lower
   Old saved Tokyo answers ('13', 13xxx) keep working (they are just prefecture 13 / a Tokyo city).
   v5: answer labels follow the shorter question options (SPEC-v5 Part B 質問: options ≤ 10 chars); scoring unchanged.
   SM.match(answers)        -> [{ p, score, why:[{ja,jr?,en}], group, local, careNote }] sorted by fit
   SM.matchSummary(answers) -> [{ key, q, label, set }] for the answers bar (all 6 questions, in order)
   Helpers also used by the find view (additive, not in SPEC):
   SM.matchUtil = { norm, bands, labels, nowOpen, isFree, nearby, deadlineRank, EFFORT, inTokyo, isWard,
                    audienceOf, urgentIds, isJunior, effPath, jrOk,
                    isCity, prefOf, prefs, pref, prefName, areaName, recPref, areasOf, scopeOf, usableIn,
                    isKu, cityOf, areaFull (v8) }
   why lines are {ja, jr?, en} plus an optional kind: 'for' (who the service is for → shown as 「対象」)
   or 'note' (a tip → shown as 「ポイント」); plain lines are reasons (「理由」).
   v3 / SPEC-v3 §3 — 中学生 (stage jhs12/jhs3 or age a12):
     · a record is hidden when for.age.min > 15, or when its stages do not include jhs12/jhs3 —
       unless stages is [] and the record is open to under-15s (age null, or age.min null/≤14)
     · path 'hs' (高校に行きたい) is the junior form of 'study'; the two map onto each other when the
       stage answer changes, so an old answer never hides everything
     · kind, short why-lines: 「中3で高校に行きたいので」「中学生も相談できるので」「高校に入る前に知っておくと安心なので」
   Tag-based scoring. Nothing here touches the network or storage. */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.data = SM.data || {};

  function L(o) { return SM.L ? SM.L(o) : (o && (o.ja || o)) || ''; }
  function lang() { try { return SM.lang ? SM.lang() : 'ja'; } catch (e) { return 'ja'; } }
  function areaOf(code) { try { return SM.area ? SM.area(code) : null; } catch (e) { return null; } }

  /* ---------------- answer labels (shared with find.js) ---------------- */
  var LABELS = {
    stage: {
      jhs12: { ja: '中1・中2', en: 'Junior high yr 1–2' },
      jhs3: { ja: '中3', en: 'Junior high yr 3' },
      hs12: { ja: '高1・高2', en: 'High school yr 1–2' },
      hs3: { ja: '高3', en: 'High school yr 3' },
      left0: { ja: '巣立って1年以内', en: 'Left care < 1 year ago' },
      left1: { ja: '巣立って1年以上', en: 'Left care 1+ years ago' },
      nohs: { ja: '高校に行っていない', en: 'Not in high school' }
    },
    stageShort: {
      jhs12: { ja: '中1・中2', en: 'JHS yr 1–2' }, jhs3: { ja: '中3', en: 'JHS yr 3' },
      hs12: { ja: '高1・高2', en: 'HS yr 1–2' }, hs3: { ja: '高3', en: 'HS yr 3' },
      left0: { ja: '巣立って1年以内', en: 'Left < 1 yr' }, left1: { ja: '巣立って1年以上', en: 'Left 1+ yrs' },
      nohs: { ja: '高校に行っていない', en: 'Not in HS' }
    },
    path: {
      hs: { ja: '高校に行きたい', en: 'Want to go to high school' },
      study: { ja: '進学したい', en: 'Want to study' },
      work: { ja: '働きたい', en: 'Work' },
      unsure: { ja: 'まだ決めていない', en: 'Not decided yet' }
    },
    age: {
      a12: { ja: '12〜14歳', en: '12–14' },
      a15: { ja: '15〜17歳', en: '15–17' }, a18: { ja: '18〜19歳', en: '18–19' },
      a20: { ja: '20〜22歳', en: '20–22' }, a23: { ja: '23歳以上', en: '23+' }
    },
    care: {
      facility: { ja: '児童養護施設', en: "Children's home" },
      foster: { ja: '里親・ファミリーホーム', en: 'Foster / family home' },
      jhome: { ja: '自立援助ホーム', en: 'Independence home' },
      other: { ja: 'そのほか', en: 'Other' },
      skip: { ja: '答えない', en: 'Prefer not to say' }
    }
  };
  var BANDS = { a12: [12, 14], a15: [15, 17], a18: [18, 19], a20: [20, 22], a23: [23, 30] };
  var JR_STAGES = { jhs12: 1, jhs3: 1 };
  // 中学生? Core's SM.isJunior when present (same rule), so the view and the matcher always agree.
  function isJunior(a) {
    a = a || {};
    if (SM.isJunior) { try { return !!SM.isJunior(a); } catch (e) { } }
    return !!JR_STAGES[a.stage] || a.age === 'a12';
  }
  // 'hs' (高校に行きたい) is the junior form of 'study' (進学したい): map so an answer given under
  // one stage still means the same thing after the stage changes.
  function effPath(a) {
    var p = (a || {}).path || null;
    if (isJunior(a)) return p === 'study' ? 'hs' : p;
    return p === 'hs' ? 'study' : p;
  }
  var EFFORT = { low: 0, mid: 1, high: 2 };
  var CARE_YES = { facility: 1, foster: 1, jhome: 1, other: 1 };
  var CAT_ORDER = ['housing', 'money', 'education', 'work', 'procedures', 'consult'];
  function catOrder() { return SM.CAT_ORDER || CAT_ORDER; }
  function catLabel(k) {
    var c = SM.CATS && SM.CATS[k];
    if (!c) return { ja: k, en: k };
    return { ja: c.ja, en: c.en };
  }

  /* ---------------- text normalisation (search) ---------------- */
  // NFKC (full/half width), lower case, katakana -> hiragana, drop spaces/punctuation that vary.
  function norm(s) {
    s = String(s == null ? '' : s);
    try { s = s.normalize('NFKC'); } catch (e) { }
    s = s.toLowerCase();
    s = s.replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); });
    s = s.replace(/[\s　・･、。,.\-‐－―〜~（）()「」『』【】\u2060]/g, '');
    return s;
  }

  /* ---------------- area helpers (SPEC-v7 data contract) ---------------- */
  function isWard(code) { return typeof code === 'string' && /^13\d{3}$/.test(code); }   // a Tokyo 区市町村 (kept for old callers)
  function inTokyo(code) { return code === '13' || isWard(code); }
  function isCity(code) { return typeof code === 'string' && /^\d{5}$/.test(code); }
  function isPrefCode(code) { return typeof code === 'string' && /^\d{2}$/.test(code); }
  // the prefecture of an area code: '14100' → '14', '14' → '14', anything else → null
  function prefOf(code) {
    code = code == null ? '' : String(code);
    if (isCity(code)) return code.slice(0, 2);
    return isPrefCode(code) ? code : null;
  }
  /* v8 (WARDS): a ward of a 政令市 is the only area entry with a parent (data/areas.js). cityOf gives the 区市町村 a
     code stands for: the ward's city ('14101' → '14100'), a city itself ('14100'), null for a prefecture / 'other' */
  function isKu(code) { var a = isCity(code) ? areaOf(code) : null; return !!(a && a.parent); }
  function cityOf(code) {
    code = code == null ? '' : String(code);
    if (!isCity(code)) return null;
    var a = areaOf(code);
    return a && a.parent ? String(a.parent) : code;
  }
  // SM.data.prefs (data/areas.js) when it is there; the seven names otherwise (code order 08 … 14)
  var PREF_FALLBACK = [
    { code: '08', name: '茨城県', kana: 'いばらきけん', en: 'Ibaraki' },
    { code: '09', name: '栃木県', kana: 'とちぎけん', en: 'Tochigi' },
    { code: '10', name: '群馬県', kana: 'ぐんまけん', en: 'Gunma' },
    { code: '11', name: '埼玉県', kana: 'さいたまけん', en: 'Saitama' },
    { code: '12', name: '千葉県', kana: 'ちばけん', en: 'Chiba' },
    { code: '13', name: '東京都', kana: 'とうきょうと', en: 'Tokyo' },
    { code: '14', name: '神奈川県', kana: 'かながわけん', en: 'Kanagawa' }
  ];
  function prefs() { var p = SM.data && SM.data.prefs; return p && p.length ? p : PREF_FALLBACK; }
  function pref(code) {
    var list = prefs();
    for (var i = 0; i < list.length; i++) if (list[i] && String(list[i].code) === String(code)) return list[i];
    for (var j = 0; j < PREF_FALLBACK.length; j++) if (PREF_FALLBACK[j].code === String(code)) return PREF_FALLBACK[j];
    return null;
  }
  function prefName(code, en) { var p = pref(code); return p ? (en ? (p.en || p.name) : p.name) : ''; }
  // a 区市町村 or a prefecture by code, in the current language ('' when unknown)
  function areaName(code, en) {
    if (en == null) en = lang() === 'en';
    if (isPrefCode(code)) return prefName(code, en);
    var a = areaOf(code);
    return a ? (en ? (a.en || a.name) : a.name) : '';
  }
  // a ward with its city ('横浜市 鶴見区' / 'Tsurumi, Yokohama'): 緑区 alone could be one of four; anything else = areaName
  function areaFull(code, en) {
    if (en == null) en = lang() === 'en';
    var nm = areaName(code, en);
    if (!isKu(code)) return nm;
    var c = areaName(cityOf(code), en);
    return c ? (en ? nm + ', ' + c : c + ' ' + nm) : nm;
  }
  // a record's area list: basis 'tokyo' with none means all of Tokyo
  function areasOf(p) {
    var ar = ((p && p.for && p.for.areas) || []).map(String);
    if (!ar.length && p && p.basis === 'tokyo') return ['13'];
    return ar;
  }
  function regional(p) { return !!p && (p.basis === 'tokyo' || p.basis === 'pref' || p.basis === 'local'); }
  // the prefecture a 都・県・区市町村 record belongs to (null for national / NPO records with no area)
  function recPref(p) {
    if (!p) return null;
    if (p.pref) return String(p.pref);
    if (p.basis === 'tokyo') return '13';
    var ar = areasOf(p);
    for (var i = 0; i < ar.length; i++) { var x = prefOf(ar[i]); if (x) return x; }
    // every local record from before v7 is a Tokyo one (new ones carry pref)
    return p.basis === 'local' ? '13' : null;
  }
  /* who runs it, as one key for the scope filter: 'national' · 'npo' · 'pref:13' (東京都 = basis 'tokyo') ·
     'pref:14' (神奈川県 …) · 'local' */
  function scopeOf(p) {
    if (!p) return 'national';
    if (p.basis === 'tokyo' || p.basis === 'pref') return 'pref:' + (recPref(p) || '13');
    if (p.basis === 'local') return 'local';
    return p.basis === 'npo' ? 'npo' : 'national';
  }
  /* can someone living in `area` use this record at all? (the area rule of evaluate(), on its own).
     Returns false (no), 'city' (made for their city), 'pref' (open to their prefecture), 'any' (no area limit) or
     'later' (city-only, city not known yet) */
  function usableIn(p, area) {
    var areas = areasOf(p);
    var cityOnly = areas.length > 0 && areas.every(isCity);
    if (area === 'other') return !areas.length && !regional(p) ? 'any' : false;
    // a ward answer counts as its city too (SPEC-v8: [] + [pref] + [city] + [ward])
    var myPref = prefOf(area), myWard = isKu(area) ? area : null, myCity = myWard ? cityOf(myWard) : (isCity(area) ? area : null);
    if (!myPref) return !areas.length ? 'any' : cityOnly ? 'later' : 'pref';
    if (regional(p)) { var rp = recPref(p); if (rp && rp !== myPref) return false; }
    // a prefecture's desk for 町村 residents only (townsOnly): not for people who live in one of its 市
    if (p.townsOnly && myCity) { var ma = areaOf(myCity); if (ma && ma.type && !/^(machi|mura|town|village)$/.test(ma.type) && areas.indexOf(myCity) === -1) return false; }
    if (!areas.length) return 'any';
    if (myCity && (areas.indexOf(myCity) !== -1 || (myWard && areas.indexOf(myWard) !== -1))) return 'city';
    if (areas.indexOf(myPref) !== -1) return 'pref';
    if (!myCity && cityOnly && areas.some(function (c) { return prefOf(c) === myPref; })) return 'later';
    // made for one ward of the person's city, the ward not known yet (横浜市 answered, 鶴見区 record): keep, lower
    if (myCity && !myWard && cityOnly && areas.some(function (c) { return isKu(c) && cityOf(c) === myCity; })) return 'later';
    // a city's scheme decided by where you LEFT care (eligibleBy 'origin'), not where you live: in the same
    // prefecture it stays in the list, lower down (never in あなたに合いそう)
    if (myCity && cityOnly && p.eligibleBy === 'origin' && areas.some(function (c) { return prefOf(c) === myPref; })) return 'later';
    return false;
  }
  /* v7: national schemes each 都県 runs as its own program (自立支援資金貸付, サポステ). Ids follow
     '<pref slug>-<national id>' (tokyo-jiritsu-shikin, kanagawa-saposute …). One support, one row:
     prefecture known and it has its own version → only that version; area unknown → only the national row, with
     a note that the office depends on the prefecture; 'other' → only the national row. */
  var VERSIONED = { 'jiritsu-shikin': 1, 'saposute': 1 };
  var PREF_SLUG = { '08': 'ibaraki', '09': 'tochigi', '10': 'gunma', '11': 'saitama', '12': 'chiba', '13': 'tokyo', '14': 'kanagawa' };
  function prefVersion(baseId, pc) {
    if (!VERSIONED[baseId] || !PREF_SLUG[pc] || !SM.program) return null;
    var p = null;
    try { p = SM.program(PREF_SLUG[pc] + '-' + baseId) || null; } catch (e) { p = null; }
    return p;
  }
  // the national id a prefecture version stands for ('kanagawa-saposute' → 'saposute'), else null
  function versionBase(p) {
    if (!p || !p.id || VERSIONED[p.id]) return null;
    var m = /^([a-z]+)-(.+)$/.exec(p.id);
    if (!m || !VERSIONED[m[2]]) return null;
    for (var pc in PREF_SLUG) if (PREF_SLUG[pc] === m[1]) return m[2];
    return null;
  }
  // the id the person should see for a (possibly versioned) record: their prefecture's version when there is one
  function ownVersion(id, area) {
    var pc = prefOf(area);
    var v = pc ? prefVersion(id, pc) : null;
    return v ? v.id : id;
  }

  /* ---------------- deadline helpers ---------------- */
  function nowOpen(p, now) {
    var d = p.deadline;
    if (!d) return true;
    if (d.always) return true;
    if (d.months && d.months.length) {
      var m = (now || new Date()).getMonth() + 1;
      return d.months.indexOf(m) !== -1;
    }
    return false;
  }
  // smaller = sooner. Fixed windows: months until the window opens/closes; relative or open-ended later.
  function deadlineRank(p, now) {
    var d = p.deadline;
    if (!d) return 60;
    if (d.months && d.months.length) {
      var m = (now || new Date()).getMonth() + 1, best = 99;
      d.months.forEach(function (x) { var dist = (x - m + 12) % 12; if (dist < best) best = dist; });
      return best;
    }
    if (typeof d.leaveMonths === 'number') return 20 + Math.max(0, 12 + d.leaveMonths);
    if (d.always) return 50;
    return 40;
  }
  /* F06: money you never pay back, by the same rule as the green 「返さなくていい」 line on every row
     (SM.ui.repayLabel) and the about page's count: repay 'none', or a grant with no repay field. Free counselling
     is not "money you do not pay back", so 返さなくていいだけ / 返さなくていい順 no longer keep (nearly) everything. */
  function isFree(p) {
    if (!p) return false;
    if (p.repay === 'none') return true;
    return !p.repay && p.kind === 'grant';
  }
  // an office in the person's city (or prefecture, when only that is known)
  function nearby(p, area) {
    var locs = p.locations || [];
    if (!locs.length || area === 'other') return false;
    // a ward: its own offices and its city's; a city: its offices and those placed in one of its wards
    if (isCity(area)) { var cc = cityOf(area); return locs.some(function (l) { return l && (String(l.area) === area || cityOf(String(l.area || '')) === cc); }); }
    var pc = prefOf(area) || '13', nm = prefName(pc, false);
    return locs.some(function (l) { return l && (prefOf(String(l.area || '')) === pc || (!!nm && String(l.addr || '').indexOf(nm) === 0)); });
  }

  /* ---------------- why lines ---------------- */
  var STAGE_WHY = {
    jhs12: { ja: '中学生なので', en: "You're in junior high" },
    jhs3: { ja: '中3で、高校受験の年なので', en: "It's your high-school entrance exam year" },
    hs12: { ja: '高校生なので', en: "You're in high school" },
    hs3: { ja: '高3で、今年度に巣立つので', en: "You're leaving care this school year" },
    left0: { ja: '巣立って1年以内なので', en: 'You left care less than a year ago' },
    left1: { ja: '巣立ったあとも使えるので', en: 'You can use it after leaving care' },
    nohs: { ja: '高校に行っていなくても使えるので', en: 'You can use it without high school' }
  };
  var STAGE_PRE = {
    jhs12: { ja: '中学生で', en: "You're in junior high and " },
    jhs3: { ja: '中3で', en: "You're in your last junior high year and " },
    hs12: { ja: '高校生で', en: "You're in high school and " },
    hs3: { ja: '高3で', en: "You're in your last HS year and " },
    left0: { ja: '巣立ったばかりで', en: 'You just left care and ' },
    left1: { ja: '巣立ったあとで', en: 'You have left care and ' }
  };
  var PATH_WHY = {
    hs: { ja: '高校に行きたいので', en: 'want to go to high school' },
    study: { ja: '進学したいので', en: 'want to study' },
    work: { ja: '働きたい・働いているので', en: 'want to work / are working' }
  };
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function wardName(code, en) {
    var nm = areaName(code, !!en);
    return nm || (en ? 'your area' : 'お住まいの地域');
  }

  /* ---------------- audience-specific records ---------------- */
  // Records made for one group of people. They rank lower (we never ask about these things)
  // and carry a visible "for whom" line so nobody wonders why a women's centre is in their list.
  var AUDIENCE = {
    'tokyo-josei-center': 'women',
    'tokyo-tmc-navi': 'foreign'
  };
  var AUDIENCE_WHY = {
    women: { ja: '女性のための窓口です', en: 'A service for women' },
    foreign: { ja: '外国にルーツがある人のための窓口です', en: 'For people from other countries' }
  };
  function audienceOf(p) { return p.audience || AUDIENCE[p.id] || null; }
  // 中3 (高校受験の年): the basics every 中3 should know first — exam costs, tuition, school costs
  var JR_BASICS = { 'tokyo-juken-challenge': 1, 'koko-shugaku': 1, 'koko-kyufukin': 1 };
  // 施設・里親家庭・自立援助ホーム: 塾代や受験料は施設（措置費）が出すことが多い — ask staff before a household loan
  var CARE_HOME = { facility: 1, foster: 1, jhome: 1 };
  var CARE_PAID = { 'tokyo-juken-challenge': 1 };
  // 高3で進学したい: the two core schemes for university / 専門学校 money
  var STUDY_BASICS = { 'jasso-kyufu': 1, 'jasso-genmen': 1 };
  function hasJrStage(p) {
    var st = (p && p.for && p.for.stages) || [];
    return st.indexOf('jhs12') !== -1 || st.indexOf('jhs3') !== -1;
  }
  /** SPEC-v3 §3 data rule: may this record be shown to a 中学生 at all? (answers-independent; used by
   *  related lists on program / lesson pages so nothing adult-only leaks to a 中学生) */
  function jrOk(p) {
    if (!p) return false;
    var f = p.for || {};
    var stages = f.stages || [];
    var ag = f.age || null;
    var aMin = ag && ag.min != null ? ag.min : null;
    var hasAge = !!(ag && (ag.min != null || ag.max != null));
    if (aMin != null && aMin > 15) return false;
    if (hasJrStage(p)) return true;
    if (stages.length) return false;
    return !(hasAge && !(aMin == null || aMin <= 14));
  }
  // safety net: the schemes you have a right to when there is no home or money
  var SAFETY_NET = { 'seikatsu-hogo': 1, 'jukyo-kakuho': 1, 'jiritsu-sodan': 1 };
  // "今、住む場所がない・家にいられない" (Q4 urgent): these come first, in this order
  var URGENT_IDS = ['tokyo-challenge-net', 'seikatsu-hogo', 'b4s-line-soudan', 'jiritsu-enjo', 'jiso-189', 'jiritsu-sodan'];
  // 中学生: "家にいられない" means a child-protection call first, never adult housing schemes
  var URGENT_JR = ['jiso-189', 'kodomo-sos', 'tokyo-jisou', 'tokyo-kodomo-net', 'childline', 'b4s-line-soudan'];
  function urgentIds(a) {
    a = a || {};
    if (isJunior(a)) return URGENT_JR.slice();
    var young = a.age === 'a15' || a.stage === 'hs12' || a.stage === 'hs3';
    var adult = a.age === 'a18' || a.age === 'a20' || a.age === 'a23' || a.stage === 'left0' || a.stage === 'left1';
    return URGENT_IDS.filter(function (id) {
      if (id === 'jiso-189') return !adult;          // 189 is for under 18
      if (id === 'seikatsu-hogo') return !young || !!adult;
      return true;
    });
  }

  /* ---------------- core scoring ---------------- */
  var TOKYO_VERSION = { 'jiritsu-shikin': 'tokyo-jiritsu-shikin' };
  SM.tokyoVersion = TOKYO_VERSION;
  var TWIN_NOTE = { kind: 'note', ja: '住む都県で窓口がちがいます', jr: '住む都県で窓口がちがうよ', en: 'The office depends on your prefecture' };
  /* o.everywhere: every record in Kanto, whatever the area (さがす with 「住む所で使える」 turned off) */
  function evaluate(p, a, o) {
    o = o || {};
    var f = p.for || {};
    var stages = f.stages || [], paths = f.paths || [], cares = f.care || [], areas = areasOf(p);
    var score = 10, why = [], local = false, careNote = false, otherLocal = false;
    var stageHit = false, pathHit = false;
    var junior = isJunior(a);
    var path = effPath(a);
    var jrStage = hasJrStage(p);

    // --- 中学生 (SPEC-v3 §3): nothing made only for older people
    if (junior && !jrOk(p)) return null;

    // --- area rules (SPEC-v7 data contract; see the header)
    var area = o.everywhere ? null : (a.area || null);
    if (area && area !== 'other' && !prefOf(area)) area = null;   // an unknown value counts as unanswered
    var myPref = prefOf(area), myWard = isKu(area) ? area : null, myCity = myWard ? cityOf(myWard) : (isCity(area) ? area : null);
    var cityOnly = areas.length > 0 && areas.map(String).every(isCity);
    var twinNote = false;
    if (!o.everywhere) {
      // one support, one row (see VERSIONED): the national row gives way to the person's prefecture's own version
      if (VERSIONED[p.id] && myPref && prefVersion(p.id, myPref)) return null;
      if (!area) {
        // area unknown: a prefecture's version waits for the answer; the national row says the office depends on it
        if (versionBase(p)) return null;
        if (VERSIONED[p.id]) twinNote = true;
        // …and so do 区市町村 programs and desks for one city or for 町村 only
        if (p.basis === 'local' || p.townsOnly || cityOnly) return null;
      }
    }
    var use = usableIn(p, area);
    if (!use) return null;
    // area unknown: one prefecture's own program may not be the person's — it stays, a step lower
    if (!area && !o.everywhere && (regional(p) || areas.length)) score -= 3;
    if (use === 'city') {
      score += 5;
      // the place the record names: the ward when it is made for it, else the city (横浜市に住んでいるので)
      var named0 = myWard && areas.indexOf(myWard) !== -1 ? myWard : myCity;
      why.push({ prio: 0.5, w: {
        ja: wardName(named0, false) + (a.stage === 'hs12' || a.stage === 'hs3' ? 'に住む予定なので' : 'に住んでいるので'),
        jr: wardName(named0, false) + 'に住んでいるので',
        en: 'For people living in ' + wardName(named0, true) } });
    } else if (use === 'pref') {
      if (myPref) score += 1;
    } else if (use === 'later') {                               // city-only, the person's city is not known: keep, rank lower
      local = true; score -= 8;
      var named = areas.map(String).filter(isCity);
      var many = named.length > 3;
      var nmJa = many ? '' : named.map(function (c) { return wardName(c, false); }).join('・');
      var nmEn = many ? '' : named.map(function (c) { return wardName(c, true); }).join(', ');
      why.push({ prio: 3, w: p.eligibleBy === 'origin' && !many ? {
        ja: nmJa + 'の施設などから巣立った人向け', en: 'For people who left care in ' + nmEn } : p.townsOnly || many ? {
        ja: (prefName(recPref(p), false) || '') + 'の町や村に住む人向け', en: 'For people living in towns and villages of ' + (prefName(recPref(p), true) || 'the prefecture') } : {
        ja: nmJa + 'に住む人向け', en: 'For people living in ' + nmEn } });
    }
    if (twinNote) why.push({ prio: 2.5, w: TWIN_NOTE });
    // a city's own scheme that is open prefecture-wide (often: people leaving a facility located there)
    if (p.basis === 'local' && areas.length && !cityOnly && use !== 'city') { score -= 6; otherLocal = true; }

    // --- stage gate (a record that names stages must name this one)
    if (a.stage && stages.length && stages.indexOf(a.stage) === -1) return null;
    // --- path ('hs' also accepts records tagged 'study' that are open to 中学生)
    if (path && paths.length) {
      if (paths.indexOf(path) !== -1 || (path === 'hs' && jrStage && paths.indexOf('study') !== -1)) { pathHit = true; score += 3; }
      else if (path === 'unsure') score -= 2;
      // a 中学生 who wants to work still sees the high-school money: it may change the choice
      else if (junior && path === 'work' && (paths.indexOf('hs') !== -1 || paths.indexOf('study') !== -1)) score -= 2;
      else return null;
    }
    // --- stage score: a full hit when the record is narrow, made for 中学生, or the path also matches
    // (broad records like JASSO 給付 list 5 stages but are exactly what a 高3 who wants to study needs)
    if (a.stage && stages.length) {
      stageHit = stages.length <= 3 || (junior && jrStage) || pathHit; score += stageHit ? 3 : 1;
    }
    // 高3で進学したい: university money first; high-school-entry records (授業料・学習支援, made for 中3〜) step back
    if (a.stage === 'hs3' && path === 'study') {
      if (STUDY_BASICS[p.id]) score += 3;
      else if (stages.indexOf('jhs3') !== -1 && paths.indexOf('study') === -1) score -= 4;
    }
    // --- age band overlap
    var band = BANDS[a.age];
    if (band && a.stage === 'jhs3' && band[1] < 15) band = [band[0], 15];  // 中3: 15 by graduation
    if (band && f.age && (f.age.min != null || f.age.max != null)) {
      var mn = f.age.min == null ? 0 : f.age.min, mx = f.age.max == null ? 999 : f.age.max;
      if (mx < band[0] || mn > band[1]) return null;
      if (mx <= 30) score += 1;
    }
    // --- care
    var care = a.care || null;
    var answeredCare = !!CARE_YES[care];
    if (f.careOnly) {
      if (answeredCare) {
        if (cares.length && cares.indexOf(care) === -1) return null;
        score += 5;
        why.push({ prio: 1, w: care === 'jhome' ?
          { ja: '自立援助ホームにいた人も使えるので', en: 'Open to people from independence support homes' } :
          { ja: '施設や里親家庭で育った人向けなので', en: 'Made for people who grew up in care' } });
      } else {
        careNote = true; score += 1;
        why.push({ prio: 1, w: { ja: '施設や里親家庭で育った人向け', en: 'For people who grew up in care' } });
      }
    } else if (cares.length && answeredCare && cares.indexOf(care) !== -1) {
      score += 3;
      why.push({ prio: 2, w: { ja: '施設や里親家庭で育った人も相談しやすいので', en: 'Welcomes people who grew up in care' } });
    }

    // stage/path why (combined when both are specific). 中学生 get their own, plainer reasons.
    if (junior && jrStage) {
      var cs0 = p.cat || [];
      // high-school money (授業料・給付金など): worth knowing before 入学
      var toHs = cs0.indexOf('education') !== -1 && stages.indexOf('hs12') !== -1 &&
        (cs0.indexOf('money') !== -1 || /^(grant|loan|loan_forgivable|procedure)$/.test(p.kind || ''));
      var careHome = !!CARE_HOME[a.care];
      score += 2 + (pathHit ? 3 : 0) + (JR_BASICS[p.id] && a.stage !== 'jhs12' && !(careHome && CARE_PAID[p.id]) ? 3 : 0);
      // a tip, not a reason: find.js shows kind:'note' lines on their own row (「ポイント」)
      if (careHome && CARE_PAID[p.id]) why.push({ prio: -2, w: { kind: 'note',
        ja: '施設や里親家庭の人は、塾代や受験料を施設が出してくれることが多いです。まず職員に聞こう',
        jr: '施設や里親家庭の人は、塾代や受験料を施設が出してくれることが多いよ。まず職員に聞こう',
        en: 'In a children’s home or foster care, the home often pays cram-school and exam fees. Ask staff first.' } });
      if (pathHit && STAGE_PRE[a.stage] && PATH_WHY[path]) why.push({ prio: 0, w: { ja: STAGE_PRE[a.stage].ja + PATH_WHY[path].ja, en: STAGE_PRE[a.stage].en + PATH_WHY[path].en } });
      else if (cs0[0] === 'consult') why.push({ prio: 0.8, w: { ja: '中学生も相談できるので', en: 'Junior high students can use it too' } });
      else if (toHs) why.push({ prio: 0.8, w: { ja: '高校に入る前に知っておくと安心なので', en: 'Good to know before high school starts' } });
      else if (stages.every(function (s) { return JR_STAGES[s]; })) {
        why.push({ prio: 0, w: stages.indexOf('jhs12') !== -1 ? { ja: '中学生なので', en: "You're in junior high" } : STAGE_WHY.jhs3 });
      } else why.push({ prio: 0.8, w: { ja: '中学生も使えるので', en: 'Open to junior high students' } });
    } else if (stageHit && pathHit && STAGE_PRE[a.stage] && PATH_WHY[path]) {
      why.push({ prio: 0, w: { ja: STAGE_PRE[a.stage].ja + PATH_WHY[path].ja, en: STAGE_PRE[a.stage].en + PATH_WHY[path].en } });
    } else if (pathHit && PATH_WHY[path]) {
      why.push({ prio: 0, w: { ja: PATH_WHY[path].ja, en: cap('you ' + PATH_WHY[path].en) } });
    } else if (stageHit && STAGE_WHY[a.stage]) {
      why.push({ prio: 0, w: STAGE_WHY[a.stage] });
    }

    // --- concerns -> group
    var concerns = (a.concerns || []).filter(function (c) { return catOrder().indexOf(c) !== -1; });
    var cats = p.cat || [];
    var group = null;
    var aud = audienceOf(p);
    // a record joins a group through its main category; a secondary category only counts
    // when it matches a chosen concern and the record is not for one specific group of people
    var asPrimary = false;
    // 中学生 who chose お金: school money (授業料・給付金・受験生チャレンジ, cat [education, money]) is
    // their money — it goes under お金 even when 進学 was chosen too, so お金 is never just a consumer centre
    if (junior && jrStage && concerns.indexOf('money') !== -1 && cats[0] === 'education' && cats.indexOf('money') !== -1) { group = 'money'; asPrimary = true; }
    else if (cats.length && concerns.indexOf(cats[0]) !== -1) group = cats[0];
    else if (!aud) { for (var i = 0; i < concerns.length; i++) { if (cats.indexOf(concerns[i]) > 0) { group = concerns[i]; break; } } }
    if (group) {
      var bonus = cats[0] === group || asPrimary ? 6 : 3;
      // 中学生: records not made for their stage (消費生活センター, 188, TMC Navi…) stay in the list but don't climb
      if (junior && !jrStage) bonus = cats[0] === group ? 2 : 1;
      score += bonus;
      var cl = catLabel(group);
      why.push({ prio: 2, w: { ja: '「' + cl.ja + '」が気になると答えたので', en: 'You said ' + cl.en.toLowerCase() + ' is on your mind' } });
    } else {
      if (concerns.length) score -= 2;
      group = cats[0] || 'procedures';
    }

    // --- small nudges
    if ((p.kind === 'hotline' || p.kind === 'place') && concerns.length && concerns.indexOf('consult') === -1) score -= 1;
    if (p.right) score += 1;
    if (p.repay === 'none' || p.kind === 'grant') score += 1;
    if (aud) {
      score -= 6;
      var aw = AUDIENCE_WHY[aud] || { ja: '', en: '' };
      why.push({ prio: -1, w: { kind: 'for', ja: aw.ja, en: aw.en } });
    }
    // no home + no money after leaving care: the safety-net rights go to the top
    if (SAFETY_NET[p.id] && concerns.indexOf('housing') !== -1 && concerns.indexOf('money') !== -1 &&
        (a.stage === 'left0' || a.stage === 'left1' || a.stage === 'nohs')) {
      score += 7;
      why.push({ prio: 0.2, w: { ja: '住まいとお金の両方が気になると答えたので', en: 'You said both housing and money are on your mind' } });
    }
    if (a.urgent && urgentIds(a).indexOf(p.id) !== -1) score += 8;

    why.sort(function (x, y) { return x.prio - y.prio; });
    return { p: p, score: score, why: why.slice(0, 2).map(function (x) { return x.w; }), group: group, local: local, careNote: careNote, otherLocal: otherLocal, audience: aud };
  }

  function cmp(now) {
    return function (x, y) {
      var tx = Math.floor(x.score / 3), ty = Math.floor(y.score / 3);
      if (tx !== ty) return ty - tx;
      var rx = isFree(x.p) ? 0 : 1, ry = isFree(y.p) ? 0 : 1;
      if (rx !== ry) return rx - ry;
      var ex = EFFORT[x.p.effort] == null ? 1 : EFFORT[x.p.effort], ey = EFFORT[y.p.effort] == null ? 1 : EFFORT[y.p.effort];
      if (ex !== ey) return ex - ey;
      var dx = deadlineRank(x.p, now), dy = deadlineRank(y.p, now);
      if (dx !== dy) return dx - dy;
      if (x.score !== y.score) return y.score - x.score;
      return 0;
    };
  }

  SM.match = function (answers, opts) {
    var a = answers || (SM.state && SM.state.answers) || {};
    var now = new Date();
    var out = [];
    (SM.data.programs || []).forEach(function (p) {
      if (!p || !p.id) return;
      var r = null;
      try { r = evaluate(p, a, opts); } catch (e) { r = null; }
      if (r) out.push(r);
    });
    // stable sort
    out.forEach(function (r, i) { r._i = i; });
    var c = cmp(now);
    out.sort(function (x, y) { return c(x, y) || x._i - y._i; });
    out.forEach(function (r) { delete r._i; });
    return out;
  };

  SM.matchSummary = function (answers) {
    var a = answers || (SM.state && SM.state.answers) || {};
    var en = lang() === 'en';
    function pick(map, v) { return map[v] ? (en ? map[v].en : map[v].ja) : null; }
    var rows = [];
    rows.push({ key: 'stage', q: 1, label: pick(LABELS.stageShort, a.stage), set: !!a.stage });
    var ep = effPath(a);
    rows.push({ key: 'path', q: 2, label: pick(LABELS.path, ep), set: !!ep });
    var al = null;
    if (a.area === 'other') al = en ? 'Outside Kanto' : '関東の外';
    else if (isPrefCode(a.area)) al = prefName(a.area, en) ? prefName(a.area, en) + (en ? ' (city not set)' : '（市はまだ）') : null;
    else if (isCity(a.area)) al = isKu(a.area) ? areaFull(a.area, en) : wardName(a.area, en);
    rows.push({ key: 'area', q: 3, label: al, set: !!al });
    var cs = (a.concerns || []).map(function (k) { var c = catLabel(k); return en ? c.en : c.ja; });
    if (a.urgent) cs.unshift(en ? 'Nowhere to stay now' : '今いる場所がない');
    rows.push({ key: 'concerns', q: 4, label: cs.length ? cs.join(en ? ', ' : '・') : null, set: cs.length > 0 });
    rows.push({ key: 'age', q: 5, label: pick(LABELS.age, a.age), set: !!a.age });
    var care = a.care && a.care !== 'skip' ? pick(LABELS.care, a.care) : null;
    rows.push({ key: 'care', q: 6, label: care, set: !!care });
    return rows;
  };

  /* ---------------- the browse list and its honest counts (one rule for home, さがす and きく) ----------------
     The person's area as matching knows it: a 5-digit city, a 2-digit prefecture, 'other' or null. */
  function cleanArea(a) {
    var v = a && a.area;
    if (v === 'other') return v;
    return v && prefOf(v) ? String(v) : null;
  }
  /* every support the さがす list holds before its own filters: usable where the person lives (o.here !== false;
     with it off, every record in Kanto), 中学生 only what is open to them (o.jr !== false). Area unknown: national,
     団体 and 都県 programs (one row per support); 区市町村 ones come with the area answer. */
  function browseBase(answers, o) {
    o = o || {};
    var a = answers || (SM.state && SM.state.answers) || {};
    var area = cleanArea(a), here = o.here !== false;
    var rows = SM.match({ concerns: [], area: here ? area : null }, here || !area ? null : { everywhere: true });
    if (isJunior(a) && o.jr !== false) rows = rows.filter(function (r) { return jrOk(r.p); });
    return rows;
  }
  // the number of supports in each 困りごと (a record counts in every topic it has), plus _all
  function catCounts(answers, o) {
    var counts = { _all: 0 };
    browseBase(answers, o).forEach(function (r) {
      counts._all++;
      (r.p.cat || []).forEach(function (k) { counts[k] = (counts[k] || 0) + 1; });
    });
    return counts;
  }

  SM.matchUtil = {
    cleanArea: cleanArea, browseBase: browseBase, catCounts: catCounts,
    versioned: VERSIONED, prefSlug: PREF_SLUG, prefVersion: prefVersion, versionBase: versionBase, ownVersion: ownVersion,
    norm: norm, bands: BANDS, labels: LABELS, nowOpen: nowOpen, isFree: isFree, nearby: nearby,
    deadlineRank: deadlineRank, EFFORT: EFFORT, inTokyo: inTokyo, isWard: isWard,
    audienceOf: audienceOf, urgentIds: urgentIds, isJunior: isJunior, effPath: effPath, jrOk: jrOk,
    isCity: isCity, isPrefCode: isPrefCode, prefOf: prefOf, prefs: prefs, pref: pref, prefName: prefName, areaName: areaName,
    recPref: recPref, areasOf: areasOf, scopeOf: scopeOf, usableIn: usableIn,
    isKu: isKu, cityOf: cityOf, areaFull: areaFull
  };
})();
