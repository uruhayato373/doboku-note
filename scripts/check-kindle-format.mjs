#!/usr/bin/env node
// EPUB 書式インバリアント検査（全 Kindle シリーズ共通・読み取り専用）
//
// なぜ必要か:
//   A シリーズで決めた書式ルール（本文の可読性・章の改ページ・解答のネタバレ改ページ）は
//   各ビルダー（build-takuitsu-reconstruct.mjs / build-pe1-kindle.mjs）に別々の CSS/構造として
//   コピー実装されており、共有 SSOT も検査も無い（h2 が 1.2em→1.15em に微ドリフト等）。
//   epubcheck は EPUB 仕様の妥当性しか見ず、ハウスルールは検査しない。
//
// 重要な設計判断:
//   A と D は「解答を別ページにする」を別方式で実現する。
//     A = 問題と解答を別 XHTML ファイル（cNN-qNNN.xhtml / cNN-qNNNa.xhtml）に分割（構造的改ページ）
//     D = 1ページ内で .ans に break-before:page（CSS 改ページ）
//   よって「.ans に break-before があるか」という CSS 文字列検査は A を誤検知する。
//   本検査は CSS ではなく UX 不変条件（outcome）を判定する。
//
// 検査する不変条件:
//   R1 可読性     : style.css の body に font-family と line-height >= 1.5
//   R2 章の分離   : 各章が改ページ境界で始まる（章が別 spine ファイル or 見出しに break-before:page）
//   R3 解答の分離 : 解答が改ページ境界で始まる（別 *a.xhtml spine or 解答コンテナに break-before:page）
//
// 使い方:
//   node scripts/check-kindle-format.mjs                       # scripts/kindle-published/*.epub を全検査
//   node scripts/check-kindle-format.mjs .tmp/kindle-d-02/*.epub  # 指定 EPUB を検査（ビルド直後の入稿前チェック）
//
// 終了コード: 全 PASS=0 / 1つでも FAIL=1

import { execSync } from 'node:child_process'
import { readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

const MIN_LINE_HEIGHT = 1.5

function listEntries(epub) {
  return execSync(`unzip -Z1 ${JSON.stringify(epub)}`, { encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean)
}
function readEntry(epub, name) {
  try {
    return execSync(`unzip -p ${JSON.stringify(epub)} ${JSON.stringify(name)}`, {
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    })
  } catch {
    return ''
  }
}

function checkEpub(epub) {
  const fails = []
  const entries = listEntries(epub)
  const cssName = entries.find((e) => /\/style\.css$/.test(e) || /(^|\/)style\.css$/.test(e))
  const xhtmls = entries.filter((e) => /\.xhtml$/.test(e))
  const css = cssName ? readEntry(epub, cssName) : ''

  // --- R1 可読性 --------------------------------------------------------
  if (!css) {
    fails.push('R1: style.css が見つからない')
  } else {
    const bodyRule = (css.match(/body\s*\{([^}]*)\}/i) || [, ''])[1]
    if (!/font-family\s*:/.test(bodyRule)) fails.push('R1: body に font-family 指定が無い')
    const lh = parseFloat((bodyRule.match(/line-height\s*:\s*([\d.]+)/i) || [])[1])
    if (!(lh >= MIN_LINE_HEIGHT)) {
      fails.push(`R1: body の line-height が ${isNaN(lh) ? '未指定' : lh}（>= ${MIN_LINE_HEIGHT} 必須）`)
    }
  }

  const hasBreakBefore = /break-before\s*:\s*page|page-break-before\s*:\s*always/i.test(css)
  // 解答/章コンテナ名（A=別ファイル方式では空、D=インライン方式で使う）
  const ansClassBreaks = /\.ans\b[^{]*\{[^}]*(break-before\s*:\s*page|page-break-before\s*:\s*always)/i.test(css)
  const h2Breaks = /h2\b[^{]*\{[^}]*(break-before\s*:\s*page|page-break-before\s*:\s*always)/i.test(css)

  // 別ファイル方式の検出（A スタイル）
  const answerFiles = xhtmls.filter((e) => /q\d+a\.xhtml$/i.test(basename(e)))
  const chapterFiles = xhtmls.filter((e) => /(^|\/)(chap|chapter)[-_]?\d+\.xhtml$/i.test(e))
  const questionFiles = xhtmls.filter((e) => /q\d+\.xhtml$/i.test(basename(e)) && !/q\d+a\.xhtml$/i.test(basename(e)))

  // --- R2 章の分離 ------------------------------------------------------
  const chapterSeparated = chapterFiles.length > 0 || h2Breaks
  if (!chapterSeparated) {
    fails.push('R2: 章が改ページ境界で始まっていない（章別 spine も h2 の break-before:page も無い）')
  }

  // --- R4 選択肢の連番（loose list 崩れ検出）----------------------------
  // 原稿が選択肢間に空行を挟む loose list のとき、パーサーが各選択肢を別 <ol> にすると
  // 番号が毎回 1 にリセットされ全選択肢が「1.」表示になる（epubcheck は通る沈黙バグ）。
  // 症状＝単一 <li> の <ol class="opts"> が連続する。正常時はこの連鎖は起きない。
  const optRun = /(?:<ol class="opts"><li>[^<]*<\/li><\/ol>\s*){4,}/
  for (const e of xhtmls) {
    if (optRun.test(readEntry(epub, e))) {
      fails.push(`R4: ${basename(e)} で単一項目の <ol class="opts"> が連続（選択肢番号が全て「1.」にリセットされる loose list 崩れ）`)
      break
    }
  }

  // --- R3 解答の分離（ネタバレ防止）-------------------------------------
  let answerSeparated = false
  let mode = ''
  if (answerFiles.length > 0) {
    // A 方式: 問題数と解答ファイル数が概ね一致していれば構造的に分離
    answerSeparated = true
    mode = `別ファイル方式（解答 ${answerFiles.length} / 問題 ${questionFiles.length}）`
    if (questionFiles.length > 0 && answerFiles.length < questionFiles.length) {
      fails.push(`R3: 解答ファイル数(${answerFiles.length}) < 問題ファイル数(${questionFiles.length}) — 一部の解答が同ページに残っている疑い`)
      answerSeparated = false
    }
  } else if (ansClassBreaks) {
    // D 方式: .ans に break-before:page、かつ本文で .ans を実使用
    const usesAns = xhtmls.some((e) => /class="ans"|class="[^"]*\bans\b/.test(readEntry(epub, e)))
    answerSeparated = usesAns
    mode = 'インライン方式（.ans break-before:page）'
    if (!usesAns) fails.push('R3: .ans に改ページ指定はあるが本文で .ans が使われていない')
  } else {
    fails.push('R3: 解答が改ページ境界で始まっていない（別 *a.xhtml も .ans break-before:page も無い＝ネタバレ懸念）')
  }

  return { epub: basename(epub), fails, mode, hasBreakBefore }
}

// --- エントリポイント ---------------------------------------------------
const args = process.argv.slice(2)
let targets = args
if (targets.length === 0) {
  const dir = join(process.cwd(), 'scripts/kindle-published')
  targets = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.epub')).map((f) => join(dir, f))
    : []
}
targets = targets.filter((t) => existsSync(t))

if (targets.length === 0) {
  console.log('[check-kindle-format] 検査対象の EPUB が見つからない')
  process.exit(0)
}

let failed = 0
for (const epub of targets.sort()) {
  const r = checkEpub(epub)
  if (r.fails.length === 0) {
    console.log(`✓ ${r.epub}  [${r.mode}]`)
  } else {
    failed++
    console.log(`✗ ${r.epub}`)
    for (const f of r.fails) console.log(`    - ${f}`)
  }
}
console.log(`\n[check-kindle-format] ${targets.length - failed}/${targets.length} PASS`)
process.exit(failed > 0 ? 1 : 0)
