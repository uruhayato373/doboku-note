import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';
import { DESCRIPTION_LINT_MAX, DESCRIPTION_MIN, TITLE_MAX } from '../scripts/lib/seo-thresholds.mjs';
import { loadTsModule } from './lib/load-ts.mjs';

// 生成ページの title・description の上書き（src/config/page-seo-overrides.json → buildPageMetadata）。
const overrides = JSON.parse(readFileSync(join(ROOT, 'src/config/page-seo-overrides.json'), 'utf8')).pages;
const catalog = JSON.parse(readFileSync(join(ROOT, 'content/site/standards-library/catalog.json'), 'utf8'));
const len = (s) => [...s].length;

test('上書きは長さの基準に収まり、title に template を含めない', () => {
  const paths = Object.keys(overrides);
  assert.ok(paths.length > 0);
  for (const [path, o] of Object.entries(overrides)) {
    assert.ok(o.title || o.description, `${path}: 中身が無い`);
    if (o.title) {
      assert.ok(len(o.title) <= TITLE_MAX, `${path}: title ${len(o.title)} 字`);
      assert.ok(!o.title.includes('doboku-note'), `${path}: title template を含む`);
    }
    if (o.description) assert.ok(len(o.description) >= DESCRIPTION_MIN && len(o.description) <= DESCRIPTION_LINT_MAX, `${path}: description ${len(o.description)} 字`);
  }
});

test('上書きの path は基準書の機関・文書として実在する（章は機関・文書の部分で照合）', () => {
  const text = JSON.stringify(catalog);
  for (const path of Object.keys(overrides)) {
    const [, area, agency, document] = path.split('/');
    assert.equal(area, 'standards', path);
    assert.ok(text.includes(`"${agency}"`), `${path}: 機関 ${agency} が catalog に無い`);
    if (document) assert.ok(text.includes(document), `${path}: 文書 ${document} が catalog に無い`);
  }
});

test('buildPageMetadata は path が一致したときだけ上書きする', async () => {
  const { buildPageMetadata } = await loadTsModule('src/lib/metadata.ts');
  const [path, o] = Object.entries(overrides).find(([, v]) => v.title);
  const hit = buildPageMetadata({ title: '元の題', description: '元の説明'.repeat(20), path });
  assert.equal(hit.title, o.title);
  assert.equal(hit.openGraph.title, o.title);
  const miss = buildPageMetadata({ title: '元の題', description: '元の説明', path: '/standards/no-such' });
  assert.equal(miss.title, '元の題');
});
