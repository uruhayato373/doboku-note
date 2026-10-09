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
  assert.deepEqual(plan.map((g) => g.id), ['katex-warnings', 'note-paid-cta', 'products', 'affiliate-placements', 'keiken-answer-split', 'generated-indexes']);
  const katex = plan.find((g) => g.id === 'katex-warnings');
  assert.equal(katex.files.length, 2);
  assert.deepEqual(katex.cmd(katex.files).slice(0, 3), ['node', 'scripts/audit-katex-warnings.mjs', '--strict']);
  assert.deepEqual(planGates(['content/sns/x/review.json']).map((g) => g.id), ['x-review']);
  assert.deepEqual(planGates(['config/note-funnel.json']).map((g) => g.id), ['note-paid-cta']);
  assert.deepEqual(planGates(['docs/README.md']), []);
  // 記事の画像はサイズ上限を先に見る（2026-10-09 に 10KB 超えの図 2 枚が CI で初めて落ちた）
  assert.deepEqual(planGates(['content/site/a/img/x.svg']).map((g) => g.id), ['image-assets']);
  assert.deepEqual(planGates(['content/site/a/img/photo-x.webp']).map((g) => g.id), ['image-assets']);
  assert.deepEqual(planGates(['config/products.json']).map((g) => g.id), ['products']);
  assert.deepEqual(planGates(['src/lib/coconala-services.ts', 'scripts/kindle-published/catalog.json']).map((g) => g.id), ['products']);
  // 転職アフィリエイトの配置ルールと、それが突き合わせる正本
  for (const f of ['config/affiliate-placements.json', 'config/affiliate-mats.json', 'config/cta-placements.json', 'data/affiliate/catalog.json', 'src/config/affiliate-creatives.ts']) {
    assert.deepEqual(planGates([f]).map((g) => g.id), ['affiliate-placements'], f);
  }
});

test('note の原稿・マガジンの写し・収録の期待値を stage したら note 記事カタログの古さを見る', () => {
  // 2026-10-06: 題名の変更（57c4af4bf）と下書きの追加（5cf185c9a）でカタログの作り直しを忘れ、develop の CI が 2 回赤くなった
  const ids = (files) => planGates(files).map((g) => g.id);
  assert.ok(ids(['content/note/1級・2級土木/2級土木/R8二次の出題予想/article.md']).includes('generated-indexes'));
  assert.ok(ids(['content/note/技術士総監/x/article-2.md']).includes('generated-indexes'));
  assert.ok(ids(['src/lib/note-magazines.ts']).includes('generated-indexes'));
  assert.deepEqual(ids(['config/note-magazine-membership.json']), ['generated-indexes']);
  assert.ok(!ids(['content/note/1級・2級土木/2級土木/R8二次の出題予想/hashtags.txt']).includes('generated-indexes'));
  const gate = GATES.find((g) => g.id === 'generated-indexes');
  assert.deepEqual(gate.cmd([]), ['node', '.claude/scripts/build-note-published-index.mjs', '--check', '--staged']);
  assert.ok(ids(['content/note/x/y/Article.md']).includes('generated-indexes'), 'isNoteArticleFile と同じく大文字小文字を区別しない');
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

test('planGates: 1級・2級土木の記事と note・Kindle の原稿は経験記述の割り振りを先に見る', () => {
  assert.ok(planGates(['content/site/civil-construction-1/secondary-experience-writing-guide/article.mdx']).some((g) => g.id === 'keiken-answer-split'));
  assert.ok(planGates(['content/site/civil-construction-2/guide-x/article.mdx']).some((g) => g.id === 'keiken-answer-split'));
  assert.ok(planGates(['content/note/x/y/article.md']).some((g) => g.id === 'keiken-answer-split'));
  assert.ok(!planGates(['content/site/pe-construction/x/article.mdx']).some((g) => g.id === 'keiken-answer-split'));
});

test('planGates: スクリプトとワークフローを変えたら、書き方の規約と knip を先に見る（2026-10-10 に CI で初めて落ちた）', () => {
  for (const f of ['scripts/book-coverage-commit.mjs', '.claude/workflows/book-coverage-expand.js', 'tools/admin-app/src/app/ops/store/dataset-query.tsx', 'scripts/lib/x.mjs']) {
    const ids = planGates([f]).map((g) => g.id);
    assert.ok(ids.includes('unit-tests') && ids.includes('knip-ratchet'), f);
  }
  assert.ok(!planGates(['src/lib/coconala-services.ts']).some((g) => g.id === 'unit-tests'), 'サイトの src/ は CI の全量に任せる');
  assert.ok(!planGates(['scripts/kindle-published/catalog.json']).some((g) => g.id === 'unit-tests'), 'コードでない JSON は見ない');
});
