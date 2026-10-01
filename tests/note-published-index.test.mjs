/**
 * note 記事カタログ（.claude/state/note-published.json）生成のテスト。
 *
 * 守りたい事故: カタログが手動実行だけで 09-08 から古いまま残り、エージェントが
 *   古い URL・価格・公開状態を読んで迷った（2026-10-02）。生成物の鮮度は
 *   check-generated-indexes が見るので、ここでは行の作り方を固定する。
 *   - items は「noteUrl あり＝公開済み」の意味を保つ（消費側がそう読む）
 *   - noteMagazine ラベルは単独マガジンとパックの両方へ解く
 *   - 不正な日付・価格表記で落ちない
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { magazineResolver, toItem } from '../.claude/scripts/build-note-published-index.mjs';
import { parseSoT } from '../scripts/check-magazine-membership.mjs';

const resolve = magazineResolver({
  labels: { 'A-本体': 'a-magazine', 'B-本体': 'b-magazine' },
  packs: { 'ab-pack': { labels: ['A-本体', 'B-本体'] }, 'a-only-pack': { labels: ['A-本体'] } },
});

test('ラベルは単独マガジンと、そのラベルを束ねるパックの両方へ解く', () => {
  assert.deepEqual(resolve('A-本体'), ['a-magazine', 'ab-pack', 'a-only-pack']);
  assert.deepEqual(resolve('B-本体'), ['b-magazine', 'ab-pack']);
  assert.deepEqual(resolve('未登録'), []);
  assert.deepEqual(resolve(null), []);
});

test('マガジン配下の記事は資格・マガジン dir・解決済みマガジンを持つ', () => {
  const item = toItem({
    slug: '技術士総監/magazines/模範論文/01-序章',
    path: 'content/note/技術士総監/magazines/模範論文/01-序章/article.md',
    data: { noteUrl: 'https://note.com/dobokunote/n/n1', noteId: 'n1', noteStatus: 'published', notePricing: 'paid', price: '¥1,480', noteMagazine: 'A-本体', notePublishedAt: '2026-06-01' },
    content: '# 題名\n本文',
    resolveMagazines: resolve,
  });
  assert.equal(item.exam, '技術士総監');
  assert.equal(item.magazine, '模範論文');
  assert.equal(item.price, 1480);
  assert.equal(item.publishedAt, '2026-06-01');
  assert.equal(item.title, '題名');
  assert.deepEqual(item.magazines, ['a-magazine', 'ab-pack', 'a-only-pack']);
});

test('不正な日付・価格は null、H1 が無ければ frontmatter title', () => {
  const item = toItem({
    slug: '舗装/下書き', path: 'content/note/舗装/下書き/article.md',
    data: { notePublishedAt: 'TBD', price: '未定', title: 'fm題名' },
    content: '本文のみ', resolveMagazines: resolve,
  });
  assert.equal(item.publishedAt, null);
  assert.equal(item.price, null);
  assert.equal(item.noteUrl, null);
  assert.equal(item.title, 'fm題名');
  assert.equal('magazine' in item, false);
});

test('parseSoT はマガジンの公開状態を読む', () => {
  const src = "const MAGAZINES_RAW = {\n  'x': {\n    id: 'x-mag',\n    published: true,\n    noteUrl: 'https://note.com/dobokunote/m/mabc123',\n    title: 'X',\n  },\n  'y': {\n    id: 'y-mag',\n    published: false,\n    noteUrl: '',\n    title: 'Y',\n  },\n};";
  const sot = parseSoT(src);
  assert.equal(sot['x-mag'].published, true);
  assert.equal(sot['x-mag'].key, 'mabc123');
  assert.equal(sot['y-mag'].published, false);
});
