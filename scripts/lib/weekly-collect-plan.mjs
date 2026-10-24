/**
 * weekly-collect-plan.mjs — 土曜の Mac の収集（scripts/weekly-collect.mjs）が回す段の表と、対象の月・期間の決め方（DN-0817・DN-0819）。
 * ---------------------------------------------------------------------------
 * ログインが要る取得と書き込みは、土曜の週次レビュー（scripts/scheduled/weekly-review.sh）の前後でこの表の順に 1 本ずつ回す。
 * Claude Code の中（CLAUDECODE=1）では資格情報が読めないので、収集は必ず `claude -p` の外の bash から呼ぶ。
 * 前（pre）はレビューが読む記録、後（post）は時間がかかる照合と note への書き込み。
 * X・Instagram の段は SNS 保留中なので置かない（再開時に足す）。
 *
 * 段の項目:
 *   id・title・phase（pre|post）・timeoutMin・browser（起動前にブラウザの空きを待つ）・selfCommits（自分で commit・push する）
 *   commands: [{ argv, ok, warn, onlyIfPrev }]
 *     ok   = 成功とみなす終了コード（既定 [0]）
 *     warn = 記録は取れたが注意が要る終了コード（例: A8 の部分取得 2・note の反映待ち 1）
 *     onlyIfPrev = 直前のコマンドの終了コードがこの中のときだけ回す（A8 の normalize は取得が 0 か 2 のときだけ）
 *     failPattern = 出力にこれが出たら終了コードに関わらず失敗（指摘ありと検査不成立が同じ exit 1 の検査）
 * ---------------------------------------------------------------------------
 */
import { jstMonth, todayJst } from './jst-date.mjs';
import { reviewWeekOfDay, reviewWindowOfWeek } from './review-week.mjs';

/** 'YYYY-MM' の前月 */
export function previousMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** note の売上の前月を取り直す期間（月初は前月の明細と月次表示が揃うまで検算が合わない・login-collectors の 14 日と同じ） */
export const NOTE_SALES_PREV_MONTH_UNTIL_DAY = 14;

/**
 * 段の表。today は JST の 'YYYY-MM-DD'、kdpMonths は `kdp-report --list-due` の結果（実行時に取る）。
 * @param {{ today?: string, kdpMonths?: string[] }} [input]
 */
export function buildStages({ today = todayJst(), kdpMonths = [] } = {}) {
  const cur = jstMonth(new Date(`${today}T12:00:00+09:00`).getTime());
  const prev = previousMonth(cur);
  const day = Number(today.slice(8, 10));
  const window = reviewWindowOfWeek(reviewWeekOfDay(today));
  const a8Reports = 'site-summary,program-detail,period-monthly,result-detail';

  return [
    {
      id: 'auth', phase: 'pre', title: 'ログインの確認と入り直し', timeoutMin: 20, browser: true,
      // export と CI の起動はしない（CI はログインを使わない・DN-0822）。もしも・afb は doboku-note に広告が無いので回さない（DN-0643）
      commands: [{ argv: ['scripts/auth-session-refresh.mjs', '--service', 'a8,kdp,note,coconala', '--json'] }],
    },
    {
      id: 'a8', phase: 'pre', title: 'A8 の成果（前月と当月）', timeoutMin: 30, browser: true,
      // 成果の確定は発生月へ遡るので前月も毎週取り直す。当月を後に回して report-log の period を当月にする
      commands: [prev, cur].flatMap((m) => [
        { argv: ['npm', 'run', '-s', 'a8-ui:fetch', '--', '--month', m, '--reports', a8Reports, '--site-filter', 'self'], warn: [2] },
        { argv: ['npm', 'run', '-s', 'a8-ui:normalize'], onlyIfPrev: [0, 2] },
      ]),
    },
    {
      id: 'kdp', phase: 'pre', title: 'KDP のロイヤリティ', timeoutMin: 30, browser: true,
      skip: kdpMonths.length ? null : '取る月が無い（kdp-report --list-due が 0 件）',
      commands: kdpMonths.map((m) => ({ argv: ['npm', 'run', '-s', 'kdp-report', '--', '--month', m] })),
    },
    {
      id: 'note-traffic', phase: 'pre', title: `note のアクセス（月と ${window.startDate}〜${window.endDate}）`, timeoutMin: 30, browser: true,
      commands: [
        { argv: ['npm', 'run', '-s', 'note-traffic-fetch', '--', '--commit'] },
        { argv: ['npm', 'run', '-s', 'note-traffic-fetch', '--', '--from', window.startDate, '--to', window.endDate, '--commit'] },
      ],
    },
    {
      id: 'note-sales', phase: 'pre', title: 'note の売上', timeoutMin: 20, browser: true,
      commands: [
        // exit 8 = 前月がまだ集計中（note は毎月 2 日に確定）。失敗ではない
        ...(day <= NOTE_SALES_PREV_MONTH_UNTIL_DAY ? [{ argv: ['npm', 'run', '-s', 'note-sales-fetch', '--', '--month', prev, '--commit'], ok: [0, 8] }] : []),
        { argv: ['npm', 'run', '-s', 'note-sales-fetch', '--', '--month', cur, '--commit'] },
      ],
    },
    {
      id: 'coconala', phase: 'pre', title: 'ココナラの取引・出品分析・売上履歴', timeoutMin: 30, browser: true, selfCommits: true,
      commands: [{ argv: ['scripts/coconala-local-routine.mjs'] }],
    },
    {
      id: 'gsc', phase: 'pre', title: 'GSC の登録リクエスト 10 件と月次の理由別 CSV', timeoutMin: 40, browser: true, selfCommits: true,
      // 前回の送信から 20 時間以内なら送らない・月次 CSV は期日のときだけ（判定は gsc-local-routine 自身）
      commands: [{ argv: ['scripts/gsc-local-routine.mjs'] }],
    },
    {
      id: 'note-live', phase: 'post', title: 'note の添付と会員限定のライブ照合', timeoutMin: 90, browser: true,
      commands: [
        { argv: ['npm', 'run', '-s', 'check-note-attachments:live', '--', '--api-first'], warn: [1], failPattern: '検査不成立' },
        { argv: ['npm', 'run', '-s', 'check-note-membership:live'], warn: [1], failPattern: '検査不成立' },
      ],
    },
    {
      id: 'note-sync', phase: 'post', title: 'note の記事の同期（本文・カバー・タグ）', timeoutMin: 300, browser: true, selfCommits: true,
      // Drive の取り寄せと note を同じ実行で開くので、この段だけブラウザの並行を許す（旧 note-sync.sh と同じ）
      env: { DOBOKU_PW_ALLOW_PARALLEL: '1' },
      // 1 記事に約 1.4 分かかる。2026-10-24 の初回は取り寄せ 268 件に 1.5 時間かかり、200 記事では時間内に収まらなかった。
      // 1 回 80 記事に絞り、残りは翌週へ（急ぐときは運営者が --only note-sync を別の日に回す）。途中で止めても公開中の記事は変わらない
      commands: [{ argv: ['scripts/note-sync-routine.mjs', '--max', '80'] }],
    },
    {
      id: 'note-sync-check', phase: 'post', title: 'note の反映の照合（公開 API）', timeoutMin: 15, browser: false,
      // exit 1 = 反映待ち・止まっている記事がある（同期の上限待ちを含む）。記録は管理画面 /content/note-sync
      commands: [{ argv: ['scripts/check-note-sync.mjs'], warn: [1] }],
    },
  ];
}

/** 1 段の結果を、各コマンドの終了コードと出力から決める（pure）。skipped は呼び出し側で決める */
export function stageStatus(stage, exits, outputs = []) {
  let status = 'ok';
  for (let i = 0; i < stage.commands.length; i += 1) {
    const cmd = stage.commands[i];
    const code = exits[i];
    if (code === undefined || code === null) continue; // onlyIfPrev で回さなかった
    if (cmd.failPattern && String(outputs[i] ?? '').includes(cmd.failPattern)) return 'failed';
    if ((cmd.ok ?? [0]).includes(code)) continue;
    if ((cmd.warn ?? []).includes(code)) { if (status === 'ok') status = 'warn'; continue; }
    return 'failed';
  }
  return status;
}

/**
 * 段の失敗の理由（pure）。コマンドが 2 本以上ある段は、どのコマンドが落ちたかを頭に付ける。
 * 2026-10-24 の note-traffic は 1 本目（9 月の月次）が検査不成立、2 本目（W42 の期間）は検査に通って書いたのに、
 * 理由が 1 本目の行だけだったため「検査に落ちた取得が W42 を上書きした」と読まれた（DN-0833）。
 */
export function commandFailureReason({ argv, index, total, line, timedOut = false, timeoutMin }) {
  const body = timedOut ? `${timeoutMin} 分で打ち切り` : String(line ?? '');
  if (total < 2) return body.slice(0, 300);
  const run = argv[0] === 'npm' && argv[1] === 'run' ? argv.slice(argv[2] === '-s' ? 3 : 2) : argv;
  return `${index + 1}/${total} 本目（${run.join(' ')}）: ${body}`.slice(0, 300);
}

/** 合格の判定: 全段が ok・warn・skipped で、書き戻しに問題が無い（pure） */
export function runPassed(run) {
  return run.stages.every((s) => ['ok', 'warn', 'skipped'].includes(s.status)) && !run.commit?.problem && !run.leftover?.length;
}
