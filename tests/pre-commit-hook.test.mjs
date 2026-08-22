import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * pre-commit フックの「壊れたゲート」を機械で止める。
 *
 * 守りたい事故:
 *   node を 2 本連ねて `if [ $? -ne 0 ]` を 1 回しか置かないと、**前者の exit code が捨てられる**。
 *   検査は毎回走って赤い出力を出すのに commit は通る＝ゲートが無いのと同じ。
 *   - 2026-08-13 `check-affiliate-prose` で発生（install-pre-commit.mjs のコメントに記録）
 *   - 2026-08-18 `check-orphan-figures` で再発（`check-table-references` を足したときに混入）
 *   - 同日に `check-note-boundary` でも同型が残存していたことが判明（有料境界の全ロック/漏洩ゲート）
 *
 * 判定は `HOOK_CONTENT_BODY` のソーステキストに対して行う。生成後のフックではなくソースを見るのは、
 * `.git/hooks/pre-commit` が未再インストールなら古い内容を持つため（drift guard と同じ理由）。
 */

function hookBody() {
  const src = readFileSync(join(ROOT, 'scripts/install-pre-commit.mjs'), 'utf8');
  const m = src.match(/const HOOK_CONTENT_BODY = `([\s\S]*?)\n`;/);
  assert.ok(m, 'HOOK_CONTENT_BODY を抽出できない（テンプレートの形が変わった＝検査不成立）');
  return m[1].split('\n');
}

test('フック内の各 node 行の直後に exit code 判定がある（$? の共有を禁じる）', () => {
  const lines = hookBody();
  let checked = 0;
  const bad = [];
  lines.forEach((l, i) => {
    if (!/^\s*node\s+scripts\//.test(l)) return;
    checked += 1;
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j += 1;
    const next = lines[j] ?? '';
    if (!next.includes('$?')) bad.push(`L${i + 1} ${l.trim()} → 次行 ${next.trim()}`);
  });
  // 検査ゼロを PASS と呼ばない（CLAUDE.md §9）
  assert.ok(checked > 30, `node 行が ${checked} 件しか無い（抽出の故障を疑う）`);
  assert.deepEqual(bad, [], `exit code が捨てられる node 行がある:\n  ${bad.join('\n  ')}`);
});

test('フックの鮮度ガード（drift guard）が残っている', () => {
  const src = readFileSync(join(ROOT, 'scripts/install-pre-commit.mjs'), 'utf8');
  // これが消えると、フック本文を編集しても再インストールされないまま古い検査で commit が通る。
  assert.match(src, /createHash\(['"]sha256['"]\)/, 'sha256 の drift guard が消えている');
  assert.match(src, /pre-commit:install/, '再インストールの案内が消えている');
});
