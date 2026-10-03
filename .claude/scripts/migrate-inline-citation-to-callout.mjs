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

import { join, relative } from 'node:path';
import { transformMdxFile } from './lib/mdx-io.mjs';
import { listFiles } from '../../scripts/lib/fs-walk.mjs';
import { REPO_ROOT, SITE_CONTENT_ROOT } from '../../scripts/lib/repository-paths.mjs';

const ROOT = join(SITE_CONTENT_ROOT, 'pe-comprehensive-management');

const files = listFiles(ROOT, { ext: '.mdx', followLinks: true });
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
    console.log(`  ${relative(REPO_ROOT, file).split('\\').join('/')}: ${countInFile} replacements`);
    totalReplaced += countInFile;
    changedFiles.push(file);
  }
}

console.log(`\nTotal: ${totalReplaced} replacements across ${changedFiles.length} files`);
