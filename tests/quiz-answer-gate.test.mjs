// 解説を絞る過去問ページ（src/config/answer-gate.json）は、Web の演習アプリのデータでも正答の選択肢の理由だけを残す（2026-11-26）。
// 残すと演習アプリがサイトの線引きの抜け道になる。iOS アプリの束（有料）は buildDataset を直接使うので当たらない。
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAnswerGate } from '../scripts/build/build-quiz-data.mjs';

const question = (dir, correct) => ({
  id: `${dir}-q`,
  correct,
  articlePath: `/exam/pe-first-stage/primary/${dir}`,
  explanations: [1, 2, 3, 4, 5].map((num) => ({ num, text: `理由${num}`, html: `<p>理由${num}</p>`, isAnswer: num === correct })),
  examPoint: { summary: '要点', items: ['a'] },
});

test('対象のページの問題は正答の理由だけ残し、ほかの理由と要点を外す。対象外と正答の無い問題は変えない', () => {
  const dataset = {
    exam: 'pe-first-stage',
    questions: [question('r05-construction', 2), question('r06-construction', 2), question('r05-construction', null)],
  };
  const { dataset: out, gated } = applyAnswerGate(dataset, { slugs: ['pe-first-stage-r05-construction'] });
  assert.equal(gated, 1);
  const [target, other, unscored] = out.questions;
  assert.equal(target.examPoint, null);
  assert.deepEqual(target.explanations.filter((e) => e.html).map((e) => e.num), [2]);
  assert.equal(target.explanations.every((e) => e.text), true);
  assert.equal(other, dataset.questions[1]);
  assert.equal(unscored, dataset.questions[2]);
  assert.equal(dataset.questions[0].examPoint.summary, '要点');
});

test('解説を絞るページは、導線の先の合本（content/kindle/books/d-00/spec.json の sources）に収録している', async () => {
  const { readFileSync } = await import('node:fs');
  const { REPO_ROOT } = await import('../scripts/lib/repository-paths.mjs');
  const gate = JSON.parse(readFileSync(`${REPO_ROOT}/src/config/answer-gate.json`, 'utf8'));
  const spec = JSON.parse(readFileSync(`${REPO_ROOT}/content/kindle/books/d-00/spec.json`, 'utf8'));
  assert.equal(gate.productId, 'pe1-takuitsu-pdf', '導線の商品を変えたら、収録元の spec もここで差し替える');
  const sources = new Set(spec.sources.map((s) => (typeof s === 'string' ? s : s.path ?? s.file)));
  const missing = gate.slugs.filter((slug) => !sources.has(`content/site/pe-first-stage/${slug.replace(/^pe-first-stage-/, '')}/article.mdx`));
  assert.ok(gate.slugs.length > 0);
  assert.deepEqual(missing, [], '合本に入っていないページの解説を絞ると、導線の先で読めない');
});
