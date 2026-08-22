/**
 * 全ページ共通のページシェル（chrome）。
 *
 * これまで各ページが個別にコピペしていた
 *   <div className="min-h-screen flex flex-col bg-[var(--bg)] ..."><Header/><main>…</main><Footer/></div>
 * を 1 箇所に集約する。`variant` で <main> ラッパーの形だけを切り替え、
 * 3 種類の構造（単カラム rail / band+body / 2カラム記事）を表現する。
 *
 * variant:
 * - `default` : 素の <main className="flex-grow">。ページ側が PageHeader(band) + SectionBlock を内側で構成する。
 * - `content` : <main> 自体に内側 content rail（max-w + 左右/上下 padding）を持たせる単一カラム用。
 * - `article` : コンテナを一切持たない <div>。docs/category は内側で TwoColumnShell（2カラム本文＋右サイドバー）を使う。
 *
 * not-found は Header/Footer を持たない設計のため、本シェルは使わない（意図的な例外）。
 */

import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

type PageShellVariant = 'default' | 'content' | 'article';
type RailWidth = '780' | '820' | '860';

interface PageShellProps {
  /** <main> ラッパーの形を選ぶ。既定 'default' */
  variant?: PageShellVariant;
  /** variant='content' のときの読み幅。既定 '780' */
  rail?: RailWidth;
  /** <Header> より前に描画するノード（docs の <StructuredData> 等） */
  beforeHeader?: ReactNode;
  /** main/region 要素への追加クラス */
  className?: string;
  children: ReactNode;
}

const RAILS: Record<RailWidth, string> = {
  '780': 'max-w-[780px]',
  '820': 'max-w-[820px]',
  '860': 'max-w-[860px]',
};

export default function PageShell({
  variant = 'default',
  rail = '780',
  beforeHeader,
  className = '',
  children,
}: PageShellProps) {
  let region: ReactNode;

  if (variant === 'content') {
    const mainClass = [
      'flex-grow w-full mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-12',
      RAILS[rail],
      className,
    ]
      .filter(Boolean)
      .join(' ');
    region = <main className={mainClass}>{children}</main>;
  } else if (variant === 'article') {
    region = (
      <div className={['flex-grow w-full', className].filter(Boolean).join(' ')}>
        {children}
      </div>
    );
  } else {
    region = (
      <main className={['flex-grow', className].filter(Boolean).join(' ')}>
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] transition-colors duration-300">
      {beforeHeader}
      <Header />
      {region}
      <Footer />
    </div>
  );
}
