/**
 * develop の Pre-merge check（ci.yml）の最新の結果を読む（依存ゼロ）。
 * セッション開始時（scripts/check-git-sync.mjs）と、develop への push の直前（agent-hook の check-shell-traps）が使う。
 *
 * なぜ 2 か所か: 赤を知らせるのがセッション開始時の 1 回だけだと、長いセッションは赤い develop の上へ push し続ける
 * （2026-11-11 に別作業の赤が 4 時間以上続き、その間も push が積まれた）。判定は 1 つにして両方から呼ぶ。
 */
import { execFileSync } from 'node:child_process';

/**
 * 結果の出ている最新の実行を返す。実行中・待機中と、取り消された実行は結果が無いので飛ばす
 * （develop は実行中の 1 本を完走させ、待ちは最新の 1 本だけ残す。置き換えられた待ちは cancelled になる）。
 */
export function pickVerdictRun(runs) {
  return (runs || []).find((r) => r.status === 'completed' && r.conclusion !== 'cancelled' && r.conclusion !== 'skipped') ?? null;
}

/**
 * develop の CI run（gh run list --json の配列・新しい順）から表示行を決める。何も出さないときは null。
 * @param {{ok: boolean, runs?: Array<{status?: string, conclusion?: string, url?: string, createdAt?: string, headSha?: string}>}} res
 * @param {{prefix?: string, advice?: string}} [opts]
 */
export function formatDevelopCi(res, { prefix = '[git-sync]', advice = '着手前に直す' } = {}) {
  if (!res || !res.ok) return `${prefix} develop の CI 状態は未取得（gh が使えない・取得に失敗）。赤かどうかは不明`;
  if (!(res.runs || []).length) return `${prefix} develop の CI 状態は未取得（run が 0 件）。赤かどうかは不明`;
  const verdict = pickVerdictRun(res.runs);
  if (!verdict) return null; // 実行中・待機中・取り消しだけ。まだ判定しない
  if (verdict.conclusion === 'success') return null;
  const when = (verdict.createdAt || '').replace('T', ' ').slice(0, 16);
  const sha = (verdict.headSha || '').slice(0, 9);
  return `${prefix} ✗ develop の最新 Pre-merge check が ${verdict.conclusion || '失敗'}（${when}Z ${sha}）。${advice}: ${verdict.url || ''}`;
}

/** gh で直近の実行を読む。失敗は { ok: false }（赤とも緑とも言わない） */
export function developCiStatus({ timeout = 15_000 } = {}) {
  try {
    const raw = execFileSync('gh', ['run', 'list', '--branch', 'develop', '--workflow', 'ci.yml', '--limit', '10',
      '--json', 'status,conclusion,url,createdAt,headSha'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout });
    return { ok: true, runs: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}
