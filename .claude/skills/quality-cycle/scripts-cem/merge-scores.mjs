#!/usr/bin/env node
import { runMergeScores } from '../scripts-common/merge-scores-core.mjs';
import { readScores, writeScores } from './lib/quality-state.mjs';

const WEIGHTS = { structure: 0.30, mobile: 0.25, principle: 0.20, reference: 0.15, linking: 0.10 };

function computeWeighted(scores) {
  const hasZero = Object.values(scores).some((v) => v === 0);
  const raw = Object.entries(WEIGHTS).reduce((acc, [k, w]) => acc + (scores[k] || 0) * w, 0);
  if (hasZero) return Math.min(raw, 1.0);
  return parseFloat(raw.toFixed(2));
}

runMergeScores({ readScores, writeScores, computeWeighted });
