import { ChannelGantt, type GanttRow } from '@/components/channel-gantt';
import { layoutLanes } from '../../../../scripts/lib/channel-gantt.mjs';
import { DetailList, DetailSheet, DetailText, FilterBar, FilterChip, PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { STANCE_STATE, type WiringPosition } from '@/lib/competitor-positions';

export type BoardSlot = {
  id: string; exam: string; title: string; role: 'attract' | 'sell'; window: { from: string; to: string };
  primaryCta: { kind: string; targets: string[] }; parents?: string[];
  reason: { reader: string; value: string; demand: string; next: string };
  stance: string; stanceId: string; count?: number; readableMaterials: { status: string; planned: string[]; candidates: string[]; products: string[]; make: string; angles: string[] };
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
function SlotReason({ slot, label }: { slot: BoardSlot; label?: string }) {
  const r = slot.reason;
  const m = slot.readableMaterials;
  return (
    <DetailSheet trigger={label ?? slot.title} title={slot.title}>
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

const shortMonth = (ym: string) => ym.slice(2).replace('-', '/');

/** 複数の枠をまとめた期間 */
function spanOf(slots: BoardSlot[]) {
  const from = slots.map((s) => s.window.from).sort()[0];
  const to = slots.map((s) => s.window.to).sort().at(-1);
  return from === to ? shortMonth(from!) : `${shortMonth(from!)}〜${shortMonth(to!)}`;
}

/** 送り先は重ねず、多いときは数だけ見せる */
function TargetList({ names }: { names: string[] }) {
  const unique = [...new Set(names)];
  const head = unique.slice(0, 3);
  return (
    <div className="flex flex-col gap-0.5">
      {head.map((name) => <span key={name}>{name}</span>)}
      {unique.length > head.length && (
        <DetailSheet trigger={`ほか ${unique.length - head.length} 件`} title="送り先">
          <DetailText title="送り先" items={unique} />
        </DetailSheet>
      )}
    </div>
  );
}

/** 資格を 1 つ選び、立ち位置ごとに枠と送り先を時期の順で読む。枠は必ず 1 つの立ち位置に属すので重ならない */
function WiringBoard({ channels, positions, current, targetLabel }: { channels: BoardChannel[]; positions: WiringPosition[]; current?: string; targetLabel: (kind: string, id: string) => string }) {
  const position = positions.find((p) => p.id === current) ?? positions[0];
  const slots = channels.flatMap((c) => c.slots.map((s) => ({ ...s, channel: c })));
  const rows = position.stances
    .map((stance) => ({ stance, slots: slots.filter((s) => s.stanceId === stance.id) }))
    .filter((row) => row.slots.length > 0)
    .sort((a, b) => a.slots.map((s) => s.window.from).sort()[0].localeCompare(b.slots.map((s) => s.window.from).sort()[0]));
  const others = position.stances.filter((stance) => !slots.some((s) => s.stanceId === stance.id));
  return (
    <div className="mt-3 flex flex-col gap-3">
      <FilterBar>
        {positions.map((p) => <FilterChip key={p.id} active={p.id === position.id} href={`/plan/roadmap?tab=channels&view=wiring&position=${p.id}`}>{p.label}</FilterChip>)}
      </FilterBar>
      <p className="m-0 text-sm">{position.summary}</p>
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[12%]">時期</TableHead>
            <TableHead className="w-[28%]">取る立ち位置</TableHead>
            <TableHead className="w-[38%]">出す枠</TableHead>
            <TableHead>送り先</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ stance, slots: own }) => (
            <TableRow key={stance.id}>
              <TableCell className="align-top text-xs whitespace-nowrap">{spanOf(own)}</TableCell>
              <TableCell className="align-top whitespace-normal text-xs">
                <div className="mb-1 font-semibold">{stance.text}</div>
                <span className="text-muted-foreground">{stance.stage}</span>{' '}
                <StatusBadge tone={STANCE_STATE[stance.state]?.tone ?? 'neutral'}>{STANCE_STATE[stance.state]?.label ?? stance.state}</StatusBadge>
              </TableCell>
              <TableCell className="align-top whitespace-normal text-xs">
                <div className="flex flex-col gap-1.5">
                  {own.map((s) => (
                    <div key={`${s.channel.id}-${s.id}`} className="flex items-baseline gap-1.5">
                      <span className="w-5 shrink-0 font-semibold text-muted-foreground">{MARK[s.channel.id]}</span>
                      <span>
                        <SlotReason slot={s} label={s.title.replace(/^(総監|建設部門|主任技士|コンクリート技士|診断士|RCCM|技術士一次)\s+(?!の)/, '')} />
                        <span className="ml-1 whitespace-nowrap text-muted-foreground">{shortMonth(s.window.from)}〜{shortMonth(s.window.to)}{s.count ? `・${s.count} 本` : ''}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell className="align-top whitespace-normal text-xs"><TargetList names={own.flatMap((s) => targetNames(s, targetLabel))} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>
      {others.length > 0 && (
        <p className="small m-0 text-muted-foreground">YouTube・X・Instagram の枠を持たない立ち位置: {others.map((stance) => stance.text).join(' / ')}</p>
      )}
    </div>
  );
}

/** チャネルの年間の枠を 1 枚で見る。正本は config/channel-annual-plan.json。書き込みはしない */
export function ChannelAnnualBoard({ channels, months, marks, notes: planNotes, nameOf, targetLabel, active, view, positions, position }: {
  positions: WiringPosition[]; position?: string; channels: BoardChannel[]; months: string[]; marks: Record<string, BoardMark[]>; notes: string[]; nameOf: (id: string) => string; targetLabel: (kind: string, id: string) => string; active?: string; view?: string;
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
        {view !== 'wiring' && shown.map((c) => (
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
        <span className={`inline-block h-3 w-3 rounded-[3px] border align-middle ${CELL.attract}`} /> 集客{" "}<span className={`inline-block h-3 w-3 rounded-[3px] border align-middle ${CELL.sell}`} /> 販売{" "}YT・X・IG はチャネル。● 試験 ◆ 発表 ■ 申込。乗ると全文が出る。2027 年度の月は 2026 年度の実績を目安にした仮の月
      </p>}
      {view === 'wiring' ? <WiringBoard channels={channels} positions={positions} current={position} targetLabel={targetLabel} /> : <ChannelGantt months={months} rows={ganttRows(shown, months, nameOf, marks)} />}
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
