#!/usr/bin/env node
// .claude/scripts/split-textbooks.mjs
// 1級土木テキストブック 11→34 ページ分割スクリプト
//
// 設計書: .claude/plans/compressed-giggling-crystal.md
//
// Usage:
//   node .claude/scripts/split-textbooks.mjs [--dry-run]

import { readMdxFile, writeMdxFile } from './lib/mdx-io.mjs';
import { resolve, join } from 'node:path';
import { mkdirSync, unlinkSync, existsSync } from 'node:fs';

const BASE = resolve('content/site/civil-construction-1');
const dryRun = process.argv.includes('--dry-run');

// ── Split definitions ──────────────────────────────────────────
// h2: array of H2 heading prefixes (startsWith match), or ['*'] for all

const SPLITS = [
  {
    source: 'textbook-construction-machinery-01',
    pages: [
      { slug: 'textbook-machinery-overview', title: '建設機械の概説', order: 101, tag: 'machinery',
        desc: '1級土木施工管理技士テキスト — 建設機械の概説。建設機械の分類・最新技術動向・安全環境対策を解説。',
        h2: ['概説'] },
      { slug: 'textbook-machinery-structure', title: '建設機械の構造', order: 105, tag: 'machinery',
        desc: '1級土木施工管理技士テキスト — 建設機械の構造。原動機・動力伝達装置・油圧装置の仕組みを解説。',
        h2: ['建設機械の構造'] },
      { slug: 'textbook-tractor-bulldozer', title: 'トラクタ・ブルドーザ', order: 110, tag: 'machinery',
        desc: '1級土木施工管理技士テキスト — トラクタ・ブルドーザの解説。種類・構造・作業能力算定・リッパの施工法を解説。',
        h2: ['トラクタ'] },
      { slug: 'textbook-scraper', title: 'スクレーパ', order: 115, tag: 'machinery',
        desc: '1級土木施工管理技士テキスト — スクレーパの解説。スクレーパおよびスクレープドーザの種類・適用条件・作業能力算定を解説。',
        h2: ['スクレーパ'] },
      { slug: 'textbook-shovel-excavator', title: 'ショベル系掘削機', order: 120, tag: 'machinery',
        desc: '1級土木施工管理技士テキスト — ショベル系掘削機の解説。バックホウ・ドラグライン等の分類・諸元・作業能力算定を解説。',
        h2: ['ショベル系掘削機'] },
    ]
  },
  {
    source: 'textbook-construction-machinery-02',
    pages: [
      { slug: 'textbook-loader', title: '積込機械', order: 125, tag: 'machinery',
        desc: '1級土木施工管理技士テキスト — 積込機械の解説。トラクタショベル・ホイールローダの種類・作業能力算定を解説。',
        h2: ['積込機械'] },
      { slug: 'textbook-transport-machinery', title: '運搬機械', order: 130, tag: 'machinery',
        desc: '1級土木施工管理技士テキスト — 運搬機械の解説。ダンプトラック・不整地運搬車・ベルトコンベヤの分類・性能・作業能力算定を解説。',
        h2: ['運搬機械'] },
      { slug: 'textbook-crane', title: 'クレーン・高所作業車', order: 135, tag: 'machinery',
        desc: '1級土木施工管理技士テキスト — クレーン・高所作業車の解説。クレーンの種類・定格総荷重・高所作業車の安全基準を解説。',
        h2: ['クレーン', '高所作業車'] },
      { slug: 'textbook-grader-compaction', title: 'モータグレーダ・締固め機械', order: 140, tag: 'machinery',
        desc: '1級土木施工管理技士テキスト — モータグレーダ・締固め機械の解説。モータグレーダの構造・作業法・各種締固め機械の特性と選定を解説。',
        h2: ['モータグレーダ', '締固め機械'] },
    ]
  },
  {
    source: 'textbook-surveying',
    pages: [
      { slug: 'textbook-surveying-basics', title: '測量の基本', order: 151, tag: 'surveying',
        desc: '1級土木施工管理技士テキスト — 測量の基本。測量の分類・基準点・誤差の取り扱いを解説。',
        h2: ['測量の基本'] },
      { slug: 'textbook-distance-angle', title: '測距と測角', order: 155, tag: 'surveying',
        desc: '1級土木施工管理技士テキスト — 測距と測角の解説。セオドライト・トータルステーション・GNSSの原理と測定方法を解説。',
        h2: ['測距と測角'] },
      { slug: 'textbook-leveling', title: '水準測量・地形測量', order: 160, tag: 'surveying',
        desc: '1級土木施工管理技士テキスト — 水準測量・地形測量の解説。直接水準測量の方法・地形測量および写真測量の概要を解説。',
        h2: ['水準測量', '地形測量'] },
    ]
  },
  {
    source: 'textbook-construction-plan-text-01',
    pages: [
      { slug: 'textbook-construction-plan-overview', title: '施工計画の概説・施工計画書', order: 205, tag: 'construction-plan',
        desc: '1級土木施工管理技士テキスト — 施工計画の概説。施工計画の目的・手順・留意点・施工計画書の作成方法を解説。',
        h2: ['施工計画の概説'] },
      { slug: 'textbook-site-investigation', title: '事前調査・基本計画', order: 210, tag: 'construction-plan',
        desc: '1級土木施工管理技士テキスト — 事前調査・基本計画の解説。現地踏査・近隣調査・施工基本計画の策定方法を解説。',
        h2: ['事前調査', '基本計画'] },
      { slug: 'textbook-work-scheduling', title: '工程計画', order: 215, tag: 'construction-plan',
        desc: '1級土木施工管理技士テキスト — 工程計画の解説。作業可能日数・施工速度・バーチャート工程表の作成方法を解説。',
        h2: ['工程計画'] },
    ]
  },
  {
    source: 'textbook-construction-plan-text-02',
    pages: [
      { slug: 'textbook-management-subplans', title: '各種管理計画', order: 220, tag: 'construction-plan',
        desc: '1級土木施工管理技士テキスト — 各種管理計画の解説。仮設備・調達・原価管理・品質管理・安全管理・環境保全・現場組織を解説。',
        h2: ['*'] },
    ]
  },
  {
    source: 'textbook-schedule-management',
    pages: [
      { slug: 'textbook-schedule-overview', title: '工程管理の概説', order: 251, tag: 'schedule',
        desc: '1級土木施工管理技士テキスト — 工程管理の概説。工程管理の目的・手順・工程計画と実績の管理方法を解説。',
        h2: ['工程管理の概説'] },
      { slug: 'textbook-schedule-charts', title: '工程図表', order: 255, tag: 'schedule',
        desc: '1級土木施工管理技士テキスト — 工程図表の解説。バーチャート・ガントチャート・グラフ式等の各種工程図表の特徴と使い分けを解説。',
        h2: ['工程図表'] },
      { slug: 'textbook-network-schedule', title: 'ネットワーク式工程表', order: 260, tag: 'schedule',
        desc: '1級土木施工管理技士テキスト — ネットワーク式工程表の解説。EST・LFT・クリティカルパス・フロートの計算方法を解説。',
        h2: ['ネットワーク式工程表'] },
    ]
  },
  {
    source: 'textbook-quality-management-text',
    pages: [
      { slug: 'textbook-quality-overview', title: '品質管理の概説・方法', order: 301, tag: 'quality',
        desc: '1級土木施工管理技士テキスト — 品質管理の概説と方法。品質管理の定義・ISO規格体系・QC七つ道具の活用法を解説。',
        h2: ['品質管理の概説', '品質管理の方法'] },
      { slug: 'textbook-histogram', title: 'ヒストグラム・工程能力図', order: 305, tag: 'quality',
        desc: '1級土木施工管理技士テキスト — ヒストグラム・工程能力図の解説。度数分布表の作り方・工程能力指数の計算方法を解説。',
        h2: ['工程能力図', 'ヒストグラム'] },
      { slug: 'textbook-control-chart', title: '管理図（シューハート管理図）', order: 310, tag: 'quality',
        desc: '1級土木施工管理技士テキスト — 管理図の解説。シューハート管理図の種類・作成手順・管理限界線の計算方法を解説。',
        h2: ['管理図'] },
      { slug: 'textbook-quality-inspection', title: '品質検査の方式', order: 315, tag: 'quality',
        desc: '1級土木施工管理技士テキスト — 品質検査の方式の解説。全数検査と抜取検査の使い分け・検査手順を解説。',
        h2: ['品質検査'] },
    ]
  },
  {
    source: 'textbook-related-laws-01',
    pages: [
      { slug: 'textbook-law-compliance', title: '建設工事における法令遵守', order: 401, tag: 'law',
        desc: '1級土木施工管理技士テキスト — 建設工事における法令遵守の解説。施工管理で必要な法令の体系と遵守事項を解説。',
        h2: ['建設工事'] },
      { slug: 'textbook-labor-standards', title: '労働基準法', order: 405, tag: 'law',
        desc: '1級土木施工管理技士テキスト — 労働基準法の解説。労働契約・労働時間・年少者・女性の保護規定を解説。',
        h2: ['労働基準法'] },
      { slug: 'textbook-construction-business', title: '建設業法', order: 410, tag: 'law',
        desc: '1級土木施工管理技士テキスト — 建設業法の解説。許可制度・技術者配置・一括下請負の禁止を解説。',
        h2: ['建設業法'] },
      { slug: 'textbook-standard-contract', title: '公共工事標準請負契約約款', order: 415, tag: 'law',
        desc: '1級土木施工管理技士テキスト — 公共工事標準請負契約約款の解説。契約条項・変更手続・瑕疵担保を解説。',
        h2: ['公共工事標準請負契約約款'] },
    ]
  },
  {
    source: 'textbook-related-laws-02',
    pages: [
      { slug: 'textbook-road-act', title: '道路法', order: 420, tag: 'law',
        desc: '1級土木施工管理技士テキスト — 道路法の解説。道路占用許可・車両制限令・道路使用許可の手続を解説。',
        h2: ['道路法'] },
      { slug: 'textbook-river-act', title: '河川法', order: 425, tag: 'law',
        desc: '1級土木施工管理技士テキスト — 河川法の解説。河川区域の分類・河川占用許可・河川保全区域の規制を解説。',
        h2: ['河川法'] },
      { slug: 'textbook-building-standards', title: '建築基準法', order: 430, tag: 'law',
        desc: '1級土木施工管理技士テキスト — 建築基準法の解説。建築確認・仮設建築物・工作物の確認申請を解説。',
        h2: ['建築基準法'] },
      { slug: 'textbook-explosives-act', title: '火薬類取締法', order: 435, tag: 'law',
        desc: '1級土木施工管理技士テキスト — 火薬類取締法の解説。火薬類の貯蔵・運搬・消費の規制と手続を解説。',
        h2: ['火薬類取締法'] },
      { slug: 'textbook-port-regulations', title: '港則法', order: 440, tag: 'law',
        desc: '1級土木施工管理技士テキスト — 港則法の解説。特定港の入出港届・工事許可・危険物荷役の規制を解説。',
        h2: ['港則法'] },
    ]
  },
];

// In-place frontmatter updates (files that don't get split)
const IN_PLACE = [
  { slug: 'textbook-demolition', title: '解体工事', order: 171, tag: 'demolition',
    desc: '1級土木施工管理技士テキスト — 解体工事の解説。解体工法の種類・施工要領・安全確認事項を解説。' },
  { slug: 'textbook-construction-mgmt-overview', title: '施工管理の概要', order: 201, tag: 'construction-plan',
    desc: '1級土木施工管理技士テキスト — 施工管理の概要。施工管理の位置づけ・PDCAサイクル・三大管理の相互関係を解説。' },
];

// ── Section extraction ─────────────────────────────────────────

function parseSections(raw) {
  // Normalize to LF for processing
  const text = raw.replace(/\r\n/g, '\n');

  // Split frontmatter from body
  const fmEnd = text.indexOf('\n---\n', text.indexOf('---\n') + 4);
  const body = text.slice(fmEnd + 5); // after closing ---\n

  // Split body into H2 sections
  const lines = body.split('\n');
  const sections = [];
  let currentHeading = null;
  let currentLines = [];
  let preamble = []; // lines before first H2 (H1 etc)

  for (const line of lines) {
    if (/^## /.test(line)) {
      if (currentHeading !== null) {
        sections.push({ heading: currentHeading, lines: currentLines });
      }
      currentHeading = line.replace(/^## /, '').trim();
      currentLines = [line];
    } else if (currentHeading === null) {
      preamble.push(line);
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeading !== null) {
    sections.push({ heading: currentHeading, lines: currentLines });
  }

  return { preamble, sections };
}

function matchesH2(heading, patterns) {
  if (patterns.length === 1 && patterns[0] === '*') return true;
  return patterns.some(p => heading.startsWith(p));
}

function trimTrailingContent(lines) {
  // Remove trailing "関連コンテンツ" block and separator ---
  let end = lines.length;
  // Walk backwards, skip blank lines
  while (end > 0 && lines[end - 1].trim() === '') end--;
  // Check for "関連コンテンツ" link list
  while (end > 0 && /^- \[/.test(lines[end - 1].trim())) end--;
  // Check for **関連コンテンツ** or **関連 header
  if (end > 0 && /^\*\*関連/.test(lines[end - 1].trim())) end--;
  // Skip blank lines again
  while (end > 0 && lines[end - 1].trim() === '') end--;
  // Check for separator ---
  if (end > 0 && lines[end - 1].trim() === '---') end--;
  // Final blank lines
  while (end > 0 && lines[end - 1].trim() === '') end--;
  return lines.slice(0, end);
}

function buildFrontmatter(page) {
  return [
    '---',
    `title: "${page.title}"`,
    `description: >-`,
    `  ${page.desc}`,
    `category: civil-construction-1`,
    `group: textbook`,
    `tags:`,
    `  - textbook`,
    `  - ${page.tag}`,
    `textbook_order: ${page.order}`,
    `published: true`,
    `seoTitle: "${page.title} | doboku-note"`,
    '---',
  ].join('\n');
}

// ── Main processing ────────────────────────────────────────────

let created = 0;
let deleted = 0;
let updated = 0;
const errors = [];

// Process splits
for (const split of SPLITS) {
  const srcPath = join(BASE, split.source, 'article.mdx');
  console.log(`\n── ${split.source} ──`);

  if (!existsSync(srcPath)) {
    errors.push(`Source not found: ${srcPath}`);
    console.log(`  ERROR: source not found`);
    continue;
  }

  const { raw, eol } = readMdxFile(srcPath);
  const { sections } = parseSections(raw);
  console.log(`  H2 sections found: ${sections.map(s => s.heading).join(', ')}`);

  for (const page of split.pages) {
    const matched = sections.filter(s => matchesH2(s.heading, page.h2));
    if (matched.length === 0) {
      errors.push(`No H2 match for ${page.slug} in ${split.source} (patterns: ${page.h2.join(', ')})`);
      console.log(`  ERROR: no H2 match for ${page.slug}`);
      continue;
    }

    // Assemble content: sections joined, trailing content stripped
    let bodyLines = [];
    for (let i = 0; i < matched.length; i++) {
      if (i > 0) bodyLines.push(''); // blank line between merged sections
      bodyLines.push(...matched[i].lines);
    }
    bodyLines = trimTrailingContent(bodyLines);

    const content = [
      buildFrontmatter(page),
      '',
      `# ${page.title}`,
      '',
      ...bodyLines,
      '', // trailing newline
    ].join('\n');

    const outDir = join(BASE, page.slug);
    const outPath = join(outDir, 'article.mdx');

    if (dryRun) {
      console.log(`  → ${page.slug} (${matched.length} H2, ~${bodyLines.length}L) [DRY RUN]`);
    } else {
      mkdirSync(outDir, { recursive: true });
      writeMdxFile(outPath, content, eol);
      console.log(`  → ${page.slug} (${matched.length} H2, ~${bodyLines.length}L) ✓`);
    }
    created++;
  }

  // Delete old article.mdx (keep img/ directory if present)
  if (!dryRun) {
    unlinkSync(srcPath);
    console.log(`  ✗ deleted ${split.source}/article.mdx`);
  } else {
    console.log(`  ✗ would delete ${split.source}/article.mdx [DRY RUN]`);
  }
  deleted++;
}

// Process in-place updates
for (const page of IN_PLACE) {
  const filePath = join(BASE, page.slug, 'article.mdx');
  console.log(`\n── ${page.slug} (in-place) ──`);

  if (!existsSync(filePath)) {
    errors.push(`File not found for in-place update: ${filePath}`);
    continue;
  }

  const { raw, eol } = readMdxFile(filePath);
  const { sections } = parseSections(raw);

  // Rebuild with new frontmatter + H1 + all sections
  let bodyLines = [];
  for (let i = 0; i < sections.length; i++) {
    if (i > 0) bodyLines.push('');
    bodyLines.push(...sections[i].lines);
  }
  bodyLines = trimTrailingContent(bodyLines);

  const content = [
    buildFrontmatter(page),
    '',
    `# ${page.title}`,
    '',
    ...bodyLines,
    '',
  ].join('\n');

  if (dryRun) {
    console.log(`  Updated frontmatter (order=${page.order}) [DRY RUN]`);
  } else {
    writeMdxFile(filePath, content, eol);
    console.log(`  Updated frontmatter (order=${page.order}) ✓`);
  }
  updated++;
}

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Created: ${created} files`);
console.log(`Deleted: ${deleted} source files`);
console.log(`Updated: ${updated} in-place`);
if (errors.length > 0) {
  console.log(`\nERRORS (${errors.length}):`);
  errors.forEach(e => console.log(`  - ${e}`));
  process.exit(1);
}
console.log(dryRun ? '\n[DRY RUN — no files changed]' : '\nDone!');
