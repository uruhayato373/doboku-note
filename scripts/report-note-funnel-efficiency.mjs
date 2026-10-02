#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildNoteFunnelEfficiency, renderNoteFunnelEfficiencyMarkdown } from './lib/note-funnel-efficiency.mjs';
import { latestReportRef, readJsonOrReport } from './lib/metric-reports.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SALES_PATH = join(ROOT, 'data/note/sales.json');
const OUTPUT_DIR = join(ROOT, 'data/metrics/monetization');

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

function latestLabelSnapshot() {
  const ref = latestReportRef(ROOT, 'ga4.cta-clicks-by-label');
  if (!ref) throw new Error('GA4 の cta-clicks-by-label がありません（data/ga4/reports/）');
  return ref;
}

const args = process.argv.slice(2);
const ga4Path = valueAfter(args, '--ga4') ? resolve(valueAfter(args, '--ga4')) : latestLabelSnapshot();
const salesPath = resolve(valueAfter(args, '--sales') ?? SALES_PATH);
const noWrite = args.includes('--no-write');
const jsonOnly = args.includes('--json');

const report = buildNoteFunnelEfficiency({
  ga4: readJsonOrReport(ROOT, ga4Path),
  salesLog: JSON.parse(readFileSync(salesPath, 'utf8')),
});
const markdown = renderNoteFunnelEfficiencyMarkdown(report, {
  ga4: ga4Path.replace(`${ROOT}/`, ''),
  sales: salesPath.replace(`${ROOT}/`, ''),
});

if (!noWrite) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, 'note-funnel-efficiency-latest.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(OUTPUT_DIR, 'note-funnel-efficiency-latest.md'), markdown);
}

if (jsonOnly) console.log(JSON.stringify(report, null, 2));
else {
  console.log(markdown);
  if (!noWrite) console.log(`\n[report-note-funnel-efficiency] latest JSON/Markdown を ${OUTPUT_DIR} へ更新`);
}
