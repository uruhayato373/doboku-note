#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { readScores, writeScores } from './lib/quality-state.mjs';

const WEIGHTS = { structure: 0.30, mobile: 0.25, principle: 0.20, reference: 0.15, linking: 0.10 };

function computeWeighted(scores) {
  const hasZero = Object.values(scores).some((v) => v === 0);
  const raw = Object.entries(WEIGHTS).reduce((acc, [k, w]) => acc + (scores[k] || 0) * w, 0);
  if (hasZero) return Math.min(raw, 1.0);
  return parseFloat(raw.toFixed(2));
}

const input = process.argv[2];
if (!input) {
  console.error('Usage: node scripts/merge-scores.mjs <results.json>');
  process.exit(1);
}

const results = JSON.parse(readFileSync(input, 'utf-8'));
const scoresState = readScores();
const nowIso = new Date().toISOString();

let merged = 0;
let skipped = 0;
for (const r of results) {
  if (!r || !r.slug || !r.scores) {
    skipped++;
    continue;
  }
  const s = r.scores;
  const weighted = computeWeighted(s);
  const weak = r.weak_axes && r.weak_axes.length
    ? r.weak_axes
    : Object.entries(s).filter(([, v]) => v <= 1).map(([k]) => k);
  scoresState.pages[r.slug] = {
    slug: r.slug,
    scores: s,
    weighted,
    weak_axes: weak,
    qualitative_comment: r.qualitative_comment || '',
    scored_at: nowIso,
  };
  merged++;
}

writeScores(scoresState);
console.log(`merged=${merged} skipped=${skipped} total_scored=${Object.keys(scoresState.pages).length}`);
