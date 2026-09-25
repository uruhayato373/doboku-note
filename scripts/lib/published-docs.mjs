/**
 * published-docs.mjs — content/site の MDX から公開記事の slug と frontmatter を集める（索引の真実源）。
 *
 * src/config/doc-meta-index.json はこの結果を正規化して書き出した生成物で、git 管理外。
 * ローカルの索引は MDX の追加・削除に追随しないので、「公開記事の集合」を検査するテストは
 * 索引ではなくこの関数で MDX を直接読む（2026-09-25: 古い索引で public-route-redirects が
 * redirect=1261 / docs=1259 と偽の赤を出した）。
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import matter from 'gray-matter';

const SITE_CONTENT_ROOT = 'content/site';

function walkMdx(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMdx(p));
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.mdx') {
      out.push(p);
    }
  }
  return out;
}

// Convention A: `content/site/<cat>/dir/file.mdx` → `<cat>-dir-file`
// Convention B: `content/site/<cat>/dir/article.mdx` → `<cat>-dir`
function toDocSlug(filePath, postsRoot) {
  const rel = relative(postsRoot, filePath);
  const withoutExt = rel.replace(/\.mdx$/i, '');
  const parts = withoutExt.split(/[\\/]/).filter((s) => s && s !== 'article');
  return parts.join('-');
}

/**
 * `published: false` と frontmatter のパース失敗を除いた記事を返す。
 * total は走査した MDX 数、unpublished は published: false で除外した数。
 */
export function collectPublishedDocs(root = process.cwd()) {
  const postsRoot = join(root, SITE_CONTENT_ROOT);
  const files = walkMdx(postsRoot);
  const docs = [];
  let unpublished = 0;
  for (const filePath of files) {
    let data;
    try {
      data = matter(readFileSync(filePath, 'utf8')).data || {};
    } catch (e) {
      console.error(`[published-docs] skip (parse error): ${filePath} ${e.message}`);
      continue;
    }
    if (data.published === false) {
      unpublished++;
      continue;
    }
    docs.push({ slug: toDocSlug(filePath, postsRoot), filePath, data });
  }
  return { total: files.length, unpublished, docs };
}
