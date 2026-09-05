#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  renderQuizPremiumFunnelMarkdown,
  summarizeQuizPremiumFunnel,
} from './lib/quiz-premium-funnel.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const GA4_DIR = join(ROOT, '.claude/state/metrics/ga4');
const argv = process.argv.slice(2);
const inputIndex = argv.indexOf('--input');
const explicit = inputIndex >= 0 ? argv[inputIndex + 1] : null;
const latest = existsSync(GA4_DIR)
  ? readdirSync(GA4_DIR).filter((name) => /^ga4-quiz-funnel-.+\.json$/.test(name)).sort().at(-1)
  : null;
const input = explicit ? resolve(ROOT, explicit) : latest ? join(GA4_DIR, latest) : null;
const snapshot = input && existsSync(input) ? JSON.parse(readFileSync(input, 'utf8')) : null;
const summary = summarizeQuizPremiumFunnel(snapshot);

mkdirSync(GA4_DIR, { recursive: true });
writeFileSync(join(GA4_DIR, 'quiz-premium-funnel-latest.json'), JSON.stringify(summary, null, 2) + '\n');
writeFileSync(join(GA4_DIR, 'quiz-premium-funnel-latest.md'), renderQuizPremiumFunnelMarkdown(summary));
console.log(`[report-quiz-premium-funnel] status=${summary.status} / source=${input ?? '未取得'}`);
