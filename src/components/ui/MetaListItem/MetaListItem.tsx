/**
 * MetaCard 内のリスト行（→ 矢印 + タイトル + スペース区切りで出典）。
 *
 * 「過去問逆引き」「参考資料」など `→ + リンクタイトル + 補助情報` の
 * 共通行レイアウトを 1 箇所に集約。リンクラッパー（next/link or <a>）は
 * 呼び出し側で `<...className="block group">` として被せる前提。
 *
 * group-hover で blue が deep blue + underline に変化する。
 * 出典は title の直後にスペース区切り（gray + xs）で配置するため、
 * 1 行スキャンでタイトル＋出典がセットで読める。
 *
 * 利用例:
 *   // 内部リンク（過去問逆引き）
 *   <Link href={...} className="block group">
 *     <MetaListItem title={<>{year} <span className="text-[var(--ink-body)]">{question}</span></>} />
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
  /** タイトル直後にスペース区切りで表示する出典・組織名（任意） */
  source?: ReactNode;
  /** リンク無し（gray、hover効果なし）にする場合 true */
  plain?: boolean;
}

export default function MetaListItem({ title, source, plain = false }: MetaListItemProps) {
  const titleClassName = plain
    ? 'text-[var(--ink-body)]'
    : 'text-[var(--accent)] group-hover:text-[var(--accent)] group-hover:underline';

  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-[var(--ink-muted)] shrink-0 leading-tight">→</span>
      <span className="min-w-0">
        <span className={titleClassName}>{title}</span>
        {source && (
          <>
            {' '}
            <span className="text-xs text-[var(--ink-muted)]">{source}</span>
          </>
        )}
      </span>
    </div>
  );
}
