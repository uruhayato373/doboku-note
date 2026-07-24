/**
 * note カバー Crop-safe V4（cover.variant: crop-safe-v4）の回帰テスト。
 * 仕様 SSOT: .claude/knowledge/design-system/note-cover-crop-safe-v4.md
 * 対象: ogp-templates.mjs の renderNoteCoverCropSafeV4 / v4FitFontSize / v4FitIssues と
 *       renderNoteCoverG2 の opt-in 分岐（variant なし G2 の非回帰）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplate, v4FitFontSize, v4FitIssues, V4_SAFE } from '../.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs';

const SIZE = { width: 1280, height: 670 };
const PALETTE = { band: '#16365C', accent: '#1E73C8', label: '技術士（総合技術監理部門）' };

const V4_COVER = {
  variant: 'crop-safe-v4',
  leadIn: '技術士 総監｜択一式',
  headline: '頻出テーマ',
  hi: '680',
  hiSuffix: '問分析',
  benefit: '学習の優先順位がわかる',
  meta: '無料記事',
};

test('V4 記事: 正常レンダリング（headline/benefit を含み chips アイコンを含まない）', () => {
  const el = renderTemplate('note-cover-g2', { cover: { ...V4_COVER, chips: [{ icon: 'doc', text: 'x' }] }, palette: PALETTE }, SIZE);
  const s = JSON.stringify(el);
  assert.ok(s.includes('頻出テーマ'), 'headline が描画される');
  assert.ok(s.includes('学習の優先順位がわかる'), 'benefit が描画される');
  assert.ok(!s.includes('border-radius:999px') && !s.includes('"borderRadius":"999px"'), 'V4 では chips ピルを描画しない');
});

test('V4 マガジン: magazineName/qualifier/proof/benefit を描画', () => {
  const el = renderTemplate(
    'note-cover-g2',
    {
      cover: { variant: 'crop-safe-v4', qualifier: '技術士 総監｜記述式', magazineName: '国家施策バンク', proof: '11テーマ・68施策', benefit: '設問3の弾薬を備蓄' },
      palette: { band: '#16365C', label: '' },
      magazine: true,
    },
    SIZE,
  );
  const s = JSON.stringify(el);
  for (const t of ['国家施策バンク', '技術士 総監｜記述式', '11テーマ・68施策', '設問3の弾薬を備蓄']) {
    assert.ok(s.includes(t), `${t} が描画される`);
  }
});

test('G2 非回帰: variant なしは従来 G2（banner 描画・V4 debug 要素なし）', () => {
  const g2Cover = { leadIn: 'リード', hi: '5', hiSuffix: '管理', banner: 'テストバナー帯', meta: '無料記事', chips: [{ icon: 'doc', text: 'a' }, { icon: 'edit', text: 'b' }, { icon: 'check', text: 'c' }] };
  const el = renderTemplate('note-cover-g2', { cover: g2Cover, palette: PALETTE }, SIZE);
  const s = JSON.stringify(el);
  assert.ok(s.includes('テストバナー帯'), 'banner が従来どおり描画される');
  assert.ok(s.includes('"top":"392px"'), 'バナー帯の座標(392px)が不変');
});

test('不正 variant: 黙って G2 へフォールバックせず throw', () => {
  assert.throws(
    () => renderTemplate('note-cover-g2', { cover: { variant: 'clarity', banner: 'x' }, palette: PALETTE }, SIZE),
    /未知の cover\.variant/,
  );
});

test('長文 headline: 最小フォントでも 590px に入らなければ生成エラー（切り詰めない）', () => {
  assert.throws(
    () => renderTemplate('note-cover-g2', { cover: { ...V4_COVER, headline: 'これはとても長すぎて入らないヘッドライン' }, palette: PALETTE }, SIZE),
    /フィット検証失敗/,
  );
});

test('必須欠落: benefit なしは生成エラー', () => {
  const rest = { ...V4_COVER };
  delete rest.benefit;
  assert.throws(() => renderTemplate('note-cover-g2', { cover: rest, palette: PALETTE }, SIZE), /benefit が空/);
});

test('visualSrc: 指定時のみ背景 img を描画（なしは決定論的背景へフォールバック）', () => {
  const withVisual = JSON.stringify(
    renderTemplate('note-cover-g2', { cover: V4_COVER, palette: PALETTE, visualSrc: 'data:image/png;base64,AAA' }, SIZE),
  );
  const without = JSON.stringify(renderTemplate('note-cover-g2', { cover: V4_COVER, palette: PALETTE }, SIZE));
  assert.ok(withVisual.includes('data:image/png;base64,AAA'), 'visualSrc が背景に敷かれる');
  assert.ok(!without.includes('objectFit'), 'visualSrc なしは背景 img なし');
  assert.ok(without.includes('linear-gradient(135deg'), 'フォールバックは G2 紙面グラデ');
});

test('v4FitFontSize: 範囲クランプと不適合 null', () => {
  assert.equal(v4FitFontSize('頻出テーマ', { min: 64, max: 104 }), 104, '短文は max');
  assert.equal(v4FitFontSize('これはとても長すぎて入らないヘッドライン', { min: 64, max: 104 }), null, '長文は null');
  const mid = v4FitFontSize('七字の見出し語', { min: 64, max: 104 }); // 7字 → 590/(7×1.04)=81px
  assert.ok(mid >= 64 && mid < 104, '中間はレンジ内で縮小');
});

test('v4FitIssues: chips 警告 / hi+hiSuffix 合計超過エラー / マガジン価格警告', () => {
  const withChips = v4FitIssues({ ...V4_COVER, chips: [{ icon: 'doc', text: 'x' }] }, 'article');
  assert.equal(withChips.errors.length, 0);
  assert.ok(withChips.warnings.some((w) => w.includes('chips')), 'chips 警告が出る');

  const hiOver = v4FitIssues({ ...V4_COVER, hi: '12345678', hiSuffix: 'のとても長い接尾語句です' }, 'article');
  assert.ok(hiOver.errors.some((e) => e.includes('hi+hiSuffix')), 'hi 行超過はエラー');

  const magPrice = v4FitIssues({ magazineName: 'バンク', qualifier: '総監', proof: '¥2,980 相当', benefit: '得あり' }, 'magazine');
  assert.ok(magPrice.warnings.some((w) => w.includes('価格')), '価格らしき表記は警告');
});

test('V4_SAFE 座標が仕様どおり（square/list/core/text-safe）', () => {
  assert.deepEqual(V4_SAFE.square, { x: [325, 955], y: [20, 650] });
  assert.deepEqual(V4_SAFE.list, { x: [325, 955], y: [108, 562] });
  assert.deepEqual(V4_SAFE.core, { x: [325, 955], y: [227, 443] });
  assert.equal(V4_SAFE.textWidth, 590);
});
