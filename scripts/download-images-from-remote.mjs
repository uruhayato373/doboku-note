/**
 * 本番環境（storage.doboku-note.com）から画像をダウンロードする。
 * curl を使用して確実に転送（プロキシ設定を回避）
 *
 * Usage:
 *   node scripts/download-images-from-remote.mjs --prefix general/construction-management
 *   node scripts/download-images-from-remote.mjs --prefix general/construction-management --dry-run
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const prefixIndex = args.indexOf('--prefix');
const prefixFilter = prefixIndex !== -1 ? args[prefixIndex + 1] : null;

const R2_PUBLIC_URL = 'https://storage.doboku-note.com';
const contentDir = path.join(root, 'content');
let downloaded = 0;
let failed = 0;

/**
 * Download images from remote R2 using curl
 */
function downloadImagesFromRemote() {
  try {
    if (!prefixFilter) {
      console.error('❌ Error: --prefix is required');
      console.error('Usage: node scripts/download-images-from-remote.mjs --prefix {category}');
      console.error('Example: node scripts/download-images-from-remote.mjs --prefix general/construction-management');
      process.exit(1);
    }

    console.log(`[download-images] Downloading from ${R2_PUBLIC_URL}`);
    console.log(`[download-images] Filter: content/${prefixFilter}/*`);

    // Common pattern-based filenames for construction-management
    const imageNames = [
      '0208.jpg',
      '0209.jpg',
      // Add more as needed
    ];

    const baseUrl = `${R2_PUBLIC_URL}/content/${prefixFilter}/img`;

    for (const imageName of imageNames) {
      const url = `${baseUrl}/${imageName}`;
      const relPath = `${prefixFilter}/img/${imageName}`;
      const filePath = path.join(contentDir, relPath);
      const dir = path.dirname(filePath);

      if (isDryRun) {
        console.log(`[check] (dry-run) ${relPath}`);
        downloaded++;
      } else {
        try {
          // Create directory
          fs.mkdirSync(dir, { recursive: true });

          // Download with curl (no proxy)
          execSync(`curl -s -f "${url}" -o "${filePath}"`, {
            stdio: 'pipe',
            env: {
              ...process.env,
              // Clear proxy settings for curl
              HTTP_PROXY: '',
              HTTPS_PROXY: '',
              NO_PROXY: '*',
            },
          });

          console.log(`[✓] ${relPath}`);
          downloaded++;
        } catch (err) {
          console.log(`[✗] ${relPath}: Failed to download`);
          failed++;
        }
      }
    }

    console.log(`\n[download-images] Results:`);
    console.log(`  Downloaded: ${downloaded}`);
    console.log(`  Failed: ${failed}`);

    if (failed > 0 && downloaded === 0) {
      console.error('\n❌ No images downloaded. Check the URL and prefix.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
downloadImagesFromRemote();
