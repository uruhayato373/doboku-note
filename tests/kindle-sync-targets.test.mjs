import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectSyncTargets } from '../scripts/lib/kindle-catalog.mjs'

/**
 * scripts/lib/kindle-catalog.mjs の selectSyncTargets（sync-kindle-dist.mjs が使う唯一の
 * 対象選定ロジック）の契約を固定する。
 *
 * 背景（2026-08-28）: id 無指定の全冊モードが status を見ず live/in_review 含む全冊を
 * 上書きする不具合があった（ヘッダコメント「ready 状態の全新刊」とコードが乖離）。
 * ready 保護ガードを追加したが自動回帰テストが無かったため、ここで固定する。
 */

const BOOKS = [
  { id: 'e-01', buildSpec: 'scripts/kindle-specs/e-01.json', status: 'live' },
  { id: 'g-01', buildSpec: 'scripts/kindle-specs/g-01.json', status: 'ready' },
  { id: 'g-02', buildSpec: 'scripts/kindle-specs/g-02.json', status: 'in_review' },
  { id: 'a-00', buildSpec: undefined, status: 'live' }, // A系: buildSpec 無し
]

test('selectSyncTargets: id 無指定は status=ready のみ対象、live/in_review は skip に回す', () => {
  const { targets, skipped } = selectSyncTargets(BOOKS, [])
  assert.deepEqual(targets.map((b) => b.id), ['g-01'])
  assert.deepEqual(skipped.map((b) => b.id).sort(), ['e-01', 'g-02'])
})

test('selectSyncTargets: id 明示時は status を問わず対象にし skipped は空', () => {
  const { targets, skipped } = selectSyncTargets(BOOKS, ['e-01', 'g-02'])
  assert.deepEqual(targets.map((b) => b.id).sort(), ['e-01', 'g-02'])
  assert.deepEqual(skipped, [])
})

test('selectSyncTargets: buildSpec 無し(A系)は id 明示でも対象にしない', () => {
  const { targets } = selectSyncTargets(BOOKS, ['a-00'])
  assert.deepEqual(targets, [])
})

test('selectSyncTargets: 全冊 live/in_review で ready が0冊なら targets は空・skipped は全件', () => {
  const allLive = BOOKS.filter((b) => b.buildSpec)
  const { targets, skipped } = selectSyncTargets(allLive.map((b) => ({ ...b, status: 'live' })), [])
  assert.deepEqual(targets, [])
  assert.equal(skipped.length, allLive.length)
})
