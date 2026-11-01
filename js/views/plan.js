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
    'plan.leave.def': { ja: '巣立ちの日＝施設や里親家庭を出て、自分で暮らしはじめる日。', jr: '巣立ちの日＝施設や里親の家を出て、ひとりで暮らしはじめる日。', en: 'Leaving day = the day you move out of care and start living on your own.' },
    'plan.count.k': { ja: '巣立ちまで', en: 'Until you leave' },
    'plan.count.kAfter': { ja: '巣立ってから', en: 'Since you left' },
    'plan.count.unit': { ja: '日', en: 'days' },
    'plan.count.unit1': { ja: '日', en: 'day' },
    'plan.count.pre': { ja: '', en: '' },
    'plan.count.todayK': { ja: '巣立ちの日は', en: 'Your leaving day is' },
    'plan.count.todayBig': { ja: '今日', en: 'Today' },
    'plan.count.todaySub': { ja: 'ここからがスタート。', en: 'This is where it starts.' },
    'plan.assumed': { ja: '仮の日付', en: 'Date not set yet' },
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
    'plan.jr.note': { ja: '時期は目安。日にちは学校の案内で確かめてね。', jr: '時期はだいたいの目安。日にちは学校の案内でたしかめてね。', en: 'Timing is a guide. Check dates with your school.' },
    'plan.jr.date.title': { ja: '高校入学の日', en: 'When high school starts' },
    'plan.jr.date.field': { ja: '高校に入学する日（入学式の日でもOK）', en: 'The day you start high school (the entrance ceremony is fine)' },
    'plan.jr.date.quick': { ja: 'いまの学年からえらぶ', en: 'Pick by your grade now' },
    'plan.jr.date.opt': { ja: '{y}年4月', en: 'April {y}' },
    'plan.jr.date.optSub': { ja: 'いま{g}', en: 'In {g} now' },
    'plan.jr.date.unknown': { ja: 'まだわからない', en: 'Not sure yet' },
    'plan.jr.date.unknownSub': { ja: '答えた学年から計算します', en: 'We will work it out from your grade' },
    'plan.jr.date.saved': { ja: '高校入学を{date}にしました', en: 'High school start set to {date}' },

    'plan.date.title': { ja: '巣立ちの日', en: 'Leaving day' },
    'plan.date.field': { ja: '施設や家を出る日（予定でOK）', jr: '施設や家を出る日（予定でOK）', en: 'The day you leave (a planned date is fine)' },
    'plan.date.help': { ja: 'あとで何度でも変えられます。この日はこのスマホの中だけに保存されます。', jr: 'あとで何度でも変えられます。このスマホの中だけに残ります。', en: 'You can change it any time. It is saved only on this phone.' },
    'plan.date.save': { ja: 'この日にする', en: 'Use this date' },
    'plan.date.quick': { ja: 'よくある日', en: 'Common dates' },
    'plan.date.unknown': { ja: 'まだ決まっていない', jr: 'まだ決まっていない', en: 'Not decided yet' },
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
    'plan.now.lateB': { ja: '巣立ちから時間がたっていても、使える支援はあります。', jr: '巣立ってから時間がたっていても、使える支援はあります。', en: 'Even long after leaving, there is support you can use.' },
    'plan.now.jrLateT': { ja: '高校生活が、はじまっています', en: 'High school is under way' },
    'plan.now.consult': { ja: '相談先を見る', en: 'Get help' },
    'plan.all.t': { ja: 'ぜんぶできました', en: 'All done' },
    'plan.all.b': { ja: 'よくがんばりました。', en: 'Well done.' },

    'plan.act.ics': { ja: 'カレンダーに入れる', en: 'Add to calendar' },
    'plan.act.icsSub': { ja: 'やることの日をスマホのカレンダーへ', jr: 'やることの日をスマホのカレンダーに入れる', en: 'Put your to-do dates in your phone' },
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
    'plan.tl.pastNote': { ja: 'すぎていても、やる価値があります。', jr: 'すぎていても、やっておくといいです。', en: 'Still worth doing, even now.' },
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
    'plan.tl.note': { ja: '時期は目安。職員や先生と調整してね。', jr: '時期はだいたいの目安。先生や職員と相談してね。', en: 'Timing is a guide. Adjust it with staff.' },
    /* v9 POLISH: what a tick moved, said in the row itself (the toast no longer covers the next task) */
    'plan.echo.left': { ja: 'あと{n}つ', jr: 'あと{n}つ', en: '{n} left' },
    'plan.echo.left1': { ja: 'あと1つ', jr: 'あと1つ', en: '1 left' },
    'plan.echo.all': { ja: 'この駅はぜんぶできた', jr: 'この駅はぜんぶできた', en: 'This stop is done' },
    'plan.echo.undo': { ja: 'できた：{t}。戻すにはもう一度チェック', en: 'Done: {t}. Tick again to undo' },

    'plan.ics.title': { ja: 'カレンダーに入れる', en: 'Add to calendar' },
    'plan.ics.lead': { ja: 'これからの予定 {n}件を、カレンダー用のファイルにしました。', jr: 'これからの予定{n}こを、カレンダーに入れられるファイルにしました。', en: 'We made a calendar file with your {n} upcoming dates.' },
    'plan.ics.none': { ja: 'これから先の予定がありません', en: 'No upcoming dates' },
    'plan.ics.noneBody': { ja: 'ぜんぶチェック済みか、日付がすぎています。日付を変えると予定が変わります。', en: 'Everything is ticked or in the past. Changing the date moves the plan.' },
    'plan.ics.more': { ja: 'ほか {n}件', en: '+{n} more' },
    'plan.ics.save': { ja: 'カレンダー用ファイルを保存', en: 'Save the calendar file' },
    'plan.ics.saveIOS': { ja: 'カレンダーに追加する', en: 'Add to Calendar' },
    'plan.ics.how': { ja: '入れ方', en: 'How to add' },
    'plan.ics.howIOS': { ja: 'iPhone：ボタンを押す →「すべてを追加」。ファイルとして保存されたら、「ファイル」アプリで開きます。', en: 'iPhone: tap the button → “Add All”. If it saves as a file, open it from the Files app.' },
    'plan.ics.howAndroid': { ja: 'Android：保存したファイル（.ics）をタップして、カレンダーアプリを選びます。', en: 'Android: tap the saved .ics file and choose your calendar app.' },
    'plan.ics.howPC': { ja: 'パソコン：Googleカレンダーの「設定 → インポート」からも入れられます。', en: 'Computer: in Google Calendar, use Settings → Import.' },
    'plan.ics.privacy': { ja: 'ファイルはこのスマホの中でつくっています。どこにも送りません。', jr: 'ファイルはこのスマホの中でつくります。どこにも送りません。', en: 'The file is made on this phone. Nothing is sent anywhere.' },
    'plan.ics.alarm': { ja: '前の日の朝9時に通知が出ます。', jr: '前の日の朝9時にお知らせが出ます。', en: 'You get a reminder at 9am the day before.' },
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
    'plan.ics.plainSub': { ja: 'ロック画面や共有のカレンダーで見られても、施設や制度のことがわからない名前にします', jr: 'ほかの人に見られても、施設や支援のことがわからない名前にします', en: 'Lock screens and shared calendars won\'t show anything about care or benefits' },
    'plan.ics.plainCal': { ja: '予定', en: 'Plans' },
    'plan.ics.plainLeave': { ja: '準備：大事な日', en: 'Prep: big day' },
    'plan.ics.plainGroup': { ja: '準備：やることを確認', en: 'Prep: check my list' },
    'plan.ics.plainProg': { ja: '準備：手続きの確認', en: 'Prep: paperwork check' },
    'plan.ics.plainDesc': { ja: 'くわしくは、保存したリストを見てください。', en: 'See your saved list for details.' },
    'plan.ics.cloud': { ja: 'スマホのカレンダーは、GoogleやiCloudに自動で同期されることがあります。家族や職員と共有しているカレンダーには入れないでください。', jr: 'スマホのカレンダーは、GoogleやiCloudに自動でコピーされることがあります。家の人や職員といっしょに使っているカレンダーには入れないでください。', en: 'Phone calendars may sync to Google or iCloud. Don\'t add this to a calendar you share with family or staff.' },

    'plan.sheet.title': { ja: '相談シート', en: 'Talk sheet' },
    'plan.sheet.lead': { ja: '職員・先生・窓口の人に見せるためのメモです。名前は入りません。', jr: '先生や職員、窓口の人に見せるメモです。名前は入りません。', en: 'A note to show staff, a teacher or a support desk. Your name is not included.' },
    'plan.sheet.memo': { ja: '自分のメモ（書かなくてOK）', en: 'Your note (optional)' },
    'plan.sheet.memoPh': { ja: '例：4月から専門学校。家賃が心配。電話が苦手なので、いっしょに来てほしい。', jr: '例：高校のお金が心配。塾代の支援のことを聞きたい。', en: 'e.g. Starting college in April. Worried about rent. Phone calls are hard, can someone come with me?' },
    'plan.sheet.memoHelp': { ja: 'このスマホの中だけに保存されます。', en: 'Saved only on this phone.' },
    'plan.sheet.preview': { ja: 'シートの中身', en: 'What the sheet says' },
    'plan.sheet.copy': { ja: 'コピーする', en: 'Copy' },
    'plan.sheet.copiedShort': { ja: 'コピーしました', en: 'Copied' },
    'plan.sheet.copied': { ja: '相談シートをコピーしました。LINEやメールに貼れます', en: 'Copied. You can paste it into LINE or email' },
    'plan.sheet.print': { ja: '印刷する', en: 'Print' },
    'plan.sheet.emptyHint': { ja: '支援を保存したり、質問に答えたりすると、シートの中身が増えます。', jr: '支援を保存したり、質問に答えたりすると、シートに書くことが増えます。', en: 'Save programs or answer the questions to fill the sheet.' },
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

  /* v9 EXTRAS: 自分のやること — SM.store 'plan:own' = [{ id, group, text, done }] (this phone only) */
  function ownList() {
    var v = SM.store.get('plan:own', null);
    if (!Array.isArray(v)) return [];
    return v.filter(function (o) { return o && typeof o === 'object' && typeof o.id === 'string' && typeof o.group === 'string' && typeof o.text === 'string'; });
  }
  function setOwnList(list) { SM.store.set('plan:own', list); }
  function ownOf(id) { return ownList().filter(function (o) { return o.id === id; })[0] || null; }
  function isOwnKey(key) { return typeof key === 'string' && key.indexOf('own:') === 0; }
  function isDone(key) {
    if (isOwnKey(key)) { var o = ownOf(key.slice(4)); return !!(o && o.done); }
    return (state().done || []).indexOf(key) !== -1;
  }
  function setDone(key, on) {
    if (isOwnKey(key)) {
      var id = key.slice(4), list = ownList();
      list.forEach(function (o) { if (o.id === id) o.done = !!on; });
      setOwnList(list);
      return;
    }
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
    // and whenever the junior track is on (so it can always be switched back). v9 INTEGRATOR: someone who just
    // answered Q1 (高校生 → pref set, stage still null) chose the track there; the switch stays out of their way.
    // (a 中学生 who just answered Q1 is being asked the grade: the switch waits until that is answered too)
    var asking = !stage && pref && started();
    var show = (jr || stage === 'nohs' || track === 'junior' || !stage) && !asking;
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
  /* v9 INTEGRATOR: an override carries its own short contract (title / why / who / say) so the drawer is as full
     outside Tokyo as inside it; a field left out keeps the data's. `due` is dropped unless the override says 'keep'
     (Tokyo-only dates never travel). */
  var LOCAL_TASK = {
    'tl:start': { ja: '住む都県に、ひとり暮らしをはじめるときの支援があるか聞く', en: 'Ask whether your prefecture has support for starting life on your own',
      title: { ja: '引っ越し代の支援を職員に聞く', jr: '引っ越し代の制度を聞く', en: 'Ask staff about moving-cost help' },
      why: { ja: '住む都県にも、引っ越し代などを借りられる支援があることがあります。', jr: '住む県にも、引っ越し代をかりられる支援があることがあります。', en: 'Your prefecture may also have support that lends moving costs and more.' },
      who: 'staff',
      say: { ja: '「住む都県に、引っ越し代を借りられる支援はありますか？」', jr: '「住む県に、引っ越し代をかりられる支援はありますか？」', en: 'Does my prefecture have support that lends moving costs?' } },
    'jr:challenge': { ja: '塾代や受験料が心配なら、区市町村の窓口で使える支援がないか聞く', jr: '塾代や受験料が心配なら、窓口で支援がないか聞く', en: 'Worried about cram school or exam fees? Ask your city office what help there is',
      title: { ja: '塾代の支援を窓口で聞く', jr: '塾代の助けを窓口で聞く', en: 'Ask the city about cram-school help' },
      why: { ja: '塾代や受験料の支援は、住む区市町村によってちがいます。', jr: '塾代や受験料の助けは、住む市や区によってちがいます。', en: 'Help with cram-school and exam fees differs from city to city.' },
      who: 'city',
      say: { ja: '「塾代や受験料の支援は、この市にありますか？」', jr: '「塾代や受験料の助けは、この市にありますか？」', en: 'Does this city have help with cram-school or exam fees?' } },
    'jr:hikaku': { ja: '公立と私立で、授業料と支援がどうちがうか知る', jr: '公立と私立で、お金がどうちがうか知る', en: 'Learn how tuition and support differ between public and private schools',
      title: { ja: '公立と私立のお金のちがいを知る', jr: '公立と私立のお金をくらべる', en: 'Compare public and private costs' },
      why: { ja: '公立の授業料は就学支援金で実質0円。私立にも国の支援があります。', jr: '公立の授業料は実質0円。私立にも国の助けがあります。', en: 'Public tuition is effectively ¥0 with tuition support, and private schools get national support too.' },
      who: 'self' },
    'jr:ryoshusho': HIDE, 'jr:jukenryo': HIDE, 'jr:ryoshusho2': HIDE, 'jr:menjo': HIDE,
    'jr:nyugaku': { ja: '合格したら入学の手続き。入学料の金額と払う期限を、合格の案内で確かめる', jr: '合格したら、入学の手つづき。入学料の期限をたしかめる', en: 'After passing, enrol. Check the entry fee and when it is due in your acceptance papers',
      title: { ja: '合格したら入学の手続きをする', jr: '合格したら入学の手つづき', en: 'After passing, do the entry paperwork' },
      why: { ja: '入学料の金額と払う期限は、合格の案内で確かめます。', jr: '入学料と、はらう期限は、合格の案内でたしかめます。', en: 'The entry fee and its deadline are in your acceptance papers.' },
      who: 'school',
      say: { ja: '「入学の手続きで、いつまでに何を出して、いくら払いますか？」', jr: '「入学の手つづきで、いつまでに何を出しますか？」', en: 'For enrolment, what do I hand in, by when, and how much do I pay?' } },
    'jr:shugakushien': { ja: '学校から案内が来たら「就学支援金」を申請する', en: 'When school sends instructions, apply for the tuition support fund', due: 'keep' },
    'jr:souki': { ja: '奨学給付金の「新入生の早めの申請」ができるか、学校に聞く', jr: '奨学給付金を早めにもらえるか、学校に聞く', en: 'Ask school whether you can claim the scholarship benefit early as a new student',
      why: { ja: '教科書代などの「奨学給付金」を、新入生だけ早めにもらえる都県があります。', jr: '教科書代などの「奨学給付金」を、1年生だけ早めにもらえる県があります。', en: 'Some prefectures let new students claim part of the scholarship benefit early.' },
      say: { ja: '「奨学給付金の新入生の早期給付は、ありますか？」', jr: '「奨学給付金を早めにもらう申しこみは、ありますか？」', en: 'Is there an early payment of the scholarship benefit for new students?' } },
    'jr:kyufukin': { ja: '「奨学給付金」を申請する（時期と方法は、学校や都県の案内で確かめる）', jr: '「奨学給付金」を申請する', en: 'Apply for the scholarship benefit (check when and how with your school or prefecture)' },
    'jr:shiritsu': { ja: '私立高校の人は、住む都県に授業料の独自の支援があるか、学校に聞く', jr: '私立の人は、授業料の支援があるか学校に聞く', en: 'At a private school? Ask whether your prefecture adds its own tuition support',
      title: { ja: '私立の授業料の支援を学校に聞く', jr: '私立の授業料の助けを聞く', en: 'Private school? Ask about tuition help' },
      why: { ja: '私立高校には、国の支援に都県が足す授業料の支援があることがあります。', jr: '私立の授業料には、国の助けに県が足す助けがあることがあります。', en: 'Some prefectures add their own tuition support on top of the national one.' },
      who: 'school',
      say: { ja: '「私立の授業料に、住む県の支援はありますか？」', jr: '「私立の授業料に、県の助けはありますか？」', en: 'Does my prefecture add tuition support for private schools?' } },
    'jr:maitoshi': { ja: '奨学給付金は毎年の申請が必要。就学支援金も、学校から案内が来たら必ず手続きする', jr: '給付金の申請は毎年。来年の分もカレンダーに入れる', en: 'The scholarship benefit needs a new application every year. For the tuition support fund, always act when school sends instructions',
      why: { ja: '奨学給付金は毎年の申請が必要で、忘れた年はもらえません。', jr: '給付金の申しこみは毎年あって、わすれた年はもらえません。', en: 'The benefit needs a fresh application every year; a missed year is money lost.' } }
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
    return { id: tk.id, ja: o.ja, jr: o.jr || o.ja, en: o.en, p: tk.p, paths: tk.paths, href: tk.href, hrefLabel: tk.hrefLabel,
      title: o.title || tk.title, why: o.why || tk.why, who: o.who || tk.who, say: o.say || tk.say, due: o.due === 'keep' ? tk.due : (o.due || null) };
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
  /* v9 task states beyond done: SM.store 'plan:skip' = { doneKey: 'na' | 'later' } (自分には関係ない / あとで) */
  function skipMap() { var v = SM.store.get('plan:skip', null); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
  function setSkip(key, val) {
    var m = skipMap();
    if (val) m[key] = val; else delete m[key];
    SM.store.set('plan:skip', m);
  }
  function WHO() { return ['staff', 'teacher', 'city', 'jiso', 'school', 'self', 'org']; }
  /* the task contract (SPEC-v9): title / why / who / say / due are optional; the long line (ja/en) stays the fallback */
  function mkTask(key, tk) {
    var title = tk.title ? L(tk.title) : '';
    var who = typeof tk.who === 'string' && WHO().indexOf(tk.who) !== -1 ? tk.who : null;
    return {
      key: key, kind: 'task', text: L(tk), title: title || L(tk), hasTitle: !!title,
      why: tk.why ? L(tk.why) : '', who: who, say: tk.say ? L(tk.say) : '', due: tk.due && typeof tk.due === 'object' ? tk.due : null,
      href: tk.href || null, hrefLabel: tk.hrefLabel ? L(tk.hrefLabel) : '', p: ownIds(tk.p).filter(usable), done: isDone(key),
      skip: skipMap()[key] || null
    };
  }
  /* いつまで: an offset from the anchor date (巣立ちの日 / 高校入学) or a plain text */
  function dueText(due, model) {
    if (!due) return '';
    if (due.kind === 'text') return L(due);
    if (due.kind === 'offset' || typeof due.days === 'number' || typeof due.months === 'number') {
      var d = model.anchor;
      if (typeof due.months === 'number') d = addMonths(d, due.months);
      if (typeof due.days === 'number') d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + due.days);
      var n = daysBetween(d, model.anchor), jr = model.track === 'junior';
      if (n === 0) return t('plan.due.on', { date: fmtDate(d) });
      return t(n > 0 ? (jr ? 'plan.due.jrBefore' : 'plan.due.before') : (jr ? 'plan.due.jrAfter' : 'plan.due.after'), { date: fmtDate(d), n: fmtNum(Math.abs(n)) });
    }
    return L(due);
  }
  /* 自分には関係ない leaves the group (kept in g.na); あとで moves the task to the next station that has tasks */
  function applySkips(groups) {
    groups.forEach(function (g) {
      g.na = g.tasks.filter(function (x) { return x.skip === 'na'; });
      g.tasks = g.tasks.filter(function (x) { return x.skip !== 'na'; });
    });
    var moves = [];
    groups.forEach(function (g, i) {
      g.tasks.forEach(function (x) {
        if (x.skip !== 'later') return;
        for (var j = i + 1; j < groups.length; j++) {
          if (groups[j].tasks.length) { moves.push({ x: x, from: g, to: groups[j] }); return; }
        }
        x.skip = null;   // the last station with tasks: nowhere later to go
      });
    });
    moves.forEach(function (mv) {
      mv.from.tasks.splice(mv.from.tasks.indexOf(mv.x), 1);
      mv.x.moved = { key: mv.from.key, title: mv.from.short || mv.from.title, when: mv.from.when };
      mv.to.tasks.push(mv.x);
    });
  }

  /* an own task as a row (kind 'own'): the text is its title; the drawer is the edit form */
  function mkOwn(o) {
    return { key: 'own:' + o.id, id: o.id, kind: 'own', own: true, text: o.text, title: o.text, hasTitle: true, why: '', who: null, say: '', due: null,
      href: null, hrefLabel: '', p: [], done: !!o.done, skip: null };
  }
  function addOwnTasks(groups) {
    var own = ownList();
    if (!own.length) return;
    groups.forEach(function (g) { own.forEach(function (o) { if (o.group === g.key) g.tasks.push(mkOwn(o)); }); });
  }
  /* v9 EXTRAS: already left (stage left0/left1, or the leaving day is in the past) */
  var PULL = ['kokuho', 'nenkin', 'kyoten', 'renraku'];   // still useful after leaving: 国保 · 年金 · 帰る場所 · 連絡先
  function leftMode(track, anchor, now) {
    if (track !== 'leaving') return false;
    var st = answers().stage;
    return st === 'left0' || st === 'left1' || anchor < now;
  }
  /* the still-useful items from the stations before the sign move into いま (or under the end row when long after) */
  function pullLeft(groups, cur, beyond) {
    var mi = -1;
    groups.forEach(function (g, i) { if (g.milestone) mi = i; });
    if (mi === -1 || cur <= mi) return [];
    var target = beyond ? null : groups[cur];
    var pulled = [];
    for (var j = 0; j <= mi; j++) {
      var g = groups[j];
      g.tasks.slice().forEach(function (x) {
        var id = x.key.split(':')[2];
        if (x.done || x.own || x.moved || PULL.indexOf(id) === -1) return;
        g.tasks.splice(g.tasks.indexOf(x), 1);
        x.pulled = { key: g.key, title: g.name };
        x.moved = null;
        pulled.push(x);
      });
    }
    if (target) { target.tasks = target.tasks.concat(pulled); target.pulled = pulled.length; }
    return pulled;
  }

  function leavingGroups(leave) {
    var path = answers().path;
    return timelineOf('leaving').map(function (g) {
      var date = addMonths(leave, g.m);
      var tasks = (g.tasks || []).filter(taskFilter(path)).map(function (tk) { return localTask('tl:', tk); }).filter(Boolean)
        .map(function (tk) { return mkTask('tl:' + g.m + ':' + tk.id, tk); });
      var short = g.short ? L(g.short) : '';
      return {
        m: g.m, key: 'g' + g.m, title: L(g.title), short: short, name: short ? short.replace(/\|/g, '') : L(g.title), sub: g.sub ? L(g.sub) : '',
        when: relLabel(g.m), dateLabel: g.m === 0 ? fmtDateW(date) : fmtMonth(monthStart(date)),
        date: date, start: g.m === 0 ? date : monthStart(date), milestone: g.m === 0, after: g.m > 0, tasks: tasks, progs: []
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
      var short = g.short ? L(g.short) : '';
      out.push({ id: g.id, key: 'j-' + g.id, title: L(g.title), short: short, name: short ? short.replace(/\|/g, '') : L(g.title), sub: g.sub ? L(g.sub) : '', when: L(g.when), dateLabel: dateLabel,
        date: start, start: start, end: end, milestone: false, after: g.grade === 'hs1', tasks: tasks, progs: [] });
    });
    var ms = { id: 'entry', key: 'j-entry', title: t('plan.jr.anchor'), short: '', name: t('plan.jr.anchor'), sub: '', when: '', dateLabel: fmtDateW(entry),
      date: entry, start: entry, end: entry, milestone: true, after: false, tasks: [], progs: [] };
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
    if (!groups.length) { base.groups = []; base.cur = -1; base.beyond = false; base.total = 0; base.done = 0; base.due = 0; base.naN = 0; base.left = false; base.endPulled = []; return base; }
    // v9: 自分には関係ない / あとで, before anything is counted (counts use applicable tasks only)
    applySkips(groups);
    // v9 EXTRAS: own tasks join their station (after the data's tasks, before the saved supports)
    addOwnTasks(groups);

    // FIX-B (F14): the current period, known before saved programs are placed (a date that has passed goes to いま,
    // so saving never grows the 「前の時期」 pile)
    var cur0 = -1;
    groups.forEach(function (g, i) { if (g.start <= now) cur0 = i; });
    // v9 EXTRAS: already left — the still-useful pre-leaving items come to いま
    var last0 = groups[groups.length - 1];
    var beyond0 = cur0 === groups.length - 1 && (jr ? daysBetween(last0.end || last0.date, now) > 31 : daysBetween(last0.date, now) > 183);
    base.left = leftMode(track, anchor, now);
    base.endPulled = base.left ? pullLeft(groups, cur0, beyond0) : [];
    if (!beyond0) base.endPulled = [];
    // saved programs → dated items, placed in the right period. v9 INTEGRATOR: one placement rule everywhere (the
    // road, the saved list, the suggestions): the station whose task names the program wins; the deadline decides
    // only when no task does. A referencing station already passed hands the item to いま (never the past pile).
    var refGroup = function (id) {
      for (var gi = 0; gi < groups.length; gi++) {
        if (groups[gi].tasks.some(function (x) { return (x.p || []).indexOf(id) !== -1; })) return gi < cur0 ? groups[cur0] : groups[gi];
      }
      return null;
    };
    saved.forEach(function (p) {
      var d = p.deadline;
      var ref = refGroup(p.id);
      if (!d && !ref) return;
      var item = null;
      var lmPast = d && typeof d.leaveMonths === 'number' && d.months && d.months.length && addMonths(anchor, d.leaveMonths) < now;
      if (!d) item = { date: ref.start, open: false, label: '', short: '', target: ref };
      else if (typeof d.leaveMonths === 'number' && !jr && !lmPast) {
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
      if (ref) item.target = ref;
      var key = 'pg:' + p.id;
      item.target.progs.push({ key: key, kind: 'prog', p: p, text: L(p.name), date: item.date, label: item.label, short: item.short, open: item.open, window: !!item.window, deadlineText: d ? L(d) : '', done: isDone(key) });
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
    var total = 0, done = 0, dueN = 0, naN = 0;
    groups.forEach(function (g, i) { total += g.total; done += g.doneN; naN += g.na.length; if (i <= cur) dueN += g.total; });
    base.groups = groups; base.cur = cur; base.beyond = beyond; base.total = total; base.done = done; base.naN = naN;
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
          var lines0 = open.map(function (x) { return '・' + (x.title || x.text); });
          evs.push({ type: 'anchor', uid: (jr ? 'hsentry' : 'leave') + lk, date: g.date, summary: t(jr ? 'plan.ics.entry' : 'plan.ics.leave'), description: lines0.concat(lines0.length ? [''] : []).concat([foot]).join('\n') });
        }
      } else if (open.length) {
        var nx = model.groups[i + 1];
        var end = nx ? nx.start : (jr && g.end ? new Date(g.end.getFullYear(), g.end.getMonth(), g.end.getDate() + 1) : null);
        if (!end || end > now) {
          var d = g.start < now ? now : g.start;
          var lines = open.map(function (x) { return '・' + (x.title || x.text); });
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
    model.groups.slice(from).forEach(function (g, k) {
      g.all.forEach(function (x) {
        if (x.done) return;
        // the current station's items are 「いま」, not the month the period began in (which may have passed)
        var when = k === 0 && model.cur >= 0 && !model.beyond && !g.milestone ? t('plan.tl.now') :
          g.milestone ? fmtDate(g.date) : model.track === 'junior' && g.when ? g.when + (g.dateLabel ? '・' + g.dateLabel : '') : fmtMonth(g.start);
        out.push({ when: when, text: x.kind === 'prog' ? x.text + '（' + x.label + '）' : (x.title || x.text) });
      });
    });
    // v9 EXTRAS: long after leaving, the still-useful items sit under the end row
    (model.endPulled || []).forEach(function (x) { if (!x.done) out.push({ when: t('plan.tl.now'), text: x.title || x.text }); });
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
    'plan.tasksN': { ja: 'やること {n}こ', en: '{n} to-dos' },

    /* v9 (SPEC-v9 workstream 1): the top card, the first-visit start, the folded road, task drawers, three states */
    'plan.top.label': { ja: 'いまの状況', en: 'Where you are' },
    'plan.top.cur': { ja: 'いまの駅', en: 'Current stop' },
    'plan.top.curRel': { ja: 'いまの駅・{when}', jr: 'いまの駅・{when}', en: 'Current stop: {when}' },
    'plan.top.next': { ja: 'つぎの駅：{t}（{from}）', en: 'Next stop: {t} ({from})' },
    'plan.top.allDone': { ja: 'この駅は、ぜんぶできた', en: 'This stop is done' },
    'plan.top.show': { ja: '職員に見せる', jr: '先生や家の人に見せる', en: 'Show to staff' },
    'plan.top.cal': { ja: 'カレンダー', en: 'Calendar' },
    'plan.top.all': { ja: '前の駅も見る', jr: '前の駅も見る', en: 'Earlier stops' },
    'plan.top.untilK': { ja: '巣立ちの日まで', en: 'Until leaving day' },
    'plan.top.sinceK': { ja: '巣立ってから', en: 'Since you left' },
    'plan.top.todayK': { ja: '巣立ちの日は', en: 'Leaving day is' },
    'plan.top.jrUntilK': { ja: '高校入学まで', en: 'Until high school' },
    'plan.top.jrSinceK': { ja: '高校に入ってから', en: 'Since high school started' },
    'plan.top.jrTodayK': { ja: '高校入学は', en: 'High school starts' },
    'plan.top.pre': { ja: 'あと', en: '' },
    'plan.top.unit': { ja: '日', en: 'days' },
    'plan.top.unit1': { ja: '日', en: 'day' },
    'plan.top.unitAfter': { ja: '日', en: 'days' },
    'plan.top.today': { ja: '今日', en: 'today' },
    'plan.top.assumed': { ja: '仮', en: 'TBD' },
    'plan.top.assumedLabel': { ja: '仮の日付', en: 'Date not set yet' },
    'plan.track.cap': { ja: '中学生は「高校受験」、高校生から上は「巣立ち」。', jr: '中学生は「高校受験」、高校生より上は「巣立ち」。', en: 'Junior high: “Starting high school”. High school and after: “Leaving care”.' },

    'plan.start.q1': { ja: 'いまの状況は？', en: 'Where are you now?' },
    'plan.start.jhs': { ja: '中学生', en: 'Junior high school' },
    'plan.start.hs': { ja: '高校生', jr: '高校生', en: 'High school' },
    'plan.start.left': { ja: 'もう出た', jr: 'もう出た', en: 'Already left care' },
    'plan.start.hint': { ja: '答えると、やることが時期ごとに並びます。このスマホの中だけに残ります。', jr: '答えると、やることが順番にならびます。', en: 'Answer, and your to-dos line up by period. It stays on this phone.' },
    'plan.start.q2': { ja: '巣立ちの日は？', en: 'Your leaving day?' },
    'plan.start.jrQ2': { ja: '高校に入る日は？', en: 'When does high school start?' },
    'plan.start.pick': { ja: '日にちを決める', en: 'Set the date' },
    'plan.start.unknown': { ja: 'まだ決まっていない', en: 'Not decided yet' },
    'plan.start.jrUnknown': { ja: 'まだわからない', en: 'Not sure yet' },
    'plan.start.q2hint': { ja: '決まるまでは、3月31日として計算します。', jr: '決まるまでは、3月31日として数えます。', en: 'Until it is set, we count to March 31.' },
    'plan.start.jrQ2hint': { ja: '決まるまでは、つぎの4月1日として計算します。', en: 'Until it is set, we count to next April 1.' },
    /* v9 INTEGRATOR: Q2 for someone who already left (the day is in the past) and for a 中学生 (the grade, not a date) */
    'plan.start.leftQ2': { ja: '出たのはいつ？', jr: '出たのはいつ？', en: 'When did you leave?' },
    'plan.start.leftPick': { ja: '日にちを入れる', jr: '日にちを入れる', en: 'Enter the date' },
    'plan.start.leftUnknown': { ja: 'おぼえていない', jr: 'おぼえていない', en: 'Not sure' },
    'plan.start.leftQ2hint': { ja: 'わからないときは、前の3月31日として計算します。', jr: 'わからないときは、前の3月31日として数えます。', en: 'If you are not sure, we count from the last March 31.' },
    'plan.start.gradeQ': { ja: 'いま何年生？', jr: 'いま何年生？', en: 'What year are you in?' },
    'plan.start.g12': { ja: '中1・中2', jr: '中1・中2', en: '1st or 2nd year' },
    'plan.start.g3': { ja: '中3', jr: '中3', en: '3rd year' },
    'plan.start.back': { ja: 'もどる', jr: 'もどる', en: 'Back' },
    'plan.start.gradeHint': { ja: '高校入学は、4月1日として計算します。', jr: '高校入学は、4月1日として数えます。', en: 'We count to April 1 as the day high school starts.' },
    'plan.leftDate': { ja: '出た日を入れる', jr: '出た日を入れる', en: 'Enter the date' },
    'plan.leftChange': { ja: '出た日を変える', jr: '出た日を変える', en: 'Change the date' },
    'plan.date.fieldLeft': { ja: '施設や家を出た日', jr: '施設や家を出た日', en: 'The day you left' },
    'plan.date.unknownSubLeft': { ja: '前の3月31日として計算します', jr: '前の3月31日として数えます', en: 'We will use the last March 31' },

    'plan.fold.past': { ja: 'ここまでの{n}駅', en: '{n} stops so far' },
    'plan.fold.past1': { ja: 'ここまでの1駅', en: '1 stop so far' },
    'plan.fold.sinceLeft': { ja: '出てから、ここまでの{n}駅', jr: '出てから、ここまでの{n}駅', en: 'Since leaving: {n} stops' },
    'plan.fold.sinceLeft1': { ja: '出てから、ここまでの1駅', jr: '出てから、ここまでの1駅', en: 'Since leaving: 1 stop' },
    'plan.fold.open': { ja: 'ここまでの駅を見る', en: 'Show earlier stops' },
    'plan.fold.close': { ja: 'ここまでの駅をとじる', en: 'Hide earlier stops' },
    'plan.label.ahead': { ja: 'この先', en: 'Coming up' },
    'plan.label.after': { ja: '巣立ったあと', en: 'After leaving' },
    'plan.label.jrAfter': { ja: '入学したあと', en: 'After you start' },
    'plan.next.flag': { ja: 'つぎ', en: 'Next' },
    'plan.row.open': { ja: '{t}を見る', en: 'Open {t}' },

    'plan.dr.why': { ja: 'なぜ', en: 'Why' },
    'plan.dr.who': { ja: 'だれに', en: 'Who to ask' },
    'plan.dr.say': { ja: 'こう聞く', en: 'Say this' },
    'plan.dr.due': { ja: 'いつまで', en: 'By when' },
    'plan.dr.links': { ja: 'くわしく', jr: 'くわしく', en: 'More' },
    'plan.dr.open': { ja: '{t}：くわしく見る', jr: '{t}：くわしく見る', en: '{t}: show details' },
    'plan.dr.check': { ja: '{t}をできたにする', en: 'Mark “{t}” done' },
    'plan.due.before': { ja: '{date}（巣立ちの{n}日前）', en: '{date} ({n} days before leaving)' },
    'plan.due.after': { ja: '{date}（巣立ちの{n}日後）', en: '{date} ({n} days after leaving)' },
    'plan.due.jrBefore': { ja: '{date}（入学の{n}日前）', en: '{date} ({n} days before entry)' },
    'plan.due.jrAfter': { ja: '{date}（入学の{n}日後）', en: '{date} ({n} days after entry)' },
    'plan.due.on': { ja: '{date}', en: '{date}' },
    'plan.who.staff': { ja: '職員', en: 'Care staff' },
    'plan.who.teacher': { ja: '先生', en: 'Teacher' },
    'plan.who.city': { ja: '区市町村の窓口', jr: '市や区の窓口', en: 'City office' },
    'plan.who.jiso': { ja: '児童相談所', jr: '児童相談所（児相）', en: 'Child guidance centre' },
    'plan.who.school': { ja: '学校', en: 'School' },
    'plan.who.self': { ja: '自分で', en: 'Yourself' },
    'plan.who.org': { ja: '相談窓口・支援団体', jr: '相談できる窓口', en: 'Help desk or support group' },

    'plan.skip.na': { ja: '自分には関係ない', jr: '自分には関係ない', en: 'Not for me' },
    'plan.skip.later': { ja: 'あとで', en: 'Later' },
    'plan.skip.laterTo': { ja: 'あとで（{t}へ）', en: 'Later (move to {t})' },
    'plan.skip.back': { ja: '戻す', en: 'Put back' },
    'plan.skip.backLabel': { ja: '「{t}」を戻す', en: 'Put “{t}” back' },
    'plan.skip.naLine': { ja: '関係ないにした{n}つ', en: '{n} marked “not for me”' },
    'plan.skip.naLine1': { ja: '関係ないにした1つ', en: '1 marked “not for me”' },
    'plan.skip.movedTag': { ja: 'あとで', en: 'Later' },
    'plan.skip.movedFrom': { ja: '{t}の駅から', en: 'from the {t} stop' },
    'plan.skip.naToast': { ja: '「関係ない」にしました。数に入れません', jr: '「関係ない」にしました。数に入れません', en: 'Marked “not for me”. It no longer counts' },
    'plan.skip.laterToast': { ja: '「{t}」へ動かしました', en: 'Moved to “{t}”' },
    'plan.skip.backToast': { ja: '戻しました', en: 'Put back' },

    /* v9 (SPEC-v9 workstream 3, EXTRAS): own tasks · the already-left fold · the saved list · the sheet image · the calendar steps */
    'plan.own.add': { ja: '自分のやることを足す', jr: '自分のやることを足す', en: 'Add my own to-do' },
    'plan.own.field': { ja: '自分のやること', en: 'My own to-do' },
    'plan.own.ph': { ja: '例：面接の服を用意する', jr: '例：面接の服を用意する', en: 'e.g. Get clothes for the interview' },
    'plan.own.save': { ja: '足す', en: 'Add' },
    'plan.own.cancel': { ja: 'やめる', en: 'Cancel' },
    'plan.own.editSave': { ja: '保存', en: 'Save' },
    'plan.own.del': { ja: '消す', en: 'Delete' },
    'plan.own.tag': { ja: '自分の', en: 'Mine' },
    'plan.own.open': { ja: '「{t}」を書きなおす・消す', en: 'Edit or delete “{t}”' },
    'plan.own.empty': { ja: 'やることを書いてください', en: 'Write the to-do first' },
    'plan.own.added': { ja: '足しました', en: 'Added' },
    'plan.own.saved': { ja: '保存しました', en: 'Saved' },
    'plan.own.deleted': { ja: '「{t}」を消しました', en: 'Deleted “{t}”' },
    'plan.own.note': { ja: 'このスマホの中だけに残ります。', jr: 'このスマホの中だけに残ります。', en: 'Stays on this phone only.' },

    'plan.left.fold': { ja: '巣立ち前（{n}駅）', jr: '巣立ち前（{n}駅）', en: 'Before leaving ({n} stops)' },
    'plan.left.foldOpen': { ja: '巣立ち前の駅を見る', en: 'Show the stops before leaving' },
    'plan.left.foldClose': { ja: '巣立ち前の駅をとじる', en: 'Hide the stops before leaving' },
    'plan.left.note': { ja: 'いまでも役に立つことを、巣立ち前の駅から{n}つ持ってきました。', jr: 'いまでも役に立つことを、巣立ち前の駅から{n}つ持ってきました。', en: 'Still useful: {n} items brought here from the stops before leaving.' },
    'plan.left.note1': { ja: 'いまでも役に立つことを、巣立ち前の駅から1つ持ってきました。', jr: 'いまでも役に立つことを、巣立ち前の駅から1つ持ってきました。', en: 'Still useful: 1 item brought here from the stops before leaving.' },
    'plan.left.from': { ja: '巣立ち前の「{t}」の駅から', en: 'From the “{t}” stop, before leaving' },
    'plan.left.tag': { ja: '巣立ち前', en: 'Pre-leaving' },

    'plan.sv.sug': { ja: 'いまとこの先の駅の支援', jr: 'いまとこの先の駅の支援', en: 'Supports at this stop and ahead' },
    'plan.sv.sugN': { ja: 'いまとこの先の駅の支援（{n}）', jr: 'いまとこの先の駅の支援（{n}）', en: 'Supports at this stop and ahead ({n})' },
    'plan.sv.sugAt': { ja: '{t}の駅', en: '{t} stop' },
    'plan.sv.due': { ja: '期限 {v}', en: 'Due {v}' },
    'plan.sv.apply': { ja: '申込 {v}', en: 'Apply {v}' },
    'plan.sv.open': { ja: '「{t}」をひらく', en: 'Open “{t}”' },

    'plan.sheet.img': { ja: '画像で保存', jr: '画像で保存', en: 'Save as image' },
    'plan.sheet.imgMade': { ja: '画像をつくりました', en: 'Image ready' },
    'plan.sheet.imgDl': { ja: '画像を保存する', en: 'Save the image' },
    'plan.sheet.imgHint': { ja: '画像を長押ししても保存できます。LINEで送るときにも便利です。', jr: '画像を長押ししても保存できます。LINEで送るときにもべんり。', en: 'Long-press the image to save it too. Handy for sending on LINE.' },
    'plan.sheet.imgAlt': { ja: '相談シートの画像', en: 'The talk sheet as an image' },
    'plan.sheet.imgFail': { ja: '画像をつくれませんでした。コピーか印刷を使ってください。', en: 'Could not make the image. Use copy or print instead.' },

    'plan.ics.dev.ios': { ja: 'iPhone', en: 'iPhone' },
    'plan.ics.dev.and': { ja: 'Android', en: 'Android' },
    'plan.ics.devLabel': { ja: 'スマホの種類', en: 'Your phone' },
    'plan.ics.ios1': { ja: '上のボタンを押す', jr: '上のボタンを押す', en: 'Tap the button above' },
    'plan.ics.ios2': { ja: '「すべてを追加」を押す', jr: '「すべてを追加」を押す', en: 'Tap “Add All”' },
    'plan.ics.ios3': { ja: 'カレンダーに入る', jr: 'カレンダーに入る', en: 'It is in your calendar' },
    'plan.ics.iosNote': { ja: 'ファイルとして保存されたときは、「ファイル」アプリで開きます。', jr: 'ファイルとして保存されたときは、「ファイル」アプリでひらきます。', en: 'If it saves as a file, open it from the Files app.' },
    'plan.ics.and1': { ja: '上のボタンでファイルを保存', jr: '上のボタンでファイルを保存', en: 'Save the file with the button above' },
    'plan.ics.and2': { ja: '.icsファイルをタップして、カレンダーを選ぶ', jr: '.icsファイルをタップして、カレンダーをえらぶ', en: 'Tap the .ics file and pick your calendar' },
    'plan.ics.and3': { ja: 'カレンダーに入る', jr: 'カレンダーに入る', en: 'It is in your calendar' },
    'plan.ics.step': { ja: '手順{n}', en: 'Step {n}' }
  });

  /* ------------------------------------------------------------------ render pieces */
  var openKeys = {};         // phone: which stations the reader opened / closed (key → bool)
  var selKey = null;         // desktop: the one open station
  var drawerOpen = {};       // v9: task drawers the reader opened (task key → bool)
  var naOpen = {};           // v9: 関係ないにした… lines unfolded (group key → bool)
  var foldOpen = {};         // v9 phone: the past stations unfolded (fold id → bool; 'fold' = the past, 'fold2' = past stations after leaving)
  var addOpen = {};          // v9 EXTRAS: the 「自分のやることを足す」 form open (group key → bool)
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
  function headHtml(ti, model) {
    var nostore = SM.store && SM.store.available === false ?
      '<p class="plan-nostore" role="note">' + esc(t('plan.nostore')) + ' <button type="button" class="plan-nostore-go" data-act="settings">' + esc(t('plan.nostoreGo')) + '</button></p>' : '';
    var sw = switchHtml(ti);
    return '<header class="plan-head' + (sw ? ' has-switch' : '') + '">' +
      '<div class="plan-head-l"><h1 class="plan-h1" id="plan-h1" data-reveal="line">' + esc(t('plan.h1')) + '</h1></div>' +
      (sw ? '<div class="plan-head-r">' + sw + '<p class="plan-track-cap">' + esc(t('plan.track.cap')) + '</p></div>' : '') + nostore +
      '<p class="sr-only" id="plan-live" role="status" aria-live="polite"></p></header>';
  }

  /* ---------- v9: the first visit (no answers, no date) and the top card ---------- */
  function started() { return !!SM.store.get('plan:started', false); }
  function dateSeen() { return !!SM.store.get('plan:dateSeen', false); }
  /* Ryu (2026-11-01): the road appears only after the person answers here — never from さがす answers or an old
     track switch alone, and never with a guessed 仮 date before Q2 is answered */
  function startMode() { return !started(); }
  /* Q2 still open: the leaving date neither set nor seen (まだ決まっていない); a 中学生's grade not known */
  function askPending(model) {
    if (!started()) return false;
    return model.track === 'junior' ? (!answers().stage && !state().hsDate) : (!!model.assumed && !dateSeen());
  }
  function askHtml(model) {
    return '<section class="plan-top is-start is-start-2" id="plan-top" aria-labelledby="plan-top-q2">' + askDateHtml(model) +
      '<button type="button" class="pt-back" data-act="plan-start-back" data-press>' + arrowBack() + '<span>' + esc(t('plan.start.back')) + '</span></button></section>';
  }
  function arrowBack() { return '<span class="pt-back-a" aria-hidden="true">\u2190</span>'; }
  function startHtml() {
    var opts = [['jhs', 'plan.start.jhs'], ['hs', 'plan.start.hs'], ['left', 'plan.start.left']];
    return '<section class="plan-top is-start" id="plan-top" aria-labelledby="plan-top-q">' +
      '<p class="pt-q" id="plan-top-q">' + esc(t('plan.start.q1')) + '</p>' +
      '<div class="pt-opts" role="group" aria-labelledby="plan-top-q">' + opts.map(function (o) {
        return '<button type="button" class="pt-opt" data-act="plan-start" data-value="' + o[0] + '" data-press><span>' + esc(t(o[1])) + '</span>' + arrow() + '</button>';
      }).join('') + '</div>' +
      '<p class="pt-hint">' + esc(t('plan.start.hint')) + '</p></section>';
  }
  /* the countdown line: 「巣立ちの日まで あと151日 仮 · 2027年3月31日（水）」 + 日にちを決める / 変える */
  function countLineHtml(model) {
    var jr = model.track === 'junior';
    var c = countInfo(model);
    var k = t(c.today ? (jr ? 'plan.top.jrTodayK' : 'plan.top.todayK') : c.before ? (jr ? 'plan.top.jrUntilK' : 'plan.top.untilK') : (jr ? 'plan.top.jrSinceK' : 'plan.top.sinceK'));
    var num = c.today ?
      '<span class="pt-cd-n is-today"><b class="pt-cd-today" id="plan-count-n" data-m="n">' + esc(t('plan.top.today')) + '</b></span>' :
      '<span class="pt-cd-n">' + (c.before && t('plan.top.pre') ? '<span class="pt-cd-pre">' + esc(t('plan.top.pre')) + '</span>' : '') +
        '<b class="num pt-cd-num" id="plan-count-n" data-m="n" data-n="' + c.n + '">' + esc(c.text) + '</b>' +
        '<span class="pt-cd-u">' + esc(t(c.before ? (c.n === 1 ? 'plan.top.unit1' : 'plan.top.unit') : 'plan.top.unitAfter')) + '</span></span>';
    var tag = model.assumed ? '<span class="tag tag-deadline pt-assumed" title="' + esc(t('plan.top.assumedLabel')) + '"><span aria-hidden="true">' + esc(t('plan.top.assumed')) + '</span><span class="sr-only">' + esc(t('plan.top.assumedLabel')) + '</span></span>' : '';
    // already left: the day is behind them — 「出た日を入れる / 変える」, never 「決める」
    var editKey = model.left ? (model.assumed ? 'plan.leftDate' : 'plan.leftChange') : (model.assumed ? 'plan.decideDate' : 'plan.change');
    var edit = '<button type="button" class="rm-edit pt-edit" data-act="plan-date" aria-label="' + esc(t('plan.changeLabel', { what: t(jr ? 'plan.jr.anchor' : 'plan.leave.label'), date: fmtDate(model.anchor) })) + '"><span>' + esc(t(editKey)) + '</span></button>';
    return '<div class="pt-cd"><p class="pt-cd-l"><span class="pt-cd-k">' + esc(k) + '</span>' + num + tag + '</p>' +
      '<span class="pt-cd-d num" data-m="dv" data-noruby>' + esc(fmtDateW(model.anchor)) + '</span>' + edit + '</div>';
  }
  /* the second question of the start, asked in the card until the date is set or 「まだ決まっていない」 is tapped */
  function askDateHtml(model) {
    var jr = model.track === 'junior';
    // v9 INTEGRATOR: a 中学生 is asked the grade (the entry date follows from it; 日にちを決める stays in the card);
    // someone who already left is asked when they left (「おぼえていない」 counts from the last March 31)
    if (jr) {
      return '<div class="pt-cd is-ask"><p class="pt-q" id="plan-top-q2">' + esc(t('plan.start.gradeQ')) + '</p>' +
        '<div class="pt-opts pt-opts-2" role="group" aria-labelledby="plan-top-q2">' +
          '<button type="button" class="pt-opt" data-act="plan-start-grade" data-value="jhs12" data-press><span>' + esc(t('plan.start.g12')) + '</span>' + arrow() + '</button>' +
          '<button type="button" class="pt-opt" data-act="plan-start-grade" data-value="jhs3" data-press><span>' + esc(t('plan.start.g3')) + '</span>' + arrow() + '</button>' +
        '</div><p class="pt-hint">' + esc(t('plan.start.gradeHint')) + '</p></div>';
    }
    var left = !!model.left;
    return '<div class="pt-cd is-ask"><p class="pt-q" id="plan-top-q2">' + esc(t(left ? 'plan.start.leftQ2' : 'plan.start.q2')) + '</p>' +
      '<div class="pt-opts pt-opts-2" role="group" aria-labelledby="plan-top-q2">' +
        '<button type="button" class="pt-opt" data-act="plan-date" data-press><span>' + esc(t(left ? 'plan.start.leftPick' : 'plan.start.pick')) + '</span>' + arrow() + '</button>' +
        '<button type="button" class="pt-opt is-quiet" data-act="plan-start-nodate" data-press><span>' + esc(t(left ? 'plan.start.leftUnknown' : 'plan.start.unknown')) + '</span></button>' +
      '</div><p class="pt-hint">' + esc(t(left ? 'plan.start.leftQ2hint' : 'plan.start.q2hint')) + '</p></div>';
  }
  function curGroup(model) { return model.cur >= 0 && !model.beyond ? model.groups[model.cur] : null; }
  /* いまの駅：its short name, n/N, and the period's one kind line (the group's `sub`) */
  function topStationHtml(model) {
    var jr = model.track === 'junior';
    var g = curGroup(model);
    var h = '<div class="pt-st">';
    if (g) {
      var all = g.total > 0 && g.doneN === g.total;
      var nx = nextAfter(model);
      h += '<p class="pt-k"><span class="rm-now">' + esc(t('plan.tl.now')) + '</span><span class="pt-k-t">' + esc(g.milestone ? t('plan.top.cur') : t('plan.top.curRel', { when: g.when || g.dateLabel })) + '</span></p>' +
        '<p class="pt-t"><button type="button" class="pt-t-n" data-act="plan-jump" data-key="' + esc(g.key) + '"><span>' + esc(g.milestone ? g.title : g.name) + '</span></button>' +
        (g.total ? '<span class="pt-c num' + (all ? ' is-all' : '') + '" id="plan-top-count" aria-label="' + esc(t('plan.progress') + ' ' + t('plan.progressOf', { done: g.doneN, total: g.total })) + '"><b id="plan-prog-done">' + g.doneN + '</b><span class="pt-c-of">/<span id="plan-prog-total">' + g.total + '</span></span><small>' + esc(t('plan.doneWord')) + '</small></span>' : '') + '</p>' +
        '<p class="pt-why" id="plan-top-why">' + esc(all ? (nx ? t('plan.top.next', { t: nx.title, from: fromLabel(nx) }) : t('plan.top.allDone')) : (g.sub || '')) + '</p>';
    } else if (model.beyond) {
      h += '<p class="pt-k"><span class="rm-now">' + esc(t('plan.tl.now')) + '</span></p>' +
        '<p class="pt-t"><span class="pt-t-n is-text">' + esc(t(jr ? 'plan.now.jrLateT' : 'plan.now.lateT')) + '</span></p>' +
        '<p class="pt-why">' + esc(t(jr ? 'plan.jr.nowLate' : 'plan.tl.nowLate')) + ' <a class="pt-link" href="#/find/cat/consult">' + esc(t('plan.now.consult')) + '</a></p>';
    } else {
      var first = nextAfter(model);
      h += '<p class="pt-k"><span class="rm-now">' + esc(t('plan.tl.now')) + '</span></p>' +
        '<p class="pt-t"><span class="pt-t-n is-text">' + esc(t(jr ? 'plan.jr.nowEarly' : 'plan.tl.nowEarly')) + '</span></p>' +
        (first ? '<p class="pt-why">' + esc(t('plan.top.next', { t: first.title, from: fromLabel(first) })) + '</p>' : '');
    }
    return h + '</div>';
  }
  function topActsHtml() {
    var b = function (act, icon, key, extra) {
      return '<button type="button" class="pt-act" data-act="' + act + '"' + (extra || '') + ' data-press="ink">' + ic(icon) + '<span>' + esc(t(key)) + '</span></button>';
    };
    return '<div class="pt-acts">' + b('plan-sheet', 'print', 'plan.top.show') + b('plan-ics', 'calendar', 'plan.top.cal') + b('plan-all', 'chevron-down', 'plan.top.all') + '</div>';
  }
  function topHtml(model) {
    // the junior Q2 (the grade) is asked while no stage is known; the leaving Q2 until the date is set or seen
    var ask = askPending(model);
    return '<section class="plan-top" id="plan-top" aria-label="' + esc(t('plan.top.label')) + '" data-reveal="">' +
      (ask ? askDateHtml(model) : countLineHtml(model)) + topStationHtml(model) + topActsHtml() + '</section>' +
      // v9 POLISH: 「時期は目安」 sits under the card in small type (it was the page's last line)
      '<p class="plan-note plan-top-note" data-reveal="">' + esc(t(model.track === 'junior' ? 'plan.jr.note' : 'plan.tl.note')) + '</p>';
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
  function rowSel(key) { return '.tl-item[data-flip-key="' + String(key).replace(/["\\]/g, '') + '"]'; }
  function progLink(id) {
    var p = SM.program(id);
    if (!p) return '';
    var nm = L(p.name).replace(/[（(].*$/, '');
    return '<a class="tl-link" href="#/p/' + encodeURIComponent(id) + '"><span>' + esc(nm) + '</span>' + arrow() + '</a>';
  }
  /* the drawer under a task: なぜ · だれに · こう聞く · いつまで · links · the two other states */
  function drawerHtml(x, id, model) {
    var rows = '';
    if (x.why) rows += '<div class="tl-dr-row"><dt>' + esc(t('plan.dr.why')) + '</dt><dd>' + esc(x.why) + '</dd></div>';
    if (x.who) rows += '<div class="tl-dr-row"><dt>' + esc(t('plan.dr.who')) + '</dt><dd><span class="tl-who">' + esc(t('plan.who.' + x.who)) + '</span></dd></div>';
    if (x.say) rows += '<div class="tl-dr-row"><dt>' + esc(t('plan.dr.say')) + '</dt><dd class="tl-say">' + esc(x.say) + '</dd></div>';
    var due = x.due ? dueText(x.due, model) : '';
    if (due) rows += '<div class="tl-dr-row"><dt>' + esc(t('plan.dr.due')) + '</dt><dd class="num">' + esc(due) + '</dd></div>';
    var links = (x.href ? '<a class="tl-link" href="' + esc(x.href) + '"><span>' + esc(x.hrefLabel || t('plan.tl.tool')) + '</span>' + arrow() + '</a>' : '') +
      (x.p || []).slice(0, 2).map(progLink).join('');
    var nx = x.moved || x.pulled ? null : nextWithTasks(model, x.key);
    var states = '<p class="tl-states">' +
      (x.pulled ?
        '<span class="tl-moved-k">' + esc(t('plan.left.from', { t: x.pulled.title })) + '</span>' +
        '<button type="button" class="tl-state" data-act="plan-skip" data-key="' + esc(x.key) + '" data-value="na"><span>' + esc(t('plan.skip.na')) + '</span></button>' :
      x.moved ?
        '<span class="tl-moved-k">' + esc(t('plan.skip.movedFrom', { t: x.moved.title })) + '</span>' +
        '<button type="button" class="tl-state" data-act="plan-unskip" data-key="' + esc(x.key) + '"><span>' + esc(t('plan.skip.back')) + '</span></button>' :
        '<button type="button" class="tl-state" data-act="plan-skip" data-key="' + esc(x.key) + '" data-value="na"><span>' + esc(t('plan.skip.na')) + '</span></button>' +
        (nx ? '<button type="button" class="tl-state" data-act="plan-skip" data-key="' + esc(x.key) + '" data-value="later"><span>' + esc(t('plan.skip.laterTo', { t: nx.name })) + '</span></button>' : '')) +
      '</p>';
    return '<div class="tl-drawer" id="' + id + '-dr" hidden><div class="tl-drawer-in">' +
      (rows ? '<dl class="tl-dl">' + rows + '</dl>' : '') +
      (links ? '<p class="tl-item-meta tl-dr-links">' + links + '</p>' : '') + states + '</div></div>';
  }
  /* the next station after the one holding `key` that has tasks (あとで goes there) */
  function nextWithTasks(model, key) {
    var i = -1;
    model.groups.forEach(function (g, gi) { if (g.tasks.some(function (x) { return x.key === key; })) i = gi; });
    if (i === -1) return null;
    for (var j = i + 1; j < model.groups.length; j++) if (model.groups[j].tasks.length) return model.groups[j];
    return null;
  }
  function itemHtml(x, i, model) {
    var id = itemId(x.key);
    var check = '<input type="checkbox" class="tl-check" id="' + id + '" data-act="plan-done" data-key="' + esc(x.key) + '"' + (x.done ? ' checked' : '') +
      (x.kind === 'prog' ? ' aria-describedby="' + id + '-d"' : '') + '>' +
      '<span class="tl-box" aria-hidden="true">' + ic('check') + '</span>';
    var seal = '<span class="tl-seal" aria-hidden="true">' + esc(t('plan.tl.seal')) + '</span>';
    var open = '<li class="tl-item' + (x.kind === 'prog' ? ' tl-item-prog' : '') + (x.done ? ' is-done' : '') + (x.moved ? ' is-moved' : '') + '" data-flip-key="' + esc(x.key) + '" data-i="' + i + '">';
    if (x.kind === 'prog') {
      return open +
        '<label class="tl-task" for="' + id + '">' + check +
          '<span class="tl-item-text">' + seal + '<span class="tl-saved-k">' + esc(t('plan.tl.saved')) + '</span>' + esc(x.text) + '</span></label>' +
        '<p class="tl-item-meta" id="' + id + '-d">' +
          (x.label ? '<span class="tl-fact' + (x.open ? ' is-open' : '') + '"><span class="tl-fact-k">' + esc(x.window ? t('plan.tl.applyK') : t('plan.tl.untilK')) + '</span>' +
          '<span class="tl-fact-v">' + esc(x.window ? x.short : x.label) + (x.open ? '<b class="tl-open-now">' + esc(t('plan.tl.openNow')) + '</b>' : '') + '</span></span>' : '') +
          '<a class="tl-link" href="#/p/' + encodeURIComponent(x.p.id) + '"><span>' + esc(t('plan.tl.detail')) + '</span>' + arrow() + '</a></p>' +
        '</li>';
    }
    // v9: a short title + a drawer. The 44px check is its own label; the title is the drawer's button.
    var moved = x.moved ? '<span class="tag tl-moved" aria-hidden="true">' + esc(t('plan.skip.movedTag')) + '</span>' :
      x.pulled ? '<span class="tag tl-moved" aria-hidden="true">' + esc(t('plan.left.tag')) + '</span>' :
      x.own ? '<span class="tag tl-moved tl-own-k" aria-hidden="true">' + esc(t('plan.own.tag')) + '</span>' : '';
    var text = x.hasTitle ? '<span class="tl-item-main">' + jaRuns(x.title) + '</span>' : taskText(x.text);
    var isOpen = !!drawerOpen[x.key];
    var label = x.own ? t('plan.own.open', { t: x.title }) : t('plan.dr.open', { t: x.title });
    return open.replace('class="tl-item', 'class="tl-item' + (x.own ? ' tl-item-own' : '') + (x.pulled ? ' tl-item-pulled' : '')) +
      '<div class="tl-row' + (isOpen ? ' is-open' : '') + '">' +
        '<label class="tl-task tl-task-box" for="' + id + '">' + check + '<span class="sr-only">' + esc(t('plan.dr.check', { t: x.title })) + '</span></label>' +
        '<button type="button" class="tl-t" data-act="plan-drawer" data-key="' + esc(x.key) + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '" aria-controls="' + id + '-dr" title="' + esc(label) + '" data-press="ink">' +
          '<span class="tl-item-text">' + seal + text + moved + '</span>' + arrow('down') + '</button>' +
      '</div>' + (x.own ? ownDrawerHtml(x, id) : drawerHtml(x, id, model)) + '</li>';
  }
  /* v9 EXTRAS: an own task's drawer = the edit form (書きなおす · 保存 · 消す) */
  function ownDrawerHtml(x, id) {
    return '<div class="tl-drawer tl-drawer-own" id="' + id + '-dr" hidden><div class="tl-drawer-in">' +
      '<div class="tl-own-f"><label class="sr-only" for="' + id + '-in">' + esc(t('plan.own.field')) + '</label>' +
        '<input type="text" class="input tl-own-in" id="' + id + '-in" value="' + esc(x.text) + '" maxlength="80" enterkeyhint="done" autocomplete="off" data-own-id="' + esc(x.id) + '">' +
        '<div class="tl-own-acts"><button type="button" class="rm-edit tl-own-save" data-act="plan-own-save" data-id="' + esc(x.id) + '"><span>' + esc(t('plan.own.editSave')) + '</span></button>' +
        '<button type="button" class="tl-state" data-act="plan-own-del" data-id="' + esc(x.id) + '"><span>' + esc(t('plan.own.del')) + '</span></button></div></div>' +
      '</div></div>';
  }
  /* v9 EXTRAS: the 「＋ 自分のやることを足す」 row at the end of a station's list, with its folded form */
  function addRowHtml(g) {
    var k = g.key.replace(/[^A-Za-z0-9-]/g, '_');
    var open = !!addOpen[g.key];
    return '<div class="tl-add' + (open ? ' is-open' : '') + '" data-group="' + esc(g.key) + '" data-flip-key="add:' + esc(g.key) + '">' +
      '<button type="button" class="tl-add-t" data-act="plan-own-add" data-key="' + esc(g.key) + '" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="tl-add-f-' + k + '">' +
        '<span class="tl-add-plus" aria-hidden="true"></span><span class="tl-add-l">' + esc(t('plan.own.add')) + '</span></button>' +
      '<div class="tl-add-f" id="tl-add-f-' + k + '"' + (open ? '' : ' hidden') + '><div class="tl-add-f-in">' +
        '<label class="sr-only" for="tl-add-in-' + k + '">' + esc(t('plan.own.field')) + '</label>' +
        '<input type="text" class="input tl-own-in" id="tl-add-in-' + k + '" maxlength="80" placeholder="' + esc(t('plan.own.ph')) + '" enterkeyhint="done" autocomplete="off" data-own-group="' + esc(g.key) + '">' +
        '<div class="tl-own-acts"><button type="button" class="rm-edit tl-own-save" data-act="plan-own-save" data-key="' + esc(g.key) + '"><span>' + esc(t('plan.own.save')) + '</span></button>' +
        '<button type="button" class="tl-state" data-act="plan-own-cancel" data-key="' + esc(g.key) + '"><span>' + esc(t('plan.own.cancel')) + '</span></button>' +
        '<span class="tl-own-note">' + esc(t('plan.own.note')) + '</span></div>' +
      '</div></div></div>';
  }
  function itemsHtml(all, model) {
    var rows = all.map(function (x, i) { return { x: x, i: i }; });
    rows.sort(function (a, b) { return ((a.x.done ? 1 : 0) - (b.x.done ? 1 : 0)) || (a.i - b.i); });
    return rows.map(function (r) { return itemHtml(r.x, r.i, model); }).join('');
  }
  /* 自分には関係ない: the rows hidden behind one line, each with 戻す */
  function naHtml(g) {
    if (!g.na || !g.na.length) return '';
    var n = g.na.length;
    var open = !!naOpen[g.key];
    return '<div class="tl-na" data-flip-key="na:' + esc(g.key) + '">' +
      '<button type="button" class="tl-na-t" data-act="plan-na" data-key="' + esc(g.key) + '" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="tl-na-' + esc(g.key) + '">' +
        '<span>' + esc(t(n === 1 ? 'plan.skip.naLine1' : 'plan.skip.naLine', { n: n })) + '</span>' + arrow('down') + '</button>' +
      '<ul class="tl-na-list" id="tl-na-' + esc(g.key) + '"' + (open ? '' : ' hidden') + '>' + g.na.map(function (x) {
        return '<li class="tl-na-item"><span class="tl-na-text">' + esc(x.title) + '</span>' +
          '<button type="button" class="tl-state" data-act="plan-unskip" data-key="' + esc(x.key) + '" aria-label="' + esc(t('plan.skip.backLabel', { t: x.title })) + '"><span>' + esc(t('plan.skip.back')) + '</span></button></li>';
      }).join('') + '</ul></div>';
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
    return '<details class="tl-related" data-flip-key="rel:' + esc(g.key) + '"><summary class="tl-related-k">' + esc(t('plan.tl.relatedN', { n: ids.length })) + '</summary><ul class="tl-related-links">' +
      ids.map(function (id) {
        var p = SM.program(id);
        var nm = L(p.name).replace(/[（(].*$/, '');
        var cat = (p.cat && p.cat[0]) || 'procedures';
        return '<li><a class="tl-rel-link" href="#/p/' + encodeURIComponent(id) + '" aria-label="' + esc(nm) + '">' + SM.ui.catIcon(cat, 'xs') + '<span>' + esc(nm) + '</span></a></li>';
      }).join('') + '</ul></details>';
  }
  function countHtml(g, cls) {
    if (!g.total) return '';
    return '<span class="rm-count num' + (cls ? ' ' + cls : '') + '" data-gcount="' + g.key + '" data-done="' + g.doneN + '" aria-label="' + esc(t('plan.progress') + ' ' + t('plan.progressOf', { done: g.doneN, total: g.total })) + '">' +
      '<b class="rm-count-n">' + g.doneN + '</b><span class="rm-count-of">/' + g.total + '</span><small class="rm-count-w">' + esc(t('plan.doneWord')) + '</small></span>';
  }
  function curDoneHtml(nx, g) {
    return '<div class="tl-cur-done" data-flip-key="cd:' + esc(g.key) + '"><p class="tl-cur-done-t"><span class="tl-cur-done-mk" aria-hidden="true"></span>' + esc(t('plan.cur.done')) + '</p>' +
      (nx ? '<button type="button" class="tl-cur-go" data-act="plan-jump" data-key="' + esc(nx.key) + '"><span>' + esc(t('plan.cur.next', { t: nx.title, from: fromLabel(nx) })) + '</span>' + arrow('down') + '</button>' : '') +
    '</div>';
  }

  /* ---------- the roadmap: one station per period ---------- */
  function isOpenKey(model, key, i) {
    if (wide()) {
      if (selKey && groupOf(model, selKey)) return key === selKey;
      if (selKey === 'end' || (model.endPulled && model.endPulled.length)) return false;   // long after leaving: the end row's list is the open panel
      return i === Math.max(0, model.cur);
    }
    if (Object.prototype.hasOwnProperty.call(openKeys, key)) return !!openKeys[key];
    return i === Math.max(0, model.cur);   // before the first station: its tasks are what comes first
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
    // v9 INTEGRATOR: the sign says the day and its date only — the card above carries the big number and the 仮 tag
    // (one countdown, one 仮 per screen; the card's #plan-count-n is the only one, so the odometer has one target)
    var sr = model.assumed ? '<span class="sr-only">' + esc(t('plan.assumed')) + '</span>' : '';
    return '<button type="button" class="rm-head rm-box" data-flip-key="head:' + esc(g.key) + '" data-act="plan-open" data-key="' + esc(g.key) + '" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="rm-b-' + esc(g.key) + '" title="' + esc(t('plan.stationOpen')) + '">' +
      '<span class="rm-mk" aria-hidden="true" data-reveal="mark"' + (delay ? ' data-reveal-delay="' + delay + '"' : '') + '></span>' +
      '<span class="rm-head-in" data-reveal=""' + (delay ? ' data-reveal-delay="' + (delay + 40) + '"' : '') + '>' +
        '<span class="rm-box-k">' + (isCur ? '<span class="rm-now">' + esc(t('plan.tl.now')) + '</span>' : '') + '<span class="rm-title" id="rm-t-' + esc(g.key) + '">' + esc(what) + '</span>' + sr + '</span>' +
        '<span class="rm-box-d num" data-m="dv">' + esc(fmtDateW(model.anchor)) + '</span>' +
        countHtml(g, 'rm-box-c') + togHtml(open) + '</span></button>';
  }
  /* role (phone): 'cur' the open block · 'next' title + why preview · 'compact' one line (short name + count) · 'past'
     (inside the fold, the v8 two-line row). The desktop line ignores the role (CSS) and looks as it did in v8.1. */
  function stationHeadHtml(g, isCur, open, delay, role) {
    var label = t('plan.station', { when: g.when || g.dateLabel, title: g.title, done: g.doneN, total: g.total });
    var compact = role === 'compact';
    var nextFlag = role === 'next' ? '<span class="rm-next">' + esc(t('plan.next.flag')) + '</span>' : '';
    return '<button type="button" class="rm-head' + (role ? ' is-' + role : '') + '" data-flip-key="head:' + esc(g.key) + '" data-act="plan-open" data-key="' + esc(g.key) + '" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="rm-b-' + esc(g.key) + '" title="' + esc(t('plan.stationOpen')) + '">' +
      '<span class="rm-mk" aria-hidden="true" data-reveal="mark"' + (delay ? ' data-reveal-delay="' + delay + '"' : '') + '></span>' +
      '<span class="rm-head-in' + (g.short ? ' has-short' : '') + (compact ? ' is-compact' : '') + '" data-reveal=""' + (delay ? ' data-reveal-delay="' + (delay + 40) + '"' : '') + '>' +
        (nextFlag ? '<span class="rm-when" data-noruby>' + nextFlag + (g.when ? '<span class="rm-rel">' + relHtml(g.when) + '</span>' : '') + '<span class="rm-date">' + esc(g.dateLabel) + '</span></span>' : whenHtml(g, isCur)) +
        '<span class="rm-title" id="rm-t-' + esc(g.key) + '">' + esc(g.title) + '</span>' +
        (g.short ? '<span class="rm-short" aria-hidden="true">' + esc(g.short).replace(/\|/g, '<wbr>') + '</span>' : '') +
        // the short name: compact rows, and the phone's いま head (the same name as the card, see .is-cur in plan.css)
        (compact || role === 'cur' ? '<span class="rm-name" aria-hidden="true">' + esc(g.name) + '</span>' : '') +
        (role === 'next' && g.sub ? '<span class="rm-why" aria-hidden="true">' + esc(g.sub) + '</span>' : '') +
        countHtml(g) + togHtml(open) + '<span class="sr-only">' + esc(label) + '</span></span></button>';
  }
  var bodySrc = {}, bodyPend = {};   // v9 POLISH: the HTML each station body was built from (committed / being built)
  function bodyHtml(g, model, i, open) {
    var h = bodyHtml0(g, model, i, open);
    bodyPend[g.key] = h;
    return h;
  }
  function bodyHtml0(g, model, i, open) {
    var isCur = i === model.cur && !model.beyond;   // long after leaving, いま is the row after the last station
    var nx = isCur ? nextAfter(model) : null;
    var jr = model.track === 'junior';
    var note = g.milestone && model.assumed ? '<p class="rm-note">' + esc(jr ? t('plan.jr.assumedShort', { g: gradeFor(model.anchor, model.now) }) : t('plan.assumedShort')) + '</p>' : '';
    var edit = g.milestone ? '<p class="rm-left rm-left-box"><span class="rm-left-t">' + esc(t('plan.changeLabel', { what: jr ? t('plan.jr.anchor') : t('plan.leave.label'), date: fmtDate(model.anchor) })) + '</span>' +
      '<button type="button" class="rm-edit" data-act="plan-date"><span>' + esc(t('plan.change')) + '</span></button></p>' : '';
    var fk = function (pre) { return ' data-flip-key="' + pre + ':' + esc(g.key) + '"'; };
    return '<div class="rm-body" id="rm-b-' + esc(g.key) + '" role="region" aria-labelledby="rm-t-' + esc(g.key) + '"' + (open ? '' : ' hidden') + '>' +
      '<div class="rm-body-in">' +
        '<p class="rm-body-title" aria-hidden="true"' + fk('bt') + '>' + (isCur && !g.milestone ? '<span class="rm-now">' + esc(t('plan.tl.now')) + '</span>' : '') + esc(g.title) +
          (g.milestone ? '' : '<span class="rm-body-when num" data-noruby>' + esc((g.when ? g.when + '・' : '') + g.dateLabel) + '</span>') + '</p>' +
        // v9 POLISH: the period's why in every panel (the phone hides it on いま, where the card just said it)
        (g.sub ? '<p class="rm-sub"' + fk('sub') + '>' + esc(g.sub) + '</p>' : '') + note.replace('<p ', '<p' + fk('note') + ' ') + edit.replace('<p ', '<p' + fk('edit') + ' ') +
        (g.pulled ? '<p class="rm-pulled"' + fk('pulled') + '>' + esc(t(g.pulled === 1 ? 'plan.left.note1' : 'plan.left.note', { n: g.pulled })) + '</p>' : '') +
        (g.all.length ? '<ul class="tl-items" data-reveal-stagger="50">' + itemsHtml(g.all, model) + '</ul>' : '<p class="rm-empty"' + fk('empty') + '>' + esc(t('plan.now.emptyT')) + '</p>') +
        addRowHtml(g) +
        naHtml(g) +
        (isCur && g.total ? curDoneHtml(nx, g) : '') + relatedHtml(g) +
      '</div></div>';
  }
  function stationHtml(g, i, model, k, role) {
    var isCur = i === model.cur && !model.beyond;
    var cls = i < model.cur || (model.beyond && i === model.cur) ? 'is-past' : isCur ? 'is-current' : 'is-future';
    var open = isOpenKey(model, g.key, i);
    var allDone = g.total > 0 && g.doneN === g.total;
    var delay = Math.min(k, 6) * 50;
    var head = g.milestone ? boxHtml(g, model, isCur, open, delay) : stationHeadHtml(g, isCur, open, delay, role);
    return '<li class="rm-st ' + cls + (g.milestone ? ' is-milestone' : '') + (allDone ? ' is-complete' : '') + (open ? ' is-open' : '') + (role ? ' is-' + role : '') + '" id="tl-' + esc(g.key) + '" data-group="' + esc(g.key) + '">' +
      head + bodyHtml(g, model, i, open) + '</li>';
  }
  /* phone: the stations already passed fold into one row (「ここまでの3駅」 + one combined count); desktop: display: contents */
  /* fid: 'fold' (the past · or, already left, the stations before the sign = 「巣立ち前」) · 'fold2' (past stations after leaving) */
  function foldHtml(items, groups, k, fid, left) {
    fid = fid || 'fold';
    var n = groups.length, done = 0, total = 0;
    groups.forEach(function (g) { done += g.doneN; total += g.total; });
    var delay = Math.min(k, 6) * 50;
    var allDone = total > 0 && done === total;
    var open = !!foldOpen[fid];
    // 「ここまでの3駅」 · already left: 「巣立ち前（9駅）」 then 「出てから、ここまでの2駅」 (the two folds read as a sequence)
    var title = left ? t('plan.left.fold', { n: n }) : fid === 'fold2' ? t(n === 1 ? 'plan.fold.sinceLeft1' : 'plan.fold.sinceLeft', { n: n }) : t(n === 1 ? 'plan.fold.past1' : 'plan.fold.past', { n: n });
    // v9 INTEGRATOR: the fold's count is the number done (green), shown only once something is (0/5 read as failure)
    return '<li class="rm-fold' + (open ? ' is-open' : '') + (allDone ? ' is-complete' : '') + (left ? ' is-left' : '') + '" data-group="' + fid + '" data-flip-key="' + fid + '">' +
      '<button type="button" class="rm-head rm-fold-head" data-act="plan-fold" data-flip-key="head:' + fid + '" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="rm-fold-list-' + fid + '" title="' + esc(foldTitle(open, left)) + '">' +
        '<span class="rm-mk" aria-hidden="true" data-reveal="mark"' + (delay ? ' data-reveal-delay="' + delay + '"' : '') + '></span>' +
        '<span class="rm-head-in is-compact" data-reveal=""' + (delay ? ' data-reveal-delay="' + (delay + 40) + '"' : '') + '>' +
          '<span class="rm-title">' + esc(title) + '</span>' +
          (total ? '<span class="rm-count num" data-gcount="' + fid + '" data-done="' + done + '" aria-label="' + esc(t('plan.progress') + ' ' + t('plan.progressOf', { done: done, total: total })) + '"><b class="rm-count-n">' + done + '</b><span class="rm-count-of">/' + total + '</span><small class="rm-count-w">' + esc(t('plan.doneWord')) + '</small></span>' : '') +
          togHtml(open) + '</span></button>' +
      '<ol class="rm-fold-list' + (open ? '' : ' is-closed') + '" id="rm-fold-list-' + fid + '">' + items.join('') + '</ol></li>';
  }
  function foldTitle(open, left) { return t(left ? (open ? 'plan.left.foldClose' : 'plan.left.foldOpen') : (open ? 'plan.fold.close' : 'plan.fold.open')); }
  /* v9 EXTRAS: long after leaving, the end row carries the still-useful items (国保 · 年金 · 帰る場所 · 連絡先) */
  function endBodyHtml(model, open) {
    var h = endBodyHtml0(model, open);
    if (h) bodyPend.end = h;
    return h;
  }
  function endBodyHtml0(model, open) {
    var xs = model.endPulled || [];
    if (!xs.length) return '';
    return '<div class="rm-body rm-body-end" id="rm-b-end" role="region" aria-label="' + esc(t('plan.tl.now')) + '"' + (open ? '' : ' hidden') + '>' + '<div class="rm-body-in">' +
      '<p class="rm-body-title" aria-hidden="true" data-flip-key="bt:end"><span class="rm-now">' + esc(t('plan.tl.now')) + '</span>' + esc(t('plan.now.lateT')) + '</p>' +
      '<p class="rm-pulled" data-flip-key="pulled:end">' + esc(t(xs.length === 1 ? 'plan.left.note1' : 'plan.left.note', { n: xs.length })) + '</p>' +
      '<ul class="tl-items" data-reveal-stagger="50">' + itemsHtml(xs, model) + '</ul></div></div>';
  }
  function labelHtml(key) {
    return '<li class="rm-label" data-group="label" data-flip-key="label:' + esc(key) + '"><span>' + esc(t(key)) + '</span></li>';
  }
  /* いま before the first station (plenty of time) / after the last one (long after leaving) */
  function nowOnlyHtml(model, end, k) {
    var jr = model.track === 'junior';
    var delay = Math.min(k, 6) * 50;
    var hasBody = end && model.endPulled && model.endPulled.length;
    var openEnd = hasBody && (!wide() || !(selKey && groupOf(model, selKey)));
    // with a list under it, the end row is a station too: on the desktop line it opens its list as the panel (phone: always open)
    var head = hasBody ? '<button type="button" class="rm-head" data-flip-key="head:end" data-act="plan-open-end" aria-expanded="' + (openEnd ? 'true' : 'false') + '" aria-controls="rm-b-end">' : '<div class="rm-head is-static" data-flip-key="head:now">';
    return '<li class="rm-st rm-now-only is-current' + (end ? ' is-end' : '') + (openEnd ? ' is-open' : '') + '" data-group="' + (end ? 'end' : 'now') + '" data-flip-key="' + (end ? 'end' : 'now') + '">' +
      head + '<span class="rm-mk" aria-hidden="true" data-reveal="mark"' + (delay ? ' data-reveal-delay="' + delay + '"' : '') + '></span>' +
      '<span class="rm-head-in" data-reveal=""' + (delay ? ' data-reveal-delay="' + (delay + 40) + '"' : '') + '>' +
        '<span class="rm-when" data-noruby><span class="rm-now">' + esc(t('plan.tl.now')) + '</span><span class="rm-date">' + esc(fmtDate(model.now)) + '</span></span>' +
        '<span class="rm-title">' + esc(t(end ? (jr ? 'plan.jr.nowLate' : 'plan.tl.nowLate') : (jr ? 'plan.jr.nowEarly' : 'plan.tl.nowEarly'))) + '</span>' +
        (end ? '<a class="tl-link rm-consult" href="#/find/cat/consult"><span>' + esc(t('plan.now.consult')) + '</span>' + arrow() + '</a>' : '') +
      '</span>' + (hasBody ? '</button>' : '</div>') + (hasBody ? endBodyHtml(model, openEnd) : '') + '</li>';
  }
  /* v9 phone order: [fold of the past] · いま (open) · つぎ (preview) · この先 · compact rows · the sign · 巣立ったあと ·
     compact rows. Desktop: the same <li>s on one row (fold and labels are display: contents / none there). */
  function roadmapHtml(model) {
    var g = model.groups;
    if (!g.length) return '';
    var jr = model.track === 'junior';
    var out = [], past = [], pastG = [], k = 0;
    var lastPast = model.beyond ? model.cur : model.cur - 1;
    if (model.cur === -1) out.push(nowOnlyHtml(model, false, k++));
    var ahead = false, after = false, nextSeen = false;
    // already left: the stations up to the sign fold into 「巣立ち前」; past stations after it into 「ここまでの n駅」
    var left = !!model.left && !jr;
    var pre = [], preG = [];
    var flushPast = function () {
      if (pre.length) { out.push(foldHtml(pre, preG, k++, 'fold', true)); pre = []; preG = []; }
      if (past.length) { out.push(foldHtml(past, pastG, k++, left ? 'fold2' : 'fold', false)); past = []; pastG = []; }
    };
    g.forEach(function (x, i) {
      if (i <= lastPast) {
        if (left && x.m <= 0) { pre.push(stationHtml(x, i, model, k++, 'past')); preG.push(x); }
        else { past.push(stationHtml(x, i, model, k++, 'past')); pastG.push(x); }
        return;
      }
      flushPast();
      var isCur = i === model.cur && !model.beyond;
      var role = isCur ? 'cur' : !nextSeen && !x.milestone ? 'next' : 'compact';
      if (role === 'next') nextSeen = true;
      if (x.after && !after) { after = true; out.push(labelHtml(jr ? 'plan.label.jrAfter' : 'plan.label.after')); }
      // この先 only over a plain compact row (the sign speaks for itself; a label with nothing under it is noise)
      else if (!isCur && role === 'compact' && !x.milestone && !ahead && !after) { ahead = true; out.push(labelHtml('plan.label.ahead')); }
      out.push(stationHtml(x, i, model, k++, role));
    });
    flushPast();
    if (model.beyond) out.push(nowOnlyHtml(model, true, k++));
    return '<ol class="rm" data-track="' + model.track + '">' + out.join('') + '</ol>';
  }
  function colsOf(model) {
    var n = 0;
    if (model.cur === -1) n++;
    model.groups.forEach(function (x) { n += x.milestone ? 2 : 1; });
    if (model.beyond) n++;
    return n;
  }

  /* ---------- beside the roadmap (desktop): 職員に見せる · 保存した支援. On a phone the card's action row has these. ---------- */
  function showHtml() {
    var row = function (act, icon, title, sub) {
      return SM.ui.listItem({ title: title, sub: sub, icon: icon, act: act, attrs: 'data-press="ink"' });
    };
    return '<section class="plan-show" id="plan-show" aria-labelledby="plan-show-h"><p class="plan-side-k" id="plan-show-h">' + esc(t('plan.top.show')) + '</p>' +
      '<div class="list plan-tools-list">' +
      row('plan-sheet', 'print', t('plan.act.sheet'), t('plan.act.sheetSub')) +
      row('plan-ics', 'calendar', t('plan.act.ics'), t('plan.act.icsSub')) +
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
  /* v9 EXTRAS: one list. A saved support = kanji mark · name · the station it sits on · its deadline / window · ✕.
     The suggested supports (the road ahead) are a quiet second group in the same list; nothing saved = one line. */
  function progItemOf(model, id) {
    var key = 'pg:' + id;
    for (var i = 0; i < model.groups.length; i++) {
      var g = model.groups[i];
      for (var j = 0; j < g.progs.length; j++) if (g.progs[j].key === key) return { g: g, x: g.progs[j] };
    }
    return null;
  }
  function stationLabel(g) { return t('plan.saved.at', { when: g.milestone ? g.title : (g.when || g.dateLabel) }); }
  function svMainHtml(p, g, x, sug) {
    var name = L(p.name);
    var cat = (p.cat && p.cat[0]) || 'procedures';
    var at = g ? stationLabel(g) : t('plan.saved.anytime');
    var dl = x && x.label ? (x.window ? t('plan.sv.apply', { v: x.short }) : t('plan.sv.due', { v: x.label })) : (!sug && !x && p.deadline ? L(p.deadline) : '');
    return '<a class="sv-main" href="#/p/' + encodeURIComponent(p.id) + '" aria-label="' + esc(t('plan.sv.open', { t: name })) + '">' + SM.ui.catIcon(cat, 'sm') +
      '<span class="sv-body"><span class="sv-name">' + esc(name) + '</span>' +
      '<span class="sv-meta"><span class="sv-at' + (g ? '' : ' is-any') + '"' + (g ? ' data-key="' + esc(g.key) + '"' : '') + '>' + esc(at) + '</span>' +
      (dl ? '<span class="sv-dl' + (x && x.open ? ' is-open' : '') + '">' + esc(dl) + (x && x.open ? '<b class="tl-open-now">' + esc(t('plan.tl.openNow')) + '</b>' : '') + '</span>' : '') + '</span></span>' +
      (sug ? arrow() : '') + '</a>';
  }
  function savedRowHtml(p, model) {
    var name = L(p.name);
    var m = model || lastModel || build();
    var hit = progItemOf(m, p.id);
    return '<li class="plan-saved-item sv-row" data-flip-key="' + esc(p.id) + '">' + svMainHtml(p, hit && hit.g, hit && hit.x, false) +
      '<button type="button" class="plan-remove" data-act="plan-remove" data-id="' + esc(p.id) + '" aria-label="' + esc(t('plan.saved.removeLabel', { name: name })) + '" title="' + esc(t('plan.saved.remove')) + '">' + ic('close') + '</button></li>';
  }
  /* supports the road ahead links to (from いま on), not yet saved: [{ p, g }] */
  function sugList(model, max) {
    var g = model.groups, out = [], seen = {}, savedIds = (state().saved || []);
    var from = model.cur >= 0 ? model.cur : 0;
    for (var i = from; i < g.length && out.length < (max || 3); i++) {
      g[i].tasks.forEach(function (x) {
        (x.p || []).forEach(function (id) {
          if (out.length >= (max || 3)) return;
          var p = SM.program(id);
          if (!p || savedIds.indexOf(id) !== -1) return;
          var nm = L(p.name).replace(/[（(].*$/, '');
          if (seen[nm]) return;
          seen[nm] = true;
          out.push({ p: p, g: g[i] });
        });
      });
    }
    return out;
  }
  function sugHtml(model) {
    var rel = sugList(model, 3);
    var answered = state().answered;
    var go = '<a class="plan-empty-go" href="' + (answered ? '#/find/results' : '#/find') + '"><span>' + esc(answered ? t('plan.empty.results') : t('plan.empty.find')) + '</span>' + arrow() + '</a>';
    var list = '<ul class="sv-sug-list">' + rel.map(function (r) { return '<li class="sv-row is-sug">' + svMainHtml(r.p, r.g, null, true) + '</li>'; }).join('') + '</ul>';
    // v9 INTEGRATOR: nothing saved → the suggestions fold into one line (the page's length is the road's, not this block's)
    var body = !rel.length ? '' : model.saved.length ? '<p class="sv-sug-k">' + esc(t('plan.sv.sug')) + '</p>' + list :
      '<details class="sv-sug-d"><summary class="tl-related-k sv-sug-s">' + esc(t('plan.sv.sugN', { n: rel.length })) + '</summary>' + list + '</details>';
    return '<div class="sv-sug" id="plan-sv-sug">' + body + go + '</div>';
  }
  function savedEmptyHtml() {
    return '<ul class="plan-saved-list sv-list is-empty"><li class="sv-empty">' + esc(t('plan.empty.line')) + '</li></ul>';
  }
  function syncSug(root, model) {
    var old = root.querySelector('#plan-sv-sug');
    if (!old) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = sugHtml(model);
    var nw = tmp.firstElementChild;
    if (nw.innerHTML === old.innerHTML) return;
    applyRuby(nw);
    old.parentNode.replaceChild(nw, old);
    if (M() && M().mount) M().mount(nw, { instant: true });
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
      '<ul class="plan-saved-list sv-list" data-reveal-stagger="40">' + model.saved.map(function (p) { return savedRowHtml(p, model); }).join('') + '</ul>' :
      savedEmptyHtml();
    return '<section class="plan-saved" id="plan-saved" aria-labelledby="plan-saved-h">' + savedHeadHtml(model) + body + sugHtml(model) + '</section>';
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
        '<div class="plan-flow">' + showHtml() + savedHtml(model) + '</div>' +
      '</div></section>';
  }

  /* ------------------------------------------------------------------ view */
  function render() {
    renderGen++;
    bodyPend = {};
    var ti = trackInfo();
    var model = build({ track: ti.track });
    lastModel = model;
    var main = document.getElementById('view');
    var inPlace = !!(main && main.classList.contains('v-plan') && main.querySelector('.plan-rm'));
    lastCalm = calm || inPlace;
    calm = false;
    // first visit, nothing known: the two-question start; the road comes after the first tap
    if (startMode()) return headHtml({ track: ti.track, showSwitch: false }, model) + startHtml() + '<div class="plan-print" aria-hidden="true"></div>';
    // Q2 (the date / the grade) on its own, still without the road
    if (askPending(model)) return headHtml({ track: ti.track, showSwitch: false }, model) + askHtml(model) + '<div class="plan-print" aria-hidden="true"></div>';
    return headHtml(ti, model) + topHtml(model) + bodyHtml2(model) + '<div class="plan-print" aria-hidden="true"></div>';
  }
  function flushDeferred() { }

  var nowScrolled = false;
  window.addEventListener('hashchange', function () { nowScrolled = false; });

  function mount(root) {
    var model = lastModel || build();
    bodySrc = bodyPend; bodyPend = {};
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
          var mark = row.querySelector('.cat-icon');
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
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  var EXP_EASE = 'cubic-bezier(0.2, 0, 0, 1)', EXP_OPEN = 380, EXP_CLOSE = 300;   // motion.js expand()'s timing
  var SDA = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline', 'view()');
  function readRange(H) {
    var vh = window.innerHeight || 800, pad = 0;
    if (SDA) { try { pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0; } catch (e) { } }
    var span = vh - pad + H;
    var A = 0.35 * vh / span * 100, B = (0.35 * vh + H) / span * 100;
    return ['cover ' + A.toFixed(3) + '%', 'cover ' + Math.min(100, B).toFixed(3) + '%'];
  }
  /* every mark on the line, in order: stations (also those inside the fold, when it is open) and the fold's own row */
  function markCenters(wrap) {
    var wr = wrap.getBoundingClientRect();
    var lis = wrap.querySelectorAll(':scope > ol.rm li.rm-st, :scope > ol.rm > li.rm-fold');
    var out = [];
    for (var i = 0; i < lis.length; i++) {
      var mk = lis[i].querySelector(':scope > .rm-head > .rm-mk');
      if (!mk || mk.offsetParent === null) { out.push(null); continue; }
      var r = mk.getBoundingClientRect();
      if (!r.width && !r.height) { out.push(null); continue; }
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
  /* the geometry the line would have in another state (a fold or drawer about to close): apply, read, undo */
  function peekGeom(root, apply, undo) {
    var wrap = root && root.querySelector('.rm-wrap');
    if (!wrap) return null;
    apply();
    var gm = fillGeom(wrap, lastModel || build());
    undo();
    return gm;
  }
  /* o: { from: the line glides from its old length · geom: a measured target instead of the DOM's state now ·
         dur / ease: run on this timing (a fold or drawer: the same curve as the rows) · entrance: draw on arrival } */
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
    var gm = o.geom || fillGeom(wrap, model);
    if (!gm) { fill.style.display = 'none'; rail.style.display = 'none'; fill._L = 0; fill._R = 0; return; }
    var inner = fill.firstElementChild;
    var oldL = fill._L || 0, oldH = fill._horiz, oldR = fill._R || 0;
    var R = gm.end - gm.start;
    rail.style.display = '';
    fill.style.display = gm.L > 1 ? '' : 'none';
    fill._L = gm.L; fill._horiz = gm.horiz; fill._R = R;
    if (gm.horiz) {
      rail.style.cssText = 'left:' + gm.start + 'px;width:' + R + 'px;top:' + gm.cross + 'px;transform-origin:left center';
      fill.style.left = gm.start + 'px'; fill.style.top = gm.cross + 'px'; fill.style.width = gm.L + 'px'; fill.style.height = '';
      fill.style.transformOrigin = 'left center';
      if (inner) inner.style.transformOrigin = 'left center';
    } else {
      rail.style.cssText = 'top:' + gm.start + 'px;height:' + R + 'px;left:' + gm.cross + 'px;transform-origin:center top';
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
    var timing = o.dur ? { duration: o.dur, easing: o.ease || EXP_EASE } : { spring: 'smooth', maxDuration: 520 };
    if (o.from != null && oldH === gm.horiz) {
      // a station, fold or drawer opened/closed, or a tick moved the tip: the line (and the pale rail under it)
      // glides from where it was to where it is, on the rows' own curve, never ahead of the marks
      if (oldL && Math.abs(oldL - gm.L) > 1) {
        inner.style.transform = 'none';
        anim(inner, [{ transform: prop + '(' + (oldL / gm.L) + ')' }, { transform: 'none' }], merge({ key: 'tlfill' }, timing));
      }
      if (oldR && R > 1 && Math.abs(oldR - R) > 1) anim(rail, [{ transform: prop + '(' + (oldR / R) + ')' }, { transform: 'none' }], merge({ key: 'tlrail' }, timing));
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
    var folds = Array.prototype.map.call(root.querySelectorAll('ol.rm > li.rm-fold'), function (fli) {
      var fc = fli.querySelector('[data-gcount]');
      return { li: fli, fc: fc, v: vis(fc) };
    });
    if (m && m.seen) m.seen('plan.done.' + model.track, model.done);
    // v9: the card counts the current station (applicable tasks only); its why line turns into つぎの駅 when all are done
    var cg = curGroup(model);
    if (cg && cg.total) {
      rollNum(eDone, cg.doneN, vDone);
      rollNum(eTotal, cg.total, vTotal);
      var pc = root.querySelector('#plan-top-count');
      var allDone = cg.doneN === cg.total;
      if (pc) {
        pc.setAttribute('aria-label', t('plan.progress') + ' ' + t('plan.progressOf', { done: cg.doneN, total: cg.total }));
        if (pc.classList.contains('is-all') !== allDone) {
          pc.classList.toggle('is-all', allDone);
          var why = root.querySelector('#plan-top-why');
          var nx = nextAfter(model);
          if (why) swapOrSet(why, allDone ? (nx ? t('plan.top.next', { t: nx.title, from: fromLabel(nx) }) : t('plan.top.allDone')) : (cg.sub || ''));
        }
      }
    } else if (root.querySelector('#plan-top')) refreshTop(root, model);
    // each fold's combined count (the past; already left: 巣立ち前 and the past stations after it)
    folds.forEach(function (fo2) {
      var fli = fo2.li, fc = fo2.fc;
      if (!fc) return;
      var fd = 0, ft = 0;
      var lis = fli.querySelectorAll(':scope > ol.rm-fold-list > li.rm-st[data-group]');
      Array.prototype.forEach.call(lis, function (li) { var g = groupOf(model, li.getAttribute('data-group')); if (g) { fd += g.doneN; ft += g.total; } });
      if (fc.getAttribute('data-done') !== String(fd)) fc.setAttribute('data-done', fd);
      rollNum(fc.querySelector('.rm-count-n'), fd, fo2.v);
      var fo = fc.querySelector('.rm-count-of');
      if (fo && fo.textContent !== '/' + ft) fo.textContent = '/' + ft;
      fli.classList.toggle('is-complete', ft > 0 && fd === ft);
    });
    model.groups.forEach(function (g, gi) {
      var el = gEls[gi].el;
      var li = document.getElementById('tl-' + g.key);
      if (el) {
        if (el.getAttribute('data-done') !== String(g.doneN)) el.setAttribute('data-done', g.doneN);
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
    // a cheap phone (≤4 cores) runs the check, the wash and the stamp one after another, not all in the first frame
    var slow = lowEnd();
    if (on && motion && m && !slow) settleRow(li);
    if (on && motion && m && canAnim()) {
      var seal = li.querySelector('.tl-seal');
      if (seal && m.stamp) {
        seal.style.opacity = '0';
        setTimeout(function () { seal.style.opacity = ''; if (li.classList.contains('is-done')) m.stamp(seal); }, slow ? 420 : 150);
      }
    }
  }
  function lowEnd() { try { return (navigator.hardwareConcurrency || 8) <= 4; } catch (e) { return false; } }
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
    while (nx && !nx.classList.contains('rm-st')) nx = nx.nextElementSibling;   // v9: a label row may sit between
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
  /* v9 POLISH: what the tick moved, said on the row's own rule (「あと2つ」 / 「この駅はぜんぶできた」) — a small cue
     that rises after the check has drawn, holds, and fades; the live region says it for screen readers. The box
     itself is the undo (tick again), so no toast comes up over the next task. */
  function announce(text) {
    var el = document.getElementById('plan-live');
    if (!el) return;
    el.textContent = '';
    setTimeout(function () { el.textContent = text; }, 40);
  }
  /* one cue at a time: a new tick drops every echo still showing (only the latest 「あと n つ」 is true) */
  function dropEcho(scope) {
    var list = scope ? scope.querySelectorAll('.tl-echo') : [];
    Array.prototype.forEach.call(list, function (e) { clearTimeout(e._smT); if (e.parentNode) e.parentNode.removeChild(e); });
  }
  function echo(li, text) {
    var row = li && (li.querySelector(':scope > .tl-row') || li.querySelector(':scope > .tl-task'));
    if (!row) return;
    dropEcho(view() || li);
    var e = document.createElement('span');
    e.className = 'tl-echo';
    e.setAttribute('aria-hidden', 'true');
    e.textContent = text;
    row.appendChild(e);
    var m = M();
    var live = canAnim();
    var gone = function () { clearTimeout(e._smT); if (e.parentNode) e.parentNode.removeChild(e); };
    if (live) anim(e, [{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: 240, delay: 260, easing: EASE('enter'), fill: 'backwards', key: 'echo' });
    else if (m) anim(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: 120, easing: 'linear', fill: 'backwards', key: 'echo' });
    e._smT = setTimeout(function () {
      if (!e.parentNode) return;
      var a = anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: live ? 200 : 140, easing: EASE('exit'), fill: 'forwards', key: 'echo' });
      finished(a).then(gone);
      e._smT = setTimeout(gone, 400);
    }, live ? 2400 : 2000);
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
    if (li) {
      if (on && !opts.quiet && g) {
        var left = Math.max(0, g.total - g.doneN);
        // the current station, all done: its own green line (「この時期は、ぜんぶできた」 + the way on) rises instead
        if (nowComplete && gEl.classList.contains('is-current')) dropEcho(view() || li);
        else echo(li, nowComplete ? t('plan.echo.all') : t(left === 1 ? 'plan.echo.left1' : 'plan.echo.left', { n: left }));
        var tt = li.querySelector('.tl-item-main');
        announce(t('plan.echo.undo', { t: tt ? tt.textContent.trim() : '' }));
      } else if (!on) dropEcho(li);
    }
    if (opts.focus) focusQuiet(cb);
    return { group: nowComplete && !wasComplete };
  }
  SM.on('plan-done', function (el) {
    markDone(el.getAttribute('data-key'), !!el.checked);
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
  /* the end row (long after leaving) with its still-useful list: a panel on the desktop line; on the phone it is always open */
  SM.on('plan-open-end', function () { if (wide()) openStation('end', {}); });
  SM.on('plan-jump', function (el) { openStation(el.getAttribute('data-key'), { scroll: true, focus: true }); });

  /* ------------------------------------------------------------------ v9: the start, the fold, drawers, states */
  /* Q1: 中学生 → the 高校受験 track (and 中3 as the stage when none is known); 高校生 → 巣立ち; もう出た → left0 */
  SM.on('plan-start', function (el) {
    var v = el.getAttribute('data-value');
    var a = state().answers || (state().answers = {});
    // a stage from さがす (or an earlier tap here) that contradicts the answer is dropped: the answer here wins
    var isJ = /^jhs/.test(a.stage || ''), isL = /^left/.test(a.stage || '');
    if (v === 'jhs') { if (!isJ) a.stage = null; SM.store.set('plan:track', 'junior'); }   // the grade is Q2 (plan-start-grade); nothing is guessed
    else if (v === 'hs') { if (isJ || isL) a.stage = null; SM.store.set('plan:track', 'leaving'); }
    else if (v === 'left') { if (!isL) a.stage = 'left0'; SM.store.set('plan:track', 'leaving'); }
    else return;
    SM.store.set('plan:started', true);
    SM.save();
    if (SM.syncJunior) try { SM.syncJunior(); } catch (e) { }
    selKey = null; openKeys = {};
    var m = M();
    var root = view();
    var card = root && root.querySelector('#plan-top');
    var go = function () { calm = true; SM.render(); };
    if (card && m && canAnim()) {
      var a1 = anim(card, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: EASE('exit'), fill: 'forwards' });
      finished(a1).then(go);
    } else go();
  });
  /* Q2 for a 中学生: the grade (中1・中2 → jhs12, 中3 → jhs3); the entry date is the April that follows */
  SM.on('plan-start-grade', function (el) {
    var v = el.getAttribute('data-value');
    if (v !== 'jhs12' && v !== 'jhs3') return;
    var a = state().answers || (state().answers = {});
    a.stage = v;
    SM.save();
    if (SM.syncJunior) try { SM.syncJunior(); } catch (e) { }
    selKey = null; openKeys = {};
    calm = true;
    SM.render();
  });
  /* Q2 「まだ決まっていない」: the countdown shows with 仮 (the date dialog is the other answer) */
  /* もどる on Q2: back to Q1 (the answer here is forgotten; the stage from さがす, if any, stays) */
  SM.on('plan-start-back', function () {
    SM.store.remove('plan:started');
    SM.store.remove('plan:dateSeen');
    calm = true;
    SM.render();
  });
  SM.on('plan-start-nodate', function () {
    SM.store.set('plan:dateSeen', true);
    calm = true;
    SM.render();
  });
  /* v9 POLISH: a block opening / closing in place on the road (motion.js expand: clip + the rows below slide on one
     curve). The green line and its rail follow on the same curve: opening, they glide to the new geometry at once;
     closing, the closed geometry is peeked first (o.peek(v): the cheapest toggle that gives the closed layout), so
     the line never lags the rows. Reduced motion / no engine: the state flips and the body fades in. Returns a promise. */
  function expandLine(container, on, o) {
    var root = view(), m = M();
    var rewire = function () { if (root && root.isConnected) wireFill(root, { from: true }); };
    if (!(m && m.expand && canAnim()) || !root) {
      o.setOpen(on);
      if (m && on && o.body) { var bs = o.body.length != null ? Array.prototype.slice.call(o.body) : [o.body]; bs.forEach(function (b) { anim(b, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear', key: 'expand' }); }); }
      rewire();
      return Promise.resolve();
    }
    if (on) {
      var p1 = m.expand(container, true, { setOpen: o.setOpen, body: o.body });
      wireFill(root, { from: true, dur: EXP_OPEN, ease: EXP_EASE });
      return p1.then(rewire);
    }
    var peek = o.peek || o.setOpen, hc = null, gm = null;
    peek(false); hc = container.getBoundingClientRect().height; gm = fillGeom(root.querySelector('.rm-wrap'), lastModel || build()); peek(true);
    var p2 = m.expand(container, false, { setOpen: o.setOpen, body: o.body, closedHeight: hc });
    if (gm) wireFill(root, { from: true, geom: gm, dur: EXP_CLOSE, ease: EXP_EASE });
    return p2.then(rewire);
  }
  /* the past stations unfold / fold */
  function setFold(li, on) {
    foldOpen[li.getAttribute('data-group') || 'fold'] = on;
    li.classList.toggle('is-open', on);
    var h = li.querySelector(':scope > .rm-fold-head');
    if (h) { h.setAttribute('aria-expanded', on ? 'true' : 'false'); h.setAttribute('title', foldTitle(on, li.classList.contains('is-left'))); }
    var list = li.querySelector(':scope > .rm-fold-list');
    if (list) { list.classList.toggle('is-closed', !on); if (on && M() && M().mount) M().mount(list, { instant: true }); }
    var tl = li.querySelector('.rm-tog-l');
    if (tl) tl.textContent = t(on ? 'plan.close' : 'plan.open');
  }
  /* want: true/false/null (toggle) · li: one fold row, or every fold on the road when left out */
  function toggleFold(want, li) {
    var root = view();
    if (!li) {
      var all = root ? root.querySelectorAll('ol.rm > li.rm-fold') : [];
      if (!all.length) return false;
      Array.prototype.forEach.call(all, function (x) { toggleFold(want, x); });
      return true;
    }
    var was = li.classList.contains('is-open');
    var on = want == null ? !was : !!want;
    if (on === was) return true;
    var list = li.querySelector(':scope > .rm-fold-list');
    expandLine(li, on, { setOpen: function (v) { setFold(li, v); }, body: list ? list.children : null,
      peek: function (v) { if (list) list.classList.toggle('is-closed', !v); } });
    return true;
  }
  SM.on('plan-fold', function (el) { toggleFold(null, el.closest('.rm-fold')); });
  /* 全部の駅: the road unfolds and scrolls into view */
  SM.on('plan-all', function () {
    var root = view();
    var sec = root && root.querySelector('#plan-tl');
    if (!sec) return;
    toggleFold(true);
    var target = sec.querySelector('ol.rm') || sec;
    try { target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); } catch (e) { target.scrollIntoView(); }
    var first = sec.querySelector('ol.rm .rm-head');
    if (first) focusQuiet(first);
  });
  /* a task's drawer */
  function setDrawer(li, on) {
    var btn = li.querySelector('.tl-t');
    var dr = li.querySelector(':scope > .tl-drawer');
    var row = li.querySelector(':scope > .tl-row');
    if (btn) btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (row) row.classList.toggle('is-open', on);
    if (dr) { dr.hidden = !on; if (on && M() && M().mount) M().mount(dr, { instant: true }); }
    li.classList.toggle('is-drawer-open', on);
  }
  SM.on('plan-drawer', function (el) {
    var key = el.getAttribute('data-key');
    var li = el.closest('.tl-item');
    if (!li || !li.querySelector(':scope > .tl-drawer')) return;
    var on = !li.classList.contains('is-drawer-open');
    drawerOpen[key] = on;
    var dr = li.querySelector(':scope > .tl-drawer');
    expandLine(li, on, { setOpen: function (v) { setDrawer(li, v); }, body: dr ? dr.firstElementChild : null,
      peek: function (v) { if (dr) dr.hidden = !v; } });
  });
  /* 関係ないにした… line */
  SM.on('plan-na', function (el) {
    var key = el.getAttribute('data-key');
    var box = el.closest('.tl-na');
    var list = box && box.querySelector('.tl-na-list');
    if (!list) return;
    var on = list.hidden;
    naOpen[key] = on;
    var set = function (v) { list.hidden = !v; el.setAttribute('aria-expanded', v ? 'true' : 'false'); };
    expandLine(box, on, { setOpen: set, body: list.children, peek: function (v) { list.hidden = !v; } });
  });
  /* v9 POLISH: the blocks of the road that move as units when something in it changes — closed stations, folds and
     labels as wholes; an open station's head and each block of its body (every task row, the add row, 関係ないにした…,
     the done line, 関係する支援); then the column under the road. Nothing nested twice, so a FLIP translates each once. */
  function flatUnits(wrap) {
    var out = [];
    var body = function (li) {
      var b = li.querySelector(':scope > .rm-body');
      if (!b || b.hidden) return;
      var inn = b.querySelector(':scope > .rm-body-in');
      Array.prototype.forEach.call(inn ? inn.children : b.children, function (c) {
        if (c.classList.contains('tl-items')) Array.prototype.forEach.call(c.children, function (r) { out.push(r); });
        else out.push(c);
      });
    };
    var walk = function (ol) {
      Array.prototype.forEach.call(ol.children, function (li) {
        if (li.classList.contains('rm-fold')) {
          if (!li.classList.contains('is-open')) { out.push(li); return; }
          out.push(li.querySelector(':scope > .rm-head'));
          var l2 = li.querySelector(':scope > .rm-fold-list');
          if (l2) walk(l2);
          return;
        }
        if (!li.classList.contains('is-open') || !li.querySelector(':scope > .rm-body')) { out.push(li); return; }
        out.push(li.querySelector(':scope > .rm-head'));
        body(li);
      });
    };
    var ol = wrap.querySelector(':scope > ol.rm');
    if (ol) walk(ol);
    var flow = wrap.querySelector(':scope > .plan-flow');
    if (flow) Array.prototype.forEach.call(flow.children, function (c) { out.push(c); });
    return out.filter(Boolean);
  }
  /* the three states, own tasks: a change is stored, the road is rebuilt in place (open stations and drawers kept)
     and the rows glide to their new places; a removed row fades where it was, a new one rises in. o.hop: a selector
     for a row that changes station (it fades out and rises in at its new place instead of sliding through others).
     Reduced motion / no engine: the state flips, a new row fades in. */
  function reflow(root, focusSel, o) {
    o = o || {};
    var model = build();
    lastModel = model;
    var m = M();
    var wrap = root.querySelector('.rm-wrap');
    var change = function () { rebuildRoadmap(root, model); };
    if (wrap && m && m.flip && canAnim()) m.flip(wrap, change, { selector: flatUnits, hop: o.hop || null, duration: 420 });
    else change();
    refreshTop(root, model);
    if (focusSel) { var f = root.querySelector(focusSel); if (f) focusQuiet(f); }
    // the counts and the line follow one frame later: the rows' first frame paints without another forced layout
    afterPaint(function () {
      if (!root.isConnected || !isPlanRoute()) return;
      refreshCounts(model);
      wireFill(root, { from: true, dur: 400, ease: EXP_EASE });
      if (SM.updateBadge) try { SM.updateBadge({ roll: true }); } catch (e) { }
    });
  }
  /* a row about to leave: in reduced motion it fades first (the FLIP ghosts it otherwise); the row stops taking taps */
  function fadeRowThen(li, fn) {
    var m = M();
    if (li) li.style.pointerEvents = 'none';
    if (!li || !m || canAnim()) { fn(); return; }
    var a = anim(li, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'linear', fill: 'forwards', key: 'skip' });
    finished(a).then(fn);
    setTimeout(fn, 400);
  }
  SM.on('plan-skip', function (el) {
    var key = el.getAttribute('data-key'), v = el.getAttribute('data-value');
    if (v !== 'na' && v !== 'later') return;
    var root = view();
    var li = el.closest('.tl-item');
    var model = lastModel || build();
    var nx = v === 'later' ? nextWithTasks(model, key) : null;
    if (v === 'later' && !nx) return;
    setSkip(key, v);
    drawerOpen[key] = false;
    var did = false;
    var go = function () {
      if (did) return; did = true;
      if (!root || !root.isConnected || !isPlanRoute()) return;
      reflow(root, v === 'na' ? '.tl-na-t' : null, { hop: v === 'later' ? rowSel(key) : null });
      if (v === 'later' && nx && !wide()) { var li2 = root.querySelector('#tl-' + nx.key); if (li2 && !li2.classList.contains('is-open')) openStation(nx.key, {}); }
    };
    fadeRowThen(li, go);
    // the toast lands one frame after the rows start moving (its layout would otherwise sit in the first frame)
    afterPaint(function () {
      SM.toast(v === 'na' ? t('plan.skip.naToast') : t('plan.skip.laterToast', { t: nx.name }), {
        action: { label: t('plan.saved.undo'), fn: function () {
          setSkip(key, null);
          var r = view();
          if (r) reflow(r, '#' + itemId(key), { hop: v === 'later' ? rowSel(key) : null });
          SM.toast(t('plan.skip.backToast'), 1600);
        } }
      });
    });
  });
  SM.on('plan-unskip', function (el) {
    var key = el.getAttribute('data-key');
    var root = view();
    var li = el.closest('.tl-item, .tl-na-item');
    setSkip(key, null);
    var did = false;
    var go = function () {
      if (did) return; did = true;
      if (!root || !root.isConnected || !isPlanRoute()) return;
      reflow(root, '#' + itemId(key), { hop: li && li.classList.contains('is-moved') ? rowSel(key) : null });
      SM.toast(t('plan.skip.backToast'), 1600);
    };
    fadeRowThen(li, go);
  });
  /* ------------------------------------------------------------------ v9 EXTRAS: 自分のやること (add · edit · delete) */
  function ownId() { return 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function setAddOpen(box, on) {
    var key = box.getAttribute('data-group');
    addOpen[key] = on;
    box.classList.toggle('is-open', on);
    var b = box.querySelector(':scope > .tl-add-t');
    if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
    var f = box.querySelector(':scope > .tl-add-f');
    if (f) { f.hidden = !on; if (on && M() && M().mount) M().mount(f, { instant: true }); }
  }
  function toggleAdd(box, on) {
    if (!box) return;
    var was = box.classList.contains('is-open');
    if (on == null) on = !was;
    if (on === was) { if (on) focusQuiet(box.querySelector('.tl-own-in')); return; }
    var f = box.querySelector(':scope > .tl-add-f');
    expandLine(box, on, { setOpen: function (v) { setAddOpen(box, v); }, body: f ? f.firstElementChild : null, peek: function (v) { if (f) f.hidden = !v; } });
    if (on) focusQuiet(box.querySelector('.tl-own-in'));
  }
  SM.on('plan-own-add', function (el) { toggleAdd(el.closest('.tl-add')); });
  SM.on('plan-own-cancel', function (el) {
    var box = el.closest('.tl-add');
    var inp = box && box.querySelector('.tl-own-in');
    if (inp) inp.value = '';
    toggleAdd(box, false);
    if (box) focusQuiet(box.querySelector('.tl-add-t'));
  });
  /* 足す (data-key = the station) or 保存 (data-id = the own task) */
  SM.on('plan-own-save', function (el) {
    var key = el.getAttribute('data-key'), id = el.getAttribute('data-id');
    var wrap = el.closest(key ? '.tl-add' : '.tl-item');
    var inp = wrap && wrap.querySelector('.tl-own-in');
    var text = inp ? inp.value.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
    var m = M();
    if (!text) { if (inp) { focusQuiet(inp); if (m && m.nudge) m.nudge(inp); } SM.toast(t('plan.own.empty'), 1600); return; }
    var root = view();
    var list = ownList();
    var newKey = null;
    if (key) {
      var rec = { id: ownId(), group: key, text: text, done: false };
      list.push(rec);
      newKey = 'own:' + rec.id;
      addOpen[key] = false;
      if (inp) inp.value = '';
    } else if (id) {
      var hit = false;
      list.forEach(function (o) { if (o.id === id) { o.text = text; hit = true; } });
      if (!hit) return;
      drawerOpen['own:' + id] = false;
    } else return;
    setOwnList(list);
    if (!root || !root.isConnected || !isPlanRoute()) return;
    reflow(root, null);
    var li = newKey ? root.querySelector('#' + itemId(newKey)) : root.querySelector('#' + itemId('own:' + id));
    var row = li && li.closest('.tl-item');
    if (row && m && !canAnim()) anim(row, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' });
    if (newKey) {
      // the add row again, so another can follow; the new row is announced by the toast
      var box = root.querySelector('.tl-add[data-group="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"] > .tl-add-t');
      focusQuiet(box);
      try { if (box) box.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { }
    } else if (row) focusQuiet(row.querySelector('.tl-t'));
    SM.toast(t(newKey ? 'plan.own.added' : 'plan.own.saved'), 1600);
  });
  SM.on('plan-own-del', function (el) {
    var id = el.getAttribute('data-id');
    var list = ownList();
    var i = -1;
    list.forEach(function (o, k) { if (o.id === id) i = k; });
    if (i === -1) return;
    var rec = list[i];
    list.splice(i, 1);
    setOwnList(list);
    drawerOpen['own:' + id] = false;
    var root = view();
    var li = el.closest('.tl-item');
    var did = false;
    var go = function () {
      if (did) return; did = true;
      if (!root || !root.isConnected || !isPlanRoute()) return;
      reflow(root, '.tl-add[data-group="' + (window.CSS && CSS.escape ? CSS.escape(rec.group) : rec.group) + '"] > .tl-add-t');
    };
    fadeRowThen(li, go);
    SM.toast(t('plan.own.deleted', { t: rec.text }), {
      action: { label: t('plan.saved.undo'), fn: function () {
        var l2 = ownList();
        if (!l2.some(function (o) { return o.id === rec.id; })) l2.splice(Math.min(i, l2.length), 0, rec);
        setOwnList(l2);
        var r = view();
        if (r) reflow(r, '#' + itemId('own:' + rec.id));
        SM.toast(t('plan.saved.restored'), 1600);
      } }
    });
  });
  /* Enter in an own-task field = its 足す / 保存 button */
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' || ev.isComposing || ev.keyCode === 229) return;
    var inp = ev.target;
    if (!inp || !inp.classList || !inp.classList.contains('tl-own-in')) return;
    var wrap = inp.closest('.tl-add-f-in, .tl-own-f');
    var b = wrap && wrap.querySelector('.tl-own-save');
    if (!b) return;
    ev.preventDefault();
    b.click();
  });

  /* the card's いまの駅 block follows the counts (the countdown row stays as it is) */
  function refreshTop(root, model) {
    var top = root.querySelector('#plan-top');
    var st = top && top.querySelector(':scope > .pt-st');
    if (!st) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = topStationHtml(model);
    var ns = tmp.firstElementChild;
    if (ns.innerHTML === st.innerHTML) return;
    applyRuby(ns);
    st.parentNode.replaceChild(ns, st);
  }

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
      bodyPend = {};
      tmp.innerHTML = bodyHtml2(model);
      bodySrc = bodyPend; bodyPend = {};
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
    // already left: the common dates are the March 31s behind them
    var left = leftMode('leaving', li.date, now);
    var quick = (left ? [y1 - 1, y1 - 2] : [y1, y1 + 1]).map(function (y) {
      var v = y + '-03-31';
      var on = !li.assumed && state().leaveDate === v; if (on) onChip = true;
      return SM.ui.chip(t('plan.date.fy', { y: y }), { act: 'plan-date-quick', pressed: on, attrs: 'data-value="' + v + '"' });
    }).join('');
    // FIX-B (F15): the field holds a date only when that date is the choice (not a chip, not 「まだ決まっていない」)
    var own = !li.assumed && !onChip;
    // what 巣立ちの日 means lives here, next to where it is set (it was a 「くわしく」 on the page)
    html = '<div class="plan-date-sheet stack">' + '<p class="plan-date-def">' + esc(t('plan.leave.def')) + '</p>' +
      '<div class="field"><label for="plan-date-input">' + esc(t(left ? 'plan.date.fieldLeft' : 'plan.date.field')) + '</label>' +
      '<input type="date" class="input" id="plan-date-input" min="2000-01-01" max="2100-12-31" value="' + (own ? esc(iso(li.date)) : '') + '">' +
      '<p class="help">' + esc(t('plan.date.help')) + '</p></div>' +
      '<div class="stack-sm"><p class="plan-date-qlabel">' + esc(t('plan.date.quick')) + '</p><div class="chips plan-date-chips">' + quick + '</div></div>' +
      SM.ui.button(t('plan.date.save'), { act: 'plan-date-save', variant: 'primary', size: 'lg', block: true, arrow: true }) +
      '<div class="opts">' + optRow(t(left ? 'plan.start.leftUnknown' : 'plan.date.unknown'), t(left ? 'plan.date.unknownSubLeft' : 'plan.date.unknownSub'), 'plan-date-unknown', '', li.assumed) + '</div>' +
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
        syncSug(root, lastModel || model);
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

  /* the roadmap's stations get their rows back in place (open states kept). v9 POLISH: only the station BODIES are
     swapped (the heads, folds and labels stay the same elements), so a skip or an own task re-lays out one open
     block instead of the whole road (a full road swap cost ~150ms at 4x on a phone, a frozen frame before any
     motion). The whole <ol> is replaced only when the set of stations differs. */
  function rebuildRoadmap(root, model) {
    var ol = root.querySelector('ol.rm');
    if (!ol) return;
    var m = M();
    var tmp = document.createElement('div');
    // the same stations as on the page? (a skip or an own task never changes the set; a date or track change re-renders)
    var live = Array.prototype.map.call(ol.querySelectorAll('li.rm-st[data-group]'), function (li) { return li.getAttribute('data-group'); });
    var want = model.groups.map(function (g) { return g.key; });
    if (model.cur === -1) want.unshift('now');
    if (model.beyond) want.push('end');
    var same = live.length === want.length;
    for (var i = 0; same && i < live.length; i++) if (live[i] !== want[i]) same = false;
    if (!same) {
      bodyPend = {};
      tmp.innerHTML = roadmapHtml(model);
      bodySrc = bodyPend; bodyPend = {};
      var nol = tmp.firstElementChild;
      applyRuby(nol);
      ol.parentNode.replaceChild(nol, ol);
      if (m && m.mount) m.mount(nol, { instant: true });
      return;
    }
    // only the bodies whose source changed are parsed and swapped
    var swap = function (key, html) {
      var ob = ol.querySelector('li[data-group="' + key + '"] > .rm-body');
      if (!ob) return;
      tmp.innerHTML = html;
      var nb = tmp.firstElementChild;
      if (!nb) return;
      applyRuby(nb);
      ob.parentNode.replaceChild(nb, ob);
      if (!nb.hidden && m && m.mount) m.mount(nb, { instant: true });
    };
    var next = {};
    model.groups.forEach(function (g, gi) {
      var h = bodyHtml0(g, model, gi, isOpenKey(model, g.key, gi));
      next[g.key] = h;
      if (h !== bodySrc[g.key]) swap(g.key, h);
    });
    if (model.beyond && model.endPulled && model.endPulled.length) {
      var openEnd = !wide() || !(selKey && groupOf(model, selKey));
      var he = endBodyHtml0(model, openEnd);
      next.end = he;
      if (he !== bodySrc.end) swap('end', he);
    }
    bodySrc = next;
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
        if (have[rec.id] || !p || list.classList.contains('is-empty') || model.saved.length !== list.children.length + 1) {
          list.classList.remove('is-empty');
          list.innerHTML = rowsHtml; applyRuby(list); if (m && m.mount) m.mount(list, { instant: true });
          if (live) { var nr = list.querySelector('.plan-saved-item[data-flip-key="' + (window.CSS && CSS.escape ? CSS.escape(rec.id) : rec.id) + '"]'); if (nr) anim(nr, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: 120, easing: EASE('enter'), fill: 'backwards' }); }
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
        tmp2.innerHTML = '<ul class="plan-saved-list sv-list">' + rowsHtml + '</ul>';
        var nl = tmp2.firstElementChild;
        applyRuby(nl);
        if (emp && empR) fadeGhost(emp, empR, null, 90);
        if (emp) sec.replaceChild(nl, emp); else sec.appendChild(nl);
        if (m && m.mount) m.mount(nl, { instant: true });
        if (live) anim(nl, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 80, easing: EASE('standard'), fill: 'backwards' });
      }
      savedHeadSync(root, model, nVis);
      syncSug(root, model);
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
      var mark = row.querySelector('.cat-icon');
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
      icsHowHtml(ios ? 'ios' : 'and') +
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
  /* ---------- v9 EXTRAS: how the .ics opens, in three small pictures (iPhone / Android), drawn in the brand's line ---------- */
  var ICS_IL = {
    // a phone, its button pressed (the green bar) — 上のボタンを押す
    phone: '<rect x="22" y="6" width="28" height="60"/><path d="M32 10h8"/><path d="M27 20h18M27 27h12M27 34h18M27 41h8"/><rect class="il-g" x="27" y="50" width="18" height="8"/><circle class="il-dot" cx="36" cy="54" r="2.5"/>',
    // a sheet over the phone with a list and the one row to press — 「すべてを追加」
    sheet: '<rect x="22" y="6" width="28" height="60"/><path d="M32 10h8"/><rect class="il-paper" x="14" y="22" width="44" height="44"/><path d="M20 32h18M20 40h26M20 48h22"/><rect class="il-g" x="20" y="54" width="32" height="7"/>',
    // a calendar with the day marked — カレンダーに入る
    cal: '<rect x="14" y="14" width="44" height="44"/><path d="M14 24h44"/><path d="M24 10v8M48 10v8"/><path d="M14 36h44M14 47h44M29 24v34M43 24v34"/><rect class="il-fill" x="30" y="37" width="12" height="9"/>',
    // the file arrives in the phone's tray — ファイルを保存
    down: '<rect x="22" y="6" width="28" height="60"/><path d="M32 10h8"/><path class="il-g" d="M36 20v22M28 34l8 8 8-8"/><path d="M27 52h18"/>',
    // the .ics file, then the calendar — ファイルをタップして、カレンダーを選ぶ
    file: '<path d="M10 14h16l6 6v30H10z"/><path d="M26 14v6h6"/><path d="M15 30h12M15 36h12M15 42h8"/><path class="il-g" d="M36 36h10M43 32l4 4-4 4"/><rect x="48" y="28" width="16" height="16"/><path d="M48 32h16"/><rect class="il-fill" x="54" y="36" width="4" height="4"/>'
  };
  function icsIl(name) {
    return '<svg class="ics-il" viewBox="0 0 72 72" width="72" height="72" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false">' + (ICS_IL[name] || '') + '</svg>';
  }
  function icsStepsHtml(dev) {
    var ios = dev === 'ios';
    var steps = ios ? [['phone', 'plan.ics.ios1'], ['sheet', 'plan.ics.ios2'], ['cal', 'plan.ics.ios3']] : [['down', 'plan.ics.and1'], ['file', 'plan.ics.and2'], ['cal', 'plan.ics.and3']];
    return steps.map(function (s, i) {
      return '<li class="ics-step"><span class="ics-step-il">' + icsIl(s[0]) + '</span><span class="ics-step-n num" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="sr-only">' + esc(t('plan.ics.step', { n: i + 1 })) + '</span><span class="ics-step-t">' + esc(t(s[1])) + '</span></li>';
    }).join('') + (ios ? '<li class="ics-step-note">' + esc(t('plan.ics.iosNote')) + '</li>' : '');
  }
  function icsHowHtml(dev) {
    var segs = [['ios', 'plan.ics.dev.ios'], ['and', 'plan.ics.dev.and']];
    return '<div class="ics-how"><p class="ics-how-k" id="plan-ics-how-k">' + esc(t('plan.ics.how')) + '</p>' +
      '<div class="seg ics-dev" role="group" aria-label="' + esc(t('plan.ics.devLabel')) + '">' + segs.map(function (s) {
        return '<button type="button" aria-pressed="' + (dev === s[0] ? 'true' : 'false') + '" data-act="plan-ics-dev" data-value="' + s[0] + '"><span>' + esc(t(s[1])) + '</span></button>';
      }).join('') + '</div>' +
      '<ol class="ics-steps" id="plan-ics-steps" data-dev="' + dev + '" aria-labelledby="plan-ics-how-k">' + icsStepsHtml(dev) + '</ol>' +
      '<p class="ics-note">' + esc(t('plan.ics.howPC')) + '</p></div>';
  }
  SM.on('plan-ics-dev', function (el) {
    var v = el.getAttribute('data-value');
    var ol = document.getElementById('plan-ics-steps');
    if (!ol || (v !== 'ios' && v !== 'and') || ol.getAttribute('data-dev') === v) return;
    Array.prototype.forEach.call(el.parentNode.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b === el ? 'true' : 'false'); });
    var m = M();
    var swap = function () {
      ol.setAttribute('data-dev', v);
      ol.innerHTML = icsStepsHtml(v);
      applyRuby(ol);
      if (!m) return;
      if (canAnim()) Array.prototype.forEach.call(ol.querySelectorAll('.ics-step'), function (li, i) {
        anim(li, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: i * 50, easing: EASE('enter'), fill: 'backwards' });
      });
      else anim(ol, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' });
    };
    if (canAnim()) { var a = anim(ol, [{ opacity: 1 }, { opacity: 0 }], { duration: 100, easing: EASE('exit'), fill: 'forwards' }); finished(a).then(function () { if (a) try { a.cancel(); } catch (e) { } swap(); }); }
    else swap();
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
        SM.ui.button(t('plan.sheet.img'), { act: 'plan-sheet-img', variant: 'secondary', icon: 'download', size: 'lg' }) +
        SM.ui.button(t('plan.sheet.print'), { act: 'plan-print', variant: 'secondary', icon: 'print', size: 'lg' }) +
      '</div>' +
      '<div class="cs-img" id="plan-sheet-img" hidden></div></div>';
    SM.sheet(html, { title: t('plan.sheet.title'), cls: 'v-plan plan-sheet plan-sheet-wide', onClose: function () { dropImgUrl(4000); } });
  });

  /* ---------- v9 EXTRAS: the sheet as an image, drawn on this device (canvas), shown inline + offered as a PNG ---------- */
  var imgUrl = null;
  function dropImgUrl(ms) { var u = imgUrl; imgUrl = null; if (u) setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) { } }, ms || 0); }
  function cssVar(name, fb) { try { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; } catch (e) { return fb; } }
  /* wrap one line to `max` px: Japanese breaks between any two characters (not before 、。」）), English at spaces */
  function wrapLine(ctx, text, max) {
    if (!text) return [''];
    var out = [], cur = '';
    var noStart = '、。，．」』）】〕〉》!?！？:;：；…ー';
    var tokens = en() ? text.split(/(\s+)/) : Array.from(text);
    tokens.forEach(function (tk) {
      if (!tk) return;
      var next = cur + tk;
      if (ctx.measureText(next).width <= max || !cur) { cur = next; return; }
      if (!en() && noStart.indexOf(tk) !== -1) { cur = next; return; }
      out.push(cur.replace(/\s+$/, ''));
      cur = /^\s+$/.test(tk) ? '' : tk;
    });
    out.push(cur.replace(/\s+$/, ''));
    return out;
  }
  function drawLockup(ctx, x, y, h, color) {
    var B = SM.brand && SM.brand.data;
    if (!B || typeof Path2D === 'undefined') { ctx.fillStyle = color; ctx.font = '700 ' + Math.round(h * 0.9) + 'px ' + cssVar('--font-display', 'sans-serif'); ctx.fillText(en() ? 'Sudachi Map' : '巣立ちマップ', x, y + h * 0.85); return h * 6; }
    var W = en() ? B.en : B.ja, s = h / 20;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = color;
    ctx.fill(new Path2D(B.box), 'evenodd');
    W.g.forEach(function (d) { ctx.fill(new Path2D(d)); });
    ctx.restore();
    return W.w * s;
  }
  /* the sheet text → a tall PNG. Paper white, ink, the one green: a line at the top, the brand, the title, the date,
     the sections (■ = a heading with a rule, □ = a box to tick), the footnote. Nothing leaves the device. */
  function sheetImage(model) {
    var cv = document.createElement('canvas');
    var ctx = cv.getContext('2d');
    if (!ctx) return null;
    var W = 1080, pad = 72, inner = W - pad * 2;
    var INK = '#1b1b19', INK2 = '#4a4945', INK3 = '#6c6a64', GREEN = '#0b6e44', RULE = '#d9d7d0', PAPER = '#ffffff';
    var fb = cssVar('--font-body', 'sans-serif'), fd = cssVar('--font-display', 'sans-serif');
    var F = { body: '400 30px ' + fb, bold: '700 30px ' + fb, head: '700 34px ' + fd, title: '700 56px ' + fd, meta: '500 26px ' + fd, foot: '400 24px ' + fb };
    var LH = { body: 50, head: 56, meta: 40, foot: 38 };
    var lines = sheetText(model).split('\n');
    var title = t('plan.sheet.title'), made = t('plan.s.made') + '：' + fmtDate(today0());
    var foot = t('plan.s.foot');
    if (lines[0] === t('plan.s.head')) lines.shift();
    if (lines[0] && lines[0].indexOf(t('plan.s.made')) === 0) lines.shift();
    if (lines[lines.length - 1] === foot) lines.pop();
    while (lines.length && !lines[0]) lines.shift();
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    // pass 1: layout
    cv.width = W; cv.height = 200;
    var ops = [], y = 0;
    var put = function (op) { ops.push(op); };
    y += 10;                                        // the green line at the top (drawn in pass 2)
    y += 44;
    put({ k: 'brand', y: y }); y += 40;
    y += 36;
    put({ k: 'text', f: 'title', c: INK, x: pad, y: y + 50, s: title }); y += 72;
    put({ k: 'text', f: 'meta', c: INK3, x: pad, y: y + 26, s: made }); y += 40;
    y += 22; put({ k: 'rule', y: y, w: 3, c: INK }); y += 3;
    y += 28;
    // the label column of 「巣立ちの日：…」 rows: as wide as the widest label (so 住む（予定の）区市町村 never runs into its value)
    var kwMin = 200;
    ctx.font = F.meta;
    lines.forEach(function (ln) { var km = /^([^：:]{1,14})[：:]/.exec(ln); if (km && ln.charAt(0) !== ' ') kwMin = Math.max(kwMin, Math.ceil(ctx.measureText(km[1]).width) + 40); });
    var lastBlank = false;
    lines.forEach(function (ln) {
      if (!ln) { if (!lastBlank) y += 18; lastBlank = true; return; }
      lastBlank = false;
      var m;
      if (ln.indexOf('■ ') === 0) {
        y += 18;
        ctx.font = F.head;
        wrapLine(ctx, ln.slice(2), inner).forEach(function (s) { put({ k: 'text', f: 'head', c: INK, x: pad, y: y + 36, s: s }); y += LH.head; });
        put({ k: 'rule', y: y - 6, w: 2, c: INK }); y += 14;
      } else if (ln.indexOf('□ ') === 0) {
        ctx.font = F.body;
        var ws = wrapLine(ctx, ln.slice(2), inner - 52);
        put({ k: 'box', x: pad, y: y + 11 });
        ws.forEach(function (s) { put({ k: 'text', f: 'body', c: INK, x: pad + 52, y: y + 36, s: s }); y += LH.body; });
      } else if ((m = /^(\s+)(・?)(.*)$/.exec(ln))) {
        var ind = m[2] ? 40 : 32;
        ctx.font = F.body;
        var sub = m[3];
        var kv = /^([^：:]{1,8})[：:](.*)$/.exec(sub);
        if (kv && !m[2]) {
          put({ k: 'text', f: 'meta', c: INK3, x: pad + ind, y: y + 34, s: kv[1] });
          var kw = 120;
          wrapLine(ctx, kv[2].trim(), inner - ind - kw).forEach(function (s) { put({ k: 'text', f: 'body', c: INK, x: pad + ind + kw, y: y + 36, s: s }); y += LH.body; });
        } else {
          if (m[2]) put({ k: 'text', f: 'body', c: INK2, x: pad + ind - 30, y: y + 36, s: '・' });
          wrapLine(ctx, sub, inner - ind).forEach(function (s) { put({ k: 'text', f: 'body', c: INK, x: pad + ind, y: y + 36, s: s }); y += LH.body; });
        }
      } else if ((m = /^(\d+)\. (.*)$/.exec(ln))) {
        y += 8;
        ctx.font = F.bold;
        put({ k: 'text', f: 'bold', c: INK, x: pad, y: y + 36, s: m[1] + '.' });
        wrapLine(ctx, m[2], inner - 44).forEach(function (s) { put({ k: 'text', f: 'bold', c: INK, x: pad + 44, y: y + 36, s: s }); y += LH.body; });
      } else if ((m = /^([^：:]{1,14})[：:](.*)$/.exec(ln))) {
        ctx.font = F.meta;
        var lw = Math.max(kwMin, Math.ceil(ctx.measureText(m[1]).width) + 40);
        ctx.font = F.body;
        put({ k: 'text', f: 'meta', c: INK3, x: pad, y: y + 34, s: m[1] });
        wrapLine(ctx, m[2].trim(), inner - lw).forEach(function (s) { put({ k: 'text', f: 'body', c: INK, x: pad + lw, y: y + 36, s: s }); y += LH.body; });
      } else {
        ctx.font = F.body;
        wrapLine(ctx, ln, inner).forEach(function (s) { put({ k: 'text', f: 'body', c: INK, x: pad, y: y + 36, s: s }); y += LH.body; });
      }
    });
    y += 40; put({ k: 'rule', y: y, w: 1, c: RULE }); y += 24;
    ctx.font = F.foot;
    wrapLine(ctx, foot, inner).forEach(function (s) { put({ k: 'text', f: 'foot', c: INK3, x: pad, y: y + 26, s: s }); y += LH.foot; });
    y += 48;
    var H = Math.min(Math.round(y) + 10, 16000);
    // pass 2: draw
    cv.height = H;
    ctx = cv.getContext('2d');
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = GREEN; ctx.fillRect(0, 0, W, 10); ctx.fillRect(0, H - 10, W, 10);
    ctx.textBaseline = 'alphabetic';
    ops.forEach(function (op) {
      if (op.k === 'brand') { drawLockup(ctx, pad, op.y, 40, INK); return; }
      if (op.k === 'rule') { ctx.fillStyle = op.c; ctx.fillRect(pad, op.y, inner, op.w); return; }
      if (op.k === 'box') { ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(op.x + 1, op.y + 1, 28, 28); return; }
      ctx.font = F[op.f]; ctx.fillStyle = op.c; ctx.fillText(op.s, op.x, op.y);
    });
    return cv;
  }
  SM.on('plan-sheet-img', function (el) {
    var box = document.getElementById('plan-sheet-img');
    if (!box) return;
    var lab = el.querySelector(':scope > span:not(.arrow):not(.sr-only)');
    var m = M();
    var render = function () {
      var cv = null;
      try { cv = sheetImage(build()); } catch (e) { cv = null; }
      if (!cv) { SM.toast(t('plan.sheet.imgFail')); return; }
      var fname = 'sudachi-map-sheet-' + iso(today0()) + '.png';
      var show = function (url) {
        dropImgUrl(2000);
        imgUrl = url;
        box.hidden = false;
        box.innerHTML = '<img class="cs-img-pic" src="' + esc(url) + '" alt="' + esc(t('plan.sheet.imgAlt')) + '" width="' + cv.width + '" height="' + cv.height + '">' +
          '<a class="btn btn-ink btn-lg btn-block cs-img-dl" id="plan-sheet-img-dl" href="' + esc(url) + '" download="' + esc(fname) + '">' + ic('download') + '<span>' + esc(t('plan.sheet.imgDl')) + '</span></a>' +
          '<p class="cs-img-hint">' + esc(t('plan.sheet.imgHint')) + '</p>';
        if (m && m.mount) m.mount(box, { instant: true });
        if (canAnim()) anim(box, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE('enter'), fill: 'backwards' });
        else if (m) anim(box, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'linear' });
        try { box.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { }
        if (lab && m && m.swapText) {
          var orig = el._planL || (el._planL = lab.textContent);
          m.swapText(lab, t('plan.sheet.imgMade'));
          clearTimeout(el._planT);
          el._planT = setTimeout(function () { if (lab.isConnected) m.swapText(lab, orig); }, 2000);
        }
        // the file goes to the phone at once (iOS: Safari's download sheet); the image stays for a long-press save
        var dl = document.getElementById('plan-sheet-img-dl');
        if (dl) setTimeout(function () { try { dl.click(); } catch (e) { } }, 80);
      };
      var fallback = function () { try { show(cv.toDataURL('image/png')); } catch (e) { SM.toast(t('plan.sheet.imgFail')); } };
      try {
        if (cv.toBlob && window.URL && URL.createObjectURL) {
          cv.toBlob(function (blob) { if (!blob) { fallback(); return; } try { show(URL.createObjectURL(blob)); } catch (e) { fallback(); } }, 'image/png');
        } else fallback();
      } catch (e) { fallback(); }
    };
    // the web fonts first, so the picture matches the page (never more than a moment)
    var started = false;
    var go = function () { if (started) return; started = true; render(); };
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); } catch (e) { }
    setTimeout(go, 900);
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
