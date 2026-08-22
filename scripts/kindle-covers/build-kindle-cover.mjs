// Kindle 表紙（1600×2560 JPEG）を spec 駆動で合成する決定的ビルダー。
// Codex 等で生成した背景画像に、satori + NotoSansJP-Bold で日本語タイトルを
// オーバーレイする（画像モデルは日本語を崩すため、文字は必ず後合成する）。
//
// 使い方:
//   node scripts/kindle-covers/build-kindle-cover.mjs --spec scripts/kindle-covers/specs/a-01.json [--out <path>]
//
// spec スキーマ（specs/*.json）:
//   {
//     "bookId": "a-01",
//     "background": "scripts/kindle-covers/backgrounds/a-01.png", // リポ相対
//     "accent": "#1E73C8",                    // 資格テーマ色（下線バー）
//     "kicker": "1級土木施工管理技士 第1次検定",
//     "titleLines": [{ "text": "安全管理", "size": 336 }, { "text": "論点別過去問", "size": 196 }],
//     "subLines": ["平成26〜令和7年度 12年分", "127問を9論点に再構成"],
//     "brand": "doboku-note"                  // 右下の署名（＝著者/ブランド）
//   }
//
// 出力: --out 指定パス（既定 .tmp/kindle-cover-<bookId>.jpg）。KDP 入稿は 1600×2560。

import fs from 'node:fs'
import path from 'node:path'
import satori from 'satori'
import sharp from 'sharp'

const REPO = path.resolve(import.meta.dirname, '../..')
const FONT_DIR = path.join(REPO, '.claude/skills/conversion/ogp-create/assets/fonts')
const W = 1600, H = 2560

function parseArgs(argv) {
  const a = { spec: null, out: null }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--spec') a.spec = argv[++i]
    else if (argv[i] === '--out') a.out = argv[++i]
  }
  if (!a.spec) throw new Error('--spec scripts/kindle-covers/specs/*.json は必須')
  return a
}

const h = (type, props, ...children) => ({
  type,
  props: { ...(props || {}), children: children.length <= 1 ? children[0] : children },
})

const args = parseArgs(process.argv.slice(2))
const spec = JSON.parse(fs.readFileSync(path.resolve(REPO, args.spec), 'utf8'))
const out = path.resolve(REPO, args.out || `.tmp/kindle-cover-${spec.bookId}.jpg`)
const bgPath = path.resolve(REPO, spec.background)
if (!fs.existsSync(bgPath)) throw new Error(`背景画像が見つからない: ${bgPath}`)

const noto = fs.readFileSync(path.join(FONT_DIR, 'NotoSansJP-Bold.ttf'))
const inter = fs.readFileSync(path.join(FONT_DIR, 'Inter-Bold.ttf'))
const accent = spec.accent || '#1E73C8'

const tree = h('div', {
  style: {
    width: W, height: H, display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between',
    border: '3px solid rgba(15,30,63,0.30)', // 白地に白枠の KDP 警告回避
    fontFamily: 'Noto Sans JP',
  },
},
  h('div', {
    style: {
      display: 'flex', flexDirection: 'column', padding: '88px 88px 0',
      backgroundImage: 'linear-gradient(180deg, rgba(11,20,40,0.72) 0%, rgba(11,20,40,0.46) 66%, rgba(11,20,40,0) 100%)',
      paddingBottom: 130,
    },
  },
    h('div', { style: { display: 'flex', fontSize: 66, color: '#FFFFFF', letterSpacing: 2, marginBottom: 34 } }, spec.kicker || ''),
    ...(spec.titleLines || []).map((t, i) =>
      h('div', { style: { display: 'flex', fontSize: t.size || 300, color: '#FFFFFF', lineHeight: 1.04, letterSpacing: 4, marginTop: i ? 22 : 0 } }, t.text)),
    h('div', { style: { display: 'flex', width: 190, height: 12, backgroundColor: accent, marginTop: 46, marginBottom: 42, borderRadius: 2 } }),
    ...(spec.subLines || []).map((s) =>
      h('div', { style: { display: 'flex', fontSize: 58, color: '#F0F5FB', lineHeight: 1.45, letterSpacing: 1 } }, s)),
  ),
  h('div', {
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      padding: '0 88px 84px',
      backgroundImage: 'linear-gradient(0deg, rgba(11,20,40,0.66) 0%, rgba(11,20,40,0.32) 55%, rgba(11,20,40,0) 100%)',
      paddingTop: 130,
    },
  },
    h('div', { style: { display: 'flex', fontSize: 84, color: '#FFFFFF', fontFamily: 'Inter', letterSpacing: 3 } }, spec.brand || 'doboku-note'),
  ),
)

const svg = await satori(tree, {
  width: W, height: H,
  fonts: [
    { name: 'Noto Sans JP', data: noto, weight: 700, style: 'normal' },
    { name: 'Inter', data: inter, weight: 700, style: 'normal' },
  ],
})

const titleLayer = await sharp(Buffer.from(svg)).png().toBuffer()
const bg = await sharp(bgPath).resize(W, H, { fit: 'cover', position: 'attention' }).toBuffer()

fs.mkdirSync(path.dirname(out), { recursive: true })
await sharp(bg).composite([{ input: titleLayer, top: 0, left: 0 }])
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(out)

const meta = await sharp(out).metadata()
console.log(`OK: ${out}`)
console.log(`  ${meta.width}x${meta.height} ${meta.format} / ${(fs.statSync(out).size / 1024).toFixed(0)} KB`)
