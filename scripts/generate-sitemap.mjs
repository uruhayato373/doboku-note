import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const SITE_URL = 'https://doboku-note.com';
const OUT_DIR = 'out';

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

const files = collectHtmlFiles(OUT_DIR);

const urls = files.map(({ path, mtime }) => {
  let urlPath = '/' + relative(OUT_DIR, path).replace(/\.html$/, '').replace(/\/index$/, '');
  if (urlPath === '/index') urlPath = '/';
  return { loc: `${SITE_URL}${urlPath}`, lastmod: mtime.toISOString() };
}).sort((a, b) => a.loc.localeCompare(b.loc));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `<url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>`;

writeFileSync(join(OUT_DIR, 'sitemap.xml'), sitemap);

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

writeFileSync(join(OUT_DIR, 'robots.txt'), robots);

console.log(`✅ Generated sitemap.xml with ${urls.length} URLs`);
