#!/usr/bin/env node
// 日本技術士会の過去問PDF（平成23〜30年度の基礎・適性・建設、上下水道の全年度と正答）を一時領域へ取得し、
// 固定SHA-256とページ数を検証する。原典はgitへ入れず、OCR・目視突合の入力だけを再現可能にする。
// 固定した原典の一覧（URL・SHA-256・ページ数）は過去問の在庫台帳（data/pastexams/inventory.json）の
// pe-first-stage の files[]（sha256・pages を付けたもの）。別の設定ファイルには写さない。
// 取得は curl --ssl-no-revoke（Node の fetch は会社 PC のプロキシで fetch failed になる・DN-0510）。
// 取得の失敗（接続・HTTP）と、取れたが中身が違う（PDF でない・SHA 不一致・ページ数違い）を分けて数える。

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readDataset } from './lib/dataset-io.mjs';
import { fetchFailDominant } from './lib/inconclusive-gate.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const OUT = resolve(ROOT, '.tmp/pe1-historical-sources');

/** 年度ラベル（西暦 2011〜2018 → h23〜h30、2019〜 → r01〜）。再試験は -retest を付ける */
const yearKey = (year, retest) =>
  `${year <= 2018 ? `h${year - 1988}` : `r${String(year - 2018).padStart(2, '0')}`}${retest ? '-retest' : ''}`;
const SUBJECT_BY_SECTION = { '基礎科目': 'basic', '適性科目': 'aptitude', '専門科目 09 建設部門': 'construction' };

/**
 * 在庫台帳から固定した原典（sha256・pages を持つ pe-first-stage のファイル）を取り出す。
 * @returns {{ year: string, subject: string, file: string, url: string, sha256: string, pages: number }[]}
 */
export function historicalSources(inventory) {
  const years = inventory?.exams?.['pe-first-stage']?.years;
  if (!Array.isArray(years)) throw new Error('在庫台帳に pe-first-stage の years が無い');
  const sources = [];
  for (const y of years) {
    for (const f of y.files ?? []) {
      if (!f.sha256) continue;
      if (!f.sourceUrl || !Number.isInteger(f.pages)) throw new Error(`${y.year} ${f.file}: sha256 を持つのに sourceUrl か pages が無い`);
      const section = f.section ?? '';
      const retest = section.includes('（再試験）');
      if (f.kind === 'answer') {
        // 平成23〜30年度の正答は 1 本の合冊。令和以降は年度ごと
        const year = section.includes('H23〜H30') ? 'h23-h30' : yearKey(y.year, retest);
        sources.push({ year, subject: 'answers', file: `${year}-answers.pdf`, url: f.sourceUrl, sha256: f.sha256, pages: f.pages });
        continue;
      }
      const base = section.replace('（再試験）', '');
      const part = /^専門科目 (\d{2})\b/u.exec(base)?.[1];
      const subject = SUBJECT_BY_SECTION[base] ?? (part ? `specialty-${part}` : null);
      if (!subject) throw new Error(`${y.year} ${f.file}: 科目を決められない（section=${f.section}）`);
      const year = yearKey(y.year, retest);
      sources.push({ year, subject, file: `${year}-${subject}.pdf`, url: f.sourceUrl, sha256: f.sha256, pages: f.pages });
    }
  }
  // 出力先のファイル名が重なると、片方がもう片方を黙って上書きして検証だけ通る
  const names = sources.map((s) => s.file);
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  if (dup.length) throw new Error(`出力ファイル名が重複している: ${[...new Set(dup)].join('・')}（科目の名前の付け方を足す）`);
  // 年度の古い順（平成→令和・平成の合冊の正答は最後）。台帳は新しい年度が先なので並べ直す
  const order = (s) => (s.year === 'h23-h30' ? 'z' : s.year);
  return sources.sort((a, b) => order(a).localeCompare(order(b)));
}

/** 原典を curl で取る。取得の失敗は { error }（中身の検証まで行かない）。 */
function download(url, destination) {
  try {
    const status = execFileSync('curl', ['--ssl-no-revoke', '-sS', '-L', '--max-time', '120', '-o', destination, '-w', '%{http_code}', url], {
      encoding: 'utf8',
    }).trim();
    return status === '200' ? { bytes: readFileSync(destination) } : { error: `HTTP ${status}` };
  } catch (err) {
    return { error: String(err.stderr || err.message).trim().split('\n')[0] };
  }
}

/** ページ数。pdfinfo が無ければ PyMuPDF、どちらも無ければ null（未検査として数える） */
function countPages(file) {
  try {
    return Number(execFileSync('pdfinfo', [file], { encoding: 'utf8' }).match(/^Pages:\s+(\d+)/mu)?.[1]);
  } catch {
    try {
      return Number(execFileSync('python', ['-c', 'import fitz,sys;print(fitz.open(sys.argv[1]).page_count)', file], { encoding: 'utf8' }).trim());
    } catch {
      return null;
    }
  }
}

async function main() {
  const requestedYear = process.argv.find((arg) => /^(?:h(?:2[3-9]|30)|r0[1-9])(?:-retest)?$/u.test(arg));
  const inventory = readDataset(ROOT, 'pastexams.inventory');
  const all = historicalSources(inventory);
  if (all.length === 0) {
    console.error('[pe1-historical] 在庫台帳に sha256 を付けた原典が 1 件も無い（検査不成立）');
    process.exitCode = 2;
    return;
  }
  mkdirSync(OUT, { recursive: true });

  // 年度を指定したときはその年度だけ（平成の合冊の正答は全年度分の取得でだけ）
  const sources = all.filter((s) => (requestedYear ? s.year === requestedYear : true));

  let fetchFailed = 0;
  let mismatched = 0;
  let pagesUnchecked = 0;
  for (const source of sources) {
    const destination = resolve(OUT, source.file);
    const got = download(source.url, destination);
    if (got.error) {
      console.error(`[FETCH-FAIL] ${source.file}: ${got.error}`);
      rmSync(destination, { force: true });
      fetchFailed += 1;
      continue;
    }
    const sha256 = createHash('sha256').update(got.bytes).digest('hex');
    const isPdf = got.bytes.subarray(0, 5).toString('ascii') === '%PDF-';
    if (!isPdf || sha256 !== source.sha256) {
      console.error(`[MISMATCH] ${source.file}: pdf=${isPdf} sha256=${sha256}`);
      rmSync(destination, { force: true });
      mismatched += 1;
      continue;
    }
    const pages = countPages(destination);
    if (pages === null) pagesUnchecked += 1;
    else if (pages !== source.pages) {
      console.error(`[MISMATCH] ${source.file}: pages=${pages} expected=${source.pages}`);
      mismatched += 1;
      continue;
    }
    console.log(`[PASS] ${source.year}/${source.subject}: ${source.file} sha256=${sha256.slice(0, 12)} pages=${pages ?? 'unchecked'}`);
  }

  const verified = sources.length - fetchFailed - mismatched;
  console.log(
    `[pe1-historical] 対象 ${sources.length} 本 / 取得失敗 ${fetchFailed} / 中身の不一致 ${mismatched} / 検証済み ${verified}（うちページ数未検査 ${pagesUnchecked}）-> ${OUT}`,
  );
  if (fetchFailDominant(fetchFailed, sources.length)) {
    console.error('[pe1-historical] 取得失敗が支配的なので検査不成立（接続・プロキシを確かめる）');
    process.exitCode = 2;
  } else if (fetchFailed || mismatched) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
