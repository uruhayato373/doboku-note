import type { ReactNode } from "react";
import SidebarAdBanner from "@/components/ui/SidebarAdBanner/SidebarAdBanner";
import type { ResolvedAlternate } from "@/lib/affiliate-placement";

/**
 * 出し分け（EXP-055・config/affiliate-placements.json の splits）がある面だけ、今の案件（primary）と代わりの案件（alternate）を
 * 両方描き、<html data-program-split>（src/lib/program-split-experiment.mjs）で片方だけ見せる。組が無ければ primary をそのまま返す。
 * ピクセルは primary だけが持つ（1 ページ 1 ピクセル）。alternate は href だけで、成果は A8 の案件別・クリックは GA4 のラベルで分かれる。
 */
export default function ProgramSplitBanner({
  primary,
  alternate,
  placement,
}: {
  readonly primary: ReactNode;
  readonly alternate?: ResolvedAlternate | undefined;
  readonly placement: string;
}) {
  if (!alternate) return <>{primary}</>;
  return (
    <>
      <div data-program-split-arm="primary">{primary}</div>
      <div data-program-split-arm="alternate">
        <SidebarAdBanner
          href={alternate.banner.href}
          imageSrc={alternate.banner.imageSrc}
          alt={alternate.banner.alt}
          width={alternate.banner.width}
          height={alternate.banner.height}
          trackLabel={alternate.trackLabel}
          placement={placement}
        />
      </div>
    </>
  );
}
