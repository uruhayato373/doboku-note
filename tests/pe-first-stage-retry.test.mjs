import { before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
let dataset;
before(() => {
  execFileSync(process.execPath, ['scripts/build-quiz-data.mjs'], { cwd: root, stdio: 'pipe' });
  dataset = JSON.parse(readFileSync(root + 'public/quiz/pe-first-stage.json', 'utf8'));
});

test('通常のR1と再試験は80問ずつの独立した実施回・問題IDを持つ', () => {
  const regular = dataset.questions.filter((q) => q.year === 'r01');
  const retry = dataset.questions.filter((q) => q.year === 'r01-retry');
  assert.equal(regular.length, 80);
  assert.equal(retry.length, 80);
  assert.equal(new Set(dataset.questions.map((q) => q.id)).size, dataset.questions.length);
  assert.ok(regular.some((q) => q.id === 'r01-basic-ⅰ-1-1'));
  assert.ok(retry.some((q) => q.id === 'r01-retry-basic-ⅰ-1-1'));
  assert.ok(retry.every((q) => q.yearLabel === '令和元年度（再試験）'));
  assert.ok(retry.every((q) => q.articlePath.includes('/r01-retry-')));
  const order = dataset.years.map((y) => y.year);
  assert.ok(order.indexOf('r02') < order.indexOf('r01-retry'));
  assert.ok(order.indexOf('r01-retry') < order.indexOf('r01'));
});

test('全員得点のⅡ-14は掲載を保ち、正答番号とSNS採点問題を生成しない', () => {
  const retry = dataset.questions.filter((q) => q.year === 'r01-retry');
  const excluded = retry.filter((q) => q.correct == null);
  assert.deepEqual(excluded.map((q) => q.id), ['r01-retry-aptitude-ⅱ-14']);
  assert.equal(excluded[0].socialEligible, false);
  assert.ok(excluded[0].socialExclusionReasons.includes('unscored'));
  assert.equal(excluded[0].options.length, 5);
  assert.ok(excluded[0].explanations.every((e) => !e.isAnswer && e.statementCorrect == null));
  assert.equal(retry.filter((q) => q.correct != null).length, 79);
  assert.equal(dataset.questions.length, 1120);
  assert.equal(dataset.questions.filter((q) => q.correct == null).length, 3);
  assert.equal(dataset.years.length, 14);
});

test('再試験の6図・計算式・5肢解説は演習用HTMLでも失われない', () => {
  const retry = dataset.questions.filter((q) => q.year === 'r01-retry');
  assert.equal(retry.filter((q) => /<img\b/.test(q.bodyHtml)).length, 6);
  assert.ok(retry.every((q) => q.options.length === 5 && q.explanations.length === 5));
  assert.ok(retry.every((q) => q.explanations.every((e) => e.text)));
  assert.ok(retry.every((q) => !JSON.stringify(q).includes('katex-error')));
  const density = retry.find((q) => q.id === 'r01-retry-construction-ⅲ-1');
  assert.match(density.options[4].html, /class="katex/);
  assert.equal(density.correct, 5);
  const beam = retry.find((q) => q.id === 'r01-retry-construction-ⅲ-8');
  assert.match(beam.bodyHtml, /q-08-beam\.webp/);
  assert.equal(beam.correct, 2);
});

test('再試験全80問の正答は公式正答表と一致する', () => {
  // 日本技術士会 attach_4106_10.pdf の基礎 p.1・適性 p.2・建設 p.11を目視転記。
  // Ⅱ-14は公式に全員得点であり、選択肢から正答番号を推測しない。
  const official = {
    basic: [5, 3, 1, 2, 2, 5, 5, 4, 2, 5, 1, 4, 5, 2, 5, 5, 4, 2, 2, 3, 2, 4, 3, 3, 1, 1, 3, 3, 4, 3],
    aptitude: [3, 3, 1, 1, 3, 4, 3, 4, 5, 2, 1, 2, 1, null, 1],
    construction: [5, 5, 2, 1, 4, 5, 4, 2, 5, 2, 3, 4, 4, 1, 1, 2, 2, 3, 4, 3, 1, 3, 2, 1, 3, 3, 2, 4, 5, 3, 5, 5, 1, 2, 5],
  };
  for (const [subject, answers] of Object.entries(official)) {
    const questions = dataset.questions.filter((q) => q.year === 'r01-retry' && q.subject === subject);
    assert.deepEqual(questions.map((q) => q.correct), answers, subject);
  }
});

test('通常R1の最適化問題は公式の組合せを保ち、アを誤りとして説明する', () => {
  const q = dataset.questions.find((q) => q.id === 'r01-basic-ⅰ-1-1');
  assert.equal(q.correct, 5);
  assert.deepEqual(q.options.map((o) => o.text), [
    'ア：正 イ：正 ウ：誤 エ：誤',
    'ア：正 イ：誤 ウ：正 エ：誤',
    'ア：誤 イ：正 ウ：誤 エ：正',
    'ア：誤 イ：誤 ウ：正 エ：正',
    'ア：誤 イ：正 ウ：正 エ：正',
  ]);
  assert.match(q.body, /決定変数が離散的な整数値/);
  assert.match(q.explanations[4].text, /アのみ誤り/);
});

test('通常R1の文書距離は原典表のD＝3Aで0になり、隣接する木の誤答理由も正しい', () => {
  const q = dataset.questions.find((q) => q.id === 'r01-basic-ⅰ-2-3');
  const rows = [...q.bodyHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((cell) => cell[1].trim()));
  assert.deepEqual(rows.slice(1), [
    ['単語1', '7', '2', '70', '21', '1', '7'],
    ['単語2', '3', '3', '3', '9', '2', '30'],
    ['単語3', '2', '0', '2', '6', '3', '20'],
  ]);
  const vectors = [1, 2, 3, 4, 5, 6].map((col) => rows.slice(1).map((row) => Number(row[col])));
  const norm = (v) => Math.sqrt(v.reduce((sum, n) => sum + n * n, 0));
  const distances = vectors.slice(1).map((v) => 1 - v.reduce((sum, n, i) => sum + n * vectors[0][i], 0) / (norm(vectors[0]) * norm(v)));
  assert.equal(distances.indexOf(Math.min(...distances)) + 1, q.correct);
  assert.ok(Math.abs(distances[q.correct - 1]) < 1e-12);
  assert.match(q.explanations[2].text, /全成分がAの3倍/);
  const tree = dataset.questions.find((entry) => entry.id === 'r01-basic-ⅰ-2-2');
  assert.match(tree.explanations[3].text, /10が12より先/);
  assert.doesNotMatch(tree.explanations[3].text, /7が6より後/);
});
