#!/usr/bin/env node
/**
 * theme-to-questions.json を消費し、過去問 MDX にテーマ別解説への動線 Callout を挿入する。
 *
 * 動作モード（過去問の section により分岐）:
 *   - primary（一次択一）: 設問見出し `## Ⅰ-1-N` の直下に Callout を挿入
 *     - 同一設問に複数テーマが該当する場合は1つの Callout に箇条書きでまとめる
 *   - secondary（二次記述）: 記事冒頭（frontmatter 直後・最初の H2 直前）に
 *     「本年度の設問群が該当するテーマ別解説」を一括 Callout として挿入
 *
 * Usage:
 *   node .claude/scripts/inject-theme-backlinks.mjs --dry-run
 *   node .claude/scripts/inject-theme-backlinks.mjs --apply
 *   node .claude/scripts/inject-theme-backlinks.mjs --year r07 --section secondary --dry-run
 *
 * Flags:
 *   --dry-run        差分プレビューのみ、書き込みしない（既定: false）
 *   --apply          ファイル書き込みを実行
 *   --year <year>    特定年度のみ対象（r07 / r06 / ... / h21）
 *   --section <s>    primary or secondary のみ対象
 *   --force          既存 Callout があっても上書き（既定: スキップ）
 *
 * MDX I/O は #lib/mdx-io を使用し CRLF を保持（pre-commit フック対応）。
 *
 * 真実源: .claude/config/theme-to-questions.json（人手編集）
 * 出力先: .local/r2/posts/pe-comprehensive-management/{year}-{section}/article.mdx
 */
import fs from 'node:fs';
import path from 'node:path';
import { readMdxFile, writeMdxFile } from '#lib/mdx-io.mjs';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, '.claude/config/theme-to-questions.json');
const POSTS_DIR = path.join(ROOT, '.local/r2/posts/pe-comprehensive-management');

const CALLOUT_TITLE = '本問のテーマ別解説';
const CALLOUT_TITLE_SECONDARY = '本年度の設問が該当するテーマ別解説';
const MARKER = '<!-- theme-backlinks:auto -->';

function parseArgs(argv) {
  const args = { dryRun: false, apply: false, year: null, section: null, force: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--apply') args.apply = true;
    else if (a === '--force') args.force = true;
    else if (a === '--year' && argv[i + 1]) args.year = argv[++i];
    else if (a === '--section' && argv[i + 1]) args.section = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log(fs.readFileSync(import.meta.url.replace('file://', ''), 'utf-8').match(/\/\*\*[\s\S]*?\*\//)[0]);
      process.exit(0);
    }
  }
  return args;
}

/**
 * theme-to-questions.json を「{year}-{section}」キーに reshape
 * 戻り値: Map<"r07-secondary", Map<q_number, [{themeSlug, themeLabel, note}]>>
 */
function reshapeByYearSection(themesConfig) {
  const byPaper = new Map(); // key: "r07-secondary"
  for (const [themeSlug, themeData] of Object.entries(themesConfig.themes)) {
    const themeLabel = themeData.label;
    for (const q of themeData.questions || []) {
      const paperKey = `${q.year}-${q.section}`;
      if (!byPaper.has(paperKey)) byPaper.set(paperKey, new Map());
      const qMap = byPaper.get(paperKey);
      if (!qMap.has(q.q_number)) qMap.set(q.q_number, []);
      qMap.get(q.q_number).push({ themeSlug, themeLabel, note: q.note || '' });
    }
  }
  return byPaper;
}

/** primary 用: 設問見出し直下に挿入する Callout を組み立てる */
function buildPrimaryCallout(themes) {
  const items = themes.map(
    t => `  - [${t.themeLabel}](/docs/pe-comprehensive-management-${t.themeSlug})${t.note ? ` — ${t.note}` : ''}`,
  );
  return [
    '',
    `<Callout type="tip" title="${CALLOUT_TITLE}"> ${MARKER}`,
    items.join('\n'),
    '</Callout>',
    '',
  ].join('\n');
}

/** secondary 用: 記事冒頭に挿入する集約 Callout を組み立てる */
function buildSecondaryCallout(qMap) {
  const lines = [`<Callout type="tip" title="${CALLOUT_TITLE_SECONDARY}"> ${MARKER}`];
  lines.push('本年度の設問は以下のテーマ別解説と関連しています。');
  lines.push('');
  // q_number でソート
  const sortedQ = [...qMap.entries()].sort(([a], [b]) => a.localeCompare(b, 'ja'));
  for (const [qNumber, themes] of sortedQ) {
    lines.push(`**${qNumber}**`);
    for (const t of themes) {
      lines.push(`- [${t.themeLabel}](/docs/pe-comprehensive-management-${t.themeSlug})${t.note ? ` — ${t.note}` : ''}`);
    }
    lines.push('');
  }
  lines.push('</Callout>');
  return lines.join('\n');
}

/** primary article.mdx に設問単位で挿入 */
function injectPrimary(raw, qMap, force) {
  let newRaw = raw;
  let inserted = 0;
  const sortedEntries = [...qMap.entries()];
  for (const [qNumber, themes] of sortedEntries) {
    // 見出し正規表現: `## Ⅰ-1-1`、`## Ⅱ-1-1` 等。前後の空白を考慮
    const escapedQ = qNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const headingRe = new RegExp(`^## ${escapedQ}\\s*$`, 'm');
    const m = newRaw.match(headingRe);
    if (!m || typeof m.index !== 'number') {
      console.log(`  [SKIP-NO-HEADING] ${qNumber}: 見出し未検出`);
      continue;
    }
    const headingEnd = m.index + m[0].length;

    // 既存 Callout の検出（マーカーで識別）
    const afterHeading = newRaw.slice(headingEnd, headingEnd + 1000);
    if (!force && afterHeading.includes(MARKER)) {
      console.log(`  [SKIP-EXISTING] ${qNumber}: 既に Callout あり`);
      continue;
    }

    const callout = buildPrimaryCallout(themes);
    newRaw = newRaw.slice(0, headingEnd) + callout + newRaw.slice(headingEnd);
    inserted++;
  }
  return { newRaw, inserted };
}

/** secondary article.mdx に記事冒頭で一括挿入 */
function injectSecondary(raw, qMap, force) {
  // frontmatter 終端 `---\n` 直後を探す
  const fmEnd = raw.indexOf('\n---\n', 4);
  if (fmEnd < 0) {
    console.log('  [SKIP-NO-FRONTMATTER] frontmatter 終端未検出');
    return { newRaw: raw, inserted: 0 };
  }
  const insertPos = fmEnd + '\n---\n'.length;

  // 既存 Callout の検出
  const afterFm = raw.slice(insertPos, insertPos + 1500);
  if (!force && afterFm.includes(MARKER)) {
    console.log('  [SKIP-EXISTING] 既に Callout あり');
    return { newRaw: raw, inserted: 0 };
  }

  const callout = buildSecondaryCallout(qMap);
  // 挿入: frontmatter 直後に空行 + Callout + 空行
  const newRaw = raw.slice(0, insertPos) + '\n' + callout + '\n\n' + raw.slice(insertPos);
  return { newRaw, inserted: 1 };
}

/** シンプルな差分プレビュー（変更行のみ） */
function diffPreview(before, after, label) {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  let head = 0;
  while (head < beforeLines.length && head < afterLines.length && beforeLines[head] === afterLines[head]) head++;
  let tail = 0;
  while (
    tail < beforeLines.length - head &&
    tail < afterLines.length - head &&
    beforeLines[beforeLines.length - 1 - tail] === afterLines[afterLines.length - 1 - tail]
  )
    tail++;
  const addedLines = afterLines.slice(head, afterLines.length - tail);
  console.log(`--- ${label}`);
  for (const l of addedLines.slice(0, 20)) console.log(`+ ${l}`);
  if (addedLines.length > 20) console.log(`+ ...(${addedLines.length - 20} 行省略)`);
  console.log('');
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.dryRun && !args.apply) {
    console.error('Usage: inject-theme-backlinks --dry-run | --apply [--year <y>] [--section <s>] [--force]');
    process.exit(1);
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`[FATAL] 設定ファイル未存在: ${CONFIG_PATH}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const byPaper = reshapeByYearSection(config);

  console.log(`[inject-theme-backlinks] ${args.dryRun ? 'DRY-RUN' : 'APPLY'} mode`);
  console.log(`[inject-theme-backlinks] 対象論文数: ${byPaper.size}`);
  console.log('');

  const stats = { papers: 0, insertedQuestions: 0, skippedExisting: 0, missingMdx: 0 };

  for (const [paperKey, qMap] of byPaper) {
    if (args.year && !paperKey.startsWith(`${args.year}-`)) continue;
    if (args.section && !paperKey.endsWith(`-${args.section}`)) continue;

    const filePath = path.join(POSTS_DIR, paperKey, 'article.mdx');
    if (!fs.existsSync(filePath)) {
      console.log(`[MISSING-MDX] ${paperKey}: ${filePath}`);
      stats.missingMdx++;
      continue;
    }

    console.log(`--- ${paperKey} ---`);
    const { raw, eol } = readMdxFile(filePath);

    const section = paperKey.split('-').pop(); // "primary" or "secondary"
    const result = section === 'primary' ? injectPrimary(raw, qMap, args.force) : injectSecondary(raw, qMap, args.force);

    if (result.inserted === 0) {
      console.log(`  [NO-CHANGE] ${paperKey}`);
      continue;
    }

    stats.papers++;
    stats.insertedQuestions += result.inserted;

    if (args.dryRun) {
      diffPreview(raw, result.newRaw, `${paperKey}/article.mdx`);
    } else {
      writeMdxFile(filePath, result.newRaw, eol);
      console.log(`  [APPLIED] ${paperKey}: ${result.inserted} 箇所挿入`);
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`  対象論文 (変更あり): ${stats.papers}`);
  console.log(`  挿入箇所 (primary は設問数, secondary は記事数): ${stats.insertedQuestions}`);
  console.log(`  MDX 未存在: ${stats.missingMdx}`);
  if (args.dryRun) console.log('  (DRY-RUN: no files written)');
}

main();
