#!/usr/bin/env node
/**
 * sales-attribution.mjs — 期間の販売を資格・型へ帰属させた件数と、公開中で販売 0 の note 商品を資格別に出す（DN-0930）。
 * 使い方: node scripts/sales-attribution.mjs [--from 2026-05-01] [--to 2026-10-31] [--json]
 */
import { parseArgs } from 'node:util';
import { loadLineupConfig } from './lib/product-lineup.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { salesAttribution } from './lib/sales-attribution.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const { values } = parseArgs({ options: { from: { type: 'string', default: '2026-05-01' }, to: { type: 'string', default: '2026-10-31' }, json: { type: 'boolean', default: false } } });
const config = loadLineupConfig(REPO_ROOT);
const sales = readDataset(REPO_ROOT, 'note.sales').sales ?? [];
const products = readDataset(REPO_ROOT, 'config.products').products ?? [];
const result = salesAttribution(config, sales, { startDate: values.from, endDate: values.to }, products);

if (values.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const { total, via, byQualification, unattributedIds, unsold } = result;
  console.log(`販売 ${total} 件（${values.from}〜${values.to}）: 商品に結合 ${via.product} / 規則で帰属 ${via.rule} / 未帰属 ${via.none}`);
  if (unattributedIds.length) console.log(`未帰属の productId: ${unattributedIds.join(', ')}`);
  console.log('資格別の販売件数:', byQualification);
  for (const [q, items] of Object.entries(unsold)) {
    const paid = items.filter((i) => !i.free);
    console.log(`販売 0 の公開商品 ${q}: 有料 ${paid.length} / 無料・会員 ${items.length - paid.length}`);
  }
}
