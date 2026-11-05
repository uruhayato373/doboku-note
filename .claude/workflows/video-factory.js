export const meta = {
  name: 'video-factory',
  description: '通常動画を、画像の生成・独立監査・採用・描画・内容QA・画面確認まで進め、最後に関門を通して承認と記録を書く。転送と予約は親が publish で行う',
  whenToUse: '通常動画の量産。args は { root: リポジトリの絶対パス, packs: [{ pack: "<資格>/<作品>", scope?: "all"|"cover", rendered?: true }]（rendered は制作済みで画像と描画を飛ばす）, rounds?: 作り直しの回数（既定2）, stock?: true（承認せず在庫で止める） }。手順は video-factory.md',
  phases: [
    { title: 'Generate', detail: 'Codex で画像を作る（スクリプトが実行）' },
    { title: 'Audit', detail: 'ai-image-fidelity-auditor が判定して記録する' },
    { title: 'Render', detail: '採用・音声・動画・照合（直列）' },
    { title: 'Content QA', detail: 'video-content-qa が採点し、記録と結線まで行う' },
    { title: 'Screen review', detail: 'video-review が画面と文面を確認して記録する' },
    { title: 'Finish', detail: '音声照合・関門・コミットをまとめて 1 回（スクリプトが実行）' },
  ],
}

// 機械の工程はコマンド 1 本にまとめる。代理エージェント 1 体で約 8 万トークンの文脈を読むため、数を増やさない
const M = args?.root
if (!M || !M.startsWith('/')) throw new Error('args.root にリポジトリの絶対パスを渡す')
const packs = args.packs ?? []
if (!packs.length) throw new Error('args.packs が空')
const ROUNDS = args.rounds ?? 2
const CLI = `node ${M}/scripts/video-factory.mjs`
const STOCK = args.stock ? ' --stock' : ''

function limiter(n) {
  let active = 0
  const q = []
  const next = () => {
    if (active >= n || !q.length) return
    active++
    const { fn, res, rej } = q.shift()
    fn().then(res, rej).finally(() => { active--; next() })
  }
  return (fn) => new Promise((res, rej) => { q.push({ fn, res, rej }); next() })
}
const serial = limiter(1) // VOICEVOX・台帳・git は直列
const images = limiter(2) // Workflow の並行の上限に合わせる

const RUN = { type: 'object', properties: { ok: { type: 'boolean' }, output: { type: 'string', description: 'コマンドの最後の JSON 行または失敗の内容' } }, required: ['ok', 'output'] }
const AUDIT = { type: 'object', properties: { verdicts: { type: 'array', items: { type: 'object', properties: { figKey: { type: 'string' }, verdict: { type: 'string', enum: ['ok', 'fail'] }, reason: { type: 'string' } }, required: ['figKey', 'verdict', 'reason'] } }, unjudged: { type: 'array', items: { type: 'string' } } }, required: ['verdicts', 'unjudged'] }
const QA = { type: 'object', properties: { avg: { type: 'number' }, blocks: { type: 'integer' }, wired: { type: 'boolean' }, findings: { type: 'array', items: { type: 'string' } } }, required: ['avg', 'blocks', 'wired', 'findings'] }
const REVIEW = { type: 'object', properties: { verdict: { type: 'string', enum: ['pass', 'fail'] }, note: { type: 'string' } }, required: ['verdict', 'note'] }

// モデルに判断させない段。コマンドを実行して結果を返すだけ
const run = (label, phase, command) => agent(
  `次のコマンドを実行し、結果を返す。Bash は timeout 600000 で実行し、run_in_background は使わない。timeout で止まったら同じコマンドをもう一度実行する（生成済みは飛ばされる）。ok は終了コードだけで決める（0 なら true）。出力の JSON の ok や unaudited は監査前の件数なので判定に使わない。コマンドを変えない・他の操作をしない・git を使わない。\n${command}`,
  { label, phase, schema: RUN, model: 'haiku', effort: 'low' })

const auditPrompt = (pack, round) => `動画 ${pack} の AI 生成画像を判定する。\`${CLI} audit-queue --pack ${pack}\` の項目を 1 枚ずつ Read で見て、定義の軸で判定する（文字の軸を必ず見る）。指示にある文字と 1 字ずつ照合する。作り直しはしない。判定できない画像は unjudged に入れて記録しない。
判定は [{"figKey","verdict":"ok|fail","reason"}] の JSON を ${M}/.tmp/media/${pack}/work/factory/verdicts-${round}.json に書き、\`${CLI} record-audit --pack ${pack} --file <そのファイル> --by ai-image-fidelity-auditor\` で記録する（この記録は定義の範囲内の作業）。同じ判定を verdicts で返す。`

async function produceImages({ pack, scope = 'all', rendered }) {
  if (rendered) return { ok: true }
  const start = await images(() => run(`plan:${pack}`, 'Generate', `${CLI} plan --pack ${pack} --scope ${scope} && ${CLI} generate --pack ${pack}`))
  if (!start?.ok) return { ok: false, reason: start?.output ?? '生成の段が失敗' }
  for (let round = 0; round <= ROUNDS; round++) {
    const judged = await agent(auditPrompt(pack, round), { label: `audit:${pack}#${round}`, phase: 'Audit', schema: AUDIT, agentType: 'ai-image-fidelity-auditor', model: 'sonnet' })
    if (!judged) return { ok: false, reason: '監査の段が失敗' }
    if (judged.unjudged.length) return { ok: false, reason: `判定できない画像: ${judged.unjudged.join(', ')}` }
    // 件数はモデルの申告を使わず、判定の中身から数える（2026-11-05 に 2 枚の不合格を 0 件と返した）
    const fails = judged.verdicts.filter((v) => v.verdict === 'fail')
    if (!fails.length) return { ok: true }
    log(`${pack}: 不合格 ${fails.length} 枚（${round + 1} 回目）`)
    if (round === ROUNDS) return { ok: false, reason: `作り直しの上限。残り: ${fails.map((f) => `${f.figKey}=${f.reason}`).join(' / ')}` }
    const again = await images(() => run(`regen:${pack}#${round}`, 'Generate', `${CLI} generate --pack ${pack}`))
    if (!again?.ok) return { ok: false, reason: again?.output ?? '作り直しが失敗' }
  }
  return { ok: false, reason: '監査が終わらない' }
}

const results = await pipeline(
  packs,
  (item) => produceImages(item),
  (s, item) => {
    if (!s.ok || item.rendered) return s
    return serial(() => run(`render:${item.pack}`, 'Render', `${CLI} produce --pack ${item.pack}`))
      .then((r) => (r?.ok ? s : { ok: false, reason: r?.output ?? '描画の段が失敗' }))
  },
  (s, item) => {
    if (!s.ok) return s
    const prompt = `動画パック ${M}/content/sns/video-packs/${item.pack} を定義どおり採点する。修正はしない。採点のあと、平均 2 以上かつ BLOCK 0 なら \`${CLI} record-qa --pack ${item.pack} --avg <平均> --blocks <件数> && ${CLI} wire --pack ${item.pack}${STOCK}\` を実行して wired=true を返す。不合格なら \`record-qa\` だけを実行して wired=false を返す。`
    return serial(() => agent(prompt, { label: `qa:${item.pack}`, phase: 'Content QA', schema: QA, agentType: 'video-content-qa', model: 'sonnet' }))
      .then((qa) => (qa?.wired ? { ...s, qa } : { ok: false, reason: qa ? `内容QAが不合格（平均 ${qa.avg}・BLOCK ${qa.blocks}）` : '内容QAの段が失敗', qa }))
  },
  (s, item) => {
    if (!s.ok) return s
    return agent(`動画 ${item.pack} の 1 本だけを定義どおり確認し、record まで行う。公開 ID は \`${CLI} status --json\` の該当行の pub。npm run は必ず \`( cd ${M} && npm run -s video-review -- ... )\` の形で実行する（作業場所を間違えると判定が別の場所へ書かれる）。stop・公開はしない。git は使わない。`, { label: `review:${item.pack}`, phase: 'Screen review', schema: REVIEW, agentType: 'video-review', model: 'sonnet' })
      .then((review) => ({ ...s, review }))
  },
)

const rows = results.map((r, i) => ({ pack: packs[i].pack, ...(r ?? { ok: false, reason: '段の途中で失敗' }) }))
const passed = rows.filter((r) => r.review?.verdict === 'pass').map((r) => r.pack)
// 運営者が決めた自動予約の方針にもとづく工程。関門の判定はコマンド自身が行う
const finish = passed.length
  ? await agent(`運営者が決めた通常動画の自動予約の方針にもとづく工程として、次のコマンドを 1 回実行し、最後の JSON を output に返す。関門の判定はコマンド自身が行う。他の操作をしない。\n${CLI} finish --packs ${passed.join(',')}${STOCK}`, { label: 'finish', phase: 'Finish', schema: RUN, model: 'sonnet', effort: 'low' })
  : null
return {
  finish: finish?.output ?? null,
  reviewFailed: rows.filter((r) => r.review?.verdict === 'fail').map((r) => `${r.pack}: ${r.review.note}`),
  stopped: rows.filter((r) => !r.review).map((r) => `${r.pack}: ${r.reason}`),
  qa: rows.filter((r) => r.qa).map((r) => ({ pack: r.pack, avg: r.qa.avg, findings: r.qa.findings })),
}
