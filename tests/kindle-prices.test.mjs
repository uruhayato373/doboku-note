import { test } from 'node:test'
import assert from 'node:assert/strict'
import { kindlePriceIssues } from '../scripts/lib/kdp-common.mjs'

/**
 * check-kindle-prices が使う kindlePriceIssues の契約。spec と catalog の片側だけ改定した
 * 状態（2026-09-23 の3段階改定で起きうる）と、70% 帯外の価格を拾うことを固定する。
 */

const live = (id, priceJpy, extra = {}) => ({ id, priceJpy, royalty: 0.7, status: 'live', ...extra })

test('一致・帯内なら問題なし（spec の無い本は帯だけ見る）', () => {
  assert.deepEqual(kindlePriceIssues([live('c-01', 1250), live('A-00', 1250)], { 'c-01': 1250 }), [])
})

test('spec と catalog の不一致を拾う', () => {
  const r = kindlePriceIssues([live('d-00', 990)], { 'd-00': 1250 })
  assert.deepEqual(r.map((i) => i.kind), ['mismatch'])
})

test('70% 帯の外（¥1,650 超・¥250 未満）を拾う', () => {
  const r = kindlePriceIssues([live('x-1', 1700), live('x-2', 200)], {})
  assert.deepEqual(r.map((i) => `${i.id}:${i.kind}`), ['x-1:band', 'x-2:band'])
})

test('¥1,250〜¥1,650 は 2026-09 の帯拡大で 70% 帯内', () => {
  assert.deepEqual(kindlePriceIssues([live('x-1', 1650)], {}), [])
})

test('下書き・廃止など live/ready 以外は対象外、priceJpy 欠落は拾う', () => {
  assert.deepEqual(kindlePriceIssues([live('x-1', 99999, { status: 'draft' })], {}), [])
  assert.deepEqual(kindlePriceIssues([live('x-2', null)], {}).map((i) => i.kind), ['missing'])
})
