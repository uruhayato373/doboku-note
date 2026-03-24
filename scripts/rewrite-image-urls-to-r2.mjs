/**
 * MDXファイル内の画像参照を R2 URL に書き換える。
 *
 * 変換パターン:
 *   <img src="./img/xxx.png" ... />  →  <img src="https://storage.doboku-note.com/content/{dir}/img/xxx.png" ... />
 *   ![alt](./img/xxx.png)            →  ![alt](https://storage.doboku-note.com/content/{dir}/img/xxx.png)
 *
 * Usage:
 *   node scripts/rewrite-image-urls-to-r2.mjs              # 全MDXを書き換え
 *   node scripts/rewrite-image-urls-to-r2.mjs --dry-run    # プレビューのみ
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const contentDir = path.join(root, 'content');
const R2_BASE = 'https://storage.doboku-note.com/content';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

function findMdxFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMdxFiles(full));
    } else if (entry.name.endsWith('.mdx')) {
      results.push(full);
    }
  }
  return results;
}

const mdxFiles = findMdxFiles(contentDir);
let filesModified = 0;
let refsRewritten = 0;

for (const filePath of mdxFiles) {
  const original = fs.readFileSync(filePath, 'utf8');
  // Get the directory path relative to content/
  const dirRel = path.relative(contentDir, path.dirname(filePath));

  let modified = original;
  let count = 0;

  // Pattern 1: <img src="./img/xxx.png" ... />
  modified = modified.replace(
    /src="\.\/img\/([^"]+)"/g,
    (match, filename) => {
      count++;
      return `src="${R2_BASE}/${dirRel}/img/${filename}"`;
    }
  );

  // Pattern 2: ![alt](./img/xxx.png)
  modified = modified.replace(
    /\]\(\.\/img\/([^)]+)\)/g,
    (match, filename) => {
      count++;
      return `](${R2_BASE}/${dirRel}/img/${filename})`;
    }
  );

  if (count > 0) {
    if (dryRun) {
      console.log(`  ${path.relative(root, filePath)}: ${count} refs`);
    } else {
      fs.writeFileSync(filePath, modified, 'utf8');
    }
    filesModified++;
    refsRewritten += count;
  }
}

console.log(
  `\n${dryRun ? '[DRY-RUN] ' : ''}Done! Files: ${filesModified}, Refs rewritten: ${refsRewritten}`
);
