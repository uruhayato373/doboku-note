import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * 一覧の右に置く絞り込み（件数つきのリンク）。リンク遷移だけで動く（クライアント状態を持たない）。
 * 旧来の `.todo-rail` / `.facet` の書き方をページごとに繰り返していたものを 1 か所にした。
 */
export function FacetShell({ main, rail }: { main: ReactNode; rail: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="min-w-0">{main}</div>
      <aside className="flex flex-col gap-4 text-sm">{rail}</aside>
    </div>
  );
}

export function FacetHead({ clearHref }: { clearHref?: string | null }) {
  return (
    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
      <span>絞り込み</span>
      {clearHref ? <Link href={clearHref} className="font-normal">すべて解除</Link> : null}
    </div>
  );
}

export type FacetItem = { key: string; label: ReactNode; count: number; href: string; active: boolean };

export function Facet({ title, items }: { title: ReactNode; items: FacetItem[] }) {
  return (
    <section className="flex flex-col gap-0.5">
      <h4 className="m-0 mb-1 text-xs font-semibold text-muted-foreground">{title}</h4>
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          className={cn(
            'flex items-center justify-between gap-2 rounded-md px-2 py-1 text-foreground no-underline hover:bg-accent',
            i.active && 'bg-accent font-medium',
          )}
        >
          <span className="truncate">{i.label}</span>
          <span className="tabular-nums text-xs text-muted-foreground">{i.count}</span>
        </Link>
      ))}
    </section>
  );
}
