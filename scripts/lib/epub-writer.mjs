// EPUB3 組立の共通ライブラリ（npm 依存ゼロ・zip コマンド利用）。
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
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

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

  const work = join(outDir, '_epub')
  rmSync(work, { recursive: true, force: true })
  mkdirSync(join(work, 'META-INF'), { recursive: true })
  mkdirSync(join(work, 'OEBPS'), { recursive: true })

  const W = (rel, data) => {
    const p = join(work, rel)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, data)
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

  // zip（mimetype を無圧縮で先頭に）
  const epubPath = join(outDir, fileName)
  rmSync(epubPath, { force: true })
  execFileSync('zip', ['-X', '-0', epubPath, 'mimetype'], { cwd: work, stdio: 'pipe' })
  execFileSync('zip', ['-rgq', epubPath, 'META-INF', 'OEBPS', '-x', 'mimetype'], { cwd: work, stdio: 'pipe' })
  rmSync(work, { recursive: true, force: true })
  return epubPath
}
