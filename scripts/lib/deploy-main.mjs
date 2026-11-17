// deploy-main の判定（純粋）。実行は scripts/deploy-main.mjs。

/** 検査の結果から、昇格してよい develop の commit を選ぶ。commits は新しい順、runs は gh run list の JSON。 */
export function pickGateTarget(commits, runs) {
  const bySha = new Map();
  for (const run of runs) if (!bySha.has(run.headSha)) bySha.set(run.headSha, run);
  for (const sha of commits) {
    const run = bySha.get(sha);
    if (!run) continue;                                     // bot の [skip ci] commit は検査が無い
    if (run.conclusion === 'cancelled') continue;           // 新しい push で取り消された回は判定に使わない
    if (run.status !== 'completed') return { kind: 'wait', sha, runId: run.databaseId };
    if (run.conclusion === 'success') return { kind: 'ok', sha };
    return { kind: 'fail', sha, runId: run.databaseId, conclusion: run.conclusion };
  }
  return { kind: 'none' };
}

/** 昇格先より新しい commit のうち、PR で入ったのに develop の検査が無いもの。件名の末尾の (#番号) で見分ける。 */
export function unverifiedPrCommits(subjects) {
  return subjects.filter((subject) => /\(#\d+\)$/.test(subject));
}

/** 夜間の全件検査の未解決 Issue。PR では全件を回さないので、昇格の前にここで止める。 */
export function blockingNightlyIssues(issues) {
  return issues.filter((issue) => /^\[auto\] (e2e|lighthouse)-nightly:/.test(issue.title));
}

/** push の結果が「先に main が進んだ」なら作り直せる。それ以外の失敗は再試行しても直らないことが多い。 */
export function pushRejectedAsStale(stderr) {
  return /non-fast-forward|fetch first|\[rejected\]|cannot lock ref/i.test(String(stderr ?? ''));
}

/** 緑待ちの上限（ミリ秒）。 */
export const GATE_WAIT_LIMIT_MS = 30 * 60 * 1000;

/** 緑待ちを開始から上限まで続けたか。超えたら検査不成立（exit 2）で止める。 */
export function gateWaitExpired(startedAtMs, nowMs, limitMs = GATE_WAIT_LIMIT_MS) {
  return nowMs - startedAtMs > limitMs;
}

/** gh run view --json jobs の結果から、指定ステップの conclusion を返す。見つからなければ null。 */
export function stepConclusion(viewJson, stepName) {
  for (const job of viewJson?.jobs ?? []) {
    const step = (job.steps ?? []).find((s) => s.name === stepName);
    if (step) return step.conclusion ?? null;
  }
  return null;
}

/**
 * 手元の本番確認の結果を、デプロイ run の同じ検査の結果で補って判定する。
 * 手元 exit 0 → 0 / 手元 exit 1（実際に壊れている）→ 1 / 手元 exit 2（接続不能）→ run のステップが success なら 0、それ以外は 2。
 */
export function ssrVerdict(localStatus, runStepConclusion) {
  if (localStatus === 0) return { code: 0, via: 'local' };
  if (localStatus !== 2) return { code: 1, via: 'local' };
  return runStepConclusion === 'success' ? { code: 0, via: 'deploy-run' } : { code: 2, via: 'none' };
}

/** デプロイの run を headSha で 1 件選ぶ。無ければ null（起動していない）。 */
export function findDeployRun(runs, sha) {
  return runs.find((run) => run.headSha === sha) ?? null;
}

/**
 * デプロイ run の状態から次の手を決める。`gh run watch --exit-status` は run の途中でも 0 以外で抜けることがあり（2026-11-17・DN-1234）、
 * 終了コードだけで失敗と決めると、後で success になるデプロイを失敗と報告する。run の実体（status・conclusion）で決める。
 * @param {{ status?: string, conclusion?: string | null }} view
 * @returns {'success' | 'failure' | 'pending'}
 */
export function deployRunOutcome(view) {
  if (view?.status !== 'completed') return 'pending';
  return view.conclusion === 'success' ? 'success' : 'failure';
}

/** デプロイの完了待ちの上限（通常は 10 分前後） */
export const DEPLOY_WAIT_LIMIT_MS = 40 * 60 * 1000;
