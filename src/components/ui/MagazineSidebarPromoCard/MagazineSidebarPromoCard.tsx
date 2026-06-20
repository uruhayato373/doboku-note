import Image from "next/image";

interface MagazineSidebarPromoCardProps {
  readonly url: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly badge: string;
  /** GA4 クリック計測ラベル（通常は utm_content）。AnalyticsProvider のデリゲートリスナーが拾う。 */
  readonly trackLabel?: string;
}

/**
 * MagazineSidebarPromoCard — カテゴリ hub 右サイドバー（PC・300px）用の縦型 magazine 訴求カード。
 *
 * 画像オンリーの MagazineSidebarCard（sidebarImageUrl 300×250 必須・全 41 本中 9 本のみ）と違い、
 * 通常の imageUrl + タイトル + 説明 + バッジで描画するため全マガジンで使える。
 * 本文用の横長 MagazineInlineCard（sm:flex-row で 240px 画像）は 300px 幅に収まらないため、
 * その縦版として用意する。
 */
export default function MagazineSidebarPromoCard({
  url,
  title,
  description,
  imageUrl,
  badge,
  trackLabel,
}: MagazineSidebarPromoCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-cta="note"
      data-cta-label={trackLabel}
      className="not-prose group block rounded-card-content overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-card-content hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow"
    >
      <div className="relative w-full aspect-[16/9] bg-gray-100 dark:bg-gray-800">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          unoptimized
          sizes="300px"
        />
        <div
          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] font-medium text-white rounded-sm shadow-sm"
          style={{ background: "var(--color-brand)" }}
        >
          {badge}
        </div>
      </div>
      <div className="p-3">
        <div className="text-[13px] font-bold text-ink-strong dark:text-gray-100 leading-tight group-hover:text-brand-deep dark:group-hover:text-brand transition-colors line-clamp-2">
          {title}
        </div>
        <p className="mt-1 text-[12px] leading-snug text-ink-body dark:text-gray-400 line-clamp-2">
          {description}
        </p>
      </div>
    </a>
  );
}
