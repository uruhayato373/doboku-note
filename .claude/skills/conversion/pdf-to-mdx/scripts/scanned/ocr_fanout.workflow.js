// スキャン書籍 本文OCR ファンアウト Workflow テンプレート。
//
// Workflow ツールに本ファイルを script として渡し、args に下記を渡す:
//   {
//     "outDir": "C:\\tmp\\xxx-ocr\\out",   // = manifest.outDir
//     "batchSize": 6,
//     "chapters": [ { "id":"01","pdf":"第１章_土工","title":"第1章 土工","pages":142,"dir":"C:\\tmp\\xxx-ocr\\ch01" }, ... ]
//   }
// （= manifest.json の chapters と outDir/batchSize をそのまま渡せばよい）
//
// 各バッチ(6p)を scanned-textbook-transcriber に逐語OCRさせ、outDir/NN__bMM.md へ Write。
// 戻り値は軽量ステータス（巨大テキストは親に通さない）。完了後は concat_chapters.py で連結。
//
// 実績: 施工管理・法規編327p=59バッチ / 土木一般編385p=65バッチ いずれも失敗0・U+FFFD0。
export const meta = {
  name: 'scanned-ocr-fanout',
  description: 'スキャン書籍の本文を章バッチ(6p/agent)でファンアウト高解像度OCRし、章別バッチmdをtmpへ出力',
  phases: [{ title: 'OCR', detail: 'scanned-textbook-transcriber バッチ' }],
}

const cfg = typeof args === 'string' ? JSON.parse(args) : args
const BATCH = cfg.batchSize || 6
const pad2 = (n) => String(n).padStart(2, '0')

const batches = []
for (const ch of cfg.chapters) {
  const imgs = []
  for (let i = 0; i < ch.pages; i++) imgs.push(`${ch.dir}\\p${pad2(i)}.png`)
  for (let b = 0; b * BATCH < ch.pages; b++) {
    batches.push({ chId: ch.id, chTitle: ch.title, bi: b, images: imgs.slice(b * BATCH, (b + 1) * BATCH),
      outFile: `${cfg.outDir}\\${ch.id}__b${pad2(b)}.md` })
  }
}
const totalPages = cfg.chapters.reduce((s, c) => s + c.pages, 0)
log(`OCR ${batches.length}バッチ / 全${totalPages}ページ`)

const STATUS = {
  type: 'object', additionalProperties: false,
  properties: { ok: { type: 'boolean' }, pagesTranscribed: { type: 'integer' }, chars: { type: 'integer' },
    figurePlaceholders: { type: 'integer' }, sectionHeadings: { type: 'array', items: { type: 'string' } },
    printedPageRange: { type: 'string' }, uffffdZero: { type: 'boolean' } },
  required: ['ok', 'pagesTranscribed', 'chars', 'uffffdZero'],
}

const buildPrompt = (B) => {
  const list = B.images.map((p, i) => `${i + 1}. ${p}`).join('\n')
  return `スキャン教材「${B.chTitle}」の一部ページを逐語Markdown文字起こしする。公開MDXでなく内部リファレンス（著作権上、公開・note転載しない）。

## 入力（事前レンダリング済み・高解像度・正立・単ページ・回転不要）
${list}

上記 ${B.images.length} 枚すべてを **必ず1枚ずつ Read** し、読み順に**ほぼ逐語**で文字起こし（要約・言い換え・省略・推測補完をしない。小さい漢字・送り仮名の読み飛ばし厳禁）。

## 出力先（このパスへ Write。章の一部バッチ。H1や出典は付けない＝後で章単位に連結）
${B.outFile}

## 書式ルール
- frontmatter / H1 / 出典ブロック なし。**このバッチの本文だけ**を書く。
- 各ページ先頭に印字ノンブルで \`<!-- p.NN -->\`（無番ページは \`<!-- p.? -->\`）。
- 番号付き大項目は \`## \`、下位は \`### \`/\`#### \`。章扉目次は \`## 章内目次\` の箇条書き。
- 箇条書き・番号リスト・定義は原文どおり。**表は Markdown table**（図扱いにしない）。
- 法令条文・白書・通達の引用、囲み解説は blockquote（\`> \`）。
- **図・写真・グラフ・フロー図**は本文化せず、出現位置に**単独行**で \`（図: 図番号 簡潔な内容説明）\` のプレースホルダ。
- 文字化け（U+FFFD）を残さない。判読不能箇所のみ \`〔判読不能〕\`。

## 完了条件
- 担当 ${B.images.length} ページを漏れなく転記し、指定パスへ Write 済み。U+FFFD 0 を自己確認。戻り値は構造化ステータスのみ。`
}

phase('OCR')
const results = await parallel(
  batches.map((B) => () =>
    agent(buildPrompt(B), { label: `ocr:${B.chId}b${pad2(B.bi)}`, phase: 'OCR',
      agentType: 'scanned-textbook-transcriber', schema: STATUS })
      .then((r) => ({ chId: B.chId, bi: B.bi, status: r }))
      .catch(() => ({ chId: B.chId, bi: B.bi, status: null }))
  )
)
const ok = results.filter((r) => r && r.status && r.status.ok)
const bad = results.filter((r) => !r || !r.status || !r.status.ok)
log(`完了 ${ok.length}/${batches.length}・失敗${bad.length}`)
return { totalBatches: batches.length, okBatches: ok.length,
  failedBatches: bad.map((r) => `${r.chId}b${r.bi}`) }
