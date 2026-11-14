// 面のサイズの決まりに合う広告素材の選び方（src/lib/affiliate-creative-pick.mjs）と、実データでの基準書の面の素材。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { pickCreative, pickSlotCreatives } from '../src/lib/affiliate-creative-pick.mjs';

const banner = (asp, materialId, w, h, extra = {}) => ({ asp, materialId, kind: 'banner', width: w, height: h, href: `https://x/${asp}/${materialId}`, imageSrc: `https://img/${asp}/${materialId}`, ...extra });

test('サイズの順に探し、同じサイズは a8 → moshimo、avoid とテキストは選ばない', () => {
  const list = [
    banner('moshimo', '9', 300, 250),
    banner('a8', '1', 300, 250, { avoid: 'No.1 表示' }),
    banner('a8', '2', 300, 250),
    { asp: 'a8', materialId: '3', kind: 'text', href: 'https://x/t' },
    banner('a8', '4', 728, 90),
  ];
  assert.equal(pickCreative(list, ['728x90', '300x250']).materialId, '4');
  assert.equal(pickCreative(list, ['300x250']).materialId, '2');
  assert.equal(pickCreative(list, ['320x50']), null);
  assert.equal(pickCreative(undefined, ['300x250']), null);
});

test('スマホは PC と同じ ASP を優先し、無ければ他の ASP。サイズの無い幅は null', () => {
  const list = [banner('moshimo', '7', 320, 100), banner('a8', '1', 728, 90), banner('a8', '2', 320, 50)];
  const r = pickSlotCreatives(list, { pc: ['728x90'], mobile: ['320x100', '320x50'] });
  assert.equal(r.pc.materialId, '1');
  assert.equal(r.mobile.materialId, '2', 'PC が a8 なのでスマホも a8 の 320x50（moshimo の 320x100 より先）');
  assert.equal(pickSlotCreatives(list, { pc: ['300x250'], mobile: [] }).mobile, null);
});

test('実データ: 全面でサイズ・サイト帰属・使用不可素材を検査する', () => {
  const catalog = JSON.parse(readFileSync(join(REPO_ROOT, 'data/affiliate/catalog.json'), 'utf8'));
  const vocab = JSON.parse(readFileSync(join(REPO_ROOT, 'config/cta-placements.json'), 'utf8')).affiliate;
  const placements = JSON.parse(readFileSync(join(REPO_ROOT, 'config/affiliate-placements.json'), 'utf8')).rules
    .filter((r) => r.period.until === null && vocab[r.slot]?.sizes);
  assert.ok(placements.length >= 30, '画像のサイズを定義した面のルールを読めていない');
  for (const rule of placements) {
    const sizes = vocab[rule.slot]?.sizes;
    assert.ok(sizes, `${rule.slot} にサイズの決まりが無い`);
    const { pc, mobile } = pickSlotCreatives(catalog.programs[rule.program]?.creatives, sizes);
    // 合う画像が無い案件は小型カードで表示する（ResponsiveAffiliateBanner）。
    for (const [label, c, allowed] of [['pc', pc, sizes.pc], ['mobile', mobile, sizes.mobile]]) {
      if (!c) continue;
      assert.ok(allowed.includes(`${c.width}x${c.height}`), `${rule.id} ${label} のサイズ ${c.width}x${c.height} が決まりに無い`);
      assert.equal(c.avoid, undefined, `${rule.id} ${label} に使わない素材 ${c.asp}:${c.materialId}`);
      if (c.asp === 'a8') assert.match(c.imageSrc, /[?&]wid=002(&|$)/, `${rule.id} ${label} が doboku-note の素材でない`);
    }
  }
});


test('配信候補サイズ99点に画像の確認記録があり、判定と avoid が一致する', () => {
  const catalog = JSON.parse(readFileSync(join(REPO_ROOT, 'data/affiliate/catalog.json'), 'utf8'));
  const sizes = new Set(['300x250','336x280','250x250','728x90','468x60','320x100','320x50','160x600']);
  let checked = 0;
  for (const [program, p] of Object.entries(catalog.programs)) for (const c of p.creatives ?? []) {
    if (!sizes.has(`${c.width}x${c.height}`)) continue;
    checked++;
    assert.ok(c.review, `${program}/${c.materialId}: 目視記録がない`);
    assert.equal(c.review.outcome, c.avoid ? 'avoid' : 'ok');
    assert.match(c.review.sha256, /^[a-f0-9]{64}$/);
    assert.ok(c.review.framesChecked > 0);
  }
  assert.ok(checked >= 99);
});
