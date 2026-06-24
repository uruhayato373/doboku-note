// スキャン書籍 図クロップ監査 Workflow テンプレート（audit/refine ループの監査側）。
//
// 生成済みクロップ PNG を scanned-figure-crop-auditor に groupSize ずつ順次ファンアウトし、
// 各図の pass / 4軸スコア / adjust_bbox（相対調整値）を返す。main が apply_deltas_recrop.py で
// 算術適用→不合格図のみ再クロップ→本ワークフロー再実行、を最大2〜3反復して締める。
//
// args:
//   {
//     "imgDir":   "docs/.../テキスト（○○編）/img",   // クロップ PNG の場所（{figId}.png）
//     "thumbDir": "C:\\tmp\\xxx-ocr\\thumbs",          // 出所ページ参照画像（chNN/pXX.png）
//     "groupSize": 40,
//     "jobFiles": ["C:\\tmp\\xxx-ocr\\audit_jobs_01.json", ...]  // prep_audit_jobs.py 出力
//   }
//   audit job = {figId, chId, caption, chosenPage}
//
// 返り値 results を WORK/audit.json に保存 → apply_deltas_recrop.py に渡す。
//
// 注意（落とし穴）: scanned-figure-crop-auditor を**新規作成した直後の同一セッション**では
// agentType として解決できない（エージェント定義はセッション開始時ロード）。その場合は
// args.agentType:"general-purpose" を渡す（本ワークフローのプロンプトに4軸ルーブリックを内包済みで自己完結）。
// セッションを開き直せば agentType 既定の scanned-figure-crop-auditor が使える。
export const meta = {
  name: 'scanned-figure-crop-audit',
  description: 'スキャン書籍 図クロップを scanned-figure-crop-auditor で4軸採点し adjust_bbox を返す。groupSize順次でレート制限抑制',
  phases: [{ title: 'Load', detail: '監査ジョブ読込' }, { title: 'Audit', detail: 'scanned-figure-crop-auditor 群順次' }],
}

const cfg = typeof args === 'string' ? JSON.parse(args) : args
const pad2 = (n) => String(n).padStart(2, '0')
const GROUP = cfg.groupSize || 40

const JOBS_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { jobs: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: { figId: { type: 'string' }, chId: { type: 'string' }, caption: { type: 'string' }, chosenPage: { type: 'integer' } },
    required: ['figId', 'chId', 'caption', 'chosenPage'] } } },
  required: ['jobs'],
}

phase('Load')
const loaded = await parallel(
  cfg.jobFiles.map((fp) => () =>
    agent(`Read the file ${fp} using the Read tool. It contains a single-line JSON object {"jobs":[{"figId":..,"chId":..,"caption":..,"chosenPage":..}, ...]}. Return its "jobs" array EXACTLY as-is. Do not summarize, add, drop, reorder, or truncate.`,
      { label: `load:${fp.split('\\').pop()}`, phase: 'Load', schema: JOBS_SCHEMA })
      .then((r) => (r && r.jobs) ? r.jobs : []).catch(() => [])
  )
)
const jobs = loaded.flat()
log(`監査ジョブ ${jobs.length}図`)

const AUDIT_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    pass: { type: 'boolean' },
    scores: { type: 'object', additionalProperties: false,
      properties: { clip_purity: { type: 'integer' }, completeness: { type: 'integer' }, correct_figure: { type: 'integer' }, alt: { type: 'integer' } },
      required: ['clip_purity', 'completeness', 'correct_figure', 'alt'] },
    weighted: { type: 'number' },
    adjust_bbox: { type: 'object', additionalProperties: false,
      properties: { top: { type: 'number' }, bottom: { type: 'number' }, left: { type: 'number' }, right: { type: 'number' } },
      required: ['top', 'bottom', 'left', 'right'] },
    relocate: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['pass', 'scores', 'adjust_bbox'],
}

const buildPrompt = (J) => {
  const crop = `${cfg.imgDir}\\${J.figId}.png`
  const page = `${cfg.thumbDir}\\ch${J.chId}\\p${pad2(J.chosenPage)}.png`
  return `スキャン教材の図クロップ PNG を4軸ルーブリックで採点し、bbox の相対調整値を返す（scanned-figure-crop-auditor）。

## 対象キャプション（この図が正しく・タイトに切れているべき）
${J.caption}

## 入力（両方 Read で目視）
- クロップ PNG（評価対象）: ${crop}
- 出所ページ画像（タイト枠の基準。図の真の範囲と上下の本文有無を見る）: ${page}

## 採点（各0〜3）
- clip_purity(45%): 本文段落の写り込みゼロ・四辺タイトか（図番号キャプション行は可）
- completeness(30%): 図が切れていないか＋図番号キャプション行を含むか
- correct_figure(15%): キャプションの図番号/内容と一致するか（隣接図でない）
- alt(10%): 図番号 alt として妥当か
weighted = clip_purity*0.45 + completeness*0.30 + correct_figure*0.15 + alt*0.10。pass = 全軸≥2 かつ weighted≥2.0。

## adjust_bbox（現クロップからの相対調整・page比率。合格図は全0）
- top/bottom/left/right: **＋で内側へ詰める（写り込みを削る）／−で外側へ広げる（切れを救う）**
- 写り込み1行≒0.02〜0.04、段落≒0.06〜0.12 を目安。
- **別図を掴んでいる（correct_figure=0）場合は微調整で救えない** → relocate=true、adjust_bbox 全0、reason に「別ページの可能性」。

返り値は構造化のみ（pass / scores / weighted / adjust_bbox / relocate / reason）。`
}

phase('Audit')
const results = []
for (let i = 0; i < jobs.length; i += GROUP) {
  const slice = jobs.slice(i, i + GROUP)
  const part = await parallel(
    slice.map((J) => () =>
      agent(buildPrompt(J), { label: `audit:${J.figId}`, phase: 'Audit',
        agentType: cfg.agentType || 'scanned-figure-crop-auditor', model: cfg.model || 'sonnet', schema: AUDIT_SCHEMA })
        .then((r) => ({ figId: J.figId, chId: J.chId, result: r }))
        .catch((e) => ({ figId: J.figId, chId: J.chId, result: null, err: String(e) }))
    )
  )
  results.push(...part)
  log(`audit 進捗 ${Math.min(i + GROUP, jobs.length)}/${jobs.length}`)
}
const passed = results.filter((r) => r.result && r.result.pass)
log(`完了 pass=${passed.length}/${jobs.length}`)
return {
  total: jobs.length,
  results: results.map((r) => ({
    figId: r.figId, chId: r.chId,
    pass: r.result ? r.result.pass : false,
    scores: r.result ? r.result.scores : null,
    weighted: r.result ? (r.result.weighted ?? null) : null,
    adjust_bbox: r.result ? r.result.adjust_bbox : { top: 0, bottom: 0, left: 0, right: 0 },
    relocate: r.result ? (r.result.relocate ?? false) : false,
    reason: r.result ? (r.result.reason ?? '') : (r.err || 'failed'),
  })),
}
