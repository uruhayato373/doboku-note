#!/usr/bin/env node
/**
 * report-site-to-sales.mjs — サイトの note 送客クリック × note 側のサイト経由閲覧 × 商品別売上の月次突合
 *
 * 入力（すべてコミット済み・creds 不要）:
 *   GA4 by-label   .claude/state/metrics/ga4/ga4-cta-clicks-by-label-*.json（月一致の窓を優先、無ければ重なり最大）
 *   note 流入元    .claude/state/metrics/note/referrers-*.json（アカウント全体・取得が最新のファイル）
 *   売上           .claude/state/sales/sales-log.json
 *   商品カタログ   src/lib/note-magazines.ts・src/lib/hub-cta.ts・.claude/state/note/magazines-snapshot.json
 * 出力: .claude/state/metrics/business/site-to-sales-YYYY-MM.json（追記専用台帳。内容が変われば -rN を足す）と標準出力の表
 *
 * Usage:
 *   npm run report-site-to-sales                     # 直近の完了月（JST）
 *   npm run report-site-to-sales -- --month 2026-08
 *   npm run report-site-to-sales -- --json           # JSON を標準出力へ
 *   npm run report-site-to-sales -- --check          # 書かずに完走だけ確認（quality-audit ci）
 * exit: 0 完走 / 2 検査不成立（カタログ解析 0 件・sales-log 読取不能など入力の破損）
 * 純関数とテスト: scripts/lib/site-to-sales.mjs・tests/site-to-sales.test.mjs
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { jst } from './lib/business-direction.mjs';
import {
  buildResolver,
  buildSiteToSales,
  parseHubSeasonalProducts,
  parseNoteCatalog,
  pickGa4Snapshot,
  pickNoteReferral,
  planOutput,
  previousMonth,
  renderSiteToSalesTable,
} from './lib/site-to-sales.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const GA4_DIR = '.claude/state/metrics/ga4';
const NOTE_DIR = '.claude/state/metrics/note';
const OUT_DIR = '.claude/state/metrics/business';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const valueAfter = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const check = flag('--check');
const month = valueAfter('--month') ?? previousMonth(jst());

function fail(message) {
  console.error(`[report-site-to-sales] 検査不成立: ${message}`);
  process.exitCode = 2;
}

function readJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
}

function listJson(dir, re) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  const out = [];
  for (const name of readdirSync(abs).filter((n) => re.test(n)).sort()) {
    try {
      out.push({ file: `${dir}/${name}`, data: readJson(`${dir}/${name}`) });
    } catch (e) {
      console.error(`[report-site-to-sales] 読めない入力を除外: ${dir}/${name}（${e.message}）`);
    }
  }
  return out;
}

function main() {
  if (!/^\d{4}-\d{2}$/.test(month)) return fail(`--month は YYYY-MM（受領: ${month}）`);

  const catalog = parseNoteCatalog(readFileSync(join(ROOT, 'src/lib/note-magazines.ts'), 'utf8'));
  if (catalog.length === 0) return fail('note-magazines.ts から商品を 1 件も解析できない（定義の形が変わった）');
  const hubSeasonal = parseHubSeasonalProducts(readFileSync(join(ROOT, 'src/lib/hub-cta.ts'), 'utf8'));
  if (Object.keys(hubSeasonal).length === 0) return fail('hub-cta.ts の HUB seasonal 商品を解析できない');
  let salesLog;
  try {
    salesLog = readJson('.claude/state/sales/sales-log.json');
  } catch (e) {
    return fail(`sales-log.json を読めない（${e.message}）`);
  }
  if (!Array.isArray(salesLog.sales)) return fail('sales-log.json に sales[] が無い');
  const snapshotPath = '.claude/state/note/magazines-snapshot.json';
  const magazineSnapshot = existsSync(join(ROOT, snapshotPath)) ? readJson(snapshotPath) : null;

  const resolver = buildResolver({ catalog, hubSeasonal, magazineSnapshot, salesLog });
  const labelSnapshots = listJson(GA4_DIR, /^ga4-cta-clicks-by-label-.*\.json$/);
  const pick = pickGa4Snapshot(labelSnapshots.map((s) => ({ file: s.file, meta: s.data.meta })), month);
  const picked = labelSnapshots.find((s) => s.file === pick.file);
  const ga4 = { pick, rows: picked ? picked.data.rows ?? picked.data.data ?? [] : [] };
  const referral = pickNoteReferral(listJson(NOTE_DIR, /^referrers-\d{4}-\d{2}\.json$/), month);

  const report = buildSiteToSales({ month, resolver, ga4, salesLog, referral });
  report.inputs = {
    ga4: pick.file,
    noteReferrers: referral.file,
    sales: '.claude/state/sales/sales-log.json',
    salesLogUpdatedAt: salesLog.updatedAt ?? null,
    catalog: `src/lib/note-magazines.ts（${catalog.length} 商品）`,
    magazineSnapshot: magazineSnapshot ? `${snapshotPath}（${magazineSnapshot.fetchedAt ?? '取得時刻不明'}）` : null,
  };

  if (flag('--json')) console.log(JSON.stringify(report, null, 2));
  else console.log(renderSiteToSalesTable(report));

  const c = report.clicks;
  const counts = `GA4 ${c.labelRows} label 行・${c.total ?? '欠測'} クリック（解決 ${c.resolved ?? '—'}）／売上 ${report.sales.count} 件（解決 ${report.sales.resolved}）／商品 ${report.products.length}`;
  if (check) {
    console.error(`[report-site-to-sales --check] 完走 ${month}: ${counts}（書き込みなし）`);
    return;
  }
  const body = `${JSON.stringify(report, null, 2)}\n`;
  const outAbs = join(ROOT, OUT_DIR);
  mkdirSync(outAbs, { recursive: true });
  const plan = planOutput(readdirSync(outAbs), month, (name) => readFileSync(join(outAbs, name), 'utf8'), body);
  if (plan.action === 'unchanged') {
    console.error(`[report-site-to-sales] ${OUT_DIR}/${plan.name} と同内容のため書き込まない: ${counts}`);
    return;
  }
  writeFileSync(join(outAbs, plan.name), body);
  console.error(`[report-site-to-sales] ${OUT_DIR}/${plan.name} を書き出し${plan.supersedes ? `（${plan.supersedes} を改訂）` : ''}: ${counts}`);
}

main();
