/**
 * kindle-catalog.mjs — Kindle 出版データ（catalog.json）の SoT を集約・検証する pure module。
 *
 * admin `/content/kindle`（表示専用）だけがこれを使う。CLI ゲートは今のところ無い
 * （brain-inventory.mjs のように check-*.mjs と共有する対になる相手が無いため）。
 * 判定ロジックはここに 1 本化し、admin 側で重複実装しない。
 *
 * 副作用は fs の read-only アクセスと git log（read-only）のみ。ネットワーク・書き込みは
 * 一切しない。`.claude/config/kdp-memo.json`（accountEmail 等の秘密混じり）は読まない。
 */
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { REPO_ROOT } from './repository-paths.mjs'

export const CATALOG_PATH = join(REPO_ROOT, 'scripts/kindle-published/catalog.json')
export const ROYALTIES_PATH = join(REPO_ROOT, '.claude/state/sales/kdp-royalties.json')
export const KINDLE_DIST_DIR = join(REPO_ROOT, 'scripts/kindle-dist')
export const KINDLE_PUBLISHED_DIR = join(REPO_ROOT, 'scripts/kindle-published')
export const KINDLE_SPECS_DIR = join(REPO_ROOT, 'scripts/kindle-specs')

/** catalog.json を読んで books 配列を返す。壊れていたら throw（呼び手が ok:false にする）。 */
export function loadKindleCatalog() {
  const raw = readFileSync(CATALOG_PATH, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed.books)) throw new Error('catalog.json: books が配列でない')
  return parsed.books
}

/**
 * 純粋: book → repo 相対パス群（A系/B-G系の2系統を吸収）。
 *  - epub/cover: 値が '/' を含む（例 "kindle-dist/e-01.epub"）→ `scripts/` + 値。
 *                含まない（例 "kindle-A-00-goubon.epub"）→ `scripts/kindle-published/` + 値。
 *  - kdpMemo: 値が 'scripts/' で始まる → そのまま。それ以外 → `scripts/kindle-published/` + 値。
 *  - buildSpec: そのまま（'scripts/kindle-specs/<id>.json'）。無い book（A系7冊）は null。
 */
export function artifactRelPaths(book) {
  const withPrefix = (v, defaultDir) => {
    if (!v) return null
    if (v.includes('/')) return `scripts/${v}`
    return `${defaultDir}/${v}`
  }
  const kdpMemo = book.kdpMemo
    ? (book.kdpMemo.startsWith('scripts/') ? book.kdpMemo : `scripts/kindle-published/${book.kdpMemo}`)
    : null
  return {
    epub: withPrefix(book.epub, 'scripts/kindle-published'),
    cover: withPrefix(book.cover, 'scripts/kindle-published'),
    kdpMemo,
    buildSpec: book.buildSpec || null,
  }
}

/** fs 検査: 冊ごとの実体確認。存在しない実体は exists:false（推測で埋めない）。 */
export function inspectKindleInventory(books) {
  return books.map((book) => {
    const rel = artifactRelPaths(book)
    const abs = (r) => (r ? join(REPO_ROOT, r) : null)
    const fileInfo = (r) => {
      const p = abs(r)
      if (!p || !existsSync(p)) return { rel: r, exists: false, bytes: 0 }
      const st = statSync(p)
      return { rel: r, exists: st.isFile(), bytes: st.isFile() ? st.size : 0 }
    }
    return {
      id: book.id,
      epub: fileInfo(rel.epub),
      cover: fileInfo(rel.cover),
      kdpMemoDead: rel.kdpMemo ? !existsSync(abs(rel.kdpMemo)) : true,
      buildSpec: rel.buildSpec ? fileInfo(rel.buildSpec) : null,
      rebuildable: Boolean(rel.buildSpec),
    }
  })
}

/**
 * 純粋: spec JSON オブジェクトから原稿ソースの repo 相対パス配列を抽出。
 * sources は文字列配列（B-G 系とも実測で確認済み）。frontMatter キーも入力に含める。
 */
export function specInputPaths(spec) {
  if (!spec) return []
  const out = []
  if (Array.isArray(spec.sources)) {
    for (const s of spec.sources) if (typeof s === 'string') out.push(s)
  }
  if (typeof spec.frontMatter === 'string') out.push(spec.frontMatter)
  return out
}

/** A系（spec 無し）の入力パス。THEMES はコード内定数なので builder ファイル自体を入力とみなす。 */
const A_SERIES_INPUTS = ['src/config/civil-1-exam-questions.json']

/** builder の共有レンダラ（essay 系のみ）。pe1/takuitsu は自前実装のため対象外。 */
const SHARED_RENDERER = 'scripts/lib/kindle-md.mjs'

/**
 * 純粋: git log テキスト（`git log --name-only --pretty=format:%cI`）→ Map<path, 最新commit日ISO>。
 * newest-first を前提に「まだ無いキーだけ set」する（初出 = 最新）。
 */
export function buildPathDateMap(gitLogText) {
  const map = new Map()
  if (!gitLogText) return map
  let currentDate = null
  const ISO_RE = /^\d{4}-\d{2}-\d{2}T/
  for (const line of gitLogText.split('\n')) {
    const t = line.trim()
    if (!t) continue
    if (ISO_RE.test(t)) {
      currentDate = t
      continue
    }
    const p = t.replace(/\\/g, '/')
    if (currentDate && !map.has(p)) map.set(p, currentDate)
  }
  return map
}

/**
 * 純粋: 鮮度推定。各冊について epubDate = map.get(epub の repo相対パス)、
 * inputDates = max(spec の sources ∪ buildSpec 自身 ∪ front-matter ∪ builder パス)。
 * epubDate が map に無い、または input が 1 つも map に無い冊は 'unknown'（緑にしない）。
 *
 * @param {Array} books catalog.books
 * @param {Map<string,string>} pathDateMap buildPathDateMap の結果
 * @param {(specRelPath: string) => object|null} readSpec spec ファイルを読む関数（呼び手が注入・fs アクセスを分離）
 */
export function estimateFreshness(books, pathDateMap, readSpec) {
  const perBook = {}
  const staleIds = []
  const unknownIds = []
  for (const book of books) {
    const rel = artifactRelPaths(book)
    const epubPath = rel.epub
    const epubDate = epubPath ? pathDateMap.get(epubPath) : undefined

    let inputPaths = []
    if (rel.buildSpec) {
      const spec = readSpec(rel.buildSpec)
      inputPaths = [...specInputPaths(spec), rel.buildSpec]
    } else {
      inputPaths = [...A_SERIES_INPUTS]
    }
    if (book.builder) inputPaths.push(book.builder)
    if (book.builder === 'scripts/build-essay-kindle.mjs') inputPaths.push(SHARED_RENDERER)

    const inputDates = inputPaths.map((p) => pathDateMap.get(p)).filter(Boolean)
    const latestInputDate = inputDates.length ? inputDates.reduce((a, b) => (a > b ? a : b)) : undefined

    let freshness
    if (!epubDate || !latestInputDate) {
      freshness = 'unknown'
      unknownIds.push(book.id)
    } else if (latestInputDate > epubDate) {
      freshness = 'stale'
      staleIds.push(book.id)
    } else {
      freshness = 'fresh'
    }
    perBook[book.id] = { freshness, epubDate: epubDate ?? null, latestInputDate: latestInputDate ?? null }
  }
  return { staleIds, unknownIds, perBook }
}

/**
 * royalties JSON（無ければ null）と catalog を join。最新月 = Object.keys(months) の max。
 * estimated / caveat / fetchedAt は必ず素通しする（推計であることを画面から隠さない）。
 */
export function joinRoyalties(books, royaltiesJson) {
  if (!royaltiesJson || !royaltiesJson.months || Object.keys(royaltiesJson.months).length === 0) {
    return { ok: false }
  }
  const monthKeys = Object.keys(royaltiesJson.months).sort()
  const month = monthKeys[monthKeys.length - 1]
  const m = royaltiesJson.months[month]
  const byId = new Map(books.map((b) => [b.id, b]))
  // KDP レポート由来の books[] は同一 bookId が複数行に分かれることがある
  // （マーケットプレイス別内訳等・未マージのまま供給される。2026-08-28 実測: e-01 が2行）。
  // bookId で合算する（合計値は変えず、表示上の重複行と React key 衝突を防ぐ）。
  const merged = new Map()
  for (const b of m.books || []) {
    const prev = merged.get(b.bookId)
    if (prev) {
      prev.ebook += b.ebook || 0
      prev.print += b.print || 0
      prev.kenp += b.kenp || 0
      prev.royalty += b.royalty || 0
    } else {
      merged.set(b.bookId, {
        bookId: b.bookId, title: b.title,
        ebook: b.ebook || 0, print: b.print || 0, kenp: b.kenp || 0, royalty: b.royalty || 0,
      })
    }
  }
  const perBook = [...merged.values()].map((b) => ({ ...b, inCatalog: byId.has(b.bookId) }))
  return {
    ok: true,
    month,
    fetchedAt: m.fetchedAt ?? null,
    estimated: Boolean(m.estimated),
    caveat: royaltiesJson.caveat ?? null,
    total: m.total ?? null,
    kenpPagesRead: m.kenpPagesRead ?? null,
    perBook,
  }
}

/**
 * 純粋: sync-kindle-dist.mjs の対象選定ロジック（buildSpec 持ちの新刊のみ・id 無指定時は
 * live/in_review を上書きしない保護ガード）。id を明示すれば status を問わず対象にする。
 *
 * @param {Array} books catalog.books
 * @param {string[]} ids 明示指定された id（空配列なら全冊モード）
 * @returns {{targets: Array, skipped: Array}} targets=再ビルド対象、skipped=保護のため除外した冊
 */
export function selectSyncTargets(books, ids) {
  const candidates = books.filter((b) => b.buildSpec)
  if (ids.length) {
    return { targets: candidates.filter((b) => ids.includes(b.id)), skipped: [] }
  }
  const skipped = candidates.filter((b) => b.status !== 'ready')
  const targets = candidates.filter((b) => b.status === 'ready')
  return { targets, skipped }
}

/** 表紙の配信 URL（media route 経由）。実在しないものは null にする（推測で埋めない）。 */
export function coverMediaUrl(book) {
  const rel = artifactRelPaths(book)
  if (!rel.cover) return null
  const abs = join(REPO_ROOT, rel.cover)
  if (!existsSync(abs)) return null
  if (rel.cover.startsWith('scripts/kindle-dist/')) return `/media/kindle/${basename(rel.cover)}`
  if (rel.cover.startsWith('scripts/kindle-published/')) return `/media/kindlepub/${basename(rel.cover)}`
  return null
}
