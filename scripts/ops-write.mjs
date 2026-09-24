#!/usr/bin/env node
/**
 * ops-write.mjs — CI 書き込み操作（ops-write.yml）の plan / exec CLI（Mac と CI の両方で使う）
 * ---------------------------------------------------------------------------
 * 背景（2026-09-21）: scripts/lib/ci-write-gate.mjs が「操作カタログ（.claude/config/
 * ci-write-operations.json）+ repo 内の inputs から plan hash を決める」純関数を提供している。
 * このスクリプトはその薄い CLI で、判断（安全境界）は一切持たない:
 *
 *   plan（Mac）: hash を計算して人に見せるだけ。ブラウザ・書き込みなし。
 *   exec （CI 専用）: dispatch で渡された plan_sha256 と、checkout した tree から再計算した
 *     hash が一致したときだけ、DOBOKU_CI_WRITE_PLAN_SHA256=<hash> を子プロセスにだけ付けて
 *     commitArgs で script を実行する（resolver 側の許可条件は playwright-auth-profile.mjs）。
 *
 * password / Cookie / token はこのスクリプトを一切通らない（catalog・args・plan はどれも
 * secret を含まない前提。secret らしいキーは registry 側の schema gate が拒否する）。
 *
 * Usage:
 *   node scripts/ops-write.mjs plan --operation <id> --args '<json>' [--json]
 *   node scripts/ops-write.mjs exec --operation <id> --args '<json>' --plan-sha256 <hash> [--commit]
 *   node scripts/ops-write.mjs exec --operation <id> --scheduled --commit   # カタログの scheduled.args で実行
 *
 * --scheduled: カタログで `scheduled` を持つ risk=low の操作だけ。引数はカタログの固定値で、--args と
 *   --plan-sha256 は受け付けない（渡されたら前提不成立）。CI が自分で計算した hash を gate env に載せる。
 *   承認の対象は PR レビュー済みのカタログ定義（ci-write-gate.mjs の方針 5）。
 *
 * exit（exec）: 0 成功 / 1 実行または verify 失敗 / 2 hash 不一致・前提不成立
 * exit（plan）: 0 成功 / 2 カタログ・引数エラー
 * ---------------------------------------------------------------------------
 */
import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  loadCatalog,
  operationFromCatalog,
  buildPlan,
  buildCommitCommand,
  decideExecution,
  gateEnvFor,
  scheduledArgsFor,
  assertRunnerAllowed,
} from './lib/ci-write-gate.mjs';
import { detectCI, loadAuthRegistry } from './lib/playwright-auth-profile.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[ops-write]';
const GITHUB_OUTPUT_DELIM = 'OPS_WRITE_RESULT_EOF';

const HELP = `ops-write CLI

Usage:
  node scripts/ops-write.mjs plan --operation <id> --args '<json>' [--json]
  node scripts/ops-write.mjs exec --operation <id> --args '<json>' --plan-sha256 <hash> [--commit]

plan はブラウザ・書き込み不要（repo の中身から hash を再現可能）。
exec は CI 専用（GITHUB_ACTIONS/CI 環境変数が無ければ拒否）。`;

/** 単純な --flag value / --bool パーサ。argsToFlags の逆側なので独自実装は最小限に留める。 */
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--commit') { out.commit = true; continue; }
    if (a === '--json') { out.json = true; continue; }
    if (a === '--scheduled') { out.scheduled = true; continue; }
    if (a.startsWith('--')) {
      const key = a.slice(2);
      out[key] = argv[i + 1];
      i += 1;
      continue;
    }
    out._.push(a);
  }
  return out;
}

/** カタログ・registry を読み、operation を取り出す（throw で拒否）。 */
function resolveOperation(root, operationId) {
  const registry = loadAuthRegistry({ cwd: root });
  const catalog = loadCatalog(root, { registry });
  return operationFromCatalog(catalog, operationId);
}

/** 人・CI 双方に出す plan の要約行（inputs 件数 / hash / 実行可否は必ず出す）。 */
function formatPlan({ plan, hash }, extra) {
  const inputPaths = Object.keys(plan.inputs);
  const lines = [];
  lines.push(`${TAG} operation: ${plan.operation} (service: ${plan.service})`);
  lines.push(`${TAG} script: ${plan.script}`);
  lines.push(`${TAG} args: ${JSON.stringify(plan.args)}`);
  lines.push(`${TAG} inputs ${inputPaths.length} ファイル:`);
  for (const p of inputPaths) lines.push(`  ${p} : ${plan.inputs[p].slice(0, 12)}`);
  lines.push(`${TAG} hash: ${hash}`);
  if (extra) lines.push(`${TAG} 実行可否: ${extra}`);
  lines.push(`${TAG} 次に叩く:`);
  lines.push(`  gh workflow run ops-write.yml --ref develop -f operation=${plan.operation} -f args='${JSON.stringify(plan.args)}' -f plan_sha256=${hash} -f commit=true`);
  return lines.join('\n');
}

function cmdPlan(parsed, deps) {
  const { root, stdout, stderr } = deps;
  if (!parsed.operation) { stderr(`${TAG} ::error:: --operation is required\n${HELP}`); return 2; }
  let op;
  let plan;
  let hash;
  try {
    op = resolveOperation(root, parsed.operation);
    ({ plan, hash } = buildPlan(root, op, parsed.args));
  } catch (e) {
    stderr(`${TAG} ::error:: ${e.message}`);
    return 2;
  }
  if (parsed.json) {
    stdout(JSON.stringify({ operation: op.id, service: op.service, script: op.script, args: plan.args, inputs: plan.inputs, hash }));
  } else {
    stdout(formatPlan({ plan, hash }));
  }
  return 0;
}

function cmdExec(parsed, deps) {
  const { root, env, spawn, stdout, stderr } = deps;
  if (!detectCI(env)) {
    stderr(`${TAG} ::error:: exec は CI 専用（GITHUB_ACTIONS/CI 環境変数が無い）。前提不成立。`);
    return 2;
  }
  if (!parsed.operation) { stderr(`${TAG} ::error:: --operation is required`); return 2; }

  if (parsed.scheduled && (parsed.args !== undefined || parsed['plan-sha256'] !== undefined)) {
    stderr(`${TAG} ::error:: --scheduled は --args / --plan-sha256 と併用できない（引数はカタログの scheduled.args で固定）。前提不成立。`);
    return 2;
  }

  let op;
  let plan;
  let hash;
  try {
    op = resolveOperation(root, parsed.operation);
    assertRunnerAllowed(op, env);
    const args = parsed.scheduled ? scheduledArgsFor(op) : parsed.args;
    ({ plan, hash } = buildPlan(root, op, args));
  } catch (e) {
    stderr(`${TAG} ::error:: ${e.message}`);
    return 2;
  }

  const decision = decideExecution({
    commit: Boolean(parsed.commit),
    // scheduled は人の hash を持たない。照合相手は CI 自身が計算した hash（固定引数・PR レビュー済みの定義）。
    expectedHash: parsed.scheduled ? hash : parsed['plan-sha256'],
    actualHash: hash,
  });
  if (parsed.scheduled) stdout(`${TAG} scheduled: カタログの固定引数 ${JSON.stringify(plan.args)} で実行する（人の plan hash なし）`);

  if (decision.reason === 'plan-only') {
    stdout(formatPlan({ plan, hash }, 'plan-only（commit=false）'));
    return 0;
  }
  if (decision.reason === 'hash-mismatch') {
    stderr(`${TAG} ::error:: plan hash mismatch (expected=${decision.expected || '(empty)'} actual=${decision.hash})。`
      + '確認後に記事や引数が変わった可能性がある。何も実行しない。');
    stdout(formatPlan({ plan, hash }, 'hash-mismatch（何もしない）'));
    return 2;
  }

  // execute
  const cmd = buildCommitCommand(op, plan.args);
  const gateEnv = gateEnvFor(hash);
  const execEnv = { ...env, ...gateEnv };
  const spawnResult = spawn(cmd[0], cmd.slice(1), { cwd: root, env: execEnv, stdio: 'inherit' });
  const rc = spawnResult?.status ?? 1;

  const verify = [];
  for (const script of op.verify ?? []) {
    const vr = spawn('node', [script], { cwd: root, env, stdio: 'inherit' });
    verify.push({ script, rc: vr?.status ?? 1 });
  }
  const verifyFailed = verify.some((v) => v.rc !== 0);

  const result = { operation: op.id, hash, executed: true, rc, verify };
  stdout(`${TAG} inputs ${Object.keys(plan.inputs).length} ファイル / hash ${hash} / 実行可否: executed rc=${rc}${verifyFailed ? ' verify-failed' : ''}`);
  stdout(JSON.stringify(result));
  if (env.GITHUB_OUTPUT) {
    appendFileSync(env.GITHUB_OUTPUT, `result<<${GITHUB_OUTPUT_DELIM}\n${JSON.stringify(result)}\n${GITHUB_OUTPUT_DELIM}\n`);
  }

  return rc !== 0 || verifyFailed ? 1 : 0;
}

/**
 * @param {string[]} argv サブコマンド込みの引数（process.argv.slice(2) 相当）
 * @param {{ root?: string, env?: object, spawn?: Function, stdout?: Function, stderr?: Function }} [deps]
 * @returns {number} exit code
 */
export function run(argv, deps = {}) {
  const root = deps.root ?? ROOT;
  const env = deps.env ?? process.env;
  const spawn = deps.spawn ?? spawnSync;
  const stdout = deps.stdout ?? ((s) => console.log(s));
  const stderr = deps.stderr ?? ((s) => console.error(s));

  const [sub, ...rest] = argv;
  const parsed = parseArgs(rest);

  if (sub === 'plan') return cmdPlan(parsed, { root, env, stdout, stderr });
  if (sub === 'exec') return cmdExec(parsed, { root, env, spawn, stdout, stderr });

  stderr(HELP);
  return 2;
}

function main() {
  const code = run(process.argv.slice(2));
  process.exit(code);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) main();
