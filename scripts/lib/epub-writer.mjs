// EPUB3 組立の共通ライブラリ（npm 依存ゼロ・外部コマンド不要）。
// build-takuitsu-reconstruct.mjs（A系: 1級土木択一 論点別）と
// build-pe1-kindle.mjs（D系: 技術士一次 科目別合本）が共用する。
//
// 生成物: mimetype（無圧縮・先頭）+ META-INF/container.xml
//   + OEBPS/{content.opf(EPUB3), nav.xhtml(properties="nav"), toc.ncx(EPUB2互換),
//            style.css, ページ xhtml..., リソース(画像等)}
//
// API:
//   writeEpub({ meta, css, pages, resources }, { outDir, fileName }) => epubPath
//     meta:  { title, author, publisher, description, rights, language='ja', uuid?, date? }
//     pages: [{ id, href, label, content, properties?, inToc? }]  // content=完全な XHTML 文字列
//            properties は opf manifest の properties 属性（例 'mathml'）
//            inToc: false で nav/ncx（目次）から除外（spine には載る＝本文順に読める）。
//            1問=1ファイル分割で問題/解答ページを目次に並べないために使う
//     resources: [{ id, href, mediaType, data }]          // data=Buffer|string（画像等）
//
// 補助エクスポート: xesc / xinline / xhtmlDoc（呼び出し側のページ生成用）

import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { deflateRawSync } from 'node:zlib'
import { randomUUID } from 'node:crypto'

// ── ZIP 書き出し（zlib のみ）─────────────────────────────────────────────
// 以前は `zip` コマンドに外注していたが、Windows には zip も 7z も bsdtar も無く
// EPUB を1冊もビルドできなかった（2026-08-03 に発覚）。EPUB の要件は
// 「mimetype が先頭・無圧縮・extra field なし」だけなので、自前で組む。
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
const crc32 = (buf) => {
  let c = 0 ^ -1
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff]
  return (c ^ -1) >>> 0
}

// 日時は固定にして再現ビルドの差分をゼロにする（内容が同じなら同じバイト列になる）。
const DOS_TIME = 0
const DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1

// entries: [{ name, data: Buffer, store: boolean }] を与えた順に格納する。
function buildZip(entries) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8')
    const crc = crc32(e.data)
    const body = e.store ? e.data : deflateRawSync(e.data, { level: 9 })
    const method = e.store ? 0 : 8

    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0)
    lh.writeUInt16LE(20, 4)          // version needed
    lh.writeUInt16LE(0, 6)           // flags（UTF-8 bit は立てない＝名前は ASCII のみ）
    lh.writeUInt16LE(method, 8)
    lh.writeUInt16LE(DOS_TIME, 10)
    lh.writeUInt16LE(DOS_DATE, 12)
    lh.writeUInt32LE(crc, 14)
    lh.writeUInt32LE(body.length, 18)
    lh.writeUInt32LE(e.data.length, 22)
    lh.writeUInt16LE(name.length, 26)
    lh.writeUInt16LE(0, 28)          // extra length=0（mimetype に extra を付けない要件）
    locals.push(lh, name, body)

    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0)
    ch.writeUInt16LE(20, 4)          // version made by
    ch.writeUInt16LE(20, 6)          // version needed
    ch.writeUInt16LE(0, 8)
    ch.writeUInt16LE(method, 10)
    ch.writeUInt16LE(DOS_TIME, 12)
    ch.writeUInt16LE(DOS_DATE, 14)
    ch.writeUInt32LE(crc, 16)
    ch.writeUInt32LE(body.length, 20)
    ch.writeUInt32LE(e.data.length, 24)
    ch.writeUInt16LE(name.length, 28)
    ch.writeUInt16LE(0, 30)          // extra
    ch.writeUInt16LE(0, 32)          // comment
    ch.writeUInt16LE(0, 34)          // disk
    ch.writeUInt16LE(0, 36)          // internal attrs
    ch.writeUInt32LE(0, 38)          // external attrs
    ch.writeUInt32LE(offset, 42)     // local header offset
    centrals.push(ch, name)

    offset += lh.length + name.length + body.length
  }
  const central = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(central.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20)
  return Buffer.concat([...locals, central, eocd])
}

export const xesc = (s) =>
  (s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
export const xinline = (s) => xesc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

export function xhtmlDoc(title, inner) {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ja" lang="ja">
<head><meta charset="utf-8"/><title>${xesc(title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>${inner}</body></html>`
}

export function writeEpub({ meta, css, pages, resources = [] }, { outDir, fileName }) {
  const uuid = meta.uuid || `urn:uuid:${randomUUID()}`
  const today = meta.date || new Date().toISOString().slice(0, 10)
  const language = meta.language || 'ja'

  // 追加順がそのまま zip の格納順になる。mimetype を最初に W() すること。
  const entries = []
  const W = (rel, data) => {
    entries.push({
      name: rel,
      data: Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8'),
      store: rel === 'mimetype',
    })
  }

  // 固定ファイル
  W('mimetype', 'application/epub+zip')
  W('META-INF/container.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`)
  W('OEBPS/style.css', css)

  // ページ本体
  for (const p of pages) W(`OEBPS/${p.href}`, p.content)
  // リソース（画像等）
  for (const r of resources) W(`OEBPS/${r.href}`, r.data)

  // nav.xhtml（EPUB3）— inToc: false のページは目次に載せない（spine には残る）
  const tocPages = pages.filter((p) => p.inToc !== false)
  const navList = tocPages.map((p) => `<li><a href="${p.href}">${xesc(p.label)}</a></li>`).join('\n')
  W('OEBPS/nav.xhtml', xhtmlDoc('目次',
    `<nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops" id="toc"><h1>目次</h1><ol>${navList}</ol></nav>`))

  // toc.ncx（EPUB2 互換・Kindle 安定化）
  const navPoints = tocPages.map((p, i) =>
    `<navPoint id="np-${i}" playOrder="${i + 1}"><navLabel><text>${xesc(p.label)}</text></navLabel><content src="${p.href}"/></navPoint>`).join('\n')
  W('OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="${uuid}"/></head>
<docTitle><text>${xesc(meta.title)}</text></docTitle>
<navMap>${navPoints}</navMap></ncx>`)

  // content.opf
  const manifestItems = [
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    '<item id="css" href="style.css" media-type="text/css"/>',
    ...pages.map((p) =>
      `<item id="${p.id}" href="${p.href}" media-type="application/xhtml+xml"${p.properties ? ` properties="${p.properties}"` : ''}/>`),
    ...resources.map((r) => `<item id="${r.id}" href="${r.href}" media-type="${r.mediaType}"/>`),
  ].join('\n')
  const spineItems = pages.map((p) => `<itemref idref="${p.id}"/>`).join('\n')
  W('OEBPS/content.opf',
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${language}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">${uuid}</dc:identifier>
<dc:title>${xesc(meta.title)}</dc:title>
<dc:creator>${xesc(meta.author)}</dc:creator>
<dc:publisher>${xesc(meta.publisher)}</dc:publisher>
<dc:language>${language}</dc:language>
<dc:date>${today}</dc:date>
<dc:description>${xesc(meta.description)}</dc:description>
<dc:rights>${xesc(meta.rights)}</dc:rights>
<meta property="dcterms:modified">${today}T00:00:00Z</meta>
</metadata>
<manifest>${manifestItems}</manifest>
<spine toc="ncx">${spineItems}</spine>
</package>`)

  // zip 化（mimetype を無圧縮で先頭に）
  if (entries[0]?.name !== 'mimetype') throw new Error('EPUB 不正: mimetype が先頭でない')
  const epubPath = join(outDir, fileName)
  mkdirSync(outDir, { recursive: true })
  rmSync(epubPath, { force: true })
  writeFileSync(epubPath, buildZip(entries))
  return epubPath
}
