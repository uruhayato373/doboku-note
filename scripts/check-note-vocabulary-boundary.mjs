#!/usr/bin/env node
/**
 * check-note-vocabulary-boundary.mjs — noteSeries と noteMagazine の語彙境界を機械検知する。
 * ---------------------------------------------------------------------------
 * 背景（DN-0125・2026-08-24 実査）: 827 本の frontmatter 全走査で、両方あって値が違う
 * ケースが 200 本見つかった（例: `コンクリート主任技士-実務立場別小論文`（series）と
 * `…小論文集`（magazine））。調べた結果「どちらも生きている・役割が違う」と判明した:
 *
 *   - `noteMagazine` … 商品（マガジン）への所属ラベル。`.claude/config/note-magazine-membership.json`
 *     の labels/packs/excluded のどれかに必ず属する（未分類 0 は check-magazine-membership.mjs が
 *     既に強制）。本スクリプトはこちらを再検査しない。
 *   - `noteSeries`   … 編集上の系列マーカー（カバー生成の系列名 ＋ `総合案内` はもくじ index の
 *     判定マーカー＝note-lint 経由で pre-commit BLOCK）。noteMagazine と語尾が違ってよい
 *     （「…小論文」と「…小論文集」等）——これ自体は仕様であり違反ではない。
 *
 * 決めた境界: **noteSeries は編集ラベル、noteMagazine は商品ラベル**。この境界を破る
 * 具体的な取り違えパターンを3つ検知する（いずれも 2026-08-24 実査時点で 0 件）:
 *
 *   R1: noteSeries が note-magazines.ts の `id`（機械キー・kebab-case slug）と一致する
 *       → 表示用フィールドに内部 id を書き込んだ取り違え。
 *   R2: noteSeries が note-magazine-membership.json の labels キー（＝他記事の商品ラベル）と
 *       一致し、かつ自分の noteMagazine と異なる
 *       → 別マガジンの商品ラベルを series に書いてしまったコピペ事故。
 *   R3: noteSeries が `総合案内`（もくじ index マーカー）なのに noteMagazine も設定されている
 *       → index ページは商品マガジンに属さない、という前提が崩れている。
 *
 * 逸脱 0 件が「1件も検査していない」と区別できるよう、対象数と実検査数を必ず出力する
 * （CLAUDE.md §9「検査ゼロを PASS と呼ばない」）。
 *
 * Usage:
 *   node scripts/check-note-vocabulary-boundary.mjs            content/note 全量
 *   node scripts/check-note-vocabulary-boundary.mjs --staged   pre-commit 用（staged のみ）
 *
 * exit: 0 合格 / 1 境界違反あり / 2 検査不成立（SoT・config が読めない）
 * ---------------------------------------------------------------------------
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTE_DIR = join(ROOT, 'content/note');
const SOT_PATH = join(ROOT, 'src/lib/note-magazines.ts');
const CONFIG_PATH = join(ROOT, '.claude/config/note-magazine-membership.json');

const STAGED = process.argv.includes('--staged');

/** frontmatter から noteSeries / noteMagazine を取り出す（純関数・テストから使う）。 */
export function parseVocabFields(source) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!m) return { noteSeries: null, noteMagazine: null };
  const fm = m[1];
  const strip = (v) => v.trim().replace(/^["']|["']$/g, '').trim() || null;
  const s = /^noteSeries:\s*(.+)$/m.exec(fm)?.[1];
  const g = /^noteMagazine:\s*(.+)$/m.exec(fm)?.[1];
  return { noteSeries: s ? strip(s) : null, noteMagazine: g ? strip(g) : null };
}

/** note-magazines.ts から id（機械キー）の集合を取り出す（純関数）。 */
export function parseMagazineIds(sotSource) {
  return new Set([...sotSource.matchAll(/id: '([^']+)'/g)].map((m) => m[1]));
}

/** note-magazine-membership.json の labels キー（商品ラベル）の集合を取り出す（純関数）。 */
export function parseLabelKeys(configSource) {
  const cfg = JSON.parse(configSource);
  return new Set(Object.keys(cfg.labels || {}));
}

/**
 * 1 記事の noteSeries/noteMagazine を境界ルールで評価する（純関数・テストから使う）。
 * @returns {{rule: 'R1'|'R2'|'R3', severity: 'HIGH'|'MEDIUM', detail: string}[]}
 */
export function evaluateBoundary({ noteSeries, noteMagazine, magazineIds, labelKeys }) {
  const violations = [];
  if (!noteSeries) return violations;

  if (magazineIds.has(noteSeries)) {
    violations.push({
      rule: 'R1',
      severity: 'HIGH',
      detail: `noteSeries が note-magazines.ts の id "${noteSeries}" と一致（表示フィールドに内部idを書いている）`,
    });
  }

  if (labelKeys.has(noteSeries) && noteSeries !== noteMagazine) {
    violations.push({
      rule: 'R2',
      severity: 'HIGH',
      detail: `noteSeries "${noteSeries}" が他マガジンの商品ラベルと一致（noteMagazine="${noteMagazine ?? '(なし)'}"）`,
    });
  }

  if (noteSeries === '総合案内' && noteMagazine) {
    violations.push({
      rule: 'R3',
      severity: 'MEDIUM',
      detail: `もくじ index（noteSeries: 総合案内）なのに noteMagazine="${noteMagazine}" が設定されている`,
    });
  }

  return violations;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.md$/.test(e)) out.push(p.split('\\').join('/'));
  }
  return out;
}

function main() {
  if (!existsSync(SOT_PATH) || !existsSync(CONFIG_PATH)) {
    console.error('[check-note-vocabulary-boundary] SoT または config が見つからない（検査不成立）');
    process.exit(2);
  }

  let magazineIds, labelKeys;
  try {
    magazineIds = parseMagazineIds(readFileSync(SOT_PATH, 'utf8'));
    labelKeys = parseLabelKeys(readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    console.error(`[check-note-vocabulary-boundary] SoT/config の読取に失敗（検査不成立）: ${e.message}`);
    process.exit(2);
  }
  if (magazineIds.size === 0 || labelKeys.size === 0) {
    console.error('[check-note-vocabulary-boundary] id/labels が 0 件（検査不成立・パーサ破損の疑い）');
    process.exit(2);
  }

  let files;
  if (STAGED) {
    let staged = [];
    try {
      staged = execFileSync(
        'git',
        ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'],
        { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
      ).split('\n').map((s) => s.trim()).filter(Boolean);
    } catch { staged = []; }
    files = staged.filter((f) => f.startsWith('content/note/') && f.endsWith('.md') && existsSync(f));
  } else {
    files = walk(NOTE_DIR);
  }

  let checked = 0;
  let withFields = 0;
  const violations = [];
  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    checked++;
    const { noteSeries, noteMagazine } = parseVocabFields(raw);
    if (!noteSeries && !noteMagazine) continue;
    withFields++;
    const vs = evaluateBoundary({ noteSeries, noteMagazine, magazineIds, labelKeys });
    if (vs.length) violations.push({ f, vs });
  }

  console.log(
    `[check-note-vocabulary-boundary] .md ${checked} 件中 noteSeries/noteMagazine 保有 ${withFields} 件を実検査${STAGED ? '（staged）' : ''}`
  );

  if (violations.length) {
    console.error(`\n✗ 境界違反: ${violations.length} 件`);
    for (const { f, vs } of violations) {
      console.error(`  ${f}`);
      for (const v of vs) console.error(`      [${v.severity}/${v.rule}] ${v.detail}`);
    }
    console.error(
      '\n  → noteSeries は編集上の系列マーカー（カバー生成・もくじ index判定）、noteMagazine は'
      + '\n    商品（マガジン）への所属ラベル。真実源: content/note/README.md「noteSeries/noteMagazineの境界」。'
    );
    process.exit(1);
  }

  console.log('✓ 境界違反なし');
}

main();
