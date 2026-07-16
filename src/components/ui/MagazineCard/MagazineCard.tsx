import {
  getMagazine,
  buildMagazineUrl,
  type MagazineId,
} from "@/lib/note-magazines";
import MagazineInlineCard from "@/components/ui/MagazineInlineCard/MagazineInlineCard";
import MagazineHeroCta from "@/components/ui/MagazineHeroCta/MagazineHeroCta";

interface MagazineCardProps {
  /** note-magazines.ts に登録済みのマガジン ID */
  readonly id: MagazineId;
  /** UTM tracking 識別子（例: "management-tradeoffs-economy-safety"） */
  readonly utmContent: string;
  /**
   * 見た目の型（既定 "hero"）。
   * - hero: 画像中心のヒーローバナー（キャッチコピー＋キャラ＋大ボタン）。単体で強く売る面。
   * - inline: 横長の小カード。同一記事に 3 枚以上を並べる列挙（ペルソナ一覧など）で、
   *   ヒーローが連続して読み流れを壊すのを避けたいときだけ明示する。
   */
  readonly variant?: "hero" | "inline";
}

/**
 * MagazineCard — MDX 本文中に置く note マガジン CTA（SoT 解決版）。
 *
 * MDX には id / utmContent / variant だけを書き、文言・URL・キャラは
 * `note-magazines.ts` が供給する（本文に価格・URL を直書きしない）。
 *
 * 使い分け:
 * - `resolvePlacement` 経由の中間 CTA → MidArticleCta が MagazineHeroCta を自動挿入
 * - `<MagazineCard>` → MDX 本文中の任意位置（特定の段落直下など、文脈に紐付けて配置）
 *
 * 未公開 (`published: false`) または `noteUrl` 空の場合は描画しない（防御）。
 */
export default function MagazineCard({
  id,
  utmContent,
  variant = "hero",
}: MagazineCardProps) {
  if (variant === "hero") {
    return <MagazineHeroCta id={id} utmContent={utmContent} />;
  }
  const magazine = getMagazine(id);
  if (!magazine) return null;
  return (
    <MagazineInlineCard
      url={buildMagazineUrl(magazine, utmContent)}
      title={magazine.title}
      description={magazine.description}
      magazineId={magazine.id}
      badge={magazine.badge}
      trackLabel={utmContent}
    />
  );
}
