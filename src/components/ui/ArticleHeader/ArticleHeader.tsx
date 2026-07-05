/**
 * 記事冒頭ヘッダー（docs/[...slug] のカード内）。
 *
 * これまで page.tsx に散っていた breadcrumb + H1 + byline を 1 コンポーネントに集約し、
 * frontmatter の description を 1 文リードとして H1 直下に出して
 * 「どの試験・どの分類・何を解決するか」をファーストビューで判断しやすくする。
 *
 * 注: category/group は breadcrumb、updated は byline(MetaRow) が担うため、
 * 重複するメタチップ行は置かない（リード文を主役にする）。
 */

import Link from 'next/link';
import { generateHeadingId } from '@/lib/toc';
import MetaRow from '@/components/ui/MetaRow/MetaRow';

interface ArticleHeaderProps {
  title: string;
  /** カテゴリ slug（breadcrumb のリンク先） */
  category?: string | null | undefined;
  /** カテゴリ表示名 */
  categoryLabel?: string | null | undefined;
  /** グループ表示名（過去問/ガイド 等） */
  groupLabel?: string | null | undefined;
  /** frontmatter description（1 文リード） */
  description?: string | null | undefined;
  publishedAt?: string | undefined;
  updatedAt?: string | undefined;
}

export default function ArticleHeader({
  title,
  category,
  categoryLabel,
  groupLabel,
  description,
  publishedAt,
  updatedAt,
}: ArticleHeaderProps) {
  return (
    <header>
      {category && categoryLabel && (
        <nav
          aria-label="breadcrumb"
          className="mb-6 font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-widest flex items-center gap-2"
        >
          <Link href={`/category/${category}`} className="hover:text-[var(--accent)] transition-colors">
            {categoryLabel}
          </Link>
          {groupLabel && (
            <>
              <span aria-hidden className="opacity-60">›</span>
              <span>{groupLabel}</span>
            </>
          )}
        </nav>
      )}

      <h1
        id={generateHeadingId(title)}
        className="font-sans font-bold text-[26px] sm:text-[28px] text-[var(--ink)] leading-[1.4] text-balance [word-break:auto-phrase] m-0"
        style={{ letterSpacing: '0.02em', fontFeatureSettings: '"palt" 1' }}
      >
        {title}
      </h1>

      {description && (
        <p className="mt-3 text-[15px] leading-[1.85] text-[var(--ink-body)]">
          {description}
        </p>
      )}

      <MetaRow variant="byline" publishedAt={publishedAt} updatedAt={updatedAt} />
    </header>
  );
}
