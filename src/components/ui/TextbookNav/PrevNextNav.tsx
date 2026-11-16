import Link from 'next/link';
import { getPublicDocPath } from '@/lib/content-routes';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import ContentThumbnail from '@/components/ui/ContentThumbnail';
import type { CardImage } from '@/lib/site-thumbnail';

interface NavItem {
  readonly slug: string;
  readonly title: string;
  /** 渡すとサムネイルつきのカードにする（リンクの data-thumb で写真と OGP を分けて計測）。無ければ文字だけ */
  readonly image?: CardImage | undefined;
}

interface PrevNextNavProps {
  readonly heading: string;
  readonly track: string;
  readonly prev: NavItem | null;
  readonly next: NavItem | null;
  readonly prevLabel: string;
  readonly nextLabel: string;
}

const CARD = 'block min-w-0 rounded-card-content border border-(--rule-soft) transition-colors hover:border-(--accent) dark:hover:border-(--accent)';

/** 順序のあるページ（教科書の章・過去問の年度・続きの記事）の前後ナビ。item.image があるとき左右 2 枚のサムネイルカード */
export default function PrevNextNav({ heading, track, prev, next, prevLabel, nextLabel }: PrevNextNavProps) {
  if (!prev && !next) return null;

  const card = (item: NavItem, label: string, align: 'left' | 'right') => {
    const { image } = item;
    const text = align === 'right' ? ' text-right' : '';
    if (!image) {
      return (
        <Link href={getPublicDocPath(item.slug)} className={`${CARD} p-4${text}`}>
          <div className="text-xs text-(--ink-muted) mb-1">{label}</div>
          <div className="text-sm font-semibold text-(--accent)">{item.title}</div>
        </Link>
      );
    }
    return (
      <Link href={getPublicDocPath(item.slug)} data-thumb={image.band ? 'photo' : 'ogp'} className={`${CARD} focus-ring not-prose overflow-hidden${text}`}>
        <div className="relative aspect-1200/630 w-full overflow-hidden bg-(--bg)">
          <ContentThumbnail src={image.src} band={image.band} sizes="(max-width: 640px) 100vw, 320px" />
        </div>
        <div className="px-4 py-3">
          <div className="text-xs text-(--ink-muted) mb-1">{label}</div>
          <div className="line-clamp-2 text-sm font-semibold text-(--accent)">{item.title}</div>
        </div>
      </Link>
    );
  };

  return (
    <MetaCard trackNav={track}>
      <h2 className="text-lg font-bold text-(--ink) mb-4">{heading}</h2>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {prev ? card(prev, `← ${prevLabel}`, 'left') : <div />}
        {next ? card(next, `${nextLabel} →`, 'right') : <div />}
      </div>
    </MetaCard>
  );
}
