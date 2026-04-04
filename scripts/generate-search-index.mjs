import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, relative } from 'path';
import matter from 'gray-matter';

// New unified content location
const CONTENT_DIR = '.local/r2/posts';
const OUTPUT_PATH = join('public', 'search-index.json');

function scanMdxFiles(dir, files = []) {
  if (!existsSync(dir)) {
    return files;
  }

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanMdxFiles(fullPath, files);
    } else if (entry.endsWith('.mdx') || entry.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function stripMdx(content) {
  return content
    // Remove import/export statements
    .replace(/^(import|export)\s.+$/gm, '')
    // Remove JSX components
    .replace(/<[A-Z][^>]*\/>/g, '')
    .replace(/<[A-Z][^>]*>[\s\S]*?<\/[A-Z][^>]*>/g, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]*`/g, '')
    // Remove KaTeX blocks
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    // Remove inline math
    .replace(/\$[^$]*\$/g, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove markdown headers markers
    .replace(/^#{1,6}\s/gm, '')
    // Remove bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Collapse whitespace
    .replace(/\n{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert hierarchical path to flat slug.
 * article.mdx is excluded from slug (convention B).
 */
function pathToSlug(relPath) {
  const parts = relPath.replace(/\.(mdx|md)$/, '').split('/');
  // Remove trailing "article" (convention B)
  if (parts[parts.length - 1] === 'article') {
    parts.pop();
  }
  return parts.join('-');
}

const files = scanMdxFiles(CONTENT_DIR);
const index = [];

for (const file of files) {
  const raw = readFileSync(file, 'utf-8');
  const { data, content } = matter(raw);

  // Skip unpublished content
  if (data.published === false) continue;

  const relPath = relative(CONTENT_DIR, file).replace(/\\/g, '/');
  const slug = pathToSlug(relPath);
  const path = `/docs/${slug}`;

  const title = data.title || slug;
  const description = data.description || '';
  const category = data.category || relPath.split('/')[0];
  const tags = data.tags || [];
  const stripped = stripMdx(content);
  const excerpt = stripped.slice(0, 500);

  index.push({
    id: slug,
    title,
    description,
    path,
    category,
    tags,
    excerpt,
  });
}

// Ensure public directory exists
if (!existsSync('public')) {
  mkdirSync('public', { recursive: true });
}

writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 0));
console.log(`Generated search index with ${index.length} entries`);
