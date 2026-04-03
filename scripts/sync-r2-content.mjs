/**
 * Sync content from content/ to .local/r2/content/
 * - MDX files: content/ → .local/r2/content/
 * - Images: content/.../ → public/content/.../img/
 * Runs automatically before dev/build to keep local R2 mirror and public assets in sync.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const contentDir = path.join(root, 'content');
const localR2Dir = path.join(root, '.local', 'r2', 'content');
const publicContentDir = path.join(root, 'public', 'content');

let copiedMdx = 0;
let copiedImages = 0;

/**
 * Find all .mdx files recursively
 */
function findMdxFiles(dir, base = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, entry.name);
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMdxFiles(full, rel));
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      results.push({ full, rel });
    }
  }
  return results;
}

/**
 * Find all img directories recursively
 */
function findImgDirs(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name === 'img') {
      results.push(full);
    } else {
      results.push(...findImgDirs(full));
    }
  }
  return results;
}

/**
 * Copy directory recursively with modification time check
 */
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      const srcStat = fs.statSync(srcPath);
      const destExists = fs.existsSync(destPath);
      if (destExists) {
        const destStat = fs.statSync(destPath);
        if (destStat.mtimeMs >= srcStat.mtimeMs && destStat.size === srcStat.size) {
          continue;
        }
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy single file with modification time check
 */
function copySingleFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const srcStat = fs.statSync(src);
  const destExists = fs.existsSync(dest);
  if (destExists) {
    const destStat = fs.statSync(dest);
    if (destStat.mtimeMs >= srcStat.mtimeMs && destStat.size === srcStat.size) {
      return false; // Already up to date
    }
  }
  fs.copyFileSync(src, dest);
  return true;
}

// 1. Sync MDX files to .local/r2/content/
const mdxFiles = findMdxFiles(contentDir);
for (const mdx of mdxFiles) {
  const dest = path.join(localR2Dir, mdx.rel);
  if (copySingleFile(mdx.full, dest)) {
    copiedMdx++;
  }
}

// 2. Sync images to public/content/
const imgDirs = findImgDirs(contentDir);
for (const imgDir of imgDirs) {
  const rel = path.relative(contentDir, imgDir);
  const dest = path.join(publicContentDir, rel);
  const before = copiedImages;
  for (const entry of fs.readdirSync(imgDir, { withFileTypes: true })) {
    if (entry.isFile()) {
      const srcPath = path.join(imgDir, entry.name);
      const destPath = path.join(dest, entry.name);
      if (copySingleFile(srcPath, destPath)) {
        copiedImages++;
      }
    }
  }
}

console.log(`[sync-r2-content] MDX: ${copiedMdx} synced, Images: ${copiedImages} synced`);
