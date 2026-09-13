import { DIRECTION, direction } from './business-direction.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { addDays, calendarDate, getDateRange } from './gsc-date-range.mjs';
import { INTENTS, SELECTION_ORDER, strategyErrors, seasonFor, compareCandidates, selectionKey } from './seo-watch-strategy.mjs';

export class WatchError extends Error {}

export function readWatchConfig(root) {
  const config = readJson(root, CONFIG);
  if (config.strategy?.focusSource) {
    if (config.strategy.focusSource !== DIRECTION || config.strategy.focusQualifications) throw new WatchError('Focus qualifications must use business direction');
    config.strategy.focusQualifications = direction(root).qualifications.map(q => q.id);
  }
  return validateConfig(config);
}
export const CONFIG = '.claude/config/seo-watchwords.json';
export const LEDGER = '.claude/state/experiments.json';
export const HISTORY = '.claude/state/metrics/gsc/rank-watch';
export const KIND = 'seo-rank-watch';
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export const readJson = (root, path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
export const scopeKey = (w) => hash(JSON.stringify([w.keyword, w.targetPath, w.country ?? null, w.device ?? null]));
export const samePage = (a, b) => a.targetPath === b.targetPath || a.contentPath === b.contentPath;
export const dateJst = (now = new Date()) => calendarDate(now, 'Asia/Tokyo');

export function validateConfig(config) {
  if (config.version !== 1 || config.siteUrl !== 'sc-domain:doboku-note.com' || !Array.isArray(config.watchwords)) throw new WatchError('Invalid watch config');
  const ids = new Set(), scopes = new Set();
  for (const w of config.watchwords) {
    if (!/^[a-z0-9-]+$/.test(w.id ?? '') || ids.has(w.id) || !w.keyword?.trim() || scopes.has(scopeKey(w))) throw new WatchError('Duplicate or invalid watchword');
    if (!/^\/(exam|practice|standards|topics|tools)\/[\w/-]+$/.test(w.targetPath ?? '') || w.targetPath.endsWith('/') || w.targetPath.includes('..')) throw new WatchError('Use a canonical target path');
    if (!/^(content\/site\/.+\.mdx|src\/app\/tools\/[\w/-]+\/page\.tsx)$/.test(w.contentPath ?? '') || w.contentPath.split('/').includes('..')) throw new WatchError('Invalid content path');
    if (w.country && !/^[a-z]{3}$/.test(w.country)) throw new WatchError('Invalid country');
    if (w.device && !['MOBILE', 'DESKTOP', 'TABLET'].includes(w.device)) throw new WatchError('Invalid device');
    if (![1, 2, 3].includes(w.priority)) throw new WatchError('Priority must be 1, 2 or 3');
    ids.add(w.id); scopes.add(scopeKey(w));
  }
  for (const key of ['minImpressions', 'minActiveDays', 'maxConcurrent', 'maxIneffectiveCycles', 'maxSnapshotAgeDays']) {
    if (!Number.isInteger(config.policy?.[key]) || config.policy[key] < 1) throw new WatchError(`Invalid policy: ${key}`);
  }
  const errors = strategyErrors(config);
  if (errors.length) throw new WatchError(errors.join('; '));
  return config;
}
export function statusOf(exp) {
  if (!exp) return 'active';
  if (exp.status === 'done') return 'achieved';
  if (exp.status === 'abandoned') return 'paused';
  if (['running', 'measuring'].includes(exp.status)) return 'observing';
  return exp.history?.at(-1)?.event === 'record' ? 'pending-deploy' : 'active';
}
export const experimentFor = (experiments, id) => experiments.find((e) => e.kind === KIND && e.watchId === id);
export const deploymentFor = (exp) => exp.history?.findLast((h) => h.event === 'deployed' && h.actionIndex === exp.actions.length - 1);
export function reviewWindows(deployedAt, days = 7) {
  const day = calendarDate(new Date(deployedAt));
  return {
    before: getDateRange(days, undefined, addDays(day, -1)),
    after: { startDate: addDays(day, 1), endDate: addDays(day, days) },
  };
}
export const nextReviewDate = (deployedAt, days) => addDays(reviewWindows(deployedAt, days).after.endDate, 4);
export function aggregate(snapshot) {
  if (!snapshot || snapshot.meta?.truncated || snapshot.meta?.dataState !== 'final') throw new WatchError('Incomplete GSC response');
  const seen = new Set();
  let clicks = 0, impressions = 0, weighted = 0, activeDays = 0;
  for (const row of snapshot.rows) {
    const day = row.keys?.[0];
    if (seen.has(day) || !day || day < snapshot.meta.startDate || day > snapshot.meta.endDate) throw new WatchError('Invalid daily GSC rows');
    if (![row.clicks, row.impressions, row.position].every(Number.isFinite) || row.clicks < 0 || row.impressions < 0 || row.clicks > row.impressions || (row.impressions > 0 ? row.position < 1 : row.position !== 0)) throw new WatchError('Invalid GSC metrics');
    seen.add(day); if (row.impressions > 0) activeDays++; clicks += row.clicks; impressions += row.impressions; weighted += row.position * row.impressions;
  }
  return { rank: impressions ? weighted / impressions : null, impressions, clicks, ctr: impressions ? clicks / impressions : null, activeDays };
}
export function validateSnapshot(snapshot) {
  if (snapshot.version !== 1 || !['measurement', 'review'].includes(snapshot.type) || snapshot.scopeKey !== scopeKey(snapshot.scope) || !Number.isFinite(Date.parse(snapshot.fetchedAt))) throw new WatchError('Invalid rank snapshot');
  for (const part of [snapshot.before, snapshot.after]) {
    if (!part?.window || part.window.startDate !== part.raw?.meta?.startDate || part.window.endDate !== part.raw?.meta?.endDate || JSON.stringify(part.metrics) !== JSON.stringify(aggregate(part.raw))) throw new WatchError('Rank aggregate does not match raw GSC data');
    const expected = { query: snapshot.scope.keyword, page: `https://doboku-note.com${snapshot.scope.targetPath}` };
    for (const key of ['country', 'device']) if (snapshot.scope[key]) expected[key] = snapshot.scope[key];
    const filters = part.raw.meta.filters ?? [];
    if (part.raw.meta.siteUrl !== 'sc-domain:doboku-note.com' || part.raw.meta.type !== 'web' || JSON.stringify(part.raw.meta.dimensions) !== '["date"]' || filters.length !== Object.keys(expected).length || filters.some((f) => f.operator !== 'equals' || expected[f.dimension] !== f.expression)) throw new WatchError('Rank measurement scope does not match watchword');
  }
  if (snapshot.before.window.endDate >= snapshot.after.window.startDate) throw new WatchError('Comparison periods overlap');
  const duration = (w) => Date.parse(w.endDate) - Date.parse(w.startDate);
  if (duration(snapshot.before.window) !== duration(snapshot.after.window)) throw new WatchError('Comparison periods differ in length');
  return snapshot;
}
export function enough(metric, policy) {
  return metric?.rank !== null && Number.isFinite(metric?.rank) && metric.impressions >= policy.minImpressions && metric.activeDays >= policy.minActiveDays;
}
export function evaluate(before, after, policy) {
  if (!enough(before, policy) || !enough(after, policy)) return 'insufficient';
  if (after.rank === 1) return 'first-place';
  if (before.rank - after.rank >= 0.5) return 'improved';
  return 'no-effect'; // An operational classification, not a causal significance test.
}
export function readMeasurements(root) {
  const dir = join(root, HISTORY);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /^watch-.*\.json$/.test(f)).sort().map((f) => ({ ...readJson(root, `${HISTORY}/${f}`), file: `${HISTORY}/${f}` }));
}
export function latestMeasurement(snapshots, watch) {
  return snapshots.filter((s) => s.type === 'measurement' && s.scopeKey === scopeKey(watch)).at(-1) ?? null;
}
export function report(root, now = new Date()) {
  const config = readWatchConfig(root);
  const store = readJson(root, LEDGER);
  const snapshots = readMeasurements(root);
  const calendar = existsSync(join(root, '.claude/config/exam-calendar.json')) ? readJson(root, '.claude/config/exam-calendar.json') : null;
  const runs = readRuns(root);
  const recentActions = Object.fromEntries(config.strategy.focusQualifications.map((id) => [id, store.experiments.filter((e) => e.kind === KIND && config.watchwords.find((w) => w.id === e.watchId)?.qualification === id).flatMap((e) => e.actions ?? []).filter((a) => a.date >= addDays(dateJst(now), -27)).length]));
  const activeExperiments = store.experiments.filter((e) => ['running', 'measuring'].includes(e.status) || (e.kind === KIND && statusOf(e) === 'pending-deploy'));
  const locks = store.experiments.filter((e) => e.kind === KIND && ['observing', 'pending-deploy'].includes(statusOf(e)));
  const rows = config.watchwords.map((w) => {
    const exp = experimentFor(store.experiments, w.id);
    const measurement = latestMeasurement(snapshots, w);
    const fresh = measurement && (now.getTime() - Date.parse(measurement.fetchedAt)) / 86400000 <= config.policy.maxSnapshotAgeDays;
    const status = statusOf(exp);
    const blocker = locks.find((e) => samePage(e.scope, w));
    const current = measurement?.after.metrics ?? null;
    const previous = measurement?.before.metrics ?? null;
    let tier = null;
    if (fresh && w.enabled !== false && w.mode === 'improve' && status === 'active' && !blocker && current.rank !== 1) {
      if (current.rank !== null && current.rank > 1 && current.rank <= 10 && current.impressions > 0) tier = 0;
      else if (current.rank > 10 && current.rank <= 20 && current.impressions > 0) tier = 1;
      else if (exp?.history?.some((h) => ['improved', 'no-effect'].includes(h.outcome))) tier = 2;
      else if (current.rank === null && w.priority === 1) tier = 3;
    }
    const reason = w.enabled === false ? '監視停止中' : w.mode === 'monitor' ? '監視のみ（改善枠の対象外）' : !fresh ? '新しい固定条件の計測待ち' : blocker ? '同じページが観察中・本番反映待ち' : status !== 'active' ? '観察・監視・再検討の状態を優先' : current?.rank === 1 ? '1位の継続確認を優先' : tier === null ? '現時点では順位・需要の条件外' : `${INTENTS[w.intent]} / 学習価値P${w.priority} / ${['2〜10位', '11〜20位', '再改善候補', '需要未確認の探索候補'][tier]}`;
    return { ...w, status, current, previous, reason, intentLabel: INTENTS[w.intent], qualificationLabel: calendar?.exams?.[w.qualification]?.label ?? w.qualification,
      season: seasonFor(w, calendar, now), recentQualificationActions: recentActions[w.qualification], delta: current?.rank != null && previous?.rank != null ? previous.rank - current.rank : null,
      fresh: Boolean(fresh), measurementFile: measurement?.file ?? null, period: measurement?.after.window ?? null,
      nextReviewDate: exp?.next_check_date ?? null, lastReview: exp?.history?.findLast((h) => h.event === 'review') ?? null,
      actions: exp?.actions ?? [], history: exp?.history ?? [], blockedBy: blocker?.id ?? null, pauseReason: exp?.paused_reason ?? null, tier };
  });
  const candidates = rows.filter((r) => r.tier !== null).sort(compareCandidates);
  const capacity = activeExperiments.length < config.policy.maxConcurrent;
  const policyReviewedAt = runs.findLast((r) => r.type === 'policy-review')?.date ?? config.strategy.reviewedAt;
  const policyNextReviewDate = addDays(policyReviewedAt, config.strategy.reviewEveryDays);
  return { generatedAt: now.toISOString(), rows, candidate: candidates[0] ?? null, selected: capacity && policyNextReviewDate > dateJst(now) ? candidates[0] ?? null : null,
    candidates: candidates.map((r) => ({ id: r.id, keyword: r.keyword, qualification: r.qualification, reason: r.reason, key: selectionKey(r) })),
    strategy: config.strategy, configHash: hash(JSON.stringify(config)), selectionOrder: SELECTION_ORDER,
    policyNextReviewDate, policyReviewDue: policyNextReviewDate <= dateJst(now), lastRuns: runs.slice(-10).reverse(),
    qualifications: config.strategy.focusQualifications.map((id) => ({ id, label: calendar?.exams?.[id]?.label ?? id, watches: rows.filter((w) => w.qualification === id).length,
      measured: rows.filter((w) => w.qualification === id && w.fresh).length, recentActions: recentActions[id], candidate: candidates.find((w) => w.qualification === id)?.keyword ?? null })),
    capacity, activeExperiments: activeExperiments.map((e) => ({ id: e.id, title: e.title, nextReviewDate: e.next_check_date })),
    due: rows.filter((r) => r.nextReviewDate && r.nextReviewDate <= dateJst(now) && ['observing', 'achieved'].includes(r.status)).map((r) => r.id) };
}
export function writeSnapshot(root, data, now = new Date()) {
  const file = `${HISTORY}/watch-${now.toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}.json`;
  mkdirSync(join(root, HISTORY), { recursive: true });
  writeFileSync(join(root, file), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
  return file;
}

export function readRuns(root) {
  const dir = join(root, HISTORY);
  return existsSync(dir) ? readdirSync(dir).filter((f) => /^run-.*\.json$/.test(f)).sort().map((f) => ({ ...readJson(root, `${HISTORY}/${f}`), file: `${HISTORY}/${f}` })) : [];
}

export function decisionRecord(view, note = '', policyReview = false, now = new Date(), failed = false) {
  if (policyReview && note.trim().length < 10) throw new WatchError('Policy review requires a concrete review note');
  if (failed && (note.trim().length < 10 || policyReview)) throw new WatchError('Failure requires a reason and cannot complete a policy review');
  const data = { version: 1, type: policyReview ? 'policy-review' : 'decision', date: dateJst(now),
    configHash: view.configHash, strategy: view.strategy, selectionOrder: view.selectionOrder,
    selectedId: failed ? null : view.selected?.id ?? null, candidateId: view.candidate?.id ?? null,
    result: failed ? 'failed' : view.selected ? 'ready' : view.policyReviewDue ? 'policy-review-due' : !view.capacity ? 'capacity-limit' : 'no-candidate',
    activeExperiments: view.activeExperiments, due: view.due, policyNextReviewDate: view.policyNextReviewDate,
    candidates: view.candidates, qualifications: view.qualifications,
    rows: view.rows.map((w) => ({ id: w.id, keyword: w.keyword, targetPath: w.targetPath, qualification: w.qualification, intent: w.intent,
      mode: w.mode, priority: w.priority, rationale: w.rationale, status: w.status, reason: w.reason, season: w.season,
      current: w.current, previous: w.previous, period: w.period, measurementFile: w.measurementFile, nextReviewDate: w.nextReviewDate,
      actionCount: w.actions.length, lastReview: w.lastReview })), note: note.trim() };
  return { ...data, recordedAt: now.toISOString(), fingerprint: hash(JSON.stringify(data)) };
}

export function validateRun(entry) {
  const { file: _file, recordedAt, fingerprint, ...data } = entry;
  if (entry.version !== 1 || !['decision', 'policy-review'].includes(entry.type) || !Number.isFinite(Date.parse(recordedAt)) ||
      fingerprint !== hash(JSON.stringify(data)) || !Array.isArray(entry.rows) || !/^[a-f0-9]{64}$/.test(entry.configHash)) throw new WatchError('Invalid decision record');
  if (entry.selectedId && (entry.result !== 'ready' || !entry.candidates?.some((r) => r.id === entry.selectedId))) throw new WatchError('Decision selection has no candidate evidence');
  return entry;
}

export function writeDecision(root, entry) {
  validateRun(entry);
  const existing = readRuns(root).find((r) => r.fingerprint === entry.fingerprint);
  if (existing) return { file: existing.file, appended: false };
  const file = `${HISTORY}/run-${entry.recordedAt.replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}.json`;
  mkdirSync(join(root, HISTORY), { recursive: true });
  writeFileSync(join(root, file), JSON.stringify(entry, null, 2) + '\n', { flag: 'wx' });
  return { file, appended: true };
}
/** One writer; detect edits by another process before an atomic rename. */
export async function updateLedger(root, mutate) {
  const path = join(root, LEDGER), lock = `${path}.lock`, temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(lock, String(process.pid), { flag: 'wx' });
  try {
    const before = readFileSync(path, 'utf8'), store = JSON.parse(before);
    const result = await mutate(store);
    if (readFileSync(path, 'utf8') !== before) throw new WatchError('Experiment ledger changed concurrently');
    store.updated_at = new Date().toISOString();
    writeFileSync(temporary, JSON.stringify(store, null, 2) + '\n', { flag: 'wx' });
    renameSync(temporary, path);
    return result;
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
    unlinkSync(lock);
  }
}
export function recordAction(store, config, watch, action, measurement, now = new Date()) {
  if (watch.mode !== 'improve' || !['exam-task', 'exam-topic'].includes(watch.intent)) throw new WatchError('Monitor-only watchwords cannot be improved');
  const exp = experimentFor(store.experiments, watch.id);
  if (statusOf(exp) !== 'active') throw new WatchError('Watchword is not active');
  if (store.experiments.some((e) => e.kind === KIND && ['observing', 'pending-deploy'].includes(statusOf(e)) && samePage(e.scope, watch))) throw new WatchError('Page is locked');
  const active = store.experiments.filter((e) => ['running', 'measuring'].includes(e.status) || (e.kind === KIND && statusOf(e) === 'pending-deploy'));
  if (active.length >= config.policy.maxConcurrent) throw new WatchError('Concurrent experiment limit reached');
  if (!['title', 'description', 'intro', 'faq', 'content', 'internal-links', 'data'].includes(action.method) || !['needs', 'gap', 'done'].every((k) => typeof action[k] === 'string' && action[k].trim().length >= 10)) throw new WatchError('Needs, gap, done and an allowed method are required');
  if (!Array.isArray(action.serp) || action.serp.length < 1 || action.serp.length > 3 || action.serp.some((s) => !/^https:\/\//.test(s.url ?? '') || !s.gap?.trim())) throw new WatchError('Compare 1–3 current search results with URLs and gaps');
  const last = exp?.history?.findLast((h) => h.event === 'review' && h.complete);
  if (last?.outcome === 'no-effect' && exp.actions.at(-1).method === action.method) throw new WatchError('Use a different method after no effect');
  const target = exp ?? { id: `SEO-${watch.id}`, kind: KIND, watchId: watch.id, title: `検索意図の改善: ${watch.keyword}`, scope: { ...watch }, created_at: now.toISOString(), actions: [], history: [] };
  if (exp && scopeKey(exp.scope) !== scopeKey(watch)) throw new WatchError('Scope changed; use a new watch id');
  target.actions.push({ ...action, date: dateJst(now), rankAtAction: measurement.after.metrics.rank, measurementFile: measurement.file,
    selection: { strategyVersion: config.strategy.version, configHash: hash(JSON.stringify(config)), qualification: watch.qualification, intent: watch.intent,
      priority: watch.priority, audience: watch.audience, need: watch.need, rationale: watch.rationale, nextStep: watch.nextStep, evidence: watch.evidence,
      order: SELECTION_ORDER } });
  target.history.push({ date: dateJst(now), event: 'record', actionIndex: target.actions.length - 1 });
  target.baseline = { measurementFile: measurement.file, rank: measurement.after.metrics.rank };
  target.target_metric = '固定クエリ・ページ・地域・端末のGSC平均順位 / 表示 / クリック / CTR';
  target.status = 'proposed'; target.next_check_date = null; target.reviewDays = 7;
  if (!exp) store.experiments.push(target);
  return target;
}
export function markDeployed(exp, proof, now = new Date()) {
  if (statusOf(exp) !== 'pending-deploy') throw new WatchError('No pending action');
  if (proof.conclusion !== 'success' || proof.status !== 'completed' || proof.head_branch !== 'main' || proof.path !== '.github/workflows/cloudflare-deploy.yml' || !/^[a-f0-9]{40}$/.test(proof.head_sha ?? '') || !Number.isFinite(Date.parse(proof.updated_at)) || Date.parse(proof.updated_at) > now.getTime()) throw new WatchError('Successful main production deployment required');
  if (calendarDate(new Date(proof.updated_at), 'Asia/Tokyo') < exp.actions.at(-1).date) throw new WatchError('Deployment predates the action');
  exp.history.push({ date: dateJst(now), event: 'deployed', actionIndex: exp.actions.length - 1, deployedAt: proof.updated_at, commit: proof.head_sha, url: proof.html_url });
  exp.status = 'running'; exp.started_at = proof.updated_at; exp.reviewDays = 7;
  exp.next_check_date = nextReviewDate(proof.updated_at, 7);
}
export function applyReview(exp, before, after, policy, snapshotFile, now = new Date(), confirmations = []) {
  if (statusOf(exp) !== 'observing') throw new WatchError('Only observing experiments may be reviewed');
  const deployment = deploymentFor(exp);
  const windows = reviewWindows(deployment.deployedAt, exp.reviewDays);
  if (windows.after.endDate > getDateRange(7, now).endDate) throw new WatchError('Complete post-deploy data not available yet');
  const already = exp.history.find((h) => h.event === 'review' && h.actionIndex === exp.actions.length - 1 && h.days === exp.reviewDays);
  if (already) return already;
  const outcome = evaluate(before, after, policy);
  // Confirmation windows must be disjoint: day 1–7 and day 8–14, never two overlapping averages.
  const confirmed = outcome === 'first-place' && exp.reviewDays >= 14 && confirmations.length === 2 && confirmations.every((m) => enough(m, policy) && m.rank === 1);
  const extend = (outcome === 'insufficient' || (outcome === 'first-place' && !confirmed)) && exp.reviewDays < 28;
  const review = { date: dateJst(now), event: 'review', actionIndex: exp.actions.length - 1, days: exp.reviewDays, outcome, complete: !extend, before, after, snapshotFile };
  exp.history.push(review);
  if (extend) {
    exp.reviewDays = exp.reviewDays === 7 ? 14 : 28;
    exp.next_check_date = nextReviewDate(deployment.deployedAt, exp.reviewDays);
  } else if (confirmed) {
    exp.status = 'done'; exp.closed_at = now.toISOString(); exp.next_check_date = addDays(dateJst(now), 7);
  } else if (outcome === 'insufficient' || outcome === 'first-place') {
    exp.status = 'abandoned'; exp.paused_reason = '28日でも十分な比較・1位継続確認ができないため要判断'; exp.next_check_date = null;
  } else {
    const resumeIndex = exp.history.findLastIndex((h) => h.event === 'resume');
    const misses = exp.history.slice(resumeIndex + 1).filter((h) => h.event === 'review' && h.complete && h.outcome === 'no-effect').length;
    exp.status = misses >= policy.maxIneffectiveCycles ? 'abandoned' : 'proposed';
    exp.paused_reason = exp.status === 'abandoned' ? '効果なしの反復上限。検索意図・対象を再検討' : null;
    exp.next_check_date = null;
  }
  return review;
}
