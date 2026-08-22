// tests/sns-design-tokens.test.mjs
//
// SNS 共通デザイントークン (.claude/scripts/lib/sns-common/design-tokens.mjs) が
// src/styles/globals.css の Light モード値と乖離していないことを確認する。
//
// globals.css を真実源として、トークンの hex を抜粋的にマッチさせる。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { COLORS, SIZES, FONTS, SPACING, FONT_SIZES } from '#lib/sns-common/design-tokens.mjs';

test('COLORS.brand は #2e6da4', () => {
  assert.equal(COLORS.brand, '#2e6da4');
});

test('SIZES.ytShorts は 1080×1920（YouTube Shorts 規格）', () => {
  assert.deepEqual(SIZES.ytShorts, { width: 1080, height: 1920 });
});

test('SIZES.igCarousel は 1080×1350（Instagram カルーセル 4:5）', () => {
  assert.deepEqual(SIZES.igCarousel, { width: 1080, height: 1350 });
});

test('SIZES.ytStandard は 1920×1080（YouTube 標準動画）', () => {
  assert.deepEqual(SIZES.ytStandard, { width: 1920, height: 1080 });
});

test('FONTS は Noto Sans JP / Inter で構成される', () => {
  assert.equal(FONTS.heading, 'Noto Sans JP');
  assert.equal(FONTS.body, 'Noto Sans JP');
  assert.equal(FONTS.alpha, 'Inter');
});

test('SPACING.cardRadius と contentPadding が定義される', () => {
  assert.equal(typeof SPACING.cardRadius, 'number');
  assert.equal(typeof SPACING.contentPadding, 'number');
});

test('FONT_SIZES の階層が広→狭で並ぶ', () => {
  assert.ok(FONT_SIZES.hero > FONT_SIZES.title);
  assert.ok(FONT_SIZES.title > FONT_SIZES.subtitle);
  assert.ok(FONT_SIZES.subtitle > FONT_SIZES.body);
  assert.ok(FONT_SIZES.body > FONT_SIZES.caption);
});

test('COLORS は src/styles/globals.css の Light モード値と一致する（抜粋）', () => {
  const css = readFileSync('src/styles/globals.css', 'utf-8');
  // Light モードの :root は最初に定義されており、各色名の最初の出現を Light 値とみなす
  const expectedPairs = [
    ['--color-brand', COLORS.brand],
    ['--color-brand-fill', COLORS.brandFill],
    ['--color-brand-deep', COLORS.brandDeep],
    ['--color-ink-strong', COLORS.inkStrong],
    ['--color-ink-body', COLORS.inkBody],
    ['--color-ink-muted', COLORS.inkMuted],
    ['--color-positive', COLORS.positive],
    ['--color-warn', COLORS.warn],
    ['--color-danger', COLORS.danger],
  ];
  for (const [varName, expected] of expectedPairs) {
    const re = new RegExp(`${varName}:\\s*(#[0-9a-fA-F]+)`);
    const m = css.match(re);
    assert.ok(m, `${varName} が globals.css に存在しない`);
    assert.equal(m[1].toLowerCase(), expected.toLowerCase(), `${varName} の hex が一致しない`);
  }
});
