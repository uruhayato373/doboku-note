#!/usr/bin/env node
/**
 * check-kindle-prices.mjs
 * ---------------------------------------------------------------------------
 * Kindle の価格台帳の整合を検査する。
 *   - spec.price（scripts/kindle-specs/<id>.json・提出と改定の目標値）と
 *     catalog.priceJpy（scripts/kindle-published/catalog.json・台帳）が一致しているか
 *   - royalty 0.7 の本が 70% 帯（¥250〜¥1,250）に収まっているか
 *
 * 背景（2026-09-23）: 3段階の価格改定で spec と catalog の片側だけが古いまま残ると、
 * kdp-publish.mjs --set-price が旧値へ戻す、または台帳が実売価格と食い違う。
 * spec を直したら `kdp-publish.mjs --id <id> --set-price --commit` が成功時に catalog を
 * 書き戻すので、不一致が残っている＝改定が KDP へ未反映。
 * KDP 上の実価格との突合はログインが要るため `kdp-publish.mjs --sync-status` が担う。
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { kindlePriceIssues, loadSpecPrices } from './lib/kdp-common.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(readFileSync(join(ROOT, 'scripts/kindle-published/catalog.json'), 'utf8'))
const targets = catalog.books.filter((b) => ['live', 'ready'].includes(b.status))

if (!targets.length) {
  console.error('[check-kindle-prices] 検査対象0件（catalog に live/ready の本が無い）＝検査不成立')
  process.exit(2)
}

const specPrices = loadSpecPrices()
const withSpec = targets.filter((b) => b.id in specPrices).length
const issues = kindlePriceIssues(targets, specPrices)
console.log(`[check-kindle-prices] ${targets.length} 冊を実検査（spec 照合 ${withSpec} 冊・spec 無し ${targets.length - withSpec} 冊は帯のみ）/ 問題 ${issues.length} 件`)

if (issues.length) {
  for (const i of issues) console.error(`  ${i.id} [${i.kind}] ${i.msg}`)
  console.error('  mismatch: spec を改定したなら node scripts/kdp-publish.mjs --id <id> --set-price --commit（成功時に catalog を書き戻す）')
  process.exit(1)
}
console.log('[check-kindle-prices] ✓ spec と catalog の価格は一致し、70% 帯に収まっている')
