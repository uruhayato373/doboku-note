/**
 * fs-walk.mjs — ディレクトリ以下のファイルを再帰で列挙する共通部品（依存ゼロ）。
 *
 * なぜ要るか: 同じ「再帰で走査して条件に合うファイルを集める」関数を 140 を超えるファイルが
 * それぞれ書いていた（`walk`・`walkMdx`・`walkFiles` …）。無いディレクトリで黙って空を返すもの・
 * 落ちるもの、隠しディレクトリを飛ばすもの・飛ばさないものが混ざり、読むたびに中身を確かめる必要があった。
 * 新しく走査を書くときはここから import する（tests/fs-walk-ratchet.test.mjs が各自の定義の数を増やさない）。
 *
 * 順序: readdirSync が返す順の深さ優先（ディレクトリに出会ったらその場で中へ入る）。並びを決めたいときは呼び手が sort する。
 * 依存ゼロに保つ: npm ci をしないワークフローが（間接にも）読む（tests/workflow-zero-dependency.test.mjs）。
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * dir 以下のファイルの絶対パス（dir が相対なら dir 起点のパス）を返す。
 *
 * @param {string} dir 走査の起点
 * @param {object} [opts]
 * @param {string | string[]} [opts.ext] 拡張子（例 '.mdx'・['.md', '.mdx']）。名前の末尾で比べる（大文字小文字は区別する）
 * @param {(path: string, name: string) => boolean} [opts.match] 集めるファイルの条件（ext と両方あれば両方を満たすもの）
 * @param {(path: string, name: string) => boolean} [opts.skipDir] 中へ入らないディレクトリ
 * @param {boolean} [opts.allowMissing] dir が無いとき [] を返す（既定は投げる＝「無い」と「0 件」を混ぜない）
 * @param {boolean} [opts.followLinks] statSync で判定する（シンボリックリンク先のディレクトリにも入る）。既定は Dirent で判定し、リンクには入らない
 * @param {number} [opts.maxDepth] 入る深さの上限（0 = dir 直下のファイルだけ）
 * @returns {string[]}
 */
export function listFiles(dir, { ext, match, skipDir, allowMissing = false, followLinks = false, maxDepth = Infinity } = {}) {
  if (allowMissing && !existsSync(dir)) return [];
  const exts = ext === undefined ? null : [ext].flat();
  const wanted = (path, name) => (!exts || exts.some((e) => name.endsWith(e))) && (!match || match(path, name));
  const out = [];
  const visit = (current, depth) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      const isDir = followLinks ? statSync(path).isDirectory() : entry.isDirectory();
      if (isDir) {
        if (depth < maxDepth && !(skipDir && skipDir(path, entry.name))) visit(path, depth + 1);
      } else if ((followLinks || entry.isFile()) && wanted(path, entry.name)) {
        out.push(path);
      }
    }
  };
  visit(dir, 0);
  return out;
}

/** 隠しディレクトリ（. で始まる）と node_modules に入らない skipDir */
export const skipHiddenAndNodeModules = (_path, name) => name.startsWith('.') || name === 'node_modules';
