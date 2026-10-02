// tests/seo-thresholds.test.mjs
//
// title・description の長さの規則は config/seo-meta-config.json の thresholds だけが持ち、
// lint・build 後の検査・サイトの整形（src/lib/metadata.ts）が同じ値を読むことを固定する。
// 守りたい事故: 数字を各所に書き写し、片方だけ直して「lint は通るのに検索結果で切れる」状態になる。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DESCRIPTION_LINT_MAX, DESCRIPTION_MAX, DESCRIPTION_MIN, TITLE_MAX } from '../scripts/lib/seo-thresholds.mjs';
import { checkDescription } from '../scripts/lib/seo-checks.mjs';
import { lintFrontmatter } from '../.claude/scripts/lint-frontmatter.mjs';
import { loadTsModule } from './lib/load-ts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { thresholds } = JSON.parse(readFileSync(join(ROOT, 'config', 'seo-meta-config.json'), 'utf8'));

test('読み手が受け取る値は config の thresholds そのもので、短すぎ < 推奨上限 < lint の上限の順', () => {
  assert.equal(TITLE_MAX, thresholds.title.max_length);
  assert.equal(DESCRIPTION_MIN, thresholds.description.min_length);
  assert.equal(DESCRIPTION_MAX, thresholds.description.max_length);
  assert.equal(DESCRIPTION_LINT_MAX, thresholds.description.lint_max_length);
  assert.ok(DESCRIPTION_MIN < DESCRIPTION_MAX && DESCRIPTION_MAX <= DESCRIPTION_LINT_MAX);
});

test('build 後の検査（seo-checks）は推奨上限を超えたときだけ警告し、CI は落とさない', () => {
  assert.deepEqual(checkDescription({ description: 'あ'.repeat(DESCRIPTION_MAX) }), []);
  const over = checkDescription({ description: 'あ'.repeat(DESCRIPTION_MAX + 1) });
  assert.equal(over.length, 1);
  assert.equal(over[0].level, 'warn');
  assert.match(over[0].message, new RegExp(`推奨 ${DESCRIPTION_MAX} 字以下`));
});

test('lint-frontmatter は短すぎを MEDIUM・lint の上限超を LOW とし、推奨上限〜lint の上限の間は指摘しない', () => {
  const codes = (description) => lintFrontmatter('x/article.mdx', { title: 't', description, published: false }, new Set()).map((i) => i.code);
  assert.ok(codes('あ'.repeat(DESCRIPTION_MIN - 1)).includes('desc-short'));
  assert.ok(!codes('あ'.repeat(DESCRIPTION_MIN)).includes('desc-short'));
  assert.ok(!codes('あ'.repeat(DESCRIPTION_LINT_MAX)).includes('desc-long'));
  assert.ok(codes('あ'.repeat(DESCRIPTION_LINT_MAX + 1)).includes('desc-long'));
  const messages = lintFrontmatter('x/article.mdx', { title: 't', description: 'あ'.repeat(DESCRIPTION_LINT_MAX + 1), published: false }, new Set());
  const long = messages.find((i) => i.code === 'desc-long');
  assert.match(long.message, new RegExp(`推奨 <= ${DESCRIPTION_MAX}、上限 ${DESCRIPTION_LINT_MAX}`));
});

test('サイトの整形（src/lib/metadata.ts）も同じ推奨上限へ収める', async () => {
  const { normalizeMetaDescription } = await loadTsModule('src/lib/metadata.ts');
  assert.equal(normalizeMetaDescription('あ'.repeat(DESCRIPTION_MAX)).length, DESCRIPTION_MAX);
  assert.ok(normalizeMetaDescription('あ'.repeat(DESCRIPTION_MAX + 50)).length <= DESCRIPTION_MAX);
});
