#!/usr/bin/env node
// prune-state-snapshots — CI が `.claude/state/metrics/**` と `.claude/state/weekly-metrics/` に積む日付付き snapshot を
// 寿命表（scripts/lib/prune-state-snapshots.mjs の POLICIES）に従って消す。
//
// 使い方:
//   node scripts/prune-state-snapshots.mjs                    # dry-run（既定）。計画を表示して何も消さない
//   node scripts/prune-state-snapshots.mjs --commit           # 実際に unlink し、weekly-metrics/index.json を書き直す
//   node scripts/prune-state-snapshots.mjs --family psi,ga4   # family を限定（workflow が自分の書く系列だけ消すため）
//   node scripts/prune-state-snapshots.mjs --check-coverage   # 寿命未宣言の日付付きファイルが 0 件か（quality-audit ci:true）
//   --json で機械可読、--now <ISO> で基準時刻を固定（テスト用）
//
// 呼ばれ方: psi-audit.yml / fetch-metrics.yml / index-coverage.yml が copy-back の直後・`git add` の直前に
// `--commit --family …` で実行する（別 commit で消すと workflow の `git reset --hard` + copy-back に黙って戻される。
// 書き手と同じ commit で消すのが唯一安全）。`git add <dir>` は削除も stage する。
//
// 出力は常に「対象 / 削除 / 保持 / 除外 / 未宣言」を数で出す（検査ゼロを PASS と呼ばない・CLAUDE.md §9）。
// exit: 0 = 計画どおり（--commit なら削除完了）/ 1 = --check-coverage で未宣言あり、または削除に失敗 / 2 = 検査不成立（git が読めない）
//
// 触らないもの: metrics/business/**・metrics/gsc/rank-watch/**（不変台帳。lib の EXCLUDED_DIRS）、
// seo-watchwords.json の evidence.source と business 台帳が名前で指すファイル（pin）。

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { EXCLUDED_DIRS, FAMILIES, METRICS_ROOT, SCAN_ROOTS, collectPins, filterWeeklyIndex, plan } from './lib/prune-state-snapshots.mjs';

function parseArgs(argv) {
  const a = { commit: false, json: false, check: false, families: null, now: Date.now(), root: REPO_ROOT };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--commit') a.commit = true;
    else if (x === '--dry-run') a.commit = false;
    else if (x === '--json') a.json = true;
    else if (x === '--check-coverage') a.check = true;
    else if (x === '--family') a.families = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (x === '--now') a.now = Date.parse(argv[++i]);
    else if (x === '--root') a.root = argv[++i];
    else if (x === '--help' || x === '-h') a.help = true;
    else throw new Error(`unknown option: ${x}`);
  }
  if (a.families) for (const f of a.families) if (!FAMILIES.includes(f)) throw new Error(`unknown family: ${f}（${FAMILIES.join(', ')}）`);
  if (!Number.isFinite(a.now)) throw new Error('--now は ISO 日時');
  return a;
}

/** tracked + untracked（ignore 除く）を同じ集合として扱う。workflow は copy-back 直後＝新ファイルが untracked の状態で呼ぶ */
function listFiles(root) {
  const out = execFileSync('git', ['-C', root, '-c', 'core.quotepath=false', 'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...SCAN_ROOTS], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return out.split('\0').filter(Boolean);
}

function readJsonAt(root) {
  return (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
}

function loadPins(root) {
  const ww = join(root, '.claude/config/seo-watchwords.json');
  const watchwords = existsSync(ww) ? JSON.parse(readFileSync(ww, 'utf8')) : null;
  const businessDir = join(root, METRICS_ROOT, 'business');
  const businessDocs = [];
  if (existsSync(businessDir)) {
    const names = execFileSync('git', ['-C', root, '-c', 'core.quotepath=false', 'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', `${METRICS_ROOT}/business`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).split('\0').filter((f) => f.endsWith('.json'));
    for (const f of names) if (existsSync(join(root, f))) businessDocs.push(readFileSync(join(root, f), 'utf8'));
  }
  return collectPins({ watchwords, businessDocs });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('usage: node scripts/prune-state-snapshots.mjs [--commit] [--family a,b] [--check-coverage] [--json] [--now ISO]');
    return 0;
  }
  let files;
  try {
    files = listFiles(args.root);
  } catch (e) {
    console.error(`[prune-state-snapshots] ✗ 検査不成立: git ls-files が失敗（${e.message.split('\n')[0]}）`);
    return 2;
  }
  const pins = loadPins(args.root);
  const result = plan({ files, now: args.now, pins, readJson: readJsonAt(args.root), families: args.families });
  const s = result.summary;

  if (args.json) {
    console.log(JSON.stringify({ mode: args.check ? 'check-coverage' : args.commit ? 'commit' : 'dry-run', families: args.families || FAMILIES, pins: [...pins], ...result }, null, 2));
  } else {
    const tag = '[prune-state-snapshots]';
    console.log(`${tag} ${args.check ? '寿命宣言の検査' : args.commit ? '削除を実行' : 'dry-run'}: 日付付き ${s.examined} 件を実検査 / 削除 ${s.delete} / 保持 ${s.keep}${s.skipped ? ` / 対象外 family ${s.skipped}` : ''} / 除外 dir ${s.excluded} / 未宣言 ${s.undeclared.length}（pin ${pins.size}）`);
    for (const f of FAMILIES) {
      const b = s.byFamily[f];
      if (b.keep || b.delete) console.log(`  ${f.padEnd(15)} 保持 ${String(b.keep).padStart(3)} / 削除 ${String(b.delete).padStart(3)}`);
    }
    if (!args.check && s.delete) for (const e of result.entries.filter((e) => e.decision === 'delete')) console.log(`  ${args.commit ? 'rm ' : '   '}${e.file}`);
    for (const u of s.undeclared) console.error(`  ✗ 未宣言: ${u} — scripts/lib/prune-state-snapshots.mjs の POLICIES に寿命を足す（消さない系列なら 'keep-all'）`);
  }

  if (args.check) {
    if (s.undeclared.length) {
      console.error(`\n✗ 寿命が宣言されていない日付付きファイル ${s.undeclared.length} 件。除外 dir（${EXCLUDED_DIRS.join(', ')}）以外の日付付き snapshot は POLICIES に載せる`);
      return 1;
    }
    if (!args.json) console.log(`  ✓ 日付付き ${s.examined} 件すべてに寿命が宣言されている`);
    return 0;
  }

  if (s.undeclared.length && !args.json) console.error(`  ⚠ 未宣言 ${s.undeclared.length} 件は消さずに残す（quality-audit の snapshot-lifetime が赤になる）`);
  if (!args.commit) return 0;

  let failed = 0;
  for (const e of result.entries) {
    if (e.decision !== 'delete') continue;
    try {
      unlinkSync(join(args.root, e.file));
    } catch (err) {
      failed++;
      console.error(`  ✗ 削除失敗 ${e.file}: ${err.message}`);
    }
  }
  for (const rw of result.indexRewrites) {
    const p = join(args.root, rw.index);
    if (!existsSync(p)) continue;
    const next = filterWeeklyIndex(JSON.parse(readFileSync(p, 'utf8')), rw.removed);
    writeFileSync(p, JSON.stringify(next, null, 2) + '\n');
    if (!args.json) console.log(`  rewrite ${rw.index}（${rw.removed.length} 週を索引から除去）`);
  }
  if (!args.json) console.log(failed ? `✗ ${failed} 件の削除に失敗` : `✓ ${s.delete} 件を削除`);
  return failed ? 1 : 0;
}

process.exitCode = main();
