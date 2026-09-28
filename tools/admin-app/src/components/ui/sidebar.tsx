'use client';

import { createContext, useContext, useEffect, useState, type ComponentProps } from 'react';
import { usePathname } from 'next/navigation';
import { Slot } from '@radix-ui/react-slot';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * shadcn/ui の Sidebar と同じ部品名・構成の軽量版（DN-0432）。
 * 公式は Sheet（Radix Dialog）・Tooltip・アイコン幅への折りたたみを持つが、管理画面で要るのは
 * 「縦のナビ・枝の開閉・スマホでの開閉」だけなので Radix を足さずに作る。部品名を公式とそろえてあるので、
 * 公式へ差し替えるときは import 先を変えるだけで済む。
 *
 * - md 以上: 左に固定幅で常時表示（sticky・中だけスクロール）
 * - md 未満: 上部バーの SidebarTrigger で開閉するオーバーレイ。画面を移ると閉じる
 * - 色は globals.css の --sidebar / --sidebar-ink / --sidebar-muted / --sidebar-border（ライト/ダーク共通の濃紺）
 */

type SidebarState = { openMobile: boolean; setOpenMobile: (open: boolean) => void };
const SidebarContext = createContext<SidebarState | null>(null);

function useSidebar(): SidebarState {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('Sidebar の部品は SidebarProvider の中で使う');
  return ctx;
}

export function SidebarProvider({ className, children, ...props }: ComponentProps<'div'>) {
  const [openMobile, setOpenMobile] = useState(false);
  const pathname = usePathname();
  // 画面を移ったらスマホのメニューを閉じる（リンクを押したあと本文が隠れたままにならないように）
  useEffect(() => setOpenMobile(false), [pathname]);
  return (
    <SidebarContext.Provider value={{ openMobile, setOpenMobile }}>
      <div data-slot="sidebar-wrapper" className={cn('flex min-h-svh w-full flex-col md:flex-row', className)} {...props}>
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({ className, children, ...props }: ComponentProps<'aside'>) {
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <>
      {openMobile ? (
        <div
          aria-hidden="true"
          className="fixed inset-x-0 top-12 bottom-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpenMobile(false)}
        />
      ) : null}
      <aside
        data-slot="sidebar"
        data-state={openMobile ? 'open' : 'closed'}
        className={cn(
          'z-40 flex w-[212px] shrink-0 flex-col border-r border-(--sidebar-border) bg-(--sidebar) text-(--sidebar-ink)',
          'fixed top-12 bottom-0 left-0 -translate-x-full transition-transform data-[state=open]:translate-x-0',
          'md:sticky md:top-0 md:bottom-auto md:h-svh md:translate-x-0 md:transition-none',
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    </>
  );
}

/** md 未満でだけ出る上部バーの開閉ボタン。 */
export function SidebarTrigger({ className, ...props }: ComponentProps<'button'>) {
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <button
      type="button"
      data-slot="sidebar-trigger"
      aria-label={openMobile ? 'メニューを閉じる' : 'メニューを開く'}
      aria-expanded={openMobile}
      onClick={() => setOpenMobile(!openMobile)}
      className={cn('inline-flex size-9 items-center justify-center rounded-md hover:bg-white/10', className)}
      {...props}
    >
      {openMobile ? <X className="size-5" /> : <Menu className="size-5" />}
    </button>
  );
}

export function SidebarHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sidebar-header" className={cn('flex flex-col gap-1 px-3 pt-3.5 pb-2', className)} {...props} />;
}

export function SidebarContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sidebar-content" className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-3', className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sidebar-footer" className={cn('flex flex-col gap-2 border-t border-(--sidebar-border) p-2.5', className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sidebar-group" className={cn('flex flex-col gap-0.5', className)} {...props} />;
}

export function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      data-slot="sidebar-group-label"
      className={cn(
        'flex h-8 items-center rounded-md bg-(--sidebar-group-bg) px-2.5 text-[12.5px] font-bold text-(--sidebar-ink) no-underline hover:no-underline data-[active=true]:ring-1 data-[active=true]:ring-white/20',
        className,
      )}
      {...props}
    />
  );
}

export function SidebarMenu({ className, ...props }: ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu" className={cn('m-0 flex list-none flex-col gap-px p-0', className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn('relative', className)} {...props} />;
}

const menuButton =
  'flex w-full min-h-[30px] items-center gap-2 rounded-md px-2.5 py-1 text-left text-[12.5px] leading-snug text-(--sidebar-muted) no-underline outline-none transition-colors hover:bg-white/10 hover:text-white hover:no-underline focus-visible:ring-2 focus-visible:ring-white/40 data-[active=true]:bg-primary/25 data-[active=true]:font-semibold data-[active=true]:text-white';

export function SidebarMenuButton({
  className,
  asChild = false,
  isActive = false,
  ...props
}: ComponentProps<'button'> & { asChild?: boolean; isActive?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp data-slot="sidebar-menu-button" data-active={isActive} className={cn(menuButton, className)} {...props} />;
}

/** メニューの右端に出す件数。 */
export function SidebarMenuBadge({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="sidebar-menu-badge"
      className={cn('ml-auto shrink-0 text-[11px] text-(--sidebar-muted) tabular-nums', className)}
      {...props}
    />
  );
}

export function SidebarMenuSub({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      className={cn('my-0.5 ml-4 flex list-none flex-col gap-px border-l border-(--sidebar-border) py-0 pr-0 pl-2', className)}
      {...props}
    />
  );
}

export function SidebarMenuSubItem({ className, ...props }: ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-sub-item" className={cn('relative', className)} {...props} />;
}

export function SidebarMenuSubButton({
  className,
  asChild = false,
  isActive = false,
  ...props
}: ComponentProps<'a'> & { asChild?: boolean; isActive?: boolean }) {
  const Comp = asChild ? Slot : 'a';
  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-active={isActive}
      className={cn(menuButton, 'min-h-[27px] text-xs', className)}
      {...props}
    />
  );
}

/** サイドバーの右側（本文側）。 */
export function SidebarInset({ className, ...props }: ComponentProps<'main'>) {
  return <main data-slot="sidebar-inset" className={cn('flex min-w-0 flex-1 flex-col', className)} {...props} />;
}
