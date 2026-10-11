/**
 * net-receipts-ledger.mjs — 月の受取額を 3 つの台帳（note.sales・coconala.revenue・kdp.royalties）から読んで組み立てる。
 * 組み立ては net-receipts.mjs の monthReceipts（純関数）。読み手: 管理画面のトップ（kpi-tree.ts）・scripts/record-net-receipts.mjs。
 * 台帳は週次の CI（login-collectors）が更新する。ここは読むだけで、ブラウザも資格情報も使わない。
 */
import { readDatasetIf } from './dataset-io.mjs';
import { monthReceipts } from './net-receipts.mjs';

export function loadMonthReceipts(root, month) {
  return monthReceipts({
    month,
    noteSales: readDatasetIf(root, 'note.sales'),
    coconalaRevenue: readDatasetIf(root, 'coconala.revenue'),
    kdpRoyalties: readDatasetIf(root, 'kdp.royalties'),
  });
}
