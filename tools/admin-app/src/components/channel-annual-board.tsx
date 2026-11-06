import Link from 'next/link';
import { PanelCard, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';

export type BoardSlot = { id: string; exam: string; title: string; role: 'attract' | 'sell'; window: { from: string; to: string }; count: number; salesMax?: number };
export type BoardChannel = {
  id: string; label: string; role: string; state: string; weekly: string; planned: number; capacity: number;
  metrics: { label: string; status: string }[]; fill: Record<string, number>; slots: BoardSlot[]; pending: string[]; errors: string[];
};

const mon = (ym: string) => `${Number(ym.slice(5))}`;
const inWindow = (m: string, w: BoardSlot['window']) => m >= w.from && m <= w.to;
const CELL: Record<BoardSlot['role'], string> = { attract: 'bg-[var(--accent-fill)]', sell: 'bg-[var(--accent)]' };

/** チャネルの年間の枠を 1 枚で見る。正本は config/channel-annual-plan.json。書き込みはしない */
export function ChannelAnnualBoard({ channels, months, nameOf, active }: { channels: BoardChannel[]; months: string[]; nameOf: (id: string) => string; active?: string }) {
  const shown = channels.filter((c) => !active || c.id === active);
  const notes = shown.flatMap((c) => [...c.errors.map((line) => ({ line, tone: 'project-warning-text' })), ...c.pending.map((line) => ({ line, tone: 'text-muted-foreground' }))].map((n) => ({ ...n, channel: c.label })));
  return (
    <>
      <nav className="filterbar mb-3!">
        <Link className={'chip' + (!active ? ' active' : '')} href="/plan/roadmap?tab=channels">すべて</Link>
        {channels.map((c) => <Link key={c.id} className={'chip' + (active === c.id ? ' active' : '')} href={`/plan/roadmap?tab=channels&ch=${c.id}`}>{c.label}</Link>)}
      </nav>
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">チャネル</TableHead>
            <TableHead>役割</TableHead>
            <TableHead className="w-20">運用</TableHead>
            <TableHead className="w-36">本数の上限</TableHead>
            <TableHead className="w-28">週の上限</TableHead>
            <TableHead className="w-56">成功指標</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="align-top font-bold">{c.label}</TableCell>
              <TableCell className="align-top whitespace-normal text-xs">{c.role}</TableCell>
              <TableCell className="align-top text-xs">{c.state}</TableCell>
              <TableCell className="align-top text-xs">{c.slots.length} 枠・{c.planned} 本<div className="text-muted-foreground">週の上限の合計 {c.capacity} 本</div></TableCell>
              <TableCell className="align-top text-xs">{c.weekly}</TableCell>
              <TableCell className="align-top whitespace-normal text-xs">
                {c.metrics.map((m) => <div key={m.label}>{m.label}{m.status === 'unmeasured' && <span className="project-warning-text">（未計測）</span>}</div>)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>
      <p className="small text-muted-foreground mt-3! mb-1!">
        <span className={`inline-block h-3 w-3 align-middle ${CELL.attract}`} /> 集客　<span className={`inline-block h-3 w-3 align-middle ${CELL.sell}`} /> 販売　2027 年度の月は 2026 年度の実績を目安にした仮の月
      </p>
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>枠</TableHead>
            <TableHead className="w-24">資格</TableHead>
            <TableHead className="w-16">本数</TableHead>
            {months.map((m) => <TableHead key={m} className="w-7 px-0! text-center text-xs">{mon(m)}</TableHead>)}
          </TableRow>
        </TableHeader>
        {shown.map((c) => (
          <TableBody key={c.id}>
            <TableRow>
              <TableCell colSpan={3 + months.length} className="bg-muted text-xs font-bold">{c.label}</TableCell>
            </TableRow>
            {c.slots.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="whitespace-normal text-xs">{s.title}</TableCell>
                <TableCell className="whitespace-normal text-xs text-muted-foreground">{nameOf(s.exam)}</TableCell>
                <TableCell className="text-xs">{c.fill[s.id] ?? 0}/{s.count}{s.salesMax ? <span className="text-muted-foreground">（売{s.salesMax}）</span> : null}</TableCell>
                {months.map((m) => <TableCell key={m} className={'px-0!' + (inWindow(m, s.window) ? ` ${CELL[s.role]}` : '')} />)}
              </TableRow>
            ))}
          </TableBody>
        ))}
      </TableFrame>
      {notes.length > 0 && (
        <PanelCard title="確認すること">
          <ul className="small m-0 pl-4">
            {notes.map((n) => <li key={n.line} className={n.tone}>{n.channel}: {n.line}</li>)}
          </ul>
        </PanelCard>
      )}
    </>
  );
}
