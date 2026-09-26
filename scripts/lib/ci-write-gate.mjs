/**
 * ci-write-gate.mjs — CI（ops-write.yml）で外部サービスへ**書き込む**操作の安全境界（純関数）
 * ---------------------------------------------------------------------------
 * 背景（2026-09-21）: note / ココナラ / KDP / X の公開・価格・編集は、これまで
 * 「内容を確認 → 人が --commit を叩く」を Mac で行っていた。実行主体を CI へ移しても、
 * 「人が確認した内容と実行される内容が同一である」ことだけは機械で保証したい。
 *
 * 方針:
 *   1. 実行できる操作は .claude/config/ci-write-operations.json（カタログ）にあるものだけ。
 *      カタログの script は、当該サービスの registry ci.writeScripts に入っていなければ無効。
 *   2. **plan はブラウザを開かずに repo の中身から決める**: { operation, args, script, inputs: { path: sha256 } }
 *      の安定化 JSON の sha256。inputs はカタログが args から組み立てる repo 内パス（記事 md・カタログ JSON・
 *      PDF 等）。人は Mac で `ops-write:plan` を叩いて hash を得て内容を確認し、その hash を dispatch に渡す。
 *   3. CI は checkout した tree で plan を**再計算**し、dispatch の plan_sha256 と一致したときだけ
 *      DOBOKU_CI_WRITE_PLAN_SHA256=<hash> を env に載せて `--commit` を実行する。不一致（確認後に記事や
 *      引数が変わった）は exit 2 で何もしない。resolver（playwright-auth-profile.mjs）は write script に
 *      この env が無いと profile を返さないので、カタログ外・hash 無しの書き込みは起動できない。
 *   4. plan 段階に profile は要らない（dry-run で下書きを作る＝それ自体が書き込み、という既存 CLI の
 *      性質に依存しない）。
 *
 * このモジュールは child_process を触らない。fs はカタログ読込と inputs のハッシュ計算だけ（注入可）。
 * ---------------------------------------------------------------------------
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { isAbsolute, join, posix } from 'node:path';

export const CATALOG_PATH = '.claude/config/ci-write-operations.json';
export const WRITE_PLAN_HASH_ENV = 'DOBOKU_CI_WRITE_PLAN_SHA256';
const RISKS = Object.freeze(['low', 'medium', 'high', 'highest']);
const ARG_TYPES = Object.freeze(['string', 'number', 'boolean']);
const OPERATION_ID_RE = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;
const MAX_INPUT_FILES = 500;

/** 安定化 JSON（キー順を揃える）。plan hash が出力順に依存しないようにする。 */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

export function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
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
    for (const key of ['commitArgs', 'verify', 'ledger', 'inputs']) {
      if (!Array.isArray(op[key]) || op[key].some((s) => typeof s !== 'string')) fail(`${id}: ${key} must be string[]`);
    }
    if (op.commitArgs.length === 0) fail(`${id}: commitArgs must not be empty (e.g. --commit)`);
    if (op.inputs.some((p) => isAbsolute(p) || p.includes('..') || p.includes('\\'))) fail(`${id}: inputs must be repo-relative posix paths`);
    if (op.argsSchema && typeof op.argsSchema !== 'object') fail(`${id}: argsSchema must be an object`);
    for (const [arg, type] of Object.entries(op.argsSchema ?? {})) {
      const base = String(type).replace(/\?$/, '');
      if (!ARG_TYPES.includes(base)) fail(`${id}: argsSchema.${arg} type "${type}" unsupported`);
      if (!/^[a-z][a-zA-Z0-9-]*$/.test(arg)) fail(`${id}: argsSchema key "${arg}" invalid`);
    }
    // inputs のテンプレート変数は argsSchema に存在する必須 string でなければならない
    for (const tpl of op.inputs) {
      for (const m of tpl.matchAll(/\{([a-zA-Z0-9-]+)\}/g)) {
        const spec = op.argsSchema?.[m[1]];
        if (!spec || String(spec) !== 'string') fail(`${id}: inputs template {${m[1]}} must be a required string arg`);
      }
    }
    if (services && op.playwright !== false) {
      const entry = services[op.service];
      if (!entry) fail(`${id}: service "${op.service}" is not in playwright-auth-profiles.json`);
      if (!entry.ci || entry.ci.mode !== 'encrypted-state') fail(`${id}: service "${op.service}" has no encrypted-state ci mode`);
      if (!entry.ci.operations?.includes('write')) fail(`${id}: service "${op.service}" ci.operations lacks write`);
      if (!entry.ci.writeScripts?.includes(op.script)) fail(`${id}: ${op.script} is not in ${op.service}.ci.writeScripts`);
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
 * 未知キーは拒否。optional（末尾 ?）以外は必須。string はパストラバーサルと改行を拒否。
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
    } else if (typeof value !== 'string' || value.length === 0 || value.length > 512 || /[\r\n\0]/.test(value) || value.includes('..') || value.startsWith('/') || value.startsWith('-')) {
      throw new Error(`CI_WRITE_INVALID_ARGS: "${key}" must be a short single-line relative string (no .., leading / or -)`);
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

/** inputs テンプレートを args で展開する（{slug} → args.slug）。 */
export function resolveInputs(op, args) {
  return op.inputs.map((tpl) => tpl.replace(/\{([a-zA-Z0-9-]+)\}/g, (_, k) => {
    if (typeof args[k] !== 'string') throw new Error(`CI_WRITE_INPUT_TEMPLATE: {${k}} is not a string arg`);
    return args[k];
  }));
}

/**
 * 入力ファイルのハッシュ表を作る。パスがディレクトリなら配下の全ファイル（名前順・最大 MAX_INPUT_FILES）。
 * 存在しないパスは例外（人が確認していないものを plan に含めない）。
 * @param {string} root
 * @param {string[]} paths repo 相対
 * @param {{ fs?: { existsSync, statSync, readdirSync, readFileSync } }} [deps]
 */
export function hashInputs(root, paths, deps = {}) {
  const f = deps.fs ?? { existsSync, statSync, readdirSync, readFileSync };
  const out = {};
  const walk = (rel) => {
    const abs = join(root, rel);
    if (!f.existsSync(abs)) throw new Error(`CI_WRITE_INPUT_MISSING: ${rel}`);
    if (f.statSync(abs).isDirectory()) {
      const names = f.readdirSync(abs).filter((n) => !n.startsWith('.')).sort();
      for (const n of names) walk(posix.join(rel, n));
      return;
    }
    if (Object.keys(out).length >= MAX_INPUT_FILES) throw new Error(`CI_WRITE_INPUT_TOO_MANY: > ${MAX_INPUT_FILES} files`);
    out[rel] = sha256Hex(f.readFileSync(abs));
  };
  for (const p of paths) walk(p.replace(/\\/g, '/').replace(/\/+$/, ''));
  return out;
}

/**
 * plan を組み立てる（pure に近い: inputs のハッシュだけ fs を読む）。
 * @returns {{ plan: object, hash: string }}
 */
export function buildPlan(root, op, args, deps = {}) {
  const normalized = validateArgs(op, args);
  const inputs = hashInputs(root, resolveInputs(op, normalized), deps);
  const plan = {
    catalogVersion: 1,
    operation: op.id,
    service: op.service,
    script: op.script,
    args: normalized,
    commitArgs: op.commitArgs,
    inputs,
  };
  return { plan, hash: sha256Hex(stableStringify(plan)) };
}

/** .mjs は node、.ts は npx tsx（publish-ig-bs.ts / publish-x.ts 等のスキル本体）。 */
export function runnerFor(script) {
  return /\.(ts|mts)$/.test(script) ? ['npx', 'tsx'] : ['node'];
}

export function buildCommitCommand(op, args) {
  return [...runnerFor(op.script), op.script, ...op.commitArgs, ...argsToFlags(args)];
}

/**
 * 実行可否の判定（pure）。
 *   commit=false → plan-only（plan と hash を出して終わる）
 *   commit=true かつ hash 一致 → execute
 *   commit=true かつ不一致 → hash-mismatch（何もしない・exit 2）
 */
export function decideExecution({ commit, expectedHash, actualHash }) {
  const expected = String(expectedHash ?? '').trim().toLowerCase();
  if (!commit) return { execute: false, reason: 'plan-only', hash: actualHash };
  if (!/^[0-9a-f]{64}$/.test(expected) || expected !== actualHash) {
    return { execute: false, reason: 'hash-mismatch', hash: actualHash, expected };
  }
  return { execute: true, reason: 'execute', hash: actualHash };
}

/** commit 段階で子プロセスへ渡す env（resolver の write 許可条件）。 */
export function gateEnvFor(hash) {
  if (!/^[0-9a-f]{64}$/.test(String(hash ?? ''))) throw new Error('CI_WRITE_GATE_ENV: a real plan hash is required');
  return { [WRITE_PLAN_HASH_ENV]: hash };
}
