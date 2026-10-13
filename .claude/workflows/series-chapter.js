export const meta = {
  name: 'series-chapter',
  description: 'シリーズの台帳の新規の章を、本の項目 → 論点の brief → 執筆 → 軽い QA → 修正 → コミットで 1 章 1 記事ずつ書く',
  whenToUse: 'check-content-series --packet で章の資料を作った後。args は { root: リポジトリの絶対パス, items: [{ series, item, article, books, brief: "agent"|"parent"|"outline", dn? }], facts?: シリーズの事実ファイルの絶対パス }（book-coverage-expansion.md §4）',
  phases: [
    { title: 'Brief', detail: '本の項目を読み、論点だけの brief を書く（brief: "agent" の章だけ。"outline" は確認済みの骨子を使う）' },
    { title: 'Write', detail: 'brief と事実ファイルから新しい記事を書く（本は読まない・画像は作らない）' },
    { title: 'QA', detail: '軽い QA: 事実ファイルに無い値と、見出しが本に似た節だけを確かめる（編集しない）' },
    { title: 'Fix', detail: 'QA の指摘を直す' },
    { title: 'Commit', detail: '記事 1 本ずつコミットして push（直列）' },
  ],
}

// 置き場は args で受ける（別の PC・worktree でも同じ workflow で回すため。book-coverage-expand と同じ）
const M = args?.root
if (!M || !M.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(M)) throw new Error('args.root にリポジトリの絶対パスを渡す')
const items = (args.items ?? []).map((it) => {
  const m = /^content\/site\/([a-z0-9-]+)\/([a-z0-9-]+)\/article\.mdx$/.exec(it.article ?? '')
  if (!m) throw new Error(`item.article は content/site/<区分>/<slug>/article.mdx: ${it.article}`)
  if (!['agent', 'parent', 'outline'].includes(it.brief)) throw new Error(`item.brief は agent・parent・outline のどれか: ${it.item}`)
  return { ...it, key: `${m[1]}/${m[2]}`, slug: m[2], books: it.books ?? [] }
})
const DOC = `${M}/.claude/knowledge/reference/book-coverage-expansion.md`
const FACTS = args.facts ?? `${M}/.claude/knowledge/reference/concrete-practice-sources.md`
const DIR = `${M}/.tmp/book-coverage/series`
const PACKET = (it) => `${DIR}/${it.slug}.packet.md`
// brief: "outline" は台帳で管理する確認済みの骨子（content/sources/series/<シリーズ>/<項目>.md）をそのまま brief にする
const BRIEF = (it) => it.brief === 'outline' ? `${M}/content/sources/series/${it.series}/${it.item}.md` : `${DIR}/${it.slug}.brief.md`
const COMMIT = `node ${M}/scripts/book-coverage-commit.mjs`

/** 同時実行の上限つきの順番待ち。prio の大きい（後の段の）仕事を先に回す。同じ prio は先着順 */
function limiter(n) {
  let active = 0
  let seq = 0
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
const work = limiter(3)   // 同時に動かすのは 3 体まで（CLAUDE.md §5）
const commitQ = limiter(1) // コミットは直列

const BRIEF_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['done', 'failed'] },
    points: { type: 'integer' },
    unitsRead: { type: 'integer' },
    unreadUnits: { type: 'array', items: { type: 'string' }, description: '読めなかった項目 id と理由' },
    notes: { type: 'string' },
  },
  required: ['status', 'points', 'unitsRead', 'unreadUnits', 'notes'],
}
const WRITE_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['done', 'failed'] },
    chars: { type: 'integer', description: '本文の字数' },
    sources: { type: 'array', items: { type: 'string' }, description: 'frontmatter の sources' },
    factsVerified: { type: 'array', items: { type: 'string' }, description: '事実ファイルに無く、新しく確かめた値 — 出典 URL（版・条・頁）' },
    needsCheck: { type: 'array', items: { type: 'string' }, description: '（要確認）を残した箇所' },
    visuals: { type: 'array', items: { type: 'object', properties: { afterHeading: { type: 'string' }, kind: { type: 'string', enum: ['figure', 'photo'] }, subject: { type: 'string' } }, required: ['afterHeading', 'kind', 'subject'] } },
    inboundLinks: { type: 'array', items: { type: 'string' }, description: '新しい記事へ逆向きのリンクを張ってほしい既存記事のパスと節' },
    curriculumHint: { type: 'string', description: 'カリキュラムの区分と並びの案' },
    notes: { type: 'string', description: '200 字以内' },
  },
  required: ['status', 'chars', 'sources', 'factsVerified', 'needsCheck', 'visuals', 'inboundLinks', 'curriculumHint', 'notes'],
}
const QA_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FIX'] },
    issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['高', '中', '低'] }, where: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'where', 'problem', 'fix'] } },
    sectionsComparedWithBook: { type: 'integer', description: '本の文字起こしと読み比べた節の数' },
    primarySourcesChecked: { type: 'integer' },
    unverified: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'issues', 'sectionsComparedWithBook', 'primarySourcesChecked', 'unverified'],
}
const FIX_SCHEMA = {
  type: 'object',
  properties: { fixed: { type: 'integer' }, notFixed: { type: 'array', items: { type: 'string' } }, gatesPassed: { type: 'boolean' }, notes: { type: 'string' } },
  required: ['fixed', 'notFixed', 'gatesPassed', 'notes'],
}
const COMMIT_SCHEMA = {
  type: 'object',
  properties: { committed: { type: 'boolean' }, sha: { type: 'string' }, retries: { type: 'integer' }, notes: { type: 'string' } },
  required: ['committed', 'sha', 'retries', 'notes'],
}

const noGit = 'git の書き込み操作（add・commit・stash・checkout・reset）は禁止。'
const common = (it) => `作業ディレクトリは ${M}。ファイルは絶対パスで扱い、Bash で別の場所へ cd しない（その場所で回すならサブシェル ( cd ${M} && … )）。記事: ${M}/${it.article}。
編集してよいのは ${M}/content/site/${it.key}/ の下だけ。${noGit}`

const briefPrompt = (it) => `シリーズの章の brief を書く。手順と brief の形は ${DOC} の §4「brief の形」。記事は書かない。
- 章の資料: ${PACKET(it)}（割り当てた本の項目。各項目の本文は資料の末尾の ocr/ の part-NN.md を、頁の印 \`<!-- p0112 印字:94 -->\` で grep して、その頁から見出しの区切りまで読む）
- 既存の記事: 資料の「関連記事」と、${M}/content/site/ の同じ主題の記事を grep し、すでに書いてあることを確かめる
- 書くのは ${BRIEF(it)} の 1 つだけ。ほかのファイルは書かない・変えない。${noGit}
返答は構造化出力だけ。`

const writePrompt = (it) => `シリーズの章（${it.series}/${it.item}）の新しい記事を 1 本書く。手順は ${DOC} の §1（Writer・新しい記事）と §4「執筆」を最初に読み、その通りにする。
${common(it)}
- brief: ${BRIEF(it)}（論点だけ。本の文字起こし（ocr/）と ${PACKET(it)} は読まない）${it.brief === 'outline' ? '。骨子の論点ごとの「根拠:」がこの章の出典で、法令の条は e-Gov の条へリンクする。「本:」は補助の項目 id で、本は読まない' : ''}
- 事実: まず ${FACTS} を読み、そこにある値はそのまま使う（出典もそこから）。無い値だけ WebSearch / WebFetch で確かめ、factsVerified に書く。
- 書籍 id（frontmatter の sources に入れる）: ${it.books.length ? it.books.join(', ') : 'なし'}
最後に §1 の完了条件（新しい記事の分も）を回し、通してから返答する。返答は構造化出力だけ。`

const qaPrompt = (it, w) => `${DOC} の §4「軽い QA」で、新しい記事 ${M}/${it.article} を確かめる。編集はしない。${noGit}
- brief: ${BRIEF(it)}／事実ファイル: ${FACTS}（ここにある値は照合済み）／執筆担当が新しく確かめた値: ${JSON.stringify(w.factsVerified)}
- 本との比較: ${it.brief === 'outline' ? '骨子の「本:」に挙げた項目' : `${PACKET(it)} の本の項目`}の見出しの並びと記事の H2・H3 を比べ、似ている節だけ、その項目の文字起こしを開いて読み比べる（本の項目が無ければ飛ばす）
- 40 字一致: \`node ${M}/scripts/check-reference-sources.mjs --deep 2>&1 | grep ${it.slug}\`
- 要確認: ${JSON.stringify(w.needsCheck)}
判定は直さなくてよければ PASS、直す箇所があれば FIX（重要度順に 場所 — 問題 — 直し方（正しい値と出典 URL））。返答は構造化出力だけ。`

const fixPrompt = (it, q) => `手順は ${DOC} の §1・§4。記事 ${M}/${it.article} について、QA の指摘を直す。
${common(it)}
指摘（重要度順）: ${JSON.stringify(q.issues)}
直したら §1 の完了条件を回し、通ったら gatesPassed を true にする。直さなかった指摘は理由つきで notFixed に入れる。返答は構造化出力だけ。`

const commitArgs = (it) => it.books.length
  ? `--ids ${it.books.join(',')}${it.dn ? ` --dn ${it.dn}` : ''}`
  : `--subject "シリーズ ${it.series} の章 ${it.item} を書く"`
const commitPrompt = (it) => `記事 ${it.key} をコミットする。作業ディレクトリは ${M}。
\`${COMMIT} ${it.key} ${commitArgs(it)}\` を回す。
exit 1 で pre-commit が止めたら、出力の指摘を ${M}/content/site/${it.key}/ の中だけで直し（手順は ${DOC} §1）、もう一度回す（最大 3 回）。ほかのファイルは触らない。git はこのスクリプトの外で使わない。
返答は構造化出力（committed・最後に出たコミットの sha・回した回数・notes）。`

log(`書く章 ${items.length} 本（brief を担当が書く ${items.filter((x) => x.brief === 'agent').length}・親が書いた ${items.filter((x) => x.brief === 'parent').length}・確認済みの骨子 ${items.filter((x) => x.brief === 'outline').length}）`)

const results = await pipeline(
  items,
  (it) => it.brief !== 'agent'
    ? Promise.resolve({ b: { status: 'done', points: 0, unitsRead: 0, unreadUnits: [], notes: it.brief === 'outline' ? '確認済みの骨子' : '親が書いた brief' } })
    : work(() => agent(briefPrompt(it), { label: `brief:${it.slug}`, phase: 'Brief', schema: BRIEF_SCHEMA, model: 'sonnet' })).then((b) => ({ b })),
  (s, it) => {
    if (s.b?.status !== 'done') return s
    return work(() => agent(writePrompt(it), { label: `write:${it.slug}`, phase: 'Write', schema: WRITE_SCHEMA, model: 'sonnet' }), 1).then((w) => ({ ...s, w }))
  },
  (s, it) => {
    if (s.w?.status !== 'done') return s
    return work(() => agent(qaPrompt(it, s.w), { label: `qa:${it.slug}`, phase: 'QA', schema: QA_SCHEMA, model: 'sonnet' }), 2).then((q) => ({ ...s, q }))
  },
  (s, it) => {
    if (s.q?.verdict !== 'FIX') return s
    return work(() => agent(fixPrompt(it, s.q), { label: `fix:${it.slug}`, phase: 'Fix', schema: FIX_SCHEMA, model: 'sonnet' }), 3).then((f) => ({ ...s, f }))
  },
  (s, it) => {
    if (s.w?.status !== 'done') return { it, ...s }
    if (s.q?.verdict === 'FIX' && !s.f) return { it, ...s, c: { committed: false, sha: '', retries: 0, notes: 'QA の指摘を直す担当が失敗したのでコミットしない' } }
    if (s.f && !s.f.gatesPassed) return { it, ...s, c: { committed: false, sha: '', retries: 0, notes: '修正後の完了条件が通らないのでコミットしない' } }
    return commitQ(() => agent(commitPrompt(it), { label: `commit:${it.slug}`, phase: 'Commit', schema: COMMIT_SCHEMA, model: 'sonnet' }))
      .then((c) => { log(`${it.key}: ${c?.committed ? `コミット ${c.sha}` : 'コミットせず'}`); return { it, ...s, c } })
  },
)

const rows = results.map((r, i) => r ?? { it: items[i], failed: true })
const committed = rows.filter((r) => r.c?.committed).length
log(`コミット ${committed} 本・未コミット ${rows.length - committed} 本`)
// 親が台帳・事実ファイル・逆向きのリンク・カリキュラムへ入れるもの（§4「親が先にすること」5）
return {
  committed,
  notCommitted: rows.filter((r) => !r.c?.committed).map((r) => `${r.it.key}（${r.failed ? '失敗' : r.b?.status !== 'done' ? 'brief で止まった' : r.w?.status !== 'done' ? '執筆で止まった' : r.c?.notes ?? 'コミットせず'}）`),
  rows: rows.map((r) => ({
    chapter: `${r.it.series}/${r.it.item}`,
    article: r.it.article,
    brief: r.b ? { status: r.b.status, points: r.b.points, unread: r.b.unreadUnits } : null,
    write: r.w ? { status: r.w.status, chars: r.w.chars, sources: r.w.sources, needsCheck: r.w.needsCheck, notes: r.w.notes.slice(0, 200) } : null,
    factsVerified: r.w?.factsVerified ?? [],
    visuals: r.w?.visuals ?? [],
    inboundLinks: r.w?.inboundLinks ?? [],
    curriculumHint: r.w?.curriculumHint ?? '',
    qa: r.q ? { verdict: r.q.verdict, issues: r.q.issues.length, high: r.q.issues.filter((x) => x.severity === '高').length, comparedWithBook: r.q.sectionsComparedWithBook, unverified: r.q.unverified } : null,
    fix: r.f ? { fixed: r.f.fixed, notFixed: r.f.notFixed, gates: r.f.gatesPassed } : null,
    commit: r.c ?? null,
  })),
}
