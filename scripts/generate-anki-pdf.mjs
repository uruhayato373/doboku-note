#!/usr/bin/env node
/**
 * generate-anki-pdf.mjs
 * ---------------------------------------------------------------------------
 * 直前暗記ノート（一問一答）article.md から A5・赤シート対応の印刷用 PDF を生成する。
 * Playwright(chromium headless) の page.pdf() で HTML→PDF 化する（Mac で動作。
 * note 印刷ダイアログ経由の --print-to-pdf は Mac で不安定だが、page.pdf() は安定）。
 *
 * 赤シート運用: 問い(Q.)は黒、答え(A.)は赤(#e60012)で刷る。赤い下敷きで A. が消える。
 *
 * 抽出規則: H2 セクションのうち「Q. …／A. …」行を含むもの（＝分野）だけを対象にし、
 *   使い方/最終確認/出典 等の散文セクションは自動除外。太字行(**…**)は小見出し。
 *
 * 使い方:
 *   node scripts/generate-anki-pdf.mjs --article <article.md path>
 *   （出力: 同ディレクトリの anki-redsheet.pdf。--out で上書き可）
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const getArg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const ART = getArg('--article');
if (!ART) { console.error('--article <path> required'); process.exit(1); }
// --sample: 無料公開の第1分野だけを使った「付属PDF 見本」画像(PNG)を出力する（有料答え流出なし）
const SAMPLE = argv.includes('--sample');
const SAMPLE_QA = parseInt(getArg('--sample-qa') || '9', 10); // 見本に載せる Q/A 数
const articleAbs = resolve(ROOT, ART);
const OUT = getArg('--out') || join(dirname(articleAbs), SAMPLE ? 'anki-sample.png' : 'anki-redsheet.pdf');

const raw = readFileSync(articleAbs, 'utf8');
const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
const fmField = (k) => (fm.match(new RegExp('^' + k + ':\\s*(?:"(.*?)"|\'(.*?)\'|(.+?))\\s*$', 'm')) || []).slice(1).find(Boolean) || '';
let body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '');
const title = (body.match(/^#\s+(.+)$/m)?.[1] || fmField('coverTitle') || '直前暗記ノート').trim();

// H2 セクションへ分割し、Q. を含むセクションだけを採用
const lines = body.split(/\r?\n/);
const sections = [];
let cur = null;
for (const ln of lines) {
  const h2 = ln.match(/^##\s+(.+?)\s*$/);
  if (h2) { cur = { head: h2[1], items: [] }; sections.push(cur); continue; }
  if (!cur) continue;
  const bold = ln.match(/^\*\*(.+?)\*\*\s*$/);
  const qa = ln.match(/^Q\.\s*(.*?)\s*／\s*A\.\s*(.*?)\s*$/);
  if (qa) cur.items.push({ t: 'qa', q: qa[1], a: qa[2] });
  else if (bold) cur.items.push({ t: 'sub', s: bold[1] });
}
const kept = sections.filter((s) => s.items.some((i) => i.t === 'qa'));
const qaCount = kept.reduce((n, s) => n + s.items.filter((i) => i.t === 'qa').length, 0);
if (!qaCount) { console.error('ABORT: Q/A 行が抽出できませんでした'); process.exit(1); }

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const secHtml = kept.map((s) => {
  const inner = s.items.map((i) =>
    i.t === 'sub'
      ? `<div class="sub">${esc(i.s)}</div>`
      : `<div class="qa"><span class="q">Q. ${esc(i.q)}</span><span class="a">A. ${esc(i.a)}</span></div>`
  ).join('\n');
  return `<section><h2>${esc(s.head)}</h2>\n${inner}</section>`;
}).join('\n');

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
  @page { size: A5 portrait; margin: 10mm 9mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif; color:#111; margin:0; }
  .cover { padding: 4mm 0 3mm; border-bottom: 2px solid #155293; margin-bottom: 4mm; }
  .cover h1 { font-size: 13px; line-height:1.4; margin:0 0 3px; color:#155293; }
  .cover p { font-size: 9px; margin:0; color:#444; }
  section { margin-bottom: 4mm; }
  h2 { font-size: 12px; color:#fff; background:#155293; padding:2px 6px; border-radius:3px; margin:4mm 0 2mm; break-after: avoid; break-inside: avoid; }
  .sub { font-size: 10.5px; font-weight:700; margin:2.5mm 0 1mm; color:#0e3a68; }
  .qa { font-size: 10px; line-height:1.5; margin:0 0 1.5mm; padding-left: 2mm; text-indent:-2mm; break-inside: avoid; }
  .q { color:#111; }
  .a { color:#e60012; margin-left: 4px; font-weight:600; }
</style></head><body>
  <div class="cover"><h1>${esc(title)}</h1><p>赤シートで <span style="color:#e60012;font-weight:600">A.（赤字）</span> を隠し、Q. を見て答えを言えるか確認。詰まった問いだけ繰り返す。／ ${qaCount}問</p></div>
  ${secHtml}
</body></html>`;

if (SAMPLE) {
  // 見本画像: 無料の第1分野のみ・先頭 SAMPLE_QA 問。有料の答えは一切含めない。
  const s = kept[0];
  let shown = 0; const rows = [];
  for (const i of s.items) {
    if (i.t === 'sub') rows.push(`<div class="sub">${esc(i.s)}</div>`);
    else if (shown < SAMPLE_QA) { rows.push(`<div class="qa"><span class="q">Q. ${esc(i.q)}</span><span class="a">A. ${esc(i.a)}</span></div>`); shown++; }
    if (shown >= SAMPLE_QA) break;
  }
  const sampleHtml = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
    body { font-family:"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif; color:#111; margin:0; width:900px; }
    .wrap { border:1px solid #d8dee6; border-radius:12px; overflow:hidden; }
    .banner { background:#155293; color:#fff; padding:14px 20px; font-size:19px; font-weight:700; }
    .banner small { display:block; font-size:13px; font-weight:400; opacity:.9; margin-top:3px; }
    .body { padding:16px 22px 22px; }
    h2 { font-size:17px; color:#fff; background:#155293; padding:4px 10px; border-radius:5px; margin:6px 0 10px; display:inline-block; }
    .sub { font-size:15px; font-weight:700; color:#0e3a68; margin:12px 0 5px; }
    .qa { font-size:14px; line-height:1.7; margin:0 0 6px; }
    .q { color:#111; } .a { color:#e60012; font-weight:600; margin-left:6px; }
    .foot { font-size:12.5px; color:#555; margin-top:14px; padding-top:10px; border-top:1px dashed #cbd3dc; }
  </style></head><body><div class="wrap">
    <div class="banner">付属：A5・赤シート対応 印刷用PDF（見本）<small>全${qaCount}問の一問一答。印刷して赤シートで A.（赤字）を隠し、Q. を見て答える。</small></div>
    <div class="body"><h2>${esc(s.head)}</h2>${rows.join('\n')}
      <div class="foot">※これは付属PDFの一部見本です。実物はA5サイズ・全分野・印刷用。赤シートでA.（赤字）が消えます。</div>
    </div></div></body></html>`;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 });
    await page.setContent(sampleHtml, { waitUntil: 'load' });
    const el = await page.$('.wrap');
    await el.screenshot({ path: OUT });
    console.log(`[anki-sample] ${OUT}  (第1分野「${s.head}」${shown}問の見本・有料答えなし)`);
  } finally { await browser.close(); }
} else {
  const htmlPath = OUT.replace(/\.pdf$/, '.html');
  writeFileSync(htmlPath, html);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.pdf({ path: OUT, format: 'A5', printBackground: true, preferCSSPageSize: true });
    console.log(`[anki-pdf] ${OUT}  (${kept.length}分野 / ${qaCount}問)`);
  } finally { await browser.close(); }
}
