#!/usr/bin/env node
// scripts/verify-pdf-mdx.mjs
//
// PDF ⇔ MDX 整合性検証の決定論的前処理スクリプト。
// civil-construction-qa サブエージェントから呼ばれ、JSON で結果を返す。
// 視覚比較や Playwright レンダリング検証はエージェント側が直接行う。
// 本スクリプトはファイルアクセスとテキスト処理に限定する。
//
// 【実行環境】macOS only (Homebrew poppler 前提)
//   brew install poppler
//   - pdftotext  : PDF テキスト抽出
//   - pdfinfo    : ページ数・メタデータ
//   - pdftoppm   : PDF → PNG 変換 (--render 時)
//
// 使い方:
//   node scripts/verify-pdf-mdx.mjs <mdx-path>
//   node scripts/verify-pdf-mdx.mjs <mdx-path> --pdf <pdf-path>
//   node scripts/verify-pdf-mdx.mjs <mdx-path> --render
//
// オプション:
//   --pdf <path>  : PDF 原本を明示指定（省略時は slug/title から自動発見）
//   --render      : PDF ページを /tmp/verify-pdf-mdx/<slug>/page-N.png に出力
//   --dpi <N>     : --render の解像度（デフォルト 150）
//
// 出力:
//   JSON を stdout へ。失敗時は stderr にエラーメッセージを出して exit 1。

import { readFileSync, existsSync, statSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { resolve, dirname, basename, join, extname } from 'node:path';
import matter from 'gray-matter';
import sharp from 'sharp';

// ----------------------------------------------------------------
// 定数
// ----------------------------------------------------------------

const PDF_ROOT = 'content/sources/textbook/１級土木施工管理技士';
const TMP_ROOT = '/tmp/verify-pdf-mdx';
const DEFAULT_DPI = 150;

// slug → PDF キーワード（手動オーバーライド。自動発見が失敗したとき使用）
const SLUG_PDF_HINTS = {
  // guide
  'concrete-key-points': ['コンクリート工'],
  'earthwork-key-points': ['土工'],
  'law-key-points': ['関係法規'],
  'concrete-maintenance': ['コンクリート工'],
  'four-management': ['施工管理の概要'],
  // textbook
  'construction-mgmt-overview': ['施工管理の概要'],
  'demolition': ['解体工事'],
  'schedule-management': ['工程管理'],
  'surveying': ['測量'],
  'construction-machinery-01': ['建設機械'],
  'construction-machinery-02': ['建設機械'],
  'foundation-work': ['基礎工'],
  'safety-management': ['安全管理'],
  'quality-management': ['品質管理'],
  'environmental-management': ['環境保全管理'],
  'construction-plan': ['施工計画'],
};

// ----------------------------------------------------------------
// 引数パース
// ----------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    mdx: null,
    pdf: null,
    render: false,
    dpi: DEFAULT_DPI,
    expectedFigures: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pdf') args.pdf = argv[++i];
    else if (a === '--render') args.render = true;
    else if (a === '--dpi') args.dpi = parseInt(argv[++i], 10);
    else if (a === '--expected-figures') args.expectedFigures = parseInt(argv[++i], 10);
    else if (!args.mdx) args.mdx = a;
  }
  return args;
}

const args = parseArgs(process.argv);

if (!args.mdx) {
  process.stderr.write(
    'Usage: node scripts/verify-pdf-mdx.mjs <mdx-path> [--pdf <pdf-path>] [--render] [--dpi N] [--expected-figures N]\n',
  );
  process.exit(2);
}

if (!existsSync(args.mdx)) {
  process.stderr.write(`MDX not found: ${args.mdx}\n`);
  process.exit(2);
}

// ----------------------------------------------------------------
// macOS 前提チェック
// ----------------------------------------------------------------

function checkTool(name) {
  try {
    execFileSync(name, ['-v'], { stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

const hasPdftotext = checkTool('pdftotext');
const hasPdfinfo = checkTool('pdfinfo');
const hasPdftoppm = checkTool('pdftoppm');

if (!hasPdftotext || !hasPdfinfo) {
  process.stderr.write(
    'poppler-utils が見つかりません。macOS では以下でインストール:\n  brew install poppler\n',
  );
  process.exit(3);
}

// ----------------------------------------------------------------
// MDX 解析
// ----------------------------------------------------------------

const mdxRaw = readFileSync(args.mdx, 'utf8');
const { data: frontmatter, content: body } = matter(mdxRaw);

const category = frontmatter.category || null;
const group = frontmatter.group || null;
const slug = frontmatter.id || basename(dirname(args.mdx)) || basename(args.mdx, '.mdx');
const title = frontmatter.title || null;

// <img src="..." alt="..." /> を抽出
// `<img>` と `<ArticleImage>` の両方を検出（Phase 4 対応、Issue #128）
const imgRe = /<(?:img|ArticleImage)\s+([^>]*?)\/?>/g;
const attrRe = /(\w+)\s*=\s*["']([^"']*)["']/g;
const lines = mdxRaw.split('\n');

function findLine(matchIndex) {
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    idx += lines[i].length + 1;
    if (idx >= matchIndex) return i + 1;
  }
  return -1;
}

const images = [];
let m;
while ((m = imgRe.exec(mdxRaw)) !== null) {
  const attrs = {};
  let am;
  attrRe.lastIndex = 0;
  while ((am = attrRe.exec(m[1])) !== null) {
    attrs[am[1]] = am[2];
  }
  if (!attrs.src) continue;

  const line = findLine(m.index);
  const localPath = attrs.src.startsWith('/posts/')
    ? join('.local/r2', attrs.src)
    : attrs.src;
  const absPath = resolve(localPath);
  let exists = false;
  let naturalWidth = null;
  let naturalHeight = null;
  let fileSize = null;

  if (existsSync(absPath)) {
    exists = true;
    try {
      fileSize = statSync(absPath).size;
      const meta = await sharp(absPath).metadata();
      naturalWidth = meta.width || null;
      naturalHeight = meta.height || null;
    } catch {
      // 取得不能でも exists だけは true
    }
  }

  images.push({
    src: attrs.src,
    alt: attrs.alt || '',
    line,
    localPath,
    exists,
    naturalWidth,
    naturalHeight,
    fileSize,
  });
}

// 見出し抽出（H1〜H4）
const headingRe = /^(#{1,4})\s+(.+?)\s*$/gm;
const mdxHeadings = [];
while ((m = headingRe.exec(body)) !== null) {
  mdxHeadings.push({
    level: m[1].length,
    text: m[2].trim(),
  });
}

// KaTeX 数式の数（ブロック + インライン）
const blockMath = (body.match(/\$\$[\s\S]*?\$\$/g) || []).length;
const inlineMath = (body.match(/(?<!\$)\$(?!\$)[^\n$]+?\$/g) || []).length;
const mathCount = blockMath + inlineMath;

// 表の数（| ヘッダ | ヘッダ | のヘッダ行直下にセパレータ行）
const tableRe = /^\|(.+)\|\s*\n\|\s*[:\-\s|]+\|\s*$/gm;
const tableCount = (body.match(tableRe) || []).length;

// プレーンテキスト文字数
const plainText = body
  .replace(/```[\s\S]*?```/g, '')
  .replace(/<[^>]+>/g, '')
  .replace(/\$[^$\n]+\$/g, '')
  .replace(/\$\$[\s\S]*?\$\$/g, '');
const textChars = plainText.replace(/\s/g, '').length;

// ----------------------------------------------------------------
// テキスト正規化（全角/半角・余分な空白）
// ----------------------------------------------------------------

function normalizeText(s) {
  if (!s) return '';
  return s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 主要トピック抽出: 冒頭テキストから頻出する漢字/カタカナ複合語を返す
function extractTopTopics(text, limit = 10) {
  if (!text) return [];
  // 連続する漢字 3-8 文字 または カタカナ 3-10 文字
  const re = /[一-龯]{3,8}|[ァ-ヶー]{3,10}/g;
  const freq = new Map();
  let m;
  while ((m = re.exec(text)) !== null) {
    const word = m[0];
    // ストップワード的な除外
    if (/^第[一二三四五六七八九十百千0-9０-９]+/.test(word)) continue;
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  return Array.from(freq.entries())
    .filter(([, c]) => c >= 2) // 2 回以上出現したもの
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

// ----------------------------------------------------------------
// PDF 自動発見
// ----------------------------------------------------------------

function findAllPdfs(root) {
  if (!existsSync(root)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile() && extname(entry.name).toLowerCase() === '.pdf') out.push(p);
    }
  };
  walk(root);
  return out;
}

function discoverPdf(slug, title, group) {
  // 1. slug → ヒント辞書から検索
  const hints = SLUG_PDF_HINTS[slug] || [];

  // 2. title からキーワード抽出（最初の日本語部分、— や - の前まで）
  const titleKeywords = [];
  if (title) {
    const cleaned = title.split(/[—\-:：|｜]/)[0].trim();
    // 「施工管理の概要」のような名詞句全体
    titleKeywords.push(cleaned);
    // 主要な名詞を拾う（3 文字以上の漢字列）
    const nounMatches = cleaned.match(/[一-龯]{3,}/g) || [];
    titleKeywords.push(...nounMatches);
  }

  const allPdfs = findAllPdfs(PDF_ROOT);
  // guide/textbook はテキスト教科書のみを対象
  const textbookPdfs = allPdfs.filter((p) => p.includes('テキスト'));

  const tryMatch = (keywords) => {
    for (const kw of keywords) {
      if (!kw) continue;
      const hits = textbookPdfs.filter((p) => basename(p).includes(kw));
      if (hits.length === 1) return { pdf: hits[0], via: kw, all: hits };
      if (hits.length > 1) return { pdf: null, via: kw, all: hits, ambiguous: true };
    }
    return null;
  };

  // ヒント優先 → title キーワードの順
  const hintMatch = tryMatch(hints);
  if (hintMatch && hintMatch.pdf) return hintMatch;
  const titleMatch = tryMatch(titleKeywords);
  if (titleMatch && titleMatch.pdf) return titleMatch;

  return hintMatch || titleMatch || { pdf: null, via: null, all: [] };
}

let pdfPath = args.pdf;
let discovery = null;

if (!pdfPath && (group === 'textbook' || group === 'guide')) {
  discovery = discoverPdf(slug, title, group);
  if (discovery.pdf) pdfPath = discovery.pdf;
}

// ----------------------------------------------------------------
// PDF 解析（pdftotext + pdfinfo）
// ----------------------------------------------------------------

function runPdftotext(pdf, layout = false) {
  const flags = ['-enc', 'UTF-8'];
  if (layout) flags.unshift('-layout');
  return execFileSync('pdftotext', [...flags, pdf, '-'], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runPdfinfo(pdf) {
  const out = execFileSync('pdfinfo', [pdf], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const info = {};
  for (const line of out.split('\n')) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    info[key] = value;
  }
  return info;
}

function renderPdfPages(pdf, slug, dpi) {
  const outDir = join(TMP_ROOT, slug);
  mkdirSync(outDir, { recursive: true });
  const prefix = join(outDir, 'page');
  execFileSync('pdftoppm', ['-r', String(dpi), '-png', pdf, prefix], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // 生成された png を収集
  const files = readdirSync(outDir)
    .filter((f) => f.startsWith('page-') && f.endsWith('.png'))
    .sort()
    .map((f) => join(outDir, f));
  return { outDir, files };
}

let pdfInfo = null;
let coverage = null;
let renderResult = null;

if (pdfPath && existsSync(pdfPath)) {
  let pdfText = '';
  let pdfError = null;
  let pages = null;

  try {
    pdfText = runPdftotext(pdfPath);
  } catch (e) {
    pdfError = `pdftotext failed: ${e.message}`;
  }

  try {
    const meta = runPdfinfo(pdfPath);
    pages = meta['Pages'] ? parseInt(meta['Pages'], 10) : null;
  } catch {
    // pages = null
  }

  if (!pdfError) {
    // -layout あり (構造保持) と なし (読み順) の両方を取る
    let plainPdfText = pdfText;
    try {
      plainPdfText = runPdftotext(pdfPath, false);
    } catch {
      // fallback
    }

    // 前処理: 「第」と「N章」が改行で分離されたパターンを 1 行に連結
    const joinedText = plainPdfText.replace(
      /第[\s　]*\n+[\s　]*([0-9０-９]+)[\s　]*章/g,
      '第$1章',
    );

    // OCR ノイズの検出: 「コンクリート」が「コンクリー卜」にOCRされる等の頻度
    const ocrArtifacts =
      (joinedText.match(/[ァ-ヶー]卜/g) || []).length + // 卜 (U+535C) vs ト (U+30C8)
      (joinedText.match(/[ァ-ヶ]Jl/g) || []).length + // リ→Jl
      (joinedText.match(/[ァ-ヶ]ρ/g) || []).length;
    const ocrSuspected = ocrArtifacts >= 3;

    // 章節見出しの候補を抽出。複数パターンを重ねて召喚率を上げる
    const HEADING_MIN_LEN = 2;
    const HEADING_MAX_LEN = 40;
    const headingPatterns = [
      // 第N章 タイトル (前処理で連結済み)
      {
        re: /^第[0-9０-９]+章[\s　]+([一-龯ぁ-んァ-ヶー一-龯ぁ-んァ-ヶー]{2,40})\s*$/gm,
        tier: 'chapter',
      },
      // N.N.N サブサブ見出し
      {
        re: /^[\s　]*[0-9０-９]+\.[0-9０-９]+\.[0-9０-９]+[\s　]+([一-龯ぁ-んァ-ヶー][^\n]{1,38})$/gm,
        tier: 'subsubsection',
      },
      // N.N サブ見出し
      {
        re: /^[\s　]*[0-9０-９]+\.[0-9０-９]+[\s　]+([一-龯ぁ-んァ-ヶー][^\n]{1,38})$/gm,
        tier: 'subsection',
      },
      // N xxx (スキャン教科書によくある「1概 説」「2材 料」形式)
      // 非改行空白のみ許可 (\s だと改行もマッチしてノイズ源になる)
      {
        re: /^[ \t　]*[0-9０-９]{1,2}[ \t　]*([一-龯ァ-ヶ][一-龯ぁ-んァ-ヶー　 ]{1,30}?)[ \t　]*$/gm,
        tier: 'section-no-dot',
      },
    ];

    const pdfHeadings = [];
    for (const { re, tier } of headingPatterns) {
      let pm;
      while ((pm = re.exec(joinedText)) !== null) {
        const raw = pm[0].trim();
        const text = pm[1].trim();
        if (text.length < HEADING_MIN_LEN || text.length > HEADING_MAX_LEN) continue;
        if ((text.match(/[、。]/g) || []).length >= 2) continue;
        pdfHeadings.push({ raw, text, normalized: normalizeText(text), tier });
      }
    }

    // 正規化後に重複除去
    const seen = new Set();
    const uniqueHeadings = pdfHeadings.filter((h) => {
      const key = h.normalized;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 数式記号の出現数（粗い見積もり）
    const mathSymbols = (pdfText.match(/[=Σ√²³≧≦×÷±]/g) || []).length;

    // OCR 誤字を吸収する正規化: よくある OCR 誤読文字を対応付ける
    const ocrNormalize = (s) =>
      normalizeText(s)
        .replace(/卜/g, 'ト') // U+535C → U+30C8 (katakana)
        .replace(/Jレ/g, 'ル')
        .replace(/jレ/g, 'ル')
        .replace(/lレ/g, 'ル');

    // 網羅率計算 (textbook モード基準)
    const normalizedBody = ocrNormalize(body);
    const normalizedHeadings = mdxHeadings.map((h) => ocrNormalize(h.text));

    const matched = [];
    const missing = [];
    for (const h of uniqueHeadings) {
      const key = ocrNormalize(h.text);
      const inBody = normalizedBody.includes(key);
      const inHeadings = normalizedHeadings.some(
        (mh) => mh.includes(key) || key.includes(mh),
      );
      if (inBody || inHeadings) matched.push(h);
      else missing.push(h);
    }

    const rate = uniqueHeadings.length > 0 ? matched.length / uniqueHeadings.length : null;

    // guide モード向けの補助指標: PDF 冒頭 2000 字から主要トピックを抽出し MDX での言及を測る
    const topicCandidates = extractTopTopics(joinedText.slice(0, 5000));
    const topicMatched = topicCandidates.filter((t) => normalizedBody.includes(ocrNormalize(t)));
    const topicRate =
      topicCandidates.length > 0 ? topicMatched.length / topicCandidates.length : null;

    pdfInfo = {
      path: pdfPath,
      discovered: discovery ? discovery.via : null,
      pages,
      headings: uniqueHeadings.map((h) => ({ raw: h.raw, text: h.text, tier: h.tier })),
      heading_count: uniqueHeadings.length,
      text_chars: pdfText.replace(/\s/g, '').length,
      math_symbol_count: mathSymbols,
      ocr_suspected: ocrSuspected,
      ocr_artifact_count: ocrArtifacts,
    };

    coverage = {
      headings_total: uniqueHeadings.length,
      headings_matched: matched.length,
      rate,
      missing: missing.map((h) => h.raw),
      topic_total: topicCandidates.length,
      topic_matched: topicMatched.length,
      topic_rate: topicRate,
      topic_missing: topicCandidates.filter((t) => !topicMatched.includes(t)),
      caveat: ocrSuspected
        ? 'OCR 品質が低く定量指標は参考値。エージェント判断を優先。'
        : null,
    };
  } else {
    pdfInfo = { path: pdfPath, error: pdfError, pages };
  }

  // --render 時は PDF ページを /tmp に展開
  if (args.render && !pdfError) {
    if (!hasPdftoppm) {
      renderResult = { error: 'pdftoppm が見つかりません。brew install poppler が必要です。' };
    } else {
      try {
        renderResult = renderPdfPages(pdfPath, slug, args.dpi);
      } catch (e) {
        renderResult = { error: `pdftoppm failed: ${e.message}` };
      }
    }
  }
} else if (pdfPath) {
  pdfInfo = { path: pdfPath, error: 'PDF not found at given path' };
} else if (discovery && !discovery.pdf) {
  pdfInfo = {
    path: null,
    error: 'PDF 自動発見に失敗しました。--pdf で明示指定してください。',
    hint_candidates: discovery.all || [],
  };
}

// ----------------------------------------------------------------
// 出力
// ----------------------------------------------------------------

// figures_check: --expected-figures が指定された場合のみ算出
// Phase 4 (import script ガード) で利用される。未指定時は null（既存挙動維持）
let figuresCheck = null;
if (args.expectedFigures !== null && !Number.isNaN(args.expectedFigures)) {
  const actual = images.length;
  const expected = args.expectedFigures;
  let status;
  if (actual === expected) status = 'ok';
  else if (actual < expected) status = 'missing';
  else status = 'extra';
  figuresCheck = { expected, actual, status, diff: actual - expected };
}

// ocr_recommendation: 閾値超え警告（既存 ocr_artifact_count を使用）
let ocrRecommendation = null;
if (pdfInfo && typeof pdfInfo.ocr_artifact_count === 'number') {
  const n = pdfInfo.ocr_artifact_count;
  if (n >= 10) ocrRecommendation = { level: 'error', threshold: 10, count: n, hint: 'OCR 品質が著しく低い。pdftoppm + Tesseract での再 OCR を推奨' };
  else if (n >= 5) ocrRecommendation = { level: 'warn', threshold: 5, count: n, hint: 'OCR ノイズが多い。視覚突合を必ず行う' };
  else ocrRecommendation = { level: 'ok', threshold: 5, count: n };
}

const result = {
  meta: {
    script: 'scripts/verify-pdf-mdx.mjs',
    version: 3,
    platform: 'mac-only',
    tools: { pdftotext: hasPdftotext, pdfinfo: hasPdfinfo, pdftoppm: hasPdftoppm },
    generated_at: new Date().toISOString(),
  },
  mdx: {
    path: args.mdx,
    category,
    group,
    slug,
    title,
    headings: mdxHeadings,
    heading_count: mdxHeadings.length,
    images,
    image_count: images.length,
    image_missing: images.filter((i) => !i.exists).length,
    math_count: mathCount,
    table_count: tableCount,
    text_chars: textChars,
  },
  pdf: pdfInfo,
  coverage,
  render: renderResult,
  figures_check: figuresCheck,
  ocr_recommendation: ocrRecommendation,
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
