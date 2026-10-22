#!/usr/bin/env node
/**
 * SessionStart フック: ローカル main/develop が origin より遅れていれば警告する（あわせて develop の CI の赤と、古い未コミットの変更も知らせる）。
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
 * 作業ツリーの未コミットの変更が、いちばん新しいものでも STALE_WIP_HOURS 以上前なら 1 行出す。2026-10-22 に主ツリーへ
 * 別セッションの未コミットの作業（32 ファイル）が 12 時間残り、develop を進められず、片づけ（破棄）は auto mode に止められた。
 * 早く見つければ、持ち主のセッションに積ませるか、その場でブランチに積んで PR にできる（破棄しない）。
 *
 * 安全策: 何が起きても session を止めない（常に exit 0、出力は警告のみ）。
 * session-start.mjs は import して run({ quiet: true }) を呼ぶ（DN-0236・子の node を立てない）。
 */
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { createOutput, isCliEntry, runAsCli } from './lib/cli-run.mjs';

/** 未コミットの変更がこれより古ければ警告する（時間）。数時間の作業の途中は鳴らさない */
export const STALE_WIP_HOURS = 6;
/** stat する上限（巨大な未追跡の生成物で SessionStart を遅くしない） */
const STALE_WIP_MAX_FILES = 500;

/**
 * 未コミットの変更（パスと mtime）から警告の 1 行を決める。新しい変更が 1 つでもあれば作業中とみなして null。
 * @param {Array<{ path: string, mtimeMs: number | null }>} files mtimeMs が null（削除済み）のものは時刻の判定から外す
 * @param {number} nowMs
 */
export function formatStaleWip(files, nowMs, hours = STALE_WIP_HOURS) {
  const times = files.map((f) => f.mtimeMs).filter((t) => Number.isFinite(t));
  if (!files.length || !times.length) return null;
  const newest = Math.max(...times);
  const age = (nowMs - newest) / 3_600_000;
  if (age < hours) return null;
  const when = new Date(newest).toISOString().replace('T', ' ').slice(0, 16);
  return `[git-sync] ⚠ 作業ツリーに未コミットの変更 ${files.length} 件が ${Math.floor(age)} 時間以上残っている（最新の変更 ${when}Z）。` +
    ' 別セッションの作業なら持ち主に積ませる。持ち主がおらず並行セッションもいなければ、捨てずにブランチを切ってコミットし PR にする（git switch -c → commit → develop へ戻る。並行セッションがいれば worktree へ）';
}

/** git status の未コミットの変更（未追跡を含む）と mtime。無い・取得できなければ空（改名は 2 つの変更として数える） */
function uncommittedFiles(root) {
  let raw = '';
  try {
    // gitSafe は trim するので使わない（先頭の状態記号 " M" の空白が消えてパスがずれる）
    raw = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10_000, maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    });
  } catch {
    return [];
  }
  const paths = raw.split('\0').filter(Boolean).map((e) => e.slice(3)).slice(0, STALE_WIP_MAX_FILES);
  return paths.map((p) => {
    try { return { path: p, mtimeMs: statSync(join(root, p)).mtimeMs }; } catch { return { path: p, mtimeMs: null }; }
  });
}

function gitSafe(args, opts = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      // SessionStart で全セッションが走る。status が index を書き直して並行 git と lock を取り合わないようにする
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
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
  const top = gitSafe(['rev-parse', '--show-toplevel']);
  const wip = top ? formatStaleWip(uncommittedFiles(top), Date.now()) : null;
  if (wip) out.log(wip);
  const ci = formatDevelopCi(developCiStatus());
  if (ci) out.log(ci);
  return out.result(0);
}

if (isCliEntry(import.meta.url)) runAsCli(run);
