/* 巣立ちマップ v8 — views/plan.js (PLAN)
 * #/plan  やること as a roadmap (SPEC-v8 workstream 2). Two tracks, one screen:
 *   'leaving' — 巣立ちの日 + countdown, periods anchored to the leaving day (data/timeline.js track:'leaving')
 *   'junior'  — 中学生: 高校入学 (April, editable) + countdown, the 高校受験のお金 periods (track:'junior')
 * The track follows SM.isJunior() (body.is-junior) unless the user picks one with the 高校受験 / 巣立ち switch
 * (stored as SM.store 'plan:track'). Saved programs, .ics export and the 相談シート work for both tracks.
 *
 * v8: time is the brand's line, periods are stations on it. Phone: a vertical line down the left, one row per
 *   station (when · title · n/N できた · 見る/とじる); the current station carries the いま flag and is open with
 *   its tasks; past and future stations stay visible as compact rows and open in place. Desktop (≥1100): the
 *   stations run across the page on a horizontal line (one CSS grid: ol/li are display:contents, the heads sit in
 *   row 1, the one open body spans row 2 beside つぎの駅 · 見せる・残す · 保存した支援); a station is a tab-like
 *   button, exactly one is open. The milestone (巣立ちの日 / 高校入学) is a station sign with the countdown inside
 *   it; the current station's body says 「巣立ちまで あと N日」 + 変える. The green fill runs from the first station
 *   to いま and on toward the next station by this period's done share: ticking a task moves the line (and the
 *   next station pulses); a finished period stamps its station. Phone: the fill follows the reader's scroll;
 *   desktop: it draws on arrival. Saved supports are rows in the station where their deadline falls (as before)
 *   and the 保存した支援 list names that station (「4か月前の駅」).
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
    'plan.act.sheetSub': { ja: '職員や先生に見せるメモ', jr: '先生や家の人に見せるメモ', en: 'A note to show staff or a teacher' },
    // v7: the plan's first screen (SPEC-v7 §3)
    'plan.assumedLine': { ja: '決まるまで、3月31日で計算', en: 'Counting to March 31 until it is set' },
    'plan.jr.assumedLine': { ja: 'いま{g}として計算しています', en: 'Counting as if you are in {g} now' },
    'plan.progressK': { ja: 'できたこと', en: 'Done' },
    'plan.progressAll': { ja: 'ぜんぶできた', en: 'All done' },
    'plan.tools.h': { ja: '見せる・残す', en: 'Share and keep' },
    'plan.cur.done': { ja: 'この時期は、ぜんぶできた', en: 'This period is done' },
    'plan.cur.next': { ja: 'つぎ：{t}（{from}）', en: 'Next: {t} ({from})' },
    'plan.cur.go': { ja: 'つぎへ', en: 'Go to next' },
    'plan.empty.k': { ja: 'まだ保存なし', en: 'Nothing saved yet' },
    'plan.empty.how': { ja: '気になる支援を☆で保存すると、ここと道のりに入ります。', jr: '気になる支援を☆で保存すると、ここに入ります。', en: 'Star a support to keep it here and in your timeline.' },
    'plan.empty.rel': { ja: '道のりに出てくる支援', en: 'Supports in your timeline' },
    'plan.saved.why': { ja: '締切は道のりにも出ます', en: 'Deadlines show in the timeline too' },
    'plan.tl.lead': { ja: 'チェックすると、このスマホに残ります', en: 'Ticks stay on this phone' },

    'plan.saved.h': { ja: '保存した支援', en: 'Saved' },
    'plan.saved.sub': { ja: '{n}件', en: '{n} saved' },
    'plan.saved.more': { ja: 'さがす', en: 'Find more' },
    'plan.saved.remove': { ja: '外す', en: 'Remove' },
    'plan.saved.removeLabel': { ja: '保存から外す：{name}', en: 'Unsave: {name}' },   // FIX-B (F22): one verb, 保存
    'plan.saved.removed': { ja: '「{name}」を保存から外しました', en: 'Unsaved “{name}”' },
    'plan.saved.undo': { ja: '元に戻す', en: 'Undo' },
    'plan.saved.restored': { ja: '元に戻しました', en: 'Restored' },
    'plan.empty.title': { ja: 'まだ保存なし', en: 'Nothing saved yet' },
    'plan.empty.body': { ja: '☆で保存すると、ここに入ります。', en: 'Tap ☆ on a program to keep it here.' },
    'plan.empty.find': { ja: '支援をさがす', en: 'Find support' },
    'plan.empty.results': { ja: '結果を見る', en: 'See results' },

    'plan.tl.h': { ja: '巣立ちまでの道のり', en: 'Your timeline' },
    'plan.tl.sub': { ja: 'チェックすると、このスマホに記録されます。', en: 'Ticks are saved on this phone.' },
    'plan.tl.before': { ja: '巣立ち{n}か月前', en: '{n} mo. before' },
    'plan.tl.yearBefore': { ja: '巣立ち1年前', en: '1 year before' },
    'plan.tl.after': { ja: '巣立ち{n}か月後', en: '{n} mo. after' },
    'plan.decideDate': { ja: '日にちを決める', jr: '日にちを決める', en: 'Set the date' },
    'plan.tl.anchorWord': { ja: '巣立ち', en: '' },
    'plan.tl.day': { ja: '当日', en: 'The day' },
    'plan.tl.now': { ja: 'いま', en: 'Now' },
    'plan.tl.nowEarly': { ja: 'まだ先。ゆっくりで大丈夫。', en: 'Plenty of time.' },
    'plan.tl.nowLate': { ja: '巣立ちから時間がたっていても、使える支援はあります。', en: 'Even long after leaving, there is support you can use.' },
    'plan.tl.past': { ja: '前の時期（{n}）', en: 'Earlier ({n})' },   // FIX-B (F47): neutral, not "you are behind"
    'plan.tl.pastLeft': { ja: 'のこり{n}こ', en: '{n} left' },
    // FIX-B (v6)
    'plan.tl.asap': { ja: '早めに', en: 'Soon' },
    'plan.nostore': { ja: 'この画面では保存できません。閉じると消えます。', en: 'This screen cannot save. It is lost when you close it.' },
    'plan.nostoreGo': { ja: '設定を見る', en: 'Settings' },
    'plan.empty.line': { ja: '☆で保存した支援がここに入ります。', en: 'Supports you save with ☆ appear here.' },
    'plan.ics.fileAs': { ja: 'ファイルでは「{s}」', en: 'In the file: “{s}”' },
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

  /* ------------------------------------------------------------------ Kanto (SPEC-v7) */
  /* For someone who lives outside 東京都 (another Kanto prefecture, or 'other'), a task written around a Tokyo-only
     program gets general wording here (data/timeline.js stays as it is: these only drop the Tokyo-specific part or
     turn it into "ask whether …"), and a task that only exists because of a Tokyo-only program (受験生チャレンジ
     receipts and forgiveness) is left out. Area not answered: the data as written. Keys: done-key prefix + task id
     (the done keys themselves never change). Related-support links drop records the person cannot use. */
  var HIDE = {};
  var LOCAL_TASK = {
    'tl:start': { ja: '住む都県に、ひとり暮らしをはじめるときの支援があるか聞く', en: 'Ask whether your prefecture has support for starting life on your own' },
    'jr:challenge': { ja: '塾代や受験料が心配なら、区市町村の窓口で使える支援がないか聞く', jr: '塾代や受験料が心配なら、窓口で支援がないか聞く', en: 'Worried about cram school or exam fees? Ask your city office what help there is' },
    'jr:hikaku': { ja: '公立と私立で、授業料と支援がどうちがうか知る', jr: '公立と私立で、お金がどうちがうか知る', en: 'Learn how tuition and support differ between public and private schools' },
    'jr:ryoshusho': HIDE, 'jr:jukenryo': HIDE, 'jr:ryoshusho2': HIDE, 'jr:menjo': HIDE,
    'jr:nyugaku': { ja: '合格したら入学の手続き。入学料の金額と払う期限を、合格の案内で確かめる', jr: '合格したら、入学の手つづき。入学料の期限をたしかめる', en: 'After passing, enrol. Check the entry fee and when it is due in your acceptance papers' },
    'jr:shugakushien': { ja: '学校から案内が来たら「就学支援金」を申請する', en: 'When school sends instructions, apply for the tuition support fund' },
    'jr:souki': { ja: '奨学給付金の「新入生の早めの申請」ができるか、学校に聞く', jr: '奨学給付金を早めにもらえるか、学校に聞く', en: 'Ask school whether you can claim the scholarship benefit early as a new student' },
    'jr:kyufukin': { ja: '「奨学給付金」を申請する（時期と方法は、学校や都県の案内で確かめる）', jr: '「奨学給付金」を申請する', en: 'Apply for the scholarship benefit (check when and how with your school or prefecture)' },
    'jr:shiritsu': { ja: '私立高校の人は、住む都県に授業料の独自の支援があるか、学校に聞く', jr: '私立の人は、授業料の支援があるか学校に聞く', en: 'At a private school? Ask whether your prefecture adds its own tuition support' },
    'jr:maitoshi': { ja: '奨学給付金は毎年の申請が必要。就学支援金も、学校から案内が来たら必ず手続きする', jr: '給付金の申請は毎年。来年の分もカレンダーに入れる', en: 'The scholarship benefit needs a new application every year. For the tuition support fund, always act when school sends instructions' }
  };
  function myArea() { var a = answers().area; return typeof a === 'string' && a ? a : null; }
  function outsideTokyo() {
    var a = myArea();
    if (!a) return false;
    if (a === 'other') return true;
    var mu = SM.matchUtil, pf = mu && mu.prefOf ? mu.prefOf(a) : (/^(\d{2})(\d{3})?$/.exec(a) || [])[1];
    return !!pf && pf !== '13';
  }
  /* can this person use the program at all (their area)? unknown area / no helper: yes */
  function usable(id) {
    var p = SM.program(id);
    if (!p) return false;
    var u = SM.matchUtil && SM.matchUtil.usableIn;
    if (!u) return true;
    try { return u(p, myArea()) !== false; } catch (e) { return true; }
  }
  /* v7: one support, one link. A national scheme each 都県 runs itself (自立支援資金貸付, サポステ) links the person's
     prefecture's version (match.js ownVersion: kanagawa-jiritsu-shikin …; area unknown or outside Kanto: the national
     record); the aftercare place adds the prefecture's own place first (existing records only). */
  var KYOTEN = { '14': 'kanagawa-asunaro', '11': 'saitama-clover-house', '12': 'chiba-cans', '10': 'gunma-ippo' };
  function ownIds(ids) {
    var a = myArea(), mu = SM.matchUtil || {}, out = [];
    var known = a && a !== 'other';
    (ids || []).forEach(function (id) {
      var p = SM.program(id);
      if (!p) return;
      var add = [];
      var base = mu.versioned && mu.versioned[id] ? id : (mu.versionBase ? mu.versionBase(p) : null);
      if (base) add.push(known && mu.ownVersion ? mu.ownVersion(base, a) : base);
      else {
        var k = id === 'yogo-kyoten' && known && mu.prefOf ? KYOTEN[mu.prefOf(a)] : null;
        if (k && SM.program(k)) add.push(k);
        add.push(id);
      }
      add.forEach(function (x) { if (out.indexOf(x) === -1) out.push(x); });
    });
    return out;
  }
  function localTask(prefix, tk) {
    if (!outsideTokyo()) return tk;
    var o = LOCAL_TASK[prefix + tk.id];
    if (o === HIDE) return null;
    if (!o) return tk;
    return { id: tk.id, ja: o.ja, jr: o.jr || o.ja, en: o.en, p: tk.p, paths: tk.paths, href: tk.href, hrefLabel: tk.hrefLabel };
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
    return { key: key, kind: 'task', text: L(tk), href: tk.href || null, hrefLabel: tk.hrefLabel ? L(tk.hrefLabel) : '', p: ownIds(tk.p).filter(usable), done: isDone(key) };
  }

  function leavingGroups(leave) {
    var path = answers().path;
    return timelineOf('leaving').map(function (g) {
      var date = addMonths(leave, g.m);
      var tasks = (g.tasks || []).filter(taskFilter(path)).map(function (tk) { return localTask('tl:', tk); }).filter(Boolean)
        .map(function (tk) { return mkTask('tl:' + g.m + ':' + tk.id, tk); });
      return {
        m: g.m, key: 'g' + g.m, title: L(g.title), short: g.short ? L(g.short) : '', sub: g.sub ? L(g.sub) : '',
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
      var tasks = (g.tasks || []).map(function (tk) { return localTask('jr:', tk); }).filter(Boolean)
        .map(function (tk) { return mkTask('jr:' + g.id + ':' + tk.id, tk); });
      out.push({ id: g.id, key: 'j-' + g.id, title: L(g.title), short: g.short ? L(g.short) : '', sub: g.sub ? L(g.sub) : '', when: L(g.when), dateLabel: dateLabel,
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

    // FIX-B (F14): the current period, known before saved programs are placed (a date that has passed goes to いま,
    // so saving never grows the 「前の時期」 pile)
    var cur0 = -1;
    groups.forEach(function (g, i) { if (g.start <= now) cur0 = i; });
    // saved programs → dated items, placed in the right period
    saved.forEach(function (p) {
      var d = p.deadline;
      if (!d) return;
      var item = null;
      var lmPast = typeof d.leaveMonths === 'number' && d.months && d.months.length && addMonths(anchor, d.leaveMonths) < now;
      if (typeof d.leaveMonths === 'number' && !jr && !lmPast) {
        var n = d.leaveMonths;
        var target = groups[0];
        groups.forEach(function (g) { if (g.m <= n) target = g; });
        item = { date: addMonths(anchor, n), open: false, label: n === 0 ? t('ui.atleave') : t('plan.tl.byDate', { date: fmtMonth(addMonths(anchor, n)) }), short: n === 0 ? t('ui.atleave') : fmtMonth(addMonths(anchor, n)), target: target };
        if (cur0 >= 0 && item.date < now && groups.indexOf(target) <= cur0) { item.target = groups[cur0]; item.label = t('plan.tl.asap'); item.short = t('plan.tl.asap'); item.date = now; }
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

  /* ------------------------------------------------------------------ v8 strings (roadmap) */
  SM.strings({
    'plan.rm.h': { ja: '巣立ちまでの道のり', en: 'Your road' },
    'plan.open': { ja: '見る', en: 'Open' },
    'plan.close': { ja: 'とじる', en: 'Close' },
    'plan.doneWord': { ja: 'できた', en: 'done' },
    'plan.station': { ja: '{when}・{title}・できたこと {done}/{total}', en: '{when}: {title}. Done {done} of {total}' },
    'plan.stationOpen': { ja: 'この時期のやることを見る', en: 'Show this period’s tasks' },
    'plan.rm.left': { ja: '巣立ちまで あと{n}日', en: '{n} days until you leave' },
    'plan.rm.left1': { ja: '巣立ちまで あと1日', en: '1 day until you leave' },
    'plan.rm.since': { ja: '巣立ってから {n}日', en: '{n} days since you left' },
    'plan.rm.today': { ja: '巣立ちの日は 今日', en: 'Leaving day is today' },
    'plan.rm.jrLeft': { ja: '高校入学まで あと{n}日', en: '{n} days until high school' },
    'plan.rm.jrLeft1': { ja: '高校入学まで あと1日', en: '1 day until high school' },
    'plan.rm.jrSince': { ja: '高校に入ってから {n}日', en: '{n} days since high school started' },
    'plan.rm.jrToday': { ja: '高校入学は 今日', en: 'High school starts today' },
    'plan.box.pre': { ja: 'あと', en: '' },
    'plan.box.unit': { ja: '日', en: 'days left' },
    'plan.box.unit1': { ja: '日', en: 'day left' },
    'plan.box.unitAfter': { ja: '日前', en: 'days ago' },
    'plan.box.unitAfter1': { ja: '日前', en: 'day ago' },
    'plan.box.today': { ja: '今日', en: 'Today' },
    'plan.next.k': { ja: 'つぎの駅', en: 'Next stop' },
    'plan.next.none': { ja: 'ここが最後の駅', en: 'This is the last stop' },
    'plan.saved.at': { ja: '{when}の駅', en: 'Stop: {when}' },
    'plan.saved.anytime': { ja: 'いつでも', en: 'Any time' },
    'plan.assumedShort': { ja: '決まるまで3月31日で計算', en: 'Counting to March 31 until set' },
    'plan.jr.assumedShort': { ja: 'いま{g}として計算', en: 'Counting as if in {g}' },
    'plan.tasksN': { ja: 'やること {n}こ', en: '{n} to-dos' }
  });

  /* ------------------------------------------------------------------ render pieces */
  var openKeys = {};         // phone: which stations the reader opened / closed (key → bool)
  var selKey = null;         // desktop: the one open station
  var calm = false;          // the next render is an in-place re-render by this view (no first-view motion)
  var lastCalm = false;
  var renderGen = 0;
  var lastModel = null;

  function countInfo(model) {
    var jr = model.track === 'junior';
    var diff = daysBetween(model.now, model.anchor);
    var n = Math.abs(diff);
    var o = { today: diff === 0, n: n, text: fmtNum(n), before: diff > 0 };
    if (o.today) { o.line = t(jr ? 'plan.rm.jrToday' : 'plan.rm.today'); o.big = t('plan.box.today'); o.pre = ''; o.unit = ''; return o; }
    if (diff > 0) {
      o.line = t(n === 1 ? (jr ? 'plan.rm.jrLeft1' : 'plan.rm.left1') : (jr ? 'plan.rm.jrLeft' : 'plan.rm.left'), { n: o.text });
      o.pre = t('plan.box.pre'); o.unit = t(n === 1 ? 'plan.box.unit1' : 'plan.box.unit');
    } else {
      o.line = t(jr ? 'plan.rm.jrSince' : 'plan.rm.since', { n: o.text });
      o.pre = ''; o.unit = t(n === 1 ? 'plan.box.unitAfter1' : 'plan.box.unitAfter');
    }
    return o;
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
  /* できたこと n / N: the one number pair of the page (the line below is its bar) */
  function progressHtml(model) {
    var all = model.total > 0 && model.done === model.total;
    return '<p class="plan-prog' + (all ? ' is-all' : '') + '" id="plan-prog">' +
      '<span class="plan-prog-k" data-m="pk">' + esc(t(all ? 'plan.progressAll' : 'plan.progressK')) + '</span>' +
      '<span class="plan-prog-num num"><b id="plan-prog-done" data-m="pd" data-count="' + model.done + '" data-count-seen="plan.done.' + model.track + '">' + model.done + '</b>' +
      '<span class="plan-prog-of"> / <span id="plan-prog-total" data-m="pt">' + model.total + '</span></span></span></p>';
  }
  function headHtml(ti, model) {
    var nostore = SM.store && SM.store.available === false ?
      '<p class="plan-nostore" role="note">' + esc(t('plan.nostore')) + ' <button type="button" class="plan-nostore-go" data-act="settings">' + esc(t('plan.nostoreGo')) + '</button></p>' : '';
    return '<header class="plan-head">' +
      '<div class="plan-head-l"><h1 class="plan-h1" id="plan-h1" data-reveal="line">' + esc(t('plan.h1')) + '</h1>' + progressHtml(model) + '</div>' +
      switchHtml(ti) + nostore + '</header>';
  }

  /* the period after `cur` that has something in it (or the milestone) */
  function nextAfter(model, from) {
    var g = model.groups;
    var i0 = from != null ? from + 1 : Math.max(0, model.cur + 1);
    for (var i = i0; i < g.length; i++) if (g[i].total || g[i].milestone) return g[i];
    return null;
  }
  function fromLabel(g) { return t('plan.now.from', { date: g.milestone ? fmtDate(g.date) : fmtMonth(g.start) }); }
  function groupOf(model, key) { return model.groups.filter(function (x) { return x.key === key; })[0] || null; }

  /* ---------- tasks (one line per task; a saved support placed in its period) ---------- */
  function taskText(text) {
    var m = /^(.+?)\s*([（(][^（()）]*[)）])\s*$/.exec(text || '');
    if (!m || m[1].length < 6) return '<span class="tl-item-main">' + jaRuns(text) + '</span>';
    return '<span class="tl-item-main">' + jaRuns(m[1]) + '</span><span class="tl-item-aside">' + jaRuns(m[2]) + '</span>';
  }
  function jaRuns(text) {
    var h = esc(text);
    if (!en()) return h;
    return h.replace(/\(?[　-ヿ㐀-鿿＀-￯]+\)?/g, function (w) { return '<span class="plan-ja" lang="ja">' + w + '</span>'; });
  }
  function itemId(key) { return 'pt-' + key.replace(/[^A-Za-z0-9-]/g, '_'); }
  function itemHtml(x, i) {
    var id = itemId(x.key);
    var check = '<input type="checkbox" class="tl-check" id="' + id + '" data-act="plan-done" data-key="' + esc(x.key) + '"' + (x.done ? ' checked' : '') +
      (x.kind === 'prog' ? ' aria-describedby="' + id + '-d"' : '') + '>' +
      '<span class="tl-box" aria-hidden="true">' + ic('check') + '</span>';
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
        return '<li><a class="tl-rel-link" href="#/p/' + encodeURIComponent(id) + '" aria-label="' + esc(nm) + '">' + SM.ui.catIcon(cat, 'xs') + '<span>' + esc(nm) + '</span></a></li>';
      }).join('') + '</ul></details>';
  }
  function countHtml(g, cls) {
    if (!g.total) return '';
    return '<span class="rm-count num' + (cls ? ' ' + cls : '') + '" data-gcount="' + g.key + '" aria-label="' + esc(t('plan.progress') + ' ' + t('plan.progressOf', { done: g.doneN, total: g.total })) + '">' +
      '<b class="rm-count-n">' + g.doneN + '</b><span class="rm-count-of">/' + g.total + '</span><small class="rm-count-w">' + esc(t('plan.doneWord')) + '</small></span>';
  }
  function curDoneHtml(nx) {
    return '<div class="tl-cur-done"><p class="tl-cur-done-t"><span class="tl-cur-done-mk" aria-hidden="true"></span>' + esc(t('plan.cur.done')) + '</p>' +
      (nx ? '<button type="button" class="tl-cur-go" data-act="plan-jump" data-key="' + esc(nx.key) + '"><span>' + esc(t('plan.cur.next', { t: nx.title, from: fromLabel(nx) })) + '</span>' + arrow('down') + '</button>' : '') +
    '</div>';
  }

  /* ---------- the roadmap: one station per period ---------- */
  function isOpenKey(model, key, i) {
    if (wide()) return (selKey && groupOf(model, selKey)) ? key === selKey : i === Math.max(0, model.cur);
    if (Object.prototype.hasOwnProperty.call(openKeys, key)) return !!openKeys[key];
    return i === Math.max(0, model.cur);   // before the first station: its tasks are what comes first
  }
  /* the one line under the current period: how long is left (and 変える) */
  function leftLineHtml(model) {
    var c = countInfo(model);
    var html = esc(c.line).replace(esc(c.text), '<b class="num rm-left-n" data-m="ln">' + esc(c.text) + '</b>');
    return '<p class="rm-left"><span class="rm-left-t">' + html + (model.assumed ? ' <span class="tag tag-deadline rm-assumed">' + esc(t('plan.assumed')) + '</span>' : '') + '</span>' +
      '<button type="button" class="rm-edit" data-act="plan-date" aria-label="' + esc(t('plan.changeLabel', { what: t(model.track === 'junior' ? 'plan.jr.anchor' : 'plan.leave.label'), date: fmtDate(model.anchor) })) + '"><span>' + esc(t(model.assumed ? 'plan.decideDate' : 'plan.change')) + '</span></button></p>';
  }
  function relHtml(when) {
    // 「巣立ち6か月前」 / 「中3の春（4〜6月）」: the anchor word (巣立ち / 中3の) and the distance are two spans so the desktop
    // line can drop or stack the anchor; a trailing bracket (（4〜6月）) is a third span the desktop line leaves out
    var a = t('plan.tl.anchorWord');
    var head = '', rest = when, tail = '';
    var anchored = a && when.indexOf(a) === 0 && when.length > a.length;
    if (anchored) { head = a; rest = when.slice(a.length); }
    else {
      var m = /^([^（(]{1,4}の)(.+)$/.exec(when);
      if (m) { head = m[1]; rest = m[2]; }
    }
    var b = /^(.*?)([（(].*[）)])$/.exec(rest);
    if (b && b[1]) { rest = b[1]; tail = b[2]; }
    if (!head && !tail) return esc(when);
    return (head ? '<span class="rm-rel-a' + (anchored ? ' rm-rel-anchor' : '') + '">' + esc(head) + '</span>' : '') + '<span class="rm-rel-n">' + esc(rest) + '</span>' +
      (tail ? '<span class="rm-rel-x">' + esc(tail) + '</span>' : '');
  }
  function whenHtml(g, isCur) {
    return '<span class="rm-when" data-noruby>' +
      (isCur ? '<span class="rm-now">' + esc(t('plan.tl.now')) + '</span>' : '') +
      (g.when ? '<span class="rm-rel">' + relHtml(g.when) + '</span>' : '') +
      '<span class="rm-date">' + esc(g.dateLabel) + '</span></span>';
  }
  function togHtml(open) {
    return '<span class="rm-tog" aria-hidden="true"><span class="rm-tog-l">' + esc(t(open ? 'plan.close' : 'plan.open')) + '</span>' + arrow('down') + '</span>';
  }
  /* the milestone (巣立ちの日 / 高校入学): a station sign with the countdown inside it */
  function boxHtml(g, model, isCur, open, delay) {
    var jr = model.track === 'junior';
    var c = countInfo(model);
    var what = jr ? t('plan.jr.anchor') : t('plan.leave.label');
    var num = c.today ?
      '<span class="rm-box-n is-today"><b class="rm-box-today" id="plan-count-n" data-m="n">' + esc(c.big) + '</b></span>' :
      '<span class="rm-box-n">' + (c.pre ? '<span class="rm-box-pre">' + esc(c.pre) + '</span>' : '') +
        '<b class="num rm-box-num" id="plan-count-n" data-m="n" data-n="' + c.n + '">' + esc(c.text) + '</b><span class="rm-box-u">' + esc(c.unit) + '</span></span>';
    return '<button type="button" class="rm-head rm-box" data-act="plan-open" data-key="' + esc(g.key) + '" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="rm-b-' + esc(g.key) + '">' +
      '<span class="rm-mk" aria-hidden="true" data-reveal="mark"' + (delay ? ' data-reveal-delay="' + delay + '"' : '') + '></span>' +
      '<span class="rm-head-in" data-reveal=""' + (delay ? ' data-reveal-delay="' + (delay + 40) + '"' : '') + '>' +
        '<span class="rm-box-k">' + (isCur ? '<span class="rm-now">' + esc(t('plan.tl.now')) + '</span>' : '') + '<span class="rm-title" id="rm-t-' + esc(g.key) + '">' + esc(what) + '</span>' +
          (model.assumed ? '<span class="tag tag-deadline rm-assumed">' + esc(t('plan.assumed')) + '</span>' : '') + '</span>' +
        '<span class="rm-box-d num" data-m="dv">' + esc(fmtDateW(model.anchor)) + '</span>' + num +
        countHtml(g, 'rm-box-c') + togHtml(open) + '</span></button>';
  }
  function stationHeadHtml(g, isCur, open, delay) {
    var label = t('plan.station', { when: g.when || g.dateLabel, title: g.title, done: g.doneN, total: g.total });
    return '<button type="button" class="rm-head" data-act="plan-open" data-key="' + esc(g.key) + '" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="rm-b-' + esc(g.key) + '" title="' + esc(t('plan.stationOpen')) + '">' +
      '<span class="rm-mk" aria-hidden="true" data-reveal="mark"' + (delay ? ' data-reveal-delay="' + delay + '"' : '') + '></span>' +
      '<span class="rm-head-in' + (g.short ? ' has-short' : '') + '" data-reveal=""' + (delay ? ' data-reveal-delay="' + (delay + 40) + '"' : '') + '>' +
        whenHtml(g, isCur) +
        '<span class="rm-title" id="rm-t-' + esc(g.key) + '">' + esc(g.title) + '</span>' +
        (g.short ? '<span class="rm-short" aria-hidden="true">' + esc(g.short).replace(/\|/g, '<wbr>') + '</span>' : '') +
        countHtml(g) + togHtml(open) + '<span class="sr-only">' + esc(label) + '</span></span></button>';
  }
  function bodyHtml(g, model, i, open) {
    var isCur = i === model.cur && !model.beyond;   // long after leaving, いま is the row after the last station
    var nx = isCur ? nextAfter(model) : null;
    var jr = model.track === 'junior';
    var note = g.milestone && model.assumed ? '<p class="rm-note">' + esc(jr ? t('plan.jr.assumedShort', { g: gradeFor(model.anchor, model.now) }) : t('plan.assumedShort')) + '</p>' : '';
    var edit = g.milestone ? '<p class="rm-left rm-left-box"><span class="rm-left-t">' + esc(t('plan.changeLabel', { what: jr ? t('plan.jr.anchor') : t('plan.leave.label'), date: fmtDate(model.anchor) })) + '</span>' +
      '<button type="button" class="rm-edit" data-act="plan-date"><span>' + esc(t('plan.change')) + '</span></button></p>' : '';
    return '<div class="rm-body" id="rm-b-' + esc(g.key) + '" role="region" aria-labelledby="rm-t-' + esc(g.key) + '"' + (open ? '' : ' hidden') + '>' +
      '<div class="rm-body-in">' +
        '<p class="rm-body-title" aria-hidden="true">' + (isCur && !g.milestone ? '<span class="rm-now">' + esc(t('plan.tl.now')) + '</span>' : '') + esc(g.title) +
          (g.milestone ? '' : '<span class="rm-body-when num" data-noruby>' + esc((g.when ? g.when + '・' : '') + g.dateLabel) + '</span>') + '</p>' +
        (isCur ? leftLineHtml(model) : '') + note + edit +
        (g.all.length ? '<ul class="tl-items" data-reveal-stagger="50">' + itemsHtml(g.all) + '</ul>' : '<p class="rm-empty">' + esc(t('plan.now.emptyT')) + '</p>') +
        (isCur && g.total ? curDoneHtml(nx) : '') + relatedHtml(g) +
      '</div></div>';
  }
  function stationHtml(g, i, model, k) {
    var isCur = i === model.cur && !model.beyond;
    var cls = i < model.cur ? 'is-past' : isCur ? 'is-current' : 'is-future';
    var open = isOpenKey(model, g.key, i);
    var allDone = g.total > 0 && g.doneN === g.total;
    var delay = Math.min(k, 6) * 50;
    var head = g.milestone ? boxHtml(g, model, isCur, open, delay) : stationHeadHtml(g, isCur, open, delay);
    return '<li class="rm-st ' + cls + (g.milestone ? ' is-milestone' : '') + (allDone ? ' is-complete' : '') + (open ? ' is-open' : '') + '" id="tl-' + esc(g.key) + '" data-group="' + esc(g.key) + '">' +
      head + bodyHtml(g, model, i, open) + '</li>';
  }
  /* いま before the first station (plenty of time) / after the last one (long after leaving) */
  function nowOnlyHtml(model, end, k) {
    var jr = model.track === 'junior';
    var delay = Math.min(k, 6) * 50;
    return '<li class="rm-st rm-now-only is-current' + (end ? ' is-end' : '') + '" data-group="' + (end ? 'end' : 'now') + '">' +
      '<div class="rm-head is-static"><span class="rm-mk" aria-hidden="true" data-reveal="mark"' + (delay ? ' data-reveal-delay="' + delay + '"' : '') + '></span>' +
      '<span class="rm-head-in" data-reveal=""' + (delay ? ' data-reveal-delay="' + (delay + 40) + '"' : '') + '>' +
        '<span class="rm-when" data-noruby><span class="rm-now">' + esc(t('plan.tl.now')) + '</span><span class="rm-date">' + esc(fmtDate(model.now)) + '</span></span>' +
        '<span class="rm-title">' + esc(t(end ? (jr ? 'plan.jr.nowLate' : 'plan.tl.nowLate') : (jr ? 'plan.jr.nowEarly' : 'plan.tl.nowEarly'))) + '</span>' +
        (end ? '<a class="tl-link rm-consult" href="#/find/cat/consult"><span>' + esc(t('plan.now.consult')) + '</span>' + arrow() + '</a>' : '') +
      '</span></div></li>';
  }
  function roadmapHtml(model) {
    var g = model.groups;
    if (!g.length) return '';
    var out = [], k = 0, cols = 0;
    if (model.cur === -1) { out.push(nowOnlyHtml(model, false, k++)); cols++; }
    g.forEach(function (x, i) { out.push(stationHtml(x, i, model, k++)); cols += x.milestone ? 2 : 1; });
    if (model.beyond) { out.push(nowOnlyHtml(model, true, k++)); cols++; }
    return '<ol class="rm" data-track="' + model.track + '">' + out.join('') + '</ol>';
  }
  function colsOf(model) {
    var n = 0;
    if (model.cur === -1) n++;
    model.groups.forEach(function (x) { n += x.milestone ? 2 : 1; });
    if (model.beyond) n++;
    return n;
  }

  /* ---------- beside / below the roadmap: つぎの駅 · 見せる・残す · 保存した支援 ---------- */
  function nextHtml(model) {
    var nx = nextAfter(model);
    var body = nx ?
      '<button type="button" class="plan-next-btn" data-act="plan-jump" data-key="' + esc(nx.key) + '">' +
        '<span class="plan-next-t">' + esc(nx.title) + '</span><span class="plan-next-d num">' + esc(fromLabel(nx)) + '</span>' + arrow() + '</button>' :
      '<p class="plan-next-none">' + esc(t('plan.next.none')) + '</p>';
    return '<section class="plan-next" id="plan-next" aria-labelledby="plan-next-h"><p class="plan-side-k" id="plan-next-h">' + esc(t('plan.next.k')) + '</p>' + body + '</section>';
  }
  function toolsHtml() {
    var row = function (act, icon, title, sub) {
      return SM.ui.listItem({ title: title, sub: sub, icon: icon, act: act, attrs: 'data-press="ink"' });
    };
    return '<section class="plan-tools" id="plan-tools" aria-labelledby="plan-tools-h">' +
      SM.ui.sectionHeader(t('plan.tools.h'), { id: 'plan-tools-h', level: 2, cls: 'plan-side-head' }) +
      '<div class="list plan-tools-list">' +
      row('plan-ics', 'calendar', t('plan.act.ics'), t('plan.act.icsSub')) +
      row('plan-sheet', 'print', t('plan.act.sheet'), t('plan.act.sheetSub')) +
      '</div></section>';
  }
  /* where a saved support sits on the road (the station whose period holds its deadline) */
  function stationOf(model, id) {
    var key = 'pg:' + id;
    for (var i = 0; i < model.groups.length; i++) {
      var g = model.groups[i];
      for (var j = 0; j < g.progs.length; j++) if (g.progs[j].key === key) return g;
    }
    return null;
  }
  function savedRowHtml(p, model) {
    var name = L(p.name);
    var g = stationOf(model || lastModel || build(), p.id);
    var at = g ? t('plan.saved.at', { when: g.milestone ? g.title : (g.when || g.dateLabel) }) : t('plan.saved.anytime');
    return '<div class="plan-saved-item" data-flip-key="' + esc(p.id) + '">' + SM.ui.programCard(p, { compact: true, showSave: false }) +
      '<p class="plan-saved-at"' + (g ? ' data-key="' + esc(g.key) + '"' : '') + '>' + esc(at) + '</p>' +
      '<button type="button" class="plan-remove" data-act="plan-remove" data-id="' + esc(p.id) + '" aria-label="' + esc(t('plan.saved.removeLabel', { name: name })) + '" title="' + esc(t('plan.saved.remove')) + '">' + ic('close') + '</button></div>';
  }
  function nowRelated(model, max) {
    var g = model.groups;
    var from = model.cur >= 0 ? model.cur : 0;
    var ids = [];
    for (var i = from; i < g.length && ids.length < 8; i++) {
      g[i].tasks.forEach(function (x) { x.p.forEach(function (id) { if (ids.indexOf(id) === -1 && SM.program(id)) ids.push(id); }); });
      if (ids.length) break;
    }
    var seen = {};
    return ids.filter(function (id) {
      var nm = L(SM.program(id).name).replace(/[（(].*$/, '');
      if (seen[nm]) return false;
      seen[nm] = true; return true;
    }).slice(0, max || 3).map(function (id) { return SM.program(id); });
  }
  function savedEmptyHtml() {
    var answered = state().answered;
    var model = lastModel || build();
    var rel = nowRelated(model, 3);
    var go = '<a class="plan-empty-go" href="' + (answered ? '#/find/results' : '#/find') + '"><span>' + esc(answered ? t('plan.empty.results') : t('plan.empty.find')) + '</span>' + arrow() + '</a>';
    return '<div class="plan-saved-empty">' +
      '<p class="plan-empty-k">' + esc(t('plan.empty.k')) + '</p>' +
      '<p class="plan-empty-line">' + esc(t('plan.empty.how')) + '</p>' +
      (rel.length ? '<p class="plan-empty-relk">' + esc(t('plan.empty.rel')) + '</p><div class="list plan-empty-rel">' + rel.map(function (p) {
        return SM.ui.listItem({ title: L(p.name).replace(/[（(].*$/, ''), cat: (p.cat && p.cat[0]) || 'procedures', href: '#/p/' + encodeURIComponent(p.id) });
      }).join('') + '</div>' : '') + go + '</div>';
  }
  function savedHeadHtml(model) {
    var n = model.saved.length;
    return SM.ui.sectionHeader(t('plan.saved.h'), {
      sub: n ? t('plan.saved.sub', { n: '\u0001' }) + (en() ? ' · ' : '・') + t('plan.saved.why') : null,
      action: n ? { label: t('plan.saved.more'), href: state().answered ? '#/find/results' : '#/find' } : null,
      id: 'plan-saved-h', cls: 'plan-side-head'
    }).replace('\u0001', '<span class="plan-saved-n num">' + n + '</span>');
  }
  function savedHtml(model) {
    var body = model.saved.length ?
      '<div class="pcards plan-saved-list" data-reveal-stagger="40">' + model.saved.map(function (p) { return savedRowHtml(p, model); }).join('') + '</div>' :
      savedEmptyHtml();
    return '<section class="plan-saved" id="plan-saved" aria-labelledby="plan-saved-h">' + savedHeadHtml(model) + body + '</section>';
  }

  /* the page body: the roadmap (stations + the open period) and, beside it on desktop / under it on a phone,
     つぎの駅 · 見せる・残す · 保存した支援. --n / --k size the desktop grid (stations across, the panel 62% of it). */
  function bodyHtml2(model) {
    var jr = model.track === 'junior';
    var n = colsOf(model), k = Math.max(1, Math.round(n * 0.62));
    return '<section class="plan-rm" id="plan-tl" aria-labelledby="plan-tl-h">' +
      '<h2 class="sr-only" id="plan-tl-h">' + esc(t(jr ? 'plan.jr.tl.h' : 'plan.tl.h')) + '</h2>' +
      '<div class="plan-body rm-wrap" data-flip-key="ph-body" style="--n:' + n + ';--k:' + k + '">' +
        '<span class="rm-rail" aria-hidden="true"></span><span class="rm-fill" aria-hidden="true"><i></i></span>' +
        roadmapHtml(model) +
        '<div class="plan-flow">' + nextHtml(model) + toolsHtml() + savedHtml(model) + '</div>' +
      '</div>' +
      '<p class="plan-note">' + esc(t(jr ? 'plan.jr.note' : 'plan.tl.note')) + '</p></section>';
  }

  /* ------------------------------------------------------------------ view */
  function render() {
    renderGen++;
    var ti = trackInfo();
    var model = build({ track: ti.track });
    lastModel = model;
    var main = document.getElementById('view');
    var inPlace = !!(main && main.classList.contains('v-plan') && main.querySelector('.plan-rm'));
    lastCalm = calm || inPlace;
    calm = false;
    return headHtml(ti, model) + bodyHtml2(model) + '<div class="plan-print" aria-hidden="true"></div>';
  }
  function flushDeferred() { }

  var nowScrolled = false;
  window.addEventListener('hashchange', function () { nowScrolled = false; });

  function mount(root) {
    var model = lastModel || build();
    var gen = renderGen;
    var route = SM.route || {};
    var m = M();
    var first = !route.instant && !lastCalm;
    // the countdown in the station sign: digits roll in on the first view, later only when N changed
    var num = root.querySelector('#plan-count-n[data-n]');
    if (num && m && m.seen) {
      var n = +num.getAttribute('data-n');
      var key = 'plan.days.' + model.track;
      var prev = m.seen(key, n);
      if (first && m.odometer) {
        var from = typeof prev === 'number' && isFinite(prev) && prev !== n ? fmtNum(prev) : '';
        if (reduced()) anim(num, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' });
        else m.odometer(num, num.textContent, { from: from, duration: 960, delay: 240 });
      }
    }
    var newIds = [];
    if (m && m.seen) {
      var ids = (state().saved || []).slice();
      var prevIds = m.seen('plan.savedIds', ids.join(','));
      if (typeof prevIds === 'string') { var pv = prevIds ? prevIds.split(',') : []; newIds = ids.filter(function (x) { return pv.indexOf(x) === -1; }); }
    }
    var toNow = !nowScrolled && !!(route.query && route.query.now === '1');
    if (toNow) nowScrolled = true;
    var after = function () {
      if (gen !== renderGen || !root.isConnected || !isPlanRoute()) return;
      if (toNow) {
        var c = root.querySelector('.rm > .rm-st.is-current');
        if (c) try { c.scrollIntoView({ block: 'start' }); } catch (e) { }
      }
      wireFill(root, { entrance: first });
      if (newIds.length && first && canAnim()) {
        newIds.slice(0, 4).forEach(function (id, i) {
          var row = root.querySelector('.plan-saved-item[data-flip-key="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
          if (!row) return;
          anim(row, [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'none' }], { spring: 'rise', delay: 120 + i * 60, fill: 'backwards', key: 'saved-in' });
          var mark = row.querySelector('.pcard-mark > .cat-icon') || row.querySelector('.pcard-mark');
          if (mark && m.stamp) setTimeout(function () { if (mark.isConnected) m.stamp(mark); }, 380 + i * 60);
        });
      }
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

  /* ------------------------------------------------------------------ the green line */
  /* The fill runs from the first station to いま, then on toward the next station by the share of this period's
     tasks already done: a tick moves the line. Phone (vertical): its tip follows a reading line at 65% of the
     viewport as the reader scrolls (scrollLinked on a view() timeline); desktop (horizontal strip): it draws once
     on arrival. Reduced motion / lite: the end state. */
  var fillCtl = null;
  var SDA = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline', 'view()');
  function readRange(H) {
    var vh = window.innerHeight || 800, pad = 0;
    if (SDA) { try { pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0; } catch (e) { } }
    var span = vh - pad + H;
    var A = 0.35 * vh / span * 100, B = (0.35 * vh + H) / span * 100;
    return ['cover ' + A.toFixed(3) + '%', 'cover ' + Math.min(100, B).toFixed(3) + '%'];
  }
  function markCenters(wrap) {
    var wr = wrap.getBoundingClientRect();
    var lis = wrap.querySelectorAll(':scope > ol.rm > li.rm-st');
    var out = [];
    for (var i = 0; i < lis.length; i++) {
      var mk = lis[i].querySelector(':scope > .rm-head > .rm-mk');
      if (!mk) { out.push(null); continue; }
      var r = mk.getBoundingClientRect();
      out.push({ li: lis[i], x: r.left + r.width / 2 - wr.left, y: r.top + r.height / 2 - wr.top, cur: lis[i].classList.contains('is-current') });
    }
    return out;
  }
  /* the fill's length now (px along the line) and the geometry it needs */
  function fillGeom(wrap, model) {
    var cs = markCenters(wrap).filter(Boolean);
    if (cs.length < 2) return null;
    var horiz = wide();
    var pos = function (c) { return horiz ? c.x : c.y; };
    var ci = -1;
    cs.forEach(function (c, i) { if (c.cur) ci = i; });
    if (ci === -1) return null;
    var frac = 0;
    var g = model.cur >= 0 ? model.groups[model.cur] : null;
    if (g && g.total && cs[ci].li.getAttribute('data-group') === g.key) frac = Math.min(1, g.doneN / g.total);
    var L = pos(cs[ci]) - pos(cs[0]);
    if (cs[ci + 1]) L += frac * (pos(cs[ci + 1]) - pos(cs[ci]));
    return { horiz: horiz, start: pos(cs[0]), end: pos(cs[cs.length - 1]), L: L, cross: horiz ? cs[0].y : cs[0].x };
  }
  function wireFill(root, o) {
    o = o || {};
    root = root || view();
    if (!root) return;
    var wrap = root.querySelector('.rm-wrap');
    var fill = wrap && wrap.querySelector(':scope > .rm-fill');
    var rail = wrap && wrap.querySelector(':scope > .rm-rail');
    if (fillCtl) { try { fillCtl.destroy(); } catch (e) { } fillCtl = null; }
    if (!fill || !rail) return;
    var model = lastModel || build();
    var gm = fillGeom(wrap, model);
    if (!gm) { fill.style.display = 'none'; rail.style.display = 'none'; fill._L = 0; return; }
    var inner = fill.firstElementChild;
    var oldL = fill._L || 0, oldH = fill._horiz;
    rail.style.display = '';
    fill.style.display = gm.L > 1 ? '' : 'none';
    fill._L = gm.L; fill._horiz = gm.horiz;
    if (gm.horiz) {
      rail.style.cssText = 'left:' + gm.start + 'px;width:' + (gm.end - gm.start) + 'px;top:' + gm.cross + 'px';
      fill.style.left = gm.start + 'px'; fill.style.top = gm.cross + 'px'; fill.style.width = gm.L + 'px'; fill.style.height = '';
      fill.style.transformOrigin = 'left center';
      if (inner) inner.style.transformOrigin = 'left center';
    } else {
      rail.style.cssText = 'top:' + gm.start + 'px;height:' + (gm.end - gm.start) + 'px;left:' + gm.cross + 'px';
      fill.style.top = gm.start + 'px'; fill.style.left = gm.cross + 'px'; fill.style.height = gm.L + 'px'; fill.style.width = '';
      fill.style.transformOrigin = 'center top';
      if (inner) inner.style.transformOrigin = 'center top';
    }
    var m = M();
    var prop = gm.horiz ? 'scaleX' : 'scaleY';
    if (!m || !m.scrollLinked) { fill.style.transform = 'none'; return; }
    if (gm.horiz) fill.style.transform = 'none';
    else fillCtl = m.scrollLinked(fill, { prop: 'scaleY', from: 0, to: 1, range: readRange(gm.L) });
    if (!inner || !canAnim()) return;
    if (o.from != null && oldL && oldH === gm.horiz && Math.abs(oldL - gm.L) > 1) {
      // a station opened/closed, or a tick moved the tip: the line glides from where it was to where it is
      inner.style.transform = 'none';
      anim(inner, [{ transform: prop + '(' + (oldL / gm.L) + ')' }, { transform: 'none' }], { spring: 'smooth', maxDuration: 520, key: 'tlfill' });
    } else if (o.entrance) {
      var r = wrap.getBoundingClientRect(), vh = window.innerHeight || 800;
      if (gm.horiz || (r.top + gm.start + gm.L < vh * 0.65 && r.top + gm.start > -vh)) {
        anim(inner, [{ transform: prop + '(0)' }, { transform: 'none' }], { duration: gm.horiz ? 820 : 560, delay: 160, easing: EASE('draw'), fill: 'backwards', key: 'tlfill' });
      }
    }
  }
  var resizeT = null, wasWide = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      var root = view();
      if (!root || !isPlanRoute()) return;
      var W = wide();
      if (wasWide !== null && W !== wasWide) syncOpen(root);
      wasWide = W;
      wireFill(root);
    }, 160);
  });
  /* crossing the desktop breakpoint: one open station on the strip, the reader's choices on the phone list */
  function syncOpen(root) {
    var model = lastModel || build();
    var lis = root.querySelectorAll('.rm > li.rm-st[data-group]');
    Array.prototype.forEach.call(lis, function (li) {
      var key = li.getAttribute('data-group');
      var g = groupOf(model, key);
      if (!g) return;
      var i = model.groups.indexOf(g);
      setOpen(li, isOpenKey(model, key, i));
    });
  }
  window.addEventListener('beforeprint', function () { if (view()) fillPrint(); });

  /* ------------------------------------------------------------------ counts (in place) */
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
  var countsQ = false;
  function afterPaint(fn) {
    var go = function () { setTimeout(fn, 0); };
    if (window.requestAnimationFrame) requestAnimationFrame(go); else setTimeout(fn, 16);
  }
  function refreshSoon() {
    if (countsQ) return;
    countsQ = true;
    afterPaint(function () { countsQ = false; if (view()) { refreshCounts(); wireFill(view(), { from: true }); } });
  }
  function swapOrSet(el, text) {
    if (!el) return;
    var m = M();
    if (m && m.swapText && !rubyOn() && el.offsetParent !== null) m.swapText(el, text); else el.textContent = text;
  }
  function refreshCounts(model) {
    model = model || build();
    lastModel = model;
    var root = view();
    if (!root) return model;
    var m = M();
    var vis = function (el) { return !!el && el.offsetParent !== null; };
    var eDone = root.querySelector('#plan-prog-done'), eTotal = root.querySelector('#plan-prog-total');
    var gEls = model.groups.map(function (g) {
      var el = root.querySelector('[data-gcount="' + g.key + '"]');
      var n = el && el.querySelector('.rm-count-n');
      return { el: el, n: n, v: vis(n) };
    });
    var vDone = vis(eDone), vTotal = vis(eTotal);
    if (m && m.seen) m.seen('plan.done.' + model.track, model.done);
    rollNum(eDone, model.done, vDone);
    rollNum(eTotal, model.total, vTotal);
    var prog = root.querySelector('#plan-prog');
    if (prog) {
      var allDone = model.total > 0 && model.done === model.total;
      if (prog.classList.contains('is-all') !== allDone) {
        prog.classList.toggle('is-all', allDone);
        var pk = prog.querySelector('.plan-prog-k');
        if (pk) swapOrSet(pk, t(allDone ? 'plan.progressAll' : 'plan.progressK'));
      }
    }
    model.groups.forEach(function (g, gi) {
      var el = gEls[gi].el;
      var li = document.getElementById('tl-' + g.key);
      if (el) {
        rollNum(gEls[gi].n, g.doneN, gEls[gi].v);
        var of = el.querySelector('.rm-count-of');
        if (of && of.textContent !== '/' + g.total) of.textContent = '/' + g.total;
        var al = t('plan.progress') + ' ' + t('plan.progressOf', { done: g.doneN, total: g.total });
        if (el.getAttribute('aria-label') !== al) el.setAttribute('aria-label', al);
      }
      var cmp = g.total > 0 && g.doneN === g.total;
      if (li && li.classList.contains('is-complete') !== cmp) li.classList.toggle('is-complete', cmp);
    });
    return model;
  }

  /* ------------------------------------------------------------------ 済み */
  function setRow(li, on, motion) {
    if (!li) return;
    var cb = li.querySelector('.tl-check');
    if (cb && cb.checked !== on) cb.checked = on;
    var m = M();
    var box = li.querySelector('.tl-box');
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
  /* the ticked row answers with its whole body: a green wash sweeps it and the text hops toward the box */
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
  /* the tip of the line answers a tick: a short green pulse at the station the line is heading for */
  function pulseNext(gEl) {
    var m = M();
    if (!gEl || !m || !canAnim()) return;
    var nx = gEl.nextElementSibling;
    var mk = nx && nx.querySelector(':scope > .rm-head > .rm-mk');
    if (mk && m.pulse) { try { m.pulse(mk); return; } catch (e) { } }
    if (mk) anim(mk, [{ transform: 'scale(1)' }, { transform: 'scale(1.35)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 480, easing: EASE('standard'), key: 'pulse' });
  }
  function completeGroup(gEl) {
    var m = M();
    var mk = gEl && gEl.querySelector(':scope > .rm-head > .rm-mk');
    if (mk && m && m.stamp && canAnim()) setTimeout(function () { m.stamp(mk); }, 420);
    var dn = gEl && gEl.classList.contains('is-current') ? gEl.querySelector('.tl-cur-done') : null;
    if (!dn) return;
    gEl.classList.add('is-complete');
    if (!m) return;
    if (canAnim()) anim(dn, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 440, delay: 360, easing: EASE('enter'), fill: 'backwards', key: 'curdone' });
    else anim(dn, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' });
  }
  function markDone(key, on, opts) {
    opts = opts || {};
    var root = view();
    var cb = root && document.getElementById(itemId(key));
    var li = cb && cb.closest('.tl-item');
    var gEl = li && li.closest('.rm-st');
    var wasComplete = gEl && gEl.classList.contains('is-complete');
    setRow(li, on, !opts.quiet);
    setDone(key, on);
    var model = build();
    lastModel = model;
    var g = gEl ? groupOf(model, gEl.getAttribute('data-group')) : null;
    var nowComplete = !!(g && g.total && g.doneN === g.total);
    refreshSoon();
    if (on && nowComplete && !wasComplete) completeGroup(gEl);
    else if (on && !opts.quiet && gEl && gEl.classList.contains('is-current')) setTimeout(function () { pulseNext(gEl); }, 200);
    if (opts.focus) focusQuiet(cb);
    return { group: nowComplete && !wasComplete };
  }
  SM.on('plan-done', function (el) {
    var key = el.getAttribute('data-key');
    var on = !!el.checked;
    var r = markDone(key, on);
    if (!on) return;
    SM.toast(r.group ? t('plan.done.groupToast') : t('plan.done.toast'), {
      action: { label: t('plan.saved.undo'), fn: function () {
        markDone(key, false, { now: true, quiet: true, focus: true });
        SM.toast(t('plan.saved.restored'), 1600);
      } }
    });
  });

  /* ------------------------------------------------------------------ stations: open / close */
  function setOpen(li, on) {
    if (!li) return;
    li.classList.toggle('is-open', on);
    var h = li.querySelector(':scope > .rm-head');
    if (h && h.tagName === 'BUTTON') h.setAttribute('aria-expanded', on ? 'true' : 'false');
    var b = li.querySelector(':scope > .rm-body');
    if (b) { b.hidden = !on; if (on && M() && M().mount) M().mount(b, { instant: true }); }
    var tl = li.querySelector('.rm-tog-l');
    if (tl) tl.textContent = t(on ? 'plan.close' : 'plan.open');
  }
  /* o: { toggle, scroll, focus } */
  function openStation(key, o) {
    o = o || {};
    var root = view();
    var ol = root && root.querySelector('ol.rm');
    var li = ol && ol.querySelector(':scope > li.rm-st[data-group="' + key + '"]');
    if (!li || !li.querySelector(':scope > .rm-body')) return;
    var W = wide();
    var was = li.classList.contains('is-open');
    var want = o.toggle && !W ? !was : true;
    var m = M();
    var live = !!(m && canAnim());
    var body = li.querySelector(':scope > .rm-body');
    if (W) {
      selKey = key;
      if (was) { if (o.scroll) scrollToStation(li, o); return; }
      var others = Array.prototype.filter.call(ol.querySelectorAll(':scope > li.rm-st.is-open'), function (x) { return x !== li; });
      var swap = function () { others.forEach(function (x) { setOpen(x, false); }); setOpen(li, true); };
      if (live && others.length) {
        var ob = others[0].querySelector(':scope > .rm-body');
        var a = ob ? anim(ob, [{ opacity: 1 }, { opacity: 0 }], { duration: 110, easing: EASE('exit'), fill: 'forwards', key: 'panel' }) : null;
        finished(a).then(function () {
          if (a) try { a.cancel(); } catch (e) { }
          swap();
          anim(body, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE('enter'), fill: 'backwards', key: 'panel' });
          wireFill(root, { from: true });
          if (o.focus) focusBody(li);
        });
      } else {
        swap();
        if (m && !live) anim(body, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' });
        wireFill(root, { from: true });
        if (o.focus) focusBody(li);
      }
      return;
    }
    openKeys[key] = want;
    if (want === was) { if (o.scroll) scrollToStation(li, o); return; }
    var rewire = function () { wireFill(root, { from: true }); };
    if (!live || !m.flip) { setOpen(li, want); if (m && body) anim(body, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' }); rewire(); if (o.scroll) scrollToStation(li, o); return; }
    if (want) {
      m.flip(ol, function () { setOpen(li, true); });
      anim(body, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: 60, easing: EASE('enter'), fill: 'backwards', key: 'fold' });
      rewire();
      if (o.scroll) scrollToStation(li, o);
    } else {
      li.classList.add('is-closing');
      var fa = anim(body, [{ opacity: 1 }, { opacity: 0 }], { duration: 110, easing: EASE('exit'), fill: 'forwards', key: 'fold' });
      finished(fa).then(function () {
        li.classList.remove('is-closing');
        m.flip(ol, function () { setOpen(li, false); });
        if (fa) try { fa.cancel(); } catch (e) { }
        rewire();
      });
    }
  }
  function focusBody(li) {
    var h = li.querySelector('.rm-body-title') || li.querySelector('.rm-body');
    if (!h) return;
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
    focusQuiet(h);
  }
  function flash(el) {
    if (!el || !canAnim()) return;
    var w = document.createElement('span');
    w.className = 'plan-wash';
    w.setAttribute('aria-hidden', 'true');
    el.appendChild(w);
    var a = anim(w, [{ opacity: 0.06 }, { opacity: 0.06, offset: 0.35 }, { opacity: 0 }], { duration: 600, easing: 'linear', fill: 'forwards' });
    finished(a).then(function () { if (w.parentNode) w.parentNode.removeChild(w); });
  }
  function scrollToStation(li, o) {
    var m = M();
    if (m && m.revealAll) { try { m.revealAll(li); } catch (e) { } }
    var smooth = !reduced();
    var target = wide() ? (li.querySelector(':scope > .rm-body') || li) : (li.querySelector(':scope > .rm-head') || li);
    try { target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }); } catch (e) { target.scrollIntoView(); }
    if (o && o.focus) focusBody(li);
    if (!smooth) return;
    var body = li.querySelector(':scope > .rm-body > .rm-body-in') || li;
    var fired = false;
    var go = function () { if (fired) return; fired = true; window.removeEventListener('scrollend', go); flash(body); };
    if ('onscrollend' in window) window.addEventListener('scrollend', go, { once: true });
    setTimeout(go, 700);
  }
  SM.on('plan-open', function (el) { openStation(el.getAttribute('data-key'), { toggle: true }); });
  SM.on('plan-jump', function (el) { openStation(el.getAttribute('data-key'), { scroll: true, focus: true }); });

  /* ------------------------------------------------------------------ track switch */
  var switchGen = 0;
  SM.on('plan-track', function (el) {
    var v = el.getAttribute('data-value');
    if (v !== 'junior' && v !== 'leaving') return;
    if (curTrack() === v) return;
    SM.store.set('plan:track', v);
    selKey = null; openKeys = {};
    var root = view();
    if (!root || !root.querySelector('.plan-rm')) { calm = true; SM.render(); return; }
    Array.prototype.forEach.call(root.querySelectorAll('.plan-track > button'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-value') === v ? 'true' : 'false');
    });
    var model = build({ track: v });
    lastModel = model;
    var gen = ++switchGen;
    var m = M();
    var live = !!(m && canAnim());
    var dir = v === 'leaving' ? 1 : -1;
    var old = root.querySelector('.plan-rm');
    var eDone = root.querySelector('#plan-prog-done'), eTotal = root.querySelector('#plan-prog-total');
    var land = function () {
      if (gen !== switchGen || !old.isConnected) return;
      var tmp = document.createElement('div');
      tmp.innerHTML = bodyHtml2(model);
      var nb = tmp.firstElementChild;
      old.parentNode.replaceChild(nb, old);
      applyRuby(nb);
      if (m && m.mount) m.mount(nb, { instant: true });
      if (m && m.seen) {
        var nEl = nb.querySelector('#plan-count-n[data-n]');
        if (nEl) m.seen('plan.days.' + model.track, +nEl.getAttribute('data-n'));
        m.seen('plan.done.' + model.track, model.done);
      }
      rollNum(eDone, model.done); rollNum(eTotal, model.total);
      wireFill(root, { entrance: true });
      var pp = root.querySelector('.plan-print');
      if (pp) pp.innerHTML = '';
      if (live) {
        anim(nb, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: EASE('enter'), fill: 'backwards', key: 'slideO' });
        anim(nb, [{ transform: 'translateX(' + (48 * dir) + 'px)' }, { transform: 'none' }], { spring: 'rise', fill: 'backwards', key: 'slide' });
      } else if (m) anim(nb, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' });
    };
    if (!live) { land(); return; }
    var a = anim(old, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (-40 * dir) + 'px)' }], { duration: 180, easing: EASE('exit'), fill: 'forwards', key: 'slide' });
    if (!a) { land(); return; }
    finished(a).then(land);
  });
  function textOf(el) { return el ? (el._smOdoShown != null ? el._smOdoShown : el.textContent) : ''; }

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
      var onOpt = false;
      var opts = [[y0, 'plan.jr.g3'], [y0 + 1, 'plan.jr.g2'], [y0 + 2, 'plan.jr.g1']].map(function (o) {
        var v = o[0] + '-04-01';
        var on = !ei.assumed && state().hsDate === v; if (on) onOpt = true;
        return optRow(t('plan.jr.date.opt', { y: o[0] }), t('plan.jr.date.optSub', { g: t(o[1]) }), 'plan-date-quick', v, on);
      }).join('');
      var ownJ = !ei.assumed && !onOpt;
      html = '<div class="plan-date-sheet stack">' + '<p class="plan-date-def">' + esc(t('plan.jr.def')) + '</p>' +
        '<div class="stack-sm"><p class="plan-date-qlabel">' + esc(t('plan.jr.date.quick')) + '</p><div class="opts plan-date-opts">' + opts +
          optRow(t('plan.jr.date.unknown'), t('plan.jr.date.unknownSub'), 'plan-date-unknown', '', ei.assumed) + '</div></div>' +
        '<div class="field"><label for="plan-date-input">' + esc(t('plan.jr.date.field')) + '</label>' +
        '<input type="date" class="input" id="plan-date-input" min="2000-01-01" max="2100-12-31" value="' + (ownJ ? esc(iso(ei.date)) : '') + '">' +
        '<p class="help">' + esc(t('plan.date.help')) + '</p></div>' +
        SM.ui.button(t('plan.date.save'), { act: 'plan-date-save', variant: 'primary', size: 'lg', block: true, arrow: true }) +
        '</div>';
      SM.sheet(html, { title: t('plan.jr.date.title'), cls: 'v-plan plan-sheet', mount: dateSheetWire });
      return;
    }
    var li = leaveInfo();
    var y1 = assumedLeave(now, null).getFullYear();
    var onChip = false;
    var quick = [y1, y1 + 1].map(function (y) {
      var v = y + '-03-31';
      var on = !li.assumed && state().leaveDate === v; if (on) onChip = true;
      return SM.ui.chip(t('plan.date.fy', { y: y }), { act: 'plan-date-quick', pressed: on, attrs: 'data-value="' + v + '"' });
    }).join('');
    // FIX-B (F15): the field holds a date only when that date is the choice (not a chip, not 「まだ決まっていない」)
    var own = !li.assumed && !onChip;
    // what 巣立ちの日 means lives here, next to where it is set (it was a 「くわしく」 on the page)
    html = '<div class="plan-date-sheet stack">' + '<p class="plan-date-def">' + esc(t('plan.leave.def')) + '</p>' +
      '<div class="field"><label for="plan-date-input">' + esc(t('plan.date.field')) + '</label>' +
      '<input type="date" class="input" id="plan-date-input" min="2000-01-01" max="2100-12-31" value="' + (own ? esc(iso(li.date)) : '') + '">' +
      '<p class="help">' + esc(t('plan.date.help')) + '</p></div>' +
      '<div class="stack-sm"><p class="plan-date-qlabel">' + esc(t('plan.date.quick')) + '</p><div class="chips plan-date-chips">' + quick + '</div></div>' +
      SM.ui.button(t('plan.date.save'), { act: 'plan-date-save', variant: 'primary', size: 'lg', block: true, arrow: true }) +
      '<div class="opts">' + optRow(t('plan.date.unknown'), t('plan.date.unknownSub'), 'plan-date-unknown', '', li.assumed) + '</div>' +
      '</div>';
    // FIX-B (F15): no autofocus on the date field (it opened the picker / keyboard over the sheet on phones)
    SM.sheet(html, { title: t('plan.date.title'), cls: 'v-plan plan-sheet', mount: dateSheetWire });
  });
  /* typing a date of one's own un-chooses the quick picks */
  function dateSheetWire(dlg) {
    var inp = dlg && dlg.querySelector ? dlg.querySelector('#plan-date-input') : document.getElementById('plan-date-input');
    if (!inp) return;
    inp.addEventListener('input', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.plan-date-sheet [aria-pressed="true"]'), function (b) { b.setAttribute('aria-pressed', 'false'); b.classList.remove('is-selected'); });
    });
  }

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
    var ln = r2 && r2.querySelector('[data-m="ln"]');
    if (ln && m && oldTxt && ln.textContent !== oldTxt && /\d/.test(oldTxt) && m.odometer) m.odometer(ln, ln.textContent, { from: oldTxt, duration: 640 });
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
  function removeTlRows(root, id) {
    var m = M();
    var rows = tlRowsOf(root, id);
    Array.prototype.forEach.call(rows, function (li) {
      var ul = li.parentNode;
      var go = function () {
        li.parentNode.removeChild(li);
        if (ul && !ul.children.length && ul.parentNode) ul.parentNode.removeChild(ul);
      };
      var on = ul && ul.offsetParent !== null;
      if (m && m.flip && canAnim() && ul && on) m.flip(ul, go); else go();
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
  /* the saved list changing height moves what follows it (phone: nothing after it but the note; desktop: the
     column's own rows); the roadmap's open panel is untouched */
  var FLOW_FLIP = ':scope > *, #plan-saved .section-rule, #plan-saved .plan-saved-list > *';
  var lastRemoved = null;
  SM.on('plan-remove', function (el) {
    var id = el.getAttribute('data-id');
    var i = (state().saved || []).indexOf(id);
    if (i === -1) return;
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
    var apply = function () {
      if (!root || !root.isConnected || !isPlanRoute()) return;
      var nEl = root.querySelector('#plan-saved .plan-saved-n');
      var nVis = !!nEl && nEl.offsetParent !== null;
      var subEl = empty && live ? root.querySelector('#plan-saved .section-sub') : null;
      var subR = subEl ? subEl.getBoundingClientRect() : null, subCs = subEl ? getComputedStyle(subEl) : null;
      var subSt = subCs ? { font: subCs.font, color: subCs.color, letterSpacing: subCs.letterSpacing } : null;
      var actEl = subEl ? root.querySelector('#plan-saved .section-head .section-action') : null;
      var actR = actEl ? actEl.getBoundingClientRect() : null, actCs = actEl ? getComputedStyle(actEl) : null;
      var actSt = actCs ? { font: actCs.font, color: actCs.color, letterSpacing: actCs.letterSpacing } : null;
      var change = function () {
        if (row && row.parentNode) row.parentNode.removeChild(row);
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
        var target = next && next.isConnected ? next.querySelector('.plan-remove') : null;
        if (!target) {
          target = root.querySelector('#plan-saved-h');
          if (target && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        }
        var ae = document.activeElement;
        if (!ae || ae === document.body || !ae.isConnected || (row && row.contains(ae))) focusQuiet(target);
      };
      var flow = root.querySelector('.plan-flow');
      if (flow && live) m.flip(flow, change, { selector: FLOW_FLIP }); else change();
      removeTlRows(root, id);
      afterPaint(function () { if (root.isConnected && isPlanRoute()) { refreshCounts(); wireFill(root, { from: true }); } });
    };
    if (live && row) {
      row.style.pointerEvents = 'none';
      var fa = anim(row, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: EASE('exit'), fill: 'forwards' });
      finished(fa).then(function () { row.style.opacity = '0'; row.style.visibility = 'hidden'; apply(); });
    } else apply();
    if (SM.updateBadge) SM.updateBadge({ roll: true });
    try { document.dispatchEvent(new CustomEvent('sm:save', { detail: { id: id, saved: false, undo: false } })); } catch (e) { }
    var rec = lastRemoved;
    SM.toast(t('plan.saved.removed', { name: name }), { action: { label: t('plan.saved.undo'), fn: function () { undoRemove(rec); } } });
  });

  /* the roadmap's stations get their rows back in place (open states kept) */
  function rebuildRoadmap(root, model) {
    var ol = root.querySelector('ol.rm');
    if (!ol) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = roadmapHtml(model);
    var nol = tmp.firstElementChild;
    applyRuby(nol);
    ol.parentNode.replaceChild(nol, ol);
    var m = M();
    if (m && m.mount) m.mount(nol, { instant: true });
  }
  function undoRemove(rec) {
    if (!rec) return;
    var saved = state().saved || (state().saved = []);
    if (saved.indexOf(rec.id) === -1) saved.splice(Math.min(rec.index, saved.length), 0, rec.id);
    SM.save();
    var notify = function () {
      if (SM.updateBadge) SM.updateBadge({ roll: true });
      try { document.dispatchEvent(new CustomEvent('sm:save', { detail: { id: rec.id, saved: true, undo: true } })); } catch (e) { }
    };
    var root = view();
    if (!root) { notify(); SM.toast(t('plan.saved.restored'), 1600); return; }
    var model = build();
    lastModel = model;
    var m = M();
    var live = m && m.flip && canAnim();
    var sec = root.querySelector('#plan-saved');
    var nEl0 = root.querySelector('#plan-saved .plan-saved-n');
    var nVis = !!nEl0 && nEl0.offsetParent !== null;
    var row = null, back = null;
    var emp0 = live && sec ? sec.querySelector('.plan-saved-empty') : null;
    var empR = emp0 ? emp0.getBoundingClientRect() : null;
    var change = function () {
      if (!sec) return;
      var list = sec.querySelector('.plan-saved-list');
      var rowsHtml = model.saved.map(function (p) { return savedRowHtml(p, model); }).join('');
      if (list) {
        var have = {};
        Array.prototype.forEach.call(list.children, function (r) { have[r.getAttribute('data-flip-key')] = r; });
        var p = SM.program(rec.id);
        if (have[rec.id] || !p || model.saved.length !== list.children.length + 1) {
          list.innerHTML = rowsHtml; applyRuby(list); if (m && m.mount) m.mount(list, { instant: true });
        } else {
          var tmp = document.createElement('div');
          tmp.innerHTML = savedRowHtml(p, model);
          back = tmp.firstElementChild;
          applyRuby(back);
          var ids = model.saved.map(function (x) { return x.id; });
          var nextId = ids[ids.indexOf(rec.id) + 1];
          list.insertBefore(back, (nextId && have[nextId]) || null);
          if (m && m.mount) m.mount(back, { instant: true });
          if (live) anim(back, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: 180, easing: EASE('enter'), fill: 'backwards' });
        }
      } else {
        var emp = sec.querySelector('.plan-saved-empty');
        var tmp2 = document.createElement('div');
        tmp2.innerHTML = '<div class="pcards plan-saved-list">' + rowsHtml + '</div>';
        var nl = tmp2.firstElementChild;
        applyRuby(nl);
        if (emp && empR) fadeGhost(emp, empR, null, 90);
        if (emp) sec.replaceChild(nl, emp); else sec.appendChild(nl);
        if (m && m.mount) m.mount(nl, { instant: true });
        if (live) anim(nl, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 80, easing: EASE('standard'), fill: 'backwards' });
      }
      savedHeadSync(root, model, nVis);
      row = root.querySelector('.plan-saved-item[data-flip-key="' + (window.CSS && CSS.escape ? CSS.escape(rec.id) : rec.id) + '"]');
      if (row) focusQuiet(row.querySelector('.plan-remove'));
    };
    var flow = root.querySelector('.plan-flow');
    if (flow && live) m.flip(flow, change, { selector: FLOW_FLIP }); else change();
    var later = function () {
      if (!root.isConnected || !isPlanRoute()) return;
      rebuildRoadmap(root, build());
      refreshCounts();
      wireFill(root, { from: true });
    };
    if (live) afterPaint(later); else later();
    if (row) {
      var mark = row.querySelector('.pcard-mark > .cat-icon') || row.querySelector('.pcard-mark');
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
    var real = planEvents(model, false);
    var plainOn = icsPlain();
    var show = real.slice(0, 5);
    var list = '<ul class="ics-list">' + show.map(function (ev, i) {
      var fileAs = evs[i] ? evs[i].summary : '';
      return '<li><span class="ics-date num"><b>' + esc(fmtShort(ev.date)) + '</b><small>' + esc(String(ev.date.getFullYear())) + '</small></span><span class="ics-text"><span class="ics-sum">' + esc(ev.summary) + '</span>' +
        '<small class="ics-file"' + (plainOn ? '' : ' hidden') + '>' + esc(t('plan.ics.fileAs', { s: fileAs })) + '</small></span></li>';
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
    // FIX-B (F39): the real titles stay; the 「ファイルでは…」 line under each shows or goes
    var files = document.querySelectorAll('.plan-sheet .ics-list .ics-file');
    Array.prototype.forEach.call(files, function (f, i) {
      if (evs[i]) f.textContent = t('plan.ics.fileAs', { s: evs[i].summary });
      var show = !!el.checked;
      if (show && f.hidden) { f.hidden = false; if (canAnim()) anim(f, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 200, delay: i * 30, easing: EASE('enter'), fill: 'backwards' }); }
      else if (!show) f.hidden = true;
    });
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
