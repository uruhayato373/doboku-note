#!/usr/bin/env node
/**
 * sales-summary.mjs
 *
 * .claude/state/sales/sales-log.json を読み、月次・商品別の売上を集計して表示する。
 * 売上の真実源は note ダッシュボードの販売履歴（手動転記）。
 *
 * Usage:
 *   node scripts/sales-summary.mjs            # 全期間サマリ
 *   node scripts/sales-summary.mjs 2026-05    # 指定月のみ
 *   npm run sales-summary
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOG = join(ROOT, ".claude/state/sales/sales-log.json");
const MILESTONE = 15000; // Web 月収マイルストーン（iOS 着手判断トリガー）

const yen = (n) => "¥" + n.toLocaleString("en-US");
const monthOf = (d) => d.slice(0, 7);

const data = JSON.parse(readFileSync(LOG, "utf-8"));
const filter = process.argv[2];
const sales = data.sales.filter((s) => (filter ? monthOf(s.date) === filter : true));

if (sales.length === 0) {
  console.log(`該当データなし（filter=${filter ?? "全期間"}）`);
  process.exit(0);
}

// 月次集計
const byMonth = {};
for (const s of sales) {
  const m = monthOf(s.date);
  (byMonth[m] ??= { count: 0, revenue: 0, products: {} });
  byMonth[m].count++;
  byMonth[m].revenue += s.price;
  const key = s.title;
  (byMonth[m].products[key] ??= { count: 0, revenue: 0 });
  byMonth[m].products[key].count++;
  byMonth[m].products[key].revenue += s.price;
}

console.log(`\n━━━━━ 売上サマリ${filter ? `（${filter}）` : "（全期間）"} ━━━━━`);
console.log(`真実源: ${data.source}`);
console.log(`最終更新: ${data.updatedAt}\n`);

for (const m of Object.keys(byMonth).sort()) {
  const mm = byMonth[m];
  const hit = mm.revenue >= MILESTONE ? " ★¥15kマイルストーン達成" : "";
  console.log(`【${m}】 ${mm.count}件 / ${yen(mm.revenue)}${hit}`);
  const rows = Object.entries(mm.products).sort((a, b) => b[1].revenue - a[1].revenue);
  for (const [title, p] of rows) {
    console.log(`   ${String(p.count).padStart(2)}件  ${yen(p.revenue).padStart(9)}  ${title}`);
  }
  console.log("");
}

const total = sales.reduce((a, s) => a + s.price, 0);
console.log(`合計: ${sales.length}件 / ${yen(total)}`);
