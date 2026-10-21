/**
 * site-slug — サイト記事のパスから slug を作る単一真実源（DN-0797）。
 *
 * 記事は `content/site/<資格>/<slug>/article.mdx` の 1 形式（tests/content-site-layout.test.mjs）で、slug は
 * `<資格>-<slug>`（区切りを - にしてつなぐ）。サイトの記事一覧（src/lib/local-post-reader.ts）・sitemap・RSS・OGP の
 * 生成と検査・索引づくりが同じ規則を使う。以前は 15 か所に写しがあり、途中のディレクトリ名 article の扱いが
 * 1 か所だけ違っていた。
 */

/**
 * content/site からの相対パス（区切りは / か \）→ slug。末尾の article.mdx はディレクトリ名を slug にする
 * @param {string} rel
 * @returns {string} 直下の article.mdx などで slug にならないときは ''
 */
export function siteSlugFromRel(rel) {
  const parts = String(rel).replace(/\.mdx$/i, '').split(/[\\/]/).filter(Boolean);
  if (parts.at(-1) === 'article') parts.pop();
  return parts.join('-');
}

/**
 * ディレクトリの区切りの配列とファイル名 → slug（走査しながら作る呼び手用）
 * @param {string[]} dirs
 * @param {string} fileName
 */
export function siteSlugFromParts(dirs, fileName) {
  return siteSlugFromRel([...dirs, fileName].join('/'));
}
