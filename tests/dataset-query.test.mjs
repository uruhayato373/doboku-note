/**
 * 台帳の id でデータを一覧・取得・絞り込む入口（DN-0585）のテスト。
 *
 * 守りたい事故:
 *   A. 行の取り出しを読み違え、絞り込みが 0 件を返す（対応表を行として読めない・入れ子の欄を見ない）。
 *   B. Drive にしか無いデータが手元に無いとき、0 件を「該当なし」と区別できない。
 *   C. 台帳に無い id・別のデータセットのファイルを黙って読む。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { getDataset, listDataset, parseWhere, queryDataset, rowsOf } from '../scripts/lib/dataset-query.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

test('rowsOf: 配列・オブジェクトの配列の欄・対応表を行として読む（A）', () => {
  assert.deepEqual(rowsOf([{ a: 1 }]).rows, [{ a: 1 }]);
  const withArray = { _doc: 'x', meta: { a: 1 }, entries: [{ id: 'p' }, { id: 'q' }], tags: ['a', 'b', 'c'] };
  assert.equal(rowsOf(withArray).rowsPath, 'entries', '文字列の配列より、オブジェクトの配列を行にする');
  const map = { schemaVersion: 1, books: { b1: { gap: 0 }, b2: { gap: 3 } } };
  const r = rowsOf(map);
  assert.equal(r.rowsPath, 'books');
  assert.deepEqual(r.rows, [{ _key: 'b1', gap: 0 }, { _key: 'b2', gap: 3 }]);
  assert.deepEqual(rowsOf({ nested: { list: [{ x: 1 }] } }, 'nested.list').rows, [{ x: 1 }]);
  assert.throws(() => rowsOf({ a: 1 }, 'missing'), /配列も対応表も無い/);
});

test('parseWhere: 欄=値・欄!=値・欄~値 を解き、書き方の違いは止める', () => {
  assert.deepEqual(parseWhere('verdict.gap=0'), { path: 'verdict.gap', op: '=', value: '0' });
  assert.deepEqual(parseWhere('status!=done'), { path: 'status', op: '!=', value: 'done' });
  assert.deepEqual(parseWhere('id~civil'), { path: 'id', op: '~', value: 'civil' });
  assert.throws(() => parseWhere('no-operator'), /書き方が違う/);
});

test('queryDataset: 実在の台帳を入れ子の欄・否定・部分一致で絞る（A）', () => {
  const all = queryDataset(REPO_ROOT, 'config.qualification-registry', { where: [], limit: 1000 });
  assert.ok(all.total >= 20, `資格の台帳の行が少なすぎる（${all.total}）`);
  const civil = queryDataset(REPO_ROOT, 'config.qualification-registry', { where: ['id~civil'], limit: 1000 });
  assert.ok(civil.total > 0 && civil.total < all.total);
  assert.ok(civil.rows.every((r) => r.id.includes('civil')));
  const notCivil = queryDataset(REPO_ROOT, 'config.qualification-registry', { where: ['id!=civil-construction-1'], limit: 1000 });
  assert.equal(notCivil.total, all.total - 1);
  const judged = queryDataset(REPO_ROOT, 'state.book-coverage', { where: ['verdict.gap=0'] });
  assert.equal(judged.rowsPath, 'books');
  assert.ok(judged.rows.every((r) => r.verdict?.gap === 0), '数値の 0 を文字列の "0" と同じに比べる');
});

test('listDataset / getDataset: Drive にしか無いものは取り戻し方を返し、ほかのデータセットのファイルは読まない（B・C）', () => {
  const vault = listDataset(REPO_ROOT, 'vault.book-coverage-verdict');
  assert.equal(vault.drive, 'reference-book-coverage');
  if (vault.files.length === 0) assert.match(vault.hint, /--pull --group reference-book-coverage --commit/);
  const state = listDataset(REPO_ROOT, 'state.book-coverage');
  assert.equal(state.files.length, 1);
  assert.ok(state.files[0].rows > 0);
  assert.throws(() => getDataset(REPO_ROOT, 'state.book-coverage', { file: 'package.json' }), /このデータセットのファイルではない/);
  assert.throws(() => listDataset(REPO_ROOT, 'no.such-dataset'), /台帳に無いデータセット/);
});
