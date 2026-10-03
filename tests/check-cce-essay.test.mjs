import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateCceEssay, extractAnswerParts, findSharedPersonaParts, yearsForTheme, renderHistory, extractHistoryBlock, extractHistoryBlocks, syncHistoryBlock } from '../scripts/lib/cce-essay.mjs';

/**
 * コンクリート主任技士 小論文の模範答案（テーマ別・立場別）の型（SSOT answerModel）と出題履歴ブロックの同期を固定する。
 */
const history = JSON.parse(readFileSync(new URL('../config/cce-essay-history.json', import.meta.url), 'utf8'));
const jp = (n) => 'あ'.repeat(n);
const personas = history.answerModel.personas;

function article({ situation = 300, work = 350, action = 300, drop = null, extraH2 = '' } = {}) {
  const blocks = personas.filter((p) => p !== drop).map((p) => `#### ${p}\n\n${jp(work)}`).join('\n\n');
  return `# 見出し\n\n導入。\n\n## このテーマの出題実績\n\n解説。\n\n## 令和形式の答え方\n\n解説。\n${extraH2}\n## 模範答案\n\n### (1) 表題\n\n${jp(30)}\n\n### (2) 現状と課題\n\n${jp(situation)}\n\n### (3) 業務との関係・技術的取り組み\n\n${blocks}\n\n### (4) 今後の技術的対策・展望\n\n${jp(action)}\n\n## 立場別の書き分けポイント\n\n本文。\n\n## 採点者が見るポイント\n\n末尾。`;
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
  assert.ok(s1.includes('- **R7**（2025年度）'));
  assert.ok(!s1.includes('H30'));
  assert.equal(syncHistoryBlock(s1, history), s1);
  const mdx = 'a\n{/* cce-essay-history:start */}\n{/* cce-essay-history:end */}\nb';
  const s2 = syncHistoryBlock(mdx, history);
  assert.equal(extractHistoryBlock(s2).body, renderHistory(history));
  assert.ok(s2.includes('| H24（2012） |'));
});

test('履歴ブロック: 1 記事に複数・until で年度を切れる', () => {
  const t = '<!-- cce-essay-history:start since=2020 format=list -->\n<!-- cce-essay-history:end -->\nx\n<!-- cce-essay-history:start since=2012 until=2019 format=list -->\n<!-- cce-essay-history:end -->';
  const s = syncHistoryBlock(t, history);
  const [a, b] = extractHistoryBlocks(s);
  assert.ok(a.body.includes('R7') && !a.body.includes('H30'));
  assert.ok(b.body.includes('H30') && !b.body.includes('R2'));
  assert.equal(syncHistoryBlock(s, history), s);
});

test('fail: 必須 H2 の欠落・名称ゆれ', () => {
  const r = evaluateCceEssay(article().replace('## 令和形式の答え方', '## 令和の答え方'), fm(), history);
  assert.ok(r.errors.some((e) => e.startsWith('H10')));
});

test('fail: SSOT を超える出題予測の断定（規則 3-3）', () => {
  for (const s of ['今後も形を変えて出やすいと考えています。', '今後も出題を想定しておく価値があります。', 'このテーマは必ず出る。']) {
    assert.ok(evaluateCceEssay(article({ extraH2: `\n${s}\n` }), fm(), history).errors.some((e) => e.startsWith('H11')), s);
  }
  assert.ok(!evaluateCceEssay(article({ extraH2: '\nR6 と H29 の二度、選択肢に入りました。\n' }), fm(), history).errors.some((e) => e.startsWith('H11')));
});

// 立場別記事（1立場×1テーマ・cceEssayPersona）— 2026-10-03 DN-0523
function personaArticle({ title = jp(30), work = 350, action = 300, subhead = false, h2 = 'この立場の書き分けポイント' } = {}) {
  const w = subhead ? `#### ${personas[0]}\n\n${jp(work)}` : jp(work);
  return `# 見出し\n\n導入。\n\n## このテーマの出題実績\n\n解説。\n\n## 令和形式の答え方\n\n解説。\n\n## 模範答案\n\n### (1) 表題\n\n${title}\n\n### (2) 現状と課題\n\n${jp(300)}\n\n### (3) 業務との関係・技術的取り組み\n\n${w}\n\n### (4) 今後の技術的対策・展望\n\n${action}\n\n## ${h2}\n\n本文。\n\n## 採点者が見るポイント\n\n末尾。`;
}
const pfm = (over = {}) => fm({ cceEssayPersona: personas[0], ...over });

test('立場別記事 pass: 1 立場だけの (3)・立場別記事の必須 H2', () => {
  const r = evaluateCceEssay(personaArticle({ action: jp(300) }), pfm(), history);
  assert.deepEqual(r.errors, []);
  assert.equal(r.counts.work, 350);
});

test('立場別記事 fail: SSOT に無い立場・(3) の立場見出し・テーマ別の必須 H2 を流用', () => {
  assert.ok(evaluateCceEssay(personaArticle({ action: jp(300) }), pfm({ cceEssayPersona: '工場' }), history).errors.some((e) => e.startsWith('H5')));
  assert.ok(evaluateCceEssay(personaArticle({ action: jp(300), subhead: true }), pfm(), history).errors.some((e) => e.startsWith('H5')));
  assert.ok(evaluateCceEssay(personaArticle({ action: jp(300), h2: '立場別の書き分けポイント' }), pfm(), history).errors.some((e) => e.startsWith('H10')));
});

test('立場別記事 fail: 字数帯外・総字数超過', () => {
  assert.ok(evaluateCceEssay(personaArticle({ action: jp(300), work: 200 }), pfm(), history).errors.some((e) => e.startsWith('H4')));
  assert.ok(evaluateCceEssay(personaArticle({ title: jp(60), action: jp(380), work: 450 }), pfm(), history).errors.some((e) => e.startsWith('H6')));
});

test('立場別記事: 同じテーマで (1)・(4) が同じ文面の組を返し、別テーマ・別文面は返さない', () => {
  const parts = (title, action) => extractAnswerParts(personaArticle({ title, action }), history);
  const entries = [
    { file: 'a', theme: 'environment', persona: personas[0], parts: parts('表題その一', 'いうえお'.repeat(80)) },
    { file: 'b', theme: 'environment', persona: personas[1], parts: parts('表題その一', 'かきくけ'.repeat(80)) },
    { file: 'c', theme: 'environment', persona: personas[2], parts: parts('表題その三', 'かき くけ'.repeat(80)) },
    { file: 'd', theme: 'durability', persona: personas[0], parts: parts('表題その一', 'いうえお'.repeat(80)) },
  ];
  const hits = findSharedPersonaParts(entries, history).map((h) => `${h.file}-${h.other}-${h.key}`).sort();
  assert.deepEqual(hits, ['a-b-title', 'b-a-title', 'b-c-action', 'c-b-action']);
});
