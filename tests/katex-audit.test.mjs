// tests/katex-audit.test.mjs — KaTeX 監査ロジックのユニットテスト（node --test）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractMathNodes,
  auditContent,
  auditMathValue,
  safeFixMath,
  applySafeFix,
  stripFrontmatter,
  detectSingleDollarBlocks,
} from '../.claude/scripts/lib/katex-audit.mjs';

test('extractMathNodes: inline と display の両方を抽出', () => {
  const nodes = extractMathNodes('本文 $x=1$ と\n\n$$\ny=2\n$$\n');
  assert.equal(nodes.length, 2);
  assert.equal(nodes[0].type, 'inlineMath');
  assert.equal(nodes[1].type, 'math');
});

test('extractMathNodes: 対でない単独 $ は数式化しない（$100 の誤検出防止）', () => {
  assert.equal(extractMathNodes('コストは $100 です。').length, 0);
});

test('extractMathNodes: コードフェンス内の $ は数式にしない', () => {
  const body = '```\n$x=1$ はコード例\n```\n';
  assert.equal(extractMathNodes(body).length, 0);
});

test('auditMathValue: 全角演算子は unicodeTextInMathMode を出す', () => {
  const codes = auditMathValue('LCC＝C＋M', false).map((w) => w.code);
  assert.ok(codes.includes('unicodeTextInMathMode'));
});

test('auditMathValue: \\text{} で包んだ日本語は警告なし', () => {
  assert.equal(auditMathValue('\\text{合格率} = 30', false).length, 0);
});

test('auditMathValue: 正常な数式は警告ゼロ', () => {
  assert.equal(auditMathValue('x = a + b', true).length, 0);
});

test('auditContent: 全角記号を含む数式を行番号付きで検出', () => {
  const findings = auditContent('式は $LCC＝C＋M$ である。');
  assert.ok(findings.length >= 1);
  assert.equal(findings[0].code, 'unicodeTextInMathMode');
  assert.equal(findings[0].line, 1);
});

test('auditContent: frontmatter を除外し行番号を補正', () => {
  const raw = '---\ntitle: t\n---\n\n本文 $A＝B$';
  const f = auditContent(raw);
  assert.ok(f.length >= 1);
  assert.equal(f[0].line, 5); // frontmatter 4 行 + 本文 1 行目
});

test('safeFixMath: 全角演算子・% を安全に置換', () => {
  assert.equal(safeFixMath('LCC＝C＋M'), 'LCC=C+M');
  assert.equal(safeFixMath('30%'), '30\\%');
  assert.equal(safeFixMath('a−b'), 'a-b');
});

test('safeFixMath: 既に \\% の % を二重エスケープしない', () => {
  assert.equal(safeFixMath('30\\%'), '30\\%');
});

test('applySafeFix: 数式スパン内のみ置換し prose は不変', () => {
  const raw = '割合は 30% 増。式は $A＝B$ である。';
  const fixed = applySafeFix(raw);
  // prose の「30%」は不変、数式内の ＝ のみ = に
  assert.ok(fixed.includes('割合は 30% 増。'));
  assert.ok(fixed.includes('$A=B$'));
});

test('applySafeFix: 変更が無ければ null', () => {
  assert.equal(applySafeFix('正常な $x = 1$ 本文。'), null);
});

test('detectSingleDollarBlocks: 単独 $ 行を検出（$$ にすべき誤記）', () => {
  const body = 'text\n$\nx = 1\n$\nmore';
  const f = detectSingleDollarBlocks(body);
  assert.equal(f.length, 2);
  assert.equal(f[0].code, 'singleDollarBlock');
});

test('auditContent: 単独 $ ブロックを警告として拾う', () => {
  const raw = '---\ntitle: t\n---\n本文\n$\nx=1\n$';
  const codes = auditContent(raw).map((x) => x.code);
  assert.ok(codes.includes('singleDollarBlock'));
});

test('detectSingleDollarBlocks: 正常な $$ 区切りは検出しない', () => {
  assert.equal(detectSingleDollarBlocks('$$\nx=1\n$$').length, 0);
});

test('stripFrontmatter: fmLineCount を正しく数える', () => {
  const { fmLineCount, body } = stripFrontmatter('---\na: 1\nb: 2\n---\nbody');
  assert.equal(fmLineCount, 4);
  assert.equal(body, 'body');
});
