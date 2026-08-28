// Kindle 配布物(EPUB＋表紙)を catalog に基づいて再生成し、git 追跡下の scripts/kindle-dist/ へ同期する。
// EPUB は各 buildSpec から決定的に再ビルド、表紙は cover spec から再合成。任意で ~/Downloads へも配置。
// これにより「EPUB/表紙を git 管理しつつ、いつでも spec から再現できる」状態を担保する。
//
// 使い方:
//   node scripts/sync-kindle-dist.mjs             # ready 状態の全新刊(B-F)のみ再ビルド→kindle-dist へ
//                                                  # （live/in_review は保護のため skip。id 明示時は status を問わない）
//   node scripts/sync-kindle-dist.mjs --downloads # 併せて ~/Downloads/kindle-<id>.(epub|cover.jpg) も更新
//   node scripts/sync-kindle-dist.mjs e-01 d-01   # 指定 id のみ（status を問わず再ビルド）

import { execFileSync } from 'node:child_process'
import { readFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

const REPO = resolve(import.meta.dirname, '..')
const DIST = resolve(REPO, 'scripts/kindle-dist')
const DL = resolve(homedir(), 'Downloads')
mkdirSync(DIST, { recursive: true })

const args = process.argv.slice(2)
const toDownloads = args.includes('--downloads')
const ids = args.filter((a) => !a.startsWith('--'))

const cat = JSON.parse(readFileSync(resolve(REPO, 'scripts/kindle-published/catalog.json'), 'utf8'))
// buildSpec を持つ＝新刊(B-F)。id 指定があれば絞る。
let books = cat.books.filter((b) => b.buildSpec)
if (ids.length) {
  books = books.filter((b) => ids.includes(b.id))
} else {
  // id 無指定の全冊モードは live/in_review を上書きしない（審査中の再提出誘発・
  // LIVE と Git の実体乖離を防ぐ安全弁）。id を明示すれば status を問わず再ビルドできる。
  const skipped = books.filter((b) => b.status !== 'ready')
  if (skipped.length) {
    console.log(`保護のため skip（live/in_review 等 ${skipped.length} 冊。id 明示で再ビルド可）: ${skipped.map((b) => b.id).join(' ')}`)
  }
  books = books.filter((b) => b.status === 'ready')
}

const node = process.execPath
let done = 0
for (const b of books) {
  const id = b.id
  // 1) EPUB 再ビルド（builder は spec の場所を outDir 既定 .tmp/kindle-<id>/ に出す）
  execFileSync(node, [resolve(REPO, b.builder), '--spec', resolve(REPO, b.buildSpec)], { cwd: REPO, stdio: 'ignore' })
  const epub = resolve(REPO, `.tmp/kindle-${id}/${id}.epub`)
  if (!existsSync(epub)) { console.error(`EPUB 生成失敗: ${id}`); continue }
  copyFileSync(epub, resolve(DIST, `${id}.epub`))
  // 2) 表紙 再合成
  const coverSpec = resolve(REPO, `scripts/kindle-covers/specs/${id}.json`)
  if (existsSync(coverSpec)) {
    execFileSync(node, [resolve(REPO, 'scripts/kindle-covers/build-kindle-cover.mjs'), '--spec', coverSpec], { cwd: REPO, stdio: 'ignore' })
    const cover = resolve(REPO, `.tmp/kindle-cover-${id}.jpg`)
    if (existsSync(cover)) copyFileSync(cover, resolve(DIST, `${id}.jpg`))
  }
  // 3) 任意で Downloads へ（アップロード用の分かりやすい名前）
  if (toDownloads) {
    copyFileSync(resolve(DIST, `${id}.epub`), resolve(DL, `kindle-${id}.epub`))
    if (existsSync(resolve(DIST, `${id}.jpg`))) copyFileSync(resolve(DIST, `${id}.jpg`), resolve(DL, `kindle-cover-${id}.jpg`))
  }
  done++
  process.stdout.write(`${id} `)
}
console.log(`\n同期完了: ${done} 冊 → scripts/kindle-dist/${toDownloads ? '＋ ~/Downloads/' : ''}`)
