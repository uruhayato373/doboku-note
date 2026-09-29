import { test } from 'node:test'
import assert from 'node:assert/strict'
import { kindleDrift, recordUploaded } from '../scripts/lib/kindle-uploaded.mjs'

test('recordUploaded: 上げた版を部品ごとに記録する（sha が無ければ何もしない）', () => {
  const b = {}
  recordUploaded(b, 'epub', 'aaa', { at: '2026-09-29', via: 'update-manuscript' })
  recordUploaded(b, 'cover', null, { at: '2026-09-29', via: 'update-cover' })
  assert.deepEqual(b, { uploaded: { epub: { sha256: 'aaa', at: '2026-09-29', via: 'update-manuscript' } } })
})

test('kindleDrift: 一致・ずれ・記録なし・手元なしを区別する', () => {
  const b = { uploaded: { epub: { sha256: 'aaa' }, cover: { sha256: 'ccc' } } }
  assert.deepEqual(kindleDrift(b, { epub: 'aaa', cover: 'ddd' }), { epub: 'ok', cover: 'drift' })
  assert.deepEqual(kindleDrift({}, { epub: 'aaa', cover: 'ccc' }), { epub: 'unknown', cover: 'unknown' })
  assert.deepEqual(kindleDrift(b, { epub: null, cover: 'ccc' }), { epub: 'missing', cover: 'ok' })
})
