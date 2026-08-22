#!/usr/bin/env node
// check-git-binary-policy.mjs — 「Git に何を追跡してよいか」のラチェットゲート（DN-0111 Phase 1）。
//
// なぜ閾値でも report でもなくラチェットか:
//   現 HEAD には既に 1,523 MiB の再生成物と 892 MiB の R2 行きが追跡されている。これを
//   いきなり全部 FAIL にすると誰も commit できず、結局ゲートごと無効化される。一方
//   report-only にすると誰も読まない（CLAUDE.md §9「赤いのに誰も見ていない検査は、無いのと同じ」）。
//   そこで「既存分の返済は強制しないが、増やすことは許さない」ラチェットにする。
//   baseline は Phase 4 の移行が進むたびに締め、最終的に 0 にする。
//
// 検査する 5 種:
//   1. denyRules      — 置き場が明確に間違っているもの（base64 raster SVG / 動画音声 / EPUB / 教材原典 / zip）
//   2. sizeLimits     — 1 blob あたりの巨大 blob（拡張子別）
//   3. budgets        — ディレクトリ別の追跡総量（件数で膨らむ経路を止める）
//   4. derivedPairs   — 同一原本からの二重生成（cover.svg と cover.png の同居が実例）
//   5. magicBytes     — 拡張子偽装（.svg 拡張子の JPEG が KDP を壊した実例あり）
//
// 使い方:
//   node scripts/check-git-binary-policy.mjs                   # 全量ラチェット（CI）
//   node scripts/check-git-binary-policy.mjs --staged          # staged 追加分のみ（pre-commit）
//   node scripts/check-git-binary-policy.mjs --update-baseline # 現在値を baseline へ固定
//   node scripts/check-git-binary-policy.mjs --summary         # Job Summary 向け Markdown も出す
//
// exit 0 = 増加なし / exit 1 = 増加あり or 検査不成立
//
// 設定: .claude/config/git-binary-policy.json
// baseline: .claude/state/quality/git-binary-baseline.json
// 真実源カード: .claude/todo/backlog.md の DN-0111

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_PATH = join(ROOT, '.claude/config/git-binary-policy.json');
const BASELINE_PATH = join(ROOT, '.claude/state/quality/git-binary-baseline.json');

const MiB = 1048576;
const mib = (b) => Number((b / MiB).toFixed(1));

// ------------------------------------------------------------------ 純関数（テスト対象）

export const extOf = (p) => {
  const b = basename(p);
  const i = b.lastIndexOf('.');
  return i > 0 ? b.slice(i + 1).toLowerCase() : '';
};

/**
 * allowlist は「どの検査を免除するか」まで指定させる。全免除の allowlist は作らない
 * ——理由の無い全免除が次の肥大化の入口になるため。
 */
export function allowReason(policy, path, kind) {
  for (const a of policy.allowlist || []) {
    if (!path.startsWith(a.path)) continue;
    if (!a.appliesTo || a.appliesTo.includes(kind)) return a.reason;
  }
  return null;
}

function matchesRule(rule, blob, readHead) {
  const m = rule.match || {};
  if (m.ext && !m.ext.includes(extOf(blob.path))) return false;
  if (m.pathPrefix && !m.pathPrefix.some((p) => blob.path.startsWith(p))) return false;
  if (rule.contentPattern) {
    if (blob.size < (rule.minBytesToScan || 0)) return false;
    // 埋め込み data URL は先頭に出るとは限らないので、上限つきで広めに読む。
    const head = readHead(blob.path, Math.min(blob.size, 2 * MiB));
    if (!head) return false;
    if (!new RegExp(rule.contentPattern, 'i').test(head.toString('latin1'))) return false;
  }
  return true;
}

/**
 * blob 一覧をポリシーで評価する純関数。
 * readHead(path, bytes) は Buffer か null を返すこと（テストではメモリ上の疑似ファイルを渡す）。
 * countBudgets=false のとき総量は判定も観測もしない——staged 差分だけでは総量が測れず、
 * 「検査していない」を「違反ゼロ」と表示することになるため（CLAUDE.md §9）。
 */
export function evaluateBlobs({ policy, blobs, readHead, countBudgets = true }) {
  const violations = [];
  const inspected = { blobs: blobs.length, contentScanned: 0, magicScanned: 0 };

  // 1. denyRules
  for (const rule of policy.denyRules || []) {
    for (const b of blobs) {
      if (allowReason(policy, b.path, rule.id)) continue;
      if (rule.contentPattern && b.size >= (rule.minBytesToScan || 0)) inspected.contentScanned++;
      if (!matchesRule(rule, b, readHead)) continue;
      violations.push({ rule: rule.id, path: b.path, sizeMiB: mib(b.size), detail: rule.reason, correctPlace: rule.correctPlace });
    }
  }

  // 2. sizeLimits
  for (const b of blobs) {
    if (allowReason(policy, b.path, 'size')) continue;
    const ext = extOf(b.path);
    const limit = policy.sizeLimits?.[ext] ?? policy.sizeLimits?.default;
    if (typeof limit !== 'number') continue;
    if (b.size > limit * MiB) {
      violations.push({ rule: 'size-limit', path: b.path, sizeMiB: mib(b.size), detail: '.' + ext + ' の上限 ' + limit + ' MiB を超過', correctPlace: '圧縮・webp 化・R2 退避のいずれか' });
    }
  }

  // 3. budgets
  const budgetRows = [];
  if (countBudgets) {
    for (const [dir, cap] of Object.entries(policy.budgets || {})) {
      if (dir.startsWith('_') || typeof cap !== 'number') continue;
      const bytes = blobs.filter((b) => b.path.startsWith(dir + '/')).reduce((s, b) => s + b.size, 0);
      const over = bytes > cap * MiB;
      budgetRows.push({ dir, usedMiB: mib(bytes), capMiB: cap, over });
      if (over) {
        violations.push({ rule: 'budget', path: dir + '/', sizeMiB: mib(bytes), detail: '追跡総量が上限 ' + cap + ' MiB を超過', correctPlace: 'DN-0111 Phase 4 の該当グループを R2 へ移す' });
      }
    }
  }

  // 4. derivedPairs（同一原本からの二重生成）
  for (const pr of policy.derivedPairRules || []) {
    const derivedRule = (policy.denyRules || []).find((r) => r.id === pr.onlyWhenDerivedMatches);
    const byKey = new Map();
    for (const b of blobs) {
      const ext = extOf(b.path);
      if (ext !== pr.primaryExt && ext !== pr.derivedExt) continue;
      const key = join(dirname(b.path), basename(b.path, '.' + ext));
      const g = byKey.get(key) || {};
      g[ext] = b;
      byKey.set(key, g);
    }
    for (const [key, g] of byKey) {
      const primary = g[pr.primaryExt];
      const derived = g[pr.derivedExt];
      if (!primary || !derived) continue;
      if (allowReason(policy, derived.path, pr.id)) continue;
      // 「派生と断定できる場合だけ」FAIL にする。真正ベクター + 別由来 PNG の同居は正当。
      if (derivedRule && !matchesRule(derivedRule, derived, readHead)) continue;
      violations.push({ rule: pr.id, path: derived.path, sizeMiB: mib(derived.size), detail: '同名の .' + pr.primaryExt + ' が同居（' + key + '）＝中間生成物の二重追跡', correctPlace: pr.reason });
    }
  }

  // 5. magicBytes（拡張子偽装）
  for (const b of blobs) {
    const ext = extOf(b.path);
    const expect = policy.magicBytes?.[ext];
    if (!Array.isArray(expect) || !expect.length) continue;
    if (allowReason(policy, b.path, 'magic')) continue;
    const head = readHead(b.path, 16);
    if (!head || head.length < 4) continue;
    inspected.magicScanned++;
    const hex = head.toString('hex').toUpperCase();
    if (!expect.some((sig) => hex.startsWith(sig))) {
      violations.push({ rule: 'magic-mismatch', path: b.path, sizeMiB: mib(b.size), detail: '.' + ext + ' なのに先頭バイトが ' + hex.slice(0, 8) + '（期待: ' + expect.join(' / ') + '）', correctPlace: '正しい拡張子へ改名するか、正しい形式で出力し直す' });
    }
  }

  return { violations, budgetRows, inspected };
}

/** ルール別の件数。baseline 比較の単位。 */
export function countByRule(violations) {
  const counts = {};
  for (const v of violations) counts[v.rule] = (counts[v.rule] || 0) + 1;
  return counts;
}

/** ラチェット判定。baseline より増えたルールだけを返す（減った分は返済として別に返す）。 */
export function ratchet(counts, baselineCounts = {}) {
  const increased = [];
  const repaid = [];
  for (const rule of new Set([...Object.keys(counts), ...Object.keys(baselineCounts)])) {
    const now = counts[rule] || 0;
    const was = baselineCounts[rule] || 0;
    if (now > was) increased.push({ rule, now, was });
    else if (now < was) repaid.push({ rule, now, was });
  }
  return { increased, repaid };
}

// ------------------------------------------------------------------ CLI

// core.quotepath=false は必須。日本語ディレクトリが 8 進エスケープされると
// pathPrefix 判定も拡張子判定も静かに外れる（memory: note-lint-quotepath-bypass）。
const git = (args) =>
  execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: ROOT, encoding: 'utf-8', maxBuffer: 512 * 1024 * 1024,
  });

/** 先頭バイトを読む（全読みしない）。 */
function readHeadFs(path, bytes) {
  const abs = join(ROOT, path);
  if (!existsSync(abs)) return null;
  try {
    const fd = openSync(abs, 'r');
    const buf = Buffer.alloc(bytes);
    const n = readSync(fd, buf, 0, bytes, 0);
    closeSync(fd);
    return buf.subarray(0, n);
  } catch { return null; }
}

/** 対象 blob 一覧。--staged は「追加・変更された blob」だけを見る（既存分を再判定しない）。 */
function targetBlobs(staged) {
  if (staged) {
    const paths = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']).split('\n').filter(Boolean);
    const blobs = [];
    for (const p of paths) {
      if (!existsSync(join(ROOT, p))) continue;
      let size = 0;
      try { size = Number(git(['cat-file', '-s', ':' + p]).trim()); } catch { continue; }
      blobs.push({ path: p, size });
    }
    return blobs;
  }
  const blobs = [];
  for (const line of git(['ls-tree', '-r', 'HEAD', '--long']).split('\n')) {
    if (!line) continue;
    const tab = line.indexOf('\t');
    if (tab === -1) continue;
    const meta = line.slice(0, tab).trim().split(/\s+/);
    if (meta[1] !== 'blob') continue;
    blobs.push({ path: line.slice(tab + 1), size: Number(meta[3]) });
  }
  return blobs;
}

function renderSummary(counts, baselineCounts, budgetRows, increased, violations) {
  const L = ['## Git バイナリポリシー', '', '| ルール | 現在 | baseline | 判定 |', '| --- | ---: | ---: | --- |'];
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    const was = baselineCounts[k] || 0;
    L.push('| `' + k + '` | ' + v + ' | ' + was + ' | ' + (v > was ? '**増加**' : v < was ? '返済' : '据置') + ' |');
  }
  if (budgetRows.length) {
    L.push('', '| ディレクトリ | 追跡総量 | 上限 |', '| --- | ---: | ---: |');
    for (const b of budgetRows) L.push('| `' + b.dir + '` | ' + b.usedMiB + ' MiB | ' + b.capMiB + ' MiB' + (b.over ? ' **超過**' : '') + ' |');
  }
  for (const i of increased) {
    L.push('', '### 増加: `' + i.rule + '`（' + i.was + ' → ' + i.now + '）', '');
    for (const v of violations.filter((x) => x.rule === i.rule).slice(0, 5)) {
      L.push('- `' + v.path + '` (' + v.sizeMiB + ' MiB) — ' + v.detail + (v.correctPlace ? ' → **' + v.correctPlace + '**' : ''));
    }
  }
  return L.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const STAGED = argv.includes('--staged');
  const UPDATE = argv.includes('--update-baseline');
  const SUMMARY = argv.includes('--summary');

  if (!existsSync(POLICY_PATH)) {
    console.error('[check-git-binary-policy] FAIL: ポリシーが無い（' + POLICY_PATH + '）。検査不成立。');
    process.exit(1);
  }
  const policy = JSON.parse(readFileSync(POLICY_PATH, 'utf-8'));
  const blobs = targetBlobs(STAGED);

  // 「検査ゼロを PASS と呼ばない」（CLAUDE.md §9）。
  if (!STAGED && blobs.length === 0) {
    console.error('[check-git-binary-policy] FAIL: 追跡 blob が 0 件。検査が成立していない。');
    process.exit(1);
  }

  const { violations, budgetRows, inspected } = evaluateBlobs({
    policy, blobs, readHead: readHeadFs, countBudgets: !STAGED,
  });
  const counts = countByRule(violations);

  if (UPDATE) {
    writeFileSync(BASELINE_PATH, JSON.stringify({
      updatedAt: new Date().toISOString(),
      head: git(['rev-parse', 'HEAD']).trim(),
      note: 'DN-0111 の移行が進むたびに締める。最終目標は全カテゴリ 0。更新: npm run check-git-binary-policy -- --update-baseline',
      inspectedBlobs: blobs.length,
      counts,
      budgets: budgetRows,
    }, null, 2) + '\n');
    console.log('[check-git-binary-policy] baseline を更新した（検査 ' + blobs.length + ' blob）:');
    for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log('  ' + k.padEnd(22) + String(v).padStart(6) + ' 件');
    return;
  }

  if (STAGED) {
    console.log('[check-git-binary-policy --staged] staged ' + blobs.length + ' 件を実検査（content 走査 ' + inspected.contentScanned + ' / magic 走査 ' + inspected.magicScanned + '）');
    if (!violations.length) {
      console.log('[check-git-binary-policy] ✓ 追加分にポリシー違反なし');
      return;
    }
    console.error('[check-git-binary-policy] FAIL: 追加しようとしている ' + violations.length + ' 件がポリシー違反');
    for (const v of violations.slice(0, 20)) {
      console.error('  [' + v.rule + '] ' + v.path + ' (' + v.sizeMiB + ' MiB)');
      console.error('      理由: ' + v.detail);
      if (v.correctPlace) console.error('      正しい置き場: ' + v.correctPlace);
    }
    if (violations.length > 20) console.error('  ... ほか ' + (violations.length - 20) + ' 件');
    console.error('  正当な一時回避は SKIP_GIT_BINARY_POLICY=1、恒久的なら policy の allowlist へ理由付きで追加すること。');
    process.exit(1);
  }

  if (!existsSync(BASELINE_PATH)) {
    console.error('[check-git-binary-policy] FAIL: baseline が無い。まず `npm run check-git-binary-policy -- --update-baseline` を実行すること。');
    process.exit(1);
  }
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'));
  const { increased, repaid } = ratchet(counts, baseline.counts || {});

  console.log('[check-git-binary-policy] 追跡 ' + blobs.length + ' blob を実検査（content 走査 ' + inspected.contentScanned + ' / magic 走査 ' + inspected.magicScanned + '）');
  console.log('  baseline: ' + (baseline.updatedAt || '?') + ' / 検査 ' + (baseline.inspectedBlobs ?? '?') + ' blob');
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    const was = (baseline.counts || {})[k] || 0;
    console.log('  ' + (v > was ? '↑' : v < was ? '↓' : ' ') + ' ' + k.padEnd(22) + String(v).padStart(6) + ' 件 (baseline ' + was + ')');
  }
  if (SUMMARY) console.log('\n' + renderSummary(counts, baseline.counts || {}, budgetRows, increased, violations));
  if (repaid.length) {
    console.log('  返済済み: ' + repaid.map((r) => r.rule + ' ' + r.was + '→' + r.now).join(' / ') + ' — baseline を締めること（--update-baseline）');
  }
  if (increased.length) {
    console.error('[check-git-binary-policy] FAIL: baseline から増加した違反 ' + increased.length + ' カテゴリ');
    for (const i of increased) {
      console.error('  ' + i.rule + ': ' + i.was + ' → ' + i.now);
      for (const v of violations.filter((x) => x.rule === i.rule).slice(0, 5)) {
        console.error('    ' + v.path + ' (' + v.sizeMiB + ' MiB) — ' + v.detail);
        if (v.correctPlace) console.error('      正しい置き場: ' + v.correctPlace);
      }
    }
    process.exit(1);
  }
  console.log('[check-git-binary-policy] ✓ baseline から増加なし');
}

// import 時に CLI を走らせない（テストが純関数だけを使うため）。
if (process.argv[1] && process.argv[1].endsWith('check-git-binary-policy.mjs')) main();
