import type { DocMeta } from '@/lib/docs';
import type { MagazineId } from '@/lib/note-magazines';
import type { CareerArticleEndCard } from '@/config/affiliate-creatives';
import type { ResolvedSecondary } from '@/lib/affiliate-placement';
import MagazineHeroCta from '@/components/ui/MagazineHeroCta/MagazineHeroCta';
import ArticleCard from '@/components/ui/ArticleCard/ArticleCard';
import { articleCardProps } from '@/lib/article-card';
import CareerAffiliate from '@/components/ui/CareerAffiliate/CareerAffiliate';
import { CTA_STACK_WIDTH } from '@/lib/cta-stack';

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
 *  - related モード: ArticleCard（OGP サムネ）1 枚に「この続きに読みたい」見出し。
 */
type MidArticleCtaProps =
  | {
      readonly mode: 'note';
      readonly scopeNotice?: string | undefined;
      readonly id: MagazineId;
      /** UTM 識別子（= GA4 の data-cta-label）。呼び出し側で -mid を付けて渡す。 */
      readonly utmContent: string;
    }
  | {
      readonly mode: 'career';
      readonly managedPixels?: boolean | undefined;
      /** 配置ルール（article-mid）で解決した案件の本文カード（src/lib/affiliate-placement.ts の card）。 */
      readonly card: CareerArticleEndCard;
      /** 2 枚並べの 2 枚目（配置ルールの pairs。無ければ 1 枚） */
      readonly secondary?: ResolvedSecondary | null | undefined;
    }
  | {
      readonly mode: 'related';
      readonly doc: DocMeta;
    };

export default function MidArticleCta(props: MidArticleCtaProps) {
  if (props.mode === 'note') {
    return <MagazineHeroCta id={props.id} utmContent={props.utmContent} placement="article-mid" scopeNotice={props.scopeNotice} />;
  }
  if (props.mode === 'career') {
    // CareerAffiliate 自身が not-prose / my-6 / PR バッジ / rel="nofollow sponsored" を持つ。
    // emphasis: 本文フローでは白背景だと本文カードに溶け込むため地色＋左ラインで視認性を上げる。
    return <CareerAffiliate {...props.card} placement="article-mid" emphasis secondary={props.secondary} managedPixels={props.managedPixels} />;
  }
  return (
    <div className={`not-prose my-8 ${CTA_STACK_WIDTH}`} data-cta="nav" data-cta-label="article-mid-related">
      <div className="mb-2 text-sm font-semibold text-(--ink-muted)">この続きに読みたい</div>
      <ArticleCard {...articleCardProps(props.doc)} />
    </div>
  );
}
