// build-standards-ogp の「台帳の srcHash が一致する章は生成しない」判定の回帰ゲート（DN-0683・2026-10-11）。
// CI の checkout には ogp.png が無いので「実体があればスキップ」だけでは毎 run 全 344 章を再生成・再 upload
// していた（develop の bot commit 478 件のうち 308 件）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapterSrcHash, chapterManifestKey, skipReason } from '../scripts/build-standards-ogp.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { join } from 'node:path';

const entry = {
  target: 'chubu/common', agencyId: 'chubu', documentId: 'common', agencyName: '中部地方整備局',
  documentTitle: '土木工事共通仕様書',
  chapter: { chapterId: '1-1', chapterNumber: 1, chapterTitle: '総則', bookNumber: 1, bookTitle: '共通編' },
  outputPath: join(REPO_ROOT, 'content/site/standards-articles/chubu/common/chapters/1-1/ogp.png'),
};
const never = () => false;

test('srcHash は 16 桁の 16 進で、同じ入力なら同じ値', () => {
  const h = chapterSrcHash(entry);
  assert.match(h, /^[0-9a-f]{16}$/);
  assert.equal(chapterSrcHash({ ...entry }), h);
});

test('章名・編名・発行機関のどれかが変われば srcHash が変わる', () => {
  const h = chapterSrcHash(entry);
  assert.notEqual(chapterSrcHash({ ...entry, chapter: { ...entry.chapter, chapterTitle: '総則（改）' } }), h);
  assert.notEqual(chapterSrcHash({ ...entry, chapter: { ...entry.chapter, bookTitle: '河川編' } }), h);
  assert.notEqual(chapterSrcHash({ ...entry, agencyName: '関東地方整備局' }), h);
});

test('台帳キーはリポジトリ相対の posix パス', () => {
  assert.equal(chapterManifestKey(entry), 'content/site/standards-articles/chubu/common/chapters/1-1/ogp.png');
});

test('台帳の srcHash が一致すれば実体が無くても manifest で飛ばす', () => {
  const entries = { [chapterManifestKey(entry)]: { group: 'site-ogp-png', srcHash: chapterSrcHash(entry) } };
  assert.equal(skipReason(entry, entries, { exists: never }), 'manifest');
});

test('台帳に行が無い・srcHash が違う・group が違うときは生成する', () => {
  const key = chapterManifestKey(entry);
  assert.equal(skipReason(entry, {}, { exists: never }), null);
  assert.equal(skipReason(entry, { [key]: { group: 'site-ogp-png', srcHash: '0000000000000000' } }, { exists: never }), null);
  assert.equal(skipReason(entry, { [key]: { group: 'site-ogp-png' } }, { exists: never }), null);
  assert.equal(skipReason(entry, { [key]: { group: 'note-cover-png', srcHash: chapterSrcHash(entry) } }, { exists: never }), null);
});

test('ローカルに実体があれば local、--force なら常に生成', () => {
  const entries = { [chapterManifestKey(entry)]: { group: 'site-ogp-png', srcHash: chapterSrcHash(entry) } };
  assert.equal(skipReason(entry, entries, { exists: () => true }), 'local');
  assert.equal(skipReason(entry, entries, { force: true, exists: () => true }), null);
});
