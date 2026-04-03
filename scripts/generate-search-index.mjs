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

const files = scanMdxFiles(CONTENT_DIR);
const index = [];

for (const file of files) {
  const raw = readFileSync(file, 'utf-8');
  const { data, content } = matter(raw);

  // Skip unpublished content
  if (data.published === false) continue;

  const relPath = relative(CONTENT_DIR, file).replace(/\\/g, '/').replace(/\.(mdx|md)$/, '');

  // Convert hierarchical path to flat slug
  // E.g., civil-construction-1/guide/strategy.mdx → civil-construction-1-guide-strategy
  const slug = relPath.split('/').join('-');

  // Build URL path for docs (flat structure)
  const urlPath = `/docs/${slug}`;

  const title = data.title || relPath.split('/').pop();
  const category = data.category || relPath.split('/')[0];
  const tags = data.tags || [];
  const stripped = stripMdx(content);
  const preview = stripped.slice(0, 200);

  index.push({
    title,
    path: urlPath,
    category,
    tags,
    preview,
  });
}

// Ensure public directory exists
if (!existsSync('public')) {
  mkdirSync('public', { recursive: true });
}

writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 0));
console.log(`Generated search index with ${index.length} entries`);
