import type { MagazineId } from '@/lib/note-magazines';
import type { CareerArticleEndCard } from '@/config/affiliate-creatives';
import MagazineHeroCta from '@/components/ui/MagazineHeroCta/MagazineHeroCta';
import CareerAffiliate from '@/components/ui/CareerAffiliate/CareerAffiliate';

/**
 * MidArticleCta — 記事本文の h2 境界に挿入する文脈連動 CTA。
 * rehype-mid-cta が置いた <midslot> を page.tsx の components マップで解決する。
 *
 * 2 モード（page.tsx 側で枠ごとに決定・props で渡す）:
 *  - note モード: MagazineHeroCta（画像中心のヒーローバナー）。文言・リンク・キャラは
 *    note-magazines.ts から id で解決するため、ここは id と utmContent（-mid 済み）だけ渡す。
 *  - career モード: 転職アフィリの**ネイティブカード**（PR バッジ＋見出し＋説明＋points＋CTA）。
 *    href のみ＝計測ピクセルはサイドバー 1 発火のまま（1 ページ 1 ピクセル）。
 *    2026-07-28 に 1 行テキストリンクから格上げ（訴求カードは記事末ではなく本文中が正しい配置）。
 *  2026-11-26 に関連記事の「この続きに読みたい」（related モード）を外した（表示 365・クリック 2。記事末の関連記事に任せる・article-cta-plan.ts）。
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
    };

export default function MidArticleCta(props: MidArticleCtaProps) {
  if (props.mode === 'note') {
    return <MagazineHeroCta id={props.id} utmContent={props.utmContent} placement="article-mid" scopeNotice={props.scopeNotice} />;
  }
  // CareerAffiliate 自身が not-prose / my-6 / PR バッジ / rel="nofollow sponsored" を持つ。
  // emphasis: 本文フローでは白背景だと本文カードに溶け込むため地色＋左ラインで視認性を上げる。
  return <CareerAffiliate {...props.card} placement="article-mid" emphasis managedPixels={props.managedPixels} />;
}
