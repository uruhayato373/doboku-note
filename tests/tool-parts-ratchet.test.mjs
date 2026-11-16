// 同じ見た目・同じ判定を 1 か所にまとめた後の再発止め（2026-11-17 アトミックデザインの棚卸し）。
//   - ツールの入力欄・ラベル・「数値の根拠」の箱は src/components/tools/ToolParts.tsx
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { test } from 'node:test';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { listFiles } from '../scripts/lib/fs-walk.mjs';

const srcFiles = () => listFiles(`${REPO_ROOT}/src`).filter((f) => /\.(tsx?|mjs)$/.test(f)).map((f) => ({ rel: relative(REPO_ROOT, f).split('\\').join('/'), src: readFileSync(f, 'utf8') }));

const RULES = [
  { name: 'ツールの入力欄・ラベルの定数（TOOL_INPUT・TOOL_LABEL を使う）', re: /const (inputBase|labelBase)\s*=/, owner: 'src/components/tools/ToolParts.tsx' },
  { name: '「数値の根拠」の箱（ToolSources を使う）', re: /<p className="font-bold text-\(--ink\) mb-2">数値の根拠/, owner: 'src/components/tools/ToolParts.tsx' },
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
