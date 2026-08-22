#!/usr/bin/env node
/**
 * check-external-write-orphans.mjs — 「外部へは成功・台帳の書き戻しは失敗」を検出する
 * ---------------------------------------------------------------------------
 * 背景（2026-08-18 に実害が判明）: YouTube 予約投稿の日次ジョブが 2 か月止まっていた。
 *   2026-06-17 の run は **6 本のアップロードに成功したあと**、commit ステップが
 *   `git add` 済みの index のまま `git pull --rebase` して落ちた。結果:
 *     - YouTube 側には 6 本が存在する（不可逆）
 *     - 台帳は「pending」のまま（記録だけが失われた）
 *     - workflow は手動停止され、戦略 SSOT は 2 か月「稼働中」と書き続けた
 *
 *   誰も気づかなかったのは、失敗が**外部の成果物ではなく内部の記録側にだけ**出たから。
 *   台帳を信じて再開すれば同じ 6 本を再アップロード＝重複投稿になるところだった。
 *
 * 何を見るか（2 つの署名）:
 *
 *   A. orphan（外部成功 × run 失敗）
 *      不可逆な外部操作を行うジョブの **失敗した run** のログに、外部操作の成功マーカーがある。
 *      これは「外部には出たが記録は残っていない」状態そのもの。台帳の照合が要る。
 *
 *   B. silent-stop（止まったまま気づかれない）
 *      workflow が disabled / 一定期間走っていないのに、台帳には未処理が残っている。
 *      YouTube はこれで 2 か月放置された。
 *
 * なぜ「ライブを数え直す」検査にしないか: それは各プラットフォームの API と資格情報が要り、
 *   会社 PC はプロキシで外部 API を遮断している（measurement-incidents.md）。
 *   一方この 2 署名は `gh` だけで取れて、実際に起きた事故をそのまま捕まえられる。
 *   （既存の verify-yt-status は台帳→ライブの**片方向**で「ライブにあるが台帳に無い」を拾えない）
 *
 * Usage:
 *   node scripts/check-external-write-orphans.mjs
 *   node scripts/check-external-write-orphans.mjs --days 60
 *   node scripts/check-external-write-orphans.mjs --json
 *
 * exit: 0 健全 / 1 orphan または silent-stop あり / 2 検査不成立（gh 不通）
 * ---------------------------------------------------------------------------
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, writeSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');
const daysArg = process.argv.indexOf('--days');
const DAYS = daysArg >= 0 ? Number(process.argv[daysArg + 1]) : 30;

/**
 * 不可逆な外部書き込みを行うジョブ。**取得系は対象外**（失敗しても再実行で済み、外部に副作用が残らない）。
 * ここに足すのは「外部に出したら取り消せない」ものだけ。
 */
const JOBS = [
  {
    id: 'youtube-scheduled-post',
    workflow: 'post-youtube-scheduled.yml',
    // 外部操作の成功マーカー。これが失敗 run のログにあれば orphan（外部に出たが記録は無い）
    externalOk: /✓\s+\S+\s+→\s+https:\/\/youtube\.com\/watch\?v=/,
    // 台帳と、未処理を数える関数
    ledger: '.claude/state/youtube-schedule.json',
    pending: (j) => {
      const items = Array.isArray(j) ? j : j.items ?? j.videos ?? [];
      return items.filter((i) => i.status === 'pending').length;
    },
    // 手動投入へ切り替えたので「走っていない＝異常」ではない（2026-08-18 ユーザー決定）。
    // silent-stop は「未処理があるのに誰も回していない」ことの通知に留める。
    manualDispatch: true,
  },
];

const gh = (args) => {
  try {
    return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    return e.stdout ?? null;
  }
};

function main() {
  if (!gh(['--version'])) {
    console.error('✗ 検査不成立: gh が使えない（認証・PATH を確認）');
    process.exit(2);
  }

  const since = new Date(Date.now() - DAYS * 86400_000).toISOString().slice(0, 10);
  const findings = [];
  let runsScanned = 0;

  for (const job of JOBS) {
    // ── A. orphan: 失敗 run のログに外部成功マーカーがあるか ──
    const listRaw = gh([
      'run', 'list', '--workflow', job.workflow, '--limit', '60',
      '--json', 'databaseId,conclusion,createdAt,url',
    ]);
    if (listRaw == null) {
      console.error(`✗ 検査不成立: ${job.workflow} の run 一覧を取得できない`);
      process.exit(2);
    }
    let runs = [];
    try {
      runs = JSON.parse(listRaw);
    } catch {
      console.error(`✗ 検査不成立: ${job.workflow} の run 一覧が JSON として読めない`);
      process.exit(2);
    }
    const failed = runs.filter(
      (r) => r.conclusion === 'failure' && String(r.createdAt).slice(0, 10) >= since,
    );
    runsScanned += failed.length;

    for (const r of failed) {
      const log = gh(['run', 'view', String(r.databaseId), '--log']);
      if (!log) continue;
      if (job.externalOk.test(log)) {
        const hits = [...log.matchAll(new RegExp(job.externalOk.source, 'g'))].length;
        findings.push({
          kind: 'orphan',
          job: job.id,
          runId: r.databaseId,
          at: String(r.createdAt).slice(0, 16),
          url: r.url,
          detail: `run は失敗したのに外部操作の成功マーカーが ${hits} 件ある＝外部に出たが記録が残っていない可能性`,
        });
      }
    }

    // ── B. silent-stop: 未処理が残っているのに動いていない ──
    const ledgerPath = join(ROOT, job.ledger);
    if (existsSync(ledgerPath)) {
      let pending = null;
      try {
        pending = job.pending(JSON.parse(readFileSync(ledgerPath, 'utf8')));
      } catch {
        /* 台帳が読めないなら pending は判定しない */
      }
      const lastRun = runs[0]?.createdAt ? String(runs[0].createdAt).slice(0, 10) : null;
      const staleDays = lastRun
        ? Math.floor((Date.now() - Date.parse(lastRun)) / 86400_000)
        : null;
      if (pending > 0 && staleDays !== null && staleDays > DAYS) {
        findings.push({
          kind: 'silent-stop',
          job: job.id,
          at: lastRun,
          detail:
            `台帳に未処理 ${pending} 件が残っているのに最後の run が ${staleDays} 日前` +
            (job.manualDispatch ? '（手動投入ジョブなので異常ではないが、消化が止まっている）' : ''),
        });
      }
    }
  }

  const summary =
    `[check-external-write-orphans] ジョブ ${JOBS.length} 件 / 直近 ${DAYS} 日の失敗 run ${runsScanned} 本を実検査` +
    ` / 検出 ${findings.length} 件`;

  if (JSON_OUT) {
    writeSync(1, JSON.stringify({ days: DAYS, jobs: JOBS.length, runsScanned, findings }, null, 2) + '\n');
    process.exit(findings.length ? 1 : 0);
  }

  console.log(summary);
  if (!findings.length) {
    console.log('[check-external-write-orphans] ✓ 外部成功 × 記録失敗 の痕跡なし');
    process.exit(0);
  }
  for (const f of findings) {
    console.error(`  [${f.kind}] ${f.job} ${f.at ?? ''}  ${f.detail}`);
    if (f.url) console.error(`      ${f.url}`);
  }
  console.error(
    '\norphan が出たら **台帳を信じて再開しない**。run ログから外部側の実体（videoId 等）を回収して\n' +
      '台帳へ反映してから再開する（そうしないと同じものを二重に外部へ出す）。\n' +
      '2026-06-17 の YouTube run が実例: 6 本アップ済みなのに台帳は pending のままだった。\n',
  );
  process.exit(1);
}

main();
