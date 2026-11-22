/**
 * 下層ページ共通のページヘッダー。
 *
 * 各ページで手書きしていた breadcrumb + h1 + リード文（と下層 Hero）を統一する。
 * Hero はトップページ専用とし、下層は本コンポーネントへ寄せる。
 *
 * variant:
 * - `band`   : 全幅のヘッダー帯（SectionBlock band を内包）。about/contact/privacy/tools/sitemap 用。
 * - `inline` : 帯なし。content rail やカラムの内側に置く（terms 等）。
 */

import type { ReactNode } from 'react';
import Breadcrumb, { type Crumb } from '@/components/ui/Breadcrumb/Breadcrumb';
import SectionBlock from './SectionBlock';

type BandWidth = 'wide' | '860' | '780' | '760';

interface PageHeaderProps {
  breadcrumb?: Crumb[];
  /** h1 上のアクセント eyebrow（小ラベル） */
  label?: ReactNode;
  title: ReactNode;
  /** 'default' = text-[26px] sm:text-[32px] / 'lg' = text-[30px] sm:text-[38px] */
  titleSize?: 'default' | 'lg';
  /** h1 下のリード文 */
  lead?: ReactNode;
  /** 更新日・件数等のメタ情報 */
  meta?: ReactNode;
  variant?: 'band' | 'inline';
  /** band の内側コンテナ幅。既定 'wide' */
  width?: BandWidth;
  className?: string;
}

const TITLE_SIZES = {
  default: 'text-[26px] sm:text-[32px]',
  lg: 'text-[30px] sm:text-[38px]',
};

function HeaderStack({
  breadcrumb,
  label,
  title,
  titleSize = 'default',
  lead,
  meta,
}: Omit<PageHeaderProps, 'variant' | 'width' | 'className'>) {
  return (
    <>
      {breadcrumb && breadcrumb.length > 0 && <Breadcrumb items={breadcrumb} />}
      {label && (
        <div className="inline-flex items-center font-mono text-[11px] uppercase tracking-wider text-(--accent) px-2.5 py-1 bg-(--accent-fill) rounded-full mb-4">
          {label}
        </div>
      )}
      <h1
        className={`font-serif font-black text-(--ink) tracking-[0.01em] ${TITLE_SIZES[titleSize]}`}
        style={{ fontFeatureSettings: '"palt" 1' }}
      >
        {title}
      </h1>
      {lead && (
        <p className="mt-3 text-[15px] sm:text-[16px] text-(--ink-body) leading-[1.9] max-w-[62ch]">
          {lead}
        </p>
      )}
      {meta && <div className="mt-3 font-mono text-[11px] text-(--ink-muted)">{meta}</div>}
    </>
  );
}

export default function PageHeader({
  variant = 'inline',
  width = 'wide',
  className = '',
  ...stack
}: PageHeaderProps) {
  if (variant === 'band') {
    return (
      <SectionBlock band space="md" width={width} className={className}>
        <HeaderStack {...stack} />
      </SectionBlock>
    );
  }
  return (
    <div className={className}>
      <HeaderStack {...stack} />
    </div>
  );
}
