/**
 * web-vitals-rum.mjs — 実ユーザー計測（RUM）の Core Web Vitals を集計・判定する唯一の実装。
 * ---------------------------------------------------------------------------
 * サイトの src/components/WebVitals.tsx が GA4 へ送る `web_vitals` イベント（metric_name・metric_rating）を
 * .claude/scripts/fetch-ga4-web-vitals.mjs が「ページの型 × 端末 × 指標 × 評価」の件数で取り、ここで判定する。
 * CrUX と同じ考え方で「good が 75% 以上＝良好」「poor が 25% 超＝不良」「それ以外＝要改善」。
 * 件数が MIN_SAMPLES 未満の組は「件数不足」で、良好とも不良とも言わない（欠測を良好へ変換しない）。
 * 読み手: npm run report-web-vitals（週次レビュー）・tests/web-vitals-rum.test.mjs。
 * ---------------------------------------------------------------------------
 */

export const METRICS = ['LCP', 'INP', 'CLS'];
export const RATINGS = ['good', 'needs-improvement', 'poor'];
export const MIN_SAMPLES = 30;

/** URL パスをページの型にまとめる（記事 1 本ずつでは件数が足りないため）。 */
export function pageTemplate(path) {
  const p = String(path || '/').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (p === '/') return '/';
  const seg = p.split('/').filter(Boolean);
  if (seg[0] === 'exam' && seg.length >= 3) return `/exam/${seg[1]}/${seg[2]}`;
  return `/${seg.slice(0, 2).join('/')}`;
}

/** 件数から判定する。counts = { good, 'needs-improvement', poor }。 */
export function judge(counts) {
  const n = RATINGS.reduce((s, r) => s + (counts[r] ?? 0), 0);
  if (n < MIN_SAMPLES) return { n, status: 'insufficient', goodShare: null };
  const goodShare = (counts.good ?? 0) / n;
  const poorShare = (counts.poor ?? 0) / n;
  const status = goodShare >= 0.75 ? 'good' : poorShare > 0.25 ? 'poor' : 'needs-improvement';
  return { n, status, goodShare: Math.round(goodShare * 1000) / 1000 };
}

/**
 * GA4 の行 { path, device, metric, rating, count } を集計して判定する。
 * @returns {{ rows: Array<{template:string, device:string, metric:string, n:number, status:string, goodShare:number|null, counts:object}>, events:number, dropped:number }}
 */
export function summarize(inputRows) {
  const groups = new Map();
  let events = 0;
  let dropped = 0;
  for (const r of inputRows) {
    const count = Number(r.count) || 0;
    if (!METRICS.includes(r.metric) || !RATINGS.includes(r.rating)) {
      dropped += count;
      continue;
    }
    events += count;
    const key = `${pageTemplate(r.path)}\u0000${r.device}\u0000${r.metric}`;
    const g = groups.get(key) ?? { template: pageTemplate(r.path), device: r.device, metric: r.metric, counts: { good: 0, 'needs-improvement': 0, poor: 0 } };
    g.counts[r.rating] += count;
    groups.set(key, g);
  }
  const rows = [...groups.values()]
    .map((g) => ({ ...g, ...judge(g.counts) }))
    .sort((a, b) => b.n - a.n || a.template.localeCompare(b.template));
  return { rows, events, dropped };
}

/** 手を打つべき組（不良・要改善で件数が足りているもの）。不良が先。 */
export function actionable(rows) {
  const order = { poor: 0, 'needs-improvement': 1 };
  return rows.filter((r) => r.status in order).sort((a, b) => order[a.status] - order[b.status] || b.n - a.n);
}
