// DN-0302: 埋め込み不可の URL が先頭にあっても、後ろの URL がカード化されること
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickBareUrlIndex,
  cardifyBareUrls,
  listBareUrlBlocks,
  selectBareUrlBlock,
  countEditorCards,
} from '../scripts/lib/note-cardify.mjs';

test('pickBareUrlIndex: 失敗が無ければ先頭', () => {
  assert.equal(pickBareUrlIndex(['a', 'b'], new Map()), 0);
});

test('pickBareUrlIndex: 失敗した URL の出現を飛ばす', () => {
  assert.equal(pickBareUrlIndex(['a', 'b'], new Map([['a', 1]])), 1);
});

test('pickBareUrlIndex: 同じ URL の 2 箇所目は 1 回の失敗では飛ばさない', () => {
  assert.equal(pickBareUrlIndex(['a', 'a', 'b'], new Map([['a', 1]])), 1);
});

test('pickBareUrlIndex: 全部失敗なら -1', () => {
  assert.equal(pickBareUrlIndex(['a', 'b'], new Map([['a', 1], ['b', 1]])), -1);
  assert.equal(pickBareUrlIndex([], new Map()), -1);
});

// エディタを模した page。blocks は文書順の段落（card=true はカード化済み）。
// Enter で選択中の段落がカードになる。ただし unembeddable の URL はならない。
function fakePage(urls, unembeddable) {
  const blocks = urls.map((u) => ({ text: u, card: false }));
  let selected = null;
  const bare = () => blocks.filter((b) => !b.card);
  return {
    blocks,
    async evaluate(fn, arg) {
      if (fn === listBareUrlBlocks) return bare().map((b) => b.text);
      if (fn === selectBareUrlBlock) { selected = bare()[arg] || null; return selected ? selected.text : null; }
      if (fn === countEditorCards) return blocks.filter((b) => b.card).length;
      throw new Error('unexpected evaluate');
    },
    keyboard: {
      async press(key) { if (key === 'Enter' && selected && !unembeddable.has(selected.text)) selected.card = true; },
      async type() {},
    },
  };
}

test('cardifyBareUrls: 埋め込み不可の URL を飛ばして後ろをカード化する', async () => {
  const brain = 'https://brain-market.com/a/x';
  const note = 'https://note.com/dobokunote/n/n4fde0f62dc20';
  const page = fakePage([brain, note], new Set([brain]));
  const r = await cardifyBareUrls(page, { tag: '[t]', waitMs: 1 });
  assert.equal(r.cards, 1);
  assert.deepEqual(r.failed, [brain]);
  assert.equal(r.processed, 2); // 上限 40 回まで同じ行を打ち直さない
  assert.equal(page.blocks[1].card, true);
});
