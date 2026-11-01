import test from 'node:test';
import assert from 'node:assert/strict';
import { selectShelfRow } from '../scripts/lib/kdp-shelf-match.mjs';

test('未提出本の検索で別の本が1行だけ返っても採用しない', () => {
  const book = { title: '1級土木施工管理技士 第2次検定 施工経験記述 2テーマ組合せ大全' };
  const unrelated = { shelfTitle: '技術士 総合技術監理部門 記述式 模範論文 自治体河川担当編（令和3〜7年度）', asin: 'B0HCMGB517', titleId: 'A2NF277QIFSS1A' };
  assert.equal(selectShelfRow(book, [unrelated]), null);
});

test('保存済みドラフトは内部タイトルIDで照合する', () => {
  const book = { title: '1級土木施工管理技士 第2次検定 施工経験記述 過去問模範答案集', draftAsin: 'AHA4QGG6EYJEF' };
  const row = { shelfTitle: book.title, titleId: book.draftAsin, status: 'レビュー中' };
  assert.equal(selectShelfRow(book, [row]), row);
});

test('販売中の本はASINで照合する', () => {
  const book = { title: '旧タイトル', asin: 'B0HCMGB517' };
  const row = { shelfTitle: '変更後のタイトル', asin: book.asin, status: '販売中' };
  assert.equal(selectShelfRow(book, [row]), row);
});

test('未提出本は完全な表示タイトルが一致した行を採用する', () => {
  const book = { title: '1級土木施工管理技士 第2次検定 施工経験記述 完成答案集' };
  const row = { shelfTitle: `${book.title}: 収録内容`, status: '下書き' };
  assert.equal(selectShelfRow(book, [row]), row);
});

test('タイトルが80文字で切られた行も照合する', () => {
  const book = { title: '長いタイトル'.repeat(20) };
  const row = { shelfTitle: book.title.slice(0, 80) };
  assert.equal(selectShelfRow(book, [row]), row);
});

test('同じタイトルの候補が複数なら保留する', () => {
  const book = { title: '同じタイトル' };
  assert.equal(selectShelfRow(book, [{ shelfTitle: book.title }, { shelfTitle: book.title }]), null);
});
