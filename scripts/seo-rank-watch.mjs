#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { getDateRange, addDays } from './lib/gsc-date-range.mjs';
import { WatchError, CONFIG, LEDGER, readJson, validateConfig, report, hash, scopeKey, writeSnapshot, readMeasurements, latestMeasurement, aggregate, enough, validateSnapshot, reviewWindows, statusOf, experimentFor, deploymentFor, updateLedger, recordAction, markDeployed, applyReview, dateJst } from './lib/seo-rank-watch.mjs';

async function main() {
  const { values: opts, positionals } = parseArgs({ allowPositionals: true, options: {
    repo: { type: 'string', default: process.cwd() }, id: { type: 'string' }, action: { type: 'string' },
    'run-id': { type: 'string' }, reason: { type: 'string' }, commit: { type: 'boolean' }, json: { type: 'boolean' },
    'no-fetch': { type: 'boolean' }, help: { type: 'boolean' },
  } });
  const root = resolve(opts.repo), command = positionals[0] ?? 'report';
  if (opts.help) {
    console.log('seo-rank-watch [report|collect|review|record|deploy|resume|interrupt|discover] [--repo PATH] [--json]\ncollect: read GSC and append snapshots\nreview [--no-fetch] [--commit]: review due observations; dry-run by default\nrecord --id ID --action FILE --commit: record one implemented improvement with needs/gap/done/method/serp\ndeploy --id ID --run-id NUMBER --commit: verify successful production workflow and start observation\nresume --id ID --reason TEXT --commit: reactivate a paused watch\ndiscover: show unregistered page-query candidates; never auto-register');
    return;
  }
  if (positionals.length > 1) throw new WatchError('Only one command / keyword per invocation');
  const config = validateConfig(readJson(root, CONFIG));
  const store = readJson(root, LEDGER);
  let client;
  const fetchWindow = async (watch, window) => {
    if (!client) {
      const api = await import('../.claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs');
      process.chdir(root); // Shared fetcher reads the repo-local credential configuration only.
      client = { auth: api.getAuth(), fetch: api.fetchSearchAnalytics };
    }
    const raw = await client.fetch(client.auth, { ...window, effectiveDimensions: ['date'], all: true, exact: true,
      query: watch.keyword, page: `https://doboku-note.com${watch.targetPath}`, country: watch.country, device: watch.device });
    return { window, metrics: aggregate(raw), raw };
  };
  const take = async (watch, windows, type, extra = {}) => {
    const before = await fetchWindow(watch, windows.before), after = await fetchWindow(watch, windows.after);
    const snapshot = { version: 1, type, watchId: watch.id, scope: watch, scopeKey: scopeKey(watch), fetchedAt: new Date().toISOString(), before, after,
      contentHash: hash(readFileSync(join(root, watch.contentPath))), ...extra };
    return { ...snapshot, file: writeSnapshot(root, snapshot) };
  };
  if (command === 'collect') {
    const after = getDateRange(7), before = getDateRange(7, undefined, addDays(after.startDate, -1));
    for (const watch of config.watchwords.filter((w) => w.enabled !== false)) {
      const snapshot = await take(watch, { before, after }, 'measurement');
      console.log(`${watch.keyword}: ${snapshot.after.metrics.rank?.toFixed(2) ?? '—'} / ${snapshot.after.metrics.impressions} 表示 → ${snapshot.file}`);
      const exp = experimentFor(store.experiments, watch.id);
      if (statusOf(exp) === 'observing') {
        const windows = reviewWindows(deploymentFor(exp).deployedAt, exp.reviewDays);
        if (windows.after.endDate <= after.endDate) await take(watch, windows, 'review', { actionIndex: exp.actions.length - 1, days: exp.reviewDays, deployedAt: deploymentFor(exp).deployedAt });
      }
    }
    return;
  }
  if (command === 'discover') {
    const { readdirSync } = await import('node:fs');
    const dir = '.claude/state/metrics/gsc';
    const file = readdirSync(join(root, dir)).filter((f) => /^gsc-page-query-.*\.json$/.test(f)).sort().at(-1);
    if (!file) { console.log('No page-query snapshot'); return; }
    const data = readJson(root, `${dir}/${file}`);
    const candidates = data.rows.filter((r) => r.position > 1 && r.position <= 20 && r.impressions >= config.policy.minImpressions &&
      r.keys[0].startsWith('https://doboku-note.com/') && !r.keys[0].includes('/docs/') &&
      !config.watchwords.some((w) => w.keyword === r.keys[1] && `https://doboku-note.com${w.targetPath}` === r.keys[0]))
      .sort((a, b) => a.position - b.position || b.impressions - a.impressions).slice(0, 10);
    console.log(JSON.stringify({ source: `${dir}/${file}`, period: data.meta, note: '登録前に正規URL・実ファイル・検索意図・既存実験を確認。未登録クエリは自動改善しない。', candidates }, null, 2));
    return;
  }
  if (command === 'report') {
    const data = report(root);
    if (opts.json) console.log(JSON.stringify(data, null, 2));
    else {
      for (const w of data.rows) console.log(`${w.keyword}: ${w.status} / ${w.current?.rank?.toFixed(2) ?? '—'}位 / ${w.current?.impressions ?? '—'}表示 / 前期差 ${w.delta?.toFixed(2) ?? '—'} / レビュー ${w.nextReviewDate ?? '—'}${w.fresh ? '' : ' / 要取得'}`);
      console.log(`改善候補: ${data.selected?.keyword ?? 'なし'}${data.capacity ? '' : '（既存実験の同時実行上限）'}`);
      console.log(`期限到来: ${data.due.join(', ') || 'なし'}。平均順位の変化は施策の因果効果を保証しない。`);
    }
    return;
  }
  if (command === 'review') {
    const view = report(root);
    const firstPlace = view.rows.filter((w) => w.fresh && w.enabled !== false && w.status === 'active' && enough(w.current, config.policy) && enough(w.previous, config.policy) && w.current.rank === 1 && w.previous.rank === 1).map((w) => w.id);
    if (opts.id && !config.watchwords.some((w) => w.id === opts.id)) throw new WatchError('Unknown watchword id');
    const ids = [...new Set([...view.due, ...firstPlace])].filter((id) => !opts.id || opts.id === id);
    const snapshots = readMeasurements(root);
    const pending = [];
    for (const id of ids) {
      const watch = config.watchwords.find((w) => w.id === id), exp = experimentFor(store.experiments, id);
      if (firstPlace.includes(id)) { pending.push({ id, firstPlace: latestMeasurement(snapshots, watch), watch }); continue; }
      if (statusOf(exp) === 'achieved') {
        const measurement = latestMeasurement(snapshots, watch);
        if (!measurement || !report(root).rows.find((w) => w.id === id).fresh) continue;
        pending.push({ id, monitor: measurement }); continue;
      }
      const deployment = deploymentFor(exp), windows = reviewWindows(deployment.deployedAt, exp.reviewDays);
      if (windows.after.endDate > getDateRange(7).endDate) continue;
      const snapshot = opts['no-fetch'] ? snapshots.filter((s) => s.type === 'review' && s.scopeKey === scopeKey(watch) && s.deployedAt === deployment.deployedAt && s.actionIndex === exp.actions.length - 1 && s.days === exp.reviewDays).at(-1)
        : await take(watch, windows, 'review', { actionIndex: exp.actions.length - 1, days: exp.reviewDays, deployedAt: deployment.deployedAt });
      if (!snapshot) { console.log(`${id}: 正確な前後期間の取得待ち`); continue; }
      validateSnapshot(snapshot);
      if (JSON.stringify(snapshot.before.window) !== JSON.stringify(windows.before) || JSON.stringify(snapshot.after.window) !== JSON.stringify(windows.after)) throw new WatchError('Review windows do not match deployment');
      pending.push({ id, snapshot, expectedHistory: hash(JSON.stringify(exp.history)) });
    }
    const mutate = (ledger) => pending.map((item) => {
      let exp = experimentFor(ledger.experiments, item.id);
      if (item.firstPlace) {
        if (statusOf(exp) !== 'active') throw new WatchError('State changed during first-place confirmation');
        if (!exp) { exp = { id: `SEO-${item.id}`, kind: 'seo-rank-watch', watchId: item.id, title: `検索順位監視: ${item.watch.keyword}`, scope: item.watch, created_at: new Date().toISOString(), actions: [], history: [] }; ledger.experiments.push(exp); }
        exp.status = 'done'; exp.closed_at = new Date().toISOString(); exp.next_check_date = addDays(dateJst(), 7);
        exp.history.push({ date: dateJst(), event: 'baseline-achieved', snapshotFile: item.firstPlace.file, note: '改善前の非重複7日×2で1位を確認。施策効果とは扱わない。' });
        return { id: item.id, status: 'achieved', outcome: '改善前から1位' };
      }
      if (item.monitor) {
        if (statusOf(exp) !== 'achieved') throw new WatchError('State changed during monitoring');
        exp.history.push({ date: dateJst(), event: 'monitor', metrics: item.monitor.after.metrics, snapshotFile: item.monitor.file });
        exp.next_check_date = addDays(dateJst(), 7);
        return { id: item.id, outcome: item.monitor.after.metrics.rank === 1 ? '1位継続' : '監視:順位変化・欠測を確認', status: 'achieved' };
      }
      if (hash(JSON.stringify(exp.history)) !== item.expectedHistory) throw new WatchError('State changed during review');
      const s = item.snapshot;
      // Recompute the two disjoint seven-day confirmation windows from raw rows.
      const confirmations = [-7, 0].map((offset) => {
        const endDate = addDays(s.after.window.endDate, offset), startDate = addDays(endDate, -6);
        const raw = { ...s.after.raw, meta: { ...s.after.raw.meta, startDate, endDate }, rows: s.after.raw.rows.filter((r) => r.keys[0] >= startDate && r.keys[0] <= endDate) };
        return aggregate(raw);
      });
      return { id: item.id, ...applyReview(exp, s.before.metrics, s.after.metrics, config.policy, s.file, new Date(), confirmations), status: statusOf(exp), nextReviewDate: exp.next_check_date };
    });
    const results = opts.commit ? await updateLedger(root, mutate) : mutate(structuredClone(store));
    console.log(JSON.stringify({ committed: Boolean(opts.commit), results }, null, 2));
    return;
  }
  const watch = config.watchwords.find((w) => w.id === opts.id);
  if (!watch) throw new WatchError('Specify one registered --id');
  if (command === 'record') {
    if (!opts.action) throw new WatchError('--action JSON file required');
    const selected = report(root).selected;
    if (selected?.id !== watch.id) throw new WatchError('Select the first eligible keyword in the current report');
    const measurement = latestMeasurement(readMeasurements(root), watch);
    const action = JSON.parse(readFileSync(resolve(opts.action), 'utf8'));
    const contentHash = hash(readFileSync(join(root, watch.contentPath)));
    if (contentHash === measurement.contentHash) throw new WatchError('Target content has not changed since measurement');
    const mutate = (ledger) => recordAction(ledger, config, watch, { needs: action.needs, gap: action.gap, done: action.done, method: action.method, serp: action.serp, contentHash }, measurement);
    const result = opts.commit ? await updateLedger(root, mutate) : mutate(structuredClone(store));
    console.log(JSON.stringify({ committed: Boolean(opts.commit), id: result.id, status: statusOf(result), note: '本番反映を確認するまで観察は開始しない' }, null, 2));
    return;
  }
  if (command === 'deploy') {
    if (!/^\d+$/.test(opts['run-id'] ?? '')) throw new WatchError('Valid --run-id required');
    const repository = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const proof = JSON.parse(execFileSync('gh', ['api', `repos/${repository}/actions/runs/${opts['run-id']}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    const exp = experimentFor(store.experiments, watch.id);
    if (!exp || !/^[a-f0-9]{40}$/.test(proof.head_sha ?? '')) throw new WatchError('Invalid deployment');
    const deployedContent = execFileSync('git', ['show', `${proof.head_sha}:${watch.contentPath}`], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    if (hash(deployedContent) !== exp.actions.at(-1).contentHash) throw new WatchError('Deployed content differs from recorded action; fetch git refs or inspect deployment');
    // A newer successful production deployment must not have replaced the recorded version.
    const runs = JSON.parse(execFileSync('gh', ['api', `repos/${repository}/actions/workflows/cloudflare-deploy.yml/runs?branch=main&status=success&per_page=1`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    if (String(runs.workflow_runs?.[0]?.id) !== opts['run-id']) throw new WatchError('Use the latest successful production deployment');
    const mutate = (ledger) => { const current = experimentFor(ledger.experiments, watch.id); markDeployed(current, proof); return { id: current.id, nextReviewDate: current.next_check_date }; };
    console.log(JSON.stringify({ committed: Boolean(opts.commit), ...(opts.commit ? await updateLedger(root, mutate) : mutate(structuredClone(store))) }, null, 2));
    return;
  }
  if (command === 'interrupt') {
    if (!opts.reason?.trim()) throw new WatchError('--reason required');
    const mutate = (ledger) => {
      const exp = experimentFor(ledger.experiments, watch.id);
      if (!['observing', 'pending-deploy'].includes(statusOf(exp))) throw new WatchError('No observation to interrupt');
      exp.status = 'abandoned'; exp.paused_reason = opts.reason; exp.next_check_date = null;
      exp.history.push({ date: dateJst(), event: 'interrupt', reason: opts.reason });
      return { id: exp.id, status: statusOf(exp) };
    };
    console.log(JSON.stringify({ committed: Boolean(opts.commit), ...(opts.commit ? await updateLedger(root, mutate) : mutate(structuredClone(store))) }, null, 2));
    return;
  }
  if (command === 'resume') {
    if (!opts.reason?.trim()) throw new WatchError('--reason required');
    const mutate = (ledger) => {
      const exp = experimentFor(ledger.experiments, watch.id);
      if (statusOf(exp) !== 'paused') throw new WatchError('Only paused watchwords can resume');
      exp.status = 'proposed'; exp.paused_reason = null;
      exp.history.push({ date: dateJst(), event: 'resume', reason: opts.reason });
      return { id: exp.id, status: statusOf(exp) };
    };
    console.log(JSON.stringify({ committed: Boolean(opts.commit), ...(opts.commit ? await updateLedger(root, mutate) : mutate(structuredClone(store))) }, null, 2));
    return;
  }
  throw new WatchError('Unknown command');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => {
  console.error(error instanceof WatchError ? `SEO Rank Watch: ${error.message}` : 'SEO Rank Watch failed. Check local credentials, files or connectivity. Sensitive response details are withheld. Run --help for supported commands.');
  process.exitCode = 1;
});
