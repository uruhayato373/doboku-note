import Image from "next/image";

interface MagazineSidebarCardProps {
  readonly url: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly price?: string;
  readonly badge: string;
}

export default function MagazineSidebarCard({
  url,
  title,
  description,
  imageUrl,
  price,
  badge,
}: MagazineSidebarCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="not-prose group block rounded-card-content overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-card-content hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow"
    >
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          unoptimized
          sizes="300px"
        />
        <div
          className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-medium text-white rounded-sm shadow-sm"
          style={{ background: "var(--color-brand)" }}
        >
          {badge}
        </div>
      </div>
      <div className="p-3">
        <div className="text-[13px] font-bold text-ink-strong dark:text-gray-100 leading-tight group-hover:text-brand-deep dark:group-hover:text-brand transition-colors line-clamp-2">
          {title}
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-ink-body dark:text-gray-400 line-clamp-3">
          {description}
        </p>
        {price && (
          <div className="mt-2 text-[13px] font-bold text-brand-deep dark:text-brand">
            {price}
          </div>
        )}
      </div>
    </a>
  );
}
