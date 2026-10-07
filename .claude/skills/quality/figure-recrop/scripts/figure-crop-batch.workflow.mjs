// figure-crop-batch.workflow.mjs
// /figure-quality-loop の 1 周分と /figure-recrop の「大量処理（並列 workflow）モード」用ワークフロー。
// 親（メインスレッド）が worklist を args で渡す。各図を figure-crop-worker（Generator）で
// 並列に処理し、構造化結果の配列を返す。MDX 寸法・判定台帳の記録と最終目視 QA・commit は親が直列で行う。
//
// 起動例（親側）:
//   node scripts/figure-review-queue.mjs --next 12 --json > .tmp/figure-loop/batch.json
//   Workflow({ scriptPath: ".claude/skills/quality/figure-recrop/scripts/figure-crop-batch.workflow.mjs",
//              args: <batch.json の配列> })
//
// args の各要素: figure-review-queue.mjs --next の 1 要素
//   { stage('review'|'reextract'), figKey, img(相対 .png|.webp), kind, imgSize:[幅,高さ], mdx, signals,
//     whyCut?, manualSource?, sourceRoots? }
// 旧形式 { figKey, name, img, kind, imgSize }（/figure-recrop の recrop-review 一覧）も stage=review として受ける。
// 判定の RULES は figure-crop-worker.md（agent の system prompt）に集約＝ここでは入力を渡すだけ。

export const meta = {
  name: 'figure-crop-batch',
  description: '記事図(png/webp)を並列で目視分類→写り込み除去クロップ／元PDFからの切り出し直し（figure-crop-worker を spawn・MDX/台帳/QAは親が直列）',
  phases: [
    { title: 'Crop', detail: '各図を figure-crop-worker が目視分類→クロップまたは元PDFから切り出し直し＋自己検証', model: 'sonnet' },
  ],
}

const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['figKey', 'action', 'reason', 'selfVerify'],
  properties: {
    figKey: { type: 'string' },
    action: { type: 'string', enum: ['crop', 'ok', 'needs-source', 'reextract', 'source-unavailable'] },
    newWidth: { type: 'number', description: 'ファイルを書き換えたときの新幅、それ以外は0' },
    newHeight: { type: 'number', description: 'ファイルを書き換えたときの新高さ、それ以外は0' },
    cropBox: { type: 'string', description: '(left,top,right,bottom) 適用した座標。書き換えていなければ空文字' },
    removed: { type: 'string', description: '除去した写り込み／復元した欠けの内訳' },
    reason: { type: 'string' },
    sourcePdf: { type: 'string', description: 'reextract の出典 PDF パス。それ以外は空文字' },
    sourcePage: { type: 'number', description: 'reextract の出典ページ（1 始まり）。それ以外は0' },
    sourceDpi: { type: 'number', description: 'reextract のレンダリング dpi。それ以外は0' },
    selfVerify: { type: 'string', enum: ['clean', 'suspect'] },
  },
}

const items = typeof args === 'string' ? JSON.parse(args) : args
if (!Array.isArray(items) || items.length === 0) {
  log('args が空です。worklist（figure-review-queue.mjs --next の配列）を渡してください。')
  return []
}
const stageOf = (it) => it.stage || 'review'
log(`${items.length} 図を並列処理開始（review ${items.filter((it) => stageOf(it) === 'review').length}・reextract ${items.filter((it) => stageOf(it) === 'reextract').length}）`)

const promptOf = (it) => {
  const lines = [
    `対象図を1枚だけ処理し、figure-crop-worker の stage=${stageOf(it)} の手順に従って構造化結果を返せ。`,
    `figKey: ${it.figKey}`,
    `画像(相対): ${it.img}`,
    `kind: ${it.kind}`,
    `現在の寸法: ${(it.imgSize || []).join('x')}`,
  ]
  if (it.mdx) lines.push(`記事 MDX（読むだけ）: ${it.mdx}`)
  if (it.signals?.length) {
    lines.push(`機械の兆候（疑う場所の手がかり・判定は目視で）: ${it.signals.map((s) => `${s.signal}${s.side ? `(${s.side})` : ''}${s.detail ? ` ${s.detail}` : ''}`).join(' / ')}`)
  }
  if (stageOf(it) === 'reextract') {
    lines.push(`切れていると判定した理由: ${it.whyCut || '（記録なし）'}`)
    lines.push(`過去に記録された出典: ${it.manualSource ? JSON.stringify(it.manualSource) : 'なし'}`)
    lines.push(`元 PDF を探す場所: ${(it.sourceRoots || []).join(' | ')}`)
    if (it.vaultNote) lines.push(`注意: ${it.vaultNote}`)
  }
  return lines.join('\n')
}

// worker が結果を返さなかった図は action='error'（schema 外）。親は台帳に記録せず、次の周で判定待ちに残る
const fallback = (it) => ({
  figKey: it.figKey, action: 'error',
  reason: 'agent returned null（未処理）', selfVerify: 'suspect',
  newWidth: 0, newHeight: 0, cropBox: '', removed: '', sourcePdf: '', sourcePage: 0, sourceDpi: 0,
})

phase('Crop')
const results = await parallel(items.map((it) => () =>
  agent(promptOf(it), {
    label: `${stageOf(it)}:${it.figKey.split('/').pop()}`,
    phase: 'Crop', schema: RESULT_SCHEMA, agentType: 'figure-crop-worker', model: 'sonnet',
  }).then((r) => r || fallback(it))
))

return results
