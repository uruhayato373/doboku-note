import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRccmEssay, countEssayChars, usedKeywords, sectionOf } from '../scripts/lib/rccm-essay.mjs';

/**
 * RCCM 問題III の出題条件（1,200〜1,600 字・指定用語「」4 語以上）を機械化した判定の契約を固定する。
 */
const KW = ['老朽化', '人口減少', '地方公共団体', '広域連携', '官民連携', '新技術'];
const fm = (over = {}) => ({ rccmKeywords: KW, paidBoundary: '模範論文', ...over });
const jp = (n) => 'あ'.repeat(n);

function article({ essay, extraH2 = '' }) {
  return `# 見出し\n\n本文です。\n\n## テーマの読み解き\n\n解説。\n\n## 模範論文\n\n### ① 現状と課題\n\n${essay.a}\n\n### ② あり方\n\n${essay.b}\n\n## 指定用語の使用チェック\n\n表。\n${extraH2}`;
}

test('pass: 1,450 字・「」5 語・①② あり', () => {
  const a = `「老朽化」と「人口減少」が進む「地方公共団体」では${jp(600)}`;
  const b = `「広域連携」と「官民連携」で${jp(780)}`;
  const r = evaluateRccmEssay(article({ essay: { a, b } }), fm());
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.keywordsUsed.length, 5);
  assert.ok(r.essayChars >= 1400 && r.essayChars <= 1550, String(r.essayChars));
});

test('fail: 字数 1,200 未満・1,600 超', () => {
  const short = evaluateRccmEssay(article({ essay: { a: `「老朽化」「人口減少」「地方公共団体」「広域連携」${jp(300)}`, b: jp(300) } }), fm());
  assert.ok(short.errors.some((e) => e.startsWith('H1')));
  const long = evaluateRccmEssay(article({ essay: { a: `「老朽化」「人口減少」「地方公共団体」「広域連携」${jp(900)}`, b: jp(900) } }), fm());
  assert.ok(long.errors.some((e) => e.startsWith('H1')));
});

test('fail: 指定用語「」が 4 語未満（「」無しの語は数えない・重複は 1 語）', () => {
  const a = `老朽化と人口減少が進む「地方公共団体」では「広域連携」が${jp(650)}`;
  const b = `「広域連携」を重ね「官民連携」で${jp(700)}`;
  const r = evaluateRccmEssay(article({ essay: { a, b } }), fm());
  assert.deepEqual(r.keywordsUsed, ['地方公共団体', '広域連携', '官民連携']);
  assert.ok(r.errors.some((e) => e.startsWith('H2')));
});

test('strict: 4 語ちょうど・推奨帯外は --strict で違反、既定では警告', () => {
  const a = `「老朽化」「人口減少」「地方公共団体」「広域連携」${jp(600)}`;
  const b = jp(640); // 合計 ≈1,260 字（条件内・推奨帯外）
  const lax = evaluateRccmEssay(article({ essay: { a, b } }), fm());
  assert.deepEqual(lax.errors, []);
  assert.equal(lax.warnings.length, 2);
  const strict = evaluateRccmEssay(article({ essay: { a, b } }), fm(), { strict: true });
  assert.equal(strict.errors.length, 2);
  assert.deepEqual(strict.warnings, []);
});

test('fail: 問題再現節・paidBoundary 欠落・①②欠落・模範論文節なし', () => {
  const a = `「老朽化」「人口減少」「地方公共団体」「広域連携」「官民連携」${jp(650)}`;
  const b = jp(700);
  const repro = evaluateRccmEssay(article({ essay: { a, b }, extraH2: '\n## 試験問題\n\n転載。\n' }), fm());
  assert.ok(repro.errors.some((e) => e.startsWith('H4')));
  const noBoundary = evaluateRccmEssay(article({ essay: { a, b } }), fm({ paidBoundary: '存在しない見出し' }));
  assert.ok(noBoundary.errors.some((e) => e.startsWith('H5')));
  const noMarks = evaluateRccmEssay(`# t\n\n## 模範論文\n\n${a}\n\n${b}\n`, fm());
  assert.ok(noMarks.errors.some((e) => e.startsWith('H3')));
  const noSection = evaluateRccmEssay('# t\n\n## 解説\n\n本文', fm());
  assert.ok(noSection.errors.some((e) => e.startsWith('H1')));
});

test('helpers: 節の切り出しは次の H2 直前まで、字数は見出し・空白を除く', () => {
  const body = '## 模範論文\n\n### ① a\n\nあい う\n\n## 次\n\nかき';
  assert.equal(sectionOf(body, '模範論文'), '\n### ① a\n\nあい う\n');
  assert.equal(countEssayChars(sectionOf(body, '模範論文')), 3);
  assert.deepEqual(usedKeywords('「老朽化」と「未登録」と「人口減少」', KW), ['老朽化', '人口減少']);
});
