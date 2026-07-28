import type { DocMeta } from '@/lib/docs';
import type { MagazineId } from '@/lib/note-magazines';
import type { CareerArticleEndCard } from '@/config/affiliate-creatives';
import MagazineHeroCta from '@/components/ui/MagazineHeroCta/MagazineHeroCta';
import RelatedArticleCard from '@/components/ui/RelatedArticles/RelatedArticleCard';
import CareerAffiliate from '@/components/ui/CareerAffiliate/CareerAffiliate';

/**
 * MidArticleCta — 記事本文の h2 境界に挿入する文脈連動 CTA。
 * rehype-mid-cta が置いた <midslot> を page.tsx の components マップで解決する。
 *
 * 3 モード（page.tsx 側で枠ごとに決定・props で渡す）:
 *  - note モード: MagazineHeroCta（画像中心のヒーローバナー）。文言・リンク・キャラは
 *    note-magazines.ts から id で解決するため、ここは id と utmContent（-mid 済み）だけ渡す。
 *  - career モード: 転職アフィリの**ネイティブカード**（PR バッジ＋見出し＋説明＋points＋CTA）。
 *    href のみ＝計測ピクセルはサイドバー 1 発火のまま（1 ページ 1 ピクセル）。
 *    2026-07-28 に 1 行テキストリンクから格上げ（訴求カードは記事末ではなく本文中が正しい配置）。
 *  - related モード: RelatedArticleCard（OGP サムネ）1 枚に「この続きに読みたい」見出し。
 */
type MidArticleCtaProps =
  | {
      readonly mode: 'note';
      readonly id: MagazineId;
      /** UTM 識別子（= GA4 の data-cta-label）。呼び出し側で -mid を付けて渡す。 */
      readonly utmContent: string;
    }
  | {
      readonly mode: 'career';
      /** resolveCareerArticleEndCard / resolvePeConsultingArticleEndCard の解決済みカード。 */
      readonly card: CareerArticleEndCard;
    }
  | {
      readonly mode: 'related';
      readonly doc: DocMeta;
    };

export default function MidArticleCta(props: MidArticleCtaProps) {
  if (props.mode === 'note') {
    return <MagazineHeroCta id={props.id} utmContent={props.utmContent} />;
  }
  if (props.mode === 'career') {
    // CareerAffiliate 自身が not-prose / my-6 / PR バッジ / rel="nofollow sponsored" を持つ。
    return <CareerAffiliate {...props.card} placement="article-mid" />;
  }
  return (
    <div className="not-prose my-8 max-w-2xl">
      <div className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">この続きに読みたい</div>
      <RelatedArticleCard doc={props.doc} />
    </div>
  );
}
