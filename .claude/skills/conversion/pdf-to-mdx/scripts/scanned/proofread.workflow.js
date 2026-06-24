// スキャン書籍 本文OCR 校正パス Workflow テンプレート。
//
// OCRファンアウト(ocr_fanout)が書いた各バッチ md を、対応するページ画像と**逐語照合**して
// 言い換え・誤読・脱落を修正し、補正版で上書きする。OCR の近似性（密な数値/手順/規格の段落で
// 原文に無い言い換えが出る）を、原本画像突合で締める2パス目。concat_chapters.py の前に回す。
//
// args:（ocr_fanout と同じ chapters/outDir/batchSize をそのまま渡せばよい）
//   { "outDir":..., "batchSize":6, "chapters":[{id,pdf,title,pages,dir}, ...] }
//
// 各エージェントは「現バッチ md ＋ 担当ページ画像」を Read し、画像に忠実なよう**外科的に**修正して
// 同じ outFile を上書きする（構成・見出し・ページマーカー・図プレースホルダは保持）。
export const meta = {
  name: 'scanned-ocr-proofread',
  description: 'スキャン書籍 本文OCRバッチmdをページ画像と逐語照合して誤読/言い換え/脱落を修正(2パス目)',
  phases: [{ title: 'Proofread', detail: 'scanned-textbook-transcriber 校正' }],
}

const cfg = typeof args === 'string' ? JSON.parse(args) : args
const BATCH = cfg.batchSize || 6
const pad2 = (n) => String(n).padStart(2, '0')

const batches = []
for (const ch of cfg.chapters) {
  const imgs = []
  for (let i = 0; i < ch.pages; i++) imgs.push(`${ch.dir}\\p${pad2(i)}.png`)
  for (let b = 0; b * BATCH < ch.pages; b++) {
    batches.push({ chId: ch.id, chTitle: ch.title, bi: b, images: imgs.slice(b * BATCH, (b + 1) * BATCH),
      outFile: `${cfg.outDir}\\${ch.id}__b${pad2(b)}.md` })
  }
}
log(`校正 ${batches.length}バッチ`)

const STATUS = {
  type: 'object', additionalProperties: false,
  properties: { ok: { type: 'boolean' }, edits: { type: 'integer' }, uffffdZero: { type: 'boolean' }, note: { type: 'string' } },
  required: ['ok', 'edits', 'uffffdZero'],
}

const buildPrompt = (B) => {
  const list = B.images.map((p, i) => `${i + 1}. ${p}`).join('\n')
  return `スキャン教材「${B.chTitle}」の文字起こしバッチを、原本ページ画像と逐語照合して**外科的に校正**する。

## 現在の文字起こし（このファイルを Read し、修正後に同じパスへ上書き Write）
${B.outFile}

## 照合する原本ページ画像（読み順）
${list}

## 校正方針
- 各ページ画像を1枚ずつ Read し、対応する \`<!-- p.NN -->\` ブロックの本文と**1文字ずつ突合**。
- **誤読・言い換え・脱落・順序入れ替わり**を画像に忠実なよう直す。特に数値・規格値・寸法・配合・法令条番号・固有名詞・送り仮名を厳密に。
- 直す対象は字句だけ。**構成・見出し階層・\`<!-- p.NN -->\`・表・\`（図: …）\`プレースホルダ・blockquote は保持**（位置も動かさない）。
- 画像に無い情報を足さない／要約しない。判読不能は \`〔判読不能〕\`。
- U+FFFD（文字化け）を残さない。

## 完了条件
- 校正後の全文を **同じ outFile に上書き Write**。U+FFFD 0 を自己確認。
- 戻り値は構造化ステータス（ok / edits=修正箇所のおおよその数 / uffffdZero / note）。`
}

phase('Proofread')
const results = await parallel(
  batches.map((B) => () =>
    agent(buildPrompt(B), { label: `proof:${B.chId}b${pad2(B.bi)}`, phase: 'Proofread',
      agentType: 'scanned-textbook-transcriber', schema: STATUS })
      .then((r) => ({ chId: B.chId, bi: B.bi, status: r }))
      .catch(() => ({ chId: B.chId, bi: B.bi, status: null }))
  )
)
const ok = results.filter((r) => r && r.status && r.status.ok)
const bad = results.filter((r) => !r || !r.status || !r.status.ok)
const edits = ok.reduce((s, r) => s + (r.status.edits || 0), 0)
log(`完了 ${ok.length}/${batches.length}・推定修正${edits}箇所・失敗${bad.length}`)
return { totalBatches: batches.length, okBatches: ok.length, estEdits: edits,
  failedBatches: bad.map((r) => `${r.chId}b${r.bi}`) }
