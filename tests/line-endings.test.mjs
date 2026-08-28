import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLineEndings } from '../scripts/lib/line-endings.mjs';

// 2026-08-28 の事故: 過去問18本の全行が \r\r\n に破損し GFM テーブルが崩壊した。
// 当時のロジック（CRLF と bare LF の混在だけを見る）が \r\r\n を見逃した回帰を固定する。

test('正常な CRLF は問題なし', () => {
  assert.equal(checkLineEndings('a\r\nb\r\nc\r\n'), null);
});

test('正常な LF は問題なし', () => {
  assert.equal(checkLineEndings('a\nb\nc\n'), null);
});

test('改行のない単一行は問題なし', () => {
  assert.equal(checkLineEndings('no line breaks at all'), null);
});

test('CRLF と LF の混在を mixed として検出する', () => {
  const issue = checkLineEndings('a\r\nb\nc\r\n');
  assert.ok(issue, '混在は検出されるべき');
  assert.equal(issue.reason, 'mixed');
});

test('\\r\\r\\n を consecutive-cr として検出する（旧ロジックが見逃していたケース）', () => {
  const content = 'a\r\r\nb\r\r\nc\r\r\n';

  // 旧ロジックの再現: \r\r\n は \r\n を部分文字列に含むため mixed 判定をすり抜けた
  const hasCRLF = content.includes('\r\n');
  const afterCRLFRemoval = content.split('\r\n').join('');
  const oldLogicDetects = hasCRLF && afterCRLFRemoval.includes('\n');
  assert.equal(oldLogicDetects, false, '旧ロジックはこのケースを見逃す（回帰の記録）');

  const issue = checkLineEndings(content);
  assert.ok(issue, '新ロジックは検出しなければならない');
  assert.equal(issue.reason, 'consecutive-cr');
});

test('\\r\\r（LF なしの連続 CR）も consecutive-cr として検出する', () => {
  const issue = checkLineEndings('a\r\rb');
  assert.ok(issue);
  assert.equal(issue.reason, 'consecutive-cr');
});

test('3 連以上の CR も検出する', () => {
  const issue = checkLineEndings('a\r\r\r\nb');
  assert.ok(issue);
  assert.equal(issue.reason, 'consecutive-cr');
});

test('連続 CR は mixed より優先して報告する（実害が大きい方を先に見る）', () => {
  // 連続 CR と bare LF の両方を含む
  const issue = checkLineEndings('a\r\r\nb\nc');
  assert.ok(issue);
  assert.equal(issue.reason, 'consecutive-cr');
});

test('message は原因が分かる文字列を含む', () => {
  assert.match(checkLineEndings('a\r\r\nb').message, /Consecutive CR/);
  assert.match(checkLineEndings('a\r\nb\nc').message, /Mixed line endings/);
});
