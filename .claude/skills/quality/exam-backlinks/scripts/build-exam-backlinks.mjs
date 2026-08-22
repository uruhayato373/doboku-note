#!/usr/bin/env node
/**
 * 過去問 ⇔ キーワード 紐付けJSON生成スクリプト
 *
 * .claude/state/exam-keyword-map.json（単一正源）を読み、
 * 全過去問MDXを走査して設問の heading text を取得し、双方向 JSON を出力する。
 *
 * 紐付けデータの編集は exam-keyword-map.json を直接行う。
 * MDX の <RelatedKeywords> は表示用として残るが、このスクリプトは参照しない。
 *
 * 出力:
 *   - src/config/past-exam-backlinks.json: キーワードslug → 過去問設問リスト
 *   - src/config/exam-question-keywords.json: 過去問slug → 設問ID → キーワードslugリスト
 */
import fs from 'fs';
import path from 'path';
import { generateHeadingId } from '#lib/heading-id.mjs';

const ROOT = process.cwd();

const PE_POSTS = path.join(ROOT, 'content/site/pe-comprehensive-management');
const CIVIL_POSTS = path.join(ROOT, 'content/site/civil-construction-1');
const OUT_BACKLINKS = path.join(ROOT, 'src/config/past-exam-backlinks.json');
const OUT_QUESTION_KEYWORDS = path.join(ROOT, 'src/config/exam-question-keywords.json');
const EXAM_KEYWORD_MAP = path.join(ROOT, '.claude/state/exam-keyword-map.json');

// 過去問アンカーの heading ID 生成は #lib/heading-id.mjs に集約（examMode: true で章番号 Ⅰ-1-1 → 1-1 正規化）。

/** slug から年度ラベルを生成 */
function extractYearLabel(slug) {
  const match = slug.match(/(r|h)(\d+)-(primary|secondary|a|b)$/);
  if (!match) return '';
  const era = match[1] === 'r' ? '令和' : '平成';
  const num = parseInt(match[2]);
  return era === '令和' && num === 1 ? '令和元年度' : `${era}${num}年度`;
}

/** frontmatter を解析 */
function parseFrontmatter(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const fm = {};
  const lines = fmMatch[1].split('\n');
  for (const line of lines) {
    const m = line.match(/^([a-z_]+):\s*(.+)$/);
    if (m) {
      fm[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return fm;
}

/** ディレクトリから過去問MDXファイル一覧を取得 */
function findPastExamFiles() {
  const files = [];

  // PE: pe-comprehensive-management/r*-primary/article.mdx, h*-primary/article.mdx, r*-secondary/article.mdx
  if (fs.existsSync(PE_POSTS)) {
    const peDirs = fs.readdirSync(PE_POSTS, { withFileTypes: true });
    for (const dir of peDirs) {
      if (!dir.isDirectory()) continue;
      if (/^(r|h)\d+-(primary|secondary)$/.test(dir.name)) {
        const filepath = path.join(PE_POSTS, dir.name, 'article.mdx');
        if (fs.existsSync(filepath)) {
          files.push({
            filepath,
            slug: `pe-comprehensive-management-${dir.name}`,
            category: 'pe-comprehensive-management',
            categoryPrefix: 'pe-comprehensive-management-',
          });
        }
      }
    }
  }

  // Civil primary: civil-construction-1/primary/*.mdx
  const civilPrimaryDir = path.join(CIVIL_POSTS, 'primary');
  if (fs.existsSync(civilPrimaryDir)) {
    for (const fname of fs.readdirSync(civilPrimaryDir)) {
      if (!fname.endsWith('.mdx')) continue;
      const base = fname.replace(/\.mdx$/, '');
      if (!/^(r|h)\d+-(a|b)$/.test(base)) continue;
      files.push({
        filepath: path.join(civilPrimaryDir, fname),
        slug: `civil-construction-1-primary-${base}`,
        category: 'civil-construction-1',
        categoryPrefix: 'civil-construction-1-',
      });
    }
  }

  // Civil secondary: civil-construction-1/secondary/{year}.mdx
  const civilSecondaryDir = path.join(CIVIL_POSTS, 'secondary');
  if (fs.existsSync(civilSecondaryDir)) {
    for (const fname of fs.readdirSync(civilSecondaryDir)) {
      if (!fname.endsWith('.mdx')) continue;
      const base = fname.replace(/\.mdx$/, '');
      if (!/^(r|h)\d+$/.test(base)) continue;
      files.push({
        filepath: path.join(civilSecondaryDir, fname),
        slug: `civil-construction-1-secondary-${base}`,
        category: 'civil-construction-1',
        categoryPrefix: 'civil-construction-1-',
      });
    }
  }

  return files;
}

/** MDX内の設問見出しを anchor → heading text のマップで返す（slug 抽出は行わない） */
function extractQuestionHeadings(content) {
  const sections = content.split(/\n(?=## )/);
  const result = {};

  for (const section of sections) {
    const headingMatch = section.match(/^## (.+)$/m);
    if (!headingMatch) continue;

    const heading = headingMatch[1].trim();
    // 設問の見出しだけ対象（Ⅰ-1-1 / I-1-1 / Ⅱ-1-1 / II-1-1 / 問題 No.X / 第N問 など）
    if (!/^(Ⅰ|Ⅱ|Ⅲ|I{1,3}|問題|第)/.test(heading)) continue;

    const anchor = generateHeadingId(heading, { examMode: true });
    result[anchor] = heading;
  }

  return result;
}

function main() {
  if (!fs.existsSync(EXAM_KEYWORD_MAP)) {
    console.error(`Not found: ${EXAM_KEYWORD_MAP}`);
    console.error('先に bootstrap-exam-keyword-map.mjs を実行してください。');
    process.exit(1);
  }
  const keywordMap = JSON.parse(fs.readFileSync(EXAM_KEYWORD_MAP, 'utf8'));

  const files = findPastExamFiles();
  console.log(`Found ${files.length} past exam files`);

  const backlinks = {}; // keywordSlug (short) -> [{ examSlug, year, question, anchor }]
  const questionKeywords = {}; // examSlug -> { anchor -> { heading, slugs[] } }
  const stats = { questionsWithKeywords: 0, totalKeywordRefs: 0 };

  for (const file of files) {
    const content = fs.readFileSync(file.filepath, 'utf8');
    const headings = extractQuestionHeadings(content);

    // examDir: file.slug から category prefix を除いた部分（例: "r07-primary", "primary-r07-a"）
    const examDir = file.slug.slice(file.category.length + 1);
    const mapForExam = keywordMap[file.category]?.[examDir] ?? {};

    const perQuestion = {};
    for (const [anchor, heading] of Object.entries(headings)) {
      const slugs = mapForExam[anchor] ?? [];
      if (slugs.length > 0) {
        perQuestion[anchor] = { heading, slugs };
      }
    }

    if (Object.keys(perQuestion).length === 0) continue;

    questionKeywords[file.slug] = {};
    const yearLabel = extractYearLabel(file.slug);

    for (const [anchor, { heading, slugs }] of Object.entries(perQuestion)) {
      questionKeywords[file.slug][anchor] = { heading, slugs };
      stats.questionsWithKeywords++;
      stats.totalKeywordRefs += slugs.length;

      for (const slug of slugs) {
        if (!backlinks[slug]) backlinks[slug] = [];
        backlinks[slug].push({
          examSlug: file.slug,
          year: yearLabel,
          question: heading,
          anchor,
        });
      }
    }
  }

  // 各キーワードのバックリンクを year降順で並べる
  for (const slug of Object.keys(backlinks)) {
    backlinks[slug].sort((a, b) => {
      const cmp = b.examSlug.localeCompare(a.examSlug);
      if (cmp !== 0) return cmp;
      return a.question.localeCompare(b.question, 'ja');
    });
  }

  fs.mkdirSync(path.dirname(OUT_BACKLINKS), { recursive: true });
  fs.writeFileSync(OUT_BACKLINKS, JSON.stringify(backlinks, null, 2));
  fs.writeFileSync(OUT_QUESTION_KEYWORDS, JSON.stringify(questionKeywords, null, 2));

  const uniqueKeywords = Object.keys(backlinks).length;
  console.log(`✓ Wrote ${OUT_BACKLINKS}`);
  console.log(`✓ Wrote ${OUT_QUESTION_KEYWORDS}`);
  console.log(`  ${uniqueKeywords} unique keywords referenced`);
  console.log(`  ${stats.questionsWithKeywords} questions with keyword refs`);
  console.log(`  ${stats.totalKeywordRefs} total keyword references`);
}

main();
