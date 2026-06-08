// 択一過去問を「年度別」ではなく「論点別」に再構成した note 有料 PDF 用の
// 教材ソースを生成する試作ジェネレータ。
//
// 生の年度別過去問（サイトで無料公開中・無料代替も飽和）との差別化として、
//   1) 同一テーマの択一を H26〜R07 で横断集約（出題パターンが体で分かる）
//   2) テーマ冒頭に「論点まとめ」= 正しい知識(○解説)を体系化（暗記特化）
//   3) 同一趣旨の反復問題を圧縮（編集された教材としての価値）
// を付与する。入力は build-time 済みの構造化全問 JSON。
//
// 使い方:
//   node scripts/build-takuitsu-reconstruct.mjs --theme anzen [--outDir .tmp/takuitsu-anzen]
//
// 出力: <outDir>/article.md（note 貼付用 SoT）と <outDir>/print.html（印刷HTML）。
// 最終 PDF は印刷HTML を Chrome で「PDF に保存」(Ctrl+P) するだけ。レイアウト CSS は
// scripts/magazine-to-pdf.mjs と同系統（紙のハウススタイル）。

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REPO = resolve(import.meta.dirname, '..')

// ---- テーマ定義（試作は安全管理1本。追加時はここに足す）------------------
const THEMES = {
  anzen: {
    key: 'anzen',
    label: '安全管理',
    examLabel: '1級土木施工管理技士 第1次検定',
    src: 'src/config/civil-1-exam-questions.json',
    // テーマ抽出（body 一致＝精度優先）
    include:
      /安全|墜落|足場|労働災害|酸素欠乏|クレーン|玉掛け|型枠支保工|土止め|土留め|明り|地山|崩壊|建設機械|架空線|感電|有機溶剤|粉じん|保護具|ずい道.*(安全|換気)|作業主任者|安全衛生/,
    // サブ論点（優先順。先に一致したものに割当。最後は受け皿）
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
  const a = { theme: 'anzen', outDir: null }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--theme') a.theme = argv[++i]
    else if (argv[i] === '--outDir') a.outDir = argv[++i]
  }
  return a
}

const YEAR_LABEL = (y) =>
  y.startsWith('h') ? `H${y.slice(1)}` : `R${y.slice(1)}`

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
      // 文末整形
      t = t.replace(/\s+/g, '').replace(/[。.]$/, '')
      const k = norm(t).slice(0, 28)
      if (seen.has(k)) continue
      seen.add(k)
      bullets.push(t)
    }
  }
  return bullets
}

function renderQuestion(q) {
  const yl = YEAR_LABEL(q.year)
  const tag = `${yl} ${q.part}-${String(q.no).padStart(2, '0')}`
  const opts = (q.options || [])
    .map((o) => `${o.num}. ${o.text}`)
    .join('\n')
  const ce = (q.optionExplanations || []).find((e) => e.num === q.correct)
  const point = ce ? ce.text.replace(/\s+/g, '').replace(/[。.]$/, '') : ''
  return [
    `**［${tag}］** ${q.body}`,
    '',
    opts,
    '',
    `**正答 ${q.correct}** ― ${point}`,
  ].join('\n')
}

function buildMarkdown(theme, questions) {
  // サブ論点割当
  const buckets = new Map(theme.subtopics.map((s) => [s.key, []]))
  for (const q of questions) buckets.get(assignSubtopic(theme, q)).push(q)
  // 各バケツ: 年度→No 昇順、同一趣旨(body正規化一致)は最古年のみ残し再出年を注記
  for (const [, arr] of buckets) {
    arr.sort((a, b) => (a.year < b.year ? -1 : a.year > b.year ? 1 : a.no - b.no))
  }

  const fm = [
    '---',
    `title: "${theme.examLabel} 択一・論点別トレーニング ― ${theme.label}"`,
    'notePricing: paid',
    `noteSeries: "1級土木 択一・論点別トレーニング"`,
    'published: false',
    '---',
    '',
  ].join('\n')

  const out = [fm]
  out.push(`# ${theme.examLabel} 択一・論点別トレーニング ― ${theme.label}`)
  out.push('')
  out.push(
    [
      `本書は ${theme.examLabel}「${theme.label}」の択一過去問（H26〜R07）を、`,
      '**年度別ではなく論点別**に解体・再構成した暗記特化教材です。同じ論点の問題を',
      '年度をまたいで連続演習することで「どこが繰り返し問われるか」が体で分かります。',
      '各論点の冒頭に、過去問の正答選択肢から抽出した**「論点まとめ（覚える正しい知識）」**を',
      '配置しました。生の年度別過去問では得られない、横断・体系化された一冊です。',
    ].join('\n'),
  )
  out.push('')

  let n = 0
  for (const st of theme.subtopics) {
    const arr = buckets.get(st.key)
    if (!arr.length) continue
    n++
    out.push(`## ${n}. ${st.label}`)
    out.push('')

    // 論点まとめ
    const ronten = buildRonten(arr).slice(0, 18)
    if (ronten.length) {
      out.push('### 論点まとめ（覚える正しい知識）')
      out.push('')
      for (const b of ronten) out.push(`- ${b}`)
      out.push('')
    }

    // 一問一答（同一趣旨圧縮）
    out.push(`### 一問一答（${arr.length} 問・H26〜R07）`)
    out.push('')
    const usedBody = new Map()
    const rendered = []
    let dup = 0
    for (const q of arr) {
      const bk = norm(q.body)
      if (usedBody.has(bk)) {
        usedBody.get(bk).push(YEAR_LABEL(q.year))
        dup++
        continue
      }
      usedBody.set(bk, [YEAR_LABEL(q.year)])
      rendered.push({ q, bk })
    }
    for (const { q, bk } of rendered) {
      out.push(renderQuestion(q))
      const years = usedBody.get(bk)
      if (years.length > 1)
        out.push(`\n> 同趣旨で再出題: ${years.join(' / ')}`)
      out.push('')
      out.push('---')
      out.push('')
    }
    if (dup) out.push(`*（同一趣旨 ${dup} 問を圧縮）*\n`)
  }

  return out.join('\n')
}

const CSS = `
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

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s) =>
  esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

// 本ジェネレータが出力する限定構文だけを扱う軽量 md→html（依存ゼロ）
function mdToHtml(md) {
  const lines = md.split('\n')
  const html = []
  let para = []
  let list = []
  const flushP = () => {
    if (para.length) {
      html.push(`<p>${para.map(inline).join('<br>')}</p>`)
      para = []
    }
  }
  const flushList = () => {
    if (list.length) {
      html.push(`<ul>${list.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`)
      list = []
    }
  }
  const flush = () => {
    flushP()
    flushList()
  }
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) {
      flush()
    } else if (/^### /.test(line)) {
      flush()
      html.push(`<h3>${inline(line.slice(4))}</h3>`)
    } else if (/^## /.test(line)) {
      flush()
      html.push(`<h2>${inline(line.slice(3))}</h2>`)
    } else if (/^# /.test(line)) {
      flush()
      html.push(`<h1>${inline(line.slice(2))}</h1>`)
    } else if (/^---$/.test(line)) {
      flush()
      html.push('<hr>')
    } else if (/^> /.test(line)) {
      flush()
      html.push(`<blockquote>${inline(line.slice(2))}</blockquote>`)
    } else if (/^- /.test(line)) {
      flushP()
      list.push(line.slice(2))
    } else {
      flushList()
      para.push(line)
    }
  }
  flush()
  return html.join('\n')
}

function toHtml(md, title) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${mdToHtml(md)}</body></html>`
}

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

  const md = buildMarkdown(theme, questions)
  // frontmatter を除いた本文を HTML 化
  const mdBody = md.replace(/^---[\s\S]*?---\n/, '')
  const title = `${theme.examLabel} 択一・論点別トレーニング ― ${theme.label}`
  const html = toHtml(mdBody, title)

  writeFileSync(join(outDir, 'article.md'), md, 'utf8')
  writeFileSync(join(outDir, 'print.html'), html, 'utf8')

  console.log(`テーマ: ${theme.label}`)
  console.log(`抽出: ${questions.length} 問`)
  console.log(`出力: ${join(outDir, 'article.md')}`)
  console.log(`     ${join(outDir, 'print.html')}`)
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})
