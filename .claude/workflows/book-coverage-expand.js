export const meta = {
  name: 'book-coverage-expand',
  description: '書籍の網羅の展開を記事ごとに執筆（または QA から再開）・修正し、記事 1 本ずつコミットする',
  whenToUse: 'audit-reference-book-coverage --briefs の後。args は { root: リポジトリの絶対パス, items: briefs の items.json の中身, briefsDir?: brief の置き場の絶対パス }（DN-0621・book-coverage-expansion.md §0）',
  phases: [
    { title: 'Write', detail: 'brief から記事へ追記（新規は起こす）・自作 SVG' },
    { title: 'QA', detail: '事実・独自性・規約・図・捏造を確かめる（編集しない）' },
    { title: 'Fix', detail: 'QA の指摘を直す' },
    { title: 'Commit', detail: '記事 1 本ずつ Book-Coverage の trailer でコミットして push（直列）' },
  ],
}

// 置き場は args で受ける（別の PC・worktree でも同じ workflow で回すため。DN-0621）
const M = args?.root
if (!M || !M.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(M)) throw new Error('args.root にリポジトリの絶対パスを渡す')
const items = args.items ?? []
const BRIEFS = args.briefsDir ?? `${M}/.tmp/book-coverage/briefs`
const DOC = `${M}/.claude/knowledge/reference/book-coverage-expansion.md`
const BRIEF = (f) => `${BRIEFS}/${f}.md`
const QAF = (f) => `${BRIEFS}/${f}.qa.md`
const WRITER_JSON = (f) => `${BRIEFS}/${f}.writer.json`
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

const WRITE_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['done', 'nothing-to-add', 'failed'] },
    headingsAdded: { type: 'array', items: { type: 'string' } },
    charsAdded: { type: 'integer' },
    figures: { type: 'array', items: { type: 'string' }, description: '作った SVG のファイル名' },
    photosWanted: { type: 'array', items: { type: 'object', properties: { afterHeading: { type: 'string' }, subject: { type: 'string' } }, required: ['afterHeading', 'subject'] } },
    needsCheck: { type: 'array', items: { type: 'string' }, description: '（要確認）を残した箇所' },
    inboundLinks: { type: 'array', items: { type: 'string' }, description: '新しい記事へ逆向きのリンクを張ってほしい既存記事と節' },
    curriculumHint: { type: 'string', description: '新しい記事のカリキュラムの区分の案（既存記事なら空）' },
    verbatimRewritten: { type: 'integer' },
    notes: { type: 'string' },
  },
  required: ['status', 'headingsAdded', 'charsAdded', 'figures', 'photosWanted', 'needsCheck', 'inboundLinks', 'curriculumHint', 'verbatimRewritten', 'notes'],
}
const QA_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FIX'] },
    issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['高', '中', '低'] }, where: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'where', 'problem', 'fix'] } },
    primarySourcesChecked: { type: 'integer' },
    unverified: { type: 'array', items: { type: 'string' } },
  },
  required: ['verdict', 'issues', 'primarySourcesChecked', 'unverified'],
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

const common = (it) => `作業ディレクトリは ${M}。ファイルは絶対パスで扱い、Bash で別の場所へ cd しない（その場所で回すならサブシェル ( cd ${M} && … )）。記事: ${M}/content/site/${it.article}/article.mdx。
編集してよいのは ${M}/content/site/${it.article}/ の下だけ。git の書き込み操作（add・commit・stash・checkout・reset）は禁止。`

const writePrompt = (it) => `書籍の網羅の判定で決まった追記を、サイトの記事へ書き足す。手順は ${DOC} の §1（Writer）を最初に読み、その通りにする。
${common(it)}
- ${it.new ? '新しい記事として起こす（§1「新しい記事」）。' : '既存の記事に書き足す。'}brief: ${BRIEF(it.file)}（追加 ${it.adds} 件）
- 市販書籍の文字起こし（content/sources/books/**/ocr/）は読まない。
- 追加がすでに記事で扱われていて足すものが無ければ、status を nothing-to-add にして理由を notes に書く。
最後に §1 の完了条件を回し、通してから返答する。返答は構造化出力だけ。`

const qaPrompt = (it, w) => `手順は ${DOC} の §2（QA）。記事 ${M}/content/site/${it.article}/ の今回の追記${it.new ? '（新しい記事なので全体）' : ''}を確かめる。編集はしない。
- 差分: \`git -C ${M} diff -- content/site/${it.article}/\`（新しいファイルは untracked なので直接読む）
- brief: ${BRIEF(it.file)}／読み比べる書籍の節: ${QAF(it.file)}（ここに挙げた OCR の節だけ開く）
- Writer の報告: ${w.fromFile ? `${WRITER_JSON(it.file)}（追加した見出し・図・要確認の箇所。執筆は前の回に済んでいる）` : `追加した見出し ${JSON.stringify(w.headingsAdded)}・図 ${JSON.stringify(w.figures)}・要確認 ${JSON.stringify(w.needsCheck)}`}
返答は構造化出力だけ。`

const fixPrompt = (it, q) => `手順は ${DOC} の §1（Writer）。記事 ${M}/content/site/${it.article}/ について、QA の指摘を直す。
${common(it)}
指摘（重要度順）: ${JSON.stringify(q.issues)}
直したら §1 の完了条件を回し、通ったら gatesPassed を true にする。直さなかった指摘は理由つきで notFixed に入れる。返答は構造化出力だけ。`

const commitPrompt = (it) => `記事 ${it.article} をコミットする。作業ディレクトリは ${M}。
\`${COMMIT} ${it.article} --ids ${it.sources.join(',')} --adds ${it.adds}${it.dn ? ` --dn ${it.dn}` : ''}\` を回す。
exit 1 で pre-commit が止めたら、出力の指摘を ${M}/content/site/${it.article}/ の中だけで直し（手順は ${DOC} §1）、もう一度回す（最大 3 回）。ほかのファイルは触らない。git はこのスクリプトの外で使わない。
返答は構造化出力（committed・最後に出たコミットの sha・回した回数・notes）。`

log(`展開する記事 ${items.length} 本（新規 ${items.filter((x) => x.new).length}・追記 ${items.reduce((n, x) => n + x.adds, 0)} 件）`)

const results = await pipeline(
  items,
  (it) => it.startAt === 'qa'
    ? Promise.resolve({ w: { status: 'done', fromFile: true, headingsAdded: [], charsAdded: 0, figures: [], photosWanted: [], needsCheck: [], inboundLinks: [], curriculumHint: '', verbatimRewritten: 0, notes: '前の回の執筆（writer.json）' } })
    : work(() => agent(writePrompt(it), { label: `write:${it.article}`, phase: 'Write', schema: WRITE_SCHEMA, model: 'sonnet' })).then((w) => ({ w })),
  (s, it) => {
    if (!s.w || s.w.status !== 'done') return s
    return work(() => agent(qaPrompt(it, s.w), { label: `qa:${it.article}`, phase: 'QA', schema: QA_SCHEMA, model: 'sonnet' }), 1).then((q) => ({ ...s, q }))
  },
  (s, it) => {
    if (!s.q || s.q.verdict !== 'FIX') return s
    return work(() => agent(fixPrompt(it, s.q), { label: `fix:${it.article}`, phase: 'Fix', schema: FIX_SCHEMA, model: 'sonnet' }), 2).then((f) => ({ ...s, f }))
  },
  (s, it) => {
    if (!s.w || s.w.status !== 'done') return { article: it.article, ...s }
    if (s.q?.verdict === 'FIX' && !s.f) return { article: it.article, ...s, c: { committed: false, sha: '', retries: 0, notes: 'QA の指摘を直す担当が失敗したのでコミットしない' } }
    if (s.f && !s.f.gatesPassed) return { article: it.article, ...s, c: { committed: false, sha: '', retries: 0, notes: '修正後の完了条件が通らないのでコミットしない' } }
    return commitQ(() => agent(commitPrompt(it), { label: `commit:${it.article}`, phase: 'Commit', schema: COMMIT_SCHEMA, model: 'sonnet' }))
      .then((c) => { log(`${it.article}: ${c?.committed ? `コミット ${c.sha}` : 'コミットせず'}`); return { article: it.article, ...s, c } })
  },
)

const rows = results.map((r, i) => r ?? { article: items[i].article, failed: true })
const committed = rows.filter((r) => r.c?.committed).length
const nothing = rows.filter((r) => r.w?.status === 'nothing-to-add').length
const notCommitted = rows.filter((r) => r.w?.status === 'done' && !r.c?.committed).map((r) => r.article)
log(`コミット ${committed} 本・追記なし ${nothing} 本・未コミット ${notCommitted.length} 本`)
return {
  committed, nothing, notCommitted,
  failed: rows.filter((r) => r.failed || r.w?.status === 'failed').map((r) => r.article),
  rows: rows.map((r) => ({
    article: r.article,
    write: r.w ? { status: r.w.status, headings: r.w.headingsAdded.length, chars: r.w.charsAdded, figures: r.w.figures, photos: r.w.photosWanted, needsCheck: r.w.needsCheck, inbound: r.w.inboundLinks, curriculum: r.w.curriculumHint, notes: r.w.notes.slice(0, 200) } : null,
    qa: r.q ? { verdict: r.q.verdict, issues: r.q.issues.length, high: r.q.issues.filter((x) => x.severity === '高').length, unverified: r.q.unverified } : null,
    fix: r.f ? { fixed: r.f.fixed, notFixed: r.f.notFixed, gates: r.f.gatesPassed } : null,
    commit: r.c ?? null,
  })),
}
