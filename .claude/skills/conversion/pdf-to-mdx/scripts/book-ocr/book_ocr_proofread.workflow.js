// 参考文献 bundle の視覚OCR 校正（第2読・Sonnet・対象ページだけ）。
//
// args: { sourceId, title, pagesDir, tessDir, items: [{ bi, outFile, pageIds: ["p0031", ...] }] }
//   items は book_ocr_compare.py の compare.json → proofreadItems。
//
// 各バッチについて、Tesseract と食い違ったページだけ画像を読み直し、字句を外科的に直して
// 同じ outFile を上書きする。構成・マーカー・図プレースホルダは動かさない。
export const meta = {
  name: 'book-ocr-proofread',
  description: 'Tesseract第二読と食い違ったページだけ画像と逐語照合して校正する（第2読）',
  phases: [{ title: 'Proofread', detail: 'scanned-textbook-transcriber（sonnet）' }],
}

const cfg = typeof args === 'string' ? JSON.parse(args) : args
const pad3 = (n) => String(n).padStart(3, '0')
log(`${cfg.sourceId}: 校正 ${cfg.items.length} バッチ / ${cfg.items.reduce((s, it) => s + it.pageIds.length, 0)} ページ`)

const STATUS = {
  type: 'object', additionalProperties: false,
  properties: { ok: { type: 'boolean' }, edits: { type: 'integer' }, unreadable: { type: 'integer' },
    uffffdZero: { type: 'boolean' }, markersOk: { type: 'boolean' }, note: { type: 'string' } },
  required: ['ok', 'edits', 'unreadable', 'uffffdZero', 'markersOk'],
}

const buildPrompt = (it) => {
  const list = it.pageIds.map((id, i) => `${i + 1}. ${id}\n   画像: ${cfg.pagesDir}/${id}.jpg\n   機械OCR参考: ${cfg.tessDir}/${id}.txt`).join('\n')
  return `書籍「${cfg.title}」の文字起こしバッチのうち、機械OCR（Tesseract）と食い違ったページを原本画像と逐語照合して**外科的に校正**する。

## 対象バッチ（Read → 修正 → 同じパスへ全文を上書き Write）
${it.outFile}

## 見直すページ（このページだけ。他のページには触らない）
${list}

「機械OCR参考」は Tesseract の出力で誤読を多く含む。**正は画像**。参考は、人間OCRが行を飛ばした・段落を言い換えた・表の行を落とした、といった脱落を見つける手がかりとしてだけ使う。

## 校正方針
- 対象ページの画像を Read し、\`<!-- pNNNN -->\` ブロックの本文と**1文字ずつ**突き合わせる。
- 誤読・言い換え・脱落・順序入れ替わりを画像に忠実なよう直す。数値・単位・規格値・条番号・固有名詞・送り仮名を厳密に。
- 直すのは字句だけ。マーカー・見出し階層・表・\`（図: …）\`・blockquote の位置は保つ。
- 画像で読めない箇所は \`〔判読不能〕\`／\`〔欠落: 理由〕\` にする（推測で埋めない。既存の本文が推測で埋めていたら〔判読不能〕へ戻す）。
- U+FFFD を残さない。対象外ページの本文は変更しない。

## 完了条件
- 校正後の**バッチ全文**を同じ outFile へ上書き Write。マーカーが元と同じ順・同じ個数、U+FFFD 0 を自己確認。
- 戻り値は構造化ステータス（ok / edits=直した箇所の概数 / unreadable=〔判読不能〕〔欠落〕の個数 / uffffdZero / markersOk / note）。`
}

phase('Proofread')
const results = await parallel(
  cfg.items.map((it) => () =>
    agent(buildPrompt(it), { label: `proof:${cfg.sourceId}:b${pad3(it.bi)}`, phase: 'Proofread',
      agentType: 'scanned-textbook-transcriber', schema: STATUS, effort: 'medium' })
      .then((r) => ({ bi: it.bi, status: r }))
      .catch(() => ({ bi: it.bi, status: null }))
  )
)
const ok = results.filter((r) => r && r.status && r.status.ok && r.status.markersOk && r.status.uffffdZero)
const bad = results.filter((r) => !(r && r.status && r.status.ok && r.status.markersOk && r.status.uffffdZero))
const edits = ok.reduce((s, r) => s + (r.status.edits || 0), 0)
log(`校正完了 ${ok.length}/${cfg.items.length}・修正 ${edits} 箇所・失敗 ${bad.length}`)
return { sourceId: cfg.sourceId, items: cfg.items.length, okItems: ok.length, edits,
  failedBatches: bad.map((r) => r.bi) }
