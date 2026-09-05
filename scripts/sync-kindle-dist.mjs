// Kindle 配布物(EPUB＋表紙)を catalog に基づいて再生成し、git 追跡下の scripts/kindle-dist/ へ同期する。
// EPUB は各 buildSpec または A 系の buildTheme から決定的に再ビルドし、表紙は cover spec から再合成する。
// これにより「EPUB/表紙を git 管理しつつ、いつでも spec から再現できる」状態を担保する。
//
// 使い方:
//   node scripts/sync-kindle-dist.mjs             # ready 状態の全新刊(B-F)のみ再ビルド→kindle-dist へ
//                                                  # （live/in_review は保護のため skip。id 明示時は status を問わない）
//   node scripts/sync-kindle-dist.mjs --downloads # 併せて ~/Downloads/kindle-<id>.(epub|cover.jpg) も更新
//   node scripts/sync-kindle-dist.mjs e-01 d-01   # 指定 id のみ（status を問わず再ビルド）

import { execFileSync } from 'node:child_process'
import { readFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { homedir } from 'node:os'
import { artifactRelPaths, selectSyncTargets } from './lib/kindle-catalog.mjs'

const REPO = resolve(import.meta.dirname, '..')
const DIST = resolve(REPO, 'scripts/kindle-dist')
const DL = resolve(homedir(), 'Downloads')
mkdirSync(DIST, { recursive: true })

const args = process.argv.slice(2)
const toDownloads = args.includes('--downloads')
const ids = args.filter((a) => !a.startsWith('--'))

const cat = JSON.parse(readFileSync(resolve(REPO, 'scripts/kindle-published/catalog.json'), 'utf8'))
// 対象選定ロジック（id 無指定時は live/in_review を保護）は scripts/lib/kindle-catalog.mjs に
// 一本化し、tests/kindle-sync-targets.test.mjs で回帰を固定する（実行系はここに置かない）。
const { targets, skipped } = selectSyncTargets(cat.books, ids)
if (skipped.length) {
  console.log(`保護のため skip（live/in_review 等 ${skipped.length} 冊。id 明示で再ビルド可）: ${skipped.map((b) => b.id).join(' ')}`)
}
const books = targets

const node = process.execPath
let done = 0
for (const b of books) {
  const id = b.id
  const outDir = resolve(REPO, `.tmp/kindle-${id}`)
  // 1) EPUB 再ビルド。A 系は catalog の buildTheme、B-G 系は buildSpec を使う。
  let epub
  if (b.buildSpec) {
    execFileSync(node, [resolve(REPO, b.builder), '--spec', resolve(REPO, b.buildSpec)], { cwd: REPO, stdio: 'ignore' })
    epub = resolve(outDir, `${id}.epub`)
  } else {
    execFileSync(node, [resolve(REPO, b.builder), '--theme', b.buildTheme, '--format', 'epub', '--outDir', outDir], { cwd: REPO, stdio: 'ignore' })
    epub = resolve(outDir, `${b.buildTheme}.epub`)
  }
  if (!existsSync(epub)) { console.error(`EPUB 生成失敗: ${id}`); continue }
  const rel = artifactRelPaths(b)
  const epubDest = rel.epub ? resolve(REPO, rel.epub) : resolve(DIST, `${id}.epub`)
  mkdirSync(dirname(epubDest), { recursive: true })
  copyFileSync(epub, epubDest)
  // 2) 表紙 再合成
  const exactCoverSpec = resolve(REPO, `scripts/kindle-covers/specs/${id}.json`)
  const lowerCoverSpec = resolve(REPO, `scripts/kindle-covers/specs/${id.toLowerCase()}.json`)
  const coverSpec = existsSync(exactCoverSpec) ? exactCoverSpec : lowerCoverSpec
  if (existsSync(coverSpec)) {
    const cover = resolve(outDir, `${id}.jpg`)
    execFileSync(node, [resolve(REPO, 'scripts/kindle-covers/build-kindle-cover.mjs'), '--spec', coverSpec, '--out', cover], { cwd: REPO, stdio: 'ignore' })
    if (existsSync(cover)) {
      const coverDest = rel.cover ? resolve(REPO, rel.cover) : resolve(DIST, `${id}.jpg`)
      mkdirSync(dirname(coverDest), { recursive: true })
      copyFileSync(cover, coverDest)
    }
  }
  // 3) 任意で Downloads へ（アップロード用の分かりやすい名前）
  if (toDownloads) {
    copyFileSync(epubDest, resolve(DL, `kindle-${id}.epub`))
    if (rel.cover && existsSync(resolve(REPO, rel.cover))) copyFileSync(resolve(REPO, rel.cover), resolve(DL, `kindle-cover-${id}.jpg`))
  }
  done++
  process.stdout.write(`${id} `)
}
console.log(`\n同期完了: ${done} 冊 → catalog の配布先${toDownloads ? '＋ ~/Downloads/' : ''}`)
