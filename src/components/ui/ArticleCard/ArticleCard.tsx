import type { ReactNode } from 'react';
import Link from 'next/link';
import ContentThumbnail from '@/components/ui/ContentThumbnail';
import type { CardImage } from '@/lib/site-thumbnail';

interface ArticleCardProps {
  readonly href: string;
  readonly title: ReactNode;
  readonly image: CardImage;
  /** 題名の下の説明（2 行まで） */
  readonly description?: ReactNode | undefined;
  /** 題名の上の小さな行（「← 前の記事」・資格名など） */
  readonly eyebrow?: ReactNode | undefined;
  /** 文字の寄せ（前後の 2 枚の「次」は右） */
  readonly align?: 'left' | 'right';
  /** 計測の属性（data-cta-label など）。そのままリンクへ付ける */
  readonly data?: Readonly<Record<`data-${string}`, string>>;
}

/**
 * 上に画像・下に題名のカード（記事末の関連記事・本文中間の続き・前後の 2 枚・テーマの「はじめに読む」）。
 * 2026-11-17 に関連記事のカードと前後ナビの手書きのカードを 1 つにまとめた（枠・題名の色・ホバーをそろえる）。
 * 画像は写真サムネイル（帯つき）か OGP の縮小。below-fold なので loading="lazy"。リンクの data-thumb で写真と OGP のクリックを分けて計測する。
 * client の一覧（テーマのページ）からも使うので、台帳を読む処理は持たない（記事のメタから組むのは lib/article-card の articleCardProps）。
 */
export default function ArticleCard({ href, title, image, description, eyebrow, align = 'left', data }: ArticleCardProps) {
  return (
    <Link
      href={href}
      data-thumb={image.band ? 'photo' : 'ogp'}
      {...data}
      className={`card-interactive card-surface-content focus-ring not-prose group flex h-full flex-col overflow-hidden hover:border-brand dark:hover:border-brand${align === 'right' ? ' text-right' : ''}`}
    >
      <div className="relative aspect-1200/630 w-full overflow-hidden bg-(--bg)">
        <ContentThumbnail src={image.src} band={image.band} sizes="(max-width: 640px) 100vw, 320px" />
      </div>
      <div className="flex flex-1 flex-col px-4 py-3">
        {eyebrow && <div className="mb-1 text-xs text-(--ink-muted)">{eyebrow}</div>}
        <div className="line-clamp-2 text-sm font-semibold text-brand">{title}</div>
        {description && <div className="mt-1 line-clamp-2 text-xs text-(--ink-body)">{description}</div>}
      </div>
    </Link>
  );
}

