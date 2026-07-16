/**
 * 2カラムレイアウト（本文 + 右サイドバー）の単一定義。
 *
 * docs 記事・category ページが個別に手書きしていた
 *   <div className="max-w-[1280px] mx-auto ... flex gap-* relative"><main>…</main><aside>…</aside></div>
 * を 1 箇所に集約する（2026-07 余白リデザインで新設）。
 *
 * レイアウト値の真実源はこのファイルのみ:
 * - 外枠 cap: max-w-[1280px]
 * - カラム間 gap: gap-10（40px）
 * - サイドバー: w-72（288px）・zenn-desktop（≥993px）でのみ表示
 * サイドバー幅・gap・外枠 cap を変えるときはここだけを変更する（各ページに複製しない）。
 * ドキュメント: docs/design-system/design-system.md §3
 *
 * gutter（外周余白）は 2 系統:
 * - 'flush-mobile' : docs 記事用。≤576px は外周 0（記事カードをフルブリードさせるため）
 * - 'default'      : category 等。サイト共通の px-4 sm:px-6 lg:px-10
 */

import type { ReactNode } from 'react';

type Gutter = 'flush-mobile' | 'default';

const GUTTERS: Record<Gutter, string> = {
  'flush-mobile': 'zenn-sp:px-[25px] zenn-tablet:px-10',
  default: 'px-4 sm:px-6 lg:px-10',
};

interface TwoColumnShellProps {
  /** 外周 gutter。既定 'default' */
  gutter?: Gutter;
  /** <main> への追加クラス（縦 padding の差分吸収用）。既定 'py-10' */
  mainClassName?: string;
  /** 右サイドバーの中身。<aside> 要素・幅（w-72）・表示制御（≥993px）はシェルが所有する */
  aside?: ReactNode;
  children: ReactNode;
}

export default function TwoColumnShell({
  gutter = 'default',
  mainClassName = 'py-10',
  aside,
  children,
}: TwoColumnShellProps) {
  return (
    <div className={`max-w-[1280px] mx-auto ${GUTTERS[gutter]} flex gap-10 relative`}>
      <main className={`flex-1 min-w-0 ${mainClassName}`}>{children}</main>
      {aside && (
        <aside className="hidden zenn-desktop:block w-72 shrink-0 py-10">{aside}</aside>
      )}
    </div>
  );
}
