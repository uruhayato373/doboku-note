export const meta = {
  name: 'book-coverage-photos',
  description: '展開した記事に AI 写真を作って入れ、実物どおりかを監査し、判定を記録して記事ごとにコミットする',
  whenToUse: '展開の workflow の後。args は { root: リポジトリの絶対パス, items: [{ article, file, photos: [{ afterHeading, subject }] }] }（Writer の photosWanted から作る。DN-0621）',
  phases: [
    { title: 'Generate', detail: '写真の枠を入れて 1 枚ずつ生成（直列）' },
    { title: 'Audit', detail: 'ai-image-fidelity-auditor が実物どおりかを判定' },
    { title: 'Regenerate', detail: '不合格を作り直す（直列）' },
    { title: 'Reaudit', detail: '作り直した写真を再判定' },
    { title: 'Finalize', detail: '判定を記録し、不合格は外し、記事と台帳をコミット（直列）' },
  ],
}

// 置き場は args で受ける（DN-0621）
const M = args?.root
if (!M || !M.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(M)) throw new Error('args.root にリポジトリの絶対パスを渡す')
const items = args.items ?? []
const DOC = `${M}/.claude/knowledge/reference/book-coverage-expansion.md`
const COMMIT = `node ${M}/scripts/book-coverage-commit.mjs`
const VERDICTS = (f) => `${M}/.tmp/book-coverage/verdicts-${f}.json`

function limiter(n) {
  let active = 0, seq = 0
  const q = []
  const next = () => {
    if (active >= n || !q.length) return
    q.sort((x, y) => y.prio - x.prio || x.seq - y.seq)
    active++
    const { fn, res, rej } = q.shift()
    fn().then(res, rej).finally(() => { active--; next() })
  }
  return (fn, prio = 0) => new Promise((res, rej) => { q.push({ fn, res, rej, prio, seq: seq++ }); next() })
}
const serial = limiter(1) // 台帳の JSON を書く段は直列
const audit = limiter(3)

const PHOTO = { type: 'object', properties: { figKey: { type: 'string' }, prompt: { type: 'string' }, context: { type: 'string', description: '本文の該当箇所の要約（監査用）' } }, required: ['figKey', 'prompt', 'context'] }
const GEN_SCHEMA = { type: 'object', properties: { photos: { type: 'array', items: PHOTO }, skipped: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } }, required: ['photos', 'skipped', 'notes'] }
const VERDICT_SCHEMA = { type: 'object', properties: { verdicts: { type: 'array', items: { type: 'object', properties: { figKey: { type: 'string' }, verdict: { type: 'string', enum: ['ok', 'fail'] }, reason: { type: 'string' } }, required: ['figKey', 'verdict', 'reason'] } } }, required: ['verdicts'] }
const FIN_SCHEMA = { type: 'object', properties: { recorded: { type: 'integer' }, removed: { type: 'array', items: { type: 'string' } }, committed: { type: 'boolean' }, sha: { type: 'string' }, notes: { type: 'string' } }, required: ['recorded', 'removed', 'committed', 'sha', 'notes'] }

const genPrompt = (it) => `記事に AI 写真を入れる。手順は ${DOC} の §3（写真の担当）を最初に読み、その通りにする。作業ディレクトリは ${M}。ファイルは絶対パスで扱い、Bash で別の場所へ cd しない。
記事: ${M}/content/site/${it.article}/article.mdx
入れる写真（記事を書いた担当の希望。位置は直前の見出し・段落）: ${JSON.stringify(it.photos)}
写真 1 枚ごとに:
1. 記事の指定の位置（見出しの節の中、関連する段落の直後）に <ArticleImage src="/posts/${it.article}/img/photo-<英語のスラッグ>.webp" alt="写真の内容を 1 文（80 字以内）" width={960} height={720} /> を入れる（前後に空行）。同じ節に同じ被写体の図・写真が既にあれば入れずに skipped に理由を書く。
2. \`npm run gen-article-photo -- --fig ${it.article}/img/photo-<スラッグ> --prompt "<被写体の指示（英語）>"\` を回す。共通の指示（実写風・4:3・文字なし）はスクリプトが足すので、被写体の形・置き方・状態を具体的に書く。形に自信が無ければ先に一次資料（国交省・厚労省・メーカーの公開資料）の写真や図で確かめる。
3. できた ${M}/content/site/${it.article}/img/photo-<スラッグ>.webp を Read で見て、本文と食い違う形・生成の破綻があれば prompt を直して作り直す（2 回まで）。
編集してよいのは、この記事の article.mdx と img/ だけ（gen-article-photo が図の出典の台帳と AI 写真の判定の台帳を書くのはよい）。git の書き込み操作は禁止。
返答は構造化出力（photos に figKey＝<資格>/<記事>/img/photo-<スラッグ>・最後に使った prompt・本文の該当箇所の要約）。`

const auditPrompt = (it, photos) => `次の写真（AI 生成）が実物どおりかを判定する。記事: ${M}/content/site/${it.article}/article.mdx。写真: ${JSON.stringify(photos)}（画像は ${M}/content/site/<figKey>.webp）。
各写真を Read で見て、記事の該当箇所と生成の指示（prompt）に照らし、実在しない形・本文と食い違う部位・生成の破綻（文字・ロゴ・崩れた部品・ありえない構造）があれば fail、なければ ok。reason に見た根拠を具体的に書く（ok でも、何を確かめたか）。`

const regenPrompt = (it, fails) => `写真の監査で不合格になったものを作り直す。手順は ${DOC} の §3。作業ディレクトリは ${M}。記事: ${M}/content/site/${it.article}/article.mdx。
不合格（figKey・前回の prompt・不合格の理由）: ${JSON.stringify(fails)}
被写体の種類（器械・機械の名前）は本文の記述から変えない。どうしても変わったら alt も写真に合わせて直す。1 枚ずつ、理由を直す prompt に書き換えて \`npm run gen-article-photo -- --fig <figKey> --prompt "<新しい指示>"\` を回し、Read で確かめる（2 回まで）。編集してよいのはこの記事の img/ と article.mdx（alt を合わせる程度）だけ。git の書き込み操作は禁止。
返答は構造化出力（photos に作り直した figKey・最後の prompt・本文の該当箇所の要約。作り直せなかったものは skipped）。`

const finPrompt = (it, verdicts) => `写真の判定を記録して、記事をコミットする。作業ディレクトリは ${M}。ファイルは絶対パスで扱い、Bash で別の場所へ cd しない。記事: ${it.article}
判定: ${JSON.stringify(verdicts)}
1. ok の判定だけを JSON 配列（[{figKey, verdict, reason}]）にして ${VERDICTS(it.file)} に書き、\`node ${M}/scripts/check-image-origin.mjs record-ai ${VERDICTS(it.file)}\` を回す。
2. fail のまま残った写真は外す: article.mdx からその <ArticleImage>（前後の空行も）を消し、img/ の webp を消し、図の出典の台帳（scripts/lib/datasets.mjs の config.figure-sources）の provenance と AI 写真の判定の台帳（state.ai-image-review-ledger）の figures からその figKey の行を消す（JSON の書式は保つ）。
3. \`node ${M}/scripts/check-image-origin.mjs\` を回し、この記事の写真に違反が無いことを確かめる（ほかの記事の違反は無視）。
4. \`${COMMIT} ${it.article} --subject "記事の写真を AI で作って入れる（実物どおりかを監査済み）" --with-ai-ledgers\` を回す。exit 1 で pre-commit が止めたら、この記事の中だけで直してもう一度（最大 3 回）。
git はこのスクリプトの外で使わない。返答は構造化出力（記録した件数・外した figKey・committed・最後に出たコミットの sha）。`

log(`写真を入れる記事 ${items.length} 本・写真 ${items.reduce((n, x) => n + x.photos.length, 0)} 枚`)

const results = await pipeline(
  items,
  (it) => serial(() => agent(genPrompt(it), { label: `gen:${it.article}`, phase: 'Generate', schema: GEN_SCHEMA, model: 'sonnet' })).then((g) => ({ g })),
  (s, it) => {
    if (!s.g?.photos?.length) return s
    return audit(() => agent(auditPrompt(it, s.g.photos), { label: `audit:${it.article}`, phase: 'Audit', schema: VERDICT_SCHEMA, agentType: 'ai-image-fidelity-auditor', model: 'sonnet' }), 1).then((a) => ({ ...s, a }))
  },
  (s, it) => {
    const fails = (s.a?.verdicts ?? []).filter((v) => v.verdict === 'fail')
    if (!fails.length) return s
    const withPrompt = fails.map((f) => ({ ...f, prompt: s.g.photos.find((p) => p.figKey === f.figKey)?.prompt, context: s.g.photos.find((p) => p.figKey === f.figKey)?.context }))
    return serial(() => agent(regenPrompt(it, withPrompt), { label: `regen:${it.article}`, phase: 'Regenerate', schema: GEN_SCHEMA, model: 'sonnet' }), 2).then((r) => ({ ...s, r }))
  },
  (s, it) => {
    if (!s.r?.photos?.length) return s
    return audit(() => agent(auditPrompt(it, s.r.photos), { label: `reaudit:${it.article}`, phase: 'Reaudit', schema: VERDICT_SCHEMA, agentType: 'ai-image-fidelity-auditor', model: 'sonnet' }), 3).then((a2) => ({ ...s, a2 }))
  },
  (s, it) => {
    if (!s.g?.photos?.length) return { article: it.article, ...s }
    const final = new Map((s.a?.verdicts ?? []).map((v) => [v.figKey, v]))
    for (const v of s.a2?.verdicts ?? []) final.set(v.figKey, v)
    for (const p of s.g.photos) if (!final.has(p.figKey)) final.set(p.figKey, { figKey: p.figKey, verdict: 'fail', reason: '監査の結果が無い' })
    return serial(() => agent(finPrompt(it, [...final.values()]), { label: `finalize:${it.article}`, phase: 'Finalize', schema: FIN_SCHEMA, model: 'sonnet' }), 4)
      .then((f) => { log(`${it.article}: 写真 ${f?.recorded ?? 0} 枚・外した ${f?.removed?.length ?? 0} 枚・${f?.committed ? 'コミット' : '未コミット'}`); return { article: it.article, ...s, f } })
  },
)
const rows = results.map((r, i) => r ?? { article: items[i].article, failed: true })
return {
  photos: rows.reduce((n, r) => n + (r.f?.recorded ?? 0), 0),
  removed: rows.flatMap((r) => r.f?.removed ?? []),
  notCommitted: rows.filter((r) => r.g?.photos?.length && !r.f?.committed).map((r) => r.article),
  failed: rows.filter((r) => r.failed).map((r) => r.article),
  skipped: rows.flatMap((r) => (r.g?.skipped ?? []).map((x) => `${r.article}: ${x}`)),
}
