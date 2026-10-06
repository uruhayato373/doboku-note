import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GATES, planGates } from '../scripts/pre-commit-ci-gates.mjs';

test('planGates: staged のパスに応じて回す検査と対象を決める', () => {
  const plan = planGates([
    'content/site/concrete-chief-engineer/primary-production-qc/article.mdx',
    'content/site/pe-first-stage/r07-basic/article.mdx',
    'content/note/magazines/x/article.md',
    'src/lib/foo.ts',
  ]);
  assert.deepEqual(plan.map((g) => g.id), ['katex-warnings', 'note-paid-cta', 'products']);
  const katex = plan.find((g) => g.id === 'katex-warnings');
  assert.equal(katex.files.length, 2);
  assert.deepEqual(katex.cmd(katex.files).slice(0, 3), ['node', 'scripts/audit-katex-warnings.mjs', '--strict']);
  assert.deepEqual(planGates(['content/sns/x/review.json']).map((g) => g.id), ['x-review']);
  assert.deepEqual(planGates(['config/note-funnel.json']).map((g) => g.id), ['note-paid-cta']);
  assert.deepEqual(planGates(['docs/README.md', 'content/site/a/img/x.svg']), []);
  assert.deepEqual(planGates(['config/products.json']).map((g) => g.id), ['products']);
  assert.deepEqual(planGates(['src/lib/coconala-services.ts', 'scripts/kindle-published/catalog.json']).map((g) => g.id), ['products']);
});

test('pre-commit の検査は quality-audit の ci:true と同じ id（CI の全量検査と食い違わない）', () => {
  const src = readFileSync(new URL('../scripts/quality-audit.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  for (const g of GATES) {
    const line = src.split('\n').find((l) => l.includes(`id: '${g.id}'`));
    assert.ok(line, `${g.id} が quality-audit に無い`);
    assert.match(line, /ci: true/, `${g.id} が ci:true でない`);
  }
});

test('pre-commit が毎回呼ぶ pre-commit-mdx の先頭（MDX 無しの早期終了より前）でゲートを回す', () => {
  const hook = readFileSync(new URL('../scripts/install-pre-commit.mjs', import.meta.url), 'utf8');
  assert.match(hook, /node scripts\/pre-commit-mdx\.mjs/);
  const src = readFileSync(new URL('../scripts/pre-commit-mdx.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const main = src.slice(src.indexOf('async function main()'));
  const gate = main.indexOf('runGates()');
  assert.ok(gate > 0, 'main で runGates を呼んでいない');
  assert.ok(gate < main.indexOf('Nothing to validate'), '早期終了より後に置くと MDX 無しの commit で回らない');
});
