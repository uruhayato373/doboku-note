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
 *   .claude/config/workflow-health.json の各 workflow について、gh run list から
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
 *
 * exit: 0 健全 / 1 違反あり / 2 検査不成立（gh 不在・設定破損・run 取得ゼロ）
 * 緊急回避: SKIP_WORKFLOW_HEALTH=1
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = join(ROOT, '.claude/config/workflow-health.json');

/**
 * gh run list を JSON で取る。
 *
 * `--jq` は使わない: Git Bash の MSYS パス変換が jq 式の中の "/" を Windows パスへ化かし、
 * 式が壊れて**空を返す**（2026-08-24 実測。監視ループが無言で空を返し続けた）。
 * 生 JSON を取って Node 側で解釈する。
 */
export function fetchRuns(workflow, branch, limit = 30) {
  const args = ['run', 'list', '--workflow', workflow, '--limit', String(limit),
    '--json', 'conclusion,status,createdAt,databaseId,event'];
  if (branch) args.push('--branch', branch);
  const out = execFileSync('gh', args, {
    cwd: ROOT, encoding: 'utf8', timeout: 60_000, maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(out);
}

/**
 * cron が「実際に発火しているか」を event=schedule の run だけで判定する（純関数）。
 *
 * ★なぜ独立の次元が要るか（2026-09-22）
 *   auditRuns の success/連続失敗は **event を区別しない**ので、workflow_dispatch や
 *   push の成功が「最後の success は 0 日前」を作り、**cron が一度も発火していなくても
 *   健全に見える**。これは契約が禁じる「手動成功による異常隠蔽」そのもの。
 *   login-collectors は canary を全部 dispatch で回して緑にしたので、schedule が
 *   死んでいても手動成功が永久にマスクする。ここは schedule で起動した run だけを見る。
 *
 *   「発火したか」と「成功したか」は別物なので、ここでは conclusion を問わない
 *   （成功/失敗は auditRuns が全 run で見る）。発火の有無・鮮度だけを判定する。
 *
 * @param {{ activeSince: string, maxAgeDays: number, graceHours?: number }} cfg
 * @returns {{ ok: boolean, kind: string, lastScheduleAt: string|null, scheduleAgeDays: number|null, detail: string }|null}
 *   cfg 不在なら null（schedule 次元を評価しない）。
 */
export function auditSchedule(name, runs, cfg, now) {
  if (!cfg || !cfg.activeSince || !Number.isFinite(cfg.maxAgeDays)) return null;
  const activeMs = Date.parse(cfg.activeSince);
  if (!Number.isFinite(activeMs)) return null;
  const graceMs = (cfg.graceHours ?? 0) * 3_600_000;
  const deadlineMs = activeMs + graceMs;

  const scheduled = (runs ?? [])
    .filter((r) => r.event === 'schedule')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const lastScheduleAt = scheduled[0]?.createdAt ?? null;
  const scheduleAgeDays = lastScheduleAt
    ? Math.floor((now - Date.parse(lastScheduleAt)) / 86_400_000)
    : null;

  // まだ最初の予定枠＋猶予に達していない＝異常ではない（発火を待っている段階）。
  if (now < deadlineMs) {
    return { ok: true, kind: 'schedule-pending', lastScheduleAt, scheduleAgeDays,
      detail: `schedule 発火はまだ期待していない（active ${cfg.activeSince} + 猶予 ${cfg.graceHours ?? 0}h）` };
  }
  if (lastScheduleAt == null) {
    return { ok: false, kind: 'schedule-never-fired', lastScheduleAt, scheduleAgeDays,
      detail: `cron が一度も発火していない（active ${cfg.activeSince} 以降・手動 run では判定しない）` };
  }
  if (scheduleAgeDays > cfg.maxAgeDays) {
    return { ok: false, kind: 'schedule-stale', lastScheduleAt, scheduleAgeDays,
      detail: `最後の schedule 発火が ${scheduleAgeDays} 日前（上限 ${cfg.maxAgeDays} 日・cron 停止/無効化を疑う）` };
  }
  return { ok: true, kind: 'schedule-ok', lastScheduleAt, scheduleAgeDays, detail: '' };
}

/**
 * run 一覧から健全性を判定する（純関数・テストから使う）。
 *
 * `status !== 'completed'` の run（実行中）は判定から除く——「まだ結果が出ていない」を
 * 失敗として数えると、走っている最中に赤くなる。
 *
 * config に `schedule` があれば、cron 発火の有無・鮮度も独立に検査する（手動成功で
 * マスクされない）。schedule 次元は run の status を問わない（in_progress も発火の証拠）。
 */
export function auditRuns(name, runs, { maxAgeDays, maxConsecutiveFailures, schedule }, now) {
  const scheduleAudit = auditSchedule(name, runs, schedule, now);
  const done = (runs ?? []).filter((r) => r.status === 'completed');
  if (done.length === 0) {
    return { name, ok: false, kind: 'no-runs', total: runs?.length ?? 0,
      schedule: scheduleAudit,
      detail: '完了した run が 1 件も無い（未発火・cron 停止・履歴外）' };
  }
  // gh は新しい順で返す。念のため createdAt で降順に固定する。
  const sorted = [...done].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  let consecutiveFailures = 0;
  for (const r of sorted) {
    if (r.conclusion === 'success') break;
    // skipped / cancelled は「失敗」ではないので連続失敗を切らずに読み飛ばす。
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
  // cron 発火の異常は成功/失敗とは独立に赤にする（手動成功でマスクさせない）。
  if (scheduleAudit && !scheduleAudit.ok) reasons.push(scheduleAudit.detail);

  return {
    name, ok: reasons.length === 0,
    kind: reasons.length ? 'unhealthy' : 'ok',
    ageDays, consecutiveFailures, total: sorted.length,
    lastSuccessAt: lastSuccess?.createdAt ?? null,
    schedule: scheduleAudit,
    detail: reasons.join(' / '),
  };
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
  const targets = (config.workflows ?? []).filter((w) => w.workflow);
  if (targets.length === 0) fail('config の workflows が空');

  const defaults = { maxAgeDays: 10, maxConsecutiveFailures: 3, ...(config.defaults ?? {}) };
  const now = Date.now();
  const rows = [];
  const errors = [];

  for (const t of targets) {
    try {
      const runs = fetchRuns(t.workflow, t.branch, t.limit ?? 30);
      rows.push(auditRuns(t.workflow, runs, { ...defaults, ...t }, now));
    } catch (e) {
      errors.push({ workflow: t.workflow, error: String(e.message ?? e).slice(0, 160) });
    }
  }

  // 検査ゼロを PASS と呼ばない: 取得に失敗した分が支配的なら「健全」と言ってはいけない。
  if (rows.length === 0) fail(`${targets.length} 本すべてで run を取得できない（gh 認証・ネットワークを疑う）`);
  if (errors.length > targets.length * 0.3) {
    fail(`${targets.length} 本中 ${errors.length} 本で run を取得できない（取得失敗が支配的）`);
  }

  const bad = rows.filter((r) => !r.ok);
  say(`[check-workflow-health] workflow ${targets.length} 本中 ${rows.length} 本を実検査`
    + `${errors.length ? `（取得失敗 ${errors.length} 本）` : ''} / 不健全 ${bad.length} 本`);
  for (const r of rows) {
    const sched = r.schedule
      ? ` / cron発火 ${r.schedule.lastScheduleAt == null ? '無し' : `${r.schedule.scheduleAgeDays}日前`}`
      : '';
    say(`  ${r.ok ? '✓' : '✗'} ${r.name.padEnd(28)} 最終success ${r.ageDays == null ? '無し' : `${r.ageDays}日前`}`
      + ` / 連続失敗 ${r.consecutiveFailures}${sched}${r.detail ? `  — ${r.detail}` : ''}`);
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
    + '\n閾値そのものを変えるときは .claude/config/workflow-health.json に理由を書く。',
  );
  process.exit(1);
}

if (process.argv[1] && basename(process.argv[1].split(sep).join('/')) === 'check-workflow-health.mjs') main();
