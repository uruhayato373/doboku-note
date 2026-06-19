#!/usr/bin/env node
/**
 * 本番 sitemap（sitemap index 対応）から全ページ URL を抽出し、1 行ずつ stdout に出力する。
 *
 * 用途: URL Inspection API（inspect-url.mjs --file）の対象リスト生成。
 *       「sitemap に申告した URL のうち、何件が実際に index されているか」を測るための母集合を作る。
 *
 * creds 不要（公開 sitemap を読むだけ）。Node 20+ の global fetch を使用。
 *
 * Usage:
 *   node .claude/scripts/list-sitemap-urls.mjs > .tmp/all-urls.txt
 *   SITEMAP_ROOT=https://example.com/sitemap.xml node .claude/scripts/list-sitemap-urls.mjs
 */

const ROOT = process.env.SITEMAP_ROOT || "https://doboku-note.com/sitemap.xml";

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "doboku-note-index-audit/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function extractLocs(xml) {
  const locs = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) locs.push(m[1].trim());
  return locs;
}

const isSitemap = (u) => /sitemap/i.test(u);

const pages = new Set();
const rootXml = await fetchText(ROOT);
const topLocs = extractLocs(rootXml);
const childSitemaps = topLocs.filter((u) => isSitemap(u) && u !== ROOT);

// 子 sitemap を 1 階層だけ展開（doboku-note は混在型: root に直接ページ + sitemap-keywords 子）
for (const sm of childSitemaps) {
  try {
    const xml = await fetchText(sm);
    for (const u of extractLocs(xml)) if (!isSitemap(u)) pages.add(u);
  } catch (e) {
    process.stderr.write(`WARN child sitemap failed ${sm}: ${e.message}\n`);
  }
}
// root に直接並ぶページ URL（子 sitemap 参照以外）も取り込む
for (const u of topLocs) if (!isSitemap(u)) pages.add(u);

const out = [...pages].sort();
process.stderr.write(
  `extracted ${out.length} page URLs from ${ROOT} (${childSitemaps.length} child sitemaps)\n`,
);
process.stdout.write(out.join("\n") + "\n");
