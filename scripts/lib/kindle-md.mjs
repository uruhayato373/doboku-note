// Kindle 用の最小 markdown → XHTML レンダラ（択一 build-pe1-kindle と essay build-essay-kindle で共有）。
// 見出し(h1-h3)・段落・箇条書き(ul)・番号リスト(ol.opts)・表・引用・水平線・太字に対応。
// 選択肢の loose list（項目間に空行）で <ol> が分断され番号がリセットされる沈黙バグを、
// 空行の先読み（次の非空行が同種リストなら閉じない）で回避する。
import { xesc } from './epub-writer.mjs'

export const inlineMd = (s) => xesc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

export function mdToXhtml(text) {
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
    else if (/^\d+$/.test(line.trim())) { flush(); html.push(line.trim()) } // トークン単独行
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
