import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTsModule } from './lib/load-ts.mjs';

const routes = await loadTsModule('src/lib/content-routes.ts');
const categories = await loadTsModule('src/lib/categories.ts');
const index = JSON.parse(readFileSync('src/config/doc-meta-index.json', 'utf8'));

test('領域は categories.json の area で決まる（practice / exam / standards）', () => {
  const practice = Object.keys(index.docs).find((s) => index.docs[s].category === 'civil-practice');
  assert.ok(practice, 'civil-practice の記事が index に無い');
  assert.match(routes.getPublicDocPath(practice), /^\/practice\/[^/]+$/);
  const kw = Object.keys(index.docs).find((s) => index.docs[s].category === 'pe-construction' && index.docs[s].group === 'keyword');
  assert.match(routes.getPublicDocPath(kw), /^\/exam\/pe-construction\/keywords\/[^/]+$/);
  assert.equal(categories.getCategoryHubPath('civil-practice'), '/practice');
  assert.equal(categories.getCategoryHubPath('reference-materials'), '/standards');
  assert.equal(categories.getCategoryHubPath('civil-construction-1'), '/exam/civil-construction-1');
});

test('公開ルートは index の公開記事数と一致し、path が重複しない', () => {
  const all = routes.getAllPublicDocRoutes();
  assert.equal(all.length, Object.keys(index.docs).length);
  const paths = new Set(all.map((r) => r.path));
  assert.equal(paths.size, all.length, 'path の重複');
  for (const r of all) assert.ok(['exam', 'practice', 'standards'].includes(r.area), `${r.legacySlug}: area`);
});

test('全カテゴリが area と groups を宣言している', () => {
  for (const c of categories.getAllCategories()) {
    assert.ok(['exam', 'practice', 'standards'].includes(c.area), `${c.slug}: area`);
    assert.ok(Array.isArray(c.groups) && c.groups.length > 0, `${c.slug}: groups`);
  }
});
