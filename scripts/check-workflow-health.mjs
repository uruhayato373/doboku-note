#!/usr/bin/env node
/**
 * check-workflow-health.mjs — 重要 workflow が「赤いまま」「動いていないまま」を検知する watchdog。
 *
 * 止めたい事故（2026-08-24 に実査で確定）:
 *   develop の Pre-merge check は 2026-08-19 12:04Z を最後に **24 連続で赤**だったのに、
 *   2 日間誰も気づかなかった。原因は単純で、**「CI が赤い」ことを読む機械がリポジトリ内に
 *   1 つも無かった**——ci.yml には if: failure() が 0 件、branch protection も無し、
 *   週次レビューの入力 ~20 種にも admin-app にも run の成否は含まれていなかった。
 *   赤は GitHub の Status バッジにしか現れず、発見は毎回「たまたま誰かが見た」だった。
 *
 *   ci.yml 自身の失敗通知（if: failure() → automation-failure Issue）は即時の一撃だが、
 *   それだけでは **workflow が起動すらしなくなった沈黙**を拾えない（cron が壊れた・
 *   schedule が無効化された・token 切れで発火しない）。「最後に成功したのはいつか」を
 *   定期的に見る watchdog が要る。
 *
 * 検査:
 *   config/workflow-health.json の各 workflow について、gh run list から
 *     - 最後に success した run からの経過日数 > maxAgeDays
 *     - 直近の連続失敗数 >= maxConsecutiveFailures
 *   のどちらかに該当すれば違反。
 *
 * 検査ゼロを PASS と呼ばない（CLAUDE.md §9）:
 *   実検査した workflow 数を必ず出力する。gh が使えない・run が 1 件も取れないときは
 *   「健全」ではなく exit 2（検査不成立）。ここを 0 件で緑にすると、watchdog 自身が
 *   沈黙したことに誰も気づけなくなる（この検査が守ろうとしている失敗様式そのもの）。
 *
 * Usage:
 *   node scripts/check-workflow-health.mjs
 *   node scripts/check-workflow-health.mjs --json
 *   node scripts/check-workflow-health.mjs --only weekly-review-guard.yml
 *     （config の 1 本だけを見る。月曜の weekly-review-guard 自身が止まった沈黙を、日次の ops-audit から拾う）
 *   node scripts/check-workflow-health.mjs --exclude weekly-review-guard.yml
 *     （config の 1 本を除く。guard 自身は ops-audit の --only が別 channel で見るので、週次の全体検査からは外し、
 *      同じ原因で workflow-health と workflow-health-guard の 2 Issue が立つのを防ぐ・DN-0935）
 *
 * exit: 0 健全 / 1 違反あり / 2 検査不成立（gh 不在・設定破損・run 取得ゼロ）
 * 緊急回避: SKIP_WORKFLOW_HEALTH=1
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, join, sep } from 'node:path';
import { datasetPath } from './lib/datasets.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const CONFIG_PATH = join(ROOT, datasetPath('config.workflow-health'));

/**
 * gh run list を JSON で取る。
 *
 * `--jq` は使わない: Git Bash の MSYS パス変換が jq 式の中の "/" を Windows パスへ化かし、
 * 式が壊れて**空を返す**（2026-08-24 実測。監視ループが無言で空を返し続けた）。
 * 生 JSON を取って Node 側で解釈する。
 */
export function runListArgs(workflow, branch, limit = 30) {
  const args = ['run', 'list', '--workflow', workflow, '--limit', String(limit),
    '--json', 'conclusion,status,createdAt,databaseId,event'];
  if (branch) args.push('--branch', branch);
  return args;
}

export function fetchRuns(workflow, branch, limit = 30) {
  const out = execFileSync('gh', runListArgs(workflow, branch, limit), {
    cwd: ROOT, encoding: 'utf8', timeout: 60_000, maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(out);
}

/**
 * run 一覧から健全性を判定する（純関数・テストから使う）。
 *
 * `status !== 'completed'` の run（実行中）は判定から除く——「まだ結果が出ていない」を
 * 失敗として数えると、走っている最中に赤くなる。
 *
 * event は区別しない。手動成功が cron の沈黙を隠さないよう event=schedule の run だけで見る次元（PR #569）は、
 * 設定する行が無くなり 2026-10-25 に外した。
 *
 * @param {string} name
 * @param {{ conclusion: string | null, status: string, createdAt: string, event?: string }[]} runs
 * @param {{ maxAgeDays: number, maxConsecutiveFailures: number }} cfg
 * @param {number} now
 */
export function auditRuns(name, runs, { maxAgeDays, maxConsecutiveFailures }, now) {
  const done = (runs ?? []).filter((r) => r.status === 'completed');
  if (done.length === 0) {
    return { name, ok: false, kind: 'no-runs', total: runs?.length ?? 0,
      detail: '完了した run が 1 件も無い（未発火・cron 停止・履歴外）' };
  }
  // gh は新しい順で返す。念のため createdAt で降順に固定する。
  const sorted = [...done].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  let consecutiveFailures = 0;
  for (const r of sorted) {
    if (r.conclusion === 'success') break;
    // skipped / cancelled は「失敗」ではないので連続失敗を切らずに読み飛ばす。共通 group で待機中に取り消された
    // 定期実行は maxAgeDays で拾う（再実行の workflow は 0 件の実績で 2026-10-25 に外した・DN-0849）。
    if (r.conclusion === 'failure' || r.conclusion === 'timed_out') consecutiveFailures += 1;
    else break;
  }

  const lastSuccess = sorted.find((r) => r.conclusion === 'success') ?? null;
  const ageDays = lastSuccess
    ? Math.floor((now - Date.parse(lastSuccess.createdAt)) / 86_400_000)
    : null;

  const reasons = [];
  if (ageDays == null) reasons.push(`直近 ${sorted.length} run に success が 1 件も無い`);
  else if (ageDays > maxAgeDays) reasons.push(`最後の success が ${ageDays} 日前（上限 ${maxAgeDays} 日）`);
  if (consecutiveFailures >= maxConsecutiveFailures) {
    reasons.push(`${consecutiveFailures} 連続で失敗（上限 ${maxConsecutiveFailures - 1}）`);
  }

  return {
    name, ok: reasons.length === 0,
    kind: reasons.length ? 'unhealthy' : 'ok',
    ageDays, consecutiveFailures, total: sorted.length,
    lastSuccessAt: lastSuccess?.createdAt ?? null,
    detail: reasons.join(' / '),
  };
}

/**
 * 監視の設定（config/workflow-health.json）を workflow 名で引く表にする。閾値は defaults に各行を重ねる。
 * 管理画面 /ops/ci も同じ表で「監視中か・閾値」を決める（判定を写さない）。
 */
export function healthTargets(config) {
  const defaults = { maxAgeDays: 10, maxConsecutiveFailures: 3, ...(config?.defaults ?? {}) };
  return new Map((config?.workflows ?? []).filter((w) => w.workflow).map((w) => [w.workflow, { ...defaults, ...w }]));
}

/** 一番新しい run（status を問わない・実行中も含む）。無ければ null（純関数） */
export function latestRun(runs) {
  return [...(runs ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
}

function fail(msg) { console.error(`✗ 検査不成立: ${msg}`); process.exit(2); }

function main() {
  if (process.env.SKIP_WORKFLOW_HEALTH === '1') {
    console.log('[check-workflow-health] SKIP_WORKFLOW_HEALTH=1 のためスキップ');
    process.exit(0);
  }
  const jsonOut = process.argv.includes('--json');
  const say = jsonOut ? console.error : console.log;

  let config;
  try { config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')); } catch (e) { fail(`config を読めない: ${e.message}`); }
  const onlyIdx = process.argv.indexOf('--only');
  const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;
  const exIdx = process.argv.indexOf('--exclude');
  const exclude = exIdx >= 0 ? process.argv[exIdx + 1] : null;
  const byName = healthTargets(config);
  const targets = [...byName.values()].filter((w) => (!only || w.workflow === only) && w.workflow !== exclude);
  if (targets.length === 0) fail(only ? `config に ${only} が無い` : 'config の workflows が空');

  const now = Date.now();
  const rows = [];
  const errors = [];

  for (const t of targets) {
    try {
      const runs = fetchRuns(t.workflow, t.branch, t.limit ?? 30);
      rows.push(auditRuns(t.workflow, runs, t, now));
    } catch (e) {
      errors.push({ workflow: t.workflow, error: String(e.message ?? e).slice(0, 160) });
    }
  }

  // 検査ゼロを PASS と呼ばない: 取得に失敗した分が支配的なら「健全」と言ってはいけない。
  if (rows.length === 0) fail(`${targets.length} 本すべてで run を取得できない（gh 認証・ネットワークを疑う）`);
  // 0.3 は lib/inconclusive-gate.mjs の MAX_FETCH_FAIL_RATE（0.2）に寄せない: 母集団が note の記事 URL ではなく gh で run を取る workflow（config/workflow-health.json）で、
  // 導入時から 0.3 のまま。0.2 に揃えると取得失敗に厳しくなり判定が変わる。値の根拠の記録は見つからなかったので変えていない。
  if (errors.length > targets.length * 0.3) {
    fail(`${targets.length} 本中 ${errors.length} 本で run を取得できない（取得失敗が支配的）`);
  }

  const bad = rows.filter((r) => !r.ok);
  say(`[check-workflow-health] workflow ${targets.length} 本中 ${rows.length} 本を実検査`
    + `${errors.length ? `（取得失敗 ${errors.length} 本）` : ''} / 不健全 ${bad.length} 本`);
  for (const r of rows) {
    say(`  ${r.ok ? '✓' : '✗'} ${r.name.padEnd(28)} 最終success ${r.ageDays == null ? '無し' : `${r.ageDays}日前`}`
      + ` / 連続失敗 ${r.consecutiveFailures}${r.detail ? `  — ${r.detail}` : ''}`);
  }
  for (const e of errors) say(`  ? ${e.workflow.padEnd(28)} 取得失敗: ${e.error}`);

  if (jsonOut) {
    process.stdout.write(`${JSON.stringify({ checked: rows.length, targets: targets.length, rows, errors, violations: bad }, null, 2)}\n`);
  }

  if (bad.length === 0) {
    say('[check-workflow-health] ✓ 重要 workflow はすべて健全');
    process.exit(0);
  }
  console.error(`\n[check-workflow-health] ✗ ${bad.length} 本が不健全`);
  for (const r of bad) console.error(`  ${r.name}  ${r.detail}`);
  console.error(
    '\n赤が続いている／動いていない workflow がある。run のログを見て原因を潰す。'
    + `\n閾値そのものを変えるときは ${datasetPath('config.workflow-health')} に理由を書く。`,
  );
  process.exit(1);
}

if (process.argv[1] && basename(process.argv[1].split(sep).join('/')) === 'check-workflow-health.mjs') main();
