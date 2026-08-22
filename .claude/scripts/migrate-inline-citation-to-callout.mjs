// .claude/scripts/migrate-inline-citation-to-callout.mjs
//
// §22 インライン出典の書式を blockquote から <Callout type="reference" title="出典"> に置換する。
// 旧: > 出典: [...](URL)
// 新: <Callout type="reference" title="出典">
//     [...](URL)
//     </Callout>
//
// 対象: content/site/pe-comprehensive-management/**/article.mdx
// 改行コードは元ファイル準拠（transformMdxFile が保持）。

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { transformMdxFile } from './lib/mdx-io.mjs';

const ROOT = 'content/site/pe-comprehensive-management';

function walkMdx(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walkMdx(p));
    else if (p.endsWith('.mdx')) out.push(p);
  }
  return out;
}

const files = walkMdx(ROOT);
let totalReplaced = 0;
const changedFiles = [];

for (const file of files) {
  let countInFile = 0;
  const changed = transformMdxFile(file, (raw) => {
    let next = raw;

    // Pattern A: blockquote 出典
    next = next.replace(/^> 出典: (.+)$/gm, (_m, body) => {
      countInFile++;
      return `<Callout type="reference" title="出典">\n${body}\n</Callout>`;
    });

    // Pattern B: raw 出典: [link](url) on its own line (image attribution cases)
    next = next.replace(/^出典: (\[[^\n]+\]\([^)\n]+\))$/gm, (_m, body) => {
      countInFile++;
      return `<Callout type="reference" title="出典">\n${body}\n</Callout>`;
    });

    return next === raw ? null : next;
  });

  if (changed) {
    console.log(`  ${file}: ${countInFile} replacements`);
    totalReplaced += countInFile;
    changedFiles.push(file);
  }
}

console.log(`\nTotal: ${totalReplaced} replacements across ${changedFiles.length} files`);
