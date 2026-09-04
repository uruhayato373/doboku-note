import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(ROOT + rel, 'utf8').replace(/\r\n/g, '\n');

test('L1は技術士第一次試験の公開済み入口を1件だけ持つ', () => {
  const body = read('content/note/共通/コンテンツ総合案内/article.md');
  const url = 'https://note.com/dobokunote/n/n466132e6fd74';
  assert.equal(body.split(url).length - 1, 2, '資格節と目的別逆引きに1件ずつ必要');
  assert.match(body, /## 技術士 第一次試験/);
  assert.doesNotMatch(body, /準備中/);
});

const L2_CASES = [
  {
    file: 'content/note/技術士総監/総監もくじ/article.md',
    free: 'https://note.com/dobokunote/n/n3d73729e6cc7',
    paid: 'https://note.com/dobokunote/m/m6e7de5e4ea3d',
  },
  {
    file: 'content/note/技術士建設部門/建設部門もくじ/article.md',
    free: 'https://note.com/dobokunote/n/n2d5a97eb6c3e',
    paid: 'https://note.com/dobokunote/m/m0f3bc3933454',
  },
  {
    file: 'content/note/1級・2級土木/土木もくじ/article.md',
    free: 'https://note.com/dobokunote/n/nd1c0e564ef10',
    paid: 'https://note.com/dobokunote/m/md29a34906314',
  },
];

for (const { file, free, paid } of L2_CASES) {
  test(`L2の最初の選択肢は無料の現在地確認: ${file}`, () => {
    const body = read(file);
    const decisionStart = body.indexOf('## 無料で現在地を確認してから選ぶ');
    assert.ok(decisionStart >= 0, '現在地確認の見出しがない');
    const decision = body.slice(decisionStart);
    assert.ok(decision.indexOf(free) >= 0, '無料入口がない');
    assert.ok(decision.indexOf(paid) >= 0, '有料入口がない');
    assert.ok(decision.indexOf(free) < decision.indexOf(paid), '有料入口が無料入口より先にある');
  });
}
