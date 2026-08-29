import Link from "next/link";
import categoriesData from "@/config/categories.json";
import { buildKeywordHref } from "@/lib/keyword-href.mjs";
import { getPublicDocPath } from '@/lib/content-routes';
import Callout from "../Callout/Callout";

interface KeywordItem {
  label: string;
  slug?: string;
}

interface RelatedKeywordsProps {
  items: KeywordItem[];
}

const CATEGORY_SLUGS = categoriesData.map((c) => c.slug);

function buildHref(slug: string): string {
  return getPublicDocPath(buildKeywordHref(slug, CATEGORY_SLUGS).replace(/^\/docs\//, ''));
}

/**
 * RelatedKeywords — 関連キーワード誘導ボックス。
 *
 * 2026-04-24 から <Callout type="reference" title="関連キーワード"> のラッパーとして再実装
 * （コンポーネント統一）。左アクセント・円形 Link2 アイコン・slate トーンで参考文献誘導として
 * 視覚的に整理。旧実装のハードコード色とモバイル余白を廃止。
 *
 * API（items: { label, slug? }[]）は 666 MDX 呼び出しと完全互換。
 * slug → /docs URL の解決規則は src/lib/keyword-href.mjs（check-links チェッカーと共有）。
 * categories.json の全カテゴリ接頭辞を許可し、接頭辞なしの bare slug のみ
 * legacy 総監（pe-comprehensive-management-）を補完する。
 */
export default function RelatedKeywords({ items }: RelatedKeywordsProps) {
  if (!items || items.length === 0) return null;

  return (
    <Callout type="reference" title="関連キーワード">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          if (item.slug) {
            return (
              <span key={index} className="inline-flex items-center">
                <Link
                  href={buildHref(item.slug)}
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  {item.label}
                </Link>
                {!isLast && (
                  <span className="text-[var(--ink-muted)] ml-1">|</span>
                )}
              </span>
            );
          }
          return (
            <span key={index} className="inline-flex items-center">
              <span className="text-sm text-[var(--ink-muted)]">
                {item.label}
              </span>
              {!isLast && (
                <span className="text-[var(--ink-muted)] opacity-50 ml-1">|</span>
              )}
            </span>
          );
        })}
      </div>
    </Callout>
  );
}
