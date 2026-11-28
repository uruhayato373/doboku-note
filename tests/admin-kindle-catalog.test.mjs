import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  artifactRelPaths,
  buildPathDateMap,
  estimateFreshness,
  hasBuildRecipe,
  joinRoyalties,
  specInputPaths,
} from '../scripts/lib/kindle-catalog.mjs'

/**
 * scripts/lib/kindle-catalog.mjs（admin の販売状態（Kindle タブ） が読む唯一の判定ロジック）の
 * 契約を固定する。pure 関数だけを対象に fixture で検証する（fs/git アクセスは対象外）。
 */

test('artifactRelPaths: kindle-dist の値は scripts/ 直下として解決する', () => {
  const rel = artifactRelPaths({
    id: 'e-01', epub: 'kindle-dist/e-01.epub', cover: 'kindle-dist/e-01.jpg',
    buildSpec: 'content/kindle/books/e-01/spec.json',
  })
  assert.deepEqual(rel, {
    epub: 'scripts/kindle-dist/e-01.epub',
    cover: 'scripts/kindle-dist/e-01.jpg',
    buildSpec: 'content/kindle/books/e-01/spec.json',
  })
})

test('artifactRelPaths: A系(buildSpec無し)も kindle-dist に置き、buildSpec は null', () => {
  const rel = artifactRelPaths({
    id: 'A-00', epub: 'kindle-dist/a-00.epub', cover: 'kindle-dist/a-00.jpg', buildSpec: undefined,
  })
  assert.deepEqual(rel, {
    epub: 'scripts/kindle-dist/a-00.epub',
    cover: 'scripts/kindle-dist/a-00.jpg',
    buildSpec: null,
  })
})

test('hasBuildRecipe: spec駆動とA系theme駆動を再ビルド可能と判定する', () => {
  assert.equal(hasBuildRecipe({ builder: 'scripts/build.mjs', buildSpec: 'scripts/spec.json' }), true)
  assert.equal(hasBuildRecipe({ builder: 'scripts/build/build-takuitsu-reconstruct.mjs', buildTheme: 'anzen' }), true)
  assert.equal(hasBuildRecipe({ builder: 'scripts/build.mjs' }), false)
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
  const books = [{ id: 'e-01', epub: 'kindle-dist/e-01.epub', buildSpec: 'content/kindle/books/e-01/spec.json', builder: 'scripts/build/build-pe1-kindle.mjs' }]
  const pathDateMap = new Map([
    ['scripts/kindle-dist/e-01.epub', '2026-08-17T00:00:00+09:00'],
    ['content/site/a/article.mdx', '2026-08-26T00:00:00+09:00'], // 08-17 より新しい = stale の原因
    ['content/kindle/books/e-01/spec.json', '2026-08-01T00:00:00+09:00'],
    ['scripts/build/build-pe1-kindle.mjs', '2026-08-01T00:00:00+09:00'],
  ])
  const readSpec = () => ({ sources: ['content/site/a/article.mdx'] })
  const { staleIds, unknownIds, perBook } = estimateFreshness(books, pathDateMap, readSpec)
  assert.deepEqual(staleIds, ['e-01'])
  assert.deepEqual(unknownIds, [])
  assert.equal(perBook['e-01'].freshness, 'stale')
})

test('estimateFreshness: EPUB が git log に無い(map 不在)冊は unknown（stale=0 を健全と言わない）', () => {
  const books = [{ id: 'z-99', epub: 'kindle-dist/z-99.epub', buildSpec: 'content/kindle/books/z-99/spec.json' }]
  const pathDateMap = new Map() // 空 = git log 取得できなかった/対象外パスのケースを模す
  const readSpec = () => ({ sources: ['content/site/z/article.mdx'] })
  const { staleIds, unknownIds, perBook } = estimateFreshness(books, pathDateMap, readSpec)
  assert.deepEqual(staleIds, [])
  assert.deepEqual(unknownIds, ['z-99'])
  assert.equal(perBook['z-99'].freshness, 'unknown')
})

test('estimateFreshness: A系(buildSpec無し)は exam-questions.json と builder を入力とみなす', () => {
  const books = [{ id: 'a-00', epub: 'kindle-dist/a-00.epub', buildSpec: undefined, builder: 'scripts/build/build-takuitsu-reconstruct.mjs' }]
  const pathDateMap = new Map([
    ['scripts/kindle-dist/a-00.epub', '2026-08-01T00:00:00+09:00'],
    ['src/config/civil-1-exam-questions.json', '2026-08-15T00:00:00+09:00'],
    ['scripts/build/build-takuitsu-reconstruct.mjs', '2026-08-01T00:00:00+09:00'],
  ])
  const { staleIds, perBook } = estimateFreshness(books, pathDateMap, () => null)
  assert.deepEqual(staleIds, ['a-00'])
  assert.equal(perBook['a-00'].latestInputDate, '2026-08-15T00:00:00+09:00')
})

test('estimateFreshness: essay builder は共有レンダラ kindle-md.mjs も入力に含める', () => {
  const books = [{ id: 'c-01', epub: 'kindle-dist/c-01.epub', buildSpec: 'content/kindle/books/c-01/spec.json', builder: 'scripts/build/build-essay-kindle.mjs' }]
  const pathDateMap = new Map([
    ['scripts/kindle-dist/c-01.epub', '2026-08-20T00:00:00+09:00'],
    ['scripts/lib/kindle-md.mjs', '2026-08-25T00:00:00+09:00'], // renderer 更新のみが stale の原因
    ['content/kindle/books/c-01/spec.json', '2026-08-01T00:00:00+09:00'],
    ['scripts/build/build-essay-kindle.mjs', '2026-08-01T00:00:00+09:00'],
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
  assert.equal(r.total.royalty, 900)
  assert.equal(r.accountTotal.royalty, 1712)
  const byId = Object.fromEntries(r.perBook.map((b) => [b.bookId, b]))
  assert.equal(byId['d-01'].inCatalog, true)
  assert.equal(byId['unknown-id'], undefined)
})

test('joinRoyalties: royalties が null/months 欠如なら ok:false を返す（空データを健全と言わない）', () => {
  assert.deepEqual(joinRoyalties([], null), { ok: false })
  assert.deepEqual(joinRoyalties([], {}), { ok: false })
  assert.deepEqual(joinRoyalties([], { months: {} }), { ok: false })
})

test('joinRoyalties: 同一 bookId が複数行に分かれていても合算し1行にする（React key 重複の再発防止）', () => {
  // 2026-08-28 実測: data/kdp/royalties.json の books[] に e-01 が2行（マーケットプレイス別内訳が
  // 未マージ）存在し、admin /content/kindle の一覧で React key 重複警告を引き起こした。
  const royalties = {
    months: {
      '2026-07': {
        total: { royalty: 67 },
        books: [
          { bookId: 'e-01', title: 'X', ebook: 0, print: 0, kenp: 67, royalty: 67 },
          { bookId: 'e-01', title: 'X', ebook: 0, print: 0, kenp: 0, royalty: 0 },
        ],
      },
    },
  }
  const r = joinRoyalties([{ id: 'e-01' }], royalties)
  assert.equal(r.perBook.length, 1)
  assert.equal(r.perBook[0].bookId, 'e-01')
  assert.equal(r.perBook[0].kenp, 67)
  assert.equal(r.perBook[0].royalty, 67)
})

// ---- 台帳の欄（2026-11-28: 予定・置き換え・収録記事・受取の推移）----
import {
  KINDLE_STATUSES, KINDLE_PLAN_ACTIONS, plansOf, nextPlanOf, supersedeErrors, specContents, royaltyHistoryOf,
} from '../scripts/lib/kindle-catalog.mjs'

test('plansOf は日付の順、nextPlanOf は今日以降の最初の予定・無ければ過ぎた最後の予定', () => {
  const book = { plans: [{ action: 'reprice', date: '2027-03-01' }, { action: 'publish', date: '2026-12-01' }, { action: 'unpublish', date: '2027-05-01' }] }
  assert.deepEqual(plansOf(book).map((p) => p.date), ['2026-12-01', '2027-03-01', '2027-05-01'])
  assert.equal(nextPlanOf(book, '2026-12-02').date, '2027-03-01')
  assert.equal(nextPlanOf(book, '2027-06-01').date, '2027-05-01')
  assert.equal(nextPlanOf({}, '2026-12-01'), null)
})

test('supersedeErrors: 相手が無い・逆向きの記録が無いものを出し、対応していれば 0 件', () => {
  const ok = [{ id: 'c-04', supersededBy: ['c-04-r03'] }, { id: 'c-04-r03', supersedes: ['c-04'] }]
  assert.deepEqual(supersedeErrors(ok), [])
  const bad = [{ id: 'c-04', supersededBy: ['c-04-r03', 'c-04-r99'] }, { id: 'c-04-r03' }]
  const errs = supersedeErrors(bad)
  assert.equal(errs.length, 2)
  assert.ok(errs.some((e) => e.includes('c-04-r99 が正本に無い')))
  assert.ok(errs.some((e) => e.includes('supersedes に c-04 が無い')))
})

test('specContents: 見出しは frontmatter の title → # 見出し → パス。字数は frontmatter を除いた空白以外の文字数', () => {
  const files = {
    'a.md': '---\ntitle: "令和3年度 問題III"\n---\n# 見出し\n本文 です',
    'b.md': '# 第一章\nあいう',
  }
  const rows = specContents({ sources: ['a.md', 'b.md', 'c.md'] }, (rel) => files[rel] ?? null)
  assert.deepEqual(rows.map((r) => r.heading), ['令和3年度 問題III', '第一章', 'c.md'])
  assert.equal(rows[0].chars, '#見出し本文です'.length)
  assert.equal(rows[2].missing, true)
  assert.deepEqual(specContents(null, () => null), [])
})

test('royaltyHistoryOf: 同じ月の同じ本の行を合算し、月の順に累計を出す', () => {
  const json = { months: {
    '2026-09': { estimated: false, books: [{ bookId: 'c-04', ebook: 795, kenp: 10, royalty: 805 }] },
    '2026-11': { estimated: true, books: [{ bookId: 'c-04', ebook: 1049, kenp: 0, royalty: 1049 }, { bookId: 'c-04', ebook: 0, kenp: 5, royalty: 5 }, { bookId: 'x', royalty: 1 }] },
  } }
  const h = royaltyHistoryOf('c-04', json)
  assert.deepEqual(h.months.map((m) => [m.month, m.royalty, m.estimated]), [['2026-09', 805, false], ['2026-11', 1054, true]])
  assert.equal(h.total, 1859)
  assert.deepEqual(royaltyHistoryOf('none', json), { months: [], total: 0 })
})

test('状態と予定の語彙: 正本の型が受け付ける値', () => {
  assert.ok(KINDLE_STATUSES.includes('draft') && KINDLE_STATUSES.includes('unpublished'))
  assert.deepEqual(KINDLE_PLAN_ACTIONS, ['publish', 'unpublish', 'reprice', 'select-enroll', 'replace-manuscript'])
})
