"use client";

import { ExternalLink } from "lucide-react";
import useSWR from "swr";
import Image from "next/image";

interface LinkCardClientProps {
  readonly url: string;
  readonly title: string;
  readonly description?: string;
  readonly imageUrl?: string;
  readonly siteName?: string;
  readonly category?: string;
}

export default function LinkCardClient({
  url,
  title,
  description,
  imageUrl,
  siteName = "サイト名なし",
  category = "参考資料",
}: LinkCardClientProps) {
  // useSWRでメタデータを取得（キャッシュ付き）
  const {
    data: metadata,
    error,
    isLoading,
  } = useSWR(
    url ? `/api/link-metadata?url=${encodeURIComponent(url)}` : null,
    async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.error || `HTTP ${res.status}: ${res.statusText}`
          );
        }
        return res.json();
      } catch (fetchError) {
        console.error(`LinkCard fetch error for ${url}:`, fetchError);
        throw fetchError;
      }
    },
    {
      revalidateOnFocus: false, // フォーカス時の再検証を無効
      revalidateOnReconnect: false, // 再接続時の再検証を無効
      dedupingInterval: 60000, // 1分間の重複リクエストを防止
      errorRetryCount: 3, // エラー時の再試行回数を増加
      errorRetryInterval: 2000, // エラー時の再試行間隔を2秒に設定
      onError: (err) => {
        console.error(`useSWR error for ${url}:`, err);
      },
    }
  );

  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <span className="inline-block p-4">
      <span
        onClick={handleClick}
        className="group cursor-pointer border border-gray-200 dark:border-gray-700 rounded-card-content overflow-hidden shadow-card-content hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-gray-800 max-w-2xl inline-block"
      >
        <span className="flex">
          {(imageUrl || metadata?.image) && (
            <span className="w-32 h-24 flex-shrink-0 overflow-hidden relative inline-block">
              <Image
                src={imageUrl || metadata?.image || ""}
                alt={title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                unoptimized
                sizes="128px"  // 親要素のw-32（8rem = 128px）に合わせる
              />
              {category && (
                <span className="absolute top-1 left-1 inline-block px-1.5 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded shadow-sm">
                  {category}
                </span>
              )}
            </span>
          )}

          <span className="flex-1 p-4 inline-block">
            <span className="flex items-center justify-end mb-2 inline-block">
              <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
            </span>

            <span className="linkcard-title text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors block">
              {isLoading
                ? "読み込み中..."
                : error
                ? title
                : metadata?.title || title}
            </span>

            {(description || metadata?.description) && (
              <span className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2 block">
                {metadata?.description || description}
              </span>
            )}

            <span className="flex items-center text-xs text-gray-500 dark:text-gray-400 inline-block">
              {siteName && (
                <span className="font-medium">
                  {metadata?.siteName || siteName}
                </span>
              )}
            </span>
          </span>
        </span>
      </span>
    </span>
  );
}
