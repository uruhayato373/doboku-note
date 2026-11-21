import MetaCard from '@/components/ui/MetaCard/MetaCard';
import ArticleThumbRow from '@/components/ui/ArticleThumbRow/ArticleThumbRow';
import LinkRow, { LinkRowList } from '@/components/ui/LinkRow/LinkRow';
import { getCardImage } from '@/lib/site-thumbnail';
import { DEFAULT_OG_IMAGE } from '@/lib/metadata';
import type { RailCard } from '@/lib/rail-continuation';

/** 右欄の小型一覧。ツールは各ツールページと同じ共通OGPを使う。plain は記事でない行き先（基準書の前後の章）の文字の一覧。 */
export default function RailArticleList({ card }: { card: RailCard }) {
  if (card.plain) return <MetaCard padding="compact" trackNav={card.label} title={card.title}>
    <LinkRowList>
      {card.links.map(link => <LinkRow key={link.href} href={link.href} title={link.title} />)}
    </LinkRowList>
  </MetaCard>;
  return <MetaCard padding="compact" trackNav={card.label} title={card.title}>
    <ul className="space-y-3">
      {card.links.map(link => <li key={link.href}>
        <ArticleThumbRow variant="rail" href={link.href} title={link.title} image={link.doc ? getCardImage(link.doc) : { src: DEFAULT_OG_IMAGE, band: null }} />
      </li>)}
    </ul>
  </MetaCard>;
}
