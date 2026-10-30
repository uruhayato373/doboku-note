/**
 * ASP の提携一覧・詳細ページの読み取り（scripts/lib/asp-list-readers.mjs）。
 * 2026-10-30 に affiliate:status が A8・もしもで 0 件を返した事故（DN-0921）をケース化する。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractListIds, pagedPath, parseDetailStatus } from '../scripts/lib/asp-list-readers.mjs';
import { getAsp, loadAspConfig } from '../scripts/lib/asp-browser.mjs';

test('A8 の一覧の文字からプログラム ID を拾い、描画前の「該当なし」からは何も拾わない', () => {
  const before = '参加中プログラム\n指定なし\nプログラムを検索\n\n検索条件に一致するプログラムがありません。';
  assert.equal(extractListIds(before, 's000\\d{11}').size, 0);
  const after = 'ビルドジョブ\n提携日\n2026/06/12\nプログラムID\ts00000024757004\n建設JOBs\nプログラムID\ts00000023057002\n';
  assert.deepEqual([...extractListIds(after, 's000\\d{11}')], ['s00000024757004', 's00000023057002']);
});

test('afb の 【PID:N】 は捕捉グループの中身を ID にする', () => {
  assert.deepEqual([...extractListIds('【PID:14065】専門転職\n企業\n', '^【PID:(\\d+)】\\s*(.*)$')], ['14065']);
});

test('ページ送りはクエリに番号と件数を載せ、既存のクエリを残す', () => {
  const paging = { pageParam: 'pageNo', sizeParam: 'pageSize', pageSize: 100, maxPages: 10 };
  assert.equal(pagedPath('/program/list/partnered', paging, 2), '/program/list/partnered?pageNo=2&pageSize=100');
  assert.equal(pagedPath('/x?rel=1', paging, 1), '/x?rel=1&pageNo=1&pageSize=100');
  assert.equal(pagedPath('/x?rel=1', undefined, 3), '/x?rel=1');
});

test('もしもの詳細はバッジ（成果XXXX円 の次の行）で読み、凡例・絞り込みの語に釣られない', () => {
  const opts = { anchor: 'プロモーション詳細', applyLabel: '提携申請する' };
  const nav = '提携中プロモーション\n申請中\n提携中\n否認中\n';
  assert.equal(parseDetailStatus(`${nav}プロモーション詳細\n建築転職\n成果16,000円\n提携中\n`, opts), 'approved');
  assert.equal(parseDetailStatus(`${nav}プロモーション詳細\nMyVision\n成果18000円\n申請中\n`, opts), 'applying');
  assert.equal(parseDetailStatus(`${nav}プロモーション詳細\n某社\n成果5,000円\n提携申請する\n`, opts), 'none');
  // バッジも申請ボタンも無い＝読めていない（none にしない）
  assert.equal(parseDetailStatus(`${nav}ログイン`, opts), null);
});

test('設定: A8 は ID の正規表現とページ送り、もしもは詳細ページを持つ', () => {
  const root = loadAspConfig();
  const a8 = getAsp(root, 'a8');
  assert.ok(new RegExp(a8.listIdPattern).test('s00000024757004'));
  assert.ok(a8.listPaging.pageSize >= 100);
  assert.match(getAsp(root, 'moshimo').detailPath, /\{id\}/);
  assert.ok(getAsp(root, 'afb').siteSelectName, 'afb はサイト切替のあとフォームを送る');
});
