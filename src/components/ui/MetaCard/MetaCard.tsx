/**
 * 記事末尾・サイドバーの情報カード（rounded-card-section）の共通シェル。
 *
 * 12 箇所で literal にコピペされていた以下のクラス指定を 1 箇所に集約する:
 *   bg-white dark:bg-gray-800 rounded-card-section shadow-card-section
 *   border border-gray-200/60 dark:border-gray-700/60 p-{...}
 *
 * 子要素（h2 タイトル / p サブタイトル / リスト 等）は呼び出し側の責務。
 * MetaCard は外枠のみを抽象化する純粋なシェル。
 *
 * 利用例:
 *   <MetaCard as="section" ariaLabel="参考資料">
 *     <h2 className="text-lg font-bold ...">参考資料</h2>
 *     <p className="text-sm ...">公的資料・解説記事</p>
 *     <ul>...</ul>
 *   </MetaCard>
 */

import type { ReactNode } from 'react';

type MetaCardElement = 'section' | 'aside' | 'div';

interface MetaCardProps {
  /** ラッパー要素のタグ。意味的に `<section>` を既定とする */
  as?: MetaCardElement;
  /** スクリーンリーダー用ラベル（任意） */
  ariaLabel?: string;
  /**
   * パディングプリセット:
   * - `default`: p-6 sm:p-8（記事末尾カード等）
   * - `compact`: p-4 pb-5（サイドバーのコンパクトカード）
   * - `none`: パディングなし（呼び出し側で className 指定）
   */
  padding?: 'default' | 'compact' | 'none';
  /** 追加クラス（mt-10、max-h、toc-scroll 等の特殊指定） */
  className?: string;
  children: ReactNode;
}

const PADDINGS: Record<NonNullable<MetaCardProps['padding']>, string> = {
  default: 'p-6 sm:p-8',
  compact: 'p-4 pb-5',
  none: '',
};

const BASE_CLASSES =
  'bg-white dark:bg-gray-800 rounded-card-section shadow-card-section border border-gray-200/60 dark:border-gray-700/60';

export default function MetaCard({
  as = 'section',
  ariaLabel,
  padding = 'default',
  className = '',
  children,
}: MetaCardProps) {
  const finalClassName = [BASE_CLASSES, PADDINGS[padding], className].filter(Boolean).join(' ');

  if (as === 'aside') {
    return (
      <aside aria-label={ariaLabel} className={finalClassName}>
        {children}
      </aside>
    );
  }
  if (as === 'div') {
    return (
      <div aria-label={ariaLabel} className={finalClassName}>
        {children}
      </div>
    );
  }
  return (
    <section aria-label={ariaLabel} className={finalClassName}>
      {children}
    </section>
  );
}
