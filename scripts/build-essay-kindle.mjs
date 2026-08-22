// 技術士 建設部門 二次（記述式）模範解答マガジン（content/note/技術士建設部門/magazines/**）を
// Kindle 用 EPUB に変換する決定的ビルダー（Cシリーズ）。
// 択一(build-pe1-kindle)と別: essay は純散文(数式/図/択一なし)、note専用CTA節を除去する。
// markdown レンダラは scripts/lib/kindle-md.mjs を共有（択一ビルダーと同一ロジック）。
//
// 使い方:
//   node scripts/build-essay-kindle.mjs --spec scripts/kindle-specs/c-01.json
//
// spec スキーマ:
//   {
//     "bookId": "c-01", "title": "...", "subtitle": "...", "price": 690,
//     "examName": "技術士第二次試験",
//     "sources": ["content/note/技術士建設部門/magazines/BK-01_道路/R08-yosou/II-1/article.md", ...],
//     "frontMatter": "content/kindle/books/c-01/front-matter.md"  // 任意（出版時は必須）
//   }

import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { writeEpub, xhtmlDoc, xesc } from './lib/epub-writer.mjs'
import { mdToXhtml } from './lib/kindle-md.mjs'

const REPO = resolve(import.meta.dirname, '..')
const AUTHOR = 'doboku-note'
const PUBLISHER = 'doboku-note'
const DEFAULT_EXAM = '技術士第二次試験'
const creditBody = (examName) =>
  `公益社団法人 日本技術士会が実施する${examName}の過去問題を出典としています。問題文の著作権は同会に帰属します。模範解答・解説および編集・再構成は著者によるものです。`
const DISCLAIMER =
  '本書の模範解答は著者による一例であり、唯一の正解ではありません。法令・制度は改正されることがあるため、受験にあたっては必ず最新の一次情報をご確認ください。'

// Kindle に載せない note 専用セクション（見出し先頭一致で節ごと除去）。
const DEFAULT_DROP = [/^印刷用PDF/, /^必須科目Ⅰ?I? ?を全年度/, /^必須科目Ⅰ?I? ?の対策/]

function parseArgs(argv) {
  const a = { spec: null, outDir: null }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--spec') a.spec = argv[++i]
    else if (argv[i] === '--outDir') a.outDir = argv[++i]
  }
  if (!a.spec) throw new Error('--spec <scripts/kindle-specs/*.json> は必須')
  return a
}

function splitFrontmatter(raw) {
  // BOM(U+FEFF) と CRLF を先に均す。どちらも `^---\n` を外し、frontmatter が解析されないまま
  // 本文として印字され、章タイトルはファイル名（article.mdx）へフォールバックする。
  // 2026-08 に e-02/g-01/g-02 の配布 EPUB 全章で実発生（e-02 はその状態で審査に出ていた）。
  // BOM は目視できず、CRLF は Windows で作業すると working tree 全体に付く（既定 autocrlf）。
  const src = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const m = src.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) return { fm: {}, body: src }
  const fm = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '')
  }
  return { fm, body: src.slice(m[0].length) }
}

// essay 中のインライン markdown リンクは大半がサイト(doboku-note.com / 相対 /docs, /posts)への
// クロス参照で、Kindle では死にリンク。旧実装は https しか処理せず①相対リンクが生漏れ②「詳しくは
// [X](url)をご覧ください。」型がテキスト断片として残る、を QA で検出。以下で網羅的に除去する。
// サイト判定 = doboku-note.com の絶対 URL、または / で始まる相対パス（/docs, /posts 等）。
// essay の inline リンクは全て doboku-note サイトへのクロス参照（絶対 https / 相対 /docs /posts /
// 裸スラッグ pe-construction-… の3形式が混在）で、Kindle では死にリンク。URL 形式で判定すると裸
// スラッグを取りこぼす（R05-R07 で QA 検出）ため、URL は問わず「リンクを含む文」を対象に除去する。
function stripLinks(body) {
  return body
    // (1) 誘導の一文（「…[X](url)をご覧ください/を参照/で詳述/で解説…。」）を文ごと除去
    .replace(/[^。\n]*!?\[[^\]]*\]\([^)]*\)[^。\n]*(?:をご覧ください|を参照|ご参照|で詳述|で解説)[^。\n]*。/g, '')
    // (2) 文末 trailing 参照（「…。[X](url)」）は句点で閉じる
    .replace(/。\s*!?\[[^\]]*\]\([^)]*\)/g, '。')
    // (3) 画像リンク !\[alt](url) は essay レンダラ非対応 → 丸ごと除去（先頭 ! も含む）
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // (4) 残るインライン markdown リンクはテキスト化
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    // (5) 剥き身 URL 除去
    .replace(/(^|\s)https?:\/\/\S+/g, '$1')
}

// 総監模範論文は note マーケ CTA を本文に混在させる（## 見出しでなく **bold** 疑似見出しの
// 末尾フッター＋インライン CTA 文）ため、dropSections(##)/stripLinks(リンク) では拾えない。
// フッター切り詰め＋CTA 行除去で対処する（QA が全 F 70ファイルで検出）。
function stripNoteCta(body) {
  let out = body
  // (1) 末尾の note 商品フッター（**doboku-note の関連ガイド**〜 以降）を切り詰め
  const m = out.match(/\n?(?:---[^\S\n]*\n[^\S\n]*)?\*\*(?:doboku-note の関連ガイド|magazine セット販売|あわせて揃えたい共通装備)/)
  if (m) out = out.slice(0, m.index)
  // (1b) マーカー付き CTA ブロック（wire-note-paid-cta.mjs が機械挿入する
  //      `<!-- cta:xxx -->` + 案内文 + note URL）を丸ごと除去。
  //      マーカーと案内文は「note」も価格も含まないので (2) の語句フィルタを素通りし、
  //      Kindle 本文に note 誘導が残る（2026-08-03 に f-08 の再ビルドで発覚）。
  {
    const lines = out.split('\n')
    const kept = []
    for (let i = 0; i < lines.length; i++) {
      if (!/^\s*<!--\s*cta:[\w-]+\s*-->\s*$/.test(lines[i])) { kept.push(lines[i]); continue }
      // CTA の直前に置かれた区切りも一緒に落とす（残すと孤立 <hr/> になる）
      while (kept.length && /^\s*$/.test(kept[kept.length - 1])) kept.pop()
      if (kept.length && /^\s*---+\s*$/.test(kept[kept.length - 1])) kept.pop()
      // マーカー行から note URL 行までを捨てる。URL が無い形もありうるので上限を切る。
      let j = i + 1
      const limit = Math.min(lines.length, i + 7)
      while (j < limit && !/note\.com\//.test(lines[j])) j++
      i = j < limit ? j : i   // URL が見つからなければマーカー行だけ捨てる
    }
    out = kept.join('\n')
  }
  // (2) インライン note CTA 行を除去（価格・完全パック・R8予想誘導・magazine 案内・note.com）
  out = out.split('\n').filter((l) =>
    !/もあわせてご覧ください|「完全パック」|magazine ¥|magazine セット|単品[^\S\n]*[:：]|21%OFF|｜note|note\.com/.test(l),
  ).join('\n')
  // (3) CTA 除去で生じた連続区切り/空行を整理し、末尾の孤立区切りを落とす
  out = out.replace(/(?:^|\n)---[^\S\n]*(?=\n[^\S\n]*---)/g, '').replace(/\n{3,}/g, '\n\n').replace(/(?:\n[^\S\n]*---[^\S\n]*)+[\s]*$/, '\n')
  return out
}

// note 専用 CTA 節を除去。## 見出しが drop パターンに一致したら次の ## / # / EOF まで捨てる。
function stripNoteSections(body, dropRes) {
  const lines = body.split('\n')
  const out = []
  let skipping = false
  for (const line of lines) {
    const h2 = line.match(/^## (.+)$/)
    if (h2) {
      skipping = dropRes.some((re) => re.test(h2[1].trim()))
      if (skipping) continue
    } else if (/^# /.test(line) && skipping) {
      skipping = false // 上位見出しで解除
    }
    if (!skipping) out.push(line)
  }
  return out.join('\n')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const spec = JSON.parse(readFileSync(resolve(REPO, args.spec), 'utf8'))
  const outDir = args.outDir || spec.outDir || resolve(REPO, `.tmp/kindle-${spec.bookId}`)
  mkdirSync(outDir, { recursive: true })
  const dropRes = (spec.dropSections || []).map((s) => new RegExp(s)).concat(DEFAULT_DROP)

  const pages = []
  // 扉
  pages.push({
    id: 'p-title', href: 'p-title.xhtml', label: '扉',
    content: xhtmlDoc(spec.title,
      `<div class="cover-title"><h1>${xesc(spec.title)}</h1>
<p class="sub">― ${xesc(spec.subtitle)} ―</p>
<p class="author">${xesc(AUTHOR)}</p></div>`),
  })
  // 出典・免責
  pages.push({
    id: 'p-credit', href: 'p-credit.xhtml', label: '出典・免責',
    content: xhtmlDoc('出典・免責',
      `<div class="front"><h1>出典・免責</h1>
<p class="credit"><strong>出典</strong><br/>${xesc(creditBody(spec.examName || DEFAULT_EXAM))}</p>
<p class="credit"><strong>免責</strong><br/>${xesc(DISCLAIMER)}</p>
<p class="credit"><strong>著者</strong>　${xesc(AUTHOR)}<br/><strong>発行</strong>　${xesc(PUBLISHER)}</p></div>`),
  })
  // 書き下ろし前付け（任意）
  if (spec.frontMatter) {
    const fmPath = resolve(REPO, spec.frontMatter)
    if (existsSync(fmPath)) {
      const { body } = splitFrontmatter(readFileSync(fmPath, 'utf8'))
      pages.push({
        id: 'p-front', href: 'p-front.xhtml', label: 'はじめに',
        content: xhtmlDoc('はじめに', `<div class="front">${mdToXhtml(stripLinks(stripNoteSections(body, dropRes)))}</div>`),
      })
    } else {
      console.warn(`WARN: 書き下ろし前付けが未作成: ${spec.frontMatter}`)
    }
  }

  // 各記事 = 1章
  let chap = 0
  for (const srcRel of spec.sources) {
    const srcPath = resolve(REPO, srcRel)
    const { fm, body } = splitFrontmatter(readFileSync(srcPath, 'utf8'))
    const cleaned = stripLinks(stripNoteCta(stripNoteSections(body, dropRes)))
    chap++
    const id = `chap-${String(chap).padStart(2, '0')}`
    const label = fm.theme || fm.coverTitle || basename(resolve(srcPath, '..'))
    pages.push({
      id, href: `${id}.xhtml`, label,
      content: xhtmlDoc(label, `<div class="essay">${mdToXhtml(cleaned)}</div>`),
    })
  }

  const resources = []
  const epubPath = writeEpub(
    {
      meta: {
        title: `${spec.title} ― ${spec.subtitle}`,
        author: AUTHOR,
        publisher: PUBLISHER,
        description: spec.description ||
          `${spec.examName || DEFAULT_EXAM}「${spec.title}」の模範解答集。`,
        rights: creditBody(spec.examName || DEFAULT_EXAM),
      },
      css: ESSAY_CSS,
      pages,
      resources,
    },
    { outDir, fileName: `${spec.bookId}.epub` },
  )
  console.log(`書籍: ${spec.title}（${spec.bookId}）`)
  console.log(`収録: ${spec.sources.length} 記事 / 出力: ${epubPath}`)
}

const ESSAY_CSS = `
body { font-family: serif; line-height: 1.8; margin: 0 4%; }
h1 { font-size: 1.4em; line-height: 1.4; margin: 1em 0 0.8em;
  border-bottom: 2px solid #1a4a6e; padding-bottom: 0.3em; color: #123a58; break-before: page; page-break-before: always; }
h1:first-of-type, .front h1, .cover-title h1 { break-before: auto; page-break-before: auto; }
h2 { font-size: 1.15em; margin: 1.4em 0 0.6em; padding: 0.3em 0.5em;
  background: #eef4f9; border-left: 4px solid #1a4a6e; color: #123a58; }
h3 { font-size: 1.05em; margin: 1.2em 0 0.5em; color: #123a58; }
p { margin: 0 0 0.7em; }
ul { margin: 0 0 1em; padding-left: 1.2em; }
li { margin-bottom: 0.4em; }
ol.opts { margin: 0.4em 0 0.7em; padding-left: 1.5em; }
table.tbl { border-collapse: collapse; margin: 0.7em 0; font-size: 0.95em; }
table.tbl td { border: 1px solid #b9cddd; padding: 0.3em 0.5em; }
blockquote { margin: 0.5em 0 0.9em; padding: 0.2em 0.8em; border-left: 3px solid #9db8cc; color: #444; }
.cover-title { text-align: center; margin-top: 25%; }
.cover-title h1 { border: none; font-size: 1.7em; }
.cover-title .sub { font-size: 1.15em; margin-top: 0.5em; }
.cover-title .author { margin-top: 3em; font-size: 1.1em; }
.front { margin-top: 1.5em; }
.credit { font-size: 0.95em; line-height: 1.9; }
`

main()
