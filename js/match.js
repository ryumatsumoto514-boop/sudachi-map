/* 巣立ちマップ v5 — match.js (FIND)
   v5: answer labels follow the shorter question options (SPEC-v5 Part B 質問: options ≤ 10 chars); scoring unchanged.
   SM.match(answers)        -> [{ p, score, why:[{ja,jr?,en}], group, local, careNote }] sorted by fit
   SM.matchSummary(answers) -> [{ key, q, label, set }] for the answers bar (all 6 questions, in order)
   Helpers also used by the find view (additive, not in SPEC):
   SM.matchUtil = { norm, bands, labels, nowOpen, isFree, nearby, deadlineRank, EFFORT, inTokyo, isWard,
                    audienceOf, urgentIds, isJunior, effPath, jrOk }
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

  /* ---------------- area helpers ---------------- */
  function isWard(code) { return typeof code === 'string' && /^13\d{3}$/.test(code); }
  function inTokyo(code) { return code === '13' || isWard(code); }

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
  function nearby(p, area) {
    var locs = p.locations || [];
    if (!locs.length) return false;
    if (isWard(area)) return locs.some(function (l) { return l && String(l.area) === area; });
    return locs.some(function (l) { return l && (inTokyo(String(l.area || '')) || /東京都/.test(l.addr || '')); });
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
    var a = areaOf(code);
    if (!a) return en ? 'your area' : 'お住まいの地域';
    return en ? (a.en || a.name) : a.name;
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
  function evaluate(p, a) {
    var f = p.for || {};
    var stages = f.stages || [], paths = f.paths || [], cares = f.care || [], areas = f.areas || [];
    var score = 10, why = [], local = false, careNote = false, otherLocal = false;
    var stageHit = false, pathHit = false;
    var junior = isJunior(a);
    var path = effPath(a);
    var jrStage = hasJrStage(p);

    // --- 中学生 (SPEC-v3 §3): nothing made only for older people
    if (junior && !jrOk(p)) return null;

    // --- area rules
    var wardOnly = areas.length > 0 && areas.every(isWard);
    var tokyoAny = areas.indexOf('13') !== -1;
    var area = a.area || null;
    // national record that has its own Tokyo-run version: show only the Tokyo one to people in Tokyo
    if (TOKYO_VERSION[p.id] && area !== 'other' && SM.program && SM.program(TOKYO_VERSION[p.id])) return null;
    if (areas.length) {
      if (area === 'other') return null;                        // Tokyo-only, user lives outside Tokyo
      if (isWard(area)) {
        if (areas.indexOf(area) !== -1) {
          score += 5;
          why.push({ prio: 0.5, w: {
            ja: wardName(area, false) + (a.stage === 'hs12' || a.stage === 'hs3' ? 'に住む予定なので' : 'に住んでいるので'),
            jr: wardName(area, false) + 'に住んでいるので',
            en: 'For people living in ' + wardName(area, true) } });
        } else if (!tokyoAny) return null;                       // another ward's program
        else score += 1;
      } else if (wardOnly) {                                     // area unknown ('13' or null): keep, rank lower
        local = true; score -= 8;
        why.push({ prio: 3, w: {
          ja: areas.map(function (c) { return wardName(c, false); }).join('・') + 'に住む人向け',
          en: 'For people living in ' + areas.map(function (c) { return wardName(c, true); }).join(', ') } });
      } else if (tokyoAny && area === '13') score += 1;
      // a ward/city's own scheme that is open Tokyo-wide (often: people leaving a facility located there)
      if (p.basis === 'local' && !wardOnly && !(isWard(area) && areas.indexOf(area) !== -1)) { score -= 6; otherLocal = true; }
    }

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

  SM.match = function (answers) {
    var a = answers || (SM.state && SM.state.answers) || {};
    var now = new Date();
    var out = [];
    (SM.data.programs || []).forEach(function (p) {
      if (!p || !p.id) return;
      var r = null;
      try { r = evaluate(p, a); } catch (e) { r = null; }
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
    if (a.area === '13') al = en ? 'Tokyo (not decided)' : '東京都（未定）';
    else if (a.area === 'other') al = en ? 'Outside Tokyo' : '東京都の外';
    else if (a.area) al = wardName(a.area, en);
    rows.push({ key: 'area', q: 3, label: al, set: !!a.area });
    var cs = (a.concerns || []).map(function (k) { var c = catLabel(k); return en ? c.en : c.ja; });
    if (a.urgent) cs.unshift(en ? 'Nowhere to stay now' : '今いる場所がない');
    rows.push({ key: 'concerns', q: 4, label: cs.length ? cs.join(en ? ', ' : '・') : null, set: cs.length > 0 });
    rows.push({ key: 'age', q: 5, label: pick(LABELS.age, a.age), set: !!a.age });
    var care = a.care && a.care !== 'skip' ? pick(LABELS.care, a.care) : null;
    rows.push({ key: 'care', q: 6, label: care, set: !!care });
    return rows;
  };

  SM.matchUtil = {
    norm: norm, bands: BANDS, labels: LABELS, nowOpen: nowOpen, isFree: isFree, nearby: nearby,
    deadlineRank: deadlineRank, EFFORT: EFFORT, inTokyo: inTokyo, isWard: isWard,
    audienceOf: audienceOf, urgentIds: urgentIds, isJunior: isJunior, effPath: effPath, jrOk: jrOk
  };
})();
