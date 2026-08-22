import { Suspense } from 'react';
import type { Metadata } from 'next';
import Script from 'next/script';
import Nav from '@/components/Nav';
import { todoBoard } from '@/lib/todo';
import './globals.css';

export const metadata: Metadata = {
  title: 'doboku-note admin',
  description: 'ローカル専用 運営ダッシュボード',
};

/** 描画前に data-theme を確定させる（CSS はダークを data-theme だけで表現しているため、
 *  これが無いと初回描画でライトが一瞬出る＝FOUC になる）。
 *  明示選択が無いときは OS 設定に追従し、セッション中の OS 側変更にも追従する。 */
const THEME_INIT = `(function(){var k='admin-theme',d=document.documentElement;try{var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(e){if(!localStorage.getItem(k))d.dataset.theme=e.matches?'dark':'light';});}d.dataset.theme=t;}catch(e){d.dataset.theme='light';}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 層はサイドバーの入れ子として出すので、件数はここ（server）で数えて Nav へ渡す。
  // .claude/todo/*.md を 4 本読むだけなのでローカル専用ツールでは十分に安い。
  const layers = todoBoard().files.map((f) => ({
    id: f.id,
    label: f.label,
    count: f.count,
  }));

  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* 素の <script> を JSX に置くと React が「client render では実行されない」と警告を出すため、
            next/script の beforeInteractive で head へ注入する（実行タイミングは同じ＝hydration 前）。 */}
        <Script id="admin-theme-init" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
      </head>
      <body className="admin-shell bg-background text-foreground antialiased">
        {/* Nav は useSearchParams で層の active を出すため Suspense 境界が要る */}
        <Suspense fallback={<nav className="app-nav" />}>
          <Nav todoLayers={layers} />
        </Suspense>
        <main className="container min-w-0 flex-1">{children}</main>
      </body>
    </html>
  );
}
