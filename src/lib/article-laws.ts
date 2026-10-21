/**
 * 記事が引く法令と条（「この記事の根拠法令」・DN-0731）。読み取りは src/lib/egov-links.mjs、法令名は
 * e-Gov 法令 API の写し config/egov-laws.json（台帳の zod は import しない）。
 */
import egovLaws from '../../config/egov-laws.json';
import { articleLaws } from './egov-links.mjs';
import type { ArticleLaw } from '@/components/ui/ArticleLaws/ArticleLaws';

/** 記事の本文（参考資料の節を含む全文）から、引いている法令と条を本文に出た順に返す */
export function lawsOfArticle(content: string): ArticleLaw[] {
  return articleLaws(content, egovLaws.laws as Record<string, { title: string }>);
}
