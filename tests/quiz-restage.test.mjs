import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { QUIZ_FROM_MDX, planQuizRestage } from '../scripts/lib/quiz-restage.mjs';

test('planQuizRestage: 技術士一次の MDX を stage したときだけ演習データを作り直す', () => {
  // 2026-10-06: 技術士一次 12 本の数式修正（0e3b23f99）で、pre-commit が dateModified を進めた分だけ演習データが古くなった
  assert.deepEqual(planQuizRestage(['content/site/pe-first-stage/r07-basic/article.mdx']).map((q) => q.out), ['public/quiz/pe-first-stage.json']);
  assert.deepEqual(planQuizRestage(['content/site/civil-construction-1/secondary-r07/article.mdx']), []);
  assert.deepEqual(planQuizRestage(['content/site/pe-first-stage/r07-basic/img/q01.png']), []);
  assert.deepEqual(planQuizRestage([]), []);
});

test('記事の日付に依存する演習データ（build-quiz-data の MDX 由来の元）をすべて対象にしている', () => {
  const src = readFileSync(new URL('../scripts/build-quiz-data.mjs', import.meta.url), 'utf8');
  const mdxSources = [...src.matchAll(/srcPath:\s*'(content\/site\/[^']+)'/g)].map((m) => m[1].replace(/\/?$/, '/'));
  assert.ok(mdxSources.length > 0, 'build-quiz-data に MDX 由来の元が見つからない（検査不成立）');
  for (const dir of mdxSources) {
    assert.ok(QUIZ_FROM_MDX.some((q) => q.srcDir === dir), `${dir} の演習データが作り直しの対象に無い`);
  }
});

test('pre-commit-mdx が MDX 無しの早期終了より前で演習データを作り直す', () => {
  const src = readFileSync(new URL('../scripts/pre-commit-mdx.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const main = src.slice(src.indexOf('async function main()'));
  const at = main.indexOf('restageQuiz(files)');
  assert.ok(at > 0, 'main で restageQuiz を呼んでいない');
  assert.ok(at < main.indexOf('Nothing to validate'), '早期終了より後に置くと回らない');
});
