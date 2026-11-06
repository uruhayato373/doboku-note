'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';

export type GanttBar = { key: string; mark: string; title: string; tooltip: string; role: 'attract' | 'sell'; start: number; span: number };
export type GanttRow = { key: string; label: string; lanes: GanttBar[][] };

const ROLE: Record<GanttBar['role'], string> = {
  attract: 'border-[var(--accent)]/30 bg-[var(--accent-fill)] text-[color:var(--accent)]',
  sell: 'border-[var(--accent)] bg-[var(--accent)] text-primary-foreground',
};
// Tailwind が見つけられるように、クラス名をそのまま書く
const COL_START = ['col-start-1', 'col-start-2', 'col-start-3', 'col-start-4', 'col-start-5', 'col-start-6', 'col-start-7', 'col-start-8', 'col-start-9', 'col-start-10', 'col-start-11', 'col-start-12'];
const COL_SPAN = ['col-span-1', 'col-span-2', 'col-span-3', 'col-span-4', 'col-span-5', 'col-span-6', 'col-span-7', 'col-span-8', 'col-span-9', 'col-span-10', 'col-span-11', 'col-span-12'];
const LABEL = 'w-28 shrink-0 px-3 text-xs';

/** プロジェクト管理のバーチャート。行が資格、列が月。バーに乗ると項目の全文を出す。Tooltip の子の都合でクライアントで描く */
export function ChannelGantt({ months, rows }: { months: string[]; rows: GanttRow[] }) {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <div className="min-w-[640px]">
          <div className="flex items-center bg-muted py-2 text-xs font-medium text-muted-foreground">
            <div className={LABEL}>資格</div>
            <div className="grid flex-1 grid-cols-12 text-center">
              {months.map((m) => <div key={m}>{Number(m.slice(5))}</div>)}
            </div>
          </div>
          {rows.map((row) => (
            <div key={row.key} className="flex border-t border-[var(--border)]">
              <div className={cn(LABEL, 'py-2 font-medium')}>{row.label}</div>
              <div className="relative flex-1 py-1">
                <div className="absolute inset-0 grid grid-cols-12" aria-hidden>
                  {months.map((m) => <div key={m} className="border-l border-[var(--border)]/60" />)}
                </div>
                <div className="relative space-y-0.5">
                  {row.lanes.map((lane, i) => (
                    <div key={i} className="grid grid-cols-12">
                      {lane.map((bar) => (
                        <Tooltip key={bar.key}>
                          <TooltipTrigger asChild>
                            <button type="button" className={cn(COL_START[bar.start], COL_SPAN[bar.span - 1], ROLE[bar.role], 'mx-px h-5 min-w-0 cursor-default truncate rounded-[3px] border px-1 text-left text-[11px] leading-[18px]')}>
                              <span className="mr-1 text-[9px] opacity-70">{bar.mark}</span>{bar.title}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{bar.tooltip}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
