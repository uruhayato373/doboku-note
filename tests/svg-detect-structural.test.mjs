// tests/svg-detect-structural.test.mjs
//
// P13/P14/P15（SVG 構造互換性）の回帰テスト。
// - P13: <foreignObject> 検出
// - P14: @font-face / 外部 http(s) href 検出。xmlns 名前空間は誤検知しない（回帰の要）
// - P15: viewBox 欠落検出（既存の早期 return 動作は不変）

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  detectStructuralIssues,
  detectSvgIssues,
  parseSvg,
} from '../.claude/skills/quality/check-mdx/scripts/rules/svg/detect.mjs';

const patterns = (findings) => findings.map((f) => f.pattern);

test('P13: foreignObject を HIGH で検出', () => {
  const svg = '<svg viewBox="0 0 400 500"><foreignObject><div>x</div></foreignObject></svg>';
  const f = detectStructuralIssues(svg);
  const p13 = f.find((x) => x.pattern === 'P13-foreign-object');
  assert.ok(p13, 'P13 が検出される');
  assert.equal(p13.severity, 'HIGH');
});

test('P14: @font-face を HIGH で検出', () => {
  const svg = '<svg viewBox="0 0 400 500"><style>@font-face{font-family:x;src:url(x.woff)}</style></svg>';
  assert.ok(patterns(detectStructuralIssues(svg)).includes('P14-external-font'));
});

test('P14: 外部 http href を検出', () => {
  const svg = '<svg viewBox="0 0 400 500"><image href="https://example.com/a.png"/></svg>';
  assert.ok(patterns(detectStructuralIssues(svg)).includes('P14-external-ref'));
});

test('P14: xmlns 名前空間宣言は誤検知しない（回帰）', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 400 500"><text>ok</text></svg>';
  assert.deepEqual(detectStructuralIssues(svg), [], 'xmlns だけなら構造 finding は空');
});

test('健全な SVG は構造 finding を出さない', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="10" height="10"/></svg>';
  assert.deepEqual(detectStructuralIssues(svg), []);
});

test('P15: viewBox 欠落を MEDIUM で検出し早期 return する', () => {
  const svg = parseSvg('<svg role="img" aria-label="a" style="max-width:400px;width:100%"><text x="0" y="0">t</text></svg>');
  const f = detectSvgIssues(svg);
  const p15 = f.find((x) => x.pattern === 'P15-missing-viewbox');
  assert.ok(p15, 'P15 が検出される');
  assert.equal(p15.severity, 'MEDIUM');
  // 早期 return: viewBox 依存の P1（text-clip）等は出ない
  assert.ok(!patterns(f).includes('P1-text-clip'));
});

test('P15: viewBox があれば P15 を出さない', () => {
  const svg = parseSvg('<svg role="img" aria-label="a" viewBox="0 0 400 500" style="max-width:400px;width:100%"><text x="0" y="0">t</text></svg>');
  assert.ok(!patterns(detectSvgIssues(svg)).includes('P15-missing-viewbox'));
});
