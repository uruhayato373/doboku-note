#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildNoteFunnelEfficiency, renderNoteFunnelEfficiencyMarkdown } from './lib/note-funnel-efficiency.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const GA4_DIR = join(ROOT, '.claude/state/metrics/ga4');
const SALES_PATH = join(ROOT, '.claude/state/sales/sales-log.json');
const OUTPUT_DIR = join(ROOT, '.claude/state/metrics/monetization');

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

function latestLabelSnapshot() {
  const files = readdirSync(GA4_DIR)
    .filter((name) => /^ga4-cta-clicks-by-label-.*\.json$/.test(name))
    .sort();
  if (files.length === 0) throw new Error('ga4-cta-clicks-by-label snapshot がありません');
  return join(GA4_DIR, files.at(-1));
}

const args = process.argv.slice(2);
const ga4Path = resolve(valueAfter(args, '--ga4') ?? latestLabelSnapshot());
const salesPath = resolve(valueAfter(args, '--sales') ?? SALES_PATH);
const noWrite = args.includes('--no-write');
const jsonOnly = args.includes('--json');

const report = buildNoteFunnelEfficiency({
  ga4: JSON.parse(readFileSync(ga4Path, 'utf8')),
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
