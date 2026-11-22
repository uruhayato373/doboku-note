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
import Eyebrow from '@/components/ui/Eyebrow/Eyebrow';

type MetaCardElement = 'section' | 'aside' | 'div' | 'article' | 'nav';

interface MetaCardProps {
  /** ラッパー要素のタグ。意味的に `<section>` を既定とする */
  as?: MetaCardElement;
  /** スクリーンリーダー用ラベル（任意） */
  ariaLabel?: string | undefined;
  /** 区画の見出し */
  title?: ReactNode;
  /** 見出しの下の 1 行（件数・説明） */
  lead?: ReactNode;
  /** 見出しの上の小さなラベル（区画の役割。右の欄の「基準類ナビ」など） */
  eyebrow?: ReactNode;
  /** 見出しの右の補足（集計の期間・件数など） */
  titleAside?: ReactNode;
  /** 見出しの左のアイコン（accent のタイルに入れる） */
  icon?: ReactNode;
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
  children?: ReactNode;
}

const PADDINGS: Record<NonNullable<MetaCardProps['padding']>, string> = {
  default: 'p-6 sm:p-8',
  compact: 'p-4 pb-5',
  none: '',
};

function CardHeader({ title, lead, eyebrow, titleAside, icon, serifTitle = false, compact }: Pick<MetaCardProps, 'title' | 'lead' | 'eyebrow' | 'titleAside' | 'icon' | 'serifTitle'> & { compact: boolean }) {
  const text = (
    <div className="min-w-0 flex-1">
      {eyebrow && <Eyebrow variant="plain" tone="accent" className="mb-1.5">{eyebrow}</Eyebrow>}
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={`text-lg font-bold leading-tight text-(--ink)${serifTitle ? ' font-serif' : ''}`}>{title}</h2>
        {titleAside && <span className="shrink-0 font-mono text-[11px] tabular-nums text-(--ink-muted)">{titleAside}</span>}
      </div>
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
  eyebrow,
  titleAside,
  icon,
  serifTitle = false,
  padding = 'default',
  interactive = false,
  className = '',
  trackNav,
  children,
}: MetaCardProps) {
  const finalClassName = ['card-surface-section', interactive ? 'card-interactive hover:shadow-card-hover' : '', PADDINGS[padding], className].filter(Boolean).join(' ');
  const trackAttrs = trackNav ? { 'data-cta': 'nav', 'data-cta-label': trackNav } : {};
  return (
    <Tag aria-label={ariaLabel} className={finalClassName} {...trackAttrs}>
      {title && <CardHeader title={title} lead={lead} eyebrow={eyebrow} titleAside={titleAside} icon={icon} serifTitle={serifTitle} compact={padding === 'compact'} />}
      {children}
    </Tag>
  );
}
