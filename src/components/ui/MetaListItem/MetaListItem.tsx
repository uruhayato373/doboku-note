/**
 * MetaCard 内のリスト行（→ 矢印 + タイトル + 出典右寄せ）。
 *
 * 「過去問逆引き」「参考資料」など `→ + リンクタイトル + 補助情報` の
 * 共通行レイアウトを 1 箇所に集約。リンクラッパー（next/link or <a>）は
 * 呼び出し側で `<...className="block group">` として被せる前提。
 *
 * group-hover で blue が deep blue + underline に変化する。
 *
 * 利用例:
 *   // 内部リンク（過去問逆引き）
 *   <Link href={...} className="block group">
 *     <MetaListItem title={<>{year} <span className="text-gray-700 dark:text-gray-300">{question}</span></>} />
 *   </Link>
 *
 *   // 外部リンク（参考資料）
 *   <a href={url} target="_blank" rel="noopener noreferrer" className="block group">
 *     <MetaListItem title={title} source={source} />
 *   </a>
 *
 *   // リンクなし（書籍参照等）
 *   <div>
 *     <MetaListItem title={title} source={source} plain />
 *   </div>
 */

import type { ReactNode } from 'react';

interface MetaListItemProps {
  title: ReactNode;
  /** 右寄せの出典・組織名（任意） */
  source?: ReactNode;
  /** リンク無し（gray、hover効果なし）にする場合 true */
  plain?: boolean;
}

export default function MetaListItem({ title, source, plain = false }: MetaListItemProps) {
  const titleClassName = plain
    ? 'text-gray-700 dark:text-gray-300'
    : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300 group-hover:underline';

  return (
    <div className="flex items-baseline justify-between gap-3 flex-wrap text-sm">
      <span className="flex items-baseline gap-2 min-w-0">
        <span className="text-gray-500 dark:text-gray-400 shrink-0 leading-tight">→</span>
        <span className={titleClassName}>{title}</span>
      </span>
      {source && (
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{source}</span>
      )}
    </div>
  );
}
