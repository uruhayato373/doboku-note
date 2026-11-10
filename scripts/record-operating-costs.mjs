#!/usr/bin/env node
/**
 * record-operating-costs.mjs — 月の運営費用（costYen）を固定費の表から組み立てて事業の計測記録に書く。
 *
 * 入力は config/operating-costs.json（固定費の表）だけ。ブラウザも資格情報も使わない。
 * 組み立ては scripts/lib/net-receipts.mjs の buildCostMeasurement、記録は npm run business-review -- record。
 * その月に当たる項目が無いとき・同じ金額を記録済みのときは何もしない（0 円と書かない・毎週同じ記録を積まない）。
 * 表の金額を直したあとに回すと、前の記録を訂正先（supersedes）にして取り直す。
 *
 * 使い方:
 *   npm run record-operating-costs -- --month 2026-10            # dry-run（記録しない）
 *   npm run record-operating-costs -- --month 2026-10 --commit   # 記録する（data/business/records/ に書くだけ・git commit はしない）
 * 土曜の収集（weekly-collect の business-records の段）が前月と前々月で回す。
 * 終了コード: 0＝記録した・記録するものが無い / 1＝引数の誤り
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { autoRecordAction, buildCostMeasurement } from './lib/net-receipts.mjs';
import { currentRecords, records } from './lib/business-direction.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const TAG = '[record-operating-costs]';
const argv = process.argv.slice(2);
const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const MONTH = arg('--month');
const COMMIT = argv.includes('--commit');

function main() {
  if (!/^\d{4}-\d{2}$/.test(MONTH ?? '')) {
    console.error(`${TAG} --month YYYY-MM が必要`);
    return 1;
  }
  const { items } = readDataset(ROOT, 'config.operating-costs');
  const record = buildCostMeasurement({ month: MONTH, items });
  if (!record) {
    console.log(`${TAG} ${MONTH}: 固定費の表 ${items.length} 項目のうち、この月に当たるものが 0 件。記録しない`);
    return 0;
  }
  const current = currentRecords(records(ROOT), 'measurement');
  if (autoRecordAction(current, record) === 'recorded') {
    console.log(`${TAG} ${MONTH}: 同じ金額（¥${record.values.costYen.toLocaleString('ja-JP')}）を記録済み。記録しない`);
    return 0;
  }
  // 金額が変わったときは前の記録を訂正先にする（履歴は残る）
  const prev = current.find((r) => r.subject === 'costYen' && r.qualification === 'all' && r.period?.startDate === record.period.startDate && r.period?.endDate === record.period.endDate);
  if (prev) record.supersedes = prev.file;
  console.log(`${TAG} ${MONTH}: 費用 ¥${record.values.costYen.toLocaleString('ja-JP')}${prev ? `（訂正先 ${prev.file}）` : ''}`);
  mkdirSync(join(ROOT, '.tmp'), { recursive: true });
  const input = join(ROOT, '.tmp', `operating-costs-${MONTH}.json`);
  writeFileSync(input, JSON.stringify(record, null, 2) + '\n');
  process.stdout.write(execFileSync(process.execPath, [join(ROOT, 'scripts/business-review.mjs'), 'record', '--input', input, ...(COMMIT ? ['--commit'] : [])], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
  return 0;
}

process.exitCode = main();
