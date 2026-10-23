import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs'
import { partitionDraftDeletion, protectedKdpAsins } from '../scripts/lib/kdp-common.mjs'

/**
 * kdp-publish --delete-drafts / --list-drafts の安全弁（2026-10-22: 出版停止にした 13 冊は KDP の本棚で「下書き」と表示される）。
 * catalog で unpublished か ASIN を持つ本は、削除の対象から必ず外す。
 */
const ROOT = REPO_ROOT

const books = [
  { id: 'A-03', status: 'unpublished', asin: 'B0AAAAAAA1', draftAsin: 'B0DRAFT001' },
  { id: 'A-10', status: 'live', asin: 'B0LIVE0001', draftAsin: 'B0LIVE0001' },
  { id: 'E-01', status: 'in_review', draftAsin: 'B0REVIEW01' },
  { id: 'E-02', status: 'ready' },
]

test('出版停止（unpublished）と ASIN ありの本は、asin・draftAsin とも削除から外して理由を返す', () => {
  const r = partitionDraftDeletion(['B0AAAAAAA1', 'b0draft001', 'B0LIVE0001', 'B0REVIEW01', 'B0UNKNOWN1', ' '], books)
  assert.deepEqual(r.deletable, ['B0REVIEW01', 'B0UNKNOWN1'])
  assert.deepEqual(r.protected.map((k) => `${k.asin}:${k.id}`), ['B0AAAAAAA1:A-03', 'B0DRAFT001:A-03', 'B0LIVE0001:A-10'])
  assert.match(r.protected[0].reason, /出版停止/)
  assert.match(r.protected[2].reason, /ASIN/)
})

test('ASIN の無い下書きだけの本は守らない（従来どおり削除できる）', () => {
  assert.equal(protectedKdpAsins(books).has('B0REVIEW01'), false)
  assert.deepEqual(partitionDraftDeletion([], books), { deletable: [], protected: [] })
})

test('今の catalog の出版停止の本はすべて保護される', () => {
  const catalog = JSON.parse(readFileSync(join(ROOT, 'scripts/kindle-published/catalog.json'), 'utf8'))
  const unpublished = catalog.books.filter((b) => b.status === 'unpublished')
  assert.ok(unpublished.length > 0, '出版停止の本が 0 冊（検査していない）')
  const asins = unpublished.flatMap((b) => [b.asin, b.draftAsin]).filter(Boolean)
  const r = partitionDraftDeletion(asins, catalog.books)
  assert.deepEqual(r.deletable, [])
  assert.equal(r.protected.length, asins.length)
})

test('kdp-publish の --delete-drafts は削除の前に catalog の保護で絞り、--list-drafts も分けて出す', () => {
  const src = readFileSync(join(ROOT, 'scripts/kdp-publish.mjs'), 'utf8')
  const del = src.slice(src.indexOf('if (MODE_DELETE) {'))
  assert.ok(del.indexOf('partitionDraftDeletion(requested') > 0)
  assert.ok(del.indexOf('partitionDraftDeletion(requested') < del.indexOf('for (const asin of list)'), '削除ループより前に絞る')
  assert.match(del, /catalog を読めない[^\n]*削除しない/)
  const list = src.slice(src.indexOf('if (MODE_LIST) {'), src.indexOf('if (MODE_DELETE) {'))
  assert.match(list, /partitionDraftDeletion\(drafts/)
})
