import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findRepoRoot } from './repo-root';

/**
 * competitors.ts — `/strategy/competitors`（競合・人が見る画面）の表示モデル。
 *
 * 正本は scout-coconala-competitors.mjs が書く時系列 `.claude/state/coconala/history/competitors-*.json`。
 * 最新の 1 本を今の値、同じセラーが載っている過去の 1 本を比較の基準にする（新規追跡は基準なし）。
 * 値を足さない・推測しない。取得できていない値は null のまま渡す。
 */

type RawCompetitor = {
  handle: string;
  label: string;
  exams: string[];
  counts?: { services?: number };
  price?: { min?: number; median?: number; max?: number } | null;
  platformExtra?: { totalSales?: number; totalReviews?: number; avgRating?: number };
};
type RawSnapshot = {
  fetchedAt: string;
  competitors: RawCompetitor[];
  drift?: { handle: string; type: string; detail: string }[];
};

export type CompetitorRow = {
  handle: string;
  label: string;
  exams: string[];
  services: number | null;
  priceMin: number | null;
  priceMedian: number | null;
  priceMax: number | null;
  sales: number | null;
  rating: number | null;
  /** 基準スナップショットからの累計販売の増分（基準なし＝null）。 */
  salesDelta: number | null;
  /** 基準スナップショットの日付（YYYY-MM-DD）。 */
  baseDate: string | null;
  /** 価格・品揃えの変化（sales 以外の drift）。基準との差から組み立てる。 */
  changes: string[];
};

export type CompetitorView = {
  platform: 'coconala';
  fetchedDate: string | null;
  rows: CompetitorRow[];
  examLabels: Record<string, string>;
};

const HISTORY_RE = /^competitors-(\d{4}-\d{2}-\d{2})\.json$/;
/** 比較の基準は最新から 30 日以上前の直近スナップショット（無ければ直前の 1 本）。数日前の再取得と比べても変化が見えないため。 */
const BASE_MIN_DAYS = 30;
const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

function changesBetween(base: RawCompetitor, now: RawCompetitor): string[] {
  const out: string[] = [];
  const yen = (n?: number) => (typeof n === 'number' ? `¥${n.toLocaleString('ja-JP')}` : '—');
  const bs = base.counts?.services;
  const ns = now.counts?.services;
  if (typeof bs === 'number' && typeof ns === 'number' && bs !== ns) out.push(`出品 ${bs}→${ns}`);
  for (const [key, name] of [['min', '最低'], ['median', '中央'], ['max', '最高']] as const) {
    const b = base.price?.[key];
    const n = now.price?.[key];
    if (typeof b === 'number' && typeof n === 'number' && b !== n) out.push(`${name} ${yen(b)}→${yen(n)}`);
  }
  return out;
}

export function loadCompetitorView(): CompetitorView {
  const root = findRepoRoot();
  const dir = join(root, '.claude/state/coconala/history');
  const files = existsSync(dir)
    ? readdirSync(dir)
        .map((f) => ({ f, m: HISTORY_RE.exec(f) }))
        .filter((x): x is { f: string; m: RegExpExecArray } => x.m !== null)
        .map(({ f, m }) => ({ date: m[1]!, path: join(dir, f) }))
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const snaps = files
    .map((x) => ({ date: x.date, snap: readJson<RawSnapshot>(x.path) }))
    .filter((x): x is { date: string; snap: RawSnapshot } => x.snap !== null);

  const registry = readJson<{ qualifications: { id: string; label: string }[] }>(
    join(root, '.claude/config/qualification-registry.json'),
  );
  const examLabels = Object.fromEntries((registry?.qualifications ?? []).map((q) => [q.id, q.label]));

  const latest = snaps[0];
  if (!latest) return { platform: 'coconala', fetchedDate: null, rows: [], examLabels };

  const rows: CompetitorRow[] = latest.snap.competitors.map((c) => {
    const has = (s: (typeof snaps)[number]) => s.snap.competitors.some((x) => x.handle === c.handle);
    const older = snaps.slice(1).filter(has);
    const base = older.find((s) => daysBetween(s.date, latest.date) >= BASE_MIN_DAYS) ?? older[0];
    const prev = base?.snap.competitors.find((x) => x.handle === c.handle);
    const sales = c.platformExtra?.totalSales ?? null;
    const prevSales = prev?.platformExtra?.totalSales;
    return {
      handle: c.handle,
      label: c.label,
      exams: c.exams,
      services: c.counts?.services ?? null,
      priceMin: c.price?.min ?? null,
      priceMedian: c.price?.median ?? null,
      priceMax: c.price?.max ?? null,
      sales,
      rating: c.platformExtra?.avgRating ?? null,
      salesDelta: sales !== null && typeof prevSales === 'number' ? sales - prevSales : null,
      baseDate: base?.date ?? null,
      changes: prev ? changesBetween(prev, c) : [],
    };
  });
  return { platform: 'coconala', fetchedDate: latest.date, rows, examLabels };
}
