/**
 * audit-content-layout.mjs — 情報アーキテクチャ移行の**観測専用**インベントリ。
 *
 * 目的: 移動の前後で「1 ファイルも欠けていない・1 バイトも変わっていない」を機械で示す。
 *   件数・拡張子別内訳・合計バイト数・相対パス→sha256 を決定的に出力し、
 *   新旧両方に同じ相対パスがある二重 SSOT を検出する。
 *
 * **read-only**。移動・修正・生成は一切しない（移行の観測者が実行者を兼ねない）。
 *
 * Usage:
 *   node scripts/audit-content-layout.mjs                 人間向けサマリ
 *   node scripts/audit-content-layout.mjs --json          機械可読（sha256 一覧つき）
 *   node scripts/audit-content-layout.mjs --id note       特定の移行対象だけ
 *   node scripts/audit-content-layout.mjs --refs          旧パスへの参照件数も数える（遅い）
 *
 * exit: 0 観測成功（二重 SSOT が無い）/ 1 二重 SSOT を検出 / 2 検査不成立
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  REPO_ROOT, MIGRATION_MAP,
  SITE_CONTENT_ROOT, NOTE_CONTENT_ROOT, SNS_CONTENT_ROOT,
  COCONALA_CONTENT_ROOT, KINDLE_CONTENT_ROOT, CONTENT_SOURCES_ROOT,
} from './lib/repository-paths.mjs';

const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const WITH_REFS = argv.includes('--refs');
const ONLY = argv.includes('--id') ? argv[argv.indexOf('--id') + 1] : null;

const toPosix = (v) => v.split(sep).join('/');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isSymbolicLink()) continue; // 互換 symlink は作らない方針。あっても辿らない
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

/** 1 ルートの決定的インベントリ。存在しないルートは exists:false で明示する（空と混同しない）。 */
export function inventory(root) {
  if (!existsSync(root)) return { exists: false, files: 0, bytes: 0, byExt: {}, sha256: {} };
  const files = walk(root).sort();
  const byExt = {};
  const sha256 = {};
  let bytes = 0;
  for (const abs of files) {
    const rel = toPosix(relative(root, abs));
    const ext = extname(abs).toLowerCase() || '(none)';
    byExt[ext] = (byExt[ext] ?? 0) + 1;
    bytes += statSync(abs).size;
    sha256[rel] = createHash('sha256').update(readFileSync(abs)).digest('hex');
  }
  return { exists: true, files: files.length, bytes, byExt, sha256 };
}

/** 新旧の両方に同じ相対パスがある＝二重 SSOT。移行の失敗形なので error にする。 */
export function findDualSsot(legacyInv, targetInv) {
  if (!legacyInv.exists || !targetInv.exists) return [];
  const t = new Set(Object.keys(targetInv.sha256));
  return Object.keys(legacyInv.sha256).filter((rel) => t.has(rel)).sort();
}

function countRefs(pattern) {
  try {
    const out = execFileSync(
      'grep',
      ['-rl', '--binary-files=without-match', pattern, '--include=*.md', '--include=*.mjs',
       '--include=*.ts', '--include=*.tsx', '--include=*.json', '--include=*.yml', '.'],
      { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    );
    return out.split('\n').filter((l) => l && !l.includes('node_modules') && !l.startsWith('./.git')).length;
  } catch {
    return 0; // grep はヒット 0 で exit 1
  }
}

/**
 * 移行が全部終わると MIGRATION_MAP は空になる。そのときは「移行対象ゼロ」ではなく
 * **content/ の現況インベントリ**を観測する（何件・何MB がどのチャネルにあるか）。
 * 「対象 0 件だから合格」を出さないための切り替え（CLAUDE.md §9）。
 */
function currentInventory() {
  const roots = {
    site: SITE_CONTENT_ROOT, note: NOTE_CONTENT_ROOT, sns: SNS_CONTENT_ROOT,
    coconala: COCONALA_CONTENT_ROOT, kindle: KINDLE_CONTENT_ROOT, sources: CONTENT_SOURCES_ROOT,
  };
  const rows = Object.entries(roots).map(([id, root]) => ({ id, ...inventory(root) }));
  const empty = rows.filter((r) => !r.exists || r.files === 0).length;

  // MIGRATION_MAP が空（移行完了）になると main() は必ずここへ来る。--json を無視して
  // 人間向け出力だけ返すと「機械可読と書いてあるのに JSON が出ない」状態になるので、
  // インベントリ側でも JSON を出す（2026-08-20 に到達不能を発見）。
  if (JSON_OUT) {
    writeSync(1, JSON.stringify({ mode: 'inventory', repoRoot: REPO_ROOT, channels: rows, empty }, null, 2) + '\n');
    process.exit(empty ? 1 : 0);
  }

  console.log(`[audit-content-layout] content/ の ${rows.length} チャネルを観測（read-only・移行は完了済み）`);
  for (const r of rows) {
    const v = r.exists ? `${r.files} ファイル / ${(r.bytes / 1048576).toFixed(1)}MB` : '不在';
    console.log(`  ${r.id.padEnd(10)} ${v}`);
  }
  if (empty) {
    console.error(`\n✗ 実体の無いチャネルが ${empty} 件ある（移行の取りこぼし、または置き場の宣言ミス）`);
    process.exit(1);
  }
  console.log('[audit-content-layout] ✓ 全チャネルに実体がある');
  process.exit(0);
}

function main() {
  const targets = MIGRATION_MAP.filter((m) => !ONLY || m.id === ONLY);
  if (targets.length === 0) {
    if (ONLY) {
      console.error(`✗ 検査不成立: --id ${ONLY} に一致する移行対象が無い`);
      process.exit(2);
    }
    currentInventory();
  }

  const report = [];
  let dualTotal = 0;
  for (const m of targets) {
    const legacy = inventory(m.legacy);
    const target = inventory(m.target);
    const dual = findDualSsot(legacy, target);
    dualTotal += dual.length;
    report.push({
      id: m.id,
      legacyPath: toPosix(relative(REPO_ROOT, m.legacy)),
      targetPath: toPosix(relative(REPO_ROOT, m.target)),
      legacy: JSON_OUT ? legacy : { ...legacy, sha256: undefined },
      target: JSON_OUT ? target : { ...target, sha256: undefined },
      dualSsot: dual,
      ...(WITH_REFS ? { legacyRefs: countRefs(toPosix(relative(REPO_ROOT, m.legacy))) } : {}),
    });
  }

  if (JSON_OUT) {
    writeSync(1, JSON.stringify({ repoRoot: REPO_ROOT, targets: report }, null, 2) + '\n');
    process.exit(dualTotal ? 1 : 0);
  }

  // 検査ゼロを PASS と呼ばない（§9）: 対象数と実観測数を必ず出す
  console.log(`[audit-content-layout] 移行対象 ${report.length} 件を観測（read-only）`);
  for (const r of report) {
    const l = r.legacy.exists ? `${r.legacy.files} ファイル / ${(r.legacy.bytes / 1048576).toFixed(1)}MB` : '不在';
    const t = r.target.exists ? `${r.target.files} ファイル / ${(r.target.bytes / 1048576).toFixed(1)}MB` : '未作成';
    console.log(`  ${r.id.padEnd(14)} 旧: ${l.padEnd(28)} 新: ${t}${r.dualSsot.length ? `  ⚠ 二重 ${r.dualSsot.length}` : ''}${r.legacyRefs !== undefined ? `  参照 ${r.legacyRefs}` : ''}`);
  }
  if (dualTotal) {
    console.error(`\n✗ 二重 SSOT ${dualTotal} 件: 新旧の両方に同じ相対パスがある。片方を削除して SSOT を 1 つにする。`);
    process.exit(1);
  }
  console.log('[audit-content-layout] ✓ 二重 SSOT なし');
  process.exit(0);
}

const isMain = process.argv[1] && process.argv[1].endsWith('audit-content-layout.mjs');
if (isMain) main();
