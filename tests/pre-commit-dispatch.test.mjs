// pre-commit のディスパッチャ（scripts/pre-commit-dispatch.mjs・DN-0688）が、旧フック（install-pre-commit.mjs が書いていた
// シェル 545 行）と同じ判定をすることを固定する。
//
// 旧フックは「どの staged パスで・どの検査を・どの引数で・どの順に・どの失敗で止めるか」を `node scripts/x.mjs` の行と
// `if … grep` で持っていた。LEGACY はそれを写した表（2026-10-12 の旧フックから機械で抜き、条件を手で付けた）。
// 各検査を偽物（exec）に差し替えて、呼ばれる検査と引数の列が LEGACY から導いた期待と一致することを見る。
// 旧フックより**狭くした所は 3 つだけ**（GATED）。全量を走査する検査で、staged の変更がその入力に当たらないと飛ばす。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { STEPS, planSteps, isFailure } from '../scripts/lib/pre-commit-steps.mjs';
import { dispatch, tailLines } from '../scripts/pre-commit-dispatch.mjs';
import { ExitSignal, exitWith, isCliEntry, runBody, runMain } from '../scripts/lib/cli-run.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

// --- 旧フックを写した表 ----------------------------------------------------------------
// [script, args, 条件, 止め方]  条件: 'always' | { skipEnv:[名前,'eq1'|'nonempty'] } | { file: true } | { staged: RegExp } |
//                              { docsOrBacklog: true } | { contentQuality: true }
//  止め方: 'nonzero'（`[ $? -ne 0 ]`）| 'eq1'（`[ $? -eq 1 ]`）
const LEGACY = [
  ['.claude/scripts/backfill-mdx-dates.mjs', ['--staged'], { skipEnv: ['SKIP_MDX_DATES', 'eq1'] }],
  ['scripts/pre-commit-mdx.mjs', [], 'always'],
  ['scripts/lint-ui.mjs', [], 'always'],
  ['scripts/note-lint.mjs', [], 'always'],
  ['scripts/lint-ja.mjs', ['--staged'], 'always'],
  ['.claude/scripts/lint-mdx-mobile.mjs', ['--baseline', '--ci', '<published staged mdx>'], { contentQuality: true }],
  ['scripts/check-note-charlimits.mjs', ['--staged'], 'always'],
  ['scripts/keiken-charcount.mjs', ['--staged', '--strict'], 'always'],
  ['scripts/check-magazine-wiring.mjs', ['--staged'], 'always'],
  ['scripts/check-magazine-cta-reachability.ts', ['--ci'], { staged: /^src\/lib\/(note-magazines|magazine-placement|hub-cta)\.ts$/ }],
  ['scripts/check-note-price-consistency.mjs', ['--staged'], 'always'],
  ['scripts/check-magazine-membership.mjs', ['--staged'], 'always'],
  ['scripts/check-relative-links.mjs', ['--staged'], 'always'],
  ['scripts/check-project-task-refs.mjs', [], { docsOrBacklog: true }],
  ['scripts/check-published-vs-redirects.mjs', ['--staged'], 'always'],
  ['scripts/check-git-binary-policy.mjs', ['--staged'], { skipEnv: ['SKIP_GIT_BINARY_POLICY', 'nonempty'] }],
  ['scripts/check-asset-reentry.mjs', ['--staged'], { skipEnv: ['SKIP_ASSET_REENTRY', 'nonempty'] }],
  ['scripts/check-drive-vault.mjs', ['--staged-only'], { skipEnv: ['SKIP_DRIVE_VAULT', 'nonempty'] }],
  ['scripts/check-reference-sources.mjs', ['--staged'], { skipEnv: ['SKIP_REFERENCE_SOURCES', 'nonempty'] }],
  ['scripts/check-information-architecture.mjs', ['--staged'], 'always'],
  ['scripts/check-business-direction.mjs', ['--staged'], 'always'],
  ['scripts/check-sns-urls.mjs', ['--staged'], 'always'],
  ['scripts/check-dead-handles.mjs', ['--staged'], 'always'],
  ['scripts/check-jst-date.mjs', ['--staged'], 'always'],
  ['scripts/check-exam-calendar.mjs', [], 'always'],
  ['scripts/check-qualification-ssot.mjs', [], 'always'],
  ['scripts/check-datasets.mjs', [], 'always'],
  ['scripts/check-x-campaign-plan.mjs', [], 'always'],
  ['scripts/check-doc-refs.mjs', ['--staged'], 'always'],
  ['scripts/check-task-plan-links.mjs', [], 'always'],
  ['scripts/check-backlog-schema.mjs', ['--staged'], 'always'],
  ['scripts/check-claude-md-size.mjs', [], { staged: /^(CLAUDE\.md|\.claude\/rules\/)/ }],
  ['scripts/check-memory.mjs', [], { staged: /^\.claude\/memory\// }],
  ['scripts/sync-codex-compat.mjs', ['--staged'], 'always'],
  ['scripts/check-agent-descriptions.mjs', ['--staged'], 'always'],
  ['scripts/check-doc-coupling.mjs', ['--staged'], 'always'],
  ['scripts/check-handoff-extraction.mjs', ['--staged'], 'always'],
  ['scripts/check-sales-mapping.mjs', ['--staged'], 'always'],
  ['scripts/check-coconala-wiring.mjs', ['--staged'], 'always'],
  ['scripts/check-coconala-orders.mjs', ['--staged', '--no-freshness'], { file: true }, 'eq1'],
  ['scripts/check-coconala-blog.mjs', ['--staged'], { file: true }, 'eq1'],
  ['scripts/check-home-exam-coverage.mjs', [], 'always'],
  ['scripts/check-category-curriculum.mjs', [], 'always'],
  ['scripts/check-content-taxonomy.mjs', ['--staged'], 'always'],
  ['scripts/check-career-separation.mjs', [], 'always'],
  ['scripts/check-affiliate-mats.mjs', ['--staged'], 'always'],
  ['scripts/check-affiliate-prose.mjs', ['--staged'], 'always'],
  ['scripts/check-affiliate-wiring.mjs', ['--staged'], { file: true }],
  ['scripts/check-policy-anchors.mjs', ['--staged'], 'always'],
  ['scripts/check-guide-length.mjs', ['--staged'], 'always'],
  ['scripts/check-lcp-image-hints.mjs', ['--staged'], 'always'],
  ['scripts/check-scheduled-exec-branch.mjs', ['--staged'], { file: true }],
  ['scripts/check-note-hashtags.mjs', ['--staged'], 'always'],
  ['scripts/check-note-intro-benefit.mjs', ['--staged'], 'always'],
  ['scripts/check-note-attachments.mjs', ['--staged'], 'always'],
  ['scripts/check-note-boundary.mjs', ['--staged'], 'always'],
  ['scripts/check-rccm-essay.mjs', ['--staged'], 'always'],
  ['scripts/check-cce-essay.mjs', ['--staged'], 'always'],
  ['scripts/check-note-frontmatter-dup.mjs', ['--staged'], 'always'],
  ['scripts/check-ogp-title-fit.mjs', ['--staged'], 'always'],
  ['scripts/check-note-cover-fit.mjs', ['--staged'], 'always'],
  ['scripts/check-figure-canvas.mjs', ['--staged'], 'always'],
  ['scripts/check-orphan-figures.mjs', ['--staged'], 'always'],
  ['scripts/check-table-references.mjs', ['--staged'], 'always'],
  ['scripts/check-figure-embed-dims.mjs', ['--staged'], 'always'],
  ['scripts/check-bold-rendering.mjs', ['--staged'], 'always'],
  ['scripts/check-table-rendering.mjs', ['--staged'], 'always'],
  ['scripts/check-kindle-epub-leak.mjs', ['--bom-only'], 'always'],
  ['scripts/check-note-site-utm.mjs', ['--staged'], 'always'],
  ['scripts/check-x-utm.mjs', ['--staged'], 'always'],
  ['scripts/check-ig-cover.mjs', ['--staged'], 'always'],
  ['scripts/check-ig-cta.mjs', ['--staged'], 'always'],
];

/** 全量を走査する検査のうち、旧フックより狭くしたもの（staged の変更が入力に当たらないと飛ばす） */
const GATED = new Set(['scripts/check-datasets.mjs', 'scripts/check-qualification-ssot.mjs']);

/** 2 検査の入力（テスト側で独立に持つ。steps の宣言とずれたら下のテストが落ちる） */
const GATE_INPUTS = {
  'scripts/check-datasets.mjs': { prefixes: ['config/', 'data/', '.claude/', 'scripts/', 'tools/', 'src/', '.github/workflows/', 'content/registry/'], files: ['package.json'], fileSet: true },
  'scripts/check-qualification-ssot.mjs': { prefixes: ['config/', '.claude/config/', '.claude/knowledge/', 'src/', 'scripts/', '.claude/scripts/', 'tools/admin-app/src/'], files: [], fileSet: false },
};
/** その commit で旧フックより狭くなる（飛ばす）検査 */
function gatedOut(ctx) {
  const skipped = new Set();
  for (const [script, g] of Object.entries(GATE_INPUTS)) {
    const hit = ctx.entries.some((e) => g.prefixes.some((p) => e.path.startsWith(p)) || g.files.includes(e.path) || (g.fileSet && e.status !== 'M'));
    if (!hit) skipped.add(script);
  }
  return skipped;
}

/** 旧フックのシェルが取った判定を、ctx から再現する */
function legacyPlan(ctx, { gated = false } = {}) {
  const out = [];
  for (const [script, args, cond] of LEGACY) {
    if (cond !== 'always') {
      if (cond.skipEnv) {
        const [name, mode] = cond.skipEnv;
        const v = ctx.env[name];
        if (mode === 'eq1' ? v === '1' : v !== undefined && v !== '') continue;
      }
      if (cond.file && !ctx.exists(script)) continue;
      if (cond.staged && !ctx.staged.some((f) => cond.staged.test(f))) continue;
      if (cond.docsOrBacklog && !ctx.staged.some((f) => f.startsWith('docs/') || f === '.claude/todo/backlog.md')) continue;
      if (cond.contentQuality && ctx.contentQualityFiles.length === 0) continue;
    }
    if (gated && gatedOut(ctx).has(script)) continue;
    out.push([script, script === '.claude/scripts/lint-mdx-mobile.mjs' ? ['--baseline', '--ci', ...ctx.contentQualityFiles] : args]);
  }
  return out;
}

const entriesOf = (paths, status = 'M') => paths.map((path) => ({ status, path }));
const makeCtx = ({ staged = [], status = 'M', env = {}, missing = [], contentQualityFiles = [] } = {}) => ({
  staged,
  stagedAny: staged,
  entries: entriesOf(staged, status),
  contentQualityFiles,
  env,
  exists: (script) => !missing.includes(script),
});
const planned = (ctx) => planSteps(ctx).map(({ step, argv }) => [step.script, argv]);

test('LEGACY の表と STEPS が同じ件数・同じ順（旧フックの node 行 72 本）', () => {
  assert.equal(LEGACY.length, 72);
  assert.deepEqual(STEPS.map((s) => s.script), LEGACY.map(([s]) => s));
});

test('全量を走査する 2 検査を除き、どの staged でも旧フックと同じ検査が同じ引数・同じ順で呼ばれる', () => {
  const mdx = 'content/site/building-construction/guide-x/article.mdx';
  const scenarios = [
    ['何も staged していない', makeCtx()],
    ['記事 1 本（published: true）', makeCtx({ staged: [mdx], contentQualityFiles: [mdx] })],
    ['記事 1 本（下書き）', makeCtx({ staged: [mdx] })],
    ['記事 3 本', makeCtx({ staged: [mdx, 'content/site/a/b/article.mdx', 'content/site/a/c/article.mdx'], contentQualityFiles: [mdx, 'content/site/a/b/article.mdx'] })],
    ['マガジンの CTA 配線（note-magazines.ts）', makeCtx({ staged: ['src/lib/note-magazines.ts'] })],
    ['magazine-placement.ts', makeCtx({ staged: ['src/lib/magazine-placement.ts'] })],
    ['hub-cta.ts', makeCtx({ staged: ['src/lib/hub-cta.ts'] })],
    ['似た名前の ts（対象外）', makeCtx({ staged: ['src/lib/hub-cta.tsx', 'src/lib/note-magazines.test.ts'] })],
    ['docs/ の変更', makeCtx({ staged: ['docs/strategy/README.md'] })],
    ['backlog の変更', makeCtx({ staged: ['.claude/todo/backlog.md'] })],
    ['backlog 以外の todo（対象外）', makeCtx({ staged: ['.claude/todo/annual.md'] })],
    ['CLAUDE.md', makeCtx({ staged: ['CLAUDE.md'] })],
    ['.claude/rules', makeCtx({ staged: ['.claude/rules/code.md'] })],
    ['.claude/memory', makeCtx({ staged: ['.claude/memory/MEMORY.md'] })],
    ['memory に似た名前（対象外）', makeCtx({ staged: ['.claude/memory-old/x.md', 'docs/.claude/memory/x.md'] })],
    ['SKIP_MDX_DATES=1', makeCtx({ staged: [mdx], env: { SKIP_MDX_DATES: '1' } })],
    ['SKIP_MDX_DATES=0（"1" 以外は回避にならない）', makeCtx({ staged: [mdx], env: { SKIP_MDX_DATES: '0' } })],
    ['SKIP_GIT_BINARY_POLICY / SKIP_ASSET_REENTRY / SKIP_DRIVE_VAULT / SKIP_REFERENCE_SOURCES（空でなければ回避）', makeCtx({ staged: [mdx], env: { SKIP_GIT_BINARY_POLICY: 'x', SKIP_ASSET_REENTRY: '0', SKIP_DRIVE_VAULT: 'yes', SKIP_REFERENCE_SOURCES: '1' } })],
    ['SKIP_* が空文字（回避にならない）', makeCtx({ staged: [mdx], env: { SKIP_GIT_BINARY_POLICY: '', SKIP_DRIVE_VAULT: '' } })],
    ['検査の script が無い古いツリー（requireFile の 4 本）', makeCtx({ staged: [mdx], missing: ['scripts/check-coconala-orders.mjs', 'scripts/check-coconala-blog.mjs', 'scripts/check-affiliate-wiring.mjs', 'scripts/check-scheduled-exec-branch.mjs'] })],
  ];
  for (const [label, ctx] of scenarios) {
    assert.deepEqual(planned(ctx), legacyPlan(ctx, { gated: true }), label);
  }
  // 2 検査が走る scenario と飛ぶ scenario の両方を含む（片方だけだと絞り込みの検査にならない）
  const skippedCounts = scenarios.map(([, ctx]) => gatedOut(ctx).size);
  assert.ok(skippedCounts.some((n) => n === 2) && skippedCounts.some((n) => n < 2));
});

test('全量を走査する 2 検査は、入力に当たる変更があれば旧フックと同じく回る（コード・設定・データ・台帳の置き場）', () => {
  const triggers = {
    'scripts/check-datasets.mjs': ['config/exam-calendar.json', 'data/note/sales.json', '.claude/state/todo-claims.json', 'content/registry/articles.json', 'scripts/lib/datasets.mjs', 'tools/admin-app/src/x.tsx', 'src/lib/x.ts', '.github/workflows/ci.yml', 'package.json', '.claude/skills/x/SKILL.md'],
    'scripts/check-qualification-ssot.mjs': ['config/qualification-registry.json', '.claude/config/x.json', '.claude/knowledge/x.json', 'src/config/categories.json', 'scripts/x.mjs', '.claude/scripts/x.mjs', 'tools/admin-app/src/x.ts', 'src/lib/x.ts'],
  };
  for (const [script, paths] of Object.entries(triggers)) {
    for (const p of paths) {
      const ctx = makeCtx({ staged: [p] });
      assert.ok(planned(ctx).some(([s]) => s === script), `${script} が ${p} の変更で回らない`);
    }
  }
  // 追加・削除は追跡ファイルの集合を変えるので datasets だけは必ず回す（参照先の記事の実在・台帳の網羅）
  for (const status of ['A', 'D', 'T']) {
    assert.ok(planned(makeCtx({ staged: ['content/site/a/b/article.mdx'], status })).some(([s]) => s === 'scripts/check-datasets.mjs'), status);
  }
});

test('全量を走査する 2 検査は、記事の編集（M）だけの commit では飛ばす＝旧フックより狭いのはここだけ', () => {
  const ctx = makeCtx({ staged: ['content/site/building-construction/guide-x/article.mdx', 'content/note/x/y/article.md', 'docs/README.md'], status: 'M' });
  const ran = new Set(planned(ctx).map(([s]) => s));
  for (const g of GATED) assert.ok(!ran.has(g), `${g} が記事の編集で回っている`);
  assert.equal(gatedOut(ctx).size, 2);
  // 飛ばすのは GATED の 2 本だけ。ほかは旧フックのまま
  assert.deepEqual(planned(ctx), legacyPlan(ctx, { gated: true }));
});

test('touches が投げたら走らせる側に倒す（設定が読めなくても検査を落とさない）', () => {
  const step = { id: 'x', script: 'scripts/x.mjs', args: [], touches: () => { throw new Error('boom'); } };
  assert.equal(planSteps(makeCtx(), [step]).length, 1);
});

test('止め方: 最初に失敗した検査で止まり、後ろは呼ばれない。exit code は 1', async () => {
  const calls = [];
  const logs = [];
  const exec = (step) => { calls.push(step.id); return { code: step.id === 'check-ig-cover' ? 2 : 0, captured: '' }; };
  const ctx = makeCtx({ staged: ['x.md'] });
  const r = await dispatch(ctx, { exec, log: (l) => logs.push(l) });
  assert.equal(r.code, 1);
  assert.equal(r.failed, 'check-ig-cover');
  assert.equal(calls.at(-1), 'check-ig-cover');
  assert.ok(!calls.includes('check-ig-cta'), '失敗の後ろの検査が呼ばれた');
  assert.deepEqual(logs, []);
});

test('止め方: 全部通れば exit 0 で、計画した検査を全部呼ぶ', async () => {
  const calls = [];
  const ctx = makeCtx({ staged: ['x.md'] });
  const r = await dispatch(ctx, { exec: (step) => { calls.push(step.id); return { code: 0, captured: '' }; }, log: () => {} });
  assert.equal(r.code, 0);
  assert.equal(r.failed, null);
  assert.deepEqual(calls, planSteps(ctx).map(({ step }) => step.id));
});

test('止め方: coconala の 2 検査は exit 1 のときだけ止める（旧フックの [ $? -eq 1 ]）。ほかは 0 以外で止まる', async () => {
  for (const id of ['check-coconala-orders', 'check-coconala-blog']) {
    const step = STEPS.find((s) => s.id === id);
    assert.equal(isFailure(step, 1), true, id);
    assert.equal(isFailure(step, 2), false, `${id} は exit 2 では止めない`);
    assert.equal(isFailure(step, 0), false, id);
  }
  for (const step of STEPS.filter((s) => s.failOnlyCode === undefined)) {
    assert.equal(isFailure(step, 0), false, step.id);
    assert.equal(isFailure(step, 1), true, step.id);
    assert.equal(isFailure(step, 2), true, step.id);
    assert.equal(isFailure(step, 127), true, step.id);
  }
  assert.deepEqual(STEPS.filter((s) => s.failOnlyCode !== undefined).map((s) => s.id), ['check-coconala-orders', 'check-coconala-blog']);
});

test('止め方: 出力を捕まえる 2 検査は成功時は黙り、失敗時だけ末尾 20 / 15 行と案内を出す', async () => {
  const lines = (n) => Array.from({ length: n }, (_, i) => `line${i + 1}`).join('\n') + '\n';
  for (const [id, tail, hint] of [['content-quality', 20, '[content-quality --staged]'], ['check-project-task-refs', 15, '[check-project-task-refs]']]) {
    const only = STEPS.filter((s) => s.id === id);
    const ctx = makeCtx({ staged: ['docs/a.md'], contentQualityFiles: ['content/site/a/b/article.mdx'] });
    const ok = [];
    await dispatch(ctx, { steps: only, exec: () => ({ code: 0, captured: lines(50) }), log: (l) => ok.push(l) });
    assert.deepEqual(ok, [], `${id} は成功時に出力しない`);
    const ng = [];
    const r = await dispatch(ctx, { steps: only, exec: () => ({ code: 1, captured: lines(50) }), log: (l) => ng.push(l) });
    assert.equal(r.code, 1);
    const shown = ng[0].split('\n');
    assert.equal(shown.length, tail, `${id}: 末尾 ${tail} 行`);
    assert.equal(shown.at(-1), 'line50');
    assert.ok(ng[1].startsWith(hint), id);
  }
});

test('tailLines は tail -N と同じ（末尾の空行も 1 行・改行なしの最終行も数える）', () => {
  assert.equal(tailLines('a\nb\nc\n', 2), 'b\nc');
  assert.equal(tailLines('a\nb\n\n', 2), 'b\n');
  assert.equal(tailLines('a\nb', 5), 'a\nb');
  assert.equal(tailLines('a\n', 20), 'a');
});

test('止め方: affiliate-wiring が落ちたら案内を 1 行足す', async () => {
  const only = STEPS.filter((s) => s.id === 'check-affiliate-wiring');
  const out = [];
  const r = await dispatch(makeCtx(), { steps: only, exec: () => ({ code: 1, captured: '' }), log: (l) => out.push(l) });
  assert.equal(r.code, 1);
  assert.deepEqual(out, ['[pre-commit] アフィリ配線（3 ASP）に不整合。commit を中止しました。']);
});

test('inProcess の検査はすべて run() を export し、import しただけでは走らない。script は実在する', async () => {
  let checked = 0;
  for (const step of STEPS) {
    if (step.requireFile && !existsSync(join(ROOT, step.script))) continue;
    assert.ok(existsSync(join(ROOT, step.script)), `${step.script} が無い`);
    if (!step.inProcess) continue;
    const mod = await import(pathToFileURL(join(ROOT, step.script)).href);
    assert.equal(typeof mod.run, 'function', `${step.script} が run() を export していない`);
    checked += 1;
  }
  // 子プロセスのままなのは npx tsx の 1 本だけ（検査ゼロを PASS と呼ばない）
  assert.deepEqual(STEPS.filter((s) => !s.inProcess).map((s) => s.id), ['check-magazine-cta-reachability']);
  assert.equal(checked, 71);
});

test('cli-run: runBody は process.exit を ExitSignal に、process.argv / exitCode を引数に読み替える', async () => {
  const r1 = await runBody(['--a'], import.meta.url, async ({ argv, exit }) => {
    assert.deepEqual(argv.slice(2), ['--a']);
    exit(3);
    assert.fail('exit の後ろは実行されない');
  });
  assert.deepEqual(r1, { code: 3 });
  const r2 = await runBody([], import.meta.url, async ({ status }) => { status.code = 2; });
  assert.deepEqual(r2, { code: 2 });
  const r3 = await runBody([], import.meta.url, async ({ status, exit }) => { status.code = 4; exit(); });
  assert.deepEqual(r3, { code: 4 });
  await assert.rejects(runBody([], import.meta.url, async () => { throw new Error('boom'); }), /boom/);
});

test('cli-run: runMain は exitWith の code・戻り値の数値・何も返さない（0）を { code } にする', async () => {
  assert.deepEqual(await runMain(() => { exitWith(2); }, []), { code: 2 });
  assert.deepEqual(await runMain(() => 1, []), { code: 1 });
  assert.deepEqual(await runMain(() => undefined, []), { code: 0 });
  await assert.rejects(runMain(() => { throw new Error('x'); }, []), /x/);
  assert.ok(new ExitSignal(5) instanceof Error);
});

test('cli-run: isCliEntry はシンボリックリンク越しの起動でも CLI と判定し、import されただけなら false', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cli-entry-'));
  try {
    const real = join(dir, 'real');
    const link = join(dir, 'link');
    spawnSync('mkdir', ['-p', real]);
    symlinkSync(real, link);
    const cliRun = pathToFileURL(join(ROOT, 'scripts/lib/cli-run.mjs')).href;
    // 実行されたら "ran:<code>" を出し、exit code 3 で終わる検査（process.exit を呼ばない）
    writeFileSync(join(real, 'check.mjs'), `import { isCliEntry, runAsCli } from '${cliRun}';\nexport async function run() { console.log('ran'); return { code: 3 }; }\nif (isCliEntry(import.meta.url)) runAsCli(run);\n`);
    writeFileSync(join(real, 'importer.mjs'), `await import('./check.mjs');\nconsole.log('imported');\n`);
    const viaLink = spawnSync(process.execPath, [join(link, 'check.mjs')], { encoding: 'utf8' });
    assert.equal(viaLink.stdout.trim(), 'ran', 'シンボリックリンク越しの起動で CLI が走らない');
    assert.equal(viaLink.status, 3);
    const viaReal = spawnSync(process.execPath, [join(real, 'check.mjs')], { encoding: 'utf8' });
    assert.equal(viaReal.stdout.trim(), 'ran');
    assert.equal(viaReal.status, 3);
    const imported = spawnSync(process.execPath, [join(real, 'importer.mjs')], { encoding: 'utf8' });
    assert.equal(imported.stdout.trim(), 'imported', 'import しただけで検査が走った');
    assert.equal(typeof isCliEntry, 'function');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
