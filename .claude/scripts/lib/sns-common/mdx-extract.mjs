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

const POSTS_ROOT = '.local/r2/posts';

/**
 * @param {object} args
 * @param {string} [args.category] - 例: 'pe-comprehensive-management'
 * @param {string} [args.slug]     - 例: 'followership'
 * @param {string} [args.path]     - 直接パス指定（category/slug より優先）
 * @param {string} [args.root]     - posts ルート（既定: .local/r2/posts）
 */
export function extractMdx({ category, slug, path, root = POSTS_ROOT }) {
  const filePath = path ?? join(root, category, slug, 'article.mdx');
  const raw = readFileSync(filePath, 'utf-8');
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
 * 優先順:
 *   1) self-closing <ExamPoint items={[ "...", "..." ]} /> 形式（doboku-note 標準）
 *   2) 囲み <ExamPoint>...</ExamPoint> 形式
 *   3) 「## 試験ポイント」配下の箇条書きにフォールバック
 */
function extractExamPoints(content) {
  // 1) self-closing <ExamPoint items={[...]} />
  const selfClosing = content.match(/<ExamPoint\b[^>]*?items=\{\[([\s\S]*?)\]\}[^>]*?\/?>/);
  if (selfClosing) {
    const items = [...selfClosing[1].matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g)]
      .map(m => (m[1] ?? m[2] ?? '').replace(/\\(["'\\])/g, '$1'))
      .filter(Boolean);
    if (items.length > 0) return items;
  }

  // 2) 囲み <ExamPoint>...</ExamPoint>
  const epMatches = [...content.matchAll(/<ExamPoint[^>]*>([\s\S]*?)<\/ExamPoint>/g)];
  if (epMatches.length > 0) {
    return epMatches
      .flatMap(m => m[1].split('\n'))
      .map(l => l.replace(/^\s*[-*]\s+/, '').trim())
      .filter(Boolean);
  }

  // 3) ## 試験ポイント 見出し配下の箇条書き
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
