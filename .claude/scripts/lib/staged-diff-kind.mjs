/**
 * staged diff から「その commit でページ内容が変わったか」を判定する。
 *
 * なぜ: `dateModified` は sitemap の lastmod になる公開 SEO 信号。タグ付与・sources 結線の
 * ような frontmatter だけの一括 commit で数百ページの lastmod が動くと、Google は lastmod を
 * 信用しなくなり、限られたクロール枠を「変わっていないページの再確認」に使う
 * （2026-09 実測: 2 週間で sitemap 1,556 件中 1,209 件の lastmod が更新扱い）。
 */

const SIGNIFICANT_KEYS = ["title", "seoTitle", "description"];

/** frontmatter の閉じ `---` の行番号（1 始まり）。frontmatter が無ければ 0。 */
export function frontmatterEndLine(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines[0] !== "---") return 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return i + 1;
  }
  return 0;
}

/**
 * @param {string} diffText `git diff --cached -U0 -- <file>` の出力
 * @param {number} fmEndLine 新ファイル側の frontmatter 閉じ行（1 始まり）
 * @returns {"body"|"meta-significant"|"meta-only"|"none"}
 */
export function classifyStagedDiff(diffText, fmEndLine) {
  let touchesBody = false;
  let touchesSignificant = false;
  let hunks = 0;
  const keyRe = new RegExp(`^[+-](${SIGNIFICANT_KEYS.join("|")}):`);
  for (const line of diffText.split(/\r?\n/)) {
    const h = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (h) {
      hunks++;
      const start = Number(h[1]);
      const count = h[2] === undefined ? 1 : Number(h[2]);
      const end = count === 0 ? start : start + count - 1;
      if (fmEndLine === 0 || end > fmEndLine) touchesBody = true;
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (keyRe.test(line)) touchesSignificant = true;
  }
  if (hunks === 0) return "none";
  if (touchesBody) return "body";
  return touchesSignificant ? "meta-significant" : "meta-only";
}
