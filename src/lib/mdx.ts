import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { parseCallouts } from "./mdx-callout-parser";
import { calculateReadTime } from "./utils";
import type { Post, HeadingItem } from "@/types/blog";

const contentDirectory = path.join(process.cwd(), "src/content/posts");

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

export function getAllPosts(): Post[] {
  return getPostsFromDirectory().sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPostsByCategory(category: string): Post[] {
  const allPosts = getAllPosts();
  return allPosts.filter((post) => post.category === category);
}

export function getFreePosts(): Post[] {
  return getAllPosts().filter((post) => !post.isPremium);
}

export function getPremiumPosts(): Post[] {
  return getAllPosts().filter((post) => post.isPremium);
}

function getPostsFromDirectory(): Post[] {
  if (!fs.existsSync(contentDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(contentDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => {
      const id = fileName.replace(/\.mdx$/, "");
      const fullPath = path.join(contentDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const matterResult = matter(fileContents);

      // Check published flag: default to true for backward compatibility
      if (matterResult.data.published === false) {
        return null;
      }

      const processedContent = parseCallouts(matterResult.content);

      return {
        id,
        title: matterResult.data.title,
        description:
          matterResult.data.description || matterResult.data.excerpt || "",
        date: matterResult.data.date || matterResult.data.publishedAt,
        category: matterResult.data.category as any, // 型アサーションで一時的に解決
        tags: matterResult.data.tags || [],
        readTime: calculateReadTime(matterResult.content),
        isPremium: matterResult.data.isPremium || false,
        content: processedContent, // Callout記法を変換
        headings: extractHeadingsFromMarkdown(matterResult.content), // 元のMarkdownから見出し抽出
        relatedPosts: matterResult.data.relatedPosts || [],
      };
    })
    .filter((post) => post !== null) as Post[];

  return allPostsData;
}

export function getPost(id: string): Post | null {
  const fullPath = path.join(contentDirectory, `${id}.mdx`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const matterResult = matter(fileContents);

  // Check published flag: default to true for backward compatibility
  if (matterResult.data.published === false) {
    return null;
  }

  const processedContent = parseCallouts(matterResult.content);

  return {
    id,
    title: matterResult.data.title,
    description:
      matterResult.data.description || matterResult.data.excerpt || "",
    date: matterResult.data.date || matterResult.data.publishedAt,
    category: matterResult.data.category as any, // 型アサーションで一時的に解決
    tags: matterResult.data.tags || [],
    readTime: calculateReadTime(matterResult.content),
    isPremium: matterResult.data.isPremium || false,
    content: processedContent, // Callout記法を変換
    headings: extractHeadingsFromMarkdown(matterResult.content), // 元のMarkdownから見出し抽出
    relatedPosts: matterResult.data.relatedPosts || [],
  };
}

export function getAllPostIds(): string[] {
  if (!fs.existsSync(contentDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(contentDirectory);
  return fileNames
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => fileName.replace(/\.mdx$/, ""));
}

// Alias for getPost for compatibility
export const getPostData = getPost;
