/**
 * sales.mjs — 収益実績（P5・読み取り専用）。
 * .claude/state/sales/sales-log.json を読み、月次・商品別に集計（sales-summary.mjs と同義）。
 */
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".."));
const LOG = join(ROOT, ".claude", "state", "sales", "sales-log.json");
const MILESTONE = 15000; // Web 月収マイルストーン（iOS 着手判断トリガー）

const monthOf = (d) => d.slice(0, 7);

export function salesSummary() {
  let data;
  try { data = JSON.parse(readFileSync(LOG, "utf8")); } catch { return { months: [], total: {}, source: null }; }
  const sales = data.sales || [];

  const byMonth = {};
  for (const s of sales) {
    const m = monthOf(s.date);
    (byMonth[m] ??= { month: m, count: 0, revenue: 0, products: {} });
    byMonth[m].count++;
    byMonth[m].revenue += s.price;
    const k = s.title;
    (byMonth[m].products[k] ??= { title: k, count: 0, revenue: 0 });
    byMonth[m].products[k].count++;
    byMonth[m].products[k].revenue += s.price;
  }

  const months = Object.keys(byMonth).sort().map((m) => {
    const mm = byMonth[m];
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
  return { source: data.source || null, updatedAt: data.updatedAt || null, currency: data.currency || "JPY", milestone: MILESTONE, months, total };
}
