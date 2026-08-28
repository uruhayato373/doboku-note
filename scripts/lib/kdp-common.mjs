// scripts/lib/kdp-common.mjs
// ---------------------------------------------------------------------------
// KDP 入稿 SSOT（.claude/config/kdp-memo.json）の読取り・defaults/override マージ・検証を一元化。
// gen-kdp-memo.mjs（コピペ用メモ生成）と kdp-publish.mjs（Playwright 入稿・出版）の共通基盤。
// 共通定数を両スクリプトで二重定義しないための単一ソース（真実源は config の defaults）。
// ---------------------------------------------------------------------------
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const CONFIG_PATH = resolve(REPO, '.claude/config/kdp-memo.json')
const SPEC_DIR = resolve(REPO, 'scripts/kindle-specs')

// config に defaults が無い旧環境でも動く後方互換フォールバック（gen-kdp-memo.mjs 旧定数と同値）
const FALLBACK_DEFAULTS = {
  accountEmail: null,
  author: 'doboku-note', authorKana: 'ドボクノート', authorRomaji: 'doboku-note',
  label: 'doboku-note 過去問シリーズ', labelKana: 'ドボクノート カコモンシリーズ', labelRomaji: 'doboku-note Kakomon Series',
  category: '資格・検定 ＞ 技術・工学系資格', issuer: '公益社団法人 日本技術士会',
  kdpSelect: true, accessibility: 'readable',
  aiDeclaration: { text: 'NONE', images: 'FEW_AND_EXTENSIVE', translations: 'NONE', imageTool: 'ChatGPT' },
  categoryPaths: {
    gijutsushi: { dropdowns: ['Kindle本', '資格・検定・就職', '工学・技術・環境'], leaf: '技術士', verified: true },
    dobokuSekokan: { dropdowns: ['Kindle本', '資格・検定・就職', '建築・土木'], leaf: '土木施工管理技士', verified: false },
  },
  categoryAssign: { dobokuSekokan: ['a-', 'e-'], gijutsushi: ['b-', 'c-', 'd-', 'f-'] },
}

export function loadKdpConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
}

export function getDefaults(cfg = loadKdpConfig()) {
  const d = cfg.defaults || {}
  return {
    ...FALLBACK_DEFAULTS, ...d,
    aiDeclaration: { ...FALLBACK_DEFAULTS.aiDeclaration, ...(d.aiDeclaration || {}) },
    categoryPaths: { ...FALLBACK_DEFAULTS.categoryPaths, ...(d.categoryPaths || {}) },
    categoryAssign: { ...FALLBACK_DEFAULTS.categoryAssign, ...(d.categoryAssign || {}) },
  }
}

// id 接頭辞 → カテゴリー系統 → 掲載経路（dropdowns + leaf）を返す。
export function categoryPathFor(id, defaults = getDefaults()) {
  let track = 'gijutsushi'
  for (const [name, prefixes] of Object.entries(defaults.categoryAssign || {})) {
    if ((prefixes || []).some((p) => id.startsWith(p))) { track = name; break }
  }
  return { track, ...(defaults.categoryPaths[track] || defaults.categoryPaths.gijutsushi) }
}

// categoryAssign に明示登録されていない id を返す（categoryPathFor は既定 track=gijutsushi へ
// 黙ってフォールバックするため、新シリーズの接頭辞を登録し忘れると誤カテゴリーで入稿される
// 事故が再発する。2026-08-28 g-01 実測: g- を登録し忘れ「技術士」で誤ドラフト作成）。
export function uncoveredCategoryBooks(bookIds, defaults = getDefaults()) {
  const prefixes = Object.values(defaults.categoryAssign || {}).flat()
  return bookIds.filter((id) => !prefixes.some((p) => id.startsWith(p)))
}

// spec + books[id] + defaults を統合した正規化 book オブジェクトを返す。
// options.requireMemo=false のとき kdp-memo 未登録でも spec だけで最小構築（--calibrate/--dump 用）。
export function resolveBook(id, { requireMemo = true } = {}) {
  const specPath = resolve(SPEC_DIR, `${id}.json`)
  if (!existsSync(specPath)) throw new Error(`spec not found: ${specPath}`)
  const spec = JSON.parse(readFileSync(specPath, 'utf8'))
  const cfg = loadKdpConfig()
  const defaults = getDefaults(cfg)
  const d = cfg.books[id]
  if (!d && requireMemo) throw new Error(`.claude/config/kdp-memo.json books["${id}"] 未登録（kdp-operator でメタデータ生成が必要）`)
  const m = d || {}
  const kdp = m.kdp || {}
  const cat = categoryPathFor(id, defaults)
  return {
    id,
    // spec 由来
    title: spec.title, subtitle: spec.subtitle, price: spec.price,
    issuer: spec.creditIssuer || defaults.issuer, examName: spec.examName || '本試験',
    // kdp-memo 由来（未登録なら空）
    titleKana: m.titleKana, titleRomaji: m.titleRomaji, subKana: m.subKana, subRomaji: m.subRomaji,
    series: m.series, seriesKana: m.seriesKana, seriesRomaji: m.seriesRomaji, volume: m.volume,
    keywords: m.keywords || [], description: m.description || '', previewNote: m.previewNote || '',
    // defaults（共通定数）
    author: defaults.author, authorKana: defaults.authorKana, authorRomaji: defaults.authorRomaji,
    label: defaults.label, labelKana: defaults.labelKana, labelRomaji: defaults.labelRomaji,
    category: defaults.category, accountEmail: defaults.accountEmail,
    // 出版申告（per-book override 優先）
    kdpSelect: kdp.kdpSelect ?? defaults.kdpSelect,
    accessibility: kdp.accessibility || defaults.accessibility,
    aiDeclaration: { ...defaults.aiDeclaration, ...(kdp.aiDeclaration || {}) },
    // カテゴリー掲載経路（per-book override 優先）
    catDropdowns: kdp.categoryDropdowns || cat.dropdowns,
    catLeaf: kdp.categoryLeaf || cat.leaf,
    catVerified: kdp.categoryLeaf ? true : cat.verified,
    hasMemo: !!d,
  }
}

// アクセシビリティの内部値 → KDP ラジオ value
export const ACCESSIBILITY_VALUES = {
  unknown: 'unknown', not_readable: 'not_readable', partially_readable: 'partially_readable', readable: 'readable',
}

// AI 申告の内部値 → KDP ドロップダウンのラベル（画像/テキスト/翻訳 共通の量+編集度）
export const AI_AMOUNT_LABELS = {
  NONE: 'なし',
  FEW_AND_MINIMAL: '1 つまたはいくつかの AI 生成画像 (最小限の編集あり、または編集なし)',
  FEW_AND_EXTENSIVE: '1 つまたはいくつかの AI 生成画像 (広範な編集あり)',
  MANY_AND_MINIMAL: '多くの AI 生成画像 (最小限の編集あり、または編集なし)',
  MANY_AND_EXTENSIVE: '多くの AI 生成画像 (広範な編集あり)',
  PARTIAL_AND_MINIMAL: '一部のセクション (最小限の編集あり、または編集なし)',
  PARTIAL_AND_EXTENSIVE: '一部のセクション (広範な編集あり)',
  ENTIRE_AND_MINIMAL: '作品全体 (最小限の編集あり、または編集なし)',
  ENTIRE_AND_EXTENSIVE: '作品全体 (広範な編集あり)',
}

// メタデータ検証。問題があれば配列で返す（空なら合格）。
export function validateBook(book) {
  const errs = []
  if (!book.title) errs.push('title 欠落')
  if (!book.price || book.price < 99) errs.push(`price 不正: ${book.price}`)
  if (book.hasMemo) {
    for (const k of ['titleKana', 'titleRomaji', 'series', 'seriesRomaji']) if (!book[k]) errs.push(`${k} 欠落`)
    if (!book.description) errs.push('description 欠落')
    else if ([...book.description].length > 4000) errs.push(`description 4000字超過(${[...book.description].length})`)
    if (!book.keywords.length) errs.push('keywords 空')
    if (book.keywords.length > 7) errs.push(`keywords 7個超過(${book.keywords.length})`)
    book.keywords.forEach((k, i) => { if ([...k].length > 50) errs.push(`keyword[${i}] 50字超過`) })
  }
  return errs
}
