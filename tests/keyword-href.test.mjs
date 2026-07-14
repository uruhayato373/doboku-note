import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildKeywordHref,
  LEGACY_BARE_SLUG_CATEGORY,
} from '../src/lib/keyword-href.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const categories = JSON.parse(
  readFileSync(join(__dirname, '..', 'src', 'config', 'categories.json'), 'utf8'),
);
const CATEGORY_SLUGS = categories.map((c) => c.slug);

// 各カテゴリの代表 slug（完全修飾済み）は自己 URL をそのまま返すべき。
// カテゴリを跨いで漏れなく検証するため categories.json から動的に生成する。
const REPRESENTATIVE_SUFFIX = {
  'civil-construction-1': 'guide-overview',
  'civil-construction-2': 'guide-overview',
  'pe-comprehensive-management': 'followership',
  'pe-first-stage': 'r07-basic',
  'pe-construction': 'guide-required-essay',
  'concrete-chief-engineer': 'primary-durability',
  'concrete-diagnostician': 'guide-overview',
  'reference-materials': 'floodgate',
};

test('全カテゴリの完全修飾 slug は self URL をそのまま返す（誤変換しない）', () => {
  for (const catSlug of CATEGORY_SLUGS) {
    const suffix = REPRESENTATIVE_SUFFIX[catSlug] ?? 'sample';
    const slug = `${catSlug}-${suffix}`;
    assert.equal(
      buildKeywordHref(slug, CATEGORY_SLUGS),
      `/docs/${slug}`,
      `${catSlug} の完全修飾 slug が self URL にならなかった`,
    );
  }
});

test('legacy 裸 slug（接頭辞なし）は総監 URL を補完する', () => {
  assert.equal(
    buildKeywordHref('followership', CATEGORY_SLUGS),
    '/docs/pe-comprehensive-management-followership',
  );
  assert.equal(
    buildKeywordHref('safety-management-system', CATEGORY_SLUGS),
    '/docs/pe-comprehensive-management-safety-management-system',
  );
});

test('concrete-chief-engineer / pe-first-stage の slug を総監 URL へ誤変換しない', () => {
  // 2026-07 の BROKEN_SLUG 166 件の中核: これらが誤って
  // /docs/pe-comprehensive-management-concrete-chief-engineer-... になっていた。
  assert.equal(
    buildKeywordHref('concrete-chief-engineer-textbook-durability', CATEGORY_SLUGS),
    '/docs/concrete-chief-engineer-textbook-durability',
  );
  assert.equal(
    buildKeywordHref('pe-first-stage-r07-construction', CATEGORY_SLUGS),
    '/docs/pe-first-stage-r07-construction',
  );
  assert.equal(
    buildKeywordHref('pe-construction-required-r05', CATEGORY_SLUGS),
    '/docs/pe-construction-required-r05',
  );
  for (const slug of [
    'concrete-chief-engineer-primary-materials',
    'pe-first-stage-r03-aptitude',
    'concrete-diagnostician-guide-overview',
    'reference-materials-tunnel-02',
  ]) {
    const href = buildKeywordHref(slug, CATEGORY_SLUGS);
    assert.ok(
      !href.includes('pe-comprehensive-management-concrete') &&
        !href.includes('pe-comprehensive-management-pe-') &&
        !href.includes('pe-comprehensive-management-reference'),
      `${slug} が総監 URL へ誤変換された: ${href}`,
    );
    assert.equal(href, `/docs/${slug}`);
  }
});

test('接頭辞照合は長い slug を優先する（civil-construction-1 と -2 が衝突しない）', () => {
  assert.equal(
    buildKeywordHref('civil-construction-1-guide-overview', CATEGORY_SLUGS),
    '/docs/civil-construction-1-guide-overview',
  );
  assert.equal(
    buildKeywordHref('civil-construction-2-guide-overview', CATEGORY_SLUGS),
    '/docs/civil-construction-2-guide-overview',
  );
});

test('LEGACY_BARE_SLUG_CATEGORY は categories.json に存在する', () => {
  assert.ok(
    CATEGORY_SLUGS.includes(LEGACY_BARE_SLUG_CATEGORY),
    'legacy 補完先カテゴリが categories.json に無い',
  );
});
