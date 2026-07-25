#!/usr/bin/env node
/**
 * lint-stories-titles.mjs — Stories/過去問パック title 字数 lint
 *
 * 大型タイトル（過去問 cover / Stories ハイライト hero）の visualLength を計測し、
 * fit-title.mjs の 4 段階閾値（OK/WARN/NOTICE/ERROR）で判定する。
 *
 * 真実源: .claude/knowledge/reference/ig-highlight-design-policy.md §4
 * util:   .claude/scripts/lib/sns-common/fit-title.mjs
 *
 * スキャン対象:
 *   - docs/sns/instagram/highlights/<NN_*>/slide-data.json
 *   - docs/sns/instagram/{exam}/exam-packs/<year>/pack-<NN>/slide-data.json
 *   - docs/sns/instagram/highlights/highlight-materials/ (旧パスはスキップ)
 *
 * Usage:
 *   node .claude/scripts/lint-stories-titles.mjs              # 全スキャン
 *   node .claude/scripts/lint-stories-titles.mjs --dir <path> # 単一ディレクトリ
 *
 * exit code: ERROR があれば 1、なければ 0
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { visualLength, classifyTitle } from './lib/sns-common/fit-title.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const IG_BASE = join(ROOT, 'docs', 'sns', 'instagram');
const HIGHLIGHTS_BASE = join(IG_BASE, 'highlights');
const EXAM_PACKS_DIRS = ['cem', 'civil-1', 'civil-2', 'pe-construction'].map(
  (e) => join(IG_BASE, e, 'exam-packs'),
);

// tokens.json から閾値を読む
const tokens = JSON.parse(
  readFileSync(resolve(ROOT, '.claude/knowledge/design-system/instagram-carousel-tokens.json'), 'utf8'),
);

// Stories ハイライト用 (highlightStories.typography)
const STORIES_SIZES = {
  large:  tokens.highlightStories.typography.hero,
  medium: tokens.highlightStories.typography.heroMid,
  small:  tokens.highlightStories.typography.heroSm,
};

// 過去問パック cover 用 (typography.coverTitle)
const COVER_SIZES = {
  large:  tokens.typography.coverTitle,
  medium: tokens.typography.coverTitleMid,
  small:  tokens.typography.coverTitleSm,
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

function findSlideDataJsons(baseDir, depth = 0, maxDepth = 4) {
  if (!existsSync(baseDir) || depth > maxDepth) return [];
  const result = [];
  const items = readdirSync(baseDir);
  for (const item of items) {
    const path = join(baseDir, item);
    if (!existsSync(path)) continue;
    const stat = statSync(path);
    if (stat.isDirectory()) {
      result.push(...findSlideDataJsons(path, depth + 1, maxDepth));
    } else if (item === 'slide-data.json') {
      result.push(path);
    }
  }
  return result;
}

function lintFile(filePath, sizes, sourceLabel) {
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!Array.isArray(data.slides)) return [];
  const results = [];
  for (const slide of data.slides) {
    const t = slide.title || '';
    if (!t) continue;
    const len = visualLength(t);
    const label = classifyTitle(t, sizes);
    results.push({
      file: filePath.replace(ROOT, '').replace(/\\/g, '/'),
      slide: slide.filename || `index:${slide.index}`,
      title: t,
      len: len.toFixed(2),
      label,
      source: sourceLabel,
    });
  }
  return results;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const targets = [];
  if (args.dir) {
    const dirPath = resolve(args.dir);
    const jsonPath = join(dirPath, 'slide-data.json');
    if (existsSync(jsonPath)) {
      const isExam = EXAM_PACKS_DIRS.some((d) => dirPath.startsWith(d));
      targets.push({ path: jsonPath, sizes: isExam ? COVER_SIZES : STORIES_SIZES, source: isExam ? 'exam' : 'highlight' });
    } else {
      // ディレクトリ配下を再帰スキャン
      for (const p of findSlideDataJsons(dirPath)) {
        const isExam = EXAM_PACKS_DIRS.some((d) => p.startsWith(d));
        targets.push({ path: p, sizes: isExam ? COVER_SIZES : STORIES_SIZES, source: isExam ? 'exam' : 'highlight' });
      }
    }
  } else {
    // 全スキャン
    for (const p of findSlideDataJsons(HIGHLIGHTS_BASE)) {
      targets.push({ path: p, sizes: STORIES_SIZES, source: 'highlight' });
    }
    for (const examPacksBase of EXAM_PACKS_DIRS) {
      for (const p of findSlideDataJsons(examPacksBase)) {
        targets.push({ path: p, sizes: COVER_SIZES, source: 'exam' });
      }
    }
  }

  if (targets.length === 0) {
    console.error('対象 slide-data.json が見つかりません');
    process.exit(1);
  }

  const allResults = [];
  for (const t of targets) {
    allResults.push(...lintFile(t.path, t.sizes, t.source));
  }

  // 結果出力
  const counts = { OK: 0, WARN: 0, NOTICE: 0, ERROR: 0 };
  const issues = [];

  for (const r of allResults) {
    counts[r.label]++;
    if (r.label !== 'OK') issues.push(r);
  }

  // 詳細レポート
  if (issues.length > 0) {
    console.log('\n=== 字数判定 (OK 以外) ===\n');
    let lastFile = '';
    for (const r of issues) {
      if (r.file !== lastFile) {
        console.log(`\n${r.file}`);
        lastFile = r.file;
      }
      const emoji = r.label === 'ERROR' ? '❌' : r.label === 'NOTICE' ? '⚠⚠' : '⚠';
      console.log(`  ${emoji} ${r.slide.padEnd(20)} ${r.label.padEnd(7)} visual=${r.len.padStart(5)}  title="${r.title}"`);
    }
  }

  // サマリ
  console.log('\n=== Summary ===');
  console.log(`  Scanned: ${targets.length} slide-data.json (${allResults.length} titles)`);
  console.log(`  OK:     ${counts.OK}`);
  console.log(`  WARN:   ${counts.WARN}   (8-11 字: heroMid / coverTitleMid 自動適用、意味が崩れない限り短縮検討)`);
  console.log(`  NOTICE: ${counts.NOTICE} (12-16 字: heroSm / coverTitleSm 自動適用、可能なら短縮)`);
  console.log(`  ERROR:  ${counts.ERROR} (17 字超: auto-fit でも収まらない、手動短縮必須)`);

  if (counts.ERROR > 0) {
    console.log('\n❌ ERROR が見つかりました。slide-data.json の title を手動で短縮してください。');
    process.exit(1);
  } else if (counts.WARN > 0 || counts.NOTICE > 0) {
    console.log('\n⚠ WARN/NOTICE は builder の auto-fit で対応されます (折り返しは発生しません)。');
    console.log('  意味が崩れない範囲で短縮できれば視覚インパクトが向上します。');
  } else {
    console.log('\n✓ 全 title が推奨字数 (7 字以内) に収まっています。');
  }
}

main();
