// tests/mdx-hygiene-rules.test.mjs
// 追加 MDX 衛生ルール（0-3/0-4/2-4/7-3/10-6）の純関数回帰テスト。
// 重要な誤検知回避: 本文の「仮置き」を 0-4 が拾わない・過去問記号(❌✅⭕★)を 7-3 が拾わない。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  lintMojibake, lintTodoMarkers, lintDecorativeEmoji,
  lintHeadingAnchorDuplicates, lintImageAltQuality,
} from '../.claude/scripts/lib/mdx-hygiene-rules.mjs';

const run = (fn, text) => { const f = []; fn(text.split('\n'), f); return f; };
const rules = (f) => f.map((x) => x.rule);

test('0-3: U+FFFD を検出', () => {
  const f = run(lintMojibake, 'ok\nこれは�化け\nok');
  assert.deepEqual(rules(f), ['0-3']);
  assert.equal(f[0].line, 2);
});

test('0-4: MDX コメント内 TODO を検出', () => {
  const f = run(lintTodoMarkers, 'text\n{/* TODO: 図版を差し替える */}\ntext');
  assert.deepEqual(rules(f), ['0-4']);
});

test('0-4: 本文の「仮置き」は誤検知しない（土木用語）', () => {
  const f = run(lintTodoMarkers, '仮置き土砂の管理について。掘削した土を仮置きする。');
  assert.equal(f.length, 0);
});

test('0-4: コメント外の TODO 文字列は拾わない', () => {
  const f = run(lintTodoMarkers, 'これは TODO リストではない普通の文。');
  assert.equal(f.length, 0);
});

test('7-3: 装飾絵文字を検出', () => {
  assert.deepEqual(rules(run(lintDecorativeEmoji, '- 💡 ポイント: これが重要')), ['7-3']);
});

test('7-3: 過去問/強調記号(❌✅⭕★↔)は誤検知しない', () => {
  assert.equal(run(lintDecorativeEmoji, '正答は ⭕、誤りは ❌。★重要★ A ↔ B、✅ 完了').length, 0);
});

test('7-3: コードフェンス内の絵文字は無視', () => {
  assert.equal(run(lintDecorativeEmoji, '```\n// 💡 code comment\n```').length, 0);
});

test('2-4: 同一見出しの重複アンカーを検出', () => {
  const f = run(lintHeadingAnchorDuplicates, '## まとめ\n本文\n## 詳細\n## まとめ');
  assert.deepEqual(rules(f), ['2-4']);
  assert.equal(f[0].line, 4);
});

test('2-4: 異なる見出しは重複としない', () => {
  assert.equal(run(lintHeadingAnchorDuplicates, '## A\n## B\n## C').length, 0);
});

test('10-6: 空 alt を検出', () => {
  assert.deepEqual(rules(run(lintImageAltQuality, '<ArticleImage src="/x.png" alt="" />')), ['10-6']);
});

test('10-6: 一般語 alt を検出', () => {
  assert.deepEqual(rules(run(lintImageAltQuality, '<img src="/x.png" alt="画像" />')), ['10-6']);
});

test('10-6: 具体的な alt は通す', () => {
  assert.equal(run(lintImageAltQuality, '<ArticleImage src="/x.png" alt="バックホウの各部名称" />').length, 0);
});
