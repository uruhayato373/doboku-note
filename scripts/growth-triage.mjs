#!/usr/bin/env node
/**
 * growth-triage.mjs — 週次レビュー（ローカル・土曜）で機会ダイジェストの全件を処分し、台帳へ機械的に起票する。
 *
 * なぜ: 計測が surface した機会や申し送りが散文のまま翌週へ持ち越され、同じ Must が 2 週連続で未達になっていた。
 * 判断（どこへ振り分けるか・カードの文面）はレビューが決め、採番・書式・台帳への書き込み・記録はここが決定的に行う。
 * 月曜の weekly-review-guard が check-growth-triage で「未処分 0 件」を検査する。
 *
 * Usage:
 *   node scripts/growth-triage.mjs list [--week 2026-W38] [--json]      # 未処分の表示対象（watchword 下書き付き）
 *   node scripts/growth-triage.mjs apply --decisions .tmp/growth-triage-2026-W38.json [--commit]
 *
 * 判断ファイル: { "digestWeek": "2026-W38", "decisions": [ { "id": "OPP-…", "action": "backlog", … }, … ] }
 *   action と必須項目は scripts/lib/growth-triage.mjs 冒頭。id:null の backlog は申し送りの起票。
 *
 * 書き込み先（--commit）: .claude/todo/backlog.md / .claude/state/experiments.json / .claude/config/seo-watchwords.json /
 *   .claude/state/metrics/growth/triage-log.json。全判断を先に検証し、1 件でも不正なら何も書かない。
 *   書いた後に check-backlog-schema が落ちたら全ファイルを元に戻す。
 * **ローカル専用**: DN の採番に git の全履歴が要る（shallow clone では exit 2）。
 *
 * exit: 0 成功 / 1 判断の不正・書き込み後の検査失敗（元に戻した）/ 2 検査不成立（digest なし・履歴不足）
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { jst } from './lib/business-direction.mjs';
import { nextId } from './backlog-edit.mjs';
import { parseBacklog } from './lib/backlog-lib.mjs';
import { readWatchConfig, validateConfig } from './lib/seo-rank-watch.mjs';
import { validateDecisions, renderCard, insertCard, nextExperimentId, newExperiment, closeExperiment, buildWatch, pendingItems } from './lib/growth-triage.mjs';

const TAG = '[growth-triage]';
const GROWTH = '.claude/state/metrics/growth';
const LOG = `${GROWTH}/triage-log.json`;
const BACKLOG = '.claude/todo/backlog.md';
const LEDGER = '.claude/state/experiments.json';
const WATCH = '.claude/config/seo-watchwords.json';
const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);

function loadDigest(week) {
  const files = existsSync(GROWTH) ? readdirSync(GROWTH).filter((f) => /^digest-\d{4}-W\d{2}\.json$/.test(f)).sort() : [];
  const name = week ? `digest-${week}.json` : files.at(-1);
  return name && files.includes(name) ? { file: `${GROWTH}/${name}`, digest: readJson(`${GROWTH}/${name}`) } : null;
}

function gitHistory() {
  try {
    if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim() === 'true') return null;
    return execFileSync('git', ['log', '-p', '--format=%H', '--', BACKLOG, 'docs/todo/backlog.md'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 60_000 });
  } catch {
    return null;
  }
}

function list(loaded) {
  const log = readJson(LOG, { entries: [] });
  const pending = pendingItems(loaded.digest, log);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ digestWeek: loaded.digest.week, digest: loaded.file, pending }, null, 2));
  } else {
    console.log(`${TAG} ${loaded.digest.week}（${loaded.file}）表示 ${loaded.digest.surfaced.length} 件中 未処分 ${pending.length} 件`);
    for (const i of pending) console.log(`  ${i.id} [${i.category}/${i.type}] ${i.title}\n    推奨: ${i.suggest.join(' / ')}${i.watchwordDraft ? `・watchword 下書き: ${i.watchwordDraft.keyword} → ${i.watchwordDraft.contentPath}` : ''}`);
  }
  return 0;
}

function apply(loaded) {
  const file = argValue('--decisions');
  if (!file || !existsSync(file)) { console.error(`${TAG} --decisions <file> が必要`); return 1; }
  const input = JSON.parse(readFileSync(file, 'utf8'));
  const { digest, file: digestFile } = loaded;
  if (input.digestWeek !== digest.week) { console.error(`${TAG} 判断ファイルの digestWeek(${input.digestWeek}) と digest(${digest.week}) が不一致`); return 1; }
  const decisions = input.decisions ?? [];

  const backlogText = readFileSync(BACKLOG, 'utf8');
  const ledger = readJson(LEDGER, { experiments: [] });
  const log = readJson(LOG, { schemaVersion: 1, entries: [] });
  const errors = validateDecisions(decisions, {
    items: digest.surfaced,
    backlogIds: new Set(parseBacklog(backlogText).map((c) => c.id).filter(Boolean)),
    experimentIds: new Set(ledger.experiments.map((e) => e.id)),
  });
  const byId = new Map(digest.surfaced.map((i) => [i.id, i]));
  for (const d of decisions.filter((x) => x.action === 'verdict')) {
    const expId = byId.get(d.id)?.key?.experiment;
    if (!ledger.experiments.some((e) => e.id === expId)) errors.push(`${d.id}: 実験 ${expId} が台帳に無い`);
  }

  const now = new Date().toISOString();
  const today = jst();
  const refs = new Map();
  let nextBacklog = backlogText;
  let dnSeq = null;
  if (decisions.some((d) => d.action === 'backlog')) {
    const history = gitHistory();
    if (history == null) { console.error(`${TAG} 検査不成立: git の全履歴を読めない（shallow clone など）。DN の再利用を避けるため採番しない`); return 2; }
    dnSeq = nextId(backlogText, history).max;
  }
  for (const d of decisions.filter((x) => x.action === 'backlog')) {
    const dnId = `DN-${String(++dnSeq).padStart(4, '0')}`;
    try {
      nextBacklog = insertCard(nextBacklog, d.tier, renderCard({ dnId, d, item: byId.get(d.id), digestFile, today }));
    } catch (e) { errors.push(`${d.id ?? '申し送り'}: ${e.message}`); }
    if (d.id) refs.set(d.id, dnId);
    else refs.set(`handover:${d.title}`, dnId);
  }
  for (const d of decisions.filter((x) => x.action === 'experiment')) {
    const expId = nextExperimentId(ledger.experiments);
    ledger.experiments.push(newExperiment({ expId, d, item: byId.get(d.id), digestFile, nowIso: now }));
    refs.set(d.id, expId);
  }
  for (const d of decisions.filter((x) => x.action === 'verdict')) {
    const exp = ledger.experiments.find((e) => e.id === byId.get(d.id)?.key?.experiment);
    if (exp) { closeExperiment(exp, d, now); refs.set(d.id, exp.id); }
  }
  const rawWatch = readJson(WATCH, null);
  const watchDecisions = decisions.filter((x) => x.action === 'watchword');
  if (watchDecisions.length) {
    const injected = readWatchConfig(process.cwd());
    for (const d of watchDecisions) {
      const w = buildWatch(byId.get(d.id), d.watch);
      injected.watchwords.push(w);
      rawWatch.watchwords.push(w);
      refs.set(d.id, `watchword:${w.id}`);
    }
    try { validateConfig(injected); } catch (e) { errors.push(`watchword: ${e.message}`); }
  }
  for (const d of decisions.filter((x) => x.action === 'bundle')) refs.set(d.id, refs.get(d.into) ?? d.into);

  if (errors.length) {
    for (const e of errors) console.error(`${TAG} ✗ ${e}`);
    console.error(`${TAG} 判断 ${decisions.length} 件を検査・不正 ${errors.length} 件。何も書いていない`);
    return 1;
  }

  const weekStart = digest.period.startDate;
  const entries = decisions.map((d) => ({
    id: d.id ?? null, week: digest.week, weekStart, action: d.action, at: now,
    ...(refs.has(d.id) ? { ref: refs.get(d.id) } : {}),
    ...(d.id == null ? { ref: refs.get(`handover:${d.title}`), title: d.title } : {}),
    ...(d.reason ? { reason: d.reason } : {}), ...(d.until ? { until: d.until } : {}),
    ...(d.result ? { result: d.result } : {}),
  }));
  const pendingAfter = pendingItems(digest, { entries: [...log.entries, ...entries] });
  for (const e of entries) console.log(`${TAG} ${e.id ?? '申し送り'} → ${e.action}${e.ref ? ` ${e.ref}` : ''}${e.reason ? `（${e.reason}）` : ''}`);
  console.log(`${TAG} ${digest.week}: 判断 ${decisions.length} 件 / この週の未処分 残り ${pendingAfter.length} 件${pendingAfter.length ? `（${pendingAfter.map((i) => i.id).join(', ')}）` : ''}`);
  if (!args.includes('--commit')) { console.log(`${TAG} dry-run（--commit で台帳へ書き込む）`); return 0; }

  const originals = new Map([[BACKLOG, backlogText], [LEDGER, readFileSync(LEDGER, 'utf8')], [WATCH, readFileSync(WATCH, 'utf8')], [LOG, existsSync(LOG) ? readFileSync(LOG, 'utf8') : null]]);
  const changed = [];
  if (nextBacklog !== backlogText) { writeFileSync(BACKLOG, nextBacklog); changed.push(BACKLOG); }
  if (decisions.some((d) => ['experiment', 'verdict'].includes(d.action))) { ledger.updated_at = now; writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`); changed.push(LEDGER); }
  if (watchDecisions.length) { writeFileSync(WATCH, `${JSON.stringify(rawWatch, null, 2)}\n`); changed.push(WATCH); }
  mkdirSync(GROWTH, { recursive: true });
  writeFileSync(LOG, `${JSON.stringify({ schemaVersion: 1, entries: [...log.entries, ...entries] }, null, 2)}\n`);
  changed.push(LOG);
  try {
    execFileSync('node', ['scripts/check-backlog-schema.mjs'], { stdio: 'inherit' });
  } catch {
    for (const [p, body] of originals) if (body != null) writeFileSync(p, body);
    console.error(`${TAG} ✗ check-backlog-schema が落ちたため全ファイルを元に戻した`);
    return 1;
  }
  console.log(`${TAG} 書き込み: ${changed.join(' ')}`);
  console.log(`${TAG} 次: git add ${changed.join(' ')}（並行作業を巻き込まないよう明示指定で）`);
  return 0;
}

function main() {
  const [command] = args;
  if (!['list', 'apply'].includes(command)) { console.error(`${TAG} usage: list | apply --decisions <file> [--commit]`); return 1; }
  const loaded = loadDigest(argValue('--week'));
  if (!loaded) { console.error(`${TAG} 検査不成立: 機会ダイジェスト（${GROWTH}/digest-*.json）が無い`); return 2; }
  return command === 'list' ? list(loaded) : apply(loaded);
}

process.exitCode = main();
