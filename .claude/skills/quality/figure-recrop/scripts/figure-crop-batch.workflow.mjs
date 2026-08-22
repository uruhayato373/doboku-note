// figure-crop-batch.workflow.mjs
// /figure-recrop の「大量処理（並列 workflow）モード」用ワークフロー。
// 親（メインスレッド）が worklist を args で渡す。各図を figure-crop-worker（Generator）で
// 並列にクロップし、構造化結果の配列を返す。MDX 寸法・台帳3種の反映と最終目視 QA・commit は親が直列で行う。
//
// 起動例（親側）:
//   Workflow({ scriptPath: ".claude/skills/quality/figure-recrop/scripts/figure-crop-batch.workflow.mjs",
//              args: [{figKey, name, img, kind, imgSize:[w,h]}, ...] })
//
// args の各要素: { figKey, name, img(相対パス .png|.webp), kind('png'|'webp'), imgSize:[幅,高さ] }
// クロップの判定 RULES は figure-crop-worker.md（agent の system prompt）に集約＝ここでは薄く渡すだけ。

export const meta = {
  name: 'figure-crop-batch',
  description: '埋め込み済み図(png/webp)のrecrop-reviewを並列で分類・クロップ（figure-crop-worker を spawn・MDX/台帳/QAは親が直列）',
  phases: [
    { title: 'Crop', detail: '各図を figure-crop-worker が目視分類→写り込み除去クロップ＋自己検証', model: 'sonnet' },
  ],
}

const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['figKey', 'action', 'reason', 'selfVerify'],
  properties: {
    figKey: { type: 'string' },
    action: { type: 'string', enum: ['crop', 'ok', 'needs-source'] },
    newWidth: { type: 'number', description: 'crop時の新幅、それ以外は0' },
    newHeight: { type: 'number', description: 'crop時の新高さ、それ以外は0' },
    cropBox: { type: 'string', description: '(left,top,right,bottom) 適用した座標。crop以外は空文字' },
    removed: { type: 'string', description: '除去した写り込みの内訳' },
    reason: { type: 'string' },
    selfVerify: { type: 'string', enum: ['clean', 'suspect'] },
  },
}

const items = typeof args === 'string' ? JSON.parse(args) : args
if (!Array.isArray(items) || items.length === 0) {
  log('args が空です。worklist（{figKey,name,img,kind,imgSize} の配列）を渡してください。')
  return []
}
log(`recrop-review ${items.length} 図を並列クロップ開始（figure-crop-worker・png/webp両対応）`)

phase('Crop')
const results = await parallel(items.map((it) => () =>
  agent(
    `対象図を1枚だけ処理し、figure-crop-worker の手順（Read→分類→kind=${it.kind} に応じたクロップ→自己検証）に従って構造化結果を返せ。\n` +
    `figKey: ${it.figKey}\n画像(相対): ${it.img}\nkind: ${it.kind}\n現在の寸法: ${it.imgSize[0]}x${it.imgSize[1]}\nname: ${it.name}`,
    { label: `crop:${it.name}`, phase: 'Crop', schema: RESULT_SCHEMA, agentType: 'figure-crop-worker', model: 'sonnet' }
  ).then((r) => r || { figKey: it.figKey, action: 'ok', reason: 'agent returned null', selfVerify: 'suspect', newWidth: 0, newHeight: 0, cropBox: '', removed: '' })
))

return results
