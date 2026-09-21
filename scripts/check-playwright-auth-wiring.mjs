#!/usr/bin/env node
/**
 * check-playwright-auth-wiring.mjs — DN-0108 Phase 01 の配線ゲート。
 * ---------------------------------------------------------------------------
 * 全サービス共通 auth root resolver（scripts/lib/playwright-auth-profile.mjs）への移行が
 * 直書きへの回帰を検出する。既定モードは診断用に結果を報告し、CIでは`--strict`で
 * 違反 0 件を要求する。`--ratchet` は前回計測（.claude/state/quality/playwright-auth-wiring-last.json）
 * と比較し、**増加した項目だけ**を FAIL にする（減少・横ばいは許容 — 段階移行を妨げない）。
 *
 * 検査 8 種:
 *   1. registry の schema 健全性（loadAuthRegistry が例外を投げないか・危険な profileDirName）
 *   2. Mac ユーザー名の認証絶対パス直書き（/Users/<name>/doboku-note）
 *   3. `.local/playwright-*-profile` の runtime 直書き（実装コードのみ・reference文書は対象外）
 *   4. `launchPersistentContext` を使うが共通 resolver を import していないファイル
 *   5. profile/state らしい変数を標準出力へ出す危険コード候補（console.log(PROFILE) 等）
 *   6. registry の ci ブロック配線（2026-09-21）: readOnlyScripts/writeScripts の実在、readOnlyScripts に
 *      write系動詞（publish/delete/update 等）のファイル名が混入していないか、mode encrypted-state なら
 *      stateDomains と stateFileName が必須
 *   7. `.github/workflows/login-collectors.yml` が呼ぶ script が、いずれかの service の
 *      readOnlyScripts/writeScripts か auth CLI（CI_ALWAYS_ALLOWED_SCRIPTS）に入っているか
 *      （service ブロック単位の厳密対応が難しいため、workflow 全体で見た緩い判定にしている）
 *   8. git 追跡下に生の storageState/auth state っぽい json ファイルが無いか
 *
 * Usage:
 *   node scripts/check-playwright-auth-wiring.mjs              人間向けレポート・exit 0
 *   node scripts/check-playwright-auth-wiring.mjs --strict     違反 1 件でも exit 1
 *   node scripts/check-playwright-auth-wiring.mjs --ratchet    前回計測より増えたら exit 1
 *   node scripts/check-playwright-auth-wiring.mjs --json       機械可読出力
 */
import { readFileSync, readdirSync, lstatSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAuthRegistry, CI_ALWAYS_ALLOWED_SCRIPTS } from './lib/playwright-auth-profile.mjs';

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

const findings = {
  registry: [],
  macAbsolutePath: [],
  localProfileDirect: [],
  missingResolverImport: [],
  stdoutLeak: [],
  ciBlockWiring: [],
  loginCollectorsWiring: [],
  trackedAuthStateFiles: [],
};

// 1. registry schema
let loadedRegistry = null;
try {
  loadedRegistry = loadAuthRegistry({ cwd: ROOT });
  for (const [id, entry] of Object.entries(loadedRegistry.services)) {
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

// 6. ci ブロック配線
// readOnlyScripts に write 系の動詞が混入していないかのヒューリスティック（ファイル名ベース）。
const WRITE_VERB_RE = /(^|[-_])(publish|delete|update|edit|price|pause|rate|upload|post|apply|create|attach|append|insert|add|reply|replies|swap|convert|reanchor|sync-tags|thumb|profile)([-_.]|$)/;
// workflow が呼ぶが認証セッションと無関係な運用スクリプト（profile を要求しないので resolver の
// allowlist には入れない。ここは「workflow 参照 → allowlist」検査の除外リスト）。
const WORKFLOW_UTILITY_SCRIPTS = new Set([
  'scripts/report-automation-failure.mjs',
  'scripts/install-pre-commit.mjs',
  '.claude/scripts/build-doc-meta-index.mjs',
]);
const allCiScripts = new Set([...CI_ALWAYS_ALLOWED_SCRIPTS, ...WORKFLOW_UTILITY_SCRIPTS]);
if (loadedRegistry) {
  for (const [id, entry] of Object.entries(loadedRegistry.services)) {
    const ci = entry.ci;
    if (!ci || typeof ci !== 'object') continue;
    const readOnly = Array.isArray(ci.readOnlyScripts) ? ci.readOnlyScripts : [];
    const write = Array.isArray(ci.writeScripts) ? ci.writeScripts : [];
    for (const script of [...readOnly, ...write]) {
      allCiScripts.add(script);
      if (!existsSync(join(ROOT, script))) {
        findings.ciBlockWiring.push(`service "${id}": script が存在しない（${script}）`);
      }
    }
    for (const script of readOnly) {
      if (WRITE_VERB_RE.test(basename(script))) {
        findings.ciBlockWiring.push(`service "${id}": readOnlyScripts に write 系動詞のファイル名が混入（${script}）`);
      }
    }
    if (ci.mode === 'encrypted-state') {
      if (!Array.isArray(ci.stateDomains) || ci.stateDomains.length === 0) {
        findings.ciBlockWiring.push(`service "${id}": mode encrypted-state だが stateDomains が空`);
      }
      if (!entry.stateFileName) {
        findings.ciBlockWiring.push(`service "${id}": mode encrypted-state だが stateFileName が未設定`);
      }
    }
  }
}

// 7. login-collectors.yml が呼ぶ script の allowlist 整合
// service ブロック単位の厳密な if 判定は workflow 構文解析が要るため、workflow 全体で
// 参照される script が「いずれかの service の allowlist か auth CLI」に入っているかの緩い判定にする。
const LOGIN_COLLECTORS_PATH = join(ROOT, '.github/workflows/login-collectors.yml');
let loginCollectorsScanned = false;
if (existsSync(LOGIN_COLLECTORS_PATH)) {
  loginCollectorsScanned = true;
  const pkgScripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts || {};
  const workflowText = readFileSync(LOGIN_COLLECTORS_PATH, 'utf8');
  const referenced = new Set();
  for (const m of workflowText.matchAll(/\bnode\s+(scripts\/[A-Za-z0-9._\/-]+\.mjs)\b/g)) referenced.add(m[1]);
  for (const m of workflowText.matchAll(/\bnpx\s+tsx\s+([A-Za-z0-9._\/-]+\.ts)\b/g)) referenced.add(m[1]);
  for (const m of workflowText.matchAll(/\bnpm run ([a-z0-9][a-z0-9:_-]*)/g)) {
    const cmd = pkgScripts[m[1]];
    if (!cmd) continue;
    const sm = cmd.match(/\bnode\s+(scripts\/[A-Za-z0-9._\/-]+\.mjs)\b/);
    if (sm) referenced.add(sm[1]);
  }
  for (const script of referenced) {
    if (!allCiScripts.has(script)) {
      findings.loginCollectorsWiring.push(`login-collectors.yml が参照するが allowlist に無い script（${script}）`);
    }
  }
}
// workflow 未作成の間は「検査対象 0（未実装）」であり「違反 0（合格）」と区別して報告する。
// strict の合否には含めない（ここで落とすと workflow 実装前のブランチが恒久的に赤くなるため）。

// 8. git 追跡下に生の storageState/auth state っぽい json ファイルが無いか
const TRACKED_STATE_RE = /(playwright-.*state|storage-?state).*\.json$/i;
try {
  const tracked = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '-z'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  }).split('\0').filter(Boolean);
  for (const f of tracked) {
    if (TRACKED_STATE_RE.test(basename(f))) findings.trackedAuthStateFiles.push(f);
  }
} catch (e) {
  findings.trackedAuthStateFiles.push(`git ls-files 失敗: ${e.message}`);
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
  console.log(JSON.stringify({ targetsScanned: targets.length, loginCollectorsScanned, counts, total, findings }, null, 2));
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
  console.log(`[${NAME}] 6. ci ブロック配線違反: ${counts.ciBlockWiring}`);
  for (const f of findings.ciBlockWiring) console.log(`      ${f}`);
  console.log(`[${NAME}] 7. login-collectors.yml allowlist 整合: ${loginCollectorsScanned ? counts.loginCollectorsWiring : '対象なし（workflow 未作成）'}`);
  for (const f of findings.loginCollectorsWiring) console.log(`      ${f}`);
  console.log(`[${NAME}] 8. git 追跡下の生 auth state ファイル: ${counts.trackedAuthStateFiles}`);
  for (const f of findings.trackedAuthStateFiles) console.log(`      ${f}`);
  console.log(`[${NAME}] 合計 ${total} 件`);
}

if (STRICT) {
  if (total > 0) {
    console.error(`[${NAME}] ✗ --strict: 違反 ${total} 件`);
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
