import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  artifactRelPaths,
  buildPathDateMap,
  estimateFreshness,
  joinRoyalties,
  specInputPaths,
} from '../scripts/lib/kindle-catalog.mjs'

/**
 * scripts/lib/kindle-catalog.mjs（admin `/content/kindle` が読む唯一の判定ロジック）の
 * 契約を固定する。pure 関数だけを対象に fixture で検証する（fs/git アクセスは対象外）。
 */

test('artifactRelPaths: B-G系(サブディレクトリ持ち)は scripts/ 直下として解決する', () => {
  const rel = artifactRelPaths({
    id: 'e-01', epub: 'kindle-dist/e-01.epub', cover: 'kindle-dist/e-01.jpg',
    kdpMemo: 'KDP入力メモ_e-01.txt', buildSpec: 'scripts/kindle-specs/e-01.json',
  })
  assert.deepEqual(rel, {
    epub: 'scripts/kindle-dist/e-01.epub',
    cover: 'scripts/kindle-dist/e-01.jpg',
    kdpMemo: 'scripts/kindle-published/KDP入力メモ_e-01.txt',
    buildSpec: 'scripts/kindle-specs/e-01.json',
  })
})

test('artifactRelPaths: A系(裸ファイル名・buildSpec無し)は kindle-published 直下として解決する', () => {
  const rel = artifactRelPaths({
    id: 'a-00', epub: 'kindle-A-00-goubon.epub', cover: 'kindle-cover-a-00.jpg', kdpMemo: null, buildSpec: undefined,
  })
  assert.deepEqual(rel, {
    epub: 'scripts/kindle-published/kindle-A-00-goubon.epub',
    cover: 'scripts/kindle-published/kindle-cover-a-00.jpg',
    kdpMemo: null,
    buildSpec: null,
  })
})

test('specInputPaths: sources(文字列配列) と frontMatter を repo 相対パスとして抽出する', () => {
  const spec = {
    sources: ['content/site/a/article.mdx', 'content/site/b/article.mdx'],
    frontMatter: 'content/kindle/books/g-01/front-matter.md',
  }
  assert.deepEqual(specInputPaths(spec), [
    'content/site/a/article.mdx',
    'content/site/b/article.mdx',
    'content/kindle/books/g-01/front-matter.md',
  ])
})

test('specInputPaths: spec が null/sources 欠如でも空配列を返し throw しない', () => {
  assert.deepEqual(specInputPaths(null), [])
  assert.deepEqual(specInputPaths({}), [])
})

test('buildPathDateMap: newest-first の git log から「初出=最新」を維持する（同一pathの重複は先勝ち）', () => {
  const log = [
    '2026-08-28T10:00:00+09:00',
    'scripts/kindle-dist/e-01.epub',
    'content/site/a/article.mdx',
    '',
    '2026-08-20T10:00:00+09:00',
    'content/site/a/article.mdx', // 古い commit の同一 path。先に入った新しい日付を上書きしてはいけない
    'content/site/old-only.mdx',
    '',
  ].join('\n')
  const map = buildPathDateMap(log)
  assert.equal(map.get('scripts/kindle-dist/e-01.epub'), '2026-08-28T10:00:00+09:00')
  assert.equal(map.get('content/site/a/article.mdx'), '2026-08-28T10:00:00+09:00')
  assert.equal(map.get('content/site/old-only.mdx'), '2026-08-20T10:00:00+09:00')
})

test('buildPathDateMap: 空文字列/未定義は空 Map を返す', () => {
  assert.equal(buildPathDateMap('').size, 0)
  assert.equal(buildPathDateMap(undefined).size, 0)
})

test('estimateFreshness: 入力がEPUBより新しければ stale と判定する', () => {
  const books = [{ id: 'e-01', epub: 'kindle-dist/e-01.epub', buildSpec: 'scripts/kindle-specs/e-01.json', builder: 'scripts/build-pe1-kindle.mjs' }]
  const pathDateMap = new Map([
    ['scripts/kindle-dist/e-01.epub', '2026-08-17T00:00:00+09:00'],
    ['content/site/a/article.mdx', '2026-08-26T00:00:00+09:00'], // 08-17 より新しい = stale の原因
    ['scripts/kindle-specs/e-01.json', '2026-08-01T00:00:00+09:00'],
    ['scripts/build-pe1-kindle.mjs', '2026-08-01T00:00:00+09:00'],
  ])
  const readSpec = () => ({ sources: ['content/site/a/article.mdx'] })
  const { staleIds, unknownIds, perBook } = estimateFreshness(books, pathDateMap, readSpec)
  assert.deepEqual(staleIds, ['e-01'])
  assert.deepEqual(unknownIds, [])
  assert.equal(perBook['e-01'].freshness, 'stale')
})

test('estimateFreshness: EPUB が git log に無い(map 不在)冊は unknown（stale=0 を健全と言わない）', () => {
  const books = [{ id: 'z-99', epub: 'kindle-dist/z-99.epub', buildSpec: 'scripts/kindle-specs/z-99.json' }]
  const pathDateMap = new Map() // 空 = git log 取得できなかった/対象外パスのケースを模す
  const readSpec = () => ({ sources: ['content/site/z/article.mdx'] })
  const { staleIds, unknownIds, perBook } = estimateFreshness(books, pathDateMap, readSpec)
  assert.deepEqual(staleIds, [])
  assert.deepEqual(unknownIds, ['z-99'])
  assert.equal(perBook['z-99'].freshness, 'unknown')
})

test('estimateFreshness: A系(buildSpec無し)は exam-questions.json と builder を入力とみなす', () => {
  const books = [{ id: 'a-00', epub: 'kindle-A-00-goubon.epub', buildSpec: undefined, builder: 'scripts/build-takuitsu-reconstruct.mjs' }]
  const pathDateMap = new Map([
    ['scripts/kindle-published/kindle-A-00-goubon.epub', '2026-08-01T00:00:00+09:00'],
    ['src/config/civil-1-exam-questions.json', '2026-08-15T00:00:00+09:00'],
    ['scripts/build-takuitsu-reconstruct.mjs', '2026-08-01T00:00:00+09:00'],
  ])
  const { staleIds, perBook } = estimateFreshness(books, pathDateMap, () => null)
  assert.deepEqual(staleIds, ['a-00'])
  assert.equal(perBook['a-00'].latestInputDate, '2026-08-15T00:00:00+09:00')
})

test('estimateFreshness: essay builder は共有レンダラ kindle-md.mjs も入力に含める', () => {
  const books = [{ id: 'c-01', epub: 'kindle-dist/c-01.epub', buildSpec: 'scripts/kindle-specs/c-01.json', builder: 'scripts/build-essay-kindle.mjs' }]
  const pathDateMap = new Map([
    ['scripts/kindle-dist/c-01.epub', '2026-08-20T00:00:00+09:00'],
    ['scripts/lib/kindle-md.mjs', '2026-08-25T00:00:00+09:00'], // renderer 更新のみが stale の原因
    ['scripts/kindle-specs/c-01.json', '2026-08-01T00:00:00+09:00'],
    ['scripts/build-essay-kindle.mjs', '2026-08-01T00:00:00+09:00'],
  ])
  const { staleIds } = estimateFreshness(books, pathDateMap, () => ({ sources: [] }))
  assert.deepEqual(staleIds, ['c-01'])
})

test('joinRoyalties: 最新月を選び bookId で catalog と join し estimated/caveat を素通しする', () => {
  const books = [{ id: 'd-01' }, { id: 'd-02' }]
  const royalties = {
    caveat: '推計値・KENPは翌月確定',
    months: {
      '2026-06': { fetchedAt: '2026-07-01', estimated: false, total: { royalty: 100 }, books: [{ bookId: 'd-01', title: 'old', ebook: 1, print: 0, kenp: 0, royalty: 100 }] },
      '2026-07': { fetchedAt: '2026-08-01', estimated: true, total: { royalty: 1712 }, books: [{ bookId: 'd-01', title: 'A', ebook: 3, print: 0, kenp: 2, royalty: 900 }, { bookId: 'unknown-id', title: 'B', ebook: 1, print: 0, kenp: 0, royalty: 50 }] },
    },
  }
  const r = joinRoyalties(books, royalties)
  assert.equal(r.ok, true)
  assert.equal(r.month, '2026-07')
  assert.equal(r.estimated, true)
  assert.equal(r.caveat, '推計値・KENPは翌月確定')
  assert.equal(r.total.royalty, 1712)
  const byId = Object.fromEntries(r.perBook.map((b) => [b.bookId, b]))
  assert.equal(byId['d-01'].inCatalog, true)
  assert.equal(byId['unknown-id'].inCatalog, false)
})

test('joinRoyalties: royalties が null/months 欠如なら ok:false を返す（空データを健全と言わない）', () => {
  assert.deepEqual(joinRoyalties([], null), { ok: false })
  assert.deepEqual(joinRoyalties([], {}), { ok: false })
  assert.deepEqual(joinRoyalties([], { months: {} }), { ok: false })
})
