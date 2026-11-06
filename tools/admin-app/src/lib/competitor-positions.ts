import { examPresence, loadCompetitorPositionsAudit, positionLabel, rivalFacts, runProbe } from '../../../../scripts/lib/competitor-positions.mjs';
import { readDataset } from '../../../../scripts/lib/dataset-io.mjs';
import { findRepoRoot } from './repo-root';

export type PositionRow = {
  id: string;
  label: string;
  summary: string;
  reviewedOn: string;
  rivals: { channel: string; label: string; holds: string; facts: string; date: string }[];
  stances: { stage: string; text: string; why: string; state: string; probe: string; slots: number }[];
  avoid: { text: string; why: string }[];
  limits: string[];
};
export type PositionView = { rows: PositionRow[]; problems: string[] };

type LedgerProbe = { exam: string; channel: string; match: string; max: number; claim: string; paidOnly?: boolean };
type LedgerPosition = Omit<PositionRow, 'label' | 'rivals' | 'stances'> & {
  exams: string[];
  rivals: { channel: string; handle: string; holds: string }[];
  stances: { id: string; stage: string; text: string; why: string; state: string; probes: LedgerProbe[] }[];
};

const CHANNEL_LABEL: Record<string, string> = { youtube: 'YouTube', note: 'note', coconala: 'ココナラ', x: 'X', instagram: 'Instagram', courses: '講座' };

/** 立ち位置の id → 人が読む文 */
export function stanceLabels(root: string): Map<string, string> {
  const ledger = readDataset(root, 'config.competitor-positions') as { positions: { stances: { id: string; text: string }[] }[] };
  return new Map(ledger.positions.flatMap((p) => p.stances.map((s) => [s.id, s.text] as [string, string])));
}

export function loadPositionView(): PositionView {
  const { ledger, tracked, market, scan, snapshots, plan, registry, audit, planAudit } = loadCompetitorPositionsAudit(findRepoRoot());
  const slots = [...plan.slots, ...plan.channels.x.slots, ...plan.channels.instagram.slots];
  const labelOf = (channel: string, handle: string) => tracked[channel]?.competitors?.find((c: { handle: string }) => c.handle === handle)?.label ?? handle;
  const rows: PositionRow[] = (ledger.positions as LedgerPosition[]).map((p) => ({
    id: p.id,
    label: positionLabel(p, registry),
    summary: p.summary,
    reviewedOn: p.reviewedOn,
    limits: p.limits,
    avoid: p.avoid,
    rivals: p.rivals.map((r) => {
      const facts = rivalFacts(r, snapshots);
      const presence = examPresence(r, p.exams, market, scan);
      return { channel: CHANNEL_LABEL[r.channel] ?? r.channel, label: labelOf(r.channel, r.handle), holds: r.holds, facts: [presence, facts.text].filter(Boolean).join(' ／ '), date: facts.date ?? '—' };
    }),
    stances: p.stances.map((a) => ({
      stage: a.stage,
      text: a.text,
      why: a.why,
      state: a.state,
      slots: slots.filter((s: { stance?: string }) => s.stance === a.id).length,
      probe: a.probes.map((probe) => {
        const r = runProbe(probe, market, scan, ledger.self);
        return `${CHANNEL_LABEL[probe.channel]} ${r.checked} 件中 ${r.hits} 件`;
      }).join('・') || '—',
    })),
  }));
  return { rows, problems: [...audit.errors, ...planAudit.errors] };
}
