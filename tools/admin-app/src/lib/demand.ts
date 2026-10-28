import { loadDemandView, researchDue } from '../../../../scripts/lib/demand-map.mjs';
import { todayJst } from '../../../../scripts/lib/jst-date.mjs';
import { loadRegistry } from '../../../../scripts/lib/qualification-registry.mjs';
import { qualificationShortLabel } from '../../../../scripts/lib/qualification-names.mjs';
import { findRepoRoot } from './repo-root';

/**
 * demand.ts — `/strategy/demand`（悩みと商品候補・人が見る画面）の表示モデル。
 * 組み立ては scripts/lib/demand-map.mjs（正本 config/demand-map.json・打ち手は experiments.json・実売は note の売上）。
 * ここは型を付け、資格名を qualification-registry.json から引くだけで値を足さない。
 */

export type Harm = 'H' | 'A' | 'R' | 'M';
export interface Evidence {
  kind: string;
  summary: string;
  value?: string;
  source: string;
  observedAt: string;
}
export interface Pain {
  id: string;
  label: string;
  harm: Harm[];
  depth: 'core' | 'shallow';
  why: string;
  phrases: string[];
  evidence: Evidence[];
  hypothesis?: string;
  hubs?: { title: string; status: string; path?: string; positions: string[]; note?: string }[];
  candidateCount: { similar: number; differentiated: number };
  actionCount: number;
}
export interface Position {
  id: string;
  label: string;
  status: 'live' | 'candidate' | 'hold';
  topic?: string;
  pains: string[];
  evidence: Evidence[];
  note?: string;
}
export interface Candidate {
  id: string;
  title: string;
  qualification: string;
  qualificationLabel: string;
  pain: string;
  positions: string[];
  axis: 'similar' | 'differentiated';
  harm: Harm[];
  readerProblem: string;
  value: string;
  payReason: string;
  format: string;
  priceIdea?: string;
  demandEvidence: Evidence[];
  unverified: string[];
  metric: string;
  judgeDate: string;
  stopCondition: string;
  nextCheck: string;
  status: string;
  productIds?: string[];
  salesIds?: string[];
  experimentId?: string;
  card?: string;
  sold: { count: number; yen: number } | null;
}
export interface Action {
  id: string;
  title: string;
  status: string;
  painId: string;
  harm: Harm[];
  metric: string;
  judgeDate: string | null;
  stopCondition: string | null;
  card: string | null;
}
export interface AxisTotal {
  candidates: number;
  selling: number;
  count: number;
  yen: number;
}
export interface ResearchDue {
  last: { date: string; qualification: string; scope: string } | null;
  next: string;
  nextLabel: string;
  dueDate: string;
  due: boolean;
}
export interface DemandView {
  updatedAt: string;
  pains: Pain[];
  positions: Position[];
  candidates: Candidate[];
  actions: Action[];
  axisTotals: Record<'similar' | 'differentiated', AxisTotal>;
  research: ResearchDue;
  errors: string[];
}

export function loadDemand(): DemandView | null {
  const root = findRepoRoot();
  const view = loadDemandView(root) as (Omit<DemandView, 'candidates' | 'research'> & { candidates: Omit<Candidate, 'qualificationLabel'>[]; research: { intervalDays: number; rotation: string[]; runs: { date: string; qualification: string; scope: string }[] } }) | null;
  if (!view) return null;
  const registry = loadRegistry(root);
  const due = researchDue({ research: view.research }, todayJst());
  return {
    ...view,
    research: { last: due.last, next: due.next, nextLabel: qualificationShortLabel(registry, due.next) ?? due.next, dueDate: due.dueDate, due: due.due },
    candidates: view.candidates.map((c) => ({ ...c, qualificationLabel: qualificationShortLabel(registry, c.qualification) ?? c.qualification })),
  };
}
