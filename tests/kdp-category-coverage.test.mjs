import { test } from 'node:test'
import assert from 'node:assert/strict'
import { uncoveredCategoryBooks, getDefaults } from '../scripts/lib/kdp-common.mjs'

/**
 * scripts/lib/kdp-common.mjs の uncoveredCategoryBooks（check-kdp-category-coverage が使う
 * 唯一の判定ロジック）の契約を固定する。categoryPathFor が未登録接頭辞を黙って既定
 * track=gijutsushi へフォールバックする挙動（2026-08-28 g-01 実測の誤カテゴリー事故）を、
 * 検知側が正しく拾えることを保証する。
 */

test('uncoveredCategoryBooks: 登録済み接頭辞(a-,g- 等)は未登録として拾わない', () => {
  const defaults = { categoryAssign: { dobokuSekokan: ['a-', 'e-'], concrete: ['g-'] } }
  assert.deepEqual(uncoveredCategoryBooks(['a-00', 'e-01', 'g-01'], defaults), [])
})

test('uncoveredCategoryBooks: 未登録接頭辞(h- 等)は拾う', () => {
  const defaults = { categoryAssign: { dobokuSekokan: ['a-', 'e-'] } }
  assert.deepEqual(uncoveredCategoryBooks(['a-00', 'h-01'], defaults), ['h-01'])
})

test('uncoveredCategoryBooks: categoryAssign が空/欠如でも throw せず全件未登録扱いにする', () => {
  assert.deepEqual(uncoveredCategoryBooks(['a-00'], { categoryAssign: {} }), ['a-00'])
  assert.deepEqual(uncoveredCategoryBooks(['a-00'], {}), ['a-00'])
})

test('現行 .claude/config/kdp-memo.json: buildSpec 持ちの実カタログに未登録接頭辞が無い（回帰）', () => {
  const defaults = getDefaults()
  // g-（コンクリート系）は 2026-08-28 に concrete track として登録済み。
  assert.deepEqual(uncoveredCategoryBooks(['a-00', 'b-reiwa', 'c-01', 'd-00', 'e-01', 'f-01', 'g-01'], defaults), [])
  assert.deepEqual(uncoveredCategoryBooks(['h-01'], defaults), ['h-01'])
})
