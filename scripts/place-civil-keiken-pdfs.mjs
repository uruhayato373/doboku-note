#!/usr/bin/env node
/**
 * place-civil-keiken-pdfs.mjs
 * ---------------------------------------------------------------------------
 * magazine-to-pdf.mjs が C:\tmp\{spec}-pdf\ へ出力した 1級・2級土木 経験記述系の PDF を
 * 各記事ディレクトリへ配置し、記事末尾に「## 印刷用PDF」節を冪等に追記する。
 *
 * 建設部門 200 本は既に「本文で印刷用PDFを約束 → 記事 dir に PDF 実体 → note へ添付」で
 * 運用されている。土木 178 本を同じ形へ揃える（2026-07-31・note 一本化方針 C-2）。
 *
 * 節は記事の**末尾**（メンバーシップ CTA より後ろ）へ置く。spec の include 範囲は
 * `<!-- cta:civil-membership-lab` で終わるため、PDF 自身の紙面にこの節は載らない。
 *
 * 使い方:
 *   node scripts/place-civil-keiken-pdfs.mjs           # dry-run
 *   node scripts/place-civil-keiken-pdfs.mjs --apply
 * ---------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const APPLY = process.argv.includes('--apply');
const TMP = 'C:/tmp';

const SPECS = [
  '1級土木-経験記述-完全攻略パック',
  '2級土木-想定工事バンク',
  '1級土木-施工経験記述-2テーマ組合せ大全',
  '1級土木-二次学科記述-テーマ別出る順',
  '2級土木-二次学科記述-テーマ別出る順',
  '1級土木-施工経験記述-完成答案集',
  '1級土木-施工経験記述-過去問模範答案集',
  '2級土木-施工経験記述-完成答案集',
  '2級土木-施工経験記述-過去問模範答案集',
];

const sectionFor = (specName) => {
  const gakka = /学科記述/.test(specName);
  return [
    '## 印刷用PDF｜' + (gakka ? '本記事の出る順論点' : '本記事の完成答案'),
    '',
    gakka
      ? '本記事の出る順論点と解答の型を、そのまま印刷できるPDFにまとめました。'
      : '本記事の完成答案を、そのまま印刷できるPDFにまとめました。',
    '',
    '答案用紙への手書き書き写し練習や、試験直前の読み返しにご活用ください。',
  ];
};

let placed = 0, appended = 0, missingPdf = [], alreadyPdf = 0, alreadySection = 0, checked = 0;

for (const specName of SPECS) {
  const specPath = join('scripts/pdf-specs', specName + '.json');
  if (!existsSync(specPath)) { console.log('SKIP spec なし:', specPath); continue; }
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  const pdfDir = join(TMP, specName + '-pdf');

  for (const a of spec.articles) {
    const articlePath = (spec.srcDir + '/' + a.src);
    if (!existsSync(articlePath)) { console.log('SKIP 記事なし:', articlePath); continue; }
    checked++;
    const dir = articlePath.replace(/\/[^/]+$/, '');
    const src = join(pdfDir, a.out + '.pdf');
    const dest = join(dir, a.out + '.pdf');

    if (!existsSync(src)) { missingPdf.push(src); continue; }
    if (existsSync(dest)) alreadyPdf++;
    else { if (APPLY) copyFileSync(src, dest); placed++; }

    const raw = readFileSync(articlePath, 'utf8');
    if (/^## 印刷用PDF/m.test(raw)) { alreadySection++; continue; }
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    const ends = /\r?\n$/.test(raw);
    const lines = raw.split(/\r?\n/);
    if (ends) lines.pop();
    let e = lines.length - 1;
    while (e >= 0 && lines[e].trim() === '') e--;
    lines.length = e + 1;
    const out = [...lines, '', '---', '', ...sectionFor(specName)];
    if (APPLY) writeFileSync(articlePath, out.join(eol) + (ends ? eol : ''), 'utf8');
    appended++;
  }
}

console.log(`[place-civil-keiken-pdfs] spec 記事 ${checked} 件を実検査`);
console.log(`  PDF 配置        : ${placed}（既に配置済み ${alreadyPdf}）`);
console.log(`  印刷用PDF節 追記: ${appended}（既にあり ${alreadySection}）`);
if (missingPdf.length) {
  console.log(`  生成PDFが見つからない: ${missingPdf.length} 件`);
  missingPdf.slice(0, 10).forEach((p) => console.log('    - ' + p));
}
console.log(APPLY ? '  => 書き込み済み' : '  => dry-run・未書き込み');
if (checked === 0) { console.error('[place-civil-keiken-pdfs] FAIL: 1 件も検査していない'); process.exit(1); }
if (missingPdf.length) process.exit(1);
