import Image from "next/image";

interface MagazineInlineCardProps {
  readonly url: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly price?: string;
  readonly badge: string;
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
  price,
  badge,
}: MagazineInlineCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="not-prose group my-6 block max-w-2xl rounded-card-content overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-card-content hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow"
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full sm:w-[240px] shrink-0 aspect-square bg-gray-100 dark:bg-gray-800">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
            sizes="(max-width: 640px) 100vw, 240px"
          />
          <div
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] font-medium text-white rounded-sm shadow-sm"
            style={{ background: "var(--color-brand)" }}
          >
            {badge}
          </div>
        </div>
        <div className="min-w-0 flex-1 p-3 sm:p-4">
          <div className="text-[14px] sm:text-[15px] font-bold text-ink-strong dark:text-gray-100 leading-tight group-hover:text-brand-deep dark:group-hover:text-brand transition-colors line-clamp-2">
            {title}
          </div>
          <p className="mt-1 text-[12px] sm:text-[13px] leading-snug text-ink-body dark:text-gray-400 line-clamp-2 sm:line-clamp-3">
            {description}
          </p>
          {price && (
            <div className="mt-2 text-[13px] font-bold text-brand-deep dark:text-brand">
              {price}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
