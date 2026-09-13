#!/usr/bin/env node
/** Validate ledger provenance; staged commits cannot alter protected page content or past rank data. */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONFIG, LEDGER, HISTORY, KIND, validateConfig, validateSnapshot, readMeasurements, deploymentFor, statusOf, hash, scopeKey, readRuns, validateRun } from './lib/seo-rank-watch.mjs';

export function observationViolations(before, after, changedPaths, getContent) {
  const errors = [];
  for (const previous of before.experiments.filter((e) => e.kind === KIND)) {
    const current = after.experiments.find((e) => e.id === previous.id);
    if (!current) { errors.push(`${previous.id}: experiment history must not be deleted`); continue; }
    for (const key of ['actions', 'history']) {
      if (JSON.stringify(previous[key] ?? []) !== JSON.stringify((current[key] ?? []).slice(0, previous[key]?.length ?? 0))) errors.push(`${previous.id}: ${key} is append-only`);
    }
    if (JSON.stringify(previous.scope) !== JSON.stringify(current.scope)) errors.push(`${previous.id}: scope is immutable`);
    if (['observing', 'pending-deploy'].includes(statusOf(previous))) {
      const path = previous.scope.contentPath;
      if (changedPaths.includes(path)) errors.push(`${previous.id}: ${path} is observing / awaiting deployment; review before a separate content change`);
      // noindex and shared layout changes can alter every watched page.
      for (const path of changedPaths.filter((p) => p === 'public/_redirects' || p.startsWith('src/app/') || p.startsWith('src/components/') || p.startsWith('src/styles/'))) errors.push(`${previous.id}: shared page change ${path} affects observation; record an interrupted experiment before changing it`);
    }
  }
  for (const exp of after.experiments.filter((e) => e.kind === KIND && ['observing', 'pending-deploy'].includes(statusOf(e)))) {
    if (hash(getContent(exp.scope.contentPath)) !== exp.actions.at(-1)?.contentHash) errors.push(`${exp.id}: content differs from the recorded improvement`);
  }
  for (const exp of after.experiments.filter((e) => e.kind === KIND)) {
    const previous = before.experiments.find((e) => e.id === exp.id);
    for (const action of (exp.actions ?? []).slice(previous?.actions?.length ?? 0)) {
      if (action.selection?.strategyVersion !== 2 || !action.selection?.qualification || !action.selection?.rationale || !/^[a-f0-9]{64}$/.test(action.selection?.configHash ?? '')) errors.push(`${exp.id}: new action requires its qualification selection evidence`);
    }
  }
  return errors;
}
function main() {
  const root = process.cwd(), staged = process.argv.includes('--staged');
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const get = (path) => staged ? git(['show', `:${path}`]) : readFileSync(join(root, path), 'utf8');
  const config = validateConfig(JSON.parse(get(CONFIG))), ledger = JSON.parse(get(LEDGER)), errors = [];
  const ids = new Set();
  const calendar = JSON.parse(get('.claude/config/exam-calendar.json'));
  for (const w of config.watchwords) {
    if (!existsSync(join(root, w.contentPath))) errors.push(`Missing article: ${w.contentPath}`);
    if (!calendar.exams[w.qualification] || (w.examEvent && !calendar.exams[w.qualification].events[w.examEvent])) errors.push(`${w.id}: qualification/calendar event is missing`);
    if (w.evidence.kind === 'gsc') {
      if (!w.evidence.source.startsWith('.claude/state/metrics/gsc/') || !existsSync(join(root, w.evidence.source))) errors.push(`${w.id}: GSC registration evidence is missing`);
      else if (!JSON.parse(get(w.evidence.source)).rows?.some((r) => r.keys?.includes(w.keyword) && r.impressions > 0)) errors.push(`${w.id}: registered query has no impressions in its cited GSC source`);
    }
  }
  for (const e of ledger.experiments.filter((e) => e.kind === KIND)) {
    const w = config.watchwords.find((w) => w.id === e.watchId);
    if (ids.has(e.watchId) || !w || scopeKey(w) !== scopeKey(e.scope) || (w && w.contentPath !== e.scope.contentPath)) errors.push(`${e.id}: missing, duplicate or changed watch scope`);
    ids.add(e.watchId);
    if (!['proposed', 'running', 'done', 'abandoned'].includes(e.status)) errors.push(`${e.id}: invalid status`);
    if (['observing', 'achieved'].includes(statusOf(e)) && !/^\d{4}-\d{2}-\d{2}$/.test(e.next_check_date ?? '')) errors.push(`${e.id}: next review required`);
    if (statusOf(e) === 'observing' && (!deploymentFor(e) || ![7, 14, 28].includes(e.reviewDays))) errors.push(`${e.id}: verified deployment and review window required`);
    for (const action of e.actions ?? []) if (!action.measurementFile?.startsWith(`${HISTORY}/`) || !existsSync(join(root, action.measurementFile))) errors.push(`${e.id}: measurement provenance missing`);
  }
  for (const snapshot of readMeasurements(root)) {
    try { validateSnapshot(snapshot); } catch { errors.push(`Invalid rank snapshot: ${snapshot.file}`); }
  }
  const runs = readRuns(root);
  for (const run of runs) {
    try { validateRun(run); } catch { errors.push(`Invalid decision record: ${run.file}`); }
    for (const row of run.rows ?? []) if (row.measurementFile && !existsSync(join(root, row.measurementFile))) errors.push(`${run.file}: missing measurement evidence`);
  }
  if (staged) {
    let before;
    try { before = JSON.parse(git(['show', `HEAD:${LEDGER}`])); } catch { before = { experiments: [] }; }
    const changed = git(['diff', '--cached', '--name-only', '--no-renames', '-z']).split('\0').filter(Boolean);
    errors.push(...observationViolations(before, ledger, changed, get));
    const oldSnapshots = git(['ls-tree', '-r', '--name-only', 'HEAD', HISTORY]).trim().split('\n').filter(Boolean);
    for (const path of changed) if (oldSnapshots.includes(path)) errors.push(`Rank history is immutable: ${path}`);
  } else errors.push(...observationViolations(ledger, ledger, [], get));
  for (const error of errors) console.error(`[seo-rank-watch] ${error}`);
  console.log(`[seo-rank-watch] ${errors.length ? 'FAIL' : 'PASS'}: ${config.watchwords.length} watches / ${config.strategy.focusQualifications.length} qualifications, ${ids.size} experiments, ${runs.length} decisions`);
  if (errors.length) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch { console.error('[seo-rank-watch] FAIL: config, ledger or staged files could not be validated'); process.exitCode = 1; }
}
