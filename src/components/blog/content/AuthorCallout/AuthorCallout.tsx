"use client";

import Image from "next/image";

interface AuthorCalloutProps {
  items: string[];
}

/**
 * @description
 * 著者の顔写真付き吹き出しコンポーネント
 * 記事の冒頭で「この記事は誰のためのものか」を明示するために使用
 * 
 * @component
 * 
 * @props
 * - items: おすすめの対象者リスト
 * 
 * @example
 * ```tsx
 * <AuthorCallout
 *   items={[
 *     "年収500〜800万円の40代公務員で、節税方法を探している",
 *     "ふるさと納税に興味があるが、公務員が使っても問題ないか不安"
 *   ]}
 * />
 * ```
 */
export default function AuthorCallout({ items }: AuthorCalloutProps) {
  return (
    <div className="my-6 flex gap-4 items-start">
      {/* 著者画像とKAZU */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1">
        <div className="relative w-16 h-16 rounded-full overflow-hidden">
          <Image
            src="/images/author.png"
            alt="カズ（KAZU）"
            className="object-cover"
            sizes="64px"
            fill
          />
        </div>
        <div className="text-xs text-primary-600 dark:text-primary-400 font-semibold">
          KAZU
        </div>
      </div>

      {/* 吹き出し */}
      <div className="flex-1 relative bg-primary-50/50 dark:bg-primary-900/20 rounded-lg p-4">
        {/* 吹き出しの三角形 */}
        <div className="absolute -left-2 top-6 w-4 h-4 bg-primary-50/50 dark:bg-primary-900/20 transform rotate-45" />
        
        {/* コンテンツ */}
        <div className="relative">
          <div className="font-medium text-gray-900 dark:text-gray-100 mb-3">
            この記事は以下のような人におすすめ！
          </div>
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-primary-500 dark:text-primary-400 mt-0.5 flex-shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

