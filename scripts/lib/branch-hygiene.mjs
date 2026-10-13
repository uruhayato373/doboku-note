/**
 * branch-hygiene.mjs — ブランチと worktree の溜まりを git の実体で分類する（DN-0638・読み取り専用・削除しない）。
 *
 * 分類:
 *   merged … 中身が base（既定 origin/develop）に入り済み。次のどれか。
 *            1. tip が base の祖先（通常のマージ・ff）
 *            2. base へマージしても tree が変わらない（squash マージ。`git merge-tree --write-tree` の結果が base の tree と同じ）
 *            3. その tip が、マージ済みの PR の最終コミットと同じ（呼び出し側が gh から渡す mergedPrTips。squash のあと base 側が
 *               同じ行をさらに直して 2. が衝突になる場合の裏取り）
 *   stale  … 未マージで、tip の最終コミットが N 日以上前
 *   idle-worktree … 未コミットの変更（追跡中の変更・未追跡）があり、N 日以上動いていない worktree
 *            （最終の動き = 最終コミット日 と 変更中のファイルの更新時刻のうち新しい方）
 * `git branch --merged` は squash マージを拾えない（2026-10-10 に 41 本のローカルブランチを手作業で判定した）ので、2. を持つ。
 */
import { execFileSync } from 'node:child_process';
import { lstatSync } from 'node:fs';
import { join } from 'node:path';

const DAY_MS = 86_400_000;
/** 比べる先から外すブランチ（長命の幹） */
const TRUNKS = new Set(['develop', 'main', 'master']);

function git(repo, args, { allowFail = false } = {}) {
  try {
    return { ok: true, code: 0, out: execFileSync('git', ['-c', 'core.quotepath=false', '-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    if (!allowFail) throw e;
    return { ok: false, code: e.status ?? -1, out: String(e.stdout ?? ''), err: String(e.stderr ?? '') };
  }
}

/** base に使う ref を決める（指定 > origin/develop > develop）。無ければ null */
function resolveBase(repo, preferred) {
  for (const ref of [preferred, 'origin/develop', 'develop'].filter(Boolean)) {
    if (git(repo, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { allowFail: true }).ok) return ref;
  }
  return null;
}

/** `git merge-tree --write-tree` が使えるか（git 2.38 以上） */
function supportsMergeTree(repo) {
  const r = git(repo, ['merge-tree', '--write-tree', 'HEAD', 'HEAD'], { allowFail: true });
  return r.ok || r.code === 1;
}

/** ローカル・リモートのブランチ（幹と HEAD を除く）。name は `feature` / `origin/feature` */
function listBranches(repo) {
  const fmt = '%(refname)%00%(objectname)%00%(committerdate:unix)';
  const out = git(repo, ['for-each-ref', `--format=${fmt}`, 'refs/heads', 'refs/remotes']).out;
  const rows = [];
  for (const line of out.split('\n').filter(Boolean)) {
    const [ref, sha, unix] = line.split('\0');
    const remote = ref.startsWith('refs/remotes/');
    const name = ref.replace(/^refs\/(heads|remotes)\//, '');
    const short = remote ? name.replace(/^[^/]+\//, '') : name;
    if (short === 'HEAD' || TRUNKS.has(short)) continue;
    rows.push({ name, short, kind: remote ? 'remote' : 'local', sha, committedAt: Number(unix) * 1000 });
  }
  return rows;
}

/** 中身が base に入っているか。{ merged, via } via: ancestor | tree | pr | null */
function mergedInto(repo, base, branch, { mergedPrTips = new Set() } = {}) {
  if (git(repo, ['merge-base', '--is-ancestor', branch.sha, base], { allowFail: true }).ok) return { merged: true, via: 'ancestor' };
  const mt = git(repo, ['merge-tree', '--write-tree', base, branch.sha], { allowFail: true });
  if (mt.ok) {
    const tree = mt.out.split('\n')[0].trim();
    const baseTree = git(repo, ['rev-parse', `${base}^{tree}`]).out.trim();
    if (tree === baseTree) return { merged: true, via: 'tree' };
  }
  if (mergedPrTips.has(branch.sha)) return { merged: true, via: 'pr' };
  return { merged: false, via: null };
}

/** worktree の一覧（主の作業ツリーを除く）。{ path, branch, head } */
function listWorktrees(repo) {
  const out = git(repo, ['worktree', 'list', '--porcelain']).out;
  const all = out.split('\n\n').filter(Boolean).map((blk) => {
    const f = Object.fromEntries(blk.split('\n').map((l) => [l.split(' ')[0], l.slice(l.indexOf(' ') + 1)]));
    return { path: f.worktree, head: f.HEAD, branch: f.branch ? f.branch.replace(/^refs\/heads\//, '') : null, prunable: 'prunable' in f };
  });
  return all.slice(1);
}

/** worktree の未コミットの変更。{ files: 相対パス[], lastActivity: ms } 変更が無ければ files は空 */
function dirtyState(wtPath) {
  const r = git(wtPath, ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { allowFail: true });
  if (!r.ok) return { files: [], lastActivity: 0, error: r.err };
  const files = [];
  const parts = r.out.split('\0').filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    files.push(entry.slice(3));
    if (entry[0] === 'R' || entry[0] === 'C') i++; // 改名・コピーは元のパスが続く
  }
  let lastActivity = 0;
  for (const f of files) {
    try { lastActivity = Math.max(lastActivity, lstatSync(join(wtPath, f)).mtimeMs); } catch { /* 削除された変更は時刻を持たない */ }
  }
  return { files, lastActivity };
}

/**
 * 3 種類を集める。
 * @param {string} repo リポジトリのパス
 * @param {{ base?: string, days?: number, now?: number, mergedPrTips?: Set<string> }} [opts]
 */
export function analyze(repo, { base: preferred, days = 14, now = Date.now(), mergedPrTips = new Set() } = {}) {
  const base = resolveBase(repo, preferred);
  if (!base) return { inconclusive: 'base ref（origin/develop か develop）が無い' };
  if (!supportsMergeTree(repo)) return { inconclusive: 'git merge-tree --write-tree が使えない（git 2.38 以上が要る）' };
  const cutoff = now - days * DAY_MS;
  const worktrees = listWorktrees(repo);
  const checkedOut = new Map(worktrees.filter((w) => w.branch).map((w) => [w.branch, w.path]));

  const merged = [];
  const stale = [];
  const branches = listBranches(repo);
  for (const b of branches) {
    const m = mergedInto(repo, base, b, { mergedPrTips });
    const row = { name: b.name, kind: b.kind, sha: b.sha.slice(0, 9), committedAt: b.committedAt, ageDays: Math.floor((now - b.committedAt) / DAY_MS), worktree: b.kind === 'local' ? checkedOut.get(b.name) ?? null : null };
    if (m.merged) merged.push({ ...row, via: m.via });
    else if (b.committedAt < cutoff) stale.push(row);
  }

  const idleWorktrees = [];
  let dirtyChecked = 0;
  for (const w of worktrees) {
    if (w.prunable) continue;
    const dirty = dirtyState(w.path);
    if (dirty.error) continue;
    dirtyChecked++;
    if (!dirty.files.length) continue;
    const commitMs = Number(git(w.path, ['log', '-1', '--format=%ct'], { allowFail: true }).out.trim() || 0) * 1000;
    const last = Math.max(commitMs, dirty.lastActivity);
    if (last < cutoff) idleWorktrees.push({ path: w.path, branch: w.branch, dirtyFiles: dirty.files.length, ageDays: Math.floor((now - last) / DAY_MS) });
  }

  return {
    base, days,
    counts: { local: branches.filter((b) => b.kind === 'local').length, remote: branches.filter((b) => b.kind === 'remote').length, worktrees: worktrees.length, worktreesChecked: dirtyChecked },
    merged, stale, idleWorktrees,
  };
}

/** gh でマージ済み PR の最終コミット（headRefOid）を集める。取れなければ { tips: 空, error } */
export function fetchMergedPrTips(repo, { limit = 500 } = {}) {
  try {
    const out = execFileSync('gh', ['pr', 'list', '--state', 'merged', '--limit', String(limit), '--json', 'headRefOid'], { cwd: repo, encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'] });
    return { tips: new Set(JSON.parse(out).map((p) => p.headRefOid)), error: null };
  } catch (e) {
    return { tips: new Set(), error: String(e.message).split('\n')[0] };
  }
}
