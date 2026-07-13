"use client";

import Image from "next/image";

interface LinkCardClientProps {
  readonly url: string;
  readonly title: string;
  readonly description?: string;
  readonly imageUrl?: string;
  readonly siteName?: string;
}

/**
 * LinkCard — OGP 画像を左に本来比のまま（クロップしない）、右にタイトル・説明・サイト名を並べる横型カード。
 * モバイル（< sm）では画像を上・テキストを下に積む。デスクトップでは画像とテキストを縦中央で揃える。
 */
export default function LinkCardClient({
  url,
  title,
  description,
  imageUrl,
  siteName,
}: LinkCardClientProps) {
  return (
    <span className="not-prose inline-block p-4">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="card-interactive focus-ring group block w-full max-w-2xl cursor-pointer overflow-hidden card-surface-content hover:shadow-card-hover"
      >
        <span className="flex flex-col sm:flex-row sm:items-center">
          {imageUrl && (
            <span className="relative block w-full overflow-hidden sm:w-1/2 sm:shrink-0">
              <Image
                src={imageUrl}
                alt={title}
                width={1200}
                height={630}
                className="block h-auto w-full transition-transform duration-300 group-hover:scale-105"
                unoptimized
                sizes="(max-width: 640px) 100vw, 320px"
              />
            </span>
          )}

          <span className="block min-w-0 flex-1 p-4">
            <span className="linkcard-title mb-2 line-clamp-2 text-base font-semibold text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">
              {title}
            </span>

            {description && (
              <span className="mb-2 line-clamp-2 text-sm text-[var(--ink-body)]">
                {description}
              </span>
            )}

            {siteName && (
              <span className="block text-xs font-medium text-[var(--ink-muted)]">
                {siteName}
              </span>
            )}
          </span>
        </span>
      </a>
    </span>
  );
}
