/**
 * content/ 配下の img/ ディレクトリを public/content/ にコピーする。
 * dev/build 実行前に自動で走るため、手動コピー忘れを防ぐ。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const contentDir = path.join(root, 'content');
const publicContentDir = path.join(root, 'public', 'content');

let copied = 0;

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
      // Skip if destination is newer or same
      if (destExists) {
        const destStat = fs.statSync(destPath);
        if (destStat.mtimeMs >= srcStat.mtimeMs && destStat.size === srcStat.size) {
          continue;
        }
      }
      fs.copyFileSync(srcPath, destPath);
      copied++;
    }
  }
}

const imgDirs = findImgDirs(contentDir);

for (const imgDir of imgDirs) {
  const rel = path.relative(contentDir, imgDir);
  const dest = path.join(publicContentDir, rel);
  copyDirSync(imgDir, dest);
}

if (copied > 0) {
  console.log(`[sync-images] ${copied} file(s) synced to public/content/`);
} else {
  console.log('[sync-images] Already up to date.');
}
