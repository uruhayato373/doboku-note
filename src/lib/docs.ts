import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { cache } from 'react';
import { parseCallouts } from './mdx-callout-parser';
import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getS3Client } from './r2-client';

/**
 * Preprocess MDX content for compatibility with MDX v3+ strict parser.
 * - Removes JSX comments {/* ... * /} (not supported in MDX v3)
 * - Removes HTML comments <!-- ... --> (not supported in MDX v3)
 * - Escapes stray { } in non-code, non-JSX-component, non-math contexts
 */
function preprocessMDX(content: string): string {
  const result = content
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Escape stray curly braces in plain text lines (not inside code blocks, math blocks, or JSX components)
  const lines = result.split('\n');
  let inCodeBlock = false;
  let inMathBlock = false;
  let inJsxBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (trimmed === '$$') {
      inMathBlock = !inMathBlock;
      continue;
    }

    if (inCodeBlock || inMathBlock) continue;

    // Track multi-line JSX component blocks (<Component ...\n...\n/>)
    if (/^\s*<[A-Z]/.test(line)) {
      // Self-closing on same line: <Component ... />
      if (/\/>\s*$/.test(line)) continue;
      // Opening+closing on same line: <Component ...>...</Component>
      if (/>.*<\/[A-Z]/.test(line)) continue;
      // Multi-line JSX starts here
      inJsxBlock = true;
      continue;
    }
    if (inJsxBlock) {
      // End of self-closing JSX: />
      if (/^\s*\/>/.test(trimmed)) {
        inJsxBlock = false;
      }
      // End of JSX closing tag: </Component>
      if (/^\s*<\/[A-Z]/.test(line)) {
        inJsxBlock = false;
      }
      continue;
    }

    // Skip closing JSX tags
    if (/^\s*<\/[A-Z]/.test(line)) continue;

    // Skip lines containing inline JSX components (e.g., text<RelatedKeywords items={...} />text)
    if (/<[A-Z]/.test(line)) continue;

    // Skip lines with inline math $...$ (remark-math handles these)
    if (/\$[^$]+\$/.test(line)) continue;

    // Escape remaining { and } that are NOT part of JSX expressions
    if (line.includes('{') && !line.match(/^\s*\{.*\}\s*$/)) {
      // eslint-disable-next-line no-useless-escape
      lines[i] = line.replace(/(?<![<])\{(?![\/\*])/g, (_match, offset) => {
        const before = line.substring(0, offset);
        const dollarCount = (before.match(/\$/g) || []).length;
        if (dollarCount % 2 === 1) return '{';
        return '\\{';
      }).replace(/\}(?![>])/g, (_match, offset) => {
        const before = line.substring(0, offset);
        const dollarCount = (before.match(/\$/g) || []).length;
        if (dollarCount % 2 === 1) return '}';
        return '\\}';
      });
    }
  }

  return lines.join('\n');
}

const localContentDirectory = path.join(process.cwd(), '.local', 'r2', 'posts');

/**
 * Metadata for a documentation page.
 */
export type DocMeta = {
  slug: string; // e.g., 'civil-construction-1-guide-strategy' (flattened)
  title: string;
  description?: string;
  category?: string; // e.g., 'civil-construction-1' (from frontmatter)
  tags?: string[]; // e.g., ['guide', 'primary'] (from frontmatter)
  sidebar_label?: string;
  toc_min_heading_level?: number;
  toc_max_heading_level?: number;
  published?: boolean; // true=published, false=draft
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
 * Slug-to-R2-key mapping. Built by getAllDocSlugs(), used by getDoc() for R2 fallback.
 * Needed because flattened slugs cannot be deterministically reversed to R2 keys
 * when directory names contain hyphens (e.g., "civil-construction-1").
 */
let slugToKeyMap: Map<string, string> | null = null;

/**
 * Recursively find all .mdx files in a directory and return slug + relative path pairs.
 * Converts path segments to hyphen-separated slug strings for flat URL structure.
 *
 * Two naming conventions:
 * - article.mdx: directory path becomes the slug (e.g., followership/article.mdx → followership)
 * - Individual files: filename included in slug (e.g., guide/strategy.mdx → guide-strategy)
 */
function findMdxFiles(dir: string, basePath: string[] = []): { slug: string; relativePath: string }[] {
  const results: { slug: string; relativePath: string }[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const fileName = entry.name.replace(/\.mdx$/, '');

    if (entry.isDirectory()) {
      const newPath = [...basePath, fileName];
      results.push(...findMdxFiles(fullPath, newPath));
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      // For article.mdx, use the directory path as slug (convention: {slug}/article.mdx → {slug})
      // For other .mdx files, include the filename in the slug
      const slugPath = fileName === 'article' ? basePath : [...basePath, fileName];
      if (slugPath.length > 0) {
        const slug = slugPath.join('-');
        const relativePath = [...basePath, entry.name].join('/');
        results.push({ slug, relativePath });
      }
    }
  }

  return results;
}

/**
 * Reads only the frontmatter metadata of an MDX file (no content processing).
 * Much faster than getDoc() — skips preprocessMDX and parseCallouts.
 * Use for sidebar generation, category listing, and other metadata-only operations.
 */
export const getDocMeta = cache(async function getDocMeta(slug: string): Promise<DocMeta | null> {
  // slugToKeyMap を使った O(1) ファイルパス解決（findMdxFileBySlug の全走査を回避）
  if (!slugToKeyMap) {
    await getAllDocSlugs();
  }

  const relativePath = slugToKeyMap?.get(slug);

  if (relativePath && fs.existsSync(localContentDirectory)) {
    const filePath = path.join(localContentDirectory, relativePath);
    if (fs.existsSync(filePath)) {
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const matterResult = matter(fileContents);

      if (matterResult.data.published === false) return null;

      return {
        slug,
        title: matterResult.data.title || '',
        description: matterResult.data.description || '',
        category: matterResult.data.category,
        tags: matterResult.data.tags,
        sidebar_label: matterResult.data.sidebar_label,
        toc_min_heading_level: matterResult.data.toc_min_heading_level,
        toc_max_heading_level: matterResult.data.toc_max_heading_level,
        published: matterResult.data.published !== false,
        ...matterResult.data,
      };
    }
  }

  if (!relativePath) return null;

  // Fallback: Fetch from R2
  try {
    const s3 = getS3Client();
    const key = `posts/${relativePath}`;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'doboku-note';
    const response = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
    if (!response?.Body) return null;

    const fileContents = await response.Body.transformToString('utf-8');
    const matterResult = matter(fileContents);
    if (matterResult.data.published === false) return null;

    return {
      slug,
      title: matterResult.data.title || '',
      description: matterResult.data.description || '',
      category: matterResult.data.category,
      tags: matterResult.data.tags,
      sidebar_label: matterResult.data.sidebar_label,
      toc_min_heading_level: matterResult.data.toc_min_heading_level,
      toc_max_heading_level: matterResult.data.toc_max_heading_level,
      published: matterResult.data.published !== false,
      ...matterResult.data,
    };
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
});

/**
 * Reads an MDX file from the slug and returns its metadata and content.
 * Converts flattened slug back to directory path for file lookup.
 * Development: Read from .local/r2/posts/
 * Production: Fetch from R2 via S3 API
 * @param slug - Flattened slug string, e.g., 'civil-construction-1-guide-strategy'
 * @returns Doc object with meta and content, or null if file doesn't exist or published=false
 */
export const getDoc = cache(async function getDoc(slug: string): Promise<Doc | null> {
  // Prefer local filesystem when available
  const localResult = findMdxFileBySlug(localContentDirectory, slug);
  if (localResult) {
    const fileContents = fs.readFileSync(localResult.filePath, 'utf8');
    const matterResult = matter(fileContents);

    // Filter out unpublished documents
    if (matterResult.data.published === false) {
      return null;
    }

    const processedContent = preprocessMDX(parseCallouts(matterResult.content));

    return {
      meta: {
        slug,
        title: matterResult.data.title || '',
        description: matterResult.data.description || '',
        category: matterResult.data.category,
        tags: matterResult.data.tags,
        sidebar_label: matterResult.data.sidebar_label,
        toc_min_heading_level: matterResult.data.toc_min_heading_level,
        toc_max_heading_level: matterResult.data.toc_max_heading_level,
        published: matterResult.data.published !== false,
        ...matterResult.data,
      },
      content: processedContent,
    };
  }

  // Fallback: Fetch from R2
  try {
    const s3 = getS3Client();
    // Use slug-to-key map (built by getAllDocSlugs) for correct R2 key resolution.
    // Naive slug.split('-') breaks directory names with hyphens (e.g., "civil-construction-1").
    if (!slugToKeyMap) {
      await getAllDocSlugs();
    }
    const relativePath = slugToKeyMap?.get(slug);
    if (!relativePath) {
      return null;
    }
    const key = `posts/${relativePath}`;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'doboku-note';

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3.send(command);
    if (!response || !response.Body) {
      return null;
    }

    const fileContents = await response.Body.transformToString('utf-8');
    const matterResult = matter(fileContents);

    // Filter out unpublished documents
    if (matterResult.data.published === false) {
      return null;
    }

    const processedContent = preprocessMDX(parseCallouts(matterResult.content));

    return {
      meta: {
        slug,
        title: matterResult.data.title || '',
        description: matterResult.data.description || '',
        category: matterResult.data.category,
        tags: matterResult.data.tags,
        sidebar_label: matterResult.data.sidebar_label,
        toc_min_heading_level: matterResult.data.toc_min_heading_level,
        toc_max_heading_level: matterResult.data.toc_max_heading_level,
        published: matterResult.data.published !== false,
        ...matterResult.data,
      },
      content: processedContent,
    };
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
});

/**
 * Helper function to find a file by its flattened slug.
 * Searches the directory tree to find the matching .mdx file.
 */
function findMdxFileBySlug(dir: string, targetSlug: string, basePath: string[] = []): { filePath: string; slug: string } | null {
  if (!fs.existsSync(dir)) {
    return null;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const fileName = entry.name.replace(/\.mdx$/, '');

    if (entry.isFile() && entry.name.endsWith('.mdx')) {
      // For article.mdx, use directory path as slug; for others, include filename
      const newPath = fileName === 'article' ? basePath : [...basePath, fileName];
      const slug = newPath.join('-');
      if (slug === targetSlug) {
        return { filePath: fullPath, slug };
      }
    } else if (entry.isDirectory()) {
      const newPath = [...basePath, fileName];
      const result = findMdxFileBySlug(fullPath, targetSlug, newPath);
      if (result) return result;
    }
  }

  return null;
}

/**
 * Returns all MDX file slugs for static page generation.
 * Returns flattened slug strings (hyphen-separated paths).
 * Development: Scan local filesystem
 * Production: List objects from R2
 * Used by generateStaticParams() in page.tsx.
 * @returns Array of flattened slug strings
 */
export async function getAllDocSlugs(): Promise<string[]> {
  // Prefer local filesystem when available (works for both dev and static export build)
  if (fs.existsSync(localContentDirectory)) {
    const results = findMdxFiles(localContentDirectory);
    if (results.length > 0) {
      // Build slug-to-key map for R2 fallback
      slugToKeyMap = new Map();
      for (const { slug, relativePath } of results) {
        slugToKeyMap.set(slug, relativePath);
      }
      return results.map(r => r.slug);
    }
  }

  // Fallback: List objects from R2 (CI environment where local files don't exist)
  try {
    const s3 = getS3Client();
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'doboku-note';
    slugToKeyMap = new Map();

    let continuationToken: string | undefined;

    while (true) {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: 'posts/',
        ContinuationToken: continuationToken,
      });

      const response = await s3.send(command);

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (!obj.Key) continue;
          const match = obj.Key.match(/^posts\/(.+)\.mdx$/);
          if (match && match[1]) {
            const relativePath = match[1] + '.mdx';
            // Strip /article from the end for article.mdx convention
            const slugBase = match[1].endsWith('/article')
              ? match[1].slice(0, -'/article'.length)
              : match[1];
            const slug = slugBase.replace(/\//g, '-');
            slugToKeyMap.set(slug, relativePath);
          }
        }
      }

      if (!response.IsTruncated) break;
      continuationToken = response.NextContinuationToken;
    }

    return Array.from(slugToKeyMap.keys());
  } catch (error) {
    console.error('Failed to list MDX files from R2:', error);
    throw error;
  }
}

/**
 * Builds a map of slug strings to document titles for navigation and sidebar.
 * @returns Record<string, string> mapping 'civil-construction-1-guide-strategy' to 'Strategy Title'
 */
export async function getDocTitleMap(): Promise<Record<string, string>> {
  const slugs = await getAllDocSlugs();
  const metas = await Promise.all(slugs.map((slug) => getDocMeta(slug)));
  const titleMap: Record<string, string> = {};

  for (let i = 0; i < slugs.length; i++) {
    const meta = metas[i];
    if (meta) {
      titleMap[slugs[i]!] = meta.sidebar_label || meta.title || slugs[i]!;
    }
  }

  return titleMap;
}

/**
 * Gets all docs in a specific category/prefix.
 * @param categoryOrTag - Category (from frontmatter) or tag to filter by, e.g., 'civil-construction-1'
 * @param field - 'category' or 'tags' field to match against
 * @returns Array of docs matching the category/tag
 */
export async function getDocsByCategory(category: string): Promise<Doc[]> {
  const slugs = await getAllDocSlugs();
  // Filter by metadata first (fast), then load full docs only for matches
  const metas = await Promise.all(slugs.map((slug) => getDocMeta(slug)));
  const matchingSlugs = slugs.filter((_, i) => metas[i] !== null && metas[i]!.category === category);
  const docs = await Promise.all(matchingSlugs.map((slug) => getDoc(slug)));
  return docs.filter((doc): doc is Doc => doc !== null);
}

export async function getDocsMetaByCategory(category: string): Promise<DocMeta[]> {
  const slugs = await getAllDocSlugs();
  const metas = await Promise.all(slugs.map((slug) => getDocMeta(slug)));
  return metas.filter((meta): meta is DocMeta => meta !== null && meta.category === category);
}

/**
 * Gets all docs with a specific tag.
 * @param tag - Tag to filter by, e.g., 'guide'
 * @returns Array of docs with the tag
 */
export async function getDocsByTag(tag: string): Promise<Doc[]> {
  const slugs = await getAllDocSlugs();
  const metas = await Promise.all(slugs.map((slug) => getDocMeta(slug)));
  const matchingSlugs = slugs.filter((_, i) => metas[i] !== null && (metas[i]!.tags?.includes(tag) ?? false));
  const docs = await Promise.all(matchingSlugs.map((slug) => getDoc(slug)));
  return docs.filter((doc): doc is Doc => doc !== null);
}
