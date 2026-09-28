import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { todoBoard } from '@/lib/todo';
import { lineupQualifications } from '@/lib/lineup';
import { materialsNav } from '@/lib/materials';
import { domainList } from '@/lib/domains';
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
        {/* Next 16 App Router では beforeInteractive の inline <Script>（children 渡し）は
            client 側で script 要素を描画する経路になり、React が「client render では実行されない」と
            警告する（docs の beforeInteractive 例は src のみ）。RSC layout に素の <script> を
            dangerouslySetInnerHTML で置けば SSR HTML に入り、head の inline はパース時=hydration 前に
            実行される（next-themes と同じ FOUC 防止パターン）。children 渡しと違い hydration の
            生成対象にならないため警告も出ない。 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="admin-shell bg-background text-foreground antialiased">
        <SidebarProvider>
          {/* スマホ幅だけの上部バー。サイドバーは SidebarTrigger で開くオーバーレイになる */}
          <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-(--sidebar-border) bg-(--sidebar) px-3 text-(--sidebar-ink) md:hidden">
            <SidebarTrigger />
            <Link href="/metrics" className="text-sm font-bold text-(--sidebar-ink) no-underline hover:no-underline">
              doboku admin
            </Link>
          </header>
          {/* Nav は useSearchParams で層の active を出すため Suspense 境界が要る */}
          <Suspense fallback={<div className="hidden w-[212px] shrink-0 bg-(--sidebar) md:block" />}>
            <Nav todoLayers={layers} lineupQualifications={lineupQualifications()} materials={materialsNav()} domains={domainList()} />
          </Suspense>
          <SidebarInset className="container">{children}</SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
