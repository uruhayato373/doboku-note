// note マガジンの article.md を「問題文＋解答」中心の A4 PDF に変換する汎用レンダラ。
//
// 抽出は spec(JSON) 駆動の include/exclude DSL で行い、マガジンごとの構造差
// (A/B 複数解答・予想問題・採点者視点や CTA の除外) を吸収する。描画は
// remark → 印刷用 CSS → Chrome ヘッドレス --print-to-pdf。
//
// 使い方:
//   node scripts/magazine-to-pdf.mjs --spec scripts/pdf-specs/<magazine>.json [--desktop]
//
// spec スキーマ:
//   {
//     "srcDir": "docs/note/magazines/<name>",  // repo 相対。各 article.md の親
//     "outDir": "C:\\tmp\\<name>-pdf",           // 任意。既定 C:\tmp\<srcDir末尾>-pdf
//     "deliverTo": "desktop",                    // 任意。"desktop" で生成 PDF を Desktop へもコピー
//     "articles": [
//       {
//         "src": "R07/article.md",               // srcDir 相対
//         "out": "模範論文-自治体道路-R07",        // 出力 PDF ベース名(拡張子なし)
//         "include": [                            // 残すレンジ(順に連結)。from〜to 直前(exclusive)
//           { "from": "^## 試験問題", "to": "^## 採点者視点" }
//         ],
//         "exclude": [                            // 連結後に除去するレンジ。from〜to 直前
//           { "from": "### 出題予想根拠", "to": "### .*フル模範論文" }
//         ]
//         // "title": "..."                       // 任意。既定は article の H1
//       }
//     ]
//   }
//
// from/to は本文(frontmatter 除去後)に対する正規表現。"m" フラグで評価するため
// 行頭アンカー(^)が使える。to を省くと当該レンジは EOF まで。

import { readFileSync, mkdirSync, writeFileSync, renameSync, copyFileSync, rmSync, existsSync } from 'node:fs'
import { join, resolve, basename, dirname } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import matter from 'gray-matter'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'

const REPO = resolve(import.meta.dirname, '..')
// 既定は会社 PC（Windows）の Chrome パス。Mac/CI 等では CHROME_PATH 環境変数で上書きする。
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

function parseArgs(argv) {
  const args = { spec: null, desktop: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--spec') args.spec = argv[++i]
    else if (argv[i] === '--desktop') args.desktop = true
    else if (argv[i] === '--in-place') args.inPlace = true
  }
  if (!args.spec) throw new Error('--spec <path> を指定してください')
  return args
}

// from 見出し〜to 見出し直前(exclusive)を切り出す。末尾の区切り線 --- は除去。
function sliceRange(content, fromRe, toRe) {
  const s = content.match(new RegExp(fromRe, 'm'))
  if (!s) throw new Error(`include.from が見つかりません: ${fromRe}`)
  const after = content.slice(s.index)
  const e = toRe ? after.match(new RegExp(toRe, 'm')) : null
  const body = e ? after.slice(0, e.index) : after
  return body.trim().replace(/\s*\n---\s*$/, '').trim()
}

// from〜to 直前(lookahead)を除去。同一パターンが複数回出る場合(予想問題1/2 など)も
// 全件除去するため global。
function dropRange(text, fromRe, toRe) {
  const re = new RegExp(`${fromRe}[\\s\\S]*?(?=${toRe})`, 'gm')
  return text.replace(re, '')
}

function extract(content, article) {
  const h1 = (content.match(/^#\s+.+$/m) || [''])[0]
  const includes = article.include && article.include.length ? article.include : [{ from: '^#\\s+', to: null }]
  let body = includes.map((r) => sliceRange(content, r.from, r.to)).join('\n\n---\n\n')
  for (const r of article.exclude || []) {
    if (!r.to) throw new Error('exclude には to が必要です')
    body = dropRange(body, r.from, r.to)
  }
  const title = article.title || (h1.match(/^#\s+(.+)$/) || [, ''])[1]
  return { md: `${h1}\n\n${body.trim()}\n`, title }
}

const processor = remark().use(remarkGfm).use(remarkHtml)

function buildHtml(title, bodyHtml) {
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: A4; margin: 18mm 16mm 20mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: "Yu Mincho","YuMincho","Hiragino Mincho ProN","MS Mincho",serif;
    font-size: 10.5pt; line-height: 1.85; color: #1a1a1a; margin: 0;
  }
  h1, h2, h3, h4 {
    font-family: "Yu Gothic","YuGothic","Meiryo",sans-serif;
    break-after: avoid; page-break-after: avoid;
  }
  h1 { font-size: 16.5pt; line-height: 1.5; border-bottom: 2px solid #2b5d8a;
       padding-bottom: 8px; margin: 0 0 18px; }
  h2 { font-size: 13pt; background: #eef3f8; border-left: 5px solid #2b5d8a;
       padding: 6px 10px; margin: 24px 0 12px; }
  h3 { font-size: 12pt; color: #1f4a6e; border-bottom: 1px solid #cdd8e2;
       padding-bottom: 3px; margin: 20px 0 9px; }
  h4 { font-size: 11pt; color: #1f4a6e; margin: 15px 0 6px; }
  p { margin: 0 0 9px; text-align: justify; }
  strong { font-weight: 700; color: #14202b; }
  ul, ol { margin: 0 0 11px; padding-left: 1.5em; }
  li { margin-bottom: 3px; }
  blockquote { margin: 0 0 11px; padding: 4px 12px; border-left: 3px solid #b8c6d4;
               background: #f5f8fb; color: #333; }
  hr { border: none; border-top: 1px solid #d6dde4; margin: 16px 0; }
</style></head><body>
${bodyHtml}
</body></html>`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!existsSync(CHROME)) throw new Error(`Chrome が見つかりません: ${CHROME}`)

  const specPath = resolve(REPO, args.spec)
  const spec = JSON.parse(readFileSync(specPath, 'utf8'))
  const srcDir = resolve(REPO, spec.srcDir)
  // 既定の作業出力先。会社 PC（Windows）は C:\tmp、それ以外は OS の一時ディレクトリ（Mac/CI 対応）。
  const outDir =
    spec.outDir ||
    (process.platform === 'win32'
      ? `C:\\tmp\\${basename(spec.srcDir)}-pdf`
      : join(tmpdir(), `${basename(spec.srcDir)}-pdf`))
  const workDir = join(outDir, '_work')
  const toDesktop = args.desktop || spec.deliverTo === 'desktop'
  const inPlace = args.inPlace || spec.deliverTo === 'in-place'
  const desktopDir = join(homedir(), 'Desktop')

  rmSync(workDir, { recursive: true, force: true })
  mkdirSync(workDir, { recursive: true })
  const userDataDir = join(workDir, '_chrome-profile')

  const made = []
  for (const art of spec.articles) {
    const raw = readFileSync(join(srcDir, art.src), 'utf8')
    const { content } = matter(raw)
    const { md, title } = extract(content, art)

    const bodyHtml = String(await processor.process(md))
    const slug = art.out.replace(/[\\/:*?"<>|]/g, '_')
    const htmlPath = join(workDir, `${slug}.html`)
    const pdfTmp = join(workDir, `${slug}.pdf`)
    writeFileSync(htmlPath, buildHtml(title, bodyHtml), 'utf8')

    try {
      execFileSync(
        CHROME,
        [
          '--headless=new',
          '--disable-gpu',
          '--no-pdf-header-footer',
          '--no-first-run',
          '--no-default-browser-check',
          // 非 Windows（Mac/CI）では sandbox/常駐 Chrome との衝突で print-to-pdf が
          // ハングするため、無効化フラグを付与する（Windows 会社 PC の挙動は不変）。
          ...(process.platform === 'win32'
            ? []
            : ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-extensions', '--disable-background-networking']),
          `--user-data-dir=${userDataDir}`,
          `--print-to-pdf=${pdfTmp}`,
          pathToFileURL(htmlPath).href,
        ],
        { stdio: 'pipe', timeout: 45000 },
      )
    } catch (e) {
      // Mac の新 headless Chrome は PDF を書き出しても exit しないことがあり execFileSync が
      // timeout する。pdfTmp が生成済みなら成功扱い（それ以外は本当の失敗として再送出）。
      if (!existsSync(pdfTmp)) throw e
    }
    if (!existsSync(pdfTmp)) throw new Error(`PDF 生成に失敗: ${art.src}`)

    const finalPath = join(outDir, `${art.out}.pdf`)
    renameSync(pdfTmp, finalPath)
    if (toDesktop) copyFileSync(finalPath, join(desktopDir, `${art.out}.pdf`))
    if (inPlace) copyFileSync(finalPath, join(srcDir, dirname(art.src), `${art.out}.pdf`))
    made.push(`${art.out}.pdf`)
    console.log(`  OK  ${art.out}.pdf`)
  }

  console.log(`\n完了: ${made.length} 件`)
  console.log(`出力先: ${outDir}${toDesktop ? `  / デスクトップにもコピー: ${desktopDir}` : ''}`)
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})
