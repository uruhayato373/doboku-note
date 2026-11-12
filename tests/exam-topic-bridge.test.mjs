import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';
import { loadTsModule } from './lib/load-ts.mjs';

// 実務記事の記事末「この論点が出る 1級土木の過去問」（exam-topic-bridge.ts）。登録した記事が 1 件でも解決しないと黙って消えるので全件を見る。
const { resolveExamTopicQuestion, examTopicBridgeSlugs } = await loadTsModule('src/lib/exam-topic-bridge.ts');

test('登録した記事はすべて実在し、1 問に解決する', () => {
  const slugs = examTopicBridgeSlugs();
  assert.ok(slugs.length >= 10, `登録 ${slugs.length} 件`);
  for (const slug of slugs) {
    const dir = slug.replace(/^civil-practice-/, '');
    assert.ok(existsSync(join(ROOT, 'content/site/civil-practice', dir, 'article.mdx')), `記事が無い: ${slug}`);
    const q = resolveExamTopicQuestion(slug);
    assert.ok(q, `問題が見つからない: ${slug}`);
    assert.ok(q.options.length >= 2 && q.options.some((o) => o.num === q.correct), `${slug}: 正解の選択肢が無い`);
    assert.ok(q.explanation.length > 0, `${slug}: 解説が空`);
    assert.ok(!/[$<|]|&#x/.test(q.body + q.options.map((o) => o.text).join('')), `${slug}: 崩れる記法を含む`);
    assert.match(q.examHref, /^\/exam\/civil-construction-1\/.+#問題-no\d+$/);
  }
});

test('年度の過去問ページの見出しの id と、リンクの #問題-noN が一致する', () => {
  const q = resolveExamTopicQuestion('civil-practice-excavation-bottom-failure');
  const [, year, part, no] = q.examHref.match(/primary-([hr]\d{2})-([ab])#問題-no(\d+)$/) ?? q.examHref.match(/\/(?:primary\/)?(?:primary-)?([hr]\d{2})-([ab])#問題-no(\d+)$/);
  const mdx = readFileSync(join(ROOT, 'content/site/civil-construction-1', `primary-${year}-${part}`, 'article.mdx'), 'utf8');
  assert.match(mdx, new RegExp(`^## 問題 No\\.${no}$`, 'm'));
});

test('未登録の記事は null', () => {
  assert.equal(resolveExamTopicQuestion('civil-practice-not-registered'), null);
});
