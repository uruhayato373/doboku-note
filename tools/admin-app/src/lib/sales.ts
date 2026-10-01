import { readFileSync } from 'node:fs';
import { repoPath } from './repo-root';
import { normalizeNoteTitle } from '../../../../scripts/lib/business-direction.mjs';
import { canonicalizeProductId } from '../../../../scripts/lib/sales-normalize.mjs';
import { ctaProductIdFromSalesProductId } from '../../../../scripts/lib/note-funnel-efficiency.mjs';
import { MEMBERSHIP_PRODUCTS } from '../../../../scripts/lib/site-to-sales.mjs';

/**
 * sales.ts — 収益実績（読み取り専用）。
 * data/sales/sales-log.json を月次・商品別に集計（tools/admin/lib/sales.mjs 移植）。
 */

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
  products: ProductAgg[];
}
export interface SalesSummary {
  source: string | null;
  updatedAt: string | null;
  currency: string;
  months: MonthAgg[];
  total: { count: number; revenue: number; months: number };
}

interface SaleRow {
  date: string;
  title: string;
  price: number;
  productId?: string;
  type?: string;
}

export interface ProductSales { count: number; revenue: number; lastDate: string }

/**
 * 台帳の行に付ける note の販売実績（累計）。読めなければ null（0 件と区別する）。
 * マガジンは productId（note-magazines.ts の id。建設部門の bk-* は ctaProductIdFromSalesProductId で読み替える）で引く。単品記事の productId（article:<slug>）は原稿のパスと
 * 結び付いていないので、題名で原稿へ当てる（matchArticleSales）。
 */
export function loadProductSales(): { byMagazine: Map<string, ProductSales>; articles: (ProductSales & { id: string; titles: string[] })[] } | null {
  let sales: SaleRow[];
  try {
    sales = (JSON.parse(readFileSync(repoPath('data', 'sales', 'sales-log.json'), 'utf8')) as { sales?: SaleRow[] }).sales ?? [];
  } catch {
    return null;
  }
  const byId = new Map<string, ProductSales & { titles: Set<string> }>();
  for (const s of sales) {
    if (!s.productId) continue;
    const id = canonicalizeProductId(s.productId) as string;
    const agg = byId.get(id) ?? { count: 0, revenue: 0, lastDate: '', titles: new Set<string>() };
    agg.count += 1;
    agg.revenue += s.price;
    if (s.date > agg.lastDate) agg.lastDate = s.date;
    agg.titles.add(normalizeNoteTitle(s.title) as string);
    byId.set(id, agg);
  }
  const byMagazine = new Map<string, ProductSales>();
  const articles: (ProductSales & { id: string; titles: string[] })[] = [];
  for (const [id, { titles, ...agg }] of byId) {
    if (id.startsWith('article:')) articles.push({ ...agg, id, titles: [...titles] });
    else {
      // 会員プラン（membership:civil-lab-*）は会員マガジンの行へ。プランが複数あれば足す
      const key = (MEMBERSHIP_PRODUCTS as [RegExp, string][]).find(([re]) => re.test(id))?.[1] ?? (ctaProductIdFromSalesProductId(id) as string);
      const was = byMagazine.get(key);
      byMagazine.set(key, was
        ? { count: was.count + agg.count, revenue: was.revenue + agg.revenue, lastDate: was.lastDate > agg.lastDate ? was.lastDate : agg.lastDate }
        : agg);
    }
  }
  return { byMagazine, articles };
}

/**
 * 単品記事の販売を原稿の題名（見出し 1）へ当てる。売れた時点の題名と完全一致する原稿があればそれ、
 * 無ければ売れた時点の題名で始まる原稿がちょうど 1 本のときだけ（公開後に題名へ副題を足した記事）。
 * 当たらなかった販売は unmatched に残す（0 件として消さない）。
 */
export function matchArticleSales(
  articles: (ProductSales & { id: string; titles: string[] })[],
  noteTitles: string[],
): { byTitle: Map<string, ProductSales>; unmatched: { id: string; count: number }[] } {
  const keys = [...new Set(noteTitles.map((t) => normalizeNoteTitle(t) as string))];
  const byTitle = new Map<string, ProductSales>();
  const unmatched: { id: string; count: number }[] = [];
  for (const { id, titles, ...agg } of articles) {
    let hit = keys.find((k) => titles.includes(k));
    if (!hit) {
      const prefixed = keys.filter((k) => titles.some((t) => t.length >= 10 && k.startsWith(t)));
      if (prefixed.length === 1) hit = prefixed[0];
    }
    if (!hit) { unmatched.push({ id, count: agg.count }); continue; }
    const was = byTitle.get(hit);
    byTitle.set(hit, was
      ? { count: was.count + agg.count, revenue: was.revenue + agg.revenue, lastDate: was.lastDate > agg.lastDate ? was.lastDate : agg.lastDate }
      : agg);
  }
  return { byTitle, unmatched };
}

export const salesTitleKey = (title: string) => normalizeNoteTitle(title) as string;

export function salesSummary(): SalesSummary {
  let data: { sales?: SaleRow[]; source?: string; updatedAt?: string; currency?: string };
  try {
    data = JSON.parse(readFileSync(repoPath('data', 'sales', 'sales-log.json'), 'utf8'));
  } catch {
    return { source: null, updatedAt: null, currency: 'JPY', months: [], total: { count: 0, revenue: 0, months: 0 } };
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
    months,
    total,
  };
}
