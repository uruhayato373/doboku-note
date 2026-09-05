#!/usr/bin/env node
/**
 * 公的基準（共通仕様書）の原本 PDF を「1 ページ = 1 画像 + 1 テキスト」へ展開する。
 *
 * なぜ要るか: 章記事（content/site/standards-articles/）の本文は part-NN.md（50 ページ束）
 * までしかページ情報を持たず、「この記述は原本の何ページか」を機械で言えない。ページ単位に
 * 割ってはじめて (1) 出典ページの明示 (2) OCR/読み取りの再現性 (3) 図クロップの原寸確保
 * が成立する。
 *
 * 置き場（.claude/knowledge/reference/asset-storage-policy.md §1 の「教材ページ画像＝private R2」に従う）:
 *   content/sources/standards/{agencyId}/{documentId}/
 *     ├── manifest.json   git 追跡。原本 sha256・dpi・ページ数・各ページの sha256
 *     ├── pages/p0001.jpg gitignore → R2 private（asset-offload の standards-page-image group）
 *     └── text/p0001.txt  同上。PDF 内蔵テキスト層をページ境界(\f)で割ったもの
 *
 * 原本の同定は **catalog.json の sourceSha256 との一致**で行う（ファイル名では引かない）。
 * Drive 側のファイル名は整理で変わりうるが sha256 は変わらないため。
 *
 * 使い方:
 *   node scripts/build-standards-page-images.mjs                 # role=common を全整備局
 *   node scripts/build-standards-page-images.mjs --role all      # companion も含む全 72 文書
 *   node scripts/build-standards-page-images.mjs --agency tohoku # 1 局だけ
 *   node scripts/build-standards-page-images.mjs --dry-run
 *   node scripts/build-standards-page-images.mjs --force         # 既存を作り直す
 */
import { execFileSync, execFileSync as run } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = process.cwd()
const CATALOG = path.join(ROOT, 'content/site/standards-library/catalog.json')
const OUT_ROOT = path.join(ROOT, 'content/sources/standards')
const VAULT = path.join(
  os.homedir(),
  'Library/CloudStorage/GoogleDrive-uruhayato373@gmail.com/マイドライブ/doboku-note/原資料PDF/共通仕様書',
)

const argv = process.argv.slice(2)
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`)
  return i === -1 ? d : argv[i + 1]
}
const has = (n) => argv.includes(`--${n}`)
const DPI = Number(flag('dpi', 270))
const QUALITY = Number(flag('quality', 85))
const ROLE = flag('role', 'common')
const AGENCY = flag('agency', null)
const DRY = has('dry-run')
const FORCE = has('force')
const MANIFEST_ONLY = has('manifest-only')

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

/**
 * 版面に刷られたページ番号（例 "1-42"）をテキスト層の末尾から拾う。
 * PDF のページ番号（通し 120）と版面のページ番号（1-42）は一致しない。原本を引くとき人が
 * 使うのは後者なので、両方を manifest に持たせないと「何ページの情報か」を言えない。
 * 形が `編-ページ` に見えるものだけを採り、前付け等で拾えないときは null（推測しない）。
 */
const printedPageOf = (text) => {
  const lines = text.split('\n').map((l) => l.replace(/[\s\u3000]/g, '')).filter(Boolean)
  const last = lines[lines.length - 1]
  if (!last) return null
  const m = /^(\d{1,2})[-\u2010-\u2015\uFF0D](\d{1,3})$/.exec(last)
  return m ? `${m[1]}-${m[2]}` : null
}
const die = (msg) => {
  console.error(`[build-standards-page-images] ✗ ${msg}`)
  process.exit(1)
}

for (const bin of ['pdftoppm', 'pdftotext', 'pdfinfo']) {
  try {
    run('which', [bin], { stdio: 'pipe' })
  } catch {
    die(`${bin} が無い（brew install poppler）。検査不成立`)
  }
}
if (!fs.existsSync(VAULT)) die(`Drive vault が見えない: ${VAULT}\n  Google ドライブ アプリを起動して同期してから再実行する。検査不成立`)

const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'))
let targets = catalog.documents.filter((d) => (ROLE === 'all' ? true : d.role === ROLE))
if (AGENCY) targets = targets.filter((d) => d.agencyId === AGENCY)
if (targets.length === 0) die(`対象 0 件（role=${ROLE} agency=${AGENCY ?? '-'}）。検査不成立`)

// --- Drive の PDF を sha256 で索引する（ファイル名では引かない）
console.log(`[build-standards-page-images] Drive の PDF を索引中 ...`)
const bySha = new Map()
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name.toLowerCase().endsWith('.pdf')) {
      const h = sha256(fs.readFileSync(p))
      if (!bySha.has(h)) bySha.set(h, p)
    }
  }
}
walk(VAULT)
console.log(`[build-standards-page-images] PDF ${bySha.size} 本（ユニーク sha256）を索引`)

// --- 同一 sha256 の文書は 1 度だけ描画し、残りは alias として記録する
const renderedBySha = new Map()
const summary = { rendered: 0, aliased: 0, skipped: 0, pages: 0, bytes: 0, missing: [] }

for (const doc of targets.sort((a, b) => a.agencyId.localeCompare(b.agencyId))) {
  const label = `${doc.agencyId}/${doc.documentId}`
  const pdf = bySha.get(doc.sourceSha256)
  if (!pdf) {
    summary.missing.push(label)
    console.error(`  ✗ ${label}: 原本 PDF が Drive に無い（sha256 ${doc.sourceSha256.slice(0, 12)}）`)
    continue
  }
  const outDir = path.join(OUT_ROOT, doc.agencyId, doc.documentId)
  const manifestPath = path.join(outDir, 'manifest.json')

  const alreadyRendered = renderedBySha.get(doc.sourceSha256)
  if (alreadyRendered) {
    if (!DRY) {
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(
        manifestPath,
        JSON.stringify(
          {
            schemaVersion: 1,
            agencyId: doc.agencyId,
            documentId: doc.documentId,
            title: doc.title,
            sourceSha256: doc.sourceSha256,
            pages: doc.pages,
            sameAs: alreadyRendered,
            note: '原本 PDF の sha256 が一致するため画像は重複生成しない。実体は sameAs のディレクトリ。',
          },
          null,
          2,
        ) + '\n',
      )
    }
    summary.aliased++
    console.log(`  = ${label}: ${alreadyRendered} と原本が同一 → alias（画像は作らない）`)
    continue
  }

  if (fs.existsSync(manifestPath) && !FORCE) {
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    const n = fs.existsSync(path.join(outDir, 'pages'))
      ? fs.readdirSync(path.join(outDir, 'pages')).filter((f) => f.endsWith('.jpg')).length
      : 0
    if (m.sourceSha256 === doc.sourceSha256 && n === m.pages && !MANIFEST_ONLY) {
      renderedBySha.set(doc.sourceSha256, label)
      summary.skipped++
      summary.pages += n
      console.log(`  · ${label}: 生成済み ${n}p（--force で作り直す）`)
      continue
    }
  }

  const info = run('pdfinfo', [pdf], { encoding: 'utf8' })
  const realPages = Number(/^Pages:\s+(\d+)$/m.exec(info)?.[1])
  if (!realPages) die(`${label}: pdfinfo がページ数を返さない。検査不成立`)
  if (realPages !== doc.pages) {
    console.error(`  ! ${label}: catalog ${doc.pages}p だが原本は ${realPages}p — catalog 側を確認すること`)
  }

  console.log(`  → ${label}: ${realPages}p を ${DPI}dpi で描画${DRY ? '（dry-run）' : ''}`)
  if (DRY) {
    summary.rendered++
    summary.pages += realPages
    renderedBySha.set(doc.sourceSha256, label)
    continue
  }

  const pagesDir = path.join(outDir, 'pages')
  const textDir = path.join(outDir, 'text')
  if (!MANIFEST_ONLY) {
    fs.rmSync(pagesDir, { recursive: true, force: true })
    fs.rmSync(textDir, { recursive: true, force: true })
    fs.mkdirSync(pagesDir, { recursive: true })
    fs.mkdirSync(textDir, { recursive: true })
  }

  if (!MANIFEST_ONLY)
  execFileSync(
    'pdftoppm',
    ['-r', String(DPI), '-jpeg', '-jpegopt', `quality=${QUALITY}`, pdf, path.join(pagesDir, 'p')],
    { stdio: ['ignore', 'ignore', 'inherit'], maxBuffer: 1 << 28 },
  )
  // pdftoppm は p-001.jpg のように桁を可変で振る。p0001.jpg へ正規化する。
  const produced = fs
    .readdirSync(pagesDir)
    .filter((f) => f.endsWith('.jpg'))
    .sort()
  if (MANIFEST_ONLY) {
    if (produced.length !== realPages) die(`${label}: --manifest-only だが画像が ${produced.length} 枚しか無い（原本 ${realPages}p）。検査不成立`)
  } else
  if (produced.length !== realPages) die(`${label}: ${realPages}p のはずが ${produced.length} 枚しか出ていない。検査不成立`)
  const pageEntries = []
  if (!MANIFEST_ONLY)
  produced.forEach((f, i) => {
    const n = Number(/(\d+)\.jpg$/.exec(f)[1])
    if (n !== i + 1) die(`${label}: ページ番号が飛んでいる（${f}）。検査不成立`)
    const to = `p${String(n).padStart(4, '0')}.jpg`
    fs.renameSync(path.join(pagesDir, f), path.join(pagesDir, to))
  })

  // テキスト層をページ境界(\f)で割る。born-digital PDF なので OCR より正確。
  const raw = run('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 })
  const chunks = raw.split('\f')
  if (chunks.length && chunks[chunks.length - 1] === '') chunks.pop()
  if (chunks.length !== realPages) die(`${label}: テキスト層が ${chunks.length} ページ分しか割れない（原本 ${realPages}p）。検査不成立`)

  let docBytes = 0
  for (let i = 0; i < realPages; i++) {
    const name = `p${String(i + 1).padStart(4, '0')}`
    const jpg = fs.readFileSync(path.join(pagesDir, `${name}.jpg`))
    if (!MANIFEST_ONLY) fs.writeFileSync(path.join(textDir, `${name}.txt`), chunks[i])
    docBytes += jpg.length
    pageEntries.push({
      page: i + 1,
      image: `pages/${name}.jpg`,
      text: `text/${name}.txt`,
      imageBytes: jpg.length,
      imageSha256: sha256(jpg),
      textChars: chunks[i].length,
      printedPage: printedPageOf(chunks[i]),
    })
  }

  // 版面ページ番号は 目次(front) と 本文(body) で同じラベルが再使用される（例: 東北は
  // 目次が 1-1..1-77、本文が再び 1-1 から始まる）。ラベル単独では出典を一意に指せないので、
  // 「同じ編の中で番号が減った最初の地点」を front→body の境界として section を持たせる。
  let section = 'front'
  let flippedAt = null
  const lastNum = new Map()
  const extraDrops = []
  for (const e of pageEntries) {
    if (e.printedPage) {
      const [hen, num] = e.printedPage.split('-')
      const n = Number(num)
      const prev = lastNum.get(hen)
      if (prev !== undefined && n <= prev) {
        if (section === 'front') {
          section = 'body'
          flippedAt = e.page
        } else {
          extraDrops.push(e.page)
        }
      }
      lastNum.set(hen, n)
    }
    e.section = section
  }
  if (flippedAt === null) {
    // 番号の巻き戻しが無い文書（目次が無番号など）。全ページを本文として扱う。
    for (const e of pageEntries) e.section = 'body'
  }
  const seen = new Set()
  const ambiguous = []
  for (const e of pageEntries) {
    if (!e.printedPage) continue
    const key = `${e.section}/${e.printedPage}`
    if (seen.has(key)) ambiguous.push({ page: e.page, key })
    seen.add(key)
  }
  if (extraDrops.length) console.error(`  ! ${label}: 版面ページ番号の巻き戻しが 2 回以上ある（PDF p${extraDrops.join(', p')}）`)
  if (ambiguous.length) console.error(`  ! ${label}: section+版面ページ が重複 ${ambiguous.length} 件（出典を一意に指せない）`)

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        agencyId: doc.agencyId,
        agencyName: doc.agencyName,
        documentId: doc.documentId,
        role: doc.role,
        title: doc.title,
        edition: doc.edition ?? null,
        sourceFile: path.relative(VAULT, pdf),
        sourceSha256: doc.sourceSha256,
        pages: realPages,
        render: { tool: 'pdftoppm', dpi: DPI, format: 'jpeg', quality: QUALITY },
        text: { tool: 'pdftotext', layout: true, splitBy: 'formfeed' },
        parts: (doc.parts ?? []).map((p) => ({ slug: p.slug, firstPage: p.firstPage, lastPage: p.lastPage })),
        totalImageBytes: docBytes,
        printedPage: {
          note: '版面に刷られたページ番号。目次(front)と本文(body)で同じラベルが再使用されるため、出典は section と組で指す。',
          bodyStartsAtPdfPage: flippedAt,
          labelled: pageEntries.filter((e) => e.printedPage).length,
          ambiguous: ambiguous.length,
        },
        pageEntries,
      },
      null,
      2,
    ) + '\n',
  )
  summary.rendered++
  summary.pages += realPages
  summary.bytes += docBytes
  renderedBySha.set(doc.sourceSha256, label)
  console.log(`     ${realPages}p / ${(docBytes / 1048576).toFixed(0)}MB`)
}

console.log(
  `\n[build-standards-page-images] 対象 ${targets.length} 文書 — 描画 ${summary.rendered} / alias ${summary.aliased} / 生成済みskip ${summary.skipped} / 原本欠落 ${summary.missing.length}`,
)
console.log(`[build-standards-page-images] ページ ${summary.pages} 枚 / 新規 ${(summary.bytes / 1073741824).toFixed(2)} GB`)
if (summary.missing.length) {
  console.error(`[build-standards-page-images] ✗ 原本が引けない文書: ${summary.missing.join(', ')}`)
  process.exit(1)
}
if (summary.rendered + summary.aliased + summary.skipped === 0) die('1 文書も処理していない。検査不成立')
console.log('[build-standards-page-images] ✓ 完了')
