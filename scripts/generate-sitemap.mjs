import { readdirSync, statSync, readFileSync, existsSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const SITE_URL = 'https://doboku-note.com';
const OUT_DIR = 'out';
const POSTS_DIR = join('.local', 'r2', 'posts');

// ---- MDXフロントマターから日付を抽出 --------------------------------

function parseFrontmatterDate(content) {
  const fm = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';

  // 優先順位: created > publishedAt > date created > date modified
  const patterns = [
    /^created:\s*['"]?(.+?)['"]?\s*$/m,
    /^publishedAt:\s*['"]?(.+?)['"]?\s*$/m,
    /^date created:\s*['"]?(.+?)['"]?\s*$/m,
    /^date modified:\s*['"]?(.+?)['"]?\s*$/m,
  ];

  for (const re of patterns) {
    const m = fm.match(re);
    if (m) {
      const d = new Date(m[1].trim());
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

// slug → lastmod のマップをMDXから構築
function buildDateMap(postsDir) {
  const map = new Map();
  if (!existsSync(postsDir)) return map;

  function walk(dir, segments = []) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full, [...segments, entry]);
      } else if (entry.endsWith('.mdx')) {
        const baseName = entry.replace(/\.mdx$/, '');
        const slugParts = baseName === 'article' ? segments : [...segments, baseName];
        const slug = slugParts.join('-');
        const content = readFileSync(full, 'utf8');
        const date = parseFrontmatterDate(content) ?? stat.mtime;
        map.set(slug, date);
      }
    }
  }

  walk(postsDir);
  return map;
}

// ---- priority / changefreq ロジック ---------------------------------

function getUrlMeta(urlPath, slug) {
  if (urlPath === '/') {
    return { priority: '1.0', changefreq: 'weekly' };
  }
  if (urlPath === '/about' || urlPath === '/privacy') {
    return { priority: '0.3', changefreq: 'yearly' };
  }
  if (urlPath.startsWith('/category/')) {
    return { priority: '0.9', changefreq: 'weekly' };
  }
  if (urlPath === '/search') {
    return null; // サイトマップから除外
  }

  // /docs/ 配下はslugパターンで分類
  if (slug) {
    // 試験ガイド・テキスト（最重要コンテンツ）
    if (slug.includes('-guide-') || slug.includes('-textbook-')) {
      return { priority: '0.8', changefreq: 'monthly' };
    }
    // 過去問（内容変化なし）
    if (
      slug.includes('-primary-') ||
      slug.includes('-secondary-') ||
      /-(r|h)\d+-(primary|secondary|a|b)$/.test(slug)
    ) {
      return { priority: '0.7', changefreq: 'yearly' };
    }
    // PEセクション別解説
    if (slug.includes('section-')) {
      return { priority: '0.7', changefreq: 'monthly' };
    }
    // PE過去問
    if (/pe-comprehensive-management-r\d+-(primary|secondary)/.test(slug)) {
      return { priority: '0.7', changefreq: 'yearly' };
    }
    // キーワード2026全文
    if (slug.includes('keyword-2026')) {
      return { priority: '0.7', changefreq: 'yearly' };
    }
  }

  // その他（キーワードページ等）
  return { priority: '0.6', changefreq: 'yearly' };
}

// ---- HTMLファイル収集 -----------------------------------------------

function collectHtmlFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry.startsWith('_') || entry === 'content') continue;
      collectHtmlFiles(fullPath, files);
    } else if (entry.endsWith('.html') && entry !== '404.html') {
      files.push({ path: fullPath, mtime: stat.mtime });
    }
  }
  return files;
}

// ---- メイン ---------------------------------------------------------

const dateMap = buildDateMap(POSTS_DIR);
const files = collectHtmlFiles(OUT_DIR);

const urls = files.map(({ path, mtime }) => {
  let urlPath = '/' + relative(OUT_DIR, path).replace(/\.html$/, '').replace(/\/index$/, '');
  if (urlPath === '/index') urlPath = '/';
  if (urlPath === '/_not-found') return null;

  // slugを抽出（/docs/{slug} → slug）
  const slug = urlPath.startsWith('/docs/') ? urlPath.slice('/docs/'.length) : null;

  const meta = getUrlMeta(urlPath, slug);
  if (!meta) return null; // 除外ページ

  // lastmod: MDXの日付 > HTMLのmtime（ビルド時刻）
  const lastmod = (slug && dateMap.get(slug)) ?? mtime;

  return { loc: `${SITE_URL}${urlPath}`, lastmod: lastmod.toISOString(), ...meta };
}).filter(Boolean).sort((a, b) => a.loc.localeCompare(b.loc));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `<url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;

writeFileSync(join(OUT_DIR, 'sitemap.xml'), sitemap);

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
writeFileSync(join(OUT_DIR, 'robots.txt'), robots);

// priority分布のサマリを出力
const pCount = {};
for (const u of urls) pCount[u.priority] = (pCount[u.priority] ?? 0) + 1;
const summary = Object.entries(pCount).sort().map(([p, n]) => `${p}: ${n}件`).join(', ');

console.log(`✅ Generated sitemap.xml with ${urls.length} URLs`);
console.log(`   priority: ${summary}`);
