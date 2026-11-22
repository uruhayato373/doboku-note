import Image from 'next/image';
import { getLinkMetadata } from '../../../lib/actions/link-metadata-actions';
import { externalLinkRel } from '@/lib/external-link-rel';

interface LinkCardProps {
  readonly url: string;
  readonly title: string;
  readonly description?: string;
  readonly siteName?: string;
  readonly imageUrl?: string;
}

/**
 * LinkCard — OGP 画像を左に本来比のまま（クロップしない）、右にタイトル・説明・サイト名を並べる横型カード。
 * モバイル（< sm）では画像を上・テキストを下に積む。デスクトップでは画像とテキストを縦中央で揃える。
 */
export default async function LinkCard({
  url,
  title,
  description,
  siteName,
  imageUrl,
}: LinkCardProps) {
  // サーバーサイドでメタデータを取得
  const metadata = await getLinkMetadata(url);

  // 表示する情報を決定（props優先、metadataでフォールバック）
  const displayTitle = title || metadata.title || 'タイトルなし';
  const displayDescription = description || metadata.description || '';
  const displayImage = imageUrl || metadata.image || '';
  const displaySiteName = siteName || metadata.siteName || '';

  return (
    <span className="not-prose inline-block p-4">
      <a
        href={url}
        target="_blank"
        rel={externalLinkRel(url)}
        className="card-interactive focus-ring group block w-full max-w-2xl cursor-pointer overflow-hidden card-surface-content hover:shadow-card-hover"
      >
        <span className="flex flex-col sm:flex-row sm:items-center">
          {displayImage && (
            <span className="relative block w-full overflow-hidden sm:w-1/2 sm:shrink-0">
              <Image
                src={displayImage}
                alt={displayTitle}
                width={1200}
                height={630}
                className="block h-auto w-full transition-transform duration-300 group-hover:scale-105"
                unoptimized
                sizes="(max-width: 640px) 100vw, 320px"
              />
            </span>
          )}

          <span className="block min-w-0 flex-1 p-4">
            <span className="linkcard-title mb-2 line-clamp-2 text-base font-semibold text-(--ink) transition-colors group-hover:text-(--accent)">
              {displayTitle}
            </span>

            {displayDescription && (
              <span className="mb-2 line-clamp-2 text-sm text-(--ink-body)">
                {displayDescription}
              </span>
            )}

            {displaySiteName && (
              <span className="block text-xs font-medium text-(--ink-muted)">
                {displaySiteName}
              </span>
            )}
          </span>
        </span>
      </a>
    </span>
  );
}
