#!/usr/bin/env node
// .claude/scripts/audit-pdf-vs-mdx.mjs
//
// 過去問 PDF を Tesseract OCR (日本語) でテキスト化し、対応する MDX 本文と
// 突合する。MDX に存在する 2-5 文字の漢字熟語が PDF の OCR 結果に
// 一切現れない場合、それは MDX 化時の OCR 誤読の可能性が高い「候補」
// として出力する。
//
// 設計の前提:
//   - PDF はスキャン画像（テキストレイヤなし）。pdftotext は使えない
//   - Tesseract jpn は完璧ではないが、市販 PDF 化と異なる OCR エンジンの結果
//     を別ルートで取れるので、両者が disagree する場所が浮上できる
//   - 真因の最終判断は人手で原典 PDF を視覚突合（候補の数を絞ることが目的）
//
// 入力:
//   content/sources/textbook/技術士（総監）/過去問/{year}/{year}_試験問題_{択一式|記述式}.pdf
//   content/site/pe-comprehensive-management/{year-lower}-{primary|secondary}/article.mdx
//
// 出力:
//   .claude/state/pdf-mdx-audit/YYYY-MM-DD.json
//   .tmp/ocr-cache/{year}-{kind}/page-XXX.{png,txt}
//   .tmp/ocr-cache/{year}-{kind}-fullocr.txt
//
// 使い方:
//   node .claude/scripts/audit-pdf-vs-mdx.mjs            # 全年度
//   node .claude/scripts/audit-pdf-vs-mdx.mjs R07        # 特定年度のみ
//   node .claude/scripts/audit-pdf-vs-mdx.mjs --skip-ocr # OCR cache を再利用
//
// 必要ツール: pdftoppm, tesseract (with jpn data)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';

const ROOT = process.cwd();
const PDF_ROOT = join(ROOT, 'content/sources/textbook/技術士（総監）/過去問');
const MDX_ROOT = join(ROOT, 'content/site/pe-comprehensive-management');
const TMP_DIR = join(ROOT, '.tmp/ocr-cache');
const OUTPUT_DIR = join(ROOT, '.claude/state/pdf-mdx-audit');
const TODAY = new Date().toISOString().slice(0, 10);

const args = process.argv.slice(2);
const SKIP_OCR = args.includes('--skip-ocr');
const ONLY_YEARS = args.filter((a) => /^R\d+|^H\d+$/i.test(a)).map((a) => a.toUpperCase());

const TARGET_YEARS = [
  'R07', 'R06', 'R05', 'R04', 'R03', 'R02', 'R01',
  'H30', 'H29', 'H28', 'H27', 'H26', 'H25', 'H24', 'H23', 'H22', 'H21',
];
const KINDS = [
  { name: 'primary', pdf_name: '択一式', mdx_dir_suffix: '-primary' },
  { name: 'secondary', pdf_name: '記述式', mdx_dir_suffix: '-secondary' },
];

const OCR_PARALLEL = 4; // 並行 OCR プロセス数
const PDF_DPI = 200;     // PNG 解像度

// ── ユーティリティ ────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function fileExists(p) {
  return existsSync(p) && statSync(p).isFile();
}

function pdfPath(year, kind) {
  return join(PDF_ROOT, year, `${year}_試験問題_${kind.pdf_name}.pdf`);
}

function mdxPath(year, kind) {
  const lower = year.toLowerCase();
  return join(MDX_ROOT, `${lower}${kind.mdx_dir_suffix}`, 'article.mdx');
}

function ocrDir(year, kind) {
  return join(TMP_DIR, `${year}-${kind.name}`);
}

function ocrFullText(year, kind) {
  return join(TMP_DIR, `${year}-${kind.name}-fullocr.txt`);
}

// ── PDF → PNG ──────────────────────────────────────

function convertPdfToPngs(pdf, outDir) {
  mkdirSync(outDir, { recursive: true });
  const existing = readdirSync(outDir).filter((f) => f.endsWith('.png'));
  if (existing.length > 0) {
    log(`  pdftoppm: skip (${existing.length} PNGs already exist)`);
    return existing.length;
  }
  log(`  pdftoppm -r ${PDF_DPI} ...`);
  const result = spawnSync('pdftoppm', ['-r', String(PDF_DPI), '-png', pdf, join(outDir, 'page')], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(`pdftoppm failed: ${result.stderr?.toString()}`);
  }
  const pngs = readdirSync(outDir).filter((f) => f.endsWith('.png'));
  log(`  pdftoppm -> ${pngs.length} PNGs`);
  return pngs.length;
}

// ── Tesseract OCR (parallel) ─────────────────────────

async function ocrPng(png, outBase) {
  return new Promise((resolve, reject) => {
    const proc = spawn('tesseract', [png, outBase, '-l', 'jpn', '--psm', '6'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tesseract failed: ${stderr}`));
    });
  });
}

async function ocrAllPngs(outDir) {
  const pngs = readdirSync(outDir).filter((f) => f.endsWith('.png')).sort();
  const tasks = [];
  let inProgress = 0;
  let done = 0;
  let nextIdx = 0;

  return new Promise((resolve, reject) => {
    function tick() {
      while (inProgress < OCR_PARALLEL && nextIdx < pngs.length) {
        const png = pngs[nextIdx++];
        const fullPath = join(outDir, png);
        const base = fullPath.replace(/\.png$/, '');
        const txtPath = `${base}.txt`;
        if (fileExists(txtPath)) {
          done++;
          continue;
        }
        inProgress++;
        ocrPng(fullPath, base)
          .then(() => {
            done++;
            inProgress--;
            if (done % 5 === 0) log(`    OCR ${done}/${pngs.length}`);
            if (done === pngs.length) resolve(done);
            else tick();
          })
          .catch((err) => reject(err));
      }
      if (done === pngs.length) resolve(done);
    }
    tick();
  });
}

function concatOcrText(outDir, fullTextPath) {
  const txts = readdirSync(outDir).filter((f) => f.endsWith('.txt')).sort();
  let combined = '';
  for (const t of txts) {
    combined += readFileSync(join(outDir, t), 'utf-8') + '\n';
  }
  writeFileSync(fullTextPath, combined);
  return combined.length;
}

// ── MDX 本文抽出 ─────────────────────────────────────

function extractMdxText(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const result = [];
  let inFrontmatter = false;
  let frontmatterClosed = false;
  let inCodeFence = false;
  let inDetails = false;     // 解答・解説 (<details>...</details>) は OCR と比較しないため skip
  let inJsxProp = false;     // <ExamPoint items={[...]}> 等 JSX prop 配列を skip

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '---') {
      if (!frontmatterClosed && !inFrontmatter) inFrontmatter = true;
      else if (inFrontmatter) { inFrontmatter = false; frontmatterClosed = true; }
      continue;
    }
    if (inFrontmatter) continue;
    if (/^```/.test(line)) { inCodeFence = !inCodeFence; continue; }
    if (inCodeFence) continue;

    // <details> ブロックの開閉を追跡
    if (/<details(\s|>)/i.test(trimmed)) { inDetails = true; continue; }
    if (/<\/details>/i.test(trimmed)) { inDetails = false; continue; }
    if (inDetails) continue;

    // JSX prop で配列リテラルが複数行に渡るケース
    // <ExamPoint summary="..." items={[
    //   "string1",
    //   "string2",
    // ]}/>
    if (/=\{\[\s*$/.test(trimmed)) { inJsxProp = true; continue; }
    if (inJsxProp) {
      if (/\]\s*\}/.test(trimmed)) inJsxProp = false;
      continue;
    }

    // タイトル行（# 見出し）も MDX 独自のため OCR には無い → skip
    if (/^#+\s/.test(trimmed)) continue;

    // 単独の JSX タグ行（<ExamPoint .../>, <RelatedKeywords .../> 等）は skip
    if (/^<[A-Z][A-Za-z0-9]*(\s|\/?>)/.test(trimmed)) continue;
    if (/^<\/[A-Z][A-Za-z0-9]*>\s*$/.test(trimmed)) continue;

    // インライン属性のみの継続行（よくある: items={[\n "..."\n ]}/>）
    if (/^[\w-]+=/.test(trimmed)) continue;
    if (trimmed === '/>' || trimmed === '>') continue;

    let text = line
      .replace(/<[^>]+>/g, '')
      .replace(/\{[^}]*\}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    if (!text.trim()) continue;
    result.push({ lineNo: i + 1, text });
  }
  return result;
}

// ── 候補抽出 ─────────────────────────────────────────

/**
 * 文字列から長さ 2-5 の漢字連続を抽出。
 * 同じ文字列が複数回出ても一意化して返す（位置別にあとで再検索）。
 */
function extractKanjiNGrams(text, minLen = 2, maxLen = 5) {
  const set = new Set();
  const re = /[一-鿿㐀-䶿々〆〤]+/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const run = m[0];
    for (let len = minLen; len <= Math.min(maxLen, run.length); len++) {
      for (let i = 0; i + len <= run.length; i++) {
        set.add(run.slice(i, i + len));
      }
    }
  }
  return set;
}

/**
 * OCR テキスト内に含まれる漢字 n-gram のセット（高速検索用）。
 */
function buildOcrKanjiSet(ocrText) {
  return extractKanjiNGrams(ocrText, 2, 5);
}

/**
 * MDX 各行で OCR に存在しない n-gram を探す。
 * 信頼度: 長い (4-5字) の missing は high、短い (2字) は low。
 */
function findOcrMismatches(mdxLines, ocrSet, ocrText) {
  const candidates = [];
  for (const { lineNo, text } of mdxLines) {
    // 行から漢字 n-gram を抽出
    const seen = new Set();
    const re = /[一-鿿㐀-䶿々〆〤]{2,}/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const run = m[0];
      // この run の中で「OCR set にない最長の連続」を探す
      // greedy: 一番長く missing な部分文字列を見つける
      for (let len = Math.min(5, run.length); len >= 3; len--) {
        for (let i = 0; i + len <= run.length; i++) {
          const sub = run.slice(i, i + len);
          if (seen.has(sub)) continue;
          seen.add(sub);
          if (!ocrSet.has(sub)) {
            // 長さ 3 以上で missing なものを候補に
            // 信頼度: len で粗く分類
            const confidence = len >= 5 ? 'high' : len >= 4 ? 'medium' : 'low';
            const ctxStart = Math.max(0, text.indexOf(sub) - 25);
            const ctxEnd = Math.min(text.length, text.indexOf(sub) + sub.length + 25);
            candidates.push({
              line: lineNo,
              missing: sub,
              missing_len: len,
              context: text.slice(ctxStart, ctxEnd),
              confidence,
            });
          }
        }
      }
    }
  }
  // 重複（同じ missing で複数行ヒット）はそのまま残す（位置情報を保持）
  // 同じ行内の同じ missing は 1 件に絞る
  const unique = [];
  const key = (c) => `${c.line}\t${c.missing}`;
  const seen = new Set();
  for (const c of candidates) {
    if (seen.has(key(c))) continue;
    seen.add(key(c));
    unique.push(c);
  }
  return unique;
}

// ── 図参照のヒューリスティック（OCR 側） ──────────────

/**
 * OCR テキスト中から「図」「表」のキャプションを検出。
 * 例: 「図1」「図 1」「図-1」「表1」「表-1」「Fig.1」など
 */
function findFigureCaptionsInOcr(ocrText) {
  const captions = [];
  const re = /(図|表|Fig\.?|Tab\.?)\s*[-－―]?\s*\d{1,2}/g;
  let m;
  while ((m = re.exec(ocrText)) !== null) {
    captions.push(m[0]);
  }
  return captions;
}

// ── メイン処理 ──────────────────────────────────────

async function main() {
  const years = ONLY_YEARS.length > 0
    ? TARGET_YEARS.filter((y) => ONLY_YEARS.includes(y))
    : TARGET_YEARS;

  log(`Target years: ${years.join(', ')}`);
  log(`SKIP_OCR: ${SKIP_OCR}`);

  const reportEntries = [];

  for (const year of years) {
    for (const kind of KINDS) {
      const pdf = pdfPath(year, kind);
      const mdx = mdxPath(year, kind);
      const outDir = ocrDir(year, kind);
      const fullText = ocrFullText(year, kind);

      if (!fileExists(pdf)) {
        log(`${year}/${kind.name}: PDF not found (${relative(ROOT, pdf)})`);
        continue;
      }
      if (!fileExists(mdx)) {
        log(`${year}/${kind.name}: MDX not found (${relative(ROOT, mdx)})`);
        continue;
      }

      log(`=== ${year}/${kind.name} ===`);

      // OCR phase
      if (!SKIP_OCR || !fileExists(fullText)) {
        convertPdfToPngs(pdf, outDir);
        await ocrAllPngs(outDir);
        const len = concatOcrText(outDir, fullText);
        log(`  OCR full text: ${len} chars`);
      } else {
        log(`  OCR cache: ${fullText} (skipped)`);
      }

      // Comparison phase
      const ocrText = readFileSync(fullText, 'utf-8');
      const ocrSet = buildOcrKanjiSet(ocrText);

      const mdxRaw = readFileSync(mdx, 'utf-8');
      const mdxLines = extractMdxText(mdxRaw);

      const mismatches = findOcrMismatches(mdxLines, ocrSet, ocrText);
      const ocrFigCaptions = findFigureCaptionsInOcr(ocrText);

      // 信頼度別にカウント
      const byConf = { high: 0, medium: 0, low: 0 };
      for (const m of mismatches) byConf[m.confidence]++;

      log(`  candidates: ${mismatches.length} (high=${byConf.high} medium=${byConf.medium} low=${byConf.low})`);
      log(`  OCR figure captions found: ${ocrFigCaptions.length}`);

      reportEntries.push({
        year,
        kind: kind.name,
        pdf: relative(ROOT, pdf),
        mdx: relative(ROOT, mdx),
        ocr_text_len: ocrText.length,
        mdx_text_lines: mdxLines.length,
        ocr_kanji_ngrams: ocrSet.size,
        mismatch_total: mismatches.length,
        mismatch_by_confidence: byConf,
        ocr_figure_captions: ocrFigCaptions,
        ocr_figure_caption_count: ocrFigCaptions.length,
        candidates: mismatches.sort((a, b) => {
          // confidence 降順 → 行番号昇順
          const rank = { high: 0, medium: 1, low: 2 };
          return rank[a.confidence] - rank[b.confidence] || a.line - b.line;
        }),
      });
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = join(OUTPUT_DIR, `${TODAY}.json`);
  const summary = {
    generated_at: new Date().toISOString(),
    target_years: years,
    pipeline: {
      pdf_dpi: PDF_DPI,
      ocr_engine: 'tesseract jpn',
      ocr_psm: 6,
      n_gram_min: 3,
      n_gram_max: 5,
    },
    note: '本スクリプトは MDX に存在する漢字 n-gram (3-5字) で OCR 結果に一切現れないものを「候補」として出力する。Tesseract も完璧でないため、両 OCR が disagree する場所を浮上させて人手レビューに回すのが目的。candidates が多くても全て誤読ではない。',
    entries: reportEntries,
  };
  writeFileSync(outPath, JSON.stringify(summary, null, 2));
  log(`Output: ${relative(ROOT, outPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
