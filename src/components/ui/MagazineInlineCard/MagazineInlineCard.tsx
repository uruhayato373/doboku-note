import Image from "next/image";
import MagazineBadge from "@/components/ui/MagazineBadge/MagazineBadge";

interface MagazineInlineCardProps {
  readonly url: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly badge: string;
  /** GA4 クリック計測ラベル（通常は utm_content）。AnalyticsProvider のデリゲートリスナーが拾う。 */
  readonly trackLabel?: string;
}

/**
 * MagazineInlineCard — 記事本文中に置く magazine 訴求カード（横長レイアウト）。
 *
 * LinkCard と違い、OGP fetch を行わず props のみで完結する（OGP 取得に依存しないので
 * 外部 metadata API が無くても確実にレンダリングされる）。
 *
 * 使い分け:
 * - MagazineSidebarCard: 縦長、サイドバー用 (aspect-16/9 → タイトル → 説明 → 価格)
 * - MagazineInlineCard: 横長、本文中用 (画像左 + テキスト右)
 */
export default function MagazineInlineCard({
  url,
  title,
  description,
  imageUrl,
  badge,
  trackLabel,
}: MagazineInlineCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-cta="note"
      data-cta-label={trackLabel}
      className="not-prose group my-6 block max-w-2xl rounded-card-content overflow-hidden border border-[var(--rule-soft)] bg-[var(--paper)] shadow-card-content hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow"
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full sm:w-[240px] shrink-0 aspect-square bg-[var(--bg)]">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
            sizes="(max-width: 640px) 100vw, 240px"
          />
          <MagazineBadge>{badge}</MagazineBadge>
        </div>
        <div className="min-w-0 flex-1 p-3 sm:p-4">
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
