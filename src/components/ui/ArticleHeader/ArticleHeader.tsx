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

import Breadcrumb from '@/components/ui/Breadcrumb/Breadcrumb';
import { generateHeadingId } from '@/lib/toc';
import MetaRow from '@/components/ui/MetaRow/MetaRow';
import { getCategoryHubPath } from '@/lib/categories';
import { categoryBreadcrumbHead } from '@/lib/category-breadcrumb';

interface ArticleHeaderProps {
  title: string;
  /** カテゴリ slug（breadcrumb のリンク先） */
  category?: string | null | undefined;
  /** カテゴリ表示名 */
  categoryLabel?: string | null | undefined;
  /** グループ表示名（過去問/ガイド 等） */
  groupLabel?: string | null | undefined;
  /** 資格ページのその記事型の節（#sec-…）。資格ページに節のジャンプがある記事型だけ渡す */
  groupHref?: string | null | undefined;
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
  groupHref,
  description,
  publishedAt,
  updatedAt,
}: ArticleHeaderProps) {
  return (
    <header>
      {category && categoryLabel && (
        // ホーム › 資格試験 › 資格 › 記事型（先頭の段の規則は src/lib/category-breadcrumb.ts・構造化データと共用）
        <Breadcrumb
          className="mb-6"
          items={[
            ...categoryBreadcrumbHead(category),
            { label: categoryLabel, href: getCategoryHubPath(category) },
            ...(groupLabel ? [{ label: groupLabel, href: groupHref ?? undefined }] : []),
          ]}
        />
      )}

      <h1
        id={generateHeadingId(title)}
        className="font-sans font-bold text-[26px] sm:text-[28px] text-(--ink) leading-[1.4] text-balance [word-break:auto-phrase] m-0"
        style={{ letterSpacing: '0.02em', fontFeatureSettings: '"palt" 1' }}
      >
        {title}
      </h1>

      {description && (
        <p className="mt-3 text-[15px] leading-[1.85] text-(--ink-body)">
          {description}
        </p>
      )}

      <MetaRow variant="byline" publishedAt={publishedAt} updatedAt={updatedAt} />
    </header>
  );
}
