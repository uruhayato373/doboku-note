import { ChannelGantt, type GanttRow } from '@/components/channel-gantt';
import { layoutLanes } from '../../../../scripts/lib/channel-gantt.mjs';
import { DetailList, DetailSheet, DetailText, FilterBar, FilterChip, PanelCard, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';

export type BoardSlot = {
  id: string; exam: string; title: string; role: 'attract' | 'sell'; window: { from: string; to: string };
  primaryCta: { kind: string; targets: string[] }; parents?: string[];
  reason: { reader: string; value: string; demand: string; next: string };
  stance: string; readableMaterials: { status: string; planned: string[]; candidates: string[]; products: string[]; make: string; angles: string[] };
};
export type BoardMark = { month: string; kind: string; tooltip: string };
export type BoardChannel = {
  id: string; label: string; role: string; state: string; weekly: string; planned: number; capacity: number;
  metrics: { label: string; state: string; ok: boolean }[]; slots: BoardSlot[]; pending: string[]; errors: string[];
};

const ANGLE: Record<string, string> = { conclusion: '結論', reason: '理由', experience: '体験', counter: '反論', number: '数字', howto: 'ハウツー' };
const KIND: Record<string, string> = { 'site-article': 'サイトの記事', 'links-hub': 'リンク集（/links）' };

const MARK: Record<string, string> = { youtube: 'YT', x: 'X', instagram: 'IG' };
const CELL: Record<BoardSlot['role'], string> = { attract: 'border-[var(--accent)]/30 bg-[var(--accent-fill)]', sell: 'border-[var(--accent)] bg-[var(--accent)]' };

/** 資格ごとの行へまとめる。行にある資格名は、バーの題名から外す */
function ganttRows(channels: BoardChannel[], months: string[], nameOf: (id: string) => string, marks: Record<string, BoardMark[]>): GanttRow[] {
  const slots = channels.flatMap((c) => c.slots.map((s) => ({ ...s, channel: c })));
  return [...new Set(slots.map((s) => s.exam))].map((exam) => ({
    key: exam,
    label: nameOf(exam),
    marks: (marks[exam] ?? []).map((m, i) => ({ key: `${exam}-${i}`, start: months.indexOf(m.month), kind: m.kind, tooltip: m.tooltip })),
    lanes: (layoutLanes(slots.filter((s) => s.exam === exam), months) as { item: (typeof slots)[number]; start: number; span: number }[][]).map((lane) => lane.map(({ item, start, span }) => ({
      key: `${item.channel.id}-${item.id}-${start}`,
      mark: MARK[item.channel.id] ?? item.channel.label,
      title: item.title.replace(/^(総監|建設部門|1級|2級)\s+/, ''),
      tooltip: `${item.channel.label}: ${item.title}`,
      role: item.role, start, span,
    }))),
  }));
}

/** 枠の送り先の名前 */
function targetNames(s: BoardSlot, targetLabel: (kind: string, id: string) => string) {
  return s.primaryCta.targets.length ? s.primaryCta.targets.map((t) => targetLabel(s.primaryCta.kind, t)) : [KIND[s.primaryCta.kind] ?? s.primaryCta.kind];
}


/** 枠の判断理由。一覧には出さず、名前を押すと開く */
function SlotReason({ slot }: { slot: BoardSlot }) {
  const r = slot.reason;
  const m = slot.readableMaterials;
  return (
    <DetailSheet trigger={slot.title} title={slot.title}>
      <DetailText
        title={m.status === 'proposed' ? '材料（提案）' : '材料'}
        items={[
          `立ち位置: ${slot.stance}`,
          ...m.planned.map((title) => `割り当て済み: ${title}`),
          ...m.candidates.map((title) => `候補の動画: ${title}`),
          ...m.products.map((title) => `使う商品: ${title}`),
          ...(m.make ? [`作るもの: ${m.make}`] : []),
          ...(m.angles.length ? [`切り口: ${m.angles.map((angle) => ANGLE[angle] ?? angle).join('・')}`] : []),
        ]}
      />
      <DetailText title="判断理由" items={[`読者の課題: ${r.reader}`, `提供価値: ${r.value}`, `需要: ${r.demand}`, `次の検証: ${r.next}`]} />
    </DetailSheet>
  );
}

/** YouTube の枠を起点に、同じ時期に動く X・Instagram の枠と送り先を横に並べる。YouTube の枠が無い枠は末尾に出す */
function WiringTable({ channels, nameOf, targetLabel }: { channels: BoardChannel[]; nameOf: (id: string) => string; targetLabel: (kind: string, id: string) => string }) {
  const [youtube, ...social] = channels;
  const linked = (id: string, c: BoardChannel) => c.slots.filter((s) => s.parents?.includes(id));
  const parents = new Set(youtube.slots.map((s) => s.id));
  const orphans = social.flatMap((c) => c.slots.filter((s) => !s.parents?.some((p) => parents.has(p))).map((s) => `${c.label}: ${s.title}`));
  const target = (s: BoardSlot) => targetNames(s, targetLabel);
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
                <TableCell className="align-top whitespace-normal text-xs"><SlotReason slot={s} /><span className="text-muted-foreground">（{s.window.from.slice(2).replace('-', '/')}〜{s.window.to.slice(2).replace('-', '/')}）</span></TableCell>
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
export function ChannelAnnualBoard({ channels, months, marks, notes: planNotes, nameOf, targetLabel, active, view }: {
  channels: BoardChannel[]; months: string[]; marks: Record<string, BoardMark[]>; notes: string[]; nameOf: (id: string) => string; targetLabel: (kind: string, id: string) => string; active?: string; view?: string;
}) {
  const shown = channels.filter((c) => !active || c.id === active);
  const notes = shown.flatMap((c) => [...c.errors.map((line) => ({ line, tone: 'project-warning-text' })), ...c.pending.map((line) => ({ line, tone: 'text-muted-foreground' }))].map((n) => ({ ...n, channel: c.label })));
  return (
    <>
      <FilterBar className="mb-3!">
        <FilterChip active={!active && view !== 'wiring'} href="/plan/roadmap?tab=channels">すべて</FilterChip>
        {channels.map((c) => <FilterChip key={c.id} active={active === c.id} href={`/plan/roadmap?tab=channels&ch=${c.id}`}>{c.label}</FilterChip>)}
        <FilterChip active={view === 'wiring'} href="/plan/roadmap?tab=channels&view=wiring">配線</FilterChip>
      </FilterBar>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
        {shown.map((c) => (
          <span key={c.id}>
            <strong>{c.label}</strong>
            {c.state !== '運用中' && <span className="project-warning-text">（{c.state}）</span>}
            {c.metrics.map((m) => <span key={m.label} className="ml-2">{m.label}<span className={m.ok ? 'text-muted-foreground' : 'project-warning-text'}>（{m.state}）</span></span>)}
          </span>
        ))}
        <DetailSheet trigger="役割と上限" title="チャネルの役割と上限">
          {shown.map((c) => (
            <section key={c.id}>
              <h3 className="mb-1 text-sm font-semibold">{c.label}</h3>
              <DetailList items={[{ label: '役割', value: c.role }, { label: '運用', value: c.state }, { label: '本数', value: `${c.slots.length} 枠・${c.planned} 本（週の上限の合計 ${c.capacity} 本）` }, { label: '週の上限', value: c.weekly }]} />
            </section>
          ))}
          <DetailText title="計画の前提" items={planNotes} />
        </DetailSheet>
      </div>
      {view !== 'wiring' && <p className="small text-muted-foreground mt-3! mb-1!">
        <span className={`inline-block h-3 w-3 rounded-[3px] border align-middle ${CELL.attract}`} /> 集客　<span className={`inline-block h-3 w-3 rounded-[3px] border align-middle ${CELL.sell}`} /> 販売　YT・X・IG はチャネル。● 試験 ◆ 発表 ■ 申込。乗ると全文が出る。2027 年度の月は 2026 年度の実績を目安にした仮の月
      </p>}
      {view === 'wiring' ? <WiringTable channels={channels} nameOf={nameOf} targetLabel={targetLabel} /> : <ChannelGantt months={months} rows={ganttRows(shown, months, nameOf, marks)} />}
      {view !== 'wiring' && notes.length > 0 && (
        <PanelCard title="確認すること">
          <ul className="small m-0 pl-4">
            {notes.map((n) => <li key={n.line} className={n.tone}>{n.channel}: {n.line}</li>)}
          </ul>
        </PanelCard>
      )}
    </>
  );
}
