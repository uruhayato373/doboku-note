#!/usr/bin/env node
/**
 * check-playwright-auth-wiring.mjs — DN-0108 Phase 01 の配線ゲート。
 * ---------------------------------------------------------------------------
 * 全サービス共通 auth root resolver（scripts/lib/playwright-auth-profile.mjs）への移行が
 * どこまで進んでいるかを検出する。**Phase 01 時点では既存違反があるのが正常**——
 * 既存サービススクリプトはまだ移行しない（00-master.md 実行順）ため、既定モードは
 * 検出結果を報告するだけで exit 0 にする。`--strict`（Phase 03 完了後に使う想定）だけが
 * 違反 0 件を要求する。`--ratchet` は前回計測（.claude/state/quality/playwright-auth-wiring-last.json）
 * と比較し、**増加した項目だけ**を FAIL にする（減少・横ばいは許容 — 段階移行を妨げない）。
 *
 * 検査 5 種:
 *   1. registry の schema 健全性（loadAuthRegistry が例外を投げないか・危険な profileDirName）
 *   2. Mac ユーザー名の認証絶対パス直書き（/Users/<name>/doboku-note）
 *   3. `.local/playwright-*-profile` の runtime 直書き（実装コードのみ・reference文書は対象外）
 *   4. `launchPersistentContext` を使うが共通 resolver を import していないファイル
 *   5. profile/state らしい変数を標準出力へ出す危険コード候補（console.log(PROFILE) 等）
 *
 * Usage:
 *   node scripts/check-playwright-auth-wiring.mjs              人間向けレポート・exit 0
 *   node scripts/check-playwright-auth-wiring.mjs --strict     違反 1 件でも exit 1
 *   node scripts/check-playwright-auth-wiring.mjs --ratchet    前回計測より増えたら exit 1
 *   node scripts/check-playwright-auth-wiring.mjs --json       機械可読出力
 */
import { readFileSync, readdirSync, lstatSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAuthRegistry } from './lib/playwright-auth-profile.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'check-playwright-auth-wiring';
const argv = process.argv.slice(2);
const STRICT = argv.includes('--strict');
const RATCHET = argv.includes('--ratchet');
const JSON_OUT = argv.includes('--json');
const LAST_RUN_PATH = join(ROOT, '.claude/state/quality/playwright-auth-wiring-last.json');

const WALK_IGNORE = new Set(['node_modules', '.git', '.claude/worktrees', 'out', '.next', '.local']);
const CODE_EXT_RE = /\.(mjs|ts|tsx|js)$/;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const rel = p.slice(ROOT.length + 1).split('\\').join('/');
    if (WALK_IGNORE.has(e) || WALK_IGNORE.has(rel)) continue;
    let st;
    try {
      st = lstatSync(p);
    } catch {
      continue;
    }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) walk(p, out);
    else if (CODE_EXT_RE.test(e)) out.push(p.split('\\').join('/'));
  }
  return out;
}

// 検査対象: scripts/ と .claude/skills/（実装コードのみ。docs/reference の説明文は誤検知源なので対象外）
const targets = [...walk(join(ROOT, 'scripts')), ...walk(join(ROOT, '.claude/skills'))];

const findings = { registry: [], macAbsolutePath: [], localProfileDirect: [], missingResolverImport: [], stdoutLeak: [] };

// 1. registry schema
try {
  const registry = loadAuthRegistry({ cwd: ROOT });
  for (const [id, entry] of Object.entries(registry.services)) {
    const dirName = entry.profileDirName;
    if (!dirName || typeof dirName !== 'string' || /[\\/]|\.\./.test(dirName)) {
      findings.registry.push(`service "${id}": profileDirName が不正または path traversal の疑い（${dirName}）`);
    }
    const stateName = entry.stateFileName;
    if (stateName != null && (typeof stateName !== 'string' || /[\\/]|\.\./.test(stateName))) {
      findings.registry.push(`service "${id}": stateFileName が不正（${stateName}）`);
    }
  }
} catch (e) {
  findings.registry.push(`registry 読み込み失敗: ${e.message}`);
}

const MAC_PATH_RE = /\/Users\/[A-Za-z0-9_.-]+\/doboku-note/;
const LOCAL_PROFILE_RE = /\.local\/playwright-[A-Za-z0-9_-]+-profile/;
const LAUNCH_PERSISTENT_RE = /launchPersistentContext/;
const RESOLVER_IMPORT_RE = /playwright-auth-profile\.mjs/;
// PROFILE/PROFILE_DIR らしい大文字変数を console.log 系へそのまま渡している疑いを拾う
// （false positive を減らすため PROFILE を含む識別子限定。文字列リテラル内の一致は除外できない
//   簡易ヒューリスティックなので --strict の判定材料にはせず件数報告に留める）。
const STDOUT_LEAK_RE = /console\.(log|error|warn|info)\([^)]*\b(PROFILE|profileDir|STATE_PATH|statePath)\b/;

for (const file of targets) {
  const rel = file.slice(ROOT.length + 1).split('\\').join('/');
  // このゲート自身・resolver 自身・registry は自己参照で誤検知するため除外
  if (rel === 'scripts/check-playwright-auth-wiring.mjs' || rel === 'scripts/lib/playwright-auth-profile.mjs') continue;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = text.split(/\r?\n/);

  if (MAC_PATH_RE.test(text)) {
    lines.forEach((l, i) => {
      if (MAC_PATH_RE.test(l)) findings.macAbsolutePath.push(`${rel}:${i + 1}`);
    });
  }
  if (LOCAL_PROFILE_RE.test(text)) {
    lines.forEach((l, i) => {
      if (LOCAL_PROFILE_RE.test(l)) findings.localProfileDirect.push(`${rel}:${i + 1}`);
    });
  }
  if (LAUNCH_PERSISTENT_RE.test(text) && !RESOLVER_IMPORT_RE.test(text)) {
    findings.missingResolverImport.push(rel);
  }
  if (STDOUT_LEAK_RE.test(text)) {
    lines.forEach((l, i) => {
      if (STDOUT_LEAK_RE.test(l)) findings.stdoutLeak.push(`${rel}:${i + 1}`);
    });
  }
}

const counts = Object.fromEntries(Object.entries(findings).map(([k, v]) => [k, v.length]));
const total = Object.values(counts).reduce((a, b) => a + b, 0);

function loadLastRun() {
  if (!existsSync(LAST_RUN_PATH)) return null;
  try {
    return JSON.parse(readFileSync(LAST_RUN_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function saveLastRun(counts) {
  mkdirSync(dirname(LAST_RUN_PATH), { recursive: true });
  writeFileSync(LAST_RUN_PATH, JSON.stringify({ measuredAt: new Date().toISOString(), counts }, null, 2) + '\n', 'utf8');
}

if (JSON_OUT) {
  console.log(JSON.stringify({ targetsScanned: targets.length, counts, total, findings }, null, 2));
} else {
  console.log(`[${NAME}] scripts/ + .claude/skills/ の実装コード ${targets.length} 件を実検査`);
  console.log(`[${NAME}] 1. registry schema 違反: ${counts.registry}`);
  console.log(`[${NAME}] 2. Mac 絶対パス直書き: ${counts.macAbsolutePath}`);
  for (const f of findings.macAbsolutePath.slice(0, 10)) console.log(`      ${f}`);
  console.log(`[${NAME}] 3. .local/playwright-*-profile 直書き: ${counts.localProfileDirect}`);
  for (const f of findings.localProfileDirect.slice(0, 10)) console.log(`      ${f}`);
  if (findings.localProfileDirect.length > 10) console.log(`      … ほか ${findings.localProfileDirect.length - 10} 件`);
  console.log(`[${NAME}] 4. launchPersistentContext 使用・resolver 未 import: ${counts.missingResolverImport}`);
  for (const f of findings.missingResolverImport) console.log(`      ${f}`);
  console.log(`[${NAME}] 5. profile/state の標準出力への露出候補（ヒューリスティック）: ${counts.stdoutLeak}`);
  for (const f of findings.stdoutLeak.slice(0, 10)) console.log(`      ${f}`);
  console.log(`[${NAME}] 合計 ${total} 件（Phase 01 時点では既存違反があるのが正常。移行は Phase 02-04 で進める）`);
}

if (STRICT) {
  if (total > 0) {
    console.error(`[${NAME}] ✗ --strict: 違反 ${total} 件（Phase 03 完了後に 0 を要求する設計。現時点では失敗が正常）`);
    process.exit(1);
  }
  console.log(`[${NAME}] ✓ --strict: 違反 0 件`);
  process.exit(0);
}

if (RATCHET) {
  const last = loadLastRun();
  if (!last) {
    saveLastRun(counts);
    console.log(`[${NAME}] --ratchet: 初回計測のため baseline として保存（次回から比較）`);
    process.exit(0);
  }
  const increased = [];
  for (const key of Object.keys(counts)) {
    const before = last.counts?.[key] ?? 0;
    if (counts[key] > before) increased.push(`${key}: ${before} → ${counts[key]}`);
  }
  if (increased.length > 0) {
    console.error(`[${NAME}] ✗ --ratchet: 前回計測より増加した項目がある:`);
    for (const inc of increased) console.error(`      ${inc}`);
    process.exit(1);
  }
  saveLastRun(counts);
  console.log(`[${NAME}] ✓ --ratchet: 前回計測より増加なし`);
  process.exit(0);
}

process.exit(0);
