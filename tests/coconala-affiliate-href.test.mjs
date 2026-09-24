// ココナラ A8 商品リンク（DN-0283）の形を、A8 実機の生成結果に固定する。
//
// なぜテストが要るか:
//   A8 は生成リンクの改変を禁じている。サイトはサービス URL から商品リンクを組み立てる
//   （coconalaAffiliateHref）ので、エンコードの仕方・パラメータ順・mat が 1 文字でもずれると
//   成果が計測されず、画面上は普通に遷移するため誰も気づけない。
//   期待値は 2026-09-24 に A8 の商品リンク作成（doboku-note websiteId=002）で出力された文字列そのもの。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { loadTsModule } from './lib/load-ts.mjs';

const loadCreatives = () => loadTsModule('src/config/affiliate-creatives.ts');

test('A8 の実出力と一致する（サービスページ 4317349）', async () => {
  const { coconalaAffiliateHref } = await loadCreatives();
  assert.equal(
    coconalaAffiliateHref('https://coconala.com/services/4317349'),
    'https://px.a8.net/svt/ejp?a8mat=4B3RUY+AINQAI+2PEO+1NIX2A&a8ejpredirect=https%3A%2F%2Fcoconala.com%2Fservices%2F4317349',
  );
});

test('計測ピクセルは A8 発行のものと一致する', async () => {
  const { COCONALA_A8_PIXEL } = await loadCreatives();
  assert.equal(COCONALA_A8_PIXEL, 'https://www15.a8.net/0.gif?a8mat=4B3RUY+AINQAI+2PEO+1NIX2A');
});

test('listed の全サービスで、a8ejpredirect を戻すと元のサービス URL になる', async () => {
  const { coconalaAffiliateHref } = await loadCreatives();
  const { listedCoconalaServices } = await loadTsModule('src/lib/coconala-services.ts');
  const listed = listedCoconalaServices();
  assert.ok(listed.length > 0, 'listed が 0 件だと何も検査していない');
  for (const svc of listed) {
    const href = coconalaAffiliateHref(svc.serviceUrl);
    const url = new URL(href);
    assert.equal(url.origin + url.pathname, 'https://px.a8.net/svt/ejp', svc.id);
    assert.equal(url.searchParams.get('a8ejpredirect'), svc.serviceUrl, svc.id);
    // 生成リンクは a8mat → a8ejpredirect の順で、それ以外のパラメータを足さない
    assert.deepEqual([...url.searchParams.keys()], ['a8mat', 'a8ejpredirect'], svc.id);
  }
});

test('リンクとピクセルの mat は affiliate-mats.json に program=coconala で登録されている', async () => {
  const { coconalaAffiliateHref, COCONALA_A8_PIXEL } = await loadCreatives();
  const { mats } = JSON.parse(readFileSync('src/config/affiliate-mats.json', 'utf8'));
  const registered = new Set(mats.filter((m) => m.program === 'coconala').map((m) => m.mat));
  const matOf = (u) => /a8mat=([^&]+)/.exec(u)?.[1];
  assert.ok(registered.has(matOf(coconalaAffiliateHref('https://coconala.com/services/1'))));
  assert.ok(registered.has(matOf(COCONALA_A8_PIXEL)));
});
