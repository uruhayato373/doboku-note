/** YouTube Analytics の応答を動画単位の記録へ正規化する。API の空行は 0 ではなく欠測。 */

function cells(response, required) {
  const data = response?.data ?? response;
  const rows = data?.rows ?? [];
  if (!Array.isArray(rows)) throw new Error('YouTube Analytics の rows が配列でない');
  if (!rows.length) return [];
  const headers = (data.columnHeaders ?? []).map((h) => h.name);
  for (const name of required) if (!headers.includes(name)) throw new Error(`YouTube Analytics の列 ${name} が無い`);
  return rows.map((row) => {
    if (!Array.isArray(row) || row.length !== headers.length) throw new Error('YouTube Analytics の行と列が合わない');
    return Object.fromEntries(headers.map((name, i) => [name, row[i]]));
  });
}

function finite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${name} が非負の数でない`);
  return value;
}

export function basicMetrics(response) {
  const rows = cells(response, ['views', 'averageViewDuration', 'averageViewPercentage']);
  if (rows.length > 1) throw new Error('単一動画の基本指標が複数行になった');
  if (!rows.length) return { state: 'no-data', views: null, averageViewDurationSec: null, averageViewPercentage: null };
  const row = rows[0];
  return {
    state: 'measured',
    views: finite(row.views, 'views'),
    averageViewDurationSec: finite(row.averageViewDuration, 'averageViewDuration'),
    averageViewPercentage: finite(row.averageViewPercentage, 'averageViewPercentage'),
  };
}

export function trafficSources(response) {
  return cells(response, ['insightTrafficSourceType', 'views']).map((row) => {
    if (typeof row.insightTrafficSourceType !== 'string' || !row.insightTrafficSourceType) throw new Error('流入元の種類が空');
    return { type: row.insightTrafficSourceType, views: finite(row.views, 'traffic views') };
  });
}

/** 対象と実検査数が一致する記録だけ組む。外部通信や保存は呼び手が行う。 */
export function analyticsSnapshot({ channelId, period, fetchedAt, videos }) {
  return {
    schemaVersion: 1, fetchedAt, source: 'youtube-analytics-api-v2', channelId, period,
    coverage: { targets: videos.length, measured: videos.filter((v) => v.state === 'measured').length, noData: videos.filter((v) => v.state === 'no-data').length },
    videos,
  };
}

/** API が公式に許す基本指標と流入元を別レポートで取得する。 */
export async function queryVideoAnalytics(api, channelId, videoId, period) {
  const base = { ids: `channel==${channelId}`, startDate: period.startDate, endDate: period.endDate, filters: `video==${videoId}` };
  const basic = await api.reports.query({ ...base, metrics: 'views,averageViewDuration,averageViewPercentage' });
  const traffic = await api.reports.query({ ...base, dimensions: 'insightTrafficSourceType', metrics: 'views' });
  return { ...basicMetrics(basic), trafficSources: trafficSources(traffic) };
}
