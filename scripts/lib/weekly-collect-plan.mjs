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
 *   verify: 取った記録の検算（scripts/quality-audit.mjs の cadence:'collect' の点検 id。コマンドはそちらの定義を使う）。
 *     取る月が無くて skip した週も回し、落ちたら段を failed にする。同じ点検を毎日 ops で繰り返さない（DN-0847）
 *   addPaths: data/ の外に書く段が commit する置き場（note-audit の題名・価格のずれの印）
 *   commands: [{ argv, ok, warn, onlyIfPrev }]
 *     ok   = 成功とみなす終了コード（既定 [0]）
 *     warn = 記録は取れたが注意が要る終了コード（例: A8 の部分取得 2・note の反映待ち 1）
 *     onlyIfPrev = 直前のコマンドの終了コードがこの中のときだけ回す（A8 の normalize は取得が 0 か 2 のときだけ）
 *     failPattern = 出力にこれが出たら終了コードに関わらず失敗（指摘ありと検査不成立が同じ exit 1 の検査）
 * ---------------------------------------------------------------------------
 */
import { datasetPath } from './datasets.mjs';
import { jstMonth, todayJst } from './jst-date.mjs';
import { NOTE_PUBLIC_VIEW_LOCAL_DIR } from './note-public-view.mjs';
import { reviewWeekOfDay, reviewWindowOfWeek } from './review-week.mjs';

/** 'YYYY-MM' の前月 */
export function previousMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' を含む四半期の初日（1/4/7/10 月 1 日） */
export function quarterStart(day) {
  const [y, m] = day.split('-').map(Number);
  return `${y}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, '0')}-01`;
}

/**
 * 競合の公開データを取る週か（pure）。note・ココナラのどちらかの最新の取得日が、今の四半期の初日より前（または取得なし）なら取る。
 * 旧 competitor-scan.yml の 1/4/7/10 月 1 日と同じ周期を、四半期の最初の土曜で回す（DN-0852）。
 * @param {{ today: string, lastScans: { note?: string | null, coconala?: string | null } }} input
 */
export function competitorsDue({ today, lastScans }) {
  const start = quarterStart(today);
  return ['note', 'coconala'].some((k) => !lastScans[k] || lastScans[k] < start);
}

/** note の売上の前月を取り直す期間（月初は前月の明細と月次表示が揃うまで検算が合わない・login-collectors の 14 日と同じ） */
export const NOTE_SALES_PREV_MONTH_UNTIL_DAY = 14;

/**
 * 段の表。today は JST の 'YYYY-MM-DD'、kdpMonths は `kdp-report --list-due` の結果、competitorScans は
 * note・ココナラの競合の最新の取得日（どちらも実行時に取る）。
 * @param {{ today?: string, kdpMonths?: string[], competitorScans?: { note?: string | null, coconala?: string | null } }} [input]
 */
export function buildStages({ today = todayJst(), kdpMonths = [], competitorScans = {} } = {}) {
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
      verify: ['a8-report-due'],
    },
    {
      id: 'kdp', phase: 'pre', title: 'KDP のロイヤリティ', timeoutMin: 30, browser: true,
      skip: kdpMonths.length ? null : '取る月が無い（kdp-report --list-due が 0 件）',
      commands: kdpMonths.map((m) => ({ argv: ['npm', 'run', '-s', 'kdp-report', '--', '--month', m] })),
      verify: ['kdp-report-freshness'],
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
      verify: ['sales-freshness'],
    },
    {
      id: 'coconala', phase: 'pre', title: 'ココナラの取引・出品分析・売上履歴', timeoutMin: 30, browser: true, selfCommits: true,
      commands: [{ argv: ['scripts/coconala-local-routine.mjs'] }],
      verify: ['coconala-analytics'],
    },
    {
      id: 'gsc', phase: 'pre', title: 'GSC の登録リクエスト 10 件と月次の理由別 CSV', timeoutMin: 40, browser: true, selfCommits: true,
      // 前回の送信から 20 時間以内なら送らない・月次 CSV は期日のときだけ（判定は gsc-local-routine 自身）
      commands: [{ argv: ['scripts/gsc-local-routine.mjs'] }],
      verify: ['gsc-ui-due', 'gsc-indexing-due'],
    },
    {
      id: 'note-audit', phase: 'pre', title: 'note の公開状態の照合（公開 API・構造・タグ・本文・カード・状態・マガジン・導線・題名と価格）', timeoutMin: 45, browser: false,
      // 旧 note-live-audit.yml（CI・月曜・平均 40 分・19 回中 13 回赤）。ログインは要らないが、直すにはログインが要るので土曜に寄せた。
      // 前段に置くのは、その日のレビューが結果と snapshot（note.status・note.magazines）を読み、題名と価格のずれの印を同じ日の
      // 後段の note-sync が直すため（DN-0847）。指摘（exit 1 など）は warn、取得失敗が支配的な検査不成立は failed。
      // check-note-republish（再公開待ちの surfacer）は artifact にしか出ず読み手が無かったので移さない（note-sync-check が反映待ちを見る）
      addPaths: ['content/note', datasetPath('config.products'), 'src/lib/note-magazines.ts'],
      commands: [
        { argv: ['scripts/check-note-structure.mjs', '--ci'], warn: [1], failPattern: '検査不成立' },
        { argv: ['scripts/check-note-live-tags.mjs'], warn: [1], failPattern: '検査不成立' },
        { argv: ['scripts/check-note-live-headings.mjs'], warn: [1], failPattern: '検査不成立' },
        { argv: ['scripts/audit-note-cards.mjs'], warn: [1], failPattern: '検査不成立' },
        { argv: ['scripts/verify-note-status.mjs', '--ci', '--json', '--snapshot'], warn: [1], failPattern: '検査不成立' },
        // exit 1 = 単品の照合が不成立・2 = ずれ（--contents が無いと収録が取れず check-magazine-membership の軸 C が検査不成立になる）
        { argv: ['scripts/verify-note-magazines.mjs', '--vs-txt', '--contents', '--json'], warn: [2] },
        // snapshot を作り直した直後に三軸（repo・SoT・ライブ）を突き合わせる。exit 2 = 検査不成立
        { argv: ['scripts/check-magazine-membership.mjs', '--ci'], warn: [1] },
        { argv: ['scripts/audit-note-funnel.mjs', '--live', '--ci'], warn: [1], failPattern: '検査不成立' },
        // 題名・価格は原稿が正。note と食い違う記事を「note へ未反映」に戻す（後段の note-sync が上げ直す）。exit 1 = 検査不成立
        { argv: ['scripts/note-reconcile-title-price.mjs', '--commit'] },
      ],
    },
    {
      id: 'note-public-view', phase: 'pre', title: 'note の公開画面の撮影と見え方の照合', timeoutMin: 45, browser: false,
      // 旧 note-public-view.yml（CI・月曜・約 20 分）。未ログインの公開 API とブラウザで見え方を検査し、代表ページを画面幅ごとに撮る。
      // 前段に置くのは、その日のレビューが撮った画像を見るため（fetch-note-public-view-shots が手元の置き場から写す・DN-0852）。
      // 指摘（exit 1）は warn、取得失敗が支配的・撮影の欠け（「検査不成立」）は failed。ログインは要らないので専用の Chromium で開く
      commands: [{
        argv: ['scripts/check-note-public-view.mjs', '--review', '--out', `${NOTE_PUBLIC_VIEW_LOCAL_DIR}/report.json`, '--shot-dir', NOTE_PUBLIC_VIEW_LOCAL_DIR],
        ok: [0], warn: [1], failPattern: '検査不成立',
      }],
    },
    {
      id: 'competitors', phase: 'pre', title: '競合の公開データ（四半期）', timeoutMin: 40, browser: true,
      // 旧 competitor-scan.yml（CI・1/4/7/10 月 1 日・約 10 分）。四半期の最初の土曜だけ取る（competitorsDue）。
      // ココナラの 2 本は手元の永続 profile（coconala）で開く。読み手は competitor-scan-due（週次の点検）と管理画面 /strategy/competitors
      skip: competitorsDue({ today, lastScans: competitorScans }) ? null
        : `今の四半期の取得が済んでいる（note ${competitorScans.note ?? '—'}・ココナラ ${competitorScans.coconala ?? '—'}）`,
      commands: [
        { argv: ['npm', 'run', '-s', 'scout-note-competitors'] },
        // 検索結果を 1 件も読めない取り直しは exit 1（前回の記録を空で上書きしない・#1227）
        { argv: ['scripts/coconala-research.mjs', '--refresh', '--details', '0'] },
        { argv: ['npm', 'run', '-s', 'scout-coconala-competitors'] },
      ],
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
      // 2026-10-24 の初回は 180 分で打ち切られ、実行記録も台帳も残らなかった（1 記事の更新は実測で約 3.6 分・Drive の取り寄せが停滞して 33 件失敗）。
      // 上限 80 記事に加えて、開始から 270 分（段の上限 300 分の 30 分前）で区切る。締め切りまでに終わる分だけ更新して記録・push し、
      // 残りは翌週へ回す（急ぐときは運営者が --only note-sync を別の日に回す）。途中で止めても公開中の記事は変わらない
      commands: [{ argv: ['scripts/note-sync-routine.mjs', '--max', '80', '--deadline-min', '270'] }],
      verify: ['note-sync-freshness'],
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

const PASSING = ['ok', 'warn', 'skipped'];

/** 検算の失敗の理由（pure）。結論の行（✗・FAIL・不合格・検査不成立）を優先し、無ければ最後の行 */
export function verifyFailureReason(id, output) {
  const lines = String(output ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const line = lines.find((l) => /✗|FAIL|不合格|検査不成立/.test(l)) ?? lines.at(-1) ?? '';
  return `検算 ${id}: ${line}`.slice(0, 300);
}

/**
 * 直近の収集の判定（pure・DN-0847）。運営者の取り直し（--only）も数えるため、段ごとに一番新しい結果で決める。
 *   alive  … 直近の pre と post が failDays 以内に回ったか（日次の ops は死活だけを見る）
 *   full   … alive に加えて、全段の最新の結果が合格で、一番新しい回の書き戻しに問題が無いか（週次レビューと Issue の自動クローズ）
 * @param {{ runs: object[], stageIds: string[], failDays: number, now: number, alive?: boolean }} input
 * @returns {{ problems: string[], phases: { phase: string, finishedAt: string, ageDays: number }[], stages: { id: string, status: 'ok' | 'warn' | 'skipped' | 'failed' | 'missing', reason: string, at: string | null, phase: string | null }[] }}
 */
export function judgeRuns({ runs, stageIds, failDays, now, alive = false }) {
  const problems = [];
  const phases = [];
  for (const phase of ['pre', 'post']) {
    const last = runs.filter((r) => r.phase === phase).at(-1);
    if (!last) { problems.push(`${phase}: 記録が無い（収集が一度も回っていない）`); continue; }
    const ageDays = (now - Date.parse(last.finishedAt)) / 86_400_000;
    phases.push({ phase, finishedAt: last.finishedAt, ageDays: Math.round(ageDays * 10) / 10 });
    if (ageDays > failDays) problems.push(`${phase}: 最後の収集が ${Math.floor(ageDays)} 日前（${failDays} 日を超えた・土曜の Mac が動いていない）`);
  }
  if (alive) return { problems, phases, stages: [] };
  const since = now - failDays * 86_400_000;
  const recent = runs.filter((r) => Date.parse(r.finishedAt) >= since);
  const stages = stageIds.map((id) => {
    const hit = recent.map((r) => ({ run: r, stage: r.stages.find((s) => s.id === id) })).filter((x) => x.stage).at(-1);
    return hit ? { id, status: hit.stage.status, reason: hit.stage.reason ?? '', at: hit.run.finishedAt, phase: hit.run.phase } : { id, status: 'missing', reason: `${failDays} 日以内に記録が無い`, at: null, phase: null };
  });
  for (const s of stages) if (!PASSING.includes(s.status)) problems.push(`${s.id}: ${s.status === 'missing' ? s.reason : `${s.at.slice(0, 10)} の ${s.phase} で失敗（${s.reason}）`}`);
  const latest = runs.at(-1);
  if (latest?.commit?.problem) problems.push(`${latest.phase}: ${latest.finishedAt.slice(0, 10)} の書き戻しの問題（${latest.commit.problem}）`);
  if (latest?.leftover?.length) problems.push(`${latest.phase}: ${latest.finishedAt.slice(0, 10)} の回に差分が残った（${latest.leftover.slice(0, 5).join(', ')}）`);
  return { problems, phases, stages };
}
