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
 * Development: Read from .local/r2/content/
 * Production: Fetch from R2 via S3 API
 * @param slug - Array of path segments, e.g., ['exam', 'civil-construction-1', 'guide', 'strategy']
 * @returns Doc object with meta and content, or null if file doesn't exist
 */
export async function getDoc(slug: string[]): Promise<Doc | null> {
  if (process.env.NODE_ENV === 'development') {
    // Development: Read from local filesystem
    const filePath = path.join(localContentDirectory, ...slug) + '.mdx';

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
  } else {
    // Production: Fetch from R2
    try {
      const s3 = getS3Client();
      const key = `posts/${slug.join('/')}.mdx`;
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
          sidebar_label: matterResult.data.sidebar_label,
          toc_min_heading_level: matterResult.data.toc_min_heading_level,
          toc_max_heading_level: matterResult.data.toc_max_heading_level,
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
 * Returns all MDX file slugs for static page generation.
 * Development: Scan local filesystem
 * Production: List objects from R2
 * Used by generateStaticParams() in page.tsx.
 * @returns Array of slug arrays
 */
export async function getAllDocSlugs(): Promise<string[][]> {
  if (process.env.NODE_ENV === 'development') {
    // Development: Scan local filesystem
    return findMdxFiles(localContentDirectory);
  } else {
    // Production: List objects from R2
    try {
      const s3 = getS3Client();
      const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'doboku-note';
      const slugs: string[][] = [];

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
            // Match: posts/exam/civil-construction-1/guide/strategy.mdx
            const match = obj.Key.match(/^posts\/(.+)\.mdx$/);
            if (match && match[1]) {
              const slug = match[1].split('/');
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
 * Builds a map of slug strings to document titles for GeneratedIndexPage.
 * @returns Record<string, string> mapping 'exam/civil-construction-1/guide/strategy' to 'Strategy Title'
 */
export async function getDocTitleMap(): Promise<Record<string, string>> {
  const slugs = await getAllDocSlugs();
  const titleMap: Record<string, string> = {};

  for (const slug of slugs) {
    const doc = await getDoc(slug);
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
export async function getDocsByPrefix(prefix: string[]): Promise<Doc[]> {
  const slugs = await getAllDocSlugs();
  const docs: Doc[] = [];

  for (const slug of slugs) {
    // Check if slug starts with prefix
    if (prefix.every((p, i) => slug[i] === p)) {
      const doc = await getDoc(slug);
      if (doc) {
        docs.push(doc);
      }
    }
  }

  return docs;
}
