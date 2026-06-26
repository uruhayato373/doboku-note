import { buildMagazineUrl, type NoteMagazine } from "@/lib/note-magazines";
import { type PlacementSlot } from "@/lib/magazine-placement";
import MagazineSidebarCard from "@/components/ui/MagazineSidebarCard";

interface SidebarMagazineListProps {
  /** 配置解決済みの note マガジン（公開判定は呼び出し側で getMagazine 済み前提）。 */
  readonly magazines: ReadonlyArray<{ slot: PlacementSlot; magazine: NoteMagazine }>;
  /** ラッパー div の className。既定は docs/カテゴリ両サイドバー共通の `mb-3 space-y-3`。 */
  readonly className?: string;
}

/**
 * SidebarMagazineList — note 有料マガジン CTA を「画像オンリー」で縦に並べる共通コンポーネント。
 * docs 記事末尾（ArticleFooter）・カテゴリ hub サイドバー / モバイル（category/[slug]/page.tsx）で
 * 共有し、体裁を 1 箇所に集約する（2026-06-26：docs はサイドバーから記事末尾へ集約。
 * サイドバー最上部は転職アフィリに譲る）。
 *
 * 文言・価格はバナー画像（sidebarImageUrl, 300×250）に焼き込む方針のため、ここではテキストを描画しない。
 * sidebarImageUrl を持たないマガジンは描画対象から除外する（テキスト併記版 MagazineSidebarPromoCard は
 * 2026-06-26 にこの画像オンリー方式へ統一して退役）。
 */
export default function SidebarMagazineList({
  magazines,
  className = "mb-3 space-y-3",
}: SidebarMagazineListProps) {
  const renderable = magazines.filter(({ magazine }) => magazine.sidebarImageUrl);
  if (renderable.length === 0) return null;
  return (
    <div className={className}>
      {renderable.map(({ slot, magazine }) => (
        // 各カードを 300px 上限でラップ。縦積み(space-y)では中央寄せ、記事末尾の
        // flex-wrap 横並びでは 1 枚 = 300px 幅のタイルとして折り返す（PC 横並び／モバイル縦積み）。
        <div key={slot.magazineId} className="w-full max-w-[300px] mx-auto">
          <MagazineSidebarCard
            href={buildMagazineUrl(magazine, slot.utmContent)}
            imageUrl={magazine.sidebarImageUrl!}
            alt={magazine.shortTitle ?? magazine.title}
            trackLabel={slot.utmContent}
          />
        </div>
      ))}
    </div>
  );
}
