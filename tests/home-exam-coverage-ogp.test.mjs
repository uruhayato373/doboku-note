// 表示中のカテゴリが OGP のテーマ色を持つことの検査（DN-0786）。
// 2026-10-20 に測量士・舗装が ogp-create の対応表から漏れ、OGP が枠色なしで出ていた。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ogpCoverageErrors } from '../scripts/check-home-exam-coverage.mjs';
import { CATEGORY_TO_EXAM_KEY } from '../.claude/skills/conversion/ogp-create/scripts/lib/category-exam-key.mjs';

const CATEGORIES = JSON.parse(readFileSync('src/config/categories.json', 'utf8'));
const TOKENS = JSON.parse(readFileSync('.claude/knowledge/design-system/note-cover-tokens.json', 'utf8'));

test('今の categories.json の表示中カテゴリはすべてテーマ色を持つ', () => {
  const { checked, errors } = ogpCoverageErrors(CATEGORIES, CATEGORY_TO_EXAM_KEY, TOKENS);
  assert.ok(checked >= 10, `検査したカテゴリが ${checked} 件しかない`);
  assert.deepEqual(errors, []);
});

test('対応表から 1 行消すと赤になり、visible:false のカテゴリは対象外', () => {
  const { surveyor: _drop, ...map } = CATEGORY_TO_EXAM_KEY;
  assert.equal(ogpCoverageErrors(CATEGORIES, map, TOKENS).errors.length, 1);
  const hidden = CATEGORIES.map((c) => (c.slug === 'surveyor' ? { ...c, visible: false } : c));
  assert.deepEqual(ogpCoverageErrors(hidden, map, TOKENS).errors, []);
});

test('色キーが note-cover-tokens に無いと赤になる', () => {
  const map = { ...CATEGORY_TO_EXAM_KEY, surveyor: 'no-such-key' };
  const { errors } = ogpCoverageErrors(CATEGORIES, map, TOKENS);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /no-such-key/);
});
