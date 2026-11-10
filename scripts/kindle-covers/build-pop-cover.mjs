#!/usr/bin/env node
/**
 * build-pop-cover.mjs — Kindle 表紙の唯一の作り方。文字まで画像生成で描く POP 表紙を、候補の生成 → 目視 → 採用の 2 段で作る。
 *
 *   npm run kindle-pop-cover -- --id c-05 [--candidates 2] [--model <m>]
 *       spec（scripts/kindle-covers/specs/<id>.json）の pop から生成指示を組み、候補を .tmp/kindle-pop/<id>/ に出す。
 *       原寸と幅 136px（Amazon の検索結果）を並べた確認用の画像と、描くべき文字の一覧を出す。採用はしない。
 *   npm run kindle-pop-cover -- --adopt c-05 --candidate .tmp/kindle-pop/c-05/cand-1.png --review "<確かめたこと>"
 *       候補を 1600×2560 の JPEG にして catalog の表紙の置き場へ書き、制作記録（scripts/kindle-covers/pop/<id>.pop-image.json）を残し、
 *       spec に adoptedImage を足す（npm run sync-kindle-dist はこの本の表紙を作り直さない）。
 *
 * 採用の前に、文字の一覧と画像を 1 文字ずつ照合する（誤字・欠け・余計な文字・手指・顔と印の重なり）。
 * 合否は人か ai-image-fidelity-auditor が決める。このスクリプトは合格と言わない。
 * 採用画像の正本は private R2 の kindle-dist（node scripts/asset-offload.mjs --group kindle-dist --include-untracked --commit で上げる）。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, relative, resolve } from 'node:path'
import sharp from 'sharp'
import { parseCliArgs } from '../lib/cli-args.mjs'
import { generateWithCodexAsync } from '../lib/codex-image.mjs'
import { examPalette, loadImageRules } from '../lib/image-rules.mjs'
import { artifactRelPaths, loadKindleCatalog } from '../lib/kindle-catalog.mjs'
import { buildKindlePopPrompt, kindleRatioOk, popErrors, popTexts } from '../lib/kindle-pop-cover.mjs'
import { todayJst } from '../lib/jst-date.mjs'
import { REPO_ROOT as ROOT } from '../lib/repository-paths.mjs'

const args = parseCliArgs({
  id: { type: 'string' },
  candidates: { type: 'integer', default: 1 },
  model: { type: 'string' },
  adopt: { type: 'string' },
  candidate: { type: 'string' },
  review: { type: 'string' },
})

const specPath = (id) => {
  for (const name of [id, id.toLowerCase()]) {
    const path = join(ROOT, 'scripts/kindle-covers/specs', `${name}.json`)
    if (existsSync(path)) return path
  }
  throw new Error(`表紙 spec が無い: scripts/kindle-covers/specs/${id}.json`)
}
const readSpec = (id) => JSON.parse(readFileSync(specPath(id), 'utf8'))
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const rel = (path) => relative(ROOT, path)

function coverDest(id) {
  const row = loadKindleCatalog().find((b) => b.id === id || b.id.toLowerCase() === id.toLowerCase())
  const cover = row ? artifactRelPaths(row).cover : null
  return join(ROOT, cover ?? `scripts/kindle-dist/${id}.jpg`)
}

async function generate(id) {
  const spec = readSpec(id)
  const errors = popErrors(spec.pop)
  if (errors.length) { console.error(`ABORT ${id}: ${errors.join(' / ')}`); process.exit(1) }
  const rules = loadImageRules(ROOT)
  if (!rules.formats.kindle) { console.error('ABORT: 画像生成の共通ルール（config.image-generation）に formats.kindle が無い'); process.exit(1) }
  const prompt = buildKindlePopPrompt(spec.pop, rules, examPalette(spec.pop.exam, ROOT))
  const reference = join(ROOT, spec.pop.reference)
  if (!existsSync(reference)) { console.error(`ABORT: 参照画像が無い ${spec.pop.reference}（npm run asset-hydrate -- --group kindle-dist で取り戻す）`); process.exit(1) }
  const outDir = join(ROOT, '.tmp/kindle-pop', id)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'prompt.txt'), `${prompt}\n`)
  const n = Math.max(1, Math.min(3, args.candidates))
  const results = await Promise.all(Array.from({ length: n }, () => generateWithCodexAsync(prompt, args.model ?? null, { images: [reference] })))
  const made = []
  results.forEach((raw, i) => {
    if (!raw) return
    const out = join(outDir, `cand-${i + 1}.png`)
    copyFileSync(raw, out)
    made.push(out)
  })
  console.log(`[pop] ${id}: 候補 ${made.length}/${n} 枚`)
  if (!made.length) { console.error('FAIL: 画像が 1 枚も出なかった（codex の画像生成を確認）'); process.exit(1) }
  for (const file of made) {
    const meta = await sharp(file).metadata()
    const ok = kindleRatioOk(meta.width, meta.height)
    const sheet = file.replace(/\.png$/, '-review.jpg')
    const big = await sharp(file).resize({ width: 640 }).toBuffer()
    const bigMeta = await sharp(big).metadata()
    const thumb = await sharp(file).resize({ width: 136 }).toBuffer()
    await sharp({ create: { width: 640 + 24 + 136, height: bigMeta.height, channels: 3, background: '#ffffff' } })
      .composite([{ input: big, left: 0, top: 0 }, { input: thumb, left: 664, top: 0 }])
      .jpeg({ quality: 85 }).toFile(sheet)
    console.log(`  ${rel(file)}  ${meta.width}×${meta.height}${ok ? '' : '  ← 縦横比が 5:8 から外れている（採用不可・作り直す）'}  確認用: ${rel(sheet)}`)
  }
  console.log('[pop] 描くべき文字（1 文字ずつ照合する）:')
  for (const text of popTexts(spec.pop)) console.log(`  - ${text}`)
}

async function adopt(id) {
  if (!args.candidate || !args.review) { console.error('使い方: --adopt <id> --candidate <png> --review "<確かめたこと>"'); process.exit(2) }
  const spec = readSpec(id)
  const candidate = resolve(ROOT, args.candidate)
  if (!existsSync(candidate)) { console.error(`ABORT: 候補が無い ${args.candidate}`); process.exit(1) }
  const meta = await sharp(candidate).metadata()
  if (!kindleRatioOk(meta.width, meta.height)) { console.error(`ABORT: 縦横比が 5:8 から外れている（${meta.width}×${meta.height}）。引き伸ばさずに作り直す`); process.exit(1) }
  const promptFile = join(dirname(candidate), 'prompt.txt')
  const dest = coverDest(spec.bookId ?? id)
  mkdirSync(dirname(dest), { recursive: true })
  await sharp(candidate).resize(1600, 2560, { fit: 'fill', kernel: 'lanczos3' }).sharpen({ sigma: 0.8 })
    .jpeg({ quality: 92, mozjpeg: true }).toFile(dest)
  const recordRel = `scripts/kindle-covers/pop/${id}.pop-image.json`
  const record = {
    id,
    adoptedAt: todayJst(),
    reference: spec.pop.reference,
    texts: popTexts(spec.pop),
    prompt: existsSync(promptFile) ? readFileSync(promptFile, 'utf8').trim() : null,
    generated: { tool: 'Codex ImageGen（scripts/lib/codex-image.mjs）', size: [meta.width, meta.height], sha256: sha256(candidate) },
    adopted: { path: rel(dest), size: [1600, 2560], format: 'JPEG q92・lanczos3 で拡大・弱いシャープ', sha256: sha256(dest) },
    review: args.review,
  }
  mkdirSync(join(ROOT, 'scripts/kindle-covers/pop'), { recursive: true })
  writeFileSync(join(ROOT, recordRel), `${JSON.stringify(record, null, 2)}\n`)
  const { bookId, adoptedImage: _old, ...rest } = spec
  writeFileSync(specPath(id), `${JSON.stringify({ bookId, adoptedImage: recordRel, ...rest }, null, 2)}\n`)
  console.log(`[pop] 採用: ${id} → ${rel(dest)}（sha256=${record.adopted.sha256}）`)
  console.log(`[pop] 制作記録: ${recordRel} / spec に adoptedImage を記録`)
  console.log('[pop] 次: R2 へ上げる（asset-offload --group kindle-dist）→ KDP へ（kdp-publish --update-cover）')
}

if (args.adopt) await adopt(args.adopt)
else if (args.id) await generate(args.id)
else { console.error('使い方: --id <id> [--candidates N] ／ --adopt <id> --candidate <png> --review "<確かめたこと>"'); process.exit(2) }
