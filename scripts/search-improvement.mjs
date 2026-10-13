#!/usr/bin/env node
/**
 * search-improvement.mjs — 検索キーワード戦略の改善を起票し、本番反映・計測・判定までを実験台帳で ID 管理する CLI。
 * ---------------------------------------------------------------------------
 * 判定と組み立ては scripts/lib/search-improvement.mjs（純関数）、候補は scripts/lib/search-opportunities.mjs。
 *
 * Usage:
 *   npm run search-improvement -- status [--json]
 *       検索改善の EXP の一覧（段階: 起票済・本番反映待ち・計測中・判定待ち・判定済・中止）
 *   npm run search-improvement -- add --page /exam/... --todo "直す箇所" [--cluster qualification] [--title "…"] [--when YYYY-MM] [--commit|--write]
 *       起票してよい候補（fileable）を 1 件、カード（DN-####）と EXP（EXP-###）にして 1 commit で積む。週の上限は config の cycle.filePerWeek
 *   npm run search-improvement -- link --card DN-#### --page /exam/... [--cluster qualification] [--commit|--write]
 *       手で起票した既存のカードに EXP を作って結ぶ（カードに「**実験**: EXP-###」の行を足す）。基準はカードを起票した日の集計。
 *       1 枚で複数ページを直すカードはページごとに繰り返す
 *   npm run search-improvement -- link --card DN-#### --none "理由" [--commit|--write]
 *       1 ページの順位改善ではないカード（新しいページ群・クリック率・手で確かめる確認）に「**実験**: なし（理由）」を書く
 *   npm run search-improvement -- sync [--commit|--write]
 *       カード完了（dispatch-log の done と commit）→ その commit を含む最初の本番デプロイの日で計測を始める。
 *       カードが swept / fail で閉じたら中止にする。CI（fetch-metrics の publish）が measure-experiments の前に --write で回す
 *   npm run search-improvement -- close --id EXP-### --result success|partial|no-effect|negative --learning "…" [--commit|--write]
 *       確定した自動計測（VERDICT_DUE）を判定して閉じる
 *   npm run search-improvement -- triage [--check] [--json]
 *       今週の処置（受け皿外・旧 URL・誘導の見直し）と観察中のもの。--check は要処置が残れば exit 1（週次レビューの完了条件）
 *   npm run search-improvement -- decide --cluster <id> --page <接頭辞> (--accept | --route-to <狙いのページ>) --reason "…" [--commit|--write]
 *       受け皿外の候補の判断を設定（クラスターの pageDecisions）へ理由と日付つきで記録する
 *
 *   書き込み: 既定は dry-run（表示だけ）。--write は作業ツリーへ書く。--commit は作業ツリーに触れず origin/develop へ直接積む
 *   （backlog と実験台帳を 1 つの commit にする・lib/git-direct-commit.mjs）。
 * exit: 0 成功 / 1 取得失敗・書き込み失敗・検査違反 / 2 引数不正
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { readDataset, readDatasetIf } from './lib/dataset-io.mjs';
import { formatDataset } from './lib/dataset-write.mjs';
import { commitFilesToRemoteBranch } from './lib/git-direct-commit.mjs';
import { addDays } from './lib/business-direction.mjs';
import { jstDayOf, todayJst } from './lib/jst-date.mjs';
import { findCard } from './backlog-edit.mjs';
import { BACKLOG, addCard } from './todo-add.mjs';
import { buildContentIndex } from './lib/content-index.mjs';
import { CONFIG, buildSearchOpportunities } from './lib/search-opportunities.mjs';
import { normalizeTargetPath } from './lib/legacy-routes.mjs';
import { firstDeployContaining, isAncestor, listProductionDeploys } from './lib/production-deploys.mjs';
import {
  KIND, OPEN, PHASES, RESULTS, abandonExperiment, buildExperiment, cardBody, closeExperiment, dispatchIndex, isSearchExperiment,
  nextExperimentId, startExperiment, syncPlan, withMarker, withNoneMarker,
} from './lib/search-improvement.mjs';

const TAG = '[search-improvement]';
const LEDGER_ID = 'business.experiments';
const LEDGER = datasetPath(LEDGER_ID);
const WEEK_DAYS = 7;
const CARD = { tier: '中', kind: '改善', domain: 'サイト', category: 'コンテンツ品質' };

const args = parseCliArgs({
  page: { type: 'string' }, cluster: { type: 'string' }, todo: { type: 'string' }, title: { type: 'string' }, when: { type: 'string' },
  card: { type: 'string' }, none: { type: 'string' }, id: { type: 'string' }, result: { type: 'string' }, learning: { type: 'string' },
  reason: { type: 'string' }, 'route-to': { type: 'string' }, accept: { type: 'boolean' }, check: { type: 'boolean' },
  commit: { type: 'boolean' }, write: { type: 'boolean' }, json: { type: 'boolean' },
});
const command = args._[0];
// Git Bash は "/exam/..." を Windows のパスに書き換えて渡すので戻す（normalizeTargetPath）
// decide の --page は接頭辞なので、末尾の / は残す
if (args.page) args.page = normalizeTargetPath(args.page, new Map()) + (args.page.endsWith('/') && args.page !== '/' ? '/' : '');

class UsageError extends Error {}
const fail = (msg) => { throw new UsageError(msg); };

/**
 * 実験台帳（と必要なら backlog）を書き換える。mutate({ ledger, backlog }) は台帳を直接書き換え、backlog の新しい中身・commit メッセージ・結果を返す。
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

const opportunities = () => buildSearchOpportunities(ROOT, { maxCandidates: Infinity });

/** 起票・結び付けの対象の候補（cluster を指定しなければ、起票してよい候補のうち表示の多いクラスター） */
function candidateFor(r, page, clusterId, { fileableOnly }) {
  if (!r.period) fail('GSC の検索語×ページ集計が無い');
  if (clusterId) {
    const c = r.clusters.find((x) => x.id === clusterId) ?? fail(`クラスター ${clusterId} が ${CONFIG} に無い`);
    const p = c.candidates.find((x) => x.page === page) ?? fail(`${page} は ${c.label} の改善候補（${r.bands.striking}・表示 ${r.config.striking.minImpressions} 以上）に無い`);
    if (fileableOnly && !p.fileable) fail(`${page} は起票できない（観察中・旧URL・計測の終わっていない実験のどれか）`);
    return { cluster: r.config.clusters.find((x) => x.id === c.id), candidate: p };
  }
  const pool = fileableOnly ? r.fileable : r.clusters.flatMap((c) => c.candidates.map((p) => ({ ...p, cluster: c.id })));
  const p = pool.find((x) => x.page === page) ?? fail(`${page} は${fileableOnly ? '起票してよい' : ''}改善候補に無い（npm run report-search-opportunities で確かめる）`);
  return { cluster: r.config.clusters.find((x) => x.id === p.cluster), candidate: p };
}

const assertNoOpen = (ledger, page) => {
  const open = ledger.experiments.find((e) => isSearchExperiment(e) && e.searchStrategy?.page === page && OPEN.includes(e.status));
  if (open) fail(`${page} には計測の終わっていない ${open.id}（カード ${open.searchStrategy.card}）がある`);
};

function cmdAdd() {
  if (!args.page || !args.todo) fail('add には --page と --todo（直す箇所）が要る');
  const r = opportunities();
  const { cluster, candidate } = candidateFor(r, args.page, args.cluster, { fileableOnly: true });
  const contentPath = buildContentIndex(ROOT).index.get(candidate.page) ?? null;
  const since = addDays(todayJst(), -(WEEK_DAYS - 1));
  const today = todayJst();
  const result = apply({ backlog: true }, ({ ledger, backlog }) => {
    assertNoOpen(ledger, candidate.page);
    const recent = ledger.experiments.filter((e) => isSearchExperiment(e) && String(e.created_at ?? '') >= since);
    if (recent.length >= r.config.cycle.filePerWeek) fail(`直近 ${WEEK_DAYS} 日の起票が ${recent.length} 件で上限（cycle.filePerWeek=${r.config.cycle.filePerWeek}）に達している: ${recent.map((e) => e.id).join('・')}`);
    const expId = nextExperimentId(ledger.experiments);
    const top = candidate.queries[0];
    const title = args.title ?? `${cluster.label}: ${candidate.page.split('/').pop()} を「${top.query}」で${r.bands.top}へ（${expId}）`;
    const body = cardBody({ expId, cluster, candidate, period: r.period, bands: r.bands, todo: args.todo, measure: r.config.cycle.measure });
    const card = addCard(backlog, { title, ...CARD, when: args.when ?? today.slice(0, 7), body }, { root: ROOT, today });
    const exp = buildExperiment({ id: expId, card: card.id, cluster, candidate, period: r.period, source: r.source, measure: r.config.cycle.measure, bands: r.bands, contentPath });
    ledger.experiments.push(exp);
    return { backlog: card.text, message: `search: ${card.id} と ${expId} を起票する（${candidate.page}）\n`, result: { card: card.id, experiment: expId, title } };
  });
  console.log(`${TAG} 起票: ${result.card}「${result.title}」⇄ ${result.experiment}`);
  console.log(result.card);
}

function cmdLink() {
  if (!/^DN-\d{4}$/.test(args.card ?? '') || !(args.page || args.none)) fail('link には --card DN-#### と、--page（実験に結ぶ）か --none "理由"（実験にしない）が要る');
  if (args.none) {
    apply({ backlog: true, ledger: false }, ({ backlog }) => {
      const found = findCard(backlog, args.card);
      if (found.error) fail(found.error);
      return { backlog: withNoneMarker(backlog, found.card.endLine, args.none), message: `search: ${args.card} は実験にしない（${args.none.trim()}）\n`, result: null };
    });
    console.log(`${TAG} ${args.card}: 実験にしない（${args.none.trim()}）`);
    return;
  }
  // 既存のカードは起票した日の集計（その日より前に終わる最新）で結ぶ。起票後に順位が動いても、起票時の検索語と基準が残る
  const filed = findCard(readFileSync(join(ROOT, BACKLOG), 'utf8'), args.card).card?.filed;
  const r = buildSearchOpportunities(ROOT, { maxCandidates: Infinity, asOf: filed });
  const { cluster, candidate } = candidateFor(r, args.page, args.cluster, { fileableOnly: false });
  const contentPath = buildContentIndex(ROOT).index.get(candidate.page) ?? null;
  const result = apply({ backlog: true }, ({ ledger, backlog }) => {
    assertNoOpen(ledger, candidate.page);
    const found = findCard(backlog, args.card);
    if (found.error) fail(found.error);
    const expId = nextExperimentId(ledger.experiments);
    const exp = buildExperiment({ id: expId, card: args.card, cluster, candidate, period: r.period, source: r.source, measure: r.config.cycle.measure, bands: r.bands, contentPath });
    exp.history = [{ ...exp.history[0], event: 'linked' }];
    ledger.experiments.push(exp);
    return { backlog: withMarker(backlog, found.card.endLine, expId), message: `search: ${args.card} を ${expId} に結ぶ（${candidate.page}）\n`, result: { card: args.card, experiment: expId } };
  });
  console.log(`${TAG} 結び付け: ${result.card} ⇄ ${result.experiment}`);
}

/** 本番デプロイの一覧は 1 回だけ取る（いちばん古いカード完了日から）。 */
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
  const waiting = targets.map((e) => dispatchById.get(e.searchStrategy?.card)).filter((d) => d?.outcome === 'done' && d.commit);
  const find = deployFinder(waiting.map((d) => d.at).sort()[0] ?? null);
  let plan;
  try {
    plan = syncPlan(ledger.experiments, dispatchById, find);
  } catch (e) {
    console.error(`${TAG} 本番デプロイの取得に失敗（gh api）: ${String(e?.stderr || e?.message || e).trim().slice(0, 300)}`);
    return 1;
  }
  const count = (a) => plan.filter((p) => p.action === a).length;
  console.log(`${TAG} 起票中 ${targets.length} 件 / カード完了 ${waiting.length} 件 → 計測を始める ${count('start')} / 本番反映待ち ${count('wait')} / 中止 ${count('abandon')}`);
  for (const p of plan) {
    if (p.action === 'start') console.log(`  - ${p.id}: 本番反映 ${jstDayOf(new Date(p.deploy.at))}（run ${p.deploy.id}・commit ${p.implementation.commit}）から計測`);
    if (p.action === 'wait') console.log(`  - ${p.id}: カード完了 ${p.implementation.at}・commit ${p.implementation.commit} を含む本番デプロイが無い（本番反映待ち）`);
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
    console.log(`  - ${e.id} [${PHASES[e.phase]}] ${e.clusterLabel}・${e.page}・${e.card}${when}${m}${e.result ? `・${RESULTS[e.result] ?? e.result}` : ''}`);
  }
}

/** 今週の処置（受け皿外・旧 URL・誘導の見直し）。--check は処置の要るものが残っていれば exit 1（週次レビューの完了条件） */
function cmdTriage() {
  const r = opportunities();
  if (!r.period) fail('GSC の検索語×ページ集計が無い');
  const action = r.triage.filter((t) => t.status === 'action');
  const observe = r.triage.filter((t) => t.status === 'observe');
  if (args.json) {
    process.stdout.write(`${JSON.stringify({ action, observe }, null, 2)}\n`);
  } else {
    const total = r.clusters.reduce((s, c) => s + c.candidateTotal, 0);
    console.log(`${TAG} 候補 ${total} 件・検索改善の実験 ${r.experiments.length} 件を検査（GSC ${r.period.startDate}〜${r.period.endDate}）/ 要処置 ${action.length} / 観察中 ${observe.length}`);
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

const COMMANDS = { status: cmdStatus, add: cmdAdd, link: cmdLink, sync: cmdSync, close: cmdClose, triage: cmdTriage, decide: cmdDecide };
try {
  if (!COMMANDS[command]) fail(`サブコマンドは ${Object.keys(COMMANDS).join(' / ')}`);
  if (args.commit && args.write) fail('--commit と --write は同時に使わない');
  process.exitCode = COMMANDS[command]() ?? 0;
} catch (e) {
  console.error(`${TAG} ${e.message}`);
  process.exitCode = e instanceof UsageError ? 2 : 1;
}
