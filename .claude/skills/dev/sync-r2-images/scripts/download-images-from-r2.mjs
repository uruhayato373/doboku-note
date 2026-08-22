/**
 * MDX ファイルをスキャンして参照画像を自動収集し、R2 からローカルにダウンロードする。
 * curl を使用してプロキシ環境に対応。
 *
 * Usage:
 *   node .claude/skills/dev/sync-r2-images/scripts/download-images-from-r2.mjs              # 全 MDX をスキャン・ダウンロード
 *   node .claude/skills/dev/sync-r2-images/scripts/download-images-from-r2.mjs --dry-run    # プレビューのみ
 *   node .claude/skills/dev/sync-r2-images/scripts/download-images-from-r2.mjs --prefix civil-construction-1/guide-earthwork
 *   node .claude/skills/dev/sync-r2-images/scripts/download-images-from-r2.mjs --prefix civil-construction-1/guide-earthwork --dry-run
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const root = process.cwd();

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const prefixIndex = args.indexOf('--prefix');
const prefixFilter = prefixIndex !== -1 ? args[prefixIndex + 1] : null;

const R2_PUBLIC_URL = 'https://storage.doboku-note.com';
const postsDir = path.join(root, 'content/site');

let downloaded = 0;
let skipped = 0;
let failed = 0;

/**
 * Find all MDX files and extract referenced images
 */
function findReferencedImages() {
  const imageRefs = new Map(); // key: /posts/path, value: absolute local path

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;

      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDir(full);
      } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
        const content = fs.readFileSync(full, 'utf-8');

        // Match: <img src="/posts/{path}" /> or <ArticleImage src="/posts/{path}" />
        const imgPattern = /<(?:img|ArticleImage)\s+[^>]*?src="(\/posts\/[^"]+)"/g;
        let match;
        while ((match = imgPattern.exec(content)) !== null) {
          const imgPath = match[1]; // e.g., /posts/civil-construction-1/guide-earthwork/img/0208.jpg

          // Filter by prefix if specified
          if (prefixFilter && !imgPath.includes(`/${prefixFilter}/`)) {
            continue;
          }

          // Convert to local path
          const localPath = path.join(postsDir, imgPath.substring('/posts/'.length));
          imageRefs.set(imgPath, localPath);
        }
      }
    }
  }

  scanDir(postsDir);
  return imageRefs;
}

/**
 * Download images from R2
 */
function downloadImagesFromR2() {
  try {
    console.log(`[download-images] Scanning MDX files in content/site/`);
    if (prefixFilter) {
      console.log(`[download-images] Filter: content/site/${prefixFilter}/*`);
    }

    const imageRefs = findReferencedImages();
    console.log(`[download-images] Found ${imageRefs.size} referenced image(s)`);

    for (const [imgPath, localPath] of imageRefs.entries()) {
      // Check if file already exists
      if (fs.existsSync(localPath)) {
        const stat = fs.statSync(localPath);
        console.log(`[skip] ${imgPath} (${(stat.size / 1024).toFixed(1)}KB already exists)`);
        skipped++;
        continue;
      }

      const url = `${R2_PUBLIC_URL}${imgPath}`;

      if (isDryRun) {
        console.log(`[check] (dry-run) ${imgPath}`);
        downloaded++;
      } else {
        try {
          const dir = path.dirname(localPath);
          fs.mkdirSync(dir, { recursive: true });

          // Download with curl
          // Note: curl respects proxy env vars; we don't override them
          const cmd = `curl -f -o "${localPath}" "${url}"`;
          execSync(cmd, {
            stdio: 'ignore', // Suppress curl output
          });

          if (fs.existsSync(localPath)) {
            const stat = fs.statSync(localPath);
            console.log(`[✓] ${imgPath} (${(stat.size / 1024).toFixed(1)}KB)`);
            downloaded++;
          } else {
            console.error(`[✗] ${imgPath} — file not written`);
            failed++;
          }
        } catch (err) {
          console.error(`[✗] ${imgPath} — ${err.message.split('\n')[0]}`);
          failed++;
        }
      }
    }

    console.log(`\n[download-images] Summary:`);
    console.log(`  Downloaded: ${downloaded}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Failed: ${failed}`);

    if (isDryRun) {
      console.log(`\n[dry-run] Re-run without --dry-run to download.`);
    }

    if (failed > 0 && downloaded === 0 && !isDryRun) {
      console.error('\n❌ No images downloaded. Check your network or R2 URL.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
downloadImagesFromR2();
