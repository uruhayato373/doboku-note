// scripts/lib/publish-sync.mjs — video-factory publish / youtube-daily-release が共有する、同期と予約ワークフローの待ち方（DN-1072・DN-1103）。
// 副作用（git・gh）は関数の引数で差し替えられ、tests/publish-sync.test.mjs で固定する。
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { datasetPath } from './datasets.mjs';
import { serializeDriveManifest } from './drive-vault.mjs';

export const DRIVE_MANIFEST_REL = datasetPath('state.drive-manifest');
export const PUBLISH_WORKFLOW = 'youtube-single-publish.yml';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** 追跡中のファイルに未コミットの変更が無いこと。あれば何もしないうちに止める（転送や commit の後で止めない・DN-1103） */
export function assertCleanTree(root, { git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }) } = {}) {
  const dirty = git('status', '--porcelain', '--untracked-files=no').split('\n').filter(Boolean);
  if (dirty.length) throw new Error(`作業ツリーに未コミットの変更がある（${dirty.length} 件）。commit するか別の作業ツリーで回す: ${dirty.slice(0, 5).map((l) => l.trim()).join(' / ')}`);
}

/**
 * drive-manifest の 3 方向マージ。両側が項目を足しただけなら両方を残す。
 * 同じキーを両側が別の値に変えた場合・ヘッダ（version・note）が両側で食い違う場合は解かずに例外にする。
 * 返すのは serializeDriveManifest で書ける形。
 */
export function mergeDriveManifests(base, ours, theirs) {
  const conflicts = [];
  const pick = (key, b, o, t) => {
    if (same(o, t)) return o;
    if (same(o, b)) return t;
    if (same(t, b)) return o;
    conflicts.push(key);
    return o;
  };
  const baseEntries = base?.entries ?? {};
  const entries = {};
  // 取り込む側（theirs）の並びを土台にして、足された項目を後ろへ
  for (const key of [...Object.keys(theirs?.entries ?? {}), ...Object.keys(ours?.entries ?? {})]) {
    if (key in entries) continue;
    const merged = pick(key, baseEntries[key], ours?.entries?.[key], theirs?.entries?.[key]);
    if (merged !== undefined) entries[key] = merged;
  }
  const head = {};
  for (const key of new Set([...Object.keys(base ?? {}), ...Object.keys(ours ?? {}), ...Object.keys(theirs ?? {})])) {
    if (key === 'entries') continue;
    const v = pick(`header:${key}`, base?.[key], ours?.[key], theirs?.[key]);
    if (v !== undefined) head[key] = v;
  }
  if (conflicts.length) throw new Error(`drive-manifest が同じキーで食い違う: ${conflicts.slice(0, 5).join(', ')}${conflicts.length > 5 ? ` ほか ${conflicts.length - 5} 件` : ''}`);
  return { ...head, entries };
}

/**
 * `git pull --rebase` を行い、drive-manifest だけが競合したときは両側を残して解いて続ける。
 * それ以外の競合・同じキーの食い違いは rebase を中断せず例外にする（手で解くため状態を残す）。
 */
export function pullRebaseResolvingManifest(root, { remote = 'origin', branch = 'develop', git } = {}) {
  const run = git ?? ((args, opts = {}) => spawnSync('git', args, { cwd: root, encoding: 'utf8', ...opts }));
  const out = (r) => `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  const first = run(['pull', '--rebase', remote, branch]);
  if (first.status === 0) return { resolved: 0 };
  let resolved = 0;
  for (let step = 0; step < 50; step++) {
    const files = run(['diff', '--name-only', '--diff-filter=U']).stdout.split('\n').filter(Boolean);
    if (!files.length) throw new Error(`git pull --rebase が失敗: ${out(first).slice(0, 600)}`);
    if (files.length !== 1 || files[0] !== DRIVE_MANIFEST_REL) throw new Error(`drive-manifest 以外が競合している: ${files.join(', ')}`);
    const stage = (n) => {
      const r = run(['show', `:${n}:${DRIVE_MANIFEST_REL}`]);
      return r.status === 0 ? JSON.parse(r.stdout) : null;
    };
    // rebase 中の :2 は取り込む側（upstream）、:3 は積み直す自分のコミット
    const merged = mergeDriveManifests(stage(1), stage(3), stage(2));
    writeFileSync(join(root, DRIVE_MANIFEST_REL), serializeDriveManifest(merged));
    run(['add', '--', DRIVE_MANIFEST_REL]);
    resolved += 1;
    const next = run(['-c', 'core.editor=true', 'rebase', '--continue']);
    if (next.status === 0) return { resolved };
  }
  throw new Error('rebase が終わらない（競合の解消を 50 回繰り返した）');
}

/** gh run list の結果（新しい順）から、控えた id より新しい run を選ぶ。無ければ null */
export function pickNewerRun(runs, beforeId) {
  const newer = runs.filter((r) => Number(r.databaseId) > Number(beforeId ?? 0));
  return newer.length ? newer.reduce((a, b) => (Number(a.databaseId) > Number(b.databaseId) ? a : b)) : null;
}

const defaultGh = (root) => (args, opts = {}) => execFileSync('gh', args, { cwd: root, encoding: 'utf8', ...opts });

const listRuns = (gh) => JSON.parse(gh(['run', 'list', '--workflow', PUBLISH_WORKFLOW, '--limit', '20', '--json', 'databaseId']) || '[]');

/**
 * publish を 1 本流して、その run の完了を待つ。dispatch の前に最新の run id を控え、それより新しい run を待つ
 * （登録が遅れると直前の完了済みの run を見て次を流していた・DN-1072）。run が現れなければ例外。
 * 戻り値は { run, status }。status が 0 以外は run の失敗（呼び出し側が扱う）。
 */
export function dispatchAndWatch(root, { pub, digest, gh = defaultGh(root), sleep = (s) => spawnSync('sleep', [String(s)]), attempts = 30, watch } = {}) {
  const before = listRuns(gh).reduce((m, r) => Math.max(m, Number(r.databaseId)), 0);
  gh(['workflow', 'run', PUBLISH_WORKFLOW, '--ref', 'develop', '-f', 'mode=publish', '-f', `publication=${pub}`, '-f', `expect=${digest}`], { stdio: 'inherit' });
  let run = null;
  for (let i = 0; i < attempts && !run; i++) {
    sleep(i === 0 ? 8 : 4);
    run = pickNewerRun(listRuns(gh), before);
  }
  if (!run) throw new Error(`${pub}: 投稿のワークフローの run が現れない（dispatch 前の最新 ${before}）`);
  const id = String(run.databaseId);
  const watched = (watch ?? ((rid) => spawnSync('gh', ['run', 'watch', rid, '--exit-status', '--interval', '15'], { cwd: root, stdio: 'ignore' })))(id);
  return { run: id, status: watched.status };
}
