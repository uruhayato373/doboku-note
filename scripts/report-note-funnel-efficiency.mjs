#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildNoteFunnelEfficiency, renderNoteFunnelEfficiencyMarkdown } from './lib/note-funnel-efficiency.mjs';
import { latestReportRef, readJsonOrReport } from './lib/metric-reports.mjs';
import { datasetDir, datasetPath } from './lib/datasets.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const SALES_PATH = join(ROOT, datasetPath('note.sales'));
const JSON_OUT_PATH = join(ROOT, datasetPath('analysis.note-funnel-efficiency'));
const MD_OUT_PATH = join(ROOT, datasetPath('analysis.note-funnel-efficiency-report'));
const OUTPUT_DIR = dirname(JSON_OUT_PATH);

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
  writeFileSync(JSON_OUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(MD_OUT_PATH, markdown);
}

if (jsonOnly) console.log(JSON.stringify(report, null, 2));
else {
  console.log(markdown);
  if (!noWrite) console.log(`\n[report-note-funnel-efficiency] latest JSON/Markdown を ${OUTPUT_DIR} へ更新`);
}
