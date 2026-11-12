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

/**
 * 維持率曲線（elapsedVideoTimeRatio 別の audienceWatchRatio・relativeRetentionPerformance）。API の空行は欠測（no-data）で、0 にしない。
 * audienceWatchRatio は再視聴で 1 を超えうる。relativeRetentionPerformance は同じ長さの動画の中での相対（0〜1）。
 */
export function retentionCurve(response) {
  const rows = cells(response, ['elapsedVideoTimeRatio', 'audienceWatchRatio', 'relativeRetentionPerformance']);
  if (!rows.length) return { state: 'no-data', points: [] };
  const points = rows.map((row) => {
    const ratio = finite(row.elapsedVideoTimeRatio, 'elapsedVideoTimeRatio');
    if (ratio > 1) throw new Error('elapsedVideoTimeRatio が 1 を超える');
    return { ratio, audienceWatchRatio: finite(row.audienceWatchRatio, 'audienceWatchRatio'), relativeRetentionPerformance: finite(row.relativeRetentionPerformance, 'relativeRetentionPerformance') };
  }).sort((a, b) => a.ratio - b.ratio);
  for (let i = 1; i < points.length; i++) if (points[i].ratio === points[i - 1].ratio) throw new Error('elapsedVideoTimeRatio が重複している');
  return { state: 'measured', points };
}

const retentionCoverage = (videos) => {
  const states = videos.map((v) => v.retention?.state);
  return { targets: videos.length, measured: states.filter((x) => x === 'measured').length, noData: states.filter((x) => x === 'no-data').length, failed: states.filter((x) => x === 'error').length };
};

/** 対象と実検査数が一致する記録だけ組む。外部通信や保存は呼び手が行う。 */
export function analyticsSnapshot({ channelId, period, fetchedAt, videos }) {
  return {
    schemaVersion: 1, fetchedAt, source: 'youtube-analytics-api-v2', channelId, period,
    coverage: {
      targets: videos.length, measured: videos.filter((v) => v.state === 'measured').length, noData: videos.filter((v) => v.state === 'no-data').length,
      // 維持率曲線を取った記録（DN-1063）だけ。古い記録には無いので、あるときだけ載せる
      ...(videos.some((v) => v.retention) ? { retention: retentionCoverage(videos) } : {}),
    },
    videos,
  };
}

/** API が公式に許す基本指標と流入元を別レポートで取得する。 */
export async function queryVideoAnalytics(api, channelId, videoId, period) {
  const base = { ids: `channel==${channelId}`, startDate: period.startDate, endDate: period.endDate, filters: `video==${videoId}` };
  const basic = await api.reports.query({ ...base, metrics: 'views,averageViewDuration,averageViewPercentage' });
  const traffic = await api.reports.query({ ...base, dimensions: 'insightTrafficSourceType', metrics: 'views' });
  const metrics = basicMetrics(basic);
  return { ...metrics, trafficSources: trafficSources(traffic), retention: await queryRetention(api, base, metrics.state) };
}

/** 維持率曲線は基本指標の行がある動画だけ取る。API が拒んだ動画は error として残し（理由つき）、ほかの指標の記録は止めない */
async function queryRetention(api, base, basicState) {
  if (basicState !== 'measured') return { state: 'no-data', points: [] };
  try {
    return retentionCurve(await api.reports.query({ ...base, dimensions: 'elapsedVideoTimeRatio', metrics: 'audienceWatchRatio,relativeRetentionPerformance' }));
  } catch (error) {
    return { state: 'error', points: [], error: String(error?.message ?? error).slice(0, 200) };
  }
}
