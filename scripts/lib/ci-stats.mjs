/**
 * ci-stats の集計（純関数・依存ゼロ）。入力は `gh run list --json` の配列。
 *
 * なぜ要るか: 2026-11-11 に「CI が遅い」を調べたとき、成功・取消・失敗の回数、develop が赤だった時間、
 * 落ちた検査の名前を毎回その場のワンライナーで数えていた。CI の構成を変えた前後を同じ数え方で比べる。
 */

const minutes = (from, to) => (new Date(to) - new Date(from)) / 60000;

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** workflow × event ごとの回数・結論の内訳・成功した実行の所要時間（分）の中央値と最大。回数の多い順。 */
export function summarizeRuns(runs) {
  const groups = new Map();
  for (const run of runs) {
    const key = `${run.workflowName} | ${run.event}`;
    if (!groups.has(key)) groups.set(key, { key, total: 0, conclusions: {}, durations: [] });
    const g = groups.get(key);
    g.total += 1;
    const conclusion = run.conclusion || run.status || 'unknown';
    g.conclusions[conclusion] = (g.conclusions[conclusion] || 0) + 1;
    if (run.conclusion === 'success') g.durations.push(minutes(run.startedAt || run.createdAt, run.updatedAt));
  }
  return [...groups.values()]
    .map((g) => ({ key: g.key, total: g.total, conclusions: g.conclusions, medianMin: median(g.durations), maxMin: g.durations.length ? Math.max(...g.durations) : null }))
    .sort((a, b) => b.total - a.total);
}

/**
 * ゲート（Pre-merge check）の develop での実行を時刻順に見て、赤だった時間を出す。
 * 赤の区間 = 失敗した実行が終わった時刻から、次に成功した実行が終わった時刻まで。取消は結果が無いので数えない。
 * 最後が失敗のまま終わっていれば、その失敗の終了時刻までで打ち切る（openRed: true）。
 */
export function gateTimeline(runs, { workflowName, branch = 'develop' }) {
  const gate = runs
    .filter((r) => r.workflowName === workflowName && r.headBranch === branch && r.event !== 'pull_request' && r.status === 'completed')
    .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
  const count = { success: 0, failure: 0, cancelled: 0, other: 0 };
  let redSince = null;
  let redMin = 0;
  const failed = [];
  for (const run of gate) {
    if (run.conclusion === 'success') {
      count.success += 1;
      if (redSince) { redMin += minutes(redSince, run.updatedAt); redSince = null; }
    } else if (run.conclusion === 'failure') {
      count.failure += 1;
      failed.push(run.databaseId);
      if (!redSince) redSince = run.updatedAt;
    } else if (run.conclusion === 'cancelled') count.cancelled += 1;
    else count.other += 1;
  }
  const last = gate.at(-1);
  if (redSince && last) redMin += minutes(redSince, last.updatedAt);
  return {
    total: gate.length,
    count,
    redMin,
    openRed: Boolean(redSince),
    from: gate[0]?.createdAt ?? null,
    to: last?.updatedAt ?? null,
    failed,
  };
}

/** `gh run view --log-failed` の出力から、quality-audit が落とした検査の id を抜く（色コードは落としてから読む）。 */
export function failedCheckIds(log) {
  // eslint-disable-next-line no-control-regex
  const plain = String(log || '').replace(/\x1b\[[0-9;]*m/g, '');
  const ids = new Set();
  for (const m of plain.matchAll(/\[quality-audit\] CI 失敗: ([^\r\n]+)/g)) {
    for (const id of m[1].split(',')) if (id.trim()) ids.add(id.trim());
  }
  return [...ids];
}
