#!/usr/bin/env node
// .claude/skills/quality/civil-figure-rework/scripts/inject-img-mdx.mjs
//
// figure-spec.json と MDX を受け取り、各 figure を該当問題セクションに
// <img> として挿入/差し替える。
//
// 既存の <img> タグがあれば src/alt/width/height を更新。
// なければ問題文の最後の段落（最初の改行）直後に挿入。
//
// 必ず writeMdxFile（CRLF 保持）経由で書き込む（CLAUDE.md §3）。
//
// 使い方:
//   node inject-img-mdx.mjs --mdx <article.mdx> --spec <figure-spec.json>

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');

// writeMdxFile のロード
const mdxIoPath = join(REPO_ROOT, '.claude/scripts/lib/mdx-io.mjs');
const { readMdxFile, writeMdxFile } = await import(mdxIoPath);

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mdx') args.mdx = argv[++i];
    else if (a === '--spec') args.spec = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
  }
  if (!args.mdx || !args.spec) {
    console.error('Usage: inject-img-mdx.mjs --mdx <path> --spec <path> [--dry-run]');
    process.exit(2);
  }
  return args;
}

function getPngSize(pngPath) {
  const out = execSync(`magick identify -format "%w %h" "${pngPath}"`, { encoding: 'utf-8' }).trim();
  const [w, h] = out.split(' ').map(Number);
  return { width: w, height: h };
}

/**
 * src は webp で参照する（image-policy 準拠、generate-webp が後で生成）
 * 寸法は PNG 実サイズから取得
 */
function buildImgTag(spec, exam, pngPath) {
  const webpFilename = spec.target_filename.replace(/\.png$/i, '.webp');
  const src = `/posts/civil-construction-1/primary-${exam}/img/${webpFilename}`;
  const { width, height } = getPngSize(pngPath);
  // alt はエスケープ不要のシンプル文字列に正規化（"のみ除去）
  const safeAlt = (spec.alt || '').replace(/"/g, '');
  return `<img src="${src}" alt="${safeAlt}" loading="lazy" width={${width}} height={${height}} />`;
}

/**
 * MDX 本文から `## 問題 No.X` セクションの範囲を抽出する
 * 戻り値: { start: 行index, headingLine: 行内容, bodyStart: 本文開始行, bodyEnd: 次見出し直前の行 }
 */
function findProblemSection(lines, problemNo) {
  const headingRe = new RegExp(`^##\\s*問題\\s*No\\.?\\s*${problemNo}(?:\\s|$)`);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingRe.test(lines[i])) { start = i; break; }
  }
  if (start === -1) return null;

  // 次の ## 以降を末尾とする
  let end = lines.length - 1;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) { end = i - 1; break; }
  }
  return { start, end };
}

/**
 * セクション内の既存 <img> 行を探す
 * 戻り値: 行 index（無ければ -1）
 */
function findExistingImg(lines, section, targetFilename) {
  const baseRe = new RegExp(`<img[^>]*${targetFilename.replace(/\.png$/i, '\\.(?:png|webp)')}`, 'i');
  for (let i = section.start; i <= section.end; i++) {
    if (baseRe.test(lines[i])) return i;
  }
  // ファイル名一致しない別 fig のスロットがあれば、それを再利用候補にしない（独立）
  return -1;
}

/**
 * 問題本文の最初の段落直後（次の空行の後）に挿入位置を返す
 * `## 問題 No.X` ヘッダ直下から見て、最初の非空行段落の終わり（次の空行）位置
 */
function findInsertPosition(lines, section) {
  // ヘッダ行直後の空行をスキップ
  let i = section.start + 1;
  while (i <= section.end && lines[i].trim() === '') i++;
  // 段落（連続非空行）の終わり = 次の空行
  while (i <= section.end && lines[i].trim() !== '') i++;
  // i は空行 or 次見出し
  return i;
}

function main() {
  const args = parseArgs(process.argv);
  const spec = JSON.parse(readFileSync(args.spec, 'utf-8'));
  const { raw, eol } = readMdxFile(args.mdx);
  // 内部処理は LF 統一
  const normalized = raw.replace(/\r\n/g, '\n');
  let lines = normalized.split('\n');

  const results = {
    mdx: args.mdx,
    exam: spec.exam,
    actions: [],
  };

  // problem_no 降順で処理（行 index がズレないように）
  const figures = [...(spec.figures || [])].sort((a, b) => b.problem_no - a.problem_no);

  const examOutDir = join(REPO_ROOT, `.local/r2/posts/civil-construction-1/primary-${spec.exam}/img`);

  for (const fig of figures) {
    const pngPath = join(examOutDir, fig.target_filename);
    if (!existsSync(pngPath)) {
      results.actions.push({ target: fig.target_filename, action: 'skip', reason: 'png not found' });
      continue;
    }
    const imgTag = buildImgTag(fig, spec.exam, pngPath);

    const section = findProblemSection(lines, fig.problem_no);
    if (!section) {
      results.actions.push({ target: fig.target_filename, problem_no: fig.problem_no, action: 'skip', reason: 'problem section not found' });
      continue;
    }

    const existingIdx = findExistingImg(lines, section, fig.target_filename);
    if (existingIdx >= 0) {
      // 差し替え
      lines[existingIdx] = imgTag;
      results.actions.push({ target: fig.target_filename, problem_no: fig.problem_no, action: 'replaced', line: existingIdx + 1 });
    } else {
      // 挿入位置決定
      const insertAt = findInsertPosition(lines, section);
      // 挿入: 空行 + imgTag + 空行
      lines.splice(insertAt, 0, '', imgTag, '');
      results.actions.push({ target: fig.target_filename, problem_no: fig.problem_no, action: 'inserted', line: insertAt + 2 });
    }
  }

  const newRaw = lines.join('\n');

  if (args.dryRun) {
    results.dry_run = true;
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (newRaw !== normalized) {
    writeMdxFile(args.mdx, newRaw, eol);
    results.written = true;
  } else {
    results.written = false;
    results.note = 'no changes';
  }

  console.log(JSON.stringify(results, null, 2));
}

main();
