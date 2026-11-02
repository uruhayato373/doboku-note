import { buildChannelView } from '../../../../scripts/lib/channel-economics.mjs';
import { loadRegistry } from '../../../../scripts/lib/qualification-registry.mjs';
import { qualificationShortLabel } from '../../../../scripts/lib/qualification-names.mjs';
import { findRepoRoot } from './repo-root';

/**
 * channels.ts — `/strategy/channels`（チャネル設計・人が見る画面）の表示モデル。
 * 組み立ては scripts/lib/channel-economics.mjs（npm run channel-economics と同じ実装）。正本は config/channel-strategy.json。
 * ここは型を付け、資格名を qualification-registry.json から引くだけで値を足さない。
 */

export type ChannelId = 'note' | 'kindle' | 'coconala';
export type ReceiptStatus = 'final' | 'to-date' | 'estimate' | 'missing';
export interface MonthRow {
  month: string;
  noteGross: number | null;
  note: number | null;
  kdp: number | null;
  coconala: number | null;
  status: Record<string, ReceiptStatus>;
  total: number | null;
  complete: boolean;
}
export interface UnitRow { channel: ChannelId; item: string; sales: number | null; avgPrice: number; netPerSale: number; estimated: boolean }
export interface Kpi { id: string; channel: ChannelId; label: string; unit: string; target: number; status: 'proposed' | 'approved'; why: string; actual: number | null; actualAt: string | null }
export interface FourC { customerValue: string; cost: string; convenience: string; communication: string }
export interface Channel { id: ChannelId; role: string; sells: string[]; notSell: string[]; fourC: FourC }
export interface ChannelView {
  today: string;
  noteKeepActual: number | null;
  monthly: MonthRow[];
  byQualification: { id: string; label: string; note: number; kindle: number; coconala: number }[];
  unit: UnitRow[];
  coconala: { listed: number; paused: number; views: number | null; favorites: number | null; orders: number | null; period: string | null; lastRevenueAt: string | null };
  kpis: Kpi[];
  kgi: { label: string; targetYen: number; lastFullMonth: string | null; lastFullTotal: number | null; lastFullComplete: boolean };
  fees: Record<ChannelId, { label: string; keepRate: number; basis: string; source: string; checkedAt: string }>;
  channels: Channel[];
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
}

export function loadChannelView(): ChannelView {
  const root = findRepoRoot();
  const view = buildChannelView(root);
  const registry = loadRegistry(root);
  const byQualification = Object.entries(view.byQualification as Record<string, { note: number; kindle: number; coconala: number }>)
    .map(([id, v]) => ({ id, label: id === 'unknown' ? '不明' : id === 'multiple' ? '複数資格' : (qualificationShortLabel(registry, id) ?? id), ...v }))
    .sort((a, b) => b.note + b.kindle + b.coconala - (a.note + a.kindle + a.coconala));
  return {
    ...(view as unknown as Omit<ChannelView, 'byQualification' | 'fees' | 'channels' | 'swot'>),
    byQualification,
    fees: view.strategy.fees,
    channels: view.strategy.channels,
    swot: view.strategy.swot,
  };
}
