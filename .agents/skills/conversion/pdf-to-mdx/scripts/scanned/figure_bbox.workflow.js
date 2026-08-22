// スキャン書籍 図領域(bbox)検出 Workflow テンプレート。
//
// Workflow ツールに本ファイルを script として渡し、args に下記を渡す:
//   {
//     "thumbDir": "C:\\tmp\\xxx-ocr\\thumbs",      // = manifest.thumbDir
//     "groupSize": 40,                              // 何図ずつ順次バリア処理するか
//     "jobFiles": ["C:\\tmp\\xxx-ocr\\figjobs_01.json", ...]  // prep_figures.py の章別ジョブ
//   }
//
// 完了後、返り値の results を WORK_ROOT/bbox.json に保存 → crop_embed_figures.py でクロップ＆埋め込み。
//
// 設計の肝（今回の知見＝てこずった点の対策）:
//  1) ジョブはファイル経由。全図(数百)を args に inline すると肥大して破綻するため、
//     章別ジョブファイルを **コーディネータagentがReadし構造化返却**（schemaで確実にパース）。
//  2) **groupSize ずつ順次 parallel バリア**でAPI負荷を平準化＝レート制限を回避
//     （135図を一括parallelした際は29図がサーバ側レート制限で失敗した。40図/群で322図は失敗0）。
//  3) 各図は候補ページ窓(±N)の中からキャプション照合で1枚を選ばせ、0–1比率のbboxを返す
//     （マーカー↔ページのズレに強い）。確信度も返させ、crop側で低確信度を除外する。
export const meta = {
  name: 'scanned-figure-bbox',
  description: 'スキャン書籍の図領域検出。章別ジョブをファイル読込→groupSizeずつ順次グループ処理(レート制限抑制)',
  phases: [{ title: 'Load', detail: '章別ジョブ読込' }, { title: 'BBox', detail: 'civil-exam-figure-extractor 群順次' }],
}

const cfg = typeof args === 'string' ? JSON.parse(args) : args
const pad2 = (n) => String(n).padStart(2, '0')
const GROUP = cfg.groupSize || 40

const JOBS_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { jobs: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: { figId: { type: 'string' }, chId: { type: 'string' },
      caption: { type: 'string' }, candPages: { type: 'array', items: { type: 'integer' } } },
    required: ['figId', 'chId', 'caption', 'candPages'] } } },
  required: ['jobs'],
}

phase('Load')
const loaded = await parallel(
  cfg.jobFiles.map((fp) => () =>
    agent(`Read the file ${fp} using the Read tool. It contains a single-line JSON object {"jobs":[{"figId":..,"chId":..,"caption":..,"candPages":[..]}, ...]}. Return its "jobs" array EXACTLY as-is — every element unchanged (figId, chId, caption, candPages). Do not summarize, translate, add, drop, reorder, or truncate.`,
      { label: `load:${fp.split('\\').pop()}`, phase: 'Load', schema: JOBS_SCHEMA })
      .then((r) => (r && r.jobs) ? r.jobs : []).catch(() => [])
  )
)
const jobs = loaded.flat()
log(`ジョブ読込 ${jobs.length}図`)

const BBOX_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { found: { type: 'boolean' }, chosenPage: { type: 'integer' },
    x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' },
    confidence: { type: 'number' }, note: { type: 'string' } },
  required: ['found', 'chosenPage', 'x', 'y', 'w', 'h'],
}

const buildPrompt = (J) => {
  const cands = J.candPages.map((pp) => `- pageIndex=${pp}: ${cfg.thumbDir}\\ch${J.chId}\\p${pad2(pp)}.png`).join('\n')
  return `スキャン教材ページ画像群（第${parseInt(J.chId, 10)}章）から、下記キャプションに対応する**1つの図/表/写真**を探し、領域(bbox)を返す。

## 対象（MD文字起こしのキャプション）
${J.caption}

## 候補ページ画像（このうち**ちょうど1枚**に対象がある。全て Read して見比べる）
${cands}

## 手順
1. 各候補を Read し、図番号（例「図1.10」「表1.43」「写真2.1」）と内容に最も合致するページを1枚特定。
2. 領域 bbox を**選んだページの左上(0,0)・右下(1,1)の比率**で返す（x,y=左上, w,h=幅高さ）。本体＋図番号キャプション行を含み本文は極力含めない。上下左右1〜2%余白。ほぼ全面なら w,h≈0.9。
3. どの候補にも無ければ found=false, chosenPage=-1。

## 返り値（構造化のみ）
found / chosenPage(候補のpageIndex整数, 無ければ-1) / x,y,w,h(0〜1) / confidence(0〜1) / note(短く根拠)`
}

phase('BBox')
const results = []
for (let i = 0; i < jobs.length; i += GROUP) {
  const slice = jobs.slice(i, i + GROUP)
  const part = await parallel(
    slice.map((J) => () =>
      agent(buildPrompt(J), { label: `bbox:${J.figId}`, phase: 'BBox',
        agentType: 'civil-exam-figure-extractor', schema: BBOX_SCHEMA })
        .then((r) => ({ figId: J.figId, chId: J.chId, caption: J.caption, result: r }))
        .catch((e) => ({ figId: J.figId, chId: J.chId, caption: J.caption, result: null, err: String(e) }))
    )
  )
  results.push(...part)
  log(`bbox 進捗 ${Math.min(i + GROUP, jobs.length)}/${jobs.length}`)
}
const found = results.filter((r) => r && r.result && r.result.found)
log(`完了 found=${found.length}/${jobs.length}`)
return {
  total: jobs.length,
  results: results.map((r) => ({ figId: r.figId, chId: r.chId, caption: r.caption,
    found: r.result ? r.result.found : false, chosenPage: r.result ? r.result.chosenPage : -1,
    x: r.result ? r.result.x : 0, y: r.result ? r.result.y : 0, w: r.result ? r.result.w : 0, h: r.result ? r.result.h : 0,
    confidence: r.result ? (r.result.confidence ?? null) : null,
    note: r.result ? (r.result.note ?? '') : (r.err || 'failed') })),
}
