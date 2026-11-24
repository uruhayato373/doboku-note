import { test } from 'node:test';
import assert from 'node:assert/strict';
import { affiliateMatEntries, validateCatalogCreatives, existingA8Ads } from '../scripts/lib/affiliate-catalog-mats.mjs';
import { readDataset } from '../scripts/lib/dataset-io.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { loadTsModule } from './lib/load-ts.mjs';
const catalog = readDataset(REPO_ROOT, 'affiliate.catalog');

test('台帳の全素材を検査し、未登録だった横長素材も許可する', () => {
  const r = validateCatalogCreatives(catalog);
  assert.ok(r.checked >= 165);
  assert.deepEqual(r.errors, []);
  const entries = affiliateMatEntries(catalog);
  for (const materialId of ['013', '016']) {
    const c = catalog.programs['rsg-kensetsu'].creatives.find(c => c.materialId === materialId);
    assert.ok(entries.some(e => c.href.includes(e.mat)), materialId);
  }
});

test('avoid・未提携素材を許可せず、note の許可をサイト素材に広げない', () => {
  // 実データの avoid の有無に頼らず、複製した台帳の 1 件を avoid にして挙動を確かめる（2026-11-15 に根拠理由の avoid を全て外した）
  const avoidedCatalog = structuredClone(catalog);
  const forbidden = avoidedCatalog.programs['rsg-kensetsu'].creatives.find(c => c.materialId === '025');
  forbidden.avoid = 'テスト用: 使わない素材';
  const entries = affiliateMatEntries(avoidedCatalog, readDataset(REPO_ROOT, 'config.affiliate-mats').mats);
  assert.ok(!entries.some(e => forbidden.href.includes(e.mat)));
  assert.equal(entries.filter(e => e.surfaces.includes('note-article')).length, 1);
  const changed = structuredClone(catalog);
  changed.programs['rsg-kensetsu'].asps.a8.status = 'none';
  assert.ok(validateCatalogCreatives(changed).errors.some(e => e.includes('未提携')));
});

test('他サイトのバナーと別素材のピクセルを拒否する', () => {
  const changed = structuredClone(catalog);
  const c = changed.programs.buildjob.creatives.find(c => c.kind === 'banner');
  c.imageSrc = c.imageSrc.replace('wid=002', 'wid=001');
  c.pixelSrc = 'https://www15.a8.net/0.gif?a8mat=AAAA+BBBB+CCCC+DDDD';
  const errors = validateCatalogCreatives(changed).errors;
  assert.ok(errors.some(e => e.includes('一致しない')));
  assert.ok(errors.some(e => e.includes('doboku-note')));
});

test('表示する既定バナー・テキストの URL は台帳の素材と一致する', async () => {
  const { PROGRAM_ASSETS } = await loadTsModule('src/config/affiliate-creatives.ts');
  assert.equal(Object.keys(PROGRAM_ASSETS).length, 10);
  for (const [program, asset] of Object.entries(PROGRAM_ASSETS)) {
    const c = catalog.programs[program].creatives.find(c => c.href === asset.banner.href);
    assert.ok(c, program);
    for (const k of ['href', 'imageSrc', 'pixelSrc', 'width', 'height']) assert.equal(asset.banner[k], c[k], `${program}.${k}`);
    if (asset.textHref) {
      const text = catalog.programs[program].creatives.find(c => c.href === asset.textHref);
      assert.equal(asset.textPixelSrc, text.pixelSrc);
    }
  }
});

test('A8 の候補重複検査は取得済みの avoid 素材も読み、もしもを混ぜない', () => {
  const avoidedCatalog = structuredClone(catalog);
  const avoided = avoidedCatalog.programs['rsg-kensetsu'].creatives.find(c=>c.asp==='a8'&&c.kind==='banner');
  avoided.avoid = 'テスト用: 使わない素材';
  const ads = existingA8Ads(avoidedCatalog, [{mat:'OLD+LINK+ID+HERE',label:'旧リンク'},{mat:'moshimo:1:2'}]);
  assert.ok(ads.some(a=>a.htmlContent===avoided.href));
  assert.ok(ads.some(a=>a.htmlContent==='a8mat=OLD+LINK+ID+HERE'));
  assert.ok(ads.every(a => a.htmlContent.startsWith('a8mat=') || new URL(a.htmlContent).hostname === 'px.a8.net'));
});
