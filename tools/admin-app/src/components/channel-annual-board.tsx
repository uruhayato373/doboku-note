import Link from 'next/link';
import { PanelCard, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';

export type BoardSlot = {
  id: string; exam: string; title: string; role: 'attract' | 'sell'; window: { from: string; to: string }; count: number; salesMax?: number;
  primaryCta: { kind: string; targets: string[] }; parents?: string[];
};
export type BoardChannel = {
  id: string; label: string; role: string; state: string; weekly: string; planned: number; capacity: number;
  metrics: { label: string; status: string }[]; fill: Record<string, number>; slots: BoardSlot[]; pending: string[]; errors: string[];
};

const mon = (ym: string) => `${Number(ym.slice(5))}`;
const inWindow = (m: string, w: BoardSlot['window']) => m >= w.from && m <= w.to;
const CELL: Record<BoardSlot['role'], string> = { attract: 'bg-[var(--accent-fill)]', sell: 'bg-[var(--accent)]' };

const KIND: Record<string, string> = { 'site-article': 'サイトの記事', 'links-hub': 'リンク集（/links）' };

/** YouTube の枠を起点に、同じ時期に動く X・Instagram の枠と送り先を横に並べる。YouTube の枠が無い枠は末尾に出す */
function WiringTable({ channels, nameOf, targetLabel }: { channels: BoardChannel[]; nameOf: (id: string) => string; targetLabel: (kind: string, id: string) => string }) {
  const [youtube, ...social] = channels;
  const linked = (id: string, c: BoardChannel) => c.slots.filter((s) => s.parents?.includes(id));
  const parents = new Set(youtube.slots.map((s) => s.id));
  const orphans = social.flatMap((c) => c.slots.filter((s) => !s.parents?.some((p) => parents.has(p))).map((s) => `${c.label}: ${s.title}`));
  const target = (s: BoardSlot) => (s.primaryCta.targets.length ? s.primaryCta.targets.map((t) => targetLabel(s.primaryCta.kind, t)) : [KIND[s.primaryCta.kind] ?? s.primaryCta.kind]);
  const exams = [...new Set(youtube.slots.map((s) => s.exam))];
  return (
    <div className="mt-3">
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[24%]">YouTube の枠</TableHead>
            {social.map((c) => <TableHead key={c.id} className="w-[22%]">{c.label} の枠</TableHead>)}
            <TableHead>YouTube の送り先</TableHead>
          </TableRow>
        </TableHeader>
        {exams.map((exam) => (
          <TableBody key={exam}>
            <TableRow>
              <TableCell colSpan={2 + social.length} className="bg-muted text-xs font-bold">{nameOf(exam)}</TableCell>
            </TableRow>
            {youtube.slots.filter((s) => s.exam === exam).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="align-top whitespace-normal text-xs">{s.title}<span className="text-muted-foreground">（{s.window.from.slice(2).replace('-', '/')}〜{s.window.to.slice(2).replace('-', '/')}）</span></TableCell>
                {social.map((c) => (
                  <TableCell key={c.id} className="align-top whitespace-normal text-xs">
                    {linked(s.id, c).map((x) => <div key={x.id}>{x.title}<div className="text-muted-foreground">→ {target(x).join('・')}</div></div>)}
                    {linked(s.id, c).length === 0 && <span className="text-muted-foreground">—</span>}
                  </TableCell>
                ))}
                <TableCell className="align-top whitespace-normal text-xs">{target(s).map((t) => <div key={t}>{t}</div>)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        ))}
      </TableFrame>
      {orphans.length > 0 && <p className="small text-muted-foreground">YouTube の枠が無い枠: {orphans.join(' / ')}</p>}
    </div>
  );
}

/** チャネルの年間の枠を 1 枚で見る。正本は config/channel-annual-plan.json。書き込みはしない */
export function ChannelAnnualBoard({ channels, months, nameOf, targetLabel, active, view }: {
  channels: BoardChannel[]; months: string[]; nameOf: (id: string) => string; targetLabel: (kind: string, id: string) => string; active?: string; view?: string;
}) {
  const shown = channels.filter((c) => !active || c.id === active);
  const notes = shown.flatMap((c) => [...c.errors.map((line) => ({ line, tone: 'project-warning-text' })), ...c.pending.map((line) => ({ line, tone: 'text-muted-foreground' }))].map((n) => ({ ...n, channel: c.label })));
  return (
    <>
      <nav className="filterbar mb-3!">
        <Link className={'chip' + (!active ? ' active' : '')} href="/plan/roadmap?tab=channels">すべて</Link>
        {channels.map((c) => <Link key={c.id} className={'chip' + (active === c.id ? ' active' : '')} href={`/plan/roadmap?tab=channels&ch=${c.id}`}>{c.label}</Link>)}
        <Link className={'chip' + (view === 'wiring' ? ' active' : '')} href="/plan/roadmap?tab=channels&view=wiring">配線</Link>
      </nav>
      {view !== 'wiring' && <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">チャネル</TableHead>
            <TableHead className="min-w-48">役割</TableHead>
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
              <TableCell className="min-w-48 align-top whitespace-normal text-xs">{c.role}</TableCell>
              <TableCell className="align-top text-xs">{c.state}</TableCell>
              <TableCell className="align-top text-xs">{c.slots.length} 枠・{c.planned} 本<div className="text-muted-foreground">週の上限の合計 {c.capacity} 本</div></TableCell>
              <TableCell className="align-top text-xs">{c.weekly}</TableCell>
              <TableCell className="align-top whitespace-normal text-xs">
                {c.metrics.map((m) => <div key={m.label}>{m.label}{m.status === 'unmeasured' && <span className="project-warning-text">（未計測）</span>}</div>)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>}
      {view !== 'wiring' && <p className="small text-muted-foreground mt-3! mb-1!">
        <span className={`inline-block h-3 w-3 align-middle ${CELL.attract}`} /> 集客　<span className={`inline-block h-3 w-3 align-middle ${CELL.sell}`} /> 販売　2027 年度の月は 2026 年度の実績を目安にした仮の月
      </p>}
      {view === 'wiring' ? <WiringTable channels={channels} nameOf={nameOf} targetLabel={targetLabel} /> : <TableFrame>
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
      </TableFrame>}
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
