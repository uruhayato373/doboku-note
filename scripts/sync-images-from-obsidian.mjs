/**
 * Obsidian vault から content/ 配下のMDXファイルに対応する画像をコピーする。
 * ファイル構造が同じと仮定：~/obsidian/{カテゴリ}/... ↔ content/{カテゴリ}/...
 *
 * Usage:
 *   node scripts/sync-images-from-obsidian.mjs              # 全画像をコピー
 *   node scripts/sync-images-from-obsidian.mjs --dry-run    # プレビューのみ
 *   node scripts/sync-images-from-obsidian.mjs --prefix general/construction-management
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const prefixIndex = args.indexOf('--prefix');
const prefixFilter = prefixIndex !== -1 ? args[prefixIndex + 1] : null;

const obsidianVault = path.join(os.homedir(), 'obsidian');
const contentDir = path.join(root, 'content');

let copied = 0;
let skipped = 0;
let notFound = 0;

/**
 * Find all img directories in Obsidian and copy to content/
 */
function syncImagesFromObsidian() {
  try {
    console.log(`[sync-obsidian-images] Searching for img directories in ${obsidianVault}`);
    if (prefixFilter) {
      console.log(`[sync-obsidian-images] Filter: ${prefixFilter}`);
    }

    if (!fs.existsSync(obsidianVault)) {
      console.error(`❌ Error: Obsidian vault not found at ${obsidianVault}`);
      process.exit(1);
    }

    // Find all img directories in Obsidian
    function findImgDirs(dir, relPath = '') {
      const results = [];
      if (!fs.existsSync(dir)) return results;

      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;

        const full = path.join(dir, entry.name);
        const rel = relPath ? `${relPath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          if (entry.name === 'img' || entry.name.includes('img')) {
            results.push({ dir: full, relPath: rel });
          }
          results.push(...findImgDirs(full, rel));
        }
      }
      return results;
    }

    const obsidianImgDirs = findImgDirs(obsidianVault);
    console.log(`[sync-obsidian-images] Found ${obsidianImgDirs.length} img directory(ies) in Obsidian`);

    // Copy images
    for (const { dir: obsidianDir, relPath } of obsidianImgDirs) {
      // Skip if prefix filter doesn't match
      if (prefixFilter && !relPath.includes(prefixFilter)) {
        continue;
      }

      // Map Obsidian path to content path
      // obsidian/{category}/{...}/img → content/{category}/{...}/img
      const imgPathIndex = relPath.lastIndexOf('img');
      if (imgPathIndex === -1) continue;

      const category = relPath.split('/')[0];
      const pathAfterCategory = relPath.substring(category.length + 1);
      const contentDirPath = path.join(contentDir, category, pathAfterCategory);

      if (!fs.existsSync(obsidianDir)) {
        console.log(`[skip] Directory not found: ${relPath}`);
        notFound++;
        continue;
      }

      // Copy files
      for (const file of fs.readdirSync(obsidianDir)) {
        const srcFile = path.join(obsidianDir, file);
        const destFile = path.join(contentDirPath, file);

        if (!fs.statSync(srcFile).isFile()) continue;

        if (isDryRun) {
          console.log(`[copy] (dry-run) ${relPath}/${file}`);
          copied++;
        } else {
          // Check if file already exists and is identical
          let shouldCopy = true;
          if (fs.existsSync(destFile)) {
            const srcStat = fs.statSync(srcFile);
            const destStat = fs.statSync(destFile);
            if (srcStat.size === destStat.size && srcStat.mtimeMs === destStat.mtimeMs) {
              skipped++;
              shouldCopy = false;
            }
          }

          if (shouldCopy) {
            fs.mkdirSync(path.dirname(destFile), { recursive: true });
            fs.copyFileSync(srcFile, destFile);
            console.log(`[✓] ${relPath}/${file}`);
            copied++;
          }
        }
      }
    }

    console.log(`\n[sync-obsidian-images] Results:`);
    console.log(`  Copied: ${copied}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Not found: ${notFound}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
syncImagesFromObsidian();
