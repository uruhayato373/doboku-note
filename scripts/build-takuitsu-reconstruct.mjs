// 択一過去問を「年度別」ではなく「論点別」に再構成した教材ソースを生成する試作
// ジェネレータ。1 ソースから note 用（Markdown / 印刷 HTML）と Kindle 用（EPUB）を出す。
//
// 生の年度別過去問（サイトで無料公開中・無料代替も飽和）との差別化として、
//   1) 同一テーマの択一を H26〜R07 で横断集約（出題パターンが体で分かる）
//   2) テーマ冒頭に「論点まとめ」= 正しい知識(○解説)を体系化（暗記特化）
//   3) 同一趣旨の反復問題を圧縮（編集された教材としての価値）
// を付与する。入力は build-time 済みの構造化全問 JSON。
//
// 使い方:
//   node scripts/build-takuitsu-reconstruct.mjs --theme anzen [--format both]
//     --format md | epub | both（既定 both）
//     --outDir <dir>（既定 .tmp/takuitsu-<theme>）
//
// 出力:
//   <outDir>/article.md   note 貼付用 SoT（Markdown）
//   <outDir>/print.html   印刷用 HTML（Chrome で PDF 保存 → note PDF 販売用）
//   <outDir>/<theme>.epub Kindle 入稿用 EPUB（KDP にアップロード）
//
// 図版に依存する設問（「下図」等を含む body）は、JSON に画像が無いため自動除外する。

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { writeEpub, xhtmlDoc, xesc, xinline } from './lib/epub-writer.mjs'

const REPO = resolve(import.meta.dirname, '..')

// ---- 著者・出版者・出典クレジット（src/config/author.ts と整合）-----------
const AUTHOR = '架（かける）'
const PUBLISHER = 'doboku-note'
// 1級/2級土木は試験実施機関のクレジット表示で過去問を使用する
const CREDIT_BODY =
  '一般財団法人 全国建設研修センターが実施する土木施工管理技術検定（第一次検定）の過去問題を出典としています。問題文の著作権は同センターに帰属します。解答・解説および論点別の編集・再構成は著者によるものです。'
const DISCLAIMER =
  '本書は正確を期して作成していますが、内容を保証するものではありません。法令・基準は改正されることがあるため、受験にあたっては必ず最新の一次情報をご確認ください。'

// ---- テーマ定義（試作は安全管理1本。追加時はここに足す）------------------
const THEMES = {
  anzen: {
    key: 'anzen',
    label: '安全管理',
    examLabel: '1級土木施工管理技士 第1次検定',
    examOrg: '全国建設研修センター',
    src: 'src/config/civil-1-exam-questions.json',
    include:
      /安全|墜落|足場|労働災害|酸素欠乏|クレーン|玉掛け|型枠支保工|土止め|土留め|明り|地山|崩壊|建設機械|架空線|感電|有機溶剤|粉じん|保護具|ずい道.*(安全|換気)|作業主任者|安全衛生/,
    subtopics: [
      { key: 'scaffold', label: '足場・墜落・高所作業', re: /足場|墜落|高さ|安全帯|要求性能墜落制止|手すり|作業床|親綱/ },
      { key: 'excavation', label: '明り掘削・土止め支保工', re: /掘削|土止め|土留め|明り|地山|崩壊|のり面|法面/ },
      { key: 'formwork', label: '型枠支保工', re: /型枠支保工|支保工/ },
      { key: 'machine', label: '車両系建設機械・締固め機械', re: /車両系建設機械|建設機械|締固め機械|アタッチメント|ブルドーザ|バックホゥ|解体用機械/ },
      { key: 'crane', label: '移動式クレーン・玉掛け', re: /クレーン|玉掛け|つり上げ|定格荷重|ジブ/ },
      { key: 'tunnel', label: 'ずい道等の建設作業', re: /ずい道|トンネル/ },
      { key: 'health', label: '酸欠・有害物・環境衛生', re: /酸素欠乏|有機溶剤|粉じん|騒音|振動|有害|石綿|アスベスト/ },
      { key: 'electric', label: '感電・架空線・電気', re: /感電|架空線|電気|充電|アーク/ },
      { key: 'org', label: '安全衛生管理体制・点検・教育', re: /.*/ }, // 受け皿
    ],
  },
}

function parseArgs(argv) {
  const a = { theme: 'anzen', outDir: null, format: 'both' }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--theme') a.theme = argv[++i]
    else if (argv[i] === '--outDir') a.outDir = argv[++i]
    else if (argv[i] === '--format') a.format = argv[++i]
  }
  return a
}

const YEAR_LABEL = (y) => (y.startsWith('h') ? `H${y.slice(1)}` : `R${y.slice(1)}`)

// 図版に依存する設問（画像なしでは成立しない）を検出
const FIGURE_RE = /下図|次図|次の図|下記の図|上図|図のように|図に示す|右図|左図/

// 正規化（重複検出・論点まとめの dedupe 用）
const norm = (s) =>
  (s || '')
    .replace(/\s+/g, '')
    .replace(/[，、．。･・()（）「」『』【】［］\[\]"'`*＊]/g, '')
    .replace(/[0-9０-９]+/g, '#')

function assignSubtopic(theme, q) {
  const hay = [q.body, ...(q.options || []).map((o) => o.text)].join(' ')
  for (const st of theme.subtopics) if (st.re.test(hay)) return st.key
  return theme.subtopics[theme.subtopics.length - 1].key
}

// 論点まとめ: ○解説（正しい知識）を集約し、近重複を圧縮して箇条書き化
function buildRonten(questions) {
  const seen = new Set()
  const bullets = []
  for (const q of questions) {
    for (const e of q.optionExplanations || []) {
      if (!e.correct) continue
      let t = (e.text || '').trim()
      if (t.length < 12) continue
      t = t.replace(/\s+/g, '').replace(/[。.]$/, '')
      const k = norm(t).slice(0, 28)
      if (seen.has(k)) continue
      seen.add(k)
      bullets.push(t)
    }
  }
  return bullets
}

const correctPoint = (q) => {
  const ce = (q.optionExplanations || []).find((e) => e.num === q.correct)
  return ce ? ce.text.replace(/\s+/g, '').replace(/[。.]$/, '') : ''
}

// ---- モデル構築（チャネル非依存の中間表現）--------------------------------
function buildModel(theme, questions) {
  const usable = questions.filter((q) => !FIGURE_RE.test(q.body))
  const figureSkipped = questions.length - usable.length

  const buckets = new Map(theme.subtopics.map((s) => [s.key, []]))
  for (const q of usable) buckets.get(assignSubtopic(theme, q)).push(q)

  let dupCompressed = 0
  let rendered = 0
  const chapters = []
  let n = 0
  for (const st of theme.subtopics) {
    const arr = buckets.get(st.key)
    if (!arr.length) continue
    arr.sort((a, b) => (a.year < b.year ? -1 : a.year > b.year ? 1 : a.no - b.no))

    const usedBody = new Map()
    const items = []
    for (const q of arr) {
      const bk = norm(q.body)
      if (usedBody.has(bk)) {
        usedBody.get(bk).dupYears.push(YEAR_LABEL(q.year))
        dupCompressed++
        continue
      }
      const item = { q, dupYears: [] }
      usedBody.set(bk, item)
      items.push(item)
      rendered++
    }
    n++
    chapters.push({
      n,
      key: st.key,
      label: st.label,
      ronten: buildRonten(arr).slice(0, 18),
      items,
    })
  }
  return {
    theme,
    title: `${theme.examLabel} 択一・論点別トレーニング`,
    subtitle: theme.label,
    chapters,
    stats: { extracted: questions.length, figureSkipped, dupCompressed, rendered },
  }
}

// =====================================================================
// Markdown / 印刷 HTML レンダラ（note 用）
// =====================================================================
function renderMarkdown(model) {
  const t = model.theme
  const fm = [
    '---',
    `title: "${model.title} ― ${model.subtitle}"`,
    'notePricing: paid',
    'noteSeries: "1級土木 択一・論点別トレーニング"',
    'published: false',
    '---',
    '',
  ].join('\n')

  const out = [fm, `# ${model.title} ― ${model.subtitle}`, '']
  out.push(
    [
      `本書は ${t.examLabel}「${t.label}」の択一過去問（H26〜R07）を、`,
      '**年度別ではなく論点別**に解体・再構成した暗記特化教材です。同じ論点の問題を',
      '年度をまたいで連続演習することで「どこが繰り返し問われるか」が体で分かります。',
      '各論点の冒頭に、過去問の正答選択肢から抽出した**「論点まとめ（覚える正しい知識）」**を',
      '配置しました。生の年度別過去問では得られない、横断・体系化された一冊です。',
    ].join('\n'),
  )
  out.push('')
  out.push(`> ${CREDIT_BODY}`)
  out.push('')

  for (const ch of model.chapters) {
    out.push(`## ${ch.n}. ${ch.label}`, '')
    if (ch.ronten.length) {
      out.push('### 論点まとめ（覚える正しい知識）', '')
      for (const b of ch.ronten) out.push(`- ${b}`)
      out.push('')
    }
    out.push(`### 一問一答（${ch.items.length} 問・H26〜R07）`, '')
    for (const { q, dupYears } of ch.items) {
      const tag = `${YEAR_LABEL(q.year)} ${q.part}-${String(q.no).padStart(2, '0')}`
      out.push(`**［${tag}］** ${q.body}`, '')
      out.push((q.options || []).map((o) => `${o.num}. ${o.text}`).join('\n'), '')
      out.push(`**正答 ${q.correct}** ― ${correctPoint(q)}`)
      if (dupYears.length) out.push('', `> 同趣旨で再出題: ${dupYears.join(' / ')}`)
      out.push('', '---', '')
    }
  }
  return out.join('\n')
}

const PRINT_CSS = `
  @page { size: A4; margin: 16mm 15mm 18mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family:"Yu Gothic","YuGothic","Meiryo",sans-serif;
    font-size:10pt; line-height:1.7; color:#1a1a1a; margin:0; }
  h1 { font-size:16pt; line-height:1.45; border-bottom:2px solid #b5651d;
    padding-bottom:8px; margin:0 0 16px; color:#7a3e0c; }
  h2 { font-size:13pt; background:#fbf0e4; border-left:5px solid #b5651d;
    padding:6px 10px; margin:0 0 12px; color:#7a3e0c;
    break-before:page; page-break-before:always; }
  h2:first-of-type { break-before:auto; page-break-before:auto; }
  h3 { font-size:11.5pt; color:#7a3e0c; border-bottom:1px solid #e2cdb8;
    padding-bottom:3px; margin:18px 0 9px; }
  p { margin:0 0 7px; }
  strong { font-weight:700; color:#14202b; }
  ul { margin:0 0 11px; padding-left:1.3em; }
  li { margin-bottom:4px; }
  blockquote { margin:4px 0 8px; padding:2px 10px; border-left:3px solid #d9b48f;
    background:#fbf6f0; color:#555; font-size:9pt; }
  hr { border:none; border-top:1px solid #e0d3c4; margin:12px 0; }
`

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

function mdToHtml(md) {
  const lines = md.split('\n')
  const html = []
  let para = []
  let list = []
  const flushP = () => {
    if (para.length) { html.push(`<p>${para.map(inline).join('<br/>')}</p>`); para = [] }
  }
  const flushList = () => {
    if (list.length) { html.push(`<ul>${list.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`); list = [] }
  }
  const flush = () => { flushP(); flushList() }
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) flush()
    else if (/^### /.test(line)) { flush(); html.push(`<h3>${inline(line.slice(4))}</h3>`) }
    else if (/^## /.test(line)) { flush(); html.push(`<h2>${inline(line.slice(3))}</h2>`) }
    else if (/^# /.test(line)) { flush(); html.push(`<h1>${inline(line.slice(2))}</h1>`) }
    else if (/^---$/.test(line)) { flush(); html.push('<hr/>') }
    else if (/^> /.test(line)) { flush(); html.push(`<blockquote>${inline(line.slice(2))}</blockquote>`) }
    else if (/^- /.test(line)) { flushP(); list.push(line.slice(2)) }
    else { flushList(); para.push(line) }
  }
  flush()
  return html.join('\n')
}

function renderPrintHtml(md, title) {
  const body = mdToHtml(md.replace(/^---[\s\S]*?---\n/, ''))
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`
}

// =====================================================================
// EPUB レンダラ（Kindle / KDP 用・リフロー）
// EPUB 組立（container/nav/ncx/opf/zip）は scripts/lib/epub-writer.mjs に共通化。
// ここではテーマ固有のページ（扉・出典・使い方・各章 XHTML）と CSS を組み立てる。
// =====================================================================
const EPUB_CSS = `
body { font-family: serif; line-height: 1.7; margin: 0 4%; }
h1 { font-size: 1.5em; line-height: 1.4; margin: 1em 0 0.8em;
  border-bottom: 3px solid #b5651d; padding-bottom: 0.3em; color: #7a3e0c; }
h2 { font-size: 1.2em; margin: 1.4em 0 0.6em; padding: 0.3em 0.5em;
  background: #fbf0e4; border-left: 4px solid #b5651d; color: #7a3e0c; }
p { margin: 0 0 0.6em; }
ul { margin: 0 0 1em; padding-left: 1.2em; }
li { margin-bottom: 0.4em; }
ol.opts { margin: 0.4em 0 0.6em; padding-left: 1.4em; }
ol.opts li { margin-bottom: 0.3em; }
.tag { font-weight: bold; color: #7a3e0c; }
.qbody { margin-top: 1em; }
.ans { background: #f4f8f4; border-left: 3px solid #2f7a3e; padding: 0.3em 0.6em;
  break-before: page; page-break-before: always; }
.dup { font-size: 0.85em; color: #666; }
.cover-title { text-align: center; margin-top: 25%; }
.cover-title h1 { border: none; font-size: 1.9em; color: #7a3e0c; }
.cover-title .sub { font-size: 1.3em; margin-top: 0.5em; }
.cover-title .author { margin-top: 3em; font-size: 1.1em; }
.front { margin-top: 2em; }
.front h1 { border-bottom: none; }
.credit { font-size: 0.9em; color: #444; line-height: 1.9; }
hr { border: none; border-top: 1px solid #ddd; margin: 1em 0; }
`

function chapterXhtml(model, ch) {
  const parts = [`<h1>${ch.n}. ${xesc(ch.label)}</h1>`]
  if (ch.ronten.length) {
    parts.push('<h2>論点まとめ（覚える正しい知識）</h2>')
    parts.push(`<ul>${ch.ronten.map((b) => `<li>${xinline(b)}</li>`).join('')}</ul>`)
  }
  parts.push(`<h2>一問一答（${ch.items.length} 問・H26〜R07）</h2>`)
  for (const { q, dupYears } of ch.items) {
    const tag = `${YEAR_LABEL(q.year)} ${q.part}-${String(q.no).padStart(2, '0')}`
    const opts = [...(q.options || [])]
      .sort((a, b) => a.num - b.num)
      .map((o) => `<li>${xinline(o.text)}</li>`)
      .join('')
    parts.push('<div class="q">')
    parts.push(`<p class="qbody"><span class="tag">［${xesc(tag)}］</span> ${xinline(q.body)}</p>`)
    parts.push(`<ol class="opts">${opts}</ol>`)
    parts.push(`<p class="ans"><strong>正答 ${q.correct}</strong> ― ${xinline(correctPoint(q))}</p>`)
    if (dupYears.length) parts.push(`<p class="dup">同趣旨で再出題: ${xesc(dupYears.join(' / '))}</p>`)
    parts.push('</div><hr/>')
  }
  return xhtmlDoc(`${ch.n}. ${ch.label}`, parts.join('\n'))
}

function renderEpub(model, outDir) {
  const t = model.theme

  // 前付け
  const titlePage = xhtmlDoc(model.title,
    `<div class="cover-title"><h1>${xesc(model.title)}</h1>
<p class="sub">― ${xesc(model.subtitle)} ―</p>
<p class="author">${xesc(AUTHOR)}</p></div>`)
  const creditPage = xhtmlDoc('出典・免責',
    `<div class="front"><h1>出典・免責</h1>
<p class="credit"><strong>出典</strong><br/>${xesc(CREDIT_BODY)}</p>
<p class="credit"><strong>免責</strong><br/>${xesc(DISCLAIMER)}</p>
<p class="credit"><strong>著者</strong>　${xesc(AUTHOR)}<br/>
<strong>発行</strong>　${xesc(PUBLISHER)}</p></div>`)
  const introPage = xhtmlDoc('本書の使い方',
    `<div class="front"><h1>本書の使い方</h1>
<p>本書は ${xesc(t.examLabel)}「${xesc(t.label)}」の択一過去問（H26〜R07）を、<strong>年度別ではなく論点別</strong>に解体・再構成した暗記特化教材です。</p>
<p>同じ論点の問題を年度をまたいで連続演習することで「どこが繰り返し問われるか」が体で分かります。各論点の冒頭には、過去問の正答選択肢から抽出した<strong>「論点まとめ（覚える正しい知識）」</strong>を配置しました。生の年度別過去問では得られない、横断・体系化された一冊です。</p>
<p>図版を要する設問は本書では割愛し、文章で完結する設問のみを収録しています。</p></div>`)

  const pages = [
    { id: 'p-title', href: 'p-title.xhtml', label: '扉', content: titlePage },
    { id: 'p-credit', href: 'p-credit.xhtml', label: '出典・免責', content: creditPage },
    { id: 'p-intro', href: 'p-intro.xhtml', label: '本書の使い方', content: introPage },
    ...model.chapters.map((ch) => ({
      id: `chap-${String(ch.n).padStart(2, '0')}`,
      href: `chap-${String(ch.n).padStart(2, '0')}.xhtml`,
      label: `${ch.n}. ${ch.label}`,
      content: chapterXhtml(model, ch),
    })),
  ]

  return writeEpub(
    {
      meta: {
        title: `${model.title} ― ${model.subtitle}`,
        author: AUTHOR,
        publisher: PUBLISHER,
        description: `${t.examLabel}「${t.label}」の択一過去問（H26〜R07）を論点別に再構成した暗記特化教材。`,
        rights: CREDIT_BODY,
      },
      css: EPUB_CSS,
      pages,
    },
    { outDir, fileName: `${t.key}.epub` },
  )
}

// =====================================================================
async function main() {
  const args = parseArgs(process.argv.slice(2))
  const theme = THEMES[args.theme]
  if (!theme) throw new Error(`未知のテーマ: ${args.theme}（${Object.keys(THEMES).join(',')}）`)

  const data = JSON.parse(readFileSync(resolve(REPO, theme.src), 'utf8'))
  const all = []
  for (const y of data.years) for (const q of y.questions) all.push({ ...q, year: y.year })
  const questions = all.filter((q) => theme.include.test(q.body))

  const outDir = resolve(REPO, args.outDir || `.tmp/takuitsu-${theme.key}`)
  mkdirSync(outDir, { recursive: true })

  const model = buildModel(theme, questions)
  const title = `${model.title} ― ${model.subtitle}`

  const outs = []
  if (args.format === 'md' || args.format === 'both') {
    const md = renderMarkdown(model)
    writeFileSync(join(outDir, 'article.md'), md, 'utf8')
    writeFileSync(join(outDir, 'print.html'), renderPrintHtml(md, title), 'utf8')
    outs.push('article.md', 'print.html')
  }
  if (args.format === 'epub' || args.format === 'both') {
    const epub = renderEpub(model, outDir)
    outs.push(epub.split('/').pop())
  }

  const s = model.stats
  console.log(`テーマ: ${theme.label}`)
  console.log(`抽出 ${s.extracted} 問 → 図版依存 ${s.figureSkipped} 問除外 / 同趣旨 ${s.dupCompressed} 問圧縮 → 収録 ${s.rendered} 問`)
  console.log(`章: ${model.chapters.length} 論点`)
  console.log(`出力先: ${outDir}`)
  for (const o of outs) console.log(`  - ${o}`)
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})
