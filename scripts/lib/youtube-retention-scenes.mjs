/**
 * 維持率曲線（YouTube Analytics の audienceWatchRatio）を storyboard の場面の秒数に重ね、場面ごとの離脱を出す（DN-1063）。
 * 純関数だけ（外部通信・保存なし）。曲線の取得は scripts/youtube-analytics.mjs（CI）、読み手は scripts/youtube-retention-summary.mjs。
 *
 * 動画の長さは storyboard の最後の場面の end（秒）。曲線の ratio はその長さへの割合なので、場面の start/end を割って重ねる。
 * 視聴回数が基準に届かない動画は「判断できない」と出し、型ごとの平均には混ぜない。
 */

/** 維持率曲線を読んでよい最低の視聴回数（28 日窓）。これ未満は 1 人の離脱が曲線を大きく動かすので判断しない */
export const RETENTION_MIN_VIEWS = 50;

/** 曲線の ratio 時点の audienceWatchRatio（隣の点の線形補間・両端は端の点の値で延ばす）。点が無ければ null */
export function watchRatioAt(points, ratio) {
  if (!points?.length) return null;
  if (ratio <= points[0].ratio) return points[0].audienceWatchRatio;
  const last = points.at(-1);
  if (ratio >= last.ratio) return last.audienceWatchRatio;
  const i = points.findIndex((p) => p.ratio >= ratio);
  const a = points[i - 1], b = points[i];
  return a.audienceWatchRatio + ((b.audienceWatchRatio - a.audienceWatchRatio) * (ratio - a.ratio)) / (b.ratio - a.ratio);
}

/**
 * 場面ごとの離脱。dropPoints は場面の間に失った視聴者（動画の頭を 100 とした百分率ポイント・再視聴で負にもなる）、
 * lostShare は場面の頭にいた視聴者のうち場面の間に離れた割合。
 */
export function sceneDropOff(scenes, points) {
  const total = scenes.at(-1)?.end;
  if (!(total > 0)) throw new Error('storyboard の長さが 0 以下');
  return scenes.map((scene) => {
    const from = watchRatioAt(points, scene.start / total), to = watchRatioAt(points, scene.end / total);
    return {
      sceneId: scene.sceneId, start: scene.start, end: scene.end,
      watchAtStart: round(from * 100), watchAtEnd: round(to * 100), dropPoints: round((from - to) * 100),
      lostShare: from > 0 ? round(((from - to) / from) * 100) : null,
    };
  });
}

const round = (n) => Math.round(n * 10) / 10;

/**
 * 動画 1 本の判定。state: ok（場面ごとの離脱が出る）／undetermined（理由つき・曲線の数値は出さない）
 * video は記録の videos[] の 1 行、storyboard は { scenes }（無ければ null）、minViews は基準。
 */
export function judgeVideo(video, storyboard, minViews = RETENTION_MIN_VIEWS) {
  const base = { packId: video.packId, videoId: video.videoId, views: video.views };
  if (video.kind !== 'longform') return { ...base, state: 'undetermined', reason: 'Shorts は storyboard の場面が無い' };
  if (video.state !== 'measured') return { ...base, state: 'undetermined', reason: '基本指標の行が無い' };
  if (!video.retention) return { ...base, state: 'undetermined', reason: '維持率曲線を取り始める前の記録' };
  if (video.retention.state !== 'measured') return { ...base, state: 'undetermined', reason: video.retention.state === 'error' ? '維持率の取得に失敗' : '維持率の行が無い' };
  if (video.views < minViews) return { ...base, state: 'undetermined', reason: `視聴回数 ${video.views} が基準 ${minViews} に届かない` };
  if (!storyboard?.scenes?.length) return { ...base, state: 'undetermined', reason: 'storyboard が読めない' };
  return { ...base, state: 'ok', scenes: sceneDropOff(storyboard.scenes, video.retention.points) };
}

/**
 * 記録（YoutubeAnalytics）と storyboard から、パックごと・型ごとの要約を作る。
 * formatOf(video) は型 id（動画パックに当たらなければ null）、storyboardOf(packId) は storyboard か null。
 * byFormat は ok の動画だけで場面の id ごとに平均し（packs＝その場面を持つ本数）、離脱の多い順に並べる。
 */
export function summarizeRetention(snapshot, { formatOf, storyboardOf, minViews = RETENTION_MIN_VIEWS }) {
  const packs = snapshot.videos.map((v) => ({ ...judgeVideo(v, storyboardOf(v.packId), minViews), format: formatOf(v) }));
  const formats = new Map();
  for (const p of packs.filter((x) => x.state === 'ok')) {
    const key = p.format ?? '(型なし)';
    if (!formats.has(key)) formats.set(key, { format: key, packs: 0, scenes: new Map() });
    const f = formats.get(key);
    f.packs++;
    for (const s of p.scenes) {
      if (!f.scenes.has(s.sceneId)) f.scenes.set(s.sceneId, { sceneId: s.sceneId, packs: 0, drops: [] });
      const g = f.scenes.get(s.sceneId);
      g.packs++;
      g.drops.push(s.dropPoints);
    }
  }
  const byFormat = [...formats.values()].map((f) => ({
    format: f.format, packs: f.packs,
    scenes: [...f.scenes.values()].map((g) => ({ sceneId: g.sceneId, packs: g.packs, meanDropPoints: round(g.drops.reduce((a, b) => a + b, 0) / g.drops.length) })).sort((a, b) => b.meanDropPoints - a.meanDropPoints),
  }));
  return {
    period: snapshot.period, fetchedAt: snapshot.fetchedAt, minViews,
    counts: { videos: packs.length, ok: packs.filter((p) => p.state === 'ok').length, undetermined: packs.filter((p) => p.state === 'undetermined').length },
    byFormat, packs,
  };
}
