// mdx-files.mjs — MDX 記事ファイルの列挙を 1 か所にまとめる（DN-0694・2026-10-11）。
//
// なぜ要るか: content/site の .mdx を列挙する関数（collectMdx・findMdx・listArticles …）が 41 ファイルに 38 定義あり、
// img/ を飛ばすか・article.mdx だけか・隠しディレクトリを見るかがファイルごとに違っていた。新しく列挙するときは
// ここから import する（tests/script-helpers-ratchet.test.mjs の mdxWalk が各自の定義の数を増やさない）。
// 既存の定義は 1 本ずつここへ寄せる。
import { listFiles } from './fs-walk.mjs';
import { SITE_CONTENT_ROOT } from './repository-paths.mjs';

/**
 * content/site 配下の .mdx の絶対パス。img/ と隠しディレクトリには入らない。
 * @param {object} [opts]
 * @param {string} [opts.dir] 起点（既定 content/site。カテゴリ 1 つに絞るときはそのディレクトリ）
 * @param {boolean} [opts.articleOnly] Convention B の article.mdx だけにする
 * @param {boolean} [opts.allowMissing] dir が無いとき [] を返す（既定は投げる＝「無い」と「0 件」を混ぜない）
 * @returns {string[]}
 */
export function listSiteMdx({ dir = SITE_CONTENT_ROOT, articleOnly = false, allowMissing = false } = {}) {
  return listFiles(dir, {
    ext: '.mdx',
    skipDir: (_path, name) => name === 'img' || name.startsWith('.'),
    match: articleOnly ? (_path, name) => name === 'article.mdx' : undefined,
    allowMissing,
  });
}
