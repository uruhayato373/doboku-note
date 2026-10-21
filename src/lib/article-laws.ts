/**
 * 記事が引く法令と条（「この記事の根拠法令」・DN-0731）。読み取りは src/lib/egov-links.mjs、法令名は
 * e-Gov 法令 API の写し config/egov-laws.json（台帳の zod は import しない）。
 */
import egovLaws from '../../config/egov-laws.json';
import { EGOV_LAW_BASE, articleLaws } from './egov-links.mjs';
import type { ArticleLaw } from '@/components/ui/ArticleLaws/ArticleLaws';

/**
 * 記事の本文（参考資料の節を含む全文）から、引いている法令と条を本文に出た順に返す。
 * 法令の解説を兼ねる記事（frontmatter の explainsLaw）は、本文がリンクしていなくても解説する法令を先頭に出す
 * （e-Gov の条文と、同じ法令を扱うほかの記事へつなぐ）。
 */
export function lawsOfArticle(content: string, explainsLaw?: string): ArticleLaw[] {
  const laws = egovLaws.laws as Record<string, { title: string }>;
  const found = articleLaws(content, laws);
  const explained = explainsLaw ? laws[explainsLaw] : undefined;
  if (!explainsLaw || !explained || found.some((law) => law.lawId === explainsLaw)) return found;
  return [{ lawId: explainsLaw, title: explained.title, url: `${EGOV_LAW_BASE}${explainsLaw}`, articles: [] }, ...found];
}
