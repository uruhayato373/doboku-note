// 共通の concurrency group で「待機中に取り消された定期実行」を見分ける（DN-0750）。
//
// develop へ書き込むワークフローは `group: develop-git-write`（cancel-in-progress: false）を共有している。
// cancel-in-progress: false が守るのは実行中の run だけで、GitHub は同じ group の待機中（pending）を 1 件しか残さない。
// 新しい run が並ぶと古い待機分は、ジョブが 1 つも始まらないまま cancelled になる
// （2026-10-09 の gsc-auto-review は作成 3 秒後に取り消され、週次の記録が 1 回欠けた）。

/** ワークフローの YAML の本文から、共通 group を使う定期ワークフローかを見る */
export function isSharedGroupSchedule(yamlText) {
  return /^\s*group:\s*develop-git-write\s*$/m.test(yamlText) && /^\s*schedule:\s*$/m.test(yamlText);
}

/**
 * 再実行する run を選ぶ。runs は gh run list の行（databaseId・event・conclusion・status・attempt・createdAt）に
 * jobCount（その run で作られたジョブの数）を足したもの。新しい順でも古い順でもよい。
 * 選ぶのは: 定期実行・初回（attempt 1）・cancelled・ジョブ 0（＝待機中に取り消された）・lookback 内で、
 * それより後に作られた同じワークフローの run が成功も実行中も待機中も無いもの。手で止めた実行中の run はジョブがあるので選ばない。
 */
export function selectRerunTargets(runs, { now = new Date(), lookbackHours = 30 } = {}) {
  const since = now.getTime() - lookbackHours * 3600_000;
  const sorted = [...runs].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return sorted.filter((run, i) => {
    if (run.event !== 'schedule' || run.conclusion !== 'cancelled' || (run.attempt ?? 1) !== 1) return false;
    if (run.jobCount !== 0) return false;
    if (Date.parse(run.createdAt) < since) return false;
    const later = sorted.slice(i + 1);
    return !later.some((r) => r.conclusion === 'success' || r.status === 'in_progress' || r.status === 'queued' || r.status === 'pending' || r.status === 'waiting');
  });
}
