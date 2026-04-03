'use server';

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { parseCallouts } from './mdx-callout-parser';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

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
 * Create S3 client for R2 access in production
 */
function getS3Client(): S3Client {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2 credentials: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY'
    );
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Recursively find all .mdx files in a directory and return their flattened slugs.
 * Converts path segments to hyphen-separated slug strings for flat URL structure.
 * E.g., civil-construction-1/guide/concrete-key-points.mdx → 'civil-construction-1-guide-concrete-key-points'
 */
function findMdxFiles(dir: string, basePath: string[] = []): string[] {
  const slugs: string[] = [];

  if (!fs.existsSync(dir)) {
    return slugs;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const fileName = entry.name.replace(/\.mdx$/, '');
    const newPath = [...basePath, fileName];

    if (entry.isDirectory()) {
      // Recursively process subdirectories
      slugs.push(...findMdxFiles(fullPath, newPath));
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      // Flatten path segments into hyphen-separated slug
      const slug = newPath.join('-');
      slugs.push(slug);
    }
  }

  return slugs;
}

/**
 * Reads an MDX file from the slug and returns its metadata and content.
 * Converts flattened slug back to directory path for file lookup.
 * Development: Read from .local/r2/posts/
 * Production: Fetch from R2 via S3 API
 * @param slug - Flattened slug string, e.g., 'civil-construction-1-guide-strategy'
 * @returns Doc object with meta and content, or null if file doesn't exist or published=false
 */
export async function getDoc(slug: string): Promise<Doc | null> {
  if (process.env.NODE_ENV === 'development') {
    // Development: Read from local filesystem
    // Reconstruct directory path from flattened slug by searching for matching .mdx file
    const searchResult = findMdxFileBySlug(localContentDirectory, slug);

    if (!searchResult) {
      return null;
    }

    const fileContents = fs.readFileSync(searchResult.filePath, 'utf8');
    const matterResult = matter(fileContents);
    const processedContent = parseCallouts(matterResult.content);

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
        published: matterResult.data.published !== false, // default to true
        ...matterResult.data,
      },
      content: processedContent,
    };
  } else {
    // Production: Fetch from R2
    try {
      const s3 = getS3Client();
      // Convert slug back to path: 'civil-construction-1-guide-strategy' → 'posts/civil-construction-1/guide/strategy.mdx'
      const slugParts = slug.split('-');
      const key = `posts/${slugParts.join('/')}.mdx`;
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
      const processedContent = parseCallouts(matterResult.content);

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
          published: matterResult.data.published !== false, // default to true
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
  }
}

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
    const newPath = [...basePath, fileName];
    const slug = newPath.join('-');

    if (entry.isFile() && entry.name.endsWith('.mdx') && slug === targetSlug) {
      return { filePath: fullPath, slug };
    } else if (entry.isDirectory()) {
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
  if (process.env.NODE_ENV === 'development') {
    // Development: Scan local filesystem
    return findMdxFiles(localContentDirectory);
  } else {
    // Production: List objects from R2
    try {
      const s3 = getS3Client();
      const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'doboku-note';
      const slugs: string[] = [];

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
            // Match: posts/civil-construction-1/guide/strategy.mdx
            const match = obj.Key.match(/^posts\/(.+)\.mdx$/);
            if (match && match[1]) {
              // Flatten path to slug: 'civil-construction-1/guide/strategy' → 'civil-construction-1-guide-strategy'
              const slug = match[1].replace(/\//g, '-');
              slugs.push(slug);
            }
          }
        }

        if (!response.IsTruncated) break;
        continuationToken = response.NextContinuationToken;
      }

      return slugs;
    } catch (error) {
      console.error('Failed to list MDX files from R2:', error);
      throw error;
    }
  }
}

/**
 * Builds a map of slug strings to document titles for navigation and sidebar.
 * @returns Record<string, string> mapping 'civil-construction-1-guide-strategy' to 'Strategy Title'
 */
export async function getDocTitleMap(): Promise<Record<string, string>> {
  const slugs = await getAllDocSlugs();
  const titleMap: Record<string, string> = {};

  for (const slug of slugs) {
    const doc = await getDoc(slug);
    if (doc) {
      titleMap[slug] = doc.meta.sidebar_label || doc.meta.title || slug;
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
  const docs: Doc[] = [];

  for (const slug of slugs) {
    const doc = await getDoc(slug);
    if (doc && doc.meta.category === category) {
      docs.push(doc);
    }
  }

  return docs;
}

/**
 * Gets all docs with a specific tag.
 * @param tag - Tag to filter by, e.g., 'guide'
 * @returns Array of docs with the tag
 */
export async function getDocsByTag(tag: string): Promise<Doc[]> {
  const slugs = await getAllDocSlugs();
  const docs: Doc[] = [];

  for (const slug of slugs) {
    const doc = await getDoc(slug);
    if (doc && doc.meta.tags?.includes(tag)) {
      docs.push(doc);
    }
  }

  return docs;
}
