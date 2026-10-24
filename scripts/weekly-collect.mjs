#!/usr/bin/env node
/**
 * weekly-collect.mjs — 土曜の Mac の収集。ログインが要る取得と書き込みを 1 本ずつ順に回し、記録を develop へ push する（DN-0817・DN-0819）。
 * ---------------------------------------------------------------------------
 * scripts/scheduled/weekly-review.sh が専用の使い捨て worktree（.claude/worktrees/weekly-collect・detached・origin/develop）で、
 * Claude の前に `--phase pre`、後に `--phase post` を呼ぶ。段の表は scripts/lib/weekly-collect-plan.mjs。
 * Claude Code の中（CLAUDECODE=1）では資格情報が読めないので、エージェントのセッションからは取りに行かない
 * （他のセッションは記録と、その最終取得日を読む）。運営者が手元で取り直すときは端末から `--only <段>` で呼ぶ。
 *
 * 1 段ずつ:
 *   - browser の段は、ブラウザの空き（scripts/lib/playwright-launch.mjs の guardBrowserLaunch）を最大 5 分待ってから回す
 *   - 各コマンドに timeout。超えたらプロセスグループごと止める（Chrome を残して次の段を「既に稼働中」で落とさない）
 *   - 失敗しても次の段へ進む。結果は state.weekly-collect（.claude/state/weekly-collect/runs.json）へ残す
 *   - selfCommits でない段の記録は、次の selfCommits の段の前と phase の終わりに ci-data add（型の検査）→ commit → push する
 *   - 終わりに作業ツリーが clean か確かめる。残った差分・push の失敗は赤（次回は残りを退避してから origin/develop に戻す）
 *
 * CLI（収集用 worktree のルートで実行する。ブランチに乗った HEAD では --plan 以外を拒否する）:
 *   node scripts/weekly-collect.mjs --plan [--json]          # 段の計画だけ（ブラウザを開かない）
 *   node scripts/weekly-collect.mjs --phase pre|post         # 本番（取得・commit・push）
 *   node scripts/weekly-collect.mjs --only a8,kdp            # 指定の段だけ（phase は問わない）
 *   node scripts/weekly-collect.mjs --verify-last [--json]   # 直近の pre と post が合格か・期限内か（ops の点検）
 *   --no-push  commit まで
 * exit: 0 = 合格（全段が ok・warn・skipped、書き戻しに問題なし）/ 1 = どこかの段が失敗・書き戻しの問題・期限切れ / 2 = 使い方の誤り
 * ---------------------------------------------------------------------------
 */
import { spawn, spawnSync } from 'node:child_process';
import { hostname } from 'node:os';

import { parseCliArgs } from './lib/cli-args.mjs';
import { datasetPath, freshnessDays } from './lib/datasets.mjs';
import { readJsonIf, writeJson } from './lib/json-io.mjs';
import { guardBrowserLaunch, LaunchGuardError } from './lib/playwright-launch.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { commitAndPush, onBranch } from './lib/routine-commit.mjs';
import { buildStages, runPassed, stageStatus } from './lib/weekly-collect-plan.mjs';

const TAG = '[weekly-collect]';
const RUNS_ID = 'state.weekly-collect';
const KEEP_RUNS = 30;
const BROWSER_WAIT_TRIES = 5;
const BROWSER_WAIT_MS = 60_000;
const OUTPUT_TAIL = 8_000;
// 記録の置き場（login-collectors の書き戻しと同じ範囲＋この収集の結果）
const ADD_PATHS = 'data';
// note の同期は自分で commit するが、時間切れで止まると再公開の照合ハッシュ・中断の記録が残り、後の commit の rebase を
// 止めた（2026-10-24 の初回で後の段の結果が push できなかった）。止まったときも拾って保存する
const ADD_DATASETS = `state.note-attachments-missing,state.ig-reconcile,state.note-republish-hashes,state.note-update-aborted,${RUNS_ID}`;

const args = parseCliArgs({
  plan: { type: 'boolean' },
  json: { type: 'boolean' },
  phase: { type: 'string' },
  only: { type: 'string' },
  'verify-last': { type: 'boolean' },
  'no-push': { type: 'boolean' },
});

const runsFile = datasetPath(RUNS_ID);
const git = (a) => spawnSync('git', a, { cwd: REPO_ROOT, encoding: 'utf8' });
const nowIso = () => new Date().toISOString();

function kdpMonthsDue() {
  const r = spawnSync(process.execPath, ['scripts/kdp-report.mjs', '--list-due'], { cwd: REPO_ROOT, encoding: 'utf8' });
  if (r.status !== 0) return { months: [], problem: `kdp-report --list-due が exit ${r.status}` };
  return { months: r.stdout.split(/\s+/).filter((m) => /^\d{4}-\d{2}$/.test(m)) };
}

function selectStages(stages) {
  if (args.only) {
    const ids = args.only.split(',').map((s) => s.trim()).filter(Boolean);
    const unknown = ids.filter((id) => !stages.some((s) => s.id === id));
    if (unknown.length) { console.error(`${TAG} 知らない段: ${unknown.join(', ')}（段: ${stages.map((s) => s.id).join(', ')}）`); process.exit(2); }
    return stages.filter((s) => ids.includes(s.id));
  }
  if (!['pre', 'post'].includes(args.phase)) { console.error(`${TAG} --phase pre|post か --only <段> か --plan が要る`); process.exit(2); }
  return stages.filter((s) => s.phase === args.phase);
}

/** ブラウザの空きを待つ。空かなければ理由を返す */
async function waitForBrowser() {
  for (let i = 1; i <= BROWSER_WAIT_TRIES; i += 1) {
    try { guardBrowserLaunch(); return null; } catch (e) {
      if (!(e instanceof LaunchGuardError)) throw e;
      if (i === BROWSER_WAIT_TRIES) return e.message;
      console.log(`${TAG} ブラウザが空くのを待つ ${i}/${BROWSER_WAIT_TRIES - 1}（${e.code}）`);
      await new Promise((r) => setTimeout(r, BROWSER_WAIT_MS));
    }
  }
  return null;
}

/** 1 コマンドを timeout つきで回す（プロセスグループごと止める）。出力はログへ流しつつ末尾を残す */
function runCommand(argv, { timeoutMin, env }) {
  return new Promise((resolve) => {
    const [cmd, ...rest] = argv[0] === 'npm' ? argv : [process.execPath, ...argv];
    const child = spawn(cmd, rest, { cwd: REPO_ROOT, detached: true, env: { ...process.env, DOBOKU_WEEKLY_COLLECT: '1', ...env } });
    let tail = '';
    const keep = (chunk, stream) => { stream.write(chunk); tail = (tail + chunk.toString()).slice(-OUTPUT_TAIL); };
    child.stdout.on('data', (c) => keep(c, process.stdout));
    child.stderr.on('data', (c) => keep(c, process.stderr));
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { process.kill(-child.pid, 'SIGTERM'); } catch { /* 既に終わった */ }
      setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* 既に終わった */ } }, 15_000).unref();
    }, timeoutMin * 60_000);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code: timedOut ? 124 : (code ?? (signal ? 128 : 1)), tail, timedOut });
    });
  });
}

const lastLine = (text) => String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(-1)[0] ?? '';

async function runStage(stage) {
  const started = Date.now();
  const result = { id: stage.id, title: stage.title, status: 'skipped', reason: '', exits: [], durationSec: 0 };
  if (stage.skip) { result.reason = stage.skip; return result; }
  if (stage.browser) {
    const busy = await waitForBrowser();
    if (busy) { result.status = 'failed'; result.reason = busy.slice(0, 300); return result; }
  }
  const outputs = [];
  for (const cmd of stage.commands) {
    const prev = result.exits.length ? result.exits[result.exits.length - 1] : undefined;
    if (cmd.onlyIfPrev && !cmd.onlyIfPrev.includes(prev)) { result.exits.push(null); outputs.push(''); continue; }
    console.log(`${TAG} [${stage.id}] ${cmd.argv.join(' ')}`);
    const r = await runCommand(cmd.argv, { timeoutMin: stage.timeoutMin, env: stage.env ?? {} });
    result.exits.push(r.code);
    outputs.push(r.tail);
    if (r.code !== 0 && !result.reason) result.reason = r.timedOut ? `${stage.timeoutMin} 分で打ち切り` : lastLine(r.tail).slice(0, 300);
  }
  result.status = stageStatus(stage, result.exits, outputs);
  if (result.status === 'ok') result.reason = '';
  result.durationSec = Math.round((Date.now() - started) / 1000);
  return result;
}

/** selfCommits でない段が残した記録を、型を検査してから commit・push する */
function commitPending(label) {
  if (!git(['status', '--porcelain']).stdout.trim()) return null;
  const add = spawnSync(process.execPath, ['scripts/ci-data.mjs', 'add', '--paths', ADD_PATHS, '--datasets', ADD_DATASETS], { cwd: REPO_ROOT, encoding: 'utf8' });
  process.stdout.write(add.stdout || ''); process.stderr.write(add.stderr || '');
  if (add.status !== 0) return `ci-data add が exit ${add.status}（型の違反か git の失敗）`;
  const r = commitAndPush([], `chore(weekly-collect): ${label} ${nowIso().slice(0, 16)}Z [skip ci]`, { push: !args.noPush });
  return r.problem ?? null;
}

function readRuns() {
  return readJsonIf(REPO_ROOT, runsFile) ?? { schemaVersion: 1, runs: [] };
}

function printRun(run) {
  for (const s of run.stages) console.log(`  ${s.status.padEnd(7)} ${s.id.padEnd(16)} ${s.title}${s.reason ? `（${s.reason}）` : ''}`);
  if (run.commit?.problem) console.log(`  書き戻し: ${run.commit.problem}`);
  if (run.leftover?.length) console.log(`  残った差分: ${run.leftover.join(', ')}`);
}

function verifyLast() {
  const { runs } = readRuns();
  const failDays = freshnessDays(RUNS_ID, 'failDays');
  const problems = [];
  const rows = [];
  for (const phase of ['pre', 'post']) {
    const last = runs.filter((r) => r.phase === phase).at(-1);
    if (!last) { problems.push(`${phase}: 記録が無い（収集が一度も回っていない）`); continue; }
    const ageDays = (Date.now() - Date.parse(last.finishedAt)) / 86_400_000;
    rows.push({ phase, finishedAt: last.finishedAt, ageDays: Math.round(ageDays * 10) / 10, passed: runPassed(last), stages: last.stages });
    if (ageDays > failDays) problems.push(`${phase}: 最後の収集が ${Math.floor(ageDays)} 日前（${failDays} 日を超えた・土曜の Mac が動いていない）`);
    if (!runPassed(last)) {
      const bad = last.stages.filter((s) => s.status === 'failed').map((s) => `${s.id}（${s.reason}）`);
      problems.push(`${phase}: ${last.finishedAt.slice(0, 10)} の回で失敗 ${bad.join('・') || '書き戻しの問題'}`);
    }
  }
  if (args.json) console.log(JSON.stringify({ checked: rows.length, problems, rows }, null, 2));
  else {
    console.log(`${TAG} 直近の収集を ${rows.length}/2 phase 検査（期限 ${failDays} 日）`);
    for (const r of rows) console.log(`  ${r.phase}: ${r.finishedAt}（${r.ageDays} 日前）${r.passed ? '合格' : '不合格'}`);
    for (const p of problems) console.log(`  ✗ ${p}`);
    if (!problems.length) console.log(`${TAG} ✓ 合格`);
  }
  process.exit(problems.length ? 1 : 0);
}

async function main() {
  if (args.verifyLast) return verifyLast();
  const kdp = kdpMonthsDue();
  const stages = buildStages({ kdpMonths: kdp.months });
  if (args.plan) {
    const view = stages.map((s) => ({ id: s.id, phase: s.phase, title: s.title, skip: s.skip ?? null, commands: s.commands.map((c) => c.argv.join(' ')) }));
    if (args.json) console.log(JSON.stringify({ stages: view, kdpProblem: kdp.problem ?? null }, null, 2));
    else for (const s of view) console.log(`${s.phase.padEnd(4)} ${s.id.padEnd(16)} ${s.title}${s.skip ? `（skip: ${s.skip}）` : ''}\n${s.commands.map((c) => `       ${c}`).join('\n')}`);
    return;
  }
  if (onBranch()) { console.error(`${TAG} ブランチに乗った checkout では本番を回さない（収集用 worktree で回す）。計画だけなら --plan`); process.exit(2); }

  const selected = selectStages(stages);
  const run = { phase: args.only ? 'only' : args.phase, only: args.only ?? null, host: hostname(), startedAt: nowIso(), finishedAt: null, stages: [], commit: {}, leftover: [] };
  if (kdp.problem && selected.some((s) => s.id === 'kdp')) console.log(`${TAG} ${kdp.problem}`);
  console.log(`${TAG} 段 ${selected.length} 本: ${selected.map((s) => s.id).join(' → ')}`);

  const problems = [];
  for (const stage of selected) {
    if (stage.selfCommits) { const p = commitPending('記録の保存'); if (p) problems.push(p); }
    const r = await runStage(stage);
    run.stages.push(r);
    console.log(`${TAG} [${stage.id}] ${r.status}${r.reason ? `: ${r.reason}` : ''}`);
  }
  const p = commitPending(`${run.phase} の記録`);
  if (p) problems.push(p);
  run.leftover = git(['-c', 'core.quotepath=false', 'status', '--porcelain']).stdout.split('\n').map((l) => l.slice(3)).filter(Boolean);
  if (problems.length) run.commit.problem = problems.join(' / ');
  run.finishedAt = nowIso();

  const data = readRuns();
  data.runs = [...data.runs, run].slice(-KEEP_RUNS);
  writeJson(REPO_ROOT, runsFile, data);
  const final = commitAndPush([runsFile], `chore(weekly-collect): ${run.phase} の結果 ${run.finishedAt.slice(0, 16)}Z [skip ci]`, { push: !args.noPush });
  if (final.problem) { run.commit.problem = [run.commit.problem, final.problem].filter(Boolean).join(' / '); }

  console.log(`${TAG} ${run.phase} の結果:`);
  printRun(run);
  const passed = runPassed(run);
  console.log(passed ? `${TAG} ✓ 合格` : `${TAG} ✗ 不合格`);
  process.exitCode = passed ? 0 : 1;
}

await main();
