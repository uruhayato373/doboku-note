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
 * SidebarMagazineList — 右サイドバー（PC）の note 有料マガジン CTA を「画像オンリー」で縦に並べる
 * 共通コンポーネント。docs 記事サイドバー（ArticleSidebar）とカテゴリ hub サイドバー
 * （category/[slug]/page.tsx）の両方で使い、体裁を 1 箇所に集約する。
 *
 * 文言・価格はバナー画像（sidebarImageUrl, 300×250）に焼き込む方針のため、ここではテキストを描画しない。
 * sidebarImageUrl を持たないマガジンは描画対象から除外する（旧 MagazineSidebarPromoCard の
 * テキスト併記版は 2026-06-26 にこの画像オンリー方式へ統一して退役）。
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
        <MagazineSidebarCard
          key={slot.magazineId}
          href={buildMagazineUrl(magazine, slot.utmContent)}
          imageUrl={magazine.sidebarImageUrl!}
          alt={magazine.shortTitle ?? magazine.title}
          trackLabel={slot.utmContent}
        />
      ))}
    </div>
  );
}
