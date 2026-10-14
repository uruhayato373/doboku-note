#!/usr/bin/env node
/**
 * add-standards-document.mjs — 公的基準の原本 PDF 1 冊を全文ライブラリ（content/site/standards-library/）へ足す。
 *
 * なぜ要るか: 既存 72 文書は外部の文字起こし工程（.tmp/mlit-national-transcription の manifest・QA を
 * build-standards-library.mjs が一括で読む）で作ったが、その工程の手順はリポジトリに無く、1 冊足すたびに
 * 全体を作り直すこともできない。ここでは同じ形式（pdftotext -layout のページ単位の逐語・50 ページの分冊・
 * catalog.json の 1 行）を 1 冊ぶんだけ作る（DN-0393・施工管理基準の本省版から）。
 *
 * 照合（既存の dual-extraction-checked と同じ考え方）:
 *   pdftotext -layout の各ページと、別の抽出器（PyMuPDF）の同じページを、空白を除いた文字の多重集合で比べる。
 *   一致したページは dual-extraction-checked。一致しない・文字の少ないページは目視の対象として出力し、
 *   人かエージェントがページ画像を見た結果を content/sources/standards/{agency}/{document}/visual-review.json に
 *   書いてから再実行する（{ "<page>": { "status": "text-layer-confirmed" | "visual-transcribed", "batch": "…", "text"?: "…" } }）。
 *   目視が残っている間は --commit を拒否する（未確認を確認済みとして公開しない）。
 *
 * 使い方:
 *   node scripts/add-standards-document.mjs --pdf <原本.pdf> --agency mlit --agency-name 国土交通省 \
 *     --document sekou-kanri-kijun --title "…" --landing <掲載ページ URL> --source-url <PDF の URL> \
 *     [--edition 令和8年3月] [--role companion] [--render-pending <出力ディレクトリ>] [--commit]
 *   --commit が無ければ照合の結果だけを出す。--render-pending は目視が要るページを PNG に描き出す。
 * 必要なもの: pdftotext（poppler）と python + PyMuPDF（fitz）。
 * exit: 0 成功 / 1 目視が残っている・検査不成立 / 2 引数不正
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { formatJson, parseJson } from './lib/json-io.mjs';
import { CONTENT_SOURCES_ROOT, REPO_ROOT, SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const TAG = '[add-standards-document]';
const LIBRARY = join(SITE_CONTENT_ROOT, 'standards-library');
const CATALOG = join(LIBRARY, 'catalog.json');
const PART_PAGES = 50;
const TEXT_POOR_CHARS = 30;
// 記号フォントの文字は私用領域（U+E000–F8FF）に入り、サイトでは化けて出る（施工管理基準 p30 の「＝」「－」）。
const PRIVATE_USE = /[-]/u;

const flags = parseCliArgs({
  pdf: { type: 'string' },
  agency: { type: 'string' },
  'agency-name': { type: 'string' },
  document: { type: 'string' },
  title: { type: 'string' },
  landing: { type: 'string' },
  'source-url': { type: 'string' },
  edition: { type: 'string' },
  role: { type: 'string', default: 'companion' },
  'render-pending': { type: 'string' },
  commit: { type: 'boolean' },
});

function die(message, code = 1) {
  console.error(`${TAG} ${message}`);
  process.exit(code);
}

for (const name of ['pdf', 'agency', 'agencyName', 'document', 'title', 'landing', 'sourceUrl']) {
  if (!flags[name]) die(`--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} が必要`, 2);
}
if (!/^[a-z][a-z0-9-]*$/.test(flags.agency) || !/^[a-z][a-z0-9-]*$/.test(flags.document)) die('--agency・--document は英小文字・数字・- だけ', 2);
if (!existsSync(flags.pdf)) die(`原本が無い: ${flags.pdf}`, 2);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
/** 空白を除き、文字の並び順に依存しない比較のために並べ替える（表の読み順は抽出器ごとに違う）。 */
export const charMultiset = (text) => [...text.normalize('NFKC').replace(/\s+/gu, '')].sort().join('');

const pdfBytes = readFileSync(flags.pdf);
const layout = execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', flags.pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\f');
if (layout.length && layout[layout.length - 1] === '') layout.pop();
const pyCode = 'import fitz,json,sys\nd=fitz.open(sys.argv[1])\nsys.stdout.reconfigure(encoding="utf-8")\nprint(json.dumps([p.get_text() for p in d],ensure_ascii=False))';
const mupdf = parseJson(execFileSync('python', ['-X', 'utf8', '-c', pyCode, flags.pdf], { encoding: 'utf8', maxBuffer: 1 << 28 }), 'PyMuPDF');
if (layout.length !== mupdf.length) die(`抽出器でページ数が違う（pdftotext ${layout.length} / PyMuPDF ${mupdf.length}）。検査不成立`);
const pages = layout.length;

const reviewDir = join(CONTENT_SOURCES_ROOT, 'standards', flags.agency, flags.document);
const reviewFile = join(reviewDir, 'visual-review.json');
const reviews = existsSync(reviewFile) ? parseJson(readFileSync(reviewFile, 'utf8'), reviewFile) : {};

const pageRecords = [];
const pending = [];
for (let i = 0; i < pages; i++) {
  const page = i + 1;
  const text = layout[i].replace(/\s+$/u, '');
  const textPoor = text.replace(/\s+/gu, '').length < TEXT_POOR_CHARS;
  const privateUse = PRIVATE_USE.test(layout[i]);
  const matched = !textPoor && !privateUse && charMultiset(layout[i]) === charMultiset(mupdf[i]);
  const review = reviews[String(page)];
  if (matched) pageRecords.push({ page, text, marker: 'extraction: pdftotext-layout; review: dual-extraction-checked' });
  else if (review) {
    if (!['text-layer-confirmed', 'visual-transcribed'].includes(review.status)) die(`visual-review.json の p${page} の status が不正: ${review.status}`);
    pageRecords.push({ page, text: review.status === 'visual-transcribed' ? String(review.text ?? '').replace(/\s+$/u, '') : text, marker: `extraction: visual-review; status: ${review.status}; batch: ${review.batch ?? 'unbatched'}`, visual: true });
  } else pending.push({ page, reason: textPoor ? 'text-poor' : privateUse ? 'private-use' : 'extractor-mismatch' });
}
if (pageRecords.some((r) => r.text.includes('�'))) die('U+FFFD を含むページがある。検査不成立');
const leftPrivateUse = pageRecords.filter((r) => PRIVATE_USE.test(r.text)).map((r) => `p${r.page}`);
if (leftPrivateUse.length) die(`私用領域の文字が残っている（${leftPrivateUse.join('・')}）。visual-transcribed で読める文字に直す`);

const visualReviewed = pageRecords.filter((r) => r.visual).length;
console.log(`${TAG} ${flags.agency}/${flags.document}: ${pages} ページを実検査 / 2 抽出器で一致 ${pages - visualReviewed - pending.length} / 目視済み ${visualReviewed} / 目視待ち ${pending.length}`);
const REASON = { 'text-poor': '文字が少ない', 'private-use': '私用領域の文字がある', 'extractor-mismatch': '抽出器で文字が食い違う' };
for (const p of pending) console.log(`  目視待ち p${p.page}（${REASON[p.reason]}）`);

if (flags.renderPending && pending.length) {
  mkdirSync(flags.renderPending, { recursive: true });
  const renderCode = 'import fitz,sys\nd=fitz.open(sys.argv[1])\nfor n in sys.argv[3:]:\n  d[int(n)-1].get_pixmap(dpi=110).save(f"{sys.argv[2]}/p{int(n):04d}.png")';
  execFileSync('python', ['-X', 'utf8', '-c', renderCode, flags.pdf, flags.renderPending, ...pending.map((p) => String(p.page))]);
  console.log(`${TAG} 目視待ち ${pending.length} ページを ${flags.renderPending} に描き出した`);
}

if (!flags.commit) process.exit(pending.length ? 1 : 0);
if (pending.length) die(`目視待ちが ${pending.length} ページ残っているので書かない（visual-review.json に結果を書いてから再実行）`);

const docDir = join(LIBRARY, flags.agency, flags.document);
mkdirSync(docDir, { recursive: true });
const parts = [];
let markdownBytes = 0;
for (let first = 1; first <= pages; first += PART_PAGES) {
  const last = Math.min(pages, first + PART_PAGES - 1);
  const slug = `part-${String(parts.length + 1).padStart(2, '0')}`;
  const body = [
    `# ${flags.title} — PDF pages ${first}-${last}`,
    '',
    '> 原本PDFの埋め込みテキスト層を `pdftotext -layout -enc UTF-8` でページ単位に逐語抽出しています。表組み・改行・ページ内配置を保持するため、各ページをコードブロックに収録しています。',
    '',
    ...pageRecords
      .filter((r) => r.page >= first && r.page <= last)
      .flatMap((r) => [`## PDF page ${r.page}`, '', `<!-- ${r.marker} -->`, '', '```text', r.text, '```', '']),
  ].join('\n');
  const buf = Buffer.from(body, 'utf8');
  writeFileSync(join(docDir, `${slug}.md`), buf);
  markdownBytes += buf.length;
  parts.push({ slug, file: `${flags.agency}/${flags.document}/${slug}.md`, firstPage: first, lastPage: last, pageCount: last - first + 1, sha256: sha256(buf), bytes: buf.length });
}

const catalog = parseJson(readFileSync(CATALOG, 'utf8'), CATALOG);
const entry = {
  agencyId: flags.agency,
  agencyName: flags.agencyName,
  documentId: flags.document,
  role: flags.role,
  title: flags.title,
  landing: flags.landing,
  sourceUrl: flags.sourceUrl,
  sourceSha256: sha256(pdfBytes),
  sourceBytes: pdfBytes.length,
  pages,
  partCount: parts.length,
  markdownBytes,
  replacementCharacters: 0,
  visualReviewedPages: visualReviewed,
  pendingVisualPages: 0,
  edition: flags.edition ?? null,
  sourceFile: `${flags.document}__${basename(flags.pdf)}`,
  parts,
  unreadableRanges: [],
};
const at = catalog.documents.findIndex((d) => d.agencyId === entry.agencyId && d.documentId === entry.documentId);
if (at >= 0) catalog.documents[at] = entry;
else catalog.documents.push(entry);

// 機関と合計は documents から数え直す（手で足し引きしない）
const agencyOrder = catalog.agencies.map((a) => a.agencyId);
if (!agencyOrder.includes(entry.agencyId)) agencyOrder.unshift(entry.agencyId);
catalog.agencies = agencyOrder.map((agencyId) => {
  const docs = catalog.documents.filter((d) => d.agencyId === agencyId);
  return { agencyId, agencyName: docs[0].agencyName, documentCount: docs.length, pages: docs.reduce((s, d) => s + d.pages, 0), partCount: docs.reduce((s, d) => s + d.partCount, 0) };
});
const sum = (key) => catalog.documents.reduce((s, d) => s + d[key], 0);
catalog.totals = {
  ...catalog.totals,
  agencies: catalog.agencies.length,
  documents: catalog.documents.length,
  pages: sum('pages'),
  parts: sum('partCount'),
  sourceBytes: sum('sourceBytes'),
  markdownBytes: sum('markdownBytes'),
  visualReviewedPages: sum('visualReviewedPages'),
};
writeFileSync(CATALOG, formatJson(catalog));

const readme = join(LIBRARY, 'README.md');
writeFileSync(
  readme,
  readFileSync(readme, 'utf8').replace(
    /全国\d+機関・\d+文書・[\d,]+ページ/u,
    `全国${catalog.totals.agencies}機関・${catalog.totals.documents}文書・${catalog.totals.pages.toLocaleString('ja-JP')}ページ`,
  ).replace(/- 分冊: \d+/u, `- 分冊: ${catalog.totals.parts}`),
);
console.log(`${TAG} ${relative(REPO_ROOT, docDir)} に ${parts.length} 分冊（${markdownBytes.toLocaleString('ja-JP')} bytes）を書き、catalog を ${catalog.totals.agencies} 機関・${catalog.totals.documents} 文書・${catalog.totals.pages.toLocaleString('ja-JP')} ページにした`);
