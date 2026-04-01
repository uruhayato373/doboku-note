import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { compileMDX } from 'next-mdx-remote/rsc';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import { remarkAdmonition } from './remark-admonition';
import { mdxComponents } from '@/components/content/mdx-components';

const CONTENT_DIR = path.join(process.cwd(), 'content');

/** Draft content is hidden unless SHOW_DRAFTS=true */
function showDrafts(): boolean {
  return process.env.SHOW_DRAFTS === 'true';
}

function isDraft(meta: DocMeta): boolean {
  return meta.draft === true && !showDrafts();
}

export interface SourceMeta {
  title: string;
  author?: string;
  date?: string;
  url?: string;
}

export interface DocMeta {
  title: string;
  description?: string;
  sidebar_position?: number;
  sidebar_label?: string;
  id?: string;
  toc_min_heading_level?: number;
  toc_max_heading_level?: number;
  source?: SourceMeta | SourceMeta[];
  exams?: string[];
  draft?: boolean;
}

export interface DocPage {
  meta: DocMeta;
  slug: string[];
  filePath: string;
  content: string;
}

/**
 * Strip number prefix from filename: "01-common" → "common"
 */
function stripNumberPrefix(name: string): string {
  return name.replace(/^\d+-/, '');
}

/**
 * Get doc ID variants from file path (relative to content dir).
 * Returns both the raw path and the number-prefix-stripped path.
 * e.g. "general/common-specs/01-common.mdx"
 *   → raw: "general/common-specs/01-common"
 *   → stripped: "general/common-specs/common"
 */
function filePathToDocIds(relPath: string): string[] {
  const withoutExt = relPath.replace(/\.mdx$/, '').split(path.sep);
  const raw = withoutExt.join('/');
  const stripped = withoutExt.map(stripNumberPrefix).join('/');
  // Return unique IDs
  return raw === stripped ? [raw] : [raw, stripped];
}

/**
 * Get URL slug from doc ID.
 * "general/common-specs/index" → ["general", "common-specs"]
 * "general/common-specs/common" → ["general", "common-specs", "common"]
 */
function docIdToSlug(docId: string): string[] {
  const parts = docId.split('/');
  if (parts[parts.length - 1] === 'index') {
    return parts.slice(0, -1);
  }
  return parts;
}

/**
 * Scan content directory recursively for all MDX files.
 */
function scanMdxFiles(dir: string, relativeTo: string = dir): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'img') {
      files.push(...scanMdxFiles(fullPath, relativeTo));
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      files.push(path.relative(relativeTo, fullPath));
    }
  }
  return files;
}

// Cache for doc ID → file path mapping
let docIdMap: Map<string, string> | null = null;

/**
 * Build mapping from doc IDs to file paths.
 * Registers both raw filenames and number-prefix-stripped variants
 * so sidebar definitions using either convention will resolve correctly.
 */
function buildDocIdMap(): Map<string, string> {
  if (docIdMap) return docIdMap;

  const map = new Map<string, string>();
  const files = scanMdxFiles(CONTENT_DIR);

  for (const relPath of files) {
    const ids = filePathToDocIds(relPath);
    for (const id of ids) {
      // Don't overwrite if already registered (first match wins)
      if (!map.has(id)) {
        map.set(id, relPath);
      }
    }
  }

  docIdMap = map;
  return map;
}

/**
 * Get all doc pages with metadata (deduplicated by file path).
 */
export function getAllDocs(): DocPage[] {
  const map = buildDocIdMap();
  const docs: DocPage[] = [];
  const seenFiles = new Set<string>();

  for (const [docId, relPath] of map) {
    if (seenFiles.has(relPath)) continue;
    seenFiles.add(relPath);

    const fullPath = path.join(CONTENT_DIR, relPath);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const { data } = matter(raw);

    const meta = data as DocMeta;
    if (isDraft(meta)) continue;

    docs.push({
      meta,
      slug: docIdToSlug(docId),
      filePath: relPath,
      content: raw,
    });
  }

  return docs;
}

/**
 * Get all possible slugs for generateStaticParams.
 * Deduplicated by file path — each file produces exactly one slug.
 */
export function getAllSlugs(): string[][] {
  const map = buildDocIdMap();
  const seenFiles = new Set<string>();
  const slugs: string[][] = [];

  for (const [docId, relPath] of map) {
    if (seenFiles.has(relPath)) continue;
    seenFiles.add(relPath);

    // Filter drafts
    const fullPath = path.join(CONTENT_DIR, relPath);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const { data } = matter(raw);
    if (isDraft(data as DocMeta)) continue;

    slugs.push(docIdToSlug(docId));
  }

  return slugs;
}

/**
 * Find a doc by URL slug.
 */
export function getDocBySlug(slug: string[]): DocPage | null {
  const map = buildDocIdMap();

  // Try direct match: slug → doc ID
  const directId = slug.join('/');
  if (map.has(directId)) {
    const relPath = map.get(directId)!;
    const fullPath = path.join(CONTENT_DIR, relPath);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const { data } = matter(raw);
    const meta = data as DocMeta;
    if (isDraft(meta)) return null;
    return { meta, slug, filePath: relPath, content: raw };
  }

  // Try index: slug → slug/index
  const indexId = directId + '/index';
  if (map.has(indexId)) {
    const relPath = map.get(indexId)!;
    const fullPath = path.join(CONTENT_DIR, relPath);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const { data } = matter(raw);
    const meta = data as DocMeta;
    if (isDraft(meta)) return null;
    return { meta, slug, filePath: relPath, content: raw };
  }

  return null;
}

// Cache for doc ID → title mapping
let docTitleMap: Map<string, string> | null = null;

/**
 * Build mapping from doc IDs to titles (from frontmatter or first heading).
 */
function buildDocTitleMap(): Map<string, string> {
  if (docTitleMap) return docTitleMap;

  const idMap = buildDocIdMap();
  const titleMap = new Map<string, string>();

  for (const [docId, relPath] of idMap) {
    const fullPath = path.join(CONTENT_DIR, relPath);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const { data, content: body } = matter(raw);

    // Priority: frontmatter sidebar_label > frontmatter title > first h1 > filename
    let title = data.sidebar_label || data.title;
    if (!title) {
      const h1Match = body.match(/^#\s+(.+)$/m);
      if (h1Match) {
        title = h1Match[1].trim();
      }
    }
    if (!title) {
      const parts = docId.split('/');
      title = parts[parts.length - 1];
    }

    titleMap.set(docId, title);
  }

  docTitleMap = titleMap;
  return titleMap;
}

/**
 * Get title for a doc ID.
 */
export function getDocTitle(docId: string): string {
  const titleMap = buildDocTitleMap();
  return titleMap.get(docId) || docId.split('/').pop() || docId;
}

/**
 * Get title map for a list of doc IDs (for passing to client components).
 */
export function getDocTitleMap(docIds: string[]): Record<string, string> {
  const titleMap = buildDocTitleMap();
  const result: Record<string, string> = {};
  for (const id of docIds) {
    result[id] = titleMap.get(id) || id.split('/').pop() || id;
  }
  return result;
}

/**
 * Check if a doc ID is a draft.
 */
export function isDocIdDraft(docId: string): boolean {
  const map = buildDocIdMap();
  const relPath = map.get(docId);
  if (!relPath) return false;
  const fullPath = path.join(CONTENT_DIR, relPath);
  if (!fs.existsSync(fullPath)) return false;
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const { data } = matter(raw);
  return isDraft(data as DocMeta);
}

/**
 * Filter draft items from sidebar tree.
 */
export function filterDraftItems(items: import('./sidebar').SidebarItem[]): import('./sidebar').SidebarItem[] {
  return items
    .filter((item) => {
      if (typeof item === 'string') {
        return !isDocIdDraft(item);
      }
      return true;
    })
    .map((item) => {
      if (typeof item !== 'string' && item.type === 'category') {
        const filtered = filterDraftItems(item.items);
        if (filtered.length === 0 && !item.link) return null;
        return { ...item, items: filtered };
      }
      return item;
    })
    .filter((item): item is import('./sidebar').SidebarItem => item !== null);
}

/**
 * Extract all doc IDs from sidebar items recursively.
 */
export function extractDocIds(items: import('./sidebar').SidebarItem[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      ids.push(item);
    } else if (item.type === 'category') {
      ids.push(...extractDocIds(item.items));
    }
  }
  return ids;
}

/**
 * Pre-process MDX source:
 * 1. Strip image import statements
 * 2. Replace import variable references with static paths
 */
function preprocessMdx(source: string, filePath: string): string {
  const lines = source.split('\n');
  const importMap = new Map<string, string>();
  const processedLines: string[] = [];

  // Directory of the MDX file relative to content/
  const fileDir = path.dirname(filePath);

  for (const line of lines) {
    // Match: import IMG0101 from './img/0101.png';
    const importMatch = line.match(
      /^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/
    );
    if (importMatch) {
      const [, varName, importPath] = importMatch;
      // Only handle image imports
      if (/\.(png|jpe?g|gif|svg|webp)$/i.test(importPath)) {
        // Resolve the path relative to content dir
        const resolvedPath = path.join(fileDir, importPath);
        importMap.set(varName, `/content/${resolvedPath}`);
        continue; // Skip the import line
      }
    }
    processedLines.push(line);
  }

  let result = processedLines.join('\n');

  // Replace src={VARIABLE} with src="/content/path/to/img.png"
  for (const [varName, staticPath] of importMap) {
    const regex = new RegExp(`src=\\{${varName}\\}`, 'g');
    result = result.replace(regex, `src="${staticPath}"`);
  }

  // Replace relative image paths: src="./img/..." or src="../img/..."
  result = result.replace(
    /src="(\.\.?\/[^"]*\.(png|jpe?g|gif|svg|webp))"/gi,
    (_match, relPath) => {
      const resolvedPath = path.posix.normalize(path.posix.join(fileDir, relPath));
      return `src="/content/${resolvedPath}"`;
    }
  );

  // Replace Markdown image syntax: ![alt](./img/...) or ![alt](../img/...)
  result = result.replace(
    /!\[([^\]]*)\]\((\.\.?\/[^)]*\.(png|jpe?g|gif|svg|webp))\)/gi,
    (_match, alt, relPath) => {
      const resolvedPath = path.posix.normalize(path.posix.join(fileDir, relPath));
      return `![${alt}](/content/${resolvedPath})`;
    }
  );

  return result;
}

/**
 * Extract headings from MDX content for table of contents.
 */
export function extractHeadings(
  content: string
): { depth: number; text: string; id: string }[] {
  const headings: { depth: number; text: string; id: string }[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^(#{2,6})\s+(.+)$/);
    if (match) {
      const depth = match[1].length;
      const text = match[2].replace(/\*\*(.+?)\*\*/g, '$1').trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\u3000-\u9fff\uf900-\ufaff]+/g, '-')
        .replace(/^-+|-+$/g, '');
      headings.push({ depth, text, id });
    }
  }

  return headings;
}

/**
 * Compile MDX content to React elements.
 */
export async function compileMdxContent(doc: DocPage) {
  const { content: rawContent } = matter(doc.content);
  const processedSource = preprocessMdx(rawContent, doc.filePath);

  const { content } = await compileMDX({
    source: processedSource,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath, remarkDirective, remarkAdmonition],
        rehypePlugins: [rehypeKatex as any],
      },
    },
    components: mdxComponents,
  });

  return content;
}
