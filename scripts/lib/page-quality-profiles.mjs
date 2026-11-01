// page-quality-profiles.mjs — ページの種類ごとの採点プロファイル（config/page-quality-profiles.json）の分類と指標（DN-0936）。
//
// 種類は MDX 記事なら領域（categories.json の area）× 記事型（frontmatter の group）、基準書は置き場とファイル名で決める。
// 指標はどれも本文の文字列だけから数える（LLM を使わない L0 の棚卸し）。読み手は scripts/page-quality-inventory.mjs。

/**
 * @param {Array<{id:string, match:{area?:string, groups?:string[], paths?:string[], file?:string}}>} profiles
 * @param {{rel:string, area?:string|null, group?:string|null}} page rel はリポジトリ相対（/ 区切り）
 * @returns {string[]} 当たったプロファイルの id（ちょうど 1 つが正常）
 */
export function classifyPage(profiles, page) {
  const name = page.rel.split('/').pop();
  return profiles
    .filter(({ match }) => {
      if (match.paths) return match.paths.some((p) => page.rel.startsWith(`${p}/`)) && new RegExp(match.file).test(name);
      return page.area === match.area && match.groups.includes(page.group);
    })
    .map((p) => p.id);
}

const RE_TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const RE_TABLE_CAPTION = /^\s*表\s*[0-9０-９]/;
const RE_FIGURE_CAPTION = /^\s*図\s*[0-9０-９]/;

/** frontmatter を外した本文 */
export function stripFrontmatter(raw) {
  return raw.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

/**
 * 本文（frontmatter を外したもの）の指標。キーは config の metricsVocabulary と同じ。
 * @param {string} body
 */
export function countMetrics(body) {
  const lines = body.split(/\r?\n/);
  let rawTextBlocks = 0;
  let tables = 0;
  let tableCaptions = 0;
  let figureCaptions = 0;
  let h2 = 0;
  for (const line of lines) {
    if (/^```text\s*$/.test(line)) rawTextBlocks += 1;
    if (RE_TABLE_SEPARATOR.test(line)) tables += 1;
    if (RE_TABLE_CAPTION.test(line)) tableCaptions += 1;
    if (RE_FIGURE_CAPTION.test(line)) figureCaptions += 1;
    if (/^## /.test(line)) h2 += 1;
  }
  const images = (body.match(/<ArticleImage\b|<img\b|!\[[^\]]*\]\(/g) ?? []).length;
  const internalLinks = (body.match(/\]\(\/(?!\/)|href=["']\/(?!\/)/g) ?? []).length;
  const prose = body
    .replace(/^```.*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/[#*|<>`_\-[\]\s]/g, ''); // 残った < > も消す（字数を数えるだけで HTML は出さない）
  return { chars: [...prose].length, h2, images, tables, internalLinks, tableCaptions, figureCaptions, rawTextBlocks };
}

/** 中央値（空は null） */
export function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/**
 * プロファイルの評価役が資格をどこまで覆うか。
 * @returns {{category:string, pages:number, roles:string[]}[]}
 */
export function evaluatorCoverage(profile, pagesByCategory) {
  return Object.entries(pagesByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([category, pages]) => ({
      category,
      pages,
      roles: [...new Set(profile.evaluators.filter((e) => !e.categories || e.categories.includes(category)).map((e) => e.role))],
    }));
}
