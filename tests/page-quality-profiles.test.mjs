import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyPage, countMetrics, stripFrontmatter, median, evaluatorCoverage } from '../scripts/lib/page-quality-profiles.mjs';

const profiles = [
  { id: 'exam-guide', match: { area: 'exam', groups: ['guide'] }, evaluators: [{ agent: 'guide-qa', role: 'rubric' }] },
  { id: 'practice-guide', match: { area: 'practice', groups: ['guide'] }, evaluators: [] },
  { id: 'standards-library', match: { paths: ['content/site/standards-library'], file: '^part-\\d+\\.md$' }, evaluators: [] },
];

test('classifyPage: MDX は領域×記事型、基準書は置き場とファイル名で 1 つに当たる', () => {
  assert.deepEqual(classifyPage(profiles, { rel: 'content/site/civil-construction-1/a/article.mdx', area: 'exam', group: 'guide' }), ['exam-guide']);
  assert.deepEqual(classifyPage(profiles, { rel: 'content/site/civil-practice/a/article.mdx', area: 'practice', group: 'guide' }), ['practice-guide']);
  assert.deepEqual(classifyPage(profiles, { rel: 'content/site/standards-library/kyushu/x/part-01.md' }), ['standards-library']);
  assert.deepEqual(classifyPage(profiles, { rel: 'content/site/standards-library/kyushu/x/README.md' }), []);
  assert.deepEqual(classifyPage(profiles, { rel: 'content/site/pe-construction/a/article.mdx', area: 'exam', group: 'keyword' }), []);
});

test('countMetrics: 表・キャプション・画像・リンク・抜いたままのテキストを数える', () => {
  const body = stripFrontmatter([
    '---', 'title: x', '---',
    '## 見出し', '本文です。[内部](/exam/a) と [外部](https://example.com)', '',
    '| a | b |', '|---|---|', '| 1 | 2 |', '',
    '<ArticleImage src="x.webp" alt="図" />', '![図](y.png)',
    '```text', '   表 1-2 規格値', '図3 断面', '```',
  ].join('\n'));
  const m = countMetrics(body);
  assert.equal(m.h2, 1);
  assert.equal(m.tables, 1);
  assert.equal(m.images, 2);
  assert.equal(m.internalLinks, 1);
  assert.equal(m.tableCaptions, 1);
  assert.equal(m.figureCaptions, 1);
  assert.equal(m.rawTextBlocks, 1);
  assert.ok(m.chars > 0);
});

test('median と evaluatorCoverage: 主の評価役の有無を資格ごとに出す', () => {
  assert.equal(median([]), null);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 3);
  const p = { evaluators: [{ agent: 'a', role: 'rubric', categories: ['x'] }, { agent: 'b', role: 'figures' }] };
  assert.deepEqual(evaluatorCoverage(p, { x: 2, y: 5 }), [
    { category: 'y', pages: 5, roles: ['figures'] },
    { category: 'x', pages: 2, roles: ['rubric', 'figures'] },
  ]);
});
