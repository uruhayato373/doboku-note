import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

/**
 * pre-commit フックの「壊れたゲート」を機械で止める。
 *
 * 守りたい事故:
 *   node を 2 本連ねて `if [ $? -ne 0 ]` を 1 回しか置かないと、**前者の exit code が捨てられる**。
 *   検査は毎回走って赤い出力を出すのに commit は通る＝ゲートが無いのと同じ。
 *   - 2026-08-13 `check-affiliate-prose` で発生（旧フックのコメントに記録）
 *   - 2026-08-18 `check-orphan-figures` で再発（`check-table-references` を足したときに混入）
 *   - 同日に `check-note-boundary` でも同型が残存していたことが判明（有料境界の全ロック/漏洩ゲート）
 *
 * DN-0688 でフック本文は「1 プロセスのディスパッチャを exec する」だけになった。検査の一覧と止め方は
 * scripts/lib/pre-commit-steps.mjs にあり、**exit code を捨てる経路が構造的に無い**（dispatch が全検査の戻り値を
 * isFailure に通し、最初の失敗で止める）。旧フックとの判定の一致は tests/pre-commit-dispatch.test.mjs。
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

test('フック本文は 1 プロセスのディスパッチャを exec するだけ（検査の列挙をシェルに戻さない）', () => {
  const lines = hookBody();
  const code = lines.filter((l) => l.trim() && !l.trim().startsWith('#'));
  assert.deepEqual(code, ['exec node scripts/pre-commit-dispatch.mjs'], `フック本文に検査の行が戻っている:\n${code.join('\n')}`);
  assert.ok(existsSync(join(ROOT, 'scripts/pre-commit-dispatch.mjs')), 'ディスパッチャが無い');
});

test('ディスパッチャは各検査の戻り値を isFailure に通し、最初の失敗で止める（exit code を捨てない）', () => {
  const src = readFileSync(join(ROOT, 'scripts/pre-commit-dispatch.mjs'), 'utf8');
  assert.match(src, /const \{ code, captured \} = await exec\(step, argv\);/);
  assert.match(src, /if \(!isFailure\(step, code\)\) continue;/);
  assert.match(src, /return \{ code: 1, ran, failed: step\.id \};/);
});

test('フックの鮮度ガード（drift guard）が残っている', () => {
  const src = readFileSync(join(ROOT, 'scripts/install-pre-commit.mjs'), 'utf8');
  // これが消えると、フック本文を編集しても再インストールされないまま古い検査で commit が通る。
  assert.match(src, /createHash\(['"]sha256['"]\)/, 'sha256 の drift guard が消えている');
  assert.match(src, /pre-commit:install/, '再インストールの案内が消えている');
});
