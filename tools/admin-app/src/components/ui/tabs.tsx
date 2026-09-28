import type { ComponentProps } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * shadcn/ui の Tabs と同じ部品名・見た目の、URL で切り替える版（DN-0432）。
 * 公式（Radix Tabs）はクライアント側で中身を出し分けるため、全タブのデータを先に読む必要がある。
 * 管理画面のタブ（週次/月次など）は URL ごとにサーバーで 1 つだけ描くので、トリガーを next/link にする。
 * 選択中は aria-current="page"・data-state="active"。
 */
export function Tabs({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="tabs" className={cn('flex flex-col gap-3', className)} {...props} />;
}

export function TabsList({ className, ...props }: ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="tabs-list"
      className={cn('inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground', className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  active = false,
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, 'href'> & { href: string; active?: boolean }) {
  return (
    <Link
      href={href}
      data-slot="tabs-trigger"
      data-state={active ? 'active' : 'inactive'}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground no-underline transition-[color,box-shadow] hover:text-foreground hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />;
}
