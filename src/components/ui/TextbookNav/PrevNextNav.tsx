import { getPublicDocPath } from '@/lib/content-routes';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import ArticleCard from '@/components/ui/ArticleCard/ArticleCard';
import LinkTile from '@/components/ui/LinkTile/LinkTile';
import type { CardImage } from '@/lib/site-thumbnail';

interface NavItem {
  /** 記事の slug（行き先は getPublicDocPath）。記事でない行き先（基準書の章・節）は href で渡す */
  readonly slug?: string;
  readonly href?: string;
  readonly title: string;
  /** 渡すと画像つきのカード（ArticleCard）にする。無ければ文字だけのタイル（LinkTile） */
  readonly image?: CardImage | undefined;
}

interface PairProps {
  readonly prev: NavItem | null | undefined;
  readonly next: NavItem | null | undefined;
  readonly prevLabel: string;
  readonly nextLabel: string;
  /** 各リンクへ付ける計測の属性（枠の trackNav が無い所） */
  readonly data?: Readonly<Record<`data-${string}`, string>>;
}

const hrefOf = (item: NavItem) => item.href ?? getPublicDocPath(item.slug ?? '');

/** 前後の 2 枚（左が前・右が次）。カードの形は ArticleCard（画像あり）と LinkTile（文字だけ）に任せ、ここは並べるだけ（2026-11-17 に手書きのカードを外した） */
export function PrevNextPair({ prev, next, prevLabel, nextLabel, data }: PairProps) {
  if (!prev && !next) return null;
  const card = (item: NavItem, label: string, align: 'left' | 'right') => item.image
    ? <ArticleCard href={hrefOf(item)} title={item.title} image={item.image} eyebrow={label} align={align} {...(data ? { data } : {})} />
    : <LinkTile href={hrefOf(item)} title={item.title} eyebrow={label} align={align} {...(data ? { data } : {})} />;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {prev ? card(prev, `← ${prevLabel}`, 'left') : <div />}
      {next ? card(next, `${nextLabel} →`, 'right') : <div />}
    </div>
  );
}

interface PrevNextNavProps extends Omit<PairProps, 'data'> {
  readonly heading: string;
  readonly track: string;
}

/** 順序のあるページ（教科書の章・過去問の年度・続きの記事・基準書の章）の前後ナビ。見出しつきの枠に PrevNextPair を置く */
export default function PrevNextNav({ heading, track, ...pair }: PrevNextNavProps) {
  if (!pair.prev && !pair.next) return null;
  return (
    <MetaCard trackNav={track} title={heading}>
      <PrevNextPair {...pair} />
    </MetaCard>
  );
}
