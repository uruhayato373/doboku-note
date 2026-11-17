import type { ReactNode } from 'react';
import Link from 'next/link';
import ContentThumbnail from '@/components/ui/ContentThumbnail';
import { RankMarker } from '@/components/ui/LinkRow/LinkRow';
import type { CardImage } from '@/lib/site-thumbnail';

type Variant = 'card' | 'rail' | 'feed';

interface ArticleThumbRowProps {
  readonly href: string;
  readonly title: string;
  /** タイトルの下に添える補足（出典・ヒント・抜粋） */
  readonly caption?: ReactNode;
  /** 無ければサムネイルを出さない（検索結果の記事でないページ・トップの新着の画像の無い記事） */
  readonly image?: CardImage | undefined;
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
  /** feed だけ: 題名の上の小さな行（資格名・記事の種類） */
  readonly eyebrow?: ReactNode | undefined;
  /** feed だけ: 抜粋の下の行（バッジ・日付・タグ） */
  readonly meta?: ReactNode | undefined;
  /** feed だけ: 区切り線の一覧の行ではなく、1 件ずつ枠で囲んだカード（トップの新着・検索結果）。li は呼び出し側 */
  readonly framed?: boolean;
  /** feed だけ: サムネイルの幅の型（compact: 124/168px・wide: 128/188/204px） */
  readonly thumb?: 'compact' | 'wide';
  /** 計測の属性（data-cta-label 以外）。そのままリンクへ付ける */
  readonly data?: Readonly<Record<`data-${string}`, string>>;
}

/**
 * 小型サムネイルつきの 1 行リンク（左に OGP 比のサムネイル・右にタイトル）。リンクの data-thumb で写真と OGP の表示・クリックを分けて計測する。
 * サムネイルの縦横比は self-start で保つ（親 flex の align-items:stretch がサムネを文字の列の高さに引き伸ばす・2026-07-15）。
 */
export default function ArticleThumbRow({ href, title, caption, image, ctaLabel, variant = 'card', rank, eager = false, headingLevel: Heading = 'h3', eyebrow, meta, framed = false, thumb: thumbSize = 'compact', data }: ArticleThumbRowProps) {
  const label = { ...data, ...(image ? { 'data-thumb': image.band ? 'photo' : 'ogp' } : {}), ...(ctaLabel ? { 'data-cta-label': ctaLabel } : {}) };
  if (variant === 'feed') {
    const width = thumbSize === 'wide' ? 'w-[128px] sm:w-[188px] md:w-[204px]' : 'w-[124px] sm:w-[168px]';
    const row = (
        <Link href={href} {...label} className={framed
          ? 'focus-ring card-surface-section group flex gap-3 p-4 transition-[border-color,box-shadow] hover:border-(--accent) hover:shadow-card-hover sm:gap-4 sm:p-5'
          : 'focus-ring group flex gap-3 py-4 sm:gap-4'}>
          {image && <div className={`relative aspect-1200/630 ${width} shrink-0 self-start overflow-hidden border border-(--rule-soft) bg-(--bg)`}>
            <ContentThumbnail src={image.src} band={image.band} eager={eager} {...(thumbSize === 'wide' ? { sizes: '(max-width: 640px) 128px, (max-width: 768px) 188px, 204px' } : {})} />
          </div>}
          <div className="flex min-w-0 flex-1 gap-2.5">
            {rank != null && <RankMarker rank={rank} />}
            <div className="flex min-w-0 flex-col gap-1">
              {eyebrow && <p className="text-xs text-(--ink-muted)">{eyebrow}</p>}
              <Heading className="font-serif text-[15px] font-bold leading-snug text-(--ink) transition-colors group-hover:text-(--accent) sm:text-lg sm:leading-7">
                {title}
              </Heading>
              {caption && <p className="line-clamp-2 text-[13px] text-(--ink-muted) sm:text-sm">{caption}</p>}
              {meta}
            </div>
          </div>
        </Link>
    );
    return framed ? row : <li className="border-b border-(--rule-soft) last:border-b-0">{row}</li>;
  }
  const thumbnail = image && (
    <span className="block aspect-1200/630 w-24 shrink-0 self-start overflow-hidden rounded-card-inline bg-(--bg)">
      <ContentThumbnail src={image.src} band={image.band} sizes="96px" />
    </span>
  );
  if (variant === 'rail') {
    return (
      <Link href={href} {...label} className="focus-ring flex min-h-11 items-start gap-3 text-sm text-brand hover:underline">
        {thumbnail}
        <span className="line-clamp-2 min-w-0 font-semibold">{title}</span>
      </Link>
    );
  }
  return (
    <Link
      href={href}
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
