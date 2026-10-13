/**
 * net-receipts-ledger.mjs — 月の受取額を 3 つの台帳（note.sales・coconala.revenue・kdp.royalties）から読んで組み立てる。
 * 組み立ては net-receipts.mjs の monthReceipts（純関数）。読み手: 管理画面のトップ（kpi-tree.ts）・scripts/record-net-receipts.mjs。
 * 台帳は週次の CI（login-collectors）が更新する。ここは読むだけで、ブラウザも資格情報も使わない。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readDatasetIf } from './dataset-io.mjs';
import { monthReceipts } from './net-receipts.mjs';

/** KDP の最初の本の出版月（scripts/kindle-published/catalog.json の publishedDate の最小）。 */
function kdpFirstMonth(root) {
  const file = join(root, 'scripts/kindle-published/catalog.json');
  if (!existsSync(file)) return null;
  const catalog = JSON.parse(readFileSync(file, 'utf8'));
  const dates = (catalog.books ?? catalog).map((b) => b.publishedDate).filter(Boolean).sort();
  return dates[0]?.slice(0, 7) ?? null;
}

export function loadMonthReceipts(root, month) {
  return monthReceipts({
    month,
    noteSales: readDatasetIf(root, 'note.sales'),
    coconalaRevenue: readDatasetIf(root, 'coconala.revenue'),
    kdpRoyalties: readDatasetIf(root, 'kdp.royalties'),
    kdpFirstMonth: kdpFirstMonth(root),
  });
}
