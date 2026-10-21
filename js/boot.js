/* 巣立ちマップ v5 — shell & boot (ENGINE)
 * Paints the app shell (patching the static HTML in place: nothing pops), registers built-in acts (go, save,
 * copy, sheet-close, sos, exit, settings, back), the SOS + settings sheets, keyboard handling, and starts the
 * router. Save = stamp → flight to やること → badge roll → undo toast (MOTION-SPEC §4.1). Loaded before launch.js. */
(function () {
  'use strict';
  var SM = window.SM;
  var esc = SM.esc, t = SM.t, ic = SM._ic;

  /* ------------------------------------------------------------------ strings */
  SM.strings({
    'shell.brand': { ja: '巣立ちマップ', en: 'Sudachi Map' },
    'shell.docTitle': { ja: '巣立ちマップ｜施設や里親家庭を出る人の支援ガイド（東京）', en: 'Sudachi Map | Support for young people leaving care in Tokyo' },
    'shell.skip': { ja: '本文へ', en: 'Skip to content' },
    'shell.exit': { ja: 'すぐ閉じる', en: 'Quick exit' },
    'shell.exitHint': { ja: 'すぐに天気の検索に切りかえます（Esc 2回でも）', en: 'Switch to a weather search at once (or Esc twice)' },
    'shell.sos': { ja: '緊急', en: 'SOS' },
    'shell.sosLabel': { ja: '緊急の連絡先', en: 'SOS — emergency contacts' },
    'shell.settings': { ja: '設定', en: 'Settings' },
    'shell.nav': { ja: 'メイン', en: 'Main' },
    'tab.home': { ja: 'ホーム', en: 'Home' },
    'tab.find': { ja: 'さがす', en: 'Find' },
    'tab.ask': { ja: 'きく', en: 'Ask' },   // SEARCH (v6): 「きく」 tab
    'tab.map': { ja: 'マップ', en: 'Map' },
    'tab.plan': { ja: 'やること', en: 'To-do' },
    'tab.planCount': { ja: 'やること（保存 {n}件）', en: 'To-do ({n} saved)' },
    'tab.learn': { ja: 'まなぶ', en: 'Learn' },
    'tab.learnSub': { ja: 'お金のきほん', en: 'Money basics' },

    'jr.title': { ja: 'ふりがなをつけますか？', en: 'Turn on furigana?' },
    'jr.body': { ja: 'むずかしい漢字に読みがな。あとで設定で変えられます', en: 'Readings over hard kanji. Change it any time in Settings.' },
    'jr.yes': { ja: 'ふりがなをつける', en: 'Turn on furigana' },
    'jr.no': { ja: 'いまはいい', en: 'Not now' },
    'jr.done': { ja: 'ふりがなをつけました', en: 'Furigana is on' },

    'sos.title': { ja: 'いま、話せるところ', en: 'Someone to talk to, now' },
    'sos.lead': { ja: 'タップで電話。名前は言わなくて大丈夫。', en: 'Tap to call. You don\'t have to give your name.' },
    'sos.g1': { ja: '命や体があぶないとき', en: 'If your life or safety is in danger' },
    'sos.g2': { ja: 'つらい・こまったを話したいとき', en: 'If you need to talk' },
    'sos.g3': { ja: 'お金・契約のトラブル', en: 'Money & contract trouble' },
    'sos.gHome': { ja: 'いる場所がない・家にいられない', en: 'Nowhere to stay / can\'t stay at home' },
    'sos.seikatsu': { ja: '生活保護（福祉事務所）', en: 'Public assistance (welfare office)' },
    'sos.seikatsud': { ja: '住む所もお金もないとき。申請は権利。窓口は区や市の福祉事務所', en: 'No home, no money: applying is your right. At your ward/city welfare office' },
    'sos.seikatsuBtn': { ja: '生活保護（福祉事務所）', en: 'Public assistance' },
    'sos.110': { ja: '警察', en: 'Police' },
    'sos.110d': { ja: '身の危険を感じたら', en: 'If you feel unsafe' },
    'sos.119': { ja: '救急・消防', en: 'Ambulance / Fire' },
    'sos.119d': { ja: '大けが・急な病気・火事', en: 'Serious injury, sudden illness, fire' },
    'sos.yori': { ja: 'よりそいホットライン', en: 'Yorisoi Hotline' },
    'sos.yorid': { ja: 'お金・住まい・こころ、なんでも', en: 'Money, housing, feelings — anything' },
    'sos.yorih': { ja: '24時間・無料', en: '24 hours · free' },
    'sos.inochi': { ja: '#いのちSOS', en: '#Inochi SOS' },
    'sos.inochid': { ja: '「死にたい」「消えたい」と思ったら', en: 'If you feel like dying or disappearing' },
    'sos.free': { ja: '無料', en: 'Free' },
    'sos.189': { ja: '児童相談所（いちはやく）', en: 'Child guidance center' },
    'sos.189d': { ja: '虐待かも・家にいられない（18歳未満）', en: 'Abuse, or can\'t stay at home (under 18)' },
    'sos.waka': { ja: '若ナビα（東京都の若者相談）', en: 'Wakanavi α (Tokyo youth line)' },
    'sos.wakad': { ja: 'おおむね18〜39歳。LINE「相談ほっとLINE＠東京」もあり', en: 'Ages ~18–39. Also on LINE: "相談ほっとLINE＠東京"' },
    'sos.wakah': { ja: '月〜土 11時〜23時', en: 'Mon–Sat 11:00–23:00' },
    'sos.chal': { ja: 'TOKYOチャレンジネット', en: 'TOKYO Challenge Net' },
    'sos.chald': { ja: '住む所がない・ネットカフェで寝ている', en: 'No place to live, sleeping in net cafés' },
    'sos.chalh': { ja: '月水金土 10〜17時・火木 10〜20時（祝日休み）', en: 'Mon/Wed/Fri/Sat 10–17, Tue/Thu 10–20 (closed holidays)' },
    'sos.188': { ja: '消費者ホットライン', en: 'Consumer hotline' },
    'sos.188d': { ja: '契約・お金のトラブル。近くの窓口へつながる', en: 'Contract or money trouble. Connects to a local office' },
    // 中学生 sheet (body.is-junior): child lines instead of adult housing / youth services
    'sos.jr.lead': { ja: 'タップで電話。名前は言わなくて大丈夫。', en: 'Tap to call. You don\'t have to give your name.' },
    'sos.jr.g1': { ja: '命や体があぶないとき', jr: '命や体があぶないとき', en: 'If your life or safety is in danger' },
    'sos.jr.gHome': { ja: '家にいられない・こわいとき', jr: '家にいられない・こわいとき', en: 'Can\'t stay at home, or scared' },
    'sos.jr.g2': { ja: '話を聞いてほしいとき', jr: '話を聞いてほしいとき', en: 'When you want someone to listen' },
    'sos.jr189d': { ja: 'たたかれる・家にいられない。18歳になるまで、いつでも', jr: 'たたかれる、家にいられない。24時間、いつでも', en: 'Being hurt, or can\'t stay at home. Any time, under 18' },
    'sos.kodomo': { ja: '24時間子供SOSダイヤル', en: '24-hour Child SOS Dial' },
    'sos.kodomod': { ja: 'いじめ・学校・家のこと。夜中でもつながります', jr: 'いじめ、学校、家のこと。夜中でもつながります', en: 'Bullying, school, home. Answers even at night' },
    'sos.kodomoh': { ja: '24時間・無料', en: '24 hours · free' },
    'sos.child': { ja: 'チャイルドライン', en: 'Childline' },
    'sos.childd': { ja: '18歳までの子どものための電話。話を聞いてくれます', jr: '18歳までの子どものための電話。話を聞いてくれるよ', en: 'A line for children up to 18. Someone listens' },
    'sos.childh': { ja: '毎日16時〜21時・無料', en: 'Daily 16:00–21:00 · free' },
    'sos.jr.yorid': { ja: 'どんなことでも話せます', jr: 'どんなことでも話せます', en: 'You can talk about anything' },
    'sos.jr.chatBody': { ja: 'チャットで相談できるところもあります。', jr: 'チャットで相談できるところもあるよ。', en: 'Some places let you talk by chat.' },
    'sos.exitSheet': { ja: 'すぐ閉じる', en: 'Quick exit' },
    'sos.copy': { ja: '{name}の番号をコピー', en: 'Copy number for {name}' },
    'sos.copied': { ja: '番号をコピーしました', en: 'Number copied' },
    'sos.chatTitle': { ja: '電話がこわいときは', en: 'If calling feels too hard' },
    'sos.chatBody': { ja: 'LINE・チャットでも相談できます。', en: 'You can also talk by LINE or chat.' },
    'sos.chatBtn': { ja: 'LINE・チャットの相談先', en: 'LINE & chat options' },
    'sos.checked': { ja: '番号は {date} に公式ページで確認', en: 'Numbers checked on official pages, {date}' },

    'set.title': { ja: '設定', en: 'Settings' },
    'set.gView': { ja: '見やすさ', en: 'Display' },
    'set.big': { ja: '文字を大きく', en: 'Larger text' },
    'set.bigd': { ja: '画面の文字を大きく', en: 'Bigger text everywhere' },
    'set.ruby': { ja: 'ふりがな', en: 'Furigana' },
    'set.rubyd': { ja: 'むずかしい漢字に読みがな', en: 'Readings over hard kanji (Japanese only)' },
    'set.lang': { ja: 'English', en: 'English' },
    'set.langd': { ja: '画面を英語に', en: 'Show the app in English' },
    'set.dark': { ja: '暗い画面', en: 'Dark screen' },
    'set.darkd': { ja: '背景を黒っぽく（ふだんは白）', en: 'Dark background (white by default)' },
    'set.motion': { ja: '動きを少なく', en: 'Reduce motion' },
    'set.motiond': { ja: '画面は動かさず、ふっと切りかえます', en: 'No movement; screens simply fade' },
    'set.gSup': { ja: '支援する人へ', en: 'For supporters' },
    'set.sup': { ja: '支援者向けメモを表示', en: 'Show supporter notes' },
    'set.supd': { ja: '職員・先生・里親さん向けのメモ', en: 'Notes for care staff, teachers and foster carers' },
    'set.gPriv': { ja: 'このスマホの記録', en: 'Data on this phone' },
    'set.priv': { ja: '名前もログインもいりません。答えや保存した支援は、このスマホの中だけにあります。どこにも送りません。', en: 'No name, no login. Your answers and saved items stay on this phone only. Nothing is sent anywhere.' },
    'set.noStore': { ja: 'このブラウザでは記録が残りません。閉じると消えます。', en: 'This browser can\'t keep data. It\'s gone when you close the page.' },
    'set.erase': { ja: 'このスマホの記録をすべて消す', en: 'Erase everything on this phone' },
    'set.eraseNote': { ja: '共有のスマホ・パソコンでは、最後に消すと安心です。', en: 'On a shared phone or computer, erase when you\'re done.' },
    'set.about': { ja: '運営・掲載のルール・プライバシー', en: 'About, listing rules & privacy' },
    'set.learn': { ja: 'まなぶ — お金のきほん', en: 'Learn — money basics' },
    'set.gMore': { ja: 'もっと知る', en: 'More' },
    'set.version': { ja: 'バージョン {v}・情報の確認日 {d}', en: 'Version {v} · Info checked {d}' },
    'set.confirmTitle': { ja: 'ほんとうに消しますか？', en: 'Erase everything?' },
    'set.confirmBody': { ja: '答え・保存した支援・チェック・日付・まなぶの記録が消えます。元には戻せません。', en: 'Your answers, saved items, checks, dates and lesson progress will be removed. This can\'t be undone.' },
    'set.confirmYes': { ja: 'すべて消す', en: 'Erase all' },
    'set.confirmNo': { ja: 'やめる', en: 'Cancel' },
    'set.erased': { ja: '記録を消しました', en: 'Everything was erased' },
    'set.on': { ja: 'オン', en: 'On' },
    'set.off': { ja: 'オフ', en: 'Off' }
  });

  /* ------------------------------------------------------------------ shell */
  // S16: the tab list lives in core.js (SM.tabs), where the router also reads it
  var TABS = SM.tabs;

  // まなぶ exists when its view is loaded or can be loaded on first use (index.html window.__smLazy)
  function hasLearn() { return !!(SM.views.learn || (SM.lazy && SM.lazy.learn)); }
  function brandHtml() {
    var mark = SM.brand && typeof SM.brand.lockup === 'function' ? SM.brand.lockup({ label: false }) : ic('logo');
    return '<a class="brand" href="#/" aria-label="' + esc(t('shell.brand')) + ' — ' + esc(t('tab.home')) + '">' + mark +
      '<span class="brand-name">' + esc(t('shell.brand')) + '</span></a>';
  }
  function actionsHtml() {
    return '<div class="appbar-actions">' +
      '<button type="button" class="pill pill-exit" data-act="exit" title="' + esc(t('shell.exitHint')) + '">' + esc(t('shell.exit')) + '</button>' +
      '<button type="button" class="pill pill-sos" data-act="sos" aria-label="' + esc(t('shell.sosLabel')) + '">' + ic('phone') + '<span>' + esc(t('shell.sos')) + '</span></button>' +
      '<button type="button" class="icon-btn" data-act="settings" aria-label="' + esc(t('shell.settings')) + '">' + ic('settings') + '</button>' +
      '</div>';
  }
  function tabsHtml() {
    return TABS.map(function (tb, i) {
      return '<a class="tab" href="' + tb.href + '" data-tab="' + tb.key + '" style="--i:' + i + '">' + ic(tb.icon) +
        '<span class="tab-label">' + esc(t('tab.' + tb.key)) + '</span>' +
        (tb.key === 'plan' ? '<span class="tab-badge" aria-hidden="true" hidden></span>' : '') + '</a>';
    }).join('') +
      // まなぶ: not a 5th tab — a row under the tabs on the desktop rail (hidden in the phone tab bar)
      (hasLearn() ? '<a class="tab tab-extra tab-learn" href="#/learn" data-tab="learn" style="--i:' + TABS.length + '">' + ic('book') +
        '<span class="tab-label">' + esc(t('tab.learn')) + '<small class="tab-sub">' + esc(t('tab.learnSub')) + '</small></span></a>' : '');
  }
  function frag(html) { var tpl = document.createElement('template'); tpl.innerHTML = html; return tpl.content; }
  /* Replace a node only when it differs from what we would paint. index.html carries the complete app bar
     (MOTION-SPEC §2.7): on a normal start nothing is replaced, so nothing pops or re-lays out; a language
     change swaps just the parts that changed. */
  function patch(old, html) {
    var fresh = frag(html).firstElementChild;
    if (!fresh) return old;
    if (old && old.isEqualNode(fresh)) return old;
    if (old && old.parentNode) old.parentNode.replaceChild(fresh, old);
    return fresh;
  }

  SM.paintShell = function () {
    var skip = document.querySelector('.skip');
    if (skip && skip.textContent !== t('shell.skip')) skip.textContent = t('shell.skip');
    var bar = document.querySelector('.appbar');
    if (bar) {
      var brand = bar.querySelector(':scope > .brand'), acts = bar.querySelector(':scope > .appbar-actions');
      if (brand && acts && bar.children.length === 2) { patch(brand, brandHtml()); patch(acts, actionsHtml()); }
      else bar.innerHTML = brandHtml() + actionsHtml();
    }
    var sub = document.querySelector('.subbar');
    if (sub) {
      var bl = sub.querySelector('.back-label');
      if (!bl || !sub.querySelector('.subbar-title')) {
        sub.innerHTML =
          '<button type="button" class="back" data-act="back">' + ic('chevron-left') + '<span class="back-label">' + esc(t('core.back')) + '</span></button>' +
          '<span class="subbar-title"></span>';
      } else if (bl.textContent !== t('core.back')) bl.textContent = t('core.back');
    }
    var nav = document.querySelector('.tabbar');
    if (nav) {
      if (nav.getAttribute('aria-label') !== t('shell.nav')) nav.setAttribute('aria-label', t('shell.nav'));
      var tabs = nav.querySelectorAll('.tab');
      var want = TABS.length + (hasLearn() ? 1 : 0);
      if (tabs.length !== want) nav.innerHTML = tabsHtml();
      else {
        // same tabs: relabel in place, so the indicator, badge and active state are kept
        Array.prototype.forEach.call(tabs, function (a) {
          var key = a.getAttribute('data-tab'), lab = a.querySelector('.tab-label');
          if (!lab) return;
          if (key === 'learn') {
            var sm = lab.querySelector('.tab-sub');
            if (lab.firstChild && lab.firstChild.nodeType === 3) lab.firstChild.nodeValue = t('tab.learn');
            if (sm) sm.textContent = t('tab.learnSub');
          } else if (lab.textContent !== t('tab.' + key)) lab.textContent = t('tab.' + key);
        });
      }
    }
    SM.updateBadge();
    if (SM.paintChrome) SM.paintChrome();
    if (SM.paintJrBanner) SM.paintJrBanner();
  };

  /* ------------------------------------------------------------------ 中学生: ふりがな offer (one time) */
  // Shown at the top of the view while body.is-junior, furigana is off, the UI is Japanese and the
  // banner was never answered. Either button stores the answer in SM.state.hints.jrRuby.
  function jrBannerWanted() {
    var s = SM.state;
    // not during the question flow (it pushed the options below the fold): first offered on results / home
    var h = (SM.route && SM.route.hash) || location.hash || '';
    if (/^#\/find\/q(\/|$|\?)/.test(h)) return false;
    // F09: never above the count on the results the person waited for: there it is offered as a toast once the
    // results have landed (SM.offerJrRuby, called by find.js)
    if (/^#\/find\/results/.test(h)) return false;
    // never push crisis numbers down: not while the answers say 「今、家にいられない」
    if (s.answers && s.answers.urgent) return false;
    return document.body.classList.contains('is-junior') && !s.settings.ruby && SM.lang() === 'ja' && !(s.hints && s.hints.jrRuby);
  }
  SM.paintJrBanner = function (main) {
    main = main || document.getElementById('view');
    if (!main) return;
    var old = main.querySelector(':scope > .jr-banner');
    var want = jrBannerWanted() && !main.classList.contains('is-error');
    if (!want) { if (old) old.parentNode.removeChild(old); return; }
    if (old) return;
    var box = document.createElement('aside');
    box.className = 'jr-banner';
    box.setAttribute('aria-labelledby', 'jr-banner-t');
    box.innerHTML =
      '<p class="jr-banner-text"><b id="jr-banner-t">' + esc(t('jr.title')) + '</b><span>' + esc(t('jr.body')) + '</span></p>' +
      '<div class="jr-banner-actions">' +
        '<button type="button" class="btn btn-primary btn-sm jr-yes" data-act="jr-ruby" data-press>' + esc(t('jr.yes')) + '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm jr-no" data-act="jr-dismiss">' + esc(t('jr.no')) + '</button>' +
      '</div>';
    main.insertBefore(box, main.firstChild);
  };
  function jrAnswered() {
    if (!SM.state.hints || typeof SM.state.hints !== 'object') SM.state.hints = {};
    SM.state.hints.jrRuby = true;
  }
  /* F09: the same offer as a one-line toast with its button (results: after the count has rolled). Shown once:
     showing it counts as the answer, so the banner does not come back on home. */
  SM.offerJrRuby = function () {
    var s = SM.state;
    if (!document.body.classList.contains('is-junior') || s.settings.ruby || SM.lang() !== 'ja' || (s.hints && s.hints.jrRuby)) return false;
    if (s.answers && s.answers.urgent) return false;
    jrAnswered();
    SM.save();
    SM.toast(t('jr.title'), { ms: 9000, action: { label: t('jr.yes'), fn: turnRubyOn } });
    return true;
  };
  function turnRubyOn() {
    jrAnswered();
    SM.state.settings.ruby = true;
    SM.save();
    SM.applySettings();
    SM.paintShell();
    SM.render();
    // the banner (and the button that had focus) is gone: keep keyboard / screen-reader users in place
    var h1 = document.querySelector('#view h1') || document.getElementById('view');
    if (h1) {
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
      try { h1.focus({ preventScroll: true }); } catch (e) { }
    }
    SM.toast(t('jr.done'));
  }
  SM.on('jr-ruby', turnRubyOn);
  SM.on('jr-dismiss', function () {
    jrAnswered();
    SM.save();
    var b = document.querySelector('#view > .jr-banner');
    var next = b && b.nextElementSibling;
    if (b) b.parentNode.removeChild(b);
    // keep keyboard users in place
    var target = next && next.querySelector ? (next.matches('h1, h2') ? next : next.querySelector('h1, h2')) : null;
    target = target || document.querySelector('#view h1') || document.getElementById('view');
    if (target) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      try { target.focus({ preventScroll: true }); } catch (e) { }
    }
  });

  /* SM.updateBadge([{roll}]) — the やること count. roll:true rolls the digits (odometer) instead of
     rewriting them; used after a save lands. Without roll it is a plain sync (every render). */
  SM.updateBadge = function (o) {
    var n = (SM.state.saved || []).length;
    var tab = document.querySelector('.tabbar .tab[data-tab="plan"]');
    if (!tab) return;
    var roll = !!(o && o.roll);
    if (SM.motion && SM.motion.badge) SM.motion.badge(tab, n, { roll: roll, bump: roll });
    else {
      var b = tab.querySelector('.tab-badge');
      if (b) { b.hidden = n === 0; b.textContent = n > 99 ? '99+' : String(n); }
    }
    if (n) tab.setAttribute('aria-label', t('tab.planCount', { n: n }));
    else tab.removeAttribute('aria-label');
  };

  /* ------------------------------------------------------------------ built-in acts */
  SM.on('go', function (el) {
    SM.go(el.getAttribute('data-href') || el.getAttribute('href') || '#/');
  });

  /* Save (☆): stamp the star → it flies to やること → the tab nudges and its badge rolls → toast with
     元に戻す at +120ms. Unsave: the star goes to outline, the badge rolls down, no flight. Undo reverses. */
  function paintSaveButtons(id, on) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-act="save"]'), function (b) {
      if (b.getAttribute('data-id') !== id) return;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('is-saved', on);
      var lab = b.querySelector('.save-label');
      var lOn = b.getAttribute('data-label-on'), lOff = b.getAttribute('data-label-off');
      if (lab && lOn && lOff) {
        if (SM.motion && SM.motion.swapText && b.offsetParent !== null) SM.motion.swapText(lab, on ? lOn : lOff);
        else lab.textContent = on ? lOn : lOff;
      }
      var svg = b.querySelector('svg');
      if (svg && b.getAttribute('data-icon') !== 'none' && typeof SM.icon === 'function') {
        var tmp = document.createElement('span');
        tmp.innerHTML = SM.icon(on ? 'star-fill' : 'star');
        if (tmp.firstElementChild) svg.parentNode.replaceChild(tmp.firstElementChild, svg);
      }
    });
  }
  function setSaved(id, on, src, undo) {
    SM.store.quiet = true;
    try { SM.toggleSave(id, { quiet: true, on: on }); } finally { SM.store.quiet = false; }
    paintSaveButtons(id, on);
    var mo = SM.motion;
    var tab = document.querySelector('.tabbar .tab[data-tab="plan"]');
    var star = src && src.isConnected ? src.querySelector('svg') : null;
    var landed = false;
    var land = function () { if (landed) return; landed = true; SM.updateBadge({ roll: true }); };
    // S9: a save that will not outlive this page (storage blocked or full) flies in amber and says so
    var temp = !SM.store.available;
    if (on && !undo && star && mo && !mo.reduced()) {
      if (mo.stamp) mo.stamp(star);
      if (mo.flyTo && tab) setTimeout(function () { mo.flyTo(star, tab, { onArrive: land, tone: temp ? 'warn' : '' }); }, 90);
      else land();
    } else land();
    var v = SM.views[SM.route.key];
    if (v && typeof v.onSave === 'function') { try { v.onSave(id, on, { stamped: !!star, undo: !!undo }); } catch (e) { console.error(e); } }
    else if (v && v.tab === 'plan') SM.render();
    document.dispatchEvent(new CustomEvent('sm:save', { detail: { id: id, saved: on, undo: !!undo } }));
    if (undo) { SM.toast(t('core.undone'), 1600); return; }
    setTimeout(function () {
      SM.toast(t(on ? (temp ? 'core.savedTemp' : 'core.saved') : 'core.unsaved'), {
        action: { label: t('core.undo'), fn: function () { setSaved(id, !on, null, true); } }
      });
    }, on ? 120 : 0);
  }
  SM.on('save', function (el) {
    var id = el.getAttribute('data-id');
    if (!id) return;
    setSaved(id, !SM.isSaved(id), el, false);
  });

  /* Copy: a button with a visible label swaps it (コピーしました, width reserved, reverts after 2s);
     the toast still carries a custom message, and screen readers hear it either way. */
  SM.on('copy', function (el) {
    var msg = el.getAttribute('data-msg') || undefined;
    var lab = el.classList.contains('btn') ? el.querySelector(':scope > span:not(.arrow):not(.sr-only)') : null;
    if (!lab || !SM.motion || !SM.motion.swapText || el.offsetParent === null) {
      SM.copy(el.getAttribute('data-text') || '', msg);
      return;
    }
    var orig = el._smCopyLabel || (el._smCopyLabel = lab.textContent);
    var text = el.getAttribute('data-text') || '';
    var done = t('core.copied');
    var ok = function () {
      SM.motion.swapText(lab, done);
      clearTimeout(el._smCopyT);
      el._smCopyT = setTimeout(function () { if (lab.isConnected) SM.motion.swapText(lab, orig); }, 2000);
      if (msg && msg !== done) SM.toast(msg); else if (SM.announce) SM.announce(done);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
        navigator.clipboard.writeText(text).then(ok, function () { SM.copy(text, msg); });
        return;
      }
    } catch (e) { }
    SM.copy(text, msg);
  });

  SM.on('sheet-close', function () { SM.closeSheet(); });
  SM.on('back', function () { SM.back(); });
  SM.on('exit', function () { quickExit(); });
  SM.on('sos', function () { openSOS(); });
  SM.on('settings', function () { openSettings(); });

  function quickExit() {
    exited = true;
    // no animation of any kind (MOTION-SPEC §3.7): stop a running transition and the splash, then leave
    try { if (SM.motion && SM.motion.skipTransition) SM.motion.skipTransition(); } catch (e) { }
    try { var lx = document.getElementById('launch'); if (lx && lx.parentNode) lx.parentNode.removeChild(lx); } catch (e) { }
    try { document.body.style.visibility = 'hidden'; } catch (e) { }
    try { SM.closeSheet({ noFocus: true, instant: true }); } catch (e) { }
    try { var v = document.getElementById('view'); if (v) v.innerHTML = ''; } catch (e) { }
    try { document.title = ''; } catch (e) { }
    try { sessionStorage.clear(); } catch (e) { }
    // routes replace the current history entry; with the guard entry (core.js "browser Back") the head gate steps
    // back off it first, so the weather page replaces the app's own entry: Back can't bring any screen back
    var L = window.__lx;
    if (L && typeof L.leave === 'function') L.leave();
    else location.replace('https://www.google.co.jp/search?q=%E5%A4%A9%E6%B0%97');
  }
  var exited = false;
  SM.quickExit = quickExit;

  /* ------------------------------------------------------------------ SOS sheet */
  // Each number below was checked on the official page on 2026-10-16:
  //  110/119: universal emergency numbers
  //  189: https://kodomoshien.cfa.go.jp/no-gyakutai/189/ (こども家庭庁)
  //  よりそいホットライン 0120-279-338: https://www.since2011.net/yorisoi/ and https://www.mhlw.go.jp/mamorouyokokoro/soudan/tel/
  //  #いのちSOS 0120-061-338: https://www.mhlw.go.jp/mamorouyokokoro/soudan/tel/
  //  188: https://www.caa.go.jp/policies/policy/local_cooperation/local_consumer_administration/hotline/
  //  若ナビα 03-3267-0808 / TOKYOチャレンジネット 0120-874-225: https://www.fukushi.metro.tokyo.lg.jp/kiban/madoguchi/josei_soudan.html
  var SOS = [
    { g: 'sos.g1', items: [
      { k: '110', num: '110', urgent: true },
      { k: '119', num: '119', urgent: true }
    ] },
    { g: 'sos.gHome', home: true, items: [
      { k: 'chal', num: '0120-874-225', hours: 'sos.chalh' },
      { k: '189', num: '189' }
    ] },
    { g: 'sos.g2', items: [
      { k: 'yori', num: '0120-279-338', hours: 'sos.yorih' },
      { k: 'inochi', num: '0120-061-338', hours: 'sos.free' },
      { k: 'waka', num: '03-3267-0808', hours: 'sos.wakah' }
    ] },
    { g: 'sos.g3', items: [
      { k: '188', num: '188' }
    ] }
  ];
  SM.sos = SOS;
  // 中学生 (body.is-junior): no adult housing service, no 生活保護 link, no 18–39 youth line.
  //  24時間子供SOSダイヤル 0120-0-78310: https://www.mext.go.jp/a_menu/shotou/seitoshidou/06112216.html (data: kodomo-sos)
  //  チャイルドライン 0120-99-7777 (18歳まで, 毎日16〜21時): https://childline.or.jp/tel/ (data: childline)
  var SOS_JR = [
    { g: 'sos.jr.g1', items: [
      { k: '110', num: '110', urgent: true },
      { k: '119', num: '119', urgent: true }
    ] },
    { g: 'sos.jr.gHome', items: [
      { k: '189', num: '189', d: 'sos.jr189d' },
      { k: 'kodomo', num: '0120-0-78310', hours: 'sos.kodomoh' }
    ] },
    { g: 'sos.jr.g2', items: [
      { k: 'child', num: '0120-99-7777', hours: 'sos.childh' },
      { k: 'yori', num: '0120-279-338', hours: 'sos.yorih', d: 'sos.jr.yorid' },
      { k: 'inochi', num: '0120-061-338', hours: 'sos.free' }
    ] }
  ];
  SM.sosJr = SOS_JR;
  function sosList() {
    var jr = false;
    try { jr = document.body.classList.contains('is-junior') || SM.isJunior(); } catch (e) { jr = false; }
    return jr ? SOS_JR : SOS;
  }

  function sosRow(it) {
    var name = t('sos.' + it.k);
    var desc = t(it.d || ('sos.' + it.k + 'd'));
    var tel = it.num.replace(/[^0-9]/g, '');
    return '<li class="sos-li' + (it.urgent ? ' is-urgent' : '') + '">' +
      // the label (plain text, no ruby readings) says everything the row shows, opening hours included
      '<a class="sos-row" href="tel:' + tel + '" data-press aria-label="' + esc(name + ' ' + it.num + '. ' + desc + (it.hours ? '. ' + t(it.hours) : '')) + '">' +
        '<span class="sos-ic" aria-hidden="true">' + ic('phone') + '</span>' +
        '<span class="sos-text">' +
          '<span class="sos-name">' + esc(name) + '</span>' +
          '<span class="sos-num" data-noruby>' + esc(it.num) + '</span>' +
          '<span class="sos-desc">' + esc(desc) + '</span>' +
          (it.hours ? '<span class="sos-hours">' + esc(t(it.hours)) + '</span>' : '') +
        '</span>' +
      '</a>' +
      (it.urgent ? '' : '<button type="button" class="sos-copy" data-act="copy" data-text="' + esc(it.num) + '" data-msg="' + esc(t('sos.copied')) + '" aria-label="' + esc(t('sos.copy', { name: name })) + '">' + ic('copy') + '</button>') +
    '</li>';
  }

  function openSOS() {
    var list = sosList();
    var jr = list === SOS_JR;
    var html =
      '<p class="sos-lead">' + esc(t(jr ? 'sos.jr.lead' : 'sos.lead')) + '</p>' +
      list.map(function (grp) {
        return '<section class="sos-group' + (grp.items[0].urgent ? ' sos-group-urgent' : '') + '"><h3 class="sos-gtitle">' + esc(t(grp.g)) + '</h3>' +
          '<ul class="sos-list">' + grp.items.map(sosRow).join('') + '</ul>' +
          (grp.home ? '<a class="sos-chat-link sos-home-link" href="#/p/seikatsu-hogo"><span>' + esc(t('sos.seikatsuBtn')) + '<small class="sos-desc">' + esc(t('sos.seikatsud')) + '</small></span>' + ic('chevron-right') + '</a>' : '') +
          '</section>';
      }).join('') +
      '<div class="sos-chat">' +
        '<div class="sos-chat-text"><p class="sos-chat-title">' + esc(t('sos.chatTitle')) + '</p>' +
        '<p class="sos-chat-body">' + esc(t(jr ? 'sos.jr.chatBody' : 'sos.chatBody')) + '</p>' +
        // only the places you can reach by LINE or chat (find.js filters on ?chat=1)
        '<a class="sos-chat-link" href="#/find/cat/consult?chat=1">' + esc(t('sos.chatBtn')) + ic('chevron-right') + '</a></div>' +
      '</div>' +
      '<p class="sos-foot">' + esc(t('sos.checked', { date: SM.fmtDate(SM.updated) })) + '</p>';
    SM.sheet(html, { title: t('sos.title'), cls: 'sheet-sos', mount: sosEnter });
  }
  SM.openSOS = openSOS;
  /* The SOS list lands with the sheet: rows rise 12px into place 30ms apart (transform only: every number is
     readable from the first frame), the 110 / 119 phone marks stamp, and each other phone mark nudges once.
     Reduced motion: the sheet's own fade only. */
  function sosEnter(dlg) {
    var mo = SM.motion;
    if (!mo || !mo.animate || (mo.reduced && mo.reduced())) return;
    var rows = dlg.querySelectorAll('.sos-li, .sos-chat');
    Array.prototype.forEach.call(rows, function (li, i) {
      if (i > 9) return;
      mo.animate(li, [{ transform: 'translateY(12px)' }, { transform: 'none' }], { spring: 'smooth', delay: 60 + i * 30, fill: 'backwards' });
    });
    setTimeout(function () {
      if (!dlg.isConnected) return;
      Array.prototype.forEach.call(dlg.querySelectorAll('.sos-li.is-urgent .sos-ic svg'), function (svg, i) {
        setTimeout(function () { if (svg.isConnected && mo.stamp) mo.stamp(svg, { ring: true }); }, i * 70);
      });
      Array.prototype.forEach.call(dlg.querySelectorAll('.sos-li:not(.is-urgent) .sos-ic'), function (ic0, i) {
        if (i > 6) return;
        setTimeout(function () { if (ic0.isConnected && mo.nudge) mo.nudge(ic0); }, 140 + i * 30);
      });
    }, 160);
  }

  function btn(label, o) {
    if (SM.ui && typeof SM.ui.button === 'function') {
      try { return SM.ui.button(label, { act: o.act, variant: o.variant, icon: o.icon, block: true, size: o.size || 'md' }); } catch (e) { }
    }
    return '<button type="button" class="btn btn-' + o.variant + ' btn-block" data-act="' + o.act + '">' +
      (o.icon ? ic(o.icon) : '') + '<span>' + esc(label) + '</span></button>';
  }

  /* ------------------------------------------------------------------ settings sheet */
  function toggleRow(key, iconName, checked) {
    var id = 'set-' + key;
    return '<label class="switch-row set-row" for="' + id + '">' +
      '<span class="switch-text"><b>' + esc(t('set.' + key)) + '</b>' +
        '<small id="' + id + '-d">' + esc(t('set.' + key + 'd')) + '</small></span>' +
      '<input type="checkbox" role="switch" class="switch" id="' + id + '" data-act="setting" data-key="' + key + '"' +
        ' aria-describedby="' + id + '-d"' + (checked ? ' checked' : '') + '>' +
      // F45: the state in words beside the switch (a filled knob alone read as 'on' on a dim screen)
      '<span class="switch-state" aria-hidden="true" data-on="' + esc(t('set.on')) + '" data-off="' + esc(t('set.off')) + '"></span>' +
    '</label>';
  }

  function settingsHtml() {
    var s = SM.state.settings;
    return '<section class="set-group"><h3 class="set-gtitle">' + esc(t('set.gView')) + '</h3>' +
        '<div class="set-card">' +
          toggleRow('big', 'text-size', s.big) +
          toggleRow('ruby', 'ruby', s.ruby) +
          toggleRow('lang', 'globe', s.lang === 'en') +
          toggleRow('dark', 'moon', !!s.dark) +
          toggleRow('motion', 'motion', s.motion === 'reduce') +
        '</div></section>' +
      '<section class="set-group"><h3 class="set-gtitle">' + esc(t('set.gSup')) + '</h3>' +
        '<div class="set-card">' + toggleRow('sup', 'users', s.supporter) + '</div></section>' +
      '<section class="set-group"><h3 class="set-gtitle">' + esc(t('set.gPriv')) + '</h3>' +
        '<div class="set-card set-privacy">' +
          '<p class="set-priv"><span>' + esc(t('set.priv')) + '</span></p>' +
          (SM.store.available ? '' : '<p class="set-warn">' + esc(t('set.noStore')) + '</p>') +
          '<div class="set-erase">' + btn(t('set.erase'), { act: 'erase', variant: 'danger' }) + '</div>' +
          '<p class="set-note">' + esc(t('set.eraseNote')) + '</p>' +
        '</div></section>' +
      '<section class="set-group set-more"><h3 class="set-gtitle">' + esc(t('set.gMore')) + '</h3>' +
        (hasLearn() ? '<a class="set-link" href="#/learn"><span>' + esc(t('set.learn')) + '</span>' + ic('chevron-right') + '</a>' : '') +
        '<a class="set-link" href="#/about"><span>' + esc(t('set.about')) + '</span>' + ic('chevron-right') + '</a>' +
      '</section>' +
      '<p class="set-version">' + esc(t('set.version', { v: SM.version, d: SM.fmtDate(SM.updated) })) + '</p>';
  }

  function openSettings(focusSel) {
    SM.sheet(settingsHtml(), { title: t('set.title'), cls: 'sheet-settings', focus: focusSel });
  }
  SM.openSettings = openSettings;

  SM.on('setting', function (el) {
    var key = el.getAttribute('data-key');
    var on = !!el.checked;
    var s = SM.state.settings;
    if (key === 'lang') s.lang = on ? 'en' : 'ja';
    else if (key === 'sup') s.supporter = on;
    else if (key === 'motion') s.motion = on ? 'reduce' : 'auto';
    else s[key] = on;
    if (key === 'ruby') { if (!SM.state.hints || typeof SM.state.hints !== 'object') SM.state.hints = {}; SM.state.hints.jrRuby = true; }
    SM.save();
    var apply = function () {
      SM.applySettings();
      if (key === 'lang' || key === 'ruby') SM.paintShell();
      SM.render();
      // re-paint the sheet (language / furigana may have changed) and keep focus on the same switch
      openSettings('#set-' + key);
      // the re-painted switch is a new element: its knob still slides across on the snappy spring
      var sw = document.getElementById('set-' + key);
      if (sw && sw.animate && !(SM.motion && SM.motion.reduced && SM.motion.reduced())) {
        try {
          sw.animate([{ transform: 'translateX(' + (on ? 0 : 20) + 'px)' }, { transform: 'translateX(' + (on ? 20 : 0) + 'px)' }],
            { duration: 260, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.04)', pseudoElement: '::before' });
        } catch (e) { }
      }
    };
    var mo = SM.motion;
    // theme: a 200ms cross-fade of the whole screen, nothing moves (MOTION-SPEC §3.5)
    if (key === 'dark' && mo && mo.transition) { mo.transition('theme', apply); return; }
    // 文字を大きく / ふりがな / English re-flow the whole page: it cross-fades (the old page out 160ms, the new one in
    // 200ms) instead of snapping; furigana arrive a beat after their base text (motion.css html.m-ruby-in), so
    // the change reads as "readings added". The switch's knob has already slid on its spring.
    if ((key === 'big' || key === 'ruby' || key === 'lang') && mo && mo.transition && !(mo.reduced && mo.reduced())) {
      var de = document.documentElement;
      if (key === 'ruby' && on) { de.classList.add('m-ruby-in'); setTimeout(function () { de.classList.remove('m-ruby-in'); }, 900); }
      mo.transition('fade', apply);
      return;
    }
    apply();
  });

  SM.on('erase', function () {
    var html =
      '<div class="set-confirm">' +
        '<p class="set-confirm-body">' + esc(t('set.confirmBody')) + '</p>' +
        '<div class="set-confirm-actions">' +
          btn(t('set.confirmYes'), { act: 'erase-yes', variant: 'danger' }) +
          btn(t('set.confirmNo'), { act: 'erase-no', variant: 'secondary' }) +
        '</div>' +
      '</div>';
    SM.sheet(html, { title: t('set.confirmTitle'), cls: 'sheet-confirm', label: t('set.confirmTitle'), focus: '[data-act="erase-no"]' });
  });
  SM.on('erase-no', function () { openSettings('[data-act="erase"]'); });
  SM.on('erase-yes', function () {
    SM.store.clearAll();
    try { sessionStorage.setItem('sm2:erased', '1'); } catch (e) { }
    if (location.hash && location.hash !== '#/') {
      try { history.replaceState(null, '', location.pathname + location.search + '#/'); } catch (e) { location.hash = '#/'; }
    }
    location.reload();
  });

  /* ------------------------------------------------------------------ keyboard */
  /* The 2nd Esc within 1s always exits. Caught on window in the capture phase, which runs before every
     document listener: full-screen modes (窓口で見せる, 読みあげモード), the map and search boxes handle Esc
     themselves and stop it, and must never be able to swallow the quick exit. onKey below still closes a
     sheet and shows the "press again" hint on the first press. */
  var lastEscW = 0;
  // S4: an Esc (or Enter) that belongs to a kana→kanji conversion is the input method's, never the app's
  function composing(ev) { return !!(ev.isComposing || ev.keyCode === 229); }
  SM.composing = composing;
  function onEscFirst(ev) {
    if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
    if (composing(ev)) return;
    var n = Date.now();
    if (n - lastEscW < 1000) { ev.preventDefault(); ev.stopImmediatePropagation(); quickExit(); return; }
    lastEscW = n;
  }
  /* Tab never lands on content that is still fading in: when keyboard focus moves into an entrance that has not
     landed yet (scrolled in by the Tab itself, or still waiting on its stagger), that block and its siblings land
     at once through SM.motion.finishAll, and any running animation on the way up (a view's own entrance) jumps to
     its end. Only Tab moves count, so the h1 focus after a route keeps its entrance. */
  var lastTab = 0;
  function onTabKey(ev) { if (ev.key === 'Tab') lastTab = Date.now(); }
  function onFocusReveal(ev) {
    if (Date.now() - lastTab > 400) return;
    var el = ev.target, M = SM.motion;
    if (!el || !el.closest) return;
    var p = el.closest('.m-pending, .m-in'), top = p, up;
    if (p && M && M.finishAll) {
      while (top.parentElement && (up = top.parentElement.closest('.m-pending, .m-in'))) top = up;
      try { M.finishAll(top.parentElement || document, { all: true, noFlush: true }); } catch (e) { }
    }
    for (var n = el; n && n !== document.body && n.getAnimations; n = n.parentElement) {
      var an = n.getAnimations();
      for (var i = 0; i < an.length; i++) {
        try { if (an[i].playState !== 'finished' && isFinite(an[i].effect.getComputedTiming().endTime)) an[i].finish(); } catch (e) { }
      }
    }
  }
  var lastEsc = 0;
  function onKey(ev) {
    if (ev.key === 'Tab') { SM._trapTab(ev); return; }
    if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
    if (composing(ev)) return;
    var now = Date.now();
    // the 2nd Esc within 1s always exits, even if the 1st one closed a sheet or cleared a search box
    if (now - lastEsc < 1000) { ev.preventDefault(); quickExit(); return; }
    lastEsc = now;
    if (SM.sheetOpen()) { ev.preventDefault(); SM.closeSheet(); SM.toast(t('core.escAgain'), 1000); return; }
    SM.toast(t('core.escAgain'), 1000);
  }

  /* ------------------------------------------------------------------ start */
  function idle(f) { if (window.requestIdleCallback) window.requestIdleCallback(f, { timeout: 2500 }); else setTimeout(f, 250); }
  function afterLaunch(fn) {
    var L = window.__lx, done = false;
    var go = function () { if (done) return; done = true; idle(fn); };
    if (L && L.mode && !L.done) {
      document.addEventListener('sm:launched', go);
      setTimeout(go, 4000);   // never wait on an opening that did not report back
    } else setTimeout(go, 600);   // no opening: after the first screen has settled
  }
  SM.start = function () {
    if (SM._started || SM._starting) return;
    // S2: _started (read by the head gate's "could not start" card) is set only once the first screen is up, so a
    // start that throws shows that card, with its 保存した内容を消して開く button, instead of a blank page
    SM._starting = true;
    SM.applySettings();
    SM.paintShell();
    SM._bindEvents();
    window.addEventListener('keydown', onEscFirst, true);
    window.addEventListener('keydown', onTabKey, true);
    document.addEventListener('focusin', onFocusReveal, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', function () { if (SM._onHashChange) SM._onHashChange(); else SM._route(); });
    if (SM._guardStart) SM._guardStart();   // a deep link: the phone's Back goes to the parent screen, not out
    document.documentElement.classList.add('js');
    SM._route();
    SM._started = true;
    // 緊急 tapped before the app started: the static list (index.html #sos-static) hands over to the full sheet,
    // which slides up over it; the list goes once the sheet covers it
    var sst = document.getElementById('sos-static');
    if (sst && !sst.hidden) {
      var sb = document.querySelector('.appbar [data-act="sos"]');
      try { if (sb) sb.focus({ preventScroll: true }); } catch (e) { }
      try { sst.inert = true; } catch (e) { }
      openSOS();
      setTimeout(function () { sst.hidden = true; try { sst.inert = false; } catch (e) { } }, 450);
    }
    // once the opening is over: the other views in idle time, and the web fonts if the head gate held them back
    afterLaunch(function () {
      var L = window.__lx;
      if (L && L.fonts === 'later' && L.loadFonts) idle(function () { try { L.loadFonts(); } catch (e) { } });
      if (SM.preloadViews) SM.preloadViews();
    });
    try {
      if (sessionStorage.getItem('sm2:erased')) { sessionStorage.removeItem('sm2:erased'); SM.toast(t('set.erased')); }
    } catch (e) { }
    // keep everything in one tab when the app is installed / opened offline
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      if (exited) {
        // restored from the back/forward cache after a quick exit: never show the app again, leave at once
        try { location.replace('https://www.google.co.jp/search?q=%E5%A4%A9%E6%B0%97'); } catch (x) { }
        return;
      }
      document.body.style.visibility = '';
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', SM.start);
  else SM.start();
})();
