#!/usr/bin/env node
/**
 * check-gate-parity.mjs
 * ---------------------------------------------------------------------------
 * pre-commit（scripts/install-pre-commit.mjs の HOOK_CONTENT_BODY）と
 * quality-audit（scripts/quality-audit.mjs の CHECKS）は**独立した配列**で、
 * 片方にしか無い check が生まれても誰も気づかない。
 *
 * 実際 `audit-note-cards` / `check-public-bloat` / `check-kindle-format` は
 * package.json に script 定義があるのにどちらにも配線されず、実質オーファンだった
 * （backlog「機械チェックの穴 6 件」#6）。
 *
 * この検査は「両者に登場する check」と「package.json の check-* script」を突合し、
 * **どこからも呼ばれていない check** を列挙する。
 *
 *   node scripts/check-gate-parity.mjs           # 一覧を出す（既定・非ゲート）
 *   node scripts/check-gate-parity.mjs --ci      # 新規オーファンがあれば exit 1
 *
 * baseline: .claude/config/gate-parity-baseline.json の `orphans` に
 * 「意図的にどちらにも載せない script」を理由付きで登録する（ラチェット方式）。
 * 既存分の返済は強制せず、増えることだけを止める。
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CI = process.argv.includes('--ci');
const BASELINE_PATH = join(ROOT, '.claude/config/gate-parity-baseline.json');

/**
 * package.json の検査系 script を {name, file} で返す。
 * npm script 名（check-magazine-cta）と実体ファイル名（check-magazine-cta-reachability）が
 * 食い違うものがあるため、**両方で照合しないと偽オーファンが出る**（2026-08-17 に自作検査で実際に踏んだ）。
 */
function checkScripts() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  return Object.entries(pkg.scripts ?? {})
    .filter(([n]) => /^(check|verify|audit)-/.test(n))
    .map(([name, cmd]) => {
      const m = String(cmd).match(/([a-zA-Z0-9._/-]+)\.(?:mjs|ts)/);
      return { name, file: m ? m[1].split('/').pop() : null };
    });
}

/** 呼び出し元テキストから「npm script 名」と「実体ファイル名」の両方を拾う */
function callersIn(files) {
  const found = new Set();
  for (const p of files) {
    const src = readFileSync(p, 'utf8');
    for (const m of src.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)) found.add(m[1]);
    // パスは任意の深さを許す（.claude/scripts/youtube/verify-yt-status.mjs 等）
    for (const m of src.matchAll(/([a-zA-Z0-9._/-]+)\.(?:mjs|ts)\b/g)) found.add(m[1].split('/').pop());
  }
  return found;
}

function walkFiles(dir, re, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, re, acc);
    else if (re.test(e.name)) acc.push(p);
  }
  return acc;
}

const preCommitChecks = () => callersIn([join(ROOT, 'scripts/install-pre-commit.mjs')]);
const auditChecks = () => {
  const src = readFileSync(join(ROOT, 'scripts/quality-audit.mjs'), 'utf8');
  const found = new Set();
  for (const m of src.matchAll(/npm:\s*'([a-zA-Z0-9:_-]+)'/g)) found.add(m[1]);
  return found;
};
/**
 * pre-commit / quality-audit 以外の正当な呼び出し元。
 * 週次 workflow や SKILL 手順書から呼ばれる surfacer が多数あり、
 * これらを「オーファン」と呼ぶと本物の穴が埋もれる（2026-08-17 実測で 44 件中 34 件がこれ）。
 */
const otherCallers = () =>
  callersIn([
    ...walkFiles(join(ROOT, '.github/workflows'), /\.ya?ml$/),
    ...walkFiles(join(ROOT, '.claude/skills'), /\.md$/),
  ]);

const scripts = checkScripts();
const pre = preCommitChecks();
const audit = auditChecks();
const other = otherCallers();
const baseline = existsSync(BASELINE_PATH)
  ? (JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).orphans ?? {})
  : {};

// script 名（check-foo）と、pre-commit が拾うファイル名（check-foo）は一致する前提。
// npm script 名だけで呼ばれる場合もあるので両方で照合する。
// `foo` と `foo:ci` は同じ実体なので、どちらかが配線されていれば OK とする
const base = (n) => n.replace(/:(ci|check|live|all)$/, '');
const hasAny = (st, x) =>
  st.has(x.name) || st.has(base(x.name)) || [...st].some((v) => base(v) === base(x.name)) ||
  (x.file && (st.has(x.file) || [...st].some((v) => base(v) === x.file)));
const known = (x) => hasAny(pre, x) || hasAny(audit, x) || hasAny(other, x);
const orphans = scripts.filter((x) => !known(x)).map((x) => x.name);
const newOrphans = orphans.filter((s) => !baseline[s]);
const fixed = Object.keys(baseline).filter((n) => { const x = scripts.find((y) => y.name === n); return x && known(x); });

console.log(
  `[check-gate-parity] package.json の検査系 script ${scripts.length} 件を突合` +
    `（pre-commit ${pre.size} / quality-audit ${audit.size} / workflow・SKILL ${other.size} / baseline ${Object.keys(baseline).length} 件）`,
);
const inSet = (st, x) => hasAny(st, x);
console.log(`  pre-commit: ${scripts.filter((x) => inSet(pre, x)).length} 件 / quality-audit: ${scripts.filter((x) => inSet(audit, x)).length} 件 / workflow・SKILL: ${scripts.filter((x) => inSet(other, x)).length} 件`);
console.log(`  どこからも呼ばれない: ${orphans.length} 件（うち baseline 外 ${newOrphans.length}）`);

if (fixed.length) {
  console.log(`\n  info: baseline 掲載だが配線された ${fixed.length} 件（baseline から削除してよい）: ${fixed.join(', ')}`);
}

// 検査ゼロを PASS と呼ばない（走査経路が壊れていれば故障として落とす）
if (!scripts.length || (!pre.size && !audit.size && !other.size)) {
  console.error(
    `\n✗ 検査不成立: script ${scripts.length} 件 / pre-commit ${pre.size} / quality-audit ${audit.size}（走査が壊れている）`,
  );
  process.exit(1);
}

if (newOrphans.length) {
  console.error(`\n✗ どこからも呼ばれない検査 ${newOrphans.length} 件:`);
  for (const s of newOrphans) console.error(`    ${s}`);
  console.error('  対処: quality-audit の CHECKS へ追加する / pre-commit へ足す /');
  console.error(`        意図的に配線しないなら ${relative(ROOT, BASELINE_PATH).split(sep).join('/')} に理由付きで登録する`);
  if (CI) process.exit(1);
} else {
  console.log(`\n✓ 新規のオーファン検査なし（${orphans.length} 件はすべて baseline 記載）`);
}
