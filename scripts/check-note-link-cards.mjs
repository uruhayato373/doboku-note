#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const ROOT = process.cwd();
const POSTS_DIR = SITE_CONTENT_ROOT;
const OWN_NOTE_ARTICLE = /https?:\/\/(?:www\.)?note\.com\/dobokunote\/n\/[A-Za-z0-9]+[^\s)"'>]*/g;
const NOTE_LINK_BLOCK = /<NoteLink\b[\s\S]*?\/>/g;
const SITE_IMAGE = /^\/images\/note-links\/[A-Za-z0-9._/-]+\.webp$/;

function listArticles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listArticles(path));
    else if (entry.name === "article.mdx") files.push(path);
  }
  return files;
}

function lineAt(content, index) {
  return content.slice(0, index).split("\n").length;
}

function attr(block, name) {
  return block.match(new RegExp(`\\b${name}=["']([^"']+)["']`))?.[1] ?? null;
}

function isWebP(path) {
  if (!existsSync(path)) return false;
  const data = readFileSync(path);
  return data.slice(0, 4).toString() === "RIFF" && data.slice(8, 12).toString() === "WEBP";
}

const errors = [];
let cardCount = 0;
let productCount = 0;

for (const file of listArticles(POSTS_DIR)) {
  const source = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);
  const blocks = [...source.matchAll(NOTE_LINK_BLOCK)];
  cardCount += blocks.length;

  for (const match of blocks) {
    const block = match[0];
    const line = lineAt(source, match.index);
    const imageSrc = attr(block, "imageSrc");
    const legacyCover = attr(block, "coverImage");
    const kind = attr(block, "kind") ?? "article";
    const price = attr(block, "price");

    if (legacyCover) {
      errors.push(`${rel}:${line} coverImage は廃止済み。imageSrc を使う`);
    }
    if (!imageSrc) {
      errors.push(`${rel}:${line} NoteLink に imageSrc がない`);
    } else if (!SITE_IMAGE.test(imageSrc)) {
      errors.push(`${rel}:${line} imageSrc は /images/note-links/*.webp に限定: ${imageSrc}`);
    } else {
      const localImage = join(ROOT, "public", imageSrc.replace(/^\//, ""));
      if (!existsSync(localImage)) {
        errors.push(`${rel}:${line} 画像ファイルが存在しない: ${localImage}`);
      } else if (!isWebP(localImage)) {
        errors.push(`${rel}:${line} 拡張子と実体が WebP で一致しない: ${localImage}`);
      }
    }

    if (kind === "product") {
      productCount++;
      if (!price) errors.push(`${rel}:${line} kind=\"product\" には price が必要`);
    }
  }

  // NoteLink ブロックを空白化し、自社note記事の生リンクだけを検出する。
  const masked = source.replace(NOTE_LINK_BLOCK, (block) => " ".repeat(block.length));
  for (const match of masked.matchAll(OWN_NOTE_ARTICLE)) {
    errors.push(
      `${rel}:${lineAt(masked, match.index)} 自社note記事の生リンクは禁止。画像付き <NoteLink> を使う: ${match[0]}`,
    );
  }
}

if (errors.length > 0) {
  console.error(`[check-note-link-cards] ${errors.length}件の違反`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `[check-note-link-cards] ✓ NoteLink ${cardCount}件（有料商品 ${productCount}件）はサイト管理画像付き。自社note生リンクなし`,
);
