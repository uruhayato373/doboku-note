/**
 * 書籍の網羅で「展開済み」と数えるコミットを引く（audit-reference-book-coverage の要約が使う）。
 *
 * 数えるのは、コミットの本文に `Book-Coverage: <書籍 id>`（複数は「,」区切り）の trailer を書いたものだけ。
 * 判定日以降に記事を変えたコミットを全部数えると、別の作業の変更まで「展開済み」になる（2026-10-08）。
 * since（判定したときの HEAD）を渡すと、それより後のコミットだけを数える。判定し直す前の展開を、
 * 新しい計画の展開として数えないため（DN-0659。2026-10-10 に concrete-basics-5th が「展開中 5/9」と出た）。
 */
import { execFileSync } from 'node:child_process';

/** HEAD の SHA（判定したときの基準にする） */
export const headSha = (root) => execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

/**
 * その書籍からの展開として、そのディレクトリを変えたコミット（新しい順・短い SHA）。
 * @param {{ root: string, dir: string, sourceId: string, since?: string | null }} o
 *   dir はリポジトリ相対（末尾 /）。since があれば `<since>..HEAD` に絞る
 * @returns {string[]}
 */
export function expansionCommits({ root, dir, sourceId, since = null }) {
  const range = since ? [`${since}..HEAD`] : [];
  const out = execFileSync('git', ['-C', root, 'log', ...range, '--grep=^Book-Coverage:', '--format=%h%x00%B%x01', '--', dir], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return out.split('\x01').map((x) => x.trim()).filter(Boolean).flatMap((x) => {
    const [hash, body = ''] = x.split('\0');
    const ids = [...body.matchAll(/^Book-Coverage:\s*(.+)$/gm)].flatMap((m) => m[1].split(',').map((t) => t.trim()));
    return ids.includes(sourceId) ? [hash] : [];
  });
}
