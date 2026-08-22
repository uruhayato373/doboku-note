/**
 * editorial カードの共通プリミティブ。
 *
 * 各ページにコピペされていた
 *   bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section shadow-soft
 * の chrome に加え、terms 内ローカル SectionCard / privacy 内ローカル PolicyCard の
 * 「icon タイル + serif 見出し + 本文」構成を任意 props で吸収する。
 *
 * 既存 MetaCard（記事末/サイドバー用、legacy トークン）と API 互換に保ち、
 * 後続フェーズで MetaCard を本コンポーネントへ委譲して二重管理を解消する。
 */

import type { ReactNode } from 'react';

type CardElement = 'section' | 'article' | 'aside' | 'div';

interface SectionCardProps {
  as?: CardElement;
  /** 見出し左の accent タイルに入れるアイコン */
  icon?: ReactNode;
  /** serif カード見出し */
  title?: ReactNode;
  headingLevel?: 2 | 3;
  /** default: p-6 sm:p-8 / compact: p-4 pb-5 / none: 余白なし */
  padding?: 'default' | 'compact' | 'none';
  /** hover でカードを持ち上げる（リンクカード等） */
  interactive?: boolean;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}

const PADDINGS: Record<NonNullable<SectionCardProps['padding']>, string> = {
  default: 'p-6 sm:p-8',
  compact: 'p-4 pb-5',
  none: '',
};

const BASE =
  'bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section shadow-soft';

function CardHeader({
  icon,
  title,
  headingLevel = 2,
}: Pick<SectionCardProps, 'icon' | 'title' | 'headingLevel'>) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const heading = (
    <Heading className="font-serif text-lg font-bold text-[var(--ink)] leading-tight">
      {title}
    </Heading>
  );
  if (!icon) {
    return <div className="mb-4">{heading}</div>;
  }
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="bg-[var(--accent-fill)] w-10 h-10 rounded-card-content flex items-center justify-center shrink-0">
        {icon}
      </div>
      {heading}
    </div>
  );
}

export default function SectionCard({
  as = 'section',
  icon,
  title,
  headingLevel = 2,
  padding = 'default',
  interactive = false,
  ariaLabel,
  className = '',
  children,
}: SectionCardProps) {
  const finalClass = [
    BASE,
    interactive ? 'card-interactive hover:shadow-card-hover' : '',
    PADDINGS[padding],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inner = (
    <>
      {title && <CardHeader icon={icon} title={title} headingLevel={headingLevel} />}
      {children}
    </>
  );

  const Tag = as;
  return (
    <Tag aria-label={ariaLabel} className={finalClass}>
      {inner}
    </Tag>
  );
}
