import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * 枠つきのタイル（題名＋ひとこと）。行き先に画像が無い所（テーマ・法令・ツール・基準書の章や節・資格の橋渡し・前後の文字だけのカード）の短い一覧が使う。
 * 行き先が記事なら画像つきの ArticleCard か ArticleThumbRow を使う（2026-11-17 運営者判断）。並べ方（grid の列数）は呼び出し側が決める。
 * 2026-11-16 に 7 か所、2026-11-17 にツール・一覧ページの手書き約 25 か所をここへまとめた。計測の data-cta-label などは data で渡す。
 */
type LinkTileProps = {
  readonly href: string;
  readonly title: ReactNode;
  /** 題名の下のひとこと（2 行まで） */
  readonly description?: ReactNode | undefined;
  /** 題名の上の小さな行（「← 前の章」・英字のラベルなど） */
  readonly eyebrow?: ReactNode | undefined;
  /** 題名の左のアイコン */
  readonly icon?: ReactNode | undefined;
  /** ひとことの下の行（件数・日付・行き先の名前など） */
  readonly meta?: ReactNode | undefined;
  /** md: 記事末・ツールの短い一覧／lg: 一覧ページの入口（余白と題名が大きい） */
  readonly size?: 'md' | 'lg';
  /** 題名を明朝にする（一覧ページの入口） */
  readonly serif?: boolean;
  readonly align?: 'left' | 'right';
  /** 今いるページ（モバイルのカテゴリナビ） */
  readonly current?: boolean;
  /** 上端の色の帯（資格トップのカード）。CSS の色の値 */
  readonly accentBar?: string | undefined;
  /** 題名の段（一覧ページの見出しの並びに合わせる） */
  readonly headingLevel?: 'h2' | 'h3' | 'h4';
  readonly className?: string;
  /** 計測の属性（data-cta-label など）。そのままリンクへ付ける */
  readonly data?: Readonly<Record<`data-${string}`, string>>;
  readonly children?: ReactNode;
};

const SIZE = {
  md: { pad: 'px-4 py-3', title: 'text-[15px] font-medium' },
  lg: { pad: 'p-5', title: 'text-lg font-bold' },
} as const;

export default function LinkTile({
  href, title, description, eyebrow, icon, meta, size = 'md', serif = false, align = 'left', current = false, accentBar, headingLevel, className = '', data, children,
}: LinkTileProps) {
  const s = SIZE[size];
  const Title = headingLevel ?? 'span';
  const frame = current ? 'border-(--accent) bg-(--accent-fill) dark:border-(--accent)' : 'border-(--rule-soft) hover:border-(--accent) dark:border-(--rule-soft)';
  const body = (
    <>
      {accentBar && <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accentBar }} />}
      {eyebrow && <span className="mb-1 block text-xs text-(--ink-muted)">{eyebrow}</span>}
      <div className={`flex items-center gap-3${align === 'right' ? ' justify-end' : ''}`}>
        {icon && <span aria-hidden className="shrink-0 text-(--accent)">{icon}</span>}
        <Title className={`block ${s.title} text-(--ink)${serif ? ' font-serif' : ''}`}>{title}</Title>
      </div>
      {description && <span className="mt-0.5 line-clamp-2 block text-[13px] text-(--ink-muted)">{description}</span>}
      {meta && <span className="mt-2 block text-xs text-(--ink-muted)">{meta}</span>}
      {children}
    </>
  );
  const cls = `focus-ring relative block h-full overflow-hidden rounded-card-content border ${s.pad} transition-colors ${frame}${align === 'right' ? ' text-right' : ''} ${className}`;
  // 外部の行き先（ツールから公式の様式など）は a で開く
  if (/^https?:\/\//.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" {...data} className={cls}>{body}</a>;
  }
  return <Link href={href} aria-current={current ? 'page' : undefined} {...data} className={cls}>{body}</Link>;
}
