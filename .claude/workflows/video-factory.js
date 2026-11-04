export const meta = {
  name: 'video-factory',
  description: '通常動画を、画像の生成・独立監査・採用・描画・内容QA・画面確認・音声照合・関門まで進め、作成と判定を分けて記録する。転送と予約は親が行う',
  whenToUse: '通常動画の量産。args は { root: リポジトリの絶対パス, packs: [{ pack: "<資格>/<作品>", scope?: "all"|"cover", rendered?: true }]（rendered は制作済みで画像と描画を飛ばす）, rounds?: 作り直しの回数（既定2）, commit?: true }。手順は video-factory.md',
  phases: [
    { title: 'Generate', detail: 'Codex で画像を作る（スクリプトが実行）' },
    { title: 'Audit', detail: 'ai-image-fidelity-auditor が 1 枚ずつ判定' },
    { title: 'Render', detail: '採用・音声・動画・照合（直列）' },
    { title: 'Content QA', detail: 'video-content-qa が 6 軸で採点' },
    { title: 'Screen review', detail: 'video-review が画面と文面を確認' },
    { title: 'Gate', detail: '音声の照合・結線と、関門を通ったときの方針の承認（スクリプトが実行）' },
    { title: 'Commit', detail: '判定と制作記録をコミット（直列）' },
  ],
}

const M = args?.root
if (!M || !M.startsWith('/')) throw new Error('args.root にリポジトリの絶対パスを渡す')
const packs = args.packs ?? []
if (!packs.length) throw new Error('args.packs が空')
const ROUNDS = args.rounds ?? 2
const CLI = `node ${M}/scripts/video-factory.mjs`

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
const VERDICTS = { type: 'object', properties: { verdicts: { type: 'array', items: { type: 'object', properties: { figKey: { type: 'string' }, verdict: { type: 'string', enum: ['ok', 'fail'] }, reason: { type: 'string' } }, required: ['figKey', 'verdict', 'reason'] } }, unjudged: { type: 'array', items: { type: 'string' } } }, required: ['verdicts', 'unjudged'] }
const QA = { type: 'object', properties: { avg: { type: 'number' }, blocks: { type: 'integer' }, findings: { type: 'array', items: { type: 'string' } } }, required: ['avg', 'blocks', 'findings'] }
const REVIEW = { type: 'object', properties: { verdict: { type: 'string', enum: ['pass', 'fail'] }, note: { type: 'string' } }, required: ['verdict', 'note'] }

// モデルに判断させない段。コマンドを実行して結果を返すだけ
const run = (label, phase, commands) => agent(
  `次のコマンドを順に実行し、結果を返す。途中で失敗したら止めて ok=false にする。コマンドを変えない・他の操作をしない・git を使わない。\n${commands.join('\n')}`,
  { label, phase, schema: RUN, model: 'haiku', effort: 'low' })

const auditPrompt = (pack) => `動画 ${pack} の AI 生成画像を判定する。\`${CLI} audit-queue --pack ${pack}\` の項目を 1 枚ずつ Read で見て、定義の軸で判定する（文字の軸を必ず見る）。指示にある文字と 1 字ずつ照合する。作り直し・記録はしない。判定できない画像は unjudged に入れる。`

async function produceImages({ pack, scope = 'all', rendered }) {
  if (rendered) return { ok: true }
  const phase = 'Generate'
  const start = await images(() => run(`plan:${pack}`, phase, [`${CLI} plan --pack ${pack} --scope ${scope}`, `${CLI} generate --pack ${pack}`]))
  if (!start?.ok) return { ok: false, reason: start?.output ?? '生成の段が失敗' }
  for (let round = 0; round <= ROUNDS; round++) {
    const judged = await agent(auditPrompt(pack), { label: `audit:${pack}#${round}`, phase: 'Audit', schema: VERDICTS, agentType: 'ai-image-fidelity-auditor', model: 'sonnet' })
    if (!judged) return { ok: false, reason: '監査の段が失敗' }
    if (judged.unjudged.length) return { ok: false, reason: `判定できない画像: ${judged.unjudged.join(', ')}` }
    const file = `${M}/.tmp/media/${pack}/work/factory/verdicts-${round}.json`
    const fails = judged.verdicts.filter((v) => v.verdict === 'fail')
    const rec = await run(`record:${pack}#${round}`, 'Audit', [`cat > ${file} <<'JSON'\n${JSON.stringify(judged.verdicts)}\nJSON`, `${CLI} record-audit --pack ${pack} --file ${file} --by ai-image-fidelity-auditor`])
    if (!rec?.ok) return { ok: false, reason: rec?.output ?? '判定の記録が失敗' }
    if (!fails.length) return { ok: true }
    log(`${pack}: 不合格 ${fails.length} 枚（${round + 1} 回目）`)
    if (round === ROUNDS) return { ok: false, reason: `作り直しの上限。残り: ${fails.map((f) => `${f.figKey}=${f.reason}`).join(' / ')}` }
    const again = await images(() => run(`regen:${pack}#${round}`, phase, [`${CLI} generate --pack ${pack}`]))
    if (!again?.ok) return { ok: false, reason: again?.output ?? '作り直しが失敗' }
  }
  return { ok: false, reason: '監査が終わらない' }
}

const results = await pipeline(
  packs,
  (item) => produceImages(item),
  (s, item) => {
    if (!s.ok || item.rendered) return s
    return serial(() => run(`render:${item.pack}`, 'Render', [`${CLI} adopt --pack ${item.pack}`, `${CLI} render --pack ${item.pack}`, `${CLI} ledger --pack ${item.pack}`]))
      .then((r) => (r?.ok ? s : { ok: false, reason: r?.output ?? '描画の段が失敗' }))
  },
  (s, item) => {
    if (!s.ok) return s
    return agent(`動画パック ${M}/content/sns/video-packs/${item.pack} を定義どおり採点する。修正と記録はしない。`, { label: `qa:${item.pack}`, phase: 'Content QA', schema: QA, agentType: 'video-content-qa', model: 'sonnet' })
      .then((qa) => (qa ? serial(() => run(`record-qa:${item.pack}`, 'Content QA', [`${CLI} record-qa --pack ${item.pack} --avg ${qa.avg} --blocks ${qa.blocks}`])).then(() => ({ ...s, qa })) : { ok: false, reason: '内容QAの段が失敗' }))
  },
  (s, item) => {
    if (!s.ok) return s
    if (s.qa.blocks > 0 || s.qa.avg < 2) return { ok: false, reason: `内容QAが不合格（平均 ${s.qa.avg}・BLOCK ${s.qa.blocks}）`, qa: s.qa }
    // 公開日時は digest に入るので画面確認より先に決める。音声は LLM の前に機械で見る
    return serial(() => run(`wire:${item.pack}`, 'Gate', [`${CLI} audio-check --pack ${item.pack}`, `${CLI} wire --pack ${item.pack}`]))
      .then((w) => (w?.ok ? s : { ok: false, reason: w?.output ?? '結線の段が失敗', qa: s.qa }))
  },
  (s, item) => {
    if (!s.ok) return s
    return agent(`承認待ちの動画 ${item.pack} の 1 本だけを定義どおり確認し、record まで行う。公開 ID は \`${CLI} status --json\` の該当行の pub。stop・公開はしない。git は使わない。`, { label: `review:${item.pack}`, phase: 'Screen review', schema: REVIEW, agentType: 'video-review', model: 'sonnet' })
      .then((review) => ({ ...s, review }))
  },
  (s, item) => {
    if (s.review?.verdict !== 'pass') return s
    // 運営者がチャットで指示した工程（通常動画の自動予約の方針）。haiku が承認と読んで止めないよう明示する
    return serial(() => agent(`運営者が決めた自動予約の方針にもとづく工程として、次のコマンドを 1 回実行する。関門の判定はコマンド自身が行う。失敗したら ok=false にして出力を返す。他の操作をしない。git を使わない。\n${CLI} auto-approve --pack ${item.pack}`, { label: `gate:${item.pack}`, phase: 'Gate', schema: RUN, model: 'sonnet', effort: 'low' }))
      .then((g) => ({ ...s, gate: g?.ok ? 'approved' : (g?.output ?? '関門の段が失敗') }))
  },
  (s, item) => {
    if (!args.commit || !s.review) return s
    return serial(() => run(`commit:${item.pack}`, 'Commit', [`${CLI} commit --pack ${item.pack}`])).then(() => s)
  },
)

const rows = results.map((r, i) => ({ pack: packs[i].pack, ...(r ?? { ok: false, reason: '段の途中で失敗' }) }))
return {
  approved: rows.filter((r) => r.gate === 'approved').map((r) => r.pack),
  gateFailed: rows.filter((r) => r.gate && r.gate !== 'approved').map((r) => `${r.pack}: ${r.gate}`),
  reviewFailed: rows.filter((r) => r.review?.verdict === 'fail').map((r) => `${r.pack}: ${r.review.note}`),
  stopped: rows.filter((r) => !r.review).map((r) => `${r.pack}: ${r.reason}`),
  qa: rows.filter((r) => r.qa).map((r) => ({ pack: r.pack, avg: r.qa.avg, findings: r.qa.findings })),
}
