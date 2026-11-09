// note へ書き込むスクリプトが、ブラウザ操作の前にアカウント確認（assertAccountGate）を通し、結果を見て止まることを確かめる（DN-1009）。
// 別アカウントのまま価格・マガジン・収録・本文を書き換える経路を残さない。
// note-edit-session は画面を開いて待つだけで、編集と保存は人が行うので対象外。
// 26 本への全面移行は別カードで、ここは確認を入れた書き込みスクリプトが確認を失わないことだけを見る。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const WRITERS = [
  'note-article-price-sweep.mjs',
  'note-edit-magazine.mjs',
  'note-magazine-add-articles.mjs',
  'note-magazine-remove-articles.mjs',
  'note-convert-to-paid.mjs',
  'note-magazine-cover.mjs',
  'note-replace-intro.mjs',
];

// assertAccountGate は失敗しても投げず { ok: false } を返す。結果の ok を見ていない呼び出しは確認にならない
const ASSIGNED_AND_CHECKED = /(?:const|let)\s+(\w+)\s*=\s*await assertAccountGate\([^;]*;[\s\S]{0,200}?if\s*\(\s*!\s*\1\.ok\s*\)/;
const INLINE_CHECKED = /if\s*\(\s*!\s*\(\s*await assertAccountGate\(/;
const DISCARDED = /^\s*await assertAccountGate\(/m;

for (const name of WRITERS) {
  test(`${name} はアカウント確認の結果を見て、失敗したら止まる`, () => {
    const src = readFileSync(join(REPO_ROOT, 'scripts', name), 'utf8');
    assert.match(src, /import \{[^}]*assertAccountGate[^}]*\} from '\.\/lib\/note-browser\.mjs'/, 'assertAccountGate を import していない');
    assert.ok(ASSIGNED_AND_CHECKED.test(src) || INLINE_CHECKED.test(src), 'assertAccountGate の結果（ok）を見ていない＝別アカウントでも先へ進む');
    assert.equal(src.match(DISCARDED), null, '結果を捨てている assertAccountGate の呼び出しがある');
  });
}
