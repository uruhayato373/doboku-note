import matter from 'gray-matter';
import { cache } from 'react';
import { parseCallouts } from './mdx-callout-parser';
import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getS3Client } from './r2-client';
import { readLocalPost, findLocalMdxFiles } from './local-post-reader';
import docMetaIndex from '@/config/doc-meta-index.json';

type DocMetaIndex = {
  docs: Record<string, Omit<DocMeta, 'slug'> & { slug?: string }>;
};

const typedDocMetaIndex = docMetaIndex as DocMetaIndex;

function isMissingObjectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const metadata = '$metadata' in error
    ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata
    : undefined;
  return error.name === 'NoSuchKey' || metadata?.httpStatusCode === 404;
}

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

    // Track multi-line JSX/HTML element blocks (<Component ...\n...\n/> or <img .../>)
    // 小文字 HTML 要素（<img width={N} /> 等）も JSX 式属性を持つため同じ扱いにする
    if (/^\s*<[a-zA-Z]/.test(line)) {
      // Self-closing on same line: <Component ... /> / <img ... />
      if (/\/>\s*$/.test(line)) continue;
      // Opening+closing on same line: <Component ...>...</Component>
      if (/>.*<\/[a-zA-Z]/.test(line)) continue;
      // Multi-line JSX starts here
      inJsxBlock = true;
      continue;
    }
    if (inJsxBlock) {
      // End of self-closing JSX: />
      if (/^\s*\/>/.test(trimmed)) {
        inJsxBlock = false;
      }
      // End of JSX closing tag: </Component> / </a>
      if (/^\s*<\/[a-zA-Z]/.test(line)) {
        inJsxBlock = false;
      }
      continue;
    }

    // Skip closing JSX/HTML tags
    if (/^\s*<\/[a-zA-Z]/.test(line)) continue;

    // Skip lines containing inline JSX/HTML components (text<RelatedKeywords ... /> や <img width={N} />)
    if (/<[a-zA-Z]/.test(line)) continue;

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

/**
 * Metadata for a documentation page.
 */
export type DocMeta = {
  slug: string; // e.g., 'civil-construction-1-guide-strategy' (flattened)
  title: string;
  seoTitle?: string;
  shortTitle?: string; // カード表示用の短縮タイトル
  subtitle?: string;   // カード表示用のサブタイトル
  description?: string;
  category?: string; // e.g., 'civil-construction-1' (from frontmatter)
  group?: string; // e.g., 'guide', 'past-exam', 'keyword' (explicit classification)
  tags?: string[]; // e.g., ['guide', 'primary'] (from frontmatter)
  section?: string;
  guide_order?: number;
  textbook_order?: number;
  toc_min_heading_level?: number;
  toc_max_heading_level?: number;
  published?: boolean; // true=published, false=draft
  publishedAt?: string;
  created?: string;
  updatedAt?: string;
  dateModified?: string;
  lastRewrittenAt?: string;
  noindex?: boolean;
  hideFromCategory?: boolean;
  hideFromHome?: boolean;
  faqs?: ({ q: string; a: string } | { question: string; answer: string })[];
  [key: string]: unknown; // Allow other frontmatter fields
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
 * Reads only the frontmatter metadata of an MDX file (no content processing).
 * Primary: static JSON lookup from doc-meta-index.json (zero I/O).
 * Fallback: filesystem read for newly created files not yet in the index.
 */
export async function getDocMeta(slug: string): Promise<DocMeta | null> {
  // 高速パス: 静的 JSON lookup（ビルド済みインデックス）
  const entry = typedDocMetaIndex.docs[slug];
  if (entry) {
    return { slug, ...entry } as DocMeta;
  }

  // Fallback: インデックスにない = 新規追加ファイル or published:false
  if (!slugToKeyMap) {
    await getAllDocSlugs();
  }
  const relativePath = slugToKeyMap?.get(slug);
  if (!relativePath) return null;

  const fileContents = readLocalPost(relativePath);
  if (fileContents !== null) {
    const matterResult = matter(fileContents);
    if (matterResult.data.published === false) return null;

    return {
      slug,
      title: matterResult.data.title || '',
      description: matterResult.data.description || '',
      published: matterResult.data.published !== false,
      ...matterResult.data,
    } as DocMeta;
  }

  return null;
}

/**
 * Reads an MDX file from the slug and returns its metadata and content.
 * Converts flattened slug back to directory path for file lookup.
 * Development: Read from content/site/
 * Production: Fetch from R2 via S3 API
 * @param slug - Flattened slug string, e.g., 'civil-construction-1-guide-strategy'
 * @returns Doc object with meta and content, or null if file doesn't exist or published=false
 */
export const getDoc = cache(async function getDoc(slug: string): Promise<Doc | null> {
  // slugToKeyMap で O(1) パス解決（再帰走査を回避）
  if (!slugToKeyMap) {
    await getAllDocSlugs();
  }
  const relativePath = slugToKeyMap?.get(slug);
  if (!relativePath) {
    return null;
  }

  // Prefer local filesystem when available
  const localFileContents = readLocalPost(relativePath);
  if (localFileContents !== null) {
    const matterResult = matter(localFileContents);

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
        tags: matterResult.data.tags,        toc_min_heading_level: matterResult.data.toc_min_heading_level,
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
        tags: matterResult.data.tags,        toc_min_heading_level: matterResult.data.toc_min_heading_level,
        toc_max_heading_level: matterResult.data.toc_max_heading_level,
        published: matterResult.data.published !== false,
        ...matterResult.data,
      },
      content: processedContent,
    };
  } catch (error: unknown) {
    if (isMissingObjectError(error)) {
      return null;
    }
    throw error;
  }
});

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
  const results = findLocalMdxFiles();
  if (results.length > 0) {
    // Build slug-to-key map for R2 fallback
    slugToKeyMap = new Map();
    for (const { slug, relativePath } of results) {
      slugToKeyMap.set(slug, relativePath);
    }
    return results.map(r => r.slug);
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
 * Gets all document metadata for a specific category.
 * Pure in-memory filter on the static JSON index (zero I/O).
 */
export function getDocsMetaByCategory(category: string): DocMeta[] {
  const docs = typedDocMetaIndex.docs;
  return Object.entries(docs)
    .filter(([, meta]) => meta.category === category)
    .map(([slug, meta]) => ({ slug, ...meta } as DocMeta));
}

/**
 * Gets all document metadata (all categories).
 * Pure in-memory read on the static JSON index (zero I/O).
 */
export function getAllDocsMeta(): DocMeta[] {
  const docs = typedDocMetaIndex.docs;
  return Object.entries(docs).map(([slug, meta]) => ({ slug, ...meta } as DocMeta));
}
