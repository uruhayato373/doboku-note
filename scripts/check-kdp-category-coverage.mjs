#!/usr/bin/env node
/**
 * check-kdp-category-coverage.mjs
 * ---------------------------------------------------------------------------
 * catalog.json の buildSpec 持ち（＝ /kdp-publish の対象になりうる新刊）の id 接頭辞が、
 * すべて .claude/config/kdp-memo.json defaults.categoryAssign に明示登録されているか検査する。
 *
 * 背景（2026-08-28）: categoryPathFor() は未登録の接頭辞を警告なく既定 track=gijutsushi
 * （カテゴリー「技術士」）へフォールバックする。g-01（コンクリート診断士）提出時に
 * categoryAssign へ g- を登録し忘れ、誤カテゴリーでドラフトが作成された実例がある。
 * 新シリーズを追加するたびに人が気づくのを待つのではなく、機械で止める。
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDefaults, uncoveredCategoryBooks } from './lib/kdp-common.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CATALOG = join(ROOT, 'scripts/kindle-published/catalog.json')

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'))
const targets = catalog.books.filter((b) => b.buildSpec).map((b) => b.id)

if (!targets.length) {
  console.error('[check-kdp-category-coverage] 検査対象0件（catalog.books に buildSpec 持ちが無い）＝検査不成立')
  process.exit(1)
}

const uncovered = uncoveredCategoryBooks(targets, getDefaults())
console.log(`[check-kdp-category-coverage] ${targets.length} 冊を実検査 / 未登録 ${uncovered.length} 件`)

if (uncovered.length) {
  console.error(`  未登録（提出すると警告なく既定 gijutsushi[技術士] へ入稿される）: ${uncovered.join(', ')}`)
  console.error('  .claude/config/kdp-memo.json の defaults.categoryAssign に接頭辞を追加すること')
  process.exit(1)
}

console.log('[check-kdp-category-coverage] ✓ 全冊の接頭辞が categoryAssign に明示登録済み')
