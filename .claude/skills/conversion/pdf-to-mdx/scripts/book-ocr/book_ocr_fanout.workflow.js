// 参考文献 bundle の視覚OCR ファンアウト（第1読・Sonnet）。
//
// args（book_ocr_prep.py の jobs.json から必要な項目だけ渡す）:
//   { sourceId, title, pagesDir, outDir, batchSize, pageIds: ["p0001", ...],
//     hints: "書籍固有の転記ルール（任意）", onlyBatches: [3, 7] （任意・取り直し用） }
//
// 各バッチ（6ページ）を scanned-textbook-transcriber に逐語転記させ outDir/bNNN.md へ Write。
// マーカーは画像 id（<!-- p0001 -->）。印字ノンブルが見えるときだけ 印字:NN を併記。
// 読めない箇所は〔判読不能〕、切れ・隠れは〔欠落: 理由〕。推測で埋めない。
export const meta = {
  name: 'book-ocr-fanout',
  description: '参考文献bundleのページ画像を6ページ/体で逐語OCRしバッチmdへ書く（第1読）',
  phases: [{ title: 'OCR', detail: 'scanned-textbook-transcriber（sonnet）' }],
}

const cfg = typeof args === 'string' ? JSON.parse(args) : args
const BATCH = cfg.batchSize || 6
const pad3 = (n) => String(n).padStart(3, '0')
const only = cfg.onlyBatches ? new Set(cfg.onlyBatches) : null

const batches = []
for (let i = 0; i * BATCH < cfg.pageIds.length; i++) {
  if (only && !only.has(i)) continue
  const ids = cfg.pageIds.slice(i * BATCH, (i + 1) * BATCH)
  batches.push({ bi: i, ids, images: ids.map((id) => `${cfg.pagesDir}/${id}.jpg`),
    outFile: `${cfg.outDir}/b${pad3(i)}.md` })
}
log(`${cfg.sourceId}: OCR ${batches.length} バッチ / ${batches.reduce((s, b) => s + b.ids.length, 0)} ページ`)

const STATUS = {
  type: 'object', additionalProperties: false,
  properties: {
    ok: { type: 'boolean' }, pagesTranscribed: { type: 'integer' }, chars: { type: 'integer' },
    unreadable: { type: 'integer', description: '〔判読不能〕の個数' },
    gaps: { type: 'integer', description: '〔欠落: …〕の個数' },
    uffffdZero: { type: 'boolean' }, markersOk: { type: 'boolean', description: '画像idマーカーを順に1回ずつ書いた' },
    note: { type: 'string' },
  },
  required: ['ok', 'pagesTranscribed', 'chars', 'unreadable', 'gaps', 'uffffdZero', 'markersOk'],
}

const buildPrompt = (B) => {
  const list = B.ids.map((id, i) => `${i + 1}. ${id}  →  ${B.images[i]}`).join('\n')
  return `書籍「${cfg.title}」のページ画像 ${B.ids.length} 枚を、読み順にほぼ逐語で Markdown に文字起こしする。
内部リファレンス（著作権上、公開・転載しない）。

## 入力（事前レンダリング済み・正立・1画像＝書籍1ページ）
${list}

上の ${B.ids.length} 枚を **必ず1枚ずつ Read** する。読まずに書かない。

## 出力先（この1ファイルへ Write。frontmatter・H1・出典は付けない＝後で連結する）
${B.outFile}

## ページマーカー（機械で照合するので厳守）
- 各ページ本文の先頭に、その画像の id を **\`<!-- p0001 -->\` の形で1回だけ**書く（上の一覧の id をそのまま使う。順番も一覧どおり）。
- 版面に印字ノンブルが見えるときだけ \`<!-- p0001 印字:62 -->\` と併記する。見えなければ id だけ。
- マーカーは全 ${B.ids.length} 枚ぶん必要。空白ページ・図だけのページでもマーカーは書き、本文は \`（図: …）\` か \`（本文なし）\`。

## 転記ルール
- **要約・言い換え・省略・推測補完をしない**。送り仮名・小さい漢字・数値・単位・記号を版面どおりに。
- **読めない箇所は \`〔判読不能〕\`**。指・影・切れ・かすれで文字が見えないなら、前後の文脈から埋めずに \`〔欠落: 右端が切れている〕\` のように理由付きで書く。**自然な日本語に見せるための補完は禁止**。
- 柱（ページ上部の章名・節名の繰り返し）・フッター・ノンブル・電子書籍アプリのUI（位置No.・進捗バー等）は本文に入れない。
- ページをまたいで続く文はそのまま続ける（マーカーだけ挟む）。
- 見出し: 章・節の大見出し（「2-4 セメントの種類」のような番号付き）は \`## \`、小見出し（記号付き・太字の中見出し）は \`### \`、(1)(2) や小項目は \`#### \`。本文中の①②③・ア・イは見出しにしない。
- 太字は \`**…**\`。箇条書き・番号リストは原文どおり。
- **表は Markdown table**。図・写真・グラフ・フロー図は本文化せず、出現位置に単独行で \`（図: 図番号 内容の要約）\`。
- 囲み記事・引用ボックスは blockquote（\`> \`）。
- U+FFFD（文字化け記号）を残さない。
${cfg.hints ? `\n## この書籍の固有ルール\n${cfg.hints}\n` : ''}
## 完了条件
- ${B.ids.length} 枚すべてを転記し、outFile へ Write 済み。マーカーが順に1回ずつあること、U+FFFD 0 を自己確認。
- 戻り値は構造化ステータスのみ（本文を返さない）。`
}

phase('OCR')
const results = await parallel(
  batches.map((B) => () =>
    agent(buildPrompt(B), { label: `ocr:${cfg.sourceId}:b${pad3(B.bi)}`, phase: 'OCR',
      agentType: 'scanned-textbook-transcriber', schema: STATUS, effort: 'medium' })
      .then((r) => ({ bi: B.bi, status: r }))
      .catch(() => ({ bi: B.bi, status: null }))
  )
)
const ok = results.filter((r) => r && r.status && r.status.ok && r.status.markersOk && r.status.uffffdZero)
const bad = results.filter((r) => !(r && r.status && r.status.ok && r.status.markersOk && r.status.uffffdZero))
const sum = (k) => ok.reduce((s, r) => s + (r.status[k] || 0), 0)
log(`完了 ${ok.length}/${batches.length}・失敗 ${bad.length}・字数 ${sum('chars')}・判読不能 ${sum('unreadable')}・欠落 ${sum('gaps')}`)
return { sourceId: cfg.sourceId, totalBatches: batches.length, okBatches: ok.length,
  chars: sum('chars'), unreadable: sum('unreadable'), gaps: sum('gaps'),
  failedBatches: bad.map((r) => r.bi) }
