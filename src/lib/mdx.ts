import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { parseCallouts } from "./mdx-callout-parser";
import { calculateReadTime } from "./utils";
import type { Post, HeadingItem } from "@/types/blog";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const localPostsDirectory = path.join(process.cwd(), ".local", "r2", "posts");

/**
 * Create S3 client for R2 access in production
 */
function getS3Client(): S3Client {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing R2 credentials: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY"
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

// サーバーサイドで見出しを抽出する関数
function extractHeadingsFromMarkdown(content: string): HeadingItem[] {
  const lines = content.split("\n");
  const headings: HeadingItem[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // ## または ### で始まる行を見出しとして認識
    if (trimmed.match(/^#{2,3}\s+/)) {
      const level = (trimmed.match(/^#+/) || [""])[0].length;
      const text = trimmed.replace(/^#+\s*/, "").trim();

      if (text && (level === 2 || level === 3)) {
        const id = generateHeadingId(text, index);
        headings.push({
          id,
          text,
          level,
        });
      }
    }
  });

  return headings;
}

// 見出しIDを生成する関数
function generateHeadingId(text: string, index: number): string {
  const id = text
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return id || `heading-${index}`;
}

/**
 * Build post object from frontmatter and content
 */
function buildPostObject(id: string, matterResult: any): Post {
  const processedContent = parseCallouts(matterResult.content);

  return {
    id,
    title: matterResult.data.title,
    description:
      matterResult.data.description || matterResult.data.excerpt || "",
    date: matterResult.data.date || matterResult.data.publishedAt,
    category: matterResult.data.category as any,
    tags: matterResult.data.tags || [],
    readTime: calculateReadTime(matterResult.content),
    isPremium: matterResult.data.isPremium || false,
    content: processedContent,
    headings: extractHeadingsFromMarkdown(matterResult.content),
    relatedPosts: matterResult.data.relatedPosts || [],
  };
}

/**
 * Get all posts from local filesystem (development)
 */
function getPostsFromLocalDirectory(): Post[] {
  if (!fs.existsSync(localPostsDirectory)) {
    return [];
  }

  const dirs = fs
    .readdirSync(localPostsDirectory, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  return dirs
    .map((dir) => {
      const id = dir.name;
      const articlePath = path.join(localPostsDirectory, id, "article.mdx");

      if (!fs.existsSync(articlePath)) {
        return null;
      }

      const fileContents = fs.readFileSync(articlePath, "utf8");
      const matterResult = matter(fileContents);

      // Filter out unpublished posts
      if (matterResult.data.published === false) {
        return null;
      }

      return buildPostObject(id, matterResult);
    })
    .filter((post): post is Post => post !== null);
}

/**
 * Get all posts from R2 (production)
 */
async function getPostsFromR2(): Promise<Post[]> {
  const ids = await getAllPostIdsFromR2();
  const posts: Post[] = [];

  for (const id of ids) {
    const post = await getPostFromR2(id);
    if (post) {
      posts.push(post);
    }
  }

  return posts;
}

/**
 * Get single post from R2 (production)
 */
async function getPostFromR2(id: string): Promise<Post | null> {
  try {
    const s3 = getS3Client();
    const key = `posts/${id}/article.mdx`;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "doboku-note";

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3.send(command);
    if (!response || !response.Body) {
      return null;
    }

    const fileContents = await response.Body.transformToString("utf-8");
    const matterResult = matter(fileContents);

    // Filter out unpublished posts
    if (matterResult.data.published === false) {
      return null;
    }

    return buildPostObject(id, matterResult);
  } catch (error: any) {
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get all post IDs from local filesystem (development)
 */
function getLocalPostIds(): string[] {
  if (!fs.existsSync(localPostsDirectory)) {
    return [];
  }

  return fs
    .readdirSync(localPostsDirectory, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/**
 * Get all post IDs from R2 (production)
 */
async function getAllPostIdsFromR2(): Promise<string[]> {
  try {
    const s3 = getS3Client();
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "doboku-note";
    const ids: string[] = [];
    let continuationToken: string | undefined;

    while (true) {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: "posts/",
        Delimiter: "/",
        ContinuationToken: continuationToken,
      });

      const response = await s3.send(command);

      if (response.CommonPrefixes) {
        for (const prefix of response.CommonPrefixes) {
          if (!prefix.Prefix) continue;
          // 'posts/xxx/' → 'xxx'
          const id = prefix.Prefix.replace(/^posts\//, "").replace(/\/$/, "");
          if (id) ids.push(id);
        }
      }

      if (!response.IsTruncated) break;
      continuationToken = response.NextContinuationToken;
    }

    return ids;
  } catch (error) {
    console.error("Failed to list post IDs from R2:", error);
    throw error;
  }
}

/**
 * Get all posts, sorted by date (newest first)
 */
export async function getAllPosts(): Promise<Post[]> {
  const posts =
    process.env.NODE_ENV === "development"
      ? getPostsFromLocalDirectory()
      : await getPostsFromR2();

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function getPostsByCategory(category: string): Promise<Post[]> {
  const allPosts = await getAllPosts();
  return allPosts.filter((post) => post.category === category);
}

export async function getFreePosts(): Promise<Post[]> {
  const allPosts = await getAllPosts();
  return allPosts.filter((post) => !post.isPremium);
}

export async function getPremiumPosts(): Promise<Post[]> {
  const allPosts = await getAllPosts();
  return allPosts.filter((post) => post.isPremium);
}

export async function getPost(id: string): Promise<Post | null> {
  if (process.env.NODE_ENV === "development") {
    const articlePath = path.join(localPostsDirectory, id, "article.mdx");

    if (!fs.existsSync(articlePath)) {
      return null;
    }

    const fileContents = fs.readFileSync(articlePath, "utf8");
    const matterResult = matter(fileContents);

    if (matterResult.data.published === false) {
      return null;
    }

    return buildPostObject(id, matterResult);
  } else {
    return getPostFromR2(id);
  }
}

export async function getAllPostIds(): Promise<string[]> {
  if (process.env.NODE_ENV === "development") {
    return getLocalPostIds();
  } else {
    return getAllPostIdsFromR2();
  }
}

// Alias for getPost for compatibility
export const getPostData = getPost;
