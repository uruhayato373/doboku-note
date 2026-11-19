// DN-1199: 読めない行間と、実データ由来の幾何監査の誤検出を固定する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSvg, detectSvgIssues } from '../scripts/check-mdx/rules/svg/detect.mjs';
const issues = (body) => detectSvgIssues(parseSvg(`<svg viewBox="0 0 400 500">${body}</svg>`));
const overlaps = (body) => issues(body).filter(f => f.pattern === 'P2-text-overlap');
const pair = (y, x = 20, size = 11) => `<text x="20" y="50" font-size="11">行間の確認</text><text x="${x}" y="${y}" font-size="${size}">次の行です</text>`;

test('figure-3-18: 旧座標350/358の行間をMEDIUMで1件検出し、修正後は解消', () => {
  const source = readFileSync(new URL('../content/site/civil-construction-1/textbook-network-schedule/img/figure-3-18.svg', import.meta.url), 'utf8');
  const old = source.replace(/y="\d+"( class="rule-body">手順2:)/, 'y="358"$1');
  const findings = detectSvgIssues(parseSvg(old)).filter(f => f.pattern === 'P2-text-overlap');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'MEDIUM');
  assert.match(findings[0].detail, /プロジェクト工期.*手順2/);
  assert.equal(detectSvgIssues(parseSvg(source)).filter(f => f.pattern === 'P2-text-overlap').length, 0);
});
test('1.2emの正常な2行は検出しない', () => assert.equal(overlaps(pair(63.2)).length, 0));
test('同じ行の横並びは検出しない', () => assert.equal(overlaps(pair(50, 100)).length, 0));
test('既存bbox規則と行間規則は二重計上しない', () => assert.equal(overlaps(pair(55)).length, 1));
test('0.95emの境界は検出せず、その内側は検出する', () => {
  assert.equal(overlaps(pair(60.45)).length, 0);
  assert.equal(overlaps(pair(60.4)).length, 1);
});
test('大見出し22pxと補足11pxの15px間隔を誤検出しない', () => {
  assert.equal(overlaps('<text x="100" y="87" font-size="22">A</text><text x="100" y="102" font-size="11">働き方</text>').length, 0);
});
test('親gの回転を継承し、未対応の回転bboxを重なり扱いしない', () => {
  assert.equal(overlaps(`<g transform="rotate(90)">${pair(55)}</g>`).length, 0);
});
test('textセレクタのサイズ・中央揃えとクラスによる上書きを解釈する', () => {
  const svg = parseSvg('<svg><style>text{font-size:14px;text-anchor:middle}.s{font-size:11px;text-anchor:start}</style><text x="100" y="20">中央</text><text x="20" y="40" class="s">左</text></svg>');
  assert.deepEqual(svg.texts.map(t=>[t.fontSize,t.textAnchor]), [[14,'middle'],[11,'start']]);
});
test('rect/circleとtextにネストしたtranslateを共通適用する', () => {
  const svg = parseSvg('<svg><g transform="translate(100,200)"><g transform="translate(10,20)"><rect x="0" y="0" width="80" height="30"/><circle cx="40" cy="15" r="12"/><text x="20" y="20">文字</text></g></g></svg>');
  assert.deepEqual(svg.rects[0], {x:110,y:220,w:80,h:30,area:2400});
  assert.deepEqual(svg.circles[0], {cx:150,cy:235,r:12});
  assert.equal(svg.texts[0].x, 130);
  assert.equal(svg.texts[0].y, 240);
});
test('枠の外の矢印を内部ラベルのはみ出しとしない', () => {
  assert.equal(issues('<rect x="20" y="20" width="100" height="30"/><text x="60" y="61" font-size="14">▼</text>').filter(f=>f.pattern==='P9-text-rect-overflow').length, 0);
});
test('枠内部からの右端・下端はみ出しは引き続き検出する', () => {
  const f = issues('<rect x="20" y="20" width="60" height="30"/><text x="25" y="50" font-size="14">枠からはみ出す文字</text>');
  assert.equal(f.filter(f=>f.pattern==='P9-text-rect-overflow').length, 2);
});
test('行間補完は横の重なりが短い方の30%以下なら検出しない', () => {
  const body='<text x="0" y="50" font-size="11">abcdefghij</text><text x="48" y="58" font-size="11">abcdefghij</text>';
  assert.equal(overlaps(body).length, 0);
});
test('行間補完は横の重なりが6px以下なら検出しない', () => {
  assert.equal(overlaps('<text x="0" y="50" font-size="11">A</text><text x="1" y="58" font-size="11">B</text>').length, 0);
});
