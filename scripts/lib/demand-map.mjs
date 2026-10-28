/**
 * demand-map.mjs — 悩みと商品候補の地図（config/demand-map.json）を、打ち手（experiments.json の demand.painId）と
 * 実売（data/note/sales.json）に結んで、管理画面 戦略＞資格と市場＞悩みと商品候補（/strategy/demand）の表示モデルを作る。
 *
 * 正本は demand-map.json（悩み・立場・商品候補）と experiments.json（打ち手）。ここは結ぶだけで値を足さない。
 * 実売は商品候補の productIds と salesIds（売上記録の旧系統の id）に当たる売上だけを数える（売上の productId の接頭辞 article:・membership: は外して照らす）。
 * 軸（類似／差別）ごとの合計で、どちらの作り方が効くかを比べる。販売前の候補は数えない（0 円と区別する）。
 */
import { readDatasetIf } from './dataset-io.mjs';

/** 売上の productId から接頭辞を外す（product-lineup.json の salesRules と同じ扱い） */
export const bareProductId = (id) => String(id).replace(/^(article|membership):/, '');

/**
 * @param {{ map: any, experiments: any[], sales: any[] }} input
 */
export function buildDemandView({ map, experiments, sales }) {
  const byProduct = new Map();
  for (const s of sales) {
    const id = bareProductId(s.productId);
    const cur = byProduct.get(id) ?? { count: 0, yen: 0 };
    cur.count += 1;
    cur.yen += Number(s.price) || 0;
    byProduct.set(id, cur);
  }
  const actions = experiments
    .filter((e) => e.demand?.painId)
    .map((e) => ({
      id: e.id,
      title: e.title,
      status: e.status,
      painId: e.demand.painId,
      harm: e.demand.harm ?? [],
      metric: e.target_metric,
      judgeDate: e.next_check_date ?? null,
      stopCondition: e.demand.stopCondition ?? null,
      card: e.demand.card ?? null,
    }));
  const candidates = map.candidates.map((c) => {
    const ids = [...(c.productIds ?? []), ...(c.salesIds ?? [])];
    const sold = ids.length
      ? ids.reduce((acc, id) => {
          const v = byProduct.get(id);
          return v ? { count: acc.count + v.count, yen: acc.yen + v.yen } : acc;
        }, { count: 0, yen: 0 })
      : null;
    return { ...c, sold };
  });
  const axisTotals = {};
  for (const axis of ['similar', 'differentiated']) {
    const live = candidates.filter((c) => c.axis === axis && c.sold);
    axisTotals[axis] = {
      candidates: candidates.filter((c) => c.axis === axis).length,
      selling: live.length,
      count: live.reduce((n, c) => n + c.sold.count, 0),
      yen: live.reduce((n, c) => n + c.sold.yen, 0),
    };
  }
  const pains = map.pains.map((p) => ({
    ...p,
    candidateCount: { similar: candidates.filter((c) => c.pain === p.id && c.axis === 'similar').length, differentiated: candidates.filter((c) => c.pain === p.id && c.axis === 'differentiated').length },
    actionCount: actions.filter((a) => a.painId === p.id).length,
  }));
  const painIds = new Set(map.pains.map((p) => p.id));
  const errors = actions.filter((a) => !painIds.has(a.painId)).map((a) => `${a.id} の demand.painId「${a.painId}」が demand-map.json の pains に無い`);
  return { updatedAt: map.updatedAt, pains, positions: map.positions, candidates, actions, axisTotals, research: map.research, errors };
}

export function loadDemandView(root) {
  const map = readDatasetIf(root, 'config.demand-map');
  if (!map) return null;
  const experiments = readDatasetIf(root, 'business.experiments')?.experiments ?? [];
  const sales = readDatasetIf(root, 'note.sales')?.sales ?? [];
  return buildDemandView({ map, experiments, sales });
}

const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

/**
 * 四半期の外の調査の期限。最後の回の次の資格（rotation を一周する）と、最後の回から intervalDays 後の期限を返す。
 * 回が無ければ rotation の先頭がすぐ期限（初回）。
 */
export function researchDue(map, today) {
  const { intervalDays, rotation, runs } = map.research;
  const last = runs.at(-1) ?? null;
  const next = last ? rotation[(rotation.indexOf(last.qualification) + 1) % rotation.length] : rotation[0];
  const dueDate = last ? addDays(last.date, intervalDays) : today;
  return { last, next, dueDate, intervalDays, due: dueDate <= today };
}

const CLOSED = new Set(['stopped', 'done', 'abandoned']);

/** 判定日が until 以前で、まだ閉じていない商品候補と打ち手（月次レビューで判定か延長の理由を書く対象） */
export function dueJudgements(view, until) {
  return [
    ...view.candidates.filter((c) => !CLOSED.has(c.status) && c.judgeDate <= until).map((c) => ({ id: c.id, title: c.title, status: c.status, date: c.judgeDate, stop: c.stopCondition })),
    ...view.actions.filter((a) => !CLOSED.has(a.status) && a.judgeDate && a.judgeDate <= until).map((a) => ({ id: a.id, title: a.title, status: a.status, date: a.judgeDate, stop: a.stopCondition })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 悩みの言い方（phrases）を含む GSC の検索語の表示・クリック。言い方の語（空白区切り）がすべて検索語に入っていれば当たりとする。
 * @param {{ keys: string[], impressions: number, clicks: number }[]} rows GSC の query の行
 */
export function painSearchMetrics(pains, rows) {
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  return pains.map((p) => {
    const tokenSets = p.phrases.map((ph) => norm(ph).split(' '));
    const hits = rows.filter((r) => tokenSets.some((ts) => ts.every((t) => norm(r.keys[0]).includes(t))));
    return {
      id: p.id,
      label: p.label,
      queries: hits.length,
      impressions: hits.reduce((n, r) => n + r.impressions, 0),
      clicks: hits.reduce((n, r) => n + r.clicks, 0),
      top: [...hits].sort((a, b) => b.impressions - a.impressions).slice(0, 3).map((r) => ({ query: r.keys[0], impressions: r.impressions, clicks: r.clicks, position: Math.round(r.position * 10) / 10 })),
    };
  });
}
