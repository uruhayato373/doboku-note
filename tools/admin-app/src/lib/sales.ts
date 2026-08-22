import { readFileSync } from 'node:fs';
import { repoPath } from './repo-root';

/**
 * sales.ts — 収益実績（読み取り専用）。
 * .claude/state/sales/sales-log.json を月次・商品別に集計（tools/admin/lib/sales.mjs 移植）。
 */

const MILESTONE = 15000; // Web 月収マイルストーン（iOS 着手判断トリガー）

const monthOf = (d: string) => d.slice(0, 7);

export interface ProductAgg {
  title: string;
  count: number;
  revenue: number;
}
export interface MonthAgg {
  month: string;
  count: number;
  revenue: number;
  milestone: boolean;
  products: ProductAgg[];
}
export interface SalesSummary {
  source: string | null;
  updatedAt: string | null;
  currency: string;
  milestone: number;
  months: MonthAgg[];
  total: { count: number; revenue: number; months: number };
}

interface SaleRow {
  date: string;
  title: string;
  price: number;
}

export function salesSummary(): SalesSummary {
  let data: { sales?: SaleRow[]; source?: string; updatedAt?: string; currency?: string };
  try {
    data = JSON.parse(readFileSync(repoPath('.claude', 'state', 'sales', 'sales-log.json'), 'utf8'));
  } catch {
    return { source: null, updatedAt: null, currency: 'JPY', milestone: MILESTONE, months: [], total: { count: 0, revenue: 0, months: 0 } };
  }
  const sales = data.sales ?? [];

  const byMonth: Record<string, { month: string; count: number; revenue: number; products: Record<string, ProductAgg> }> = {};
  for (const s of sales) {
    const m = monthOf(s.date);
    (byMonth[m] ??= { month: m, count: 0, revenue: 0, products: {} });
    byMonth[m]!.count++;
    byMonth[m]!.revenue += s.price;
    const k = s.title;
    (byMonth[m]!.products[k] ??= { title: k, count: 0, revenue: 0 });
    byMonth[m]!.products[k]!.count++;
    byMonth[m]!.products[k]!.revenue += s.price;
  }

  const months: MonthAgg[] = Object.keys(byMonth)
    .sort()
    .map((m) => {
      const mm = byMonth[m]!;
      return {
        month: m,
        count: mm.count,
        revenue: mm.revenue,
        milestone: mm.revenue >= MILESTONE,
        products: Object.values(mm.products).sort((a, b) => b.revenue - a.revenue),
      };
    });

  const total = {
    count: sales.length,
    revenue: sales.reduce((s, x) => s + x.price, 0),
    months: months.length,
  };
  return {
    source: data.source ?? null,
    updatedAt: data.updatedAt ?? null,
    currency: data.currency ?? 'JPY',
    milestone: MILESTONE,
    months,
    total,
  };
}
