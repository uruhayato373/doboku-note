import Link from 'next/link';
import Image from 'next/image';
import type { DocMeta } from '@/lib/docs';
import { getOgpDisplayUrl } from '@/lib/r2-image-loader';
import { getPublicDocPath } from '@/lib/content-routes';

interface RelatedArticleCardProps {
  readonly doc: DocMeta;
}

/**
 * 関連記事の OGP サムネイル カード。
 * 各記事の ogp.png（R2 配信・全 published 記事で CI 実在保証）を 1200:630 のサムネにし、
 * クリックを誘発する。below-fold + loading="lazy" で LCP 非干渉。
 * 画像下地に --bg を敷き、万一の 404 でも枠が崩れないようにする。
 */
export default function RelatedArticleCard({ doc }: RelatedArticleCardProps) {
  return (
    <Link
      href={getPublicDocPath(doc.slug)}
      className="card-interactive card-surface-content focus-ring not-prose group flex h-full flex-col overflow-hidden hover:border-brand dark:hover:border-brand"
    >
      <div className="relative aspect-[1200/630] w-full overflow-hidden bg-[var(--bg)]">
        <Image
          src={getOgpDisplayUrl(doc.slug)}
          alt=""
          width={600}
          height={315}
          unoptimized
          loading="lazy"
          sizes="(max-width: 640px) 100vw, 320px"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col px-4 py-3">
        <div className="line-clamp-2 text-sm font-semibold text-brand">{doc.title}</div>
        {doc.description && (
          <div className="mt-1 line-clamp-2 text-xs text-[var(--ink-body)]">
            {doc.description}
          </div>
        )}
      </div>
    </Link>
  );
}
