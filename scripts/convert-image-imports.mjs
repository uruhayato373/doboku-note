/**
 * Script to convert Docusaurus image import patterns to static paths.
 *
 * Pattern A: import + JSX reference
 *   import IMG0101 from './img/0101.png';
 *   <img src={IMG0101} ... />
 *   → <img src="/content/general/.../img/0101.png" ... />
 *
 * Pattern B: Relative path references (already work if images are in public/)
 *   <img src="./img/file.png" ... />  → already works
 *   <img src="../img/file.png" ... /> → need to resolve
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTENT_DIR = path.join(__dirname, '..', 'content');

let totalFiles = 0;
let modifiedFiles = 0;
let totalImportsRemoved = 0;
let totalRefsReplaced = 0;

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relDir = path.relative(CONTENT_DIR, path.dirname(filePath));
  const lines = content.split('\n');

  const importMap = new Map();
  const newLines = [];
  let modified = false;

  // Pass 1: Collect imports and remove import lines
  for (const line of lines) {
    const match = line.match(
      /^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/
    );
    if (match) {
      const [, varName, importPath] = match;
      if (/\.(png|jpe?g|gif|svg|webp)$/i.test(importPath)) {
        // Resolve relative to the MDX file's directory
        const resolvedPath = path.posix.join(relDir, importPath);
        importMap.set(varName, `/content/${resolvedPath}`);
        totalImportsRemoved++;
        modified = true;
        continue; // Skip this line
      }
    }
    newLines.push(line);
  }

  // Pass 2: Replace src={VARIABLE} references
  let result = newLines.join('\n');
  for (const [varName, staticPath] of importMap) {
    const regex = new RegExp(`src=\\{${varName}\\}`, 'g');
    const matches = result.match(regex);
    if (matches) {
      totalRefsReplaced += matches.length;
    }
    result = result.replace(regex, `src="${staticPath}"`);
  }

  // Pass 3: Fix relative image paths like src="./img/..." or src="../img/..."
  // These need to be absolute paths pointing to /content/...
  result = result.replace(
    /src="(\.\.?\/[^"]*(?:img|images)[^"]*\.(png|jpe?g|gif|svg|webp))"/gi,
    (match, relPath) => {
      const resolvedPath = path.posix.normalize(path.posix.join(relDir, relPath));
      modified = true;
      return `src="/content/${resolvedPath}"`;
    }
  );

  if (modified) {
    fs.writeFileSync(filePath, result, 'utf-8');
    modifiedFiles++;
  }

  totalFiles++;
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'img') {
      walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      processFile(fullPath);
    }
  }
}

walkDir(CONTENT_DIR);

console.log(`Processed ${totalFiles} MDX files`);
console.log(`Modified ${modifiedFiles} files`);
console.log(`Removed ${totalImportsRemoved} image imports`);
console.log(`Replaced ${totalRefsReplaced} variable references`);
