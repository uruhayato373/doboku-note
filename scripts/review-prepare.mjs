#!/usr/bin/env node
/**
 * review-prepare.mjs — 週次・月次レビューの「機械で決まる準備」を 1 回で回し、結果を 1 つの要約にまとめる。
 * ---------------------------------------------------------------------------
 * npm run review-prepare -- --cadence weekly|monthly [--period 2026-W46|2026-10] [--no-write] [--check] — レビューの準備（対象の決定・下書き・関門・点検）をまとめて回し .tmp/review-prepare/ に要約を書く
 *
 * なぜ要るか（2026-11-14）: スケジュール済みタスクの週次レビューは、親のエージェントが準備のコマンドを 1 本ずつ打ち、
 * API 呼び出し 54 回・キャッシュ読み 966 万トークンになった。消費を決めるのは親の往復の回数なので、判断の要らない
 * 準備はここで順に回し、親は要約（summary.md）と要る出力だけを読む。
 *
 * やること:
 *   1. 土曜の収集が実行中か（ロックの pid が生きているか）を見る。実行中なら何も回さず exit 3
 *   2. 対象を決める。weekly は未作成の週と未完が残る最新の週、monthly は check-monthly-review-due の期限の月。無ければ exit 0（対象なし）
 *   3. STEPS の表のコマンドを順に 1 本ずつ回す（同時には回さない。この Mac は 8GB）。失敗しても次へ進む
 *   4. 各コマンドの出力を .tmp/review-prepare/<cadence>-<period>/NN-<id>.txt に、終了コード・時間・出力の末尾を summary.md に書く
 *
 * 罠:
 *   - ここは判断しない。コマンドの exit 1 は「指摘あり」のことが多く、要約にそのまま載せる（準備の失敗にしない）
 *   - writes: true の手順（下書き・点検の記録）は --no-write で飛ばす。--check は 1 本も回さず、表のコマンドが実在し配線の正本に載っているかだけ見る
 *   - 表に足すコマンドは .claude/config/review-wiring.json の同じ cadence の inputs か checks に載せる（tests/review-prepare.test.mjs が止める）
 *
 * exit: 0 準備できた・対象なし / 2 前提の誤り（引数・表の不整合）/ 3 土曜の収集が実行中
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { readJson } from './lib/json-io.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const TAG = '[review-prepare]';
const COLLECT_LOCK = join(homedir(), 'Library', 'Logs', 'doboku-note', 'weekly-review.lock', 'pid');
const TAIL_LINES = 25;

/**
 * 準備の手順の表（pure）。npm は npm script の名前、args はその引数。writes は記録・下書きを書く手順。
 * 親が読む順に並べる（対象と材料 → 関門 → 点検）。
 * @param {'weekly' | 'monthly'} cadence
 * @param {string} period 'YYYY-Www' か 'YYYY-MM'
 */
export function buildSteps(cadence, period) {
  if (cadence === 'weekly') {
    return [
      { id: 'draft', npm: 'weekly-review:draft', args: [], writes: true, timeoutMin: 10 },
      { id: 'collect', npm: 'check-weekly-collect', args: [], timeoutMin: 2 },
      { id: 'business', npm: 'business-review', args: ['report', '--json'], timeoutMin: 5 },
      { id: 'backlog-gate', npm: 'backlog-gate', args: ['--weekly'], timeoutMin: 5 },
      { id: 'growth-triage', npm: 'growth-triage', args: ['list'], timeoutMin: 2 },
      { id: 'issue-map', npm: 'check-issue-map', args: ['--due'], timeoutMin: 2 },
      { id: 'experiment-due', npm: 'check-experiment-due', args: [], timeoutMin: 2 },
      { id: 'review-checks', npm: 'review-checks', args: ['--cadence', 'weekly', '--run', period, '--write'], writes: true, timeoutMin: 30 },
    ];
  }
  if (cadence === 'monthly') {
    return [
      { id: 'business', npm: 'business-review', args: ['report', '--monthly', '--json'], timeoutMin: 5 },
      { id: 'search-opportunities', npm: 'report-search-opportunities', args: ['--json'], timeoutMin: 5 },
      { id: 'search-improvement', npm: 'search-improvement', args: ['monthly', '--json'], timeoutMin: 5 },
      { id: 'product-funnel', npm: 'report-product-funnel', args: [], timeoutMin: 5 },
      // 回すたびに data/business/records/ へ版つきの記録を書く（site-to-sales-<月>-rN.json）
      { id: 'site-to-sales', npm: 'report-site-to-sales', args: ['--month', period], writes: true, timeoutMin: 5 },
      { id: 'exam-ssot', npm: 'exam-ssot-status', args: [], timeoutMin: 2 },
      { id: 'past-exam-inventory', npm: 'check-past-exam-inventory', args: [], timeoutMin: 2 },
      { id: 'qualification-market', npm: 'qualification-market', args: [], timeoutMin: 5 },
      { id: 'demand-map', npm: 'report-demand-map', args: [], timeoutMin: 2 },
      { id: 'content-expansion', npm: 'check-content-expansion', args: ['--json'], timeoutMin: 5 },
      { id: 'backlog-gate', npm: 'backlog-gate', args: ['--monthly'], timeoutMin: 5 },
      { id: 'issue-map', npm: 'check-issue-map', args: [], timeoutMin: 2 },
      { id: 'review-checks', npm: 'review-checks', args: ['--cadence', 'monthly', '--run', period, '--write'], writes: true, timeoutMin: 30 },
    ];
  }
  throw new Error(`cadence は weekly か monthly（${cadence}）`);
}

/**
 * 週次の対象（pure）。未完が残る週と未作成の週を古い順に、重ねずに返す。
 * @param {{ due: string | null, latest: { week: string, missing: number } | null }} input
 */
export function weeklyTargets({ due, latest }) {
  const weeks = new Set();
  if (latest && latest.missing > 0) weeks.add(latest.week);
  if (due) weeks.add(due);
  return [...weeks].sort();
}

/** check-weekly-review の 1 行目（「[weekly-review] 2026-W46: 対象 6・検査 6・未完 0」）から週と未完の数を読む（pure） */
export function parseCompletionLine(text) {
  const m = String(text ?? '').match(/(\d{4}-W\d{2}): 対象 \d+・検査 \d+・未完 (\d+)/);
  return m ? { week: m[1], missing: Number(m[2]) } : null;
}

/** 土曜の収集が実行中か。ロックが残っていても、持ち主のプロセスが居なければ実行中でない（再起動で残る・2026-11-14） */
export function collectRunning(lockPidFile = COLLECT_LOCK, isAlive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } }) {
  if (!existsSync(lockPidFile)) return null;
  const pid = Number(readFileSync(lockPidFile, 'utf8').trim());
  return Number.isInteger(pid) && pid > 0 && isAlive(pid) ? pid : null;
}

/** 要約に載せる出力の末尾（pure）。JSON は末尾を載せても読めないので、上位のキーだけにする */
export function summarizeOutput(output, lines = TAIL_LINES) {
  const text = String(output ?? '').trim();
  if (/^[{[]/.test(text)) {
    try {
      const j = JSON.parse(text);
      return [Array.isArray(j) ? `JSON の配列（${j.length} 件）` : `JSON（上位のキー: ${Object.keys(j).slice(0, 30).join(', ')}）`];
    } catch { /* JSON でなければ末尾を載せる */ }
  }
  return text.split(/\r?\n/).slice(-lines).map((l) => l.slice(0, 300));
}

const runNode = (argv) => spawnSync(process.execPath, argv, { cwd: REPO_ROOT, encoding: 'utf8' });

function runStep(step, dir, index) {
  const started = Date.now();
  const r = spawnSync('npm', ['run', '-s', step.npm, '--', ...step.args], { cwd: REPO_ROOT, encoding: 'utf8', timeout: step.timeoutMin * 60_000, maxBuffer: 64 * 1024 * 1024 });
  const output = `${r.stdout ?? ''}${r.stderr ? `\n--- stderr ---\n${r.stderr}` : ''}`;
  const file = join(dir, `${String(index + 1).padStart(2, '0')}-${step.id}.txt`);
  writeFileSync(file, output);
  const timedOut = r.error?.code === 'ETIMEDOUT';
  return { ...step, file, exit: timedOut ? 'timeout' : r.status, seconds: Math.round((Date.now() - started) / 1000), bytes: output.length, tail: summarizeOutput(r.stdout?.trim() ? r.stdout : output) };
}

/** 表のコマンドが package.json にあり、配線の正本の同じ cadence に載っているか。違反の文を返す */
export function stepProblems(cadence, steps, { scripts, wiring }) {
  const cad = wiring.cadences?.[cadence] ?? {};
  const known = new Set([...(cad.inputs ?? []), ...(cad.checks ?? [])].map((e) => String(e.command).replace(/^node:/, '')));
  const problems = [];
  for (const s of steps) {
    if (!scripts[s.npm]) problems.push(`${s.npm}: package.json に無い`);
    // check-weekly-collect は収集の側の検査で、レビューの配線の表には載らない
    else if (!known.has(s.npm) && s.npm !== 'check-weekly-collect') problems.push(`${s.npm}: review-wiring.json の ${cadence} に無い`);
  }
  return problems;
}

function main() {
  const args = parseCliArgs({ cadence: { type: 'string' }, period: { type: 'string' }, 'no-write': { type: 'boolean' }, check: { type: 'boolean' } });
  const cadence = args.cadence;
  if (!['weekly', 'monthly'].includes(cadence)) { console.error(`${TAG} --cadence weekly|monthly が要る`); process.exitCode = 2; return; }

  if (args.check) {
    const steps = buildSteps(cadence, cadence === 'weekly' ? '2026-W01' : '2026-01');
    const problems = stepProblems(cadence, steps, { scripts: readJson(REPO_ROOT, 'package.json').scripts, wiring: readJson(REPO_ROOT, '.claude/config/review-wiring.json') });
    console.log(`${TAG} --check ${cadence}: 手順 ${steps.length} 本を検査・違反 ${problems.length} 件`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exitCode = problems.length ? 2 : 0;
    return;
  }

  const pid = collectRunning();
  if (pid) { console.log(`${TAG} 土曜の収集が実行中（pid ${pid}）。準備は回さない`); process.exitCode = 3; return; }

  let targets;
  if (args.period) targets = [args.period];
  else if (cadence === 'weekly') {
    const due = JSON.parse(runNode(['scripts/check-weekly-review-due.mjs', '--json']).stdout || '{}').due ?? null;
    targets = weeklyTargets({ due, latest: parseCompletionLine(runNode(['scripts/check-weekly-review.mjs', '--ref', 'origin/develop']).stdout) });
  } else {
    const due = runNode(['scripts/check-monthly-review-due.mjs', '--due-key']).stdout.trim();
    targets = due ? [due] : [];
  }
  if (!targets.length) { console.log(`${TAG} ${cadence}: 対象なし（期限の来ているレビューが無い）`); return; }

  const period = targets.at(-1);
  const dir = join(REPO_ROOT, '.tmp', 'review-prepare', `${cadence}-${period}`);
  mkdirSync(dir, { recursive: true });
  const steps = buildSteps(cadence, period);
  const results = [];
  steps.forEach((step, i) => {
    if (step.writes && args.noWrite) { results.push({ ...step, exit: 'skipped', seconds: 0, bytes: 0, tail: [], file: null }); return; }
    results.push(runStep(step, dir, i));
  });

  const rel = (p) => p.replace(`${REPO_ROOT}/`, '');
  const lines = [
    `# レビューの準備（${cadence}・${period}）`, '',
    `- 対象: ${targets.join('・')}（いちばん新しい ${period} で点検を回した）`,
    `- 作成: ${new Date().toISOString()}`,
    '- exit は各コマンドの終了コード。1 は「指摘あり」のことが多い。全文は各ファイルにある（要るものだけ読む）', '',
    '| 手順 | コマンド | exit | 秒 | 出力 |', '|---|---|---|---|---|',
    ...results.map((r) => `| ${r.id} | \`npm run ${r.npm}${r.args.length ? ` -- ${r.args.join(' ')}` : ''}\` | ${r.exit} | ${r.seconds} | ${r.file ? `${rel(r.file)}（${r.bytes} バイト）` : '—（--no-write で飛ばした）'} |`),
    '',
    ...results.filter((r) => r.file).flatMap((r) => [`## ${r.id}（exit ${r.exit}）`, '', '```', ...r.tail, '```', '']),
  ];
  const summary = join(dir, 'summary.md');
  writeFileSync(summary, `${lines.join('\n')}\n`);
  const ran = results.filter((r) => r.file).length;
  console.log(`${TAG} ${cadence} ${period}: 手順 ${steps.length} 本のうち ${ran} 本を実行（時間切れ ${results.filter((r) => r.exit === 'timeout').length}・飛ばした ${steps.length - ran}）`);
  console.log(`${TAG} 要約 → ${rel(summary)}`);
}

if (process.argv[1]?.endsWith('review-prepare.mjs')) main();
