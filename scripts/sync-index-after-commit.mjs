#!/usr/bin/env node
// post-commit: pathspec commit（git commit -- <path>）の後に index へ残る古い版を HEAD に揃える。
//
// git は --only の commit（pathspec 指定）で、一時 index に pre-commit を掛けて commit し、本物の index には
// フック前の内容を書く。pre-commit が書き換えて stage した内容（backfill-mdx-dates の dateModified など）は
// commit と作業ツリーには入るが、本物の index には入らない。index にだけ古い版が残って git status が MM を出し、
// 次に index のまま commit すると更新日が黙って戻る（2026-10-06 に実測）。CLAUDE.md §10 は並行セッション対策で
// pathspec commit を勧めているので、ここで機械的に直す。
//
// 対象は今 commit したファイルのうち「作業ツリー＝HEAD なのに index だけ違う」ものだけ。作業ツリーに未 commit の
// 変更があるファイル・index にしか無い変更（別セッションが stage したもの）には触らない。失敗しても commit は止めない。
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const git = (args, input) =>
  execFileSync('git', args, { encoding: 'utf8', input, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'ignore'] });

// 大きな commit（OGP 数百件など）で引数長の上限を超えないよう、パスは分けて渡す
const chunked = (paths, run) => {
  let out = '';
  for (let i = 0; i < paths.length; i += 400) out += run(paths.slice(i, i + 400));
  return out;
};

/** @returns {string[]} index だけが HEAD と食い違うパス */
export function staleIndexPaths() {
  const paths = git(['diff-tree', '--no-commit-id', '--name-only', '-r', '-z', 'HEAD']).split('\0').filter(Boolean);
  if (paths.length === 0) return [];
  // ls-tree: "<mode> blob <sha>\t<path>"・ls-files -s: "<mode> <sha> <stage>\t<path>"（-z で NUL 区切り）
  const blobs = (out, field) =>
    new Map(
      out
        .split('\0')
        .filter(Boolean)
        .map((rec) => {
          const tab = rec.indexOf('\t');
          return [rec.slice(tab + 1), rec.slice(0, tab).split(' ')[field]];
        }),
    );
  const head = blobs(chunked(paths, (ps) => git(['ls-tree', '-r', '-z', 'HEAD', '--', ...ps])), 2);
  const index = blobs(chunked(paths, (ps) => git(['ls-files', '-s', '-z', '--', ...ps])), 1);
  const candidates = paths.filter((p) => head.has(p) && index.has(p) && head.get(p) !== index.get(p) && existsSync(p));
  if (candidates.length === 0) return [];
  const worktree = git(['hash-object', '--stdin-paths'], candidates.join('\n') + '\n').trim().split('\n');
  return candidates.filter((p, i) => worktree[i] === head.get(p));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const stale = staleIndexPaths();
    if (stale.length > 0) {
      chunked(stale, (ps) => git(['reset', '-q', '--', ...ps]));
      console.log(`[post-commit] index を HEAD に揃えた ${stale.length} 件（pre-commit が書き換えた内容が index に入っていなかった）`);
    }
  } catch (e) {
    console.error(`[post-commit] index の同期を飛ばした: ${e.message.split('\n')[0]}`);
  }
}
