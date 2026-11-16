import type { ReactNode } from 'react';
import Link from 'next/link';
import ContentThumbnail from '@/components/ui/ContentThumbnail';
import type { CardImage } from '@/lib/site-thumbnail';

type Variant = 'card' | 'rail' | 'feed';

interface ArticleThumbRowProps {
  readonly href: string;
  readonly title: string;
  /** タイトルの下に添える補足（出典・ヒント・抜粋） */
  readonly caption?: ReactNode;
  readonly image: CardImage;
  /** リンク側の計測ラベル（面の data-cta-label より優先される） */
  readonly ctaLabel?: string;
  /**
   * 見た目の型（2026-11-16 にサムネイルの行の 3 実装をここへまとめた）。
   * card: 枠つき・96px（記事末の次のステップ・この記事のテーマ）。rail: 枠なし・96px（右の欄の回遊）。
   * feed: 区切り線の一覧の行・124/168px・明朝の題名と抜粋・順位（資格トップの一覧・よく読まれている記事）。一覧に混ぜるインフィード広告はこの型に合わせる。
   */
  readonly variant?: Variant;
  /** feed だけ: 順位の数字 */
  readonly rank?: number;
  /** feed だけ: 最初の画面の画像を先に読む */
  readonly eager?: boolean;
  /** feed だけ: 題名の見出しの段 */
  readonly headingLevel?: 'h3' | 'h4';
}

/**
 * 小型サムネイルつきの 1 行リンク（左に OGP 比のサムネイル・右にタイトル）。リンクの data-thumb で写真と OGP の表示・クリックを分けて計測する。
 * サムネイルの縦横比は self-start で保つ（親 flex の align-items:stretch がサムネを文字の列の高さに引き伸ばす・2026-07-15）。
 */
export default function ArticleThumbRow({ href, title, caption, image, ctaLabel, variant = 'card', rank, eager = false, headingLevel: Heading = 'h3' }: ArticleThumbRowProps) {
  const thumb = image.band ? 'photo' : 'ogp';
  const label = ctaLabel ? { 'data-cta-label': ctaLabel } : {};
  if (variant === 'feed') {
    return (
      <li className="border-b border-(--rule-soft) last:border-b-0">
        <Link href={href} data-thumb={thumb} {...label} className="focus-ring group flex gap-3 py-4 sm:gap-4">
          <div className="relative aspect-1200/630 w-[124px] shrink-0 self-start overflow-hidden border border-(--rule-soft) bg-(--bg) sm:w-[168px]">
            <ContentThumbnail src={image.src} band={image.band} eager={eager} />
          </div>
          <div className="flex min-w-0 flex-1 gap-2.5">
            {rank != null && (
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-card-inline bg-(--accent-fill) font-mono text-xs font-bold tabular-nums text-(--accent)">
                {rank}
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <Heading className="font-serif text-[15px] font-bold leading-snug text-(--ink) transition-colors group-hover:text-(--accent) sm:text-lg sm:leading-7">
                {title}
              </Heading>
              {caption && <p className="line-clamp-2 text-[13px] text-(--ink-muted) sm:text-sm">{caption}</p>}
            </div>
          </div>
        </Link>
      </li>
    );
  }
  const thumbnail = (
    <span className="block aspect-1200/630 w-24 shrink-0 self-start overflow-hidden rounded-card-inline bg-(--bg)">
      <ContentThumbnail src={image.src} band={image.band} sizes="96px" />
    </span>
  );
  if (variant === 'rail') {
    return (
      <Link href={href} data-thumb={thumb} {...label} className="focus-ring flex min-h-11 items-start gap-3 text-sm text-brand hover:underline">
        {thumbnail}
        <span className="line-clamp-2 min-w-0 font-semibold">{title}</span>
      </Link>
    );
  }
  return (
    <Link
      href={href}
      data-thumb={thumb}
      {...label}
      className="card-interactive card-surface-content focus-ring not-prose group flex min-h-11 items-start gap-3 p-2 hover:border-brand dark:hover:border-brand"
    >
      {thumbnail}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-semibold text-brand group-hover:underline">{title}</span>
        {caption && <span className="mt-0.5 line-clamp-2 block text-xs text-(--ink-muted)">{caption}</span>}
      </span>
    </Link>
  );
}
