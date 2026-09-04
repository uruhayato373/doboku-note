// 択一過去問 MDX（content/site/**）を note 有料記事の添付用 A4 PDF に変換する決定的ビルダー。
// Kindle 版（build-pe1-kindle.mjs / build-takuitsu-reconstruct.mjs）と同じ原稿ソースを、
// note PDF 販売（従チャネル）向けに紙面レイアウトで書き出す。真実源: content/kindle/strategy.md
//
// 使い方:
//   node scripts/build-takuitsu-pdf.mjs --spec scripts/kindle-specs/e-01.json [--out <path.pdf>]
//   node scripts/build-takuitsu-pdf.mjs --spec scripts/kindle-specs/e-01.json --sample   # 冒頭数問の見本PNG
//
// Kindle 版との差分:
//   - 出力は EPUB でなく A4 PDF（Playwright chromium page.pdf・Mac 安定＝generate-anki-pdf.mjs と同経路）
//   - 画像は同梱でなく base64 data URI 埋め込み（単一 HTML → PDF）
//   - 解答は改ページせず問題直後に配置（紙面演習用。EPUB のネタバレ防止改ページは不要）
//   - MDX→XHTML 変換ロジック（preprocess/mdToXhtml/ExamPoint/年度スコープ画像/sanitizeMathml）は
//     build-pe1-kindle.mjs から複製（共通 lib 化は前回 mdToXhtml 統合で回帰したため意図的に避ける）

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, basename, dirname, join } from 'node:path'
import { chromium } from 'playwright'
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs'

const REPO = resolve(import.meta.dirname, '..')
const AUTHOR = 'doboku-note'
const DEFAULT_EXAM = '技術士第一次試験'
const DEFAULT_ISSUER = '公益社団法人 日本技術士会'
const creditBody = (examName, issuer = DEFAULT_ISSUER) =>
  `${issuer}が実施する${examName}の過去問題を出典としています。問題文の著作権は出典元に帰属します。解答・解説および複数年度の編集・再構成は著者によるものです。`
const DISCLAIMER =
  '本書は正確を期して作成していますが、内容を保証するものではありません。法令・制度は改正されることがあるため、受験にあたっては必ず最新の一次情報をご確認ください。'

function parseArgs(argv) {
  const a = { spec: null, out: null, sample: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--spec') a.spec = argv[++i]
    else if (argv[i] === '--out') a.out = argv[++i]
    else if (argv[i] === '--sample') a.sample = true
  }
  if (!a.spec) throw new Error('--spec <scripts/kindle-specs/*.json> は必須')
  return a
}

// ---- xml/html エスケープ（epub-writer.xesc と同等）--------------------------
const xesc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ---- frontmatter ----------------------------------------------------------
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

// ---- KaTeX → MathML（Chromium は MathML Core を描画）------------------------
let katexMod = null
function sanitizeMathml(html) {
  return html
    .replace(/<mo[^>]*>[⁡⁢⁣⁤]<\/mo>/g, '')
    .replace(/<mo([^>]*)>\s*<mrow>([\s\S]*?)<\/mrow>\s*<\/mo>/g,
      (_, attrs, inner) => `<mo${attrs}>${inner.replace(/<[^>]+>/g, '')}</mo>`)
    .replace(/(<(?:mtable|mtd)\b[^>]*?)\s+width="[^"]*"/g, '$1')
}
async function mathToMathml(src, displayMode) {
  if (!katexMod) katexMod = (await import('katex')).default
  const html = katexMod.renderToString(src, { output: 'mathml', displayMode, throwOnError: false })
  return sanitizeMathml(html)
}

// ---- MDX 前処理: コンポーネント・数式をトークン化 --------------------------
// トークンは私用領域文字 U+E000..U+E001 で番号を挟む。素の数字だと本文中の数字
// （No.1・年度・％・組合せ (1)(2) 等）が restoreTokens で画像等に誤置換され爆発するため
// （pe1 の素数字プレースホルダの潜在バグ。本ビルダーでは衝突不能なセンチネルで回避）。
const TOK = (i) => `${i}`
async function preprocess(body, images, imageSrc) {
  const tokens = []
  const push = (html) => { tokens.push(html); return TOK(tokens.length - 1) }
  let out = body

  // RelatedKeywords（サイト内リンク）は Kindle/PDF に不要 → 除去
  out = out.replace(/<RelatedKeywords[\s\S]*?\/>/g, '')

  // ArticleImage → img（webp/png は sharp で JPEG 化し base64 埋め込み）
  const imgTasks = []
  out = out.replace(/<ArticleImage\s+([\s\S]*?)\/>/g, (whole, props) => {
    const src = (props.match(/src="([^"]+)"/) || [])[1] || ''
    const alt = (props.match(/alt="([^"]*)"/) || [])[1] || ''
    // src は /posts/... のサイト絶対パス → R2 の object key は SITE_CONTENT_ROOT からの
    // 相対パスに posts/ を前置しただけなので、画像の実体（git 追跡下）を直接解決する。
    const local = resolve(SITE_CONTENT_ROOT, src.replace(/^\/posts\//, ''))
    // 年度スコープ付き href（合本で同名別図が黙って差し替わる事故を防止＝pe1 と同じ）
    const artId = basename(dirname(dirname(local)))
    const jpgName = basename(local).replace(/\.(webp|png|jpg|jpeg)$/i, '.jpg')
    const href = `img/${artId}-${jpgName}`
    imgTasks.push({ local, href })
    return push(`<div class="fig"><img src="${href}" alt="${xesc(alt)}"/></div>`)
  })

  // 素の <img src="/posts/..."> （civil-1 primary は ArticleImage でなく生 img 記法で図を埋め込む）
  // → ArticleImage と同じく sharp で JPEG base64 化。ArticleImage は既に TOKEN 化済みなので二重処理しない。
  out = out.replace(/<img\s+([^>]*?)\/>/g, (whole, props) => {
    const src = (props.match(/src="([^"]+)"/) || [])[1] || ''
    if (!src.startsWith('/posts/')) return whole // 外部/相対 URL はそのまま（埋め込み対象外）
    const alt = (props.match(/alt="([^"]*)"/) || [])[1] || ''
    const local = resolve(SITE_CONTENT_ROOT, src.replace(/^\/posts\//, ''))
    const artId = basename(dirname(dirname(local)))
    const jpgName = basename(local).replace(/\.(webp|png|jpg|jpeg)$/i, '.jpg')
    const href = `img/${artId}-${jpgName}`
    imgTasks.push({ local, href })
    return push(`<div class="fig"><img src="${href}" alt="${xesc(alt)}"/></div>`)
  })

  // 図キャプション等の生 <p className="..."> は最小 markdown レンダラが解釈できず生タグが漏れる
  // → キャプション段落へ変換（civil-1 primary は図の下に <p className="text-center">図 …</p> を置く）
  out = out.replace(/<p\s+className="[^"]*">([\s\S]*?)<\/p>/g, (whole, text) =>
    push(`<p class="figcap">${xesc(text.trim())}</p>`))

  // ExamPoint（インライン型）→ 要点ボックス
  out = out.replace(/<ExamPoint>([\s\S]*?)<\/ExamPoint>/g, (whole, text) =>
    push(`<div class="exampoint"><p class="ep-head"><strong>要点</strong>　${xesc(text.trim())}</p></div>`))
  // ExamPoint（自己終了 props 型）→ 要点ボックス
  out = out.replace(/<ExamPoint([\s\S]*?)\/>/g, (whole, props) => {
    const summary = (props.match(/summary="((?:[^"\\]|\\.)*)"/) || [])[1] || ''
    const itemsSrc = (props.match(/items=\{\[([\s\S]*?)\]\}/) || [])[1] || ''
    const items = [...itemsSrc.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1])
    const lis = items.map((t) => `<li>${xesc(t)}</li>`).join('')
    return push(`<div class="exampoint"><p class="ep-head"><strong>要点</strong>　${xesc(summary)}</p>${lis ? `<ul>${lis}</ul>` : ''}</div>`)
  })

  // details（解答・解説）→ 解答ブロック（PDF は改ページせず問題直後に置く）
  out = out
    .replace(/<details>\s*<summary>解答・解説<\/summary>/g, () =>
      push('<div class="ans"><p class="ans-head"><strong>解答・解説</strong></p>'))
    .replace(/<\/details>/g, () => push('</div>'))

  // KaTeX（block → inline）
  let hasMath = false
  for (const m of [...out.matchAll(/\$\$([\s\S]+?)\$\$/g)]) {
    hasMath = true
    out = out.replace(m[0], push(`<div class="math">${await mathToMathml(m[1], true)}</div>`))
  }
  for (const m of [...out.matchAll(/\$([^$\n]+?)\$/g)]) {
    hasMath = true
    out = out.replace(m[0], push(await mathToMathml(m[1], false)))
  }

  // 画像変換（sharp・年度スコープ href で一意・衝突は停止して機械検知）
  for (const t of imgTasks) {
    if (images.has(t.href)) {
      if (imageSrc.get(t.href) !== t.local)
        throw new Error(`画像 href 衝突: ${t.href} に別ファイル (${imageSrc.get(t.href)} vs ${t.local})`)
      continue
    }
    if (!existsSync(t.local)) throw new Error(`画像が見つからない: ${t.local}`)
    const { default: sharp } = await import('sharp')
    const buf = await sharp(t.local).flatten({ background: '#ffffff' }).jpeg({ quality: 82 }).toBuffer()
    images.set(t.href, `data:image/jpeg;base64,${buf.toString('base64')}`)
    imageSrc.set(t.href, t.local)
  }
  return { text: out, tokens, hasMath }
}

// ---- 最小 markdown → XHTML レンダラ（pe1 と同一）--------------------------
const inlineMd = (s) => xesc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
function mdToXhtml(text) {
  const lines = text.split('\n')
  const html = []
  let para = [], ul = [], ol = [], table = []
  const flushP = () => { if (para.length) { html.push(`<p>${para.map(inlineMd).join('<br/>')}</p>`); para = [] } }
  const flushUl = () => { if (ul.length) { html.push(`<ul>${ul.map((t) => `<li>${inlineMd(t)}</li>`).join('')}</ul>`); ul = [] } }
  const flushOl = () => { if (ol.length) { html.push(`<ol class="opts">${ol.map((t) => `<li>${inlineMd(t)}</li>`).join('')}</ol>`); ol = [] } }
  const flushTable = () => {
    if (!table.length) return
    const rows = table
      .filter((r) => !/^[|\s:-]+$/.test(r))
      .map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => `<td>${inlineMd(c.trim())}</td>`).join(''))
      .map((cells) => `<tr>${cells}</tr>`)
    html.push(`<table class="tbl">${rows.join('')}</table>`)
    table = []
  }
  const flush = () => { flushP(); flushUl(); flushOl(); flushTable() }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, '')
    if (!line.trim()) {
      const next = lines.slice(i + 1).map((l) => l.replace(/\s+$/, '')).find((l) => l.trim())
      flushP(); flushTable()
      if (!(next && /^\d+\.\s/.test(next))) flushOl()
      if (!(next && /^- /.test(next))) flushUl()
    }
    else if (/^\d+$/.test(line.trim())) { flush(); html.push(line.trim()) }
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
const restoreTokens = (html, tokens) => html.replace(/(\d+)/g, (_, i) => tokens[Number(i)])

// ---- 印刷 CSS（A4）--------------------------------------------------------
const PRINT_CSS = `
@page { size: A4 portrait; margin: 16mm 15mm 18mm; }
@page { @bottom-center { content: counter(page); font-size: 9px; color:#888; } }
* { box-sizing: border-box; }
body { font-family: "Hiragino Mincho ProN","Yu Mincho",serif; color:#111; line-height:1.65; margin:0; font-size:10.5pt; }
.cover { text-align:center; padding-top:55mm; break-after:page; }
.cover h1 { font-size:22pt; line-height:1.5; color:#0c3a5e; margin:0 0 8mm; border:none; }
.cover .sub { font-size:13pt; color:#33506b; margin:0 0 40mm; }
.cover .author { font-size:12pt; }
.front { break-after:page; }
.front h1 { font-size:15pt; color:#0c3a5e; border-bottom:2px solid #1d5a8a; padding-bottom:2mm; }
.credit { font-size:9.5pt; color:#333; line-height:1.9; margin:0 0 5mm; }
h1.year { font-size:16pt; color:#0c3a5e; border-bottom:3px solid #1d5a8a; padding-bottom:2mm;
  margin:0 0 4mm; break-before:page; }
h2 { font-size:11pt; color:#0c3a5e; background:#e8f0f7; border-left:4px solid #1d5a8a;
  padding:2mm 3mm; margin:5mm 0 2mm; break-after:avoid; break-inside:avoid; }
h3 { font-size:10.5pt; color:#0c3a5e; margin:3mm 0 1.5mm; }
p { margin:0 0 1.5mm; }
ul { margin:0 0 2mm; padding-left:5mm; }
ol.opts { margin:1mm 0 2mm; padding-left:6mm; }
ol.opts li, ul li { margin-bottom:1mm; }
.ans { background:#f4f8f4; border-left:3px solid #2f7a3e; padding:2mm 3mm; margin:2mm 0 4mm;
  break-inside:avoid; }
.ans-head { margin:0 0 1.5mm; }
.exampoint { background:#fbf6ec; border:1px solid #d9c48f; border-radius:3px; padding:2mm 3mm; margin:2mm 0; break-inside:avoid; }
.ep-head { margin:0 0 1mm; }
.fig { text-align:center; margin:3mm 0; break-inside:avoid; }
.fig img { max-width:100%; }
.figcap { text-align:center; font-size:8.5pt; color:#555; margin:1mm 0 3mm; }
.math { text-align:center; margin:2mm 0; }
table.tbl { border-collapse:collapse; margin:2mm 0; font-size:9.5pt; }
table.tbl td { border:1px solid #bbb; padding:1mm 2mm; }
.worksheet { break-after:page; }
.worksheet h1 { font-size:16pt; color:#0c3a5e; border-bottom:3px solid #1d5a8a; padding-bottom:2mm; margin:0 0 4mm; }
.worksheet h2 { margin-top:4mm; }
.worksheet .lead { font-size:9pt; color:#444; margin-bottom:3mm; }
.sheet-table { width:100%; border-collapse:collapse; font-size:9pt; margin:2mm 0 4mm; }
.sheet-table th,.sheet-table td { border:1px solid #999; padding:1.5mm 2mm; height:8mm; }
.sheet-table th { background:#e8f0f7; color:#0c3a5e; }
.sheet-table .qno { width:9mm; text-align:center; font-weight:bold; }
.sheet-table .marks { white-space:nowrap; letter-spacing:.7mm; }
blockquote { margin:1.5mm 0; padding:1mm 3mm; border-left:3px solid #9db8cc; color:#444; }
hr { border:none; border-top:1px solid #ddd; margin:3mm 0; }
`

function answerGrid(title, count, note) {
  const columns = 3
  const rows = Math.ceil(count / columns)
  const head = Array.from({ length: columns }, () => '<th>No.</th><th>解答</th>').join('')
  const body = Array.from({ length: rows }, (_, row) => {
    const cells = Array.from({ length: columns }, (_, column) => {
      const number = row + column * rows + 1
      return number <= count
        ? `<td class="qno">${number}</td><td class="marks">□1 □2 □3 □4 □5</td>`
        : '<td></td><td></td>'
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')
  return `<h2>${title}</h2><p class="lead">${note}</p><table class="sheet-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

function buildStudySheets(spec) {
  if (spec.studySheets !== 'pe-first-stage') return ''
  const blanks = Array.from({ length: 7 }, () => '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('')
  return `<section class="worksheet"><h1>11週間の学習計画・周回記録</h1>
<table class="sheet-table"><thead><tr><th>時期</th><th>学習対象</th><th>完了条件</th></tr></thead><tbody>
<tr><td>11〜9週前</td><td>専門科目 245問・1周目</td><td>得意分野と捨て候補を分ける</td></tr>
<tr><td>8〜7週前</td><td>基礎科目 210問・1周目</td><td>5群すべての弱点を特定する</td></tr>
<tr><td>6週前</td><td>適性科目 105問・1周目</td><td>技術士法・倫理の誤り肢を説明する</td></tr>
<tr><td>5〜4週前</td><td>3科目の誤答だけ2周目</td><td>誤答原因を4分類する</td></tr>
<tr><td>3〜2週前</td><td>年度別・本番時間で演習</td><td>各科目の基準点を安定して超える</td></tr>
<tr><td>1週前</td><td>誤答・法令・公式だけ確認</td><td>再誤答を潰す</td></tr></tbody></table>
<h2>周回記録</h2><p class="lead">誤答原因は「知識不足・読違い・計算ミス・時間切れ」のいずれかへ印を付け、次回確認日を決めます。</p>
<table class="sheet-table"><thead><tr><th>日付</th><th>年度・科目</th><th>採点数</th><th>正答数</th><th>知識</th><th>読違い</th><th>計算</th><th>時間</th><th>次回</th></tr></thead><tbody>${blanks}</tbody></table></section>
<section class="worksheet"><h1>答案記入シート｜基礎・適性</h1>
${answerGrid('基礎科目（全30問から各群3問・計15問を選択）', 30, '解答した15問の番号だけ記入し、未選択問題は空欄にします。')}
${answerGrid('適性科目（全15問必須）', 15, '15問すべてに解答します。')}</section>
<section class="worksheet"><h1>答案記入シート｜専門科目（建設部門）</h1>
${answerGrid('専門科目（全35問から25問を選択）', 35, '解答した25問の番号だけ記入し、未選択10問は空欄にします。')}</section>`
}

async function renderSources(spec, images, imageSrc) {
  const chapters = []
  let qTotal = 0, mathChaps = 0
  for (const srcRel of spec.sources) {
    const raw = readFileSync(resolve(REPO, srcRel), 'utf8')
    const { fm, body } = splitFrontmatter(raw)
    const label = fm.shortTitle || fm.title || basename(srcRel)
    const pre = await preprocess(body, images, imageSrc)
    const qCount = (body.match(/^## /gm) || []).length
    qTotal += qCount
    if (pre.hasMath) mathChaps++
    const inner = `<h1 class="year">${xesc(label)}（${qCount}問）</h1>\n` + restoreTokens(mdToXhtml(pre.text), pre.tokens)
    chapters.push(inner)
  }
  return { chapters, qTotal, mathChaps }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const spec = JSON.parse(readFileSync(resolve(REPO, args.spec), 'utf8'))
  for (const k of ['bookId', 'title', 'subtitle', 'sources']) {
    if (!spec[k]) throw new Error(`spec に ${k} がありません`)
  }
  const images = new Map(), imageSrc = new Map()
  const { chapters, qTotal, mathChaps } = await renderSources(spec, images, imageSrc)

  const examName = spec.examName || DEFAULT_EXAM
  const coverHtml = `<div class="cover"><h1>${xesc(spec.title)}</h1>
<p class="sub">― ${xesc(spec.subtitle)} ―</p><p class="author">${xesc(AUTHOR)}</p></div>`
  const creditHtml = `<div class="front"><h1>出典・免責</h1>
<p class="credit"><strong>出典</strong><br/>${xesc(creditBody(examName, spec.creditIssuer))}</p>
<p class="credit"><strong>免責</strong><br/>${xesc(DISCLAIMER)}</p>
<p class="credit"><strong>著者・発行</strong>　${xesc(AUTHOR)}</p></div>`

  let bodyHtml = coverHtml + creditHtml + buildStudySheets(spec) + chapters.join('\n')
  // 画像 href → base64 data URI に差し替え（単一 HTML 埋め込み）
  for (const [href, dataUri] of images) bodyHtml = bodyHtml.split(`src="${href}"`).join(`src="${dataUri}"`)

  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${xesc(spec.title)}</title>
<style>${PRINT_CSS}</style></head><body>${bodyHtml}</body></html>`

  const outPath = resolve(REPO, args.out || `.tmp/note-pdf/${spec.bookId}.pdf`)
  mkdirSync(dirname(outPath), { recursive: true })
  const htmlPath = outPath.replace(/\.pdf$/, '.html')
  writeFileSync(htmlPath, html)

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    // 大量の設問＋base64画像で HTML が巨大化するため setContent でなく file:// goto。
    // waitUntil は 'load'（画像描画完了）、タイムアウトは余裕を持って 180s。
    await page.goto(`file://${htmlPath}`, { waitUntil: 'load', timeout: 180000 })
    if (args.sample) {
      // 見本 PNG: 先頭章の冒頭のみ（販売ページ掲載用・A4 上部を切り出し）
      const pngPath = outPath.replace(/\.pdf$/, '-sample.png')
      await page.setViewportSize({ width: 900, height: 1180 })
      await page.evaluate(() => { document.querySelectorAll('.cover,.front').forEach((e) => e.remove()) })
      await page.screenshot({ path: pngPath })
      console.log(`[sample] ${pngPath}`)
    } else {
      await page.pdf({ path: outPath, format: 'A4', printBackground: true, preferCSSPageSize: true })
      console.log(`書籍: ${spec.title} ― ${spec.subtitle}（${spec.bookId}）`)
      console.log(`収録: ${spec.sources.length} 章 / ${qTotal} 問 / 画像 ${images.size} 点 / 数式章 ${mathChaps}`)
      console.log(`出力: ${outPath}`)
    }
  } finally {
    await browser.close()
  }
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
