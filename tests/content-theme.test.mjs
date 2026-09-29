import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import matter from 'gray-matter';
import { buildThemes, classifyNote, loadThemes, themeLabel } from '../scripts/lib/content-theme.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

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

test('サイドメニュー用の短い名前（無ければ正式名）', async () => {
  const { themeShortLabel } = await import('../scripts/lib/content-theme.mjs');
  const c = buildThemes({ ...cfg, shortLabels: { 'pe-comprehensive-management': '技術士 総監' } }, registry);
  assert.equal(themeShortLabel(c, 'pe-comprehensive-management'), '技術士 総監');
  assert.equal(themeShortLabel(c, 'career'), '転職・キャリア');
  assert.throws(() => buildThemes({ ...cfg, shortLabels: { typo: 'x' } }, registry), /未知のテーマ typo/);
});
