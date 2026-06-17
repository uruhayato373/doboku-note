"use client";

import { ExternalLink } from "lucide-react";
import Image from "next/image";

interface LinkCardClientProps {
  readonly url: string;
  readonly title: string;
  readonly description?: string;
  readonly imageUrl?: string;
  readonly siteName?: string;
  readonly category?: string;
  /**
   * "compact" (default): 左サムネ 128x96 + 右テキスト（参考資料リスト向け）
   * "hero": 上部フル幅画像（高さ約 200px）+ 下テキスト（note カード等 CTA 強調向け）
   */
  readonly variant?: "compact" | "hero";
}

export default function LinkCardClient({
  url,
  title,
  description,
  imageUrl,
  siteName = "サイト名なし",
  category = "参考資料",
  variant = "compact",
}: LinkCardClientProps) {
  const handleClick = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const isHero = variant === "hero";

  return (
    <span className="inline-block p-4">
      <span
        onClick={handleClick}
        className={`group cursor-pointer border border-gray-200 dark:border-gray-700 rounded-card-content overflow-hidden shadow-card-content hover:shadow-card-hover transition-all duration-300 bg-white dark:bg-gray-800 inline-block ${
          isHero ? "max-w-3xl w-full" : "max-w-2xl"
        }`}
      >
        <span className={isHero ? "block" : "flex"}>
          {imageUrl && (
            <span
              className={`overflow-hidden relative ${
                isHero ? "block w-full" : "flex-shrink-0 inline-block w-32 h-24"
              }`}
            >
              {isHero ? (
                // hero（ワイド）: 元画像のアスペクト比をそのまま使う（クロップしない）。
                // width/height は読み込み前のプレースホルダ比。aspect-ratio: auto W/H の
                // 仕様により、実画像ロード後は自然なアスペクト比が採用される。
                <Image
                  src={imageUrl}
                  alt={title}
                  width={1280}
                  height={670}
                  className="block w-full h-auto group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 768px"
                />
              ) : (
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                  sizes="128px"
                />
              )}
              {category && (
                <span className="absolute top-2 left-2 inline-block px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-sm shadow-sm">
                  {category}
                </span>
              )}
            </span>
          )}

          <span className={`flex-1 p-4 inline-block ${isHero ? "block" : ""}`}>
            <span className="flex items-center justify-end mb-2 inline-block">
              <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
            </span>

            <span
              className={`linkcard-title font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors block ${
                isHero ? "text-base" : "text-sm"
              }`}
            >
              {title}
            </span>

            {description && (
              <span
                className={`text-gray-600 dark:text-gray-400 mb-2 block ${
                  isHero ? "text-sm line-clamp-3" : "text-xs line-clamp-2"
                }`}
              >
                {description}
              </span>
            )}

            <span className="flex items-center text-xs text-gray-500 dark:text-gray-400 inline-block">
              {siteName && (
                <span className="font-medium">{siteName}</span>
              )}
            </span>
          </span>
        </span>
      </span>
    </span>
  );
}
