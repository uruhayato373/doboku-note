import { loadMarketInputs } from '../../../../scripts/lib/market-inputs.mjs';
import { buildMarketView, validateMarketInputs } from '../../../../scripts/lib/qualification-market.mjs';
import { findRepoRoot } from './repo-root';

/**
 * market.ts — `/strategy/market`（展開の判断・人が見る画面）の表示モデル。
 *
 * 組み立ては scripts/lib/qualification-market.mjs（npm run qualification-market と同じ実装）。
 * 正本は exam-formats.json（出題形式）・exam-stats.json（受験者数）・exam-calendar.json（試験日）・
 * sales-log.json＋product-lineup.json（売上）・market-scan.json と .claude/state/market（混み具合）・
 * *-competitors.json（追跡数）。ここは型を付けて渡すだけで、値を足さない。
 */

export type Density = 'none' | 'low' | 'mid' | 'high' | null;
export interface ChannelCell {
  density: Density;
  strong?: number;
  results?: number;
  medianPrice?: number | null;
  top?: { name: string; id: string | null; value: number }[];
  /** ココナラ: 資格専用の検索語が未取得で、汎用の検索結果から数えた下限 */
  partial?: boolean;
  tracked: string[];
}
export interface MarketStage {
  key: string;
  label: string;
  types: string[];
  compose: boolean;
  examinees: number | null;
  examDate: string | null;
  examWindow: string | null;
  buy: { from: string; to: string } | null;
  salesYen: number;
}
export interface MarketRow {
  id: string;
  label: string;
  family: string;
  portfolio: string;
  stages: MarketStage[];
  composeExaminees: number | null;
  pastExams: { questions: string; answers: string } | null;
  salesYen: number;
  salesByMonth: Record<string, number>;
  channels: Record<'note' | 'youtube' | 'coconala' | 'x' | 'ig', ChannelCell>;
  scannedAt: string | null;
  actions: string[];
}
export interface MarketView {
  today: string;
  rows: MarketRow[];
  formatTypes: Record<string, string>;
  pastExamLevels: Record<string, string>;
  errors: string[];
}

export function loadMarketView(): MarketView {
  const input = loadMarketInputs(findRepoRoot());
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const view = buildMarketView({ ...input, today }) as unknown as Omit<MarketView, 'errors'>;
  return { ...view, errors: validateMarketInputs(input) as string[] };
}
