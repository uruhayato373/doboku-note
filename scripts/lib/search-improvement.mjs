/**
 * search-improvement.mjs — 検索キーワード戦略の改善を、実験台帳の EXP で「直す→本番反映→計測→判定」まで回す（唯一の実装・純関数）。
 * ---------------------------------------------------------------------------
 * 一周（週次レビューがその週に回す。カードに積んで待たせない）:
 *   直す（改善してよい候補を develop で直して commit）→ 記録（record: EXP に commit・日付・直した内容を書く＝段階「本番反映待ち」）
 *   → 本番反映（sync: その commit を含む最初の本番デプロイの日を境目にして running）
 *   → 計測（CI の measure-experiments が「対象ページ × 直す前の検索語」を前後で測る）
 *   → 判定（check-experiment-due の VERDICT_DUE と triage の要処置 → close で結果と学びを残す）
 *   → 候補一覧（search-opportunities）に前回の判定が戻り、次の改善の材料になる。月次は monthlySummary でクラスター別に数える。
 * 「起票済」（直していない EXP）は作らない。check-search-improvements（CI）が改善の記録の無い EXP を止める。
 * 2026-10-13 以前にカードで起票した分は searchStrategy.card と dispatch-log の完了 commit で読む（implementationOf）。
 * EXP は data/business/experiments.json の kind: search-strategy。計測の型は config/search-strategy.json の cycle.measure。
 * 取得（GSC 集計・dispatch-log・本番デプロイ）と書き込みは scripts/search-improvement.mjs。検査は scripts/check-search-improvements.mjs。
 * ---------------------------------------------------------------------------
 */
import { completeOn, specErrors } from './experiment-measure.mjs';
import { jstDayOf } from './jst-date.mjs';

export const KIND = 'search-strategy';
/** 計測が終わっていない状態（同じページに 2 つ目を記録しない） */
export const OPEN = ['proposed', 'running', 'measuring'];
/** カードの本文で EXP を指す行の見出し（2026-10-13 以前のカードと、改善以外のカードの「なし（理由）」） */
export const CARD_MARKER = '**実験**:';
/** 起点にこの語があるカードは作らない（ページの順位改善は週次レビューがその週に直して record する） */
export const ORIGIN_WORD = '検索キーワード戦略';
/** 1 ページの順位改善ではないカード（新しいページ群・クリック率・手で確かめる確認など）は「**実験**: なし（理由）」と書く */
export const NONE_MARK = 'なし（';
/** 週の数え方（週次レビューの完了条件で、直近この日数に記録した改善を数える） */
export const WEEK_DAYS = 7;

/** 段階（phase）の表示名。phaseOf が唯一の判定。filed は作ってはいけない状態（検査が止める） */
export const PHASES = {
  filed: '改善の記録なし',
  implemented: '本番反映待ち',
  measuring: '計測中',
  'verdict-due': '判定待ち',
  closed: '判定済',
  abandoned: '中止',
};
/** close の結果（/nsm-experiment close と同じ語彙） */
export const RESULTS = { success: '改善', partial: '一部改善', 'no-effect': '効果なし', negative: '悪化' };
const GOOD = new Set(['success', 'partial']);
/** カードの完了記録のうち、改善を打てずに終わったもの（EXP を中止にする） */
const DROPPED = new Set(['swept', 'fail']);

const EXP_ID = /^EXP-(\d+)$/;
const CARD_ID = /^DN-\d{4}$/;
const SHA = /^[0-9a-f]{7,40}$/;
const addDaysJst = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export const isSearchExperiment = (e) => e?.kind === KIND;

/** dispatch-log の entries を ID → 最後の記録に。 */
export function dispatchIndex(entries = []) {
  const out = new Map();
  for (const e of entries) if (e?.id) out.set(e.id, e);
  return out;
}

/** 改善が develop に入ったか。EXP 自身の記録（record）を先に見て、無ければ旧来のカードの完了（dispatch-log の done と commit）。 */
export function implementationOf(exp, dispatchById = new Map()) {
  if (exp.implementation?.commit) return exp.implementation;
  const e = dispatchById.get(exp.searchStrategy?.card);
  return e?.outcome === 'done' && e.commit ? { commit: e.commit, at: e.at } : null;
}

const finalAuto = (exp) => (exp.measurements ?? []).filter((m) => m?.source === 'auto' && m.complete);

/** EXP の段階。 */
export function phaseOf(exp, dispatchById = new Map()) {
  if (exp.status === 'done') return 'closed';
  if (exp.status === 'abandoned') return 'abandoned';
  if (exp.status === 'proposed') return implementationOf(exp, dispatchById) ? 'implemented' : 'filed';
  return finalAuto(exp).length ? 'verdict-due' : 'measuring';
}

/** 最後の自動計測（確定・途中を問わない）。無ければ null。 */
export const latestMeasurement = (exp) => (exp.measurements ?? []).filter((m) => m?.source === 'auto').at(-1) ?? null;

/** 次の EXP の番号（既存の最大 + 1・桁は既存に合わせる）。 */
export function nextExperimentId(experiments) {
  const nums = experiments.map((e) => EXP_ID.exec(e.id ?? '')).filter(Boolean).map((m) => m[1]);
  const width = Math.max(3, ...nums.map((n) => n.length));
  const next = Math.max(0, ...nums.map(Number)) + 1;
  return `EXP-${String(next).padStart(width, '0')}`;
}

/** ページごとの EXP（計測が終わっていない 1 件と、最後に判定した 1 件）。 */
export function experimentsByPage(experiments) {
  const out = new Map();
  for (const e of experiments.filter(isSearchExperiment)) {
    const page = e.searchStrategy?.page;
    if (!page) continue;
    const g = out.get(page) ?? { open: null, closed: null };
    if (OPEN.includes(e.status)) g.open = e;
    else if (e.status === 'done' && (!g.closed || String(e.closed_at) > String(g.closed.closed_at))) g.closed = e;
    out.set(page, g);
  }
  return out;
}

/** 改善の記録（record）を EXP に書く。commit は develop に入ったもの、at はその commit の JST の日、change は直した内容。 */
export function recordImplementation(exp, { commit, at, change }, now = new Date()) {
  if (!SHA.test(commit ?? '')) throw new Error(`commit が不正: ${commit}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(at ?? '')) throw new Error(`at は YYYY-MM-DD: ${at}`);
  if (!change?.trim()) throw new Error('--change（何を直したか）が要る');
  if (exp.status !== 'proposed' || exp.implementation) throw new Error(`${exp.id} は記録できる段階ではない（${exp.status}${exp.implementation ? '・記録済み' : ''}）`);
  exp.implementation = { commit, at, change: change.trim() };
  (exp.history ??= []).push({ at: now.toISOString(), event: 'implemented', commit, change: change.trim() });
  return exp;
}

/**
 * 直した改善の EXP（純関数）。candidate は search-opportunities の候補（page・queries・impressions・clicks・bestPosition）＝直す前の状態。
 * bands は search-opportunities の bandLabels（帯の表示名）、measure は config の cycle.measure。implementation を渡すと記録まで済ませる。
 */
export function buildExperiment({ id, card = null, cluster, candidate, period, source, measure, bands, contentPath = null, implementation = null, now = new Date() }) {
  const queries = candidate.queries.map(({ query, position, impressions, clicks }) => ({ query, position, impressions, clicks }));
  const today = jstDayOf(now);
  const spec = { specVersion: 1, metric: measure.metric, scope: { pages: [candidate.page], queries: queries.map((q) => q.query) }, preDays: measure.preDays, postDays: measure.postDays, lagDays: measure.lagDays, direction: measure.direction, minEffect: measure.minEffect, minVolume: measure.minVolume };
  const errors = specErrors(spec);
  if (errors.length) throw new Error(`計測の型が実験台帳の measure 仕様に合わない: ${errors.join(' / ')}`);
  const better = measure.metric === 'gsc.position' ? '平均順位' : measure.metric === 'gsc.impressions' ? '表示回数' : 'クリック数';
  const exp = {
    id,
    kind: KIND,
    title: `${cluster.label}: ${candidate.page} の${bands.striking}の検索語を${bands.top}へ`,
    hypothesis: `${candidate.page} は ${queries.length} 語が${bands.striking}（最良 ${candidate.bestPosition} 位・表示 ${candidate.impressions}）。検索意図に合わせて title・description・冒頭の答え・見出し・内部リンクを直せば、同じ検索語の順位が上がる`,
    target_metric: `対象ページ × 直す前の検索語 ${queries.length} 語の GSC ${better}（本番反映の前 ${measure.preDays} 日・後 ${measure.postDays} 日）`,
    target_delta: `${better}が ${Math.round(measure.minEffect * 100)}% 以上良くなる。前後どちらかの表示が ${measure.minVolume} 未満なら判定不能`,
    status: 'proposed',
    created_at: today,
    searchStrategy: { cluster: cluster.id, page: candidate.page, ...(card ? { card } : {}), ...(contentPath ? { contentPath } : {}) },
    baseline: { measured_at: today, source, period, impressions: candidate.impressions, clicks: candidate.clicks, bestPosition: candidate.bestPosition, queries },
    measure: spec,
    history: [{ at: now.toISOString(), event: card ? 'linked' : 'recorded', ...(card ? { card } : {}) }],
  };
  if (implementation) recordImplementation(exp, implementation, now);
  return exp;
}

/** 実験にしないカードに理由を書く（link --none）。cardEnd はカードの最終行（1 始まり）。 */
export function withNoneMarker(text, cardEnd, reason) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  lines.splice(cardEnd, 0, '', `${CARD_MARKER} ${NONE_MARK}${reason.trim()}）`);
  return lines.join(eol);
}

/** 本番反映を受けて計測を始める（anchor＝デプロイの日・next_check_date＝事後窓が確定する日）。 */
export function startExperiment(exp, deploy, implementation, now = new Date()) {
  const anchor = jstDayOf(new Date(deploy.at));
  exp.status = 'running';
  exp.started_at = anchor;
  exp.measure = { ...exp.measure, anchor };
  exp.next_check_date = completeOn(exp.measure, anchor);
  (exp.history ??= []).push({ at: now.toISOString(), event: 'deployed', commit: implementation.commit, deploy: { id: deploy.id, sha: deploy.sha, at: deploy.at, url: deploy.url } });
  return exp;
}

export function abandonExperiment(exp, reason, now = new Date()) {
  exp.status = 'abandoned';
  exp.closed_at = now.toISOString();
  (exp.history ??= []).push({ at: now.toISOString(), event: 'abandoned', reason });
  return exp;
}

/** 判定を記録する。確定した自動計測が無ければ投げる（途中の値で閉じない）。 */
export function closeExperiment(exp, { result, learning }, now = new Date()) {
  if (!(result in RESULTS)) throw new Error(`--result は ${Object.keys(RESULTS).join(' / ')}`);
  if (!learning?.trim()) throw new Error('--learning（何が分かったか・次にどうするか）が要る');
  const m = finalAuto(exp).at(-1);
  if (!OPEN.includes(exp.status) || !m) throw new Error(`${exp.id} は確定した自動計測が無いので判定できない（段階: ${exp.status}）`);
  exp.status = 'done';
  exp.result = result;
  exp.learnings = learning.trim();
  exp.closed_at = now.toISOString();
  (exp.history ??= []).push({ at: now.toISOString(), event: 'closed', result, verdictHint: m.verdictHint, measurement: { pre: m.pre?.value ?? null, post: m.post?.value ?? null } });
  return exp;
}

/**
 * sync の計画（純関数）。findDeploy(commit, sinceDate) は本番デプロイ（{ id, sha, at, url }）か null。
 * 返す行: start（本番に入った）・abandon（旧来のカードが改善を打たずに閉じた）・wait（記録済み・本番未反映）。
 */
export function syncPlan(experiments, dispatchById, findDeploy) {
  const out = [];
  for (const e of experiments.filter((x) => isSearchExperiment(x) && x.status === 'proposed')) {
    const d = e.implementation ? null : dispatchById.get(e.searchStrategy?.card);
    if (d && DROPPED.has(d.outcome)) {
      out.push({ id: e.id, action: 'abandon', reason: `カード ${d.id} が ${d.outcome} で閉じた（${d.at}）` });
      continue;
    }
    const impl = implementationOf(e, dispatchById);
    if (!impl) continue;
    const deploy = findDeploy(impl.commit, impl.at);
    out.push(deploy ? { id: e.id, action: 'start', deploy, implementation: impl } : { id: e.id, action: 'wait', implementation: impl });
  }
  return out;
}

/**
 * 週次の改善の件数（週次レビューの完了条件）。直近 WEEK_DAYS 日に記録した改善が、週の目標（improvePerWeek と、
 * 直せる候補の数の小さい方）に届いているか。rows は search-opportunities の experimentRows（implementedAt を持つ）。
 */
export function weeklyQuota({ rows, fileable, perWeek, today }) {
  const since = addDaysJst(today, -(WEEK_DAYS - 1));
  const recorded = rows.filter((r) => r.implementedAt && r.implementedAt >= since && r.implementedAt <= today).length;
  const required = Math.min(perWeek, fileable + recorded);
  return { since, recorded, required, perWeek, short: recorded < required };
}

/**
 * 月次の集計（純関数）。クラスター別に、その月に直した数・計測を始めた数・判定した数と結果の内訳。
 * 判定が 2 件以上あって改善（success・partial）が 0 のクラスターは、検索意図と受け皿の見直しが要る（needsReview）。
 */
export function monthlySummary(rows, clusters, month) {
  const inMonth = (d) => Boolean(d) && String(d).slice(0, 7) === month;
  const per = clusters.map((c) => {
    const mine = rows.filter((r) => r.cluster === c.id);
    const closed = mine.filter((r) => r.phase === 'closed' && inMonth(r.closedAt));
    const results = Object.fromEntries(Object.keys(RESULTS).map((k) => [k, closed.filter((r) => r.result === k).length]));
    const good = closed.filter((r) => GOOD.has(r.result)).length;
    return {
      cluster: c.id,
      label: c.label,
      implemented: mine.filter((r) => inMonth(r.implementedAt)).length,
      started: mine.filter((r) => inMonth(r.startedAt)).length,
      closed: closed.length,
      results,
      good,
      inProgress: mine.filter((r) => ['implemented', 'measuring', 'verdict-due'].includes(r.phase)).length,
      needsReview: closed.length >= 2 && good === 0,
    };
  });
  const closed = per.reduce((s, c) => s + c.closed, 0);
  const good = per.reduce((s, c) => s + c.good, 0);
  return { month, clusters: per, closed, good, successRate: closed ? Math.round((good / closed) * 100) / 100 : null };
}

/**
 * EXP とカードの結び付きと、作ってはいけない状態の検査（純関数）。cards は backlog の parseBacklog の結果、clusters はクラスター id の Set。
 * 返すのは違反の文の配列。
 */
export function linkErrors({ experiments, cards, dispatchById, clusters }) {
  const errors = [];
  const mine = experiments.filter(isSearchExperiment);
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const openByPage = new Map();
  for (const e of mine) {
    const s = e.searchStrategy ?? {};
    const at = `${e.id}`;
    if (!clusters.has(s.cluster)) errors.push(`${at}: searchStrategy.cluster「${s.cluster}」が検索キーワード戦略の設定（config.search-strategy）に無い`);
    if (!String(s.page ?? '').startsWith('/')) errors.push(`${at}: searchStrategy.page が無い`);
    if (s.card !== undefined && !CARD_ID.test(s.card)) errors.push(`${at}: searchStrategy.card が DN-#### でない`);
    const specErr = specErrors(e.measure);
    if (specErr.length) errors.push(`${at}: measure 仕様が不正（${specErr.join(' / ')}）`);
    if (JSON.stringify(e.measure?.scope?.pages) !== JSON.stringify([s.page])) errors.push(`${at}: measure.scope.pages が searchStrategy.page と違う`);
    if (!e.measure?.scope?.queries?.length) errors.push(`${at}: measure.scope.queries（直す前の検索語）が無い`);
    if (e.implementation && !(SHA.test(e.implementation.commit ?? '') && /^\d{4}-\d{2}-\d{2}$/.test(e.implementation.at ?? '') && e.implementation.change?.trim())) errors.push(`${at}: implementation に commit・at・change が揃っていない`);
    if (e.status === 'proposed' && !implementationOf(e, dispatchById)) errors.push(`${at}: 改善の記録が無い（起票だけの状態は作らない。直して develop に入れた commit を npm run search-improvement -- record --id ${e.id} --sha <commit> --change "…" で記録する）`);
    const card = s.card ? cardById.get(s.card) : null;
    if (card && !card.body.includes(e.id)) errors.push(`${at}: カード ${s.card} の本文に ${e.id} が無い（「${CARD_MARKER} ${e.id}」の行を足す）`);
    if (['running', 'measuring'].includes(e.status) && !(e.started_at && e.measure?.anchor && e.next_check_date)) errors.push(`${at}: 計測中なのに started_at・measure.anchor・next_check_date のどれかが無い（npm run search-improvement -- sync で始める）`);
    if (e.status === 'done' && !(e.result in RESULTS)) errors.push(`${at}: 判定済みなのに result が ${Object.keys(RESULTS).join(' / ')} のどれでもない`);
    if (OPEN.includes(e.status)) {
      const prev = openByPage.get(s.page);
      if (prev) errors.push(`${at}: ${s.page} に計測の終わっていない ${prev} がある（同じページに 2 つ目を記録しない）`);
      else openByPage.set(s.page, e.id);
    }
  }
  const byId = new Map(mine.map((e) => [e.id, e]));
  for (const c of cards) {
    const marked = c.body.split('\n').filter((l) => l.startsWith(CARD_MARKER)).flatMap((l) => l.match(/EXP-\d+/g) ?? []);
    for (const id of marked) {
      const e = byId.get(id);
      if (!e) errors.push(`${c.id}: 「${CARD_MARKER} ${id}」の ${id} が実験台帳（kind ${KIND}）に無い`);
      else if (e.searchStrategy?.card !== c.id) errors.push(`${c.id}: ${id} の searchStrategy.card は ${e.searchStrategy?.card}（このカードを指していない）`);
    }
    const none = c.body.split('\n').some((l) => l.startsWith(`${CARD_MARKER} ${NONE_MARK}`));
    const origin = c.body.split('\n').find((l) => l.startsWith('**起点**'));
    if (origin?.includes(ORIGIN_WORD) && !marked.length && !none) errors.push(`${c.id}: 起点が${ORIGIN_WORD}のカードは作らない（ページの順位改善は週次レビューがその週に直して npm run search-improvement -- record で記録する）。改善以外の作業なら「${CARD_MARKER} ${NONE_MARK}理由）」を書く（link --none）`);
  }
  return errors;
}
