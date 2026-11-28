import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixArticle, LEAD } from '../scripts/maint/fix-note-grader-claims.mjs';

const doc = (body) => `---\ntitle: t\nnoteId: n0123456789ab\n---\n# 題名\n\n${body}\n`;

test('見出しを直し、最初の見出しの直後に前置きを 1 回だけ入れる', () => {
  const r = fixArticle(doc('本文\n\n### 採点者が見るポイント（安全管理）\n\n- a\n\n### 採点者が見るポイント（品質管理）\n\n- b'));
  assert.equal(r.changed, true);
  assert.match(r.raw, /### 答案の自己点検ポイント（安全管理）\n\n採点基準は公表されていません。/);
  assert.equal(r.raw.split(LEAD).length - 1, 1);
  assert.deepEqual(r.ops[0], { op: 'replace', from: '採点者が見るポイント', to: '答案の自己点検ポイント', count: 2 });
  assert.deepEqual(r.ops[1], { op: 'insert-after', heading: '答案の自己点検ポイント（安全管理）', text: LEAD, headings: 1, count: 1 });
});

test('2 回実行しても変わらない', () => {
  const once = fixArticle(doc('## 採点者視点でのチェックポイント\n\n- a')).raw;
  assert.equal(fixArticle(once).changed, false);
});

test('CRLF の原稿は CRLF のまま書き戻す', () => {
  const raw = doc('## 採点者視点の仕上げ\n\n- a').replace(/\n/g, '\r\n');
  const r = fixArticle(raw);
  assert.equal(r.raw.includes('\r\n'), true);
  assert.equal(/[^\r]\n/.test(r.raw), false);
});

test('お詫びと訂正の節に対象の語がある記事は直さない', () => {
  const r = fixArticle(doc('## お詫びと訂正\n\n以前は「採点者視点」と書いていました。\n\n## 採点者が見るポイント'));
  assert.equal(r.changed, false);
  assert.match(r.reason, /お詫びと訂正/);
});

test('H1・画像・HTML コメントの中は数えない', () => {
  const r = fixArticle(`---\nnoteId: n0123456789ab\n---\n# 採点者視点の本\n\n![採点者視点](img/a.png)\n<!-- 採点者視点 -->\n\n## 採点者視点\n`);
  assert.deepEqual(r.ops[0], { op: 'replace', from: '採点者視点', to: '読み手の視点', count: 1 });
  assert.match(r.raw, /^# 採点者視点の本$/m);
});

test('すでに前置きがある記事には入れない', () => {
  const r = fixArticle(doc('採点基準は公表されていません。\n\n## 採点者が見るポイント'));
  assert.equal(r.ops.some((o) => o.op === 'insert-after'), false);
});

test('本文の「採点者は〜を見ています」型の文を置き換え、文ごとに操作を作る', () => {
  const r = fixArticle(doc('III-1・III-2のいずれを選んでも、採点者は「課題の本質把握」「解決策の論理性」を共通して見ています。\n\n採点者は次を見ている。\n\n- **採点者は次を見ている。**'));
  assert.match(r.raw, /いずれを選んでも、「課題の本質把握」「解決策の論理性」を共通して押さえておくと/);
  assert.deepEqual(r.ops.find((o) => o.from === '採点者は次を見ている。'), { op: 'replace', from: '採点者は次を見ている。', to: '自己点検では、次を確かめる。', count: 2 });
});
