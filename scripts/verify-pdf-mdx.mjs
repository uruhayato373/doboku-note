#!/usr/bin/env node
// scripts/verify-pdf-mdx.mjs
//
// PDF ⇔ MDX 整合性検証の決定論的前処理スクリプト。
//
// civil-construction-qa サブエージェントから呼ばれ、JSON で結果を返す。
// 視覚比較や Playwright レンダリング検証はエージェント側が直接行う。
// 本スクリプトはあくまでファイルアクセスとテキスト処理に限定する。
//
// 使い方:
//   node scripts/verify-pdf-mdx.mjs <mdx-path> [--pdf <pdf-path>]
//
// 出力:
//   JSON を stdout へ。失敗時は stderr にエラーメッセージを出して exit 1。

import { readFileSync, existsSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname, basename, join } from 'node:path';
import matter from 'gray-matter';
import sharp from 'sharp';

// ----------------------------------------------------------------
// 引数パース
// ----------------------------------------------------------------

function parseArgs(argv) {
  const args = { mdx: null, pdf: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pdf') {
      args.pdf = argv[++i];
    } else if (!args.mdx) {
      args.mdx = a;
    }
  }
  return args;
}

const { mdx: mdxPath, pdf: pdfPathArg } = parseArgs(process.argv);

if (!mdxPath) {
  process.stderr.write('Usage: node verify-pdf-mdx.mjs <mdx-path> [--pdf <pdf-path>]\n');
  process.exit(2);
}

if (!existsSync(mdxPath)) {
  process.stderr.write(`MDX not found: ${mdxPath}\n`);
  process.exit(2);
}

// ----------------------------------------------------------------
// MDX 解析
// ----------------------------------------------------------------

const mdxRaw = readFileSync(mdxPath, 'utf8');
const { data: frontmatter, content: body } = matter(mdxRaw);

const category = frontmatter.category || null;
const group = frontmatter.group || null;
const slug = frontmatter.id || basename(dirname(mdxPath)) || null;
const title = frontmatter.title || null;

// <img src="..." alt="..." /> を抽出
const imgRe = /<img\s+([^>]*?)\/?>/g;
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
  // src は /posts/... 形式なので .local/r2 を前置
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
      // sharp で natural dimensions を取得
      const meta = await sharp(absPath).metadata();
      naturalWidth = meta.width || null;
      naturalHeight = meta.height || null;
    } catch (e) {
      // ignore: 取得不能でも exists だけは true
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

// 本文の見出しを抽出（H1〜H4）
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

// 表の数（| ... | ... | のヘッダ行直下にセパレータ行があるパターン）
const tableRe = /^\|(.+)\|\s*\n\|\s*[:\-\s|]+\|\s*$/gm;
const tableCount = (body.match(tableRe) || []).length;

// プレーンテキスト文字数（コードブロック・MDX コンポーネント除外）
const plainText = body
  .replace(/```[\s\S]*?```/g, '')
  .replace(/<[^>]+>/g, '')
  .replace(/\$[^$\n]+\$/g, '')
  .replace(/\$\$[\s\S]*?\$\$/g, '');
const textChars = plainText.replace(/\s/g, '').length;

// ----------------------------------------------------------------
// PDF 解析（pdftotext が必要）
// ----------------------------------------------------------------

let pdfInfo = null;
let coverage = null;

if (pdfPathArg && existsSync(pdfPathArg)) {
  let pdfText = '';
  let pdfError = null;

  try {
    pdfText = execSync(`pdftotext -layout "${pdfPathArg}" -`, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    pdfError = `pdftotext failed: ${e.message}. poppler-utils をインストールしてください (Windows: scoop install poppler)`;
  }

  if (!pdfError) {
    // PDF 章節構造の抽出（第N章 / N.N / N.N.N）
    const pdfHeadings = [];
    const headingPatterns = [
      /^第\s*\d+\s*章\s+(.+)$/gm,         // 第1章 〇〇
      /^\s*\d+\.\d+\.\d+\s+(.+)$/gm,      // 1.1.1 〇〇
      /^\s*\d+\.\d+\s+(.+)$/gm,           // 1.1 〇〇
    ];

    for (const re of headingPatterns) {
      let pm;
      while ((pm = re.exec(pdfText)) !== null) {
        pdfHeadings.push({
          raw: pm[0].trim(),
          text: pm[1].trim(),
        });
      }
    }

    // 重複除去
    const seen = new Set();
    const uniqueHeadings = pdfHeadings.filter(h => {
      const key = h.raw;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 数式記号の出現数（粗い見積もり）
    const mathSymbols = (pdfText.match(/[=Σ√²³≧≦×÷±]/g) || []).length;

    // テキスト網羅率の計算
    const matched = [];
    const missing = [];
    for (const h of uniqueHeadings) {
      // MDX 本文または mdxHeadings の text に含まれているかチェック
      const inBody = body.includes(h.text);
      const inHeadings = mdxHeadings.some(mh => mh.text.includes(h.text) || h.text.includes(mh.text));
      if (inBody || inHeadings) {
        matched.push(h);
      } else {
        missing.push(h);
      }
    }

    const rate = uniqueHeadings.length > 0 ? matched.length / uniqueHeadings.length : null;

    pdfInfo = {
      path: pdfPathArg,
      headings: uniqueHeadings,
      heading_count: uniqueHeadings.length,
      text_chars: pdfText.replace(/\s/g, '').length,
      math_symbol_count: mathSymbols,
      page_count: null, // pdfinfo は別途必要、今はスキップ
    };

    coverage = {
      headings_total: uniqueHeadings.length,
      headings_matched: matched.length,
      rate,
      missing: missing.map(h => h.raw),
    };
  } else {
    pdfInfo = {
      path: pdfPathArg,
      error: pdfError,
    };
  }
}

// ----------------------------------------------------------------
// 出力
// ----------------------------------------------------------------

const result = {
  mdx: {
    path: mdxPath,
    category,
    group,
    slug,
    title,
    headings: mdxHeadings,
    heading_count: mdxHeadings.length,
    images,
    image_count: images.length,
    image_missing: images.filter(i => !i.exists).length,
    math_count: mathCount,
    table_count: tableCount,
    text_chars: textChars,
  },
  pdf: pdfInfo,
  coverage,
  generated_at: new Date().toISOString(),
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
