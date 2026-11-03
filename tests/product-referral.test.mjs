// tests/product-referral.test.mjs
//
// 商品への送客（GA4 product_impression / product_click・DN-0947）の販売先 ID の読み取りと、AnalyticsProvider への配線を固定する。
// 守りたい事故: 推測した ID を送って販売台帳と突き合わない／a8mat の + が空白に化ける／イベントがキーイベントの定義から漏れる。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PRODUCT_CLICK_EVENT,
  PRODUCT_IMPRESSION_EVENT,
  productReferralOf,
  productReferralParams,
} from '../src/lib/product-referral.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

test('note の記事・マガジン・メンバーシップは販売先のキーで読む（UTM が付いても同じ）', () => {
  assert.deepEqual(productReferralOf('https://note.com/dobokunote/m/mfa3fcffdd85d?utm_source=doboku-note'), { destination: 'note', productId: 'mfa3fcffdd85d' });
  assert.deepEqual(productReferralOf('https://note.com/dobokunote/n/n824a4ea20acf'), { destination: 'note', productId: 'n824a4ea20acf' });
  assert.deepEqual(productReferralOf('https://note.com/dobokunote/membership/join'), { destination: 'note', productId: 'membership' });
});

test('ほかのアカウントの note・note のトップは送らない', () => {
  assert.equal(productReferralOf('https://note.com/someone/n/n0123abcd'), null);
  assert.equal(productReferralOf('https://note.com/dobokunote'), null);
});

test('ココナラ・Amazon・A8・もしもは販売先の ID を読む', () => {
  assert.deepEqual(productReferralOf('https://coconala.com/services/4341188'), { destination: 'coconala', productId: '4341188' });
  assert.deepEqual(productReferralOf('https://www.amazon.co.jp/dp/B0H8HW139T?tag=x-22'), { destination: 'amazon', productId: 'B0H8HW139T' });
  assert.deepEqual(productReferralOf('https://px.a8.net/svt/ejp?a8mat=4B5OO5+FHBA2+5B0Y+NTZCH'), { destination: 'a8', productId: '4B5OO5+FHBA2+5B0Y+NTZCH' });
  assert.deepEqual(productReferralOf('https://af.moshimo.com/af/c/click?a_id=5868364&p_id=4183&pc_id=10609&pl_id=57940'), { destination: 'moshimo', productId: '4183' });
});

test('サイト内・相対 URL・形の合わない URL は null', () => {
  for (const href of ['/exam/pe-first-stage/', 'https://doboku-note.com/exam/', 'https://coconala.com/users/1', 'https://px.a8.net/svt/ejp?a8mat=bad', '', null]) {
    assert.equal(productReferralOf(href), null, String(href));
  }
});

test('パラメータは販売先・商品 ID・登録済みの cta_placement', () => {
  assert.deepEqual(productReferralParams({ destination: 'note', productId: 'm1' }, 'article-mid'), { product_destination: 'note', product_id: 'm1', cta_placement: 'article-mid' });
  assert.equal(productReferralParams({ destination: 'note', productId: 'm1' }, '').cta_placement, '(unknown)');
});

test('AnalyticsProvider が表示とクリックを送り、クリックだけがキーイベントの定義にある', () => {
  const provider = readFileSync(join(ROOT, 'src/components/providers/AnalyticsProvider.tsx'), 'utf8');
  assert.match(provider, /action: PRODUCT_CLICK_EVENT/);
  assert.match(provider, /action: PRODUCT_IMPRESSION_EVENT/);
  const desired = JSON.parse(readFileSync(join(ROOT, 'config/ga4-admin-desired-state.json'), 'utf8'));
  const keyEvents = desired.keyEvents.map((k) => k.eventName);
  assert.ok(keyEvents.includes(PRODUCT_CLICK_EVENT));
  assert.ok(!keyEvents.includes(PRODUCT_IMPRESSION_EVENT));
  const params = desired.customDimensions.map((d) => d.parameterName);
  for (const p of ['product_destination', 'product_id', 'cta_placement']) assert.ok(params.includes(p), p);
});
