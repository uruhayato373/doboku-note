// 経験記述の字数の数え方をサイトの字数ツールとスクリプトで 1 つにする（DN-0787）。
// 以前はサイトだけが目印【〇〇】の括弧を数え、note の模範答案を貼ると記事と違う字数が出た。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { countAnswerChars } from '../src/lib/keiken-charcount.mjs';

test('目印【〇〇】の括弧は数えず、中の 〇 は数える', () => {
  assert.equal(countAnswerChars('【〇〇】工事'), 4);
  assert.equal(countAnswerChars('【○】m'), 2);
});

test('タグ・バッククォート・*・空白を除き、コードポイントで数える', () => {
  assert.equal(countAnswerChars('**品質** 管理<sup>1</sup>\n`x`'), 6);
  assert.equal(countAnswerChars('𠮷野'), 2);
});

test('サイトの字数ツールとスクリプトが同じ関数を使い、自前の定義を持たない', () => {
  for (const p of ['src/app/tools/keiken-charcount/KeikenCharcountClient.tsx', 'scripts/keiken-charcount.mjs']) {
    const src = readFileSync(p, 'utf8');
    assert.match(src, /import \{ countAnswerChars \} from ['"](?:@\/lib|\.\.\/src\/lib)\/keiken-charcount\.mjs['"]/, `${p} が共有の関数を import していない`);
    assert.doesNotMatch(src, /function countChars\s*\(/, `${p} に自前の countChars がある`);
  }
});
