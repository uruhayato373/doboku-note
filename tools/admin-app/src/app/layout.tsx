import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { todoBoard } from '@/lib/todo';
import { ledgerNav } from '@/lib/ledger';
import { designQualifications } from '@/lib/product-design';
import { materialsNav } from '@/lib/materials';
import { domainList } from '@/lib/domains';
import './globals.css';

export const metadata: Metadata = {
  title: 'doboku-note admin',
  description: 'ローカル専用 運営ダッシュボード',
};

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

  // 管理画面は常にライト（ダークは不要・2026-09-30）。globals.css のダーク定義は data-theme="dark" でしか効かない
  return (
    <html lang="ja" data-theme="light">
      <body className="admin-shell bg-background text-foreground antialiased">
        <SidebarProvider>
          {/* useSearchParams の Suspense 境界は Nav の中（メニュー部分だけ）に置く */}
          <Nav todoLayers={layers} ledger={ledgerNav()} design={designQualifications()} materials={materialsNav()} domains={domainList()} />
          <SidebarInset>
            {/* スマホ幅だけの上部バー。サイドバーは SidebarTrigger で開く Sheet（公式 Sidebar のモバイル表示）になる */}
            <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 text-sidebar-foreground md:hidden">
              <SidebarTrigger />
              <Link href="/metrics" className="text-sm font-bold text-sidebar-foreground no-underline hover:no-underline">
                doboku admin
              </Link>
            </header>
            <div className="container w-full">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
