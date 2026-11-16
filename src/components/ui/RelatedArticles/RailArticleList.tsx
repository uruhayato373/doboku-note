import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import ContentThumbnail from '@/components/ui/ContentThumbnail';
import { getCardImage } from '@/lib/site-thumbnail';
import { DEFAULT_OG_IMAGE } from '@/lib/metadata';
import type { RailCard } from '@/lib/rail-continuation';

/** 右欄の小型一覧。ツールは各ツールページと同じ共通OGPを使う。plain は記事でない行き先（基準書の前後の章）の文字の一覧。 */
export default function RailArticleList({ card }: { card: RailCard }) {
  if (card.plain) return <MetaCard padding="compact" trackNav={card.label}>
    <h2 className="mb-1 text-lg font-bold text-(--ink)">{card.title}</h2>
    <ul className="divide-y divide-(--rule-soft)">
      {card.links.map(link => <li key={link.href}>
        <Link href={link.href} className="focus-ring flex min-h-11 items-center py-2 text-sm font-semibold text-brand hover:underline"><span className="line-clamp-2">{link.title}</span></Link>
      </li>)}
    </ul>
  </MetaCard>;
  return <MetaCard padding="compact" trackNav={card.label}>
    <h2 className="mb-3 text-lg font-bold text-(--ink)">{card.title}</h2>
    <ul className="space-y-3">
      {card.links.map(link => {
        const image = link.doc ? getCardImage(link.doc) : { src: DEFAULT_OG_IMAGE, band: null };
        return <li key={link.href}>
          <Link href={link.href} data-thumb={image.band ? 'photo' : 'ogp'} className="focus-ring flex min-h-11 items-start gap-3 text-sm text-brand hover:underline">
            <span className="aspect-1200/630 w-24 shrink-0 self-start overflow-hidden rounded-card-inline bg-(--bg)">
              <ContentThumbnail src={image.src} band={image.band} sizes="96px" />
            </span>
            <span className="line-clamp-2 min-w-0 font-semibold">{link.title}</span>
          </Link>
        </li>;
      })}
    </ul>
  </MetaCard>;
}
