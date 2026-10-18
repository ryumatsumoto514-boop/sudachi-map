/* 巣立ちマップ v4 — views/plan.js (PLAN)
 * #/plan  やること. Two tracks, one screen:
 *   'leaving' — 巣立ちの日 + countdown, timeline anchored to the leaving day (data/timeline.js track:'leaving')
 *   'junior'  — 中学生: 高校入学 (April, editable) + countdown, the 高校受験のお金 timeline (track:'junior')
 * The track follows SM.isJunior() (body.is-junior) unless the user picks one with the 高校受験 / 巣立ち switch
 * (stored as SM.store 'plan:track'). Saved programs, .ics export and the 相談シート work for both tracks.
 *
 * v4 (VISUAL-SPEC §7.8, MOTION-SPEC §4.2 Plan):
 *   - countdown: num-hero digits roll in from 0 on the first view (SM.motion.odometer), later only when N changed
 *     since the last visit (SM.motion.seen 'plan.days.<track>'); a date change rolls old N → new N.
 *     The plan-hero spot stands on the number's baseline.
 *   - progress: 6px track, green fill, a 1px ink tick at "where you'd be by now".
 *   - いま band; when the current period is all done the plan-done spot replaces it (and back, live).
 *   - timeline: 1px rule, square stations; a green line fills from the first station to いま as the reader
 *     scrolls (SM.motion.scrollLinked on a view() timeline). Bodies rise 8px once. いま never moves.
 *   - 済み: the box fills + the check draws (SM.motion.check), a 済 seal stamps, the text dims; the row moves to
 *     the done end of its list by FLIP (smooth); counts roll; toast with 元に戻す (undo reverses the FLIP).
 *   - saved: remove fades the row (120ms ghost) and the rest closes up by FLIP; the timeline rows of that support
 *     go the same way; undo puts it back (rises in) and stamps its mark; the last one out brings saved-empty.
 *   - track switch: the seg fill slides (CSS), the hero morphs in place (numbers roll, labels swap), the
 *     body leaves 90ms / 24px and the new one arrives 220ms from the other side.
 *   - folds (すぎた時期, later periods) open/close by FLIP, never by height.
 *   - first screen first: the timeline (phone) / everything after the first 3 periods (desktop) and saved rows
 *     after the 6th are appended in SM.motion.afterTransition; the printable sheet is built on demand.
 * State: SM.state.leaveDate ('YYYY-MM-DD' | null), SM.state.hsDate ('YYYY-MM-DD' | null, 高校入学),
 * SM.state.done keys 'tl:<m>:<task>' (leaving), 'jr:<groupId>:<task>' (junior), 'pg:<programId>' (saved).
 * Extra (additive): SM.plan = { build, buildICS, planEvents, sheetText, assumedLeave, assumedEntry, addMonths,
 *   icsFold, icsEscape, track, anchor } for tests and other views. */
(function () {
  'use strict';
  var SM = window.SM = window.SM || {};
  SM.views = SM.views || {};

  /* ------------------------------------------------------------------ strings */
  SM.strings({
    'plan.title': { ja: 'やること', en: 'My plan' },
    'plan.h1': { ja: 'やること', en: 'My plan' },
    'plan.lead': { ja: '巣立ちの日に合わせて、いつ・何をするかがわかります。', en: 'What to do, and when — lined up with your leaving day.' },

    'plan.track.label': { ja: '予定の種類', en: 'Which plan' },
    'plan.track.junior': { ja: '高校受験', en: 'Starting high school' },
    'plan.track.leaving': { ja: '巣立ち', en: 'Leaving care' },

    'plan.leave.label': { ja: '巣立ちの日', en: 'Leaving day' },
    'plan.leave.def': { ja: '巣立ちの日＝施設や里親家庭を出て、自分で暮らしはじめる日。', en: 'Leaving day = the day you move out of care and start living on your own.' },
    'plan.count.k': { ja: '巣立ちまで', en: 'Until you leave' },
    'plan.count.kAfter': { ja: '巣立ってから', en: 'Since you left' },
    'plan.count.unit': { ja: '日', en: 'days' },
    'plan.count.unit1': { ja: '日', en: 'day' },
    'plan.count.pre': { ja: '', en: '' },
    'plan.count.todayK': { ja: '巣立ちの日は', en: 'Your leaving day is' },
    'plan.count.todayBig': { ja: '今日', en: 'Today' },
    'plan.count.todaySub': { ja: 'ここからがスタート。', en: 'This is where it starts.' },
    'plan.assumed': { ja: '仮の日付', en: 'Not set yet' },
    'plan.assumedNote': { ja: 'まだ決まっていないので、{date}として計算しています。', en: 'Not decided yet, so we use {date} for now.' },
    'plan.change': { ja: '変える', en: 'Change' },
    'plan.changeLabel': { ja: '{what}を変える（いまは{date}）', en: 'Change {what} (now {date})' },
    'plan.progress': { ja: 'できたこと', en: 'Done' },
    'plan.progressOf': { ja: '{done} / {total}', en: '{done} of {total}' },
    'plan.progressDue': { ja: '{done} / {total}（いまの時期までの目安は{due}）', en: '{done} of {total} (about {due} by now)' },
    'plan.due': { ja: 'いまの時期まで', en: 'By now' },

    'plan.jr.anchor': { ja: '高校入学', en: 'High school starts' },
    'plan.jr.count.k': { ja: '高校入学まで', en: 'Until high school' },
    'plan.jr.count.kAfter': { ja: '高校に入ってから', en: 'Since high school started' },
    'plan.jr.count.todayK': { ja: '高校入学は', en: 'High school starts' },
    'plan.jr.count.todaySub': { ja: '入学の申請を忘れずに。', jr: '申請をわすれずに。', en: 'Don’t forget the applications.' },
    'plan.jr.def': { ja: '高校に入る4月に合わせて、受験とお金のやることを並べています。', jr: '高校に入る4月に合わせて、やることを並べています。', en: 'Exam and money to-dos, lined up with the April you start high school.' },
    'plan.jr.assumedNote': { ja: 'まだ決まっていないので、{date}（いま{g}）として計算しています。', jr: 'いま{g}として、{date}で計算しています。', en: 'Not set yet, so we use {date} (assuming you are in {g}).' },
    'plan.jr.g3': { ja: '中3', en: 'grade 9' },
    'plan.jr.g2': { ja: '中2', en: 'grade 8' },
    'plan.jr.g1': { ja: '中1', en: 'grade 7' },
    'plan.jr.until': { ja: '{date}まで', en: 'Until {date}' },
    'plan.jr.tl.h': { ja: '高校入学までの道のり', jr: '高校に入るまでの道のり', en: 'Road to high school' },
    'plan.jr.nowEarly': { ja: 'まだ先。ゆっくりで大丈夫。', en: 'Plenty of time.' },
    'plan.jr.nowLate': { ja: '就学支援金や給付金は、毎年の申請が必要です。', jr: '申請は毎年あります。わすれずに。', en: 'Tuition support and benefits must be applied for every year.' },
    'plan.jr.note': { ja: '時期は目安。日にちは学校の案内で確かめてね。', en: 'Timing is a guide. Check dates with your school.' },
    'plan.jr.date.title': { ja: '高校入学の日', en: 'When high school starts' },
    'plan.jr.date.field': { ja: '高校に入学する日（入学式の日でもOK）', en: 'The day you start high school (the entrance ceremony is fine)' },
    'plan.jr.date.quick': { ja: 'いまの学年からえらぶ', en: 'Pick by your grade now' },
    'plan.jr.date.opt': { ja: '{y}年4月', en: 'April {y}' },
    'plan.jr.date.optSub': { ja: 'いま{g}', en: 'In {g} now' },
    'plan.jr.date.unknown': { ja: 'まだわからない', en: 'Not sure yet' },
    'plan.jr.date.unknownSub': { ja: '答えた学年から計算します', en: 'We will work it out from your grade' },
    'plan.jr.date.saved': { ja: '高校入学を{date}にしました', en: 'High school start set to {date}' },

    'plan.date.title': { ja: '巣立ちの日', en: 'Leaving day' },
    'plan.date.field': { ja: '施設や家を出る日（予定でOK）', en: 'The day you leave (a planned date is fine)' },
    'plan.date.help': { ja: 'あとで何度でも変えられます。この日はこのスマホの中だけに保存されます。', en: 'You can change it any time. It is saved only on this phone.' },
    'plan.date.save': { ja: 'この日にする', en: 'Use this date' },
    'plan.date.quick': { ja: 'よくある日', en: 'Common dates' },
    'plan.date.unknown': { ja: 'まだ決まっていない', en: 'Not decided yet' },
    'plan.date.unknownSub': { ja: '3月31日として計算します', en: 'We will use March 31' },
    'plan.date.invalid': { ja: '日付を選んでください', en: 'Please pick a date' },
    'plan.date.saved': { ja: '巣立ちの日を{date}にしました', en: 'Leaving day set to {date}' },
    'plan.date.cleared': { ja: '「まだ決まっていない」にしました', en: 'Set to “not decided yet”' },
    'plan.date.fy': { ja: '{y}年3月31日', en: 'Mar 31, {y}' },

    'plan.now.k': { ja: 'いま', en: 'Now' },
    'plan.now.next': { ja: 'つぎ', en: 'Next' },
    'plan.now.left': { ja: 'のこり', en: '' },
    'plan.now.unit': { ja: 'こ', en: 'left' },
    'plan.now.of': { ja: '（全{n}こ）', en: 'of {n}' },
    'plan.now.from': { ja: '{date}から', en: 'from {date}' },
    'plan.now.jump': { ja: 'やることを見る', en: 'See tasks' },
    'plan.now.jumpNext': { ja: 'つぎを見る', en: 'See next' },
    'plan.now.jumpAll': { ja: 'やることを見る', en: 'See the list' },
    'plan.now.doneT': { ja: 'この時期は、ぜんぶできた', en: 'This period: all done' },
    'plan.now.emptyT': { ja: 'この時期のやることはなし', en: 'Nothing due now' },
    'plan.now.emptyB': { ja: '', en: '' },
    'plan.now.lateT': { ja: '巣立ってから、時間がたちました', en: 'A while since you left' },
    'plan.now.lateB': { ja: '巣立ちから時間がたっていても、使える支援はあります。', en: 'Even long after leaving, there is support you can use.' },
    'plan.now.jrLateT': { ja: '高校生活が、はじまっています', en: 'High school is under way' },
    'plan.now.consult': { ja: '相談先を見る', en: 'Get help' },
    'plan.all.t': { ja: 'ぜんぶできました', en: 'All done' },
    'plan.all.b': { ja: 'よくがんばりました。', en: 'Well done.' },

    'plan.act.ics': { ja: 'カレンダーに入れる', en: 'Add to calendar' },
    'plan.act.icsSub': { ja: 'やることの日をスマホのカレンダーへ', en: 'Put your to-do dates in your phone' },
    'plan.act.sheet': { ja: '相談シートをつくる', en: 'Make a talk sheet' },
    'plan.act.sheetSub': { ja: '職員や先生に見せるメモ', en: 'A note to show staff or a teacher' },

    'plan.saved.h': { ja: '保存した支援', en: 'Saved' },
    'plan.saved.sub': { ja: '{n}件', en: '{n} saved' },
    'plan.saved.more': { ja: 'さがす', en: 'Find more' },
    'plan.saved.remove': { ja: '外す', en: 'Remove' },
    'plan.saved.removeLabel': { ja: '「{name}」をやることから外す', en: 'Remove “{name}” from my plan' },
    'plan.saved.removed': { ja: '「{name}」を外しました', en: 'Removed “{name}”' },
    'plan.saved.undo': { ja: '元に戻す', en: 'Undo' },
    'plan.saved.restored': { ja: '元に戻しました', en: 'Restored' },
    'plan.empty.title': { ja: 'まだ保存なし', en: 'Nothing saved yet' },
    'plan.empty.body': { ja: '☆で保存すると、ここに入ります。', en: 'Tap ☆ on a program to keep it here.' },
    'plan.empty.find': { ja: '支援をさがす', en: 'Find support' },
    'plan.empty.results': { ja: '結果を見る', en: 'See results' },

    'plan.tl.h': { ja: '巣立ちまでの道のり', en: 'Your timeline' },
    'plan.tl.sub': { ja: 'チェックすると、このスマホに記録されます。', en: 'Ticks are saved on this phone.' },
    'plan.tl.before': { ja: '{n}か月前', en: '{n} mo. before' },
    'plan.tl.yearBefore': { ja: '1年前', en: '1 year before' },
    'plan.tl.after': { ja: '{n}か月後', en: '{n} mo. after' },
    'plan.tl.day': { ja: '当日', en: 'The day' },
    'plan.tl.now': { ja: 'いま', en: 'Now' },
    'plan.tl.nowEarly': { ja: 'まだ先。ゆっくりで大丈夫。', en: 'Plenty of time.' },
    'plan.tl.nowLate': { ja: '巣立ちから時間がたっていても、使える支援はあります。', en: 'Even long after leaving, there is support you can use.' },
    'plan.tl.past': { ja: 'すぎた時期（{n}）', en: 'Earlier ({n})' },
    'plan.tl.pastLeft': { ja: 'まだ {n}こ', en: '{n} left' },
    'plan.tl.pastAll': { ja: 'ぜんぶできた', en: 'All done' },
    'plan.tl.pastNote': { ja: 'すぎていても、やる価値があります。', en: 'Still worth doing, even now.' },
    'plan.tl.count': { ja: '{done}/{total}', en: '{done}/{total}' },
    'plan.tl.related': { ja: '関係する支援', en: 'Related' },
    'plan.tl.relatedN': { ja: '関係する支援（{n}）', en: 'Related ({n})' },
    'plan.tl.saved': { ja: '保存した支援', en: 'Saved' },
    'plan.tl.openNow': { ja: 'いま受付中', en: 'Open now' },
    'plan.tl.open': { ja: '申込 {m}', en: 'Apply {m}' },
    'plan.tl.applyK': { ja: '申込', en: 'Apply' },
    'plan.tl.untilK': { ja: '期限', en: 'Due' },
    'plan.tl.byDate': { ja: '{date}ごろまで', en: 'By about {date}' },
    'plan.tl.tool': { ja: 'ひらく', en: 'Open' },
    'plan.tl.detail': { ja: 'くわしく', en: 'Details' },
    'plan.tl.seal': { ja: '済', en: 'Done' },
    'plan.tl.note': { ja: '時期は目安。職員や先生と調整してね。', en: 'Timing is a guide. Adjust it with staff.' },
    'plan.done.toast': { ja: 'できた！', en: 'Done!' },
    'plan.done.groupToast': { ja: 'この時期、ぜんぶできた！', en: 'Period complete!' },

    'plan.ics.title': { ja: 'カレンダーに入れる', en: 'Add to calendar' },
    'plan.ics.lead': { ja: 'これからの予定 {n}件を、カレンダー用のファイルにしました。', en: 'We made a calendar file with your {n} upcoming dates.' },
    'plan.ics.none': { ja: 'これから先の予定がありません', en: 'No upcoming dates' },
    'plan.ics.noneBody': { ja: 'ぜんぶチェック済みか、日付がすぎています。日付を変えると予定が変わります。', en: 'Everything is ticked or in the past. Changing the date moves the plan.' },
    'plan.ics.more': { ja: 'ほか {n}件', en: '+{n} more' },
    'plan.ics.save': { ja: 'カレンダー用ファイルを保存', en: 'Save the calendar file' },
    'plan.ics.saveIOS': { ja: 'カレンダーに追加する', en: 'Add to Calendar' },
    'plan.ics.how': { ja: '入れ方', en: 'How to add' },
    'plan.ics.howIOS': { ja: 'iPhone：ボタンを押す →「すべてを追加」。ファイルとして保存されたら、「ファイル」アプリで開きます。', en: 'iPhone: tap the button → “Add All”. If it saves as a file, open it from the Files app.' },
    'plan.ics.howAndroid': { ja: 'Android：保存したファイル（.ics）をタップして、カレンダーアプリを選びます。', en: 'Android: tap the saved .ics file and choose your calendar app.' },
    'plan.ics.howPC': { ja: 'パソコン：Googleカレンダーの「設定 → インポート」からも入れられます。', en: 'Computer: in Google Calendar, use Settings → Import.' },
    'plan.ics.privacy': { ja: 'ファイルはこのスマホの中でつくっています。どこにも送りません。', en: 'The file is made on this phone. Nothing is sent anywhere.' },
    'plan.ics.alarm': { ja: '前の日の朝9時に通知が出ます。', en: 'You get a reminder at 9am the day before.' },
    'plan.ics.calName': { ja: '巣立ちマップ やること', en: 'Sudachi Map plan' },
    'plan.ics.leave': { ja: '巣立ちの日', en: 'Leaving day' },
    'plan.ics.entry': { ja: '高校入学', en: 'High school starts' },
    'plan.ics.group': { ja: 'やること：{t}', en: 'To do: {t}' },
    'plan.ics.prog': { ja: '締切の目安：{name}', en: 'Deadline (approx.): {name}' },
    'plan.ics.progOpen': { ja: '申込の時期：{name}', en: 'Applications open: {name}' },
    'plan.ics.ask': { ja: '窓口でこう聞く', en: 'Ask at the desk' },
    'plan.ics.foot': { ja: '巣立ちマップ（Economix JP）でつくった予定です。時期は目安です。', en: 'Made with Sudachi Map (Economix JP). Dates are a guide.' },
    'plan.ics.made': { ja: 'ファイルをつくりました', en: 'File created' },
    'plan.ics.plain': { ja: '目立たない名前にする', en: 'Use plain, private names' },
    'plan.ics.plainSub': { ja: 'ロック画面や共有のカレンダーで見られても、施設や制度のことがわからない名前にします', en: 'Lock screens and shared calendars won\'t show anything about care or benefits' },
    'plan.ics.plainCal': { ja: '予定', en: 'Plans' },
    'plan.ics.plainLeave': { ja: '準備：大事な日', en: 'Prep: big day' },
    'plan.ics.plainGroup': { ja: '準備：やることを確認', en: 'Prep: check my list' },
    'plan.ics.plainProg': { ja: '準備：手続きの確認', en: 'Prep: paperwork check' },
    'plan.ics.plainDesc': { ja: 'くわしくは、保存したリストを見てください。', en: 'See your saved list for details.' },
    'plan.ics.cloud': { ja: 'スマホのカレンダーは、GoogleやiCloudに自動で同期されることがあります。家族や職員と共有しているカレンダーには入れないでください。', en: 'Phone calendars may sync to Google or iCloud. Don\'t add this to a calendar you share with family or staff.' },

    'plan.sheet.title': { ja: '相談シート', en: 'Talk sheet' },
    'plan.sheet.lead': { ja: '職員・先生・窓口の人に見せるためのメモです。名前は入りません。', en: 'A note to show staff, a teacher or a support desk. Your name is not included.' },
    'plan.sheet.memo': { ja: '自分のメモ（書かなくてOK）', en: 'Your note (optional)' },
    'plan.sheet.memoPh': { ja: '例：4月から専門学校。家賃が心配。電話が苦手なので、いっしょに来てほしい。', jr: '例：高校のお金が心配。塾代の支援のことを聞きたい。', en: 'e.g. Starting college in April. Worried about rent. Phone calls are hard, can someone come with me?' },
    'plan.sheet.memoHelp': { ja: 'このスマホの中だけに保存されます。', en: 'Saved only on this phone.' },
    'plan.sheet.preview': { ja: 'シートの中身', en: 'What the sheet says' },
    'plan.sheet.copy': { ja: 'コピーする', en: 'Copy' },
    'plan.sheet.copiedShort': { ja: 'コピーしました', en: 'Copied' },
    'plan.sheet.copied': { ja: '相談シートをコピーしました。LINEやメールに貼れます', en: 'Copied. You can paste it into LINE or email' },
    'plan.sheet.print': { ja: '印刷する', en: 'Print' },
    'plan.sheet.emptyHint': { ja: '支援を保存したり、質問に答えたりすると、シートの中身が増えます。', en: 'Save programs or answer the questions to fill the sheet.' },
    'plan.sheet.findLink': { ja: '質問に答える', en: 'Answer questions' },

    'plan.s.head': { ja: '【相談シート】巣立ちマップ', en: '[Talk sheet] Sudachi Map' },
    'plan.s.made': { ja: '作成日', en: 'Made on' },
    'plan.s.me': { ja: 'わたしのこと', en: 'About me' },
    'plan.s.leave': { ja: '巣立ちの日', en: 'Leaving day' },
    'plan.s.leaveAssumed': { ja: '{date}（まだ決まっていない）', en: '{date} (not decided yet)' },
    'plan.s.entry': { ja: '高校入学（予定）', en: 'Starting high school' },
    'plan.s.stage': { ja: '今の状況', en: 'Now' },
    'plan.s.path': { ja: '次にしたいこと', en: 'Next step' },
    'plan.s.area': { ja: '住む（予定の）区市町村', en: 'City / ward' },
    'plan.s.concerns': { ja: '気になること', en: 'Worries' },
    'plan.s.age': { ja: '年齢', en: 'Age' },
    'plan.s.memo': { ja: '自分のメモ', en: 'My note' },
    'plan.s.progs': { ja: '知りたい支援と、聞きたいこと', en: 'Programs I want to ask about' },
    'plan.s.where': { ja: '窓口', en: 'Where' },
    'plan.s.deadline': { ja: '締切', en: 'Deadline' },
    'plan.s.phone': { ja: '電話', en: 'Phone' },
    'plan.s.noProgs': { ja: '（まだ保存した支援はありません）', en: '(No saved programs yet)' },
    'plan.s.next': { ja: 'これからのやること', en: 'Coming up' },
    'plan.s.staff': { ja: '相談した人のメモ', en: 'Notes from the person I talked to' },
    'plan.s.foot': { ja: '※本人が巣立ちマップでつくったシートです。制度の内容は窓口で確かめてください。', en: '* Made by the young person with Sudachi Map. Please confirm details with the office.' }
  });

  /* ------------------------------------------------------------------ helpers */
  function esc(s) { return SM.esc(s); }
  function t(k, v) { return SM.t(k, v); }
  function L(o) { return SM.L(o); }
  function ic(n, c) { try { return SM.icon ? SM.icon(n, c) : ''; } catch (e) { return ''; } }
  function en() { return SM.lang() === 'en'; }
  function state() { return SM.state; }
  function answers() { return (SM.state && SM.state.answers) || {}; }
  function M() { return SM.motion || null; }
  function reduced() {
    var m = M();
    if (m && typeof m.reduced === 'function') return m.reduced();
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function canAnim() { var m = M(); return !!(m && m.animate) && !reduced() && typeof Element !== 'undefined' && !!Element.prototype.animate; }
  function anim(el, kf, o) { var m = M(); return m && m.animate ? m.animate(el, kf, o) : null; }
  function finished(a) { return a && a.finished ? a.finished.then(function () { }, function () { }) : Promise.resolve(); }
  function EASE(k) { var m = M(); var e = m && m.tokens && m.tokens.ease; return (e && e[k]) || 'cubic-bezier(0.2, 0, 0, 1)'; }
  function arrow(d) { return SM.ui && SM.ui.arrow ? SM.ui.arrow(d) : '<span class="arrow" aria-hidden="true">→</span>'; }
  function il(name, o) { try { return SM.illus && SM.illus.has && SM.illus.has(name) ? SM.illus(name, o) : ''; } catch (e) { return ''; } }
  function view() { var v = document.getElementById('view'); return v && v.classList.contains('v-plan') ? v : null; }
  function isPlanRoute() { return !!(SM.route && SM.route.key === 'plan'); }
  function focusQuiet(el) { if (el) try { el.focus({ preventScroll: true }); } catch (e) { } }
  function rubyOn() { return !!(SM.state && SM.state.settings && SM.state.settings.ruby) && !en(); }
  function applyRuby(el) { try { if (SM.applyRuby) SM.applyRuby(el); } catch (e) { } }
  function wide() { try { return !!(window.matchMedia && window.matchMedia('(min-width: 1100px)').matches); } catch (e) { return false; } }

  function today0() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (d.getMonth() !== +m[2] - 1 || +m[1] < 1990 || +m[1] > 2100) return null;
    return d;
  }
  function addMonths(d, n) {
    var y = d.getFullYear(), m = d.getMonth() + n;
    var first = new Date(y, m, 1);
    var last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last));
  }
  function monthStart(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function dayNum(d) { return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
  function daysBetween(a, b) { return dayNum(b) - dayNum(a); }
  var MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WD_JA = ['日', '月', '火', '水', '木', '金', '土'];
  var WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function fmtMonth(d) { return en() ? MON_EN[d.getMonth()] + ' ' + d.getFullYear() : d.getFullYear() + '年' + (d.getMonth() + 1) + '月'; }
  function fmtDate(d) { return SM.fmtDate ? SM.fmtDate(d) : iso(d); }
  function fmtDateW(d) { return fmtDate(d) + (en() ? ' (' + WD_EN[d.getDay()] + ')' : '（' + WD_JA[d.getDay()] + '）'); }
  function fmtShort(d) { return en() ? MON_EN[d.getMonth()] + ' ' + d.getDate() : (d.getMonth() + 1) + '/' + d.getDate(); }
  /* "2026年10月〜12月" / "Oct–Dec 2026" (end = any day in the last month) */
  function fmtRange(start, end) {
    if (!end) return fmtMonth(start);
    var sy = start.getFullYear(), ey = end.getFullYear(), sm = start.getMonth(), em = end.getMonth();
    if (sy === ey && sm === em) return fmtMonth(start);
    if (en()) return MON_EN[sm] + (sy !== ey ? ' ' + sy : '') + '–' + MON_EN[em] + ' ' + ey;
    return sy + '年' + (sm + 1) + '月〜' + (sy !== ey ? ey + '年' : '') + (em + 1) + '月';
  }
  function fmtNum(n) {
    var m = M();
    if (m && m.format) { try { return m.format(n); } catch (e) { } }
    try { return Number(n).toLocaleString(en() ? 'en-US' : 'ja-JP'); } catch (e) { return String(n); }
  }

  function isDone(key) { return (state().done || []).indexOf(key) !== -1; }
  function setDone(key, on) {
    var a = state().done || (state().done = []);
    var i = a.indexOf(key);
    if (on && i === -1) a.push(key);
    if (!on && i !== -1) a.splice(i, 1);
    SM.save();
  }

  /* ------------------------------------------------------------------ tracks */
  function isJunior() { try { return SM.isJunior ? !!SM.isJunior() : false; } catch (e) { return false; } }
  function trackPref() { var v = SM.store.get('plan:track', null); return v === 'junior' || v === 'leaving' ? v : null; }
  /* { track:'leaving'|'junior', pref, junior, showSwitch } */
  function trackInfo() {
    var pref = trackPref();
    var jr = isJunior();
    var stage = answers().stage;
    var track = pref || (jr ? 'junior' : 'leaving');
    // the switch shows for 中学生, for people who haven't said their stage, for nohs (may go back to high school),
    // and whenever the junior track is on (so it can always be switched back)
    var show = jr || !stage || stage === 'nohs' || track === 'junior';
    return { track: track, pref: pref, junior: jr, showSwitch: show };
  }
  function curTrack() { return trackInfo().track; }

  function timelineOf(track) {
    if (SM.data.timelineTrack) { try { return SM.data.timelineTrack(track) || []; } catch (e) { } }
    return (SM.data.timeline || []).filter(function (g) { return (g.track || 'leaving') === track; })
      .sort(function (a, b) { return track === 'junior' ? (a.seq - b.seq) : (a.m - b.m); });
  }

  /* The 3/31 we assume when the leaving day is not set. Stage-aware: people who already left get a past 3/31. */
  function assumedLeave(now, stage) {
    now = now || today0();
    var y = now.getFullYear();
    var thisMar = new Date(y, 2, 31);
    var next = now <= thisMar ? thisMar : new Date(y + 1, 2, 31);
    var prev = now > thisMar ? thisMar : new Date(y - 1, 2, 31);
    if (stage === 'left0') return prev;
    if (stage === 'left1') return new Date(prev.getFullYear() - 1, 2, 31);
    return next;
  }
  /* 高校入学 we assume when not set: the next April 1 (中3), or one year later for 中1・中2 (assume 中2). */
  function assumedEntry(now, stage) {
    now = now || today0();
    var y = now.getFullYear();
    var nextApr = now < new Date(y, 3, 1) ? y : y + 1;
    if (stage === 'jhs12') nextApr += 1;
    return new Date(nextApr, 3, 1);
  }
  function leaveInfo() {
    var d = parseISO(state().leaveDate);
    if (d) return { date: d, assumed: false };
    return { date: assumedLeave(today0(), answers().stage), assumed: true };
  }
  function entryInfo() {
    var d = parseISO(state().hsDate);
    if (d) return { date: d, assumed: false };
    return { date: assumedEntry(today0(), answers().stage), assumed: true };
  }
  /* grade label implied by an entry date (for the "いま中3" hints) */
  function gradeFor(entry, now) {
    now = now || today0();
    var first = assumedEntry(now, null).getFullYear();
    var diff = entry.getFullYear() - first;
    return diff <= 0 ? t('plan.jr.g3') : diff === 1 ? t('plan.jr.g2') : t('plan.jr.g1');
  }

  /* Next relevant date for a fixed application window, e.g. months [4,5,6] or [7..12,1,2]. */
  function windowInfo(months, now) {
    var set = {};
    months.forEach(function (m) { if (m >= 1 && m <= 12) set[m] = true; });
    var keys = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
    if (!keys.length || keys.length === 12) return null;
    var starts = keys.filter(function (m) { return !set[m === 1 ? 12 : m - 1]; });
    var curM = now.getMonth() + 1;
    var label = fmtMonths(keys, starts);
    if (set[curM]) return { date: now, open: true, label: label };
    var best = null;
    starts.forEach(function (s) {
      var y = now.getFullYear();
      var d = new Date(y, s - 1, 1);
      if (d <= now) d = new Date(y + 1, s - 1, 1);
      if (!best || d < best) best = d;
    });
    return { date: best, open: false, label: label };
  }
  function fmtMonths(keys, starts) {
    var f = function (m) { return en() ? MON_EN[m - 1] : m + '月'; };
    var runs = starts.map(function (s) {
      var e = s, n = 0;
      while (n < 12) { var nx = e === 12 ? 1 : e + 1; if (keys.indexOf(nx) === -1) break; e = nx; n++; }
      return s === e ? f(s) : f(s) + (en() ? '–' : '〜') + f(e);
    });
    return runs.join(en() ? ', ' : '・');
  }

  function relLabel(m) {
    if (m === 0) return t('plan.tl.day');
    if (m === -12) return t('plan.tl.yearBefore');
    return m < 0 ? t('plan.tl.before', { n: -m }) : t('plan.tl.after', { n: m });
  }

  /* ------------------------------------------------------------------ model */
  function taskFilter(path) {
    return function (tk) { return !tk.paths || !tk.paths.length || !path || path === 'unsure' || tk.paths.indexOf(path) !== -1; };
  }
  function mkTask(key, tk) {
    return { key: key, kind: 'task', text: L(tk), href: tk.href || null, hrefLabel: tk.hrefLabel ? L(tk.hrefLabel) : '', p: tk.p || [], done: isDone(key) };
  }

  function leavingGroups(leave) {
    var path = answers().path;
    return timelineOf('leaving').map(function (g) {
      var date = addMonths(leave, g.m);
      var tasks = (g.tasks || []).filter(taskFilter(path)).map(function (tk) { return mkTask('tl:' + g.m + ':' + tk.id, tk); });
      return {
        m: g.m, key: 'g' + g.m, title: L(g.title), sub: g.sub ? L(g.sub) : '',
        when: relLabel(g.m), dateLabel: g.m === 0 ? fmtDateW(date) : fmtMonth(monthStart(date)),
        date: date, start: g.m === 0 ? date : monthStart(date), milestone: g.m === 0, tasks: tasks, progs: []
      };
    });
  }

  function juniorGroups(entry) {
    var Y = entry.getFullYear();
    var list = timelineOf('junior');
    var out = [], milestoneAt = -1;
    list.forEach(function (g) {
      var start, end, dateLabel;
      if (g.months && g.months.length) {
        var syStart = g.grade === 'hs1' ? Y : Y - 1;    // calendar year in which that school year starts (April)
        var m0 = g.months[0], m1 = g.months[g.months.length - 1];
        start = new Date(m0 >= 4 ? syStart : syStart + 1, m0 - 1, 1);
        end = new Date(m1 >= 4 ? syStart : syStart + 1, m1, 0);
        // 高1 periods never start before the entry day itself (keeps the order right for a late or odd date)
        if (g.grade === 'hs1' && start < entry) { start = entry; if (end < start) end = start; }
        // the data's `when` already names the months ("中3の4〜6月"), so only the year is added
        dateLabel = g.when ? (en() ? String(start.getFullYear()) : start.getFullYear() + '年') : fmtRange(start, end);
      } else {                                          // 中1・中2: any time before 中3
        start = new Date(Y - 3, 3, 1);
        end = new Date(Y - 1, 2, 31);
        dateLabel = t('plan.jr.until', { date: fmtMonth(end) });
      }
      if (g.grade === 'hs1' && milestoneAt === -1) milestoneAt = out.length;
      var tasks = (g.tasks || []).map(function (tk) { return mkTask('jr:' + g.id + ':' + tk.id, tk); });
      out.push({ id: g.id, key: 'j-' + g.id, title: L(g.title), sub: g.sub ? L(g.sub) : '', when: L(g.when), dateLabel: dateLabel,
        date: start, start: start, end: end, milestone: false, tasks: tasks, progs: [] });
    });
    var ms = { id: 'entry', key: 'j-entry', title: t('plan.jr.anchor'), sub: '', when: '', dateLabel: fmtDateW(entry),
      date: entry, start: entry, end: entry, milestone: true, tasks: [], progs: [] };
    if (milestoneAt === -1) out.push(ms); else out.splice(milestoneAt, 0, ms);
    return out;
  }

  function build(opts) {
    opts = opts || {};
    var now = opts.now || today0();
    var track = opts.track === 'junior' || opts.track === 'leaving' ? opts.track : curTrack();
    var jr = track === 'junior';
    var ai = opts.anchor ? { date: opts.anchor, assumed: false } : opts.leave && !jr ? { date: opts.leave, assumed: false } : (jr ? entryInfo() : leaveInfo());
    var anchor = ai.date;
    var groups = jr ? juniorGroups(anchor) : leavingGroups(anchor);
    var saved = (state().saved || []).map(function (id) { return SM.program(id); }).filter(Boolean);
    var base = { track: track, anchor: anchor, assumed: ai.assumed, now: now, saved: saved, leave: jr ? null : anchor, entry: jr ? anchor : null };
    if (!groups.length) { base.groups = []; base.cur = -1; base.beyond = false; base.total = 0; base.done = 0; base.due = 0; return base; }

    // saved programs → dated items, placed in the right period
    saved.forEach(function (p) {
      var d = p.deadline;
      if (!d) return;
      var item = null;
      if (typeof d.leaveMonths === 'number' && !jr) {
        var n = d.leaveMonths;
        var target = groups[0];
        groups.forEach(function (g) { if (g.m <= n) target = g; });
        item = { date: addMonths(anchor, n), open: false, label: n === 0 ? t('ui.atleave') : t('plan.tl.byDate', { date: fmtMonth(addMonths(anchor, n)) }), short: n === 0 ? t('ui.atleave') : fmtMonth(addMonths(anchor, n)), target: target };
      } else if (d.months && d.months.length) {
        var w = windowInfo(d.months, now);
        if (w && w.date) {
          var tg = groups[0];
          groups.forEach(function (g) { if ((!g.milestone || g.tasks.length) && monthStart(g.start) <= w.date) tg = g; });
          item = { date: w.date, open: w.open, label: w.open ? t('plan.tl.openNow') + '・' + t('plan.tl.open', { m: w.label }) : t('plan.tl.open', { m: w.label }), short: w.label, target: tg, window: true };
        }
      }
      if (!item) return;
      var key = 'pg:' + p.id;
      item.target.progs.push({ key: key, kind: 'prog', p: p, text: L(p.name), date: item.date, label: item.label, short: item.short, open: item.open, window: !!item.window, deadlineText: L(d), done: isDone(key) });
    });
    groups.forEach(function (g) {
      g.progs.sort(function (a, b) { return a.date - b.date; });
      g.all = g.tasks.concat(g.progs);
      g.total = g.all.length;
      g.doneN = g.all.filter(function (x) { return x.done; }).length;
    });

    // current group = last whose start is on/before today
    var cur = -1;
    groups.forEach(function (g, i) { if (g.start <= now) cur = i; });
    // the current period reads as a range (「2026年9月〜11月」), not just the month it started in
    if (!jr && cur >= 0 && !groups[cur].milestone && groups[cur + 1]) {
      var nx = groups[cur + 1].start;
      groups[cur].dateLabel = fmtRange(groups[cur].start, new Date(nx.getFullYear(), nx.getMonth(), nx.getDate() - 1));
    }
    var last = groups[groups.length - 1];
    var beyond = cur === groups.length - 1 && (jr ? daysBetween(last.end || last.date, now) > 31 : daysBetween(last.date, now) > 183);
    var total = 0, done = 0, dueN = 0;
    groups.forEach(function (g, i) { total += g.total; done += g.doneN; if (i <= cur) dueN += g.total; });
    base.groups = groups; base.cur = cur; base.beyond = beyond; base.total = total; base.done = done;
    base.dueN = dueN; base.due = total ? dueN / total : 0;
    return base;
  }

  /* ------------------------------------------------------------------ .ics */
  function icsEscape(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');
  }
  function utf8len(ch) { var c = ch.codePointAt(0); return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; }
  // RFC 5545 §3.1: lines longer than 75 octets are folded with CRLF + single space; never split a character.
  function icsFold(line) {
    var chars = Array.from(line), out = [], cur = '', n = 0, limit = 75;
    chars.forEach(function (ch) {
      var b = utf8len(ch);
      if (n + b > limit) { out.push(cur); cur = ' '; n = 1; }
      cur += ch; n += b;
    });
    out.push(cur);
    return out.join('\r\n');
  }
  function icsDate(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); }
  function icsStamp(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }
  function slug(s) { return String(s).replace(/[^A-Za-z0-9-]/g, '-'); }

  /* events: [{ uid, date:Date, summary, description, url }] → full VCALENDAR text (CRLF) */
  function buildICS(events, stampDate, opts) {
    opts = opts || {};
    var nowD = stampDate || new Date();
    var stamp = icsStamp(nowD);
    var L1 = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Economix JP//Sudachi Map 4.0//JA',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:' + icsEscape(t(opts.plain ? 'plan.ics.plainCal' : 'plan.ics.calName'))
    ];
    events.forEach(function (ev) {
      var end = new Date(ev.date.getFullYear(), ev.date.getMonth(), ev.date.getDate() + 1);
      L1.push('BEGIN:VEVENT');
      L1.push('UID:' + slug(ev.uid) + '@sudachi-map.economix.jp');
      L1.push('DTSTAMP:' + stamp);
      L1.push('DTSTART;VALUE=DATE:' + icsDate(ev.date));
      L1.push('DTEND;VALUE=DATE:' + icsDate(end));
      L1.push('SUMMARY:' + icsEscape(ev.summary));
      if (ev.description) L1.push('DESCRIPTION:' + icsEscape(ev.description));
      if (ev.url && /^https?:\/\//.test(ev.url)) L1.push('URL:' + ev.url);
      L1.push('TRANSP:TRANSPARENT');
      // reminder at 9:00 the day before; never add one that is already in the past
      var alarmAt = new Date(ev.date.getFullYear(), ev.date.getMonth(), ev.date.getDate() - 1, 9, 0);
      if (alarmAt > nowD) {
        L1.push('BEGIN:VALARM');
        L1.push('ACTION:DISPLAY');
        L1.push('DESCRIPTION:' + icsEscape(ev.summary));
        L1.push('TRIGGER:-PT15H');
        L1.push('END:VALARM');
      }
      L1.push('END:VEVENT');
    });
    L1.push('END:VCALENDAR');
    return L1.map(icsFold).join('\r\n') + '\r\n';
  }

  /* upcoming events from the plan model (either track) */
  function planEvents(model, plainOpt) {
    var now = model.now, evs = [];
    var foot = t('plan.ics.foot');
    var jr = model.track === 'junior';
    var lk = '-' + icsDate(model.anchor); // stable per anchor date, so re-importing updates instead of duplicating
    model.groups.forEach(function (g, i) {
      var open = g.tasks.filter(function (x) { return !x.done; });
      var progsOpen = g.progs.filter(function (x) { return !x.done; });
      if (g.milestone) {
        if (g.date >= now) {
          var lines0 = open.map(function (x) { return '・' + x.text; });
          evs.push({ type: 'anchor', uid: (jr ? 'hsentry' : 'leave') + lk, date: g.date, summary: t(jr ? 'plan.ics.entry' : 'plan.ics.leave'), description: lines0.concat(lines0.length ? [''] : []).concat([foot]).join('\n') });
        }
      } else if (open.length) {
        var nx = model.groups[i + 1];
        var end = nx ? nx.start : (jr && g.end ? new Date(g.end.getFullYear(), g.end.getMonth(), g.end.getDate() + 1) : null);
        if (!end || end > now) {
          var d = g.start < now ? now : g.start;
          var lines = open.map(function (x) { return '・' + x.text; });
          evs.push({ type: 'group', uid: (jr ? 'jr-' + g.id : 'tl' + g.m) + lk, date: d, summary: t('plan.ics.group', { t: g.title }), description: lines.concat(['', foot]).join('\n') });
        }
      }
      progsOpen.forEach(function (x) {
        if (x.date < now) return;
        var p = x.p, desc = [];
        if (x.deadlineText) desc.push(x.deadlineText);
        if (p.ask && p.ask.length) { desc.push(''); desc.push(t('plan.ics.ask') + '：'); p.ask.forEach(function (q) { desc.push('・' + q); }); }
        var url = (p.contact && p.contact.web) || (p.source && p.source.url) || '';
        if (url) { desc.push(''); desc.push(url); }
        desc.push(''); desc.push(foot);
        evs.push({ type: 'prog', uid: 'pg-' + p.id + lk, date: x.date, summary: t(x.window ? 'plan.ics.progOpen' : 'plan.ics.prog', { name: x.text }), description: desc.join('\n'), url: url });
      });
    });
    // an event "today" is easy to miss and its reminder is already past: start it tomorrow
    var tmr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    evs.forEach(function (ev) { if (ev.date < tmr) ev.date = tmr; });
    if (plainOpt != null ? plainOpt : icsPlain()) {
      evs.forEach(function (ev) {
        ev.summary = t(ev.type === 'anchor' ? 'plan.ics.plainLeave' : ev.type === 'prog' ? 'plan.ics.plainProg' : 'plan.ics.plainGroup');
        ev.description = t('plan.ics.plainDesc');
        ev.url = '';
      });
    }
    evs.sort(function (a, b) { return a.date - b.date; });
    return evs;
  }
  function icsPlain() { var v = SM.store.get('plan:icsPlain', true); return v !== false; }

  function isIOS() {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /* ------------------------------------------------------------------ 相談シート */
  function memo() { return SM.store.get('plan:memo', '') || ''; }

  function aboutRows(model) {
    var rows = [];
    var label = model.track === 'junior' ? t('plan.s.entry') : t('plan.s.leave');
    rows.push([label, model.assumed ? t('plan.s.leaveAssumed', { date: fmtDate(model.anchor) }) : fmtDate(model.anchor)]);
    var keys = { stage: 'plan.s.stage', path: 'plan.s.path', area: 'plan.s.area', concerns: 'plan.s.concerns', age: 'plan.s.age' };
    var sum = [];
    try { sum = SM.matchSummary ? SM.matchSummary(state().answers) : []; } catch (e) { sum = []; }
    // 'care' (これまでの暮らし) is intentionally left off the sheet: it is sensitive and others may see the paper.
    sum.forEach(function (r) { if (keys[r.key] && r.set && r.label) rows.push([t(keys[r.key]), r.label]); });
    return rows;
  }
  function upcoming(model, max) {
    var out = [];
    var from = Math.max(0, model.cur);
    model.groups.slice(from).forEach(function (g) {
      g.all.forEach(function (x) {
        if (x.done) return;
        var when = g.milestone ? fmtDate(g.date) : model.track === 'junior' && g.when ? g.when + (g.dateLabel ? '・' + g.dateLabel : '') : fmtMonth(g.start);
        out.push({ when: when, text: x.kind === 'prog' ? x.text + '（' + x.label + '）' : x.text });
      });
    });
    return out.slice(0, max || 8);
  }
  function whereOf(p) { return L(p.where) || (p.source && p.source.org) || ''; }

  function sheetText(model) {
    model = model || build();
    var o = [];
    o.push(t('plan.s.head'));
    o.push(t('plan.s.made') + '：' + fmtDate(today0()));
    o.push('');
    o.push('■ ' + t('plan.s.me'));
    aboutRows(model).forEach(function (r) { o.push(r[0] + '：' + r[1]); });
    var m = memo().trim();
    if (m) { o.push(''); o.push('■ ' + t('plan.s.memo')); o.push(m); }
    o.push('');
    o.push('■ ' + t('plan.s.progs'));
    if (!model.saved.length) o.push(t('plan.s.noProgs'));
    model.saved.forEach(function (p, i) {
      o.push('');
      o.push((i + 1) + '. ' + L(p.name));
      var w = whereOf(p); if (w) o.push('   ' + t('plan.s.where') + '：' + w);
      var dl = p.deadline ? L(p.deadline) : ''; if (dl) o.push('   ' + t('plan.s.deadline') + '：' + dl);
      var ph = p.contact && p.contact.phone; if (ph) o.push('   ' + t('plan.s.phone') + '：' + ph);
      (p.ask || []).forEach(function (q) { o.push('   ・' + q); });
    });
    var up = upcoming(model, 8);
    if (up.length) {
      o.push('');
      o.push('■ ' + t('plan.s.next'));
      up.forEach(function (x) { o.push('□ ' + x.when + '　' + x.text); });
    }
    o.push('');
    o.push(t('plan.s.foot'));
    return o.join('\n');
  }

  function brandHtml() {
    try { if (SM.brand && SM.brand.lockup) return SM.brand.lockup({ cls: 'pp-lockup' }); } catch (e) { }
    return ic('logo') + '<span>' + esc(en() ? 'Sudachi Map' : '巣立ちマップ') + '</span>';
  }
  function printHtml(model) {
    var rows = aboutRows(model);
    var m = memo().trim();
    var up = upcoming(model, 10);
    var h = '';
    h += '<header class="pp-head"><p class="pp-brand">' + brandHtml() + '</p>' +
      '<h2 class="pp-title">' + esc(t('plan.sheet.title')) + '</h2>' +
      '<p class="pp-meta">' + esc(t('plan.s.made')) + '：' + esc(fmtDate(today0())) + '</p></header>';
    h += '<section class="pp-sec"><h2>' + esc(t('plan.s.me')) + '</h2><dl class="pp-kv">' +
      rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl></section>';
    h += '<section class="pp-sec"><h2>' + esc(t('plan.s.memo')) + '</h2>' +
      (m ? '<p class="pp-memo">' + esc(m) + '</p>' : '<div class="pp-lines" aria-hidden="true"><i></i><i></i></div>') + '</section>';
    h += '<section class="pp-sec"><h2>' + esc(t('plan.s.progs')) + '</h2>' +
      (model.saved.length ? '<ol class="pp-progs">' + model.saved.map(function (p) {
        var w = whereOf(p), dl = p.deadline ? L(p.deadline) : '', ph = p.contact && p.contact.phone;
        return '<li><p class="pp-pname">' + esc(L(p.name)) + '</p>' +
          '<p class="pp-pmeta">' + (w ? '<span>' + esc(t('plan.s.where')) + '：' + esc(w) + '</span>' : '') +
          (ph ? '<span>' + esc(t('plan.s.phone')) + '：' + esc(ph) + '</span>' : '') + (dl ? '<span>' + esc(t('plan.s.deadline')) + '：' + esc(dl) + '</span>' : '') + '</p>' +
          ((p.ask || []).length ? '<ul class="pp-ask">' + p.ask.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ul>' : '') + '</li>';
      }).join('') + '</ol>' : '<p>' + esc(t('plan.s.noProgs')) + '</p>') + '</section>';
    if (up.length) {
      h += '<section class="pp-sec"><h2>' + esc(t('plan.s.next')) + '</h2><table class="pp-table"><tbody>' +
        up.map(function (x) { return '<tr><td class="pp-box">□</td><td class="pp-when">' + esc(x.when) + '</td><td>' + esc(x.text) + '</td></tr>'; }).join('') +
        '</tbody></table></section>';
    }
    h += '<section class="pp-sec"><h2>' + esc(t('plan.s.staff')) + '</h2><div class="pp-lines" aria-hidden="true"><i></i><i></i><i></i></div></section>';
    h += '<p class="pp-foot">' + esc(t('plan.s.foot')) + '</p>';
    return h;
  }
  function fillPrint() {
    var pp = document.querySelector('main.v-plan > .plan-print');
    if (pp) pp.innerHTML = printHtml(build());
  }

  /* ------------------------------------------------------------------ render pieces */
  var pastOpen = false;
  var foldOpen = {};         // later periods are folded; remember which ones the user opened
  var calm = false;          // the next render is an in-place re-render by this view (no first-view motion)
  var lastCalm = false;
  var renderGen = 0;         // deferred jobs only land in the render that queued them
  var deferred = null;       // { gen, jobs: [fn] }
  var lastModel = null;

  function countInfo(model) {
    var jr = model.track === 'junior';
    var diff = daysBetween(model.now, model.anchor);
    if (diff === 0) {
      return { today: true, k: t(jr ? 'plan.jr.count.todayK' : 'plan.count.todayK'), big: t('plan.count.todayBig'),
        sub: t(jr ? 'plan.jr.count.todaySub' : 'plan.count.todaySub') };
    }
    var n = Math.abs(diff);
    return {
      today: false, n: n, text: fmtNum(n), before: diff > 0,
      k: t(diff > 0 ? (jr ? 'plan.jr.count.k' : 'plan.count.k') : (jr ? 'plan.jr.count.kAfter' : 'plan.count.kAfter')),
      pre: diff > 0 ? t('plan.count.pre') : '',
      unit: t(n === 1 ? 'plan.count.unit1' : 'plan.count.unit')
    };
  }

  function switchHtml(ti) {
    if (!ti.showSwitch) return '';
    var items = [['junior', t('plan.track.junior')], ['leaving', t('plan.track.leaving')]];
    return '<div class="seg plan-track" role="group" aria-label="' + esc(t('plan.track.label')) + '">' + items.map(function (it) {
      var on = ti.track === it[0];
      return '<button type="button" id="plan-track-' + it[0] + '" aria-pressed="' + (on ? 'true' : 'false') + '" data-act="plan-track" data-value="' + it[0] + '">' +
        '<span>' + esc(it[1]) + '</span></button>';
    }).join('') + '</div>';
  }

  function headHtml(ti) {
    return '<header class="plan-head">' +
      '<h1 class="plan-h1" id="plan-h1" data-reveal="line">' + esc(t('plan.h1')) + '</h1>' + switchHtml(ti) + '</header>';
  }

  function progressHtml(model) {
    var pct = model.total ? model.done / model.total : 0;
    var due = model.due || 0;
    var showDue = model.total > 0 && due > 0.001 && due < 0.999;
    var vt = showDue ? t('plan.progressDue', { done: model.done, total: model.total, due: model.dueN }) : t('plan.progressOf', { done: model.done, total: model.total });
    return '<div class="plan-prog' + (showDue ? ' has-due' : '') + '" id="plan-prog" data-flip-key="ph-prog" data-reveal="" data-reveal-delay="220" style="--due:' + due.toFixed(4) + '">' +
      '<p class="plan-prog-row"><span class="plan-prog-k">' + esc(t('plan.progress')) + '</span>' +
        '<span class="plan-prog-num num"><b id="plan-prog-done" data-m="pd" data-count="' + model.done + '" data-count-seen="plan.done.' + model.track + '">' + model.done + '</b>' +
        '<span class="plan-prog-of"> / <span id="plan-prog-total" data-m="pt">' + model.total + '</span></span></span></p>' +
      '<div class="plan-prog-bar" role="progressbar" aria-label="' + esc(t('plan.progress')) + '" aria-valuemin="0" aria-valuemax="' + model.total + '" aria-valuenow="' + model.done + '" aria-valuetext="' + esc(vt) + '">' +
        '<i class="plan-prog-fill m-bar" style="transform:scaleX(' + pct.toFixed(4) + ')"></i>' +
        '<span class="plan-prog-tick" aria-hidden="true"></span></div>' +
      '<p class="plan-prog-due" aria-hidden="true"><span>' + esc(t('plan.due')) + '</span></p>' +
    '</div>';
  }

  function heroHtml(model) {
    var jr = model.track === 'junior';
    var c = countInfo(model);
    var count;
    if (c.today) {
      count = '<div class="plan-count is-today"><p class="plan-count-k" data-m="k">' + esc(c.k) + '</p>' +
        '<p class="plan-count-big"><b class="plan-count-today" id="plan-count-n" data-m="n">' + esc(c.big) + '</b></p></div>';
    } else {
      count = '<div class="plan-count' + (c.n >= 1000 ? ' is-long' : '') + '"><p class="plan-count-k" data-m="k">' + esc(c.k) + '</p>' +
        '<p class="plan-count-big">' + (c.pre ? '<span class="plan-count-pre" data-m="pre">' + esc(c.pre) + '</span>' : '') +
          '<b class="plan-count-num num" id="plan-count-n" data-m="n" data-n="' + c.n + '">' + esc(c.text) + '</b>' +
          '<span class="plan-count-unit" data-m="u">' + esc(c.unit) + '</span></p></div>';
    }
    var art = il(jr ? 'plan-jr-hero' : 'plan-hero', { size: 'spot', cls: 'plan-hero-il' + (jr ? ' is-jr' : '') }) ||
      (jr ? il('plan-hero', { size: 'spot', cls: 'plan-hero-il' }) : '');
    var what = jr ? t('plan.jr.anchor') : t('plan.leave.label');
    var note = '';
    if (model.assumed) {
      note = jr ? t('plan.jr.assumedNote', { date: fmtMonth(model.anchor), g: gradeFor(model.anchor, model.now) }) : t('plan.assumedNote', { date: fmtDate(model.anchor) }) + ' ' + t('plan.leave.def');
    } else if (jr) note = t('plan.jr.def');
    var date = '<div class="plan-date" data-flip-key="ph-date" data-reveal="" data-reveal-delay="140">' +
      '<div class="plan-date-main">' +
        '<p class="plan-date-k"><span data-m="dk">' + esc(what) + '</span>' + (model.assumed ? '<span class="tag tag-deadline plan-assumed">' + esc(t('plan.assumed')) + '</span>' : '') + '</p>' +
        '<p class="plan-date-v" data-m="dv">' + esc(fmtDateW(model.anchor)) + '</p></div>' +
      '<button type="button" class="btn btn-secondary btn-sm plan-date-edit" id="plan-date-btn" data-act="plan-date" aria-label="' + esc(t('plan.changeLabel', { what: what, date: fmtDate(model.anchor) })) + '"><span>' + esc(t('plan.change')) + '</span></button>' +
    '</div>';
    // the long explanation (仮の日付 / what 巣立ちの日 means) waits behind 「くわしく」 (SPEC-v5 Part B)
    var more = note ? (SM.ui.more ? SM.ui.more(null, '<p class="plan-date-note" data-m="note">' + esc(note) + '</p>', { inline: true, cls: 'plan-date-more' }) :
      '<p class="plan-date-note" data-m="note">' + esc(note) + '</p>') : '';
    return '<div class="plan-hero' + (art ? ' has-il' : '') + '" data-track="' + model.track + '">' + count + art +
      '<div class="plan-meta">' + (c.today ? '<p class="plan-count-sub" data-m="sub">' + esc(c.sub) + '</p>' : '') + date + more + progressHtml(model) + '</div>' +
    '</div>';
  }

  /* "いま" band: what to do right now. Variants: now · early (before the timeline) · done (this period is all
     done → plan-done) · empty (no tasks in this period → plan-empty) · late (after the timeline) · all (everything) */
  function bandVariant(model) {
    var g = model.groups, cur = model.cur;
    if (!g.length) return 'none';
    if (model.total && model.done === model.total) return 'all';
    if (model.beyond) return 'late';
    if (cur === -1) return 'early';
    var c = g[cur];
    if (!c.total) return 'empty';
    if (c.doneN === c.total) return 'done';
    return 'now';
  }
  function nextAfter(model) {
    var g = model.groups;
    for (var i = Math.max(0, model.cur + 1); i < g.length; i++) if (g[i].total || g[i].milestone) return g[i];
    return null;
  }
  function fromLabel(g) { return t('plan.now.from', { date: g.milestone ? fmtDate(g.date) : fmtMonth(g.start) }); }
  function nowHtml(model) {
    var v = bandVariant(model);
    if (v === 'none') return '';
    var jr = model.track === 'junior';
    var g = model.groups, cur = model.cur, c = cur >= 0 ? g[cur] : null;
    var nx = nextAfter(model);
    var art = '', kHtml = '', title = '', body = '', btn = '';
    var tag = '<span class="plan-now-tag">' + esc(t('plan.now.k')) + '</span>';
    // "done" pictures: the leaving track shows the new door (plan-done); a 中学生's period is study, not moving
    // out, so theirs is the booklet held up with the green seal (learn-done)
    var doneArt = jr && SM.illus && SM.illus.has && SM.illus.has('learn-done') ? 'learn-done' : 'plan-done';
    var jump = function (target, label) {
      return SM.ui.button(label, { act: 'plan-jump', variant: 'ink', block: true, arrow: 'down', cls: 'plan-jump', attrs: 'data-target="' + esc(target) + '"' });
    };
    if (v === 'now') {
      var left = c.total - c.doneN;
      kHtml = tag + '<span class="plan-now-when">' + esc([c.when, c.dateLabel].filter(Boolean).join('・')) + '</span>';
      title = SM.ui.marker(c.title);
      // 「のこり 3こ（全3こ）」 / "3 of 3 left": the unit stays with its number, the total reads as a quiet aside
      var nOf = '<span class="plan-now-of num">' + esc(t('plan.now.of', { n: c.total })) + '</span>';
      body = '<p class="plan-now-left" id="plan-now-left">' + (t('plan.now.left') ? '<span>' + esc(t('plan.now.left')) + '</span>' : '') +
        '<b class="plan-now-n num">' + left + '</b>' + (en() ? nOf + '<span>' + esc(t('plan.now.unit')) + '</span>' : '<span>' + esc(t('plan.now.unit')) + '</span>' + nOf) + '</p>';
      btn = jump('tl-' + c.key, t('plan.now.jump'));
    } else if (v === 'early') {
      // the reassurance is a sentence, so it reads as text (meta), not as a label beside the tag
      var first = g[0];
      kHtml = tag;
      title = '<span class="plan-now-next">' + esc(t('plan.now.next')) + '</span>' + SM.ui.marker(first.title);
      body = '<p class="plan-now-from">' + esc(fromLabel(first)) + '</p>';
      btn = jump('tl-' + first.key, t('plan.now.jumpNext'));
    } else if (v === 'done' || v === 'empty') {
      art = il(v === 'done' ? doneArt : 'plan-empty', { size: 'spot', cls: 'plan-now-il' });
      kHtml = tag + '<span class="plan-now-when">' + esc([c.when, c.dateLabel].filter(Boolean).join('・')) + '</span>';
      title = esc(t(v === 'done' ? 'plan.now.doneT' : 'plan.now.emptyT'));
      body = v === 'empty' && t('plan.now.emptyB') ? '<p class="plan-now-meta">' + esc(t('plan.now.emptyB')) + '</p>' : '';
      if (nx) body += '<p class="plan-now-meta plan-now-nx"><b>' + esc(t('plan.now.next')) + '</b><span>' + esc(nx.title) + '（' + esc(fromLabel(nx)) + '）</span></p>';
      btn = nx ? jump('tl-' + nx.key, t('plan.now.jumpNext')) : jump('tl-' + c.key, t('plan.now.jump'));
    } else if (v === 'late') {
      art = il('plan-empty', { size: 'spot', cls: 'plan-now-il' });
      kHtml = tag;
      title = esc(t(jr ? 'plan.now.jrLateT' : 'plan.now.lateT'));
      body = '<p class="plan-now-meta">' + esc(t(jr ? 'plan.jr.nowLate' : 'plan.now.lateB')) + '</p>';
      btn = SM.ui.button(t('plan.now.consult'), { href: '#/find/cat/consult', variant: 'ink', block: true, cls: 'plan-jump' });
    } else {   // all
      art = il(doneArt, { size: 'spot', cls: 'plan-now-il' });
      title = esc(t('plan.all.t'));
      body = '<p class="plan-now-meta">' + esc(t('plan.all.b')) + '</p>';
      btn = SM.ui.button(t('plan.now.consult'), { href: '#/find/cat/consult', variant: 'text', cls: 'plan-now-link' });
    }
    return '<section class="plan-now is-' + v + (art ? ' has-il' : '') + '" id="plan-now" data-v="' + v + '" aria-labelledby="plan-now-h" data-reveal="" data-reveal-delay="300">' + art +
      '<div class="plan-now-text">' +
        (kHtml ? '<p class="plan-now-k">' + kHtml + '</p>' : '') +
        '<h2 class="plan-now-title" id="plan-now-h">' + title + '</h2>' + body + '</div>' + btn +
    '</section>';
  }

  function toolsHtml() {
    var row = function (act, icon, title, sub) {
      return SM.ui.listItem({ title: title, sub: sub, icon: icon, act: act, attrs: 'data-press="ink"' });
    };
    return '<div class="list plan-tools">' +
      row('plan-ics', 'calendar', t('plan.act.ics'), null) +
      row('plan-sheet', 'print', t('plan.act.sheet'), null) +
      '</div>';
  }

  function savedRowHtml(p) {
    var name = L(p.name);
    return '<div class="plan-saved-item" data-flip-key="' + esc(p.id) + '">' + SM.ui.programCard(p, { compact: true, showSave: false }) +
      '<button type="button" class="plan-remove" data-act="plan-remove" data-id="' + esc(p.id) + '" aria-label="' + esc(t('plan.saved.removeLabel', { name: name })) + '" title="' + esc(t('plan.saved.remove')) + '">' + ic('close') + '</button></div>';
  }
  /* later: the picture is put in after the transition (phone: this block is below the first screen) */
  function savedEmptyHtml(later) {
    var answered = state().answered;
    var action = SM.ui.button(answered ? t('plan.empty.results') : t('plan.empty.find'), { href: answered ? '#/find/results' : '#/find', variant: 'primary' });
    return '<div class="plan-saved-empty"' + (later ? ' data-il-later="saved-empty"' : '') + '>' +
      SM.ui.empty(t('plan.empty.title'), t('plan.empty.body'), action, later ? null : { illus: 'saved-empty' }) + '</div>';
  }
  function fillLaterArt(root) {
    var box = root && root.querySelector('.plan-saved-empty[data-il-later]');
    var em = box && box.querySelector(':scope > .empty');
    if (!box) return;
    var name = box.getAttribute('data-il-later');
    box.removeAttribute('data-il-later');
    var art = em ? il(name, { size: 'spot', cls: 'empty-il' }) : '';
    if (!art) return;
    em.insertAdjacentHTML('afterbegin', art);
    em.classList.add('has-il');
    if (M() && M().mount) M().mount(em, { instant: !!(SM.route && SM.route.instant) });
  }
  /* the count in the sub line is its own element, so it can roll when a support is removed or put back */
  function savedHeadHtml(model) {
    var n = model.saved.length;
    return SM.ui.sectionHeader(t('plan.saved.h'), {
      sub: n ? t('plan.saved.sub', { n: '\u0001' }) : null,
      action: n ? { label: t('plan.saved.more'), href: state().answered ? '#/find/results' : '#/find' } : null,
      id: 'plan-saved-h'
    }).replace('\u0001', '<span class="plan-saved-n num">' + n + '</span>');
  }
  /* first: how many rows go in now (the rest is appended after the transition) */
  function savedHtml(model, first) {
    var body;
    if (!model.saved.length) body = savedEmptyHtml(first === 0);
    else {
      var n = first == null ? model.saved.length : Math.min(first, model.saved.length);
      body = '<div class="pcards plan-saved-list" data-reveal-stagger="40">' + model.saved.slice(0, n).map(savedRowHtml).join('') + '</div>';
    }
    return '<section class="plan-saved" id="plan-saved" aria-labelledby="plan-saved-h">' + savedHeadHtml(model) + body + '</section>';
  }

  /* ------------------------------------------------------------------ timeline */
  /* one line per task: the action reads first, a trailing （…） aside (dates, amounts, where) follows in small type,
     so the row scans as a to-do and the fact stays on the page */
  function taskText(text) {
    var m = /^(.+?)\s*([（(][^（()）]*[)）])\s*$/.exec(text || '');
    if (!m || m[1].length < 6) return '<span class="tl-item-main">' + esc(text) + '</span>';
    return '<span class="tl-item-main">' + esc(m[1]) + '</span><span class="tl-item-aside">' + esc(m[2]) + '</span>';
  }
  function itemId(key) { return 'pt-' + key.replace(/[^A-Za-z0-9-]/g, '_'); }
  function itemHtml(x, i) {
    var id = itemId(x.key);
    var check = '<input type="checkbox" class="tl-check" id="' + id + '" data-act="plan-done" data-key="' + esc(x.key) + '"' + (x.done ? ' checked' : '') +
      (x.kind === 'prog' ? ' aria-describedby="' + id + '-d"' : '') + '>' +
      '<span class="tl-box" aria-hidden="true">' + ic('check') + '</span>';
    // the 済 seal floats at the end of the first line, so the lines under it use the full width
    var seal = '<span class="tl-seal" aria-hidden="true">' + esc(t('plan.tl.seal')) + '</span>';
    var open = '<li class="tl-item' + (x.kind === 'prog' ? ' tl-item-prog' : '') + (x.done ? ' is-done' : '') + '" data-flip-key="' + esc(x.key) + '" data-i="' + i + '">';
    if (x.kind === 'prog') {
      return open +
        '<label class="tl-task" for="' + id + '">' + check +
          '<span class="tl-item-text">' + seal + '<span class="tl-saved-k">' + esc(t('plan.tl.saved')) + '</span>' + esc(x.text) + '</span></label>' +
        '<p class="tl-item-meta" id="' + id + '-d">' +
          '<span class="tl-fact' + (x.open ? ' is-open' : '') + '"><span class="tl-fact-k">' + esc(x.window ? t('plan.tl.applyK') : t('plan.tl.untilK')) + '</span>' +
          '<span class="tl-fact-v">' + esc(x.window ? x.short : x.label) + (x.open ? '<b class="tl-open-now">' + esc(t('plan.tl.openNow')) + '</b>' : '') + '</span></span>' +
          '<a class="tl-link" href="#/p/' + encodeURIComponent(x.p.id) + '"><span>' + esc(t('plan.tl.detail')) + '</span>' + arrow() + '</a></p>' +
        '</li>';
    }
    return open +
      '<label class="tl-task" for="' + id + '">' + check + '<span class="tl-item-text">' + seal + taskText(x.text) + '</span></label>' +
      (x.href ? '<p class="tl-item-meta"><a class="tl-link" href="' + esc(x.href) + '"><span>' + esc(x.hrefLabel || t('plan.tl.tool')) + '</span>' + arrow() + '</a></p>' : '') +
      '</li>';
  }
  /* done rows sit at the end of their list (in their original order) */
  function itemsHtml(all) {
    var rows = all.map(function (x, i) { return { x: x, i: i }; });
    rows.sort(function (a, b) { return ((a.x.done ? 1 : 0) - (b.x.done ? 1 : 0)) || (a.i - b.i); });
    return rows.map(function (r) { return itemHtml(r.x, r.i); }).join('');
  }

  function relatedHtml(g) {
    var ids = [];
    g.tasks.forEach(function (x) { x.p.forEach(function (id) { if (ids.indexOf(id) === -1 && SM.program(id)) ids.push(id); }); });
    var seenNames = {};
    ids = ids.filter(function (id) {
      if (g.progs.some(function (x) { return x.p.id === id; })) return false;
      var nm = L(SM.program(id).name).replace(/[（(].*$/, '');
      if (seenNames[nm]) return false;
      seenNames[nm] = true; return true;
    }).slice(0, 4);
    if (!ids.length) return '';
    return '<details class="tl-related"><summary class="tl-related-k">' + esc(t('plan.tl.relatedN', { n: ids.length })) + '</summary><ul class="tl-related-links">' +
      ids.map(function (id) {
        var p = SM.program(id);
        var nm = L(p.name).replace(/[（(].*$/, '');
        var cat = (p.cat && p.cat[0]) || 'procedures';
        return '<li><a class="tl-rel-link" href="#/p/' + encodeURIComponent(id) + '">' + SM.ui.catIcon(cat, 'xs') + '<span>' + esc(nm) + '</span></a></li>';
      }).join('') + '</ul></details>';
  }

  var TOGGLE = '<span class="tl-toggle" aria-hidden="true"></span>';
  function countHtml(g) {
    if (!g.total) return '';
    return '<span class="tl-count num" data-gcount="' + g.key + '" aria-label="' + esc(t('plan.progress') + ' ' + t('plan.progressOf', { done: g.doneN, total: g.total })) + '">' +
      '<b class="tl-count-n">' + g.doneN + '</b><span class="tl-count-of">/' + g.total + '</span></span>';
  }
  function groupHtml(g, cls, fold, delay) {
    var allDone = g.total > 0 && g.doneN === g.total;
    var isCur = cls.indexOf('is-current') !== -1;
    // tag + period + date wrap together in column 1; the n/total count always holds column 2 of the first line
    var whenHtml = '<p class="tl-when" data-noruby><span class="tl-when-l">' +
      (isCur ? '<span class="tl-now">' + esc(t('plan.tl.now')) + '</span>' : '') +
      (g.when ? '<span class="tl-rel">' + esc(g.when) + '</span>' : '') +
      '<span class="tl-date">' + esc(g.dateLabel) + '</span></span>' + countHtml(g) + '</p>';
    var titleHtml = '<h3 class="tl-title">' + esc(g.title) + '</h3>';
    // one line per task; the period's kind sub-line is dropped (SPEC-v5: no repeated reassurance)
    var bodyHtml = (g.all.length ? '<ul class="tl-items" data-reveal-stagger="50">' + itemsHtml(g.all) + '</ul>' : '') +
      relatedHtml(g);
    var inner = fold ?
      '<details class="tl-fold" data-fold="' + esc(g.key) + '"' + (foldOpen[g.key] ? ' open' : '') + '>' +
        '<summary class="tl-fold-sum" data-act="plan-fold"><span class="tl-fold-head">' + whenHtml + titleHtml + '</span>' + TOGGLE + '</summary>' +
        '<div class="tl-fold-body">' + bodyHtml + '</div></details>' :
      whenHtml + titleHtml + bodyHtml;
    return '<li class="tl-group ' + cls + (fold ? ' is-folded' : '') + (allDone ? ' is-complete' : '') + (g.milestone ? ' is-milestone' : '') + '" id="tl-' + g.key + '" data-group="' + g.key + '">' +
      '<span class="tl-mk" aria-hidden="true" data-reveal="mark"' + (delay ? ' data-reveal-delay="' + delay + '"' : '') + '></span>' +
      '<div class="tl-body" data-reveal=""' + (delay ? ' data-reveal-delay="' + (delay + 60) + '"' : '') + '>' + inner + '</div></li>';
  }

  /* tasks still open in the periods already behind us. A 中3 opening this for the first time never had the
     中1・中2 period in front of them, so it is not counted for them (it stays listed, as reading). */
  function pastLeft(model, pastEnd) {
    var skipJ12 = model.track === 'junior' && answers().stage === 'jhs3';
    var n = 0;
    for (var i = 0; i < pastEnd; i++) {
      var g = model.groups[i];
      if (skipJ12 && g.id === 'j12') continue;
      n += g.total - g.doneN;
    }
    return n;
  }
  /* the top-level <li>s of the timeline, in order */
  function tlItems(model) {
    var g = model.groups, out = [];
    if (!g.length) return out;
    var jr = model.track === 'junior';
    var cur = model.cur;
    var pastEnd = model.beyond ? g.length : cur; // groups [0, pastEnd) are collapsed
    var k = 0;
    var dl = function () { var d = Math.min(k, 4) * 50; k++; return d; };
    if (pastEnd > 0) {
      var left = pastLeft(model, pastEnd);
      out.push('<li class="tl-past-wrap is-past" id="tl-past-li">' +
        '<span class="tl-mk" aria-hidden="true"></span>' +
        '<details class="tl-past" id="tl-past"' + (pastOpen ? ' open' : '') + '>' +
        '<summary class="tl-past-sum" data-act="plan-fold"><span class="tl-past-head"><span class="tl-past-title">' + esc(t('plan.tl.past', { n: pastEnd })) + '</span>' +
        '<span class="tl-past-left' + (left ? '' : ' is-zero') + '">' + esc(left ? t('plan.tl.pastLeft', { n: left }) : t('plan.tl.pastAll')) + '</span></span>' + TOGGLE + '</summary>' +
        '<div class="tl-past-body"><p class="tl-past-note">' + esc(t('plan.tl.pastNote')) + '</p>' +
        '<ol class="tl tl-inner">' + g.slice(0, pastEnd).map(function (x) { return groupHtml(x, 'is-past'); }).join('') + '</ol></div>' +
        '</details></li>');
      k++;
    }
    if (cur === -1) {
      out.push('<li class="tl-now-only is-current"><span class="tl-mk" aria-hidden="true"></span>' +
        '<div class="tl-body" data-reveal=""><p class="tl-when" data-noruby><span class="tl-when-l"><span class="tl-now">' + esc(t('plan.tl.now')) + '</span><span class="tl-date">' + esc(fmtDate(model.now)) + '</span></span></p>' +
        '<p class="tl-now-text">' + esc(t(jr ? 'plan.jr.nowEarly' : 'plan.tl.nowEarly')) + '</p></div></li>');
      k++;
    }
    // expanded: いま + the next period (and the milestone itself); everything later is folded to a header row
    var openUntil = Math.max(pastEnd, cur) + 1;
    for (var j = Math.max(pastEnd, 0); j < g.length; j++) {
      var cls = j === cur ? 'is-current' : 'is-future';
      out.push(groupHtml(g[j], cls, j > openUntil && !g[j].milestone, dl()));
    }
    if (model.beyond) {
      out.push('<li class="tl-now-only is-current is-end"><span class="tl-mk" aria-hidden="true"></span>' +
        '<div class="tl-body" data-reveal=""><p class="tl-when" data-noruby><span class="tl-when-l"><span class="tl-now">' + esc(t('plan.tl.now')) + '</span><span class="tl-date">' + esc(fmtDate(model.now)) + '</span></span></p>' +
        '<p class="tl-now-text">' + esc(t(jr ? 'plan.jr.nowLate' : 'plan.tl.nowLate')) + '</p></div></li>');
    }
    return out;
  }
  function tlHeadHtml(model) {
    var jr = model.track === 'junior';
    return SM.ui.sectionHeader(t(jr ? 'plan.jr.tl.h' : 'plan.tl.h'), { id: 'plan-tl-h' });
  }
  /* items: the <li> strings to put in now */
  function timelineHtml(model, items) {
    if (!model.groups.length) return '';
    var jr = model.track === 'junior';
    return '<section class="plan-tl" id="plan-tl" aria-labelledby="plan-tl-h">' + tlHeadHtml(model) +
      '<div class="tl-wrap"><span class="tl-fill" aria-hidden="true"><i></i></span><span class="tl-trace" aria-hidden="true"></span>' +
      '<ol class="tl" data-track="' + model.track + '">' + items.join('') + '</ol></div>' +
      '<p class="plan-note">' + esc(t(jr ? 'plan.jr.note' : 'plan.tl.note')) + '</p></section>';
  }

  /* the body under the hero: [いま band, tools, 01 saved] + 02 timeline. opts.full renders everything now. */
  function bodyParts(model, full) {
    var desk = wide();
    // phone: the whole timeline comes after the transition, so even its HTML is built then (a thunk)
    var lazy = !full && !desk && model.groups.length > 0;
    var items = lazy ? [] : tlItems(model);
    // desktop: the first two stations (すぎた時期 + いま, or いま + the next) fill the first screen of the right column
    var nowN = full ? items.length : desk ? Math.min(items.length, 2) : 0;
    // phone: the saved rows sit below the first screen, so they come with the timeline right after the entrance
    var savedN = full ? null : desk ? 3 : 0;
    var html = '<div class="plan-body" data-flip-key="ph-body">' +
      // 保存した支援 first (it is the content; the calendar / 相談シート tools serve it), so the left column's
      // first heading sits level with the timeline's on the desktop
      '<div class="plan-flow">' + nowHtml(model) + savedHtml(model, savedN) + toolsHtml() + '</div>' +
      timelineHtml(model, items.slice(0, nowN)) +
    '</div>';
    return { html: html, restItems: lazy ? function () { return tlItems(model); } : items.slice(nowN), restSaved: full ? [] : model.saved.slice(savedN) };
  }

  /* ------------------------------------------------------------------ view */
  function render() {
    renderGen++;
    var ti = trackInfo();
    var model = build({ track: ti.track });
    lastModel = model;
    var main = document.getElementById('view');
    var route = SM.route || {};
    // in place (SM.render on this page, a sheet's change, settings): everything now, so scroll restores onto
    // real content. Same for a back navigation that restores below the first screen, and for ?now=1.
    var inPlace = !!(main && main.classList.contains('v-plan') && main.querySelector('.plan-hero'));
    var deep = route.kind === 'back' && route.restoreY > (window.innerHeight || 800) * 0.5;
    var full = calm || inPlace || deep || (route.query && route.query.now === '1') || !M() || typeof M().afterTransition !== 'function';
    var parts = bodyParts(model, full);
    var gen = renderGen;
    var restN = typeof parts.restItems === 'function' ? 1 : parts.restItems.length;
    deferred = (restN || parts.restSaved.length || !model.saved.length) ? { gen: gen, items: parts.restItems, saved: parts.restSaved, done: false } : null;
    lastCalm = calm || inPlace;
    calm = false;
    return headHtml(ti) + heroHtml(model) + parts.html + '<div class="plan-print" aria-hidden="true"></div>';
  }

  /* append what render() left for later (inside the containers it rendered, same order and headings) */
  function runDeferred(root) {
    var d = deferred;
    if (!d || d.done || d.gen !== renderGen) return;
    d.done = true;
    deferred = null;
    root = root || view();
    if (!root || !isPlanRoute()) return;
    var instant = !!(SM.route && SM.route.instant);
    if (d.saved.length) {
      var list = root.querySelector('.plan-saved-list');
      if (list) {
        var tmp = document.createElement('div');
        tmp.innerHTML = d.saved.map(savedRowHtml).join('');
        applyRuby(tmp);
        while (tmp.firstChild) list.appendChild(tmp.firstChild);
        if (M() && M().mount) M().mount(list, { instant: instant });
      }
    }
    fillLaterArt(root);
    var items = typeof d.items === 'function' ? d.items() : d.items;
    if (items.length) {
      var ol = root.querySelector('.tl-wrap > ol.tl');
      if (ol) {
        var tmp2 = document.createElement('ol');
        tmp2.innerHTML = items.join('');
        applyRuby(tmp2);
        while (tmp2.firstChild) ol.appendChild(tmp2.firstChild);
        if (M() && M().mount) M().mount(ol, { instant: instant });
      }
    }
  }
  function flushDeferred() { if (deferred) runDeferred(); }

  var nowScrolled = false;
  window.addEventListener('hashchange', function () { nowScrolled = false; });

  function mount(root) {
    var model = lastModel || build();
    var gen = renderGen;
    var route = SM.route || {};
    var m = M();
    var first = !route.instant && !lastCalm;
    // the countdown: digits roll in from blank on the first view, later only when N changed since the last visit
    var num = root.querySelector('#plan-count-n[data-n]');
    if (num && m && m.seen) {
      var n = +num.getAttribute('data-n');
      var key = 'plan.days.' + model.track;
      var prev = m.seen(key, n);
      if (first && m.odometer) {
        var to = num.textContent;
        // v5: the station-board roll plays on EVERY arrival (from blank; from the old N when it changed since the
        // last visit), long enough to be seen on a phone. Not from '0': the ones column would pass 1, 2, 3 and
        // settle through a legible '163日' while the others had landed. Reduced motion: the number fades in.
        var from = typeof prev === 'number' && isFinite(prev) && prev !== n ? fmtNum(prev) : '';
        if (reduced()) anim(num, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' });
        else m.odometer(num, to, { from: from, duration: 960, delay: 80 });
      }
    }
    // progress bar: grows from where it was at the last visit (data-count-seen on the number shares the key)
    var fill = root.querySelector('.plan-prog-fill');
    if (fill && m && m.seen && first && canAnim() && model.total) {
      var prevDone = m.seen('plan.done.' + model.track);
      var pd = typeof prevDone === 'number' && prevDone !== model.done ? prevDone : 0;
      var a = Math.min(1, pd / model.total), b = model.done / model.total;
      if (b > a) anim(fill, [{ transform: 'scaleX(' + a + ')' }, { transform: 'scaleX(' + b + ')' }], { duration: 760, delay: 380, easing: EASE('draw'), fill: 'backwards' });
    }
    var toNow = !nowScrolled && !!(route.query && route.query.now === '1');
    if (toNow) nowScrolled = true;
    var after = function () {
      if (gen !== renderGen || !root.isConnected || !isPlanRoute()) return;
      runDeferred(root);
      if (toNow) {
        var c = root.querySelector('.tl > .tl-group.is-current, .tl > .is-current');
        if (c) try { c.scrollIntoView({ block: 'start' }); } catch (e) { }
      }
      wireFill(root, { entrance: first });
    };
    if (m && m.afterTransition) m.afterTransition(after, { keep: true });
    else setTimeout(after, 0);
  }

  SM.views.plan = {
    tab: 'plan',
    title: { ja: 'やること', en: 'My plan' },
    render: render,
    mount: mount,
    onSave: function () { calm = true; SM.render(); }
  };

  /* ------------------------------------------------------------------ the green line (scroll-linked) */
  var fillCtl = null, traceCtl = null;
  function topIn(el, anc) {
    var y = 0, n = el;
    while (n && n !== anc) { y += n.offsetTop; n = n.offsetParent; }
    return n === anc ? y : NaN;
  }
  function mkCenter(li, wrap) {
    var mk = li && li.querySelector(':scope > .tl-mk');
    if (!mk) return NaN;
    return topIn(mk, wrap) + mk.offsetHeight / 2;
  }
  /* The fill runs from the first station to いま. Its tip follows a reading line at 65% of the viewport:
     range 'cover A%' → 'cover B%' of its own view() timeline (readRange). */
  /* the view() range that puts the tip of an H-tall line on the reading line (65% of the viewport). A CSS view()
     timeline insets the scrollport by the root's scroll-padding (the app bar); the JS fallback does not. */
  var SDA = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline', 'view()');
  function readRange(H) {
    var vh = window.innerHeight || 800, pad = 0;
    if (SDA) { try { pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0; } catch (e) { } }
    var span = vh - pad + H;
    var A = 0.35 * vh / span * 100, B = (0.35 * vh + H) / span * 100;
    return ['cover ' + A.toFixed(3) + '%', 'cover ' + Math.min(100, B).toFixed(3) + '%'];
  }
  /* desktop: the left column (tools, saved) stays in view beside the long timeline, but only when it fits in the
     window; a taller one scrolls with the page (a sticky column whose foot can't be reached is worse) */
  function syncStick(root) {
    var body = root && root.querySelector('.plan-body');
    var flow = body && body.querySelector(':scope > .plan-flow');
    if (!flow) return;
    var on = false;
    // --sticky-top = app bar 56 + 24; plus 24 below so the last row never touches the window edge
    if (wide() && body.querySelector(':scope > .plan-tl')) on = flow.offsetHeight + 104 <= (window.innerHeight || 800);
    body.classList.toggle('is-stick', on);
  }
  function wireFill(root, o) {
    o = o || {};
    root = root || view();
    if (!root) return;
    syncStick(root);
    var wrap = root.querySelector('.tl-wrap');
    var fill = wrap && wrap.querySelector(':scope > .tl-fill');
    var ol = wrap && wrap.querySelector(':scope > ol.tl');
    if (fillCtl) { try { fillCtl.destroy(); } catch (e) { } fillCtl = null; }
    if (ol) wireTrace(wrap, ol);
    if (!fill || !ol) return;
    var firstLi = ol.firstElementChild;
    var curLi = ol.querySelector(':scope > li.is-current');
    var inner = fill.firstElementChild;
    var oldH = fill._h || 0;
    if (!firstLi || !curLi || firstLi === curLi) { fill.style.display = 'none'; fill._h = 0; return; }
    var y0 = mkCenter(firstLi, wrap), y1 = mkCenter(curLi, wrap);
    if (!isFinite(y0) || !isFinite(y1) || y1 - y0 < 2) { fill.style.display = 'none'; fill._h = 0; return; }
    var H = y1 - y0;
    fill.style.display = '';
    fill.style.top = y0 + 'px';
    fill.style.height = H + 'px';
    fill._h = H;
    var m = M();
    if (!m || !m.scrollLinked) { fill.style.transform = 'none'; return; }
    var vh = window.innerHeight || 800;
    fill.style.transformOrigin = 'center top';
    fillCtl = m.scrollLinked(fill, { prop: 'scaleY', from: 0, to: 1, range: readRange(H) });
    if (!inner || !canAnim()) return;
    if (o.from != null && oldH && Math.abs(oldH - H) > 1) {
      // a fold opened or closed above いま: the line follows the stations as they slide
      anim(inner, [{ transform: 'scaleY(' + (oldH / H) + ')' }, { transform: 'none' }], { spring: 'smooth', maxDuration: 400, key: 'tlfill' });
    } else if (o.entrance) {
      // already past the reading line when it arrives (desktop: the timeline is on the first screen): draw it once
      var r = wrap.getBoundingClientRect();
      if (r.top + y1 < vh * 0.65 && r.top + y1 > 0) {
        inner.style.transformOrigin = 'center top';
        anim(inner, [{ transform: 'scaleY(0)' }, { transform: 'none' }], { duration: 560, delay: 120, easing: EASE('draw'), fill: 'backwards', key: 'tlfill' });
      }
    }
  }
  /* The road ahead: an ink line over the pale rule, from いま (or the first station) to the last one, drawn by the
     same reading line as the reader scrolls. Motion only: without it (reduced, lite) the pale rule stays as it is. */
  function wireTrace(wrap, ol) {
    var tr = wrap.querySelector(':scope > .tl-trace');
    if (traceCtl) { try { traceCtl.destroy(); } catch (e) { } traceCtl = null; }
    if (!tr) return;
    var m = M();
    var lis = ol.children;
    var startLi = ol.querySelector(':scope > li.is-current') || lis[0];
    var lastLi = lis[lis.length - 1];
    if (!m || !m.scrollLinked || !canAnim() || (m.tier && m.tier() !== 'full') || !startLi || !lastLi || startLi === lastLi) { tr.style.display = 'none'; return; }
    var y0 = mkCenter(startLi, wrap), y1 = mkCenter(lastLi, wrap);
    if (!isFinite(y0) || !isFinite(y1) || y1 - y0 < 24) { tr.style.display = 'none'; return; }
    var H = y1 - y0;
    tr.style.display = 'block';
    tr.style.top = y0 + 'px';
    tr.style.height = H + 'px';
    traceCtl = m.scrollLinked(tr, { prop: 'scaleY', from: 0, to: 1, range: readRange(H) });
  }
  var resizeT = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { if (view() && isPlanRoute()) wireFill(view()); }, 160);
  });
  window.addEventListener('beforeprint', function () { if (view()) { flushDeferred(); fillPrint(); } });

  /* ------------------------------------------------------------------ counts (in place) */
  // vis: whether it is laid out (read by the caller BEFORE any write, so a refresh costs one layout, not one per number)
  function rollNum(el, n, vis) {
    if (!el) return;
    var txt = fmtNum(n);
    var shown = el._smOdoShown != null ? el._smOdoShown : el.textContent;
    if (shown === txt && !el.firstElementChild) return;
    var m = M();
    if (vis == null) vis = el.offsetParent !== null;
    if (m && m.odometer && vis) m.odometer(el, txt, { from: shown, duration: 420 });
    else { el._smOdoShown = txt; el.textContent = txt; }
  }
  /* a tap answers first: the box fills and the check draws in the next frame; counts, progress and the band follow
     one painted frame later (their DOM work would otherwise sit between the tap and the first feedback) */
  var countsQ = false;
  function afterPaint(fn) {
    var go = function () { setTimeout(fn, 0); };
    if (window.requestAnimationFrame) requestAnimationFrame(go); else setTimeout(fn, 16);
  }
  function refreshSoon() {
    if (countsQ) return;
    countsQ = true;
    afterPaint(function () { countsQ = false; if (view()) refreshCounts(); });
  }
  function refreshCounts(model) {
    model = model || build();
    lastModel = model;
    var root = view();
    if (!root) return model;
    var m = M();
    // reads first (one layout). Inside a closed <details> fold nothing is shown: answered without a read, since a
    // layout read there unlocks and lays out the whole folded period (about 90ms on a slow phone)
    var vis = function (el) {
      if (!el) return false;
      var d = el.closest('details:not([open])'), s = d && el.closest('summary');
      if (d && !(s && s.parentNode === d)) return false;
      return el.offsetParent !== null;
    };
    var eDone = root.querySelector('#plan-prog-done'), eTotal = root.querySelector('#plan-prog-total');
    var nlEl = root.querySelector('.plan-now-n');
    var gEls = model.groups.map(function (g) {
      var el = root.querySelector('[data-gcount="' + g.key + '"]');
      var n = el && el.querySelector('.tl-count-n');
      return { el: el, n: n, v: vis(n) };
    });
    var vDone = vis(eDone), vTotal = vis(eTotal), vNl = vis(nlEl);
    if (m && m.seen) m.seen('plan.done.' + model.track, model.done);
    rollNum(eDone, model.done, vDone);
    rollNum(eTotal, model.total, vTotal);
    var prog = root.querySelector('#plan-prog');
    if (prog) {
      var due = model.due || 0;
      var showDue = model.total > 0 && due > 0.001 && due < 0.999;
      prog.style.setProperty('--due', due.toFixed(4));
      prog.classList.toggle('has-due', showDue);
      var bar = prog.querySelector('.plan-prog-bar');
      if (bar) {
        bar.setAttribute('aria-valuenow', model.done);
        bar.setAttribute('aria-valuemax', model.total);
        bar.setAttribute('aria-valuetext', showDue ? t('plan.progressDue', { done: model.done, total: model.total, due: model.dueN }) : t('plan.progressOf', { done: model.done, total: model.total }));
        var f = bar.querySelector('.plan-prog-fill');
        if (f) f.style.transform = 'scaleX(' + (model.total ? model.done / model.total : 0).toFixed(4) + ')';
      }
    }
    model.groups.forEach(function (g, gi) {
      var el = gEls[gi].el;
      var li = document.getElementById('tl-' + g.key);
      if (el) {
        rollNum(gEls[gi].n, g.doneN, gEls[gi].v);
        var of = el.querySelector('.tl-count-of');
        // writes only what changed: a text node replaced with the same text still restyles the whole page
        if (of && of.textContent !== '/' + g.total) of.textContent = '/' + g.total;
        var al = t('plan.progress') + ' ' + t('plan.progressOf', { done: g.doneN, total: g.total });
        if (el.getAttribute('aria-label') !== al) el.setAttribute('aria-label', al);
      }
      var cmp = g.total > 0 && g.doneN === g.total;
      if (li && li.classList.contains('is-complete') !== cmp) li.classList.toggle('is-complete', cmp);
    });
    var nl = nlEl;
    if (nl && model.cur >= 0 && model.groups[model.cur]) {
      var c = model.groups[model.cur];
      rollNum(nl, c.total - c.doneN, vNl);
      var nof = root.querySelector('.plan-now-of');
      var nofT = t('plan.now.of', { n: c.total });
      if (nof && nof.textContent !== nofT) nof.textContent = nofT;
    }
    var sum = root.querySelector('.tl-past-left');
    if (sum) {
      var pastEnd = model.beyond ? model.groups.length : model.cur;
      var lf = pastLeft(model, pastEnd);
      var txt = lf ? t('plan.tl.pastLeft', { n: lf }) : t('plan.tl.pastAll');
      if (sum.textContent !== txt) { if (m && m.swapText && !rubyOn()) m.swapText(sum, txt); else sum.textContent = txt; }
      sum.classList.toggle('is-zero', !lf);
    }
    syncBand(model);
    return model;
  }

  /* the いま band changes variant (now ⇄ done ⇄ all) in place: the new one fades in where the old one was and
     everything after it moves by FLIP; its picture plays */
  function syncBand(model) {
    var root = view();
    if (!root) return;
    var old = root.querySelector('#plan-now');
    var v = bandVariant(model);
    if (!old || old.getAttribute('data-v') === v) return;
    var flow = old.parentNode;
    var tmp = document.createElement('div');
    tmp.innerHTML = nowHtml(model);
    var nb = tmp.firstElementChild;
    if (!nb) return;
    applyRuby(nb);
    var swap = function () { flow.replaceChild(nb, old); if (M() && M().mount) M().mount(nb, { instant: true }); };
    var m = M();
    if (m && m.flip && canAnim()) {
      m.flip(flow, swap);
      anim(nb.querySelector('.plan-now-text') || nb, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 80, easing: EASE('enter'), fill: 'backwards' });
      var fig = nb.querySelector('.il');
      if (fig && SM.illus && SM.illus.play) SM.illus.play(fig);
    } else swap();
  }

  /* ------------------------------------------------------------------ 済み */
  function sortRows(ul) {
    var rows = Array.prototype.slice.call(ul.children);
    var want = rows.slice().sort(function (a, b) {
      return ((a.classList.contains('is-done') ? 1 : 0) - (b.classList.contains('is-done') ? 1 : 0)) || ((+a.getAttribute('data-i') || 0) - (+b.getAttribute('data-i') || 0));
    });
    for (var i = 0; i < rows.length; i++) if (rows[i] !== want[i]) return want;
    return null;
  }
  // pre: writes that belong to the same change (undo's row state): run inside the FLIP after its first read, so the
  // whole change costs one layout read before and one after (a read between writes restyles the page again)
  function reorder(ul, pre, post) {
    if (!ul || !ul.isConnected) { if (pre) pre(); if (post) post(); return; }
    clearTimeout(ul._planT); ul._planT = null;
    var movers = (ul._planMovers || []).filter(function (x) { return x.parentNode === ul; });
    ul._planMovers = null;
    var want = pre ? null : sortRows(ul);
    if (!want && !pre) return;
    var put = function () {
      if (pre) { pre(); want = sortRows(ul); }
      if (want) want.forEach(function (li) { ul.appendChild(li); });
      // focus lands after the move (moving a focused row would restyle the page once more)
      if (post) post();
    };
    var m = M();
    // the rows the user ticked (or un-ticked by undo) hop: out where they were, in at their new place; the others
    // close the gap. Nothing slides through another row.
    if (m && m.flip && canAnim()) m.flip(ul, put, { hop: movers }); else if (m && m.keepFocus) m.keepFocus(ul, put); else put();
  }
  /* the row moves after the stamp has been seen. A keyboard user ticking down the list keeps their place:
     the move waits until focus leaves the list. */
  function scheduleReorder(ul, delay) {
    // without motion a row that jumps away under the finger is disorienting: it stays put, the next visit sorts it
    if (!ul || !canAnim()) return;
    clearTimeout(ul._planT);
    ul._planT = setTimeout(function () {
      ul._planT = null;
      var a = document.activeElement;
      var kb = a && ul.contains(a) && a.matches && (function () { try { return a.matches(':focus-visible'); } catch (e) { return false; } })();
      if (kb) {
        if (ul._planWait) return;
        ul._planWait = function (ev) {
          if (ev.relatedTarget && ul.contains(ev.relatedTarget)) return;
          ul.removeEventListener('focusout', ul._planWait);
          ul._planWait = null;
          scheduleReorder(ul, 120);
        };
        ul.addEventListener('focusout', ul._planWait);
        return;
      }
      reorder(ul);
    }, delay == null ? 680 : delay);
  }

  function setRow(li, on, motion) {
    if (!li) return;
    var cb = li.querySelector('.tl-check');
    if (cb && cb.checked !== on) cb.checked = on;
    var m = M();
    var box = li.querySelector('.tl-box');
    // check() uses the box geometry read on pointerdown and the known fill: the tap only writes (no forced restyle)
    if (on && motion && m && canAnim() && box && m.check) m.check(box, { color: 'var(--on-action-fill, #fff)', fill: 'var(--action-fill)' });
    else if (!on && box && m && m.uncheck) m.uncheck(box, { color: 'var(--action-fill)' });
    li.classList.toggle('is-done', on);
    if (on && motion && m) settleRow(li);
    if (on && motion && m && canAnim()) {
      var seal = li.querySelector('.tl-seal');
      if (seal && m.stamp) {
        seal.style.opacity = '0';
        setTimeout(function () { seal.style.opacity = ''; if (li.classList.contains('is-done')) m.stamp(seal); }, 150);
      }
    }
  }

  /* the ticked row answers with its whole body: a green wash sweeps across it and fades (reduced: the fade only),
     and the text hops 10px toward the box and settles back, so a tick reads as "done" from arm's length */
  function settleRow(li) {
    var task = li.querySelector('.tl-task');
    if (!task) return;
    var w = document.createElement('span');
    w.className = 'tl-wash';
    w.setAttribute('aria-hidden', 'true');
    li.appendChild(w);
    var a = anim(w, [{ opacity: 1, transform: 'scaleX(0)' }, { opacity: 1, transform: 'scaleX(1)', offset: 0.45 }, { opacity: 0, transform: 'scaleX(1)' }],
      { duration: 820, easing: EASE('standard'), fill: 'forwards', key: 'wash' });
    var gone = function () { if (w.parentNode) w.parentNode.removeChild(w); };
    finished(a).then(gone);
    setTimeout(gone, 1200);
    var txt = li.querySelector('.tl-item-text');
    if (txt && canAnim()) anim(txt, [{ translate: '0 0' }, { translate: '12px 0', offset: 0.32 }, { translate: '0 0' }], { duration: 520, easing: EASE('standard'), key: 'hop' });
  }

  function completeGroup(gEl) {
    var m = M();
    var mk = gEl && gEl.querySelector(':scope > .tl-mk');
    if (mk && m && m.stamp && canAnim()) setTimeout(function () { m.stamp(mk); }, 260);
  }

  function markDone(key, on, opts) {
    opts = opts || {};
    var root = view();
    var cb = root && document.getElementById(itemId(key));
    var li = cb && cb.closest('.tl-item');
    var gEl = li && li.closest('.tl-group');
    var wasComplete = gEl && gEl.classList.contains('is-complete');
    // 1. the row answers the tap (box fill + check draw, next frame) 2. state (cheap, so leaving at once keeps it)
    // 3. the model (no DOM) for the toast's wording 4. counts / progress / band after the first painted frame
    // undo (opts.now): the row's state changes inside the reorder's FLIP (its first read comes before any write)
    var inFlip = !!(opts.now && li && li.parentNode && canAnim() && M() && M().flip);
    if (!inFlip) setRow(li, on, !opts.quiet);
    setDone(key, on);
    var model = build();
    lastModel = model;
    var g = gEl ? model.groups.filter(function (x) { return x.key === gEl.getAttribute('data-group'); })[0] : null;
    var nowComplete = !!(g && g.total && g.doneN === g.total);
    refreshSoon();
    if (on && nowComplete && !wasComplete) completeGroup(gEl);
    var ul = li && li.parentNode;
    if (ul && li) (ul._planMovers || (ul._planMovers = [])).push(li);
    if (inFlip) reorder(ul, function () { setRow(li, on, !opts.quiet); }, opts.focus ? function () { focusQuiet(cb); } : null);
    else if (opts.focus) focusQuiet(cb);
    else if (opts.now) reorder(ul); else scheduleReorder(ul);
    return { group: nowComplete && !wasComplete };
  }

  SM.on('plan-done', function (el) {
    var key = el.getAttribute('data-key');
    var on = !!el.checked;
    var r = markDone(key, on);
    if (!on) return;
    SM.toast(r.group ? t('plan.done.groupToast') : t('plan.done.toast'), {
      action: { label: t('plan.saved.undo'), fn: function () {
        // the row's box gets focus back once it is in its place (inside the FLIP, before its second read)
        markDone(key, false, { now: true, quiet: true, focus: true });
        SM.toast(t('plan.saved.restored'), 1600);
      } }
    });
  });

  /* ------------------------------------------------------------------ folds (すぎた時期 / later periods) */
  SM.on('plan-fold', function (el, ev) {
    var det = el.parentNode;
    if (!det || det.tagName !== 'DETAILS') return;
    if (ev && ev.preventDefault) ev.preventDefault();
    toggleFold(det);
  });
  function toggleFold(det) {
    var open = !det.open;
    if (det.id === 'tl-past') pastOpen = open; else foldOpen[det.getAttribute('data-fold')] = open;
    var root = view();
    var ol = root && root.querySelector('.tl-wrap > ol.tl');
    var body = det.querySelector(':scope > .tl-past-body, :scope > .tl-fold-body');
    var m = M();
    var set = function (v) {
      det.open = v;
      if (v && body && m && m.mount) m.mount(body, { instant: true });
    };
    var rewire = function () { if (root) wireFill(root, { from: true }); };
    if (!ol || !m || !m.flip || !canAnim()) { set(open); rewire(); return; }
    if (open) {
      m.flip(ol, function () { set(true); });
      if (body) anim(body, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 60, easing: EASE('enter'), fill: 'backwards', key: 'fold' });
      rewire();
    } else {
      det.classList.add('is-closing');
      var a = body ? anim(body, [{ opacity: 1 }, { opacity: 0 }], { duration: 110, easing: EASE('exit'), fill: 'forwards', key: 'fold' }) : null;
      finished(a).then(function () {
        det.classList.remove('is-closing');
        m.flip(ol, function () { set(false); });
        if (a) try { a.cancel(); } catch (e) { }
        rewire();
      });
    }
  }

  /* ------------------------------------------------------------------ track switch */
  var switchGen = 0;
  SM.on('plan-track', function (el) {
    var v = el.getAttribute('data-value');
    if (v !== 'junior' && v !== 'leaving') return;
    if (curTrack() === v) return;
    SM.store.set('plan:track', v);
    var root = view();
    if (!root || !root.querySelector('.plan-hero')) { calm = true; SM.render(); return; }
    flushDeferred();
    Array.prototype.forEach.call(root.querySelectorAll('.plan-track > button'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-value') === v ? 'true' : 'false');
    });
    var model = build({ track: v });
    lastModel = model;
    var gen = ++switchGen;
    // the hero changes in place; when its height changes (the note gains or loses a line) the date row, the
    // progress and the body below glide to their new places (FLIP) instead of jumping, while the body leaves
    var m = M();
    var swap = function () { morphHero(root, model); };
    if (m && m.flip && canAnim()) m.flip(root, swap, { selector: '[data-flip-key^="ph-"]' }); else swap();
    slideBody(root, model, v === 'leaving' ? 1 : -1, gen);
    var pp = root.querySelector('.plan-print');
    if (pp) pp.innerHTML = '';
  });

  function textOf(el) { return el ? (el._smOdoShown != null ? el._smOdoShown : el.textContent) : ''; }
  /* a fixed copy of el fades out where el is (call before el leaves the DOM); never blocks input */
  function ghostOut(el, ms) {
    if (!el || !canAnim()) return;
    var r = el.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > (window.innerHeight || 800)) return;
    var g = el.cloneNode(true);
    g.removeAttribute('id');
    g.setAttribute('aria-hidden', 'true');
    g.classList.add('plan-ghost');
    g.style.cssText += ';position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;margin:0;transform:none;';
    (el.closest('.v-plan') || document.body).appendChild(g);
    var a = anim(g, [{ opacity: 1 }, { opacity: 0 }], { duration: ms || 120, easing: EASE('exit'), fill: 'forwards' });
    finished(a).then(function () { if (g.parentNode) g.parentNode.removeChild(g); });
  }
  function morphHero(root, model) {
    var old = root.querySelector('.plan-hero');
    if (!old) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = heroHtml(model);
    var nh = tmp.firstElementChild;
    var before = {};
    Array.prototype.forEach.call(old.querySelectorAll('[data-m]'), function (e) { before[e.getAttribute('data-m')] = textOf(e); });
    var oldBar = old.querySelector('.plan-prog-fill');
    var oldScale = oldBar ? oldBar.style.transform : '';
    var oldProg = old.querySelector('#plan-prog');
    var oldDue = oldProg && oldProg.classList.contains('has-due') ? parseFloat(oldProg.style.getPropertyValue('--due')) : NaN;
    var m = M();
    var live = m && canAnim();
    // what has no counterpart in the new hero (the other track's picture, its note) fades where it stood
    if (live) {
      ghostOut(old.querySelector('.plan-hero-il'), 120);
      var on = old.querySelector('[data-m="note"]');
      if (on && before.note !== undefined) ghostOut(on, 90);
    }
    old.parentNode.replaceChild(nh, old);
    applyRuby(nh);
    if (m && m.mount) m.mount(nh, { instant: true });
    if (m && m.seen) {
      var nEl = nh.querySelector('#plan-count-n[data-n]');
      if (nEl) m.seen('plan.days.' + model.track, +nEl.getAttribute('data-n'));
      m.seen('plan.done.' + model.track, model.done);
    }
    if (!live) return;
    Array.prototype.forEach.call(nh.querySelectorAll('[data-m]'), function (e) {
      var k = e.getAttribute('data-m');
      var was = before[k];
      var now = e.textContent;
      if (was == null) {
        anim(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 70, easing: EASE('enter'), fill: 'backwards' });
        return;
      }
      if (was === now) return;
      if (k === 'n' || k === 'pd' || k === 'pt') {
        if (/\d/.test(was) && /\d/.test(now) && m.odometer) { m.odometer(e, now, { from: was, duration: 560 }); return; }
      }
      if (k === 'note') {
        anim(e, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 60, easing: EASE('enter'), fill: 'backwards' });
        return;
      }
      if (m.swapText && !e.querySelector('ruby') && !rubyOn()) { e.textContent = was; m.swapText(e, now); }
    });
    var fig = nh.querySelector('.plan-hero-il');
    if (fig && SM.illus && SM.illus.play) SM.illus.play(fig);
    var nb = nh.querySelector('.plan-prog-fill');
    if (nb && oldScale && oldScale !== nb.style.transform) {
      anim(nb, [{ transform: oldScale }, { transform: nb.style.transform }], { spring: 'smooth', maxDuration: 520 });
    }
    // the いまの時期まで tick slides to where the other track's 'now' falls
    var np = nh.querySelector('#plan-prog');
    var newDue = np && np.classList.contains('has-due') ? parseFloat(np.style.getPropertyValue('--due')) : NaN;
    if (!isNaN(oldDue) && !isNaN(newDue) && Math.abs(oldDue - newDue) > 0.005) {
      var tick = np.querySelector('.plan-prog-tick'), lab = np.querySelector('.plan-prog-due > span');
      var o = { spring: 'smooth', maxDuration: 520 };
      if (tick) anim(tick, [{ left: (oldDue * 100) + '%' }, { left: (newDue * 100) + '%' }], o);
      if (lab) anim(lab, [{ left: (oldDue * 100) + '%', transform: 'translateX(' + (-oldDue * 100) + '%)' },
        { left: (newDue * 100) + '%', transform: 'translateX(' + (-newDue * 100) + '%)' }], o);
    }
  }

  function bodyNode(model) {
    var tmp = document.createElement('div');
    tmp.innerHTML = bodyParts(model, true).html;
    return tmp.firstElementChild;
  }
  function slideBody(root, model, dir, gen) {
    var old = root.querySelector('.plan-body');
    if (!old) return;
    var m = M();
    var live = m && canAnim();
    var land = function () {
      if (gen !== switchGen || !old.isConnected) return;
      var nb = bodyNode(model);
      old.parentNode.replaceChild(nb, old);
      applyRuby(nb);
      if (m && m.mount) m.mount(nb, { instant: true });
      wireFill(root);
      if (live) {
        anim(nb, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: EASE('enter'), fill: 'backwards', key: 'slideO' });
        anim(nb, [{ transform: 'translateX(' + (48 * dir) + 'px)' }, { transform: 'none' }], { spring: 'rise', fill: 'backwards', key: 'slide' });
        var fig = nb.querySelector('#plan-now .il');
        if (fig && SM.illus && SM.illus.play) SM.illus.play(fig);
      }
    };
    if (!live) {
      land();
      // reduced motion: a short cross-fade instead of nothing
      var nb0 = root.querySelector('.plan-body');
      if (nb0 && m) anim(nb0, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' });
      return;
    }
    var a = anim(old, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (-40 * dir) + 'px)' }], { duration: 180, easing: EASE('exit'), fill: 'forwards', key: 'slide' });
    if (!a) { land(); return; }
    finished(a).then(land);
  }

  /* ------------------------------------------------------------------ jump to a period */
  function flash(el) {
    if (!el || !canAnim()) return;
    var w = document.createElement('span');
    w.className = 'plan-wash';
    w.setAttribute('aria-hidden', 'true');
    el.appendChild(w);
    var a = anim(w, [{ opacity: 0.06 }, { opacity: 0.06, offset: 0.35 }, { opacity: 0 }], { duration: 600, easing: 'linear', fill: 'forwards' });
    finished(a).then(function () { if (w.parentNode) w.parentNode.removeChild(w); });
  }
  SM.on('plan-jump', function (el) {
    flushDeferred();
    var tg = document.getElementById(el.getAttribute('data-target') || '');
    if (!tg) return;
    var m = M();
    if (m && m.revealAll) { try { m.revealAll(tg); } catch (e) { } }
    var det = tg.querySelector(':scope > .tl-body > details.tl-fold:not([open])');
    if (det) { foldOpen[det.getAttribute('data-fold')] = true; det.open = true; wireFill(view()); }
    var smooth = !reduced();
    try { tg.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }); } catch (e) { tg.scrollIntoView(); }
    var h = tg.querySelector('.tl-title, .section-title, h2, h3');
    if (h) {
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      focusQuiet(h);
    }
    var body = tg.querySelector(':scope > .tl-body') || tg;
    if (!smooth) return;
    var fired = false;
    var go = function () { if (fired) return; fired = true; window.removeEventListener('scrollend', go); flash(body); };
    if ('onscrollend' in window) window.addEventListener('scrollend', go, { once: true });
    setTimeout(go, 700);
  });

  /* ------------------------------------------------------------------ anchor-date sheet (巣立ちの日 or 高校入学) */
  function optRow(label, sub, act, value, selected) {
    if (SM.ui.opt) return SM.ui.opt(label, { hint: sub, act: act, selected: selected, attrs: value ? 'data-value="' + esc(value) + '"' : '' });
    return '<button type="button" class="opt" data-act="' + act + '"' + (value ? ' data-value="' + esc(value) + '"' : '') + ' aria-pressed="' + (selected ? 'true' : 'false') + '"><span class="opt-body"><span class="opt-title">' + esc(label) + '</span><span class="opt-hint">' + esc(sub) + '</span></span></button>';
  }
  SM.on('plan-date', function () {
    var jr = curTrack() === 'junior';
    var now = today0();
    var html;
    pendingPick = false;
    if (jr) {
      var ei = entryInfo();
      var y0 = assumedEntry(now, null).getFullYear();
      var opts = [[y0, 'plan.jr.g3'], [y0 + 1, 'plan.jr.g2'], [y0 + 2, 'plan.jr.g1']].map(function (o) {
        var v = o[0] + '-04-01';
        return optRow(t('plan.jr.date.opt', { y: o[0] }), t('plan.jr.date.optSub', { g: t(o[1]) }), 'plan-date-quick', v, !ei.assumed && state().hsDate === v);
      }).join('');
      html = '<div class="plan-date-sheet stack">' +
        '<div class="stack-sm"><p class="plan-date-qlabel">' + esc(t('plan.jr.date.quick')) + '</p><div class="opts plan-date-opts">' + opts +
          optRow(t('plan.jr.date.unknown'), t('plan.jr.date.unknownSub'), 'plan-date-unknown', '', ei.assumed) + '</div></div>' +
        '<div class="field"><label for="plan-date-input">' + esc(t('plan.jr.date.field')) + '</label>' +
        '<input type="date" class="input" id="plan-date-input" min="2000-01-01" max="2100-12-31" value="' + esc(iso(ei.date)) + '">' +
        '<p class="help">' + esc(t('plan.date.help')) + '</p></div>' +
        SM.ui.button(t('plan.date.save'), { act: 'plan-date-save', variant: 'primary', size: 'lg', block: true, arrow: true }) +
        '</div>';
      SM.sheet(html, { title: t('plan.jr.date.title'), cls: 'v-plan plan-sheet' });
      return;
    }
    var li = leaveInfo();
    var y1 = assumedLeave(now, null).getFullYear();
    var quick = [y1, y1 + 1].map(function (y) {
      var v = y + '-03-31';
      return SM.ui.chip(t('plan.date.fy', { y: y }), { act: 'plan-date-quick', pressed: !li.assumed && state().leaveDate === v, attrs: 'data-value="' + v + '"' });
    }).join('');
    html = '<div class="plan-date-sheet stack">' +
      '<div class="field"><label for="plan-date-input">' + esc(t('plan.date.field')) + '</label>' +
      '<input type="date" class="input" id="plan-date-input" min="2000-01-01" max="2100-12-31" value="' + esc(iso(li.date)) + '">' +
      '<p class="help">' + esc(t('plan.date.help')) + '</p></div>' +
      '<div class="stack-sm"><p class="plan-date-qlabel">' + esc(t('plan.date.quick')) + '</p><div class="chips plan-date-chips">' + quick + '</div></div>' +
      SM.ui.button(t('plan.date.save'), { act: 'plan-date-save', variant: 'primary', size: 'lg', block: true, arrow: true }) +
      '<div class="opts">' + optRow(t('plan.date.unknown'), t('plan.date.unknownSub'), 'plan-date-unknown', '', li.assumed) + '</div>' +
      '</div>';
    SM.sheet(html, { title: t('plan.date.title'), cls: 'v-plan plan-sheet', focus: '#plan-date-input' });
  });

  /* the new date lands: the countdown rolls from the old N to the new one and the date line swaps */
  function applyAnchor(change, toastMsg) {
    var root = view();
    var oldN = root && root.querySelector('#plan-count-n');
    var oldTxt = textOf(oldN), oldD = textOf(root && root.querySelector('[data-m="dv"]'));
    change();
    SM.save();
    if (SM.sheetOpen && SM.sheetOpen()) SM.closeSheet();
    calm = true;
    SM.render();
    var r2 = view();
    var model = lastModel || build();
    var m = M();
    var nEl = r2 && r2.querySelector('#plan-count-n');
    if (nEl && m) {
      var to = nEl.textContent;
      if (nEl.hasAttribute('data-n') && m.seen) m.seen('plan.days.' + model.track, +nEl.getAttribute('data-n'));
      if (oldTxt && oldTxt !== to && /\d/.test(oldTxt) && /\d/.test(to) && m.odometer) m.odometer(nEl, to, { from: oldTxt, duration: 640 });
      else if (oldTxt !== to && canAnim()) anim(nEl, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 120, easing: EASE('enter'), fill: 'backwards' });
    }
    var dv = r2 && r2.querySelector('[data-m="dv"]');
    if (dv && oldD && dv.textContent !== oldD && m && m.swapText && !rubyOn()) { var nd = dv.textContent; dv.textContent = oldD; m.swapText(dv, nd); }
    SM.toast(toastMsg);
  }
  function setAnchor(v) {
    var d = parseISO(v);
    if (!d) {
      SM.toast(t('plan.date.invalid'));
      var inp = document.getElementById('plan-date-input');
      if (inp && M() && M().nudge) M().nudge(inp);
      return false;
    }
    var jr = curTrack() === 'junior';
    applyAnchor(function () { if (jr) state().hsDate = iso(d); else state().leaveDate = iso(d); },
      t(jr ? 'plan.jr.date.saved' : 'plan.date.saved', { date: fmtDate(d) }));
    return true;
  }
  /* a quick pick shows itself chosen first (the chip fills / the option checks), then the sheet closes */
  var pendingPick = false;
  function pick(el, fn) {
    if (pendingPick) return;
    pendingPick = true;
    var box = el.parentNode;
    Array.prototype.forEach.call(box ? box.querySelectorAll('[aria-pressed]') : [], function (b) {
      var on = b === el;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('is-selected', on && b.classList.contains('opt'));
    });
    Array.prototype.forEach.call(document.querySelectorAll('.plan-date-sheet [aria-pressed="true"]'), function (b) {
      if (b !== el) { b.setAttribute('aria-pressed', 'false'); b.classList.remove('is-selected'); }
    });
    var m = M();
    var ind = el.querySelector('.opt-ind');
    // an option: its indicator fills and the check draws (as an answer does); a chip: the fill is the state,
    // so it only settles on the stamp spring (no rotation: it is a label, not a seal)
    if (m && canAnim()) {
      if (ind && m.check) m.check(ind, { color: 'var(--paper)' });
      else anim(el, [{ scale: '0.94' }, { scale: '1' }], { spring: 'stamp', key: 'pick' });
    }
    setTimeout(function () { pendingPick = false; fn(); }, canAnim() ? 260 : 0);
  }
  SM.on('plan-date-save', function () {
    var inp = document.getElementById('plan-date-input');
    setAnchor(inp ? inp.value : '');
  });
  SM.on('plan-date-quick', function (el) { pick(el, function () { setAnchor(el.getAttribute('data-value')); }); });
  SM.on('plan-date-unknown', function (el) {
    pick(el, function () {
      var jr = curTrack() === 'junior';
      applyAnchor(function () { if (jr) state().hsDate = null; else state().leaveDate = null; }, t('plan.date.cleared'));
    });
  });

  /* ------------------------------------------------------------------ saved: remove + undo (in place) */
  function swapOrSet(el, text) {
    if (!el) return;
    var m = M();
    if (m && m.swapText && !rubyOn() && el.offsetParent !== null) m.swapText(el, text); else el.textContent = text;
  }
  /* a part that leaves when the list empties / fills (the 件数 line, the empty state) fades out where it was as a
     fixed ghost (120ms), so the FLIP moves everything else at once. r and cs are read by the caller before any write;
     cs carries the text styles a clone outside its parent would lose. */
  function fadeGhost(el, r, cs, ms) {
    var v = document.getElementById('view');
    if (!el || !r || !r.width || !v) return;
    var g = el.cloneNode(true);
    g.removeAttribute('id');
    g.setAttribute('aria-hidden', 'true');
    g.style.cssText = 'position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height +
      'px;margin:0;z-index:5;pointer-events:none;box-sizing:border-box;' +
      (cs ? 'font:' + cs.font + ';color:' + cs.color + ';letter-spacing:' + cs.letterSpacing + ';' : '');
    v.appendChild(g);
    var a = anim(g, [{ opacity: 1 }, { opacity: 0 }], { duration: ms || 120, easing: EASE('exit'), fill: 'forwards' });
    finished(a).then(function () { if (g.parentNode) g.parentNode.removeChild(g); });
    setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 600);
  }
  function tlRowsOf(root, id) {
    return root.querySelectorAll('.tl-item-prog[data-flip-key="pg:' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
  }
  // onScreen: read by the caller before any write (a list off screen just loses its row: no FLIP, no layout reads)
  function removeTlRows(root, id, onScreen) {
    var m = M();
    var rows = tlRowsOf(root, id);
    Array.prototype.forEach.call(rows, function (li, i) {
      var ul = li.parentNode;
      var go = function () {
        li.parentNode.removeChild(li);
        if (ul && !ul.children.length && ul.parentNode) ul.parentNode.removeChild(ul);
      };
      if (m && m.flip && canAnim() && ul && (!onScreen || onScreen[i])) m.flip(ul, go); else go();
    });
  }
  function savedHeadSync(root, model, nVis) {
    var sec = root.querySelector('#plan-saved');
    var head = sec && sec.querySelector('.section-head');
    if (!head) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = savedHeadHtml(model);
    var want = tmp.firstElementChild;
    var sub = head.querySelector('.section-sub'), act = head.querySelector('.section-action');
    var nSub = want.querySelector('.section-sub'), nAct = want.querySelector('.section-action');
    if (sub && nSub) rollNum(sub.querySelector('.plan-saved-n'), model.saved.length, nVis);
    else if (sub && !nSub) sub.parentNode.removeChild(sub);
    else if (!sub && nSub) {
      var ht = head.querySelector('.section-head-text');
      if (ht) {
        applyRuby(nSub); ht.appendChild(nSub);
        if (canAnim()) anim(nSub, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 60, easing: EASE('enter'), fill: 'backwards' });
      }
    }
    if (act && !nAct) act.parentNode.removeChild(act);
    else if (!act && nAct) {
      head.insertBefore(nAct, head.querySelector('.section-rule'));
      if (canAnim()) anim(nAct, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 60, easing: EASE('enter'), fill: 'backwards' });
    }
  }
  var lastRemoved = null;
  SM.on('plan-remove', function (el) {
    var id = el.getAttribute('data-id');
    var i = (state().saved || []).indexOf(id);
    if (i === -1) return;
    flushDeferred();
    var p = SM.program(id);
    var name = p ? L(p.name) : id;
    var root = view();
    var row = el.closest('.plan-saved-item');
    var list = row && row.parentNode;
    var next = row && (row.nextElementSibling || row.previousElementSibling);
    state().saved.splice(i, 1);
    SM.save();
    lastRemoved = { id: id, index: i, done: isDone('pg:' + id) };
    var model = build();
    lastModel = model;
    var m = M();
    var live = !!(m && m.flip && canAnim());
    var empty = !model.saved.length;
    // the row fades where it is (120ms), then what follows closes the gap by FLIP
    var apply = function () {
      if (!root || !root.isConnected || !isPlanRoute()) return;
      // reads first (layout is clean here): the count's visibility and which timeline lists are on screen
      var nEl = root.querySelector('#plan-saved .plan-saved-n');
      var nVis = !!nEl && nEl.offsetParent !== null;
      var vh = window.innerHeight || 800;
      var tlOn = Array.prototype.map.call(tlRowsOf(root, id), function (li) {
        var r = li.parentNode.getBoundingClientRect();
        return r.bottom > -50 && r.top < vh + 50;
      });
      // the last one out: the 件数 line leaves as a ghost while the empty state fades in
      var subEl = empty && live ? root.querySelector('#plan-saved .section-sub') : null;
      var subR = subEl ? subEl.getBoundingClientRect() : null, subCs = subEl ? getComputedStyle(subEl) : null;
      var subSt = subCs ? { font: subCs.font, color: subCs.color, letterSpacing: subCs.letterSpacing } : null;
      var actEl = subEl ? root.querySelector('#plan-saved .section-head .section-action') : null;
      var actR = actEl ? actEl.getBoundingClientRect() : null, actCs = actEl ? getComputedStyle(actEl) : null;
      var actSt = actCs ? { font: actCs.font, color: actCs.color, letterSpacing: actCs.letterSpacing } : null;
      var change = function () {
        if (row && row.parentNode) {
          var rm = function () { if (row.parentNode) row.parentNode.removeChild(row); };
          if (live && !empty && list && list.isConnected) m.flip(list, rm); else rm();
        }
        if (empty) {
          var lst = root.querySelector('.plan-saved-list');
          if (lst) {
            var tmp = document.createElement('div');
            tmp.innerHTML = savedEmptyHtml();
            var e = tmp.firstElementChild;
            lst.parentNode.replaceChild(e, lst);
            applyRuby(e);
            if (m && m.mount) m.mount(e, { instant: !live });
            if (live) anim(e, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 40, easing: EASE('standard'), fill: 'backwards' });
          }
        }
        if (subEl && subR) fadeGhost(subEl, subR, subSt, 80);
        if (actEl && actR) fadeGhost(actEl, actR, actSt, 80);
        savedHeadSync(root, lastModel || model, nVis);
        removeTlRows(root, id, tlOn);
        // focus moves on inside the FLIP (before its second read), so it costs no extra restyle
        var target = next && next.isConnected ? next.querySelector('.plan-remove') : null;
        if (!target) {
          target = root.querySelector('#plan-saved-h');
          if (target && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        }
        var ae = document.activeElement;
        if (!ae || ae === document.body || !ae.isConnected || (row && row.contains(ae))) focusQuiet(target);
      };
      var body = root.querySelector('.plan-body');
      if (body && live) m.flip(body, change, { selector: BODY_FLIP }); else change();
      // counts, progress and the fill line after the first painted frame of the move
      afterPaint(function () { if (root.isConnected && isPlanRoute()) { refreshCounts(); wireFill(root); } });
    };
    if (live && row) {
      row.style.pointerEvents = 'none';
      var fa = anim(row, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: EASE('exit'), fill: 'forwards' });
      // hidden, not just transparent: flip's ghost clone of this row animates opacity from 1
      finished(fa).then(function () { row.style.opacity = '0'; row.style.visibility = 'hidden'; apply(); });
    } else apply();
    if (SM.updateBadge) SM.updateBadge({ roll: true });
    try { document.dispatchEvent(new CustomEvent('sm:save', { detail: { id: id, saved: false, undo: false } })); } catch (e) { }
    var rec = lastRemoved;
    SM.toast(t('plan.saved.removed', { name: name }), { action: { label: t('plan.saved.undo'), fn: function () { undoRemove(rec); } } });
  });

  /* the blocks that move when the saved list changes height: the sections inside the left column (the calendar /
     相談シート tools below the list slide instead of jumping), the timeline (below the list on a phone), and the saved
     header's rule (it slides up as the 件数 line leaves, never cutting through the line's fading ghost) */
  var BODY_FLIP = ':scope > .plan-flow > *, :scope > :not(.plan-flow), #plan-saved .section-rule';
  function undoRemove(rec) {
    if (!rec) return;
    var saved = state().saved || (state().saved = []);
    if (saved.indexOf(rec.id) === -1) saved.splice(Math.min(rec.index, saved.length), 0, rec.id);
    SM.save();
    // the badge and the sm:save listeners write to the page: they run after this view's reads and FLIP (below)
    var notify = function () {
      if (SM.updateBadge) SM.updateBadge({ roll: true });
      try { document.dispatchEvent(new CustomEvent('sm:save', { detail: { id: rec.id, saved: true, undo: true } })); } catch (e) { }
    };
    var root = view();
    if (!root) { notify(); SM.toast(t('plan.saved.restored'), 1600); return; }
    flushDeferred();
    var model = build();
    lastModel = model;
    var m = M();
    var live = m && m.flip && canAnim();
    var sec = root.querySelector('#plan-saved');
    // reads first: the count's visibility (before any write, so it costs no layout of its own)
    var nEl0 = root.querySelector('#plan-saved .plan-saved-n');
    var nVis = !!nEl0 && nEl0.offsetParent !== null;
    var row = null;
    // from empty: the empty state fades out where it is while the row rises in
    var emp0 = live && sec ? sec.querySelector('.plan-saved-empty') : null;
    var empR = emp0 ? emp0.getBoundingClientRect() : null;
    var back = null;     // the row that comes back (it fades into the room the others make for it)
    var change = function () {
      if (!sec) return;
      var list = sec.querySelector('.plan-saved-list');
      var rowsHtml = model.saved.map(savedRowHtml).join('');
      if (list) {
        // only the missing row is inserted: the others stay the same elements, so they slide (FLIP) instead of
        // being rebuilt, and the returning row waits until there is room for it
        var put = function () {
          var have = {};
          Array.prototype.forEach.call(list.children, function (r) { have[r.getAttribute('data-flip-key')] = r; });
          var p = SM.program(rec.id);
          if (have[rec.id] || !p || model.saved.length !== list.children.length + 1) {
            list.innerHTML = rowsHtml; applyRuby(list); if (m && m.mount) m.mount(list, { instant: true });
            return;
          }
          var tmp = document.createElement('div');
          tmp.innerHTML = savedRowHtml(p);
          back = tmp.firstElementChild;
          back.classList.add('is-back');
          applyRuby(back);
          var ids = model.saved.map(function (x) { return x.id; });
          var nextId = ids[ids.indexOf(rec.id) + 1];
          list.insertBefore(back, (nextId && have[nextId]) || null);
          if (m && m.mount) m.mount(back, { instant: true });
        };
        if (live) m.flip(list, put, { selector: ':scope > .plan-saved-item:not(.is-back)' }); else put();
        if (back) {
          back.classList.remove('is-back');
          if (live) anim(back, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: 180, easing: EASE('enter'), fill: 'backwards' });
        }
      } else {
        var emp = sec.querySelector('.plan-saved-empty');
        var tmp = document.createElement('div');
        tmp.innerHTML = '<div class="pcards plan-saved-list">' + rowsHtml + '</div>';
        var nl = tmp.firstElementChild;
        applyRuby(nl);
        if (emp && empR) fadeGhost(emp, empR, null, 90);
        if (emp) sec.replaceChild(nl, emp); else sec.appendChild(nl);
        if (m && m.mount) m.mount(nl, { instant: true });
        if (live) anim(nl, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 80, easing: EASE('standard'), fill: 'backwards' });
      }
      // focus goes to the row's 外す inside the FLIP (before its second read): no extra restyle
      row = root.querySelector('.plan-saved-item[data-flip-key="' + (window.CSS && CSS.escape ? CSS.escape(rec.id) : rec.id) + '"]');
      if (row) focusQuiet(row.querySelector('.plan-remove'));
    };
    // the timeline gets its rows back (in place, no entrance) one painted frame later: it sits below the saved list,
    // and rebuilding it is most of this tap's layout on a slow phone; counts and the fill line follow it
    var tlLater = function () {
      if (!root.isConnected || !isPlanRoute()) return;
      var tl = root.querySelector('#plan-tl');
      if (tl) {
        var mdl = build();
        var tmp2 = document.createElement('div');
        tmp2.innerHTML = timelineHtml(mdl, tlItems(mdl));
        var ntl = tmp2.firstElementChild;
        applyRuby(ntl);
        tl.parentNode.replaceChild(ntl, tl);
        if (m && m.mount) m.mount(ntl, { instant: true });
      }
      refreshCounts();
      wireFill(root);
    };
    var body = root.querySelector('.plan-body');
    if (body && live) m.flip(body, function () { change(); savedHeadSync(root, model, nVis); }, { selector: BODY_FLIP }); else { change(); savedHeadSync(root, model, nVis); }
    if (live) afterPaint(tlLater); else tlLater();
    if (row) {
      // the category square itself (its column stretches to the card height, so a ring on it would be tall)
      var mark = row.querySelector('.pcard-mark > .cat-icon') || row.querySelector('.pcard-mark');
      // the mark stamps once the row has arrived (room made 0–400ms, row fades in 180–460ms)
      if (mark && m && m.stamp && canAnim()) setTimeout(function () { if (mark.isConnected) m.stamp(mark); }, back ? 400 : 260);
    }
    notify();
    SM.toast(t('plan.saved.restored'), 1600);
  }

  /* ------------------------------------------------------------------ calendar */
  var blobUrl = null;
  function icsHref(evs, ios) {
    var ics = buildICS(evs, new Date(), { plain: icsPlain() });
    if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch (e) { } blobUrl = null; }
    if (ios) return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    try { blobUrl = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' })); return blobUrl; }
    catch (e) { return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics); }
  }
  SM.on('plan-ics', function () {
    var model = build();
    var evs = planEvents(model);
    var html;
    if (!evs.length) {
      html = SM.ui.empty(t('plan.ics.none'), t('plan.ics.noneBody'), null, { illus: 'plan-empty' });
      SM.sheet(html, { title: t('plan.ics.title'), cls: 'v-plan plan-sheet' });
      return;
    }
    var ios = isIOS();
    var href = icsHref(evs, ios);
    var show = evs.slice(0, 5);
    var list = '<ul class="ics-list">' + show.map(function (ev) {
      return '<li><span class="ics-date num"><b>' + esc(fmtShort(ev.date)) + '</b><small>' + esc(String(ev.date.getFullYear())) + '</small></span><span class="ics-sum">' + esc(ev.summary) + '</span></li>';
    }).join('') + '</ul>' + (evs.length > show.length ? '<p class="ics-more">' + esc(t('plan.ics.more', { n: evs.length - show.length })) + '</p>' : '');
    var fname = 'sudachi-map-plan-' + iso(today0()) + '.ics';
    html = '<div class="ics-sheet stack">' +
      '<p class="ics-lead">' + esc(t('plan.ics.lead', { n: evs.length })) + '</p>' + list +
      '<label class="switch-row ics-plain" for="plan-ics-plain"><span class="switch-text"><b>' + esc(t('plan.ics.plain')) + '</b><small id="plan-ics-plain-d">' + esc(t('plan.ics.plainSub')) + '</small></span>' +
        '<input type="checkbox" role="switch" class="switch" id="plan-ics-plain" data-act="plan-ics-plain" aria-describedby="plan-ics-plain-d"' + (icsPlain() ? ' checked' : '') + '></label>' +
      '<a class="btn btn-primary btn-lg btn-block" id="plan-ics-dl" data-act="plan-ics-dl" href="' + esc(href) + '"' + (ios ? '' : ' download="' + esc(fname) + '"') + '>' + ic('download') + '<span class="ics-dl-l">' + esc(ios ? t('plan.ics.saveIOS') : t('plan.ics.save')) + '</span></a>' +
      '<p class="ics-note">' + esc(t('plan.ics.alarm')) + '</p>' +
      '<details class="disclose ics-how"><summary>' + esc(t('plan.ics.how')) + '</summary><ul class="bullets">' +
        (ios ? '<li>' + esc(t('plan.ics.howIOS')) + '</li><li>' + esc(t('plan.ics.howAndroid')) + '</li>' : '<li>' + esc(t('plan.ics.howAndroid')) + '</li><li>' + esc(t('plan.ics.howIOS')) + '</li>') +
        '<li>' + esc(t('plan.ics.howPC')) + '</li></ul></details>' +
      '<p class="ics-note">' + esc(t('plan.ics.privacy')) + '</p>' +
      '<p class="ics-note">' + esc(t('plan.ics.cloud')) + '</p>' +
      '</div>';
    var wasOpen = SM.sheetOpen && SM.sheetOpen();
    SM.sheet(html, {
      title: t('plan.ics.title'), cls: 'v-plan plan-sheet', focus: '#plan-ics-dl',
      mount: function (dlg) {
        // the dates arrive one after another as the sheet rises (first open only)
        if (wasOpen || !canAnim()) return;
        Array.prototype.forEach.call(dlg.querySelectorAll('.ics-list > li'), function (li, i) {
          anim(li, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: 140 + i * 40, easing: EASE('standard'), fill: 'backwards' });
        });
      },
      onClose: function () { var u = blobUrl; blobUrl = null; if (u) setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) { } }, 4000); }
    });
  });
  /* plain names: the titles swap in place, the file is rebuilt (the sheet does not re-render) */
  SM.on('plan-ics-plain', function (el) {
    SM.store.set('plan:icsPlain', !!el.checked);
    var dl = document.getElementById('plan-ics-dl');
    if (!dl) { if (SM.acts['plan-ics']) SM.acts['plan-ics'](); return; }
    var evs = planEvents(build());
    var sums = document.querySelectorAll('.plan-sheet .ics-list .ics-sum');
    Array.prototype.forEach.call(sums, function (s, i) { if (evs[i]) swapOrSet(s, evs[i].summary); });
    dl.setAttribute('href', icsHref(evs, isIOS()));
  });
  SM.on('plan-ics-dl', function (el) {
    var lab = el.querySelector('.ics-dl-l');
    var m = M();
    if (!lab || !m || !m.swapText) return;
    var orig = el._planL || (el._planL = lab.textContent);
    m.swapText(lab, t('plan.ics.made'));
    clearTimeout(el._planT);
    el._planT = setTimeout(function () { if (lab.isConnected) m.swapText(lab, orig); }, 2000);
  });

  /* ------------------------------------------------------------------ 相談シート */
  SM.on('plan-sheet', function () {
    var model = build();
    var thin = !model.saved.length && !state().answered;
    var html = '<div class="cs-sheet stack">' +
      '<p class="cs-lead">' + esc(t('plan.sheet.lead')) + '</p>' +
      (thin ? SM.ui.callout(esc(t('plan.sheet.emptyHint')) + ' <a href="#/find/q/1">' + esc(t('plan.sheet.findLink')) + '</a>', 'info') : '') +
      '<div class="field"><label for="plan-memo">' + esc(t('plan.sheet.memo')) + '</label>' +
      '<textarea class="textarea" id="plan-memo" rows="3" data-act="plan-memo" placeholder="' + esc(t('plan.sheet.memoPh')) + '">' + esc(memo()) + '</textarea>' +
      '<p class="help">' + esc(t('plan.sheet.memoHelp')) + '</p></div>' +
      '<div class="cs-preview"><p class="cs-preview-label">' + esc(t('plan.sheet.preview')) + '</p>' +
      '<pre class="cs-text" id="plan-sheet-text" tabindex="0" data-noruby>' + esc(sheetText(model)) + '</pre></div>' +
      '<div class="btn-row cs-actions">' +
        SM.ui.button(t('plan.sheet.copy'), { act: 'plan-sheet-copy', variant: 'primary', icon: 'copy', size: 'lg' }) +
        SM.ui.button(t('plan.sheet.print'), { act: 'plan-print', variant: 'secondary', icon: 'print', size: 'lg' }) +
      '</div></div>';
    SM.sheet(html, { title: t('plan.sheet.title'), cls: 'v-plan plan-sheet plan-sheet-wide' });
  });
  var memoTimer = null;
  SM.on('plan-memo', function (el) {
    SM.store.set('plan:memo', el.value);
    clearTimeout(memoTimer);
    memoTimer = setTimeout(function () {
      var pre = document.getElementById('plan-sheet-text');
      if (pre) pre.textContent = sheetText(build());
    }, 120);
  });
  SM.on('plan-sheet-copy', function (el) {
    var text = sheetText(build());
    var lab = el.querySelector(':scope > span:not(.arrow):not(.sr-only)');
    var m = M();
    var ok = function () {
      SM.toast(t('plan.sheet.copied'));
      if (!lab || !m || !m.swapText || el.offsetParent === null) return;
      var orig = el._planL || (el._planL = lab.textContent);
      m.swapText(lab, t('plan.sheet.copiedShort'));
      clearTimeout(el._planT);
      el._planT = setTimeout(function () { if (lab.isConnected) m.swapText(lab, orig); }, 2000);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
        navigator.clipboard.writeText(text).then(ok, function () { SM.copy(text, t('plan.sheet.copied')); });
        return;
      }
    } catch (e) { }
    SM.copy(text, t('plan.sheet.copied'));
  });
  SM.on('plan-print', function () {
    flushDeferred();
    fillPrint();
    if (SM.sheetOpen && SM.sheetOpen()) SM.closeSheet({ noFocus: true });
    setTimeout(function () { try { window.print(); } catch (e) { } }, 260);
  });

  SM.plan = {
    build: build, buildICS: buildICS, planEvents: planEvents, sheetText: sheetText,
    assumedLeave: assumedLeave, assumedEntry: assumedEntry, addMonths: addMonths, icsFold: icsFold, icsEscape: icsEscape,
    /* 'leaving' | 'junior' — the track #/plan shows right now */
    track: curTrack,
    /* { track, date:Date, assumed:boolean } — the countdown anchor (巣立ちの日 or 高校入学), for other views */
    anchor: function () { var tr = curTrack(); var i = tr === 'junior' ? entryInfo() : leaveInfo(); return { track: tr, date: i.date, assumed: i.assumed }; }
  };
})();
