#!/usr/bin/env node
/**
 * 過去問 MDX → NotebookLM 投入用 MD への変換スクリプト
 *
 * 入力: `content/site/pe-comprehensive-management/{year}-primary/article.mdx`
 * 出力: `.tmp/exam-notebook/{year}-primary.md`
 *
 * 変換ポリシー（plan の MDX → MD 変換ポリシーに準拠）:
 *   - frontmatter: title / source_pdf のみ残す
 *   - `## Ⅰ-1-N` / `## Ⅱ-1-N` 見出し: 残す（設問境界）
 *   - 問題文・5 選択肢: 残す
 *   - `<details>/<summary>`: 残す（HTML、設問/解説の視覚境界）
 *   - `<RelatedKeywords items={[...]} />`: 削除（slug 羅列でノイズ）
 *   - `<ExamPoint summary="..." items={[...]} />`: plain markdown 化
 *   - `<Callout>` / `<Timeline>` / その他 JSX: 削除（防御、過去問にほぼ無し）
 *   - `quiz-figures:start/end` マーカー: 削除
 *
 * 検証:
 *   - U+FFFD (置換文字) を検出したら exit 1（年度名報告）
 *   - 改行コード LF 統一
 *
 * Usage:
 *   node .claude/scripts/build-exam-notebook.mjs --year r07
 *   node .claude/scripts/build-exam-notebook.mjs --years r03,r04,r05,r06,r07
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const POSTS_ROOT = join(ROOT, 'content/site/pe-comprehensive-management');
const OUT_DIR = join(ROOT, '.tmp/exam-notebook');

const VALID_YEARS = ['h21', 'h22', 'h23', 'h24', 'h25', 'h26', 'h27', 'h28', 'h29', 'h30', 'r01', 'r02', 'r03', 'r04', 'r05', 'r06', 'r07'];

function parseArgs(argv) {
  const args = { years: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--year') args.years.push(argv[++i]);
    else if (a === '--years') args.years.push(...argv[++i].split(',').map((s) => s.trim()).filter(Boolean));
    else if (a === '-h' || a === '--help') {
      console.log('Usage: build-exam-notebook.mjs --year r07 [--years r03,r04,...]');
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(1);
    }
  }
  if (args.years.length === 0) {
    console.error('Error: --year or --years is required');
    process.exit(1);
  }
  for (const y of args.years) {
    if (!VALID_YEARS.includes(y)) {
      console.error(`Error: invalid year "${y}". Valid: ${VALID_YEARS.join(', ')}`);
      process.exit(1);
    }
  }
  return args;
}

/**
 * JSX components を除去/プレーン化する変換。
 * MDX AST を使わず multi-line regex で十分（過去問 MDX の JSX 種別は限定的）。
 */
function transformBody(body) {
  let out = body;

  // 1. <RelatedKeywords items={[ ... ]} /> を削除（multi-line）
  //    開始 <RelatedKeywords から最初の "}> または "/>" まで
  out = out.replace(/<RelatedKeywords[\s\S]*?\/>/g, '');

  // 2. <ExamPoint summary="..." items={[ ... ]} /> を plain markdown 化
  //    最も複雑な変換: summary と items を抽出して再構築
  out = out.replace(
    /<ExamPoint\b([\s\S]*?)\/>/g,
    (_match, attrs) => {
      const summary = attrs.match(/summary="([^"]+)"/)?.[1] ?? '';
      const itemsRaw = attrs.match(/items=\{\s*\[([\s\S]*?)\]\s*\}/)?.[1] ?? '';
      const items = [];
      // items の各文字列を抽出（"..." or `...` のどちらも）
      const itemRe = /(?:"([^"]+)"|`([^`]+)`)/g;
      let m;
      while ((m = itemRe.exec(itemsRaw)) !== null) {
        items.push(m[1] ?? m[2]);
      }
      const lines = [];
      if (summary) lines.push(`**試験ポイント**: ${summary}`);
      items.forEach((it) => lines.push(`- ${it}`));
      return lines.length > 0 ? lines.join('\n') : '';
    },
  );

  // 3. <Callout type="..." title="...">本文</Callout> を本文のみに（防御）
  out = out.replace(
    /<Callout\b[^>]*>([\s\S]*?)<\/Callout>/g,
    (_match, inner) => inner.trim(),
  );

  // 4. その他の self-closing JSX（<Foo .../>）を削除（防御）
  //    HTML 標準タグ（details/summary/br/img/hr）はホワイトリスト
  const HTML_WHITELIST = /^(?:details|summary|br|img|hr|p|div|span|table|thead|tbody|tr|td|th|li|ul|ol)$/i;
  out = out.replace(/<([A-Za-z][A-Za-z0-9]*)\b[^>]*\/>/g, (match, tag) => {
    if (HTML_WHITELIST.test(tag)) return match;
    return '';
  });

  // 5. quiz-figures マーカーを削除
  out = out.replace(/\{\/\*\s*quiz-figures:(start|end)\s*\*\/\}/g, '');

  // 6. 連続空行を 2 行に圧縮
  out = out.replace(/\n{3,}/g, '\n\n');

  return out.trim() + '\n';
}

function transformYear(year) {
  const mdxPath = join(POSTS_ROOT, `${year}-primary`, 'article.mdx');
  if (!existsSync(mdxPath)) {
    console.error(`Error: ${mdxPath} not found`);
    return false;
  }

  const raw = readFileSync(mdxPath, 'utf8');
  const { data, content } = matter(raw);

  // frontmatter は title / source_pdf のみ残す（YAML として再構築）
  const frontmatterLines = ['---'];
  if (data.title) frontmatterLines.push(`title: ${JSON.stringify(data.title)}`);
  if (data.source_pdf) frontmatterLines.push(`source_pdf: ${JSON.stringify(data.source_pdf)}`);
  frontmatterLines.push(`year: ${year}`);
  frontmatterLines.push('---', '', '');

  const transformedBody = transformBody(content);
  const final = frontmatterLines.join('\n') + transformedBody;

  // U+FFFD 検出
  if (final.includes('�')) {
    console.error(`[build-exam-notebook] ❌ ${year}: U+FFFD (置換文字) を検出。MDX に文字化けあり`);
    return false;
  }

  // LF 統一
  const lfContent = final.replace(/\r\n/g, '\n');

  const outPath = join(OUT_DIR, `${year}-primary.md`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lfContent, 'utf8');

  // 統計
  const h2Count = (lfContent.match(/^##\s/gm) || []).length;
  const detailsCount = (lfContent.match(/<details>/g) || []).length;
  const jsxRemaining = (lfContent.match(/<(RelatedKeywords|ExamPoint|Callout|Timeline)\b/g) || []).length;
  const inBytes = Buffer.byteLength(raw, 'utf8');
  const outBytes = Buffer.byteLength(lfContent, 'utf8');

  console.log(`[build-exam-notebook] ✓ ${year} → ${outPath.replace(ROOT, '.')}`);
  console.log(`    in: ${inBytes} B / out: ${outBytes} B (${Math.round((outBytes / inBytes) * 100)}%)`);
  console.log(`    H2: ${h2Count} / <details>: ${detailsCount} / JSX 残: ${jsxRemaining}`);

  return jsxRemaining === 0;
}

function main() {
  const args = parseArgs(process.argv);
  let allOk = true;
  for (const year of args.years) {
    const ok = transformYear(year);
    if (!ok) allOk = false;
  }
  if (!allOk) {
    console.error('\n[build-exam-notebook] ❌ 1 件以上の年度で変換失敗');
    process.exit(1);
  }
  console.log(`\n[build-exam-notebook] ✓ 全 ${args.years.length} 年度の変換完了`);
}

main();
