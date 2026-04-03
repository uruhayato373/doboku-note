import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { parseCallouts } from './mdx-callout-parser';

const contentDirectory = path.join(process.cwd(), 'content');

/**
 * Metadata for a documentation page.
 */
export type DocMeta = {
  slug: string[]; // e.g., ['exam', 'civil-construction-1', 'guide', 'strategy']
  title: string;
  description?: string;
  sidebar_label?: string;
  toc_min_heading_level?: number;
  toc_max_heading_level?: number;
  [key: string]: any; // Allow other frontmatter fields
};

/**
 * A documentation page with metadata and content.
 */
export type Doc = {
  meta: DocMeta;
  content: string; // Markdown content with Callout syntax converted
};

/**
 * Recursively find all .mdx files in a directory and return their slugs.
 */
function findMdxFiles(dir: string, basePath: string[] = []): string[][] {
  const slugs: string[][] = [];

  if (!fs.existsSync(dir)) {
    return slugs;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const newBasePath = [...basePath, entry.name.replace(/\.mdx$/, '')];

    if (entry.isDirectory()) {
      // Recursively process subdirectories
      slugs.push(...findMdxFiles(fullPath, newBasePath.slice(0, -1)));
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      slugs.push(newBasePath);
    }
  }

  return slugs;
}

/**
 * Reads an MDX file from the slug array and returns its metadata and content.
 * @param slug - Array of path segments, e.g., ['exam', 'civil-construction-1', 'guide', 'strategy']
 * @returns Doc object with meta and content, or null if file doesn't exist
 */
export function getDoc(slug: string[]): Doc | null {
  const filePath = path.join(contentDirectory, ...slug) + '.mdx';

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const matterResult = matter(fileContents);
  const processedContent = parseCallouts(matterResult.content);

  return {
    meta: {
      slug,
      title: matterResult.data.title || '',
      description: matterResult.data.description || '',
      sidebar_label: matterResult.data.sidebar_label,
      toc_min_heading_level: matterResult.data.toc_min_heading_level,
      toc_max_heading_level: matterResult.data.toc_max_heading_level,
      ...matterResult.data,
    },
    content: processedContent,
  };
}

/**
 * Returns all MDX file slugs for static page generation.
 * Used by generateStaticParams() in page.tsx.
 * @returns Array of slug arrays
 */
export function getAllDocSlugs(): string[][] {
  return findMdxFiles(contentDirectory);
}

/**
 * Builds a map of slug strings to document titles for GeneratedIndexPage.
 * @returns Record<string, string> mapping 'exam/civil-construction-1/guide/strategy' to 'Strategy Title'
 */
export function getDocTitleMap(): Record<string, string> {
  const slugs = getAllDocSlugs();
  const titleMap: Record<string, string> = {};

  for (const slug of slugs) {
    const doc = getDoc(slug);
    if (doc) {
      const slugStr = slug.join('/');
      titleMap[slugStr] = doc.meta.sidebar_label || doc.meta.title || slugStr;
    }
  }

  return titleMap;
}

/**
 * Gets all docs in a specific category/prefix.
 * @param prefix - Path prefix, e.g., ['exam', 'civil-construction-1', 'primary']
 * @returns Array of docs matching the prefix
 */
export function getDocsByPrefix(prefix: string[]): Doc[] {
  const slugs = getAllDocSlugs();
  const docs: Doc[] = [];

  for (const slug of slugs) {
    // Check if slug starts with prefix
    if (prefix.every((p, i) => slug[i] === p)) {
      const doc = getDoc(slug);
      if (doc) {
        docs.push(doc);
      }
    }
  }

  return docs;
}
