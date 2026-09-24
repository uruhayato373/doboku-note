#!/usr/bin/env node
/**
 * SessionStart フック: ローカル main/develop が origin より遅れていれば警告する。
 *
 * 動機（2026-06-11 事故）: 複数セッション・worktree 常態 + CI が deploy で main に
 * 自動マージするため、ローカル main が origin/main から数十コミット遅れることがある。
 * ブランチ名の確認だけでは気づけず、古いツリー上で作業して既存作業を重複・劣化させた。
 * develop も同様に遅れることがあるため（2026-06-19 拡張）、両ブランチを監視する。
 * 開幕で behind を可視化し、着手前の同期を促す。
 *
 * develop の最新 Pre-merge check（ci.yml）が failure なら赤い 1 行を出す（DN-0235）。develop への直 push の赤は
 * PR と違って誰の画面にも出ず、2026-09-13〜14 に 6 run 連続の failure が 1 日以上放置された。gh が使えない・
 * 取得に失敗した端末では「未取得」と出し、緑（何も出ない）と混同させない。
 *
 * 安全策: 何が起きても session を止めない（常に exit 0、出力は警告のみ）。
 * session-start.mjs は import して run({ quiet: true }) を呼ぶ（DN-0236・子の node を立てない）。
 */
import { execFileSync } from 'node:child_process';
import { createOutput, isCliEntry, runAsCli } from './lib/cli-run.mjs';

function gitSafe(args, opts = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      ...opts,
    }).trim();
  } catch {
    return '';
  }
}

/**
 * develop の最新 CI run（gh run list --json の配列）から表示行を決める。何も出さないときは null。
 * @param {{ok: boolean, runs?: Array<{status?: string, conclusion?: string, url?: string, createdAt?: string, headSha?: string}>}} res
 */
export function formatDevelopCi(res) {
  if (!res || !res.ok) return '[git-sync] develop の CI 状態は未取得（gh が使えない・取得に失敗）。赤かどうかは不明';
  const latest = (res.runs || [])[0];
  if (!latest) return '[git-sync] develop の CI 状態は未取得（run が 0 件）。赤かどうかは不明';
  if (latest.status !== 'completed') return null; // 実行中・待機中はまだ判定しない
  if (latest.conclusion === 'success') return null;
  const when = (latest.createdAt || '').replace('T', ' ').slice(0, 16);
  const sha = (latest.headSha || '').slice(0, 9);
  return `[git-sync] ✗ develop の最新 Pre-merge check が ${latest.conclusion || '失敗'}（${when}Z ${sha}）。着手前に直す: ${latest.url || ''}`;
}

function developCiStatus() {
  try {
    const raw = execFileSync('gh', ['run', 'list', '--branch', 'develop', '--workflow', 'ci.yml', '--limit', '1',
      '--json', 'status,conclusion,url,createdAt,headSha'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15_000 });
    return { ok: true, runs: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

export async function run({ quiet = false } = {}) {
  const out = createOutput({ quiet });

  // 軽量 fetch（origin の main / develop のみ・タグ無し）。失敗は無視。
  // in-process 化で外側の spawn timeout（旧 30s）が無くなったので、fetch 自体に上限を置く。
  gitSafe(['fetch', '-q', '--no-tags', 'origin', 'main', 'develop'], { timeout: 25_000 });

  const checkBranch = (branch, remote) => {
    const behind = Number(gitSafe(['rev-list', '--count', `${branch}..${remote}`]) || '0');
    if (behind > 0) {
      const ahead = Number(gitSafe(['rev-list', '--count', `${remote}..${branch}`]) || '0');
      const diverged = ahead > 0 ? `（ローカル独自 ${ahead} コミットあり＝分岐）` : '';
      const cmd =
        ahead > 0
          ? `git fetch && git rebase ${remote}`
          : `git pull --ff-only`;
      out.log(
        `[git-sync] ⚠ ローカル ${branch} が ${remote} より ${behind} コミット遅れ${diverged}。` +
          ` 着手前に同期推奨: ${cmd}`,
      );
    }
  };

  checkBranch('main', 'origin/main');
  checkBranch('develop', 'origin/develop');
  const ci = formatDevelopCi(developCiStatus());
  if (ci) out.log(ci);
  return out.result(0);
}

if (isCliEntry(import.meta.url)) runAsCli(run);
