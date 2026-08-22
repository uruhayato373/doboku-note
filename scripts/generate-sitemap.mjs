import { readdirSync, statSync, readFileSync, existsSync, writeFileSync } from 'fs';
import { join, relative, sep } from 'path';
import matter from 'gray-matter';
import { loadGitDates, lookupGitDates } from '../.claude/scripts/lib/git-dates.mjs';
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const SITE_URL = 'https://doboku-note.com';
const OUT_DIR = 'out';
const POSTS_DIR = SITE_CONTENT_ROOT;
const REDIRECTS_FILE = join('public', '_redirects');
const CATEGORIES_FILE = join('src', 'config', 'categories.json');
const HIDDEN_CATEGORY_PATHS = new Set(
  JSON.parse(readFileSync(CATEGORIES_FILE, 'utf8'))
    .filter((category) => category.visible === false)
    .map((category) => `/category/${category.slug}`),
);

// ---- _redirects から 301 ソース側の /docs/{slug} を抽出 -------------
// Cloudflare Pages は物理ファイルを _redirects より優先するため、
// sitemap には「正規側」だけを載せる。
function parseRedirectedDocSlugs() {
  const excluded = new Set();
  if (!existsSync(REDIRECTS_FILE)) return excluded;
  const content = readFileSync(REDIRECTS_FILE, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const from = parts[0];
    // 完全一致の /docs/{slug} のみ除外対象（ワイルドカード除外は元から HTML 存在しない）
    const m = from.match(/^\/docs\/([^/*]+)$/);
    if (m) excluded.add(m[1]);
  }
  return excluded;
}

// ---- lastmod 解決（優先順: frontmatter > git log > mtime） -----------
//
// 2026-08-22 に git と frontmatter の優先順を反転した。lastmod は**公開 SEO 信号**で、
// git log を一次にすると **リネーム・移行・履歴書換えのたびに全ページの lastmod が黙って動く**
// （2026-08-18 の情報アーキテクチャ移行で全 1,084 記事が created まで巻き戻った実績がある）。
// ビルドが全履歴を要求するので shallow clone も履歴の切り詰めもできなくなる副作用もあった。
// frontmatter は pre-commit が commit 時に更新するので、こちらを一次にしてよい。
// git は frontmatter が欠けているときだけの保険で、遅延ロードして通常は履歴に触れない。
function resolveLastmod(data, fullPath, gitDatesLazy) {
  // 1. frontmatter（真実源。commit 時に pre-commit が更新する）
  const candidates = [
    data.dateModified,
    data.updated,
    data.publishedAt,
    data.created,
    data['date modified'],
    data['date created'],
  ];
  for (const c of candidates) {
    if (c == null) continue;
    const d = new Date(typeof c === 'string' ? c : String(c));
    if (!isNaN(d.getTime())) return d;
  }

  // 2. git log（frontmatter に日付が無いときだけ。ここへ来る件数は呼出側が数える）
  const gd = lookupGitDates(gitDatesLazy(), relative(process.cwd(), fullPath));
  if (gd?.dateModified) {
    const d = new Date(gd.dateModified);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. filesystem mtime（最終フォールバック）
  return statSync(fullPath).mtime;
}

// ---- content/site を走査して公開済み slug を列挙 ------------------
// src/lib/docs.ts::findMdxFiles() と同じ命名規約を踏襲:
//   Convention A: {dir}/{file}.mdx → slug = "{dir}-{file}"
//   Convention B: {dir}/article.mdx → slug = "{dir}"
function walkMdxFiles(dir, gitDatesLazy, segments = [], results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMdxFiles(full, gitDatesLazy, [...segments, entry.name], results);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.mdx')) continue;

    const baseName = entry.name.replace(/\.mdx$/, '');
    const slugParts = baseName === 'article' ? segments : [...segments, baseName];
    if (slugParts.length === 0) continue;
    const slug = slugParts.join('-');

    const fileContents = readFileSync(full, 'utf8');
    const { data } = matter(fileContents);

    // src/lib/docs.ts::getDocMeta() と同じ公開フィルタ
    if (data.published === false) continue;

    // noindex:true（幽霊ページ）は検索インデックス対象外なので sitemap からも除外。
    // page.tsx generateMetadata の robots:{index:false} と対応。
    if (data.noindex === true) continue;

    const lastmod = resolveLastmod(data, full, gitDatesLazy);

    results.push({ slug, lastmod, category: data.category });
  }
  return results;
}

// ---- priority / changefreq 割り当て -------------------------------
function getUrlMeta(urlPath, slug) {
  if (urlPath === '/') {
    return { priority: '1.0', changefreq: 'weekly' };
  }
  if (urlPath === '/about' || urlPath === '/privacy' || urlPath === '/terms' || urlPath === '/contact') {
    return { priority: '0.3', changefreq: 'yearly' };
  }
  // visible:false の運用カテゴリ。カテゴリ自体は direct URL で残すが、検索入口にはしない。
  if (HIDDEN_CATEGORY_PATHS.has(urlPath)) {
    return null;
  }
  if (urlPath.startsWith('/category/')) {
    return { priority: '0.9', changefreq: 'weekly' };
  }
  if (urlPath === '/search' || urlPath === '/_not-found') {
    return null;
  }

  if (slug) {
    // Pillar pages: hub topical authority、PE は `-pillar` 末尾、civil は `-guide-` 接頭で識別
    if (slug.endsWith('-pillar') || slug.includes('-guide-') || slug.includes('-textbook-')) {
      return { priority: '0.8', changefreq: 'monthly' };
    }
    if (
      slug.includes('-primary-') ||
      slug.includes('-secondary-') ||
      /-(r|h)\d+-(primary|secondary|a|b)$/.test(slug)
    ) {
      return { priority: '0.7', changefreq: 'yearly' };
    }
    if (slug.includes('section-')) {
      return { priority: '0.7', changefreq: 'monthly' };
    }
    if (/pe-comprehensive-management-r\d+-(primary|secondary)/.test(slug)) {
      return { priority: '0.7', changefreq: 'yearly' };
    }
    if (slug.includes('keyword-2026')) {
      return { priority: '0.7', changefreq: 'yearly' };
    }
  }

  return { priority: '0.6', changefreq: 'yearly' };
}

// ---- /out/ から静的ページ (非 /docs/) のみ収集 -----------------------
// /docs/ は MDX ソース駆動にしたため、古いビルド残骸を sitemap から排除できる。
function collectStaticHtmlFiles(dir, files = [], root = dir) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const name = entry.name;
    if (name.startsWith('_')) continue;
    if (name === 'content' || name === 'docs') continue;
    const full = join(dir, name);
    if (entry.isDirectory()) {
      collectStaticHtmlFiles(full, files, root);
    } else if (entry.isFile() && name.endsWith('.html') && name !== '404.html') {
      files.push({ path: full, mtime: statSync(full).mtime });
    }
  }
  return files;
}

// ---- メイン ---------------------------------------------------------

const excludedSlugs = parseRedirectedDocSlugs();

// git は frontmatter に日付が無いときだけの保険。呼ばれなければ履歴に触れない。
let _gitDates = null;
let gitFallbacks = 0;
const gitDatesLazy = () => {
  if (!_gitDates) {
    console.log('[sitemap] frontmatter に日付が無いファイルがあるため git-dates を読み込む');
    _gitDates = loadGitDates();
  }
  gitFallbacks += 1;
  return _gitDates;
};
const mdxDocs = walkMdxFiles(POSTS_DIR, gitDatesLazy).filter((d) => !excludedSlugs.has(d.slug));
console.log(gitFallbacks === 0
  ? '[sitemap] lastmod はすべて frontmatter から解決（git 履歴に触れていない）'
  : `[sitemap] frontmatter に日付が無く git へフォールバック: ${gitFallbacks} 件`);

const urls = [];

// 静的ページ (/, /about, /contact, /terms, /privacy, /category/*)
for (const { path, mtime } of collectStaticHtmlFiles(OUT_DIR)) {
  // relative() は OS 区切り文字を返す。Windows でそのまま URL にすると
  // <loc>https://doboku-note.com/category\civil-construction-1</loc> のように
  // バックスラッシュが混入する（2026-08-06 実測）。CI は Linux なので本番は無傷だが、
  // `npm run pages:deploy` を Windows から実行すると壊れた sitemap が本番に出る。
  const relUrl = relative(OUT_DIR, path).split(sep).join('/');
  let urlPath = '/' + relUrl.replace(/\.html$/, '').replace(/\/index$/, '');
  if (urlPath === '/index') urlPath = '/';
  const meta = getUrlMeta(urlPath, null);
  if (!meta) continue;
  urls.push({ loc: `${SITE_URL}${urlPath}`, lastmod: mtime.toISOString(), ...meta });
}

// /docs/ は MDX ソースから生成
for (const { slug, lastmod } of mdxDocs) {
  const urlPath = `/docs/${slug}`;
  const meta = getUrlMeta(urlPath, slug);
  if (!meta) continue;
  urls.push({ loc: `${SITE_URL}${urlPath}`, lastmod: lastmod.toISOString(), ...meta });
}

// 重複排除 (loc で一意) + ソート
const seen = new Set();
const unique = [];
for (const u of urls) {
  if (seen.has(u.loc)) continue;
  seen.add(u.loc);
  unique.push(u);
}
unique.sort((a, b) => a.loc.localeCompare(b.loc));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${unique.map((u) => `<url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;

writeFileSync(join(OUT_DIR, 'sitemap.xml'), sitemap);

// AI 学習データ収集クローラー（LLM 用）を全面 disallow。
// 公益的な GoogleBot / Bingbot 等は許可（検索インデックスの正常稼働を維持）。
// 背景: 2026-05 の GA4 で Bing 経由 1,293 users (40%) が engage 21%/bounce 79% の
// 異常パターン示しており、AI クローラー混入が疑われる。
const robots = `# 検索エンジンクローラー（Allow）
User-agent: *
Allow: /

# AI 学習データ収集クローラーは全面 disallow
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: OAI-SearchBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: PerplexityBot
Disallow: /

User-agent: Perplexity-User
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: FacebookBot
Disallow: /

User-agent: Meta-ExternalAgent
Disallow: /

User-agent: Meta-ExternalFetcher
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: Amazonbot
Disallow: /

User-agent: cohere-ai
Disallow: /

User-agent: omgili
Disallow: /

User-agent: DataForSeoBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
writeFileSync(join(OUT_DIR, 'robots.txt'), robots);

// サマリ出力
const pCount = {};
for (const u of unique) pCount[u.priority] = (pCount[u.priority] ?? 0) + 1;
const summary = Object.entries(pCount).sort().map(([p, n]) => `${p}: ${n}件`).join(', ');

console.log(`✅ Generated sitemap.xml with ${unique.length} URLs`);
console.log(`   priority: ${summary}`);
if (excludedSlugs.size > 0) {
  console.log(`   excluded (via _redirects): ${excludedSlugs.size}件 — ${Array.from(excludedSlugs).join(', ')}`);
}
