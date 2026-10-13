#!/usr/bin/env node
/**
 * search-improvement.mjs — 検索キーワード戦略の改善を、週次レビューが「直す→記録→本番反映→計測→判定」まで実験台帳で回す CLI。
 * ---------------------------------------------------------------------------
 * 判定と組み立ては scripts/lib/search-improvement.mjs（純関数）、候補・週次の処置は scripts/lib/search-opportunities.mjs。
 * 改善をカードに積んで待たせない（「起票済」は作らない）。直して develop に入れた commit を record で記録する。
 *
 * Usage:
 *   npm run search-improvement -- status [--json]
 *       検索改善の EXP の一覧（段階: 本番反映待ち・計測中・判定待ち・判定済・中止。「改善の記録なし」は違反）
 *   npm run search-improvement -- record --page /exam/... --change "何を直したか" [--sha <commit>] [--cluster <id>] [--commit|--write]
 *       直した改善を記録して EXP を作る。commit（既定 HEAD）は develop に入ったもの（squash 前の feature の commit は本番に入らない）。
 *       基準（直す前の検索語・順位）は commit の日より前に終わる GSC 集計から取る
 *   npm run search-improvement -- record --id EXP-### --change "…" [--sha <commit>] [--commit|--write]
 *       2026-10-13 以前にカードで起票した EXP に改善の記録を書く
 *   npm run search-improvement -- sync [--commit|--write]
 *       記録した commit を含む最初の本番デプロイの日で計測を始める。CI（fetch-metrics の publish）が measure-experiments の前に --write で回す
 *   npm run search-improvement -- close --id EXP-### --result success|partial|no-effect|negative --learning "…" [--commit|--write]
 *       確定した自動計測（VERDICT_DUE）を判定して閉じる
 *   npm run search-improvement -- triage [--check] [--weekly] [--json]
 *       週次の処置（受け皿外・旧 URL・誘導の見直し・記録の無い実験・判定待ち・本番に入らない改善）。--weekly は今週の改善件数も数える。
 *       --check は要処置が残れば exit 1（週次レビューの完了条件は triage --check --weekly）
 *   npm run search-improvement -- decide --cluster <id> --page <接頭辞> (--accept | --route-to <狙いのページ>) --reason "…" [--commit|--write]
 *       受け皿外の候補の判断を設定（クラスターの pageDecisions）へ理由と日付つきで記録する
 *   npm run search-improvement -- monthly [--month YYYY-MM] [--json]
 *       月次の集計（クラスター別に直した数・計測を始めた数・判定と結果・見直しの要るクラスター）。既定は前の月
 *   npm run search-improvement -- link --card DN-#### --none "理由" [--commit|--write]
 *       起点が検索キーワード戦略でも 1 ページの順位改善ではないカードに「**実験**: なし（理由）」を書く
 *
 *   書き込み: 既定は dry-run（表示だけ）。--write は作業ツリーへ書く。--commit は作業ツリーに触れず origin/develop へ直接積む
 *   （lib/git-direct-commit.mjs）。
 * exit: 0 成功 / 1 取得失敗・書き込み失敗・要処置あり（--check） / 2 引数不正
 * ---------------------------------------------------------------------------
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { readDataset, readDatasetIf } from './lib/dataset-io.mjs';
import { formatDataset } from './lib/dataset-write.mjs';
import { commitFilesToRemoteBranch } from './lib/git-direct-commit.mjs';
import { jstDayOf, todayJst } from './lib/jst-date.mjs';
import { findCard } from './backlog-edit.mjs';
import { BACKLOG } from './todo-add.mjs';
import { buildContentIndex } from './lib/content-index.mjs';
import { CONFIG, buildSearchOpportunities } from './lib/search-opportunities.mjs';
import { normalizeTargetPath } from './lib/legacy-routes.mjs';
import { firstDeployContaining, isAncestor, listProductionDeploys } from './lib/production-deploys.mjs';
import {
  KIND, OPEN, PHASES, RESULTS, abandonExperiment, buildExperiment, closeExperiment, dispatchIndex, implementationOf, isSearchExperiment,
  monthlySummary, nextExperimentId, recordImplementation, startExperiment, syncPlan, withNoneMarker,
} from './lib/search-improvement.mjs';

const TAG = '[search-improvement]';
const LEDGER_ID = 'business.experiments';
const LEDGER = datasetPath(LEDGER_ID);
const BASE_BRANCH = 'origin/develop';

const args = parseCliArgs({
  page: { type: 'string' }, cluster: { type: 'string' }, change: { type: 'string' }, sha: { type: 'string' }, month: { type: 'string' },
  card: { type: 'string' }, none: { type: 'string' }, id: { type: 'string' }, result: { type: 'string' }, learning: { type: 'string' },
  reason: { type: 'string' }, 'route-to': { type: 'string' }, accept: { type: 'boolean' }, check: { type: 'boolean' }, weekly: { type: 'boolean' },
  commit: { type: 'boolean' }, write: { type: 'boolean' }, json: { type: 'boolean' },
});
const command = args._[0];
// Git Bash は "/exam/..." を Windows のパスに書き換えて渡すので戻す（normalizeTargetPath）。decide の --page は接頭辞なので末尾の / は残す
if (args.page) args.page = normalizeTargetPath(args.page, new Map()) + (args.page.endsWith('/') && args.page !== '/' ? '/' : '');

class UsageError extends Error {}
const fail = (msg) => { throw new UsageError(msg); };
const git = (a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/**
 * 実験台帳・設定・backlog を書き換える。mutate({ ledger, config, backlog }) は台帳・設定を直接書き換え、backlog の新しい中身・commit メッセージ・結果を返す。
 * dry-run は作業ツリーの中身で mutate だけ行い、--write は作業ツリーへ書き、--commit は origin/develop の最新に対して行い 1 commit で積む。
 */
function apply({ backlog: needsBacklog = false, ledger: needsLedger = true, config: needsConfig = false }, mutate) {
  const paths = [needsBacklog && BACKLOG, needsLedger && LEDGER, needsConfig && CONFIG].filter(Boolean);
  const run = (current) => {
    const ledger = needsLedger ? JSON.parse(current[LEDGER]) : null;
    const config = needsConfig ? JSON.parse(current[CONFIG]) : null;
    const out = mutate({ ledger, config, backlog: current[BACKLOG] });
    const texts = {};
    if (needsLedger) {
      ledger.updated_at = new Date().toISOString();
      texts[LEDGER] = formatDataset(LEDGER_ID, ledger).text;
    }
    if (needsConfig) texts[CONFIG] = formatDataset('config.search-strategy', config).text;
    if (needsBacklog && out.backlog != null) texts[BACKLOG] = out.backlog;
    return { texts, message: out.message, result: out.result };
  };
  if (args.commit) {
    const r = commitFilesToRemoteBranch({ root: ROOT, paths, transform: (current) => run(current) });
    console.log(`${TAG} origin/develop へ push した（${r.commit.slice(0, 9)}）。手元の checkout へは git pull で取り込む`);
    return r.result;
  }
  const current = Object.fromEntries(paths.map((p) => [p, readFileSync(join(ROOT, p), 'utf8')]));
  const { texts, result } = run(current);
  if (args.write) {
    for (const [p, t] of Object.entries(texts)) {
      const eol = current[p].includes('\r\n') ? '\r\n' : '\n';
      writeFileSync(join(ROOT, p), t.replace(/\r?\n/g, eol));
    }
    console.log(`${TAG} 作業ツリーへ書いた: ${Object.keys(texts).join('・')}`);
  } else console.log(`${TAG} dry-run（--write で作業ツリーへ・--commit で origin/develop へ）`);
  return result;
}

/** 記録の対象の候補（cluster を指定しなければ、直してよい候補のうち表示の多いクラスター） */
function candidateFor(r, page, clusterId) {
  if (!r.period) fail('GSC の検索語×ページ集計が無い');
  const pool = clusterId
    ? (r.clusters.find((x) => x.id === clusterId) ?? fail(`クラスター ${clusterId} が ${CONFIG} に無い`)).candidates.map((p) => ({ ...p, cluster: clusterId }))
    : r.fileable;
  const p = pool.find((x) => x.page === page) ?? fail(`${page} は直す前（GSC ${r.period.startDate}〜${r.period.endDate}）の直してよい候補（${r.bands.striking}・表示 ${r.config.striking.minImpressions} 以上）に無い`);
  if (!p.fileable) fail(`${page} は直してよい候補ではない（観察中・旧URL・受け皿外・計測の終わっていない実験のどれか）`);
  return { cluster: r.config.clusters.find((x) => x.id === p.cluster), candidate: p };
}

/** commit を develop に入ったものに限って、12 桁の SHA と JST の日を返す */
function developCommit(sha = 'HEAD') {
  const full = git(['rev-parse', '--verify', `${sha}^{commit}`]);
  git(['fetch', '-q', 'origin', 'develop']);
  if (!isAncestor(ROOT, full, BASE_BRANCH)) fail(`${full.slice(0, 12)} は ${BASE_BRANCH} に入っていない（develop へ push してから記録する。squash 前の feature の commit は本番に入らない）`);
  return { commit: full.slice(0, 12), at: jstDayOf(new Date(git(['log', '-1', '--format=%cI', full]))) };
}

function cmdRecord() {
  if (!args.change?.trim() || !(args.page || args.id)) fail('record には --change（何を直したか）と、--page（新しく記録）か --id EXP-###（既存の実験）が要る');
  const impl = { ...developCommit(args.sha), change: args.change };
  if (args.id) {
    apply({}, ({ ledger }) => {
      const e = ledger.experiments.find((x) => x.id === args.id && isSearchExperiment(x)) ?? fail(`${args.id} は検索改善（kind ${KIND}）の実験に無い`);
      recordImplementation(e, impl);
      return { message: `search: ${args.id} の改善を記録する（${impl.commit}・${impl.change}）\n`, result: null };
    });
    console.log(`${TAG} ${args.id}: 改善を記録した（${impl.commit}・${impl.at}）→ 本番反映待ち`);
    return;
  }
  // 基準は直す前の状態: commit の日より前に終わる集計
  const r = buildSearchOpportunities(ROOT, { maxCandidates: Infinity, asOf: impl.at });
  const { cluster, candidate } = candidateFor(r, args.page, args.cluster);
  const contentPath = buildContentIndex(ROOT).index.get(candidate.page) ?? null;
  const result = apply({}, ({ ledger }) => {
    const open = ledger.experiments.find((e) => isSearchExperiment(e) && e.searchStrategy?.page === candidate.page && OPEN.includes(e.status));
    if (open) fail(`${candidate.page} には計測の終わっていない ${open.id} がある`);
    const id = nextExperimentId(ledger.experiments);
    ledger.experiments.push(buildExperiment({ id, cluster, candidate, period: r.period, source: r.source, measure: r.config.cycle.measure, bands: r.bands, contentPath, implementation: impl }));
    return { message: `search: ${id} に改善を記録する（${candidate.page}・${impl.commit}）\n`, result: id };
  });
  console.log(`${TAG} ${result}: ${candidate.page} の改善を記録した（${impl.commit}・${impl.at}・直す前 GSC ${r.period.startDate}〜${r.period.endDate}）→ 本番反映待ち`);
}

function cmdLink() {
  if (!/^DN-\d{4}$/.test(args.card ?? '') || !args.none?.trim()) fail('link には --card DN-#### と --none "理由" が要る（ページの順位改善はカードにせず、直して record する）');
  apply({ backlog: true, ledger: false }, ({ backlog }) => {
    const found = findCard(backlog, args.card);
    if (found.error) fail(found.error);
    return { backlog: withNoneMarker(backlog, found.card.endLine, args.none), message: `search: ${args.card} は実験にしない（${args.none.trim()}）\n`, result: null };
  });
  console.log(`${TAG} ${args.card}: 実験にしない（${args.none.trim()}）`);
}

/** 本番デプロイの一覧は 1 回だけ取る（いちばん古い改善の日から）。 */
function deployFinder(firstSince) {
  let deploys = null;
  return (commit, since) => {
    deploys ??= listProductionDeploys(ROOT, { since: firstSince });
    const after = deploys.filter((d) => jstDayOf(new Date(d.at)) >= since);
    return firstDeployContaining(after, (sha) => isAncestor(ROOT, commit, sha));
  };
}

function cmdSync() {
  const ledger = readDataset(ROOT, LEDGER_ID);
  const dispatchById = dispatchIndex((readDatasetIf(ROOT, 'state.dispatch-log') ?? { entries: [] }).entries);
  const targets = ledger.experiments.filter((e) => isSearchExperiment(e) && e.status === 'proposed');
  const implemented = targets.map((e) => implementationOf(e, dispatchById)).filter(Boolean);
  const find = deployFinder(implemented.map((i) => i.at).sort()[0] ?? null);
  let plan;
  try {
    plan = syncPlan(ledger.experiments, dispatchById, find);
  } catch (e) {
    console.error(`${TAG} 本番デプロイの取得に失敗（gh api）: ${String(e?.stderr || e?.message || e).trim().slice(0, 300)}`);
    return 1;
  }
  const count = (a) => plan.filter((p) => p.action === a).length;
  console.log(`${TAG} 本番反映待ち ${targets.length} 件（改善の記録あり ${implemented.length}）→ 計測を始める ${count('start')} / まだ本番に無い ${count('wait')} / 中止 ${count('abandon')}`);
  for (const p of plan) {
    if (p.action === 'start') console.log(`  - ${p.id}: 本番反映 ${jstDayOf(new Date(p.deploy.at))}（run ${p.deploy.id}・commit ${p.implementation.commit}）から計測`);
    if (p.action === 'wait') console.log(`  - ${p.id}: 改善 ${p.implementation.at}・commit ${p.implementation.commit} を含む本番デプロイが無い`);
    if (p.action === 'abandon') console.log(`  - ${p.id}: 中止（${p.reason}）`);
  }
  const changes = plan.filter((p) => p.action !== 'wait');
  if (!changes.length) return 0;
  apply({}, ({ ledger: l }) => {
    for (const p of changes) {
      const e = l.experiments.find((x) => x.id === p.id);
      if (!e || e.status !== 'proposed') continue; // 先を越された
      if (p.action === 'start') startExperiment(e, p.deploy, p.implementation);
      else abandonExperiment(e, p.reason);
    }
    return { message: `search: 検索改善の実験を本番反映に合わせる（開始 ${count('start')}・中止 ${count('abandon')}）\n`, result: null };
  });
  return 0;
}

function cmdClose() {
  if (!args.id || !args.result || !args.learning) fail(`close には --id・--result（${Object.keys(RESULTS).join(' / ')}）・--learning が要る`);
  apply({}, ({ ledger }) => {
    const e = ledger.experiments.find((x) => x.id === args.id && isSearchExperiment(x)) ?? fail(`${args.id} は検索改善（kind ${KIND}）の実験に無い`);
    closeExperiment(e, { result: args.result, learning: args.learning });
    return { message: `search: ${args.id} を判定する（${RESULTS[args.result]}）\n`, result: null };
  });
  console.log(`${TAG} ${args.id}: ${RESULTS[args.result]}で閉じた`);
}

function cmdStatus() {
  const r = buildSearchOpportunities(ROOT);
  if (args.json) {
    process.stdout.write(`${JSON.stringify(r.experiments, null, 2)}\n`);
    return;
  }
  const by = Object.fromEntries(Object.keys(PHASES).map((k) => [k, r.experiments.filter((e) => e.phase === k)]));
  console.log(`${TAG} 検索改善の実験 ${r.experiments.length} 件: ${Object.entries(by).map(([k, v]) => `${PHASES[k]} ${v.length}`).join(' / ')}`);
  for (const e of r.experiments) {
    const m = e.measurement ? `・計測 ${e.measurement.pre ?? '—'}→${e.measurement.post ?? '—'}（${e.measurement.complete ? '確定' : '途中'}・目安 ${e.measurement.verdictHint}）` : '';
    const when = e.phase === 'measuring' ? `・判定 ${e.nextCheck} 以降` : '';
    console.log(`  - ${e.id} [${PHASES[e.phase]}] ${e.clusterLabel}・${e.page}${e.implementedAt ? `・改善 ${e.implementedAt}` : ''}${when}${m}${e.result ? `・${RESULTS[e.result] ?? e.result}` : ''}`);
  }
}

/** 週次の処置。--weekly は今週の改善件数も要処置に入れる。--check は要処置が残っていれば exit 1（週次レビューの完了条件） */
function cmdTriage() {
  const r = buildSearchOpportunities(ROOT, { maxCandidates: Infinity });
  if (!r.period) fail('GSC の検索語×ページ集計が無い');
  const action = r.triage.filter((t) => t.status === 'action');
  const observe = r.triage.filter((t) => t.status === 'observe');
  const q = r.quota;
  if (args.weekly && q.short) action.push({ kind: 'quota', status: 'action', clusterLabel: '全体', page: '—', impressions: null, action: `今週の改善 ${q.recorded}/${q.required} 件（${q.since} 以降）→ 直してよい候補を表示の多い順に直し、develop に入れて npm run search-improvement -- record --page <path> --change "…" --commit` });
  if (args.json) {
    process.stdout.write(`${JSON.stringify({ action, observe, quota: q }, null, 2)}\n`);
  } else {
    const total = r.clusters.reduce((s, c) => s + c.candidateTotal, 0);
    console.log(`${TAG} 候補 ${total} 件・検索改善の実験 ${r.experiments.length} 件を検査（GSC ${r.period.startDate}〜${r.period.endDate}）/ 要処置 ${action.length} / 観察中 ${observe.length} / 今週の改善 ${q.recorded}/${q.required}${args.weekly ? '' : '（--weekly で要処置に入れる）'}`);
    for (const t of action) console.log(`  ✗ [${t.clusterLabel}] ${t.page}${t.impressions != null ? `（表示 ${t.impressions}）` : ''}: ${t.action}`);
    for (const t of observe) console.log(`  … [${t.clusterLabel}] ${t.page}: ${t.note}`);
  }
  return args.check && action.length ? 1 : 0;
}

/** 受け皿外の候補の判断を設定（クラスターの pageDecisions）へ理由と日付つきで記録する */
function cmdDecide() {
  if (!args.cluster || !args.page || !args.reason || !(args.accept || args.routeTo)) fail('decide には --cluster・--page（接頭辞で当てる）・--reason と、--accept か --route-to <狙いのページ> が要る');
  if (args.accept && args.routeTo) fail('--accept と --route-to は同時に使わない');
  const to = args.routeTo ? normalizeTargetPath(args.routeTo, new Map()) : undefined;
  const decision = { path: args.page, decision: args.accept ? 'accept' : 'route', ...(to ? { to } : {}), reason: args.reason.trim(), decidedAt: todayJst() };
  apply({ ledger: false, config: true }, ({ config }) => {
    const c = config.clusters.find((x) => x.id === args.cluster) ?? fail(`クラスター ${args.cluster} が ${CONFIG} に無い`);
    c.pageDecisions = [...(c.pageDecisions ?? []).filter((d) => d.path !== decision.path), decision];
    return { message: `search: ${c.label} の ${decision.path} を${decision.decision === 'accept' ? '受け皿に加える' : `${to} へ誘導する`}（${decision.reason}）\n`, result: null };
  });
  console.log(`${TAG} ${args.cluster}: ${decision.path} → ${decision.decision === 'accept' ? '受け皿に加える' : `誘導 ${to}`}（${decision.reason}）`);
}

/** 月次の集計（既定は前の月） */
function cmdMonthly() {
  const today = todayJst();
  const [y, m] = today.split('-').map(Number);
  const month = args.month ?? new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) fail('--month は YYYY-MM');
  const r = buildSearchOpportunities(ROOT);
  const s = monthlySummary(r.experiments, r.config.clusters, month);
  if (args.json) {
    process.stdout.write(`${JSON.stringify(s, null, 2)}\n`);
    return 0;
  }
  console.log(`${TAG} ${month}: 判定 ${s.closed} 件（改善 ${s.good}${s.successRate == null ? '' : `・${Math.round(s.successRate * 100)}%`}）`);
  for (const c of s.clusters) {
    const res = Object.entries(c.results).filter(([, n]) => n).map(([k, n]) => `${RESULTS[k]} ${n}`).join('・') || '—';
    console.log(`  - ${c.label}: 直した ${c.implemented} / 計測開始 ${c.started} / 判定 ${c.closed}（${res}）/ 進行中 ${c.inProgress}${c.needsReview ? ' → 見直し（判定 2 件以上で改善 0。検索意図と受け皿・queryPattern を見直し、16 の点検記録に残す）' : ''}`);
  }
  return 0;
}

const COMMANDS = { status: cmdStatus, record: cmdRecord, sync: cmdSync, close: cmdClose, triage: cmdTriage, decide: cmdDecide, monthly: cmdMonthly, link: cmdLink };
try {
  if (!COMMANDS[command]) fail(`サブコマンドは ${Object.keys(COMMANDS).join(' / ')}`);
  if (args.commit && args.write) fail('--commit と --write は同時に使わない');
  process.exitCode = COMMANDS[command]() ?? 0;
} catch (e) {
  console.error(`${TAG} ${e.message}`);
  process.exitCode = e instanceof UsageError ? 2 : 1;
}
