import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateCceEssay, yearsForTheme, renderHistory, extractHistoryBlock, syncHistoryBlock } from '../scripts/lib/cce-essay.mjs';

/**
 * コンクリート主任技士 小論文 テーマ別教材の型（SSOT answerModel）と出題履歴ブロックの同期を固定する。
 */
const history = JSON.parse(readFileSync(new URL('../.claude/config/cce-essay-history.json', import.meta.url), 'utf8'));
const jp = (n) => 'あ'.repeat(n);
const personas = history.answerModel.personas;

function article({ situation = 300, work = 350, action = 300, drop = null, extraH2 = '' } = {}) {
  const blocks = personas.filter((p) => p !== drop).map((p) => `#### ${p}\n\n${jp(work)}`).join('\n\n');
  return `# 見出し\n\n導入。\n\n## 出題傾向\n\n解説。\n${extraH2}\n## 模範答案\n\n### (1) 表題\n\n${jp(30)}\n\n### (2) 現状と課題\n\n${jp(situation)}\n\n### (3) 業務との関係・技術的取り組み\n\n${blocks}\n\n### (4) 今後の技術的対策・展望\n\n${jp(action)}\n\n## 採点者視点\n\n末尾。`;
}
const fm = (over = {}) => ({ cceEssayTheme: 'environment', cceSourceYears: yearsForTheme(history, 'environment'), paidBoundary: '模範答案', ...over });

test('pass: 型どおり・字数帯内・8 立場あり', () => {
  const r = evaluateCceEssay(article(), fm(), history);
  assert.deepEqual(r.errors, []);
  assert.equal(Object.keys(r.counts.work).length, personas.length);
});

test('fail: SSOT に無いテーマ・出題年の不一致', () => {
  assert.ok(evaluateCceEssay(article(), fm({ cceEssayTheme: 'nope' }), history).errors.some((e) => e.startsWith('H1')));
  assert.ok(evaluateCceEssay(article(), fm({ cceSourceYears: [2025] }), history).errors.some((e) => e.startsWith('H2')));
});

test('fail: 立場の欠落・字数帯外・総字数超過', () => {
  assert.ok(evaluateCceEssay(article({ drop: personas[0] }), fm(), history).errors.some((e) => e.startsWith('H5')));
  assert.ok(evaluateCceEssay(article({ situation: 100 }), fm(), history).errors.some((e) => e.startsWith('H4')));
  const long = evaluateCceEssay(article({ situation: 380, work: 450, action: 380 }), fm(), history);
  assert.ok(long.errors.some((e) => e.startsWith('H6')));
});

test('fail: 問題文の再現節・価格直書き・paidBoundary 不在', () => {
  assert.ok(evaluateCceEssay(article({ extraH2: '\n## 問題文\n\nx\n' }), fm(), history).errors.some((e) => e.startsWith('H7')));
  assert.ok(evaluateCceEssay(article({ extraH2: '\n価格は¥1,480です。\n' }), fm(), history).errors.some((e) => e.startsWith('H8')));
  assert.ok(evaluateCceEssay(article(), fm({ paidBoundary: '存在しない節' }), history).errors.some((e) => e.startsWith('H9')));
});

test('出題年: environment は R2・R3・R5・R7 と SDGs の R4 を含む', () => {
  const ys = yearsForTheme(history, 'environment');
  for (const y of [2020, 2021, 2022, 2023, 2025]) assert.ok(ys.includes(y), String(y));
  assert.ok(!ys.includes(2024));
});

test('履歴ブロック: note(list)・MDX(table) とも SSOT から生成し冪等', () => {
  const note = 'a\n<!-- cce-essay-history:start since=2020 format=list -->\n古い\n<!-- cce-essay-history:end -->\nb';
  const s1 = syncHistoryBlock(note, history);
  assert.ok(s1.includes('- **R7（2025）**'));
  assert.ok(!s1.includes('H30'));
  assert.equal(syncHistoryBlock(s1, history), s1);
  const mdx = 'a\n{/* cce-essay-history:start */}\n{/* cce-essay-history:end */}\nb';
  const s2 = syncHistoryBlock(mdx, history);
  assert.equal(extractHistoryBlock(s2).body, renderHistory(history));
  assert.ok(s2.includes('| H24（2012） |'));
});
