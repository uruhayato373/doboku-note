// 同じ見た目・同じ判定を 1 か所にまとめた後の再発止め（2026-11-17 アトミックデザインの棚卸し）。
//   - 年度コードの表示・並べ順は src/lib/exam-year.mjs、記事の種類のラベルは src/lib/doc-kind.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { test } from 'node:test';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { listFiles } from '../scripts/lib/fs-walk.mjs';

const srcFiles = () => listFiles(`${REPO_ROOT}/src`).filter((f) => /\.(tsx?|mjs)$/.test(f)).map((f) => ({ rel: relative(REPO_ROOT, f).split('\\').join('/'), src: readFileSync(f, 'utf8') }));

const RULES = [
  { name: '年度コードの表示（examYearLabel を使う）', re: /['"`]令和['"`]|令和\$\{|'令和元年度'/, owner: 'src/lib/exam-year.mjs' },
  { name: '年度コードの並べ順（examYearRank を使う）', re: /startsWith\(['"]r['"]\)\s*\?\s*1?00/, owner: 'src/lib/exam-year.mjs' },
  { name: '記事の種類のラベル（docKindLabel を使う）', re: /['"]受験ガイド['"]\s*,\s*textbook\s*:|guide\s*:\s*['"]受験ガイド['"]/, owner: 'src/lib/doc-kind.ts' },
];

for (const rule of RULES) {
  test(`1 か所だけ: ${rule.name}`, () => {
    const files = srcFiles();
    const hits = files.filter((f) => f.rel !== rule.owner && rule.re.test(f.src)).map((f) => f.rel);
    console.log(`[dedupe] ${rule.name}: 検査 ${files.length} ファイル・複製 ${hits.length}`);
    assert.ok(files.length > 100, `検査したファイルが少なすぎる（${files.length}）`);
    assert.deepEqual(hits, [], `${rule.owner} の部品・関数を使う:\n${hits.join('\n')}`);
  });
}
