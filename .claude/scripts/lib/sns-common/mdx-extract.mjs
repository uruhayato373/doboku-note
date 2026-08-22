/**
 * MDX → SNS 投稿素材構造化データ。
 *
 * 入力: { category, slug } または { path }
 * 出力: { frontmatter, title, description, definition, sections, examPoints, relatedKeywords, ... }
 *
 * frontmatter は gray-matter で抽出、本文は単純な正規表現で H2/H3 セクションと
 * <ExamPoint>・<RelatedKeywords> ブロックを切り出す。MDX の AST 解析はしない（過剰）。
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const POSTS_ROOT = 'content/site';

/**
 * @param {object} args
 * @param {string} [args.category] - 例: 'pe-comprehensive-management'
 * @param {string} [args.slug]     - 例: 'followership'
 * @param {string} [args.path]     - 直接パス指定（category/slug より優先）
 * @param {string} [args.root]     - posts ルート（既定: content/site）
 */
export function extractMdx({ category, slug, path, root = POSTS_ROOT }) {
  const filePath = path ?? join(root, category, slug, 'article.mdx');
  // 改行は LF へ正規化してから解析する。以降の抽出は split('\n') や行頭・行末
  // アンカーの正規表現に依存しており、CRLF のままだと各行末に \r が残って
  // 見出し・リード文の抽出が静かに空振りする。Windows のチェックアウトだけ
  // 結果が変わり、Linux の CI は緑のままという割れ方をする（2026-08-04）。
  const raw = readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const { data: frontmatter, content } = matter(raw);

  return {
    path: filePath,
    frontmatter,
    title: frontmatter.title ?? null,
    description: frontmatter.description ?? null,
    seoTitle: frontmatter.seoTitle ?? null,
    category: frontmatter.category ?? null,
    section: frontmatter.section ?? null,
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    definition: extractDefinition(content),
    sections: extractSections(content),
    examPoints: extractExamPoints(content),
    relatedKeywords: extractRelatedKeywords(content),
    rawContent: content,
  };
}

/**
 * 「## 〜とは」セクションの最初の段落（リード文）を抽出。
 * 見つからなければ最初の H2 配下の最初の段落、それもなければ null。
 */
function extractDefinition(content) {
  const definitionHeading = content.match(/##\s+.+とは[^\n]*\n+([^\n#]+)/);
  if (definitionHeading) return definitionHeading[1].trim();

  const firstParagraph = content.match(/##\s+[^\n]+\n+([^\n#]+)/);
  return firstParagraph ? firstParagraph[1].trim() : null;
}

/**
 * H2 セクションを { heading, body, level } の配列で返す。
 * level は 2（H2）固定。H3 以下は body 内に保持。
 */
function extractSections(content) {
  const lines = content.split('\n');
  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      if (current) sections.push(current);
      current = { heading: m[1].trim(), body: '', level: 2 };
    } else if (current) {
      current.body += line + '\n';
    }
  }
  if (current) sections.push(current);
  return sections.map(s => ({ ...s, body: s.body.trim() }));
}

/**
 * <ExamPoint> ブロックの箇条書きを抽出。
 * 1) JSX 形式 `<ExamPoint items={["...", "..."]} />`（現行 MDX の主流）
 * 2) ブロック形式 `<ExamPoint>- ...</ExamPoint>`（レガシー）
 * 3) 「## 試験ポイント」配下の箇条書き（最終フォールバック）
 */
function extractExamPoints(content) {
  const jsxItems = [];
  for (const m of content.matchAll(/<ExamPoint\b[\s\S]*?items=\{\[([\s\S]*?)\]\}/g)) {
    const items = [...m[1].matchAll(/"([^"]*)"|'([^']*)'/g)].map(x => x[1] ?? x[2]);
    jsxItems.push(...items.map(s => s.trim()).filter(Boolean));
  }
  if (jsxItems.length > 0) return jsxItems;

  const epMatches = [...content.matchAll(/<ExamPoint[^>]*>([\s\S]*?)<\/ExamPoint>/g)];
  if (epMatches.length > 0) {
    return epMatches
      .flatMap(m => m[1].split('\n'))
      .map(l => l.replace(/^\s*[-*]\s+/, '').trim())
      .filter(Boolean);
  }

  const fallback = content.match(/##\s+試験ポイント\s*\n([\s\S]*?)(?:\n##|$)/);
  if (!fallback) return [];
  return fallback[1]
    .split('\n')
    .map(l => l.match(/^\s*[-*]\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean);
}

/**
 * <RelatedKeywords> ブロックから関連 slug を抽出。
 * 形式: <Keyword slug="..." /> または mdx component の slug 属性。
 */
function extractRelatedKeywords(content) {
  const m = content.match(/<RelatedKeywords[^>]*>([\s\S]*?)<\/RelatedKeywords>/);
  if (!m) return [];
  return [...m[1].matchAll(/slug=["']([^"']+)["']/g)].map(x => x[1]);
}
