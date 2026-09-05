#!/usr/bin/env node
/**
 * 公的基準のページ画像・ページテキストの整合ゲート。
 *
 * 「検査ゼロを PASS と呼ばない」（CLAUDE.md §9）を守るため、対象数と実検査数を必ず出力し、
 * 対象 0 件・実体総なめ 0 件は exit 2（検査不成立）にする。ローカルに実体が無い端末では
 * manifest の整合だけを検査し、その旨を明示する（実体検査 0 件を緑と言わない）。
 *
 * 検査:
 *   1. catalog.json の対象文書すべてに manifest.json があるか（被覆）
 *   2. manifest の sourceSha256 が catalog と一致するか（別の原本を写していないか）
 *   3. manifest の pageEntries がページ 1..N を飛びなく覆うか
 *   4. parts の firstPage/lastPage がページ範囲に収まるか（章記事との突き合わせ可能性）
 *   5. ローカルに実体がある文書は、画像の sha256 が manifest と一致するか（--deep で全件）
 *   6. alias（sameAs）の指す先が実在するか
 *
 * 使い方: node scripts/check-standards-page-images.mjs [--role common|all] [--deep]
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { resolveVaultRoot } from './lib/drive-vault.mjs'

const ROOT = process.cwd()
const CATALOG = path.join(ROOT, 'content/site/standards-library/catalog.json')
const OUT_ROOT = path.join(ROOT, 'content/sources/standards')
// 実体は Drive vault（原本 PDF の隣）。repo に残っていればそれも見る（移行中）。
let VAULT_ROOT = null
try {
  const m = resolveVaultRoot()
  VAULT_ROOT = m.root
  if (!m.root) console.log(`[check-standards-page-images] mount 無し（${m.reason}）— 実体検査は repo に残る分だけ`)
} catch (e) {
  console.log(`[check-standards-page-images] drive-vault 設定を読めない（${e.message}）— 実体検査は repo に残る分だけ`)
}
const argv = process.argv.slice(2)
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`)
  return i === -1 ? d : argv[i + 1]
}
const ROLE = flag('role', 'common')
const DEEP = argv.includes('--deep')
const SAMPLE = Number(flag('sample', 8))

const sha256 = (b) => createHash('sha256').update(b).digest('hex')
const fails = []
const warns = []
let checkedManifests = 0
let checkedPages = 0
let docsWithLocalBytes = 0
let docsInRepo = 0
let docsInVault = 0

if (!fs.existsSync(CATALOG)) {
  console.error('[check-standards-page-images] ✗ catalog.json が無い。検査不成立')
  process.exit(2)
}
const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'))
const targets = catalog.documents.filter((d) => (ROLE === 'all' ? true : d.role === ROLE))
if (targets.length === 0) {
  console.error(`[check-standards-page-images] ✗ 対象 0 件（role=${ROLE}）。検査不成立`)
  process.exit(2)
}

for (const doc of targets) {
  const label = `${doc.agencyId}/${doc.documentId}`
  const dir = path.join(OUT_ROOT, doc.agencyId, doc.documentId)
  const mp = path.join(dir, 'manifest.json')
  if (!fs.existsSync(mp)) {
    fails.push(`${label}: manifest.json が無い（未生成。npm run build-standards-page-images）`)
    continue
  }
  const m = JSON.parse(fs.readFileSync(mp, 'utf8'))
  checkedManifests++

  if (m.sourceSha256 !== doc.sourceSha256) {
    fails.push(`${label}: 原本 sha256 が catalog と不一致（manifest ${m.sourceSha256.slice(0, 12)} / catalog ${doc.sourceSha256.slice(0, 12)}）`)
    continue
  }

  if (m.sameAs) {
    const [aId, dId] = m.sameAs.split('/')
    if (!fs.existsSync(path.join(OUT_ROOT, aId, dId, 'manifest.json'))) {
      fails.push(`${label}: sameAs が指す ${m.sameAs} に manifest が無い`)
    }
    continue
  }

  const entries = m.pageEntries ?? []
  if (entries.length !== m.pages) {
    fails.push(`${label}: pageEntries ${entries.length} 件だが pages=${m.pages}`)
    continue
  }
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].page !== i + 1) {
      fails.push(`${label}: ページ番号が飛んでいる（${i + 1} 番目が page=${entries[i].page}）`)
      break
    }
  }
  // 版面ページ番号は出典表記の核なので、一意に指せない状態を緑にしない
  if (m.printedPage) {
    if (m.printedPage.ambiguous > 0) {
      fails.push(`${label}: section+版面ページ が重複 ${m.printedPage.ambiguous} 件 — 出典を一意に指せない`)
    }
    if (m.printedPage.labelled === 0) {
      fails.push(`${label}: 版面ページ番号を 1 件も拾えていない（printedPageOf の正規表現が合っていない可能性）`)
    }
    const seen = new Set()
    for (const e of entries) {
      if (!e.printedPage) continue
      if (!e.section) {
        fails.push(`${label}: p${e.page} に section が無い（manifest が旧世代。--manifest-only で作り直す）`)
        break
      }
      const k = `${e.section}/${e.printedPage}`
      if (seen.has(k)) {
        fails.push(`${label}: ${k} が重複（p${e.page}）`)
        break
      }
      seen.add(k)
    }
  } else {
    fails.push(`${label}: manifest に printedPage 概要が無い（旧世代。--manifest-only で作り直す）`)
  }

  for (const p of m.parts ?? []) {
    if (p.firstPage < 1 || p.lastPage > m.pages) {
      fails.push(`${label}: part ${p.slug} のページ範囲 ${p.firstPage}-${p.lastPage} が原本 ${m.pages}p を外れる`)
    }
  }

  // 実体の場所: repo（移行前）か vault（原本 PDF と同名フォルダ）か
  let bodyDir = null
  if (fs.existsSync(path.join(dir, 'pages'))) { bodyDir = dir; docsInRepo++ }
  else if (VAULT_ROOT && m.sourceFile) {
    const cand = path.join(VAULT_ROOT, '原資料PDF', '共通仕様書', ...m.sourceFile.replace(/\.pdf$/i, '').split('/'))
    if (fs.existsSync(path.join(cand, 'pages'))) { bodyDir = cand; docsInVault++ }
  }
  if (!bodyDir) continue
  const pagesDir = path.join(bodyDir, 'pages')
  docsWithLocalBytes++
  const onDisk = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.jpg'))
  if (onDisk.length !== m.pages) {
    fails.push(`${label}: 画像 ${onDisk.length} 枚（manifest は ${m.pages}）`)
  }
  const pick = DEEP ? entries : entries.filter((_, i) => i % Math.max(1, Math.floor(entries.length / SAMPLE)) === 0)
  for (const e of pick) {
    const f = path.join(bodyDir, e.image)
    if (!fs.existsSync(f)) {
      fails.push(`${label}: ${e.image} が無い`)
      continue
    }
    const buf = fs.readFileSync(f)
    checkedPages++
    if (sha256(buf) !== e.imageSha256) fails.push(`${label}: ${e.image} の sha256 が manifest と不一致`)
    const t = path.join(bodyDir, e.text)
    if (!fs.existsSync(t)) warns.push(`${label}: ${e.text} が無い（テキスト層が退避済みの可能性）`)
  }
}

console.log(`[check-standards-page-images] 対象 ${targets.length} 文書 / manifest 実検査 ${checkedManifests} 件`)
console.log(`[check-standards-page-images] 実体がある文書 ${docsWithLocalBytes} 件（repo ${docsInRepo} / vault ${docsInVault}）/ 画像 sha256 実照合 ${checkedPages} 枚${DEEP ? '（--deep 全件）' : `（各文書 約${SAMPLE} 枚のサンプル。全件は --deep）`}`)
for (const w of warns) console.warn(`  ! ${w}`)
if (checkedManifests === 0) {
  console.error('[check-standards-page-images] ✗ manifest を 1 件も検査していない。検査不成立')
  process.exit(2)
}
if (fails.length) {
  for (const f of fails) console.error(`  ✗ ${f}`)
  console.error(`[check-standards-page-images] ✗ FAIL ${fails.length} 件`)
  process.exit(1)
}
if (docsWithLocalBytes === 0) {
  console.log('[check-standards-page-images] ✓ manifest は健全（この端末に画像の実体は無い＝実体検査 0 件。実体は Drive vault。取り戻しは npm run drive-vault-sync -- --pull --path content/sources/standards/）')
} else {
  console.log('[check-standards-page-images] ✓ manifest と画像実体は整合')
}
