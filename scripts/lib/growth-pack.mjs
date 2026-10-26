// growth-pack（純粋ロジック）— 週次の成長パック（GA4 × GSC を同じ月〜日の週と直前 28 日の基線で揃えたもの）の
// 期間決定と、API 応答の畳み込み。I/O を持たない（取得は scripts/fetch-growth-pack.mjs）。
//
// 週の定義は business-direction の reviewPeriod('weekly')＝前の完了した月〜日（JST）。事業記録・週次レビューと
// 同じ窓にすることで、GA4 の 7 日（木〜水）・GSC の別窓・レビュー本文（土〜金）がずれていた問題を解消する。
import { reviewPeriod, isoWeekKey, weekPeriod, addDays } from './business-direction.mjs';

/** { week, period, baseline } を返す。week 指定がなければ today 基準の前の完了週。 */
export function packPeriods({ today, week, baselineDays = 28 } = {}) {
  const period = week ? weekPeriod(week) : reviewPeriod('weekly', today);
  const baseline = { startDate: addDays(period.startDate, -baselineDays), endDate: addDays(period.startDate, -1), days: baselineDays };
  return { week: isoWeekKey(period.startDate), period, baseline };
}

/** URL / パスを突合キーへ（ドメイン・クエリ・ハッシュ・末尾スラッシュを落とす）。 */
export function normPath(u) {
  let p = String(u ?? '').replace(/^https?:\/\/(www\.)?doboku-note\.com/i, '');
  p = p.split('#')[0].split('?')[0];
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

/**
 * 流入元のグループ。自然検索は検索エンジン別（google / bing / yahoo / organic-other）に分ける。
 * GA4 の Organic Search には bot 疑いの bing が大量に混ざるため（measurement-incidents 2026-09-03）、
 * google だけを GSC と突合し、bing は Bing Webmaster と別に照合する。
 */
export function sourceGroup(channel, source, organicSources = ['google', 'bing', 'yahoo']) {
  if (channel === 'Organic Search') {
    const s = String(source ?? '').toLowerCase();
    return organicSources.includes(s) ? s : 'organic-other';
  }
  return String(channel || '(other)').toLowerCase().replace(/\s+/g, '-');
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function rangeIndex(headers) {
  const i = headers.indexOf('dateRange');
  if (i < 0) throw new Error('dateRange 列が無い（dateRanges に name を付けて 2 期間で取得すること）');
  return i;
}

/**
 * landingPage × sessionSource × sessionDefaultChannelGroup × dateRange を、page × group ごとの
 * week / base の合計へ畳む。activeUsers は重複排除値なので group をまたいで足さない（行ごとの値のまま合算しない）。
 */
export function foldLanding(report, { organicSources } = {}) {
  const h = report.dimensionHeaders;
  const iPage = h.indexOf('landingPage'), iSrc = h.indexOf('sessionSource'), iCh = h.indexOf('sessionDefaultChannelGroup'), iRange = rangeIndex(h);
  const metrics = report.metricHeaders;
  const byKey = new Map();
  for (const r of report.rows) {
    const d = r.dimensionValues.map((x) => x.value);
    const page = normPath(d[iPage]);
    const group = sourceGroup(d[iCh], d[iSrc], organicSources);
    const which = d[iRange] === 'week' ? 'week' : 'base';
    const key = `${page}\u0000${group}`;
    if (!byKey.has(key)) byKey.set(key, { page, group, week: {}, base: {} });
    const acc = byKey.get(key)[which];
    metrics.forEach((m, i) => { acc[m] = (acc[m] ?? 0) + num(r.metricValues[i]?.value); });
  }
  return [...byKey.values()];
}

/** pagePath × eventName × dateRange を page × event の { week:{count,users}, base:{count,users} } へ畳む。 */
export function foldEvents(report) {
  const h = report.dimensionHeaders;
  const iPage = h.indexOf('pagePath'), iEv = h.indexOf('eventName'), iRange = rangeIndex(h);
  const iCount = report.metricHeaders.indexOf('eventCount'), iUsers = report.metricHeaders.indexOf('totalUsers');
  const byKey = new Map();
  for (const r of report.rows) {
    const d = r.dimensionValues.map((x) => x.value);
    const page = normPath(d[iPage]);
    const event = d[iEv];
    const which = d[iRange] === 'week' ? 'week' : 'base';
    const key = `${page}\u0000${event}`;
    if (!byKey.has(key)) byKey.set(key, { page, event, week: { count: 0, users: 0 }, base: { count: 0, users: 0 } });
    const acc = byKey.get(key)[which];
    acc.count += num(r.metricValues[iCount]?.value);
    acc.users += num(r.metricValues[iUsers]?.value);
  }
  return [...byKey.values()];
}

/** GSC searchanalytics の結果（fetchSearchAnalytics の戻り値）を { page, query?, clicks, impressions, position } へ。 */
export function foldGsc(result) {
  const dims = result.meta.dimensions;
  const iPage = dims.indexOf('page'), iQuery = dims.indexOf('query');
  return {
    startDate: result.meta.startDate,
    endDate: result.meta.endDate,
    rowCount: result.meta.row_count,
    truncated: result.meta.truncated === true,
    meta: result.meta,
    rows: result.rows.map((r) => ({
      page: normPath(r.keys[iPage]),
      ...(iQuery >= 0 ? { query: r.keys[iQuery] } : {}),
      clicks: r.clicks,
      impressions: r.impressions,
      position: Math.round(r.position * 10) / 10,
    })),
  };
}

/** page/query を含めない全体集計。API の空応答は 0 に置換しない。 */
export function foldGscTotal(result) {
  if (result.meta.dimensions.length || result.rows.length !== 1) throw new Error(`GSC 全体集計は無次元の 1 行が必要（取得 ${result.rows.length} 行）`);
  const row = result.rows[0];
  if (![row.clicks, row.impressions, row.ctr, row.position].every(Number.isFinite)) throw new Error('GSC 全体集計に数値の欠測があります');
  return { startDate: result.meta.startDate, endDate: result.meta.endDate, rowCount: 1, truncated: result.meta.truncated === true, meta: result.meta, rows: [row] };
}

/**
 * ページ別（gscPageWeek・gscPageBase）の取り方。meta.filters に国の条件があれば 'country:jpn'、無ければ 'all-countries'。
 * 国で絞った旧パックは匿名化された検索語の分を含まない下限（W42 は byPage 全体の clicks 25%）で、国の条件なしの
 * 新しいパック（DN-0806）とは母集団が違う。連続する週を比べる減衰の検出は同じ取り方どうしだけで行う。
 * meta が無い（書式が古い・テストの fixture）ときは 'unspecified'。
 */
export function gscPageScope(section) {
  const meta = section?.meta;
  if (!meta) return 'unspecified';
  const country = (meta.filters ?? []).find((f) => f.dimension === 'country');
  return country ? `country:${country.expression}` : 'all-countries';
}
