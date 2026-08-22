import Image from "next/image";
import MagazineBadge from "@/components/ui/MagazineBadge/MagazineBadge";
import { brandOf } from "@/lib/exam-brand";

interface MagazineInlineCardProps {
  readonly url: string;
  readonly title: string;
  readonly description: string;
  /** 資格別ブランド背景（cta-bg イラスト）の解決に使う magazine id。 */
  readonly magazineId: string;
  readonly badge: string;
  /** GA4 クリック計測ラベル（通常は utm_content）。AnalyticsProvider のデリゲートリスナーが拾う。 */
  readonly trackLabel?: string;
  /** GA4 の配置別集計。 */
  readonly placement?: string;
}

/**
 * MagazineInlineCard — 記事本文中に置く magazine 訴求カード（横長レイアウト）。
 *
 * 画像左（資格別ブランドイラスト＝cta-bg）＋ テキスト右。文言は props（SoT 解決済み）で完結し、
 * 焼き込みカバー画像（旧 imageUrl）には依存しない。イラスト無し資格はテーマ色ベタ塗りにフォールバック。
 *
 * 使い分け:
 * - MagazineHeroCta: 画像中心のヒーローバナー。単体で強く売る面（中間 CTA・MDX 本文中の既定）
 * - MagazineInlineCard: 横長。同一記事に何枚も並べる列挙用（`<MagazineCard variant="inline">`）
 * - HubCtaBanner: 記事末尾・サイドバー・カテゴリ hub の「もくじ」タイル（商品単体ではない）
 */
export default function MagazineInlineCard({
  url,
  title,
  description,
  magazineId,
  badge,
  trackLabel,
  placement = "article-body",
}: MagazineInlineCardProps) {
  const brand = brandOf(magazineId);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-cta="note"
      data-cta-label={`${magazineId}:${trackLabel ?? "unknown"}`}
      data-cta-placement={placement}
      className="card-surface-content focus-ring not-prose group my-6 block max-w-2xl overflow-hidden hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow"
    >
      <div className="flex min-h-[112px] flex-row">
        <div className="relative aspect-[6/5] w-24 shrink-0 self-center overflow-hidden bg-[var(--bg)] sm:w-[180px]">
          {brand.ctaBg ? (
            <Image
              src={brand.ctaBg}
              alt=""
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 96px, 180px"
            />
          ) : (
            <div className="absolute inset-0" style={{ background: `var(${brand.themeVar})` }} />
          )}
          <MagazineBadge>{badge}</MagazineBadge>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center p-3 sm:p-4">
          <div className="text-[14px] sm:text-[15px] font-bold text-ink-strong leading-tight group-hover:text-brand-deep dark:group-hover:text-brand transition-colors line-clamp-2">
            {title}
          </div>
          <p className="mt-1 text-[12px] sm:text-[13px] leading-snug text-ink-body line-clamp-2 sm:line-clamp-3">
            {description}
          </p>
        </div>
      </div>
    </a>
  );
}
