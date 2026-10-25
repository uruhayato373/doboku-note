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
 *   - 段の verify（取った記録の検算・quality-audit の cadence:'collect'）を最後に回し、落ちたら段を failed にする（DN-0847）
 *   - 失敗しても次の段へ進む。結果は state.weekly-collect（.claude/state/weekly-collect/runs.json）へ残す
 *   - selfCommits でない段の記録は、次の selfCommits の段の前と phase の終わりに ci-data add（型の検査）→ commit → push する
 *   - 終わりに作業ツリーが clean か確かめる。残った差分・push の失敗は赤（次回は残りを退避してから origin/develop に戻す）
 *
 * CLI（収集用 worktree のルートで実行する。ブランチに乗った HEAD では --plan 以外を拒否する）:
 *   node scripts/weekly-collect.mjs --plan [--json]          # 段の計画だけ（ブラウザを開かない）
 *   node scripts/weekly-collect.mjs --phase pre|post         # 本番（取得・commit・push）
 *   node scripts/weekly-collect.mjs --only a8,kdp            # 指定の段だけ（phase は問わない）
 *   node scripts/weekly-collect.mjs --verify-last [--json]   # 段ごとの最新の結果（取り直しを含む）が合格か・期限内か（週次レビュー）
 *   node scripts/weekly-collect.mjs --verify-last --alive    # 直近の pre と post が期限内に回ったかだけ（日次の ops の死活・DN-0847）
 *   --no-push  commit まで
 * --only の取り直しで段ごとの最新がすべて合格になったら、Issue（channel weekly-collect）を自動で閉じる。
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
import { buildStages, commandFailureReason, judgeRuns, runPassed, stageStatus, verifyFailureReason } from './lib/weekly-collect-plan.mjs';
import { CHECKS, resolveCommand } from './quality-audit.mjs';

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
  alive: { type: 'boolean' },
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

/** 段の verify の点検 id を quality-audit の定義からコマンドへ引く（同じ点検を 2 か所に書かない・DN-0847） */
function verifyCommand(id) {
  const check = CHECKS.find((c) => c.id === id);
  if (!check || check.cadence !== 'collect') throw new Error(`${TAG} verify の ${id} は quality-audit の cadence:'collect' の点検ではない`);
  const command = resolveCommand(check);
  if (!command) throw new Error(`${TAG} verify の ${id} のコマンドが引けない（npm script が未定義）`);
  return { argv: command[0] === 'node' ? command.slice(1) : command, timeoutMin: Math.ceil(check.timeout / 60_000) };
}

/** 取った記録の検算。skip の段でも回す（取る月が無い週も、過去の記録の食い違いを見落とさない） */
async function runVerify(stage, result) {
  const failures = [];
  for (const id of stage.verify ?? []) {
    const { argv, timeoutMin } = verifyCommand(id);
    console.log(`${TAG} [${stage.id}] 検算 ${id}: ${argv.join(' ')}`);
    const r = await runCommand(argv, { timeoutMin, env: {} });
    result.verify.push({ id, exit: r.code });
    if (r.code !== 0) failures.push(r.timedOut ? `検算 ${id}: ${timeoutMin} 分で打ち切り` : verifyFailureReason(id, r.tail));
  }
  return failures;
}

async function runStage(stage) {
  const started = Date.now();
  const result = { id: stage.id, title: stage.title, status: 'skipped', reason: '', exits: [], verify: [], durationSec: 0 };
  const reasons = [];
  if (stage.skip) {
    reasons.push(stage.skip);
  } else {
    const busy = stage.browser ? await waitForBrowser() : null;
    if (busy) {
      result.status = 'failed';
      reasons.push(busy.slice(0, 300));
    } else {
      const outputs = [];
      for (const [index, cmd] of stage.commands.entries()) {
        const prev = result.exits.length ? result.exits[result.exits.length - 1] : undefined;
        if (cmd.onlyIfPrev && !cmd.onlyIfPrev.includes(prev)) { result.exits.push(null); outputs.push(''); continue; }
        console.log(`${TAG} [${stage.id}] ${cmd.argv.join(' ')}`);
        const r = await runCommand(cmd.argv, { timeoutMin: stage.timeoutMin, env: stage.env ?? {} });
        result.exits.push(r.code);
        outputs.push(r.tail);
        // 落ちた・注意のコマンドは全部並べる（note-audit は 9 本のどれが指摘したかをレビューが読む）
        if (r.code !== 0) {
          reasons.push(commandFailureReason({ argv: cmd.argv, index, total: stage.commands.length, line: lastLine(r.tail), timedOut: r.timedOut, timeoutMin: stage.timeoutMin }));
        }
      }
      result.status = stageStatus(stage, result.exits, outputs);
      if (result.status === 'ok') reasons.length = 0;
    }
  }
  const verifyFailures = await runVerify(stage, result);
  if (verifyFailures.length) { result.status = 'failed'; reasons.push(...verifyFailures); }
  result.reason = reasons.join(' / ').slice(0, 900);
  result.durationSec = Math.round((Date.now() - started) / 1000);
  return result;
}

/** selfCommits でない段が残した記録を、型を検査してから commit・push する。paths は data/ と段の addPaths */
function commitPending(label, paths) {
  if (!git(['status', '--porcelain']).stdout.trim()) return null;
  const add = spawnSync(process.execPath, ['scripts/ci-data.mjs', 'add', '--paths', paths, '--datasets', ADD_DATASETS], { cwd: REPO_ROOT, encoding: 'utf8' });
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

/** 直近の収集の判定（段ごとの最新・--alive は死活だけ）。判定は weekly-collect-plan.mjs の judgeRuns */
function judgeLast({ alive = false } = {}) {
  const { runs } = readRuns();
  const failDays = freshnessDays(RUNS_ID, 'failDays');
  const stageIds = buildStages().map((s) => s.id);
  return { failDays, stageIds, ...judgeRuns({ runs, stageIds, failDays, now: Date.now(), alive }) };
}

function verifyLast() {
  const { failDays, stageIds, problems, phases, stages } = judgeLast({ alive: args.alive });
  if (args.json) console.log(JSON.stringify({ mode: args.alive ? 'alive' : 'full', checkedPhases: phases.length, checkedStages: stages.length, problems, phases, stages }, null, 2));
  else {
    console.log(`${TAG} 直近の収集を ${phases.length}/2 phase${args.alive ? '（死活だけ）' : `・${stages.length}/${stageIds.length} 段（段ごとの最新・取り直しを含む）`}検査（期限 ${failDays} 日）`);
    for (const r of phases) console.log(`  ${r.phase}: ${r.finishedAt}（${r.ageDays} 日前）`);
    for (const s of stages) console.log(`  ${s.status.padEnd(7)} ${s.id.padEnd(16)} ${s.at ? `${s.at.slice(0, 10)} ${s.phase}` : ''}`);
    for (const p of problems) console.log(`  ✗ ${p}`);
    if (!problems.length) console.log(`${TAG} ✓ 合格`);
  }
  process.exit(problems.length ? 1 : 0);
}

/** 取り直し（--only）で段ごとの最新が全部合格になったら、土曜に開いた Issue を閉じる（閉じられなくても収集の結果は変えない） */
function resolveIssueIfRecovered() {
  const { problems } = judgeLast();
  if (problems.length) { console.log(`${TAG} 段ごとの最新にまだ ${problems.length} 件の問題がある（Issue は開いたまま）`); return; }
  const r = spawnSync(process.execPath, ['scripts/report-automation-failure.mjs', '--resolve', '--channel', 'weekly-collect', '--body', `復旧: 運営者の取り直し（--only ${args.only}）で、土曜の収集の段ごとの最新がすべて合格`], { cwd: REPO_ROOT, encoding: 'utf8' });
  console.log(`${TAG} 段ごとの最新がすべて合格。Issue（channel weekly-collect）の自動クローズ: exit ${r.status}`);
}

async function main() {
  if (args.verifyLast) return verifyLast();
  const kdp = kdpMonthsDue();
  const stages = buildStages({ kdpMonths: kdp.months });
  if (args.plan) {
    const view = stages.map((s) => ({ id: s.id, phase: s.phase, title: s.title, skip: s.skip ?? null, commands: s.commands.map((c) => c.argv.join(' ')), verify: (s.verify ?? []).map((id) => ({ id, command: verifyCommand(id).argv.join(' ') })) }));
    if (args.json) console.log(JSON.stringify({ stages: view, kdpProblem: kdp.problem ?? null }, null, 2));
    else for (const s of view) console.log(`${s.phase.padEnd(4)} ${s.id.padEnd(16)} ${s.title}${s.skip ? `（skip: ${s.skip}）` : ''}\n${[...s.commands.map((c) => `       ${c}`), ...s.verify.map((v) => `       検算 ${v.id}: ${v.command}`)].join('\n')}`);
    return;
  }
  if (onBranch()) { console.error(`${TAG} ブランチに乗った checkout では本番を回さない（収集用 worktree で回す）。計画だけなら --plan`); process.exit(2); }

  const selected = selectStages(stages);
  const run = { phase: args.only ? 'only' : args.phase, only: args.only ?? null, host: hostname(), startedAt: nowIso(), finishedAt: null, stages: [], commit: {}, leftover: [] };
  if (kdp.problem && selected.some((s) => s.id === 'kdp')) console.log(`${TAG} ${kdp.problem}`);
  console.log(`${TAG} 段 ${selected.length} 本: ${selected.map((s) => s.id).join(' → ')}`);

  const problems = [];
  const addPaths = [ADD_PATHS, ...new Set(selected.flatMap((s) => s.addPaths ?? []))].join(',');
  for (const stage of selected) {
    if (stage.selfCommits) { const p = commitPending('記録の保存', addPaths); if (p) problems.push(p); }
    const r = await runStage(stage);
    run.stages.push(r);
    console.log(`${TAG} [${stage.id}] ${r.status}${r.reason ? `: ${r.reason}` : ''}`);
  }
  const p = commitPending(`${run.phase} の記録`, addPaths);
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
  if (args.only && passed && !args.noPush) resolveIssueIfRecovered();
  process.exitCode = passed ? 0 : 1;
}

await main();
