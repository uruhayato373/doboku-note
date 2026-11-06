import { examPresence, loadCompetitorPositionsAudit, positionLabel, rivalFacts, runProbe, slotMaterials } from '../../../../scripts/lib/competitor-positions.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

type ReadableSlot = { id: string; stance: string; reason: { demand: string }; primaryCta: { targets: string[] }; materials: { status: string; packs: string[]; products: string[]; make: string; angles?: string[] } };

/** 枠の立ち位置と材料を人が読む題名へ置き換える。束ね方は slotMaterials が正本 */
export function slotReader(root: string, plan: { entries: unknown[] }) {
  const ledger = readDataset(root, 'config.competitor-positions') as { positions: { stances: { id: string; text: string }[] }[] };
  const stances = new Map(ledger.positions.flatMap((p) => p.stances.map((s) => [s.id, s.text] as [string, string])));
  const catalog = readDataset(root, 'config.products') as { products: { id: string; catalog?: { title?: string; shortTitle?: string } }[] };
  const products = new Map(catalog.products.map((p) => [p.id, p.catalog?.shortTitle ?? p.catalog?.title ?? p.id]));
  const packTitle = (pack: string) => {
    try {
      return (JSON.parse(readFileSync(join(root, 'content/sns/video-packs', pack, 'video-pack.json'), 'utf8')) as { title?: string }).title ?? pack;
    } catch {
      return pack;
    }
  };
  return <T extends ReadableSlot>(slot: T) => {
    const m = slotMaterials(slot, plan);
    return {
      ...slot,
      stance: stances.get(slot.stance) ?? slot.stance,
      reason: { ...slot.reason, demand: slot.reason.demand.replace(/（立ち位置 [a-z0-9-]+）/, '') },
      readableMaterials: {
        status: m.status,
        planned: (m.planned as { id: string; title: string | null; pack: string | null }[]).map((e) => e.title ?? (e.pack ? packTitle(e.pack) : e.id)),
        candidates: (m.candidates as string[]).map(packTitle),
        products: (m.products as string[]).map((id) => products.get(id) ?? id),
        make: m.make as string,
        angles: m.angles as string[],
      },
    };
  };
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
