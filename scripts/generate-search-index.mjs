import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, relative } from 'path';
import matter from 'gray-matter';

const CONTENT_DIR = 'content';
const OUTPUT_PATH = join('public', 'search-index.json');

function scanMdxFiles(dir, files = []) {
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

  // Skip draft content
  if (data.draft) continue;

  const relPath = relative(CONTENT_DIR, file).replace(/\\/g, '/').replace(/\.(mdx|md)$/, '');

  // Build URL path
  const parts = relPath.split('/');
  const urlPath =
    parts[parts.length - 1] === 'index'
      ? '/docs/' + parts.slice(0, -1).join('/')
      : '/docs/' + relPath;

  const title = data.title || parts[parts.length - 1];
  const stripped = stripMdx(content);
  const preview = stripped.slice(0, 200);

  index.push({
    title,
    path: urlPath,
    preview,
  });
}

// Ensure public directory exists
if (!existsSync('public')) {
  mkdirSync('public', { recursive: true });
}

writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 0));
console.log(`Generated search index with ${index.length} entries`);
