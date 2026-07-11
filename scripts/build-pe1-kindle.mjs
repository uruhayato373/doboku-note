// 技術士第一次試験の完全解説 MDX（.local/r2/posts/pe-first-stage/**）を
// 科目別7年分合本の Kindle 用 EPUB に変換する決定的ビルダー（Dシリーズ）。
// 戦略・価格の真実源: docs/project/01_戦略/08_Kindle出版戦略.md
//
// 使い方:
//   node scripts/build-pe1-kindle.mjs --spec scripts/kindle-specs/d-02.json
//     --outDir <dir>（spec の outDir を上書き。既定 .tmp/kindle-<bookId>）
//
// spec スキーマ:
//   {
//     "bookId": "d-02", "title": "...", "subtitle": "...", "price": 390,
//     "sources": [".local/r2/posts/pe-first-stage/r01-aptitude/article.mdx", ...],
//     "frontMatter": "docs/kindle/d-02/front-matter.md"   // 書き下ろし前付け（任意だが出版時は必須）
//   }
//
// MDX → XHTML 変換:
//   <details><summary>解答・解説</summary> → <div class="ans">（break-before:page でネタバレ防止）
//   <ExamPoint summary items>             → 要点ボックス <div class="exampoint">
//   <ArticleImage src(.webp)>             → sharp で JPEG 変換し OEBPS/img/ に同梱
//   KaTeX $...$ / $$...$$                 → katex renderToString({output:'mathml'}) を埋込
//   markdown（見出し/番号付き選択肢/箇条書き/表/引用）→ 最小レンダラで XHTML 化

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve, basename, dirname } from 'node:path'
import { writeEpub, xhtmlDoc, xesc } from './lib/epub-writer.mjs'

const REPO = resolve(import.meta.dirname, '..')

const AUTHOR = 'doboku-note'
const PUBLISHER = 'doboku-note'
// 出典クレジットは spec.examName（試験名）と spec.creditIssuer（実施団体）で切替。
// 技術士系＝日本技術士会・第一次/第二次試験、施工管理技士＝全国建設研修センター等。
const DEFAULT_EXAM = '技術士第一次試験'
const DEFAULT_ISSUER = '公益社団法人 日本技術士会'
const creditBody = (examName, issuer = DEFAULT_ISSUER) =>
  `${issuer}が実施する${examName}の過去問題を出典としています。問題文の著作権は出典元に帰属します。解答・解説および科目別・複数年度の編集・再構成は著者によるものです。`
const DISCLAIMER =
  '本書は正確を期して作成していますが、内容を保証するものではありません。法令・制度は改正されることがあるため、受験にあたっては必ず最新の一次情報をご確認ください。'

function parseArgs(argv) {
  const a = { spec: null, outDir: null }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--spec') a.spec = argv[++i]
    else if (argv[i] === '--outDir') a.outDir = argv[++i]
  }
  if (!a.spec) throw new Error('--spec <scripts/kindle-specs/*.json> は必須')
  return a
}

// ---- frontmatter ----------------------------------------------------------
function splitFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) return { fm: {}, body: raw }
  const fm = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '')
  }
  return { fm, body: raw.slice(m[0].length) }
}

// ---- KaTeX → MathML（遅延 import: 数式ゼロの科目では katex 不要）----------
let katexMod = null
// KaTeX は関数適用（\max, \log 等）の後ろに不可視演算子 U+2061(⁡)/U+2062(⁢) を挿入する。
// これが msub/msup（子は正確に2つ）の3つ目の子になると MathML が構文不正になり
// epubcheck RSC-005（"要素 mrow/mo をここに書いてはいけません"）で落ちる（D-01 で実発生）。
// 不可視演算子は視覚的に無なので除去する＝子数が正され、レンダリングは不変。
function sanitizeMathml(html) {
  return html
    // (1) 不可視演算子 U+2061..2064 を除去（msub/msup の3つ目の子で構文不正になる）
    .replace(/<mo[^>]*>[⁡⁢⁣⁤]<\/mo>/g, '')
    // (2) 多文字演算子（\bmod 等）で KaTeX が <mo><mrow><mi>..</mi>..</mrow></mo> を出すが
    //     <mo> はテキストのみ許容。内側のタグを剥がしてテキスト化する（例: mod）。
    .replace(/<mo([^>]*)>\s*<mrow>([\s\S]*?)<\/mrow>\s*<\/mo>/g,
      (_, attrs, inner) => `<mo${attrs}>${inner.replace(/<[^>]+>/g, '')}</mo>`)
    // (3) mtable/mtd の width 属性は EPUB3 MathML の content model で不許可（RSC-005）。
    //     KaTeX が \begin{array} 等で width="100%" を出す。除去（レイアウトは CSS 側）。
    //     width が正当な mspace には触れない。
    .replace(/(<(?:mtable|mtd)\b[^>]*?)\s+width="[^"]*"/g, '$1')
}
async function mathToMathml(src, displayMode) {
  if (!katexMod) katexMod = (await import('katex')).default
  const html = katexMod.renderToString(src, { output: 'mathml', displayMode, throwOnError: false })
  return sanitizeMathml(html)
}

// ---- MDX 前処理: コンポーネント・数式をトークン化 --------------------------
// トークンは私用領域文字で挟み、xesc を素通りさせた後に実マークアップへ復元する
const TOK = (i) => `${i}`

async function preprocess(body, articleDir, images, imageSrc) {
  const tokens = []
  const push = (html) => {
    tokens.push(html)
    return TOK(tokens.length - 1)
  }

  let out = body

  // サイト専用 MDX コンポーネントで Kindle に不要なものは丸ごと除去。
  // RelatedKeywords（関連キーワードリンク）は items={[...]} を含む自己完結タグで、
  // 未処理だと解説末尾に生の JSX/JSON が露出する（全 D/B 本で漏出を QA が検出）。
  out = out.replace(/<RelatedKeywords[\s\S]*?\/>/g, '')

  // ArticleImage → img（webp は sharp で JPEG 化して同梱）
  const imgRe = /<ArticleImage\s+([\s\S]*?)\/>/g
  const imgTasks = []
  out = out.replace(imgRe, (whole, props) => {
    const src = (props.match(/src="([^"]+)"/) || [])[1] || ''
    const alt = (props.match(/alt="([^"]*)"/) || [])[1] || ''
    // src は /posts/... のサイト絶対パス → .local/r2 配下の実ファイルへ解決
    const local = resolve(REPO, '.local/r2', src.replace(/^\//, ''))
    // 年度スコープ付き href。合本/科目別合本は年度をまたいで同名の別図（q3-5-fig.jpg 等）を
    // 持つため、basename のみだと後年度の図が先年度の図に黙って差し替わる（実害を QA で検出）。
    // 記事ディレクトリ名（r01-basic 等）を前置して一意化する。
    const artId = basename(dirname(dirname(local))) // .../r01-basic/img/x.webp → r01-basic
    const jpgName = basename(local).replace(/\.(webp|png|jpg|jpeg)$/i, '.jpg')
    const href = `img/${artId}-${jpgName}`
    imgTasks.push({ local, href })
    return push(`<div class="fig"><img src="${href}" alt="${xesc(alt)}"/></div>`)
  })

  // ExamPoint（インライン型 <ExamPoint>一文</ExamPoint>）→ 要点ボックス。
  // 2級土木 primary 等で使用。props 自己終了型より先に処理し greedy 誤マッチを防ぐ。
  out = out.replace(/<ExamPoint>([\s\S]*?)<\/ExamPoint>/g, (whole, text) =>
    push(`<div class="exampoint"><p class="ep-head"><strong>要点</strong>　${xesc(text.trim())}</p></div>`))

  // ExamPoint（自己終了 props 型 <ExamPoint summary= items= />）→ 要点ボックス
  out = out.replace(/<ExamPoint([\s\S]*?)\/>/g, (whole, props) => {
    const summary = (props.match(/summary="((?:[^"\\]|\\.)*)"/) || [])[1] || ''
    const itemsSrc = (props.match(/items=\{\[([\s\S]*?)\]\}/) || [])[1] || ''
    const items = [...itemsSrc.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1])
    const lis = items.map((t) => `<li>${xesc(t)}</li>`).join('')
    return push(
      `<div class="exampoint"><p class="ep-head"><strong>要点</strong>　${xesc(summary)}</p>${lis ? `<ul>${lis}</ul>` : ''}</div>`,
    )
  })

  // details（解答・解説）→ 改ページ付き解答ブロック
  out = out
    .replace(/<details>\s*<summary>解答・解説<\/summary>/g, () =>
      push('<div class="ans"><p class="ans-head"><strong>解答・解説</strong></p>'))
    .replace(/<\/details>/g, () => push('</div>'))

  // KaTeX（block → inline の順）
  let hasMath = false
  const blocks = [...out.matchAll(/\$\$([\s\S]+?)\$\$/g)]
  for (const m of blocks) {
    hasMath = true
    out = out.replace(m[0], push(`<div class="math">${await mathToMathml(m[1], true)}</div>`))
  }
  const inlines = [...out.matchAll(/\$([^$\n]+?)\$/g)]
  for (const m of inlines) {
    hasMath = true
    out = out.replace(m[0], push(await mathToMathml(m[1], false)))
  }

  // 画像変換（sharp・重複 href は1回だけ）。href は年度スコープ付きで一意なので、
  // 同一 href の再登場は同一図の再参照のみ。異なる実ファイルが同一 href に来たら
  // 衝突事故なので停止して機械検知する（無音上書きの再発防止）。
  for (const t of imgTasks) {
    if (images.has(t.href)) {
      if (imageSrc.get(t.href) !== t.local) {
        throw new Error(`画像 href 衝突: ${t.href} に別ファイルが写像 (${imageSrc.get(t.href)} vs ${t.local})`)
      }
      continue
    }
    if (!existsSync(t.local)) throw new Error(`画像が見つからない: ${t.local}`)
    const { default: sharp } = await import('sharp')
    const buf = await sharp(t.local).flatten({ background: '#ffffff' }).jpeg({ quality: 88 }).toBuffer()
    images.set(t.href, buf)
    imageSrc.set(t.href, t.local)
  }

  return { text: out, tokens, hasMath }
}

// ---- 最小 markdown → XHTML レンダラ ---------------------------------------
const inlineMd = (s) => xesc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

function mdToXhtml(text) {
  const lines = text.split('\n')
  const html = []
  let para = []
  let ul = []
  let ol = []
  let table = []
  const flushP = () => { if (para.length) { html.push(`<p>${para.map(inlineMd).join('<br/>')}</p>`); para = [] } }
  const flushUl = () => { if (ul.length) { html.push(`<ul>${ul.map((t) => `<li>${inlineMd(t)}</li>`).join('')}</ul>`); ul = [] } }
  const flushOl = () => { if (ol.length) { html.push(`<ol class="opts">${ol.map((t) => `<li>${inlineMd(t)}</li>`).join('')}</ol>`); ol = [] } }
  const flushTable = () => {
    if (!table.length) return
    const rows = table
      .filter((r) => !/^\|[\s:-]+\|/.test(r.replace(/\|/g, '|')))
      .filter((r) => !/^[|\s:-]+$/.test(r))
      .map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => `<td>${inlineMd(c.trim())}</td>`).join(''))
      .map((cells) => `<tr>${cells}</tr>`)
    html.push(`<table class="tbl">${rows.join('')}</table>`)
    table = []
  }
  const flush = () => { flushP(); flushUl(); flushOl(); flushTable() }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) {
      // 空行: 段落・表は閉じる。ただしリスト(ol/ul)は次の非空行が同種リストの続きなら
      // 閉じない。原稿は選択肢間に空行を挟む loose list で、閉じると各項目が別 <ol> 化し
      // 番号が毎回 1 にリセットされる（全選択肢が「1.」表示になる実害を QA で検出）。
      const next = lines.slice(i + 1).map((l) => l.replace(/\s+$/, '')).find((l) => l.trim())
      flushP(); flushTable()
      if (!(next && /^\d+\.\s/.test(next))) flushOl()
      if (!(next && /^- /.test(next))) flushUl()
    }
    else if (/^\d+$/.test(line.trim())) { flush(); html.push(line.trim()) } // トークン単独行
    else if (/^### /.test(line)) { flush(); html.push(`<h3>${inlineMd(line.slice(4))}</h3>`) }
    else if (/^## /.test(line)) { flush(); html.push(`<h2>${inlineMd(line.slice(3))}</h2>`) }
    else if (/^# /.test(line)) { flush(); html.push(`<h1>${inlineMd(line.slice(2))}</h1>`) }
    else if (/^---+$/.test(line)) { flush(); html.push('<hr/>') }
    else if (/^\|.*\|$/.test(line)) { flushP(); flushUl(); flushOl(); table.push(line) }
    else if (/^> /.test(line)) { flush(); html.push(`<blockquote>${inlineMd(line.slice(2))}</blockquote>`) }
    else if (/^- /.test(line)) { flushP(); flushOl(); flushTable(); ul.push(line.slice(2)) }
    else if (/^\d+\.\s/.test(line)) { flushP(); flushUl(); flushTable(); ol.push(line.replace(/^\d+\.\s/, '')) }
    else { flushUl(); flushOl(); flushTable(); para.push(line) }
  }
  flush()
  return html.join('\n')
}

function restoreTokens(html, tokens) {
  return html.replace(/(\d+)/g, (_, i) => tokens[Number(i)])
}

// ---- EPUB CSS --------------------------------------------------------------
const EPUB_CSS = `
body { font-family: serif; line-height: 1.7; margin: 0 4%; }
h1 { font-size: 1.5em; line-height: 1.4; margin: 1em 0 0.8em;
  border-bottom: 3px solid #1d5a8a; padding-bottom: 0.3em; color: #0c3a5e; }
h2 { font-size: 1.15em; margin: 1.4em 0 0.6em; padding: 0.3em 0.5em;
  background: #e8f0f7; border-left: 4px solid #1d5a8a; color: #0c3a5e;
  break-before: page; page-break-before: always; }
h3 { font-size: 1.05em; margin: 1.2em 0 0.5em; color: #0c3a5e; }
p { margin: 0 0 0.6em; }
ul { margin: 0 0 1em; padding-left: 1.2em; }
li { margin-bottom: 0.4em; }
ol.opts { margin: 0.4em 0 0.6em; padding-left: 1.6em; }
ol.opts li { margin-bottom: 0.3em; }
.ans { background: #f4f8f4; border-left: 3px solid #2f7a3e; padding: 0.3em 0.6em 0.5em;
  break-before: page; page-break-before: always; }
.ans-head { margin: 0.2em 0 0.5em; }
.exampoint { background: #fbf6ec; border: 1px solid #d9c48f; border-radius: 4px;
  padding: 0.4em 0.7em; margin: 0.6em 0; }
.ep-head { margin: 0 0 0.3em; }
.fig { text-align: center; margin: 0.8em 0; }
.fig img { max-width: 100%; }
.math { text-align: center; margin: 0.6em 0; }
table.tbl { border-collapse: collapse; margin: 0.6em 0; }
table.tbl td { border: 1px solid #bbb; padding: 0.25em 0.5em; }
blockquote { margin: 0.4em 0 0.8em; padding: 0.2em 0.8em; border-left: 3px solid #9db8cc;
  color: #444; }
.cover-title { text-align: center; margin-top: 25%; }
.cover-title h1 { border: none; font-size: 1.7em; color: #0c3a5e; }
.cover-title .sub { font-size: 1.2em; margin-top: 0.5em; }
.cover-title .author { margin-top: 3em; font-size: 1.1em; }
.front { margin-top: 2em; }
.front h1 { border-bottom: none; }
.front h2 { break-before: auto; page-break-before: auto; }
.credit { font-size: 0.9em; color: #444; line-height: 1.9; }
hr { border: none; border-top: 1px solid #ddd; margin: 1em 0; }
`

// =====================================================================
async function main() {
  const args = parseArgs(process.argv.slice(2))
  const spec = JSON.parse(readFileSync(resolve(REPO, args.spec), 'utf8'))
  for (const k of ['bookId', 'title', 'subtitle', 'sources']) {
    if (!spec[k]) throw new Error(`spec に ${k} がありません`)
  }

  const outDir = resolve(REPO, args.outDir || spec.outDir || `.tmp/kindle-${spec.bookId}`)
  mkdirSync(outDir, { recursive: true })

  const images = new Map() // href -> Buffer(JPEG)
  const imageSrc = new Map() // href -> local path（衝突検知用）
  const pages = []

  // 扉・出典
  pages.push({
    id: 'p-title', href: 'p-title.xhtml', label: '扉',
    content: xhtmlDoc(spec.title,
      `<div class="cover-title"><h1>${xesc(spec.title)}</h1>
<p class="sub">― ${xesc(spec.subtitle)} ―</p>
<p class="author">${xesc(AUTHOR)}</p></div>`),
  })
  pages.push({
    id: 'p-credit', href: 'p-credit.xhtml', label: '出典・免責',
    content: xhtmlDoc('出典・免責',
      `<div class="front"><h1>出典・免責</h1>
<p class="credit"><strong>出典</strong><br/>${xesc(creditBody(spec.examName || DEFAULT_EXAM, spec.creditIssuer))}</p>
<p class="credit"><strong>免責</strong><br/>${xesc(DISCLAIMER)}</p>
<p class="credit"><strong>著者</strong>　${xesc(AUTHOR)}<br/>
<strong>発行</strong>　${xesc(PUBLISHER)}</p></div>`),
  })

  // 書き下ろし前付け（KDP 差別化の中核。無い場合は警告して続行 = QA が FAIL にする）
  if (spec.frontMatter) {
    const fmPath = resolve(REPO, spec.frontMatter)
    if (existsSync(fmPath)) {
      const { body } = splitFrontmatter(readFileSync(fmPath, 'utf8'))
      const pre = await preprocess(body, null, images, imageSrc)
      pages.push({
        id: 'p-front', href: 'p-front.xhtml', label: 'はじめに・出題傾向と学習ガイド',
        content: xhtmlDoc('はじめに', `<div class="front">${restoreTokens(mdToXhtml(pre.text), pre.tokens)}</div>`),
      })
    } else {
      console.warn(`WARN: 書き下ろし前付けが未作成: ${spec.frontMatter}（出版前に kindle-book-composer で作成すること）`)
    }
  } else {
    console.warn('WARN: spec に frontMatter が無い（書き下ろしゼロは KDP 差別化を欠く。出版前に必ず追加）')
  }

  // 年度章
  let mathPages = 0
  let qTotal = 0
  for (const [i, srcRel] of spec.sources.entries()) {
    const srcPath = resolve(REPO, srcRel)
    const raw = readFileSync(srcPath, 'utf8')
    const { fm, body } = splitFrontmatter(raw)
    const label = fm.shortTitle || fm.title || basename(srcRel)
    const articleDir = resolve(srcPath, '..')

    const pre = await preprocess(body, articleDir, images, imageSrc)
    const qCount = (body.match(/^## /gm) || []).length
    qTotal += qCount
    if (pre.hasMath) mathPages++

    const inner = `<h1>${xesc(label)}（${qCount}問）</h1>\n` + restoreTokens(mdToXhtml(pre.text), pre.tokens)
    pages.push({
      id: `chap-${String(i + 1).padStart(2, '0')}`,
      href: `chap-${String(i + 1).padStart(2, '0')}.xhtml`,
      label: `${label}（${qCount}問）`,
      content: xhtmlDoc(label, inner),
      properties: pre.hasMath ? 'mathml' : undefined,
    })
  }

  const resources = [...images.entries()].map(([href, data], i) => ({
    id: `img-${String(i + 1).padStart(3, '0')}`,
    href,
    mediaType: 'image/jpeg',
    data,
  }))

  const epubPath = writeEpub(
    {
      meta: {
        title: `${spec.title} ― ${spec.subtitle}`,
        author: AUTHOR,
        publisher: PUBLISHER,
        description: spec.description ||
          `${spec.examName || DEFAULT_EXAM}「${spec.subtitle}」の過去問を複数年度収録し全問解説した演習書。`,
        rights: creditBody(spec.examName || DEFAULT_EXAM, spec.creditIssuer),
      },
      css: EPUB_CSS,
      pages,
      resources,
    },
    { outDir, fileName: `${spec.bookId}.epub` },
  )

  console.log(`書籍: ${spec.title} ― ${spec.subtitle}（${spec.bookId}）`)
  console.log(`収録: ${spec.sources.length} 年度分 / ${qTotal} 問 / 画像 ${resources.length} 点 / MathML 章 ${mathPages}`)
  console.log(`出力: ${epubPath}`)
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})
