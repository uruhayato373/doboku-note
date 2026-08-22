import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, relative } from 'path';
import matter from 'gray-matter';
import { loadGitDates, lookupGitDates } from '../.claude/scripts/lib/git-dates.mjs';
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const SITE_URL = 'https://doboku-note.com';
const SITE_TITLE = 'doboku-note - 土木系資格試験 専門技術ノート';
const SITE_DESCRIPTION =
  '1級土木施工管理技士・技術士（総合技術監理部門）の試験対策サイト。体系的な技術解説と過去問で合格をサポート。';
const SITE_LANGUAGE = 'ja';
const FEED_AUTHOR = 'doboku-note';
const FEED_AUTHOR_EMAIL = 'admin@doboku-note.com';
const MAX_ITEMS = 50;
const OUT_DIR = 'out';
const POSTS_DIR = SITE_CONTENT_ROOT;
const REDIRECTS_FILE = join('public', '_redirects');

// _redirects から 301 ソース側の /docs/{slug} を抽出（generate-sitemap.mjs と同じロジック）
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
    const m = from.match(/^\/docs\/([^/*]+)$/);
    if (m) excluded.add(m[1]);
  }
  return excluded;
}

function resolveDate(data, fullPath, gitDates, key) {
  if (key === 'modified') {
    const relPath = relative(process.cwd(), fullPath);
    const gd = lookupGitDates(gitDates, relPath);
    if (gd?.dateModified) {
      const d = new Date(gd.dateModified);
      if (!isNaN(d.getTime())) return d;
    }
  }
  const candidates =
    key === 'published'
      ? [data.publishedAt, data.created, data.dateModified, data.updated]
      : [data.dateModified, data.updated, data.publishedAt, data.created];
  for (const c of candidates) {
    if (c == null) continue;
    const d = new Date(typeof c === 'string' ? c : String(c));
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

function walkMdxFiles(dir, gitDates, segments = [], results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMdxFiles(full, gitDates, [...segments, entry.name], results);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.mdx')) continue;

    const baseName = entry.name.replace(/\.mdx$/, '');
    const slugParts = baseName === 'article' ? segments : [...segments, baseName];
    if (slugParts.length === 0) continue;
    const slug = slugParts.join('-');

    const fileContents = readFileSync(full, 'utf8');
    const { data } = matter(fileContents);

    if (data.published === false) continue;
    if (!data.title) continue;

    results.push({
      slug,
      title: data.title,
      description: data.description || '',
      category: data.category || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      pubDate: resolveDate(data, full, gitDates, 'published'),
      updatedDate: resolveDate(data, full, gitDates, 'modified'),
    });
  }
  return results;
}

// XML の特殊文字エスケープ
function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// RFC 822 形式（RSS 2.0 の pubDate 用）
function toRfc822(date) {
  return date.toUTCString();
}

// ISO 8601 形式（Atom 1.0 の updated 用）
function toIso8601(date) {
  return date.toISOString();
}

function buildRss(items, lastBuildDate) {
  const itemsXml = items
    .map((it) => {
      const url = `${SITE_URL}/docs/${it.slug}`;
      const categoryXml = it.tags.map((t) => `    <category>${escapeXml(t)}</category>`).join('\n');
      return `  <item>
    <title>${escapeXml(it.title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <description>${escapeXml(it.description)}</description>
    <pubDate>${toRfc822(it.pubDate)}</pubDate>
${categoryXml}
  </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(SITE_TITLE)}</title>
  <link>${SITE_URL}</link>
  <description>${escapeXml(SITE_DESCRIPTION)}</description>
  <language>${SITE_LANGUAGE}</language>
  <lastBuildDate>${toRfc822(lastBuildDate)}</lastBuildDate>
  <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
</channel>
</rss>
`;
}

function buildAtom(items, lastBuildDate) {
  const entriesXml = items
    .map((it) => {
      const url = `${SITE_URL}/docs/${it.slug}`;
      const categoryXml = it.tags
        .map((t) => `    <category term="${escapeXml(t)}" />`)
        .join('\n');
      return `  <entry>
    <title>${escapeXml(it.title)}</title>
    <link href="${url}" />
    <id>${url}</id>
    <published>${toIso8601(it.pubDate)}</published>
    <updated>${toIso8601(it.updatedDate)}</updated>
    <summary>${escapeXml(it.description)}</summary>
${categoryXml}
  </entry>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${SITE_LANGUAGE}">
  <title>${escapeXml(SITE_TITLE)}</title>
  <subtitle>${escapeXml(SITE_DESCRIPTION)}</subtitle>
  <link href="${SITE_URL}/atom.xml" rel="self" />
  <link href="${SITE_URL}" />
  <id>${SITE_URL}/</id>
  <updated>${toIso8601(lastBuildDate)}</updated>
  <author>
    <name>${escapeXml(FEED_AUTHOR)}</name>
    <email>${escapeXml(FEED_AUTHOR_EMAIL)}</email>
  </author>
${entriesXml}
</feed>
`;
}

// ---- メイン ---------------------------------------------------------

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const excludedSlugs = parseRedirectedDocSlugs();
const gitDates = loadGitDates();
console.log(`[rss] git-dates: ${gitDates.size} ファイルを解析`);

const allDocs = walkMdxFiles(POSTS_DIR, gitDates).filter((d) => !excludedSlugs.has(d.slug));

// 更新日降順でソートして上位 MAX_ITEMS 件
allDocs.sort((a, b) => b.updatedDate.getTime() - a.updatedDate.getTime());
const items = allDocs.slice(0, MAX_ITEMS);

const lastBuildDate = items[0]?.updatedDate || new Date();

writeFileSync(join(OUT_DIR, 'feed.xml'), buildRss(items, lastBuildDate));
writeFileSync(join(OUT_DIR, 'atom.xml'), buildAtom(items, lastBuildDate));

console.log(`✅ Generated feed.xml + atom.xml with ${items.length} items (of ${allDocs.length} published)`);
console.log(`   latest: ${items[0]?.title || '(none)'} (${items[0]?.updatedDate.toISOString().slice(0, 10)})`);
