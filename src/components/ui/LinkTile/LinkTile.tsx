import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * 枠つきのタイル（題名＋ひとこと）。記事末の「次のステップ」「資格の橋渡し」「関連テキスト」などの短い一覧が使う。
 * 同じクラスの並びを 7 か所に手書きしていた（2026-11-16 棚卸し）のを 1 つにまとめた。並べ方（grid の列数）は呼び出し側が決める。
 * 計測の data-cta-label などは data で渡す。
 */
type LinkTileProps = {
  readonly href: string;
  readonly title: ReactNode;
  /** 題名の下のひとこと（2 行まで） */
  readonly description?: ReactNode;
  /** ひとことの下に足す行（CareerNeedPicker の行き先の名前など） */
  readonly children?: ReactNode;
  readonly className?: string;
  /** 計測の属性（data-cta-label など）。そのままリンクへ付ける */
  readonly data?: Readonly<Record<`data-${string}`, string>>;
};

export default function LinkTile({ href, title, description, children, className = '', data }: LinkTileProps) {
  return (
    <Link
      href={href}
      {...data}
      className={`focus-ring block h-full rounded-card-content border border-(--rule-soft) px-4 py-3 transition-colors hover:border-(--accent) dark:border-(--rule-soft) ${className}`}
    >
      <span className="block text-[15px] font-medium text-(--ink)">{title}</span>
      {description && <span className="mt-0.5 line-clamp-2 block text-[13px] text-(--ink-muted)">{description}</span>}
      {children}
    </Link>
  );
}
