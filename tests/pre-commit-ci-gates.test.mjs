import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { GATES, GATE_CONCURRENCY, UNIT_TEST_RULES, failureLines, gateEnv, planGates, runPlan, unitTestsFor } from '../scripts/pre-commit-ci-gates.mjs';
import { STEPS } from '../scripts/lib/pre-commit-steps.mjs';
import { CHECKS } from '../scripts/quality-audit.mjs';

test('planGates: staged のパスに応じて回す検査と対象を決める', () => {
  // 設定・記録の JSON は型の実データのテスト（unit-tests）も回すので、ここではそれを除いて比べる
  const only = (files) => planGates(files).map((g) => g.id).filter((id) => id !== 'unit-tests');
  const plan = planGates([
    'content/site/concrete-chief-engineer/primary-production-qc/article.mdx',
    'content/site/pe-first-stage/r07-basic/article.mdx',
    'content/note/magazines/x/article.md',
    'src/lib/foo.ts',
  ]);
  assert.deepEqual(plan.map((g) => g.id), ['katex-warnings', 'note-paid-cta', 'products', 'affiliate-placements', 'keiken-answer-split', 'unit-tests', 'content-series', 'topic-wiring', 'generated-indexes']);
  const katex = plan.find((g) => g.id === 'katex-warnings');
  assert.equal(katex.files.length, 2);
  assert.deepEqual(katex.cmd(katex.files).slice(0, 3), ['node', 'scripts/audit-katex-warnings.mjs', '--strict']);
  // SNS の検査は SNS の保留に合わせて 2026-10-25 に CI と pre-commit の速い検査から外した（再開するときに作り直す）
  // content/sns の json・md・txt は素材の参照の検査（media-references）だけ回す（下のテスト）
  assert.deepEqual(planGates(['content/sns/x/review.json']).map((g) => g.id), ['media-references']);
  assert.deepEqual(only(['config/note-funnel.json']), ['note-paid-cta']);
  assert.deepEqual(planGates(['docs/README.md']).map((g) => g.id), ['unit-tests', 'domains'], 'docs は領域の割り当て（check-domains）と backlog 参照のテスト');
  assert.deepEqual(planGates(['README.md']), []);
  // 記事の画像はサイズ上限を先に見る（2026-10-09 に 10KB 超えの図 2 枚が CI で初めて落ちた）
  assert.deepEqual(planGates(['content/site/a/img/x.svg']).map((g) => g.id), ['image-assets']);
  assert.deepEqual(planGates(['content/site/a/img/photo-x.webp']).map((g) => g.id), ['image-assets']);
  assert.deepEqual(only(['config/products.json']), ['products']);
  assert.deepEqual(only(['src/lib/coconala-services.ts', 'scripts/kindle-published/catalog.json']), ['products']);
  // 転職アフィリエイトの配置ルールと、それが突き合わせる正本
  for (const f of ['config/affiliate-placements.json', 'config/affiliate-mats.json', 'config/cta-placements.json', 'data/affiliate/catalog.json', 'src/config/affiliate-creatives.ts']) {
    assert.deepEqual(only([f]), ['affiliate-placements'], f);
  }
});

test('note の原稿・マガジンの写し・収録の期待値を stage したら note 記事カタログの古さを見る', () => {
  // 2026-10-06: 題名の変更（57c4af4bf）と下書きの追加（5cf185c9a）でカタログの作り直しを忘れ、develop の CI が 2 回赤くなった
  const ids = (files) => planGates(files).map((g) => g.id);
  assert.ok(ids(['content/note/1級・2級土木/2級土木/R8二次の出題予想/article.md']).includes('generated-indexes'));
  assert.ok(ids(['content/note/技術士総監/x/article-2.md']).includes('generated-indexes'));
  assert.ok(ids(['src/lib/note-magazines.ts']).includes('generated-indexes'));
  assert.deepEqual(ids(['config/note-magazine-membership.json']), ['unit-tests', 'generated-indexes'], '設定の JSON は型の実データのテストも回す');
  assert.ok(!ids(['content/note/1級・2級土木/2級土木/R8二次の出題予想/hashtags.txt']).includes('generated-indexes'));
  const gate = GATES.find((g) => g.id === 'generated-indexes');
  assert.deepEqual(gate.cmd([]), ['node', '.claude/scripts/build-note-published-index.mjs', '--check', '--staged']);
  assert.ok(ids(['content/note/x/y/Article.md']).includes('generated-indexes'), 'isNoteArticleFile と同じく大文字小文字を区別しない');
});

test('pre-commit の検査は quality-audit の ci:true か ops:true と同じ id（全量の検査と食い違わない）', () => {
  // 本文を行で探すと複数行の定義（qualification-market など）を読めないので、export された CHECKS を見る（DN-0790）
  // DN-0805 で ops へ下げた knip-ratchet・review-wiring も commit 前には見る（全量は週次の ops が見る・DN-0847）
  for (const g of GATES) {
    const c = CHECKS.find((x) => x.id === g.id);
    assert.ok(c, `${g.id} が quality-audit に無い`);
    assert.ok(c.ci === true || c.ops === true, `${g.id} が ci:true でも ops:true でもない（全量を誰も見ない）`);
  }
});

test('台帳・配線の検査は、その正本か読む側を stage したときに回る（DN-0790・09-14〜10-20 に develop を赤くした）', () => {
  const ids = (files) => planGates(files).map((g) => g.id);
  const cases = [
    ['config/content-series.json', 'content-series'],
    ['content/sources/series/a/b.md', 'content-series'],
    ['config/market-scan.json', 'qualification-market'],
    ['data/coconala/orders.json', 'qualification-market'],
    ['src/config/topics.json', 'topic-wiring'],
    ['.claude/config/review-wiring.json', 'review-wiring'],
    ['.claude/skills/weekly-review/SKILL.md', 'review-wiring'],
    ['package.json', 'gate-parity'],
    ['scripts/quality-audit.mjs', 'gate-parity'],
    ['config/domains.json', 'domains'],
    ['.claude/agents/guide-qa.md', 'domains'],
    ['.claude/knowledge/reference/workflows.md', 'domains'],
    ['tools/admin-app/src/app/todo/page.tsx', 'domains'],
    ['content/site/standards-articles/chubu/special/manifest.json', 'orphan-ogp'],
  ];
  for (const [file, id] of cases) assert.ok(ids([file]).includes(id), `${file} → ${id}`);
  assert.ok(!ids(['content/note/x/y/article.md']).includes('domains'));
  assert.ok(!ids(['src/lib/foo.ts']).some((x) => ['content-series', 'topic-wiring', 'domains'].includes(x)));
});

test('unit-tests は staged に関係する実データのテストだけを回す（DN-0790）', () => {
  assert.deepEqual(unitTestsFor(['scripts/x.mjs']), ['tests/git-exec-maxbuffer.test.mjs', 'tests/env-example.test.mjs', 'tests/script-helpers-ratchet.test.mjs', 'tests/read-json-ratchet.test.mjs']);
  assert.deepEqual(unitTestsFor(['tests/x.test.mjs']), ['tests/script-helpers-ratchet.test.mjs', 'tests/read-json-ratchet.test.mjs', 'tests/x.test.mjs'], 'テストの変更でも写しのラチェットと、変えたテスト自身を回す（2026-10-27）');
  assert.ok(unitTestsFor(['content/site/standards-articles/kanto/a/chapters/1/article.mdx']).includes('tests/standards-ogp-guards.test.mjs'));
  assert.ok(unitTestsFor(['content/note/x/y/article.md']).includes('tests/content-theme.test.mjs'));
  assert.ok(unitTestsFor(['data/coconala/orders.json']).includes('tests/dataset-schemas.test.mjs'));
  assert.ok(unitTestsFor(['docs/strategy/x.md']).includes('tests/project-task-refs.test.mjs'));
  assert.deepEqual(unitTestsFor(['README.md']), []);
  const all = [...new Set(UNIT_TEST_RULES.flatMap((r) => r.tests))];
  assert.deepEqual(all.filter((t) => !existsSync(t)), [], 'テストを消したら規則からも外す');
});

test('pre-commit が毎回呼ぶ pre-commit-mdx の先頭（MDX 無しの早期終了より前）でゲートを回す', () => {
  // フックは毎回 pre-commit-mdx を呼ぶ（検査の一覧は scripts/lib/pre-commit-steps.mjs・条件なしの項目）
  const step = STEPS.find((x) => x.script === 'scripts/pre-commit-mdx.mjs');
  assert.ok(step, 'pre-commit-mdx が検査の一覧に無い');
  assert.equal(step.when, undefined, 'pre-commit-mdx は毎回呼ぶ（MDX 無しの commit でも CI の速い検査を回す）');
  assert.equal(step.skipEnv, undefined);
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

test('unit-tests は hook の GIT_INDEX_FILE などを外して起動する（テストの git が commit 用の index を書き換えない）', () => {
  // 2026-10-27: todo-add.test.mjs の一時リポジトリの git add が commit 用の index を 17,802 件から 2 件に置き換えた
  const env = { PATH: '/bin', GIT_INDEX_FILE: '/repo/.git/next-index.lock', GIT_DIR: '/repo/.git', HOME: '/h' };
  const unit = planGates(['scripts/todo-add.mjs']).find((g) => g.id === 'unit-tests');
  assert.ok(unit, 'scripts/todo-add.mjs で unit-tests が回らない');
  const isolated = gateEnv(unit, env);
  assert.equal(isolated.GIT_INDEX_FILE, undefined);
  assert.equal(isolated.GIT_DIR, undefined);
  assert.equal(isolated.PATH, '/bin');
  assert.equal(env.GIT_INDEX_FILE, '/repo/.git/next-index.lock', '呼び出し元の env を書き換えない');
  // --staged で index を読む検査には commit 用の index をそのまま渡す
  const other = GATES.find((g) => !g.isolateGit);
  assert.equal(gateEnv(other, env).GIT_INDEX_FILE, '/repo/.git/next-index.lock');
});

test('failureLines: 落ちたテストの行と理由だけを抜き出す（末尾だけだと切れる・DN-1043）', () => {
  const out = ['ok 1 - a', 'not ok 2 - b', '  error: x', '  expected: true', '  actual: false', '  ...', 'ok 3 - c', ...Array.from({ length: 40 }, (_, i) => `ok ${i + 4} - d`)].join('\n');
  assert.deepEqual(failureLines(out), ['not ok 2 - b', '  error: x', '  expected: true', '  actual: false', '  ...']);
  assert.ok(!out.split('\n').slice(-25).includes('not ok 2 - b'), '末尾 25 行には落ちた行が残らない例');
  assert.deepEqual(failureLines('ok 1 - a\nok 2 - b'), []);
});

test('content/sns の文書を stage したら素材の参照（check-media-references）を先に回す', () => {
  // content/sns/video-packs/**/pop-image.json の .tmp/media/ 参照の欠けは、CI の media-references でしか落ちなかった
  const ids = (files) => planGates(files).map((g) => g.id);
  assert.ok(ids(['content/sns/video-packs/x/pop-image.json']).includes('media-references'));
  assert.ok(ids(['content/sns/x/y.md']).includes('media-references'));
  assert.ok(!ids(['content/sns/x/y.png']).includes('media-references'), '走査対象は json・md・txt だけ');
  assert.ok(!ids(['content/site/a/b/article.mdx']).includes('media-references'));
  assert.deepEqual(GATES.find((g) => g.id === 'media-references').cmd([]), ['node', 'scripts/check-media-references.mjs']);
});

test('runPlan: 検査を並行で回し、結果は計画の順に返す（直列だと記事 1 本の commit で所要時間が足し算になる・DN-1141）', async () => {
  const plan = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id }));
  let running = 0;
  let peak = 0;
  // 先に始めた検査ほど遅く終わるようにして、終わった順が計画の順と逆になる形で確かめる
  const exec = async (gate) => {
    running += 1;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 30 - plan.indexOf(gate) * 4));
    running -= 1;
    return { status: gate.id === 'c' ? 1 : 0, out: gate.id };
  };
  const results = await runPlan(plan, { exec, concurrency: 3 });
  assert.deepEqual(results.map((r) => r.out), ['a', 'b', 'c', 'd', 'e', 'f'], '結果が計画の順でない');
  assert.deepEqual(results.map((r) => r.status), [0, 0, 1, 0, 0, 0], '失敗した検査の位置がずれている');
  assert.equal(peak, 3, '同時に走る数が上限と違う');
  assert.deepEqual(await runPlan([], { exec }), [], '検査 0 本でも終わる');
  // 起動が投げた検査は失敗として数える（ほかの検査は最後まで回る）
  const thrown = await runPlan(plan.slice(0, 2), { exec: async (gate) => { if (gate.id === 'a') throw new Error('spawn ENOENT'); return { status: 0, out: '' }; } });
  assert.equal(thrown[0].status, 1);
  assert.match(thrown[0].out, /spawn ENOENT/);
  assert.equal(thrown[1].status, 0);
  assert.ok(GATE_CONCURRENCY >= 1 && GATE_CONCURRENCY <= 4);
});
