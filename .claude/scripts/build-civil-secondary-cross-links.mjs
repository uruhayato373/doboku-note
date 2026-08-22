#!/usr/bin/env node
// .claude/scripts/build-civil-secondary-cross-links.mjs
//
// 1級土木 secondary 過去問の三角相互リンクを統一フォーマットで生成。
//
// グループ:
//   - basics:        secondary-concrete-basics / -earthwork-basics / -construction-plan-basics / -quality-management-basics
//   - past-problems: secondary-concrete-past-problems / -earthwork-past-problems / -construction-plan-past-problems / -quality-management-past-problems
//   - experience:    secondary-experience-writing-guide / -examples
//   - years:         secondary-r03 / r04 / r05 / r06 / r07
//
// 三角リンク原則:
//   各ファイル末尾の `**関連コンテンツ**` ブロックを以下の構造で統一:
//
//   **関連コンテンツ**
//   - [<同分野の対応する basics or past-problems>](/...)  ← 同テーマペア
//   - [<他の basics 群>](...)
//   - [<経験記述ガイド>](/...)
//   - [<試験ガイド>](/...)
//   - [<年度別 r0X>](/...)  ← years グループのみリンク（同分野出題年度）
//
// AdSense 不合格対策プラン P1-3。詳細: /Users/minamidaisuke/.claude/plans/gentle-questing-sketch.md
//
// Usage:
//   node .claude/scripts/build-civil-secondary-cross-links.mjs --dry-run
//   node .claude/scripts/build-civil-secondary-cross-links.mjs

import { transformMdxFile, readMdxFile } from './lib/mdx-io.mjs';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = resolve('content/site/civil-construction-1');
const DRY_RUN = process.argv.includes('--dry-run');

// テーマ → basics / past-problems スラッグ対応
const THEMES = [
  { theme: 'concrete', label: 'コンクリート工' },
  { theme: 'earthwork', label: '土工' },
  { theme: 'construction-plan', label: '施工計画' },
  { theme: 'quality-management', label: '品質管理' },
];

const PATH_PREFIX = '/docs/civil-construction-1-';
const STRATEGY_LINK = `- [試験ガイド・戦略](${PATH_PREFIX}guide-strategy)`;
const FOUR_MGMT_LINK = `- [4つの管理](${PATH_PREFIX}guide-four-management)`;
const EXPERIENCE_GUIDE_LINK = `- [経験記述・ガイド](${PATH_PREFIX}secondary-experience-writing-guide)`;
const EXPERIENCE_EXAMPLES_LINK = `- [経験記述・記述例](${PATH_PREFIX}secondary-experience-writing-examples)`;
const YEARS = ['r03', 'r04', 'r05', 'r06', 'r07'];

function file(slug) {
  return `${BASE}/${slug}/article.mdx`;
}

function buildLinks(currentSlug, currentLabel) {
  const lines = [];

  // テーマペアの場合（basics ⇔ past-problems）
  const themeMatch = THEMES.find((t) =>
    currentSlug === `secondary-${t.theme}-basics` || currentSlug === `secondary-${t.theme}-past-problems`
  );

  if (themeMatch) {
    const isBasics = currentSlug.endsWith('-basics');
    const pair = isBasics
      ? `secondary-${themeMatch.theme}-past-problems`
      : `secondary-${themeMatch.theme}-basics`;
    const pairLabel = isBasics ? `${themeMatch.label}・過去問題` : `${themeMatch.label}・基礎知識`;
    lines.push(`- [${pairLabel}](${PATH_PREFIX}${pair})`);

    // 他テーマの同種（basics または past-problems）に最大 2 件リンク
    const sameSideOthers = THEMES.filter((t) => t.theme !== themeMatch.theme).slice(0, 2);
    for (const t of sameSideOthers) {
      const otherSlug = isBasics ? `secondary-${t.theme}-basics` : `secondary-${t.theme}-past-problems`;
      const otherLabel = isBasics ? `${t.label}・基礎知識` : `${t.label}・過去問題`;
      lines.push(`- [${otherLabel}](${PATH_PREFIX}${otherSlug})`);
    }

    lines.push(EXPERIENCE_GUIDE_LINK);
    lines.push(STRATEGY_LINK);
    lines.push(FOUR_MGMT_LINK);

    // year r0X へのリンクは付けない（多すぎるため）
    return lines;
  }

  // experience グループ
  if (currentSlug === 'secondary-experience-writing-guide') {
    lines.push(`- [経験記述・記述例](${PATH_PREFIX}secondary-experience-writing-examples)`);
    lines.push(STRATEGY_LINK);
    lines.push(FOUR_MGMT_LINK);
    for (const t of THEMES.slice(0, 2)) {
      lines.push(`- [${t.label}・基礎知識](${PATH_PREFIX}secondary-${t.theme}-basics)`);
    }
    return lines;
  }
  if (currentSlug === 'secondary-experience-writing-examples') {
    lines.push(`- [経験記述・ガイド](${PATH_PREFIX}secondary-experience-writing-guide)`);
    lines.push(STRATEGY_LINK);
    for (const y of YEARS) {
      lines.push(`- [令和${y.replace('r0', '')}年度 第2次検定](${PATH_PREFIX}secondary-${y})`);
    }
    return lines;
  }

  // year r0X グループ
  if (/^secondary-r0[3-7]$/.test(currentSlug)) {
    // 各テーマの basics 全件 + experience + strategy
    for (const t of THEMES) {
      lines.push(`- [${t.label}・基礎知識](${PATH_PREFIX}secondary-${t.theme}-basics)`);
    }
    lines.push(EXPERIENCE_GUIDE_LINK);
    lines.push(EXPERIENCE_EXAMPLES_LINK);
    lines.push(STRATEGY_LINK);
    // 他年度へのリンク（自分以外）
    for (const y of YEARS) {
      if (`secondary-${y}` === currentSlug) continue;
      lines.push(`- [令和${y.replace('r0', '')}年度 第2次検定](${PATH_PREFIX}secondary-${y})`);
    }
    return lines;
  }

  return [];
}

function buildRelatedSection(currentSlug) {
  const lines = buildLinks(currentSlug, '');
  if (lines.length === 0) return null;
  return ['**関連コンテンツ**', ...lines].join('\n');
}

function replaceRelatedSection(raw, newSection) {
  // 末尾の `**関連コンテンツ**` ブロックを置換。
  // ブロック範囲: `**関連コンテンツ**` 行から、ファイル末尾 or 次の H1/H2 まで。
  const pattern = /(\*\*関連コンテンツ\*\*[\s\S]*?)(\n##\s|$)/;
  const match = raw.match(pattern);
  if (!match) {
    // 既存ブロックなし → ファイル末尾に新規追加
    const trimmed = raw.replace(/\s+$/, '');
    return trimmed + '\n\n' + newSection + '\n';
  }
  // 既存ブロックを置換
  return raw.replace(pattern, `${newSection}$2`);
}

function processFile(slug) {
  const path = file(slug);
  if (!existsSync(path)) return { slug, status: 'not-found', changed: false };

  const { raw } = readMdxFile(path);
  const newSection = buildRelatedSection(slug);
  if (!newSection) return { slug, status: 'no-rule', changed: false };

  const newRaw = replaceRelatedSection(raw, newSection);
  if (newRaw === raw) return { slug, status: 'no-change', changed: false };

  if (DRY_RUN) {
    console.log(`[dry-run] ${slug}`);
    console.log(newSection.split('\n').map((l) => '  ' + l).join('\n'));
    return { slug, status: 'would-change', changed: true };
  }
  transformMdxFile(path, () => newRaw);
  return { slug, status: 'changed', changed: true };
}

function main() {
  const targets = [
    ...THEMES.flatMap((t) => [`secondary-${t.theme}-basics`, `secondary-${t.theme}-past-problems`]),
    'secondary-experience-writing-guide',
    'secondary-experience-writing-examples',
    ...YEARS.map((y) => `secondary-${y}`),
  ];

  let changed = 0;
  let unchanged = 0;
  let notFound = 0;
  for (const slug of targets) {
    const result = processFile(slug);
    if (result.status === 'not-found') {
      console.log(`[not-found] ${slug}`);
      notFound++;
    } else if (result.changed) {
      console.log(`[${DRY_RUN ? 'dry-run' : 'changed'}] ${slug}`);
      changed++;
    } else {
      console.log(`[unchanged] ${slug}`);
      unchanged++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Targets: ${targets.length}, changed: ${changed}, unchanged: ${unchanged}, not-found: ${notFound}`);
  if (DRY_RUN) console.log('\n(--dry-run mode, no files modified)');
}

main();
