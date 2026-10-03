import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import { buildThemes, classifyNote, classifyNoteStage, loadThemes, stageTheme, stageThemeIds, themeLabel, themeShortLabel } from '../scripts/lib/content-theme.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const registry = {
  qualifications: [
    { id: 'civil-construction-1', label: '1級土木施工管理技士' },
    { id: 'pe-comprehensive-management', label: '技術士 総合技術監理部門' },
  ],
  families: { 'civil-construction': '土木施工管理' },
};
const cfg = {
  topics: [{ id: 'career', label: '転職・キャリア' }],
  rules: {
    note: [
      { theme: 'career', utmCampaignPrefix: 'civil-career-' },
      { theme: 'civil-construction-1', pathPrefix: '1級・2級土木/1級土木/' },
      { theme: 'civil-construction', pathPrefix: '1級・2級土木/' },
      { theme: 'pe-comprehensive-management', pathPrefix: '技術士総監/' },
    ],
  },
};
const ctx = buildThemes(cfg, registry);

test('資格のフォルダにある転職の記事は、utmCampaign で転職・キャリアになる', () => {
  assert.equal(classifyNote(ctx, '1級・2級土木/転職エージェント比較-無料/article.md', { utmCampaign: 'civil-career-agent-comparison' }), 'career');
  assert.equal(classifyNote(ctx, '技術士総監/資格取得後の担当経験の伝え方-無料/article.md', { utmCampaign: 'civil-career-pe-experience' }), 'career');
});

test('パスは上から順に評価し、細かいルールが先に当たる（Windows の区切りでも同じ）', () => {
  assert.equal(classifyNote(ctx, '1級・2級土木/1級土木/magazines/x/article.md', {}), 'civil-construction-1');
  assert.equal(classifyNote(ctx, '1級・2級土木\\1級土木\\x\\article.md', {}), 'civil-construction-1');
  assert.equal(classifyNote(ctx, '1級・2級土木/土木もくじ/article.md', {}), 'civil-construction');
});

test('frontmatter の contentTheme はルールより優先し、未知のテーマは未分類にする。出題テーマの theme: は読まない', () => {
  assert.equal(classifyNote(ctx, '技術士総監/x/article.md', { contentTheme: 'career' }), 'career');
  assert.equal(classifyNote(ctx, '技術士総監/x/article.md', { theme: '気候変動適応・国土強靱化・防災' }), 'pe-comprehensive-management');
  assert.equal(classifyNote(ctx, '技術士総監/x/article.md', { contentTheme: 'no-such-theme' }), null);
});

test('どのルールにも当たらなければ未分類（黙って落とさない）', () => {
  assert.equal(classifyNote(ctx, '新しい資格/x/article.md', {}), null);
  assert.equal(themeLabel(ctx, null), '未分類');
  assert.equal(themeLabel(ctx, 'career'), '転職・キャリア');
  assert.equal(themeLabel(ctx, 'civil-construction'), '土木施工管理');
});

test('ルールが未知のテーマを指していたら読み込みで止める', () => {
  assert.throws(() => buildThemes({ rules: { note: [{ theme: 'typo', pathPrefix: 'x/' }] } }, registry), /未知のテーマ typo/);
});

test('実際の note の記事はすべてテーマに分類できる（新しいフォルダを足したらルールも足す）', () => {
  const real = loadThemes(ROOT);
  const noteRoot = join(ROOT, 'content', 'note');
  const unclassified = [];
  let checked = 0;
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) { if (e.name !== 'img') walk(join(dir, e.name)); continue; }
      if (!/^article(-[^/\\]+)?\.md$/.test(e.name)) continue;
      const abs = join(dir, e.name);
      const rel = relative(noteRoot, abs);
      checked += 1;
      if (!classifyNote(real, rel, matter(readFileSync(abs, 'utf8')).data)) unclassified.push(rel);
    }
  };
  walk(noteRoot);
  assert.ok(checked > 500, `検査対象が少なすぎる（${checked} 本）`);
  assert.deepEqual(unclassified, []);
});

test('サイドメニュー用の短い名前は registry の shortLabel・familyShortLabels（無ければ正式名）', () => {
  const reg = {
    ...registry,
    qualifications: registry.qualifications.map((q) => (q.id === 'pe-comprehensive-management' ? { ...q, shortLabel: '技術士 総監' } : q)),
    familyShortLabels: { 'civil-construction': '1・2級土木 共通' },
  };
  const c = buildThemes(cfg, reg);
  assert.equal(themeShortLabel(c, 'pe-comprehensive-management'), '技術士 総監');
  assert.equal(themeShortLabel(c, 'civil-construction'), '1・2級土木 共通');
  assert.equal(themeShortLabel(c, 'career'), '転職・キャリア');
  // content-themes.json に名前を写すと止める
  assert.throws(() => buildThemes({ ...cfg, shortLabels: { 'pe-comprehensive-management': 'x' } }, registry), /写さない/);
});

test('splitByStage: 区分つきテーマ・全般・名前・枝の並び', () => {
  const stages = new Map([['civil-construction-1', [{ id: 'first', label: '第一次検定' }, { id: 'second', label: '第二次検定' }]]]);
  const c = buildThemes(
    { ...cfg, splitByStage: ['civil-construction-1'], stageRules: { note: [{ pattern: '二次|経験記述', stage: 'second' }, { pattern: '一次', stage: 'first' }] } },
    { ...registry, qualifications: registry.qualifications.map((q) => (q.id === 'civil-construction-1' ? { ...q, shortLabel: '1級土木' } : q)) },
    stages,
  );
  assert.equal(classifyNoteStage(c, 'content/note/1級・2級土木/1級土木/1級経験記述で落ちる答案/article.md'), 'second');
  assert.equal(classifyNoteStage(c, 'content\\note\\1級土木\\一次択一-過去問PDF\\article.md'), 'first');
  assert.equal(classifyNoteStage(c, 'content/note/1級土木/1級土木をAIで勉強する/article.md'), null);
  assert.equal(stageTheme(c, 'civil-construction-1', ['first']), 'civil-construction-1:first');
  assert.equal(stageTheme(c, 'civil-construction-1', ['first', 'second']), 'civil-construction-1:common');
  assert.equal(stageTheme(c, 'civil-construction-1', []), 'civil-construction-1:common');
  assert.equal(stageTheme(c, 'pe-comprehensive-management', ['written']), 'pe-comprehensive-management');
  assert.equal(themeLabel(c, 'civil-construction-1:second'), '1級土木施工管理技士 第二次検定');
  assert.equal(themeShortLabel(c, 'civil-construction-1:common'), '1級土木 全般');
  assert.deepEqual(stageThemeIds(c, 'civil-construction-1'), ['civil-construction-1:first', 'civil-construction-1:second', 'civil-construction-1:common']);
  assert.throws(() => buildThemes({ ...cfg, splitByStage: ['civil-construction-1'] }, registry, new Map()), /区分が無い/);
  assert.throws(() => buildThemes({ ...cfg, stageRules: { note: [{ pattern: 'x', stage: 'oral' }] } }, registry, stages), /未知の区分 oral/);
});
