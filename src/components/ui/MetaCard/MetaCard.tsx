/**
 * 枠つきの区画（card-surface-section）の唯一の部品。記事末・右の欄・固定ページ・基準書の区画が使う。
 *
 * 2026-11-17 に SectionCard（固定ページ・基準書用。影だけ違う）を取り込み、1 本にした（影は MetaCard の card-section にそろえる。運営者判断）。
 * 見出しは title・lead（題名の下の 1 行）・icon で渡す。37 か所が MetaCard の直下に h2 と説明の p を手で書いていたのを置き換えた。
 * tests/section-card-ratchet.test.mjs が、MetaCard の直下に見出しを手書きする形と、外枠の手書きの再発を止める。
 *
 * 利用例:
 *   <MetaCard title="関連記事" lead="同じテーマの記事 (6 件)" trackNav="related-articles">
 *     <ul>...</ul>
 *   </MetaCard>
 */

import type { ReactNode } from 'react';

type MetaCardElement = 'section' | 'aside' | 'div' | 'article';

interface MetaCardProps {
  /** ラッパー要素のタグ。意味的に `<section>` を既定とする */
  as?: MetaCardElement;
  /** スクリーンリーダー用ラベル（任意） */
  ariaLabel?: string | undefined;
  /** 区画の見出し */
  title?: ReactNode;
  /** 見出しの下の 1 行（件数・説明） */
  lead?: ReactNode;
  /** 見出しの左のアイコン（accent のタイルに入れる） */
  icon?: ReactNode;
  /** 見出しの段 */
  headingLevel?: 2 | 3;
  /** 見出しを明朝にする（固定ページ・基準書の区画） */
  serifTitle?: boolean;
  /**
   * パディングプリセット:
   * - `default`: p-6 sm:p-8（記事末尾カード等）
   * - `compact`: p-4 pb-5（サイドバーのコンパクトカード）
   * - `none`: パディングなし（呼び出し側で className 指定）
   */
  padding?: 'default' | 'compact' | 'none';
  /** hover で持ち上げる（区画全体がリンクのとき） */
  interactive?: boolean;
  /** 追加クラス（mt-10、max-h、toc-scroll 等の特殊指定） */
  className?: string;
  /**
   * サイト内回遊クリック計測のラベル（任意）。指定すると root に
   * `data-cta="nav" data-cta-label={trackNav}` を付与し、AnalyticsProvider の
   * デリゲートリスナーが配下リンクのクリックを internal_nav_click として拾う。
   */
  trackNav?: string | undefined;
  /** root に付けるそのほかの属性（data-article-sidebar-card など） */
  data?: Readonly<Record<`data-${string}`, string | undefined>>;
  children?: ReactNode;
}

const PADDINGS: Record<NonNullable<MetaCardProps['padding']>, string> = {
  default: 'p-6 sm:p-8',
  compact: 'p-4 pb-5',
  none: '',
};

function CardHeader({ title, lead, icon, headingLevel = 2, serifTitle = false, compact }: Pick<MetaCardProps, 'title' | 'lead' | 'icon' | 'headingLevel' | 'serifTitle'> & { compact: boolean }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const text = (
    <div className="min-w-0">
      <Heading className={`text-lg font-bold leading-tight text-(--ink)${serifTitle ? ' font-serif' : ''}`}>{title}</Heading>
      {lead && <p className="mt-1 text-sm text-(--ink-muted)">{lead}</p>}
    </div>
  );
  const space = compact ? 'mb-3' : 'mb-4';
  if (!icon) return <div className={space}>{text}</div>;
  return (
    <div className={`flex items-center gap-3 ${space}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card-content bg-(--accent-fill)">{icon}</div>
      {text}
    </div>
  );
}

export default function MetaCard({
  as: Tag = 'section',
  ariaLabel,
  title,
  lead,
  icon,
  headingLevel = 2,
  serifTitle = false,
  padding = 'default',
  interactive = false,
  className = '',
  trackNav,
  data,
  children,
}: MetaCardProps) {
  const finalClassName = ['card-surface-section', interactive ? 'card-interactive hover:shadow-card-hover' : '', PADDINGS[padding], className].filter(Boolean).join(' ');
  const trackAttrs = trackNav ? { 'data-cta': 'nav', 'data-cta-label': trackNav } : {};
  return (
    <Tag aria-label={ariaLabel} className={finalClassName} {...trackAttrs} {...data}>
      {title && <CardHeader title={title} lead={lead} icon={icon} headingLevel={headingLevel} serifTitle={serifTitle} compact={padding === 'compact'} />}
      {children}
    </Tag>
  );
}
