/**
 * git-direct-commit.mjs — 作業ツリー・index・今のブランチに触れず、リモートのブランチへ 1 ファイルの変更を直接積む。
 *
 * なぜ要るか: 共有の checkout では、別セッションがいつの間にかブランチを切り替えている。backlog の起票を
 * 普通に `git commit` すると、その別ブランチへ載る（2026-10-07 に DN-0567 が feat/admin-data-table へ載り、
 * 相手が上に積んで push したため外せなくなった）。ここでは origin/<branch> の最新を土台に、一時 index で
 * tree を作り、commit-tree で commit を作って push する。push が先を越されたら取り直してやり直す。
 *
 * pre-commit フックは走らないので、呼び出し側が transform の中で検査してから返す（検査に落ちたら throw）。
 */
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function git(root, args, { input, env } = {}) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    input,
    env: env ? { ...process.env, ...env } : process.env,
    stdio: [input == null ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * @param {object} o
 * @param {string} o.root リポジトリのルート（どの worktree でもよい）
 * @param {string} o.path 書き換えるファイル（リポジトリ相対・`/` 区切り）
 * @param {(text: string, attempt: number) => { text: string, message: string, result?: any }} o.transform
 *   リモートの最新の中身を受け取り、新しい中身と commit メッセージを返す。push に負けたら最新で呼び直す。
 * @param {string} [o.branch='develop']
 * @param {string} [o.remote='origin']
 * @param {boolean} [o.push=true] false なら commit を作るだけ（テスト・dry-run 用）
 * @param {number} [o.retries=3]
 * @returns {{ commit: string, base: string, pushed: boolean, result: any }}
 */
export function commitFileToRemoteBranch({ root, path, transform, branch = 'develop', remote = 'origin', push = true, retries = 3 }) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    git(root, ['fetch', '-q', remote, branch]);
    const base = git(root, ['rev-parse', `${remote}/${branch}`]).trim();
    const current = git(root, ['show', `${base}:${path}`]);
    const { text, message, result } = transform(current, attempt);
    if (text === current) throw new Error(`${path} が変わらない（積むものが無い）`);
    const blob = git(root, ['hash-object', '-w', '--stdin'], { input: text }).trim();
    const index = join(tmpdir(), `git-direct-commit-${process.pid}-${Date.now()}.index`);
    let tree;
    try {
      const env = { GIT_INDEX_FILE: index };
      git(root, ['read-tree', base], { env });
      git(root, ['update-index', '--add', '--cacheinfo', `100644,${blob},${path}`], { env });
      tree = git(root, ['write-tree'], { env }).trim();
    } finally {
      rmSync(index, { force: true });
    }
    const commit = git(root, ['commit-tree', tree, '-p', base, '-F', '-'], { input: message }).trim();
    if (!push) return { commit, base, pushed: false, result };
    try {
      git(root, ['push', '-q', remote, `${commit}:refs/heads/${branch}`]);
      return { commit, base, pushed: true, result };
    } catch (error) {
      lastError = error; // 先を越された（non-fast-forward）。最新を取り直してやり直す
    }
  }
  throw new Error(`${remote}/${branch} へ push できなかった（${retries} 回）: ${String(lastError?.stderr || lastError?.message || '').trim().slice(0, 300)}`);
}
