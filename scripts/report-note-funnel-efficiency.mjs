#!/usr/bin/env node
// note 導線の効率（商品ID付き CTA のクリックと同じ期間のマガジン売上）を標準出力に出す。何も書かない。
// 読み手のいない週次出力だったので 2026-10 に CI から外し、台帳の記録もやめた。見たいときに手で回す。
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildNoteFunnelEfficiency, renderNoteFunnelEfficiencyMarkdown } from './lib/note-funnel-efficiency.mjs';
import { latestReportRef, readJsonOrReport } from './lib/metric-reports.mjs';
import { datasetDir, datasetPath } from './lib/datasets.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SALES_PATH = join(ROOT, datasetPath('note.sales'));

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

function latestLabelSnapshot() {
  const ref = latestReportRef(ROOT, 'ga4.cta-clicks-by-label');
  if (!ref) throw new Error(`GA4 の cta-clicks-by-label がありません（${datasetDir('ga4.reports')}/）`);
  return ref;
}

const args = process.argv.slice(2);
const ga4Path = valueAfter(args, '--ga4') ? resolve(valueAfter(args, '--ga4')) : latestLabelSnapshot();
const salesPath = resolve(valueAfter(args, '--sales') ?? SALES_PATH);
const jsonOnly = args.includes('--json');

const report = buildNoteFunnelEfficiency({
  ga4: readJsonOrReport(ROOT, ga4Path),
  salesLog: JSON.parse(readFileSync(salesPath, 'utf8')),
});

if (jsonOnly) console.log(JSON.stringify(report, null, 2));
else {
  console.log(
    renderNoteFunnelEfficiencyMarkdown(report, {
      ga4: ga4Path.replace(`${ROOT}/`, ''),
      sales: salesPath.replace(`${ROOT}/`, ''),
    }),
  );
}
