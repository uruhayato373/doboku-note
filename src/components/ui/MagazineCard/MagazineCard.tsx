import {
  getMagazine,
  buildMagazineUrl,
  type MagazineId,
} from "@/lib/note-magazines";
import MagazineInlineCard from "@/components/ui/MagazineInlineCard/MagazineInlineCard";

interface MagazineCardProps {
  /** note-magazines.ts に登録済みのマガジン ID */
  readonly id: MagazineId;
  /** UTM tracking 識別子（例: "management-tradeoffs-economy-safety"） */
  readonly utmContent: string;
}

/**
 * MagazineCard — MDX 本文中に置く note マガジン CTA（SoT 解決版）。
 *
 * `note-magazines.ts` SoT から url/title/description/imageUrl/badge を解決し、
 * `MagazineInlineCard` で描画する（price は UI 非表示方針のため渡さない）。MDX には
 * id と utmContent のみを書けばよい。
 *
 * 使い分け:
 * - `resolvePlacement` 経由の inline / sidebar card → 記事末尾・サイドバーに自動配置
 * - `<MagazineCard>` → MDX 本文中の任意位置（特定の段落直下など、文脈に紐付けて配置）
 *
 * 未公開 (`published: false`) または `noteUrl` 空の場合は null を返し、描画しない（防御）。
 */
export default function MagazineCard({ id, utmContent }: MagazineCardProps) {
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
