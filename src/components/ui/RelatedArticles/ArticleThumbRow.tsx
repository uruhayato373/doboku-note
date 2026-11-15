import type { ReactNode } from 'react';
import Link from 'next/link';
import ContentThumbnail from '@/components/ui/ContentThumbnail';
import type { CardImage } from '@/lib/site-thumbnail';

interface ArticleThumbRowProps {
  readonly href: string;
  readonly title: string;
  /** タイトルの下に添える補足（出典・ヒント） */
  readonly caption?: ReactNode;
  readonly image: CardImage;
  /** リンク側の計測ラベル（面の data-cta-label より優先される） */
  readonly ctaLabel?: string;
}

/**
 * 小型サムネイルつきの 1 行リンク（左に OGP 比のサムネイル・右にタイトル）。右の欄の RailArticleList と同じ寸法。
 * 記事末の件数が少ない回遊（次のステップ・この記事のテーマ）が使う。リンクの data-thumb で写真と OGP の表示・クリックを分けて計測する。
 */
export default function ArticleThumbRow({ href, title, caption, image, ctaLabel }: ArticleThumbRowProps) {
  return (
    <Link
      href={href}
      data-thumb={image.band ? 'photo' : 'ogp'}
      {...(ctaLabel ? { 'data-cta-label': ctaLabel } : {})}
      className="card-interactive card-surface-content focus-ring not-prose group flex min-h-11 items-start gap-3 p-2 hover:border-brand dark:hover:border-brand"
    >
      <span className="block aspect-1200/630 w-24 shrink-0 self-start overflow-hidden rounded-card-inline bg-(--bg)">
        <ContentThumbnail src={image.src} band={image.band} sizes="96px" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-semibold text-brand group-hover:underline">{title}</span>
        {caption && <span className="mt-0.5 line-clamp-2 block text-xs text-(--ink-muted)">{caption}</span>}
      </span>
    </Link>
  );
}
