#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { datasetPath } from './lib/datasets.mjs';
import { isReportRef, latestReportRef, readJsonOrReport } from './lib/metric-reports.mjs';
import {
  renderQuizPremiumFunnelMarkdown,
  summarizeQuizPremiumFunnel,
} from './lib/quiz-premium-funnel.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const OUT = datasetPath('analysis.quiz-premium-funnel');
const argv = process.argv.slice(2);
const inputIndex = argv.indexOf('--input');
const explicit = inputIndex >= 0 ? argv[inputIndex + 1] : null;
const input = explicit ? resolve(ROOT, explicit) : latestReportRef(ROOT, 'ga4.quiz-funnel');
const snapshot = input && (isReportRef(input) || existsSync(input)) ? readJsonOrReport(ROOT, input) : null;
const summary = summarizeQuizPremiumFunnel(snapshot);

mkdirSync(dirname(join(ROOT, OUT)), { recursive: true });
writeFileSync(join(ROOT, OUT), JSON.stringify({ schemaVersion: 1, ...summary }, null, 2) + '\n');
console.log(`[report-quiz-premium-funnel] status=${summary.status} / source=${input ?? '未取得'}`);
