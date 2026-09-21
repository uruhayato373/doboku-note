/**
 * ci-write-gate.mjs — CI（ops-write.yml）で外部サービスへ**書き込む**操作の安全境界（純関数）
 * ---------------------------------------------------------------------------
 * 背景（2026-09-21）: note / ココナラ / Brain / KDP / X の公開・価格・編集は、これまで
 * 「dry-run → 人が確認 → --commit」を Mac で人が叩いていた。実行主体を CI へ移しても、
 * その 3 段の意味は変えない。変えるのは「誰が叩くか」だけ。
 *
 * 方針:
 *   1. 実行できる操作は .claude/config/ci-write-operations.json（カタログ）にあるものだけ。
 *      カタログの script は、当該サービスの registry ci.writeScripts に入っていなければ無効。
 *   2. 実行前に必ず `--dry-run --json` でプランを作り、その sha256 を dispatch 入力 plan_sha256 と
 *      突合する。一致しなければ何もしない（プラン生成後に対象が変わった＝人の確認が無効）。
 *   3. 一致したときだけ DOBOKU_CI_WRITE_PLAN_SHA256=<hash> を env に載せて --commit を実行する。
 *      resolver（playwright-auth-profile.mjs）は write script に対してこの env が無いと profile を
 *      返さないので、カタログ外・hash 無しの書き込みは起動できない。
 *   4. プラン生成（dry-run）にも profile が要るため、プラン段階は PLAN_ONLY_HASH（全部 0）を渡す。
 *      resolver は形式（64 hex）しか見ないので通るが、--commit は decideExecution が 'execute' を
 *      返したときにしか組み立てない。
 *
 * このモジュールは fs / child_process を触らない（カタログの読み込みだけ fs）。実行は呼び出し側。
 * ---------------------------------------------------------------------------
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

export const CATALOG_PATH = '.claude/config/ci-write-operations.json';
export const PLAN_ONLY_HASH = '0'.repeat(64);
export const WRITE_PLAN_HASH_ENV = 'DOBOKU_CI_WRITE_PLAN_SHA256';
const RISKS = Object.freeze(['low', 'medium', 'high', 'highest']);
const ARG_TYPES = Object.freeze(['string', 'number', 'boolean']);
const OPERATION_ID_RE = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;

/** 安定化 JSON（キー順を揃える）。プラン hash が出力順に依存しないようにする。 */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

export function sha256Hex(text) {
  return createHash('sha256').update(text).digest('hex');
}

/** プラン JSON 文字列の hash。JSON として解釈できなければ生テキストの hash（プラン形式の揺れに寛容にしない: 呼び出し側は --json を要求する）。 */
export function planHash(planJsonText) {
  let parsed;
  try { parsed = JSON.parse(planJsonText); } catch { return sha256Hex(String(planJsonText)); }
  return sha256Hex(stableStringify(parsed));
}

export function verifyPlanHash(planJsonText, expectedHex) {
  const actual = planHash(planJsonText);
  const expected = String(expectedHex ?? '').trim().toLowerCase();
  return { ok: /^[0-9a-f]{64}$/.test(expected) && actual === expected, actual, expected };
}

/**
 * カタログを検証する（pure・throw で拒否）。
 * @param {object} raw カタログ JSON
 * @param {{ registry?: { services: object }, fileExists?: (rel: string) => boolean }} [deps]
 */
export function validateCatalog(raw, deps = {}) {
  const fail = (msg) => { throw new Error(`CI_WRITE_CATALOG_INVALID: ${msg}`); };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('catalog is not an object');
  if (raw.version !== 1) fail('version must be 1');
  if (!raw.operations || typeof raw.operations !== 'object') fail('operations missing');
  const services = deps.registry?.services ?? null;
  const exists = deps.fileExists ?? (() => true);
  for (const [id, op] of Object.entries(raw.operations)) {
    if (!OPERATION_ID_RE.test(id)) fail(`operation id "${id}" must be <service>.<name> in kebab-case`);
    if (!op || typeof op !== 'object') fail(`${id}: not an object`);
    if (typeof op.service !== 'string' || !op.service) fail(`${id}: service required`);
    if (typeof op.script !== 'string' || isAbsolute(op.script) || op.script.includes('\\') || op.script.includes('..')) fail(`${id}: script must be a repo-relative posix path`);
    if (!exists(op.script)) fail(`${id}: script ${op.script} does not exist`);
    if (!RISKS.includes(op.risk)) fail(`${id}: risk must be one of ${RISKS.join('|')}`);
    for (const key of ['planArgs', 'commitArgs', 'verify', 'ledger']) {
      if (!Array.isArray(op[key]) || op[key].some((s) => typeof s !== 'string')) fail(`${id}: ${key} must be string[]`);
    }
    if (!op.planArgs.includes('--dry-run')) fail(`${id}: planArgs must include --dry-run`);
    if (!op.commitArgs.includes('--commit')) fail(`${id}: commitArgs must include --commit`);
    if (op.planArgs.includes('--commit')) fail(`${id}: planArgs must not include --commit`);
    if (op.argsSchema && typeof op.argsSchema !== 'object') fail(`${id}: argsSchema must be an object`);
    for (const [arg, type] of Object.entries(op.argsSchema ?? {})) {
      const base = String(type).replace(/\?$/, '');
      if (!ARG_TYPES.includes(base)) fail(`${id}: argsSchema.${arg} type "${type}" unsupported`);
      if (!/^[a-z][a-zA-Z0-9-]*$/.test(arg)) fail(`${id}: argsSchema key "${arg}" invalid`);
    }
    if (services) {
      const entry = services[op.service];
      if (op.playwright !== false) {
        if (!entry) fail(`${id}: service "${op.service}" is not in playwright-auth-profiles.json`);
        if (!entry.ci || entry.ci.mode !== 'encrypted-state') fail(`${id}: service "${op.service}" has no encrypted-state ci mode`);
        if (!entry.ci.operations?.includes('write')) fail(`${id}: service "${op.service}" ci.operations lacks write`);
        if (!entry.ci.writeScripts?.includes(op.script)) fail(`${id}: ${op.script} is not in ${op.service}.ci.writeScripts`);
      }
    }
  }
  return true;
}

/** カタログを読み込んで検証する。registry を渡すと writeScripts との整合も見る。 */
export function loadCatalog(root, { registry, catalogPath = CATALOG_PATH } = {}) {
  const path = join(root, catalogPath);
  if (!existsSync(path)) throw new Error(`CI_WRITE_CATALOG_NOT_FOUND: ${catalogPath}`);
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  validateCatalog(raw, { registry, fileExists: (rel) => existsSync(join(root, rel)) });
  return raw;
}

export function operationFromCatalog(catalog, operationId) {
  const op = catalog?.operations?.[operationId];
  if (!op) throw new Error(`CI_WRITE_UNKNOWN_OPERATION: "${operationId}" is not in ${CATALOG_PATH}`);
  return { id: operationId, ...op };
}

/**
 * dispatch 入力 args（JSON 文字列 or オブジェクト）を argsSchema で検証・正規化する。
 * 未知キーは拒否。optional（末尾 ?）以外は必須。
 */
export function validateArgs(op, argsInput) {
  let args = argsInput ?? {};
  if (typeof args === 'string') {
    try { args = args.trim() === '' ? {} : JSON.parse(args); } catch { throw new Error('CI_WRITE_INVALID_ARGS: args is not valid JSON'); }
  }
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('CI_WRITE_INVALID_ARGS: args must be an object');
  const schema = op.argsSchema ?? {};
  const out = {};
  for (const key of Object.keys(args)) {
    if (!(key in schema)) throw new Error(`CI_WRITE_INVALID_ARGS: unknown arg "${key}"`);
  }
  for (const [key, typeSpec] of Object.entries(schema)) {
    const optional = String(typeSpec).endsWith('?');
    const type = String(typeSpec).replace(/\?$/, '');
    const value = args[key];
    if (value === undefined || value === null) {
      if (!optional) throw new Error(`CI_WRITE_INVALID_ARGS: "${key}" is required`);
      continue;
    }
    if (type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`CI_WRITE_INVALID_ARGS: "${key}" must be a number`);
    } else if (type === 'boolean') {
      if (typeof value !== 'boolean') throw new Error(`CI_WRITE_INVALID_ARGS: "${key}" must be a boolean`);
    } else if (typeof value !== 'string' || value.length > 512 || /[\r\n\0]/.test(value)) {
      throw new Error(`CI_WRITE_INVALID_ARGS: "${key}" must be a short single-line string`);
    }
    out[key] = value;
  }
  return out;
}

/** 正規化済み args を CLI フラグに変換する（--key value / boolean は --key のみ）。順序はキー名順で安定。 */
export function argsToFlags(args) {
  const flags = [];
  for (const key of Object.keys(args).sort()) {
    const value = args[key];
    if (typeof value === 'boolean') { if (value) flags.push(`--${key}`); continue; }
    flags.push(`--${key}`, String(value));
  }
  return flags;
}

export function buildPlanCommand(op, args) {
  return ['node', op.script, ...op.planArgs, ...argsToFlags(args)];
}

export function buildCommitCommand(op, args) {
  return ['node', op.script, ...op.commitArgs, ...argsToFlags(args)];
}

/**
 * 実行可否の判定（pure）。
 *   commit=false → plan-only（プランと hash を出して終わる）
 *   commit=true かつ hash 一致 → execute
 *   commit=true かつ不一致 → hash-mismatch（何もしない・exit 2）
 */
export function decideExecution({ commit, expectedHash, planJsonText }) {
  if (!commit) return { execute: false, reason: 'plan-only', hash: planHash(planJsonText) };
  const check = verifyPlanHash(planJsonText, expectedHash);
  if (!check.ok) return { execute: false, reason: 'hash-mismatch', hash: check.actual, expected: check.expected };
  return { execute: true, reason: 'execute', hash: check.actual };
}

/** 各段階で子プロセスへ渡す env（resolver の write 許可条件）。plan 段階は PLAN_ONLY_HASH。 */
export function gateEnvFor(stage, hash = null) {
  if (stage === 'plan') return { [WRITE_PLAN_HASH_ENV]: PLAN_ONLY_HASH };
  if (stage === 'commit') {
    if (!/^[0-9a-f]{64}$/.test(String(hash ?? '')) || hash === PLAN_ONLY_HASH) throw new Error('CI_WRITE_GATE_ENV: commit stage requires a real plan hash');
    return { [WRITE_PLAN_HASH_ENV]: hash };
  }
  throw new Error(`CI_WRITE_GATE_ENV: unknown stage "${stage}"`);
}
