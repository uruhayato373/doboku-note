import type { DocMeta } from '@/lib/docs';
import MagazineInlineCard from '@/components/ui/MagazineInlineCard/MagazineInlineCard';
import RelatedArticleCard from '@/components/ui/RelatedArticles/RelatedArticleCard';

/**
 * MidArticleCta — 長文記事の中間 h2 境界に 1 個だけ挿入する文脈連動 CTA。
 * rehype-mid-cta が置いた <midslot> を page.tsx の components マップで解決する。
 *
 * 2 モード（page.tsx 側で択一決定・props で渡す）:
 *  - note モード: MagazineInlineCard（横長・本文中用）。utmContent は -mid 済み。
 *  - related モード: RelatedArticleCard（OGP サムネ）1 枚に「この続きに読みたい」見出し。
 */
type MidArticleCtaProps =
  | {
      readonly mode: 'note';
      readonly url: string;
      readonly title: string;
      readonly description: string;
      readonly magazineId: string;
      readonly badge: string;
      readonly trackLabel: string;
    }
  | {
      readonly mode: 'related';
      readonly doc: DocMeta;
    };

export default function MidArticleCta(props: MidArticleCtaProps) {
  if (props.mode === 'note') {
    return (
      <MagazineInlineCard
        url={props.url}
        title={props.title}
        description={props.description}
        magazineId={props.magazineId}
        badge={props.badge}
        trackLabel={props.trackLabel}
      />
    );
  }
  return (
    <div className="not-prose my-8 max-w-2xl">
      <div className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">この続きに読みたい</div>
      <RelatedArticleCard doc={props.doc} />
    </div>
  );
}
