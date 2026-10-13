/**
 * search-improvement.mjs — 検索キーワード戦略の改善を、バックログのカードと実験台帳の EXP で ID 管理する（唯一の実装・純関数）。
 * ---------------------------------------------------------------------------
 * 一周: 起票（add: カード＋EXP を 1 commit。カードに EXP-ID、EXP に DN-ID を書く）
 *   → カード完了（todo:complete が dispatch-log に commit を残す）
 *   → 本番反映（sync: その commit を含む最初の本番デプロイの日を境目にして running）
 *   → 計測（CI の measure-experiments が「対象ページ × 起票時の検索語」を前後で測る）
 *   → 判定（check-experiment-due の VERDICT_DUE → close で結果と学びを残す）
 *   → 候補一覧（search-opportunities）に前回の判定が戻り、次の起票の材料になる。
 * EXP は data/business/experiments.json の kind: search-strategy。計測の型は config/search-strategy.json の cycle.measure。
 * 取得（GSC 集計・dispatch-log・本番デプロイ）と書き込みは scripts/search-improvement.mjs。検査は scripts/check-search-improvements.mjs。
 * ---------------------------------------------------------------------------
 */
import { completeOn, specErrors } from './experiment-measure.mjs';
import { jstDayOf } from './jst-date.mjs';

export const KIND = 'search-strategy';
/** 計測が終わっていない状態（同じページに 2 つ目を起票しない） */
export const OPEN = ['proposed', 'running', 'measuring'];
/** カードの本文で EXP を指す行の見出し。この行の EXP-ID とカードの ID が双方向に一致することを検査する */
export const CARD_MARKER = '**実験**:';
/** 起点にこの語があるカードは、この経路（add）で起票したものでなければならない（手で起票して EXP を作り忘れるのを止める） */
export const ORIGIN_WORD = '検索キーワード戦略';
/** 1 ページの順位改善ではないカード（新しいページ群・クリック率・手で確かめる確認など）は「**実験**: なし（理由）」と書く */
export const NONE_MARK = 'なし（';

/** 段階（phase）の表示名。phaseOf が唯一の判定 */
export const PHASES = {
  filed: '起票済',
  implemented: '本番反映待ち',
  measuring: '計測中',
  'verdict-due': '判定待ち',
  closed: '判定済',
  abandoned: '中止',
};
/** close の結果（/nsm-experiment close と同じ語彙） */
export const RESULTS = { success: '改善', partial: '一部改善', 'no-effect': '効果なし', negative: '悪化' };
/** カードの完了記録のうち、改善を打てずに終わったもの（EXP を中止にする） */
const DROPPED = new Set(['swept', 'fail']);

const EXP_ID = /^EXP-(\d+)$/;
const CARD_ID = /^DN-\d{4}$/;

export const isSearchExperiment = (e) => e?.kind === KIND;

/** dispatch-log の entries を ID → 最後の記録に。 */
export function dispatchIndex(entries = []) {
  const out = new Map();
  for (const e of entries) if (e?.id) out.set(e.id, e);
  return out;
}

/** カードが完了して原稿の修正が積まれたか（dispatch-log の done と commit）。 */
export function implementationOf(exp, dispatchById) {
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

const queryLine = (q) => `「${q.query}」${q.position} 位・表示 ${q.impressions}`;

/**
 * 起票する EXP（純関数）。candidate は search-opportunities の候補（page・queries・impressions・clicks・bestPosition）。
 * bands は search-opportunities の bandLabels（帯の表示名）、measure は config の cycle.measure。
 */
export function buildExperiment({ id, card, cluster, candidate, period, source, measure, bands, contentPath = null, now = new Date() }) {
  const queries = candidate.queries.map(({ query, position, impressions, clicks }) => ({ query, position, impressions, clicks }));
  const today = jstDayOf(now);
  const spec = { specVersion: 1, metric: measure.metric, scope: { pages: [candidate.page], queries: queries.map((q) => q.query) }, preDays: measure.preDays, postDays: measure.postDays, lagDays: measure.lagDays, direction: measure.direction, minEffect: measure.minEffect, minVolume: measure.minVolume };
  const errors = specErrors(spec);
  if (errors.length) throw new Error(`計測の型が実験台帳の measure 仕様に合わない: ${errors.join(' / ')}`);
  const better = measure.metric === 'gsc.position' ? '平均順位' : measure.metric === 'gsc.impressions' ? '表示回数' : 'クリック数';
  return {
    id,
    kind: KIND,
    title: `${cluster.label}: ${candidate.page} の${bands.striking}の検索語を${bands.top}へ`,
    hypothesis: `${candidate.page} は ${queries.length} 語が${bands.striking}（最良 ${candidate.bestPosition} 位・表示 ${candidate.impressions}）。検索意図に合わせて title・description・冒頭の答え・見出し・内部リンクを直せば、同じ検索語の順位が上がる`,
    target_metric: `対象ページ × 起票時の検索語 ${queries.length} 語の GSC ${better}（本番反映の前 ${measure.preDays} 日・後 ${measure.postDays} 日）`,
    target_delta: `${better}が ${Math.round(measure.minEffect * 100)}% 以上良くなる。前後どちらかの表示が ${measure.minVolume} 未満なら判定不能`,
    status: 'proposed',
    created_at: today,
    searchStrategy: { cluster: cluster.id, page: candidate.page, card, ...(contentPath ? { contentPath } : {}) },
    baseline: { measured_at: today, source, period, impressions: candidate.impressions, clicks: candidate.clicks, bestPosition: candidate.bestPosition, queries },
    measure: spec,
    history: [{ at: now.toISOString(), event: 'filed', card }],
  };
}

/** add が作るカードの本文（起点・やること・実験・完了条件）。 */
export function cardBody({ expId, cluster, candidate, period, bands, todo, measure }) {
  return [
    `**起点**: ${ORIGIN_WORD}（${cluster.label}・GSC ${period.startDate}〜${period.endDate}）。${candidate.page} は${bands.striking}の検索語 ${candidate.queries.length} 語で表示 ${candidate.impressions}・クリック ${candidate.clicks}・最良 ${candidate.bestPosition} 位。`,
    ...candidate.queries.map((q) => `- ${queryLine(q)}`),
    '',
    `**やること**: ${todo.trim()}`,
    '',
    `${CARD_MARKER} ${expId}（本番反映の日から CI が対象語を前後 ${measure.postDays} 日で測り、週次レビューが判定する）`,
    '',
    '**完了条件**: 原稿の修正を develop に積み、`npm run todo:complete` で閉じる（commit が dispatch-log に残り、本番デプロイに入った日から計測が始まる）。',
  ].join('\n');
}

/** 既存のカードに EXP の行を足す（link。起点が手書きのカードを台帳に結ぶ）。cardEnd はカードの最終行（1 始まり）。 */
export function withMarker(text, cardEnd, expId) {
  return insertLine(text, cardEnd, `${CARD_MARKER} ${expId}（本番反映の日から CI が対象語を前後で測り、週次レビューが判定する）`);
}

/** 実験にしないカードに理由を書く（link --none）。 */
export function withNoneMarker(text, cardEnd, reason) {
  return insertLine(text, cardEnd, `${CARD_MARKER} ${NONE_MARK}${reason.trim()}）`);
}

function insertLine(text, cardEnd, line) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  lines.splice(cardEnd, 0, '', line);
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
 * 返す行: start（本番に入った）・abandon（カードが改善を打たずに閉じた）・wait（カード完了・本番未反映）。
 */
export function syncPlan(experiments, dispatchById, findDeploy) {
  const out = [];
  for (const e of experiments.filter((x) => isSearchExperiment(x) && x.status === 'proposed')) {
    const d = dispatchById.get(e.searchStrategy?.card);
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
 * EXP とカードの結び付きの検査（純関数）。cards は backlog の parseBacklog の結果、clusters はクラスター id の Set。
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
    if (!CARD_ID.test(s.card ?? '')) errors.push(`${at}: searchStrategy.card（DN-####）が無い`);
    const specErr = specErrors(e.measure);
    if (specErr.length) errors.push(`${at}: measure 仕様が不正（${specErr.join(' / ')}）`);
    if (JSON.stringify(e.measure?.scope?.pages) !== JSON.stringify([s.page])) errors.push(`${at}: measure.scope.pages が searchStrategy.page と違う`);
    if (!e.measure?.scope?.queries?.length) errors.push(`${at}: measure.scope.queries（起票時の検索語）が無い`);
    const card = cardById.get(s.card);
    if (e.status === 'proposed' && !card && !dispatchById.has(s.card)) errors.push(`${at}: カード ${s.card} が backlog にも dispatch-log にも無い`);
    if (card && !card.body.includes(e.id)) errors.push(`${at}: カード ${s.card} の本文に ${e.id} が無い（「${CARD_MARKER} ${e.id}」の行を足す）`);
    if (['running', 'measuring'].includes(e.status) && !(e.started_at && e.measure?.anchor && e.next_check_date)) errors.push(`${at}: 計測中なのに started_at・measure.anchor・next_check_date のどれかが無い（npm run search-improvement -- sync で始める）`);
    if (e.status === 'done' && !(e.result in RESULTS)) errors.push(`${at}: 判定済みなのに result が ${Object.keys(RESULTS).join(' / ')} のどれでもない`);
    if (OPEN.includes(e.status)) {
      const prev = openByPage.get(s.page);
      if (prev) errors.push(`${at}: ${s.page} に計測の終わっていない ${prev} がある（同じページに 2 つ目を起票しない）`);
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
    if (origin?.includes(ORIGIN_WORD) && !marked.length && !none) errors.push(`${c.id}: 起点が${ORIGIN_WORD}なのに「${CARD_MARKER} EXP-…」の行が無い（npm run search-improvement -- add で起票するか link で結ぶ。1 ページの順位改善でなければ link --none "理由"）`);
  }
  return errors;
}
